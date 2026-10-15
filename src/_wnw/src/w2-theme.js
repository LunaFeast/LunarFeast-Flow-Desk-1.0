/* ============================================================
   WNW 外观（三层模型的第二层）
   ------------------------------------------------------------
   「跟不跟主程序、独立的时候用哪一套」这件事只记在一处：主程序那一张一家一格的表
   （`_fd/src/fd3-shell.js` 的 PackLooks，存在 appearance.json 的 packs 那一节）。
   插件分离第 4 批 4.4 他点的是「迁进新表，统一一只口」，从前这一层自己那一份账（cfg.follow / cfg.scheme
   加一个自己的配色池）就此退掉：界面上那颗「跟随 Flow-Desk 主外观」的勾、那份配色名单、那颗随机换一套，
   写的都是上面那张表，读的都是主程序替这一家算出来的那一份（PackLooks.算一份）。
   为什么不是"卡上写了变量、这一层跟着继承"：为写那一层挂在封面里（#fdCoverBody），不在自己那张卡底下，
   卡上那一族变量够不到它 —— 所以它自己向那张表要一份现成的，算的那一颗仍是主程序那颗，不在这儿重算第二遍。
   还留在这一层的只有两档圆角的手调：那是「在生效那一套之上再钉一遍」，不是第二个选色决定。
   外观模式 / 纹理：跟随的时候归宿主在根元素上钉好的那一套；独立的时候连这两样一起从那张表来（他点的那一版）。
   ============================================================ */
