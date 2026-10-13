/* ============================================================
   gate-tauridata46.mjs · 外46 三 批一：数据层那一摊与配置那几格（11 颗）搬进壳之后的硬事实
   ------------------------------------------------------------
     node src/tools/probes/gate-tauridata46.mjs
   钉的是这么几件事，一条都不许放宽：
     一、这一批 11 颗（data:dir/read/write/list/wipe、lib:read/write、cfg:closeGet/Set、cfg:rimeGet/Set）
        每一颗在壳里都有对应的一颗命令，而且都上了 main.rs 的注册单 —— 没上单等于不存在；
     二、桥里这 11 颗不再是「这颗通道还没搬进壳」：参表里有名，栏名与顺序还对得上 preload 里递的实参个数，
        参数名里一个下划线都没有（Tauri 那头按驼峰认名，带下划线就对不上）；
     三、路径那道判断住在纯判断那一格（fd_core::data_path 的 落格），而且测试真钉住了
        「a/b.yaml 放行、../x 拒、盘符那种写法拒、反斜杠问号绕道拒、空串拒」这五条；
        动磁盘那一层只叫它，自己一道判断都没写；
     四、data:wipe 的删除范围与主进程一字不差：那张字条落在数据层那一格、名字同一个、
        留着的四格同一串、这一颗自己一颗都不删（真删排在开机那一趟，还没搬进来）；
     五、库文件那张名单两头同一张表（漏登记的表现是「界面上改得动、报一句存不进文件、重启就没了」）；
     六、回给页面的形状一格都没动：认不出/读不到 那些格子里字段名与那一头对得上，
        抛错还是回 null 也照那一头；
     七、纯判断那两格（data_path、cfg_value）里没有动磁盘的手、也不认识壳。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { rd, 记账, 切, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-tauridata46');
const main = rd('src/pack/main.cjs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 原身 = rd('src/pack/preload.cjs');
const 壳 = rd('src/_tauri/src/main.rs');
const 数据 = rd('src/_tauri/src/tauri_bind/data_cmds.rs');
const 配置 = rd('src/_tauri/src/tauri_bind/cfg_cmds.rs');
const 那两格 = rd('src/_tauri/src/core/data_path.rs') + '\n' + rd('src/_tauri/src/core/cfg_value.rs');

/* 名字换算与桥里那一颗同一式子：冒号变下划线、驼峰变下划线小写 */
const 换 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
/* 每一颗：通道名、壳里的命令名、落在哪一本、页面上该递几栏（栏名照声明顺序） */
const 批 = [
  ['data:dir', 'data_dir', 'data_cmds', []],
  ['data:read', 'data_read', 'data_cmds', ['rel']],
  ['data:write', 'data_write', 'data_cmds', ['rel', 'text']],
  ['data:list', 'data_list', 'data_cmds', []],
  ['data:wipe', 'data_wipe', 'data_cmds', []],
  ['lib:read', 'lib_read', 'data_cmds', ['name']],
  ['lib:write', 'lib_write', 'data_cmds', ['name', 'text']],
  ['cfg:closeGet', 'cfg_close_get', 'cfg_cmds', []],
  ['cfg:closeSet', 'cfg_close_set', 'cfg_cmds', ['mode']],
  ['cfg:rimeGet', 'cfg_rime_get', 'cfg_cmds', []],
  ['cfg:rimeSet', 'cfg_rime_set', 'cfg_cmds', ['p']],
];
const 那颗本 = 名 => 名 === 'data_cmds' ? 数据 : 配置;

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
  const 去头 = 出.replace(/^\s*,/, ''); /* 通道名与第一栏之间那一道逗号不算一栏 */
  if (!/\S/.test(去头)) return 0;
  let 数 = 0, 层 = 0;
  for (const c of 去头) {
    if (c === '(' || c === '[' || c === '{') 层++;
    else if (c === ')' || c === ']' || c === '}') 层--;
    else if (c === ',' && 层 === 0) 数++;
  }
  return 数 + 1;
}

