/* ============================================================
   gate-seal46.mjs · 外46 批六第一步：插件那张登记表要改不动
   ------------------------------------------------------------
     node src/tools/probes/gate-seal46.mjs
   钉的是这么几件事（2026-10-11 量出来的那条真账起的头）：
     一、从前一家插件代码在自己那段模块被求值的时候，就能往 PACK_META[自己].appChannels
        里塞通道名、往 kvKeys 里塞键名 —— 门是照这张表长的，表在插件够得着的地方，
        那张白名单就只是君子协定（七家源码现在 0 处这么干，但没人拦得住第八家）。
     二、现在每格登记表一抄进来就 sealDeep 冻透（连里面那四串名单、bank、assets 一起）。
     三、装载那一趟的顺序也钉住：门先做好，再 import 它的代码 ——
        就算将来有人把表换成可写的，抄进 ctx 的也还是 import 之前那一份。
     四、fail 不再往表上写字（错话留在加载器自己那张 errs 表里）。
   这一颗关的是「一家给自己加权限」；「一家去改别家那一格」还留着，
   那一手要等运行时世界那一层（docs\插件真隔离设计.md 第三节的选路），这一台不装成已经关了。
   二、三、四这几节是在 vm 里跑真源码（切的是仓库里那一份原文，不抄第二份），不是查字符串。
   ============================================================ */
import fs from 'node:fs';
import vm from 'node:vm';
import { rd, 记账, ROOT, 切 } from './lib-slice.mjs';

const 台 = 记账('gate-seal46');
const 载 = rd('src/_shared/sh-load.js');
const 底 = rd('src/_shared/sh-packs.js');

/* ---------- 把真源码搬进一台干净的 vm（只搬这几颗，不搬整页） ---------- */
const 场 = vm.createContext({
  console:{ warn(){}, log(){}, error(){} },
  /* 假桥：三颗都在硬地板名单里（dataWipe / packWipe），一颗不在（mediaState）——
     这样才量得出"清单点名也不给"那一手，而不是因为桥不在所以大家都拿不到。 */
  window:{ FD_APP:{ mediaState:async () => '播控', dataWipe:async () => '清', packWipe:async () => '卸', label:'闸里那棵假的' } },
  h:() => ({}), Bus:{ emit(){}, on(){ return () => {}; } }, Banks:{ list:() => [] }
});
for(const 段 of [
  切(底, 'PACK_META'),
  切(载, 'sealDeep'),
  切(载, 'APP_DENY'),
  切(载, 'packApp'),
  切(载, 'PackCtx'),
  切(载, 'PackLoader')
]) vm.runInContext(段, 场);
const 跑 = 码 => vm.runInContext(码, 场);
/* 插件那份是 ES module —— 天生严格模式，往冻住的属性上写字会抛。
   这台子自己试那几手的时候也必须严格模式来试，不然 sloppy 下"写字"是静默失败，
   测出来一片绿，真插件里却是另一回事。 */
const 严 = 码 => vm.runInContext("'use strict';" + 码, 场);
/* 顶层不能光写 return（那是一段脚本，不是函数）—— 要真跑一把拿结果的都走这一颗 */
const 判 = 码 => vm.runInContext('(function(){' + 码 + '})()', 场);

/* 一张"什么都能要"的假表，用来试门还认不认 */
严(`globalThis.场_试 = {
    登(家, 清单){ PACK_META[家] = PackLoader.metaOf(家, 清单); return PACK_META[家]; },
    门(家){ return PackCtx.make(家); },
    塞通道(家, 名){ PACK_META[家].appChannels.push(名); },
    换名单(家, 名){ PACK_META[家].kvKeys = [名]; },
    改名(家){ PACK_META[家].name = '顶掉的'; },
    换整格(家, 清单){ PACK_META[家] = PackLoader.metaOf(家, 清单); },
    冻没冻(家, 格){ return Object.isFrozen(PACK_META[家][格]); },
    本体冻没冻(家){ return Object.isFrozen(PACK_META[家]); },
    嵌套冻没冻(家, 格){ return Object.isFrozen(PACK_META[家][格]); }
  }`);
