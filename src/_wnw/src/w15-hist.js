/* ============================================================
   历史版本：一版一个明文 json 落在 <书名>/history/<章id>/<时间>.json。
   一个页面看章纲 / 正文 / 批注 / 修订四类变动；回放只有文字，不加高亮和动画。
   开发服务器写不了文件，同一份快照照原来的名字存进文稿库（hist.<书>.<章>.<时间>.json），
   导出备份能一起带走。不限条数、不自动清理，也不给删 —— 只往后面加（外28 撤掉了删单版和整章清掉那两条路）。
   同一层还躺着逐字记录的 keystroke.txt，见 w20-keystroke.js：敲过的每一个字都在那里，一版都不落也回放得出来。
   ============================================================ */
const VER_NAME = { auto:'自动', manual:'手动', 'rev-proc':'修订过程', 'rev-done':'修订完成' };
function cl(x){ return JSON.parse(JSON.stringify(x === undefined || x === null ? [] : x)); }
function fmtMB(n){ return n < 102400 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB'; }
/* 图2：逐字回放一笔等多久。吃的是记下来的那一笔当时隔了多久（真打字多快就多快），
   先夹在 40 毫秒到 1.2 秒之间 —— 不夹的话一次长停顿能把整遍卡住几分钟；再按倍速缩，
   缩到 6 毫秒就停（眼睛也用不了更快的一屏）。 */
function keGap(ms, 倍){
  const b = Hist.RATES.indexOf(+倍) >= 0 ? +倍 : 1;
  return Math.max(6, Math.min(1200, Math.max(40, +ms || 0)) / b);
}

const Hist = {
  warnMB:2048,
  /* 图2：逐字回放的倍速。节奏本来就吃记下来的那一笔隔了多久（真打字多快就多快），
     这一档只是在那之上乘一个倍数；存全局，出厂 1×。 */
  RATES:[0.25, 0.5, 1, 2, 4, 8],
  rate:1,
  KEEP_LAST:20,      // 清理建议里：每一章最近这几十版自动快照一律留着
  cache:new Map(),   // 章id -> { list:[快照，旧在前], bytes }
  seq:new Map(),     // 章id -> 上一版的时间戳，保证同一章里严格递增
  counts:new Map(),  // 章id -> 版数，没开过历史页时靠它，不反复点目录
  warned:new Set(),  // 提醒过就不在同一章上反复弹
  /* 这道守卫点的是这一份真会喊的名字，不是随便挑一个：写、读、开目录、算路径四样齐了才走明文那一条路。
     从前只判 writePageFile —— 壳落后一步时它有 writePageFile 却没 readPageFile，守卫说"能走"，
     走到读那一笔才炸，界面上一层都不开（2026-10-07 那次「历史版本完全点不开」的一半就是这个）。 */
  app(){ return !!(window.FD_APP && location.protocol === 'fdapp:' &&
    FD_APP.writePageFile && FD_APP.readPageFile && FD_APP.openDir && FD_APP.pagePath); },
  /* 书名那截和插图共用 Img.dir() 的清洗口径，历史永远躺在同一个书目录下面；
     书目录在数据层（WNW_DATA_PRE，见 w7-data.js 的宿主接口） */
  dirOf(chId){ return WNW_DATA_PRE + Img.dir() + '/history/' + chId; },
  relOf(chId, name){ return this.dirOf(chId) + '/' + name; },
  keyOf(chId, name){ return 'hist.' + Work.book.id + '.' + chId + '.' + name; },
  /* 这一档不许是 0：0 在下面的 warn 里等于"永远不提醒"，出厂填 0 就是摆着不干活。
     老存档里存过 0 的（从前出厂就是 0），读出来照样按 2048 走。 */
  async init(){
    const v = Number(await State.get('hist.warnMB', 2048)); this.warnMB = v >= 1 ? v : 2048;
    const r = Number(await State.get('hist.rate', 1)); this.rate = this.RATES.indexOf(r) >= 0 ? r : 1;
  },
  async nextAt(chId){
    if(!this.seq.has(chId)){
      const ns = await this.names(chId);
      const last = ns.length ? Number(ns[ns.length - 1].replace(/\D+$/, '')) : 0;
      if(last) this.seq.set(chId, last);
    }
    const at = Math.max(Date.now(), (this.seq.get(chId) || 0) + 1);
    this.seq.set(chId, at);
    return at;
  },
  /* ---------- 一、文件进出 ---------- */
  async names(chId){
    if(!Work.book) return [];
    if(this.app()){
      const out = [];
      try{
        const d = FD_APP.openDir(FD_APP.pagePath(this.dirOf(chId)));
        for await (const [n] of d.entries()) if(n.endsWith('.json')) out.push(n);
      }catch(e){ return []; }
      return out.sort();
    }
    const pre = this.keyOf(chId, '');
    return (await DB.keysWith(pre)).map(k => k.slice(pre.length)).filter(n => n.endsWith('.json')).sort();
  },
  async raw(chId, name){
    if(this.app()){ try{ return await FD_APP.readPageFile(this.relOf(chId, name)); }catch(e){ return ''; } }
    return await DB.get(this.keyOf(chId, name), '') || '';
  },
  async put(chId, snap){
    const txt = JSON.stringify(snap, null, 1);
    const bytes = new Blob([txt]).size;
    if(this.app()) await FD_APP.writePageFile(this.relOf(chId, snap.at + '.json'), txt);
    else await DB.put(this.keyOf(chId, snap.at + '.json'), txt);
    const r = this.cache.get(chId);
    if(r){ r.list.push(snap); r.list.sort((a, b) => a.at - b.at); r.bytes += bytes; }
    else this.counts.set(chId, (this.counts.get(chId) || 0) + 1);
    return snap;
  },
  async load(chId){
    const hit = this.cache.get(chId);
    /* 明文就在硬盘上，记事本也能改：数目对不上就重读一遍 */
    if(hit && (await this.names(chId)).length === hit.list.length) return hit;
    this.cache.delete(chId);
    const list = []; let bytes = 0;
    for(const n of await this.names(chId)){
      const t = await this.raw(chId, n);
      if(!t) continue;
      bytes += new Blob([t]).size;
      try{ const s = JSON.parse(t); if(s && s.at) list.push(s); }catch(e){}
    }
    list.sort((a, b) => a.at - b.at);
    const r = { list, bytes };
    this.cache.set(chId, r);
    return r;
  },
  /* 这里原来有两个删历史的函数：删单版 drop()、整章清掉 dropAll()。
     他定的规矩是「历史记录绝不允许修改，最好我自己都改不了」，那两个就是程序里递出去的两把刀 ——
     一并撤了。界面上没有删这一说，磁盘上亲手删文件那种拦不住，只查得出来（逐字记录每 200 笔一枚带钥匙的指纹）。 */
  /* 这一章的历史一共吃多大：整本快照那一摞 + 逐字记录那一份都算 —— 设置里「超过多少 MB 提醒一次」
     盯的是硬盘被吃掉多少，不是某一摞。从前这里只数 .json，逐字记录那一大摊根本不在视野里。
     Flow-Desk.exe 一个一个问文件大小就行，开发服务器只有开过历史页才手里有数。 */
  async sizeOf(chId){
    const r = this.cache.get(chId);
    if(this.app()){
      let n = 0;
      try{
        const d = FD_APP.openDir(FD_APP.pagePath(this.dirOf(chId)));
        for await (const [name, fh] of d.entries()) n += await fh.size();
      }catch(e){ return r ? r.bytes : 0; }
      return n;
    }
    return r ? r.bytes : 0;
  },
  /* 一份一个多大：整层问一遍真实字节（开发服务器那一路没有目录可读，交回空的） */
  async sizes(chId){
    const out = {};
    if(!this.app()) return { out, total:0 };
    try{
      const d = FD_APP.openDir(FD_APP.pagePath(this.dirOf(chId)));
      for await (const [name, fh] of d.entries()) out[name] = await fh.size();
    }catch(e){ return { out:{}, total:0 }; }
    return { out, total:Object.values(out).reduce((a, b) => a + b, 0) };
  },
  /* 清理建议：只列、不动手 —— 界面上那两把删除的刀（删单版、整章清掉）他自己撤了，这里不再递第二把。
     排法按「每一章都留得住记录」：最早那一版留（这一章的起点）、最近 KEEP_LAST 版留、
     手动版和修订版一律留，剩下那些「自动」版才算可挪 —— 挪 = 拿去文稿目录里另放一个文件夹，
     记事本照样打得开，程序既不删也不改写。 */
  sweep(list, sizes){
    const s = list.slice().sort((a, b) => a.at - b.at);
    const moves = [], keep = [];
    for(let i = 0; i < s.length; i++){
      const v = s[i], name = v.at + '.json', bytes = sizes[name] || 0;
      const 留 = i === 0 || i > s.length - 1 - this.KEEP_LAST || v.kind !== 'auto';
      (留 ? keep : moves).push({ name, bytes, at:v.at, kind:v.kind, note:v.note || '' });
    }
    return { moves, keep, freed:moves.reduce((a, x) => a + x.bytes, 0) };
  },
  /* 达到上限时说什么：不光报总数，还把「整本快照那一摞」和「逐字记录那一份」分开报 ——
     长个的是前者（每一版都带一份全文），后者一行一笔，涨得慢得多。 */
  async warn(chId){
    if(this.warned.has(chId)) return;
    const bytes = await this.sizeOf(chId);
    if(bytes < this.warnMB * 1048576) return;
    this.warned.add(chId);
    const z = await this.sizes(chId), p = this.sweep((await this.load(chId)).list, z.out);
    toast('这一章的历史到 ' + fmtMB(bytes) + ' 了，过了你设的 ' + this.warnMB + ' MB —— 历史只往后面加，程序不删；' +
      '按「每一章都留得住」那个排法可以挪走 ' + p.moves.length + ' 份（' + fmtMB(p.freed) + '），明细在历史那一屏「吃多大 · 该挪哪些」');
  },
  /* 统计面板每五秒重画一次，版本数问一遍就记住，存 / 删的时候跟着改 */
  async count(chId){
    const r = this.cache.get(chId);
    if(r) return r.list.length;
    if(this.counts.has(chId)) return this.counts.get(chId);
    const n = (await this.names(chId)).length;
    this.counts.set(chId, n);
    return n;
  },
  /* 老版本的快照塞在章节记录里，第一次开历史页搬到明文，搬完那一栏腾空 */
  async migrate(c){
    if(!c || !Array.isArray(c.versions) || !c.versions.length) return;
    const r = await this.load(c.id);
    const have = new Set(r.list.map(x => x.at));
    let n = 0;
    for(const v of c.versions) if(v && v.at && !have.has(v.at)){ await this.put(c.id, v); n++; }
    c.versions = [];
    if(n) await Work.saveCh(c);
  }
};

/* ---------- 二、版本门面：编辑器各处还是喊 Versions ---------- */
const Versions = {
  async add(c, kind, note){
    const snap = { at: await Hist.nextAt(c.id), kind, note: note || '', title: c.title, mode: c.mode,
      outline: cl(c.outline), paras: cl(c.paras), annos: cl(c.annos) };
    await Hist.put(c.id, snap);
    Hist.warn(c.id);
    return snap;
  },
  async list(c){ return (await Hist.load(c.id)).list.slice().reverse(); },
  apply(c, snap){
    c.title = snap.title; c.mode = snap.mode;
    c.outline = cl(snap.outline); c.paras = cl(snap.paras);
    /* 老快照里根本没记批注，回退时别拿一个空数组把现在的批注抹了 */
    if(Array.isArray(snap.annos)) c.annos = cl(snap.annos);
  }
};

/* ---------- 三、四类内容各切成一行行文本，然后一行一行对 ---------- */
function histLines(snap, kind){
  if(!snap) return [];
  if(kind === '章纲') return (snap.outline || []).map(p => String(p.t || '')).filter(x => x.trim());
  if(kind === '正文') return (snap.paras || []).map(p => String(p.t || '')).filter(x => x.trim());
  if(kind === '批注') return (snap.annos || []).map(a => '「' + cut(a.quote || '（没有原话）', 40) + '」　' + (a.text || ''));
  const out = [];
  (snap.paras || []).forEach((p, i) => {
    for(const g of Trace.ranges(p)) out.push('第' + (i + 1) + '段　' +
      (g.op === 'fmt' ? '版式改成 ' + (((BLOCK_MAP.get(g.k) || {}).name || '正文'))
        : (g.op === 'ins' ? '插入 ' : '删掉 ') + '「' + (g.text || '') + '」'));
  });
  return out;
}
/* 最长公共子序列逐行对齐；两摞都很长时不硬算，整段前后摆出来 */
function diffLines(a, b){
  const n = a.length, m = b.length, out = [];
  if(n * m > 400000){
    for(const s of a) out.push({ t:'del', s });
    for(const s of b) out.push({ t:'add', s });
    return out;
  }
  const L = [];
  for(let i = 0; i <= n; i++) L.push(new Uint32Array(m + 1));
  for(let i = n - 1; i >= 0; i--) for(let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0;
  while(i < n && j < m){
    if(a[i] === b[j]){ out.push({ t:'same', s:a[i] }); i++; j++; }
    else if(L[i + 1][j] >= L[i][j + 1]){ out.push({ t:'del', s:a[i] }); i++; }
    else { out.push({ t:'add', s:b[j] }); j++; }
  }
  while(i < n) out.push({ t:'del', s:a[i++] });
  while(j < m) out.push({ t:'add', s:b[j++] });
  return out;
}
/* 全文一行不省：改动那几行照 - / + 标出来，没改的行也一律摆出来。
   从前这里把中间没动的折成一句「…… 若干行没动」，他驳回的就是这一手 —— 看历史要的是整章都在眼前。 */
function diffNodes(out){
  return out.map(x => h('div', { class:'ln ' + x.t }, (x.t === 'del' ? '- ' : x.t === 'add' ? '+ ' : '　') + x.s));
}

/* ---------- 四、那一页 ---------- */
/* 一笔隔了多久：界面上说的是真数（放的时候夹不夹是另一回事，写在放一遍那一段） */
function fmtGap(ms){
  ms = ms || 0;
  if(ms < 1000) return ms + ' 毫秒';
  const s = ms / 1000;
  if(s < 60) return s.toFixed(1) + ' 秒';
  const m = Math.floor(s / 60);
  if(m < 60) return m + ' 分 ' + Math.round(s % 60) + ' 秒';
  return Math.floor(m / 60) + ' 时 ' + (m % 60) + ' 分';
}
function keWhat(op){
  if(op.ins !== undefined) return '加「' + cut(op.ins, 24) + '」';
  if(op.del) return '删掉 ' + op.del + ' 个字';
  if(op.split) return '回车切成两段';
  return '这一段并回上一段';
}
const HistDlg = {
  async open(view){
    const c = view.c;
    await Hist.migrate(c);
    Hist.warned.delete(c.id);
    /* 左边那一栏两截：逐字那一笔一笔、整本快照那一版一版；st.sel 记的是此刻点的哪一头 */
    const st = { sel:{ k:'ke', i:-1 }, timer:null };
    const listEl = h('div', { class:'tl' });
    const detEl = h('div', { class:'det' });
    const infoEl = h('div', { class:'wnw-hint' });
    const box = h('div', { class:'wnw-hist' }, [listEl, h('div', { class:'detwrap' }, [infoEl, detEl])]);
    let list = [], K = { steps:[], seed:[], n:0, bytes:0, tamper:0 }, keRows = [], verRows = [];

    const line = (no, kids) => h('div', { class:'ln' }, [h('i', { class:'no' }, String(no)), ...(kids || [])]);
    const tx = s => h('span', {}, String(s || ''));
    /* ---------- 一笔：这一笔之后的整章全文，改的那几个字就地标出来 ---------- */
    const paintKe = i => {
      const s = K.steps[i];
      detEl.innerHTML = '';
      if(!s){ detEl.appendChild(h('div', { class:'wnw-hint' }, '这一章还没有逐字记录 —— 从第一个字起就开始记，写了字再回来看。')); return; }
      const op = s.op, ps = s.ps || [];
      detEl.appendChild(h('div', { class:'sec' }, [h('h4', {}, '第 ' + (i + 1) + ' 笔 · ' + keWhat(op) +
        ' · 距上一笔 ' + fmtGap(op.gap) + ' · 全文 ' + ps.length + ' 行')]));
      ps.forEach((t, r) => {
        const ch = [...String(t || '')], kids = [];
        if(op.pi === r && op.ins !== undefined){
          const n = [...String(op.ins)].length;
          kids.push(tx(ch.slice(0, op.at).join('')), h('b', { class:'mk add' }, ch.slice(op.at, op.at + n).join('')), tx(ch.slice(op.at + n).join('')));
        }
        else if(op.pi === r && op.del) kids.push(tx(ch.slice(0, op.at).join('')), h('b', { class:'mk del' }, '（这里删掉过 ' + op.del + ' 个字）'), tx(ch.slice(op.at).join('')));
        else if(op.split && op.pi === r) kids.push(tx(t), h('b', { class:'mk' }, '↵ 从这里切成两段'));
        else if(op.split && op.pi + 1 === r) kids.push(h('b', { class:'mk' }, '↵ 新段从这里起'), tx(t));
        else if(op.join && op.pi - 1 === r) kids.push(tx(t), h('b', { class:'mk' }, '⌐ 下一段并到这儿'));
        else kids.push(tx(t));
        detEl.appendChild(line(r + 1, kids));
      });
      detEl.scrollTop = 0;
    };
    /* ---------- 一版：整版全文，和上一版逐行对，一行都不折 ---------- */
    const paintVer = i => {
      detEl.innerHTML = '';
      const v = list[i];
      if(!v){ detEl.appendChild(h('div', { class:'wnw-hint' }, '还没有存过版本，先点右下角「存一版」。')); return; }
      const prev = list[i + 1] || null;
      let any = 0;
      for(const kind of ['章纲', '正文', '批注', '修订']){
        const d = diffLines(histLines(prev, kind), histLines(v, kind));
        const moved = d.filter(x => x.t !== 'same').length;
        detEl.appendChild(h('div', { class:'sec' }, [
          h('h4', {}, kind + ' · 共 ' + d.length + ' 行 · 这一版和上一版不一样 ' + moved + ' 行'), ...diffNodes(d)]));
        if(moved) any++;
      }
      if(!any) detEl.appendChild(h('div', { class:'wnw-hint' }, prev ? '四类都和上一版一样。' : '这是第一版。'));
      detEl.scrollTop = 0;
    };
    const row = s => h('div', { class:'ln' }, tx(s));
    const paintSpace = async () => {
      const z = await Hist.sizes(c.id);
      const p = Hist.sweep(list.slice().reverse(), z.out);
      const verBytes = Object.keys(z.out).filter(n => n.endsWith('.json')).reduce((a, n) => a + z.out[n], 0);
      detEl.innerHTML = '';
      detEl.appendChild(h('div', { class:'sec' }, [h('h4', {}, '这一章的历史吃多大'),
        row('整层 ' + fmtMB(z.total) + ' —— 整本快照 ' + list.length + ' 版共 ' + fmtMB(verBytes) + '，逐字记录 ' +
          K.steps.length.toLocaleString('zh-CN') + ' 笔共 ' + fmtMB(K.bytes)),
        row('提醒线：' + Hist.warnMB + ' MB（这一栏填不到 0，填 0 会回到 2048）')]));
      detEl.appendChild(h('div', { class:'sec' }, [h('h4', {}, '按「每一章都留得住」那个排法，可以挪走 ' + p.moves.length + ' 份 · 一共 ' + fmtMB(p.freed) + '（程序不删，挪是你自己动手）'),
        h('div', { class:'wnw-hint' }, '留下的那些：最早那一版（这一章的起点）· 最近 ' + Hist.KEEP_LAST + ' 版 · 所有手动版和修订版'),
        ...p.moves.map(m => row(m.name + ' · ' + fmtMB(m.bytes) + ' · ' + (VER_NAME[m.kind] || m.kind) + (m.note ? '（' + m.note + '）' : ''))),
        ...(p.moves.length ? [] : [h('div', { class:'wnw-hint' }, '这一章还没到可以挪的地步 —— 版数太少，挪哪一份都等于动你的记录。')])]));
      detEl.scrollTop = 0;
    };
    const paintList = () => {
      listEl.innerHTML = ''; keRows = []; verRows = [];
      listEl.appendChild(h('div', { class:'tl-h' }, '逐字 ' + K.steps.length.toLocaleString('zh-CN') + ' 笔（最早在上头）'));
      K.steps.forEach((s, i) => {
        const row = h('div', { class:'tl-row' + (st.sel.k === 'ke' && st.sel.i === i ? ' on' : ''), onclick:() => goKe(i) }, [
          h('span', { class:'ttl' }, (i + 1) + '　' + keWhat(s.op)), h('span', { class:'gap' }, fmtGap(s.op.gap))]);
        keRows.push(row); listEl.appendChild(row);
      });
      listEl.appendChild(h('div', { class:'tl-h' }, '整本快照 ' + list.length + ' 版（新的在上头）'));
      for(let i = list.length - 1; i >= 0; i--){
        const v = list[i];
        const row = h('div', { class:'tl-row' + (st.sel.k === 'ver' && st.sel.i === i ? ' on' : ''), onclick:() => { stop(); goVer(i); } }, [
          h('span', { class:'ttl' }, new Date(v.at).toLocaleString('zh-CN', { hour12:false })),
          h('span', { class:'wnw-chip' }, VER_NAME[v.kind] || v.kind)]);
        verRows[i] = row; listEl.appendChild(row);
      }
    };
    /* 换选中只挪那一枚 on，不重画整栏 —— 放一遍最快 40 毫秒一跳，重画整栏会跟不上 */
    const mark = () => {
      keRows.forEach((r, i) => r && r.classList.toggle('on', st.sel.k === 'ke' && st.sel.i === i));
      verRows.forEach((r, i) => r && r.classList.toggle('on', st.sel.k === 'ver' && st.sel.i === i));
    };
    const goKe = i => { st.sel = { k:'ke', i }; mark(); paintKe(i); };
    const goVer = i => { st.sel = { k:'ver', i }; mark(); paintVer(i); };
    const goSpace = () => { st.sel = { k:'space' }; mark(); paintSpace(); };
    const reload = async () => {
      const r = await Hist.load(c.id);
      list = r.list.slice().reverse();
      const bytes = await Hist.sizeOf(c.id);
      /* 一行真数：整本快照几版多大、逐字记录几笔多大、有没有被动过 —— 程序自己报，不靠人拿尺量。
         这一行读不到不该把整层挡在外面：它只是说明，清单照样得给人看（2026-10-07 那次点不开就是这一笔没兜住）。 */
      let kErr = '';
      try{ K = await KLog.steps(c.id); }
      catch(e){ K = { steps:[], seed:[], n:0, bytes:0, tamper:0 }; kErr = (e && e.message) || String(e); }
      infoEl.textContent = '';
      infoEl.appendChild(h('span', {}, list.length + ' 版 · ' + fmtMB(bytes) + ' · 逐字 ' + K.steps.length.toLocaleString('zh-CN') +
        ' 笔 · ' + fmtMB(K.bytes) + ' · ' + (Hist.app() ? Img.dir() + '/history/' + c.id : '存在文稿库')));
      if(kErr) infoEl.appendChild(h('span', { class:'wnw-chip', style:'color:var(--danger,#c00)' }, '这一章的逐字记录读不到：' + kErr));
      if(K.tamper) infoEl.appendChild(h('span', { class:'wnw-chip', style:'color:var(--danger,#c00)' },
        '这一章的逐字记录被动过 · 从第 ' + K.tamper + ' 枚指纹起对不上'));
      paintList();
      if(K.steps.length) goKe(K.steps.length - 1);
      else if(list.length) goVer(0);
      else paintKe(-1);
    };
    const stop = () => { if(st.timer){ clearTimeout(st.timer); st.timer = null; playBtn.textContent = '放一遍'; } };
    const playBtn = h('button', { class:'wnw-btn mini', onclick:() => {
      if(st.timer){ stop(); return; }
      if(K.steps.length < 2){ toast('至少两笔才看得出变化'); return; }
      playBtn.textContent = '停';
      /* 一笔一屏，从最早那笔往后走；节奏吃记下来的那一笔隔了多久（图2：就是当时的真实打字速度），
         夹在 0.04 秒到 1.2 秒之间再乘上那一档倍速（keGap）。左边那一列写的还是真数。不加动画。 */
      let i = 0; goKe(0);
      const tick = () => {
        if(!document.body.contains(listEl)){ stop(); return; }
        if(i >= K.steps.length - 1){ stop(); return; }
        i++; goKe(i);
        st.timer = setTimeout(tick, keGap(K.steps[i].op.gap, Hist.rate));
      };
      st.timer = setTimeout(tick, 60);
    }}, '放一遍');
    /* 图2：倍速那一档。放着的时候点也算 —— 下一笔就按新的那一档等 */
    const rateSeg = h('div', { class:'wnw-seg', title:'回放快慢 = 当时真隔了多久（夹在 0.04 秒到 1.2 秒）÷ 这一档；存全局' });
    const drawRate = () => {
      rateSeg.innerHTML = '';
      for(const b of Hist.RATES) rateSeg.appendChild(h('button', { class:Hist.rate === b ? 'on' : '',
        onclick:() => { Hist.rate = b; State.set('hist.rate', b); drawRate(); } }, b + '×'));
    };
    drawRate();
    const warnIn = h('input', { class:'wnw-input', type:'number', min:'1', step:'10', value:String(Hist.warnMB),
      style:'width:64px', onchange:() => {
        const v = Number(warnIn.value);
        Hist.warnMB = v >= 1 ? v : 2048;
        warnIn.value = String(Hist.warnMB);
        State.set('hist.warnMB', Hist.warnMB);
        Hist.warned.delete(c.id);
      } });
    await reload();
    Overlay.open('历史版本 · ' + c.title, box, [
      h('span', { class:'wnw-hint', style:'align-self:center' }, '达到'), warnIn, h('span', { class:'wnw-hint', style:'align-self:center' }, 'MB 提醒'),
      h('button', { class:'wnw-btn mini', onclick:goSpace }, '吃多大 · 该挪哪些'),
      h('span', { style:'flex:1' }),
      h('span', { class:'wnw-hint', style:'align-self:center' }, '倍速'), rateSeg,
      playBtn,
      h('button', { class:'wnw-btn mini', onclick:async () => {
        await view.manualVer();
        stop(); await reload();
      }}, '存一版'),
      h('button', { class:'wnw-btn mini', onclick:() => {
        if(st.sel.k !== 'ver'){ toast('先在左边「整本快照」那一截点一版，再回退'); return; }
        const v = list[st.sel.i]; if(!v) return;
        if(!confirm('回到这一版？现在的样子会先自动存一版。')) return;
        stop();
        Overlay.close();
        (async () => {
          await Versions.add(c, 'auto', '覆盖前自动留档');
          Versions.apply(c, v);
          view.plain(); view.dirty(); view.draw();
        })();
      }}, '回到这一版')
      /* 这里原来还有一枚「全清掉」：一次抹掉这一章从第一个字起的全部记录、正文不动。
         「历史绝不允许修改」要堵的就是这一枚 —— 撤了。真想抹掉某一章的记录，只能自己去文稿目录删那个文件夹，
         软件不再递按钮；那种改法会在上面那一行报出来（对不上就是它报的）。 */
    ].filter(Boolean), { vwide:true });
  }
};

addCss(`
.wnw-hist{display:flex;gap:14px;align-items:flex-start;min-width:min(1080px,94vw);}
.wnw-hist .tl{flex:0 0 236px;display:grid;gap:2px;max-height:66vh;overflow:auto;}
.wnw-hist .detwrap{flex:1 1 auto;min-width:0;display:grid;gap:8px;}
.wnw-hist .det{max-height:62vh;overflow:auto;}
.wnw-hist .tl-row{display:flex;gap:6px;align-items:center;padding:5px 7px;border-radius:var(--r-card);cursor:pointer;}
.wnw-hist .tl-row:hover{background:var(--candidate-bg);}
.wnw-hist .tl-row.on{background:var(--accent-light);color:var(--accent-text,var(--accent));}
.wnw-hist .tl-row .ttl{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-hist .tl-h{padding:9px 7px 3px;color:var(--text-light);font-size:.78em;}
.wnw-hist .tl-row .gap{flex:0 0 auto;color:var(--text-light);font-size:.78em;}
.wnw-hist .sec{margin-bottom:14px;}
.wnw-hist .ln{white-space:pre-wrap;word-break:break-word;line-height:1.8;}
.wnw-hist .ln.same,.wnw-hist .ln.skip{color:var(--text-light);}
/* 逐字那一屏：行号贴在左边，这一笔改的那几个字就地着色（整章其余的行照摆） */
.wnw-hist .ln .no{display:inline-block;width:2.6em;margin-right:.5em;text-align:right;color:var(--text-light);font-style:normal;font-size:.8em;}
.wnw-hist .mk{font-weight:inherit;border-radius:2px;}
.wnw-hist .mk.add{background:var(--ok-light,#d7ecd9);color:var(--ok,#2e8b57);}
.wnw-hist .mk.del{color:var(--danger,#c00);font-size:.86em;}
`);
