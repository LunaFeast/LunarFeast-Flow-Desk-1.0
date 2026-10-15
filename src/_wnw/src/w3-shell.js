/* ============================================================
   WNW 外壳 v0.3
   首页 = 书架；点开一本书 = 工作台（左栏素材 / 中间自由标签+分屏 / 右栏自由停靠）
   任何文档和功能都注册成一种 View，标签、分屏、停靠面板共用同一套渲染入口
   ============================================================ */
const Tools = new Map();
function registerTool(t){
  Tools.set(t.id, t);
  Views.reg(t.id, { name:t.name, icon:t.icon || 'log', desc:t.desc,
    title:() => t.name,
    render:(host, ref, ctx) => {
      /* 停靠里的长组件：整块不再越拖越长，左右两栏各滚各的 */
      if(ctx && ctx.where === 'dock') host.dataset.scroll = '1';
      return t.mount(host, ctx || {});
    }
  });
}

/* ---------- 视图注册表：标签 / 分屏 / 停靠面板都从这里出 ---------- */
const Views = {
  map:new Map(),
  reg(kind, def){ def.kind = kind; this.map.set(kind, def); },
  del(kind){ this.map.delete(kind); },
  get(kind){ return this.map.get(kind); },
  list(){ return [...this.map.values()]; },
  async title(kind, ref){ const d = this.get(kind); return (d && (await (d.title ? d.title(ref) : d.name))) || kind; }
};

/* ---------- 顶栏书标签：几本书同时开着，点标签切过去，只点 × 才关 ---------- */
const BookTabs = {
  MAX:8,
  st:{ open:[], cur:'' },
  /* 开机把上次那几本一并恢复到标签排上：死书丢掉，当前那本挪到最左手 */
  async load(){
    const d = await Shelf.load();
    const alive = new Set(d.books.map(b => b.id));
    const s = Object.assign({ open:[], cur:'' }, await State.get('book-tabs', {}));
    s.open = (Array.isArray(s.open) ? s.open : []).filter(id => alive.has(id)).slice(0, this.MAX);
    if(!s.open.includes(s.cur)) s.cur = s.open[0] || '';
    const i = s.open.indexOf(s.cur);
    if(i > 0){ s.open.splice(i, 1); s.open.unshift(s.cur); }
    this.st = s;
    this.save();
  },
  save(){ State.set('book-tabs', this.st); },
  has(id){ return this.st.open.includes(id); },
  title(id){ return (Work.book && Work.book.id === id) ? Work.book.title : (bookTitle(id) || '（书已删）'); },
  /* 已经挂着的那几本随便切；第 9 本才拦 */
  canOpen(id){ return this.has(id) || this.st.open.length < this.MAX; },
  open(id){
    if(!this.has(id)) this.st.open.push(id);
    this.st.cur = id;
    this.save(); this.render();
  },
  /* 书被删了 / 打不开：只摘这枚标签，不动当前这本 */
  drop(id){
    if(!this.has(id)) return;
    this.st.open = this.st.open.filter(x => x !== id);
    if(this.st.cur === id) this.st.cur = this.st.open[0] || '';
    this.save(); this.render();
  },
  close(id){
    const i = this.st.open.indexOf(id);
    if(i < 0) return;
    const wasCur = this.st.cur === id;
    this.st.open.splice(i, 1);
    if(!wasCur){ this.save(); this.render(); return; }
    /* 关掉当前这枚就切到它左手边那本，没有左手边再看右手边，都没了回书架 */
    const next = this.st.open[i - 1] || this.st.open[0] || '';
    this.st.cur = next;
    this.save();
    if(next) Shell.openBook(next); else Shell.showShelf();
  },
  render(){
    const nav = wnwRoot().querySelector('#wnwNav');
    if(!nav) return;
    nav.innerHTML = '';
    for(const id of this.st.open){
      const t = this.title(id);
      nav.appendChild(h('div', { class:'wnw-btab' + (Shell.mode === 'desk' && this.st.cur === id ? ' on' : ''),
        title:t + ' · 点一下切过去，点右边那个关闭钮关掉',
        onclick:() => { if(this.st.cur !== id || Shell.mode !== 'desk') Shell.openBook(id); } }, [
        h('span', { class:'nm' }, t),
        h('button', { class:'x', title:'关掉这本书', 'aria-label':'关掉这本书', html:icoMarkup('close'), onclick:ev => { ev.stopPropagation(); this.close(id); } })
      ]));
    }
    nav.appendChild(h('button', { class:'wnw-badd', title:'再开一本书（最多同开 ' + this.MAX + ' 本）',
      onclick:() => this.pickDlg(), html:icoMarkup('plus') }));
  },
  /* ＋ 弹一本书的列表：能搜，点了就地开这一本，不把人跳走 */
  async pickDlg(){
    const d = await Shelf.load();
    if(!d.books.length){ toast('书架上还没有书 · 先去书架新建一本'); return; }
    let kw = '';
    const box = h('div', { class:'wnw-col' });
    const list = h('div', { class:'wnw-col' });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找书' });
    q.addEventListener('input', () => { kw = q.value.trim().toLowerCase(); draw(); });
    const draw = () => {
      list.innerHTML = '';
      const hit = d.books.filter(b => !kw || (b.title || '').toLowerCase().includes(kw) || (b.author || '').toLowerCase().includes(kw));
      list.appendChild(h('div', { class:'wnw-hint' }, hit.length + ' 本 · 标签上开着 ' + this.st.open.length + ' 本'));
      if(!hit.length) list.appendChild(h('div', { class:'wnw-hint' }, '没有这本书'));
      for(const b of hit){
        const on = this.has(b.id);
        list.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap', title:'开这本书', onclick:() => {
          if(!on && !this.canOpen(b.id)){ toast('最多同开 ' + this.MAX + ' 本，先关一本'); return; }
          Overlay.close();
          Shell.openBook(b.id);
        } }, [
          h('span', { class:'ttl' }, b.title),
          h('span', { class:'wnw-hint' }, (b.chs || 0) + ' 章 · ' + (b.total || 0) + ' 字'),
          h('span', { style:'flex:1' }),
          on ? h('span', { class:'wnw-gtag' }, '已开着') : null
        ]));
      }
    };
    box.appendChild(q); box.appendChild(list);
    Overlay.open('打开一本书 · 最多同开 ' + this.MAX + ' 本', box);
    draw();
    q.focus();
  }
};

/* ---------- 外壳：书架 ↔ 工作台 ---------- */
const Shell = {
  mode:'shelf', view:null,
  /* 宿主递一个普通元素进来，为写就在它里面现搭骨架、贴皮肤、接监听。
     从前这一段是「页面一加载自己跑一遍」，现在这一页不属于为写，得有人按 start 才开。 */
  /* 搭容器这一步单拎出来：Theme / Type / FocusLook 那些一上来就要往容器上写变量，
     骨架不在它们就没地方落，所以启动序列得先走过这一步再往下排。 */
  attach(host){
    WNW_HOST = host;
    cssOn = false;
    buildSkeleton(host);
    /* 装配期各段自带的样式那时候容器还没就位，全攒在 WNW_CSS 里，现在一次落进容器。
       攒的那一份不掏空：换一个容器再 start 还得再落一遍，掏空了就只剩皮肤没有各段自带的细则了 */
    for(const css of WNW_CSS) addCss(css);
    injectCss();
    /* 省略号悬停提示、Ctrl+S 那一条这些从前打在 window 上，
       会把宿主页面上别人的元素也一并管进来。现在一律打在容器上，随 stop 一起摘。 */
    wnwBindChrome(host);
    wnwOn(host, 'resize', () => this.fitFont());
  },
  async init(){
    this.fitFont();
    await State.init();
    await Fs.load();
    await Ff.load();
    /* Flow-Desk 程序里开机静默读一遍系统字体，选择器一开就有清单；本地开发那台服务器这条什么都不做 */
    Fonts.auto();
    await Shelf.load();
    await this.applyDocW();
    /* 开机恢复：上次开着几本就恢复几本，当前那本摆最前并直接进工作台 */
    await BookTabs.load();
    BookTabs.render();
    const cur = BookTabs.st.cur;
    if(cur && await Shelf.get(cur)) await this.openBook(cur); else this.showShelf();
  },
  /* 正文栏宽：820 居中 / 铺满 / 自定义 px，排版面板改的是 doc-w，这里落到一个 CSS 变量上 */
  async applyDocW(){
    const v = String(await State.get('doc-w', '820'));
    wnwRoot().style.setProperty('--doc-w', v === 'fill' ? 'none' : Math.max(320, parseInt(v, 10) || 820) + 'px');
  },
  /* 自适应字号照容器量，不再拿视口当窗口：挂在封面里的时候这两者差着一截 */
  fitFont(){
    const b = wnwBox();
    const auto = Math.min(1.2, Math.max(.8, Math.min(b.w / 1440, b.h / 820)));
    wnwRoot().style.setProperty('--wnw-vsc', auto.toFixed(3));
  },
  root(){ const n = wnwRoot().querySelector('#wnwTool'); n.innerHTML = ''; return n; },
  showShelf(){
    this.mode = 'shelf';
    Fs.forBook(null);
    Desk.teardown();
    const host = this.root();
    host.className = 'wnw-shelf-wrap';
    Shelf.view.mount(host, { shell:this });
    /* 回到书架：标签还挂着，只是没有哪本亮着 */
    BookTabs.render();
  },
  async openBook(bookId){
    /* 第 9 本先拦下：标签排到上限就让他关一本再开 */
    if(!BookTabs.canOpen(bookId)){ toast('最多同开 ' + BookTabs.MAX + ' 本，先关一本'); return; }
    await State.set('lastBook', bookId);
    const b = await Work.open(bookId);
    if(!b){ toast('这本书打不开'); BookTabs.drop(bookId); return; }
    this.mode = 'desk';
    BookTabs.open(bookId);
    await Fs.forBook(bookId);
    await CardHl.sync();
    const host = this.root();
    host.className = 'wnw-desk-wrap';
    host.innerHTML = '';
    Desk.teardown();
    Desk.mount(host, b);
    /* 老书的字数只有汉字那一份，后台逐章补齐 Word 口径，补完让左栏重画一次 */
    Work.fillWords().then(() => { if(Desk.host) Desk.drawLeft(); });
  },
  async openView(kind, ref, where){
    if(this.mode !== 'desk') await this.openBook(Work.book ? Work.book.id : (await Shelf.load()).books[0] && (await Shelf.load()).books[0].id);
    Desk.addTab(kind, ref, where);
  }
};

/* ---------- 工作台：三栏 + 分隔条 + 标签分屏 + 右栏停靠 ---------- */
/* 从「最近打开」那份名单里去掉一笔（每一枚后头那颗 × 走这儿）。
   认的是 哪一种 + 哪一号 那一对，不认名字 —— 同一卷里三章都叫「第七章」，按名字删会一次带走四笔；
   名单归名单，那一页内容本身一个字不碰，下次再打开它自己回到名单最前面。 */
async function recentDrop(rc){
  await State.set('recent', ((await State.get('recent', [])) || []).filter(x => !(x.kind === rc.kind && x.ref === rc.ref)));
}
/* ---------- ＋ 那张清单里的分组名单：谁家要自己占一组，自己 PickGroup.reg 一组进去 ----------
   清单本体只认这张名单，不认识任何一组的组名 —— 摘掉一组这边一个字不用改
   （外46 十 · 可拆性整理 2026-10-12：原先这些组是整片写死在清单里的，跟主界面挤同一颗文件）。 */