const 甲 = { name:'甲家', kvKeys:['我的键'], dataKeys:['我的文件'], appChannels:['mediaState'],
             bank:{ which:'我的库' }, assets:{ 图:{ 名:'一张', 路:'a.png' } } };

/* ---------- 一 · 那颗冻尺自己先对 ---------- */
台.题('一 · sealDeep 冻到哪一层');
跑('场_试.登("t1", ' + JSON.stringify(甲) + ')');
台.判('登记表本体冻住', 跑('场_试.本体冻没冻("t1")'));
台.判('appChannels 那一串冻住', 跑('场_试.冻没冻("t1","appChannels")'));
台.判('kvKeys 那一串冻住', 跑('场_试.冻没冻("t1","kvKeys")'));
台.判('dataKeys 那一串冻住', 跑('场_试.冻没冻("t1","dataKeys")'));
台.判('host 与 entry 那两串也冻住',
  跑('场_试.登("t2", {name:"乙"}); 场_试.冻没冻("t2","host") && 场_试.冻没冻("t2","entry")'));
台.判('嵌套的 bank 冻住', 跑('场_试.嵌套冻没冻("t1","bank")'));
台.判('嵌套的 assets 连里面那一格一起冻住',
  跑('Object.isFrozen(PACK_META.t1.assets) && Object.isFrozen(PACK_META.t1.assets.图)'));
台.判('已经冻过的再进一次不炸（幂等，装载重跑靠这一条）',
  判('try{ sealDeep(sealDeep({a:{b:[1]}})); return true; }catch(e){ return false; }'));

/* ---------- 二 · 一家改不动自己那格 ---------- */
台.题('二 · 一家在自己那份模块里给自己加权限，现在抛错');
台.判('往 appChannels 里塞一颗通道名 → 抛',
  判('try{ 场_试.塞通道("t1","dataWipe"); return false; }catch(e){ return true; }'));
台.判('整串换成别的 → 抛',
  判('try{ 场_试.换名单("t1","别人的键"); return false; }catch(e){ return true; }'));
台.判('改一个标量（name）→ 抛',
  判('try{ 场_试.改名("t1"); return false; }catch(e){ return true; }'));
台.判('抛的是引擎那句改不动（TypeError），不是我们自己编的话',
  判('try{ 场_试.塞通道("t1","dataWipe"); return "没抛"; }catch(e){ return e instanceof TypeError ? "TypeError" : String(e); }') === 'TypeError');
台.判('明说还留着的一手：整格换掉这一家不抛（那一手归运行时世界那一层）',
  判('try{ 场_试.换整格("t1", {name:"换过的"}); return true; }catch(e){ return false; }'));

/* ---------- 三 · 门按 import 之前那一份长 ---------- */
台.题('三 · 门先做好，再请它的代码进门');
const 做门在前 = 载.slice(载.indexOf('async one(id){'), 载.indexOf('register(id, def, ctx){'));
台.判('one() 里 PackCtx.make 那一行排在 await import 之前',
  做门在前.indexOf('PackCtx.make(id)') >= 0 &&
  做门在前.indexOf('PackCtx.make(id)') < 做门在前.indexOf('await import(url)'),
  { make在: 做门在前.indexOf('PackCtx.make(id)'), import在: 做门在前.indexOf('await import(url)') });
台.判('这一句不是顺手挪的：注释里写清了为什么不能反', 做门在前.includes('门先做好，再请它的代码进门'));
跑('场_试.登("t3", ' + JSON.stringify(甲) + '); globalThis.门3 = 场_试.门("t3");');
const 拒话 = await 跑(`(async () => {
  /* 门3 是"import 之前"做好的那一份；做好之后再把整格换成一张写满别人家键名的假表 */
  场_试.换整格("t3", {name:"甲家", kvKeys:["别人的键"], appChannels:["dataWipe"]});
  try{ await 门3.kv.get("别人的键"); return '放行了'; }
  catch(e){ return String(e && e.message || e); }
})()`);
台.判('先做好的那一份门不跟着新表改口（拒的还是那句"插件清单没带它"）',
  拒话.includes('插件清单没带它'), 拒话);
