/* 为写启动卡 · 组件包 ES module
   这张卡不再跳去另一张页面：为写的代码就在这一张页里（Flow-Desk 那份装配单把它整段收进了一层闭包），
   卡只管把封面那一格递给它当容器。开起来 = ctx.wnw.start(容器)，关上 = ctx.wnw.stop()。
   从前这里认一个「写作页面的地址」，用 iframe 把另一份文档嵌进来 —— 两条路各一套配色、各一套字体，
   缩放和外观层还得隔着窗口递，所以现在那条整段撤了：地址这一项、设置那一栏都跟着没了。 */
export default {
  noTitle:true, minW:5, minH:2, def:{ w:7, h:2 },
  mount(body, ctx){
    /* 内核没拼进这一版页面就直接说清楚，不给一个点了没动静的入口 */
    if(!ctx.wnw || !ctx.wnw.available)
      return ctx.mountLauncher(body, { action:'但这一版页面里没有写作内核，开不了', open(){} }, ctx);
    /* 内核那份容器在这一家 mount 里留一份引用：卡片被卸掉、被「改代码」重载的时候，
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
         不然卡已经不认它了，屏幕上还留着一格开着的空封面（改代码重载、卸载功能都会走到这条） */
      const body = ctx.cover && ctx.cover.body && ctx.cover.body();
      if(body && body.querySelector('.wnw-root')) ctx.cover.close();
      if(face && face.unmount) face.unmount();
    } };
  }
};
