# Wget-Spider 测试报告

## 1. 测试概述

本次测试使用 GNU Wget 的 Spider（爬虫）模式对目标站点进行链接完整性检查，验证站点资源是否全部可访问、是否存在断链，并评估爬虫对站点的抓取行为是否符合预期。

| 项目 | 内容 |
| --- | --- |
| 测试工具 | GNU Wget（wget.exe），Spider 模式 |
| 执行命令 | `wget.exe --spider -r -l 2 http://localhost:3000` |
| 目标地址 | `http://localhost:3000/`（本地 Web 应用） |
| 递归深度 | 2（`-l 2`） |
| 测试日期 | 2026-08-05 17:58:02 |
| 运行平台 | Windows 11 / PowerShell 5.1 |
| 日志来源 | `spider.log`（475,246 字节，5,754 行） |

## 2. 测试结果摘要

| 指标 | 结果 |
| --- | --- |
| HTTP 请求总数 | **574** |
| 去重 URL 数 | **572** |
| 状态码 200 OK | **574**（100%） |
| 其它状态码（404/403/5xx 等） | **0** |
| 断链数量 | **0**（`Found no broken links.`） |
| 实际下载文件数 | 3 个（index.html、robots.txt、styles.css） |
| 下载数据量 | 157 KB，耗时 0.001s，平均 135 MB/s |
| 全站响应体扫描量 | 8,538,448 B（≈ 8.14 MB） |
| 爬取总耗时 | **0.5 s** |
| 最终结论 | **PASS（通过）** |

### 2.1 文件大小统计（全部 574 次响应）

| 指标 | 数值 |
| --- | --- |
| 最小 | 28 B（robots.txt） |
| 最大 | 783,793 B（main.js，≈ 765 KB） |
| 总量 | 8,538,448 B（≈ 8.14 MB） |
| 平均 | 14,875 B |

## 3. HTTP 状态码分析

| 状态码 | 次数 | 占比 | 说明 |
| --- | --- | --- | --- |
| 200 OK | 574 | 100% | 全部资源正常返回 |
| 其它 | 0 | 0% | 无 404/403/301/500/超时/连接失败 |

> 结论：站点所有资源均可正常访问，无失效链接、无未授权资源、无服务器错误。

## 4. 资源类型与 URL 结构分析

### 4.1 内容类型分布（574 次响应）

| 内容类型 | 次数 | 说明 |
| --- | --- | --- |
| image/svg+xml | 541 | 国旗 SVG 及字体 SVG |
| application/javascript | 13 | main.js、scripts.js、polyfills.js 及 10 个 chunk |
| font/woff | 6 | Material Icons / font-mfizz 字体 |
| font/woff2 | 5 | Material Icons / font-mfizz 字体 |
| text/html | 2 | 首页（请求 2 次） |
| text/css | 2 | styles.css（请求 2 次） |
| application/vnd.ms-fontobject | 2 | font-mfizz eot（含 1 次带查询串） |
| text/plain | 1 | robots.txt |
| image/x-icon | 1 | favicon_js.ico |
| font/ttf | 1 | font-mfizz ttf |

### 4.2 URL 目录分布（572 个去重 URL）

| 目录 | 数量 | 说明 |
| --- | --- | --- |
| `/media/` | 555 | 国旗 SVG、Material Icons 与 font-mfizz 字体 |
| 根目录及静态资源 | 17 | 首页、JS/CSS、favicon、robots.txt |

### 4.3 `/media/` 资源明细

`/media/` 下共 **276** 个基础资源，被引用为 555 个带内容哈希的文件：

- **275 个国家/地区代码**，每个对应 **2 个不同哈希的 SVG 变体**（共 550 个文件）：
  - 242 对变体文件大小不同（如 `ad-DX6D6P35.svg` 33,869 B / `ad-KVXQV3EL.svg` 32,654 B）
  - 33 对变体大小相同
  - 推断为 flag-icons 的 **4x3 与 1x1 两种宽高比** 变体被同时引用
- **font-mfizz**：5 个文件（eot、带查询串的 eot、svg、ttf、woff）

### 4.4 根目录及静态资源清单（17 个）

