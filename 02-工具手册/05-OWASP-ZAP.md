---
tags:
  - 工具手册
  - 安全
---
# 🛡️ 05 · OWASP ZAP

## 1. 工具简介

OWASP ZAP（Zed Attack Proxy）是 OWASP 官方开源（Apache-2.0）的**Web 应用安全扫描器（DAST）**，集代理、爬虫、被动/主动扫描、模糊测试于一身，是安全测试的事实标准之一。既能图形化操作，也能命令行（Docker）跑自动化基线扫描，适合接入 CI。

> ⚠️ **合规**：只对你有权测试的目标使用。本仓库配套靶场见 [[测试靶标搭建]]（Juice Shop / DVWA）。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 代理拦截 | 浏览器走 ZAP 代理，观察/修改请求 |
| Spider 爬虫 | 自动发现站点 URL |
| 被动扫描 | 观察流量分析漏洞，安全、适合生产 |
| 主动扫描 | 发送攻击载荷，找 XSS/SQLi 等（**慎用**） |
| 告警分级 | Critical / High / Medium / Low / Informational |
| 报告导出 | HTML/JSON/XML 报告 |
| 自动化 | `zap-baseline.py` / `zap-full-scan.py` 供 CI 使用 |

**适用场景**：上线前安全扫描、持续安全回归、配合 [[06-Nikto]] 做服务器基线。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| 功能全面，社区巨大 | 主动扫描较慢，误报需要研判 |
| 桌面版可视化友好 | 上手门槛高（学习成本 ★★★★） |
| Docker/CLI 可自动化 | 爬取 JS 富应用需配置 AJAX Spider |
| 免费开源 | 大站点扫描耗资源 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | 跨平台；桌面版需 Java 17+，Docker 版免安装 |
| 许可证 | Apache-2.0，免费 |
| 依赖 | Docker（推荐方式）或 Java 17+ |
| 安装方式 | ① Docker 官方镜像 ② 桌面版安装包 |
| 资源占用 | 中–高（Java + 内存） |
| 学习成本 | ★★★★ |
| 与现有环境 | 本机 Docker 就绪，**Docker 方案零 Java 依赖** |

## 5. 安装指南

### 方式 A：Docker（本机推荐）

```powershell
docker pull ghcr.io/zaproxy/zaproxy:stable
```

### 方式 B：桌面版（图形界面，学习用）

1. 下载：<https://www.zaproxy.org/download/>（选 Windows 安装包）
2. 双击安装，需 JDK 17+（<https://adoptium.net/>）
3. 首次启动会引导设置，默认即可

## 6. 基本用法

### 6.1 基线扫描（Docker 推荐，安全、CI 友好）

对本地靶场 Juice Shop 做被动基线扫描：

```powershell
# 在当前目录生成报告（${PWD} = 当前工作目录；容器内访问宿主机靶场用 host.docker.internal）
docker run --rm -v "${PWD}:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -m 2 -r zap-report.html -J zap-report.json
```

> 💡 **要点**：`${PWD}` 自动替换为当前目录，也可直接写完整路径（如 `-v D:\webest_report\OWASP-ZAP:/zap/wrk/:rw`）。容器内访问宿主机靶场必须用 `host.docker.internal`（不能写 `localhost`）。容器以非 root 用户运行，若报告未生成，请确认输出目录对容器可写。

### 6.2 主动扫描（Active Scan，Docker）

主动扫描会向站点**发送攻击载荷**（SQL 注入、XSS、命令注入等测试用例），对发现的每个 URL 逐个探测，属于**深度安全测试**，能发现比基线扫描更深入的漏洞。

> ⚠️ **务必只对授权目标使用，绝不对生产环境扫描**——主动扫描会向目标发起真实攻击请求，可能触发 WAF 告警、写入日志、影响服务。本仓库配套靶场见 [[测试靶标搭建]]。

对本地靶场 Juice Shop 做全站主动扫描：

```powershell
# 主动全站扫描：输出 HTML + JSON 报告到当前目录
docker run --rm -v "${PWD}:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:3000 -m 2 -r zap-full-report.html -J zap-full-report.json
```

