'use strict';

/**
 * 注册汇编（assembly）语言到 Hexo 共用的 highlight.js 实例。
 *
 * 背景：highlight.js v11 默认只加载常用语言包（common bundle），不含 x86asm；
 * hexo-util 的 highlight_alias.json 里也没有 asm / assembly 别名。
 * 因此 ```asm 围栏会被 hexo-util 降级为 plaintext，代码块完全不上色。
 *
 * Hexo 启动时会自动加载 scripts/ 目录下的脚本，而且此时 require 的
 * highlight.js 与 hexo-util 内部延迟 require 的是同一个模块实例，
 * 所以这里注册后，站内所有 ```asm 代码块即可正常高亮。
 * （若要改配色，见 themes/Anatolo/source/css/github-content.css）
 */

const hljs = require('highlight.js');

// x86 汇编（Intel/NASM 语法），一个语法定义同时注册到常见别名上。
// hexo-util 会把围栏语言统一转小写，所以 ASM/Asm 等大小写写法也能命中。
const x86asm = require('highlight.js/lib/languages/x86asm');
for (const name of ['x86asm', 'asm', 'assembly', 'x86', 'nasm', 'masm']) {
  hljs.registerLanguage(name, x86asm);
}

// highlight_alias.json 已收录、但默认构建同样未注册的汇编家族。
// 若不注册，hexo-util 会因为别名命中而跳过 plaintext 兜底，
// 调用未注册语言导致渲染抛错。
hljs.registerLanguage('armasm', require('highlight.js/lib/languages/armasm'));
hljs.registerLanguage('avrasm', require('highlight.js/lib/languages/avrasm'));
hljs.registerLanguage('mipsasm', require('highlight.js/lib/languages/mipsasm'));
