---
title: claude 转 codex cli
tags:
  - Claude Code
  - Codex
categories: AI Agent 相关
toc: true
date: 2026-08-11 16:51:27
summary: Claude Code 转 Codex CLI 迁移笔记：会话管理、AGENTS.md 配置与外部编辑器调用的对应操作。
description: >-
  本文记录了从 Claude Code 切换到 Codex CLI 的常用操作对照：如何用 /clear 与 codex resume --last
  管理会话，如何将 CLAUDE.md 迁移为 AGENTS.md（或用 project_doc_fallback_filenames 共用一份配置），
  以及如何通过 Ctrl+G 调用外部编辑器。内容参考官方仓库文档与源码整理，帮助迁移后无缝衔接日常开发。
---

---
## 写在前面

想从 claude 转用 codex cli ，想看看那些常用的简单操作有没有对应的，一搜发现基本全是劣质纯 ai 生成文章，可读性还不如直接上 codex （deepseekv4f 模型）问，怪幽默的。

这篇文章就是找 Codex 问出来的，配置完了刚好写个博客留个档，省的以后出问题了找不到当初怎么配置的了。

部分内容为 ai 生成，如有错误恳请指出。

---

## 一、会话管理

Codex 和 Claude Code 一样，会话会自动保存，退出时无需任何额外操作。

- **开启新会话**：在输入框输入 `/clear`（清屏并开始新对话）。`/new` 同样可以开启新会话，只是不会清屏。
- **恢复历史会话**（对应 Claude Code 的 `claude --continue`）：
  - `codex resume`：弹出会话选择器，挑选一个继续；
  - `codex resume --last`：直接恢复最近一次会话（最接近 `claude --continue` 的用法）；
  - 在会话内输入 `/resume` 也可以打开选择器。
- 会话选择器默认只显示当前目录下的会话，`codex resume --all` 可以查看全部历史；会话文件存放在 `~/.codex/sessions/` 目录下。
- 其他管理命令还包括 `/rename`（重命名会话）、`/archive`、`/delete`、`/fork`，命令行下对应 `codex archive`、`codex delete`、`codex fork`。

<div class="tip">
日常最常用的是 `codex resume --last`：它相当于 Claude Code 的 `claude --continue`，无需经过选择器就能直接回到上一次的工作现场。
</div>

## 二、CLAUDE.md 的对应物：AGENTS.md

Codex 的对应物是 `AGENTS.md`，每次新会话都会自动读取。查找层级自上而下合并：

1. `~/.codex/AGENTS.md` —— 个人全局说明
2. 仓库根目录的 `AGENTS.md` —— 项目级说明
3. 当前目录的 `AGENTS.md` —— 子目录细化

此外，每一层都会优先检查 `AGENTS.override.md`（优先级最高），不存在时才读取 `AGENTS.md`。

如果仓库里已经有 `CLAUDE.md`，有两种迁移方式：

- **推荐做法（长期）**：直接将其改名为 `AGENTS.md`，内容无需改动。
- **两个 Agent 共用一份**：保留 `CLAUDE.md`，在本机 `~/.codex/config.toml` 顶层添加一行：

```toml
project_doc_fallback_filenames = ["CLAUDE.md"]
```

这样当目录中不存在 `AGENTS.md` 时，Codex 会回退读取 `CLAUDE.md`。这也是笔者目前使用的方法。

<div class="tip">
`project_doc_fallback_filenames` 是逐层回退的：某个目录下没有 `AGENTS.md` 时才读取 `CLAUDE.md`，两者都存在时仍以 `AGENTS.md` 为准。
</div>

另外，Codex 还内置了两个对迁移很有帮助的命令：`/import` 可以直接导入 Claude Code 的设置、项目文件和最近的聊天记录；`/init` 可以生成一份 `AGENTS.md` 模板，方便在新项目中快速起步。

## 三、用 Ctrl+G 打开外部编辑器

在输入框中按 `Ctrl+G`，会用外部编辑器打开当前草稿；保存并关闭后，内容会回到输入框，确认无误后再发送。

编辑器优先读取 `$VISUAL` 环境变量，未设置时回退到 `$EDITOR`。Windows 上建议显式设置，比如指向 VS Code：

```powershell
$env:VISUAL = "code --wait"   # 当前会话生效
setx VISUAL "code --wait"     # 永久生效
```

第一行只对当前终端会话生效；第二行通过 `setx` 写入用户环境变量，需要重新打开终端才会生效。`notepad` 也可以作为编辑器，只是体验一般。如需自定义键位，可以在 TUI 中使用 `/keymap` 查看和调整（对应的动作名为 `open_external_editor`）。

> 补充说明：`developers.openai.com` 与 `learn.chatgpt.com` 从笔者所在网络抓取均被拒绝（403/代理错误），因此以上内容依据官方 `openai/codex` 仓库的文档与源码确认，并与本机 `codex --help` 的输出核对过，命令部分与当前安装版本一致。若个别行为存在出入，以 `codex --help` 和 TUI 内的 `/help` 为准。

## 小结

从 Claude Code 迁移到 Codex CLI，核心只需要掌握三点：

- **会话**：`/clear` 开启新会话，`codex resume --last` 快速回到最近一次会话；
- **项目说明**：把 `CLAUDE.md` 改名为 `AGENTS.md`，或用 `project_doc_fallback_filenames` 让两者共用一份；
- **编辑器**：将 `$VISUAL` 指向 `code --wait`，即可在 TUI 中用 `Ctrl+G` 调用外部编辑器。

建议在新环境中先运行 `/init` 生成 `AGENTS.md` 模板，再根据项目实际情况补充内容，之后日常使用基本可以无缝衔接。

---

## 参考资料

- [深入理解计算机系统（原书第3版） | GoClub](https://goclub.space/docs/resources/pdf-books/csapp-3e/)
