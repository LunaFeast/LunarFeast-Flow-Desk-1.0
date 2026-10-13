/* ============================================================
   gate-tauricomp46.mjs · 外46 三 批三：「改组件代码」那一摊七颗搬进壳
   ------------------------------------------------------------
     node src/tools/probes/gate-tauricomp46.mjs
   钉的是这么几件事，一条都不许放宽：
     一、这一批 7 颗（comp:read / list / write / delete / restore / factory 加 code:catRename）
        每一颗在壳里都有对应的一颗命令，而且都上了 main.rs 的注册单 —— 没上单等于不存在；
     二、桥里这 7 颗不再是「这颗通道还没搬进壳」：参表里有名、栏名与顺序对得上桥里递的实参个数，
        参数名里一个下划线都没有；
     三、「哪一家允许读 / 改 / 删哪几份」那把尺（原件 src\pack\comp-files.cjs）整个住在纯判断那一格：
        包名白名单、可改后缀那张表、8MB 那道顶、排前那三份、那十几句拒回来的原话 ——
        字面值两头逐条对，动手那一层一个字都没重写（重写就是第二份真身，迟早漂移）；
     四、越界那道判断带测试，且钉住这五条硬样本：本家那几份放行、.. 拒、绝对路径拒、空串拒、改到别人家那一格拒；
     五、comp:restore 与 comp:factory 取的是原厂那一格（<树根>\data\plugins-factory），
        不是活的那一格 —— 从前那句旧话写的是 resources\app\data\plugins（外43 就搬走了），闸认代码不认旧话；
     六、comp:write 被挡时回的形状与 Electron 那颗一致：只有 ok + msg 那两格，一句都不许多；
        成了那一支只有 ok + size；
     七、code:catRename 那三种写法、两张后缀表与两个深度、回执那七栏，两头同一份；
     八、纯判断新增那两格（comp_rule / cat_rename）不动磁盘、不认识壳，测试真在跑。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { rd, 记账, 切, ROOT, 对名单, 壳注册单 } from './lib-slice.mjs';

const 台 = 记账('gate-tauricomp46');
const 尺 = rd('src/pack/comp-files.cjs');          /* 那把共用的尺的原件 */
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 壳 = rd('src/_tauri/src/main.rs');
const 动 = rd('src/_tauri/src/tauri_bind/comp_cmds.rs');
const 改 = rd('src/_tauri/src/tauri_bind/code_cmds.rs');
const 纯 = rd('src/_tauri/src/core/comp_rule.rs');
const 名 = rd('src/_tauri/src/core/cat_rename.rs');
const 那两格 = 纯 + '\n' + 名;
const 那两层 = 动 + '\n' + 改;

/* 名字换算与桥里那一颗同一式子：冒号变下划线、驼峰变下划线小写 */
const 换 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
/* 每一颗：通道名、壳里的命令名、落在哪一本、页面上该递几栏（栏名照声明顺序） */
const 批 = [
  ['comp:read', 'comp_read', 'comp_cmds', ['id', 'rel']],
  ['comp:list', 'comp_list', 'comp_cmds', ['id']],
  ['comp:write', 'comp_write', 'comp_cmds', ['id', 'rel', 'text']],
  ['comp:delete', 'comp_delete', 'comp_cmds', ['id']],
  ['comp:restore', 'comp_restore', 'comp_cmds', ['id', 'rel']],
  ['comp:factory', 'comp_factory', 'comp_cmds', ['id']],
  ['code:catRename', 'code_cat_rename', 'code_cmds', ['from', 'to']],
];
const 那本 = 名 => (名 === 'comp_cmds' ? 动 : 改);

