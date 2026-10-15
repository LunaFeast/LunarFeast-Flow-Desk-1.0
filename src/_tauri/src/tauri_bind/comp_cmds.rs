/* 四层里的第三层 · 插件那一格的文件：读 / 写 / 抹掉一整格
   ------------------------------------------------------------
   从前这一摊有六颗（读 / 列 / 写 / 抹掉一整格 / 恢复出厂 / 有没有出厂原文），照 src\pack\main.cjs
   那六颗 handler 搬（行号 2089 / 2092 / 2096 / 2098 / 2100 / 2102）。插件分离第 2 批 2.5 撤了
   页面上那颗「改代码」和那颗「恢复出厂」，列文件与那两颗跟着撤 —— 这三颗是推演定制写它做出来的
   组件要用的，留下。页面上请的串一个字不改：comp:read → comp_read 那一手换算在桥里做。
   回给页面的形状一格都不动（每一格都是「有才有、没有就不出现」那种 skip_serializing_if，
   对着 comp-files.cjs 里 return 的那几支逐格抄）：
     · comp:read    → { ok:true, text, size, mtime } /
                      { ok:false, msg } / { ok:false, msg, path }（这一格里没有那份文件时多带 path，
                      带的是页面递进来的那一串，不是算出来的落点）；
     · comp:write   → { ok:true, size } / { ok:false, msg }；
     · comp:delete  → { ok:true, removed } / { ok:false, msg }（本来就不在）/
                      { ok:false, msg, removed }（抹到一半抛了，抹着的那几颗照旧报出来）。
   原先这几颗外面裹的都是「抛了就回 { ok:false, msg: 那句 }」，所以这一层任何一步都不许抛给页面：
   能定成格子的就回格子，定不成的就照 core 那句原话回 msg。
   ------------------------------------------------------------
   「哪一家允许读 / 改 / 删哪几份」这把尺不在这一层：全在 fd_core::comp_rule（包名白名单、相对那一串拆段、
   落点必须在本家那一格里、那几句拒回来的原话）。
   这一层只做三件事：认那一格在哪、问盘上有没有、把 core 算出来的落点落到磁盘上。
   ------------------------------------------------------------
   一把格（口径与主进程同一处）：
     · 活的那一格 = <树根>\data\plugins\<那一家>\ —— 运行时一家家 import 的就是这一格。
   从前还有第二把「原厂那一格」（<树根>\data\plugins-factory\，导入那一下顺手复制的一份底），
   页面上那颗「恢复出厂」随插件分离第 2 批 2.5 撤了、那一格跟着 2.6 整格撤 ——
   没有用户装机要照顾，要换回早先那一份就把自己手里那一个包重装一次。
   这一把格从 data_cmds::数据层格() 出（<树根>\data），与定期备份、库文件共用同一颗，不另起第二份口径。 */
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::fd_core::comp_rule::{
    写认这份, 定落点, 读的那份, 上限字节, 删不掉那句, 读不到那句, 读太大那句, 读不出文本那句,
    没说要写那句, 没这份那句, 写太大那句, 写不进去那句, 本来不在那句,
};

/* 报错那句话照那一头交给页面（Electron 那边 catch 到的是什么，这一头就回什么） */
fn 说错(e: std::io::Error) -> String { e.to_string() }

/* 活的那一格：<树根>\data\plugins（code:catRename 那一颗也认这一颗，两处一个口径） */
pub(crate) fn 活的那一格() -> String {
    crate::tauri_bind::data_cmds::数据层格().join("plugins").to_string_lossy().to_string()
}

/* 盘上到底有没有：两份「问系统」的手，对应原件里那两个 statSync 的 try/catch（问不到就当没有，不抛） */
fn 是不是格(p: &str) -> bool { fs::metadata(p).map(|m| m.is_dir()).unwrap_or(false) }
fn 是不是份(p: &str) -> bool { fs::metadata(p).map(|m| m.is_file()).unwrap_or(false) }

fn 改到毫秒(d: std::time::SystemTime) -> i64 {
    match d.duration_since(std::time::UNIX_EPOCH) {
        Ok(v) => v.as_millis() as i64,
        Err(_) => 0,
    }
}

/* ---------- 回给页面那三格：字段名与顺序照 comp-files.cjs 的 return ---------- */

/// comp:read 的那一格
#[derive(Serialize)]
pub struct 一份原文 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mtime: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
}

impl 一份原文 {
    fn 不成(那句: String) -> Self {
        一份原文 { ok: false, text: None, size: None, mtime: None, msg: Some(那句), path: None }
    }
    /* 这一格里没有那份文件：原件在这一支多带一格 path（回的是页面递进来的那一串） */
    fn 没有(那句: String, 递的那串: String) -> Self {
        一份原文 { path: Some(递的那串), ..一份原文::不成(那句) }
    }
}

/// comp:write 那一格（成了报 size，不成报 msg）
#[derive(Serialize)]
pub struct 一个回执 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

