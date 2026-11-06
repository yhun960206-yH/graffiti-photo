// 发布：node tools/publish.mjs [这次改了什么]（publish.cmd 调用它）
// 取回线上的改动 → 生成网页 → 收进新出现的字 → 提交 → 推送到 GitHub
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tool = (p, fallback) => (existsSync(p) ? p : fallback);
const GIT = tool(join(homedir(), 'tools', 'mingit', 'cmd', 'git.exe'), 'git');
const NODE = process.execPath;
const PROXY = 'http://127.0.0.1:7897';
const env = { ...process.env, HTTPS_PROXY: process.env.HTTPS_PROXY || PROXY, HTTP_PROXY: process.env.HTTP_PROXY || PROXY };
const run = (cmd, args, quiet) => execFileSync(cmd, args, { cwd: root, env, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
const msg = process.argv.slice(2).join(' ') || '更新文案';
const fontsSrc = join(root, '..', '_fonts-src');

try {
  console.log('[1/4] 取回线上的改动');
  // pages and fonts are rebuilt in step 2 anyway: drop the local copies (a proofing build leaves them changed),
  // so they never block the pull; anything else you changed by hand is set aside and put back (--autostash)
  run(GIT, ['checkout', '--', 'series', 'fonts'], true);
  run(GIT, ['pull', '--ff-only', '--autostash', '-q']);
  console.log('[2/4] 生成网页');
  run(NODE, ['tools/build-series.mjs']);
  if (existsSync(join(fontsSrc, 'NotoSerifSC-VF.ttf'))) {
    console.log('[3/4] 字体：收进新出现的字');
    run('python', ['tools/fonts.py', fontsSrc]);
    run(NODE, ['tools/build-series.mjs'], true);
  } else console.log('[3/4] 跳过字体（没有 ../_fonts-src）');
  console.log('[4/4] 发布');
  run(GIT, ['-c', 'core.safecrlf=false', 'add', '-A']);            // no line-ending chatter
  if (!run(GIT, ['status', '--porcelain'], true).trim()) { console.log('\n没有要发布的改动。'); process.exit(0); }
  run(GIT, ['commit', '-q', '-m', msg]);
  run(GIT, ['push', '-q']);
  console.log(`\n已发布「${msg}」：约一分钟后 https://yhun960206-yh.github.io/graffiti-photo/ 更新。`);
} catch (e) {
  console.log(`\n出错了（${e.message.split('\n')[0]}），上面是 git / 生成器给出的原因。没有推送任何东西。`);
  process.exit(1);
}
