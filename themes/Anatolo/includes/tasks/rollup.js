const cp = require('child_process');

// 直接用 node 调用主题本地的 rollup，等价于 package.json 里的
// `pnpm build` / `pnpm watch`（这两个脚本本身就只是 rollup 命令）。
// 不经 pnpm 的原因：CI 用 pnpm 9 正常，但本地 pnpm 11 会因状态数据库
// 无法打开而报 "unable to open database file"，导致整个构建失败。
const rollupBin = require.resolve('rollup/dist/bin/rollup');
const rollupCmd = `"${process.execPath}" "${rollupBin}" -c ./rollup.config.mjs`;

/** @param {import("hexo")} hexo */
module.exports = function (hexo) {
  if (hexo.env?.cmd?.startsWith('n')) {
    return;
  }
  if (hexo.env?.cmd === 's' || hexo.env?.cmd === 'server') {
    hexo.log.info('Starting js watch changer...');
    cp.exec(`${rollupCmd} -w`, { cwd: './themes/Anatolo', stdio: 'inherit' });
  } else {
    hexo.log.info('Building js...');
    cp.execSync(rollupCmd, { cwd: './themes/Anatolo', stdio: 'inherit' });
    hexo.log.info('Build successful!');
  }
};
