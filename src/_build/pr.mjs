/* ============================================================
   开一条支、落笔、推支、开 PR —— 这一整手只住在这一颗里
   ------------------------------------------------------------
     node src/_build/pr.mjs --提交PR        一整手：同步远程 main → 基于本地 main 开那条支 → 这一轮的改动落上去 →
                                            公开面那道闸 → 等他亲手敲一个「推」字 → 推那条支 → 建 PR → 建完就停
     node src/_build/pr.mjs --开支落笔      只走本地那一半：同步（可 --不同步）→ 开支 → 落笔，不扫不推不建 PR
     node src/_build/pr.mjs --查合并        这一轮那条支合进 main 了没（--照清单发 吃的就是这一眼）
     node src/_build/pr.mjs --各家快进      他合并之后那一趟：把六家那一支各接到 main 后面（只挪指针）
     node src/_build/pr.mjs --扫公开面      只跑公开面那道闸（列是哪一份哪一行，命中非零退出）
     node src/_build/pr.mjs --摊单=提交PR|推前瞻支   只把"这一趟要推什么"摊成一份 JSON 回话：一根指针都不挪、一个字节都不推
                                            （那一屏在让他敲那一个字之前，先叫这一道拿单子）
     后面都能加 --不推：走到推之前停住，一个字都不往远端送（试跑用的）
     --已确认 是给那一屏用的：屏上他已经敲过那一个字了，这一趟不再问第二遍（终端里跑不带它，照旧问）。

   他 2026-10-11 定的四条规矩，这一颗是这么落的（一条都不许自己发挥）：
     一、严禁直接向 main 提交、推送、自动合并，也不许覆盖 main 上原有的代码 ——
        这一颗里没有 push 与 main 同一句的那一手、没有 --force、没有 --tags、不推拼装那一棵；
        main 那一支只被读（当支头），一个字都不写。
        （往远程送 main 的那一回事只发生过一次：2026-10-14 上午他自己在那一屏上敲字，把本地 main 推上去
          建出远程第一根 main。那一颗当时就设计成"远程已经有了就当场拒"，一辈子只用得上这一回，
          用完在同一个上午整块拆掉了 —— 这一颗里现在没有任何一条路碰得到远程 main。）
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
import { 认这项, 中文名 as 中文名of, 分支of, 八项 } from './forward-features.mjs';

/* 只有"直接跑我"才执行命令行那一段；被 text-icon.mjs / 闸 当零件 import 的时候一个字都不跑 */
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

/* ---------- 远程有哪几条支：一次问全（空仓与问不出是两回事，绝不混成一样） ---------- */
/* 他 2026-10-14 那一张截图：那一屏报的是 `问不到 origin/main（fetch 没跑成）：fatal: couldn't find remote ref main`，
   看着像网络砸了，其实是这棵仓从没往远程推过任何东西 —— 远程一根支都还没有，fetch 自然问不到 main。
   所以先把"远程到底有哪几条支"问出来，再决定往哪一条路上走。 */
