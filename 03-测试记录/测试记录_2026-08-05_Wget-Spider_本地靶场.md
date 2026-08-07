---
tags:
  - 测试记录
  - Wget
  - 链接
---

# Wget-Spider 测试记录

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-05 17:58 |
| 工具及版本 | GNU Wget 1.21.4（`wget.exe`，winget 安装） |
| 靶标 URL | `http://localhost:3000/`（本地 Juice Shop） |
| 靶标类型 | 本地靶场 |
| 运行平台 | Windows 11 / PowerShell 5.1 |

## 1. 测试命令

```powershell
wget.exe --spider -r -l 2 http://localhost:3000
```

## 2. 测试结果

| 指标 | 结果 |
|---|---|
| HTTP 请求总数 | **574** |
| 去重 URL 数 | **572** |
| 状态码 200 | **574（100%）** |
| 404 / 403 / 5xx | **0** |
| 断链数 | **0**（`Found no broken links.`） |
| 实际下载文件 | 3 个（index.html、robots.txt、styles.css） |
| 全站响应体扫描量 | 8.14 MB |
| 爬取总耗时 | **0.5 s** |
| 结论 | **PASS（通过）** |

### 资源结构

| 内容类型 | 次数 | 说明 |
|---|---|---|
| image/svg+xml | 541 | 国旗 SVG（/media/ 目录 555 个） |
| application/javascript | 13 | main.js（765KB）+ 10 个 chunk |
| font/woff(2) | 11 | Material Icons / font-mfizz |
| 其他 | 9 | html/css/robots/favicon 等 |

## 3. 关键发现

| # | 严重度 | 发现 |
|---|---|---|
| 1 | 🟠 中 | **国旗资源重复加载**：同一国旗被 4x3 / 1x1 两种宽高比同时引用，产生 541 个 SVG 请求，若只用一种可减半 |
| 2 | 🟡 低 | `main.js` 765KB 偏大，建议结合路由继续瘦身 |
| 3 | 🟡 低 | 字体 URL 带查询串，可能影响 CDN 缓存命中 |

## 4. 结论与建议

- **全站 574 次请求全部 200、0 断链**，链接健康。递归深度、跨主机约束、robots.txt 遵循等爬虫行为均符合预期（验证了 `-r -l 2` 参数生效）。
- 日志中 569 条 `unlink` 提示 + PowerShell NativeCommandError 均为**良性噪音**，不影响结果。
- 建议：上线后对生产站点用相同参数复测；接入批量巡检脚本。
- 原始报告：`D:\webest_report\Wget-Spider\spider测试报告.md` / `.html` / `spider.log`。

## 5. 附件
- 原始报告目录：`D:\webest_report\Wget-Spider\`
- 参考：[[04-Wget-Spider]] 手册 · [[03-LinkChecker]]（同靶场）

## 相关
- [[测试记录模板]] · [[工具对比总表]]
