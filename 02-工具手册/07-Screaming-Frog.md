---
tags:
  - 工具手册
  - SEO
---
# 🐸 07 · Screaming Frog SEO Spider

## 1. 工具简介

Screaming Frog SEO Spider 是知名商业**全站爬虫**，用于 SEO 技术审核：爬取整个站点，输出每个页面的标题、Meta、H1、状态码、Canonical、重定向链、结构化数据等数十项指标，并支持可视化、导出 CSV/XLSX。当前最新版 **v23.2.0**（2025-11），支持 Windows / macOS / Ubuntu。

> 💰 **免费版限制**：每次爬取最多 **500 个 URL**，且不能导出数据；付费版约 £199/年，解锁无限爬取、JS 渲染、导出等功能。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 全站爬取 | 按站点结构递归抓取所有 URL |
| SEO 指标矩阵 | 标题/描述/H1/Canonical/语言标签/结构化数据等 |
| 状态码分析 | 200/301/302/404 及重定向链可视化 |
| 死链检测 | 内置链接错误检查 |
| 可视化 | 站点图、重定向图、内部链接分析 |
| 导出 | CSV/XLSX 导出（付费版） |

**适用场景**：SEO 全站技术审计、改版前抓取基线、404/重定向排查。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| 全站爬取，SEO 指标覆盖最广 | 商业软件，免费版限 500 URL 且不可导出 |
| 可视化强，非技术人员也能看 | 桌面 GUI，不适合无人值守 |
| 与 Search Console/Analytics 集成 | 大站点爬取吃内存 |
| 更新活跃 | CLI 自动化需付费授权 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | Windows / macOS / Linux 桌面版 |
| 许可证 | 免费版 ≤500 URL；付费 £199/年（约 $259） |
| 依赖 | Java Runtime（新版内置/需装 JRE） |
| 安装方式 | 官网下载安装包（GUI）；CLI 需付费授权 |
| 资源占用 | 中–高（爬取时内存占用明显） |
| 学习成本 | ★★☆，GUI 直观 |
| 与现有环境 | 本机 Windows，下载安装即可；**CLI 自动化需付费授权，本阶段仅评估 GUI** |

## 5. 安装指南

### 方式 A：桌面版（GUI，免费可用）

1. 打开 <https://www.screamingfrog.co.uk/seo-spider/> → 点击 **Download**（选 Windows）
2. 双击安装包完成安装
3. 首次启动：填入邮件可选（可跳过），免费模式直接可用

> 本机 Java 环境若缺失，安装时会提示；新版一般自带或引导下载 JRE。

### 方式 B：CLI（命令行，需付费授权）

CLI 使用 `screamingfrogseospider.exe`（Windows）并通过许可证解锁自动化。**免费版不支持导出和大部分 CLI 功能**。若后续要接入自动化，再申请授权：

```
screamingfrogseospider.exe --crawl URL --headless --export-tabs internal:all
```

## 6. 基本用法（GUI）

### 6.1 发起一次爬取
1. 顶部地址栏输入目标 URL（本地靶场可填 `http://localhost:3000` 或静态站 `http://localhost:8888`）
2. 点击 **Start** 开始爬取
3. 等待爬取完成（状态栏显示已发现 URL 数，注意**免费版 500 上限**）

### 6.2 核心标签页
| 标签页 | 用途 |
|---|---|
| **Internal** | 站内 URL 列表及状态码，**筛 4xx 找死链** |
| **External** | 外部链接 |
| **Response Codes** | 按状态码分组（200/301/404…） |
| **Page Titles** | 标题缺失/重复/过长检查 |
| **Meta Description** | 描述缺失/重复检查 |
| **H1** | 每个页面 H1 检查 |
| **Redirects** | 重定向及链路（勾选 Follow Redirects 时） |
| **Canonicals** | Canonical 标签检查 |

### 6.3 常用筛选操作
- **找死链**：`Response Codes` 标签 → 点击 `Client Error (4xx)` → 看 URL 列表
- **找标题问题**：`Page Titles` 标签 → 点击顶部 `Missing` / `Duplicate` 列排序
- **导出**（付费版）：右键 → `Export` → CSV/XLSX

## 7. 输出解读

### 状态码列
| 状态码 | 含义 | SEO 处理 |
|---|---|---|
| 200 | 正常 | — |
| 301 | 永久重定向 | 确认目标正确，避免链条过长 |
| 302 | 临时重定向 | 检查是否应改 301 |
| 404 | 页面不存在 | 删除/重定向到相关页 |
| 4xx/5xx 其他 | 各类错误 | 按状态处理 |

### SEO 检查要点
| 检查项 | 常见问题 |
|---|---|
| Title | 缺失、重复、超长（>60 字符） |
| Meta Description | 缺失、重复 |
| H1 | 缺失、多 H1、与 Title 重复 |
| Canonical | 缺失、指向错误/自引用错误 |
| 图片 alt | 缺失 alt 属性 |

## 8. 测试记录模板

```markdown
## Screaming Frog 测试记录
- 日期：____ ｜ 靶标：____ ｜ 版本：__ ｜ 免费/付费：__
- 爬取 URL 数：____（免费版上限 500）

### 状态码统计
| 状态码 | 数量 |
|---|---|
| 200 | |
| 301 | |
| 404 | |
| 其他 | |

### SEO 问题汇总
| 问题类型 | 数量 | 示例 URL |
|---|---|---|
| 标题缺失/重复 | | |
| Meta 缺失/重复 | | |
| H1 缺失/重复 | | |
| Canonical 问题 | | |

### 关键结论 / 遗留问题
- ____
```

## 9. 参考链接
- 官网与下载：<https://www.screamingfrog.co.uk/seo-spider/>
- 定价：<https://www.screamingfrog.co.uk/seo-spider/pricing/>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[01-Lighthouse]]（单页 SEO 评分）· [[03-LinkChecker]]（纯死链）· [[04-Wget-Spider]]（轻量链接检查）
