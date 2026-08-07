// 02-linkchecker.js — 实现「LinkChecker」：全站递归爬取 + 死链/重定向检测
// 原理：与 LinkChecker 一致——递归发现站内所有链接 → 逐个检查 HTTP 状态码（404/重定向/超时）。
// 针对 SPA 的特殊处理：hash 路由服务器恒返回 index.html(200)，因此额外用「路由是否渲染出内容」判断死路由。
const { launch, crawlSite, canon } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '03-测试记录', 'assets', '02-linkchecker.json');

// 种子路由：补充 SPA 中不通过<a>/routerLink 直接可达的页面
const SEED_ROUTES = [
  'product/1', 'product/2', 'product/999',
  'score-board', 'deluxe-membership', 'recycle',
  'privacy-security', 'privacy-security/privacy-policy',
  'track-order', 'complain', 'address/saved', 'payment/shop',
];

(async () => {
  const { browser, page, context } = await launch({});
  const reqCtx = context.request;

  console.log('crawling...');
  const crawl = await crawlSite(page, BASE, { maxPages: 60, seedRoutes: SEED_ROUTES });
  console.log('crawled pages:', crawl.pages.length, '| responses:', crawl.responses.length);

  // 1) 收集站内唯一链接（含 hash 路由与静态路径）
  const linkSet = new Set();
  const sources = {}; // url -> [source pages]
  for (const p of crawl.pages) {
    for (const l of p.links || []) {
      if (!l.startsWith(BASE)) continue; // 只查站内
      const clean = canon(l, BASE);
      linkSet.add(clean);
      (sources[clean] = sources[clean] || []).push(p.route || '/');
    }
  }
  // 加上爬到的每个页面自身的 URL
  for (const p of crawl.pages) {
    const u = canon(BASE + '/#/' + (p.route || ''), BASE);
    linkSet.add(u);
    (sources[u] = sources[u] || []).push('(self)');
  }

  const links = [...linkSet];
  console.log('unique internal links to check:', links.length);

  // 2) 逐个检查 HTTP 状态（wget --spider 语义）
  const checked = [];
  for (const u of links) {
    let status = null, err = null, redirect = null, timeMs = 0;
    const t0 = Date.now();
    try {
      const resp = await reqCtx.get(u, { maxRedirects: 0, timeout: 8000 });
      status = resp.status();
      redirect = resp.headers()['location'] || null;
    } catch (e) {
      if (e && e.response) { status = e.response.status(); redirect = e.response.headers()['location'] || null; }
      else err = (e.message || String(e)).split('\n')[0].slice(0, 100);
    }
    timeMs = Date.now() - t0;
    checked.push({ url: u, status, redirect, err, timeMs, from: [...new Set(sources[u] || [])].slice(0, 3) });
  }

  // 3) 汇总：死链 = 4xx/5xx/超时；重定向 = 30x
  const broken = checked.filter(r => (r.status >= 400 && r.status !== 401 && r.status !== 403) || r.err);
  const redirects = checked.filter(r => r.status >= 300 && r.status < 400);
  const ok = checked.filter(r => r.status >= 200 && r.status < 300);

  // 4) SPA 死路由检测：渲染出几乎无内容的 hash 路由视为潜在死路由
  const emptyPages = crawl.pages.filter(p => p.bodyTextLen < 40 && p.route);

  const out = {
    tool: 'LinkChecker 实现',
    target: BASE,
    timestamp: new Date().toISOString(),
    summary: {
      pagesCrawled: crawl.pages.length,
      routesDiscovered: crawl.routeCount,
      uniqueLinksChecked: checked.length,
      ok: ok.length,
      broken: broken.length,
      redirects: redirects.length,
    },
    broken, redirects, emptyPages,
    spaNote: 'SPA 特性：服务器对任意 hash 路由都返回 200(index.html)，HTTP 状态码无法区分死路由，需结合内容渲染判断。',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('written:', OUT);
  console.log('summary:', JSON.stringify(out.summary));
  console.log('--- broken ---');
  broken.forEach(r => console.log(`  ${r.status} ${r.err || ''} ${r.url}  (from ${(r.from||[]).join(',')})`));
  console.log('--- redirects ---');
  redirects.forEach(r => console.log(`  ${r.status} -> ${r.redirect}  ${r.url}`));
  console.log('--- potential dead SPA routes (near-empty render) ---');
  emptyPages.forEach(p => console.log(`  #/${p.route}  bodyTextLen=${p.bodyTextLen}`));
  await browser.close();
})();
