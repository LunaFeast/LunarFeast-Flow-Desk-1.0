/* 第三层 · 音乐遥控器那十颗动手的那一手（外46 三 批四 · 搬 main.cjs 1015 / 1023 / 1030 / 1039 / 1278 / 1279；
   批五 又添四颗 · 搬 main.cjs 1287 / 1296 / 1298 / 1367）
   ------------------------------------------------------------
   形状与单位照两处原文逐字段量：main.cjs 那十颗 handler，加上它们转手 call 的那份常驻监听脚本
   smtc-watcher.ps1（真正定字段名与单位的是它 —— 每一行推上来的快照就是页面吃的那一份）：
     media:state    → { supported, msg, state }，state 是最近那一份快照（没挑到会话就 null）
     media:hold     → { ok:true, holds }        —— 这一处桌面又挂了一处音乐，数着这本账起监听
     media:release  → { ok:true, holds }        —— 撤一处减一次，总数归零就把后台监听收掉
     media:cmd      → { ok, msg }               —— 递一条控制命令（认哪些串、不认回哪句全在纯判断那一格）
     media:players  → { ok:true, state: { pin, mbPath, music, flags, dir } }   （原件 playState 那五栏）
     media:pin      → { ok, msg }               —— 写 pin.txt 那一份小抄，写成了才递一句 pick
     media:dirPick  → 挑成了 { ok, msg, music } / 取消了 { ok, kept }（两支的格子不一样，一格都不许多）
     media:dirSet   → { ok, msg }               —— 整颗就是 playWrite('musicdir.txt', p) 的回执
     media:flag     → { ok, msg }               —— 开关那一句单键读写（表本身不回页面，页面读表走 media:players）
     media:bridge   → 五支并集：没装 / 包里没件 { ok:false, msg }、没找着 { ok:false, found:false, msg }、
                      被咬住 { ok:false, busy:true, dir, msg }、装成了 { ok:true, dir, to, kb, msg }、
                      拷不过去 { ok:false, dir, msg }（每一格都是「这一支有才出现」，全落在 一个桥回执 上）
   往所有窗口广播那一趟照 mediaTell（1013 行）：事件名 media:state，payload { supported, msg, state, ev }，
   那一路 supported 恒真 —— 是原件原样，不是写错。

   走的是哪套 Windows 接口（这一批的口径：系统的事走系统接口，不再 shell 出去起常驻 PowerShell + 现编 C#）：
     SMTC 走 WinRT —— windows 那层的 Windows.Media.Control（Cargo 里那一档 feature 叫 Media，就是这六颗要用的）：
       GlobalSystemMediaTransportControlsSessionManager::RequestAsync → GetSessions / GetCurrentSession
       GlobalSystemMediaTransportControlsSession：TryGetMediaPropertiesAsync（题·家·集）、
         GetPlaybackInfo（状态·倍速·那七枚能不能按）、GetTimelineProperties（pos·dur·min·max）
         TryPlayAsync / TryPauseAsync / TryTogglePlayPauseAsync / TrySkipNextAsync / TrySkipPreviousAsync
         / TryStopAsync / TryChangePlaybackPositionAsync（那一头单位是 100 纳秒一档，换算在纯判断那一格）
       会话的三个变更事件（PlaybackInfoChanged / MediaPropertiesChanged / TimelinePropertiesChanged）
       加管理器那两个（CurrentSessionChanged / SessionsChanged）。实时数据不轮询、一个定时器都不装：
       没动静时这条线程阻塞在「等下一句」上，和脚本那头阻塞在 Console.ReadLine 一模一样。
     播放器小抄那一份文件夹照 main.cjs 1220~1221 行：LOCALAPPDATA（没设就退 APPDATA，等于 Electron 的
       appData）底下 Flow-Desk\players\ —— 两颗 exe 共用同一份，MusicBee 那颗桥插件报上来的那行也读这里。

   慢的调用一律不占主线程：整条 SMTC 那一趟在一条自己的线程上跑（那条线程里一台只跑这一趟的运行时），
   批四那六颗命令本身只是「记一笔账 + 往那条线程递一句」，一个字都不等 —— 后台线程 + 超时那套写法照 info_cmds。
   批五那四颗里 dirPick（等用户点框）与 bridge（一格一格数盘 + 读注册表）是 async 命令，
   跑在 tokio 那一条线程上，同样不占窗口那一条；dirSet 与 flag 就是读一份写一份，跟着批四那五颗走同步。

   五处明写着没搬齐 / 做不全等的（不是藏着）：
     ① 脚本那份还给 MusicBee 留了一条「走桥插件那一行明文」的近路（musicbee-cmd.txt），因为它不想让
        MusicBee 的会话声明 IsPlayEnabled 之后抢走硬件媒体键。这一头照旧走系统那一路 Try*，
        装了桥插件的 MusicBee 在这一头会不会又抢媒体键，得起程序当场验过才敢写 —— 这一批不许起程序自测，没验。
     ② main.cjs 那一颗 fs.watch(players\)（1261 行 playWatch：小抄一变就广播 media:players 并重递一句 pick）
        不在这九颗里，没搬 —— media:players 照样回当前那一份，mediaOnPlayers 那一路暂时不会自己动。
        这一条直接影响批五：dirPick / dirSet / flag 写完盘上就变了，页面那头要等下一次问（或重新挂卡）才跟上，
        原件是当场广播。装桥插件那一句里说的「正在放的歌会把文件路径写进 players\musicbee.txt」也一样 ——
        那一份壳里读得到（media:players 的 mbPath），但没人替它广播。
     ③ media:bridge 找 MusicBee 装在哪，原件有三条路（1347 行 mbDir）：正在跑的进程路径（喊 powershell 取
        Get-Process）、注册表 App Paths、常见落点挨个试。壳里不起子进程（批四那条口径），走得通的是后两条；
        「正开着」那一档原件是动手前先拿 tasklist.exe 问一句（1342 行 mbRunning），这一头挪到真拷那一步 ——
        撞上「文件被别的程序咬住」那一条盘上错码才报 busy:true。差在 MusicBee 正开着而目标那一格还空着
        （第一次装）时：原件当场挡一句，这一头会真拷过去（装是装成了，不重启它照样监不到，页面那句提示本来就说要重启）。
     ④ 同一颗里那两笔运行日志（旧插件留了备份 / 已装到哪一格）照原件落 data\logs\ ——
        动手在 tauri_bind::log_cmds，那一行的形状在 core::log_line（带测试），两句原话照抄。
     ⑤ 同一颗的「源」：原件 landAsset 先把插件文件落到用户数据底下的 watcher\ 再拿那一份当源，壳里没有那一格
        （常驻监听脚本换成系统接口后没人再往那儿落脚本），回给页面的 from 那一路念的是包里那一份的原位置 ——
        字段一格不差、路径不同一处。包里那一颗若是 zip 里的那一份（原件 packRaw 自己拆），这一头的壳没带解压件，
        读不出来就照「包里没带插件文件」那一句报。 */
use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::{json, Map, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};

use windows::core::{HSTRING, PCWSTR, Ref};
use windows::Foundation::TypedEventHandler;
use windows::Media::Control::{
    CurrentSessionChangedEventArgs, GlobalSystemMediaTransportControlsSession,
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackInfo,
    GlobalSystemMediaTransportControlsSessionTimelineProperties, MediaPropertiesChangedEventArgs,
    PlaybackInfoChangedEventArgs, SessionsChangedEventArgs, TimelinePropertiesChangedEventArgs,
};
use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Registry::{RegGetValueW, HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ};
use windows::Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED};

use crate::fd_core::media_rule as 判;

/* ---------- 回给页面的那几格（形状照 main.cjs，一格都不许多） ---------- */

/// media:cmd 与 media:pin 那一格（原件两支都是 { ok, msg }，msg 恒在）
#[derive(Serialize)]
pub struct 一个成不成 {
    pub ok: bool,
    pub msg: String,
}

