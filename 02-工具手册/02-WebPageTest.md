---
tags:
  - 工具手册
  - 性能
---
# 🌐 02 · WebPageTest

## 1. 工具简介

WebPageTest 是业界知名的**深度性能测试平台**（原 Google 工具，现由 Catchpoint 维护）。它在真实浏览器中加载页面，输出**瀑布图（Waterfall）**、首屏/完全加载时间、请求明细等，支持全球多地域节点和多种模拟网速。核心亮点是**瀑布图**——能看到每个资源的加载顺序与耗时。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 资源瀑布图 | 逐请求查看 DNS/连接/TTFB/传输耗时，定位瓶颈 |
| 多节点/多网速 | 选择全球节点、模拟 Cable/3G/4G/LTE |
| 多轮测试取均值 | 减少抖动，结果更稳 |
| 电影胶片图 | 逐帧看首屏渲染过程（Filmstrip） |
| 真实浏览器 | Chrome 移动/桌面仿真 |
| Lighthouse 集成 | 结果页内直接看 Lighthouse 数据 |

**适用场景**：定位具体资源瓶颈、跨地域体验对比、发布前深度体检。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| 瀑布图无可替代，诊断利器 | 公共实例免费额度有限，需 API key |
| 多地域多网速真实模拟 | 测本机 localhost 不方便（需内网穿透） |
| 电影胶片图直观展示渲染 | 上手比 Lighthouse 略复杂 |
| 真实浏览器数据 | 免费队列可能等待 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | 云端服务（webpagetest.org）+ npm CLI 封装 |
| 许可证 | 公共实例免费（限量）；源码 MIT |
| 依赖 | Node.js（CLI 方式）；无浏览器依赖（云端跑） |
| 安装方式 | ① 网页直接用 ② `npm install -g webpagetest` |
| 资源占用 | 本机几乎为零（远程测试） |
| 学习成本 | ★★☆ |
| 与现有环境 | 本机 Node 可用，注册免费 API key 即可 |

> ⚠️ **本地靶场注意**：WebPageTest 公共节点无法访问你的 `localhost`。测试本地靶场需用内网穿透（如 ngrok），或仅用于测试公网站点。若纯测本地，[[01-Lighthouse]] 更合适。

## 5. 安装指南

### 方式 A：网页直接使用（零安装）
1. 打开 <https://www.webpagetest.org/>
2. 输入网址 → 选 Location / 浏览器 / 连接 → **Start Test**

### 方式 B：npm CLI（推荐自动化）
```powershell
# 1. 免费申请 API key：https://www.webpagetest.org/getkey.php
# 2. 安装
npm install -g webpagetest
# 3. 验证
webpagetest --help
```

## 6. 基本用法

### 6.1 发起一次测试并等待结果

```powershell
# testAndWait：提交后轮询直到结果出来
webpagetest testAndWait https://example.com -k YOUR_API_KEY --location Dulles --browser Chrome --runs 3 --video 1
```

### 6.2 分步操作（发起 → 查状态 → 取结果）

```powershell
# 发起测试，拿到 testId
webpagetest test https://example.com -k YOUR_API_KEY
# 查状态（返回 pending / running / completed）
webpagetest status <testId> -k YOUR_API_KEY
# 取结果 JSON
webpagetest results <testId> -k YOUR_API_KEY
# 下载瀑布图
webpagetest waterfall <testId> -k YOUR_API_KEY --output ./waterfall.png
```

### 6.3 直接调 REST API（PowerShell 示例）

```powershell
$key = "YOUR_API_KEY"
$r = Invoke-RestMethod "https://www.webpagetest.org/runtest.php?url=https://example.com&k=$key&f=json"
$r.data.jsonUrl
```

## 7. 输出解读

### 结果页核心区块
| 区块 | 含义 |
|---|---|
| **Waterfall（瀑布图）** | 每个资源的加载时序；`start` 到 `load` 的距离反映问题所在 |
| **Filmstrip** | 首屏逐帧截图，看空白期 |
| **Timings** | TTFB、First Paint、LCP、Fully Loaded 等 |
| **Requests / Bytes** | 请求数与传输量 |

### 关键指标
| 指标 | 含义 | 达标线 |
|---|---|---|
| **TTFB** | 首字节时间（服务器响应速度） | < 0.8s（参考） |
| **LCP** | 最大内容绘制 | ≤ 2.5s |
| **Fully Loaded** | 全部资源加载完成 | 越短越好 |
| **Speed Index** | 视觉加载速度综合值 | 越低越好 |

### 瀑布图阅读技巧
- 关注**红色/深色长条**（加载慢的资源）
- 关注**并行加载**情况：串行阻塞 = 布局问题
- 看 TTFB 前的阶段区分是网络问题还是服务器问题

## 8. 测试记录模板

```markdown
## WebPageTest 测试记录
- 日期：____ ｜ 靶标：____ ｜ 节点：____ ｜ 网速：____ ｜ runs：__

| 指标 | 第1次 | 第2次 | 中位数 |
|---|---|---|---|
| TTFB | | | |
| LCP | | | |
| Fully Loaded | | | |
| Speed Index | | | |

- 请求总数：____ ｜ 传输字节：____
- 瀑布图：截图保存为 `waterfall_<testId>.png`

### 瓶颈分析
- 最慢的资源：____
- 建议：____

### 结论 / 遗留问题
- ____
```

## 9. 参考链接
- 官网：<https://www.webpagetest.org/>
- 免费 API key：<https://www.webpagetest.org/getkey.php>
- npm 包：<https://www.npmjs.com/package/webpagetest>
- GitHub：<https://github.com/catchpoint/WebPageTest>

## 相关
- [[工具对比总表]] · [[测试方法论]]
- [[01-Lighthouse]]（快速评分）· [[07-Screaming-Frog]]（SEO 全站）
