---
tags:
  - 工具手册
  - 链接
---
# 🔗 03 · LinkChecker

## 1. 工具简介

LinkChecker 是免费开源（GPL）的**网站链接检查工具**，递归爬取站点所有链接，检查是否死链（404）、重定向、超时等。支持多线程、robots.txt 遵守、HTTP 代理、多格式输出（Text/CSV/HTML/XML/SQL）。当前最新版 **10.6.0**（2025-07，需 Python 3.10+）。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 全站递归爬取 | 自动跟进站内所有链接 |
| 多种检查 | HTTP 状态、重定向、超时、SSL 证书 |
| 多线程 | 大站点也能较快扫完 |
| 外链可选 | `--check-extern` 控制是否检查外部链接 |
| 多格式报告 | CSV/HTML/XML 便于交给运维/开发 |
| 本地文件检查 | 也能检查本地 HTML 文件内的链接 |

**适用场景**：站点改版后全站死链扫描、内容更新后的链接质量巡检、上线前链接健康检查。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| 功能纯粹，专注死链检测 | 不涉及性能/安全/SEO 其他维度 |
| 报告格式多样 | 大站点爬取较慢（递归全站） |
| 免费开源，可脚本化 | Windows 原生安装需 WSL（官方推荐） |
| 遵守 robots.txt | 对外链检查需显式开启 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | 跨平台；**Windows 官方推荐用 WSL**；另有官方 Docker 镜像 |
| 许可证 | GPL，免费 |
| 依赖 | Python 3.10+ |
| 安装方式 | ① WSL 内 `pip install linkchecker`（官方推荐）② Docker ③ 原生 pip（非官方路径，可用但可能有兼容问题） |
| 资源占用 | 低–中（多线程） |
| 学习成本 | ★★☆，参数稍多 |
| 与现有环境 | 本机有 Python 3.14 和 Docker；**推荐 Docker 方案，零环境风险** |

## 5. 安装指南（任选其一）

### 方式 A：Docker（本机推荐，最省事）

```bash
# 官方镜像在 GitHub Packages
docker pull ghcr.io/linkchecker/linkchecker:latest
```

> 说明：Docker Hub 上的 `linkchecker/linkchecker` 已多年未更新，请用官方 `ghcr.io` 源。

### 方式 B：WSL（官方推荐的原生方式）

```bash
# 在 WSL 终端内执行
sudo apt update && sudo apt install -y python3-pip
pip3 install linkchecker
linkchecker --version
```

### 方式 C：原生 pip（Windows PowerShell，非官方路径，可用但可能遇兼容问题）

```powershell
pip install linkchecker
linkchecker --version
```

> 若报编码/兼容问题，请改用方式 A 或 B。

## 6. 基本用法

### 6.1 最简单用法（本地靶场 / 静态站）

```bash
# Docker 方式（注意 -u 避免权限问题；/mnt 为容器内工作目录）
docker run --rm -it -u $(id -u):$(id -g) \
  -v "$PWD":/mnt ghcr.io/linkchecker/linkchecker:latest \
  --verbose http://localhost:8888
```

### 6.2 原生/WSL 方式

```bash
# 检查本地静态站
linkchecker http://localhost:8888

# 检查外部站（含外链检查）
linkchecker --check-extern https://example.com

# 输出 CSV 报告
linkchecker --file-output=csv/report.csv https://example.com

# 输出 HTML 报告
linkchecker --file-output=html/report.html https://example.com
```

### 6.3 常用参数

| 参数 | 说明 |
|---|---|
| `--check-extern` | 检查外部链接（默认只查站内） |
| `--recursive` | 递归（默认开启）；`-r` |
| `--verbose` / `--debug` | 详细输出 |
| `--file-output=csv/<路径>` | CSV 输出 |
| `--no-robots` | 忽略 robots.txt（慎用） |
| `--timeout=30` | 超时秒数 |
| `--threads=10` | 并发线程数 |

## 7. 输出解读

### 状态码含义
| 输出标记 | 含义 | 处理 |
|---|---|---|
| `OK` (200) | 链接正常 | — |
| `ERROR 404` | 页面不存在 | **死链**，需修复或删除 |
| `ERROR 403` | 访问被拒 | 可能是权限限制，非死链，人工确认 |
| `WARNING 301/302` | 重定向 | 建议更新为最终地址 |
| `Timeout` | 超时 | 目标慢或不可达 |
| `SSL error` | 证书问题 | 检查证书配置 |

### 报告阅读
- 末尾统计：`Linkchecker found N errors` → N 为需处理数
- CSV 列：URL、状态、错误说明、来源页面

## 8. 测试记录模板

```markdown
## LinkChecker 测试记录
- 日期：____ ｜ 靶标：____ ｜ 是否含外链：____ ｜ 线程数：__

### 汇总
- 总链接数：____ ｜ 正常：____ ｜ 错误：____ ｜ 警告：____

| URL | 状态 | 来源页面 | 处理建议 |
|---|---|---|---|
| /broken-page | 404 | /home | 删除或重定向 |
| | | | |

### 结论 / 遗留问题
- ____
```

## 9. 参考链接
- 官网：<https://linkchecker.github.io/linkchecker/>
- GitHub：<https://github.com/linkchecker/linkchecker>
- 官方 Docker 镜像：<https://github.com/linkchecker/linkchecker/pkgs/container/linkchecker>
- 安装说明：<https://linkchecker.github.io/linkchecker/install.html>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[04-Wget-Spider]]（轻量替代）· [[07-Screaming-Frog]]（含死链检测+更多 SEO 功能）
