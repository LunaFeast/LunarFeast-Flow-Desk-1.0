/* ============================================================
   插件这一摊：一家一份路径清单（七家）+ 七家各自那一支（2026-10-13 起没有"为写那一棵私有仓"这一格）
   ------------------------------------------------------------
     node src/_build/plugin-repos.mjs --dry                 只报清单和体积，不落盘、不动 git
     node src/_build/plugin-repos.mjs --拼装                把主干与那七支现合成一棵并站上去（要跑程序、要打包的人喊这一句）
     node src/_build/plugin-repos.mjs --收改动 --msg=…      盘上动了的份按路径分家：七家回各自那一支，
                                                            剩下的落「这一轮那条支」（支名从清单那一行「提交分支 =」取，
                                                            要临时换一头就加 --落点=支名）

   2026-10-11 他定的新规矩（这一颗跟着改的两处，别处不许再走老路）：
     · 分家 的默认落点不再是 main —— 是这一轮那条 feature/… 支（清单里那一行说的，形状不合当场抛）；
     · 拼装 的基点跟着落点走：这一轮的改动落在支上，盘上这一棵就得从那条支起合（打包那一趟照旧从 main 起合）；
     · 新增 各家快进()：六家那一支是主干的跟随指针、不再各自开 PR，他合并之后那一趟把每支接到 main 后面 ——
       只挪指针、已有的一笔都不改写；某支上有 main 里不存在的内容（真分叉）或撞车就停下来报是哪一家。
     合进 main、往 GitHub 推这些动作一律不在这一颗里：推支与建 PR 只在 src\_build\pr.mjs 那一颗。

   外46 五（他 2026-10-11 定：六家的代码从 main 那一支摘出去）：
     · main 那一支只放主程序 —— 单独 clone main 得到的是没有插件的一棵（他认了这个代价）；
     · 六家各住一支长期分支 plugin/<id>，摘出来那一笔是六支共同的爹，所以各支相对 main 只有"加自己那几份"这一手，
       合起来不会撞车；
     · 出安装包之前把这六支与 main 合成「assemble」那一支，工作树平时就站在这棵上（七家的文件得在盘上，程序才加载得到），
       打包、探针、他日常改代码都在这棵上 —— 改动由「往那一支写」按路径送回各自那一支，main 不被插件牵动；
     · 为写那一家 2026-10-13 回到这一格：和其余六家一个形状，代码在 plugin/why-not-write 那一支，
       那 22 份内核源码与出内核那颗脚本也并进这一个仓了（隔壁那一棵私有仓与它那条远程都撤了）。
   这一份管两件事：
     一、登记七家各自占哪些路径 —— 名单只此一份，发布脚本和探针都拿它算，别处不许另抄一份对应表；
     二、七支的底层接口（往那一支写 / 那一支最后一笔 / 拼装 / 分家 / 没回main的改动 / 各家快进 / 本轮那一支名）。

   形状：各支里的路径跟主干一模一样（data\plugins\notes\main.js 还是这一串），
   所以「这一家改了没有」拿两份对一次树就得出，不需要谁再维护第二份对应表。
   改代码就在这一棵树改，改完由「往那一支写」按路径送回各自那一支。

   提交身份：作者名用 GitHub 上那个，邮箱一律写 noreply@invalid（.invalid 是保留域，
   投不到任何信箱），所以公开面上读不出真邮箱。这台机器的 git 全局配置一个字不动。

   提交形状（他 2026-10-10 定）：正常多条提交，不压成单颗、不 amend、不 force-push ——
   细粒度留着方便查 bug。这一家的内容和主仓那一份逐字节比得出有没有动，没动就不提交。
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { 读清单, 读盘清单, 支名形状, 可推远程, 认支类, 集成分支名 } from './push-list.mjs';

const HERE = import.meta.dirname;
export const TREE = path.resolve(HERE, '..', '..');           /* Flow-Desk 那一棵树 */
/* 这一份既是命令行工具，也被 src\_build\release.mjs 当零件用：命令行那一段只在"直接跑我"时才执行 */
const 被当命令跑 = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
const argv = 被当命令跑 ? process.argv.slice(2) : [];
const has = f => argv.includes(f);
const val = (f, d) => { const a = argv.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : d; };
const DRY = has('--dry');
const ONLY = val('--only', '').split(',').map(s => s.trim()).filter(Boolean);
const MSG = val('--msg', '');
export const OUT_DEFAULT = path.join(path.dirname(TREE), path.basename(TREE) + '-plugins');
/* 铺出去那一格默认在仓外那一格（这一棵树的上一层、同名加 -plugins）：串现算，不写死盘符 ——
   写死了这一份自己就把这台机器的位置公开在公开面上（公开面那道闸 src\_build\public-scan.mjs 认这一条）。
   换机器 / 换盘：给 --out=目录 就行。 */
export const OUT = path.resolve(val('--out', OUT_DEFAULT));
const GIT_NAME = 'LunarFeast';
const GIT_MAIL = 'noreply@invalid';                           /* 保留域，投不到任何信箱 */

const pack = id => 'data/plugins/' + id;                   /* 一家插件整格 */
const COMMON = ['LICENSE', 'THIRD-PARTY.txt'];                /* 两份声明跟着走：仓库没声明 = 默认保留所有权利 */

/* 外46 五（他 2026-10-11 定）：六家的代码从 main 那一支摘出去，一家住一支长期分支；
   出安装包之前把这六支与 main 临时合成「拼装」那一支，打包认那一棵。
   支名就一家一个，跟插件 id 同字 —— 别处不再抄第二份对应表。 */
export const 拼装支 = 'assemble';

/* 打包那三样的落点，和那一本「这一枚是什么形状」的账（2026-10-14 加）：
   release.mjs 每打成一枚就往这一本里记一笔（哪一枚 exe、简装还是完整、带了哪几家插件与哪几项功能），
   push-ui.mjs 读它，屏上才分得出「全功能那一枚是哪一份文件」—— 五枚 exe 的名字只差那一段短哈希，
   他 2026-10-14 那句「找不到全功能的完整的安装包」就是被这个卡的。
   这一格整个被 .gitignore 第一节（根上默认全拒）挡着，不进仓、不上公开面；名字只在这两份里写这一处。 */
