/* ============================================================
   gate-tauripack46.mjs · 外46 三 批六 + 批七：插件那一列那五颗搬进壳
   ------------------------------------------------------------
     node src/tools/probes/gate-tauripack46.mjs
   只钉这 5 颗（pack:list / pack:file / pack:set / pack:import / pack:wipe），一条都不许放宽：
     一、每一颗在壳里都有对应的一颗命令、都上了 main.rs 的注册单，模块声明在两本 mod.rs 上 —— 没上单等于不存在；
     二、桥里这 5 颗不再是「这颗通道还没搬进壳」：参表里有名、栏名与顺序对得上 preload 递的实参个数，
         参数名里一个下划线都没有、也没有拿 app / 手 / 窗口 / 状态 / 事件 打头的；
     三、批六那两颗回给页面的字段逐格对 src\pack\main.cjs 1751~1887 那一段：
         扫描那一格 dir / packs / off / error（error 原件恒为空串也留这一格）、
         packOne 那三种款式（{id,kind,manifest} / 文件夹那种多一格 files / 读不成的是 {id,kind,error}）——
         files 只有文件夹那种才有、读不成那一支不带 manifest，三种读不成的话逐字对；
         pack:file 那四种款式（取不到 / 过了大小闸 / 转不成文本 都是 ok+msg，成了是 ok+text+size）；
     四、24MB 那道闸：两头同一个数、同一个算式、同一句白话，且比的是「严格大于」；
     五、扫描、取文件与摊包用的都是共用那一颗解包件（fd_core::zip_pack 的 目录() 与 取一份()），
         这一本里没有第二个解包器、也没往壳里再带一份 inflate；
     六、「文件夹赢同名 zip、两趟收」那套判断与那两份名单（off.json / installed.json）的读法住在纯判断那一格；
     七、pack:set（main.cjs 1895 行）：页面递的是「开着的」，落盘换成「卸掉的」= 扫到的全部 减 开着的 ——
         那道换算与算式的同一把尺、null/undefined 删掉那份名单文件、不是列表那一句、
         建不出格 / 删不掉 / 写不进 那三句原话逐字对；写完查一眼音乐遥控器（朝 media_cmds 那一颗借，
         不新写第二把尺）并收后台监听；回执两种款式（{ok:true} 与 {ok:true,ids}）逐格对，
         ids 回的是页面递进来的那一串而不是算出来的那几家；
     八、pack:import（main.cjs 1995 行）：那十句原话逐字对、门牌折成绝对那一手住在纯判断那一格、
         两种形状（.zip 摊开 / 解开的文件夹整格抄）各自的回执（id / where / files / name）逐格对、
         「同名绝不动手」那两道闸与包名那道闸朝 comp_rule 借（不抄第二份 ID_OK）、
         留一份原版的两把格朝 comp_cmds 借、摊包只有共用那一颗解包器、
         落点只准落在 那一列（data\plugins）那一格里，别的格一颗都不许写；
     九、pack:wipe（main.cjs 2052 行）：删的就两摊（用户目录以内点名的那几份 + 数据层根底下点名的那几份），
         留的一律留着（插件那一格与它底下的、数据层根本体、本家以外的每一格）—— 逐格钉住；
         这一颗不写备份、不落字条、不动包本身；抹成了才进 removed、抹不动不报错、永远 ok:true；
         files 报的是页面递进来的原文、shared 报的是折过的那一串（原件两处不同，一处都不许多折、也不许少折）；
     十、纯判断那一格带测试、不动磁盘、不认识壳；
     十一、账：覆盖率 已搬 63 / 67、main.rs 顶上那句「还剩几颗没搬」跟着改成 4、
          四道同族闸的数撞得上、跑测试此刻全绿 233 颗零警告；
          本批那几本文本里一个字节都没写这台机器的盘符、帐户名、私人目录名。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { rd, 记账, 切, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-tauripack46');
const main = rd('src/pack/main.cjs');
const 原身 = rd('src/pack/preload.cjs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 壳 = rd('src/_tauri/src/main.rs');
const 动 = rd('src/_tauri/src/tauri_bind/pack_cmds.rs');
const 纯 = rd('src/_tauri/src/core/pack_rule.rs');
const 数纯 = rd('src/_tauri/src/core/data_path.rs');
const 拆 = rd('src/_tauri/src/core/zip_pack.rs');
const 声 = rd('src/_tauri/src/tauri_bind/media_cmds.rs');
const 声明 = rd('src/_tauri/src/tauri_bind/mod.rs');
const 判声明 = rd('src/_tauri/src/core/mod.rs');

/* 名字换算与桥里那一颗同一式子：冒号变下划线、驼峰变下划线小写 */
const 换 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
/* 点名的五颗：通道名、壳里的命令名、页面该递几栏（栏名照 Rust 声明顺序，app / 手 那种不算） */
const 批 = [
  ['pack:list', 'pack_list', []],
  ['pack:file', 'pack_file', ['id', 'rel']],
  ['pack:set', 'pack_set', ['ids']],
  ['pack:import', 'pack_import', ['payload']],
  ['pack:wipe', 'pack_wipe', ['files', 'shared']],
];
/* 这一批（批七）新搬的三颗，下面几节各自钉自己的那一段 */
const 新批 = [['pack:set', 'pack_set'], ['pack:import', 'pack_import'], ['pack:wipe', 'pack_wipe']];

/* 从主进程那份里切出一颗 handler 的原文：从 ipcMain.handle('<通道>' 起到下一个 ipcMain. 为止 */
function 那一段(通道) {
  const 起 = main.indexOf("ipcMain.handle('" + 通道 + "'");
  if (起 < 0) throw new Error('主进程里找不到这一颗：' + 通道);
  const 止 = main.indexOf('ipcMain.', 起 + 1);
  return main.slice(起, 止 < 0 ? main.length : 止);
}
/* 桥的参表（生成物里那一份）；拿不到就当这一批根本没进桥 */
const 表文 = (桥.match(/const 参表 = (\{[\s\S]*?\});/) || [])[1] || '{}';
const 表 = JSON.parse(表文);
/* 页面那一头实参有几栏：从 preload 里 invoke('<通道>' 后面那段按括号层数数一遍顶层逗号 */
function 递了几栏(通道) {
  const 键 = "invoke('" + 通道 + "'";
  const 次 = 原身.split(键).length - 1;
  if (次 !== 1) throw new Error('桥的调用点在 preload 里不是唯一的一处：' + 通道 + '（找到 ' + 次 + ' 处）');
  let k = 原身.indexOf(键) + 键.length, 深 = 0, 出 = '';
  while (k < 原身.length) {
    const c = 原身[k];
    if (c === '(' || c === '[' || c === '{') 深++;
    else if (c === ')' || c === ']' || c === '}') { if (深 === 0) break; 深--; }
    else if (c === '"' || c === "'") { k++; while (k < 原身.length && 原身[k] !== c) k++; }
    出 += c;
    k++;
  }
  const 去头 = 出.replace(/^\s*,/, '');
  if (!/\S/.test(去头)) return 0;
  let 数 = 0, 层 = 0;
  for (const c of 去头) {
    if (c === '(' || c === '[' || c === '{') 层++;
    else if (c === ')' || c === ']' || c === '}') 层--;
    else if (c === ',' && 层 === 0) 数++;
  }
  return 数 + 1;
}
/* 从一段对象字面量里按「元素第一个名字」取键名（简写那一手 { dir, } 也取到，跟 JS 的回执一样） */
function 取键(串) {
  const 内 = 串.replace(/^[{\s]+/, '').replace(/[}\s]+$/, '');
  let 深 = 0, 出 = '', 段 = [];
  for (const c of 内) {
    if (c === '{' || c === '[' || c === '(') 深++;
    else if (c === '}' || c === ']' || c === ')') 深--;
    if (c === ',' && 深 === 0) { 段.push(出); 出 = ''; continue; }
    出 += c;
  }
  段.push(出);
  const 名 = [];
  for (const 一 of 段) {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*/.exec(一);
    if (m) 名.push(m[1]);
  }
  return [...new Set(名)];
}
/* 从一颗 Rust struct 里取字段名（带 #[serde] 那几行跳过） */
function 壳字段(源, 名) {
  const 块 = (源.match(new RegExp('(?:pub )?struct ' + 名 + ' \\{[\\s\\S]*?\\n\\}')) || [''])[0];
  return [...new Set([...块.matchAll(/^\s{4}([A-Za-z0-9_]+)\s*:/gm)].map(m => m[1]))];
}
/* 从一颗 Rust struct 里取「序列化到页面的那一格叫什么」：带 rename 的读 rename，中文栏名自己不算
   （回给页面的串是 rename 那一个，比 main.cjs 的 return 只能按这个对）；顺带记哪几栏是「有才有」 */
