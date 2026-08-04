---
tags:
  - 工具手册
  - 链接
---
# 🕷️ 04 · Wget --spider

## 1. 工具简介

`wget --spider` 是 GNU Wget 的"爬虫模式"：**只检查链接有效性，不下载内容**。它按 HTTP 响应判断 URL 是否可达（200 正常 / 404 不存在 / 403 拒绝等），配合 `-r` 可递归检查整个站点。特点是**系统自带、零安装依赖、极轻量**——适合快速批量确认链接是否有效。

> ⚠️ **Windows 注意**：Windows 不自带 wget（这是 Linux/macOS 的标配）。需先安装（见第 5 节），或用**等价的 curl 命令**（本机已装 curl 8.19）。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 单链接检查 | `wget --spider <url>` 秒级判断可用性 |
| 递归检查 | `-r` 全站爬取，找站内死链 |
| 不下载内容 | 只发 HEAD/GET 请求，带宽占用极小 |
| 脚本友好 | 可配合 `for` 循环批量检查 URL 列表 |
| 认证支持 | `--user/--password` 支持需要登录的页面 |

**适用场景**：快速确认一批 URL 是否有效、CI 里做链接冒烟测试、运维巡检。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| 极轻量，几乎零资源 | 无报告页面，结果靠命令行日志 |
| 系统自带（Linux），即用 | Windows 需额外安装 |
| 脚本化最方便 | 对 JS 渲染页面无效（只测静态响应） |
| 不依赖任何框架 | 递归深度控制需手动调参 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | Linux/macOS 原生；**Windows 需 winget 或下载安装** |
| 许可证 | GPL，免费 |
| 依赖 | 无（独立二进制） |
| 安装方式 | `winget install GnuWin32.Wget` 或 Chocolatey |
| 资源占用 | 极低 |
| 学习成本 | ★☆☆，最易上手 |
| 与现有环境 | 本机已装 curl（含 `--spider` 等价能力），**curl 方案零安装** |

## 5. 安装指南（Windows）

### 方式 A：winget 安装（推荐）

```powershell
winget install GnuWin32.Wget
# 重新打开终端后验证
wget --version
```

### 方式 B：Chocolatey

```powershell
choco install wget
wget --version
```

> ⚠️ **不要用 `pip install wget`**：那是 Python 库，不是命令行工具，装完终端里依然没有 `wget`。

### 方式 C：不安装，直接用 curl（本机已就绪）

curl 有 `--spider` 模式，功能等价，下面的"基本用法"两种命令都给了。

## 6. 基本用法

### 6.1 检查单个链接

```bash
# wget
wget --spider https://example.com

# curl 等价
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://example.com
```

### 6.2 递归检查整个站（找站内死链）

```bash
# wget：递归 2 层，spider 模式，不下载
wget --spider -r -l 2 http://localhost:8888

# 只显示出错链接（过滤出非 200 的行）
wget --spider -r -l 2 http://localhost:8888 2>&1 | grep -E "HTTP response|Remote file does not exist|404"
```

### 6.3 批量检查 URL 列表（脚本）

```bash
# 准备 url.txt，每行一个 URL
# 逐行用 curl 判断（Git Bash）
while read -r u; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$u")
  echo "$code  $u"
done < url.txt
```

### 6.4 常用参数（wget）

| 参数 | 说明 |
|---|---|
| `--spider` | 爬虫模式，只检查不下载 |
| `-r` / `--recursive` | 递归 |
| `-l N` / `--level=N` | 递归深度 |
| `--no-verbose` | 精简输出 |
| `--user-agent=...` | 指定 UA |
| `-o log.txt` | 日志输出到文件 |
| `--tries=2` | 重试次数 |

## 7. 输出解读

| 输出 | 含义 |
|---|---|
| `200 OK` | 链接正常 |
| `404 Not Found` | 死链 |
| `403 Forbidden` | 拒绝访问（可能是权限） |
| `301/302 Moved` | 重定向 |
| `Connection refused` | 站点未启动或端口错 |

**配合 curl 的技巧**：`-w "%{http_code}"` 直接输出数字状态码，方便脚本里判断（`if [ "$code" = "200" ]`）。

## 8. 测试记录模板

```markdown
## Wget --spider 测试记录
- 日期：____ ｜ 靶标：____ ｜ 深度：__ ｜ 命令原文：____

### 批量检查结果
| URL | 状态码 | 结论 |
|---|---|---|
| https://example.com | 200 | 正常 |
| http://localhost:8888/404page | 404 | 死链 |

### 结论 / 遗留问题
- ____
```

## 9. 参考链接
- GNU Wget 手册：<https://www.gnu.org/software/wget/manual/wget.html>
- winget 安装：`winget search wget`
- curl 手册：<https://curl.se/docs/manpage.html>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[03-LinkChecker]]（全站死链报告更强）· [[07-Screaming-Frog]]（含死链检测+SEO）
