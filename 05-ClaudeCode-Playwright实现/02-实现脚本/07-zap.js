// 07-zap.js — 实现「OWASP ZAP 被动扫描」：安全头检测 + Cookie 标志 + 信息泄露 + 基础注入探测
// 原理：与 ZAP 被动扫描一致——通过代理/浏览器观察真实流量，检查响应头安全配置、Cookie 属性、
//      信息泄露；另加两个「主动式」基础探测（反射 XSS / SQLi），演示 ZAP 主动扫描的缩减版。
const { launch, crawlSite } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '03-测试记录', 'assets', '07-zap.json');

// ZAP 关注的响应安全头
const SEC_HEADERS = {
  'X-Frame-Options': 'anti-clickjacking',
  'Content-Security-Policy': 'CSP/XSS 防护',
  'X-Content-Type-Options': '防 MIME 嗅探',
  'Strict-Transport-Security': 'HSTS',
  'Referrer-Policy': '防信息泄露',
  'Permissions-Policy': '权限收敛',
  'Cross-Origin-Opener-Policy': 'COOP 隔离',
};

(async () => {
  const { browser, page, context } = await launch({});
  const reqCtx = context.request;

  const alerts = [];
  const addAlert = (level, title, detail, url) => alerts.push({ level, title, detail, url });

  // ---- 1) 被动：捕获真实浏览流量中的响应头 ----
  const headerSamples = {}; // url -> headersArray
  page.on('response', (r) => {
    if (r.url().startsWith(BASE)) {
      const h = r.allHeaders(); // {name: value}
      headerSamples[r.url()] = h;
      // Cookie 标志检查
      for (const [name, value] of Object.entries(h)) {
        if (name.toLowerCase() === 'set-cookie') {
          const cookieName = value.split('=')[0];
          if (!/httponly/i.test(value)) addAlert('medium', 'Cookie 缺少 HttpOnly', `cookie ${cookieName} 未设 HttpOnly`, r.url());
          if (!/secure/i.test(value)) addAlert('low', 'Cookie 缺少 Secure', `cookie ${cookieName} 未设 Secure（HTTP 下影响小）`, r.url());
          if (!/samesite/i.test(value)) addAlert('low', 'Cookie 缺少 SameSite', `cookie ${cookieName} 未设 SameSite`, r.url());
        }
      }
      // 信息泄露
      const srv = h['server'];
      if (srv && /\d+\.\d+/.test(srv)) addAlert('low', 'Server 头泄露版本', `Server: ${srv.slice(0, 80)}`, r.url());
      const powered = h['x-powered-by'];
      if (powered) addAlert('low', 'X-Powered-By 泄露技术栈', `X-Powered-By: ${powered.slice(0, 80)}`, r.url());
    }
  });

  console.log('crawling for passive data...');
  await crawlSite(page, BASE, { maxPages: 25, seedRoutes: ['product/1', 'score-board'] });

  // ---- 2) 被动：安全头缺失检测（对主页 + 代表性 API） ----
  const sampleUrls = [
    BASE,
    BASE + '/rest/products/search?q=',
    BASE + '/api/products',
    BASE + '/socket.io/',
  ];
  const missingHeaderResults = [];
  for (const u of sampleUrls) {
    try {
      const resp = await reqCtx.get(u, { timeout: 6000 });
      const h = resp.headers();
      const missing = Object.keys(SEC_HEADERS).filter(k => !h[k.toLowerCase()]);
      missingHeaderResults.push({ url: u, status: resp.status(), missing });
      for (const m of missing) {
        const sev = ['Content-Security-Policy', 'X-Frame-Options'].includes(m) ? 'medium' : 'low';
        addAlert(sev, `缺少 ${m}`, `${SEC_HEADERS[m]}；该响应未设置 ${m}`, u);
      }
      const ct = h['content-type'];
      if (ct && !ct.includes('json') && u.includes('/api')) addAlert('low', 'API 未返回 application/json', `Content-Type: ${ct}`, u);
    } catch (e) {}
  }

  // ---- 3) 主动-精简：反射 XSS 探测（Juice Shop 搜索接口） ----
  const xssPayload = '</script><script>alert(document.domain)</script>';
  const xssResp = await reqCtx.get(BASE + '/rest/products/search?q=' + encodeURIComponent(xssPayload), { timeout: 6000 });
  const xssBody = await xssResp.text();
  const xssReflected = xssBody.includes(xssPayload);
  addAlert(xssReflected ? 'high' : 'info',
    xssReflected ? '反射型 XSS（搜索参数）' : 'XSS 探测未命中',
    xssReflected ? `search 参数原样回显 payload（虽然 JSON 上下文执行性弱，仍应转义）` : `payload 未在响应中完整回显`, BASE + '/rest/products/search?q=...');

  // ---- 4) 主动-精简：SQLi 探测（Juice Shop 搜索接口） ----
  const sqliProbe = "'";
  const sqliResp = await reqCtx.get(BASE + '/rest/products/search?q=' + encodeURIComponent(sqliProbe), { timeout: 6000 });
  const sqliStatus = sqliResp.status();
  const sqliBody = await sqliResp.text();
  const sqlError = /SQL|sqlite|syntax error|UNION|SELECT|POSTGRES|ORA-|Exception/i.test(sqliBody);
  if (sqliStatus >= 500 || sqlError) {
    addAlert('high', 'SQL 注入探测命中（单引号导致服务器错误/回显 SQL）', `q=' 触发 status=${sqliStatus}${sqlError ? '，响应含 SQL 特征' : ''}`, BASE + '/rest/products/search?q=');
  } else {
    addAlert('info', 'SQLi 单引号探测未命中', `q=' 返回 status=${sqliStatus}`, BASE + '/rest/products/search?q=');
  }

  // ---- 汇总 ----
  const byLevel = alerts.reduce((a, x) => (a[x.level] = (a[x.level] || 0) + 1, a), {});
  const out = {
    tool: 'OWASP ZAP 被动扫描 实现（含主动-精简）',
    target: BASE,
    timestamp: new Date().toISOString(),
    summary: { alertTotal: alerts.length, byLevel },
    alerts,
    missingHeaderResults,
    verdict: '可基本实现被动扫描：安全头/Cookie/信息泄露检查 + 基础的 XSS/SQLi 探测。与 ZAP 差距：告警规则库规模、主动扫描的攻击载荷深度、AJAX Spider 爬取能力。',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('written:', OUT);
  console.log('summary:', JSON.stringify(out.summary));
  console.log('--- alerts (top 25) ---');
  alerts.slice(0, 25).forEach(a => console.log(`  [${a.level}] ${a.title} | ${a.detail}`));
  await browser.close();
})();
