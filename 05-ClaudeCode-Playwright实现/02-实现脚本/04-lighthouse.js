// 04-lighthouse.js — 实现「Lighthouse」：单页性能(Web Vitals) + SEO + 可访问性 审计
// 原理：与 Lighthouse 相同思路——用真实 Chrome 无头加载页面，注入 PerformanceObserver 采集
//      LCP/CLS/INP + 导航时序 + 资源明细；再从 DOM 做 SEO 与可访问性检查。
// 局限：无法实现 Lighthouse 的专有评分权重与 Best-Practices 全量规则，这里给出「指标实测值 + 检查清单」。
const { launch } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const TARGET = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '03-测试记录', 'assets', '04-lighthouse.json');

(async () => {
  const { browser, page } = await launch({});

  // ---- 性能采集：在页面脚本执行前注入观察器 ----
  await page.addInitScript(() => {
    window.__pw = { lcp: 0, cls: 0, inps: [], entries: [] };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === 'largest-contentful-paint' && e.startTime > window.__pw.lcp) window.__pw.lcp = e.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) window.__pw.cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      // INP：需要真实交互才完整，这里只尽量采集已发生事件的延迟
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === 'event' && e.interactionId) window.__pw.inps.push(e.duration);
        }
      }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    } catch (e) { /* ignore */ }
  });

  console.log('loading', TARGET);
  const t0 = Date.now();
  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 20000 });
  // 等待 LCP 安定 + 模拟一次简单交互以触发生命周期
  await page.waitForTimeout(1500);
  try { await page.locator('body').click({ position: { x: 10, y: 10 }, timeout: 1500 }); } catch (e) {}
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource');
    const byType = {};
    let totalBytes = 0, totalRequests = res.length;
    for (const r of res) {
      const t = r.initiatorType || 'other';
      byType[t] = byType[t] || { count: 0, bytes: 0 };
      byType[t].count++;
      byType[t].bytes += r.transferSize || 0;
      totalBytes += r.transferSize || 0;
    }
    const timings = {
      ttfb: nav.responseStart - nav.startTime,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      load: nav.loadEventEnd - nav.startTime,
      domInteractive: nav.domInteractive - nav.startTime,
    };
    return { timings, resources: byType, totalBytes, totalRequests, __pw: window.__pw };
  });

  // ---- SEO / 可访问性 DOM 检查 ----
  const dom = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const noAlt = imgs.filter(i => !i.hasAttribute('alt') || i.getAttribute('alt') === '');
    const formControls = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')];
    const unlabeled = formControls.filter(el => {
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      if (el.getAttribute('aria-label')) return false;
      if (el.closest('label')) return false;
      return true;
    });
    const buttons = [...document.querySelectorAll('button')];
    const btnNoName = buttons.filter(b => !(b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title')));
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName.toLowerCase());
    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name=description]')?.content || null,
      viewport: document.querySelector('meta[name=viewport]')?.content || null,
      htmlLang: document.documentElement.lang || null,
      robots: document.querySelector('meta[name=robots]')?.content || null,
      canonical: document.querySelector('link[rel=canonical]')?.href || null,
      imgTotal: imgs.length, imgNoAlt: noAlt.length,
      formControlsTotal: formControls.length, formControlsUnlabeled: unlabeled.length,
      btnTotal: buttons.length, btnNoName: btnNoName.length,
      headings: hs, h1count: hs.filter(h => h === 'h1').length,
      hasDoctype: document.doctype ? true : false,
    };
  });

  const lcp = Math.round(metrics.__pw.lcp);
  const cls = metrics.__pw.cls;
  const inp = metrics.__pw.inps.length ? Math.round(Math.max(...metrics.__pw.inps)) : null;

  // 阈值判定（Lighthouse/web.dev 标准）
  const grade = (v, good, poor) => v === null ? 'N/A' : (v <= good ? 'green' : v <= poor ? 'orange' : 'red');
  const results = {
    tool: 'Lighthouse 实现（单页审计）',
    target: TARGET,
    timestamp: new Date().toISOString(),
    loadingMs: Date.now() - t0,
    performance: {
      lcpMs: lcp, lcpGrade: grade(lcp, 2500, 4000),
      cls, clsGrade: grade(cls, 0.1, 0.25),
      inpMs: inp, inpGrade: inp === null ? 'N/A' : grade(inp, 200, 500),
      ttfbMs: Math.round(metrics.timings.ttfb), ttfbGrade: grade(metrics.timings.ttfb, 800, 1800),
      domContentLoadedMs: Math.round(metrics.timings.domContentLoaded),
      loadMs: Math.round(metrics.timings.load),
      totalRequests: metrics.totalRequests,
      totalBytes: metrics.totalBytes,
      resourcesByType: metrics.resources,
    },
    seo: {
      title: dom.title, titleLength: dom.title.length,
      metaDescription: dom.metaDescription,
      viewport: dom.viewport,
      htmlLang: dom.htmlLang,
      robots: dom.robots,
      canonical: dom.canonical,
      checks: {
        title_present: !!dom.title,
        meta_description_present: !!dom.metaDescription,
        viewport_present: !!dom.viewport,
        html_lang_set: !!dom.htmlLang,
        canonical_present: !!dom.canonical,
      },
    },
    accessibility: {
      imgTotal: dom.imgTotal, imgNoAlt: dom.imgNoAlt,
      formControlsTotal: dom.formControlsTotal, formControlsUnlabeled: dom.formControlsUnlabeled,
      btnTotal: dom.btnTotal, btnNoName: dom.btnNoName,
      h1count: dom.h1count, headingsSequence: dom.headings.join(' > '),
      checks: {
        imgs_have_alt: dom.imgNoAlt === 0,
        form_controls_labeled: dom.formControlsUnlabeled === 0,
        buttons_have_names: dom.btnNoName === 0,
        exactly_one_h1: dom.h1count === 1,
      },
    },
    verdict: '核心可实现：Web Vitals(LCP/CLS/INP/TTFB) 实测值 + 资源清单 + SEO/可访问性检查清单；Lighthouse 专有评分需引入其审计库，不在此脚本内。',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');
  console.log('written:', OUT);
  console.log('perf:', JSON.stringify({ lcpMs: lcp, cls, inpMs: inp, ttfbMs: Math.round(metrics.timings.ttfb), requests: metrics.totalRequests, bytes: metrics.totalBytes }));
  console.log('resources:', JSON.stringify(metrics.resources));
  console.log('seo checks:', JSON.stringify(results.seo.checks));
  console.log('a11y checks:', JSON.stringify(results.accessibility.checks));
  await browser.close();
})();
