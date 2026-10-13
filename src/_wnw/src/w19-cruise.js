/* ---------- 词巡航（外25 第 9 条）：整卷词格的闪卡 ----------
   开的是卷级那一档：只有「这一卷的章全是词格模式」的卷才摆这个入口。
   外26 追加一档「书巡航」：入口在章节那一列的 ⋮ 菜单和「＋打开内容」，吃整本书每一卷的词格章，
   闸放宽成「有一章是词格就够」（正文章和词格章混在同一本书里是常态，要求全书都是词格就等于没这一条）。
   一个词格 = 一章 = 明文 lyrics\ 里那个文件；卡片的最小单位两档（外27 图8）：整行 = 一行里的格全排在一张卡上，
   单格 = 一张卡就一个格子、一个一个过。
   出现范围三档：整卷（书巡航那档写「整本」）/ 某一章 / 本章某一行；走法三档：顺序 / 逆序 / 随机。
   卡片上三层各自可设显不显：原文、注音、注释（注释 = 段前说明 + 翻译，条数可设 1 条 / 2 条 / 全部）。
   出现时间自己定：填 0 = 不倒计时、手动翻；填几秒 = 整张卡一条从满退到空的进度线（卡拉ok 那层同一画法、方向反过来），退完自己翻下一张。
   用法三种：默背（点一下把藏着的显出来，再点收回）· 提示（点一下只亮一小会儿就收回）· 填写（藏着的东西要手输，按格对原文判对错）。
   填写那一档打进去的字哪儿都不落 —— 不进词格、不进章、不进那个明文文件，翻过这张卡就没。
   这一档一概只读：整趟巡航对章节数据一个字节都不写。 */
const CRUISE_MODES = [['hide', '默背'], ['hint', '提示'], ['type', '填写']];
const CRUISE_ORDERS = [['fwd', '顺序'], ['rev', '逆序'], ['rand', '随机']];
const CRUISE_SCOPES = [['all', '整卷'], ['ch', '章内'], ['row', '行内']];
const CRUISE_NOTES = [['1', '1 条'], ['2', '2 条'], ['all', '全部']];
/* 注音那一层只有一种摆法：跟每一格对齐。从前另有一档「整行一条」，一长串罗马字摊在整行中间，
   和原文对不上谁是谁（外27 图11：删掉，那一整行注音没有意义）。删档而不是留默认值 —— 对齐是
   用 alignCells 逐格量宽度做出来的，另一档根本不量，留着就还是一条会错位的通路。 */
const CRUISE_UNIT = [['line', '整行'], ['cell', '单格']];
const HINT_MS = 900;                 /* 提示那一档：亮这么久就收回 */
const CRUISE_SET = { scope:'all', ch:'', row:0, order:'fwd', secs:0, mode:'hide', unit:'line',
  show:{ wrd:true, rom:false, nte:false }, nteN:'1' };
/* 书巡航（外26 追加）走的是同一张类，只是开的时候把 ref 递成这一枚哨兵：
   队列不再锁在一卷里，而是把整本书每一卷的词格章全收进来。
   为什么不另立一个类：范围、次序、显隐、倒计时、三种用法、卡片那三层，两档一模一样，
   差的只有「读哪几章」和顶栏上那两个字。 */
const CRUISE_BOOK = '@book';

/* 一行里所有格（逗是行内的分段，卡片上不分段，连着排） */
function cruiseCells(L){
  const out = [];
  for(const cl of ((L && L.clauses) || [])) for(const c of (cl.cells || [])) out.push(c);
  return out;
}
/* 注释那一层：段前说明打头，跟着翻译的每一行（翻译从外25 第 7 条起能写好几行） */
function cruiseNotes(L){
  const out = [];
  if(L && L.note) out.push(String(L.note));
  for(const t of String((L && L.trans) || '').split(/\r?\n/)) if(t.trim()) out.push(t.trim());
  return out;
}
function cruiseLineMs(L){
  let s = 0;
  for(const c of cruiseCells(L)) if(LyricFmt.okMs(c.ms)) s += c.ms;
  return s;
}
/* 这一卷够不够格开词巡航：有章、而且章全是词格。
   「是不是词格」全站只 metaHasLyr 一个判法（目录上那个 ly 优先，老章没 ly 才退回信 mode）——
   从前这儿是「ly 或 mode 任一命中就算」，于是一本 mode 写着 lyric、ly 却是 0 的空章会把这道闸蒙混过去，
   巡航开着却是空白一张，而目录那一列同时说它不是词格。 */
