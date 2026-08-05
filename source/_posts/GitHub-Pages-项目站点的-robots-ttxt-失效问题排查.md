---
title: GitHub Pages 项目站点的 robots.txt 失效问题排查
toc: true
tags:
  - Hexo
categories: 建设博客
abbrlink: 3735927058
summary: 排查 Search Console 读取 sitemap 失败的问题，发现项目站点的 robots.txt 不在域名根导致的失效。
description: >-
  排查 Google Search Console 报 "Sitemap could not be read" 的问题，最终定位到 GitHub Pages
  项目站点的 robots.txt 生成在子路径下、域名根 404 的根因，并给出用户主页仓库的解决方案。
date: 2026-08-05 17:00:00
---

---

## 写在前面

在上一篇 [怎么让个人博客能被搜索引擎搜索到](/blog/posts/3273294835/) 中，我们配置了 `hexo-generator-sitemap` 生成站点地图，并用 `hexo-generator-robotstxt` 生成了 robots.txt，最后把 sitemap 提交到了 Google Search Console。

一切看起来都配置好了，但几天后打开 Search Console 的 Sitemaps 页面，看到的却是：

> **Sitemap could not be read**

更让人困惑的是，用 curl 测试 sitemap 的线上地址，返回的是正常的 `200 OK`，XML 内容也完全有效。那问题到底出在哪里？

本文记录这次问题的完整排查过程与修复方案。核心结论一句话概括：**GitHub Pages 项目站点的 robots.txt 不在它该在的位置（域名根）**。适用于所有部署在 `username.github.io/repo/` 子路径下的 GitHub Pages 站点（Hexo、Jekyll、Hugo 等静态博客同理）。

部分内容为 ai 生成，如有错误恳请指出。

---

## 一、问题现象

### 1. Search Console 报 "Sitemap could not be read"

在 Search Console → Sitemaps 页面中，提交的 `https://littlefish04.github.io/blog/sitemap.xml` 状态显示为：

<div class="tip">
Sitemap could not be read
</div>

### 2. 服务端验证 sitemap 完全正常

先用 curl 验证线上文件本身：

```bash
curl -I https://littlefish04.github.io/blog/sitemap.xml
```

返回结果：

```
HTTP/1.1 200 OK
Content-Type: application/xml
```

内容也完全有效——23 个 URL，每个都包含 `<loc>`、`<lastmod>`、`<changefreq>`、`<priority>`，XML 结构完整。**sitemap 文件本身没有任何问题。**

### 3. URL 检查工具的线索

用 Search Console 的 **URL 检查工具**查询 sitemap 地址，结果显示：

| 字段 | 结果 | 含义 |
|------|------|------|
| Page indexing | `URL is unknown to Google` | Google 从未抓取过这个地址 |
| Discovery → Sitemaps | `No referring sitemaps detected` | Google 的 sitemap 数据库里**没有任何成功解析的 sitemap** |
| Crawl → Last crawl | `N/A` | 从未抓取 |

这个结果说明：**Google 一次都没有成功读取过我们的 sitemap**，而且问题不是"最近一次抓取失败"，而是"从未成功过"。sitemap 服务端明明正常，Google 却读不到——问题大概率不在 sitemap 本身，而在更上游的环节。

---

## 二、根因分析：robots.txt 不在它该在的位置

### 1. GitHub Pages 的两种站点形态

先要理解 GitHub Pages 的两种站点机制：

| 站点类型 | 仓库命名 | 部署地址 |
|---------|---------|---------|
| 用户主页站点（User site） | `<用户名>.github.io` | `https://<用户名>.github.io/`（域名根） |
| 项目站点（Project site） | 任意仓库名 | `https://<用户名>.github.io/<仓库名>/`（子路径） |

我们的博客仓库是 `littlefish04/blog`，属于**项目站点**，所以整个站点内容部署在 `https://littlefish04.github.io/blog/` 子路径下：

```text
https://littlefish04.github.io/blog/          ← 站点根（项目站点的内容根）
https://littlefish04.github.io/blog/sitemap.xml
https://littlefish04.github.io/blog/robots.txt
```

### 2. robots.txt 的"标准位置"由协议决定，不由站点决定

robots.txt 不是一个普通文件——它的位置由协议标准规定。RFC 9309（Robots Exclusion Protocol）明确规定：

> The robots.txt URL is determined by the scheme and host of the page URL, and **the path is always `/robots.txt`**.

也就是说，对于 `https://littlefish04.github.io/blog/sitemap.xml` 这个页面，爬虫请求的 robots.txt 一定是：

```text
https://littlefish04.github.io/robots.txt     ← 域名根，爬虫唯一认可的位置
```

**而不是** `https://littlefish04.github.io/blog/robots.txt`。站点部署在哪个子路径，完全不影响 robots.txt 的获取位置——爬虫始终从 `scheme://host/robots.txt` 读取。

### 3. 问题链条

`hexo-generator-robotstxt` 插件把 robots.txt 生成到 `public/robots.txt`，部署后位于 `/blog/robots.txt`。用 curl 验证线上的实际状况：

