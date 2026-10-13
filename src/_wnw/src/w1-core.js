/* ============================================================
   WNW 基础件
   h() / toast / 复制 / IDB 状态 / 词库读取
   ============================================================ */
function h(tag, props, kids){
  const n = document.createElement(tag);
  if(props) for(const k in props){
    if(k === 'class') n.className = props[k];
    else if(k === 'style') n.style.cssText = props[k];
    else if(k === 'html') n.innerHTML = props[k];
    else if(k.startsWith('on')) n.addEventListener(k.slice(2), props[k]);
    else if(k === 'checked' || k === 'disabled' || k === 'selected' || k === 'value' || k === 'indeterminate') n[k] = props[k];
    else if(props[k] !== undefined && props[k] !== null) n.setAttribute(k, props[k]);
  }
  (Array.isArray(kids) ? kids : kids === undefined || kids === null ? [] : [kids]).forEach(c => {
    if(c === null || c === undefined || c === false) return;
    n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  });
  /* 下拉项一长就被截断，option 自己带 title，悬停能看全（书名 / 模板名 / 分组名都是用户起的长名字） */
  if(n.tagName === 'OPTION' && !n.title) n.title = n.textContent;
  return n;
}
/* 第 7 条：字被框子切掉的地方，鼠标扫过给个原生 tooltip 看全文。
   文案一律不压短、框子也不拉长 —— 装不下还是省略号收着，全文靠悬停看。
   挑中这些是各视图里现成的截断位：名字（.tx/.nm/.ttl/.sub/.cd/.k）、提示小字（.wnw-hint）、
   音乐控件那三行（.mu-t/.mu-a/.mu-src）、字体行（.ff-cur/.ff-nm），外加inline 写了省略号的（style 里带 text-overflow）。
   挂在文档上统一处理，各视图不用每处自己记得写 title；已经写过 title 的（按钮上的说明）不覆盖。
   只有真被切了才补 —— scrollWidth 比 clientWidth 宽那一横才写，没切掉的不动。 */
const TIP_SEL = '.tx,.nm,.ttl,.sub,.cd,.k,.wnw-hint,.mu-t,.mu-a,.mu-src,.mu-dirpath,.ff-cur,.ff-nm,[style*="text-overflow"]';
/* ---------- 伸向整页的手：收进容器 ----------
   下面这两件从前是脚本一求值就挂在 window 上的：TIP_SEL 里全是 .tx/.nm/.ttl 这种裸类名，
   宿主页面上别的卡片也在用这一族名字，挂上去就是替为写管别人的悬停提示；Ctrl+S 那条更是
   在整张页上抢快捷键。现在两样都只在容器上听，随 stop 成对摘掉。
   容器自己那一层还在文档里，事件从里头冒到容器就被接住，效果跟从前对等。 */
function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
/* ---------- 第 24 条：Ctrl/⌘+S 手动保存 ----------
   哪些地方改了东西要按「保存」，各视图自己清楚，这里不挨个记：
   从当前焦点往上找，头一个装着「保存」那个按钮的容器就是现在这一层（浮层 / 对话框 / 面板），
   替用户把它按下去。焦点落在空处就退回最上面那层浮层，再没有就是当前这一屏。
   正文和章纲的编辑器自己有 Ctrl+S（那条先跑，跑到就不来这儿了）。
   这一个只在窗口有焦点时管用 —— 程序不抢后台全局快捷键，见设置的「快捷键」那档。 */