const 放行 = await 跑(`(async () => {
  PackCtx.parts({ kv:{ get:async k => '拿到:' + k } });
  const 门 = 场_试.登("t4", { name:"丙家", kvKeys:["我的键"] }) && 场_试.门("t4");
  try{ return await 门.kv.get("我的键"); }catch(e){ return '拒:' + e; }
})()`);
台.判('自己那一格的键照旧放行（没把门焊死）', 放行 === '拿到:我的键', 放行);
const 空手 = await 跑(`(() => {
  场_试.登("t5", { name:"丁家", appChannels:["mediaState","dataWipe","packWipe"] });
  const 门 = 场_试.门("t5");
  return { 有:typeof 门.app.mediaState, 地板1:typeof 门.app.dataWipe, 地板2:typeof 门.app.packWipe };
})()`);
台.判('硬地板照旧：清单点名要 dataWipe 与 packWipe 也不长那两只手',
  空手.有 === 'function' && 空手.地板1 === 'undefined' && 空手.地板2 === 'undefined', 空手);

/* ---------- 四 · 七家真清单过这一颗尺 ---------- */
台.题('四 · 仓里那七家真插件清单一家一家过');
const 家目录 = ROOT + 'data/plugins';
const 名单 = fs.readdirSync(家目录).filter(名 => fs.existsSync(家目录 + '/' + 名 + '/manifest.json'));
台.数('货架上有几家', 名单.length);
台.判('六家（一家不多一家不少）', 名单.length === 6, 名单);
for(const 名 of 名单){
  const 清单 = JSON.parse(fs.readFileSync(家目录 + '/' + 名 + '/manifest.json', 'utf8'));
  const 量 = 跑('(() => { const m = PackLoader.metaOf(' + JSON.stringify(名) + ', ' + JSON.stringify(清单) + ');'
    + 'return { 本体:Object.isFrozen(m), 通道:Object.isFrozen(m.appChannels), 键:Object.isFrozen(m.kvKeys),'
    + ' 表单:Object.isFrozen(m.stateKeys), 数据:Object.isFrozen(m.dataKeys), 共享:Object.isFrozen(m.sharedKeys),'
    + ' 库:m.bank ? Object.isFrozen(m.bank) : true, 资源:Object.isFrozen(m.assets),'
    + ' 通道数:m.appChannels.length }; })()');
  台.判(名 + '：本体与那六串名单、bank、assets 全冻住',
    量.本体 && 量.通道 && 量.键 && 量.表单 && 量.数据 && 量.共享 && 量.库 && 量.资源, 量);
}
台.判('冻住之后 Packs.list() 那种浅拷还拿得到（界面那一列不空）',
  跑('Object.keys(PACK_META).map(k => Object.assign({ id:k }, PACK_META[k])).length') > 0);
台.判('门照旧认得真清单点名的通道（音乐遥控器那 20 颗里挑一颗试）',
  await 跑(`(async () => {
    const 清 = ${JSON.stringify(JSON.parse(fs.readFileSync(家目录 + '/music-remote/manifest.json', 'utf8')))};
    PACK_META['music-remote'] = PackLoader.metaOf('music-remote', 清);
    const 门 = PackCtx.make('music-remote');
    return typeof 门.app.mediaState === 'function' || 门.app === null;
  })()`));

/* ---------- 五 · 旧写法清干净 ---------- */
台.题('五 · 不再往冻住的表上写字');
台.判('fail 里那句 m.error = msg 撤了', !/if\(m\) m\.error = msg;/.test(载));
台.判('reload 里那句 delete PACK_META[id].error 撤了', !载.includes('delete PACK_META[id].error'));
台.判('错话还是留在加载器自己那张 errs 表里（信息页要说得出为什么）', 载.includes('this.errs.set(id, msg)'));
台.判('整份装载器里再没有一处往登记表上写字（PACK_META[..].字段 = 那种）',
  !/PACK_META\[[^\]]+\]\.\w+ *=/.test(载), (载.match(/PACK_META\[[^\]]+\]\.\w+ *=/g) || []));
