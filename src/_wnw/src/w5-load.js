/* ============================================================
   WNW · 插件上下文的宿主这半 + 加载接线
   共用的一半在 _shared/sh-load.js；这里交 Why Not Write 的一份：
   KV 走 TOOL_HOST 那一份（用 getter 现取，别在装载时就抓对象）、对话框是浮层。
   FD_APP 通道不在这儿交：白名单发放、读这一张页 window 上的桥、硬地板那一整套和 Flow-Desk 共用 _shared/sh-load.js 的 packApp，
   同一个插件在两个程序里拿到的通道一个样。
   这一段排在 w7-data.js 后面：WNW_DATA_PRE / TOOL_HOST 都在那儿定义。
   ============================================================ */
/* 这一段整个撤掉：插件上下文的答卷和加载器现在这一页只有一份，归宿主那边交（Flow-Desk 那一趟装配）。
   从前为写是独立一页，自己填一份 kv / dialog、自己把加载器调成 wnw 这一宿主；
   拼进同一张页之后再填一遍，就是把宿主的对话框和加载名单当成自己的那份改 —— 首页那些卡立刻跟着变。 */
/* Bus 是为写自己那一层的事件表，宿主重载组件时由宿主广播那一句，这边接不上，
   所以「改代码」存完之后由 start 挂上的那条通道代劳（见 w6-boot 的 wnwStart）。
   「改代码」存完只重载这一家（PackLoader.reload）：三栏和左侧重画一遍，
   停靠面板、标签里的这个功能重新挂上刚落盘的那份新代码；还停在书架上就等开书那一趟现从注册表拿。 */
Bus.on('pack:reload', () => {
  try{
    if(!Desk || !Desk.midBox) return;
    Desk.drawLeft(); Desk.drawMid(); Desk.drawRight(); Desk.drawRail();
  }catch(e){ console.warn('重载这一家之后重画工作区没走通：' + ((e && e.message) || e)); }
});
/* ---------- 插件清单里 type 写 tool 的那几家，补登成为写的视图（外15 第 10 条）----------
   加载器整张页只有一份、跑在宿主那一趟里，它叫的 registerTool 是 Flow-Desk 那一版（挂桌面卡）；
   为写这一版的 registerTool 在闭包里，外面叫不到 —— 所以音乐遥控器进不了为写的 Views：
   「＋打开内容」里没它那一行，右栏停靠挂不上，只在「不占功能位」那一栏露个名字。
   这一趟在闭包内补：读顶层那份 TOOL_DEFS（构建把为写整段包进闭包，往外读顶层常量本来就通），
   插件清单 host 认 wnw 的才挂；名字取插件清单那一个 —— 组件那份定义里没有 name，桌面卡走的是 noName。
   重载组件之后宿主会广播 pack:reload，但名单是加载器那一趟填的，所以补登要挂在开书那一趟上（见 w6-boot）。 */
function wnwBindTools(){
  for(const [id, def] of TOOL_DEFS){
    const m = Packs.info(id);
    if(!m || (m.host || []).indexOf('wnw') < 0) continue;
    registerTool(Object.assign({}, def, { id:id, name:def.name || m.name || id }));
  }
}