const PICK_GROUPS = [];
const PickGroup = { reg(g){ PICK_GROUPS.push(g); } };
const Desk = {
  host:null, root:null, live:new Map(), timer:null, tickTimer:null, bookTimer:null, seq:0,
  /* 中栏底线：模式切换那个按钮（约 230）+ 书名（约 70）+ 正文一列（约 280）+ 批注栏（232）+ 缝和边距 */
  MID_MIN:680,
  /* 丙-1 停靠两栏：一栏窄到这儿就不许再摆两栏。300 是照现成尺寸加出来的，不是拍的 ——
     一张停靠卡最宽的标题条（插件带的 设置 + 改词库 + 常驻 + 折叠 + ×）按 w0-skin
     那几条量：停靠栏基准字 13px，.b/.x 都是 .8571em（≈11.1px），「常驻」两字 22 + padding 14 + 描边 2 ≈ 38，
     「改词库」三字 ≈ 52，「设置」两字 ≈ 38，两个折叠叉 ≈ 22×2，图标 16，gap 加条子左右 padding ≈ 48 → 约 234。
     栏宽低于这条就把这几个切掉一截。原来这笔账里还算着「改代码」那颗（≈52，合计约 292），
     插件分离第 2 批把那颗撤了；底线仍留在 300，这一趟不跟着往下调。 */
  DOCK_COL_MIN:300,
  /* dockCols 摆在全局这一层，和 leftW / rightW 同一个口径：几栏是这人怎么摆界面上的偏好，不跟着书走；
     哪一张卡在哪一栏（it.col）才跟着书，记在下面那份 dock 数组里 */
  st:{ rail:'ch', leftW:250, rightW:330, leftOn:true, rightOn:true, tree:null, dock:[], dockCols:1 },
  async mount(host, book){
    /* 开书要等一次异步取状态：手快连点两下（或新建作品又点书架）会进来两轮 mount，
       两轮都往下走就是两个桌面叠在一起 —— 章节目录看着多了一份。只让最后一轮落地。 */
    const seq = ++this.seq;
    this.host = host; this.book = book;
    this.st = Object.assign(this.st, await State.get('desk', {}));
    if(seq !== this.seq) return;
    /* 标签和停靠每本书一套：升级前的那套沿用给当时正开的这本，之后各归各，切书不再带出上一本的死标签 */
    if(!this.st.byBook) this.st.byBook = { [book.id]: { tree:this.st.tree, dock:this.st.dock } };
    const fresh = !this.st.byBook[book.id];
    const sc = this.st.byBook[book.id] || (this.st.byBook[book.id] = { tree:null, dock:[] });
    this.st.tree = sc.tree || null;
    this.st.dock = Array.isArray(sc.dock) ? sc.dock : [];
    this.scrub();
    /* 没动过停靠的书（新书、以及升级后第一次打开的老书）默认摆一份写作统计，并且钉成常驻；
       这一本自己收过、换过之后就不再多事，照他的来 */
    if(fresh && !this.st.dock.length && Views.get('stat'))
      this.st.dock = [{ id: uid('dk'), kind:'stat', ref:'', label:'写作统计', open:true, pin:true, mode:'full' }];
    this.build();
    this.startClock();
    /* 窗口一缩就要重新量一次底线，不然中栏被挤到模式按钮折行、批注栏掉到正文下面 */
    if(!this.onWinResize){
      this.onWinResize = () => { if(this.host){ this.applySizes(); this.refitDock(); } };
      wnwOn(wnwRoot(), 'resize', this.onWinResize);
    }
  },
  /* 这种视图已经没有了的死标签 / 死停靠 / 死面板，加载时直接丢掉 */
  scrub(){
    if(this.st.tree) for(const lf of this.leaves(this.st.tree)) lf.tabs = (lf.tabs || []).filter(tb => Views.get(tb.kind));
    this.st.dock = (this.st.dock || []).filter(it => Views.get(it.kind));
    if(!Views.get('panel-' + this.st.rail)) this.st.rail = 'ch';
  },
  /* 计时那一档要有退路：从前这一层跟着页面一起没，卸载是浏览器的事；
     现在挂在宿主容器里，stop 就得自己把 setInterval 关掉。 */
  stopClock(){
    clearInterval(this.tickTimer); this.tickTimer = null;
    clearTimeout(this.bookTimer); this.bookTimer = null;
  },
  teardown(){
    for(const [, api] of this.live){ try{ api.unmount && api.unmount(); }catch(e){} }
    this.live.clear();
    this.stopClock();
    this.book = null; this.topEl = null;
    const box = wnwRoot() && wnwRoot().querySelector('#wnwTopRight');
    if(box) box.innerHTML = '';
    /* 整副工作台卸掉：host 就是挂载时给它的 #wnwTool，光清 live 会留下一层没人认的节点，
       stop 之后再来一趟 start 就叠上了 */
    if(this.host) this.host.innerHTML = '';
    this.host = null;
  },
  /* 全局存栏宽和面板选择，标签/停靠归到当前这本书名下 */
  save(){
    if(this.book){
      const by = this.st.byBook || (this.st.byBook = {});
      const sc = by[this.book.id] || (by[this.book.id] = {});
      sc.tree = this.st.tree; sc.dock = this.st.dock;
    }
    State.set('desk', this.st);
  },
  build(){
    const root = h('div', { class:'wnw-desk' });
    root.appendChild(this.rail());
    this.leftBox = h('div', { class:'wnw-left' });
    this.midBox = h('div', { class:'wnw-mid' });
    this.rightBox = h('div', { class:'wnw-right' });
    this.d1 = h('i', { class:'wnw-div', 'data-which':'left', title:'拖动调整左栏宽度' });
    this.d2 = h('i', { class:'wnw-div', 'data-which':'right', title:'拖动调整右栏宽度' });
    root.appendChild(this.leftBox); root.appendChild(this.d1);
    root.appendChild(this.midBox); root.appendChild(this.d2);
    root.appendChild(this.rightBox);
    this.host.appendChild(root);
    this.applySizes();
    this.bindDividers(root);
    this.drawLeft(); this.drawMid(); this.drawRight(); this.drawRail(); this.drawTop();
  },
  applySizes(){
    const s = this.host.style;
    const on = (v, w, d) => { s.setProperty(w, v ? v + 'px' : '0px'); s.setProperty(d, v ? '5px' : '0px'); };
    /* 窗口本身窄到装不下时（拖动拦得住，缩窗口拦不住）：先削右栏再削左栏，把中栏那条底线留住。
       只削这一次显示用的宽度，st.leftW / st.rightW 原样不动，窗口拉回来还是他调好的那份。 */
    let lw = this.st.leftOn ? this.st.leftW : 0, rw = this.st.rightOn ? this.st.rightW : 0;
    const railW = this.railBox ? this.railBox.offsetWidth : 52;
    let over = lw + rw + railW + 10 + this.MID_MIN - this.host.clientWidth;
    if(over > 0){
      const cutR = Math.max(0, Math.min(rw - 120, over)); rw -= cutR; over -= cutR;
      if(over > 0){ const cutL = Math.max(0, Math.min(lw - 120, over)); lw -= cutL; }
    }
    on(lw, '--wnw-lw', '--wnw-ld');
    on(rw, '--wnw-rw', '--wnw-rd');
    this.leftBox.style.display = this.st.leftOn ? '' : 'none';
    this.d1.style.display = this.st.leftOn ? '' : 'none';
    this.rightBox.style.display = this.st.rightOn ? '' : 'none';
    this.d2.style.display = this.st.rightOn ? '' : 'none';
    if(this.topEl && this.topEl.right) this.topEl.right.classList.toggle('on', this.st.rightOn);
  },
  /* 分隔条：拖动改宽度；右栏宽度一变，停靠面板就在完整版/精简版之间切 */
  bindDividers(root){
    for(const d of [this.d1, this.d2]){
      d.addEventListener('pointerdown', ev => {
        ev.preventDefault(); d.setPointerCapture(ev.pointerId); d.classList.add('on');
        const which = d.dataset.which, x0 = ev.clientX, w0 = which === 'left' ? this.st.leftW : this.st.rightW;
        const mv = e => {
          const dx = e.clientX - x0;
          /* 停靠区唯一的底线：中间那块编辑器至少还能留下 MID_MIN，别的都不设上限。
             这条线是照中栏里最硬的两条约束算的 —— 模式切换那个不许折行、批注栏不许掉到正文下面，
             底线给够了就不用靠换行兜，掉不下去也折不起来。 */
          const other = which === 'left' ? (this.st.rightOn ? this.st.rightW : 0) : (this.st.leftOn ? this.st.leftW : 0);
          const max = Math.max(120, this.host.clientWidth - other - 10 - Desk.MID_MIN);
          const v = Math.max(120, Math.min(max, which === 'left' ? w0 + dx : w0 - dx));
          if(which === 'left') this.st.leftW = v; else this.st.rightW = v;
          this.applySizes();
          if(which === 'right') this.refitDock();
        };
        const up = () => {
          d.classList.remove('on');
          wnwRoot().removeEventListener('pointermove', mv); wnwRoot().removeEventListener('pointerup', up);
          this.save(); this.refitDock();
        };
        wnwRoot().addEventListener('pointermove', mv); wnwRoot().addEventListener('pointerup', up);
      });
      d.addEventListener('dblclick', () => {
        if(d.dataset.which === 'left') this.st.leftOn = !this.st.leftOn; else this.st.rightOn = !this.st.rightOn;
        this.save(); this.applySizes();
      });
    }
  },
  /* ---------- 左栏图标条 ---------- */
  rail(){
    const r = h('div', { class:'wnw-rail' });
    this.railBox = r;
    return r;
  },
  drawRail(){
    const r = this.railBox; r.innerHTML = '';
    const items = [
      { k:'ch', i:'list', t:'章节' }, { k:'card', i:'grid', t:'卡片' }, { k:'insp', i:'idea', t:'灵感' },
      { k:'board', i:'board', t:'看板' }, { k:'tag', i:'tag', t:'标签' }, { k:'find', i:'findBook', t:'查找' }
    ];
    /* 推演记录是中立模块（_shared/sh-log.js）挂进来的那一格，没带它就不多摆 */
    if(typeof GenLog !== 'undefined') items.push({ k:'genlog', i:'log', t:'推演记录' });
    /* 图标下面跟两个字：只摆图标他认不出哪格是什么。上面那行照旧留完整提示 */
    const rb = (ico, t, on, fn) => {
      const b = h('button', { class:'wnw-rail-btn' + (on ? ' on' : ''), title:t, 'aria-label':t, onclick:fn });
      b.appendChild(h('span', { class:'ic', html:icoMarkup(ico) }));
      b.appendChild(h('span', { class:'lb' }, t === '返回书架' ? '书架' : t));
      r.appendChild(b);
    };
    /* 图标组挨着「返回书架」往上排，中间一道浅线隔开；只有设置沉到底 */
    rb('home', '返回书架', false, () => Shell.showShelf());
    r.appendChild(h('i', { class:'wnw-rail-div' }));
    for(const it of items)
      rb(it.i, it.t, this.st.rail === it.k,
        () => { if(!this.st.leftOn){ this.st.leftOn = true; this.applySizes(); } this.st.rail = it.k; this.save(); this.drawRail(); this.drawLeft(); });
    r.appendChild(h('i', { class:'wnw-rail-sp' }));
    rb('gear', '设置', false, () => Settings.open());
  },
  drawLeft(){
    if(this.leftApi){ try{ this.leftApi.unmount(); }catch(e){} this.leftApi = null; }
    /* 面板的 render 是异步的（进去先读一份设置）。光清空盒子挡不住上一轮晚到的那一次落地：
       两次重画挨着跑（开书 + 补字数），晚到的那份就顺着旧盒子又摆一套目录出来，看着像章节列了两遍。
       所以每次换一块新壳挂上去 —— 晚到的那份只能往已经离屏的旧壳里画，屏幕上永远只有一套。 */
    const box = h('div', { class:'wnw-left' });
    box.style.display = this.st.leftOn ? '' : 'none';
    if(this.leftBox) this.leftBox.replaceWith(box);
    this.leftBox = box;
    const v = Views.get('panel-' + this.st.rail);
    if(!v){ box.appendChild(h('div', { class:'wnw-empty' }, '这个面板还没准备好')); return; }
    this.leftApi = this.render(v, box, { where:'left' });
  },
  /* 重画之前先把上一轮的总线订阅解掉，不然一次刷新攒一份监听 */
  dropLive(test){
    for(const [id, api] of [...this.live]) if(test(id)){ try{ api.unmount && api.unmount(); }catch(e){} this.live.delete(id); }
  },
  /* 组件被完全删除：开着的标签和停靠面板一并收掉 */
  dropKind(kind){
    if(this.st.tree) for(const lf of this.leaves(this.st.tree)){
      for(let i = lf.tabs.length - 1; i >= 0; i--){
        if(lf.tabs[i].kind !== kind) continue;
        const id = lf.tabs[i].id, api = this.live.get(id);
        try{ api && api.unmount && api.unmount(); }catch(e){}
        this.live.delete(id); lf.tabs.splice(i, 1);
      }
      if(lf.act >= lf.tabs.length) lf.act = Math.max(0, lf.tabs.length - 1);
    }
    for(const it of this.st.dock.slice()){
      if(it.kind !== kind) continue;
      const api = this.live.get('dock.' + it.id);
      try{ api && api.unmount && api.unmount(); }catch(e){}
      this.live.delete('dock.' + it.id);
    }
    this.st.dock = this.st.dock.filter(d => d.kind !== kind);
    this.save();
    if(this.midBox) this.drawMid();
    if(this.rightBox) this.drawRight();
  },
  /* ---------- 中栏：标签 + 分屏 ---------- */
  drawMid(){
    this.dropLive(id => !id.startsWith('dock.'));
    const box = this.midBox; box.innerHTML = '';
    if(!this.st.tree) this.st.tree = { t:'leaf', tabs:[], act:0 };
    this.prune();
    box.appendChild(this.leafOrSplit(this.st.tree, null, null));
  },
  leaves(node, out){
    out = out || [];
    if(!node) return out;
    if(node.t === 'leaf') out.push(node);
    else { this.leaves(node.a, out); this.leaves(node.b, out); }
    return out;
  },
  leafCount(){ return this.leaves(this.st.tree).length; },
  leafOrSplit(node, parent, side){
    if(node.t === 'leaf') return this.pane(node);
    const wrap = h('div', { class:'wnw-split ' + (node.dir === 'v' ? 'v' : 'h') });
    const a = h('div', { class:'wnw-split-cell' }), b = h('div', { class:'wnw-split-cell' });
    a.appendChild(this.leafOrSplit(node.a, node, 'a'));
    b.appendChild(this.leafOrSplit(node.b, node, 'b'));
    wrap.appendChild(a);
    const dv = h('i', { class:'wnw-sdiv', title:'拖动调整分屏大小' });
    wrap.appendChild(dv);
    wrap.appendChild(b);
    const setR = () => { wrap.style.setProperty('--r', (100 * (node.r || .5)).toFixed(2) + '%'); };
    setR();
    dv.addEventListener('pointerdown', ev => {
      ev.preventDefault(); dv.setPointerCapture(ev.pointerId); dv.classList.add('on');
      const box = wrap.getBoundingClientRect(), horiz = node.dir === 'v';
      const mv = e => {
        const p = horiz ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height;
        node.r = Math.max(.12, Math.min(.88, p)); setR();
      };
      const up = () => { dv.classList.remove('on'); wnwRoot().removeEventListener('pointermove', mv); wnwRoot().removeEventListener('pointerup', up); this.save(); };
      wnwRoot().addEventListener('pointermove', mv); wnwRoot().addEventListener('pointerup', up);
    });
    return wrap;
  },
  pane(node){
    const pane = h('div', { class:'wnw-pane' });
    pane.addEventListener('pointerdown', () => { this.activeLeaf = node; }, true);
    const strip = h('div', { class:'wnw-strip' });
    const body = h('div', { class:'wnw-pane-body' });
    pane.appendChild(strip); pane.appendChild(body);
    if(!node.tabs.length) node.tabs = [];
    if(node.act >= node.tabs.length) node.act = Math.max(0, node.tabs.length - 1);
    for(let i = 0; i < node.tabs.length; i++){
      const tb = node.tabs[i], def = Views.get(tb.kind);
      const el = h('div', { class:'wnw-tabx' + (i === node.act ? ' on' : ''), draggable:'true',
        onclick:() => { node.act = i; this.save(); this.drawMid(); },
        ondblclick:() => this.renameTab(tb, el),
        ondragstart:e => { e.dataTransfer.setData('text/wnw', JSON.stringify({ from:'tab', node, i })); Drag.tab = { node, i }; },
        ondragend:() => { Drag.clear(); },
        oncontextmenu:e => { e.preventDefault(); e.stopPropagation(); this.activeLeaf = node; this.tabMenu(e.clientX, e.clientY, node, i); } });
      el.appendChild(h('span', { class:'ic', html:icoFor(tb.kind, def && def.icon) }));
      el.appendChild(h('span', { class:'tx' }, tb.label || (def ? def.name : tb.kind)));
      el.appendChild(h('button', { class:'x', title:'关闭标签', 'aria-label':'关闭标签', html:icoMarkup('close'), onclick:ev => { ev.stopPropagation(); this.closeTab(node, i); } }));
      strip.appendChild(el);
    }
    strip.appendChild(h('button', { class:'wnw-tab-add', title:'新建标签', 'aria-label':'新建标签', html:icoMarkup('plus'), onclick:() => this.pickDlg(node) }));
    strip.appendChild(h('button', { class:'wnw-tab-split', title:'左右分屏：把当前标签开到右边一格', 'aria-label':'左右分屏',
      html:icoMarkup('split'), onclick:() => this.splitTab(node, node.act, 'r') }));
    if(node.tabs.length > 1) strip.appendChild(h('button', { class:'wnw-tab-x', title:'关闭当前标签', 'aria-label':'关闭当前标签', html:icoMarkup('close'), onclick:() => this.closeTab(node, node.act) }));
    const tb = node.tabs[node.act];
    if(!tb){
      body.appendChild(h('div', { class:'wnw-drop-here' }, [
        h('div', { class:'big' }, ''), h('div', {}, '拖文档到这里，或点标签栏右边的新增按钮打开')]));
    } else {
      const def = Views.get(tb.kind);
      if(!def){ body.appendChild(h('div', { class:'wnw-empty' }, '找不到这种视图：' + tb.kind)); }
      else{
        body.dataset.live = tb.id;
        this.render(def, body, { where:'pane', pane, node, tab:tb, close:() => this.closeTab(node, node.tabs.indexOf(tb)) });
      }
    }
    this.bindPaneDrop(pane, node);
    return pane;
  },
  bindPaneDrop(pane, node){
    /* 提示条改成真的元素：以前整句写在 CSS 的 content 里，箭头只能拿字符顶；
       做成元素以后，箭头走 icons\ 里那张图（▲▼◀▶＋是读不到 icons\ 时的兜底字），
       文字也归界面文字清单管了。 */
    const HINTS = {
      t:['caretUp',   '这里新开 · 上下分屏'],
      b:['caretDown', '这里新开 · 上下分屏'],
      l:['caretLeft', '这里新开'],
      r:['caretRight','这里新开'],
      c:['plus',      '并成这一格的新标签']
    };
    const hint = h('div', { class:'wnw-drop-hint' });
    pane.appendChild(hint);
    const showHint = zone => {
      const it = HINTS[zone] || HINTS.c;
      hint.setAttribute('data-icofix', it[0]);
      hint.innerHTML = '<span class="hi w-ico"></span><span>' + it[1] + '</span>';
      icoFix(hint);
    };
    pane.addEventListener('dragover', ev => {
      if(!Drag.tab) return;
      ev.preventDefault();
      const r = pane.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      /* 标签条就在格子顶上，手一停就贴着上边，所以左右给 30%、上下只给 18%：
         想左右分屏时不用刻意把鼠标拽到很靠中的位置。 */
      const near = [['l', x], ['r', 1 - x], ['t', y], ['b', 1 - y]]
        .filter(z => z[1] <= (z[0] === 'l' || z[0] === 'r' ? .30 : .18)).sort((p, q) => p[1] - q[1]);
      const zone = near.length ? near[0][0] : 'c';
      const was = pane.classList.contains('dropping');
      if(!was || pane.dataset.zone !== zone){
        pane.dataset.zone = zone;
        pane.classList.remove('z-t','z-b','z-l','z-r','z-c');
        pane.classList.add('z-' + zone);
        hint.dataset.z = zone;
        showHint(zone);
      }
      pane.classList.add('dropping');
    });
    pane.addEventListener('dragleave', ev => {
      if(!pane.contains(ev.relatedTarget)){ pane.classList.remove('dropping'); hint.classList.remove('on'); }
    });
    pane.addEventListener('drop', ev => {
      ev.preventDefault();
      const src = Drag.tab; Drag.clear();
      pane.classList.remove('dropping'); hint.classList.remove('on');
      if(!src) return;
      const zone = pane.dataset.zone || 'c';
      const tb = src.node.tabs.splice(src.i, 1)[0];
      if(!tb) { this.drawMid(); return; }
      if(src.node === node && src.i < src.node.act) node.act--;
      if(zone === 'c'){
        node.tabs.push(tb); node.act = node.tabs.length - 1;
      } else {
        if(this.leafCount() >= 8){ toast('最多 8 个分屏格子'); node.tabs.push(tb); node.act = node.tabs.length - 1; }
        else this.splitFor(node, zone, tb);
      }
      this.prune(); this.save(); this.drawMid();
    });
  },
  /* 把一个叶子按方向切开，新标签进新开的那格 */
  splitFor(node, zone, tb){
    const dir = (zone === 't' || zone === 'b') ? 'h' : 'v';
    const leaf = { t:'leaf', tabs:[tb], act:0 };
    const wrap = { t:'split', dir, r:.5, a:node, b:leaf };
    if(zone === 't' || zone === 'l') { wrap.a = leaf; wrap.b = node; }
    this.replaceNode(node, wrap);
  },
  /* 分屏入口：标签条上的 ⇄ 和标签右键都走这里。空格子会被 prune 掉，
     所以一格里少于两个标签分不出第二格——直接说清楚，别默默什么都不发生。 */
  splitTab(node, i, zone){
    if(!node.tabs[i]){ toast('这一格还没有标签'); return; }
    if(node.tabs.length < 2){ toast('这一格只有一个标签：先开第二个标签，然后才能分屏'); return; }
    if(this.leafCount() >= 8){ toast('最多 8 个分屏格子'); return; }
    const tb = node.tabs.splice(i, 1)[0];
    if(i < node.act) node.act--;
    node.act = Math.max(0, Math.min(node.act, node.tabs.length - 1));
    this.splitFor(node, zone, tb);
    this.prune(); this.save(); this.drawMid();
  },
  tabMenu(x, y, node, i){
    /* 关闭这五条只管右键这一格的标签条，和标签上那个关闭叉同一个口径 —— 别的格子一概不动。
       凑不出来的组合整条不摆（往左已经没有了就不给「关闭左侧」），不是摆出来点不动。 */
    const n = node.tabs.length;
    const split = [
      { label:'向左分屏', fn:() => this.splitTab(node, i, 'l') },
      { label:'向右分屏', fn:() => this.splitTab(node, i, 'r') }
    ];
    const shut = [
      { label:'关闭当前标签', fn:() => this.closeTab(node, i) },
      i > 0 ? { label:'关闭左侧标签', fn:() => this.closeWhere(node, i, j => j < i) } : null,
      i < n - 1 ? { label:'关闭右侧标签', fn:() => this.closeWhere(node, i, j => j > i) } : null,
      n > 1 ? { label:'关闭其他标签', fn:() => this.closeWhere(node, i, j => j !== i) } : null,
      /* 只剩一枚标签的时候「关闭所有」和「关闭当前」是同一件事，就不多摆一条 */
      n > 1 ? { label:'关闭所有标签', fn:() => this.closeWhere(node, i, () => true) } : null
    ].filter(Boolean);
    Menu.open(x, y, shut.length ? split.concat([{ sep:true }], shut) : split);
  },
  findParent(target){
    const walk = (node, parent) => {
      if(node === target) return parent;
      if(node && node.t === 'split') return walk(node.a, node) || walk(node.b, node);
      return null;
    };
    return walk(this.st.tree, null);
  },
  replaceNode(target, withNode){
    if(this.st.tree === target){ this.st.tree = withNode; return; }
    const p = this.findParent(target);
    if(p){ if(p.a === target) p.a = withNode; else p.b = withNode; }
  },
  removeNode(target){
    if(this.st.tree === target){ this.st.tree = { t:'leaf', tabs:[], act:0 }; return; }
    const p = this.findParent(target);
    if(!p) return;
    const keep = p.a === target ? p.b : p.a;
    this.replaceNode(p, keep);
  },
  /* 空叶子不渲染：抽掉它，父分屏就跟着塌成另一格；整棵树都空了才留一个裸叶子 */
  prune(){
    for(const lf of this.leaves(this.st.tree)) if(lf.act >= lf.tabs.length) lf.act = Math.max(0, lf.tabs.length - 1);
    let go = true;
    while(go){
      go = false;
      const root = this.st.tree;
      if(root && root.t === 'split'){
        for(const lf of this.leaves(root)) if(!lf.tabs.length){ this.removeNode(lf); go = true; break; }
      }
    }
    if(!this.st.tree) this.st.tree = { t:'leaf', tabs:[], act:0 };
  },
  closeTab(node, i){
    const tb = node.tabs[i];
    if(!tb) return;
    const api = this.live.get(tb.id);
    try{ api && api.unmount && api.unmount(); }catch(e){}
    this.live.delete(tb.id);
    node.tabs.splice(i, 1);
    this.prune(); this.save(); this.drawMid();
  },
  /* 一次关多枚（右键菜单那几条）：先把要关的凑成一摞，挨个解掉实例后一次换成新标签表，
     最后只塌一次空格、只存一次、只重画一次 —— 挨枚走 closeTab 的话每关一枚就整格重排一遍，
     看着是连闪好几下，存的也是中间那些没人要的半成品。 */
  closeWhere(node, i, test){
    const cur = node.tabs[i];
    const keep = [], shut = [];
    node.tabs.forEach((tb, j) => { (test(j) ? shut : keep).push(tb); });
    if(!shut.length) return;
    for(const tb of shut){
      const api = this.live.get(tb.id);
      try{ api && api.unmount && api.unmount(); }catch(e){}
      this.live.delete(tb.id);
    }
    node.tabs = keep;
    /* 右键点的那枚还留着就让它接着亮着（关掉左边那一排之后它就是头一枚），被关掉了就用剩下的头一枚 */
    const k = keep.indexOf(cur);
    node.act = k >= 0 ? k : 0;
    this.prune(); this.save(); this.drawMid();
  },
  async renameTab(tb, el){
    const inp = h('input', { class:'wnw-rename', value:el.querySelector('.tx').textContent });
    el.replaceChild(inp, el.querySelector('.tx'));
    inp.focus(); inp.select();
    const done = () => { tb.label = inp.value.trim(); this.save(); this.drawMid(); };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', e => { if(e.key === 'Enter') inp.blur(); if(e.key === 'Escape'){ inp.value = tb.label || ''; inp.blur(); } });
  },
  /* 新开一个标签：默认落在当前活动格子里 */
  /* 同一份内容只许一个标签：连着点两下、或者分屏两处都点开，就是两份互相顶版本 */
  findTab(kind, ref){
    if(!ref) return null;
    for(const lf of this.leaves(this.st.tree)){
      const i = (lf.tabs || []).findIndex(tb => tb.kind === kind && tb.ref === ref);
      if(i >= 0) return { lf, i, tb: lf.tabs[i] };
    }
    return null;
  },
  async addTab(kind, ref, where){
    const def = Views.get(kind);
    if(!def){ toast('这种内容打不开：' + kind); return null; }
    const hit = this.findTab(kind, ref);
    if(hit){
      hit.lf.act = hit.i; this.activeLeaf = hit.lf;
      this.save(); this.drawMid();
      toast('这一份已经开着了 · 直接跳过去');
      return hit.tb;
    }
    const leaf = this.targetLeaf(where);
    const tb = { id: uid('t'), kind, ref, label: await this.labelOf(kind, ref) };
    leaf.tabs.push(tb); leaf.act = leaf.tabs.length - 1;
    this.prune(); this.save(); this.drawMid();
    return tb;
  },
  targetLeaf(where){
    const all = this.leaves(this.st.tree);
    if(where && where.node && all.includes(where.node)) return where.node;
    /* 点过哪个格子就落在哪个格子；没记录就用第一个有内容的格子 */
    if(this.activeLeaf && all.includes(this.activeLeaf)) return this.activeLeaf;
    return all.find(lf => lf.tabs.length) || all[0];
  },
  async labelOf(kind, ref){
    const def = Views.get(kind);
    if(!def) return kind;
    try{ return (await def.title(ref)) || def.name; }catch(e){ return def.name; }
  },
  /* 统一的渲染入口：一个 live 实例，切标签时复用或重建。
     视图用 ctx.on 订阅总线，退出的时候这条链路由这里统一解开。 */
  render(def, body, ctx){
    const tb = ctx.tab;
    const offs = [], downs = [];
    const api = { host:body, ctx,
      on(k, f){ offs.push(Bus.on(k, f)); },
      unmount(){ offs.splice(0).forEach(off => { try{ off(); }catch(e){} });
        downs.splice(0).forEach(f => { try{ f(); }catch(e){} }); } };
    if(tb) this.live.set(tb.id, api);
    body.classList.add('wnw-view');
    /* 第 14 条：这一层是哪个功能，写在盒子身上。弹短句提示时先认焦点所在的那一层，
       认不到就用最近渲染的这层（停靠面板不算，它一次画一排，谁在最后没意义） */
    if(def.kind) body.dataset.wnwKind = def.kind;
    const merged = Object.assign({
      desk:this, wide:() => body.clientWidth,
      ref: tb ? tb.ref : ctx.ref,
      close:ctx.close || (() => {}),
      on:(k, f) => api.on(k, f),
      dispose:f => downs.push(f),
      compact:ctx.dock ? ctx.dock.mode === 'compact' : false,
      /* 改标题只换标签条上的字。重画整格会把正在输入的标题框干掉，还会转回来再调一次自己 → 死循环 */
      setTitle:async (t) => {
        if(!tb || tb.label === t) return;
        tb.label = t;
        if(ctx.dock) ctx.dock.label = t;
        this.save();
        const dock = body.closest('.wnw-dock-card');
        const tx = dock ? dock.querySelector('.wnw-dock-bar .tx')
          : (body.closest('.wnw-pane') || { querySelector:() => null }).querySelector('.wnw-tabx.on .tx');
        if(tx) tx.textContent = t; else this.drawMid();
      },
      /* 改地址：这一格看的是哪一份内容，记在标签自己身上，不重画整格 ——
         重画会把正看着的那一份内容打断。 */
      setRef:(v) => {
        if(tb && tb.ref !== v){ tb.ref = v; if(ctx.dock) ctx.dock.ref = v; this.save(); }
      }
    }, ctx, { api });
    def.render(body, tb ? tb.ref : ctx.ref, merged);
    return api;
  },
  /* ---------- 右栏：自由停靠，纵向堆叠、各自折叠 ---------- */
  drawRight(){
    this.dropLive(id => id.startsWith('dock.'));
    const box = this.rightBox; box.innerHTML = '';
    const cols = this.dockCols();
    /* 这一栏当下真正摆出来几栏：refitDock 拿它跟实测宽度比，跨了那条线才整栏重画一次 */
    this.colsShown = cols;
    const head = h('div', { class:'wnw-dock-head' }, [
      h('b', {}, '停靠'), h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', title:'折叠除「常驻」以外的全部面板', onclick:() => this.foldAll() }, '一键折叠'),
      /* 丙-1：这个只管「摆几栏」，谁进哪一栏、上下怎么排全是拖出来的（见 dockMoveTo）。
             字写的是点下去换到的那一档，和「一键折叠」一样是动作口吻 */
      h('button', { class:'wnw-btn mini', title:cols === 2 ? '改回一栏：面板从上往下叠' : '摆成两栏：左右等宽，抓着面板标题上的名字拖到另一栏',
        onclick:() => this.setDockCols(cols === 2 ? 1 : 2) }, cols === 2 ? '一栏' : '两栏'),
      h('button', { class:'wnw-btn mini', title:'添加停靠面板', onclick:() => this.pickDlg({ dock:true }), html:icoMarkup('plus') }),
      h('button', { class:'wnw-btn mini', title:'收起停靠栏（顶部「停靠」按钮可以再打开）', onclick:() => this.toggleRight(false) }, '»')
    ]);
    box.appendChild(head);
    const list = h('div', { class:'wnw-dock-list' + (cols === 2 ? ' two' : '') });
    box.appendChild(list);
    /* 丙-1：两栏时列只是两个容器，卡片还是 dockCard 现搭那一张 —— 折叠 / 常驻 / × / 拖高度 / 精简
       全走原来那一路，不另起一套。一栏时结构照旧（卡直接进 list），一个节点都不多塞。 */
    let colEls = [list];
    this.colEls = null;
    if(cols === 2){
      colEls = [h('div', { class:'wnw-dock-col', 'data-col':'0' }), h('div', { class:'wnw-dock-col', 'data-col':'1' })];
      for(const el of colEls){ list.appendChild(el); this.dockColDnd(el, Number(el.dataset.col)); }
      this.colEls = colEls;
    }
    const empt = [0, 0];
    for(const it of this.st.dock) empt[this.dockColOf(it, cols)]++;
    /* 空着的那一栏给一句话：一栏时没卡还是从前那句「点击 + 号」；两栏时哪一栏空就写上哪一栏，
       不然右边那栏光秃秃的，看着像这功能没做完，也不知道能往那儿拖 */
    const noDock = !this.st.dock.length;
    for(let i = 0; i < colEls.length; i++){
      const txt = noDock ? (i === 0 ? '点击 + 号，停靠任意内容。' : '这一栏空着 · 抓着面板标题上的名字拖到这里')
        : (!empt[i] ? '这一栏空着 · 抓着面板标题上的名字拖到这里' : '');
      if(txt) colEls[i].appendChild(h('div', { class:'wnw-hint', style:'padding:10px 4px' }, txt));
    }
    for(const it of this.st.dock) colEls[this.dockColOf(it, cols)].appendChild(this.dockCard(it, list));
    this.refitDock();
  },
  toggleRight(v){
    this.st.rightOn = v === undefined ? !this.st.rightOn : !!v;
    this.save(); this.applySizes();
    if(this.st.rightOn) this.refitDock();
  },
  foldAll(){
    const got = this.st.dock.some(it => it.open && !it.pin);
    for(const it of this.st.dock) if(!it.pin) it.open = false;
    this.save(); this.drawRight();
    if(got) toast('已折叠，常驻的面板没动');
  },
  /* ---------- 丙-1：停靠摆几栏、哪一张卡在哪一栏 ----------
     栏归属记在每张卡自己那条上（it.col = 0 / 1），和 dock 那份数组存在同一格里。
     数组还是只有一份、顺序还是数组顺序：哪一栏看到的那一摞就是「按 col 筛一遍再照数组顺序排」，
     所以同栏换序和跨栏换位是同一套挪动，不必各存一份清单，也不动组件递面板的那个口子。 */
  dockColOf(it, cols){
    /* 一栏时没有「栏」这回事，全算第 0 栏；老数据没写过 col 的也落在这一栏 */
    return (cols === undefined ? this.dockCols() : cols) === 2 && it.col === 1 ? 1 : 0;
  },
  /* 眼下摆几栏：挑了两栏但右栏实测放不下就先退回一栏，挑的那一份不动 ——
     把右栏拖宽又是两栏，不用重新点一次这个 */
  dockCols(){
    return this.st.dockCols === 2 && this.dockColsFit() ? 2 : 1;
  },
  /* 摆得下摆不下照右栏的实测内宽算（clientWidth 已经把右栏那条 hair 描边扣掉了）：
     列表左右 padding 各 10、两栏中间那道 gap 10，剩下的对半分，每一半都不许窄过 DOCK_COL_MIN */
  dockColsFit(){
    if(!this.rightBox || !this.st.rightOn) return false;
    return this.rightBox.clientWidth - 30 >= this.DOCK_COL_MIN * 2;
  },
  /* 顺手把右栏拉到多宽才摆得开两栏：在算式那个数上再垫 8 像素。
     不垫的话点一下就正好卡在及格线上，抖一抖就又退回一栏，看着像没生效 */
  dockColsNeed(){ return this.DOCK_COL_MIN * 2 + 30 + 8; },
  setDockCols(n){
    this.st.dockCols = n === 2 ? 2 : 1;
    this.save();
    if(this.st.dockCols === 2){
      /* 点两栏可右栏没那么宽：顺手把它拉到放得下那一档。不这么做就是点一下什么也没发生，
         看着像这个坏了。中栏那条底线在 applySizes 里拦着，抢不过编辑器；真被拦住了就说清楚要多宽。 */
      if(!this.st.rightOn) this.st.rightOn = true;
      if(this.st.rightW < this.dockColsNeed()) this.st.rightW = this.dockColsNeed();
      this.save(); this.applySizes();
      if(!this.dockColsFit()) toast('窗口不够宽 · 右栏摆不下两栏（要 ' + this.dockColsNeed() + ' 像素宽）');
    }
    this.drawRight();
  },
  /* 把一张卡挪到「哪一栏 · 挨着谁」：tgt 给了就插到它前面 / 后面，没给就是那一栏末尾。
     col 给 null = 只换顺序、不改栏归属（一栏时拖来拖去不该把他排好的两栏打散） */
  dockMoveTo(d, col, tgt, pos){
    const a = this.st.dock, from = a.indexOf(d);
    if(from < 0 || (tgt && a.indexOf(tgt) < 0)) return;
    a.splice(from, 1);
    let at = a.length;
    if(tgt){ const i = a.indexOf(tgt); at = pos === 'after' ? i + 1 : i; }
    a.splice(at, 0, d);
    if(col !== null && col !== undefined) d.col = col;
    this.save(); this.drawRight();
  },
  /* 空的那一栏、还有某一栏卡片下面剩下的空白都是落点：松手就落到那一栏末尾。
     没有这一条，右栏空着的时候就无处可投，跨栏只能往有卡的栏里挤。 */
  dockColDnd(el, ci){
    const me = this;
    el.addEventListener('dragover', ev => {
      if(!me.dockCur) return;
      /* 卡片自己会接那一趟并 stopPropagation，能冒到这儿来的就是「列里的空白」 */
      ev.preventDefault(); ev.stopPropagation();
      try{ ev.dataTransfer.dropEffect = 'move'; }catch(e){}
      me.markCol(el);
    });
    el.addEventListener('dragleave', ev => { if(!el.contains(ev.relatedTarget)) me.markCol(null); });
    el.addEventListener('drop', ev => {
      const d = me.dockCur;
      if(!d) return;
      ev.preventDefault(); ev.stopPropagation();
      me.dockCur = null; me.markCol(null);
      me.dockMoveTo(d, ci, null);
    });
  },
  /* 跨栏拖的时候除了卡片上那道插入线，再把要落进去的整一栏淡淡亮一下：
     光看插入线认不出自己已经换到另一栏了 */
  markCol(col){
    if(!this.colEls) return;
    for(const el of this.colEls) el.classList.toggle('dnd-col', el === col);
  },
  dockCard(it, list){
    const def = Views.get(it.kind);
    /* wnw-nosel：停靠这一整张（标题栏 + 里面那些列表、数字格）是我们自己画的界面，
       按住一拖就选出一片蓝底只会碍事；里头真打字的那几样由皮肤那句 .wnw-nosel 放回去 */
    const card = h('div', { class:'wnw-dock-card wnw-nosel' + (it.open ? '' : ' shut') });
    /* 设置 / 改词库这几个钉在标题条上，和「常驻」并排：Flow-Desk 卡上有这几个，停靠不能缺。
       设置这个只给插件清单点了 settings 的那几家（插件的设置回归插件自己，不在程序设置里另开一页）。
       「改代码」那颗跟着插件分离第 2 批撤了：装着的插件不在程序里开改代码的口。 */
    const which = (typeof toolBankWhich === 'function') ? toolBankWhich(it.kind) : '';
    const tdef = (typeof Tools !== 'undefined') ? Tools.get(it.kind) : null;
    const edits = [
      (PACK_META[it.kind] && PACK_META[it.kind].settings && tdef && typeof tdef.settings === 'function')
        ? h('button', { class:'b', title:'设置 · ' + (it.label || tdef.name || it.kind),
            onclick:() => tdef.settings(PackLoader.ctxOf(it.kind) || PackCtx.make(it.kind)) }, '设置') : null,
      (which && typeof BankDlg !== 'undefined') ? h('button', { class:'b', title:'改这个功能用的词库',
        onclick:() => BankDlg.open(which) }, '改词库') : null
    ].filter(Boolean);
    const head = h('div', { class:'wnw-dock-bar' }, [
      h('span', { class:'ic', html:icoFor(it.kind, def && def.icon) }),
      this.dockGrip(h('span', { class:'tx' }, it.label || (def ? def.name : it.kind)), it),
      h('span', { style:'flex:1' }),
      ...edits,
      h('button', { class:'b' + (it.pin ? ' on' : ''), title:it.pin ? '常驻中：一键折叠不会收它' : '设为常驻：一键折叠时不收这个',
        onclick:() => { it.pin = !it.pin; this.save(); this.drawRight(); } }, '常驻'),
      h('button', { class:'x', title:it.open ? '折叠' : '展开', 'aria-label':it.open ? '折叠' : '展开',
        html:icoMarkup(it.open ? 'caretUp' : 'caretDown'), onclick:() => { it.open = !it.open; this.save(); this.drawRight(); } }),
      h('button', { class:'x', title:'移出停靠', 'aria-label':'移出停靠', html:icoMarkup('close'), onclick:() => { const api = this.live.get('dock.' + it.id); try{ api && api.unmount && api.unmount(); }catch(e){} this.live.delete('dock.' + it.id);
        this.st.dock = this.st.dock.filter(x => x !== it); this.save(); this.drawRight(); } })
    ]);
    card.appendChild(head);
    /* 第 8 条：拖的、接的都拿这一张卡的 it 对号，落在这张的上半 = 插到它前面，下半 = 插到它后面 */
    this.dockDnd(card, it);
    const body = h('div', { class:'wnw-dock-body' });
    card.appendChild(body);
    /* 第 15 条：这个面板开多高归它自己记（it.h）。没记就跟着内容走、最长 46vh；
       拖过下边沿之后走那个数，里面按新高度重新排 */
    if(it.h){ body.style.height = it.h + 'px'; body.style.maxHeight = 'none'; }
    if(it.open) card.appendChild(this.dockResize(body, it));
    head.addEventListener('click', ev => { if(ev.target === head || ev.target.classList.contains('tx')){ it.open = !it.open; this.save(); this.drawRight(); } });
    if(def && it.open){
      if(!def.dockable && def.dockable !== undefined){ body.appendChild(h('div',{class:'wnw-hint'},'这个面板不能停靠')); }
      else{
        const tb = { id:'dock.' + it.id, kind:it.kind, ref:it.ref, label:it.label };
        this.render(def, body, { where:'dock', ref:it.ref, tab:tb, dock:it, close:() => { this.st.dock = this.st.dock.filter(x => x !== it); this.save(); this.drawRight(); } });
      }
    }
    return card;
  },
  /* ---------- 第 15 条：停靠面板的下边沿拖高度 ----------
     拖的时候只改这一格的内联高度（里面的网格、列表自己会跟着重排），松手才把数记进 it.h、
     重画右栏一次 —— 有些面板是开的时候量过一次宿主高度的，光改 CSS 它不知道。
     双击这道边回到「跟着内容走」：it.h 清 0，那条 46vh 的上限又生效。 */
  /* 丁-1：这一张卡的 body 最多能多高 —— 量到「看得见的那一格的底边」为止。
     从前拖拽的上限写的是 innerHeight 的 80%，那是照着整扇窗给的，可这一栏顶上有「停靠」那一行、
     手上还有别的卡压着，80% 一给就顶穿栏底：面板下沿跑到窗口外，跟着掉出去的还有这道把手本身 ——
     想收回来只能去滚那条本来就没人注意的栏内滚动条。夹在这里，底边碰到可视底边就停住。
     可视底边取「这一栏自己的底边」和「窗口下沿」里更靠上的那一个：卡片现在是能缩的了，
     但栏这一侧若被外面的东西顶到窗口外，照窗口下沿算才不会给出一条量不到的上限。
     chrome 用「卡高减 body 高」算，卡头、把手、卡片内边距都在里面，且不随 body 变高而变，
     所以拖的这一趟里这把尺是稳的。 */
  dockMaxH(body){
    const card = body.closest && body.closest('.wnw-dock-card');
    const box = body.closest('.wnw-dock-col') || body.closest('.wnw-dock-list');
    if(!card || !box) return 0;
    const bb = box.getBoundingClientRect(), cb = card.getBoundingClientRect(), bd = body.getBoundingClientRect();
    const chrome = cb.height - bd.height;
    const bottom = Math.min(bb.bottom, window.innerHeight);
    const top = Math.max(cb.top, bb.top);
    return Math.max(120, Math.round(bottom - 10 - top - chrome));
  },
  dockResize(body, it){
    const grip = h('i', { class:'wnw-dock-rz', title:'按住这道边上下拖，调这个面板的高度；双击回到跟着内容走' });
    grip.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const y0 = ev.clientY, h0 = body.getBoundingClientRect().height;
      grip.classList.add('on');
      const mv = e => {
        body.style.maxHeight = 'none';
        const cap = this.dockMaxH(body);
        body.style.height = Math.round(Math.min(cap, Math.max(120, h0 + e.clientY - y0))) + 'px';
      };
      const up = () => {
        grip.classList.remove('on');
        grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up);
        it.h = parseInt(body.style.height, 10) || 0;
        this.save(); this.drawRight();
      };
      grip.setPointerCapture(ev.pointerId);
      grip.addEventListener('pointermove', mv);
      grip.addEventListener('pointerup', up);
    });
    grip.addEventListener('dblclick', ev => { ev.stopPropagation(); it.h = 0; this.save(); this.drawRight(); });
    return grip;
  },
  /* ---------- 第 8 条：右栏那几个停靠面板上下换序 ----------
     抓的是标题条上那个名字：拖到别的面板上半 = 插到它前面，下半 = 插到它后面。
     那个点着还是原来的折叠 / 展开 —— 一次拖动不会被浏览器算成点击，两不耽误。 */
  dockGrip(el, it){
    const me = this;
    el.setAttribute('draggable', 'true');
    el.classList.add('wnw-grip');
    el.title = (el.title ? el.title + ' · ' : '') + '拖着我换上下顺序';
    el.addEventListener('dragstart', ev => {
      me.dockCur = it;
      el.classList.add('dnd-out');
      /* 拖走的那一张整卡淡一下：只让名字淡，两栏时看不出这一栏少了一张 */
      const from = el.closest('.wnw-dock-card');
      if(from) from.classList.add('dnd-out');
      try{ ev.dataTransfer.setData('text/plain', 'dock'); ev.dataTransfer.effectAllowed = 'move'; }catch(e){}
      ev.stopPropagation();
    });
    el.addEventListener('dragend', () => {
      me.dockCur = null;
      for(const x of wnwRoot().querySelectorAll('.dnd-out,.dnd-tgt,.dnd-col')) x.classList.remove('dnd-out', 'dnd-tgt', 'dnd-col');
    });
    return el;
  },
  dockDnd(card, it){
    const me = this;
    card.addEventListener('dragover', ev => {
      const d = me.dockCur;
      if(!d) return;
      if(d === it){
        /* 正拖着自己这一张：不给落点，也别让这一趟冒到列上去
           （冒上去就被当成「拖到这一栏末尾」，在自己身上松手会平白换个位置） */
        ev.stopPropagation(); me.markCol(null); return;
      }
      ev.preventDefault(); ev.stopPropagation();
      const r = card.getBoundingClientRect();
      card.dataset.dnpos = ev.clientY < r.top + r.height / 2 ? 'before' : 'after';
      card.classList.add('dnd-tgt');
      me.markCol(card.parentElement);
    });
    card.addEventListener('dragleave', () => card.classList.remove('dnd-tgt'));
    card.addEventListener('drop', ev => {
      const d = me.dockCur;
      if(!d) return;
      ev.preventDefault(); ev.stopPropagation();
      const pos = card.dataset.dnpos;
      card.classList.remove('dnd-tgt');
      me.dockCur = null; me.markCol(null);
      /* 丙-1：落进哪一栏就看这张目标卡在不在哪一栏；一栏时 col 给 null，只换顺序不改栏归属 */
      me.dockMoveTo(d, me.colsShown === 2 ? me.dockColOf(it, 2) : null, it, pos);
    });
  },
  /* 宽度决定完整版 / 精简版：视图自己给 compact，没给就一直是完整版 */
  refitDock(){
    /* 丙-1：拖分隔条和缩窗口这两条路都走到这里，正好在这儿复查两栏放不放得下。
       跨了那条线就整栏重画（各栏里还是那几本、那个顺序），drawRight 末尾还会再回到这里一趟，
       那时 colsShown 已经和实测一致，不会来回弹。 */
    if(this.dockCols() !== this.colsShown){ this.drawRight(); return; }
    for(const it of this.st.dock){
      const api = this.live.get('dock.' + it.id);
      if(!api) continue;
      /* 丁-1：窗口缩小时同一把尺再夹一次，放大就回到他自己拖出来的那个数 ——
         it.h 记的始终是期望值，夹只夹屏幕上这一格，不动账。
         从前写的是 `cap || it.h`：量不到（这一格已不在栏里）就等于不夹，属于偷偷放过。 */
      if(it.h && api.host && api.host.style.height){
        const cap = this.dockMaxH(api.host);
        if(cap){
          const fit = Math.max(120, Math.min(it.h, cap));
          if(parseInt(api.host.style.height, 10) !== fit) api.host.style.height = fit + 'px';
        }
      }
      const def = Views.get(it.kind);
      const want = (def.compact && api.host.clientWidth < (def.compactBelow || 360)) ? 'compact' : 'full';
      if(it.mode === want) continue;
      it.mode = want;
      this.drawRight();
      return;
    }
  },
  /* 生成器受设置里的开关控制：关了就不给开，写作和素材不受影响 */
  async toolOn(kind){
    if(!Views.get(kind)) return false;
    const t = Tools.get(kind);
    if(!t || t.core) return true;
    return await State.get('auxOn', true) && await State.get('tool-' + t.id, true);
  },
  async openTool(id){
    if(!await this.toolOn(id)){ toast('「' + ((Tools.get(id) || {}).name || id) + '」在设置里是关着的'); return; }
    await this.addTab(id, null);
  },
  /* ---------- 右栏停靠：任何视图都能固定，纵向堆叠 ---------- */
  dockIt(kind, ref, label){
    const def = Views.get(kind);
    if(!def || def.dockable === false){ toast('这种内容不能停靠，开成标签就行'); return; }
    if(this.st.dock.some(d => d.kind === kind && d.ref === ref)){ toast('已经停在右栏了'); return; }
    if(!this.st.rightOn){ this.st.rightOn = true; this.applySizes(); }
    this.st.dock.push({ id: uid('dk'), kind, ref, label: label || def.name, open:true, mode:'full' });
    this.save(); this.drawRight();
  },
  /* 素材视图只认 id，从卡片 / 看板跳过来时先落到对应左栏，再开标签 */
  async newBoardFromCard(c){
    const list = await Boards.forBook(Work.book.id);
    const b = list.length ? await Boards.get(list[0].id) : await Boards.create(Work.book.title + ' · 看板', Work.book.id, 'event');
    b.nodes.push({ id: uid('nd'), cards: [c.id], label: c.title, fill: '', line: c.color || '', note: '', seq: '',
      ev: '', tv: '', t: '', img: '', tt: (b.ttracks[0] || {}).id || '', et: (b.etracks[0] || {}).id || '' });
    await Boards.put(b);
    this.st.rail = 'board'; this.save(); this.drawRail(); this.drawLeft();
    await this.addTab('board', b.id);
    Bus.emit('board:focus', b.id);
    toast('已把「' + c.title + '」放到看板上');
  },
  /* ---------- 顶栏状态：书名 / 字数 / 今日 / 计时。骨架只建一次，数字每秒改写 ---------- */
  drawTop(){
    const box = wnwRoot() && wnwRoot().querySelector('#wnwTopRight');
    if(!box) return;
    if(!this.book){ box.innerHTML = ''; this.topEl = null; return; }
    if(!this.topEl || this.topEl.box !== box){
      box.innerHTML = '';
      const el = { box, name:h('b', {}, ''), total:h('span', { class:'wnw-hint' }, ''),
        today:h('span', { class:'wnw-hint' }, ''), foot:h('span', { class:'wnw-hint', id:'wnwDeskFoot' }, '') };
      /* 收起停靠栏之后，顶栏这个按钮是唯一的入口，所以它不跟着右栏一起消失 */
      el.right = h('button', { class:'wnw-btn mini', title:'显示 / 收起右侧停靠栏', onclick:() => this.toggleRight() }, '停靠');
      box.appendChild(h('span', { class:'wnw-topstat' }, [el.name, el.total, el.today, el.foot, el.right,
        h('button', { class:'wnw-btn mini', onclick:() => Settings.open() }, '设置'),
        h('button', { class:'wnw-btn mini w-txt', title:'返回书架', onclick:() => Shell.showShelf(), html:icoMarkup('home') + '书架' })]));
      this.topEl = el;
    }
    const el = this.topEl;
    el.name.textContent = this.book.title;
    el.total.textContent = '全书 ' + Work.totalWords() + ' 字';
    el.today.textContent = '今日 +' + Work.todayWords() + ' 字';
  },
  /* ---------- ＋ 打开内容：分类清单，能搜、能藏、配方组件能彻底删 ---------- */
  async pickDlg(target){
    const hid = new Set(await toolHidden());
    let showHidden = false, kw = '';
    /* 辅助功能不写死：每一张注册进来的配方组件在这个列表里都是一张功能。
       这一组现取：导入一个新组件之后重画这张列表，得看得到它。 */
    const groups = [
      { name:'本书', items:[
        { kind:'ch', ref:() => Work.cur || (Work.book.chs[0] && Work.book.chs[0].id), label:'一章正文' },
        { kind:'cards', label:'卡片池' }, { kind:'insps', label:'灵感池' },
        { kind:'track', label:'追踪' },
        { kind:'tags', label:'标签' },
        ...REL_PICKS,
        { kind:'board', label:'看板（事件线 / 时间线）' },
        { kind:'stat', label:'写作统计' },
        /* 词巡航只吃「整卷的章都是词格」那种卷：一本书一卷都不够格时这一条不摆出来 */
        ...(cruiseAnyVol() ? [{ kind:'cruise', ref:() => cruiseAnyVol(), label:'词巡航（整卷词格闪卡）' }] : []),
        /* 书巡航（外26 追加）跨卷：这本书里只要有一章是词格就摆这一条，ref 递那枚哨兵 */
        ...(cruiseBookReady() ? [{ kind:'cruise', ref:() => CRUISE_BOOK, label:'书巡航（整本书词格闪卡）' }] : [])
      ]},
      /* 各家自己登记的整组排在这儿（外46 十之前这里是写死的一组） */
      ...PICK_GROUPS,
      { name:'辅助功能', get items(){ return [...Tools].filter(([, t]) => !t.core).map(([id, t]) => ({ kind:id, label:t.name })); } }
    ];
    const open = it => {
      Overlay.close();
      if(it.rail){ this.st.leftOn = true; this.st.rail = it.rail; this.save(); this.applySizes(); this.drawRail(); this.drawLeft(); return; }
      const ref = it.ref ? it.ref() : null;
      if(target && target.dock) this.dockIt(it.kind, ref, it.label);
      else this.addTab(it.kind, ref, target);
    };
    const box = h('div', { class:'wnw-pick' });
    const body = h('div', { class:'wnw-col' });
    /* 往停靠栏里加的时候，不能停靠的那种内容根本不摆出来：
       点了挂不上的入口，比少一个入口更糟。 */
    const forDock = !!(target && target.dock);
    const canDock = kind => (Views.get(kind) || {}).dockable !== false;
    const draw = async () => {
      body.innerHTML = '';
      const key = kw.trim().toLowerCase();
      const covered = new Set();   /* 已经在上面有行的包：不占功能位的那些包另说 */
      for(const g of groups){
        const live = [];
        for(const it of g.items){
          if(!await this.toolOn(it.kind)) continue;
          if(forDock && !canDock(it.kind)) continue;
          if(hid.has(it.kind) !== showHidden) continue;
          if(key && !String(it.label || '').toLowerCase().includes(key) && !it.kind.toLowerCase().includes(key)) continue;
          live.push(it);
        }
        if(!live.length) continue;
        body.appendChild(h('div', { class:'wnw-pick-h' }, g.name));
        const row = h('div', { class:'wnw-pick-row' });
        for(const it of live){
          const R = (typeof GenReg !== 'undefined') ? GenReg.内容(it.kind) : null;
          const isHid = hid.has(it.kind);
          /* 这个功能是哪一家的包带的：注册名有时候带 tool- 前缀，插件清单里是光板 id，两边都认 */
          const pid = Packs.has(it.kind) ? it.kind
            : (typeof it.kind === 'string' && it.kind.startsWith('tool-') && Packs.has(it.kind.slice(5)) ? it.kind.slice(5) : '');
          if(pid) covered.add(pid);
          row.appendChild(h('div', { class:'wnw-pick-item' }, [
            h('button', { class:'wnw-btn' + (isHid ? ' on' : ''), onclick:() => open(it) }, it.label),
            h('button', { class:'wnw-btn mini ico' + (isHid ? ' off' : ''), title:isHid ? '放回列表里，数据没动过' : '只是不再出现在这张列表里，数据和设置都不动',
              'aria-label':isHid ? '找回' : '隐藏', html:icoMarkup(isHid ? 'eyeOff' : 'eye'),
              onclick:async () => {
                await toolHide(it.kind, !isHid);
                if(isHid) hid.delete(it.kind); else hid.add(it.kind);
                draw();
              } }),
            R ? h('button', { class:'wnw-btn mini', title:'把这一家的配方原样拷走',
              onclick:() => genExportAsk(R) }, '导出') : null,
            R ? h('button', { class:'wnw-btn mini', title:'连这一家的配方、生成的代码和历次记录一起抹干净',
              onclick:() => genDeleteAsk(R, draw) }, '删除') : null,
            /* 插件：卸载 = 改名单 + 刷新这一页，这一段代码从这一轮加载里摘走，这个入口跟着没了 */
            pid ? PackOps.unloadButton(pid, draw) : null].filter(Boolean)));
        }
        body.appendChild(row);
      }
      /* 不占功能位的包：只往设置里垫几行、只加一个快捷键、只带一个后台监听。
         这种在上面那几张组里根本没有行 —— 不补一行，就再也找不到卸掉它的入口了。 */
      if(!showHidden){
        const loose = Packs.list().filter(m => PackOps.forHost(m) && !covered.has(m.id) &&
          (!key || (m.name + ' ' + m.id).toLowerCase().includes(key)));
        if(loose.length){
          body.appendChild(h('div', { class:'wnw-pick-h' }, '不占功能位 · 只加设置或后台'));
          for(const m of loose){
            const r0 = h('div', { class:'wnw-pick-row' });
            r0.appendChild(h('span', { class:'wnw-hint w-txt', title:m.desc || '' },
              [h('span', { html:icoFor(m.id, m.icon) }), m.name]));
            const ub = PackOps.unloadButton(m.id, draw); if(ub) r0.appendChild(ub);
            body.appendChild(r0);
          }
        }
      }
      /* 插件路径里有这一格、这一轮没加载它（#30：装进来与请进来是两颗，各留一条痕）。单列一组，给个「加载」。 */
      if(!showHidden) for(const p of await PackOps.unloaded()){
        if(key && !String(p.name || '').toLowerCase().includes(key) && !p.id.toLowerCase().includes(key)) continue;
        body.appendChild(h('div', { class:'wnw-pick-h' }, '路径里有 · 这一轮没加载'));
        const r2 = h('div', { class:'wnw-pick-row' });
        r2.appendChild(h('span', { class:'wnw-hint w-txt', title:(p.desc || '') + (p.author ? ' · 作者 ' + p.author : '') },
          [h('span', { html:icoFor(p.id, p.icon) }), p.name + '（' + p.id + '）']));
        const lb = PackOps.loadButton(p.id); if(lb) r2.appendChild(lb);
        const rb = PackOps.removeButton(p.id, draw); if(rb) r2.appendChild(rb);
        body.appendChild(r2);
      }
      const recent = ((await State.get('recent', [])) || []).slice(0, 12).filter(rc => Views.get(rc.kind));
      body.appendChild(h('div', { class:'wnw-pick-h' }, '最近打开'));
      const rr = h('div', { class:'wnw-pick-row' });
      if(!recent.length) rr.appendChild(h('span', { class:'wnw-hint' }, '还没有打开过内容'));
      /* 手动去掉那一笔（作者 2026-10-09「停靠的最近打开允许手动删除」）：每一枚后头跟一颗 ×，停上去才露出来
         （灵感那一条用的就是这个画法）。动的只有 最近打开 这一份名单 —— 章、卡、看板那一份内容一个字不碰，
         下次再打开它自己回到名单里，所以这一删不配问一句。
         点完只摘这一枚，不重跑那张列表：整屏 innerHTML 重铺会让每一枚都闪一下、行一窄就跟着跳（他录屏量到的）。 */
      for(const rc of recent){
        const 枚 = h('div', { class:'wnw-pick-item' });
        枚.appendChild(h('button', { class:'wnw-btn', onclick:() => {
          Overlay.close();
          if(target && target.dock) this.dockIt(rc.kind, rc.ref, rc.label);
          else this.addTab(rc.kind, rc.ref, target);
        }}, rc.label || rc.kind));
        枚.appendChild(h('button', { class:'x', title:'从最近打开里去掉', 'aria-label':'从最近打开里去掉', html:icoMarkup('close'), onclick:async ev => {
          ev.stopPropagation();
          await recentDrop(rc);
          枚.remove();
          if(!rr.children.length) rr.appendChild(h('span', { class:'wnw-hint' }, '还没有打开过内容'));
        } }));
        rr.appendChild(枚);
      }
      body.appendChild(rr);
    };
    box.appendChild(h('div', { class:'wnw-row' }, [
      h('input', { type:'search', class:'wnw-input', placeholder:'搜功能名', style:'flex:1 1 auto',
        oninput:ev => { kw = ev.target.value; draw(); } }),
      h('label', { class:'wnw-switch' }, [h('input', { type:'checkbox', onchange:ev => { showHidden = ev.target.checked; draw(); } }),
        h('span', {}, '显示已隐藏')]),
      /* 「导入配方」那颗也走登记处挂上来的手（4.3 同一条口径：为写不认推演定制那一家的顶层名字） */
      (typeof GenReg !== 'undefined' && GenReg.有导入()) ? h('button', { class:'wnw-btn mini', title:'把别处导出的配方 JSON 装回来',
        onclick:() => GenReg.开导入(draw) }, '导入配方') : null,
      /* 整个包的入口和 FD 那一侧是同一把尺：收进 data\plugins\，装完先不加载，要用了再按那一颗「加载」 */
      PackOps.installButton()
    ]));
    box.appendChild(body);
    Overlay.open('打开内容', box, null, { replace:true });
    await draw();
  },
  async noteRecent(kind, ref, label){
    const list = (await State.get('recent', [])) || [];
    const row = { kind, ref, label, at: Date.now() };
    const i = list.findIndex(x => x.kind === kind && x.ref === ref);
    if(i >= 0) list.splice(i, 1);
    list.unshift(row);
    State.set('recent', list.slice(0, 20));
  },
  /* ---------- 顶栏：字数 / 今日 / 计时 ---------- */
  startClock(){
    clearInterval(this.tickTimer);
    this.openedAt = Date.now();
    this.tickTimer = setInterval(() => { this.tickSec(); }, 1000);
  },
  tickSec(){
    if(!this.book) return;
    /* 在位时长看焦点是不是落在能写字的地方（正文是 contenteditable，也算） */
    const typing = Meter.editing();
    Meter.tick();
    if(typing){
      Work.touchTime(1);
      if(!this.bookTimer) this.bookTimer = setTimeout(async () => { this.bookTimer = null; await Work.saveBook(); }, 20000);
    }
    this.drawTop();
    const el = wnwRoot().querySelector('#wnwDeskFoot');
    if(el) el.textContent = '本次 ' + hms(Math.floor((Date.now() - (this.openedAt || Date.now())) / 1000)) + (typing ? ' · 正在写' : '');
    for(const [, api] of this.live) if(api.onTick) { try{ api.onTick(); }catch(e){} }
  },
  refreshAll(){
    this.drawLeft(); this.drawMid(); this.drawRight();
  },
  /* 章节内容变了要通知大纲、统计、停靠面板一起刷新 */
  emit(k, a){ Bus.emit('desk:' + k, a); }
};

