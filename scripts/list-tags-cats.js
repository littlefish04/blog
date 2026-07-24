/**
 * Hexo 辅助脚本：汇总博客中所有已有的 tags 和 categories
 *
 * 用法：
 *   hexo tags-cats          → 在终端打印所有 tags 和 categories
 *   hexo tags-cats --file   → 生成 source/_posts/_标签分类参考.md 文件
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function extractFrontMatter(content) {
  // 匹配 YAML front matter（--- ... ---）
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return { tags: [], categories: [] };
  try {
    const data = yaml.load(match[1]);
    return {
      tags: data.tags || [],
      categories: data.categories || [],
      title: data.title || ''
    };
  } catch {
    return { tags: [], categories: [] };
  }
}

function scanAllPosts(sourceDir) {
  const postsDir = path.join(sourceDir, '_posts');
  if (!fs.existsSync(postsDir)) {
    console.log('source/_posts/ 目录不存在');
    return { tags: new Map(), categories: new Map() };
  }

  const tagsMap = new Map();       // tag → 文章数
  const categoriesMap = new Map(); // category → 文章数

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md') && entry.name !== '_标签分类参考.md') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { tags, categories } = extractFrontMatter(content);
        for (const tag of tags) {
          tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
        }
        if (categories) {
          const cat = typeof categories === 'string' ? categories : categories;
          categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
        }
      }
    }
  }

  walk(postsDir);
  return { tags: tagsMap, categories: categoriesMap };
}

// ---- 注册 Hexo 控制台命令 ----
hexo.extend.console.register('tags-cats', '列出博客中所有已有的 tags 和 categories', {
  options: [
    { name: '-f, --file', desc: '生成 source/_posts/_标签分类参考.md 文件' }
  ]
}, function (args) {
  const sourceDir = hexo.source_dir;
  const { tags, categories } = scanAllPosts(sourceDir);

  // 排序：按文章数量降序
  const sortedTags = [...tags.entries()].sort((a, b) => b[1] - a[1]);
  const sortedCats = [...categories.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedTags.length === 0 && sortedCats.length === 0) {
    console.log('📭 还没有任何 tags 或 categories');
    return;
  }

  // ---- 终端输出 ----
  console.log('\n📌 ========== 已有 Categories（分类）==========');
  for (const [cat, count] of sortedCats) {
    console.log(`  📁 ${cat.padEnd(20)} (${count} 篇)`);
  }

  console.log('\n🏷️  ========== 已有 Tags（标签）==========');
  for (const [tag, count] of sortedTags) {
    console.log(`  # ${tag.padEnd(20)} (${count} 篇)`);
  }
  console.log('');

  // ---- 生成 Markdown 文件 ----
  if (args.file) {
    let md = `# 标签 & 分类速查表\n\n`;
    md += `> 🤖 此文件由 \`hexo tags-cats --file\` 自动生成，每次运行会覆盖更新。\n\n`;
    md += `> 💡 写文章时，打开此文件作为参考，复制你需要的 tag/category 名到 front matter 中。\n\n`;

    md += `## 分类（Categories）—— 共 ${sortedCats.length} 个\n\n`;
    if (sortedCats.length > 0) {
      md += `| 分类 | 文章数 | 复制 |\n`;
      md += `|------|--------|------|\n`;
      for (const [cat, count] of sortedCats) {
        md += `| ${cat} | ${count} | \`categories: ${cat}\` |\n`;
      }
    } else {
      md += `暂无\n`;
    }

    md += `\n## 标签（Tags）—— 共 ${sortedTags.length} 个\n\n`;
    if (sortedTags.length > 0) {
      md += `| 标签 | 文章数 | 复制 |\n`;
      md += `|------|--------|------|\n`;
      for (const [tag, count] of sortedTags) {
        md += `| ${tag} | ${count} | \`  - ${tag}\` |\n`;
      }
    } else {
      md += `暂无\n`;
    }

    const outputPath = path.join(hexo.base_dir, '_标签分类参考.md');
    fs.writeFileSync(outputPath, md, 'utf-8');
    console.log(`📄 已生成参考文件：${outputPath}`);
  }

  console.log('💡 提示：运行 hexo tags-cats --file 可生成参考 Markdown 文件\n');
});
