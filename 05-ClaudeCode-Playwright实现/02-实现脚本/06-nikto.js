// 06-nikto.js — 实现「Nikto」：Web 服务器侦察（响应头信息泄露 + 常见敏感路径探测）
// 原理：与 Nikto 相同思路——对目标发一批常见敏感路径的 GET，检查状态码/目录列表/信息泄露；
//      并抓取服务器响应头判断版本泄露。用 Playwright request API 直连（不渲染）。
const { launch } = require('./_lib.js');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, '..', '03-测试记录', 'assets', '06-nikto.json');

// 常见敏感路径（Nikto 检查项子集）：管理后台 / 备份 / 配置文件 / 目录列表 / 隐藏文件
const PATHS = [
  '/admin', '/admin/', '/administration', '/admin/login', '/backup', '/backup.zip', '/db.sqlite',
  '/config', '/config.js', '/.env', '/.git/HEAD', '/.git/config', '/.htaccess', '/.DS_Store',
  '/robots.txt', '/sitemap.xml', '/server-status', '/server-info', '/phpmyadmin/', '/phpinfo.php',
  '/ftp/', '/cgi-bin/', '/test.php', '/info.php', '/uploads/', '/api/', '/rest/', '/docs', '/swagger',
  '/swagger-ui.html', '/composer.json', '/package.json', '/LICENSE', '/readme.md', '/health', '/metrics',
];

(async () => {
  const { browser, page, context } = await launch({});
  const reqCtx = context.request;

  // 1) 首页响应头（服务器指纹）+ index.html 签名（用于识别 SPA catch-all 假 200）
  const homeResp = await reqCtx.get(BASE, { timeout: 8000 });
  const headers = homeResp.headers();
  const homeBody = await homeResp.text();
  const indexSig = homeBody.replace(/\s+/g, ' ').slice(0, 2000); // 取首页前 2K 作 SPA 壳签名

  // 2) 探测敏感路径
  const probes = [];
  for (const p of PATHS) {
    let status = null, err = null, len = 0, snippet = '', ct = '';
    try {
      const resp = await reqCtx.get(BASE + p, { timeout: 6000, maxRedirects: 0 });
      status = resp.status();
      len = (await resp.body()).length;
      ct = resp.headers()['content-type'] || '';
      const text = await resp.text().catch(() => '');
      snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    } catch (e) {
      if (e && e.response) status = e.response.status();
      else err = (e.message || String(e)).split('\n')[0].slice(0, 80);
    }
    const dirListing = /Index of|Directory listing|Parent Directory/i.test(snippet);
    // SPA catch-all：200 + text/html + 与首页壳签名高度相似 → 不是真实文件，是框架兜底路由
    const isCatchAll = status === 200 && ct.includes('text/html') && (snippet.length === 0 || indexSig.includes(snippet.replace(/<script[^>]*>.*?<\/script>/gi, '').slice(0, 100)));
    probes.push({ path: p, status, len, ct, dirListing, isCatchAll, snippet, err });
  }

  // 3) 判定发现项
  const findings = [];
  for (const p of probes) {
    if (p.err) { findings.push({ ...p, level: 'info', finding: `连接错误: ${p.err}` }); continue; }
    if (p.status === 200 && p.len > 0) {
      const isAppRoute = ['/api/', '/rest/'].some(prefix => p.path.startsWith(prefix));
      if (p.isCatchAll) {
        // SPA 兜底路由：假 200，不算敏感路径命中（这是工具在 SPA 上的典型误报）
        findings.push({ ...p, level: 'info', finding: `SPA catch-all（200 但为 index.html 壳，非真实文件）: ${p.path}` });
      } else if (p.dirListing) findings.push({ ...p, level: 'medium', finding: '目录列表已开启（Directory Browsing）' });
      else if (!isAppRoute && ['/admin', '/backup', '/config', '/.env', '/.git', '/.htaccess', '/db.sqlite', '/phpinfo.php', '/server-status'].some(k => p.path.startsWith(k)))
        findings.push({ ...p, level: p.status === 200 && !p.path.includes('readme') ? 'medium' : 'low', finding: `敏感路径返回 200（${p.path}）` });
      else if (p.status === 200)
        findings.push({ ...p, level: 'low', finding: `路径存在(200): ${p.path}` });
    } else if (p.status === 301 || p.status === 302 || p.status === 308) {
      findings.push({ ...p, level: 'info', finding: `重定向 ${p.status}` });
    } else if (p.status === 403) {
      findings.push({ ...p, level: 'info', finding: `403 拒绝访问: ${p.path}` });
    } else if (p.status === 404) {
      // 不存在，跳过
    } else if (p.status >= 500) {
      findings.push({ ...p, level: 'medium', finding: `服务器错误 ${p.status}: ${p.path}` });
    }
  }

  // 4) 服务器指纹信息泄露判定
  const headerLeaks = [];
  const sensitiveHdrs = ['server', 'x-powered-by', 'x-aspnet-version', 'x-version', 'x-generator'];
  for (const h of sensitiveHdrs) {
    if (headers[h]) headerLeaks.push({ header: h, value: headers[h].slice(0, 120) });
  }

  const out = {
    tool: 'Nikto 实现（服务器侦察）',
    target: BASE,
    timestamp: new Date().toISOString(),
    serverHeaders: Object.fromEntries(Object.entries(headers).filter(([k]) => /^(server|x-|via|date|content-security-policy|strict-transport|set-cookie)/i.test(k))),
    headerLeaks,
    probes: probes.map(p => ({ path: p.path, status: p.status, len: p.len, ct: p.ct, dirListing: p.dirListing, isCatchAll: p.isCatchAll })),
    findings,
    summary: { probes: probes.length, findings: findings.length, byLevel: findings.reduce((a, f) => (a[f.level] = (a[f.level] || 0) + 1, a), {}) },
    verdict: '可基本实现——响应头指纹 + 敏感路径探测 + 目录列表检测都能做；但与 Nikto 的差异是检查项数量（Nikto 8000+ 条）与 CVE 版本匹配库。',
    spaCaveat: 'SPA catch-all 路由会让所有未知路径返回 200(index.html)，纯 HTTP 探测会产生大量假阳性；需对比 index.html 壳签名剔除。',
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('written:', OUT);
  console.log('headerLeaks:', JSON.stringify(headerLeaks));
  console.log('summary:', JSON.stringify(out.summary));
  console.log('--- findings ---');
  findings.forEach(f => console.log(`  [${f.level}] ${f.finding}  (${f.path})`));
  await browser.close();
})();
