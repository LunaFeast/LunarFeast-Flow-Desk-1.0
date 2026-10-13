/* ============================================================
   WNW 素材 v0.3
   设定卡（用户自建模板 + 自由属性）/ 卡片池（跨书）/ 灵感（Alt+Enter 快捕）/ 笔记
   ============================================================ */

/* 五个强调位：卡片和选项的标记色从这里取，跟 FD 一起换色（个数和那一排收在 _shared 的 accentSlotVars） */
const COLOR_SLOTS = accentSlotVars();
/* 追踪是属性填写方式的一种，不是卡片类型：待办列表挂在属性项自己身上（it.todos） */
const FIELD_TYPES = [['text', '文本'], ['single', '单选'], ['multi', '多选'], ['link', '关联'], ['track', '追踪']];

/* 行高跟着内容走，textarea 不拖把手 */
function grow(ta){ ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight, 24) + 'px'; }
function valText(it){ return (it.values || []).join('\n'); }
function setValText(it, s){ it.values = String(s || '').split('\n').map(x => x.trim()).filter(Boolean); }
function cut(s, n){ s = String(s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + '…' : s; }
function oneLine(v){ return String(v || '').split(/[、,，;；\s]+/).map(s => s.trim()).filter(Boolean); }
function chips(txt){ return oneLine(txt).join('、'); }

/* ---------- 设定进正文：三档响应度，一律按名字全文匹配，不存锚点 ----------
   高：名字一出现就亮；中：本章问过、点了「亮」才亮；低：只有手动关联并高亮的那几处亮。
   另外，右键「关联设定并高亮」不管哪一档都按当时选中的字面亮，和卡名亮并存。
   颜色按卡片顺序在五个强调位里轮着取，跟 WNW 配色一起换。 */
const RESP = [['high','高响应'],['mid','中响应'],['low','低响应']];
const respName = r => ((RESP.find(x => x[0] === (r || 'high')) || RESP[0])[1]);
const CardHl = {
  list:[], sig:'', cache:{},
  esc(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); },
  names(m){ return [m.title].concat(m.aliases || []).filter(Boolean).sort((a, b) => b.length - a.length); },
  re(words){ return words.length ? new RegExp('(' + words.map(x => this.esc(x)).join('|') + ')', 'g') : null; },
  async sync(){
    if(!Work.book){ this.list = []; this.cache = {}; this.sig = ''; return; }
    const ms = await Cards.forBook(Work.book.id);
    const sig = ms.map(m => [m.id, m.title, chips(m.aliases), m.resp || 'high', JSON.stringify(m.st || null), JSON.stringify(m.ok || {}),
      (m.links || []).map(x => x.chId + (x.hl ? '#' : '-') + x.text).join('|')].join(':')).sort().join('\n');
    if(sig === this.sig) return;
    this.sig = sig; this.cache = {};
    this.list = ms.map((m, i) => ({ id:m.id, title:m.title, aliases:m.aliases || [], resp:m.resp || 'high',
      links:m.links || [], ok:m.ok || {}, st:m.st || null, slot:i % 5 + 1 }));
    Bus.emit('desk:hl');
  },
  /* 某一章该亮的：[{re, cls, card}] —— 这一份按章缓存，卡一改就重算 */
  chapterSpans(chId){
    const key = chId || '*';
    if(this.cache[key]) return this.cache[key];
    const out = [];
    for(const m of this.list){
      /* 手动关联并勾了高亮的：不分响应度，一律按当时选中的那段字面亮，和卡名自动亮并存 */
      const man = m.links.filter(x => x.chId === key && x.hl).map(x => x.text).filter(Boolean);
      let words = null;
      if(m.resp === 'high') words = this.names(m);
      else if(m.resp === 'mid'){ if(m.ok[key]) words = this.names(m); }
      words = Array.from(new Set((words || []).concat(man))).sort((a, b) => b.length - a.length);
      const re = words.length ? this.re(words) : null;
      if(re) out.push({ re, cls:'hl-' + m.slot, card:m.id, css:hlCss(m.st) });
    }
    this.cache[key] = out;
    return out;
  },
  /* 外13-L：这一段自己挂上来的卡（正文右键「本段关联卡片」），跟卡片发起的关联同样待遇 —— 也亮。
     这一段里已经被上面那份管着的卡不重复来一条；没管着的（低响应、中响应还没点过）在这里补上，
     按卡名和别名亮，不看响应度，跟 #89「手动关联的那几处无条件亮」一个口径。 */
  paraSpans(para){
    const ids = para && Array.isArray(para.cards) ? para.cards.filter(Boolean) : [];
    if(!ids.length) return [];
    const out = [];
    for(const id of ids){
      const m = this.get(id);
      if(!m) continue;
      const words = this.names(m);
      const re = words.length ? this.re(words) : null;
      if(re) out.push({ re, cls:'hl-' + m.slot, card:m.id, css:hlCss(m.st) });
    }
    return out;
  },
  /* 画一整段时给的那一份：本章的 + 这一段自己挂的 */
  spans(chId, para){
    const base = this.chapterSpans(chId);
    if(!para || !Array.isArray(para.cards) || !para.cards.length) return base;
    const skip = new Set(base.map(x => x.card));
    const add = this.paraSpans(para).filter(x => !skip.has(x.card));
    return add.length ? base.concat(add) : base;
  },
  get(id){ return this.list.find(x => x.id === id) || null; },
  /* 中响应：名字在本章出现了、但这一章还没问过的卡 */
  pending(chId, text){
    const out = [];
    for(const m of this.list){
      if(m.resp !== 'mid' || m.ok[chId] !== undefined) continue;
      const re = this.re(this.names(m));
      if(!re) continue;
      let n = 0, g; re.lastIndex = 0;
      while((g = re.exec(text)) && n < 99){ n++; if(g.index === re.lastIndex) re.lastIndex++; }
      if(n) out.push({ card:m, n });
    }
    return out;
  },
  /* 悬浮摘要：卡名 + 响应度 + 头几条填了值的属性 */
  async brief(id){
    const c = await Cards.get(id);
    if(!c) return null;
    const rows = [];
    for(const g of (c.groups || [])){
      for(const it of g.items){
        const v = (it.values || []).join('、');
        if(v) rows.push([g.name + ' · ' + it.name, v.length > 46 ? v.slice(0, 46) + '…' : v]);
        if(rows.length >= 4) break;
      }
      if(rows.length >= 4) break;
    }
    return { id:c.id, title:c.title, resp:respName(c.resp), rows };
  }
};
function cardHl(chId){ return CardHl.spans(chId); }
async function syncCardHl(){ await CardHl.sync(); }
const RESP_TIP = { high:'名字一出现就自动亮', mid:'出现时先问一句，点了才亮', low:'只亮手动「关联卡片并高亮」的那几处' };

/* ---------- 关联：一条关联一行 = 目标卡 + 归类 + 关系 + 起止时间 + 转移方式 ----------
   归类按「x&y 关系」分档（第 5 条）：双方是什么就归到哪一档，一条只落一档。
   档里那条具体关系（亲人 / 师徒 / 上级…）是自由文字，不在这儿列。
   一张图摆哪几档，在这张图顶上那两只下拉里挑（外32 图7）。
   时间的读法跟看板时间轨一模一样：拟真 / 架空 / 原点，架空历法跟看板共用那套预设。 */
/* 外32 图7：关系那两头各是一类东西 —— 作者要的是两只下拉，主视角挑一类、关系视角挑几类。
   势力、组织、机构是同一类，名字照作者的用法并写在一起。 */
const LINK_SIDES = [['p', '人'], ['l', '地'], ['t', '物'], ['o', '势力 / 组织 / 机构']];
const sideName = k => ((LINK_SIDES.find(x => x[0] === k) || LINK_SIDES[0])[1]);
/* 一档关联 = 两头各一类，不分先后（「人&地点」和「地点&人」是同一档）。
   原来那七档一个不改地留着（卡片里存的就是这两个字母），补上地&地、物&物、组织&物三档 ——
   两只下拉挑得到哪一头，就得有那一档能落，不然挑「地点 对 地点」是一定空的。 */
const LINK_CATS = [['pp', '人&人关系'], ['po', '人&组织关系'], ['oo', '组织&组织关系'], ['pt', '人&物关系'],
  ['tl', '物&地点关系'], ['pl', '人&地点关系'], ['ol', '组织&地点关系'],
  ['ll', '地&地关系'], ['tt', '物&物关系'], ['ot', '组织&物关系']];
const catName = k => ((LINK_CATS.find(x => x[0] === k) || LINK_CATS[0])[1]);
/* 这两个字母就是两头；谁在前按这张表排，所以「人&地点」存成 pl、反过来挑也是同一档 */
const SIDE_RANK = { p:0, o:1, t:2, l:3 };
const pairKey = (a, b) => SIDE_RANK[a] <= SIDE_RANK[b] ? a + b : b + a;
const catSides = k => [k[0], k[1]];
/* 两只下拉挑出来的一组档：主视角那一位必须在里头，另一头落在关系视角挑中的那几类里。
   两边都只挑「人」= 只看人际关系（作者 2026-10-09 图7 原话）。 */
function catsOf(main, sides){
  const set = new Set((sides && sides.length ? sides : [main]));
  return LINK_CATS.map(x => x[0]).filter(k => { const a = catSides(k);
    return (a[0] === main && set.has(a[1])) || (a[1] === main && set.has(a[0])); });
}
const sortSides = list => (list || []).slice().sort((a, b) => SIDE_RANK[a] - SIDE_RANK[b]);
/* 一张图的门牌：新那一种写成「主|两头」，光两个字母是老那一档（卡片里、看板那两处下拉可能还留着） */
const selRef = (main, sides) => main + '|' + sortSides(sides).join('');
function readRef(ref){
  const k = String(ref || '');
  if(k.indexOf('|') > 0){ const [m, s] = k.split('|');
    const main = LINK_SIDES.some(x => x[0] === m) ? m : 'p';
    const 挑 = sortSides((s || '').split('').filter(x => LINK_SIDES.some(y => y[0] === x)));
    /* 认不出的一律当「只选人」那一头，绝不留一张谁都不见的空页 */
    return { main, sides: 挑.length ? 挑 : [main] }; }
  const c = catKey(k);
  return { main: catSides(c)[0], sides: [catSides(c)[1]] };
}
const selName = (main, sides) => sideName(main) + ' · 关系：' + sortSides(sides).map(sideName).join('、');
/* 画法三种：树（父子挂下去）/ 平铺（一行一条）/ 清单（按被持有者分堆 + 历代）。
   每张图自己记一份，新建那一张按主视角自动挑（组织 = 树，物 = 清单，其余平铺），改过一次就跟着这张图走。 */
const REL_SHAPES = [['tree', '树'], ['flat', '平铺'], ['list', '清单']];
const SHAPE_TIP = { tree:'父子挂下去：谁在谁底下，一层一层看',
  flat:'平铺：一行一条，谁 —关系→ 谁',
  list:'清单：按被挂到的那张卡分堆，先看这个点上的，再看历代' };
function shapeOf(main){
  const n = sideName(main);
  if(n.includes('组织')) return 'tree';
  if(n.includes('物')) return 'list';
  return 'flat';
}
/* 老数据那三档：人物关系→人&人、从属关系→人&组织、资源持有→人&物 */
const OLD_CAT = { rel:'pp', sub:'po', inv:'pt' };
function catKey(k){ return OLD_CAT[k] || (LINK_CATS.some(x => x[0] === k) ? k : 'pp'); }
/* 转移方式把常用的几个点一下就填进去，也照样能手写 */
const LINK_WAYS = ['自始持有', '继承', '赠予', '转让', '抢夺', '丢失', '拾得', '继任', '销毁'];
/* 一行关联的白话写法：关系 · 什么时候算 · 怎么来的 */
function linkDesc(r){
  const a = String(r.t0 || '').trim(), z = String(r.t1 || '').trim();
  const span = (a || z) ? (a || '不限') + ' ~ ' + (z || '不限') + '（' + modeName(r.mode || 'real') + '）' : '一直有效';
  return [r.rel || catName(catKey(r.cat)), span, r.way].filter(Boolean).join(' · ');
}
/* 箭头：单向一张 next、双向一张 swap（都走 icons\ 里那张图，以前拿 → ↔ 两个字顶） */
function linkArMarkup(r){ return '—' + (r.rel || catName(catKey(r.cat))) + icoMarkup(r.bi ? 'swap' : 'next'); }
/* 这套时间读不读得出：看板那条轨的 timeVal 用同一套函数，口径不会走偏。
   端 = 'end' 是给「结束时间」那一格用的：架空只写到年 / 到月时，收的是这一档的最后一天，
   不然「结束 = 45年」会算成 45 年 1 月 1 日，把整年关在外面。 */
function linkVal(mode, cal, s, 端){
  return mode === 'fake' ? fakeTime(s, cal, 端) : mode === 'origin' ? originTime(s) : realTime(s);
}
/* 查看点上这条关联成不成立：两端空着就是不限；读法不同的行不受这个点管 */
function linkLive(row, at, mode){
  if(at === null || at === undefined) return true;
  if(row.mode !== mode) return true;
  const a = linkVal(row.mode, row.cal, row.t0), z = linkVal(row.mode, row.cal, row.t1, 'end');
  if(a !== null && at < a) return false;
  if(z !== null && at > z) return false;
  return true;
}
const CardNames = {
  map:new Map(),
  async sync(){
    try{ for(const m of ((await Cards.all()) || [])) this.map.set(m.id, m.title); }
    catch(e){}
    return this.map;
  },
  get(id){ return this.map.get(id) || ''; }
};
/* 全书所有关联行摊平：谁 → 谁、算哪一档、什么时间有效 */
async function linkRows(bookId){
  await CardNames.sync();
  const ms = bookId === '__ALL__' ? await Cards.all() : await Cards.forBook(bookId);
  const out = [];
  for(const m of ms){
    const c = await Cards.get(m.id);
    if(!c) continue;
    for(const g of (c.groups || [])) for(const it of (g.items || [])){
      if((it.type || 'text') !== 'link') continue;
      for(const r of (it.rows || [])){
        if(!r.to || !CardNames.get(r.to)) continue;
        const one = { from:c.id, fromTitle:c.title, to:r.to, bookId:c.bookId || '', cat:catKey(r.cat), rel:r.rel || catName(catKey(r.cat)),
          mode:r.mode || 'real', cal:r.cal || null, t0:r.t0 || '', t1:r.t1 || '', way:r.way || '', bi:!!r.bi, fld:it.name };
        out.push(one);
        /* 双向：反过来那一条也算一行，两张卡各自都看得到（第 21 条） */
        if(one.bi) out.push(Object.assign({}, one, { from:one.to, fromTitle:CardNames.get(one.to), to:one.from, rev:true }));
      }
    }
  }
  return out;
}


/* ---------- 出场次数：一张卡在全本书里"响应"过多少回 ----------
   高响应：卡名和别名每出现一次算 1，固定不许调；
   中响应：只算点过「亮」的那几章里的出现，再乘中权重；
   低响应：只算手动关联进来的那些处，再乘低权重。
   中、低权重全局一份，0.1~1，步进 0.1。正文一改就重扫，没改就用缓存。
   外13-L 再加一条：这一段正文自己挂上来的卡片（段上的 cards），每张各算一次出场，直接加 1、不乘权重；
   取消关联、删段、删卡都从正文那一份数据里现数，挂的笔数少一笔数就跟着少，不会留虚数。 */
function occW(v){ const n = Math.round((+v || 1) * 10) / 10; return Math.max(.1, Math.min(1, n || .1)); }
function occNum(n){ return String(Math.round(n * 10) / 10); }
function occHits(text, re){
  if(!re || !text) return 0;
  let n = 0, g; re.lastIndex = 0;
  while((g = re.exec(text))){ n++; if(g.index === re.lastIndex) re.lastIndex++; if(n >= 999999) break; }
  return n;
}
const Occur = {
  w:{ mid:1, low:1 }, book:'', sig:'', rows:null, job:null, cells:[], 补:0,
  async weights(){
    this.w = { mid:occW(await State.get('occur.mid', 1)), low:occW(await State.get('occur.low', 1)) };
    return this.w;
  },
  /* 章的 at 在存章时跟着正文走，拿它当指纹：没改过就不重扫。
     卡那头的改动（响应度、手动关联、别名、删卡）不进章的指纹，所以把 CardHl 自己那份卡指纹一并比进来 */
  sigOf(b){ return (b.chs || []).map(c => c.id + ':' + (c.at || 0)).join('|') + '#' + CardHl.sig; },
  /* 卡删了、归属变了：已经数出来的那份作废，下一次用到重新扫 —— 不许留下上一张卡顶出来的数 */
  forget(){ this.rows = null; this.sig = ''; },
  async load(){
    const b = Work.book;
    if(!b) return new Map();
    /* 卡那一头的改动（响应度、点过「亮」哪几章、别名、手动关联）靠 CardHl 那一份指纹进账，
       而那份指纹只有 CardHl.sync() 跑过才更新 —— 从前 load 不等它，谁先算谁吃旧数：
       列表里那一格往往画在 sync 之前，于是改了响应度、点了「亮」，出场次数还是旧的那一个（图9）。
       sync 本身很便宜（一张名单 + 一次比对，没改就当场返回），所以每一趟 load 先过它一道。 */
    await CardHl.sync();
    const sig = this.sigOf(b);
    if(this.rows && this.book === b.id && this.sig === sig) return Promise.resolve(this.rows);
    if(this.job && this.book === b.id && this.sig === sig) return this.job;
    this.book = b.id; this.sig = sig; this.rows = null;
    this.job = this.scan(b, sig).then(m => {
      this.job = null;
      /* 中途作废的那一趟（m 是 null）绝不能当成品摆上去：这一句从前只比指纹、不看这一趟是完整走完还是半路
         被新指纹顶掉的 —— 半截数一旦坐进 rows，指纹又已经改成这一趟认的那个，往后每一格都直接拿它交差，
         出场次数就永远停在缺几章的那一份上（他说的「有时候好不了」）。作废就按当前指纹重跑一趟，
         连着撞三回就先把这一格空着等下一次改动，不拿半截数糊弄。 */
      if(!m) return ++this.补 > 3 ? (this.rows || new Map()) : this.load();
      this.补 = 0;
      if(this.book === b.id && this.sig === sig) this.rows = m;
      this.paint();
      return m;
    });
    return this.job;
  },
  /* 权重一改就把已经算好的次数换算一遍，不重扫全书（正文挂上来的那些笔不乘权重，原样加回去） */
  async reweigh(){
    await this.weights();
    if(this.rows) for(const r of this.rows.values()) r.v = r.n * (r.resp === 'high' ? 1 : r.resp === 'mid' ? this.w.mid : this.w.low) + (r.a || 0);
    this.paint();
  },
  paint(){
    this.cells = this.cells.filter(x => x.el.isConnected);
    if(!this.rows) return;
    for(const x of this.cells) x.el.textContent = occNum((this.rows.get(x.id) || { v:0 }).v);
  },
  /* 那一格数字：扫到了再填，不挡这一屏渲染。出场次数只按当前这本书的正文算，
     别的书来的卡给个横杠，不做跨书累加。
     图9 量到的真缺陷在这一颗：从前只要手里 cached 着一份 rows 就直接填数，
     正文改了、章的 at 变了、指纹已经不是那一枚，它照样把旧数摆上去 ——
     于是「打完字再点开卡片」看到的还是改字之前的次数。现在先比对指纹，旧了就走 load 重扫。 */
  cell(id, bookId){
    const s = h('span', { class:'wnw-hint wnw-occur', title:'出场次数' });
    const cur = Work.book ? Work.book.id : '';
    if(bookId && bookId !== cur){ s.textContent = '—'; s.title = '出场次数只按当前这本书的正文算'; return s; }
    s.textContent = '·';
    this.cells.push({ el:s, id });
    const 鲜 = this.rows && cur && this.book === cur && this.sig === this.sigOf(Work.book);
    if(鲜) s.textContent = occNum((this.rows.get(id) || { v:0 }).v);
    else this.load().then(() => { if(s.isConnected) s.textContent = occNum((this.rows.get(id) || { v:0 }).v); })
      .catch(() => { if(s.isConnected) s.textContent = '0'; });
    return s;
  },
  async scan(b, sig){
    const out = new Map();
    await this.weights();
    const ms = await Cards.forBook(b.id);
    /* 中响应只认点过「亮」的那些章，所以按章留着，别拼成一整块就没法分章了。
       顺手把每一段自己挂上来的卡（段上的 cards）记一笔：一段挂 5 张卡，这 5 张各多一次出场。
       fresh 是这一趟为新读进来的那几章记的账：本来就在缓存里的（比如正开着的那章）不能碰，
       读完要退掉，别让看个列表把整本书背在内存上 —— 中途作废的那一趟也要走这一道，
       从前那里直接 return，半路读进来的整批章节留在内存里，重跑一回再留一批。 */
    const per = [], fresh = [], assoc = new Map();
    const 退 = () => { for(const key of fresh) DB.mem.delete(key); };
    for(const m of (b.chs || [])){
      const key = 'book.' + b.id + '.ch.' + m.id;
      if(!DB.mem.has(key)) fresh.push(key);
      const c = await Work.ch(m.id);
      if(!c) continue;
      for(const p of (c.paras || [])) for(const id of (Array.isArray(p.cards) ? p.cards : []))
        if(id) assoc.set(id, (assoc.get(id) || 0) + 1);
      per.push({ id:m.id, text:(c.paras || []).map(p => cleanText(p)).join('\n') });
      if(this.sig !== sig || this.book !== b.id){ 退(); return null; }
    }
    /* 一张卡 × 全书文本是一道一道同步正则：从前这一串里一枪都不放，几十上百张卡一口气跑完，
       主线程整段被占住 —— 新建卡片那个名字框、看板节点那个名字框「要等一下才打得进字」就是这一下。
       每十二张让一拍（真让给事件循环，不是 await 一个已完成的 promise 那种假让），打字立刻插得进去。 */
    const 让 = () => new Promise(r => setTimeout(r, 0));
    let 拍 = 0;
    for(const m of ms){
      const names = CardHl.names(m), re = names.length ? CardHl.re(names) : null;
      const resp = m.resp || 'high';
      let n = 0, k = 1;
      if(resp === 'low'){ n = (m.links || []).length; k = this.w.low; }
      else if(resp === 'mid'){ n = per.reduce((a, x) => a + ((m.ok || {})[x.id] ? occHits(x.text, re) : 0), 0); k = this.w.mid; }
      else n = per.reduce((a, x) => a + occHits(x.text, re), 0);
      const a = assoc.get(m.id) || 0;
      out.set(m.id, { n, k, resp, a, v: n * k + a });
      if(++拍 % 12 === 0){ await 让(); if(this.sig !== sig || this.book !== b.id){ 退(); return null; } }
    }
    退();
    return out;
  }
};