/* ---------- 设置：辅助功能开关 + 写作偏好 ---------- */
const Settings = {
  tabs:[['func','功能'],['look','外观'],['type','版式'],['hl','高亮'],['fs','字号字体'],['keys','快捷键'],['data','数据']],
  async open(tab){
    const bar = h('div', { class:'wnw-set-tabs' });
    const body = h('div', { class:'wnw-set-body' });
    const show = async id => {
      State.set('set-tab', id);
      for(const b of bar.children) b.classList.toggle('on', b.dataset.id === id);
      body.innerHTML = '';
      body.appendChild(await this[id]());
    };
    for(const [id, name] of this.tabs)
      bar.appendChild(h('button', { class:'wnw-tab', 'data-id':id, onclick:() => show(id) }, name));
    await show(tab || (await State.get('set-tab', 'func')) || 'func');
    /* 左边竖标签 + 定死 1080×680：和 FD 的设置一个样 */
    Overlay.open('设置', h('div', { class:'wnw-set' }, [bar, body]), null, { set:true });
  },
  /* ---------- 功能：辅助功能总开关 + 逐个开关 ---------- */
  async func(){
    const box = h('div', { class:'wnw-col' });
    const master = h('input', { type:'checkbox', checked:await State.get('auxOn', true) });
    master.addEventListener('change', async () => { State.set('auxOn', master.checked); toast(master.checked ? '辅助功能已启用' : '辅助功能已全部关闭'); });
    box.appendChild(h('label', { class:'wnw-switch' }, [master, h('span', {}, '启用辅助功能（总开关）')]));
    for(const [id, t] of Tools){
      if(t.core) continue;
      const cb = h('input', { type:'checkbox', checked:await State.get('tool-' + id, true) });
      cb.addEventListener('change', () => State.set('tool-' + id, cb.checked));
      box.appendChild(h('label', { class:'wnw-switch' }, [cb, h('span', {}, t.name), h('span', { class:'wnw-hint', style:'margin-left:6px' }, t.desc || '')]));
    }
    /* 这块空白给生成器：向导在这儿开，建出来的组件和其他功能一样能停靠。
       名单向主程序那一份登记处要（插件分离第 4 批 4.3 · #35）—— 为写不再读推演定制那一家的顶层名字；
       整块只在登记处挂着「开向导」那颗手时才摆：定制那一趟没加载，这一屏就没有这一块，不弹一句"缺失"。 */
    if(typeof GenReg !== 'undefined' && GenReg.有向导()){
      const 画这一版 = 容器 => {
        容器.innerHTML = '';
        容器.appendChild(h('button', { class:'wnw-btn mini w-txt', style:'justify-self:start;margin-top:10px',
          onclick:() => GenReg.开向导(''), html:icoMarkup('plus') + '用推演组件定制做一个插件' }));
        for(const R of GenReg.名单())
          容器.appendChild(h('div', { class:'wnw-ci', title:'改「' + R.name + '」的配方', onclick:() => GenReg.开向导(R.id) }, [
            h('span', { class:'nm' }, R.name), h('span', { style:'flex:1' }),
            h('span', { class:'wnw-hint' }, R.id),
            h('button', { class:'wnw-btn mini', onclick:ev => { ev.stopPropagation(); GenReg.开向导(R.id); } }, '改')]));
        /* 手动刷新缓存那颗钮（#35 点名的那一条）：吃登记者自己那颗「重扫」，报的是重报之后的张数 */
        容器.appendChild(h('button', { class:'wnw-btn mini', style:'justify-self:start;margin-top:6px',
          onclick:async () => { const 张 = await GenReg.刷新(); 画这一版(容器); toast('推演名单重报了一遍：现在 ' + 张 + ' 张'); } },
          '重新读一遍推演名单'));
      };
      const 那一格 = h('div', { style:'display:grid;gap:2px' });
      画这一版(那一格);
      box.appendChild(那一格);
    }
    return box;
  },
  /* ---------- 第 24 条：快捷键 ----------
     只列窗口里面用得上的键（窗口没焦点时一个都不响应），列的每一条都在代码里真接着；
     做不做冲突检测：不主动查 —— 查一遍得把三套页面的键位都收进来常驻比对，白占内存也白占时间，
     所以这儿按第 24 条拍板的口径留一句提醒。 */
  keys(){
    const box = h('div', { class:'wnw-col' });
    const row = (k, t) => h('div', { style:'display:flex;gap:10px;align-items:center' }, [
      h('span', { class:'wnw-chip', style:'flex:0 0 15em' }, k), h('span', {}, t)]);
    for(const [k, t] of [
      ['Ctrl / ⌘ + S', '保存当前这一层：浮层、对话框、面板里的「保存」按钮'],
      ['Ctrl / ⌘ + Z', '撤销（正文、富文本）'],
      ['Ctrl / ⌘ + Shift + Z', '重做（也可以用 Ctrl / ⌘ + Y）'],
      ['Enter', '正文里新起一段；各处输入框里收下'],
      ['Shift + Enter', '段落内换行'],
      ['Tab', '段首缩进两格'],
      ['Backspace', '光标在段首时并到上一段'],
      ['Alt + Enter', '快记一条灵感（在哪儿按都算）'],
      ['Ctrl / ⌘ + 单击', '打开正文里的链接'],
      ['Esc', '标签改名时撤回原名'],
      ['F11', '全屏'],
      ['Ctrl / ⌘ + = / - / 0', '整页放大 / 缩小 / 实际大小'],
      ['Ctrl / ⌘ + R', '重新载入页面（按住 Shift 是不读缓存的那种）'],
      ['Ctrl / ⌘ + Q', '退出']
    ]) box.appendChild(row(k, t));
    box.appendChild(h('div', { class:'wnw-hint' }, '全局快捷键：没有。窗口没焦点时程序不接任何键，原来那个 Ctrl+Alt+F 也已经拿掉了。'));
    box.appendChild(h('div', { class:'wnw-hint' }, '请注意避免快捷键冲突。'));
    return box;
  },
  /* 第 14 条那一套旧「提示语」档已经删掉：界面上的字改走 数据\ui-text.yaml 界面文字清单
     （一个地方一行，写了存盘立刻跟着变），那一行摆在下面「数据」这一档里。 */
  /* ---------- 版式：正文的格式定义都在这儿，一键排版照这一页重排整章 ---------- */
  async type(){ return typeForm(); },
  /* ---------- 外观：跟不跟 FD 主外观 + 自己池里的配色 + 两档圆角 ---------- */
  async look(){
    const box = h('div', { class:'wnw-col' });
    /* 从前只有被 FD 罩着开的时候才有"跟不跟"这回事，单独打开本文件不摆这一行；
       搬进 FD 那一张页之后没有「单独打开」这一种了，这一档永远成立 */
    const hosted = true;
    if(hosted){
      const fol = h('input', { type:'checkbox', checked:Theme.follows() });
      fol.addEventListener('change', () => {
        Theme.setFollow(fol.checked);
        fill(); toast(fol.checked ? '已跟随 Flow-Desk 主外观' : '改用为写自己挑的那一套方案');
      });
      box.appendChild(h('label', { class:'wnw-switch' }, [fol, h('span', {}, '跟随 Flow-Desk 主外观')]));
    }

    const sel = h('select', { class:'wnw-input' });
    const dots = h('span', { class:'wnw-dots' });
    const hint = h('div', { class:'wnw-hint' });
    const fill = () => {
      sel.innerHTML = '';
      /* 名单按当前那条明暗轴筛（外13-M）：另一池的不摆出来，也不灰着让人点不动。
         轴还没递到的时候不筛（这时候筛等于把名单清空，比摆两套更糟）。
         这份名单就是主程序那一份方案清单（插件分离第 4 批 4.4：一只口，两处点）。 */
      for(const e of Theme.poolNow()){
        const t = e.预览 || tokensOf(e).tokens;
        sel.appendChild(h('option', { value:e.id, selected:e.id === Theme.案() }, e.name));
        dots.innerHTML = ['bg', 'card', 'accent', 'text'].map(k =>
          '<i style="background:' + (t[k] || t['--' + k] || '#888') + '"></i>').join('');
      }
      sel.disabled = Theme.follows();
      rnd.disabled = Theme.follows();
      const a = Theme.axis(), all = Theme.poolNow().length;
      const an = (typeof MING_NAME !== 'undefined' && MING_NAME[a]) || (a === 'dark' ? '黑暗' : '明亮');
      hint.textContent = (a === 'light' || a === 'dark')
        ? '明暗这一轴跟着 Flow-Desk：现在这一轴是' + an + '，方案名单只摆本池那 ' + all
          + ' 套（另一池的不摆出来）。这份名单和 Flow-Desk 外观那一屏的是同一份。'
          + (Theme.follows() ? '现在吃的是宿主那套色，下面这份名单等你把跟随关掉才点得动。' : '')
        : 'Flow-Desk 还没把明暗那一轴递过来，这份名单先不筛。';
    };
    sel.addEventListener('change', () => { Theme.select(sel.value); fill(); });
    /* 随机换一套：也只在本池里抽（外13-M 那条「自动随机同一池」），和 Flow-Desk 那头同名一个 */
    const rnd = h('button', { class:'wnw-btn mini', title:'在当前这一轴的那一池里随机挑一套', onclick:() => {
      const list = Theme.poolNow().filter(e => e.id !== Theme.案());
      if(!list.length){ toast('本池里就这一套（或者一套也没有），没有可随机换的'); return; }
      Theme.select(list[Math.floor(Math.random() * list.length)].id); fill();
      toast('随机换到「' + ((Theme.cur() || {}).name || '') + '」（本池内抽的）');
    }}, '随机换一套');
    box.appendChild(h('label', { class:'wnw-field' }, [h('span', {}, '配色'),
      h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [sel, dots, rnd])]));
    box.appendChild(hint);

    /* 从前这里有一个「读 Rime 配色」：拿 Rime 用户目录里现成的 weasel yaml 灌进为写自己的池。
       件-9 整条撤下 Rime 配色，这个跟着撤了，Flow-Desk 那头对应的一行也一起没了。 */

    const radius = (key, label) => {
      const cur = Theme.radius();
      const val = key === 'card' ? cur.card : cur.ctl;
      const out = h('span', { class:'wnw-hint' }, val + 'px');
      const rng = h('input', { type:'range', min:'0', max:'30', step:'1', value:String(val), style:'width:170px' });
      rng.addEventListener('input', () => {
        Theme.cfg[key] = +rng.value; Theme.save(); Theme.apply();
        out.textContent = rng.value + 'px';
      });
      const back = h('button', { class:'wnw-btn mini', title:'取消自定，回到跟随 Flow-Desk 的基准', onclick:() => {
        Theme.cfg[key] = ''; Theme.save(); Theme.apply();
        const c = Theme.radius(); rng.value = String(key === 'card' ? c.card : c.ctl); out.textContent = rng.value + 'px';
      }}, '跟 Flow-Desk');
      if(Theme.cfg[key] !== '') back.disabled = true;
      return h('label', { class:'wnw-field' }, [h('span', {}, label), h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [rng, out, back])]);
    };
    box.appendChild(radius('card', '卡片圆角'));
    box.appendChild(radius('ctl', '控件圆角'));

    /* ---------- 段落聚焦：正文里点着的那一段整条的长相，五项各管一摊，留空就是跟配色走 ---------- */
    const fv = (lab, node) => h('label', { class:'wnw-field' }, [h('span', {}, lab), node]);
    const fcCol = (key, seed) => {
      const cur = String(FocusLook.st[key] || '');
      const pk = h('input', { type:'color', class:'wnw-hl-col', value:/^#[0-9a-f]{6}$/i.test(cur) ? cur : seed });
      const tx = h('input', { class:'wnw-input', value:cur, placeholder:'留空 = 跟配色' });
      tx.style.width = '130px';
      const clr = h('button', { class:'wnw-btn mini' }, '清除');
      pk.addEventListener('input', () => { tx.value = pk.value; FocusLook.set({ [key]:pk.value }); });
      tx.addEventListener('change', () => {
        const c = normColor(tx.value);
        FocusLook.set({ [key]:c || '' });
        if(c) pk.value = c; else tx.value = '';
      });
      clr.addEventListener('click', () => { tx.value = ''; FocusLook.set({ [key]:'' }); });
      return h('div', { class:'wnw-row', style:'gap:5px;align-items:center;flex-wrap:nowrap' }, [pk, tx, clr]);
    };
    const fcSlide = (key, mn, mx) => {
      const out = h('span', { class:'wnw-hint' }, FocusLook.st[key] + 'px');
      const rng = h('input', { type:'range', min:String(mn), max:String(mx), step:'1', value:String(FocusLook.st[key]), style:'width:170px' });
      rng.addEventListener('input', () => { out.textContent = rng.value + 'px'; FocusLook.set({ [key]:+rng.value }); });
      return h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [rng, out]);
    };
    box.appendChild(h('b', { style:'margin-top:4px' }, '段落聚焦'));
    box.appendChild(h('div', { class:'wnw-ce wnw-fc-pv', style:'margin:0' }, '她说《半山文集》里的地名要亮一下'));
    box.appendChild(fv('文字颜色', fcCol('text', '#333333')));
    box.appendChild(fv('底色填充', fcCol('bg', '#dbeafe')));
    box.appendChild(fv('边框颜色', fcCol('bd', '#8a8a8a')));
    box.appendChild(fv('边框粗细', fcSlide('bw', 0, 6)));
    box.appendChild(fv('圆角程度', fcSlide('r', 0, 24)));
    box.appendChild(h('div', { class:'wnw-row' }, [
      h('button', { class:'wnw-btn mini', onclick:async () => { await FocusLook.reset(); Settings.open('look'); toast('段落聚焦已回到默认'); } }, '恢复默认')
    ]));
    const draw = () => { fill(); };
    draw();
    /* 宿主换轴 / 换肤那一刻这一屏跟着重画一次：配色名单和那行说明都得跟着轴走（外13-M）。
       面板关掉之后这块已经不在文档里，那一趟顺手把这根监听退掉 —— 外观这一屏每开一回订一回，
       不退就攒下一堆翻空节点的废监听（Flow-Desk 那边外观那一屏用的是同一套路子）。 */
    const offLook = Bus.on('look', () => {
      if(!document.body.contains(hint)){ offLook(); return; }
      fill();
    });
    return box;
  },
  /* ---------- 高亮：总开关 + 每条规则各留一格；内置规则只能开关 / 换色 / 选范围，自定义规则整条是自己的 ---------- */
  async hl(){
    const box = h('div', { class:'wnw-col' });
    const hlOn = h('input', { type:'checkbox', checked:WriteCfg.开 });
    hlOn.addEventListener('change', async () => { WriteCfg.开 = hlOn.checked; await WriteCfg.save(); });
    box.appendChild(h('label', { class:'wnw-switch' }, [hlOn, h('span', {}, '按规则高亮（总开关）')]));
    const hlList = h('div', { class:'wnw-hl-list' });
    const drawHl = () => {
      hlList.innerHTML = '';
      for(const r of WriteCfg.rules){
        const item = h('div', { class:'wnw-hl-item' });
        const row = h('div', { class:'wnw-hl-row' });
        const cb = h('input', { type:'checkbox', checked:!!r.on });
        cb.addEventListener('change', async () => { r.on = cb.checked; await WriteCfg.save(); });
        row.appendChild(cb);
        /* 只有「书名号」「关键词表」两条是钉死的（名字都不给改），其余连出厂那几条一起可改可删 */
        const lock = isLockedRule(r.id);
        if(lock) row.appendChild(h('span', { class:'nm' }, r.name));
        else{
          const ni = h('input', { class:'wnw-input nm', value:r.name });
          ni.addEventListener('change', async () => { r.name = ni.value.trim() || '新规则'; await WriteCfg.save(); });
          row.appendChild(ni);
        }
        const sc = h('select', { class:'wnw-input' });
        for(const [k, n] of [['both','两者'],['write','写作'],['note','笔记']]) sc.appendChild(h('option', { value:k, selected:(r.scope || 'both') === k }, n));
        sc.addEventListener('change', async () => { r.scope = sc.value; await WriteCfg.save(); });
        row.appendChild(sc);
        /* 标记色一个一个圆点，点哪个用哪个（外13-N）：从前这里写死五个（配色那五个强调位），
           现在摊开的是用户在 设置·外观 里自己定的那一串，3~20 个都照实摆，颜色口径走 slotColor 那一条。 */
        const dots = h('div', { class:'wnw-slots' });
        const mvars = typeof markSlots === 'function' ? markSlots() : [1,2,3,4,5].map(i => slotColor(i));
        mvars.forEach((c, i) => dots.appendChild(h('button', {
          class:'wnw-slot' + (markIndexOf((r.slot || 1)) === i ? ' on' : ''),
          title:'第 ' + (i + 1) + ' 个标记色', role:'radio', 'aria-checked':markIndexOf(r.slot || 1) === i ? 'true' : 'false',
          style:'background:' + c,
          onclick:async () => { const k = i + 1; if(r.slot === k) return; r.slot = k; await WriteCfg.save(); drawHl(); } })));
        row.appendChild(dots);
        /* 长相应自己定：四个页签（通用 / 背景 / 边框 / 下划线），亮着 = 这条已经不走色位 */
        row.appendChild(h('button', { class:'wnw-btn mini' + (r.st ? ' on' : ''), title:'这条命中长什么样',
          onclick:() => hlStyleDlg(r, drawHl) }, '外观'));
        item.appendChild(row);
        if(!lock){
          let bad = false;
          try{ new RegExp(r.src || ''); }catch(e){ bad = true; }
          const re = h('input', { class:'wnw-input wnw-hl-re' + (bad ? ' bad' : ''), value:r.src || '', placeholder:'正则，例如 [0-9]{4} 年' });
          re.addEventListener('change', async () => { r.src = re.value; await WriteCfg.save(); drawHl(); });
          item.appendChild(re);
          row.appendChild(h('button', { class:'wnw-btn mini', onclick:async () => {
            if(!await wnwAsk('删掉这条高亮规则「' + (r.name || r.src || '') + '」？')) return;
            WriteCfg.delRule(r.id); await WriteCfg.save(); drawHl();
          }}, '删'));
        }
        if(r.id === 'keyword'){
          const ta = h('textarea', { class:'wnw-input wnw-hl-kw', placeholder:'一行一个词' });
          ta.value = WriteCfg.kw.join('\n');
          ta.addEventListener('change', async () => { WriteCfg.kw = ta.value.split('\n').map(x => x.trim()).filter(Boolean); await WriteCfg.save(); });
          item.appendChild(ta);
        }
        hlList.appendChild(item);
      }
    };
    drawHl();
    box.appendChild(hlList);
    box.appendChild(h('div', { class:'wnw-row' }, [h('button', { class:'wnw-btn mini w-txt', onclick:async () => {
      WriteCfg.addRule(); await WriteCfg.save(); drawHl();
    }, html:icoMarkup('plus') + '自定义规则' }),
      /* 能改式子了，就得有一处说清这台引擎认哪些写法（外25 第 11 条） */
      h('button', { class:'wnw-btn mini', title:'这一台认哪些正则写法、出厂那几条的式子长什么样',
        onclick:() => hlRegexHelp() }, '可用的正则写法')]));
    return box;
  },
  /* ---------- 字号：方案 + 四区各一档；改内置方案会自动复制一份自定的 ---------- */
  async fs(){
    const box = h('div', { class:'wnw-col' });
    const planSel = h('select', { class:'wnw-input' });
    const zoneSel = {};
    const fillPlans = () => {
      planSel.innerHTML = '';
      for(const p of Fs.plans) planSel.appendChild(h('option', { value:p.name, selected:p.name === Fs.now }, p.name + (BUILTIN.includes(p.name) ? '' : '（自定）')));
      for(const [k] of Fs.zones){
        const p = Fs.cur();
        zoneSel[k].innerHTML = '';
        for(const s of Fs.steps) zoneSel[k].appendChild(h('option', { value:s, selected:(p[k] || 14) === s }, s + 'px'));
      }
    };
    for(const [k, lab] of Fs.zones){
      zoneSel[k] = h('select', { class:'wnw-input' });
      zoneSel[k].addEventListener('change', async () => {
        const v = +zoneSel[k].value;
        const p = await Fs.edit(Fs.now, { [k]:v });
        toast(BUILTIN.includes(Fs.now) ? '内置方案不改，已另存为「' + p.name + '」' : '已改「' + p.name + '」' + lab);
        fillPlans();
      });
      box.appendChild(h('label', { class:'wnw-field' }, [h('span', {}, '字号 · ' + lab), zoneSel[k]]));
    }
    planSel.addEventListener('change', async () => { await Fs.pick(planSel.value); fillPlans(); });
    box.appendChild(h('label', { class:'wnw-field' }, [h('span', {}, '字号方案'), h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [
      planSel,
      h('button', { class:'wnw-btn mini', onclick:async () => {
        const nm = await Fs.add(Object.assign({}, Fs.cur()));
        await Fs.setGlobal(nm); fillPlans(); toast('已按当前设置新建「' + nm + '」');
      }}, '另存'),
      h('button', { class:'wnw-btn mini', onclick:async () => {
        if(BUILTIN.includes(Fs.now)){ toast('内置方案不能删'); return; }
        if(!await wnwAsk('删掉这个方案「' + Fs.now + '」？已经指定过它的书会跟着用不到这一份。')) return;
        await Fs.del(Fs.now); fillPlans(); toast('已删掉这个方案');
      }}, '删'),
      h('button', { class:'wnw-btn mini', onclick:async () => { await Fs.setGlobal(Fs.now); toast('已设为全局默认，书架和没单独指定方案的书都用它'); } }, '设为全局')
    ])]));
    fillPlans();
    /* ---------- 字体四档：和字号同构，自己钉过的算，没钉就吃 FD 播来的全局字体 ----------
       这里不能用 label 包住：label 会把点击转给框里第一个按钮，点标题文字就误开清单。 */
    for(const [k, lab] of Ff.zones)
      box.appendChild(h('div', { class:'wnw-field', style:'align-items:flex-start' }, [
        h('span', {}, '字体 · ' + lab),
        Fonts.field({ label:lab, value:Ff.cfg[k],
          dflt:k === 'code' ? '默认等宽' : '跟随 Flow-Desk（' + (Ff.fdFont() || '系统默认') + '）',
          onSet:v => { Ff.set(k, v); } })]));
    return box;
  },
  /* ---------- 数据：整库备份 ---------- */
  async data(){
    const box = h('div', { class:'wnw-col' });
    const sz = await DB.size();
    box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, '备份'), h('div', { class:'wnw-row' }, [
      h('button', { class:'wnw-btn mini', onclick:async () => {
        const txt = await Backup.dump();
        download(await Backup.fileName(), txt);
        toast('已导出 ' + sz.keys + ' 条记录（存储方式：' + sz.kind + '）');
      }, html:icoMarkup('exp') + '导出全部' }),
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('imp') + '从备份恢复', onclick:() => this.importDlg() }),
      h('span', { class:'wnw-hint' }, sz.keys + ' 条 · ' + (sz.bytes / 1024 | 0) + 'KB · ' + sz.kind)
    ])]));
    /* 第 23 条：和 FD 的设置·数据 一样给一个「用户数据详单」，开的是同一份明文清单 */
    box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, '详单'), h('div', { class:'wnw-row' }, [
      h('button', { class:'wnw-btn mini', onclick:() => { Overlay.close(); Desk.addTab('userdata'); } }, '用户数据详单')
    ])]));
    /* 界面文字那一行外46 十二撤走了：那份清单（data\ui-text.yaml）改由 GitHub 版本资源助手那一台管，
       读写与「写进页面」都在 src\_build\push-ui.mjs + push-ui.html 那一屏，程序里不再摆这一格。 */
    return box;
  },
  importDlg(){
    const box = h('div', { class:'wnw-col' });
    const ta = h('textarea', { class:'wnw-ta-big', style:'min-height:160px;flex:0 0 auto', placeholder:'把备份 JSON 整段粘进来，或者用下面的文件选' });
    box.appendChild(ta);
    const f = h('input', { type:'file', accept:'.json,application/json', onchange:async () => {
      const fl = f.files && f.files[0];
      if(fl) ta.value = await fl.text();
    } });
    box.appendChild(f);
    Overlay.open('从备份恢复', box, [h('button', { class:'wnw-btn primary', onclick:async () => {
      try{
        const n = await Backup.load(ta.value);
        toast('已恢复 ' + n + ' 条，刷新中');
        setTimeout(() => location.reload(), 500);
      }catch(e){ toast('读不进来：' + e.message); }
    }}, '恢复')]);
  }
};

