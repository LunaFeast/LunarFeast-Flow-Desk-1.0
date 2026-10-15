/* ============================================================
   gate-look46.mjs · 插件分离第 4 批 4.4：每一家自己的外观（跟随 / 独立）+ 一键统一
   ------------------------------------------------------------
     node src/tools/probes/gate-look46.mjs
   量的是三件事：① 名单（为写与声笔练习那两家不列，2026-10-16 定的）；
   ② 独立那一家真的把那一套写在自己那张卡上、没挑的一家一个字都不写（"不下发"就是这么实现的：
     主程序换主题写根元素，卡上那份盖在上面）；③ 一键统一之前列得清"哪几家跟着、哪几家跳过"，
   并且跳过的确实是独立那几家。
   那颗 PackLooks 整份从 fd3-shell.js 切出来端进假页面跑（假元素记每一次 setProperty），
   所以跑的确实是那一份代码，不是抄的第二份。反证两条：把"没挑就回 false"那道闸摘掉，
   没挑的一家也会被打上变量；把存档那一条"空的一节不写进文件"摘掉，存档里就挂一堆没挑过的家。
   ============================================================ */
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-look46');
const 壳 = rd('src/_fd/src/fd3-shell.js');
const 屏 = rd('src/_fd/src/fd4-builtin.js');
const 为写 = rd('src/_wnw/src/w3-shell.js');

/* ---------- 假页面：只垫 PackLooks 用到的那几样 ---------- */
function 假元素(){
  const 写 = {};
  return { style:{ setProperty:(k, v) => { 写[k] = v; } }, dataset:{ }, 写 };
}
function 假壳(表, 方案, 家){
  const 环 = {
    LookStore:{ data:{ packs:表, look:{} }, defaults:{ radiusCard:5, radiusCtl:5, mode:'material', tex:'', texGray:false, font:'', weight:'' }, save(){ 环.存了 = (环.存了 || 0) + 1; } },
    Packs:{ list:() => (家 || ['notes', 'schedule', 'why-not-write', 'singbit-input-practice', 'music-remote']).map(id => ({ id, name:id })) },
    PackOps:{ forHost:() => true },
    LookLib:{ list:方案 || [{ 方案名:'甲案', 配色:'红', 外观模式:'质感', texKey:'', 纹理:'无', 纹理用法:'直接使用',
                                卡片圆角:9, 控件圆角:4, 字体:'宋体', 字重:'' }] },
    Palette:{ items:[{ name:'红', mode:'dark', id:'p红' }] },
    tokensOf:() => ({ tokens:{ '--card-bg-2':'#111', '--text-1':'#eee' } }),
    方案成cfg:s => ({ mode:'material', tex:'', texGray:false, radiusCard:s.卡片圆角, radiusCtl:s.控件圆角,
                        font:s.字体 || '', weight:s.字重 || '' }),
    clampRadius:n => Math.max(0, Math.min(30, Number(n) || 0)),
    Look:{ dark:() => false, readable:() => null, vars:() => ({ '--card-face':'#222', '--card-border':'#333' }),
           eff:() => ({ mode:{ k:'material' }, tex:'' }) },
    Theme:{ applied:{ '--page-bg':'#000' } },
  };
  const 码 = 切(壳, '外观不接的两家') + '\n' + 切(壳, 'PackLooks') + '\nreturn PackLooks;';
  return new Function(...Object.keys(环), 码)(...Object.values(环));
}

台.题('一、名单：那两家不列（为写维持自己那一份、声笔练习被探针钉着不许有自己的外观）');
{
  const P = 假壳({}, null);
  台.判('可挑的名单里没有 why-not-write 与 singbit-input-practice（其余加载着的都在）',
    !P.可挑().some(m => m.id === 'why-not-write') && !P.可挑().some(m => m.id === 'singbit-input-practice')
    && P.可挑().some(m => m.id === 'notes') && P.可挑().some(m => m.id === 'music-remote'),
    P.可挑().map(m => m.id).join('、'));
  台.判('注册名 → 包 id：工具那一族认得 tool- 头，名单外的一家回空',
    P.包of('tool-music-remote') === 'music-remote' && P.包of('notes') === 'notes'
    && P.包of('tool-why-not-write') === '' && P.包of('没这一家') === '');
}

台.题('二、独立那一家写在自己卡上；没挑的一家一个字都不写');
{
  const 表 = {};
  const P = 假壳(表, null);
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
    (() => { const Q = 假壳({ notes:{ 案:'早删了的那套' } }, null); const 丙 = 假元素();
      return Q.生效('notes') === null && Q.画到(丙, 'notes') === false && Object.keys(丙.写).length === 0; })());
}

台.题('三、存档那一节：空的不落盘，与 look / marks 同一层');
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

