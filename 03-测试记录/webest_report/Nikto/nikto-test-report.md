# Nikto 安全测试报告

## 报告信息

| 项目 | 内容 |
| --- | --- |
| 测试工具 | Nikto（Web 服务器扫描器） |
| 测试目标 | http://host.docker.internal:3000 |
| 目标 IP | 192.168.65.254 |
| 目标端口 | 3000 |
| 数据来源 | `nikto-report.json` |
| 报告生成日期 | 2026-08-05 |
| 测试方式 | 无认证黑盒扫描 |

---

## 1. 测试概述

本次测试使用 Nikto 对目标主机 `host.docker.internal`（IP：`192.168.65.254`，端口：`3000`）进行 Web 服务安全扫描，共发现 **152 条** 告警记录。目标服务无 Banner 信息，结合请求特征判断，极可能为基于前端框架（存在 hash 路由 `#/jobs`）的 SPA 应用。

按 Nikto 漏洞 ID 分类统计如下：

| Nikto ID | 告警类型 | 数量 | 严重程度 |
| --- | --- | --- | --- |
| 740001 | 潜在备份 / 证书文件 | 140 | 低（疑似误报，待确认） |
| 013587 | 建议安全响应头缺失 | 4 | 中 |
| 999986 | 跨域资源共享（CORS）配置不当 | 1 | 中 |
| 999978 | X-Frame-Options 头已弃用 | 1 | 低 |
| 999100 | 非常规响应头（信息泄露） | 1 | 低 |
| 999997 | robots.txt 条目目录可访问 | 1 | 中 |
| 999996 | robots.txt 存在 | 1 | 低 |
| 001675 | 目录可访问 `/ftp/` | 1 | 低 |
| 001811 | 目录可访问 `/public/` | 1 | 低 |
| 002739 | `.htpasswd` 包含认证信息 | 1 | 高（待确认） |

---

## 2. 目标信息

| 属性 | 值 |
| --- | --- |
| 主机名 | host.docker.internal |
| IP 地址 | 192.168.65.254 |
| 端口 / 协议 | 3000 / HTTP |
| 服务 Banner | 无（未识别） |
| 应用特征 | 前端 SPA，使用 hash 路由（`x-recruiting: /#/jobs`） |

---

## 3. 测试结果摘要

### 3.1 严重程度分布

| 严重程度 | 数量 | 占比 |
| --- | --- | --- |
| 🔴 高危 | 1 | 0.7% |
| 🟠 中危 | 6 | 3.9% |
| 🟡 低危 / 信息 | 145 | 95.4% |
| **合计** | **152** | **100%** |

### 3.2 关键结论

- 未发现可直接利用的远程代码执行（RCE）、SQL 注入等严重漏洞。
- 最高风险点：`/.htpasswd` 疑似包含认证信息（待人工确认），以及 CORS 通配符配置。
- 140 条"备份/证书文件"告警高度疑似**误报**——SPA 应用通常对所有未匹配路由统一返回 `200`（回退到 `index.html`），导致 Nikto 判定所有探测路径"存在"，需人工复核确认。
- 服务端缺少多项安全响应头（CSP、HSTS 等），加固成本低，建议优先补齐。

---

## 4. 漏洞发现详情

### 4.1 高危（High）

#### 4.1.1 `/.htpasswd` 疑似包含认证信息

- **Nikto ID：** 002739
- **CWE：** CWE-200（信息泄露）
- **请求：** `GET /.htpasswd`
- **描述：** Nikto 探测到 `/.htpasswd` 路径返回了疑似包含授权信息的响应。若 `.htpasswd` 文件真实暴露，将泄露 Basic 认证凭据（用户名 + 密码哈希），攻击者可离线破解或直接利用该凭据。
- **⚠️ 注意：** 该告警需人工确认实际 HTTP 状态码与响应内容。若返回的是 SPA 回退页面（`200 + index.html`），则属于误报。
- **修复建议：**
  1. 立即人工访问 `http://host.docker.internal:3000/.htpasswd` 核实响应内容与状态码；
  2. 若确认泄露，删除该文件并轮换所有相关凭据；
  3. 禁止在 Web 根目录存放 `.htpasswd` 等认证文件，通过服务端配置文件（如 `location` 块）阻止访问；
  4. 若为误报（SPA 回退），在 WAF / 反向代理层对敏感路径（`.htpasswd`、`/.git`、备份文件等）返回 `404/403`。

---

### 4.2 中危（Medium）

#### 4.2.1 CORS 配置不当（`Access-Control-Allow-Origin: *`）