export const 产物格 = path.join(TREE, 'dist', 'tauri');
export const 打包记录名 = '这一摞包.json';
export const 打包记录路 = path.join(产物格, 打包记录名);

export const 家 = [
  { id:'notes',                  中文:'你的便签',       支:'plugin/notes',                  仓:'', from:[pack('notes')] },
  { id:'schedule',               中文:'日程',           支:'plugin/schedule',               仓:'', from:[pack('schedule')] },
  { id:'your-sentences',         中文:'你的句子',       支:'plugin/your-sentences',         仓:'', from:[pack('your-sentences')] },
  { id:'music-remote',           中文:'音乐遥控器',     支:'plugin/music-remote',           仓:'', from:[pack('music-remote'),
      'src/pack/plugin/FlowDeskBridge.cs', 'src/pack/plugin/MBHeader.cs', 'src/pack/plugin/build-plugin.ps1'] },
  { id:'singbit-input-practice', 中文:'声笔输入法练习', 支:'plugin/singbit-input-practice',  仓:'', from:[pack('singbit-input-practice'),
      'src/_build/rp-kernel.mjs', 'src/_build/rp-base.html',
      'src/_build/p1.js', 'src/_build/p2.js', 'src/_build/p3.js', 'src/_build/p4.js', 'src/_build/p5.js', 'src/_build/p6.js'] },
  { id:'why-not-write',          中文:'为写',           支:'plugin/why-not-write',           仓:'', from:[pack('why-not-write')] },
];

/* 2026-10-13 他定的：为写不再搞独立那一棵 —— 基础的为写回到插件这一格，和其余六家一起进出厂那一层。
   所以这一张表里七家全是「不带仓、各住 plugin/<id> 那一支」，隔壁那一棵与「整格重铺再落一笔」那一条路一起退场。
   仍然留在私有的只有为写那一份内核源码（src\_wnw\src\ 与它的产物 wnw-kernel.js，.gitignore 里那两条照旧）。 */
export const REPOS = 家.filter(j => j.仓);           /* 空：不再有带独立仓的那一家，留着这一颗是给旧账一个说法 */
export const 分支家 = 家.filter(j => j.支);

/* 清单上那一笔的名字只有这一颗：--看 写它（release.mjs）、落笔按落点找回它（下面那颗 各家说明）都叫这一颗。
   两边各拼一遍的话，拼法一差一点就静悄悄找不中那一笔，界面上看着有字、其实落的是空说明。 */
export const 笔名 = j => j.中文 + ' · ' + j.id;
export const 主程序笔名 = '主程序 · Flow-Desk';

/* ---------- 清单：目录整格收下（点开头的、产物、构建输出不要） ---------- */
const SKIP_NAME = /^\.|\.zip$/;
const SKIP_PATH = /(^|\/)(dist|node_modules|备份)\//;
function listFrom(rel){
  const abs = path.join(TREE, rel);
  if(!fs.existsSync(abs)) return null;
  if(fs.statSync(abs).isFile()) return [rel.replace(/\\/g, '/')];
  const out = [];
  for(const e of fs.readdirSync(abs, { withFileTypes:true })){
    if(e.name.startsWith('.')) continue;
    const r = rel + '/' + e.name;
    if(e.isDirectory()){ out.push(...listFrom(r)); continue; }
    if(SKIP_NAME.test(e.name) || SKIP_PATH.test(r)) continue;
    out.push(r.replace(/\\/g, '/'));
  }
  return out.sort();
}
export function filesOf(job){
  const set = new Set(COMMON);
  for(const rel of job.from){
    const got = listFrom(rel);
    if(!got) throw new Error(job.仓 + ' 要收的那一格不存在：' + rel);
    for(const f of got) set.add(f);
  }
  return [...set].sort();
}

/* ---------- 私人东西不许进公开面 ---------- */
/* 这两条要盯的字面量从现场取（本机帐户名、这台机器 git 里那个身份），
   不写死在这一份里 —— 写死了这一份自己就把它们公开出去了。 */
const 户 = os.userInfo().username;
const 旧身份 = (() => { try{ return execFileSync('git', ['config', '--global', 'user.email'], { encoding:'utf8' }).trim(); }catch(e){ return ''; } })();
const BIN = /\.(dll|exe|png|jpg|jpeg|gif|webp|ico|zip|woff2?|ttf|otf)$/i;
/* 盯的就是「这台机器自己的东西」：帐户名与旧身份现场取，绝对路径那一类只认这一棵树那一头 ——
   别的盘、别的位置都算这台机器的事，写进公开面就是漏。占位写法（<帐户名>、%APPDATA%、别处 那一类）放过。 */
