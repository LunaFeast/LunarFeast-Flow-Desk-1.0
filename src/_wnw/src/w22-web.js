/* ============================================================
   空白网页（编辑窗 ＋ 里那一档 · 外46 十 · 可拆性整理 2026-10-12 从 w3-shell.js 搬出来单独立这一份）
   ------------------------------------------------------------
   搬它和搬热力图同一个理由：这一档的代码原先住在主界面那一份（w3-shell.js）里，
   那份同时住着词格、停靠、两栏、生成库 —— 一条里程碑支只装一个功能的话，几支会撞同一颗文件。
   现在它自己一份，往 ＋ 那张清单里只登记一组（底下 PickGroup.reg 那一颗），
   主界面那份不认识「查资料」这三个字。
   ============================================================ */
addCss(`
/* 空白网页（编辑窗 ＋ 里那一档）：上面一张地址栏一排钮，下面整块是网页。
   webview 是 Electron 自己那一层，圆角它不认，靠外层 overflow:hidden 裁。 */
.wnw-root .wnw-web{gap:var(--gap);}
.wnw-root .wnw-web-bar{display:flex;gap:6px;align-items:center;flex:0 0 auto;}
.wnw-root .wnw-web-addr{flex:1 1 auto;min-width:0;}
.wnw-root .wnw-web-frame{flex:1 1 auto;min-height:0;width:100%;border:0;border-radius:var(--r-card);background:var(--face-solid,var(--card-bg));}
`);

/* ---------- 空白网页（编辑窗 ＋ 里那一档）：一张地址栏 + 一块网页区 ----------
   网页区用的是 Electron 的 <webview>（主进程 webPreferences 里开的那一行）：换成普通 iframe 的话，
   大多数网站在自己响应头里写了 frame-ancestors，地址敲进去只剩一片白 —— 那是打不开，不是空白页。
   访问过的网址记成一份历史，历史里能收藏、收藏里能置顶；历史和收藏都是全局一份，不分标签格。 */

/* ---------- 访问历史 / 收藏 ----------
   存哪儿跟着「全局设置」那一层走：字号方案（fs-plans）、栏宽（desk）这些都在 State 那一层，
   一个键存一份 JSON、往哪条路上落由它自己挑。这里就借同一只口子记这两个键，
   不另起一棵目录、不新造一种落盘格式。 */
