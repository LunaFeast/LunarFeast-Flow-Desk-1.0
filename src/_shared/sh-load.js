/* ============================================================
   插件运行时加载器（中立模块 · Flow-Desk 和 Why Not Write 共用这一份）
   ----------
   插件代码不再拼进产物：它们住在 data\plugins\<id>\ 里，页面每次开机从那儿拿。
   走三大步：
     1 认名单 —— 问主进程（开发那台服务器就问 /_comp 的 op:'dirs'）扫目录，拿回 { packs, off }；
       off 记的是「被卸掉的那几家」，这份名单不在 = 一家都没卸，扫到的全生效。按宿主管家的挑出来，按 order 排。
     2 import('<id>/main.js?v=开机时间') —— ES module，export default 一份定义；
       每次开机都是新 URL，改了代码存盘、刷新这一页就生效，没有「重新生成页面」这一趟。
     3 先给这一家做一份插件上下文（PackCtx），调 def.init(ctx)，再按插件清单的 type 登记：
       widget → 桌面卡片（只有 Flow-Desk 有桌面）· tool → 功能（两端）· recipe → 生成器配方。
   ----------
   一个崩只倒自己的坑：插件清单照收，登记一张错误卡（或控制台一句），
   外壳和别家插件照常跑。
   名单读不到就这一轮不加载插件，外壳照常跑 —— 把 html 双击直接打开那一种已经废止，
   加载和使用插件的途径只有 Flow-Desk 程序（本地开发那台 http 服务器算开发通道）。
   ============================================================ */
/* 一份登记表抄进来就冻透（连里面那几串名单数组一起）。
   为什么要有这一颗：PACK_META 是整页顶层的一个对象，插件那份 ES module 看得见它 ——
   从前一家插件代码在自己那段模块被求值的时候，就能往 PACK_META[自己].appChannels 里塞通道名，
   或者 push 进 dataKeys，门就按它自己写的长。冻透之后这一手当场抛错（模块一律是严格模式）。
   这一颗关的是「一家给自己加权限」；「一家去改别家那一格」要等运行时世界那一层（见 docs\插件真隔离设计.md）。 */
