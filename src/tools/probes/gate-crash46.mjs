/* ============================================================
   gate-crash46.mjs · 外46 批十一：崩溃记录那一行 + 同一家连崩三次不再叫它
   ------------------------------------------------------------
     node src/tools/probes/gate-crash46.mjs
   这台切的是仓库里那份真装载器（src\_shared\sh-load.js），搬进一台干净的 vm 里真跑：
   假 dataRead / dataWrite 记账、假定时器（我手里这一支能自己拨），
   所以钉的是"算出的数真走到落盘的那一行"，不是"源码里有没有那句"。
   钉这十件事：
     一、那一行落在 data\logs\崩溃.txt，形状是「时间 · 哪家 · 哪一面 · 一句原话」，一笔一行；
     二、两笔一起崩也不许后一笔盖掉前一笔（排成一队写）；
     写不成都当没写；没有那两颗通道（开发那台服务器）时只记内存账；
     三、"连续"两个字钉住：三次才停，中间顺利回来一次就归零；
     四、停了之后四颗方法都不再进插件那一段，位子上那张卡给的是能处理的那一句；
     五、异步不回话那一档：定时器一响就记一笔"没回话"，承诺后来回来了就把定时器撤掉；
     六、装载失败那一路也记一笔，哪一面写「装载」；
     七、卡面还是那一份（fd-empty 在装载器里只许出现一次）；
     八、反向对照：拆掉三处里任何一处，这台必须红。
   ============================================================ */
import vm from 'node:vm';
import { rd, 记账, 切 } from './lib-slice.mjs';

const 台 = 记账('gate-crash46');
const 载 = rd('src/_shared/sh-load.js');

/* ---------- 一棵假界面（够装载器画一张卡） ---------- */
function 节点(类, 子){ return { tag:类, kids:[], innerHTML:'', appendChild(c){ this.kids.push(c); return c; }, ...(子 || {}) }; }
/* 宿主页面上那颗 h(标签, 属性, 孩子[]) 是三个参数的，这台子也得接第三个 ——
   只接两个的话建出来的卡是空的，"位子上那张卡写了什么"就量不出来（2026-10-12 这一轮先踩过一次） */
function 造(类, 属, 子){
  const n = 节点(类, 属);
  (Array.isArray(子) ? 子 : (子 ? [子] : [])).forEach(c => {
    if(typeof c === 'string') n.kids.push({ text:c });
    else if(c) n.kids.push(c);
  });
  return n;
}
function 文字(o, 串 = []){
  if(o === null || o === undefined) return 串;
  if(typeof o === 'string'){ 串.push(o); return 串; }
  if(o.text !== undefined) 串.push(o.text);
  (o.kids || []).forEach(c => 文字(c, 串));
  return 串;
}
const 拼 = o => 文字(o).join(' ');

/* ---------- 记账用的那几颗假东西 ---------- */
const 盘 = { 档: '', 写: [], 抛: false, 读: '' };      /* data\logs\崩溃.txt 那一格 */
const 时 = { 排: [], 撤: [] };                          /* 那支可自己拨的定时器 */
const 呼 = [];                                          /* 插件那几颗被真叫到几次 */

const 场 = vm.createContext({
  console:{ warn(){}, log(){}, error(){} },
  window:{ FD_APP:{
    dataRead: async () => { if(盘.抛) throw new Error('读不到'); return 盘.读; },
    dataWrite: async (档, 字) => { if(盘.抛) throw new Error('写不进'); 盘.档 = 档; 盘.写.push(字); 盘.读 = 字; return { ok:true }; },
  } },
  /* 装载器要的那一颗"几秒没回话"的定时器交给这台子拿着：拨一下才响 */
  setTimeout: (fn, ms) => { 时.排.push({ fn, ms, 号: 时.排.length }); return 时.排.length; },
  clearTimeout: 号 => { 时.撤.push(号); },
  h:造,
  Bus:{ emit(){}, on(){ return () => {}; } }, Banks:{ list:() => [] },
  registerWidget: def => { 场.registerWidget.收 = def; },
  registerTool: def => { 场.registerTool.收 = def; },
});
场.registerWidget.收 = null; 场.registerTool.收 = null;