/* ---------- 悬浮摘要：鼠标停在高亮的设定名上，浮出这张卡 ---------- */
const CardTip = {
  node:null, id:'', timer:null,
  /* 三个全局监听收进容器：从前挂在 document / window 上，宿主页面上任何一处悬停、滚动、按下
     都会来问一遍「这是不是为写的高亮设定名」，问出来还往 body 上贴浮窗。 */
  init(host){
    /* 上一回拆干净再开的时候，那一记悬浮目标还留在对象上：不清的话第一次停到同一个卡名上会被
       「和现在这一个相同」挡回去，浮窗要等到换了别的名字再回来才肯出（start→stop→start 必走这条路） */
    this.id = ''; this.hide();
    wnwOn(host, 'mouseover', ev => {
      const el = ev.target && ev.target.closest ? ev.target.closest('[data-card]') : null;
      const id = el ? el.getAttribute('data-card') : '';
      if(id === this.id) return;
      this.id = id;
      this.hide();
      if(!id) return;
      const r = el.getBoundingClientRect();
      this.timer = setTimeout(() => this.show(id, r), 280);
    });
    wnwOn(host, 'scroll', () => { this.id = ''; this.hide(); }, true);
    /* 点一下就收：切标签、按按钮之后浮窗不该还挂在老位置 */
    wnwOn(host, 'pointerdown', () => { this.id = ''; this.hide(); });
  },
  /* 只管撤计时器和浮窗，不碰 this.id：这一句从前顺带把 id 抹成空，而上面那一串是先写 id、
     再叫 hide()，于是 280 毫秒后 show() 那句「指针还停在同一个卡名上吗」拿空串去比卡片号，
     永远不等 → 每次都直接 return，摘要浮窗一次也没浮出来过（外36「亮了，没有悬浮」的根，
     和高亮那条少一格空格是两个各自独立的 bug）。谁要清这一记都在外面自己写 this.id = ''。 */
  hide(){ clearTimeout(this.timer); if(this.node){ this.node.remove(); this.node = null; } },
  async show(id, r){
    const b = await CardHl.brief(id);
    if(!b || this.id !== id) return;
    this.hide();
    const tip = h('div', { class:'wnw-tip' }, [h('b', {}, b.title), h('span', { class:'tp' }, b.resp)]);
    if(b.rows.length){
      const rows = h('div', { class:'r' });
      for(const [k, v] of b.rows){ rows.appendChild(h('span', { class:'k' }, k)); rows.appendChild(h('span', {}, v)); }
      tip.appendChild(rows);
    }
    wnwRoot().appendChild(tip);
    this.node = tip;
    /* 量到的是视口坐标，摆的是容器内的一块（皮肤里 .wnw-tip 已经从 fixed 改成 absolute） */
    const bx = wnwBox(), at = wnwLocal(r.left, r.bottom);
    tip.style.left = Math.max(6, Math.min(bx.w - tip.offsetWidth - 6, at.x)) + 'px';
    tip.style.top = (at.y + tip.offsetHeight + 12 > bx.h ? Math.max(6, at.y - tip.offsetHeight * 2 - 6) : at.y + 6) + 'px';
  }
};

/* ---------- 面板壳：左栏、标签、停靠都用这一格 ---------- */
/* 停在右栏卡片里的时候：卡名和「常驻 / 折叠 / 关闭」已经在卡片那一行标题栏上了，
   正文里再画一行同名标题就是重复；正文那一行的操作按钮也尽量挪上标题栏。
   音乐遥控器不归这一套管 —— 它是插件、不走 panelShell，按钮照旧留在自己那一屏里（他点名的例外）。 */
function dockBarOf(host){
  const card = host && host.closest ? host.closest('.wnw-dock-card') : null;
  return card ? card.querySelector('.wnw-dock-bar') : null;
}
function dockOpsInto(bar, ops){
  if(!bar) return false;
  /* 视图每重画一次就把上一批交上来的按钮撤干净再挂新的：不然重画一回堆一排，
     而且「放大 / 模板」这种按档位换面孔的会留下对不上号的那一枚 */
  (bar._wnwOps || []).forEach(el => { try{ el.remove(); }catch(e){} });
  const pin = bar.querySelector('.b');            /* 插到「常驻」之前：折叠、关闭留在最右边 */
  const put = [];
  for(const el of (ops || [])){
    if(!el) continue;
    el.classList.add('wnw-dock-op'); put.push(el);
    if(pin) bar.insertBefore(el, pin); else bar.appendChild(el);
  }
  bar._wnwOps = put;
  return true;
}
function panelShell(host, title, ops){
  const wrap = h('div', { class:'wnw-pbox' });
  const bar = dockBarOf(host);
  /* 停靠那一档这一行壳子留着但不画标题、也不占位：视图自己往里塞的东西（panelTitle 换的那个名字框）
     照样塞得进去，塞进去之后它就不再是空的，样式那条 :empty 自己收回去 */
  const head = bar ? h('div', { class:'wnw-phead wnw-phead-dock wnw-nosel' })
    : h('div', { class:'wnw-phead wnw-nosel' }, [h('b', {}, title), h('span', { style:'flex:1 1 auto' })].concat(ops || []));
  if(bar) dockOpsInto(bar, ops);
  const body = h('div', { class:'wnw-pbody' });
  wrap.appendChild(head); wrap.appendChild(body);
  host.appendChild(wrap);
  return { wrap, head, body };
}
/* 在面板标题右边塞自己的控件（卡片名、筛选条等） */
function panelTitle(head, node){
  const b = head.querySelector('b');
  if(b) b.replaceWith(node); else head.insertBefore(node, head.firstChild);   /* 停靠那一档没有那个标题，插到最前面，别把传进来的东西丢了 */
  return node;
}
function panelUnder(head, node){ head.after(node); return node; }

/* ---------- 多选这一档：Ctrl+A / Esc 归哪一张列表（外15 第 6 条）----------
   从前这几张列表没有「挑一批」这件事：单击就开那张卡（那条灵感），想删两三张只能开一张关一张。
   现在要的是 Ctrl+A 全选这一屏摆出来的那些，可卡片和灵感在一页上能同时摆出好几张列表 ——
   左栏那一张、中栏那一屏、右栏几块停靠各一张，各张挑的各是各的。
   要是给每张列表各绑一条 keydown、Ctrl+A 各自把自己刷一遍，那不行：
   键盘上根本没有「焦点在哪一张」这件事（点列表不改焦点），一发 Ctrl+A 四条都接到，
   等于一下子选中四屏压根没在看的条目，下一刀批量删除就删到别处去了。
   所以这里模块级只绑一条，主人认 w0-skin 那份 pickBind / pickAsk：
   指针在哪一张列表里按下过就归它，那张已经不在页面上了就当没人接（这一发就是没人干），
   绝不允许「找不到主人就每张都全选一遍」那种退路。
   PICKED 只是「这一格容器 → 摆这一张列表的那个实例」的门牌，认的是容器本身、不是种类：
   同一张卡片池在中栏和右栏各摆一块是两份内容，按种类找就分不清该叫谁了。
   选中集（sel / 锚点 / 这一趟的序）仍旧存在各实例自己身上，这里只转一句「你全挑 / 你清掉」，不代收。 */
const PICKED = new Map();
/* 列表画完自己那一格就登记进来：pickBind 管「按下算谁的」，门牌管「按到了叫谁」 */
function pickReg(el, view){
  for(const [k] of PICKED) if(!k.isConnected) PICKED.delete(k);   // 关掉的标签、收掉的停靠，从门牌上一并摘下去
  PICKED.set(pickBind(el), view);
  pickKeys();
  return el;
}
/* 绑这一条要走函数、不能在文件顶上光写一行：wnwStop → wnwStart 那一趟（w6-boot.js:64）会调 wnwOffAll()
   把登记过的监听全摘走，而文件顶上那一行一辈子只跑一回，摘走之后没人再挂回去 —— Ctrl+A 就成了哑键。
   所以认的不是「我绑过没有」，是「那一枚还挂在账上没有」（和章纲、看板那两头同一个办法）。 */
function pickKeys(){
  if(pickKeys.fn && WNW_ON.some(it => it[2] === pickKeys.fn)) return;
  pickKeys.fn = wnwOn(document, 'keydown', pickKeyAt);
}
function pickKeyAt(ev){
  /* 中文输入法顶屏那一阵里 Ctrl+A 是候选窗的事：这一发要让输入法自己吃掉，不许抢（整页被选中一回就够烦的） */
  if(ev.isComposing || ev.keyCode === 229) return;
  /* 浮层和右键菜单开着的时候不抢键盘：那两头各有自己的关闭键 */
  if(Overlay.node || Menu.node) return;
  const k = String(ev.key || '').toLowerCase();
  const askAll = k === 'a' && (ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey;
  if(!askAll && k !== 'escape') return;
  /* 光标在输入框里（找卡、找灵感那两条搜索框）：Ctrl+A 该全选框里那些字，不该全选列表 */
  if(ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable]')) return;
  const owner = pickAsk();
  const view = owner && PICKED.get(owner);
  /* 主人不是这几张卡片 / 灵感列表（章纲、看板那边认的是自己那一格），或者压根没人接 —— 都不关这里的事 */
  if(!view) return;
  /* 接下了这一发就得把浏览器那一句「全选整页文字」挡掉：不挡的话条目选中了一批，
     卡片名和右边的卡片池同时糊出一片蓝底，主人要的是前者、看见的却是两样。
     Esc 这一支没别的默认动作可挡，原样留着。 */
  if(askAll){ ev.preventDefault(); view.selAll(); } else view.selNone();
}

/* ============================================================
   设定卡：结构来自模板，内容一张卡一份
   ============================================================ */
/* ---------- 第 19 条：拖着手把排序 ----------
   老规矩不添新控件：属性组抓组名拖，属性抓左边那个名字拖。
   同一排里落点在哪一半就插到哪个前/后；属性落到别的组那一格（组名那行或空白处）就是接到那一组末尾。
   卡里拖完问一句要不要连模板一起改；模板里拖完自动同步用到这张模板的卡，第一次问，勾了以后不再问就不再问。 */
const DND = { cur:null };
function dndClear(){
  DND.cur = null;
  const box = wnwRoot(); if(!box) return;
  for(const x of box.querySelectorAll('.dnd-out,.dnd-tgt')) x.classList.remove('dnd-out', 'dnd-tgt');
}
/* 抓着的事交给一个现成的静态标签：拖 = 带走这一份，点 = 原来干什么还干什么 */
function dragHandle(el, get){
  el.setAttribute('draggable', 'true');
  el.classList.add('wnw-grip');
  el.title = (el.title ? el.title + ' · ' : '') + '拖着我换位置';
  el.addEventListener('dragstart', ev => {
    DND.cur = get();
    el.classList.add('dnd-out');
    try{ ev.dataTransfer.setData('text/plain', 'wnw'); ev.dataTransfer.effectAllowed = 'move'; }catch(e){}
    ev.stopPropagation();
  });
  el.addEventListener('dragend', dndClear);
  return el;
}
/* 接住拖过来的东西：mine 说明这一格是谁，fn(拖来的, 位置) 由外面决定怎么挪 */
function catchDnd(el, mine, fn){
  el.addEventListener('dragover', ev => {
    const d = DND.cur;
    if(!d || d === mine || d.g === mine.g && d.kind === mine.kind && d.it === mine.it) return;
    ev.preventDefault(); ev.stopPropagation();
    const r = el.getBoundingClientRect();
    const half = ev.clientY < r.top + r.height / 2 ? 'before' : 'after';
    /* 属性落到组那一格（组名那一行、下面的空白）就是接到那一组末尾；其余都按上下半前后插 */
    el.dataset.dnpos = mine.kind === 'grp' && d.kind === 'fld' ? 'in' : half;
    el.classList.add('dnd-tgt');
  });
  el.addEventListener('dragleave', () => el.classList.remove('dnd-tgt'));
  el.addEventListener('drop', ev => {
    const d = DND.cur;
    if(!d) return;
    ev.preventDefault(); ev.stopPropagation();
    const pos = el.dataset.dnpos === 'after' ? 'after' : el.dataset.dnpos === 'before' ? 'before' : 'in';
    el.classList.remove('dnd-tgt');
    DND.cur = null;
    fn(d, pos);
  });
  return el;
}
/* 一次挪动的账：d = 被拖的那一份，tgt = 落点那一份。都在同一份 groups 数组里办 */
function moveTo(groups, d, tgt, pos){
  if(!d || !tgt) return false;
  if(d.kind === 'grp'){
    const from = groups.indexOf(d.g), at0 = groups.indexOf(tgt.g);
    if(from < 0 || at0 < 0 || d.g === tgt.g) return false;
    groups.splice(from, 1);
    const ni = groups.indexOf(tgt.g);
    groups.splice(pos === 'after' ? ni + 1 : ni, 0, d.g);
    return true;
  }
  const sg = groups.find(x => x === d.g), tg = groups.find(x => x === tgt.g);
  if(!sg || !tg) return false;
  const gi = sg.items.indexOf(d.it);
  if(gi < 0) return false;
  const item = sg.items.splice(gi, 1)[0];
  const ti = tgt.it ? tg.items.indexOf(tgt.it) : -1;
  if(ti < 0) tg.items.push(item);
  else tg.items.splice(pos === 'after' ? ti + 1 : ti, 0, item);
  return true;
}
/* 模板那边没有卡里那些内容，只有结构 —— 同样的动作在模板的数组里按名字再走一遍 */
function refOf(groups, d){
  if(!d) return null;
  const g = groups.find(x => x.name === d.g.name);
  if(!g) return null;
  return { kind:d.kind, g, it:d.it ? (g.items.find(x => x.name === d.it.name) || null) : null };
}
/* 模板改了 → 用到它的卡跟着对齐（图12）。认人靠 fid：卡上那条带着模板属性的号就是从模板来的，
   跟着模板走（改名、换填写方式、挪位置、模板里删了它也跟着删）；没有 fid 的是他在卡上自己加的，
   一律留在末尾不动。组只认名字：模板里没有的组不删（分不清是他自己加的还是模板删的，宁可留着）。
   换填写方式时填过的字要跟着洗一遍：单选只留还存在的选项、多选留还存在的那几个、
   换成关联 / 追踪这种结构位另起空行 —— 掉了几处字当场数给问那一句看。 */
function 洗值(it, 旧型, 定型, opts){
  const has = v => opts.some(o => o === v);
  let 掉 = 0;
  const 原 = Array.isArray(it.values) ? it.values : [];
  if(定型 === 'single'){ const k = 原.filter(has); it.values = k.length ? [k[0]] : []; 掉 = 原.length - it.values.length; }
  else if(定型 === 'multi'){ const k = 原.filter(has); 掉 = 原.length - k.length; it.values = k; }
  else if(定型 === 'link' || 定型 === 'track'){ it.values = []; 掉 = 原.length; }
  else { it.values = 原; }
  if(定型 === 'link' && !Array.isArray(it.rows)) it.rows = [];
  if(定型 !== 'link') it.rows = undefined;
  if(定型 === 'track' && !Array.isArray(it.todos)) it.todos = [];
  if(定型 !== 'track') it.todos = undefined;
  if(定型 === 'text' && 旧型 !== 'text') it.opts = [];
  return 掉;
}
function alignToTpl(c, tpl){
  const rep = { 新加:0, 补组:0, 改名:0, 改组名:0, 换型:0, 删掉:0, 掉字:0, 移动:0 };
  const tg = tpl.groups || [];
  const 号在 = new Set(); for(const g of tg) for(const f of (g.items || [])) 号在.add(f.id);
  /* 「模板里没了它就删」这一条只在模板自己带编号时成立：老底子存的模板、以及导入覆盖进去的模板
     （tplFromJson 每次重新发号，那些号跟卡上记录的fid对不上）都没有可信的编号，
     照删会把这张卡里所有填过的字一起删光。这一趟宁可只按名字对，不动刀。 */
  const 能删 = 号在.size > 0 && ![...号在].some(x => !x);
  /* 1. 先删（模板里没了的那几条），再排、再补，省得删掉的东西又被当成「卡上自己加的」留下 */
  for(const g of (c.groups || [])){
    const keep = [];
    for(const it of (g.items || [])){
      if(能删 && it.fid && !号在.has(it.fid)){
        rep.删掉++;
        rep.掉字 += (it.values || []).filter(x => String(x || '').trim() !== '').length
          + (it.rows || []).length + (it.todos || []).length;
      } else keep.push(it);
    }
    g.items = keep;
  }
  /* 2. 组：按模板的次序对齐，模板里没有的组留到末尾 */
  const left = (c.groups || []).slice(), 排好的 = [];
  const 组卡序 = new Map(); left.forEach((g, i) => 组卡序.set(g, i));
  const 挑组 = [];               /* [这组在卡里排第几, 它在模板里排第几] */
  for(const tgd of tg){
    let gi = left.findIndex(g => g.name === tgd.name);
    if(gi < 0){
      /* 模板里改了组名：卡上那一组靠名字已经认不出来，改靠「组里这几条属性的编号」认 ——
         共号最多的那一组就是它，跟着改口。不这么办的话改一次组名会凭空多出一组空的、
         原来那一组带着填好的字掉到末尾。 */
      const 号 = new Set((tgd.items || []).map(f => f.id));
      let 最好 = -1, 分 = 0;
      left.forEach((g, i) => {
        const n = (g.items || []).filter(it => it.fid && 号.has(it.fid)).length;
        if(n > 分){ 分 = n; 最好 = i; }
      });
      if(最好 >= 0) gi = 最好;
    }
    let g;
    if(gi < 0){ g = { name: tgd.name, items: [] }; c.groups.push(g); rep.补组++; }
    else{
      g = left.splice(gi, 1)[0];
      挑组.push([组卡序.get(g), tg.indexOf(tgd)]);
      if(g.name !== tgd.name){ g.name = tgd.name; rep.改组名++; }
    }
    /* 3. 组里的属性：按模板次序对齐，卡上自己加的（没 fid）留在末尾 */
    const rest = (g.items || []).slice(), items = [];
    const 卡内序 = new Map(); rest.forEach((it, i) => 卡内序.set(it, i));
    const 挑过的 = [];           /* [这条在卡里排第几, 它在模板里排第几]，用来判有没有真换了先后 */
    for(const tf of (tgd.items || [])){
      let it = rest.find(x => x.fid && tf.id ? x.fid === tf.id : (!x.fid && x.name === tf.name));
      if(it){
        挑过的.push([卡内序.get(it), tgd.items.indexOf(tf)]);
        rest.splice(rest.indexOf(it), 1);
        const 型 = it.type || 'text', 新 = tf.type || 'text';
        if(it.name !== tf.name){ it.name = tf.name; rep.改名++; }
        const 项 = (tf.opts || []).map(o => o.label);
        if(型 !== 新 || JSON.stringify((it.opts || []).map(o => o.label)) !== JSON.stringify(项)){
          it.type = 新; it.opts = (tf.opts || []).map(o => ({ label:o.label, color:o.color }));
          rep.掉字 += 洗值(it, 型, 新, 项); rep.换型++;
        }
      } else {
        it = { id: uid('f'), fid: tf.id, name: tf.name, type: tf.type || 'text', values: [],
          opts: (tf.opts || []).map(o => ({ label:o.label, color:o.color })) };
        洗值(it, 'text', it.type, (tf.opts || []).map(o => o.label));
        rep.新加++;
      }
      items.push(it);
    }
    /* 挪位置只认「真换了先后」：把卡上原来那几条按卡里的次序排一遍，看它们在模板里的序号
       还从不调头 —— 调了头才是在模板里被拖过。模板里加/删一条造成的往后挪一位不算，
       免得报账里凭空多出一句「挪位置」。 */
    const 按卡序 = 挑过的.sort((a, b) => a[0] - b[0]).map(x => x[1]);
    if(按卡序.some((n, i) => i && n < 按卡序[i - 1])) rep.移动++;
    g.items = items.concat(rest);
    排好的.push(g);
  }
  /* 组这一层也报「挪位置」：卡上原来那几组在模板里调了头才算被拖过 */
  const 组按卡序 = 挑组.sort((a, b) => a[0] - b[0]).map(x => x[1]);
  if(组按卡序.some((n, i) => i && n < 组按卡序[i - 1])) rep.移动++;
  if(排好的.length) c.groups = 排好的.concat(left.filter(g => 排好的.indexOf(g) < 0));
  return rep;
}
/* 把一张的对齐账并进总数 */
function 并对齐(总, 一){ for(const k of Object.keys(一)) 总[k] += 一[k]; return 总; }
/* 模板改完 → 同模板的卡一起对齐。第一次问一句（报的是当场算出来的真数），勾了以后不再问就照上次那个答案走 */
async function syncFromTpl(tpl, skipAsk){
  const ms = (await Cards.all()).filter(m => m.tpl === tpl.id);
  if(!ms.length) return 0;
  const 张 = [];
  for(const m of ms){ const c = await Cards.get(m.id); if(c) 张.push(c); }
  const 试 = { 新加:0, 补组:0, 改名:0, 改组名:0, 换型:0, 删掉:0, 掉字:0, 移动:0, 类型名:0 };
  for(const c of 张) 并对齐(试, alignToTpl(JSON.parse(JSON.stringify(c)), tpl));
  /* 模板改名：卡的类型名是建卡时抄下去的一份快照（cardTypeName 读的就是这份，不回头查模板），
     所以模板那头改了名，这一趟要把它一起改口，不然货架上、搜索里还挂着老名字 */
  试.类型名 = 张.filter(c => c.tplName !== tpl.name).length;
  const 有活 = Object.keys(试).some(k => 试[k]);
  if(!有活) return 0;
  if(!skipAsk){
    const last = await State.get('tpl.sync', '');
    if(last !== 'yes' && last !== 'no'){
      const never = h('input', { type:'checkbox' });
      const 明细 = [['补属性组', 试.补组, '个'], ['新添属性', 试.新加, '处'], ['改属性名', 试.改名, '处'],
        ['改属性组名', 试.改组名, '处'], ['换填写方式', 试.换型, '处'], ['删掉属性', 试.删掉, '处'],
        ['挪位置', 试.移动, '处'], ['改卡片类型名', 试.类型名, '张']].filter(x => x[1])
        .map(x => x[0] + ' ' + x[1] + ' ' + x[2]).join('、');
      const r = await askBox('同步这些卡', [
        { t:'模板「' + tpl.name + '」改了，用到它的 ' + 张.length + ' 张卡跟着对齐：' + 明细 + '。' },
        { t: 试.掉字 ? '换填写方式、删属性会连带掉 ' + 试.掉字 + ' 处已经填过的字。' : '这一趟不掉任何已填的字。' , hint:1 },
        { t:'卡上自己加的组、自己加的属性留在末尾不动。', hint:1 },
        { t:'这些卡上「最近改动」那个时间跟着不动：你没写过的卡不会因为改了模板就排到今天来。', hint:1 }
      ], { list:[['只改模板', 'no'], ['一起对齐', 'yes']], extra:[h('label', { class:'wnw-switch' }, [never, h('span', {}, '以后不再问')])] });
      if(never.checked) await State.set('tpl.sync', r);
      if(r !== 'yes') return 0;
    } else if(last !== 'yes') return 0;
  }
  const ids = 张.map(c => c.id);
  for(const c of 张){ alignToTpl(c, tpl); c.tplName = tpl.name; await Cards.put(c, true); }
  Bus.emit('desk:cards');
  Bus.emit('cards:aligned', ids);
  return 张.length;
}
/* 问一句那种：三个按钮挑一个，回来是个 promise */
function askBox(title, lines, btns){
  return new Promise(res => {
    const box = h('div', { class:'wnw-col' }, lines.map(x => h('div', { class:x.hint ? 'wnw-hint' : '' }, x.t)).concat(btns.extra || []));
    const done = v => { Overlay.close(); res(v); };
    Overlay.open(title, box, btns.list.map((b, i) => h('button', { class:'wnw-btn' + (i === btns.list.length - 1 ? ' primary' : ''),
      onclick:() => done(b[1]) }, b[0])), btns.opt);
  });
}
/* ---------- 挑东西的两个框：一条待办 / 一处正文都要用，两处共用一份 ----------
   约定：都是「勾一批 → 保存」，出口只有取消和保存两条（点框外空白关不掉）；
   已经选上的进来就是勾着的，出去的是选完那一批，不是增量。 */
/* 挑多张卡片：本书 + 公共都挑得着，标一下来自哪本 */
function multiCardPickDlg(cur, done, title){
  Cards.forBook(Work.book ? Work.book.id : '').then(ms => {
    const box = h('div', { class:'wnw-col' });
    if(!ms.length){
      box.appendChild(h('div', { class:'wnw-hint' }, '这本书还没有卡片，先建一张再来挂'));
      Overlay.open(title || '挑卡片', box, [h('button', { class:'wnw-btn primary', onclick:() => Overlay.close() }, '知道了')]);
      return;
    }
    const keep = new Set((cur || []).map(String));
    const q = h('input', { class:'wnw-input', placeholder:'找卡' });
    const list = h('div', { class:'wnw-col', style:'max-height:50vh;overflow:auto' });
    const cnt = h('span', { class:'wnw-hint' }, '');
    const draw = () => {
      list.innerHTML = '';
      const qq = q.value.trim().toLowerCase();
      for(const m of ms.filter(x => !qq || (x.title + ' ' + chips(x.aliases)).toLowerCase().includes(qq)))
        list.appendChild(h('div', { class:'wnw-ci', onclick:() => { keep.has(m.id) ? keep.delete(m.id) : keep.add(m.id); draw(); } }, [
          h('input', { type:'checkbox', checked:keep.has(m.id), style:'pointer-events:none' }),
          h('i', { class:'d', style:'background:' + (m.color || 'var(--text-light)') }),
          h('span', { class:'nm' }, m.title),
          h('span', { style:'flex:1' }),
          h('span', { class:'wnw-hint' }, cardTypeName(m)),
          h('span', { class:'wnw-hint' }, m.bookId && m.bookId !== (Work.book && Work.book.id) ? (bookTitle(m.bookId) || '他书') : '本书')]));
      if(!list.children.length) list.appendChild(h('div', { class:'wnw-hint' }, '没有匹配的卡'));
      cnt.textContent = '已选 ' + keep.size + ' 张';
    };
    q.addEventListener('input', draw);
    box.appendChild(q); box.appendChild(list);
    box.appendChild(h('div', { class:'wnw-row' }, [cnt, h('span', { style:'flex:1' })]));
    draw();
    Overlay.open(title || '挑卡片', box, [
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消'),
      h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); done(Array.from(keep)); } }, '保存')
    ]);
  });
}
/* 图13/14：挑正文改成自由选字 —— 段里选几个字、按住鼠标拖过几段都行，不再整段打勾。
   一趟选中的收成一条关联，里面按段落拆成片段 {pid, from, to}（偏移按 p.t，和批注、痕迹同一口径）；
   收进来那一刻把选中的字抄一份存进 t，往后正文改了这条只是显示旧字，不牵动别处。
   一趟可以只选一段里的一小截，也可以跨段；跨几段就是几个片段，中间那几段整个算进去。 */
