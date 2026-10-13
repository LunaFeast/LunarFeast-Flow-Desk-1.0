/* ============================================================
   gate-log46.mjs · 外46 批六第三步：壳里那一格运行日志（data\logs）
   ------------------------------------------------------------
     node src/tools/probes/gate-log46.mjs
   这一格是通道搬迁留下的两处「已知缺口」之一（钉在 pack_cmds.rs 与 media_cmds.rs 顶上第④条）：
   原件在 Electron 主进程里有一棵 logLine（src\pack\main.cjs 2404~2423 行），
   装包留没留出底、名单换算、音乐那两颗监听与桥的落地，全都往 data\logs\<那一天>.log 后面记一笔；
   壳里那一路一直没搬，所以那几句只在回执里报给页面、盘上不留记录 —— 回头查就查不到。
   这一台钉四件事：
     一、那一行的形状全在纯判断那一格（core::log_line），带 7 颗测试，它自己不碰磁盘；
     二、动手那一层只取时刻、建格、追加，写不成都当没写（绝不抛），落点朝 data_cmds::数据层格() 借，
        不另起第二份口径；它不是页面上请的通道（Electron 那边 logLine 也只在主进程里用）；
     三、四处调用点一句一字照原件（旧插件留了备份 / 已装 / 名单换算 / 留底成了与没留出底）；
     四、那两处「没落」「还没搬」的死字从注释里清干净 —— 缺口补上了还写着缺口，比没写更坏。
   ============================================================ */
import { rd, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-log46');
const 判 = rd('src/_tauri/src/core/log_line.rs');
const 单 = rd('src/_tauri/src/core/mod.rs');
const 动 = rd('src/_tauri/src/tauri_bind/log_cmds.rs');
const 动单 = rd('src/_tauri/src/tauri_bind/mod.rs');
const 包 = rd('src/_tauri/src/tauri_bind/pack_cmds.rs');
const 乐 = rd('src/_tauri/src/tauri_bind/media_cmds.rs');
const 壳 = rd('src/_tauri/src/main.rs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');

/* ---------- 一 · 那一行的形状 ---------- */
台.题('一 · 纯判断那一格：一行长什么样、落到哪一个文件');
台.判('core/mod.rs 登记了 log_line（文件在盘上不等于被编过 —— zip_pack 那笔漏就是这么来的）',
  /^pub mod log_line;$/m.test(单));
台.判('前缀、九百、后缀三颗常量各只一份',
  判.includes('pub const 日志前缀: &str = "FD|";') && 判.includes('pub const 最长字: usize = 900;')
  && 判.includes('pub const 日志后缀: &str = ".log";'));
台.判('时刻那五位补两位、毫秒补三位（那天与那一行两处格式串都钉住）',
  判.includes('format!("{:04}-{:02}-{:02}", 年, 月, 日)') && 判.includes('"[{} {:02}:{:02}:{:02}.{:03}] {}{} {}\\n"'));
台.判('那一行末尾一个换行，中间不许有第二个',
  /format!\(\s*\n\s*"\[\{\} \{:02\}:\{:02\}:\{:02\}\.\{:03\}\] \{\}\{\} \{\}\\n",/.test(判));
台.数('这一格几颗测试', (判.match(/#\[test\]/g) || []).length);
台.判('七颗都在（补零、换行、连续两个换行、行尾换行、九百那一刀、空类别、空原话）',
  (判.match(/#\[test\]/g) || []).length === 7);
台.判('纯判断那一格不碰磁盘（没有 fs::、没有 OpenOptions）',
  !判.includes('fs::') && !判.includes('OpenOptions') && !判.includes('std::io'));

/* ---------- 二 · 动手那一层 ---------- */
台.题('二 · 动手那一层：只取时刻、建格、追加，写不成都当没写');
台.判('tauri_bind/mod.rs 登记了 log_cmds', /^pub mod log_cmds;$/m.test(动单));
台.判('落点朝 data_cmds::数据层格() 借，再拼 logs（不另起第二份口径）',
  动.includes('crate::tauri_bind::data_cmds::数据层格().join("logs")'));
台.判('取的是本地墙上时间（与原件 new Date() 同一口径）', 动.includes('chrono::Local::now().naive_local()'));
台.判('排着队写：进程内一颗锁，锁坏了也拿它里面那份继续',
  动.includes('static 写队: Mutex<()>') && 动.includes('写队.lock().unwrap_or_else(|坏| 坏.into_inner())'));
台.判('整条路绝不抛：建格不成直接回，开不开成都不问，写一次也不 unwrap',
  动.includes('if std::fs::create_dir_all(&格).is_err()') && !动.includes('.unwrap()') && !动.includes('expect('));
台.判('它不是页面上请的通道：命令注册表里没有它，桥里也没有 logLine',
  !/log_/.test(壳.slice(壳.indexOf('invoke_handler'), 壳.indexOf('run()'))) && !桥.includes('logLine'));
台.判('三处做不全等全写在文件顶上（900 的数法、FD_USERDATA、Promise 队列换锁）',
  动.includes('① ') && 动.includes('② ') && 动.includes('③ ') && 动.includes('FD_USERDATA'));

/* ---------- 三 · 四处调用点 ---------- */
台.题('三 · 四处调用点那四句逐字钉住');
const 原话 = ['旧插件留了备份：', '已装 ', '名单换算 ', '原版留进 plugins-factory\\', '这一家没留出原版（'];
for(const 句 of 原话){
  台.判('壳里落的也是这一句：' + 句, (包 + 乐).includes(句));
}
台.判('音乐那两颗各记一笔（留备份、装成了）', (乐.match(/log_cmds::记一笔\("插件"/g) || []).length === 2,
  (乐.match(/记一笔/g) || []).length);
台.判('插件包那两处各记一笔（名单换算、留底那一颗两个分支都记）',
  (包.match(/log_cmds::记一笔\("插件"/g) || []).length === 3, (包.match(/记一笔/g) || []).length);
台.判('留底那一颗成了报几份、没成报为什么，两句都在同一颗里',
  /Ok\(几份\)[\s\S]*原版留进[\s\S]*Err\(e\)[\s\S]*这一家没留出原版/.test(包));
const 扫段 = 包.slice(包.indexOf('fn 扫一遍'), 包.indexOf('/// pack:list'));
台.判('名单换算那一句在写盘成了、老那份删掉之后才记（原件那两手在前）',
  扫段.includes('let _ = fs::remove_file(&老的);') &&
  扫段.indexOf('let _ = fs::remove_file(&老的);') < 扫段.indexOf('名单换算 {}'),
  { 删老那份在: 扫段.indexOf('let _ = fs::remove_file(&老的);'), 记一句在: 扫段.indexOf('名单换算 {}') });

/* ---------- 四 · 缺口账跟上 ---------- */
台.题('四 · 补上的缺口不许还挂在"没搬"的账上');
台.判('pack_cmds 顶上第④条改口成"照原样落进 data\\logs\\"', 包.includes('照原样落进') && !包.includes('还没搬，media_cmds'));
台.判('media_cmds 顶上第④条同批改口', 乐.includes('照原件落 data\\logs') && !乐.includes('壳里那一格日志（data\\logs）'));
台.判('那两句"没落 / 还没搬"的死字从这两本里清干净',
  !包.includes('logLine 那一句没落') && !包.includes('日志那一格还没搬') && !乐.includes('那两句 logLine 壳里没落'));
台.判('留一份原版那一颗的回执不再被调用那头丢掉就算了 —— 它自己会记',
  包.includes('那一句照原件落 data\\logs\\'));

台.收尾();
