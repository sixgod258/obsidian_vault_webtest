---
tags:
  - 工具手册
  - 安全
---
# 🔍 06 · Nikto

## 1. 工具简介

Nikto 是免费开源（GPL-3.0）的 **Web 服务器扫描器**（Perl 编写），运行 **8000+ 条检查**：危险文件、过期软件版本、服务器配置错误、信息泄露等。当前最新版 **2.6.0**（2026-02）。定位是**快速侦察**——在深度漏洞测试前先摸清服务器底细，与 [[05-OWASP-ZAP]] 互补。

> ⚠️ **合规**：Nikto 扫描日志特征明显（不隐身），务必只对你有权测试的目标使用。配套靶场见 [[测试靶标搭建]]。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 危险文件检测 | admin 后台、备份文件、上传目录等 |
| 版本与已知漏洞 | 匹配 CVE 库，提示过期组件 |
| 配置错误 | 目录浏览、缺安全头、默认凭据等 |
| 多格式输出 | HTML/JSON/CSV/XML/TXT |
| 更新机制 | `-update` 拉取最新检查数据库 |
| 调参灵活 | Tuning 分类、Evasion 绕过、端口/SSL 控制 |

**适用场景**：服务器安全基线巡检、上线前快速侦察、与 ZAP 配合的分层扫描。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| 检测项丰富、更新及时 | 只扫**服务器/已知模式**，不做深度应用漏洞 |
| 极快，几秒–几分钟 | 误报偏多，需人工核实 |
| 免费开源 | 原生需 Perl（Windows 上推荐 Docker） |
| 输出格式齐全 | 不隐身，易被 IDS/日志发现 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | Linux/macOS 原生；**Windows 推荐 Docker** |
| 许可证 | GPL-3.0，免费 |
| 依赖 | Docker（推荐）或 Perl |
| 安装方式 | ① Docker 官方镜像 ② Kali 内置 |
| 资源占用 | 低 |
| 学习成本 | ★★★，参数多但上手快 |
| 与现有环境 | 本机 Docker 就绪，官方镜像 `ghcr.io/sullo/nikto` |

## 5. 安装指南

### 方式 A：Docker（本机推荐）

```bash
docker pull ghcr.io/sullo/nikto:latest
```

### 方式 B：原生（Linux/WSL 内）

```bash
sudo apt update && sudo apt install -y nikto
nikto -Version
```

## 6. 基本用法

### 6.1 基础扫描 + 保存报告（Docker）

```bash
# 扫描本地靶场 Juice Shop，输出 JSON 报告到当前目录
docker run --rm -v $(pwd):/tmp ghcr.io/sullo/nikto:latest \
  -h http://localhost:3000 \
  -o /tmp/nikto-report.json \
  -Format json

# 输出 HTML
docker run --rm -v $(pwd):/tmp ghcr.io/sullo/nikto:latest \
  -h http://localhost:3000 -o /tmp/nikto-report.html -Format html
```

> `-v $(pwd):/tmp` 把当前目录挂载进容器，报告写在 `-o /tmp/...` 就留在宿主机了。

### 6.2 常用参数

| 参数 | 说明 |
|---|---|
| `-h <host/url>` | 目标（可用文件列表） |
| `-p <端口>` | 指定端口，如 `-p 80,443,8080` |
| `-ssl` | 强制 SSL（443 通常自动识别） |
| `-o <文件>` / `-Format <格式>` | 输出文件与格式（csv/json/htm/txt/xml） |
| `-Tuning <数字>` | 只跑某些分类（见下表） |
| `-maxtime <1h/60m>` | 最大扫描时长 |
| `-timeout <秒>` | 单请求超时（默认 10） |
| `-update` | 更新检查数据库 |
| `-vhost <域>` | 指定虚拟主机 |

### 6.3 Tuning 分类速查

| 值 | 类别 | 值 | 类别 |
|---|---|---|---|
| 1 | 有趣文件 | 6 | DoS |
| 2 | 配置错误 | 7 | 文件获取（服务器） |
| 3 | 信息泄露 | 8 | 命令执行 |
| 4 | XSS/注入 | 9 | SQL 注入 |
| 5 | 文件获取（web 根） | x | 排除上述（反向） |

示例：`-Tuning 23`（只查配置错误+信息泄露）、`-Tuning x68`（排除 DoS 和命令执行）。

## 7. 输出解读

### 输出条目结构
```
+ /admin/: Server may leak inodes via ETags, header found with file ... [OSVDB-0]
+ /phpmyadmin/: phpMyAdmin 目录被发现（可能是管理后台入口）
```
- `+` 开头 = 发现项（发现文件/问题）
- `-` 开头 = 服务器响应头信息
- `OSVDB/CVE` = 关联的漏洞编号，可用于查询详情

### 常见发现类型
| 发现 | 含义 | 建议 |
|---|---|---|
| `/admin/` 等管理路径 | 后台暴露 | 确认是否应公开 |
| 过期版本组件 | 存在已知 CVE | 升级组件 |
| `Directory indexing` | 目录列表开启 | 关闭 autoindex |
| 响应头泄露版本 | 信息泄露 | 隐藏/精简 Server 头 |

> **误报注意**：Nikto 对"存在某文件"类判断常把正常文件当风险，高危项用浏览器手动确认。

## 8. 测试记录模板

```markdown
## Nikto 扫描记录
- 日期：____ ｜ 靶标：____ ｜ 版本：__ ｜ 数据库更新：是/否
- 命令：____

### 发现项汇总
| 严重度 | 数量 |
|---|---|
| 高（管理后台/已知漏洞） | |
| 中（信息泄露/配置） | |
| 低（响应头信息） | |

### 关键发现明细
| 发现 | URL | 关联 OSVDB/CVE | 是否误报 | 建议 |
|---|---|---|---|---|
| | | | | |

### 结论 / 遗留问题
- ____
```

## 9. 参考链接
- GitHub：<https://github.com/sullo/nikto>
- 官方 Docker 镜像：<https://github.com/sullo/nikto/pkgs/container/nikto>
- 中文实战参考：<https://blog.csdn.net/weixin_42525005/article/details/159822749>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[05-OWASP-ZAP]]（应用层深度扫描，互补）· [[04-Wget-Spider]]（侦察前置）
