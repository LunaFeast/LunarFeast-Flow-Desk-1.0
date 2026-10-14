/* ============================================================
   推送那一摊的可视化（他 2026-10-11 点名要的：「没有推送清单！！给我可视化！！！！」）
   ------------------------------------------------------------
     双击 src\tools\push-fd.bat      起这一台，顺手把浏览器开到 http://127.0.0.1:8792/
     node src/_build/push-ui.mjs     同一件事，从终端起
     环境变量 PORT 换端口（默认 8792；8791 是那台页面服务的，各占一个）

   这一台不自己实现任何发布动作 —— 它只做三样：
     ① 把 src\_build\release.mjs --看 跑一遍，读它落下来的那一格 data\推送清单.txt，摊成一屏卡片；
     ② 他在框里改的五样（版本基线、分支类型、提交分支、本轮说明、每一笔的更新描述）写回同一格文件，其余各行一个字节不碰；
     ③ 往远程送东西的那两颗按钮，一颗一个口子，全在 src\_build\pr.mjs 里：
        · 「推送这一轮的改动」起 pr.mjs --提交PR：摊单 → 同步远程 main → 开那条支 → 落笔 → 公开面那道闸 → 推那条支 → 建 PR；
        · 「推勾中的那几项」起 pr.mjs --推前瞻支 --推=<项id,…>：只推点名的那几条功能支，一条一份申请；
        · 「打包发版」起 release.mjs --照清单发：那条支没被合进 main 之前这一颗不亮，硬点就报「先合并 PR，再打包」。
   那两颗要往远程送东西的，点下去先把 pr.mjs 摊出来的那份单摊在他面前（/api/摊单，纯读、一个字节不推），
   他在框里敲进那一个字（收字 拿 push-list.mjs 里那一颗 确认词 比），敲对了才起子进程、并且带 --已确认；
   敲错了、框里空着、一个字都不对：400 回给他，子进程根本不起。
   2026-10-14 换的口径：从前是"跑起来了才在日志中段冒一格输入框"，那份单只在他敲字之后的日志里出现 ——
   他指着那一张截图说「没有亲手敲字的地方，这个确认方法也太奇怪了」。
   往远程送东西这一手只推被点名的功能支：这一颗与 pr.mjs 里都没有、也不会再有"推 main"那一道口子
   （远程那一根 main 是 2026-10-14 上午他自己敲字建出来的第一次，那一次用的那一颗用完就整块拆了）。
   所以界面上看到的和终端里看到的必然同源：一份清单文件、一条链、一个字。

   为什么要有那一枚随机码：这一台只认 127.0.0.1，但同一台机器上别的网页也能发请求到 127.0.0.1；
   页面上的码是起台子时现生成的，写请求不带它就拒 —— 挡的是「别的页面顺手点了一下推送」。
   不认令牌、不存东西：推这一步用的还是这台机器已经配好的 git credential helper，这一台不碰任何密钥。
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { TREE, 本地前瞻支, 家 as 家表, 产物格, 打包记录路 } from './plugin-repos.mjs';
import { 底号 } from './version.mjs';
import { 清单名, 清单路, 读盘清单, 读清单显示, 改清单, 写清单, 合法基线, 确认词,
  支类表, 支类合规, 等字的格, 支名可用, 集成分支名 } from './push-list.mjs';
import { 查合并, 前瞻单, 提交单 } from './pr.mjs';
/* 借的是 pr.mjs 那几颗只读的：查合并那一眼（不 fetch）、还有那两份"这一趟要推什么"的单。
   这一台自己照样不碰 git 的写活 —— 摊单与真跑两头都是 pr.mjs 那一颗在算（2026-10-14 换成先摊单再敲字）。 */
import { 八项 as 八项名单, 分支在不在, 现在带不带 } from './forward-features.mjs';

const PORT = +(process.env.PORT || 8792);
/* 被当命令跑才听端口：闸（src\tools\probes\gate-pushui46.mjs）要把这一份当零件借进去真跑那几颗判断，
   一 import 就占 8792 的话，跑闸会把你正开着的那一屏顶掉。与 plugin-repos.mjs 同一道闸。 */
const 被当命令跑 = !!(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url);
const 码 = crypto.randomBytes(12).toString('hex');
const 页面路 = path.join(import.meta.dirname, 'push-ui.html');
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
/* git 叫不动就别往下走：那四道（量 / 提交 PR / 打包发版 / 重建集成分支）底下全是 git 活，
   硬起只会像刚才那样退出码 1，还留一屏旧数当现数。 */
const git不中 = res => { const 话 = 叫得动git(); if(!话) return false;
  发(res, 503, '停下来：' + 话 + '\n  这一台什么都不做 —— 量、提交 PR、打包发版、重建集成分支这四道都要叫得动 git。'); return true; };
/* 那一本「这一摞包各是什么形状」的账（release.mjs 每打成一枚记一笔）：屏上拿它分清哪一枚是全功能那一枚。
   读不到不算错 —— 那一格整个被 .gitignore 挡着，从没打过就没有；屏上照实说「还没打过」。 */
