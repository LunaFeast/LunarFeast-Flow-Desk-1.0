/* ============================================================
   写作热力图（外46 十 · 可拆性整理 2026-10-12 从 w8-write.js 搬出来单独立这一份）
   ------------------------------------------------------------
   搬它不为改行为，只为「一条里程碑支只装这一个功能」：这份代码从前住在写作统计那一份里，
   跟「词格」「卡片出场权重」挤同一颗文件，拆支的时候两支会撞同一处。现在它自己一份，
   往统计那一屏只登记一次（底下 StatBlock.reg 那一颗），统计本体不认识「热力图」这三个字。
   五维各自归一后加权：字数／段落数／章节数／设定条数／灵感条数。
   「简洁模式」那一档也归这一块自己管：它只管这块显不显，账在 Meter 那一头照记。
   ============================================================ */
addCss(`
/* 写作热力图：年 = 一列一周，月 = 七天一行的日历格 */
.wnw-heat{overflow-x:auto;overflow-y:hidden;padding-bottom:2px;}
.wnw-heat-head{display:grid;column-gap:3px;height:14px;font-size:.72em;color:var(--text-light);}
.wnw-heat-head span{overflow:visible;white-space:nowrap;}
.wnw-heat-body{display:flex;align-items:flex-start;gap:4px;width:max-content;}
.wnw-heat-wk{display:grid;grid-template-rows:repeat(7,13px);row-gap:3px;font-size:.72em;color:var(--text-light);}
.wnw-heat-wk i{font-style:normal;line-height:13px;}
.wnw-heat-year{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,13px);grid-auto-columns:13px;gap:3px;}
.wnw-heat i.out{opacity:.28;}
/* 热力图小格之间的分界走分隔线那一条（1px + 现算的线色），质感那一档 --bw 归 0 时小格不会糊成一整块。 */
.wnw-heat-year i,.wnw-heat-month i{background:var(--btn-bg);border:var(--hair);}
.wnw-heat-year i{border-radius:var(--r-btn,5px);min-width:13px;min-height:13px;}
.wnw-heat-week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:.78em;color:var(--text-light);margin:4px 0 2px;text-align:center;}
.wnw-heat-month{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
.wnw-heat-month i{height:46px;border-radius:var(--r-card);padding:3px 5px;display:flex;flex-direction:column;
  justify-content:space-between;font-style:normal;font-size:.8em;line-height:1.2;}
.wnw-heat-month i b{font-weight:700;}
.wnw-heat-month i.hi{color:var(--sel-text);}
.wnw-heat-key{display:flex;gap:3px;align-items:center;font-size:.78em;color:var(--text-light);}
.wnw-heat-key i{width:11px;height:11px;border-radius:var(--r-btn,5px);display:block;}
`);

/* ---------- 写作热力图：字数／段落数／章节数／设定条数／灵感条数，五维各自归一后加权 ----------
   字数和段落数是每天记的账（daily）；章节数按章的出生那天，设定条数按卡的 created，灵感条数按灵感的 created。
   卡和灵感的老条目没记出生时间的，退回它最后一次改动那天 —— 只能这样近似，比空着更接近真相 */
const HEAT_DIMS = [['w','字数'],['para','段落数'],['ch','章节数'],['card','卡片条数'],['insp','灵感条数']];
const HEAT_MIX = [0, 12, 28, 46, 66, 88];
function heatBg(lv){ return lv ? 'color-mix(in srgb, var(--accent) ' + HEAT_MIX[lv] + '%, var(--btn-bg))' : 'var(--btn-bg)'; }
function heatK(n){ return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n >= 1000 ? (n / 1000).toFixed(1) + '千' : String(n); }

const Heat = {
  async weights(){
    const s = await State.get('heat.w', null);
    if(Array.isArray(s) && s.length === HEAT_DIMS.length) return s.map(x => Math.max(0, Math.min(1, +x || 0)));
    return HEAT_DIMS.map(() => 0.2);
  },
  async saveW(w){ await State.set('heat.w', w.map(x => Math.max(0, Math.min(1, +x || 0)))); },
  /* idx 里缺 created 的卡现读一次本体补上；读完把临时缓存的卡扔回去，不为一格颜色养一整本卡 */
  async cardDays(bid){
    const idx = await Cards.all();
    let dirty = false;
    for(const r of idx){
      if(r.created) continue;
      const keep = DB.mem.has('card.' + r.id);
      const c = await Cards.get(r.id);
      r.created = (c && (c.created || c.at)) || 0;
      if(!keep) DB.mem.delete('card.' + r.id);
      dirty = true;
    }
    if(dirty) await DB.put('cards.idx', idx);
    return idx.filter(c => (!c.bookId || c.bookId === bid) && c.created).map(c => todayKey(new Date(c.created)));
  },
  async inspDays(bid){
    const rows = await Insp.all();
    return rows.filter(x => !x.bookId || x.bookId === bid).map(x => x.created || x.at)
      .filter(t => t).map(t => todayKey(new Date(t)));
  },
  async build(b){
    const m = new Map();
    const at = k => { let r = m.get(k); if(!r){ r = [0,0,0,0,0]; m.set(k, r); } return r; };
    for(const k of Object.keys(b.daily || {})){
      const d = b.daily[k] || {}, r = at(k);
      r[0] = Meter.netDay(d); r[1] = d.para || 0;
    }
    for(const c of (b.chs || [])) if(c.created) at(todayKey(new Date(c.created)))[2]++;
    for(const k of await Heat.cardDays(b.id)) at(k)[3]++;
    for(const k of await Heat.inspDays(b.id)) at(k)[4]++;
    return m;
  }
};