| 对比项 | 基线扫描 `zap-baseline.py` | 主动扫描 `zap-full-scan.py` |
|---|---|---|
| 攻击载荷 | 无（仅被动规则） | **有**（主动注入测试） |
| 发现能力 | 配置/响应头等基础问题 | SQLi、XSS 等深度漏洞 |
| 耗时 | 2–5 分钟 | 几分钟–数小时（看站点规模） |
| 适用环境 | 测试/预发布，相对安全 | **仅限授权测试环境** |

### 6.3 常用参数（已按本机 ZAP 2.17.0 镜像的 `-h` 校准）

> 三套脚本通用选项基本一致，以下为 full-scan 的完整列表（baseline / api 大同小异）。

| 参数 | 说明 |
|---|---|
| `-t <url>` | 目标地址（必填） |
| `-m <分钟>` | 爬虫时长：**full-scan 默认无限制**会爬到完；**baseline 默认 1** |
| `-r <文件>` / `-J <文件>` / `-x <文件>` | 输出 HTML / JSON / XML 报告 |
| `-c <配置>` | 配置文件，把告警设为 INFO / IGNORE / FAIL |
| `-u <url>` | 从远程 URL 获取配置文件 |
| `-g <文件>` | 生成默认配置文件（全部规则 WARN）供编辑 |
| `-a` | 加入 alpha 规则：**full-scan=主动+被动**，baseline=仅被动 |
| `-I` | 有警告时不返回失败（仅高危才失败），**三套脚本都支持** |
| `-l <级别>` | 最低显示级别：PASS / IGNORE / INFO / WARN / FAIL |
| `-s` | 短输出（隐藏 PASS 和示例 URL） |
| `-d` | 调试信息 |
| `-D <秒>` | 等待被动扫描完成的延迟秒数 |
| `-P` | 指定监听端口（把 ZAP 当拦截代理用） |
| `-j` | 额外启用现代/Ajax 爬虫（**较重**，轻量化时别加） |
| `-T <分钟>` | 等待 ZAP 启动 + 被动扫描的最大分钟数 |
| `-n <上下文>` / `-U <用户>` | 认证扫描（需上下文文件） |
| `-p <文件>` | 进度文件（标记已处理的问题） |
| `-z "<zap选项>"` | 透传 ZAP 命令行选项，如 `-z "-config aaa=bbb"` |

> full-scan 另有 `--ajax-spider / --client-spider`（配合 `-j` 选爬虫）；api-scan 独有 `-f / -S / -O / --schema`。用具体脚本前先跑 `<脚本名>.py -h` 确认。

### 6.4 桌面版基本流程

1. 打开 ZAP → 快速启动输入目标 URL → **Attack**（默认跑基线扫描）
2. **主动扫描**：左侧 **Site Tree** 右键站点 → **Attack** → **Active Scan** → 勾选扫描策略 → 启动
3. 左侧查看 **Site Tree**（爬到的 URL）、**Alerts**（告警）
4. 右键告警 → 查看详情（请求/响应/修复建议）
5. 顶部 **Report** → Generate Report → 导出 HTML

### 6.5 主动扫描轻量化调优（资源紧张时用）