const WebHist = {
  MAX:300,
  hist:null, fav:null, loading:null,
  /* 读进来先整一遍形：认得出地址的留下，其余丢掉。
     只在手上这份丢 —— 第一次用（什么都读不到）、上一趟只写了一半，都当空的用，不顺手补写一份新的回去。 */
  clean(list){
    if(!Array.isArray(list)) return [];
    const out = [], seen = {};
    for(const it of list){
      const u = it && typeof it.url === 'string' ? this.base(it.url.trim()) : '';
      if(!u) continue;
      const at = Math.max(0, parseInt(it.at, 10) || 0);
      const n = Math.max(1, parseInt(it.n, 10) || 1);
      const i = seen[u];
      if(i !== undefined){
        /* 上一趟没去 # 的时候存过同页的几条锚点：并成一条，次数加起来、时间取最新、名字留着有字的那个 */
        const x = out[i];
        x.n += n; x.at = Math.max(x.at, at);
        if(!x.title && typeof it.title === 'string') x.title = it.title;
        x.top = x.top || !!it.top;
        continue;
      }
      seen[u] = out.length;
      out.push({ url:u,
        title: typeof it.title === 'string' ? it.title : '',
        at, n, top: !!it.top });
    }
    return out;
  },
  /* 历史、收藏各只读一次：几个标签格、几趟点击都共用这一份 */
  async ready(){
    if(this.hist && this.fav) return this;
    if(!this.loading){
      this.loading = Promise.all([State.get('web-hist', []), State.get('web-fav', [])])
        .then(r => { this.hist = this.clean(r[0]); this.fav = this.clean(r[1]); })
        .catch(() => { if(!this.hist) this.hist = []; if(!this.fav) this.fav = []; })
        .then(() => { const me = this; me.loading = null; return me; });
    }
    return this.loading;
  },
  saveHist(){ State.set('web-hist', this.hist); },
  saveFav(){ State.set('web-fav', this.fav); },
  /* 算不算一个真网址：得带协议头。about: 那一族（空白页是这一档的起点，不是去看过的地方）不记 */
  real(u){
    u = String(u || '').trim();
    return !!u && /^[a-z][a-z0-9+.-]*:/i.test(u) && !/^about:/i.test(u);
  },
  /* 同一篇文章里跳到下一个小节、点了个展开、页内自己改了下划线后面那段 —— 这些地址前后一模一样，
     只有 # 后头不同，历史里算同一条。不去掉的话看一页能刷出十几条，全是同页的锚点噪音。
     问号后面那段（?page=2 这种是真翻页）留着，不当噪音。 */
  base(u){ return String(u || '').split('#')[0]; },
  /* 记一次访问：同一个地址只留一条 —— 时间刷到最新、次数加一，来回翻几页不会刷屏。
     打不开的那一趟走不到这里（只有真落地的翻页才报上来），所以不用另记失败名单。
     标题比地址晚一步到，先到先占个位，见下面 note()。 */
  async hit(raw, title){
    if(!this.real(raw)) return;
    const url = this.base(raw);
    const me = await this.ready();
    const i = me.hist.findIndex(x => x.url === url);
    if(i >= 0){
      const x = me.hist[i];
      x.at = Date.now(); x.n = (x.n || 1) + 1;
      if(title) x.title = title;
    } else me.hist.unshift({ url, title: title || '', at: Date.now(), n:1, top:false });
    /* 按时间从新到旧排好再削尾巴：削掉的永远是最久没看过的那几条 */
    me.hist.sort((a, b) => b.at - a.at);
    if(me.hist.length > me.MAX) me.hist.length = me.MAX;
    me.saveHist();
  },
  /* 网页自己报标题比地址晚一步：补回已经记下的那一条，别让它一直是个光地址 */
  async note(raw, title){
    if(!title) return;
    const url = this.base(raw);
    const me = await this.ready();
    const x = me.hist.find(y => y.url === url);
    if(x && x.title !== title){ x.title = title; me.saveHist(); }
  },
  isFav(url){ return (this.fav || []).some(x => x.url === url); },
  /* 收藏 / 取消收藏：再点一次就出去。收藏的那一份自己带着标题，
     之后就算把历史清空、那页再没看过，收藏这条也不掉。 */
  async toggleFav(url, title){
    const me = await this.ready();
    const i = me.fav.findIndex(x => x.url === url);
    if(i >= 0){ me.fav.splice(i, 1); me.saveFav(); return false; }
    me.fav.unshift({ url, title: title || '', at: Date.now(), n:0, top:false });
    me.saveFav(); return true;
  },
  /* 置顶只对已经收进来的那一批有意义：没收藏的网址谈不上排最前 */
  async toggleTop(url){
    const me = await this.ready();
    const x = me.fav.find(y => y.url === url);
    if(!x) return false;
    x.top = !x.top;
    me.saveFav();
    return x.top;
  },
  /* 清空只清历史：收藏是另一份，不动 */
  async clear(){ const me = await this.ready(); me.hist = []; me.saveHist(); },
  /* 按日历分三档：夜里过了十二点那一条就该进「昨天」，不是照 24 小时倒推 */
  day(ts){
    const k = todayKey(new Date(ts));
    if(k === todayKey()) return '今天';
    if(k === todayKey(new Date(Date.now() - 86400000))) return '昨天';
    return '更早';
  },
  /* 那张列表：收藏在最上面（置顶的排最前），下面按天分组，带搜索和清空。
     点一条就在开着这张列表的那一格打开这个地址 —— 谁开的列表谁接这一条，别的格子不动。 */
  async open(onPick){
    const me = await this.ready();
    let kw = '';
    const box = h('div', { class:'wnw-col' });
    const list = h('div', { class:'wnw-col', style:'gap:0' });
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找网址或标题' });
    q.addEventListener('input', () => { kw = q.value.trim().toLowerCase(); draw(); });
    const match = x => !kw || x.url.toLowerCase().includes(kw) || String(x.title || '').toLowerCase().includes(kw);
    const star = x => {
      const on = me.isFav(x.url);
      return h('button', { class:'wnw-btn mini ico' + (on ? ' on' : ''),
        title:on ? '取消收藏' : '收藏这个网址', 'aria-label':on ? '取消收藏' : '收藏',
        html:icoMarkup(on ? 'star' : 'starOff'),
        onclick:async ev => { ev.stopPropagation(); await me.toggleFav(x.url, x.title); draw(); } });
    };
    const pin = x => h('button', { class:'wnw-btn mini ico' + (x.top ? ' on' : ''),
      title:x.top ? '取消置顶' : '置顶：排在收藏最前', 'aria-label':x.top ? '取消置顶' : '置顶',
      html:icoMarkup('pin'),
      onclick:async ev => { ev.stopPropagation(); await me.toggleTop(x.url); draw(); } });
    /* 一行两层字 + 右边那两个：收藏那个历史、收藏两批都给，置顶那个只给收藏这一批。
       时间和次数只给历史看 —— 收藏那条上的时间是当初收进来的时间，报成「看过」是骗人。 */
    const row = (x, ops, at) => h('div', { class:'wnw-item wnw-hist-row', style:'flex-wrap:nowrap', title:'在这一格打开',
      onclick:() => { Overlay.close(); onPick(x.url); } }, [
      x.title ? h('span', { class:'ttl' }, x.title) : null,
      h('span', { class:'u' }, x.url),
      h('span', { style:'flex:1' }),
      at ? h('span', { class:'wnw-hint' }, agoText(x.at) + (x.n > 1 ? ' · 看过 ' + x.n + ' 次' : '')) : null,
      ...ops].filter(Boolean));
    const draw = () => {
      list.innerHTML = '';
      const favs = me.fav.filter(match).sort((a, b) => ((b.top ? 1 : 0) - (a.top ? 1 : 0)) || (b.at - a.at));
      list.appendChild(h('div', { class:'wnw-pick-h' }, '收藏'));
      if(!favs.length) list.appendChild(h('div', { class:'wnw-hint', style:'padding:4px 0' },
        '还没有收藏 · 下面想留着哪一条，点它右边那个就进这里'));
      for(const x of favs) list.appendChild(row(x, [pin(x), star(x)], false));
      const hist = me.hist.filter(match).sort((a, b) => b.at - a.at);
      list.appendChild(h('div', { class:'wnw-pick-h' }, '历史'));
      if(!hist.length)
        list.appendChild(h('div', { class:'wnw-hint', style:'padding:4px 0' }, kw ? '没有符合的网址' : '还没有访问过网址'));
      /* 按天分组：今天 / 昨天 / 更早，同一天的挨着排，空的档不摆标题 */
      let lastDay = '';
      for(const x of hist){
        const d = me.day(x.at);
        if(d !== lastDay){ lastDay = d; list.appendChild(h('div', { class:'wnw-pick-h', style:'opacity:.75' }, d)); }
        list.appendChild(row(x, [star(x)], true));
      }
    };
    box.appendChild(q); box.appendChild(list);
    Overlay.open('访问历史', box, [
      h('button', { class:'wnw-btn', title:'清空访问历史 · 收藏的那一批不动', onclick:async () => {
        if(!await wnwAsk('要把访问历史清空吗？收藏的那些不动。', '清空')) return;
        await me.clear(); draw();
      } }, '清空历史'),
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '关闭')
    ], { hist:true });
    draw();
    q.focus();
  }
};
/* 列表那一行的两层字：标题一行、地址一行，长了各自收省略号，不许把右边那两个挤没。
   行底那道分隔线和整行的长相都还是现成列表的，这里只补截断，不另加边框。 */
