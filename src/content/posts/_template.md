---
title: 文章标题写这里
slug: my-first-post
dek: 一两句话的摘要，会出现在列表页和详情页导语里。
tags: [ReAct, 基础]
series:
seriesOrder: 1
status: published
publishedAt: 2026-09-20
updatedAt: 2026-09-20
featured: false
coverFrom: "#FF4D2E"
coverTo: "#8C2109"
coverPattern: grid
---

## 小标题

正文段落写在这里。渲染器支持这些语法：

- **粗体**、*斜体*、`行内代码`
- [链接](https://example.com)
- 无序与有序列表

> 引用块：用来放结论或别人的话。

```bash
docker compose up -d
```

| 列一 | 列二 |
| --- | --- |
| 值 | 值 |

---

## 说明

上面这段分隔线以下是给你自己看的备忘，正式发文时删掉即可。

- `title` 必填；`slug` 决定网址 `/posts/你的-slug`
- `tags` 用方括号加逗号，中文逗号也能识别
- `series` 填连载系列的 slug 或 id，不属于任何系列就留空
- `status` 可选 `published`（已发布）、`draft`（草稿）、`planned`（计划中）
- `coverFrom` / `coverTo` 是卡片封面的渐变色，`coverPattern` 可选 grid、dots、lines、cross
- 文件名以下划线开头（如本文件）不会被当成文章，可以当模板一直留着
