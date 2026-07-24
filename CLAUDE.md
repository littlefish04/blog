# CLAUDE.md

> 此文件由 AI 维护和更新。如果会话中某些内容被迭代更改，AI 应及时修改此文件。如果 AI 认为某些信息非常常用、需要跨会话保留，也应主动加入此文件。保持内容精简，只包含常用信息。

## 项目概况

- **Hexo 静态博客** v8.1.2，部署于 GitHub Pages
- **站点 URL**：`https://littlefish04.github.io/blog`
- **根路径**：`/blog/`（所有资源引用需加此前缀）
- **主题**：Anatolo（Pug 模板 + Stylus 样式 + TypeScript 前端）
- **主题配置**：`_config.Anatolo.yml`（评论、导航、社交链接等）
- **部署**：`hexo deploy` → git push 到 `git@github.com:littlefish04/littlefish04.github.io.git` 的 `gh-pages` 分支
- **CI/CD**：push 到 main 分支自动触发 GitHub Actions 部署（`.github/workflows/pages.yml`）

## 常用命令

```bash
hexo server          # 本地预览 (默认 http://localhost:4000/blog/)
hexo new post "标题" # 创建新文章 (在 source/_posts/ 下)
hexo generate        # 生成静态文件到 public/
hexo deploy          # 部署到 GitHub Pages
hexo clean           # 清除缓存和 public/
```

## 文章 Front Matter 模板

```yaml
---
title: 文章标题
toc: true
tags:
  - 标签1
categories: 分类名
abbrlink: 自动生成  # 由 hexo-abbrlink 插件自动填充
date: 自动生成       # 由 hexo-auto-front-matter 插件自动填充
summary: 文章摘要（用于 SEO 和列表展示）（应在50字以内）
description: 文章摘要，用于 SEO
---
```

- **Categories**：目前有 `Unity 基础学习`、`建设博客`
- **Tags**：目前有 `C#基础`、`Hexo`、`Markdown` 
- **永久链接**格式：`posts/:abbrlink/`（crc32 算法生成数字 ID）
- **资源文件夹**：`post_asset_folder: true`，每篇文章的图片等资源放在同名文件夹内
- **引用文章图片**：`{% asset_img filename.svg 描述 %}`（Markdown 语法在 Hexo 中不适用）

## 关键插件

| 插件 | 用途 |
|------|------|
| hexo-abbrlink | 文章永久链接，修改标题不影响链接 |
| hexo-auto-front-matter | 自动生成 date 和 title |
| hexo-generator-sitemap | 生成 sitemap.xml |
| hexo-generator-robotstxt | 生成 robots.txt |
| hexo-filter-nofollow | 外链添加 nofollow |
| hexo-renderer-marked | Markdown 渲染（支持 postAsset） |

## SEO 配置

- sitemap 路径：`sitemap.xml`、`sitemap-articles.xml`
- robots.txt 提交了 sitemap 地址
- 全站外链自动添加 `nofollow`

## 写作风格

参照 `C-常用组件底层代码分析.md`，遵循以下规范：

### 文章结构
1. **Front Matter**：完整填写 title、tags、categories、summary、description
2. **写在前面**：用 `## 写在前面` 开头，交代文章背景、参考来源、适用读者
3. **正文**：用 `## 一、` `## 二、` 编号分节，每节下用 `###` 小标题细分
4. **参考资料**：文末用 `## 参考资料` 列出参考链接

### 代码与行文
- 所有代码块标注语言标识（` ```c# `、` ```yaml `、` ```bash ` 等）
- 代码块后有解释性文字，逐段分析关键逻辑
- 行文中 `Backtick` 包裹的方法名/类名/参数名
- 使用 `>` 引用块引用外部资料或强调要点
- 用 `**粗体**` 强调重要结论
- 中英混排：技术术语保留英文（如 GC、Hash、Enumerable），普通叙述用中文
- 语气：客观技术分析，可带"我们来看看""可以看到"等引导语，避免口语化感叹词
- 如有 AI 辅助生成内容，在"写在前面"末尾添加声明：`部分内容为ai生成，如有错误恳请指出。`

### 内容深度
- 不仅讲"怎么用"，更要讲"为什么这样设计""底层怎么实现"
- 引用源码逐行分析，标注复杂度（O(n)、O(1) 等）
- 对潜在问题给出改进建议（如预分配容量、避免 foreach 等）
- 结尾给出实用性总结

### 特殊样式

在写文章的时候，你可以加入tip框

```html
<div class="tip">
Tip框内的文字
</div>
```

渲染出来会有这样的样式：

<div class="tip">
Tip框内的文字
</div>

## 关于润色文章的要求

当用户希望润色文章时，你应该做到：

- 不改动 Front Matter 、写在前面、参考资料这三个部分。
- 在保留原意的基础上对文字进行润色，包括修改行文风格（参照写作风格一章）、修改表达让阅读逻辑更顺畅、纠正文章中的错误等等。
- 如果遇到文章中写有 “待补充” 的字样，按上下文要求进行补充。