function 包的账(){
  try{ const 对 = JSON.parse(fs.readFileSync(打包记录路, 'utf8'));
    return new Map((对.列 || []).map(x => [x.文件, x])); }
  catch(e){ return new Map(); }
}
function 现场(){
  const 问脏 = 跑git(['status', '--porcelain']);
  const 问站 = 跑git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const 脏单 = 问脏.好 ? 问脏.文.split(/\r?\n/).filter(Boolean) : null;
  let 开着 = false;
  try{ 开着 = /Flow-Desk\.exe/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq Flow-Desk.exe', '/FO', 'CSV', '/NH'], { encoding:'utf8' })); }catch(e){}
  const 文 = 读盘清单();
  const 表 = 文 ? 读清单显示(文) : null;
  const 支 = String((表 && 表.提交分支) || '').trim();
  const 型 = String((表 && 表.分支类型) || '').trim();
  /* 合并状态那一眼：只问本地已经知道的 main 与 origin/main（fetch 归 pr.mjs 那一头，这一台不碰网络）。
     名字认不出类、或那一类永不进远程（集成分支）的就不问 —— 问它没有意义，那条支一辈子不在远端。
     git 叫不动也不问：问出来的是假的。 */
  let 合 = null;
  if(支 && 问脏.好 && 支名收(支)){
    /* 这一格里「远端」与「远端笔」必须是两个名字：从前这一行把 远端 写了两遍（后一枚 远端:状.远端 是远端的名字
       「origin」，把前一枚布尔值顶掉了），屏上拿 合.远端 当布尔判，于是只要配过远端，
       那一行就永远报「远端 main 里有了，本地 main 还没跟上」—— 2026-10-13 他截图抓到才量出来。 */
    try{ const 状 = 查合并(支, { 不拉:true }); 合 = { 本地:!!状.本地, 远端笔:!!状.远端笔, 有远端:!!状.有远端, 远端名:状.远端, 一眼:状.一眼 }; }
    catch(e){ 合 = { 本地:false, 远端笔:false, 有远端:false, 话:String((e && e.message) || e).split(/\r?\n/)[0] }; }
  }
  return {
    git好: 问脏.好 && 问站.好, git话: 问脏.好 ? 问站.话 : 问脏.话,
    站: 问站.好 ? (问站.文 || '（问不出）') : '（问不出）',
    树: TREE,
    脏: 脏单 ? 脏单.length : -1, 脏单: 脏单 ? 脏单.slice(0, 12) : [],
    开着,
    账上底号: 底号(),
    清单在: !!文, 清单路: 清单路(), 清单名,
    确认词,
    表,
    /* 跟着软件一起装的那几家插件（名字从家表取，屏上一条一格摆出来给他勾，不许他手打内部名字）。
       这一格与屏上那一栏从前叫「七家」，可家表里是几家就几家（2026-10-14 撤了卡片默认大小那一台之后是六家）——
       把数字写进名字里就是假话，所以改成 插件家，屏上那一行的家数现量。 */
    插件家: 家表.map(j => ({ id: j.id, 中文: j.中文 })),
    支, 型, 支名合: 合, 前瞻: 问脏.好 ? 本地前瞻支() : [], 集成: 集成分支名,
    /* 第 6 步那颗「从集成分支打这一枚」亮不亮，看那一根本地集成分支起没起 */
    集成在: (() => { try{ execFileSync('git', ['rev-parse', '--verify', 'refs/heads/' + 集成分支名], { cwd: 字树, encoding:'utf8', stdio:['ignore','pipe','pipe'] }); return true; }catch(e){ return false; } })(),
    /* 那八项功能（名单只在 src\_build\forward-features.mjs 那一份里）：一条一格，
       量两样给他看 —— 它那条分支起没起、现在这一棵带不带这一项。勾哪几项进这一枚包由他点。 */
    八项: 问脏.好 ? 八项名单.map(x => { const 带 = 现在带不带(TREE, x);
      return { id: x.id, 中文: x.中文, 分支: x.分支, 起: 分支在不在(TREE, x.分支),
        带: 带.带, 话: 带.话, 形状: x.形状, 动的地方: x.动的地方 }; }) : [],
    支类: 支类表.map(c => ({ 类: c.类, 话: c.话 })),
    类判: 支 ? 支类合规(型, 支) : null,
    在跑: !!当值.名,
    /* 「为什么这颗不能按」由后端把机器那一头的理由列全（屏上摆成一句人话）：
       他 2026-10-14 那条「推送main不亮，不知道为什么」—— 从前屏上只把按钮调灰，一个字都不说。 */
    推不亮: (() => {
      const 缺 = [];
      if(!(问脏.好 && 问站.好)) 缺.push('git 叫不动：' + (问脏.好 ? 问站.话 : 问脏.话));
      if(!文) 缺.push('还没点「重新量一遍」：那份清单文件不在，屏上量不出这一轮要动哪几家');
      if(当值.名) 缺.push('小助手正跑着上一趟（' + 当值.名 + '），等它跑完');
      return 缺;
    })(),
    /* 打包出来的那枚安装程序在哪：屏上直接给那一格的路、文件名、多大、什么时候打的
       （他 2026-10-14：找不到打包的安装包在哪里）。只列最近八枚，新的在前。
       每一枚再从那本「这一摞包」的账里取出它是基础版还是全功能那一枚、带了哪几项功能 ——
       五枚 exe 的名字只差那一段短哈希，光看文件名他分不出哪一枚是要装的那一枚（同一句「找不到全功能的完整的安装包」）。 */
    产物格,
    产物: (() => {
      const 账 = 包的账();
      try{
        return fs.readdirSync(产物格).filter(f => /^Flow_Desk_setup_.*\.exe$/i.test(f)).map(f => {
          const s = fs.statSync(path.join(产物格, f)), 记 = 账.get(f);
          return { 名: f, MB: +(s.size / 1048576).toFixed(1), ms: s.mtimeMs,
            时候: new Date(s.mtimeMs).toLocaleString('zh-CN', { hour12: false }),
            档: 记 ? 记.档 : '', 支: 记 ? 记.支 : '', 功能: 记 && 记.功能 ? 记.功能 : [],
            不带: 记 && 记.不带插件 ? 记.不带插件 : [] };
        }).sort((a, b) => b.ms - a.ms).slice(0, 8);
      }catch(e){ return []; }
    })(),
  };
}

/* ---------- 图标素材那一摊（他 2026-10-12 点名要并进来的两半之一）----------
   图标住在仓根 icons\ 那一格（子文件夹只认一层）。**每一张是什么、哪份代码在叫它、叫几次，
   已经有一份对齐好的答案：icons\索引.txt**，由 src\_build\ico-index.mjs（#245）生成 ——
   这一台只读它、并给一颗「重新对齐一遍」去跑那颗脚本，绝不自己再搜第二套（搜出来的口径与那份索引对不上就是两头漂移）。
   六个后缀与那颗脚本里那一份同字，闸 gate-pushui46 盯着。 */
const 图标后缀 = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
/* 那一层住哪：默认仓根 icons\；环境变量 FD_ICONS 指到别处（与页面服务那台同一个名字，见 src\_fd\fd-serve.mjs 顶上）——
   闸要真跑"加一张、换一张、删一张"，拿沙盒当那一层，不往你的 icons\ 里落一个字。 */
const 图标层 = process.env.FD_ICONS ? path.resolve(process.env.FD_ICONS) : path.join(TREE, 'icons');
/* 插件包那一格同一个口子（FD_PLUGINS）：闸要真跑「往包里盖一张封面」，得能指到沙盒那一棵，
   不往你的 data\plugins\ 里落一个字。默认还是仓里那一格（屏上取图、列清单都从那儿读）。 */
const 插件层 = process.env.FD_PLUGINS ? path.resolve(process.env.FD_PLUGINS) : path.join(TREE, 'data', 'plugins');
const 索引路 = path.join(图标层, '索引.txt');
/* 索引一行一条：`名字 = 这是干什么的 —— 引用：某文件×3、某文件×1`；段首那几行以 # 起头。
   认不动的行整行留着当"说不清的"，不猜。 */
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
    单.push({ 名: 层 ? 层 + '/' + 名 : 名, 键, 层: 层 === '' ? '（icons 根下）' : 层,
      大: fs.statSync(全).size, 说: 条 ? 条.说 : '', 引用: 条 ? 条.引用 : '', 段: 条 ? 条.段 : '', 登记: !!条 });
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
    const 全 = path.join(插件层, 包, 'images', 档);
    let 大 = -1;
    try{ 大 = fs.statSync(全).size; }catch(e){}
    return { 名: 'data/plugins/' + 包 + '/images/' + 档, 键: x.名, 包, 档, 层: '插件包 ' + 包, 大, 说: x.说.replace(/\s*·\s*[a-z0-9.]+$/i, '').trim(),
      引用: x.引用, 段: x.段, 登记: true, 在不在: 大 >= 0 };
  }).sort((a, b) => a.键 < b.键 ? -1 : 1);
  const 通用没图 = 索.条.filter(x => !/^pack-/.test(x.名) && !单.some(y => y.键 === x.名)).map(x => x.名);
  return { 错: 索.错, 单, 插件, 张: 单.length, 插件张: 插件.length,
    没登记: 单.filter(x => !x.登记).map(x => x.键), 没图: 通用没图, 插件丢图: 插件.filter(x => !x.在不在).map(x => x.键) };
}

