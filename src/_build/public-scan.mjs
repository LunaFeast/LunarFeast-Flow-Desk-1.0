/* ============================================================
   公开面那道清理闸（他 2026-10-11 定的新规矩第五条：推之前必须过，这一条最要紧）
   ------------------------------------------------------------
     node src/_build/public-scan.mjs --支=<这一轮那条支>        扫一遍就停：命中非零退出，列是哪一份哪一行
     node src/_build/public-scan.mjs --支=<支> --对=main        比对的那一头换一笔（默认 origin/main）

   扫的面：origin/main 到这一轮那条支之间「全部新增和修改」的每一份文本 ——
     git diff --name-only --diff-filter=AM origin/main...<支> 那份名单；
     二进制按后缀跳掉，剩下的都当文本读（名单现取，不抄第二份，也别把 本地路径.cjs 算进来 —— 它本来就不进仓）。

   查的是「这台机器自己的东西」：仓外那一格的盘符与前缀、这台机器的帐户名与家目录、私人目录名。
   串一律现场算，一份字面量都不写 —— 写死了这一颗自己就把私人信息公开在公开面上（这一条他栽过两回，
   判据必须是结构性的，不是私人字面量的清单）。
     · 现场算的：os.homedir()、os.userInfo().username、这一棵树的上一层（仓外那一格）
     · 只有这台才知道的：src\tools\本地路径.cjs 登记的那几格（它不进仓，读它的是 src\tools\本地路径.mjs）
       那一颗没登记时这一拨就少几串 —— 当场明说「这台没登记私人那一格，只查现场算得出的 N 串」，不悄悄放行。

   谁叫它：
     · src\_build\pr.mjs 在 git push 之前必须先跑这一道，不过就不推并报名字；
     · src\tools\probes\gate-tauri46.mjs 第六节读的就是这一颗 —— 判据只有一份，别处不许另抄。
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { 素材目录, 色表, 音乐目录, 工区, 存档落点, 探针沙盒, Rust工具链, Rust包缓存, Rust链接件, 编译缓存 } from '../tools/本地路径.mjs';

const HERE = import.meta.dirname;
export const TREE = path.resolve(HERE, '..', '..');
/* 只有"直接跑我"才执行命令行那一段；被 import 当零件用时一个字都不跑（跟 plugin-repos.mjs 同一规矩） */
const 被当命令跑 = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
const argv = 被当命令跑 ? process.argv.slice(2) : [];
const val = (f, d) => { const a = argv.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : d; };

/* 二进制按后缀认（后缀表跟 plugin-repos.mjs 那一颗同一套，多收几样产物类后缀） */
export const 是二进制 = 份 => /\.(dll|exe|png|jpg|jpeg|gif|webp|ico|zip|7z|gz|woff2?|ttf|otf|eot|mp3|mp4|wav|flac|pdf|so|node|pdb|lib|obj|a|o|bin|dat|pak|icns|class|jar|ttc)$/i.test(份);
/* 这一颗不算扫描面：它本来就不进仓（.gitignore 第六节），公开面上读不到它，扫它只会把这台的位置当"命中"报出来 */
export const 不扫 = new Set(['src/tools/本地路径.cjs', 'src/tools/本地路径.mjs']);

/* 第 2 层那几个名字太通用（写在哪都常见、认了全是误报），比的时候一律先转小写 */
const 通用段 = new Set(['users', 'user', 'programs', 'windows', 'system32', 'appdata', 'local', 'roaming',
  'temp', 'src', 'bin', 'lib', 'data', 'node_modules', 'target', 'cargo', 'rustup', 'rust', 'mingw', 'gcc',
  'music', 'documents', 'downloads', 'desktop', 'x64', 'x86', 'tools', 'include', 'share', 'etc']);

