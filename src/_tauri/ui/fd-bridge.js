/* Flow-Desk 的壳 · 页面上那套功能的落点（这一份就是桥的原件，要改桥就改这里）
   2026-10-13 起它不再是生成物：从前由 src\_tauri\bridge.mjs 读 Electron 那份桥产出，
   撤掉 Electron 那一步把它转成源码 —— 转之前量过，盘上这一份与生成器产出的一字不差。
   里面那张「哪颗命令收哪几栏」的表（下面的 参表）由每一趟自检对着壳里的声明量：
   判据在 src\tools\probes\gate-bridge46.mjs，它自己独立读 Rust 那一头，不抄这里的写法。
   壳里已搬通的命令：65 颗 · 桥里请壳的地方：69 处 */
'use strict';
/* ============================================================
   Electron 里没有 File System Access API，而 FD/WNW 的"选文件、选目录、写明文"
   全建在那套 API 上。这里按它们实际用到的那一小块形状，用原生对话框 + 主进程读写补一层，
   让现成的 html 一行不改就能在 app 里跑。
   contextIsolation 是关的，所以这里和页面共用同一个 window；nodeIntegration 仍然关着，
   页面自己拿不到 require，磁盘操作只能过 ipc 那几条固定的口子。
   ============================================================ */
/* 这一份是生成物，别手改：node src/_tauri/bridge.mjs
   原身是主程序那一棵的 src\pack\preload.cjs —— 只换最上面那层传送，页面看见的形状一个字不改。
   下面这段是壳这边独有的：请壳的名按 Rust 的规矩换算，参数按壳里命令声明的顺序对上去。 */
/* 这一层跑在文档最开头（壳那边是 initialization_script），那一刻 Tauri 的全局接口还没注进来，
   一次拿死会当场抛一句「没在壳里打开」然后整个桥不挂 —— 2026-10-12 无窗跑真页量到的就是这一手。
   所以改成用到才拿：页面真请壳的时候再认，认不到还是报那一句。 */
function 拿壳(){
  const 壳 = window.__TAURI__;
  if(!壳 || !壳.core) throw new Error('这一张页面没在 Flow-Desk 的壳里打开（拿不到 window.__TAURI__）');
  return 壳;
}
const 请壳 = (n, 包) => 拿壳().core.invoke(n, 包);
const 听壳 = (n, 手) => { const 壳 = window.__TAURI__;
  return (壳 && 壳.event) ? 壳.event.listen(n, 手) : Promise.reject(new Error('壳没给事件那一层')); };
const 参表 = {"backup_roots":[],"backup_run":["cfg"],"backup_last":["dest"],"backup_check":["cfg"],"cfg_close_get":[],"cfg_close_set":["mode"],"cfg_rime_get":[],"cfg_rime_set":["p"],"code_cat_rename":["from","to"],"comp_read":["id","rel"],"comp_list":["id"],"comp_write":["id","rel","text"],"comp_delete":["id"],"comp_restore":["id","rel"],"comp_factory":["id"],"data_dir":[],"data_read":["rel"],"data_write":["rel","text"],"data_list":[],"data_wipe":[],"lib_read":["name"],"lib_write":["name","text"],"fs_read":["p"],"fs_read_range":["p","start","length"],"fs_stat":["p"],"fs_write":["p","data","mkdir"],"fs_append":["p","text"],"fs_mkdir":["p"],"fs_unlink":["p","recursive"],"fs_list":["p"],"fs_tree":["p","exts"],"fs_read_text":["p"],"fs_resolve":["p"],"img_peek":["p","maxw"],"img_open":["p"],"icons_list":[],"font_list":["force"],"about_info":[],"ming_system":[],"ocr_swatch":["p"],"media_state":[],"media_hold":[],"media_release":[],"media_cmd":["msg"],"media_players":[],"media_pin":["target"],"media_dir_pick":[],"media_dir_set":["p"],"media_flag":["k","v"],"media_bridge":[],"pack_list":[],"pack_file":["id","rel"],"pack_set":["ids"],"pack_import":["payload"],"pack_wipe":["files","shared"],"fsa_pick_files":["opts"],"fsa_pick_dir":["opts"],"sys_rebuild":[],"vol_get":[],"vol_set":["v"],"vol_mute":["mode"],"web_title":["url"],"win_ctl":["act"],"app_restart":[],"win_close_answer":["action"]};
const 名换算 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const 对不上 = (n, 有, 递) => {
  if(递 <= 有) return true;
  throw new Error('壳里那颗命令收不了这么多栏：' + n + '（壳里 ' + 有 + ' 栏，页面上递了 ' + 递 + ' 栏）');
};
const 收 = {};
function 起监听(n){
  if(收[n] || !听壳) return;
  收[n] = [];
  听壳(n, ev => { (收[n] || []).slice().forEach(f => { try{ f(null, ev.payload); }catch(e){} }); })
    .then(撤 => { 收[n + '·撤'] = 撤; })
    .catch(() => {});
}
const ipcRenderer = {
  invoke(name, ...args){
    const 命 = 名换算(name);
    if(!Object.prototype.hasOwnProperty.call(参表, 命))
      return Promise.reject(new Error('这颗通道还没搬进壳：' + name));
    const 栏 = 参表[命];
    对不上(name, 栏.length, args.length);
    const 包 = {};
    栏.forEach((k, i) => { if(i < args.length && args[i] !== undefined) 包[k] = args[i]; });
    return 请壳(命, 包);
  },
  send(name, ...args){ this.invoke(name, ...args).catch(() => {}); },
  on(name, fn){ 起监听(name); if(收[name]) 收[name].push(fn); return ipcRenderer; },
  removeListener(name, fn){
    const 列 = 收[name];
    if(列){ const i = 列.indexOf(fn); if(i >= 0) 列.splice(i, 1); }
    if(收[name] && !收[name].length){
      const 撤 = 收[name + '·撤'];
      if(撤){ 撤(); delete 收[name + '·撤']; }
      delete 收[name];
    }
  },
};

