/* 第三层 · 系统音量那三颗动手的那一手（外46 三 批四 · 搬 main.cjs 1160 / 1167 / 1182 三颗）
   ------------------------------------------------------------
   收什么、回什么都是照 main.cjs 那三颗 handler 量的，单位与值域照转手 call 的那份监听脚本 vol-watcher.ps1：
     vol:get  → { supported, msg, state: { vol, muted } | null }，state 里 vol 是 0~100 的整数（不是 0~1！）
     vol:set  → 成 { ok:true, vol } / 挡 { ok:false, msg }；页面一路拖只记最新一个，90ms 合并写一次
     vol:mute → 成 { ok:true } / 挡 { ok:false, msg }；mode 三档：0 取消静音、1 静音、2 切换
                （原件认的是严格相等：数 0 / 字 'off' → 0，数 1 / 字 'on' → 1，其余一律 2）
   往所有窗口广播的那一趟照 volTell：事件名 vol:state，payload { supported, msg, state }。

   走的是哪套 Windows 接口（这一批的口径：系统的事走系统接口，不再 shell 出去起常驻 PowerShell + 现编 C#）：
     Core Audio 的 Endpoint Volume —— windows 那层的 Win32::Media::Audio 与 ...::Audio::Endpoints：
       CoCreateInstance(MMDeviceEnumerator) → IMMDeviceEnumerator::GetDefaultAudioEndpoint(eRender, eConsole)
       → IMMDevice::Activate::<IAudioEndpointVolume>() →
         GetMasterVolumeLevelScalar / SetMasterVolumeLevelScalar（系统那头的 scalar 是 0.0~1.0，
         页面那一档 0~100 由纯判断那一格换算，两处换算式都照脚本 Pct()/Set()）
         GetMute / SetMute
     三颗每一颗都放到自己的一条线程上办（跨进程取音量慢，而且 COM 那一头要先给这条线程定线程模型），
     三秒没回来就报一句，主线程一个字都不等 —— 写法照 info_cmds 里认色卡那一路（后台线程 + 超时）。
   每一颗都不再需要「常驻的那位子进程」：一次往返几毫秒，而且换默认输出设备这一档脚本那份要重起才跟得上，
   这一头每次现拿端点，天然跟得上。

   一处明写着没搬齐的（不是藏着）：脚本那一份还给 IAudioEndpointVolume 挂了 RegisterControlChangeNotify 的
   COM 回调，硬件音量键、托盘音量合成器、别家程序改音量都会当场推一行上来。这一头没挂那颗回调
   —— 跨 apartment 的裸 COM 回调对象没法在这台机器上真跑一趟验过（这一批不许起程序自测），不敢装成验过了。
   所以「别家程序动了音量」要等下一次读取才补上；main.cjs 顶上那句老实账的另一半
   —— 「SetMute 不发回调，谁下命令谁当场回声一条最新状态」—— 这一头照做（写下去立刻回读一次再播一行）。 */
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use windows::Win32::Media::Audio::{EDataFlow, ERole, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED,
};

use crate::fd_core::media_rule as 判;
use crate::tauri_bind::media_cmds::一个成不成;

/// 滑杆合并写的那一档（原件 1173~1178 行那颗 setTimeout(…, 90)）
const 合并毫秒: u64 = 90;
/// 一趟 COM 往返给三秒兜底（那一头是子进程卡住靠 bye 兜，这一头没有子进程可杀，到点就报同一档意思的一句）
const 三秒: Duration = Duration::from_secs(3);

/* ---------- 这一层自己的那本账 ---------- */

#[derive(Default)]
pub struct 音量手 {
    账: Mutex<一份音量账>,
}

#[derive(Default)]
struct 一份音量账 {
    /// 上一次读回来的那两栏（0~100 的整数 + 静音那位）—— 原件 vol.last
    最新: Option<(u32, bool)>,
    /// 给页面的那一句 —— 原件 vol.msg（界面话），原话另留 —— 原件 vol.raw
    话: String,
    /// 读不动 / 写不动 记这一笔 —— 原件 vol.dead
    坏掉: bool,
    /// 滑杆还没写下去的那一个值 —— 原件 vol.pend
    待定: Option<u32>,
    /// 90ms 那颗合并已经排下去了没有 —— 原件 vol.timer 在不在
    合并中: bool,
}

