/* ============================================================
   开一条支、落笔、推支、开 PR —— 这一整手只住在这一颗里
   ------------------------------------------------------------
     node src/_build/pr.mjs --提交PR        一整手：同步远程 main → 基于本地 main 开那条支 → 这一轮的改动落上去 →
                                            公开面那道闸 → 等他亲手敲一个「推」字 → 推那条支 → 建 PR → 建完就停
     node src/_build/pr.mjs --开支落笔      只走本地那一半：同步（可 --不同步）→ 开支 → 落笔，不扫不推不建 PR
     node src/_build/pr.mjs --查合并        这一轮那条支合进 main 了没（--照清单发 吃的就是这一眼）
     node src/_build/pr.mjs --各家快进      他合并之后那一趟：把六家那一支各接到 main 后面（只挪指针）
     node src/_build/pr.mjs --扫公开面      只跑公开面那道闸（列是哪一份哪一行，命中非零退出）
     后面都能加 --不推：走到推之前停住，一个字都不往远端送（试跑用的）

   他 2026-10-11 定的四条规矩，这一颗是这么落的（一条都不许自己发挥）：
     一、严禁直接向 main 提交、推送、自动合并，也不许覆盖 main 上原有代码 ——
        这一颗里没有 `push origin main`、没有 --force、没有 --tags、不推拼装那一棵；
        main 那一支只被读（当支头），一个字都不写。
     二、每一轮：先同步远程 main 到最新 → 基于最新 main 新建分支（feature/任务简述、hotfix/bug简述）→
        本轮全部改动和 commit 都落这条支 → 推到远程 → 自动建 PR（base=main，compare=这条支，描述写清改了什么）→
        建完就停，绝不自动合并。
        支头取本地 main 那一笔（本地 main 上那些还没推出去的笔就是这一轮要发出去的东西），
        前提是上面那道「远程没挪」的闸先过。
     三、他合并之后那条支生命周期结束：这一颗认得出那条支已经存在（本地或远程都有这一手），
        同名就停下来报名字，绝不复用、绝不往上追加。
     四、推送/拉取碰到冲突就停下来报冲突，不自动解决：fetch 砸了、ls-remote 问不出、merge-tree 撞车、
        分支被谁挪过 —— 一律当场停。

   凭据这一手：脚本只喊 git，用的是这台机器已经配好的 credential helper。
   这一颗不读、不写、不存、不回显任何令牌或口令；网络那几趟一律带 GIT_TERMINAL_PROMPT=0，
   要问口令就让它直接失败，不弹窗、不接管道、不代填。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { TREE, git, 分家, 拼装, 拼装支, 各家快进, 本轮那一支名, 各家说明, 主程序笔名,
  合进那条支, 重建集成分支, 本地前瞻支 } from './plugin-repos.mjs';
import { 读清单, 读盘清单, 确认词, 支名形状, 认支类, 可推远程, 支名可用, 文字齐, 集成分支名 } from './push-list.mjs';
import { 跑闸, 私人串清单 } from './public-scan.mjs';
import { 认这项, 中文名 as 中文名of, 分支of } from './forward-features.mjs';

/* 只有"直接跑我"才执行命令行那一段；被 push-ui.mjs / 闸 当零件 import 的时候一个字都不跑 */
const 被当命令跑 = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
const argv = 被当命令跑 ? process.argv.slice(2) : [];
const has = f => argv.includes(f);
const val = (f, d) => { const a = argv.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : d; };
const P = n => console.log(n);
const 停 = why => { throw new Error(why); };
const 头一句 = e => String((e && (e.stderr || e.stdout)) || (e && e.message) || e).replace(/\r?\n/g, ' · ').slice(0, 400);

/* ---------- 远端与仓名：全部现取，代码里不写死仓库名 ---------- */
export function 远端名(){
  const 有 = git(TREE, ['remote']).split(/\r?\n/).filter(Boolean);
  if(有.includes('origin')) return 'origin';
  if(有.length === 1) return 有[0];
  throw new Error('这台没挂 origin 那一头（现在的远端：' + (有.join('、') || '一个都没有') + '）—— 不猜要往哪一头推');
}
export function 仓地址(远端){
  const 名 = 远端 || 远端名();
  let 串 = '';
  try{ 串 = git(TREE, ['remote', 'get-url', 名]); }
  catch(e){ throw new Error('问不到 ' + 名 + ' 那一头的地址：' + 头一句(e)); }
  /* https://host/群/仓.git 、git@host:群/仓.git 、ssh://git@host/群/仓.git 三种写法都认 */
  const m = /^(?:https?:\/\/|ssh:\/\/)?(?:[^/@]*@)?([^/:]+)[:/]+(.+?)(?:\.git)?\/?$/.exec(String(串).trim());
  if(!m) throw new Error('读不懂 ' + 名 + ' 那一头的地址：「' + 串 + '」');
  const 网页 = 'https://' + m[1] + '/' + m[2];
  return { 名, 原串: 串, 网页, 群仓: m[2] };
}

