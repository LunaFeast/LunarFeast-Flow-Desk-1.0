/* ============================================================
   gate-layout46.mjs · 插件分离第 4 批 4.1：布局 = 静态储存（主程序那张出厂布局表）+ 动态询问（问插件最小要多大）
   ------------------------------------------------------------
     node src/tools/probes/gate-layout46.mjs
   这一台管的两件事：
     ① 那张「出厂布局」表确实住在主程序那一头，而且此刻一格数值都没填（他 2026-10-16 定的那一版：先不设计数值）；
        七家自己定义里那七对默认尺寸确实从插件那头撤干净了 —— 数不许两头各存一份。
     ② 摆放那一条优先级（表 → 这一家自己递上来的默认尺寸 → 问来的最小尺寸 → 主程序兜底）真的按这个次序生效，
        而且"问最小"是每次落位现问的，不是开机读一次钉死的。
   怎么算真量：不抄第二份算法 —— 用 lib-slice 那把尺从 src/_fd/src/fd3-shell.js 里把 问最小 / 问摆放 / fits /
   firstFit / rect / hits 六颗原文切出来，端进一台假注册表 + 假桌面，再拿真函数跑。
   三件反证钉住这台不是橡皮章：① 把优先级里"表"和"这一家自己那份"调换位置，表下发那一条必须红；
   ② 把问最小里那颗动态问答摘掉，动态答那一条必须红；③ 表里填了数却没人吃，也算这台自己坏了。
   红线那四样（网格吸附、拖拽、四角缩放、展开模式）第五节只验一件事：这批改完之后它们还在原位、还是原来那颗下限。
   ============================================================ */
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-layout46');
const 壳源 = rd('src/_fd/src/fd3-shell.js');
const 七家 = ['notes', 'schedule', 'your-sentences', 'why-not-write', 'singbit-input-practice', 'wnw-custom', 'music-remote'];

/* ---------- 把主程序那六颗原文端进假桌面（尺寸与坐标的算术都在这几颗里，一台都不许另写） ---------- */
const 六颗 = ['  问最小(def){', '  问摆放(卡名){', '  fits(rect, self){', '  firstFit(w, h){', '  rect(it){', '  hits(a, b){']
  .map(头 => 切方法(壳源, 头));
const 格子 = new Function(切(壳源, 'GRID_COLS') + '\nreturn { GRID_COLS, GRID_ROWS };')();
function 造机(表, 注, 已在){
  const 机 = new Function('出厂布局', 'Registry', 'GRID_COLS', 'GRID_ROWS', 'return ({' + 六颗.join(',') + '});')
    (表, 注, 格子.GRID_COLS, 格子.GRID_ROWS);
  机.layout = { items: 已在 || [] };
  return 机;
}

台.题('一、那张表住在主程序，且此刻一格数值都没填（他定的是"先不设计数值"）');
const 表源 = 切(壳源, '出厂布局');
const 表行 = [...表源.matchAll(/\['([a-z-]+)',\s*\{([^}]*)\}\]/g)];
/* 上不上首页由各家插件清单自己说（home 那一格，默认上）：推演定制 2026-10-16 起写了 home:false，
   它的入口挂进为写那台工作台的停靠栏，主程序这张表就不给它一行。这里量的是盘上那七份清单，不抄名单。 */
const 插件清单 = id => JSON.parse(rd('data/plugins/' + id + '/manifest.json'));
const 上首页 = 七家.filter(id => 插件清单(id).home !== false);
const 不上首页 = 七家.filter(id => 插件清单(id).home === false);
台.数('七家里今天有几家上首页 / 几家不上', 上首页.length + '/' + 不上首页.length);
台.判('出厂布局那张表在 src/_fd/src/fd3-shell.js 里，上首页的各家各一行（表里 ' + 表行.length + ' 行，上首页 ' + 上首页.length + ' 家）',
  表行.length === 上首页.length && 上首页.every(id => 表行.some(r => r[1] === id)), 表行.map(r => r[1]).join('、'));
台.判('反证：假装插件清单上没写过 home 那一格（当成七家都上首页），上面那条"各一行"立刻对不上 —— 这张表跟着各家插件清单走，不是谁拍的一行数',
  表行.length !== 七家.length);