/* ---------- 界面文字那一摊（他 2026-10-12 点的另一半天）----------
   清单住在 data\ui-text.yaml（77 组、4418 条：一行一个地方，段首写"哪个程序的哪一页"，缩进行写「原句: 改成那句」）。
   扫描、排版、预览改动、写进源码这几颗手全在 src\pack\uitext.cjs 那一份里（它底下有 require.main 那道闸，
   当零件借不会自己跑起来），这一台只叫它，不另写一套：
     刷新清单 → 起子进程跑 node src\pack\uitext.cjs（它自己会把他改过的句子原样保住）
     存他改的句子 → 只动清单里对得上的那几行的冒号右边，其余各行一个字节不碰；引号写法用的是它那一份 yq()
     预览改动 / 写进源码 → 直接叫 plan() / apply()（方案甲，2026-10-13 定的：写回扫描量到的那一份源码）
     重新生成产物 → 跑 uitext 那份里 artifactBuilds() 那三趟（次序不在这里抄第二份）
   划掉一句（del）在清单里是这一行唯一的记号：冒号右边一对空引号，不能和"没改"混成同一个样子。 */
const 要件 = createRequire(import.meta.url);
const 字 = 要件('../pack/uitext.cjs');
const 界面文字那颗 = 字;
/* 界面文字那一摊落在哪一棵树上：和图标那一格同一个口子（FD_TREE，探针的测试树就用它，口径同 src\_build\tree.cjs）。
   闸要在沙盒里真写真改这一摊，不能往他仓里落一个字 —— 没这个口子就只能「假设它写得对」。 */