/* ---------- ① 同步远程（只读）：远程挪了当场停，绝不自动 rebase / merge / reset ---------- */
export function 同步远程(选项){
  const 远端 = (选项 && 选项.远端) || 远端名();
  const 环境 = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  if(!(选项 && 选项.不拉)){
    try{ execFileSync('git', ['-C', TREE, 'fetch', 远端, 'main'], { encoding:'utf8', env:环境, stdio:['ignore','pipe','pipe'] }); }
    catch(e){ 停('问不到 ' + 远端 + '/main（fetch 没跑成 —— 这一颗不代填口令、不重试别的招）：' + 头一句(e)); }
  }
  let 远 = '', 本 = '';
  try{ 远 = git(TREE, ['rev-parse', 远端 + '/main']); }catch(e){ 停('本地还不知道 ' + 远端 + '/main 在哪一笔（先 fetch 一次再来）'); }
  try{ 本 = git(TREE, ['rev-parse', 'main']); }catch(e){ 停('问不出本地 main 那一笔：' + 头一句(e)); }
  const 缺 = Number(git(TREE, ['rev-list', '--count', 本 + '..' + 远]));
  if(缺 > 0)
    停('远程 main 已经挪了，本地缺 ' + 缺 + ' 笔，请人工处理 —— 这一颗绝不自动 rebase、绝不自动 merge、绝不 reset。\n' +
      '  人工那一眼：git -C ' + TREE + ' rev-list --count main..' + 远端 + '/main\n' +
      '  能纯快进就自己跑一句 git -C ' + TREE + ' merge --ff-only ' + 远端 + '/main；真分叉了就自己看着把两边对齐，对齐完再来。');
  return { 远端, 远笔:远, 本地笔:本, 领先:Number(git(TREE, ['rev-list', '--count', 远 + '..' + 本])), 缺 };
}

