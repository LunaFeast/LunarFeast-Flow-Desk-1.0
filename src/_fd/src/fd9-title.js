/* ============================================================
   自绘标题栏：左上角一个菜单 + 右上角窗口三个
   程序里系统菜单栏和标题栏都被拿掉了（见 打包\main.cjs：FD 走 titleBarStyle:'hidden'、
   Menu.setApplicationMenu(null)），原先挂在菜单栏上的每一项都搬进这一个菜单，
   配色直接用首页那套 token，快捷键由主进程那边接着（Ctrl+R / F11 那一套）。
   这一页开在没有 Flow-Desk.exe 那一层的地方时，窗口不归页面管，那三个就不摆，菜单里只剩重新载入 / 设置。
   ============================================================ */
const Title = {
  st:{ maximized:false, fullscreen:false },
  inApp(){ return !!(window.FD_APP && typeof window.FD_APP.winCtl === 'function'); },
  run(act, fallback){
    if(this.inApp()) window.FD_APP.winCtl(act);
    else if(fallback) fallback();
  },
  mount(){
    const btn = document.getElementById('fdMenuBtn');
    if(!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.innerHTML = icoMarkup('menu');
    btn.onclick = e => { e.stopPropagation(); this.toggle(); };
    if(this.inApp()){
      const ctl = (id, act, tip, icon) => {
        const b = document.getElementById(id);
        if(!b) return;
        b.innerHTML = icoMarkup(icon);
        b.title = tip; b.setAttribute('aria-label', tip);
        b.onclick = () => window.FD_APP.winCtl(act);
      };
      ctl('fdWinMin', 'min', '最小化', 'winMin');
      ctl('fdWinMax', 'max', '最大化', 'winMax');
      ctl('fdWinClose', 'close', '关闭', 'winClose');
      /* 组件全屏时那一层（.fd-cover，z-index 50）把标题栏盖住了，右上角三个够不着 ——
         所以封面条右边自己摆一个最小化、一个最大化/还原，走的是同一个 winCtl。
         关闭不归这两个管：封面条上原本就有一个「关闭」，那是退出全屏、不是退程序。 */
      ctl('fdCoverMin', 'min', '最小化', 'winMin');
      ctl('fdCoverMax', 'max', '最大化', 'winMax');
      if(window.FD_APP.onWinState) window.FD_APP.onWinState(s => this.paint(s));
      window.FD_APP.winCtl('state').then(s => this.paint(s));
      /* 顶栏那一条与封面条那一截是窗口的拖动区。模板上那句 -webkit-app-region:drag 是 Electron 那一版
         认的写法，WebView2 不认；系统那一圈标题栏撤掉之后（壳里 decorations:false），窗口全靠这一手拖 ——
         startDragging 要在用户手势里请，所以挂在 pointerdown 上；控件自己（按钮、输入框、链接）不算拖动区。 */
      const 拖 = 元 => { if(!元 || 元.dataset.dragging) return; 元.dataset.dragging = '1';
        元.addEventListener('pointerdown', ev => {
          if(ev.button !== 0 || !ev.target) return;
          if(ev.target.closest('button,input,select,textarea,a,[data-nodrag]')) return;
          try{ window.FD_APP.winDrag(); }catch(e){ /* 没这颗（不在壳里）就拖不动，不报错 */ }
        }); };
      拖(document.querySelector('.fd-top'));
      拖(document.querySelector('.fd-cover-bar'));
      /* 浏览器那一套右键菜单整片撤掉（他 2026-10-16 指着「另存为 / 打印 / 共享」那一片问：我什么时候要过这些）。
         那是 WebView2 自带的页面菜单，产品里一处都不该露；各家自己要的右键菜单（为写那几处）先自己
         preventDefault 并摆自己的菜单，这一颗只兜住它们没管的地方。 */
      if(!window.__右键闸){ window.__右键闸 = '1';
        addEventListener('contextmenu', ev => { if(!ev.defaultPrevented) ev.preventDefault(); }); }
    } else {
      const c = document.getElementById('fdWctl');
      if(c) c.remove();
      const cc = document.getElementById('fdCoverWctl');
      if(cc) cc.remove();
    }
    /* 点别处、Esc、滚动、换卡重建 —— 都先把菜单收掉 */
    document.addEventListener('click', () => this.close());
    addEventListener('keydown', e => { if(e.key === 'Escape') this.close(); });
    addEventListener('resize', () => this.close());
  },
  paint(s){
    if(!s) return;
    Object.assign(this.st, s);
    const tip = this.st.maximized ? '还原窗口' : '最大化';
    const icon = this.st.maximized ? 'winRestore' : 'winMax';
    for(const id of ['fdWinMax', 'fdCoverMax']){
      const b = document.getElementById(id);
      if(!b) continue;
      b.innerHTML = icoMarkup(icon);
      b.title = tip; b.setAttribute('aria-label', tip);
    }
  },
  rows(){
    const app = this.inApp();
    const R = [];
    const i = (label, key, fn) => R.push({ label, key, fn });
    /* 一份菜单从头到尾一条流水，不分组（他 2026-10-17 issue #55：那三条分隔线删掉） */
    i('重新载入页面', 'Ctrl R', () => this.run('reload', () => location.reload()));
    i('强制重新载入', 'Ctrl Shift R', () => this.run('reloadForce', () => location.reload()));
    i('插件管理', '', () => Shell.packManager());
    i('设置', '', () => openSettings());
    i('放大', 'Ctrl +', () => this.run('zoomIn'));
    i('缩小', 'Ctrl −', () => this.run('zoomOut'));
    i('实际大小', 'Ctrl 0', () => this.run('zoomReset'));
    i('全屏', 'F11', () => this.run('fullscreen'));
    if(app){
      i('最小化', '', () => window.FD_APP.winCtl('min'));
      i(this.st.maximized ? '还原窗口' : '最大化', '', () => window.FD_APP.winCtl('max'));
      i('退出程序', 'Ctrl Q', () => window.FD_APP.winCtl('quit'));
    }
    return R;
  },
  toggle(){
    const m = document.getElementById('fdMenu');
    if(m && !m.hidden) this.close(); else this.open();
  },
  open(){
    let m = document.getElementById('fdMenu');
    if(!m){
      m = h('div', { class:'fd-menu', id:'fdMenu', hidden:true });
      /* 面板里点一下不算「点别处」，不然第一条就把自己也收了 */
      m.addEventListener('click', e => e.stopPropagation());
      document.body.appendChild(m);
    }
    m.innerHTML = '';
    for(const r of this.rows()){
      m.appendChild(h('button', { class:'fd-mi', onclick:() => { this.close(); r.fn(); } },
        [h('span', {}, r.label), r.key ? h('kbd', {}, r.key) : null]));
    }
    const rc = document.getElementById('fdMenuBtn').getBoundingClientRect();
    m.style.left = '0px'; m.style.top = '0px';
    m.hidden = false;
    /* 先摆出来才量得到宽高：贴着菜单键往右下开，右边放不下就往左挪，底下顶到边就抬上来 */
    const w = m.offsetWidth, ht = m.offsetHeight;
    m.style.left = Math.round(Math.max(8, Math.min(rc.left, innerWidth - w - 8))) + 'px';
    m.style.top = Math.round(rc.bottom + ht + 12 > innerHeight ? Math.max(8, innerHeight - ht - 8) : rc.bottom + 6) + 'px';
    document.getElementById('fdMenuBtn').classList.add('on');
  },
  close(){
    const m = document.getElementById('fdMenu');
    if(m) m.hidden = true;
    document.getElementById('fdMenuBtn').classList.remove('on');
  }
};