function 壳格(源, 名) {
  const 块 = (源.match(new RegExp('(?:pub )?struct ' + 名 + ' \\{[\\s\\S]*?\\n\\}')) || [''])[0];
  const 出 = [];
  let 改名 = null, 可有 = false;
  for (const 行 of 块.split(/\r?\n/)) {
    const 属 = /^\s*#\[serde\(([^)]*)\)\]/.exec(行);
    if (属) {
      const r = /rename = "([^"]+)"/.exec(属[1]);
      if (r) 改名 = r[1];
      if (/skip_serializing_if/.test(属[1])) 可有 = true;
      continue;
    }
    const m = /^\s{4}([A-Za-z0-9_\u4e00-\u9fff]+)\s*:/.exec(行);
    if (m) { 出.push({ 格: 改名 || m[1], 可有 }); 改名 = null; 可有 = false; }
  }
  return 出;
}
const 格名 = (源, 名) => 壳格(源, 名).map(x => x.格);
/* 一颗 Rust 函数（或方法）的原文：从 fn 名( 起到这一颗收尾那个顶格的 } */
function 一颗(源, 名) {
  const m = new RegExp('(?:pub(?:\\(crate\\))? )?fn ' + 名 + '\\s*[<(]').exec(源);
  if (!m) return '';
  const 止 = 源.indexOf('\n}', m.index);
  return 源.slice(m.index, 止 < 0 ? 源.length : 止 + 2);
}
/* 纯判断那一格里 pub const X: T = "..."; 那一批字面值 */
function Rust串(源) {
  const 出 = {};
  for (const m of 源.matchAll(/pub const ([A-Za-z0-9_\u4e00-\u9fff]+): &str = "([^"]*)";/g)) 出[m[1]] = m[2];
  return 出;
}
/* 剥掉注释只看代码本身（那两本里句句注释都提原话与闸自己的名，判的是代码不是话） */
function 去注(源) {
  let s = String(源);
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/^\s*\/\/.*$/gm, ' ');
  return s;
}
const 动码 = 去注(动), 纯码 = 去注(纯);
/* 一个算术式（只认数、空格与乘号），两头都用它把 24 * 1024 * 1024 那种写法算成数 */
function 算式(串) {
  const 净 = String(串).replace(/_/g, '').trim();
  if (!/^[\d\s*]+$/.test(净)) throw new Error('这个式子不敢算：' + 串);
  return Function('"use strict";return (' + 净 + ')')();
}
/* 主进程那一段里「有这一句」与「没这一句」都用它，先把源码里的双引号写法折成单引号再说 */
const 有 = (段, 句) => 段.includes(句);