/* ---------- ② 支名：形状校验 + 不许复用 + 基于本地 main 开 ---------- */
export function 校验支名(名){
  const 串 = String(名 == null ? '' : 名).trim();
  if(!串) 停('清单里那一行「提交分支 =」是空的：这一轮那条支叫什么得由你填（feature/任务简述、hotfix/bug简述、release/…）');
  if(支名可用(串).行) return 串;                                  /* 收不收只问 push-list 那一颗（旧三种头一段 + 四类里能推的） */
  const 错 = [];
  const 类 = 认支类(串);
  if(类){ 错.push(可推远程(串).话); }                             /* 认得出是哪一类、但这一类不许上远程（集成分支）：形状这一关就拦下，不等它走到推那一步 */
  else{
    if(!/^(feature|hotfix|release)\//.test(串)) 错.push('头一段得是 feature/ 、hotfix/ 或 release/（现在「' + 串 + '」不是）');
    const 尾巴 = 串.replace(/^(feature|hotfix|release)\//, '');
    if(尾巴 && !/^[a-z0-9]/.test(尾巴)) 错.push('斜杠后面得用小写字母或数字起头（现在第一个字是「' + 尾巴.slice(0, 1) + '」）');
    if(/[^a-z0-9._-]/.test(尾巴)) 错.push('只许 a-z 0-9 . _ -（多出来的那些字：' + [...new Set(尾巴.replace(/[a-z0-9._-]/g, '').split(''))].join('、') + '；大写也算多出来的）');
    错.push(可推远程(串).话);                                     /* 旧形状与新四类都对不上：把那四条原样报给他 */
  }
  停('「提交分支 =」那一行不合形状：' + 错.join('；') + '\n  整条形状：' + String(支名形状));
}
export function 支名在用(名, 远端){
  const 本地 = (() => { try{ git(TREE, ['show-ref', '--verify', '--quiet', 'refs/heads/' + 名]); return true; }catch(e){ return false; } })();
  let 远程 = null;
  try{ 远程 = !!String(git(TREE, ['ls-remote', '--heads', 远端 || 远端名(), 名])).trim(); }
  catch(e){ 停('问不出远端在用没在用「' + 名 + '」（ls-remote 没跑成 —— 这一颗不猜、不当它不存在）：' + 头一句(e)); }
  return { 本地, 远程 };
}
export function 本轮那一支(选项){
  const 名 = 校验支名((选项 && 选项.支) || 本轮那一支名());
  if(名 === 'main' || 名 === 拼装支) 停('「提交分支 =」不能写 ' + 名 + '：这一轮的改动一律走独立分支，main 与拼装那一棵都不是分支那一头');
  const 远端 = (选项 && 选项.远端) || 远端名();
  const 用 = 支名在用(名, 远端);
  if(用.本地 || 用.远程)
    停('这条支上一轮用过，换一个名字：' + 名 + (用.本地 ? '（本地已有）' : '') + (用.远程 ? '（远端已有）' : '') +
      '\n  他合并之后那条支的生命周期就结束了，下一轮必须从最新 main 重新拉一条全新分支 —— 不许复用旧支、不许往上追加、不许覆盖。');
  const 支头 = git(TREE, ['rev-parse', 'main']);
  /* 只开新指针，不动盘上那棵树（工作树照旧站在拼装那一棵，程序还在读它） */
  git(TREE, ['update-ref', 'refs/heads/' + 名, 支头]);
  return { 名, 支头, 远端 };
}

/* ---------- ③ 落笔到支：这一轮的改动落到那条支上，main 一个字不动 ---------- */
export function 这一轮的说明(){
  const 清 = 读清单(读盘清单());
  const 串 = String(清.本轮说明 || '').trim();
  const 一 = 串.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
  if(!一) 停('清单里那一行「本轮说明 =」是空的：这一轮改了什么得由你说 —— 它是那条支的提交说明，也是 PR 的标题与正文的素材');
  return { 全:串, 标题:一, 正文:串 };
}
export function 落笔到支(名, 选项){
  const 前 = git(TREE, ['rev-parse', 'refs/heads/main']);
  const 话 = (选项 && 选项.说明) || 这一轮的说明().标题;
  /* 一家一句：每一桶的提交说明从清单那一格取（他 2026-10-12 第 3 条）。
     先问这一轮那两个主格（这一轮那条支那一桶 = 顶上「主程序」那一笔、加「本轮说明」），
     剩下几家由 分家 逐桶问 —— 哪一桶空着它就抛并点名是哪一笔，一律不拿「本轮说明」顶上去。 */
  const 各家 = 各家说明(名);
  const 判 = 文字齐({ 提交说明: 各家[名], 本轮说明: 话 });
  if(!判.行) 停(判.话 + '\n  这一轮那条支那一桶的说明就是清单顶上「' + 主程序笔名 + '」那一笔的「更新描述 =」；参照文字在那一笔底下那行 # 里。');
  const r = 分家(话, 名, 各家);
  const 后 = git(TREE, ['rev-parse', 'refs/heads/main']);
  if(前 !== 后) 停('这一手不该动 main 那一支，可它从 ' + 前.slice(0, 7) + ' 变成了 ' + 后.slice(0, 7) + ' —— 当场停，请查 分家 是不是被改回了 main');
  return { 动了:r.动了, 出:r.出, 说明:话 };
}

/* ---------- ④ 公开面那道闸：推之前必须过 ---------- */
export function 公开面闸(名, 远端){
  const { 串 } = 私人串清单();
  const 对 = (远端 || 远端名()) + '/main';
  const 量 = 跑闸(名, 对);
  P('公开面那道闸：扫 ' + 对 + ' … ' + 名 + ' 之间新增和修改的文本，读了 ' + 量.读了 + ' 份（名单 ' + 量.面 + ' 份，二进制与不进仓的那两份已跳过）· 要查 ' + 串.length + ' 串');
  if(量.命中.length){
    const 单 = 量.命中.map(h => '  ' + h.份 + ':' + h.行号 + ' · ' + h.串 + ' · ' + h.原行).join('\n');
    停('公开面这一道没过，一条都不推。命中 ' + 量.命中.length + ' 处：\n' + 单 +
      '\n  把上面这些行里的本机位置换成占位写法（<帐户名>、仓外那一格 这一类），改完重跑这一道。');
  }
  P('  一处都没命中 —— 这一道过了。');
  return 量;
}

/* ---------- ⑤ 推支：只推这一条支；公开面那道闸排在 push 之前，不过就到不了 push ---------- */
export function 推支(名, 选项){
  if(名 === 'main' || 名 === 拼装支) 停('不推 ' + 名 + '：main 只能由他人工合并，拼装那一棵本来就不推（谁要自己合）');
  /* 他 2026-10-12 第 4 件：推那一步再钉一道名单闸 —— 集成分支那种永不进远程的、以及认不出是哪一类的名字，
     到这儿一律拦下。顶上 校验支名 那一关已经拦过一遍，这一道是给"谁哪天直接叫 推支"留的。 */
  const 可 = 支名可用(名);
  if(!可.行) 停('不推 ' + 名 + '：' + 可.话);
  const 远端 = (选项 && 选项.远端) || 远端名();
  公开面闸(名, 远端);                                   /* --不推 也照扫：这一道不是为推才装的，是「这一轮的公开面干净不干净」 */
  if(选项 && 选项.不推){ P('（--不推：闸过了，但一个字都没往远端送）'); return { 远端, 名, 未推:true }; }
  try{ execFileSync('git', ['-C', TREE, 'push', '-u', 远端, 名], { encoding:'utf8',
    env:{ ...process.env, GIT_TERMINAL_PROMPT:'0' }, stdio:['ignore','pipe','pipe'] }); }
  catch(e){ 停('那条支推砸了（' + 名 + '）：' + 头一句(e) + '\n  这一颗不重试强推那一手、不改别的写法 —— 看一眼远端那头的状态再说。'); }
  P('  ' + 名 + ' 推上去了（只推这一条支，' + 远端 + ' 那一头的 main 一个字没动）');
  return { 远端, 名 };
}

/* ---------- ⑥ 建 PR：gh 在且已登录就走 gh，不然只打印比对地址（不装东西、不要令牌） ---------- */
export function gh在手(){
  try{ execFileSync('gh', ['--version'], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }); return true; }
  catch(e){ return false; }
}
export function gh已登录(){
  /* 只看它回不回 0：gh auth status 的输出里带账户那一摊，一个字节都不回显 */
  try{ execFileSync('gh', ['auth', 'status'], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }); return true; }
  catch(e){ return false; }
}
export function 比对地址(名, 标题, 正文, 远端){
  const 仓 = 仓地址(远端);
  return 仓.网页 + '/compare/main...' + 名 + '?expand=1&title=' + encodeURIComponent(标题) + '&body=' + encodeURIComponent(正文);
}
export function 开PR(名, 选项){
  const 话 = (选项 && 选项.说明) || 这一轮的说明();
  const 标题 = (选项 && 选项.标题) || 话.标题;
  const 正文 = (选项 && 选项.正文) || (话.正文 +
    '\n\n这一轮走的是独立分支那一手：base = main，compare = ' + 名 + '。\n' +
    '合并只能人工点 —— 建完就停，脚本绝不自动合并、绝不把任何东西直接推上 main。');
  const 对 = (选项 && 选项.远端) || 远端名();
  const 地址 = 比对地址(名, 标题, 正文, 对);
  P('');
  P('PR 四样（原样报一遍，标题与正文都在清单那一格「本轮说明 =」里改）：');
  P('  标题：' + 标题);
  P('  base：main');
  P('  compare：' + 名);
  P('  正文：');
  for(const 行 of String(正文).split(/\r?\n/)) P('    ' + 行);
  P('');
  if(选项 && 选项.只报){ P('（--不推 这一趟：PR 没建。要建就跑不带 --不推 的那一道。）'); return { 走了:'只报', 地址, 标题, 正文 }; }
  if(gh在手() && gh已登录()){
    try{
      const 出 = execFileSync('gh', ['pr', 'create', '--base', 'main', '--head', 名, '--title', 标题, '--body', 正文],
        { cwd:TREE, encoding:'utf8', env:{ ...process.env, GIT_TERMINAL_PROMPT:'0' }, stdio:['ignore','pipe','pipe'] });
      P('  gh 已经把 PR 建好了（' + String(出).trim().split(/\r?\n/).pop() + '）—— 建完就停，不合并。');
      return { 走了:'gh', 地址, 标题, 正文 };
    }catch(e){
      P('  gh 在、也登录了，可它这一趟没建成（可能已经有一张开着的 PR、或网络砸了）：' + 头一句(e));
      P('  不重试、不改参数 —— 点下面这一条自己看一眼那一头到底什么样：');
    }
  }else P('  这台没有 gh（或 gh 还没登录）—— 不装任何东西、不要令牌，点下面这一条就能建：');
  P('  ' + 地址);
  return { 走了:'比对地址', 地址, 标题, 正文 };
}

