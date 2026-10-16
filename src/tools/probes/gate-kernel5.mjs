/* ============================================================
   gate-kernel5.mjs · 插件分离第 5 批：首页那几张快捷方式不再为内核买单（2026-10-16 他点名的这一件）
   ------------------------------------------------------------
     node src/tools/probes/gate-kernel5.mjs
   他原话：「为写、输入法练习在首页的卡片都是快捷方式，推演定制因为和为写深度关联、也要迁移到为写内部开启了
   （挂在停靠栏），为什么首页还需要什么这三个的内核啊！」
   从前开机那一趟按各家插件清单上点名的 kernels 一份份注进来，注不进就走 fail(id) 立一张错误卡 ——
   那张错误卡把快捷方式整张顶掉，连卸载那颗钮一起没了（他截图上那三张就是这个样子）。
   这一台钉的四条：
     一 · 加载器那几颗（metaOf / 注内核 / 内核就绪 / 哪家带 / 请内核）端进 node 真跑：默认不注、点开才注、
        同一页不重注、注不进记一笔、下次再点还试；
     二 · 开机那一趟只为插件清单写了 kernelBoot 的那一家注（推演定制：用户自己做的组件靠那份代码登记上桌），
        注不进也只记一笔，不许把这一家抛成错误卡；
     三 · 宿主那三只把手（ctx.wnw / ctx.rp / ctx.wcustom）到用的时候先请内核，认窗口上那一份；
     四 · 上不上首页由各家插件清单自己说（home 那一格），主程序不点名；登记那一趟走到"不上首页"就收尾，
        错误卡上补一颗卸载。
   反证四件：把"注过的不重注"那句判反、把 kernelBoot 那道门拆掉、把 home 那一格当没写、
   把把手里那句请内核删掉 —— 各红对应那一条。
   ============================================================ */
