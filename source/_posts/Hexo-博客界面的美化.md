---
title: Hexo 博客界面的美化
tags:
  - Hexo
categories: 建设博客
toc: true
summary: 包含了 Hexo 博客主题的安装，以及怎样配置博客主题。
description: 包含了 Hexo 博客主题的安装，以及怎样配置博客主题。
typora-root-url: Hexo-博客界面的美化
abbrlink: 344928449
date: 2026-07-18 14:12:51
---

---
## 写在前面

本文参考了部分ai生成内容，如有错误恳请指出。

---

## 一、Hexo主题的安装

### 查看主题

你可以在  [hexo.io/themes](hexo.io/themes) 里找到很多 Hexo 主题。

![](scrShot1.png)

每个主题下面会放两个链接，一个是 `github` 仓库，一个是博客界面预览。

仓库的 `README` 里会写主题的安装方法，一些主题也会在博客界面预览里放上主题的安装方法和配置教程。

---

### 安装过程

以下以主题 Anatolo 为例讲解一般主题的安装过程。

在终端进入 Hexo 项目根目录，然后运行以下指令，通过 `github` 把主题文件下载到 `themes\Anatolo` 文件夹：

``` bash
git clone https://gitee.com/Lhcfl/hexo-theme-anatolo.git themes/Anatolo
```

接下来安装主题需要的依赖：

```bush
npm install hexo-renderer-pug --save
npm install hexo-renderer-stylus --save
```

继续进入 Anatolo 目录，按要求安装依赖：

```bash
cd themes/Anatolo
pnpm i # 必须安装依赖
```

然后把 `themes/Anatolo` 下的 `_config.example.yml` ，重命名为 `_config.yml` 。

最后，打开你博客根目录下的 `_config.yml` 文件（这是站点的主配置文件），找到 `theme` 这一行，把后面的名字改成你刚安装的主题名。

```yaml
theme: Anatolo
```

现在你可以试试部署一下你的博客，看看它用上新主题的样子了！

---

### 主题更新方法

在 Anatolo 的目录下运行

```
git pull origin master
```

**注意**： 这样更新将会覆盖 `themes/Anatolo` 下的 `_config.yml` ，也就是说在这个文件里对主题进行的配置都会被**覆盖**！所以为了防止你哪天忘了这点，不小心更新主题把你的自定义配置**搞没**，不建议你直接在这个文件里进行自定义配置。

---

## 二、主题的可配置项目

### 创建独立的主题配置文件

如上所述，不建议你直接在 `themes/Anatolo` 下的 `_config.yml` 里进行自定义配置，而是采用下面这种更安全的方式：

**在博客根目录下创建独立的主题配置文件。**

1. **保留模板文件**：保持 `themes/主题名/_config.example.yml` 这个名字不变，不要修改它。如果你已经把 `_config.example.yml` 重命名为 `_config.yml` 了，记得把名字改回去，不然配置会出问题。
2. **创建你的配置文件**：在你的**博客根目录**下，新建一个名为 `_config.主题名.yml` 的文件（例如，如果你用的主题是 `Anatolo`，就创建 `_config.Anatolo.yml`）。
3. **开始配置**：把 `_config.example.yml` 的内容复制到这个新文件里，并修改成你喜欢的值。

当你本地预览 (`hexo s`) 或生成页面 (`hexo g`) 时，Hexo 会自动读取根目录下这个 `_config.主题名.yml` 文件。

---

### 主题配置文件详解

以下是 Anatolo 主题 `_config.Anatolo.yml` 中各个配置项的中文讲解。其他主题的配置文件大都类似，按自己需求更改即可。

> **注意**：配置文件里提到的所有路径均是以 `themes/主题名` 为根路径的。

#### 基本信息

```yaml
keywords: Blog,博客,Hexo
author: Yourname
description: A simple and beautiful blog
defaultTheme: default   # 可选 light / dark / default（跟随系统）
```

这几个字段控制博客的基本元信息：

- `keywords` — 网站的 SEO 关键词，逗号分隔。
- `author` — 你的名字，会显示在页面各处。
- `description` — 网站描述，会出现在 HTML 的 `<meta>` 标签中，影响搜索引擎展示。
- `defaultTheme` — 默认的配色方案：
  - `light` 始终亮色
  - `dark` 始终暗色
  - `default` 跟随浏览器的系统主题自动切换。

#### 图标设置