const Theme = {
  from:'standalone', id:'', dark:false,
  cfg:{ card:'', ctl:'' },
  fd:null,
  /* 明暗那一轴（外13-M）：宿主递过来的结论，'light' / 'dark' / ''（还没递到）。
     为写这端不自己定三档 —— 跟随系统 / 按时间 / 手动那三档住在 Flow-Desk 的外观设置里，
     这里只吃它一个结论，然后按同一条轴筛名单，两端看到的是同一条轴。 */
  ming:'',
  async init(){
    /* 宿主这一套先认下来（模板 head 里的首帧注入用的就是这一份）：
       不认的话要等 await 读完存档、再等 FD 的 postMessage，中间正好黑一下。 */
    const pre = fdPalette();
    if(pre){ this.from = 'fd'; this.fd = pre; this.id = pre.id; this.ming = pre.ming || ''; }
    const c = await State.get('look', null); if(c) Object.assign(this.cfg, c);
    /* 从前这里读一份自己的配色池（look-pool）并补明暗两套内置：池子退了，名单归那张表。
       旧存档那一格一个字不动地留在原地，只是不再有人读它 —— 不在这里偷偷替用户改数据。 */
    /* 轴已经知道的情况下先把不该留在这一池的配色换掉再上色，免得开机那一帧看着像跨池 */
    this.mingCheck(false);
    wnwOn(window, 'message', ev => {
      const d = ev.data;
      if(!d || typeof d !== 'object' || d.fd !== 'palette') return;
      this.from = 'fd'; this.id = d.id || '';
      this.fd = { id:d.id || '', tokens:d.tokens || null, radius:d.radius || null, font:d.font || '' };
      /* 字体那张全局表（标记 / 用过几次 / 置顶）跟着配色一起播；开机没读齐就先挂着 */
      if(d.ff){ Fonts.pending = d.ff; if(Fonts.bootted) Fonts.merge(d.ff); }
      /* 轴换了（含第一次递到）：本池外那套就地换成就近的同池配色，并说一句 */
      this.mingCheck(true, d.ming);
      this.apply();
    });
    /* Bus 是为写自己这一层的事件表，不随容器拆装：来回 start/stop 几趟就会叠几份，
       一次换肤应用好几遍。接一次就够，标记挂在身上，不认容器。 */
    if(!this._wired){ this._wired = true; Bus.on('theme', () => this.apply()); }
    this.apply();
  },
  save(){ State.set('look', this.cfg); },
  /* ---------- 那一张表（这一层唯一的选色决定就在这儿）---------- */
  案(){ return (typeof PackLooks !== 'undefined' && PackLooks.挑的) ? (PackLooks.挑的('why-not-write') || '') : ''; },
  独份(){ return (typeof PackLooks !== 'undefined' && PackLooks.算一份) ? (PackLooks.算一份('why-not-write') || null) : null; },
  /* 那张表够不到（把这一棵单独拿出来跑的场合）就不是「跟随」也不是「独立」，而是宿主还没播到：
     这时候吃 fdPalette() 那一份，播不到就用页面模板里的兜底 —— 不在这儿补第二套账 */
  follows(){ return !this.案(); },
  /* 当前实际生效的整套变量；宿主还没播、这一家也没挑 → 交回模板的兜底变量 */
  tokens(){
    const 份 = this.独份();
    if(份) return 份.表;
    return (this.fd && this.fd.tokens) || null;
  },
  /* 生效那一套是谁：独立就是那张表点名的那一套（回 {案, id, name} 给界面念名字），跟随就没有"自己那一套" */
  cur(){ const 案 = this.案(); return 案 ? { 案, id:案, name:案 } : null; },
  /* ---------- 明暗那一轴（外13-M）· 为写这一端 ----------
     宿主递过来的结论优先（'' = 还没递到：这时才按独立那一套自己归的那一池判一个，别硬当明亮）；
     一套方案归哪一池用的是宿主那一份口径（mingPoolOf 吃的是那张卡，主程序那头算好了递过来），
     这里不另写第二份判定。 */
  axis(){
    if(this.ming === 'light' || this.ming === 'dark') return this.ming;
    const 份 = this.独份();
    return (份 && (份.明暗 === 'light' || 份.明暗 === 'dark')) ? 份.明暗 : '';
  },
  /* 能挑的那几套：名单就是主程序那份方案清单（一张名单，两处点 —— 外观那一屏点的是同一份）。
     按当前这一轴筛：另一池的不摆出来，也不灰着让人点不动。
     下拉的取值就是方案名，不在这一头另编一套号 —— 那是第二个真相。 */
  poolNow(){
    const 名 = (typeof PackLooks !== 'undefined' && PackLooks.名单) ? PackLooks.名单() : [];
    const 记上 = 名.map(e => ({ id:e.案, name:e.名, 案:e.案, 明暗:e.明暗, 色:e.色, 预览:e.预览 }));
    const a = this.axis();
    if(a !== 'light' && a !== 'dark') return 记上;
    const 本池 = 记上.filter(e => e.明暗 === a);
    return 本池.length ? 本池 : 记上;
  },
  /* 轴变了之后补的一句账：独立正用的那一套不归新的这一池 → 按色调就近换成同池那套，
     并当场说清换了什么（不许静默、也不许留一套跨池的在这儿）。
     跟随的时候色号就是宿主那套（宿主那头已经把它的色卡换对了），这一趟只重筛名单。 */
  mingCheck(announce, want){
    if(typeof want === 'string'){ const k = (want === 'light' || want === 'dark') ? want : ''; if(k === this.ming) return false; this.ming = k; }
    const 案 = this.案(); if(!案) return false;
    const a = this.axis(); if(a !== 'light' && a !== 'dark') return false;
    const 名 = (typeof PackLooks !== 'undefined' && PackLooks.名单) ? PackLooks.名单() : [];
    const 现 = 名.find(e => e.案 === 案) || null;
    if(现 && 现.明暗 === a) return false;
    const 同池 = 名.filter(e => e.明暗 === a && e.案 !== 案);
    if(!同池.length) return false;
    /* 就近按色调挑（和宿主那颗 mingNearest 同一颗函数、同一个口径），挑不动就取名单里同池头一套 */
    const 色 = (typeof mingNearest === 'function' && 现 && 现.色) ? mingNearest(同池.map(e => e.色).filter(Boolean), 现.色, a) : null;
    const nt = 同池.find(e => 色 && e.色 === 色) || 同池[0];
    PackLooks.改('why-not-write', nt.案);
    if(announce) toast('明暗切到' + ((typeof MING_NAME === 'object' && MING_NAME[a]) || a)
      + '：为写正用的「' + 案 + '」不归这一池，已按色调就近换成同池的「' + nt.案 + '」。');
    return true;
  },
  /* 圆角：先看自己钉过没有，没有就吃生效那一套的那两档（独立 = 那一套自己带的，跟随 = 宿主播来的基准），
     再没有用全局默认那一档（外13-C：5） */
  radius(){
    const 份 = this.独份();
    const base = (份 && 份.角) || (this.fd && this.fd.radius) || {};
    const card = this.cfg.card === '' ? (base.card === undefined ? 5 : base.card) : +this.cfg.card;
    const ctl  = this.cfg.ctl  === '' ? (base.ctl  === undefined ? 5 : base.ctl)  : +this.cfg.ctl;
    return { card:clampR(card), ctl:clampR(ctl) };
  },
  apply(){
    const box = wnwRoot(); if(!box) return;
    const t = this.tokens();
    const r = box.style;
    for(const k in (t || {})) r.setProperty(k, t[k]);
    const rad = this.radius();
    r.setProperty('--radius', rad.ctl + 'px');
    r.setProperty('--r-card', rad.card + 'px');
    r.setProperty('--r-panel', rad.card + 'px');
    r.setProperty('--r-btn', rad.ctl + 'px');
    /* 胶囊那一档不再钉死 99px：标签轮廓、chip、徽标、进度条端头这些原来吃 --r-pill 的地方
       现在和控件同一档，全局圆角一个值管到底（外13-C）。 */
    r.setProperty('--r-pill', rad.ctl + 'px');
    /* 外观模式 + 纹理：跟随的时候不归这一层钉（宿主在根元素上钉好，这一层跟着吃，从前就是这么写的）；
       独立的时候那一套的这两样必须在这儿钉一遍 —— 这一层在封面里，不在自己那张卡底下，
       卡上那份（PackLooks.画到）继承不过来，回到跟随就把这三记撤掉，不落一手跨池的旧皮。 */
    const 份 = this.独份();
    if(份){ box.dataset.mode = 份.模式; box.dataset.tex = 份.纹理; box.dataset.dark = 份.dark ? '1' : '0'; }
    else { delete box.dataset.mode; delete box.dataset.tex; delete box.dataset.dark; }
    Ff.apply();
    this.read();
    /* 明暗那一轴（外13-M）：钉在为写自己那一层上，宿主的 data-ming 管的是整页那一层。
       两边都钉，是因为这一层可以被拆开单独装（wnwStart / wnwTeardown），
       组件里的样式要按轴微调一处两处时吃的是这一记，不必回头找宿主。 */
    try{ box.dataset.wnwMing = this.axis() || ''; }catch(e){}
    /* 开着的代码框重新认一次明暗：着色两组挂在编辑器容器上，改类就够，不重建 */
    icodeRetone();
    Bus.emit('look');
  },
  read(){
    const box = wnwRoot(); if(!box) return;
    const t = this.tokens();
    const bg = (t && t['--page-bg']) || getComputedStyle(box).getPropertyValue('--page-bg') || '#ffffff';
    const rgb = parseHex(String(bg).trim());
    this.dark = rgb ? (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255 < .5 : false;
    box.dataset.wnwTheme = this.dark ? 'dark' : 'light';
  },
  /* 两只手都写那一张表（表自己会重画桌面并把新值播回来，这一层不再另记一遍） */
  select(案){ if(案) PackLooks.改('why-not-write', 案); this.apply(); },
  setFollow(v){
    if(v) PackLooks.改('why-not-write', '');
    /* 把跟随关掉的一刻要有一套落地：从当前这一轴的名单里取头一套（这一轴筛过的，不用再去补跨池的账） */
    else PackLooks.改('why-not-write', this.案() || ((this.poolNow()[0] || {}).案 || ''));
    this.apply();
  }
  /* 从前这里有一条 recordRime()：把 _shared/sh-rime.js 解析出来的小企鹅配色灌进为写自己的池。
     件-9 整条撤下 Rime 配色，这条入口和设置里那个按钮一起撤了。 */
  /* 从前这里还有一颗 record(entry) 加一份自己的配色池（pool / look-pool）：那是第二个选色决定，
     插件分离第 4 批 4.4 迁进主程序那张表之后没有谁来读它了，跟着界面上那颗「删掉这条配色」一起退。 */
};
function clampR(v){ return Math.max(0, Math.min(30, Math.round(+v || 0))); }
/* 问这一页当前那套配色（宿主在 fd3-shell.js 里留的 FD_PALETTE_SNAPSHOT）。
   从前为写是装在宿主里的一个 iframe，只能隔着框去问父页；搬进同一张页之后就是问本地，
   那句「父框就是自己就当没有」的拦条也跟着撤了 —— 留着的话为写永远读不到宿主的色。
   宿主还没就绪、或者这一版页面压根没留这个口子 —— 一律当没有，返回 null 让调用方照原路走。 */
function fdPalette(){
  try{
    if(typeof window.FD_PALETTE_SNAPSHOT !== 'function') return null;
    const d = window.FD_PALETTE_SNAPSHOT();
    if(!d || !d.tokens) return null;
    return { id:d.id || '', tokens:d.tokens, radius:d.radius || null, font:d.font || '', ff:d.ff || null,
      ming:d.ming || '' };        /* 外13-M：宿主那条明暗轴首帧就递到，不必等 postMessage */
  }catch(e){ return null; }
}

/* 从前这一段叫 RimeLook：拿程序旁边那份 rime-dir.json（声笔输入法练习指过一次 Rime 用户目录就落在那儿）
   去读 weasel 的几份 yaml，把小企鹅的配色灌进为写自己的池。件-9 整条撤下 Rime 配色，
   这一段和设置里那个「读 Rime 配色」一起撤了 —— 为写的颜色只从宿主那边跟，或者用自建、从图取色、色卡那三条。 */

function parseHex(s){
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if(m) return { r:parseInt(m[1][0] + m[1][0], 16), g:parseInt(m[1][1] + m[1][1], 16), b:parseInt(m[1][2] + m[1][2], 16) };
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if(m) return { r:parseInt(m[1].slice(0, 2), 16), g:parseInt(m[1].slice(2, 4), 16), b:parseInt(m[1].slice(4, 6), 16) };
  /* color-mix() 这类写法读回来是 color(srgb 0.9 0.92 0.95)，三个数是 0~1 的小数：
     白板拿它量底的明暗，认不出这一串就等于量不出来，字色永远不翻 */
  m = /^color\(\s*srgb\s+([^)]+)\)$/i.exec(s);
  if(m) return triple(m[1], n => n <= 1 ? n * 255 : n);
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if(m) return triple(m[1], n => n);
  return null;
}
/* '12, 34, 56' / '12 34 56 / 0.5' / '50% 50% 50%' 这三种写法都拆成 {r,g,b}；sc 是单个数的换算 */
function triple(part, sc){
  const p = part.split(/[,\s/]+/).filter(Boolean).map(t => ({ n:parseFloat(t), pct:/%$/.test(t) }));
  if(p.length < 3 || p.some(x => !isFinite(x.n))) return null;
  const v = x => Math.round(Math.max(0, Math.min(255, x.pct ? x.n * 2.55 : sc(x.n))));
  return { r:v(p[0]), g:v(p[1]), b:v(p[2]) };
}
/* 组件色 slotColor（五个强调位）在底座 _shared/sh-packs.js，和 FD 同一个口径 */

