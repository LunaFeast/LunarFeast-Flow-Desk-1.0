/* 第三层 · 窗口控制、关窗口的那句问话、托盘、重启自己
   ------------------------------------------------------------
   照主进程那几颗搬：winCtl(那份文件 2559 行) / winState(2534) / askToClose(2371) / doClose(2378) / buildTray
   / app:restart(1580)—— 重启这一颗归这一格，因为那一头走的正是 quitApp 那条收摊路。
   页面上请的串一个字不改（min / max / close / quit / reload / reloadForce / fullscreen /
   zoomIn / zoomOut / zoomReset / state），冒号那道换算在还没写的 JS 桥上做。

   三处 Rust 这头没有对等接口，是量过源码定的写法，不是凑的：
     · 缩放只能设不能读回（WebviewWindow 有 set_zoom 没有 get_zoom），所以当前倍数由壳自己记着，
       档位算法（一格 0.1、夹在 0.5 到 2 之间、两位小数收）在 fd_core::win_policy 里，带测试；
     · 重载只有一颗 reload()，主进程那"不用缓存"的第二档在 Rust 这头没有对应接口，两个动作都走 reload；
     · 窗口事件里没有 maximize / fullscreen 两种通知（只有 Resized / Moved / CloseRequested / Destroyed /
       Focused / ScaleFactorChanged / ThemeChanged 这些），所以窗口形状一变就回报 win:state ——
       网格吸附（批九）也挂在这两下里：Resized 吸形状、Moved 吸落点，先吸再报。
   托盘上那三行字，主进程那边是从「界面文字」那张表取的（trayText），那张表还没搬，
   这一版先给它表里的默认字，等那张表进壳了换成从表里取。 */
use std::sync::Mutex;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};

use crate::fd_core::grid_snap;
use crate::fd_core::win_policy::zoom_step;

/* 壳自己记着的三件事：当前缩放、关窗口那张框问出去没有、是不是已经在收摊 */
#[derive(Default)]
pub struct 窗口手 {
    缩放: Mutex<f64>,
    待回答: Mutex<bool>,
    退出中: Mutex<bool>,
}

/* 回报给页面的形状跟主进程那两颗一样：{ maximized, fullscreen } */
#[derive(serde::Serialize, Clone, Copy)]
pub struct 一个窗口状态 {
    pub maximized: bool,
    pub fullscreen: bool,
}

fn 锁<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    /* 别因为哪一处崩过就把整颗壳带倒：中毒的那把锁照样把值交出来 */
    m.lock().unwrap_or_else(|e| e.into_inner())
}

fn 主窗口(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.get_webview_window("main")
}

fn 现况(app: &AppHandle) -> 一个窗口状态 {
    match 主窗口(app) {
        Some(w) => 一个窗口状态 {
            maximized: w.is_maximized().unwrap_or(false),
            fullscreen: w.is_fullscreen().unwrap_or(false),
        },
        None => 一个窗口状态 { maximized: false, fullscreen: false },
    }
}

fn 报状态(app: &AppHandle) {
    let _ = app.emit("win:state", 现况(app));
}

/* 第二份程序被那颗单实例插件认出来之后，这一头要做的事。
   那句原话照 Electron 那一份（main.cjs 的 second-instance 那一句），一路也照它：
   先记一笔，再把已有的窗口露出来。
   FD_SHELL_NOWIN=1 那一趟只记不露 —— 自证用的那颗开关，任何窗口都不许到前台。 */
pub fn 第二份进来了(app: &AppHandle) {
    crate::tauri_bind::log_cmds::记一笔("启动", "又点了一次图标，把已有的窗口露出来");
    if std::env::var("FD_SHELL_NOWIN").unwrap_or_default() == "1" {
        return;
    }
    if let Some(窗) = app.get_webview_window("main") {
        let _ = 窗.unminimize();
        let _ = 窗.show();
        let _ = 窗.set_focus();
    }
}

