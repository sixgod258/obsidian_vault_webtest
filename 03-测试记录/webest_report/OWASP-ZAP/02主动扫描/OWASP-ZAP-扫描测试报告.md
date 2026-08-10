# OWASP ZAP 安全扫描测试报告

| 项目 | 内容 |
| --- | --- |
| 报告日期 | 2026-08-05 |
| 扫描工具 | OWASP ZAP |
| 工具版本 | 2.17.0 |
| 扫描时间 | 2026-08-05 06:45:35 (UTC) |
| 扫描目标 | http://host.docker.internal:3000 / https://host.docker.internal:3000 |
| 目标主机 | host.docker.internal |
| 目标端口 | 3000 |
| 数据来源 | zap-lite-report.json |

---

## 一、执行摘要

本次安全扫描对目标应用（`http://host.docker.internal:3000`）执行了主动扫描。共发现 **13 类** 安全问题，累计 **79 个** 告警实例，其中：

| 风险等级 | 告警数量 | 告警实例数 |
| --- | --- | --- |
| 🔴 高 (High) | 0 | 0 |
| 🟠 中 (Medium) | 4 | 42 |
| 🟡 低 (Low) | 5 | 21 |
| ⚪ 信息 (Informational) | 4 | 16 |
| **合计** | **13** | **79** |

**扫描结论：未发现高危漏洞，但存在 4 个中危问题（共 42 个实例），其中以“备份文件泄露”最为突出（31 个实例）。建议优先修复中危问题，特别是备份文件泄露与安全响应头配置缺失。**

---

## 二、扫描范围与概况

| 项目 | 数值 |
| --- | --- |
| HTTP 站点端点数 | 168 |
| HTTPS 站点端点数 | 1 |
| 2xx 响应占比 | 93% |
| 3xx 响应占比 | 1% |
| 4xx 响应占比 | 5%（超过低阈值） |
| 网络失败率 | 8%（超过低阈值） |
| 慢响应占比 | 17%（超过低阈值） |

> ⚠️ **重点关注**：网络失败率 8%、4xx 响应 5%、慢响应 17% 均超过了 ZAP 设定的“低”告警阈值；同时 ZAP 自身记录了 1342 条警告、1 条错误日志，建议结合 `zap.log` 排查目标服务稳定性与连通性问题。

---

## 三、告警汇总表

| # | 告警名称 | 风险 / 置信度 | 实例数 | 系统性 | CWE |
| --- | --- | --- | --- | --- | --- |
| 1 | 备份文件泄露 (Backup File Disclosure) | 中 / 中 | 31 | 否 | CWE-530 |
| 2 | 未设置内容安全策略 CSP 头 | 中 / 高 | 5 | 是 | CWE-693 |
| 3 | 跨域配置错误 (CORS) | 中 / 中 | 5 | 是 | CWE-264 |
| 4 | 仅 HTTP 站点 | 中 / 中 | 1 | 否 | CWE-311 |
| 5 | 缺少 Cross-Origin-Embedder-Policy 头 | 低 / 中 | 5 | 否 | CWE-693 |
| 6 | 缺少 Cross-Origin-Opener-Policy 头 | 低 / 中 | 5 | 否 | CWE-693 |
| 7 | 危险 JS 函数 | 低 / 低 | 1 | 否 | CWE-749 |
| 8 | 已弃用的 Feature-Policy 头 | 低 / 中 | 5 | 是 | CWE-16 |
| 9 | Unix 时间戳泄露 | 低 / 低 | 5 | 是 | CWE-497 |
| 10 | 现代 Web 应用（提示） | 信息 / 中 | 5 | 是 | — |
| 11 | 可存储且可缓存内容 | 信息 / 中 | 1 | 否 | CWE-524 |
| 12 | 可存储但不可缓存内容 | 信息 / 中 | 5 | 是 | CWE-524 |
| 13 | User Agent 模糊测试（提示） | 信息 / 中 | 5 | 是 | CWE-0 |

---

## 四、漏洞详情

### 🟠 中危漏洞

