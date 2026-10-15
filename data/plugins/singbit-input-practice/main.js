/* 声笔输入法练习启动卡 · 插件包 ES module
   和外壳只隔一份 ctx：卡怎么摆找 ctx.mountLauncher，内核怎么开找 ctx.rp。
   这张卡不跳去另一张页面：练习那一棵的内核就在这一家自己那一格里（rp-kernel.js，插件清单里
   kernels 那一格点的名），生成页面那一趟铺进来、开机由加载器注进来，卡只管把封面那一格递给
   它当容器。开起来 = ctx.rp.start(容器)，关上 = ctx.rp.stop()。
   从前这里认一个「练习页面的地址」，用 iframe 把另一份文档嵌进来 —— 两条路各一套配色、各一套字体，
   外观层还得隔着窗口递，所以现在那条整段撤了：地址这一项、齿轮里那一栏都跟着没了。 */
export default {
  /* minW / minH = 这一家自己答的"最小要多大"，主程序每次要落位都来问这一句（插件分离第 4 批 4.1）。
     原来这里还写着一对默认尺寸 7 × 2 —— 撤出插件了：默认占多大归主程序那张「出厂布局」表（src/_fd/src/fd3-shell.js 顶上），
     那张表此刻一格数值都没填（2026-10-16 定的那一版：先不设计数值），没填就按上面这对最小数在左上角依次排开。 */
  noTitle:true, minW:5, minH:2,
  mount(body, ctx){
    /* 内核注不进来，这一家在加载那一趟就被立成错误卡了；这里不再摆一张"开不了"的卡 */
    /* 内核那份容器在这一家 mount 里留一份引用：卡片被卸载、被重载的时候，
       封面还开着也要有人把内核拆干净（挂在窗口上的监听、每秒那一趟统计才停得掉）。 */
    let host = null;
    const stop = () => { if(host && ctx.rp.running){ ctx.rp.stop(); host = null; } };
    const face = ctx.mountLauncher(body, {
      action:'开始打字练习',
      open(){
        host = ctx.el('div', { style:'height:100%;display:flex;flex-direction:column' });
        ctx.cover.openNode(ctx.pack.name, host, stop);
        Promise.resolve(ctx.rp.start(host)).catch(e => ctx.toast('练习没开起来：' + ((e && e.message) || e)));
      }
    }, ctx);
    return { unmount(){
      stop();
      /* 封面里挂着的正是这一家递进去的那副骨架时，跟着一起收 ——
         不然卡已经不认它了，屏幕上还留着一格开着的空封面（重载、卸载都会走到这条） */
      const b = ctx.cover && ctx.cover.body && ctx.cover.body();
      if(b && b.querySelector('.rp-root')) ctx.cover.close();
      if(face && face.unmount) face.unmount();
    } };
  }
};
