/* ============================================================
   gate-look46.mjs · 插件分离第 4 批 4.4：每一家自己的外观（跟随 / 独立）+ 一键统一
   ------------------------------------------------------------
     node src/tools/probes/gate-look46.mjs
   量的是四件事：① 名单（只有声笔练习那一家不列 —— 它被 test-rplook 钉着不许有自己的外观）；
   ② 独立那一家真的把那一套写在自己那张卡上、没挑的一家一个字都不写（"不下发"就是这么实现的：
     主程序换主题写根元素，卡上那份盖在上面）；③ 一套方案只算一次：卡片那一条和封面里那一条
     （为写那一层）吃的是同一颗算出来的东西；④ 一键统一之前列得清"哪几家跟着、哪几家跳过"。
   那颗 PackLooks 整份从 fd3-shell.js 切出来端进假页面跑（假元素记每一次 setProperty），
   为写那一层的 Theme 也整份从 w2-theme.js 切出来端进假表跑 —— 跑的确实是那两份代码，不是抄的第二份。
   反证三条：把"没挑就回 false"那道闸摘掉，没挑的一家也会被打上变量；把存档那条"空的一节不写进文件"
   摘掉，存档里就挂一堆没挑过的家；把为写那一句"先问那张表"摘掉，它在主程序已经换了之后还吃宿主的色。
   ============================================================ */
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-look46');
/* 为写那一份代码里 radius() 吃同文件顶上那颗 clampR、read() 吃那颗 parseHex：
   端进假页面跑就要连这两颗一起递，且用源码里那两句一模一样的算式，不在这头重编一份 */
const clampR = n => Math.max(0, Math.min(30, Math.round(+n || 0)));
const parseHex = s => { const m = /^#([0-9a-f]{6})$/i.exec(String(s).trim());
  return m ? { r:parseInt(m[1].slice(0, 2), 16), g:parseInt(m[1].slice(2, 4), 16), b:parseInt(m[1].slice(4, 6), 16) } : null; };
/* 切出来的一段是「const Theme = {...};」这种声明，端进 new Function 得当表达式 */
function 当对象(文){
  return String(文).replace(/^\s*(?:const|let|var)\s+[\w$]+\s*=\s*/, '').replace(/;\s*$/, '');
}
const 壳 = rd('src/_fd/src/fd3-shell.js');
const 屏 = rd('src/_fd/src/fd4-builtin.js');
const 为写 = rd('src/_wnw/src/w3-shell.js');
const 为写皮 = rd('src/_wnw/src/w2-theme.js');

const 一套 = { 方案名:'甲案', 配色:'红', 外观模式:'质感', texKey:'', 纹理:'无', 纹理用法:'直接使用',
  卡片圆角:9, 控件圆角:4, 字体:'宋体', 字重:'' };
const 两套 = [一套, { 方案名:'乙案', 配色:'绿', 外观模式:'质感', texKey:'', 纹理:'无', 纹理用法:'直接使用',
  卡片圆角:2, 控件圆角:3, 字体:'', 字重:'' }];

/* ---------- 假页面：只垫 PackLooks 用到的那几样 ---------- */
function 假元素(){
  const 写 = {};
  return { style:{ setProperty:(k, v) => { 写[k] = v; } }, dataset:{ }, 写 };
}
function 假壳(表, 方案, 家){
  const 环 = {
    重画:0, 播:0,
    LookStore:{ data:{ packs:表, look:{} }, defaults:{ radiusCard:5, radiusCtl:5, mode:'material', tex:'', texGray:false, font:'', weight:'' }, save(){ 环.存了 = (环.存了 || 0) + 1; } },
    Packs:{ list:() => (家 || ['notes', 'schedule', 'why-not-write', 'singbit-input-practice', 'music-remote']).map(id => ({ id, name:id })) },
    PackOps:{ forHost:() => true },
    LookLib:{ list:方案 || 两套 },
    Palette:{ items:[{ name:'红', mode:'dark', id:'p红' }, { name:'绿', mode:'light', id:'p绿' }] },
    tokensOf:e => ({ tokens:{ '--card-bg-2':e && e.name === '绿' ? '#efe' : '#111', '--text-1':'#eee',
      '--page-bg':e && e.name === '绿' ? '#fafafa' : '#101010', '--card-bg':e && e.name === '绿' ? '#fff' : '#1b1b1b',
      '--accent':'#c33', '--text':'#222' } }),
    mingPoolOf:e => !e ? '' : (e.mode === 'dark' ? 'dark' : e.mode === 'light' ? 'light' : ''),
    方案成cfg:s => ({ mode:'material', tex:'', texGray:false, radiusCard:s.卡片圆角, radiusCtl:s.控件圆角,
      font:s.字体 || '', weight:s.字重 || '' }),
    clampRadius:n => Math.max(0, Math.min(30, Number(n) || 0)),
    Look:{ dark:() => false, readable:() => null, vars:() => ({ '--card-face':'#222', '--card-border':'#333' }),
      eff:() => ({ mode:{ k:'material' }, tex:'' }) },
    Theme:{ applied:{ '--page-bg':'#000' }, pushToFrames(){ 环.播++; } },
    Shell:{ render(){ 环.重画++; } },
  };
  const 码 = 切(壳, '外观不接的名单') + '\n' + 切(壳, 'PackLooks') + '\nreturn PackLooks;';
  const 名 = Object.keys(环);
  环.P = new Function(...名, 码)(...名.map(k => 环[k]));
  return 环;
}
const 拿 = 环 => 环.P;