/* ---------- 第 23 条：用户数据详单 ----------
   一份明文清单（数据层那份 userdata-list.md），点开这一页才现读，
   用 Notepad++ 改完保存、回来重开就是新的：不缓存、不内嵌、不用重新构建。
   读不进来就照实说在哪儿，不写第二份兜底内容。
   中间标签页、右栏停靠、还有「＋打开内容」开的是同一个视图。 */
const UserList = {
  async render(host){
    host.innerHTML = '';
    const box = h('div');
    host.appendChild(box);
    const file = WNW_DATA_PRE + 'userdata-list.md';
    let txt = null, err = '';
    try{
      const r = await fetch(file, { cache:'no-store' });
      if(r.ok) txt = await r.text(); else err = '服务器回了 ' + r.status;
    }catch(e){ err = String(e && e.message || e); }
    if(txt === null){
      box.appendChild(h('div', { class:'wnw-hint' }, '读不到 ' + file + '（' + err + '）。这一页是明文文件，改它就行。'));
      return;
    }
    DocMd.mount(box, txt);
  }
};
Views.reg('userdata', {
  name:'用户数据详单', icon:'log', dockable:true,
  title:() => '用户数据详单',
  render(host, ref, ctx){ UserList.render(host); }
});

/* ---------- 小菜单：右键菜单和工具栏下拉共用一个壳 ---------- */
const Menu = {
  node:null,
  open(x, y, items){
    this.close();
    const box = h('div', { class:'wnw-menu' }, items.filter(Boolean).map(it => it.sep
      ? h('i', { class:'wnw-menu-sp' })
      : h('button', { class:it.on ? 'on' : '', onclick:() => { this.close(); it.fn && it.fn(); } }, it.label)));
    this.node = h('div', { class:'wnw-menu-mask',
      onclick:ev => { if(ev.target === this.node) this.close(); },
      oncontextmenu:ev => { ev.preventDefault(); this.close(); } }, [box]);
    wnwRoot().appendChild(this.node);
    /* 递进来的是视口坐标（右键、控件下沿），摆在容器内得先换成容器自己的坐标，再拿容器的边当限 */
    const b = wnwBox(), at = wnwLocal(x, y);
    const r = box.getBoundingClientRect();
    box.style.left = Math.max(6, Math.min(b.w - r.width - 6, at.x)) + 'px';
    box.style.top = Math.max(6, Math.min(b.h - r.height - 6, at.y)) + 'px';
    return box;
  },
  /* 挂在某个控件下面（工具栏下拉） */
  under(el, items){ const b = el.getBoundingClientRect(); return this.open(b.left, b.bottom + 4, items); },
  close(){ if(this.node){ this.node.remove(); this.node = null; } }
};

