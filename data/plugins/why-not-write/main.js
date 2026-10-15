/* 为写启动卡 · 插件包 ES module
   这张卡不跳去另一张页面：为写那一棵的内核就在这一家自己那一格里（wnw-kernel.js，插件清单里
   kernels 那一格点的名），开机由加载器注进来，卡只管把封面那一格递给它当容器。
   开起来 = ctx.wnw.start(容器)，关上 = ctx.wnw.stop()。
   从前这里认一个「写作页面的地址」，用 iframe 把另一份文档嵌进来 —— 两条路各一套配色、各一套字体，
   缩放和外观层还得隔着窗口递，所以现在那条整段撤了：地址这一项、设置那一栏都跟着没了。 */
export default {
  /* minW / minH = 这一家自己答的"最小要多大"，主程序每次要落位都来问这一句（插件分离第 4 批 4.1）。
     原来这里还写着一对默认尺寸 7 × 2 —— 撤出插件了：默认占多大归主程序那张「出厂布局」表（src/_fd/src/fd3-shell.js 顶上），
     那张表此刻一格数值都没填（2026-10-16 定的那一版：先不设计数值），没填就按上面这对最小数在左上角依次排开。 */
  noTitle:true, minW:5, minH:2,
  mount(body, ctx){
    /* 内核不在这一家就不该被加载起来（加载器注内核失败会当场把这一家立成错误卡），
       所以这里不再摆一张"开不了"的卡 —— 空壳形态下界面上没有"缺失"这一说。 */
    /* 内核那份容器在这一家 mount 里留一份引用：卡片被卸载、被重载的时候，
       封面还开着也要有人把内核拆干净（监听和落盘那条通道归它）。 */
    let host = null;
    const stop = () => { if(host && ctx.wnw.running){ ctx.wnw.stop(); host = null; } };
    const face = ctx.mountLauncher(body, {
      action:'开始写作',
      open(){
        host = ctx.el('div', { style:'height:100%;display:flex;flex-direction:column' });
        ctx.cover.openNode(ctx.pack.name, host, stop);
        Promise.resolve(ctx.wnw.start(host)).catch(e => ctx.toast('为写没开起来：' + ((e && e.message) || e)));
      }
    }, ctx);
    return { unmount(){
      stop();
      /* 封面里挂着的正是这一家递进去的那副骨架时，跟着一起收 ——
         不然卡已经不认它了，屏幕上还留着一格开着的空封面（重载、卸载都会走到这条） */
      const body = ctx.cover && ctx.cover.body && ctx.cover.body();
      if(body && body.querySelector('.wnw-root')) ctx.cover.close();
      if(face && face.unmount) face.unmount();
    } };
  }
};