/* ---------- 为写那一层的 Theme：整份切出来，端进一张假表跑 ---------- */
function 假为写(格, 环){
  const 元 = { style:{ setProperty:(k, v) => { 元.写[k] = v; } }, dataset:{ }, 写:{} };
  const 播 = [];
  const 表 = {
    表:格 || {}, 名:环 && 环.名 || 两套,
    挑的(包){ const 格 = this.表[包]; return (格 && 格.案) || ''; },
    算一份(包){ const 案 = this.挑的(包); const s = this.名.find(x => x.方案名 === 案); if(!s) return null;
      return { 案:s.方案名, 名:s.方案名, 色:{ name:s.配色, mode:s.配色 === '绿' ? 'light' : 'dark' },
        明暗:s.配色 === '绿' ? 'light' : 'dark', dark:s.配色 !== '绿',
        角:{ card:s.卡片圆角, ctl:s.控件圆角 }, 模式:'material', 纹理:'none',
        表:{ '--page-bg':'#f00', '--card-bg':'#0f0', '--indep':'独立那份' } }; },
    定(包, 案){ if(案) this.表[包] = { 案 }; else delete this.表[包]; },
    改(包, 案){ this.定(包, 案); 播.push(案); },
    名单(){ return this.名.map(s => ({ 案:s.方案名, 名:s.方案名, 明暗:s.配色 === '绿' ? 'light' : 'dark',
      色:{ name:s.配色, mode:s.配色 === '绿' ? 'light' : 'dark' }, 预览:{ bg:'#f00', card:'#0f0', accent:'#33f', text:'#222' } })); },
  };
  const 身 = 当对象(切(为写皮, 'Theme'));
  const 造 = new Function('PackLooks', 'State', 'Bus', 'Fonts', 'Ff', 'toast', 'window', 'wnwOn', 'wnwRoot',
    'icodeRetone', 'fdPalette', 'getComputedStyle', 'mingNearest', 'MING_NAME', 'performance', 'clampR', 'parseHex',
    'return (' + 身 + ');');
  const T = 造(表, { get:async () => null, set(){ }, }, { on(){ }, emit(){ }, }, { merge(){ }, },
    { apply(){ } }, () => { }, { }, () => { }, () => 元, () => { },
    () => ({ id:'host', tokens:{ '--page-bg':'#000' }, radius:{ card:6, ctl:7 }, font:'' }),
    () => ({ getPropertyValue:() => '#ffffff' }),
    (items, cur, md) => (items || []).find(e => e.mode === md) || null, { light:'明亮', dark:'黑暗' },
    { now:() => 0 }, clampR, parseHex);
  /* 宿主播来的那一份先认下（真机里是 init 调 fdPalette() 拿首帧，再等 postMessage 播增量；
     这台不开整条启动流程，就把那一份直接认给它 —— 测的是"表里没挑时吃谁的颜色"这一句） */
  T.fd = { id:'host', tokens:{ '--page-bg':'#000' }, radius:{ card:6, ctl:7 }, font:'' };
  return { T, 元, 播, 格 };
}

