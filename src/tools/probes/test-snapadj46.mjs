/* issue #45（他 2026-10-19 只点了这一条）：「需要修复僵硬的吸附/挤开效果」+「允许卡片相邻」
   从前落点只要压着邻居一点点（1/8 格也算压着），就把那几张整张推走 —— 这就是"僵硬的挤开"。
   现在分两档：压得不深（最浅那条轴不到半格）只把这一张自己吸到贴边；真压进去了才让位。
   这一台不抄第二份公式：贴边 / 让位 / 推开 / hits / rect 五颗全从真源码里端进虚拟机，喂一张 64×36 的桌面真跑。 */
import vm from 'node:vm';
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const R = 记账('图45 · 贴边与挤开');
const S = rd('src/_fd/src/fd3-shell.js');
/* 常量与那颗 Shell 分两趟端进去：常量那一行是 const 声明，塞进对象字面量里就成了语法错
   （顶层 const 落在这个上下文的词法环境里，第二趟那几颗方法照样看得见 —— 与 test-dropfit 同一写法） */
const 常量 = 切(S, 'GRID_COLS');
const 方法 = [
  切方法(S, '  rect(it){'), 切方法(S, '  hits(a, b){'), 切方法(S, '  在界内(r){'),
  切方法(S, '  fits(rect, self){'), 切方法(S, '  贴边(rect, self){'),
  切方法(S, '  让位(rect, self){'), 切方法(S, '  推开(r, 定){'),
].join(',\n  ');

function 开一张(items){
  const ctx = { Math, JSON };
  vm.createContext(ctx);
  vm.runInContext(常量, ctx);
  vm.runInContext('var Shell = { layout: { items: ' + JSON.stringify(items) + ' },\n  ' + 方法 + '\n};', ctx);
  return {
    贴边: (r, 它) => vm.runInContext('JSON.stringify(Shell.贴边(' + JSON.stringify(r) + ',' + JSON.stringify(它) + '))', ctx),
    让位: (r, 它) => vm.runInContext('JSON.stringify(Shell.让位(' + JSON.stringify(r) + ',' + JSON.stringify(它) + '))', ctx),
  };
}
const 卡 = (id, x, y, w, h) => ({ id, x, y, w, h });
const 读 = s => (s === 'null' ? null : JSON.parse(s));
const 同 = (a, b) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9 && Math.abs(a.w - b.w) < 1e-9 && Math.abs(a.h - b.h) < 1e-9;