function bodyPickDlg(bookId, done, title){
  const b = Work.book;
  if(!b){ toast('先打开一本书'); return; }
  const chs = b.chs || [];
  if(!chs.length){ toast('这本书还没有章'); return; }
  const keep = [];
  const box = h('div', { class:'wnw-col' });
  const sel = h('select', { class:'wnw-input' }, chs.map((m, i) => h('option', { value:m.id, selected:i === 0 }, m.title || ('第 ' + (i + 1) + ' 章'))));
  const list = h('div', { class:'wnw-col wnw-bp-list' });
  const tip = h('span', { class:'wnw-hint' }, '');
  const got = h('div', { class:'wnw-col' });
  let order = [];         // 这一章摆出来的段：[{el, pid, text}]
  let cur = null;         // 鼠标当前这一趟选中的：{parts, text, from, to, chTitle}
  let chTitle = '';       // 当前这一章的名字，收进来时抄一条存着
  const say = () => {
    if(!cur){ tip.textContent = '在下面的正文里拖鼠标选字：段里选几个字，或按住拖过几段'; return; }
    tip.textContent = '选中 ' + cur.text.length + ' 个字 · ' +
      (cur.parts.length > 1 ? ('跨 ' + cur.parts.length + ' 段（第 ' + cur.from + ' ~ ' + cur.to + ' 段）') : ('第 ' + cur.from + ' 段'));
  };
  /* 落在哪一段：选区两端可能是文本节点，也可能是那一行本身（拖到行边上） */
  const rowOf = n => {
    if(!n) return null;
    const el = n.nodeType === 3 ? n.parentElement : n;
    return el && el.closest ? el.closest('[data-pid]') : null;
  };
  /* 段里的第几个字：文本节点的偏移直接用，行本身的偏移按行首 / 行尾算 */
  const offIn = (el, n, at) => {
    const tn = el.firstChild, len = tn ? tn.nodeValue.length : 0;
    if(tn && n === tn) return Math.max(0, Math.min(at, len));
    return at <= 0 ? 0 : len;
  };
  const readSel = () => {
    cur = null;
    const s = window.getSelection && window.getSelection();
    if(!s || s.isCollapsed || !s.rangeCount) return say();
    const rg = s.getRangeAt(0);
    const se = rowOf(rg.startContainer), ee = rowOf(rg.endContainer);
    const si = order.findIndex(x => x.el === se), ei = order.findIndex(x => x.el === ee);
    if(si < 0 || ei < 0) return say();
    const parts = [];
    for(let i = si; i <= ei; i++){
      const r = order[i];
      const a = i === si ? offIn(r.el, rg.startContainer, rg.startOffset) : 0;
      const z = i === ei ? offIn(r.el, rg.endContainer, rg.endOffset) : r.text.length;
      if(z > a) parts.push({ pid:r.pid, from:a, to:z, text:r.text.slice(a, z) });
    }
    if(!parts.length) return say();
    cur = { parts, text:parts.map(x => x.text).join('\n'), from:order[si].no, to:order[ei].no, chTitle };
    say();
  };
  const add = sl => {
    if(!sl) return false;
    const p = sl.parts, sig = linkSig({ chId:sel.value, parts:p });
    if(keep.some(x => linkSig(x) === sig)){ toast('这一处已经收过了'); return false; }
    keep.push({ chId:sel.value, chTitle:sl.chTitle, pid:p[0].pid, parts:p.map(x => ({ pid:x.pid, from:x.from, to:x.to })),
      at:Date.now(), t:cut(sl.text, 46) });
    draw(); return true;
  };
  const draw = () => {
    got.innerHTML = '';
    for(const p of keep) got.appendChild(h('div', { class:'wnw-ci', style:'padding:2px 6px', title:p.t }, [
      h('span', { class:'nm' }, cut(p.t, 34)),
      h('span', { class:'wnw-hint' }, p.parts.length > 1 ? ('跨 ' + p.parts.length + ' 段') : ''),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', onclick:() => { keep.splice(keep.indexOf(p), 1); draw(); } }, '去掉')
    ]));
    say();
  };
  const fill = async () => {
    list.innerHTML = ''; order = []; cur = null; chTitle = '';
    const cid = sel.value;
    const c = await Work.ch(cid);
    if(!c){ list.appendChild(h('div', { class:'wnw-hint' }, '这一章读不出来')); say(); return; }
    chTitle = c.title || '';
    const ps = (c.paras || []).map((p, i) => ({ p, i })).filter(x => cleanText(x.p));
    if(!ps.length){ list.appendChild(h('div', { class:'wnw-hint' }, '这一章还没有写字')); say(); return; }
    for(const x of ps){
      const t = String(x.p.t || ''), no = x.i + 1;
      const el = h('div', { class:'wnw-bp-p', 'data-pid':x.p.id, 'data-no':String(no),
        title:'双击＝整段收进来' }, t);
      list.appendChild(el);
      order.push({ el, pid:x.p.id, text:t, no });
      el.addEventListener('dblclick', () => {
        if(add({ parts:[{ pid:x.p.id, from:0, to:t.length }], text:t, chTitle, from:no, to:no })) toast('整段收了进来');
      });
    }
    say();
  };
  sel.addEventListener('change', fill);
  /* 不挂 document 的 selectionchange：浮层那三个出口里右上角「关闭」是 Overlay 自己按的，
     页脚那两颗管不到它，挂上去的耳子就摘不下来 —— 只在拖选发生的那一块上听这一件事 */
  list.addEventListener('mouseup', readSel);
  box.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [sel, h('span', { style:'flex:1' })]));
  box.appendChild(list);
  box.appendChild(h('div', { class:'wnw-row' }, [tip, h('span', { style:'flex:1' }),
    h('button', { class:'wnw-btn mini', onclick:() => { readSel(); if(add(cur)) toast('收了进来'); } }, '收进关联')]));
  box.appendChild(got);
  draw(); fill();
  Overlay.open(title || '挑正文', box, [
    h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消'),
    h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); done(keep.slice()); } }, '保存')
  ]);
}
/* 建卡那一档大家共用：模板 + 空白。追踪不再是卡片的一种类型 ——
   它是属性「填写方式」里的一档，在卡里的属性行上挑，这里不并排单独的按钮 */