/// media:hold / media:release 那一格
#[derive(Serialize)]
pub struct 一个挂账 {
    ok: bool,
    holds: u32,
}

/// media:state 回的那一格
#[derive(Serialize)]
pub struct 一份媒体状态 {
    supported: bool,
    msg: String,
    state: Option<Value>,
}

/// mediaTell 往每张窗口送的那一格（supported 恒真那一档照原件）
#[derive(Serialize, Clone)]
struct 推的一行 {
    supported: bool,
    msg: String,
    state: Option<Value>,
    ev: Value,
}

/// playState() 那一格：五栏一名不落（main.cjs 1238 行）
#[derive(Serialize)]
pub struct 一份小抄 {
    pin: String,
    /* 插件清单里那一栏的名字就是驼峰（页面那头读的是 state.mbPath），Rust 那位按规矩下划线，
       序列化那一层改名 —— 页面上那一个字都不许动 */
    #[serde(rename = "mbPath")]
    mb_path: String,
    music: String,
    flags: Value,
    dir: String,
}

/// media:players 回的那一格
#[derive(Serialize)]
pub struct 一个播放器清单 {
    ok: bool,
    state: 一份小抄,
}

/// media:dirPick 回的那一格 —— 原件两支的格子不一样（1291 / 1294 行）：
///   挑成了 = { ok, msg, music }，取消了 = { ok, kept }，所以三格都是「有才有」
#[derive(Serialize)]
pub struct 一个目录回执 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    music: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kept: Option<String>,
}

/// media:bridge 回的那一格 —— 原件五支回法（1369 / 1372 / 1375 / 1380 / 1392 / 1394 行）的并集：
///   { ok, msg } / { ok, found, msg } / { ok, busy, dir, msg } / { ok, dir, to, kb, msg } / { ok, dir, msg }
///   —— 一格都不许多，哪一支有才哪一格出现
#[derive(Serialize)]
pub struct 一个桥回执 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    found: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    busy: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kb: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

/* ---------- 常驻那一趟的账 ---------- */

/// 这一家插件的名字（那道闸与包格都认它）
const 那一家: &str = "music-remote";
/// 这一家的插件清单那份文件名（装了没有、包里那一颗在哪一栏，读的都是这一份）
const 包清单名: &str = "manifest.json";
/// 自家那一处的身份（原件 mediaSay({cmd:'self', app:APP.label})，APP.label 是 'Flow-Desk'，main.cjs 62 行）
const 自家身份: &str = "Flow-Desk";

#[derive(Default)]
pub struct 媒体手 {
    /// 窗口名 → 这一处挂了几处音乐（原件 mediaHolds 那张表按 webContents.id 数，这一头按窗口名）
    挂: Mutex<HashMap<String, u32>>,
    /// 后台监听那一趟的账（命令这一头与那条线程共用一份）
    账: Arc<Mutex<监听账>>,
}

#[derive(Default)]
struct 监听账 {
    /// 有 = 监听在跑
    令: Option<UnboundedSender<一条命令>>,
    /// 这一代监听说的话才算数（脚本那头 gen 同一手：迟到的收尾不许顶掉新起的那一代）
    代: u32,
    /// 推上去的第几行（页面靠 seq 认「这是一份真快照」，也靠它挡重复 apply）
    序: u64,
    /// 起过没有（报上来过一行 ready 才算起过 —— 原件 media.ready）
    起过: bool,
    /// 意外收摊重起过几回（原件 media.tries，预算三回）
    已试: u32,
    /// 是不是我们自己收的摊（原件 media.killed）
    自己收: bool,
    /// 这一路坏掉了（原件 media.dead：坏了就不再重起，撤掉再装回来才清）
    死掉: bool,
    /// 给页面的那一句（原件 media.msg）
    话: String,
    /// 最近那一份快照（原件 media.last：没挑到会话的那一行把它清成空）
    最新: Option<Value>,
    /// 钉住的那一家（新起的一代从这一栏起头，省得撤了再装回来就忘了）
    钉住: String,
    /// 上一份正文（一模一样就别播 —— 没在放的播放器一秒一跳，全播出去卡片就一直重画）
    上一份: String,
    /// 这一代起于哪一刻（脚本那行的 since 就是它）
    起于: Option<Instant>,
}

