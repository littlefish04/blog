---
title: 让 Hexo 博客支持数学公式
tags:
  - Hexo
  - Markdown
categories: 建设博客
toc: true
summary: 介绍如何通过 hexo-filter-mathjax 插件让 Hexo 博客支持 LaTeX 数学公式渲染。
description: >-
  介绍如何通过 hexo-filter-mathjax 插件让 Hexo 博客支持 LaTeX 数学公式渲染，解决公式在 Typora
  正常但部署后无法显示的问题。
date: 2026-07-27 13:41:53
---

## 写在前面

在写上一篇关于[矩阵变换](/blog/posts/1452678299/)的文章时，遇到了一个令人头疼的问题：用 Typora 写好的 LaTeX 公式（比如 `$3 \cdot \hat{i} + 2 \cdot \hat{j}$` 渲染后是 $3 \cdot \hat{i} + 2 \cdot \hat{j}$ ）在本地预览时显示得好好的，但部署到博客上之后就变成了一串原始文本。

这是因为 Typora 内置了 MathJax 渲染引擎，而 Hexo 默认的 Markdown 渲染器（`hexo-renderer-marked`）不会处理数学公式。本文记录了解决这个问题的过程。

部分内容为ai生成，如有错误恳请指出。

---

## 一、问题分析

Hexo 默认使用 `hexo-renderer-marked` 作为 Markdown 渲染器。它基于 `marked` 库，只负责把 Markdown 转换成 HTML，并不认识 `$...$` 包裹的 LaTeX 数学公式。

因此当你写下这样的内容时：

```latex
当我们写下向量 (3, 2) 时，它实际上是 $3 \cdot \hat{i} + 2 \cdot \hat{j}$ 的简写。
```

在 Typora 里能正常渲染，是因为 Typora 自带 MathJax 支持。而部署到网站后，浏览器收到的 HTML 中只有 `$3 \cdot \hat{i} + 2 \cdot \hat{j}$` 这个字符串，没有加载任何数学渲染引擎，所以公式就"原样"显示出来了。

**解决方案**就是：让网站在加载页面时，同时加载 MathJax（或 KaTeX），让它来识别并渲染这些公式。

---

## 二、安装 hexo-filter-mathjax 插件

在 Hexo 生态中，有一个叫做 `hexo-filter-mathjax` 的插件，它可以在生成页面时自动注入 MathJax CDN 脚本，让浏览器渲染 LaTeX 公式。

### 2.1 安装

在 Hexo 项目根目录下运行：

```bash
npm install hexo-filter-mathjax --save
```

安装完成后，`package.json` 中会自动添加这个依赖。

### 2.2 配置

在 Hexo 的主配置文件 `_config.yml` 中添加以下配置：

```yaml
# MathJax 数学公式渲染
mathjax:
  tags: none          # 'none' | 'ams' | 'all' — 推荐用 none，使用 $ 和 $$ 作为分隔符
  single_dollars: true # 启用单个 $ 作为行内公式分隔符
  cjk_width: 0.9      # CJK 字符的相对宽度（用于间距调整）
  normal_width: 0.6    # 普通字符的相对宽度（用于间距调整）
  append_css: true     # 自动添加必要的 CSS
  every_page: true     # 设为 true 则每页都加载 MathJax；false 则仅在前置声明 mathjax: true 的页面加载
```

各配置项说明：

| 配置项 | 说明 |
|--------|------|
| `tags` | 数学公式分隔符。`none` 表示使用 `$` 和 `$$`，`ams` 额外支持 `\begin{equation}` 等环境，`all` 则全部启用 |
| `single_dollars` | 是否启用单个 `$` 作为行内公式分隔符。**必须设为 `true`**，否则 `$\hat{i}$` 这种写法不会被识别 |
| `cjk_width` / `normal_width` | 用于公式间距微调，一般保持默认即可 |
| `append_css` | 是否自动添加 MathJax 相关 CSS，建议开启 |
| `every_page` | `true` 则所有页面都加载 MathJax；`false` 则需要在使用公式的文章 Front Matter 中加 `mathjax: true` |

> **关于 `every_page` 的选择**：如果你只有少数文章用到数学公式，可以设为 `false`，然后在需要公式的文章 Front Matter 中加上 `mathjax: true`，这样可以避免在不必要的页面上加载 MathJax 脚本（约 200KB）。如果很多文章都用公式，直接设为 `true` 更方便。

---

## 三、工作原理

整个流程分为两个阶段：

### 3.1 构建阶段（Hexo 生成页面时）