async function cardCreateDlg(opt){
  await Cards.loadTpls();
  const box = h('div', { class:'wnw-col' });
  const name = h('input', { class:'wnw-input', placeholder:'卡的名字，比如「沈砚」', style:'width:100%' });
  if(opt && opt.prefill) name.value = opt.prefill;
  box.appendChild(name);
  const grid = h('div', { class:'wnw-grid-pick' });
  const btns = [];
  let pick = null;
  const mark = b => { btns.forEach(x => x.classList.remove('on')); b.classList.add('on'); };
  for(const t of Cards.tpls){
    const b = h('button', { class:'wnw-btn', onclick:() => { pick = t; mark(b); } }, t.name);
    btns.push(b); grid.appendChild(b);
  }
  const bl = h('button', { class:'wnw-btn', onclick:() => { pick = null; mark(bl); } }, '空白卡');
  btns.push(bl); grid.appendChild(bl);
  box.appendChild(grid);
  if(opt && opt.extra) box.appendChild(opt.extra);
  return new Promise(res => {
    Overlay.open(opt && opt.title ? opt.title : '新建卡片', box, [
      h('button', { class:'wnw-btn', onclick:() => { Overlay.close(); res(null); } }, '取消'),
      h('button', { class:'wnw-btn primary', onclick:async () => {
        const n = name.value.trim();
        if(!n){ toast('先起个名'); return; }
        const bid = opt && typeof opt.bookId === 'function' ? opt.bookId()
          : (opt && opt.bookId !== undefined ? opt.bookId : (Work.book ? Work.book.id : ''));
        const dup = await Cards.taken(n, '', bid);
        if(dup){ toast('「' + dup + '」已经占了这个名，卡片不许重名'); return; }
        Overlay.close(); res({ bid, tpl: pick, title: n });
      }}, '建卡')
    ]);
    name.focus();
  });
}
class CardView{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.c = null; }
  async boot(){
    this.c = await Cards.get(this.ctx.ref);
    if(!this.c){ this.host.appendChild(h('div', { class:'wnw-empty' }, '这张卡片不存在了')); return; }
    /* 关联行要点名别的卡，先把卡名表拿全 */
    await CardNames.sync();
    await this.draw();
    Desk.noteRecent('card', this.c.id, this.c.title);
    if(this.ctx.on) this.ctx.on('desk:cards', () => {
      this.markSaved();
      /* 别处（比如右栏「追踪」分区）勾了这条追踪属性里的待办：这一屏没在打字就把进度和勾重画一遍，
         正在打字就不动，免得把光标从字里抢走。
         图12 之外这一条从前只挡「焦点在待办那一列里」，焦点在标题格、色号格、属性那一格照样整屏重画 ——
         改名改到一半格子被换掉、光标丢了（图4 那一句「重命名失败」量到的就是这一下）。
         闸口挪到整屏：焦点在这一屏里任何一处都不重画。 */
      if(hasTrackField(this.c) && this.listBox && !this.host.contains(document.activeElement)) this.draw();
    });
    /* 图12：模板那头把结构重排了（改名、换填写方式、增删属性、挪次序），这一屏手里那份已经是旧的。
       不重读的话下次一打字就把对齐好的又盖回旧的；正在这一屏里打字就先在底下说一句，切走再回来自然按新的排。 */
    if(this.ctx.on) this.ctx.on('cards:aligned', ids => {
      const id = this.c && this.c.id;
      if(Array.isArray(ids) && id && !ids.includes(id)) return;
      if(this.timer || this.host.contains(document.activeElement)){ this.foot('模板改过这张卡 · 切走再回来按新的排'); return; }
      this.reload();
    });
  }
  /* 从库里重读这一张再画一遍（模板对齐之后用） */
  async reload(){
    const c = await Cards.get(this.ctx.ref);
    if(!c) return;
    this.c = c;
    await this.draw();
    this.markSaved();
  }
  /* 立 = 当场落盘，不排队那 600 毫秒：改名那一下要是要回滚（撞名）或者要坐实（走开了），
     排在后面的写法会让人读到「名单里已经是新名、卡里还是旧名」那一小段。 */
  dirty(立){
    clearTimeout(this.timer);
    this.foot('写着…');
    const 写 = async () => {
      await Cards.put(this.c);
      await syncCardHl();
      Bus.emit('desk:cards');
      this.markSaved();
    };
    if(立){ this.timer = null; 写(); return; }
    this.timer = setTimeout(写, 600);
  }
  markSaved(){ this.foot('已保存 ' + new Date(this.c.at || Date.now()).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })); }
  foot(msg){ if(this.status) this.status.textContent = msg; }
  async draw(){
    this.host.innerHTML = '';
    const { head, body } = panelShell(this.host, '卡片', [
      h('button', { class:'wnw-btn mini w-txt', title:'加一个自定义属性', html:icoMarkup('plus') + '属性', onclick:() => this.addFieldDlg(null) }),
      h('button', { class:'wnw-btn mini', title:'把这套字段存成模板', onclick:() => Tpls.saveAs(this.c) }, '存为模板'),
      h('button', { class:'wnw-btn mini', title:'这个页面的功能', html:icoMarkup('kebab'), onclick:() => this.menu() })
    ]);
    panelTitle(head, this.titleBox());
    this.listBox = body;
    body.appendChild(this.respBox());
    body.appendChild(this.groups());
    body.appendChild(this.linksBox());
    const bb = await this.biBox();
    if(bb) body.appendChild(bb);
    this.status = h('span', { class:'wnw-hint' }, '');
    this.host.appendChild(h('div', { class:'wnw-doc-foot' }, [this.status, h('span', { style:'flex:1' }),
      h('span', { class:'wnw-hint' }, cardTypeName(this.c))]));
    this.ctx.setTitle && this.ctx.setTitle(this.c.title);
    this.markSaved();
  }
  /* ---------- 追踪属性：这一格顶上摆进度条，下面一条一行待办 ----------
     进度 = 勾了的待办 / 全部待办，当场数出来，不许手填；一条待办都没有就是 0%。
     同一份进度条两处共用一个函数（trackBarNode）：这里和右栏「追踪」分区每一条。 */
  trackBar(it){ return trackBarNode(it); }
  trackList(it){
    const box = h('div', { class:'wnw-col wnw-linklist', style:'gap:3px' });
    box.appendChild(h('div', { class:'wnw-row' }, [h('span', { class:'wnw-hint' }, '完成进度'), this.trackBar(it)]));
    const todos = trackStore(it);
    for(const t of todos) box.appendChild(this.todoRow(it, t));
    box.appendChild(h('div', { class:'wnw-row', style:'gap:8px' }, [
      h('button', { class:'wnw-btn mini w-txt', title:'加一条要追的事', html:icoMarkup('plus') + '加一项', onclick:() => {
        /* 新建的就是零条待办起步的一条空行：叫什么、追什么全由用户自己写，代码里不塞任何示例词 */
        todos.push({ id: uid('td'), text:'', done:false, lock:false, cards:[], paras:[] });
        this.dirty(); this.draw();
      }}),
      h('span', { class:'wnw-hint' }, todos.length ? todos.length + ' 条' : '还没有待办：一件要追的事加一条')
    ]));
    return box;
  }
  /* 一条待办：勾完成（也能取消）+ 这行字 + 勾上之后的锁定开关 + 这一行上的关联入口（多张卡片、多处正文） + 删这一条 */
  todoRow(it, t){
    const box = h('div', { class:'wnw-cg wnw-todo' });
    const cb = h('button', { class:'wnw-cb' + (t.done ? ' done' : ''), style:t.lock ? 'opacity:.45;cursor:not-allowed' : '',
      title:t.lock ? '这一条锁着：解锁才能改勾' : (t.done ? '取消勾选' : '完成'), 'aria-label':(t.done ? '取消勾选' : '完成'),
      html:icoMarkup(t.done ? 'check' : 'box'), onclick:() => {
        if(t.lock){ toast('这一条锁着，先解锁'); return; }
        t.done = !t.done; this.dirty(); this.draw();
      }});
    const tx = h('textarea', { class:'wnw-fv', rows:'1', placeholder:'这一条要追什么' });
    tx.value = t.text || '';
    requestAnimationFrame(() => grow(tx));
    tx.addEventListener('input', () => { grow(tx); t.text = tx.value; this.dirty(); });
    tx.addEventListener('blur', () => { if(!t.text.trim()){ t.text = tx.value = tx.value.trim(); } });
    const bar = h('div', { class:'wnw-row', style:'gap:6px;align-items:flex-start;flex-wrap:nowrap' }, [
      cb, h('span', { style:'flex:1 1 auto;min-width:0' }, tx),
      /* 锁定的入口摆在勾上之后，解锁的入口就是同一个按钮改个字：锁着的一条既不能勾也不能取消 */
      (t.done || t.lock) ? h('button', { class:'wnw-btn mini' + (t.lock ? ' on' : ''),
        title:t.lock ? '解锁这一条：解锁之后才能重新勾或取消' : '锁定这一条：锁了既不能勾也不能取消',
        onclick:() => { t.lock = !t.lock; this.dirty(); this.draw(); } }, t.lock ? '解锁' : '锁定') : null,
      h('button', { class:'wnw-btn mini del', title:'删掉这一条待办', html:icoMarkup('close'), onclick:async () => {
        /* 删除一律先问一句（外18 追加）：待办、属性、组这些记录是当场落盘的，没有回收站可捞 */
        if(!await wnwAsk('删掉这条待办「' + cut(t.text || '', 40) + '」？删了没有地方放回。')) return;
        it.todos = trackStore(it).filter(x => x !== t); this.dirty(); this.draw();
      }})
    ]);
    box.appendChild(bar);
    box.appendChild(this.todoLinks(t));
    return box;
  }
  /* 待办挂的两头：多张卡片 + 多处正文。选卡片走挑选框、选正文是自由选字那一框（关联类型同一套通道），不另起炉灶；
     挂在待办上不代表卡片和正文互相认识，纯粹是「这条要追的事齐了没有」 */
  todoLinks(t){
    const wrap = h('div', { class:'wnw-col', style:'gap:2px;padding:2px 0 0 26px' });
    const redraw = () => { this.dirty(); this.draw(); };
    const names = () => t.cards.map(id => CardNames.get(id)).filter(Boolean);
    wrap.appendChild(h('div', { class:'wnw-row', style:'gap:6px;flex-wrap:wrap;align-items:center' }, [
      h('span', { class:'wnw-hint' }, '关联卡片'),
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '卡片', onclick:() => {
        multiCardPickDlg(t.cards.slice(), picked => { t.cards = picked; redraw(); });
      }}),
      h('span', { class:'wnw-hint' }, names().length ? names().join('、') : '还没挂卡片')
    ]));
    for(const id of t.cards){
      const nm = CardNames.get(id);
      wrap.appendChild(h('div', { class:'wnw-ci', style:'padding:2px 6px' }, [
        nm ? h('button', { class:'wnw-lnk', title:'打开这张卡', onclick:() => Desk.addTab('card', id) }, nm)
           : h('span', { class:'wnw-hint' }, '（卡片已删）'),
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', onclick:() => { t.cards = t.cards.filter(x => x !== id); redraw(); } }, '去掉')
      ]));
    }
    wrap.appendChild(h('div', { class:'wnw-row', style:'gap:6px;flex-wrap:wrap;align-items:center' }, [
      h('span', { class:'wnw-hint' }, '关联正文'),
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '选字', onclick:() => {
        bodyPickDlg(this.c.bookId, picked => {
          const have = new Set(t.paras.map(linkSig));
          for(const p of picked) if(!have.has(linkSig(p))) t.paras.push(p);
          redraw();
        });
      }}),
      h('span', { class:'wnw-hint' }, t.paras.length ? t.paras.length + ' 处' : '还没挂正文')
    ]));
    for(const p of t.paras){
      const n = linkParts(p).length;
      wrap.appendChild(h('div', { class:'wnw-ci', style:'padding:2px 6px', title:p.t }, [
        h('button', { class:'wnw-lnk', title:'跳到那一章', onclick:async () => {
          if(!(await Work.ch(p.chId))){ toast('那一章已经不在了'); return; }
          Desk.addTab('ch', p.chId);
        }}, (p.chTitle || '（章已删）') + ' · ' + (p.t ? cut(p.t, 20) : '')),
        n > 1 ? h('span', { class:'wnw-hint' }, '跨 ' + n + ' 段') : null,
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', onclick:() => { t.paras = t.paras.filter(x => x !== p); redraw(); } }, '去掉')
      ].filter(Boolean)));
    }
    return wrap;
  }
  /* 卡片名字：不许空、不许跟看得见的卡撞（别名也占名）。
     图4 那一句「重命名失败」量出来两件事，这一格照着改：
     ① 从前打字那一下就把新名字写进库（600 毫秒那笔），撞名要等走开才发现 —— 中间那一小段库里
        真有两张同名，而且名单和卡里那份还能对不上。现在改成：先问一句，撞名的那一笔不落盘。
     ② 撞名只报一个名字，看不出是谁占的（同书？公共卡？别本书的？）—— 现在把来路一起说。 */
  titleBox(){
    const c = this.c;
    const inp = h('input', { class:'wnw-input wnw-card-name', value:c.title });
    let last = c.title, 问 = 0;
    /* 一秒钟敲十几下，只认最后那一问的结果（早问的那一下回来得晚，不能拿它盖掉新的） */
    const 查 = async n => {
      const 号 = ++问;
      const dup = await Cards.taken(n, c.id, c.bookId);
      let 主 = '';
      if(dup){
        const m = (await Cards.all()).find(x => x.id !== c.id && (x.title === dup || (x.aliases || []).includes(dup)));
        主 = !m ? '' : !m.bookId ? '（公共卡，每本书里都看得见）'
          : m.bookId !== c.bookId ? '（在《' + (bookTitle(m.bookId) || '另一本书') + '》里）' : '';
      }
      return 号 === 问 ? { dup, 主 } : null;
    };
    inp.addEventListener('input', async () => {
      const n = inp.value.trim();
      if(!n){ this.foot('名字空着不算改名，还是「' + last + '」'); return; }
      const r = await 查(n);
      if(!r) return;
      if(r.dup){ this.foot('「' + r.dup + '」' + r.主 + '已经占了这个名，这一笔先不落盘'); return; }
      if(n === c.title){ this.ctx.setTitle && this.ctx.setTitle(n); return; }
      last = c.title = n; this.dirty(); this.ctx.setTitle && this.ctx.setTitle(n);
    });
    inp.addEventListener('blur', async () => {
      const n = inp.value.trim();
      /* 空着或者跟已落盘的那个一样：把格子摆回已落盘的那个字就行，库里本来就是它，不再写一笔（写了会把「最近改动」白白刷一次）。
         只有一种情况要当场补一下：打字那一下排的那 600 毫秒还没走 —— 走开了就是「改完了」，别把这一笔留给下一次开机。 */
      if(!n || n === last){
        inp.value = c.title = last; this.ctx.setTitle && this.ctx.setTitle(last);
        if(this.timer) this.dirty(true);
        return;
      }
      const r = await 查(n);
      if(!r) return;
      if(r.dup){ toast('「' + r.dup + '」' + r.主 + '已经占了这个名，卡片不许重名'); inp.value = c.title = last; return; }
      last = c.title = n; this.dirty(true); this.ctx.setTitle && this.ctx.setTitle(n);
    });
    inp.addEventListener('keydown', e => { if(e.key === 'Enter') inp.blur(); });
    return h('div', { class:'wnw-card-title' }, [inp]);
  }
  /* 响应度：三档全按名字全文匹配，差别只在什么时候允许亮 —— 选定哪档，下面浅色字就说哪档 */
  respBox(){
    const c = this.c;
    const seg = h('div', { class:'wnw-seg' });
    for(const [k, n] of RESP) seg.appendChild(h('button', { class:(c.resp || 'high') === k ? 'on' : '', title:RESP_TIP[k], onclick:() => {
      if(c.resp === k) return;
      c.resp = k; this.dirty(); this.draw();
    }}, n));
    return h('div', { class:'wnw-col', style:'padding:6px 0;gap:3px' }, [
      h('div', { class:'wnw-row' }, [h('span', { class:'wnw-hint' }, '响应度'), seg]),
      h('div', { class:'wnw-hint' }, RESP_TIP[c.resp || 'high']),
      this.hlBox(),
      this.occurBox()
    ]);
  }
  /* 自动高亮长什么样：和 设置·高亮 里每条规则那颗「外观」用的是同一只口（hlStyleDlg），
     只是存的对方不同 —— 这一处写到这张卡自己身上（c.st），落盘后 CardHl 那份指纹跟着变，
     正文里命中的那几字就带上这串内联样式。空着 = 跟色位，吃 hl-N 那一个标记色。 */
  hlBox(){
    const c = this.c;
    return h('div', { class:'wnw-row', style:'gap:8px;align-items:center;padding-top:2px' }, [
      h('span', { class:'wnw-hint' }, '外观'),
      h('button', { class:'wnw-btn mini' + (c.st ? ' on' : ''), title:'这张卡亮起来的那几字长什么样',
        onclick:() => hlStyleDlg({ get st(){ return c.st; }, set st(v){ c.st = v; },
          slot:(CardHl.get(c.id) || {}).slot || 1, name:c.title }, () => this.draw(), () => this.dirty(true)) },
        c.st ? '自定义' : '跟色位')
    ]);
  }
  /* 出场次数：高响应固定 ×1；中、低响应各带一个全局权重（0.1~1，步进 0.1） */
  occurBox(){
    const c = this.c;
    const box = h('div', { class:'wnw-row', style:'gap:8px;align-items:center;padding-top:2px' });
    const fill = async () => {
      box.innerHTML = '';
      const resp = c.resp || 'high';
      const key = resp === 'mid' ? 'occur.mid' : 'occur.low';
      box.appendChild(h('span', { class:'wnw-hint' }, '出场次数'));
      box.appendChild(Occur.cell(c.id, c.bookId));
      box.appendChild(h('span', { class:'wnw-hint' }, resp === 'high' ? '×1 固定' : resp === 'mid' ? '× 中权重' : '× 低权重'));
      if(resp === 'high') return;
      const w = await Occur.weights();
      const inp = h('input', { class:'wnw-input wnw-occur-w', type:'number', min:'0.1', max:'1', step:'0.1',
        value:String(resp === 'mid' ? w.mid : w.low) });
      inp.addEventListener('change', async () => {
        const v = occW(inp.value); inp.value = String(v);
        await State.set(key, v);
        await Occur.reweigh();
        fill();
      });
      box.appendChild(h('span', { class:'wnw-hint' }, '权重'));
      box.appendChild(inp);
    };
    fill();
    return box;
  }
  /* 已关联剧情：正文里右键挂上来的地方，可跳转、可解除 */
  linksBox(){
    const c = this.c;
    const list = c.links || [];
    const box = h('div', { class:'wnw-cg', style:'margin-top:10px' });
    box.appendChild(h('div', { class:'wnw-cg-h' }, [
      h('span', { class:'nm' }, '已关联剧情'), h('span', { class:'wnw-hint' }, list.length + ' 处')]));
    if(!list.length) box.appendChild(h('div', { class:'wnw-hint' }, '正文里选中字 → 右键 → 关联卡片'));
    for(const l of list.slice().sort((a, b) => b.at - a.at))
      box.appendChild(h('div', { class:'wnw-ci', title:l.text }, [
        h('i', { class:'d', style:'background:' + (l.hl ? 'var(--accent)' : 'var(--text-light)') }),
        h('span', { class:'nm' }, l.chTitle || '（章已删）'),
        h('span', { class:'wnw-hint', style:'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, l.text),
        l.bookId && l.bookId !== Work.book.id
          ? h('span', { class:'wnw-hint' }, bookTitle(l.bookId) || '他书')
          : h('button', { class:'wnw-btn mini', onclick:async () => {
              if(!(await Work.ch(l.chId))){ toast('那一章已经不在了'); return; }
              Desk.addTab('ch', l.chId);
            }}, '跳转'),
        h('button', { class:'wnw-btn mini', onclick:() => {
          c.links = (c.links || []).filter(x => x !== l); this.dirty(); this.draw();
        }}, '解除')
      ]));
    return box;
  }
  /* 别处挂过来的双向（第 21 条）：那张卡在这一条上打了「双向」，这张卡就得看得见。
     单向的不镜像 —— 挂的人自己知道，被挂的那头不必凭空多一行；所以这一格没有内容就整格不出。 */
  async biBox(){
    const c = this.c;
    /* 反面那几行（rev）是我自己挂出去的另一种写法，这里要的是别人挂给我的：
       正行、目标是我、而且标了双向 */
    const rows = (await linkRows('__ALL__')).filter(r => !r.rev && r.bi && r.to === c.id);
    if(!rows.length) return null;
    const box = h('div', { class:'wnw-cg', style:'margin-top:10px' });
    box.appendChild(h('div', { class:'wnw-cg-h' }, [
      h('span', { class:'nm' }, '别处挂过来的双向'), h('span', { class:'wnw-hint' }, rows.length + ' 条')]));
    for(const r of rows)
      box.appendChild(h('div', { class:'wnw-ci', title:linkDesc(r) }, [
        h('span', { class:'wnw-chip' }, catName(catKey(r.cat))),
        h('span', { class:'nm', title:'点着看那张卡' }, r.fromTitle),
        h('span', { class:'wnw-hint', style:'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, linkDesc(r)),
        h('button', { class:'wnw-btn mini', onclick:() => Desk.addTab('card', r.from) }, '去那张卡')
      ]));
    box.appendChild(h('div', { class:'wnw-hint' }, '要改这一条，去刚才那张卡上改；改完两边跟着变'));
    return box;
  }
  menu(){
    const c = this.c;
    const box = h('div', { class:'wnw-col' });
    const sw = h('input', { type:'checkbox', checked:!c.bookId });
    sw.addEventListener('change', async () => {
      c.bookId = sw.checked ? '' : Work.book.id;
      await Cards.put(c); await syncCardHl(); Bus.emit('desk:cards');
      toast(sw.checked ? '已放到公共：每本书都读得到' : '已收回本书');
    });
    box.appendChild(h('div', { class:'wnw-hint' }, '现在记在：' + (c.bookId ? (bookTitle(c.bookId) || '本书') : '公共（所有书可见）')));
    box.appendChild(h('label', { class:'wnw-switch' }, [sw, h('span', {}, '公共卡（所有书可见）')]));
    box.appendChild(h('div', { class:'wnw-row' }, [h('span', { class:'wnw-hint' }, '标记色')].concat(COLOR_SLOTS.map(col =>
      h('button', { class:'wnw-dot' + (c.color === col ? ' on' : ''), style:'background:' + col, title:'卡片在列表和正文里的颜色',
        onclick:() => { c.color = c.color === col ? '' : col; this.dirty(); this.draw(); } })))));
    const alias = h('input', { class:'wnw-input', value:chips(c.aliases), placeholder:'顿号分开；别名也在正文里高亮' });
    alias.addEventListener('change', async () => {
      const keep = [];
      for(const a of oneLine(alias.value)){
        const dup = await Cards.taken(a, c.id, c.bookId);
        if(dup) toast('别名「' + a + '」和「' + dup + '」撞名，不收'); else keep.push(a);
      }
      c.aliases = keep; alias.value = chips(keep); this.dirty();
    });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '别名'), alias]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '标签'), tagBox(c, () => this.dirty())]));
    box.appendChild(h('i', { class:'wnw-set-sp' }));
    box.appendChild(h('div', { class:'wnw-row' }, [
      h('button', { class:'wnw-btn mini', onclick:async () => { Overlay.close(); const n = await Cards.copy(c); Bus.emit('desk:cards'); Desk.addTab('card', n.id); toast('已复制一张'); } }, '复制这张卡'),
      h('button', { class:'wnw-btn mini', onclick:() => {
        if(!confirm('删掉这张卡？')) return;
        Overlay.close(); Cards.del(c.id); Bus.emit('desk:cards'); this.ctx.close && this.ctx.close();
      }}, '删除')
    ]));
    Overlay.open('卡片设置', box);
  }
  groups(){
    const c = this.c;
    const list = h('div', { class:'wnw-card-groups' });
    for(const g of c.groups){
      const gb = h('div', { class:'wnw-cg' });
      const me = { kind:'grp', g };
      const nm = h('span', { class:'nm', title:'点击改属性组名', onclick:() => this.editStr('属性组名', g.name, v => { g.name = v; this.dirty(); this.draw(); }) }, g.name);
      dragHandle(nm, () => me);
      gb.appendChild(h('div', { class:'wnw-cg-h' }, [
        nm,
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', title:'在这一组里加属性', html:icoMarkup('plus'), onclick:() => this.addFieldDlg(g) }),
        h('button', { class:'wnw-btn mini', title:'删掉这一组', html:icoMarkup('close'), onclick:async () => {
          const n = (g.items || []).length;
          if(!await wnwAsk('删掉属性组「' + g.name + '」？' + (n ? '组里这 ' + n + ' 个属性和它们填的值一起没。' : '这个组是空的。'))) return;
          c.groups = c.groups.filter(x => x !== g); this.dirty(); this.draw();
        } })
      ]));
      catchDnd(gb, me, (d, pos) => this.move(d, me, pos));
      for(const it of g.items) gb.appendChild(this.fieldRow(g, it));
      if(!g.items.length) gb.appendChild(h('div', { class:'wnw-hint' }, '这一组还没有属性'));
      list.appendChild(gb);
    }
    if(!c.groups.length)
      list.appendChild(h('div', { class:'wnw-hint' }, '还没有属性'));
    list.appendChild(h('div', { class:'wnw-row', style:'margin-top:6px' }, [
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '属性组', onclick:() => this.addGroup() }),
      h('button', { class:'wnw-btn mini', title:'以这张卡为主角开一块看板', onclick:() => this.toBoard() }, '画到看板'),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini w-txt', title:'把卡片内容插到当前章末尾', html:icoMarkup('plus') + '插入本章', onclick:() => this.paste() })
    ]));
    return list;
  }
  fieldRow(g, it){
    const row = h('div', { class:'wnw-fld' });
    const me = { kind:'fld', g, it };
    const key = h('span', { class:'k', title:'点击改属性名' }, it.name);
    key.addEventListener('click', () => this.editStr('属性名', it.name, v => { it.name = v; this.dirty(); this.draw(); }));
    dragHandle(key, () => me);
    row.appendChild(key);
    row.appendChild(this.editor(it));
    row.appendChild(h('button', { class:'wnw-btn mini del', title:'删掉这个属性', html:icoMarkup('close'), onclick:async () => {
      if(!await wnwAsk('删掉属性「' + (it.name || '') + '」？这一项填进去的值跟着没。')) return;
      g.items = g.items.filter(x => x !== it); this.dirty(); this.draw();
    }}));
    return catchDnd(row, me, (d, pos) => this.move(d, me, pos));
  }
  /* 卡里拖完的账（第 19 条）：挂着模板的卡先问一句 —— 只动这张 / 连模板和同模板的卡一起 / 取消这次拖动。
     模板那边没有卡里那些内容，只有结构，所以同样的动作在模板的数组里按名字再走一遍。 */
  async move(d, tgt, pos){
    const c = this.c;
    const tpl = c.tpl ? await Cards.tpl(c.tpl) : null;
    if(tpl){
      const n = (await Cards.all()).filter(m => m.tpl === tpl.id && m.id !== c.id).length;
      const want = await askBox('要不要连模板一起改', [
        { t:'这张卡用的是模板「' + tpl.name + '」。' },
        { t:n ? '一起改的话，模板和另外 ' + n + ' 张同模板的卡跟着排。' : '一起改的话，模板跟着排（这张模板底下只有这一张卡）。', hint:1 }
      ], { list:[['取消这次拖动', 'cancel'], ['只动这张卡', 'only'], ['同时改模板', 'both']] });
      if(want === 'cancel') return;
      if(!moveTo(c.groups, d, tgt, pos)){ this.draw(); return; }
      if(want === 'both'){
        moveTo(tpl.groups, refOf(tpl.groups, d), refOf(tpl.groups, tgt), pos);
        await Cards.saveTpls();
        await syncFromTpl(tpl, 'asked');
        Bus.emit('desk:tpls');
      }
    } else if(!moveTo(c.groups, d, tgt, pos)) return;
    this.dirty(); this.draw();
  }
  editor(it){
    const type = it.type || 'text';
    if(type === 'link') return this.linkList(it);
    if(type === 'track') return this.trackList(it);
    if(type === 'text'){
      const ta = h('textarea', { class:'wnw-fv', rows:'1', placeholder:'（空）' });
      ta.value = valText(it);
      requestAnimationFrame(() => grow(ta));
      ta.addEventListener('input', () => { grow(ta); setValText(it, ta.value); this.dirty(); });
      return ta;
    }
    const box = h('div', { class:'wnw-opts' });
    const has = v => (it.values || []).includes(v);
    for(const o of (it.opts || [])){
      box.appendChild(h('button', { class:'wnw-opt' + (has(o.label) ? ' on' : ''),
        style:has(o.label) && o.color ? 'border-color:' + o.color : '',
        onclick:() => {
          if(type === 'single') it.values = has(o.label) ? [] : [o.label];
          else it.values = has(o.label) ? it.values.filter(x => x !== o.label) : (it.values || []).concat([o.label]);
          this.dirty(); this.draw();
        }}, [o.color ? h('i', { class:'dot', style:'background:' + o.color }) : null, h('span', {}, o.label)]));
    }
    box.appendChild(h('button', { class:'wnw-opt gear', title:'编辑这一项的选项和颜色', html:icoMarkup('gear'), onclick:() => this.optsDlg(it) }));
    if(type === 'single' && (it.values || []).length)
      box.appendChild(h('button', { class:'wnw-opt gear', title:'清空', html:icoMarkup('close'), onclick:async () => {
        if(!await wnwAsk('清空「' + (it.name || '') + '」这一项已经选上的值？')) return;
        it.values = []; this.dirty(); this.draw();
      } }));
    return box;
  }
  optsDlg(it){
    const box = h('div', { class:'wnw-col' });
    const rows = h('div', { class:'wnw-col' });
    const draw = () => {
      rows.innerHTML = '';
      for(const o of it.opts){
        const i = h('input', { class:'wnw-input', value:o.label });
        i.addEventListener('change', () => { o.label = i.value.trim(); this.dirty(); });
        rows.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [i].concat(
          COLOR_SLOTS.map(c => h('button', { class:'wnw-dot' + (o.color === c ? ' on' : ''), style:'background:' + c, title:'给这个选项配标记色',
            onclick:() => { o.color = o.color === c ? '' : c; draw(); } })),
          [h('button', { class:'wnw-btn mini', onclick:() => { it.opts = it.opts.filter(x => x !== o); draw(); } }, '删')])));
      }
      if(!it.opts.length) rows.appendChild(h('div', { class:'wnw-hint' }, '还没有选项'));
    };
    draw();
    box.appendChild(rows);
    Overlay.open('选项：' + it.name, box, [h('button', { class:'wnw-btn w-txt', html:icoMarkup('plus') + '选项', onclick:() => { it.opts.push({ label:'新选项', color:'' }); draw(); } }),
      h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); this.dirty(); this.draw(); } }, '好')]);
  }
  addFieldDlg(g){
    if(!this.c.groups.length) this.c.groups.push({ name:'属性', items:[] });
    const box = h('div', { class:'wnw-col' });
    const name = h('input', { class:'wnw-input', placeholder:'属性名，比如「最在意的事」' });
    const type = h('select', { class:'wnw-input', title:'填写方式：这一条属性怎么填' }, FIELD_TYPES.map(([k, n]) => h('option', { value:k }, n)));
    const gs = h('select', { class:'wnw-input' }, this.c.groups.map((x, i) => h('option', { value:i, selected:g === x }, x.name)));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '属性名'), name]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '填写方式'), type]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '放进哪组'), gs]));
    Overlay.open('加一个属性', box, [h('button', { class:'wnw-btn primary', onclick:() => {
      const nm = name.value.trim();
      if(!nm){ toast('给属性起个名'); return; }
      const t = type.value;
      /* 按类型把结构位补齐：关联带 rows、追踪带 todos（零条待办起步，不塞任何预设名字）；
         只有单选/多选才需要预置选项位 */
      this.c.groups[+gs.value].items.push({ id: uid('f'), name: nm, type: t, values: [],
        opts: (t === 'text' || t === 'link' || t === 'track') ? [] : [{ label:'选项一', color:'' }],
        rows: t === 'link' ? [] : undefined,
        todos: t === 'track' ? [] : undefined });
      Overlay.close(); this.dirty(); this.draw();
    }}, '加上')]);
    name.focus();
  }
  /* 关联属性：一行一条「这张卡 → 某张卡」，右边那一行写着关系、什么时候算、怎么来的 */
  linkList(it){
    const rows = it.rows || (it.rows = []);
    const box = h('div', { class:'wnw-col wnw-linklist', style:'gap:3px' });
    for(const r of rows){
      const gone = !CardNames.get(r.to);
      box.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap;gap:6px' }, [
        h('span', { class:'wnw-chip' }, catName(catKey(r.cat))),
        gone ? h('span', { class:'wnw-hint' }, '（目标卡已删）')
             : h('button', { class:'wnw-lnk', title:'打开「' + CardNames.get(r.to) + '」', onclick:() => Desk.addTab('card', r.to) }, CardNames.get(r.to)),
        r.bi ? h('span', { class:'wnw-chip on', title:'双向：那张卡那边也看得到这一条', html:icoMarkup('swap') + '双向' }) : null,
        h('span', { class:'wnw-hint ln', title:linkDesc(r) }, linkDesc(r)),
        h('button', { class:'wnw-btn mini', onclick:() => this.linkDlg(it, r) }, '改'),
        h('button', { class:'wnw-btn mini del', title:'删掉这条关联', html:icoMarkup('close'), onclick:async () => {
          if(!await wnwAsk('删掉这条关联？' + (gone ? '这一条指向的卡已经不存在了。' : '指向的是「' + CardNames.get(r.to) + '」。'))) return;
          it.rows = rows.filter(x => x !== r); this.dirty(); this.draw();
        }})
      ]));
    }
    box.appendChild(h('div', { class:'wnw-row', style:'gap:8px' }, [
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '关联', onclick:() => this.linkDlg(it, null) }),
      h('span', { class:'wnw-hint' }, rows.length ? rows.length + ' 条' : '还没关联别的卡片')
    ]));
    return box;
  }
  /* 挑目标卡：本书 + 公共 + 别的书都挑得到，标一下来自哪本 */
  linkPick(done){
    Cards.all().then(async ms => {
      const box = h('div', { class:'wnw-col' });
      const q = h('input', { class:'wnw-input', placeholder:'找卡' });
      const list = h('div', { class:'wnw-col', style:'max-height:50vh;overflow:auto' });
      const draw = () => {
        list.innerHTML = '';
        const qq = q.value.trim().toLowerCase();
        for(const m of ms.filter(x => x.id !== this.c.id && (!qq || String(x.title).toLowerCase().includes(qq))))
          list.appendChild(h('div', { class:'wnw-ci', onclick:async () => {
            Overlay.close(); await CardNames.sync(); done(m.id);
          }}, [
            h('i', { class:'d', style:'background:' + (m.color || 'var(--text-light)') }),
            h('span', { class:'nm' }, m.title),
            h('span', { style:'flex:1' }),
            h('span', { class:'wnw-hint' }, m.bookId && m.bookId !== Work.book.id ? (bookTitle(m.bookId) || '他书') : '本书')]));
        if(!list.children.length) list.appendChild(h('div', { class:'wnw-hint' }, '没有可关联的卡'));
      };
      q.addEventListener('input', draw); draw();
      box.appendChild(q); box.appendChild(list);
      Overlay.open('关联到哪张卡', box);
    });
  }
  /* 一条关联：目标卡 + 算哪一档 + 关系 + 起止时间 + 转移方式 */
  async linkDlg(it, old){
    await CardNames.sync();
    /* 公共卡（没记在哪本书上）就按当前开着的这本书列；一本都没开就列全部 */
    const 书 = (this.c && this.c.bookId) || (Work.book && Work.book.id) || '';
    const presets = (await State.get('bd.cal', [])) || [];
    const r = old ? JSON.parse(JSON.stringify(old))
      : { id:uid('lr'), to:'', cat:'pp', rel:'', bi:false, mode:'real', cal:null, t0:'', t1:'', way:'' };
    r.cat = catKey(r.cat);
    const box = h('div', { class:'wnw-col' });
    const draw = () => {
      box.innerHTML = '';
      const who = h('button', { class:'wnw-btn', title:'挑一张目标卡片（必须先有卡才能连）', onclick:() => this.linkPick(id => { r.to = id; draw(); }) },
        r.to ? (CardNames.get(r.to) || '这张卡已删') : '挑目标卡');
      box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '目标卡'), who]));
      /* 外32 图7：从前这行摆的是七颗档位，现在跟关系图顶上那两只下拉同一个说法 —— 主视角挑一类、关系视角挑一类。
         一条关联连的是两张卡，所以这一头关系视角只能单选；图上那一头要同时看几类，在图顶上多选。 */
      const 两头 = catSides(r.cat);
      const 挑一类 = (cur, title, set) => {
        const s = h('select', { class:'wnw-input', style:'max-width:190px', title });
        for(const [k, n] of LINK_SIDES) s.appendChild(h('option', { value:k, selected:k === cur }, n));
        s.addEventListener('change', () => { set(s.value); draw(); });
        return s;
      };
      box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '算哪一档'), h('div', { class:'wnw-row' }, [
        挑一类(两头[0], '这两头各是什么（主视角）：人 / 地 / 物 / 势力·组织·机构',
          v => { r.cat = pairKey(v, catSides(r.cat)[1]); }),
        h('span', { class:'wnw-hint' }, '对'),
        挑一类(两头[1], '关系另一头是什么（一条关联只连两张卡，这一头挑一类）',
          v => { r.cat = pairKey(catSides(r.cat)[0], v); }),
        h('span', { class:'wnw-hint', title:'这条会进哪张图 · 画法在那张图顶上挑' }, catName(r.cat))
      ])]));
      const rel = h('input', { class:'wnw-input', value:r.rel, placeholder:'比如「师徒」「上级」「持有」' });
      rel.addEventListener('input', () => { r.rel = rel.value.trim(); });
      box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '关系'), rel]));
      /* 第 21 条：双向的关系两张卡各自都看得到，画上是双箭头 */
      const bi = h('label', { class:'wnw-switch' }, [h('input', { type:'checkbox', checked:!!r.bi,
        onchange:ev => { r.bi = !!ev.target.checked; } }), h('span', {}, '双向（两张卡都看得到 · 双箭头）')]);
      box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '来不来回'), bi]));
      /* 时间：读法三档和看板时间轨一样，架空还要挑历法 */
      const ms = h('div', { class:'wnw-seg' });
      for(const [k, n] of T_MODES) ms.appendChild(h('button', { class:(r.mode || 'real') === k ? 'on' : '', onclick:() => {
        r.mode = k; if(k !== 'fake') r.cal = null; draw();
      }}, n));
      box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '时间读法'), ms]));
      if(r.mode === 'fake'){
        const pick = h('select', { class:'wnw-input' }, [h('option', { value:'' }, '默认：一年 12 个月、每月 30 天')]
          .concat(presets.map((p, i) => h('option', { value:String(i), selected:r.cal && r.cal.name === p.name }, p.name + ' · ' + p.months + '月/' + p.days))));
        pick.addEventListener('change', () => {
          const p = presets[+pick.value];
          r.cal = p ? { months:p.months, days:p.days, name:p.name } : null;
          draw();
        });
        box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '架空历法'), pick]));
      }
      const mk = (lab, key, ph) => {
        const i = h('input', { class:'wnw-input', value:r[key] || '', placeholder:ph });
        const mark = h('span', { class:'wnw-hint' });
        const chk = () => {
          const v = i.value.trim();
          if(!v){ mark.textContent = '不限'; mark.classList.remove('bad'); return; }
          const ok = linkVal(r.mode, r.cal, v, key === 't1' ? 'end' : '') !== null;
          mark.textContent = ok ? '认得出' : '认不出'; mark.classList.toggle('bad', !ok);
        };
        i.addEventListener('input', () => { r[key] = i.value.trim(); chk(); });
        /* 图17：光标一进这一格，就把这本书里看板上写过的时间列出来给你对着写。
           以内以外都不管、一个字不替你写、也不说对不对 —— 那一句归上面「认得出 / 认不出」管。 */
        TimeHint.挂(i, '看板上写过的时间', () => 看板写过的时间(书));
        chk();
        box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, lab), h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [i, mark])]));
      };
      mk('起始时间', 't0', tTip({ mode:r.mode }));
      mk('结束时间', 't1', tTip({ mode:r.mode }));
      const way = h('input', { class:'wnw-input', value:r.way, placeholder:'怎么到手的：继承 / 抢夺 / 赠予…' });
      way.addEventListener('input', () => { r.way = way.value.trim(); });
      const chips = h('div', { class:'wnw-row', style:'gap:4px;flex-wrap:wrap' },
        LINK_WAYS.map(w => h('button', { class:'wnw-btn mini', onclick:() => { way.value = r.way = w; } }, w)));
      box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '转移方式'), h('div', { class:'wnw-col', style:'gap:4px' }, [way, chips])]));
    };
    draw();
    Overlay.open(old ? '改这条关联' : '加一条关联', box, [h('button', { class:'wnw-btn primary', onclick:() => {
      if(!r.to){ toast('先挑一张目标卡'); return; }
      if(!r.rel) r.rel = catName(r.cat);
      if(old) Object.assign(old, r); else (it.rows || (it.rows = [])).push(r);
      this.dirty(); Overlay.close(); this.draw();
    }}, '存')]);
  }
  addGroup(){ this.editStr('新属性组', '新组', v => { this.c.groups.push({ name: v, items:[] }); this.dirty(); this.draw(); }); }
  editStr(title, val, done){
    const inp = h('input', { class:'wnw-input', value:val, style:'width:100%' });
    inp.addEventListener('keydown', e => { if(e.isComposing || e.keyCode === 229) return; if(e.key === 'Enter'){ const v = inp.value.trim(); if(v){ Overlay.close(); done(v); } } });
    Overlay.open(title, h('div', {}, inp), [h('button', { class:'wnw-btn primary', onclick:() => {
      const v = inp.value.trim(); if(!v) return; Overlay.close(); done(v);
    }}, '好')]);
    inp.focus(); inp.select();
  }
  paste(){
    const lines = [];
    lines.push('〔' + this.c.title + '〕');
    for(const g of this.c.groups) for(const it of g.items){ const v = valText(it); if(v) lines.push(g.name + '·' + it.name + '：' + v.replace(/\n/g, '；')); }
    const ok = ChPlug.append(lines.join('\n'), 'p');
    toast(ok ? '已把这张卡插到当前章末尾' : '先打开一章，再插卡片');
  }
  toBoard(){ Desk.newBoardFromCard(this.c); }
}
Views.reg('card', {
  name:'卡片', icon:'card', dockable:true,
  title:async (ref) => { const c = await Cards.get(ref); return c ? c.title : '卡片'; },
  render(host, ref, ctx){ new CardView(host, ctx).boot(); }
});