台.判('不上首页那几家（现在就是推演定制）在主程序这张表里一名不剩',
  不上首页.every(id => !表行.some(r => r[1] === id)), 不上首页.join('、'));
const 填了 = 表行.filter(r => /(?:w|h|x|y):\s*[0-9]/.test(r[2]));
台.判('数值那一栏一格都没填（w / h / x / y 全是 null —— 他还没设计，谁都不许先替他填）',
  填了.length === 0, 填了.map(r => r[1]).join('、'));
台.判('那张表只有一处真身（插件那七份里不许出现第二张表；注释里指着主程序那一张说"归它管"是引用，不算第二份）',
  七家.every(id => !/出厂布局\s*=\s*new (Map|Set)/.test(rd('data/plugins/' + id + '/main.js'))));

台.题('二、插件那一头不再写默认尺寸（数不许两头各存一份）');
for(const id of 上首页){
  const 源 = rd('data/plugins/' + id + '/main.js');
  const 那行 = 源.split(/\r?\n/).filter(l => /minW\s*:/.test(l) && /minH\s*:/.test(l));
  台.判(id + ' 那份定义里 minW / minH 还在（那是它自己答的最小大小），声明这一行不再写 def:{w,h}',
    那行.length === 1 && !/def\s*:\s*\{/.test(那行[0]), 那行.join(' ⏎ '));
}
/* 不上首页的那几家反过来：那一对最小尺寸不用写 —— 主程序不会为一张不摆的卡来问"最小要多大"；
   定义里连 mount 都没有（登记那一趟走到"这一家不上首页"那句就收尾，那份 mount 没人叫）。 */
for(const id of 不上首页){
  const 源 = rd('data/plugins/' + id + '/main.js');
  台.判(id + ' 不上首页：那份定义里不写 minW / minH，也不写 mount',
    !/minW\s*:/.test(源) && !/mount\s*[:(]/.test(源));
  台.判(id + ' 的插件清单上 home 那一格确实写成 false（不是靠主程序点名把它撤下）',
    插件清单(id).home === false);
}
{
  const 还写 = 七家.filter(id => /def:\s*\{\s*w:/.test(rd('data/plugins/' + id + '/main.js')));
  台.判('七家里没有一家还留着默认尺寸那一对（一处不剩，不是"留在注释里交代一下"）', 还写.length === 0, 还写.join('、'));
}
{
  const 还写 = 七家.filter(id => /def:\s*\{\s*w:/.test(rd('data/plugins/' + id + '/main.js')));
  台.判('七家里没有一家还留着默认尺寸那一对（一处不剩，不是"留在注释里交代一下"）', 还写.length === 0, 还写.join('、'));
}

台.题('三、摆放那四档优先级真按这个次序走（拿切出来的真函数跑）');
{
  const 表 = new Map([['notes', { w:null, h:null, x:null, y:null }]]);
  const 注 = new Map([['notes', { minW:3, minH:3 }], ['tool-music-remote', { minW:10, minH:4 }]]);
  const 机 = 造机(表, 注, []);
  const 甲 = 机.问摆放('notes'), 乙 = 机.问摆放('tool-music-remote');
  台.判('表里没填数 → 问来的最小尺寸（便签答 3×3 就摆 3×3），位置交 firstFit 从左上角起',
    甲.w === 3 && 甲.h === 3 && 甲.x === 0 && 甲.y === 0, JSON.stringify(甲));
  台.判('工具那一族（名字带 tool-）也认表里那一行、也吃它自己答的最小大小（音乐遥控器 10×4）',
    乙.w === 10 && 乙.h === 4, JSON.stringify(乙));
}
{
  const 表 = new Map([['notes', { w:9, h:6, x:null, y:null }]]);
  const 注 = new Map([['notes', { minW:3, minH:3 }]]);
  const r = 造机(表, 注, []).问摆放('notes');
  台.判('表里填了 → 按下发的这一档走，不再吃问来的最小数（这就是"静态储存"那一半生效的样子）',
    r.w === 9 && r.h === 6, JSON.stringify(r));
}
{
  const 表 = new Map([['notes', { w:4, h:4, x:5, y:2 }]]);
  const 注 = new Map([['notes', { minW:3, minH:3 }]]);
  const 空 = 造机(表, 注, []).问摆放('notes');
  const 挤 = 造机(表, 注, [{ id:'占位', x:5, y:2, w:4, h:4 }]).问摆放('notes');
  台.判('表里点了位置且落得下 → 就摆在那一格', 空.x === 5 && 空.y === 2, JSON.stringify(空));
  台.判('表里点了位置可那一格已经占了 → 回退 firstFit 找空位，不许压到别人的卡上',
    !(挤.x === 5 && 挤.y === 2) && 挤.w === 4 && 挤.h === 4, JSON.stringify(挤));
}
{
  const 注 = new Map([['tool-我的推演', { def:{ w:12, h:5 }, minW:6, minH:5 }]]);
  const r = 造机(new Map(), 注, []).问摆放('tool-我的推演');
  台.判('表里没点名的那一家（推演定制现做的组件）吃它自己递上来的那一份默认尺寸 —— 用户在配方里写的数照旧生效',
    r.w === 12 && r.h === 5, JSON.stringify(r));
}
{
  const 注 = new Map([['空的一家', {}]]);
  const r = 造机(new Map(), 注, []).问摆放('空的一家');
  台.判('表没填、默认没写、最小也没答 → 落主程序自己那一对兜底 5×3，不许当成 1×1 摆一张邮票',
    r.w === 5 && r.h === 3, JSON.stringify(r));
}
{
  let 报 = { w:9, h:1 };
  const 注 = new Map([['动的', { minW:3, minH:3, minSize:() => 报 }]]);
  const 机 = 造机(new Map(), 注, []);
  const 先 = 机.问摆放('动的'); 报 = { w:2, h:8 }; const 后 = 机.问摆放('动的');
  台.判('写了 minSize() 的那一家是每次落位现问的（两次问答两档，第一档 9×1、第二档 2×8）',
    先.w === 9 && 先.h === 1 && 后.w === 2 && 后.h === 8, JSON.stringify([先, 后]));
  台.判('问最小：没答（minSize 与 minW/minH 两样都没有）就回没有，不许回 1×1 糊上去',
    造机(new Map(), new Map([['谁都没写', {}]]), []).问最小({}) === null
    && 造机(new Map(), new Map(), []).问最小({ minW:4, minH:2 }).w === 4);
}
{
  const 满桌 = [{ id:'占满', x:0, y:0, w:格子.GRID_COLS, h:格子.GRID_ROWS }];
  const 机 = 造机(new Map(), new Map([['notes', { minW:3, minH:3 }]]), 满桌);
  const r = 机.问摆放('notes');
  台.判('桌面一格空地都没有 → 问摆放 回没有（这一趟不摆，界面上那句"放不下这几张卡"归 补齐桌面卡 去说）',
    r === null, String(r));
}

台.题('四、三件反证（这台不许是橡皮章）');
{
  const 换序 = 六颗.map(文 => 文.replace('案.w || 默.w || 小.w', '默.w || 案.w || 小.w').replace('案.h || 默.h || 小.h', '默.h || 案.h || 小.h'));
  台.判('真源码里那句优先级确实是"表 → 自己那份 → 问来的"（不是别的次序）',
    /案\.w \|\| 默\.w \|\| 小\.w/.test(壳源) && /案\.h \|\| 默\.h \|\| 小\.h/.test(壳源));
  const 造 = new Function('出厂布局', 'Registry', 'GRID_COLS', 'GRID_ROWS', 'return ({' + 换序.join(',') + '});');
  const 机 = 造(new Map([['notes', { w:9, h:6, x:null, y:null }]]), new Map([['notes', { def:{ w:2, h:2 }, minW:3, minH:3 }]]),
    格子.GRID_COLS, 格子.GRID_ROWS);
  机.layout = { items:[] };
  const r = 机.问摆放('notes');
  台.判('把"表"和"自己那份默认尺寸"调换次序后，表下发那一条立刻失效（2×2 而不是 9×6）—— 说明第三节测的确实是那张表',
    r.w === 2 && r.h === 2, JSON.stringify(r));
  const 摘掉 = 六颗.map(文 => 文.replace("typeof def.minSize === 'function'", 'false'));
  const 机2 = new Function('出厂布局', 'Registry', 'GRID_COLS', 'GRID_ROWS', 'return ({' + 摘掉.join(',') + '});')
    (new Map(), new Map([['动的', { minW:3, minH:3, minSize:() => ({ w:9, h:1 }) }]]), 格子.GRID_COLS, 格子.GRID_ROWS);
  机2.layout = { items:[] };
  台.判('把动态问答那颗摘掉后，动态答的那一家立刻退回它写死的 3×3 —— 说明 minSize() 那一句真的在管事',
    机2.问摆放('动的').w === 3 && 机2.问摆放('动的').h === 3, JSON.stringify(机2.问摆放('动的')));
}

台.题('五、红线：吸附、拖拽、四角缩放、展开模式与"已有的卡不许自动动"');
{
  台.判('网格吸附那两颗还在原位（snapQ 那一口 1/(GRID_STEP*4) 与 snapDelta 的折格算法一字没动）',
    切(壳源, 'snapQ').includes('Math.max(1 / (GRID_STEP * 4)')
    && 切(壳源, 'snapDelta').includes('snapQ(步, cell) * Math.round(px / cell / snapQ(步, cell))'));
  const 拖 = 切方法(壳源, '  bindDrag(card, it, def){');
  台.判('拖拽那颗还在原位（长按 180 毫秒那道门槛没改）', /setTimeout\(begin, 180\)/.test(拖));
  const 缩 = 切(壳源, 'resizeRect');
  台.判('四角缩放的下限仍然吃插件自己答的那一对 minW / minH（这一批只把"默认占多大"挪走，下限没挪）',
    /Math.max\(minW, w \+ dx\)/.test(缩) && /Math.max\(minH, h \+ dy\)/.test(缩));
  台.判('展开模式那几颗还在原位（EXPAND_AREA 0.25、isExpanded 认 noExpanded、def.expand 那颗口、Cover 那一格）',
    切(壳源, 'EXPAND_AREA').includes('= .25')
    && 切(壳源, 'isExpanded').includes('!def.noExpanded && it.w * it.h >= GRID_COLS * GRID_ROWS * EXPAND_AREA')
    && 壳源.includes('def.expand(') && 切(壳源, 'Cover').length > 10);
  台.判('桌上已经有这一张卡就整行跳过 —— 补齐桌面卡 只补缺的那几家，不动任何一张已存在的卡',
    切方法(壳源, '  补齐桌面卡(){').includes('this.layout.items.some(it => it.widget === w)) continue'));
  台.判('重新落位那一趟（autoPlaceAll）只在"这张卡连个坐标都没有"的老布局上跑，正常开机不碰谁的 x/y/w/h',
    壳源.includes("if(this.layout.items.some(it => typeof it.x !== 'number')) this.autoPlaceAll();"));
  台.判('问摆放 的调用点只有两处（补缺卡那一趟 + 老布局重新落位那一趟）',
    (壳源.match(/this\.问摆放\(/g) || []).length === 2, (壳源.match(/this\.问摆放\(/g) || []).length + ' 处');
}

台.题('六、插件那头没有多出"我要一张多大的卡"这种口');
{
  const 桥 = rd('src/_tauri/ui/fd-bridge.js');
  台.判('桥的参表里没有新增尺寸类通道（min / size / dim / measure 一颗都不许有）',
    !/(min|size|dim|measure)[A-Za-z]*"?\s*:\s*\[/.test(桥));
  const 装 = rd('src/_shared/sh-load.js');
  台.判('装载器没把问最小这只手发给插件（这是主程序自己问插件，不是插件问主程序）',
    !/ctx\.问最小|ctx\.minSize|ctx\.问摆放/.test(装) && !/ctx\.问最小|ctx\.minSize|ctx\.问摆放/.test(rd('src/_fd/src/fd5-load.js')));
  台.判('问最小 / 问摆放 只住在主程序那一头（为写、推演定制、_shared 三棵源码树里一颗都没有）',
    ['src/_wnw/src/w3-shell.js', 'src/_wnw/src/w5-load.js', 'src/_wcustom/src/sh-gen.js', 'src/_shared/sh-packs.js']
      .every(p => !/问摆放|问最小/.test(rd(p))));
}

台.收尾();