import fs from 'node:fs';
import { rd, 切, 切方法, 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-kernel5');
const 载 = rd('src/_shared/sh-load.js');
const 答卷 = rd('src/_fd/src/fd5-load.js');
const 为写 = rd('src/_wnw/src/w3-shell.js');
const 绑定 = rd('src/_wnw/src/w5-load.js');

/* ---------- 一 · 加载器那几颗端出来真跑 ---------- */
function 端一台(opt){
  const o = opt || {};
  const 注 = [];                            /* 真注进来的每一颗：id/件名 */
  const 坏 = new Set(o.坏 || []);            /* 这一颗读不进来（模拟文件不在） */
  const 源 = o.改 ? o.改(载) : 载;
  const P = new Function('PACK_META', 'Bus', 'PackCtx', 'h', 'Packs', 'PackOps', 'document', 'window', 'console',
    切(源, 'sealDeep') + '\n' + 切(源, 'PackLoader') + '\nreturn PackLoader;')(
      o.表 || {}, { emit(){}, on(){ return () => {}; } }, { make:id => ({ id }) },
      () => ({ appendChild(){} }), { list:() => [], name:id => id },
      { can:() => true, unloadButton:() => null },
      { createElement:() => ({}), head:{ appendChild(){} } }, {}, { warn(){}, log(){} });
  P.script = async (id, 件名) => {
    const 键 = id + '/' + 件名;
    if(坏.has(键)) throw new Error('这一家的内核没读进来：' + 件名);
    注.push(键);
  };
  return { P, 注 };
}
const 清 = { 'why-not-write':{ id:'why-not-write', name:'为写', kernels:['wnw-kernel.js'], kernelBoot:false, home:true },
             'singbit-input-practice':{ id:'singbit-input-practice', name:'声笔输入法练习', kernels:['rp-kernel.js'], kernelBoot:false, home:true },
             'wnw-custom':{ id:'wnw-custom', name:'推演组件定制', kernels:['wnw-custom-kernel.js'], kernelBoot:true, home:false },
             'notes':{ id:'notes', name:'你的便签', kernels:[], kernelBoot:false, home:true } };

台.题('一 · 内核这一趟：默认不注、点开才注、注不进记一笔（加载器那五颗真跑）');
{
  const { P, 注 } = 端一台({ 表:JSON.parse(JSON.stringify(清)) });
  台.判('一家没点开之前，一份内核都没注（这一台里除了真叫过 注内核，没人注过东西）', 注.length === 0, 注.join('、'));
  await P.内核就绪('why-not-write');
  台.判('为写点开那一刻：它自己那一格里点名的那份注进来了', 注.join() === 'why-not-write/wnw-kernel.js', 注.join('、'));
  await P.请内核('wnw-kernel.js');
  台.判('同一页里同一份内核只注一次（kernelsDone 记着，跑两遍会把监听和统计挂成双份）', 注.length === 1, 注.join('、'));
  台.判('这份内核归哪一家是翻各家插件清单认出来的，宿主这一头不抄第二份名字',
    P.哪家带('rp-kernel.js') === 'singbit-input-practice' && P.哪家带('没有这一颗.js') === '',
    P.哪家带('rp-kernel.js') + ' / ' + (P.哪家带('没有这一颗.js') || '空'));
  await P.内核就绪('notes');
  台.判('没带内核的那一家：叫一声什么都发生不了（不注、不抛，便签那种就是一份代码一张卡）', 注.length === 1, 注.join('、'));
}
{
  /* 注不进来：记一笔、抛那一句给点下去那一下，不许把这一家整张卡顶掉 */
  const { P, 注 } = 端一台({ 表:JSON.parse(JSON.stringify(清)), 坏:['why-not-write/wnw-kernel.js'] });
  let 抛 = '';
  try{ await P.请内核('wnw-kernel.js'); }catch(e){ 抛 = e.message; }
  台.判('那份文件读不进来：请内核 抛的是"这一家的内核没读进来"那一句（报在点下去那一刻，不是卡面）',
    /内核没读进来：wnw-kernel\.js/.test(抛), 抛 || '没抛');
  台.判('账上记着是哪一家没注进来（插件管理要说得出为什么；这一家照样是快捷方式）',
    P.内核账.get('why-not-write') === 抛, [...P.内核账.keys()].join('、') || '没记');
  const { P:换一趟, 注:注新 } = 端一台({ 表:JSON.parse(JSON.stringify(清)) });
  await 换一趟.请内核('wnw-kernel.js');
  台.判('换一趟再点（刷新这一页）就从那份读不到的重来，不把一次失败当成永远', 注新.join() === 'why-not-write/wnw-kernel.js', 注新.join('、'));
}
{
  /* 反证：把「注过的不重注」那一句整颗拿掉 —— 上面那条"只注一次"立刻红 */
  const 改 = 文 => 文.replace('if(this.kernelsDone.has(键)) continue;', '');
  const { P, 注 } = 端一台({ 表:JSON.parse(JSON.stringify(清)), 改 });
  await P.内核就绪('why-not-write'); await P.内核就绪('why-not-write');
  台.判('反证 · 把「注过的不重注」那一句拿掉，同一份内核在同一页里跑了第二遍（监听和统计会挂成双份）—— 上面那条测的确实是这一句',
    注.length === 2, 注.join('、'));
}
{
  const { P } = 端一台();
  const 默认 = P.metaOf('demo', { name:' demo ' });
  台.判('插件清单没写 home 那一格 = 上首页（默认照旧），没写 kernelBoot = 点开才注',
    默认.home === true && 默认.kernelBoot === false && 默认.kernels.length === 0,
    'home=' + 默认.home + ' · kernelBoot=' + 默认.kernelBoot);
  const 特 = P.metaOf('wnw-custom', { name:'推演组件定制', home:false, kernelBoot:true, kernels:['wnw-custom-kernel.js'] });
  台.判('写了就算数，且这一格跟着冻透（一家不许运行时给自己改成上首页）',
    特.home === false && 特.kernelBoot === true && Object.isFrozen(特));
  const 抄 = P.metaOf('x', { name:'x', home:'yes' });
  台.判('反证 · home 那一格只认 false：写成别的（' + JSON.stringify(抄.home) + '）仍算上首页 —— 判据不是"有没有写这一格"',
    抄.home === true);
}

/* ---------- 二 · 开机那一趟 ---------- */
台.题('二 · 开机那一趟：只给写了 kernelBoot 的那一家注，注不进不掀桌');
{
  const 一 = 切方法(载, '  async one(id){');
  台.判('开机那一段带那道 kernelBoot 的门（快捷方式那几家不在这一趟注）',
    /if\(m\.kernelBoot && m\.kernels\.length\)/.test(一), 一.split(/\r?\n/).find(l => /kernelBoot/.test(l)) || '这一句没了');
  台.判('这一趟里不再有"照清单一份份注"的那个循环（搬进 注内核 那一颗了）',
    !/for\(const k of \(m\.kernels/.test(一), '一 里还有循环就是没搬干净');
  台.判('注不进只 .catch 记一笔，不许把它抛给外面那一层立错误卡', /await this\.注内核\(id\)\.catch\(/.test(一));
  台.判('门那一段排在 import 那份定义表之前（开机注的这一家，注册时那份代码已在）',
    一.indexOf('kernelBoot') >= 0 && 一.indexOf('kernelBoot') < 一.indexOf('await import(url)'));
  台.判('反证 · 把那道门拆掉（回到"开机一律注"），上面两条立刻红：循环回到 one 里、门不见了',
    (() => {
      const 老 = 一.replace(/if\(m\.kernelBoot && m\.kernels\.length\)\{/, 'if(1){')
        .replace(/await this\.注内核\(id\)\.catch\(e => \{[\s\S]*?\}\);/, 'for(const k of (m.kernels || [])){ await this.script(id, k); }');
      return !/if\(m\.kernelBoot/.test(老) && /for\(const k of \(m\.kernels/.test(老);
    })());
}

/* ---------- 三 · 三只把手 ---------- */
台.题('三 · 宿主递出去的三只把手：用时先请内核');
for(const [家, 颗, 件] of [['wnw', 'start', 'wnw-kernel.js'], ['rp', 'start', 'rp-kernel.js'], ['wcustom', 'open', 'wnw-custom-kernel.js']]){
  const 段 = new RegExp(家 + ':\\{[\\s\\S]*?\\n    \\}').exec(答卷);
  if(!段) throw new Error('fd5-load.js 里找不到 ' + 家 + ' 那一段（换了写法，这台要跟着改）');
  const 件样 = 件.replace(/[.]/g, '\\.');
  const 先请 = new RegExp('async\\s+' + 颗 + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]{0,140}await\\s+PackLoader\\.请内核\\(\\x27' + 件样 + '\\x27');
  台.判('ctx.' + 家 + '.' + 颗 + ' 先 await PackLoader.请内核（' + 件 + '），再认窗口上那一份',
    先请.test(段[0]), 段[0].split(/\r?\n/).find(l => l.includes(颗 + '(')) || '那一句没读到');
  台.判('反证 · ' + 家 + ' 那一段里把这句请内核删掉，上面那条立刻红（测的确实是这一句在不在）',
    !先请.test(段[0].replace(/PackLoader\.请内核\('[^']+'\);/g, '')));
}
{
  /* stop 这一头：内核没注过就没有在跑的东西，安静回来就行 —— 从前它抛那句"没读进来"，
     关上封面那一下会凭空冒出一条报错。 */
  const 段 = /wnw:\{[\s\S]*?\n    \}/.exec(答卷)[0];
  台.判('stop 不带那句抛：内核没注过时它安静回来（关封面那一下不该冒错）',
    /async stop\(\)\{ *if\(!window\.WNW_KERNEL\) return;/.test(段), 段.split(/\r?\n/).find(l => /stop\(\)/.test(l)) || '');
}

/* ---------- 四 · 上不上首页由各家自己说 ---------- */
台.题('四 · 首页摆不摆那张卡：插件清单自己说，主程序不点名');
{
  const 登 = 切方法(载, '  register(id, def, ctx){');
  台.判('登记那一趟认 home 那一格，且收尾在 type 分流之前（widget 与 tool 都不挂桌面）',
    /PACK_META\[id\]\.home === false\) return;/.test(登)
    && 登.indexOf('home === false') < 登.indexOf("if(type === 'tool')"), 登.split(/\r?\n/).find(l => /home/.test(l)) || '');
  台.判('反证 · 把这一句挪到 type 分流之后（先挂了卡再收尾），上面那条立刻红',
    (() => { const 老 = 登.replace(/\s*\/\*[\s\S]*?\*\/\s*if\(PACK_META\[id\]\.home === false\) return;/, '')
      .replace("if(type === 'tool') registerTool(def);", "if(type === 'tool') registerTool(def);\n    if(PACK_META[id].home === false) return;");
      return 老.indexOf('home === false') > 老.indexOf("if(type === 'tool')"); })());
  台.判('那几家自己点名：只有推演定制写了 home:false（为写与声笔输入法练习照旧上首页，只是不开机注内核）',
    (() => {
      const 读 = id => JSON.parse(fs.readFileSync(ROOT + 'data/plugins/' + id + '/manifest.json', 'utf8'));
      const 不上的 = ['notes', 'schedule', 'your-sentences', 'music-remote', 'singbit-input-practice', 'why-not-write', 'wnw-custom']
        .filter(id => 读(id).home === false);
      return 不上的.join() === 'wnw-custom' && 读('wnw-custom').kernelBoot === true
        && 读('why-not-write').kernelBoot === undefined && 读('singbit-input-practice').kernelBoot === undefined;
    })(), '看报的那一句');
  台.判('推演定制那个入口挂在为写的停靠栏这一层（登记成为一个功能，名字与插件清单那一格同名）',
    /if\(typeof GenReg !== 'undefined' && GenReg\.有向导\(\)\) registerTool\(\{/.test(为写));
  台.判('同名的配方顶不掉这一格（为写自己先占的名字，补登那一趟跳过）',
    /if\(Tools\.has\(id\)\) continue;/.test(绑定));
}

/* ---------- 五 · 错误卡上那颗卸载 ---------- */
台.题('五 · 真出错那张卡也带着卸载那颗钮');
{
  const 卡 = 切方法(载, '  errCard(id, msg, 哪一句){');
  台.判('卡上有 PackOps.unloadButton（这一家是自己那一格，就地撤得掉，不必换一屏）',
    /PackOps\.unloadButton\(id/.test(卡), 卡.split(/\r?\n/).find(l => /unloadButton/.test(l)) || '没这颗');
  台.判('没那层桥（本地开发那台服务器）才退回那句指插件管理的话，两种写法不同时摆',
    /撤 \? /.test(卡) && /要撤它就去插件管理那一屏卸载/.test(卡));
  台.判('那颗按钮摆得出来才改口（摆不出来时那句指路的话仍在）',
    /typeof PackOps !== 'undefined' && typeof PackOps\.can === 'function' && PackOps\.can\(\)/.test(卡));
}

台.收尾();
