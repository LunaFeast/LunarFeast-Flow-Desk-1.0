/* ============================================================
   插件自己那一格里的文件读写（推演组件定制用这一份写它做出来的组件）
   ----------
   从前这里还长着「改代码」那颗钮和它的编辑对话框（Flow-Desk 卡片标题条那枚铅笔、
   为写停靠标题条那个「改代码」）。插件分离第 2 批 2.5 把这两个入口一起撤了：
   装着的插件不在程序里开改代码的口 —— 要改就改自己手里那一份包，重装进来。
   留下的是向导存一个新组件要用的那几颗手：往 data\plugins\<id>\ 里写 main.js + recipe.json + manifest.json，
   写完立刻重载这一家（加载器 PackLoader.reload 重新 import 一遍，宿主在那儿重画这张卡），
   既不跑重新构建，也不用刷新整页。
   ----------
   两条通道同一个口径（三道闸都写在 src\pack\comp-files.cjs 里：
   包名只认干净字符 · 相对路径不许有 .. · 落点必须在 plugins\<id>\ 里面）：
     · Flow-Desk 程序（fdapp://）→ 主进程 FD_APP.compRead / compWrite / compDelete；
     · 本地开发那台 http 服务器（fd-serve）→ 同一个 comp-files.cjs 挂在 /_comp 上，
       改的也是真文件，不会出现「那一份是草稿、这一份才作数」两套真相。
   从前这几颗手还伴着「列文件」「拷回原版」「有没有原版」三颗一起长（那是编辑对话框和
   「恢复出厂」要用的）—— 插件分离第 2 批 2.5 把它们一起撤了，壳里少三颗命令。
   ============================================================ */
const PackCode = {
  /* ---------- 一条通道两种走法 ---------- */
  async call(op, payload){
    const A = window.FD_APP;
    const b = Object.assign({ op }, payload || {});
    if(A && typeof A.compRead === 'function'){
      if(op === 'read')    return await A.compRead(b.id, b.rel);
      if(op === 'write')   return await A.compWrite(b.id, b.rel, b.text);
      /* 抹掉一整格（「完全删除」那一步）：只按包名动手，主进程那把尺不接子路径 */
      if(op === 'delete')  return typeof A.compDelete === 'function' ? await A.compDelete(b.id)
        : { ok:false, msg:'主进程没有删掉一整格这条通道' };
      return { ok:false, msg:'主进程没有这一条通道：' + op };
    }
    /* 本地开发那台 http 服务器（fd-serve）：只有 http 这一种开法有这条通道 */
    if(!/^https?:$/.test(location.protocol)) return { ok:false, msg:'这一格没有可读写的通道' };
    try{
      const r = await fetch('/_comp', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(b) });
      return await r.json();
    }catch(e){ return { ok:false, msg:'本地服务器没接上：' + ((e && e.message) || e) }; }
  },
  /* 这一格写不写得动：Flow-Desk 程序（主进程那把尺）和本地开发那台服务器，有任一条通道就算写得动 */
  can(){
    const A = window.FD_APP;
    if(A && typeof A.compWrite === 'function') return true;
    return /^https?:$/.test(location.protocol);
  },
  /* 插件清单点名的入口那份：一个包只有一个入口，向导认的就是这一份 */
  entry(id){
    const m = PACK_META[String(id)] || {};
    return (m.entry && m.entry[0]) || 'main.js';
  },
  async read(id, rel){ return await this.call('read', { id, rel }); },
  async write(id, rel, text){ return await this.call('write', { id, rel, text }); },

  /* ---------- 改到了 src\ 共用底子那几份：那部分拼在页面里，得让主进程重新生成页面才换 ----------
     插件自己那一格不在这儿 —— 那些文件运行时直接 import，存了就是新的，不用这一趟。
     装卸、向导存组件都不叫它；只有真改了 src\ 才叫。 */
  async rebuildPages(note){
    const A = window.FD_APP;
    if(!A || typeof A.rebuild !== 'function'){ toast('本地没有重新生成页面的通道'); return { ok:false }; }
    toast(note || '立即重新生成页面…');
    const r = (await A.rebuild()) || {};
    toast(r.ok ? '已生成，刷新获取' + (r.msg || '') : '重生成失败' + (r.msg || ''));
    return r;
  }
};