/* ---------- 图17：填时间那一格旁边的提示框 ----------
   卡片上写的时间和看板上写的时间各存各的，谁都不替谁写、也不自动补。
   光标进到那一格（空着的、正在改的都算），就把对面那一处已经写下的时间原样列出来给你看：
   写在这个点以内还是以外不管，认不认得出也不在这儿说（那一句照旧由那一格自己报「认得出 / 认不出」）。
   列的是整本书的，不挑不筛，也不要求你先把卡片关联到节点上。
   这一框不吃鼠标（真页面上它就压在下一格「结束时间」上，吃掉鼠标那一格就点不到了）：
   名单长到装不下时要翻，滚轮在这一框的范围里就翻这一框 —— 鼠标事件由外层收，只看落点在不在框内。 */
const TimeHint = {
  node:null,
  摘:null,
  收(){ if(this.node){ this.node.remove(); this.node = null; } if(this.摘){ this.摘(); this.摘 = null; } },
  /* 条目 = [{谁, 话}]；一条都没有就什么都不摆 —— 没东西可念的时候不立一张空壳 */
  给(格, 标题, 条目){
    this.收();
    if(!格 || !格.isConnected || !条目 || !条目.length) return;
    const b = wnwBox();
    const 窗 = h('div', { class:'wnw-tip wnw-time-hint' }, [h('b', {}, 标题)]
      .concat(条目.map(x => h('div', { class:'r' }, [h('span', { class:'k' }, x.谁), h('span', {}, x.话)]))));
    /* 一整本书的时间能列很长：给它一个上限，超出靠滚轮翻 */
    窗.style.maxHeight = Math.max(80, b.h - 24) + 'px';
    wnwRoot().appendChild(窗);
    this.node = 窗;
    /* 滚轮由外层这颗接：落点在这一框的范围内就翻这一框，并且不许底下那层跟着滚 */
    const 轮 = ev => {
      const q = 窗.getBoundingClientRect();
      if(ev.clientX < q.left || ev.clientX > q.right || ev.clientY < q.top || ev.clientY > q.bottom) return;
      窗.scrollTop += ev.deltaY;
      ev.preventDefault();
    };
    wnwRoot().addEventListener('wheel', 轮, true);
    this.摘 = () => wnwRoot().removeEventListener('wheel', 轮, true);
    /* 摆在这一格下沿；下面装不下翻到上沿，最后再拿容器底当一道闸（和 CardTip 同一套坐标口径） */
    const r = 格.getBoundingClientRect(), at = wnwLocal(r.left, r.bottom);
    const 高 = 窗.offsetHeight, 宽 = 窗.offsetWidth;
    窗.style.left = Math.max(6, Math.min(b.w - 宽 - 6, at.x)) + 'px';
    窗.style.top = Math.max(6, Math.min(b.h - 高 - 6,
      at.y + 高 + 12 > b.h ? at.y - 高 * 2 - 8 : at.y + 8)) + 'px';
  },
  /* 一格挂两只耳子：光标进去就列、走开就收；正在打字不收 —— 那一份就是拿来对着写的 */
  挂(格, 标题, 取){
    let 问 = 0;
    格.addEventListener('focus', async () => {
      const 号 = ++问;
      const 条目 = await 取();
      if(号 !== 问 || !格.isConnected) return;
      this.给(格, 标题, 条目);
    });
    /* 走开那一下把序号推一格：晚到的结果就不许再往已经空出来的位置上摆 */
    格.addEventListener('blur', () => { 问++; this.收(); });
  }
};

