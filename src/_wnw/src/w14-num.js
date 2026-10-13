/* ============================================================
   章节序号：认格式 · 接着编 · 查断号
   一条标题拆成三段：前缀 + 序号 + 后缀，后缀后面那些字是这一章自己的名字。
     第 20 章 风起     → 前缀「第」 序号 20 后缀「章 」 余「风起」
     20. 测试章节      → 前缀「」   序号 20 后缀「. 」 余「测试章节」
   序号两种写法：阿拉伯数字（020 这种补零的按位数照抄）和简体中文数字（二十）。
   只认这几条明文的对照片段，不跑脚本 —— 跑脚本要 eval，这台机器上不装那个口子。
   ============================================================ */

/* ---------- 一、数字 ---------- */
const CN_D = '零一二三四五六七八九';
function cnNum(n){
  n = Math.floor(n);
  if(!(n >= 0)) return String(n);
  if(n < 10) return CN_D[n];
  if(n < 20) return '十' + (n % 10 ? CN_D[n % 10] : '');
  if(n < 100) return CN_D[Math.floor(n / 10)] + '十' + (n % 10 ? CN_D[n % 10] : '');
  if(n < 1000){ const r = n % 100;
    return CN_D[Math.floor(n / 100)] + '百' + (!r ? '' : (r < 10 ? '零' + CN_D[r] : cnNum(r))); }
  return String(n);
}
/* 认不出来的写法一律给 NaN，让调用方回落到别的格式 */
function cnParse(s){
  if(/^[0-9]{1,6}$/.test(s)) return parseInt(s, 10);
  let total = 0, num = 0, got = false;
  for(const ch of String(s || '')){
    const d = CN_D.indexOf(ch);
    if(d > 0){ num = d; got = true; continue; }
    if(ch === '零'){ continue; }
    if(ch === '十' || ch === '百' || ch === '千'){ num = (num || 1) * ({'十':10, '百':100, '千':1000})[ch]; total += num; num = 0; got = true; continue; }
    return NaN;
  }
  return got ? total + num : NaN;
}
function numText(n, f, raw){
  if(f.type === 'cn') return cnNum(n);
  const pad = Math.max(f.pad || 0, raw && /^[0-9]+$/.test(raw) ? raw.length : 0);
  return pad > 1 && String(n).length < pad ? String(n).padStart(pad, '0') : String(n);
}
/* 拼回一段标题：后缀里的空格是留给标题的，后面接着字就不剥，孤零零时才收干净。
   从别的格式换过来时，原标题前那个空格会跟着旧后缀一起没了，补一个，免得「第14章转」这样粘住 */
function mkTitle(f, n, raw, rest){
  const head = String(f.pre || '') + numText(n, f, raw) + String(f.suf || '');
  if(!rest) return head.replace(/\s+$/, '');
  return head + (/\s$/.test(head) || /^\s/.test(rest) ? '' : ' ') + rest;
}