addCss(`
.wnw-root .wnw-hist-row .ttl,.wnw-root .wnw-hist-row .u{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-root .wnw-hist-row .u{color:var(--text-light);font-size:.86em;}
`);

/* ---------- 这一档本体：地址栏那一排 + 一块网页区 ---------- */
const WebPage = {
  /* 地址栏里的字 → 真地址：没写协议的补 https://；一个点都没有的（光打几个字）不硬猜 */
  toUrl(s){
    s = String(s || '').trim();
    if(!s) return '';
    if(/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
    return /\./.test(s) ? 'https://' + s.replace(/^\/+/, '') : '';
  },
  host(u){ try{ return new URL(u).hostname.replace(/^www\./, '') || u; }catch(e){ return String(u || ''); } }
};
WebPage.render = function(host, ref, ctx){
  host.classList.add('wnw-web');
  const addr = h('input', { class:'wnw-input wnw-web-addr', type:'text', spellcheck:'false',
    placeholder:'输入网址，按回车打开', 'aria-label':'网址' });
  const view = h('webview', { class:'wnw-web-frame' });
  const jump = (back) => {
    try{
      if(back){ if(view.canGoBack()) view.goBack(); }
      else{ if(view.canGoForward()) view.goForward(); }
    }catch(e){}
  };
  const load = (u) => {
    /* src 没变再设一遍是不刷新的：从历史里点自己正在这一页、或对着地址栏按「打开」，
       光设 src 看着就是点了没反应（外15 第 2 条） */
    if(view.getAttribute('src') === u){ try{ view.reload(); }catch(e){} return; }
    view.setAttribute('src', u);
  };
  const go = (v) => {
    const u = WebPage.toUrl(v);
    if(!u){ toast('这不像一个网址 · 地址里要有个点'); return; }
    addr.value = u; load(u);
  };
  addr.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); go(addr.value); } });
  /* 标题比地址晚一步到，先攒着：记历史那一步拿它当条目的名字，到了再补一次（note）。
     得连着地址一起攒 —— 不然跳到下一页时，下一页的名字会被上一页的标题顶上去。 */
  let lastTitle = '', lastTitleAt = '';
  host.appendChild(h('div', { class:'wnw-web-bar' }, [
    h('button', { class:'wnw-btn mini ico', title:'后退一页', 'aria-label':'后退一页', html:icoMarkup('prev'), onclick:() => jump(true) }),
    h('button', { class:'wnw-btn mini ico', title:'前进一页', 'aria-label':'前进一页', html:icoMarkup('next'), onclick:() => jump(false) }),
    h('button', { class:'wnw-btn mini ico', title:'重新载入这一页', 'aria-label':'重新载入这一页', html:icoMarkup('cycle'),
      onclick:() => { try{ view.reload(); }catch(e){} } }),
    h('button', { class:'wnw-btn mini ico', title:'访问历史', 'aria-label':'访问历史', html:icoMarkup('ver'),
      onclick:() => WebHist.open(go) }),
    addr,
    h('button', { class:'wnw-btn', onclick:() => go(addr.value) }, '打开')
  ]));
  host.appendChild(view);
  view.addEventListener('page-title-updated', e => {
    if(!e.title) return;
    lastTitle = e.title; lastTitleAt = e.url;
    WebHist.note(e.url, e.title);
    ctx.setTitle(WebPage.host(e.url) || e.title);
  });
  /* 翻页、网页里自己跳转：把真地址记回这一格，下次开这个标签还落在这一页；同一处也给历史记一笔。
     这一条只在真落地的翻页上跑，所以敲了一半、连不上的那些地址进不了历史（失败另有下面那一条管）。 */
  const sync = (u) => {
    if(!u || u === 'about:blank') return;
    addr.value = u; ctx.setRef && ctx.setRef(u);
    WebHist.hit(u, lastTitleAt === u ? lastTitle : '');
  };
  view.addEventListener('did-navigate', e => sync(e.url));
  view.addEventListener('did-navigate-in-page', e => sync(e.url));
  view.addEventListener('did-fail-load', e => {
    /* -3 是自己按中止键停掉的，不算打不开 */
    if(e.errorCode === -3 || !e.validatedURL) return;
    toast('打不开 ' + (WebPage.host(e.validatedURL) || e.validatedURL) + '：' + (e.errorDescription || '连不上'));
  });
  /* 网页里 target=_blank 的链接：webview 默认不开新窗口，收到的地址在这一块里打开 */
  view.addEventListener('new-window', e => { try{ e.preventDefault(); load(e.url); }catch(err){} });
  const start = ref || '';
  addr.value = start;
  load(start || 'about:blank');
  if(!start) setTimeout(() => addr.focus(), 60);
};
Views.reg('web', {
  name:'空白网页', icon:'link', dockable:false,
  title:(ref) => ref ? WebPage.host(ref) : '空白网页',
  render(host, ref, ctx){ WebPage.render(host, ref, ctx); }
});

/* ---------- 往 ＋ 那张清单登记自己这一组：清单只认名单，不认这一组叫什么 ----------
   空白网页不跟着书走：一张地址栏 + 一块网页区，开着当资料看 */
PickGroup.reg({ name:'查资料', items:[ { kind:'web', ref:() => '', label:'空白网页' } ]});
