/* ============================================================
   标签（第 17 条）：看板节点、设定卡、灵感共用同一份池子
   池子是一份全局的名字清单，谁用上了就在自己那一份数据里记名字 ——
   「这一个下面有什么」是现扫出来的，不另存一张对照表，改哪儿都不会对不上。
   ============================================================ */
const TagPool = {
  key:'tags.pool',
  async all(){ return ((await State.get(this.key, null)) || []).slice(); },
  async set(list){ await State.set(this.key, Array.from(new Set((list || []).map(x => String(x).trim()).filter(Boolean)))); },
  /* 名字里带顿号的按老写法拆成几个（设定卡那个输入框就是顿号分开的） */
  async add(name){
    const have = await this.all(), got = [];
    for(const n of oneLine(name)) if(n && !have.includes(n) && !got.includes(n)) got.push(n);
    if(!got.length) return got;
    await this.set(have.concat(got));
    Bus.emit('tags:pool');
    return got;
  },
  /* 卡片、白板节点、灵感这三处各自扫一遍：返回 { card:[], node:[], insp:[] }，一条 = 某个东西身上的一个标签 */
  async scan(){
    const out = { card:[], node:[], insp:[] };
    for(const m of ((await Cards.all()) || []))
      for(const t of (m.tags || [])) out.card.push({ tag:t, id:m.id, title:m.title, bookId:m.bookId || '' });
    for(const x of ((await Boards.all()) || [])){
      const b = await Boards.get(x.id);
      if(!b) continue;
      for(const n of (b.nodes || []))
        for(const t of (n.tags || [])) out.node.push({ tag:t, id:n.id, title:n.label || '（没名字）', boardId:b.id, boardTitle:b.title });
    }
    for(const m of ((await Insp.all()) || []))
      for(const t of (m.tags || [])) out.insp.push({ tag:t, id:m.id, title:cut(String(m.text || ''), 30), bookId:m.bookId || '' });
    return out;
  },
  /* 改名 / 摘掉要一路改到卡片、白板节点、灵感这三处身上，不然标签页里留下点不开的那一行。
     fn 改一份数据，改了返回 true，这里负责存回去。 */
  async each(fn){
    for(const m of ((await Cards.all()) || [])){
      const c = await Cards.get(m.id);
      if(c && (c.tags || []).some(() => true) && await fn(c)) await Cards.put(c);
    }
    for(const x of ((await Boards.all()) || [])){
      const b = await Boards.get(x.id);
      if(!b) continue;
      let hit = false;
      for(const n of (b.nodes || [])) if((n.tags || []).length && await fn(n)) hit = true;
      if(hit) await Boards.put(b);
    }
    for(const m of ((await Insp.all()) || [])){
      if(!(m.tags || []).length) continue;
      const it = await Insp.get(m.id);
      if(it && await fn(it)) await Insp.put(it);
    }
    Bus.emit('tags:pool'); Bus.emit('desk:cards'); Bus.emit('desk:insp'); Bus.emit('board:saved');
  },
  async rename(from, to){
    const a = String(from || '').trim(), b = String(to || '').trim();
    if(!a || !b || a === b) return '旧名新名得不一样，没动';
    await this.each(x => {
      if(!(x.tags || []).includes(a)) return false;
      /* 这一份已经有新名了：那就只摘旧的，别挂两个一样的 */
      x.tags = b && x.tags.includes(b) ? x.tags.filter(t => t !== a) : x.tags.map(t => t === a ? b : t);
      return true;
    });
    const pool = await this.all();
    await this.set(pool.filter(x => x !== a).concat(pool.includes(b) ? [] : [b]));
    return '已把「' + a + '」改成「' + b + '」';
  },
  async drop(name){
    const a = String(name || '').trim();
    if(!a) return '';
    let n = 0;
    await this.each(x => {
      if(!(x.tags || []).includes(a)) return false;
      x.tags = x.tags.filter(t => t !== a); n++;
      return true;
    });
    await this.set((await this.all()).filter(x => x !== a));
    return '已删掉「' + a + '」，用它的 ' + n + ' 处跟着摘了';
  }
};

/* 一处标签编辑器：池子里点一下就挂上 / 摘掉，底下那格现起新名。
   卡片、白板节点、灵感共用这一格，手感不会分叉。 */
