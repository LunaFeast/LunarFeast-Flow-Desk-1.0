/* ============================================================
   gate-taurimedia46.mjs · 外46 三 批四：音乐遥控器那一摊的九颗搬进壳 · 批五：又添那四颗
   ------------------------------------------------------------
     node src/tools/probes/gate-taurimedia46.mjs
   钉的是这么几件事，一条都不许放宽：
     一、这两批 13 颗（批四那九颗：media:state / hold / release / cmd / players / pin 加 vol:get / set / mute；
        批五那四颗：media:dirPick / media:dirSet / media:flag / media:bridge）
        每一颗在壳里都有对应的一颗命令，而且都上了 main.rs 的注册单 —— 没上单等于不存在；
     二、桥里这 13 颗不再是「这颗通道还没搬进壳」：参表里有名、栏名与顺序对得上桥里递的实参个数，
        参数名里一个下划线都没有，也没有拿 app / 手 / 窗口 / 状态 / 事件 打头的冒充页面栏；
     三、回给页面的形状逐字段对：那一头 return 的是哪几格、这一头的 struct 就是哪几格，
        包括 playState() 那五栏（含驼峰那一栏 mbPath —— 靠 serde 改名保住页面上那一个字）、
        dirPick 两支的格子差（挑成了才有 music 与 msg，取消了只有 kept）、
        bridge 那五支的并集（found / busy / dir / to / kb 各是哪一支才出现）；
     四、值域逐条对（这几样最容易凭印象改）：
        · 音量是 0~100 的整数，不是 0~1；两头换算（系统 scalar 0.0~1.0 ↔ 页面那一档）都在纯判断那一格；
        · 静音三档的字面量与那句严格相等（0|'off' → 0，1|'on' → 1，其余 → 2 切换）；
        · media:cmd 认的那九条命令串，一种不落一种不许多、顺序也照原件；
        · 三道闸那三句原话逐字（没装 / 没挂 / 音量那道只看装没装）；
        · 挂账的加一减一与「归零就收监听」；挑会话的先后、那六个状态字面量、快照那十几栏；
        · 批五：开关名只留 [\w-] 截 24、那句「开关名不对」；开关值去行内换行截 200、
          null 与没递都当空串；单键读写 —— 改一栏位置不动、盘上没这一栏才添尾巴、现值一样一个字都不写；
          挑框那句题；找 MusicBee 那六摆与另两摆的序；包里那一颗的拆法（不许爬出包外）；
          千字节是四舍五入；桥那四句话逐字；
     五、上面那些值域与那几句拒话只写 in 纯判断那一格，动手那两层一个字都不重写（重写就是第二份真身）；
     六、慢调用一律不占主线程：SMTC 那一整趟在一条自己的线程 + 一台只跑它的运行时上，
        批四那六颗 media 命令本身只是记账与递话；vol 那三颗是 async，每一颗一趟后台线程 + 三秒超时，
        滑杆 90ms 合并那一趟也在自己的线程上睡；批五的 dirPick（等用户点框）与 bridge（数盘找目录）同样是 async；
     七、这一批新添的四档 windows feature，每一档上面那段注释都点得出是哪几颗命令要用的，
        且旧的那批一档都没被撤（批五一颗都没添 —— 注册表那一档批四之前就在了）；
     八、明写着没搬齐 / 做不全等的几处（音量那颗 COM 回调、MusicBee 桥插件那条近路、players 那一份文件监听、
        找 MusicBee 少了「正在跑的那一家」那一条、桥那颗的源落的是包里原位置）
        在代码里看得见这句话，不许哪天悄悄删了注释当成已经搬齐（logLine 那两笔原来也在这条账上，
        批六第三步把 data\logs 那一格搬过来了，改口成"照原件落"）；
     九、纯判断那一格（media_rule）不动磁盘、不认识壳，带 30 颗以上测试，全仓测试总数比上一批多；
     十、这一批那十三颗每一颗桥都请得到、都在壳的注册单上；主.rs 顶上不再写「还剩几颗没搬」那一句，总账那把尺只在 gate-bridge46 那一处。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { rd, 记账, 切, ROOT, 对名单, 壳注册单 } from './lib-slice.mjs';

const 台 = 记账('gate-taurimedia46');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 壳 = rd('src/_tauri/src/main.rs');
const 动 = rd('src/_tauri/src/tauri_bind/media_cmds.rs');
const 声 = rd('src/_tauri/src/tauri_bind/vol_cmds.rs');
const 纯 = rd('src/_tauri/src/core/media_rule.rs');
const 清单 = rd('src/_tauri/Cargo.toml');
const 声明 = rd('src/_tauri/src/tauri_bind/mod.rs');
const 判声明 = rd('src/_tauri/src/core/mod.rs');
const 两层 = 动 + '\n' + 声;
const 音乐脚本 = rd('data/plugins/music-remote/smtc-watcher.ps1');
const 音量脚本 = rd('data/plugins/music-remote/vol-watcher.ps1');

/* 名字换算与桥里那一颗同一式子：冒号变下划线、驼峰变下划线小写 */
const 换 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
/* 每一颗：通道名、壳里的命令名、落在哪一本、页面该递哪几栏（栏名照 Rust 声明顺序） */
const 批 = [
  ['media:state', 'media_state', 'media_cmds', []],
  ['media:hold', 'media_hold', 'media_cmds', []],
  ['media:release', 'media_release', 'media_cmds', []],
  ['media:cmd', 'media_cmd', 'media_cmds', ['msg']],
  ['media:players', 'media_players', 'media_cmds', []],
  ['media:pin', 'media_pin', 'media_cmds', ['target']],
  ['vol:get', 'vol_get', 'vol_cmds', []],
  ['vol:set', 'vol_set', 'vol_cmds', ['v']],
  ['vol:mute', 'vol_mute', 'vol_cmds', ['mode']],
  /* 批五那四颗：挑音乐文件夹、记音乐文件夹、开关单键读写、给 MusicBee 装监听插件 */
  ['media:dirPick', 'media_dir_pick', 'media_cmds', []],
  ['media:dirSet', 'media_dir_set', 'media_cmds', ['p']],
  ['media:flag', 'media_flag', 'media_cmds', ['k', 'v']],
  ['media:bridge', 'media_bridge', 'media_cmds', []],
];
const 那本 = 本 => (本 === 'media_cmds' ? 动 : 声);

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
/* 从一颗 Rust struct 里取字段名（Rust 那一位怎么写就怎么念；带 #[serde] 那行跳过；
   字段前那句 pub / pub(crate) 不算字段名，跨本要用的那一格（一个成不成）就是带着它的） */
