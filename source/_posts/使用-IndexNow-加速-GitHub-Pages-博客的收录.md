---
title: 使用 IndexNow 加速 GitHub Pages 博客的收录
toc: true
tags:
  - Hexo
  - SEO
categories: 建设博客
summary: 通过 IndexNow 协议在 CI 部署后自动向 Bing 等搜索引擎推送 URL，让新文章几分钟内被爬虫发现。
description: >-
  博客部署在 GitHub Pages 子路径后 Bing 迟迟不收录，本文介绍 IndexNow 协议的 key 验证机制、 keyLocation
  解决子路径站点的方法，以及如何在 Hexo 的 GitHub Actions 部署流程中实现全自动推送。
date: 2026-08-05 17:56:52
---

---

## 写在前面

把博客提交到 **Bing Webmaster Tools** 之后，过了几天用 `site:` 搜索，依然一个结果都搜不到。

验证通过了、sitemap 提交了、网站也完全正常，为什么 Bing 就是不收录？

这次解决问题的思路和之前不一样：**与其等爬虫来，不如主动把 URL 推给搜索引擎**。用到的技术就是 **IndexNow 协议**。本文记录 IndexNow 的原理，以及在 GitHub Pages 子路径站点上完整落地的过程——最终实现的效果是：每次 `git push` 发布文章，Bing 系列搜索引擎都会在几分钟内收到通知。

适用于所有部署在 `username.github.io/repo/` 子路径下的静态站点（Hexo、Jekyll、Hugo 同理），以及所有想理解 IndexNow 工作原理的读者。

部分内容为 ai 生成，如有错误恳请指出。

---

## 一、为什么 Bing 搜不到博客

先说结论：**网站本身没有任何问题**。逐个排查过：

| 检查项 | 结果 |
|--------|------|
| 首页可访问性 | `HTTP 200` 正常 |
| robots.txt | 允许抓取，声明了 sitemap |
| sitemap.xml | 有效，包含全部 URL |
| `noindex` 标签 | 不存在 |

网站健康、抓取配置齐全，问题出在"收录"这个环节本身，主要有三个原因：

### 1. 验证站点 ≠ 收录站点

在 Bing Webmaster Tools 里"添加并验证站点"，只是向 Bing 证明了**你拥有这个站**——Bing 并不会因此立刻来抓取，它需要自己发现并抓取页面后，才会把页面放进索引。验证是"开通账号"，收录是"开始营业"，两者之间隔着一次爬虫抓取。

### 2. GitHub Pages 域名收录天然慢

`github.io` 子域名是社区公认的"收录困难户"：新站无权重、爬虫来得少，在 Bing 上的收录周期比普通域名长得多。即使一切配置正确，等 1~4 周也属正常。

### 3. 等待是被动的

sitemap 的本质是"挂一个清单等爬虫来读"——Bing 何时来读、读不读，站长无法控制。有没有办法让搜索引擎**立刻知道**"我发新文章了"？这就是 IndexNow 要解决的问题。

---

## 二、IndexNow：主动把 URL 推给搜索引擎

**IndexNow** 是微软 Bing 与 Yandex 于 2021 年推出的开放协议，核心思想非常直接：站长在发布新内容时，**主动调用一个 API 通知搜索引擎**"这个 URL 是新内容"，搜索引擎收到后会在几分钟到几小时内来抓取，而不是坐等周期性的爬虫巡站。

目前支持 IndexNow 的引擎：

| 类型 | 参与者 |
|------|--------|
| 搜索引擎 | Bing、Yandex、Naver、Seznam、Yep |
| 其他服务 | Internet Archive（网页存档）、Amazonbot |

> 顺带一提：Copilot、DuckDuckGo 等 AI 搜索的网页结果依赖 Bing 索引，推给 Bing 相当于同时覆盖了它们。

### 与 sitemap 的对比

| 维度 | sitemap | IndexNow |
|------|---------|----------|
| 发现方式 | 被动——爬虫定期来读清单 | 主动——站长直接通知 |
| 生效速度 | 数天到数周 | 数分钟到数小时 |
| 使用成本 | 生成文件即可 | 需要一个可公开访问的 key 文件 |
| 兼容性 | 所有主流引擎 | 仅 Bing 阵营 |

两者不是二选一：**sitemap 是地基，IndexNow 是加速器**，可以共存。

---

## 三、工作原理：一次推送的完整流程

要理解 IndexNow，关键在于想清楚一个问题：**搜索引擎凭什么相信"你推送的 URL 是你自己的"？** 答案藏在整个流程里——完整走一遍，只有三步：

