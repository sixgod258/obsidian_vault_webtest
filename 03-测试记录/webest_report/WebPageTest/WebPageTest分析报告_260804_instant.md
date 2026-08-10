# WebPageTest 性能分析报告

| 项目 | 内容 |
| --- | --- |
| 测试文件 | `260804_instant_18b60f46bacf413d931360272473c07a.json` |
| 测试时间 | 2026-08-04 16:12:09 |
| 测试地址 | https://perfeye.testplus.cn/project/list?appKey=mecha |
| 浏览器 | Chrome 148.0.0.0 |
| 模拟环境 | 移动端 400×266，延迟 2ms |
| 测试轮数 | 1 轮（1 次首屏） |

---

## 一、结论摘要

> ⚠️ **重要前提：测试最终渲染的是 SSO 登录页，而非目标页面。**
>
> 由于访问 `/project/list?appKey=mecha` 时未登录，前端应用在加载完成后跳转到了
> `https://sso.testplus.cn/login`（SSO 统一登录页）。因此本次数据反映的是
> **「目标 SPA 壳 + SSO 登录页」的整体加载表现**，并不能代表目标页面的真实性能。

**整体表现较差**：fullyLoaded 耗时 14.1s，FCP 13.2s，核心瓶颈是**超大的 JS 打包文件**
（约 3.2MB 下载 / 10MB 未压缩）导致首屏白屏近 8 秒。

| 关键结论 | 说明 |
| --- | --- |
| 🚨 最大问题 | `vendors.42aef419.async.js` 下载 2.64MB、未压缩 **8.13MB** |
| 🚨 第二大问题 | 所有静态 JS/CSS **响应头缺失 Cache-Control**，完全无法利用缓存 |
| ⚠️ 跳转链 | perfeye SPA 未鉴权 → 302/JS 跳转到 sso 登录页，测试数据失真 |
| ⚠️ 连接耗时 | 首个请求 TTFB 中，DNS+TCP+SSL 连接耗时 1619ms（服务端实际响应仅 291ms） |
| ✅ 表现良好 | gzip/压缩 100 分、keep-alive 100 分、CLS 0.008（优）、TBT 143ms（优） |

---

## 二、核心性能指标

| 指标 | 值 | 评级 |
| --- | ---: | :---: |
| TTFB（首字节） | 1,912 ms | 🔴 差 |
| — 其中服务端响应 | ~291 ms | 🟢 良 |
| FCP（首次内容绘制） | 13,221 ms | 🔴 差 |
| LCP（最大内容绘制） | 9,819 ms | 🔴 差 |
| Speed Index（速度指数） | 13,146 ms | 🔴 差 |
| TBT（总阻塞时间） | 143 ms | 🟢 优 |
| CLS（布局偏移） | 0.008 | 🟢 优 |
| 视觉完成 95% | 13,200 ms | 🔴 差 |
| fullyLoaded（完全加载） | 14,056 ms | 🔴 差 |
| DOMContentLoaded | 2,923 ms | 🟡 中 |
| LoadEvent | 3,391 ms | 🟡 中 |
| CPU 总耗时 | 3,579 ms | 🟡 中 |

> 说明：LCP(9.8s) 早于 FCP(13.2s) 是因为 LCP 记录在页面跳转**之前**（perfeye SPA 加载阶段），
> 而 FCP 是跳转后 SSO 登录页的首次绘制，详见第三节时间线。

---

## 三、加载时间线（水印帧分析）

从视频帧（videoFrames）还原的视觉进度：

| 时间点 | 视觉完成度 | 事件 |
| --- | ---: | --- |
| 0 ~ 7,900 ms | 0% | 白屏 —— 下载并执行 perfeye 的 JS 大包 |
| 8,000 ms | 1% | perfeye 页面开始渲染 |
| 10,000 ms | 2% | perfeye 壳渲染中 |
| 10,142 ms | — | **JS 未鉴权 → 跳转 SSO 登录页**（新的 HTML 文档） |
| 12,200 ms | 0% | 页面导航切换，画面再次清空 |
| 13,200 ms | 98% | SSO 登录页完成绘制 |
| 13,700 ms | 100% | 视觉完全完成 |