/* ---------- 浮层 ---------- */
const Overlay = {
  node:null,
  /* 浮层里再开浮层（导出、删除确认、改词库）：底下那层先藏起来，关掉上面这层就还原回去。
     opt.replace 是「重开同一张列表」，旧那份直接扔掉，免得还回一张过期的。 */
  below:[],
  /* 同一张屏上点按钮弹出的那些窗口，尺寸不许来回变（外25 第 10 条）：
     按 fix 那个名字记着这一档见过最大的一号，往后每一张至少撑到那一号 —— 高亮外观换页签、
     词格那几张框长短不一，都不该把窗口跟着内容一起抽风。 */
  sizes:{},
  open(title, body, foot, opt){
    if(this.node){
      if(opt && opt.replace){ this.node.remove(); this.below.forEach(n => n.remove()); this.below.length = 0; }
      /* redraw：还是这一张面板，只是内容整个重画（推演组件定制改一下参数就整块重建）。
         旧的直接扔掉，不藏进 below —— 不然改几回就要按几回关闭，每按一回还退回一张旧草稿。 */
      else if(opt && opt.redraw) this.node.remove();
      else { this.node.style.display = 'none'; this.below.push(this.node); }
    }
    const panel = h('div', { class:'wnw-panel' + (opt && opt.wide ? ' wide' : '') + (opt && opt.vwide ? ' vwide' : '') +
      /* set：定死 1080×680 的那一档，只有设置用 */
      (opt && opt.set ? ' set' : '') +
      /* hist：访问历史 / 收藏那一档，窄一档，不许摊到所在那一块的边上 */
      (opt && opt.hist ? ' hist' : '') }, [
      h('div', { class:'wnw-panel-head' }, [h('b', {}, title), h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('close') + '关闭', onclick:() => this.close() })]),
      /* 设置那一档（set）：滚只许滚右栏 —— 外层一滚，左边那列竖标签就跟着往上溜 */
      h('div', { class:'wnw-panel-body', style:'overflow:' + (opt && opt.set ? 'hidden' : 'auto') }, body),
      foot ? h('div', { class:'wnw-panel-foot' }, foot) : null].filter(Boolean));
    /* 和 Flow-Desk 那边同一口径：遮罩上点一下不关窗。
       在浮层里的输入框拖选文字，手一抖出了面板，浏览器会把 click 发给
       按下点和抬起点的共同上级（就是这层遮罩），浮层会莫名其妙自己退掉。
       出口只留面板右上角的「关闭」和页脚的「取消」「保存」。 */
    this.node = h('div', { class:'wnw-overlay' }, [panel]);
    wnwRoot().appendChild(this.node);
    if(opt && opt.fix){
      const k = String(opt.fix), b = wnwBox();
      const r = panel.getBoundingClientRect();
      const prev = this.sizes[k] || { w:0, h:0 };
      const w = Math.round(Math.min(Math.max(prev.w, r.width), b.w * 0.92));
      const h = Math.round(Math.min(Math.max(prev.h, r.height), b.h * 0.88));
      this.sizes[k] = { w, h };
      panel.style.minWidth = w + 'px'; panel.style.minHeight = h + 'px';
    }
  },
  close(){
    /* 图17：浮层一关，挂在某一格下面的提醒跟着收 —— 那一格多半已经不在了 */
    TimeHint.收();
    if(this.node) this.node.remove();
    const p = this.below.pop();
    if(p){ p.style.display = ''; this.node = p; return; }
    this.node = null;
  }
};
/* 问一句「要不要」的那种小框：从前这里用的是浏览器原生的 confirm()，
   搬进宿主之后那一发会把整张页冻住、还带着浏览器自己的标题，跟这一页的皮也对不上。
   换成自己的浮层，接口换成等回来的那种（原生的那种是同步的，这一种只有真按了钮才往下走）。 */