1. **生成 key**：一个随机字符串
2. **公开 key 文件**：把 key 写进以 key 命名的文本文件 `{key}.txt`，放在你的站点上——文件内容就是 key 本身
3. **提交**：调用 API，把 key 和 URL 列表一起发过去

提交之后，搜索引擎会**回头访问你的 key 文件**：文件能访问、内容与提交的 key 一致，就证明推送者能控制站点文件——而能控制站点文件的人，就等于拥有这个站。验证通过，URL 进入优先抓取队列，爬虫会在几分钟到几小时内上门。

> 所以 key 本身不是秘密（它必须通过公开 URL 可读），它实际是"文件路径即所有权证明"的机制。

理解了整体流程，再看两个直接影响落地的细节：key 文件放在哪（`keyLocation`），以及提交时 API 的格式与响应。

### 1. key 文件放哪里：主机根目录 vs keyLocation

协议默认要求 key 文件放在**主机根目录**，即 `https://<主机域名>/` 这个路径最浅的位置：

```text
https://<主机域名>/{key}.txt
```

但对 GitHub Pages **项目站点**来说有个问题：站点内容在 `https://littlefish04.github.io/blog/` 子路径下，而主机根 `https://littlefish04.github.io/` 是由**另一个仓库**（`<用户名>.github.io`）托管的——为了一个验证文件去维护另一个仓库，太不划算。

好在协议提供了 **`keyLocation` 参数**：key 文件可以放在**同一主机的任意位置**，只要提交时告诉搜索引擎文件在哪：

```json
{
  "host": "littlefish04.github.io",
  "key": "6e5da5d584821d297d08c0c663a30064084034141a72eed8ecfbd4e26abe5d90",
  "keyLocation": "https://littlefish04.github.io/blog/6e5da5d584821d297d08c0c663a30064084034141a72eed8ecfbd4e26abe5d90.txt",
  "urlList": [
    "https://littlefish04.github.io/blog/",
    "https://littlefish04.github.io/blog/posts/1551216519/"
  ]
}
```

可以看到：`keyLocation` 指向 `/blog/` 下的 key 文件，URL 列表也都属于 `/blog/` 子路径。对项目站点来说，key 文件放进博客自己的部署产物、用 `keyLocation` 指定，就完全不需要动根仓库。

### 2. 提交 API：请求格式与响应码

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '<上面的 JSON>'
```

| HTTP 码 | 含义 |
|---------|------|
| 200 / 202 | 已接受（注意：IndexNow 采用**异步验证**——202 只代表请求被接收，key 是否有效是后台再验证的，详见踩坑记录坑 2） |
| 400 | 请求格式无效 |
| 403 | key 无效（key 文件未找到或内容不匹配） |
| 422 | URL 不属于该 host 或 key 格式不符 |
| 429 | 请求过多，被限流 |

---

## 四、在 GitHub Pages（Hexo）上落地

### 整体设计

博客的部署链路是：`git push main` → GitHub Actions 构建 → 发布到 gh-pages 分支 → 线上 `https://littlefish04.github.io/blog/`。IndexNow 要做的两件事——生成 key 文件、推送 URL——都嵌在这条链路里：

```text
CI 构建产物（public/）
  ├─ 部署前：echo key > public/{key}.txt    ← key 文件随产物一起上传
  ├─ 部署：上传 public/ 到 gh-pages
  └─ 部署后：读取 public/sitemap.xml，提取全部 URL，POST 给 api.indexnow.org
```

之后每次发文章，`git push` 就会自动触发一次推送，**零手动操作**。

### Step 1：生成 key

```bash
openssl rand -hex 32
# 例如输出：6e5da5d584821d297d08c0c663a30064084034141a72eed8ecfbd4e26abe5d90
```

`openssl rand -hex 32` 生成 32 字节随机数，输出 64 个 hex 字符；协议只要求 8~128 个字符，这个长度绰绰有余。

### Step 2：把 key 存为 GitHub Secret

仓库 → Settings → Secrets and variables → Actions → **New repository secret**：

- Name：`INDEXNOW_KEY`
- Secret：上一步生成的 key

key 存进 Secret 后，工作流里就能用 `${{ secrets.INDEXNOW_KEY }}` 引用它。

### Step 3：修改部署工作流 `pages.yml`

整个改动只有两个步骤，分别插在部署步骤的一前一后。

**部署前：生成 key 文件**

在 Hexo 构建步骤**之后**、部署步骤**之前**，插入：