const 占位 = /<|>|%|\$|帐户名|账户名|用户名|某|别处|备份处|这里|那里|Example|example/i;
function 扫行(line){
  const 中 = [];
  if(户 && line.includes(户)) 中.push('这台机器的 Windows 帐户名');
  if(旧身份 && line.toLowerCase().includes(旧身份.toLowerCase())) 中.push('这台机器 git 配置里那个旧身份');
  if(/[a-z0-9._%+-]+@(?:gmail|qq|163|126|outlook|hotmail|sina|foxmail|icloud)\.com/i.test(line)) 中.push('一个真邮箱');
  if(/[a-z0-9._%+-]+@users\.noreply\.github\.com|@github\.com/i.test(line)) 中.push('GitHub 那一头的地址');
  /* 只认「盘符 + 一个真目录名」那种写法：`b:/` 那种正则片段、`C:\\...\\X` 那种省略写法都不算 */
  for(const m of line.matchAll(/(?<![A-Za-z0-9_])([A-Za-z]):[\\/]{1,2}([A-Za-z0-9_\u4e00-\u9fff<%$][^\s'"`,)（）]*)/g)){
    const 盘 = m[1].toUpperCase(), 尾 = String(m[2] || '');
    if(盘 === 'D' && /^[/\\]?Programs[/\\]Flow-Desk/i.test(尾)) continue;   /* 这一棵树自己 */
    if(占位.test(尾) || 占位.test(line)) continue;
    中.push('仓外那一格的绝对路径（写在 ' + 盘 + ': 那一个盘上）');
  }
  return 中;
}
function scanLeaks(list){
  const bad = [];
  for(const rel of list){
    if(BIN.test(rel)) continue;
    const lines = fs.readFileSync(path.join(TREE, rel), 'utf8').split(/\r?\n/);
    for(let i = 0; i < lines.length; i++)
      for(const why of 扫行(lines[i])) bad.push(rel + ':' + (i + 1) + ' · ' + why + ' · ' + lines[i].trim().slice(0, 90));
  }
  return bad;
}

/* ---------- git ---------- */
export function git(cwd, args, 加环境){
  return execFileSync('git', args, { cwd, encoding:'utf8',
    env:{ ...process.env, GIT_AUTHOR_NAME:GIT_NAME, GIT_AUTHOR_EMAIL:GIT_MAIL,
          GIT_COMMITTER_NAME:GIT_NAME, GIT_COMMITTER_EMAIL:GIT_MAIL, ...(加环境 || {}) },
    stdio:['ignore', 'pipe', 'pipe'] }).trim();
}
function hasHead(dir){
  try{ git(dir, ['rev-parse', '--verify', 'HEAD']); return true; }catch(e){ return false; }
}
function mirror(list, dest){
  const keep = new Set(list);
  const del = [];
  const walk = rel => {
    const abs = path.join(dest, rel);
    if(!fs.existsSync(abs)) return;
    for(const e of fs.readdirSync(abs, { withFileTypes:true })){
      if(e.name === '.git') continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if(e.isDirectory()){ walk(r); continue; }
      if(!keep.has(r)) del.push(r);
    }
  };
  walk('');
  for(const r of del) fs.rmSync(path.join(dest, r), { force:true });
  for(const rel of list){
    const to = path.join(dest, rel);
    fs.mkdirSync(path.dirname(to), { recursive:true });
    fs.copyFileSync(path.join(TREE, rel), to);
  }
  /* 删完文件留下的空壳也一并摘掉（git 不认空目录，但人打开那一格看着是垃圾） */
  const prune = rel => {
    const abs = path.join(dest, rel);
    if(!fs.existsSync(abs)) return;
    for(const e of fs.readdirSync(abs, { withFileTypes:true })){
      if(e.isDirectory() && e.name !== '.git') prune(rel ? rel + '/' + e.name : e.name);
    }
    if(rel && !fs.readdirSync(abs).length) fs.rmSync(abs, { recursive:true, force:true });
  };
  prune('');
  return del;
}

/* ---------- 外46 五：一家一支的那几件事（走 git 的底层接口，不动盘上那棵树） ----------
   为什么不 checkout 到那一支上再提交：他的工作树平时站在「拼装」那一支（七家的文件得在盘上，
   程序才加载得到插件），来回切支会把盘上的件换来换去，动到一半收不回来。
   下面这一套只读盘上那一份、把字节送进对象库，最后挪一下分支那根指针 —— 盘上一个字节都不动。 */
const 临时索引 = () => path.join(TREE, '.git', 'tmp-branch-index');
function 送进对象库(内容){
  /* stdio 这里不能整串写死：'ignore' 会把喂进去的那份字节堵掉，
     git 收不到东西就回一颗空文件的哈希，整棵树看着就是「这些份全删了」。 */
  return execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd:TREE, encoding:'utf8',
    env:{ ...process.env }, input:内容 }).trim();
}

/* 往那一支写一笔。份 = [{ 份:路径 } | { 份:路径, 内容:'整份文本' }]：
   给内容就照内容入（号写回清单那一类笔），不给就读盘上那一份；盘上没了的就是删。
   合出来的树与那一支原来那棵树一模一样 -> 不落笔，回空串（各家轮着空提交就是这么来的）。 */
export function 往那一支写(支, 份, 说明, 起点){
  const 头 = 起点 || git(TREE, ['rev-parse', 支]);
  const 索引 = 临时索引(), 环境 = { GIT_INDEX_FILE: 索引 };
  fs.rmSync(索引, { force:true });
  git(TREE, ['read-tree', 头], 环境);
  for(const x of 份){
    const 路 = path.join(TREE, String(x.份).split('/').join(path.sep));
    let 字 = '', 式 = '100644';
    if(x.内容 !== undefined) 字 = 送进对象库(x.内容);
    else if(fs.existsSync(路)){
      try{ if(fs.statSync(路).mode & 0o111) 式 = '100755'; }catch(e){}
      字 = 送进对象库(fs.readFileSync(路));           /* 整份字节照送，换行不动 */
    }
    if(字) git(TREE, ['update-index', '--add', '--cacheinfo', 式 + ',' + 字 + ',' + x.份], 环境);
    else git(TREE, ['update-index', '--force-remove', '--', x.份], 环境);
  }
  const 树 = git(TREE, ['write-tree'], 环境);
  fs.rmSync(索引, { force:true });
  let 老树 = ''; try{ 老树 = git(TREE, ['rev-parse', 头 + '^{tree}']); }catch(e){}
  if(老树 && 老树 === 树) return '';
  const 笔 = git(TREE, ['commit-tree', 树, '-p', 头, '-m', 说明]);
  /* 那一根支已经存在 → 带着旧值去挪（被谁动过就报错，不悄悄盖掉）；
     还不存在（这一轮那条 feature 支的第一笔）→ 旧值给全零那 40 个 0，git 认它是"这一根本来不许存在"，
     这样新建照样带着防抢写的核对。写成 () 这一版 git 不认（报 not a valid old SHA1），试过。 */
  let 有这一根 = true;
  try{ git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 支]); }catch(e){ 有这一根 = false; }
  git(TREE, ['update-ref', 'refs/heads/' + 支, 笔, 有这一根 ? 头 : '0'.repeat(40)]);
  return 笔;
}