| URL | 大小 | 类型 |
| --- | --- | --- |
| `/`（index.html） | 9,903 B | text/html |
| `/styles.css` | 151,316 B | text/css |
| `/main.js` | 783,793 B | application/javascript |
| `/scripts.js` | 20,700 B | application/javascript |
| `/polyfills.js` | 34,585 B | application/javascript |
| `/chunk-DYXK4NW4.js` | 147,271 B | application/javascript |
| `/chunk-NWDAIMF4.js` | 138,859 B | application/javascript |
| `/chunk-OKA37M7B.js` | 96,238 B | application/javascript |
| `/chunk-UNFVUBM2.js` | 77,556 B | application/javascript |
| `/chunk-VJL3IV3O.js` | 41,204 B | application/javascript |
| `/chunk-YVDT5JXT.js` | 33,140 B | application/javascript |
| `/chunk-5K74DZ2F.js` | 9,725 B | application/javascript |
| `/chunk-VS3A3LTT.js` | 1,007 B | application/javascript |
| `/chunk-PX7UKXVL.js` | 944 B | application/javascript |
| `/chunk-QBYXNN7Z.js` | 547 B | application/javascript |
| `/assets/public/favicon_js.ico` | 15,086 B | image/x-icon |
| `/robots.txt` | 28 B | text/plain |

**最大的 8 个资源：**

| 资源 | 大小 |
| --- | --- |
| main.js | 765 KB |
| font-mfizz-S3MEGEU6.svg | 478 KB |
| material-icons-two-tone-LCGWGE2N.woff | 332 KB |
| material-icons-two-tone-M5N5K6F5.woff2 | 211 KB |
| material-icons-round-SLOHZIXU.woff | 201 KB |
| rs-6KKPRAGY.svg / rs-SFQ4YB5N.svg | ~183 KB |
| material-icons-outlined-PCUTWIDZ.woff | 178 KB |

## 5. 爬虫行为分析（对 `-r -l 2` 的验证）

| 检查项 | 结果 |
| --- | --- |
| 递归爬取 | ✅ 首页 → 静态资源（第 1 层）→ `/media/` 媒体资源（第 2 层，经 CSS 引用发现） |
| 域外抓取 | ✅ 未离开 `localhost:3000`，符合默认「不跨主机」策略 |
| robots.txt | ✅ 自动抓取并遵循（28 B，下载后清理） |
| 连接复用 | ✅ 全部使用 keep-alive 复用连接 |
| 断链检查 | ✅ `Found no broken links.` |
| 正常收尾 | ✅ `FINISHED -- Total wall clock time: 0.5s` |

### 5.1 请求与下载行为说明

- 首页 `/` 与 `/styles.css` 各被请求 **2 次**：第 1 次探测文件是否存在且是否含链接；因含链接，第 2 次完整抓取保存。
- 其余 572 个资源（SVG/JS/字体等）**只探测、不下载**（`Remote file exists but does not contain any link -- not retrieving.`）。
- 实际仅下载 3 个文件：`index.html`、`robots.txt`、`styles.css`。

## 6. 异常与告警记录

| 序号 | 现象 | 次数 | 定性 | 说明 |
| --- | --- | --- | --- | --- |
| 1 | `unlink: No such file or directory` | 569 | 良性（预期行为） | Spider 模式下对每个不含链接的资源尝试删除临时文件失败，属 GNU Wget 已知行为，不影响结果 |
| 2 | PowerShell `NativeCommandError`（`wget.exe : Spider mode enabled...`） | 1 | 良性（仅显示） | wget 将进度信息写入 stderr，被 PowerShell 5.1 包装为错误记录；不影响抓取功能 |
| 3 | HTTP 错误（404/403/5xx）、连接失败、超时 | 0 | — | 未出现任何功能性错误 |

## 7. 观察与优化建议

1. **国旗资源重复加载**：页面同时引用了每面国旗的两个变体（推断为 4x3 与 1x1 两种宽高比），产生 541 个 SVG 请求。若产品实际只用一种宽高比，可减少约一半国旗资源请求，降低页面体积。
2. **`main.js` 体积偏大**（765 KB）：虽然已按 chunk 拆分，但主包仍较大，生产环境建议结合路由继续瘦身或按需加载。
3. **字体带查询串引用**：`font-mfizz-UEEWLJGB.eot?` 的 URL 带查询参数，可能影响 CDN 缓存命中率，建议移除无意义查询串。
4. **生产环境复测**：本次为 `localhost:3000` 开发服务器测试，建议上线后使用相同参数（`wget --spider -r -l 2 <线上地址>`）复测一遍。

## 8. 结论

**测试通过（PASS）。**

- 574 次请求全部返回 `200 OK`，成功率 100%，无任何断链。
- 递归深度、跨域约束、robots.txt 遵循等爬虫行为均符合预期。
- 日志中的 569 条 `unlink` 提示与 PowerShell 告警均为良性噪音，不影响功能与测试结论。