/* ---------- 要查的那一串串：全部现场算 ----------
   三拨：
     ① 整串与它的前缀（从「盘 + 第一层」起，盘符单写不算 —— 那会命中每一句 `D:/` 之类的正则片段）；
     ② 第 2 层那一段的名字（通用词表里的不算：Programs / Users 这类写在哪都太常见，认了就是误报）；
     ③ 第 3 层那一段里「带空格或有非英文字符」的（那种名字一看就是这台自己起的）；
     ④ 这台机器的 Windows 帐户名（现场取）。 */
function 登记值(){
  return [['素材目录', 素材目录], ['色表', 色表], ['音乐目录', 音乐目录], ['工区', 工区], ['存档落点', 存档落点],
    ['探针沙盒', 探针沙盒], ['Rust工具链', Rust工具链], ['Rust包缓存', Rust包缓存], ['Rust链接件', Rust链接件], ['编译缓存', 编译缓存]]
    .map(([由来, 值]) => ({ 由来, 值: String(值 || '').trim() }))
    .filter(x => /^[A-Za-z]:[\\/]/.test(x.值));
}
const 切段 = p => String(p).split(/[\\/]+/).filter(Boolean);
function 拼(盘, 段, 到, 符){ return 盘 + 符 + 段.slice(1, 到).join(符); }

export function 私人串清单(){
  const 出 = [];
  const 加 = (串, 由来) => {
    const s = String(串 == null ? '' : 串).trim();
    if(s.length < 3) return;
    if(!出.some(x => x.串 === s)) 出.push({ 串: s, 由来 });
  };
  const 两面 = (p, 由来) => { 加(p.split(/[\\/]+/).join('\\'), 由来); 加(p.split(/[\\/]+/).join('/'), 由来); };
  const 整串与前缀 = (p, 由来) => {
    const 段 = 切段(p), 盘 = 段[0];
    if(段.length < 2) return;
    for(let 到 = 2; 到 <= 段.length; 到++){ 两面(拼(盘, 段, 到, '/'), 由来); 两面(拼(盘, 段, 到, '\\'), 由来); }
  };
  const 名字 = (p, 由来) => {
    const 段 = 切段(p);
    const 第二 = 段[1];
    if(第二 && !通用段.has(第二.toLowerCase())) 加(第二, 由来 + ' 那一格的第 2 层名字');
    const 第三 = 段[2];
    if(第三 && !通用段.has(第三.toLowerCase()) && (/[\s\u4e00-\u9fff]/.test(第三))) 加(第三, 由来 + ' 那一格的私人目录名');
  };

  /* ① 现场那一摊：家目录、帐户名、仓外那一格（这一棵树的上一层） */
  const 家 = os.homedir();
  const 户 = (() => { try{ return os.userInfo().username; }catch(e){ return ''; } })();
  const 上一层 = path.dirname(TREE);
  整串与前缀(家, '这台机器的家目录');
  名字(家, '这台机器的家目录');
  整串与前缀(上一层, '仓外那一格（这一棵树的上一层）');
  名字(上一层, '仓外那一格（这一棵树的上一层）');
  加(户, '这台机器的 Windows 帐户名');

  /* ② 这台自己登记的那几格 */
  const 登 = 登记值();
  for(const x of 登){ 整串与前缀(x.值, '本地登记的「' + x.由来 + '」'); 名字(x.值, '本地登记的「' + x.由来 + '」'); }
  /* 这一棵树旁边那一格插件铺的仓（OUT 那一格）：同一块盘、仓外那一格，串从「上一层 + 那一格的名字」现算，
     不把字面量写进这一份（写了这一颗自己就漏） */
  两面(path.join(上一层, path.basename(TREE) + '-plugins'), '仓外那一格旁边那一棵');

  return { 串: 出, 登记了: 登.length, 现场算的: [家, 户, 上一层] };
}