const SAVE_TXT = /^(保存|保 存)$/;
function saveBtnAt(node){
  if(!node || !node.querySelectorAll) return null;
  for(const b of node.querySelectorAll('button'))
    if(!b.disabled && b.offsetParent && SAVE_TXT.test((b.textContent || '').trim())) return b;
  return null;
}
function saveBtnNow(){
  const box = wnwRoot();
  if(!box) return null;
  let el = document.activeElement;
  /* 往上爬的时候不许爬出容器：爬到别人那儿按下去的就是别人的保存钮 */
  for(let i = 0; el && el !== box && i < 14; el = el.parentElement, i++){
    const hit = saveBtnAt(el);
    if(hit) return hit;
  }
  const ov = typeof Overlay !== 'undefined' && Overlay.node ? Overlay.node : null;
  const inOv = ov ? saveBtnAt(ov) : null;
  if(inOv) return inOv;
  /* 没有浮层就找当前这一屏（中栏是正对着的那一页，右栏停靠面板也算一屏） */
  return saveBtnAt(box.querySelector('.wnw-mid')) || saveBtnAt(box.querySelector('.wnw-dock-list')) || null;
}
function wnwBindChrome(host){
  wnwOn(host, 'mouseover', ev => {
    const el = ev.target && ev.target.closest ? ev.target.closest(TIP_SEL) : null;
    if(!el || !host.contains(el)) return;
    const full = (el.textContent || el.value || '').trim();
    if(!full) return;
    if(el.scrollWidth > el.clientWidth + 1){ if(!el.title) el.title = full; }
    else if(el.title === full) el.removeAttribute('title');
  }, true);
  wnwOn(host, 'keydown', ev => {
    if(ev.isComposing || ev.keyCode === 229) return;
    if(!(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey) return;
    if(String(ev.key || '').toLowerCase() !== 's') return;
    if(ev.defaultPrevented) return;
    const b = saveBtnNow();
    if(!b) return;
    ev.preventDefault();
    b.click();
  });
}
let toastTimer = null;
function toast(msg){
  const box = wnwRoot();
  const t = box && box.querySelector('#wnwToast');
  if(!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2000);
}
/* 生成结果的去向由用户定，所以这里只负责把文本送进剪贴板；
   iframe 里 navigator.clipboard 可能被权限挡掉，留一条 execCommand 的退路。 */
async function copyText(text){
  try{
    if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); return true; }
  }catch(e){}
  try{
    const ta = h('textarea', { style:'position:fixed;left:-9999px;top:0' }); ta.value = text;
    (wnwRoot() || document.body).appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove(); return ok;
  }catch(e){ return false; }
}
function copyBtn(text, label){
  return h('button', { class:'wnw-btn mini', onclick:async () => {
    const v = await (typeof text === 'function' ? text() : text);
    toast(await copyText(v) ? '已复制到剪贴板' : '复制失败，请手动选中');
  }}, label || '复制');
}
/* 存成文件：不用 File System Access 的老办法，程序和本地开发那台服务器两种开法都通。
   text 给字符串按纯文本打包；给 Blob（Word 那种二进制）就直接用。 */
function download(name, text){
  const blob = typeof text === 'string' ? new Blob([text], { type:'text/plain;charset=utf-8' }) : text;
  const a = h('a', { href:URL.createObjectURL(blob), download:name || 'wnw.txt' });
  (wnwRoot() || document.body).appendChild(a);
  a.click();
  /* 这一根拉条是发完就没人要的：摘掉顺手把 blob 也放掉，别在容器里攒一堆 */
  const gone = () => { if(a.isConnected){ URL.revokeObjectURL(a.href); a.remove(); } };
  setTimeout(gone, 4000);
}
const Bus = {
  map:{},
  on(k, f){
    (this.map[k] = this.map[k] || []).push(f);
    return () => {
      const a = this.map[k];
      if(!a) return;
      const i = a.indexOf(f);
      if(i >= 0) a.splice(i, 1);
    };
  },
  emit(k, a){ (this.map[k] || []).slice().forEach(f => { try{ f(a); }catch(e){ console.error(e); } }); }
};
/* randInt / pickOne / shuffle 不在这里定义了：外27 全清第 1 条并进了 _shared/sh-rand.js，
   闭包里往外读得到那一个，两家改一处两头都跟着变。 */

/* ---------- 状态：WNW 自己的表单记忆，与 FD / RP 的库完全分开 ----------
   IndexedDB 递不动的这一框（这台机器不让这一页用库）一律回落 localStorage；
   两条路都写不通才退到内存，并在顶栏挂一条明说"刷新就没了"的红条。
   #118 那三条规矩（开库读写都有截止时间、等事务真提交、降级要报原因）写在 _shared/sh-store.js 里：
   idbOpen / idbRun / reasonOf / IDB_MS 都从那儿来，Flow-Desk 的数据层吃的是同一个。 */
