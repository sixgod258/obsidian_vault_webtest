# OWASP ZAP 网站安全测试报告

| 项目 | 内容 |
| --- | --- |
| 测试工具 | OWASP ZAP 2.17.0 (传统被动扫描基线) |
| 测试目标 | `http://host.docker.internal:3000` |
| 目标主机 / 端口 | host.docker.internal / 3000 (HTTP, 非 TLS) |
| 报告生成时间 | 2026-08-05 01:52:24 (UTC) |
| 扫描方式 | 爬虫 (Spider, 最长 2 分钟) + 被动扫描 (Passive Scan) |
| 应用特征 | 现代 Web 应用 (Angular SPA), 从路径及内容判断为 OWASP Juice Shop |

---

## 1. 测试概述

本次测试使用 OWASP ZAP 对目标站点执行了基于爬虫的**被动安全扫描**,未执行主动攻击测试(Active Scan)。被动扫描仅分析已获取的 HTTP 响应,因此发现的均为响应配置类与信息泄露类问题,不包含主动注入类验证。

扫描共发现 **10 类安全告警、42 个告警实例**,其中:

- **高风险 (High): 0**
- **中风险 (Medium): 2 类,共 10 个实例**
- **低风险 (Low): 5 类,共 21 个实例**
- **信息级 (Informational): 3 类,共 11 个实例**

整体来看,**未发现高危漏洞**;核心问题集中在**安全响应头配置缺失**与**CORS 跨域策略过于宽松**两个方面,属于常见且较易修复的配置类问题。

---

## 2. 测试结果汇总

### 2.1 风险等级分布

| 风险等级 | 告警类型数 | 实例数 | 占比 |
| --- | --- | --- | --- |
| 高风险 (High) | 0 | 0 | 0% |
| 中风险 (Medium) | 2 | 10 | 23.8% |
| 低风险 (Low) | 5 | 21 | 50.0% |
| 信息级 (Informational) | 3 | 11 | 26.2% |
| **合计** | **10** | **42** | 100% |

### 2.2 告警清单总览

| # | 告警名称 | 风险等级 | 置信度 | 实例数 | 是否系统性 | CWE |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Content Security Policy (CSP) Header Not Set | 中 | 高 | 5 | 是 | CWE-693 |
| 2 | Cross-Domain Misconfiguration (CORS) | 中 | 中 | 5 | 是 | CWE-264 |
| 3 | Cross-Origin-Embedder-Policy Header Missing | 低 | 中 | 5 | 是 | CWE-693 |
| 4 | Cross-Origin-Opener-Policy Header Missing | 低 | 中 | 5 | 是 | CWE-693 |
| 5 | Dangerous JS Functions | 低 | 低 | 1 | 否 | CWE-749 |
| 6 | Deprecated Feature Policy Header Set | 低 | 中 | 5 | 是 | CWE-16 |
| 7 | Timestamp Disclosure - Unix | 低 | 低 | 5 | 是 | CWE-497 |
| 8 | Modern Web Application | 信息 | 中 | 5 | 是 | — |
| 9 | Storable and Cacheable Content | 信息 | 中 | 1 | 否 | CWE-524 |
| 10 | Storable but Non-Cacheable Content | 信息 | 中 | 5 | 是 | CWE-524 |

### 2.3 站点基本信息 (Insights)

- 响应状态码:约 **95%** 为 2xx,约 **4%** 为 4xx
- 爬取端点总数:**135** 个,请求方法 **100%** 为 GET
- 内容类型分布:text/html **82%**、application/javascript **9%**、text/css **5%**、text/plain **5%**、image/x-icon **5%**、application/octet-stream **3%**、text/markdown **2%**
- 慢响应比例:约 **37%** (可作为性能参考)

---

## 3. 中风险问题详情

### 3.1 Content Security Policy (CSP) Header Not Set

- **风险等级 / 置信度:** 中 / 高
- **影响实例数:** 5 (系统性)
- **CWE:** CWE-693 (Protection Mechanism Failure)

**描述:**
服务器未在响应中设置 `Content-Security-Policy` 响应头。CSP 是抵御跨站脚本(XSS)与数据注入攻击的重要防线,可声明浏览器允许加载的合法内容来源(JavaScript、CSS、iframe、字体、图片、媒体等)。缺少该头意味着页面一旦存在 XSS 注入点,攻击者可自由加载任意第三方恶意资源。

**受影响 URL:**
- `http://host.docker.internal:3000/`
- `http://host.docker.internal:3000/ftp/encrypt.pyc`
- `http://host.docker.internal:3000/ftp/package-lock.json.bak`
- `http://host.docker.internal:3000/juice-shop/node_modules/express/lib/router/chunk-UNFVUBM2.js`
- `http://host.docker.internal:3000/sitemap.xml`

