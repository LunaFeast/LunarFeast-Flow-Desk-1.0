/* 四层里的第三层 · 数据层那一摊：读写、清单、那张待清的字条、三份库文件（外46 三 批一）
   ------------------------------------------------------------
   照主进程那七颗搬：data:dir(573) / data:read(574) / data:write(577) / data:list(583) / data:wipe(2075)
   与 lib:read(1651) / lib:write(1656)。页面上请的串一个字不改，冒号与驼峰那道换算在桥里做。
   回给页面的形状一格都不动：
     · data:read 读不到就回 null（那一头 catch 里 return null），data:write 写不下去就地抛（那一头不 catch），
       data:list 列不出来就回空的一串，data:dir 回的是用户数据那一格的绝对地址；
     · lib:read 认不出的名字回 { ok:false, text:"", file:"", msg }，认得出就回 { ok:true, text, file }
       —— 那一份在盘上不在都算读得到，不在就回空原文（那一头 readLibRaw 就是 catch 回 ''）；
     · lib:write 回 { ok:true } 或 { ok:false, msg }，写完把新原文朝各窗口喊一句 lib:changed。
   两把格要分清楚，别并成一把：
     · 用户数据那一格 = data:read / data:write / data:list 的根（那一头 DATA_DIR() 就是 app.getPath('userData')，
       认法与挑文件那一组共用同一颗 pick_cmds::数据格，环境变量 FD_USERDATA 指到哪儿算哪儿）；
     · 数据层那一格 = <树根>\data，是 data:wipe 那张字条与三份库文件的落点（那一头 DATA_ROOT，40 行），
       它不吃 FD_DATA —— 那个环境变量只挪页面那一层的门牌，挪不动主进程写库文件的地方。
   路径归不归这一格管，判断全在 fd_core::data_path 那一颗（落格），这里只叫它，不自己判。 */
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter};

use crate::fd_core::data_path::{库名在册, 落格, 不认那句, 字条名, 跑出那句, 留着那几格};

/* 报错那句话照那一头交给页面（Electron 那边抛出的是什么，这一头就回什么） */
fn 说错(e: std::io::Error) -> String { e.to_string() }

/* 用户数据那一格（data:read / write / list 的根）：与挑文件那一组同一把尺，不另起第二份口径 */
fn 用户数据格() -> String { crate::tauri_bind::pick_cmds::数据格().to_string_lossy().to_string() }

/* 数据层那一格（<树根>\data）：那张待清的字条、三份库文件，还有定期备份默认要抄的那一处都落在这儿
   （备份那一颗在 backup_cmds.rs，两处必须同一把尺，所以这一颗朝它借，不再另抄一遍） */
pub(crate) fn 数据层格() -> PathBuf { crate::tree_root().join("data") }

/* ---------- 用户数据那一格的三颗：在哪、读、写、列 ---------- */

/// data:dir —— 用户数据那一格在哪一格（页面拿它拼绝对地址去读自己那几份明文）
#[tauri::command]
pub fn data_dir() -> String { 用户数据格() }

/// data:read —— 读一份原文；爬出这一格的、读不到的，一律回 null（那一头 catch 里就是 null）
#[tauri::command]
pub fn data_read(rel: String) -> Option<String> {
    let 落 = 落格(&用户数据格(), &rel)?;
    fs::read_to_string(落).ok()
}

/// data:write —— 写一份原文：先把父那一格长出来再写。跑出这一格就地抛那句，写不下去抛盘上那句。
/// 那一头是 String(text)（没给就写成字面量 undefined），这一头按空串落 —— 页面上六个调用点递的都是字串。
#[tauri::command]
pub fn data_write(rel: String, text: Option<String>) -> Result<bool, String> {
    let 落 = 落格(&用户数据格(), &rel).ok_or_else(|| format!("{}{}", 跑出那句, rel))?;
    let 路 = Path::new(&落);
    if let Some(父) = 路.parent() {
        if !父.as_os_str().is_empty() { fs::create_dir_all(父).map_err(说错)?; }
    }
    fs::write(路, text.unwrap_or_default()).map(|_| true).map_err(说错)
}

/// data:list —— 只列这一格里头一层、只要文件、按名字排（那一头 readdir + filter(isFile) + sort）
#[tauri::command]
pub fn data_list() -> Vec<String> {
    let mut 列: Vec<String> = match fs::read_dir(用户数据格()) {
        Ok(目) => 目.flatten()
            .filter(|x| x.file_type().map(|t| t.is_file()).unwrap_or(false))
            .filter_map(|x| x.file_name().to_str().map(|n| n.to_string()))
            .collect(),
        Err(_) => return Vec::new(),
    };
    列.sort();
    列
}

/* ---------- data:wipe：这一趟只排一张字条，一颗都不删 ----------
   那一头（2075 行）删的东西一样都没有：浏览器存储那一格此刻被内核占着，当场删一半比不删更糟，
   所以这一颗只往 <树根>\data\wipe-user.json 写一句「按什么时候排的、哪几格留着」，
   真删排在开机那一趟（主进程文件顶上 userWipe 那一段，还没搬进来）。已经排着就不重写，只把时间戳留着。 */

