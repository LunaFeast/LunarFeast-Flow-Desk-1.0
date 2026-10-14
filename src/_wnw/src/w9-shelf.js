/* ============================================================
   WNW 书架 v0.3：首页是一排书，支持分组 / 系列 / 网格与列表视图切换
   ============================================================ */
addCss(`
.wnw-shelf-empty{display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;padding:60px 20px;color:var(--text-light);}
.wnw-newbook{border:var(--hair-w) dashed var(--hair-color);background:transparent;border-radius:var(--r-card);min-height:190px;
  display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;cursor:pointer;color:var(--text-light);}
.wnw-newbook:hover{border-color:var(--accent);color:var(--accent-text,var(--accent));}
.wnw-newbook .plus{font-size:1.8em;line-height:1;}
.wnw-gtag{border:var(--bw) solid var(--ctl-edge,var(--input-border));border-radius:var(--r-pill,5px);padding:1px 9px;font-size:.8em;color:var(--text-light);}
.wnw-gtag:hover{border-color:var(--accent);color:var(--accent-text,var(--accent));}
/* 封面是一块纯色，不是渐变：默认每一本都吃当前方案的主题色，
   用户在「作品设置」里手动换成这套配色里的其他颜色时，卡片上那一句 --book-cover 就是所选的那一色
   （存的是 var(--slot-N) 这样一句取值，不是写死的色号，换配色方案时封面跟着一起换）。
   封面上那两个字跟着底走：钉了哪一档色位，就吃外观层为同一档算好的那一对（--slot-N-cover 底 +
   --slot-N-cover-ink 字），没钉（跟着主题色）就吃主按钮那个反白字同一个色号 —— 都不再写死纯白。
   这一块底从前还压了 15% 的透明，让底下的卡面透上来：那样一来封面实际坐在哪一块色上
   要等外观那一层算完才知道，字色就没法在这儿一次推到位，所以这一层透明一并撤了。 */
.wnw-book .cov2{flex:0 0 auto;height:56px;border-radius:var(--r-card);margin-bottom:6px;
  background:var(--book-cover,var(--accent));
  display:flex;align-items:center;justify-content:center;color:var(--book-cover-ink,var(--sel-text));font-weight:800;letter-spacing:.1em;}
.wnw-book .pct{font-size:.82em;color:var(--text-light);}
/* 全局池的行：左边内容，右边归属下拉 + 删除，窄屏时下拉自己换行 */
.wnw-pool-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:var(--bw) solid var(--ctl-edge,var(--input-border));
  border-radius:var(--r-card);padding:7px 10px;}
.wnw-pool-row > .tx{flex:1 1 12em;min-width:0;}
.wnw-pool-row select{flex:0 0 auto;width:auto;max-width:11em;font-size:.9em;}
.wnw-pool-row .who{font-size:.82em;color:var(--text-light);flex:0 0 auto;}
.wnw-pool-add{display:grid;gap:8px;}
`);

/* 封面能挑的那几色：空串是「跟着主题色走」（默认，所有书一个纯色），后面五个是当前这套配色里的五个强调位。
   存下去的永远是 var(--slot-N) 这样一句取值，不是色号 —— 换配色方案时封面自己跟着换。
   （和卡片上色那套 COLOR_SLOTS 同一个写法；直接存 --slot-N 这个名字，CSS 那边认不出一句颜色，圆点和封面都会变成空白色。）
   存档里万一躺着一个不认得的值（早先手填的色号、别处带来的串），COVER_HAS 认不下来就当没钉过，回到主题色。 */
const COVER_VARS = ['', ...accentSlotVars()];
function COVER_HAS(v){ return COVER_VARS.includes(v); }
/* 封面钉的是第几档色位（0 是「跟着主题色走」）：认不下来（早先手填的色号）也回 0。
   认出来的是哪一档，封面那块底和压在这块底上的字就吃外观层为同一档算好的那一对。 */
function COVER_SLOT(v){ const i = COVER_VARS.indexOf(v); return i > 0 ? i : 0; }
/* 选点那一排摆的色块要和封面真刷出来的那一色对上：外观层为了「封面上那两个字站得住」，
   可能把这一块纯色往深（或浅）推过一格，所以这里展示的也是推完的那一个，不是色位原色。 */
function COVER_BG(v){ const i = COVER_SLOT(v); return i ? 'var(--slot-' + i + '-cover)' : 'var(--accent)'; }