/* 「哪一处崩过都不该把这本账锁死」：每一处 lock 都走 unwrap_or_else(|e| e.into_inner())，
   照 info_cmds 里看账那一颗的写法，只是这一层三个调用点都从 AppHandle 现取，就不再单开一颗。 */

/* ---------- 回给页面的那几格（形状照 main.cjs，一格都不许多） ---------- */

/// vol:get 回的那一格，也是往每张窗口送的那一格（volTell 同一形状）
#[derive(Serialize, Clone)]
pub struct 一份音量状态 {
    supported: bool,
    msg: String,
    state: Option<一份读数>,
}

#[derive(Serialize, Clone, Copy)]
struct 一份读数 {
    vol: u32,
    muted: bool,
}

/// vol:set 那一格：成是 ok + vol，挡是 ok + msg（两栏都是「有才有」，照原件）
#[derive(Serialize)]
pub struct 一个音量回执 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    vol: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

/* ---------- vol:get ---------- */

/// 一次性读取（不轮询）：卡挂上来时问一次，往后的更新走广播那一趟
#[tauri::command]
pub async fn vol_get(app: AppHandle) -> 一份音量状态 {
    /* 原件 1161~1164 行：闸拦着就回 supported:false + 那句原话 + state:null */
    if let Some(句) = 判::音量闸(crate::tauri_bind::media_cmds::装了音乐遥控器()) {
        return 一份音量状态 { supported: false, msg: 句.to_string(), state: None };
    }
    match 办一次(音量令::读).await {
        Ok(得) => {
            {
                let 手 = app.state::<音量手>();
                let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                守.最新 = Some(得);
                守.坏掉 = false;
                守.话 = String::new();
            }
            /* 读回来这一行也照脚本那样播出去（页面那头 volOn 吃的就是这一行） */
            播一行(&app, true, String::new(), Some(得));
            一份音量状态 { supported: true, msg: String::new(), state: Some(一份读数 { vol: 得.0, muted: 得.1 }) }
        }
        Err(话) => {
            {
                let 手 = app.state::<音量手>();
                let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                守.坏掉 = true;
                守.话 = 话.clone();
            }
            /* 读不动照原件：supported 跟着坏掉那位走，state 留着上一份 */
            let 手 = app.state::<音量手>();
            let 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
            一份音量状态 {
                supported: false,
                msg: 话,
                state: 守.最新.map(|(v, m)| 一份读数 { vol: v, muted: m }),
            }
        }
    }
}

/* ---------- vol:set ---------- */

/// 滑杆拖：只记最新值，90ms 合并写一次；真正的显示值以回读那一次为准
#[tauri::command]
pub async fn vol_set(app: AppHandle, v: serde_json::Value) -> 一个音量回执 {
    if let Some(句) = 判::音量闸(crate::tauri_bind::media_cmds::装了音乐遥控器()) {
        return 一个音量回执 { ok: false, vol: None, msg: Some(句.to_string()) };
    }
    let 要 = 判::音量取值(v.as_f64());
    /* 原件 1171~1172 行的先后：先起子进程（这一头没得起的进程，等价于「这一路坏没坏」那一句），
       坏了就回 ok:false，没坏才记待定 */
    let 排下去 = {
        let 手 = app.state::<音量手>();
        let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
        if 守.坏掉 {
            None
        } else {
            守.待定 = Some(要);
            if 守.合并中 {
                Some(false) /* 那颗合并还排着，只把要写的值换成最新这一个 */
            } else {
                守.合并中 = true;
                Some(true)
            }
        }
    };
    let 排下去 = match 排下去 {
        None => {
            let 手 = app.state::<音量手>();
            let 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
            return 一个音量回执 {
                ok: false,
                vol: None,
                msg: Some(挡那句(&守)),
            };
        }
        Some(v) => v,
    };
    if 排下去 {
        /* 起那颗合并：90ms 之后取当时那一个最新值写下去。
           一条线程管一趟，绝不一像素生一趟手 —— 滑杆一路拖 60 下也只生一趟。 */
        let 壳 = app.clone();
        let _ = std::thread::Builder::new().name("fd-音量合并".into()).spawn(move || {
            std::thread::sleep(Duration::from_millis(合并毫秒));
            let 要写 = {
                let 手 = 壳.state::<音量手>();
                let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                守.合并中 = false;
                守.待定.take()
            };
            let Some(档) = 要写 else { return };
            match 办一趟(音量令::设(档)) {
                Ok(得) => {
                    {
                        let 手 = 壳.state::<音量手>();
                        let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                        守.最新 = Some(得);
                        守.话 = String::new();
                    }
                    播一行(&壳, true, String::new(), Some(得));
                }
                Err(话) => {
                    {
                        let 手 = 壳.state::<音量手>();
                        let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                        守.坏掉 = true;
                        守.话 = 话.clone();
                    }
                    /* 原件 1177 行送不动那一句是 volTell()：把当前这份账原样再播一遍 */
                    let 手 = 壳.state::<音量手>();
                    let 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                    播一行(&壳, !守.坏掉, 守.话.clone(), 守.最新);
                }
            }
        });
    }
    一个音量回执 { ok: true, vol: Some(要), msg: None }
}

