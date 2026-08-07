// 01-wget-spider.js — 实现「Wget --spider」：批量检查 URL 有效性（只发请求不渲染）
// 原理：与 wget --spider 相同——对每个 URL 发 GET/HEAD 请求，按 HTTP 状态码判断可达性。
// 本实现用 Playwright 的 APIRequestContext（走与浏览器相同的网络栈）。
const { launch } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '03-测试记录', 'assets', '01-wget-spider.json');

// 待检查 URL 清单：首页 + 关键路由 + API 端点（wget --spider 的典型用途：快速确认一批 URL）
const URLS = [
  BASE,
  BASE + '/#/login',
  BASE + '/#/register',
  BASE + '/#/about',
  BASE + '/#/contact',
  BASE + '/#/photo-wall',
  BASE + '/#/chatbot',
  BASE + '/#/basket',
  BASE + '/#/search',
  BASE + '/#/forgot-password',
  BASE + '/#/score-board',
  BASE + '/#/deluxe-membership',
  BASE + '/#/product/1',
  BASE + '/#/product/999',          // 不存在的产品，应 404
  BASE + '/nonexistent-page',       // 不存在的静态路由
  BASE + '/rest/products/search?q=apple',
  BASE + '/api/products',
  BASE + '/rest/products',
  BASE + '/rest/user/login',
  BASE + '/robots.txt',
];

(async () => {
  const { browser, context } = await launch({});
  const reqCtx = context.request;
  const results = [];

  for (const u of URLS) {
    const t0 = Date.now();
    let status = null, err = null, redirect = null;
    try {
      const resp = await reqCtx.get(u, { maxRedirects: 0, timeout: 8000 });
      status = resp.status();
      const h = resp.headers()['location'];
      redirect = h || null;
    } catch (e) {
      // maxRedirects=0 时重定向会抛异常，读 e.response
      if (e && e.response) {
        status = e.response.status();
        redirect = e.response.headers()['location'] || null;
      } else {
        err = (e.message || String(e)).split('\n')[0].slice(0, 120);
      }
    }
    const timeMs = Date.now() - t0;
    results.push({ url: u, status, timeMs, redirect, err });
  }

  // 汇总
  const ok = results.filter(r => r.status && r.status >= 200 && r.status < 400).length;
  const broken = results.filter(r => r.status >= 400 || r.err);
  const redirects = results.filter(r => r.redirect);

  const out = {
    tool: 'Wget --spider 实现',
    target: BASE,
    timestamp: new Date().toISOString(),
    summary: { total: results.length, ok, broken: broken.length, redirects: redirects.length },
    results,
    verdict: '可完全实现——用 Playwright request API 逐 URL 发请求即可，无需渲染页面',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('written:', OUT);
  console.log('summary:', JSON.stringify(out.summary));
  console.log('broken:');
  broken.forEach(r => console.log(`  ${r.status} ${r.err ? '(err)' : ''} ${r.url}`));
  console.log('redirects:');
  redirects.forEach(r => console.log(`  ${r.status} -> ${r.redirect}  ${r.url}`));
  await browser.close();
})();