/* ---------- 一台文本：逐行比，命中就记「哪一份哪一行」 ---------- */
const 小 = s => String(s).toLowerCase();
export function 扫文本(文, 串表){
  const 中 = [];
  const 行 = String(文 == null ? '' : 文).split(/\r?\n/);
  const 纯ASCII = 串表.map(x => ({ ...x, ascii: /^[\x20-\x7e]+$/.test(x.串) }));
  for(let i = 0; i < 行.length; i++){
    const 一 = 行[i];
    if(!一.trim()) continue;
    for(const x of 纯ASCII){
      const 命中 = x.ascii ? 小(一).includes(小(x.串)) : 一.includes(x.串);
      if(命中){ 中.push({ 行号: i + 1, 串: x.串, 由来: x.由来, 原行: 一.trim().slice(0, 90) }); break; }
    }
  }
  return 中;
}

/* ---------- git：只读 ---------- */
function gitR(args){
  return execFileSync('git', ['-C', TREE, '-c', 'core.quotepath=false', ...args],
    { encoding:'utf8', env:{ ...process.env, GIT_TERMINAL_PROMPT:'0' }, stdio:['ignore','pipe','pipe'] }).trim();
}
/* 扫描面：origin/main 到这一轮那条支之间新增与修改的每一份（现取，不抄第二份名单） */
export function 扫描面(支, 对 = 'origin/main'){
  const 名单 = gitR(['diff', '--name-only', '--diff-filter=AM', '-z', 对 + '...' + 支]).split('\0').filter(Boolean);
  return [...new Set(名单)].filter(f => !是二进制(f) && !不扫.has(f.split(path.sep).join('/')));
}
const 盘上或支上 = (支, 份) => {
  try{ return gitR(['show', 支 + ':' + 份]); }catch(e){ return null; }
};

/* 整道闸：返回 { 扫了几份, 命中:[{份,行号,串,由来,原行}], 串数, 登记了 } —— 读的是那一条支上的字节（不是盘上那份） */
export function 跑闸(支, 对 = 'origin/main'){
  const { 串, 登记了 } = 私人串清单();
  const 面 = 扫描面(支, 对);
  const 命中 = [];
  let 读了 = 0;
  for(const 份 of 面){
    const 文 = 盘上或支上(支, 份);
    if(文 === null) continue;
    if(/\0/.test(文)) continue;                                  /* 后缀认不出但内容带 NUL 的，也算二进制跳掉 */
    读了++;
    for(const h of 扫文本(文, 串)) 命中.push({ 份, ...h });
  }
  return { 面: 面.length, 读了, 命中, 串数: 串.length, 登记了 };
}

if(被当命令跑){
  const 支 = val('--支', '');
  const 对 = val('--对', 'origin/main');
  if(!支){ console.error('停下来：要配 --支=<这一轮那条支>（扫的是 ' + 对 + ' 到那一条支之间新增和修改的每一本文本）'); process.exit(2); }
  const { 串, 登记了 } = 私人串清单();
  if(!串.length){ console.error('停下来：一串都没算出来，这一道闸等于没装 —— 别放过任何东西'); process.exit(2); }
  console.log('公开面那道闸：比 ' + 对 + ' … ' + 支 + ' · 要查 ' + 串.length + ' 串' +
    (登记了 ? '（本地登记 ' + 登记了 + ' 格）' : '（这台没本地登记，只查现场算得出的这一拨）'));
  let 量;
  try{ 量 = 跑闸(支, 对); }
  catch(e){ console.error('停下来：扫描面问不出来（' + 对 + ' 那一笔在不在？）：' + String((e && e.stderr) || (e && e.message) || e).split(/\r?\n/)[0]); process.exit(2); }
  console.log('扫了 ' + 量.读了 + ' 本文本（名单 ' + 量.面 + ' 份，二进制与不进的份已跳过）');
  if(!量.命中.length){ console.log('一处都没命中 —— 这一道过了。'); process.exit(0); }
  console.error('\n命中 ' + 量.命中.length + ' 处，这一轮不许推：');
  for(const h of 量.命中) console.error('  ' + h.份 + ':' + h.行号 + ' · ' + h.串 + '（' + h.由来 + '）· ' + h.原行);
  console.error('\n把上面这些行里的本机位置换成占位写法（<帐户名>、仓外那一格、别处 那类），改完重跑这一道。');
  process.exit(1);
}