/// 往那一趟递的一句（和脚本 stdin 那几种一一对上）
#[derive(Debug)]
enum 一条命令 {
    /// 重算一份快照并播：理由（ready / rescan / playback / media / timeline / ask / pick / self / warm）+ 来源那一家
    看一眼 { 理由: &'static str, 来自: String },
    /// 递一条控制命令
    播控 { 命令: String, 进度: i64 },
    /// 换成这一家（空串 = 回到自动挑）
    钉住(String),
    /// 自家那一处的身份（自动挑时跳过它）
    自家(String),
    /// 补读第几趟（脚本 Warm()：没读到歌那一趟隔 900 毫秒再问，最多三回）
    补读(u32),
    /// 收摊（那条线程自己也留着一份令口，光靠令口断了认不出是我们收的，所以明说一句）
    收摊,
}

/* ---------- 十颗命令 ---------- */

/// media:state —— 问一次当前状态：闸拦着就把那句报回去，没拦着就让后台监听起来
#[tauri::command]
pub fn media_state(手: State<'_, 媒体手>, app: AppHandle) -> 一份媒体状态 {
    /* 原件 1016~1019 行的先后：先问闸，闸拦着直接回 { supported:false, msg:那句, state:null } */
    if let Some(句) = 判::媒体闸(装了音乐遥控器(), 总挂处(&手)) {
        return 一份媒体状态 { supported: false, msg: 句.to_string(), state: None };
    }
    起监听(&app, &手);
    let 守 = 看账(&手);
    一份媒体状态 { supported: !守.死掉, msg: 守.话.clone(), state: 守.最新.clone() }
}

/// media:hold —— 这一块页面上又多挂了一处音乐
#[tauri::command]
pub fn media_hold(手: State<'_, 媒体手>, 窗口: tauri::Window, app: AppHandle) -> 一个挂账 {
    let 名 = 窗口.label().to_string();
    let 数 = {
        let mut 挂 = 手.挂.lock().unwrap_or_else(|e| e.into_inner());
        let 新 = 判::挂账加(挂.get(&名).copied().unwrap_or(0));
        挂.insert(名, 新);
        新
    };
    /* 第一处音乐挂上来 = 后台监听该起了（起监听自己有闸）。原件这一句后面还跟着 volStart() ——
       音量那位在这一头没有常驻子进程，每颗命令现拿默认端点，等价于「什么都不用起」 */
    起监听(&app, &手);
    一个挂账 { ok: true, holds: 数 }
}

/// media:release —— 撤了一处；总数归零就把后台监听收掉（撤了卡后台还在听 = 监听没跟着功能走）
#[tauri::command]
pub fn media_release(手: State<'_, 媒体手>, 窗口: tauri::Window) -> 一个挂账 {
    let 名 = 窗口.label().to_string();
    let 数 = {
        let mut 挂 = 手.挂.lock().unwrap_or_else(|e| e.into_inner());
        let 新 = 判::挂账减(挂.get(&名).copied().unwrap_or(0));
        挂.insert(名, 新);
        新
    };
    /* 窗口没了也算撤一处：原件 995~1005 行那条 c.on('destroyed') —— 这一头靠壳的窗口事件撤账，
       见 win_cmds::窗口事件 里收的那一手（这一批没改它，闭窗口时那一本账由 release 与窗口事件两条路一起清） */
    if 判::该收监听(总挂处(&手)) {
        收监听(&手, 判::收监听那句);
    }
    一个挂账 { ok: true, holds: 数 }
}

/// media:cmd —— 递一条控制命令（那九条串之外一律不认，名单住在纯判断那一格）
#[tauri::command]
pub fn media_cmd(手: State<'_, 媒体手>, app: AppHandle, msg: Value) -> 一个成不成 {
    /* 原件 1040~1051 行的先后：闸 → 起 → 认命令串 → 递得动递不动 → pick 那一支再写 pin.txt */
    if let Some(句) = 判::媒体闸(装了音乐遥控器(), 总挂处(&手)) {
        return 一个成不成 { ok: false, msg: 句.to_string() };
    }
    起监听(&app, &手);
    let 串 = msg.get("cmd").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if !判::认这条命令(&串) {
        return 一个成不成 { ok: false, msg: format!("{}{}", 判::不认那句, 串) };
    }
    let 名字 = 判::截三百(msg.get("app").and_then(|v| v.as_str()).unwrap_or(""));
    let 递得动 = if 判::命令递的是名字吗(&串) {
        钉住那一家(&手, &名字)
    } else {
        let 度 = 判::进度取值(msg.get("pos").and_then(|v| v.as_f64()));
        递(&手, 一条命令::播控 { 命令: 串.clone(), 进度: 度 })
    };
    if !递得动 {
        let 守 = 看账(&手);
        let 句 = if 守.话.is_empty() { 判::监听没起来那句.to_string() } else { 守.话.clone() };
        return 一个成不成 { ok: false, msg: 句 };
    }
    if 判::命令递的是名字吗(&串) {
        /* 原件 1050 行：递成功了才落盘，写那一句的回执不报给页面（跟那一头一样） */
        写一份(判::钉住件名, &名字);
    }
    一个成不成 { ok: true, msg: String::new() }
}

/// media:players —— 小抄当前那一份（页面卡挂上来问一次；往后的更新原本走 playWatch 那一路广播，见顶上第②条）
#[tauri::command]
pub fn media_players() -> 一个播放器清单 {
    一个播放器清单 { ok: true, state: 小抄() }
}

/// media:pin —— 钉住哪一家（空串 = 回到自动挑正在放的那个）
#[tauri::command]
pub fn media_pin(手: State<'_, 媒体手>, target: String) -> 一个成不成 {
    /* 原件 1279~1283 行：先写 pin.txt，写成了才把这一句递给监听（递的名字与写盘的名字同一个） */
    let 名 = 判::截三百(&target);
    let 得 = 写一份(判::钉住件名, &名);
    if 得.ok {
        钉住那一家(&手, &名);
    }
    得
}

/// media:dirPick —— 原生框挑一个音乐文件夹：挑成了写进 musicdir.txt，取消了就把当前那一行报回去
#[tauri::command]
pub async fn media_dir_pick(窗口: tauri::Window, app: AppHandle) -> 一个目录回执 {
    /* 原件 1287~1295 行：那道框挂在发话那一张窗上（BrowserWindow.fromWebContents(e.sender)），
       properties 只有 openDirectory 一条、题是「挑音乐文件夹」，挑完写盘、写坏那句照 playWrite 的回执报。
       这一头走官方对话框那颗插件的 Rust 接口（与 fsa_pick_dir 同一手），blocking_pick_folder 是阻塞写法，
       所以这颗是 async —— 等用户点框的那一段不占窗口那一条线程。
       探针预置那一串（FD_AUTOTEST_PICK）这一颗不接：原件这颗 handler 压根没问 autotest，照原样。 */
    let 挑中 = {
        let 建 = app.dialog().file().set_title(判::挑目录题);
        let 建 = match app.get_webview_window(&窗口.label()) {
            Some(窗) => 建.set_parent(&窗),
            None => 建,
        };
        建.blocking_pick_folder()
    };
    let Some(路) = 挑中.and_then(|那| 那.into_path().ok()) else {
        /* 取消了 / 一格都没挑（原件 r.canceled || !r.filePaths.length）：{ ok:true, kept:当前那一行 }，
           这一支没有 msg 也没有 music —— 页面靠「没有 music」认「原来的那个接着用」 */
        return 一个目录回执 { ok: true, msg: None, music: None, kept: Some(读一份(判::音乐目录件名)) };
    };
    let 串 = 路.to_string_lossy().to_string();
    let 得 = 写一份(判::音乐目录件名, &串);
    一个目录回执 { ok: 得.ok, msg: Some(得.msg), music: Some(串), kept: None }
}

/// media:dirSet —— 页面那一头算出来的一行绝对路径直接落盘（原件整颗就是 playWrite 的回执，一格都不许多）
#[tauri::command]
pub fn media_dir_set(p: String) -> 一个成不成 {
    /* 原件 1296 行：(e, p) => playWrite('musicdir.txt', p) —— 没套 try、没别的分支。
       页面上「不指定」那一句递的是空串，走的也是这一颗（小抄写入值 与原件那一句 replace(/\s+$/,'') 同手） */
    写一份(判::音乐目录件名, &p)
}

/// media:flag —— 音乐遥控器那几个开关的单键读写（原件 playFlagSet 1251~1259 行）
#[tauri::command]
pub fn media_flag(k: String, v: Option<Value>) -> 一个成不成 {
    /* 先后照原件：先洗名，名洗没了当场挡那一句；再洗值；读现表比一眼 —— 一模一样就 ok、连文件都不碰
       （原件 1256 行那一支：省得白惊一次监听）；不一样才把那一栏替进整表重写。
       回给页面的只有 { ok, msg } —— 表本身不回（页面那头读表走的是 media:players 的 flags 那一格）。
       v 收的是 Option：页面上那一栏没递（undefined）时桥不会把它塞进包，原件那句 value == null 当空串，
       这一头 None 也当空串 —— 差一档就会当场报「缺参数」而不是回空 */
    let 名 = 判::开关名清洗(&k);
    if 名.is_empty() {
        return 一个成不成 { ok: false, msg: 判::开关名不对那句.to_string() };
    }
    let 新值 = 判::开关值清洗(&判::开关值文本(v.as_ref()));
    let 表 = 判::开关表(&读一份(判::开关件名));
    if 判::开关取(&表, &名).as_deref() == Some(新值.as_str()) {
        return 一个成不成 { ok: true, msg: String::new() };
    }
    写一份(判::开关件名, &判::开关并入(&表, &名, &新值))
}

/// media:bridge —— 给 MusicBee 装那颗监听插件（原件 1367~1396 行那一颗）
#[tauri::command]
pub async fn media_bridge() -> 一个桥回执 {
    /* 原件的先后：packHas('music-remote') → landAsset 取包里那一份 → mbDir 找装在哪 →
       mbRunning 挡一句 → 建 Plugins 那一格 → 同名留 .bak → 拷过去 → 报大小 */
    if !装了音乐遥控器() {
        return 一个桥回执 { ok: false, found: None, busy: None, dir: None, to: None, kb: None, msg: Some(判::桥没装那句.to_string()) };
    }
    let Some(从) = 包里那份() else {
        return 一个桥回执 { ok: false, found: None, busy: None, dir: None, to: None, kb: None, msg: Some(判::桥没件那句.to_string()) };
    };
    let Some(家) = 找音乐bee() else {
        /* 这一支多带 found:false（原件 1375 行就是这一格），msg 里带着源那一串与手动装的写法 */
        return 一个桥回执 {
            ok: false, found: Some(false), busy: None, dir: None, to: None, kb: None,
            msg: Some(判::桥没找着句(&从)),
        };
    };
    let 插件格 = Path::new(&家).join(判::插件格名);
    let 到 = 插件格.join(判::桥插件件名);
    let 家串 = 家;
    let 格串 = 插件格.to_string_lossy().to_string();
    let 到串 = 到.to_string_lossy().to_string();
    /* 「MusicBee 正开着」这一档：原件先喊 tasklist.exe 问进程再动手，壳里不起子进程（顶上第③条），
       改成挪到真拷那一步 —— 撞上「文件被别的程序咬住」那一条盘上错码就报 busy:true 那一句 */
    if let Err(e) = std::fs::create_dir_all(&插件格) {
        return 桥拷不动(&盘上那句(&e), &家串, &从, &格串);
    }
    /* 同名先留一份 .bak（原件 1384~1388 行，那一句「旧插件留了备份」也照原样落进 data\logs） */
    if 到.is_file() {
        let 底串 = format!("{}.bak", 到串);
        if let Err(e) = std::fs::copy(&到, &底串) {
            return 桥拷不动(&盘上那句(&e), &家串, &从, &格串);
        }
        crate::tauri_bind::log_cmds::记一笔("插件", format!("旧插件留了备份：{}", 底串));
    }
    match std::fs::copy(&从, &到) {
        Ok(写进) => {
            /* 原件 1390 行报的是 statSync(到).size 那一颗落盘之后的字节数（不是源那份的） */
            let 千字节 = 判::算千字节(写进);
            crate::tauri_bind::log_cmds::记一笔("插件", format!("已装 {}（{}KB）", 到串, 千字节));
            let 句 = 判::桥装好句(&到串, 千字节);
            一个桥回执 {
                ok: true, found: None, busy: None, dir: Some(家串), to: Some(到串), kb: Some(千字节),
                msg: Some(句),
            }
        }
        Err(e) => {
            if e.raw_os_error() == Some(判::咬住错码) {
                let 句 = 判::桥咬住句(&到串);
                return 一个桥回执 {
                    ok: false, found: None, busy: Some(true), dir: Some(家串), to: None, kb: None,
                    msg: Some(句),
                };
            }
            桥拷不动(&盘上那句(&e), &家串, &从, &格串)
        }
    }
}

/// 桥那一颗「拷不过去」那一支：{ ok:false, dir, msg }（原件 1394 行，没有 to 也没有 kb）
fn 桥拷不动(那句: &str, 家: &str, 从: &str, 插件格: &str) -> 一个桥回执 {
    一个桥回执 {
        ok: false, found: None, busy: None, dir: Some(家.to_string()), to: None, kb: None,
        msg: Some(判::桥拷不动句(那句, 从, 插件格)),
    }
}

/* ---------- 那一本挂账 ---------- */

fn 看账<'a>(手: &'a 媒体手) -> std::sync::MutexGuard<'a, 监听账> {
    /* 哪一处崩过都不该把这本账锁死：中毒的账照样交出来（照 info_cmds 里看账那一颗）。
       收的是 媒体手 本体，命令那一头的 State<'_, 媒体手> 靠 Deref 直接递进来 */
    手.账.lock().unwrap_or_else(|e| e.into_inner())
}