class HeatPanel {
  constructor(host, ctx){
    const n = new Date();
    this.host = host; this.ctx = ctx;
    this.mode = 'year'; this.y = n.getFullYear(); this.mo = n.getMonth() + 1;
    this.w = HEAT_DIMS.map(() => 0.2);
    this.days = new Map(); this.peak = [1,1,1,1,1]; this.cells = []; this.cellEls = new Map();
  }
  async mount(){
    const n = new Date();
    this.host.innerHTML = '';
    this.w = await Heat.weights();
    this.y = n.getFullYear(); this.mo = n.getMonth() + 1;
    this.host.appendChild(h('div', { class:'wnw-gph' }, '写作热力图'));
    this.bar = h('div', { class:'wnw-row', style:'gap:6px;align-items:center;flex-wrap:wrap' });
    this.body = h('div', { class:'wnw-heat' });
    this.key = h('div', { class:'wnw-heat-key' }, [h('span', {}, '少')]
      .concat([0,1,2,3,4,5].map(i => h('i', { style:'background:' + heatBg(i) })), [h('span', {}, '多')]));
    this.foot = h('div', { class:'wnw-hint' });
    this.host.appendChild(this.bar);
    this.host.appendChild(this.body);
    this.host.appendChild(this.key);
    this.host.appendChild(this.foot);
    this.paintBar();
    const off = [
      Bus.on('desk:saved', () => this.tick()),
      Bus.on('desk:cards', () => this.tick()),
      Bus.on('desk:insp', () => this.tick())
    ];
    if(this.ctx && this.ctx.dispose) off.forEach(f => this.ctx.dispose(f));
    await this.full();
  }
  paintBar(){
    this.bar.innerHTML = '';
    const now = new Date();
    this.bar.appendChild(h('div', { class:'wnw-seg' }, [
      h('button', { class:this.mode === 'year' ? 'on' : '', onclick:() => this.pick('year') }, '年'),
      h('button', { class:this.mode === 'month' ? 'on' : '', onclick:() => this.pick('month') }, '月')]));
    this.bar.appendChild(h('button', { class:'wnw-btn mini', title:this.mode === 'year' ? '上一年' : '上个月',
      onclick:() => this.step(-1), html:icoMarkup('prev') }));
    this.bar.appendChild(h('b', {}, this.mode === 'year' ? this.y + ' 年' : this.y + ' 年 ' + this.mo + ' 月'));
    this.bar.appendChild(h('button', { class:'wnw-btn mini', title:this.mode === 'year' ? '下一年' : '下个月',
      onclick:() => this.step(1), html:icoMarkup('next') }));
    const here = this.mode === 'year' ? this.y === now.getFullYear()
      : this.y === now.getFullYear() && this.mo === now.getMonth() + 1;
    if(!here) this.bar.appendChild(h('button', { class:'wnw-btn mini', onclick:() => {
      this.y = now.getFullYear(); this.mo = now.getMonth() + 1; this.paintBar(); this.full(); } }, '回到现在'));
    this.bar.appendChild(h('span', { style:'flex:1' }));
    this.bar.appendChild(h('button', { class:'wnw-btn mini', onclick:() => heatWDlg(this) }, '权重'));
  }
  /* 年和月切换时都落在当下这一期，不让人找不到今天 */
  pick(m){ if(this.mode === m) return; this.mode = m; this.paintBar(); this.full(); }
  step(n){
    if(this.mode === 'year') this.y += n;
    else { this.mo += n; if(this.mo < 1){ this.mo = 12; this.y--; } if(this.mo > 12){ this.mo = 1; this.y++; } }
    this.paintBar(); this.full();
  }
  /* 整张图的日子：周一开头，头尾补齐到完整周 */
  span(){
    const y = this.y;
    const s0 = this.mode === 'year' ? new Date(y, 0, 1) : new Date(y, this.mo - 1, 1);
    const e0 = this.mode === 'year' ? new Date(y, 11, 31) : new Date(y, this.mo, 0);
    const s = new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() - ((s0.getDay() + 6) % 7));
    const e = new Date(e0.getFullYear(), e0.getMonth(), e0.getDate() + (6 - ((e0.getDay() + 6) % 7)));
    const out = [];
    for(const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)){
      out.push({ key: todayKey(d), d: new Date(d), in: this.mode === 'year' ? d.getFullYear() === y
        : d.getFullYear() === y && d.getMonth() === this.mo - 1 });
    }
    return out;
  }
  async scan(){
    const b = Work.book;
    if(!b) return false;
    this.days = await Heat.build(b);
    const keys = this.cells.filter(c => c.in).map(c => c.key);
    this.peak = [0,1,2,3,4].map(i => Math.max(1, ...keys.map(k => (this.days.get(k) || [0,0,0,0,0])[i])));
    return true;
  }
  /* 只按新权重重上色：数据没变，不用重扫 */
  repaint(){ for(const c of this.cells) this.paint(c); this.stats(); }
  async full(){
    this.body.innerHTML = '';
    this.cellEls = new Map();
    this.cells = this.span();
    /* 权重可能是另一个分屏里的面板改的，重画时现取一次 */
    this.w = await Heat.weights();
    if(!await this.scan()){ this.foot.textContent = ''; this.body.appendChild(h('div', { class:'wnw-hint' }, '还没打开书')); return; }
    if(this.mode === 'year') this.drawYear(); else this.drawMonth();
    for(const c of this.cells) this.paint(c);
    this.stats();
  }
  /* 数据变了就重算数、重新上色，格子本身不重建 */
  async tick(){
    if(!this.cellEls.size){ await this.full(); return; }
    if(!await this.scan()) return;
    for(const c of this.cells) this.paint(c);
    this.stats();
  }
  score(key){
    const v = this.days.get(key);
    if(!v) return 0;
    let sum = 0; for(const x of this.w) sum += x;
    if(!(sum > 0)) return 0;
    let s = 0;
    for(let i = 0; i < HEAT_DIMS.length; i++) s += this.w[i] * Math.min(1, (v[i] || 0) / this.peak[i]);
    return s / sum;
  }
  lvl(key){
    const s = this.score(key);
    return s <= 0 ? 0 : s < .2 ? 1 : s < .4 ? 2 : s < .6 ? 3 : s < .8 ? 4 : 5;
  }
  tip(c){
    const v = this.days.get(c.key) || [0,0,0,0,0];
    return c.key + ' · ' + HEAT_DIMS.map((d, i) => d[1] + ' ' + v[i]).join(' · ');
  }
  paint(c){
    const el = this.cellEls.get(c.key);
    if(!el || !c.in) return;
    const lv = this.lvl(c.key);
    el.style.backgroundColor = heatBg(lv);
    el.title = this.tip(c);
    if(this.mode === 'month'){
      if(el.classList) el.classList.toggle('hi', lv >= 4);
      const sub = el.querySelector('span'), v = this.days.get(c.key) || [0,0,0,0,0];
      if(sub) sub.textContent = v[0] ? heatK(v[0]) : '';
    }
  }
  drawYear(){
    const cols = Math.ceil(this.cells.length / 7);
    const lab = new Array(cols).fill('');
    this.cells.forEach((c, i) => { if(c.in && c.d.getDate() === 1) lab[Math.floor(i / 7)] = (c.d.getMonth() + 1) + '月'; });
    const head = h('div', { class:'wnw-heat-head', style:'grid-template-columns:repeat(' + cols + ',13px)' });
    for(let i = 0; i < cols; i++) head.appendChild(h('span', {}, lab[i]));
    const wk = h('div', { class:'wnw-heat-wk' }, ['一','','三','','五','','日'].map(t => h('i', {}, t)));
    const grid = h('div', { class:'wnw-heat-year' });
    for(const c of this.cells){
      const el = h('i', { class:c.in ? '' : 'out' });
      grid.appendChild(el);
      this.cellEls.set(c.key, el);
    }
    this.body.appendChild(h('div', { style:'width:max-content' }, [head, h('div', { class:'wnw-heat-body' }, [wk, grid])]));
  }
  drawMonth(){
    this.body.appendChild(h('div', { class:'wnw-heat-week' }, ['一','二','三','四','五','六','日'].map(t => h('span', {}, t))));
    const grid = h('div', { class:'wnw-heat-month' });
    for(const c of this.cells){
      const el = h('i', { class:c.in ? '' : 'out' }, [h('b', {}, c.in ? String(c.d.getDate()) : ''), h('span', {}, '')]);
      grid.appendChild(el);
      this.cellEls.set(c.key, el);
    }
    this.body.appendChild(grid);
  }
  stats(){
    if(!(this.w.reduce((a, x) => a + x, 0) > 0)){ this.foot.textContent = '五个权重都是 0，点上面「权重」挑一档'; return; }
    const sum = [0,0,0,0,0];
    for(const c of this.cells){
      const v = c.in ? this.days.get(c.key) : null;
      if(!v) continue;
      for(let i = 0; i < HEAT_DIMS.length; i++) sum[i] += v[i] || 0;
    }
    this.foot.textContent = this.mode === 'year' ? this.y + ' 年' : this.y + ' 年 ' + this.mo + ' 月';
    this.foot.textContent += '：' + HEAT_DIMS.map((d, i) => d[1] + ' ' + sum[i]).join(' · ');
  }
}

