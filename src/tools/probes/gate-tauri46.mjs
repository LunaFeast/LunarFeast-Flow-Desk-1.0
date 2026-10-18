/* ============================================================
   gate-tauri46.mjs · 外46 三：Tauri 壳搬通道的第一组 —— 文件读写那一摊十颗
   ------------------------------------------------------------
     node src/tools/probes/gate-tauri46.mjs
   钉的是这么几件事：
     一、主进程里文件读写那一组，每一颗在壳里都有一座对应的桥（名字按 Rust 的规矩换算，页面上请的那串字不动）；
     二、读文件的两颗回的是裸字节，不许在半路化成字符串 —— 页面上拿到的一直是 Buffer；
     三、四层规矩：纯判断那一格里不许出现动磁盘的手，也不许出现壳的名字；
     四、每一颗都上了 main.rs 的注册单（没上单的命令等于不存在）；
     五、纯判断那一格里有测试在跑，而且构建脚本能单独把测试跑一趟；
     六、这一摊要进仓的每一本文本里都不许有这台机器的盘符、帐户名、私人目录名；
        2026-10-11 那一半扩开了：判据走 src\_build\public-scan.mjs 那一颗，
        扫 origin/main 到这一轮那条支之间全部新增和修改的每一份文本（二进制按后缀跳掉，串全部现场算不写死）；
     七、骨架那张占位页请的命令是真的存在的（上一版它请了一串没注册的名，读到的是「问不动」）；
     八、窗口那一组：主进程 winCtl 认的十一种动作串，壳里逐条对得上，两颗都上了注册单；
     九、回报给页面的形状还是那两格，两枚事件名 win:state 与 fd:close-ask 两头同一串；
     十、二十秒没回话按「退出」收那一条兜底，两头都得在；
     十一、缩放档位住在纯判断那一格且带测试，托盘那一档 feature 开着；
     十二、壳那一头把记缩放、拦关闭、开机建托盘这三样装上了。
     七、骨架那张占位页请的命令是真的存在的（上一版它请了一串没注册的名，读到的是"问不动"）。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT, 桥原文, 桥请壳 } from './lib-slice.mjs';
import { 读清单, 读盘清单 } from '../../_build/push-list.mjs';
import { 跑闸 } from '../../_build/public-scan.mjs';

const 台 = 记账('gate-tauri46');
const 行 = s => String(s || '').split(/\r?\n/);
const 壳根 = path.join(ROOT, 'src', '_tauri');
const 壳 = rd('src/_tauri/src/main.rs');
const 命令 = rd('src/_tauri/src/tauri_bind/fs_cmds.rs');
const 壳里 = p => rd('src/_tauri/' + p);
const 窗 = 壳里('src/tauri_bind/win_cmds.rs');
const 清单 = 壳里('Cargo.toml');
/* 纯判断那一格整格扫：往后每一颗判断都落在这格，规矩一起管住，不用一颗补一条。
   测试段先摘掉：那一段里为了列"这一格不许出现哪几颗"，把禁字写成了字面串（2026-10-16 pack_box 那颗自扫的
   测试就是这么把自己判红的）—— 禁的是判断那一段真去摸磁盘、真去认壳，不是测试不许提到它们。 */
const 判断 = fs.readdirSync(path.join(壳根, 'src', 'core')).filter(f => f.endsWith('.rs'))
  .map(f => rd('src/_tauri/src/core/' + f).split('#[cfg(test)]')[0]).join('\n');
/* 连着测试段的那一份：只给"这一格里真有几颗测试在跑"那两条判据数数用 */
const 全格 = fs.readdirSync(path.join(壳根, 'src', 'core')).filter(f => f.endsWith('.rs'))
  .map(f => rd('src/_tauri/src/core/' + f)).join('\n');
const 脚本 = rd('src/_tauri/build.mjs');
const 占位页 = rd('src/_tauri/ui/index.html');