#### 4.1 备份文件泄露（Backup File Disclosure）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10095 |
| 风险 / 置信度 | 中 / 中 |
| 实例数 | **31** |
| CWE | CWE-530 (暴露未正确清理的敏感信息) |

**描述：** Web 服务器泄露了文件的备份副本。`/ftp/quarantine` 及其内容存在大量 `.bak`、`.zip`、`.tar`、`- Copy`、`~` 等形式的备份/副本，攻击者可借此获取不应公开的文件内容。

**典型受影响 URL：**
- `http://host.docker.internal:3000/ftp/quarantine.bak`
- `http://host.docker.internal:3000/ftp/quarantine.zip`
- `http://host.docker.internal:3000/ftp/quarantine - Copy`
- `http://host.docker.internal:3000/ftp/quarantinebackup/`
- 以及多个平台恶意软件样本文件备份（`juicy_malware_*.url` 等）

**修复建议：**
- 不要在 Web 服务器上就地编辑文件，避免生成 `- Copy`、`~`、`.bak` 等临时/备份文件；
- 彻底清除服务器上不必要的、隐藏的备份文件与残余文件；
- 部署时采用构建产物复制而非原地修改，并配置 Web 服务器目录访问权限。

**参考：** https://cwe.mitre.org/data/definitions/530.html

---

#### 4.2 未设置内容安全策略（CSP）响应头

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10038 |
| 风险 / 置信度 | 中 / **高** |
| 实例数 | 5（系统性） |
| CWE | CWE-693 (保护机制失败) |

**描述：** 服务器响应未设置 `Content-Security-Policy` 头。CSP 是抵御 XSS（跨站脚本）与数据注入攻击的关键防护层，缺失将明显增加页面被注入恶意脚本的风险。

**受影响 URL：**
- `http://host.docker.internal:3000`
- `http://host.docker.internal:3000/ftp`
- `http://host.docker.internal:3000/ftp/coupons_2013.md.bak`
- `http://host.docker.internal:3000/sitemap.xml`

**修复建议：** 在 Web 服务器 / 应用服务器 / 负载均衡器等统一配置 `Content-Security-Policy` 响应头，按业务实际声明允许加载的脚本、样式、图片等来源。

**参考：**
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

---

#### 4.3 跨域配置错误（CORS 配置过于宽松）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10098 |
| 风险 / 置信度 | 中 / 中 |
| 实例数 | 5（系统性） |
| CWE | CWE-264 (权限、特权与访问控制) |

**描述：** 服务器存在 CORS 配置错误，响应头包含 `Access-Control-Allow-Origin: *`，允许任意第三方域名发起跨域读取请求。虽然浏览器会限制已认证 API 的跨域读取，但仍可能造成未认证数据的跨域窃取，或绕过依赖 IP 白名单等弱防护手段的数据访问控制。

**受影响 URL：**
- `http://host.docker.internal:3000`
- `http://host.docker.internal:3000/assets/public/favicon_js.ico`
- `http://host.docker.internal:3000/robots.txt`
- `http://host.docker.internal:3000/sitemap.xml`

**修复建议：**
- 将 `Access-Control-Allow-Origin` 配置为更严格的受信任域名白名单（如显式域名列表）；
- 若无需跨域访问，应直接移除全部 CORS 响应头，由浏览器强制同源策略（SOP）；
- 确认敏感数据不以未认证方式（如 IP 白名单）对外暴露。

---

#### 4.4 仅 HTTP 站点（未启用 HTTPS）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10106 |
| 风险 / 置信度 | 中 / 中 |
| 实例数 | 1 |
| CWE | CWE-311 (敏感信息缺失加密) |

**描述：** 站点仅通过 HTTP 提供服务，ZAP 尝试通过 HTTPS 连接 `https://host.docker.internal:3000/ftp/` 失败。明文传输将导致数据在传输过程中可被窃听、篡改。

**修复建议：** 为 Web / 应用服务器配置 SSL/HTTPS，并启用 HTTP 到 HTTPS 的重定向与 HSTS。

**参考：**
- https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html
- https://letsencrypt.org/

---

### 🟡 低危漏洞