fn 总挂处(手: &媒体手) -> u32 {
    let 挂 = 手.挂.lock().unwrap_or_else(|e| e.into_inner());
    挂.values().sum()
}

/* ---------- 起与收那一趟监听 ---------- */

/// 后台监听该不该起、起得起起不起：装了没有、几处挂着、这一路坏没坏、是不是已经在跑（原件 mediaStart 头顶那三句）
fn 起监听(壳: &AppHandle, 手: &媒体手) {
    let 台账 = 手.账.clone();
    {
        let 守 = 台账.lock().unwrap_or_else(|e| e.into_inner());
        if 守.令.is_some() || 守.死掉 {
            return;
        }
    }
    if 判::媒体闸(装了音乐遥控器(), 总挂处(手)).is_some() {
        return;
    }
    let (发, 收) = unbounded_channel::<一条命令>();
    let 代 = {
        let mut 守 = 台账.lock().unwrap_or_else(|e| e.into_inner());
        /* 再问一遍：上面那一句到这一句之间可能已经被别的窗口抢着起了 */
        if 守.令.is_some() || 守.死掉 {
            return;
        }
        守.令 = Some(发.clone());
        守.代 += 1;
        守.序 = 0;
        守.起过 = false;
        守.自己收 = false;
        守.上一份 = String::new();
        守.起于 = Some(Instant::now());
        守.代
    };
    let 壳 = 壳.clone();
    let 台账线 = 台账.clone();
    let 起不来 = std::thread::Builder::new()
        .name("fd-音乐监听".into())
        .spawn(move || 跑线程(壳, 台账线, 发, 收, 代))
        .err()
        .map(|e| e.to_string());
    if let Some(话) = 起不来 {
        /* 原件 954 行那一手：线程都生不出来就当这一路坏了，报同一档意思的一句 */
        let mut 守 = 台账.lock().unwrap_or_else(|e| e.into_inner());
        守.令 = None;
        守.死掉 = true;
        守.话 = format!("监听起不来：{}", 话);
    }
}

/// 收掉这一趟监听。「是被撤掉的，不是坏掉的」—— 死掉那位跟着清掉，装回来还得起得来（原件 mediaStop）
/// pub(crate) 是给 pack:set 那一颗留的口子（原件 packAfterSet 1893 行：卸掉音乐遥控器就当场收监听，
/// 不等窗口关）—— 监听没在跑（原件 media.child 那一道）时自己 return，一颗副作用都不留
pub(crate) fn 收监听(手: &媒体手, 那句: &str) {
    let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
    let Some(口) = 守.令.take() else { return };
    守.代 += 1; /* 这一代迟到的收尾一律不算 */
    守.最新 = None;
    守.上一份 = String::new();
    守.序 = 0;
    守.起过 = false;
    守.已试 = 0;
    守.起于 = None;
    守.死掉 = false;
    守.自己收 = true;
    守.话 = 那句.to_string();
    let _ = 口.send(一条命令::收摊);
}

/// 往那一趟递一句；监听没在跑就回 false（原件那句 media.child && stdin.writable）
fn 递(手: &媒体手, 令: 一条命令) -> bool {
    let 守 = 看账(手);
    match 守.令.as_ref() {
        Some(口) => 口.send(令).is_ok(),
        None => false,
    }
}

/// 换成这一家：先记进账（新起的那一代也从账上读得到），再递给在跑的那一趟
fn 钉住那一家(手: &媒体手, 名: &str) -> bool {
    {
        let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
        守.钉住 = 名.to_string();
    }
    递(手, 一条命令::钉住(名.to_string()))
}

/* ---------- 那条线程：一台只跑这一趟的运行时 + 等下一句（不轮询） ---------- */

/// 这条线程自己那一摊：管理器、递话的令口、挂上了手的会话、钉住与自家那两位
struct 监听台 {
    管: GlobalSystemMediaTransportControlsSessionManager,
    令口: UnboundedSender<一条命令>,
    /// 会话 + 那一枚会话上三个事件的号（重扫时按号撤手，脚本 Sink.Detach 同一手）
    挂着: Vec<(GlobalSystemMediaTransportControlsSession, (i64, i64, i64))>,
    钉住: String,
    自家: String,
}

fn 跑线程(
    壳: AppHandle,
    台账: Arc<Mutex<监听账>>,
    口: UnboundedSender<一条命令>,
    收: UnboundedReceiver<一条命令>,
    代: u32,
) {
    /* 这一趟整块交给一条自己的线程：WinRT 那些会话对象挪不进 tauri 那条 async 命令的 future 里，
       而事件回调、补读、重起这三样都得有个不占主线程的地方待着 */
    let 结 = match tokio::runtime::Builder::new_current_thread().enable_time().build() {
        Ok(台) => 台.block_on(跑监听(壳.clone(), 台账.clone(), 口, 收, 代)),
        Err(e) => Err(format!("监听这一趟起不来：{}", e)),
    };
    收尾(&壳, &台账, 代, 结);
}