**白屏 8 秒的根因**：`umi.6fc7066c.js`(585KB) 与 `vendors.42aef419.async.js`(2.64MB)
需在首屏前下载并执行，主线程仅 EvaluateScript 就消耗 168ms、v8 编译 117ms，
另有 2 个长任务（93ms / 49ms）阻塞渲染。

---

## 四、请求分析

### 4.1 总体

| 指标 | 值 |
| --- | --- |
| 请求总数 | 24 |
| 总下载量 | 3.52 MB |
| 平均有效带宽 | ~290 Kbps（慢速网络模拟） |
| 连接协议 | HTTP/1.1（未启用 HTTP/2，TLS 1.2） |
| HTTP 状态码 | 200×23，302×1（favicon.ico 重定向） |

### 4.2 按资源类型

| 类型 | 请求数 | 下载量 | 占比 |
| --- | ---: | ---: | ---: |
| Script（JS） | 8 | 3.15 MB | 89.5% |
| Stylesheet（CSS） | 5 | 175 KB | 5.0% |
| Image | 5 | 13 KB | 0.4% |
| Document（HTML） | 2 | 19 KB | 0.5% |
| Other / 其他 | 4 | 158 KB | 4.6% |

> JS 占全部下载量的 **89.5%**，是绝对瓶颈。

### 4.3 按域名

| 域名 | 请求数 | 归属 |
| --- | ---: | --- |
| perfeye.testplus.cn | 10 | 目标应用（大 JS/CSS 包） |
| sso.testplus.cn | 7 | SSO 登录页及其静态资源 |
| hm.baidu.com | 3 | 百度统计（第三方追踪） |
| staticres.testplus.cn | 1 | 公共导航脚本 |
| testplus.ks3-cn-beijing.ksyun.com | 1 | 对象存储 |
| ks3-cn-beijing.ksyuncs.com | 1 | 对象存储 |
| gw.alipayobjects.com | 1 | 支付宝 CDN（LCP 图片来源） |

### 4.4 体积最大的资源 Top 8

| 资源 | 下载大小 | 未压缩大小 | 耗时 |
| --- | ---: | ---: | ---: |
| `vendors.42aef419.async.js` | 2.64 MB | 8.13 MB | 2,358 ms |
| `umi.6fc7066c.js` | 585 KB | 1.94 MB | 3,498 ms |
| `testplus-admin.min.css` (sso) | 90 KB | 505 KB | 787 ms |
| `vendors.36c6a22c.chunk.css` | 70 KB | 435 KB | 325 ms |
| `jquery.min.js` (sso) | 40 KB | 112 KB | 312 ms |
| `public-nav-v2.js` | 26 KB | 73 KB | 1,711 ms |
| `umi.22abead7.css` | 11 KB | 73 KB | 289 ms |
| `hm.js`（百度统计） | 11 KB | 30 KB | 1,070 ms |

### 4.5 重定向链

```
GET https://sso.testplus.cn/favicon.ico  →  302  →  /login
```

- sso.testplus.cn 的 `favicon.ico` 未正确配置，返回 302 跳转到登录页（服务端 fallback 配置缺陷）。
- 主跳转（perfeye → sso）由前端 JS 在加载后发起（约 10.1s），不是 HTTP 302，因此请求列表中
  无对应 `redirect_locations`，属于**客户端路由跳转**。

---

## 五、优化评分（WebPageTest 审计）

| 项 | 得分 | 说明 |
| --- | ---: | --- |
| gzip / 压缩 | 100 | 资源已正确压缩 |
| keep-alive | 100 | 连接复用良好 |
| 渐进式 JPEG | -1 | 未检测（无此类图片） |
| **缓存（cache）** | **8** | 🔴 **极差** —— 静态资源缺失缓存头 |
| **CDN** | **8** | 🔴 大量资源未走 CDN |

**各资源缓存头明细（关键）**：

| 资源 | Cache-Control | 缓存评分 |
| --- | --- | ---: |
| perfeye 的 `umi.js` / `vendors.js` / 各 CSS / 图片 | **无响应头** | 0 |
| sso 的 `font-awesome.css` / `testplus-admin.css` / `jquery.js` / logo | `no-cache` | -1 |
| alipay CDN svg（LCP 图） | `max-age=2592000`（30 天） | 100 ✅ |
| 百度统计 | `max-age=0, must-revalidate` | -1 |

