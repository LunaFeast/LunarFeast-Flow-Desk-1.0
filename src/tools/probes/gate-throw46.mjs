/* ============================================================
   gate-throw46.mjs · 外46 批六补的第二件：一家插件抛错不许带着整张桌面一起倒
   ------------------------------------------------------------
     node src/tools/probes/gate-throw46.mjs
   2026-10-12 量的那条真账（这台子钉的就是它）：
     一、主程序直接调插件的那几颗方法，原先没人接：def.mount 五处（fd3-shell.js 一处 +
        fd8-tools.js 四处）、def.settings 一处、def.expand 一处，外加 mount 交回来那颗 unmount
        只在 fd3-shell.js:1795 有一道 catch 掉不报的。一家在自己 mount 里抛，
        Shell.render() 那张卡卡在这里 —— 整张桌面画不下去。
     二、全仓没有 window.onerror / unhandledrejection（当场数过：0 处）。
        所以设计文档原先那句"接不住的由整页那句出错了统一认是谁家"是假的，已经改口。
   包的位置选在 PackLoader.register()（登记表里那份 def 就是宿主手里那一份），
   不是六处调用点各包一遍 —— 漏包一处就少挡一处。
   这一台切的是仓库里那一份真源码，在 vm 里真跑、真抛错，不是查字符串。
   ============================================================ */
import vm from 'node:vm';
import { rd, 记账, 切 } from './lib-slice.mjs';

const 台 = 记账('gate-throw46');
const 载 = rd('src/_shared/sh-load.js');
const 壳 = rd('src/_fd/src/fd3-shell.js');
const 具 = rd('src/_fd/src/fd8-tools.js');

/* ---------- 一台假界面：只要 appendChild / innerHTML / 文字能读回来 ---------- */
const 收到 = { widget:null, tool:null };
function 节点(tag, props, kids){
  const n = {
    tag, props: props || {}, kids: [],
    set innerHTML(v){ if(v === '') n.kids = []; },
    get innerHTML(){ return ''; },
    appendChild(c){ n.kids.push(c); return c; }
  };
  const 填 = c => {
    if(c === null || c === undefined || c === false) return;
    n.kids.push(typeof c === 'string' ? { text:c } : c);
  };
  if(Array.isArray(kids)) kids.forEach(填); else if(kids !== undefined && kids !== null) 填(kids);
  return n;
}
function 文字(o, 串 = []){
  if(o === null || o === undefined) return 串;
  if(typeof o === 'string'){ 串.push(o); return 串; }
  if(o.text !== undefined) 串.push(o.text);
  (o.kids || []).forEach(c => 文字(c, 串));
  return 串;
}
const 拼 = o => 文字(o).join(' ');

/* ---------- 把真源码搬进一台干净的 vm ---------- */
const 场 = vm.createContext({
  console:{ warn(){}, log(){}, error(){} },
  window:{ FD_APP:{} },
  /* 装载器现在会盯异步那几颗几秒回话（批十一），这两颗是真环境有的东西，
     这台子里给一颗"永远不响"的：本道钉的是抛错那一路，卡住那一路由 gate-crash46 钉 */
  setTimeout:() => 0, clearTimeout:() => {},
  h:节点, Bus:{ emit(){}, on(){ return () => {}; } }, Banks:{ list:() => [] },
  registerWidget:def => { 收到.widget = def; }, registerTool:def => { 收到.tool = def; }
});
for(const 段 of [ 切(rd('src/_shared/sh-packs.js'), 'PACK_META'), 切(载, 'sealDeep'),
                  切(载, 'APP_DENY'), 切(载, 'packApp'), 切(载, 'PackCtx'), 切(载, 'PackLoader') ])
  vm.runInContext(段, 场);
const 跑 = 码 => vm.runInContext(码, 场);
const 判 = 码 => vm.runInContext('(function(){' + 码 + '})()', 场);
const 登 = (家, 名) => 跑('PACK_META[' + JSON.stringify(家) + '] = PackLoader.metaOf('
  + JSON.stringify(家) + ', ' + JSON.stringify({ name:名 }) + '); true');