台.判('冻尺只此一份（别处没抄第二颗 sealDeep）',
  (rd('src/_shared/sh-load.js').match(/function sealDeep/g) || []).length === 1);
台.判('装载器开头那段说清了它现在管运行时能调什么（跟"只关这一家改代码入口"两件事）',
  载.includes('插件清单没带它'));

/* ---------- 六 · 硬地板与桥上的通道逐颗对 ---------- */
台.题('六 · 地板逐颗对得上桥（2026-10-11 这一节抓到 dataWipe 那批漏）');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
/* 认"桥上有没有这一颗"用的是定义位（名后面紧跟 ( 或 : 或 =），不是全文搜串：
   清单里凭空写一颗没有的名字，发放那一趟本来就会跳过 —— 但那是静默少一只手，得报出来。
   前缀认三种写法：对象里两颗冒号或方法式（`mediaState(...)` / `label:`），
   以及往桥上一颗颗补上去的监听（`window.FD_APP.mediaOn = fn => …`，那三颗 on 就是这么来的）。 */
const 在桥上 = 名 => new RegExp('(^|[\\s{,(.])' + 名 + '\\s*[(:=]').test(桥);
const 地板 = 跑('APP_DENY.slice()');
台.数('硬地板多少颗', 地板.length);
/* 判据只有一条：这一颗是"宿主自己的事"吗 —— 会动盘、会动别人家东西、会起网络、会动窗口的都算 */
const 必须挡 = ['dataWipe', 'dataRead', 'dataWrite', 'dataList', 'dataDir', 'rimeDir', 'setRimeDir',
  'appendPageFile', 'pageFileExists', 'readPageFile', 'writePageFile', 'writePageBytes', 'delPageFile',
  'pagePath', 'pathOf', 'dirTree', 'readText', 'openDir',
  'backupRun', 'backupCheck', 'backupLast', 'backupPick', 'backupRoots',
  'libRead', 'libWrite', 'codeCatRename', 'webTitle',
  'packList', 'packSet', 'packFile', 'packImport', 'packWipe', 'rebuild',
  'compRead', 'compWrite', 'compDelete', 'compRestore', 'compFactory', 'compList',
  'winCtl', 'winState', 'restartApp', 'closeChoice', 'setCloseChoice', 'systemMing',
  'aboutInfo', 'iconsList', 'fontList', 'ocrSwatch', 'imgPeek', 'imgOpen'];
const 漏 = 必须挡.filter(名 => !地板.includes(名));
台.判('该挡的 ' + 必须挡.length + ' 颗一颗不漏在地板上', 漏.length === 0, 漏);
const 挡空 = 地板.filter(名 => !在桥上(名));
台.判('地板上没有挡空的名（桥上找不到这一颗 = 名单长草或写错名）', 挡空.length === 0, 挡空);
const 各家点的 = {};
for(const 名 of 名单)
  各家点的[名] = (JSON.parse(fs.readFileSync(家目录 + '/' + 名 + '/manifest.json', 'utf8')).appChannels || []);
const 撞 = Object.entries(各家点的).flatMap(([家, 串]) => 串.filter(名 => 地板.includes(名)).map(名 => 家 + '·' + 名));
台.判('七家清单点名的通道一颗都不在地板上（挡了就是当场少一只手）', 撞.length === 0, 撞);
const 点的全 = Object.values(各家点的).flat();
const 不在桥上 = 点的全.filter(名 => !在桥上(名));
台.判('点名的那 ' + 点的全.length + ' 颗桥上一颗颗都有（清单不是凭空写的）', 不在桥上.length === 0, 不在桥上);

台.收尾();