Shelf.view = {
  st:{ grid:true, group:'', series:'', q:'' },
  /* 选中集和「连选的那一根锚点」不进门档：关了软件再开，不该还压着一摞挑中的书。
     order 是这一趟摆出来的书序（shift 连选按位置算，不按 id 算）。 */
  sel:new Set(), anchor:null, order:[], keyFn:null,
  async mount(host){
    this.st = Object.assign(this.st, await State.get('shelf-view', {}));
    this.host = host;
    this.sel.clear(); this.anchor = null;
    this.bindKeys();
    await this.draw();
  },
  async draw(){
    const d = await Shelf.load();
    const host = this.host;
    host.innerHTML = '';
    const wrap = h('div', { class:'wnw-shelf' });
    host.appendChild(wrap);
    /* ---- 顶栏：分组下拉 / 搜索 / 视图切换 / 新建 ---- */
    const top = h('div', { class:'wnw-shelf-top' });
    const gs = h('select', { class:'wnw-input' });
    gs.appendChild(h('option', { value:'', selected:this.st.group === '' }, '全部分组'));
    for(const g of d.groups) gs.appendChild(h('option', { value:g.id, selected:this.st.group === g.id }, g.name));
    gs.addEventListener('change', () => { this.st.group = gs.value; this.save(); this.draw(); });
    const ss = h('select', { class:'wnw-input' });
    ss.appendChild(h('option', { value:'', selected:this.st.series === '' }, '全部系列'));
    for(const s of d.series) ss.appendChild(h('option', { value:s.id, selected:this.st.series === s.id }, s.name + '（' + s.books.length + '）'));
    ss.addEventListener('change', () => { this.st.series = ss.value; this.save(); this.draw(); });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找书', value:this.st.q });
    q.addEventListener('input', () => { this.st.q = q.value; this.save(); this.list(wrap); });
    top.appendChild(h('span', { class:'ttl' }, '我的书架'));
    top.appendChild(gs); top.appendChild(ss); top.appendChild(q);
    top.appendChild(h('span', { style:'flex:1' }));
    const seg = h('div', { class:'wnw-seg' });
    for(const [k, ic, tx] of [[true,'grid','网格'], [false,'list','列表']])
      seg.appendChild(h('button', { class:(this.st.grid === k ? 'on ' : '') + 'w-txt', html:icoMarkup(ic) + tx, onclick:() => { this.st.grid = k; this.save(); this.draw(); } }));
    top.appendChild(seg);
    top.appendChild(h('button', { class:'wnw-btn', onclick:() => this.groupDlg() }, '分组'));
    top.appendChild(h('button', { class:'wnw-btn', onclick:() => this.seriesDlg() }, '系列'));
    top.appendChild(h('button', { class:'wnw-btn', onclick:() => Pools.cards() }, '全局卡片池'));
    top.appendChild(h('button', { class:'wnw-btn', onclick:() => Pools.insps() }, '全局灵感池'));
    /* 全局设置不隶属任何一本书，入口摆在书架这一排，不用先点进一本作品 */
    top.appendChild(h('button', { class:'wnw-btn w-txt', title:'全局设置 · 配色 / 字号 / 高亮规则 / 词库',
      html:icoMarkup('gear') + '<span>设置</span>', onclick:() => Settings.open() }));
    /* 整本导入（外32 图6）：挑文件那一只口常挂在这一排里，按钮只管把它按下去 */
    const impFile = BookImport.field('new');
    top.appendChild(impFile);
    top.appendChild(h('button', { class:'wnw-btn w-txt', title:'整本导入 · 挑一份 txt / md，认里面的卷标题（第X卷 / 卷X / 第X部 / 第X辑）和章节标题（第X章 / 第X节 / 第X回），按卷章结构另起一本新的 · 卷标题一个都没认出就整本按不分卷进',
      html:icoMarkup('imp') + '<span>整本导入</span>', onclick:() => impFile.click() }));
    top.appendChild(h('button', { class:'wnw-btn primary w-txt', html:icoMarkup('plus') + '新建作品', onclick:() => this.newDlg() }));
    wrap.appendChild(top);
    const body = h('div', { class:'wnw-shelf-body' });
    wrap.appendChild(body);
    this.body = body;
    this.list();
  },
  save(){ State.set('shelf-view', this.st); },
  async list(){
    const d = await Shelf.load();
    const body = this.body;
    body.innerHTML = '';
    let books = d.books.slice();
    if(this.st.group) books = books.filter(b => (b.groupId || '') === this.st.group);
    if(this.st.series){ const s = d.series.find(x => x.id === this.st.series); if(s) books = books.filter(b => s.books.includes(b.id)); }
    if(this.st.q){ const q = this.st.q.toLowerCase(); books = books.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q)); }
    books.sort((a, b) => (b.at || 0) - (a.at || 0));
    /* 选中集跟着这一趟的筛选走：筛掉的那几本从手里清出去。
       不清的后果是「批量删除」会动到屏幕上根本没摆出来的书。 */
    this.order = books.map(b => b.id);
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    if(!books.length){
      body.appendChild(h('div', { class:'wnw-shelf-empty' }, [
        h('div', {}, d.books.length ? '这个筛选下没有书' : '书架还是空的'),
        h('div', { class:'wnw-row' }, [
          h('button', { class:'wnw-btn primary w-txt', html:icoMarkup('plus') + '新建作品', onclick:() => this.newDlg() }),
          h('button', { class:'wnw-btn w-txt', title:'手边已经有一份整本书的 txt / md：挑它，认卷标题和章节标题摊成卷章结构',
            html:icoMarkup('imp') + '<span>整本导入</span>', onclick:() => BookImport.pick('new') })
        ])
      ]));
      return;
    }
    /* wnw-nosel：这一排格子是纯列表 UI，选中态自己画（.sel 那一档）。
       浏览器那份文字选区留着只会碍事 —— Shift 连选、按住拖都拖出一片蓝底。
       找书那一栏和顶栏不在这个容器里，照旧可选可复制。 */
    const grid = h('div', { class:'wnw-books wnw-nosel' + (this.st.grid ? '' : ' list') });
    body.appendChild(grid);
    grid.appendChild(this.newCard());
    for(const b of books) grid.appendChild(this.card(b, d));
  },
  newCard(){
    return h('button', { class:'wnw-newbook', onclick:() => this.newDlg() }, [
      h('span', { class:'plus', html:icoMarkup('plus') }), h('span', {}, '新建作品')
    ]);
  },
  card(b, d){
    const g = d.groups.find(x => x.id === b.groupId);
    const pct = b.goal ? Math.min(100, Math.round((b.total || 0) / b.goal * 100)) : null;
    /* 开着 / 当前 / 选中这三档决定卡片是浅底、描边还是粗边框（样式在 w0-skin） */
    const st = (BookTabs.has(b.id) ? ' open' : '') + (BookTabs.st.cur === b.id ? ' cur' : '') + (this.sel.has(b.id) ? ' sel' : '');
    /* 单击只选中，双击才开；右键接管原来那个 3 个点的按钮（外15 第 8、9 条）。
       双击前那两下单击会把选中收到这一本上，正好是「开着的就是刚挑的这一本」，不用另做补偿。 */
    const act = { class:'wnw-book-row' + st, onclick:ev => this.clickBook(b, ev),
      ondblclick:() => Shell.openBook(b.id), oncontextmenu:ev => { ev.preventDefault(); this.bookMenu(b, ev); } };
    if(!this.st.grid){
      const row = h('div', act, [
        h('span', { class:'nm' }, b.title),
        g ? h('span', { class:'wnw-gtag' }, g.name) : null,
        h('span', { class:'wnw-hint' }, (b.novol ? '不分卷' : (b.vols || 0) + ' 卷') + ' · ' + (b.chs || 0) + ' 章 · ' + (b.total || 0) + ' 字 · ' + agoText(b.at)),
        h('span', { style:'flex:1' }),
        pct === null ? null : h('span', { class:'pct' }, pct + '%')
      ]);
      return row;
    }
    const ci = COVER_SLOT(b.cover);
    const card = h('div', Object.assign({}, act, { class:'wnw-book' + st,
      style: ci ? '--book-cover:var(--slot-' + ci + '-cover);--book-cover-ink:var(--slot-' + ci + '-cover-ink)' : '' }));
    card.appendChild(h('i', { class:'cov' }));
    card.appendChild(h('div', { class:'cov2' }, (b.title || '？').slice(0, 2)));
    card.appendChild(h('div', { class:'nm' }, b.title));
    if(g) card.appendChild(h('span', { class:'wnw-gtag', style:'align-self:flex-start' }, g.name));
    const foot = h('div', { class:'meta' });
    foot.appendChild(h('div', {}, (b.chs || 0) + ' 章 · ' + (b.total || 0) + ' 字'));
    foot.appendChild(h('div', {}, '最近 ' + agoText(b.at)));
    card.appendChild(foot);
    if(pct !== null){
      card.appendChild(h('div', { class:'bar' }, h('i', { style:'width:' + pct + '%' })));
      card.appendChild(h('span', { class:'pct' }, '目标 ' + pct + '%'));
    }
    return card;
  },
  /* ---------- 选中：单击一枚、Ctrl 逐个加、Shift 从锚点连一片（外15 第 6、8 条同一套）---------- */
  clickBook(b, ev){
    const id = b.id, all = this.order;
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
  },
  /* Ctrl+A 全选的是「架子上现在摆着的这几本」，不是库里所有书：
     筛着一个组的时候按全选，把没显示的那几本也捞进手里的话，下一刀批量删除就删到别组去了。 */
  bindKeys(){
    /* 认的不是「绑过没有」，是「那一枚还挂在账上没有」：整副骨架拆掉重挂那一趟（w6-boot.js:64 的 wnwOffAll()）
       会把登记过的监听一并摘走，光记着「我绑过了」就成了哑键 —— 和卡片、章纲、看板那三处同一个办法。 */
    if(this.keyFn && WNW_ON.some(it => it[2] === this.keyFn)) return;
    this.keyFn = wnwOn(document, 'keydown', ev => {
      if(Shell.mode !== 'shelf') return;
      if(ev.isComposing || ev.keyCode === 229) return;
      /* 浮层和右键菜单开着的时候不抢键盘：那两头各有自己的关闭键 */
      if(Overlay.node || Menu.node) return;
      const k = String(ev.key || '').toLowerCase();
      if(k === 'escape'){ if(this.sel.size){ this.sel.clear(); this.list(); } return; }
      if(k !== 'a' || !(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey) return;
      /* 光标在输入框里（找书那一条）：Ctrl+A 该全选文本，不该全选书 */
      if(ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable]')) return;
      ev.preventDefault();
      this.sel = new Set(this.order);
      this.anchor = this.order[this.order.length - 1] || null;
      this.list();
    });
  },
  /* 右键菜单：3 个点那一个的全部功能原样搬过来，名字一个字没改；
     手里挑中两本以上、且右键的就是挑中的其中一本，头顶多两条批量的。 */
  bookMenu(b, ev){
    const many = this.sel.size > 1 && this.sel.has(b.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 本 · 批量分组', fn:() => this.batchGroup() } : null,
      many ? { label:'选中 ' + this.sel.size + ' 本 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:true } : null,
      { label:'作品设置', fn:() => this.bookDlg(b) },
      { label:'整本导出', fn:() => this.exportBook(b) },
      { sep:true },
      { label:'删掉这本书', fn:() => this.delBook(b) }
    ]);
  },
  async batchGroup(){
    const ids = [...this.sel], d = Shelf.data;
    const box = h('div', { class:'wnw-col' });
    const pick = async gid => {
      for(const id of ids){
        const full = await Shelf.get(id);
        if(!full) continue;
        full.groupId = gid; await Shelf.saveBook(full);
      }
      Overlay.close();
      toast('已把 ' + ids.length + ' 本' + (gid ? '分到一组' : '移出分组'));
      this.draw();
    };
    box.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap', onclick:() => pick('') },
      [h('span', { class:'ttl' }, '（不分组）')]));
    for(const g of d.groups) box.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap', onclick:() => pick(g.id) },
      [h('span', { class:'ttl' }, g.name), h('span', { style:'flex:1' }),
        h('span', { class:'wnw-hint' }, d.books.filter(b => b.groupId === g.id).length + ' 本')]));
    Overlay.open('批量分组 · ' + ids.length + ' 本', box);
  },
  async batchDel(){
    const ids = [...this.sel];
    const names = ids.map(id => (Shelf.data.books.find(b => b.id === id) || {}).title).filter(Boolean);
    if(!confirm('删掉选中的 ' + ids.length + ' 本？这些书的章、卡片、看板会一起删：\n' + names.join('、'))) return;
    for(const id of ids){ await Shelf.remove(id); BookTabs.drop(id); }
    this.sel.clear(); this.anchor = null;
    this.draw(); BookTabs.render();
  },
  async exportBook(b){
    if(!b.chs){ toast('这本书还没有章'); return; }
    /* 导出要读这本书的章节，先把 Work 指过来；导完再指回原来那本，书架上看着像什么都没发生 */
    const prev = Work.book && Work.book.id;
    await Work.open(b.id);
    try{ await BookExport.dlg('book'); }
    finally{ if(prev && prev !== b.id) await Work.open(prev); }
    this.draw();
  },
  async delBook(b){
    if(!confirm('删掉《' + b.title + '》？这本书的所有章、卡片、看板都会一起删。')) return;
    await Shelf.remove(b.id); BookTabs.drop(b.id);
    this.sel.delete(b.id);
    this.draw();
  },
  async bookDlg(b){
    const d = Shelf.data;
    const box = h('div', { class:'wnw-col', style:'min-width:min(420px,88vw)' });
    const inp = h('input', { class:'wnw-input', value:b.title });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '书名'), inp]));
    const au = h('input', { class:'wnw-input', value:b.author || '', placeholder:'作者' });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '作者'), au]));
    const goal = h('input', { class:'wnw-input', type:'number', value:b.goal || 0 });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '目标字数'), goal]));
    const grp = h('select', { class:'wnw-input' });
    grp.appendChild(h('option', { value:'', selected:!b.groupId }, '（不分组）'));
    for(const g of d.groups) grp.appendChild(h('option', { value:g.id, selected:b.groupId === g.id }, g.name));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '分组'), grp]));
    const ser = h('select', { class:'wnw-input' });
    ser.appendChild(h('option', { value:'', selected:!b.seriesId }, '（不属于系列）'));
    for(const s of d.series) ser.appendChild(h('option', { value:s.id, selected:b.seriesId === s.id }, s.name));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '系列'), ser]));
    const bookFs = (await State.get('fs-book', {}))[b.id] || '';
    const fsSel = h('select', { class:'wnw-input' });
    fsSel.appendChild(h('option', { value:'', selected:!bookFs }, '跟随全局（' + Fs.global + '）'));
    for(const p of Fs.plans) fsSel.appendChild(h('option', { value:p.name, selected:bookFs === p.name }, p.name));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '字号方案'), fsSel]));
    /* 封面色：所有书默认一个纯色 —— 当前方案的主题色；想换就点旁边这几圆点，
       那几色都是当前这套配色里的（存的是 var(--slot-N)，换了配色方案封面跟着换）。 */
    let cover = COVER_HAS(b.cover) ? b.cover : '';
    const covRow = h('div', { class:'wnw-row', style:'flex-wrap:nowrap' });
    const covDraw = () => {
      covRow.innerHTML = '';
      for(const v of COVER_VARS) covRow.appendChild(h('button', {
        class:'wnw-dot' + (cover === v ? ' on' : ''), style:'background:' + COVER_BG(v),
        title: v ? '换成当前这套配色里的这一色' : '主题色：所有书默认这一色',
        onclick:() => { cover = v; covDraw(); } }));
    };
    covDraw();
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '封面色'), covRow]));
    Overlay.open('作品设置 · ' + b.title, box, [
      h('button', { class:'wnw-btn primary', onclick:async () => {
        const full = await Shelf.get(b.id);
        full.title = inp.value.trim() || full.title; full.author = au.value.trim(); full.goal = +goal.value || 0;
        full.groupId = grp.value; full.seriesId = ser.value; full.cover = cover;
        await Shelf.saveBook(full);
        if(ser.value){ const s = d.series.find(x => x.id === ser.value); if(s && !s.books.includes(b.id)) s.books.push(b.id); await Shelf.save(); }
        await Fs.bindBook(b.id, fsSel.value);
        Overlay.close(); this.draw();
        BookTabs.render();
      }}, '保存')
    ]);
  },
  newDlg(){
    const inp = h('input', { class:'wnw-input', placeholder:'书名', style:'width:100%' });
    const box = h('div', { class:'wnw-col' }, [inp]);
    Overlay.open('新建作品', box, [h('button', { class:'wnw-btn primary', onclick:async () => {
      /* 建到一半出岔子也要把话说清楚并把窗关掉，不然这个蒙层就一直压着，看着像整页卡死 */
      let b;
      try{ b = await Shelf.create(inp.value.trim() || '未命名作品', this.st.group || ''); }
      catch(e){ toast('新建失败：' + ((e && e.message) || e)); return; }
      Overlay.close();
      await Shell.openBook(b.id);
    }}, '建好并进入')]);
    inp.focus();
    inp.addEventListener('keydown', e => { if(e.isComposing || e.keyCode === 229) return; if(e.key === 'Enter') wnwRoot().querySelector('.wnw-panel-foot .wnw-btn').click(); });
  },
  groupDlg(重开){
    const d = Shelf.data;
    const box = h('div', { class:'wnw-col' });
    const inp = h('input', { class:'wnw-input', placeholder:'新分组名' });
    box.appendChild(h('div', { class:'wnw-row' }, [inp, h('button', { class:'wnw-btn mini', onclick:async () => { if(!inp.value.trim()) return; await Shelf.addGroup(inp.value.trim()); inp.value = ''; this.draw(); this.groupDlg(true); }, html:icoMarkup('plus') })]));
    for(const g of d.groups)
      box.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap' }, [
        h('span', { class:'ttl' }, g.name),
        h('span', { class:'wnw-hint' }, d.books.filter(b => b.groupId === g.id).length + ' 本'),
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', onclick:async () => {
          const n = d.books.filter(b => b.groupId === g.id).length;
          if(!await wnwAsk('删掉分组「' + g.name + '」？' + (n ? '这 ' + n + ' 本书回到没分组那一档，书本身一本不动。' : '这个分组里没书。'))) return;
          await Shelf.delGroup(g.id); this.draw(); this.groupDlg(true);
        } }, '删')
      ]));
    /* 加完一个分组、删完一个分组，这一张是自己重开自己的：必须走 redraw 把旧那份扔掉。
       不这么办的话旧那份被压进 below，"新建分组"要按两次关闭才退得掉（议题 15）。 */
    Overlay.open('分组', box, null, 重开 ? { redraw: true } : null);
  },
  seriesDlg(重开){
    const d = Shelf.data;
    const box = h('div', { class:'wnw-col' });
    const inp = h('input', { class:'wnw-input', placeholder:'新系列名（比如：某某世界观）' });
    box.appendChild(h('div', { class:'wnw-row' }, [inp, h('button', { class:'wnw-btn mini', onclick:async () => { if(!inp.value.trim()) return; await Shelf.addSeries(inp.value.trim()); inp.value = ''; this.draw(); this.seriesDlg(true); }, html:icoMarkup('plus') })]));
    for(const s of d.series)
      box.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap' }, [
        h('span', { class:'ttl' }, s.name),
        h('span', { class:'wnw-hint' }, s.books.length + ' 本'),
        h('span', { style:'flex:1' }),
        h('button', { class:'wnw-btn mini', onclick:async () => {
          if(!await wnwAsk('删掉系列「' + s.name + '」？这个系列名单会没，' + s.books.length + ' 本书本身一本不动。')) return;
          await Shelf.seriesDel(s.id); this.draw(); this.seriesDlg(true);
        } }, '删')
      ]));
    Overlay.open('系列', box, null, 重开 ? { redraw: true } : null);
  }
};

