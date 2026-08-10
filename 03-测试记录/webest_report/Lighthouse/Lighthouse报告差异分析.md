# Lighthouse 测试报告差异分析

> 对比 `perfeye.testplus.cn-20260804T142217.json` 与 `perfeye.testplus.cn-20260804T142605.json` 两份报告。

## 1. 测试基本信息

| 项目 | 报告 1 | 报告 2 |
|---|---|---|
| 文件名 | perfeye.testplus.cn-20260804T142217.json | perfeye.testplus.cn-20260804T142605.json |
| 抓取时间 | 2026-08-04 06:22:17 (UTC) | 2026-08-04 06:26:05 (UTC) |
| 间隔 | — | 约 3 分 48 秒 |
| Lighthouse 版本 | 13.3.0 | 13.3.0 |
| 请求 URL | https://perfeye.testplus.cn/project/list?appKey=mecha | 相同 |
| 最终 URL | https://perfeye.testplus.cn/project/list?appKey=mecha | 相同 |
| 测试配置 | 移动端模拟 (412×823, DPR 1.75)，DevTools 通道，模拟节流 | 相同 |

两次测试**相同的 URL、相同版本、相同配置**，仅在约 4 分钟后连续执行，适合观察同一版本页面的稳定性与波动。

## 2. 总体评分对比

| 分类 | 报告 1 | 报告 2 | 变化 |
|---|---|---|---|
| Performance（性能） | **57** | **58** | ↑ +1 |
| Accessibility（无障碍） | 67 | 67 | — |
| Best Practices（最佳实践） | 54 | 54 | — |
| SEO | 67 | 67 | — |

性能分小幅提升 1 分，其余三个分类完全一致。总审计数均为 155 项，`binary / notApplicable / numeric / informative / metricSavings / manual` 各状态计数两次完全一致（53/38/12/22/19/11）。

## 3. 核心性能指标差异

### 3.1 Lighthouse 核心指标（Web Vitals 相关）

| 指标 | 报告 1 | 报告 2 | 变化 | 影响 |
|---|---|---|---|---|
| FCP 首次内容绘制 | 385 ms | 376 ms | ↓ 9 ms | 略好 |
| LCP 最大内容绘制 | 799 ms | 809 ms | ↑ 10 ms | 略差 |
| Speed Index 速度指数 | 1.0 s | 1.1 s | ↑ 71 ms | 略差（0.97 → 0.95） |
| TBT 总阻塞时间 | 400 ms | 380 ms | ↓ 20 ms | 好（0.41 → 0.44） |
| TTI 可交互时间 | 1.8 s | 1.7 s | ↓ 39 ms | 略好 |
| Max Potential FID 最大潜在 FID | 336 ms | 328 ms | ↓ 8 ms | 略好 |
| CLS 累积布局偏移 | **0.903** | **0.903** | ≈ 持平 | 两次均极差（0.03 分） |

**结论**：核心指标整体在 ±10% 内小幅波动，方向有升有降，属于运行噪声级差异，**页面性能没有实质性的改进或退化**。其中 **CLS ≈ 0.90 是两次共性的严重问题**（极差），是性能分被拉低的主要原因之一。

### 3.2 布局偏移明细（两次一致，共性问题）

CLS 为 0.903，两次均检出 **4 处布局偏移**，偏移元素完全相同，主要涉及：
- `main.ant-layout-content` 主内容区
- `header.public-nav-header > div.right-container` 公共导航
- `div.right-menu-wra...`（用户菜单）
- `main.ant-layout-content` 下的页面内容容器

说明布局偏移是**稳定复现的代码问题**，并非偶发，需要优先定位这些元素在加载过程中的位移来源（如字体加载、异步数据渲染导致高度变化等）。

## 4. 主线程与 JS 执行差异

### 4.1 总览

| 审计 | 报告 1 | 报告 2 | 变化 |
|---|---|---|---|
| bootup-time（JS 执行耗时） | 1.6 s | 1.7 s | ↑ 略差（均 0 分） |
| mainthread-work-breakdown（主线程总耗时） | 2.6 s | 2.5 s | ↓ 略好（均 0 分） |
| long-tasks（长任务数） | 12 个 | 11 个 | ↓ 1 个 |

### 4.2 主线程耗时构成（单位 ms）

| 工作类别 | 报告 1 | 报告 2 | 变化 |
|---|---|---|---|
| Script Evaluation | 1205.7 | 1199.7 | ↓ 6 |
| Script Parsing & Compilation | 680.2 | 679.5 | ≈ 持平 |
| Other | 409.0 | 382.4 | ↓ 26.6 |
| Style & Layout | 154.9 | 158.7 | ↑ 3.8 |
| Rendering | 97.7 | 55.0 | ↓ 42.7 |
| Garbage Collection | 30.8 | 30.0 | ≈ 持平 |
| Parse HTML & CSS | 7.9 | 8.2 | ≈ 持平 |