function tagEdit(cur, done){
  const wrap = h('div', { class:'wnw-tagedit' });
  const paint = async () => {
    wrap.innerHTML = '';
    const pool = await TagPool.all();
    const on = new Set(cur);
    const chips = h('div', { class:'wnw-opts' });
    for(const t of pool) chips.appendChild(h('button', { class:'wnw-opt' + (on.has(t) ? ' on' : ''),
      title:'点一下' + (on.has(t) ? '摘掉' : '挂上') + '「' + t + '」', onclick:() => {
        const i = cur.indexOf(t);
        if(i >= 0) cur.splice(i, 1); else cur.push(t);
        done(cur); paint();
      }}, t));
    if(!pool.length) chips.appendChild(h('span', { class:'wnw-hint' }, '池子还是空的，下面起一个'));
    const inp = h('input', { class:'wnw-input wnw-tag-new', placeholder:'起一个新标签 · Enter 收下' });
    inp.addEventListener('keydown', async e => {
      if(e.isComposing || e.keyCode === 229) return;
      if(e.key !== 'Enter') return;
      e.preventDefault();
      const v = inp.value.trim();
      if(!v) return;
      inp.value = '';
      await TagPool.add(v);
      for(const n of oneLine(v)) if(!cur.includes(n)) cur.push(n);
      done(cur); paint();
    });
    wrap.appendChild(chips); wrap.appendChild(inp);
  };
  paint();
  return wrap;
}
/* 数据上那份 tags 不一定是数组（老数据没有这一项），一律现拿一份再交给编辑格 */
function tagBox(obj, after){
  if(!Array.isArray(obj.tags)) obj.tags = [];
  return h('div', { class:'wnw-field' }, [h('label', {}, '标签'),
    tagEdit(obj.tags, () => { after && after(); })]);
}