const LS = {
  ok:(() => { try{ localStorage.setItem('__wnw__', '1'); localStorage.removeItem('__wnw__'); return true; }catch(e){ return false; } })(),
  get(k){ try{ const s = localStorage.getItem(k); return s === null ? undefined : JSON.parse(s); }catch(e){ return undefined; } },
  put(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} },
  keys(prefix){ try{ return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }catch(e){ return []; } }
};
/* 存储后端：idb > localStorage > 内存。用的是哪一个、为什么换，都留在 kv.why / kv.err 里给界面说 */
async function mkKv(name, store){
  let why = '';
  try{
    const db = await idbOpen(name, store);
    /* 别的窗口要改版本号时先松手，不然两边互相等死 */
    db.onversionchange = () => { try{ db.close(); }catch(e){} };
    const back = {
      kind:'idb', name, store, db, err:'',
      async get(k){
        try{ return await idbRun(db, store, 'readonly', (os, put) => { const rq = os.get(k); rq.onsuccess = () => put(rq.result); }, '读'); }
        catch(e){ this.err = e.message; return undefined; }
      },
      async put(k, v){
        try{ await idbRun(db, store, 'readwrite', os => os.put(v, k), '存'); return true; }
        catch(e){ this.err = e.message; return false; }
      },
      async del(k){ try{ await idbRun(db, store, 'readwrite', os => os.delete(k), '删'); }catch(e){ this.err = e.message; } },
      async keys(prefix){
        try{
          const ks = await idbRun(db, store, 'readonly', (os, put) => { const rq = os.getAllKeys(); rq.onsuccess = () => put(rq.result); }, '列') || [];
          /* 前缀得自己筛：不筛的话 many('book.x.ch.') 会把全库都当成这本书的章节捞出来 */
          return ks.filter(k => String(k).startsWith(prefix));
        }
        catch(e){ this.err = e.message; return []; }
      }
    };
    return back;
  }catch(e){ why = e.message; }
  if(LS.ok) return {
    kind:'ls', why, prefix:'wnw:' + name + ':', err:'',
    async get(k){ return LS.get(this.prefix + k); },
    async put(k, v){ const ok = LS.put(this.prefix + k, v); if(!ok) this.err = '这台机器的本地存储写不进去（可能满了）'; return ok; },
    async del(k){ LS.del(this.prefix + k); },
    async keys(prefix){ return LS.keys(this.prefix + prefix).map(k => k.slice(this.prefix.length)); }
  };
  return { kind:'mem', why:why || '这台机器连本地存储都不给用', mem:new Map(), err:'只存在内存里，刷新就没了',
    async get(k){ return this.mem.has(k) ? this.mem.get(k) : undefined; },
    async put(k, v){ this.mem.set(k, v); return true; },
    async del(k){ this.mem.delete(k); },
    async keys(prefix){ return [...this.mem.keys()].filter(k => k.startsWith(prefix)); }
  };
}
const State = {
  kv:null, mem:new Map(), warnShown:false,
  async init(){
    if(this.kv) return this.kv;
    const kv = await mkKv('wnw-state', 'kv');
    this.kv = kv;
    if(kv.kind !== 'idb') Storage.warn(kv.kind, kv.why);
    return kv;
  },
  async get(key, fb){
    if(this.mem.has(key)) return this.mem.get(key);
    const kv = await this.init();
    const v = await kv.get(key);
    if(v !== undefined){ this.mem.set(key, v); return v; }
    return fb;
  },
  set(key, val){
    this.mem.set(key, val);
    this.init().then(kv => kv.put(key, val)).then(ok => {
      if(ok === false) toast('设置没存上：' + (this.kv.err || '本地存储写不进去'));
    }).catch(e => toast('设置没存上：' + reasonOf(e)));
  }
};
/* 存储降级提示：只在真降级时说一次，并且说清是被什么挡住才降的级 */
const Storage = {
  said:false,
  warn(kind, why){
    if(this.said) return; this.said = true;
    const extra = why ? '（' + why + '）' : '';
    this.show(kind, extra);
  },
  show(kind, extra){
    const box = wnwRoot();
    if(!box || box.querySelector('.wnw-warn')) return;
    const t = kind === 'ls'
      ? '当前用 localStorage 存稿' + extra + '。够写一整本书，但换一台机器读不到，记得去设置里的备份那一页导出 JSON。'
      : '这台机器连本地存储都不给用' + extra + '，本轮改动刷新就没了。请立刻去设置里的备份那一页导出 JSON。';
    box.appendChild(h('div', { class:'wnw-warn', onclick:ev => ev.target.remove() }, t));
  }
};

/* mkBank / Banks 在 sh-banks.js 那一份里（外39 起它住 _wcustom/src/，和生成器、向导、改代码那三份同一棵）：WNW 和 FD 共用一份词库层，
   本文件只提供 h() / toast() / State / Bus 这些外壳件。 */