```yaml
# 生成 IndexNow key 文件（必须在部署前生成，随构建产物一起上传）
- name: Generate IndexNow key file
  run: echo "${{ secrets.INDEXNOW_KEY }}" > public/"${{ secrets.INDEXNOW_KEY }}".txt
```

`echo` 把 key 写进 `public/` 下以 key 命名的 `.txt` 文件，key 文件由此进入构建产物、随站点一起上线。**必须赶在部署步骤之前**——部署是"拍照上传"，构建产物是什么样，线上就是什么样；这一步放晚了，线上就没有 key 文件（正是踩坑记录坑 1 踩过的坑）。

**部署后：推送 URL**

在部署步骤**之后**，插入：

```yaml
# 通过 IndexNow 推送全部 URL 给搜索引擎（Bing / Yandex / Naver 等）
- name: Submit URLs via IndexNow
  env:
    INDEXNOW_KEY: ${{ secrets.INDEXNOW_KEY }}
  run: |
    python3 - <<'EOF'
    import json, sys, time, urllib.request, urllib.error

    key = "${{ secrets.INDEXNOW_KEY }}"
    host = "littlefish04.github.io"
    key_location = f"https://{host}/blog/{key}.txt"

    # 1) 从构建产物中提取全部 URL（含去重）
    urls = []
    with open("public/sitemap.xml", encoding="utf-8") as f:
        for line in f:
            start = line.find("<loc>")
            if start != -1:
                urls.append(line[start + 5 : line.find("</loc>")])
    urls = list(dict.fromkeys(urls))

    # 2) 等待 CDN 缓存生效（key 文件刚部署上线，最长等 5 分钟）
    for _ in range(10):
        try:
            content = urllib.request.urlopen(key_location, timeout=10).read().decode()
            if content.strip() == key:
                print("key 文件已上线")
                break
        except Exception:
            pass
        time.sleep(30)

    # 3) 推送 URL 列表
    payload = {
        "host": host,
        "key": key,
        "keyLocation": key_location,
        "urlList": urls,
    }
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"IndexNow 已接受: HTTP {resp.status}, 共推送 {len(urls)} 个 URL")
    except urllib.error.HTTPError as e:
        print(f"IndexNow FAILED: HTTP {e.code}")
        print(e.read().decode(errors="ignore"))
        sys.exit(1)
    EOF
```

脚本按注释的 1) 2) 3) 拆成三段，逐段来看：

**① 提取 URL**

```python
# 1) 从构建产物中提取全部 URL（含去重）
urls = []
with open("public/sitemap.xml", encoding="utf-8") as f:
    for line in f:
        start = line.find("<loc>")
        if start != -1:
            urls.append(line[start + 5 : line.find("</loc>")])
urls = list(dict.fromkeys(urls))
```

直接从构建产物 `public/sitemap.xml` 里读 `<loc>` 标签，**不依赖线上 CDN**——刚部署完就去请求线上 sitemap 可能读到旧缓存，本地产物永远是最新的；`dict.fromkeys` 顺带去重（O(n) 单次遍历）。

**② 等待 key 文件上线**

```python
# 2) 等待 CDN 缓存生效（key 文件刚部署上线，最长等 5 分钟）
for _ in range(10):
    try:
        content = urllib.request.urlopen(key_location, timeout=10).read().decode()
        if content.strip() == key:
            print("key 文件已上线")
            break
    except Exception:
        pass
    time.sleep(30)
```

GitHub Pages 有 CDN 缓存，key 文件刚部署时可能暂时 404；而 `keyLocation` 文件不可访问时提交会被拒绝（403）。所以先循环探测：每 30 秒访问一次 key 文件，直到可访问且内容匹配才继续，最多等 10 次（5 分钟）。这个等待很有必要。

**③ 发起推送**

```python
# 3) 推送 URL 列表
payload = {
    "host": host,
    "key": key,
    "keyLocation": key_location,
    "urlList": urls,
}
req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json; charset=utf-8"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"IndexNow 已接受: HTTP {resp.status}, 共推送 {len(urls)} 个 URL")
except urllib.error.HTTPError as e:
    print(f"IndexNow FAILED: HTTP {e.code}")
    print(e.read().decode(errors="ignore"))
    sys.exit(1)
```

`POST` 到 `api.indexnow.org`，payload 结构与第三章的 JSON 完全一致。注意两个细节：`host` 填**域名根**（`littlefish04.github.io`，不带 `/blog` 路径），`keyLocation` 指向 `/blog/` 下的文件；异常时打印错误并 `sys.exit(1)`，让 CI 步骤以失败告终，避免"假成功"。

### Step 4：push 触发并验证

