/* ============================================================
   改文字与改图标那一屏（2026-10-16 收的口径：这一台只管这两样）
   ------------------------------------------------------------
     双击 src\tools\text-icon.bat      起这一台，顺手把浏览器开到 http://127.0.0.1:8792/
     node src/_build/text-icon.mjs     同一件事，从终端起
     环境变量 PORT 换端口（默认 8792；8791 是那台页面服务的，各占一个）
     环境变量 FD_TREE 指到别的一棵（闸在沙盒那一棵里真跑那几颗判断时用）

   两栏，各叫各的零件，这一台自己不长第二套：
     · 界面文字 —— 读 data\ui-text.yaml，改哪一句先写回那一份，再「预览改动」→「写进源码」→
       「重新生成产物」；这四步全叫 src\pack\uitext.cjs 那一份（2026-10-13 定的方案甲：句子落进源码那一份）。
     · 图标素材 —— 读 icons\索引.txt 与那张索引的生成器 src\_build\ico-index.mjs：数图、
       看哪份代码叫它几次、换一张 / 添一张 / 删一张（删之前先看有没有代码在叫它）。
       换与加都落两处：树根 icons\（程序此刻读的那一层）+ 出厂 src\pack\icons\（装到机器上带的那一份）——
       只写前者的话他换的图活在本地，下一趟生成与打包带的还是线稿画出来的那一张（2026-10-17 他点的那条「保存呢」）。
       插件包那一格的封面住在它自己那一家的 data\plugins\<包>\images\ 里（一家一仓之后在隔壁那棵），
       位置问 src\_build\邻居.mjs 那把尺；索引登记了、那一格里还没有的那一张给一枚占位符，点下去当场放进去。

   往远程送东西、起分支与提交、打安装包、记版本号那些，2026-10-16 从这一屏整块撤了 ——
   那些动作还在命令行里（src\_build\pr.mjs 与 src\_build\release.mjs 那两颗），要跑由他在终端里跑。
   顶上那一句"站在哪条支、盘上有没有没提交的、程序开着没"只是这一眼现场：改句子和改图标都不问 git，
   git 叫不动那两样照旧能使；只是这一行不许装成"都提交完了"——问不出就写问不出（2026-10-12 双击起台子被这一行骗过一回）。

   为什么要有那一枚随机码：这一台只认 127.0.0.1，但同一台机器上别的网页也能发请求到 127.0.0.1；
   页面上的码是起台子时现生成的，写请求不带它就拒 —— 挡的是「别的页面顺手改了一句源码或删了一张图」。
   不认令牌、不存东西、不碰任何密钥。
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { TREE } from './plugin-repos.mjs';
/* 一家一仓之后，插件那一张封面住在隔壁那一棵里；"到底在哪一格"只问这一把尺，别处不许再算第二套。 */
import { 找 as 邻找, 出自 as 邻出自, 根列表 as 邻根列表 } from './邻居.mjs';
/* 往远程送东西、记版本号、打安装包那些都不在这一屏上了（2026-10-16 他点的：这一台只留改文字与改图标），
   所以 pr.mjs / push-list.mjs / version.mjs / forward-features.mjs 那四本这一份一概不再 import —— 那些动作还在命令行里。 */

const PORT = +(process.env.PORT || 8792);
/* 被当命令跑才听端口：闸（src\tools\probes\gate-texticon46.mjs）要把这一份当零件借进去真跑那几颗判断，
   一 import 就占 8792 的话，跑闸会把你正开着的那一屏顶掉。与 plugin-repos.mjs 同一道闸。 */
const 被当命令跑 = !!(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url);
const 码 = crypto.randomBytes(12).toString('hex');
const 页面路 = path.join(import.meta.dirname, 'text-icon.html');
const 发 = (res, 码数, 文, 类) => {
  res.writeHead(码数, { 'content-type': (类 || 'text/plain; charset=utf-8'), 'cache-control': 'no-store' });
  res.end(文);
};
const JSON发 = (res, 对) => 发(res, 200, JSON.stringify(对), 'application/json; charset=utf-8');
const 读体 =  req => new Promise(收 => {
  let 文 = '';
  req.on('data', d => { 文 += d; if(文.length > 4e6) req.destroy(); });
  req.on('end', () => { try{ 收(JSON.parse(文 || '{}')); }catch(e){ 收(null); } });
});

/* ---------- 现场那几眼：站在哪一支、盘上脏不脏、程序开着没 ---------- */
/* 叫 git 必须分得清「问出来了」与「问不出」：从前问不出就回一个空串，盘上压着 49 处没提交也被报成「盘上干净」，
   量那一趟也因同一个原因退出码 1 —— 一屏假象摆在他面前，比不量还坏。问不出就是问不出，不许当干净。 */
function 跑git(args){
  try{ return { 好: true, 文: execFileSync('git', ['-C', TREE, ...args], { encoding:'utf8' }).trim() }; }
  catch(e){ return { 好: false, 文: '', 话: e && e.code === 'ENOENT'
    ? '这台电脑上叫不到 git（开小助手的那个窗口的 PATH 里没有 git）—— 换用带 git 的那个终端开小助手，或把 git 装进系统路径'
    : String((e && (e.message || e)) || e).split(/\r?\n/)[0] }; }
}
const 叫得动git = () => { const 探 = 跑git(['--version']); return 探.好 ? '' : 探.话; };
/* ---------- 现场那几眼（2026-10-16 只剩三眼）----------
   从前这一颗还要摊版本号、那张推送清单、那八项功能、那一摞安装包在哪、分支合没合进 main ——
   那些都住在「版本与推送」那一页上。那一页整块撤了，这里就只留这一台自己用得着的：
   站在哪一条支、盘上有没有没提交的、程序开着没、git 叫不叫得动、这一台自己跑着没。 */