/* ---------- 左栏：本书 + 公共卡 ---------- */
Views.reg('panel-card', {
  name:'卡片', icon:'card', dockable:false,
  title:() => '卡片',
  render(host, ref, ctx){ new CardPanel(host, ctx).boot(); }
});
class CardPanel{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.q = ''; this.tpl = CARD_TYPE_ALL;
    /* 选中集和「连选的那一根锚点」不进门档：这一屏关了再开，不该还压着一摞挑中的卡。
       order 是这一趟摆出来的卡序（shift 连选按位置算，不按 id 算、也不按库里全部算）。 */
    this.sel = new Set(); this.anchor = null; this.order = []; }
  async boot(){ await Cards.loadTpls(); this.draw(); if(this.ctx.on) this.ctx.on('desk:cards', () => this.list()); }
  draw(){
    this.host.innerHTML = '';
    const { head, body } = panelShell(this.host, '卡片', [
      h('button', { class:'wnw-btn mini', title:'新建一张', onclick:() => this.newCard(), html:icoMarkup('plus') }),
      h('button', { class:'wnw-btn mini', title:'跨书卡片池', html:icoMarkup('pool'), onclick:() => Desk.addTab('cards', null) }),
      h('button', { class:'wnw-btn mini', title:'模板管理', onclick:() => Desk.addTab('tpls', null) }, '模板'),
      h('button', { class:'wnw-btn mini', title:'关联出来的图 · 打开以后在这张图顶上挑主视角和关系视角', onclick:() => this.openRel(), html:icoMarkup('rel') + '关联' })
    ]);
    const sel = h('select', { class:'wnw-input' }, [h('option', { value:CARD_TYPE_ALL, selected:true }, '全部类型')]
      .concat(Cards.tpls.map(t => h('option', { value:t.id }, t.name))));
    sel.addEventListener('change', () => { this.tpl = sel.value; this.list(); });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找卡', value:this.q });
    q.addEventListener('input', () => { this.q = q.value; this.list(); });
    panelUnder(head, h('div', { class:'wnw-row', style:'padding:6px 9px 0' }, [sel, q]));
    this.listBox = pickReg(body, this);
    this.list();
  }
  async list(){
    await syncCardHl();
    const ms = (await Cards.forBook(Work.book.id)).filter(m => this.tpl === CARD_TYPE_ALL || m.tpl === this.tpl);
    const q = this.q.trim().toLowerCase();
    const hit = ms.filter(m => !q || (m.title + ' ' + chips(m.aliases) + ' ' + chips(m.tags)).toLowerCase().includes(q));
    const order = Cards.tpls.map(t => t.name);
    const byTpl = new Map();
    /* 栏内按最近改动排：先把这一趟要摆的全排好再分栏，栏里的次序就是屏幕上看到的次序，
       下面那一份 order 才有意义（shift 连选连的是这一趟显示出来的序）。 */
    for(const m of hit.sort((a, b) => b.at - a.at)){ const k = cardTypeName(m); if(!byTpl.has(k)) byTpl.set(k, []); byTpl.get(k).push(m); }
    const names = [...byTpl.keys()].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    /* 选中集跟着这一趟的筛选走：换了搜索词或类型，没摆出来的那些一并从手里清出去。
       不清的后果是「批量删除」会删到屏幕上根本没摆出来的卡。 */
    this.order = [];
    for(const n of names) for(const m of byTpl.get(n)) this.order.push(m.id);
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    this.listBox.innerHTML = '';
    if(!hit.length){ this.listBox.appendChild(h('div', { class:'wnw-hint' }, q ? '没有匹配「' + this.q + '」的卡' : '还没有卡片，点旁边的新增按钮从模板建一张')); return; }
    for(const n of names){
      this.listBox.appendChild(h('div', { class:'wnw-mini-h' }, n + ' · ' + byTpl.get(n).length));
      for(const m of byTpl.get(n)){
        /* 单击只选中，双击才开这张卡（从前是单击就开：想挑两三张一起删，只能开一张关一张）。
           双击前那两下单击会把选中收到这一张上，正好是「刚打开的就是手里这一张」，不用另做补偿。 */
        this.listBox.appendChild(h('div', { class:'wnw-ci' + (this.sel.has(m.id) ? ' sel' : ''), title:chips(m.aliases),
          onclick:ev => this.clickCard(m, ev), ondblclick:() => Desk.addTab('card', m.id),
          oncontextmenu:ev => { ev.preventDefault(); this.cardMenu(m, ev); } }, [
          h('i', { class:'d', style:'background:' + (m.color || 'var(--text-light)') }),
          h('span', { class:'nm' }, m.title),
          h('span', { style:'flex:1' }),
          Occur.cell(m.id, m.bookId),
          h('button', { class:'wnw-btn mini', title:'停靠到右栏', html:icoMarkup('dock'), onclick:ev => { ev.stopPropagation(); Desk.dockIt('card', m.id, m.title); } })
        ]));
      }
    }
  }
  /* ---------- 选中：单击一枚、Ctrl/Cmd 逐个加减、Shift 从锚点按这一趟的序连一片 ----------
     修饰键这套和书架上「书」那一档同一个口径（外15 第 6 条要的就是学一次到处能用），
     长相、结构各自留各自的：这里仍旧是一行一张的窄条，没跟着改成书架那种方块。 */
  clickCard(m, ev){
    const id = m.id, all = this.order;
    if(ev.shiftKey){
      const i = all.indexOf(this.anchor), j = all.indexOf(id);
      if(i >= 0 && j >= 0){
        this.sel.clear();
        for(let k = Math.min(i, j); k <= Math.max(i, j); k++) this.sel.add(all[k]);
        this.list(); return;
      }
    }
    if(ev.ctrlKey || ev.metaKey){
      if(this.sel.has(id)) this.sel.delete(id); else this.sel.add(id);
      this.anchor = id; this.list(); return;
    }
    this.sel.clear(); this.sel.add(id); this.anchor = id; this.list();
  }
  /* Ctrl+A 全选的是「这一屏现在摆着的这几张」，不是库里所有卡：筛着一个类型的时候按全选，
     把没显示的那些也捞进手里，下一刀批量删除就删到别的类型去了。 */
  selAll(){ this.sel = new Set(this.order); this.anchor = this.order[this.order.length - 1] || null; this.list(); }
  selNone(){ if(!this.sel.size) return; this.sel.clear(); this.anchor = null; this.list(); }
  /* 右键三条：在新标签页打开 / 在停靠打开 / 删除 —— 走的就是这一屏本来那两条走法
     （Desk.addTab('card', id) 和 Desk.dockIt('card', id, 名)），没另发明一套打开方式。
     手里挑中两张以上、且右键的就是挑中的其中一张，头顶多一条批量的。 */
  cardMenu(m, ev){
    const many = this.sel.size > 1 && this.sel.has(m.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 张 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:true } : null,
      { label:'在新标签页打开', fn:() => Desk.addTab('card', m.id) },
      { label:'在停靠打开', fn:() => Desk.dockIt('card', m.id, m.title) },
      { sep:true },
      { label:'删掉这张卡', fn:() => this.delCard(m) }
    ]);
  }
  delCard(m){
    if(!confirm('删掉「' + m.title + '」？')) return;
    /* 删除走文件里本来那一条路（Cards.del + 广播），不新写一份：广播回来的重画会顺手把它从手里清出去 */
    Cards.del(m.id); Bus.emit('desk:cards');
  }
  /* 批量删除：一次确认说清删几条、都是谁，然后逐条删 —— 不许逐条弹确认框 */
  async batchDel(){
    const ids = [...this.sel];
    const all = await Cards.all();
    const names = ids.map(id => (all.find(m => m.id === id) || {}).title).filter(Boolean);
    if(!confirm('删掉选中的 ' + ids.length + ' 张卡？正文里跟着这些卡亮起来的高亮会一起没：\n' + names.join('、'))) return;
    for(const id of ids) await Cards.del(id);
    this.sel.clear(); this.anchor = null;
    Bus.emit('desk:cards');
  }
  /* 图16：这一颗不再开小弹窗 —— 直接开一张标签页。
     外32 图7：页顶那一排八张档没了，换的是这张图顶上那两只下拉，所以这里只管「上一次那张图原样再开一次」。 */
  async openRel(){
    /* 上回那两只下拉挑出来的那一组原样再开一次；没记过就开「人」那一张（四类都看）。
       记的是老那一种两个字母的档号也认得，readRef 那一头换得过来。 */
    const 上回 = await State.get('rel.last', '');
    if(上回) Desk.addTab('relmap', 上回, null);
    else Desk.addTab(REL_PICKS[0].kind, REL_PICKS[0].ref(), null);
  }
  async newCard(){
    const r = await cardCreateDlg({ title:'新建卡片' });
    if(!r) return;
    const c = await Cards.fromTpl(r.tpl, r.bid, r.title);
    Bus.emit('desk:cards'); Desk.addTab('card', c.id);
  }
}
/* 进度条本体：卡片属性那一格「追踪」用一次，右栏「追踪」分区里每一条再用一次。
   两处同一份画法（单层、无厚边框）也同一份算法（trackProg 当场数勾了的待办），绝不留空让人填。 */
function trackBarNode(it){
  const p = trackProg(it);
  return h('div', { class:'wnw-pg-row' }, [
    h('div', { class:'wnw-pg', title:'进度 = 勾完成的待办 / 全部待办，自己数出来，不用填' },
      h('i', { style:'width:' + p.pct + '%' })),
    h('span', { class:'wnw-pg-tx' }, p.pct + '%'),
    h('span', { class:'wnw-hint' }, p.done + ' / ' + p.total + ' 条')
  ]);
}

/* ---------- 右栏「追踪」分区：所有卡里那些「追踪」属性里的待办，一条一行 ----------
   分区入口和画法照旧（Views.reg + desk:cards 订阅 + compact 精简），换的只是数据源：
   不再认卡片类型，而是汇总每张卡属性组里 type 为追踪的那几条属性。
   标签页和停靠两个入口等价，都在「＋打开内容」那本清单里列出来。
   顶上那一栏改成多选：一本书一条，另加「所有书目」那个快速全选（点它是全都要 / 全不要，不是一个真的筛选值）；
   公共卡的追踪跟着挑中的每一档一起算（公共卡每本书都看得见，老那份「只有公共」就接到这里来了）。 */
Views.reg('track', {
  name:'追踪', icon:'todo', dockable:true, compact:true, compactBelow:320,
  title:() => '追踪',
  render(host, ref, ctx){ new TrackPanel(host, ctx).boot(); }
});
const TRACK_PICK_NONE = '__NONE__';   /* 多选里一本也没挑 */
class TrackPanel{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.books = this.pickRead(); }
  /* 多选那一份选择记在这一格自己的地址上：停靠存档每本书一份，下次开停靠回到上次挑的那几本。
     存的是明文 —— 逗号串起来的书号，没记过或者全都要都留空，一个也不选记 __NONE__ */
  pickRead(){
    const ids = (Shelf.data.books || []).map(b => b.id);
    const raw = String((this.ctx && this.ctx.ref) || '');
    if(raw === TRACK_PICK_NONE) return [];
    if(!raw) return ids.slice();
    const keep = raw.split(',').filter(x => ids.includes(x));
    return keep.length ? keep : ids.slice();
  }
  pickWrite(){
    const ids = (Shelf.data.books || []).map(b => b.id);
    if(!ids.length || !this.ctx.setRef) return;
    this.ctx.setRef(this.books.length >= ids.length ? null : (this.books.length ? this.books.join(',') : TRACK_PICK_NONE));
  }
  async boot(){ await CardNames.sync(); this.draw(); if(this.ctx.on) this.ctx.on('desk:cards', () => this.list()); }
  draw(){
    this.host.innerHTML = '';
    this.compact = !!this.ctx.compact;
    const { head, body } = panelShell(this.host, '追踪', []);
    if(!this.compact){
      const bk = h('button', { class:'wnw-btn mini w-txt', onclick:() => this.pickMenu(bk) });
      this.pickBtn = bk;
      this.pickTx = h('span', {}, '');
      bk.appendChild(h('span', { html:icoMarkup('caretDown') })); bk.appendChild(this.pickTx);
      this.pickLabel();
      panelUnder(head, h('div', { class:'wnw-row', style:'padding:6px 9px 0' }, [bk]));
    } else { this.books = Work.book ? [Work.book.id] : []; this.pickBtn = this.pickTx = null; }
    this.listBox = body;
    /* 这一栏没有多选（条目上只有钉住、置顶、停靠三枚），但它也是一屏纯列表：
       光标停在这儿按 Ctrl+A，没人接管，浏览器就去全选整页文字，蓝底一片糊在追踪条目和待办上。
       关掉这一层的原生选择，上面那一栏挑书和别处照旧。 */
    body.classList.add('wnw-nosel');
    this.list();
  }
  /* 那一栏上的字：全选写「所有书目」，挑了几本就写几本，悬停看书名 */
  pickLabel(){
    if(!this.pickTx) return;
    const ids = (Shelf.data.books || []).map(b => b.id), n = this.books.filter(x => ids.includes(x)).length;
    this.pickTx.textContent = !ids.length || n >= ids.length ? '所有书目' : (n ? n + ' 本' : '一本也没挑');
    this.pickBtn.title = !ids.length || n >= ids.length ? '所有书目：每一本都看，点一下可以全都要或全不要'
      : (n ? '看这几本的追踪：' + this.books.map(x => bookTitle(x) || '（书已删）').join('、') : '一本也没挑：点这里挑几本书');
  }
  /* 多选下拉：点一行勾一行，勾完不收起，点外面才算挑完 */
  pickMenu(el){
    const books = Shelf.data.books || [], ids = books.map(b => b.id);
    const all = !!ids.length && this.books.length >= ids.length;
    const row = (label, on, fn) => ({ label: h('span', { class:'wnw-row', style:'gap:6px;align-items:center' },
      [h('span', { html:icoMarkup(on ? 'check' : 'box') }), label]), fn });
    Menu.under(el, [
      row('所有书目', all, () => { this.books = all ? [] : ids.slice(); this.pickAfter(el); }),
      { sep:true },
      ...books.map(b => row(b.title, this.books.includes(b.id),
        () => { this.books = this.books.includes(b.id) ? this.books.filter(x => x !== b.id) : this.books.concat(b.id); this.pickAfter(el); }))
    ]);
  }
  pickAfter(el){ this.pickWrite(); this.pickLabel(); this.list(); this.pickMenu(el); }
  /* 停靠这一栏里改一条待办（勾、取消、锁定、解锁都走这一条路）：这份列表快照可能过时了，
     落笔前把卡重新读一遍，待办号全局唯一，按号找落到哪条追踪上；改完照旧 Cards.put + 广播 */
  async todoEdit(cardId, todoId, fn){
    const c = await Cards.get(cardId); if(!c) return;
    for(const g of (c.groups || [])) for(const f of (g.items || [])){
      if(!isTrackField(f) || !Array.isArray(f.todos)) continue;
      const td = f.todos.find(x => x && String(x.id) === todoId);
      if(td){ if(fn(td) === false) return; await Cards.put(c); Bus.emit('desk:cards'); return; }
    }
  }
  /* 钉住 / 置顶写在这条追踪属性自己身上：跟着卡片那一份追踪存档走，改完广播一次。
     走 put 的第二个 keepAt：这一个开关不算动过卡片内容，不刷「最近改动」，
     列表里别的地儿不会因为点了一下钉住就跟着换位（外15 丙组那条副作用）。 */
  async setFlag(c, it, key, on){ it[key] = on; await Cards.put(c, true); Bus.emit('desk:cards'); }
  async list(){
    const all = await Cards.all();
    const pick = this.books;
    this.listBox.innerHTML = '';
    /* 数据源是「所有卡里类型为追踪的属性」：一张卡可能有好几条追踪，一条追踪一段；
       卡按最近改动排，卡里的属性按它自己的组次序排；挑中的那几本各算一份，公共卡跟着每一档都算在内，
       钉住的那几条不论挑没挑到都列出来；置顶的排最前（sort 稳定，其余次序不动） */
    const secs = [];
    for(const m of all.slice().sort((a, b) => b.at - a.at)){
      const c = await Cards.get(m.id); if(!c) continue;
      /* 挑中的每一档都算上公共卡（公共卡每本书都看得见）；一本也没挑的时候只有钉住的露面 */
      const hit = !!pick.length && (!m.bookId || pick.includes(m.bookId));
      for(const g of (c.groups || [])) for(const it of (g.items || []))
        if(isTrackField(it) && (hit || trackPinned(it))) secs.push({ m, it, c });
    }
    secs.sort((a, b) => (trackToped(a.it) ? 0 : 1) - (trackToped(b.it) ? 0 : 1));
    if(!secs.length){
      this.listBox.appendChild(h('div', { class:'wnw-hint' }, pick.length
        ? '还没有追踪：在任何一张卡的属性里把填写方式选成「追踪」，这里就会一条一行列出来'
        : '一本也没挑：上面那一栏挑几本书，或者点「所有书目」全都要'));
      return;
    }
    if(!pick.length) this.listBox.appendChild(h('div', { class:'wnw-hint' }, '一本也没挑：上面那一栏挑几本书；下面这几条是钉住的，每次打开都列出来'));
    for(const { m, it, c } of secs){
      const box = h('div', { class:'wnw-col wnw-track-grp', style:'gap:2px' });
      box.appendChild(h('div', { class:'wnw-row', style:'gap:6px;align-items:center;flex-wrap:nowrap' }, [
        h('button', { class:'wnw-lnk', style:'font-weight:600', title:'打开这条追踪所在的卡', onclick:() => Desk.addTab('card', m.id) }, m.title),
        h('span', { class:'wnw-chip' }, it.name),
        trackPinned(it) ? h('span', { class:'wnw-chip on', title:'钉住了：不管挑哪几本，每次打开停靠都列出来' }, '钉住') : null,
        trackToped(it) ? h('span', { class:'wnw-chip on', title:'置顶了：排在最前面' }, '置顶') : null,
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', title:trackPinned(it) ? '取消钉住：不再每次打开停靠都自动列出来' : '钉住：不管上面挑的是哪几本，每次打开停靠都自动列出这一条',
          html:icoMarkup('pin'), onclick:ev => { ev.stopPropagation(); this.setFlag(c, it, 'pin', !trackPinned(it)); } }),
        h('button', { class:'wnw-btn mini', title:trackToped(it) ? '取消置顶：不再排在最前面' : '置顶：排在最前面',
          html:icoMarkup('up'), onclick:ev => { ev.stopPropagation(); this.setFlag(c, it, 'top', !trackToped(it)); } }),
        h('button', { class:'wnw-btn mini', title:'停靠到右栏', html:icoMarkup('dock'), onclick:ev => { ev.stopPropagation(); Desk.dockIt('track', this.ctx.ref || null, '追踪'); } })
      ]));
      box.appendChild(trackBarNode(it));
      const todos = trackTodos(it);
      /* 「暂未待办」「待办都勾完了」这两句撤了：勾一下提示就多一句，这一列上下闪。
         没有待办时下面那个循环一条也不画，剩下的还是这一条追踪自己那一段，不必再单独收尾。 */
      for(const t of todos){
        /* 图19：挂了卡片或正文的待办换个样子，跟「只是摆在那、什么都没挂」的那几条分开 */
        const 有 = !!(t.cards.length || t.paras.length);
        box.appendChild(h('div', { class:'wnw-ci wnw-todo-ci' + (有 ? ' has' : ''),
          title:有 ? '这条底下挂了东西：' + (t.cards.length ? t.cards.length + ' 张卡' : '')
            + (t.cards.length && t.paras.length ? ' · ' : '') + (t.paras.length ? t.paras.length + ' 处正文' : '')
            : '这条还没挂卡片、也没写正文',
          style:'padding:2px 6px' + (t.lock ? ';opacity:.6' : ''), onclick:() => Desk.addTab('card', m.id) }, [
          h('button', { class:'wnw-cb' + (t.done ? ' done' : ''), title:t.lock ? '这一条锁着：解锁才能改勾' : (t.done ? '取消勾选' : '完成'),
            'aria-label':(t.done ? '取消勾选' : '完成'), html:icoMarkup(t.done ? 'check' : 'box'),
            onclick:async ev => { ev.stopPropagation();
              if(t.lock){ toast('这一条锁着，先解锁'); return; }
              this.todoEdit(m.id, t.id, td => { if(td.lock) return false; td.done = !td.done; });
            } }),
          h('span', { class:'nm', style:'min-width:0' }, cut(t.text || '（空待办）', 28)),
          h('span', { style:'flex:1' }),
          (t.done || t.lock) ? h('button', { class:'wnw-btn mini' + (t.lock ? ' on' : ''),
            title:t.lock ? '解锁这一条：解锁之后才能重新勾或取消' : '锁定这一条：锁了既不能勾也不能取消',
            onclick:async ev => { ev.stopPropagation(); await this.todoEdit(m.id, t.id, td => { td.lock = !td.lock; }); } }, t.lock ? '解锁' : '锁定') : null,
          h('span', { class:'wnw-hint' }, (t.cards.length || t.paras.length) ?
            ((t.cards.length ? t.cards.length + ' 卡' : '') + (t.cards.length && t.paras.length ? ' · ' : '') + (t.paras.length ? t.paras.length + ' 处' : '')) : '')
        ]));
      }
      this.listBox.appendChild(box);
    }
  }
}