主线程耗时主体是 **JS 解析与执行**（合计约 1.9s，占 75%），两次一致，是主要优化方向。

### 4.3 最长任务

| 任务来源 | 报告 1 | 报告 2 |
|---|---|---|
| vendors.42aef419.async.js（最长） | 336 ms | 328 ms |
| vendors.42aef419.async.js（次长） | 163 ms | 158 ms |
| umi.6fc7066c.js | 110 ms | 101 ms |
| chrome-extension://…/183.js | 76 ms | 93 ms |
| chrome-extension://…/content_main.js | 68 ms | 69 ms |

> ⚠️ **注意**：长任务与 unused-javascript 审计中出现了 **chrome-extension://** 的脚本（见第 6 节），说明测试时浏览器启用了 Chrome 扩展，扩展脚本会污染主线程指标与内存/网络统计，且不可控。正式性能测试建议使用无扩展的 Chrome 或 Lighthouse CI 环境。

## 5. 网络相关差异

| 审计 | 报告 1 | 报告 2 | 变化 |
|---|---|---|---|
| Server Backend Latency（后端延迟） | **130 ms** | **80 ms** | ↓ 50 ms（好） |
| Initial server response time（TTFB） | 50 ms | 60 ms | ↑ 10 ms（略差） |
| Network RTT | ≈ 0 ms | ≈ 0 ms | 持平 |

后端延迟的差异完全来自第三方 `https://hm.baidu.com`（百度统计）：
- 报告 1：127.9 ms
- 报告 2：82.3 ms

站内 origin（perfeye / staticres / ks3 / ksyuncs 等）后端响应时间均为 0。TTFB 的 50→60 ms 波动也在正常范围内。**网络层面无明显异常，属正常抖动。**

## 6. 资源与动画差异

| 审计 | 报告 1 | 报告 2 | 说明 |
|---|---|---|---|
| Avoids enormous network payloads | 63 KiB | 63 KiB | 站内资源总量几乎不变（64,062 → 64,089 字节） |
| Reduce unused JavaScript | 可省 2,283 KiB | 可省 2,288 KiB | 几乎全部来自 **Chrome 扩展**（如 content_main.js 3.4MB、wasted 1.97MB） |
| Avoid non-composited animations | 3 个元素 | 2 个元素 | 详见下方 |

**非合成动画**：两次共同的元素为 `ul.ant-pagination > li.ant-pagination-next > button`（分页下一页按钮）。报告 1 额外的元素为表单搜索区的 `span.ant-input-affix-wrapper` / `input#useCaseName`，报告 2 额外元素为 `button.ant-btn`（表单按钮）。说明表单控件区域的动画元素存在，但集合不稳定（可能与页面渲染时机/元素出现顺序有关）。

## 7. 两次完全一致的共性问题（无差异但需关注）

以下审计在两次报告中失败内容完全相同，属于**稳定的存量问题**，与本次对比无关但应列入优化清单：

| 分类 | 问题 | 数量 |
|---|---|---|
| Accessibility | color-contrast 颜色对比度 | 35 项 |
| Accessibility | aria-prohibited-attr / aria-required-attr / aria-valid-attr-value | 24 / 11 / 12 项 |
| Accessibility | label / button-name / image-alt / td-has-header | 11 / 1 / 1 / 1 项 |
| Best Practices | is-on-https（不安全请求） | 11 个 |
| Best Practices | third-party-cookies | 8 个 |
| Best Practices | errors-in-console / inspector-issues | 2 / 2 项 |
| Best Practices | valid-source-maps / bf-cache | 2 项 / 1 个失败原因 |
| SEO | robots-txt | **131 个错误** |
| SEO | crawlable-anchors | 18 项 |
| SEO | meta-description / meta-viewport | 缺失 / 1 项 |

## 8. 总结

1. **两次测试结果高度一致**：除性能分 57→58 外，其余分类评分完全一致；155 项审计中仅 17 项存在数值级差异。
2. **差异均属于运行噪声**：核心指标（FCP/LCP/SI/TBT/TTI/FID/CLS）波动都在 ±10% 以内，且方向有升有降，**没有证据表明两次之间发生了代码变更或环境变化带来的实质影响**。后端延迟 130→80ms 的变化完全来自百度统计第三方请求的抖动。
3. **最值得优先解决的问题（两次稳定复现）**：
   - **CLS = 0.903**（4 处固定布局偏移）——性能分主要失分项；
   - **主线程 JS 耗时约 1.9s**（解析+执行），其中 vendors/umi 的 JS 为长任务主因；
   - **robots.txt 131 个错误、颜色对比度 35 项**等无障碍/SEO 存量问题。
4. **测试环境建议**：报告中出现 Chrome 扩展脚本占用的主线程与 unused-js 统计，建议测试时使用无扩展浏览器，以获得更干净、可复现的基线数据。