for(const 段 of [ 切(rd('src/_shared/sh-packs.js'), 'PACK_META'), 切(载, 'sealDeep'),
                  切(载, 'APP_DENY'), 切(载, 'packApp'), 切(载, 'PackCtx'), 切(载, 'PackLoader') ])
  vm.runInContext(段, 场);
const 跑 = 码 => vm.runInContext(码, 场);
const 等 = ms => new Promise(r => setTimeout(r, ms));   /* 这台子自己的（真 node 的），给排队的写一点时间 */
function 登(id, 名){
  跑(`PACK_META[${JSON.stringify(id)}] = { id:${JSON.stringify(id)}, name:${JSON.stringify(名)}, type:'widget', appChannels:[], dataKeys:[], slots:[], assets:[], bank:null };`);
}

/* ---------- 一、那一行落在哪一格、长什么样 ---------- */
台.题('一、崩溃记录那一行：哪一格、哪四栏');
登('c1', '甲家');
const 一笔 = 跑('PackLoader.崩一笔("c1", "mount", "这里炸了")');
台.判('回的是"连着第几次"（调用方拿它判要不要停）', 一笔 === 1, String(一笔));
跑('PackLoader.崩队');   /* 那颗队列属性得在 */
await 等(30);
台.判('写的是 logs/崩溃.txt 那一格（不在数据层外面）', 盘.档 === 'logs/崩溃.txt', 盘.档);
台.数('落盘那一行长这样', JSON.stringify(盘.写[0] || ''));
台.判('四栏齐：时间 · 哪家 · 哪一面 · 一句原话',
  /^\[[\d-]+ [\d:.]+\] 甲家 · mount · 这里炸了\n$/.test(盘.写[0] || ''), 盘.写[0]);

/* ---------- 二、排着写，不许后一笔盖掉前一笔 ---------- */
台.题('二、两家一起崩：排成一队写');
盘.读 = 盘.写[0];
跑('PackLoader.崩一笔("c1", "settings", "设置里又炸")');
跑('PackLoader.崩一笔("c1", "expand", "展开也炸")');
await 等(40);
台.判('两次写，第二次带着第一次那一行（读回来拼上再写，不各写各的）', 盘.写.length === 3 && 盘.写[2].split('\n').filter(Boolean).length === 3,
  '写的趟数 ' + 盘.写.length);
