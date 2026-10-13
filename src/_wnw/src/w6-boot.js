/* ============================================================
   WNW 启动 —— 现在是「宿主递一个容器过来才跑」的一档，不再一加载就自己开
   ----------
   从前这一份是装配模板 <script> 里的一段自执行：那一页整张都是为写的，页面一开就是它。
   拼进宿主那一份产物之后，代码求值的时候容器还没有、甚至根本没人要为写，
   所以整段改成可调用的一份，入口和出口都交出去（见文件尾 WNW_KERNEL）。
   原来的步骤一步没少，只是从「加载即执行」挪到「按一次跑一次」。
   ============================================================ */
async function wnwStart(host){
  if(!host || !host.appendChild) throw new Error('要给为写一个能装东西的容器');
  /* 已经开着、或者正拆到一半：都等这一趟拆完再开，省得连着按两下把两套监听叠在一副骨架上 */
  if(WNW_HOST || WNW_STOPPING) await wnwStop();
  /* 骨架和皮肤先落地：下面那一串初始化全要往容器上写变量 */
  Shell.attach(host);
  wnwBindSelFence();
  /* 竖条那九个时机、版式和段落聚焦那五项都要写在容器上，容器就位之前跑没有地方落 */
  WCaret.bind(host);
  wnwBindTypeLook();
  /* 图标先从主进程那份清单读回来（icons\ 一层 + 各个包自己的 images\）：
     这一句排在画第一屏之前；主进程那一份读不回来时，页面上还有出厂那一份线稿可画 */
  Ico.link(window.FD_APP);
  await Theme.init();
  await State.init();
  await WriteCfg.load();
  await AnnoView.load();
  await Type.load();
  await Meter.load();
  await Seq.load();
  await Hist.init();
  /* 计数和设定摘要浮窗那两串监听改收在容器上，所以要当场把容器递给它们 */
  Meter.init(host);
  CardTip.init(host);
  wnwBindQuickCapture();
  /* 插件从数据层的插件目录加载进来（名单 → 插件清单 → import 入口 → 登记成停靠功能）；
     排在 GenLocal 之前、Shell.init 之前：「＋打开内容」那张列表开机就要认得这些功能。
     整张页只有一份加载器、一份插件上下文，宿主那一趟已经装配过了 —— 这边只在那一趟没走通时补一次，
     再 import 一遍就是把已经登记好的那些家推翻重来。 */
  try{ if(!PackLoader.loaded) await PackLoader.load(); }catch(e){ console.warn('插件加载这一趟没走通：' + ((e && e.message) || e)); }
  /* 宿主那一趟只把 type 写 tool 的那几家挂成了桌面卡，这边补登成为写自己的视图，
     「＋打开内容」和右栏停靠才认得它们（外15 第 10 条：音乐遥控器要能停靠） */
  wnwBindTools();
  /* 还没内嵌进页面的配方先从 kv 里装回来，外壳才认得这些停靠功能 */
  if(typeof GenLocal !== 'undefined') await GenLocal.warm();
  await Shell.init();
  return WNW_KERNEL;
}

/* 卸载：把挂在容器（和 window）上的那一串全摘下来，再把容器里为写留下的节点清空。
   「start → stop → 再 start」跑得通、不叠监听器，全靠这一趟。
   拆这一趟要等落盘，中间隔着一个空档：封面刚关上就再点一下卡，新的那一副骨架会在旧的一趟拆完之前就位，
   那一趟末尾就把新容器当成自己那一个给清了 —— 所以正在拆的那一份要记着，新的那一趟排队等它。 */
let WNW_STOPPING = null;
function wnwStop(){
  if(WNW_STOPPING) return WNW_STOPPING;
  const host = WNW_HOST;
  if(!host) return Promise.resolve();
  WNW_STOPPING = wnwTeardown(host).then(() => { WNW_STOPPING = null; });
  return WNW_STOPPING;
}
async function wnwTeardown(host){
  /* 从前挂在「这一页要关了」上的那一发落盘，搬进来之后没有那一回事了：时机落在这一趟上 */
  try{ if(Work.book) await Work.saveBook(); }catch(e){}
  try{ Desk.teardown(); }catch(e){}
  wnwOffAll();
  Menu.close(); Overlay.close(); CardTip.hide(); Drag.clear();
  Storage.said = false;                     /* 降级提示那一道「只说一次」的闸跟着容器一起 reset */
  /* 顶栏、提示条、皮肤和写在容器上的那套变量、明暗标记，跟着容器一起清掉 */
  host.innerHTML = '';
  host.classList.remove('wnw-root');
  host.removeAttribute('data-wnw-theme');
  host.removeAttribute('data-wnw-ming');   /* 外13-M：那条轴那一记跟着容器一起清 */
  WNW_HOST = null;
}

/* 交出去的这一份：闭包里的 var 出不了那道边界，所以入口出口要另外挂到窗口上才算数。
   插件那边禁止直接摸窗口上的名字，所以由宿主从交给它们的那份上下文里递进去（见装配那份答卷）。 */
const WNW_KERNEL = {
  start: host => wnwStart(host),
  stop: () => wnwStop(),
  running: () => !!WNW_HOST,
  /* 这一串由生成那一趟写在同一层作用域里（见 _fd/build.mjs 开头那段号），
     内核不再自己抄一份 —— 从前这里钉死的是 1.0.0-dev-1.1.9，和产物文件名各写各的。 */
  version:FD_VERSION
};
window.WNW_KERNEL = WNW_KERNEL;