#### 4.5 缺少 Cross-Origin-Embedder-Policy（COEP）响应头

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 90004-2 |
| 风险 / 置信度 | 低 / 中 |
| 实例数 | 5 |
| CWE | CWE-693 |

**描述：** 未设置 `Cross-Origin-Embedder-Policy` 头，页面可加载未经 CORP/CORS 授权的跨域资源，存在一定的资源泄露风险。

**受影响 URL：** 站点根路径、`/ftp`、`/sitemap.xml`、`/juice-shop/build/routes/fileServer.js:69:18` 等。

**修复建议：** 为文档响应设置 `Cross-Origin-Embedder-Policy: require-corp`，并确保浏览器兼容性。

---

#### 4.6 缺少 Cross-Origin-Opener-Policy（COOP）响应头

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 90004-3 |
| 风险 / 置信度 | 低 / 中 |
| 实例数 | 5 |
| CWE | CWE-693 |

**描述：** 未设置 `Cross-Origin-Opener-Policy` 头，当前文档可能与其他不可信文档共享浏览上下文，存在数据泄露风险。

**受影响 URL：** 与 4.5 相同的一组端点。

**修复建议：** 为文档设置 `Cross-Origin-Opener-Policy: same-origin`（避免使用较不安全的 `same-origin-allow-popups`）。

---

#### 4.7 危险 JS 函数（Dangerous JavaScript Functions）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10110 |
| 风险 / 置信度 | 低 / 低 |
| 实例数 | 1 |
| CWE | CWE-749 (暴露危险的方法或函数) |

**描述：** 前端脚本中使用了危险函数。`http://host.docker.internal:3000/main.js` 中检测到 `bypassSecurityTrustHtml(` 的调用（Angular 安全护栏绕过函数），若处理不可信输入，可能引入 XSS 风险。

**修复建议：** 审查 `main.js` 中该函数的使用场景，避免对不可信输入调用 `bypassSecurityTrustHtml`，尽量使用 Angular 内置的安全绑定。

**参考：** https://v17.angular.io/guide/security

---

#### 4.8 已弃用的 Feature-Policy 响应头

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10063-2 |
| 风险 / 置信度 | 低 / 中 |
| 实例数 | 5（系统性） |
| CWE | CWE-16 (配置) |

**描述：** 服务器使用了已弃用的 `Feature-Policy` 头，应替换为 `Permissions-Policy`。

**受影响 URL：** 站点根路径、`/sitemap.xml`、`/chunk-5K74DZ2F.js`、`/chunk-VS3A3LTT.js` 等。

**修复建议：** 将 `Feature-Policy` 替换为 `Permissions-Policy` 响应头。

---

#### 4.9 Unix 时间戳泄露（Timestamp Disclosure）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10096 |
| 风险 / 置信度 | 低 / 低 |
| 实例数 | 5（系统性） |
| CWE | CWE-497 (敏感信息暴露给未授权参与者) |

**描述：** 响应中泄露了 Unix 时间戳（如 `1666666667` / `1839622642`），可能暴露文件生成或构建时间等环境信息，便于攻击者推断部署规律。

**修复建议：** 人工确认这些时间戳数据是否敏感、是否可通过聚合分析出可利用模式；如无必要应避免在响应中暴露。

---

### ⚪ 信息级提示

#### 4.10 现代 Web 应用（Modern Web Application）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10109 |
| 风险 / 置信度 | 信息 / 中 |
| 实例数 | 5（系统性） |

**描述：** 应用为现代 Web 应用（页面含脚本但无传统链接），标准 Spider 可能无法完整遍历，建议使用 ZAP 的 Client Spider 进行后续自动探索。

#### 4.11 可存储且可缓存内容（Storable and Cacheable Content）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10049-3 |
| 风险 / 置信度 | 信息 / 中 |
| 实例数 | 1 |
| CWE | CWE-524 |

**描述：** `http://host.docker.internal:3000/robots.txt` 响应可被代理等共享缓存组件直接存储并按 1 年有效期命中，若缓存了敏感/用户相关数据则可能造成泄露。

**修复建议：** 对含敏感内容的响应配置 `Cache-Control: no-cache, no-store, must-revalidate, private`、`Pragma: no-cache`、`Expires: 0`。