/* ============================================================
   分区字号：正文 / 纲（左栏 + 章纲） / 侧栏与面板 / 顶栏与书架
   方案存全局列表；每本书可记住自己用哪个方案，没记就跟随全局。
   ============================================================ */
const BUILTIN = '默认 小字 大字'.split(' ');
const Fs = {
  zones:[['doc', '正文'], ['gang', '纲 / 左栏'], ['side', '侧栏 / 面板'], ['top', '顶栏 / 书架']],
  /* 8~32 每档都给：正文 8 号也有人用，跳档反而选不到想要的那一号 */
  steps:Array.from({ length:25 }, (_, i) => i + 8),
  plans:[], global:'默认', now:'默认',
  seed(){
    return [
      { name:'默认', doc:14, gang:13, side:13, top:14 },
      { name:'小字', doc:12, gang:12, side:12, top:13 },
      { name:'大字', doc:16, gang:13, side:13, top:15 }
    ];
  },
  async load(){
    const saved = await State.get('fs-plans', null);
    this.plans = (Array.isArray(saved) && saved.length) ? saved : this.seed();
    this.global = this.now = await State.get('fs-plan', '默认');
    if(!this.get(this.global)){ this.global = this.now = '默认'; }
    this.apply();
  },
  get(name){ return this.plans.find(p => p.name === name); },
  cur(){ return this.get(this.now) || this.get('默认') || this.plans[0]; },
  /* 书名下的方案：没有单独记就跟随全局 */
  async forBook(bookId){
    const map = await State.get('fs-book', {});
    const nm = bookId && map[bookId];
    this.now = (nm && this.get(nm)) ? nm : this.global;
    this.apply();
  },
  async pick(name){
    this.now = name;
    this.apply();
  },
  async setGlobal(name){
    this.global = this.now = name;
    State.set('fs-plan', name);
    this.apply();
  },
  async bindBook(bookId, name){
    const map = Object.assign({}, await State.get('fs-book', {}));
    if(name) map[bookId] = name; else delete map[bookId];
    State.set('fs-book', map);
    if(bookId && Work && Work.book && Work.book.id === bookId) await this.forBook(bookId);
  },
  apply(){
    const p = this.cur(); if(!p) return;
    const r = wnwRoot().style;
    for(const [k] of this.zones) r.setProperty('--fs-' + k, (p[k] || 14) + 'px');
  },
  async persist(){ State.set('fs-plans', this.plans); },
  /* 内置方案不给改：一动就复制一份「×× 自定」继续编辑 */
  async edit(name, vals){
    let p = this.get(name); if(!p) return null;
    if(BUILTIN.includes(name)){
      p = Object.assign({}, p, { name:name + ' 自定' });
      let n = 2; while(this.get(p.name)) p.name = name + ' 自定 ' + (n++);
      this.plans.push(p);
    }
    Object.assign(p, vals);
    await this.persist();
    this.now = p.name;
    if(this.global === name) this.global = p.name;
    this.apply();
    return p;
  },
  async add(vals){
    let name = '我的方案', n = 2;
    while(this.get(name)) name = '我的方案 ' + (n++);
    this.plans.push(Object.assign({ name }, vals));
    await this.persist();
    return name;
  },
  async del(name){
    if(BUILTIN.includes(name)) return false;
    this.plans = this.plans.filter(p => p.name !== name);
    await this.persist();
    if(this.now === name || this.global === name) await this.setGlobal('默认');
    return true;
  }
};