function sealDeep(x){
  if(x && typeof x === 'object' && !Object.isFrozen(x)){
    for(const k of Object.keys(x)) sealDeep(x[k]);
    Object.freeze(x);
  }
  return x;
}
const PackLoader = {
  host:'fd',
  base:'plugins/',        /* 宿主报上来的前缀：Flow-Desk.exe 是 ../data/plugins/ 那种，开发服务器是 plugins/ 或 ../plugins/ */
  stamp:'',
  errs:new Map(),            /* 这一轮没加载起来的那几家：id → 错话 */
  kernelsDone:new Set(),     /* 这一页里已经注过的内核：id/件名 —— 同一页不跑第二遍 */
  /* 每一家开机做好的那份插件上下文留着，宿主按需再递回去：
     卡片/停靠面板上的「设置」按钮要调 def.settings(ctx)，那份 ctx 就是这一份（带门的），不用现做一份新的。 */
  ctxs:new Map(),
  ctxOf(id){ return this.ctxs.get(String(id)); },
  loaded:false,
  use(o){ Object.assign(this, o); return this; },
  which(){ return this.host; },

  /* ---------- 名单和插件清单 ----------
     两条开法拿回来的是同一份形状 { packs:[{id,kind,manifest}], off:[…] }：
       · Flow-Desk 程序 → 主进程那条 packList；
       · 本地开发那台 http 服务器 → /_comp 的 op:'dirs'（它自己扫 数据\plugins\ 那一格）。
     名单反着记：off 里点名的那几家不加载，其余扫到的都加载 ——
     所以往 plugins\ 里丢一个文件夹（或一个 zip，由主进程开机摊开），重启这一趟就认得它。 */
  async disk(){
    const A = window.FD_APP;
    if(A && typeof A.packList === 'function'){
      try{ return await A.packList(); }catch(e){ return null; }
    }
    try{
      const r = await fetch('/_comp', { method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ op:'dirs' }) });
      return r.ok ? await r.json() : null;
    }catch(e){ return null; }
  },
  async sources(){
    const d = await this.disk();
    if(!d || d.error){ console.warn('读不到插件那一层的清单（' + this.base + '）· 这一轮不加载插件'); return []; }
    const off = new Set((Array.isArray(d.off) ? d.off : []).map(String));
    const out = [];
    for(const p of (d.packs || [])){
      const m = p.manifest;
      if(!m || !m.id) continue;
      if(off.has(String(m.id))) continue;
      /* 运输形状不当运行形状使：zip 与自有容器（第 3 批 3.4）这两种都只列在管理页那一屏，
         运行时吃的永远是摊开的那一格；这一格没在（或读不动）就跳过这一家，不加载、也不弹错误卡 */
      if(p.kind === 'zip' || p.kind === 'box'){
        console.warn('插件「' + m.id + '」还在那份运输形状里（' + p.kind + '）：开机这一趟没拿到摊开的那一格，这一家先不加载');
        continue;
      }
      out.push({ id:String(m.id), manifest:m });
    }
    return out;
  },
  /* 插件清单缺的那几样按默认补齐 —— 和构建那把尺（_build/packs.mjs）同一个口径 */
  metaOf(id, m){
    return sealDeep({
      id, name:m.name || id, version:m.version || '0', author:m.author || '', source:m.source || '',
      host:Array.isArray(m.host) ? m.host : ['fd'], entry:Array.isArray(m.entry) ? m.entry : ['main.js'],
      order:(typeof m.order === 'number' ? m.order : 100),
      dataKeys:m.dataKeys || [], kvKeys:m.kvKeys || [], sharedKeys:m.sharedKeys || [], stateKeys:m.stateKeys || [],
      desc:m.desc || '', bank:m.bank || null, assets:m.assets || {},
      type:m.type || 'widget', settings:!!m.settings, appChannels:m.appChannels || [],
      /* 这一家自己带的内核（为写、推演组件定制、声笔输入法练习三家有）：按顺序在 import 那份定义表
         之前一份份注进来。它们不是 ES module，是自己把把手挂到窗口上的那种一段（见各家 build-kernel）。 */
      kernels:Array.isArray(m.kernels) ? m.kernels.map(String) : [],
      where:id + '/'
    });
  },

  async load(){
    this.stamp = Date.now();
    const list = [];
    for(const it of await this.sources()){
      const meta = this.metaOf(it.id, it.manifest);
      if(meta.host.indexOf(this.host) < 0) continue;      /* 不归这个宿主的包，一家都不 import */
      PACK_META[it.id] = meta;
      list.push(it.id);
    }
    list.sort((a, b) => (PACK_META[a].order - PACK_META[b].order) || (a < b ? -1 : a > b ? 1 : 0));
    /* 插件清单表一家家填进 PACK_META 之后、真 import 之前刷新词库名：
       第一家的 init 就可能要读自己那份库，BANK_NAME 得先认得出这一家。 */
    if(typeof bankSync === 'function') bankSync();
    for(const id of list){
      try{ await this.one(id); }
      catch(e){ this.fail(id, e); }
    }
    this.loaded = true;
    try{ Bus.emit('packs:loaded'); }catch(e){}
    /* 后台那一趟自检：不 await —— 核包不许拦住开机，也不许把这一趟的成败算进任何一家的崩溃次数 */
    Promise.resolve().then(() => this.后台核包()).catch(() => {});
    return this;
  },
  /* ---------- 新建 / 刚导入的那一家：先从盘上把插件清单读进表里 ----------
     名单和 PACK_META 都按开机那一趟算，刚写进 data\\plugins\\ 的一格表里没有它。
     读得到插件清单、且 host 认本宿主，才往表里补一格（补完这一家就等于「装上并加载」）。 */
  async metaFromDisk(id){
    id = String(id);
    let text = '';
    const A = window.FD_APP;
    if(A && typeof A.compRead === 'function'){
      const r = await A.compRead(id, 'manifest.json');
      if(r && r.ok) text = String(r.text || '');
    }else{
      /* 本地开发那台 http 服务器：插件清单直接从 plugins/ 那一层 fetch */
      try{
        const r = await fetch(this.base + id + '/manifest.json', { cache:'no-store' });
        if(r.ok) text = await r.text();
      }catch(e){}
    }
    if(!text) return null;
    let m = null;
    try{ m = JSON.parse(text); }catch(e){ return null; }
    if(!m || !m.id) return null;
    const meta = this.metaOf(id, m);
    if(meta.host.indexOf(this.host) < 0) return null;   /* 不归本宿主用的包不补表 */
    PACK_META[id] = meta;
    return meta;
  },
  /* ---------- 推演定制存完一个新组件：只把这一家重新 import 一遍 ----------
     加载器的 URL 尾巴换成当前时刻，页面手里那份模块缓存跟着作废，拿到的就是刚落盘的文件；
     注册那一格被新的定义顶掉（出厂基线 TOOL_DEFS 不吃第二次，还是第一份）。
     重 import 之后广播一句 pack:reload，宿主在那儿重画自己那部分（卡片、停靠面板都重新挂一遍），
     所以向导存一次之后不用刷新整页，也不用重新生成 Flow-Desk 页面。
     opt.new = 这一家刚新建 / 刚导入、表里还没有插件清单：先补插件清单再 import。
     没在名单里加载的（opt.new 没给）不动它 —— 免得把用户刚卸载掉的包偷偷请回来。 */
  async reload(id, opt){
    id = String(id);
    const o = opt || {};
    if(!PACK_META[id]){
      if(!o.new) return { ok:false, msg:'这一家这一轮没在名单里加载，改完刷新这一页才认它' };
      if(!await this.metaFromDisk(id)) return { ok:false, msg:'刚写的插件清单读不到，或者它不写给本宿主用' };
    }
    this.errs.delete(id);
    this.stamp = Date.now();
    let err = null;
    try{ await this.one(id); }
    catch(e){ this.fail(id, e); err = (e && e.message) || String(e); }
    try{ Bus.emit('pack:reload', id); }catch(e){}
    return err ? { ok:false, msg:err } : { ok:true };
  },
  /* ---------- 一家自己带的内核：注一份经典脚本，等它 onload ----------
     内核不是 ES module，是自己把把手挂到窗口上的那一段（各家 build-kernel 的产物），
     所以只能按 <script src> 请进来，不能 import()。这是全仓唯一"运行时拿代码"的第二条路，
     跟 import() 同级：没有 eval、没有 new Function。
     读不进来就抛，让外面那一层 fail(id) 立一张错误卡 —— 报的是"这一家的内核没读进来"，
     不是"这一家没装"：没装的压根不在名单里，走不到这一步。 */
  script(id, 件名){
    return new Promise((resolve, reject) => {
      const url = new URL(this.base + id + '/' + 件名 + '?v=' + this.stamp, document.baseURI).href;
      const s = document.createElement('script');
      s.src = url; s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('这一家的内核没读进来：' + 件名));
      document.head.appendChild(s);
    });
  },
  async one(id){
    const m = PACK_META[id];
    /* 先注这一家自己带的内核，再请它那份定义表：定义表 mount 的时候要用 ctx.wnw 那类把手，
       而把手是内核挂上来的 —— 顺序反了就变成"卡先到位、内核还在路上"。
       同一份内核在一页里只注一次（kernelsDone 记着）：换内核要刷新这一页，
       不在同一页里把同一段跑两遍 —— 跑两遍会把监听和统计挂成双份。 */
    for(const k of (m.kernels || [])){
      const 键 = id + '/' + k;
      if(this.kernelsDone.has(键)) continue;
      await this.script(id, k);
      this.kernelsDone.add(键);
    }
    const ent = (m.entry && m.entry[0]) || 'main.js';
    /* 说明符先转成绝对 URL 再 import：ES module 里不以 '/' './' '../' 打头的那串算裸名，
       开发那台 http 服务器报上来的前缀正好是 'plugins/' 这种光溜溜的写法，直接递进去会「无法解析模块说明符」。 */
    const url = new URL(this.base + id + '/' + ent + '?v=' + this.stamp, document.baseURI).href;
    /* 门先做好，再请它的代码进门：这一句必须在下面那颗 import 之前。
       顺序反了就留一条路 —— 模块被求值的那一趟改 PACK_META，这一家的门就按它改过的长。
       （登记表本身已经 sealDeep 冻住，改不动了；这里是第二道：就算将来有人把表换成可写的，
        抄进 ctx 的也还是 import 之前那一份。） */
    const ctx = PackCtx.make(id);
    this.ctxs.set(id, ctx);
    const mod = await import(url);
    const def = mod && mod.default;
    if(!def || typeof def !== 'object') throw new Error('这一家的代码没有交出一份定义');
    /* id 和中文名都从插件清单取，一家只写一处：包里那份定义不用自己声明，
       声明了就是抄第二份名字 —— 改了插件清单、漏了源码，界面上就露出旧名。 */
    def.id = id;
    def.name = m.name;
    if(typeof def.init === 'function') await def.init(ctx);
    this.register(id, def, ctx);
  },
  register(id, def, ctx){
    /* 名字的真身只有一份：插件清单（manifest.json）里那一行 name。
       包里那份定义不再自己声明 id / name —— 声明了就是抄第二份，改一处漏一处。
       mount 包一层：宿主现给的挂载上下文和 init 那份插件上下文并成一份传进去，
       组件里只管用同一份 ctx，不用两头记。
       宿主那份挂载上下文里原先直接塞着宿主的内部件（卡片档给过整个 Store/Settings/Modal/Cover，
       Why Not Write 的视图档塞着整个工作台 desk）—— 组件拿到的这一份里把它们摘干净：
       对话框走 ctx.dialog、封面走 ctx.cover、数据走 ctx.store/ctx.kv 那些带门的，
       整个工作台外壳组件永远不碰。卡片自己的事（item/expanded/layout/saveLayout/setHeight/where/ref/close/on/dispose）照留。 */
    if(typeof def.mount === 'function' && !def.__packMount){
      const raw = def.mount;
      def.mount = (body, mctx) => {
        const base = Object.assign({}, mctx);
        for(const k of ['store', 'settings', 'bus', 'theme', 'toast', 'modal', 'openCover', 'desk']) delete base[k];
        return raw.call(def, body, Object.assign(base, ctx));
      };
      def.__packMount = true;
    }
    const type = PACK_META[id].type || 'widget';
    /* 第一面 · 出错：主程序直接调插件的那几颗方法，在这儿一处兜住。
       为什么不包在调用点：调用点散在 fd3-shell.js 与 fd8-tools.js 里（def.mount 五处、def.settings 一处、
       def.expand 一处，外加 mount 交回来那颗 unmount），漏包一处就少挡一处。包在这儿 —— 登记表里那份 def
       就是宿主手里那一份，调用点一个字都不用改。
       原先真兜不住：全仓没有 window.onerror（2026-10-12 量的），一家在 mount 里抛，Shell.render()
       那张卡卡在这里，整张桌面画不下去。 */
    this.guard(id, def);
    if(type === 'tool') registerTool(def);
    else if(type === 'recipe'){ if(typeof Gen !== 'undefined') Gen.def(def); }
    else if(typeof registerWidget === 'function') registerWidget(def);
  },
  /* 「这一家出错了」那张卡面：装载失败和运行中出错共用这一份写法，别抄第二份 */
  errCard(id, msg, 哪一句){
    const nm = (PACK_META[id] && PACK_META[id].name) || id;
    return h('div', { class:'fd-empty' }, [
      h('div', {}, '「' + nm + '」' + 哪一句),
      h('div', { style:'font-size:.86em;opacity:.75;margin-top:4px' }, msg),
      h('div', { style:'font-size:.86em;opacity:.6;margin-top:4px' }, '要撤它就去插件管理那一屏卸载，或者用自己手里那一份包重装')
    ]);
  },
  /* ---------- 崩溃记录与"同一家连崩三次就别再叫它"（外46 批十一）----------
     那一格账：data\logs\崩溃.txt，一行一笔「时间 · 哪家 · 哪一面 · 一句原话」
     （docs\插件真隔离设计.md 第六节定的那四栏）。写这一行走的是页面上本来就有的那两颗通道
     （dataRead 读回来、拼上这一笔、dataWrite 写回去），所以 Electron 与新壳两棵都走得通，
     也不为此新添一颗通道、不动那张权限表。开发那台 http 服务器上没这两颗通道 —— 那时候
     只记内存里的账，不硬写盘（读不到、写不进都当没写，绝不因为记日志把程序带倒）。
     排成一队写：同一瞬间两家一起崩，后一笔不许把前一笔盖掉。 */
  崩次:new Map(),          /* id → 连着出错的次数（哪一颗方法顺利回来一次就归零） */
  停:[],                   /* 连崩到数、已经不再叫它的那几家 */
  崩队:Promise.resolve(),
  崩上限:3,
  /* 异步那一颗几秒没回来就记一笔"没回话"（隔离设计第六节那两个数里能测的那一个）。
     设计里那句「主程序每 N 秒问一次」在同一条页里做不到：一家把主线程绕死的话，
     问它的那支定时器跟它跑在同一条线程上，一起卡住 —— 那一半要等真隔离那一层（他 2026-10-12 说这两条路目前都不做）。 */
  卡住毫秒:6000,
  崩时间(){
    const d = new Date(), 零 = (n, w) => String(n).padStart(w, '0');
    return '[' + d.getFullYear() + '-' + 零(d.getMonth() + 1, 2) + '-' + 零(d.getDate(), 2) + ' '
      + 零(d.getHours(), 2) + ':' + 零(d.getMinutes(), 2) + ':' + 零(d.getSeconds(), 2)
      + '.' + 零(d.getMilliseconds(), 3) + ']';
  },
  /* 记一笔。返回的是"这一家到这儿一共连崩几次"，调用方拿它判要不要停。 */
  崩一笔(id, 哪一面, 原话){
    const 次 = (this.崩次.get(id) || 0) + 1;
    this.崩次.set(id, 次);
    const nm = (PACK_META[id] && PACK_META[id].name) || id;
    this.落一行('logs/崩溃.txt', this.一行(nm, 哪一面, 原话));
    return 次;
  },
  /* 那一行怎么写：时间 · 哪家 · 哪一面 · 一句原话（换行压成空格，一行就是一笔） */
  一行(名, 哪一面, 原话){
    return this.崩时间() + ' ' + 名 + ' · ' + 哪一面 + ' · ' + String(原话).replace(/[\r\n]+/g, ' ');
  },
  /* 往 logs 底下那一本接一行（读回来、拼上、写回去）：走的是页面上本来就有的那两颗通道，
     不为此新添通道、不动那张权限表。开发那台服务器上没这两颗 —— 就当没写，绝不因为记日志把程序带倒。
     排成一队写：同一瞬间两家一起出事，后一笔不许把前一笔盖掉。 */
  落一行(档, 行){
    const A = window.FD_APP;
    if(!A || typeof A.dataRead !== 'function' || typeof A.dataWrite !== 'function') return;
    this.崩队 = this.崩队.then(async () => {
      try{
        const 旧 = await A.dataRead(档);
        await A.dataWrite(档, (typeof 旧 === 'string' && 旧 ? 旧 : '') + 行 + '\n');
      }catch(e){ /* 写不成就算没写 */ }
    });
  },
  /* 顺利回来一次，连崩的账就归零 —— 钉的是"连续"两次字 */
  崩清零(id){ this.崩次.set(id, 0); },
  /* ---------- 开机后台那一趟自检（#32 那三种时机里的第一种 · 插件分离第 3 批 3.4）----------
     路径里每一家都拿它自己那份容器对一遍活着的那一格：对不上的写进 logs\包检查.txt
     （崩溃记录旁边那一本，明细一句一行），界面上只在插件管理那一行摆一枚标记。
     这一趟不打扰：不弹窗、不拦开机、也不替哪一家"补"东西；核不动（没壳、没那颗通道）就当没这趟。
     没有容器的那一家（文件夹或旧 zip 进来的）= 没得核，账上不留、一句都不记 —— #30 那条：一律不做缺失提示。 */
  包账:new Map(),            /* id → { ok, note, msg, 几处 }；只有真核过的才进这张表 */
  核得动(){ const A = window.FD_APP; return !!(A && typeof A.boxVerify === 'function'); },
  async 后台核包(){
    if(!this.核得动()) return this.包账;
    const A = window.FD_APP;
    const d = await this.disk(); if(!d) return this.包账;
    for(const p of (d.packs || [])){
      const id = String(p.id || ''); if(!id) continue;
      let r = null;
      try{ r = await A.boxVerify(id); }catch(e){ continue; }
      if(!r || r.packPresent === false) continue;      /* 没那份容器：不记、不摆、不当问题 */
      const 话 = (r.issues || []).map(x => x.msg).filter(Boolean);
      this.包账.set(id, { ok:!!r.ok, note:r.note || '', msg:r.msg || '', 几处:话.length });
      if(r.ok) continue;
      const nm = (PACK_META[id] && PACK_META[id].name) || (p.manifest && p.manifest.name) || id;
      const 明细 = (话.length ? 话 : [r.msg || '']).join(' ｜ ');
      this.落一行('logs/包检查.txt', this.一行(nm, '包检查', 明细));
    }
    return this.包账;
  },
  停了(id){ return this.停.indexOf(id) >= 0; },
  /* 到数了：把它从"再叫它"里摘出来，界面上给一句能在设置里处理的话 */
  判停(id, 次){
    if(次 < this.崩上限 || this.停了(id)) return false;
    this.停.push(id);
    const nm = (PACK_META[id] && PACK_META[id].name) || id;
    this.errs.set(id, '连着出错 ' + 次 + ' 次，已经不再叫这一家了');
    console.warn('组件「' + nm + '」连着出错 ' + 次 + ' 次，已经不再叫它（设置里可以关掉它，或改它那份代码）');
    return true;
  },
  /* 把插件那几颗会被宿主直接调的方法包一道。
     只包插件自己写了的那几颗 —— 没写的绝不去造一颗假的顶上：界面上那颗「设置」齿轮
     是按 def.settings 在不在画的，凭空补一颗就把每家都画上齿轮了。
     交回来的值原样交回，包这一层不改变任何返回值；只有抛错的时候才换。 */
  guard(id, def){
    if(def.__packGuard) return;
    def.__packGuard = true;
    const self = this;
    /* 抛错的那一家记在这一棵自己的 errs 表里（登记表已经冻住，不往它身上写字） */
    const note = (哪一颗, e) => {
      const msg = (e && e.message) || String(e);
      self.errs.set(id, '运行中「' + 哪一颗 + '」出错：' + msg);
      const 次 = self.崩一笔(id, 哪一颗, msg);
      self.判停(id, 次);
      console.warn('组件「' + ((PACK_META[id] && PACK_META[id].name) || id) + '」的「' + 哪一颗 + '」出错：' + msg);
      return msg;
    };
    const 卡住句 = () => '等它 ' + Math.round(self.卡住毫秒 / 1000) + ' 秒，这一家没回话';
    const wrap = (哪一颗) => {
      const raw = def[哪一颗];
      if(typeof raw !== 'function') return;
      def[哪一颗] = function(){
        if(self.停了(id)) return undefined;         /* 连崩到数：这一家不再叫 */
        try{
          const out = raw.apply(this, arguments);
          /* 只有同步的 try 接不到 reject —— 异步那一半也得接，不然「没人管」这条还在 */
          if(out && typeof out.catch === 'function'){
            /* 异步那一颗还得盯它几秒回不回话：回不了话的那一家同样是要报的 */
            let 完 = false;
            const 表 = setTimeout(() => {
              if(完) return;
              self.errs.set(id, '运行中「' + 哪一颗 + '」没回话：' + 卡住句());
              self.判停(id, self.崩一笔(id, 哪一颗, 卡住句()));
            }, self.卡住毫秒);
            return out.then(v => { 完 = true; clearTimeout(表); self.崩清零(id); return v; },
                            e => { 完 = true; clearTimeout(表); note(哪一颗, e); });
          }
          self.崩清零(id);
          return out;
        }catch(e){ note(哪一颗, e); }
      };
    };
    wrap('settings');
    wrap('expand');
    const rawMount = def.mount;
    if(typeof rawMount === 'function'){
      def.mount = function(){
        if(self.停了(id)){
          /* 不再叫它，但位子不能空着：立一张卡说清为什么这一家不画了 */
          const body = arguments && arguments[0];
          if(body && typeof body.appendChild === 'function'){
            body.innerHTML = '';
            body.appendChild(self.errCard(id, '这一家连续出错，可以在插件管理那一屏卸载它', '这个插件连续出错，已经不再叫它'));
          }
          return { unmount(){} };
        }
        let api;
        try{ api = rawMount.apply(this, arguments); }
        catch(e){
          const msg = note('mount', e);
          /* 抛了要把那一块容器擦干净：插件可能已经画了一半，留着就是半张残卡 */
          const body = arguments && arguments[0];
          if(body && typeof body.appendChild === 'function'){
            body.innerHTML = '';
            body.appendChild(self.errCard(id, msg, '这个插件运行中出错了'));
          }
          return { unmount(){} };
        }
        const out = (api && typeof api === 'object') ? api : {};
        const rawUnmount = out.unmount;
        /* 重画之前宿主一家家调它；原先 fd3-shell.js 那一处是 catch 掉不报，包在这儿才报得出是谁家 */
        if(typeof rawUnmount === 'function'){
          out.unmount = function(){
            if(self.停了(id)) return undefined;
            try{ const r = rawUnmount.apply(this, arguments); self.崩清零(id); return r; }
            catch(e){ note('unmount', e); }
          };
        }
        self.崩清零(id);
        return out;
      };
    }
  },
  /* 崩了的一家：错话留在这一棵自己的 errs 表里（登记表已经冻住，不往它身上写字），
     名单里照样看得见这一家，位子上立一张错误卡 */
  fail(id, e){
    const m = PACK_META[id];
    const msg = (e && e.message) || String(e);
    this.errs.set(id, msg);
    this.崩一笔(id, '装载', msg);
    console.warn('组件「' + ((m && m.name) || id) + '」没加载起来：' + msg);
    const nm = (m && m.name) || id;
    const draw = body => {
      body.appendChild(this.errCard(id, msg, '这个插件没加载起来'));
      return { unmount(){} };
    };
    const type = (m && m.type) || 'widget';
    try{
      if(type === 'tool') registerTool({ id, name:nm, card:{}, ready:null, mount:draw });
      else if(type !== 'recipe' && typeof registerWidget === 'function')
        registerWidget({ id, name:nm, minW:2, minH:2, def:{ w:4, h:2 }, mount:draw });
    }catch(e2){ console.warn('错误卡也没立起来：' + e2); }
  }
};