function join(a, b){ return a.replace(/[\\/]+$/, '') + '\\' + String(b).replace(/^[\\/]+/, ''); }
function base(p){ return p.replace(/[\\/]+$/, '').split(/[\\/]/).pop(); }
function dirnameOf(p){ const s = String(p == null ? '' : p).replace(/[\\/]+$/, ''); const i = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/')); return i < 0 ? '' : s.slice(0, i); }
function err(name, msg){ const e = new Error(msg); e.name = name; return e; }

async function statOf(p){ return await ipcRenderer.invoke('fs:stat', p); }

class FsaFile {
  constructor(full){ this.kind = 'file'; this._p = full; }
  get name(){ return base(this._p); }
  async queryPermission(){ return 'granted'; }
  async requestPermission(){ return 'granted'; }
  async getFile(){
    const r = await ipcRenderer.invoke('fs:read', this._p);
    const f = new File([r.data], r.name, { type: r.type });
    try{ Object.defineProperty(f, 'lastModified', { value: r.lastModified }); }catch(e){}
    return f;
  }
  /* 内嵌歌词在文件头部的标签里：只问主进程要那一段，别为一行歌词搬整首歌 */
  async size(){ const st = await statOf(this._p); return st && st.exists ? (st.size || 0) : 0; }
  async readRange(start, length){ return await ipcRenderer.invoke('fs:readRange', this._p, start, length); }
  async createWritable(){
    const p = this._p, chunks = [];
    return {
      get writable(){ return true; },
      async write(d){
        if(typeof d === 'string') chunks.push(new TextEncoder().encode(d));
        else if(d instanceof Uint8Array || d instanceof ArrayBuffer) chunks.push(new Uint8Array(d));
        else if(d && typeof d.arrayBuffer === 'function') chunks.push(new Uint8Array(await d.arrayBuffer()));
        else chunks.push(new TextEncoder().encode(String(d)));
      },
      async seek(){}, async truncate(){},
      async close(){
        const n = chunks.reduce((a, c) => a + c.length, 0), all = new Uint8Array(n);
        let o = 0; for(const c of chunks){ all.set(c, o); o += c.length; }
        await ipcRenderer.invoke('fs:write', p, all, true);
      }
    };
  }
  async isSameEntry(o){ return !!(o && o._p === this._p); }
}

class FsaDir {
  constructor(full){ this.kind = 'directory'; this._p = String(full).replace(/[\\/]+$/, ''); }
  get name(){ return base(this._p) || this._p; }
  async queryPermission(){ return 'granted'; }
  async requestPermission(){ return 'granted'; }
  async getDirectoryHandle(name, opts){
    const p = join(this._p, name);
    if(!(opts && opts.create)){
      const st = await statOf(p);
      if(!st.exists || !st.isDirectory) throw err('NotFoundError', '没有这个子目录：' + name);
    }
    return new FsaDir(p);
  }
  async getFileHandle(name, opts){
    const p = join(this._p, name);
    if(!(opts && opts.create)){
      const st = await statOf(p);
      if(!st.exists || st.isDirectory) throw err('NotFoundError', '没有这个文件：' + name);
    }
    return new FsaFile(p);
  }
  async *entries(){
    for(const e of await ipcRenderer.invoke('fs:list', this._p))
      yield [e.name, e.kind === 'directory' ? new FsaDir(join(this._p, e.name)) : new FsaFile(join(this._p, e.name))];
  }
  async *values(){ for await (const [, h] of this.entries()) yield h; }
  async *keys(){ for await (const [n] of this.entries()) yield n; }
  [Symbol.asyncIterator](){ return this.entries(); }
  async isSameEntry(o){ return !!(o && o._p === this._p); }
}

window.showOpenFilePicker = async (opts) => {
  const o = opts || {};
  const r = await ipcRenderer.invoke('fsa:pickFiles', {
    multiple: !!o.multiple, accept: o.types && o.types[0] ? o.types[0].accept : null,
    /* id 原样递下去：主进程拿它当「这一处该记在哪个键上」的号（外21 乙-1 记上次路径） */
    id: o.id || '',
    title: (o.types && o.types[0] && o.types[0].description) || '选文件'
  });
  if(!r.paths.length) throw err('AbortError', '用户取消了选择');
  return r.paths.map(p => new FsaFile(p));
};
window.showDirectoryPicker = async (opts) => {
  const r = await ipcRenderer.invoke('fsa:pickDir', { title: (opts && opts.id) || '选目录', id: (opts && opts.id) || '' });
  if(!r.paths.length) throw err('AbortError', '用户取消了选择');
  return new FsaDir(r.paths[0]);
};

/* ---------- 句柄要能存进 IndexedDB ----------
   真句柄是页面那一层的对象，我们的假句柄带方法、克隆不了，所以存的时候只落绝对路径，
   取的时候再包回句柄。页面那套 IDB 代码完全不知道发生过这件事。 */
const MARK = '__fdHandlePath';
function encode(v){
  if(v instanceof FsaFile || v instanceof FsaDir){ const o = {}; o[MARK] = v._p; o.kind = v.kind; return o; }
  return v;
}
function decode(v){
  if(v && typeof v === 'object' && typeof v[MARK] === 'string')
    return v.kind === 'directory' ? new FsaDir(v[MARK]) : new FsaFile(v[MARK]);
  return v;
}
if(typeof IDBObjectStore !== 'undefined'){
  const rawPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function(value, key){
    return key === undefined ? rawPut.call(this, encode(value)) : rawPut.call(this, encode(value), key);
  };
  const rawGet = IDBObjectStore.prototype.get;
  IDBObjectStore.prototype.get = function(key){
    const rq = rawGet.call(this, key);
    const fake = { result: undefined, error: null, readyState:'pending', onsuccess:null, onerror:null,
      transaction: rq.transaction, source: rq.source,
      addEventListener: (t, f) => rq.addEventListener(t === 'success' ? 'success' : t, f),
      _fire(){
        fake.readyState = 'done';
        if(rq.error){ fake.error = rq.error; if(typeof fake.onerror === 'function') fake.onerror({ target: fake }); }
        else { fake.result = decode(rq.result); if(typeof fake.onsuccess === 'function') fake.onsuccess({ target: fake }); }
      } };
    rq.addEventListener('success', () => fake._fire());
    rq.addEventListener('error', () => fake._fire());
    return fake;
  };
}

const 开壳 = window.__FD_BOOT__ || { root: '', which: 'fd', pages: '', data: '' };
const ROOT = 开壳.root, WHICH = 开壳.which;
/* fdapp:// 的门牌是从 pages\ 起算的：页面挂在根上，数据层带一个 data/ 开头（见 main.cjs 的 toUrl/serve）。
   地址要换算回磁盘就得按同一套口径，所以主进程把两层各自的目录也递一份过来。 */
const PAGES_DIR = 开壳.pages || ROOT;
const DATA_DIR = 开壳.data || join(ROOT, 'data');
/* 盘上有没有那一格由壳回答，这里不再直接摸磁盘 */

/* ---------- 关窗口时那个确认框 ----------
   三个程序共用一份实现，所以做在兼容层里而不是各页面里。颜色全用页面上现成的
   CSS 变量：FD 是哪套配色这个框就是哪套，WNW/RP 同理。 */
const CLOSE_CSS = [
  '.fdq-mask{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.34)}',
  '.fdq-box{min-width:340px;max-width:min(460px,86vw);padding:20px 22px 18px;border-radius:var(--r-card,5px);background:var(--card-bg,#fff);color:var(--text,#111);font:14px/1.6 system-ui,"Microsoft YaHei",sans-serif;border:1px solid var(--input-border,rgba(0,0,0,.14));box-shadow:0 18px 48px rgba(0,0,0,.32)}',
  '.fdq-t{font-size:16px;font-weight:600;margin-bottom:4px}',
  '.fdq-d{color:var(--text-light,#666);margin-bottom:12px}',
  '.fdq-r{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}',
  '.fdq-b{padding:7px 14px;border-radius:var(--r-btn,5px);cursor:pointer;font:inherit;background:var(--btn-bg,rgba(0,0,0,.05));color:var(--text,#111);border:1px solid var(--input-border,rgba(0,0,0,.14))}',
  '.fdq-b[data-a="quit"]{background:var(--bad,#c0453a);border-color:var(--bad,#c0453a);color:#fff}',
  '.fdq-b[data-a="tray"]{background:var(--accent,#4a7ad0);border-color:var(--accent,#4a7ad0);color:#fff}',
  '.fdq-c{display:flex;gap:7px;align-items:center;margin:12px 0 16px;color:var(--text-light,#666);font-size:13px;user-select:none;cursor:pointer}',
  '.fdq-c input{width:15px;height:15px;margin:0;accent-color:var(--accent,#4a7ad0)}'
].join('\n');

function closeAsk(){
  /* 界面上没有待存的东西了：改字在开发期那个独立工具里存盘，关闭这里只管「收托盘还是退出」。
     以前这一趟开头还要先问一句「清单编辑框里有没保存的改动」，那两个编辑框已经撤掉了。 */
  const old = document.querySelector('.fdq-mask');
  if(old) old.remove();
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  };
  const mask = el('div', 'fdq-mask');
  const box = el('div', 'fdq-box');
  const title = el('div', 'fdq-t', '关闭 ' + (window.FD_APP.label || '窗口'));
  const desc = el('div', 'fdq-d', '要收进托盘，还是整个退出？');
  const row = el('div', 'fdq-r');
  const cancel = el('button', 'fdq-b', '取消');
  const quit = el('button', 'fdq-b', '退出');
  quit.dataset.a = 'quit';
  const tray = el('button', 'fdq-b', '最小化到托盘');
  tray.dataset.a = 'tray';
  const remember = document.createElement('input');
  remember.type = 'checkbox';
  const lab = el('label', 'fdq-c');
  lab.appendChild(remember);
  lab.appendChild(document.createTextNode('记忆本次选择，下次不再提醒'));
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(lab);
  row.appendChild(cancel);
  row.appendChild(quit);
  row.appendChild(tray);
  box.appendChild(row);
  mask.appendChild(box);
  if(!document.getElementById('fdq-style')){
    const st = document.createElement('style');
    st.id = 'fdq-style';
    st.textContent = CLOSE_CSS;
    document.head.appendChild(st);
  }
  let closed = false;
  const onKey = e => {
    /* 输入法正在拼字的时候别把按键当成快捷键 */
    if(e.isComposing || e.keyCode === 229) return;
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); done('cancel'); }
  };
  const done = action => {
    if(closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    mask.remove();
    if(action !== 'cancel' && remember.checked) window.FD_APP.setCloseChoice(action);
    ipcRenderer.send('win:closeAnswer', action);
  };
  cancel.onclick = () => done('cancel');
  tray.onclick = () => done('tray');
  quit.onclick = () => done('quit');
  mask.addEventListener('mousedown', e => { if(e.target === mask) done('cancel'); });
  document.addEventListener('keydown', onKey, true);
  (document.body || document.documentElement).appendChild(mask);
  tray.focus();
}

