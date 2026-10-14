/* ============================================================
   富文本层（笔记 / 富文本模式专用）
   ------------------------------------------------------------
   铁律：样式另记一张表，一个字都不加进 p.t。
   p.t 是全站的坐标尺 —— 批注、修订、字数、查找、docx 都指着它，
   一旦把 ** 这类记号混进正文，上面这些下标全体错位。
   所以：p.s = [{ a:起, n:长, b:粗, i:斜, u:下划线, s:删除线, c:字色, h:高亮底, l:链接, k:行内代码 }]
   约定三条，渲染和搬运都靠它：
     1) 区间互不重叠；2) 按 a 排好；3) 相邻且款式相同的已合并。
   一段字最多戴一套样式，不用处理嵌套，坐标也就不会含糊。
   文本被编辑时（打字 / 拆段 / 并段 / 替换 / 接受拒绝修订）都要过一遍 Spans.shift，
   下标才跟得上。
   ============================================================ */
const RICH_KEYS = ['b', 'i', 'u', 's', 'c', 'h', 'l', 'k'];

const Spans = {
  of(p){ return Array.isArray(p.s) ? p.s : []; },
  has(r){ for(const k of RICH_KEYS) if(r && r[k]) return true; return false; },
  same(x, y){ for(const k of RICH_KEYS) if((x && x[k]) !== (y && y[k])) return false; return true; },
  /* 排好、切掉空段、重叠的后面那段截头、相邻同款式并成一条 */
  norm(list){
    const out = []; let pos = 0;
    const src = (list || []).filter(r => r && r.n > 0).slice().sort((a, b) => a.a - b.a);
    for(const r of src){
      let a = Math.max(0, Math.round(r.a)), b = Math.max(a, Math.round(r.a) + Math.round(r.n));
      if(b <= pos) continue;
      a = Math.max(a, pos); pos = b;
      const cur = { a, n:b - a };
      for(const k of RICH_KEYS) if(r[k]) cur[k] = r[k];
      const last = out[out.length - 1];
      if(last && last.a + last.n === a && this.same(last, cur)){ last.n += cur.n; continue; }
      out.push(cur);
    }
    return out;
  },
  /* 在 at 处切一刀：跨着这一刀的区间拆成两条，款式照旧 */
  cut(list, at){
    const out = [];
    for(const r of list){
      if(r.a < at && r.a + r.n > at){
        const l = at - r.a;
        out.push(Object.assign({}, r, { n:l }));
        out.push(Object.assign({}, r, { a:at, n:r.n - l }));
      } else out.push(r);
    }
    return out;
  },
  /* 给 [from,to) 打上 props；props 里给 0 / '' 的项就是抹掉 */
  set(list, from, to, props){
    from = Math.max(0, from); to = Math.max(from, to);
    const src = this.norm(list);
    if(to <= from) return src;
    const l = this.cut(this.cut(src, from), to);
    const out = []; let pos = 0;
    const gap = (a, b) => { if(b > a){ const g = Object.assign({ a, n:b - a }, props); if(this.has(g)) out.push(g); } };
    for(const r of l){
      if(r.a > pos) gap(Math.max(pos, from), Math.min(r.a, to));
      pos = r.a + r.n;
      if(r.a >= from && r.a < to){
        const m = Object.assign({}, r);
        for(const k in props){ if(props[k]) m[k] = props[k]; else delete m[k]; }
        if(this.has(m)) out.push(m);
      } else out.push(r);
    }
    gap(Math.max(pos, from), to);
    return this.norm(out);
  },
  /* 选区里是不是每一个字都带着这一项（按钮该不该亮） */
  all(list, from, to, key){
    if(to <= from) return false;
    let pos = from;
    for(const r of this.norm(list)){
      if(r.a + r.n <= from) continue;
      if(r.a >= to) break;
      if(r.a > pos || !r[key]) return false;
      pos = Math.min(to, r.a + r.n);
      if(pos >= to) return true;
    }
    return false;
  },
  /* 文本改了：[at, at+oldLen) 换成 newLen 长，样式跟着搬 */
  shift(list, at, oldLen, newLen){
    if(!list || !list.length || oldLen === newLen) return list || [];
    const d = newLen - oldLen, end = at + oldLen;
    const f = x => x <= at ? x : (x >= end ? x + d : at);
    const out = [];
    for(const r of list){
      const a = f(r.a), b = f(r.a + r.n);
      if(b > a) out.push(Object.assign({}, r, { a, n:b - a }));
    }
    return out;
  },
  /* 拆段：取 [from,to) 这一段，下标归零 */
  slice(list, from, to){
    const out = [];
    for(const r of (list || [])){
      const a = Math.max(r.a, from), b = Math.min(r.a + r.n, to);
      if(b > a) out.push(Object.assign({}, r, { a:a - from, n:b - a }));
    }
    return out;
  },
  /* 并段：尾巴那段整体后移 */
  move(list, at){
    return (list || []).map(r => Object.assign({}, r, { a:r.a + at }));
  },
  /* 导出用：把原文坐标搬到「挖掉删除段之后」的坐标 */
  remap(list, f){
    const out = [];
    for(const r of (list || [])){
      const a = f(r.a), b = f(r.a + r.n);
      if(b > a) out.push(Object.assign({}, r, { a, n:b - a }));
    }
    return out;
  },
  /* 一条样式 → 写进 span 的那串 */
  css(r){
    let s = '';
    if(r.b) s += 'font-weight:700;';
    if(r.i) s += 'font-style:italic;';
    const d = [];
    if(r.u) d.push('underline');
    if(r.s) d.push('line-through');
    if(r.l) d.push('underline');
    if(d.length) s += 'text-decoration:' + d.join(' ') + ';';
    if(r.c) s += 'color:' + r.c + ';';
    if(r.h) s += 'background:' + r.h + ';';
    if(r.l && !r.c) s += 'color:var(--slot-1,#3b6cb5);';
    if(r.k) s += 'font-family:var(--ff-code,ui-monospace,Consolas,monospace);';
    return s;
  },
  /* markdown 里怎么落地：粗斜删用记号，下划线 / 颜色用行内 html，链接用 []() */
  md(t, list){
    const l = this.norm(list);
    if(!l.length) return t;
    let out = '', at = 0;
    for(const r of l){
      const a = Math.max(0, r.a), b = Math.min(t.length, a + r.n);
      if(b <= a) continue;
      if(a > at) out += t.slice(at, a);
      out += mdWrap(t.slice(a, b), r);
      at = b;
    }
    return out + t.slice(at);
  },
  /* 打字认 markdown：一行带记号的原文 → 干净文本 + 样式表 + 光标对照表。
     记号只活在这一瞬间，落地后 p.t 里干干净净，坐标尺不会被 ** 顶歪。
     map[旧下标] = 新下标，去掉几个星号都不影响光标落点。
     一段字只戴一套样式，所以命中之后整块跳过去，记号套记号（**加*斜*粗**）不当嵌套处理。 */
  mdInline(line){
    line = String(line == null ? '' : line);
    if(!/[`~*\[_]/.test(line)) return null;
    const s = [], map = [0];
    let out = '', i = 0, hit = 0;
    while(i < line.length){
      let m = null, p = null;
      for(const q of MD_IN){
        if(q.em && i > 0 && /[0-9A-Za-z]/.test(line[i - 1])) continue;
        /* 左边挨着同一个记号就不认：*** 打到一半（***粗斜*）时那条单星号规则会抢先把粗斜吃掉，
           等真正的收尾记号打进来已经没有星号可配了 —— 拒掉，让长记号自己成形 */
        if(q.del && i > 0 && line[i - 1] === q.del) continue;
        q.re.lastIndex = i;
        const r = q.re.exec(line);
        if(r){ m = r; p = q; break; }
      }
      if(!m){ out += line[i]; map[++i] = out.length; continue; }
      const inner = m[1], a = i + p.open, n = inner.length, end = i + m[0].length, start = out.length;
      out += inner;
      s.push(Object.assign({ a:start, n }, p.st(m)));
      for(let k = i + 1; k <= a; k++) map[k] = start;
      for(let k = a + 1; k <= a + n; k++) map[k] = start + (k - a);
      for(let k = a + n + 1; k <= end; k++) map[k] = start + n;
      hit += m[0].length - n;
      i = end;
    }
    if(!hit) return null;
    return { t:out, s:Spans.norm(s), map, hit };
  }
};
/* 行内记号表：先试长的再试短的，backtick / 链接在最前（记号里头的星号不再当样式） */
const MD_IN = [
  { re:/`([^`\n]+)`/y, open:1, del:'`', st:() => ({ k:1 }) },
  { re:/\[([^\]\n]+)\]\(([^)\s]+)\)/y, open:1, st:m => ({ l:m[2] }) },
  { re:/\*\*\*(?=[^\s*])([\s\S]*?[^\s*])\*\*\*/y, open:3, em:1, del:'*', st:() => ({ b:1, i:1 }) },
  { re:/___(?=[^\s_])([\s\S]*?[^\s_])___/y, open:3, em:1, del:'_', st:() => ({ b:1, i:1 }) },
  { re:/\*\*(?=[^\s*])([\s\S]*?[^\s*])\*\*/y, open:2, em:1, del:'*', st:() => ({ b:1 }) },
  { re:/__(?=[^\s_])([\s\S]*?[^\s_])__/y, open:2, em:1, del:'_', st:() => ({ b:1 }) },
  { re:/\*(?=[^\s*])([\s\S]*?[^\s*])\*/y, open:1, em:1, del:'*', st:() => ({ i:1 }) },
  { re:/_(?=[^\s_])([\s\S]*?[^\s_])_/y, open:1, em:1, del:'_', st:() => ({ i:1 }) },
  { re:/~~(?=[^\s~])([\s\S]*?[^\s~])~~/y, open:2, del:'~', st:() => ({ s:1 }) },
];
/* 文本改了 → 样式表跟着搬：新旧 p.t 求公共前后缀，中间那截算被换掉。
   打字、拆段、并段、替换、接受 / 拒绝修订、一键排版，凡是动了 p.t 都得过这一道。 */
function shiftRuns(p, oldT, newT){
  oldT = String(oldT == null ? '' : oldT); newT = String(newT == null ? '' : newT);
  if(oldT === newT || !p || !Array.isArray(p.s) || !p.s.length) return;
  let a = 0; while(a < oldT.length && a < newT.length && oldT[a] === newT[a]) a++;
  let b = 0; while(b < oldT.length - a && b < newT.length - a && oldT[oldT.length - 1 - b] === newT[newT.length - 1 - b]) b++;
  p.s = Spans.shift(p.s, a, oldT.length - a - b, newT.length - a - b);
}
function mdWrap(s, r){  if(!s) return s;
  if(r.k) s = '`' + s + '`';
  else if(r.b && r.i) s = '***' + s + '***';
  else if(r.b) s = '**' + s + '**';
  else if(r.i) s = '*' + s + '*';
  if(r.s) s = '~~' + s + '~~';
  if(r.u) s = '<u>' + s + '</u>';
  if(r.c) s = '<span style="color:' + r.c + '">' + s + '</span>';
  if(r.h) s = '<span style="background:' + r.h + '">' + s + '</span>';
  if(r.l) s = '[' + s + '](' + r.l + ')';
  return s;
}
/* 一段纯文本 → 带 markdown 记号的一行（块前缀由调用方加） */
function richMd(p){
  return Spans.md(String(p.t || ''), p.s);
}
/* 工具条上那几个样式按钮：符号 + 汉字，和块类型那组一个脾气 */
const RICH_IT = [['b', 'B', '加粗'], ['i', 'I', '斜体'], ['u', '下', '下划线'], ['s', '删', '删除线']];

/* ============================================================
   本地图片：Flow-Desk.exe 落 <书名>/assets/，稿子里只记相对路径；
   开发服务器写不了文件，图塞进数据库、稿子里记的还是同一条相对路径。
   p.t 里始终是 assets/xxx.png —— 字数、批注、查找的坐标才不会被一长串 base64 顶飞。
   ============================================================ */
const IMG_KINDS = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.webp':'image/webp', '.bmp':'image/bmp', '.svg':'image/svg+xml' };
const Img = {
  /* 壳里这一判不能只看协议名：Windows 上 WebView2 给页面的门牌是 http://fdapp.localhost，
     location.protocol 是 http: —— 只认 'fdapp:' 的话，装出来的那一棵里这些功能全被当成"不在程序里"（2026-10-14 他报「无法触发实际功能」） */
  app(){ return !!(window.FD_APP && (location.protocol === 'fdapp:' || window.__FD_BOOT__)); },
  dir(){ return String((Work.book && Work.book.title) || '书').replace(/[\\/:*?"<>|]/g, '_'); },
  ext(name){ const m = /\.([a-z0-9]+)$/i.exec(String(name || '')); return m ? '.' + m[1].toLowerCase() : ''; },
  rel(name){ return 'assets/' + String(name || '').replace(/[\\/:*?"<>|]/g, '_'); },
  /* 读图的地址要和 save() 写盘的位置对上：插图那层落在数据层的 <书名>\assets\（第 15 条：
     用户的书全在 数据\，换 页面\ 不吃数据），WNW_DATA_PRE 就是那段跳法，开发服务器里照旧跳一级。
     写成本根绝对路径的话，装进 exe 之后指的就不是数据层那一格，图就空了。 */
  fileUrl(rel){ return new URL(WNW_DATA_PRE + encodeURIComponent(this.dir()) + '/' + rel.split('/').map(encodeURIComponent).join('/'), location.href).href; },
  async url(rel){
    if(!rel) return '';
    if(this.app()) return this.fileUrl(rel);
    return await DB.get('img.' + Work.book.id + '.' + rel, '') || '';
  },
  /* 存一份：Flow-Desk.exe 写文件，开发服务器存 dataURL。返回 'file' / 'embed' 给调用方照实说 */
  async save(rel, bytes, mime){
    if(this.app()){ await FD_APP.writePageBytes(WNW_DATA_PRE + this.dir() + '/' + rel, bytes); return 'file'; }
    await DB.put('img.' + Work.book.id + '.' + rel, 'data:' + (mime || 'image/png') + ';base64,' + b64(bytes));
    return 'embed';
  },
  /* 导出 Word 要真字节：文件走 fdapp://  fetch，内嵌的把 dataURL 拆回来 */
  async bytes(rel){
    const u = await this.url(rel);
    if(!u) return null;
    if(u.startsWith('data:')) return unb64(u.slice(u.indexOf(',') + 1));
    try{ const r = await fetch(u); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; }catch(e){ return null; }
  },
  /* 插图：从文件选择器拿，Flow-Desk.exe 落盘 / 开发服务器内嵌。名字后面缀一段时间戳，同名图不会互相盖掉 */
  async pick(){
    const out = [];
    for(const f of await pickImageFiles()){
      const buf = new Uint8Array(await f.arrayBuffer());
      const ext = this.ext(f.name) || '.png';
      const stem = String(f.name || '图').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w\u4e00-\u9fa5-]/g, '_').slice(0, 24);
      const rel = this.rel(stem + '-' + Date.now().toString(36) + ext);
      out.push({ rel, where: await this.save(rel, buf, f.type || IMG_KINDS[ext] || 'image/png') });
    }
    return out;
  }
};
function b64(bytes){
  let s = '';
  for(let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(t){
  const s = atob(t), out = new Uint8Array(s.length);
  for(let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
/* 文件选择：两种开法都走 input[type=file]，Flow-Desk.exe 的 File 对象带 .path，开发服务器没有也不需要 */
function pickImageFiles(){
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*'; i.multiple = true;
    i.onchange = () => res([...(i.files || [])]);
    (wnwRoot() || document.body).appendChild(i); i.click(); i.remove();
  });
}
/* 网址 → 标题：Flow-Desk.exe 让主进程去取（页面自己跨域取不到），开发服务器先试 fetch，
   被 CORS 挡了就照实把网址本身当文字插进去，不编一个假标题。 */
const URL_RE = /^https?:\/\/[^\s]+$/i;
async function urlTitle(url){
  try{ if(window.FD_APP && typeof FD_APP.webTitle === 'function'){ const t = await FD_APP.webTitle(url); if(t) return t; } }catch(e){}
  try{
    const r = await fetch(url, { signal:AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined });
    const h = await r.text();
    const m = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(h);
    return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 120) : '';
  }catch(e){ return ''; }
}

/* ============================================================
   简易表格：格子内容摊平进 p.t（行用 \n、列用 \t 分），合并记在 p.span。
   还是那句话 —— p.t 是坐标尺，所以表格既是真表格，也是一段能查、能改的文本。
   文本和格子哪边先变了都以 p.t 为准：对话框改完重拼文本，替换 / 查找动过文本就重拆格子。
   ============================================================ */
const OBJ_KINDS = ['img', 'table'];
const Tbl = {
  parse(t){ const s = String(t == null ? '' : t); if(!s) return [['']]; return s.split('\n').map(r => r.split('\t')); },
  textOf(g){ return (g || []).map(r => r.map(c => String(c == null ? '' : c).replace(/[\t\n\r]/g, ' ')).join('\t')).join('\n'); },
  cols(g){ return g.reduce((a, r) => Math.max(a, r.length), 1); },
  size(g){ return [g.length, this.cols(g)]; },
  /* 规整成矩形：短了的行补空列 */
  square(g, n){ return (g || []).map(r => { const x = r.slice(0, n); while(x.length < n) x.push(''); return x; }); },
  /* 合并表 → 哪些位置被盖住了（这些格子不渲染，文本留着当占位） */
  covered(dims, sp){
    const [R, C] = dims, off = new Set();
    for(const s of sp || []){
      if(!s || s.rs <= 1 && s.cs <= 1) continue;
      for(let r = s.r; r < Math.min(R, s.r + s.rs); r++)
        for(let c = s.c; c < Math.min(C, s.c + s.cs); c++)
          if(r !== s.r || c !== s.c) off.add(r + ',' + c);
    }
    return off;
  },
  at(sp, r, c){ return (sp || []).find(s => s.r === r && s.c === c) || null; },
  drop(sp, r, c){
    return (sp || []).filter(s => !(r >= s.r && r < s.r + s.rs && c >= s.c && c < s.c + s.cs));
  },
  /* 合并一片格子：非空的字并到左上角，其余清空，样式记进 sp 再还回去。
     编辑框里那条「合并」和正文就地右键用的是这一份，不另写第二套。 */
  mergeCells(g, sp, q){
    const rs = q.r1 - q.r0 + 1, cs = q.c1 - q.c0 + 1;
    if(rs <= 1 && cs <= 1) return sp;
    for(const [r, c] of [[q.r0, q.c0], [q.r0, q.c1], [q.r1, q.c0], [q.r1, q.c1]]) sp = this.drop(sp, r, c);
    const txt = [];
    for(let r = q.r0; r <= q.r1; r++) for(let c = q.c0; c <= q.c1; c++)
      if(g[r] && String(g[r][c] || '').trim()) txt.push(String(g[r][c]).trim());
    for(let r = q.r0; r <= q.r1; r++) for(let c = q.c0; c <= q.c1; c++) if(g[r]) g[r][c] = '';
    g[q.r0][q.c0] = txt.join(' ');
    sp.push({ r:q.r0, c:q.c0, rs, cs });
    return sp;
  },
  /* 一段样式表按表格走没意义，渲染只用 p.grid / p.span。
     格子带 data-r / data-c：就地拖拽和右键靠这两个坐标认格子。 */
  html(p){
    const g = this.parse(p.t), sp = Array.isArray(p.span) ? p.span : [];
    const off = this.covered(this.size(g), sp);
    let h = '<table class="wnw-tbl"><tbody>';
    for(let r = 0; r < g.length; r++){
      h += '<tr>';
      for(let c = 0; c < g[r].length; c++){
        if(off.has(r + ',' + c)) continue;
        const m = this.at(sp, r, c);
        let a = ' data-r="' + r + '" data-c="' + c + '"';
        if(m && m.rs > 1) a += ' rowspan="' + m.rs + '"';
        if(m && m.cs > 1) a += ' colspan="' + m.cs + '"';
        h += '<td' + a + '>' + (esc(g[r][c]) || '<br>') + '</td>';
      }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  },
  /* markdown / 纯文本里怎么落地：md 走 GFM（合并单元格 GFM 不认，被盖住的位置留空），
     txt 就是 tab + 换行的原样。 */
  md(b){
    const g = this.parse(b ? b.text : '');
    if(!g.length) return '';
    const n = this.cols(g);
    const row = r => '| ' + new Array(n).fill(0).map((_, c) => String((r[c] == null ? '' : r[c]) || '').replace(/\|/g, '\\|')).join(' | ') + ' |';
    return [row(g[0]), '|' + new Array(n).fill(' --- ').join('|') + '|'].concat(g.slice(1).map(row)).join('\n');
  }
};

/* 表格编辑框：先点一个定住左上，再 shift 点另一个定下范围，然后合并；点合并过的格子能拆开 */
const TblEdit = {
  open(p, onDone){
    let g = Tbl.square(Tbl.parse(p.t), Tbl.cols(Tbl.parse(p.t)));
    let sp = (Array.isArray(p.span) ? p.span : []).map(s => Object.assign({}, s));
    let a = null, b = null;
    const box = h('div', { class:'wnw-tbl-edit' });
    const st = h('div', { class:'wnw-tbl-bar' });
    const grid = h('div', { class:'wnw-tbl-grid' });
    const rect = () => {
      if(!a) return null;
      const x = a, y = b || a;
      return { r0:Math.min(x.r, y.r), c0:Math.min(x.c, y.c), r1:Math.max(x.r, y.r), c1:Math.max(x.c, y.c) };
    };
    const cellOf = (r, c) => g[r] && g[r][c] != null;
    const draw = () => {
      const n = Tbl.cols(g);
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = 'repeat(' + n + ',minmax(88px,1fr))';
      const off = Tbl.covered(Tbl.size(g), sp);
      const rc = rect();
      for(let r = 0; r < g.length; r++){
        for(let c = 0; c < n; c++){
          if(!cellOf(r, c)) continue;
          if(off.has(r + ',' + c)) continue;
          const m = Tbl.at(sp, r, c);
          const wrap = h('div', { class:'wnw-tbl-cell' + (m && (m.rs > 1 || m.cs > 1) ? ' merged' : '') +
            (rc && rc.r0 <= r && r <= rc.r1 && rc.c0 <= c && c <= rc.c1 ? ' sel' : '') });
          wrap.style.gridArea = (r + 1) + ' / ' + (c + 1) + ' / ' + (r + (m ? m.rs : 1) + 1) + ' / ' + (c + (m ? m.cs : 1) + 1);
          const inp = h('textarea', { class:'wnw-tbl-in', rows:String(m ? m.rs : 1), value:g[r][c] });
          inp.oninput = () => { g[r][c] = inp.value; };
          inp.onclick = ev => {
            ev.stopPropagation();
            if(m && (m.rs > 1 || m.cs > 1)){ sp = Tbl.drop(sp, r, c); draw(); return; }
            if(!ev.shiftKey){ a = { r, c }; b = null; } else b = { r, c };
            draw();
          };
          wrap.appendChild(inp);
          grid.appendChild(wrap);
        }
      }
    };
    const act = (label, tip, fn) => st.appendChild(h('button', { class:'wnw-btn mini w-txt', title:tip, html:label, onclick:() => { fn(); draw(); } }));
    act(icoMarkup('plus') + '行', '末尾加一行', () => { g.push(new Array(Tbl.cols(g)).fill('')); });
    act(icoMarkup('plus') + '列', '末尾加一列', () => { g = g.map(r => r.concat('')); sp = sp.filter(s => s.c < g[0].length); draw(); });
    act(icoMarkup('minus') + '行', '删掉最后一行', () => { if(g.length > 1){ const r = g.length - 1; g.pop(); sp = Tbl.drop(sp, r, 0); } });
    act(icoMarkup('minus') + '列', '删掉最后一列', () => { if(Tbl.cols(g) > 1){ const c = Tbl.cols(g) - 1; g = g.map(r => r.slice(0, c)); sp = sp.filter(s => s.c <= c && (s.c + s.cs - 1) < c); } });
    act('合并', '先点一个格子，再按住 Shift 点另一个，把这两个之间的格子并成一个', () => {
      const q = rect(); if(!q) return;
      sp = Tbl.mergeCells(g, sp, q);
      a = { r:q.r0, c:q.c0 }; b = null;
    });
    act('拆分', '把选中的合并格拆回原样', () => { const q = rect(); if(q) sp = Tbl.drop(sp, q.r0, q.c0); });
    const ok = () => {
      const n = Tbl.cols(g);
      g = Tbl.square(g, n).map(r => r.map(c => String(c == null ? '' : c).replace(/[\t\n\r]/g, ' ')));
      sp = sp.filter(s => s.r < g.length && s.c < n && s.rs >= 1 && s.cs >= 1);
      onDone({ grid:g, span:sp, t:Tbl.textOf(g) });
    };
    box.appendChild(st); box.appendChild(grid); box.appendChild(h('div', { class:'wnw-hint' }, '点一个格子上角，Shift 再点另一个 = 选中一片'));
    draw();
    Overlay.open('表格', box, [h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消'),
      h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); ok(); } }, '确定')], { wide:true });
  }
};

/* ============================================================
   正文里的表格就地可动：拖格子的右边和下边改列宽 / 行高，右键合并、拆分。
   动的还是那一套坐标尺 —— 结构写回 p.grid / p.span / p.t；拖出来的尺寸记进
   p.col（每列像素）/ p.row（每行像素），没拖过就没有这两行，表格照旧让浏览器自己排。
   格子里的字不到正文里改：还走「改表」那一张框，免得一处表格养两个输入口。
   ============================================================ */
const TblLive = {
  MIN_COL:32, MIN_ROW:22,
  /* 第一下手先量当下：列宽行高按实测打底，不然一拖就把别的行列挤回默认 */
  widths(tbl, n){
    const out = new Array(n).fill(0);
    for(const tr of tbl.rows) for(const td of tr.cells){
      const c = +td.getAttribute('data-c');
      if(!(c >= 0 && c < n) || td.colSpan > 1) continue;
      const w = Math.round(td.getBoundingClientRect().width);
      if(w > out[c]) out[c] = w;
    }
    for(let c = 0; c < n; c++) if(!out[c]) out[c] = 88;
    return out;
  },
  heights(tbl){ return [...tbl.rows].map(tr => Math.round(tr.getBoundingClientRect().height) || 28); },
  /* 记过列宽才上定宽布局；没记过的那几行照旧清空，不留旧值。
     记过之后不再被 100% 夹着 —— 夹一下浏览器会按比例缩列，量回来的宽度就对不上，越拖越歪。 */
  apply(tbl, p){
    const col = Array.isArray(p.col) ? p.col : [], row = Array.isArray(p.row) ? p.row : [];
    const old = tbl.querySelector('colgroup');
    if(old) old.remove();
    tbl.style.tableLayout = col.length ? 'fixed' : '';
    tbl.style.width = col.length ? (col.reduce((a, b) => a + b, 0) + 'px') : '';
    tbl.style.maxWidth = col.length ? 'none' : '';
    /* 定宽布局只认 colgroup 上那几道宽度：光给表格总宽，浏览器会把列平分 */
    if(col.length){
      const cg = document.createElement('colgroup');
      for(const w of col){
        const c = document.createElement('col');
        c.style.width = w + 'px';
        cg.appendChild(c);
      }
      tbl.insertBefore(cg, tbl.firstChild);
    }
    [...tbl.rows].forEach((tr, r) => { tr.style.height = row[r] ? row[r] + 'px' : ''; });
  },
  /* api：push() 按一下撤销快照 · commit() 重画并落快照
     改表框和删除这一段归宿主（正文左上角那个表格小图标）管，这里只管就地那几件 */
  bind(box, p, api){
    const tbl = box.querySelector('table.wnw-tbl');
    if(!tbl) return;
    /* 每次重画都要把记下来的列宽行高盖回去：格子是照 p.t 重新拼的，尺寸光靠一次 style 留不住 */
    this.apply(tbl, p);
    let sel = null, anchor = null;
    const dims = () => Tbl.size(Tbl.parse(p.t));
    const cells = () => [...tbl.querySelectorAll('td[data-r]')];
    const paint = () => {
      for(const td of cells()){
        const r = +td.getAttribute('data-r'), c = +td.getAttribute('data-c');
        td.classList.toggle('sel', !!sel && r >= sel.r0 && r <= sel.r1 && c >= sel.c0 && c <= sel.c1);
      }
    };
    const cellOf = ev => {
      const td = ev.target.closest ? ev.target.closest('td[data-r]') : null;
      return td && tbl.contains(td) ? { td, r:+td.getAttribute('data-r'), c:+td.getAttribute('data-c') } : null;
    };
    const box2 = (x, y) => ({ r0:Math.min(x.r, y.r), c0:Math.min(x.c, y.c), r1:Math.max(x.r, y.r), c1:Math.max(x.c, y.c) });
    /* 改结构：拿 p.t 重拆一份格子，动完写回坐标尺，再让宿主重画 */
    const restruct = (q, kind) => {
      api.push();
      const g = Tbl.square(Tbl.parse(p.t), Tbl.cols(Tbl.parse(p.t)));
      let sp = (Array.isArray(p.span) ? p.span : []).map(s => Object.assign({}, s));
      sp = kind === 'merge' ? Tbl.mergeCells(g, sp, q) : Tbl.drop(sp, q.r0, q.c0);
      const was = p.t;
      p.grid = g; p.span = sp; p.t = Tbl.textOf(g);
      shiftRuns(p, was, p.t);
      sel = null; anchor = null;
      api.commit();
    };
    /* 拖一条边：按下先量一遍，真拖动了才按一下撤销快照（点一下手就松开不该多一步撤回） */
    const drag = (ev, td, kind) => {
      ev.preventDefault(); ev.stopPropagation();
      const [R, C] = dims();
      const r = +td.getAttribute('data-r'), c = +td.getAttribute('data-c');
      const col = (Array.isArray(p.col) && p.col.length >= C ? p.col.slice() : this.widths(tbl, C));
      const row = (Array.isArray(p.row) && p.row.length >= R ? p.row.slice() : this.heights(tbl));
      const list = kind === 'col' ? col : row;
      const i = kind === 'col' ? c : r;
      const min = kind === 'col' ? this.MIN_COL : this.MIN_ROW;
      const p0 = kind === 'col' ? ev.clientX : ev.clientY;
      const w0 = list[i] || (kind === 'col' ? this.widths(tbl, C)[i] : this.heights(tbl)[i]);
      let pushed = false;
      const move = e => {
        const d = (kind === 'col' ? e.clientX : e.clientY) - p0;
        if(!pushed && Math.abs(d) >= 2){ pushed = true; api.push(); }
        if(!pushed) return;
        list[i] = Math.max(min, Math.round(w0 + d));
        if(kind === 'col') p.col = col; else p.row = row;
        this.apply(tbl, p);
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        if(!pushed) return;
        if(kind === 'col') p.col = col; else p.row = row;
        api.commit();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    };
    for(const td of cells()){
      /* 跨行列的格子拖一条边说不清要改哪一列，所以那种格子上不给把手 */
      if(td.colSpan === 1){ const i = h('i', { class:'wnw-tbl-rz col', title:'拖动改这一列的宽度' }); td.appendChild(i); i.addEventListener('mousedown', ev => drag(ev, td, 'col')); }
      if(td.rowSpan === 1){ const i = h('i', { class:'wnw-tbl-rz row', title:'拖动改这一行的高度' }); td.appendChild(i); i.addEventListener('mousedown', ev => drag(ev, td, 'row')); }
    }
    tbl.addEventListener('mousedown', ev => {
      if(ev.target.closest && ev.target.closest('.wnw-tbl-rz')) return;
      const z = cellOf(ev);
      ev.preventDefault();
      if(!z){ sel = null; anchor = null; paint(); return; }
      if(ev.shiftKey && anchor) sel = box2(anchor, z);
      else { anchor = { r:z.r, c:z.c }; sel = { r0:z.r, c0:z.c, r1:z.r, c1:z.c }; }
      paint();
    });
    tbl.addEventListener('contextmenu', ev => {
      const z = cellOf(ev);
      if(!z) return;
      ev.preventDefault();
      const inSel = sel && z.r >= sel.r0 && z.r <= sel.r1 && z.c >= sel.c0 && z.c <= sel.c1;
      if(!inSel){ anchor = { r:z.r, c:z.c }; sel = { r0:z.r, c0:z.c, r1:z.r, c1:z.c }; paint(); }
      const wide = sel && (sel.r1 > sel.r0 || sel.c1 > sel.c0);
      const merged = Tbl.at(Array.isArray(p.span) ? p.span : [], z.r, z.c);
      const items = [];
      /* 不支持的组合不摆：单选一片时没有可合并的，非合并原点没有可拆的 */
      if(wide) items.push({ label:'合并这一片', fn:() => restruct(sel, 'merge') });
      if(merged && (merged.rs > 1 || merged.cs > 1)) items.push({ label:'拆分这一格', fn:() => restruct({ r0:z.r, c0:z.c, r1:z.r, c1:z.c }, 'split') });
      if(items.length) items.push({ sep:true });
      items.push({ label:'取消选择', fn:() => { sel = null; anchor = null; paint(); } });
      Menu.open(ev.clientX, ev.clientY, items);
    });
    paint();
  }
};

addCss(`
.wnw-obj{flex:1;min-width:0;padding:2px 0;overflow-x:auto}
.wnw-doc-inner .wnw-blk.k-img{align-items:flex-start}
.wnw-img{max-width:100%;border-radius:var(--r-btn,5px);display:block;margin:2px 0}
.wnw-img-lose{color:var(--bad,#c0453a);font-size:.9em}
.wnw-obj-bar{display:flex;gap:6px;margin-top:4px}
.wnw-doc-inner .wnw-blk.k-table{align-items:flex-start}
table.wnw-tbl{border-collapse:collapse;font-size:1em;width:auto;max-width:100%}
.wnw-tbl td{position:relative;border:1px solid var(--input-border,rgba(0,0,0,.16));padding:4px 8px;vertical-align:top}
/* 就地选中：底色 + 内描边（outline 在 border-collapse 的格子上会被裁，所以走 box-shadow 内侧） */
.wnw-tbl td.sel{background:var(--accent-light,rgba(74,122,208,.16));box-shadow:inset 0 0 0 2px var(--accent,#4a7ad0)}
/* 拖把手：平时不露面，鼠标进了这张表格才显出来，压在格子上但只有 6px 一条 */
.wnw-tbl-rz{position:absolute;opacity:0}
.wnw-tbl-rz.col{z-index:2;top:0;bottom:0;right:-3px;width:6px;cursor:col-resize}
.wnw-tbl-rz.row{left:0;right:0;bottom:-3px;height:6px;cursor:row-resize}
.wnw-tbl:hover .wnw-tbl-rz{opacity:1}
.wnw-tbl-rz:hover{background:var(--accent,#4a7ad0)}
.wnw-tbl-edit{display:flex;flex-direction:column;gap:8px}
.wnw-tbl-bar{display:flex;gap:6px;flex-wrap:wrap}
.wnw-tbl-grid{display:grid;gap:3px}
.wnw-tbl-cell{display:flex}
.wnw-tbl-cell.sel{outline:2px solid var(--accent,#4a7ad0);outline-offset:1px}
.wnw-tbl-in{flex:1;min-width:70px;font:inherit;padding:4px 6px;border:1px solid var(--input-border,rgba(0,0,0,.16));
  border-radius:var(--r-btn,5px);background:var(--input-bg,transparent);color:inherit;resize:vertical}
.wnw-tbl-cell.merged .wnw-tbl-in{background:var(--accent-light,rgba(74,122,208,.14))}
`);