- **Nikto ID：** 999986
- **请求：** `GET /`
- **描述：** 服务端返回了 `Access-Control-Allow-Origin: *`（通配符）。任意来源的网页脚本均可跨域读取本服务的响应内容。若该服务承载登录态接口或敏感数据，攻击者可构造恶意网页窃取数据。
- **修复建议：**
  1. 将 `Access-Control-Allow-Origin` 收敛为受信任的固定来源列表（白名单）；
  2. 禁止使用通配符 `*`，尤其不得与 `Access-Control-Allow-Credentials: true` 同时使用；
  3. 如需通配，应通过服务端动态校验 `Origin` 请求头后回显具体来源。

#### 4.2.2 建议安全响应头缺失

- **Nikto ID：** 013587
- **请求：** `GET /`
- **描述：** 服务端响应缺少以下 4 个建议安全头：

| 缺失的安全头 | 作用 | 参考文档 |
| --- | --- | --- |
| `Content-Security-Policy` | 内容安全策略，缓解 XSS、数据注入 | [MDN - CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) |
| `Strict-Transport-Security` | 强制 HTTPS（HSTS），防止降级攻击 | [MDN - HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) |
| `Referrer-Policy` | 控制 `Referer` 泄露范围 | [MDN - Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy) |
| `Permissions-Policy` | 限制浏览器功能（摄像头、定位等） | [MDN - Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy) |

- **修复建议：**
  1. 添加 CSP 头并逐步收紧（先 `Content-Security-Policy-Report-Only` 观察，再正式启用）；
  2. 全站启用 HTTPS 后配置 HSTS；
  3. 配置 `Referrer-Policy: strict-origin-when-cross-origin`；
  4. 按需配置 `Permissions-Policy`。

#### 4.2.3 robots.txt 中 `/ftp/` 目录可访问