/* ---------- vol:mute ---------- */

/// 静音那三档：0 取消 / 1 静音 / 2 切换（默认切换）
#[tauri::command]
pub async fn vol_mute(app: AppHandle, mode: serde_json::Value) -> 一个成不成 {
    if let Some(句) = 判::音量闸(crate::tauri_bind::media_cmds::装了音乐遥控器()) {
        return 一个成不成 { ok: false, msg: 句.to_string() };
    }
    let 档 = 判::静音档(&原样(&mode));
    /* 原件 1187~1188 行：这一路坏了、或者那一句送不出去，回的都是同一档两句 */
    let 坏掉 = {
        let 手 = app.state::<音量手>();
        let 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
        守.坏掉
    };
    if 坏掉 {
        let 手 = app.state::<音量手>();
        let 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
        return 一个成不成 { ok: false, msg: 挡那句(&守) };
    }
    match 办一次(音量令::静(档)).await {
        Ok(得) => {
            {
                let 手 = app.state::<音量手>();
                let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                守.最新 = Some(得);
                守.话 = String::new();
            }
            /* SetMute 不发回调（微软的接口就这样）：谁下命令谁当场回声一条最新状态 */
            播一行(&app, true, String::new(), Some(得));
            一个成不成 { ok: true, msg: String::new() }
        }
        Err(话) => {
            {
                let 手 = app.state::<音量手>();
                let mut 守 = 手.账.lock().unwrap_or_else(|e| e.into_inner());
                守.坏掉 = true;
                守.话 = 话.clone();
            }
            一个成不成 { ok: false, msg: 话 }
        }
    }
}

/* ---------- 动 Core Audio 的那一手 ---------- */

/// 这一趟要办的事（结果都是「读回来的那两栏」—— 脚本那边 Set/Mute 之后也都现读一回）
#[derive(Debug)]
enum 音量令 {
    读,
    设(u32),
    静(u8),
}

/// 页面递来的那一栏换成纯判断认的形状（原件那句严格相等：没递、不是数、不是字都得算清楚）
fn 原样(递: &serde_json::Value) -> 判::递来的 {
    if 递.is_null() {
        判::递来的::没给
    } else if let Some(n) = 递.as_f64() {
        判::递来的::是个数(n)
    } else if let Some(s) = 递.as_str() {
        判::递来的::是个字(s.to_string())
    } else {
        判::递来的::是别的
    }
}

/// 挡回来那句：有界面话就用界面话，没有就用那句「音量监听没起来」（原件 vol.msg || '音量监听没起来'）
fn 挡那句(账: &一份音量账) -> String {
    if 账.话.is_empty() {
        判::音量监听没起来那句.to_string()
    } else {
        账.话.clone()
    }
}

/// 把一趟 COM 往返放到一条自己的线程上，三秒没回来就报一句（异步命令那一头才等得起）
async fn 办一次(令: 音量令) -> Result<(u32, bool), String> {
    let (发, mut 收) = tokio::sync::mpsc::channel::<Result<(u32, bool), String>>(1);
    if let Err(e) = std::thread::Builder::new().name("fd-音量".into()).spawn(move || {
        let _ = 发.blocking_send(办一趟(令));
    }) {
        return Err(format!("{}：{}", 判::音量监听没起来那句, e));
    }
    match tokio::time::timeout(三秒, 收.recv()).await {
        Ok(Some(得)) => 得,
        /* 那条线程散了却没交货：不是读到了 0，是这一路真的没办成 */
        Ok(None) => Err(判::音量话("").to_string()),
        Err(_) => Err("音量这一趟三秒没回来".to_string()),
    }
}