function cruiseReady(vid){
  const chs = Work.orderedChs().filter(c => c.vid === vid);
  return chs.length > 0 && chs.every(c => metaHasLyr(c));
}
/* 「＋打开内容」那一条要的是一个能开的卷：正在看的这一章所属的卷够格就用它，否则找卷里第一个够格的；
   一个都不够格就交回空串，入口那一头干脆不摆这一条。 */
function cruiseAnyVol(){
  const b = Work.book;
  if(!b) return '';
  const m = Work.chMeta(Work.cur);
  if(m && m.vid && cruiseReady(m.vid)) return m.vid;
  if(cruiseReady('')) return '';
  for(const v of (b.vols || [])) if(cruiseReady(v.id)) return v.id;
  return '';
}
/* 整本书够不够格开书巡航：有一章是词格就够，不必全书都是。
   卷巡航那道「整卷都是词格」的闸在这儿不能照抄 —— 词格章本来就常和正文章混在同一本书里，
   要求全书都是词格，这一条等于永远摆不出来。读的那一头本来就一章一章跳过不是词格的章。 */
function cruiseBookReady(){
  return Work.orderedChs().some(c => metaHasLyr(c));
}

class LyricCruise{
  constructor(host, view){
    this.host = host; this.view = view;
    this.vid = String((view && view.ref) || '');
    /* 书巡航那一档：ref 递进来的是哨兵，锁卷的那道闸整个绕开 */
    this.bookMode = this.vid === CRUISE_BOOK;
    this.set = JSON.parse(JSON.stringify(CRUISE_SET));
    this.list = []; this.q = []; this.i = 0;
    this.open = {};         /* 这一张卡上被点开过的层（翻卡就清） */
    this.typed = [];        /* 填写那一档打进去的字：只在内存里，绝不落盘 */
    this.inputs = [];
    this.timer = null; this.hintTimer = null;
  }
  async boot(){
    await this.loadSet();
    this.pane = h('div', { class:'wnw-cruise' });
    this.host.appendChild(this.pane);
    this.buildBar();
    this.cardBox = h('div', { class:'wnw-czcard-wrap' });
    this.pane.appendChild(this.cardBox);
    const foot = h('div', { class:'wnw-czfoot' });
    foot.appendChild(h('button', { class:'wnw-btn mini', title:'上一张：左箭头 / 上箭头 / 往上滚鼠标滚轮（后两样只在「手动翻」那一档管用）', onclick:() => this.go(-1) }, '上一张'));
    foot.appendChild(h('button', { class:'wnw-btn mini', title:'下一张：空格 / 右箭头 / 下箭头 / 往下滚鼠标滚轮（后两样只在「手动翻」那一档管用）', onclick:() => this.go(1) }, '下一张'));
    this.footMsg = h('span', { class:'wnw-czhint' });
    foot.appendChild(this.footMsg);
    this.pane.appendChild(foot);
    await this.read();
    this.build();
    this.draw();
    this.pane.tabIndex = 0;
    this.pane.addEventListener('keydown', e => this.hotKey(e));
    this.pane.addEventListener('wheel', e => this.wheel(e), { passive:false });
    this.pane.focus({ preventScroll:true });
    if(this.view.dispose) this.view.dispose(() => this.stop());
  }
  async loadSet(){
    const s = await State.get('cruise.set', null);
    if(s && typeof s === 'object'){
      this.set.scope = CRUISE_SCOPES.some(x => x[0] === s.scope) ? s.scope : 'all';
      this.set.ch = String(s.ch || ''); this.set.row = Number(s.row) || 0;
      this.set.order = CRUISE_ORDERS.some(x => x[0] === s.order) ? s.order : 'fwd';
      this.set.secs = Math.max(0, Math.min(600, Number(s.secs) || 0));
      this.set.mode = CRUISE_MODES.some(x => x[0] === s.mode) ? s.mode : 'hide';
      this.set.nteN = CRUISE_NOTES.some(x => x[0] === s.nteN) ? s.nteN : '1';
      this.set.unit = CRUISE_UNIT.some(x => x[0] === s.unit) ? s.unit : 'line';
      if(s.show) for(const k of ['wrd', 'rom', 'nte']) if(typeof s.show[k] === 'boolean') this.set.show[k] = s.show[k];
    }
  }
  saveSet(){ State.set('cruise.set', JSON.parse(JSON.stringify(this.set))); }
  /* ---------- 读：词格章。卷巡航只读锁住的那一卷，书巡航把整本书每一卷都过一遍。
     先认 lyrics\ 里那个文件（真源），读不到才吃章里存着的那份缓存 ---------- */
  async read(){
    const b = Work.book;
    this.list = [];
    if(!b) return;
    if(!this.bookMode && (!this.vid || !Work.vol(this.vid))) this.vid = ((b.vols || [])[0] || { id:'' }).id;
    const vols = b.vols || [];
    /* 卷名只在书巡航、而且这本书真分了卷时才往卡片头上写；不分卷的书 vid 是空串，写出来是个光杆「· 」 */
    const volT = this.bookMode && vols.length ? (id => (vols.find(v => v.id === id) || {}).title || '') : (() => '');
    for(const m of Work.orderedChs().filter(c => this.bookMode || c.vid === this.vid)){
      if(!metaHasLyr(m)) continue;
      const c = await Work.ch(m.id);
      if(!c) continue;
      let doc = c.lyric;
      if(c.lyricFile){
        try{ const got = await Lyric.load(c.lyricFile); if(got && got.doc && (got.doc.lines || []).length) doc = got.doc; }
        catch(e){ }
      }
      if(!doc || !(doc.lines || []).length) continue;
      this.list.push({ id:m.id, title:c.title || m.title, volT:volT(m.vid), doc });
    }
  }
  /* ---------- 队列：范围挑进行，走法排次序 ---------- */
  build(){
    const s = this.set, q = [];
    if(s.scope !== 'all' && !this.list.some(d => d.id === s.ch)) s.ch = (this.list[0] || { id:'' }).id;
    for(const d of this.list){
      if(s.scope !== 'all' && d.id !== s.ch) continue;
      d.doc.lines.forEach((L, i) => {
        if(s.scope === 'row' && i !== s.row) return;
        const base = { chId:d.id, ch:d.title, volT:d.volT || '', i, L };
        /* 单格那一档（外27 图8）：一张卡就摆一个格子，一个一个过 —— 从前只有整行，
           他要的「单个歌词格子的巡航」压根没入口。空格不进队列：拆过的格子里本来就有占位的空档，
           摆在卡上是一张什么都没有的白卡，翻它没有意义。 */
        if(s.unit === 'cell'){
          cruiseCells(L).forEach((c, k) => {
            if(!String(c.t || '').trim() && !String(c.n || '').trim()) return;
            q.push(Object.assign({}, base, { k, c }));
          });
          return;
        }
        q.push(base);
      });
    }
    if(s.order === 'rev') q.reverse();
    if(s.order === 'rand'){
      for(let i = q.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = q[i]; q[i] = q[j]; q[j] = t; }
    }
    this.q = q;
    if(this.i > q.length - 1) this.i = Math.max(0, q.length - 1);
  }
  cur(){ return this.q[this.i] || null; }
  of(){ return this.list.find(d => d.id === this.set.ch) || null; }
  go(n){
    if(!this.q.length) return;
    const j = this.i + n;
    if(j < 0 || j >= this.q.length) return;
    /* 翻卡就把手里点开的那几层和打进去的字一起放下 —— 下一张从头背 */
    this.i = j; this.open = {}; this.typed = []; this.inputs = []; this.draw();
  }
  stop(){
    if(this.timer){ clearTimeout(this.timer); this.timer = null; }
    if(this.hintTimer){ clearTimeout(this.hintTimer); this.hintTimer = null; }
  }
  /* ---------- 顶栏：设置全摆在一排上，改一项就重摆这一排（按钮上的字跟着设置变） ---------- */
  buildBar(){
    const old = this.pane.querySelector('.wnw-czbar');
    const bar = h('div', { class:'wnw-czbar' });
    const btn = (txt, tip, fn) => bar.appendChild(h('button', { class:'wnw-btn mini', title:tip,
      onclick:ev => fn(ev.currentTarget) }, txt));
    /* 范围那一档的字跟着这一屏走：卷巡航说「整卷」，书巡航说「整本」，章内 / 行内两档不动。
       闸也在这儿多嘴一句：卷巡航那两档是从这一卷的词格里挑，书巡航是从整本书的词格里挑。 */
    const scName = k => k === 'all' ? (this.bookMode ? '整本' : '整卷') : k === 'ch' ? '章内' : '行内';
    const scLong = k => k === 'all' ? (this.bookMode ? '整本（这本书所有词格的行）' : '整卷（这一卷所有词格的行）')
      : k === 'ch' ? (this.bookMode ? '书里某一章（这一章所有行）' : '本卷某一章（这一章所有行）')
        : '本章某一行（就这一行反复背）';
    btn('范围：' + scName(this.set.scope),
      '卡片队列里放哪些行：' + scLong('all') + ' / ' + scLong('ch') + ' / ' + scLong('row'), ev => Menu.under(ev.currentTarget,
        CRUISE_SCOPES.map(x => ({ label:scLong(x[0]), on:this.set.scope === x[0], fn:() => this.pick('scope', x[0]) }))));
    if(this.set.scope !== 'all'){
      const d = this.of();
      btn('章：' + (d ? d.title : '没挑'), this.bookMode ? '挑这本书里的哪一个词格（分卷的书写着卷名）' : '挑这一卷里的哪一个词格', ev => Menu.under(ev.currentTarget,
        this.list.length ? this.list.map(x => ({ label:(x.volT ? x.volT + ' · ' : '') + x.title, on:this.set.ch === x.id,
          fn:() => { this.set.ch = x.id; this.set.row = 0; this.pick('scope', this.set.scope); } }))
          : [{ label:this.bookMode ? '这本书里没有词格的章' : '这一卷里没有词格的章', fn:() => {} }]));
    }
    if(this.set.scope === 'row'){
      const d = this.of();
      btn('行：' + (d ? '第 ' + (this.set.row + 1) + ' 行' : '没挑'), '挑这一章里的哪一行', ev => Menu.under(ev.currentTarget,
        ((d && d.doc.lines) || []).map((L, i) => ({ label:'第 ' + (i + 1) + ' 行 · ' +
          (cruiseCells(L).map(c => c.t || '').join('') || '（空行）').slice(0, 16),
          on:this.set.row === i, fn:() => { this.set.row = i; this.pick('scope', 'row'); } }))));
    }
    btn('次序：' + CRUISE_ORDERS.find(x => x[0] === this.set.order)[1], '这些行按什么次序出：照文件里那样 / 倒过来 / 每次打乱',
      ev => Menu.under(ev.currentTarget, CRUISE_ORDERS.map(x => ({ label:x[1], on:this.set.order === x[0],
        fn:() => this.pick('order', x[0]) }))));
    /* 卡片摆整行还是摆一个格子（外27 图8）：这一档直接改队列的条数，所以放在次序后面、显隐前面 */
    btn('卡片：' + CRUISE_UNIT.find(x => x[0] === this.set.unit)[1],
      '一张卡摆多少：整行 = 一行里的格全排在一张卡上 · 单格 = 一张卡就一个格子，一个一个过',
      ev => Menu.under(ev.currentTarget,
        CRUISE_UNIT.map(x => ({ label:x[0] === 'line' ? '整行（一张卡摆这一行的所有格）' : '单格（一张卡只摆一个格子）',
          on:this.set.unit === x[0], fn:() => this.pick('unit', x[0]) }))));
    btn('显隐', '卡片上摆不摆原文、注音、注释；注释摆几条', ev => this.showMenu(ev));
    btn(this.set.secs ? '一张停 ' + this.set.secs + ' 秒' : '手动翻',
      this.set.secs ? '一张卡停多久：0 是手动翻；填几秒就有一条从满退到空的线，退完自己翻下一张'
        : /* 手动那一档告诉他手上有哪些键能翻（外26 第 4 条） */
          '现在是自己翻：空格 / 右箭头 / 下箭头 / 往下滚鼠标滚轮 = 下一张，左箭头 / 上箭头 / 往上滚 = 上一张',
      ev => this.secsDlg(ev.currentTarget));
    btn('用法：' + CRUISE_MODES.find(x => x[0] === this.set.mode)[1],
      '默背 = 点一下显出来自己看 · 提示 = 点一下只亮一小会儿 · 填写 = 藏着的要手输',
      ev => Menu.under(ev.currentTarget, CRUISE_MODES.map(x => ({ label:x[1], on:this.set.mode === x[0],
        fn:() => this.pick('mode', x[0]) }))));
    bar.appendChild(h('span', { style:'flex:1' }));
    this.countEl = h('span', { class:'wnw-cznum', title:(this.bookMode ? '这本书' : '这一卷') + '里是词格的章 / 队列里的卡片 / 走到第几张' }, '');
    bar.appendChild(this.countEl);
    if(old) this.pane.replaceChild(bar, old); else this.pane.insertBefore(bar, this.pane.firstChild);
  }
  pick(k, v){
    this.set[k] = v;
    this.open = {}; this.typed = []; this.inputs = [];
    this.saveSet(); this.build(); this.buildBar(); this.draw();
  }
  showMenu(el){
    const s = this.set.show;
    Menu.under(el, [
      { label:'显示原文', on:s.wrd, fn:() => this.show('wrd') },
      { label:'显示注音', on:s.rom, fn:() => this.show('rom') },
      { label:'显示注释与翻译', on:s.nte, fn:() => this.show('nte') },
      { sep:true }
    ].concat(CRUISE_NOTES.map(x => ({ label:'注释摆 ' + x[1], on:this.set.nteN === x[0], fn:() => this.pick('nteN', x[0]) }))));
  }
  show(k){ this.set.show[k] = !this.set.show[k]; this.saveSet(); this.draw(); }
  secsDlg(el){
    const inp = h('input', { class:'wnw-rename', type:'number', min:'0', max:'600', step:'1',
      value:String(this.set.secs), style:'width:6em' });
    const ok = h('button', { class:'wnw-btn mini', onclick:() => { Overlay.close();
      this.pick('secs', Math.max(0, Math.min(600, Number(inp.value) || 0))); } }, '定了');
    const box = h('div', { class:'wnw-row' }, [inp, h('span', {}, '秒一张卡（0 = 不倒计时，自己翻）'), ok]);
    Overlay.open('出现时间', box);
    inp.focus(); inp.select();
    inp.addEventListener('keydown', e => { if(e.key === 'Enter') ok.click(); });
  }
  /* ---------- 一张卡 ---------- */
  draw(){
    this.stop();
    const it = this.cur(), s = this.set;
    if(this.countEl) this.countEl.textContent = this.list.length + ' 个词格 · 队列 ' + this.q.length +
      (this.set.unit === 'cell' ? ' 格' : ' 行') + ' · 第 ' + (this.q.length ? this.i + 1 : 0) + ' 张';
    this.cardBox.innerHTML = '';
    this.footMsg.textContent = '';
    if(!it){
      this.cardBox.appendChild(h('div', { class:'wnw-cznone' }, this.list.length
        ? ((this.bookMode ? '这本书里没有' : '这一卷没有') + (this.set.unit === 'cell' ? '格子可巡航（整行都拆成空格了）' : '这一行可巡航'))
        : (this.bookMode
          ? '这本书里没有词格模式的章。书巡航吃整本书：哪一卷、哪一章是词格模式就收哪一章的行 —— 先把哪几个章切成词格模式。'
          : '这一卷里没有词格模式的章。词巡航只吃「整卷的章都是词格」那种卷 —— 先把这一卷的章切成词格模式。')));
      return;
    }
    const L = it.L, cs = this.cells(it);
    const card = h('div', { class:'wnw-czcard' });
    /* 单格那一档：时长只算这一格，整行那几秒摆在卡上没有意义 */
    const ms = it.c ? (LyricFmt.okMs(it.c.ms) ? it.c.ms : 0) : cruiseLineMs(L);
    card.appendChild(h('div', { class:'wnw-czhead' }, [
      /* 书巡航跨卷，光一个章名认不出这是哪一卷的（同名章真会撞）；卷巡航那一档 volT 一直是空串，头上不多东西 */
      h('span', { class:'ch' }, (it.volT ? it.volT + ' · ' : '') + it.ch),
      h('span', { class:'rw' }, '第 ' + (it.i + 1) + ' 行' + (it.c ? ' · 第 ' + (it.k + 1) + ' 格' : '') +
        (L.seg ? ' · ' + L.seg : '') +
        ((L.who || []).length ? ' · ' + L.who.join('、') + (L.how && L.how !== 'solo' ? '（' + LYRIC_HOW[L.how] + '）' : '') : '')),
      h('span', { class:'ms' }, ms ? (ms / 1000).toFixed(2) + ' 秒' : '')
    ]));
    const time = h('div', { class:'wnw-cztime' });
    card.appendChild(time);
    /* 注音层 */
    let 音包 = null, 词包 = null;
    if(cs.some(c => String(c.n || '').trim())){
      const 显注音 = () => h('div', { class:'wnw-czrom' }, cs.map(c => h('span', { class:'c' }, String(c.n || '').trim() || '·')));
      const 藏注音 = () => h('div', { class:'wnw-czhide' }, cs.map(() => h('span', { class:'c' })));
      音包 = s.show.rom || this.open.rom ? this.layer('rom', 显注音()) : this.slot('rom', '注音', 藏注音, 显注音);
      card.appendChild(音包);
    }
    /* 原文层：显 = 一格一字；藏 = 同样数目的空框；填写那一档 = 空框里能打字 */
    if(s.show.wrd || this.open.wrd) 词包 = this.layer('wrd', this.wordShow(cs));
    else if(s.mode === 'type') 词包 = this.wordType(cs);
    else 词包 = this.slot('wrd', '原文', () => h('div', { class:'wnw-czhide' }, cs.map(() => h('span', { class:'c' }))),
      () => this.wordShow(cs));
    card.appendChild(词包);
    /* 注释层 */
    const notes = cruiseNotes(L);
    if(notes.length){
      const n = s.nteN === 'all' ? notes.length : Math.min(Number(s.nteN), notes.length);
      const shown = () => h('div', { class:'wnw-cznote' }, notes.slice(0, n).map(t => h('div', {}, t)));
      card.appendChild(s.show.nte || this.open.nte ? this.layer('nte', shown())
        : this.slot('nte', '注释', () => h('div', { class:'wnw-cznote' }, new Array(n).fill(0).map(() => h('div', { class:'bar' }))), shown));
    }
    this.cardBox.appendChild(card);
    this.alignCells(音包, 词包, cs);
    /* 倒计时：一条线性过渡走完就是那几秒，不给它装每帧的表 */
    if(s.secs > 0){
      const dur = s.secs * 1000;
      time.style.transform = 'scaleX(1)'; void time.offsetWidth;
      time.style.transition = 'transform ' + dur + 'ms linear';
      time.style.transform = 'scaleX(0)';
      this.timer = setTimeout(() => { this.timer = null; this.go(1); if(this.atEnd()) this.footMsg.textContent = '走到最后一张了'; }, dur);
    }
    this.pane.focus({ preventScroll:true });
  }
  atEnd(){ return this.q.length > 0 && this.i >= this.q.length - 1; }
  /* 这一张卡上要摆的格：整行那一档是这一行全部，单格那一档只有挑中那一格 —— 判分、量宽度都跟着这一条走 */
  cells(it){ return it && it.c ? [it.c] : cruiseCells((it || {}).L || {}); }
  wordShow(cs){ return h('div', { class:'wnw-czword' }, cs.map(c => h('span', { class:'c' }, String(c.t || '') || '·'))); }
  /* 注音对原文逐格对齐（外26 第 5 条、外27 图10）：两排各自 flex + 居中，格数一样，所以把同一格号的两枚
     宽度对齐到同一串数上就正对着了 —— 一长串罗马字注在一个字头上，从前会把注音那一排整体顶歪、换行点也不一样。
     两排的列间距必须同一个数（CSS 里 czword / czrom / czhide 三处锁死）：宽度对齐了、缝不一样宽，
     居中之后每格的位置还是错开，一一对应就又没了。
     先整排量完再一起写：一边量一边写会让另一排中途改换行，量到的就不是最终那一版。 */
  alignCells(音包, 词包, cs){
    if(!音包 || !词包 || !cs.length) return;
    const 找 = (包, cls) => (包.classList && 包.classList.contains(cls) ? 包 : 包.querySelector('.' + cls));
    const 音 = 找(音包, 'wnw-czrom') || 找(音包, 'wnw-czhide');
    const 词 = 找(词包, 'wnw-czword') || 找(词包, 'wnw-czhide');
    if(!音 || !词) return;
    const A = Array.from(音.children), B = Array.from(词.children);
    if(A.length !== cs.length || B.length !== cs.length) return;
    const 宽 = A.map((x, i) => Math.max(x.getBoundingClientRect().width, B[i].getBoundingClientRect().width));
    for(let i = 0; i < A.length; i++){
      const w = Math.round(宽[i]);
      if(!(w > 0)) continue;
      A[i].style.width = w + 'px'; B[i].style.width = w + 'px';
    }
  }
  /* 填写那一档：一格一个框，回车整行判分。这些字只摆在这一屏上，一处都不写。 */
  wordType(cs){
    const row = h('div', { class:'wnw-czword type' });
    this.inputs = [];
    cs.forEach((c, i) => {
      const inp = h('input', { class:'c', type:'text', maxlength:'12', spellcheck:'false',
        value:this.typed[i] == null ? '' : this.typed[i],
        oninput:ev => { this.typed[i] = ev.target.value; },
        onkeydown:ev => { if(ev.key === 'Enter'){ ev.preventDefault(); this.judge(cs); } } });
      this.inputs.push(inp); row.appendChild(inp);
    });
    return row;
  }
  judge(cs){
    let ok = 0;
    cs.forEach((c, i) => {
      const want = String(c.t || '').trim(), got = String(this.typed[i] == null ? '' : this.typed[i]).trim();
      const hit = want.toLowerCase() === got.toLowerCase();
      if(hit) ok++; else if(!want) ok++;
      const el = this.inputs[i];
      if(el){ el.classList.remove('ok', 'bad'); el.classList.add(hit ? 'ok' : 'bad'); }
    });
    this.footMsg.textContent = '对 ' + ok + ' / ' + cs.length + ' 格' + (ok === cs.length ? '' : '（错的那几格边上写着原文）');
    cs.forEach((c, i) => {
      const el = this.inputs[i];
      const want = String(c.t || '').trim(), got = String(this.typed[i] == null ? '' : this.typed[i]).trim();
      if(el && want.toLowerCase() !== got.toLowerCase() && !el.nextElementSibling)
        el.insertAdjacentElement('afterend', h('i', { class:'wnw-czans' }, want || '·'));
    });
  }
  /* 这一层是设置里就开着、还是被"点开的"：点开的那一层再点一下要能收回去（默背那一档来回看） */
  layer(k, node){
    if(!this.open[k]) return node;
    const el = h('div', { class:'wnw-czslot', title:'再点一下收回去' });
    el.appendChild(node);
    el.addEventListener('click', () => { this.open[k] = false; this.draw(); });
    return el;
  }
  /* 藏着的那一层：点一下按当前用法办（默背换来换去 / 提示亮一下就收回）。k 是这一层的键，翻卡就清。 */
  slot(k, name, hidden, shown){
    const el = h('div', { class:'wnw-czslot', title:'藏着的' + name + '：' +
      (this.set.mode === 'hint' ? '点一下只亮 ' + HINT_MS / 1000 + ' 秒' : '点一下显出来，再点收回') });
    el.appendChild(hidden());
    el.addEventListener('click', () => {
      if(this.set.mode === 'hint'){
        this.stop();
        el.innerHTML = ''; el.appendChild(shown());
        this.hintTimer = setTimeout(() => { this.hintTimer = null; this.draw(); }, HINT_MS);
        return;
      }
      this.open[k] = !this.open[k]; this.draw();
    });
    return el;
  }
  hotKey(e){
    const manual = !this.set.secs;
    if(e.key === ' ' || e.key === 'ArrowRight' || (manual && e.key === 'ArrowDown')){ e.preventDefault(); this.go(1); return; }
    if(e.key === 'ArrowLeft' || (manual && e.key === 'ArrowUp')){ e.preventDefault(); this.go(-1); return; }
    if(e.key === 'Enter' && this.set.mode === 'type' && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''))){
      e.preventDefault(); this.judge(this.cells(this.cur()));
    }
  }
  /* 鼠标滚轮翻卡（外26 第 4 条）：只在手动那一档收，倒计时会和自动翻卡抢；
     一格滚轮会连发好几个事件，按时间隔挡掉，一次手势算一张 */
  wheel(e){
    if(this.set.secs) return;
    const d = e.deltaY;
    if(!d) return;
    const now = Date.now();
    if(now - (this.wheelAt || 0) < 260) { e.preventDefault(); return; }
    this.wheelAt = now; e.preventDefault();
    this.go(d > 0 ? 1 : -1);
  }
}

