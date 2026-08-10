---
tags:
  - 测试记录
  - Playwright实现
  - Screaming-Frog
  - SEO
---

# Screaming Frog 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[07-Screaming-Frog]] 的核心功能：全站爬取 + SEO 技术指标审核。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | 共享爬虫全站爬取 + 逐页提取 SEO 指标 + 聚合问题 |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/03-screaming-frog.js`（依赖 `_lib.js`） |
| 靶标 | Juice Shop `http://localhost:3000` |
| 爬取上限 | 50 页 |

## 1. 实现方法（怎么做）

Screaming Frog = **全站爬取 → 逐页提取 SEO 指标 → 按问题聚合**。Playwright 实现：爬虫对每页提取：

- Title / Meta Description / H1 / Canonical / 图片 alt / 结构化数据(json-ld)
- 然后聚合 SEO 常见问题：**缺失 / 重复 / 超长 / 多 H1 / 缺 alt**

```js
// 核心提取（03-screaming-frog.js）
const p = await page.evaluate(() => ({
  title: document.title,
  meta: {...document.querySelectorAll('meta')...},
  h1s: [...document.querySelectorAll('h1')].map(e => e.textContent),
  canonical: document.querySelector('link[rel=canonical]')?.href,
  imgNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
  jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')]...
}));
// 再统计：title/meta 去重计数 → 找出被多个页面复用的
```

## 2. 测试结果

### 爬取概况

| 指标 | 值 |
|---|---|
| 爬取页面 | 19（路由，**不含首页根路径 `/`**） |
| SEO 问题总数 | **70** |

> 📌 **范围说明**：本记录爬取的是 19 个 hash 路由页，**未含首页根路径 `http://localhost:3000/`**（爬虫从路由出发，未覆盖根路径）。因此首页上的问题（如 [[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]] 发现的"首页 2 个 H1""17 张图全有 alt"）不在本记录统计内——两记录口径不同，非矛盾。

### 问题分布

| 问题类型 | 数量 | 说明 |
|---|---|---|
| Title 重复 | 19 | **所有页面共用同一 `<title>`：`OWASP Juice Shop`** |
| Meta Description 重复 | 19 | 所有页面共用同一 description |
| Canonical 缺失 | 19 | 全站无 canonical 标签 |
| H1 缺失 | 8 | product 页 / score-board / deluxe-membership 等无 H1 |
| 图片缺 alt | 4 | 4 张图片无 alt 属性 |
| 多 H1 | 1 | recycle 页有 2 个 H1 |

> ✅ **已验证非测量假象**：用独立脚本逐个访问路由确认，Juice Shop 确实不随路由更新 title/meta（所有路由都返回 `OWASP Juice Shop` / 同一段 description）。这是真实的 SEO 技术债——SPA 缺乏按路由的元数据管理。

## 3. 关键洞察

- **SPA 的 SEO 通病被完整抓到**：同 title/meta、无 canonical——正是 Google 索引 SPA 时最常见的减分项。
- 19 页共用同一 title 说明 Juice Shop **没有**做按路由的 `document.title` 更新（或更新逻辑未生效），对真实产品这就是需要上报的问题。
- Screaming Frog 免费版上限 500 URL 且不可导出；**Playwright 实现无上限、输出即结构化 JSON/MD**。

## 4. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| 全站爬取 | ✅ | ✅ | 100% |
| Title/Desc/H1/Canonical 提取 | ✅ | ✅ | 100% |
| 重复/缺失问题聚合 | ✅ | ✅ | 100% |
| 结构化数据检查 | ✅（新版） | ✅ json-ld | 100% |
| 重定向/状态码分组 | ✅ | ✅（见 LinkChecker 实现） | 100% |
| 可视化（站点图/重定向图） | ✅ | ❌ 需自绘 | 弱 |
| 导出 CSV/XLSX | ✅（付费） | JSON/MD 免费 | **更优** |

## 5. 结论

- **可完全实现核心功能**（爬取 + 指标提取 + 问题聚合），输出即结构化数据。
- 相比原工具的最大优势：**免费、无 500 URL 上限、可脚本化、数据即 JSON**。
- 差距仅在可视化与商业软件的成熟度。

## 相关
- [[07-Screaming-Frog]] · [[测试记录_2026-08-06_Playwright实现_LinkChecker_JuiceShop]]（死链维度）
- [[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]]（单页 SEO 评分视角）