export function 远程支表(选项){
  const 远端 = (选项 && 选项.远端) || 远端名();
  let 出 = '';
  try{ 出 = execFileSync('git', ['-C', TREE, 'ls-remote', '--heads', 远端], { encoding:'utf8',
    env:{ ...process.env, GIT_TERMINAL_PROMPT:'0' }, stdio:['ignore','pipe','pipe'] }); }
  catch(e){ return { 问不出:true, 远端, 话: 头一句(e) }; }
  const 列 = String(出).split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    .map(s => { const [笔, 支] = s.split(/\s+/); return { 笔, 支: String(支 || '').replace(/^refs\/heads\//, '') }; });
  return { 问不出:false, 远端, 列, main: 列.find(x => x.支 === 'main') || null, 空仓: 列.length === 0 };
}
/* 「远程那一头没有 main」要说的那一句人话：这一颗什么都不推，只把现场报清楚
   （2026-10-14 上午那一下"建出远程第一根 main"已经做完了，那一颗也拆掉了：往后再走到这一句，
     只会是远程那一根被人删了或换错了地方 —— 那是人工查的事，这一颗绝不替你重建那一根） */
export function 远程没main话(表){
  return '远程那一头没有 main 这一条支（现在远程' +
    (表.空仓 ? '一条支都还没有' : '只有 ' + 表.列.map(x => x.支).join('、')) + '）。' +
    '\n  这一颗什么都不推：功能支的合并申请要把 base 钉在 main 上，远程没有 main 就一张也建不出来。' +
    '\n  先查这一台挂的远程对不对（git -C ' + TREE + ' remote -v），再看那一头是不是被人删过 —— 这一颗不替你重建 main 那一根。';
}

/* ---------- ① 同步远程（只读）：远程挪了当场停，绝不自动 rebase / merge / reset ---------- */
export function 同步远程(选项){
  const 远端 = (选项 && 选项.远端) || 远端名();
  const 环境 = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  const 表 = 远程支表({ 远端 });
  if(表.问不出) 停('问不到 ' + 远端 + ' 那一头有哪几条支（ls-remote 没跑成 —— 这一颗不代填口令、不重试别的招）：' + 表.话);
  if(!表.main) 停(远程没main话(表));
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
/* 只读的那一眼：这一轮那条支叫什么、本地与远端有没有它、它将从哪一笔起。
   摊单那一趟（那一屏开确认框之前要给他看的那一份）用的就是这一颗 —— 它一根指针都不挪。 */
export function 看那一支(选项){
  const 名 = 校验支名((选项 && 选项.支) || 本轮那一支名());
  if(名 === 'main' || 名 === 拼装支) 停('「提交分支 =」不能写 ' + 名 + '：这一轮的改动一律走独立分支，main 与拼装那一棵都不是分支那一头');
  const 远端 = (选项 && 选项.远端) || 远端名();
  return { 名, 远端, 用:支名在用(名, 远端), 支头:git(TREE, ['rev-parse', 'main']) };
}
export function 本轮那一支(选项){
  const 底 = 看那一支(选项);
  if(底.用.远程)
    停('这条支上一轮用过，换一个名字：' + 底.名 + '（远端已有）' +
      '\n  他合并之后那条支的生命周期就结束了，下一轮必须从最新 main 重新拉一条全新分支 —— 不许复用旧支、不许往上追加、不许覆盖。');
  if(底.用.本地){
    /* 上一趟「写进各支（本地提交）」或「开这一条支」刚开出来、还没推的那一根：照用。
       从前这里不分青红皂白就停（「上一轮用过」），于是第 3 步落完笔的人按第 7 步那颗永远按不动 —— 2026-10-14 量到的。 */
    const 支头 = git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 底.名]);
    let 进了 = false;
    try{ git(TREE, ['merge-base', '--is-ancestor', 底.名, 'main']); 进了 = true; }catch(e){}
    if(进了) 停('本地那一条「' + 底.名 + '」已经全在 main 里了（上一轮发完的那一条）—— 换一个新名字，这一轮重新拉一条，不许往上追加。');
    return { 名:底.名, 支头, 远端:底.远端, 沿用:true };
  }
  /* 只开新指针，不动盘上那棵树（工作树照旧站在拼装那一棵，程序还在读它） */
  git(TREE, ['update-ref', 'refs/heads/' + 底.名, 底.支头]);
  return { 名:底.名, 支头:底.支头, 远端:底.远端 };
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
/* 对 = '全部'：远程还没有可比对的基线（第一次推 main 那一趟）时扫进仓的全部文本 —— 那是最大的一面，只大不小。 */
export function 公开面闸(名, 远端, 对){
  const { 串 } = 私人串清单();
  const 比 = 对 || (远端 || 远端名()) + '/main';
  const 量 = 跑闸(名, 比);
  P('公开面那道闸：扫' + (比 === '全部' ? '进仓的全部文本（远程还没有可比对的基线，就拿最大的一面来扫）· '
      : 比 + ' … ' + 名 + ' 之间新增和修改的文本，') + '读了 ' + 量.读了 + ' 份（名单 ' + 量.面 + ' 份，二进制与不进仓的那两份已跳过）· 要查 ' + 串.length + ' 串');
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
/* 推支与建 PR 之前那一道：非「推」字一律不推（回车、空、别的字、读不到终端都算不过）。
   选项.已确认 = 那一屏已经在他亲手敲过那一个字之后才起这一趟（屏上敲完才发请求，见 text-icon.mjs）：
   这里就把要推的东西原样打印一遍，不再问第二遍 —— 终端里直接跑我，不带 --已确认，照旧读到那一行为止。 */
export function 要他确认(列的东西, 选项){
  P('');
  P('要推的就这一条支 —— 推之前先看清楚：');
  for(const 行 of 列的东西) P('  ' + 行);
  P('');
  if(选项 && 选项.已确认){ P('（你在屏上已经敲过那个字 —— 这一趟不再问第二遍，上面那一单就是照它推的）'); return true; }
  P('确认无误，就把下面那个字打进去再回车；回车（空）、别的字、任何别的一律一个字节都不推。');
  const 敲的 = 问一句('  确认词：' + 确认词 + ' > ');
  const 答 = 敲的 === null ? null : 敲的.trim();
  if(答 !== 确认词){
    P('没收到确认词（读到的是：' + (敲的 === null ? '读不到终端输入' : '「' + 敲的 + '」') + '）—— 这一趟一个字节都没推。');
    return false;
  }
  return true;
}

/* ---------- 摊单：把「这一趟要推什么」原样列出来，一根指针都不挪、一个字节都不推 ----------
   那一屏（src\_build\text-icon.html）在让他敲那一个字之前，先叫这三颗各拿一份单；他敲了字，
   同一道命令再带着 --已确认 真跑。从前是"跑起来了才在日志中段冒出一个输入框"
   （他 2026-10-14：「没有亲手敲字的地方 —— 这个确认方法也太奇怪了」），改成"点下去先看见这一份单、敲了字才动"。
   这两颗与上面 CLI 那两道用的是同一颗颗零件（校验支名 / 支名在用 / 同步远程 / 远程支表 / 这一轮的说明），
   所以屏上那份单和终端里那一份不会各说一套。 */

/* 7B 那一单：勾中的那几项各自那条功能支。列的每一行都从 远程支表 那一次网络问话里取，不逐条再问 */
export function 推前瞻列(起, 表){
  const 列 = ['要推的是这几条功能分支，一条一份合并申请（base = ' + 表.远端 + '/main）：'];
  for(const x of 起)
    列.push('  ' + x.中文 + ' → ' + x.分支 + '（那一笔 ' + x.支头 + '）' +
      (x.已推 ? ' · 远程已经有这条分支了，这一趟只是让它接上本地最新那一笔' : ' · 远程还没有，这一趟新建它'));
  const 没 = 八项.length - 起.length;
  列.push(没 ? '没勾的那 ' + 没 + ' 项：一条都不推，留在本地。' : '八项全勾上了：这一趟八条都推上去。');
  列.push('每一条推之前各扫一遍公开面（这台电脑的盘符、私人目录、帐户名带出去一处就不推）。');
  列.push('main：不推（只能你人工合并）· assemble 那条拼装的分支：不推 · tag：不推 · ' + 集成分支名 + '：不推（永不进远程）');
  列.push('建完就停：不合并、不动 main —— 那几张申请要你在 GitHub 上一条一条人工点合并（建议 Squash and merge）。');
  return 列;
}
export function 前瞻单(递){
  if(!递.length) 停('一颗都没勾：这一颗只管"把点名的那几项的功能支推上去"。不勾就什么都别推 —— 基础那一支走「推送这一轮的改动」那一颗。');
  const 项 = 递.map(认这项).filter(Boolean);
  const 认错 = 递.filter(s => !认这项(s));
  if(认错.length) 停('这几项名单里没有：' + 认错.join('、') + '（八项的 id 与中文名都认，见 forward-features.mjs）');
  const 远端 = 远端名();
  const 表 = 远程支表({ 远端 });
  if(表.问不出) 停('问不到 ' + 远端 + ' 那一头有哪几条支（ls-remote 没跑成 —— 这一颗不代填口令、不重试别的招）：' + 表.话);
  /* 那八项各发的合并申请，base 写的都是 main：远程没有 main 就一张也建不出来，先把那根建出来 */
  if(!表.main) 停(远程没main话(表));
  const 起 = [];
  for(const id of 项){
    const 分支 = 分支of(id);
    let 支头 = '';
    try{ 支头 = git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 分支]); }catch(e){}
    if(!支头) 停('「' + 中文名of(id) + '」那条功能支 ' + 分支 + ' 还没起来 —— 这一项在这一枚里没有，推不了。');
    let 已合 = false;
    try{ git(TREE, ['merge-base', '--is-ancestor', 支头, 表.main.笔]); 已合 = true; }catch(e){}
    if(已合) 停('「' + 中文名of(id) + '」那一笔已经在远程 main 里了（' + 分支 + ' 已经合过）—— 这一颗不重推它。' +
      '\n  要接的是本地那一根：node src/_build/pr.mjs --各家快进');
    起.push({ id, 中文:中文名of(id), 分支, 支头:支头.slice(0, 7), 已推:!!表.列.find(x => x.支 === 分支) });
  }
  return { 远端, 起, 单:推前瞻列(起, 表) };
}

/* 7A 那一单：这一轮那条支 + 那八步。这一份只讲"将要这么走"，所以他敲字之前就看得见；
   真跑那一道（--提交PR）落完笔之后还要把自己落成了什么样打印一遍，那一段是事后账，不是这一份单。 */
export function 提交单(){
  const 状 = 同步远程();                       /* 远程还没有 main → 停在那一句人话上（不在这里替他建） */
  const 底 = 看那一支();                       /* 支名形状、本地/远程有没有它、将从哪一笔起 —— 都不挪指针 */
  if(底.用.远程 && !底.用.本地)
    停('那一支「' + 底.名 + '」已经在远程有了，可它还没合进远程 main，所以不能建 PR，先回第 1 步把 main 同步过来再重新量这一轮 —— 这一颗不复用旧支、不覆盖已有的一笔。');
  const 话 = 这一轮的说明();
  const 各家 = 各家说明(底.名);
  const 判 = 文字齐({ 提交说明:各家[底.名], 本轮说明:话.标题 });
  if(!判.行) 停(判.话 + '\n  这一轮那条支那一桶的说明就是清单顶上「' + 主程序笔名 + '」那一笔的「更新描述 =」；参照文字在那一笔底下那行 # 里。');
  return { 支:底.名, 远端:状.远端, 单:[
    '先问一次远程：' + 状.远端 + '/main 没挪 · 本地 main 领先 ' + 状.领先 + ' 笔、缺 ' + 状.缺 + ' 笔',
    '这一轮那条分支：' + 底.名 + (底.用.本地 ? '（本地已经有了 —— 上一趟「按分支提交到本地」开的，这一趟照用它，不重开也不改写）'
        : '（从本地 main 那一笔 ' + 底.支头.slice(0, 7) + ' 新开一条）'),
    '把这一轮改动的文件按路径分到各条分支，提交在本地（main 一个字不动）',
    '本地 main 合进这条分支，再把这条分支合进本地那条合好的分支（这两步都只在这台电脑上，一个字节不上远程）',
    '扫一遍有没有把这台电脑的盘符、私人目录、帐户名带出去（命中一处就不推）',
    '只推这一条分支：' + 底.名,
    '建一份合并申请：从 ' + 底.名 + ' 合到 main，标题「' + 话.标题 + '」',
    '不推的：main（' + 状.远端 + '/main 往后的每一笔只能由你在网页上点合并进去）· assemble 那条拼装的分支（各家代码拼在一起那条，不推）· tag · ' + 集成分支名 + '（永不进远程）',
    '建完就停：不合并、不再推。',
  ] };
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
  /* --摊单=提交PR|推前瞻支：只把"这一趟要推什么"摊成一份 JSON 回话，一根指针都不挪、一个字节都不推。
     那一屏（src\_build\text-icon.html）在让他敲那一个字之前先叫这一道，把单摊在框里给他看；
     他敲了字，那一屏再起同一条命令真跑（带 --已确认）。摊单与真跑用的是同一颗颗零件，两份单不会各说一套。 */
  const 报单 = val('--摊单', '') !== '';
  const 出 = 对 => { console.log(JSON.stringify(对)); process.exit(0); };

  if(报单) 跑(() => {
    const 哪道 = val('--摊单', '');
    if(哪道 === '推前瞻支'){ const 单 = 前瞻单(val('--推', '').split(',').map(s => s.trim()).filter(Boolean)); 出({ 道:哪道, 支:单.起.map(x => x.分支), 单:单.单 }); }
    if(哪道 === '提交PR'){ const 单 = 提交单(); 出({ 道:哪道, 支:单.支, 单:单.单 }); }
    停('--摊单 只认那两道：--摊单=推前瞻支 --推=<项id,…> / --摊单=提交PR；现在给的是「' + (哪道 || '（空）') + '」');
  });
  else if(has('--同步主干')) 跑(() => {
    const 远端 = 远端名();
    const 表 = 远程支表({ 远端 });
    if(表.问不出) 停('问不到 ' + 远端 + ' 那一头有哪几条支（ls-remote 没跑成 —— 这一颗不代填口令、不重试别的招）：' + 表.话);
    if(!表.main) 停(远程没main话(表));
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
    if(果.跳的.length){
      P('\n跳过的 ' + 果.跳的.length + ' 条（与已经合上的那些撞在同一份文件上，一个字都没合，也没替它们解）：');
      for(const x of 果.撞单) if(果.跳的.includes(x.支)) P('  ' + (x.支 + ' ').padEnd(34) + '撞在这些份：' + (x.撞.join('、') || '（问不出是哪一份）'));
      P('  这 ' + 果.跳的.length + ' 条要在哪一条分支上解、怎么解，归你定；定了之后这一趟重来一次就带上它们。');
    }
    P('\n这一根只在这台机器上（' + 果.集成分支 + ' 永不推远程，推那一步会当场拒）。');
    P('要拿这一棵打一枚安装包：屏上第 6 步那颗「用合好的那份打安装包」，或终端 node src/_build/release.mjs --打自测包=完整。');
  });

  /* 推送这一头也要能挑（2026-10-13 他：「那推送里有没有？可不可以选择？有/不可选择就不对！」）：
     勾中的那几项，它们各自那条本地前瞻支才推上远程、才建 PR；没勾的一条都不推，留在本地。
     这一颗推的只有被点名的那几条 feature/new/… —— main、拼装那一棵、集成分支那一根照旧一个字节不推。 */
  else if(has('--推前瞻支')) 跑(() => {
    const 单 = 前瞻单(val('--推', '').split(',').map(s => s.trim()).filter(Boolean));
    if(报单){ 出({ 远端:单.远端, 支:单.起.map(x => x.分支), 单:单.单 }); return; }
    if(!要他确认(单.单, { 已确认:has('--已确认') })){ P('一条都没推。'); process.exitCode = 1; return; }
    for(const x of 单.起){
      P('\n推 ' + x.分支 + '（' + x.中文 + '）');
      推支(x.分支, { 不推 });
      const 果 = 开PR(x.分支, { 不推, 远端:单.远端 });
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
      '分支：' + 支.名 + ' → ' + 支.远端 + '（只推这一条分支）',
      'main：不推（只能你人工合并）· assemble 那条拼装的分支：不推 · tag：不推 · ' + 集成分支名 + '：不推（永不进远程）',
      '本地已经合过：main → ' + 支.名 + ' → ' + 集成分支名 + '（这两步都在本地，一个字节没上远程）',
      '合并申请：从 ' + 支.名 + ' 合到 main，标题「' + 话.标题 + '」',
    ], { 已确认:has('--已确认') })){ P('没推、没建 PR。提交已经落在那条支上了（本地），要看现场重跑 --开支落笔 就知道落了几笔。'); process.exitCode = 1; return; }
    P('⑥ 推支');
    推支(支.名, { 不推 });
    P('⑦ 建 PR');
    const 果 = 开PR(支.名, { 不推, 远端:支.远端 });
    P('⑧ 建完就停：不合并、不再推、不动 main。等你在 GitHub 上人工点合并（建议 Squash and merge），合并之后再跑：');
    P('   node src/_build/pr.mjs --各家快进     （六家那一支接到 main 后面）');
    P('   node src/_build/release.mjs --照清单发 （打包：未合并会当场拒绝）');
    if(果.走了 === '比对地址') P('\n（这一趟没建 PR —— ' + 果.地址 + '）');
  });

  else 跑(() => 停('这一颗认这几道命令：--提交PR（整手）、--开支落笔（只本地那一半）、--重建集成分支（勾哪几条前瞻支：--支=a,b；不点就取量出来的那些）、--查合并、--各家快进、--扫公开面、--摊单=提交PR|推前瞻支（只摊单不推）；都能配 --不推，前几道还能配 --不同步；那一屏上敲过那一个字的往后面加 --已确认，终端里跑不用加'));
}