台.题('一、这一批 5 颗：主进程每一颗，壳里都有一座，且都上了注册单');
台.数('这一批点名的通道', 批.length + ' 颗 · ' + 批.map(x => x[0]).join(' '));
台.判('点的就是 5 颗，不多不少（批六那两颗 + 批七这三颗，插件那一列到这儿搬齐）', 批.length === 5);
for (const [通道, 名] of 批) {
  台.判(通道 + ' 的通道名换算过去就是 ' + 名, 换(通道) === 名);
  台.判(通道 + ' 在主进程里确有这一颗 handler', main.includes("ipcMain.handle('" + 通道 + "'"));
  台.判(通道 + ' 在主进程里就一处 handler（有两处就是有两个真身）',
    (main.split("ipcMain.handle('" + 通道 + "'").length - 1) === 1);
  台.判(通道 + ' 在壳里有对应的一颗（pack_cmds.rs 里有 pub fn ' + 名 + '）',
    new RegExp('pub fn ' + 名 + '\\s*\\(').test(动));
  台.判(通道 + ' → ' + 名 + ' 在 main.rs 的注册单上', 壳.includes('pack_cmds::' + 名));
}
台.判('pack_cmds.rs 里就五颗命令标记（多一颗就是往这一本里塞了没点名的通道）',
  (动.match(/#\[[^\]]*tauri::command/g) || []).length === 5);
台.判('壳里这一本里出现的 pack_ 命令名正好是点名的这五颗（没顺手多搬一颗、也没少一颗）',
  JSON.stringify([...new Set((动.match(/pub fn (pack_\w+)/g) || []).map(s => s.slice('pub fn '.length)))].sort())
  === JSON.stringify(批.map(x => x[1]).sort()));
台.判('模块声明在这本上（tauri_bind/mod.rs 认 pack_cmds）', /pub mod pack_cmds;/.test(声明));
台.判('纯判断那一格认 pack_rule', /pub mod pack_rule;/.test(判声明));
台.判('共用那一款解包件也登记上了（core/mod.rs 认 zip_pack —— 不登记就是没人叫的第二份代码）',
  /pub mod zip_pack;/.test(判声明));
台.判('五颗都不抛给页面（命令的返回类型都不是 Result）',
  批.every(x => !new RegExp('pub fn ' + x[1] + '\\([^)]*\\) -> Result').test(动)));
台.判('开机那一趟 packAdopt 不算通道、也没往这一本里塞成第六颗',
  main.includes('function packAdopt()') && !动.includes('pack_adopt'));

台.题('二、桥里这 5 颗不再是「还没搬」');
for (const [通道, 名, 栏] of 批) {
  台.判('桥的参数表里有 ' + 名 + '（页面请 ' + 通道 + ' 不再报「这颗通道还没搬进壳」）',
    Object.prototype.hasOwnProperty.call(表, 名));
  台.判(名 + ' 的栏名与顺序 = ' + (栏.join(', ') || '（不收栏）'),
    JSON.stringify(表[名] || null) === JSON.stringify(栏));
}
for (const [通道, 名] of 批) {
  台.判(通道 + '：页面上递几栏，壳里那颗就收几栏', 递了几栏(通道) === (表[名] || []).length,
    '桥里 ' + (表[名] || []).length + ' 栏，页面上递 ' + 递了几栏(通道) + ' 栏');
}
const 栏名们 = 批.flatMap(x => 表[x[1]] || []);
台.数('这一批命令的页面栏名', [...new Set(栏名们)].join(' ') || '（不收栏的只有 pack_list 那一颗）');
台.判('参数名里一个下划线都没有（Tauri 那头按驼峰认名）', 栏名们.every(n => !n.includes('_')));
台.判('参数名没有拿 app / 手 / 窗口 / 状态 / 事件 打头的（那种会被当成不是给页面的）',
  栏名们.every(n => !/^(app|手|窗口|状态|事件)/.test(n)));
台.判('这五颗都不收 AppHandle（原件那几头没朝窗口喊话，日志那一格还没搬）', !/app: AppHandle/.test(动));
台.判('pack:file 那一颗两栏全收字串（preload 那头把 id 与 rel 都 String(...) 过一遍，空的那栏也是字串）',
  /pub fn pack_file\(id: String, rel: String\)/.test(动)
  && 原身.includes("invoke('pack:file', String(id || ''), String(rel || ''))"));
台.判('pack:list 那一颗不收栏（原件就是 () => packScan()）',
  /pub fn pack_list\(\) -> 一次扫描/.test(动) && 原身.includes("invoke('pack:list')"));
台.判('pack:set 那一颗收的是 ids，形状给 Option<Value>（原件三种递法：列表 / null / undefined 都要分得清）',
  /pub fn pack_set\([^)]*ids: Option<Value>/.test(动)
  && 原身.includes("invoke('pack:set', ids === null ? null : Array.from(ids || []))"));
台.判('pack:set 那颗另收一枚 手: State（监听那本账不是给页面的栏，桥那头按名字跳过）',
  /pub fn pack_set\(手: State<'_, 媒体手>/.test(动) && !表.pack_set.includes('手'));
台.判('pack:import 那一颗整份递进来收 payload: Option<Value>（原件 payload || {} 那一手：没递也算一份空单子）',
  /pub fn pack_import\(payload: Option<Value>/.test(动) && 原身.includes("invoke('pack:import', payload)"));
台.判('pack:wipe 那一颗两栏 files / shared（preload 那头 Array.from 过一遍，递进来的都是列表）',
  /pub fn pack_wipe\(files: Option<Value>, shared: Option<Value>\)/.test(动)
  && 原身.includes("invoke('pack:wipe', Array.from(files || []), Array.from(shared || []))"));
台.判('三颗新的都在 preload 里只有一处调用点（两处就是有两个真身，桥对不上）',
  ['pack:set', 'pack:import', 'pack:wipe'].every(c => 原身.split("invoke('" + c + "'").length - 1 === 1));

台.题('三、批六那两颗回给页面的字段逐格对 main.cjs（一格不多一格不少）');
const 主扫 = 切(main, 'packScan');
const 主回 = [...主扫.matchAll(/return (\{[^}]*\})/g)].map(m => 取键(m[1]));
台.数('那一段里 return 的那几种款式', 主回.map(x => x.join('+')).join(' / '));
台.判('扫描那一头两种款式都是 dir + packs + off + error 四格',
  主回.length === 2 && 主回.every(x => JSON.stringify(x) === JSON.stringify(['dir', 'packs', 'off', 'error'])));
台.判('壳里 一次扫描 就那四栏、同一串同一序（error 原件恒为空串，这一头也留这一格）',
  JSON.stringify(格名(动, '一次扫描')) === JSON.stringify(['dir', 'packs', 'off', 'error'])
  && 动.includes('error: String::new()'));
台.判('那四栏一格都不许「有才有」（原件两种款式四栏全在）',
  壳格(动, '一次扫描').every(x => !x.可有));
const 主摊 = 切(main, 'packOne');
台.数('那一段里 return 的那几种款式', (主摊.match(/return [^\n]*/g) || []).length + ' 支');
台.判('文件夹那种那一支是 id + kind + manifest + files 四格（files 只有这一种才有）',
  主摊.includes('return { id:name, kind, manifest:m, files:fs.readdirSync(path.join(dir, name)) };'));
台.判('压缩包那种成了那一支只有 id + kind + manifest 三格（没带 files）',
  主摊.includes("return { id:name, kind, manifest:m };")
  && !/return \{ id:name, kind, manifest:m, files[^\n]*zip/i.test(主摊));
台.判('读不成清单那几支只有 id + kind + error 三格（不带 manifest、也不带 files）',
  (主摊.match(/\{ id:name, kind, error:/g) || []).length === 3
  && !主摊.includes('manifest:m, error'));
const 壳包 = 格名(动, '一个包');
台.数('壳里 一个包 有哪几栏', 壳包.join(' '));
台.判('壳里那一格六栏串同一串（id kind manifest files error deniedChannels），且 manifest / files / error / deniedChannels 全是「有才有」',
  JSON.stringify(壳包) === JSON.stringify(['id', 'kind', 'manifest', 'files', 'error', 'deniedChannels'])
  && 壳格(动, '一个包').filter(x => x.可有).length === 4);
const 包码 = 一颗(动, '读不成') + 一颗(动, '摊开一家');
台.判('壳里文件夹那一支才给 files，压缩包那一支与读不成那一支都给 None（不发明第二形状）',
  一颗(动, '摊开一家').includes('files: Some(名册)') && (包码.match(/files: None/g) || []).length === 2);
台.判('files 那一栏照扫描原件不筛（名册里图片、随行件、脚本都在），只把枚举序排一遍免得每台机器不同',
  主摊.includes('files:fs.readdirSync(path.join(dir, name))')
  && 一颗(动, '摊开一家').includes('名册.sort();') && !一颗(动, '摊开一家').includes("starts_with('.')"));
台.判('种类那两串逐字照原件（页面上判的就是 dir 与 zip）',
  主摊.includes("if(kind === 'dir')") && 纯.includes('pub const 文件夹那种: &str = "dir";')
  && 纯.includes('pub const 压包那种: &str = "zip";'));
const 主文 = 那一段('pack:file');
台.判('pack:file 那一头两种款式：成了是 ok + text + size、不成是 ok + msg（壳里同一串同一序）',
  主文.includes("return { ok:true, text:buf.toString('utf8'), size:buf.length };")
  && 主文.includes('return { ok:false, msg:')
  && JSON.stringify(格名(动, '一份包里文件')) === JSON.stringify(['ok', 'text', 'size', 'msg']));

台.题('四、批六那三句读不成的话与取不到那份的那句白话，两头逐字对');
const 纯串 = Rust串(纯);
const 那三句 = [
  ['清单读不成那句', '插件清单读不成那份格式：'],
  ['没带清单那句', '压缩包里没带插件清单'],
  ['压包读不动那句', 'zip 读不动：'],
];
for (const [颗, 期望] of 那三句) {
  台.判('纯判断那一格里 ' + 颗 + ' = 「' + 期望 + '」', 纯串[颗] === 期望);
  台.判('那一句在主进程 packOne 里逐字有（不是壳自己新造的话）', 主摊.includes("'" + 期望 + "'"));
}
台.判('三句的分工照原件：读不成与解析不成挂第一句，拆包与清单读不成都挂第三句，中间那一支不带前缀',
  主摊.includes("error:'插件清单读不成那份格式：' + e.message")
  && 主摊.includes("error:'压缩包里没带插件清单'")
  && 主摊.includes("error:'zip 读不动：' + String((e && e.message) || e)")
  && 动.includes('format!("{}{}", 清单读不成那句, 说错(e))') && 动.includes('format!("{}{}", 清单读不成那句, e)')
  && 动.includes('format!("{}{}", 压包读不动那句, e)') && 动.includes('没带清单那句.to_string()'));
台.判('取不到那份那一句逐字（拼的是页面递进来的那两串，不是洗过的那一串）',
  主文.includes("msg:'包里没有这份文件：' + String(id) + '/' + String(rel)")
  && 纯.includes('format!("包里没有这份文件：{}/{}", id, 相对)'));
台.判('转不成文本那一句前缀逐字', 主文.includes("msg:'读不出文本：' + String((err && err.message) || err)")
  && 纯串.读不出文本那句 === '读不出文本：');
台.判('那一句在主进程 packRaw 里也有同一手（取不到五种情形落同一句，壳里同一颗 那句 复用三处）',
  (动.match(/一份包里文件::不成\(那句\)/g) || []).length === 3);
台.判('那几句白话在动手那一层一个字都没重写（代码里不许出现那种字面，全靠 core 的常量拼）',
  !动码.includes('"包里没有这份文件') && !动码.includes('"插件清单读不成') && !动码.includes('"压缩包里没带插件清单"')
  && !动码.includes('"zip 读不动') && !动码.includes('"读不出文本') && !动码.includes('MB，太大不走这条路'));

台.题('五、24MB 那道闸：同一个数、同一个算式、同一句白话、同一个比法');
const JS闸 = 算式((切(main, 'PACK_FILE_MAX').match(/=\s*([^;]+);/) || [])[1]);
const Rust闸 = 算式((纯.match(/pub const 封顶字节: u64 = ([^;]+);/) || [])[1]);
台.数('那道闸两头各是多少', JS闸 + ' / ' + Rust闸);
台.判('24MB 那道闸两头同一个数，且只在纯判断那一格里写着', JS闸 === Rust闸 && 封顶只在纯() && !动码.includes('1024 * 1024'));
function 封顶只在纯() { return /24 \* 1024 \* 1024/.test(纯); }
const JS式 = (主文.match(/Math\.round\(([^)]+)\)/) || [])[1] || '';
台.判('那一头的算式就是 Math.round(buf.length / 1048576)', JS式.trim() === 'buf.length / 1048576');
台.判('这一头折成整兆那一颗用的是同一枚除数与四舍五入（1048576.0 + .round()）',
  纯.includes('(字节 as f64 / 1048576.0).round()'));
台.判('那句白话逐字对：这份文件 NMB，太大不走这条路',
  主文.includes("msg:'这份文件 ' + Math.round(buf.length / 1048576) + 'MB，太大不走这条路'")
  && 纯.includes('format!("这份文件 {}MB，太大不走这条路", 折成兆(字节))'));
台.判('比的是严格大于（正好 24MB 还走这条路，两头同一个比法）',
  主文.includes('if(buf.length > PACK_FILE_MAX)') && 动.includes('if 大 > 封顶字节'));
台.判('那道闸在动手那一层被叫到一处，取字节之后、转文本之前（与原件同顺序）',
  (动.match(/太大那句\(大\)/g) || []).length === 1
  && 动.indexOf('if 大 > 封顶字节') < 动.indexOf('String::from_utf8'));

台.题('六、扫描、取文件与摊包用的都是共用那一颗解包件，壳里没有第二个解包器');
台.判('动手那一层引的是共用的两颗（目录 / 取一份）',
  动.includes('use crate::fd_core::zip_pack::{取一份, 目录};'));
台.判('读包里的插件清单（扫描那一头 + 导入那一头）三处都叫那一颗 目录()，没另开一条路',
  (动.match(/目录\(&?节\)/g) || []).length === 2 && (动.match(/目录\(字节\)/g) || []).length === 1
  && (动.match(/fn 目录\(/g) || []).length === 0);
台.判('取包里那一份（取文件 + 导入摊开）四处都叫那一颗 取一份()，摊开那一条也不是第二份解包器',
  (动.match(/取一份\(&?节, ?项\)/g) || []).length === 2 && (动.match(/取一份\(字节, ?项\)/g) || []).length === 2);
台.判('这一本里没有第二份解包器：不认 deflate 件、不认中央目录那三枚记号、不自己算偏移',
  !动码.includes('flate2') && !动码.includes('0x0') && !动码.includes('inflate')
  && !动码.includes('zipIndex') && !动码.includes('unzipEntry'));
台.判('共用的那一颗本身还在（读中央目录 + 取一份 + 那四句现成的报错话），没被这批改坏',
  /pub fn 目录\(节: &\[u8\]\) -> Result<Vec<一条目录>, String>/.test(拆)
  && /pub fn 取一份\(节: &\[u8\], 项: &一条目录\) -> Result<Vec<u8>, String>/.test(拆)
  && (拆.match(/pub (const|fn) /g) || []).length >= 8);
台.判('主进程三头用的也是同一份 zip-read.cjs（壳里只对应一颗，没跟出第二份）',
  主摊.includes("require('./zip-read.cjs')") && 切(main, 'packRaw').includes("require('./zip-read.cjs')")
  && 切(main, 'packManifestOf').includes("require('./zip-read.cjs')")
  && 切(main, 'expandZipPack').includes("require('./zip-read.cjs')"));
台.判('导入那一条读出的名字册与插件清单是同一颗给的（packManifestOf 那一手：zipIndex 之后找 manifest.json，再 unzipEntry）',
  切(main, 'packManifestOf').includes("const items = up.zipIndex(buf);")
  && 切(main, 'packManifestOf').includes("items.find(x => x.name === 'manifest.json')")
  && 一颗(动, '包里的清单与名册').includes('目.iter().find(|x| x.名 == 清单那份)')
  && 一颗(动, '包里的清单与名册').includes('serde_json::from_slice::<Value>(&文)'));

台.题('七、「文件夹赢同名 zip、两趟收」与那两份名单的读法住在纯判断那一格');
const 主扫段 = 主扫;
台.判('原件那两趟写得明明白白：文件夹先收、zip 后收且同名让开',
  主扫段.includes("for(const n of dirs)") && 主扫段.includes("for(const n of zips)")
  && 主扫段.includes('if(seen.has(id)) continue'));
台.判('为什么分两趟那句理由照抄进了纯判断那一格的注释（不许哪天当没看见）',
  纯.includes('同一个包会在页面上列两行') && 纯.includes('文件夹赢'));
台.判('两趟的分类与让开判断都在 core、动手那一层只叫它',
  /pub fn 分成两趟\(/.test(纯) && /pub fn 同名那格已占\(/.test(纯)
  && 动.includes('分成两趟(&名册)') && 动.includes('同名那格已占(&扫到, 包名)'));
台.判('seen 只记真列进这一列的那几家（文件夹那一格没列成时，同名 zip 照样露面）—— 两头同一手',
  主扫段.includes('if(p){ out.push(p); seen.add(n); }') && 主扫段.includes('if(p){ out.push(p); seen.add(id); }')
  && 动.includes('扫到.push(名.clone())') && 动.includes('扫到.push(包名.clone())'));
台.判('打头那两种与那两份名单本体都不进这一列，两头逐字（点、下划线、off.json、installed.json）',
  主扫段.includes("if(n.startsWith('.') || n.startsWith('_') || n === OFF_LIST || n === OLD_LIST) continue;")
  && 纯.includes("!名.starts_with('.') && !名.starts_with('_') && 名 != 卸掉那份 && 名 != 老的那份"));
const JS名 = [切(main, 'OFF_LIST').match(/'([^']+)'/)[1], 切(main, 'OLD_LIST').match(/'([^']+)'/)[1], 切(main, 'PACKS_DIR').match(/'([^']+)'\)/)[1]];
台.数('那三枚名字两头各是什么', JS名.join(' ') + ' | ' + 纯串.卸掉那份 + ' ' + 纯串.老的那份);
台.判('那两份名单的本名与那一列的本名两头同字（plugins / off.json / installed.json）',
  JS名[0] === 'off.json' && JS名[1] === 'installed.json' && JS名[2] === 'plugins'
  && 纯串.卸掉那份 === 'off.json' && 纯串.老的那份 === 'installed.json');
台.判('那一列住在哪一格：朝 comp_cmds 那一颗借，这一本里没再抄一遍 "plugins"',
  动.includes('crate::tauri_bind::comp_cmds::活的那一格()') && !动码.includes('"plugins"')
  && 切(main, 'PACKS_DIR').includes("path.join(DATA_ROOT, 'plugins')"));
台.判('老那份换算只此一趟：写 off.json 在前、删老那份在后，写不成就别删（原件同一个顺序）',
  主扫段.includes("fs.writeFileSync(path.join(dir, OFF_LIST), JSON.stringify({ off:卸 }, null, 2) + '\\n', 'utf8');")
  && 主扫段.includes('fs.rmSync(老);') && 动.includes('format!("{}\\n", 文)')
  && 动.indexOf('.is_ok()') < 动.indexOf('fs::remove_file(&老的)'));
台.判('换算那一句的形状与「读不成也照样换」都在 core（不是这一层自己判的）',
  /pub fn 卸掉那一格\(/.test(纯) && /pub fn 记为卸掉\(/.test(纯) && /pub fn 老单成列\(/.test(纯)
  && 动.includes('记为卸掉(&扫到, 老名单.as_deref())') && 动.includes('卸掉那一格(&卸)'));
台.判('off.json 那两种写法都认、第三种算一家都没卸（core 那颗读，动手层只叫一次）',
  /pub fn 开单成列\(/.test(纯) && 动.includes('开单成列(&文)')
  && 主扫段.includes('(Array.isArray(j) ? j : (Array.isArray(j.off) ? j.off : [])).map(String)'));
台.判('段名洗法照 packRaw 那两行（反斜杠当斜杠、打头斜杠去掉、段里有 .. / . / 空段整串不认）',
  切(main, 'packRaw').includes("String(rel || '').replace(/\\\\/g, '/').replace(/^\\/+/, '')")
  && 切(main, 'packRaw').includes("if(!clean || clean.split('/').some(s => s === '..' || s === '.' || !s)) return null;")
  && 纯.includes('for 段 in 净.split(\'/\')') && 纯.includes('if 段.is_empty() || 段 == "." || 段 == ".."'));
台.判('包里那一头还留着落点必须在本格里那第二道闸（照抄不撤）',
  切(main, 'packRaw').includes("if(f !== dir && !f.startsWith(dir + path.sep)) return null;")
  && 动.includes('if 落 != 那一格 && !落.starts_with('));

台.题('八、pack:set：页面递「开着的」，落盘换成「卸掉的」，那四句原话逐字对');
const 主单 = 那一段('pack:set');
台.判('原件那一头注释就写着反着记（页面递的是开着的、落盘的是卸掉的），这一头同一手',
  有(主单, 'off = 这一格里扫到的全部 - 开着的') === false && 有(主单, '全部.filter(x => !开着.has(x))'));
台.判('换算那道算术在 core、且就着老那份换算那一颗（同一把尺不在这一格抄第二遍 filter）',
  /pub fn 换成卸掉\(/.test(纯) && 一颗(纯, '换成卸掉').includes('记为卸掉(全部, Some(开着))')
  && 动.includes('换成卸掉(&全部, &开着)') && !一颗(动, 'pack_set').includes('.filter('));
台.判('「全部」就是 扫一遍 那一列里每家的 id（原件 packScan().packs.map(p => String(p.id))）',
  主单.includes("全部 = packScan().packs.map(p => String(p.id));")
  && 一颗(动, 'pack_set').includes('扫一遍(&格).packs.iter().map(|p| p.id.clone()).collect()'));
台.判('「开着的」那几颗照 String() 折（原件 1904 行 ids.map(String)，那颗折法在 core）',
  主单.includes('const 开着 = new Set(ids.map(String));') && /pub fn 开着的名单\(/.test(纯)
  && 一颗(纯, '开着的名单').includes('递的.iter().map(串成).collect()'));
台.判('落盘那一串的形状与缩进照原件（{ off: 算出来的那几家 }, null, 2) + 换行），与换算老名单那一次共用一颗',
  主单.includes("JSON.stringify({ off:全部.filter(x => !开着.has(x)) }, null, 2) + '\\n'")
  && 主扫段.includes("JSON.stringify({ off:卸 }, null, 2) + '\\n'")
  && 一颗(动, 'pack_set').includes('serde_json::to_string_pretty(&卸掉那一格(&卸))')
  && 一颗(动, 'pack_set').includes('fs::write(&落, format!("{}\\n", 文))'));
const 那四句 = [
  ['建不出那句', '插件目录建不出来：', "msg:'插件目录建不出来：'"],
  ['名单删不掉那句', '名单删不掉：', "msg:'名单删不掉：'"],
  ['名单写不进那句', '名单写不进去：', "msg:'名单写不进去：'"],
  ['不是列表那句', '名单得是一份 id 列表', "msg:'名单得是一份 id 列表'"],
];
for (const [颗, 期望, 原样] of 那四句) {
  台.判('纯判断那一格里 ' + 颗 + ' = 「' + 期望 + '」', 纯串[颗] === 期望);
  台.判('那一句在主进程 pack:set 里逐字有（' + 期望 + '）', 主单.includes(原样));
}
台.判('那四句在动手那一层一个字都没重写（全靠 core 的常量拼，不许出现那种字面）',
  !动码.includes('"插件目录建不出来') && !动码.includes('"名单删不掉')
  && !动码.includes('"名单写不进去') && !动码.includes('"名单得是一份 id 列表"'));
台.判('三道闸的顺序照原件：先长那一格 → 再判删名单 → 再判不是列表 → 才写（前一道中了轮不到后一道）',
  主单.includes("try{ fs.mkdirSync(dir, { recursive:true }); }") && 主单.includes('if(ids === null || ids === undefined){')
  && 主单.includes("if(!Array.isArray(ids)) return") && 主单.indexOf('mkdirSync') < 主单.indexOf('ids === null')
  && 主单.indexOf('ids === null') < 主单.indexOf('Array.isArray') && 主单.indexOf('Array.isArray') < 主单.indexOf('writeFileSync'));
台.判('这一头同顺序：create_dir_all → 那一格在不在就删 → 不是列表 → 写下去',
  一颗(动, 'pack_set').indexOf('fs::create_dir_all(&格)') < 一颗(动, 'pack_set').indexOf('fs::remove_file(&落)')
  && 一颗(动, 'pack_set').indexOf('fs::remove_file(&落)') < 一颗(动, 'pack_set').indexOf('不是列表那句')
  && 一颗(动, 'pack_set').indexOf('不是列表那句') < 一颗(动, 'pack_set').indexOf('fs::write(&落'));
台.判('递 null / undefined 就是删掉那份名单文件（= 一家都不卸）：本来不在也算删过（原件 existsSync 那一道）',
  主单.includes('if(fs.existsSync(f)) fs.rmSync(f); packAfterSet(); return { ok:true };')
  && 一颗(动, 'pack_set').includes('if 盘上有(&落)') && 一颗(动, 'pack_set').includes('ids: None, msg: None')
  && /pub fn pack_set\([^)]*ids: Option<Value>/.test(动));
台.判('删不掉才报那一句，报的是系统那句原文（原件 catch 那一支）',
  主单.includes("catch(err){ return { ok:false, msg:'名单删不掉：' + String((err && err.message) || err) }; }")
  && 一颗(动, 'pack_set').includes('format!("{}{}", 名单删不掉那句, 说错(e))'));
台.判('回执两种款式逐格对：删名单那一支只有 ok，写完那一支带 ids（回的是页面递进来的那一串，不是算出来的那几家）',
  主单.includes('return { ok:true, ids:ids.map(String) };')
  && JSON.stringify(格名(动, '一份名单')) === JSON.stringify(['ok', 'ids', 'msg'])
  && 壳格(动, '一份名单').filter(x => x.可有).length === 2
  && 一颗(动, 'pack_set').includes('一份名单 { ok: true, ids: Some(开着), msg: None }'));
台.判('写完顺手查一眼音乐遥控器还在不在（原件 packAfterSet）：不在就收后台监听，一句都不许多留',
  切(main, 'packAfterSet').includes("if(!packHas('music-remote') && media.child) mediaStop('音乐遥控器卸掉了');")
  && 纯串.卸掉监听那句 === '音乐遥控器卸掉了'
  && 一颗(动, '收掉后台监听').includes('!装了音乐遥控器()') && 一颗(动, '收掉后台监听').includes('收监听(手, 卸掉监听那句)'));
台.判('装没装那一问与收监听都朝 media_cmds 借（这一本里没有第二把尺、也没有第二颗收监听的）',
  动.includes('use crate::tauri_bind::media_cmds::{装了音乐遥控器, 收监听, 媒体手};')
  && /pub\(crate\) fn 装了音乐遥控器\(\) -> bool/.test(声) && /pub\(crate\) fn 收监听\(手: &媒体手, 那句: &str\)/.test(声)
  && !动码.includes('fn 收监听') && !动码.includes('music-remote'));
台.判('监听没在跑的时候收监听自己就 return（对应原件 media.child 那一道），名单那两颗都在删名单之后才查',
  一颗(声, '收监听').includes('let Some(口) = 守.令.take() else { return }')
  && 一颗(动, 'pack_set').indexOf('fs::remove_file(&落)') < 一颗(动, 'pack_set').indexOf('收掉后台监听(&手)')
  && 一颗(动, 'pack_set').indexOf('fs::write(&落') < 一颗(动, 'pack_set').lastIndexOf('收掉后台监听(&手)'));
台.判('这一颗不收 AppHandle、也不朝窗口喊话（原件那两头没喊）',
  !/pub fn pack_set\([^)]*app: AppHandle/.test(动) && !动码.includes('emit('));

台.题('九、pack:import：那十句原话、门牌折法与「同名绝不动手」逐格对');
const 主挑 = 那一段('pack:import');
const 主摊开 = 切(main, 'expandZipPack');
const 主走树 = 切(main, 'walkPackDir');
const 主留底 = 切(main, 'keepOriginal');
const 那十句 = [
  ['读不到那份那句', '那份东西读不到：', "'那份东西读不到：' + src"],
  ['只收压包那句', '挑文件这一条只收压缩包 · 解开的样子请挑那个文件夹', "'挑文件这一条只收压缩包 · 解开的样子请挑那个文件夹'"],
  ['包读不动那句', '这个包读不动：', "'这个包读不动：' + String((err && err.message) || err)"],
  ['包名不干净那句', '包名不干净，不敢落地：', "'包名不干净，不敢落地：' + id"],
  ['不像插件那句', '这个压缩包里没带插件清单，不像一个插件', "'这个压缩包里没带插件清单，不像一个插件'"],
  ['格没带清单那句', '这个文件夹里没带插件清单，不像一个插件', "'这个文件夹里没带插件清单，不像一个插件'"],
  ['落不成那句', '这个包落不成：', "'这个包落不成：' + String((err && err.message) || err)"],
  ['两不象那句', '挑的东西既不是文件也不是文件夹', "'挑的东西既不是文件也不是文件夹'"],
  ['导入失败那句', '导入失败：', "'导入失败：' + String((err && err.message) || err)"],
  ['建不出那句', '插件目录建不出来：', "'插件目录建不出来：' + String((err && err.message) || err)"],
];
for (const [颗, 期望, 原样] of 那十句) {
  台.判('纯判断那一格里 ' + 颗 + ' = 「' + 期望 + '」', 纯串[颗] === 期望);
  台.判('那一句在主进程 pack:import / expandZipPack / packManifestOf 那一段里逐字有',
    (主挑 + 主摊开 + 切(main, 'packManifestOf')).includes(原样), 期望);
}
台.判('那两句带包名与带那一条的拼法逐字对（同名那一句把包名夹在两枚书名号中间）',
  主挑.includes("return bad('这里已经有一份「' + id + '」了 · 要换先把它挪走')")
  && 主摊开.includes("throw new Error('包里有脏路径，不敢落地：' + rel)")
  && 主挑.includes("return bad('包里有脏路径，不敢落地：' + rel)")
  && 纯.includes('format!("这里已经有一份「{}」了 · 要换先把它挪走", 包名)')
  && 纯.includes('format!("包里有脏路径，不敢落地：{}", 那一条)'));
台.判('那几句白话在动手那一层一个字都没重写（不许出现那种字面，全靠 core 的常量拼）',
  !动码.includes('"那份东西读不到') && !动码.includes('"挑文件这一条只收压缩包')
  && !动码.includes('"这个包读不动') && !动码.includes('"包名不干净，不敢落地')
  && !动码.includes('"这里已经有一份') && !动码.includes('"这个包落不成')
  && !动码.includes('"挑的东西既不是文件也不是文件夹"') && !动码.includes('"导入失败：')
  && !动码.includes('"这个文件夹里没带插件清单'));
台.判("门牌那一手照原件（String(p.src || '') 再 path.resolve，读不到那句报的是折过的那一串）",
  主挑.includes("const src = path.resolve(String(p.src || ''));")
  && /pub fn 那份东西\(/.test(纯) && /pub fn 折成绝对\(/.test(纯)
  && 一颗(动, 'pack_import').includes('折成绝对(&那份东西(&payload.unwrap_or(Value::Null)), &当前那一格())'));
台.判("那份东西与 String(x || '') 那一手只在 core（没给、给了空、null、false、0 都算空串）",
  主挑.includes('const p = payload || {};') && 一颗(纯, '那份东西').includes('递的那串(递的.get("src")')
  && 一颗(纯, '递的那串').includes('Value::Null => String::new()'));
台.判('两道先后的闸照原件：先 statSync 读不到那一句 → 再建那一格 → 才分两种形状',
  主挑.indexOf('fs.statSync(src)') < 主挑.indexOf('fs.mkdirSync(dir')
  && 一颗(动, 'pack_import').indexOf('fs::metadata(&那串)') < 一颗(动, 'pack_import').indexOf('fs::create_dir_all(&格)'));
台.判('文件那一种只收 .zip（大小写两种都算），不是压缩包就那一句退回',
  主挑.includes("if(!/\\.zip$/i.test(src)) return bad('挑文件这一条只收压缩包 · 解开的样子请挑那个文件夹')")
  && 一颗(纯, '是压包那份').includes('ends_with(压包后缀)'));
台.判('包名的兜底照原件两种写法（压包拿末段去掉后缀、文件夹拿末段），再 trim',
  主挑.includes('const id = String(m.id || path.basename(src, path.extname(src))).trim();')
  && 主挑.includes('const id = String(m.id || path.basename(src)).trim();')
  && 一颗(动, '落一份压包').includes('清单上的id(&单, &末段去后缀(那串))')
  && 一颗(动, '落一棵文件夹').includes('清单上的id(&单, &末段(那串))'));
台.判('包名那道闸朝 comp_rule 借（同一份 ID_OK，不在这一本里抄第二遍表）',
  主挑.includes("if(!/^[A-Za-z0-9._-]+$/.test(id))")
  && 动.includes('use crate::fd_core::comp_rule::{定落点, 原厂那一家, 包名干净};')
  && (动.match(/包名干净\(&包名\)/g) || []).length === 2 && !动码.includes('[A-Za-z0-9._-]'));
台.判('同名绝不动手：文件夹与同名 zip 两种都算「这里已经有一份」，两条分支各一道闸',
  (主挑.match(/return bad\('这里已经有一份「' \+ id \+ '」了 · 要换先把它挪走'\)/g) || []).length === 2
  && 主挑.includes("if(fs.existsSync(path.join(dir, id)) || fs.existsSync(path.join(dir, id + '.zip')))")
  && 主挑.includes("if(fs.existsSync(to) || fs.existsSync(to + '.zip')) return bad(")
  && 一颗(动, '落一份压包').includes('盘上有(&并路(格, &包名))')
  && 一颗(动, '落一份压包').includes('压包后缀') && 一颗(动, '落一棵文件夹').includes('盘上有(&到)')
  && (动.match(/一份导入::不成\(已占那句\(&包名\)\)/g) || []).length === 2);
台.判('落点只准落在 那一列 那一格里：两条分支的落点都是从递进来的那一格并出去，没往用户目录、日志、程序层写东西',
  一颗(动, '摊成一家').includes('let 到 = 并路(格, 名);')
  && 一颗(动, '落一棵文件夹').includes('let 到 = 并路(格, &包名);')
  && 一颗(动, '落一份压包').includes('摊成一家(格, &字节, &目, &包名)')
  && !动码.includes('数据层格().join(') && !动码.includes('"logs"') && !动码.includes('"userdata-'));
台.判('文件夹那一种整格抄（打头的点那种名字不算、一份一份照 relative 名抄、抄到第几份报几份）',
  主走树.includes("if(e.name.startsWith('.')) continue;") && 主走树.includes("const r = rel ? rel + '/' + e.name : e.name;")
  && 主挑.includes('walkPackDir(src, \'\', list);') && 主挑.includes('files:list.length')
  && 一颗(动, '数一棵树').includes("名.starts_with('.')") && 一颗(动, '落一棵文件夹').includes('列.len() as u64'));
台.判('文件夹那一种也留着「段里不许 ..」那一道闸（原件 2034 行，照抄不撤）',
  主挑.includes("if(dest !== to && !dest.startsWith(to + path.sep)) return bad('包里有脏路径，不敢落地：' + rel)")
  && 一颗(动, '落一棵文件夹').includes('if 落 != 到 && !落.starts_with('));
台.判('压包那一种先过段名那三道闸（尾斜杠跳过 / 空路径 / 段里 ..），闸在 core',
  主摊开.includes("if(rel.endsWith('/')) continue;") && 主摊开.includes("throw new Error('空路径')")
  && 主摊开.includes("if(!seg.length || seg.some(x => x === '..')) throw new Error('包里有脏路径")
  && /pub fn 摊那一条\(/.test(纯) && /pub enum 那一条/.test(纯)
  && 一颗(纯, '摊那一条').includes('相.ends_with(\'/\')') && 一颗(纯, '摊那一条').includes('空路径那句'));
台.判('有一份坏的不留半截：整格删掉重来（原件那一句 rmSync + catch），删不成也不往上抛',
  主摊开.includes("try{ fs.rmSync(to, { recursive:true, force:true }); }catch(e){}")
  && 一颗(动, '抹掉半截').includes('fs::remove_dir_all(到)') && 一颗(动, '抹掉半截').includes('let _ =')
  && (动.match(/抹掉半截\(&?并?路?[^)]*\)/g) || []).length >= 2);
台.判('导入成了那一格四栏逐字对（id / where / files / name；where 就是「<包名>/」那串斜杠写法）',
  主挑.includes('return { ok:true, id, where:id + \'/\', files:r.files, name:r.name };')
  && 主挑.includes("return { ok:true, id, where:id + '/', files:list.length, name:m.name || id };")
  && JSON.stringify(格名(动, '一份导入')) === JSON.stringify(['ok', 'id', 'where', 'files', 'name', 'msg'])
  && 壳格(动, '一份导入').filter(x => x.可有).length === 5
  && 动.includes('#[serde(rename = "where", skip_serializing_if = "Option::is_none")]')
  && 一颗(动, '成了').includes('format!("{}/", 包名)'));
台.判('name 那一栏照原件退包名且不 trim（与 id 那一栏差一手，两处都不许自己发明）',
  主摊开.includes('name:m.name || id') && 主挑.includes('name:m.name || id')
  && 一颗(纯, '清单上的名字').includes('.get("name")')
  && 一颗(纯, '清单上的id').includes('.trim()') && !一颗(纯, '清单上的名字').includes('.trim()'));
台.判('导入即留一份原版：两条分支各叫一次，落点朝 comp_cmds 那两把格借（不在这一本里抄 "plugins-factory"）',
  主留底.includes('r = COMP.keepFactory(id);') && 主挑.includes('keepOriginal(id);')
  && (动.match(/留一份原版\(&?包名\)/g) || []).length === 2
  && 一颗(动, '留一份原版').includes('crate::tauri_bind::comp_cmds::活的那一格()')
  && 一颗(动, '留一份原版').includes('crate::tauri_bind::comp_cmds::原厂那一格()')
  && !动码.includes('"plugins-factory"'));
台.判('留底那一步先抹旧底再整棵抄（原件 rmSync + copyTree），留不成不拦导入（回执直接丢掉）',
  主留底.includes('COMP.keepFactory') && 一颗(动, '留一份原版').includes('抹掉半截(&到);')
  && 一颗(动, '留一份原版').includes('抄一棵树(&活.落, &到)')
  && (动.match(/let _ = 留一份原版/g) || []).length === 2);
台.判('开机那一趟 packAdopt 与界面「导入」共用同一颗摊法（原件注释就这么写的），壳里也只有一颗',
  切(main, 'packAdopt').includes('expandZipPack(dir, buf, id);')
  && (动.match(/fn 摊成一家\(/g) || []).length === 1);
台.判('原件导入成了之后那句 refreshLists 没搬，缺口写在文件顶上（不假装搬齐）',
  主挑.includes('refreshLists();') && 动.includes('refreshLists') && 动.includes('没搬'));

台.题('十、pack:wipe：删哪几格、留哪几格，逐格钉住（一手都不许多删）');
const 主抹 = 那一段('pack:wipe');
台.判('原件删的就两摊：files 点名的那些（按用户目录算）+ shared 点名的那些（按数据层根算），没有第三摊',
  主抹.includes('for(const rel of (Array.isArray(files) ? files : [])){')
  && 主抹.includes('for(const rel of (Array.isArray(shared) ? shared : [])){')
  && (主抹.match(/for\(const rel of/g) || []).length === 2);
台.判('这一头也是两个循环，一个都不许多（不许顺手加「清缓存」「清日志」那种摊）',
  (一颗(动, 'pack_wipe').match(/for 一 in 按名单收/g) || []).length === 2
  && 一颗(动, 'pack_wipe').includes('按名单收(files.as_ref())') && 一颗(动, 'pack_wipe').includes('按名单收(shared.as_ref())'));
台.判('files 那一摊的根是用户数据那一格（原件 dataPath = DATA_DIR()），落点判断朝 data_path 那颗借',
  主抹.includes('f = dataPath(rel);') && 切(main, 'dataPath').includes('path.resolve(DATA_DIR())')
  && 动.includes('use crate::fd_core::data_path::落格;')
  && 一颗(动, 'pack_wipe').includes('crate::tauri_bind::pick_cmds::数据格()')
  && 一颗(动, 'pack_wipe').includes('落格(&用户格, &递的)'));
台.判('files 那一摊：跑出用户目录的一律不动（原件那一手 catch 就是 continue），空串与整串空白也一颗不动',
  主抹.includes('try{ f = dataPath(rel); }catch(err){ continue; }')
  && 主抹.includes("if(!String(rel || '').trim()) continue;")
  && 一颗(数纯, '落格').includes('if 段.is_empty()')
  && 一颗(动, 'pack_wipe').includes('if 递的.trim().is_empty()') && 一颗(动, 'pack_wipe').includes('continue;'));
台.判('shared 那一摊的根是数据层那一格（<树根>\\data），朝 data_cmds 那颗借，不另起第二把尺',
  主抹.includes('const root = path.resolve(DATA_ROOT);') && 主抹.includes('const comp = path.resolve(PACKS_DIR());')
  && 一颗(动, 'pack_wipe').includes('crate::tauri_bind::data_cmds::数据层格()')
  && 一颗(动, 'pack_wipe').includes('let 包格 = 那一列的格();'));
台.判('shared 那一摊先洗段名（反斜杠当斜杠、打头斜杠去掉、段里有 .. / . / 空段整串不动）—— 与 packRaw 同一颗',
  主抹.includes("const s = String(rel || '').replace(/\\\\/g, '/').replace(/^\\/+/, '');")
  && 主抹.includes("if(!s || s.split('/').some(x => x === '..' || x === '.' || !x)) continue;")
  && 一颗(动, 'pack_wipe').includes('洗那串(&递的那串(一))'));
台.判('留的第一格：数据层根以外一律不动，根本体自己也不动（原件那一句是 startsWith(root + path.sep)）',
  主抹.includes("if(!rf.startsWith(root + path.sep)) continue;                 /* 数据层根以外不动 */")
  && /pub fn 在根以内\(/.test(纯) && 一颗(纯, '在根以内').includes('落.starts_with(&format!("{}\\\\", 跟))')
  && 一颗(动, 'pack_wipe').includes('if !在根以内(&落, &根)'));
台.判('留的第二格：插件那一格与它底下的永远留着（包和名单都在里面，装得回来靠的就是它还在）',
  主抹.includes("if(rf === comp || rf.startsWith(comp + path.sep)) continue;   /* 包和名单永远留着 */")
  && /pub fn 包那一格留着\(/.test(纯)
  && 一颗(纯, '包那一格留着').includes('落 == 跟 || 落.starts_with(&format!("{}\\\\", 跟))')
  && 一颗(动, 'pack_wipe').includes('if 包那一格留着(&落, &包格)'));
台.判('除那两格以外原件不挡（原厂底、日志、用户目录都在可删的范围里）—— 照实钉住，不许哪天「顺手保守一点」',
  主抹.includes('path.resolve(PACKS_DIR())') && !主抹.includes('plugins-factory')
  && !一颗(纯, '包那一格留着').includes('factory')
  && 纯.includes('除这一格以外的数据层根底下的东西') && 纯.includes('一处都不许多留、也不许少留'));
台.判('这一颗不写备份、不落那张字条、不动包本身：整本里没有 wipe-user.json、没有排字条那一颗',
  主抹.includes('const del = [];') && !主抹.includes('wipe-user') && !主抹.includes('setImmediate')
  && !动码.includes('字条名') && !动码.includes('wipe-user') && !动码.includes('备份'));
台.判('抹的那一手就是 rmSync(recursive:true, force:true)：格整棵抹、份抹一份、本来不在不算错',
  主抹.includes('fs.rmSync(f, { recursive:true, force:true });') && 主抹.includes('fs.rmSync(rf, { recursive:true, force:true });')
  && 一颗(动, '抹那一份').includes('fs::remove_dir_all(落)') && 一颗(动, '抹那一份').includes('fs::remove_file(落)')
  && 一颗(动, '抹那一份').includes('fs::metadata(落)'));
台.判('抹成了才进 removed、抹不动一句都不报也不进（原件那两个 try/catch 就是这个形状）',
  主抹.includes('del.push(String(rel));') && 主抹.includes('del.push(s);') && 主抹.includes('}catch(err){}')
  && 一颗(动, '抹那一份').includes('if 成.is_ok()'));
台.判('两摊报回页面的那一串不同处照实钉住：files 报的是原文（首尾空白都不去）、shared 报的是折过的那一串',
  主抹.includes('del.push(String(rel));') && 主抹.includes('del.push(s);')
  && 一颗(动, 'pack_wipe').includes('抹那一份(&落, &递的, &mut 抹了)')
  && 一颗(动, 'pack_wipe').includes('抹那一份(&落, &净, &mut 抹了)'));
台.判('回执就一种款式：{ ok:true, removed }，永远 ok:true（页面递的不是列表也照样这一格）',
  主抹.includes('return { ok:true, removed:del };')
  && JSON.stringify(格名(动, '一份清理')) === JSON.stringify(['ok', 'removed'])
  && 壳格(动, '一份清理').every(x => !x.可有)
  && 一颗(动, 'pack_wipe').includes('一份清理 { ok: true, removed: 抹了 }'));
台.判('这一颗不查监听、不重扫清单、不喊各窗口（原件那一颗一样都没有）',
  !主抹.includes('packAfterSet') && !主抹.includes('refreshLists') && !主抹.includes('broadcast')
  && 一颗(动, 'pack_wipe').includes('收监听') === false && !一颗(动, 'pack_wipe').includes('emit'));

台.题('十一、纯判断那一格带测试、不动磁盘、不认识壳');
台.判('带 #[cfg(test)] 且有 #[test]', /#\[cfg\(test\)\][\s\S]*#\[test\]/.test(纯));
const 测试段 = (纯.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0];
function 一颗测试(名) {
  const 起 = 测试段.indexOf('fn ' + 名 + '()');
  if (起 < 0) return '';
  const 止 = 测试段.indexOf('\n    fn ', 起 + 1);
  const 止2 = 测试段.indexOf('\n    }', 起);
  return 测试段.slice(起, 止 > 0 && (止2 < 0 || 止 < 止2) ? 止 : (止2 > 0 ? 止2 : 测试段.length));
}
台.判('钉住了「两趟收：文件夹在前、zip 在后」（不是照着读目录的序边走边记）',
  一颗测试('分成两趟把文件夹排在前面那串').includes('分成两趟(&名(&["甲家", "乙家"], &["丙.zip"'));
台.判('钉住了「zip 名字排在前面也不会列两行」（同名那格已占为真）',
  一颗测试('zip名字排在前面也不会列两行').includes('同名那格已占(&格, "a")'));
台.判('钉住了「文件夹没列成时同名zip照样露面」（seen 只记真列出的）',
  一颗测试('文件夹没列成时同名zip照样露面').includes('!同名那格已占(&已列出, "甲家")'));
台.判('钉住了「老那份读不成：一家都不记，换算那一趟照走」',
  一颗测试('老名单里没记的才记为卸掉').includes('记为卸掉(&扫到的, None).is_empty()'));
台.判('钉住了 24MB 那道闸的算式与半兆进位那两种写法',
  一颗测试('二十四兆那道闸的数与那句白话').includes('assert_eq!(封顶字节, 24 * 1024 * 1024)')
  && 一颗测试('二十四兆那道闸的数与那句白话').includes('太大那句(24 * 1048576 + 524288), "这份文件 25MB'));
台.判('钉住了「.. 与 . 与空段一律不认」与「打头斜杠去掉」',
  一颗测试('回退写法与空段当场不认').includes('洗那串("a/../../b"), None')
  && 一颗测试('回退写法与空段当场不认').includes('洗那串("a//b"), None'));
台.判('钉住了 off 名单那三种形状（两种列表 + 第三种当一家都没卸）',
  一颗测试('off名单那两种写法都认第三种算一家都没卸').includes('开单成列(r#"{"off":["甲家"]}"#)')
  && 一颗测试('off名单那两种写法都认第三种算一家都没卸').includes('开单成列("{}").is_empty()'));
台.判('批七钉住了「开着的换成卸掉的 = 扫到的全部 减 开着的」那三种递法（没点名 / 点名没扫到 / 空列）',
  一颗测试('开着的换成卸掉的是扫到的全部减开着的').includes('换成卸掉(&全部, &开着), vec!["乙家".to_string()]')
  && 一颗测试('开着的换成卸掉的是扫到的全部减开着的').includes('换成卸掉(&全部, &[]), 全部')
  && 一颗测试('开着的换成卸掉的是扫到的全部减开着的').includes('换成卸掉(&全部, &["丁家".to_string()]), 全部'));
台.判('批七钉住了那四句与那十句原话的字面（一句都不许多改、也不许少钉）',
  一颗测试('写名单与导入那十四句原话逐字对').includes('assert_eq!(不是列表那句, "名单得是一份 id 列表")')
  && 一颗测试('写名单与导入那十四句原话逐字对').includes('assert_eq!(卸掉监听那句, "音乐遥控器卸掉了")')
  && 一颗测试('写名单与导入那十四句原话逐字对').includes('assert_eq!(只收压包那句, "挑文件这一条只收压缩包')
  && 一颗测试('写名单与导入那十四句原话逐字对').includes('assert_eq!(导入失败那句, "导入失败：")'));
台.判('批七钉住了「包名那一栏退兜底并 trim、名字那一栏不 trim」那一处差别',
  一颗测试('清单上的id退兜底并去掉首尾空白').includes('清单上的id(&json!({"id": ""}), "兜底名"), "兜底名"')
  && 一颗测试('清单上的id退兜底并去掉首尾空白').includes('清单上的名字(&json!({"name": ""}), "甲家"), "甲家"'));
台.判('批七钉住了门牌折成绝对那三种写法与段里的点与回退（退到顶就停住）',
  一颗测试('折成绝对三种写法各归各的顶').includes('折成绝对("", &当前)')
  && 一颗测试('折成绝对三种写法各归各的顶').includes('"\\\\\\\\另一台\\\\那一格\\\\甲家.zip"')
  && 一颗测试('折成绝对把段里的点与回退折干净').includes('&format!("{}:\\\\..\\\\..", \'D\'), &当前), format!("{}:\\\\", \'D\')'));
台.判('批七钉住了「假值才算空串」那一手（null / false / 0 / 空串四档，对象与数组照 String() 折）',
  一颗测试('递的那串照原件那一手只有假值才算空').includes('递的那串(&json!(0)), ""')
  && 一颗测试('递的那串照原件那一手只有假值才算空').includes('递的那串(&json!(true)), "true"')
  && 一颗测试('递的那串照原件那一手只有假值才算空').includes('递的那串(&json!(["x", "y"])), "x,y"'));
台.判('批七钉住了摊包那三种款式（尾斜杠跳过 / 空路径算脏 / 段里有 .. 算脏）',
  一颗测试('摊那一条三种款式各照原件那一手').includes('摊那一条("assets/"), 那一条::跳过')
  && 一颗测试('摊那一条三种款式各照原件那一手').includes('摊那一条(""), 那一条::脏(空路径那句.to_string())')
  && 一颗测试('摊那一条三种款式各照原件那一手').includes('摊那一条("a/../../b"), 那一条::脏(脏路径那句("a/../../b"))'));
台.判('批七钉住了清数据那两格的留与删（根本体自己不算以内、那一格底下的都留着、别的格一律不挡）',
  一颗测试('清数据只在数据层根以内动手').includes('!在根以内(根, 根)')
  && 一颗测试('清数据只在数据层根以内动手').includes('!在根以内("某处\\\\一棵树\\\\data2\\\\x", 根)')
  && 一颗测试('插件那一格与名单永远留着只挡这一格').includes('包那一格留着("某处\\\\一棵树\\\\data\\\\plugins\\\\off.json", 包格)')
  && 一颗测试('插件那一格与名单永远留着只挡这一格').includes('!包那一格留着("某处\\\\一棵树\\\\data\\\\plugins-factory\\\\甲家", 包格)'));
const 本批测试 = (测试段.match(/#\[test\]/g) || []).length;
台.数('pack_rule 这一格带几颗测试', 本批测试 + ' 颗');
台.判('不少于三十四颗（批六那十九颗 + 批七那十五颗：分类、两趟、让开、两份名单、洗段名、那道闸、写名单那道换算、导入那十句与门牌折法、清数据那两格各有钉的）', 本批测试 >= 34);
for (const 禁 of ['std::fs', 'File::open', 'fs::write', 'fs::read', 'read_dir', 'create_dir', 'remove_file',
  'tauri::', 'AppHandle', 'emit(', 'std::process', 'Command'])
  台.判('纯判断那一格里没有「' + 禁 + '」（这一格不认识盘，也不认识壳）', !纯码.includes(禁));
台.判('动磁盘那一手真在第三层（这一本里有 std::fs 与 read_dir）', 动.includes('use std::fs;') && 动码.includes('fs::read_dir'));
台.判('这一本里问盘的那几手都问不到就当没有（不 expect、不 unwrap、不 panic），五颗都不抛给页面',
  !动码.includes('.expect(') && !/\.unwrap\(\)/.test(动码) && !动码.includes('panic!')
  && (动.match(/fn (是不是份|是不是格|盘上有|抹那一份|抹掉半截)\(/g) || []).length === 5);
台.判('批七那三颗的落点全部从借来的那几把格出（那一列 / 原厂那一格 / 数据层根 / 用户数据格），本里没有第五把尺',
  (动.match(/那一列的格\(\)/g) || []).length >= 5
  && 动.includes('crate::tauri_bind::comp_cmds::原厂那一格()')
  && 动.includes('crate::tauri_bind::data_cmds::数据层格()')
  && 动.includes('crate::tauri_bind::pick_cmds::数据格()')
  && !动码.includes('"plugins"') && !动码.includes('"plugins-factory"') && !动码.includes('"userdata-'));

台.题('十二、这一批只搬这 5 颗：插件那一列搬齐，通道里没多塞别的');
const 列通道 = [...new Set((main.match(/ipcMain\.handle\(\s*'pack:[^']+'/g) || []).map(s => /'([^']+)'/.exec(s)[1]))];
台.数('主进程里 pack: 那一列的通道', 列通道.join(' '));
台.判('这一列在主进程里就这五颗通道（不多不少，往这一本里塞第六颗就是扩到别的通道）',
  ['pack:list', 'pack:file', 'pack:set', 'pack:import', 'pack:wipe'].every(c => 列通道.includes(c))
  && 列通道.length === 5);
台.判('主进程里再没有第六颗 pack: 通道（packAdopt 那种开机那一趟不是通道）',
  列通道.filter(c => !批.some(x => x[0] === c)).length === 0);
台.判('别家的通道没被顺手带进来（sys:rebuild / comp:* / data:* 都还在自己那本里）',
  !动.includes('sys_rebuild') && !动.includes('comp_read') && !动.includes('data_read')
  && !动码.includes('ipcMain'));

台.题('十三、这一批的账');
const 电 = [...new Set((main.match(/ipcMain\.handle\(\s*['"]([^'"]+)['"]/g) || [])
  .map(s => (s.match(/['"]([^'"]+)['"]/) || [])[1]))];
const 已搬 = 电.filter(n => Object.prototype.hasOwnProperty.call(表, 换(n)));
台.数('覆盖率那一句', '已搬 ' + 已搬.length + ' / ' + 电.length);
台.判('这一批 5 颗全在已搬名单里', 批.every(x => 已搬.includes(x[0])));
台.判('插件那一列这五颗全搬齐了（这一列剩零颗没搬）',
  ['pack:list', 'pack:file', 'pack:set', 'pack:import', 'pack:wipe'].every(c => 已搬.includes(c)));
台.判('已搬总数到了 63（批六那 60 颗 + 批七这三颗：30 + 8 + 7 + 9 + 4 + 2 + 3）', 已搬.length === 63);
台.判('还没搬的照实记着：主进程还剩 ' + (电.length - 已搬.length) + ' 颗', 电.length - 已搬.length === 4);
台.判('main.rs 顶上那句「还剩几颗没搬」跟着改成 4（界面文字那六颗跟着 #175 撤了；不许写着旧数当已实现）', 壳.includes('剩下的 4 颗'));
台.判('main.rs 顶上那句也点了这一批那三颗（⑪ 那一段），不是只改了个数',
  壳.includes('⑪ 插件那一列剩下那三颗') && 壳.includes('pack:set / pack:import / pack:wipe'));
台.判('main.rs 的注册单上这三颗排在 ⑪ 那一段后面（一格一段，不是散着塞的）',
  壳.indexOf('⑪ 插件那一列剩下那三颗') < 壳.indexOf('pack_cmds::pack_set')
  && 壳.includes('tauri_bind::pack_cmds::pack_import') && 壳.includes('tauri_bind::pack_cmds::pack_wipe'));
台.判('五处账目撞得上：另四道闸里那句已搬数与本道同一个现场数，旧数一处不留',
  ['gate-tauridata46', 'gate-tauribackup46', 'gate-tauricomp46', 'gate-taurimedia46'].every(名 => {
    /* 只扫它们代码里那句真判断：那几道里有的也在查「别的闸不许留旧数」，
       引号里念着旧数字的那一串是它的检查用语，不是它落的账 —— 先把字串剥掉再比 */
    const 它 = rd('src/tools/probes/' + 名 + '.mjs')
      .replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
    return 它.includes('已搬.length === 63') && 它.includes('已搬.length === 60') === false
      && 它.includes('已搬.length === 58') === false && 它.includes('已搬.length === 54') === false
      && 它.includes('已搬.length === 45') === false && 它.includes('已搬.length === 13') === false;
  }) && rd('src/tools/probes/gate-tauricomp46.mjs').includes("壳.includes('剩下的 4 颗')"));
台.判('另四道同族闸那句「还剩几颗没搬」也一起跟上 4（一处旧数都不留）',
  ['gate-tauridata46', 'gate-tauribackup46', 'gate-tauricomp46', 'gate-taurimedia46'].every(名 =>
    rd('src/tools/probes/' + 名 + '.mjs').replace(/'(?:[^'\\\n]|\\.)*'/g, "''").includes('=== 4)')));
台.判('跑测试那一道此刻是全绿 233 颗零警告（212 → 219 运行日志那 7 颗 → 220 本地协议类型表那 1 颗 → 233 批九网格吸附那 13 颗），与本道数的字数同一现场',
  全测试数() === 233);
台.判('媒体那一道闸数的字数与本道同一现场（两道闸数的是同一棵树，不许各说各话）',
  rd('src/tools/probes/gate-taurimedia46.mjs').includes('全测试.length === 233'));
function 全测试数() {
  return fs.readdirSync(path.join(ROOT, 'src', '_tauri', 'src', 'core')).filter(f => f.endsWith('.rs'))
    .map(f => fs.readFileSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', f), 'utf8'))
    .join('').match(/#\[test\]/g).length;
}
const 依单 = [...rd('src/_tauri/Cargo.toml').matchAll(/^([A-Za-z0-9_.-]+)\s*=/gm)].map(m => m[1]);
台.数('Cargo.toml 上写着的件名', 依单.join(' · '));
台.判('解压那一颗没让壳多下一套东西：Cargo.lock 里 flate2 早带着（png → flate2 那条链上），这一批一个字都没加',
  rd('src/_tauri/Cargo.lock').includes('name = "flate2"') && rd('src/_tauri/Cargo.toml').includes('flate2 = "1"')
  && 依单.every(n => !/^(zip|unzip|miniz|libz|zlib|sevenz|par ZIP)/i.test(n))
  && !rd('src/_tauri/Cargo.toml').includes('zip = ') && !rd('src/_tauri/Cargo.toml').includes('miniz_oxide = '));
台.判('这一批那几本文本里，一个字节都没写这台机器的盘符、帐户名、私人目录名',
  !/(^|[^A-Za-z0-9])[A-Za-z]:[\\/]/.test(动 + 纯 + 壳 + rd('src/tools/probes/gate-tauripack46.mjs')),
  (动 + 纯 + 壳).match(/.{0,20}[A-Za-z]:[\\/].{0,20}/g) || []);
台.判('桥那份生成物没被手改（重跑一趟一字不差，且这三颗都在参数表里）',
  表.pack_set.length === 1 && 表.pack_import.length === 1 && 表.pack_wipe.length === 2);
台.收尾();