/* comp-files.cjs 里那一个方法：方法都是缩进四格的对象成员，切() 那颗只认顶格声明 */
function 那一颗(方法名) {
  const 起 = 尺.indexOf('\n    ' + 方法名 + '(');
  if (起 < 0) throw new Error('那把尺里找不到这一颗方法：' + 方法名);
  const 止 = 尺.indexOf('\n    }', 起);
  if (止 < 0) throw new Error(方法名 + ' 那一颗没收尾');
  return 尺.slice(起, 止 + 6);
}
/* 桥的参表（生成物里那一份）；拿不到就当这一批根本没进桥 */
const 表文 = (桥.match(/const 参表 = (\{[\s\S]*?\});/) || [])[1] || '{}';
const 表 = JSON.parse(表文);
/* 页面那一头实参有几栏：从桥里 invoke('<通道>' 后面那段按括号层数数一遍顶层逗号 */
function 递了几栏(通道) {
  const 键 = "invoke('" + 通道 + "'";
  const 次 = 桥.split(键).length - 1;
  if (次 !== 1) throw new Error('桥的调用点不是唯一的一处：' + 通道 + '（找到 ' + 次 + ' 处）');
  let k = 桥.indexOf(键) + 键.length, 深 = 0, 出 = '';
  while (k < 桥.length) {
    const c = 桥[k];
    if (c === '(' || c === '[' || c === '{') 深++;
    else if (c === ')' || c === ']' || c === '}') { if (深 === 0) break; 深--; }
    else if (c === '"' || c === "'") { k++; while (k < 桥.length && 桥[k] !== c) k++; }
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
/* 从一段对象字面量里按「名字:」取键名（中文键也要取到） */
const 取键 = 串 => [...new Set([...串.matchAll(/([A-Za-z_\u4e00-\u9fff][A-Za-z0-9_\u4e00-\u9fff]*)\s*:/g)].map(m => m[1]))];
/* 从一颗 Rust struct 里取字段名（带 #[serde] 那几行跳过；字段名是中文的，\w 不够用） */
function 壳字段(源, 名) {
  const 块 = (源.match(new RegExp('(?:pub )?struct ' + 名 + ' \\{[\\s\\S]*?\\n\\}')) || [''])[0];
  return [...new Set([...块.matchAll(/^\s{4}([A-Za-z0-9_\u4e00-\u9fff]+)\s*:/gm)].map(m => m[1]))];
}
/* 纯判断那一格里 pub const X: T = "..."; 那一批字面值 */
function Rust串(源) {
  const 出 = {};
  for (const m of 源.matchAll(/pub const ([A-Za-z0-9_\u4e00-\u9fff]+): &str = "([^"]*)";/g)) 出[m[1]] = m[2];
  return 出;
}
/* 剥掉注释只看代码本身（那两层里有一句注释提到闸自己的文件名，含 .mjs 那三个字母 —— 判的是代码不是话） */
function 去注(源) {
  let s = String(源);
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/^\s*\/\/.*$/gm, ' ');
  return s;
}
const 动码 = 去注(动), 改码 = 去注(改), 那两层码 = 动码 + '\n' + 改码;
/* 一个算术式（只认数、空格、加号与乘号），两头都用它把 8 * 1024 * 1024 那种写法算成数 */
function 算式(串) {
  const 净 = String(串).replace(/_/g, '').trim();
  if (!/^[\d\s*+]+$/.test(净)) throw new Error('这个式子不敢算：' + 串);
  return Function('"use strict";return (' + 净 + ')')();
}

台.题('一、这一批 7 颗：页面请的每一颗，壳里都有一座，且都上了注册单');
台.数('这一批点名的通道', 批.length + ' 颗 · ' + 批.map(x => x[0]).join(' '));
台.判('点的就是 7 颗，不多不少', 批.length === 7);
for (const [通道, 名, 本] of 批) {
  台.判(通道 + ' 的通道名换算过去就是 ' + 名, 换(通道) === 名);
  台.判(通道 + ' 在壳里有对应的一颗（' + 本 + '.rs 里有 pub fn ' + 名 + '）',
    new RegExp('pub (?:async )?fn ' + 名 + '\\s*\\(').test(那本(本)));
  台.判(通道 + ' → ' + 名 + ' 在 main.rs 的注册单上', 壳.includes(本 + '::' + 名));
}
台.数('这两本各有几颗命令标记', [动, 改].map(s => (s.match(/#\[[^\]]*tauri::command/g) || []).length).join(' + '));
台.判('两本合起来正好 7 颗（多一颗就是往这两本里塞了没点名的通道）',
  ([动, 改].reduce((a, s) => a + (s.match(/#\[[^\]]*tauri::command/g) || []).length, 0)) === 7);
const 声明 = rd('src/_tauri/src/tauri_bind/mod.rs');
for (const 本 of ['comp_cmds', 'code_cmds'])
  台.判('模块声明在这本上（tauri_bind/mod.rs 认 ' + 本 + '）', new RegExp('pub mod ' + 本 + ';').test(声明));
const 判声明 = rd('src/_tauri/src/core/mod.rs');
for (const 本 of ['comp_rule', 'cat_rename'])
  台.判('纯判断那一格认 ' + 本, new RegExp('pub mod ' + 本 + ';').test(判声明));

台.题('二、桥里这 7 颗不再是「还没搬」');
for (const [通道, 名, 本, 栏] of 批) {
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
台.数('这一批命令的页面栏名', [...new Set(栏名们)].join(' '));
台.判('参数名里一个下划线都没有（Tauri 那头按驼峰认名）', 栏名们.every(n => !n.includes('_')));
台.判('参数名没有拿 app / 手 / 窗口 / 状态 / 事件 打头的（那种会被当成不是给页面的）',
  栏名们.every(n => !/^(app|手|窗口|状态|事件)/.test(n)));
台.判('这一批七颗都不收 AppHandle（这一摊的七颗都不朝窗口喊话，刷新名单是页面自己那一手）',
  ![动, 改].some(s => /app: AppHandle/.test(s)));
台.判('read 与 restore 那两颗收的是可空的 rel（桥里递的是 rel === undefined ? null : String(rel)）',
  /pub fn comp_read\(id: String, rel: Option<String>\)/.test(动)
  && /pub fn comp_restore\(id: String, rel: Option<String>\)/.test(动)
  && 桥.includes("invoke('comp:read', String(id || ''), rel === undefined ? null : String(rel))"));
台.判('write 那一颗三栏全收字串（桥里把 rel 与 text 都拼成了字串，空的那两栏也是字串）',
  /pub fn comp_write\(id: String, rel: String, text: String\)/.test(动));

台.题('三、那把尺整个住在纯判断那一格，字面值两头逐条对（动手那一层一个字都没重写）');
const 纯串 = Rust串(纯);
const 那十几句 = [
  ['包名不干净那句', '包名不干净，不敢动手：'],
  ['目录没定那句', '插件目录还没定下来'],
  ['路径不干净那句', '路径不干净，不敢动手：'],
  ['跑出那句', '路径跑出了这一格：'],
  ['没这份那句', '这一格里没有这份文件'],
  ['没说要写那句', '得说要写这一格里的哪份文件'],
  ['本来不在那句', '这一格本来就不在'],
  ['读不到那句', '读不到：'],
  ['读不出文本那句', '读不出文本：'],
  ['写不进去那句', '写不进去：'],
  ['列不出来那句', '列不出来：'],
  ['删不掉那句', '删不掉：'],
  ['拷不回来那句', '拷不回来：'],
  ['入口那份', 'main.js'],
];
for (const [颗, 期望] of 那十几句) {
  台.判('纯判断那一格里 ' + 颗 + ' = 「' + 期望 + '」', 纯串[颗] === 期望);
  台.判('那一句在主进程那把尺里逐字有（不是壳自己新造的话）', 尺.includes("'" + 期望 + "'") || 尺.includes(期望));
}
台.判('恢复出厂取不到底那一句两头同字（带包名的那一句：全角括号与那个中点都算）',
  尺.includes("原版那一格里没有这一家（' + L.id + '）的这一份 · 导入那一下才会留底，留了底才恢复得了'")
  && 纯.includes('原版那一格里没有这一家（{}）的这一份 · 导入那一下才会留底，留了底才恢复得了'));
/* 后缀那张表 */
const JS后缀 = [...切(尺, 'TEXT_EXT').matchAll(/'(\.[^']+)'/g)].map(m => m[1]);
const Rust后缀m = 纯.match(/pub const 可改后缀: \[&str; (\d+)\] = \[([\s\S]*?)\];/);
const Rust后缀 = Rust后缀m ? [...Rust后缀m[2].matchAll(/"([^"]+)"/g)].map(m => m[1]) : [];
台.数('那张后缀表两头各有几项', JS后缀.length + ' / ' + Rust后缀.length);
台.判('可改后缀那十种一种不落一种不许多、顺序也照原件', JSON.stringify(Rust后缀) === JSON.stringify(JS后缀));
台.判('后缀那张表在纯判断那一格里（动手那一层没有第二份：那两层代码里搜不到 .mjs 那种字面）',
  !那两层码.includes('.mjs') && !那两层码.includes('"yaml"'));
/* 上限 */
const JS上限 = 算式((切(尺, 'MAX_BYTES').match(/=\s*([^;]+);/) || [])[1]);
const Rust上限 = 算式((纯.match(/pub const 上限字节: u64 = ([^;]+);/) || [])[1]);
台.数('那道顶两头各是多少', JS上限 + ' / ' + Rust上限);
台.判('8MB 那道顶两头同一个数，且只在纯判断那一格里写着', JS上限 === Rust上限 && !那两层.includes('1024 * 1024'));
/* 包名白名单 */
const ID式 = 切(尺, 'ID_OK');
台.判('那把尺的 ID_OK 还是那一式（字母数字点横线下划线）', ID式.trim() === 'const ID_OK = /^[A-Za-z0-9._-]+$/;');
台.判('壳里那颗 包名干净 认的就是这一串字符（is_ascii_alphanumeric 加那三枚）',
  /c\.is_ascii_alphanumeric\(\) \|\| c == '\.' \|\| c == '_' \|\| c == '-'/.test(纯));
台.判('原件 ID_OK 认整串是 .. 的那种包名（这一手会折到上一格），壳里当场不认 —— 两处都钉住，别哪天默默改齐了',
  (() => { const 式 = ID式.match(/=\s*\/([\s\S]*)\/;/)[1]; return new RegExp(式).test('..') === true && new RegExp(式).test('a/b') === false; })()
  && 纯.includes('名 != "." && 名 != ".."'));
/* 排前那三份 */
const JS头 = [...那一颗('list').matchAll(/const head = \[([^\]]+)\]/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
const Rust头m = 纯.match(/pub const 排前那三份: \[&str; (\d+)\] = \[([^\]]+)\];/);
const Rust头 = Rust头m ? [...Rust头m[2].matchAll(/"([^"]+)"/g)].map(m => m[1]) : [];
台.数('排前那三份两头各是什么', JS头.join(' ') + ' | ' + Rust头.join(' '));
台.判('入口那份排最前、插件清单跟着、配方再跟着，两头同一串同一序', JSON.stringify(Rust头) === JSON.stringify(JS头));
/* 动手那一层只叫判断，不自己判 */
台.判('越界那道闸（定落点）在动手那一层被叫到五处（读 / 列 / 写 / 删 / 恢复各一处）',
  (动.match(/定落点\(&活的那一格\(\)/g) || []).length === 5);
台.判('出厂那一格那道闸（出厂落点 / 原厂那一家）也在纯判断那一格里，动手层只叫它',
  /pub fn 出厂落点\(/.test(纯) && /pub fn 原厂那一家\(/.test(纯)
  && 动.includes('出厂落点(&原厂') && 动.includes('原厂那一家(&原厂'));
台.判('动手那两层里没重写那几句拒话（一句都不许多，全靠 core 的常量）',
  !那两层.includes('不敢动手') && !那两层.includes('跑出了这一格') && !那两层.includes('太大不走这条路'));
台.判('动手那两层里没自己写包名白名单与后缀表（正则字符类与 .mjs 那种都不许有）',
  !那两层.includes('A-Za-z0-9._-') && !那两层.includes('is_ascii_alphanumeric'));

台.题('四、越界那道判断带测试：五条硬样本一条不落');
const 测试段 = (纯.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0];
function 一颗测试(名) {
  const 起 = 测试段.indexOf('fn ' + 名 + '()');
  if (起 < 0) return '';
  const 止 = 测试段.indexOf('\n    fn ', 起 + 1);
  const 止2 = 测试段.indexOf('\n    }', 起);
  return 测试段.slice(起, 止 > 0 && (止2 < 0 || 止 < 止2) ? 止 : (止2 > 0 ? 止2 : 测试段.length));
}
台.判('带 #[cfg(test)] 且有 #[test]', /#\[cfg\(test\)\][\s\S]*#\[test\]/.test(纯));
台.判('钉住了「本家那几份放行」（本家那一格里的入口那份算得出落点）',
  一颗测试('本家那几份放行').includes('定落点(活格, "demo-scene", Some("main.js"))')
  && 一颗测试('本家那几份放行').includes('Ok(一个落点'));
台.判('钉住了「.. 回退写法拒」（拆不出段 + 回的是那句原话）',
  一颗测试('回退写法一律拒').includes('拆段(脏).is_none()') && 一颗测试('回退写法一律拒').includes('路径不干净那句'));
台.判('钉住了「绝对路径拒」（盘符 / 冒号 / UNC / 斜杠打头当场拒，连出厂那一格都领不到）',
  一颗测试('绝对写法当场拒').includes('拆段(脏).is_none()')
  && 一颗测试('绝对写法当场拒').includes('出厂落点(原厂格') && 一颗测试('绝对写法当场拒').includes('is_none()'));
台.判('钉住了「空串拒」（空串拆不出段；写那一颗不认空 rel；读与恢复各按入口那份）',
  一颗测试('空串与只剩空白拆不出段').includes('拆段("")') && 一颗测试('空串与只剩空白拆不出段').includes('None')
  && 一颗测试('写这一颗不认空rel读与恢复按入口那份').includes('!写认这份("")'));
台.判('钉住了「改到别人家那一格拒」（借 .. 爬过去、点名别家、包名整串是 . 或 ..）',
  一颗测试('改到别人家那一格拒').includes('"../别的家/main.js"')
  && 一颗测试('改到别人家那一格拒').includes('定落点(活格, ".."') && 一颗测试('改到别人家那一格拒').includes('包名不干净那句'));
台.判('纯判断那两格各带一颗 mod 验判断', (那两格.match(/mod 验判断/g) || []).length === 2);
const 新增测试 = [纯, 名].reduce((a, s) => a + ((s.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0].match(/#\[test\]/g) || []).length, 0);
台.数('这一批纯判断那一格新增几颗测试', 新增测试 + ' 颗');
台.判('新增不少于二十六颗', 新增测试 >= 26);
const 全测试 = fs.readdirSync(path.join(ROOT, 'src', '_tauri', 'src', 'core')).filter(f => f.endsWith('.rs'))
  .map(f => fs.readFileSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', f), 'utf8'))
  .join('').match(/#\[test\]/g) || [];
台.数('全仓纯判断那一格的测试总数', 全测试.length + ' 颗');
台.判('总数比上一批的 81 颗多了（不许多加不减，也不许把旧的撤掉）', 全测试.length > 81);

台.题('五、comp:restore 与 comp:factory 取的是原厂那一格（<数据层>\\plugins-factory）');
台.判('壳里那两把格：活的那一格 = 数据层\\plugins、原厂那一格 = 数据层\\plugins-factory',
  /fn 活的那一格\(\) -> String \{[\s\S]*?\.join\("plugins"\)/.test(动) && /fn 原厂那一格\(\) -> String \{[\s\S]*?\.join\("plugins-factory"\)/.test(动));
台.判('数据层那一格与 data_cmds 共用一颗（不另起第二份口径，备份那一摊也用它）',
  动.includes('crate::tauri_bind::data_cmds::数据层格()')
  && /pub\(crate\) fn 数据层格\(\) -> PathBuf \{ crate::tree_root\(\)\.join\("data"\) \}/.test(rd('src/_tauri/src/tauri_bind/data_cmds.rs')));
台.判('那一颗 restore 取的是出厂那一格（原件走 factFile，壳走 出厂落点），不是活的那一格',
  那一颗('restore').includes('factFile(L.id, segsOf(r))') && 动.includes('出厂落点(&原厂, &落.包名, &要恢复)'));
台.判('那一颗 factory 报的是出厂那一格里这一家（原件 factoryFiles / hasFactory 都从原厂那一格取，壳里是 原厂那一家）',
  那一颗('factoryFiles').includes('FACT()') && 那一颗('hasFactory').includes('FACT()')
  && 动.includes('原厂那一家(&原厂, &id)'));
台.判('原厂这一格不写 resources 那层那句旧话（壳里两本与纯判断那一格都不认那一层）',
  !那两层码.includes('resources') && !纯.includes('resources'));
/* 壳里那一颗 restore 的原文（这一颗自己的那一段，到顶格的 } 为止）—— 只看它自己用没用链接 */
const 壳恢复颗 = (() => {
  const 起 = 动.indexOf('pub fn comp_restore');
  const 止 = 动.indexOf('\n}', 起);
  return 起 < 0 ? '' : 动.slice(起, 止 < 0 ? 动.length : 止);
})();
台.判('恢复出厂是真复制一份（不硬链接：链接会让活文件与底变成同一份），壳用的也是复制那颗',
  那一颗('restore').includes('copyFile(from, L.file)') && 切(尺, 'copyFile').includes('fs.copyFileSync')
  && !切(尺, 'copyFile').includes('link') && 动.includes('fs::copy(&取, &落.落)') && !/symlink|hard_link|rename/.test(壳恢复颗));
台.判('restore 的 rel 口径与 read 不同一处都不许被统一：read 判 trim、restore 只挡空串',
  那一颗('read').includes("String(rel).trim() === ''") && 那一颗('restore').includes("String(rel || 'main.js')")
  && 纯.includes('Some(x) if x.trim().is_empty()') && 纯.includes('Some("") => 入口那份.to_string()'));

台.题('六、comp:write 被挡时回的形状与 Electron 那颗一致');
const 主写 = 那一颗('write');
台.判('那一头被挡的三支都只有 ok + msg 那两格',
  (主写.match(/return \{ ok:false, msg:[^}]*\}/g) || []).length === 4 && !/\{ ok:false,[^}]*size/.test(主写));
台.判('那一头成了那一支是 ok + size 两格', 主写.includes('return { ok:true, size:buf.length }'));
const 壳写 = 壳字段(动, '一个回执');
台.数('壳里那一格有哪几栏', 壳写.join(' '));
台.判('壳里的 一个回执 就三栏 ok / size / msg，且 size 与 msg 都是「没有就不出现」',
  JSON.stringify(壳写) === JSON.stringify(['ok', 'size', 'msg'])
  && (动.match(/skip_serializing_if = "Option::is_none"/g) || []).length >= 12);
台.判('comp_write 那一颗只回这一格，不借别本的形状',
  /pub fn comp_write\(id: String, rel: String, text: String\) -> 一个回执/.test(动));
台.判('空 rel 那一句两头同字：得说要写这一格里的哪份文件',
  主写.includes("msg:'得说要写这一格里的哪份文件'") && 纯串.没说要写那句 === '得说要写这一格里的哪份文件'
  && 动.includes('没说要写那句.to_string()'));
台.判('太大那两句各是各的写法（read 说「这份文件 NMB」、write 说「这份 NMB」），壳里两句都照旧没给改齐',
  那一颗('read').includes("'这份文件 ' + Math.round(st.size / 1048576) + 'MB，太大不走这条路'")
  && 主写.includes("'这份 ' + Math.round(buf.length / 1048576) + 'MB，太大不走这条路'")
  && 纯.includes('format!("这份文件 {}MB，太大不走这条路"') && 纯.includes('format!("这份 {}MB，太大不走这条路"'));
台.判('写下去报的 size 是字节数（buf.length 那一手），不是字符数',
  动.includes('let 节 = text.as_bytes();') && 动.includes('一个回执::成了(节.len() as u64)'));
台.判('壳里那三颗（write / delete / restore）成了之后不再叫任何重扫（两本 Rust 里都没有 refreshLists 这一手），这一层顶上也不挂「已知缺口」那一段',
  !/refreshLists/.test(动 + 改) && !动.includes('已知缺口'));
台.判('那一层任何一步都不抛给页面（六颗返回的类型都不是 Result）',
  !/pub fn comp_\w+\([^)]*\) -> Result/.test(动));

台.题('七、六颗各自的回执字段，对着 comp-files.cjs 的 return 一格一格数');
const 主读支 = [...那一颗('read').matchAll(/return (\{[^}]*\})/g)].map(m => 取键(m[1]));
台.数('那把尺 read 回的三种款式', 主读支.map(x => x.join('+')).join(' / '));
const 壳读 = 壳字段(动, '一份原文');
台.数('壳里 一份原文 有哪几栏', 壳读.join(' '));
台.判('读那六栏同一串（ok text size mtime factory msg path，多一格少一格都算发明形状）',
  JSON.stringify(壳读) === JSON.stringify(['ok', 'text', 'size', 'mtime', 'factory', 'msg', 'path']));
台.判('读不成那一支不多带 text / size / mtime（全是有才有）',
  主读支.some(x => JSON.stringify(x) === JSON.stringify(['ok', 'msg']))
  && 主读支.some(x => JSON.stringify(x) === JSON.stringify(['ok', 'msg', 'path'])));
台.判('成了那一支的五格两头同串', 那一颗('read').includes('{ ok:true, text, size:st.size, mtime:Math.floor(st.mtimeMs)')
  && 动.includes('factory: Some(有底)'));
const 主列支 = [...那一颗('list').matchAll(/return (\{[^}]*\})/g)].map(m => 取键(m[1]));
台.判('列那两格（ok files msg）同串，且这一格不在时回的是 ok:true + 空的 files',
  JSON.stringify([...new Set(主列支.flatMap(x => x))].sort()) === JSON.stringify(['files', 'msg', 'ok'])
  && 那一颗('list').includes("if(!isDir(L.file)) return { ok:true, files:[] }")
  && 动.includes('files: Some(vec![])'));
const 主删支 = [...那一颗('remove').matchAll(/return (\{[^}]*\})/g)].map(m => 取键(m[1]));
台.数('那把尺 remove 回的几种款式', 主删支.map(x => x.join('+')).join(' / '));
台.判('抹掉一整格那两格（ok removed msg）同串，且「本来就不在」那一支不带 removed',
  JSON.stringify([...new Set(主删支.flatMap(x => x))].sort()) === JSON.stringify(['msg', 'ok', 'removed'])
  && 主删支.some(x => JSON.stringify(x) === JSON.stringify(['ok', 'msg']))
  && 主删支.some(x => JSON.stringify(x).includes('removed'))
  && 动.includes('一份删除 { ok: false, removed: None, msg: Some(本来不在那句.to_string()) }'));
台.判('抹着的两样东西：那一格目录与那颗同名 zip，两处都算进 removed（写法也照原件：<包名>/ 与 <包名>.zip）',
  那一颗('remove').includes("gone.push(L.id + '/')") && 那一颗('remove').includes("gone.push(L.id + '.zip')")
  && 动.includes('format!("{}/", 落.包名)') && 动.includes('format!("{}.zip", 落.包名)'));
台.判('comp:factory 那一颗永远 ok:true 且带 files + has 两栏（不套 try，读不出来也回空的那一串）',
  JSON.stringify(壳字段(动, '一份原厂')) === JSON.stringify(['ok', 'files', 'has'])
  && 动.includes('pub fn comp_factory'));
台.判('comp:read 出错是回一格给页面（不成 / 没有 那两支），不是把错抛到页面上',
  /pub fn comp_read\(id: String, rel: Option<String>\) -> 一份原文/.test(动)
  && 动.includes('一份原文::不成(那句)') && !/pub fn comp_read[\s\S]{0,80}-> Result/.test(动));

台.题('八、code:catRename：三种写法、两张表与回执那七栏');
台.判('那三种写法都在（整串等于旧名 / 整串以旧名 + . 开头 / 前缀那一半自己就是一串）',
  名.includes('if 串 == 旧名') && 名.includes('if 串.starts_with(旧带点.as_str())') && 名.includes('if 串.ends_with(\'.\')'));
台.判('第二条切的是旧名那一截、尾点留着',
  名.includes('&串[旧名.len()..]'));
台.判('串里有反斜杠或整串是空的就原样退回（界面文字里那些不碰）',
  名.includes('if 串.is_empty() || 串.contains(\'\\\\\')'));
台.判('认的是那三枚引号（双引号、单引号、反引号），不多认一种',
  /c == '"' \|\| c == '\\'' \|\| c == '`'/.test(名));
台.判('旧名新名那两道停下回来的句子逐字钉住',
  名.includes('pub const 不一样那句: &str = "旧名新名得不一样";')
  && 名.includes('pub const 没记源码那句: &str = "这台机器没记下源码在哪儿，代码引用改不了";'));
台.判('两张后缀表与两个深度钉住（源码格只看 .js 不钻，本家那一格看 .js 与 .json 往里钻）',
  名.includes('pub const 源码那种后缀: [&str; 1] = [".js"];') && 名.includes('pub const 插件那两种后缀: [&str; 2] = [".js", ".json"];')
  && 改.includes('收那几份(&源码那一格, &源码那种后缀, false, 0, &mut 那几份)')
  && 改.includes('收那几份(&插件那格, &插件那两种后缀, true, 0, &mut 那几份)'));
台.判('顶上那一句两种写法逐字钉住',
  名.includes('format!("改了 {} 个文件 · 共 {} 处"') && 名.includes('format!("代码里没有引用【{}】的地方"'));
const 壳改 = 壳字段(改, '一份改名');
台.数('壳里 一份改名 有哪几栏', 壳改.join(' '));
台.判('回执那七栏同一串（ok hits bad packs src comp msg，一格不多一格不少）',
  JSON.stringify(壳改) === JSON.stringify(['ok', 'hits', 'bad', 'packs', 'src', 'comp', 'msg'])
  && JSON.stringify(壳字段(改, '一处命中')) === JSON.stringify(['file', 'n']));
台.判('bad 那两句写法钉住（「：读不出」不带系统那句，「：写不进去（…）」带）',
  改.includes('坏.push(format!("{}：读不出", 名))') && 改.includes('坏.push(format!("{}：写不进去（{}）", 名, e))'));
台.判('packs 那一栏：写不进去的那一份也照样算动到，且 .. 不算一家',
  改.indexOf('坏.push(format!("{}：写不进去') < 改.indexOf('哪一家(') && 名.includes('段 == ".."'));
台.判('src 与 comp 两栏按「在不在 <源码格>\\_shared 里面」分',
  改.includes('是共用底子(&源码那一格, &x.file)') && 名.includes('落点.starts_with(去尾分隔(源码那一格).as_str())'));
台.判('源码格那一颗与 sys:rebuild 共用（认 FD_SRC，没指看树里那一格），不另起第二份认法',
  /pub\(crate\) fn 源码格\(树: &str\) -> Option<String>/.test(rd('src/_tauri/src/tauri_bind/sys_cmds.rs'))
  && 改码.includes('源码格(&树)') && !改码.includes('FD_SRC'));
台.判('那两处扫的落点里，本家那一格与「改代码」那六颗同一颗（同一把尺同一处格）',
  改.includes('活的那一格()') && 动.includes('pub(crate) fn 活的那一格()'));

台.题('九、纯判断那两格不动磁盘、不认识壳');
for (const 禁 of ['std::fs', 'File::open', 'File::create', 'fs::write', 'read_to_string', 'tauri::',
  'create_dir', 'remove_dir', 'remove_file', 'AppHandle', 'emit(', 'std::process', 'std::env', 'Command'])
  台.判('纯判断那两格里没有「' + 禁 + '」', !那两格.includes(禁));
台.判('动磁盘的那一手在第三层（那两层里真有 std::fs）', 动.includes('use std::fs;') && 改.includes('use std::fs;'));
台.判('那两层里读的是 core 那一颗，没把判断重写一遍（不出现 拆段 之外的第二份白名单）',
  动.includes('use crate::fd_core::comp_rule::') && 改.includes('use crate::fd_core::cat_rename::'));

台.题('十、这一批的账（拿桥那一份与壳的注册单对，不再拿 Electron 主进程当标准答案）');
const 这批 = 批.map(x => x[0]);
const 缺 = 对名单(这批, 桥, 壳注册单());
台.数('这一批几颗', 这批.length + ' 颗：' + 这批.join(' '));
台.判('这一批每一颗桥都请得到（页面上喊得出来这一颗）', 缺.桥没请.length === 0, 缺.桥没请);
台.判('这一批每一颗都在壳的注册单上（搬齐了，不留半截桥）', 缺.单没注册.length === 0, 缺.单没注册);
/* 从前这一段是「本道数一遍 63，另四道也各数一遍，再互相核对五本里的数字别留旧数」——
   一把尺分成五处就是这种账的来处：搬完一颗要改五本，改漏一本就假绿。
   总账现在只有一处：桥请的一颗都不许在单外，钉在 gate-bridge46 第三节；这五道只管自己那一批在不在名单上。 */
台.判('五道同族闸都不再自己数总账（那一把尺只有一处）',
  ['gate-tauridata46', 'gate-tauribackup46', 'gate-taurimedia46', 'gate-tauripack46'].every(名 =>
    !/已搬\.length ===/.test(rd('src/tools/probes/' + 名 + '.mjs'))) &&
  rd('src/tools/probes/gate-bridge46.mjs').includes('请壳的一颗都不许在单外'));
台.判('主.rs 顶上那句「还剩几颗没搬」整句撤了（壳里一颗不差，不许留着一句旧账当已实现）', !/还没搬|剩下的 4 颗/.test(壳));
台.收尾();