function 壳字段(源, 名) {
  const 块 = 壳块(源, 名);
  return [...new Set([...块.matchAll(/^\s{4}(?:pub(?:\([^)]*\))?\s+)?(?:#\[serde\([^\n]*\)\]\s*)?([A-Za-z0-9_\u4e00-\u9fff]+)\s*:/gm)].map(m => m[1]))];
}
/* 序列化之后页面上念的那几个键名（改了名的那一栏按页面上那个念） */
function 壳键(源, 名) {
  const 块 = 壳块(源, 名);
  const 出 = [];
  for (const m of 块.matchAll(/^\s{4}(?:pub(?:\([^)]*\))?\s+)?(?:#\[serde\(rename = "([^"]+)"\)\]\s*)?([A-Za-z0-9_\u4e00-\u9fff]+)\s*:/gm)) {
    出.push(m[1] || m[2]);
  }
  return [...new Set(出)];
}
function 壳块(源, 名) {
  const 干净 = 源.replace(/\/\*[\s\S]*?\*\//g, '');
  return (干净.match(new RegExp('(?:pub )?struct ' + 名 + ' \\{[\\s\\S]*?\\n\\}')) || [''])[0];
}
/* 纯判断那一格里 pub const X: &str = "..."; 那一批字面值 */
function Rust串(源) {
  const 出 = {};
  for (const m of 源.matchAll(/pub const ([A-Za-z0-9_\u4e00-\u9fff]+): &str = "([^"]*)";/g)) 出[m[1]] = m[2];
  return 出;
}
/* 剥掉注释只看代码本身 */
function 去注(源) {
  let s = String(源);
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/^\s*\/\/.*$/gm, ' ');
  return s;
}
const 动码 = 去注(动), 声码 = 去注(声), 两层码 = 动码 + '\n' + 声码;
const 纯串 = Rust串(纯);
const 测试段 = (纯.match(/#\[cfg\(test\)\][\s\S]*$/) || [''])[0];

台.题('一、这两批 13 颗：页面请的每一颗，壳里都有一座，且都上了注册单');
台.数('这两批点名的通道', 批.length + ' 颗 · ' + 批.map(x => x[0]).join(' '));
台.判('点的就是 13 颗（批四九颗 + 批五四颗），不多不少', 批.length === 13);
for (const [通道, 名, 本] of 批) {
  台.判(通道 + ' 的通道名换算过去就是 ' + 名, 换(通道) === 名);
  台.判(通道 + ' 在壳里有对应的一颗（' + 本 + '.rs 里有 pub fn ' + 名 + '）',
    new RegExp('pub (?:async )?fn ' + 名 + '\\s*\\(').test(那本(本)));
  台.判(通道 + ' → ' + 名 + ' 在 main.rs 的注册单上', 壳.includes(本 + '::' + 名));
}
台.数('这两本各有几颗命令标记', [动, 声].map(s => (s.match(/#\[[^\]]*tauri::command/g) || []).length).join(' + '));
台.判('两本合起来正好 13 颗（多一颗就是往这两本里塞了没点名的通道）',
  [动, 声].reduce((a, s) => a + (s.match(/#\[[^\]]*tauri::command/g) || []).length, 0) === 13);
台.判('这两本里没有这十三颗之外的命令名',
  [...动.matchAll(/#\[[^\]]*tauri::command[^\]]*\]\s*pub (?:async )?fn (\w+)/g),
   ...声.matchAll(/#\[[^\]]*tauri::command[^\]]*\]\s*pub (?:async )?fn (\w+)/g)]
    .map(m => m[1]).every(名 => 批.some(x => x[1] === 名)));
for (const 本 of ['media_cmds', 'vol_cmds'])
  台.判('模块声明在这本上（tauri_bind/mod.rs 认 ' + 本 + '）', new RegExp('pub mod ' + 本 + ';').test(声明));
台.判('纯判断那一格认 media_rule', /pub mod media_rule;/.test(判声明));

台.题('二、桥里这 13 颗不再是「还没搬」');
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
台.判('media:cmd 那一颗收的是桥拼好的那一个对象（cmd + pos + app 三样挤在一栏 msg 里）',
  /pub fn media_cmd\(手: State<'_, 媒体手>, app: AppHandle, msg: Value\) -> 一个成不成/.test(动)
  && 桥.includes("{ cmd: String(cmd || ''), pos: Number(pos) || 0, app: app === undefined ? '' : String(app) }"));
台.判('media:pin 那一颗的参数不叫 app（那会被桥当成不给页面的那一类），页面上那一串实参照样对得上',
  /pub fn media_pin\(手: State<'_, 媒体手>, target: String\)/.test(动)
  && 桥.includes("invoke('media:pin', String(app || ''))"));
台.判('vol:set 与 vol:mute 收的是页面那一条数（v / mode），vol:get 一栏都不收',
  /pub async fn vol_set\(app: AppHandle, v: serde_json::Value\)/.test(声)
  && /pub async fn vol_mute\(app: AppHandle, mode: serde_json::Value\)/.test(声)
  && /pub async fn vol_get\(app: AppHandle\)/.test(声));
台.判('hold 与 release 按窗口记挂账（按 e.sender.id 数那一手换成了按窗口名，不是全局一个数）',
  /pub fn media_hold\(手: State<'_, 媒体手>, 窗口: tauri::Window/.test(动)
  && /pub fn media_release\(手: State<'_, 媒体手>, 窗口: tauri::Window/.test(动)
  && 动.includes('窗口.label()') && /挂: Mutex<HashMap<String, u32>>/.test(动));
台.判('这十三颗都不朝页面抛错（兜底那一步在桥里包 try/catch），壳里十三颗返回的类型一个 Result 都没有',
  !/pub (?:async )?fn (?:media|vol)_\w+\([^)]*\) -> Result/.test(两层));
/* ---- 批五那四颗的栏与名 ---- */
台.判('media:dirPick 一栏都不收（页面上那句 mediaDirPick() 就是空手请），框挂在发话那一张窗上靠 窗口 那一栏',
  /pub async fn media_dir_pick\(窗口: tauri::Window, app: AppHandle\) -> 一个目录回执/.test(动)
  && 桥.includes("invoke('media:dirPick')"));
台.判('media:dirSet 收的那一栏就叫 p（页面递的是 String(p || \'\')）',
  /pub fn media_dir_set\(p: String\) -> 一个成不成/.test(动)
  && 桥.includes("invoke('media:dirSet', String(p || ''))"));
台.判('media:flag 收两栏（k + v），v 是 Option<Value>：页面那头那一栏可以整个不递（undefined），'
    + '桥就不把它塞进包里，缺参数的话就不是回空串而是当场报错',
  /pub fn media_flag\(k: String, v: Option<Value>\) -> 一个成不成/.test(动)
  && 桥.includes("invoke('media:flag', String(k || ''), v)"));
台.判('media:bridge 一栏都不收（页面上那颗按钮就是空手请）',
  /pub async fn media_bridge\(\) -> 一个桥回执/.test(动) && 桥.includes("invoke('media:bridge')"));

台.题('三、回给页面的形状逐字段对（那一头哪几格，这一头就哪几格）');
台.判('media:state 回的就 supported + msg + state 三格（两支都是这三格）',
  JSON.stringify(壳字段(动, '一份媒体状态')) === JSON.stringify(['supported', 'msg', 'state']));
台.判('壳里那一颗回的是 !死掉 + 话 + 最新，一位不错位',
  /一份媒体状态 \{ supported: !守\.死掉, msg: 守\.话\.clone\(\), state: 守\.最新\.clone\(\) \}/.test(动));
台.判('广播那一格多一栏 ev（推出去的那一行四格，supported 恒真）',
  JSON.stringify(壳字段(动, '推的一行')) === JSON.stringify(['supported', 'msg', 'state', 'ev'])
  && 动.includes('supported: true'));
台.判('hold / release 回的都是 ok + holds 两格',
  JSON.stringify(壳字段(动, '一个挂账')) === JSON.stringify(['ok', 'holds']));
台.判('media:cmd 回的都是 ok + msg 两格（闸、不认、送不出去、写崩了四种款式同一张形状）',
  JSON.stringify(壳字段(动, '一个成不成')) === JSON.stringify(['ok', 'msg']));
台.判('media:players 回 ok + state 两格，state 是那张小抄的五栏',
  JSON.stringify(壳字段(动, '一个播放器清单')) === JSON.stringify(['ok', 'state'])
  && JSON.stringify(壳键(动, '一份小抄')) === JSON.stringify(['pin', 'mbPath', 'music', 'flags', 'dir']));
台.判('驼峰那一栏靠 serde 改名保住页面上那个字（Rust 那位按下划线的规矩写）',
  动.replace(/\/\*[\s\S]*?\*\//g, '').includes('#[serde(rename = "mbPath")]\n    mb_path: String,')
  && 壳键(动, '一份小抄').includes('mb_path') === false);
台.判('media:pin 回的是一个成不成（只有 ok + msg，没套 try）',
  /pub fn media_pin\(手: State<'_, 媒体手>, target: String\) -> 一个成不成/.test(动));
/* ---- 批五那四颗回给页面的格子 ---- */
台.判('media:dirPick 两支的格子不一样：取消了只有 ok + kept，挑成了是 ok + msg + music（可空那几格不带出去就不带）',
  JSON.stringify(壳字段(动, '一个目录回执')) === JSON.stringify(['ok', 'msg', 'music', 'kept'])
  && (动.match(/skip_serializing_if = "Option::is_none"/g) || []).length === 9);
台.判('取消那一支念的是当前那一行（读的是音乐目录那一份件名）',
  /kept: Some\(读一份\(判::音乐目录件名\)\)/.test(动));
台.判('挑成了那一支先写盘再回写出去那一句（ok 与 msg 都是那一份的）',
  /let 得 = 写一份\(判::音乐目录件名, &串\);/.test(动));
台.判('media:dirSet 整颗就是一个成不成（一格都不许多），借的是 media:pin 那一格',
  /pub fn media_dir_set\(p: String\) -> 一个成不成/.test(动)
  && 动.includes('写一份(判::音乐目录件名, &p)'));
台.判('media:flag 回的是一个成不成（{ ok, msg } 两格，那张表本身不回页面）',
  /pub fn media_flag\(k: String, v: Option<Value>\) -> 一个成不成/.test(动)
  && 纯.includes('"开关名不对"') && 纯.includes('pub fn 该不该写(现值: &str, 新值: &str)'));
台.判('media:bridge 那一颗回的形状就是 一个桥回执 那七格，一种不多一种不少',
  JSON.stringify(壳字段(动, '一个桥回执')) === JSON.stringify(['ok', 'found', 'busy', 'dir', 'to', 'kb', 'msg']));
台.判('那一头两处 msg 是「没装」与「包里没件」两支共用的形状，壳里两处都只填 msg 一格',
  (动.match(/msg: Some\(判::桥没装那句\.to_string\(\)\)/g) || []).length === 1
  && (动.match(/msg: Some\(判::桥没件那句\.to_string\(\)\)/g) || []).length === 1);
台.判('vol:get 回的就 supported + msg + state 三格（两支都是这三格）',
  JSON.stringify(壳字段(声, '一份音量状态')) === JSON.stringify(['supported', 'msg', 'state']));
台.判('state 里那两栏是 vol + muted',
  JSON.stringify(壳字段(声, '一份读数')) === JSON.stringify(['vol', 'muted']));
台.判('vol:set 成是 ok + vol、挡是 ok + msg（两栏都是「有才有」，可空那两格不带出去就不带）',
  JSON.stringify(壳字段(声, '一个音量回执')) === JSON.stringify(['ok', 'vol', 'msg'])
  && (声.match(/skip_serializing_if = "Option::is_none"/g) || []).length === 2);
台.判('vol:mute 成只回 ok:true、挡只回 ok + msg（借的是 media:cmd 那一格，两栏不多）',
  /pub async fn vol_mute\(app: AppHandle, mode: serde_json::Value\) -> 一个成不成/.test(声)
  && JSON.stringify(壳字段(动, '一个成不成')) === JSON.stringify(['ok', 'msg']));
台.判('广播那两路的事件名两头同一串：桥里听的与壳里喊的是同一颗（media:state / vol:state）',
  桥.includes("'vol:state'") && 桥.includes("'media:state'")
  && 声.includes('"vol:state"') && 动.includes('"media:state"'));
台.判('壳里三颗命令的返回类型各就各位，没借别本的形状',
  /pub fn media_state\(.*\) -> 一份媒体状态/.test(动)
  && /pub fn media_players\(\) -> 一个播放器清单/.test(动)
  && /pub async fn vol_get\(app: AppHandle\) -> 一份音量状态/.test(声));

台.题('四、值域逐条钉（音量范围、静音三档、认哪些命令串、那三道闸）');
台.判('脚本那头推上来的也是 0~100：Pct() 先乘 100 再四舍五入再夹两头，协议顶上写的就是 <0-100 int>',
  音量脚本.includes('static int Pct(float scalar)')
  && 音量脚本.includes('Math.Round((double)scalar * 100.0)')
  && 音量脚本.includes('"vol":<0-100 int>')
  && 音量脚本.includes('{"cmd":"set","vol":<0-100>}'));
台.判('纯判断那一格的取值式钉住：round 完 clamp 0..100，不是数当 0',
  /pub fn 音量取值\(给: Option<f64>\) -> u32 \{[\s\S]*?v\.round\(\)\.clamp\(0\.0, 100\.0\) as u32[\s\S]*?_ => 0,/.test(纯)
  && 纯.includes('Some(v) if v.is_finite()'));
台.判('两头换算都在纯判断那一格：比例是 档/100，百分比是先乘 100 再 round 再夹',
  /pub fn 音量比例\(档: u32\) -> f32 \{\s*档\.min\(100\) as f32 \/ 100\.0\s*\}/.test(纯)
  && 纯.includes('(scalar as f64 * 100.0).round().clamp(0.0, 100.0) as u32')
  && 音量脚本.includes('epv.SetMasterVolumeLevelScalar(v / 100.0f, ref g);'));
台.判('动手那一层一个字都没重写值域：两本里搜不到 100 那个数，也搜不到夹住写法',
  !两层码.includes('100') && !两层码.includes('clamp(0.0') && !两层码.includes('min(100')
  && 声.includes('判::音量比例(*档)') && 声.includes('判::音量百分比(值)') && 声.includes('判::音量取值(v.as_f64())'));
台.判('静音那三档的严格相等钉在纯判断那一格（0|off → 0，1|on → 1，其余 2），顶上注释写着三档各是什么',
  纯.includes('递来的::是个数(v) if *v == 0.0 => 0,') && 纯.includes('递来的::是个数(v) if *v == 1.0 => 1,')
  && 纯.includes("递来的::是个字(s) if s == \"off\" => 0,") && 纯.includes("递来的::是个字(s) if s == \"on\" => 1,")
  && 纯.includes('0 = 取消静音，1 = 静音，2 = 切换'));
台.判('桥那头 mode 没递就当 2（默认切换）—— 壳里那一栏拿到的就是数 2',
  桥.includes("invoke('vol:mute', mode === undefined ? 2 : mode)"));
台.判('脚本那头的注释与算法同一档（0 off, 1 on, 2 toggle；切换就是翻现况）',
  音量脚本.includes('public static string Mute(int on)   // 0 off, 1 on, 2 toggle')
  && 音量脚本.includes('bool want = on == 2 ? !m : on == 1;')
  && 音量脚本.includes('{"cmd":"mute","on":<0|1|2>}'));
台.判('切换那一档翻现况、0 关 1 开；「设音量 >0 顺带撤静音」那条也在纯判断那一格',
  /0 => false,\s*1 => true,\s*_ => !现况/.test(纯.split('pub fn 静音开不开')[1] || '')
  && 音量脚本.includes('if (v > 0) epv.SetMute(false, ref g);')
  && 纯.includes('pub fn 设音量要撤静音吗(档: u32) -> bool')
  && 声.includes('判::静音开不开(*档, 现.1)') && 声.includes('判::设音量要撤静音吗(*档)'));
台.判('壳里那句「送不动就回 ok:false」用的兜底话逐字钉住（音量监听没起来）',
  纯串.音量监听没起来那句 === '音量监听没起来' && 声.includes('判::音量监听没起来那句'));
台.判('脚本那头的英文换成界面那句中文那五条也搬了（watcher closed / command failed / denied…）',
  纯.includes('"音量监听收摊了，正在重起"') && 纯.includes('"音量命令没执行成"')
  && 纯.includes('"系统不让改音量（权限被拒）"') && 纯.includes('"音量监听出了岔子，原话进了日志"')
  && 纯.includes('"音量监听停了"') && 音量脚本.includes('watcher closed') && 音量脚本.includes('command failed'));
const 那九条 = ['play', 'pause', 'toggle', 'next', 'prev', 'stop', 'seek', 'snapshot', 'pick'];
const Rust九 = [...(纯.match(/pub const 认的命令: \[&str; (\d+)\] = \[([^\]]+)\];/) || ['', '', ''])[2]
  .matchAll(/"([^"]+)"/g)].map(m => m[1]);
台.数('media:cmd 认的命令串有几条', Rust九.length + ' 条');
台.判('那九条一种不落一种不许多、顺序也钉住', JSON.stringify(Rust九) === JSON.stringify(那九条));
台.判('脚本 stdin 认的也是同一批（九条都在它那两个 if 链里，seek 那条换算 10000 一拍）',
  那九条.every(c => 音乐脚本.includes('cmd == "' + c + '"'))
  && 音乐脚本.includes('TryChangePlaybackPositionAsync(pos * 10000L)')
  && 纯.includes('pub fn 毫秒计数(毫秒: i64) -> i64') && 纯.includes('毫秒.saturating_mul(10_000)'));
台.判('不认那一句与送不出去那一句逐字钉住（全角冒号也算）',
  纯串.不认那句 === '不认的媒体命令：' && 纯串.监听没起来那句 === '媒体子进程没起来'
  && 动.includes('判::不认那句') && 动.includes('判::监听没起来那句'));
台.判('pick 那一支递名字、其余递进度，pos 负数与不是数都按 0，名字截 300',
  纯.includes('pub fn 命令递的是名字吗') && 纯.includes('pub fn 进度取值') && 纯.includes('pub fn 截三百')
  && 动.includes('判::进度取值(') && 动.includes('判::截三百('));
台.判('media:cmd 的 pick 递成功了才写 pin.txt（写盘那句回执不报给页面）',
  动.includes('if 判::命令递的是名字吗(&串) {') && 动.includes('写一份(判::钉住件名, &名字)'));
台.判('三道闸那三句原话逐字，且音量那道只看装没装',
  纯串.没装那句 === '音乐遥控器这一家还没加载 · 想听歌去「插件管理」里按「加载」'
  && 纯串.没挂那句 === '这一处桌面上没有挂着音乐遥控器 · 挂上来就开始监听'
  && 纯串.音量没装那句 === '音乐遥控器这一家还没加载 · 系统音量控制长在这个插件里'
  && 纯.includes('pub fn 音量闸(装了: bool)'));
台.判('那道闸在壳里被叫到三处（state、cmd、起监听自己那一句），音量那道被叫到三处',
  (动.match(/判::媒体闸\(/g) || []).length === 3 && (声.match(/判::音量闸\(/g) || []).length === 3);
台.判('挂账加一减一与「归零就收」都在纯判断那一格（减不许减成负数）',
  纯.includes('pub fn 挂账加(现数: u32) -> u32') && 纯.includes('pub fn 挂账减(现数: u32) -> u32')
  && 纯.includes('pub fn 该收监听') && 动.includes('判::挂账加(') && 动.includes('判::挂账减(') && 动.includes('判::该收监听('));
台.判('收监听那句逐字钉住（页面上最后一处音乐也撤了）',
  纯串.收监听那句 === '页面上最后一处音乐也撤了' && 动.includes('收监听(&手, 判::收监听那句)'));
台.判('挑会话的先后照脚本：Playing > Paused > Changing/Opened > 其余，同分让系统当前那一家赢，自家跳过',
  音乐脚本.includes('if (st == "Playing") return 0;') && 音乐脚本.includes('if (st == "Paused") return 1;')
  && 音乐脚本.includes('if (st == "Changing" || st == "Opened") return 2;')
  && 音乐脚本.includes('bool better = r < bestRank || (r == bestRank && isCur && !winIsCur);')
  && 纯.includes('pub fn 会话排名') && 纯.includes('名分 < 胜名分 || (名分 == 胜名分 && 是当前家 && !胜是当前)'));
台.判('钉住那一位绝不变节：钉了就只认那一家，找不到报 pin-missing（脚本顶上那句 pin order）',
  音乐脚本.includes('how = "pin-missing"; return null;')
  && 纯.includes('"pin-missing"') && 纯.includes('钉住对上: false'));
台.判('两种身份写法算同一家（光文件名 / 一整条路径），两头同一句注释说的就是 MusicBee 那对',
  音乐脚本.includes('static string PathOf(string s)') && 音乐脚本.includes('string.Equals(a, b, StringComparison.OrdinalIgnoreCase)')
  && 纯.includes('pub fn 名字末段') && 纯.includes('pub fn 同一个播放器'));
台.判('那六个状态字面量两头一套（页面上那句「正在放」比的就是这一串）',
  ['Closed', 'Opened', 'Changing', 'Stopped', 'Playing', 'Paused'].every(字 => 纯.includes('"' + 字 + '"'))
  && 音乐脚本.includes('pi.PlaybackStatus.ToString()'));
台.判('快照那十几栏一名不落，计数那几栏也在（页面靠 seq 认这是不是一份真快照）',
  ['how', 'pin', 'pinOk', 'n', 'list', 'app', 'title', 'artist', 'album', 'status', 'rate', 'pos', 'dur', 'min', 'max', 'can', 'session']
    .every(栏 => 动.includes('"' + 栏 + '"'))
  && ['seq', 'ev', 'ok', 'at', 'since', 'from'].every(栏 => 动.includes('"' + 栏 + '"'))
  && 音乐脚本.includes(',\\"how\\":') && 音乐脚本.includes(',\\"pinOk\\":'));
台.判('can 那七枚字母照原件（p x t n v s k），一枚不多一枚不少',
  音乐脚本.includes(',\\"can\\":{\\"p\\":') && /json!\(\{ "p": .*"x": .*"t": .*"n": .*"v": .*"s": .*"k": /.test(动));
台.判('列表那一栏四栏照原件（app st ti du），设置那张挑播放器的表读的就是这一串',
  音乐脚本.includes('.Append("{\\"app\\":\\"")') && 动.includes('"app": 读身份(会)')
  && 动.includes('"st": 读状态(会)') && 动.includes('"ti": 题') && 动.includes('"du": 读时长'));
台.判('小抄那四份文件名两头一套（pin.txt / musicbee.txt / musicdir.txt / music.txt）',
  ['pin.txt', 'musicbee.txt', 'musicdir.txt', 'music.txt']
    .every(名 => 纯.includes('"' + 名 + '"')));
台.判('小抄那一格三层名钉住（LOCALAPPDATA 底下 Flow-Desk 的 players），没设就退 APPDATA',
  纯串.程序数据格 === 'Flow-Desk' && 纯串.小抄格名 === 'players'
  && 动.includes('用户数据底().join(判::程序数据格).join(判::小抄格名)') && 动.includes('"LOCALAPPDATA"')
  && 动.includes('"APPDATA"'));
台.判('批五找 MusicBee 用的也是同一颗底（用户数据那一格只认一次，不在第二本里再抄一遍环境变量）',
  (动.match(/fn 用户数据底\(\) -> PathBuf/g) || []).length === 1
  && (动码.match(/LOCALAPPDATA/g) || []).length === 1
  && 动.includes('判::桥候选(&盘根们(), &底串)')
  && 动.includes('let 底串 = 用户数据底()'));
台.判('内容没动就别碰文件那一句在纯判断那一格（一碰就惊一次文件监听）',
  纯.includes('pub fn 该不该写') && 动.includes('判::该不该写('));
台.判('pin.txt 那一格不切尾巴空白、其余切（三目那一手在纯判断那一格）',
  纯.includes('if 格名 == 钉住件名 {') && 动.includes('判::小抄写入值(名, 值)'));
台.判('music.txt 那一句一行的 key=value 读法（号在开头的段不算一条）',
  纯.includes('pub fn 开关表') && 动.includes('判::开关表(') && 纯.includes("find('=')"));
/* ---- 批五：开关那一句的单键语义（洗法、单键、不重排、一样不写） ---- */
台.判('开关名那一手：只留 [\\w-]（ASCII 那套）再截 24 段，空了就挡那一句',
  纯.includes('.is_ascii_alphanumeric()') && 纯.includes("|| *字 == '-'") && 纯.includes('.take(24)')
  && 动.includes('判::开关名清洗(&k)') && 动.includes('判::开关名不对那句'));
台.判('开关值那一手：行里行外的换行整个去掉（不是切尾巴）、再截 200 段',
  纯.includes("filter(|字| *字 != '\\r' && *字 != '\\n')") && 纯.includes('.take(200)')
  && 动.includes('判::开关值清洗(') && 动.includes('判::开关值文本('));
台.判('没递与递 null 都当空串，数与布尔念成原文那一串',
  纯.includes('None | Some(serde_json::Value::Null) => String::new()') && 纯.includes('Some(其余) => 其余.to_string()'));
台.判('单键读写：现值一模一样就一个字都不写（省得白惊一次监听），壳里同一先一后',
  动.includes('if 判::开关取(&表, &名).as_deref() == Some(新值.as_str())'));
台.判('改一栏位置不动、盘上没这一栏才添尾巴（跟着插入序，不许重排）',
  纯.includes('pub fn 开关并入') && 纯.includes('出.push((名.to_string(), 值.to_string()))')
  && 动.includes('写一份(判::开关件名, &判::开关并入(&表, &名, &新值))'));
台.判('media:flag 只动 music.txt 那一颗、绝不整表回页面（表走 media:players 的 flags）',
  !/pub fn media_flag\([^)]*\) -> [^{\n]*一份小抄/.test(动)
  && /pub fn media_flag\(k: String, v: Option<Value>\) -> 一个成不成/.test(动));
/* ---- 批五：音乐文件夹那两颗 ---- */
台.判('挑框那道题一字钉住（title 就是那五个字），框里只让挑目录',
  纯串.挑目录题 === '挑音乐文件夹' && 动.includes('判::挑目录题') && 动.includes('.blocking_pick_folder()'));
台.判('这一头走的是官方对话框那颗插件的 Rust 接口（blocking_pick_folder），与 fsa_pick_dir 同一手',
  动.includes('app.dialog().file()') && 动.includes('.blocking_pick_folder()')
  && 动.includes('tauri_plugin_dialog::DialogExt'));
台.判('框挂在发话那一张窗上（按窗口名取那一张，不是随便挑一张）',
  动.includes('app.get_webview_window(&窗口.label())'));
台.判('写出去的那一行就是 musicdir.txt（两颗共用件名那一格，页面上读的是 media:players 的 music 栏）',
  (动.match(/判::音乐目录件名/g) || []).length >= 3 && 纯串.音乐目录件名 === 'musicdir.txt');
/* ---- 批五：给 MusicBee 装监听插件那一颗 ---- */
台.判('这一颗先问的是「这一家装没装」，用的是壳里那一颗 装了音乐遥控器',
  动.includes('if !装了音乐遥控器()'));
台.判('找装在哪那三条路里走得通的两条都在（注册表 App Paths + 常见落点），差的那条写在话里',
  纯串.认家注册格.replace(/\\\\/g, '\\').endsWith('App Paths\\MusicBee.exe') && 动.includes('RegGetValueW')
  && 动.includes('HKEY_LOCAL_MACHINE') && 动.includes('判::桥候选(&盘根们(), &底串)')
  && 动.includes('tasklist.exe') && 动.includes('Get-Process'));
台.判('认「这一格有 musicbee.exe」才算找到（只认到目录不算）',
  动.includes('Path::new(&候).join(判::认家件名).is_file()') && 纯串.认家件名 === 'MusicBee.exe');
台.判('那六摆 + 另两摆一套到底（每格盘六条、用户数据那一格底下再补两条），名字与顺序逐条钉住',
  JSON.stringify([...(纯.match(/pub const 那六摆: \[&str; 6\] = \[([\s\S]*?)\];/) || ['', ''])[1]
    .matchAll(/"([^"]+)"/g)].map(m => m[1].replace(/\\\\/g, '\\')))
  === JSON.stringify(['MusicBee', 'Programs\\MusicBee', 'Program Files\\MusicBee',
    'Program Files (x86)\\MusicBee', 'Apps\\MusicBee', 'Software\\MusicBee'])
  && JSON.stringify([...(纯.match(/pub const 另两摆: \[&str; 2\] = \[([^\]]*)\];/) || ['', ''])[1]
    .matchAll(/"([^"]+)"/g)].map(m => m[1].replace(/\\\\/g, '\\')))
  === JSON.stringify(['Programs\\MusicBee', 'MusicBee'])
  && 纯.includes('for 摆 in 那六摆') && 纯.includes('for 摆 in 另两摆'));
台.判('一格一格数盘（A 到 Z 挨个问在不在）',
  动.includes("('A'..='Z')") && 动.includes('Path::new(根).exists()'));
台.判('包里那一颗走的是插件清单 assets.bridge 那一栏，三道不许（空段 / . / ..）都在纯判断那一格',
  纯串.桥件键名 === 'bridge' && 纯串.随行格里 === 'assets'
  && 纯.includes('段 == "." || 段 == ".."') && 纯.includes("段.contains(':')")
  && 动.includes('判::随行件名(&文, 判::桥件键名)'));
台.判('那一份只从活的这一格读（原厂那一格随插件分离第 2 批 2.6 整格撤了），用的还是 comp_cmds 那一颗口径',
  动.includes('comp_cmds::活的那一格()') && !动.includes('comp_cmds::原厂那一格()'));
台.判('目标那一格与那一份文件名钉住（<MusicBee>\\Plugins\\mb_FlowDesk.dll）',
  纯串.插件格名 === 'Plugins' && 纯串.桥插件件名 === 'mb_FlowDesk.dll'
  && 动.includes('Path::new(&家).join(判::插件格名)') && 动.includes('插件格.join(判::桥插件件名)'));
台.判('同名先留一份 .bak 再覆盖',
  动.includes('format!("{}.bak", 到串)') && 动.includes('std::fs::copy(&到, &底串)'));
台.判('报回去的千字节是四舍五入那一手，取的是落盘之后那一份的字节数',
  纯.includes('pub fn 算千字节(字节: u64) -> u64') && 纯.includes('/ 1024.0).round()')
  && 动.includes('判::算千字节(写进)'));
台.判('被咬住那一支：动手前拿进程问一句那一手挪成了真拷那一步认那条盘上错码（busy:true + dir + 那一句）',
  动.includes('e.raw_os_error() == Some(判::咬住错码)') && 纯.includes('pub const 咬住错码: i32 = 32;')
  && 动.includes('busy: Some(true), dir: Some(家串), to: None, kb: None'));
台.判('那一句「没检测到 MusicBee 装在哪」带的是 found:false 那一格',
  动.includes('found: Some(false)'));

台.题('五、值域与那几句只写一份：动手那两层一个字都没重写');
/* 引用纯判断那一格那颗常量时写的是它的名字（判::音量监听没起来那句），那一句里带着同样的字，
   但它不是「自己又写了一遍」—— 先把这种引用摘掉再搜，剩下的是真落在代码里的那些字 */
const 两层引 = 两层码.replace(/判::[A-Za-z0-9_\u4e00-\u9fff]+/g, '');
for (const 句 of ['不认的媒体命令', '音乐遥控器没装', '这一处桌面上没有挂着音乐遥控器', '媒体子进程没起来',
  '音量监听没起来', '页面上最后一处音乐也撤了', '此刻没有播放器在报会话', '音量监听收摊了',
  /* 批五那几句：全住在纯判断那一格，动手那一层只引用 */
  '开关名不对', '挑音乐文件夹', '没检测到 MusicBee 装在哪', 'MusicBee 正开着', '插件已装到',
  '拷不过去（', '这一份包不完整', '音乐遥控器这个插件没装'])
  台.判('动手那两层里没有自己写「' + 句 + '」', !两层引.includes(句));
台.判('那两层里没有静音档的字面判断（0/1/2 的换算只在纯判断那一格）',
  !两层码.includes('"off"') && !两层码.includes("'off'") && !/=> 2\b/.test(两层码)
  && 声.includes('判::静音档(&原样(&mode))'));
台.判('那两层里没有第二份命令串名单（play / pause 那一串只在纯判断那一格）',
  !两层码.includes('"play", "pause"') && 动.includes('判::认这条命令(&串)'));
台.判('那两层里没有第二份挑会话的先后（0/1/2/3 那四个名分只在纯判断那一格）',
  !两层码.includes('"Playing" => 0') && !两层码.includes('会话排名')
  && 动.includes('判::挑会话(') && 动.includes('判::快照算活吗('));
/* 批五：那几句洗法与那四句话也不能在动手那一层再来一份 —— 剥掉「判:: 名字」那种引用之后，
   名字本身在动手那两层里一个字都不该再出现（出现了就是自己又写了一遍实现） */
for (const 颗 of ['开关名清洗', '开关值清洗', '开关值文本', '开关并入', '开关取', '桥候选', '随行件名',
  '算千字节', '那是这一家吗', '桥没找着句', '桥咬住句', '桥装好句', '桥拷不动句', '挑目录题'])
  台.判('动手那两层里没有自己写「' + 颗 + '」', !两层引.includes(颗));
台.判('桥候选那六摆与另两摆只在纯判断那一格（动手那一层里没有第二份「Program Files (x86)」那类摆法）',
  !两层码.includes('Program Files (x86)') && !两层码.includes('mb_FlowDesk.dll')
  && !两层码.includes('App Paths') && !两层码.includes('Plugins')
  && 动.includes('判::插件格名') && 动.includes('判::桥插件件名') && 动.includes('判::认家注册格'));
台.判('那两层里没自己写那三句闸话与 0~100 的算法，全靠 core 的常量与函数',
  !两层码.includes('媒体闸') === false && 两层码.includes('判::媒体闸')
  && 两层码.includes('判::音量取值') && !两层码.includes('Math.round'));

台.题('六、慢调用不占主线程');
台.判('SMTC 那一整趟在一条自己的线程上（不占命令那一条），那条线程里一台只跑这一趟的运行时',
  动.includes('std::thread::Builder::new()') && 动.includes('name("fd-音乐监听".into())')
  && 动.includes('tokio::runtime::Builder::new_current_thread().enable_time().build()')
  && 动.includes('台.block_on(跑监听'));
台.判('WinRT 那一头先给那条线程定了线程模型（RoInitialize，照 info_cmds 里认色卡那一路）',
  动.includes('RoInitialize(RO_INIT_MULTITHREADED)'));
台.判('六颗 media 命令本身一个字都不等：没有一处同步等回执（blocking_recv / blocking_wait / join 都不许有）',
  !/blocking_recv|blocking_wait|\.join\(\)/.test(动码)
  && ['media_state', 'media_hold', 'media_release', 'media_cmd', 'media_players', 'media_pin']
    .every(名 => new RegExp('pub fn ' + 名 + '\\(').test(动)));
台.判('命令只是「记一笔账 + 往那条线程递一句」：起监听 / 收监听 / 递 / 钉住那一家 这四只手都在',
  动.includes('递(&手, 一条命令::播控') && 动.includes('起监听(&app, &手)') && 动.includes('收监听(&手,'));
台.判('实时数据不轮询：整趟循环阻塞在等下一句（脚本那头阻塞在 ReadLine），没有一颗 setInterval',
  动.includes('收.recv().await') && 音乐脚本.includes('$line = [Console]::In.ReadLine()')
  && !/set_interval|interval\(/.test(动));
台.判('事件回调只递一句「看一眼」，真读真算在循环那一趟（脚本那三份 delegate 同一手）',
  (动.match(/口\.send\(一条命令::看一眼/g) || []).length >= 5
  && 音乐脚本.includes('Say("playback", AppOf(x))'));
台.判('补读与重起这两趟也都在自己的线程上睡，不占监听那一趟',
  动.includes('name("fd-音乐补读".into())') && 动.includes('name("fd-音乐重起".into())')
  && 动.includes('std::thread::sleep(Duration::from_millis(判::补读间隔毫秒))')
  && 动.includes('std::thread::sleep(Duration::from_millis(判::重起间隔毫秒))'));
台.判('补读三趟、隔 900 毫秒，两头同数（脚本 Warm()：Sleep(900) × 3）',
  音乐脚本.includes('for (int i = 0; i < 3; i++)') && 音乐脚本.includes('Thread.Sleep(900);')
  && 纯.includes('pub const 补读趟数: u32 = 3;') && 纯.includes('pub const 补读间隔毫秒: u64 = 900;'));
台.判('等异步那两档也是两头同数：常规三秒、读歌名六秒（脚本 Await 与 Await(op, 6000)）',
  音乐脚本.includes('return Await(op, 3000);') && 音乐脚本.includes('Await(s.TryGetMediaPropertiesAsync(), 6000)')
  && 纯.includes('pub const 常规等毫秒: u64 = 3000;') && 纯.includes('pub const 读歌名等毫秒: u64 = 6000;')
  && 动.includes('判::常规等毫秒') && 动.includes('判::读歌名等毫秒'));
台.判('意外收摊最多重起三回、隔 1200 毫秒，且没报过 ready 不重起',
  纯.includes('pub const 重起预算: u32 = 3;') && 纯.includes('pub const 重起间隔毫秒: u64 = 1200;')
  && 动.includes('判::还该重起(守.起过, 守.已试, 守.自己收)'));
台.判('vol 那三颗都是 async 命令，每一颗一趟后台线程 + 三秒超时（跨进程取音量不许占主线程）',
  ['vol_get', 'vol_set', 'vol_mute'].every(名 => new RegExp('pub async fn ' + 名 + '\\(').test(声))
  && 声.includes('std::thread::Builder::new().name("fd-音量".into()).spawn')
  && 声.includes('tokio::time::timeout(三秒, 收.recv()).await')
  && 声.includes('CoInitializeEx(None, COINIT_MULTITHREADED)') && 声.includes('CoUninitialize()'));
台.判('滑杆 90ms 合并那一趟也在自己的线程上睡（绝不一像素生一趟手）',
  声.includes('const 合并毫秒: u64 = 90;')
  && 声.includes('name("fd-音量合并".into())') && 声.includes('Duration::from_millis(合并毫秒)'));
台.判('这一批一颗都没有 shell 出去（那两摊原件起的是常驻 powershell，壳里走系统接口）',
  !两层码.includes('powershell') && !两层码.includes('std::process') && !两层码.includes('Command::new')
  && 动.includes('GlobalSystemMediaTransportControlsSessionManager::RequestAsync')
  && 声.includes('IAudioEndpointVolume'));
/* 批五那四颗的「慢」在哪：等用户点框 与 一格一格数盘 —— 都在 async 那一头，不占窗口那一条线程 */
台.判('dirPick 与 bridge 那两颗是 async 命令（blocking_pick_folder 等点框、盘根们 数 26 格盘都不占主线程）',
  /pub async fn media_dir_pick\(/.test(动) && /pub async fn media_bridge\(\)/.test(动)
  && 动.includes('.blocking_pick_folder()') && 动.includes('盘根们()'));
台.判('dirSet 与 flag 那两颗走的是同步那一手（读一份写一份，跟批四那六颗一样不等任何东西）',
  /pub fn media_dir_set\(p: String\)/.test(动) && /pub fn media_flag\(k: String/.test(动)
  && !/pub async fn media_(dir_set|flag)\(/.test(动));
台.判('桥那一颗也不 shell 出去找 MusicBee：读的是注册表那颗 API 与盘上问存在（reg.exe / tasklist / powershell 都不在代码里）',
  两层码.includes('RegGetValueW') && !两层码.includes('reg.exe')
  && !两层码.includes('tasklist') && !两层码.includes('Get-Process'));

台.题('七、新添的 windows feature 各点得出是哪几颗要用的');
const 行 = 清单.split(/\r?\n/);
const 新档 = ['Media_Control', 'Win32_Media_Audio', 'Win32_Media_Audio_Endpoints', 'Win32_System_Com'];
function 上面注释(档名) {
  const 位 = 行.findIndex(l => l.trim().replace(/^"/, '').replace(/",$/, '') === 档名);
  if (位 < 0) throw new Error('features 名单里找不到这一档：' + 档名);
  let i = 位 - 1;
  const 收 = [];
  for (; i >= 0; i--) {
    const s = 行[i].trim();
    if (!s.startsWith('#')) break;
    收.unshift(s);
  }
  return 收.join('\n');
}
for (const 档 of 新档) {
  台.判('Cargo.toml 的 features 名单里有 ' + 档, 清单.includes('"' + 档 + '"'));
  const 注 = 上面注释(档);
  台.判(档 + ' 上面那段注释点得出是哪几颗命令要用的（写到 media: 或 vol: 那两串名）',
    注.length > 0 && /(media|vol):[a-z]+/.test(注) && 注.includes(档), 注.slice(0, 60));
}
台.判('SMTC 那一档点到的是 media 那几颗（media:state / media:cmd / media:hold / media:release 都在话里）',
  ['media:state', 'media:cmd', 'media:hold', 'media:release'].every(名 => 上面注释('Media_Control').includes(名)));
台.判('Core Audio 那三档点到的是 vol 那三颗（vol:get / vol:set / vol:mute 都在话里）',
  ['Win32_Media_Audio', 'Win32_Media_Audio_Endpoints', 'Win32_System_Com']
    .every(档 => ['vol:get', 'vol:set', 'vol:mute'].every(名 => 上面注释(档).includes(名))));
台.判('那三档里还写清了各自动的是哪枚接口（IAudioEndpointVolume、MMDeviceEnumerator、CoInitializeEx）',
  上面注释('Win32_Media_Audio_Endpoints').includes('IAudioEndpointVolume')
  && 上面注释('Win32_Media_Audio').includes('MMDeviceEnumerator')
  && 上面注释('Win32_System_Com').includes('CoInitializeEx'));
const 旧档 = ['Win32_Graphics_DirectWrite', 'Win32_System_Registry', 'Win32_System_WinRT',
  'Win32_Networking_WinInet', 'Win32_UI_Shell', 'Win32_UI_WindowsAndMessaging', 'Win32_Foundation',
  'Foundation', 'Foundation_Collections', 'Globalization', 'Graphics_Imaging', 'Media_Ocr',
  'Storage', 'Storage_Streams'];
台.判('旧那十四档一档都没撤（新增不许顺手减）', 旧档.every(档 => 清单.includes('"' + 档 + '"')));
台.判('features 名单里除了旧十四加新四，没有第五档新添的',
  [...清单.matchAll(/^\s{2}"([A-Za-z0-9_]+)",?$/gm)].map(m => m[1]).length === 旧档.length + 新档.length,
  [...清单.matchAll(/^\s{2}"([A-Za-z0-9_]+)",?$/gm)].map(m => m[1]).join(' '));
/* [dependencies] 那一格里真写着的 crate 名（注释与 windows 那串的 features 名单都不算）：
   加一档 feature 是允许的（那些接口本来就要），多一颗 crate 才是要拦的那件事 */
function 依赖名(源) {
  const 起 = 源.indexOf('[dependencies]');
  if (起 < 0) throw new Error('Cargo.toml 里没有 [dependencies] 那一格');
  const 后 = 源.slice(起 + '[dependencies]'.length);
  const 止 = 后.search(/^\[[A-Za-z]/m);
  return [...(止 < 0 ? 后 : 后.slice(0, 止)).matchAll(/^([A-Za-z0-9_.-]+)[ \t]*=/gm)].map(m => m[1]);
}
台.数('Cargo.toml 里 [dependencies] 那一格的 crate', 依赖名(清单).join(' '));
台.判('依赖名单还是那一串（批六登记的那一颗 flate2 是 zip_pack 本来就写死要用的解压件，png → flate2 那条链上早就带着它，不另下一套；批十加的那一颗 tauri-plugin-single-instance 是官方插件、走"只许开一个程序"那一条，同批登记进 THIRD-PARTY.txt；插件分离第 3 批 3.2 登记的那一颗 sha2 是自有容器逐块核"这一块没被改过"的尺，wry → sha2 那条链上本来就带着它、离线缓存里就是 0.10.9 这一版，与 flate2 同一档：不进 THIRD-PARTY.txt，也不许多下一套）',
  JSON.stringify(依赖名(清单)) === JSON.stringify(['tauri', 'serde', 'serde_json', 'tauri-plugin-dialog', 'windows', 'tokio', 'chrono', 'flate2', 'sha2', 'tauri-plugin-single-instance'])
  && 清单.includes('windows = { version = "0.62"'))
  && rd('THIRD-PARTY.txt').includes('tauri-plugin-single-instance') && !rd('THIRD-PARTY.txt').includes('flate2')
  && !rd('THIRD-PARTY.txt').includes('sha2');

台.题('八、没搬齐 / 做不全等的那几处，代码里看得见这句话（不许哪天删了注释当成已经搬齐）');
台.判('音量那一路：没挂 RegisterControlChangeNotify 那颗 COM 回调，这一条写在文件顶上',
  声.includes('RegisterControlChangeNotify') && 声.includes('不敢装成验过了'));
/* 命令那一路从 2026-10-16 起改吃那张明文表（第 4 批 4.5 · 你点的是「一份明文表 + 通用解释器」）：
   件名与写法不在壳的两层里写死了，所以这一条从前钉的方向反过来 —— 钉的是"那串字面只剩表里有、两层里一处都没有"。
   认装在哪、注册表那一格、插件 DLL 的落点、报回来的那一份文件、那四句话此刻还钉在判断层的常量上（下一片搬），
   那一句"没搬齐"的话仍写在 media_cmds 顶上。 */
const 两层源码 = 去注(动) + '\n' + 去注(纯.split('#[cfg(test)]')[0]);
台.判('命令那一路真的走表：那张明文表里读得出 musicbee-cmd.txt，壳那两层的代码里这一串一处都不剩（注释与测试段不算 —— 测试里念的是表的内容）',
  rd('src/_tauri/src/core/media/players.json').includes('musicbee-cmd.txt')
  && !两层源码.includes('musicbee-cmd.txt'));
台.判('解释器在判断层、动手那一层只叫它（读表 / 认这一家 / 命令正文三颗，代码里不认播放器名）',
  /pub fn 读表/.test(纯) && /pub fn 认这一家/.test(纯) && /pub fn 命令正文/.test(纯)
  && 动.includes('判::读表()') && 动.includes('判::认这一家(') && 动.includes('判::命令正文('));
台.判('players 那一份文件监听（playWatch）不在这九颗里，这句话也写在文件顶上',
  动.includes('playWatch') && 动.includes('mediaOnPlayers'));
台.判('脚本里那份桥插件的件名钉住；players 那一份文件监听在壳里不落 watcher 那一格 —— 差在哪写在文件顶上，不当已搬齐',
  音乐脚本.includes('musicbee-cmd.txt') && 动.includes('不落 watcher'));
/* 批五又添的三处「没做全等」，也一样得看得见这句话（哪天悄悄删了注释就当成搬齐了） */
台.判('找 MusicBee 少了「正在跑的那一家的路径」那一条：顶上第③条明写着这条要喊 powershell、壳里不起子进程',
  动.includes('Get-Process') && 动.includes('tasklist.exe') && 动.includes('第③条'));
台.判('那一颗的「正开着」是撞出来的不是问出来的：这条差在哪（第一次装又正好开着）写在话里',
  动.includes('第一次装') && 动.includes('咬住'));
台.判('logLine 那两笔（留备份 / 已装）照原件落了：顶上第④处改口成"照原件落 data\\logs"，两颗都在记一笔里',
  动.includes('照原件落 data\\logs') && 动.includes('旧插件留了备份：') && 动.includes('已装 {}（{}KB）')
  && (动.match(/log_cmds::记一笔\("插件"/g) || []).length === 2);
台.判('桥那颗的源是包里那一份的原位置、不是落到 watcher\\ 的那一份：顶上第⑤条写着',
  动.includes('watcher') && 动.includes('原位置') && 动.includes('第⑤条'));
台.判('桥那一颗就是空手请这一颗（页面上那颗按钮直接 invoke，不带参数）',
  桥.includes("async mediaBridge(){ try{ return await ipcRenderer.invoke('media:bridge'); }"));
台.判('批五那几处写的口径是「没搬齐 / 做不全等」，不是悄悄当成搬齐了',
  动.includes('做不全等') && 动.includes('没搬齐'));

台.题('九、纯判断那一格：不动磁盘、不认识壳、测试真在跑');
for (const 禁 of ['std::fs', 'File::open', 'File::create', 'fs::write', 'read_to_string', 'tauri::',
  'create_dir', 'remove_dir', 'remove_file', 'AppHandle', 'emit(', 'std::process', 'std::env', 'Command',
  'CoCreateInstance', 'IAudioEndpointVolume', 'GlobalSystemMedia', 'RoInitialize'])
  台.判('纯判断那一格里没有「' + 禁 + '」', !纯.includes(禁));
台.判('带 #[cfg(test)] 且真有一批 #[test]', /#\[cfg\(test\)\][\s\S]*#\[test\]/.test(纯));
台.判('mod 验判断 只开一颗（这一格自己一颗，没夹带第二份测试堆）', (纯.match(/mod 验判断/g) || []).length === 1);
const 新增测试 = (纯.match(/#\[test\]/g) || []).length;
台.数('这两批纯判断那一格共几颗测试', 新增测试 + ' 颗');
台.判('不少于三十颗（批四那三十七颗一颗没撤）', 新增测试 >= 30);
台.判('批五又添的这十四颗在数里（那颗数比上一批的 37 颗只多不少）', 新增测试 >= 51);
const 全测试 = fs.readdirSync(path.join(ROOT, 'src', '_tauri', 'src', 'core')).filter(f => f.endsWith('.rs'))
  .map(f => fs.readFileSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', f), 'utf8'))
  .join('').match(/#\[test\]/g) || [];
台.数('全仓纯判断那一格的测试总数', 全测试.length + ' 颗');
台.判('总数比上一批的 107 颗多了（不许多加不减，也不许把旧的撤掉）', 全测试.length > 107);
台.判('跑测试那一道此刻是全绿 264 颗零警告（212 是批六第二步 → 219 是运行日志那 7 颗 → 220 是批七补本地协议类型表那 1 颗 → 233 是批九网格吸附那 13 颗 → 234 是议题 16 补 MusicBee 那一行明文那 1 颗 → 235 是议题 17、18 闪退那一处：中文目录名不许按字节切 → 233 是插件分离第 2 批 2.5：页面上那颗「改代码」与那颗「恢复出厂」撤了，壳里 comp:list / comp:restore / comp:factory 三颗跟着撤，它们那两道测试一起没了 → 232 是第 2 批 2.6：data\\plugins-factory\\ 那一格整格撤，「这一家在原厂那一格的哪一格」那道判断与它那道测试一起没了 → 252 是第 3 批 3.2 与 3.3 乙：自有容器那一格 pack_box.rs 添的 20 颗（三句 SHA-256 已知向量、号怎么比、文件头与那两位标志、信息段字段齐不齐与路径干不干净、kernels 与 files 咬得上、块布局、整包过检标成用户插件、改一个字节报的是哪一块、少一块报短了不许顺带报哈希、要的主程序更高、带签名的这台读不了、钥匙表只加不减、那七句报话各是各的措辞、这一格不认识壳也不碰磁盘、发布侧压的那份试件这一头读得通）→ 257 是第 3 批 3.4 第一步：按表取那一份这一块（取一块两处：包里没这一份与整包读不动都不回半截、加密那一块不当明文递出去）、扩展名那两枚说的是同一种后缀、包名那一列多认一种运输形状（容器名折成包名、分成三趟、容器排在前面也一样让开那一格）；→ 262 是第 3 批 3.4 第二、三步：核活着的那一格那三道（对得上就一句不报、少一份与改过一份报的是两种话、要求的主程序比这台高也报）+ 运行时指一份那两道（读信息只折那一段、核那一份指着那一份说），那句"报话各是各的措辞"跟着从七句数到八句（多了"这一格里少了一份文件"）；这一格 262 颗，加上动手那一格 box_cmds.rs 的 6 颗（回话三道：好包十栏、坏一块报的是哪一块、读不到只回两栏；沙盒核一家三道：对得上认成用户插件、三种坏包报三句不同的话、没那份容器就当没得核）与 pack_cmds.rs 落盘那 4 颗（沙盒里装一份容器成了、坏一个字节与要求版本高都不落地、运行时读到一份与包上对不上指得出），build.mjs --测 此刻 274 颗零警告；**264 是第 4 批 4.5 第一片**：命令那一路改吃 src/_tauri/src/core/media/players.json 那张明文表 —— 老的那颗「音乐蜂那一家的近路认名字与递正文」换成三颗（表里那一家认名字与递正文按那张明文表走、表里没这一家就认不上命令落回系统那一路、两家各按各的写法成形代码里不认播放器名），代码里从此不写 musicbee 那一段 —— 两处此刻同一个现场',
  全测试.length === 264);
台.判('纯判断那一格每颗 pub fn 都有人叫（动手那两层或测试段里叫到，不留死口）',
  [...纯.matchAll(/^pub fn ([A-Za-z0-9_\u4e00-\u9fff]+)\(/gm)].map(m => m[1])
    .every(名 => {
      /* 两个同名不同格：pack_box 那两处的签名段字段名，与 pack_rule 读包用的那两颗是两回事，点名列出来 */
      if(名 === '读头' || 名 === '折信息段')
        return /pack_box::(读头|折信息段)/.test(两层) || 测试段.includes(名 + '(');
      return 两层.includes('判::' + 名) || 测试段.includes(名 + '(');
    }));
台.判('动磁盘与动系统的那一手在第三层（那两本里真有 std::fs 与 windows 那套）',
  动.includes('std::fs::write') && 声.includes('CoCreateInstance') && 动.includes('use windows::Media::Control'));

台.题('十、这两批的账');
const 这批 = 批.map(x => x[0]);
const 缺 = 对名单(这批, 桥, 壳注册单());
台.数('这一批几颗', 这批.length + ' 颗：' + 这批.join(' '));
台.判('这一批每一颗桥都请得到（页面上喊得出来这一颗）', 缺.桥没请.length === 0, 缺.桥没请);
台.判('这一批每一颗都在壳的注册单上（搬齐了，不留半截桥）', 缺.单没注册.length === 0, 缺.单没注册);
/* 总账只在一处数：桥请的一颗都不许在单外，那条钉在 gate-bridge46 第三节 ——
   从前这五道各自数一遍「已搬 63 / 63」再互相核对数字，搬完一颗要在五本里改五个数，改漏一本就是假绿 */
台.判('那把总账的尺只有一把（这一台不再自己数已搬多少颗）',
  rd('src/tools/probes/gate-bridge46.mjs').includes('请壳的一颗都不许在单外') &&
  !/已搬\.length ===/.test(rd('src/tools/probes/gate-taurimedia46.mjs')));
台.判('主.rs 顶上那句「还剩几颗没搬」整句撤了（壳里一颗不差，不许留着一句旧账当已实现）', !/还没搬|剩下的 4 颗/.test(壳));
台.判('主.rs 顶上那句也点了这一批那四颗（⑨ 那一段），不是只改了个数',
  壳.includes('⑨ 音乐遥控器那四颗') && 壳.includes('media:dirPick / media:dirSet / media:flag / media:bridge'));
台.判('主.rs 的注册单上批五那四颗排在 ⑨ 那一段后面（一格一段，不是散着塞的）',
  壳.indexOf('⑨ 音乐遥控器那四颗') < 壳.indexOf('media_cmds::media_dir_pick')
  && 壳.includes('tauri_bind::media_cmds::media_bridge'));
台.判('这两本、那一格与这道闸里，一个字节都没写这台机器的盘符、帐户名、私人目录',
  !/(^|[^A-Za-z0-9])[A-Za-z]:[\\/]/.test(动 + 声 + 纯 + rd('src/tools/probes/gate-taurimedia46.mjs')),
  (动 + 声 + 纯).match(/.{0,20}[A-Za-z]:[\\/].{0,20}/g) || []);
台.收尾();