/* ============================================================
   分区字体：正文 / 章纲 / 侧栏 / 代码，和上面那套字号同构，落到四个 CSS 变量上。
   每一档的取法和圆角一样：自己钉过的算，没钉就吃 FD 播过来的全局字体，再没有才是内置那套。
   代码档默认还是等宽栈 —— 正文换成正楷时，正则、词库文本框那些不该跟着变。
   ============================================================ */
const Ff = {
  zones:[['doc', '正文'], ['gang', '章纲 / 左栏'], ['side', '侧栏 / 面板'], ['code', '代码']],
  cfg:{ doc:'', gang:'', side:'', code:'' },
  async load(){
    const c = await State.get('font-zone', null);
    if(c) Object.assign(this.cfg, c);
    this.apply();
  },
  set(k, v){ this.cfg[k] = v || ''; State.set('font-zone', this.cfg); this.apply(); },
  /* FD 的全局字体压住内置栈，当成没钉过那几档的基准 */
  base(){
    const fd = this.fdFont();
    return fd ? ffQuote(fd) + ',' + FF_BASE_WNW : FF_BASE_WNW;
  },
  fdFont(){ return (Theme.fd && Theme.fd.font) || ''; },
  of(k){ return k === 'code' ? ffStack(this.cfg.code, FF_MONO) : ffStack(this.cfg[k], this.base()); },
  apply(){
    const r = wnwRoot().style, b = this.base();
    for(const [k] of this.zones) r.setProperty('--ff-' + k, this.of(k));
    /* 顶栏、书架、设置面板这些没单列档的地方跟着侧栏走 */
    r.setProperty('--ff-ui', ffStack(this.cfg.side, b));
  }
};

