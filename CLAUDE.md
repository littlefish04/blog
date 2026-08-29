# CLAUDE.md

> 此文件由 AI 维护和更新。如果会话中某些内容被迭代更改，AI 应及时修改此文件。如果 AI 认为某些信息非常常用、需要跨会话保留，也应主动加入此文件。保持内容精简，只包含常用信息。

## 项目概况

- **Hexo 静态博客** v8.1.2，部署于 GitHub Pages
- **站点 URL**：`https://littlefish04.github.io/blog`
- **根路径**：`/blog/`（所有资源引用需加此前缀）
- **主题**：Anatolo（Pug 模板 + Stylus 样式 + TypeScript 前端）
- **主题配置**：`_config.Anatolo.yml`（评论、导航、社交链接等）
- **GitHub 仓库**：`littlefish04/blog`（项目站点，部署到 `https://littlefish04.github.io/blog/`）
- **部署**：实际工作流是 git push 到 main 分支 → CI 自动部署到 gh-pages 分支（不用 `hexo deploy`）；仓库未配置 `hexo deploy` 对应的 git 部署 URL
- **CI/CD**：push 到 main 分支自动触发 GitHub Actions 部署（`.github/workflows/pages.yml`）
- **域名根**：`https://littlefish04.github.io/` 由独立仓库 `littlefish04/littlefish04.github.io` 托管（存放根 robots.txt 和跳转页）

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
- **⚠️ 必坑**：Front Matter **必须显式写 `abbrlink`**（如 `abbrlink: 4223884717`）。若缺省，hexo-abbrlink 会在 `before_post_render` 阶段才回填，而渲染器此时从模型克隆出的 Post 副本没有 abbrlink，图片 src 会变成 `/blog/posts/undefined/xxx.png`（部署后图片全挂，但文章 URL 和资源文件路径却正常，极难排查）。修复方法：用 `hexo generate` 输出的 `Generate link [xxx]` 或插件回填值补进 Front Matter 后重新构建

## 关键插件

| 插件 | 用途 |
|------|------|
| hexo-abbrlink | 文章永久链接，修改标题不影响链接 |
| hexo-auto-front-matter | 自动生成 date 和 title |
| hexo-generator-sitemap | 生成 sitemap.xml |
| hexo-generator-robotstxt | 生成 robots.txt |
| hexo-filter-nofollow | 外链添加 nofollow |
| hexo-renderer-marked | Markdown 渲染（支持 postAsset） |
| hexo-filter-mathjax | 数学公式渲染（注入 MathJax CDN） |

## SEO 配置

- sitemap 路径：`sitemap.xml`、`sitemap-articles.xml`
- robots.txt 提交了 sitemap 地址
- 全站外链自动添加 `nofollow`
- **IndexNow 自动推送**（Bing/Yandex/Naver 等）：部署工作流 `pages.yml` 在部署后自动生成 key 文件并推送 sitemap 全部 URL
  - key 存于 GitHub Secret `INDEXNOW_KEY`（64 字符 hex），勿明文写入仓库
  - key 文件位置：`https://littlefish04.github.io/blog/{key}.txt`（子路径即可，推送时通过 `keyLocation` 参数指定，无需放域名根）
  - 端点：`POST https://api.indexnow.org/indexnow`；响应 202 已接受（异步验证，200 亦为成功）、403 key 无效、422 URL 不属于该 host
  - **注意**：Generate key 步骤必须在 Deploy 步骤**之前**（随构建产物一起上传，否则 key 文件 404、推送无效）
  - key 文件生成用 `printf '%s'` 而非 `echo`（echo 追加换行符，IndexNow 严格比对时可能失败）
  - **排障**：若 key 文件线上 200、内容正确、无重定向却持续 403 `UserForbiddedToAccessSite`，多为 IndexNow/Bing 缓存了该 key 的失败验证状态（常见触发：部署窗口期 key 文件短暂 404 时 IndexNow 恰好重新验证）。**解决：换新 key**（`openssl rand -hex 32` 生成新 64 位 hex，更新 GitHub Secret `INDEXNOW_KEY`，新文件名 = 全新 URL = 无历史状态，立即生效）。Bing Webmaster Tools 的 XML 站点验证与 IndexNow key 验证是两套独立系统，不影响此问题
  - Google 不支持 IndexNow，Google 侧需在 Search Console 单独提交 sitemap

## 文章图片配置

- **资源文件夹**：`post_asset_folder: true`，每篇文章的图片等资源放在同名文件夹内
- **引用文章图片**：`![描述](文件名.png)`（Markdown 语法可用，`marked.postAsset: true` 会自动改写为 `/blog/posts/:abbrlink/文件名`；`{% asset_img %}` 亦可）