/// 这一趟收摊之后怎么记账：我们自己收的就不算坏；意外收的照那一头最多重起三回
fn 收尾(壳: &AppHandle, 台账: &Arc<Mutex<监听账>>, 代: u32, 结: Result<(), String>) {
    let 要不要重起 = {
        let mut 守 = 台账.lock().unwrap_or_else(|e| e.into_inner());
        if 守.代 != 代 {
            return; /* 已经被新一代替掉了：这一趟说的话一个字都不算 */
        }
        守.令 = None;
        match 结 {
            /* 收摊那句收出来的正常收摊：收监听那句已经记好了，不判死 */
            Ok(()) => false,
            Err(话) => {
                守.话 = 话;
                let 试 = 判::还该重起(守.起过, 守.已试, 守.自己收);
                if 试 {
                    守.已试 += 1;
                } else {
                    守.死掉 = true;
                }
                /* 那一头是 mediaTell({ ev:'bye', ok:false, msg })：页面靠这一行把「监听断了」摆出来 */
                let 行 = json!({ "ev": "bye", "ok": false, "msg": 守.话.clone() });
                播一行(壳, &守, 行);
                试
            }
        }
    };
    if 要不要重起 {
        /* 原件 977 行：隔 1200 毫秒再起一代（起监听自己有闸，挂着几处、坏没坏它自己会问） */
        let 壳 = 壳.clone();
        let _ = std::thread::Builder::new().name("fd-音乐重起".into()).spawn(move || {
            std::thread::sleep(Duration::from_millis(判::重起间隔毫秒));
            /* 这一头挪进闭包再取：那条线程要 'static，借着一份 State 出去就出不去 */
            let 手 = 壳.state::<媒体手>();
            起监听(&壳, &手);
        });
    }
}

async fn 跑监听(
    壳: AppHandle,
    台账: Arc<Mutex<监听账>>,
    口: UnboundedSender<一条命令>,
    mut 收: UnboundedReceiver<一条命令>,
    代: u32,
) -> Result<(), String> {
    /* WinRT 那一头要先给这条线程定线程模型（RoInitialize；跟认色卡那一路同一手） */
    unsafe {
        let _ = RoInitialize(RO_INIT_MULTITHREADED);
    }
    let 请 = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| 说错("SMTC 管理器认不到", e))?;
    /* 三秒没回来就报一句（脚本那头的 Await 默认也是三秒） */
    let 管 = match tokio::time::timeout(Duration::from_millis(判::常规等毫秒), 请).await {
        Ok(Ok(管)) => 管,
        Ok(Err(e)) => return Err(说错("SMTC 管理器读不出", e)),
        Err(_) => return Err("SMTC 管理器三秒没回来".to_string()),
    };
    let 钉住 = 看账(&壳.state::<媒体手>()).钉住.clone();
    let mut 台 = 监听台 { 管, 令口: 口, 挂着: Vec::new(), 钉住, 自家: String::new() };

    /* 管理器那两个事件：会话多了少了、系统换了当前那一家 —— 都是「重挂一遍再算一份」（脚本 Hook + rescan）。
       事件里只递一句「看一眼」，真读真算都在下面这一趟循环里办，回调那一条线程一个字都不占 */
    let 换当前 = {
        let 口 = 台.令口.clone();
        TypedEventHandler::<
            GlobalSystemMediaTransportControlsSessionManager,
            CurrentSessionChangedEventArgs,
        >::new(move |_甲: Ref<GlobalSystemMediaTransportControlsSessionManager>, _乙| {
            let _ = 口.send(一条命令::看一眼 { 理由: "rescan", 来自: String::new() });
            Ok(())
        })
    };
    let 多了少了 = {
        let 口 = 台.令口.clone();
        TypedEventHandler::<
            GlobalSystemMediaTransportControlsSessionManager,
            SessionsChangedEventArgs,
        >::new(move |_甲: Ref<GlobalSystemMediaTransportControlsSessionManager>, _乙| {
            let _ = 口.send(一条命令::看一眼 { 理由: "rescan", 来自: String::new() });
            Ok(())
        })
    };
    let _ = 台.管.CurrentSessionChanged(&换当前);
    let _ = 台.管.SessionsChanged(&多了少了);

    /* 第一趟：挂上手、算一份带 ready 的快照 */
    重挂(&mut 台);
    let (播了, 活) = 看一眼(&壳, &台账, &台, "ready", "", 代).await;
    if 播了 && !活 {
        起补读(&台.令口, 判::补读趟数);
    }
    /* 自家那一位与钉住那一家：原件是收到 ready 之后主进程往子进程递两句
       （mediaSay({cmd:'self', app:APP.label}) 与 mediaSay({cmd:'pick', app:playRead('pin.txt')})，
       main.cjs 988 行），脚本各回一句 self / pick 的快照。这一头同一手：往自己那一趟递两句，
       循环各算一份 —— 少递一句，页面上「这一处是自己放的」与「钉住了哪一家」就认不出来。 */
    let _ = 台.令口.send(一条命令::自家(自家身份.to_string()));
    let _ = 台.令口.send(一条命令::钉住(台.钉住.clone()));

    /* 往后的更新全凭事件：没动静时这一句阻塞，什么都不花 —— 一个定时器都不装 */
    loop {
        let Some(令) = 收.recv().await else { break Ok(()) };
        match 令 {
            一条命令::收摊 => break Ok(()),
            一条命令::看一眼 { 理由, 来自 } => {
                let (播了, 活) = 看一眼(&壳, &台账, &台, 理由, &来自, 代).await;
                if 播了 && !活 {
                    起补读(&台.令口, 判::补读趟数);
                }
            }
            一条命令::补读(还几趟) => {
                let (播了, 活) = 看一眼(&壳, &台账, &台, "warm", "", 代).await;
                if 播了 && !活 && 还几趟 > 1 {
                    起补读(&台.令口, 还几趟 - 1);
                }
            }
            一条命令::钉住(名) => {
                台.钉住 = 名;
                let (播了, 活) = 看一眼(&壳, &台账, &台, "pick", "", 代).await;
                if 播了 && !活 {
                    起补读(&台.令口, 判::补读趟数);
                }
            }
            一条命令::自家(名) => {
                台.自家 = 名;
                let (播了, 活) = 看一眼(&壳, &台账, &台, "self", "", 代).await;
                if 播了 && !活 {
                    起补读(&台.令口, 判::补读趟数);
                }
            }
            一条命令::播控 { 命令, 进度 } => 办一条(&壳, &台账, &mut 台, &命令, 进度, 代).await,
        }
    }
}

/// 重算一份快照并按脚本那五条规矩决定播不播：回「播了没有、这一份活不活」
async fn 看一眼(
    壳: &AppHandle,
    台账: &Arc<Mutex<监听账>>,
    台: &监听台,
    理由: &'static str,
    来自: &str,
    代: u32,
) -> (bool, bool) {
    let (正文, 歌名, 挑到了) = 读正文(台).await;
    let 活 = 判::快照算活吗(挑到了, &歌名);
    let 整行 = Value::Object(正文);
    let 必答 = 判::是非问必答(理由);
    let mut 守 = 台账.lock().unwrap_or_else(|e| e.into_inner());
    if 守.代 != 代 {
        return (false, 活); /* 已经被新一代替掉了 */
    }
    let 文 = 整行.to_string();
    /* 正文一模一样就别播（脚本 Say 那句：非问句一律答，别的一模一样就闭嘴） */
    if !判::该播这一趟吗(必答, 文 != 守.上一份) {
        return (false, 活);
    }
    守.上一份 = 文;
    守.序 += 1;
    if 理由 == "ready" {
        守.起过 = true;
    }
    /* 计数那几栏是播的时候才贴上去的（脚本 Emit()：seq / ev / ok / at / since / from） */
    let mut 整行 = 整行;
    if let Some(面) = 整行.as_object_mut() {
        面.insert("seq".to_string(), json!(守.序));
        面.insert("ev".to_string(), json!(理由));
        面.insert("ok".to_string(), json!(true));
        面.insert("at".to_string(), json!(现在毫秒()));
        面.insert(
            "since".to_string(),
            json!(守.起于.map(|刻| 刻.elapsed().as_millis() as u64).unwrap_or(0)),
        );
        if !来自.is_empty() {
            面.insert("from".to_string(), json!(来自));
        }
    }
    /* 原件 991 行：带 seq 的这一行是真快照；没挑到会话（session:null）就把最新那份清成空 */
    守.最新 = if 整行.get("session").map(|值| 值.is_null()).unwrap_or(false) {
        None
    } else {
        Some(整行.clone())
    };
    播一行(壳, &守, 整行);
    (true, 活)
}