/* 收摊：先立"已经在收了"这块牌，CloseRequested 那头就不再拦，然后整颗退出 */
fn 收摊(app: &AppHandle) {
    let 手 = app.state::<窗口手>();
    *锁(&手.待回答) = false;
    *锁(&手.退出中) = true;
    app.exit(0);
}

/* ---------- 页面上那三颗按钮与快捷键走这一颗 ---------- */
#[tauri::command]
pub fn win_ctl(app: AppHandle, act: String, 手: State<'_, 窗口手>) -> Result<一个窗口状态, String> {
    if act == "quit" {
        收摊(&app);
        return Ok(现况(&app));
    }
    let Some(w) = 主窗口(&app) else { return Ok(现况(&app)) };
    let 错 = |e: tauri::Error| e.to_string();
    match act.as_str() {
        "min" => { let _ = w.minimize(); }
        "max" => {
            if w.is_maximized().unwrap_or(false) { w.unmaximize().map_err(错)?; }
            else { w.maximize().map_err(错)?; }
        }
        /* 这一颗会先绕 CloseRequested，在那里拦下问页面 —— 跟主进程那边 w.close() 被那张框拦住同一形状 */
        "close" => { let _ = w.close(); }
        "reload" | "reloadForce" => { let _ = w.reload(); }
        "fullscreen" => {
            let 新 = !w.is_fullscreen().unwrap_or(false);
            w.set_fullscreen(新).map_err(错)?;
        }
        "zoomIn" | "zoomOut" | "zoomReset" => {
            let 新 = zoom_step(*锁(&手.缩放), &act);
            *锁(&手.缩放) = 新;
            w.set_zoom(新).map_err(错)?;
        }
        /* 这一档只回报不动手，跟主进程那边 "state" 直接 return winState() 同一形状 */
        "state" => {}
        _ => {}
    }
    报状态(&app);
    Ok(现况(&app))
}

/* ---------- 重启自己（主进程那一颗是 app:restart） ----------
   那边是 app.relaunch() 排在头里、250 毫秒之后立「已经在收摊」那块牌再关窗口退进程。
   壳这一头对等的一颗是 AppHandle::restart()（Tauri 自己那一条：起一颗新的、把这一颗收干净），
   250 毫秒那道延迟照搬；回话排在动手之前 —— 界面上那一句「已经排上重启」不等重启完。 */
#[derive(serde::Serialize)]
pub struct 一个回执 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

#[tauri::command]
pub fn app_restart(app: AppHandle) -> 一个回执 {
    let 另一颗 = app.clone();
    match std::thread::Builder::new().spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(250));
        let 手 = 另一颗.state::<窗口手>();
        *锁(&手.待回答) = false;
        *锁(&手.退出中) = true;
        drop(手);
        另一颗.restart();
    }) {
        Ok(_) => 一个回执 { ok: true, msg: None },
        /* 这一句的措辞照那一头：起新的一家起不来才报，不空手报「已经重启」 */
        Err(e) => 一个回执 { ok: false, msg: Some(format!("这台机器重启不了：{}", e)) },
    }
}

/* ---------- 关窗口那张框的回答（主进程那边是 ipcMain.on，不收返回值） ---------- */
#[tauri::command]
pub fn win_close_answer(app: AppHandle, action: String, 手: State<'_, 窗口手>) -> bool {
    if !*锁(&手.待回答) { return false; }
    *锁(&手.待回答) = false;
    match action.as_str() {
        "quit" => 收摊(&app),
        "tray" => { if let Some(w) = 主窗口(&app) { let _ = w.hide(); } }
        _ => {}
    }
    报状态(&app);
    true
}

/* ---------- 窗口的两道事件：关窗口的拦与形状变化的回报 ----------
   回调收到的是 Window 不是 WebviewWindow（壳那一头的 on_window_event 就要这种），
   要动窗口本体再用 get_webview_window 取那一张。 */
