---
tags:
  - 首页
  - Playwright
---

# 🤖 Claude Code + Playwright 实现 Web 测试工具

> 用 **Claude Code 驱动 Playwright**（`playwright-cli` skill + Playwright 库）实现 [[工具对比总表]] 里 7 款 Web 测试工具的核心功能，靶标为本地 Juice Shop（`http://localhost:3000`）。
>
> 📅 2026-08-06 · ✅ 7 款工具全部实测完成

## 一句话结论

| 类别 | 结论 |
|---|---|
| 链接/SEO（Wget-Spider、LinkChecker、Screaming-Frog） | **完全可实现**，且 SPA 检测比原工具更准 |
| 性能（Lighthouse、WebPageTest） | **核心可实现**（指标实测值等价），缺专有评分/云端节点 |
| 安全（ZAP、Nikto） | **被动层可实现**，主动扫描深度与 CVE 库不可替代 |

详细分析 → [[01-可行性分析]]

## 📂 目录结构

```
05-ClaudeCode-Playwright实现/
├── README.md            ← 本文件（索引）
├── 01-可行性分析.md      ← 每款工具"能不能做到/怎么做"总表
├── 02-实现脚本/          ← 7 个实现脚本 + 共享爬虫 _lib.js
└── 03-测试记录/          ← 7 份实测记录 + assets/（原始 JSON/PNG/HTML）
    └── assets/           ← 各脚本产出的原始数据
```

## 🚀 如何运行

前置：Node ≥ 20、Chrome、`playwright-cli`（其内置 playwright 库）。

```powershell
# 1. 进入脚本目录（脚本用系统 Chrome，无需下载浏览器）
cd "D:\obsi_for_webtest\05-ClaudeCode-Playwright实现\02-实现脚本"

# 2. 用 NODE_PATH 指向 playwright-cli 内置库（或 npm i playwright）
$env:NODE_PATH = "C:\Users\Administrator\AppData\Roaming\npm\node_modules\@playwright\cli\node_modules"

# 3. 逐个运行（每脚本输出 JSON 到 ../03-测试记录/assets/）
node 01-wget-spider.js
node 02-linkchecker.js
node 03-screaming-frog.js
node 04-lighthouse.js
node 05-webpagetest.js   # 额外产出 waterfall.html + filmstrip/*.png
node 06-nikto.js
node 07-zap.js
```

> 💡 脚本是"数据采集器"，Claude Code 的角色是：决定检查什么 → 写/调脚本 → 解读数据 → 写 MD 报告。这就是"Claude Code 驱动 Playwright"的工作流。

## 📋 实现记录

| 工具 | 实现记录 | 核心结论 |
|---|---|---|
| [[01-Lighthouse]] | [[测试记录_2026-08-06_Playwright实现_Lighthouse_JuiceShop]] | LCP 456ms 🟢 / CLS 0.061 🟢 / TTFB 4ms；无评分 |
| [[02-WebPageTest]] | [[测试记录_2026-08-06_Playwright实现_WebPageTest_JuiceShop]] | 瀑布图+胶片全实现；socket.io 致 Fully Loaded 4.5s |
| [[03-LinkChecker]] | [[测试记录_2026-08-06_Playwright实现_LinkChecker_JuiceShop]] | 22 页 0 死链 5 重定向；SPA 检测优于原工具 |
| [[04-Wget-Spider]] | [[测试记录_2026-08-06_Playwright实现_WgetSpider_JuiceShop]] | 20 URL 2 个 500（POST-only 接口）；完全实现 |
| [[05-OWASP-ZAP]] | [[测试记录_2026-08-06_Playwright实现_ZAP_JuiceShop]] | 24 告警（5 中）；被动全实现、主动仅冒烟 |
| [[06-Nikto]] | [[测试记录_2026-08-06_Playwright实现_Nikto_JuiceShop]] | 36 路径；SPA catch-all 假阳性过滤成亮点 |
| [[07-Screaming-Frog]] | [[测试记录_2026-08-06_Playwright实现_ScreamingFrog_JuiceShop]] | 19 页 70 问题；全站共用 title 是真实发现 |

## 测试过程中发现的关键洞察

1. **SPA 让"状态码 200"失去意义**：服务器对任意路径都返回 index.html。链接/路径类工具必须"渲染判空"或"比对壳签名"。
2. **Juice Shop 真实性能特征**：首屏快（Load 171ms）、长尾慢（socket.io + 重复 API 请求 → Fully Loaded 4.5s）。
3. **Juice Shop 全站共用 title/meta**：19 个页面同一个 `<title>`，无 canonical——典型 SPA SEO 技术债。
4. **Juice Shop 几乎无现代安全头**：无 CSP / X-Frame-Options / HSTS，被动扫描立刻暴露。

## 合规提示

安全类探测仅针对本地授权靶场（Juice Shop），不得对未授权公网站点使用。见主仓库 [[README]] 的合规提示。

## 相关
- [[01-可行性分析]] · [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