/* ============================================================
   全局池：设定卡 / 灵感在书架上就能管，不必先开一本书
   归属只有两种：记在某本书名下（bookId=书 id），或留全局（bookId=''，每本书都读得到）。
   列表里拿到的是索引行，改字段前必须先 get 整条，不然写回去会把正文结构抹掉。
   ============================================================ */
const Pools = {
  where(bid){ return bid ? (bookTitle(bid) || '（书已删）') : '全局'; },
  /* 一行一个归属下拉：它自己就是"现在记在哪"，不用旁边再摆个标签 */
  ownerSel(cur, on, filter){
    const s = h('select', { class:'wnw-input' });
    if(filter) s.appendChild(h('option', { value:'__ALL__', selected:cur === '__ALL__' }, '全局 + 各本书'));
    s.appendChild(h('option', { value:'', selected:cur === '' }, filter ? '只有全局' : '全局'));
    for(const b of Shelf.data.books) s.appendChild(h('option', { value:b.id, selected:cur === b.id }, b.title));
    s.addEventListener('change', () => on(s.value));
    return s;
  },
  async cards(){
    await Shelf.load(); await Cards.loadTpls();
    const st = { scope:'', q:'' };
    const box = h('div', { class:'wnw-col' });
    const list = h('div', { class:'wnw-col' });
    const bar = h('div', { class:'wnw-row' });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找卡' });
    q.addEventListener('input', () => { st.q = q.value; draw(); });
    const draw = async () => {
      const all = await Cards.all();
      const kw = st.q.trim().toLowerCase();
      const hit = all.filter(m => (st.scope === '__ALL__' || (st.scope === '' ? !m.bookId : m.bookId === st.scope)) &&
        (!kw || (m.title + ' ' + chips(m.aliases) + ' ' + chips(m.tags)).toLowerCase().includes(kw)));
      hit.sort((a, b) => b.at - a.at);
      list.innerHTML = '';
      list.appendChild(h('div', { class:'wnw-hint' }, hit.length + ' 张'));
      if(!hit.length) list.appendChild(h('div', { class:'wnw-hint' }, '这个范围里还没有卡'));
      for(const m of hit) list.appendChild(this.cardRow(m, draw));
    };
    bar.appendChild(this.ownerSel(st.scope, v => { st.scope = v; draw(); }, true));
    bar.appendChild(q);
    const add = h('div', { class:'wnw-row' });
    const name = h('input', { class:'wnw-input', placeholder:'新卡名字', style:'flex:1 1 10em;min-width:0' });
    const tpl = h('select', { class:'wnw-input', style:'width:auto;max-width:11em' },
      [h('option', { value:'', selected:true }, '空白卡')].concat(Cards.tpls.map(t => h('option', { value:t.id }, t.name))));
    add.appendChild(name); add.appendChild(tpl);
    add.appendChild(h('button', { class:'wnw-btn primary w-txt', html:icoMarkup('plus') + '建卡', onclick:() => this.newCard(st, name, tpl.value, draw) }));
    box.appendChild(bar); box.appendChild(add); box.appendChild(list);
    Overlay.open('全局卡片池', box, null, { wide:true });
    draw();
  },
  cardRow(m, draw){
    const row = h('div', { class:'wnw-pool-row' });
    row.appendChild(h('i', { style:'width:9px;height:9px;border-radius:var(--r-pill,5px);flex:0 0 auto;background:' + (m.color || 'var(--text-light)') }));
    row.appendChild(h('span', { class:'tx', title:chips(m.aliases) || m.title }, m.title));
    row.appendChild(h('span', { class:'who' }, (m.tplName || '空白') + ' · ' + agoText(m.at)));
    row.appendChild(this.ownerSel(m.bookId, async bid => {
      if(bid === m.bookId) return;
      const dup = await Cards.taken(m.title, m.id, bid);
      if(dup){ toast('「' + dup + '」在' + this.where(bid) + '那边已经占了这个名字，卡片不许重名'); draw(); return; }
      const full = await Cards.get(m.id);
      if(!full){ toast('这张卡不在了'); draw(); return; }
      full.bookId = bid;
      await Cards.put(full); await syncCardHl(); Bus.emit('desk:cards');
      toast(bid ? '已移进《' + this.where(bid) + '》' : '已放到全局：每本书都读得到');
      draw();
    }));
    row.appendChild(h('button', { class:'wnw-btn mini', onclick:() => {
      if(!confirm('删掉「' + m.title + '」？')) return;
      Cards.del(m.id); Bus.emit('desk:cards'); draw();
    }}, '删'));
    return row;
  },
  async newCard(st, name, tplId, draw){
    const n = name.value.trim();
    if(!n){ toast('先起个名'); return; }
    /* 默认跟着当前范围：在看全局就建全局，在看某本书就建进那本书 */
    const bid = st.scope === '__ALL__' ? '' : st.scope;
    const dup = await Cards.taken(n, '', bid);
    if(dup){ toast('「' + dup + '」已经占了这个名，卡片不许重名'); return; }
    const t = Cards.tpls.find(x => x.id === tplId) || null;
    await Cards.fromTpl(t, bid, n);
    name.value = '';
    toast(bid ? '已建进《' + this.where(bid) + '》' : '已建一张全局卡：每本书都读得到');
    Bus.emit('desk:cards'); draw();
  },
  async insps(){
    await Shelf.load();
    const st = { scope:'', q:'' };
    const box = h('div', { class:'wnw-col' });
    const list = h('div', { class:'wnw-col' });
    const ta = h('textarea', { class:'wnw-fv', rows:'2', placeholder:'扔一条进来：Enter 存，Shift+Enter 换行' });
    const save = async () => {
      const v = ta.value.trim();
      if(!v){ toast('还没写'); return; }
      const bid = st.scope === '__ALL__' ? '' : st.scope;
      await Insp.add(v, bid, '书架');
      ta.value = ''; grow(ta); Bus.emit('desk:insp'); draw();
    };
    ta.addEventListener('keydown', e => {
      if(e.isComposing || e.keyCode === 229) return;
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); save(); }
    });
    const draw = async () => {
      const all = await Insp.all();
      const kw = st.q.trim().toLowerCase();
      const hit = all.filter(m => (st.scope === '__ALL__' || (st.scope === '' ? !m.bookId : m.bookId === st.scope)) &&
        (!kw || String(m.text).toLowerCase().includes(kw)));
      hit.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.at - a.at);
      list.innerHTML = '';
      list.appendChild(h('div', { class:'wnw-hint' }, hit.length + ' 条 · 标星在前'));
      if(!hit.length) list.appendChild(h('div', { class:'wnw-hint' }, '这个范围里还没有灵感'));
      for(const m of hit.slice(0, 300)) list.appendChild(this.inspRow(m, draw));
    };
    const bar = h('div', { class:'wnw-row' });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找灵感' });
    q.addEventListener('input', () => { st.q = q.value; draw(); });
    bar.appendChild(this.ownerSel(st.scope, v => { st.scope = v; draw(); }, true));
    bar.appendChild(q);
    box.appendChild(ta); box.appendChild(bar); box.appendChild(list);
    Overlay.open('全局灵感池', box, [h('button', { class:'wnw-btn primary', onclick:save }, '存（Enter）')], { wide:true });
    draw();
  },
  inspRow(m, draw){
    const row = h('div', { class:'wnw-pool-row' });
    const tx = h('span', { class:'tx', title:agoText(m.at) + ' · 点一下改', style:'cursor:pointer' },
      [m.pinned ? h('span', { class:'w-mk', title:'标过星', html:icoMarkup('star') }) : null, m.text]);
    tx.addEventListener('click', () => this.inspEdit(m, row, draw));
    row.appendChild(tx);
    /* 标星的开关：钉住画实心星，没钉画空心星，两张都是 icons\ 里的图 */
    row.appendChild(h('button', { class:'wnw-btn mini', title:'标星排在最前', html:icoMarkup(m.pinned ? 'star' : 'starOff'), onclick:async () => {
      const c = await Insp.get(m.id); if(!c){ draw(); return; }
      c.pinned = !c.pinned; await Insp.put(c); Bus.emit('desk:insp'); draw();
    }}));
    row.appendChild(this.ownerSel(m.bookId, async bid => {
      if(bid === m.bookId) return;
      const c = await Insp.get(m.id);
      if(!c){ toast('这条不在了'); draw(); return; }
      c.bookId = bid;
      await Insp.put(c); Bus.emit('desk:insp');
      toast(bid ? '已移进《' + this.where(bid) + '》' : '已放到全局：每本书都读得到');
      draw();
    }));
    row.appendChild(h('button', { class:'wnw-btn mini', onclick:async () => {
      if(!await wnwAsk('删掉这条灵感？灵感没有回收站，删了捞不回来。\n' + String(m.text || '').slice(0, 60))) return;
      await Insp.del(m.id); Bus.emit('desk:insp'); draw();
    }}, '删'));
    return row;
  },
  inspEdit(m, row, draw){
    const ta = h('textarea', { class:'wnw-fv', rows:'2', style:'flex:1 1 100%' });
    ta.value = m.text;
    row.innerHTML = '';
    row.appendChild(ta);
    row.appendChild(h('button', { class:'wnw-btn primary mini', onclick:async () => {
      const c = await Insp.get(m.id);
      if(!c){ toast('这条不在了'); draw(); return; }
      const v = ta.value.trim();
      if(!v){ toast('清空了就删掉这条'); return; }
      c.text = v; await Insp.put(c); Bus.emit('desk:insp'); draw();
    }}, '存'));
    row.appendChild(h('button', { class:'wnw-btn mini', onclick:() => draw() }, '取消'));
    ta.focus();
  }
};