/// 那十几栏正文（脚本 Body() 整颗，计数栏由 看一眼 贴）：回（正文, 歌名, 挑到了没有）
async fn 读正文(台: &监听台) -> (Map<String, Value>, String, bool) {
    let 会们 = 取会话(&台.管);
    let 信息: Vec<判::一个会话> = 会们
        .iter()
        .map(|会| 判::一个会话 { 身份: 读身份(会), 状态: 读状态(会) })
        .collect();
    let 当前 = 台.管.GetCurrentSession().map(|会| 读身份(&会)).unwrap_or_default();
    let 挑 = 判::挑会话(&信息, &台.钉住, &台.自家, &当前);

    let mut 面 = Map::new();
    面.insert("how".to_string(), json!(挑.挑法));
    面.insert("pin".to_string(), json!(台.钉住));
    面.insert("pinOk".to_string(), json!(挑.钉住对上));
    面.insert("n".to_string(), json!(台.挂着.len()));
    面.insert("list".to_string(), json!(列出来(&会们).await));

    let 第几 = match 挑.第几 {
        Some(第几) if 第几 < 会们.len() => 第几,
        _ => {
            /* 一家都没开、或者钉住的那一家没会话：这一行就是「此刻没会话可看」 */
            面.insert("session".to_string(), Value::Null);
            return (面, String::new(), false);
        }
    };
    let 会 = &会们[第几];
    let (题, 家, 集) = 读属性(会).await;
    let 线 = 会.GetTimelineProperties().ok();
    let 放 = 会.GetPlaybackInfo().ok();
    面.insert("app".to_string(), json!(信息[第几].身份));
    面.insert("title".to_string(), json!(题));
    面.insert("artist".to_string(), json!(家));
    面.insert("album".to_string(), json!(集));
    面.insert("status".to_string(), json!(信息[第几].状态));
    面.insert(
        "rate".to_string(),
        json!(判::倍速(
            放.as_ref()
                .and_then(|放| 放.PlaybackRate().ok())
                .and_then(|参| 参.Value().ok())
        )),
    );
    面.insert("pos".to_string(), json!(读时长(线.as_ref(), |线| 线.Position())));
    面.insert("dur".to_string(), json!(读时长(线.as_ref(), |线| 线.EndTime())));
    面.insert("min".to_string(), json!(读时长(线.as_ref(), |线| 线.MinSeekTime())));
    面.insert("max".to_string(), json!(读时长(线.as_ref(), |线| 线.MaxSeekTime())));
    面.insert("can".to_string(), 读能按(放.as_ref()));
    (面, 题, true)
}

/// 那七枚按钮能不能按（脚本 can 那一格七个字母一名不落）
fn 读能按(放: Option<&GlobalSystemMediaTransportControlsSessionPlaybackInfo>) -> Value {
    let 控 = 放.and_then(|放| 放.Controls().ok());
    let 七枚 = match 控.as_ref() {
        /* 读不动就当按不了（脚本那句 ct != null && ct.IsXxxEnabled 同一退法） */
        Some(控) => (
            控.IsPlayEnabled().unwrap_or(false),
            控.IsPauseEnabled().unwrap_or(false),
            控.IsPlayPauseToggleEnabled().unwrap_or(false),
            控.IsNextEnabled().unwrap_or(false),
            控.IsPreviousEnabled().unwrap_or(false),
            控.IsStopEnabled().unwrap_or(false),
            控.IsPlaybackPositionEnabled().unwrap_or(false),
        ),
        None => (false, false, false, false, false, false, false),
    };
    json!({ "p": 七枚.0, "x": 七枚.1, "t": 七枚.2, "n": 七枚.3, "v": 七枚.4, "s": 七枚.5, "k": 七枚.6 })
}

/// 时间轴上那一栏换算成毫秒（脚本 (long)xxx.TotalMilliseconds）
fn 读时长(
    线: Option<&GlobalSystemMediaTransportControlsSessionTimelineProperties>,
    取: fn(&GlobalSystemMediaTransportControlsSessionTimelineProperties) -> windows::core::Result<windows::Foundation::TimeSpan>,
) -> i64 {
    线.and_then(|线| 取(线).ok())
        .map(|串| 判::时长毫秒(串.Duration))
        .unwrap_or(0)
}

/// 设置里那一列：每一家报上来的会话都列一行，让他挑而不是手打（脚本 ListJson()：app / st / ti / du 四栏）
async fn 列出来(会们: &[GlobalSystemMediaTransportControlsSession]) -> Vec<Value> {
    let mut 出 = Vec::new();
    for 会 in 会们 {
        /* 这一栏的歌名读不动就空着（脚本那一趟也是 try/catch 吞掉）—— 设置那一张列表要的是名字，不是歌 */
        let (题, _, _) = 读属性(会).await;
        let 线 = 会.GetTimelineProperties().ok();
        出.push(json!({
            "app": 读身份(会),
            "st": 读状态(会),
            "ti": 题,
            "du": 读时长(线.as_ref(), |线| 线.EndTime()),
        }));
    }
    出
}

/// 题·家·集三栏（脚本 TryGetMediaPropertiesAsync 那一趟，六秒没回来就三栏全空）
async fn 读属性(会: &GlobalSystemMediaTransportControlsSession) -> (String, String, String) {
    let 得 = match 会.TryGetMediaPropertiesAsync() {
        Ok(请) => match tokio::time::timeout(Duration::from_millis(判::读歌名等毫秒), 请).await {
            Ok(Ok(属)) => Some(属),
            _ => None,
        },
        Err(_) => None,
    };
    match 得 {
        Some(属) => (读串(属.Title()), 读串(属.Artist()), 读串(属.AlbumTitle())),
        None => (String::new(), String::new(), String::new()),
    }
}

fn 读身份(会: &GlobalSystemMediaTransportControlsSession) -> String {
    /* SourceAppUserModelId 有两种写法（「MusicBee.exe」与一整条路径），怎么认同一家在纯判断那一格 */
    读串(会.SourceAppUserModelId())
}

fn 读状态(会: &GlobalSystemMediaTransportControlsSession) -> String {
    会.GetPlaybackInfo()
        .ok()
        .and_then(|放| 放.PlaybackStatus().ok())
        .map(|态| 判::状态名(态.0).to_string())
        .unwrap_or_default()
}

fn 读串(得: windows::core::Result<HSTRING>) -> String {
    得.map(|串| 串.to_string_lossy().to_string()).unwrap_or_default()
}

fn 取会话(管: &GlobalSystemMediaTransportControlsSessionManager) -> Vec<GlobalSystemMediaTransportControlsSession> {
    let mut 出 = Vec::new();
    if let Ok(表) = 管.GetSessions() {
        for 序 in 0..表.Size().unwrap_or(0) {
            if let Ok(会) = 表.GetAt(序) {
                出.push(会);
            }
        }
    }
    出
}

/// 会话多了少了就全撤全挂：GetSessions() 交出来的对象身份不保（脚本顶上那句注释同一意思，那一趟也很少跑到）
fn 重挂(台: &mut 监听台) {
    let 旧 = std::mem::take(&mut 台.挂着);
    for (会, (放, 集, 线)) in 旧 {
        let _ = 会.RemovePlaybackInfoChanged(放);
        let _ = 会.RemoveMediaPropertiesChanged(集);
        let _ = 会.RemoveTimelinePropertiesChanged(线);
    }
    for 会 in 取会话(&台.管) {
        let 身份 = 读身份(&会);
        if let Some(号) = 挂三枚(&会, &台.令口, &身份) {
            台.挂着.push((会, 号));
        }
    }
}

