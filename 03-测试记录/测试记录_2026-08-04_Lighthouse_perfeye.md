---
tags:
  - 测试记录
  - Lighthouse
  - 性能
---

# Lighthouse 测试记录

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-04 |
| 工具及版本 | Lighthouse 13.3.0（npx） |
| 靶标 URL | `https://perfeye.testplus.cn/project/list?appKey=mecha` |
| 靶标类型 | 公网站点（内网系统，未登录） |
| 测试配置 | 移动端模拟（412×823, DPR 1.75），DevTools 通道，模拟节流 |
| 说明 | 同一 URL 连续测试 2 次（间隔约 4 分钟），对比稳定性 |

## 1. 测试命令

```powershell
npx lighthouse "https://perfeye.testplus.cn/project/list?appKey=mecha" --output=json --output-path=perfeye.testplus.cn-20260804T142217.json
# 约 4 分钟后再次运行，输出 ...142605.json
```

## 2. 测试结果

### 2.1 评分对比

| 分类 | 第 1 次 | 第 2 次 | 变化 |
|---|---|---|---|
| Performance | 57 | 58 | ↑1（噪声级） |
| Accessibility | 67 | 67 | — |
| Best Practices | 54 | 54 | — |
| SEO | 67 | 67 | — |

### 2.2 核心指标（两次取代表值）

| 指标 | 值 | 达标线 | 评价 |
|---|---|---|---|
| FCP | 385 ms | ≤ 1.8s | 优 |
| LCP | 799 ms | ≤ 2.5s | 优 |
| **CLS** | **0.903** | ≤ 0.1 | 🔴 极差（稳定复现） |
| TBT | 400 ms | ≤ 200ms | 差 |
| TTI | 1.8 s | — | 中 |
| 后端延迟 | 130 ms | — | 中（来自百度统计抖动） |

## 3. 关键发现

| # | 严重度 | 发现 | 说明 |
|---|---|---|---|
| 1 | 🔴 高 | **CLS = 0.903**，4 处布局偏移稳定复现 | 主内容区/导航/用户菜单元素位移，性能分主要失分项 |
| 2 | 🔴 高 | 主线程 JS 解析+执行约 **1.9s**（占 75%） | `vendors.42aef419.async.js` 长任务 336ms 为主因 |
| 3 | 🟠 中 | robots.txt **131 个错误** | SEO 存量问题 |
| 4 | 🟠 中 | 颜色对比度 **35 项**、ARIA 属性错误若干 | 可访问性存量问题 |
| 5 | 🟡 低 | 测试环境被 Chrome 扩展污染 | 长任务/unused-js 出现 `chrome-extension://`，建议用无扩展环境复测 |

> 两次结果差异均在 ±10% 内且方向有升有降，判断**没有发生实质性能变化**，属于运行噪声；上述问题均为两次**稳定复现**的存量问题。

## 4. 结论与建议

- 优先修 **CLS**（定位 4 处布局偏移元素的位移来源）→ 主线程 JS 瘦身（拆分 vendors）→ robots.txt / 颜色对比度。
- 正式性能测试建议用**无扩展 Chrome** 或 Lighthouse CI，获得干净基线。
- 完整明细见原始报告：`D:\webest_report\Lighthouse\`（2 份 JSON + Lighthouse报告差异分析.md/html）。

## 5. 附件
- 原始报告目录：`D:\webest_report\Lighthouse\`
- 参考：[[01-Lighthouse]] 手册 · [[测试方法论]]

## 相关
- [[测试记录模板]] · [[工具对比总表]]
