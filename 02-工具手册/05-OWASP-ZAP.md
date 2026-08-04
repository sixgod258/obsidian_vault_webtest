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

```bash
docker pull ghcr.io/zaproxy/zaproxy:stable
```

### 方式 B：桌面版（图形界面，学习用）

1. 下载：<https://www.zaproxy.org/download/>（选 Windows 安装包）
2. 双击安装，需 JDK 17+（<https://adoptium.net/>）
3. 首次启动会引导设置，默认即可

## 6. 基本用法

### 6.1 基线扫描（Docker 推荐，安全、CI 友好）

对本地靶场 Juice Shop 做被动基线扫描：

```bash
# 在当前目录生成报告（Windows 用 %cd% 或手动写路径）
docker run --rm -v $(pwd):/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://localhost:3000 \
  -m 2 \
  -r zap-report.html \
  -J zap-report.json
```

> `$(pwd)` 是 Git Bash 语法；PowerShell 用 `$(Get-Location)` 或直接写 `-v D:/obsi_for_webtest/03-测试记录:/zap/wrk/:rw`。

### 6.2 常用参数

| 参数 | 说明 |
|---|---|
| `-t <url>` | 目标地址 |
| `-m <分钟>` | Spider 爬取时长（默认 1，CI 常用 5） |
| `-r <文件>` | 输出 HTML 报告 |
| `-J <文件>` | 输出 JSON 报告 |
| `-x <文件>` | 输出 XML 报告 |
| `-j` | 用 AJAX Spider（适合 JS 富应用） |
| `-a` | 包含 Alpha 级被动规则（更多噪音） |
| `-I` | 只在高危告警时失败（不因警告失败） |
| `-c <配置>` | 失败/警告阈值配置文件 |

> 主动扫描请用同镜像内置的 `zap-full-scan.py`（**绝不对生产环境使用**）。

### 6.3 桌面版基本流程

1. 打开 ZAP → 快速启动输入目标 URL → **Attack**
2. 左侧查看 **Site Tree**（爬到的 URL）、**Alerts**（告警）
3. 右键告警 → 查看详情（请求/响应/修复建议）
4. 顶部 **Report** → Generate Report → 导出 HTML

## 7. 输出解读

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

## 8. 测试记录模板

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

## 9. 参考链接
- 官网：<https://www.zaproxy.org/>
- Docker 使用：<https://www.zaproxy.org/docs/docker/>
- 下载：<https://www.zaproxy.org/download/>
- GitHub：<https://github.com/zaproxy/zaproxy>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[06-Nikto]]（服务器层面互补）· [[01-Lighthouse]]（不含安全项）