/* ============================================================
   Electron 桥的白名单发放（两个宿主共用这一把尺）
   ----------
   插件清单 appChannels 点名哪个方法，组件才拿得到哪一个；没点名的在它的上下文里根本不存在。
   还有一道硬地板：装卸、关于、树内文件、用户数据底层、窗口控制这些通道，
   就算哪份插件清单厚着脸皮点名也不给 —— 插件禁止清单第一节那一条从这里开始是机制，不是约定。
   找桥按「自己这一框 → 父框 → 顶框」往上问一圈：桥只注在 Flow-Desk 那一框，组件不管挂在桌面上
   还是停靠里，都在同一张页的同一框，问一次就中；音乐卡在桌面和停靠里连的是同一个桥。
   函数一律包一层再递（组件拿不到桥对象本身），非函数的属性（label：这一框是哪个程序）照原值带上。
   ----------
   2026-10-11 批六第一步整份重对了一遍：地板原来是 42 颗，而桥上一共 85 颗 —— 漏在里面的是
   会动盘、会动别人家东西、会起网络的那几颗：dataWipe（一键清空数据层）、appendPageFile 与
   pageFileExists（他文稿那一层的写与问）、backup 那一摊五颗（会往数据层以外写、还认外部目录）、
   libRead / libWrite / onLibChanged（词库跟着功能走，不该由别家直接写）、codeCatRename（整库改名）、
   webTitle（这一颗是出网的，插件要网得走明面的口径）、外加 setCloseChoice / systemMing / winState /
   onRebuild 那两颗 / onIcons。判据只有一条：这一颗是不是「宿主自己的事」—— 是就进地板。
   ============================================================ */