pub fn 窗口事件(w: &tauri::Window, e: &WindowEvent) {
    match e {
        WindowEvent::CloseRequested { api, .. } => {
            let app = w.app_handle();
            let 手 = app.state::<窗口手>();
            api.prevent_close();
            if *锁(&手.退出中) || *锁(&手.待回答) { return; }
            *锁(&手.待回答) = true;
            let _ = app.emit("fd:close-ask", ());
            /* 二十秒没回话就按「退出」收 —— 主进程那边踩过这一条：落到托盘又没收干净，
               结果窗口关了、进程还留在后台 */
            let 另一颗 = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(20));
                let 手 = 另一颗.state::<窗口手>();
                if *锁(&手.待回答) { 收摊(&另一颗); }
            });
        }
        WindowEvent::Resized(尺) => {
            吸形状(w, 尺);
            报状态(w.app_handle())
        }
        WindowEvent::Moved(位) => 吸落点(w, 位),
        _ => {}
    }
}

/* ---------- 网格吸附（外46 三 批九）----------
   他要的那一条：无边框也要 Windows 那种吸附拖拽。判断全在 `fd_core::grid_snap`，
   这一格只做三件事：问现值、把物理像素递进去、真去改窗口。

   三条口径先写在这儿（以后界面上来一句就改一句）：
     · **最大化与全屏不吸** —— 那两档本来就是铺满，吸了反倒把系统那一档顶掉；
     · **贴边优先于折格**，阈值 12 逻辑像素（换算成物理）；这是 Windows 自己那一种"够着边就粘住"；
     · **只在与目标差 1 物理像素以上时才真动** —— 吸附这件事天生会自己触发自己
       （改了尺寸就再来一趟 Resized），差得不够就当已经到位，既不抖也不绕圈。
   最小尺寸照 Electron 那边那一对（720×480 的逻辑值），吸完不许比它还小。 */

const 最小逻辑: (f64, f64) = (720.0, 480.0);
const 贴边逻辑: f64 = 12.0;
const 留住逻辑: f64 = 80.0;

fn 缩放(w: &tauri::Window) -> f64 {
    w.scale_factor().unwrap_or(1.0).max(0.25)
}

/// 这一扇窗所在那台显示器的工作区（任务栏那一截不算在内），换算成物理像素
fn 工作区(w: &tauri::Window) -> Option<grid_snap::矩形> {
    let 监 = w.current_monitor().ok()??;
    /* Monitor 上那几个字段是私有的，只能走方法（work_area() 回的是引用） */
    let 工 = 监.work_area();
    let 尺 = grid_snap::矩形 {
        左: 工.position.x as f64,
        顶: 工.position.y as f64,
        宽: 工.size.width as f64,
        高: 工.size.height as f64,
    };
    if 尺.宽 <= 0.0 || 尺.高 <= 0.0 {
        return None;
    }
    Some(尺)
}

fn 不该吸(w: &tauri::Window) -> bool {
    w.is_maximized().unwrap_or(false) || w.is_fullscreen().unwrap_or(false)
}

/// 拖边界改大小那一趟：把内层尺寸吸到整格
fn 吸形状(w: &tauri::Window, 尺: &tauri::PhysicalSize<u32>) {
    if 不该吸(w) {
        return;
    }
    let 倍 = 缩放(w);
    let 现 = (尺.width as f64, 尺.height as f64);
    /* 已经在整格上就直接收 —— 这一条也是"吸完别再触发第二趟"的第一道 */
    if grid_snap::在档上(现.0, 现.1) {
        return;
    }
    let 目标 = match grid_snap::吸尺寸(现.0, 现.1, 最小逻辑.0 * 倍, 最小逻辑.1 * 倍) {
        Some(标) => 标,
        None => return,
    };
    let (宽, 高) = (目标.0.round().max(1.0) as u32, 目标.1.round().max(1.0) as u32);
    if (宽 as f64 - 现.0).abs() < 1.0 && (高 as f64 - 现.1).abs() < 1.0 {
        return;
    }
    let _ = w.set_size(tauri::PhysicalSize::new(宽, 高));
}