function 现场(){
  const 问脏 = 跑git(['status', '--porcelain']);
  const 问站 = 跑git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const 脏单 = 问脏.好 ? 问脏.文.split(/\r?\n/).filter(Boolean) : null;
  let 开着 = false;
  try{ 开着 = /Flow-Desk\.exe/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq Flow-Desk.exe', '/FO', 'CSV', '/NH'], { encoding:'utf8' })); }catch(e){}
  return {
    git好: 问脏.好 && 问站.好, git话: 叫得动git() || (问脏.好 ? 问站.话 : 问脏.话),
    站: 问站.好 ? (问站.文 || '（问不出）') : '（问不出）',
    树: TREE,
    脏: 脏单 ? 脏单.length : -1, 脏单: 脏单 ? 脏单.slice(0, 12) : [],
    开着, 在跑: !!当值.名,
  };
}

/* ---------- 图标素材那一摊（他 2026-10-12 点名要并进来的两半之一）----------
   图标住在仓根 icons\ 那一格（子文件夹只认一层）。**每一张是什么、哪份代码在叫它、叫几次，
   已经有一份对齐好的答案：icons\索引.txt**，由 src\_build\ico-index.mjs（#245）生成 ——
   这一台只读它、并给一颗「重新对齐一遍」去跑那颗脚本，绝不自己再搜第二套（搜出来的口径与那份索引对不上就是两头漂移）。
   六个后缀与那颗脚本里那一份同字，闸 gate-texticon46 盯着。 */
const 图标后缀 = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
/* 那一层住哪：默认仓根 icons\；环境变量 FD_ICONS 指到别处（与页面服务那台同一个名字，见 src\_fd\fd-serve.mjs 顶上）——
   闸要真跑"加一张、换一张、删一张"，拿沙盒当那一层，不往你的 icons\ 里落一个字。 */
const 图标层 = process.env.FD_ICONS ? path.resolve(process.env.FD_ICONS) : path.join(TREE, 'icons');
/* 出厂那一格 src\pack\icons\：装到机器上带的就是这一格（见 src\_build\ico-dump.mjs 顶上那段），
   所以屏上换一张图必须同时落进这里，只写树根 icons\ 的话他换的图活在本地、打包带的还是线稿。
   跟着 图标层 的那一棵走：闸把图标那一层指到沙盒，出厂这一格就在沙盒里，不往他仓落一个字。 */
const 厂层 = path.join(path.dirname(图标层), 'src', 'pack', 'icons');
/* 插件包那一格同一个口子（FD_PLUGINS）：闸要真跑「往包里盖一张封面」，得能指到沙盒那一棵，
   不往你的 data\plugins\ 里落一个字。没指的时候不问这一格 —— 见下面 插件找()。 */
const 插件层 = process.env.FD_PLUGINS ? path.resolve(process.env.FD_PLUGINS) : path.join(TREE, 'data', 'plugins');
const 索引路 = path.join(图标层, '索引.txt');
/* 索引一行一条：`名字 = 这是干什么的 —— 引用：某文件×3、某文件×1`；段首那几行以 # 起头。
   认不动的行整行留着当"说不清的"，不猜。 */
/* 插件那一张封面到底在哪一格（2026-10-16 一家一仓之后）：主程序仓 data\plugins\ 那一格搬空了，
   封面住在 <开发那一摊>\plugins\<仓名>\data\plugins\<包>\images\ 里。从前这一台只认仓里那一格，
   于是七张封面全报「取不到这个文件」。现在问 邻居.mjs 那把尺：本仓先问、再按 仓名 那张表问那七棵，
   谁那儿有就是谁的；哪一棵都没有就回本仓那一条（占位符点下去就新建在那儿）。
   FD_PLUGINS 指到别处时一律不问邻居 —— 闸在沙盒里真跑，不许往他家插件仓落一个字。 */
const 插件相 = (包, 档) => 'data/plugins/' + 包 + '/images/' + 档;
function 插件找(包, 档){
  return process.env.FD_PLUGINS ? path.resolve(插件层, 包, 'images', 档) : 邻找(插件相(包, 档));
}
function 插件出自(包, 档){
  return process.env.FD_PLUGINS ? '沙盒里的那个文件夹' : 邻出自(插件相(包, 档));
}
function 读索引(){
  let 文 = '';
  try{ 文 = fs.readFileSync(索引路, 'utf8'); }catch(e){ return { 错: '读不到 icons\\索引.txt：' + ((e && e.code) || (e && e.message) || e), 条: [], 段: [] }; }
  const 条 = [], 段 = [];
  let 当段 = '';
  for(const 行 of 文.split(/\r?\n/)){
    const s = 行.trim();
    if(!s) continue;
    if(s.startsWith('#')){ const 名 = /^#\s*——\s*(.+?)\s*——$/.exec(s); if(名){ 当段 = 名[1]; 段.push(当段); } continue; }
    const 分 = s.indexOf(' = ');
    if(分 <= 0){ continue; }
    if(!当段){ continue; }        /* 头几行是这份索引自己的说明（标题那行中间也带 " = "），段首之前的一律不算数据 */
    const 名 = s.slice(0, 分).trim(), 余 = s.slice(分 + 3).trim();
    const 刀 = 余.indexOf('—— 引用：');
    条.push({ 名, 段: 当段, 说: (刀 < 0 ? 余 : 余.slice(0, 刀)).trim(), 引用: 刀 < 0 ? '' : 余.slice(刀 + 6).trim() });
  }
  return { 错: '', 条, 段 };
}
function 图标单(){
  const 索 = 读索引();
  const 按名 = new Map(索.条.map(x => [x.名, x]));
  const 单 = [];
  let 项 = [];
  try{ 项 = fs.readdirSync(图标层, { withFileTypes: true }); }
  catch(e){ return { 错: '读不到 icons 这个文件夹：' + ((e && e.code) || (e && e.message) || e), 单: [], 张: 0 }; }
  const 收 = (名, 层, 全) => {
    const 后 = path.extname(名).toLowerCase();
    if(!图标后缀.includes(后)) return;
    const 键 = 层 === '' ? 名.replace(/\.[a-z0-9]+$/i, '') : 层 + '-' + 名.replace(/\.[a-z0-9]+$/i, '');
    const 条 = 按名.get(键);
    const 相 = 层 ? 层 + '/' + 名 : 名;
    单.push({ 名: 相, 键, 层: 层 === '' ? '（icons 根下）' : 层,
      大: fs.statSync(全).size, 说: 条 ? 条.说 : '', 引用: 条 ? 条.引用 : '', 段: 条 ? 条.段 : '', 登记: !!条,
      出厂: 出厂看(相) });
  };
  for(const it of 项){
    if(it.isFile()) 收(it.name, '', path.join(图标层, it.name));
    else if(it.isDirectory()){
      let 里 = [];
      try{ 里 = fs.readdirSync(path.join(图标层, it.name), { withFileTypes: true }); }catch(e){}
      for(const s of 里) if(s.isFile()) 收(s.name, it.name, path.join(图标层, it.name, s.name));
    }
  }
  单.sort((a, b) => a.键 < b.键 ? -1 : 1);
  /* 索引最后一节是插件包的图标 —— 它们不住 icons\，住在各包自己的 images\icon.svg（索引那几行末尾写着文件名）。
     按索引说的位置去取，取不到才算真丢；不把它们混进 icons\ 那一格里比，比出来的"丢图"是假的。 */
  const 插件 = 索.条.filter(x => /^pack-/.test(x.名)).map(x => {
    const 尾 = /·\s*([A-Za-z0-9._-]+)\s*$/.exec(x.说);
    const 档 = 尾 ? 尾[1] : 'icon.svg';
    const 包 = x.名.slice(5);
    const 全 = 插件找(包, 档);
    let 大 = -1;
    try{ 大 = fs.statSync(全).size; }catch(e){}
    return { 名: 'data/plugins/' + 包 + '/images/' + 档, 键: x.名, 包, 档, 全, 出自: 插件出自(包, 档),
      层: '插件包 ' + 包, 大, 说: x.说.replace(/\s*·\s*[a-z0-9.]+$/i, '').trim(),
      引用: x.引用, 段: x.段, 登记: true, 在不在: 大 >= 0 };
  }).sort((a, b) => a.键 < b.键 ? -1 : 1);
  /* 索引登记了、icons 里却没那张图：给一张占位卡，让他当场放一张进去。
     该放在哪儿照 收() 那个键的写法算回来（键里带 "-" 且那一段确实是个子文件夹，就是 <子文件夹>\<名>.svg），
     后缀一律 .svg —— 出厂那一格就是按名字画线稿的，装到机器上带的也是这个名字。 */
  const 通用没图 = 索.条.filter(x => !/^pack-/.test(x.名) && !单.some(y => y.键 === x.名)).map(x => {
    const 刀 = x.名.indexOf('-');
    let 补 = x.名 + '.svg';
    if(刀 > 0){
      try{ if(fs.statSync(path.join(图标层, x.名.slice(0, 刀))).isDirectory()) 补 = x.名.slice(0, 刀) + '/' + x.名.slice(刀 + 1) + '.svg'; }catch(e){}
    }
    return { 名: x.名, 键: x.名, 段: x.段, 说: x.说, 引用: x.引用, 补 };
  });
  return { 错: 索.错, 单, 插件, 张: 单.length, 插件张: 插件.length,
    没登记: 单.filter(x => !x.登记).map(x => x.键), 没图: 通用没图.map(x => x.名), 没图条目: 通用没图,
    插件丢图: 插件.filter(x => !x.在不在).map(x => x.键),
    没进厂: 单.filter(x => x.出厂 !== '同').map(x => x.名) };
}

/* ---------- 界面文字那一摊（他 2026-10-12 点的另一半天）----------
   清单住在 data\ui-text.yaml（77 组、4418 条：一行一个地方，段首写"哪个程序的哪一页"，缩进行写「原句: 改成那句」）。
   扫描、排版、预览改动、写进源码这几颗手全在 src\pack\uitext.cjs 那一份里（它底下有 require.main 那道闸，
   当零件借不会自己跑起来），这一台只叫它，不另写一套：
     刷新清单 → 起子进程跑 node src\pack\uitext.cjs（它自己会把他改过的句子原样保住）
     存他改的句子 → 只动清单里对得上的那几行的冒号右边，其余各行一个字节不碰；引号写法用的是它那一份 yq()
     预览改动 / 写进源码 → 直接叫 plan() / apply()（方案甲，2026-10-13 定的：写回扫描量到的那一份源码）
     重新生成产物 → 跑 uitext 那份里 artifactBuilds() 那几趟（是哪几趟、什么次序都不在这里抄第二份）
   划掉一句（del）在清单里是这一行唯一的记号：冒号右边一对空引号，不能和"没改"混成同一个样子。 */
const 要件 = createRequire(import.meta.url);
const 字 = 要件('../pack/uitext.cjs');
const 界面文字那颗 = 字;
/* 界面文字那一摊落在哪一棵树上：和图标那一格同一个口子（FD_TREE，探针的测试树就用它，口径同 src\_build\tree.cjs）。
   闸要在沙盒里真写真改这一摊，不能往他仓里落一个字 —— 没这个口子就只能「假设它写得对」。 */
const 字树 = process.env.FD_TREE ? path.resolve(process.env.FD_TREE) : TREE;
const 清单文件 = 字.uiTextPath(字树);
/* 插件那几家的句子也在这本清单里 —— 一家一仓之后它们的源码住在隔壁那几棵，认句子与写回去都得拿到同一把尺。
   从前这一台没把名单递过去，屏上列得出的 2,924 行插件句子（清单里那些段：声笔输入法练习 / 推演组件定制 / 为写，
   还有便签、日程、你的句子、音乐遥控器那几段底下的）点「把改动写进程序」全落进「对不上」，一个字都写不回去
   —— 他 2026-10-18 那一句「我要插件文字可以一起改」量的就是这一处。
   名单与生成页面那一趟是同一份（src\_fd\build.mjs 递的也是 邻居.mjs 的 根列表，去掉本仓那一格），这一头不抄第二本。
   沙盒那一趟默认不递：FD_TREE / FD_PLUGINS 指着别处时是闸在临时那一棵里真跑，不许往他家插件仓落一个字；
   闸要验这一手就自己指一份 FD_TEXT_NEIGHBORS（JSON 一串仓根）。 */
const 界面邻居 = (() => {
  try{ if(process.env.FD_TEXT_NEIGHBORS) return JSON.parse(process.env.FD_TEXT_NEIGHBORS); }catch(e){ return []; }
  if(process.env.FD_TREE || process.env.FD_PLUGINS) return [];
  return 邻根列表().slice(1);
})();
字.设邻居(界面邻居);
/* 回执上那一名要说清写进了哪一棵：本仓报相对路径，隔壁那几棵报「仓名/相对路径」
   （一家一仓之后插件那一句落回它自己那一棵，看不见落在哪儿就等于不放心） */
function 那份在哪(全){
  const 定 = path.resolve(String(全));
  for(const 根 of [字树, ...界面邻居]){
    const 绝 = path.resolve(根);
    if(定 === 绝 || 定.startsWith(绝 + path.sep))
      return 根 === 字树 ? path.relative(绝, 定).split(path.sep).join('/')
        : path.basename(绝) + '/' + path.relative(绝, 定).split(path.sep).join('/');
  }
  return 定;
}
function 文字读(){
  let 文 = '';
  try{ 文 = fs.readFileSync(清单文件, 'utf8'); }catch(e){ return { 错:'读不到 ' + 清单文件 + '：' + ((e && e.code) || (e && e.message) || e), 段:[], 条:[] }; }
  const 条 = 字.parse(文);
  const 段 = [];
  for(const r of 条){ const k = r.src; if(!段.includes(k)) 段.push(k); }
  return { 错:'', 段, 条:条.map(r => ({ 段:r.src, prog:r.prog, page:r.page, from:r.from, to:r.to, del:!!r.del })),
    重跑: 字.artifactBuilds(), 字条: 条.length, 邻居: 界面邻居.map(根 => path.basename(根)) };
}
/* 只改对得上的那几行的冒号右边：段首行、注释行、没动过的行原样留着。
   一行怎么切成"名字 + 值"用的是 uitext 那一份 kvOf —— 与 parse() 同一个读法：带引号的句子（"对齐: 居中" 那种）
   自己切冒号会切错一位，一句都对不上；引号写法也用它那一份 yq，两边不会各排各的。 */
function 文字写(文, 改){
  const 键 = new Map();
  for(const e of (改 || [])){
    if(!e || typeof e.from !== 'string') continue;
    键.set(String(e.prog) + '\u0000' + String(e.page) + '\u0000' + e.from, { to:String(e.to == null ? '' : e.to), del:!!e.del });
  }
  const 行 = String(文 || '').split(/\r?\n/);
  let 当 = null, 动 = 0;
  const 出 = 行.map(line => {
    const s = line.trimEnd();
    if(!s.trim() || s.trimStart().startsWith('#')) return line;
    const 缩 = /^\s*/.exec(s)[0].replace(/\t/g, '  ').length;
    const kv = 字.kvOf(s.trim());
    if(!kv){ if(缩 === 0) 当 = null; return line; }
    if(缩 === 0){ 当 = kv.key; return line; }
    if(!当) return line;
    const 分 = 当.indexOf(' · ');
    const prog = 分 < 0 ? 当 : 当.slice(0, 分).trim(), page = 分 < 0 ? '' : 当.slice(分 + 3).trim();
    const 找 = 键.get(prog + '\u0000' + page + '\u0000' + kv.key);
    if(!找) return line;
    const to = String(找.to).replace(/[\r\n]+/g, ' ').trim();
    动++;
    return '  ' + 字.yq(kv.key) + ':' + (找.del ? ' ""' : (to && to !== kv.key ? ' ' + 字.yq(to) : ''));
  });
  return { 文: 出.join('\n'), 动 };
}

/* ---------- 图标柜（他 2026-10-17 提的第 2、3 条）----------
   系统那个选文件框记不住上一次那格；更麻烦的是 .svg 在他机器上关联到浏览器，一整柜两千多张
   在资源管理器里全是同一个浏览器图标，根本看不出哪张是哪张。所以这一格由这一台自己扫、自己画：
   他写一次路径，这里出一窗真预览，点中哪张就拿哪张去换 / 去加。上一次那一格由页面存在浏览器自己的
   本地存储里（这一台不落任何文件）。 */
const 柜MIME = { '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif' };
const 柜上限 = 30000;
function 柜那格(路){
  const 串 = String(路 == null ? '' : 路).trim();
  if(!串) return { 错:'先写一个文件夹（这台电脑上的任意一个，如 ' + path.join(TREE, 'icons') + '）' };
  let 统 = null;
  try{ 统 = fs.statSync(串); }catch(e){ return { 错:'读不到这个文件夹：' + ((e && e.code) || (e && e.message) || e) }; }
  if(!统.isDirectory()) return { 错:'这不是一个文件夹：' + 串 };
  return { 根: path.resolve(串) };
}
/* 只往下走一层（icons 那一格就是 根 + 子文件夹 两层，跟取图那两道路径闸一个口径）。
   上限给到 3 万张：他那一整柜（src\icons by lucide 那种 2169 张）要一次全摆出来 —— 从前卡在一处就画不全，
   「不知道这张叫什么」正是要看图的时候，截断等于把这一格的功能砍掉。页面上的图是懒取的，滚到哪儿读到哪儿。 */
function 柜列(路){
  const 判 = 柜那格(路); if(判.错) return 判;
  const 单 = [];
  const 走 = (格, 层) => {
    let 项 = [];
    try{ 项 = fs.readdirSync(格, { withFileTypes: true }); }catch(e){ return; }
    for(const it of 项){
      if(单.length >= 柜上限) return;
      const 全 = path.join(格, it.name);
      if(it.isDirectory()){ if(层 < 1) 走(全, 层 + 1); continue; }
      const 后 = path.extname(it.name).toLowerCase();
      if(!图标后缀.includes(后)) continue;
      let 大 = -1; try{ 大 = fs.statSync(全).size; }catch(e){}
      单.push({ 相: path.relative(判.根, 全).split(path.sep).join('/'), 大, 后 });
    }
  };
  走(判.根, 0);
  单.sort((a, b) => a.相 < b.相 ? -1 : 1);
  return { 错:'', 根: 判.根, 张: 单.length, 全: 单.length < 柜上限, 单 };
}
function 柜一张(路, 相){
  const 判 = 柜那格(路); if(判.错) return 判;
  const 全 = path.resolve(判.根, String(相 == null ? '' : 相));
  if(!全.startsWith(判.根 + path.sep)) return { 错:'只许看这个文件夹里面的图（不许往外钻）' };
  const 后 = path.extname(全).toLowerCase();
  if(!图标后缀.includes(后)) return { 错:'只列这六种后缀：' + 图标后缀.join(' ') };
  let 字 = null;
  try{ 字 = fs.readFileSync(全); }catch(e){ return { 错:'读不到这一张：' + ((e && e.code) || (e && e.message) || e) }; }
  if(!字.length) return { 错:'这一张是空的' };
  if(字.length > 图标上限) return { 错:'这一张 ' + 字.length.toLocaleString() + ' 字节，超过 ' + 图标上限.toLocaleString() + ' 字节上限' };
  return { 字, 后, 名: path.basename(全) };
}

/* 图标那一格的增删改（他 2026-10-12 点的）：只动 icons\ 那一格里的一层文件，
   名字与后缀先过一遍（六后缀之外不收、带路径分隔符与怪字符的不收、索引.txt 那一本说明书不许当图标删），
   单张上限 512 KB（图标本来就该是几 KB 的线稿，超了多半是传错文件）。
   删之前先看索引说没说"有代码在叫它"：说了就拒删，把是哪几处报出来 —— 换图可以，删掉正在用的图不行。 */
const 图标上限 = 512 * 1024;
function 图标落点(名, 根){
  const 串 = String(名 == null ? '' : 名).trim();
  if(!串 || 串.length > 80 || /[\\:*?"<>|\u0000-\u001f]/.test(串)) return { 错:'这个名字不成样子（不许带反斜杠、冒号、星号、问号、尖括号）' };
  if(/^索引\.txt$/i.test(串.replace(/^.*[\\/]/, ''))) return { 错:'icons\\索引.txt 是那份说明书，不是图标，不许动它' };
  const 根全 = path.resolve(根 || 图标层);
  const 全 = path.resolve(根全, 串);
  if(!(全 === 根全 || 全.startsWith(根全 + path.sep))) return { 错:'只许在 icons 这个文件夹里改（不许往外钻）' };
  const 父 = path.resolve(path.dirname(全));
  if(父 !== 根全 && path.resolve(path.dirname(父)) !== 根全) return { 错:'子文件夹只认一层（icons\\<那一层>\\<图>），再往里钻不算图标' };
  if(!图标后缀.includes(path.extname(全).toLowerCase())) return { 错:'只收这六种后缀：' + 图标后缀.join(' ') };
  const 基 = path.basename(全);
  if(基.length > 60 || !/^[\w.\-]+$/.test(基)) return { 错:'文件名只许字母数字点横杠，60 字以内' };
  return { 全, 根: 根全, 父 };
}
/* 这一张在出厂那一格里同不同：一样 / 不一样 / 没有。
   「不一样」与「没有」都是同一件事 —— 装到机器上带的还不是屏上这一张（出厂那一格才是随包件）。 */
function 出厂看(相){
  try{
    const 从 = fs.statSync(path.join(图标层, 相));
    const 到 = fs.statSync(path.join(厂层, 相));
    if(!到.isFile()) return '没有';
    if(从.size !== 到.size) return '不一样';
    return fs.readFileSync(path.join(图标层, 相)).equals(fs.readFileSync(path.join(厂层, 相))) ? '同' : '不一样';
  }catch(e){ return '没有'; }
}
/* 把图标文件夹里这一张原样复制到打包用的那一份（同名同后缀同子文件夹）。换 / 加 写完紧跟着叫它，
   所以屏上点「换这张」之后落的是两处：icons\（程序此刻读的）与 src\pack\icons\（打安装包带的）。 */
function 进出厂(相){
  const 从 = 图标落点(相), 到 = 图标落点(相, 厂层);
  if(从.错) return { 错:从.错 };
  if(到.错) return { 错:到.错 };
  if(!fs.existsSync(从.全)) return { 错:'图标文件夹里没有 ' + 相 + ' 这一张，没什么可复制过去的' };
  const 字 = fs.readFileSync(从.全);
  fs.mkdirSync(到.父, { recursive: true });
  fs.writeFileSync(到.全, 字);
  return { 好:true, 相, 大:字.length, 路径:'src/pack/icons/' + 相 };
}
function 图标写(名, 基64, 模式){
  const 落 = 图标落点(名);
  if(落.错) return 落;
  const 在 = fs.existsSync(落.全);
  if(模式 === '换' && !在) return { 错:'icons\\' + 名 + ' 本来没有这一张：要往里面添新图，点「加一张图」' };
  if(模式 === '加' && 在) return { 错:'icons\\' + 名 + ' 已经有这一张了：同名盖一张上去请点「换这张」' };
  let 字;
  try{ 字 = Buffer.from(String(基64 || ''), 'base64'); }catch(e){ return { 错:'传上来的图读不懂（不是 base64）' }; }
  if(!字.length) return { 错:'传上来的图是空的' };
  if(字.length > 图标上限) return { 错:'这一张 ' + 字.length.toLocaleString() + ' 字节，超过 ' + 图标上限.toLocaleString() + ' 字节上限（图标该是几 KB 的线稿，多半是传错文件了）' };
  fs.mkdirSync(落.父, { recursive: true });
  fs.writeFileSync(落.全, 字);
  /* 同一份字节跟着复制到打包用的那一份 —— 不复制的话他换的图只活在本地这一层，下一趟生成与打包带的还是线稿 */
  const 厂 = 进出厂(path.relative(落.根, 落.全).split(path.sep).join('/'));
  return { 好:true, 新建:!在, 名, 大:字.length, 出厂:厂 };
}
/* 插件包那一张封面：不住 icons\，住在它自己那一家的 data\plugins\<包>\images\ 里
   （一家一仓之后那一格在隔壁那棵，位置问 插件找()），那一个文件名写在它的插件清单与那份索引上。
   所以这里只许「同名盖一张」：换了文件名等于壳里叫不到那张图，要换格式得他自己在清单与索引里改。
   索引登记了、那一格里确实还没有那一张的（占位符那一手）：就在同一格新建出来，落在哪一棵原样报回屏上。 */
function 插件封面(包, 档){
  if(!/^[a-z0-9][a-z0-9-]*$/.test(String(包 || ''))) return { 错:'包名只许小写字母、数字、连字符：「' + 包 + '」' };
  if(!/^icon\.(svg|png|jpe?g|webp|gif)$/i.test(String(档 || ''))) return { 错:'插件封面只认 icon.<六种后缀>：「' + 档 + '」' };
  const 全 = 插件找(包, 档);
  const 格 = path.dirname(全);
  if(path.basename(格) !== 'images' || path.basename(path.dirname(格)) !== String(包)) return { 错:'只许写在 data\\plugins\\<包>\\images\\ 那一格里' };
  return { 全, 格, 出自: 插件出自(包, 档), 新建: !fs.existsSync(全) };
}
function 图标写插件(包, 档, 基64){
  const 落 = 插件封面(包, 档);
  if(落.错) return 落;
  let 字;
  try{ 字 = Buffer.from(String(基64 || ''), 'base64'); }catch(e){ return { 错:'传上来的图读不懂（不是 base64）' }; }
  if(!字.length) return { 错:'传上来的图是空的' };
  if(字.length > 图标上限) return { 错:'这一张 ' + 字.length.toLocaleString() + ' 字节，超过 ' + 图标上限.toLocaleString() + ' 字节上限（图标该是几 KB 的线稿，多半是传错文件了）' };
  fs.mkdirSync(落.格, { recursive: true });
  fs.writeFileSync(落.全, 字);
  return { 好:true, 名:'pack-' + 包, 大:字.length, 路径:'data/plugins/' + 包 + '/images/' + 档, 新建:落.新建, 出自:落.出自 };
}
function 图标删(名){
  const 落 = 图标落点(名);
  if(落.错) return 落;
  if(!fs.existsSync(落.全)) return { 错:'这一张本来就不在：' + 名 };
  const 索 = 读索引();
  const 键 = (path.basename(path.dirname(落.全)) === path.basename(图标层) ? '' : path.basename(path.dirname(落.全)) + '-')
    + 名.replace(/\.[a-z0-9]+$/i, '');
  const 条 = 索.条.find(x => x.名 === 键);
  const 有代码 = 条 && 条.引用 && !/^没有代码直接叫它/.test(条.引用);
  if(有代码) return { 拒:'索引上说有代码在叫这一张，删了界面上就空一块：' + 键 + '\n  ' + 条.引用 + '\n  要换图就点「换这张」，同名盖一张上去就行；确实要删，先在代码里把它撤下来再跑一遍「重新对齐一遍」。' };
  fs.unlinkSync(落.全);
  return { 好:true, 名, 说: 条 ? 条.说 : '' };
}

/* ---------- 只有一个子进程：量和发不能同时跑，发跑到一半更不能再来一次 ---------- */
/* 一次只跑一趟：重新生成产物那几趟、图标对齐那一趟，跑着的时候别的会动手的钮全按住（这一台没有并发的活）。
   往远程送东西那三道（提交 PR、推勾中的那几项、打包发版）连同「敲那一个字才算确认」那一套 2026-10-16 从这一屏撤了 ——
   那些动作回到命令行里（src\_build\pr.mjs 与 src\_build\release.mjs），这一台不再往子进程的键盘输入里写任何一个字节。 */
const 当值 = { 名:'', 手:null };
function 起(参数, 标题, res, 在){ return 起连([参数], 标题, res, 在); }
/* 连着跑好几趟（重新生成产物那几趟）：同一把「上一趟还没跑完」的闸、同一条日志；
   中间任何一趟退出码不是 0，后面那几趟不接上跑 —— 内核没出来就别去拼那张页。
   在 那一格是「从哪一棵树上跑这几趟」：默认他这一棵；界面文字那一摊认的是 FD_TREE 指到的那一棵（闸在沙盒里真跑），
   不跟着走就会拿沙盒的清单去跑他仓里的生成脚本 —— 那是往他仓里落笔。 */
function 起连(列表, 标题, res, 在){
  const 树 = 在 || TREE;
  if(当值.手){ 发(res, 409, '上一趟还没跑完：' + 当值.名 + '（要停它就把那个终端窗口关掉，或者等它自己跑完）'); return; }
  当值.名 = 标题;
  res.writeHead(200, { 'content-type':'text/plain; charset=utf-8', 'cache-control':'no-store' });
  const 递 = 段 => { try{ res.write(段); }catch(e){} };
  const 完 = 码数 => {
    递('\n〔' + 标题 + ' 跑完，退出码 ' + 码数 + '〕\n');
    try{ res.end(); }catch(e){}
    当值.手 = null; 当值.名 = '';
  };
  let 第 = 0;
  const 跑 = () => {
    if(列表.length > 1) 递('\n━━ 第 ' + (第 + 1) + ' / ' + 列表.length + ' 趟：node ' + 列表[第].join(' ') + '\n');
    const 子 = spawn(process.execPath, 列表[第], { cwd: 树, stdio:['pipe', 'pipe', 'pipe'] });
    /* 键盘输入那一头一开头就关掉：这一台起的那几趟（刷新清单、重新生成产物、重新对齐索引）都不问人要字。
       往远程送东西那三道连同「敲那一个字才算确认」那一套 2026-10-16 整块撤出这一屏，命令还在 pr.mjs 那头 ——
       这一台一个字节都不往子进程里写，那一头读不到输入就一个字节都不推，失败的方向是关着的。 */
    子.stdin.end();
    当值.手 = 子;
    子.stdout.on('data', d => 递(d.toString('utf8')));
    子.stderr.on('data', d => 递(d.toString('utf8')));
    /* 浏览器那一头关了：不动子进程 —— 它正往仓里落笔，半路掐了才是真麻烦，日志断了回终端窗口接着看。 */
    子.on('close', 码数 => {
      if(码数 !== 0){
        递('\n〔第 ' + (第 + 1) + ' 趟退出码 ' + 码数 + ' —— 剩下 ' + (列表.length - 第 - 1) + ' 趟不接上跑〕\n');
        完(码数); return;
      }
      第++;
      if(第 >= 列表.length){ 完(0); return; }
      跑();
    });
  };
  跑();
}

/* 中文格子名到了这一头是百分号编码过的，不还原就比不中；还原砸了（送来的不是合法编码）就用原样比，
   绝不能让一颗 URL 把这一台砸掉 —— 它要是正跑到一趟中间，砸掉的是那一趟和他刚写的字。 */
const 拆路 = u => { try{ return decodeURIComponent(u); }catch(e){ return u; } };

const 服务器 = http.createServer(async (req, res) => {
  const 路 = 拆路((req.url || '/').split('?')[0]);
  if(req.method === 'POST' && req.headers['x-push-code'] !== 码){ 发(res, 403, '这一页是在这台服务器上打开的那一张（地址栏得是 http://127.0.0.1:' + PORT + '/）；换过一张页就重新打开一次。'); return; }

  if(路 === '/'){
    try{ 发(res, 200, fs.readFileSync(页面路, 'utf8').replace(/__码__/g, 码).replace(/__端口__/g, String(PORT)), 'text/html; charset=utf-8'); }
    catch(e){ 发(res, 500, '读不到 ' + 页面路 + '：' + e.message); }
    return;
  }
  if(路 === '/api/现场'){ JSON发(res, 现场()); return; }
  if(路 === '/api/图标'){ JSON发(res, 图标单()); return; }
  /* ---------- 界面文字那五道 ---------- */
  if(路 === '/api/文字'){ JSON发(res, 文字读()); return; }
  if(路 === '/api/文字/存'){
    const 身 = await 读体(req);
    if(!身 || !Array.isArray(身.改) || !身.改.length){ 发(res, 400, '没说要改哪几句'); return; }
    let 文 = '';
    try{ 文 = fs.readFileSync(清单文件, 'utf8'); }
    catch(e){ 发(res, 409, '读不到 ' + 清单文件 + '：' + ((e && e.code) || (e && e.message) || e) + ' —— 先点「刷新清单」生成它'); return; }
    const r = 文字写(文, 身.改);
    if(!r.动){ 发(res, 409, '清单里一句都对不上（大概刚刷新过），一个字节没改：先点「刷新清单」再看那一屏'); return; }
    fs.writeFileSync(清单文件, r.文, 'utf8');
    JSON发(res, { 好:true, 动了:r.动, 文件:清单文件 });
    return;
  }
  if(路 === '/api/文字/扫'){
    起(['src/pack/uitext.cjs'], '刷新界面文字清单（跑 src\\pack\\uitext.cjs：源码一个字不碰，你改过的句子原样保住）', res);
    return;
  }
  if(路 === '/api/文字/预览' || 路 === '/api/文字/落'){
    /* 要写哪些句子以清单那一格为准（整份清单里填了的那几行，与刷新清单那一步同一个读法）。
       所以这一道不吃屏上现填的框 —— 先「保存这些句子」，再预览、再写进源码，屏上和文件不会各说一套。 */
    let 文 = '';
    try{ 文 = fs.readFileSync(清单文件, 'utf8'); }
    catch(e){ 发(res, 409, '读不到 ' + 清单文件 + '：先点「刷新清单」'); return; }
    const 用 = 字.parse(文).filter(r => String(r.to || '').trim() || r.del)
      .map(r => ({ prog:r.prog, page:r.page, from:r.from, to:r.to, del:!!r.del }));
    if(!用.length){ 发(res, 409, '清单里一句都没填：先在格子里写下要换的句子，点「保存这些句子」'); return; }
    let 果;
    try{ 果 = (路 === '/api/文字/预览' ? 字.plan : 字.apply)(字树, 用); }
    catch(e){ 发(res, 500, '停下来：' + String((e && e.message) || e)); return; }
    JSON发(res, { 好:true, 落:路 === '/api/文字/落', 递:用.length, 成:果.list || [], 对不上:果.miss || [],
      写了:(果.files || []).map(那份在哪), 重跑:果.builds || [] });
    return;
  }
  /* 源码里的句子换完了，界面上还看不见 —— 得把产物重新生成一遍。跑的就是 uitext 那一份里
     artifactBuilds() 那几趟（现在是哪几趟、什么次序，都由那一颗说了算，这里不抄第二份）；
     中间任何一趟退出码不是 0，后面那几趟不接上跑。 */
  if(路 === '/api/文字/重生成'){
    起连(字.artifactBuilds().map(相 => [相]), '重新生成页面（跑 src\\pack\\uitext.cjs 那份里 artifactBuilds() 那几趟：写的都是生成好的页面，源码一个字不碰）', res, 字树);
    return;
  }
  /* 某一张图标的样子：这一台自己把那一层里的一张图递出去（页面服务那台才有 /icons/，这台不占它的地盘）。
     只认 icons 那一格以内的路径 —— 拿 .. 或绝对路径往外钻的一律拒。 */
  if(路 === '/api/图标/一张'){
    const 参 = new URLSearchParams(String((req.url || '').split('?')[1] || ''));
    const 类 = { '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif' };
    let 全 = '', 后 = '';
    if(参.get('包')){
      /* 插件包的图标：只认 data\plugins\<包>\images\icon.<六种后缀>，包名只许小写字母数字连字符 */
      const 包 = String(参.get('包') || ''), 档 = String(参.get('档') || 'icon.svg');
      const 判 = /^[a-z0-9][a-z0-9-]*$/.test(包) && /^icon\.(svg|png|jpe?g|webp|gif)$/i.test(档);
      后 = path.extname(档).toLowerCase();
      全 = 判 ? 插件找(包, 档) : '';
      if(!判){ 发(res, 400, '插件包那张图标只认 data\\plugins\\<包>\\images\\icon.<六种后缀>'); return; }
    }else{
      const 名 = String(参.get('名') || '');
      const 根 = path.resolve(图标层);
      全 = path.resolve(根, 名);
      后 = path.extname(全).toLowerCase();
      if(!名 || !(全 === 根 || 全.startsWith(根 + path.sep)) || !图标后缀.includes(后)){
        发(res, 400, '只认 icons 这个文件夹里的图（六种后缀之内，不许往外钻）'); return;
      }
    }
    let 字;
    try{ 字 = fs.readFileSync(全); }catch(e){ 发(res, 404, '读不到这一张'); return; }
    发(res, 200, 字, 类[后] || 'application/octet-stream');
    return;
  }
  /* 「重新对齐一遍」那颗：跑那颗现成的索引脚本（谁丢了图、删了图、改了引用，跑它重新对齐）。
     它写两处：icons\索引.txt 与出厂那份 src\pack\icons\索引.txt —— 都是登记文件，不碰源码。 */
  if(路 === '/api/图标/对齐'){ 起(['src/_build/ico-index.mjs'], '重新对齐图标索引（跑 src\\_build\\ico-index.mjs）', res); return; }
  /* 换这张 / 加一张 / 删这张：写完屏上那一栏自己重数一遍；要登记进那份说明书再点「重新对齐一遍」 */
  if(路 === '/api/图标/换' || 路 === '/api/图标/加'){
    const 身 = await 读体(req);
    /* 带「包」的那一发是插件包自己的封面（同名盖一张，不许加不许删）；不带的是 icons 那一格里的 */
    if(身 && 身.包 != null && String(身.包).trim() !== ''){
      if(路 === '/api/图标/加'){ 发(res, 400, '插件包的封面不给往里面添新的 —— 那一个文件名写在它的插件清单与那份索引上，要添新的那两处得一起改'); return; }
      const r = 图标写插件(String(身.包), String(身.档 || ''), 身 && 身.图);
      if(r.错){ 发(res, 400, r.错); return; }
      JSON发(res, { 好:true, 名:r.名, 大:r.大, 路径:r.路径, 新建:r.新建, 出自:r.出自 });
      return;
    }
    const r = 图标写(String(身 && 身.名 || ''), 身 && 身.图, 路 === '/api/图标/换' ? '换' : '加');
    if(r.错){ 发(res, 400, r.错); return; }
    JSON发(res, { 好:true, 名:r.名, 大:r.大, 新建:r.新建, 出厂:r.出厂 });
    return;
  }
  /* 把图标文件夹 icons\ 里那几张复制到打包用的那一份 src\pack\icons\（装到机器上带的就是那一份）。
     换 / 加 那两道自己已经带着复制了，这一颗管的是他在资源管理器里直接换掉的那几张。 */
  if(路 === '/api/图标/进厂'){
    const 身 = await 读体(req);
    const 单 = 身 && Array.isArray(身.单) ? 身.单.map(String)
      : (身 && 身.名 ? [String(身.名)] : []);
    if(!单.length){ 发(res, 400, '没说要复制哪几张到打包用的那一份'); return; }
    const 成 = [], 坏 = [];
    for(const 名 of 单){ const r = 进出厂(名); if(r.好) 成.push(r); else 坏.push(名 + '：' + r.错); }
    JSON发(res, { 好:!坏.length, 成, 坏 });
    return;
  }
  if(路 === '/api/图标/删'){
    const 身 = await 读体(req);
    const r = 图标删(String(身 && 身.名 || ''));
    if(r.拒){ 发(res, 409, r.拒); return; }
    if(r.错){ 发(res, 400, r.错); return; }
    JSON发(res, { 好:true, 名:r.名 });
    return;
  }

  /* ---------- 图标柜：列一格 + 出预览（读的那两道路径闸与「换 / 加」那五把守门同一口径）---------- */
  if(路 === '/api/图柜'){
    const 参 = new URLSearchParams(String((req.url || '').split('?')[1] || ''));
    JSON发(res, 柜列(参.get('路'))); return;
  }
  if(路 === '/api/图柜/一张'){
    const 参 = new URLSearchParams(String((req.url || '').split('?')[1] || ''));
    const r = 柜一张(参.get('路'), 参.get('相'));
    if(r.错){ 发(res, 400, r.错); return; }
    /* 带 码=1 的那一发是给「挑中这张」用的：回 base64，页面拿它去叫 /api/图标/换 或 /加 */
    if(参.get('码')){ JSON发(res, { 好:true, 名:r.名, 大:r.字.length, 图: r.字.toString('base64') }); return; }
    发(res, 200, r.字, 柜MIME[r.后] || 'application/octet-stream'); return;
  }

  发(res, 404, '没有这个地址');
});
if(被当命令跑) 服务器.listen(PORT, '127.0.0.1', () => {
  console.log('文字与图标这一屏 = http://127.0.0.1:' + PORT + '/   （只管两样：改界面上的句子、改图标）');
  console.log('小助手只听本机 127.0.0.1；关掉这个窗口就停。它自己不往远程送任何东西 —— 那一摊（起分支、提交、推、建合并申请、打安装包、记版本号）都不在这一屏上，命令还在 src\\_build\\pr.mjs 与 src\\_build\\release.mjs 那两颗里。');
});
for(const 信 of ['EADDRINUSE', 'ERR_SERVER_ALREADY_LISTEN']) void 信;
if(被当命令跑) 服务器.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? '端口 ' + PORT + ' 已经被占了（多半是小助手已经开着另一个窗口）。换个端口：set PORT=8793 再跑。' : '起不来：' + e.message);
  process.exit(1);
});

/* 闸要从这一份里真跑那几颗判断（存句子、图标读索引、git 叫不动那两道），所以对外交出来；
   借的人不会听到端口 —— 上面那道 被当命令跑 挡着。 */
export { 被当命令跑, 文字读, 文字写, 清单文件, 字树, 图标单, 读索引, 叫得动git, 界面文字那颗, 现场,
  图标落点, 图标写, 图标删, 图标上限, 插件封面, 图标写插件, 插件层, 柜列, 柜一张, 图标后缀,
  厂层, 进出厂, 出厂看, 插件找, 柜上限, 界面邻居, 那份在哪 };
