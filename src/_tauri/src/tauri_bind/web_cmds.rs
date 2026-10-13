/* 四层里的第三层 · 粘网址抓标题那一张（外46 三 批二 · 搬 main.cjs 632 那颗）
   ------------------------------------------------------------
   页面里 fetch 别的域名会被同源策略拦掉，只能壳这一头去取 —— 这一点跟 Electron 那边同一理由。
   取回来只读 <title>，四秒不回来就算了；任何一步不成都回空串（那一头整颗包在 try 里，catch 回 ''），
   认方案与洗标题那两手在 fd_core::web_page，这一格只动网络。
   走的是 Windows 自带的 wininet.dll：这一棵 crate 里没有 TLS 件（reqwest 那一张图上没带 rustls / native-tls），
   另下一套等于往仓里多添一串依赖；SChannel 本来就是系统自己的那一套，跟这一批「系统的事走系统接口」同一口径。
   一处照不动：那一头编码按 utf-8 试，读不通再退回 gbk（老中文站还是这个编码），最后才按 utf-8 硬读一遍。
   这一头没有 GBK 那张表，退回的是「utf-8 硬读一遍（非法字节换成替换字符）」——
   老中文站的标题在这一头会带回一串替换字符，界面上那句标题就不准了。形状没变（照样是一串字，取不到就空串）。 */
use std::time::Instant;

use crate::fd_core::web_page as 页;

use windows::core::PCWSTR;
use windows::Win32::Networking::WinInet::{
    HttpQueryInfoW, InternetCloseHandle, InternetOpenUrlW, InternetOpenW, InternetReadFile,
    InternetSetOptionW, HTTP_QUERY_FLAG_NUMBER, HTTP_QUERY_STATUS_CODE, INTERNET_FLAG_NO_CACHE_WRITE,
    INTERNET_FLAG_RELOAD, INTERNET_OPEN_TYPE_PRECONFIG, INTERNET_OPTION_CONNECT_TIMEOUT,
    INTERNET_OPTION_RECEIVE_TIMEOUT,
};

/* 那一头递出去的 User-Agent 一字不动（有的站认这一串才给正文） */
const 门面: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
/* 四秒不回来就算了（那一头是 AbortSignal.timeout(4000)）：
   wininet 那两道超时各按四毫秒级设，另外自己盯一趟总时长，免得一份大页一段一段各等四秒 */
const 四秒: u32 = 4000;

fn 宽串(串: &str) -> Vec<u16> {
    串.encode_utf16().chain(std::iter::once(0)).collect()
}

/// web:title —— 取一整页、洗出那一句标题；认不出的方案、取不回、没标题都回空串
#[tauri::command]
pub async fn web_title(url: String) -> String {
    let 址 = url.trim().to_string();
    if !页::肯取的地址(&址) {
        return String::new();
    }
    match 取原文(&址) {
        /* 那一头是 TextDecoder('utf-8',{fatal:true}) 失败退 gbk 再退非致命 utf-8；
           这一头没有 GBK 那张表，退成「按 utf-8 硬读，非法字节换成替换字符」 */
        Some(节) => {
            let 文 = match String::from_utf8(节) {
                Ok(文) => 文,
                Err(错) => String::from_utf8_lossy(&错.into_bytes()).to_string(),
            };
            页::取标题(&文)
        }
        None => String::new(),
    }
}

/* 取回整页原文：任何一步不成（连不上、不是 2xx、四秒到、读不动）都回 None */
fn 取原文(址: &str) -> Option<Vec<u8>> {
    let 头 = 宽串(门面);
    let 串 = 宽串(址);
    unsafe {
        let 会话 = InternetOpenW(
            PCWSTR(头.as_ptr()),
            INTERNET_OPEN_TYPE_PRECONFIG.0,
            PCWSTR::null(),
            PCWSTR::null(),
            0,
        );
        if 会话.is_null() {
            return None;
        }
        /* 连不上与读不动各给四秒（这两档是会话级，后面每次请求都跟着） */
        for 档 in [INTERNET_OPTION_CONNECT_TIMEOUT, INTERNET_OPTION_RECEIVE_TIMEOUT] {
            let _ = InternetSetOptionW(Some(会话 as *const _), 档, Some(&四秒 as *const _ as *const _), 4);
        }
        /* 每次都要新的那份、别拿缓存（那一头 net.fetch 默认也是绕开缓存的） */
        let 牌 = INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
        let 请求 = InternetOpenUrlW(会话 as *const _, PCWSTR(串.as_ptr()), None, 牌, None);
        if 请求.is_null() {
            let _ = InternetCloseHandle(会话 as *const _);
            return None;
        }
        /* 状态码不是 2xx 就算了（那一头是 if(!r.ok) return ''） */
        let mut 码 = 0u32;
        let mut 长 = 4u32;
        let 认了 = HttpQueryInfoW(
            请求 as *const _,
            HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER,
            Some(&mut 码 as *mut _ as *mut _),
            &mut 长,
            None,
        )
        .is_ok();
        if !认了 || !(200..300).contains(&码) {
            let _ = InternetCloseHandle(请求 as *const _);
            let _ = InternetCloseHandle(会话 as *const _);
            return None;
        }
        let 起 = Instant::now();
        let mut 出: Vec<u8> = Vec::new();
        let 成 = loop {
            if 起.elapsed().as_millis() >= 四秒 as u128 {
                break false;
            }
            let mut 片 = [0u8; 65536];
            let mut 读 = 0u32;
            if InternetReadFile(请求 as *const _, 片.as_mut_ptr() as *mut _, 片.len() as u32, &mut 读).is_err() {
                break false;
            }
            if 读 == 0 {
                break true; /* 读完了 */
            }
            出.extend_from_slice(&片[..读 as usize]);
        };
        let _ = InternetCloseHandle(请求 as *const _);
        let _ = InternetCloseHandle(会话 as *const _);
        if 成 {
            Some(出)
        } else {
            None
        }
    }
}
