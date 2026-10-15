/* 推演组件定制启动卡 · 插件包 ES module（外39 · 2026-10-09 他定「推演组件定制本身也要分离出来，改名为 wnw-custom」）
   这一张卡只管开那一台向导 —— 改一张配方、导出、导入都在向导自己那一屏里，
   为写那边的「设置 · 功能」列表也照旧给每一张配方摆一颗「改」。
   内核住在这一家自己那一格里（wnw-custom-kernel.js，插件清单 kernels 那一格点的名）：
   源码归 src\_wcustom\ 那一棵自己出产物，生成页面那一趟铺进这一格，开机由加载器注进来 ——
   不再贴进整页顶层，所以页面那一张里没有这一家的代码。 */
export default {
  noTitle:true, minW:5, minH:2, def:{ w:7, h:2 },
  mount(body, ctx){
    /* 内核注不进来，这一家在加载那一趟就被立成错误卡了；这里不再摆一张"开不了"的卡 */
    return ctx.mountLauncher(body, {
      action:'定制组件（打开向导）',
      open(){
        /* 造完新组件要有人把桌面重画一遍，不然新那张卡在名单上却不出现 ——
           外壳那颗「定制组件」按钮交的是同一份回调（Shell.pickWidget）。 */
        try{ ctx.wcustom.open(() => { if(typeof ctx.rerenderDesktop === 'function') ctx.rerenderDesktop(); }); }
        catch(e){ ctx.toast('推演组件定制没开起来：' + ((e && e.message) || e)); }
      }
    }, ctx);
  }
};