```bash
git add .
git commit -m "Add: 配置 IndexNow 自动推送"
git push
```

部署完成后，验证三件事：

**1. key 文件已上线**——请求 key 文件，应返回 200 且内容与 key 一致：

```bash
curl https://littlefish04.github.io/blog/6e5da5d5....txt
```

**2. CI 日志中推送步骤输出 202/200**——本次部署的 Actions 日志里应出现：

```
IndexNow 已接受: HTTP 202, 共推送 25 个 URL
```

**3. Bing 侧出现提交记录**——在 Bing Webmaster Tools 的抓取统计/IndexNow 报告中找到本次提交；之后 Bingbot 会在几小时到几天内来抓取。

---

## 五、踩坑记录

### 坑 1：key 文件生成步骤放在部署步骤之后，推送"假成功"

第一次配置时，把生成 key 的步骤放在了部署（`Deploy to gh-pages`）**之后**——步骤本身执行成功，但**生成的文件赶不上部署**，线上 key 文件 404，推送的所有 URL 全被丢弃。

排查过程：gh-pages 分支文件树里搜不到 key 文件 → 定位到步骤顺序问题。

> **教训：凡是需要随部署产物一起上线的文件，生成步骤必须在部署步骤之前。** 部署是"拍照上传"——构建产物是什么样，线上就是什么样。

### 坑 2：HTTP 202 是异步验证，"成功"不代表 key 有效

文档写明成功响应码是 200，但实际 API 返回的是 **202 Accepted**——IndexNow 现在采用**异步验证**：请求先被接收（202），key 文件是否有效是后台再验证的。这意味着即使 key 文件 404、请求会被后台丢弃，API 依然返回 202，CI 依然显示成功。

> **教训：验证推送是否真实有效，核心指标是"key 文件线上可访问"。** 手动 `curl` 确认 key 文件返回 200 且内容匹配，推送才有意义。

---

## 六、Google 侧怎么办

重要事实：**Google 不参与 IndexNow**。它从 2021 年测试至今始终未正式加入，原因是 Google 认为自己的爬虫发现新内容已经足够高效，且推送式索引会绕过它的质量评估机制。

Google 的替代方案：

1. **Search Console**：添加站点 → 验证 → 提交 sitemap（前两篇博客已经覆盖）
2. **URL 检查工具**：对单个 URL 点"请求编入索引"，相当于手动催抓

> 注意 Google 的 Indexing API 只对**招聘信息（JobPosting）**和**直播内容（BroadcastEvent）**开放，普通博客提交会被视为滥用，不要尝试。

所以 SEO 的正确姿势是**双线并行**：Google 走 Search Console + sitemap，Bing 阵营走 IndexNow + sitemap，两边互不影响。

---

## 七、总结

这次配置 IndexNow 收获的有价值认知：

> **IndexNow = 主动推送 + key 文件所有权验证 + keyLocation 解决子路径站点。** 协议本身很轻，真正的工作量在 CI 自动化——把"生成 key 文件"和"推送 URL"嵌入部署流程后，发布文章就是一次 `git push` 的事。

可复用的经验：

1. **key 文件位置由协议默认（主机根）决定，但子路径站点用 `keyLocation` 参数即可解决**，不需要因此去维护另一个仓库
2. **构建产物的文件顺序问题**：凡是要随站点发布的文件，必须在部署步骤前生成
3. **异步验证类 API 的"成功"要打问号**：202 只代表请求被接收，效果要靠线上 key 文件可访问性来保证

预期效果：Bing 及 AI 搜索（Copilot、DuckDuckGo）会在新文章发布后几分钟到几小时内发现内容；**收录本身**（进入索引）仍然需要几周时间，这是正常过程。配合前两篇的 sitemap 与 robots.txt 配置，三篇合起来就是一套完整的 GitHub Pages 站点 SEO 方案：

1. [怎么让个人博客能被搜索引擎搜索到](/blog/posts/3273294835/) —— sitemap 生成与提交
2. [GitHub Pages 项目站点的 robots.txt 失效问题排查](/blog/posts/3735927058/) —— 域名根 robots.txt 修复
3. 本文 —— IndexNow 主动推送加速收录

---

## 参考资料

- [IndexNow 官方文档](https://www.indexnow.org/documentation)
- [Bing IndexNow 入门指南](https://www.bing.com/indexnow/IndexNowView/IndexNowGetStartedView)
- [Bing Webmaster Tools](https://www.bing.com/webmasters/)
- [indexnow-action（GitHub Action 现成方案，GitHub Pages 场景可参考）](https://github.com/bojieyang/indexnow-action)
