/* 四层里的第三层 · 页面从哪儿来、窗口怎么开（外46 三）
   ------------------------------------------------------------
   Electron 那边是 protocol.handle('fdapp', serve) + loadFile 那一套。壳这边一样两件事：
     一、注册 fdapp 这个地址：把 fdapp://app/<相对> 换算回盘上哪一份，只认这一棵树以内；
     二、开那一扇窗：按「Flow_Desk_*.html」挑最近写过的那一张，把桥和门牌递进去。
   判断（样式、版本、取哪一张、地址怎么拆）全在第一层，这一格只动磁盘与开窗口。 */
use tauri::http::{Response, StatusCode};
use tauri::{AppHandle, UriSchemeContext, WebviewUrl, WebviewWindowBuilder};

use crate::fd_core::boot_path as 路;
use crate::fd_core::page_pick::{吃得住, 挑最新, 地址拆相对, 候选};

/// 三个格：树根、页面那一层、数据那一层（跟 fs_cmds 那颗同一口径，环境变量能盖）
pub(crate) fn 三个格() -> (String, String, String) {
    let 树 = crate::tree_root().to_string_lossy().to_string();
    /* 页面那一格：首装摊出来的是 <树根>\pages（和 Electron 那边 main.cjs 的 PAGES_ROOT 同一格）。
       原先默认落在树根，那一棵里根上没有 html，挑最新挑了个空 —— 报「找不到页面文件」。
       本地拿编译产物直接跑（页面和 exe 同格）那种形状还认，所以先看 pages 在不在。 */
    let 页 = std::env::var("FD_PAGES").unwrap_or_else(|_| {
        let 子 = 路::归一(&树, "pages");
        if std::fs::metadata(&子).map(|m| m.is_dir()).unwrap_or(false) { 子 } else { 树.clone() }
    });
    let 数 = std::env::var("FD_DATA").unwrap_or_else(|_| 路::归一(&树, "data"));
    (树, 页, 数)
}

/// 相对那一段落到盘上哪一份：data/ 开头只有一格，其余先页面层再数据层，跑出树外的不认
fn 找一份(树: &str, 页: &str, 数: &str, 相: &str) -> Option<String> {
    if 相.is_empty() || 路::用户数据直取(相) {
        return None;
    }
    let 试 = |候: String| -> Option<String> {
        if !路::在根内(树, &候) {
            return None;
        }
        match std::fs::symlink_metadata(&候) {
            Ok(息) if 息.is_file() => Some(候),
            _ => None,
        }
    };
    if 相.split('/').next().unwrap_or("").eq_ignore_ascii_case("data") {
        return 试(路::归一(树, 相));
    }
    let 列 = 路::候选(树, 页, 数, 相);
    for 候 in 列 {
        if let Some(中) = 试(候) {
            return Some(中);
        }
    }
    试(路::归一(页, 相)).or_else(|| 试(路::归一(树, 相)))
}