/* ---------- 二、格式表：内置那七张对照 + 自己新建的 ---------- */
const SEQ_PRESET = [
  { id:'ch-ar',   name:'第20章',   sample:'第20章',      pre:'第', suf:'章',  type:'ar' },
  { id:'ch-cn',   name:'第二十章', sample:'第二十章',    pre:'第', suf:'章',  type:'cn' },
  { id:'ch-pad',  name:'第020章',  sample:'第020章',     pre:'第', suf:'章',  type:'ar', pad:3 },
  { id:'dot-ar',  name:'20. 标题', sample:'20. 测试章节', pre:'',  suf:'. ',  type:'ar' },
  { id:'hui-ar',  name:'第20回',   sample:'第20回',      pre:'第', suf:'回',  type:'ar' },
  { id:'vol-cn',  name:'第一卷',   sample:'第一卷',      pre:'第', suf:'卷',  type:'cn' },
  { id:'vol-ar',  name:'卷1',      sample:'卷1',         pre:'卷', suf:'',    type:'ar' }
];
const Seq = {
  custom:[], mode:'auto', fmtId:'',
  async load(){
    try{
      this.custom = ((await State.get('num-fmt', [])) || []).slice();
      this.mode = (await State.get('num-mode', 'auto')) || 'auto';
      this.fmtId = (await State.get('num-fmt-id', '')) || '';
    }catch(e){ this.custom = []; }
  },
  save(){ State.set('num-fmt', this.custom.slice()); State.set('num-mode', this.mode); State.set('num-fmt-id', this.fmtId); },
  all(){ return this.custom.concat(SEQ_PRESET); },
  /* 指定了某一种就只认那一种；智能识别按自建在前、内置在后挨个试 */
  pick(){ return this.mode === 'fix' ? (this.all().find(f => f.id === this.fmtId) || null) : null; },
  parseOne(f, title){
    if(!f) return null;
    const esc = s => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('^' + esc(f.pre) + '([0-9]{1,6}|[零一二三四五六七八九十百千]{1,8})' + esc(f.suf));
    const m = re.exec(String(title || ''));
    if(!m) return null;
    const raw = m[1];
    const n = f.type === 'cn' ? cnParse(raw) : parseInt(raw, 10);
    if(!isFinite(n) || n < 0) return null;
    return { f, n, raw, rest:String(title || '').slice(m[0].length) };
  },
  parse(title){
    const one = this.pick();
    /* 指定了一种就只认那一种，认不出算它没序号 —— 否则「指定」形同虚设 */
    if(one) return this.parseOne(one, title);
    for(const f of this.all()){ const p = this.parseOne(f, title); if(p) return p; }
    return null;
  },
  /* 拿在手里这一串当「最后一章」，往下推一个 */
  next(title){
    const p = this.parse(title);
    if(!p) return '';
    return mkTitle(p.f, p.n + 1, p.raw, '');
  },
  /* 新建一章该叫什么：本卷从后往前找到第一条认得出序号的，接着排；整卷都没有就按格式从 1 起 */
  nextForVol(vid){
    const chs = Work.orderedChs().filter(c => c.vid === vid);
    for(let i = chs.length - 1; i >= 0; i--){ const t = this.next(chs[i].title); if(t) return t; }
    const one = this.pick();
    if(one) return mkTitle(one, 1, '', '');
    for(const m of Work.orderedChs()){ const p = this.parse(m.title); if(p) return mkTitle(p.f, 1, '', ''); }
    return '';
  },
  /* 新建一卷该叫什么 */
  nextForVolTitle(){
    const vs = Work.book.vols;
    for(let i = vs.length - 1; i >= 0; i--){ const t = this.next(vs[i].title); if(t) return t; }
    const one = this.pick();
    return one ? mkTitle(one, 1, '', '') : '';
  },
  /* 分桶：一卷一桶；全书不分卷就一桶，桶没有卷（v 记成 null，章直接挂在根上） */
  buckets(){
    const b = Work.book, out = [];
    if(b.vols.length) for(const v of b.vols) out.push({ v, chs:Work.orderedChs().filter(c => c.vid === v.id) });
    else out.push({ v:null, chs:Work.orderedChs() });
    return out;
  },
  /* 对照表上那句「最后一章」：从后往前找第一条认得出序号的，忽略卷整卷跳过 */
  lastTitle(){
    const bs = this.buckets().filter(x => !x.v || !x.v.noNum);
    for(let i = bs.length - 1; i >= 0; i--)
      for(let j = bs[i].chs.length - 1; j >= 0; j--) if(this.parse(bs[i].chs[j].title)) return bs[i].chs[j].title;
    return '';
  },
  /* ---------- 三、查断号：桶内一章章看，卷自己也算一趟 ---------- */
  scan(){
    const out = { ch:[], vol:[], skipped:[] };
    for(const bk of this.buckets()){
      if(bk.v && bk.v.noNum){ out.skipped.push(bk.v.title); continue; }
      const g = bk.v ? '这一卷' : '全书';
      let fmt = null, exp = 0;
      for(const m of bk.chs){
        const p = this.parse(m.title);
        if(!p){ out.ch.push({ v:bk.v, m, why:'认不出序号', to:'', n:null, pre:'', suf:'', type:'ar' }); continue; }
        if(!fmt){ fmt = p.f; exp = p.n; }
        if(p.f !== fmt || p.n !== exp) out.ch.push({ v:bk.v, m, fmt, pre:fmt.pre, suf:fmt.suf, type:fmt.type,
          n:exp, raw:p.raw,
          why: p.n !== exp ? '该是 ' + numText(exp, fmt, p.raw) + '，现在写着 ' + numText(p.n, fmt, p.raw)
            : '这一章按「' + p.f.name + '」写的，' + g + '按「' + fmt.name + '」排',
          to: p.n === exp ? '' : mkTitle(fmt, exp, p.raw, p.rest) });
        exp++;
      }
    }
    let vf = null, ve = 0;
    for(const v of Work.book.vols){
      if(v.noNum) continue;
      const p = this.parse(v.title);
      if(!p) continue;
      if(!vf){ vf = p.f; ve = p.n; }
      if(p.n !== ve) out.vol.push({ v, pre:vf.pre, suf:vf.suf, type:vf.type, n:ve, raw:p.raw,
        why:'该是 ' + numText(ve, vf, p.raw) + '，现在写着 ' + numText(p.n, vf, p.raw),
        to: mkTitle(vf, ve, p.raw, p.rest) });
      ve++;
    }
    return out;
  },
  /* 按按钮上那串字改：整段「前缀+序号+后缀」一起换，标题自己的那截字原样接在后面 */
  async fix(r){
    if(!r.to) return '';
    const t = String(((r.m || r.v) || {}).title || '');
    if(r.to === t) return '';
    if(r.m) await Work.renameCh(r.m.id, r.to); else await Work.renameVol(r.v.id, r.to);
    return r.to;
  }
};

