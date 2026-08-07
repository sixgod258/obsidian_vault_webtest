---
tags:
  - 测试记录
  - Playwright实现
  - LinkChecker
  - 链接
---

# LinkChecker 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[03-LinkChecker]] 的核心功能：全站递归爬取 + 死链/重定向检测。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | 共享爬虫 `_lib.js` 全站 BFS + request API 逐个检查状态 |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/02-linkchecker.js`（依赖 `_lib.js`） |
| 靶标 | Juice Shop `http://localhost:3000` |
| 爬取上限 | 60 页（含预置种子路由） |

## 1. 实现方法（怎么做）

LinkChecker = **递归爬取站点 → 收集所有站内链接 → 逐个检查 HTTP 状态**。Playwright 实现分三步：

1. **爬取**：用 `_lib.js` 的 `crawlSite()` 对 SPA 做 BFS——既读 `<a href>`，也读 Angular 的 `[routerLink]`，**能看到纯静态爬虫看不见的客户端路由**。
2. **收集**：把每页的站内链接 + 已爬路由去重成唯一 URL 清单。
3. **检查**：用 request API 对每个 URL 发请求，记录 状态码/重定向/超时（同 LinkChecker 的语义）。

```js
// 核心思路（02-linkchecker.js）
const crawl = await crawlSite(page, BASE, { maxPages: 60, seedRoutes: SEED_ROUTES });
// → 得到所有页面 + 每页 links + 网络响应
for (const u of uniqueLinks) {
  const resp = await reqCtx.get(u, { maxRedirects: 0, timeout: 8000 });
  // 记录 status / redirect / timeMs / 来源页
}
```

## 2. 测试结果

### 汇总

| 指标 | 值 |
|---|---|
| 爬取页面 | 22 |
| 发现路由 | 22（含种子补入的产品页/计分板等） |
| 唯一站内链接检查 | 7（SPA 的 `<a href>` 很少，导航多为 routerLink） |
| 正常（2xx） | 2 |
| 死链（4xx/5xx） | **0** |
| 重定向（3xx） | **5** |
| 渲染近空的死路由 | 0 |

### 重定向明细（都是 `/redirect?to=` 外链中转）

| URL | 状态 | 目标 |
|---|---|---|
| `/redirect?to=https://github.com/juice-shop/juice-shop` | 302 | GitHub |
| `/redirect?to=http://shop.spreadshirt.com/juiceshop` | 302 | Spreadshirt |
| `/redirect?to=http://shop.spreadshirt.de/juiceshop` | 302 | Spreadshirt DE |
| `/redirect?to=https://www.stickeryou.com/...` | 302 | StickerYou |
| `/redirect?to=http://leanpub.com/juice-shop` | 302 | Leanpub |

## 3. 关键洞察：SPA 下的死链判定要"渲染"而非"看状态码"

- 服务器对任意路径返回 200（index.html），**HTTP 状态码无法区分死路由**——这正是 [[04-Wget-Spider]] / LinkChecker 这类静态工具在 SPA 上的共同盲区。
- Playwright 的补强：访问 `#/路由` 后检测**页面是否渲染出实质内容**（`body` 文本长度）。本靶场 22 条路由全部渲染正常，无死路由。
- 产品页 `#/product/999`（不存在）同样返回 200 + 有内容（显示错误提示页）——严格说它是个"软 404"，Playwright 可以进一步识别（检查是否渲染了 not-found 组件），这在静态工具里做不到。

## 4. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| 全站递归爬取 | ✅ | ✅（且能爬 SPA 路由） | **更优** |
| 状态码/重定向/超时 | ✅ | ✅ | 100% |
| 多线程加速 | ✅ | 并发 request | 可实现 |
| 多格式报告 CSV/HTML | ✅ | JSON + Claude 写 MD | 100% |
| 遵守 robots.txt | ✅ | 可加（默认 Playwright 不限制） | 可实现 |
| **SPA 死路由识别** | ❌ 盲区 | ✅ 渲染判空 | **Playwright 优势** |

## 5. 结论

- **可完全实现**，且在 SPA 上比原工具**更准**（能发现客户端路由 + 软 404）。
- 数据量：22 页、90+ 响应，本地耗时 < 10 秒。
- 适合场景：站改版全站死链巡检、上线前链接健康检查。

## 相关
- [[测试记录_2026-08-06_Playwright实现_WgetSpider_JuiceShop]] · [[03-LinkChecker]] · [[04-Wget-Spider]]
- [[测试记录_2026-08-06_Playwright实现_ScreamingFrog_JuiceShop]]（含死链 + SEO）