/* 他自己用 git 在拼装那一棵上直接提交过插件的改动时，这一手兜住：把这一家该收的份
   （盘上现在有的 + 那一支上原本有的 —— 他删掉的那一份也要过一遍，不然那一支上留个鬼件）
   整格与那一支比一次，一个字没变就不落笔。 */
export function 同步那一支(job, 说明){
  const 在盘 = filesOf(job).filter(f => f !== 'LICENSE' && f !== 'THIRD-PARTY.txt');
  let 在支 = [];
  try{ 在支 = git(TREE, ['ls-tree', '-r', '--name-only', job.支, '--'].concat(job.from)).split(/\r?\n/).filter(Boolean); }
  catch(e){ }
  const 份 = [...new Set([...在盘, ...在支])].sort();
  return 往那一支写(job.支, 份.map(f => ({ 份:f })), 说明);
}

/* 这一支上最后动过代码的那一笔 —— 号就从这一笔取。
   「记号」起头那一笔只是把号写进清单，不算代码动过（不然写完号下一趟永远比出新号，轮着空提交）。 */
export function 那一支最后一笔(job){
  try{ return git(TREE, ['log', '-1', '--format=%h', '--invert-grep', '--grep=^记号 ', '--grep=发布记号', job.支, '--'].concat(job.from)); }
  catch(e){ return ''; }
}

/* 这一轮那条支的名字从哪儿来（2026-10-11 他定的新规矩：一律走独立分支 + PR，不再直接动 main）：
   清单那一行「提交分支 =」（data\推送清单.txt，他可改）。形状不合或那一行没填就当场抛 ——
   绝不悄悄退回 main：退回 main 就等于把「不许直接向 main 提交」这条规矩从后门放走了。 */
export function 本轮那一支名(){
  const 清 = 读清单(读盘清单());
  const 名 = String(清.提交分支 || '').trim();
  if(!名) throw new Error('清单里没有「提交分支 =」那一行（data\\推送清单.txt）：这一轮的改动没地方落 —— 先跑 node src/_build/release.mjs --看，或直接在那一格填上这条支的名字');
  if(!支名形状.test(名) && !可推远程(名).行) throw new Error('「提交分支 =」那一行不成样子：「' + 名 + '」。' + 可推远程(名).话 + '；旧那三种头一段（feature/… 、hotfix/… 、release/… ）也还认，斜杠后面小写字母或数字起头，只许 a-z 0-9 . _ -');
  return 名;
}

/* 屏上那一条「只在本地」的清单（他 2026-10-12 第 5 件）：本地那些前瞻支 —— 全新功能 feature/new/… 与
   已有功能优化 feature/tweak/… —— 里还没合进本地 main 的，一条一条列出来，每条量三样：
   相对主干多了哪几笔、动了哪几份、远程那一头有没有它。
   全程纯读、不碰网络：远程那一头看的是本地已经知道的 refs/remotes/origin/…（fetch 归 pr.mjs 那一头）。
   基础版就是本地 main：比对用三点写法（main...支），量的是这条支自分叉之后自己多的那些。 */
