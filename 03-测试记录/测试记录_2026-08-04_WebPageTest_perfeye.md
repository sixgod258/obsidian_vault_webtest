---
tags:
  - 测试记录
  - WebPageTest
  - 性能
---

# WebPageTest 测试记录

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-04 |
| 工具 | WebPageTest（公共实例） |
| 靶标 URL | `https://perfeye.testplus.cn/project/list?appKey=mecha` |
| 靶标类型 | 公网站点（未登录） |
| 浏览器 | Chrome 148，移动端 400×266，延迟 2ms |
| 测试轮数 | 1 轮 |

## 1. 测试命令

```powershell
webpagetest testAndWait "https://perfeye.testplus.cn/project/list?appKey=mecha" -k <API_KEY> --browser Chrome --runs 1
```

## 2. 测试结果

> ⚠️ **重要前提**：测试最终渲染的是 **SSO 登录页**，而非目标页面——未登录时前端 JS 加载后跳转到 `https://sso.testplus.cn/login`。因此数据反映「目标 SPA 壳 + SSO 登录页」，不代表目标页真实性能。

### 2.1 核心指标

| 指标 | 值 | 评级 |
|---|---|---|
| TTFB | 1,912 ms | 🔴 差（服务端实际仅 ~291ms，连接开销 1.6s） |
| FCP | 13,221 ms | 🔴 差 |
| LCP | 9,819 ms | 🔴 差 |
| Speed Index | 13,146 ms | 🔴 差 |
| TBT | 143 ms | 🟢 优 |
| CLS | 0.008 | 🟢 优 |
| fullyLoaded | 14,056 ms | 🔴 差 |

### 2.2 关键瓶颈

| # | 严重度 | 问题 |
|---|---|---|
| 1 | 🔴 高 | **JS 打包过大**：`vendors.42aef419.async.js` 下载 2.64MB / 未压缩 **8.13MB**；JS 占下载量 89.5% |
| 2 | 🔴 高 | **静态资源无 Cache-Control**：缓存评分 8/100，每次访问都要重新下载 3.2MB |
| 3 | 🔴 高 | 未登录跳转 SSO，目标页指标失真 |
| 4 | 🟠 中 | 首屏白屏约 8s（下载+执行大 JS） |
| 5 | 🟠 中 | HTTP/1.1 未启用 HTTP/2；DNS 解析 1064ms |
| 6 | 🟠 中 | `maximum-scale=1` 禁缩放（axe critical） |
| 7 | 🟡 低 | Mixed Content、字体未加载、百度统计追踪等 |

## 3. 结论与建议

- **首屏优化核心是拆分 JS 大包**（目标首屏 JS < 500KB）+ **给带 hash 的静态资源加长缓存**（`max-age=31536000, immutable`）。
- 鉴权流程建议改为**服务端 302 跳转**，避免先下载 3.2MB JS 再客户端跳转。
- 启用 HTTP/2、静态资源走 CDN。
- ⚠️ 本次因未登录导致数据失真，**需登录态重新测试**才能反映目标页真实性能。
- 原始报告：`D:\webest_report\WebPageTest\WebPageTest分析报告_260804_instant.md` / `.html` / `.json`。

## 4. 附件
- 原始报告目录：`D:\webest_report\WebPageTest\`
- 参考：[[02-WebPageTest]] 手册 · [[01-Lighthouse]]（同目标页的评分）

## 相关
- [[测试记录模板]] · [[工具对比总表]]