台.题('一、名单：只有声笔练习那一家不列（为写 2026-10-16 迁进这张表，他点的是「统一一只口」）');
{
  const P = 拿(假壳({}));
  台.判('可挑的名单里没有 singbit-input-practice，其余加载着的都在 —— 含 why-not-write',
    !P.可挑().some(m => m.id === 'singbit-input-practice')
    && P.可挑().some(m => m.id === 'notes') && P.可挑().some(m => m.id === 'music-remote')
    && P.可挑().some(m => m.id === 'why-not-write'), P.可挑().map(m => m.id).join('、'));
  台.判('注册名 → 包 id：工具那一族认得 tool- 头，为写那一家认得上（迁进来之前它回空），名单外的一家仍回空',
    P.包of('tool-music-remote') === 'music-remote' && P.包of('notes') === 'notes'
    && P.包of('tool-why-not-write') === 'why-not-write' && P.包of('没这一家') === '');
  台.判('那张表里为写占的就是「why-not-write」这一格（和插件清单、出厂布局那张表同一个名字）',
    (() => { const 格 = {}; 拿(假壳(格)).定('why-not-write', '甲案'); return 格['why-not-write'].案 === '甲案'; })());
}

台.题('二、独立那一家写在自己卡上；没挑的一家一个字都不写');
{
  const 表 = {};
  const P = 拿(假壳(表));
  const 甲 = 假元素();
  台.判('没挑的一家：画到 回 false，且那棵上没写进任何一条变量',
    P.画到(甲, 'notes') === false && Object.keys(甲.写).length === 0 && !甲.dataset.mode, JSON.stringify(甲.写));
  P.定('notes', '甲案');
  台.判('定一套就进表、独立名单里有它；回到跟随（空名）就把那一格整条撤掉，不留 {案:""} 那种空壳',
    表.notes.案 === '甲案' && P.独立().join() === 'notes'
    && (P.定('notes', ''), !('notes' in 表) && P.独立().length === 0));
  P.定('notes', '甲案');
  const 乙 = 假元素();
  const 成 = P.画到(乙, 'notes');
  台.判('挑了一套的一家：配色那份 + 观感那份 + 两档圆角都写在这棵上，dataset 三样跟着钉；字体那一档不在这儿（全站只一个出口 + 卡片那颗钮）',
    成 === true && 乙.写['--card-bg-2'] === '#111' && 乙.写['--card-face'] === '#222'
    && 乙.写['--radius-card'] === '9px' && 乙.写['--radius'] === '4px' && 乙.写['--r-card'] === '9px'
    && 乙.写['--r-btn'] === '4px' && !('--fd-font' in 乙.写) && !('--fd-weight' in 乙.写)
    && 乙.dataset.mode === 'material' && 乙.dataset.dark === '1', JSON.stringify(乙.写).slice(0, 160));
  台.判('深浅吃的是那套方案点名的那一池（配色那张卡是深色就报深色），不吃主程序当前那一轴',
    乙.dataset.dark === '1');
  台.判('方案被删了：生效回空、画到 回 false —— 当跟随走，不摆一句错',
    (() => { const Q = 拿(假壳({ notes:{ 案:'早删了的那套' } })); const 丙 = 假元素();
      return Q.生效('notes') === null && Q.画到(丙, 'notes') === false && Object.keys(丙.写).length === 0; })());
}

台.题('三、一套方案只算一次：卡片那一条与封面里那一条吃同一颗');
{
  const P = 拿(假壳({ 'why-not-write':{ 案:'甲案' }, notes:{ 案:'乙案' } }));
  const 份 = P.算一份('why-not-write');
  const 卡 = 假元素(); P.画到(卡, 'why-not-write');
  台.判('算一份 出来的那份变量表，与画到 一家卡时逐条写下去的那一份一模一样（一处算、两处吃，没有第二份算法）',
    !!份 && Object.keys(份.表).every(k => 卡.写[k] === 份.表[k])
    && Object.keys(卡.写).length === Object.keys(份.表).length, Object.keys(份.表).join(',').slice(0, 90));
  台.判('算一份 带齐界面要用的那几样：方案名、归哪一池、两档圆角、外观模式、纹理、深浅、四块预览色',
    份.案 === '甲案' && 份.明暗 === 'dark' && 份.角.card === 9 && 份.角.ctl === 4
    && 份.模式 === 'material' && 份.dark === true && 份.预览 && 份.预览.bg && 份.纹理 === 'none');
  台.判('没挑的一家：算一份 回空（不是回一份空壳），跟随就照着这个判',
    P.算一份('schedule') === null && P.算一份('notes') !== null);
  台.判('名单() 一家一套方案一项、带名字与池子（为写那份配色名单列的就是这一份，不再列它自己那一份池）',
    (() => { const 名 = P.名单(); return 名.length === 2 && 名.every(e => e.案 && e.名 && e.明暗 && e.预览)
      && 名.map(e => e.案).join() === '甲案,乙案'; })(), JSON.stringify(P.名单().map(e => e.案 + '/' + e.明暗)));
  台.判('改(包,案) 这一只口做三件事：落账、重画桌面、把新值播给封面里那一层（外观那一屏与为写设置两处点的是它）',
    (() => { const 格 = {}; const 环 = 假壳(格); const Q = 拿(环); Q.改('notes', '甲案');
      const 写了 = 格.notes && 格.notes.案 === '甲案';
      Q.改('notes', ''); return 写了 && 环.重画 === 2 && 环.播 === 2 && !('notes' in 格); })());
}

