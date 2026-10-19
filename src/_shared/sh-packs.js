/* ============================================================
   插件契约（中立模块）· FD 和 WNW 共用这一份

   外壳是一副空骨架，功能全在 data\plugins\<id>\ 里。
   页面开机时由加载器（_shared/sh-load.js）按 off.json 那份「卸掉的」名单，
   一家家 import 各自的 main.js，顺手把插件清单（id / 名字 / 作者 / 来源 / 版本 / 数据文件）
   填进下面这份 PACK_META —— 插件清单不再拼进产物，名单里没它、这一轮就没加载它，功能就没有。

   这一节只提供三种底座能力：
   1) Packs      —— 问"这个功能装了吗 / 它的插件清单怎么写"
   2) SetupTabs  —— 设置面板左边那一列标签的登记表，功能想加一档就来自注册，
                    外壳不再硬写一张名单（硬写的名单会把功能的代码拽进外壳）
   3) 共用小工具  —— 色位、组件名这些被两个以上功能借走的东西，放底座，不放某个包里
   ============================================================ */

/* 插件清单表：运行时由加载器一家家填进来（填的字段和构建那把尺 _build/packs.mjs 同一个口径）。
   没加载上的时候它就是空的（这一轮名单里没有这几家），
   空的意思是"什么都不拦"：开发时手改插件文件、这一轮一家也没加载上，不至于把外壳跑不起来 */
const PACK_META = {};

const Packs = {
  has(id){ return !!PACK_META[id]; },
  info(id){ return PACK_META[id] || null; },
  /* 当前产物里装了哪些：按 order 排，同序按 id，界面列出来永远是同一个次序 */
  list(){
    return Object.keys(PACK_META).map(k => Object.assign({ id:k }, PACK_META[k]))
      .sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  },
  /* 这个功能在 userdata 里占了哪几个键，删除时勾了「同步清除数据」才用得上 */
  dataKeys(id){ const m = this.info(id); return (m && m.dataKeys) || []; },
  kvKeys(id){ const m = this.info(id); return (m && m.kvKeys) || []; },
  /* 数据层根（data\）那一侧、由这一家自带的路径 —— 自带词库那种（<包名>-bank/data.txt）。
     词库跟着功能走：功能从产物里摘掉了，勾了同步清除数据才把这些一起带走。 */
  sharedKeys(id){ const m = this.info(id); return (m && m.sharedKeys) || []; },
  /* 备份 / 搬家要带上哪些明文文件：外壳自己的那几个由调用方给，
     后面加上每个装着的包自己点名的。外壳不认识「便签」「日程」这些名字，
     也就不会因为哪个包被卸了还去读它的文件。 */
  dataFiles(base){
    const out = (base || []).slice();
    for(const m of this.list()) for(const k of (m.dataKeys || [])) if(!out.includes(k)) out.push(k);
    return out;
  },
  /* 名字：包的插件清单最准，其次问注册表，最后退回 id 本身 */
  name(id){
    const m = this.info(id); if(m && m.name) return m.name;
    const t = (typeof Registry !== 'undefined' ? Registry.get('tool-' + id) : null)
      || (typeof Registry !== 'undefined' ? Registry.get(id) : null);
    return (t && t.def && t.def.name) || id;
  }
};

/* ---------- 设置面板的标签登记 ----------
   add 的第三参：order 决定这一档排在哪儿（外壳给常驻那几档留了 10 的档距，
   功能包挑一个空档插进去就行）；when 是这道档该不该露面，每次开面板现问。
   row 不另开一档，只往已有那档下面垫一段 —— 「组件」这一档里的 RP 地址、
   音乐文件夹就是各家的包自己垫进来的，外壳不知道有几家、叫什么。 */
const SETUP_TABS = [];
const SETUP_ROWS = [];
const SetupTabs = {
  add(name, build, opt){
    const o = opt || {};
    if(!SETUP_TABS.some(t => t.name === name)) SETUP_TABS.push({ name, build, order:o.order || 0, when:o.when || null });
    return this;
  },
  row(tab, build, opt){
    const o = opt || {};
    SETUP_ROWS.push({ tab, build, order:o.order || 0, when:o.when || null });
    return this;
  },
  list(){
    return SETUP_TABS.filter(t => !t.when || t.when())
      .slice().sort((a, b) => a.order - b.order);
  },
  rowsOf(tab){
    return SETUP_ROWS.filter(r => r.tab === tab && (!r.when || r.when()))
      .slice().sort((a, b) => a.order - b.order);
  }
};

