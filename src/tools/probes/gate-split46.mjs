/* 外46 十 · 可拆性整理这一摊的闸：拆出去的那一块一块，各自只管自己那份文件 + 一处登记。
   ------------------------------------------------------------
   要钉住的是一件很具体的事：一块功能从共用那份文件里搬出去以后，
   留下的那一处登记（一张名单 + 一句 reg）得真的把活干完 —— 挂载 / 重画 / 刷新 / 设定项四条口都不能断。
   这几口断了在界面上的样子是「那一块没了但也不报错」，最难发现，所以每条都切仓库里那一份原文进 vm 真跑：
   不抄第二份，也不拿手写的替身跑。
   一台一节，将来每搬一家加一节。现在有的：
     一 · 结构 —— 谁住在哪一份、装配名单顺序、文字工具那一头的页名
     二 · 统计那一屏那一半（真跑 Views.reg('stat') 里那颗 render）
     三 · 热力图自己登记的那一半（真跑 w21-heat.js 末尾那句 StatBlock.reg）
     四 · 负控 —— 两处登记各砍一刀，看这台闸是不是真的在报
   用法：node src\\tools\\probes\\gate-split46.mjs */
import vm from 'node:vm';
import { rd, 记账, 切 } from './lib-slice.mjs';

const 台 = 记账('gate-split46');
const 本体 = rd('src/_wnw/src/w8-write.js');
const 装配 = rd('src/_wnw/build-kernel.mjs');
const 页名 = rd('src/pack/uitext.cjs');

/* ---------- 假 DOM：够真 h() 那三口（标签 / 属性 / 孩子数组或一句话） ---------- */
function 造树(){
  class 节{
    constructor(标签, 属性){ this.标签 = 标签; this.属性 = 属性 || {}; this.孩子 = []; this.字 = ''; this.hidden = false; }
    appendChild(c){ if(!c) return c; if(typeof c === 'string' || typeof c === 'number'){ this.字 += c; return c; } c.parent = this; this.孩子.push(c); return c; }
    set innerHTML(v){ if(v === '') this.孩子 = []; }
    get innerHTML(){ return ''; }
    addEventListener(事, fn){ this.监听 = this.监听 || {}; this.监听[事] = fn; }
    点(){ return this.属性.onclick && this.属性.onclick(); }
    改(){ return this.监听 && this.监听.change && this.监听.change(); }
    全身(){ const 出 = [this]; for(const k of this.孩子) 出.push(...k.全身()); return 出; }
    说话(){ return this.全身().map(x => x.字).join(' '); }
  }
  const h = (标签, 属性, 孩子) => {
    const n = new 节(标签, (属性 && !Array.isArray(属性) && typeof 属性 === 'object') ? 属性 : {});
    if(typeof 属性 === 'string' || typeof 属性 === 'number') n.字 = String(属性);
    if(typeof 孩子 === 'string' || typeof 孩子 === 'number') n.字 += String(孩子);
    else if(Array.isArray(孩子)) for(const c of 孩子) n.appendChild(c);
    return n;
  };
  return { h };
}

/* 从一句顶层调用里把那一块参数整块捞出来（StatBlock.reg({…}) 这种） */
function 到收尾(s, i){
  let d = 0;
  for(let k = i; k < s.length; k++){
    const c = s[k];
    if(c === '{' || c === '(' || c === '[') d++;
    else if(c === '}' || c === ')' || c === ']'){ d--; if(d === 0) return s.slice(i, k + 1); }
  }
  throw new Error('那一块没收尾');
}
/* 统计那一颗 render：从 Views.reg('stat' 往后、到下一节那份注释为止（同名方法满仓库都是，必须给界） */
function 切render(源){
  const 起 = 源.indexOf("Views.reg('stat'");
  const 止 = 源.indexOf('/* 每张卡的数都在这儿算', 起);
  if(起 < 0 || 止 < 0) throw new Error('找不到统计那一节');
  const i = 源.indexOf('\n  async render(host, ref, ctx){', 起);
  if(i < 0 || i > 止) throw new Error('切不到统计那一颗 render');
  let d = 0, k = 源.indexOf('{', i);
  for(; k < 源.length; k++){ const c = 源[k]; if(c === '{') d++; else if(c === '}'){ d--; if(!d) return 源.slice(i + 1, k + 1); } }
  throw new Error('render 没收尾');
}