```yaml
favicon: /images/favicon.webp    # 浏览器标签页上的小图标
avatar: /images/logo.webp        # 导航栏头像
logo_dir: /images/logo@2x.webp   # 侧边栏的 Logo 大图
logo_style: width:220px;         # Logo 的 CSS 样式（可调整尺寸）
```

- 把你要用的图片放到 `themes/Anatolo/source/images/` 下，然后填入文件名即可。
- 如果觉得图标尺寸不够好看，可以编辑 `themes/Anatolo/source/css/style.styl` 调整。

#### 版权声明

```yaml
copyright:
  show: true
  default: 'All rights reserved'
  show_author: true
```

- `show: true` — 每篇文章底部都会显示版权声明。
- `default` — 默认的版权文字。你也可以在单篇文章的 `Front Matter` 里单独覆盖它：

  ```yaml
  ---
  title: 某篇文章
  copyright: "本文为原创，转载请注明出处"
  ---
  ```

- `show_author: true` — 版权声明中是否显示文章作者名。
- 如果想对某篇文章**禁用**版权声明，可以在其 `Front Matter` 中写 `copyright: disabled`。

#### 站点底部注脚

```yaml
footbar:
  copyright: 'All rights reserved'
  beian:
  gongan:
```

- `copyright` — 显示在侧边栏底部的注脚文字，初衷是显示版权声明，也可以写一句座右铭。
- `beian` / `gongan` — 仅对国内用户有意义；如果有 ICP 备案号或公安备案号，填在这里。

#### 社交链接

```yaml
social:
  github: https://github.com/littlefish04
  mail: littlefish04@163.com
  zhihu:
  twitter:
  rss:
```