台.题('四、为写那一层读的就是这张表（它自己那份账退了）');
{
  const { T, 元 } = 假为写({ 'why-not-write':{ 案:'甲案' } });
  T.apply();
  台.判('表里给它挑了一套：它把那一套的变量写在自己那一层上（这一层在封面里，卡上那份继承不过来）',
    元.写['--indep'] === '独立那份' && 元.dataset.mode === 'material' && 元.dataset.dark === '1', JSON.stringify(元.写));
  台.判('跟着那一套的圆角走（不是宿主全局那两档）：方案写 9 / 4，它这一层就钉 9px / 4px',
    元.写['--r-card'] === '9px' && 元.写['--r-btn'] === '4px' && 元.写['--radius'] === '4px', JSON.stringify(元.写));
  const { T:乙, 元:乙元 } = 假为写({});
  乙.apply();
  台.判('表里没给它挑（跟随）：吃宿主播来的那一份，而且把独立时钉的那三记 data 撤干净，不留一张跨池的旧皮',
    乙元.写['--indep'] === undefined && 乙元.写['--page-bg'] === '#000'
    && 乙.follows() === true && !乙元.dataset.mode && !乙元.dataset.tex && !乙元.dataset.dark, JSON.stringify(乙元.写));
  台.判('它自己那一份账整条退了：这一层里不再有 cfg.follow / cfg.scheme / 自己的配色池 / 那颗往池里加东西的手，'
    + '留下的只有圆角那两档手调；读的那一句和写的那两句都点着「why-not-write」这一格',
    (() => { const 只代码 = 为写皮.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
      return !/this\.pool\b(?!Now)/.test(只代码) && !/cfg\.follow/.test(只代码) && !/cfg\.scheme/.test(只代码)
        && !/look-pool/.test(只代码) && !/record\s*\(/.test(只代码)
        && /PackLooks\.算一份\('why-not-write'\)/.test(只代码)
        && /PackLooks\.(定|改)\('why-not-write'/.test(只代码); })(),
    '扫的是去掉注释之后的代码（那两个旧名字出现在说明里是写给后面看代码的人的，不算还在用）');
  台.判('写也写这张表：挑一套走那只口点名一套方案，回到跟随走同一只口交空名；'
    + '关掉跟随那一刻落的是当前这一轴名单里的头一套（不留在"没有一套"的状态上）',
    (() => { const { T:丙, 播 } = 假为写({}); 丙.select('乙案'); 丙.setFollow(true);
      丙.setFollow(false); const 案 = 丙.案();
      return 播.join('|') === '乙案||甲案' && 案 === '甲案' && 丙.follows() === false; })(), '落笔顺序：乙案 → 跟随 → 甲案');
  台.判('明暗那一轴换了：独立正用的那套不归新的这一池，就地换成同池那一套并说一句，'
    + '换的那一笔也走同一只口（重画桌面 + 播回去，和用户点的是同一条路）；跟随的时候这一趟一个字都不写',
    (() => { const { T:丁, 播, 格 } = 假为写({ 'why-not-write':{ 案:'甲案' } });
      丁.mingCheck(true, 'light');
      const 换了 = 格['why-not-write'].案 === '乙案' && 播.join('|') === '乙案';
      const { T:戊, 播:戊播, 格:戊格 } = 假为写({}); 戊.mingCheck(true, 'light');
      return 换了 && 戊播.length === 0 && !('why-not-write' in 戊格); })());
  台.判('那份名单递给界面时把下拉的取值记上了（取值就是方案名，不另编一套号 —— 编了就等于第二份真相）',
    (() => { const { T:己 } = 假为写({}); const 名 = 己.poolNow();
      return 名.length === 2 && 名.every(e => e.id === e.案 && e.name === e.案 && e.预览)
        && 名.map(e => e.id).join() === '甲案,乙案'; })(), JSON.stringify((假为写({}).T.poolNow() || []).map(e => e.id)));
}

台.题('五、存档那一节：空的不落盘，与 look / marks 同一层');
{
  const slim = 切(壳, 'LookStore');
  台.判('appearance.json 里那一节叫 packs，落盘前把"没挑的一家"滤掉',
    /packs:Object\.fromEntries/.test(slim) && /格 && 格\.案/.test(slim));
  const 颗 = 切方法(壳, '  slim(d){');
  const 身 = 颗.slice(颗.indexOf('{') + 1, 颗.lastIndexOf('}')).replace(/this\.defaults/g, 'defaults');
  const 洗 = new Function('marksNorm', 'defaults', 'return function(d){' + 身 + '};')(x => x, { a:1 });
  const 出 = 洗.call({ data:{} }, { packs:{ notes:{ 案:'甲案' }, schedule:{}, your:{ 案:'' } }, marks:['x'] });
  台.判('真跑一遍：三家只有挑了的那一家进文件，另两家那种空壳不落盘',
    JSON.stringify(出.packs) === JSON.stringify({ notes:{ 案:'甲案' } }), JSON.stringify(出.packs));
}

台.题('六、外观屏那一块与那颗一键统一');
{
  台.判('那块在「外观」那一屏里（方案编辑那一页底下），一家一行、下拉里第一句是「跟随主程序」',
    屏.includes('PackLooks.可挑()') && 屏.includes("'跟随主程序'") && 屏.includes('LookLib.list.map'));
  台.判('按下去之前先列两句：跟着统一的有哪几家、跳过的有哪几家',
    屏.includes("'跟着统一的：'") && 屏.includes("'跳过的（自己挑了一套）：'"));
  台.判('跳过的那几家确实是独立那几家：循环里先问 PackLooks.挑的(包) 就 continue',
    /if\(!包 \|\| PackLooks\.挑的\(包\)\) continue;/.test(屏));
  台.判('统一那颗做的是一件事：把跟着那几家各自卡上钉过的字体收回（fontFollow 回真、font 清空），不碰布局与尺寸',
    /it\.fontFollow = true; it\.font = '';/.test(屏) && !/it\.w =|it\.h =|it\.x =|it\.y =/.test(屏.slice(屏.indexOf('const 统一'), 屏.indexOf('const 统一') + 2200)));
  台.判('挑完一套走的是那一只口（改），不在这一头自己拼第二套落账 + 重画',
    /onchange:ev => \{ PackLooks\.改\(m\.id, ev\.target\.value\);/.test(屏) && !/PackLooks\.定\(m\.id/.test(屏));
  台.判('为写那一处的两只手也走同一只口：勾那颗调 setFollow、名单那颗调 select，界面那一屏不再自己读 cfg.follow',
    为写.includes('Theme.setFollow(fol.checked)') && 为写.includes('e.id === Theme.案()')
    && !/Theme\.cfg\.follow/.test(为写) && !/Theme\.cfg\.scheme/.test(为写) && !/Theme\.pool\.length/.test(为写));
  台.判('为写那一屏上那颗「删掉这条配色」跟着退了：名单归主程序那份方案清单，从为写这一头删别人家的方案是越界',
    !/删掉这条配色/.test(为写) && !/Theme\.pool\s*=/.test(为写));
  /* 这一条是量出来的坑：方案 → cfg 那条换算若在 fd3-shell 里再写一遍，'去色' / '直接使用' 这类
     文件里的词面就被「改软件全部页面文字」那台小工具当界面句子扫进清单（4.3 那一轮撞过同一类）。 */
  台.判('方案 → cfg 那条换算只在一处（fd3-lib 那颗 方案成cfg），外壳这一头不抄第二份、也不把文件里的词面再写一遍',
    rd('src/_fd/src/fd3-lib.js').includes('function 方案成cfg(s)')
    && !/lookTexWay\(s\.纹理用法\)/.test(壳) && !/'去色'/.test(壳) && 壳.includes('方案成cfg(s)'));
}

台.题('七、反证三件（这三条不摘就没人知道上面那些是不是真在管事）');
{
  const 摘闸 = 切(壳, 'PackLooks').replace('if(!份){ return false; }', '');
  台.判('把"没挑就回 false"那道闸摘掉，没挑的一家也会被打上一份变量 —— 上面那条测的确实是这一道',
    (() => {
      const 环 = 假壳({});
      const P = new Function('LookStore', 'Packs', 'PackOps', 'LookLib', 'Palette', 'tokensOf', 'mingPoolOf', '方案成cfg',
        'clampRadius', 'Look', 'Theme', 'Shell',
        切(壳, '外观不接的名单') + '\n' + 摘闸 + '\nreturn PackLooks;')(
        环.LookStore, 环.Packs, 环.PackOps, 环.LookLib, 环.Palette, 环.tokensOf, 环.mingPoolOf, 环.方案成cfg,
        环.clampRadius, 环.Look, 环.Theme, 环.Shell);
      const 元 = 假元素();
      /* 摘掉那道闸之后有两种表现，都说明这道闸在管事：要么照样往下写（写坏一棵谁都没挑的卡），要么当场撞上空的方案 */
      try{ P.画到(元, 'notes'); return Object.keys(元.写).length > 0; }
      catch(e){ return /外观模式|配色|null|undefined|方案/.test(String((e && e.message) || e)); }
    })());
  台.判('存档那一条把 filter 摘掉就会把没挑的一家也写进文件（那一节立刻挂一堆空壳）',
    !/packs:Object\.fromEntries\(Object\.entries\(x\.packs \|\| \{\}\)\)\.filter/.test(
      切(壳, 'LookStore').replace(/\.filter\(\(\[, 格\]\) => 格 && 格\.案\)/, '')));
  台.判('把为写那一句"先问那张表"摘掉（算一份 永远回空），它就退回吃宿主的色 —— 第四节那两条测的确实是这一句在管事',
    (() => {
      const 换 = 切(为写皮, 'Theme').replace("PackLooks.算一份('why-not-write')", 'null');
      const 造 = new Function('PackLooks', 'State', 'Bus', 'Fonts', 'Ff', 'toast', 'window', 'wnwOn', 'wnwRoot',
        'icodeRetone', 'fdPalette', 'getComputedStyle', 'mingNearest', 'MING_NAME', 'performance', 'clampR', 'parseHex',
        'return (' + 当对象(换) + ');');
      const 元 = { style:{ setProperty:(k, v) => { 元.写[k] = v; } }, dataset:{ }, 写:{} };
      const T = 造({ 挑的:() => '甲案', 算一份:() => null, 名单:() => [], 定(){ }, 改(){ } },
        { get:async () => null, set(){ } }, { on(){ }, emit(){ } }, { merge(){ } }, { apply(){ } }, () => { },
        { }, () => { }, () => 元, () => { }, () => ({ tokens:{ '--indep':'宿主那份' }, radius:{ card:6, ctl:7 } }),
        () => ({ getPropertyValue:() => '#ffffff' }), items => items[0] || null, { light:'明亮', dark:'黑暗' },
        { now:() => 0 }, clampR, parseHex);
      T.fd = { tokens:{ '--indep':'宿主那份' }, radius:{ card:6, ctl:7 } };
      T.apply();
      return 元.写['--indep'] === '宿主那份';
    })());
}

台.题('八、界面那几句话不许是"缺失"那一类（2.7 同一把尺）');
{
  const 忌 = ['缺失', '没有内核', '未安装', '没装', '还没装', '装不回来'];
  const 新句 = 屏.split(/\r?\n/).filter(l => /跟随主程序|跟着统一的|跳过的（自己挑了一套）|改成独立用|回到跟随主程序|一键统一|自己钉过的字体收回|本来就跟着走/.test(l));
  const 撞 = 忌.filter(w => 新句.some(l => l.includes(w)));
  台.判('这一批新加的这几句里没有"缺失"那一类字样（那一家没加载就整行不列，不解释、不告错）',
    撞.length === 0 && 新句.length >= 6, 撞.join('、') + ' / 扫到 ' + 新句.length + ' 行');
  const 为写句 = 为写.split(/\r?\n/).filter(l => /已跟随 Flow-Desk 主外观|改用为写自己挑的那一套方案|这份名单和 Flow-Desk 外观那一屏|等你把跟随关掉|本池内抽的|没有可随机换的/.test(l));
  台.判('为写那一处改口的这几句里也没有"缺失"那一类字样，而且一句都不提"表""口""字段"这种内部话',
    撞.every(w => !为写句.some(l => l.includes(w)))
    && !为写句.some(l => /字段|表里|一只口|内存|存档/.test(l)) && 为写句.length >= 4, 为写句.length + ' 句');
}

台.收尾();