台.题('四、外观屏那一块与那颗一键统一');
{
  台.判('那块在「外观」那一屏里（方案编辑那一页底下），一家一行、下拉里第一句是「跟随主程序」',
    屏.includes('PackLooks.可挑()') && 屏.includes("'跟随主程序'") && 屏.includes('LookLib.list.map'));
  台.判('按下去之前先列两句：跟着统一的有哪几家、跳过的有哪几家',
    屏.includes("'跟着统一的：'") && 屏.includes("'跳过的（自己挑了一套）：'"));
  台.判('跳过的那几家确实是独立那几家：循环里先问 PackLooks.挑的(包) 就 continue',
    /if\(!包 \|\| PackLooks\.挑的\(包\)\) continue;/.test(屏));
  台.判('统一那颗做的是一件事：把跟着那几家各自卡上钉过的字体收回（fontFollow 回真、font 清空），不碰布局与尺寸',
    /it\.fontFollow = true; it\.font = '';/.test(屏) && !/it\.w =|it\.h =|it\.x =|it\.y =/.test(屏.slice(屏.indexOf('const 统一'), 屏.indexOf('const 统一') + 2200)));
  台.判('挑完一套当场重画桌面（不重画就是"文件写了、屏幕上没变"那一类）',
    /PackLooks\.定\(m\.id, ev\.target\.value\); Shell\.render\(\);/.test(屏));
  台.判('为写那一棵不读 PackLooks（它那份 w2-theme 维持现状，主程序这份表不接管）',
    !/PackLooks/.test(为写) && !rd('src/_wnw/src/w2-theme.js').includes('PackLooks'));
  /* 这一条是量出来的坑：方案 → cfg 那条换算若在 fd3-shell 里再写一遍，'去色' / '直接使用' 这类
     文件里的词面就被「改软件全部页面文字」那台小工具当界面句子扫进清单（4.3 那一轮撞过同一类）。 */
  台.判('方案 → cfg 那条换算只在一处（fd3-lib 那颗 方案成cfg），外壳这一头不抄第二份、也不把文件里的词面再写一遍',
    rd('src/_fd/src/fd3-lib.js').includes('function 方案成cfg(s)')
    && !/lookTexWay\(s\.纹理用法\)/.test(壳) && !/'去色'/.test(壳) && 壳.includes('方案成cfg(s)'));
}

台.题('五、反证两件（这两条不摘就没人知道上面那些是不是真在管事）');
{
  const 摘闸 = 切(壳, 'PackLooks').replace('if(!s){ return false; }', '');
  台.判('把"没挑就回 false"那道闸摘掉，没挑的一家也会被打上一份变量 —— 上面那条测的确实是这一道',
    (() => {
      const 环 = new Function('LookStore', 'Packs', 'PackOps', 'LookLib', 'Palette', 'tokensOf', '方案成cfg',
        'clampRadius', 'Look', 'Theme',
        切(壳, '外观不接的两家') + '\n' + 摘闸 + '\nreturn PackLooks;');
      const P = 环({ data:{ packs:{} }, defaults:{} }, { list:() => [{ id:'notes' }] }, { forHost:() => true },
        { list:[] }, { items:[] }, () => ({ tokens:{} }),
        s => ({ mode:'material', tex:'', texGray:false, radiusCard:s.卡片圆角, radiusCtl:s.控件圆角, font:'', weight:'' }),
        n => n,
        { dark:() => false, readable:() => null, vars:() => ({ '--x': '1' }), eff:() => ({ mode:{ k:'material' }, tex:'' }) },
        { applied:{} });
      const 元 = 假元素();
      /* 摘掉那道闸之后有两种表现，都说明这道闸在管事：要么照样往下写（写坏一棵谁都没挑的卡），要么当场撞上空的方案 */
      try{ P.画到(元, 'notes'); return Object.keys(元.写).length > 0; }
      catch(e){ return /外观模式|配色|null|undefined/.test(String((e && e.message) || e)); }
    })());
  台.判('存档那一条把 filter 摘掉就会把没挑的一家也写进文件（那一节立刻挂一堆空壳）',
    !/packs:Object\.fromEntries\(Object\.entries\(x\.packs \|\| \{\}\)\)\.filter/.test(
      切(壳, 'LookStore').replace(/\.filter\(\(\[, 格\]\) => 格 && 格\.案\)/, '')));
}

台.题('六、界面那几句话不许是"缺失"那一类（2.7 同一把尺）');
{
  const 忌 = ['缺失', '没有内核', '未安装', '没装', '还没装', '装不回来'];
  const 新句 = 屏.split(/\r?\n/).filter(l => /跟随主程序|跟着统一的|跳过的（自己挑了一套）|改成独立用|回到跟随主程序|一键统一|自己钉过的字体收回|本来就跟着走/.test(l));
  const 撞 = 忌.filter(w => 新句.some(l => l.includes(w)));
  台.判('这一批新加的这几句里没有"缺失"那一类字样（那一家没加载就整行不列，不解释、不告错）',
    撞.length === 0 && 新句.length >= 6, 撞.join('、') + ' / 扫到 ' + 新句.length + ' 行');
}

台.收尾();
