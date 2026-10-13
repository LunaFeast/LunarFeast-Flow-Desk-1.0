/* ============================================================
   gate-tauribackup46.mjs · 外46 三 批二：定期备份那四颗 + 重新构建 + 取标题 + 图片库两张（共 8 颗）搬进壳
   ------------------------------------------------------------
     node src/tools/probes/gate-tauribackup46.mjs
   钉的是这么几件事，一条都不许放宽：
     一、这一批 8 颗（backup:run / last / check / roots、sys:rebuild、web:title、img:peek / open）
        每一颗在壳里都有对应的一颗命令，而且都上了 main.rs 的注册单 —— 没上单等于不存在；
     二、桥里这 8 颗不再是「这颗通道还没搬进壳」：参表里有名、栏名与顺序对得上桥里递的实参个数，
        参数名里一个下划线都没有；
     三、备份落点那道「不许写进这一棵树里」的判断住在纯判断那一格（fd_core::backup_rule 的 落点不许），
        四条硬样本真有测试钉着：仓内子路径拒、.. 拒、仓外的绝对地址放行、空串拒；
        动磁盘那一层只叫它，一道判断都没自己写；
     四、backup:run 的回执形状与 backup.cjs 一致：成了那九格（ok msg 目录 抄 字 坏 数 错 收）一格不多一格不少，
        收旧份那一格（删 留 半 错）也对得上；停下来的那几种回的行数与那一头同一支；
     五、img:peek 回的是裸字节：读进来是 &[u8]、直接进 base64 那颗，半路一次都没化成字符串
        （测试拿一段故意不是 UTF-8 的字节钉着它），回给页面的形状是 { ok, url, w, h, big } / { ok:false, miss }；
     六、四颗备份的默认那一处两头同一格（<树根>\data，label 也叫「数据」），backup:roots 不读这台机器的位置登记；
     七、sys:rebuild 的那两步标签与百分比、两枚事件名两头同一串；web:title 只认 http(s)、四秒、任何不成回空串；
     八、纯判断那三格（backup_rule / web_page / img_bytes）不动磁盘、不认识壳。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { rd, 记账, ROOT, 对名单, 壳注册单 } from './lib-slice.mjs';

const 台 = 记账('gate-tauribackup46');
const 抄的那颗 = rd('src/pack/backup.cjs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 壳 = rd('src/_tauri/src/main.rs');
const 备份 = rd('src/_tauri/src/tauri_bind/backup_cmds.rs');
const 图 = rd('src/_tauri/src/tauri_bind/img_cmds.rs');
const 网 = rd('src/_tauri/src/tauri_bind/web_cmds.rs');
const 统 = rd('src/_tauri/src/tauri_bind/sys_cmds.rs');
const 定 = rd('src/_tauri/src/core/backup_rule.rs');
const 页 = rd('src/_tauri/src/core/web_page.rs');
const 节 = rd('src/_tauri/src/core/img_bytes.rs');
const 那三格 = 定 + '\n' + 页 + '\n' + 节;

/* 名字换算与桥里那一颗同一式子：冒号变下划线、驼峰变下划线小写 */
const 换 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
/* 每一颗：通道名、壳里的命令名、落在哪一本、页面上该递几栏（栏名照声明顺序） */
const 批 = [
  ['backup:run', 'backup_run', 'backup_cmds', ['cfg']],
  ['backup:last', 'backup_last', 'backup_cmds', ['dest']],
  ['backup:check', 'backup_check', 'backup_cmds', ['cfg']],
  ['backup:roots', 'backup_roots', 'backup_cmds', []],
  ['sys:rebuild', 'sys_rebuild', 'sys_cmds', []],
  ['web:title', 'web_title', 'web_cmds', ['url']],
  ['img:peek', 'img_peek', 'img_cmds', ['p', 'maxw']],
  ['img:open', 'img_open', 'img_cmds', ['p']],
];
const 那本 = 名 => ({ backup_cmds: 备份, img_cmds: 图, web_cmds: 网, sys_cmds: 统 })[名];

/* 桥的参表（那份桥自己写死的那一张表）；拿不到就当这一批根本没进桥 */
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