- **Nikto ID：** 999997
- **参考：** [PortSwigger KB - robots.txt](https://portswigger.net/kb/issues/00600600_robots-txt-file)
- **请求：** `GET /ftp/`
- **描述：** `/robots.txt` 中声明了条目 `/ftp/`（通常表示该路径不应被爬取/公开），但访问 `/ftp/` 返回 `200`（非禁止或重定向状态码），说明该目录处于可访问状态。
- **修复建议：**
  1. 确认 `/ftp/` 目录的实际用途，若无需公开访问，应配置为 `403/404`；
  2. robots.txt 本身并非访问控制手段，敏感资源须通过服务端权限控制保护；
  3. 若为 SPA 回退导致的 `200`，同 4.1.1 处理（代理层统一拦截敏感路径）。

---

### 4.3 低危 / 信息（Low / Info）

#### 4.3.1 潜在备份 / 证书文件（140 条，疑似误报）

- **Nikto ID：** 740001
- **CWE：** CWE-530（备份文件暴露）
- **参考：** [CWE-530](https://cwe.mitre.org/data/definitions/530.html)
- **请求：** 均为 `HEAD` 请求，探测了 14 个基础文件名 × 10 种扩展名，共 140 个路径，例如：

  | 基础文件名 | 扩展名 |
  | --- | --- |
  | `archive` `backup` `database` `docker` `dump` `host` `host.docker` `host.docker.internal` `host_docker_internal` `hostdocker` `hostdockerinternal` `internal` `site` `192.168.65.254` | `.alz` `.cer` `.egg` `.jks` `.pem` `.tar` `.tar.bz2` `.tar.lzma` `.tgz` `.war` |

- **分析：** 140 个探测路径"全部命中"这一特征与典型 SPA 应用行为高度吻合——SPA 前端服务器会对任意未匹配路由统一返回 `200`（回退 `index.html`），从而让 Nikto 将每个备份文件名探测都误判为"存在"。**因此本类告警大概率全部为误报**，但仍有小概率存在真实备份文件。
- **核实方法：**
  1. 随机抽样访问几个路径（如 `/backup.tar.bz2`、`/site.war`），确认响应内容是 SPA 首页 HTML 还是真实压缩包/证书文件；
  2. 查看响应 `Content-Type`（HTML 文本 vs `application/octet-stream`）与 `Content-Length`；
  3. 若确认为 SPA 回退，请在反向代理 / WAF 层对 `.tar`、`.war`、`.bak`、`.jks`、`.pem` 等备份扩展名统一返回 `404/403`。
- **修复建议：** 禁止在 Web 根目录存放任何备份、压缩包、证书或密钥文件；若为误报，按上述核实方法处理后可在后续扫描中加入白名单 / 排除规则。

#### 4.3.2 X-Frame-Options 头已弃用

- **Nikto ID：** 999978
- **参考：** [MDN - X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- **请求：** `GET /`
- **描述：** 服务端返回的 `X-Frame-Options` 头已被标准弃用，应改用 CSP 的 `frame-ancestors` 指令实现点击劫持防护。
- **修复建议：** 在 CSP 中配置 `frame-ancestors`，并逐步移除 `X-Frame-Options`（过渡期可两者并存）。

#### 4.3.3 非常规响应头 `x-recruiting`

- **Nikto ID：** 999100
- **请求：** `GET /`
- **描述：** 服务端返回了非常规响应头 `x-recruiting: /#/jobs`。该头泄露了应用内部"招聘"（jobs）页面的路由信息，可用于进一步的信息收集，说明该应用疑似为招聘类系统。
- **修复建议：** 评估该自定义头的必要性，如非必要（如内部调试用）建议移除；确需保留则评估其信息暴露面。

#### 4.3.4 robots.txt 存在

- **Nikto ID：** 999996
- **参考：** [MDN - Robots.txt](https://developer.mozilla.org/en-US/docs/Glossary/Robots.txt)
- **请求：** `GET /robots.txt`
- **描述：** 根目录存在 `/robots.txt`，包含 1 个条目（`/ftp/`），需人工查看内容以确认是否泄露敏感路径。
- **修复建议：** 人工检查 robots.txt 内容；注意 robots.txt 仅约束合规爬虫，不能作为访问控制手段。

#### 4.3.5 `/ftp/`、`/public/` 目录可访问

- **Nikto ID：** 001675（`/ftp/`）、001811（`/public/`）
- **请求：** `GET /ftp/`、`GET /public/`
- **描述：** `/ftp/` 与 `/public/` 目录返回了非禁止状态码（Nikto 判定"可能值得关注"），需确认是否存在目录列举或非预期文件暴露。
- **修复建议：** 确认目录内容与访问控制；若为 SPA 回退导致的 `200`，按 4.1.1 的代理层拦截方案处理；若存在目录列举，应关闭自动索引。

---

## 5. 风险分析

### 5.1 误报可能性评估

| 告警类别 | 误报可能性 | 依据 |
| --- | --- | --- |
| 备份/证书文件（740001，140 条） | **极高** | 探测路径"全部命中"，与 SPA 对未匹配路由统一返回 `200` 的行为一致 |
| `/.htpasswd`（002739） | 高 | 同 SPA 回退机制，Nikto 可能将回退响应误判为"含认证信息" |
| `/ftp/`、`/public/`（001675 / 001811 / 999997） | 中高 | 返回 `200` 与 SPA 回退特征吻合 |
| CORS `*`（999986） | 低 | 响应头为明确证据，需确认是否真实存在 |
| 缺失安全头（013587） | 低 | 响应头缺失为确定性事实 |

> **说明：** 由于目标高度疑似 SPA 应用（hash 路由 `#/jobs`），上述"目录 / 文件存在"类告警极可能由前端回退路由触发。**强烈建议人工抽样复核后再正式定级。**

### 5.2 影响面

- 若 `.htpasswd` 真实暴露 → 凭据泄露，影响高；
- 若 CORS `*` 存在于含鉴权接口的服务 → 跨域数据窃取，影响中高；
- 安全响应头缺失 → 增加 XSS、点击劫持、协议降级等攻击面，影响中。

---

## 6. 修复建议汇总

| 优先级 | 修复项 | 对应告警 |
| --- | --- | --- |
| P0 | 人工核实并处置 `/.htpasswd`，若泄露立即下线并轮换凭据 | 002739 |
| P1 | 收敛 CORS 白名单，禁止 `*` | 999986 |
| P1 | 补齐安全响应头：CSP、HSTS、Referrer-Policy、Permissions-Policy | 013587 |
| P1 | 敏感路径在代理/WAF 层统一拦截（`.htpasswd`、备份扩展名、`/ftp/`、`/public/`） | 002739 / 740001 / 001675 / 001811 |
| P2 | 移除或评估自定义头 `x-recruiting` | 999100 |
| P2 | CSP 改用 `frame-ancestors`，过渡期保留 `X-Frame-Options` | 999978 |
| P3 | 清理 robots.txt 中可访问的敏感条目；删除 Web 根目录备份文件 | 999996 / 999997 |

---

## 7. 附录

### 7.1 探测到的备份/证书文件路径清单（140 个）

以下路径均为 Nikto `HEAD` 探测命中项，**大概率属于 SPA 回退误报**，需抽样核实：

| 基础名 | 路径 |
| --- | --- |
| `archive` | `/archive.alz` `/archive.cer` `/archive.egg` `/archive.jks` `/archive.pem` `/archive.tar` `/archive.tar.bz2` `/archive.tar.lzma` `/archive.tgz` `/archive.war` |
| `backup` | `/backup.alz` `/backup.cer` `/backup.egg` `/backup.jks` `/backup.pem` `/backup.tar` `/backup.tar.bz2` `/backup.tar.lzma` `/backup.tgz` `/backup.war` |
| `database` | `/database.alz` `/database.cer` `/database.egg` `/database.jks` `/database.pem` `/database.tar` `/database.tar.bz2` `/database.tar.lzma` `/database.tgz` `/database.war` |
| `docker` | `/docker.alz` `/docker.cer` `/docker.egg` `/docker.jks` `/docker.pem` `/docker.tar` `/docker.tar.bz2` `/docker.tar.lzma` `/docker.tgz` `/docker.war` |
| `dump` | `/dump.alz` `/dump.cer` `/dump.egg` `/dump.jks` `/dump.pem` `/dump.tar` `/dump.tar.bz2` `/dump.tar.lzma` `/dump.tgz` `/dump.war` |
| `host` | `/host.alz` `/host.cer` `/host.egg` `/host.jks` `/host.pem` `/host.tar` `/host.tar.bz2` `/host.tar.lzma` `/host.tgz` `/host.war` |
| `host.docker` | `/host.docker.alz` `/host.docker.cer` `/host.docker.egg` `/host.docker.jks` `/host.docker.pem` `/host.docker.tar` `/host.docker.tar.bz2` `/host.docker.tar.lzma` `/host.docker.tgz` `/host.docker.war` |
| `host.docker.internal` | `/host.docker.internal.alz` `/host.docker.internal.cer` `/host.docker.internal.egg` `/host.docker.internal.jks` `/host.docker.internal.pem` `/host.docker.internal.tar` `/host.docker.internal.tar.bz2` `/host.docker.internal.tar.lzma` `/host.docker.internal.tgz` `/host.docker.internal.war` |
| `host_docker_internal` | `/host_docker_internal.alz` `/host_docker_internal.cer` `/host_docker_internal.egg` `/host_docker_internal.jks` `/host_docker_internal.pem` `/host_docker_internal.tar` `/host_docker_internal.tar.bz2` `/host_docker_internal.tar.lzma` `/host_docker_internal.tgz` `/host_docker_internal.war` |
| `hostdocker` | `/hostdocker.alz` `/hostdocker.cer` `/hostdocker.egg` `/hostdocker.jks` `/hostdocker.pem` `/hostdocker.tar` `/hostdocker.tar.bz2` `/hostdocker.tar.lzma` `/hostdocker.tgz` `/hostdocker.war` |
| `hostdockerinternal` | `/hostdockerinternal.alz` `/hostdockerinternal.cer` `/hostdockerinternal.egg` `/hostdockerinternal.jks` `/hostdockerinternal.pem` `/hostdockerinternal.tar` `/hostdockerinternal.tar.bz2` `/hostdockerinternal.tar.lzma` `/hostdockerinternal.tgz` `/hostdockerinternal.war` |
| `internal` | `/internal.alz` `/internal.cer` `/internal.egg` `/internal.jks` `/internal.pem` `/internal.tar` `/internal.tar.bz2` `/internal.tar.lzma` `/internal.tgz` `/internal.war` |
| `site` | `/site.alz` `/site.cer` `/site.egg` `/site.jks` `/site.pem` `/site.tar` `/site.tar.bz2` `/site.tar.lzma` `/site.tgz` `/site.war` |
| `192.168.65.254` | `/192.168.65.254.alz` `/192.168.65.254.cer` `/192.168.65.254.egg` `/192.168.65.254.jks` `/192.168.65.254.pem` `/192.168.65.254.tar` `/192.168.65.254.tar.bz2` `/192.168.65.254.tar.lzma` `/192.168.65.254.tgz` `/192.168.65.254.war` |

### 7.2 其他告警明细

| Nikto ID | 方法 | URL | 描述 |
| --- | --- | --- | --- |
| 999986 | GET | `/` | Retrieved access-control-allow-origin header: * |
| 999978 | GET | `/` | X-Frame-Options header is deprecated... |
| 999100 | GET | `/` | Uncommon header 'x-recruiting' found, contents: /#/jobs |
| 013587 | GET | `/` | Suggested security header missing: permissions-policy / referrer-policy / strict-transport-security / content-security-policy |
| 999997 | GET | `/ftp/` | robots.txt entry '/ftp/' returned 200 |
| 999996 | GET | `/robots.txt` | contains 1 entry |
| 001675 | GET | `/ftp/` | This might be interesting |
| 001811 | GET | `/public/` | This might be interesting |
| 002739 | GET | `/.htpasswd` | Contains authorization information |

---

*报告由 `nikto-report.json` 分析生成。建议复核结果后，使用 OWASP ZAP / Burp Suite 对确认的漏洞进行二次验证。*