主动扫描是资源大户（也是 [[05-OWASP-ZAP#7.2 Docker 引擎挂起（主动扫描的常见诱因）|引擎挂起]] 的诱因），几个参数能明显减负，按效果从大到小：

| 手段 | 参数 | 说明 |
|---|---|---|
| **缩小目标** | `-t http://host.docker.internal:3000/<具体路径>` | 只扫某个子目录/接口，请求数骤降，最有效 |
| **降低并发** | `-z "-config ascan.threadPerHost=1 -config spider.threads=2 -config pscan.threads=2"` | 降低多线程压力，CPU/内存明显下降 |
| **禁用重规则** | `-z "-config rules.<规则ID>.level=OFF"` | 关掉最耗资源的规则，如 SQL 注入 `rules.40018.level=OFF` |
| **缩短爬虫** | `-m 1` | full-scan 默认**无限制**会爬到完，设 `-m 1` 显著减时（baseline 默认就是 1） |
| **硬性限爬取** | `-z "-config spider.maxDuration=1"` | 爬虫**硬上限** 1 分钟（比 `-m` 更强制，到点即停） |
| **容器资源限额** | `docker run --memory 1g --cpus 1 ...` | 从容器层限制内存/CPU，ZAP 会自动按限额调小 Java 堆（`--memory` 别低于 512m，避免 OOM） |
| **限结果/告警量** | `-z "-config ascan.maxResultsToList=100 -config ascan.maxAlertsPerRule=20"` | 限制单规则结果/告警数量，降内存与报告体积。⚠️ `maxAlertsPerRule` 在你 2.17.0 上疑似不生效，见下表后备注 |
| **批量降级规则** | `-g <配置> -c <配置>` | 先生成默认配置（全 WARN），把大部分规则改为 IGNORE/OFF，只留关心的规则评估 |
| **只用被动** | 换 `zap-baseline.py` | 完全不做主动攻击，最轻量。⚠️ full-scan **没有**禁主动扫描的开关（`-T` 是等待时长，不是安全模式） |

> ⚠️ **实测备注（2026-08-05 · ZAP 2.17.0）**：`ascan.maxAlertsPerRule=20` **未拦下** `Backup File Disclosure` 的 31 条告警——该键在实测中疑似不生效。验证方法：把值设成很小的数（如 `=3`）重跑，若仍有规则 count>3 即确认不生效。`ascan.maxResultsToList=100` 实测全部 ≤31 未超限，暂无法区分"自然少"还是"被截断"。

⚠️ 反过来要**避免**的：`-j`（AJAX Spider）会驱动真实浏览器爬取，比默认更重，轻量化时别加。

轻量化示例（只扫 `/rest` 子路径 + 降并发 + 禁用 SQLi 规则）：

```powershell
docker run --rm -v "${PWD}:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:3000/rest -m 1 -z "-config ascan.threadPerHost=1 -config spider.threads=2 -config pscan.threads=2 -config rules.40018.level=OFF" -r zap-lite-report.html -J zap-lite-report.json
```

**全栈最轻量组合**（上述手段叠加）：

```powershell
docker run --rm --memory 1g --cpus 1 -v "${PWD}:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:3000/rest -m 1 -z "-config ascan.threadPerHost=1 -config spider.threads=1 -config pscan.threads=1 -config spider.maxDuration=1 -config ascan.maxResultsToList=100 -config ascan.maxAlertsPerRule=20 -config rules.40018.level=OFF" -r zap-lite-report.html -J zap-lite-report.json
```

> 🔍 各脚本**完整参数**以 `docker run --rm ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -h` 的输出为准（会列出全部选项及默认值）。
> 💡 `-z "-config ..."` 里的键是 ZAP 配置层参数（不在 `-h` 里），如 `ascan.threadPerHost / spider.threads / pscan.threads / spider.maxDuration / ascan.maxResultsToList / ascan.maxAlertsPerRule / rules.<ID>.level`，均可用 `-z "-config 键=值"` 透传。

### 6.6 API 扫描（可选，需要接口定义）

用于扫描**纯 API 服务**（没有网页可爬），需要目标提供 OpenAPI / Swagger、SOAP 或 GraphQL 定义：

```powershell
# 以 OpenAPI 为例（<定义地址> 换成目标的 openapi.json 或本地文件）
docker run --rm -v "${PWD}:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py -t <openapi.json 地址> -f openapi -r zap-api-report.html -J zap-api-report.json
```

| 参数 | 说明 |
|---|---|
| `-f <format>` | 接口格式：`openapi` / `soap` / `graphql` |
| `-S` | **安全模式**（api-scan 独有）：跳过主动扫描，只做基线扫描 |
| `-O <host>` | 覆盖 OpenAPI 定义里的主机名（远程规范指向本地时用） |
| `--schema <url>` | GraphQL schema 地址 |

> 说明：Juice Shop 以网页为主，其 REST 接口已被全站扫描覆盖；当你的目标是纯 API 服务（且有接口定义）时才需要用本扫描。

## 7. 常见问题排查

### 7.1 容器内部连接失败：`Unable to connect to proxy` / `Connection reset by peer`

**现象**：扫描脚本报错，核心是：
```
HTTPConnectionPool(host='localhost', port=44794): Max retries exceeded with url: http://zap/JSON/ascan/... 
Caused by ProxyError('Unable to connect to proxy', ConnectionResetError(104, 'Connection reset by peer'))
```

**原因**：不是命令写错，是 **ZAP 守护进程没就绪或 Docker 引擎不稳定**，扫描脚本连不上容器内自己的 ZAP API。

**处理**：

```powershell
# 1. 先确认有没有残留的 ZAP 容器
docker ps -a

# 2. 有残留就删掉（<容器ID> 用上一步查到的）
docker rm -f <容器ID>

# 3. 先确认脚本实际支持的参数（版本不同选项有别），再重试
docker run --rm ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -h

# 4. 重试（不要自行加 -p/-T 等不确定选项，除非 -h 里确认过）
docker run --rm -v "${PWD}:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:3000 -m 2 -r zap-full-report.html -J zap-full-report.json
```

> 若刚启动就报错，可能是守护进程还在起，等几秒重试一次即可。

### 7.2 Docker 引擎挂起（主动扫描的常见诱因）

**现象**：Docker Desktop 面板显示 **0 CPUs / 0B 内存**、加载镜像列表报错；同时扫描脚本大量报连接重置。

**原因**：主动扫描很吃资源（Java 堆 ~2GB + Spider + 多线程攻击），机器上再叠加其他容器，把 **Docker 引擎（Linux 虚拟机）压垮挂起**。这通常是资源压力触发的，不是扫描本身"杀"了 Docker。

**恢复步骤**：

```powershell
# 1. 重启 Docker Desktop（托盘图标 → Quit → 重新打开）
# 2. 验证引擎恢复
docker ps
# 3. 重建靶场容器（Docker 重启后旧容器已消失）
docker run --rm -d -p 3000:3000 --name juice-shop bkimminich/juice-shop
# 4. 若系统内存紧张：Docker Desktop → Settings → Resources 调大内存
```

**预防**：

- 跑主动扫描前先停掉其他重容器：`docker stop <容器名>`（如你本机的其他容器）
- 常规巡检用**基线扫描** `zap-baseline.py`（无攻击载荷，更轻），主动扫描只在需要时开
- 主动扫描仅对授权靶场进行，必要时把 `-m 2` 减到 `-m 1` 缩短爬取

## 8. 输出解读

### 告警分级与处理优先级
| 等级 | 含义 | 处理 |
|---|---|---|
| **Critical/High** | 可被直接利用的高危漏洞（SQLi、RCE 等） | 立即人工验证并修复 |
| **Medium** | 有利用条件的安全问题 | 尽快处理 |
| **Low** | 信息类/低风险问题 | 排期修复 |
| **Informational** | 仅是信息 | 研判是否接受 |

### 常见告警示例
| 告警 | 说明 |
|---|---|
| SQL Injection | 输入可拼接 SQL，最高危之一 |
| Cross Site Scripting (XSS) | 未过滤输入回显 |
| Missing Anti-clickjacking Header | 缺少 X-Frame-Options |
| Content-Type Header Missing | 响应头缺 Content-Type |
| Directory Browsing | 目录列表未关闭 |

### 报告阅读
- HTML 报告按**告警等级排序**，先看红色（High）再逐级往下
- 每条告警含：URL、证据（请求/响应）、修复建议
- **误报注意**：高危项务必用浏览器/curl 手动复现一次再上报

## 9. 测试记录模板

```markdown
## ZAP 基线扫描记录
- 日期：____ ｜ 靶标：____ ｜ 扫描类型：baseline/full ｜ Spider 时长：__min
- 命令：____

### 告警统计
| 等级 | 数量 |
|---|---|
| Critical | |
| High | |
| Medium | |
| Low | |
| Informational | |

### 高危告警明细
| URL | 告警类型 | 证据摘要 | 是否误报 | 修复建议 |
|---|---|---|---|---|
| | | | | |

### 结论 / 遗留问题
- ____
```

## 10. 参考链接
- 官网：<https://www.zaproxy.org/>
- Docker 使用：<https://www.zaproxy.org/docs/docker/>
- 下载：<https://www.zaproxy.org/download/>
- GitHub：<https://github.com/zaproxy/zaproxy>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[06-Nikto]]（服务器层面互补）· [[01-Lighthouse]]（不含安全项）