const APP_DENY = ['packList', 'packSet', 'packFile', 'packImport', 'packWipe', 'rebuild',
  'onRebuildDone', 'onRebuildStep',
  'compRead', 'compWrite', 'compDelete', 'boxInspect', 'boxVerify',
  'readPageFile', 'writePageFile', 'writePageBytes', 'appendPageFile', 'pageFileExists',
  'delPageFile', 'pagePath', 'pathOf',
  'dataRead', 'dataWrite', 'dataList', 'dataWipe', 'aboutInfo',
  'libRead', 'libWrite', 'onLibChanged', 'codeCatRename',
  'backupRun', 'backupCheck', 'backupLast', 'backupPick', 'backupRoots',
  'winCtl', 'winState', 'restartApp', 'closeChoice', 'setCloseChoice', 'systemMing',
  'openDir', 'iconsList', 'onIcons', 'dirTree', 'readText', 'fontList', 'onFontList',
  'ocrSwatch', 'imgPeek', 'imgOpen', 'dataDir', 'rimeDir', 'setRimeDir', 'webTitle'];
function packApp(ch){
  /* 桥就在这一张页的 window 上：从前组件装在另一个窗口里才需要隔框找，现在不用 */
  const A = (window.FD_APP && typeof window.FD_APP === 'object') ? window.FD_APP : null;
  if(!A) return null;                      /* 这一棵里没有主进程那层桥（本地开发那台服务器） */
  const out = {};
  for(const k of (ch || [])){
    if(APP_DENY.includes(k)){ console.warn('插件清单点名要「' + k + '」：这条通道不给组件，硬地板挡下'); continue; }
    if(typeof A[k] === 'function') out[k] = (...a) => A[k](...a);
    else if(k in A) out[k] = A[k];
  }
  return out;
}