/* ---------- 标签页：一屏三块 —— 设定卡 / 看板节点 / 灵感 ---------- */
const TAG_KINDS = [['card', '卡片'], ['node', '看板节点'], ['insp', '灵感']];
Views.reg('panel-tag', {
  name:'标签', icon:'tag', dockable:false,
  title:() => '标签',
  render(host, ref, ctx){ new TagPanel(host, ctx).boot(); }
});
/* 中间那一格也开得动（停靠和「＋打开内容」都往这儿进），同一份视图换个壳 */
Views.reg('tags', {
  name:'标签', icon:'tag', dockable:true, compact:true, compactBelow:380,
  title:() => '标签',
  render(host, ref, ctx){ new TagPanel(host, ctx).boot(); }
});
class TagPanel{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.pick = ''; this.q = ''; }
  async boot(){
    this.draw();
    if(this.ctx.on) for(const k of ['tags:pool', 'desk:cards', 'desk:insp', 'board:saved']) this.ctx.on(k, () => this.draw());
  }
  async draw(){
    this.host.innerHTML = '';
    const { head, body } = panelShell(this.host, '标签', [
      h('button', { class:'wnw-btn mini', title:'新建一个标签', onclick:() => this.newTag(), html:icoMarkup('plus') }),
      h('button', { class:'wnw-btn mini', title:'标签池的功能', html:icoMarkup('kebab'), onclick:ev => this.poolMenu(ev.target) })
    ]);
    this.listBox = body;
    panelUnder(head, this.bar());
    await this.list();
  }
  /* 顶上这排就是池子：点一个只看这一个，再点收回全看；右键这个改名、删除 */
  bar(){
    const row = h('div', { class:'wnw-row', style:'padding:6px 9px 0;gap:6px;flex-wrap:wrap;align-items:center' });
    const chips = h('div', { class:'wnw-opts' });
    TagPool.all().then(list => {
      chips.innerHTML = '';
      for(const t of list) chips.appendChild(h('button', { class:'wnw-opt' + (this.pick === t ? ' on' : ''),
        title:'「' + t + '」· 右键改名或删除',
        onclick:() => { this.pick = this.pick === t ? '' : t; this.list(); },
        oncontextmenu:ev => { ev.preventDefault(); ev.stopPropagation(); Menu.open(ev.clientX, ev.clientY, [
          { label:'改名为…', fn:() => this.renameTag(t) },
          { label:'删掉这个', fn:async () => { if(await wnwAsk('删掉「' + t + '」？挂着它的地方会跟着摘掉。')) toast(await TagPool.drop(t)); } }
        ]); } }, t));
      if(!list.length) chips.appendChild(h('span', { class:'wnw-hint' }, '池子还是空的'));
    });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找带标签的东西', value:this.q });
    q.addEventListener('input', () => { this.q = q.value; this.list(); });
    row.appendChild(chips); row.appendChild(q);
    return row;
  }
  newTag(){
    const box = h('div', { class:'wnw-col' });
    const inp = h('input', { class:'wnw-input', placeholder:'标签名，顿号分开可以一次起几个', style:'width:100%' });
    box.appendChild(inp);
    Overlay.open('新建标签', box, [h('button', { class:'wnw-btn primary', onclick:() => {
      const got = TagPool.add(inp.value);
      got.then(x => { Overlay.close(); toast(x.length ? '已收下：' + x.join('、') : '这个已经在池子里了'); });
    }}, '好')]);
    inp.focus();
  }
  renameTag(t){
    const box = h('div', { class:'wnw-col' });
    const inp = h('input', { class:'wnw-input', value:t, style:'width:100%' });
    box.appendChild(inp);
    Overlay.open('标签改名', box, [h('button', { class:'wnw-btn primary', onclick:async () => {
      const to = inp.value.trim();
      const msg = await TagPool.rename(t, to);
      if(this.pick === t) this.pick = to;
      Overlay.close(); toast(msg);
    }}, '改')]);
    inp.focus(); inp.select();
  }
  poolMenu(el){
    Menu.under(el, [
      { label:'把卡片、白板节点、灵感里用过的名字都收进池子', fn:async () => {
        const s = await TagPool.scan();
        const got = await TagPool.add([].concat(s.card.map(x => x.tag), s.node.map(x => x.tag), s.insp.map(x => x.tag)).join('、'));
        toast(got.length ? '补了 ' + got.length + ' 个：' + got.join('、') : '池子已经全了');
      }},
      { label:'清掉池子里没人用的', fn:async () => {
        const s = await TagPool.scan(), pool = await TagPool.all();
        const used = new Set([].concat(s.card.map(x => x.tag), s.node.map(x => x.tag), s.insp.map(x => x.tag)));
        const gone = pool.filter(x => !used.has(x));
        /* 先数完再问：一句「摘几个」得说的是几个，不能让人答完了才知道删了多少 */
        if(!gone.length){ toast('每一个都有人在用'); return; }
        if(!await wnwAsk('清掉池子里没人用的这 ' + gone.length + ' 个标签？' + cut(gone.join('、'), 60) + '\n只是从池子里划掉，卡片、节点、灵感上原本挂着的不受影响（没人用的才在这儿）。')) return;
        await TagPool.set(pool.filter(x => used.has(x)));
        toast('摘了没人用的 ' + gone.length + ' 个');
      }}
    ]);
  }
  async list(){
    const s = await TagPool.scan();
    const q = this.q.trim().toLowerCase();
    const keep = x => (!this.pick || x.tag === this.pick) && (!q || String(x.title).toLowerCase().includes(q));
    this.listBox.innerHTML = '';
    let total = 0;
    for(const [k, n] of TAG_KINDS){
      const hit = (s[k] || []).filter(keep);
      total += hit.length;
      const kids = [h('div', { class:'wnw-mini-h' }, n + ' · ' + hit.length)];
      const by = new Map();
      for(const x of hit){ const a = by.get(x.tag) || []; a.push(x); by.set(x.tag, a); }
      for(const t of [...by.keys()].sort((a, b) => a.localeCompare(b, 'zh'))){
        kids.push(h('div', { class:'wnw-tag-sep' }, t));
        for(const x of by.get(t).slice().sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh')))
          kids.push(h('div', { class:'wnw-ci', onclick:() => this.go(k, x) }, [
            h('span', { class:'nm' }, x.title),
            h('span', { style:'flex:1' }),
            h('span', { class:'wnw-hint' }, k === 'node' ? (x.boardTitle || '')
              : (x.bookId ? (bookTitle(x.bookId) || '他书') : (k === 'insp' ? '全局' : '公共')))
          ]));
      }
      if(!hit.length) kids.push(h('div', { class:'wnw-hint' }, this.pick ? '这一个下面没有' + n : '还没有带标签的' + n));
      this.listBox.appendChild(h('div', { class:'wnw-cg wnw-tag-blk' }, kids));
    }
    if(!total) this.listBox.appendChild(h('div', { class:'wnw-hint' },
      '打标签的地方：卡片右上角的菜单、看板节点双击那一格、灵感那条点开那一格'));
  }
  async go(k, x){
    if(k === 'card'){ Desk.addTab('card', x.id); return; }
    if(k === 'node'){ Desk.addTab('board', x.boardId); return; }
    const it = await Insp.get(x.id);
    if(it) InspBox.edit(it); else toast('这一条灵感已经不在了');
  }
}
addCss(`
.wnw-tagedit{display:flex;flex-direction:column;gap:5px;}
.wnw-tag-new{max-width:16em;}
.wnw-tag-sep{color:var(--text-light);font-size:.8571em;margin:6px 0 1px;}
.wnw-tag-blk{margin-bottom:10px;}
`);