/* ---------- 被两个以上功能借走的共用小件 ---------- */
/* ---------- 标记色（外13-N）----------
   用户在 设置 · 外观 里自己定的那一串颜色，数量 3~20，住在 Flow-Desk 的 外观存档 里
   （不在 色卡、也不在 外观方案 里 —— 换配色、换外观模式、换明暗都不会重算它，这是这一档的立身之本）。
   真身是色号，界面上取的是根元素上那串 --mark-N：由 Flow-Desk 那头 Theme.apply 一次写一遍
   （fd3-shell.js 的 Marks），这里只负责「取值 + 宿主还没钉上时退回配色里那五个强调位」，
   免得单独开的那一页、或标记色还没落值的第一帧，圆点和条子空成一片白。
   色位（slotColor）走的是同一个口径：日程的轨道色、便签的左边一条、WNW 的标签色点都借它，
   所以标记色一定义，这几处当场跟着换成用户自己挑的那一串。 */
const MARK_MIN = 3, MARK_MAX = 20;
/* 配色方案里强调位的个数（--slot-1 … --slot-5）。从前这个 5 和「那一排取值串」在为写那边硬抄了两份
   （书架封面钉色一排、设定卡挑色一排），改一处只生效一半，所以个数和那一排都收在这一处。 */
const ACCENT_N = 5;
/* 从宿主那一头问当前这一串标记色的色号；问不到（没定过 / 不在 Flow-Desk 里）回空数组 */
function markHexes(){
  const M = typeof window !== 'undefined' ? window.FD_MARKS : null;
  const raw = M && typeof M.hexes === 'function' ? M.hexes() : [];
  return (Array.isArray(raw) ? raw : []).filter(x => /^#[0-9a-f]{6}$/i.test(String(x))).slice(0, MARK_MAX);
}
/* 当前有几个：一个也没定过时按配色那五个强调位摆，名单不能空 */
function markCount(){ return markHexes().length || ACCENT_N; }
/* 第 k 个（从 1 数）标记色在用户定下来之前接在配色第几号强调位后面 */
function markBase(k){ return ((k - 1) % ACCENT_N) + 1; }
/* 第 i 个（从 0 数起）的取值那一句。本体 --mark-N 写的就是用户存的那个色号，永远不经过派生，
   所以「标记色不随方案变动」这条不受影响；取不到时接配色那一档的强调位 --slot-M 兜底。
   dflt 是两层都取不到时兜底的那一句（组件里老算式 color-mix 那一档要留在最里层）。
   从前这儿还带一个 kind 参数去取同伴那一档（-dot / -bar / -bar-text / -cover / -cover-ink），
   全代码没有一处传过它，也没有一处读 --mark-N 带后缀的那几枚变量 ——
   每回上色白推几十档对比度。外27 全清第 6、10 条把那一整档撤了；
   色位那一头的同伴（--slot-N-dot 等）有人吃，仍由 sh-look.js 照常算。 */
function markVar(i, dflt){
  const n = markCount();
  const k = ((Math.max(0, Math.round(+i || 0)) % n) + 1);
  const inner = 'var(--slot-' + markBase(k) + (dflt ? ', ' + dflt : '') + ')';
  return 'var(--mark-' + k + ', ' + inner + ')';
}
/* markIndexOf(存过的取值串)：把从前钉过 'var(--slot-3)' 那一种老串、或 1 起的编号数字，
   一律归成「当前这一串标记色里的第几个」（0 起），认不出来回 -1。
   它只是挑色界面判断「哪一个正亮着」用的读数器——不改写存档、不迁移老数据（老串照旧能画，
   因为配色那一档的 --slot-N 永远由外观层钉着）。用户在这儿新挑一个时，存下去的是 markVar 生成的
   那一句 var(--mark-N …)，于是这个跟着全局走。 */
function markIndexOf(v){
  if(typeof v === 'number' && isFinite(v)) return ((Math.max(1, Math.round(v)) - 1) % markCount());
  if(typeof v !== 'string' || !v) return -1;
  const m = /--(?:mark|slot)-(\d+)/.exec(v);
  if(!m) return -1;
  const n = markCount();
  return ((Math.max(1, +m[1]) - 1) % n);
}
/* 一整排可选的标记色（挑色那几处界面直接摊开这一串用） */
function markSlots(){ return Array.from({ length:markCount() }, (x, i) => markVar(i)); }
/* 一整排配色方案的强调位取值。和上面那排标记色两回事：标记色是用户自己定的、换配色方案不重算，
   这一排换方案就跟着换 —— 存进存档的就是这一排的串。
   从前为写那边把它硬抄了两份（书架封面钉色一排、设定卡挑色一排），现在都吃这一个。 */
function accentSlotVars(){ return Array.from({ length:ACCENT_N }, (x, i) => 'var(--slot-' + (i + 1) + ')'); }
/* 色位：日程的轨道色、便签的左边一条、WNW 的标签色点都吃这一个口径（外13-N 起吃的是标记色） */
function slotColor(i){ return markVar(i); }
/* slotHex(i)：和 slotColor 同一个口径、同一个编号（从 0 数、绕回）的另一半 —— 回的是「具体色号」，
   不是 var(--mark-N, …) 那一句 CSS 取值串。为什么要它：有的组件存的就是色号本身（比如日程「新建标签」
   的默认色，存下后还能单独改），那句 CSS 串存不得；从前宿主只开了 slotColor，组件只好去配色强调位抠。
   兜底跟 markVar 同一个思路：先问用户定的那一串（markHexes，宿主明面的通道，组件不许自己抓）；
   宿主还没钉上 / 那一串没定时按 markBase 接在配色强调位后面；连配色都读不着就回一个画得出来的出厂强调色 ——
   永远回合法色号，不回 undefined、不抛错。Theme.tokens() 两端口径不一样：FD 回 {tokens:{…}}，为写直接回平表。 */
function slotHex(i){
  const n = markCount();
  const k = ((Math.max(0, Math.round(+i || 0)) % n) + 1);
  const xs = markHexes();
  if(xs[k - 1]) return xs[k - 1];
  try{
    const T = typeof Theme !== 'undefined' ? Theme : null;
    const q = T && typeof T.tokens === 'function' ? T.tokens() : null;
    const t = q && (q.tokens || q);
    const hex = v => /^#[0-9a-f]{3,6}$/i.test(String(v || '')) ? String(v) : null;
    return hex(t && t['--slot-' + markBase(k)]) || hex(t && t['--accent']) || '#7aa7e8';
  }catch(e){ return '#7aa7e8'; }
}

/* ============================================================
   装 / 卸 · 页面只认这一条通道（FD 卡和 WNW 停靠共用，两端对等）

   改的是那一份名单：data\plugins\off.json —— 记的是「被卸掉的」那几家，不是「装了哪些」。
   代码不拼在产物里（运行时一家家 import），所以名单只管「这一轮加载不加载它」：
   名字在 off 里的那一家，下一次开机不 import 它的 main.js —— 桌面上那张卡、设置里它垫的那几行跟着没了，
   包本身一个字不动地留在 data\plugins\<id>\ 里，随时装得回来。
   反过来也成立：往 data\plugins\ 里丢一个文件夹（或一个 zip，开机由主进程摊开），重启就生效，不用在这儿点一次。

   两步连着一趟：改名单 → 刷新这一页。重新生成页面那一趟只留给改了 src\ 的情况，装卸不叫它。
   ----------
   两条通道做的是同一件事，落在同一层（data\plugins\）：
     · Flow-Desk 程序 → 主进程的 packList / packSet / packImport / packWipe；
     · 本地开发那台 http 服务器 → 同一个 comp-files.cjs 挂在 /_comp 上（下面 DevPacks 那一份）。
   装卸走的名单在磁盘上，两条通道改的是同一份文件。
   ----------
   自有容器（插件分离第 3 批 3.4）：压好的那一种包现在是自家格式（.fdpkg），zip 仍认（旧的那一份运输形状）。
   页面上只多两件事：安装那一道多一颗「挑自家格式的包」、扫描回来的 kind 多一种 'box'；
   谁读得动、哪一块对不上号、装不装得进来 —— 全由壳里那一层判，这一头不改写句子（那七句原话在 pack_box）。
   ============================================================ */
/* 自有容器那一位后缀：页面这一头只这一处写着它（壳里那一头是 pack_box::带点后缀，两头各一枚，不互抄） */
const 容器后缀 = '.fdpkg';
/* 开发那台服务器的两条通道：递过去的形状和主进程那两条回的一模一样，页面不用分叉 */
async function compPost(body){
  try{
    const r = await fetch('/_comp', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) });
    return await r.json();
  }catch(e){ return { ok:false, msg:'本地服务器没接上：' + ((e && e.message) || e) }; }
}
const DevPacks = {
  packList(){ return compPost({ op:'dirs' }); },
  /* 传 null = 删掉这份名单文件（没这份文件就全当装了）：主进程那条也是这个口径 */
  packSet(ids){ return compPost({ op:'installed', set:ids === null ? null : Array.from(ids || []) }); }
  /* 导入（要解压 zip）和清数据（要删 plugins 之外的文件）这两条只挂在主进程那边：
     插件导入请用 Flow-Desk 程序 —— 开发服务器只把这一格里的代码读写和名单接了出来。 */
};
const PackOps = {
  host(){
    const A = window.FD_APP;
    if(A && typeof A.packList === 'function' && typeof A.packSet === 'function') return A;
    return DevPacks;
  },
  can(){ return !!this.host(); },
  /* 导入这一条只有主进程有：开发服务器只接了名单和这一格的文件，那两个选文件的按钮不摆 */
  canImport(){ const A = this.host(); return !!(A && typeof A.packImport === 'function'); },
  /* 这一页是哪个宿主：两个程序扫的是同一批目录，各自只挑 host 里写了自己的那几个 */
  self(){
    const w = String((window.FD_APP && window.FD_APP.which) || '').toLowerCase();
    if(w.indexOf('wnw') >= 0) return 'wnw';
    if(w.indexOf('rp') >= 0 || w.indexOf('rime') >= 0) return 'rp';
    return (typeof PackLoader !== 'undefined' && PackLoader.host) || 'fd';
  },
  forHost(m){ const h = (m && m.host) || ['fd']; return h.indexOf(this.self()) >= 0; },
  /* 磁盘上这一层有什么：{ dir, packs:[{id,kind,manifest}], off:[…] }；读不到回 null */
  async disk(){
    const A = this.host(); if(!A) return null;
    const r = await A.packList();
    if(!r || r.ok === false || r.error) return null;
    return r;
  },
  /* 这一轮该加载的那几家 = 这一层里有的、又不排在 off 里的。
     off 缺省（还没装卸过）= 一家都没卸，扫到的全生效 —— 新克隆的那一棵不该缺东西。 */
  async ids(){
    const d = await this.disk(); if(!d) return null;
    const off = new Set((Array.isArray(d.off) ? d.off : []).map(String));
    return (d.packs || []).filter(p => !off.has(String(p.id))).map(p => String(p.id));
  },
  /* 这一层里有、这一轮没加载的那些包 —— 「加载」那一颗列出来的就是它们 */
  async unloaded(){
    const d = await this.disk(); if(!d) return [];
    const inLoad = new Set(Packs.list().map(m => m.id));
    const out = [];
    for(const p of d.packs){
      const m = p.manifest; if(!m || inLoad.has(p.id)) continue;
      if(m.host && m.host.indexOf(this.self()) < 0) continue;
      out.push({ id:p.id, name:m.name || p.id, author:m.author || '', source:m.source || '',
        version:m.version || '', desc:m.desc || '', icon:m.icon || '', order:m.order,
        dataKeys:m.dataKeys || [], kvKeys:m.kvKeys || [], sharedKeys:m.sharedKeys || [],
        bank:m.bank || null, assets:m.assets || {}, host:m.host || [],
        where:p.kind === 'zip' ? p.id + '.zip' : p.kind === 'box' ? p.id + 容器后缀 : p.id + '/', kind:p.kind });
    }
    return out;
  },
  /* ---------- 顶上那条进度条：单例，装卸这两步各占一格 ---------- */
  bar: {
    el:null, fill:null, txt:null, off:null,
    ensure(){
      if(this.el && document.body.contains(this.el)) return this.el;
      const f = document.createElement('i');
      f.style.cssText = 'display:block;height:100%;width:0%;background:var(--accent,#4a7ad0);border-radius:inherit;transition:width .25s';
      const t = document.createElement('span');
      t.style.cssText = 'font-size:12px;line-height:1.4;color:var(--text,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw';
      const el = document.createElement('div');
      el.setAttribute('data-packbar', '1');   /* 探针认这个，不靠位置猜 */
      el.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:2147483000;' +
        'display:grid;gap:6px;padding:9px 14px;border-radius:var(--r-card,5px);background:var(--card-bg,rgba(255,255,255,.94));' +
        'box-shadow:var(--sh-float,0 10px 30px rgba(0,0,0,.22));pointer-events:none';
      el.appendChild(t);
      const rail = document.createElement('div');
      rail.style.cssText = 'height:4px;border-radius:var(--r-pill,5px);background:var(--hair-color,var(--line,rgba(0,0,0,.12)));overflow:hidden';
      rail.appendChild(f); el.appendChild(rail);
      document.body.appendChild(el);
      this.el = el; this.fill = f; this.txt = t;
      return el;
    },
    show(text, pct){
      const el = this.ensure();
      this.txt.textContent = text || '处理中…';
      this.fill.style.width = Math.max(2, Math.min(100, pct || 0)) + '%';
      el.style.display = '';
    },
    hide(){ if(this.el) this.el.style.display = 'none'; }
  },
  /* 刷新这一页：名单改了、插件自己的代码存了，都靠这一趟落地 */
  reloadPage(note){
    this.bar.show(note || '这就刷新这一页', 100);
    setTimeout(() => { this.bar.hide(); location.reload(); }, 500);
  },
  /* 只写名单、不刷新这一页：新建 / 导入那一路自己会重载那一家，不用整页翻 */
  async write(ids){
    const A = this.host();
    try{ return (await A.packSet(Array.from(new Set(ids)))) || { ok:false, msg:'没回话' }; }
    catch(e){ return { ok:false, msg:String((e && e.message) || e) }; }
  },
  /* 写名单 + 刷新这一页，一步到位；成功返回 true（页面马上就刷新了，调用方不用再画） */
  async apply(ids, note){
    const A = this.host();
    this.bar.show(note || '改名单…', 20);
    let r = { ok:false, msg:'没接上' };
    try{ r = (await A.packSet(Array.from(new Set(ids)))) || r; }
    catch(e){ r = { ok:false, msg:String((e && e.message) || e) }; }
    if(!r || r.ok === false){ this.bar.hide(); toast('名单没写进去：' + ((r && r.msg) || '')); return false; }
    this.reloadPage('名单改好了 · 这就刷新这一页');
    return true;
  },
  /* 勾了「同步清除数据」才走到这儿：包自己点名的明文文件 + 它占的那几个键，一样样清。
     包本身（data\plugins\<id>\ 或 <id>.zip）一个字都不动。
     sharedKeys 走主进程另一把尺（数据层根那一侧，词库底本那种），plugins\ 它不碰。 */
  async wipe(id, meta){
    const A = this.host();
    const keys = (meta && meta.dataKeys) || Packs.dataKeys(id);
    const kvs = (meta && meta.kvKeys) || Packs.kvKeys(id);
    const shared = (meta && meta.sharedKeys) || Packs.sharedKeys(id);
    if(A && typeof A.packWipe === 'function' && (keys.length || shared.length)){
      const r = await A.packWipe(keys, shared);
      if(r && r.ok === false) toast('数据没清干净：' + (r.msg || ''));
    } else if(keys.length || shared.length){
      toast('清数据这一条只在 Flow-Desk 程序里有 · 那 ' + (keys.length + shared.length) + ' 份还留着，名单已经改好');
    }
    if(kvs.length && typeof H === 'function'){
      for(const k of kvs){ try{ await H().kv.del(k); }catch(e){} }
    }
  },
  /* ---------- 四个动作（#30 · 2026-10-15 定名）----------
     安装 = 把包放进插件路径（放进来才出现在这一屏，装完不自动加载）
     加载 = 请进使用页（Flow-Desk 那边下一趟开机就给它摆一张卡）
     卸载 = 从使用页撤下来（包留在路径里，随时再加载）
     删除 = 把包从路径里彻底清掉（文件一起没，界面上不再有这一行）
     四个动作各管一段，谁也不越到谁那儿：改名单的不碰盘，碰盘的先把名单摘干净。 */
  /* 加载一个：名单里加上它，然后刷新这一页（加载器下一轮就 import 它） */
  /* 加载那一下先核一遍（#32 那三种时机里的第二种）：拿这一家自己那份容器对一遍活着的那一格。
     对不上就不请它进使用页，把壳里那一句原话摆出来 —— 报不动手：不改包、不抹文件、不"顺手修好"。
     没那份容器（文件夹或旧 zip 进来的）= 没得核，照旧放行；本地开发那台服务器没这颗通道，也照旧放行。 */
  async 核一下(id){
    const A = this.host();
    if(!A || typeof A.boxVerify !== 'function') return { ok:true };
    const r = await A.boxVerify(String(id));
    return (r && r.packPresent === false) ? { ok:true } : (r || { ok:true });
  },
  async load(id){
    const cur = await this.ids();
    if(!cur){ toast('插件名单读不到 · 这台机器上还没有放进插件文件夹的安装包'); return false; }
    if(cur.includes(String(id))) return true;         /* 已经加载着，不用再走一趟 */
    const 核 = await this.核一下(id);
    if(!核.ok){
      toast('这一家与它那份包对不上 · 先不加载：' + (核.msg || ''), true);
      return false;
    }
    return this.apply(cur.concat([id]), '加载「' + Packs.name(id) + '」· 改名单…');
  },
  /* 卸载一个：名单里去掉它，顺手（按勾选项）清数据，然后刷新这一页 */
  async unload(id, opt){
    const o = opt || {};
    const cur = await this.ids();
    if(!cur){ toast('插件名单读不到 · 这台机器上还没有放进插件文件夹的安装包'); return false; }
    if(o.wipe) await this.wipe(id);
    return this.apply(cur.filter(x => x !== id), '卸载「' + Packs.name(id) + '」· 改名单…');
  },
  /* 删除一个：先把路径里那一格连文件一起抹掉，抹成了才去名单里摘它 ——
     反过来的话，抹不掉就成了"名单说它该加载、盘上却没有这一格"，下一轮开机白跑一趟。
     落点由主进程那把尺查过：只认 data\plugins\<包名>\ 与同名那颗 <包名>.zip，跑出这一层一律不删。 */
  async remove(id, opt){
    const o = opt || {};
    id = String(id);
    const cur = (await this.ids()) || [];
    const A = this.host();
    if(o.wipe) await this.wipe(id);
    let r = null;
    if(A && typeof A.compDelete === 'function') r = await A.compDelete(id);
    else r = await compPost({ op:'delete', id });
    if(!r || r.ok === false){
      this.bar.hide();
      toast('那个文件夹没删掉：' + ((r && r.msg) || '主进程没回话'));
      return false;
    }
    /* 名单里没有它就别再多写一趟（多写一次就是白翻一次页） */
    if(!cur.includes(id)){ this.reloadPage('删好了 · 这就刷新这一页'); return true; }
    return this.apply(cur.filter(x => x !== id), '删掉「' + Packs.name(id) + '」· 改名单…');
  },
  /* 导入一个包：一条通道，压好的 zip、自家格式的容器与解开的文件夹都认（看挑到的那一个长什么样） */
  async importOne(kind){
    const A = this.host();
    if(!this.canImport()){ toast('导入插件只在 Flow-Desk 程序里有'); return false; }
    let h = null;
    /* 挑文件那两道框都放开"什么都能挑"：收不收由壳里那把尺按后缀判，界面上不许当第二把尺 */
    const 挑 = async () => {
      const 列 = await window.showOpenFilePicker({ multiple:false, excludeAcceptAllOption:false,
        types:[{ description:'Flow-Desk 的包', accept:{ 'application/octet-stream':['.zip', 容器后缀] } }] });
      return 列.find(Boolean);
    };
    try{
      h = kind === 'dir' ? (window.showDirectoryPicker ? await window.showDirectoryPicker({ id:'fd-pack-dir' }) : null)
        : (window.showOpenFilePicker ? await 挑() : null);
    }catch(e){ return false; }   /* 用户按了取消 */
    if(!h){ toast('这一版选不了' + (kind === 'dir' ? '文件夹' : '文件')); return false; }
    const src = (typeof A.pathOf === 'function' && A.pathOf(h)) || h._p || '';
    if(!src){ toast('拿不到那个安装包的完整位置'); return false; }
    this.bar.show('在把这个包收进插件库…', 6);
    const r = await A.packImport({ src });
    if(!r || r.ok === false){ this.bar.hide(); toast('导入没成：' + ((r && r.msg) || '')); return false; }
    /* #298：这一家落盘了先扫它自己那一格 —— 用到了库里没有的功能模块 / 判断逻辑就问一句要不要提取，
       问完再改名单刷新（刷新会把这一页整页换掉，所以必须排在前面） */
    if(typeof genPendingScanPack === 'function'){
      try{ await genPendingAsk(await genPendingScanPack(r.id)); }catch(e){}
    }
    /* 装完不自动加载（#30 那条）：包进了路径，这一轮先不请它 —— 名单里把这一格记成「不加载」，
       然后刷新这一页让它出现在这一屏上，要用人家再按「加载」。 */
    const cur = (await this.ids()) || [];
    return this.apply(cur.filter(x => x !== r.id), '收进插件路径「' + (r.name || r.id) + '」· 改名单…');
  },
  /* ---------- 这一屏上那四颗钮 ----------
     「安装」是屏幕级的一颗（把包放进路径，放进来才有这一行）；
     「加载 / 卸载 / 删除」每一行一颗，用在谁身上写得明白。
     四颗一律摆出来（他 2026-10-17 issue #56：安装那颗要始终在，每一行那三颗也要始终在）——
     这一台读不到插件路径、或这一条通道不在，按下去把话说明白，不靠把钮藏起来当提示。
     Flow-Desk 的「插件管理」与为写的「打开内容」都调这几颗，两端的入口一个都不差。 */
  这一台能使(){ if(this.can()) return true; toast('这台机器找不到插件文件夹', true); return false; },
  loadButton(id, name){
    return h('button', { class:'wnw-btn mini', title:'请进使用页（改名单 + 刷新这一页）' + (name ? ' · ' + name : ''),
      html:icoMarkup('run') + '加载', onclick:async () => { if(this.这一台能使()) await this.load(id); } });
  },
  unloadButton(id, after){
    return h('button', { class:'wnw-btn mini', title:'从使用页撤下来 · 安装包留在插件文件夹里，随时可以再加载',
      html:icoMarkup('eject') + '卸载', onclick:() => { if(this.这一台能使()) this.unloadAsk(id, after); } });
  },
  removeButton(id, after){
    return h('button', { class:'wnw-btn mini', title:'把这个插件连文件一起从插件文件夹里清掉（删之前问一句）',
      html:icoMarkup('trash') + '删除', onclick:() => { if(this.这一台能使()) this.removeAsk(id, after); } });
  },
  /* 屏幕上那颗「安装」：挑一个包放进来（压好的 zip 或解开的文件夹都认） */
  installButton(){
    return h('button', { class:'wnw-btn mini', title:'挑一个安装包放进插件文件夹（装完先不加载，要用了再按「加载」）',
      html:icoMarkup('install') + '安装',
      onclick:() => { if(!this.canImport()){ toast('导入插件只在 Flow-Desk 程序里有', true); return; } this.installAsk(); } });
  },
  /* ---------- 更新那一道（他 2026-10-17 定的形状，2026-10-18 当面把名字定为「更新」）----------
     新的那颗包丢进插件路径 → 进软件时提醒一句 → 在这一行点「更新」→ 那一格换成包里的内容、那颗包删掉。
     判"值不值得提醒"只看号不一样（号上那一截构建哈希比不出高低，口径在壳里 pack_rule::该提醒换），
     所以那颗钮的悬停格里写清"更新到哪一号"。
     这张表住在页面上这一趟里：每一回画那一列之前先问一遍（查更新），行上摆不摆那一颗就照它。 */
  更新表: new Map(),
  async 查更新(){
    const 那 = this.host();
    if(!那 || typeof 那.packUpdates !== 'function'){ this.更新表 = new Map(); return this.更新表; }
    let 回 = null;
    try{ 回 = await 那.packUpdates(); }catch(e){ 回 = null; }
    const 表 = new Map();
    if(回 && 回.ok) for(const 一 of (回.list || [])) 表.set(String(一.id), 一);
    this.更新表 = 表;
    return 表;
  },
  等着更新的(){ return [...this.更新表.values()]; },
  /* 这一行有没有那颗新包躺着：有就多一颗「更新」，没有这一行还是那三颗（不是藏钮当提示） */
  updateButton(id, after){
    /* 这颗钮常在（#56 那一条：四颗一律摆出来，不许拿"这一家没东西可更新"当理由藏一颗）：
       路径里有新包就更新到那一号，没有就按下去把现状说清楚 —— 藏起来不算提示 */
    const 一 = this.更新表.get(String(id));
    return h('button', { class:'wnw-btn mini',
      title: 一 ? '更新到 ' + (一.to || '更新的版本') + ' · 点一下就把插件文件夹里那个安装包换上，换完这个安装包自动删掉（你自己写的内容不动）· 换完会问一句重启，重启之后跑的就是新那一份'
        : '现在用的就是这个版本 —— 插件文件夹里没有比它更新的安装包。要换更新的版本：先把新的安装包放进插件文件夹，再按这一屏上面那颗「重看」，哪几家可以换当场就告诉你',
      html:icoMarkup('cycle') + '更新', onclick:async () => {
        if(!this.这一台能使()) return;
        if(!this.更新表.get(String(id))){
          toast('「' + (Packs.name(id) || String(id)) + '」现在用的就是这个版本，不用换 —— 插件文件夹里没有比它更新的安装包。'
            + '要换更新的版本：把新的安装包放进插件文件夹，再按这一屏上面那颗「重看」，哪几家可以换当场就告诉你。', true);
          return;
        }
        await this.updateNow(id, after);
      } });
  },
  async updateNow(id, after){
    const 名 = Packs.name(id) || String(id);
    const 那 = this.host();
    if(!那 || typeof 那.packUpdate !== 'function'){ toast('更新这一条只在 Flow-Desk 程序里有', true); return; }
    const 一 = this.更新表.get(String(id));
    const 回 = await 那.packUpdate(String(id));
    if(!回 || 回.ok === false){
      toast('「' + 名 + '」没换上：' + ((回 && 回.msg) || '不知道哪一步砸的'), true);
      return;
    }
    toast('「' + 名 + '」已更新到 ' + ((一 && 一.to) || '更新的版本') + ' · 那个安装包已经删掉，你自己写的内容不动');
    await this.查更新();
    if(after) await after();
  },
  /* 一次把路径里所有"比这一格新"的那几家全换上：一张条子跨几家的时候（比如插件「停靠」那一栏
     要 为写 + 便签 + 声笔练习 + 你的句子 四家的清单都换新才看得见），一家一家点、还要记住哪几家点过
     没点过，那是把工程的账推到用户头上（他 2026-10-19：「为什么需要额外记录哪个装了哪个没装？纯属多余」）。
     换完只问一句重启。哪一家砸了只报那一家，别的照换。 */
  async 换全部(after){
    const 那 = this.host();
    if(!那 || typeof 那.packUpdate !== 'function'){ toast('更新这一条只在 Flow-Desk 程序里有', true); return false; }
    const 等 = this.等着更新的();
    if(!等.length){ toast('插件文件夹里没有比现在更新的安装包 · 一家都不用换'); return false; }
    const 成了 = [], 砸了 = [];
    for(const 一 of 等){
      const 名 = Packs.name(一.id) || String(一.id);
      let 回 = null;
      try{ 回 = await 那.packUpdate(String(一.id)); }catch(e){ 回 = null; }
      if(回 && 回.ok !== false) 成了.push(名 + ' ' + (一.to || ''));
      else 砸了.push(名 + '：' + ((回 && 回.msg) || '不知道哪一步砸的'));
    }
    await this.查更新();
    if(成了.length) toast('已换上 ' + 成了.length + ' 家：' + 成了.join('、')
      + (砸了.length ? ' · 没换上的 ' + 砸了.length + ' 家：' + 砸了.join('；') : '')
      + ' · 那几颗安装包已经删掉，你自己写的内容不动');
    else if(砸了.length) toast('一家都没换上：' + 砸了.join('；'), true);
    if(after) await after(成了.length > 0);
    return 成了.length > 0;
  },
  /* 「全部更新」那颗：常在（同一条规矩 —— 不拿"没东西可换"当藏钮的理由），按下去自己说这一趟换了几家 */
  updateAllButton(after){
    return h('button', { class:'wnw-btn mini',
      title:'把插件文件夹里所有比现在新的安装包一次全换上（一张条子跨几家的改动就靠这一颗，不用一家一家点）· 换完问一句重启',
      html:icoMarkup('cycle') + '全部更新', onclick:async () => {
        if(!this.这一台能使()) return;
        await this.查更新();
        await this.换全部(after);
      } });
  },
  /* 卸载前那一句：说清楚这是停止加载、数据默认留着，勾上那一句才一起清 */
  unloadAsk(id, after){
    const nm = Packs.name(id);
    const info = Packs.info(id) || {};
    const all = (info.dataKeys || []).concat(info.kvKeys || []).concat(info.sharedKeys || []);
    const cb = h('input', { type:'checkbox' });
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { class:'wnw-hint' },
      '「' + nm + '」是插件。卸载 = 改名单 + 刷新这一页：这一轮不再加载它，桌上那张卡和它自己那份设置跟着没了。'));
    box.appendChild(h('div', { class:'wnw-hint' },
      '包还收在插件路径里 · 要用了在这一屏按「加载」就是。'));
    if(all.length) box.appendChild(h('label', { class:'wnw-switch' },
      [cb, h('span', {}, '同步清除数据 · ' + all.length + ' 份（' + all.join('、') + '）')]));
    else box.appendChild(h('div', { class:'wnw-hint' }, '这一家没在插件清单里点名要存什么东西，数据这块没什么可清的。'));
    H().dlg.open('卸载插件 · ' + nm, box, [
      h('button', { class:'wnw-btn primary', onclick:async () => {
        H().dlg.close();
        await this.unload(id, { wipe:cb.checked });
      }}, '卸载'),
      h('button', { class:'wnw-btn mini', onclick:() => { H().dlg.close(); if(after) after(); } }, '取消')
    ]);
  },
  /* 删除前那一句：这一颗比卸载狠 —— 文件也从路径里清掉，问两句：清不清数据、确不确认 */
  removeAsk(id, after){
    const nm = (Packs.info(id) || {}).name || id;
    const info = Packs.info(id) || {};
    const all = (info.dataKeys || []).concat(info.kvKeys || []).concat(info.sharedKeys || []);
    const cb = h('input', { type:'checkbox' });
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { class:'wnw-hint' },
      '「' + nm + '」这一格要从插件路径里清掉：data\\plugins\\' + id + '\\ 整个抹掉，压好的那两份（'
      + id + '.zip 与 ' + id + 容器后缀 + '）也在这一颗的范围里。'));
    box.appendChild(h('div', { class:'wnw-hint' },
      '这一步不给自己留退路 —— 想再看它一眼，得重新「安装」一次（手里那份包再放进来）。'));
    if(all.length) box.appendChild(h('label', { class:'wnw-switch' },
      [cb, h('span', {}, '连它存的数据一起清 · ' + all.length + ' 份（' + all.join('、') + '）')]));
    H().dlg.open('删除插件 · ' + nm, box, [
      h('button', { class:'wnw-btn primary', onclick:async () => {
        H().dlg.close();
        await this.remove(id, { wipe:cb.checked });
      }}, '删除'),
      h('button', { class:'wnw-btn mini', onclick:() => { H().dlg.close(); if(after) after(); } }, '取消')
    ]);
  },
  /* 「安装」这一颗走的两条道：一条挑压好的包，一条挑解开的文件夹 —— 落点都是插件路径那一层 */
  installAsk(after){
    if(!this.canImport()){ toast('安装这一颗要在 Flow-Desk 程序里才办得了'); return; }
    const btn = (txt, kind, tip) => h('button', { class:'wnw-btn', title:tip, onclick:async () => {
      H().dlg.close(); await this.importOne(kind); if(after) after();
    }}, txt);
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { class:'wnw-hint' },
      '挑一样东西放进来：压好的包（自家格式那一种，或旧的 zip），或者解开的那个文件夹（里面得带着插件清单）。'));
    box.appendChild(h('div', { class:'wnw-hint' },
      '收进来一律是解开的样子（压好的那两种都只是运输形状，进门就摊开）。同名的已经在那儿就退回不动，不悄悄盖掉你原有的那一份。'));
    box.appendChild(h('div', { class:'wnw-hint' },
      '装完先不加载：这一屏上会多出这一行，要用了再按它那一颗「加载」。'));
    H().dlg.open('安装插件', box, [
      btn('选一个压好的包', 'box', '自家格式的包：一个文件带齐插件清单、代码与每份文件的校验数（进门先整个查一遍）'),
      btn('选一个 zip', 'zip', '旧的那一种运输形状，照样认'),
      btn('选一个文件夹', 'dir', '解开的样子：本地开发就是这样放的'),
      h('button', { class:'wnw-btn mini', onclick:() => { H().dlg.close(); if(after) after(); } }, '取消')
    ]);
  }
};