> **提示:** 上述 `/ftp/encrypt.pyc`、`/ftp/package-lock.json.bak` 等敏感文件可被直接访问,存在敏感信息(源码/备份/依赖清单)泄露风险,建议一并核实并限制 FTP 目录的公开访问权限。

**修复建议:**
在 Web 服务器 / 应用服务器 / 反向代理上为所有响应配置 CSP 响应头,例如:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'
```

**参考:**
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

---

### 3.2 Cross-Domain Misconfiguration (CORS)

- **风险等级 / 置信度:** 中 / 中
- **影响实例数:** 5 (系统性)
- **CWE:** CWE-264 (Permissions, Privileges, and Access Controls)

**描述:**
服务器配置了过宽的跨域资源共享(CORS)策略,响应头包含 `Access-Control-Allow-Origin: *`,允许**任意第三方域名**发起跨域读取请求。攻击者可利用该配置诱导受害者浏览器请求本域上的未认证接口并读取其返回数据。浏览器机制虽不允许第三方读取携带认证信息的接口响应,但仍可能泄露依赖 IP 白名单等其它访问控制的未认证敏感数据。

**受影响 URL(证据:`Access-Control-Allow-Origin: *`):**
- `http://host.docker.internal:3000/assets/public/favicon_js.ico`
- `http://host.docker.internal:3000/chunk-5K74DZ2F.js`
- `http://host.docker.internal:3000/chunk-QBYXNN7Z.js`
- `http://host.docker.internal:3000/robots.txt`
- `http://host.docker.internal:3000/styles.css`

**修复建议:**
1. 将 `Access-Control-Allow-Origin` 收紧为明确的受信任域名白名单,禁止使用通配符 `*`(尤其是携带凭证时);
2. 若接口无需跨域访问,应直接移除 CORS 响应头,由浏览器同源策略(SOP)提供限制;
3. 确保敏感数据不以未认证方式对外提供。

**参考:**
- https://vulncat.fortify.com/en/detail?category=HTML5&subcategory=Overly%20Permissive%20CORS%20Policy

---

## 4. 低风险问题详情

### 4.1 Cross-Origin-Embedder-Policy Header Missing or Invalid

- **风险等级 / 置信度:** 低 / 中 | **实例数:** 5 (系统性) | **CWE:** CWE-693

**描述:**
未设置 `Cross-Origin-Embedder-Policy` 响应头。该头可防止文档加载未显式授权(通过 CORP 或 CORS)的跨源资源,降低跨源数据泄露风险。

**受影响 URL:** `/`、`/ftp`、`/sitemap.xml` 等 5 处

**修复建议:**
为文档响应设置 `Cross-Origin-Embedder-Policy: require-corp`。

**参考:**
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy

---

### 4.2 Cross-Origin-Opener-Policy Header Missing or Invalid

- **风险等级 / 置信度:** 低 / 中 | **实例数:** 5 (系统性) | **CWE:** CWE-693

**描述:**
未设置 `Cross-Origin-Opener-Policy` 响应头。若文档与不受信任的跨源页面共享浏览上下文,可能导致数据泄露。

**受影响 URL:** `/`、`/ftp`、`/sitemap.xml` 等 5 处

**修复建议:**
为文档响应设置 `Cross-Origin-Opener-Policy: same-origin`;`same-origin-allow-popups` 安全性较弱,应避免使用。

**参考:**
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy

---

### 4.3 Dangerous JS Functions

- **风险等级 / 置信度:** 低 / 低 | **实例数:** 1 (非系统性) | **CWE:** CWE-749 (Exposed Dangerous Method or Function)

**描述:**
前端代码 `/main.js` 中调用了 Angular 的危险函数 `bypassSecurityTrustHtml(`。该函数会绕过 Angular 内置的 HTML 消毒机制,若被绑定到不受信任的输入,可能引入 XSS 风险。**注:** 若该用法针对的是经严格校验的受信内容(如静态模板或服务端清理后的数据),则风险可控,但需人工确认。

**受影响 URL:**
- `http://host.docker.internal:3000/main.js`(证据:`bypassSecurityTrustHtml(`)

**修复建议:**
- 尽量避免使用 `bypassSecurityTrustHtml` 等信任绕过函数;
- 如确需使用,确保传入内容经过严格的白名单校验与消毒,且不包含用户可控输入。

**参考:**
- https://v17.angular.io/guide/security

---

### 4.4 Deprecated Feature Policy Header Set

- **风险等级 / 置信度:** 低 / 中 | **实例数:** 5 (系统性) | **CWE:** CWE-16 (Configuration)

**描述:**
站点仍在使用已废弃的 `Feature-Policy` 响应头(证据:`Feature-Policy`)。该头已被重命名为 `Permissions-Policy`,旧头在主流浏览器中将被忽略,浏览器权限控制可能失效。

