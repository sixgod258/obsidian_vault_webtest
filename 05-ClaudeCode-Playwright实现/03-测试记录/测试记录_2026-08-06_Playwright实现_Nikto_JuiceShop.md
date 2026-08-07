---
tags:
  - 测试记录
  - Playwright实现
  - Nikto
  - 安全
---

# Nikto 实现记录（Claude Code + Playwright）

> 用 **Claude Code 驱动 Playwright** 实现 [[06-Nikto]] 的核心功能：Web 服务器侦察（响应头指纹 + 常见敏感路径探测）。

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-06 |
| 实现方式 | Playwright request API 直连（不渲染），探测 36 个敏感路径 + 抓服务器头 |
| 驱动方式 | Claude Code 编写/运行脚本 + 解读结果 |
| 脚本 | `02-实现脚本/06-nikto.js` |
| 靶标 | Juice Shop `http://localhost:3000` |
| 合规 | 本地授权靶场 |

## 1. 实现方法（怎么做）

Nikto = **对目标发一批已知敏感路径的请求，检查是否存在危险文件 / 目录列表 / 配置错误**，并抓服务器响应头。Playwright 实现同一逻辑：

```js
// 核心（06-nikto.js）
for (const p of PATHS) {   // /admin, /backup, /.env, /.git/HEAD, /phpmyadmin/ ...
  const resp = await reqCtx.get(BASE + p, { maxRedirects: 0 });
  // 记录 status / content-type / 是否目录列表 / 是否 SPA catch-all
}
// 抓首页响应头 → 检测 Server / X-Powered-By 版本泄露
```

**关键增强**：识别 **SPA catch-all**。`/admin`、`/.env` 等路径在 SPA 上返回 200，但内容是 index.html 壳（不是真实文件）。脚本对比 index.html 签名剔除假阳性。

## 2. 测试结果

### 汇总（36 个探测路径）

| 指标 | 值 |
|---|---|
| 探测路径 | 36 |
| 发现项 | 36（经 SPA 签名过滤后按严重度归类） |
| **Medium** | 2 |
| **Low** | 3 |
| Info（SPA catch-all 假阳性） | 31 |
| 服务器头版本泄露 | 0 |

### Medium 发现

| 路径 | 状态 | 说明 |
|---|---|---|
| `/api/` | 500 | 目录访问触发服务端错误（可能是路由未定义处理） |
| `/rest/` | 500 | 同上 |

### Low 发现

| 路径 | 状态 | 说明 |
|---|---|---|
| `/robots.txt` | 200 | 存在（内容为合法 robots 声明） |
| `/ftp/` | 200 | 返回了非 index.html 内容 |
| `/metrics` | 200 | 存在 |

### 服务器指纹

- `Server` / `X-Powered-By` 等敏感响应头**未泄露版本**（Juice Shop 默认隐藏）→ 无版本信息泄露告警。

## 3. 关键洞察：SPA 对 Nikto 类工具的"免疫"

- 探测的 36 个路径里 **31 个被 SPA catch-all 吃掉**（都返回 index.html）——`/.env`、`/.git/config` 这些在传统站点上"必然存在"的路径，在 SPA 上全是 200 假象。
- **结论**：在 SPA 上跑 Nikto / wget 类路径探测，会产生大量假阳性，必须**对比响应内容**（是否 index.html 壳）而非只看状态码。Playwright 的优势正是能读 body 内容做判定。
- 服务器头无泄露，说明该靶场在**服务器指纹维度很干净**——Nikto 在这种目标上收获有限，与手册里"误报偏多"的结论一致。

## 4. 与原工具对比

| 能力 | 原工具 | Playwright 实现 | 可实现度 |
|---|---|---|---|
| 敏感路径探测 | ✅ 8000+ 条 | ✅ 36 条（可扩展成完整字典） | 可实现 |
| CVE/OSVDB 版本匹配 | ✅ | ❌ 需引入漏洞库 | 弱 |
| 目录列表检测 | ✅ | ✅ 正则判定 | 100% |
| 响应头指纹 | ✅ | ✅ | 100% |
| **SPA 假阳性过滤** | ❌ | ✅ 内容签名判定 | **Playwright 优势** |
| 多格式报告 | ✅ | JSON + MD | 100% |

## 5. 结论

- **可基本实现**：路径探测 + 头指纹 + 目录列表检测都能做；检查项数量是可配置的（把 Nikto 的 db 字典灌进来即可扩展）。
- **真正的差距**：Nikto 的 CVE 版本匹配库（OSVDB 关联）——那是它的核心资产，Playwright 实现需要外部漏洞库数据。
- **实战价值**：在 SPA 目标上，Playwright 实现甚至**比原工具更准**（能剔除 catch-all 假阳性）。

## 相关
- [[06-Nikto]] · [[测试记录_2026-08-06_Playwright实现_ZAP_JuiceShop]]（应用层互补）
- [[04-Wget-Spider]]（侦察前置）· [[测试方法论]]