> **结论**：除支付宝 CDN 外，几乎全部静态资源都无法被浏览器缓存，每次访问都要重新下载 3.2MB JS。

---

## 六、问题清单

| # | 严重度 | 问题 | 证据 |
| --- | --- | --- | --- |
| 1 | 🔴 高 | 未登录跳转 SSO，目标页指标失真 | document_URL = sso `/login`；10.1s 客户端跳转 |
| 2 | 🔴 高 | vendors JS 打包 8.13MB 未压缩、2.64MB 下载 | `vendors.42aef419.async.js` |
| 3 | 🔴 高 | 静态资源无长缓存头 | score_cache=8；大资源 c_ctrl 为空 |
| 4 | 🟠 中 | 首屏白屏 ~8s | 视频帧 0-7900ms 视觉 0% |
| 5 | 🟠 中 | HTTP/1.1 未启用 HTTP/2/3 | proto=http/1.1，TLS 1.2 |
| 6 | 🟠 中 | 首个请求连接耗时 1.6s（DNS 1064ms） | DNS 解析慢（首个请求） |
| 7 | 🟠 中 | 可访问性：`maximum-scale=1` 禁用缩放 | axe meta-viewport，impact=critical |
| 8 | 🟠 中 | Mixed Content：HTTPS 页加载了 http:// 资源 | console 安全警告 |
| 9 | 🟡 低 | 图标字体未加载（FontAwesome/Glyphicons unloaded） | fonts 状态 unloaded |
| 10 | 🟡 低 | 第三方追踪：百度统计 3 个请求 | hm.baidu.com |
| 11 | 🟡 低 | favicon.ico 302 → /login | 重定向链 |
| 12 | 🟡 低 | DOM 输入框缺少 autocomplete 属性 | console 建议 |
| 13 | 🟡 低 | 主线程长任务 93ms + 49ms | blockingTimes |
| 14 | 🟡 低 | Lit 库整包加载（core features 合并） | console 警告 |

---

## 七、优化建议

### 1. 前端打包（收益最大）
- **拆分 vendors 大包**：8.13MB 未压缩的 `vendors.42aef419.async.js` 应按路由/依赖拆分，
  利用 `webpack`/`vite` 的动态 import，只加载首屏所需依赖。
- 对 `umi.js`（1.94MB 未压缩）做更细粒度代码分割 + tree-shaking。
- 目标：首屏 JS 下载量控制在 **< 500KB**。

### 2. 缓存策略
- 对所有**带内容 hash 的静态资源**（umi/vendors/chunk）返回：
  `Cache-Control: public, max-age=31536000, immutable`
- 未带 hash 的资源（如 sso 的 css/js）至少返回 `max-age=86400`。
- 预计可将重复访问的下载量从 3.2MB 降到 0。

### 3. 登录/鉴权流程
- 目标页面建议**服务端鉴权**（未登录直接 302 到 SSO），避免先下载 3.2MB JS 再客户端跳转，
  可省去 perfeye 壳的整个加载开销。
- 若必须前端鉴权，用**更轻的独立登录页/iframe**，避免加载完整业务 bundle。

### 4. 网络与传输
- 服务端启用 **HTTP/2 / HTTP/3**（当前 1.1 串行加载，大文件下载慢）。
- 首屏 HTML 静态资源接入 CDN（当前 score_cdn=8）。
- 排查 DNS 解析慢问题（首个请求 DNS 耗时 1064ms），可上 CDN 的 Anycast DNS。

### 5. 其他
- 修复 `<meta name="viewport">`，移除 `maximum-scale=1`（无障碍 critical 项）。
- 修复 Mixed Content（将 http:// 子资源升级为 https）。
- 图标字体使用 `font-display: swap` 或改为内联 SVG 图标。
- 百度统计脚本改为 `async` 加载并放最后，或使用 `datalayer` 上报替代。
- 修正 sso 的 favicon.ico 配置（当前 302 到 /login）。

---

## 八、附录

### 8.1 Console 日志（5 条）

| 级别 | 内容 |
| --- | --- |
| log | `modify time: 20220720-1` |
| warning | Lit 从合并了所有核心特性的 bundle 加载，建议拆分以减小传输/解析成本 |
| log | `list`（public-nav-v2.js） |
| warning | **Mixed Content**：HTTPS 页面请求了 http:// 不安全元素 |
| verbose | DOM 输入框建议增加 autocomplete 属性（如 `current-password`） |