function wnwAsk(q, yes){
  return new Promise(res => {
    const done = v => { Overlay.close(); res(v); };
    Overlay.open('请确认', h('div', { class:'wnw-col' }, [h('div', { style:'line-height:1.8' }, q)]), [
      h('button', { class:'wnw-btn primary', onclick:() => done(true) }, yes || '删除'),
      h('button', { class:'wnw-btn', onclick:() => done(false) }, '取消')
    ], { wide:false });
  });
}
/* 拖标签时记住来源；HTML5 拖放的 dataTransfer 读不到内容，只能靠这个 */
const Drag = { tab:null, clear(){ this.tab = null; const r = wnwRoot(); if(r) r.querySelectorAll('.wnw-pane.dropping').forEach(n => n.classList.remove('dropping')); } };

/* 皮肤贴在容器里，不再贴文档头上：这一套代码现在和宿主共用一张页，
   往 head 上贴等于往整张页上贴。同一块皮肤贴过一次就不再贴（start→stop→start 会来回好几趟）。
   装配期各段自带的那些样式块先攒进 WNW_CSS：那时候容器还没有，攒着等就位再落。 */
/* 样式一律落在容器里，不再进 <head>：这一段皮肤认的是 .wnw-root 那一层，挂到页头上
   就等于替整张页定控件长相，宿主自己的按钮输入框会跟着变。
   同一段在一个容器里只落一次（靠内容认，不另记账）：stop 把容器清空之后节点已经没了，
   再 start 一趟会重新落一遍，正好该有。 */
