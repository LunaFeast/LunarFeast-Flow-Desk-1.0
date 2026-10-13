/* 四层里的第三层 · 看板节点上那两张图片：缩略那张与用系统看图打开那一张（外46 三 批二）
   ------------------------------------------------------------
   照主进程那两颗搬：img:peek(837) 与 img:open(862)。回给页面的形状一格都不动：
     · img:peek 成了回 { ok:true, url, w, h, big }，任何一步不成回 { ok:false, miss }（不是抛，也不是回 null）；
       那一句 miss 的措辞在 fd_core::img_bytes 里钉着，界面上读的就是那一句原话；
     · img:open 回 { ok, msg }：先自己确认那一份在不在，不在就别交给系统 —— Windows 会自己弹
       「找不到文件」那一颗系统模态框，会把这一路 await 死在这儿、整个页面跟着卡住（那一头这段注释写着呢）。
   url 那一格是 data 地址：后缀认出的 mime + 整份裸字节的 base64。
   裸字节这一步一步都不经过字符串 —— 文件读进来是 Vec<u8>、直接进 base64 那颗，
   拿 Electron 那一头的话说就是 buf.toString('base64')，不是把字节先化成文本再编。
   缩略那一手（比要的宽就现量一份）在壳里没接上：那是 nativeImage 的解码 + 重采样，这一头没有解码件。
   现在回的是原图包成的 data 地址，w / h 报的是真尺寸（从文件头认出来的），
   节点一多时比 Electron 那头多吃一点内存 —— 形状与那句"太大"的顶都没变。 */
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::fd_core::img_bytes as 图;

#[derive(Serialize)]
pub struct 一张缩略 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    w: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    h: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    big: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    miss: Option<String>,
}

#[derive(Serialize)]
pub struct 一个开图 {
    ok: bool,
    msg: String,
}

impl 一张缩略 {
    /* 成了那一支：url / w / h / big 四格一起给（照那一头 { ok:true, url, w:s.width, h:s.height, big:f }） */
    fn 成了(url: String, w: u32, h: u32, big: &str) -> 一张缩略 {
        一张缩略 {
            ok: true,
            url: Some(url),
            w: Some(w),
            h: Some(h),
            big: Some(big.to_string()),
            miss: None,
        }
    }
    fn 不成(那句: String) -> 一张缩略 {
        一张缩略 { ok: false, url: None, w: None, h: None, big: None, miss: Some(那句) }
    }
}

/* Windows 那头的路径要的是 UTF-16 带收尾零的那一串 */
fn 宽串(串: &str) -> Vec<u16> {
    串.encode_utf16().chain(std::iter::once(0)).collect()
}

/// img:peek —— 读字节、包成 data 地址、顺带从文件头认出宽长
#[tauri::command]
pub async fn img_peek(p: String, maxw: Option<f64>) -> 一张缩略 {
    /* 页面递进来的那一档宽先按同一把尺夹好（64~1200，不是数与零都算 360）。
       缩略那一手没接上，但这一栏不能吞：桥是按声明顺序对实参的，少了这一栏整颗就对不上号。 */
    let _一档 = 图::要那一档宽(maxw);
    let 那一处 = p.as_str();
    if !图::是本地绝对路径(那一处) {
        return 一张缩略::不成(format!("{}{}", 图::递路那句, 那一处));
    }
    let 路 = Path::new(那一处);
    let 息 = match fs::metadata(路) {
        Ok(v) => v,
        Err(_) => return 一张缩略::不成(图::读不到那句.to_string()),
    };
    if !息.is_file() {
        return 一张缩略::不成(图::不是文件那句.to_string());
    }
    if 息.len() > 图::太大的字节 {
        return 一张缩略::不成(图::太大那句.to_string());
    }
    /* 整份读进来是裸字节：这一步之后才谈得上编码，中间没有一次字符串换算 */
    let 节 = match fs::read(路) {
        Ok(v) => v,
        Err(e) => return 一张缩略::不成(format!("{}{}", 图::打不开那句, e)),
    };
    let mime = 图::图类型(那一处);
    let (宽, 高) = 图::认宽长(&节).unwrap_or((0, 0));
    /* nativeImage 认不动的那一类（svg 那种）照那一头：宽高报 0 0，原文交给页面自己画 */
    一张缩略::成了(图::包成data地址(mime, &节), 宽, 高, 那一处)
}

/// img:open —— 交给系统默认的看图程序（与 Electron 那颗 shell.openPath 同一手）
#[tauri::command]
pub async fn img_open(p: String) -> 一个开图 {
    let 那一处 = p.as_str();
    if !图::是本地绝对路径(那一处) {
        return 一个开图 { ok: false, msg: 图::开图那句.to_string() };
    }
    let 路 = Path::new(那一处);
    if !fs::metadata(路).map(|m| m.is_file()).unwrap_or(false) {
        return 一个开图 { ok: false, msg: format!("{}{}", 图::不在原处那句, 那一处) };
    }
    开进系统(那一处)
}

fn 开进系统(那一处: &str) -> 一个开图 {
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    let 牌 = windows::core::PCWSTR(宽串("open").as_ptr());
    let 址 = windows::core::PCWSTR(宽串(那一处).as_ptr());
    let 得 = unsafe {
        ShellExecuteW(
            None,
            牌,
            址,
            windows::core::PCWSTR::null(),
            windows::core::PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };
    /* ShellExecuteW 的规矩：回的值大于 32 才算接住了，小于等于 32 是那一句错码本身 */
    let 码 = 得.0 as isize;
    if 码 > 32 {
        return 一个开图 { ok: true, msg: String::new() };
    }
    /* 那一头拿的是 shell.openPath 回的那句系统原文，这一头只有那颗码：
       措辞是自己拼的（拿不到系统那句原文），形状还是 { ok:false, msg } 那一格 */
    一个开图 { ok: false, msg: format!("系统看图没接住这一份（那一档 {}）", 码) }
}