/* ---------- 四、那张对话框 ---------- */
const SeqDlg = {
  async open(){
    await Seq.load();
    const draw = () => { SeqDlg.draw(draw); };
    draw();
  },
  fmtRow(f, draw){
    const last = Seq.lastTitle() || f.sample;
    const one = Seq.pick();
    /* 对照表这一行永远按「这一种」来算，不受智能/指定影响 */
    const p = Seq.parseOne(f, last) || Seq.parseOne(f, f.sample);
    const pick = f.id === (one && one.id);
    const from = p ? mkTitle(f, p.n, p.raw, p.rest) : last;
    const to = mkTitle(f, (p ? p.n : 0) + 1, p ? p.raw : '', '');
    return h('div', { class:'wnw-item', style:'flex-wrap:nowrap;gap:10px;cursor:default' }, [
      h('span', { class:'ttl', style:'width:104px;flex:0 0 auto' }, f.name),
      h('span', { class:'snip', style:'flex:1 1 auto' }, from + ' → ' + to),
      h('button', { class:'wnw-btn mini' + (pick ? ' primary' : ''), title:'新建章节、修断号都按这一种来',
        onclick:() => { if(pick){ Seq.mode = 'auto'; Seq.fmtId = ''; } else { Seq.mode = 'fix'; Seq.fmtId = f.id; } Seq.save(); draw(); } },
        pick ? '不指定' : '用这种'),
      !SEQ_PRESET.some(x => x.id === f.id)
        ? h('button', { class:'wnw-btn mini', title:'删掉这个自建格式', onclick:async () => {
            if(!await wnwAsk('删掉自建格式「' + (f.name || f.id) + '」？正用着它的这一处会退回自动编号。')) return;
            Seq.custom = Seq.custom.filter(x => x.id !== f.id);
            if(Seq.fmtId === f.id){ Seq.mode = 'auto'; Seq.fmtId = ''; }
            Seq.save(); draw(); } }, '删') : null
    ]);
  },
  newDlg(done){
    const f = { id:'u' + Date.now().toString(36), name:'', pre:'第', suf:'章', type:'ar', pad:0 };
    const prev = h('span', { class:'wnw-hint' });
    const paint = () => {
      const head = n => mkTitle(f, n, '', '');
      prev.textContent = '预览　最后一章「' + head(20) + '」→ 新章节「' + head(21) + '」　例：' + mkTitle(f, 20, '', '示例');
    };
    const box = h('div', { class:'wnw-col', style:'min-width:min(520px,90vw);gap:10px' });
    const row = (lab, el) => h('div', { class:'wnw-row', style:'align-items:center;gap:10px' }, [
      h('span', { style:'width:76px;flex:0 0 auto;color:var(--text-light)' }, lab), el]);
    const txt = (v, set, ph) => { const i = h('input', { class:'wnw-input', value:v, placeholder:ph || '' });
      i.addEventListener('input', () => { set(i.value); paint(); }); return i; };
    const sel = h('select', { class:'wnw-input' });
    [['ar', '阿拉伯数字（20、21）'], ['cn', '简体中文数字（二十、二十一）']].forEach(([k, n]) => sel.appendChild(h('option', { value:k }, n)));
    sel.addEventListener('change', () => { f.type = sel.value; paint(); });
    box.appendChild(row('格式名称', txt('', v => f.name = v, '这一种叫什么，比如「第20章」')));
    box.appendChild(row('名称前缀', txt('第', v => f.pre = v, '序号前面那些字，可以留空')));
    box.appendChild(row('名称后缀', txt('章', v => f.suf = v, '序号后面、标题前面那些字')));
    box.appendChild(row('序号类型', sel));
    box.appendChild(prev);
    paint();
    Overlay.open('新建一种序号格式', box, [
      h('button', { class:'wnw-btn primary', onclick:() => {
        if(!f.name.trim()){ toast('给这一种起个名字'); return; }
        if(!f.pre && !f.suf){ toast('前后都空着就没法认序号了'); return; }
        Seq.custom.unshift(f); Seq.mode = 'fix'; Seq.fmtId = f.id; Seq.save(); Overlay.close(); done();
      }}, '存下这一种'),
      h('button', { class:'wnw-btn mini', onclick:() => Overlay.close() }, '算了')
    ]);
  },
  draw(redraw){
    const box = h('div', { class:'wnw-col', style:'gap:12px;min-width:min(760px,92vw)' });
    /* 1 · 认法 */
    const card1 = h('div', { class:'wnw-card' });
    card1.appendChild(h('h4', {}, '怎么认序号'));
    const seg = h('div', { class:'wnw-seg' }, [['auto', '智能识别'], ['fix', '指定一种格式']].map(([k, n]) => h('button', {
      class:Seq.mode === k ? 'on' : '', onclick:() => { Seq.mode = k; if(k === 'auto') Seq.fmtId = ''; Seq.save(); redraw(); } }, n)));
    card1.appendChild(h('div', { class:'wnw-row', style:'align-items:center' }, [seg,
      h('span', { class:'wnw-hint' }, Seq.mode === 'fix' ? '新建章节、修断号都只按这一种来' : '照着最后一章那串字自己认')]));
    box.appendChild(card1);
    /* 2 · 对照表 */
    const card2 = h('div', { class:'wnw-card' });
    card2.appendChild(h('div', { class:'wnw-row', style:'align-items:center;justify-content:space-between' }, [
      h('h4', {}, '对照表 · 最后一章 → 新章节'),
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '新建格式', onclick:() => SeqDlg.newDlg(redraw) })]));
    for(const f of Seq.all()) card2.appendChild(this.fmtRow(f, redraw));
    box.appendChild(card2);
    /* 3 · 检测 */
    const card3 = h('div', { class:'wnw-card' });
    card3.appendChild(h('div', { class:'wnw-row', style:'align-items:center;justify-content:space-between' }, [
      h('h4', {}, '连续性检测'),
      h('div', { class:'wnw-row' }, [
        h('button', { class:'wnw-btn mini', onclick:() => { run(); } }, '查一遍'),
        h('button', { class:'wnw-btn primary', onclick:() => fixAll() }, '全部改过来')])]));
    const res = h('div', {});
    card3.appendChild(res);
    const run = () => {
      const r = Seq.scan();
      res.innerHTML = '';
      if(r.skipped.length) res.appendChild(h('div', { class:'wnw-hint' }, '跳过没勾的卷：' + r.skipped.join('、')));
      if(!r.ch.length && !r.vol.length){ res.appendChild(h('div', { class:'wnw-hint' }, '一章一章挨着看的，没发现断号、重号。')); return; }
      const n = r.ch.filter(x => x.to).length + r.vol.filter(x => x.to).length;
      res.appendChild(h('div', { class:'wnw-hint' }, (n ? '要改 ' + n + ' 处：' : '没有能自动改的，这几处自己看一眼：')));
      for(const x of r.vol.concat(r.ch)){
        res.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap;gap:10px;cursor:default' }, [
          h('span', { class:'ttl', style:'width:96px;flex:0 0 auto' }, x.v ? x.v.title : '不分卷'),
          h('span', { class:'snip', style:'flex:1 1 auto' }, (x.m ? x.m.title : x.v.title) + ' · ' + x.why),
          x.to ? h('button', { class:'wnw-btn mini', onclick:async () => {
            const to = await Seq.fix(x); Bus.emit('desk:renamed', x); run(); if(to) toast('改好了：' + to); } }, '改成「' + x.to + '」')
            : h('span', { class:'wnw-hint' }, '格式不一，先给它补个序号')
        ]));
      }
    };
    const fixAll = async () => {
      const r = Seq.scan();
      const list = r.vol.concat(r.ch).filter(x => x.to);
      if(!list.length){ toast('没有要改的'); return; }
      let n = 0;
      for(const x of list){ if(await Seq.fix(x)) n++; }
      Bus.emit('desk:renamed', null);
      toast('改了 ' + n + ' 处');
      run();
    };
    box.appendChild(card3);
    Overlay.open('章节序号', box);
  }
};