### 8.2 可访问性审计（axe）

- 违规 1 项，severity = **critical**：
  - `meta-viewport` — `maximum-scale=1` 在移动端禁用了页面缩放
  - 违规元素：`<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`

### 8.3 JS 漏洞库

- `jsLibsVulns`：无已知漏洞（0 条）

### 8.4 布局偏移

- 单次偏移，时间 13,648ms，score 0.007998，位于 rect `[345,92,320,456]`（登录页元素定位引起的微小偏移）。

### 8.5 CPU 耗时 Top（主线程）

| 任务 | 耗时 |
| --- | ---: |
| EvaluateScript | 168 ms |
| v8.compile | 117 ms |
| Layout | 115 ms |
| UpdateLayoutTree | 16 ms |
| ParseAuthorStyleSheet | 14 ms |

### 8.6 原始请求时间线

| # | 开始 | 结束 | 耗时 | 状态 | 类型 | 下载大小 | URL |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 1 | 1 | 1913 | 1911 | 200 | Document | 1.6 KB | /project/list?appKey=mecha |
| 3 | 1064 | 4838 | 3498 | 200 | Script | 585 KB | /umi.6fc7066c.js |
| 9 | 1316 | 5263 | 803 | 200 | Script | 1.1 KB | /layouts__SecurityLayout.0f4ebd0c.async.js |
| 5 | 1923 | 3887 | 1711 | 200 | Script | 26 KB | /dist/public-nav-v2.js |
| 2 | 1929 | 2218 | 289 | 200 | Stylesheet | 11 KB | /umi.22abead7.css |
| 4 | 2223 | 3293 | 1070 | 200 | Script | 11 KB | /hm.js（百度统计） |
| 6 | 3311 | 3647 | 336 | 200 | Image | 43 B | /hm.gif（百度统计） |
| 7 | 4984 | 5309 | 325 | 200 | Stylesheet | 71 KB | /vendors.36c6a22c.chunk.css |
| 8 | 4987 | 7345 | 2358 | 200 | Script | 2.64 MB | /vendors.42aef419.async.js |
| 11 | 5007 | 6529 | 1269 | 200 | Image | 1.8 KB | /cn/images/logo.png |
| 10 | 5012 | 6170 | 1157 | 200 | Image | 7 KB | /testplus/cn/images/帮助.png |
| 12 | 7476 | 7762 | 286 | 200 | Stylesheet | 0.8 KB | /layouts__UserLayout.c8709276.chunk.css |
| 13 | 7476 | 7785 | 309 | 200 | Script | 1.2 KB | /layouts__UserLayout.695ee880.async.js |
| 14 | 7832 | 8136 | 304 | 200 | Script | 0.7 KB | /p__user__login__NoLogin.603d9c93.async.js |
| 15 | 7834 | 9575 | 1740 | 200 | Image | 2.5 KB | /zos/rmsportal/TVYTbAXWheQpRcWDaDMu.svg（LCP） |
| 16 | 9586 | 9896 | 310 | 200 | Other | 10 KB | /favicon.png |
| 17 | 10142 | 11608 | 1466 | 200 | Document | 9 KB | /login?redirect_url=…（SSO 登录页） |
| 18 | 11617 | 11960 | 343 | 200 | 其他 | 43 B | /hm.gif |
| 19 | 11626 | 11904 | 278 | 200 | Stylesheet | 6.7 KB | /static/css/font-awesome.min.css |
| 22 | 11627 | 13528 | 1901 | 200 | Image | 1.8 KB | /static/images/logo-black.png |
| 20 | 11904 | 12691 | 787 | 200 | Stylesheet | 90 KB | /static/css/testplus-admin.min.css |
| 21 | 12692 | 13004 | 312 | 200 | Script | 40 KB | /static/js/jquery.min.js |
| 23 | 13537 | 13792 | 255 | 302 | 其他 | 0 B | /favicon.ico → /login |
| 24 | 13794 | 14056 | 262 | 200 | Other | 9 KB | /login |

---

*报告生成时间：2026-08-04 · 数据来源：`260804_instant_18b60f46bacf413d931360272473c07a.json`*