fn 回(状态: StatusCode, 类: &str, 体: Vec<u8>) -> Response<Vec<u8>> {
    Response::builder()
        .status(状态)
        .header("content-type", 类)
        .header("access-control-allow-origin", "*")
        .body(体)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

/// 读一份并回出去；带 Range 的那一类要答 206，不然页面里那根音频进度条拖不动
fn 发出去(件: &str, 头: Option<(u64, Option<u64>)>) -> Response<Vec<u8>> {
    let 全 = match std::fs::read(件) {
        Ok(b) => b,
        Err(_) => return 回(StatusCode::NOT_FOUND, "text/plain; charset=utf-8", "读不到这一份".into()),
    };
    let 总 = 全.len() as u64;
    let 类 = crate::fd_core::fs_policy::mime_of(件);
    match 头 {
        None => 回(StatusCode::OK, &类, 全),
        Some((起, 止)) => {
            if 起 >= 总 {
                return 回(StatusCode::RANGE_NOT_SATISFIABLE, "text/plain; charset=utf-8", Vec::new());
            }
            let 止 = 止.unwrap_or(总 - 1).min(总 - 1);
            /* 倒过来的区间（bytes=9-1 这一类）：切下去就是 begin <= end 不成立，
               而这一颗跑在 WebView2 回资源的回调里 —— panic 撤不回去，整个程序当场没。 */
            if 止 < 起 {
                return 回(StatusCode::RANGE_NOT_SATISFIABLE, "text/plain; charset=utf-8", Vec::new());
            }
            let 片 = 全[起 as usize..=止 as usize].to_vec();
            let 头串 = format!("bytes {}-{}/{}", 起, 止, 总);
            Response::builder()
                .status(StatusCode::PARTIAL_CONTENT)
                .header("content-type", 类)
                .header("content-range", 头串)
                .header("accept-ranges", "bytes")
                .header("access-control-allow-origin", "*")
                .body(片)
                .unwrap_or_else(|_| 回(StatusCode::OK, &类, 全))
        }
    }
}

/// 从请求头里读「我要第几字节到第几字节」；没有或看不懂就当整份给
fn 区间(请求: &tauri::http::Request<Vec<u8>>) -> Option<(u64, Option<u64>)> {
    let 串 = 请求.headers().get("range")?.to_str().ok()?.trim();
    let 尾 = 串.strip_prefix("bytes=")?;
    let (a, b) = 尾.split_once('-')?;
    let 起: u64 = a.trim().parse().ok()?;
    let 止 = if b.trim().is_empty() { None } else { Some(b.trim().parse::<u64>().ok()?) };
    Some((起, 止))
}

/// 注册 fdapp 这个地址（必须在建窗口之前喊）
pub fn 注册页面协议<'a, R: tauri::Runtime>(壳: tauri::Builder<R>) -> tauri::Builder<R> {
    壳.register_uri_scheme_protocol(
        "fdapp",
        |_ctx: UriSchemeContext<'_, R>, 请求: tauri::http::Request<Vec<u8>>| {
            /* 这一颗是 WebView2 回资源时的回调：里头的错撤不回去，一 panic 整个程序就没（不是报错、
               是闪退）。底下每一处判断吃的都是页面上递进来的地址，挡不完，所以在这儿兜一道：
               兜住只少一张图，不许再少一个程序（2026-10-14 整本导入闪退那一摊的教训）。 */
            let 出 = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let (树, 页, 数) = 三个格();
                let 相 = 地址拆相对(&请求.uri().to_string());
                match 找一份(&树, &页, &数, &相) {
                    Some(件) => 发出去(&件, 区间(&请求)),
                    None => 回(
                        StatusCode::NOT_FOUND,
                        "text/plain; charset=utf-8",
                        format!("这一棵树里没有这一份：{}", 相).into_bytes(),
                    ),
                }
            }));
            出.unwrap_or_else(|岔| {
                /* 兜住不等于当没发生：照运行日志那一手记一笔（那一颗绝不抛、绝不回错），
                   下一回再有这一类，屏上那本日志里看得见是哪一份、哪一句。 */
                let 一句 = 岔.downcast_ref::<String>().map(|s| s.as_str())
                    .or_else(|| 岔.downcast_ref::<&str>().copied())
                    .unwrap_or("说不出来的一句");
                crate::tauri_bind::log_cmds::记一笔("取资源",
                    format!("这一份取的时候壳里出了岔子：{} · 地址 {}", 一句, 请求.uri()));
                回(StatusCode::NOT_FOUND, "text/plain; charset=utf-8", "取这一份时壳里出了岔子".into())
            })
        },
    )
}

/// 页面那一层里对得上样式的每一张，连版本号与修改时间一起交给第一层挑
pub(crate) fn 列候选(页: &str, 样式: &str) -> Vec<候选> {
    let mut 出 = vec![];
    let 读 = match std::fs::read_dir(页) {
        Ok(r) => r,
        Err(_) => return 出,
    };
    for 项 in 读.flatten() {
        let 名 = 项.file_name().to_string_lossy().to_string();
        let 中 = match 吃得住(&名, 样式) {
            Some(m) => m,
            None => continue,
        };
        let 改过 = 项
            .path()
            .metadata()
            .and_then(|m| m.modified())
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0)
            })
            .unwrap_or(0);
        出.push(候选 { 名字: 名, 版本: 中, 改过 });
    }
    出
}

