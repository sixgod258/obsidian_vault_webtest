---
tags:
  - 测试记录
  - Playwright实现
  - ZAP
  - 安全
---

# OWASP ZAP 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[05-OWASP-ZAP]] 的核心功能：被动安全扫描（安全头 / Cookie / 信息泄露）+ 基础注入探测。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | 浏览器真实流量旁路观察（等价被动扫描）+ request API 探测 |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/07-zap.js` |
| 靶标 | Juice Shop `http://localhost:3000` |
| 合规 | 本地授权靶场 |

## 1. 实现方法（怎么做）

ZAP 被动扫描 = **观察真实流量（代理/浏览器），对每个响应检查安全配置**；主动扫描则发送攻击载荷。Playwright 实现两层：

**被动层**（页面加载时 `page.on('response')` 捕获全部响应）：
- 响应安全头：`X-Frame-Options` / `Content-Security-Policy` / `X-Content-Type-Options` / `HSTS` / `Referrer-Policy` / `Permissions-Policy` / `COOP`
- Cookie 属性：`HttpOnly` / `Secure` / `SameSite`
- 信息泄露：`Server` / `X-Powered-By` 头

**主动-精简层**（ZAP Active Scan 的缩减版）：
- 反射 XSS：向搜索接口注入 `<script>` 载荷，检查是否原样回显
- SQLi：单引号探测，检查是否触发服务端错误 / SQL 特征

```js
// 被动层核心（07-zap.js）
page.on('response', (r) => {
  const h = r.allHeaders();
  for (const [name, value] of Object.entries(h)) {
    if (name === 'set-cookie') { /* 检查 HttpOnly/Secure/SameSite */ }
  }
  if (h['server'] && /\d+\.\d+/.test(h['server'])) addAlert('low', 'Server 版本泄露', ...);
});
```

## 2. 测试结果

### 告警汇总（24 条）

| 等级 | 数量 | 说明 |
|---|---|---|
| **High** | 0 | — |
| **Medium** | 5 | 缺 CSP（×4）、缺 X-Frame-Options（×1） |
| **Low** | 17 | 缺 HSTS / Referrer-Policy / Permissions-Policy / COOP / X-Content-Type-Options |
| **Info** | 2 | XSS / SQLi 探测未命中 |
| Cookie 标志 | 0 | 本次会话未发现 Set-Cookie |

### Medium 告警明细

| 告警 | 影响的响应 |
|---|---|
| 缺少 Content-Security-Policy（防 XSS） | 首页 + 搜索 API + 产品 API + socket.io |
| 缺少 X-Frame-Options（防点击劫持） | socket.io 响应 |

### 主动探测结果

| 探测 | 结果 | 判定 |
|---|---|---|
| 反射 XSS（搜索参数注入） | payload 未原样回显 | ⚪ 未命中 |
| SQLi（单引号） | 返回 200，无 SQL 特征 | ⚪ 未命中 |

> 说明：Juice Shop 的搜索接口参数化处理了这些基础载荷（其真实漏洞在其他上下文，如 imageUrl 字段），说明**主动扫描需要成体系的攻击载荷库**才够深度——这正是 ZAP 的价值所在。

## 3. 关键洞察

- **安全头覆盖**：Juice Shop 几乎没设任何现代安全响应头（无 CSP / 无 XFO / 无 HSTS），这在被动扫描下"一目了然"，是 SPA 应用的普遍现状。
- **被动 vs 主动**：被动层（安全头/Cookie/信息泄露）用 Playwright 实现**非常轻松且有效**；主动层只能做"探测式"的浅扫描，**无法企及 ZAP 的载荷深度**（数百条规则、编码绕过、WAF 绕过策略）。
- Cookie 未检出是因为本次会话未登录——**登录态扫描**可用 Playwright 先登录再扫（原工具需要配置认证上下文，Playwright 反而更简单）。

## 4. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| 被动扫描（头/Cookie/泄露） | ✅ | ✅ | **90%** |
| 告警分级 | ✅ | ✅ 自定义分级 | 100% |
| Spider 爬取 | ✅ | ✅ crawlSite | 100% |
| 主动扫描（XSS/SQLi 载荷库） | ✅ 数百规则 | ⚠️ 仅基础探测 | **弱** |
| AJAX/客户端爬虫 | 需配置 | ✅ 原生支持 JS 渲染 | **更优** |
| 认证扫描 | 需配置上下文 | ✅ 先登录再扫 | **更优** |

## 5. 结论

- **被动安全扫描可基本实现**（安全头 + Cookie + 信息泄露），且认证扫描比 ZAP 配置更简单。
- **主动深度扫描不可替代**：ZAP 的价值在成体系的攻击载荷与误报研判，Playwright 实现只适合做"冒烟级"注入探测。
- 定位建议：Playwright 实现做**日常 CI 安全冒烟**（被动扫描 + 基础探测），深度上线前扫描仍用 ZAP 全量。

## 相关
- [[05-OWASP-ZAP]] · [[测试记录_2026-08-06_Playwright实现_Nikto_JuiceShop]]（服务器层互补）
- [[测试方法论]]（告警分级与误报研判）
