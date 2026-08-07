// 03-screaming-frog.js — 实现「Screaming Frog SEO Spider」：全站爬取 + SEO 技术指标审核
// 原理：与 Screaming Frog 一致——全站爬取，对每页提取 Title/Meta/H1/Canonical/图片 alt/结构化数据，
//      按 SEO 常见问题聚合：缺失/重复/超长。
const { launch, crawlSite } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '03-测试记录', 'assets', '03-screaming-frog.json');

const SEED_ROUTES = [
  'product/1', 'product/2', 'score-board', 'deluxe-membership',
  'recycle', 'privacy-security', 'privacy-security/privacy-policy',
  'track-order', 'complain',
];

(async () => {
  const { browser, page } = await launch({});
  console.log('crawling...');
  const crawl = await crawlSite(page, BASE, { maxPages: 50, seedRoutes: SEED_ROUTES });

  const pages = crawl.pages;
  // 组装页面行
  const rows = pages.map(p => ({
    route: p.route || '/',
    url: p.url,
    status: 200, // SPA 全 200（服务端返回 index.html）
    title: (p.title || '').slice(0, 200),
    metaDescription: p.meta['description'] || '',
    h1s: p.h1s,
    h1count: p.h1count,
    canonical: p.canonical,
    imgTotal: p.imgTotal,
    imgNoAlt: p.imgNoAlt,
    jsonldCount: p.jsonld.length,
    bodyTextLen: p.bodyTextLen,
  }));

  // SEO 问题聚合
  const issues = [];
  const titleCounts = {}, metaCounts = {};
  pages.forEach(p => {
    const t = (p.title || '').trim();
    const m = (p.meta['description'] || '').trim();
    titleCounts[t] = (titleCounts[t] || 0) + 1;
    metaCounts[m] = (metaCounts[m] || 0) + 1;
  });

  for (const p of pages) {
    const r = p.route || '/';
    const t = (p.title || '').trim();
    const m = (p.meta['description'] || '').trim();
    const row = { route: r, url: p.url };

    if (!t) issues.push({ ...row, type: 'title_missing', detail: '页面无 <title>' });
    else if (t.length > 60) issues.push({ ...row, type: 'title_too_long', detail: `标题 ${t.length} 字符 > 60`, title: t });
    if (titleCounts[t] > 1) issues.push({ ...row, type: 'title_duplicate', detail: `标题被 ${titleCounts[t]} 个页面复用` });
    if (!m) issues.push({ ...row, type: 'meta_description_missing', detail: '页面无 meta description' });
    else if (metaCounts[m] > 1) issues.push({ ...row, type: 'meta_description_duplicate', detail: `description 被 ${metaCounts[m]} 个页面复用` });
    if (p.h1count === 0) issues.push({ ...row, type: 'h1_missing', detail: '页面无 H1' });
    if (p.h1count > 1) issues.push({ ...row, type: 'h1_multiple', detail: `页面有 ${p.h1count} 个 H1` });
    if (!p.canonical) issues.push({ ...row, type: 'canonical_missing', detail: '页面无 canonical 标签' });
    if (p.imgNoAlt > 0) issues.push({ ...row, type: 'img_no_alt', detail: `${p.imgNoAlt}/${p.imgTotal} 张图片缺 alt` });
  }

  // 分组统计
  const byType = {};
  issues.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });

  const out = {
    tool: 'Screaming Frog SEO Spider 实现',
    target: BASE,
    timestamp: new Date().toISOString(),
    summary: {
      pagesCrawled: pages.length,
      routesDiscovered: crawl.routeCount,
      issueTotal: issues.length,
      byType,
    },
    pages: rows,
    issues,
    verdict: '可基本实现——全站爬取 + 逐页提取 SEO 指标 + 聚合问题；与 SF 的主要差距是无法给出专有评分与可视化图。',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('written:', OUT);
  console.log('summary:', JSON.stringify(out.summary));
  console.log('--- issues (top 20) ---');
  issues.slice(0, 20).forEach(i => console.log(`  [${i.type}] ${i.route}  ${i.detail}`));
  await browser.close();
})();