window.FD_APP = {
  which: WHICH, root: ROOT, label: 开壳.label || 'Flow-Desk',
  /* 「从当前页面目录出发的相对路径」换成真路径：跑出这棵树的一律不碰。
     先按 URL 的口径把相对地址归一（../ 顶到根就收住），再按两层门牌落回磁盘：
     带 data/ 开头的就是数据层；其余先当页面层，页面层里没有这份就落数据层 ——
     和 serve 那四个门牌同一个顺序，老页面里写的 <词库目录>/… 也认得真身。
     文件还不存在（新建的一本书、新的一份配方）就按「上一层在不在」定门牌，
     免得老写法的新文件被写进 pages\ 里，把刚分开的两层又搅回去。 */
  async pagePath(rel){
    /* Windows 这层把自定义地址写成 http://fdapp.localhost/…，location.protocol 看到的是 http:，
       光按 'fdapp:' 判会把壳当成不能动文件的页面 —— 壳塞的那份门牌在，就算本地（跟页面里 DATA_PRE 那一处同一个判法）。 */
    if(location.protocol !== 'fdapp:' && !window.__FD_BOOT__) throw new Error('当前页面不是本地协议，动不了文件');
    const virt = decodeURIComponent(new URL(String(rel), location.href).pathname).replace(/^\/+/, '');
    return await ipcRenderer.invoke('fs:resolve', virt);
  },
  /* 写"从当前页面目录出发的某个相对路径"：词库改完要落回 ../<词库名>/data.txt。
     路径由 fdapp:// 的地址反推，页面自己不用知道绝对路径长什么样；跑出数据目录的一律不写。 */
  async writePageFile(rel, text){
    return await ipcRenderer.invoke('fs:write', await this.pagePath(rel), text, true);
  },
  /* 写二进制（正文里插的图要落进 <书名>/assets/）：主进程那条 fs:write 本来就吃 Uint8Array */
  async writePageBytes(rel, bytes){
    return await ipcRenderer.invoke('fs:write', await this.pagePath(rel), bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), true);
  },
  /* 往一个文件末尾接一段（为写那一章的逐字记录）：走的还是 pagePath 那把尺，跑出页面目录的一律不写。
     这一条只加不盖 —— 历史记录要的就是"程序里没有改写的那一手"。 */
  async appendPageFile(rel, text){
    return await ipcRenderer.invoke('fs:append', await this.pagePath(rel), String(text));
  },
  /* 这个文件在不在（只问一句，不搬内容）：逐字记录要先分清「没有这个文件」和「有、可这一趟没读动」，
     混成一件就会往同一个文件尾巴多补一枚底片，重放时整章正文重复一遍 */
  async pageFileExists(rel){
    const st = await ipcRenderer.invoke('fs:stat', await this.pagePath(rel));
    return !!(st && st.exists && !st.isDirectory);
  },
  /* 粘网址自动抓标题：页面跨域取不到，让主进程去取 */
  async webTitle(url){ try{ return await ipcRenderer.invoke('web:title', String(url || '')); }catch(e){ return ''; } },
  /* 读页面目录树里一个文件的原文（改代码要看 plugins\ 那份覆盖副本）：跑出去的路径同样被 pagePath 挡掉 */
  async readPageFile(rel){
    const r = await ipcRenderer.invoke('fs:read', await this.pagePath(rel));
    return new TextDecoder('utf-8').decode(r.data);
  },
  /* 删页面目录树里的一个文件（或整个目录）：完全删除一个组件时用 */
  async delPageFile(rel, recursive){
    return await ipcRenderer.invoke('fs:unlink', await this.pagePath(rel), !!recursive);
  },
  /* 关闭行为：'ask' 问问我 / 'tray' 最小化到托盘 / 'quit' 直接退出 */
  async closeChoice(){ try{ return await ipcRenderer.invoke('cfg:closeGet'); }catch(e){ return null; } },
  async setCloseChoice(mode){ try{ return await ipcRenderer.invoke('cfg:closeSet', mode); }catch(e){ return null; } },
  /* Rime 用户目录：exe 旁那份明文 json，指一次就自动重读；传 '' 表示不再自动读 */
  async rimeDir(){ try{ return await ipcRenderer.invoke('cfg:rimeGet'); }catch(e){ return ''; } },
  async setRimeDir(p){ try{ return await ipcRenderer.invoke('cfg:rimeSet', p); }catch(e){ return null; } },
  /* 从前这里还有一条 rimeThemes()：把 Rime 目录里的 weasel 配色原文递给页面解析。
     件-9 整条撤下 Rime 配色，这条跟着撤；上面两条是给声笔输入法练习指目录用的，留着。 */
  /* ---------- #251 卡片大小清单（data\card-size.yaml）：运行时那一半（fd10-size.js）喊这几条 ----------
     读 / 写 / 问改动清单 / 写进装机那一份；onCardSize 订的这条广播，磁盘那份一变就来喊。
     不显示文件路径、没有「打开清单」这一条。 */
  async cardSizeRead(){ try{ return await ipcRenderer.invoke('card-size:read'); }catch(e){ return { text:'', file:'' }; } },
  async cardSizeWrite(text){ try{ return await ipcRenderer.invoke('card-size:write', text); }catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  async cardSizePlan(){ try{ return await ipcRenderer.invoke('card-size:plan'); }catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  async cardSizeApply(list){ try{ return await ipcRenderer.invoke('card-size:apply', list); }catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  onCardSize(fn){
    const wrap = (e, text) => { try{ fn(String(text || '')); }catch(err){} };
    ipcRenderer.on('card-size:changed', wrap);
    return () => { try{ ipcRenderer.removeListener('card-size:changed', wrap); }catch(err){} };
  },
  /* ---------- #291 #292 与外29 丁组 那三份库文件 ----------
     （data\palettes.yaml 色卡 / data\looks.yaml 外观方案 / data\images.yaml 图片库）
     认哪一份由页面说（'palettes.yaml' / 'looks.yaml' / 'images.yaml'），主进程只搬原文。
     和那一条清单同一要求：不显示文件路径、没有「打开清单」这一条。
     onLibChanged 订的这条广播：自己存盘的、别的窗口存盘的、外部编辑器改的，都从这里回来。 */
  async libRead(name){ try{ return await ipcRenderer.invoke('lib:read', name); }catch(e){ return { ok:false, text:'', file:'' }; } },
  async libWrite(name, text){ try{ return await ipcRenderer.invoke('lib:write', name, text); }catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  onLibChanged(fn){
    const wrap = (e, msg) => { try{ fn(msg || {}); }catch(err){} };
    ipcRenderer.on('lib:changed', wrap);
    return () => { try{ ipcRenderer.removeListener('lib:changed', wrap); }catch(err){} };
  },
  /* 重启整个程序：改动写进源码、页面重新生成之后，托盘菜单和窗口标题这些开机认一次的东西，
     靠这一条换一次进程。开发服务器没有主进程，直接回不行。 */
  async restartApp(){ try{ return await ipcRenderer.invoke('app:restart'); }catch(e){ return { ok:false, msg:'要在程序里才重启得了' }; } },
  /* ---------- 图标：一个名字一张图（{ open:'fdapp://app/icons/open.svg', … }）----------
     开机问一次；之后往 icons\ 换图、往插件自己的 images\ 丢图、装卸包，主进程都推新清单过来，
     页面换上清单就行，不用重启。开发服务器没有这一层，返回空表 → 退回内嵌的线条画。 */
  async iconsList(){ try{ return await ipcRenderer.invoke('icons:list'); }catch(e){ return {}; } },
  onIcons(fn){
    const wrap = (e, table) => { try{ fn(table || {}); }catch(err){} };
    ipcRenderer.on('icons:changed', wrap);
    return () => { try{ ipcRenderer.removeListener('icons:changed', wrap); }catch(err){} };
  },
  /* 明文路径包回一个能直接用的目录句柄，用户就不必每次开程序再指一遍 */
  openDir(p){ return new FsaDir(p); },
  pathOf(h){ return (h && typeof h._p === 'string') ? h._p : null; },
  /* 色卡图读色号：把图片的真路径交给主进程，那边叫 Windows 自带的离线 OCR 认字。
     没有绝对路径（开发服务器）就返回 null，页面自己退回按采样色建卡。 */
  async ocrSwatch(p){
    if(!p) return null;
    try{ return await ipcRenderer.invoke('ocr:swatch', String(p)); }catch(e){ return { ok:false, msg:String((e && e.message) || e) }; }
  },
  /* 看板节点上的本地图片（第 12 条）：主进程读字节、按节点宽缩一份回 data URL；
     看大图交给系统默认的看图程序。页面里不存图片，只存那一行路径。 */
  async imgPeek(p, w){
    if(!p) return { ok:false, miss:'没有路径' };
    try{ return await ipcRenderer.invoke('img:peek', String(p), Number(w) || 360); }
    catch(e){ return { ok:false, miss:'图片读不回来：' + String((e && e.message) || e) }; }
  },
  async imgOpen(p){
    if(!p) return { ok:false, msg:'没有路径' };
    try{ return await ipcRenderer.invoke('img:open', String(p)); }
    catch(e){ return { ok:false, msg:'看大图没走通：' + String((e && e.message) || e) }; }
  },
  /* 开机文件缓存用的两条快路：整棵目录树的 stat 一次报完（不读内容），
     以及按路径读回那少数几个变了的文件。 */
  async dirTree(p, exts){
    try{ return await ipcRenderer.invoke('fs:tree', String(p || ''), Array.isArray(exts) ? exts : []); }
    catch(e){ return null; }
  },
  async readText(p){
    try{ return await ipcRenderer.invoke('fs:readText', String(p || '')); }catch(e){ return null; }
  },
  /* ---------- 数据目录下的用户目录：FD 的数据默认就落在这儿（明文 json） ----------
     只认相对路径，主进程那边挡着不许跑出 userdata-<app>\。 */
  async dataDir(){ try{ return await ipcRenderer.invoke('data:dir'); }catch(e){ return ''; } },
  async dataRead(rel){ return await ipcRenderer.invoke('data:read', rel); },
  async dataWrite(rel, text){ return await ipcRenderer.invoke('data:write', rel, text); },
  async dataList(){ try{ return await ipcRenderer.invoke('data:list'); }catch(e){ return []; } },
  /* ---------- 定期备份（外30 戊组）：抄这件事在主进程那一颗 backup.cjs 里跑，
     这儿只递配置、拿回账。挑目录这一条不走页面那层假句柄 —— 要的就是绝对路径那串字。 */
  async backupPick(){
    try{
      const r = await ipcRenderer.invoke('fsa:pickDir', { title:'备份到哪一个文件夹', id:'fd-backup' });
      return r && r.paths && r.paths.length ? r.paths[0] : '';
    }catch(e){ return ''; }
  },
  async backupRun(cfg){
    try{ return await ipcRenderer.invoke('backup:run', cfg && typeof cfg === 'object' ? cfg : {}); }
    catch(e){ return { ok:false, msg:'备份没走通：' + String((e && e.message) || e) }; }
  },
  async backupLast(dest){ try{ return await ipcRenderer.invoke('backup:last', String(dest || '')); }catch(e){ return ''; } },
  async backupCheck(cfg){
    try{ return await ipcRenderer.invoke('backup:check', cfg && typeof cfg === 'object' ? cfg : {}); }
    catch(e){ return { 上回:'', 上回时:0, 到点:false, 下一回:0 }; }
  },
  async backupRoots(){ try{ return await ipcRenderer.invoke('backup:roots'); }catch(e){ return []; } },
  /* 本地字体：主进程一趟数出「哪一家、底下有哪几档真脸」（缓存那份先给，开机后台重数完推过来）。
     从前这一颗把「强制重读」那个参数吞了，界面上点「重读系统字体」走的还是缓存 —— 新装的字体因此看不见。 */
  async fontList(force){
    try{ return await ipcRenderer.invoke('font:list', !!force); }
    catch(e){ return { fonts:[], faces:{} }; }
  },
  onFontList(fn){
    const wrap = (e, got) => { try{ fn(got || {}); }catch(err){} };
    ipcRenderer.on('font:changed', wrap);
    return () => { try{ ipcRenderer.removeListener('font:changed', wrap); }catch(err){} };
  },
  /* 重新构建：主进程拿这个 exe 自带的 electron 当 node，把 FD 和 WNW 两份产物各重打一遍 */
  async rebuild(){ try{ return await ipcRenderer.invoke('sys:rebuild'); }
    catch(e){ return { ok:false, msg:'重新构建没接上：' + ((e && e.message) || e) }; } },
  /* 词库分类改名 → 主进程真去源码 _shared\ 和 数据\plugins\ 里改写引用了这个分类名的字符串（第 6 条） */
  async codeCatRename(from, to){ try{ return await ipcRenderer.invoke('code:catRename', String(from || ''), String(to || '')); }
    catch(e){ return { ok:false, msg:'改代码没接上：' + ((e && e.message) || e) }; } },
  /* ---------- 插件：这一层有什么 / 改名单 / 导入一个包 / 连带清数据 ----------
     乙案之后代码不拼进产物了：运行时按名单一家家 import data\plugins\<id>\main.js。
     所以改完名单、改完代码，刷新这一页就是新的 —— 装卸这一趟不再叫 sys:rebuild。 */
  async packList(){ try{ return await ipcRenderer.invoke('pack:list'); }
    catch(e){ return { ok:false, msg:'插件目录读不到：' + ((e && e.message) || e) }; } },
  /* 取包里的一份文件（词库底本那种）：给文本；读不到就说读不到，
     页面上那一头给一句白话和一个「选一次词库文件」的入口（本地开发那台服务器没有这条通道）。 */
  async packFile(id, rel){ try{ return await ipcRenderer.invoke('pack:file', String(id || ''), String(rel || '')); }
    catch(e){ return { ok:false, msg:'包里的文件读不到：' + ((e && e.message) || e) }; } },
  async packSet(ids){ try{ return await ipcRenderer.invoke('pack:set', ids === null ? null : Array.from(ids || [])); }
    catch(e){ return { ok:false, msg:'名单没写进去：' + ((e && e.message) || e) }; } },
  async packImport(payload){ try{ return await ipcRenderer.invoke('pack:import', payload); }
    catch(e){ return { ok:false, msg:'导入没接上：' + ((e && e.message) || e) }; } },
  /* 两个数组两把尺：files 删用户目录里那几份（notes.json 那种），
     shared 删数据层根那一侧跟着功能走的东西（词库底本 <包名>-bank/data.txt 那种）。 */
  async packWipe(files, shared){ try{ return await ipcRenderer.invoke('pack:wipe', Array.from(files || []), Array.from(shared || [])); }
    catch(e){ return { ok:false, msg:'数据没清掉：' + ((e && e.message) || e) }; } },
  /* 一键清理所有用户数据（外42 二）：只排一张字条，真删在下一趟开机 —— 浏览器存储那一格此刻被内核占着，
     当场删不干净。插件那一格（代码与名单）、日志、搬家账本留着。 */
  async dataWipe(){ try{ return await ipcRenderer.invoke('data:wipe'); }
    catch(e){ return { ok:false, msg:'清理没排下去：' + ((e && e.message) || e) }; } },
  /* ---------- 插件自己那一格里的文件：「改代码」直接读写它（存了就是新的） ----------
     rel 是这一格里的相对路径（默认 main.js）；包名和路径由主进程那把尺查过才落地，
     跑出 data\plugins\ 的一律写不进去。恢复出厂取的是 data\plugins-factory\ 里同名的那一份（导入那一下留的原版）。 */
  async compRead(id, rel){ try{ return await ipcRenderer.invoke('comp:read', String(id || ''), rel === undefined ? null : String(rel)); }
    catch(e){ return { ok:false, msg:'插件文件读不到：' + ((e && e.message) || e) }; } },
  /* 这一格里有哪几份文本文件（「改代码」顶上那个挑文件的下拉吃这个） */
  async compList(id){ try{ return await ipcRenderer.invoke('comp:list', String(id || '')); }
    catch(e){ return { ok:false, msg:'这一格里列不出文件：' + ((e && e.message) || e) }; } },
  async compWrite(id, rel, text){ try{ return await ipcRenderer.invoke('comp:write', String(id || ''), String(rel || ''), String(text == null ? '' : text)); }
    catch(e){ return { ok:false, msg:'插件文件写不进去：' + ((e && e.message) || e) }; } },
  async compDelete(id){ try{ return await ipcRenderer.invoke('comp:delete', String(id || '')); }
    catch(e){ return { ok:false, msg:'这一格删不掉：' + ((e && e.message) || e) }; } },
  async compRestore(id, rel){ try{ return await ipcRenderer.invoke('comp:restore', String(id || ''), rel === undefined ? null : String(rel)); }
    catch(e){ return { ok:false, msg:'恢复出厂没接上：' + ((e && e.message) || e) }; } },
  async compFactory(id){ try{ return await ipcRenderer.invoke('comp:factory', String(id || '')); }
    catch(e){ return { ok:false, files:[], has:false, msg:'原版那一格问不到：' + ((e && e.message) || e) }; } },
  /* 生成页面进度：主进程每开一步、构建脚本每出一行都推一句过来（页面上那条进度条吃这个） */
  onRebuildStep(fn){
    const wrap = (e, s) => { try{ fn(s); }catch(err){} };
    ipcRenderer.on('rebuild:step', wrap);
    return () => { try{ ipcRenderer.removeListener('rebuild:step', wrap); }catch(err){} };
  },
  /* 另一头（或这一头）刚重出过片：产物换了，这一页还是旧的，提示一句让用户自己刷新 */
  onRebuildDone(fn){
    const wrap = (e, s) => { try{ fn(s); }catch(err){} };
    ipcRenderer.on('rebuild:done', wrap);
    return () => { try{ ipcRenderer.removeListener('rebuild:done', wrap); }catch(err){} };
  },
  /* ---------- 关于：本机这一份是什么号、东西在哪儿（挑 zip 装更新那一路已经撤了）---------- */
  async aboutInfo(){ try{ return await ipcRenderer.invoke('about:info'); }
    catch(e){ return { ok:false, msg:'关于那一格没接上：' + ((e && e.message) || e) }; } },
  /* ---------- 自绘标题栏：最小化 / 最大化 / 关闭 / 菜单里那几项 ----------
     动作名见 main.cjs 的 winCtl；返回的是最新窗口状态 { maximized, fullscreen }。
     没打包在 Electron 里跑（直接开 html）时 invoke 会抛，页面那边当没这功能就行。 */
  async winCtl(act){ try{ return await ipcRenderer.invoke('win:ctl', String(act || '')); }catch(e){ return null; } },
  async winState(){ try{ return await ipcRenderer.invoke('win:ctl', 'state'); }catch(e){ return null; } },
  /* ---------- SMTC 媒体桥：主进程那位常驻子进程把事件一行一条推上来 ----------
     开机不主动起，页面第一次问状态时才 spawn；订阅者收到的是 { supported, msg, state, ev }。 */
  async mediaState(){ try{ return await ipcRenderer.invoke('media:state'); }
    catch(e){ return { supported:false, msg:'媒体桥没接上：' + ((e && e.message) || e), state:null }; } },
  async mediaCmd(cmd, pos, app){ try{ return await ipcRenderer.invoke('media:cmd',
    { cmd: String(cmd || ''), pos: Number(pos) || 0, app: app === undefined ? '' : String(app) }); }
    catch(e){ return { ok:false, msg:'媒体命令没送出去：' + ((e && e.message) || e) }; } },
  /* 播放器小抄：指定哪个播放器（空 = 自动挑正在放的），以及插件报上来的正在放的文件路径 */
  async mediaPlayers(){ try{ return await ipcRenderer.invoke('media:players'); }
    catch(e){ return { ok:false, msg:'播放器小抄没接上：' + ((e && e.message) || e), state:{ pin:'', mbPath:'' } }; } },
  async mediaPin(app){ try{ return await ipcRenderer.invoke('media:pin', String(app || '')); }
    catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  /* 小抄里那一行"正在放的文件"包成句柄：歌词那套读法（内嵌标签、同名换后缀）一行都不用改。
     只做形状转换，读不读得到由页面自己试 —— 文件可能正被播放器锁着。 */
  mediaFile(p){ try{ return String(p || '').trim() ? new FsaFile(String(p).trim()) : null; }catch(e){ return null; } },
  /* 音乐文件夹：弹原生对话框挑一个（挑完主进程写进 musicdir.txt，三个 exe 一起跟着变），
     mediaDirHandle 只把那一行绝对路径包成页面认的目录句柄 */
  async mediaDirPick(){ try{ return await ipcRenderer.invoke('media:dirPick'); }
    catch(e){ return { ok:false, msg:'选文件夹没打开：' + ((e && e.message) || e) }; } },
  async mediaDirSet(p){ try{ return await ipcRenderer.invoke('media:dirSet', String(p || '')); }
    catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  /* 音乐控件的开关（注音 / 翻译 / 校准 / 偏移）：写小抄里那一行，文件监听广播回两边 */
  async mediaFlag(k, v){ try{ return await ipcRenderer.invoke('media:flag', String(k || ''), v); }
    catch(e){ return { ok:false, msg:String((e && e.message) || e) }; } },
  /* 音乐控件的挂账：卡 mount 时 hold 一下、卸载时 release 一下。
     主进程数着这些账 —— 最后一张音乐卡收了，后台监听就跟着收（卡卸了还在转进程说不通）。 */
  async mediaHold(){ try{ return await ipcRenderer.invoke('media:hold'); }catch(e){ return { ok:false }; } },
  async mediaRelease(){ try{ return await ipcRenderer.invoke('media:release'); }catch(e){ return { ok:false }; } },
  /* 监听插件：主进程去找 MusicBee 装在哪，把音乐控件包里那个 dll 拷进它的 Plugins\（只治 MusicBee） */
  async mediaBridge(){ try{ return await ipcRenderer.invoke('media:bridge'); }
    catch(e){ return { ok:false, msg:'装插件没走通：' + ((e && e.message) || e) }; } },
  mediaDirHandle(p){ try{ return String(p || '').trim() ? new FsaDir(String(p).trim()) : null; }catch(e){ return null; } },
  mediaFolder(p){
    try{
      const d = dirnameOf(String(p || '').trim());
      return d && d !== '.' && d !== '\\' ? new FsaDir(d) : null;
    }catch(e){ return null; }
  },
  /* ---------- 系统音量：主进程那位常驻音量监视器（Core Audio 回调） ----------
     volGet 是一次性读取（卡挂上来时问一次），往后的变化全凭 volOn 推的事件行 —— 不轮询。
     volSet 主进程那边 90ms 合并一次，页面一路拖只管报最新值。 */
  async volGet(){ try{ return await ipcRenderer.invoke('vol:get'); }
    catch(e){ return { supported:false, msg:'音量通道没接上：' + ((e && e.message) || e), state:null }; } },
  async volSet(v){ try{ return await ipcRenderer.invoke('vol:set', Number(v) || 0); }
    catch(e){ return { ok:false, msg:'音量没送出去：' + ((e && e.message) || e) }; } },
  async volMute(mode){ try{ return await ipcRenderer.invoke('vol:mute', mode === undefined ? 2 : mode); }
    catch(e){ return { ok:false, msg:'静音没送出去：' + ((e && e.message) || e) }; } },
  /* ---------- 明暗模式那一轴（外13-M）：操作系统现在是深色还是浅色 ----------
     systemMing 是一次性读取（开机问一次），往后的变化全凭下面 onSystemMing 推过来的事件行 ——
     和音量那一路同一规矩：实时数据不轮询。主进程只报系统状态，
     「跟随系统 / 按一日内时间 / 手动」这一档怎么用由页面自己定（见 _fd\src\fd3-shell.js 的 Ming）。 */
  async systemMing(){ try{ return await ipcRenderer.invoke('ming:system'); }
    catch(e){ return { dark:null, msg:'系统深浅没问到：' + String((e && e.message) || e) }; } }
};
const mediaFans = [];
ipcRenderer.on('media:state', (e, d) => {
  for(const fn of mediaFans.slice()){ try{ fn(d); }catch(err){ console.error(err); } }
});
window.FD_APP.mediaOn = fn => { if(typeof fn === 'function') mediaFans.push(fn); return () => { const i = mediaFans.indexOf(fn); if(i >= 0) mediaFans.splice(i, 1); }; };
const volFans = [];
ipcRenderer.on('vol:state', (e, d) => {
  for(const fn of volFans.slice()){ try{ fn(d); }catch(err){ console.error(err); } }
});
window.FD_APP.volOn = fn => { if(typeof fn === 'function') volFans.push(fn); return () => { const i = volFans.indexOf(fn); if(i >= 0) volFans.splice(i, 1); }; };
/* 系统深浅（外13-M）：主进程那边 nativeTheme 一变就推一行过来，页面只管听。 */
const mingFans = [];
ipcRenderer.on('ming:system', (e, d) => {
  for(const fn of mingFans.slice()){ try{ fn(d); }catch(err){ console.error(err); } }
});
window.FD_APP.onSystemMing = fn => { if(typeof fn === 'function') mingFans.push(fn); return () => { const i = mingFans.indexOf(fn); if(i >= 0) mingFans.splice(i, 1); }; };
const playFans = [];
ipcRenderer.on('media:players', (e, d) => {
  for(const fn of playFans.slice()){ try{ fn(d); }catch(err){ console.error(err); } }
});
window.FD_APP.mediaOnPlayers = fn => { if(typeof fn === 'function') playFans.push(fn); return () => { const i = playFans.indexOf(fn); if(i >= 0) playFans.splice(i, 1); }; };

ipcRenderer.on('fd:close-ask', () => {
  try{ closeAsk(); }
  catch(e){ ipcRenderer.send('win:closeAnswer', 'tray'); }
});
/* 最大化 / 全屏一换，自绘标题栏那个按钮的长相要跟着换 */
const winFans = [];
ipcRenderer.on('win:state', (e, d) => {
  for(const fn of winFans.slice()){ try{ fn(d); }catch(err){ console.error(err); } }
});
window.FD_APP.onWinState = fn => { if(typeof fn === 'function') winFans.push(fn); return () => { const i = winFans.indexOf(fn); if(i >= 0) winFans.splice(i, 1); }; };

console.log('[FD-APP] File System Access 兼容层已就位（原生对话框 + 主进程读写 + 关闭确认）');