/// 拖标题栏（无边框时是页面那一栏）挪位置那一趟：先贴边、再折格、最后夹住别推出屏
fn 吸落点(w: &tauri::Window, 位: &tauri::PhysicalPosition<i32>) {
    if 不该吸(w) {
        return;
    }
    let 区 = match 工作区(w) {
        Some(区) => 区,
        None => return,
    };
    let 倍 = 缩放(w);
    let 内 = w.inner_size().unwrap_or(tauri::PhysicalSize::new(1, 1));
    /* 步长就是当前这一格的两轴边长（页面 fitGrid 那一套），吸完窗口的边正好压在格线上 */
    let 步 = grid_snap::一格(内.width as f64, 内.height as f64);
    let (左, 顶) = grid_snap::吸位置(
        位.x as f64,
        位.y as f64,
        内.width as f64,
        内.height as f64,
        步,
        区,
        贴边逻辑 * 倍,
        留住逻辑 * 倍,
    );
    let (新左, 新顶) = (左 as i32, 顶 as i32);
    if (新左 - 位.x).abs() < 1 && (新顶 - 位.y).abs() < 1 {
        return;
    }
    let _ = w.set_position(tauri::PhysicalPosition::new(新左, 新顶));
}

/* ---------- 托盘：关窗口那张框上「收进托盘」那条要有地方去 ---------- */
fn 托盘图() -> Image<'static> {
    /* 优先用打进 exe 的那颗程序图标（tauri-build 塞进去的），拿不到再照主进程那边
       落一格 16x16 的纯色兜底，两头同一色值 */
    if let Ok(图) = Image::from_app_icon_resource(32) { return 图; }
    let 边 = 16usize;
    let 子 = vec![90u8, 130, 210, 255];
    let 面 = 子.repeat(边 * 边);
    Image::new_owned(面, 边 as u32, 边 as u32)
}

fn 闪一下(app: &AppHandle) {
    /* 主进程那边点托盘一下：没窗口就造一张，有就"看得见就缩、看不见就露" */
    match 主窗口(app) {
        Some(w) => {
            if w.is_visible().unwrap_or(true) { let _ = w.minimize(); }
            else { let _ = w.show(); let _ = w.set_focus(); }
        }
        None => {}
    }
}

pub fn 建托盘(app: &AppHandle) -> tauri::Result<()> {
    let 名 = app.package_info().name.clone();
    let 头 = MenuItem::with_id(app, "fd-名", 名.as_str(), false, None::<&str>)?;
    let 显示 = MenuItem::with_id(app, "fd-toggle", "显示 / 隐藏", true, None::<&str>)?;
    let 重载 = MenuItem::with_id(app, "fd-reload", "重新载入页面", true, None::<&str>)?;
    let 退出 = MenuItem::with_id(app, "fd-quit", "退出", true, None::<&str>)?;
    let 单 = Menu::with_items(app, &[
        &头, &显示,
        &PredefinedMenuItem::separator(app)?,
        &重载,
        &PredefinedMenuItem::separator(app)?,
        &退出,
    ])?;
    TrayIconBuilder::with_id("fd-tray")
        .icon(托盘图())
        .tooltip(名.as_str())
        .menu(&单)
        /* 主进程那边左键是"露/缩"，右键才开这张单 */
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id().as_ref() {
            "fd-toggle" => {
                if let Some(w) = 主窗口(app) {
                    if w.is_visible().unwrap_or(true) { let _ = w.hide(); }
                    else { let _ = w.show(); let _ = w.set_focus(); }
                    报状态(app);
                }
            }
            "fd-reload" => { if let Some(w) = 主窗口(app) { let _ = w.reload(); } }
            "fd-quit" => 收摊(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, e| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                闪一下(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