/// 真去办这一趟（在这条线程上：先给这条线程定 COM 线程模型，办完收）
fn 办一趟(令: 音量令) -> Result<(u32, bool), String> {
    let 起了 = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
    let 得 = 办它(&令);
    if 起了.is_ok() {
        unsafe { CoUninitialize() };
    }
    得
}

fn 办它(令: &音量令) -> Result<(u32, bool), String> {
    let 量 = 拿端点音量()?;
    unsafe {
        match 令 {
            音量令::读 => 读一回(&量),
            音量令::设(档) => {
                /* scalar 那一头是 0.0~1.0；大于 0 顺带撤静音（脚本 Set()：if (v > 0) SetMute(false)）。
                   那颗 eventContext 是「哪一次改动是我下的」那枚凭据，脚本递的是 Guid.Empty，这一头递空指针同一意思 */
                量.SetMasterVolumeLevelScalar(判::音量比例(*档), core::ptr::null())
                    .map_err(|e| 说错("音量写不下去", e))?;
                if 判::设音量要撤静音吗(*档) {
                    量.SetMute(false, core::ptr::null()).map_err(|e| 说错("静音撤不掉", e))?;
                }
                读一回(&量)
            }
            音量令::静(档) => {
                let 现 = 读一回(&量)?;
                let 要 = 判::静音开不开(*档, 现.1);
                量.SetMute(要, core::ptr::null()).map_err(|e| 说错("静音没改成", e))?;
                读一回(&量)
            }
        }
    }
}

/// 拿默认那枚输出端点的音量接口：每一趟现拿，换默认输出设备当场就跟得上
fn 拿端点音量() -> Result<IAudioEndpointVolume, String> {
    unsafe {
        let 询: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_INPROC_SERVER)
            .map_err(|e| 说错("系统音量那位认不到（MMDeviceEnumerator）", e))?;
        /* eRender = 0、eConsole = 0：windows 那层没给这两个枚举起名，值照 mmdeviceapi 的口径给
           （脚本里递的也是同一对 0：`GetDefaultAudioEndpoint(0 /*eRender*/, 0 /*eConsole*/)`） */
        let 出 = 询
            .GetDefaultAudioEndpoint(EDataFlow(0), ERole(0))
            .map_err(|e| 说错("没有默认的输出设备", e))?;
        出.Activate::<IAudioEndpointVolume>(CLSCTX_INPROC_SERVER, None)
            .map_err(|e| 说错("音量接口挂不上（IAudioEndpointVolume）", e))
    }
}

unsafe fn 读一回(量: &IAudioEndpointVolume) -> Result<(u32, bool), String> {
    let 值 = 量.GetMasterVolumeLevelScalar().map_err(|e| 说错("音量读不到", e))?;
    let 静 = 量.GetMute().map_err(|e| 说错("静音那位读不到", e))?;
    /* 回的是 0~100 那一档（脚本 Pct() 同一手），页面那头直接就能摆 */
    Ok((判::音量百分比(值), 静.as_bool()))
}

/// 界面那句照 volMsg 那五条换：系统/接口的原话不当界面话使（原话另外进日志那条走 音量原话留底）
fn 说错(前: &str, e: windows::core::Error) -> String {
    let 原话 = e.message();
    let 底 = 原话.trim();
    if 底.is_empty() {
        format!("{}（{}）", 前, 判::音量话(""))
    } else {
        format!("{}：{}（原话：{}）", 前, 判::音量话(&原话), 判::音量原话留底(底))
    }
}

/* ---------- 广播那一趟（照 volTell：每一张窗口都送同一格） ---------- */

fn 播一行(壳: &AppHandle, 活着: bool, 话: String, 读数: Option<(u32, bool)>) {
    let _ = 壳.emit(
        "vol:state",
        一份音量状态 {
            supported: 活着,
            msg: 话,
            state: 读数.map(|(vol, muted)| 一份读数 { vol, muted }),
        },
    );
}