export function 本地前瞻支(主干){
  const 干 = String(主干 || 'main').trim();
  let 名册 = [];
  try{ 名册 = String(git(TREE, ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'])).split(/\r?\n/).filter(Boolean); }
  catch(e){ return []; }
  const 出 = [];
  for(const 名 of 名册){
    const 类 = 认支类(名);
    if(!类 || (类.类 !== '新增' && 类.类 !== '优化')) continue;
    let 笔 = [], 份 = [];
    try{
      笔 = String(git(TREE, ['log', '--format=%h %s', 干 + '..' + 名])).split(/\r?\n/).filter(Boolean);
      份 = [...new Set(String(git(TREE, ['diff', '--name-only', 干 + '...' + 名])).split(/\r?\n/).filter(Boolean))];
    }catch(e){ continue; }                       /* 问不出的那条（拿不到主干等）干脆不列，不蒙一条空的给他看 */
    if(!笔.length) continue;                      /* 已经全在 main 里的不算"没推的前瞻支" */
    let 已推 = false;
    try{ git(TREE, ['show-ref', '--verify', '--quiet', 'refs/remotes/origin/' + 名]); 已推 = true; }catch(e){}
    出.push({ 名, 类: 类.类, 笔数: 笔.length, 笔, 份数: 份.length, 份: 份.slice(0, 60), 份全: 份.length > 60, 已推 });
  }
  return 出.sort((a, b) => a.名 < b.名 ? -1 : 1);
}

/* ---------- 阶段二那两步（他 2026-10-12 第 2 件）：主干 → 功能支 → 集成分支，方向反过来一律不做 ----------
   走的还是 各家快进 那一套底层接口（merge-tree 现合一棵 + commit-tree + update-ref 带旧值挪那根指针）：
     · 盘上一个字节不动 —— 工作树照旧站在拼装那一棵，不 checkout、不拿工作树去 merge；
     · 只往前挪，已有的一笔一概不改写（不 rebase、不 amend、不 --force）；
     · 方向钉死：把 源 合进 支，动的只有 支 那一根指针。反过来（把支合进 main）这一颗做不到 ——
       那是他硬性禁止清单第一条；
     · 撞车当场抛并列出撞的是哪几份，交给人在那一条支里解：绝不自动解，也绝不让谁切到 main 去解。 */
export function 合进那条支(支, 源, 选项){
  const 从 = String(源 || 'main').trim();
  if(支 === 从) throw new Error('要把「' + 从 + '」合进它自己？这一颗不办。');
  let 支头 = '';
  try{ 支头 = git(TREE, ['rev-parse', 支]); }catch(e){}
  if(!支头){
    const 起 = String((选项 && 选项.起点) || 'main').trim();
    let 起头 = '';
    try{ 起头 = git(TREE, ['rev-parse', 起]); }
    catch(e){ throw new Error('本地没有「' + 支 + '」那条支，想替它起一根又从「' + 起 + '」取不到那一笔：先同步 main 再来。'); }
    git(TREE, ['update-ref', 'refs/heads/' + 支, 起头]);
    支头 = 起头;
  }
  let 从头 = '';
  try{ 从头 = git(TREE, ['rev-parse', 从]); }catch(e){ throw new Error('问不出「' + 从 + '」那一笔：它还不存在？'); }
  try{ git(TREE, ['merge-base', '--is-ancestor', 从头, 支头]);
    return { 支, 从, 动了: false, 话: '「' + 从 + '」那一笔已经全在「' + 支 + '」里，这一趟不用合' }; }catch(e){}
  let 树 = '';
  try{ 树 = String(git(TREE, ['merge-tree', '--write-tree', 支头, 从头])).split(/\r?\n/)[0]; }
  catch(e){
    const 撞 = String((e && e.stdout) || '').split(/\r?\n/).filter(Boolean).slice(1, 24);
    throw new Error('「' + 从 + '」合进「' + 支 + '」撞车了（两边动过同一份）。冲突只在「' + 支 + '」这一支里解，不许切到 ' + 从 + ' 去合。\n' +
      (撞.length ? '  撞在这些份：\n  ' + 撞.join('\n  ') + '\n' : '') +
      '  人工那一眼：git -C ' + TREE + ' log --oneline ' + 从头.slice(0, 7) + '...' + 支头.slice(0, 7));
  }
  const 新 = git(TREE, ['commit-tree', 树, '-p', 支头, '-p', 从头, '-m',
    String((选项 && 选项.话) || ('合入 ' + 从 + '：把「' + 从 + '」这一头的更新接进「' + 支 + '」，冲突在这一支里处理'))]);
  git(TREE, ['update-ref', 'refs/heads/' + 支, 新, 支头]);
  return { 支, 从, 动了: true, 笔: 新.slice(0, 7), 从笔: 从头.slice(0, 7), 支旧: 支头.slice(0, 7) };
}

/* 「重建集成分支」那颗（他 2026-10-12 第 7 件 + 定夺 3）：从本地 main 起一根集成分支，
   把勾中的那几条本地前瞻支一条一条合上去。
     · 起那一根只是挪指针：旧集成分支上那些笔照旧留在仓里，旧 assemble 那一支与它的历史一概不删；
     · 一条一条合，撞车就停下来报是哪一条撞的、已经合上去的是哪几条 —— 不自动解，也不跳过它继续合后面；
     · 永不推远程：这一根指针由 可推远程() 钉死在本地（推那一步会当场拒）。 */
export function 重建集成分支(支列表, 选项){
  const 集 = String((选项 && 选项.集成分支) || 集成分支名).trim();
  const 干 = String((选项 && 选项.主干) || 'main').trim();
  let 干头 = '';
  try{ 干头 = git(TREE, ['rev-parse', 干]); }catch(e){ throw new Error('问不出「' + 干 + '」那一笔：先同步 main 再来重建。'); }
  const 挑 = [...new Set((支列表 || []).map(s => String(s || '').trim()).filter(Boolean))];
  if(!挑.length) throw new Error('一条支都没勾：重建集成分支要写明把哪几条本地前瞻支合上去。');
  const 不该 = 挑.filter(名 => 名 === 干 || 名 === 集 || 名 === 拼装支);
  if(不该.length) throw new Error('这几条不能往集成分支上合：' + 不该.join('、') + '（主干、集成分支本身、拼装那一棵都不算前瞻支）');
  const 认错 = 挑.filter(名 => { const x = 认支类(名); return !x || (x.类 !== '新增' && x.类 !== '优化'); });
  if(认错.length) throw new Error('这几条不是那两类前瞻支（feature/new/… 或 feature/tweak/…）：' + 认错.join('、') +
    ' —— 认不出类的、或那一类不该进集成分支的，一律不混进来');
  let 旧集 = '';
  try{ 旧集 = git(TREE, ['rev-parse', 集]); }catch(e){}
  git(TREE, ['update-ref', 'refs/heads/' + 集, 干头]);
  const 出 = [];
  for(const 名 of 挑){
    try{
      const r = 合进那条支(集, 名, { 话: '合入 ' + 名 + '：重建集成分支（从 ' + 干 + ' 起底）时把这条前瞻支并进来' });
      出.push({ 支: 名, 动了: r.动了, 笔: r.笔 || '' });
    }catch(e){
      throw new Error('合到「' + 名 + '」这一条撞车，重建停在这儿。\n' +
        '  已经合上去的是：' + (出.length ? 出.map(x => x.支).join('、') : '（还没有一条合上去）') +
        '\n  集成分支那一根停在 ' + git(TREE, ['rev-parse', '--short', 集]) + '，没有自动解、也没有跳过它继续合后面。\n' +
        '  ' + String((e && e.message) || e));
    }
  }
  return { 集成分支: 集, 主干: 干, 底: 干头.slice(0, 7),
    旧底: 旧集 ? 旧集.slice(0, 7) : '（这一根本来不存在，这一趟新起的）', 合了: 出 };
}

/* 分家那几笔的提交说明：一家一句，全从清单那一格取（他 2026-10-12 第 3 条：文字归他填）。
   落点 → 那一笔：六家按各自那一支（plugin/<id>）；不属于六家的那些份落到这一轮那条支上，那一桶用顶上「主程序」那一笔。
   七家全在这一张表里（2026-10-13 为写回到插件这一格，没有落在别处的那一家了）。
   哪一桶空着，分家 当场抛并点名等哪一格 —— 不拿「本轮说明」那一行顶上去，那等于我替他定这一家说什么。 */
export function 各家说明(默认落点){
  const 清 = 读清单(读盘清单());
  const 取 = 名 => String(清.描述[名] == null ? '' : 清.描述[名]).trim();
  const 出 = {};
  for(const j of 分支家) 出[j.支] = 取(笔名(j));
  出[String(默认落点 || '').trim() || 本轮那一支名()] = 取(主程序笔名);
  return 出;
}

/* 这一桶落哪一句提交说明。单拎出来是为了能真跑 —— 分家 一起手就往仓里落笔，判据不能只在源码里看。
   递了那张表（pr.mjs 那一趟）就按落点取，空着当场抛并点名是哪一笔；
   没递（CLI 那趟 --收改动 --msg=…）就用递进来的那一句 —— 那一句是他亲手打的字，不是脚本编的。 */
export function 挑一句(各家, 落点, 那一笔, 说明){
  if(!各家) return 说明;
  const s = String(各家[落点] == null ? '' : 各家[落点]).trim();
  if(s) return s;
  throw new Error('这一桶要落到「' + 落点 + '」上，可清单里「' + 那一笔 + '」那一笔的「更新描述 =」还空着：' +
    '这一家的提交说明得由你填（参照文字就在它底下那行 # 里）。我不替你写，也不拿顶上「本轮说明」那一行顶上去 —— 那等于我替你定了这一家说什么。');
}

/* 把「这一轮盘上动了的份」按路径分家送回各自那一支（剩下的落到这一轮那条支），然后把拼装那一棵重拼出来。
   为什么要有这一手：工作树平时站在拼装那一棵（七家的文件得在盘上），他改完东西那笔落在这棵上就会被
   下一次拼装抹掉 —— 所以改动的去处不是"当前站在哪一支"，而是"这一份归谁"。
   只挑动了的那几份往那一支上贴，不整格重铺：贴完比树，一模一样就不落笔。
   贴完重拼一棵，工作树跟着挪过去 —— 那一步会先逐份确认盘上每个字节都已经进了某一支，没进就不切。
   落点（2026-10-11 换的口径）：六家照旧各回自己的 plugin/<id>；不属于六家的那些份从前默认落 main，
   现在默认落「这一轮那条 feature/… 支」—— main 这一支由 pr.mjs 拿它当支头开支，这一颗一个字都不往它上面写。
   各家说明（第三枚参数，2026-10-12 第 3 条）：pr.mjs 那一趟递 各家说明() 进来，一家一句；
   CLI 那一趟（--收改动 --msg=这一轮改了什么）不递，那一句是他亲手打的字，照旧一句走到底。 */
export function 分家(说明, 落点, 各家){
  const 默认落点 = String(落点 || '').trim() || 本轮那一支名();
  const 动了 = [...new Set([
    ...git(TREE, ['diff', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean),
    ...git(TREE, ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean),
  ])].sort();
  const 桶 = new Map();
  for(const f of 动了){
    const 主 = 归那一家(f);
    const 去 = 主 ? 主.支 : 默认落点;
    if(!桶.has(去)) 桶.set(去, []);
    桶.get(去).push({ 份:f });
  }
  const 出 = [];
  for(const [去, 份] of 桶){
    /* 这一轮那条支还没开出来（清单里填了新名字、盘上还没有）：从 main 那一笔起头，第一笔就把支生出来。
       量出来的：不补这一格，往那一支写 会拿 rev-parse <还不存在的支> 当父笔，当场抛 ambiguous argument。 */
    let 起点 = '';
    try{ git(TREE, ['rev-parse', '--verify', 'refs/heads/' + 去]); }catch(e){ 起点 = 'main'; }
    const 找 = 分支家.find(j => j.支 === 去);
    const 那一笔 = 找 ? 笔名(找) : 主程序笔名;
    const 句 = 挑一句(各家, 去, 那一笔, 说明);
    出.push({ 落点:去, 份:份.length, 笔:往那一支写(去, 份, 句, 起点) });
  }
  if(动了.length) 拼装('分家提交之后重拼', 默认落点);     /* 动了就得重拼：就算哪一家一笔都没落，拼装那一棵也可能比各支旧 */
  return { 动了:动了.length, 出, 落点:默认落点 };
}

/* 拼装那一支上有没有「不属于任何一家的改动」还没回到 main —— 有就得停下来：
   下一次拼装是从 main 重新合的，把这一类笔留在拼装那一支上等于抹掉他写的东西。 */
export function 没回main的改动(){
  const 排除 = 分支家.flatMap(j => j.from.map(f => ':(exclude)' + f));
  try{ return git(TREE, ['log', '--format=%h', 'main..' + 拼装支, '--', '.'].concat(排除)).split(/\r?\n/).filter(Boolean); }
  catch(e){ return []; }
}

/* 把这一棵工作树对齐到某一笔上，条件是「盘上那些字节已经全在这一笔里了」：
   先看 git diff 那一笔 —— 只要没有内容不一样的份（只许有「那一笔里有、盘上还没有」的那种），
   就挪分支指针、对索引、把缺的那几份补下来。
   为什么不用 git checkout -B：盘上有没进账的改动时它本来就 refuse；
   而真要用强切（reset --hard）的话，切之前必须逐份确认盘上每一个字节都在对象库里 —— 这里就是那道确认。
   外46 六补的那一格「已进账但被顶掉了」：号写回清单那一手把新一串号写进各家那一支，重拼出来的那一棵
   自然比盘上那一份新；盘上那一份是上一版拼装的脸，已经进过账，不是没进账的改动 ——
   从前撞上这一手就直接 refuse（各家的号一换串，拼装就起不来）。认的规矩换成：
   与那一笔不一样的那些份里，只拒绝「连当前这一支上都没有」（git status 报了改动）的那些。 */
function 落到位(笔){
  const 当前 = git(TREE, ['rev-parse', '--abbrev-ref', 'HEAD']);
  /* 「盘上有改动」问的是 git diff --name-only HEAD 那一串（未跟踪的那几份一并算上）——
     不用 status --porcelain：这一颗的 git() 会把整串输出 trim 一次，行首那两个状态位的空格就被吃掉，
     第一行的路径跟着少切一个字，这道闸会当着「确实没进账」的第一行放行（量出来的）。 */
  const 脏 = new Set(([
    ...git(TREE, ['-c', 'core.quotepath=false', 'diff', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean),
    ...git(TREE, ['-c', 'core.quotepath=false', 'ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean),
  ]).map(f => f.trim()));
  const 差 = git(TREE, ['-c', 'core.quotepath=false', 'diff', '--name-status', 笔]).split(/\r?\n/).filter(Boolean);
  const 没进账 = 差.filter(l => !/^D\t/.test(l) && 脏.has(l.split('\t').pop()));
  if(没进账.length)
    throw new Error('盘上有 ' + 没进账.length + ' 份改动还没进任何一支（' + 没进账.slice(0, 6).map(s => s.split('\t').pop()).join('、') +
      '），不敢切树。先跑 --收改动 把它们按路径分家。');
  if(当前 !== 拼装支){
    git(TREE, ['update-ref', 'refs/heads/' + 拼装支, 笔]);
    git(TREE, ['checkout', '-q', 拼装支]);                 /* 从 main 那一棵过来时走这条：指针先挪好，再普通切树 */
  }else{
    git(TREE, ['update-ref', 'refs/heads/' + 拼装支, 笔]);
    git(TREE, ['reset', '-q', '--mixed', 笔]);
    git(TREE, ['checkout', '--', '.']);                     /* 只补缺的那几份：内容已与索引对上的，一个字节不动 */
  }
  /* 补一次索引里的"这份文件现在什么样"（大小、时间）。少了这一手，凡是有换行换算的份（*.bat 是 eol=crlf：
     仓里存 LF、盘上出 CRLF，两个字节数天生不一样）都会被下一趟 status 当成改了 ——
     量出来的：--收改动 拼完一棵之后 status 报「M src/tools/push-fd.bat」，可 git diff 说没差，
     而发布那道闸吃的正是 status --porcelain，会当着他停在一处根本不存在的改动上。 */
  git(TREE, ['update-index', '--really-refresh']);
}

/* 把「这一棵」与那六支合成一棵：一支一支合，合出来的树 + 两个爹（前一棵、那一支的那一笔）。
   全走对象库，不碰盘上那棵树 —— 七家的文件得一直在盘上，程序才跑得；切来切去容易咬着正在读的文件。
   两支动了同一家的同一份才会撞车（各支只加自己那几份，正常情况下撞不上）：撞了就停下来让人合。
   基点（2026-10-11 换的口径）：从前只会从 main 起合；这一轮的改动落在 feature/… 那条支上之后，
   盘上这一棵得从那条支起合才与盘上对得上（落到位那道闸认的是「盘上每个字节都已经在某一支里」）。
   打包那一趟照旧从 main 起合（不传就是这个字）—— 那时候那条支已经被他人工合进 main 了。 */
export function 拼装(在做什么, 基点){
  const 主干 = String(基点 || '').trim() || 'main';
  let 起 = git(TREE, ['rev-parse', 主干]);
  for(const job of 分支家){
    let 树;
    try{ 树 = git(TREE, ['merge-tree', '--write-tree', 起, job.支]); }
    catch(e){ throw new Error(主干 + ' 与 ' + job.支 + ' 合不上（两边动过同一份）：' + String((e && e.stderr) || (e && e.message) || e).split(/\r?\n/)[0]); }
    起 = git(TREE, ['commit-tree', 树, '-p', 起, '-p', job.支, '-m',
      '外46 五 · 拼装' + (在做什么 ? '（' + 在做什么 + '）' : '') + '：把' + job.中文 + '那一支（' + job.支 + '）并进来']);
  }
  落到位(起);
  return git(TREE, ['rev-parse', '--short', 'HEAD']);
}

/* 这一份归哪一家（六家各自占的那几格路径之内才算）：认这一颗的只有 家 那一张表，别处不许抄第二份 */
export function 归那一家(f){
  if(f === 'LICENSE' || f === 'THIRD-PARTY.txt') return undefined;
  return 分支家.find(j => j.from.some(p => f === p || f.startsWith(p.replace(/\/$/, '') + '/')));
}

/* 六家那一支是「跟随指针」，不是主干（2026-10-11 定的口径：它们不再各自开 PR）。
   这一手只在「他把 PR 合进 main 之后」那一趟跑：把每家那一支接到 main 后面，让它别一直停在摘出去那一笔上。
   走的还是上面那套底层接口（merge-tree 现合一棵 + commit-tree + update-ref 挪那根指针）：
     · 盘上一个字节不动；
     · 已经存在的一笔都不改写 —— 不 rebase、不 amend、不 --force，只往前挪；
     · 带旧值挪指针：那一支被谁动过就报错，不悄悄盖掉。
   两种情况当场停下来报是哪一家，一律不自动处理：
     ① 那一支上有 main 里不存在的内容（自家那几格之外还动了别的东西）= 真分叉；
     ② merge-tree 合不上（两边动过同一份）= 撞车 —— 让人工合。
   号那套一个字没改：那一支最后动过代码的那一笔照旧从支上取。快进那一笔不动任何代码份
   （合出来的树里自家那几份的字节与那一支原来一模一样），git log -- <自家那几格> 的历史简化不把它算成动过代码。 */
export function 各家快进(主干){
  const 基 = String(主干 || '').trim() || 'main';
  let 头 = '';
  try{ 头 = git(TREE, ['rev-parse', 基]); }
  catch(e){ throw new Error('问不出 ' + 基 + ' 那一笔：它还不存在？先同步远程 main 再来快进。'); }
  const 出 = [];
  for(const job of 分支家){
    let 支头 = '';
    try{ 支头 = git(TREE, ['rev-parse', job.支]); }
    catch(e){ 出.push({ 中文:job.中文, 支:job.支, 好:false, 话:'这一支还不存在（' + job.支 + '）' }); continue; }
    const 分叉 = 那一支独有的别家内容(job, 基);
    if(分叉.length){
      出.push({ 中文:job.中文, 支:job.支, 好:false,
        话:'这一支上有 ' + 基 + ' 里不存在的内容（自家那几格之外还动了 ' + 分叉.length + ' 份：' + 分叉.slice(0, 6).join('、') + '）—— 真分叉，停下来人工处理，这一趟不碰它' });
      continue;
    }
    if(是祖先(支头, 头)){ 出.push({ 中文:job.中文, 支:job.支, 好:true, 话:'已经在 ' + 基 + ' 那一笔后面了，指针不挪' }); continue; }
    let 树 = '';
    try{ 树 = git(TREE, ['merge-tree', '--write-tree', 头, 支头]); }
    catch(e){
      出.push({ 中文:job.中文, 支:job.支, 好:false, 话:'与 ' + 基 + ' 撞车（两边动过同一份）：' +
        String((e && e.stderr) || (e && e.message) || e).split(/\r?\n/)[0] + ' —— 不自动解决，停下来报这一家' });
      continue;
    }
    const 笔 = git(TREE, ['commit-tree', 树, '-p', 支头, '-p', 头, '-m',
      '各家快进 ' + job.中文 + '：把 ' + job.支 + ' 接到 ' + 基 + '（' + 头.slice(0, 7) + '）后面 —— 只挪指针，已有的一笔都不改写']);
    git(TREE, ['update-ref', 'refs/heads/' + job.支, 笔, 支头]);   /* 带旧值：被谁挪过就报错，不悄悄盖掉 */
    出.push({ 中文:job.中文, 支:job.支, 好:true, 话:'指针 ' + 支头.slice(0, 7) + ' → ' + 笔.slice(0, 7) });
  }
  return 出;
}

/* 那一支上「除了自家那几份之外」还动了什么 —— 有东西就是真分叉（基里不存在的内容） */
function 那一支独有的别家内容(job, 基){
  let 底 = ''; try{ 底 = git(TREE, ['merge-base', 基, job.支]); }catch(e){ return []; }
  if(!底) return [];
  let 改 = [];
  try{ 改 = git(TREE, ['-c', 'core.quotepath=false', 'diff', '--name-only', 底, job.支]).split(/\r?\n/).filter(Boolean); }
  catch(e){ return []; }
  return 改.filter(f => 归那一家(f) !== job);
}
function 是祖先(甲, 乙){
  try{ git(TREE, ['merge-base', '--is-ancestor', 甲, 乙]); return true; }catch(e){ return false; }
}

/* ---------- 跑 ----------
   只有"直接跑我"才执行下面这一整段；被 src\_build\release.mjs 当零件 import 的时候一个字都不跑 ——
   从前这里没设闸，release.mjs 一 import 就把七家全铺全提交了一遍，本地凭空多出一笔。 */
if(被当命令跑){
/* --收改动：把盘上动了的份按路径分家送回各自那一支（剩下的落到这一轮那条支），然后重拼一棵。
   提交说明从 --msg= 来 —— 这一轮改了什么得由人说，脚本不编。
   落点默认取清单那一行「提交分支 =」；临时换一头加 --落点=支名（不许写 main：main 那一支由 pr.mjs 拿它当支头）。 */
if(has('--收改动')){
  if(!MSG){ console.error('停下来：--收改动 要配 --msg=这一轮改了什么（提交说明不许脚本自己编）'); process.exit(1); }
  let r;
  try{ r = 分家(MSG, val('--落点', '')); }
  catch(e){ console.error('停下来：' + String((e && e.message) || e)); process.exit(1); }
  if(!r.动了){ console.log('盘上没有任何动过的份，这一趟什么都没写。'); process.exit(0); }
  for(const x of r.出) console.log((x.落点 + ' ').padEnd(34) + x.份 + ' 份 · ' + (x.笔 ? '落了一笔 ' + x.笔.slice(0, 7) : '与那一支一模一样，没落笔'));
  const 剩 = git(TREE, ['status', '--porcelain']).split(/\r?\n/).filter(Boolean);
  console.log('重拼后工作树 = ' + git(TREE, ['rev-parse', '--abbrev-ref', 'HEAD']) +
    (剩.length ? ' · 盘上还剩 ' + 剩.length + ' 处没对上（看一眼再发）：\n  ' + 剩.slice(0, 10).join('\n  ') : ' · 盘上干净'));
  process.exit(0);
}
/* --拼装：把 main 与那六支现合成一棵，工作树站上去（要跑程序、要打包的人自己喊这一句） */
if(has('--拼装')){
  const 有笔 = 没回main的改动();
  if(有笔.length){
    console.error('停下来：拼装那一支上有 ' + 有笔.length + ' 笔改的是主程序那一摊（' + 有笔.join(' ') + '），main 还没有它们。\n' +
      '  重新拼装会从 main 起合，这些笔会被抹掉 —— 先把它们带回 main。');
    process.exit(1);
  }
  console.log('拼装好了：' + 拼装('手工') + ' · 工作树现在站在 ' + 拼装支 + ' 那一棵，七家的文件都在盘上');
  process.exit(0);
}
/* 剩下那一整条「铺到隔壁那一棵 + 提交 + 挂远端」的路 2026-10-13 跟着为写那一家一起退了：
   为写不再搞独立仓（他定的），七家全是「各住 plugin/<id> 那一支」，所以这一颗不再有默认动作。 */
console.error('停下来：这一颗不再往隔壁那一棵铺东西了（为写 2026-10-13 回到插件这一格，七家各住自己那一支）。\n' +
  '  要分家送回各自那一支：node src\\_build\\plugin-repos.mjs --收改动 --msg=这一轮改了什么\n' +
  '  要重拼一棵打包：      node src\\_build\\plugin-repos.mjs --拼装\n' +
  '  只看名单与体积：      node src\\_build\\plugin-repos.mjs --dry（现在也只列，不铺）');
process.exit(1);
}