Views.reg('cruise', {
  name:'词巡航', icon:'cycle', dockable:true, compactBelow:260,
  /* 书巡航是同一张类的另一档开法：ref 递进来的是 CRUISE_BOOK。标签上这两个字得分得开，
     不然两屏都叫「词巡航」，谁锁哪一卷、谁吃整本书就认不出来了。 */
  title:ref => (ref === CRUISE_BOOK ? '书巡航' : '词巡航'),
  async render(host, ref, ctx){
    host.innerHTML = '';
    const v = new LyricCruise(host, Object.assign({ ref }, ctx));
    await v.boot();
  }
});

addCss(`
.wnw-cruise{display:flex;flex-direction:column;min-height:0;flex:1 1 auto;}
/* 开头那一排按钮悬浮：做成整页时是外层的 .wnw-panel-body 在滚，这排跟着滚走就够不着了（外26 第 7 条） */
.wnw-czbar{display:flex;gap:4px;align-items:center;padding:6px 8px;flex-wrap:wrap;
  position:sticky;top:0;z-index:6;background:var(--card-bg,#fff);}
/* 这一排的衬底（::before 那一层）和词格顶上那一排是同一条规矩，两条并成一条摆在
   w18-lyric.js 那一段里（审查第 16 条），这儿不再抄第二遍。 */
.wnw-czbar .wnw-cznum{font-size:.82em;color:var(--text-light);font-variant-numeric:tabular-nums;}
.wnw-czcard-wrap{flex:1 1 auto;min-height:0;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:10px 12px;}
.wnw-czcard{width:min(760px,100%);border:var(--bw,1px) solid var(--card-border);border-radius:var(--r-card,6px);
  background:var(--card-bg,#fff);padding:0 14px 14px;}
.wnw-czhead{display:flex;gap:8px;align-items:baseline;padding:8px 0 6px;color:var(--text-light);font-size:.82em;}
.wnw-czhead .ch{color:var(--accent-text,var(--accent));font-weight:700;}
.wnw-czhead .ms{margin-left:auto;font-variant-numeric:tabular-nums;}
/* 倒计时那一条：整幅宽，从满退到空（scaleX 走线性，不每帧改宽度） */
.wnw-cztime{height:3px;margin:-2px 0 10px;background:var(--accent);transform-origin:left center;transform:scaleX(0);border-radius:2px;}
/* 单词之间的缝（外27 图9：至少一个字母的宽）。原文那一排的格是 1.9em 的字，一个字母约 .5em，
   折到卡片这一档字号上就是 1em —— 所以给 1.2em（实测一枚 n 在 1.9em 字号下 13.2px，1.2em = 16.8px ≈ 1.28 个字母）。
   三排的列间距必须同一个数：注音对原文是按格量宽度对齐的（alignCells），宽度对齐了、缝不一样宽，
   两排居中之后的落点还是错开，图10 那条一一对应就又破了。行间距各排自己定，不影响左右落点。 */
.wnw-czword{display:flex;flex-wrap:wrap;gap:6px 1.2em;align-items:flex-end;justify-content:center;padding:6px 0 2px;}
.wnw-czword .c{font-size:1.9em;line-height:1.35;min-width:1.5em;text-align:center;border-bottom:1px solid var(--hair-color,#e3e3e3);}
.wnw-czword.type input.c{font:inherit;font-size:1.5em;width:2em;box-sizing:border-box;text-align:center;
  border:1px solid var(--ctl-edge,var(--input-border,#b9bec7));border-radius:4px;background:var(--input-bg,#fff);padding:.1em 0;}
.wnw-czword.type input.c.ok{border-color:var(--ok,#2e8b57);color:var(--ok,#2e8b57);}
.wnw-czword.type input.c.bad{border-color:var(--bad,#c0392b);color:var(--bad,#c0392b);}
.wnw-czans{font-style:normal;font-size:.78em;color:var(--bad,#c0392b);align-self:center;}
.wnw-czrom{display:flex;flex-wrap:wrap;gap:6px 1.2em;justify-content:center;margin-bottom:2px;}
.wnw-czrom .c{font-size:.86em;color:var(--text-light);min-width:1.5em;text-align:center;}
.wnw-cznote{margin-top:10px;padding-top:8px;border-top:var(--hair,1px solid #eee);font-size:.9em;color:var(--text-light);line-height:1.7;}
.wnw-cznote .bar{display:block;height:.9em;width:9em;margin:3px 0;background:var(--candidate-bg,#f0f2f5);border-radius:3px;}
.wnw-czhide{display:flex;flex-wrap:wrap;gap:6px 1.2em;justify-content:center;padding:4px 0;}
.wnw-czhide .c{display:inline-block;width:1.5em;height:1.5em;background:var(--candidate-bg,#f0f2f5);border-radius:3px;}
.wnw-czslot{cursor:pointer;}
.wnw-cznone{color:var(--text-light);font-size:.92em;line-height:1.8;padding:30px 8px;text-align:center;}
.wnw-czfoot{display:flex;gap:6px;align-items:center;padding:6px 10px 8px;}
.wnw-czfoot .wnw-czhint{font-size:.84em;color:var(--text-light);margin-left:6px;}
`);
