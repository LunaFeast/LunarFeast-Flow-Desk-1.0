/* ============================================================
   FD · 插件上下文的宿主这半 + 加载接线
   共用的一半在 _shared/sh-load.js；这里交的是 Flow-Desk 自己的答卷：
   设置、明文存储、封面、对话框，还有只有 FD 有的那几个小工具（重画桌面、重画时钟）。
   这一段排在 fd8-tools.js 后面：Data_PRE / ToolKv 都在那儿定义；也排在 _shared/sh-load.js 后面（PackCtx 在那儿）。
   ============================================================ */
/* 三句都是"这一家的内核没读进来"那一类真错（插件清单点了 kernels、文件却读不到），
   不是"这一家没装"：没装的那一家压根不在名单里，走不到这一步，界面上也就没有它 ——
   空壳形态下不许有任何"缺失"提示（#30）。 */
const WNW_MISSING = '为写的内核没读进来';
const RP_MISSING = '声笔输入法练习的内核没读进来';
const WCUSTOM_MISSING = '推演组件定制的内核没读进来';
PackCtx.parts({
  kv:ToolKv,
  settings:Settings,
  store:Store,
  cover:{
    openNode:(t, n, cb) => Cover.openNode(t, n, cb),
    setTitle(t){ document.getElementById('fdCoverTitle').textContent = t; },
    body(){ return document.getElementById('fdCoverBody'); },
    close(){ Cover.close(); }
  },
  dialog:{ open:(t, b, f, after, opt) => Modal.open(t, b, f, after, opt), close(){ Modal.close(); } },
  /* 组件里「删之前问一句」都走这一枚（✕ 和「取消」都算不删），别让各家自己搭框 */
  ask:(q, yes) => fdAsk(q, yes),
  /* FD_APP 通道不在这里交了：白名单发放、读这一张页 window 上的桥、硬地板那一整套是两家共用的，
     归 _shared/sh-load.js 的 packApp —— 宿主这边不声明就用那一把，免得两个程序的组件待遇不一样。
     桌面重画/时钟重画这两个请求也只有 Flow-Desk 有（WNW 没有桌面），就摆在这份 more 里。 */
  more:{
    fitBox, coverWrap, fullStyle:FULL_STYLE, mountLauncher, segCtrl, esc,
    fmtDate, parseDate, addDays, weekOfYear,
    rerenderDesktop(){ Shell.render(); },
    rerenderClock(){ Shell.tickClock(); },
    /* 为写内核：搬进这一张页之后它是一个可调用的一份，收一个容器、拆干净再走。
       内核不再开机就注（插件分离第 5 批 · 2026-10-16 他指着首页那张卡说的：快捷方式不该为它去要内核）——
       所以这三颗手到用的时候先叫 请内核 把带这份内核的那一家请进来，再认窗口上那一份。
       认不到内核这件事报的是"这一家的内核没读进来"，报在点下去那一下，不报在卡面上。 */
    wnw:{
      async start(host){ await PackLoader.请内核('wnw-kernel.js'); const k = window.WNW_KERNEL; if(!k) throw new Error(WNW_MISSING); return k.start(host); },
      async stop(){ if(!window.WNW_KERNEL) return; const k = window.WNW_KERNEL; return k.stop(); },
      get running(){ const k = window.WNW_KERNEL; return k ? k.running() : false; },
      get version(){ const k = window.WNW_KERNEL; return k ? k.version : WNW_MISSING; },
      get available(){ return typeof window.WNW_KERNEL === 'object' && window.WNW_KERNEL !== null; }
    },
    /* 声笔输入法练习内核：和上面那一条同一个形状（同一趟搬法，见 _build/rp-kernel.mjs）——
       也是收一个容器、拆干净再走，也是到用的时候才请进来、再认窗口上那一份。 */
    rp:{
      async start(host){ await PackLoader.请内核('rp-kernel.js'); const k = window.RP_KERNEL; if(!k) throw new Error(RP_MISSING); return k.start(host); },
      async stop(){ if(!window.RP_KERNEL) return; const k = window.RP_KERNEL; return k.stop(); },
      get running(){ const k = window.RP_KERNEL; return k ? k.running() : false; },
      get version(){ const k = window.RP_KERNEL; return k ? k.version : RP_MISSING; },
      get available(){ return typeof window.RP_KERNEL === 'object' && window.RP_KERNEL !== null; }
    },
    /* 推演组件定制内核（外39 分离，形状照为写那一套）：源码住 src\_wcustom\src\ 那几份，
       由那一棵自己的 build-kernel.mjs 出成一颗产物。和上面两条不一样的一处：
       它不套闭包，名字（GenWizard / Gen / codeEntry…）本来就落在顶层，外壳那几只入口判的是
       「这个名字在不在」—— 理由写在那棵的 build-kernel.mjs 开头。
       它也唯一一家在插件清单上写了 kernelBoot：用户自己做的组件开机登记就要用那份代码（Gen.def），
       所以它的内核不许到点开才注。 */
    wcustom:{
      get available(){ return typeof GenWizard !== 'undefined'; },
      async open(onSaved){
        await PackLoader.请内核('wnw-custom-kernel.js');
        if(!this.available) throw new Error(WCUSTOM_MISSING);
        GenWizard.onSaved = onSaved || null;
        GenWizard.open('');
      },
      get version(){ return this.available ? (typeof FD_VERSION === 'string' ? FD_VERSION : '') : WCUSTOM_MISSING; }
    }
  }
});
PackLoader.use({ host:'fd', base:DATA_PRE + 'plugins/' });
/* 推演定制存完一个新组件只重载这一家（PackLoader.reload）：桌面整层重画一遍，
   这张卡重新挂的是刚落盘的那份新代码，别的卡各自从自己的明文文件重读，数据不动。 */
Bus.on('pack:reload', () => { try{ Shell.render(); }catch(e){ console.warn('重载这一家之后重画桌面没走通：' + ((e && e.message) || e)); } });