/* 名字换算：主进程写「fs:readRange」，Rust 的函数名装不下冒号也装不下驼峰，只能落成「fs_read_range」。
   这道换算放在 JS 桥上做，页面上请壳的那串字一个字不改。 */
const 桥名 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

台.题('一、文件读写那一组：桥请的每一颗，壳里都有一座');
const 撞 = 桥请壳(桥原文()).filter(c => c.startsWith('fs:'));
const 通道 = [...new Set(撞)].sort();
台.数('桥请的文件读写那一组共几颗', 通道.length + ' 颗 · ' + 通道.join(' '));
台.判('量出来正好十颗（少了就是页面上那一组少了人请，多了就是这一组又添了新颗）', 通道.length === 10);
for(const c of 通道){
  const b = 桥名(c);
  台.判(c + ' 在壳里有对应的一颗 ' + b, new RegExp('pub (?:async )?fn ' + b + '\\s*\\(').test(命令));
}
/* 壳里比桥请的多一颗 fs_mkdir：地址换算与建目录这两手页面上都还没人请（fs_resolve 是搬桥时新添的那颗，
   页面已经请它；fs_mkdir 这一颗此刻没人叫 —— 这一条把「多出来的是哪一颗」摆明给人看，不当已用上）。 */
const 命令数 = (命令.match(/#\[tauri::command\]/g) || []).length;
台.数('壳里文件读写那一组共几颗命令标记', 命令数 + ' 颗');
台.判('十一颗：桥请的那十颗，加上搬桥新添的地址换算一颗，再加上页面上还没人请的建目录那一颗',
  命令数 === 11 && /pub (?:async )?fn fs_resolve\s*\(/.test(命令) && /pub (?:async )?fn fs_mkdir\s*\(/.test(命令)
  && !桥原文().includes('fs:mkdir'));

台.题('二、读那两颗回裸字节，不化成字符串');
const 回裸字节 = 行(命令).filter(s => s.includes('-> Result<tauri::ipc::Response')).map(s => (s.match(/fn (\w+)/) || [])[1]);
台.数('回裸字节的是哪几颗', 回裸字节.join(' '));
台.判('整读与按区间读这两颗回的是裸字节', 回裸字节.length === 2 && 回裸字节.includes('fs_read') && 回裸字节.includes('fs_read_range'));
台.判('这两颗不许被改成回字符串（页面上拿到的一直是 Buffer）',
  !/fn fs_read(?:_range)?\s*\([^)]*\)\s*->\s*Result<String/.test(命令));

台.题('三、四层规矩：纯判断那一格不动磁盘、不认识壳');
for(const 禁 of ['std::fs', 'File::open', 'File::create', 'fs::write', 'read_to_string', 'tauri::'])
  台.判('纯判断那一格里没有「' + 禁 + '」', !判断.includes(禁));
台.判('动磁盘的那一手住在第三层（命令胶水那一格里真有 std::fs）', 命令.includes('std::fs'));

台.题('四、每一颗都上了注册单');
for(const c of 通道)
  台.判(c + ' → ' + 桥名(c) + ' 在 main.rs 的注册单上', 壳.includes('fs_cmds::' + 桥名(c)));
台.判('注册单上第一颗是报版本与树位的那一颗', 壳.includes('generate_handler![') && 壳.includes('shell_info'));

台.题('五、纯判断那一格有测试在跑，脚本能单独跑它');
台.数('纯判断那一格里几颗测试', (全格.match(/#\[test\]/g) || []).length);
台.判('测试不少于五颗', (全格.match(/#\[test\]/g) || []).length >= 5);
台.判('构建脚本认 --测 这一档', 脚本.includes("argv.includes('--测')") && 脚本.includes("TEST ? 'test'"));
台.判('跑测试那一趟不带 --release（不产壳、不占地方），--debug 那一档也真不传 --release', /CHECK \|\| TEST \|\| DEBUG \? \[/.test(脚本));
台.判('跑完测试就收尾，不去找那颗 exe', /if\(TEST\)/.test(脚本));

台.题('六、公开面零本机痕迹（这一摊的每一本文本 + 这一轮要推出去的每一本文本）');
const 本 = [];
(function 走一格(d){
  for(const e of fs.readdirSync(d, { withFileTypes: true })){
    if(e.name === 'target' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if(e.isDirectory()) 走一格(p);
    else if(/\.(rs|mjs|json|toml|html|lock)$/.test(e.name)) 本.push(p);
  }
})(壳根);
const 盘符 = /(^|[^A-Za-z0-9])[A-Za-z]:[\\/]/;
const 露 = 本.map(p => ({ p, 文: fs.readFileSync(p, 'utf8') }))
  .filter(x => 盘符.test(x.文) || /LunarFeast/.test(x.文));   /* 盘符与帐户名、私人目录名那一拨由 public-scan 现场算（下面那一半），这儿只多问一句：别把 GitHub 那一头的名字抄进这一摊 */
台.数('扫了几本文本', 本.length);
台.判('没有一个字节写着这台机器的盘符、帐户名或私人目录名', 露.length === 0, 露.map(x => path.relative(ROOT, x.p)).join('、'));
/* 扩出来的那一半（2026-10-11 他定的第五条）：判据不在这儿第二份 —— 走 src\_build\public-scan.mjs 那一颗，
   扫 origin/main 到这一轮那条支之间全部新增和修改的每一份文本（二进制按后缀跳掉）。
   支名取清单那一行「提交分支 =」；那条支还没开出来（比如这一轮刚开始量）就退一步扫 main —— 扫的面只大不小。
   这一棵还没推过（没有 origin/main）的时候，比对的那一头换成「全部进版本的那几份」——同样只大不小。 */
const 支 = (() => {
  const 名 = (() => { try{ return 读清单(读盘清单()).提交分支; }catch(e){ return ''; } })();
  if(!名) return 'main';
  try{ execFileSync('git', ['-C', ROOT, 'rev-parse', '--verify', 名], { stdio:['ignore','ignore','ignore'] }); return 名; }
  catch(e){ return 'main'; }
})();
const 基 = (() => {
  try{ execFileSync('git', ['-C', ROOT, 'rev-parse', '--verify', 'origin/main'], { stdio:['ignore','ignore','ignore'] }); return 'origin/main'; }
  catch(e){ return '全部'; }
})();
let 公开面 = null, 问不出 = '', 换面 = false, 面 = 支 + '（比对的那一头：' + 基 + '）';
try{ 公开面 = 跑闸(支, 基); }catch(e){ 问不出 = String((e && e.message) || e).split(/\r?\n/)[0]; }
/* 那一行「提交分支 =」是上一轮那条、已经整条合进 main 的旧名时，差集一面不剩 —— 这一台自己那句规矩写着"扫的面只大不小"，
   所以就地换成最大的一面重扫（2026-10-16：那一天 0 份还被报成"过了"，那一枚绿牌已经收回，抛出来正好逼这一笔走到）。 */
if(问不出.startsWith('这一道扫了 0 份')){
  公开面 = 跑闸('main', '全部');
  面 = 'main（清单里「提交分支 =」那一行扫出来一面不剩 → 改扫全部进版本的那 ' + 公开面.面 + ' 份）';
  问不出 = ''; 换面 = true;
}
台.数('公开面那一道扫了哪一条支、几本文本', (问不出 ? '问不出：' + 问不出
  : 面 + ' · 读了 ' + 公开面.读了 + ' 份（名单 ' + 公开面.面 + ' 份）'));
台.判('扫到的每一本文本里一处本机痕迹都没有（' + (换面 || 基 !== 'origin/main'
    ? '全部进版本的那 ' + (公开面 ? 公开面.面 : 0) + ' 份 —— 面只大不小' + (换面 ? '；走这一条是因为清单里「提交分支 =」那一行扫出来一面不剩' : '；这一棵还没有 origin/main')
    : '比 ' + 基 + ' … ' + 支 + ' 之间新增与修改的那些') + '）',
  !!公开面 && 公开面.命中.length === 0,
  公开面 ? 公开面.命中.slice(0, 8).map(h => h.份 + ':' + h.行号 + ' · ' + h.串).join('、') : 问不出);

台.题('七、骨架那张占位页请的名是真的');
const 请 = [...占位页.matchAll(/invoke\('([A-Za-z_0-9]+)'\)/g)].map(m => m[1]);
台.数('占位页请了哪几颗', 请.join(' '));
台.判('请的每一颗都在注册单上', 请.length > 0 && 请.every(n => 壳.includes(n)));

台.题('八、窗口那一组：页面上请得出的动作，壳里逐条认得');
const 顶栏 = rd('src/_fd/src/fd9-title.js');
const 动作 = [...new Set([...顶栏.matchAll(/winCtl\('([A-Za-z]+)'\)/g)].map(m => m[1]))].sort();
台.数('顶栏那一张请了哪几种动作', 动作.length + ' 种 · ' + 动作.join(' '));
台.判('页面上请的这四种都摆得出来（最小、最大、退出、问状态）',
  JSON.stringify(动作) === JSON.stringify(['max', 'min', 'quit', 'state']));
台.判('壳里那一条 match 认的动作串一种不落（quit min max close reload reloadForce fullscreen state zoomIn zoomOut zoomReset）',
  ['quit', 'min', 'max', 'close', 'reload', 'reloadForce', 'fullscreen', 'state', 'zoomIn', 'zoomOut', 'zoomReset']
    .every(a => 窗.includes('"' + a + '"')));
台.判('这一组的两颗都上了注册单（win:ctl 与 win:closeAnswer）',
  壳.includes('win_cmds::win_ctl') && 壳.includes('win_cmds::win_close_answer'));

/* ---- 他 2026-10-17 issue #54「双层窗口嵌套问题」：外层那一圈系统标题栏与页面自己那一行叠成两层。
   无边框那一句是 2026-10-16 f6ed1ba 才补上的，而这一条从前**没有任何台子校验** —— 哪天被谁撤掉不会有人报。 ---- */
{
  const 建窗 = 壳里('src/tauri_bind/page_cmds.rs');
  const 配置 = JSON.parse(壳里('tauri.conf.json'));
  const 每一份 = fs.readdirSync(path.join(壳根, 'src'), { recursive: true })
    .filter(f => String(f).endsWith('.rs'))
    .map(f => ({ p: 'src/_tauri/src/' + String(f).split(path.sep).join('/'),
                 文: fs.readFileSync(path.join(壳根, 'src', String(f)), 'utf8') }));
  const 再开 = 每一份.filter(x => /\.decorations\(true\)|set_decorations\(\s*true/.test(x.文));
  const 建窗数 = 每一份.reduce((n, x) => n + (x.文.match(/WebviewWindowBuilder::new/g) || []).length, 0);
  台.判('建窗那一句带 .decorations(false)（系统那一圈撤掉，页面上那一行才是唯一那一行）',
    建窗.includes('.decorations(false)'));
  /* ---- 2026-10-18 08:18 他接着问的第二层：标题栏是没了，窗口外面还箍着一圈灰带、左上角那道是它的接缝。
     根不在样式位上：tao 的 decoration_shadow 默认 true（platform_impl/windows/mod.rs:56），
     开着时 WM_NCCALCSIZE 把客户区往里让一圈给系统那道投影腾地方，让出来的那一条就是灰带。
     页自己有四档外观与影子，不需要系统再垫一层 —— 钉住 .shadow(false)，也不许别处再开回去。 ---- */
  台.判('建窗那一句带 .shadow(false)（灰带是影子那一档让出来的一圈客户区，不是标题栏）',
    建窗.includes('.shadow(false)'));
  台.判('全仓没有第二处把影子开回去（.shadow(true) 一处都不许有）',
    !每一份.some(x => /\.shadow\(\s*true/.test(x.文)));
  台.判('全仓没有任何一处再把那一圈打开（.decorations(true) 与 set_decorations(true) 一处都不许有）',
    再开.length === 0, 再开.map(x => x.p).join('、'));
  台.判('建窗只有一颗（label "main"）、配置那一头 app.windows 是空的 —— 第二颗带边框的窗口生不出来',
    建窗数 === 1 && /WebviewWindowBuilder::new\([^,]+,\s*"main"/.test(建窗) &&
    Array.isArray(配置.app.windows) && 配置.app.windows.length === 0, '建窗 ' + 建窗数 + ' 颗 · 配置 ' + JSON.stringify(配置.app.windows));
  /* ---- issue #62 第三次报同一件（「这不是双层窗口是什么？两层最小化、最大化/还原、关闭」）。
     这一轮读了 tao 0.37.1 的源码才动手：window_state.rs 的 to_window_styles() 无条件写 WS_CAPTION | WS_SYSMENU，
     decorations(false) 只是让 wry/tao 自己接住 WM_NCCALCSIZE 报零，把非客户区压成零高 —— 样式位一直都在，
     窗口一卡住不抽消息（他那张截图标题栏上写着「Flow-Desk (未响应)」）、系统一重画非客户区，那一圈就原样回来。
     所以钉的是样式位本身：建好窗口当场把 WS_CAPTION 那一位摘掉，四条会补回来的路各摘一次，
     并把摘前摘后的样式位读回来写进运行日志 —— 下一次再有两层，日志里那一句就是凭据，不用再来回猜哪一枚包。 ---- */
  台.判('建好窗口当场就撤一次（不再只靠建那一句 decorations(false)，也不留"读回来是已撤/还在"那种含糊话）',
    建窗.includes('crate::tauri_bind::win_cmds::就地撤(&窗, "建好窗口");'));
  /* 2026-10-18 08:26 翻过一次的车钉在这里：那一度把 WS_CAPTION 从 GWL_STYLE 上摘掉，
     标题栏确实画不出来了，可最大化跟着铺满整块屏幕、把任务栏压掉 —— Windows 算最大化尺寸看的就是那一位。
     tao 留著那一位、只靠接 WM_NCCALCSIZE 报零压住非客户区，拿的就是这一对。壳里从此不许写样式位。 */
  台.判('全仓一份 Rust 都不碰样式位（摘 WS_CAPTION 那一手害了最大化，不许再来一次；注释里提到这几个名字不算，只拦真调用）',
    每一份.every(x => !/GWL_STYLE\s*[,)]|SetWindowLongPtrW\s*\(|GetWindowLongPtrW\s*\(/.test(x.文)),
    每一份.filter(x => /GWL_STYLE\s*[,)]|SetWindowLongPtrW\s*\(|GetWindowLongPtrW\s*\(/.test(x.文)).map(x => x.p).join('、'));
  台.判('撤法只有一手：请 Tauri 自己撤（set_decorations(false)），撤完把 tao 那份标记读回来',
    /fn 撤干净\(w: &tauri::WebviewWindow, 为什么: &str, 每趟都记: bool\) \{\s*let _ = w\.set_decorations\(false\);\s*match w\.is_decorated\(\)/.test(窗));
  台.判('读回来那一句三种写法分开：已撤（只在开机那一趟留一笔）/ 还是「有装饰」/ 问不出',
    窗.includes('系统那一圈已撤（tao 那份标记是无装饰') && 窗.includes('这一趟就是双层窗口，见 issue #62')
    && 窗.includes('（问不出不等于已撤）'));
  台.判('不在主线程上的那几条路把这一手排回主线程（别在别的线程上碰窗口本体）',
    窗.includes('if w.run_on_main_thread(move || 撤干净(&窗, &话, false)).is_err()'));
  const 撤手 = (窗.match(/fn 撤那一圈\(&?w: &tauri::WebviewWindow, 为什么: &str\)/g) || []).length;
  台.判('运行时那一道撤手只有一颗（四条路共用它，不在每一处各写一遍读回来各说一套）',
    撤手 === 1 && 窗.includes('let _ = w.set_decorations(false);') && 窗.includes('match w.is_decorated()'));
  台.判('四条会把那一圈补回来的路各补一次：最大化/还原、托盘左键露出来、第二份点图标唤醒、从全屏退回来',
    (窗.match(/撤那一圈\(&?窗?w?, "/g) || []).length === 4
    && 窗.includes('撤那一圈(&w, "按了最大化/还原")') && 窗.includes('撤那一圈(&w, "托盘左键把窗口露出来")')
    && 窗.includes('撤那一圈(&窗, "第二份点图标把窗口唤醒")') && 窗.includes('撤那一圈(&w, "从全屏退回来")'),
    '补手 ' + (窗.match(/撤那一圈\(/g) || []).length + ' 处（含那颗定义）');
  台.判('启动那一路留了两笔时间戳：窗口露出来用了多少毫秒 —— 那一笔没落进日志就是卡在这之前，落了还卡就是页面的事',
    建窗.includes('let 起 = std::time::Instant::now();') && 建窗.includes('窗口露出来这一步走完，用了 {} 毫秒'));
}

台.题('九、回报给页面的形状与两枚事件名照旧');
台.判('回报的还是那两格 { maximized, fullscreen }', /maximized/.test(窗) && /fullscreen/.test(窗));
for(const 件 of ['win:state', 'fd:close-ask'])
  台.判('事件名「' + 件 + '」两头同一串（壳发得出，桥里听的是同一颗）',
    桥原文().includes("'" + 件 + "'") && 窗.includes('"' + 件 + '"'));

台.题('十、二十秒没回话按「退出」收（那条兜底在壳里）');
台.判('壳这边那一道 20 秒到点就收摊', 窗.includes('from_secs(20)'));
台.判('问过一次就不再重复问（待回答这块牌要拦两件事）',
  窗.includes('手.待回答') && 窗.includes('手.退出中'));

台.题('十一、窗口那一点纯判断有测试在跑，托盘那一档 feature 开着');
台.判('纯判断那一格里有 win_policy（缩放档位在那儿，带测试）',
  /win_policy/.test(判断) && fs.existsSync(path.join(壳根, 'src', 'core', 'win_policy.rs'))
  && /zoom_step/.test(判断) && (全格.match(/#\[test\]/g) || []).length >= 8);
台.判('缩放档位夹在 0.5 到 2 之间（那两道夹住写在纯判断那一格）',
  /0\.5/.test(判断) && /2\.0/.test(判断));
台.判('托盘那一档 feature 开着（关窗口那张框「收进托盘」的落点）',
  /features = \[[^\]]*"tray-icon"/.test(清单));

台.题('十二、壳那一头把三样东西装上了');
for(const 装 of ['.manage(', '.on_window_event(', '.setup('])
  台.判('装上了 ' + 装, 壳.includes(装));
台.判('拦关闭走的是 WindowEvent 里的 CloseRequested', 窗.includes('WindowEvent::CloseRequested'));

台.题('十三、挑文件与挑目录那两颗');
const 挑 = 壳里('src/tauri_bind/pick_cmds.rs');
for(const c of ['fsa:pickFiles', 'fsa:pickDir']){
  const b = 桥名(c);
  台.判(c + ' → ' + b + ' 在壳里有对应的一颗', 挑.includes('fn ' + b) && 壳.includes('pick_cmds::' + b));
}
台.判('回的还是那一格 paths（框里没挑东西就是空的那一串）',
  挑.includes('pub struct 一批路径 { paths: Vec<String> }') && 挑.includes('一批路径 { paths: 挑中 }')
  && 挑.includes('if id.is_empty() || 挑中.is_empty() { return; }'));
台.判('命令名两头只差冒号与驼峰这一道换算（壳里没有第三种拼法）',
  !/fn fsaPick|fn pick_files|fn pickFiles/.test(挑));

台.题('十四、探针预置与"记住上次挑过哪里"两道都跟着搬过来了');
台.判('预置那串环境变名认的是 FD_AUTOTEST_PICK（探针不用真点框）',
  挑.includes('FD_AUTOTEST_PICK'));
台.判('记路径那一份文件名叫 ui-paths.json', 挑.includes('ui-paths.json'));
台.判('记的是"挑中那一样自己是不是目录"，不是调用方说要目录',
  挑.includes('std::fs::metadata(挑中)') && /归格\(挑中, 是目录\)/.test(挑));

台.题('十五、类型筛选那一条的规则两头同一份');
台.判('只认带点的后缀，去重，合成一条叫「选定类型」',
  判断.includes('strip_prefix') && 判断.includes('选定类型'));
台.判('这条规则住在纯判断那一格（不在动手那一格里再抄一遍）',
  判断.includes('pub fn 筛选') && !挑.includes('fn 筛选'));

台.题('十六、对话框走的是官方那颗插件的 Rust 接口');
台.判('Cargo.toml 里登记了 tauri-plugin-dialog', /tauri-plugin-dialog/.test(清单));
台.判('main.rs 里把那颗插件 init 上了', 壳.includes('tauri_plugin_dialog::init()'));
台.判('动对话框的那一手在第三层，判断仍在纯判断那一格',
  挑.includes('blocking_pick_files') && 挑.includes('blocking_pick_folder'));

台.题('十七、没有对等接口的那一条要写着，不许当成已实现');
台.判('挑目录那一种框在 Rust 这头没有「新建文件夹」那一档，这一句写在动手那一本顶上',
  挑.includes('createDirectory') && !挑.includes('can_create_directory'));

台.题('十八、页面认「在不在程序里」认两样（Windows 上那套本地地址被系统改写那一手）');
const 工具 = rd('src/_fd/src/fd8-tools.js');
const 门牌 = 壳里('src/tauri_bind/page_cmds.rs');
台.判('数据层那一串前缀不再只按协议认：协议是 fdapp: 或者壳塞了那份门牌，两种都算在程序里',
  工具.includes("location.protocol === 'fdapp:' || !!window.__FD_BOOT__"));
台.判('壳塞的那份门牌就叫 __FD_BOOT__（两头同一串名，不是页面自己猜的）', 门牌.includes('window.__FD_BOOT__ ='));
台.判('这一串前缀还是那两处共用的唯一出处（词库、组件都从它拼，别处不再自己拼一份）',
  (工具.match(/DATA_PRE/g) || []).length >= 3 && 工具.includes("components:DATA_PRE + 'plugins/'"));
台.判('注释把为什么认两样说清了（Windows 改写成一串 http://…localhost，光看协议会当成开发那台）',
  /WebView2|改写/.test(工具) && 工具.includes('http://fdapp.localhost'));

台.题('十九、取资源那一路不许把整个程序带倒（2026-10-14 整本导入与双击章节闪退那一摊）');
const 那一格 = 壳里('src/core/boot_path.rs');
台.判('页面递进来的地址比的是字节，不许再拿一串字的前八枚字节去切还原回中文的那一段（三个字的书名第九个字节，第 8 枚落在一个字中间）',
  那一格.includes('段[1].as_bytes()') && !那一格.includes('let 头 = 段[1]'));
台.判('那一颗回调整个裹在撤不回去的那一手上：错撤不出去就会当场没，所以兜一道，兜住只回一张 404',
  门牌.includes('catch_unwind') && 门牌.includes('AssertUnwindSafe'));
台.判('兜住那一笔要在运行日志里留得下一行（用记一笔那一颗，它绝不抛、绝不回错），别只当没发生',
  门牌.includes('log_cmds::记一笔'));
台.判('倒过来的区间（bytes=9-1 这一类）先挡回去，不许直接下刀切那一段',
  门牌.includes('if 止 < 起'));

台.收尾();