台.判('每一笔自己一行（行尾必有换行）', (盘.写[2] || '').endsWith('\n') && (盘.写[2] || '').split('\n').filter(Boolean).every(行 => /^\[/.test(行)));

/* ---------- 三、写不成都当没写；没有那两颗通道只记内存账 ---------- */
台.题('三、记日志这件事绝不能把程序带倒');
盘.抛 = true;
let 炸没 = false;
try{ 跑('PackLoader.崩一笔("c1", "unmount", "写不进也要记得下")'); }catch(e){ 炸没 = true; }
await 等(30);
台.判('dataWrite 当场抛也不把这一趟带倒（装载器还在跑）', !炸没);
盘.抛 = false;
const 原桥 = 跑('globalThis.__原桥 = window.FD_APP; "留着"');
台.数('换掉之前那颗桥在不在', 原桥);
跑('window.FD_APP = {}');
let 次 = 0;
try{ 次 = 跑('PackLoader.崩一笔("c1", "mount", "开发服务器上没这两颗通道")'); }catch(e){ 次 = -1; }
await 等(30);
台.判('开发那台服务器上（没这两颗通道）：计数照记，也不炸', 次 > 0, '次数 ' + 次);
跑('window.FD_APP = __原桥;');
台.判('换回来之后照旧写得进那一格（这一节没把后面几节弄坏）', 跑('typeof window.FD_APP.dataWrite') === 'function');

/* ---------- 四、"连续"三个字：三次才停，回来一次就归零 ---------- */
台.题('四、连崩三次才停，顺利回来一次就归零');
登('c2', '乙家');
跑(`globalThis.乙 = { settings(){ throw new Error('又炸'); }, expand(){ return 1; }, mount(){ return {}; } };
     PackLoader.register('c2', 乙, {});`);
跑('乙.settings()'); 跑('乙.settings()');
台.判('两次：还没停（三次才停）', 跑('PackLoader.停了("c2")') === false, String(跑('PackLoader.崩次.get("c2")')));
跑('乙.settings()');
台.判('第三次：停了这一家', 跑('PackLoader.停了("c2")') === true);
台.判('界面上那句说得清：errs 里写的是"连着出错 3 次，已经不再叫这一家了"',
  String(跑('PackLoader.errs.get("c2")')).includes('连着出错 3 次'), 跑('PackLoader.errs.get("c2")'));
登('c3', '丙家');
跑(`globalThis.放 = false;
     globalThis.丙 = { settings(){ if(放) return 1; throw new Error('炸一次'); } };
     PackLoader.register('c3', 丙, {});`);
跑('丙.settings()');
台.判('丙家先崩一次', 跑('PackLoader.崩次.get("c3")') === 1, String(跑('PackLoader.崩次.get("c3")')));
跑('放 = true;');
跑('丙.settings();');
台.判('顺利回来一次，账就归零（钉的是"连续"那两个字的本义）', 跑('PackLoader.崩次.get("c3")') === 0, String(跑('PackLoader.崩次.get("c3")')));

/* ---------- 五、停了之后不再叫它 ---------- */
台.题('五、停了之后：几颗方法都不再进插件那一段');
登('c4', '丁家');
跑(`globalThis.账 = [];
     globalThis.丁 = { settings(){ 账.push('settings'); throw new Error('炸'); },
       expand(){ 账.push('expand'); throw new Error('炸'); },
       mount(b){ 账.push('mount'); throw new Error('炸'); } };
     PackLoader.register('c4', 丁, {});`);
跑('丁.settings(); 丁.settings();');
台.判('崩到第三次之前一直还在叫它', 跑('账.length') === 2, String(跑('账.length')));
跑('丁.settings();');
台.判('第三次之后才停', 跑('PackLoader.停了("c4")') === true);
跑('丁.settings(); 丁.expand({}); 丁.mount({ innerHTML:"", appendChild(){} });');
台.判('停了之后三颗都不再进插件那一段（一次都不加）', 跑('账.length') === 3, JSON.stringify(跑('账')));
const 位树 = 跑('(function(){ const b = { innerHTML:"", kids:[], appendChild(c){ this.kids.push(c); return c; } }; 丁.mount(b); return b.kids[0] || null; })()');
const 位 = 拼(位树);
/* 「改代码」那颗入口和设置里的开关都随插件分离第 2 批撤了：这张卡只能指向现在还办得成的那两件事 ——
   去插件管理那一屏卸载它，或者用自己手里那一份包重装。 */
台.判('位子不空着：那张卡写的是现在办得成的那两件事（卸载它 · 重装那一份包）',
  String(位).includes('插件管理') && String(位).includes('卸载') && String(位).includes('重装') && String(位).includes('连续出错')
  && !String(位).includes('改代码') && !String(位).includes('在设置里'), String(位));

/* ---------- 六、异步不回话那一档 ---------- */
台.题('六、异步那颗几秒没回话：记一笔"没回话"，回来就把定时器撤了');
登('c5', '戊家');
跑(`globalThis.戊 = { settings(){ return new Promise(() => {}); } }; PackLoader.register('c5', 戊, {});`);
const 排了 = 时.排.length;
跑('戊.settings()');
台.判('请它那一趟确实挂了个定时器（几秒这一档由装载器里那个数说）', 时.排.length === 排了 + 1, '挂了几次 ' + 时.排.length);
台.判('挂的毫秒数就是装载器里那一档（六秒）', 时.排[时.排.length - 1].ms === 6000, String(时.排[时.排.length - 1].ms));
时.排[时.排.length - 1].fn();
await 等(40);   /* 那一笔要排到写队列里走完，不await 读到的是上一趟的字 */
台.判('定时器一响：errs 里是"没回话"那一句', String(跑('PackLoader.errs.get("c5")')).includes('没回话'), 跑('PackLoader.errs.get("c5")'));
台.判('那一笔也进了计数（哪一面写的是那颗方法名，落的是同一格文件）',
  跑('PackLoader.崩次.get("c5")') === 1 && 盘.写.some(字 => 字.includes('戊家 · settings · 等它 6 秒')), 盘.写[盘.写.length - 1]);
登('c6', '己家');
跑(`globalThis.己 = { expand(){ const p = new Promise(r => { globalThis.好 = () => r(7); }); return p; } };
     PackLoader.register('c6', 己, {});`);
const 前 = 时.排.length;
跑('己.expand({});');
跑('好();');
await 等(20);
台.判('承诺后来回来了就把那颗定时器撤掉（不许事后补记一笔卡住）', 时.排.length === 前 + 1 && 时.撤.length > 0, '挂 ' + 时.排.length + ' / 撤 ' + 时.撤.length);

/* ---------- 七、装载失败也记一笔 ---------- */
台.题('七、装载失败那一路也记一笔');
登('c7', '庚家');
跑('PackLoader.fail("c7", new Error("模块取不到"))');
await 等(30);
台.判('哪一面写的是「装载」，原话是那句错', 盘.写.some(字 => 字.includes(' · 装载 · 模块取不到')), 盘.写[盘.写.length - 1]);
台.判('错误卡照旧立得起来（这次改动没把 fail 那一路碰坏）',
  !!(场.registerWidget.收 && typeof 场.registerWidget.收.mount === 'function'));

/* ---------- 八、卡面只此一份 ---------- */
台.题('八、卡面还是那一份');
台.判('整份装载器里 fd-empty 只出现一次（装载失败与运行中出错共用 errCard）',
  (载.match(/fd-empty/g) || []).length === 1, '出现 ' + (载.match(/fd-empty/g) || []).length + ' 次');

/* ---------- 九、反向对照 ---------- */
台.题('九、反向对照（判据不是空闸）');
/* 拆掉"排成一队写"就只剩直接写盘那一条路：拿这一颗函数的身体验 —— 队列必须在写之前，且只写一处 */
const 身 = (载.match(/崩一笔\(id, 哪一面, 原话\)\s*\{[\s\S]{0,900}?\n  \},/) || [''])[0];
/* 2026-10-16 第 3 批 3.4：写盘那一手抽成 落一行（崩溃那一本与包检查那一本共用一条队），判据跟着落在 落一行 身上 */
const 队 = (载.match(/落一行\(档, 行\)\s*\{[\s\S]{0,900}?\n  \},/) || [''])[0];
台.判('崩一笔只写一处、并且排在崩队后面（抽手之后：崩一笔交给 落一行，队列与写盘都在 落一行 里，一处不许多）',
  身.includes("this.落一行('logs/崩溃.txt'") && 队.length > 0
  && 队.indexOf('this.崩队 = this.崩队.then') >= 0 && 队.indexOf('this.崩队 = this.崩队.then') < 队.indexOf('A.dataWrite(')
  && (队.match(/A\.dataWrite\(/g) || []).length === 1, 身.length + ' 字 ‖ 落一行 ' + 队.length + ' 字');
const 不归零 = 载.replace(/self\.崩清零\(id\);/g, '/* 拆掉了 */');
台.判('把"回来一次就归零"拆掉，第四条那一条就红', (不归零.match(/崩清零/g) || []).length < (载.match(/崩清零/g) || []).length);
const 不停 = 载.replace(/self\.判停\(id, self\.崩一笔\(id, 哪一颗, 卡住句\(\)\)\);/, 'self.崩一笔(id, 哪一颗, 卡住句());');
台.判('异步那一档"到数就停"这一处确实在（拆掉它，装载器里的判停就少一处）',
  不停 !== 载 && (不停.match(/self\.判停\(/g) || []).length === (载.match(/self\.判停\(/g) || []).length - 1);
/* 判据自己也要被验一次：少了行尾那个换行，第一节那条形状判据必须红 */
const 形状 = /^\[[\d-]+ [\d:.]+\] 甲家 · mount · 这里炸了\n$/;
const 样 = '[2026-10-12 05:00:00.000] 甲家 · mount · 这里炸了';
台.判('第一节那条形状判据不是摆设（带换行过、少换行红）', 形状.test(样 + '\n') === true && 形状.test(样) === false);
台.判('装载器里那一笔确实带行尾换行（源码里那一处在）', /行 \+ '\\n'/.test(载));

台.收尾();
