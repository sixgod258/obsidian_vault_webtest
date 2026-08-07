// 05-webpagetest.js — 实现「WebPageTest」：资源瀑布图(Waterfall) + 电影胶片(Filmstrip) + 加载时序
// 原理：与 WebPageTest 相同——真实浏览器加载页面，记录每个资源请求的起止耗时与体积（瀑布图数据），
//      并在加载过程逐帧截图（电影胶片）。输出 JSON 数据 + 自绘瀑布图 HTML + 逐帧 PNG。
const { launch } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const TARGET = 'http://localhost:3000';
const ASSETS = path.join(__dirname, '..', '03-测试记录', 'assets');
const OUT = path.join(ASSETS, '05-webpagetest.json');
const FILMSTRIP = path.join(ASSETS, 'filmstrip');

(async () => {
  const { browser, page } = await launch({});

  // 采集每个资源请求的时序（performance resource entries 最准确）+ 状态码
  const statusMap = {};
  page.on('response', (r) => { statusMap[r.url()] = r.status(); });
  const t0 = Date.now();
  await page.goto(TARGET, { waitUntil: 'commit' }); // 尽快开始，模拟冷启动
  const navStart = Date.now();
  await page.goto(TARGET, { waitUntil: 'commit' }); // 第二次是真正测量
  const navStart2 = Date.now();

  const shotAt = async (label, forceDelay = 0) => {
    if (forceDelay) await page.waitForTimeout(forceDelay);
    const f = path.join(FILMSTRIP, `${label}.png`);
    await page.screenshot({ path: f });
    return { label, file: path.relative(ASSETS, f).replace(/\\/g, '/'), atMs: Date.now() - navStart2 };
  };

  const frames = [];
  frames.push(await shotAt('00_commit'));          // 导航提交瞬间
  frames.push(await shotAt('01_250ms', 250));
  frames.push(await shotAt('02_500ms', 250));
  frames.push(await shotAt('03_1000ms', 500));
  frames.push(await shotAt('04_2000ms', 1000));
  frames.push(await shotAt('05_4000ms', 2000));

  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const fullyLoadedMs = Date.now() - navStart2;
  frames.push(await shotAt('06_fully_loaded'));

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource');
    const waterfall = res.map((r) => ({
      name: r.name.length > 120 ? r.name.slice(0, 120) + '…' : r.name,
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      duration: Math.round(r.responseEnd - r.startTime),
      type: r.initiatorType,
      size: r.transferSize || 0,
    })).sort((a, b) => a.start - b.start);
    const byType = {};
    let totalBytes = 0;
    for (const r of res) {
      byType[r.initiatorType] = (byType[r.initiatorType] || 0) + (r.transferSize || 0);
      totalBytes += r.transferSize || 0;
    }
    // TTFB 与关键渲染时序
    const timings = {
      ttfb: Math.round(nav.responseStart - nav.startTime),
      firstPaint: Math.round((performance.getEntriesByName('first-paint')[0] || { startTime: null }).startTime ?? -1),
      firstContentfulPaint: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || { startTime: null }).startTime ?? -1),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      load: Math.round(nav.loadEventEnd - nav.startTime),
    };
    return { timings, waterfall, byType, totalBytes, requestCount: res.length };
  });

  // Node 端合并 HTTP 状态码
  for (const w of data.waterfall) w.status = statusMap[w.name] || '';
  const out = {
    tool: 'WebPageTest 实现',
    target: TARGET,
    timestamp: new Date().toISOString(),
    timings: { ...data.timings, fullyLoadedMs },
    requests: { count: data.requestCount, totalBytes: data.totalBytes, byType: data.byType },
    filmstrip: frames,
    waterfallTable: data.waterfall,
    verdict: '核心可实现：瀑布图数据（每个资源 start/end/size/type）+ 时序指标 + 电影胶片逐帧截图。无法实现多地域节点（本地直连）。',
  };
  fs.mkdirSync(FILMSTRIP, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

  // 生成自绘瀑布图 HTML（纯内联，可浏览器打开）
  const rows = data.waterfall.map((r) => {
    const pct = (r.start / (data.timings.load || 1)) * 100;
    const wid = Math.max(2, (r.duration / (data.timings.load || 1)) * 100);
    return `<tr><td title="${r.name}">${r.name.slice(0, 60)}</td><td>${r.type}</td><td>${r.status}</td><td>${(r.size/1024).toFixed(1)}K</td><td>${r.start}ms</td><td>${r.duration}ms</td><td class="bar"><div style="left:${pct.toFixed(1)}%;width:${wid.toFixed(1)}%" class="seg"></div></td></tr>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset=utf-8><title>Waterfall — Juice Shop</title>
<style>body{font-family:monospace;margin:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left}
.bar{position:relative;min-width:300px;height:18px;background:#f5f5f5}.seg{position:absolute;top:0;height:100%;background:#4a90d9;border-radius:2px}
h3{color:#333}</style></head><body><h3>Waterfall — ${TARGET}</h3>
<p>TTFB ${data.timings.ttfb}ms · LCP/FCP ${data.timings.firstContentfulPaint}ms · Fully Loaded ${out.timings.fullyLoadedMs}ms · ${data.requestCount} requests · ${(data.totalBytes/1024).toFixed(0)}KB</p>
<table><tr><th>URL</th><th>Type</th><th>Status</th><th>Size</th><th>Start</th><th>Duration</th><th style="width:340px">Timeline</th></tr>${rows}</table></body></html>`;
  const htmlFile = path.join(ASSETS, '05-waterfall.html');
  fs.writeFileSync(htmlFile, html, 'utf8');

  console.log('written:', OUT);
  console.log('timings:', JSON.stringify({ ...data.timings, fullyLoadedMs }));
  console.log('requests:', JSON.stringify({ count: data.requestCount, totalBytes: data.totalBytes, byType: data.byType }));
  console.log('filmstrip frames:', frames.length, '->', FILMSTRIP);
  console.log('waterfall html:', htmlFile);
  console.log('slowest 5 resources:');
  [...data.waterfall].sort((a, b) => b.duration - a.duration).slice(0, 5).forEach(r => console.log(`  ${r.duration}ms ${r.type} ${r.name}`));
  await browser.close();
})();