**受影响 URL:** `/`、`/chunk-5K74DZ2F.js`、`/chunk-PX7UKXVL.js`、`/chunk-QBYXNN7Z.js`、`/sitemap.xml`

**修复建议:**
将 `Feature-Policy` 迁移为 `Permissions-Policy` 头并调整对应指令语法。

**参考:**
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy

---

### 4.5 Timestamp Disclosure - Unix

- **风险等级 / 置信度:** 低 / 低 | **实例数:** 5 (系统性) | **CWE:** CWE-497 (Exposure of Sensitive System Information)

**描述:**
在 `/styles.css` 中披露了 Unix 时间戳,例如 `1528301887`(2018-06-06)、`1578947368`(2020-01-13)、`1602209945`(2020-10-09)、`1636363636`(2021-11-08)、`1818181818`(2027-08-13)。此类时间戳多为版本号或缓存标记,一般不会造成直接威胁,但可能被用于推断系统构建时间或聚合分析。

**受影响 URL:**
- `http://host.docker.internal:3000/styles.css`(5 个实例)

**修复建议:**
人工确认这些时间戳不包含敏感信息,且无法被聚合利用。

---

## 5. 信息级问题

### 5.1 Modern Web Application

- **信息级 / 中置信度 | 实例数:** 5 (系统性)

应用为现代 SPA(含大量脚本、无直接链接),标准爬虫覆盖有限。提示若需自动化探索可选用 ZAP 的 **Client Spider**(基于浏览器)以获得更完整的覆盖。

### 5.2 Storable and Cacheable Content

- **信息级 / 中置信度 | 实例数:** 1 (非系统性) | **CWE:** CWE-524

`/robots.txt` 响应缺少显式缓存指令,按 RFC 7234 启发式策略可能被缓存约 1 年。由于内容非敏感,风险较低。

### 5.3 Storable but Non-Cacheable Content

- **信息级 / 中置信度 | 实例数:** 5 (系统性) | **CWE:** CWE-524

`/`、`/assets/public/favicon_js.ico`、`/chunk-5K74DZ2F.js`、`/chunk-QBYXNN7Z.js`、`/sitemap.xml` 的响应设置了 `Cache-Control: max-age=0`,内容可存储但每次需回源校验,行为安全。若个别响应含用户特定数据,建议补充 `no-store`。

---

## 6. 安全测试记录

| 字段 | 值 |
| --- | --- |
| 告警类型总数 | 10 |
| 告警实例总数 | 42 |
| 爬取端点总数 | 135 |
| 中危实例数 | 10 |
| 低危实例数 | 21 |
| 信息级实例数 | 11 |
| 高风险实例数 | 0 |
| 扫描时间 | 2026-08-05 01:52:24 (UTC) |

---

## 7. 结论与建议

### 7.1 结论

本次被动安全扫描**未发现高危(High)漏洞**,目标站点不存在直接的严重注入类问题,安全性总体处于**中等偏上**水平。主要风险集中在**安全响应头的缺失/配置不当**与 **CORS 策略过于宽松**两类配置缺陷上,修复成本低、见效快。

### 7.2 修复优先级建议

| 优先级 | 事项 | 对应告警 |
| --- | --- | --- |
| **P0(高)** | 收紧 CORS 策略,移除 `Access-Control-Allow-Origin: *` | 3.2 |
| **P0(高)** | 配置 `Content-Security-Policy` 响应头 | 3.1 |
| **P1(中)** | 限制 `/ftp/` 目录下敏感文件(`encrypt.pyc`、`package-lock.json.bak`)的公开访问 | 3.1 附带发现 |
| **P1(中)** | 配置 `Cross-Origin-Embedder-Policy` / `Cross-Origin-Opener-Policy` | 4.1 / 4.2 |
| **P2(低)** | 迁移 `Feature-Policy` → `Permissions-Policy`;人工复核 `bypassSecurityTrustHtml` 用法及时间戳 | 4.3 / 4.4 / 4.5 |

### 7.3 后续建议

1. **启用主动扫描:** 本次仅执行被动扫描,建议在授权范围内对关键接口启用主动扫描(Active Scan),覆盖 SQL 注入、XSS、SSRF 等注入类漏洞。
2. **使用 Client Spider:** 针对 SPA 应用,使用 ZAP Client Spider 完善动态内容覆盖。
3. **引入持续集成:** 将 ZAP Baseline 扫描接入 CI/CD 流水线,配合 `failOnError` 在出现高危告警时阻断发布。
4. **定期回归:** 修复上述配置问题后重新扫描,确认告警消除并防止回归。

---

*本报告由 OWASP ZAP 2.17.0 被动扫描结果自动整理生成,供安全评估参考。所有测试均针对授权目标进行。*