/* ---------- 卡片池：跨书浏览，每张卡标自己在哪本书 ---------- */
Views.reg('cards', {
  name:'卡片池', icon:'card', dockable:true, compact:true, compactBelow:420,
  title:() => '卡片池',
  render(host, ref, ctx){ new CardPool(host, ctx).boot(); }
});
class CardPool{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.q = ''; this.book = '__ALL__'; this.tpl = CARD_TYPE_ALL;
    /* 选中集 / 锚点 / 这一趟的序：和左栏那一张同一种记法，各存各的（两块卡片池挑中的不是同一摞） */
    this.sel = new Set(); this.anchor = null; this.order = []; }
  async boot(){ await Cards.loadTpls(); this.draw(); if(this.ctx.on) this.ctx.on('desk:cards', () => this.list()); }
  draw(){
    this.host.innerHTML = '';
    /* 精简版：右栏窄的时候不收筛选条，一行一张，点开去中间放大 */
    this.compact = !!this.ctx.compact;
    const { head, body } = panelShell(this.host, '卡片池', [
      h('button', { class:'wnw-btn mini', onclick:() => this.newCard(), html:icoMarkup('plus') }),
      this.compact ? h('button', { class:'wnw-btn mini', title:'在中间开成标签', onclick:() => Desk.addTab('cards', null) }, '放大')
                   : h('button', { class:'wnw-btn mini', onclick:() => Desk.addTab('tpls', null) }, '模板')
    ]);
    if(!this.compact){
      const bk = h('select', { class:'wnw-input' }, [h('option', { value:'__ALL__', selected:true }, '所有书 + 公共'), h('option', { value:'' }, '只有公共')]
        .concat(Shelf.data.books.map(b => h('option', { value:b.id, selected:!!Work.book && b.id === Work.book.id }, b.title))));
      bk.addEventListener('change', () => { this.book = bk.value; this.list(); });
      const tp = h('select', { class:'wnw-input' }, [h('option', { value:CARD_TYPE_ALL, selected:true }, '全部类型')]
        .concat(Cards.tpls.map(t => h('option', { value:t.id }, t.name))));
      tp.addEventListener('change', () => { this.tpl = tp.value; this.list(); });
      const q = h('input', { class:'wnw-input', type:'search', placeholder:'找卡' });
      q.addEventListener('input', () => { this.q = q.value; this.list(); });
      panelUnder(head, h('div', { class:'wnw-row', style:'padding:6px 9px 0' }, [bk, tp, q]));
    }
    this.listBox = pickReg(body, this);
    this.list();
  }
  async list(){
    const all = await Cards.all();
    const q = this.q.trim().toLowerCase();
    const hit = all.filter(m =>
      (this.book === '__ALL__' || (this.book === '' ? !m.bookId : m.bookId === this.book)) &&
      (this.tpl === CARD_TYPE_ALL || m.tpl === this.tpl) &&
      (!q || (m.title + ' ' + chips(m.aliases) + ' ' + chips(m.tags)).toLowerCase().includes(q)));
    hit.sort((a, b) => b.at - a.at);
    /* 选中集跟着这一趟的筛选走：换了书、换了类型、换了搜索词，没摆出来的那些一并从手里清出去。
       order 就是下面要摆的这一串（中栏那一屏和右栏停靠那一块两种长相都从它来，两种长相挑的是同一摞）。 */
    this.order = hit.map(m => m.id);
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    this.listBox.innerHTML = '';
    if(!hit.length){ this.listBox.appendChild(h('div', { class:'wnw-hint' }, '没有符合条件的卡')); return; }
    this.listBox.appendChild(h('div', { class:'wnw-hint' }, hit.length + ' 张'));
    for(const m of hit)
      this.listBox.appendChild(this.compact
        ? h('div', { class:'wnw-ci' + (this.sel.has(m.id) ? ' sel' : ''),
            onclick:ev => this.clickCard(m, ev), ondblclick:() => Desk.addTab('card', m.id),
            oncontextmenu:ev => { ev.preventDefault(); this.cardMenu(m, ev); } }, [
            h('i', { class:'d', style:'background:' + (m.color || 'var(--text-light)') }),
            h('span', { class:'nm' }, m.title),
            h('span', { style:'flex:1' }),
            h('span', { class:'wnw-hint' }, cardTypeName(m))])
        : h('div', { class:'wnw-item' + (this.sel.has(m.id) ? ' sel' : ''), style:'flex-wrap:nowrap',
            onclick:ev => this.clickCard(m, ev), ondblclick:() => Desk.addTab('card', m.id),
            oncontextmenu:ev => { ev.preventDefault(); this.cardMenu(m, ev); } }, [
        h('i', { class:'d', style:'background:' + (m.color || 'var(--text-light)') }),
        h('span', { class:'ttl' }, m.title),
        h('span', { class:'wnw-chip' }, cardTypeName(m)),
        h('span', { class:'wnw-hint' }, m.bookId ? (bookTitle(m.bookId) || '（书已删）') : '公共'),
        Occur.cell(m.id, m.bookId),
        h('span', { style:'flex:1' }),
        h('span', { class:'wnw-hint' }, agoText(m.at))
      ]));
  }
  /* ---------- 选中这一档：和左栏那一张卡片列表同一套修饰键，两种长相（中栏那一屏 / 右栏停靠那一块）接的是同一套 ----------
     单击只换选中集，双击才做单击从前做的事（开这张卡）；Ctrl/Cmd 逐个加减；Shift 从锚点按这一趟摆出来的序连一片。 */
  clickCard(m, ev){
    const id = m.id, all = this.order;
    if(ev.shiftKey){
      const i = all.indexOf(this.anchor), j = all.indexOf(id);
      if(i >= 0 && j >= 0){
        this.sel.clear();
        for(let k = Math.min(i, j); k <= Math.max(i, j); k++) this.sel.add(all[k]);
        this.list(); return;
      }
    }
    if(ev.ctrlKey || ev.metaKey){
      if(this.sel.has(id)) this.sel.delete(id); else this.sel.add(id);
      this.anchor = id; this.list(); return;
    }
    this.sel.clear(); this.sel.add(id); this.anchor = id; this.list();
  }
  selAll(){ this.sel = new Set(this.order); this.anchor = this.order[this.order.length - 1] || null; this.list(); }
  selNone(){ if(!this.sel.size) return; this.sel.clear(); this.anchor = null; this.list(); }
  /* 右键三条：开成标签 / 停在右栏 / 删掉 —— 卡片这两种动作本来就有现成的走法（'card' 这一种 kind，ref 就是卡的 id），
     这里只是把入口从「只有那一个停靠按钮」摊到右键上。挑中两张以上且右键的就是挑中的那一张，头顶多一条批量的。 */
  cardMenu(m, ev){
    const many = this.sel.size > 1 && this.sel.has(m.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 张 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:true } : null,
      { label:'在新标签页打开', fn:() => Desk.addTab('card', m.id) },
      { label:'在停靠打开', fn:() => Desk.dockIt('card', m.id, m.title) },
      { sep:true },
      { label:'删掉这张卡', fn:() => this.delCard(m) }
    ]);
  }
  delCard(m){
    if(!confirm('删掉「' + m.title + '」？')) return;
    Cards.del(m.id); Bus.emit('desk:cards');
  }
  /* 批量删除：一次确认说清删几条、都是谁，然后逐条删 —— 不许逐条弹确认框 */
  async batchDel(){
    const ids = [...this.sel];
    const all = await Cards.all();
    const names = ids.map(id => (all.find(m => m.id === id) || {}).title).filter(Boolean);
    if(!confirm('删掉选中的 ' + ids.length + ' 张卡？正文里跟着这些卡亮起来的高亮会一起没：\n' + names.join('、'))) return;
    for(const id of ids) await Cards.del(id);
    this.sel.clear(); this.anchor = null;
    Bus.emit('desk:cards');
  }
  async newCard(){
    const which = h('select', { class:'wnw-input' }, [h('option', { value:'' }, '公共（所有书可见）')]
      .concat(Shelf.data.books.map(b => h('option', { value:b.id, selected:!!Work.book && b.id === Work.book.id }, b.title))));
    const r = await cardCreateDlg({ title:'新建卡片', bookId:() => which.value,
      extra:h('div', { class:'wnw-field' }, [h('label', {}, '归属'), which]) });
    if(!r) return;
    const c = await Cards.fromTpl(r.tpl, r.bid, r.title);
    Bus.emit('desk:cards'); Desk.addTab('card', c.id);
  }
}

/* ============================================================
   关联图：一张页看一组档（第 5 条 + 外32 图7）—— 主视角那一类东西，和关系视角挑中的那几类之间的关系
   数据来源是设定卡里那些「关联」行。顶上两排开关：
   一、主视角（单选）+ 关系视角（多选）—— 换的是这一张页在看哪一组档；
   二、画法（树 / 平铺 / 清单，每一类眼睛各记一份），
   时间读法（拟真 / 架空 / 原点，跟看板时间轨一套）加一个查看时间点 ——
   起始在这点之前、结束不在这点之后（空着的那一边不限）才算有效。
   ============================================================ */
/* 第 5 条：一张图一个门牌。只注册一个 relmap，ref 就是那两只下拉挑出来的那一组（见 selRef），
   入口列的是四个主视角（人 / 地 / 物 / 势力·组织·机构），打开以后在这张图顶上再收关系视角那一头。 */
Views.reg('relmap', {
  name:'关系图', icon:'rel', dockable:true,
  title:(ref) => { const s = readRef(ref); return selName(s.main, s.sides); },
  render(host, ref, ctx){ new RelView(host, ctx, ref).boot(); }
});
/* 给外壳和看板那两处入口用的清单：一处一份写死太容易漏，这里一份大家拿 */
const REL_PICKS = LINK_SIDES.map(([k, n]) => ({ kind:'relmap',
  ref:() => selRef(k, LINK_SIDES.map(x => x[0])), label:n + '的关系' }));
class RelView{
  constructor(host, ctx, ref){
    this.host = host; this.ctx = ctx;
    const s = readRef(ref);
    this.main = s.main; this.sides = s.sides;                 /* readRef 那一头保证了 sides 至少有一类 */
    /* 这张图的门牌（老那一种两个字母的档号也认，标签页里可能还留着） */
    this.ref = selRef(this.main, this.sides);
    this.cats = catsOf(this.main, this.sides);
  }
  async boot(){
    this.st = Object.assign({ mode:'real', at:'', cal:null, shapes:{} }, (await State.get('rel.view', null)) || {});
    this.st.shapes = this.st.shapes || {};
    await CardNames.sync();
    this.draw();
    if(this.ctx.on) this.ctx.on('desk:cards', () => this.draw());
  }
  save(){ State.set('rel.view', this.st); }
  /* 画法记在主视角名下：同一类眼睛回来还是那张画法，收一收关系视角那一头不该把画法换了 */
  get shape(){ return this.st.shapes[this.main] || shapeOf(this.main); }
  atSec(){ return linkVal(this.st.mode, this.st.cal, this.st.at); }
  /* 这条关联在查看点上算不算数：读法不一样的行不受这个点管 */
  status(r, at){
    if(at === null) return ['不限', ''];
    /* 起止都没写 = 一直算数，跟用哪套历法无关 */
    if(!r.t0 && !r.t1) return ['有效', 'on'];
    if(r.mode !== this.st.mode) return ['另一套时间', ''];
    const a = linkVal(r.mode, r.cal, r.t0), z = linkVal(r.mode, r.cal, r.t1, 'end');
    if(a !== null && at < a) return ['未到', 'off'];
    if(z !== null && at > z) return ['已过', 'off'];
    return ['有效', 'on'];
  }
  async draw(){
    this.host.innerHTML = '';
    /* 架空历法那套预设和看板共用同一份存储，每次重画现取一次，不轮询 */
    this.calPresets = (await State.get('bd.cal', [])) || [];
    const 名 = selName(this.main, this.sides);
    const { head, body } = panelShell(this.host, 名,
      [h('button', { class:'wnw-btn mini', onclick:() => this.pickBook(), title:'只看这本书，或者把所有书 + 公共卡一起看' },
        this.allBooks ? '所有书' : (Work.book ? cut(Work.book.title, 6) : '本书'))]);
    this.listBox = body;
    panelUnder(head, this.toolBar());
    /* 后插的贴着头：两只下拉要在画法那一排上面（换的是看哪一类东西，是这页最大的那一步导航） */
    panelUnder(head, this.pickBar());
    State.set('rel.last', this.ref);
    await this.list();
    this.ctx.setTitle && this.ctx.setTitle(名);
  }
  /* 外32 图7（作者：「关系标签改成两只下拉 · 主视角单选、关系视角多选 · 两边都只选人就等于只看人际关系」）：
     从前这排摆的是一串档名（一档一颗，点一颗换一张页），现在换成两只下拉。主视角挑一类，关系视角挑几类，
     挑出来的是「这一类东西和那几类之间的关系」这一组档，一张页里一起看。 */
  pickBar(){
    const bar = h('div', { class:'wnw-row', style:'padding:6px 9px 0;gap:6px;flex-wrap:wrap;align-items:center' });
    bar.appendChild(h('span', { class:'wnw-hint' }, '主视角'));
    const main = h('select', { class:'wnw-input', style:'max-width:170px', title:'这一张图从哪一类东西的眼睛看' });
    for(const [k, n] of LINK_SIDES) main.appendChild(h('option', { value:k, selected:k === this.main }, n));
    main.addEventListener('change', () => { if(main.value !== this.main) this.换挑法(main.value, this.sides); });
    bar.appendChild(main);
    const sides = h('button', { class:'wnw-btn mini',
      title:'关系另一头看哪几类（可多选）· 只挑「人」就是只看人际关系',
      onclick:() => Menu.under(sides, this.关系菜单()) });
    sides.textContent = '关系视角：' +
      (this.sides.length === LINK_SIDES.length ? '都看' : this.sides.map(sideName).join('、'));
    bar.appendChild(sides);
    this.pickBarBtn = sides;
    return bar;
  }
  /* 多选那一头：勾一类就地换一次这张单子里的对勾，单子不关 —— 关了就没人知道自己挑了几类。
     换的一律走 换挑法：门牌（ref）、这一组档（cats）、地址栏三处一起跟着走，少换一处就是两张真相。
     重开单子要等这一张页重画完：重画头一句就把这一排摘下来了，挂在摘掉的节点上量到的是全 0，
     单子会跳到整页左上角（真页面上量到的就是那一个位置）。 */
  关系菜单(){
    const 重开 = () => Menu.under(this.pickBarBtn, this.关系菜单());
    const 换 = (next) => { const 完 = this.换挑法(this.main, next); 完 && 完.then ? 完.then(重开) : 重开(); };
    return LINK_SIDES.map(([k, n]) => ({ label:n, on:this.sides.includes(k), fn:() => {
      const has = this.sides.includes(k);
      /* 至少留一类：全撤光这一张图就没头看了，那种空屏不如不让人按 —— 按了什么都不变，单子照旧开着 */
      if(has && this.sides.length === 1){ 重开(); return; }
      换(has ? this.sides.filter(x => x !== k) : this.sides.concat(k));
    } })).concat([{ sep:true }, { label:'四类都看', fn:() => 换(LINK_SIDES.map(x => x[0])) }]);
  }
  换挑法(main, sides){
    const r = selRef(main, sides);
    if(r === this.ref) return;
    this.main = main; this.sides = sortSides(sides);
    this.ref = r; this.cats = catsOf(main, sides);
    this.ctx.setRef && this.ctx.setRef(r);
    return this.draw();
  }
  pickBook(){
    this.allBooks = !this.allBooks;
    this.draw();
  }
  /* 画法 + 时间读法挤在同一条工具条上：画法在这张图顶上随时可改，改完就记在这一类眼睛名下 */
  toolBar(){
    const bar = h('div', { class:'wnw-row', style:'padding:6px 9px 0;gap:6px;flex-wrap:wrap;align-items:center' });
    bar.appendChild(h('span', { class:'wnw-hint' }, '画法'));
    const seg = h('div', { class:'wnw-seg' });
    for(const [k, n] of REL_SHAPES) seg.appendChild(h('button', { class:this.shape === k ? 'on' : '',
      title:SHAPE_TIP[k], onclick:() => { if(this.shape === k) return; this.st.shapes[this.main] = k; this.save(); this.draw(); } }, n));
    bar.appendChild(seg);
    bar.appendChild(this.timeBar());
    return bar;
  }
  timeBar(){
    const bar = h('span', { class:'wnw-row', style:'gap:6px;flex-wrap:wrap;align-items:center' });
    bar.appendChild(h('span', { class:'wnw-hint' }, '时间读法'));
    const seg = h('div', { class:'wnw-seg' });
    for(const [k, n] of T_MODES) seg.appendChild(h('button', { class:this.st.mode === k ? 'on' : '', onclick:() => {
      this.st.mode = k; if(k !== 'fake') this.st.cal = null; this.save(); this.draw();
    }}, n));
    bar.appendChild(seg);
    /* 架空要有历法才读得出 3年5月12日，预设和看板那一套共用 */
    if(this.st.mode === 'fake'){
      const pick = h('select', { class:'wnw-input', style:'max-width:170px' });
      pick.appendChild(h('option', { value:'', selected:!this.st.cal }, '默认历法：12 月 / 每月 30 天'));
      (this.calPresets || []).forEach((p, i) => pick.appendChild(h('option', { value:String(i),
        selected:!!this.st.cal && this.st.cal.name === p.name }, p.name + ' · ' + p.months + '月/' + p.days)));
      pick.addEventListener('change', () => {
        const p = (this.calPresets || [])[+pick.value];
        this.st.cal = p ? { months:p.months, days:p.days, name:p.name } : null;
        this.save(); this.draw();
      });
      bar.appendChild(h('span', { class:'wnw-hint' }, '历法')); bar.appendChild(pick);
    }
    const inp = h('input', { class:'wnw-input', value:this.st.at, placeholder:tTip({ mode:this.st.mode }), style:'max-width:210px' });
    const mark = h('span', { class:'wnw-hint' }, '查看时间');
    const chk = () => {
      const v = inp.value.trim();
      if(!v){ this.st.at = ''; this.save(); this.list(); mark.textContent = '不限时间'; mark.classList.remove('bad'); return; }
      if(linkVal(this.st.mode, this.st.cal, v) === null){ mark.textContent = '认不出'; mark.classList.add('bad'); return; }
      mark.textContent = '按这点看'; mark.classList.remove('bad');
      this.st.at = v; this.save(); this.list();
    };
    inp.addEventListener('input', chk);
    inp.addEventListener('keydown', e => { if(e.isComposing || e.keyCode === 229) return; if(e.key === 'Enter') chk(); });
    bar.appendChild(h('span', { class:'wnw-hint' }, '查看时间')); bar.appendChild(inp); bar.appendChild(mark);
    return bar;
  }
  async list(){
    const rows = await linkRows(this.allBooks ? '__ALL__' : (Work.book ? Work.book.id : '__ALL__'));
    /* 双向那一条反过来算的行只在卡片上露面，图里一条线画双向箭头就够，不占两行 */
    const set = new Set(this.cats);
    const mine = rows.filter(r => set.has(r.cat) && !r.rev);
    const at = this.atSec();
    this.listBox.innerHTML = '';
    if(!mine.length){
      this.listBox.appendChild(h('div', { class:'wnw-hint' },
        '还没有「' + selName(this.main, this.sides) + '」这一组关联：卡片里把属性的填写方式选成「关联」，加一条时挑这两头'));
      return;
    }
    const live = mine.filter(r => this.status(r, at)[1] !== 'off');
    this.listBox.appendChild(h('div', { class:'wnw-hint' },
      (at === null ? '不限时间' : '按 ' + this.st.at + ' 看') + ' · 有效 ' + live.length + ' / 共 ' + mine.length));
    if(this.shape === 'tree') this.treeList(live, at);
    else if(this.shape === 'list') this.holdList(mine, live, at);
    else this.flatList(mine, at);
  }
  /* 每一行都写：谁 → 谁、什么关系、什么时候算、怎么来的 */
  line(r, at){
    const stt = this.status(r, at);
    const gone = !CardNames.get(r.to);
    return h('div', { class:'wnw-rel-row' + (stt[1] === 'off' ? ' off' : '') }, [
      h('button', { class:'wnw-lnk', title:'打开这张卡', onclick:() => Desk.addTab('card', r.from) }, r.fromTitle),
      h('span', { class:'ar', html:linkArMarkup(r) }),
      gone ? h('span', { class:'wnw-hint' }, '（卡已删）')
           : h('button', { class:'wnw-lnk', title:'打开这张卡', onclick:() => Desk.addTab('card', r.to) }, CardNames.get(r.to)),
      h('span', { class:'wnw-chip' + (stt[1] === 'on' ? ' on' : ''), title:linkDesc(r) }, stt[0]),
      /* 这一组里同时看着几档时，行上补一句这条算哪一档（一条关系只落一档） */
      this.cats.length > 1 ? h('span', { class:'wnw-hint' }, catName(r.cat)) : null,
      h('span', { class:'wnw-hint ln', title:linkDesc(r) }, linkDesc(r)),
      this.allBooks ? h('span', { class:'wnw-hint' }, bookTitle(r.bookId) || '公共') : null
    ].filter(Boolean));
  }
  /* 平铺：按起头那张卡分堆，一行一条 */
  flatList(rows, at){
    const by = new Map();
    for(const r of rows){ const k = r.fromTitle; (by.get(k) || by.set(k, []).get(k)).push(r); }
    for(const k of [...by.keys()].sort((a, b) => a.localeCompare(b, 'zh')))
      this.listBox.appendChild(h('div', { class:'wnw-cg' }, [h('div', { class:'wnw-cg-h' }, k)]
        .concat(by.get(k).map(r => this.line(r, at)))));
  }
  /* 树：A「属于」B 就把 A 挂在 B 底下；没有上级的当根。
     只认查看点上成立的那些条，不然历史上解散过的部门还挂在架构图上。 */
  treeList(live, at){
    const parent = new Map(), kids = new Map(), nodes = new Set();
    for(const r of live){
      if(!parent.has(r.from)) parent.set(r.from, r);
      const a = kids.get(r.to) || []; a.push(r); kids.set(r.to, a);
      nodes.add(r.to); nodes.add(r.from);
    }
    const roots = [...nodes].filter(id => !parent.has(id));
    const seen = new Set();
    const put = (id, depth) => {
      if(depth > 8 || seen.has(id)) return;
      seen.add(id);
      const t = CardNames.get(id) || '（卡已删）';
      this.listBox.appendChild(h('div', { class:'wnw-rel-row', style:'padding-left:' + (depth * 18) + 'px' }, [
        depth ? h('span', { class:'ar', html:icoMarkup('caretRight') }) : null,
        h('button', { class:'wnw-lnk', onclick:() => Desk.addTab('card', id) }, t),
        depth && parent.get(id) ? h('span', { class:'wnw-hint' }, parent.get(id).rel || catName(parent.get(id).cat)) : null
      ].filter(Boolean)));
      for(const r of (kids.get(id) || []).slice().sort((x, y) => String(x.rel).localeCompare(String(y.rel), 'zh')))
        put(r.from, depth + 1);
    };
    if(!roots.length) this.listBox.appendChild(h('div', { class:'wnw-hint' }, '这些关联绕成圈了，找不到最上面那一层：' + live.length + ' 条'));
    for(const id of roots.sort((a, b) => (CardNames.get(a) || '').localeCompare(CardNames.get(b) || '', 'zh'))) put(id, 0);
    const loose = [...nodes].filter(id => !seen.has(id));
    for(const id of loose) this.listBox.appendChild(h('div', { class:'wnw-rel-row off' }, [h('span', { class:'wnw-hint' }, '在圈里：'),
      h('button', { class:'wnw-lnk', onclick:() => Desk.addTab('card', id) }, CardNames.get(id) || '（卡已删）')]));
    void at;
  }
  /* 清单：按被挂到的那张卡分堆，先看查看点上成立的那些，再按起始时间列历代 */
  holdList(rows, live, at){
    const by = new Map();
    for(const r of rows){ const k = r.to; (by.get(k) || by.set(k, []).get(k)).push(r); }
    const sec = s => { const v = linkVal(s.mode, s.cal, s.t0); return v === null ? 1e18 : v; };
    for(const id of [...by.keys()]){
      const kids = [];
      kids.push(h('div', { class:'wnw-cg-h' }, [
        h('span', { class:'nm', title:'打开这张卡', onclick:() => Desk.addTab('card', id) }, CardNames.get(id) || '（卡已删）'),
        h('span', { style:'flex:1' }),
        h('span', { class:'wnw-hint' }, by.get(id).length + ' 条')]));
      /* 当前：查看点上成立的那些持有关系；一条都不成立就写明没人持有 */
      const now = live.filter(r => r.to === id);
      if(!now.length) kids.push(h('div', { class:'wnw-rel-row off' }, [
        h('span', { class:'wnw-chip' }, '当前'),
        h('span', { class:'wnw-hint' }, (at === null ? '不限时间' : this.st.at) + '：这个点上没人持有')]));
      for(const r of now) kids.push(h('div', { class:'wnw-rel-row' }, [
        h('span', { class:'wnw-chip on' }, '当前'),
        h('button', { class:'wnw-lnk', title:'打开这张卡', onclick:() => Desk.addTab('card', r.from) }, r.fromTitle),
        h('span', { class:'wnw-hint ln' }, [r.rel || catName('inv'), r.way, (r.t0 || '不限') + ' 起'].filter(Boolean).join(' · '))]));
      /* 历代：按起始时间从早到晚，读不出的排最后 */
      kids.push(h('div', { class:'wnw-hint', style:'margin:4px 0 2px' }, '历代'));
      for(const r of by.get(id).slice().sort((x, y) => sec(x) - sec(y))) kids.push(this.line(r, at));
      this.listBox.appendChild(h('div', { class:'wnw-cg' }, kids));
    }
  }
}