台.题('一、这一批 8 颗：页面请的每一颗，壳里都有一座，且都上了注册单');
台.数('这一批点名的通道', 批.length + ' 颗 · ' + 批.map(x => x[0]).join(' '));
台.判('点的就是 8 颗，不多不少', 批.length === 8);
for (const [通道, 名, 本] of 批) {
  台.判(通道 + ' 的通道名换算过去就是 ' + 名, 换(通道) === 名);
  台.判(通道 + ' 在壳里有对应的一颗（' + 本 + '.rs 里有 fn ' + 名 + '）',
    new RegExp('pub (?:async )?fn ' + 名 + '\\s*\\(').test(那本(本)));
  台.判(通道 + ' → ' + 名 + ' 在 main.rs 的注册单上', 壳.includes(本 + '::' + 名));
}
const 命令数 = [备份, 图, 网, 统].reduce((a, s) => a + (s.match(/#\[[^\]]*tauri::command/g) || []).length, 0);
台.数('这四本各有几颗命令标记', [备份, 图, 网, 统].map(s => (s.match(/#\[[^\]]*tauri::command/g) || []).length).join(' + '));
台.判('四本合起来正好 8 颗（多一颗就是往这四本里塞了没点名的通道）', 命令数 === 8);
const 声明 = rd('src/_tauri/src/tauri_bind/mod.rs');
for (const 本 of ['backup_cmds', 'img_cmds', 'web_cmds', 'sys_cmds'])
  台.判('模块声明在这本上（tauri_bind/mod.rs 认 ' + 本 + '）', new RegExp('pub mod ' + 本 + ';').test(声明));
const 判声明 = rd('src/_tauri/src/core/mod.rs');
for (const 本 of ['backup_rule', 'web_page', 'img_bytes'])
  台.判('纯判断那一格认 ' + 本, new RegExp('pub mod ' + 本 + ';').test(判声明));

台.题('二、桥里这 8 颗不再是「还没搬」');
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
台.判('AppHandle 只挂在 sys:rebuild 那一颗上（它要朝各窗口送进度），别的颗都不收',
  (统.match(/app: AppHandle/g) || []).length === 1 && ![备份, 图, 网].some(s => /app: AppHandle/.test(s)));
台.判('img:peek 那一颗收两栏（路径 + 那一档宽），照桥里的递法',
  JSON.stringify(表.img_peek) === JSON.stringify(['p', 'maxw']) && 递了几栏('img:peek') === 2);

台.题('三、落点那道「不许写进仓里」住在纯判断那一格，四条硬样本真有测试钉着');
台.判('落点不许 那一颗住在 fd_core::backup_rule（不在动磁盘那一层）',
  /pub fn 落点不许\(落点: &str, 这一棵: &str, 被抄的: &\[\(&str, &str\)\]\) -> Option<String>/.test(定)
  && !/fn 落点不许/.test(备份));
台.判('动磁盘那一层只叫它，一道判断都没自己写',
  (备份.match(/定::落点不许\(/g) || []).length === 1 && !/fn 在里子|fn 落点不许/.test(备份));
台.判('「不许写进这一棵树里」那一句在纯判断那一格里写着（Electron 那边没有这一道，是壳新添的）',
  定.includes('写进仓那句') && 定.includes('备份的落点落在程序这一棵树里'));
const 测试段 = (定.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0];
const 一颗测试 = 名 => {
  const 起 = 测试段.indexOf('fn ' + 名 + '()');
  if (起 < 0) return '';
  const 止 = 测试段.indexOf('\n    fn ', 起 + 1);
  const 止2 = 测试段.indexOf('\n    }', 起);
  return 测试段.slice(起, 止 > 0 ? Math.min(止, 止2 > 0 ? 止2 : 止) : 止2 > 0 ? 止2 : 测试段.length);
};
台.判('带 #[test] 且测试段里有断言', /#\[cfg\(test\)\][\s\S]*#\[test\]/.test(定));
台.判('钉住了「仓内子路径拒」（落点在这一棵树里面的某一颗 → is_some）',
  一颗测试('落点在仓里的子路径拒').includes('落点不许') && 一颗测试('落点在仓里的子路径拒').includes('is_some()'));
台.判('钉住了「.. 回退写法拒」',
  一颗测试('落点带回退写法拒').includes('落点不许') && 一颗测试('落点带回退写法拒').includes('is_some()')
  && 一颗测试('落点带回退写法拒').includes('..'));
台.判('钉住了「仓外的绝对地址放行」（回 None）',
  一颗测试('落点是仓外的绝对地址放行').includes('落点不许') && 一颗测试('落点是仓外的绝对地址放行').includes(', None)'));
台.判('钉住了「空串拒」（回的是那一头那句原话）',
  一颗测试('空串与只是空白的落点拒').includes('落点不许("", ') && 一颗测试('空串与只是空白的落点拒').includes('没定那句'));
台.判('钉住了「跑在被抄的那几处里面拒」，那一句与 backup.cjs 同字',
  一颗测试('落点跑在被抄的那几处里面拒得与原话一致').includes('换个文件夹再来')
  && 抄的那颗.includes("，换个文件夹再来'"));
台.判('纯判断那一格里没有第二份路径口径（不认 canonicalize、也不摸盘）',
  !定.includes('canonicalize') && !定.includes('std::env') && !定.includes('Command'));
台.判('这一道闸挡的是落点，不动被抄的那几处（默认那一处与页面点的几处照样端给页面）',
  备份.includes('要抄的几处') && 备份.includes('定::落点不许'));

台.题('四、backup:run 的回执形状与 backup.cjs 一格都不动');
const 成了支 = (抄的那颗.match(/return \{ ok:true[\s\S]*?\};/) || [''])[0];
const 主成了 = 取键(成了支);
台.数('backup.cjs 成了那一支有哪几格', 主成了.join(' '));
const 壳成了 = 壳字段(备份, '一份抄账');
台.数('壳里那一颗有哪几格', 壳成了.join(' '));
台.判('成了那九格同一串（ok msg 目录 抄 字 坏 数 错 收，一格不多一格不少）',
  主成了.length === 9 && JSON.stringify([...主成了].sort()) === JSON.stringify([...壳成了].sort()));
台.判('每一格都带 skip_serializing_if（停下来的那几种不该多带格子）',
  (备份.match(/skip_serializing_if = "Option::is_none"/g) || []).length >= 7);
const 主没收住 = 取键((抄的那颗.match(/return \{ ok:false, msg:'这一份没收住[\s\S]*?\};/) || [''])[0]);
台.数('那一头「这一份没收住」那一支有哪几格', 主没收住.join(' '));
台.判('这一支在壳里也回同样那七格（含 错 那一句要 concat 上来）',
  JSON.stringify([...主没收住].sort()) === JSON.stringify(['ok', 'msg', '目录', '抄', '字', '坏', '错'].sort())
  && 备份.includes('这一份没收住：') && 备份.includes('错.push(那句'));
const 主空手 = 取键((抄的那颗.match(/return \{ ok:false, msg:'一处都没读到[\s\S]*?\};/) || [''])[0]);
台.判('一处都没读到那一支回 ok msg 错 数 四格，数那一格是 0',
  JSON.stringify([...主空手].sort()) === JSON.stringify(['ok', 'msg', '错', '数'].sort())
  && 备份.includes('一处都没读到，什么都没抄') && 备份.includes('数: Some(0)'));
台.判('没定落点那一句两头同一串', 抄的那颗.includes("还没定备份到哪一个文件夹") && 定.includes("还没定备份到哪一个文件夹"));
/* prune 在 backup.cjs 里是缩进两格的内层函数，切() 那颗只认顶格声明 —— 自己按名字切一段就够 */
const prune段 = 抄的那颗.slice(抄的那颗.indexOf('async function prune'), 抄的那颗.indexOf('async function last'));
const 主收 = [...new Set([...prune段.matchAll(/return (\{[^}]*\})/g)].flatMap(m => 取键(m[1])))];
const 壳收 = 壳字段(备份, '一份收');
台.数('prune 回的那几格 / 壳里那一格回的哪几格', 主收.join(' ') + ' | ' + 壳收.join(' '));
台.判('收旧份那一格（删 留 半 错）同一串',
  JSON.stringify([...主收].sort()) === JSON.stringify([...壳收].sort()));
台.判('半成品那一道顶两头同一个数（半小时开外才收，照 18e5）',
  抄的那颗.includes('18e5') && 备份.includes('1_800_000'));
台.判('只收自家造的、里头有备份清单的那几颗：名字那一式与清单名两头同一个',
  定.includes('FD-') && 抄的那颗.includes('/^FD-\\d{4}-\\d{2}-\\d{2}-\\d{4}$/')
  && 定.includes('备份清单.txt') && 抄的那颗.includes("MANIFEST = '备份清单.txt'")
  && 定.includes('.正在写') && 抄的那颗.includes("DOING = '.正在写'"));
台.判('多大那一句三档的算法照那一头（字节 / KB / MB 那两个分界点一个数都没改）',
  抄的那颗.includes('字 < 1024') && 抄的那颗.includes('10485760') && 定.includes('10_485_760') && 定.includes('报多大'));
台.判('时间戳那一大式两头同一形（本地时分、月日补零、时与分并排）',
  抄的那颗.includes("'FD-' + d.getFullYear()") && 定.includes('FD-{:04}-{:02}-{:02}-{:02}{:02}'));
台.判('到点没与下一回那两手照 due / nextAt（off 与没开着都算不到点，没抄过当场算到点）',
  抄的那颗.includes("if(!cfg.on || !分) return false") && 定.includes('if !开着 || 分 == 0')
  && 抄的那颗.includes('if(!lastAt) return true') && 定.includes('if 上回时 == 0'));
台.判('backup:check 回的那四格同一串',
  抄的那颗.includes('return { 上回:名, 上回时:时, 到点:due(cfg, 时), 下一回:nextAt(cfg, 时) }')
  && JSON.stringify(壳字段(备份, '一份到点')) === JSON.stringify(['上回', '上回时', '到点', '下一回']));
台.判('backup:last 没抄过、那一格读不到都回空串（两头都是空串，不是 null 也不是抛）',
  抄的那颗.includes('if(!dest) return') && 备份.includes('return String::new()')
  && !/pub async fn backup_last[\s\S]*?-> Option/.test(备份));

台.题('五、img:peek 回的是裸字节，半路没化成字符串');
台.判('data 地址那个形状由纯判断那一格拼（data: 打头、mime 在中间、;base64, 接原文）',
  /"data:\{\};base64,\{\}"/.test(节));
台.判('壳里读进来的是裸字节（fs::read → Vec<u8>），直接进 base64 那颗',
  /let 节 = match fs::read\(路\)/.test(图) && 图.includes('包成data地址(mime, &节)'));
台.判('base64 那颗的入参是 &[u8]，出的是一串字（半路没有 String 换算这一步）',
  /pub fn 裸字节转那一串\(节: &\[u8\]\) -> String/.test(节) && /pub fn 包成data地址\(mime: &str, 节: &\[u8\]\)/.test(节));
台.判('动手那一本里一次都没有把字节化成字符串的手（from_utf8 / to_string_lossy / read_to_string 都不许有）',
  !图.includes('from_utf8') && !图.includes('to_string_lossy') && !图.includes('read_to_string'));
台.判('测试拿一段故意不是 UTF-8 的字节钉住了它（JPEG 的头 0xFF 0xD8 打头）',
  /let 头: Vec<u8> = vec!\[0xFF, 0xD8, 0xFF, 0xE0/.test(节) && /裸字节转那一串\(&头\), "\/9j/.test(节));
台.判('成了那一格六栏同一串（ok url w h big miss，页面上取的就是这几个名字）',
  JSON.stringify(壳字段(图, '一张缩略')) === JSON.stringify(['ok', 'url', 'w', 'h', 'big', 'miss']));
台.判('不成那一格只有 ok 与 miss 那一栏（不是 msg —— 名字换了页面上就取不到）',
  图.includes('miss: Some(那句)') && !壳字段(图, '一张缩略').includes('msg'));
台.判('img:peek 认不成尺寸的那一类回 0 0（不是 null、也不抛）',
  图.includes('unwrap_or((0, 0))') && /pub fn 认宽长|fn 认宽长/.test(节));
const 壳线 = 节.split(/\r?\n/).filter(l => /^\s+".*\s=>\s"image\//.test(l)).map(l => l.trim().replace(/,$/, ''));
const 期线 = ['".png" => "image/png"', '".jpg" | ".jpeg" => "image/jpeg"', '".gif" => "image/gif"',
  '".webp" => "image/webp"', '".bmp" => "image/bmp"', '".svg" => "image/svg+xml"'];
台.数('壳那张表有哪几行', 壳线.join(' | '));
台.判('后缀那一张表把这七种写法一种不落全认了，且一行都不许多认',
  JSON.stringify(壳线) === JSON.stringify(期线));
台.判('认不出后缀的退法是 image/png，不是 octet-stream', /_ => "image\/png"/.test(节));
台.判('那一道 64 MB 的顶钉住了（纯判断那一格里一颗常量，动磁盘那一层只叫它）',
  /pub const 太大的字节: u64 = 64 \* 1024 \* 1024;/.test(节) && !/64 \* 1024 \* 1024/.test(图));
台.判('那一档宽的算法钉住（max 64、min 1200、不是数按 360）',
  节.includes('clamp(64, 1200)') && /_ => 360,/.test(节));
台.判('先自己确认那一份在不在才交给系统（免得 Windows 弹系统模态框把这一路卡死）',
  图.includes('fs::metadata(路).map(|m| m.is_file())'));
台.判('img:open 回的是 { ok, msg } 那一格（系统那句原话递给页面，空串就是成了）',
  /pub struct 一个开图 \{\s+ok: bool,\s+msg: String,/.test(图));

台.题('六、四颗备份的默认那一处与候选那一串');
台.判('默认那一处钉死：label 叫「数据」、dir 是 <树根>\\data',
  备份.includes('label: "数据"') && 备份.includes('data_cmds::数据层格()'));
台.判('数据层那一格与 data_cmds 共用一颗（不另起第二份口径）',
  /pub(\(crate\))? fn 数据层格\(\) -> PathBuf \{ crate::tree_root\(\)\.join\("data"\) \}/.test(rd('src/_tauri/src/tauri_bind/data_cmds.rs')));
台.判('backup:roots 就是只给默认那一处，不读这台机器的位置登记',
  /pub async fn backup_roots\(\) -> Vec<一处根> \{\s*要抄的几处\(&Value::Null\)/.test(备份));
台.判('壳里没有去读那一份位置登记的口子（那一颗不进仓、Rust 也读不动，落点只能由页面递进来）',
  !备份.includes('本地路径') && !统.includes('本地路径') && !备份.includes("require("));
台.判('外加的那几处走 cfg.extra 递进来，名字撞了要给号',
  备份.includes('format!("{}-{}", r.label, 次 + 1)'));
台.判('落点由页面递进来（壳不自己认「该备份到哪儿」）',
  备份.includes('栏文(单, "dest")'));
台.判('backup:run 收的那一格是页面递的那一整格 cfg（一栏，桥里那一颗递法钉住）',
  桥.includes("invoke('backup:run', cfg && typeof cfg === 'object' ? cfg : {})"));

台.题('七、sys:rebuild 与 web:title');
台.判('那两步的标签与百分比钉死（8 与 92）', 统.includes('label: "生成 Flow-Desk 页面".to_string(), pct: 8')
  && 统.includes('pct: 92'));
for (const 件 of ['rebuild:step', 'rebuild:done'])
  台.判('事件名「' + 件 + '」两头同一串（壳里送得出，桥里听的也是这一颗）',
    桥.includes("'" + 件 + "'") && 统.includes('"' + 件 + '"'));
台.判('rebuild:done 那一份带的是 files 那一格（写了哪几份）',
  JSON.stringify(壳字段(统, '一份写完')) === JSON.stringify(['files']));
台.判('那一串是从 stdout 里挑 WROTE 打头那几行', 统.includes('starts_with("WROTE")'));
台.判('没记下源码在哪儿那一句原话钉住（界面上读的就是这一串）', 统.includes('这台机器没记下源码在哪儿，重新构建不了'));
台.判('找不到构建脚本那一句在，落点是 <源码格>\\_fd\\build.mjs',
  统.includes('找不到构建脚本：') && 统.includes('join("_fd").join("build.mjs")'));
台.判('FD_TREE 一起带过去（构建脚本才知道该往哪棵树生成）', 统.includes('env("FD_TREE"'));
台.判('失败那一句带得上退出码，不是零就算败',
  /Flow-Desk 页面构建失败（\{\}）：\\n\{\}/.test(统) && 统.includes('得.0'));
台.判('成了那句：没听说写了哪个文件也有个交代', 统.includes('构建跑完了，但没听说写了哪个文件'));
台.判('web:title 任何一步不成都回空串（不抛、不回 null）',
  /pub async fn web_title\(url: String\) -> String/.test(网) && !/-> Option<String>/.test(网));
台.判('只认 http 与 https 那两种方案（判断住在纯判断那一格）',
  /if 方 != "http" && 方 != "https"/.test(页) && /pub fn 肯取的地址/.test(页));
台.判('四秒这一道兜底在（等不到就算了，不挂在这儿）', 网.includes('const 四秒: u32 = 4000'));
台.判('那个 User-Agent 一字没改', 网.includes('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'));
台.判('状态码不是 2xx 就算了', 网.includes('200..300'));
台.判('标题那一截最长四百字、洗完留一百二十个字',
  页.includes('最长一截: usize = 400') && 页.includes('留多少字: usize = 120'));
台.判('那六条命名实体一条都不许多加（htmlTitle 那张表）',
  ['nbsp', 'quot', 'apos', 'lt', 'gt', 'amp'].every(x => 页.includes('"' + x + '"')) && !页.includes('"euro"'));

台.题('八、纯判断那三格不动磁盘、不认识壳');
for (const 禁 of ['std::fs', 'File::open', 'File::create', 'fs::write', 'read_to_string', 'tauri::',
  'create_dir', 'remove_dir', 'remove_file', 'AppHandle', 'emit(', 'std::process', 'WinInet'])
  台.判('纯判断那三格里没有「' + 禁 + '」', !那三格.includes(禁));
台.判('动磁盘的那一手在第三层（备份那一本里真有 std::fs）', 备份.includes('use std::fs;'));
台.判('那三格各带一颗 mod 验判断', (那三格.match(/mod 验判断/g) || []).length === 3);
const 新测试 = [定, 页, 节].reduce((a, s) => a + ((s.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0].match(/#\[test\]/g) || []).length, 0);
台.数('这一批纯判断那一格新增几颗测试', 新测试 + ' 颗');
台.判('新增不少于十六颗', 新测试 >= 16);
const 全测试 = fs.readdirSync(path.join(ROOT, 'src', '_tauri', 'src', 'core')).filter(f => f.endsWith('.rs'))
  .map(f => fs.readFileSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', f), 'utf8'))
  .join('').match(/#\[test\]/g) || [];
台.数('全仓纯判断那一格的测试总数', 全测试.length + ' 颗');
台.判('总数比上一批的 53 颗多了（不许多加不减，也不许把旧的撤掉）', 全测试.length > 53);

台.题('九、这一批的账（拿桥那一份与壳的注册单对，不再拿 Electron 主进程当标准答案）');
const 这批 = 批.map(x => x[0]);
const 缺 = 对名单(这批, 桥, 壳注册单());
台.数('这一批几颗', 这批.length + ' 颗：' + 这批.join(' '));
台.判('这一批每一颗桥都请得到（页面上喊得出来这一颗）', 缺.桥没请.length === 0, 缺.桥没请);
台.判('这一批每一颗都在壳的注册单上（搬齐了，不留半截桥）', 缺.单没注册.length === 0, 缺.单没注册);
/* 全体覆盖率只在一处数：桥请的一颗都不许在单外 —— 那条钉在 gate-bridge46 第三节，
   从前这五道各数一遍「已搬 63 / 63」还互相核对数字，一处搬完要在五本里改五个数，改漏一个就是假绿 */
台.判('那把总账的尺只有一把（在 gate-bridge46 那一台里，这一台不抄第二份）',
  rd('src/tools/probes/gate-bridge46.mjs').includes('请壳的一颗都不许在单外') &&
  !/已搬\.length ===/.test(rd('src/tools/probes/gate-tauribackup46.mjs')));
台.收尾();
