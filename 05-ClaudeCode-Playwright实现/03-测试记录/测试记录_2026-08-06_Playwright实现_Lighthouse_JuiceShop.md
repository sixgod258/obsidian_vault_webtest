---
tags:
  - 测试记录
  - Playwright实现
  - Lighthouse
  - 性能
  - SEO
  - 可访问性
---

# Lighthouse 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[01-Lighthouse]] 的核心功能：单页性能（Web Vitals）+ SEO + 可访问性审计。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | 真实 Chrome 无头加载 + 注入 PerformanceObserver 采集指标 + DOM 审计 |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/04-lighthouse.js` |
| 靶标 | Juice Shop `http://localhost:3000`（首页） |
| 测量条件 | 本机直连，冷启动 |

## 1. 实现方法（怎么做）

Lighthouse = **真实浏览器加载 → 采集性能指标（Web Vitals）→ 检查页面质量（SEO/可访问性/最佳实践）**。Playwright 实现同一流程：

1. **性能**：页面脚本执行前 `addInitScript` 注入 `PerformanceObserver`，采集 **LCP / CLS / INP**；再读 `performance` 导航时序拿 **TTFB / DCL / Load**；遍历 `resource entries` 统计请求数与传输量。
2. **SEO**：检查 title / meta description / viewport / html lang / canonical / robots。
3. **可访问性**：检查 img alt、表单控件 label、按钮可访问名、H1 数量与标题层级。

```js
// 核心：注入 Web Vitals 观察器（04-lighthouse.js）
await page.addInitScript(() => {
  new PerformanceObserver(l => window.__pw.lcp = Math.max(window.__pw.lcp, ...l.getEntries().map(e=>e.startTime)))
    .observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => window.__pw.cls += l.getEntries().filter(e=>!e.hadRecentInput).reduce((s,e)=>s+e.value,0))
    .observe({ type: 'layout-shift', buffered: true });
});
await page.goto(TARGET, { waitUntil: 'networkidle' });
const metrics = await page.evaluate(() => ({ ttfb: navigationEntry.responseStart - start, resources: ... }));
```

## 2. 测试结果（首页）

### 核心 Web Vitals（Lighthouse 阈值判定）

| 指标 | 实测 | 达标线 | 判定 |
|---|---|---|---|
| **LCP**（最大内容绘制） | **456 ms** | ≤ 2.5s | 🟢 |
| **CLS**（累积布局偏移） | **0.061** | ≤ 0.1 | 🟢 |
| **INP**（交互延迟） | 未采集 | ≤ 200ms | ⚪（需真实交互触发） |
| **TTFB**（首字节） | **4 ms** | < 0.8s | 🟢 |
| DOMContentLoaded | 146 ms | — | — |
| Load | 181 ms | — | — |

### 资源负载

| 指标 | 值 |
|---|---|
| 总请求数 | 53 |
| 总传输量 | ~1.06 MB |
| 最重资源类型 | 图片 460 KB（17 个）> 脚本 314 KB（5 个）> 其他 152 KB > CSS 129 KB |

> 解读：图片占了近一半流量，JS 其次——典型的 SPA 首屏构成；本地直连所以 TTFB 极快（生产环境会显著上升）。

### SEO 检查

| 检查项 | 结果 |
|---|---|
| `<title>` | ✅ 存在（但全站共用，见 Screaming-Frog 实现） |
| meta description | ✅ 存在 |
| viewport | ✅ |
| html lang | ✅ `en` |
| canonical | ❌ 缺失 |

### 可访问性检查

| 检查项 | 结果 |
|---|---|
| 图片都有 alt | ✅（17/17） |
| 表单控件有 label | ❌ 1 个未标注（搜索框） |
| 按钮有可访问名 | ❌ 1 个空按钮（搜索图标按钮无 aria-label/text） |
| 恰好一个 H1 | ❌ 首页有 2 个 H1 |
| 标题层级 | ⚠️ `h2 > h3 > h3 > h3 > h1 > h1`（先 h2 后 h1，顺序倒置） |

## 3. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| Web Vitals 实测值 | ✅ | ✅ LCP/CLS/TTFB | 100% |
| INP | ✅ | ⚠️ 需模拟交互 | 部分 |
| 0–100 综合评分 | ✅ | ❌（需引入其审计库） | 弱 |
| 机会/优化建议 | ✅ | ⚠️ 可基于数据人工给 | 部分 |
| SEO / 可访问性检查 | ✅ | ✅ 检查清单 | 80% |
| PWA / Best Practices | ✅ | ❌ 未覆盖 | 弱 |

## 4. 结论

- **核心指标可实现**：LCP/CLS/TTFB/请求量等实测值与 Lighthouse 是同一批底层数据（Performance API + 浏览器），可信。
- **拿不到"评分"**：Lighthouse 的 0–100 分是其专有审计库按规则算的，Playwright 实现给的是**原始指标 + 阈值判定**，信息量等价、格式不同。
- **INP 采集缺口**：INP 需要真实交互事件，脚本里只模拟了点击，未触发足够交互——记录为 N/A，真实评测需跑交互场景。
- 结论：**可作为 CI 里的轻量性能门禁**（LCP/CLS/TTFB 超阈值即失败），不必依赖完整 Lighthouse。

## 相关
- [[01-Lighthouse]] · [[测试记录_2026-08-06_Playwright实现_WebPageTest_JuiceShop]]（瀑布图维度）
- [[测试记录_2026-08-06_Playwright实现_ScreamingFrog_JuiceShop]]（全站 SEO 维度）