```bash
curl -I https://littlefish04.github.io/robots.txt          # 404（域名根，Google 找的就是这个）
curl -I https://littlefish04.github.io/blog/robots.txt     # 200（文件其实存在，但 Google 不会看这里）
curl -I https://littlefish04.github.io/blog/sitemap.xml    # 200（sitemap 本身正常）
```

问题链条一目了然：

```text
hexo-generator-robotstxt 生成 robots.txt
        ↓
部署到 /blog/robots.txt（项目站点子路径）
        ↓
Google 按 RFC 9309 请求域名根 /robots.txt → 404
        ↓
robots.txt 中的 Sitemap 声明失效（少一条 sitemap 自动发现通道）
```

### 4. 实际影响评估

robots.txt 404 到底有什么影响？这里要区分两种情况：

- **对 sitemap 的读取**：robots.txt 404 会被爬虫视为"无规则，允许抓取一切"，**并不会阻止** Google 抓取 sitemap 和页面。所以它不会直接导致 "Sitemap could not be read"——这个问题的主因是 Google 抓取调度问题。
- **对规则的控制力**：robots.txt 里写的 `Disallow: /css/` 等规则，以及 `Sitemap:` 声明，对 Google **全部失效**。站点失去了一条重要的 sitemap 自动发现通道（正常情况下，Google 会从 robots.txt 里发现 sitemap 地址，无需手动提交）

---

## 三、解决方案：用用户主页仓库托管域名根

既然域名根 `https://littlefish04.github.io/` 目前没有任何仓库托管（404），而 GitHub 的约定是：**名为 `<用户名>.github.io` 的仓库专门托管域名根**。所以解法就是创建这个仓库。

### 1. 创建仓库

在 GitHub 上新建仓库，名称必须严格为 `littlefish04.github.io`，选 Public。

> 注意：`blog` 仓库本身是从旧名重命名过来的，如果创建时 GitHub 提示名称冲突，正常创建即可，GitHub 会自动解除旧的仓库重命名重定向。

### 2. 添加根 robots.txt

内容与项目站点里的一致，重点加上 `Sitemap:` 声明：

```text
User-agent: *
Disallow: /css/
Disallow: /js_complied/
Disallow: /js/
Allow: /
Sitemap: https://littlefish04.github.io/blog/sitemap.xml
```

这样 Google 读取域名根 robots.txt 时，就能直接发现 sitemap 地址，与 Search Console 显式提交形成**双通道保障**。

### 3. 添加首页跳转

域名根目前访问是 404 死页。GitHub Pages 用户站点是纯静态托管，无法配置服务端 301 重定向，所以用 HTML 层跳转实现——`meta refresh` + JavaScript 双保险，并声明 canonical 防止被判定为重复内容：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://littlefish04.github.io/blog/">
  <link rel="canonical" href="https://littlefish04.github.io/blog/">
  <title>Little Fish Blog</title>
  <script>location.replace('https://littlefish04.github.io/blog/');</script>
</head>
<body>
  <p>跳转到 <a href="https://littlefish04.github.io/blog/">我的博客</a></p>
</body>
</html>
```

### 4. 启用 Pages 并验证

Settings → Pages → Source 选择 **Deploy from a branch** → main / (root) → Save。等一两分钟部署完成后验证：

```bash
curl -I https://littlefish04.github.io/robots.txt   # 应返回 200
```

至此，域名根有内容了，robots.txt 回到了协议规定的位置。

---

## 四、总结

这次排查得到的最有价值的认知是：

> **robots.txt 的位置由协议决定（永远是域名根 `scheme://host/robots.txt`），不由你的站点部署路径决定。**

对于 GitHub Pages 项目站点，站点内容在子路径下，但爬虫只会去域名根找 robots.txt。这也解释了为什么"明明配置了 robots.txt，Google 却像没看到一样"。

几个可复用的排查经验：

1. **遇到 Search Console 报错，先用 URL 检查工具**——它直接告诉你 Google 视角下发生了什么（是否抓取过、是否被 robots.txt 拦截）
2. **用 curl 从"爬虫视角"验证**——分别请求域名根和子路径下的文件，对比状态码差异
3. **理解站点的部署形态**——用 `git remote -v` 确认仓库名，区分用户主页站点和项目站点，很多"诡异"问题（资源 404、robots.txt 失效）都源于子路径部署

最后说明一下实际影响：robots.txt 404 对 Google 收录**没有阻碍**（404 视为允许全部）。本次修复补上的是"sitemap 自动发现"这条通道和全站抓取规则的控制力——双通道保障，避免把鸡蛋放在一个篮子里。

---

## 参考资料

- [RFC 9309 - Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
- [GitHub Pages 文档 - 创建 GitHub Pages 站点](https://docs.github.com/zh/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [hexo-generator-robotstxt - GitHub](https://github.com/hexojs/hexo-generator-robotstxt)
- [hexo-generator-sitemap - GitHub](https://github.com/hexojs/hexo-generator-sitemap)
- [怎么让个人博客能被搜索引擎搜索到（本博客前文）](/blog/posts/3273294835/)