#### 4.12 可存储但不可缓存内容（Storable but Non-Cacheable Content）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10049-2 |
| 风险 / 置信度 | 信息 / 中 |
| 实例数 | 5（系统性） |
| CWE | CWE-524 |

**描述：** 部分响应（`max-age=0`）可被缓存组件存储，但会在上游重新验证后再返回。影响面有限，注意确认其中不含敏感信息。

#### 4.13 User Agent 模糊测试（User Agent Fuzzer）

| 属性 | 值 |
| --- | --- |
| ZAP 插件 ID | 10104 |
| 风险 / 置信度 | 信息 / 中 |
| 实例数 | 5（系统性） |

**描述：** ZAP 使用不同 User-Agent（如老版本 IE）请求 `/assets`、`/assets/public` 等路径，用于检测是否存在针对不同 UA 的内容差异（如移动站、搜索引擎爬虫特殊处理），属于常规测试提示。

---

## 五、扫描洞察（Insights）

| 级别 | 原因 | 说明 | 统计值 |
| --- | --- | --- | --- |
| 低 | 警告 | ZAP 日志中存在警告 | 1342 |
| 低 | 超过低阈值 | 网络失败率超过阈值 | 8% |
| 低 | 警告 | ZAP 日志中存在错误 | 1 |
| 信息 | 超过低阈值 | 4xx 响应占比超过阈值 | 5% |
| 信息 | 超过低阈值 | 慢响应占比超过阈值 | 17% |
| 信息 | 提示 | 2xx 响应占比 | 93% |
| 信息 | 提示 | 3xx 响应占比 | 1% |

**洞察解读：**
- 8% 的网络请求失败、17% 的慢响应、1342 条 ZAP 警告，提示目标服务在扫描期间存在**性能与稳定性问题**（可能受扫描负载影响），建议排查应用与网络配置；
- 4xx 响应占 5%，多为目录不存在等正常 404，建议结合应用日志确认是否存在异常路径探测。

---

## 六、修复优先级建议

| 优先级 | 处理事项 | 对应告警 |
| --- | --- | --- |
| P1 高 | 清理 `/ftp/quarantine*` 目录下所有备份/副本文件，防止文件内容泄露 | 4.1 备份文件泄露 |
| P1 高 | 移除或收紧 `Access-Control-Allow-Origin: *`，配置域名白名单 | 4.3 CORS 跨域配置错误 |
| P2 中 | 统一配置 CSP、COEP、COOP、Permissions-Policy 等安全响应头 | 4.2 / 4.5 / 4.6 / 4.8 |
| P2 中 | 全站启用 HTTPS 并配置 HSTS，杜绝明文传输 | 4.4 仅 HTTP 站点 |
| P3 低 | 审查并移除 `main.js` 中危险的 `bypassSecurityTrustHtml` 调用 | 4.7 危险 JS 函数 |
| P3 低 | 确认并去除响应中的时间戳等环境信息 | 4.9 时间戳泄露 |
| P3 低 | 按内容敏感性配置合理的缓存响应头 | 4.11 / 4.12 |
| P4 建议 | 排查扫描期间网络失败、慢响应与 ZAP 警告日志，确认服务稳定性 | 扫描洞察 |

---

## 七、附录

### 7.1 风险等级说明

| 等级 | 风险码 | 含义 |
| --- | --- | --- |
| High | 3 | 高危：存在严重可利用漏洞，需立即处理 |
| Medium | 2 | 中危：存在可利用风险，应尽快修复 |
| Low | 1 | 低危：安全加固类问题，建议限期整改 |
| Informational | 0 | 信息级：仅供参考，通常无需改动 |

### 7.2 相关资源

- OWASP Zed Attack Proxy (ZAP)：https://www.zaproxy.org/
- OWASP Web Security Testing Guide：https://owasp.org/www-project-web-security-testing-guide/
- CWE 目录：https://cwe.mitre.org/

### 7.3 数据来源

本报告由 `zap-lite-report.json`（ZAP 2.17.0 生成，扫描时间 2026-08-05 06:45:35 UTC）分析生成。