/// 把一串字包成 JS 那头的字符串字面量（Windows 路径里的反斜杠必须逃，不然 JS 读成转义）
fn 字面(串: &str) -> String {
    let mut 出 = String::from("\"");
    for c in 串.chars() {
        match c {
            '"' => 出.push_str("\\\""),
            '\\' => 出.push_str("\\\\"),
            '\n' => 出.push_str("\\n"),
            '\r' => {}
            _ => 出.push(c),
        }
    }
    出.push('"');
    出
}

/// 那一扇窗：挑页面、递门牌与桥、开起来。桥是编译期打进 exe 的那一份生成物，不读盘上的
pub fn 开页面窗口(壳: &AppHandle) -> Result<String, String> {
    let (树, 页, 数) = 三个格();
    let 样式 = "Flow_Desk_*.html";
    let 名 = 挑最新(&列候选(&页, 样式)).ok_or_else(|| format!("找不到页面文件：{}\\{}", 页, 样式))?;
    let 门牌 = format!(
        "window.__FD_BOOT__ = {{ root:{}, which:\"fd\", pages:{}, data:{} }};",
        字面(&树),
        字面(&页),
        字面(&数)
    );
    const 桥: &str = include_str!("../../ui/fd-bridge.js");
    /* 门牌上那一段主机名必须是 localhost：Windows 这层把自定义地址改写成 http://<协议名>.<主机>/，
       而 Tauri 判"这是不是本地内容"（is_local_url）只认 `http://fdapp.localhost/…` 这一种 ——
       写成 fdapp://app/… 就变成 http://fdapp.app/…，不算本地，于是权限层把 65 颗命令全挡掉
       （2026-10-12 无窗跑真页量到的：about_info 报 "not allowed by ACL"）。 */
    let 址 = format!("fdapp://localhost/{}", 名);
    let 窗 = WebviewWindowBuilder::new(壳, "main", WebviewUrl::External(址.parse().map_err(|e| format!("地址读不通：{}", e))?))
        .title("Flow-Desk")
        .inner_size(1280.0, 800.0)
        /* 最小那一面对 Electron 那一份（main.cjs 的 minWidth 720 / minHeight 480）：
           吸附那一档要按这对面往上走格，两头不许有两个说法 */
        .min_inner_size(720.0, 480.0)
        .initialization_script(门牌)
        .initialization_script(桥)
        /* 系统那一圈标题栏撤掉（他 2026-10-16 指着那两层「最小化 / 最大化 / 关闭」问的）：
           这一张页自己画顶栏（fd9-title.js：左上角一个菜单 + 右上角窗口三个），
           Electron 那一版走的就是 titleBarStyle:'hidden' —— 转 Tauri 时这一句漏了，
           于是系统那一圈与页面自己那一行叠成两层，页面顶不满的地方还露出一条底色。
           顶栏的拖动区因此归页面：pointerdown 上请一次 startDragging（桥里那颗 winDrag）。 */
        .decorations(false)
        .visible(false)
        .build()
        .map_err(|e| format!("窗口开不起来：{}", e))?;
    /* FD_SHELL_NOWIN=1 是给自证用的：窗口不露出来，页面照跑（配 WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
       那颗调试端口从另一头读现值）。这样在用户桌面上跑一趟也不抢他眼前的窗口。
       名子全用字母：环境变量这一头走 Windows 那道宽字符接口，中文名子在这台机器上不成。 */
    if std::env::var("FD_SHELL_NOWIN").unwrap_or_default() != "1" {
        窗.show().map_err(|e| format!("窗口露不出来：{}", e))?;
    }
    Ok(名)
}