- 键名是 [Font Awesome 6](https://fontawesome.com/) 的图标名，值是对应的链接地址。（格式是这样 键：值）
- `mail` 比较特殊——填邮箱地址即可，点击会打开邮件客户端。
- **留空**的项不会显示在页面上。
- 如果你需要的社交平台不在列表中，可以去 `themes/Anatolo/layout/partial/social_links.pug` 中自行添加。

#### 导航栏菜单

这是最常用的配置之一，决定了博客顶部导航栏显示哪些入口。

```yaml
menu:
  Home: /
  Archives: /archives
  Categories: /categories
  Tags: /tags
```

- 键名（如 `Home`、`Archives`）会自动根据语言设置翻译成中文（参见主题 `languages/zh-cn.yml`，比如 `Categories` → `分类`）。
- 值是页面的路径，**必须以 `/` 开头**。

**Hexo 内置的页面路径**有：

| 菜单项 | 路径 | 说明 |
|--------|------|------|
| `Home` | `/` | 博客首页 |
| `Archives` | `/archives` | 文章归档，按日期列出所有文章，**自动生成** |
| `Tags` | `/tags` | 标签页，**自动生成**，无需手动创建 |
| `Categories` | `/categories` | 分类页，**需要手动创建**（见下方） |

##### 添加「分类」页面

与归档、标签不同，Hexo **不会自动生成分类首页**。如果你在菜单里加了 `Categories: /categories`，但点进去显示 "Cannot GET"，你需要手动创建这个页面：

1. 在终端运行：

   ```bash
   hexo new page categories
   ```

   这会生成 `source/categories/index.md`。

2. 打开这个文件，修改它的 `Front Matter` ，指定 `layout: categories`：

   ```yaml
   ---
   title: 分类
   layout: categories
   ---
   ```

   `layout: categories` 告诉 Hexo 使用主题的分类模板来渲染这个页面。

3. 重新生成 `hexo clean && hexo g`，分类页就生效了。

##### 添加自定义页面

如果你还想添加「关于」「友链」等自定义页面，步骤类似：

```bash
hexo new page about    # 生成 source/about/index.md
hexo new page links    # 生成 source/links/index.md
```

然后在菜单中加上：

```yaml
menu:
  Home: /
  Archives: /archives
  Categories: /categories
  Tags: /tags
  About: /about
  Links: /links
```

> **提示**：自定义页面的 `index.md` 里可以写任意 Markdown 内容。友链页面的写法参见本文 [友链](#友链) 小节。

#### 导航栏右侧按钮

```yaml
rightbtn:
  back: true              # 显示「返回上一页」按钮
  search: true            # 显示搜索按钮（可搜索文章标题和内容）
  avatar: true            # 是否在导航栏右侧显示头像
  darkLightToggle: true   # 显示暗色/亮色主题切换开关
```

四个选项全是 `true` / `false`，按喜好开关即可。

#### 文章展示设置

```yaml
useSummary: false    # 开启后自动截取文章前段作为摘要
useTagCloud: false   # 开启后标签页使用「标签云」样式替代普通列表
tocMaxDepth: 4       # 文章目录（TOC）最大渲染到第几级标题。设为 0 则完全禁用目录
```

- `useSummary` — 如果你不想手动在 `Front Matter` 里的 `summary` 里写摘要，或者在文章里插 `<!-- more -->`，可以把它设为 `true`，让 Hexo 自动截取前几段作为摘要。
- `useTagCloud` — 标签云会以不同字号展示不同热度的标签，视觉效果更活泼。
- `tocMaxDepth` — 比如设为 `3`，则只会显示 `H1`、`H2`、`H3` 三级标题的目录。最大值为 `6`。

#### 评论系统

```yaml
always_enable_comments: true
```

设为 `true` 后，会**无视**每篇文章 Front Matter 中的 `comments` 设置，所有文章都开启评论区（前提是已经接入评论系统并设置 `enable: true ` ）。

Anatolo 支持多种评论系统（Valine、Gitment、Gitalk、Disqus 等），每个评论系统的接入方式可以自行上网搜索。笔者推荐使用 [Gitment：使用 GitHub Issues 搭建评论系统 | I'm Sun](https://imsun.net/posts/gitment-introduction/) 

#### 百度统计

```yaml
Baidutongji: false
```

- 设为 `true` 后启用百度统计。
- 你需要先去 [百度统计](https://tongji.baidu.com/) 获取统计 JS 代码，放入 `themes/Anatolo/source/js/baidu-tongji.js` 中。
- 如果不需要，保持 `false` 即可。

### 对每篇文章单独进行配置

在 [如何编写 Hexo 博客 | littlefish04的个人博客~](https://littlefish04.github.io/blog/posts/3228854791/) 一文里有提到过 `Front Matter` 的概念。实际上，除了在 `_config.主题名.yml` 里对整个博客主题进行配置，也有一些配置是可以在 `Front Matter` 里单独设置的。

取决于主题的不同，会有一些配置是**必须**在每篇文章里**单独设置**的。

以下依然以 `Anatolo` 主题为例。

#### 目录

在 `Front Matter` 中添加 `toc: true` 在页面上启用目录。

#### 文章摘要

如果你在 `Front Matter` 中添加 `summary`，则 `Anatolo` 会使用你提供的 summary 来生成首页的文章摘要。

#### 友链

在你的Markdown中添加像这样的HTML

```html
<div
  class="friend-link"
  data-avatar="https://头像所在的网址"
  data-href="https://友链地址"
  data-title="友链标题"
  data-description="友链描述"
></div>
```

来声明一条友链。友链会在访问网站时被动态展开：

相关代码在：

```typescript
// src/utils/friend-link.tsx
const friendHTML = ({ avatar, href, title, description }: any) => (
  <div class="friend-link-container">
    <div class="friend-link-box">
      <aside class="friend-link-avatar">
        <img src={escapeHTML(avatar)} href={escapeHTML(href)} />
      </aside>
      <div class="friend-link-meta">
        <div class="friend-link-title">
          <a href={escapeHTML(href)}>{escapeHTML(title)}</a>
        </div>
        <div class="friend-link-description">{escapeHTML(description)}</div>
      </div>
    </div>
  </div>
);
```

`avatar` `href` `title` `description` 分别是 友链头像、友链地址、友链标题、友链描述。

#### 特殊样式

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

---

### 预设文章的 `Front matter` 

每次写博客时都要在前面设置 `toc: true` 很累人啊。于是笔者去搜索了一下，才知道 Hexo 是有模板功能的，可以自己设置每次新生成的文章的模板。

具体来说， 项目根目录下 `scaffolds/post.md` 就是文章的模板文件。每次新建文章都会往里填入模板文件里写好的内容~

以下是笔者的 post.md ，使用了 `hexo-auto-front-matter` 插件来自动填入 `title` 和 `date` : 

```markdown
---
title: {{ title }}
date: {{ date }}
tags:
categories:
toc: true
summary:
description:
---

```

---

## 参考资料

- [Anatolo](https://lhcfl.github.io/Anatolodemo/)