/* ============================================================
   模板：用户自建，字段结构决定新建卡片长什么样
   ============================================================ */
const Tpls = {
  /* 把一张现成卡的结构存成模板：只带字段，不带内容 */
  saveAs(c){
    const box = h('div', { class:'wnw-col' });
    const name = h('input', { class:'wnw-input', value:c.tplName && c.tplName !== '空白' ? c.tplName + ' 副本' : c.title, style:'width:100%' });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '卡片类型名'), name]));
    Overlay.open('存为模板', box, [h('button', { class:'wnw-btn primary', onclick:async () => {
      const t = await Cards.newTpl(name.value.trim() || '新模板');
      /* 只带字段结构，不带内容：关联行和追踪的待办都一律清空 */
      t.groups = (c.groups || []).map(g => ({ name: g.name, items: g.items.map(f => ({ id: uid('f'), name: f.name, type: f.type,
        opts: (f.opts || []).map(o => ({ label: o.label, color: o.color })),
        rows: (f.type === 'link' ? [] : undefined),
        todos: (f.type === 'track' ? [] : undefined) })) }));
      await Cards.saveTpls();
      Overlay.close(); toast('已存成模板：' + t.name); Bus.emit('desk:tpls');
    }}, '存')]);
    name.focus();
  }
};
Views.reg('tpls', {
  name:'模板', icon:'tpl', dockable:false,
  title:() => '卡片模板',
  render(host, ref, ctx){ new TplList(host, ctx).boot(); }
});
/* 导入进来的东西一律重造一遍：号重新发，设定方式认不出的退回文本，只带结构不带内容。
   认不出来的（没有名字、没有属性组）直接丢掉，不硬塞半份结构进来。 */
function tplFromJson(raw){
  if(!raw || typeof raw.name !== 'string' || !raw.name.trim() || !Array.isArray(raw.groups)) return null;
  const kinds = FIELD_TYPES.map(x => x[0]);
  const fld = f => ({ id: uid('f'), name: String((f && f.name) || '属性').trim() || '属性',
    type: kinds.indexOf(f && f.type) >= 0 ? f.type : 'text',
    opts: (f && Array.isArray(f.opts)) ? f.opts.map(o => ({ label: String((o && o.label) || '选项'), color: (o && o.color) || '' })) : [] });
  const grp = g => ({ name: String((g && g.name) || '组').trim() || '组', items: ((g && g.items) || []).map(fld) });
  return { id: uid('tpl'), name: raw.name.trim(), icon: typeof raw.icon === 'string' ? raw.icon : 'card', groups: raw.groups.map(grp) };
}
class TplList{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; }
  async boot(){ await Cards.loadTpls(); await this.draw(); if(this.ctx.on) this.ctx.on('desk:tpls', () => this.draw()); }
  async draw(){
    this.host.innerHTML = '';
    const { body } = panelShell(this.host, '卡片模板', [
      h('button', { class:'wnw-btn mini w-txt', title:'导入：从一份模板 JSON 里挑进来', html:icoMarkup('imp') + '导入', onclick:() => this.importDlg() }),
      h('button', { class:'wnw-btn mini w-txt', title:'导出：这些模板存成一个 JSON 文件', html:icoMarkup('exp') + '导出', onclick:() => this.exportAll() }),
      h('button', { class:'wnw-btn mini', onclick:() => this.add(), html:icoMarkup('plus') })]);
    const all = await Cards.all();
    for(const t of Cards.tpls){
      const nf = all.filter(c => c.tpl === t.id).length;
      const ng = (t.groups || []).reduce((a, g) => a + g.items.length, 0);
      body.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap', onclick:() => Desk.addTab('tpl', t.id) }, [
        h('span', { class:'ttl' }, t.name),
        h('span', { class:'wnw-hint' }, (t.groups || []).length + ' 组 ' + ng + ' 属性 · 用在 ' + nf + ' 张卡'),
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', title:'只导出这一个模板', onclick:ev => { ev.stopPropagation(); this.exportOne(t); }, html:icoMarkup('exp') }),
        h('button', { class:'wnw-btn mini', onclick:async ev => { ev.stopPropagation();
          if(!confirm('删模板「' + t.name + '」？已经建出来的卡不受影响。')) return;
          await Cards.delTpl(t.id); Bus.emit('desk:tpls'); } }, '删')
      ]));
    }
    /* 出厂那六套模板 2026-10-08 按图3 撤了：一套都没有是正常起点，这一屏要说得出下一步在哪儿按 */
    if(!Cards.tpls.length) body.appendChild(h('div', { class:'wnw-hint' },
      '还没有模板。模板就是卡片类型：先定下这一类卡有哪些属性组、每条怎么填，再照着建卡。'
      + '右上角那颗「＋」建一套，或者从已有的一张卡上按「存为模板」倒过来抽一套。'));
  }
  /* ---------- 第 20 条：导出 / 导入 ----------
     导出是一份纯 JSON（页面上看得到原文，也能直接下载）；
     导入按名字对：重名可以覆盖（模板号不变，卡还挂得住），也可以另存一份加个 2。 */
  tplJson(list){
    const fld = f => ({ name:f.name, type:f.type, opts:(f.opts || []).map(o => ({ label:o.label, color:o.color })) });
    const grp = g => ({ name:g.name, items:(g.items || []).map(fld) });
    const tpl = t => ({ name:t.name, icon:t.icon, groups:(t.groups || []).map(grp) });
    return JSON.stringify({ app:'wnw-tpl', v:1, tpls:list.map(tpl) }, null, 1);
  }
  showTxt(title, txt, extra){
    Overlay.open(title, h('pre', { class:'wnw-out' }, txt), [copyBtn(txt, '复制'),
      h('button', { class:'wnw-btn', onclick:() => download(extra + '.json', txt) }, '下载')]);
  }
  exportOne(t){ this.showTxt('导出模板 · ' + t.name, this.tplJson([t]), '卡片模板 · ' + t.name); }
  exportAll(){
    if(!Cards.tpls.length){ toast('还没有模板'); return; }
    this.showTxt('导出全部模板 · ' + Cards.tpls.length + ' 个', this.tplJson(Cards.tpls), '卡片模板');
  }
  importDlg(){
    const box = h('div', { class:'wnw-col' });
    const ta = h('textarea', { class:'wnw-ta-big', style:'min-height:150px;flex:0 0 auto', placeholder:'把模板 JSON 整段粘进来，或者选文件' });
    const f = h('input', { type:'file', accept:'.json,application/json', onchange:async () => {
      const fl = f.files && f.files[0]; if(fl) ta.value = await fl.text(); } });
    const way = h('select', { class:'wnw-input' }, [
      h('option', { value:'cover' }, '重名的覆盖掉（原来那些卡接着挂）'),
      h('option', { value:'copy' }, '重名的另存一份（名字后面加 2）')]);
    box.appendChild(ta);
    box.appendChild(f);
    box.appendChild(h('div', { class:'wnw-row' }, [h('span', { class:'wnw-hint' }, '遇到同名模板'), way]));
    Overlay.open('导入模板', box, [h('button', { class:'wnw-btn primary', onclick:() => this.doImport(ta.value, way.value) }, '导入')]);
  }
  async doImport(txt, way){
    let list;
    try{ const d = JSON.parse(txt); list = Array.isArray(d) ? d : (d && d.tpls) || []; }
    catch(e){ toast('读不进来：不是 JSON'); return; }
    const inq = list.map(tplFromJson).filter(Boolean);
    if(!inq.length){ toast('里面没有认得出的模板'); return; }
    await Cards.loadTpls();
    let cover = 0, fresh = 0;
    for(const g of inq){
      const dup = Cards.tpls.find(t => t.name === g.name);
      /* 覆盖这一头故意不调 align：导进来的那份每条属性都是新发的编号（tplFromJson），
         跟卡上记着的 fid 全对不上，走对齐等于把每张卡的填过的字清空重摆。
         卡挂的还是那套模板号，名字和次序照旧能用（图12 那一句「模板号不变，卡还挂得住」还是真的）。 */
      if(dup && way === 'cover'){ dup.groups = g.groups; dup.icon = g.icon || dup.icon; cover++; continue; }
      let name = g.name, i = 2;
      while(Cards.tpls.some(t => t.name === name)) name = g.name + ' ' + (i++);
      Cards.tpls.push(Object.assign(g, { name })); fresh++;
    }
    await Cards.saveTpls();
    Overlay.close();
    Bus.emit('desk:tpls'); Bus.emit('desk:cards');
    toast('导入了 ' + (cover + fresh) + ' 个模板' + (cover && fresh ? '：' + cover + ' 个覆盖、' + fresh + ' 个新建' : cover ? '，其中覆盖 ' + cover + ' 个' : ''));
  }
  async add(){
    const inp = h('input', { class:'wnw-input', placeholder:'模板名（卡片类型名），随你自己起', style:'width:100%' });
    Overlay.open('新模板', h('div', {}, inp), [h('button', { class:'wnw-btn primary', onclick:async () => {
      const t = await Cards.newTpl(inp.value.trim());
      t.groups.push({ name:'基本', items:[{ id: uid('f'), name:'名称', type:'text', opts:[] }] });
      await Cards.saveTpls();
      Overlay.close(); Desk.addTab('tpl', t.id); Bus.emit('desk:tpls');
    }}, '建')]);
    inp.focus();
  }
}
Views.reg('tpl', {
  name:'模板编辑', icon:'tpl', dockable:false,
  title:async (ref) => { await Cards.loadTpls(); const t = await Cards.tpl(ref); return t ? '模板 · ' + t.name : '模板'; },
  render(host, ref, ctx){ new TplEdit(host, ctx).boot(ref); }
});
class TplEdit{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.t = null; }
  async boot(ref){
    await Cards.loadTpls();
    this.t = await Cards.tpl(ref);
    if(!this.t){ this.host.appendChild(h('div', { class:'wnw-empty' }, '这个模板不存在了')); return; }
    this.draw();
  }
  dirty(){ Cards.saveTpls(); Bus.emit('desk:tpls'); }
  /* 图12：模板这一头凡是动了结构（改名、换填写方式、增删属性或组、挪次序、改选项），
     都在这一处往用到它的卡上对齐一遍。以前只有拖拽排序那一条路调用 syncFromTpl，
     其余几处全漏了，卡就一直停在旧定义上。问一句那一道闸（含「以后不再问」）在 syncFromTpl 里，
     没卡要动的时候它自己返回 0，不打扰。 */
  async align(){ const n = await syncFromTpl(this.t); if(n) toast('已按新模板对齐 ' + n + ' 张卡'); }
  draw(){
    const t = this.t;
    this.host.innerHTML = '';
    const { body } = panelShell(this.host, '模板');
    body.classList.add('wnw-tplbody');
    /* 图12 那五处叫法在这里对齐：模板 = 设定类型，往下是属性组名、属性名、设定方式、具体设定 */
    body.appendChild(h('div', { class:'wnw-hint' }, '模板就是卡片类型：定下这张类型的卡片有哪些属性组、哪些属性、每个属性用什么填写方式。建卡时照着长，之后卡里改内容不回伤模板。'));
    const name = h('input', { class:'wnw-input', value:t.name, style:'font-weight:800', placeholder:'模板名 · 卡片类型名' });
    name.addEventListener('change', () => { t.name = name.value.trim() || '模板'; this.dirty(); this.ctx.setTitle && this.ctx.setTitle('模板 · ' + t.name); this.align(); });
    body.appendChild(h('div', { class:'wnw-row' }, [h('span', { class:'wnw-hint' }, '卡片类型名'), name,
      h('span', { style:'flex:1' }), h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '属性组', onclick:() => this.addGrp() })]));
    for(const g of t.groups){
      const gb = h('div', { class:'wnw-cg' });
      const me = { kind:'grp', g };
      const gn = h('input', { class:'wnw-input', value:g.name, style:'font-weight:700', placeholder:'属性组名' });
      gn.addEventListener('change', () => { g.name = gn.value.trim() || '组'; this.dirty(); this.align(); });
      /* 模板这一边组名、属性名都是能改的输入框，输入框上拖会跟选字打架：
         抓的是它左边那两个静态字（属性组名 / 属性名），不添新控件 */
      const gl = h('span', { class:'wnw-hint' }, '属性组名');
      gb.appendChild(catchDnd(h('div', { class:'wnw-cg-h' }, [dragHandle(gl, () => me), gn, h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '属性', onclick:() => this.addField(g) }),
        h('button', { class:'wnw-btn mini', title:'删这一组', html:icoMarkup('close'), onclick:async () => {
          const n = (g.items || []).length;
          /* 图12 之后这句要说实话：模板这一头删了组，卡上同一组会跟着对齐掉（问那一句时可以选只改模板） */
          if(!await wnwAsk('删掉模板里这个属性组「' + g.name + '」？'
            + (n ? '组里这 ' + n + ' 个属性定义一起没。' : '这个组是空的。')
            + '照这个模板建出来的卡会跟着对齐，那一组连里面填过的字一起删 —— 对齐前会问一句，可以选只改模板不动卡。')) return;
          t.groups = t.groups.filter(x => x !== g); this.dirty(); this.draw(); this.align();
        } })]), me, (d, pos) => this.move(d, me, pos)));
      for(const f of g.items){
        const row = h('div', { class:'wnw-fld' });
        const fm = { kind:'fld', g, it:f };
        const nm = h('input', { class:'wnw-input', value:f.name, placeholder:'属性名' });
        nm.addEventListener('change', () => { f.name = nm.value.trim() || '属性'; this.dirty(); this.align(); });
        const ty = h('select', { class:'wnw-input', title:'填写方式：这一条属性怎么填' },
          FIELD_TYPES.map(([k, n]) => h('option', { value:k, selected:f.type === k }, n)));
        ty.addEventListener('change', () => {
          f.type = ty.value;
          /* 按类型补齐结构位：关联要 rows、追踪要 todos（模板只带空结构，待办内容由各张卡自己填）；
             追踪不给选项位，其余照旧 */
          if(f.type === 'link') f.rows = [];
          if(f.type === 'track') f.todos = [];
          if(f.type !== 'text' && f.type !== 'track' && !(f.opts || []).length) f.opts = [{ label:'选项一', color:'' }];
          this.dirty(); this.draw(); this.align();
        });
        row.appendChild(dragHandle(h('span', { class:'k', style:'padding:0' }, '属性名'), () => fm));
        row.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [nm, ty]));
        row.appendChild(f.type === 'text' ? h('span', { class:'wnw-hint' }, '随便写')
          : f.type === 'link' ? h('span', { class:'wnw-hint' }, '关联到哪张卡' )
          : f.type === 'track' ? h('span', { class:'wnw-hint' }, '一条一行待办，进度勾出来' )
          : h('button', { class:'wnw-btn mini', title:'填写方式的具体选项', onclick:() => this.optsDlg(f) },
            (f.opts || []).map(o => o.label).join(' ') || '选项'));
        row.appendChild(h('button', { class:'wnw-btn mini del', title:'删掉这个属性', html:icoMarkup('close'), onclick:async () => {
          if(!await wnwAsk('删掉模板里这个属性「' + (f.name || '') + '」？'
            + '照这个模板建出来的卡会跟着对齐，那一格连填过的字一起删 —— 对齐前会问一句，可以选只改模板不动卡。')) return;
          g.items = g.items.filter(x => x !== f); this.dirty(); this.draw(); this.align();
        }}));
        gb.appendChild(catchDnd(row, fm, (d, pos) => this.move(d, fm, pos)));
      }
      catchDnd(gb, me, (d, pos) => this.move(d, me, pos));
      body.appendChild(gb);
    }
    if(!t.groups.length) body.appendChild(h('div', { class:'wnw-hint' }, '还没有属性组：右上角有个新增属性组的按钮'));
  }
  /* 模板里拖完（第 19 条 + 图12）：结构改了自动往用到这张模板的卡上对齐，第一次问一句 */
  async move(d, tgt, pos){
    if(!moveTo(this.t.groups, d, tgt, pos)) return;
    this.dirty(); this.draw();
    await this.align();
  }
  addGrp(){ this.t.groups.push({ name:'新属性组', items:[] }); this.dirty(); this.draw(); this.align(); }
  addField(g){ g.items.push({ id: uid('f'), name:'新属性', type:'text', opts:[] }); this.dirty(); this.draw(); this.align(); }
  optsDlg(f){
    const rows = h('div', { class:'wnw-col' });
    const draw = () => {
      rows.innerHTML = '';
      for(const o of f.opts){
        const i = h('input', { class:'wnw-input', value:o.label });
        i.addEventListener('change', () => { o.label = i.value.trim(); this.dirty(); });
        rows.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [i].concat(
          COLOR_SLOTS.map(c => h('button', { class:'wnw-dot' + (o.color === c ? ' on' : ''), style:'background:' + c,
            onclick:() => { o.color = o.color === c ? '' : c; draw(); } })),
          [h('button', { class:'wnw-btn mini', onclick:() => { f.opts = f.opts.filter(x => x !== o); draw(); } }, '删')])));
      }
    };
    draw();
    Overlay.open('选项：' + f.name, h('div', { class:'wnw-col' }, [rows]),
      [h('button', { class:'wnw-btn w-txt', html:icoMarkup('plus') + '选项', onclick:() => { f.opts.push({ label:'新选项', color:'' }); draw(); } }),
        h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); this.dirty(); this.draw(); this.align(); } }, '好')]);
  }
}

/* ============================================================
   灵感：Alt+Enter 快捕 + 独立灵感池 + 随机抽一条
   ============================================================ */