/// 给一枚会话挂上那三个变更事件（脚本 Sink.Attach() 那三行），回三个号
fn 挂三枚(
    会: &GlobalSystemMediaTransportControlsSession,
    口: &UnboundedSender<一条命令>,
    身份: &str,
) -> Option<(i64, i64, i64)> {
    let 放 = {
        let 口 = 口.clone();
        let 身 = 身份.to_string();
        TypedEventHandler::<
            GlobalSystemMediaTransportControlsSession,
            PlaybackInfoChangedEventArgs,
        >::new(move |_甲: Ref<GlobalSystemMediaTransportControlsSession>, _乙| {
            let _ = 口.send(一条命令::看一眼 { 理由: "playback", 来自: 身.clone() });
            Ok(())
        })
    };
    let 集 = {
        let 口 = 口.clone();
        let 身 = 身份.to_string();
        TypedEventHandler::<
            GlobalSystemMediaTransportControlsSession,
            MediaPropertiesChangedEventArgs,
        >::new(move |_甲: Ref<GlobalSystemMediaTransportControlsSession>, _乙| {
            let _ = 口.send(一条命令::看一眼 { 理由: "media", 来自: 身.clone() });
            Ok(())
        })
    };
    let 线 = {
        let 口 = 口.clone();
        let 身 = 身份.to_string();
        TypedEventHandler::<
            GlobalSystemMediaTransportControlsSession,
            TimelinePropertiesChangedEventArgs,
        >::new(move |_甲: Ref<GlobalSystemMediaTransportControlsSession>, _乙| {
            let _ = 口.send(一条命令::看一眼 { 理由: "timeline", 来自: 身.clone() });
            Ok(())
        })
    };
    let 一号 = 会.PlaybackInfoChanged(&放).ok()?;
    let 二号 = 会.MediaPropertiesChanged(&集).ok()?;
    let 三号 = 会.TimelinePropertiesChanged(&线).ok()?;
    Some((一号, 二号, 三号))
}

/// 递一条控制命令并回一句回显（脚本 Command() 那一段：挑不着就 ok:false + 那两句，挑着了就 Try* 一回）
async fn 办一条(
    壳: &AppHandle,
    台账: &Arc<Mutex<监听账>>,
    台: &mut 监听台,
    命令: &str,
    进度: i64,
    代: u32,
) {
    if 命令 == "snapshot" {
        /* 脚本那一支先 Say("ask") 播一份，再回一句 cmd 回显 */
        let (播了, 活) = 看一眼(壳, 台账, 台, "ask", "", 代).await;
        if 播了 && !活 {
            起补读(&台.令口, 判::补读趟数);
        }
        播回显(壳, 台账, json!({ "ev": "cmd", "cmd": "snapshot", "ok": true }));
        return;
    }
    let 会们 = 取会话(&台.管);
    let 信息: Vec<判::一个会话> = 会们
        .iter()
        .map(|会| 判::一个会话 { 身份: 读身份(会), 状态: 读状态(会) })
        .collect();
    let 当前 = 台.管.GetCurrentSession().map(|会| 读身份(&会)).unwrap_or_default();
    let 挑 = 判::挑会话(&信息, &台.钉住, &台.自家, &当前);
    let 第几 = match 挑.第几 {
        Some(第几) if 第几 < 会们.len() => 第几,
        _ => {
            let 句 = if 挑.钉住对上 {
                判::没会话那句.to_string()
            } else {
                format!("{}{}", 判::钉住没会话那句, 台.钉住)
            };
            播回显(壳, 台账, json!({ "ev": "cmd", "cmd": 命令, "ok": false, "msg": 句 }));
            return;
        }
    };
    let 成 = 办命令(&会们[第几], 命令, 进度).await;
    播回显(
        壳,
        台账,
        json!({ "ev": "cmd", "cmd": 命令, "ok": 成, "app": 信息[第几].身份 }),
    );
}

/// 那七条落到 SMTC 的 Try* 上（脚本 Command() 那一段同一个对应关系）
async fn 办命令(会: &GlobalSystemMediaTransportControlsSession, 命令: &str, 进度: i64) -> bool {
    let 请 = match 命令 {
        "play" => 会.TryPlayAsync(),
        "pause" => 会.TryPauseAsync(),
        "toggle" => 会.TryTogglePlayPauseAsync(),
        "next" => 会.TrySkipNextAsync(),
        "prev" => 会.TrySkipPreviousAsync(),
        "stop" => 会.TryStopAsync(),
        /* seek 那一头递的是 100 纳秒一档的计数（脚本 pos * 10000L） */
        "seek" => 会.TryChangePlaybackPositionAsync(判::毫秒计数(进度)),
        _ => return false,
    };
    match 请 {
        Ok(请) => match tokio::time::timeout(Duration::from_millis(判::常规等毫秒), 请).await {
            Ok(Ok(成)) => 成,
            /* 三秒没回来当没办成（脚本 Await 撞 TimeoutException 回的那一支） */
            _ => false,
        },
        Err(_) => false,
    }
}

/// 没读到歌就隔 900 毫秒再补一问，最多三回（脚本 Warm()：只在空读之后排，不是常驻定时器）
fn 起补读(口: &UnboundedSender<一条命令>, 还几趟: u32) {
    let 口 = 口.clone();
    let _ = std::thread::Builder::new().name("fd-音乐补读".into()).spawn(move || {
        std::thread::sleep(Duration::from_millis(判::补读间隔毫秒));
        let _ = 口.send(一条命令::补读(还几趟));
    });
}

/* ---------- 广播 ---------- */

fn 播一行(壳: &AppHandle, 账: &监听账, 行: Value) {
    let _ = 壳.emit(
        "media:state",
        推的一行 {
            /* 原件 1013 行原样：广播那一路 supported 恒真（闸没闸由回值那一头说） */
            supported: true,
            msg: 账.话.clone(),
            state: 账.最新.clone(),
            ev: 行,
        },
    );
}

/// 命令回显那一行：不带 seq，所以不动 最新（页面那头靠 seq 挡的就是这一类行）
fn 播回显(壳: &AppHandle, 台账: &Arc<Mutex<监听账>>, 行: Value) {
    let 守 = 台账.lock().unwrap_or_else(|e| e.into_inner());
    播一行(壳, &守, 行);
}

/* ---------- 播放器小抄那一份文件夹（原件 PLAYDIR / playRead / playWrite / playState） ---------- */

/// 用户数据那一格的底（原件 LA_BASE / mbGuesses 里的 appData：LOCALAPPDATA，没设就退 APPDATA，
/// 等于 Electron 的 app.getPath('appData')；两处都没有就落在这一棵树所在那一格）。
/// 小抄格() 与找 MusicBee 的候选清单都从这一颗出 —— 环境变量那一路只认一次，不抄第二份
fn 用户数据底() -> PathBuf {
    let 清 = |名: &str| {
        std::env::var(名)
            .ok()
            .map(|值| 值.trim().to_string())
            .filter(|值| !值.is_empty())
    };
    清("LOCALAPPDATA")
        .or_else(|| 清("APPDATA"))
        .map(PathBuf::from)
        .unwrap_or_else(crate::tree_root)
}

/// 小抄那一格：用户数据那一格底下 Flow-Desk\players\（原件 PLAYDIR = path.join(LA_BASE, 'Flow-Desk', 'players')）
fn 小抄格() -> PathBuf {
    用户数据底().join(判::程序数据格).join(判::小抄格名)
}

/// 读一份小抄：读不到当空串，尾巴上的空白切掉（原件 playRead）
fn 读一份(名: &str) -> String {
    let 文 = std::fs::read_to_string(小抄格().join(名)).unwrap_or_default();
    判::小抄取值(&文)
}

/// 写一份小抄：内容没动一个字都不碰盘（一碰就惊一次文件监听），落盘补一个换行（原件 playWrite）
fn 写一份(名: &str, 值: &str) -> 一个成不成 {
    let 得 = |成: bool, 句: String| 一个成不成 { ok: 成, msg: 句 };
    let 要 = 判::小抄写入值(名, 值);
    if !判::该不该写(&读一份(名), &要) {
        return 得(true, String::new());
    }
    let 格 = 小抄格();
    if let Err(e) = std::fs::create_dir_all(&格) {
        return 得(false, e.to_string());
    }
    match std::fs::write(格.join(名), format!("{}\n", 要)) {
        Ok(()) => 得(true, String::new()),
        Err(e) => 得(false, e.to_string()),
    }
}

