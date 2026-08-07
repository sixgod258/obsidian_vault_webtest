---
tags:
  - 测试记录
  - LinkChecker
  - 链接
---

# LinkChecker 测试记录

## 0. 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-08-04 |
| 工具及版本 | LinkChecker 10.6.0.post51 |
| 靶标 URL | `http://host.docker.internal:3000`（本地 Juice Shop） |
| 靶标类型 | 本地靶场 |
| 测试方式 | Docker 容器内运行，输出 HTML 报告 |

## 1. 测试命令

```powershell
docker run --rm -v D:\webest_report\LinkChecker:/output --user root -w /output ghcr.io/linkchecker/linkchecker:latest -F html/report.html http://host.docker.internal:3000
```

## 2. 测试结果

| 指标 | 结果 |
|---|---|
| 检查链接数 | **572** |
| 警告数 | **0** |
| 错误数（死链） | **0** |
| 耗时 | 3 分 12 秒 |
| 结论 | **PASS（通过，无死链）** |

### 内容类型分布

| 类型 | 数量 |
|---|---|
| 图片（image） | 542 |
| application | 14 |
| 其他 | 14 |
| 文本（text） | 2 |

### URL 长度
min=23 · max=77 · avg=54

## 3. 结论与建议

- 全站 **572 个链接全部有效，无 404 / 超时 / 重定向异常**，链接健康度良好。
- 说明：本轮爬取以图片资源为主（约 95%），符合 Juice Shop 前端资源结构。
- 建议：上线后对生产站点做同参数巡检，接入周度死链巡检（见 [[后续行动]]）。
- 原始数据：`D:\webest_report\LinkChecker\report.html`。

## 4. 附件
- 原始报告：`D:\webest_report\LinkChecker\report.html`
- 参考：[[03-LinkChecker]] 手册 · [[测试方法论]]

## 相关
- [[测试记录模板]] · [[工具对比总表]]