台.题('一、这一批 11 颗：主进程每一颗，壳里都有一座，且都上了注册单');
台.数('这一批点名的通道', 批.length + ' 颗 · ' + 批.map(x => x[0]).join(' '));
台.判('点的就是 11 颗，不多不少', 批.length === 11);
for (const [通道, 名, 本, 栏] of 批) {
  台.判(通道 + ' 的通道名换算过去就是 ' + 名, 换(通道) === 名);
  台.判(通道 + ' 在壳里有对应的一颗（' + 本 + '.rs 里有 pub fn ' + 名 + '）',
    new RegExp('pub (?:async )?fn ' + 名 + '\\s*\\(').test(那颗本(本)));
  台.判(通道 + ' → ' + 名 + ' 在 main.rs 的注册单上', 壳.includes(本 + '::' + 名));
}
const 命令数 = (数据.match(/#\[[^\]]*tauri::command/g) || []).length + (配置.match(/#\[[^\]]*tauri::command/g) || []).length;
台.数('壳里这两本一本有几颗命令标记', (数据.match(/#\[[^\]]*tauri::command/g) || []).length + ' + ' + (配置.match(/#\[[^\]]*tauri::command/g) || []).length);
台.判('两本合起来正好 11 颗（多一颗就是往这两本里塞了没点名的通道）', 命令数 === 11);
台.判('模块声明也在这两本上（tauri_bind/mod.rs）',
  /pub mod data_cmds;/.test(rd('src/_tauri/src/tauri_bind/mod.rs'))
  && /pub mod cfg_cmds;/.test(rd('src/_tauri/src/tauri_bind/mod.rs')));
台.判('这一批没有往 fs_cmds 那一本里塞通道（各归各的本）',
  !批.some(x => new RegExp('pub fn ' + x[1] + '\\s*\\(').test(rd('src/_tauri/src/tauri_bind/fs_cmds.rs'))));

台.题('二、桥里这 11 颗不再是「还没搬」');
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
台.判('AppHandle 只挂在 lib:write 那一颗上（它要朝各窗口喊一句），别的颗都不收',
  (数据.match(/app: AppHandle/g) || []).length === 1 && !/app: AppHandle/.test(配置));

台.题('三、路径那道判断住在纯判断那一格，五条硬样本真有测试钉着');
台.判('落格 那一颗住在 fd_core::data_path（不在动磁盘那一层）',
  /pub fn 落格\(根: &str, 相对: &str\) -> Option<String>/.test(那两格) && !/fn 落格/.test(数据 + 配置));
台.判('它带 #[test]，而且测试段里有断言', /#\[cfg\(test\)\][\s\S]*#\[test\]/.test(那两格));
const 测试段 = (那两格.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0];
台.判('钉住了 a/b.yaml 放行', /"a\/b\.yaml"\),\s*Some\(/.test(测试段));
台.判('钉住了 ../x 拒', /"\.\.\/x"\),\s*None\)/.test(测试段));
台.判('钉住了盘符那种写法拒（字母 + 冒号 + 斜杠，拼出来写：仓里的字面不留这台机器的地盘）',
  /format!\("\{\}:\\\\Windows/.test(测试段) && /&反斜杠盘符\),\s*None\)/.test(测试段));
台.判('钉住了反斜杠问号那一手绕道拒', /format!\("[^"]*\?[^"]*\{\}:/.test(测试段) && /&绕道整串\),\s*None\)/.test(测试段));
台.判('钉住了空串拒', /, ""\),\s*None\)/.test(测试段));
台.判('带冒号与斜杠开头的绝对地址都不给落点（不止盘符那一种）',
  /"\{\}:\/Windows/.test(测试段) && /"\/etc\/那一份"\),\s*None\)/.test(测试段));
台.判('动磁盘那一层只叫 落格，一道判断都没自己写（没有第二份口径）',
  (数据.match(/落格\(/g) || []).length >= 2 && !/"\.\.[\/\\]/.test(数据) && !数据.includes('starts_with("./')
  && !/fn .*归一/.test(数据) && !数据.includes('path::Component') && !数据.includes('canonicalize'));
台.判('读的颗回 Option（读不到就是 null），写的颗回 Result（跑出那一格就抛）',
  /pub fn data_read\(rel: String\) -> Option<String>/.test(数据)
  && /pub fn data_write\(rel: String, text: Option<String>\) -> Result<bool, String>/.test(数据));
台.判('抛出去的那句话与主进程同一串', main.includes("throw new Error('数据路径跑出了用户目录：' + rel)")
  && 那两格.includes('数据路径跑出了用户目录：') && 数据.includes('跑出那句'));

台.题('四、data:wipe 的删除范围与主进程一字不差');
const 那一段wipe = 那一段('data:wipe');
const 引号串 = s => [...s.matchAll(/['"]([^'"]*)['"]/g)].map(m => m[1]);
const 主留着 = 引号串(切(main, 'WIPE_KEEP'));
const 壳留着 = 引号串((那两格.match(/pub const 留着那几格[\s\S]*?\];/) || [''])[0]);
台.数('主进程那边留着的几格', 主留着.join('、'));
台.数('壳里那颗报出来的留着的几格', 壳留着.join('、'));
台.判('留着的名单同一串、同一个顺序（一颗都不许多留也不许少留）',
  JSON.stringify(主留着) === JSON.stringify(壳留着));
const 主字条 = 引号串(切(main, 'WIPE_FILE')).filter(x => x.includes('.json'))[0];
台.判('那张字条两头同名（' + 主字条 + '）',
  主字条 === 'wipe-user.json' && 那两格.includes('pub const 字条名: &str = "wipe-user.json"'));
台.判('字条落在数据层那一格（<树根>\\data），不是用户数据那一格',
  /const DATA_ROOT = path\.join\(TREE, 'data'\)/.test(main) && 数据.includes('.join("data")'));
台.判('这一批不把 FD_DATA 那把挪门的尺算进来（那一头 DATA_ROOT 不吃环境变量；注释里写了这一句不算）',
  !/env::var\(\s*"FD_DATA"/.test(数据 + 配置) && 数据.includes('crate::tree_root().join("data")'));
台.判('这一颗一颗都不删：壳里没有删的那一手（真删排在开机那一趟，还没搬）',
  !/remove_dir|remove_file|fs::remove|fs::delete|std::fs::remove|remove_dir_all/.test(数据));
台.判('主进程那一颗也确实不删（只写字条）',
  !/rmSync|unlink|rm\(|rimraf/.test(那一段wipe) && 那一段wipe.includes('fs.writeFileSync(WIPE_FILE()'));
台.判('已经排着就不重写，只把时间戳留着（already 那一格两头都有）',
  那一段wipe.includes('already:true') && 数据.includes('already: Some(true)'));
台.判('字条上那两栏照那一头（requestedAt 与 keep，缩进两格）',
  那一段wipe.includes('requestedAt:new Date().toLocaleString()') && 那一段wipe.includes('null, 2')
  && /rename = "requestedAt"/.test(数据) && 数据.includes('to_string_pretty'));

台.题('五、库文件那张名单两头同一张表');
const 主名单 = 引号串(切(main, 'LIB_NAMES'));
const 壳名单 = 引号串((那两格.match(/pub const 库名单[\s\S]*?\];/) || [''])[0]);
台.数('主进程那边认哪几份', 主名单.join(' '));
台.数('壳里认哪几份', 壳名单.join(' '));
台.判('两张表同一串、同一个条数（少一份就是「存不进文件」那类毛病）',
  JSON.stringify(主名单) === JSON.stringify(壳名单) && 主名单.length === 5);
台.判('认不出的那一句话两头同一串', 那一段('lib:read').includes('不认这一份库文件：')
  && 那两格.includes('不认这一份库文件：'));
台.判('名单只在纯判断那一格里有一份（动磁盘那一层只叫 库名在册）',
  /pub fn 库名在册/.test(那两格) && !/fn 库名在册/.test(数据) && (数据.match(/库名在册\(/g) || []).length === 2);
台.判('库文件落点与那一头同一格（DATA_ROOT 拼名字，不拼用户数据那一格）',
  /const libFile = n => path\.join\(DATA_ROOT, n\)/.test(main) && 数据.includes('数据层格().join(&name)'));
台.判('广播那条事件名两头同一串（lib:changed）',
  main.includes("send('lib:changed'") && 数据.includes('emit("lib:changed"'));
台.判('写完才喊，认不出与写不下去都不喊（照那一头的先后次序）',
  数据.indexOf('fs::write(&路') < 数据.indexOf('emit("lib:changed"'));

台.题('六、回给页面的形状一格都没动');
const 形状 = [['lib:read', '一份库', ['ok', 'text', 'file', 'msg']],
              ['lib:write', '一个回执', ['ok', 'msg']],
              ['data:wipe', '一张字条', ['ok', 'queued', 'already', 'file', 'msg']]];
for (const [通道, 结构, 格] of 形状) {
  const 块 = (数据.match(new RegExp('pub struct ' + 结构 + ' \\{[\\s\\S]*?\\n\\}')) || [''])[0];
  for (const g of 格)
    台.判(通道 + ' 回的那一格 ' + g + ' 两头都有',
      那一段(通道).includes(g) && new RegExp('\\b' + g + ':').test(块));
  台.判(通道 + ' 的 struct 名对得上（' + 结构 + '）', 块.length > 0);
}
台.判('lib:read 认不出时回的是 text:"" 与 file:""（那一头就是这两格空的）',
  那一段('lib:read').includes("{ ok:false, text:'', file:''") && /ok: false,\s*text: String::new\(\), file: String::new\(\)/.test(数据));
台.判('lib:read 那一份不在盘上也算读得到、原文是空串（照那一头 readLibRaw 的 catch）',
  /return \{ ok:true, text: readLibRaw\(n\)/.test(那一段('lib:read')) && 数据.includes('read_to_string(&路).unwrap_or_default()'));
台.判('data:list 只列一层、只要文件、按名字排；列不出来回空串那一样（两头同）',
  那一段('data:list').includes('filter(x => x.isFile())') && 那一段('data:list').includes('.sort()')
  && 数据.includes('.is_file()') && 数据.includes('列.sort()'));
台.判('cfg:closeSet 回的是归过以后那一档，不是页面递进来的原串（两头都先认档再回）',
  /const mode = \(m === 'tray' \|\| m === 'quit'\) \? m : 'ask'/.test(切(main, 'writeCloseMode'))
  && /let 档 = 认关法\(&mode\)/.test(配置) && 配置.includes('档.to_string()'));
台.判('cfg:closeSet 与 cfg:rimeSet 写不写得进去都照样回话（那一头 catch 吞掉）',
  /try\{ fs\.mkdirSync/.test(切(main, 'writeRimeDir')) && 配置.includes('let _ = fs::write(路, 文)'));
台.判('cfg:rimeGet 的回退那一手两头同（没记过才看默认那一格，真是目录才报，都不是回空串）',
  /process\.env\.APPDATA \? path\.join\(process\.env\.APPDATA, 'Rime'\) : ''/.test(切(main, 'readRimeDir'))
  && 配置.includes('std::env::var("APPDATA")') && 配置.includes('"Rime"') === false && 配置.includes('Rime'));
台.判('cfg:rimeSet 那一头是 String(p || "")：没给、给空都算清空指向',
  配置.includes('pub fn cfg_rime_set(p: Option<String>) -> bool')
  && 切(main, 'writeRimeDir').includes("String(p || '')"));
台.判('data:dir 回的就是那一头 app.getPath(\'userData\') 同一把格（与挑文件那一组共用一颗）',
  那一段('data:dir').includes('async () => DATA_DIR()') && 数据.includes('pick_cmds::数据格()'));

台.题('七、纯判断那两格不动磁盘、不认识壳');
for (const 禁 of ['std::fs', 'fs::', 'File::open', 'File::create', 'read_to_string', 'create_dir',
  'remove_dir', 'remove_file', 'tauri::', 'AppHandle', 'emit(', 'std::env'])
  台.判('纯判断那两格里没有「' + 禁 + '」', !那两格.includes(禁));
台.判('动磁盘的那一手在第三层（data_cmds 里真有 std::fs）', 数据.includes('use std::fs;'));
台.判('纯判断那两格各带一颗 mod 验判断', (那两格.match(/mod 验判断/g) || []).length === 2);
台.数('这一批新增的测试几颗', (测试段.match(/#\[test\]/g) || []).length + ' 颗');
台.判('新增不少于八颗', (测试段.match(/#\[test\]/g) || []).length >= 8);
台.判('全仓纯判断那一格的测试总数比基线 43 颗多了（现在 ' +
  (fs.readdirSync(path.join(ROOT, 'src', '_tauri', 'src', 'core')).filter(f => f.endsWith('.rs'))
    .map(f => fs.readFileSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', f), 'utf8'))
    .join('').match(/#\[test\]/g) || []).length + ' 颗）',
  (fs.readdirSync(path.join(ROOT, 'src', '_tauri', 'src', 'core')).filter(f => f.endsWith('.rs'))
    .map(f => fs.readFileSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', f), 'utf8'))
    .join('').match(/#\[test\]/g) || []).length >= 53);

台.题('八、这一批的账');
const 电 = [...new Set((main.match(/ipcMain\.handle\(\s*['"]([^'"]+)['"]/g) || [])
  .map(s => (s.match(/['"]([^'"]+)['"]/) || [])[1]))];
const 已搬 = 电.filter(n => Object.prototype.hasOwnProperty.call(表, 换(n)));
台.数('覆盖率那一句', '已搬 ' + 已搬.length + ' / ' + 电.length);
台.判('这一批 11 颗全在已搬名单里', 批.every(x => 已搬.includes(x[0])));
台.判('已搬总数到了 63（这一批 11 颗在里头，批二那八颗、批三那七颗、批四那九颗、批五那四颗、批六那两颗与批七那三颗也都跟上：30 + 8 + 7 + 9 + 4 + 2 + 3）', 已搬.length === 63);
台.判('还没搬的照实记着：主进程还剩 ' + (电.length - 已搬.length) + ' 颗', 电.length - 已搬.length === 4);

台.收尾();
