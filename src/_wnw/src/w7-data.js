/* ============================================================
   WNW 数据层 v0.3
   书架（分组/系列）→ 一本书一条记录 → 卷 → 章 → 段落
   卡片 / 模板 / 灵感 / 笔记 / 画板 / 版本 / 词库覆盖 各自独立键
   全部放在 wnw-docs 一个库里，靠键名前缀区分类型；WNW 自己的表单状态在另一个库
   ============================================================ */
function uid(p){
  return (p || 'x') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
}
const pad2 = n => String(n).padStart(2, '0');
function todayKey(d){
  d = d || new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function nowStamp(){
  const d = new Date();
  return todayKey(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function agoText(ts){
  if(!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if(s < 60) return '刚刚';
  if(s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if(s < 86400) return Math.floor(s / 3600) + ' 小时前';
  if(s < 86400 * 8) return Math.floor(s / 86400) + ' 天前';
  return new Date(ts).toLocaleDateString('zh-CN');
}
/* 块类型：写作模式工具栏能设的都在这里 */
const BLOCKS = [
  { k:'p', name:'正文', md:'' },
  { k:'h1', name:'一级标题', md:'#' }, { k:'h2', name:'二级标题', md:'##' }, { k:'h3', name:'三级标题', md:'###' },
  { k:'h4', name:'四级标题', md:'####' }, { k:'h5', name:'五级标题', md:'#####' }, { k:'h6', name:'六级标题', md:'######' },
  { k:'ul', name:'无序列表', md:'-' }, { k:'ol', name:'有序列表', md:'1.' }, { k:'todo', name:'待办事项', md:'[]' }
];
const BLOCK_MAP = new Map(BLOCKS.map(b => [b.k, b]));
/* 中日韩区间：扩展A区 + 基本区 + 假名。用码位拼，别拿字面汉字当边界（抄错一个字整段就数不到） */
const HAN_RE = new RegExp('[' + [[0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0x3040, 0x30FF]]
  .map(r => String.fromCharCode(r[0]) + '-' + String.fromCharCode(r[1])).join('') + ']', 'g');
function countText(t){
  t = String(t || '');
  return { han: (t.match(HAN_RE) || []).length };
}
/* Word 的「字数」口径：汉字逐个算，中文标点也逐个算（他给的真值：`的的的。。。` → 6），
   连着的一串英文/数字算一个词，英文标点和空白都不算。全站字数只走这一条
   （设置里那个「只数汉字 / 非空字符」的下拉已经删了）。
   码位区间：中日韩 + 假名 + 中日韩符号标点 + 全角形式 + 常见弯引号破折省略号 + 间隔号 */
const WD_RANGES = [[0x3400, 0x4DBF], [0x4E00, 0x9FFF], [0x3040, 0x30FF],
  [0x3000, 0x303F], [0xFF01, 0xFF60], [0x2010, 0x2027], [0x00B7, 0x00B7]];
const WD_ONE = '[' + WD_RANGES.map(r => String.fromCharCode(r[0]) + '-' + String.fromCharCode(r[1])).join('') + ']';
const WORD_RE = new RegExp(WD_ONE + "|[0-9A-Za-zÀ-ɏ]+(?:['’-][0-9A-Za-zÀ-ɏ]+)*", 'g');
function wordCount(t){ return ((String(t || '').match(WORD_RE)) || []).length; }
/* 章目录里那份字数：w 是 Word 口径，老书只有 han，先照旧数着，开书时补齐 */
function chWords(m){ return typeof m.w === 'number' ? m.w : (m.han || 0); }
/* 词格那一档到底填过字没有：一格有字才算。刚切进词格时那一格空壳（fromParas 没正文给的）不算内容。 */
function lyricFilled(c){
  const ls = (c && c.lyric && c.lyric.lines) || [];
  for(const L of ls) for(const cl of (L.clauses || [])) for(const x of (cl.cells || []))
    if(String((x && x.t) || '').trim()) return true;
  return false;
}
/* 这一章认哪一档：上次用的那一档有内容就照它；那一档空着、另一档有字，就落到有字的那一档。
   写作和笔记吃的是同一份 c.paras，所以这一对只能跟着存下来的 mode 走，分不出谁"更有内容"。 */
function modeShown(k, body, lyr){
  const cur = k === 'lyric' ? 'lyric' : (k === 'note' ? 'note' : 'write');
  if(cur === 'lyric' ? lyr : body) return cur;
  if(lyr) return 'lyric';
  if(body) return cur === 'lyric' ? 'write' : cur;
  return cur;
}
/* 列表里只有目录那一份，词格填没填过读的是目录上那个 ly。老章目录上还没这个（要等下一次保存才写上），
   这时候退回信它自己存的 mode —— 不然一本正在写着的词格书，图标会先说假话。 */
function metaHasLyr(m){ return m.ly == null ? m.mode === 'lyric' : !!m.ly; }
function newPara(k, t, lv){ return { id: uid('p'), k: k || 'p', t: t || '', done: false, lv: lv > 1 ? lv : undefined }; }
function parasText(paras){ return (paras || []).map(p => p.t).join('\n'); }
function parasCount(paras){
  let han = 0, w = 0;
  for(const p of (paras || [])){
    /* 图片那段记的是文件路径，不算字数；表格里的字照算 */
    if(p.k === 'img') continue;
    const t = cleanText(p), c = countText(t);
    han += c.han; w += wordCount(t);
  }
  return { han, w };
}
/* 有字的段才算一段：空段和只放图的段不计进段落数 */
function paraCount(paras){
  let n = 0;
  for(const p of (paras || [])){
    if(p.k === 'img') continue;
    if(cleanText(p).trim()) n++;
  }
  return n;
}
/* 秒 → 1:23:45 / 12:34，顶栏计时用 */
function hms(sec){
  sec = Math.max(0, Math.floor(sec || 0));
  const s = sec % 60, m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600);
  return h ? h + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s);
}
/* 卡片/灵感/笔记上标"记在哪本书"，书架已经加载过，直接查内存里的那份 */
function bookTitle(id){
  const b = Shelf.data.books.find(x => x.id === id);
  return b ? b.title : '';
}

/* ---------- 文稿库：和表单状态同一套后端（idb → localStorage → 内存） ---------- */
const DB = {
  kv:null, mem:new Map(),
  async init(){ if(!this.kv){ const kv = await mkKv('wnw-docs', 'kv'); this.kv = kv; if(kv.kind !== 'idb') Storage.warn(kv.kind, kv.why); } return this.kv; },
  async get(k, fb){
    if(this.mem.has(k)) return this.mem.get(k);
    const kv = await this.init();
    const v = await kv.get(k);
    /* 只有库里真有这条才进缓存：把 fallback 缓存下去会盖掉后面的写入 */
    if(v !== undefined){ this.mem.set(k, v); return v; }
    return fb;
  },
  async put(k, v){
    this.mem.set(k, v);
    const kv = await this.init();
    const ok = await kv.put(k, v);
    /* 存不下去必须说清是哪一步、为什么，不然新建作品像是无声无息地卡住 */
    if(!ok) toast('这一条没存上：' + (kv.err || '本地存储写不进去') + '（现在只在页面上，导出 JSON 才能带走）');
    return ok;
  },
  async del(k){
    this.mem.delete(k);
    const kv = await this.init();
    await kv.del(k);
  },
  async keysWith(prefix){ const kv = await this.init(); return kv.keys(prefix); },
  async all(){
    const out = {};
    for(const k of await this.keysWith('')) out[k] = await this.get(k, null);
    return out;
  },
  async many(prefix, fb){
    const ks = await this.keysWith(prefix);
    const out = [];
    for(const k of ks){ const v = await this.get(k, fb); if(v) out.push(v); }
    return out;
  },
  async size(){
    const kv = await this.init();
    const ks = await kv.keys('');
    let n = 0;
    for(const k of ks) n += JSON.stringify(await this.get(k, null) || '').length;
    return { kind:kv.kind, keys:ks.length, bytes:n };
  }
};

/* ---------- 备份：整个文稿库导成一份 JSON。存储降级或换浏览器时靠这一条路 ---------- */
const Backup = {
  async dump(){
    return JSON.stringify({ app:'wnw', v:3, at:Date.now(), docs:await DB.all() }, null, 1);
  },
  async load(json){
    const d = JSON.parse(json);
    if(!d || d.app !== 'wnw' || !d.docs) throw new Error('这不是为写的备份文件');
    for(const k of Object.keys(d.docs)) await DB.put(k, d.docs[k]);
    return Object.keys(d.docs).length;
  },
  async fileName(){
    const s = await DB.size();
    return 'wnw-backup-' + todayKey() + '-' + s.keys + '条.json';
  }
};

/* ---------- 书架：分组 / 系列 / 书 ---------- */
const Shelf = {
  data:{ books:[], groups:[], series:[] }, loaded:false,
  async load(){
    if(this.loaded) return this.data;
    this.data = await DB.get('shelf', null) || { books:[], groups:[], series:[] };
    if(!Array.isArray(this.data.books)) this.data.books = [];
    if(!Array.isArray(this.data.groups)) this.data.groups = [];
    if(!Array.isArray(this.data.series)) this.data.series = [];
    /* v0.2 那本"未命名作品"是散在 tree 里的，搬成书架上的第一本书，别丢 */
    if(!this.data.books.length){
      const old = await DB.get('tree', null);
      if(old && (old.vols || old.chs)) await this.importLegacy(old);
    }
    this.loaded = true;
    return this.data;
  },
  async save(){ await DB.put('shelf', this.data); },
  async importLegacy(tree){
    const b = await this.create('未命名作品');
    const vols = (tree.vols || []).length ? tree.vols : [{ id: uid('v'), title:'第一卷' }];
    b.vols = vols.map(v => ({ id: v.id || uid('v'), title: v.title || '卷', desc: v.desc || '', collapsed:false }));
    const chs = tree.chs || [];
    for(const c of chs){
      const doc = await DB.get('ch.' + c.id, null);
      const ch = { id: c.id || uid('c'), vid: c.vid || b.vols[0].id, title: c.title || '章', mode:'write', outline:[], paras:[], annos:[], revs:[], versions:[], at: Date.now() };
      if(doc){
        ch.paras = (doc.paras || []).map(p => newPara(p.k, p.t));
        ch.title = doc.title || ch.title;
      }
      b.chs.push(ch);
      await DB.put('book.' + b.id + '.ch.' + ch.id, ch);
    }
    await this.saveBook(b);
    await DB.del('tree');
  },
  async create(title, groupId){
    const b = { id: uid('b'), title: title || '未命名作品', author:'', groupId: groupId || '', seriesId:'',
      cover:'', goal:0, vols:[], chs:[], at: Date.now(), created: Date.now(), total:0, daily:{} };
    b.vols.push({ id: uid('v'), title:'第一卷', desc:'', collapsed:false });
    const ch = { id: uid('c'), vid: b.vols[0].id, title:'第一章', mode:'write', outline:[], paras:[newPara('p','')], annos:[], revs:[], versions:[], at: Date.now() };
    b.chs.push({ id: ch.id, vid: ch.vid, title: ch.title, mode:'write', han:0, at: ch.at });
    await DB.put('book.' + b.id + '.ch.' + ch.id, ch);
    this.data.books.unshift(b);
    await this.save(); await this.saveBook(b);
    return b;
  },
  async get(id){
    const b = await DB.get('book.' + id, null);
    if(!b) return null;
    if(!Array.isArray(b.vols)) b.vols = [];
    if(!Array.isArray(b.chs)) b.chs = [];
    if(!b.daily) b.daily = {};
    return b;
  },
  async saveBook(b){ b.at = Date.now(); await DB.put('book.' + b.id, b); await this.syncMeta(b); },
  /* 列表页只要标题和字数，这些冗余存一份在 shelf 上，免得为渲染书架读光所有章节 */
  async syncMeta(b){
    let total = 0;
    for(const c of b.chs) total += chWords(c);
    b.total = total;
    const meta = { id:b.id, title:b.title, author:b.author, groupId:b.groupId, seriesId:b.seriesId,
      cover:b.cover, goal:b.goal, total, chs:b.chs.length, vols:b.vols.length, novol:b.novol === true, at:b.at,
      lastCh: b.chs.length ? b.chs[b.chs.length - 1].title : '' };
    const i = this.data.books.findIndex(x => x.id === b.id);
    if(i >= 0) this.data.books[i] = meta;
    else this.data.books.push(meta);
    await this.save();
  },
  async remove(id){
    const b = await this.get(id);
    if(b) for(const c of b.chs) await DB.del('book.' + id + '.ch.' + c.id);
    await DB.del('book.' + id);
    for(const k of await DB.keysWith('card.')) { /* 卡片按 book 标记，交给 Cards.purgeBook */ }
    await Cards.purgeBook(id); await Boards.purgeBook(id); await Notes.purgeBook(id);
    this.data.books = this.data.books.filter(x => x.id !== id);
    await this.save();
  },
  async rename(id, title){ const b = await this.get(id); if(!b) return; b.title = title; await this.saveBook(b); },
  async addGroup(name){ const g = { id: uid('g'), name: name || '新分组' }; this.data.groups.push(g); await this.save(); return g; },
  async delGroup(id){ this.data.groups = this.data.groups.filter(g => g.id !== id);
    for(const b of this.data.books) if(b.groupId === id) b.groupId = '';
    await this.save(); },
  async addSeries(name){ const s = { id: uid('s'), name: name || '新系列', books:[] }; this.data.series.push(s); await this.save(); return s; },
  async seriesAdd(sid, bid){ const s = this.data.series.find(x => x.id === sid); if(!s) return;
    if(!s.books.includes(bid)) s.books.push(bid);
    const b = await this.get(bid); if(b){ b.seriesId = sid; await this.saveBook(b); } await this.save(); },
  async seriesDel(id){ this.data.series = this.data.series.filter(s => s.id !== id); await this.save(); },
  async totalAll(){ const d = await this.load(); return d.books.reduce((a, b) => a + (b.total || 0), 0); }
};

/* 批注的回复：新版存在 replies[]，老数据只有 reply 一个字符串，两种都读成同一句尾 */
function annoReply(a){
  const rs = (a.replies || []).map(r => typeof r === 'string' ? r : (r && r.text) || '').filter(Boolean);
  if(a.reply) rs.unshift(a.reply);
  return rs.length ? '（回：' + rs.join(' / ') + '）' : '';
}

/* ---------- 当前打开的书 + 章节 ---------- */
const Work = {
  book:null, cur:null, /* cur = 当前章 id */
  async open(bookId){
    this.book = await Shelf.get(bookId);
    if(!this.book){ const d = await Shelf.load(); const first = d.books[0]; if(first) this.book = await Shelf.get(first.id); }
    if(!this.book) return null;
    await this.ensureSeed();
    this.cur = await State.get('cur.' + this.book.id, '') || (this.book.chs[0] && this.book.chs[0].id) || '';
    return this.book;
  },
  async ensureSeed(){
    const b = this.book;
    /* 不分卷的书就让它一直不分：没有卷也不补一个「第一卷」回来 */
    if(!b.vols.length && !b.novol) b.vols.push({ id: uid('v'), title:'第一卷', desc:'', collapsed:false });
    if(!b.chs.length){ await this.newCh(b.vols.length ? b.vols[0].id : ''); return; }
    /* 卷/章列表按录入顺序看就行，拖拽排序靠 moveCh */
  },
  vol(id){ return this.book.vols.find(v => v.id === id) || null; },
  chMeta(id){ return this.book.chs.find(c => c.id === id) || null; },
  async ch(id){
    const c = await DB.get('book.' + this.book.id + '.ch.' + id, null);
    if(!c) return null;
    if(!Array.isArray(c.paras) || !c.paras.length) c.paras = [newPara('p', '')];
    if(!Array.isArray(c.outline)) c.outline = [];
    if(!Array.isArray(c.annos)) c.annos = [];
    if(!Array.isArray(c.revs)) c.revs = [];
    if(!Array.isArray(c.versions)) c.versions = [];
    for(const p of c.paras) if(!p.id) p.id = uid('p');
    return c;
  },
  async saveCh(c, kind){
    const b = this.book;
    c.at = Date.now();
    const cnt = parasCount(c.paras);
    const meta = this.chMeta(c.id);
    if(meta){
      const prev = meta.han || 0, prevW = chWords(meta), prevP = meta.para || 0;
      meta.han = cnt.han; meta.w = cnt.w; meta.title = c.title; meta.mode = c.mode; meta.at = c.at;
      meta.ly = lyricFilled(c) ? 1 : 0;
      const p = paraCount(c.paras);
      meta.para = p;
      /* 今日字数按差值累加，删掉的章节文字也如实扣回去；w 是 Word 口径那一份，和全书同一个数 */
      const k = todayKey();
      b.daily[k] = (b.daily[k] || { han:0, sec:0 });
      b.daily[k].han = Math.max(0, (b.daily[k].han || 0) + cnt.han - prev);
      b.daily[k].w = Math.max(0, (b.daily[k].w || 0) + cnt.w - prevW);
      /* 段落数走同一套差值口径：合并、删段都会把今天的数扣回去 */
      b.daily[k].para = Math.max(0, (b.daily[k].para || 0) + p - prevP);
      await DB.put('book.' + b.id + '.ch.' + c.id, c);
      await this.saveBook();
    } else {
      await DB.put('book.' + b.id + '.ch.' + c.id, c);
    }
    return c;
  },
  async saveBook(){ await Shelf.saveBook(this.book); },
  async touchTime(sec){
    const k = todayKey(); const b = this.book;
    b.daily[k] = b.daily[k] || { han:0, w:0, sec:0 };
    b.daily[k].sec += sec;
  },
  async newCh(vid, title){
    const b = this.book;
    /* 传空串是「就挂在不分卷的根上」，和「没传、自己找落点」是两回事 */
    if(vid == null) vid = b.chs.length ? (this.chMeta(b.chs[b.chs.length - 1].id) || { vid:'' }).vid
      : (b.vols.length ? b.vols[0].id : '');
    const n = b.chs.length + 1;
    title = title || (typeof Seq !== 'undefined' ? Seq.nextForVol(vid) : '') || ('第' + n + '章');
    const c = { id: uid('c'), vid, title: title || ('第' + n + '章'), mode:'write', outline:[], paras:[newPara('p','')],
      annos:[], revs:[], versions:[], at: Date.now(), created: Date.now() };
    const i = b.vols.findIndex(v => v.id === vid);
    b.chs.splice(i >= 0 ? this.volEnd(vid) + i - i : b.chs.length, 0, { id:c.id, vid, title:c.title, mode:'write', han:0, w:0, para:0, at:c.at, created:c.created });
    /* 上面的 splice 只为了位置，实际顺序按卷内出现次序排 */
    b.chs = b.chs.filter((x, j, a) => a.findIndex(y => y.id === x.id) === j);
    await DB.put('book.' + b.id + '.ch.' + c.id, c);
    await this.saveBook();
    return c;
  },
  volEnd(vid){
    const b = this.book; let n = 0;
    for(let i = 0; i < b.chs.length; i++) if(b.chs[i].vid === vid) n = i + 1;
    return n;
  },
  /* 插入位置：卷内最后一个章之后，卷顺序按 vols 排 */
  async chIndex(vid){
    const b = this.book;
    let last = -1;
    for(let i = 0; i < b.chs.length; i++) if(b.chs[i].vid === vid) last = i;
    if(last >= 0) return last + 1;
    /* 空卷：插在本卷前驱卷的末尾 */
    const vi = b.vols.findIndex(v => v.id === vid);
    for(let j = vi - 1; j >= 0; j--){ const e = this.volEnd(b.vols[j].id); if(e > 0) return e; }
    return b.chs.length;
  },
  async renameCh(id, title){ const m = this.chMeta(id); if(!m) return; m.title = title;
    const c = await this.ch(id); if(c){ c.title = title; await DB.put('book.' + this.book.id + '.ch.' + id, c); }
    await this.saveBook(); },
  async delCh(id){
    const b = this.book;
    const m = this.chMeta(id);
    b.chs = b.chs.filter(c => c.id !== id);
    b.trash = b.trash || [];
    /* 回收站里留着卷/题名/字数，放回时才知道它是哪来的 */
    b.trash.push({ id, vid: m ? m.vid : '', title: m ? m.title : '', mode: m ? m.mode : 'write', han: m ? m.han : 0, w: m ? m.w : 0, at: Date.now(), created: m ? m.created : Date.now() });
    await this.saveBook();
  },
  async restoreCh(rec){
    const b = this.book;
    if(!this.vol(rec.vid)) rec.vid = b.vols.length ? b.vols[0].id : '';
    if(!b.chs.some(c => c.id === rec.id)) b.chs.push({ id: rec.id, vid: rec.vid, title: rec.title, mode: rec.mode || 'write', han: rec.han || 0, w: rec.w, at: rec.at || Date.now(), created: rec.created || Date.now() });
    b.trash = (b.trash || []).filter(x => x.id !== rec.id);
    await this.saveBook();
  },
  async newVol(title){
    const b = this.book;
    const bare = !b.vols.length;
    const v = { id: uid('v'), title: title || (typeof Seq !== 'undefined' ? Seq.nextForVolTitle() : '') || ('第 ' + (b.vols.length + 1) + ' 卷'), desc:'', collapsed:false };
    b.vols.push(v); b.novol = false;
    /* 从「不分卷」改回分卷：挂在根上的那些章整体归进这一卷，不留没人管的 */
    if(bare) for(const c of b.chs.filter(x => !x.vid)){ c.vid = v.id; await this.syncChVid(c.id, v.id); }
    await this.saveBook(); return v;
  },
  async renameVol(id, title){ const v = this.vol(id); if(v){ v.title = title; await this.saveBook(); } },
  async setVolDesc(id, desc){ const v = this.vol(id); if(v){ v.desc = desc; await this.saveBook(); } },
  async delVol(id){
    const b = this.book;
    if(b.vols.length <= 1) return false;
    for(const c of b.chs.filter(c => c.vid === id)){ b.trash = b.trash || []; b.trash.push({ id:c.id, vid:b.vols[0].id, title:c.title, mode:c.mode, han:c.han, w:c.w, at:Date.now() }); }
    b.chs = b.chs.filter(c => c.vid !== id);
    b.vols = b.vols.filter(v => v.id !== id);
    for(const c of b.chs) c.vid = b.vols[0].id;
    await this.saveBook();
    return true;
  },
  /* 解散分卷：卷壳子没了，章一章都不丢。
     还有其他卷 → 这一卷的章并进前一卷（它是打头第一卷就并进后一卷）；
     只剩这一卷 → 全书改成不分卷，章直接挂在根上（vid 空着）。
     和「删除这卷」是两件事：删除走回收站，解散不动任何一章。 */
  async dissolveVol(id){
    const b = this.book;
    const i = b.vols.findIndex(v => v.id === id);
    if(i < 0) return false;
    const mine = b.chs.filter(c => c.vid === id);
    b.vols.splice(i, 1);
    const vid = b.vols.length ? b.vols[Math.min(i, b.vols.length - 1)].id : '';
    if(!vid) b.novol = true;
    b.chs = b.chs.filter(c => c.vid !== id);
    /* 并进目标卷就接在本卷最后一章之后，别和原来的章交错开 */
    let at = b.chs.length;
    if(vid) for(let j = 0; j < b.chs.length; j++) if(b.chs[j].vid === vid) at = j + 1;
    for(const c of mine){ c.vid = vid; await this.syncChVid(c.id, vid); }
    b.chs.splice(at, 0, ...mine);
    await this.saveBook();
    return true;
  },
  /* 章正文里也存了一份所属卷，改属主要目录和正文一起改 */
  async syncChVid(cid, vid){
    const k = 'book.' + this.book.id + '.ch.' + cid;
    const c = await DB.get(k, null);
    if(c){ c.vid = vid; await DB.put(k, c); }
  },
  async moveCh(id, dir){
    const b = this.book, i = b.chs.findIndex(c => c.id === id);
    if(i < 0) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if(j < 0 || j >= b.chs.length) return;
    const t = b.chs[i]; b.chs[i] = b.chs[j]; b.chs[j] = t;
    await this.saveBook();
  },
  /* 并进另一卷末尾：从前这里是 filter 掉就完事（ arr 里没有再放回去 ），目录上那一章就这么没了 ——
     外25 第 4 条把「章拖到卷那一行」接上来之前先把它补正：摘出来、改属、压回数组末尾
     （orderedChs 是逐卷筛目录，压到数组末尾就等于落在这一卷的最后头）。 */
  async moveChToVol(id, vid){
    const b = this.book, m = this.chMeta(id);
    if(!m || m.vid === vid) return;
    b.chs = b.chs.filter(c => c.id !== id);
    m.vid = vid;
    b.chs.push(m);
    await this.syncChVid(id, vid);
    await this.saveBook();
  },
  /* 拖拽排序（外25 第 4 条）：落在另一章的上半 = 插在它前面，下半 = 跟在它后面，同时跟着改成它那一卷。
     b.chs 里管的只是"同一卷内谁先谁后"（orderedChs 是逐卷把目录筛一遍），所以照目标那一条的位置插就对了；
     落到卷那一行是另一条路（moveChToVol：并进这一卷末尾），不收拢到这儿，两条各有落点。 */
  async reorderCh(id, tid, pos){
    const b = this.book;
    if(id === tid) return false;
    const i = b.chs.findIndex(c => c.id === id);
    if(i < 0) return false;
    const t = b.chs.find(c => c.id === tid);
    if(!t) return false;
    const m = b.chs.splice(i, 1)[0], vid = t.vid;
    let j = b.chs.findIndex(c => c.id === tid);
    if(j < 0){ b.chs.splice(i, 0, m); return false; }
    if(pos === 'after') j++;
    m.vid = vid;
    b.chs.splice(j, 0, m);
    await this.syncChVid(id, vid);
    await this.saveBook();
    return true;
  },
  /* 卷的先后就是 b.vols 的先后（orderedChs 逐卷走），所以只需要挪这个数组。 */
  async reorderVol(id, tid, pos){
    const b = this.book;
    if(id === tid) return false;
    const i = b.vols.findIndex(v => v.id === id);
    if(i < 0) return false;
    const v = b.vols.splice(i, 1)[0];
    let j = b.vols.findIndex(x => x.id === tid);
    if(j < 0){ b.vols.splice(i, 0, v); return false; }
    if(pos === 'after') j++;
    b.vols.splice(j, 0, v);
    await this.saveBook();
    return true;
  },
  /* 全书顺序：按卷的次序把章串起来 */
  orderedChs(){
    const b = this.book, out = [];
    for(const v of b.vols) for(const c of b.chs) if(c.vid === v.id) out.push(c);
    for(const c of b.chs) if(!out.includes(c)) out.push(c);
    return out;
  },
  totalWords(){ return this.book.chs.reduce((a, c) => a + chWords(c), 0); },
  /* 老书的章目录里只有汉字数，没有 Word 口径那份：开书时逐章补一次，补完写回。
     只在缺 w 的时候读库，往后新写的章都带着 w，不会再走这条路。
     今天那笔账同理：只有汉字数的日子先拿汉字数当 Word 数垫上，差的就是标点那几个。 */
  async fillWords(force){
    const b = this.book; if(!b) return 0;
    let n = 0;
    for(const m of b.chs){
      if(!force && typeof m.w === 'number') continue;
      const c = await this.ch(m.id); if(!c) continue;
      m.w = parasCount(c.paras).w; n++;
    }
    const k = todayKey(), dd = b.daily && b.daily[k];
    if(dd && typeof dd.han === 'number' && typeof dd.w !== 'number'){ dd.w = dd.han; n++; }
    if(n) await this.saveBook();
    return n;
  },
  /* 列表反序：卷的顺序不动，每卷里的章倒过来（orderedChs 跟着数组走，所以倒一次就全倒） */
  async reverseChs(){ this.book.chs.reverse(); await this.saveBook(); },
  /* 单章目标：0 / 空 = 跟着书里的单章目标走 */
  async setChGoal(id, n){ const m = this.chMeta(id); if(!m) return;
    m.goal = Math.max(0, parseInt(n, 10) || 0); await this.saveBook(); },
  todayWords(){ const d = this.book.daily[todayKey()]; return d ? (typeof d.w === 'number' ? d.w : (d.han || 0)) : 0; },
  todaySec(){ const d = this.book.daily[todayKey()]; return d ? (d.sec || 0) : 0; },
  async search(q){
    const out = [];
    q = String(q || '').toLowerCase();
    if(!q) return out;
    for(const m of this.orderedChs()){
      const c = await this.ch(m.id);
      if(!c) continue;
      const hit = (t) => String(t || '').toLowerCase().includes(q);
      c.paras.forEach((p, i) => { if(hit(p.t)) out.push({ ch:c.id, chTitle:c.title, para:p.id, i, text:p.t, kind:'正文' }); });
      c.outline.forEach((p, i) => { if(hit(p.t)) out.push({ ch:c.id, chTitle:c.title, para:p.id, i, text:p.t, kind:'章纲' }); });
      if(hit(c.title)) out.push({ ch:c.id, chTitle:c.title, para:c.paras[0] && c.paras[0].id, i:0, text:c.title, kind:'标题' });
    }
    return out;
  },
  /* ---------- 导出：一份模型，三种格式各吃各的 ----------
     块 = { kind, text(带痕迹的原文), done, rev, annos, ind, chEnd }
     kind：title / byline / h1..h6 / p / ul / ol / todo / label
     chEnd 挂在每章最后一块上：md、txt 把批注列成段尾清单，Word 直接当批注挂进文档。 */
  async exportModel(scope, opt){
    opt = opt || {};
    const b = this.book, blocks = [], seen = new Set();
    let cid = 1;
    const push = (blk) => {
      if(blk.p){
        blk.text = blk.p.t; blk.done = !!blk.p.done; blk.rev = blk.p.rev || [];
        /* 列表层级：markdown 前补两个空格一级，Word 走 ilvl */
        blk.lv = blk.p.lv > 1 ? Math.min(6, blk.p.lv) : 1;
        /* 内联样式两种模式都往外带：写作模式打字收进来的 markdown 也记在 p.s 上 */
        blk.runs = Array.isArray(blk.p.s) && blk.p.s.length ? blk.p.s : null;
        blk.kind = blk.p.k || 'p';
        if(blk.kind === 'table'){ blk.grid = blk.p.grid; blk.span = blk.p.span; }
        if(blk.kind === 'img') blk.img = blk.p.t;
        blk.annos = opt.withAnno
          ? (opt.annosOf || []).filter(a => a.para === blk.p.id).map(a => { seen.add(a); return Object.assign({ __cid:cid++ }, a); }) : [];
        delete blk.p;
      }
      blocks.push(blk); return blk;
    };
    const head = (lvl, t) => push({ kind:'h' + lvl, text:t });
    const docBlock = async (m, lvl) => {
      const c = await this.ch(m.id); if(!c) return;
      opt.annosOf = c.annos || [];
      const hd = head(lvl, c.title);
      if(opt.withOutline && c.outline.length){
        push({ kind:'label', text:'【章纲】' });
        for(const p of c.outline) push({ p, ind:true });
      }
      /* 词格那一档的正文不住在 c.paras（那是切进这一档之前的旧正文）：整本导出要的是眼下这几行词 */
      const body = (c.mode === LYRIC_MODE && c.lyric) ? lyricParas(c.lyric) : c.paras;
      for(const p of (body && body.length ? body : c.paras)) push({ p });
      if(opt.withAnno && opt.annosOf.length){
        blocks[blocks.length - 1].chEnd = opt.annosOf;
        /* 段落被删掉之后批注就没处挂靠了。md 照样列在章尾，Word 不能丢：挂到章标题上 */
        const left = opt.annosOf.filter(a => !seen.has(a));
        if(left.length) hd.annos = left.map(a => Object.assign({ __cid:cid++ }, a));
      }
    };
    if(scope !== 'ch'){ push({ kind:'title', text:b.title }); if(b.author) push({ kind:'byline', text:b.author }); }
    if(scope === 'ch' && opt.ch){ await docBlock(this.chMeta(opt.ch), 1); }
    else if(scope === 'vol'){ const v = this.vol(opt.vid); if(v){ head(1, v.title); if(v.desc) push({ kind:'p', text:v.desc });
      for(const m of this.orderedChs().filter(c => c.vid === v.id)) await docBlock(m, 2); } }
    else {
      let lastVid = '';
      for(const m of this.orderedChs()){
        if(m.vid !== lastVid){ const v = this.vol(m.vid); if(v){ head(2, v.title); if(v.desc) push({ kind:'p', text:v.desc }); } lastVid = m.vid; }
        await docBlock(m, 3);
      }
    }
    return { title:b.title, blocks };
  },
  /* 带 markdown 记号的一行：列表每深一级，行首多两个空格（和 mdParse 读回来的口径一致） */
  blockMd(b){
    const pad = b.lv > 1 ? '  '.repeat(b.lv - 1) : '';
    if(b.kind === 'todo') return pad + '- [' + (b.done ? 'x' : ' ') + '] ' + b.text;
    if(b.kind === 'ul') return pad + '- ' + b.text;
    if(b.kind === 'ol') return pad + '1. ' + b.text;
    if(b.kind === 'label') return '> ' + b.text;
    /* 图片在 md 里是 ![图](相对路径)，表格是 GFM 那套竖线；合并单元格 GFM 不认，只能留空 */
    if(b.kind === 'img') return '![图](' + b.text + ')';
    if(b.kind === 'table') return Tbl.md({ text:b.text });
    const g = /^h([1-6])$/.exec(b.kind);
    return g ? '#'.repeat(+g[1]) + ' ' + b.text : b.text;
  },
  annoLine(a){ return '· ' + (a.quote || '') + ' → ' + a.text + annoReply(a); },
  /* md / txt 都从模型出：md 天生带记号，txt 看 marks 决定过不过滤。
     两种格式都不还原修订痕迹（删除段去掉、插入段留下），要无损痕迹只能走 Word。 */
  renderText(model, fmt, opt){
    opt = opt || {};
    const marks = fmt === 'md' || !!opt.marks;
    const isHead = k => /^h[1-6]$/.test(k) || k === 'title' || k === 'label';
    const lines = [];
    for(const b of model.blocks){
      const body = cleanText({ t:b.text, rev:b.rev });
      if(isHead(b.kind)) lines.push('');
      /* markdown 认内联样式，txt 不认：纯文本导出就是一张白纸，样式全丢 */
      const rich = marks && b.runs ? Spans.md(body, Spans.remap(b.runs, cleanOff({ t:b.text, rev:b.rev }))) : body;
      let t;
      if(b.kind === 'title') t = marks ? '# ' + rich : body;
      else if(b.kind === 'byline') t = marks ? '*' + rich + '*' : '作者：' + body;
      else if(!marks) t = body;
      else t = this.blockMd(Object.assign({}, b, { text:rich }));
      lines.push((b.ind && marks ? '  ' : '') + t);
      if(isHead(b.kind)) lines.push('');
      if(b.chEnd){
        lines.push('', marks ? '---' : '【批注】');
        for(const a of b.chEnd) lines.push(this.annoLine(a));
        lines.push('');
      }
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
  },
  async dump(scope, fmt, opt){
    return this.renderText(await this.exportModel(scope, opt || {}), fmt, opt || {});
  },
  /* Word：符号外显时只在行首挂一份记号，正文偏移照旧，痕迹和批注的坐标才不会错位 */
  async docx(scope, opt){
    const m = await this.exportModel(scope, opt || {});
    const blocks = [];
    for(const b of m.blocks){
      const blk = Object.assign({}, b);
      /* 待办在 Word 里由 build() 写成 [√]/[ ]，别再叠一层 markdown 记号；图片 / 表格 Word 有自己的走法 */
      blk.pre = (opt && opt.marks) && !/^(title|byline|todo|img|table)$/.test(b.kind) ? this.blockMd(Object.assign({}, b, { text:'' })) : '';
      /* 图片得带真字节进 Word：Flow-Desk.exe 从 <书名>/assets/ 读，开发服务器把内嵌那份 base64 拆回来（取字节是异步的，先备好） */
      if(blk.kind === 'img'){
        const rel = String(blk.img || blk.text || '');
        const bytes = await Img.bytes(rel);
        blk.file = bytes && bytes.length ? { bytes, ext:Img.ext(rel) } : null;
      }
      blocks.push(blk);
    }
    return Docx.build({ title:m.title, blocks });
  },
  async snapshot(){ return JSON.stringify({ v:3, book:this.book, chs:await DB.many('book.' + this.book.id + '.ch.', null) }, null, 1); },
  async restore(json){
    const d = JSON.parse(json);
    if(!d || !d.book) throw new Error('备份内容不对');
    for(const c of (d.chs || [])) await DB.put('book.' + d.book.id + '.ch.' + c.id, c);
    await DB.put('book.' + d.book.id, d.book);
    const meta = await Shelf.load();
    if(!meta.books.some(b => b.id === d.book.id)) meta.books.unshift({ id:d.book.id, title:d.book.title, total:0, at:Date.now() });
    await Shelf.save();
    return d.book.id;
  }
};

/* ---------- 码字统计：打字口径、时长分桶 ----------
   三件事分开记：
   · 打字字数 = 上屏了多少字（粘贴不算），删了再打会重复计
   · 短删除   = 一次删掉 N 字以内（默认 3），当错删看；超过 N 的算有意删，走长删除
   · 时长     = 打字 / 思考 / 摸鱼 三桶，每秒只落进一桶
   字数只认章节正文（跟 Word 一样，章纲/设定卡/灵感/笔记都不算），口径见 wordCount */
const STAT_CARDS = [
  { k:'本章字数', on:1 }, { k:'本书字数', on:1 }, { k:'本章进度', on:1 },
  { k:'今日字数', on:1 }, { k:'今日时长', on:1 }, { k:'今日速度', on:1 }, { k:'流畅度', on:1 },
  { k:'专注度' }, { k:'思考时长' }, { k:'摸鱼时长' }, { k:'本书目标进度' },
  { k:'总共字数' }, { k:'总时长' }, { k:'平均速度' }, { k:'作品数' },
  { k:'本章预估稿费' }, { k:'本书预估稿费' }
];
const METER_DAY = ['type', 'delS', 'delL', 'typeSec', 'think', 'slack'];

const Meter = {
  cards:{}, delN:3, simple:true,
  lastAt:0, comp:false, afterComp:false, pastePend:false, pre:0, preEl:null,

  async load(){
    const c = (await State.get('stat.cards', null)) || {};
    this.cards = {};
    for(const m of STAT_CARDS) this.cards[m.k] = Object.prototype.hasOwnProperty.call(c, m.k) ? !!c[m.k] : !!m.on;
    this.delN = Math.max(0, parseInt(await State.get('stat.delN', 3), 10) || 0);
    this.simple = await State.get('stat.simple', true) !== false;
  },
  async save(){
    await State.set('stat.cards', this.cards);
    await State.set('stat.delN', this.delN);
    await State.set('stat.simple', this.simple);
  },

  /* ---------- 记账 ---------- */
  today(){
    if(!Work.book) return null;
    const k = todayKey(), b = Work.book;
    b.daily[k] = b.daily[k] || { han:0, w:0, sec:0 };
    const d = b.daily[k];
    for(const f of METER_DAY) d[f] = d[f] || 0;
    return d;
  },
  typed(n){ const d = this.today(); if(!d || !(n > 0)) return; d.type += n; this.lastAt = Date.now(); },
  deleted(n){ const d = this.today(); if(!d || !(n > 0)) return; if(n <= this.delN) d.delS += n; else d.delL += n; },
  /* 每秒一格，由顶栏计时器喂。窗口不在前台 = 摸鱼，5 秒内上过屏 = 打字，其余算思考 */
  tick(){
    const d = this.today(); if(!d) return;
    if(!document.hasFocus() || document.hidden){ d.slack++; return; }
    if(this.lastAt && Date.now() - this.lastAt < 5000) d.typeSec++;
    else d.think++;
  },
  /* 焦点在任何能写字的地方：正文、章纲、卡片、灵感、标题框都算 */
  editingEl(el){
    return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio') || el.isContentEditable);
  },
  editing(){ return this.editingEl(document.activeElement); },
  lenOf(el){
    if(!el) return 0;
    if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return String(el.value || '').length;
    return (el.textContent || '').length;
  },
  init(host){
    const len = (el) => Meter.lenOf(el);
    /* 换一个框不算打字：焦点落在哪，就从那之后的差值开始记 */
    wnwOn(host, 'focusin', ev => {
      if(this.comp || !Meter.editingEl(ev.target)) return;
      this.preEl = ev.target; this.pre = len(ev.target);
    }, true);
    wnwOn(host, 'beforeinput', ev => {
      if(this.comp || !Meter.editingEl(ev.target)) return;
      this.preEl = ev.target; this.pre = len(ev.target);
    }, true);
    /* 粘贴不算打字：粘完先把基准挪到粘贴后的字数。
       有的实现会补一个 insertFromPaste 的 input 事件，由下面那条一起抵掉 */
    wnwOn(host, 'paste', ev => {
      const el = ev.target;
      if(!Meter.editingEl(el)) return;
      this.preEl = el;
      setTimeout(() => { this.pre = len(el); }, 0);
    }, true);
    wnwOn(host, 'compositionstart', ev => { this.comp = true; this.preEl = ev.target; this.pre = len(ev.target); }, true);
    /* 输入法上屏：这一次比上屏前多了多少字，就是打了多少字 */
    wnwOn(host, 'compositionend', ev => {
      this.comp = false; this.afterComp = true;
      const n = len(ev.target), d = n - this.pre; this.pre = n;
      if(d > 0) this.typed(d); else this.deleted(-d);
    }, true);
    wnwOn(host, 'input', ev => {
      if(this.comp || ev.isComposing || !Meter.editingEl(ev.target)) return;
      const n = len(ev.target);
      if(ev.target !== this.preEl){ this.preEl = ev.target; this.pre = n; return; }
      /* 刚粘完的那一发就是粘贴本身，抵掉 */
      if(this.pastePend){ this.pastePend = false; this.pre = n; return; }
      /* 上屏后浏览器还补一发 input，字数没变就是那一发，别重复记 */
      if(this.afterComp){ this.afterComp = false; if(n === this.pre) return; }
      const d = n - this.pre; this.pre = n;
      if(d > 0) this.typed(d); else this.deleted(-d);
    }, true);
    /* 从前这一发挂在 pagehide 上：搬进来之后没有「为写这一页被关掉」这回事了，
       落盘的时机交回 stop（下面那条）和顶栏计时里已有的那两次显式保存。 */
  },

  /* ---------- 字数：全书拿章目录里那份（Word 口径），跨书拿书架 meta 那份 ---------- */
  async allWords(){ const m = await Shelf.load(); return m.books.reduce((a, b) => a + (b.total || 0), 0); },
  async allSec(){
    const m = await Shelf.load(); let n = 0;
    for(const b of m.books){ const full = await Shelf.get(b.id); if(!full) continue;
      for(const k of Object.keys(full.daily || {})) n += (full.daily[k].sec || 0); }
    return n;
  },
  /* 今日净字数：打字扣掉错删和整块删；老数据没打过字，退回按差值累加的那份 */
  netDay(d){ return d && (d.type || d.delS || d.delL) ? Math.max(0, d.type - d.delS - d.delL) : ((d && d.han) || 0); }
};

/* 修订痕迹参与显示，但不参与统计与导出：删除段去掉，插入段留下。
   p.t 本来就带着插入的文字，所以只有 del 区间要挖掉——ins / fmt 一律原样保留。 */
function delRanges(p){
  const out = [];
  const src = (p.rev || []).filter(r => r.status === 'open' && r.op === 'del')
    .map(r => [r.at, r.at + (r.text || '').length]).filter(z => z[1] > z[0]).sort((a, b) => a[0] - b[0]);
  for(const z of src){
    const last = out[out.length - 1];
    if(last && z[0] <= last[1]){ if(z[1] > last[1]) last[1] = z[1]; } else out.push(z);
  }
  return out;
}
function cleanText(p){
  const t = String(p.t || ''), rs = delRanges(p);
  if(!rs.length) return t;
  let out = '', at = 0;
  for(const z of rs){ out += t.slice(at, z[0]); at = z[1]; }
  return out + t.slice(at);
}
/* 原文下标 → 挖掉删除段之后的下标：内联样式的坐标要搬到导出文本上 */
function cleanOff(p){
  const rs = delRanges(p);
  if(!rs.length) return x => x;
  return x => { let d = 0; for(const z of rs) d += Math.max(0, Math.min(x, z[1]) - Math.min(x, z[0])); return x - d; };
}

/* ---------- 段落级修订 / 批注：偏移都指着 p.t，textarea 里就是带痕迹的原文 ---------- */
const Trace = {
  /* 打一条痕迹：op = ins | del | fmt */
  mark(p, op, at, text, extra){
    p.rev = p.rev || [];
    const r = Object.assign({ id: uid('r'), op, at, text: text || '', ts: Date.now(), status:'open' }, extra || {});
    /* 同一位置同一内容的重复标记合并，避免一次长按删除打出几十条 */
    const same = p.rev.find(x => x.op === op && x.status === 'open' && x.at === at && x.text === r.text && (Date.now() - x.ts) < 8000);
    if(same) return same;
    p.rev.push(r);
    return r;
  },
  ranges(p){
    return (p.rev || []).filter(r => r.status === 'open').map(r => {
      const len = r.op === 'fmt' ? (p.t || '').length : (r.text || '').length;
      return { from: r.at, to: r.at + len, op: r.op, id: r.id, ts: r.ts, text: r.text, k: r.k, from2: r.from };
    }).sort((a, b) => a.from - b.from);
  },
  accept(p, id){
    const before = p.rev || [];
    p.rev = [];
    for(const r of before){
      if(r.id !== id && id !== '*'){ p.rev.push(r); continue; }
      if(r.op === 'ins'){ /* 留下文字，标记消失 */ }
      else if(r.op === 'del'){ const was = p.t; p.t = p.t.slice(0, r.at) + p.t.slice(r.at + (r.text || '').length); shiftRuns(p, was, p.t); }
      else if(r.op === 'fmt'){ p.k = r.k; }
    }
    this.shift(p);
  },
  reject(p, id){
    const before = p.rev || [];
    p.rev = [];
    for(const r of before){
      if(r.id !== id && id !== '*'){ p.rev.push(r); continue; }
      if(r.op === 'ins'){ const was = p.t; p.t = p.t.slice(0, r.at) + p.t.slice(r.at + (r.text || '').length); shiftRuns(p, was, p.t); }
      else if(r.op === 'del'){ /* 文字本来就在，痕迹消失即恢复 */ }
      else if(r.op === 'fmt'){ /* 不改 */ }
    }
    this.shift(p);
  },
  /* 文本被编辑后偏移会漂，这里只在接受/拒绝后做一次线性归一，够用 */
  shift(p){ p.rev = (p.rev || []).filter(r => r.status === 'open'); }
};

/* ---------- 版本：搬去 w15 的 Hist / Versions，一版一个明文 json 落在 历史\ 目录 ---------- */

/* ---------- 设定卡：模板 + 卡片，全书共享，另有跨书卡片池 ----------
   2026-10-08 外30 图3：「清空当前内置卡片模板」—— 从前开机第一次会往库里种六套出厂模板
   （角色卡 / 物品 / 地点 / 势力 / 功法 / 事件纲要）。作者要的是模板全由他自己建，
   所以那六套的定义整个撤了：不再种、库里已经种下的那几套开机摘掉一次。
   已经照着建出来的卡一张都不动 —— 卡上带的是自己的一份组与属性，类型名也抄在卡自己那一份上
   （cardTypeName 读的就是 m.tplName，不回头查模板），所以摘掉模板不会让哪张卡变成孤儿。 */
/* 早年模板图标存的是这些字符；现在一律存图片名字，老数据读到就当场换算一遍 */
const TPL_ICON_OLD = { '👤':'slot', '🏞':'log', '⚑':'tag', '⚡':'slot', '◉':'slot', '▤':'log', '◈':'tag', '⌖':'slot', '▣':'card', '✦':'idea' };

/* ---------- 追踪：卡片属性的一种填写方式，不是卡片的一种类型 ----------
   任何卡都可以在属性里加一条「追踪」，属性项下面挂若干条待办
   （每条待办可以关联多张卡片、多段正文，由好几处线索共同完成）。
   进度只由待办勾没勾当场数出来，不许手工填；新建出来零条待办就是 0%。
   存量兼容：老卡片没有这种属性，读的时候当没有这一格，不写回、不动那份数据；
   · it.todos[]                —— 这一条追踪属性的待办列表（挂在属性项自己身上）
     · id                      —— 号
     · text                    —— 这一条要追什么
     · done                    —— 勾了没有（进度就数这个）
     · lock                    —— 勾上之后钉死没有：锁着的一条不能勾也不能取消，要动先解锁
     · cards[]                 —— 关联的多张卡片（存卡片号）
     · paras[]                 —— 关联的多段正文：{ chId, chTitle, pid, at, t }（t 是挂上那会儿的文字抬头，只为显示）
   · it.pin / it.top           —— 这一条追踪在右栏「追踪」里钉住（每次打开停靠都自动列出来）/ 置顶（排在最前面）；
     老存档没有这两个字段，读的时候当没钉没顶，界面上自己补，不写回
   落在文稿库 wnw-docs 的 card.<卡号> 那一条的属性里；索引 cards.idx 不再多带 kind ——
   那是上一版把追踪做成卡片类型时加的，现在类型信息在卡里的属性项上，索引层用不上。 */
const CARD_TYPE_ALL = '__ALL__';
const cardTypeName = m => (m && m.tplName) || '空白';
/* 这一条属性是不是「追踪」：编辑器分派和右栏汇总都认这一个判据 */
const isTrackField = it => !!it && it.type === 'track';
/* 卡里有没有至少一条追踪属性：卡片界面拿来决定别处勾了待办要不要重画这一屏 */
const hasTrackField = c => !!c && (c.groups || []).some(g => (g.items || []).some(isTrackField));
/* 图13/14：一条「关联正文」= 若干片段，每片段 {pid, from, to}。
   偏移按 p.t 数（批注、修订痕迹指的也是 p.t，同一口径才不会被三套下标拽乱）；
   from/to 空 = 整段（老那批只存了段号、没写从哪到哪，读出来照样能用，不动存档）。 */
function linkParts(p){
  const raw = p && Array.isArray(p.parts) ? p.parts : [];
  const out = raw.filter(x => x && x.pid).map(x => ({
    pid: String(x.pid),
    from: x.from === null || x.from === undefined || !Number.isFinite(+x.from) ? null : +x.from,
    to: x.to === null || x.to === undefined || !Number.isFinite(+x.to) ? null : +x.to
  }));
  if(out.length) return out;
  return p && p.pid ? [{ pid:String(p.pid), from:null, to:null }] : [];
}
/* 挂在追踪条上的正文：算重复用这一把（同一段选两次、跨段选法不同都算两条） */
function linkSig(p){
  const ch = (p && p.chId) || '';
  return ch + '|' + linkParts(p).map(x => x.pid + ':' + (x.from === null ? '-' : x.from) + '-' + (x.to === null ? '-' : x.to)).join(',');
}
/* 只读一份待办：号缺了补个显示用的，关联那两头不是数组就当空的 —— 半截数据也读得动 */
function trackTodos(it){
  const raw = it && Array.isArray(it.todos) ? it.todos : [];
  return raw.filter(x => x && typeof x === 'object').map(x => ({
    id: String(x.id || ''), text: String(x.text || ''), done: !!x.done, lock: !!x.lock,
    cards: Array.isArray(x.cards) ? x.cards.filter(Boolean).map(String) : [],
    paras: Array.isArray(x.paras) ? x.paras.filter(Boolean).map(p => {
      const parts = linkParts(p);
      return { chId: String(p.chId || ''), chTitle: String(p.chTitle || ''),
        pid: String(p.pid || (parts[0] || {}).pid || ''), parts, at: p.at || 0, t: String(p.t || '') };
    }) : []
  }));
}
/* 要改这条追踪属性的待办了，先把结构补齐（只在这一条真要写的时候补，读的时候不动它）；返回待办数组本体 */
function trackStore(it){
  if(!Array.isArray(it.todos)) it.todos = [];
  /* 半截存档里混进来的 null / 空串先就地补成一条空的，下面逐条填字段才不会撞在 null 上 */
  it.todos = it.todos.map(x => (x && typeof x === 'object') ? x : { id: uid('td'), text: '', done: false, lock: false, cards: [], paras: [] });
  for(const t of it.todos){
    if(!t.id) t.id = uid('td');
    t.text = String(t.text || ''); t.done = !!t.done; t.lock = !!t.lock;
    if(!Array.isArray(t.cards)) t.cards = [];
    if(!Array.isArray(t.paras)) t.paras = [];
  }
  return it.todos;
}
/* 这一条追踪在右栏「追踪」里钉没钉住、置没置顶：都写在这条属性自己身上，
   老存档读不到就是没钉没顶，不报错也不丢条目 */
const trackPinned = it => !!(it && it.pin);
const trackToped = it => !!(it && it.top);
/* 完成进度：勾了的待办 / 全部待办；一条待办都没有就是 0% */
function trackProg(it){
  const t = trackTodos(it), done = t.filter(x => x.done).length;
  return { total: t.length, done, pct: t.length ? Math.round(done / t.length * 100) : 0 };
}
function migrateTplIcons(tpls){
  for(const t of tpls) if(TPL_ICON_OLD[t.icon]) t.icon = TPL_ICON_OLD[t.icon];
  return tpls;
}
const Cards = {
  tpls:null,
  async loadTpls(){
    if(this.tpls) return this.tpls;
    let t = await DB.get('cardtpl', null);
    if(!Array.isArray(t)) t = [];
    else{
      migrateTplIcons(t);
      /* 从前种进库的那六套出厂模板摘掉一次（图3）：只摘带 builtin 这一格的，他自己建的一律留着 */
      const cut = t.filter(x => x && x.builtin).map(x => x.name);
      if(cut.length){ t = t.filter(x => !x.builtin); await DB.put('cardtpl', t);
        if(typeof toast === 'function') toast('已按新规矩清掉出厂模板 ' + cut.length + ' 套（' + cut.join('、') + '）—— 照着建出来的卡一张没动'); }
    }
    this.tpls = t;
    return t;
  },
  async saveTpls(){ await DB.put('cardtpl', this.tpls); },
  async tpl(id){ await this.loadTpls(); return this.tpls.find(t => t.id === id) || null; },
  async newTpl(name){ await this.loadTpls(); const t = { id: uid('tpl'), name: name || '新模板', icon:'card', groups:[] };
    this.tpls.push(t); await this.saveTpls(); return t; },
  async delTpl(id){ await this.loadTpls(); this.tpls = this.tpls.filter(t => t.id !== id); await this.saveTpls(); },
  async fromTpl(tpl, bookId, title){
    const c = { id: uid('card'), bookId: bookId || '', tpl: tpl ? tpl.id : '', tplName: tpl ? tpl.name : '空白',
      title: title || '未命名', aliases: [], at: Date.now(), created: Date.now(), groups: [], color:'', tags:[],
      resp:'high', links:[], ok:{} };
    if(tpl) for(const g of tpl.groups) c.groups.push({ name: g.name, items: g.items.map(f => ({ fid: f.id, name: f.name, type: f.type,
      values: [], opts: (f.opts || []).map(o => ({ label:o.label, color:o.color })),
      rows: f.type === 'link' ? [] : undefined,
      /* 追踪属性带的是待办列表的结构位：建卡时先空着，零条待办 = 0%，具体追什么由用户自己加 */
      todos: f.type === 'track' ? [] : undefined })) });
    await this.put(c);
    return c;
  },
  /* keepAt：只改这一张卡上的一个开关（追踪那一栏的钉住、置顶），不算动过内容 ——
     不刷「最近改动」，卡片在列表里的位置跟着不动（外15 丙组那条副作用）。 */
  async put(c, keepAt){ if(!keepAt) c.at = Date.now(); await DB.put('card.' + c.id, c); await this.index(c); },
  async get(id){ return DB.get('card.' + id, null); },
  async index(c){
    const idx = await DB.get('cards.idx', []) || [];
    const row = { id:c.id, bookId:c.bookId, tpl:c.tpl, tplName:c.tplName, title:c.title, at:c.at,
      created:c.created || c.at || 0,
      color:c.color, aliases:c.aliases || [], tags:c.tags || [],
      resp:c.resp || 'high', links:c.links || [], ok:c.ok || {}, st:c.st || null };
    const i = idx.findIndex(x => x.id === c.id);
    if(i >= 0) idx[i] = row; else idx.push(row);
    await DB.put('cards.idx', idx);
  },
  /* 设定不许重名：本书能看见的卡（本书 + 公共）里名字唯一，别名也算占名；
     公共卡每本书都看得见，所以它跟所有卡比 */
  async taken(name, exceptId, bookId){
    const n = String(name || '').trim();
    if(!n) return '';
    const ms = bookId ? await this.forBook(bookId) : await this.all();
    for(const m of ms){
      if(m.id === exceptId) continue;
      if(m.title === n) return m.title;
      if((m.aliases || []).includes(n)) return m.title;
    }
    return '';
  },
  /* 复制一张卡：结构照抄，名字加个「副本」，归属跟原卡一致 */
  async copy(c){
    const n = JSON.parse(JSON.stringify(c));
    n.id = uid('card'); n.title = c.title + ' 副本'; n.at = n.created = Date.now();
    n.links = []; n.ok = {};
    await this.put(n);
    return n;
  },
  async all(){ return (await DB.get('cards.idx', [])) || []; },
  async forBook(bid){ return (await this.all()).filter(c => !c.bookId || c.bookId === bid); },
  async del(id){ await DB.del('card.' + id);
    const idx = (await DB.get('cards.idx', [])) || [];
    await DB.put('cards.idx', idx.filter(x => x.id !== id));
    if(typeof Occur !== 'undefined') Occur.forget(); },
  async purgeBook(bid){
    const idx = (await DB.get('cards.idx', [])) || [];
    for(const x of idx.filter(c => c.bookId === bid)) await DB.del('card.' + x.id);
    await DB.put('cards.idx', idx.filter(c => c.bookId !== bid));
  },
  /* 卡片正文里被引用的名字，用来在正文中高亮、在画板上快速取节点 */
  async names(bid){
    const out = [];
    for(const m of await this.forBook(bid)){ out.push(m.title); for(const a of (m.aliases || [])) out.push(a); }
    return out;
  }
};

/* ---------- 灵感：Alt+Enter 快捕 + 灵感池 + 随机 ---------- */
const Insp = {
  async all(){ return (await DB.get('insp.idx', [])) || []; },
  async put(c){ c.at = Date.now(); c.created = c.created || Date.now(); await DB.put('insp.' + c.id, c);
    const idx = (await DB.get('insp.idx', [])) || [];
    const row = { id:c.id, bookId:c.bookId || '', text:c.text, at:c.at, created:c.created, from:c.from || '', pinned:!!c.pinned,
      tags:(c.tags || []).slice() };
    const i = idx.findIndex(x => x.id === c.id);
    if(i >= 0) idx[i] = row; else idx.unshift(row);
    await DB.put('insp.idx', idx); },
  async get(id){ return DB.get('insp.' + id, null); },
  async add(text, bookId, from){ const c = { id: uid('i'), bookId: bookId || '', text, at: Date.now(), from: from || '', pinned:false };
    await this.put(c); return c; },
  async del(id){ await DB.del('insp.' + id);
    await DB.put('insp.idx', (await this.all()).filter(x => x.id !== id)); },
  async forBook(bid){ return (await this.all()).filter(x => !x.bookId || x.bookId === bid); },
  async purgeBook(bid){ for(const x of (await this.all()).filter(c => c.bookId === bid)) await DB.del('insp.' + x.id);
    await DB.put('insp.idx', (await this.all()).filter(c => c.bookId !== bid)); }
};

/* ---------- 笔记：和章并列的独立文档，可开成标签 ---------- */
const Notes = {
  async all(){ return (await DB.get('notes.idx', [])) || []; },
  async get(id){ const n = await DB.get('note.' + id, null);
    if(n && !Array.isArray(n.paras)) n.paras = [newPara('p', '')]; return n; },
  async put(n){ n.at = Date.now(); await DB.put('note.' + n.id, n);
    const idx = (await this.all());
    const row = { id:n.id, bookId:n.bookId || '', title:n.title, at:n.at, han: parasCount(n.paras).han };
    const i = idx.findIndex(x => x.id === n.id);
    if(i >= 0) idx[i] = row; else idx.unshift(row);
    await DB.put('notes.idx', idx); },
  async create(title, bookId){ const n = { id: uid('n'), bookId: bookId || '', title: title || '未命名笔记', mode:'note', paras:[newPara('p','')], at: Date.now() };
    await this.put(n); return n; },
  async del(id){ await DB.del('note.' + id); await DB.put('notes.idx', (await this.all()).filter(x => x.id !== id)); },
  async forBook(bid){ return (await this.all()).filter(x => !x.bookId || x.bookId === bid); },
  async purgeBook(bid){ for(const x of (await this.all()).filter(c => c.bookId === bid)) await DB.del('note.' + x.id);
    await DB.put('notes.idx', (await this.all()).filter(c => c.bookId !== bid)); }
};

/* ---------- 看板：一套板子两种读法，轨道分家 —— 时间轨归时间线，事件轨归事件线 ----------
   节点上 tt = 挂在哪个时间轨，et = 挂在哪个事件轨，seq = 事件序号（1.2.3 这种点号层） */
function boardTracks(list, defName){
  const out = Array.isArray(list) ? list.filter(x => x && x.id) : [];
  if(!out.length) out.push({ id: uid('t'), name: defName });
  for(const t of out){ t.name = String(t.name || defName); t.gap = +t.gap || 0; }
  return out;
}
function migrateBoard(b){
  if(!b) return b;
  if(!Array.isArray(b.nodes)) b.nodes = [];
  if(!Array.isArray(b.links)) b.links = [];
  if(!Array.isArray(b.tracks)) b.tracks = [];
  if(!b.ttracks){
    b.ttracks = boardTracks(b.tracks.map(t => ({ id:t.id, name:t.name })), '主时间');
    for(const n of b.nodes){ if(n.tt == null) n.tt = n.track != null ? n.track : ''; }
  }
  if(!b.etracks){
    b.etracks = boardTracks(null, '主线');
    for(const n of b.nodes) if(n.et == null) n.et = b.etracks[0].id;
  }
  delete b.tracks;
  for(const n of b.nodes){
    delete n.track;
    if(n.tt == null) n.tt = b.ttracks[0].id;
    if(n.et == null) n.et = b.etracks[0].id;
    if(!b.ttracks.some(t => t.id === n.tt)) n.tt = b.ttracks[0].id;
    if(!b.etracks.some(t => t.id === n.et)) n.et = b.etracks[0].id;
    /* 事件评级 / 时间评级：只认纯数字，空着和脏值一样当没评 */
    n.ev = rated(n.ev) ? String(n.ev).trim() : '';
    n.tv = rated(n.tv) ? String(n.tv).trim() : '';
    /* 看板 v0.5（第 10/12/16 条）：一色拆成填充 + 边框、一张关联卡变成一张列表，
       图片只存路径。一次过补在数据层，视图里不留兼容分支。 */
    if(n.fill === undefined) n.fill = '';
    if(n.line === undefined) n.line = n.color || '';
    delete n.color;
    if(!Array.isArray(n.cards)) n.cards = n.cardId ? [n.cardId] : [];
    delete n.cardId;
    if(n.img === undefined) n.img = '';
  }
  /* 组（第 13 条）：一层异色底、无边框，成员不足两个的不算组 */
  if(!Array.isArray(b.groups)) b.groups = [];
  const ids = new Set(b.nodes.map(n => n.id));
  b.groups = b.groups.map(g => (g && Array.isArray(g.m)) ? { ...g, m: g.m.filter(id => ids.has(id)) } : g)
    .filter(g => g && Array.isArray(g.m) && g.m.length >= 2);
  for(const t of b.ttracks) t.mode = ['real','fake','origin'].includes(t.mode) ? t.mode : 'real';
  for(const lk of b.links){
    /* 备注这一栏没了：原先写过话的挪到自定义，文字继续显示在线上，不至于凭空丢字 */
    if(lk.custom == null) lk.custom = lk.note || '';
    delete lk.note;
  }
  return b;
}
const Boards = {
  async all(){ return (await DB.get('boards.idx', [])) || []; },
  async get(id){ return migrateBoard(await DB.get('board.' + id, null)); },
  async put(b){ b.at = Date.now(); await DB.put('board.' + b.id, b);
    const idx = (await this.all());
    const row = { id:b.id, bookId:b.bookId || '', title:b.title, mode:b.mode, at:b.at };
    const i = idx.findIndex(x => x.id === b.id);
    if(i >= 0) idx[i] = row; else idx.unshift(row);
    await DB.put('boards.idx', idx); },
  async create(title, bookId, mode){ const b = { id: uid('bd'), bookId: bookId || '', title: title || '新看板',
    mode: mode || 'event',
    ttracks:[{ id: uid('t'), name:'主时间', mode:'real', gap:0 }],
    etracks:[{ id: uid('e'), name:'主线', gap:0 }],
    nodes:[], links:[], groups:[], zoom:1, ox:0, oy:0, at: Date.now() };
    await this.put(b); return b; },
  async del(id){ await DB.del('board.' + id); await DB.put('boards.idx', (await this.all()).filter(x => x.id !== id)); },
  async forBook(bid){ return (await this.all()).filter(x => !x.bookId || x.bookId === bid); },
  async purgeBook(bid){ for(const x of (await this.all()).filter(c => c.bookId === bid)) await DB.del('board.' + x.id);
    await DB.put('boards.idx', (await this.all()).filter(c => c.bookId !== bid)); }
};
const REL_KINDS = [ { k:'上级', c:'#e05a5a' }, { k:'同级', c:'#e59445' }, { k:'下级', c:'#8cc63f' },
  { k:'对照', c:'#8a6fd6' }, { k:'映射', c:'#d68a8a' }, { k:'全局', c:'#22b8cf' }, { k:'旁支', c:'#74c0b5' } ];

/* ---------- 中立词库层的宿主接口 ----------
   词库只有一份，就是插件目录里那个 data.txt。
   DATA_PRE 不在本文件里算：为写现在整个拼在宿主页面里，前缀就读宿主顶层那一份（Flow-Desk 的程序在 pages\ 下、
   往隔壁数据层跳一级，本地开发那台服务器在页面层找不到文件时会自动往数据层再找一次，所以留空就够）。
   独立那一页已经退了，底下那两条兜底留着不删，是因为本文件不想裸读宿主的名：读到没定义的名不是「留空」，
   是整段代码求值到这一行就断，后面的全都不再定义 —— 先认宿主那份，认不到才按协议自己算。
   从前按 iframe 那层深度算的那一份公式不对，留的是这个名、换的是这个值 —— 数据层、插件目录、图片落盘、历史快照全都跟着它走。 */
const WNW_DATA_PRE = typeof DATA_PRE === 'string' ? DATA_PRE
  : (window.FD_APP && location.protocol === 'fdapp:') ? '../../data/' : '../';
const TOOL_HOST = {
  id:'wnw',
  /* DB 是本文件上面的 const，用 getter 等到运行期再取 */
  get kv(){ return DB; },
  /* 哪份词库归哪个包、明文落在哪儿由包的插件清单（bank.user）说，这儿不再硬点名 */
  /* 自建词库、生成器配方和生成记录都在数据层，都靠这些前缀够到 */
  bankDir:WNW_DATA_PRE, components:WNW_DATA_PRE + 'plugins/',
  picked(){ return null; },
  /* 改词库对话框就用 WNW 自己的浮层（浮层标题栏已经有关闭钮） */
  dlg:{ open(t, b, f, opt){ Overlay.open(t, b, f, opt); }, close(){ Overlay.close(); } },
  /* 完全删除一个配方组件：两张注册表都摘掉，开着的标签和停靠一并收掉 */
  unregister(id){ Tools.delete(id); Views.del(id); Desk.dropKind(id); }
};