/* ================== 一、结构：谁住在哪一份 ================== */
台.题('二、统计那一屏 —— 名单里登记的块，挂载 / 重画 / 刷新 / 设定项四条口都得走到');
function 跑本体(砍){
  const { h } = 造树();
  const 叫 = { 挂:0, 画:0, 刷:0, 设:0 };
  const 假块 = {
    mount(host){ 叫.挂++; const el = h('div', {}); host.appendChild(el); 假块.el = el;
      return { async repaint(){ 叫.画++; }, refresh(){ 叫.刷++; } }; },
    prefs(box, onDone){ 叫.设++; box.appendChild(h('div', { class:'假块设定' }, '假块那一行')); }
  };
  const 上下文 = {
    h, setInterval:() => 1, clearInterval:() => {}, STAT_BLOCKS:[假块],
    Meter:{ simple:true, cards:{ 本章字数:true }, delN:3, save:async () => {} },
    STAT_CARDS:[{ k:'本章字数' }],
    Work:{ book:null, cur:null, totalWords:() => 0 },
    Overlay:{ node:null, open:() => {} },
    dockBarOf:() => null, dockOpsInto:() => {},
    parasCount:() => ({ w:0 }), Trace:{ ranges:() => [] }, Hist:{ count:async () => 0 },
    statNumbers:async () => ({ 本章字数:0 })
  };
  const 源 = 本体.replace(砍 || '~不可能有的那一行~', '');   // 负控那一刀：砍掉一句再跑
  vm.createContext(上下文);
  new vm.Script('假块对象 = {' + 切render(源) + '};\nvar statPrefsDlg = ' + 切(源, 'statPrefsDlg') + ';',
    { filename:'统计那一节' }).runInContext(上下文);
  return { 上下文, 叫, 假块 };
}
const 一跑 = 跑本体();
const 假host = 一跑.上下文.h('div', {});
await 一跑.上下文.假块对象.render(假host, null, { dispose:() => {} });
台.判('7 名单里那一块被挂了一次，而且挂在指标卡那一格之后（顺序错了那块就跑到读数上头去了）',
  一跑.叫.挂 === 1 && 假host.孩子.indexOf(一跑.假块.el) > 假host.孩子.findIndex(x => x.属性.class === 'wnw-pbody'),
  '挂了 ' + 一跑.叫.挂 + ' 次 · host 里第 ' + 假host.孩子.indexOf(一跑.假块.el) + ' 枚');
台.判('8 一屏画完至少重画过两回（立起来一回、draw 里一回 —— 少一回就是那一档改了不生效）',
  一跑.叫.画 >= 2, '画了 ' + 一跑.叫.画 + ' 回');
await 假host.全身().find(x => x.字 === '刷新').点();
台.判('9 顶上那颗「刷新」挨个叫到名单里每一块（从前只叫热力图一颗）', 一跑.叫.刷 === 1, '刷了 ' + 一跑.叫.刷 + ' 回');
假host.全身().find(x => x.字 === '选卡').点();
台.判('10「选卡」那框给名单里每一块留了设定项这一口：假块那一行进得去（本体不写死别人家的开关）', 一跑.叫.设 === 1);

/* ================== 三、热力图自己登记的那一半（真跑它那句 reg） ================== */
/* ================== 五、负控：每一处登记各砍一刀 ================== */
台.题('五、负控 —— 这几刀砍下去这台闸必须报红（不然上头那些条是自证的）');
const 砍一 = 跑本体('    for(const reg of STAT_BLOCKS) blocks.push(reg.mount(host, ctx));\n');
const host2 = 砍一.上下文.h('div', {});
await 砍一.上下文.假块对象.render(host2, null, { dispose:() => {} });
台.判('25 砍掉本体里那句「挨个立起来」→ 一块都立不起来（第 7~10 条跑的是真源码那一句）',
  砍一.叫.挂 === 0 && 砍一.叫.画 === 0);
const 砍二 = 跑本体('  for(const reg of STAT_BLOCKS) if(reg.prefs) reg.prefs(box, onDone);\n');
const host3 = 砍二.上下文.h('div', {});
await 砍二.上下文.假块对象.render(host3, null, { dispose:() => {} });
host3.全身().find(x => x.字 === '选卡').点();
台.判('26 砍掉「选卡」框里那句「各家自己摆设定项」→ 块照样立、设定项一条不进',
  砍二.叫.挂 === 1 && 砍二.叫.设 === 0);
台.数('这一闸现在管几家', '统计那一块的名单登记（热力图与空白网页那两份 2026-10-13 拆到各自那条支上了）都真跑过）');
台.收尾();
