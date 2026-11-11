const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
for (const name of ['lib', 'camera.js']) {
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
fs.cpSync(path.join(root, 'magic-stickers'), path.join(out, 'magic-stickers'), {
  recursive: true,
  filter: file => !/\.(?:cjs|md)$/i.test(file)
});
fs.writeFileSync(path.join(out, 'index.html'), '<meta charset="utf-8"><meta http-equiv="refresh" content="0;url=magic-stickers/portal.html"><a href="magic-stickers/portal.html">打开魔法集市</a>');
fs.writeFileSync(path.join(out, '_headers'), '/*\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n');
fs.writeFileSync(path.join(out, 'deployment.json'), JSON.stringify({ commit: process.env.CF_PAGES_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || 'local', builtAt: new Date().toISOString() }));
console.log('Window site built in dist/');