function addCss(css){
  if(!WNW_HOST){ WNW_CSS.push(css); return; }
  for(const s of WNW_HOST.querySelectorAll(':scope > style.wnw-skin')) if(s.textContent === css) return;
  WNW_HOST.insertBefore(h('style', { class:'wnw-skin', html:css }), WNW_HOST.firstChild);
}

/* 骨架那一整套（顶栏 / 三栏 / 提示条）由 start 现搭：从前这些节点写在装配模板的 body 里，
   现在这一页不再属于为写自己，谁递容器进来就给谁搭一副。id 留着不改 —— 底下的代码和皮肤都认这几个名字。 */
function buildSkeleton(host){
  host.classList.add('wnw-root');
  host.appendChild(h('header', { id:'wnwTop' }, [
    h('div', { class:'brand' }, [ 'Why Not Write', h('small', {}, 'WNW') ]),
    h('nav', { id:'wnwNav' }),
    h('span', { style:'flex:1' }),
    h('span', { id:'wnwTopRight' })]));
  host.appendChild(h('main', { id:'wnwBody' }, [h('section', { id:'wnwTool' })]));
  host.appendChild(h('div', { id:'wnwToast' }));
}

let cssOn = false;
/* 皮肤的真身在 w0-skin.js：那份是从装配模板的 <style> 和这里原来那一大段并出来、
   再把页面级和裸标签选择器收进 .wnw-root 一层的。图标那套样式跟着 _shared/sh-ico.js 自己走，这边不管。 */
function injectCss(){
  if(cssOn) return; cssOn = true;
  addCss(WNW_ROOT_CSS);
}