/* ---------- ⑦ 合并状态那一眼（--照清单发 吃的就是它） ---------- */
export function 查合并(名, 选项){
  const 远端 = (选项 && 选项.远端) || 远端名();
  if(!(选项 && 选项.不拉)){
    try{ execFileSync('git', ['-C', TREE, 'fetch', 远端, 'main'], { encoding:'utf8',
      env:{ ...process.env, GIT_TERMINAL_PROMPT:'0' }, stdio:['ignore','pipe','pipe'] }); }
    catch(e){ /* 问不到远端就用本地已经知道的那一笔答，话在下面报出来 */ }
  }
  const 在 = (主干) => { try{ git(TREE, ['merge-base', '--is-ancestor', 名, 主干]); return true; }catch(e){ return false; } };
  const 本地 = 在('main');
  let 有远端 = false;
  try{ git(TREE, ['rev-parse', '--verify', 远端 + '/main']); 有远端 = true; }catch(e){}
  const 远 = 有远端 && 在(远端 + '/main');
  return { 名, 本地, 远端笔:远, 有远端, 远端,
    一眼:'git -C ' + TREE + ' merge-base --is-ancestor ' + 名 + ' ' + 远端 + '/main' };
}

/* ---------- 读终端一行：和 release.mjs 从前那一颗同一套写法（粘贴与敲的一样） ---------- */
export function 问一句(问题){
  const 底 = Buffer.alloc(4096);
  let 收 = '';
  process.stdout.write(问题);
  for(;;){
    let 读 = 0;
    try{ 读 = fs.readSync(0, 底, 0, 底.length, null); }catch(e){ return null; }
    if(读 <= 0) return 收.length ? 收 : null;
    收 += 底.toString('utf8', 0, 读);
    const 换 = 收.indexOf('\n');
    if(换 >= 0) return 收.slice(0, 换).replace(/\r$/, '');
    if(收.length > 200) return 收;
  }
}
/* 推支与建 PR 之前那一道：非「推」字一律不推（回车、空、别的字、读不到终端都算不过） */
export function 要他确认(列的东西){
  P('');
  P('要推的就这一条支 —— 推之前先看清楚：');
  for(const 行 of 列的东西) P('  ' + 行);
  P('');
  P('确认无误，就把下面那个字打进去再回车；回车（空）、别的字、任何别的一律一个字节都不推。');
  const 敲的 = 问一句('  确认词：' + 确认词 + ' > ');
  const 答 = 敲的 === null ? null : 敲的.trim();
  if(答 !== 确认词){
    P('没收到确认词（读到的是：' + (敲的 === null ? '读不到终端输入' : '「' + 敲的 + '」') + '）—— 这一趟一个字节都没推。');
    return false;
  }
  return true;
}