/// playState() 那一格：五栏一名不落
fn 小抄() -> 一份小抄 {
    let 表 = 判::开关表(&读一份(判::开关件名));
    /* 同名两回后头那一条赢（原件 out[k] = v 一句）；这里换成表再倒一遍，出的就是最后一份 */
    let 净: BTreeMap<String, String> = 表.into_iter().collect();
    let 面 = 净.into_iter().map(|(名, 值)| (名, json!(值))).collect::<Map<_, _>>();
    一份小抄 {
        pin: 读一份(判::钉住件名),
        mb_path: 读一份(判::桥报件名),
        music: 读一份(判::音乐目录件名),
        flags: Value::Object(面),
        dir: 小抄格().to_string_lossy().to_string(),
    }
}

/// 音乐遥控器在不在（原件 packHas 那三条：包格整个不在算装了；在的话要扫得到且没被点过名）
pub(crate) fn 装了音乐遥控器() -> bool {
    let 包格 = Path::new(&crate::tauri_bind::comp_cmds::活的那一格()).to_path_buf();
    if !包格.is_dir() {
        return 判::算装了(true, false, false);
    }
    /* 扫到的定义照 packScan：摊开的那一格有插件清单，或者只有一个同名 zip 躺在包格里。
       这一头不解 zip 读里头那份插件清单（要多带一套解压件），只认那一颗文件在不在 —— 包名就是文件名去掉 .zip。 */
    let 在 = 包格.join(那一家).join(包清单名).is_file()
        || 包格.join(format!("{}.zip", 那一家)).is_file();
    let 黑名单 = 卸掉名单(&包格);
    判::算装了(false, 在, 黑名单.iter().any(|名| 名 == 那一家))
}

/// off.json：数组与 { off: [...] } 两种写法都认（原件 packScan 读那一份那三行），读不出当一家都没卸
fn 卸掉名单(包格: &Path) -> Vec<String> {
    let Ok(文) = std::fs::read_to_string(包格.join(判::卸单名)) else {
        return Vec::new();
    };
    let Ok(单) = serde_json::from_str::<Value>(&文) else {
        return Vec::new();
    };
    let 列 = 单
        .as_array()
        .cloned()
        .or_else(|| 单.get(判::卸单键名).and_then(|v| v.as_array()).cloned())
        .unwrap_or_default();
    列.iter().filter_map(|值| 值.as_str().map(|名| 名.to_string())).collect()
}

/* ---------- 给 MusicBee 装监听插件那一颗要动的三处盘 ---------- */

/// 音乐遥控器包里那一份插件文件在哪（原件 packAssetOf + packRaw + landAsset 那一段）：
/// 读插件清单 assets.bridge 那一栏（相对包里那一格），活的这一格读不到就退原厂那一格 ——
/// 被「改代码」删了还能从底里取同一份（原件 landAsset 底下那三行兜底也是这么走的）。
/// 差在哪写着两处，见顶上第⑤条：不落 watcher\、zip 里那一份读不出来。
fn 包里那份() -> Option<String> {
    let 家们 = [
        PathBuf::from(crate::tauri_bind::comp_cmds::活的那一格()).join(那一家),
        PathBuf::from(crate::tauri_bind::comp_cmds::原厂那一格()).join(那一家),
    ];
    for 家 in 家们 {
        let Ok(文) = std::fs::read_to_string(家.join(包清单名)) else { continue; };
        let Some(相对) = 判::随行件名(&文, 判::桥件键名) else { continue; };
        /* 相对那一串按段贴上去（段里有没有 '..' 已经在纯判断那一格挡过了） */
        let 份 = 相对.split('/').fold(家, |累, 段| 累.join(段));
        if 份.is_file() {
            return Some(份.to_string_lossy().to_string());
        }
    }
    None
}

/// 一格一格数盘（原件 mbDriveRoots 1309~1316 行：A 到 Z 挨个问那一格的根在不在，在才算）。
/// 门牌是现拼的（字母 + 冒号 + 分隔符），这一份里不写任何一格的实名
const 冒号: char = ':';
fn 盘根们() -> Vec<String> {
    let 分隔 = std::path::MAIN_SEPARATOR;
    ('A'..='Z')
        .map(|字| format!("{}{}{}", 字, 冒号, 分隔))
        .filter(|根| Path::new(根).exists())
        .collect()
}

/// 那一颗文件的名字怎么变宽（注册表那颗 API 收的是 UTF-16 一串，写法照 info_cmds 里认深浅那一路）
fn 宽串(串: &str) -> Vec<u16> {
    串.encode_utf16().chain(std::iter::once(0)).collect()
}

/// 注册表 App Paths 那一格的默认值（原件 reg.exe query 'HKLM 底下那一格 App Paths' /ve 那一条 ——
/// 走系统接口现读，不喊外部 reg 程序）。读不出来 / 不是 REG_SZ / 那一串是空的，都算没这一条。
fn 注册表那条() -> Option<String> {
    let 子 = 宽串(判::认家注册格);
    let 名 = 宽串(""); /* 空的那一栏 = 这一格的默认值，正是 /ve 读的那一格 */
    let mut 缓 = [0u16; 1024];
    let mut 长 = (缓.len() * 2) as u32;
    unsafe {
        let 果 = RegGetValueW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(子.as_ptr()),
            PCWSTR(名.as_ptr()),
            RRF_RT_REG_SZ,
            None,
            Some(缓.as_mut_ptr() as *mut core::ffi::c_void),
            Some(&mut 长),
        );
        if 果 != ERROR_SUCCESS {
            return None;
        }
        /* 长回来的是字节数（连结尾那一个 0）；换成段数、去掉结尾那一个，再拼成串 */
        let 段 = ((长 as usize) / 2).saturating_sub(1).min(缓.len());
        let 出 = String::from_utf16(&缓[..段]).ok()?;
        if 出.is_empty() { None } else { Some(出) }
    }
}

/// 找 MusicBee 装在哪（原件 mbDir 1347~1366 行那三条路里走得通的两条：注册表 → 常见落点。
/// 「正在跑的那一家的路径」那一条要喊 powershell，壳里不起子进程 —— 顶上第③条写着差在哪）
fn 找音乐bee() -> Option<String> {
    /* ② 注册表：读回来那一串得是结尾那颗这一家的可执行文件，再取它上一格，且那一格真在盘上 */
    if let Some(串) = 注册表那条() {
        if 判::那是这一家吗(&串) {
            let 格 = Path::new(&串).parent().map(Path::to_path_buf).unwrap_or_default();
            if 格.is_dir() {
                return Some(格.to_string_lossy().to_string());
            }
        }
    }
    /* ③ 常见落点挨个问：认的是「这一格里有那颗可执行文件」，只认到目录不算（原件 1363 行）*/
    let 底串 = 用户数据底().to_string_lossy().to_string();
    for 候 in 判::桥候选(&盘根们(), &底串) {
        if Path::new(&候).join(判::认家件名).is_file() {
            return Some(候);
        }
    }
    None
}

/// 盘上那句错：原件 catch 到的是 err.message，这一头就是 io::Error 那一句（照 comp_cmds 同一手）
fn 盘上那句(e: &std::io::Error) -> String {
    e.to_string()
}

/* ---------- 两句兜底 ---------- */

/// 界面上那句给页看的话：脚本那头是英文原话，这一头照 volMsg 那一条规矩换成中文（原话另外留着）
fn 说错(前: &str, e: windows::core::Error) -> String {
    let 原话 = e.message();
    let 底 = 原话.trim();
    if 底.is_empty() {
        format!("{}", 前)
    } else {
        format!("{}（原话：{}）", 前, 判::音量原话留底(底))
    }
}

fn 现在毫秒() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|刻| 刻.as_millis() as u64).unwrap_or(0)
}