/* ---------- 一 · 那颗兜在不在、排不排在登记之前 ---------- */
台.题('一 · 兜长在装载器里，而且排在把这一家交出去之前');
台.判('PackLoader 里有 guard 这一颗', /(^|\n)  guard\(id, def\)\{/.test(载));
const 登记段 = 载.slice(载.indexOf('register(id, def, ctx){'), 载.indexOf('  errCard('));
台.判('register() 里 this.guard(id, def) 排在把这一家交出去（registerTool / registerWidget）之前',
  登记段.indexOf('this.guard(id, def)') >= 0 &&
  登记段.indexOf('this.guard(id, def)') < 登记段.indexOf("if(type === 'tool')"),
  { guard在:登记段.indexOf('this.guard(id, def)'), 登记在:登记段.indexOf("if(type === 'tool')") });
台.判('注释里写清了为什么包在这一处而不是六个调用点', 登记段.includes('漏包一处就少挡一处'));
台.判('幂等：靠 __packGuard 挡着，reload 第二次不套第二层', 载.includes('if(def.__packGuard) return;'));

/* ---------- 二 · mount 抛错那一路 ---------- */
台.题('二 · 一家在 mount 里抛：不许抛出去，位子上立一张错误卡');
登('t2', '乙家');
跑(`globalThis.甲 = { mount(){ const 半 = h('div', null, '我刚画了一半'); arguments[0].appendChild(半); this.画过 = true; throw new Error('甲家这里炸了'); } };
   PackLoader.register('t2', 甲, {});`);
const 容器 = { 抛: null, 回: null };
容器.回 = 跑('(() => { const b = h("div"); try{ return { 炸:null, 卡:b, 交回:甲.mount(b, { item:1 }) }; }catch(e){ return { 炸:String(e && e.message || e) }; } })()');
台.判('调 mount 不再抛出去', 容器.回.炸 === null && 容器.回.交回 !== undefined, 容器.回.炸);
const 卡面 = 拼(容器.回.卡);
台.判('那一张的位子上是错误卡：写着这一家的名字', 卡面.includes('乙家'), 卡面);
台.判('错误卡里带着那句错话（他要说得出为什么）', 卡面.includes('甲家这里炸了'), 卡面);
台.判('抛之前画了一半的那一颗不留在位子上（不留半张残卡）',
  !文字(容器.回.卡).some(串 => 串 === '我刚画了一半'), 文字(容器.回.卡));
台.判('交回来的还是一份可用对象（宿主那一句 || {} 与 mounted 表不炸）',
  容器.回.交回 && typeof 容器.回.交回.unmount === 'function', 容器.回.交回);
台.判('错话记在这一棵自己的 errs 表里，不往冻住的登记表上写',
  跑('PackLoader.errs.get("t2")').includes('mount') && 跑('PackLoader.errs.get("t2")').includes('甲家这里炸了'),
  跑('PackLoader.errs.get("t2")'));

/* ---------- 三 · 正常的一家不许被改动 ---------- */
台.题('三 · 没出错的一家：交回来的东西、this、返回值一律原样');
登('t3', '丙家');
跑(`globalThis.丙 = { 自己的:7, mount(){ this.挂过 = true; return { 我:{ 名:'我那颗 api' }, unmount(){ this.拆过 = true; } }; },
     settings(){ return '设置页'; }, 没被调(){ return 1; } };
   PackLoader.register('t3', 丙, {});`);
const 正常 = 跑('(() => { const b = h("div"); const api = 丙.mount(b, { x:1 }); return { api:api, 有丙:丙.挂过 === true, 别的:typeof 丙.没被调 }; })()');
台.判('mount 交回来的那份对象原样（自定义的 api 字段一颗不少）',
  正常.api && 正常.api.我 && 正常.api.我.名 === '我那颗 api', 正常);
台.判('方法里的 this 还是这一家自己（包一层没换调用形状）', 正常.有丙 === true);
台.判('插件自己写的别的没被调过的一颗不去动它', 正常.别的 === 'function');
台.判('settings 正常返回值原样透出', 跑('丙.settings()') === '设置页');
台.判('api.unmount 正常跑的那一路照样跑到底', 判('丙.mount(h("div")).unmount(); return true;'));

/* ---------- 四 · 另外三颗方法各有一道 ---------- */
台.题('四 · 拆界面、设置、展开这三颗也各有一道兜');
登('t4', '丁家');
跑(`globalThis.丁 = { mount(){ return { unmount(){ throw new Error('拆不干净'); } }; },
     settings(){ throw new Error('设置页炸了'); }, expand(){ throw new Error('展开炸了'); } };
   PackLoader.register('t4', 丁, {});`);
台.判('api.unmount 抛 → 不抛出去（原先那一处是 catch 掉不报，现在报得出是谁家）',
  判('try{ 丁.mount(h("div")).unmount(); return true; }catch(e){ return false; }'));
台.判('errs 里记下是 unmount 那一颗', String(跑('PackLoader.errs.get("t4")')).includes('unmount'), 跑('PackLoader.errs.get("t4")'));
台.判('settings 抛 → 不抛出去', 判('try{ 丁.settings(); return true; }catch(e){ return false; }'));
台.判('expand 抛 → 不抛出去', 判('try{ 丁.expand({}); return true; }catch(e){ return false; }'));
/* 异步那一半：只有同步的 try 接不到 reject，所以这台子非等一拍不可 */
登('t5', '戊家');
跑(`globalThis.戊 = { settings(){ return Promise.reject(new Error('异步里炸的')); } }; PackLoader.register('t5', 戊, {});`);
await 跑('戊.settings().catch(() => {})');
台.判('settings 返回一颗被拒的承诺 → 等一拍之后 errs 里有那句（异步那一半也接住了）',
  String(跑('PackLoader.errs.get("t5")')).includes('异步里炸的'), 跑('PackLoader.errs.get("t5")'));
登('t6', '己家');
跑(`globalThis.己 = { mount(){ return {}; } }; PackLoader.register("t6", 己, {});`);
台.判('插件没写 settings / expand，不许凭空长出那两颗（界面上那颗齿轮按在不在画）',
  跑('typeof 己.settings') === 'undefined' && 跑('typeof 己.expand') === 'undefined',
  { settings:跑('typeof 己.settings'), expand:跑('typeof 己.expand') });

/* ---------- 五 · 一家出错不拖别家（他报的那一类症状） ---------- */
台.题('五 · 一张卡一张卡地挂：一家抛，别家照画');
登('bad', '出错家'); 登('ok', '正常家');
跑(`globalThis.坏 = { mount(){ throw new Error('我就是抛'); } };
   globalThis.好 = { mount(b){ b.appendChild(h('div', null, '正常家画上了')); return {}; } };
   PackLoader.register('bad', 坏, {}); PackLoader.register('ok', 好, {});
   globalThis.两家 = [坏, 好];`);
const 循环卡 = 跑(`(() => { const 卡 = []; let 中断 = false;
   try{ for(const def of 两家){ const b = h('div'); def.mount(b, {}); 卡.push(b); } }catch(e){ 中断 = true; }
   return { 中断:中断, 张数:卡.length, 卡:卡 }; })()`);
const 循环 = { 中断:循环卡.中断, 张数:循环卡.张数, 第一张:拼(循环卡.卡[0]), 第二张:拼(循环卡.卡[1] || {}) };
台.判('循环跑到底没中断（第二张照样挂出来了）', 循环.中断 === false && 循环.张数 === 2, 循环);
台.判('出错那一张位子上是错误卡，带名字和错话', 循环.第一张.includes('出错家') && 循环.第一张.includes('我就是抛'), 循环.第一张);
台.判('别家那一张照旧是它自己画的东西', 循环.第二张 === '正常家画上了', 循环.第二张);
台.判('errs 里两家各记各的（别家没被顶掉）',
  String(跑('PackLoader.errs.get("bad")')).includes('我就是抛') && !跑('PackLoader.errs.has("ok")'),
  { 坏:跑('PackLoader.errs.get("bad")'), 好:跑('PackLoader.errs.get("ok")') });

/* ---------- 六 · 调用点与那张卡面只此一份 ---------- */
台.题('六 · 六个调用点没改字、错误卡面没抄第二份');
const 数 = (文, 串) => 文.split(串).length - 1;
台.数('def.mount( 在 fd3-shell.js 与 fd8-tools.js 里一共几处', 数(壳, 'def.mount(') + 数(具, 'def.mount('));
台.判('那五处调用点一个字没改（包在装载器里，调用点不动）',
  数(壳, 'def.mount(') + 数(具, 'def.mount(') === 5, { 壳:数(壳, 'def.mount('), 具:数(具, 'def.mount(') });
台.判('宿主拿那一份 def 走的是登记表（所以包过的那一份就是它手里那一份）',
  壳.includes('const def = Registry.get(') && 壳.includes('this.mounted.set(it.id, api)'));
台.数('整页错误卡面（fd-empty）在装载器里出现几次', 数(载, "class:'fd-empty'"));
台.判('只此一处：装载失败与运行中出错共用 errCard，没抄第二份', 数(载, "class:'fd-empty'") === 1);
台.判('诚实记着的一手：全仓还是那句没有 window.onerror（异步那条追不到根，靠调用点包）',
  !/addEventListener\('error'/.test(壳) && !/window\.onerror/.test(壳));
台.判('装载失败那一路照旧（fail 还是交出一张能立起来的卡，没被这次改动碰坏）',
  (() => { 收到.widget = null;
    跑('(() => { PACK_META.t7 = PackLoader.metaOf("t7", {name:"庚家"});'
      + ' PackLoader.fail("t7", new Error("没加载起来的那种")); return true; })()');
    return !!收到.widget && 收到.widget.id === 't7' && typeof 收到.widget.mount === 'function';
  })(), 收到.widget && 收到.widget.id);

台.收尾();
