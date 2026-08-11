---
tags:
  - 工具手册
  - 性能
  - SEO
---
# 🚀 01 · Lighthouse

## 1. 工具简介

Lighthouse 是 Google 官方开源（Apache-2.0）的**页面质量审计工具**，通过无头 Chrome/Edge 加载页面，从五个维度打分：

- **Performance** 性能（核心 Web Vitals）
- **Accessibility** 可访问性
- **Best Practices** 最佳实践
- **SEO** 搜索引擎优化
- **PWA**（渐进式 Web 应用，较新的版本中已并入其他类别）

命令行工具 + Chrome DevTools（F12 → Lighthouse）内嵌，是目前事实标准的性能基准工具。

## 2. 核心能力与适用场景

| 能力 | 说明 |
|---|---|
| 综合评分 | 五维打分（0–100），一眼看到页面健康状况 |
| 核心 Web Vitals | 实测 LCP、INP、CLS、TBT 等关键指标 |
| 机会诊断 | 给出可操作的优化建议（压缩图片、移除阻塞脚本等） |
| 多输出 | HTML 可视化报告 / JSON / CSV |
| CI 集成 | 配合 Lighthouse CI，提交代码自动跑分，防止性能回退 |
| 可访问性审计 | 自动检查对比度、ARIA、alt 文本等 |

**适用场景**：单页性能体检、上线前后对比、CI 质量门禁、SEO/可访问性基础检查。

## 3. 优缺点

| ✅ 优点 | ❌ 缺点 |
|---|---|
| Google 官方标准，权威 | 只测**单个页面**，不做全站 |
| 免费开源，社区大 | 实验室数据（模拟设备），非真实用户 |
| 报告直观、建议可操作 | 对复杂 SPA 需额外配置（点击/滚动模拟） |
| 无需服务器，本机即可跑 | 重度依赖网络质量，抖动时结果波动 |

## 4. 可行性分析

| 维度 | 结论 |
|---|---|
| 平台 | 跨平台（Node.js） |
| 许可证 | Apache-2.0，完全免费 |
| 依赖 | Node.js ≥ 20 + Chrome/Edge（本机已装 Chrome ✅） |
| 安装方式 | `npm install -g lighthouse`（或临时用 `npx lighthouse`） |
| 资源占用 | 低，单页 1–2 分钟 |
| 学习成本 | ★☆☆，命令简单 |
| 与现有环境 | 本机 Node v26 + Chrome 齐备，**开箱即用** |

## 5. 安装指南

```powershell
# 全局安装（推荐）
npm install -g lighthouse

# 验证
lighthouse --version

# 不想全局装？临时用（自动下载到 npx 缓存）
npx lighthouse --version
```

> 已装 Chrome 时会自动发现；若需指定路径：
> `lighthouse <url> --chrome-path="C:\Program Files\Google\Chrome\Application\chrome.exe"`

## 6. 基本用法

### 6.1 单页全量审计（推荐）

```powershell
# 输出 HTML 报告到当前目录
lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html

# 同时输出 HTML + JSON（JSON 便于后续解析/记录）
lighthouse http://localhost:3000 --output="html,json" --output-path=./report --chrome-flags="--headless --no-sandbox"
```

### 6.2 只测某一类

```powershell
# 只看性能
lighthouse http://localhost:3000 --only-categories=performance

# 只看 SEO + 可访问性
lighthouse http://localhost:3000 --only-categories="seo,accessibility"
```

### 6.3 指定模拟设备（默认移动端）

```powershell
# 桌面端视角
lighthouse http://localhost:3000 --form-factor=desktop --screenEmulation.desktop=true

# 限速模拟（slow 4G）
lighthouse http://localhost:3000 --throttling-method=simulate --throttling.rttMs=150 --throttling.throughputKbps=1638
```

### 6.4 快速看 JSON 关键指标（Git Bash / PowerShell 均可）

```powershell
lighthouse http://localhost:3000 --output=json --output-path=./lh.json --quiet
node -e "const r=require('./lh.json'); console.log(JSON.stringify(r.categories,null,2))"
```

## 7. 输出解读

### 评分等级
| 分数 | 等级 |
|---|---|
| 90–100 | 绿色 ✅ 优秀 |
| 50–89 | 橙色 ⚠️ 需改进 |
| 0–49 | 红色 ❌ 差 |

### 核心指标阈值（Performance 的门面）
| 指标 | 含义 | 达标线 |
|---|---|---|
| **LCP** | 最大内容绘制（首屏最大元素出现） | ≤ 2.5s |
| **INP** | 交互到下次绘制（响应性） | ≤ 200ms |
| **CLS** | 累积布局偏移（页面跳动） | ≤ 0.1 |
| **TBT** | 主线程阻塞总时长 | ≤ 200ms（移动） |

### 报告阅读顺序
1. 顶部**五维评分** → 定位短板
2. **Opportunities**（机会）→ 按预估收益排序的优化项
3. **Diagnostics** → 次要问题
4. 展开每项看**具体元素**（哪个图片、哪个脚本）

## 8. 测试记录模板

```markdown
## Lighthouse 测试记录
- 日期：____ ｜ 靶标：____ ｜ 设备：移动/桌面 ｜ 重复次数：__

| 维度 | 第1次 | 第2次 | 中位数 |
|---|---|---|---|
| Performance | | | |
| Accessibility | | | |
| Best Practices | | | |
| SEO | | | |

### 关键指标（Performance 报告内）
- LCP：____ ms ｜ INP：____ ms ｜ CLS：____

### 优化建议摘要
1. ____
2. ____

### 结论 / 遗留问题
- ____
```

> 完整记录格式见 [[测试记录模板]]。

## 9. 参考链接
- 官方文档：<https://developer.chrome.com/docs/lighthouse/>
- npm：<https://www.npmjs.com/package/lighthouse>
- Lighthouse CI：<https://github.com/GoogleChrome/lighthouse-ci>
- 指标文档（web.dev）：<https://web.dev/learn-core-web-vitals>

## 相关
- [[工具对比总表]] · [[测试方法论]] · [[测试靶标搭建]]
- [[02-WebPageTest]]（深度性能）· [[07-Screaming-Frog]]（SEO 全站）