impl 一个回执 {
    fn 成了(大: u64) -> Self { 一个回执 { ok: true, size: Some(大), msg: None } }
    fn 不成(那句: String) -> Self { 一个回执 { ok: false, size: None, msg: Some(那句) } }
}

/// comp:delete 那一格（抹到一半抛了也要把抹着的那几颗报出来，照原件第三支带 removed）
#[derive(Serialize)]
pub struct 一份删除 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    removed: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

/* ---------- comp:read —— 读本家那一格里的一份 ---------- */

/// rel 没给、空串、只剩空白都按入口那份 main.js 办（口径在 core 的 读的那份 那一颗）。
/// 越界那种递法在 定落点 那一颗就被拒掉，回的是同一句原话。
#[tauri::command]
pub fn comp_read(id: String, rel: Option<String>) -> 一份原文 {
    let 要读 = 读的那份(rel.as_deref());
    let 落 = match 定落点(&活的那一格(), &id, Some(&要读)) {
        Ok(v) => v,
        Err(那句) => return 一份原文::不成(那句),
    };
    /* 原件这一手是两趟 statSync：isFile()（catch 回 false）+ 再 statSync 取大小，两种错回的不是同一句 */
    if !是不是份(&落.落) {
        return 一份原文::没有(没这份那句.to_string(), 要读);
    }
    let 相 = match fs::metadata(&落.落) {
        Ok(v) => v,
        Err(e) => return 一份原文::不成(format!("{}{}", 读不到那句, 说错(e))),
    };
    if 相.len() > 上限字节 {
        return 一份原文::不成(读太大那句(相.len()));
    }
    let 文 = match fs::read_to_string(&落.落) {
        Ok(v) => v,
        Err(e) => return 一份原文::不成(format!("{}{}", 读不出文本那句, 说错(e))),
    };
    一份原文 {
        ok: true,
        text: Some(文),
        size: Some(相.len()),
        mtime: Some(改到毫秒(相.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH))),
        msg: None,
        path: None,
    }
}

/* ---------- comp:write —— 写本家那一格里的一份：存了就是新的 ---------- */

/// rel 空 / 只剩空白 → 那一句（原件 write 第一行）；越界的递法在 定落点 那一颗就被拒。
/// text 由桥那边 String(...) 过一遍，到这层一定是字串。
#[tauri::command]
pub fn comp_write(id: String, rel: String, text: String) -> 一个回执 {
    if !写认这份(&rel) {
        return 一个回执::不成(没说要写那句.to_string());
    }
    let 落 = match 定落点(&活的那一格(), &id, Some(&rel)) {
        Ok(v) => v,
        Err(那句) => return 一个回执::不成(那句),
    };
    let 节 = text.as_bytes();
    if (节.len() as u64) > 上限字节 {
        return 一个回执::不成(写太大那句(节.len() as u64));
    }
    let 手 = (|| -> std::io::Result<()> {
        if let Some(父) = Path::new(&落.落).parent() {
            if !父.as_os_str().is_empty() {
                fs::create_dir_all(父)?;
            }
        }
        fs::write(&落.落, 节).map(|_| ())
    })();
    match 手 {
        /* size 报的是写下去的字节数（原件报的是 buf.length，UTF-8 同一个数） */
        Ok(_) => 一个回执::成了(节.len() as u64),
        Err(e) => 一个回执::不成(format!("{}{}", 写不进去那句, 说错(e))),
    }
}

/* ---------- comp:delete —— 抹掉一整格：只按包名动手，不接子路径（「完全删除」那一步用的就是它） ---------- */

#[tauri::command]
pub fn comp_delete(id: String) -> 一份删除 {
    let 落 = match 定落点(&活的那一格(), &id, None) {
        Ok(v) => v,
        Err(那句) => return 一份删除 { ok: false, removed: None, msg: Some(那句) },
    };
    let mut 抹了: Vec<String> = vec![];
    let 手 = (|| -> std::io::Result<()> {
        if 是不是格(&落.落) {
            fs::remove_dir_all(&落.落)?;
            抹了.push(format!("{}/", 落.包名));
        }
        let 压缩包 = format!("{}.zip", 落.落);
        if 是不是份(&压缩包) {
            fs::remove_file(&压缩包)?;
            抹了.push(format!("{}.zip", 落.包名));
        }
        Ok(())
    })();
    if let Err(e) = 手 {
        return 一份删除 { ok: false, removed: Some(抹了), msg: Some(format!("{}{}", 删不掉那句, 说错(e))) };
    }
    if 抹了.is_empty() {
        return 一份删除 { ok: false, removed: None, msg: Some(本来不在那句.to_string()) };
    }
    一份删除 { ok: true, removed: Some(抹了), msg: None }
}

/* 这一层只准用 core 那把尺：白名单、上限那几个数与那几句拒话全在 fd_core::comp_rule，
   这一本里一个字都没重写（钉它的闸：src\tools\probes\gate-tauricomp46.mjs 第三节）。 */
