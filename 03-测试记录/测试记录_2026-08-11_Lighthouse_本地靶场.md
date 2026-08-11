---
tags:
  - 测试记录
  - Lighthouse
  - 性能
  - Juice Shop
---

# Lighthouse 测试记录

> 📌 **记录沿革**：早期 perfeye 站点测试（2026-08-04）因未登录，WebPageTest 实际测到的是 **SSO 登录页**（见 [[测试记录_2026-08-04_WebPageTest_perfeye]]）；本次重测改用**本地靶场 Juice Shop**（`localhost:3000`）作为靶标。本记录为官方 Lighthouse CLI 对靶场的评分；WebPageTest 后续亦将按相同靶标重测。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-11 |
| 工具及版本 | Lighthouse 13.4.1（CLI，本地安装） |
| 靶标 URL | `http://localhost:3000/`（OWASP Juice Shop 首页） |
| 靶标类型 | 本地靶场（Docker，`-p 3000:3000`） |
| 测试配置 | 移动端模拟（412×823, DPR 1.75），模拟节流（simulate：CPU×4 + Slow 4G），无头 Chrome |
| 说明 | 单次全量审计，官方 CLI 评分 |

## 1. 测试命令

```powershell
# PowerShell 中逗号参数必须加引号，否则被解析为数组分隔符导致报错
lighthouse http://localhost:3000 --output="html,json" --output-path=./report --chrome-flags="--headless --no-sandbox"
# 输出：report.report.html / report.report.json
```

## 2. 测试结果

### 2.1 评分

| 分类 | 分数 | 说明 |
|---|---|---|
| **Performance** | **70** | 主要失分：LCP（6.0s）/ FCP（3.3s） |
| Accessibility | 87 | 3 处问题（见 §3） |
| Best Practices | 100 | — |
| SEO | 100 | — |
| Agentic Browsing | 32 | Lighthouse 13 新增类别，权重参考 |

### 2.2 核心指标

| 指标 | 值 | 达标线 | 评价 |
|---|---|---|---|
| FCP | 3.3 s | ≤ 1.8s | 🟠 差 |
| **LCP** | **6.0 s** | ≤ 2.5s | 🔴 极差（性能分最大失分项） |
| CLS | 0.065 | ≤ 0.1 | 🟢 优 |
| TBT | 110 ms | ≤ 200ms | 🟢 优 |
| SI | 3.3 s | — | 🟠 中 |
| TTI | 6.0 s | — | 🟠 中（受 LCP 拖累） |
| TTFB | 10 ms | — | 🟢 优（本地直连） |

> ⚠️ **解读**：LCP/FCP 的慢主要是 **Lighthouse 移动模拟节流**（CPU×4 + Slow 4G）放大所致。LCP 拆解显示真实渲染路径仅 ~450ms（TTFB 8ms + 资源加载延迟 384ms + 渲染 50ms），与本仓库 Playwright 实测 **LCP 456ms**（[[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]]）吻合。**Lighthouse 分数更适合做相对基线，真实"快不快"看未节流实测**。

### 2.3 主线程与资源

| 项 | 值 |
|---|---|
| 主线程总耗时 | 1.0 s（脚本求值 562ms / 样式与布局 212ms / 其他 230ms） |
| 长任务 | 3 个：152ms（`chunk-QDZ6R7S6.js`）、64ms（不可归属）、58ms（`polyfills.js`） |
| 请求数 | 53（脚本 15 / 图片 17 / 样式表 1 / 字体 1） |
| 资源总量 | 1,082 KiB（~1.06 MB） |
| 主要资源 | `main.js` 182KiB、`material-icons.woff2` 126KiB、`chunk-QDZ6R7S6.js` 104KiB、`permafrost.jpg` 92KiB |

## 3. 关键发现

| # | 严重度 | 发现 | 说明 |
|---|---|---|---|
| 1 | 🔴 高 | **LCP = 6.0s（评分 0.13）** | 权重 25/100，性能分 70 的最主要拉低项；主因是模拟节流放大（见 §2.2 解读） |
| 2 | 🟠 中 | **未用 JS 115 KiB（估算可省 750ms）** | `main.js` 浪费 84/182KiB、`chunk-QDZ6R7S6.js` 浪费 31/103KiB |
| 3 | 🟠 中 | **未用 CSS 20 KiB（估算可省 150ms）** | 样式表裁剪空间 |
| 4 | 🟠 中 | **可访问性 3 处问题（评分 87）** | 按钮无可访问名 1 处、颜色对比度不足 2 处、`role="dialog"` 无可访问名 1 处 |
| 5 | 🟡 低 | **Agentic Browsing 仅 32 分** | 新增类别：可访问性树不规范 + llms.txt 不达标 |

## 4. 结论与建议

- **结论**：本地 Juice Shop 在官方 Lighthouse 移动模拟口径下性能 70 分，**主要被 LCP 拉低**；TBT/CLS/TTFB 均达优，Best Practices 与 SEO 满分。作为本地靶场整体健康。
- **建议**：
  1. 关心"真实渲染快不快"看 [[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]] 实测（LCP ~0.45s）；Lighthouse 分数用作**跨版本/跨配置的相对基线**。
  2. 如需提升模拟口径得分：削减未用 JS/CSS（可省 ~900ms）、给搜索按钮补 `aria-label`。
  3. 生产部署时 TTFB/网络延迟会显著上升，本地得分不可直接外推。
- 完整明细见原始报告：`03-测试记录\webest_report\Lighthouse\重测\`（`report.report.html` 可视化 + `report.report.json` 结构化）。

## 5. 附件
- 原始报告目录：`03-测试记录\webest_report\Lighthouse\重测\`
- 参考：[[01-Lighthouse]] 手册 · [[测试方法论]] · [[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]]

## 相关
- [[测试记录模板]] · [[工具对比总表]]