const 字树 = process.env.FD_TREE ? path.resolve(process.env.FD_TREE) : TREE;
const 清单文件 = 字.uiTextPath(字树);
function 文字读(){
  let 文 = '';
  try{ 文 = fs.readFileSync(清单文件, 'utf8'); }catch(e){ return { 错:'读不到 ' + 清单文件 + '：' + ((e && e.code) || (e && e.message) || e), 段:[], 条:[] }; }
  const 条 = 字.parse(文);
  const 段 = [];
  for(const r of 条){ const k = r.src; if(!段.includes(k)) 段.push(k); }
  return { 错:'', 段, 条:条.map(r => ({ 段:r.src, prog:r.prog, page:r.page, from:r.from, to:r.to, del:!!r.del })),
    重跑: 字.artifactBuilds(), 字条: 条.length };
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

/* 图标那一格的增删改（他 2026-10-12 点的）：只动 icons\ 那一格里的一层文件，
   名字与后缀先过一遍（六后缀之外不收、带路径分隔符与怪字符的不收、索引.txt 那一本说明书不许当图标删），
   单张上限 512 KB（图标本来就该是几 KB 的线稿，超了多半是传错文件）。
   删之前先看索引说没说"有代码在叫它"：说了就拒删，把是哪几处报出来 —— 换图可以，删掉正在用的图不行。 */
const 图标上限 = 512 * 1024;
function 图标落点(名){
  const 串 = String(名 == null ? '' : 名).trim();
  if(!串 || 串.length > 80 || /[\\:*?"<>|\u0000-\u001f]/.test(串)) return { 错:'这个名字不成样子（不许带反斜杠、冒号、星号、问号、尖括号）' };
  if(/^索引\.txt$/i.test(串.replace(/^.*[\\/]/, ''))) return { 错:'icons\\索引.txt 是那份说明书，不是图标，不许动它' };
  const 根 = path.resolve(图标层);
  const 全 = path.resolve(根, 串);
  if(!(全 === 根 || 全.startsWith(根 + path.sep))) return { 错:'只许在 icons 这个文件夹里改（不许往外钻）' };
  const 父 = path.resolve(path.dirname(全));
  if(父 !== 根 && path.resolve(path.dirname(父)) !== 根) return { 错:'子文件夹只认一层（icons\\<那一层>\\<图>），再往里钻不算图标' };
  if(!图标后缀.includes(path.extname(全).toLowerCase())) return { 错:'只收这六种后缀：' + 图标后缀.join(' ') };
  const 基 = path.basename(全);
  if(基.length > 60 || !/^[\w.\-]+$/.test(基)) return { 错:'文件名只许字母数字点横杠，60 字以内' };
  return { 全, 根, 父 };
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
  return { 好:true, 新建:!在, 名, 大:字.length };
}
/* 插件包那一张封面：不住 icons\，住在 data\plugins\<包>\images\ 里，那一个文件名写在它的插件清单与那份索引上。
   所以这里只许「同名盖一张」：换了文件名等于壳里叫不到那张图，要换格式得他自己在清单与索引里改。 */
function 插件封面(包, 档){
  if(!/^[a-z0-9][a-z0-9-]*$/.test(String(包 || ''))) return { 错:'包名只许小写字母、数字、连字符：「' + 包 + '」' };
  if(!/^icon\.(svg|png|jpe?g|webp|gif)$/i.test(String(档 || ''))) return { 错:'插件封面只认 icon.<六种后缀>：「' + 档 + '」' };
  const 格 = path.resolve(插件层, 包, 'images');
  const 全 = path.resolve(格, String(档));
  if(path.dirname(全) !== 格) return { 错:'只许写在 data\\plugins\\<包>\\images\\ 那一格里' };
  return { 全, 格 };
}
function 图标写插件(包, 档, 基64){
  const 落 = 插件封面(包, 档);
  if(落.错) return 落;
  if(!fs.existsSync(落.全)) return { 错:'这一包里本来没有那张封面：' + 落.全 + '\n  要添一张新的得连它的插件清单与那份索引一起改，小助手不替你改那两处' };
  let 字;
  try{ 字 = Buffer.from(String(基64 || ''), 'base64'); }catch(e){ return { 错:'传上来的图读不懂（不是 base64）' }; }
  if(!字.length) return { 错:'传上来的图是空的' };
  if(字.length > 图标上限) return { 错:'这一张 ' + 字.length.toLocaleString() + ' 字节，超过 ' + 图标上限.toLocaleString() + ' 字节上限（图标该是几 KB 的线稿，多半是传错文件了）' };
  fs.writeFileSync(落.全, 字);
  return { 好:true, 名:'pack-' + 包, 大:字.length, 路径:'data/plugins/' + 包 + '/images/' + 档 };
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
/* 往远程送东西那三道（提交 PR / 推勾中的那几项 / 第一次推 main）都在起子进程之前就把他敲进框里的那一个字核过了
   （收字），核过了才起、并且带 --已确认 —— 这一台不再往子进程的键盘输入里写任何一个字节。
   从前那一道是把日志里那一句「确认词：」找出来、在屏上冒一格输入框、再把他敲的字喂进 stdin；2026-10-14 换成现在这样。 */
const 当值 = { 名:'', 手:null };
function 收字(res, 身){
  const 答 = String(身 && 身.词 != null ? 身.词 : '').trim();
  if(答 !== 确认词){
    发(res, 400, '框里送回来的是「' + 答 + '」，不是那一个字 —— 这一趟一个字节都没往远程送（那一个字是 ' + 确认词 + '）。');
    return false;
  }
  return true;
}
/* 起子进程跑一趟命令行工具：输出直接接到那一格日志里。 */
function 起(参数, 标题, res, 在){ return 起连([参数], 标题, res, 在); }
/* 连着跑好几趟（重新生成产物那三趟）：同一把「上一趟还没跑完」的闸、同一条日志；
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
    /* 键盘输入那一头一开头就关掉：往远程送东西的那三道都在起子进程之前核过他敲的字（带 --已确认），
       这一台不该再往里面写东西。万一哪天哪一道漏了 --已确认 自己走到要确认那一步，它读到的是"读不到输入" ——
       按 pr.mjs 那条老规矩一个字节都不推，失败的方向是关着的，不是挂着等一个永远不会来的字。 */
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
   绝不能让一颗 URL 把这一台砸掉 —— 它要是正跑到「等你确认」那一步，砸掉的是整趟发布。 */
const 拆路 = u => { try{ return decodeURIComponent(u); }catch(e){ return u; } };

/* 这一轮那条支的名字收不收：收与不收只问 push-list 那一颗 支名可用（旧那三种头一段 + 四类里能往远程推的），
   这一屏不再自己判一遍。集成分支那种永不进远程的、认不出类的，都收不下来。 */
const 支名收 = 名 => 支名可用(名).行;
const 支名拒话 = 名 => { const 串 = String(名 == null ? '' : 名).trim();
  return !串 ? '「提交分支」这一栏是空的：先点「重新量一遍」拿个默认名，或自己填一条（哪一类都行，四类名字的写法在清单文件顶上写着）'
    : '「提交分支」那一行认不出能用：「' + 串 + '」—— ' + 支名可用(串).话; };

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
      写了:(果.files || []).map(f => path.relative(字树, f).split(path.sep).join('/')), 重跑:果.builds || [] });
    return;
  }
  /* 源码里的句子换完了，界面上还看不见 —— 得把产物重新生成一遍。跑的就是 uitext 那一份里
     artifactBuilds() 那三趟（为写内核 → 推演组件定制内核 → 那一张页面），次序不在这里抄第二份；
     中间任何一趟退出码不是 0，后面那几趟不接上跑。 */
  if(路 === '/api/文字/重生成'){
    起连(字.artifactBuilds().map(相 => [相]), '重新生成产物（为写内核 → 推演组件定制内核 → 那一张页面；三趟写的都是产物，源码一个字不碰）', res, 字树);
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
      全 = path.resolve(插件层, 包, 'images', 档);
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
      JSON发(res, { 好:true, 名:r.名, 大:r.大, 路径:r.路径 });
      return;
    }
    const r = 图标写(String(身 && 身.名 || ''), 身 && 身.图, 路 === '/api/图标/换' ? '换' : '加');
    if(r.错){ 发(res, 400, r.错); return; }
    JSON发(res, { 好:true, 名:r.名, 大:r.大, 新建:r.新建 });
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

  if(路 === '/api/存'){
    const 身 = await 读体(req);
    if(!身) { 发(res, 400, '读不懂这一趟送来的东西'); return; }
    if(身.基线 != null && !合法基线(身.基线)){ 发(res, 400, '版本基线不成样子：「' + 身.基线 + '」—— 要的是 1.0.0-alpha 这一串，+build. 那一截不写在这儿'); return; }
    /* 「分支类型」那一格：只收那四个名字（空着 = 照支名认）。那张表与判据都在 push-list.mjs 一份，这里只叫它。 */
    const 型 = 身.分支类型 == null ? null : String(身.分支类型).trim();
    if(型 != null && 型 !== '' && !支类表.some(c => c.类 === 型)){
      发(res, 400, '「分支类型」只认那四个名字（' + 支类表.map(c => c.类).join('、') + '），空着算"照支名认"：现在送回来的是「' + 型 + '」'); return;
    }
    /* 支名那一行：空着不许存（pr.mjs 与打包那道闸都靠它）；旧那三种头一段与四类里能推的都收，
       认不出类或那一类永不进远程（集成分支）的当场报它属于哪一类 */
    if(身.提交分支 != null){
      const 名 = String(身.提交分支).trim();
      if(!支名收(名)){ 发(res, 400, 支名拒话(名)); return; }
      if(型 != null){ const 判 = 支类合规(型, 名); if(!判.行){ 发(res, 400, 判.话); return; } }
    }
    const 文 = 读盘清单();
    if(!文){ 发(res, 409, '还没有那份清单文件：先点「重新量一遍」'); return; }
    写清单(改清单(文, { 基线: 身.基线, 分支类型: 型 == null ? undefined : 型, 描述: 身.描述 || {}, 提交分支: 身.提交分支, 本轮说明: 身.本轮说明 }));
    JSON发(res, { 好: true, 清单路: 清单路() });
    return;
  }
  /* 「打开那一格」：把资源管理器开到产物那一格（最新那枚安装包选中）。
     屏上每一枚自己有一颗「在这台电脑上找到它」—— 他要的是那一枚全功能的，不是"最新那一枚"（2026-10-14）。
     只认这一格里现量出来的那几个文件名：屏上递回来的名字先与 readdir 的结果对一遍，对不上就拒（不拿它拼路径）。 */
  if(路 === '/api/开产物'){
    const 身 = await 读体(req);
    const 挑 = String((身 && 身.名) || '').trim();
    let 单 = []; try{ 单 = fs.readdirSync(产物格); }catch(e){}
    const 名 = 挑 ? (单.includes(挑) ? 挑 : '') : (单.filter(f => /^Flow_Desk_setup_.*\.exe$/i.test(f))
      .sort((a, b) => fs.statSync(path.join(产物格, b)).mtimeMs - fs.statSync(path.join(产物格, a)).mtimeMs)[0] || '');
    if(挑 && !名){ 发(res, 400, '「' + 挑 + '」不在 ' + 产物格 + ' 这个文件夹里 —— 只能打开这个文件夹里现在实际有的那几个文件名。'); return; }
    try{
      /* explorer 挑中那枚时返回码是 1（它的老毛病），不代表没开成 —— 所以只看叫得动叫不动 */
      spawn('explorer.exe', 名 ? ['/select,' + path.join(产物格, 名)] : [产物格], { stdio:'ignore', detached:true }).unref();
      JSON发(res, { 好:true, 话:'已打开这个文件夹：' + 产物格 + (名 ? '（选中的是 ' + 名 + '）' : '（这个文件夹里还没有安装程序）') });
    }catch(e){ 发(res, 500, '打不开资源管理器：' + ((e && e.message) || e)); }
    return;
  }
  /* 摊单：这一趟要推什么，先摊给他看，一个字都不推、一根指针都不挪（pr.mjs 那两颗算的，屏上不另写一份）。
     纯读，所以收 GET；真推那两道一律 POST，而且非要他亲手敲进框里的那一个字不可。 */
  if(路 === '/api/摊单'){
    if(git不中(res)) return;
    const 参 = new URLSearchParams(String((req.url || '').split('?')[1] || ''));
    const 道 = 参.get('道') || '';
    const 递 = String(参.get('项') || '').split(',').map(s => s.trim()).filter(Boolean);
    try{
      const 单 = 道 === '推前瞻支' ? 前瞻单(递).单
        : 道 === '提交PR' ? 提交单().单 : null;
      if(!单){ 发(res, 400, '摊单只认那两道：提交PR / 推前瞻支（现在送回来的是「' + 道 + '」）'); return; }
      JSON发(res, { 好:true, 道, 单 });
    }catch(e){ 发(res, 409, '这一趟摊不出单来，所以什么都不推：' + String((e && e.message) || e)); }
    return;
  }

  if(路 === '/api/量'){ if(git不中(res)) return; 起(['src/_build/release.mjs', '--看'], '重新量一遍（只量现场，往那张表里落一份，仓里的代码一个字节不写）', res); return; }
  /* 流程那几步一步一颗（他 2026-10-13：「给我按照流程一步一个按钮」「步骤缺失」）：
     第 1 / 2 / 8 / 9 步从前没有按钮，第 6 步只有「重建集成分支」没有「从那一棵打这一枚」。 */
  if(路 === '/api/同步'){ if(git不中(res)) return; 起(['src/_build/pr.mjs', '--同步主干'], '把远程 main 拉到本地（只把本地 main 挪到同一笔，工作树里的一份文件都不动）', res); return; }
  if(路 === '/api/开支'){
    if(git不中(res)) return;
    起(['src/_build/pr.mjs', '--开这一轮的支'], '起这一轮的分支（从本地 main 起一条新的；已经有同名的就不重开、也不改写）', res); return;
  }
  /* 第 7 步的另一半：推哪几项上远程（勾中的那几项，各自那条功能支才推、才建 PR；没勾的一条都不推）。
     这一道要他先在屏上那份单下面敲进框里那一个字 —— 框里的字不对，子进程根本不起了。 */
  if(路 === '/api/推项'){
    if(git不中(res)) return;
    const 身 = await 读体(req);
    const 项 = String((身 && 身.项) || '').split(',').map(s => s.trim()).filter(Boolean);
    if(!项.length){ 发(res, 409, '一颗都没勾：这一颗只推你点名的那几项的功能支。要推基础那一支，用「推送这一轮的改动」。'); return; }
    if(!收字(res, 身)) return;
    起(['src/_build/pr.mjs', '--推前瞻支', '--推=' + 项.join(','), '--已确认'],
      '推勾中的那几项上远程（一项一条分支、各自建一个 PR；没勾的一条都不推）', res); return;
  }
  /* 第 3 步的后半：把盘上这一轮的改动按路径落到各支（本地那一半，不扫不推不建 PR）——
     从前这一颗没有，屏上只有「① 提交 PR」那一整条道，于是"落笔"这一步只能走到推送才发生：
     八项功能一直拆不进仓，卡的就是这一颗（2026-10-13 他：「为什么没有勾，安装包还有！！到底拆了没有」）。 */
  if(路 === '/api/落笔'){
    if(git不中(res)) return;
    起(['src/_build/pr.mjs', '--开支落笔'], '按分支提交到本地（同步 → 起分支 → 把这一轮动过的文件按路径送回各自那条分支；不扫公开面、不推远程、不建 PR）', res); return;
  }
  if(路 === '/api/查'){ if(git不中(res)) return; 起(['src/_build/pr.mjs', '--查合并'], '问一句：这一轮那条分支进 main 了没', res); return; }
  if(路 === '/api/快进'){ if(git不中(res)) return; 起(['src/_build/pr.mjs', '--各家快进'], '把插件那几条分支接到 main 后面（只挪分支的位置，已经推出去的一笔都不改写）', res); return; }
  if(路 === '/api/删支'){
    if(git不中(res)) return;
    起(['src/_build/pr.mjs', '--删本地已发布支'], '删本地那条已经合并的分支（还没进 main 的一条都不删）', res); return;
  }
  /* 第 6 步那一枚：从本地集成分支那一棵出（全功能），同样不提交、不打 tag、不推 */
  if(路 === '/api/完整'){
    if(git不中(res)) return;
    const 身 = await 读体(req);
    const 不带 = String((身 && 身.不带) || '').split(',').map(s => s.trim()).filter(Boolean);
    起(['src/_build/release.mjs', '--打自测包=完整'].concat(不带.length ? ['--不带=' + 不带.join(',')] : []),
      '用合好的这一棵打一枚安装包（第 6 步：带功能的那一枚，只在这台机器上）' + (不带.length ? ' · 整家不带 ' + 不带.join('、') : ''), res);
    return;
  }
  /* 「打本地自测包」那一道（他 2026-10-13 指出来的：流程第 3 步「本地打包简装版，我手动测试」在推送与合并之前，
     而这一屏原先只有合并之后才放行的「② 打包发版」，第 3 步压根按不动）。这一档不提交、不落清单、不打 tag、不推。 */
  if(路 === '/api/自测'){
    if(git不中(res)) return;
    const 身 = await 读体(req);
    const 不带 = String((身 && 身.不带) || '').split(',').map(s => s.trim()).filter(Boolean);
    const 带 = String((身 && 身.带) || '').split(',').map(s => s.trim()).filter(Boolean);
    const 参 = ['src/_build/release.mjs', '--打自测包']
      .concat(不带.length ? ['--不带=' + 不带.join(',')] : [])
      .concat(带.length ? ['--带=' + 带.join(',')] : []);
    起(参, '打这一枚安装包（用你电脑上现在这份代码；不提交、不打版本号标记、一个字节都不推远程）' +
        (不带.length ? ' · 不带 ' + 不带.join('、') : '') + (带.length ? ' · 额外带上 ' + 带.join('、') : ''), res);
    return;
  }
  /* 「重建集成分支」那颗（他 2026-10-12 第 7 件）：从本地 main 起一根 local/all-features-test，
     把屏上勾中的那几条本地前瞻支一条一条合上去。只在本地挪那一根指针 —— 撞车由 pr.mjs 停下来报是哪一条，
     这一根永不推远程（推那一步 可推远程() 当场拒）。 */
  if(路 === '/api/集成'){
    if(git不中(res)) return;
    const 身 = await 读体(req);
    const 列 = 身 && Array.isArray(身.支) ? 身.支.map(s => String(s).trim()).filter(Boolean) : [];
    if(!列.length){ 发(res, 400, '一条支都没勾：重建集成分支要知道把哪几条本地前瞻支合上去。'); return; }
    起(['src/_build/pr.mjs', '--重建集成分支', '--支=' + 列.join(',')],
      '把勾中的几条功能分支合到一起（从本地 main 起一条，一条一条合上去；只在本地，不推远程）', res);
    return;
  }
  /* 两颗按钮的先后（2026-10-11 新规矩）：先「提交 PR」，他人工合并之后才轮到「打包发版」。
     2026-10-14 改的口径：这一道要他在屏上那份单下面敲进框里那一个字（收字），起了子进程还带 --已确认，
     pr.mjs 那头就不在日志中段再问一遍 —— 从前是"跑了几分钟才在日志里冒出一格输入框"，他说那个方法太奇怪。 */
  if(路 === '/api/pr'){
    if(git不中(res)) return;
    const 身 = await 读体(req);
    const 文 = 读盘清单();
    if(!文){ 发(res, 409, '还没有那份清单文件：先点「重新量一遍」'); return; }
    const 支 = String(读清单显示(文).提交分支 || '').trim();
    if(!支名收(支)){ 发(res, 409, 支名拒话(支)); return; }
    /* 「不点就不落笔」那一道后端闸：提交说明与本轮说明哪一格还空着就不起子进程（屏幕上那颗钮不亮是同一把尺量的）。
       我不替他补一句默认文字 —— 参照文字在清单那一笔底下的 # 行里，得他自己改成一句话。 */
    const 缺 = 等字的格(读清单显示(文));
    if(缺.length){ 发(res, 409, '这几格还空着，要他手动填了才落笔：' + 缺.join('、') + '\n  参照文字就在清单里那一笔底下的 # 行，改成你自己那句再点。'); return; }
    if(!收字(res, 身)) return;
    起(['src/_build/pr.mjs', '--提交PR', '--已确认'], '推送这一轮的改动（先摊单 → 同步 → 起分支 → 按分支提交到本地 → 扫公开面 → 推这条分支 → 建 PR，建完就停）', res);
    return;
  }
  /* 往远程送东西的两道口子都在上面（提交 PR / 推勾中的那几项）：这一台没有、也不会再有"推 main"那一颗。
     远程那一根 main 是 2026-10-14 上午他自己敲字建出来的那一次，当时配的那一颗用完整块拆了。 */
  if(路 === '/api/发'){
    if(git不中(res)) return;
    const 文 = 读盘清单();
    if(!文){ 发(res, 409, '还没有那份清单文件：先点「重新量一遍」'); return; }
    const 支 = String(读清单显示(文).提交分支 || '').trim();
    if(!支名收(支)){ 发(res, 409, 支名拒话(支) + '（先点「重新量一遍」，再在顶上那一格填这一轮那条支的名字）'); return; }
    let 状 = null; try{ 状 = 查合并(支, { 不拉:true }); }catch(e){}
    if(状 && !状.本地 && !状.远端笔){
      发(res, 409, '先合并 PR，再打包 —— 号要钉在 main 上真实存在的那一笔上。\n' +
        '这一轮那条支：' + 支 + (状.有远端 ? '（' + 状.远端 + '/main 那一头也还没有它）' : '（本地还不知道远端那一笔）') +
        '\n查合并那一眼：' + 状.一眼);
      return;
    }
    if(状 && !状.本地 && 状.远端笔){
      发(res, 409, '那条分支已经在 ' + 状.远端 + '/main 里了，可本地 main 还没跟上 —— 人工跑一句 git -C ' + TREE +
        ' merge --ff-only ' + 状.远端 + '/main（小助手不自动合、不 rebase、不 reset），再来打包。\n查合并那一眼：' + 状.一眼);
      return;
    }
    起(['src/_build/release.mjs', '--照清单发'], '打包发版（取版本号 → 把各家拼成一棵 → 生成页面 → 铺出厂那一份 → 出安装包 → 本地打版本号标记；最后只列一遍现场，不推远程）', res);
    return;
  }
  发(res, 404, '没这一格');
});
if(被当命令跑) 服务器.listen(PORT, '127.0.0.1', () => {
  console.log('推送这一屏 = http://127.0.0.1:' + PORT + '/   （那份清单文件：' + 清单路() + '）');
  console.log('小助手只听本机 127.0.0.1；关掉这个窗口就停。它自己不推任何东西 —— 推那一步要你在屏幕上亲手敲「' + 确认词 + '」。');
});
for(const 信 of ['EADDRINUSE', 'ERR_SERVER_ALREADY_LISTEN']) void 信;
if(被当命令跑) 服务器.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? '端口 ' + PORT + ' 已经被占了（多半是这一台已经开着另一个窗口）。换个端口：set PORT=8793 再跑。' : '起不来：' + e.message);
  process.exit(1);
});

/* 闸要从这一份里真跑那几颗判断（存句子、图标读索引、git 叫不动那两道），所以对外交出来；
   借的人不会听到端口 —— 上面那道 被当命令跑 挡着。 */
export { 被当命令跑, 文字读, 文字写, 清单文件, 字树, 图标单, 读索引, 叫得动git, 界面文字那颗, 现场,
  图标落点, 图标写, 图标删, 图标上限, 插件封面, 图标写插件, 插件层 };