/* ============================================================
   插件上下文 —— 组件能碰宿主的东西全从这儿递，ES module 里看不见宿主的任何全局名
   ----------
   两半分：
     · 两家同名同义的公共件（h / toast / Bus / State / Theme / mkBank …）由这份直接引用产物里的那个全局，
       组装进每一家的 ctx；
     · 各宿主不一样的那几样（设置、明文存储、封面、对话框、FD_APP 通道、剩下的小工具）
       由宿主开机时 PackCtx.parts({...}) 交上来，缺的项就不摆。
   数据门按插件清单来：
     kv / settings 只认 manifest.kvKeys 点名的键（外加 pack.<id>. 打头的新键）；
     state 只认自己名字打头的键，外加 manifest.stateKeys 点名的那些前缀
       （音乐遥控器存的是 music-dir / music-ly 这一串，包 id 叫 music-remote，挡不住 —— 就写进插件清单）；
     store 只读写 manifest.dataKeys 点名的文件；
     app 只开 manifest.appChannels 点名的方法。
   ============================================================ */
const PackCtx = {
  frag:{},
  parts(f){ Object.assign(this.frag, f); return this; },
  make(id){
    const m = PACK_META[id] || {};
    const F = this.frag;
    const nm = m.name || id;
    const kvOk = k => (m.kvKeys || []).includes(k) || String(k).startsWith('pack.' + id + '.');
    const stOk = k => { const s = String(k); return s === id || s.startsWith(id + '-') || s.startsWith(id + '.') || s.startsWith('pack.' + id + '.')
      || (m.stateKeys || []).some(p => s.startsWith(String(p))); };
    const deny = what => { throw new Error('组件「' + nm + '」' + what + '，插件清单没带它'); };
    const ctx = {
      pack:{ id, name:nm, version:m.version, author:m.author, source:m.source, where:m.where, desc:m.desc, type:m.type || 'widget' },
      el:h,
      icon:typeof icoMarkup === 'function' ? icoMarkup : () => '',
      toast:typeof toast === 'function' ? toast : () => {},
      copyBtn:typeof copyBtn === 'function' ? copyBtn : null,
      bus:Bus,
      /* 色位（slotColor）：第三方组件读标记色只借这一个（取值口径在 _shared/sh-packs.js，
         外13-N 起它接的是用户在 设置·外观 里自定义的那一串标记色，组件只读不重算）。
         色位的「具体色号」另一半（slotHex(i)）：slotColor 回的是 var(--mark-N, …) 那一句 CSS，
         有的组件要存的就是色号本身（日程「新建标签」的默认色就是这一种），所以明面开这一个；
         编号、兜底都跟 slotColor 同一个口径，取数在 sh-packs 里复用 markHexes / markCount，
         不另抄算式 —— 插件自己照样不许抓 window.FD_MARKS 或根元素上的样式。
         标记色本体不住在加载器里：markVar / markSlots 这些是宿主与为写共用的顶层小工具，
         由 _shared 直接摆进整页作用域，加载器不替它们开后门——所以这一节不再逐个往 ctx 上挂。 */
      slotColor:typeof slotColor === 'function' ? slotColor : null,
      slotHex:typeof slotHex === 'function' ? slotHex : null,
      theme:typeof Theme !== 'undefined' ? Theme : null,
      kv:{
        get:async (k, fb) => { if(!kvOk(k)) deny('要读的键「' + k + '」'); return F.kv.get(k, fb); },
        put:async (k, v) => { if(!kvOk(k)) deny('要写的键「' + k + '」'); return F.kv.put(k, v); },
        del:async (k) => { if(!kvOk(k)) deny('要删的键「' + k + '」'); return F.kv.del(k); }
      },
      state:{
        get:async (k, fb) => { if(!stOk(k)) deny('要读的表单键「' + k + '」'); return State.get(k, fb); },
        set:(k, v) => { if(!stOk(k)) deny('要写的表单键「' + k + '」'); return State.set(k, v); }
      },
      /* 词库跟着包走：插件清单点了哪份，就只能拿哪份 */
      bank:which => {
        const b = m.bank;
        if(!(b && b.which === which)) deny('词库「' + which + '」');
        return mkBank(which);
      },
      banks:Banks,
      /* 自带样式：贴到宿主 head 上的一块，节点认得是谁家的，卸了包刷新就没了 */
      style:css => {
        let s = document.querySelector('style[data-pack="' + CSS.escape(id) + '"]');
        if(!s){ s = document.createElement('style'); s.setAttribute('data-pack', id); document.head.appendChild(s); }
        s.textContent += (s.textContent ? '\n' : '') + css;
      },
      /* 后台通道：插件清单 appChannels 点了哪几个才发哪几个（发放那把尺在上面，两个宿主共用）；
         这一棵里没有桥（本地开发那台服务器没有主进程）就是 null，组件里那句「这条通道没有」的分支照常走 */
      app:(F.app || packApp)(m.appChannels || [])
    };
    if(F.settings) ctx.settings = {
      get:(k, fb) => { if(!kvOk(k)) deny('设置项「' + k + '」'); return F.settings.get(k, fb); },
      set:(k, v) => { if(!kvOk(k)) deny('要写的设置项「' + k + '」'); return F.settings.set(k, v); }
    };
    if(F.store){
      const ok = f => (m.dataKeys || []).includes(String(f));
      ctx.store = {
        loadJSON:async (f, fb) => { if(!ok(f)) deny('数据文件「' + f + '」'); return F.store.loadJSON(f, fb); },
        saveJSON:(f, o) => { if(!ok(f)) deny('要写的数据文件「' + f + '」'); return F.store.saveJSON(f, o); },
        saveSetting:async (k, v) => { if(!kvOk(k)) deny('要写的设置键「' + k + '」'); return F.store.saveSetting(k, v); },
        loadSetting:async (k, fb) => { if(!kvOk(k)) deny('要读的设置键「' + k + '」'); return F.store.loadSetting(k, fb); }
      };
    }
    if(F.cover) ctx.cover = F.cover;
    if(F.dialog) ctx.dialog = F.dialog;
    /* 删之前问那一句由宿主这一枚包好交出去（外27 全清第 5 条）：组件不许自己搭确认框 ——
       从前日程、便签、金句三家各抄了一份逐字相同的 ask，问话排版和钮的次序要四处同步。 */
    if(F.ask) ctx.ask = F.ask;
    /* 两家产物里同名同义的小工具：直接带上，不算越界也不做门 */
    if(typeof shSplit === 'function'){ ctx.shSplit = shSplit; ctx.shSplitKey = shSplitKey; }
    /* 歌词的时值尺不再由这一头发下去（插件分离第 4 批 4.7 · #34）：从前音乐遥控器与为写共读
       _shared/sh-ttml.js 那一份，插件拿不到整页作用域的顶层名字，所以随 ctx 发一手。
       现在各家自己一份（为写 src/_wnw/src/w18-ttml.js、音乐遥控器 data\plugins\music-remote\ttml.js），
       两边算得对不对由 src/tools/probes/gate-lyric46.mjs 拿同一份歌词对账，不靠共用。 */
    /* 播放时钟（遥控器往里填、词格读，见 _shared/sh-mus.js）：组件递进来的是同一个对象，
       它填的那一份和为写读的那一份必须是同一个东西，所以这里原样交对象、不包一层。 */
    if(typeof MusClock !== 'undefined') ctx.mus = MusClock;
    /* 标签歌词那一格的读者位（见 _shared/sh-mus.js 末了那一段）：音乐遥控器把自己的读者挂上来，
       词格从同一格取 —— 字节解析只在那一家里有一份。 */
    if(typeof MusTag !== 'undefined') ctx.tag = MusTag;
    if(typeof randInt === 'function'){ ctx.randInt = randInt; ctx.pickOne = pickOne; ctx.shuffle = shuffle; }
    /* 宿主补的零碎小工具（日期格式、量字号、分词那套）：原样并进来，不做门 */
    if(F.more) Object.assign(ctx, F.more);
    return ctx;
  }
};
