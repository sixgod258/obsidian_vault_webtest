// _lib.js — 实现工具共享库：浏览器启动 + SPA 站点爬虫
// 依赖 playwright（复用 playwright-cli 内置的 playwright 库），浏览器用系统 Chrome。
const PW_PATH = 'C:/Users/Administrator/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright';
const { chromium } = require(PW_PATH);

/** 启动浏览器。默认桌面 viewport；mobile=true 模拟移动端 */
async function launch({ headless = true, mobile = false, width, height } = {}) {
  const browser = await chromium.launch({ headless, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: mobile ? { width: width || 390, height: height || 844 } : { width: width || 1440, height: height || 900 },
  });
  const page = await context.newPage();
  return { browser, context, page };
}

/** URL 规范化：去掉 hash、去掉结尾斜杠 */
function canon(u, base) {
  try {
    const url = new URL(u, base);
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch { return u; }
}

/**
 * 全站爬虫（针对 SPA + hash 路由）。
 * 从 startUrl 出发 BFS：提取 [routerLink]/anchor 里的路由 → 逐个访问 → 收集页面 SEO 数据 + 网络响应状态。
 * 返回 { pages: [...], responses: [...] }
 */
async function crawlSite(page, startUrl, { maxPages = 80, waitMs = 700, timeoutMs = 8000, seedRoutes = [] } = {}) {
  const visited = new Set();
  const pages = [];
  const responses = [];
  const routes = new Set(seedRoutes.map((r) => r.replace(/^\//, '')));

  // 收集所有网络响应（供状态码检查 / ZAP / 瀑布图使用）
  page.on('response', (r) => {
    const u = r.url();
    if (u.startsWith(startUrl)) {
      responses.push({
        url: u,
        status: r.status(),
        type: r.request().resourceType(),
        time: Date.now(),
      });
    }
  });
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (u.startsWith(startUrl)) {
      responses.push({ url: u, status: 0, type: req.resourceType(), failed: req.failure()?.errorText || 'failed' });
    }
  });

  /** 从当前 DOM 提取候选路由 */
  async function extractRoutes() {
    const found = await page.evaluate(() => {
      const set = new Set();
      document.querySelectorAll('[ng-reflect-router-link]').forEach((el) => {
        const rl = el.getAttribute('ng-reflect-router-link');
        if (rl) set.add(rl.replace(/,/g, '/').replace(/^\//, ''));
      });
      document.querySelectorAll('[routerlink]').forEach((el) => {
        const rl = el.getAttribute('routerlink');
        if (rl) set.add(rl.replace(/^\//, ''));
      });
      document.querySelectorAll('a[href]').forEach((a) => {
        let h = a.getAttribute('href') || '';
        if (h.startsWith('#/')) set.add(h.slice(2));
        else if (h.startsWith('/')) set.add(h.slice(1));
      });
      return [...set];
    });
    found.forEach((r) => {
      const clean = r.replace(/^\/+/, '').split('?')[0];
      if (/^[a-zA-Z0-9_\-\/.]*$/.test(clean) && clean.length < 200) routes.add(clean);
    });
  }

  /** 访问一个路由并提取页面数据 */
  async function visit(route) {
    const key = canon(route, startUrl);
    if (visited.has(key) || pages.length >= maxPages) return;
    visited.add(key);
    const url = startUrl + '/#/' + route.replace(/^\//, '');
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      try { await page.waitForLoadState('networkidle', { timeout: waitMs }); } catch (e) { /* ignore */ }
      await page.waitForTimeout(200);
    } catch (e) {
      // 记录失败但仍尝试提取
    }
    const p = await page.evaluate(() => {
      const title = document.title || '';
      const meta = {};
      document.querySelectorAll('meta').forEach((m) => {
        const k = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('charset');
        if (k && m.getAttribute('content')) meta[k] = m.getAttribute('content').trim();
      });
      const h1s = [...document.querySelectorAll('h1')].map((e) => e.textContent.trim());
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
      const imgs = [...document.querySelectorAll('img')];
      const imgNoAlt = imgs.filter((i) => !i.hasAttribute('alt') || i.getAttribute('alt') === '').length;
      const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => { try { return JSON.parse(s.textContent); } catch { return null; } })
        .filter(Boolean);
      const links = [...document.querySelectorAll('a[href]')].map((a) => a.href);
      const buttons = document.querySelectorAll('button').length;
      return {
        title, meta, h1s, h1count: h1s.length, canonical,
        imgTotal: imgs.length, imgNoAlt,
        jsonld, buttons,
        links,
        bodyTextLen: (document.body && document.body.textContent ? document.body.textContent.trim().length : 0),
      };
    });
    pages.push({ route, url, ...p });
    await extractRoutes();
    // 从页面内 anchor 继续发现路由：仅接受本站 URL 的 hash 路由
    p.links.forEach((l) => {
      if (!l.startsWith(startUrl)) return;
      const m = l.match(/#\/([^?#]*)/);
      if (m) {
        const r = m[1].replace(/^\//, '').split('?')[0];
        if (/^[a-zA-Z0-9_\-\/.]*$/.test(r) && r.length < 200) routes.add(r);
      }
    });
  }

  // 种子：首页
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  try { await page.waitForLoadState('networkidle', { timeout: waitMs }); } catch (e) {}
  await extractRoutes();

  // 多轮 BFS，直到发现完所有路由或达到上限
  let guard = 0;
  while (guard++ < 5) {
    const newRoutes = [...routes].filter((r) => !visited.has(canon(r, startUrl)));
    if (!newRoutes.length || pages.length >= maxPages) break;
    for (const r of newRoutes) {
      if (pages.length >= maxPages) break;
      await visit(r);
    }
  }
  return { pages, responses, routeCount: routes.size };
}

module.exports = { launch, crawlSite, canon, PW_PATH };