/* ---------- 命令行 ---------- */
if(被当命令跑){
  const 跑 = 手 => {
    try{ 手(); }
    catch(e){
      const 文 = String((e && e.message) || e);
      if(文.startsWith('ENOENT')) console.error('\n停下来：喊不出去 —— ' + 文);
      else console.error('\n停下来：' + 文);
      process.exit(1);
    }
  };
  const 不推 = has('--不推');
  const 不同步 = has('--不同步');

  /* ---------- 流程那几步，一步一颗（2026-10-13 他：「给我按照流程一步一个按钮」「步骤缺失」） ----------
     这三颗从前没有：同步 main、开这一轮那条支、删本地已经发完的那条支。都只挪指针、不碰工作树。 */
  if(has('--同步主干')) 跑(() => {
    const 远端 = 远端名();
    if(!不同步){
      try{ execFileSync('git', ['-C', TREE, 'fetch', 远端, 'main'], { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] }); }
      catch(e){ 停('问不到 ' + 远端 + '/main（fetch 没跑成 —— 这一颗不代填口令、不重试别的招）：' + 头一句(e)); }
    }
    let 远 = '', 本 = '';
    try{ 远 = git(TREE, ['rev-parse', 远端 + '/main']); }catch(e){ 停('本地还不知道 ' + 远端 + '/main 在哪一笔：' + 头一句(e)); }
    try{ 本 = git(TREE, ['rev-parse', 'main']); }catch(e){ 停('问不出本地 main 那一笔：' + 头一句(e)); }
    const 缺 = Number(git(TREE, ['rev-list', '--count', 本 + '..' + 远]));
    const 领先 = Number(git(TREE, ['rev-list', '--count', 远 + '..' + 本]));
    if(!缺 && !领先){ P('本地 main 已经和 ' + 远端 + '/main 同一笔（' + 本.slice(0, 7) + '）：这一颗什么都不用挪。'); process.exit(0); }
    if(领先) 停('本地 main 比 ' + 远端 + '/main 多 ' + 领先 + ' 笔 —— main 只是那一根的镜像，多出来的得先挪到功能支上去（这一颗不替你搬、也不 reset）。\n' +
      '  人工那一眼：git -C ' + TREE + ' log --oneline ' + 远端 + '/main..main');
    git(TREE, ['update-ref', 'refs/heads/main', 远, 本]);          /* 第三枚是老值：中间被人挪过就写不进去 */
    P('本地 main 快进 ' + 本.slice(0, 7) + ' → ' + 远.slice(0, 7) + '（补上 ' + 缺 + ' 笔；只挪那一根指针，工作树站的这一棵一个字没动）');
    process.exit(0);
  });

  else if(has('--开这一轮的支')) 跑(() => {
    const 名 = 校验支名(val('--支', '') || 本轮那一支名());
    const 起 = String(val('--从', 'main'));
    let 已有 = '';
    try{ 已有 = git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 名]); }catch(e){}
    if(已有){ P('「' + 名 + '」已经在 ' + 已有.slice(0, 7) + ' 这一笔上：这一颗不重开、也不改写它。'); process.exit(0); }
    let 起头 = '';
    try{ 起头 = git(TREE, ['rev-parse', 起]); }catch(e){ 停('问不出「' + 起 + '」那一笔：先跑第 1 步（同步 main）再来。'); }
    git(TREE, ['update-ref', 'refs/heads/' + 名, 起头]);
    P('开好了：' + 名 + ' 从 ' + 起 + '（' + 起头.slice(0, 7) + '）起的一根。');
    P('  工作树还站在原来那一棵 —— 改代码照旧在盘上这一棵改，改完由「分家」按路径送回这一根（node src\\_build\\plugin-repos.mjs --收改动 --msg=…）。');
    process.exit(0);
  });

  else if(has('--删本地已发布支')) 跑(() => {
    const 名 = 校验支名(val('--支', '') || 本轮那一支名());
    const 远端 = 远端名();
    let 支头 = '';
    try{ 支头 = git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 名]); }
    catch(e){ 停('本地没有「' + 名 + '」那一条支，不用删。'); }
    let 主干 = '';
    try{ 主干 = git(TREE, ['rev-parse', 'main']); }catch(e){}
    if(!主干) 停('问不出本地 main 那一笔：先跑第 1 步（同步 main）再来。');
    /* 三种"已经进 main"都算：并进去了（log 空）、他推荐的那种压成一笔（内容一样）、远程那一条已经没了且本地 main 含它 */
    const 还差 = String(git(TREE, ['log', '--oneline', 'main..' + 名])).split(/\r?\n/).filter(Boolean);
    const 内容一样 = (() => { try{ git(TREE, ['diff', '--quiet', 名, 'main']); return true; }catch(e){ return false; } })();
    if(还差.length && !内容一样)
      停('「' + 名 + '」还没进 main —— 这一颗不删。main 里没有它的那 ' + 还差.length + ' 笔：\n  ' + 还差.slice(0, 8).join('\n  ') +
        '\n  两边内容也对不上（不是压成一笔那种）。先在 GitHub 网页上合并，回来跑第 1 步同步 main，再删。');
    git(TREE, ['update-ref', '-d', 'refs/heads/' + 名]);
    P('删了本地那一条：' + 名 + '（' + (还差.length ? '压成一笔合进去的，内容已与 main 一致' : '那一笔已全在 main 里') + '，历史没丢）');
    P('  远程那一条你在网页上合并时勾的那一下删；' + 远端 + '/main 这一头这一颗一个字都不推。');
    process.exit(0);
  });

  else if(has('--查合并')) 跑(() => {
    const 名 = 校验支名(val('--支', '') || 本轮那一支名());
    const 状 = 查合并(名, { 不拉:不同步 });
    P('这一轮那条支：' + 名);
    P('  合进本地 main：' + (状.本地 ? '是' : '还没'));
    P('  合进 ' + 状.远端 + '/main：' + (状.有远端 ? (状.远端笔 ? '是' : '还没') : '本地还不知道远端那一笔（先 fetch 一次）'));
    P('  查合并那一眼：' + 状.一眼);
    if(!状.远端笔) P('\n还没合并 —— 打包那一道（release.mjs --照清单发）会当场拒绝：号要钉在 main 上真实存在的那一笔上。');
    process.exitCode = 状.远端笔 || 状.本地 ? 0 : 1;
  });

  else if(has('--扫公开面')) 跑(() => {
    const 名 = 校验支名(val('--支', '') || 本轮那一支名());
    公开面闸(名);
  });

  else if(has('--各家快进')) 跑(() => {
    const 名 = 校验支名(val('--支', '') || 本轮那一支名());
    const 状 = 查合并(名, { 不拉:不同步 });
    if(!(状.本地 || 状.远端笔))
      停('这一轮那条支还没被合进 main，六家那一支先不快进 —— 他合并之后才跑这一趟。\n  查合并那一眼：' + 状.一眼);
    const 出 = 各家快进(状.本地 ? 'main' : 状.远端 + '/main');
    for(const x of 出) P('  ' + (x.支 + ' ').padEnd(34) + (x.好 ? '✓ ' : '停下来：') + x.话);
    const 砸 = 出.filter(x => !x.好);
    if(砸.length) 停('有 ' + 砸.length + ' 家没快进（上面报了是哪一家）—— 不自动处理，先人工把那一家对齐。');
    if(!不推) P('拼装那一棵重拼：' + 拼装('各家快进之后重拼'));
  });

  else if(has('--开支落笔')) 跑(() => {
    if(!不同步){ const 状 = 同步远程(); P('远程 main 没挪（本地领先 ' + 状.领先 + ' 笔、缺 ' + 状.缺 + ' 笔）· ' + 状.远笔.slice(0, 7)); }
    else P('（--不同步：这一趟没问远端，只按本地已知的那一笔走 —— 推之前还是得问一次）');
    const 支 = 本轮那一支();
    P('开了一条新支：' + 支.名 + ' = 本地 main 那一笔 ' + 支.支头.slice(0, 7));
    const r = 落笔到支(支.名);
    P('这一轮动了 ' + r.动了 + ' 份：');
    for(const x of r.出) P('  ' + (x.落点 + ' ').padEnd(34) + x.份 + ' 份 · ' + (x.笔 ? '落了一笔 ' + x.笔.slice(0, 7) : '与那一支一模一样，没落笔'));
    P('\n本地这一半走完了（main 一个字没动）。要推与要建 PR：node src/_build/pr.mjs --提交PR');
  });

  else if(has('--重建集成分支')) 跑(() => {
    /* 他 2026-10-12 第 7 件：从本地 main 起一根集成分支，把勾中的那几条本地前瞻支一条一条合上去。
       --支=a,b 自己点；不点就取这台量出来的那几条「只在本地、还没合进 main」的前瞻支。 */
    const 点 = val('--支', '');
    const 列 = 点 ? 点.split(',').map(s => s.trim()).filter(Boolean) : 本地前瞻支().map(x => x.名);
    P('要合上去的本地前瞻支：' + (列.length ? 列.join('、') : '（一条都没有 —— 上面那两条命令之外先做点东西出来）'));
    const 果 = 重建集成分支(列);
    P(果.集成分支 + ' 从 ' + 果.主干 + ' 那一笔 ' + 果.底 + ' 起底（原来那一根停在 ' + 果.旧底 + '，历史一笔不删）');
    for(const x of 果.合了) P('  ' + (x.支 + ' ').padEnd(34) + (x.动了 ? '合上一笔 ' + x.笔 : '已经在里头，没再合'));
    P('\n这一根只在这台机器上（' + 果.集成分支 + ' 永不推远程，推那一步会当场拒）。');
    P('要在这形状上打全功能测试包，还差一步没接：打包那一趟今天仍从 ' + 拼装支 + ' 那一棵起 ——');
    P('  把 拼装 的默认落点与基点换成这一根，是插件代码搬回 main 那一棵（定夺 2）之后与搬家那一趟一起做的事，写在 docs\\GitHub版本资源助手.md 第 8 件。');
  });

  /* 推送这一头也要能挑（2026-10-13 他：「那推送里有没有？可不可以选择？有/不可选择就不对！」）：
     勾中的那几项，它们各自那条本地前瞻支才推上远程、才建 PR；没勾的一条都不推，留在本地。
     这一颗推的只有被点名的那几条 feature/new/… —— main、拼装那一棵、集成分支那一根照旧一个字节不推。 */
  else if(has('--推前瞻支')) 跑(() => {
    const 递 = val('--推', '').split(',').map(s => s.trim()).filter(Boolean);
    if(!递.length) 停('一颗都没勾：这一颗只管"把点名的那几项的前瞻支推上去"。不勾就什么都别推 —— 基础那一支走「推送 + 建 PR」那一颗。');
    const 项 = 递.map(认这项).filter(Boolean);
    const 认错 = 递.filter(s => !认这项(s));
    if(认错.length) 停('这几项名单里没有：' + 认错.join('、') + '（八项的 id 与中文名都认，见 forward-features.mjs）');
    const 起 = [];
    for(const id of 项){
      const 分支 = 分支of(id);
      let 支头 = '';
      try{ 支头 = git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 分支]); }catch(e){}
      if(!支头) 停('「' + 中文名of(id) + '」那条前瞻支 ' + 分支 + ' 还没起来 —— 这一项还没从基础里拆出来，推不了。');
      起.push({ id, 中文: 中文名of(id), 分支, 支头: 支头.slice(0, 7) });
    }
    const 远端 = 远端名();
    if(!要他确认([
      '这一颗要推的前瞻支（一项一条，各自建一个 PR，base = main）：',
      ...起.map(x => '  ' + x.中文 + ' → ' + x.分支 + '（那一笔 ' + x.支头 + '）'),
      '没勾的那 ' + (8 - 起.length) + ' 项：一条都不推，留在本地。',
      'main：不推（只能你人工合并）· 拼装那一棵：不推 · tag：不推 · ' + 集成分支名 + '：不推（永不进远程）',
    ])){ P('一条都没推。'); process.exitCode = 1; return; }
    for(const x of 起){
      P('\n推 ' + x.分支 + '（' + x.中文 + '）');
      推支(x.分支, { 不推 });
      const 果 = 开PR(x.分支, { 不推, 远端 });
      if(果.走了 === '比对地址') P('  （没建 PR —— ' + 果.地址 + '）');
    }
    P('\n建完就停：不合并、不动 main。等你在 GitHub 上一条一条人工点合并（建议 Squash and merge）。');
    process.exit(0);
  });

  else if(has('--提交PR')) 跑(() => {
    const 状 = 不同步 ? { 领先:'（没问远端）', 缺:'（没问远端）' } : 同步远程();
    if(!不同步) P('① 同步远程：' + 状.远端 + '/main 没挪 · 本地领先 ' + 状.领先 + ' 笔、缺 ' + 状.缺 + ' 笔');
    else 停('这一道必须问远端：--提交PR 不许配 --不同步（规矩第二条头一项就是先把远程 main 同步到最新）');
    const 支 = 本轮那一支();
    P('② 开新支：' + 支.名 + ' = 本地 main 那一笔 ' + 支.支头.slice(0, 7) + '（同名支已经存在的话上面当场就停了）');
    const r = 落笔到支(支.名);
    P('③ 落笔：这一轮动了 ' + r.动了 + ' 份，说明「' + r.说明 + '」');
    for(const x of r.出) P('    ' + (x.落点 + ' ').padEnd(34) + x.份 + ' 份 · ' + (x.笔 ? '落了一笔 ' + x.笔.slice(0, 7) : '与那一支一模一样，没落笔'));
    /* 阶段二第 3 步那两下（他 2026-10-12 第 2 件）：方向钉死 —— main 合进这一支、这一支合进集成分支，
       动的都只有被合进去那一头的指针；main 那一根一个字不动，集成分支那一根永不推远程。撞车当场停，不自动解。 */
    const 合1 = 合进那条支(支.名, 'main');
    P('④ 本地 main 合进这一支：' + (合1.动了 ? '合上一笔 ' + 合1.笔 + '（main 那一笔 ' + 合1.从笔 + ' 接进来，动的只有 ' + 支.名 + ' 这一根）' : 合1.话));
    const 合2 = 合进那条支(集成分支名, 支.名, { 话: '合入 ' + 支.名 + '：把这一轮那条支并进本地集成分支，打全功能测试包用' });
    P('⑤ 这一支合进本地集成分支：' + (合2.动了 ? '合上一笔 ' + 合2.笔 + '（' + 集成分支名 + ' 只在这台机器上，永不推远程）' : 合2.话));
    const 话 = 这一轮的说明();
    if(!要他确认([
      '支：' + 支.名 + ' → ' + 支.远端 + '（只推这一条支）',
      'main：不推（只能你人工合并）· 拼装那一棵：不推 · tag：不推 · ' + 集成分支名 + '：不推（永不进远程）',
      '本地已经合过：main → ' + 支.名 + ' → ' + 集成分支名 + '（那两根指针都在本地，一个字节没上远程）',
      'PR：base=main，compare=' + 支.名 + '，标题「' + 话.标题 + '」',
    ])){ P('没推、没建 PR。提交已经落在那条支上了（本地），要看现场重跑 --开支落笔 就知道落了几笔。'); process.exitCode = 1; return; }
    P('⑥ 推支');
    推支(支.名, { 不推 });
    P('⑦ 建 PR');
    const 果 = 开PR(支.名, { 不推, 远端:支.远端 });
    P('⑧ 建完就停：不合并、不再推、不动 main。等你在 GitHub 上人工点合并（建议 Squash and merge），合并之后再跑：');
    P('   node src/_build/pr.mjs --各家快进     （六家那一支接到 main 后面）');
    P('   node src/_build/release.mjs --照清单发 （打包：未合并会当场拒绝）');
    if(果.走了 === '比对地址') P('\n（这一趟没建 PR —— ' + 果.地址 + '）');
  });

  else 跑(() => 停('这一颗认六道命令：--提交PR（整手）、--开支落笔（只本地那一半）、--重建集成分支（勾哪几条前瞻支：--支=a,b；不点就取量出来的那些）、--查合并、--各家快进、--扫公开面；都能配 --不推，前几道还能配 --不同步'));
}
