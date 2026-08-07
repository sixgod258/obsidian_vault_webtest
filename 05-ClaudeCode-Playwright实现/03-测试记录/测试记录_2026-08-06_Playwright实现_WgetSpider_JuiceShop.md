---
tags:
  - 测试记录
  - Playwright实现
  - Wget-Spider
  - 链接
---

# Wget --spider 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[04-Wget-Spider]] 的核心功能：批量检查 URL 有效性。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | Node 脚本（Playwright request API，不渲染页面） |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/01-wget-spider.js` |
| 靶标 | Juice Shop `http://localhost:3000` |
| 浏览器 | 系统 Chrome（headless） |

## 1. 实现方法（怎么做）

`wget --spider` 的原理是：**对 URL 发 HTTP 请求，只看状态码不下载内容**。Playwright 的 `request API`（`context.request.get()`）做的是同一件事，且走与浏览器相同的网络栈。

```js
// 核心代码（01-wget-spider.js）
for (const u of URLS) {
  const resp = await reqCtx.get(u, { maxRedirects: 0, timeout: 8000 });
  status = resp.status();              // ← 就是 wget --spider 看到的 http_code
  redirect = resp.headers()['location'];
}
```

对比原工具命令：

| 原工具 | Playwright 实现 |
|---|---|
| `wget.exe --spider -r -l 2 URL` | 循环 `reqCtx.get(url, { maxRedirects: 0 })` |
| `curl.exe -w "%{http_code}" URL` | `resp.status()` |
| 批量检查 URL 列表 | `for...of` 遍历 URL 数组 |

## 2. 测试结果

### 汇总（20 个 URL）

| 指标 | 值 |
|---|---|
| 正常（2xx/3xx） | 18 |
| 错误（4xx/5xx） | **2** |
| 重定向（3xx） | 0 |
| 平均响应 | ~4 ms（本地直连） |

### 发现的 2 个"死链"（HTTP 500）

| URL | 状态 | 原因 |
|---|---|---|
| `/rest/products` | 500 | 该接口只接受 POST/特定调用，裸 GET 触发服务端 500 |
| `/rest/user/login` | 500 | 登录接口是 POST-only，GET 触发 500 |

> ⚠️ 这正是 `wget --spider` 语义下的"链接无效"——但它其实是**接口被错误方法访问**，不是页面死链。结论：批量状态码检查能快速暴露问题，但需人工研判。

### 关键洞察：SPA 的 catch-all 陷阱

`/nonexistent-page`、`/#/product/999`（不存在产品）都返回 **200**——因为 SPA 服务器对任意路径都返回 index.html。**在 SPA 上，"HTTP 200"不能证明页面真实存在**，`wget --spider` 与 Playwright request API 都有这个盲区；需要 JS 渲染后看内容（这正是 [[测试记录_2026-08-06_Playwright实现_LinkChecker_JuiceShop|LinkChecker 实现]] 里补充的做法）。

## 3. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| 单 URL 状态码检查 | ✅ | ✅ | **100%** |
| 批量 URL 检查 | 需脚本 | for 循环 | **100%** |
| 递归全站（`-r`） | ✅ | 见 LinkChecker 实现 | 可实现 |
| 认证请求 | `--user/--password` | `reqCtx` 带 header/state | 可实现 |
| 零安装轻量 | ✅ | 需 Node + Playwright | 略重 |

## 4. 结论

- **完全可实现**：链接有效性检查是 Playwright 最轻松的实现项，代码量最小。
- 与 wget 同等局限：不渲染 JS、SPA 下 200 不可信。
- 适合场景：CI 冒烟、批量 URL 巡检——与 wget/curl 互为等价方案，但 Playwright 能**额外**复用浏览器会话（Cookie/登录态）。

## 相关
- [[测试记录_2026-08-06_Playwright实现_LinkChecker_JuiceShop]] · [[04-Wget-Spider]] · [[测试方法论]]
