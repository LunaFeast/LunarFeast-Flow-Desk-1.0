/* ============================================================
   WNW 整本 / 整卷导出，和整本导入（外32 图6）
   写作软件的惯例两种，这里都给，导出时挑：
     ① 卷是文件夹、章是文档    书名\第一卷\001 章名.md
     ② 整本一个文档          书名\书名.md（卷标题、章标题都留在里面）
   出去的是能直接读的文稿（md / word / txt），不是数据文件；图片一并拷进 书名\assets\。
   进来这一头走的是同一套路子：一份文稿摊回成卷章结构，认的仍是这张书自己那套序号格式（见文件末了 BookImport）。
   ============================================================ */
const BX_EXT = { md:'md', word:'docx', txt:'txt' };
const BookExport = {
  dir:null, dirPath:'', busy:false,

  app(){ return Img.app(); },
  /* 文件名里 Windows 不认的那几个字符一律换成下划线，末尾的点和空格也去掉 */
  safe(s, fb){ return String(s || '').replace(/[\\/:*?"<>|]/g, '_').replace(/[.\s]+$/, '').trim().slice(0, 80) || fb || '未命名'; },
  pad(n){ return String(n).padStart(3, '0'); },

  /* ---------- 要写哪些文件，先算一遍给用户看数目 ---------- */
  plan(st){
    const b = Work.book, ext = BX_EXT[st.fmt], bookDir = this.safe(b.title, '书');
    const all = Work.orderedChs();
    const chs = st.scope === 'ch' ? all.filter(m => m.id === st.cid)
      : st.scope === 'vol' ? all.filter(m => m.vid === st.vid) : all;
    /* 按卷成组：卷与章的顺序都跟着目录树走；没有卷可归的那组直接挂在书名底下 */
    const groups = [];
    for(const m of chs){
      const g = groups[groups.length - 1];
      if(g && g.vid === m.vid) g.chs.push(m);
      else { const v = Work.vol(m.vid); groups.push({ vid:m.vid, novol:!v, title:v ? v.title : '不分卷', chs:[m] }); }
    }
    const volDirs = groups.filter(g => !g.novol).length;
    const files = [];
    if(st.layout === 'tree'){
      let vn = 0;
      groups.forEach((g) => {
        /* 不分卷就没有卷文件夹这一层，章文档落在书名底下，序号也只给卷编 */
        const dir = g.novol ? bookDir
          : bookDir + '/' + (st.num ? this.pad(++vn) + ' ' : '') + this.safe(g.title, '卷');
        g.chs.forEach((m, ci) => files.push({
          rel: dir + '/' + (st.num ? this.pad(ci + 1) + ' ' : '') + this.safe(m.title, '章') + '.' + ext,
          cid:m.id, ups:g.novol ? 1 : 2
        }));
      });
    } else {
      const name = st.scope === 'ch' ? this.safe((Work.chMeta(st.cid) || {}).title, '章')
        : st.scope === 'vol' ? this.safe((Work.vol(st.vid) || {}).title, '卷') : bookDir;
      files.push({ rel: bookDir + '/' + name + '.' + ext, scope:st.scope, ups:1 });
    }
    return { bookDir, files, chs, groups, volDirs };
  },
  /* 章里挂的每一张图都要跟着走，否则文稿里的 assets/xxx.png 是死链 */
  async imagesOf(chs){
    const rels = [];
    for(const m of chs){
      const c = await Work.ch(m.id);
      for(const p of ((c && c.paras) || [])) if(p.k === 'img') rels.push(String(p.t || p.img || ''));
    }
    return [...new Set(rels.filter(Boolean))];
  },
  /* 卷是文件夹那一版里，章文档比 assets 多套了一层，相对路径得往上跳 */
  fixAssets(text, ups){
    if(!ups || ups < 2) return text;
    const up = '../'.repeat(ups - 1);
    return text.replace(/(\]\()assets\//g, '$1' + up + 'assets/');
  },
  async one(f, st){
    const opt = { ch:f.cid, vid:st.vid, withOutline:st.ol, withAnno:st.anno, marks:st.fmt === 'md' || st.marks };
    const scope = f.cid ? 'ch' : st.scope;
    if(st.fmt === 'word') return new Uint8Array(await (await Work.docx(scope, opt)).arrayBuffer());
    return this.fixAssets(await Work.dump(scope, st.fmt, opt), f.ups);
  },

  /* ---------- 往选中的文件夹里写：rel 用 / 分隔，缺的层级逐级建 ---------- */
  async write(rel, data){
    const ps = String(rel).split('/').filter(Boolean);
    let d = this.dir;
    for(let i = 0; i < ps.length - 1; i++) d = await d.getDirectoryHandle(ps[i], { create:true });
    const fh = await d.getFileHandle(ps[ps.length - 1], { create:true });
    const w = await fh.createWritable();
    await w.write(data);
    await w.close();
  },
  async pick(){
    if(!window.showDirectoryPicker){ toast('选文件夹要在 Flow-Desk 程序里 · 这一种开法挑不了文件夹'); return false; }
    try{
      const d = await window.showDirectoryPicker({ id:'wnw-export', title:'导出到哪个文件夹' });
      this.dir = d;
      this.dirPath = (window.FD_APP && FD_APP.pathOf) ? FD_APP.pathOf(d) : d.name;
      await State.set('export-dir', this.dirPath);
      return true;
    }catch(e){ return false; }   /* 用户按了取消 */
  },
  /* 上次那个文件夹：exe 里记的是绝对路径，认得出就直接用 */
  async reopen(){
    const p = await State.get('export-dir', '');
    if(!p || !(window.FD_APP && FD_APP.openDir)) { toast('还没选过文件夹'); return false; }
    try{ this.dir = FD_APP.openDir(p); this.dirPath = p; return true; }
    catch(e){ toast('那个文件夹打不开：' + e.message); return false; }
  },

  /* ---------- 界面 ---------- */
  async dlg(scope){
    if(!this.app()){ toast('整本导出要写文件 · 请在 exe 里用（导出本章照旧）'); return; }
    const b = Work.book;
    if(!b || !b.chs.length){ toast('这本书还没有章'); return; }
    const st = Object.assign({ scope:scope || 'book', vid:b.vols.length ? b.vols[0].id : '', cid:Work.cur || (b.chs[0] && b.chs[0].id),
      layout:'tree', fmt:'md', marks:false, ol:false, anno:false, num:true },
      await State.get('export-st', {}));
    st.scope = scope || st.scope || 'book';
    /* 记住的上次可能已经不算数了：章被删了、卷被删了，那就退回整本书 */
    if(st.scope === 'ch' && !Work.chMeta(st.cid)){ st.scope = 'book'; st.cid = b.chs[0].id; }
    if(st.scope === 'vol' && !Work.vol(st.vid)){ st.scope = 'book'; if(b.vols.length) st.vid = b.vols[0].id; }
    const box = h('div', { class:'wnw-col' });
    const seg = (items, get, set) => {
      const g = h('div', { class:'wnw-seg' });
      g.sync = () => { g.innerHTML = ''; const cur = get();
        for(const [k, n] of items) g.appendChild(h('button', { class:cur === k ? 'on' : '', onclick:() => { set(k); sync(); } }, n)); };
      return g;
    };
    const volSel = h('select', { class:'wnw-input', style:'max-width:200px' });
    const chSel = h('select', { class:'wnw-input', style:'max-width:240px' });
    for(const v of b.vols) volSel.appendChild(h('option', { value:v.id, selected:st.vid === v.id }, v.title));
    for(const m of Work.orderedChs()) chSel.appendChild(h('option', { value:m.id, selected:st.cid === m.id }, m.title));
    /* 这本书不分卷，「这一卷」和「卷是文件夹」就没得挑 */
    const scopeSeg = seg([['book', '整本书']].concat(b.vols.length ? [['vol', '这一卷']] : []).concat([['ch', '这一章']]), () => st.scope, k => st.scope = k);
    const layoutSeg = seg([['tree', b.vols.length ? '卷是文件夹 章是文档' : '一章一个文档'], ['one', '整本一个文档']], () => st.layout, k => st.layout = k);
    const fmtSeg = seg([['md', 'md'], ['word', 'word'], ['txt', 'txt']], () => st.fmt, k => st.fmt = k);
    const marksSw = h('input', { type:'checkbox' }); marksSw.addEventListener('change', () => { st.marks = marksSw.checked; sync(); });
    const olSw = h('input', { type:'checkbox' }); olSw.addEventListener('change', () => { st.ol = olSw.checked; sync(); });
    const annoSw = h('input', { type:'checkbox' }); annoSw.addEventListener('change', () => { st.anno = annoSw.checked; sync(); });
    const numSw = h('input', { type:'checkbox' }); numSw.addEventListener('change', () => { st.num = numSw.checked; sync(); });
    const dirTip = h('span', { class:'wnw-hint', style:'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' });
    const sum = h('div', { class:'wnw-hint' });
    const goBtn = h('button', { class:'wnw-btn primary', onclick:() => this.go(st, sum, goBtn) }, '开始导出');
    const row = (label, ...kids) => h('div', { class:'wnw-field' }, [h('span', {}, label), h('div', { class:'wnw-row' }, kids)]);
    const sw = (cb, txt) => h('label', { class:'wnw-switch' }, [cb, h('span', {}, txt)]);

    box.appendChild(row('导出范围', scopeSeg, volSel, chSel));
    box.appendChild(row('版式', layoutSeg));
    box.appendChild(row('格式', fmtSeg));
    box.appendChild(row('带上', sw(olSw, '章纲'), sw(annoSw, '批注')));
    box.appendChild(row('写法', sw(marksSw, '记号外显'), sw(numSw, '名字前加序号')));
    box.appendChild(row('写到哪', h('button', { class:'wnw-btn mini', onclick:async () => { if(await this.pick()) sync(); } }, '选一个文件夹'),
      h('button', { class:'wnw-btn mini', onclick:async () => { if(await this.reopen()) sync(); } }, '还用上次'), dirTip));
    box.appendChild(sum);
    const sync = () => {
      scopeSeg.sync(); layoutSeg.sync(); fmtSeg.sync();
      volSel.style.display = st.scope === 'vol' ? '' : 'none';
      chSel.style.display = st.scope === 'ch' ? '' : 'none';
      olSw.checked = st.ol; annoSw.checked = st.anno; marksSw.checked = st.marks; numSw.checked = st.num;
      /* md 天生带记号，这一项没什么可挑；txt / word 才问要不要把 ## · - · 1. 写出去 */
      marksSw.disabled = st.fmt === 'md';
      numSw.parentNode.style.display = st.layout === 'tree' ? '' : 'none';
      dirTip.textContent = this.dirPath || '还没选文件夹';
      dirTip.title = this.dirPath || '';
      const p = this.plan(st);
      sum.textContent = '会写出 ' + p.files.length + ' 个文稿'
        + (st.layout === 'tree' ? (p.volDirs ? ' · ' + p.volDirs + ' 个卷文件夹' : '（这本书不分卷，章直接放书名底下）') : '')
        + (this.dirPath ? ' → ' + this.dirPath + '\\' + p.bookDir + '\\' : '（还没定写到哪）');
      goBtn.disabled = !this.dir;
    };
    volSel.addEventListener('change', () => { st.vid = volSel.value; sync(); });
    chSel.addEventListener('change', () => { st.cid = chSel.value; sync(); });
    sync();
    await State.set('export-st', { layout:st.layout, fmt:st.fmt, marks:st.marks, ol:st.ol, anno:st.anno, num:st.num });
    Overlay.open('导出文稿 · ' + b.title, box, [goBtn, h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消')]);
  },

  /* ---------- 真的动手写 ---------- */
  async go(st, sum, goBtn){
    if(this.busy) return;
    this.busy = true;
    const p = this.plan(st);
    const imgs = await this.imagesOf(p.chs);
    await State.set('export-st', { layout:st.layout, fmt:st.fmt, marks:st.marks, ol:st.ol, anno:st.anno, num:st.num });
    let done = 0, bad = [];
    goBtn.disabled = true;
    try{
      for(const rel of imgs){
        const bytes = await Img.bytes(rel);
        if(!bytes){ bad.push(rel + '（图找不到了）'); continue; }
        await this.write(p.bookDir + '/' + rel, bytes);
      }
      for(const f of p.files){
        sum.textContent = '正在写 ' + (++done) + ' / ' + p.files.length + ' …';
        await this.write(f.rel, await this.one(f, st));
        /* 一次几十上百个文件，别让界面看起来冻住了 */
        if(done % 12 === 0) await new Promise(r => setTimeout(r, 0));
      }
      Overlay.close();
      toast('已导出 ' + p.files.length + ' 个文稿' + (imgs.length ? ' · ' + (imgs.length - bad.length) + ' 张图' : '')
        + ' → ' + this.dirPath + '\\' + p.bookDir
        + (bad.length ? '（' + bad.length + ' 张图没带上）' : ''));
    }catch(e){
      toast('导出中断：' + ((e && e.message) || e) + ' · 已写 ' + done + ' 个');
    }
    goBtn.disabled = false;
    this.busy = false;
  }
};

/* ============================================================
   整本导入（外32 图6 · 作者 2026-10-09：「增加整本导入，识别 txt 文档中的卷标题和章节标题，按卷章结构导入」）
   认标题吃的是这张书自己那套序号格式表（Seq.all()，他自己新建的那几种也在里头），
   数字那一截的读法不在这里抄第二份 —— 表上没有的三种写法（第X部 / 第X辑 / 第X节）在这边补一张薄表。
   「20. 标题」这一类光秃秃的格式留到第二轮才试：正文里「3. 然后他走了」这样一行也算标题的话，
   一整本书会被切得稀碎 —— 只有别的格式挨个试完一章都没认出，才回头用它。
   两份都认不出就整份当一章的正文，章名由人给，不硬猜。
   ============================================================ */
const BI_MAXLEN = 30;                  /* 一行超过这么多字就不当标题 */
const BI_STOP = /[。！？；，、]$/;       /* 结尾带句读的算正文，不算标题 */
const BI_VOLWORD = /[卷部辑]/;          /* 一张格式表算卷还是算章，看这两头有没有这几个字 */
const BookImport = {
  busy:false,

  /* 一张薄表：{ f 是喂给 Seq.parseOne 的那一行, kind 卷/章, weak 是不是留到第二轮才用的那一种 } */
  forms(){
    const out = [];
    for(const f of Seq.all()) out.push({ f,
      kind: BI_VOLWORD.test(String(f.pre || '') + String(f.suf || '')) ? 'vol' : 'ch',
      weak: !f.pre && !/[章节回卷部辑篇]/.test(String(f.suf || '')) });
    /* 序号格式表里没有这三种写法，补上：阿拉伯数字和汉字数字各试一遍，读法仍走 Seq.parseOne */
    for(const one of [['vol','第','部'], ['vol','第','辑'], ['ch','第','节']])
      for(const type of ['ar','cn']) out.push({ f:{ pre:one[1], suf:one[2], type }, kind:one[0], weak:false });
    return out;
  },
  /* 一行是不是标题：是就回 { kind, title }；# 开头那一类认整本导出那份 md（卷在 ## 、章在 ### 、书名在 #） */
  head(line, forms){
    const s = String(line || '').trim();
    if(!s || s.length > BI_MAXLEN || BI_STOP.test(s)) return null;
    const md = /^#{1,6}/.exec(s);
    if(md){
      const t = s.replace(/^#+[ \t]*/, '');
      if(!t || BI_STOP.test(t)) return null;
      return { kind: md[0].length === 1 ? 'book' : (md[0].length <= 2 ? 'vol' : 'ch'), title:t };
    }
    for(const g of forms){
      const p = Seq.parseOne(g.f, s);
      /* 序号的上限分三档（作者 2026-10-09《全职高手》整本导入报的「识别有漏洞」）：
         从前这里一律钉死 999，可网文一千章往后的多的是 —— 第1061章 当场不算标题，
         那一卷底下就只剩「1 章 · 三千多段」，整本书的目录并成一坨。
         章号抬到五位数；卷号照旧 999（没有一万卷的书，抬上去只会让正文里的数字串冒充卷）；
         留到第二轮才试的那一种（「20. 标题」）也照旧 999 —— 它本来最容易把正文切碎。 */
      const 顶 = g.kind === 'ch' && !g.weak ? 99999 : 999;
      if(!(p && p.n >= 1 && p.n <= 顶)) continue;
      /* 序号那一截后面紧接着就是话（「第一部他看了三遍」），这一行不算标题。
         两种情况放过：一是「卷」「章」这两个字在正文里基本不会这样连着写；
         二是这张格式自己就把分开的地方写在了后缀里 ——「20. 标题」那一张的后缀是「. 」，已经分开过了。 */
      const rest = String(p.rest || '');
      if(rest){
        const suf = String(g.f.suf || ''), pre = String(g.f.pre || '');
        const 分开了 = /^[ \t　:：、，,.·…\-—–(~～（()【\]]/.test(rest) || /[卷章]/.test(pre + suf) || /[\s:：.、]/.test(suf);
        if(!分开了) continue;
      }
      return { kind:g.kind, title:s };
    }
    return null;
  },
  /* 一整份文本摊成 卷 → 章 → 正文行：空行只当分段，本身不进正文；行首那两个全角空格也剥掉 */
  split(text, useWeak){
    const forms = this.forms().filter(g => useWeak || !g.weak);
    const root = { groups:[], vol:0, ch:0, lines:0, w:0, book:'', lead:false, weak:!!useWeak };
    let g = null, c = null;
    const newG = title => { g = { title:title || '', chs:[] }; root.groups.push(g); return g; };
    const newC = title => { if(!g) newG(''); c = { title:title || '', lines:[] }; g.chs.push(c); return c; };
    for(const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')){
      const s = String(raw).replace(/^[\s　 ]+|[\s　 ]+$/g, '');
      if(!s) continue;
      const k = this.head(s, forms);
      if(k && k.kind === 'book'){ root.book = k.title; continue; }
      if(k && k.kind === 'vol'){ newG(k.title); root.vol++; c = null; continue; }
      if(k && k.kind === 'ch'){ newC(k.title); root.ch++; continue; }
      if(!c){ newC(''); root.lead = true; }
      c.lines.push(s); root.lines++;
      /* 字数跟着全站那一个口径走：w 是 Word 那一套（汉字逐个、连着的一串英文算一个词） */
      root.w += wordCount(s);
    }
    if(!root.groups.length) root.groups.push({ title:'', chs:[] });
    /* 这份里有卷标题时，开头那几段还没归章的正文并进第一卷的头几章 ——
       一本分卷的书不该同时在根上挂一章，那样目录会分成两截。 */
    const 开头 = root.groups[0];
    if(root.vol && 开头 && !开头.title && root.groups.length > 1){
      root.leadN = (开头.chs[0] || { lines:[] }).lines.length;
      root.groups.shift();
      root.groups[0].chs = 开头.chs.concat(root.groups[0].chs);
    } else if(开头 && !开头.title && 开头.chs.length) root.leadN = 开头.chs[0].lines.length;
    return root;
  },
  parse(text){
    const a = this.split(text, false);
    if(a.ch || a.vol) return a;                 /* 认得出带汉字名堂的标题就用它，第二轮那种容易切错 */
    const b = this.split(text, true);
    return (b.ch || b.vol) ? b : a;             /* 两种都认不出：整份落成一章，章名由人给 */
  },
  /* 编码：先当 UTF-8 硬读，读不动（没 BOM 的那份中文常是 GBK）再退 GBK；两头都不对就说实话，不闷头出一堆方块 */
  async read(f){
    const buf = await f.arrayBuffer();
    const dec = enc => { try{ return new TextDecoder(enc, { fatal:true }).decode(buf); }catch(e){ return null; } };
    let t = dec('utf-8'), enc = 'UTF-8';
    if(t === null){ t = dec('gbk'); enc = 'GBK'; }
    if(t === null) return { err:'这份文件既不是 UTF-8 也不是 GBK，读不出字来' };
    if(t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    return { text:t, enc };
  },

  /* 挑文件那一只口。挂在调用方那一排里（和词格那一排同一个写法）比用完就扔好：页面上看得见、点得着，坏了也好指认。 */
  field(mode, after){
    return h('input', { type:'file', class:'wnw-impfile', accept:'.txt,.md,.text,.markdown', style:'display:none',
      onchange:async e => { const f = e.target.files && e.target.files[0]; e.target.value = '';
        if(f) await this.open(f, mode, after); } });
  },
  pick(mode, after){ this.field(mode, after).click(); },
  async open(f, mode, after){
    const r = await this.read(f);
    if(r.err){ toast(r.err, true); return; }
    const tree = this.parse(r.text);
    if(!tree.lines && !tree.ch){ toast('「' + f.name + '」里没读到正文'); return; }
    this.dlg({ file:String(f.name || '').replace(/\.[^.]+$/, ''), enc:r.enc, tree, mode, after:after || null });
  },

  /* ---------- 界面：先给一眼看得完的统计，再把卷章列出来让他对一眼 ---------- */
  dlg(st){
    const t = st.tree, named = !!t.vol;
    const box = h('div', { class:'wnw-col' });
    const row = (label, ...kids) => h('div', { class:'wnw-field' }, [h('span', {}, label), h('div', { class:'wnw-row' }, kids)]);
    const name = h('input', { class:'wnw-input', value:t.book || st.file || '未命名作品', style:'width:min(320px,80%)' });
    const nameRow = row('书名', name);
    const lead = h('input', { class:'wnw-input', value:'前言', style:'width:min(160px,60%)' });
    /* 落点两枚：从书架进来只有「另起一本」，从书里进来两个都给（并进这一本是最常要的那一个） */
    const target = h('div', { class:'wnw-seg' });
    const ways = st.mode === 'new' ? [['new', '另起一本新的']]
      : [['here', '并进《' + (Work.book ? Work.book.title : '当前这本') + '》'], ['new', '另起一本新的']];
    st.way = st.mode === 'new' ? 'new' : 'here';
    const sync = () => {
      target.innerHTML = '';
      for(const [k, n] of ways) target.appendChild(h('button', { class:st.way === k ? 'on' : '',
        onclick:() => { st.way = k; sync(); } }, n));
      nameRow.style.display = st.way === 'new' ? '' : 'none';
    };
    box.appendChild(row('落到哪儿', target));
    box.appendChild(nameRow);
    if(t.lead) box.appendChild(row('开头那 ' + (t.leadN || 0) + ' 段没归到任何一章，这一章叫', lead));
    box.appendChild(h('div', { class:'wnw-hint' },
      (named ? '认出 ' + t.vol + ' 个卷标题、' : '这份里没认出卷标题（照不分卷进，卷标题认的是「第X卷 / 第X部 / 卷X」这一类）· ')
      + t.ch + ' 个章节标题 · ' + t.lines + ' 段正文 · ' + t.w + ' 字 · 按 ' + st.enc + ' 读的'
      + (t.weak ? ' · 章节号认的是「20. 标题」这一类（别的写法一个没认出）' : '')));
    const list = h('div', { class:'wnw-col', style:'max-height:min(42vh,400px);overflow:auto;gap:2px' });
    for(const g of t.groups){
      if(named) list.appendChild(h('b', { style:'margin-top:6px' }, g.title + ' · ' + g.chs.length + ' 章'));
      for(const c of g.chs.slice(0, 3)) list.appendChild(h('span', { class:'wnw-hint' }, '　' + (c.title || '（没名字，上面那栏给一个）') + ' · ' + c.lines.length + ' 段'));
      if(g.chs.length > 3) list.appendChild(h('span', { class:'wnw-hint' }, '　… 后面还有 ' + (g.chs.length - 3) + ' 章'));
    }
    box.appendChild(list);
    const go = h('button', { class:'wnw-btn primary', onclick:() => this.run(st, name.value.trim(), lead.value.trim()) }, '导入');
    sync();
    Overlay.open('整本导入 · ' + (st.file || ''), box, [go, h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消')]);
  },

  /* 新建那一本出厂自带一卷一章（Shelf.create 给的），导入的结构铺在它后面就多一套空壳：
     那一张章一个字没写，连它那条卷一起撤掉再铺 —— 只撤这一本刚出厂那一对，别的一本不动。 */
  async clearSeed(b){
    if(!(b.chs.length === 1 && b.vols.length === 1 && !chWords(b.chs[0]))) return false;
    await DB.del('book.' + b.id + '.ch.' + b.chs[0].id);
    b.chs = []; b.vols = [];
    return true;
  },
  async into(b, t, opt){
    const named = !!t.vol;
    let lastVid = b.chs.length ? b.chs[b.chs.length - 1].vid
      : (b.vols.length ? b.vols[b.vols.length - 1].id : '');
    let av = 0, ac = 0;
    for(const g of t.groups){
      let vid = lastVid;
      if(named){
        const v = { id: uid('v'), title: g.title, desc:'', collapsed:false };
        b.vols.push(v); vid = v.id; lastVid = vid; av++;
      }
      for(const m of g.chs){
        const now = Date.now();
        const c = { id: uid('c'), vid, title: m.title || (opt.lead || '正文'), mode:'write',
          outline:[], paras: (m.lines.length ? m.lines : ['']).map(x => newPara('p', x)),
          annos:[], revs:[], versions:[], at:now, created:now };
        const cnt = parasCount(c.paras);
        b.chs.push({ id:c.id, vid, title:c.title, mode:'write', han:cnt.han, w:cnt.w,
          para:paraCount(c.paras), at:now, created:now });
        await DB.put('book.' + b.id + '.ch.' + c.id, c);
        ac++;
        if(ac % 20 === 0) await new Promise(r => setTimeout(r, 0));   /* 一本几十上百章，别让这一趟看着像冻住 */
      }
    }
    return { av, ac };
  },
  async run(st, title, lead){
    if(this.busy) return;
    this.busy = true;
    try{
      const t = st.tree, named = !!t.vol;
      let b;
      /* 并进当前这本吃的是 Work 手里那一份活的：另读一份进来会把刚改的那一笔盖掉，存的时候也存错了人 */
      if(st.way === 'new'){
        b = await Shelf.create(title || st.file || '未命名作品', (Work.book && Work.book.groupId) || '');
        await this.clearSeed(b);
      } else b = Work.book;
      const r = await this.into(b, t, { lead });
      /* 认不出卷标题这一类就照「不分卷」办，但只在新书这么定 —— 并进一本本来就分卷的书，不改它这个状态 */
      if(st.way === 'new' && !named) b.novol = true;
      if(st.way === 'new') await Shelf.saveBook(b); else await Work.saveBook();
      Overlay.close();
      toast('整本导入进《' + b.title + '》：' + (named ? r.av + ' 卷 ' : '') + r.ac + ' 章'
        + (named ? '' : '（不分卷）') + ' · ' + t.w + ' 字');
      if(st.way === 'new') await Shell.openBook(b.id); else if(st.after) st.after();
    }catch(e){
      toast('导入中断：' + ((e && e.message) || e), true);
    }
    this.busy = false;
  }
};