`hexo-filter-mathjax` 作为一个 Hexo 过滤器（filter），在页面生成后会：

1. 在 HTML 的 `<head>` 中插入 MathJax CDN 链接
2. 添加必要的 CSS 样式（由 `append_css: true` 控制）

你在 Markdown 里写的 `$...$` 会被 `hexo-renderer-marked` 当作普通文本原样保留在 HTML 中，这正是我们需要的——**公式不需要在构建时处理**。

### 3.2 运行时（浏览器加载页面时）

当用户访问你的博客时：

1. 浏览器加载 HTML 页面，其中的公式表现为 `$3 \cdot \hat{i}$` 这样的原始文本
2. MathJax CDN 脚本从服务器加载
3. MathJax 扫描整个页面的文本内容，找到所有 `$...$`（行内）和 `$$...$$`（块级）表达式
4. MathJax 将它们渲染为漂亮的数学符号

整个过程对作者完全透明——你只需要像往常一样在 Markdown 中书写 LaTeX 公式即可。

---

## 四、公式写法速查

安装了 MathJax 之后，你可以在文章中使用标准的 LaTeX 数学语法。以下是一些常用写法：

### 4.1 行内公式

用单个 `$` 包裹：

```latex
向量 $\vec{v} = (x, y)$ 可以表示为 $x \cdot \hat{i} + y \cdot \hat{j}$
```

渲染效果：向量 $\vec{v} = (x, y)$ 可以表示为 $x \cdot \hat{i} + y \cdot \hat{j}$

### 4.2 块级公式

用两个 `$$` 包裹，公式会居中单独显示：

```latex
$$
A = \begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
$$
```

### 4.3 常用符号

| 符号 | 写法 | 说明 |
|------|------|------|
| $\hat{i}$ | `\hat{i}` | 单位向量 i-hat |
| $\vec{v}$ | `\vec{v}` | 向量 v |
| $\cdot$ | `\cdot` | 乘法点 |
| $\times$ | `\times` | 叉乘 |
| $\frac{a}{b}$ | `\frac{a}{b}` | 分数 |
| $\sqrt{x}$ | `\sqrt{x}` | 平方根 |
| $\begin{bmatrix} a & b \\ c & d \end{bmatrix}$ | `\begin{bmatrix} a & b \\ c & d \end{bmatrix}` | 矩阵 |
| $\alpha, \beta, \theta$ | `\alpha, \beta, \theta` | 希腊字母 |
| $\sum_{i=1}^{n}$ | `\sum_{i=1}^{n}` | 求和 |

### 4.4 注意事项

- **不要在有 `_` 的公式外加 `*` 或 `_` 标记**（如 `*$a_b$*`），Markdown 的斜体语法可能干扰公式解析。
- **行内公式的 `$` 前后不要有空格**：写成 `$x+y$` 而不是 `$ x+y $`，避免某些情况下识别失败。
- **如果公式中包含 `$` 符号本身**（如表示美元金额），需要用 `\$` 转义。

---

## 五、替代方案

除了 `hexo-filter-mathjax`，还有其他几种常见的 Hexo 数学公式方案：

### 5.1 更换 Markdown 渲染器

将 `hexo-renderer-marked` 替换为 `hexo-renderer-markdown-it`，它基于 `markdown-it`，可以配合 KaTeX 插件使用：

```bash
npm uninstall hexo-renderer-marked
npm install hexo-renderer-markdown-it --save
npm install @traptitech/markdown-it-katex --save
```

KaTeX 比 MathJax 更快（纯客户端渲染，不依赖 SVG/HTML 渲染），但支持的 LaTeX 命令不如 MathJax 全面。如果你写的是比较复杂的数学公式，MathJax 更稳妥一些。

### 5.2 手动注入 CDN

如果你不想安装任何插件，也可以直接修改主题的布局文件，在 `<head>` 中手动添加 MathJax CDN 脚本。以 Anatolo 主题为例，编辑 `themes/Anatolo/layout/partial/head.pug`，在合适位置添加：

```pug
script(async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js")
```

这种方式最轻量，但缺点是升级主题时可能会被覆盖。

---

## 结语

只需安装一个插件、写几行配置，就能让 Hexo 博客支持 LaTeX 数学公式。如果你和我一样有在博客中撰写数学内容的需求（比如图形学、线性代数相关的文章），这个功能会非常实用。

现在打开你的 Typora，继续写公式吧~

---

## 参考资料

- [hexo-filter-mathjax - npm](https://www.npmjs.com/package/hexo-filter-mathjax)
- [MathJax 官方文档](https://docs.mathjax.org/en/latest/)