const InspBox = {
  /* prefill 传字符串就直接用，不传则抓当前选中的文字 */
  quick(prefill){
    const text = typeof prefill === 'string' ? prefill : String((getSelection() && getSelection().toString()) || '').trim();
    const box = h('div', { class:'wnw-col' });
    const ta = h('textarea', { class:'wnw-fv wnw-big', rows:'3', placeholder:'一句话记下。Enter 存，Shift+Enter 换行' });
    ta.value = text;
    const pin = h('input', { type:'checkbox' });
    box.appendChild(ta);
    box.appendChild(h('div', { class:'wnw-row' }, [
      h('label', { class:'wnw-switch' }, [pin, h('span', {}, '标星')]),
      h('span', { class:'wnw-hint' }, '记到：' + (Work.book ? Work.book.title : '全局')),
      h('span', { style:'flex:1' }),
      copyBtn(() => ta.value, '复制不存')]));
    const save = async () => {
      const v = ta.value.trim();
      Overlay.close();
      if(!v) return;
      const c = await Insp.add(v, Work.book ? Work.book.id : '', '快捕');
      if(pin.checked){ c.pinned = true; await Insp.put(c); }
      Bus.emit('desk:insp'); toast('已存进灵感池');
    };
    ta.addEventListener('keydown', e => {
      if(e.isComposing || e.keyCode === 229) return;
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); save(); }
    });
    Overlay.open('记一条灵感', box, [h('button', { class:'wnw-btn primary', onclick:save }, '存（Enter）')]);
    ta.focus();
  },
  async edit(meta){
    /* 列表递过来的是索引那一行，先把整条取回来：拿半份盖整条会把标签、来处弄丢 */
    const m = (await Insp.get(meta.id)) || meta;
    const box = h('div', { class:'wnw-col' });
    const ta = h('textarea', { class:'wnw-fv wnw-big', rows:'4' }); ta.value = m.text;
    const pin = h('input', { type:'checkbox', checked:!!m.pinned });
    box.appendChild(ta);
    box.appendChild(h('div', { class:'wnw-row' }, [h('label', { class:'wnw-switch' }, [pin, h('span', {}, '标星')]),
      h('span', { class:'wnw-hint' }, (m.bookId ? bookTitle(m.bookId) || '本书' : '全局') + ' · ' + agoText(m.at)),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', onclick:async () => {
        if(!await wnwAsk('删掉这条灵感？灵感没有回收站，删了捞不回来。\n' + cut(m.text, 60))) return;
        await Insp.del(m.id); Overlay.close(); Bus.emit('desk:insp');
      } }, '删除')]));
    /* 第 17 条：灵感也打那份共用的标签 */
    box.appendChild(tagBox(m, () => {}));
    Overlay.open('改这条灵感', box, [copyBtn(() => ta.value, '复制'), h('button', { class:'wnw-btn primary', onclick:async () => {
      m.text = ta.value.trim() || m.text; m.pinned = pin.checked;
      await Insp.put(m); Overlay.close(); Bus.emit('desk:insp');
    }}, '存')]);
    ta.focus();
  }
};
Views.reg('panel-insp', {
  name:'灵感', icon:'idea', dockable:false,
  title:() => '灵感',
  render(host, ref, ctx){ new InspPanel(host, ctx).boot(); }
});
class InspPanel{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.scope = 'book';
    /* 选中集 / 锚点 / 这一趟的序：灵感这一张自己存一份，和卡片那边互不相干 */
    this.sel = new Set(); this.anchor = null; this.order = []; }
  async boot(){ this.draw(); if(this.ctx.on) this.ctx.on('desk:insp', () => this.list()); }
  draw(){
    this.host.innerHTML = '';
    const { head, body } = panelShell(this.host, '灵感', [
      h('button', { class:'wnw-btn mini', title:'随机抽一条', html:icoMarkup('cycle'), onclick:() => this.random() }),
      h('button', { class:'wnw-btn mini', title:'跨书灵感池', html:icoMarkup('pool'), onclick:() => Desk.addTab('insps', null) })
    ]);
    const ta = h('textarea', { class:'wnw-fv', rows:'2', placeholder:'扔一条进来，Enter 存 · 任何地方 Alt+Enter 都能快捕' });
    ta.addEventListener('keydown', e => {
      if(e.isComposing || e.keyCode === 229) return;
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); this.add(ta); }
    });
    body.appendChild(ta);
    const seg = h('div', { class:'wnw-seg', style:'margin:6px 0' });
    for(const [k, n] of [['book', '本书'], ['all', '全部']]){
      const b = h('button', { class:this.scope === k ? 'on' : '' }, n);
      b.addEventListener('click', () => { this.scope = k; for(const x of seg.children) x.classList.remove('on'); b.classList.add('on'); this.list(); });
      seg.appendChild(b);
    }
    body.appendChild(seg);
    this.listBox = pickReg(h('div', {}), this);
    body.appendChild(this.listBox);
    panelUnder(head, h('div', { class:'wnw-hint' }, 'Alt + Enter = 快捕选中的话'));
    this.list();
  }
  async add(ta){
    const v = ta.value.trim();
    if(!v){ toast('还没写'); return; }
    await Insp.add(v, this.scope === 'book' && Work.book ? Work.book.id : '', '面板');
    ta.value = ''; grow(ta); Bus.emit('desk:insp');
  }
  async list(){
    const all = this.scope === 'book' ? await Insp.forBook(Work.book.id) : await Insp.all();
    all.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.at - a.at);
    /* 这一屏只摆前 120 条：order 记的就是这 120 条（不是池子里全部），
       Ctrl+A 和 shift 连选都只在这摆出来的一截里算。 */
    const show = all.slice(0, 120);
    /* 选中集跟着这一趟的筛选走：从「本书」换到「全部」再换回去，没摆出来的那几条要一起从手里清出去，
       不然批量删除会删到屏幕上根本没摆出来的灵感。 */
    this.order = show.map(m => m.id);
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    this.listBox.innerHTML = '';
    if(!all.length){ this.listBox.appendChild(h('div', { class:'wnw-hint' }, '还没有灵感。')); return; }
    this.listBox.appendChild(h('div', { class:'wnw-hint' }, all.length + ' 条'));
    for(const m of show)
      /* 单击只选中，双击才改这一条（从前是单击就开那张编辑浮层） */
      this.listBox.appendChild(h('div', { class:'wnw-insp' + (m.pinned ? ' pin' : '') + (this.sel.has(m.id) ? ' sel' : ''),
        title:agoText(m.at) + (m.bookId ? '' : ' · 全局'),
        onclick:ev => this.clickInsp(m, ev), ondblclick:() => this.open(m.id),
        oncontextmenu:ev => { ev.preventDefault(); this.inspMenu(m, ev); } }, [
        m.pinned ? h('span', { class:'st', html:icoMarkup('star') }) : null,
        h('span', { class:'tx' }, m.text),
        h('button', { class:'x', title:'删除', html:icoMarkup('close'), onclick:async ev => {
          ev.stopPropagation();
          if(!await wnwAsk('删掉这条灵感？灵感没有回收站，删了捞不回来。\n' + cut(m.text, 60))) return;
          Insp.del(m.id); Bus.emit('desk:insp');
        }})]));
  }
  /* ---------- 选中这一档：单击一枚、Ctrl/Cmd 逐个加减、Shift 从锚点按这一趟的序连一片 ----------
     修饰键和书架上「书」那一档、卡片那两张列表同一套口径；长相仍旧是灵感自己那一块带星的小卡，没改成谁的方块。 */
  clickInsp(m, ev){
    const id = m.id, all = this.order;
    if(ev.shiftKey){
      const i = all.indexOf(this.anchor), j = all.indexOf(id);
      if(i >= 0 && j >= 0){
        this.sel.clear();
        for(let k = Math.min(i, j); k <= Math.max(i, j); k++) this.sel.add(all[k]);
        this.list(); return;
      }
    }
    if(ev.ctrlKey || ev.metaKey){
      if(this.sel.has(id)) this.sel.delete(id); else this.sel.add(id);
      this.anchor = id; this.list(); return;
    }
    this.sel.clear(); this.sel.add(id); this.anchor = id; this.list();
  }
  selAll(){ this.sel = new Set(this.order); this.anchor = this.order[this.order.length - 1] || null; this.list(); }
  selNone(){ if(!this.sel.size) return; this.sel.clear(); this.anchor = null; this.list(); }
  /* 右键只摆讲得通的那几条：一条灵感没有「这一条自己的标签页 / 自己那一格停靠」那种内容
     （能开成一屏的只有 'card' 那一种 kind，灵感这边只有一整池 'insps'，递进去的 ref 池子根本不认，
     停靠那一档同理），硬接一条「在新标签页打开」只会开一屏没定位的池子，点了跟没点一样，比少一条更糟 ——
     所以那两条这里不摆，等哪天有一条灵感自己能开成一屏了再补。 */
  inspMenu(m, ev){
    const many = this.sel.size > 1 && this.sel.has(m.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 条 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:true } : null,
      { label:'删掉这条灵感', fn:() => this.delInsp(m) }
    ]);
  }
  delInsp(m){
    if(!confirm('删掉这条灵感？\n' + cut(m.text, 60))) return;
    /* 删除走文件里本来那一条路（Insp.del + 广播），不新写一份：广播回来的重画会顺手把它从手里清出去 */
    Insp.del(m.id); Bus.emit('desk:insp');
  }
  /* 批量删除：一次确认说清删几条、都是谁，然后逐条删 —— 不许逐条弹确认框 */
  async batchDel(){
    const ids = [...this.sel];
    const texts = [];
    for(const id of ids){ const c = await Insp.get(id); texts.push(c ? cut(c.text, 30) : '（这条已经不在了）'); }
    if(!confirm('删掉选中的 ' + ids.length + ' 条灵感？：\n' + texts.join('\n'))) return;
    for(const id of ids) await Insp.del(id);
    this.sel.clear(); this.anchor = null;
    Bus.emit('desk:insp');
  }
  async open(id){ const c = await Insp.get(id); if(c) InspBox.edit(c); }
  async random(){
    const all = this.scope === 'book' ? await Insp.forBook(Work.book.id) : await Insp.all();
    if(!all.length){ toast('灵感池是空的'); return; }
    const m = pickOne(all);
    Overlay.open('随机一条 · 池子 ' + all.length + ' 条', h('div', { class:'wnw-big-quote' }, m.text), [
      h('button', { class:'wnw-btn w-txt', html:icoMarkup('cycle') + '换一条', onclick:() => { Overlay.close(); this.random(); } }),
      copyBtn(m.text, '复制'),
      h('button', { class:'wnw-btn', onclick:() => { Overlay.close(); InspBox.edit(m); } }, '改'),
      h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close();
        toast(ChPlug.append(m.text, 'p') ? '已作为一段插到本章末尾' : '先打开一章，再插灵感'); } }, '插到本章')]);
  }
}
Views.reg('insps', {
  name:'灵感池', icon:'idea', dockable:true, compact:true, compactBelow:340,
  title:() => '灵感池',
  render(host, ref, ctx){ new InspPool(host, ctx).boot(); }
});
class InspPool{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.q = ''; this.book = '__ALL__';
    /* 选中集 / 锚点 / 这一趟的序：和左栏那一张灵感各存各的 */
    this.sel = new Set(); this.anchor = null; this.order = []; }
  async boot(){ await Shelf.load(); this.draw(); if(this.ctx.on) this.ctx.on('desk:insp', () => this.list()); }
  draw(){
    this.host.innerHTML = '';
    this.compact = !!this.ctx.compact;
    const { head, body } = panelShell(this.host, '灵感池', [h('button', { class:'wnw-btn mini', onclick:() => InspBox.quick(''), html:icoMarkup('plus') }),
      this.compact ? h('button', { class:'wnw-btn mini', title:'在中间开成标签', onclick:() => Desk.addTab('insps', null) }, '放大') : null]);
    if(!this.compact){
      const bk = h('select', { class:'wnw-input' }, [h('option', { value:'__ALL__', selected:true }, '所有书 + 全局'), h('option', { value:'' }, '只有全局')]
        .concat(Shelf.data.books.map(b => h('option', { value:b.id }, b.title))));
      bk.addEventListener('change', () => { this.book = bk.value; this.list(); });
      const q = h('input', { class:'wnw-input', type:'search', placeholder:'找灵感' });
      q.addEventListener('input', () => { this.q = q.value; this.list(); });
      panelUnder(head, h('div', { class:'wnw-row', style:'padding:6px 9px 0' }, [bk, q]));
    }
    this.listBox = pickReg(body, this);
    this.list();
  }
  async list(){
    const all = await Insp.all();
    const q = this.q.trim().toLowerCase();
    const hit = all.filter(m => (this.book === '__ALL__' || (this.book === '' ? !m.bookId : m.bookId === this.book)) &&
      (!q || String(m.text).toLowerCase().includes(q)));
    hit.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.at - a.at);
    /* 这一池只摆前 300 条：order 记的就是这 300 条（不是池子里全部），Ctrl+A 和 shift 连选都只在这摆出来的一截里算。
       选中集跟着这一趟的筛选走：换了归属范围或搜索词，没摆出来的那几条一并从手里清出去 ——
       不清的话批量删除会删到屏幕上根本没摆出来的灵感。 */
    const show = hit.slice(0, 300);
    this.order = show.map(m => m.id);
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    this.listBox.innerHTML = '';
    this.listBox.appendChild(h('div', { class:'wnw-hint' }, hit.length + ' 条 · 标星在前'));
    for(const m of show)
      /* 单击只选中，双击才改这一条（从前是单击就开那张编辑浮层）；中栏那一屏和右栏停靠那一块两种长相接的是同一套 */
      this.listBox.appendChild(this.compact
        ? h('div', { class:'wnw-ci' + (this.sel.has(m.id) ? ' sel' : ''),
            onclick:ev => this.clickInsp(m, ev), ondblclick:() => InspBox.edit(m),
            oncontextmenu:ev => { ev.preventDefault(); this.inspMenu(m, ev); } }, [
            h('span', { class:'nm' }, [m.pinned ? h('span', { class:'w-mk', title:'标过星', html:icoMarkup('star') }) : null, String(m.text).slice(0, 24)])])
        : h('div', { class:'wnw-item' + (this.sel.has(m.id) ? ' sel' : ''), style:'flex-wrap:nowrap',
            onclick:ev => this.clickInsp(m, ev), ondblclick:() => InspBox.edit(m),
            oncontextmenu:ev => { ev.preventDefault(); this.inspMenu(m, ev); } }, [
        h('span', { class:'ttl', style:'flex:1 1 60%;min-width:0;white-space:normal' }, [m.pinned ? h('span', { class:'w-mk', title:'标过星', html:icoMarkup('star') }) : null, m.text]),
        h('span', { class:'wnw-chip' }, m.bookId ? (bookTitle(m.bookId) || '（书已删）') : '全局'),
        ...(m.tags || []).map(t => h('span', { class:'wnw-chip' }, t)),
        h('span', { class:'wnw-hint' }, agoText(m.at))
      ]));
  }
  /* ---------- 选中这一档：和左栏那一张灵感同一套修饰键 ---------- */
  clickInsp(m, ev){
    const id = m.id, all = this.order;
    if(ev.shiftKey){
      const i = all.indexOf(this.anchor), j = all.indexOf(id);
      if(i >= 0 && j >= 0){
        this.sel.clear();
        for(let k = Math.min(i, j); k <= Math.max(i, j); k++) this.sel.add(all[k]);
        this.list(); return;
      }
    }
    if(ev.ctrlKey || ev.metaKey){
      if(this.sel.has(id)) this.sel.delete(id); else this.sel.add(id);
      this.anchor = id; this.list(); return;
    }
    this.sel.clear(); this.sel.add(id); this.anchor = id; this.list();
  }
  selAll(){ this.sel = new Set(this.order); this.anchor = this.order[this.order.length - 1] || null; this.list(); }
  selNone(){ if(!this.sel.size) return; this.sel.clear(); this.anchor = null; this.list(); }
  /* 右键只摆讲得通的那两条：一条灵感没有「这一条自己的标签页 / 自己那一格停靠」那种内容 ——
     能开成一屏的 kind 只有 'card'（一张卡一屏），灵感这边只有一整池 'insps'，它连传进去的 ref 都不认，
     硬接一条「在新标签页打开」只会开一屏没定位的池子，点了跟没点一样，比少一条更糟；停靠那一档同理。
     等哪天有一条灵感自己能开成一屏了，这两条再补上来。 */
  inspMenu(m, ev){
    const many = this.sel.size > 1 && this.sel.has(m.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 条 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:true } : null,
      { label:'删掉这条灵感', fn:() => this.delInsp(m) }
    ]);
  }
  delInsp(m){
    if(!confirm('删掉这条灵感？\n' + cut(m.text, 60))) return;
    /* 删除走文件里本来那一条路（Insp.del + 广播），不新写一份：广播回来的重画会顺手把它从手里清出去 */
    Insp.del(m.id); Bus.emit('desk:insp');
  }
  /* 批量删除：一次确认说清删几条、都是谁，然后逐条删 —— 不许逐条弹确认框 */
  async batchDel(){
    const ids = [...this.sel];
    const texts = [];
    for(const id of ids){ const c = await Insp.get(id); texts.push(c ? cut(c.text, 30) : '（这条已经不在了）'); }
    if(!confirm('删掉选中的 ' + ids.length + ' 条灵感？：\n' + texts.join('\n'))) return;
    for(const id of ids) await Insp.del(id);
    this.sel.clear(); this.anchor = null;
    Bus.emit('desk:insp');
  }
}
/* Alt+Enter：任何地方快捕；输入法顶屏过程中一律不拦。
   从前这一发挂在 window 上，代码一求值就生效，搬进宿主以后会在没人开为写的时候抢走全页的按键，
   所以收进容器：由 start 那趟调下来，stop 那趟随 wnwOffAll 一起摘。 */
function wnwBindQuickCapture(){
  wnwOn(wnwRoot(), 'keydown', e => {
    if(e.isComposing || e.keyCode === 229) return;
    if(e.altKey && (e.key === 'Enter' || e.code === 'NumpadEnter') && !e.ctrlKey && !e.metaKey && !e.shiftKey){ e.preventDefault(); InspBox.quick(); }
  }, true);
}

/* 灵感、卡片往外插正文，都走这个接收口：由当前章视图登记 */
const ChPlug = {
  sink:null,
  append(text, k){ return this.sink ? !!this.sink(text, k) : false; }
};

addCss(`
.wnw-pbox{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;height:100%;}
.wnw-mini-h{color:var(--accent-text,var(--accent));font-weight:800;font-size:.82em;margin:8px 0 2px;}
.wnw-ci{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:var(--r-card);cursor:pointer;}
.wnw-ci:hover{background:var(--candidate-bg);}
/* 图13/14 挑正文那一框：整行是拿鼠标拖字的，不是点的，所以要能选、行首选号走 ::before。
   行号不写进文本节点，偏移才和 p.t 一个字不错位（批注、修订痕迹指的也是 p.t）。 */
.wnw-bp-list{max-height:50vh;overflow:auto;gap:0;}
.wnw-bp-p{position:relative;padding:5px 8px 5px 30px;line-height:1.7;cursor:text;user-select:text;
  white-space:pre-wrap;border-radius:var(--r-card);}
.wnw-bp-p:hover{background:var(--candidate-bg);}
.wnw-bp-p::before{content:attr(data-no);position:absolute;left:6px;top:6px;
  color:var(--text-light);font-size:.85em;font-variant-numeric:tabular-nums;}
/* 选中那一档的取值照书架上「书」那两张卡那两条抄（w0-skin 里 .wnw-book.sel / .wnw-book-row.sel）：
   用 outline 不用 inset 的 box-shadow —— outline 不占布局，也不会被行里的色点、星标这些子孙压住，
   更不把行本来那条边框顶掉；吃 --text 不吃 --accent —— 强调色已经归「当前这本 / 标星这一条 / 悬停」，
   撞了色就分不出「开着的」和「挑中的」。
   三种长相各归各的结构，只有选中这一档统一：.wnw-ci 是左栏那一张和停靠那一块的窄行，
   .wnw-item 是中栏那一屏的一行，.wnw-insp 是灵感那一块带星的小卡。 */
.wnw-ci.sel,.wnw-item.sel,.wnw-insp.sel{outline:2px solid var(--text);outline-offset:-2px;}
.wnw-ci .nm{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-ci .d,.wnw-item .d,.wnw-opt .dot{width:8px;height:8px;border-radius:var(--r-pill,5px);flex:0 0 auto;display:inline-block;}
.wnw-item button.x{border:0;background:transparent;color:var(--text-light);cursor:pointer;}
.wnw-card-title{display:flex;gap:8px;align-items:center;flex:1 1 auto;min-width:0;}
.wnw-card-name{font-weight:800;flex:1 1 auto;min-width:60px;}
.wnw-card-groups{display:grid;gap:10px;}
/* 模板编辑器：组框之间留缝，别一个贴一个。组框进外观层的表面名单，底色归那一层画 */
.wnw-tplbody{display:grid;gap:10px;align-content:start;}
.wnw-cg{border:var(--bw) solid var(--card-border);border-radius:var(--r-card);padding:10px 12px;}
.wnw-cg-h{display:flex;gap:6px;align-items:center;margin-bottom:4px;color:var(--accent-text,var(--accent));font-weight:800;font-size:.92em;}
.wnw-cg-h .nm{cursor:pointer;}
.wnw-cg-h input{font-size:.95em;}
.wnw-fld{display:grid;grid-template-columns:6.5em minmax(0,1fr) auto auto;gap:6px;align-items:start;padding:3px 0;}
.wnw-fld > .k{font-size:.8571em;color:var(--text-light);padding-top:5px;cursor:pointer;text-align:right;}
.wnw-fld > .k:hover{color:var(--accent-text,var(--accent));}
.wnw-fld .del{opacity:0;border:0;background:transparent;color:var(--text-light);cursor:pointer;}
.wnw-fld:hover .del{opacity:1;}
/* 字段值：平时没有框，鼠标移上去才亮一条。宽度钉死 1px —— 跟着 --bw 走的话
   质感那一档是 0，悬停和聚焦那两条只改颜色不改宽度，等于一点反馈都没有 */
.wnw-fv{width:100%;font:inherit;line-height:1.7;padding:4px 8px;border-radius:var(--r-card);border:1px solid transparent;
  background:transparent;color:var(--text);resize:none;overflow:hidden;}
/* 悬停只换底，不再换边框色：空闲那条边是现算的 3:1 细边，hover 换成配色的旧值等于鼠标一放上去边就褪色。 */
.wnw-fv:hover{background:var(--input-bg);}
.wnw-fv:focus{border-color:var(--accent);background:var(--input-bg);}
.wnw-fv.wnw-big{border:1px solid var(--ctl-edge,var(--input-border));background:var(--input-bg);min-height:62px;resize:vertical;overflow:auto;}
.wnw-opts{display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding-top:2px;}
.wnw-opt{display:inline-flex;gap:4px;align-items:center;border:var(--bw) solid var(--ctl-edge,var(--input-border));background:var(--btn-bg);
  border-radius:var(--r-pill,5px);padding:2px 9px;cursor:pointer;font-size:.8571em;font-variant:inherit;color:inherit;}
.wnw-opt.on{background:var(--accent-light);border-color:var(--accent);font-weight:700;}
.wnw-opt.gear{padding:2px 7px;color:var(--text-light);}
.wnw-dot{width:9px;height:9px;border-radius:var(--r-pill,5px);display:inline-block;border:0;cursor:pointer;padding:0;}
/* 色点的选中态（描边 + 内圈 + 勾、未选中整体弱化）归共享层那一份统一语言（_shared/sh-style.js 外13-O），
   从前这里各画一份：未选中 .5、选中提到 1 再补一圈强调色影子 —— 一圈影子既当不了确认也躲不开焦点框。
   这一处只管形状尺寸，不再画状态。 */
button.wnw-dot{width:15px;height:15px;}
.wnw-insp{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:var(--r-card);border:var(--bw) solid var(--card-border);
  background:var(--card-bg);margin-bottom:5px;cursor:pointer;}
.wnw-insp:hover{border-color:var(--accent);}
.wnw-insp.pin{background:var(--accent-light);}
.wnw-insp .st{color:var(--slot-4);}
.wnw-insp .tx{flex:1 1 auto;min-width:0;white-space:pre-wrap;line-height:1.6;font-size:.92em;}
.wnw-insp .x{border:0;background:transparent;color:var(--text-light);cursor:pointer;opacity:0;}
.wnw-insp:hover .x{opacity:1;}
.wnw-big-quote{font-size:1.2em;line-height:1.9;white-space:pre-wrap;min-width:min(460px,86vw);padding:6px 2px;}
/* 出场次数：卡列表每行右侧一个数字，卡详情里同一份口径 */
.wnw-occur{flex:0 0 auto;font-variant-numeric:tabular-nums;}
/* 图19：停靠的追踪栏里，底下挂了卡片或正文的那一条待办要一眼看得出来。
   左边一条细竖杠（没挂的挂着透明同宽的，两行不会错开）+ 一点底色；不描边、不加框。 */
.wnw-todo-ci{border-left:2px solid transparent;}
.wnw-todo-ci.has{border-left-color:var(--accent);background:var(--candidate-bg);}
/* 关联：一张卡里的每一行、三张图里的每一行 */
.wnw-lnk{border:0;background:none;color:var(--accent-text,var(--accent));cursor:pointer;font:inherit;padding:0;text-decoration:underline;
  text-underline-offset:2px;text-decoration-color:var(--loaded-border);max-width:14em;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;}
.wnw-lnk:hover{text-decoration-color:var(--accent);}
.wnw-rel-row{display:flex;gap:8px;align-items:center;padding:4px 8px;border-radius:var(--r-card);min-width:0;}
.wnw-rel-row:hover{background:var(--candidate-bg);}
.wnw-rel-row.off{opacity:.45;}
.wnw-rel-row .ar{flex:0 0 auto;color:var(--text-light);font-size:.8571em;max-width:16em;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;}
.wnw-hint.ln{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* 一行里卡名和状态档先保住，挤的是后面那条长说明 */
.wnw-rel-row .wnw-lnk,.wnw-rel-row .wnw-chip{flex:0 0 auto;white-space:nowrap;}
.wnw-chip.on{background:var(--accent-light);color:var(--accent-text,var(--accent));font-weight:700;}
.wnw-occur-w{width:5.5em;flex:0 0 auto;}
.wnw-linklist{padding:2px 0;}
/* 第 19 条：能拖的那两个字挂着虚线，正被拖走的那份淡掉，接住的那格上沿或整格亮一条 */
.wnw-grip{cursor:grab;}
.wnw-grip:active{cursor:grabbing;}
/* 这三条从前少打一个空格（写成 .wnw-root.dnd-out），要求根节点自己挂着 dnd-out —— 永远不成立，
   所以卡片池、模板里那几处拖拽一直是盲投：抓起来没有淡掉、接住的那格也不亮。补上空格才落地。
   停靠那几张卡另有 sh-style.js 里作用域更窄的一版（.wnw-dock-card.dnd-*），压得过这一版，互不打架。 */
.wnw-root .dnd-out{opacity:.32;}
.wnw-root .dnd-tgt{box-shadow:inset 0 2px 0 0 var(--accent);background:var(--candidate-bg);}
.wnw-root .dnd-tgt[data-dnpos="in"]{box-shadow:inset 0 0 0 1px var(--accent);border-radius:var(--r-card);}
/* 追踪：待办进度条（单层，无厚边框）——卡片上那条「追踪」属性一格和右栏「追踪」分区两处共用同一份画法。
   进度是数出来的，条子自己按百分比填，没有任何输入口。 */
.wnw-pg-row{display:flex;gap:8px;align-items:center;flex:1 1 auto;min-width:0;}
.wnw-pg{flex:1 1 auto;min-width:48px;height:4px;border-radius:var(--r-pill,5px);background:var(--candidate-bg);overflow:hidden;}
.wnw-pg > i{display:block;height:100%;background:var(--accent);border-radius:inherit;}
.wnw-pg-tx{flex:0 0 auto;font-variant-numeric:tabular-nums;font-size:.8571em;color:var(--text-light);}
.wnw-todo{display:grid;gap:2px;padding:7px 9px;}
.wnw-track-grp{padding:6px 0 8px;border-bottom:var(--hair);}
.wnw-track-grp:last-child{border-bottom:0;}
`);