#[derive(Serialize)]
pub struct 一张字条 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    queued: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    already: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

/* 字条里那两栏：键的顺序照那一头（先 requestedAt 再 keep），缩进照 serde 的两格 —— 与 JSON.stringify(x, null, 2) 同形状 */
#[derive(Serialize)]
struct 那张单子 {
    #[serde(rename = "requestedAt")]
    排于: String,
    keep: Vec<&'static str>,
}

/// 那张字条上的「排下的那一刻」：那一头是 new Date().toLocaleString()（本机墙上时间，月和日不带零），
/// 这一头拿同一个墙上时间拼同一个形状；std 里没有时区件，用的是图里已经编好的那颗 chrono。
fn 那一刻() -> String {
    use chrono::{Datelike, Timelike};
    let 当 = chrono::Local::now().naive_local();
    format!("{}/{}/{} {}:{}:{}", 当.year(), 当.month(), 当.day(), 当.hour(), 当.minute(), 当.second())
}

#[tauri::command]
pub fn data_wipe() -> 一张字条 {
    let 格 = 数据层格();
    let 路 = 格.join(字条名);
    let 单子 = 那张单子 { 排于: 那一刻(), keep: 留着那几格.to_vec() };
    let 文 = match serde_json::to_string_pretty(&单子) {
        Ok(v) => v,
        Err(e) => return 一张字条 { ok: false, queued: None, already: None, file: None, msg: Some(format!("那张待清的字条写不下去：{}", e)) },
    };
    /* 一整段照那一头那一个 try：长格子、看有没有、写下去，任何一步出错都回同一句「写不下去」 */
    if let Err(e) = fs::create_dir_all(&格) {
        return 一张字条 { ok: false, queued: None, already: None, file: None, msg: Some(format!("那张待清的字条写不下去：{}", 说错(e))) };
    }
    if 路.exists() {
        return 一张字条 { ok: true, queued: Some(true), already: Some(true), file: Some(路.to_string_lossy().to_string()), msg: None };
    }
    match fs::write(&路, format!("{}\n", 文)) {
        Ok(_) => 一张字条 { ok: true, queued: Some(true), already: Some(false), file: Some(路.to_string_lossy().to_string()), msg: None },
        Err(e) => 一张字条 { ok: false, queued: None, already: None, file: None, msg: Some(format!("那张待清的字条写不下去：{}", 说错(e))) },
    }
}

/* ---------- 库文件那两颗：色卡（成套与攒的）、外观方案、待实现清单、图片库清单 ----------
   认哪一份由页面说，主进程只搬原文 —— 名单就是唯一的闸（在册那一颗在 fd_core::data_path，与开发服务器同一张表）。 */

#[derive(Serialize)]
pub struct 一份库 {
    ok: bool,
    text: String,
    file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

#[derive(Serialize)]
pub struct 一个回执 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

/* 磁盘上那份被外部编辑器改过、别的窗口存过，都要喊各窗口当场重认（那一头 broadcastLib，1645 行） */
#[derive(Clone, Serialize)]
struct 一份改动 {
    name: String,
    text: String,
}

/// lib:read —— 认得出就回原文与落点（那一份不在盘上也回 ok:true，原文是空串），认不出就回那一句
#[tauri::command]
pub fn lib_read(name: String) -> 一份库 {
    if !库名在册(&name) {
        return 一份库 { ok: false, text: String::new(), file: String::new(), msg: Some(format!("{}{}", 不认那句, name)) };
    }
    let 路 = 数据层格().join(&name);
    一份库 {
        ok: true,
        /* 那一头 readLibRaw 是 try/catch 回空串：读不到、是目录、都不是错，页面自己判空 */
        text: fs::read_to_string(&路).unwrap_or_default(),
        file: 路.to_string_lossy().to_string(),
        msg: None,
    }
}

/// lib:write —— 写下去再把新原文喊给各窗口；任何一步出错都只回 { ok:false, msg }，不抛
#[tauri::command]
pub fn lib_write(app: AppHandle, name: String, text: Option<String>) -> 一个回执 {
    if !库名在册(&name) {
        return 一个回执 { ok: false, msg: Some(format!("{}{}", 不认那句, name)) };
    }
    let 文 = text.unwrap_or_default();
    let 格 = 数据层格();
    if let Err(e) = fs::create_dir_all(&格) {
        return 一个回执 { ok: false, msg: Some(说错(e)) };
    }
    let 路 = 格.join(&name);
    if let Err(e) = fs::write(&路, 文.as_bytes()) {
        return 一个回执 { ok: false, msg: Some(说错(e)) };
    }
    let _ = app.emit("lib:changed", 一份改动 { name, text: 文 });
    一个回执 { ok: true, msg: None }
}