/* 权重：滑一条改一条，占比实时跟着变；改的是颜色算法，不用重扫数据 */
function heatWDlg(panel){
  const box = h('div', { class:'wnw-col', style:'gap:8px;min-width:min(420px,88vw)' });
  const outs = [];
  const shares = () => {
    const s = panel.w.reduce((a, x) => a + x, 0);
    return panel.w.map(x => s > 0 ? Math.round(x / s * 100) + '%' : '0%');
  };
  const refresh = () => { const s = shares(); outs.forEach((o, i) => { if(o) o.textContent = s[i]; }); };
  const rows = HEAT_DIMS.map((d, i) => {
    const rg = h('input', { type:'range', min:'0', max:'1', step:'0.01', value:String(panel.w[i]), style:'flex:1' });
    const tx = h('span', { class:'wnw-hint', style:'flex:0 0 3.2em;text-align:right' });
    outs[i] = tx;
    const set = v => {
      panel.w[i] = Math.max(0, Math.min(1, v));
      rg.value = String(panel.w[i]);
      refresh(); panel.repaint();
    };
    rg.addEventListener('input', () => set(parseFloat(rg.value) || 0));
    rg.addEventListener('change', () => { Heat.saveW(panel.w); });
    /* 滚轮：光标停在滑块上就能直接加减，一档 1%。拖滑杆只走 input / change，滚轮是自己改的 value，
       落盘那一发得在这儿补上，不然松手就丢 */
    rg.addEventListener('wheel', e => {
      e.preventDefault();
      set(Math.round((panel.w[i] + (e.deltaY < 0 ? 1 : -1) * 0.01) * 100) / 100);
      Heat.saveW(panel.w);
    }, { passive:false });
    return h('div', { class:'wnw-row', style:'gap:8px;align-items:center' },
      [h('span', { style:'flex:0 0 5em' }, d[1]), rg, tx]);
  });
  box.appendChild(h('div', { class:'wnw-col', style:'gap:6px' }, rows));
  box.appendChild(h('div', { class:'wnw-row', style:'margin-top:4px' }, [
    h('button', { class:'wnw-btn', onclick:() => {
      panel.w = HEAT_DIMS.map(() => 0.2);
      rows.forEach((r, i) => { const rg = r.querySelector('input'); if(rg) rg.value = '0.2'; });
      refresh(); panel.repaint(); Heat.saveW(panel.w); } }, '恢复各 20%'),
    h('span', { style:'flex:1' }),
    h('button', { class:'wnw-btn primary', onclick:() => Overlay.close() }, '关闭')]));
  refresh();
  Overlay.open('热力图权重', box);
}

/* ---------- 往统计那一屏登记这一块：统计只认名单，不认识这一块叫什么 ---------- */
StatBlock.reg({
  name:'写作热力图',
  mount(host, ctx){
    const el = h('div', {});
    host.appendChild(el);
    const panel = new HeatPanel(el, ctx);
    let mounted = false;
    return {
      /* 简洁模式只管这块显不显，账在数据那一头照记；哪天放开这一档，画出来的是那之后的最新数据 */
      async repaint(){
        el.hidden = !!Meter.simple;
        if(Meter.simple || mounted) return;
        mounted = true; await panel.mount();
      },
      refresh(){ panel.full(); }
    };
  },
  prefs(box, onDone){
    const sm = h('input', { type:'checkbox', checked:!!Meter.simple });
    sm.addEventListener('change', async () => { Meter.simple = sm.checked; await Meter.save(); if(onDone) onDone(); });
    box.appendChild(h('label', { class:'wnw-switch' }, [sm, h('span', {}, '简洁模式 · 不显示写作热力图')]));
  }
});