R.题('一 · 压得不深：只吸自己，邻居一张都不动');
{
  const 桌 = 开一张([卡('邻', 10, 4, 6, 4)]);
  const 无 = 读(桌.贴边({ x:2, y:2, w:4, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('谁都没压着：原样回（不吸不推）', 无 && 同(无, { x:2, y:2, w:4, h:4 }), JSON.stringify(无));

  const 贴 = 读(桌.贴边({ x:16, y:4, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('正好首尾相接（我左边 = 邻居右边）：这也算相邻，原样回 —— 这一条就是"允许卡片相邻"',
    贴 && 同(贴, { x:16, y:4, w:6, h:4 }), JSON.stringify(贴));

  const 浅 = 读(桌.贴边({ x:15.75, y:4, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('压进去四分之一格：把这一张往右吸到贴边（x 从 15.75 变成 16），邻居一个字没动',
    浅 && Math.abs(浅.x - 16) < 1e-9, JSON.stringify(浅));

  const 左 = 读(桌.贴边({ x:4, y:4, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('落在邻居左半边（中心在邻居左边）：往左吸到贴边（x = 邻居左 - 我的宽 = 4）',
    左 && Math.abs(左.x - 4) < 1e-9, JSON.stringify(左));

  const 深 = 桌.贴边({ x:12, y:4, w:6, h:4 }, 卡('我', 0, 0, 0, 0));
  R.判('压进去两格（超过半格）：贴边那颗回 null，交回让位那一路 —— 深压该挤，浅压不该挤',
    深 === 'null', 深);

  const 竖 = 读(桌.贴边({ x:12, y:7.75, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('两轴都压着时吃浅的那条轴：横的重叠比竖的大，就沿竖轴吸（y 动、x 不动）',
    竖 && Math.abs(竖.y - (4 + 4)) < 1e-9, JSON.stringify(竖));
}

R.题('二 · 吸不开就不硬吸');
{
  const 夹 = 开一张([卡('左邻', 4, 4, 4, 4), 卡('右邻', 12, 4, 4, 4)]);
  const 中 = 夹.贴边({ x:8.2, y:4, w:4, h:4 }, 卡('我', 0, 0, 0, 0));
  R.判('两张邻居中间只塞得下四格、却要落一张四格卡：吸完正好贴住左边那张（8.2 → 8）',
    中 !== 'null' && Math.abs(读(中).x - 8) < 1e-9, 中);
  const 挤 = 开一张([卡('左邻', 4, 4, 5, 4), 卡('右邻', 11, 4, 5, 4)]);
  R.判('中间只剩 2 格却塞一张 4 格的：两头都吸不开就回 null，不许把卡片压扁',
    挤.贴边({ x:7, y:4, w:4, h:4 }, 卡('我', 0, 0, 0, 0)) === 'null');
  const 边 = 开一张([卡('贴右邻', 58, 0, 6, 36)]);
  R.判('往右吸就要吸到桌面外（64 列那一头）：回 null，不许吸出界',
    边.贴边({ x:63.5, y:0, w:6, h:4 }, 卡('我', 0, 0, 0, 0)) === 'null',
    边.贴边({ x:63.5, y:0, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
}

R.题('三 · 真压进去了还是那一路让位');
{
  const 桌 = 开一张([卡('邻', 10, 4, 6, 4)]);
  const 动 = 读(桌.让位({ x:10, y:2, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('压进两格（浅的那条轴 = 竖）：让位回一张要动的，动的距离正好等于重叠的那两格（y 4 → 6，x 不动）',
    Array.isArray(动) && 动.length === 1 && 动[0].it.id === '邻' && 动[0].x === 10 && 动[0].y === 6, JSON.stringify(动));
  const 满 = 开一张([卡('甲', 0, 0, 32, 36), 卡('乙', 32, 0, 32, 36)]);
  R.判('整张桌面装满了还硬压：让位回 null，界面上那句「桌面装不下这么多了 · 已回弹」照旧',
    满.让位({ x:20, y:0, w:20, h:36 }, 卡('我', 0, 0, 0, 0)) === 'null');
}

R.题('四 · 接线与外观（顺序错了就等于没改）');
{
  const 收 = 切方法(S, '  bindDrag(card, it, def){');
  R.判('松手那一下先问贴边、贴边不成才问让位（顺序钉住：贴边成功就不再挤邻居）',
    /const 贴 = shell\.贴边\(落, it\);/.test(收) && /if\(贴\)\{/.test(收) &&
    收.indexOf('shell.贴边') < 收.indexOf('shell.让位'));
  R.判('让位那几张写完坐标不再整屏重建（重建会换新节点，过渡就滑不起来）：只有改大小或跨过展开那一档才 render',
    !/if\(动\.length \|\| mode === 'resize'/.test(收) && /if\(mode === 'resize' \|\| grew !== was\) shell\.render\(\);/.test(收));
  const 皮 = S.slice(S.indexOf('.fd-card{position:absolute'), S.indexOf('.fd-card{position:absolute') + 400);
  R.判('卡片位置有 120 毫秒过渡：让开的邻居滑过去，不啪地蹦',
    /\.fd-card\{[^}]*transition:left \.12s ease-out, top \.12s ease-out;?\}/.test(皮), 皮.replace(/\s+/g, ' ').slice(0, 160));
  R.判('被拖那一张（带 .lift）关掉过渡：它吃的是指针像素，慢一帧就是"跟不上手"',
    /\.fd-card\.lift\{[^}]*transition:none/.test(S));
  R.判('只给位置写过渡，尺寸不写：改大小那一路是手底下连续在动',
    !/transition:[^;}]*width/.test(S) && !/transition:[^;}]*height/.test(S));
}

R.题('五 · 贴边贴的是网格，不是零距离（他 2026-10-19 定死：保留最小间隙）');
{
  const LIB = rd('src/_fd/src/fd3-lib.js');
  R.判('间距那一档最低就是 4 像素，0 不许成为一个能选的数（放开到 0 就等于两张卡贴死在一起）',
    /const LOOK_GAP = \{ min:4, max:24 \};/.test(LIB) && !/min:\s*0/.test(LIB),
    (LIB.match(/const LOOK_GAP[^\n]*/) || [''])[0]);
  R.判('方案没钉间距时走"自动"，自动那一条也算不出 0（4..18 之间跟着格子走）',
    /this\.gap = 钉死 > 0 \? 钉死 : Math\.max\(4, Math\.min\(18, Math\.round\(Math\.min\(this\.cellW, this\.cellH\) \* \.16\)\)\);/.test(切方法(S, '  fitGrid(){')));
  R.判('卡片画的时候自己往内缩半个间距（place 里那两条 --gap-half）：所以"贴边"= 网格首尾相接，视觉上仍隔着 --gap 那道缝',
    /--gap-half/.test(切方法(S, '  place(card, it){')) && /- var\(--gap\)\)/.test(切方法(S, '  place(card, it){')));
  const 邻 = 开一张([卡('邻', 10, 4, 6, 4)]);
  const 吸 = JSON.parse(邻.贴边({ x:15.75, y:4, w:6, h:4 }, 卡('我', 0, 0, 0, 0)));
  R.判('真跑一遍吸边：落到 16 就是网格上首尾相接（重叠 0 格），再近就压着邻居了 —— 那半格以内的缝由 --gap 顶着',
    吸.x === 16 && 吸.x + 吸.w === 22 && 22 - 16 === 6, JSON.stringify(吸));
}

R.收尾();
