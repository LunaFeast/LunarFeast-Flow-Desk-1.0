/* 四层里的第三层 · 配置那四颗：关窗口那一档与输入法那一格（外46 三 批一）
   ------------------------------------------------------------
   照主进程那四颗搬：cfg:closeGet(559) / cfg:closeSet(560) / cfg:rimeGet(619) / cfg:rimeSet(620)。
   两份明文都落在用户数据那一格里（那一头 CLOSE_FILE 2342、RIME_FILE 2357），记事本可看可删，
   删掉就是恢复默认。回给页面的形状一格都不动：
     · cfg:closeGet 回那一档字（ask / tray / quit），读不到就当 ask —— 那一头是 catch 回 'ask'；
     · cfg:closeSet 先认档再写，写不写得进去都回那一档（那一头 try{}catch(e){} 之后照样 return mode），
       页面上点完那颗钮看的就是这一句回话，所以绝不能回页面递进来的原串；
     · cfg:rimeGet 回指过的那串路径，没指过就去看小企鹅的默认位置（用户 roaming 那一格下的 Rime），
       那一格真是目录才报，都不是就回空串让页面自己走手动选；
     · cfg:rimeSet 写下去（吞掉错）并回 true —— 那一头就是 true，页面上只看这一句。
   认哪三档、字段不是字串算不算指过，判断全在 fd_core::cfg_value，这里只叫它、只动手。 */
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::fd_core::cfg_value::{里路从文, 关法从文, 认关法, 关法档名, 里路档名, 默认那格};

/* 那两份明文各自那一栏：键名与两格缩进照 JSON.stringify({ 那一栏 }, null, 2)，
   这样外部编辑器里对比，改的只有值那一个字，不会被看成整份被人重写过 */
#[derive(Serialize)]
struct 一档关法 {
    mode: &'static str,
}

#[derive(Serialize)]
struct 一处指认 {
    path: String,
}

/* 用户数据那一格：与 data 那一摊、挑文件那一摊同一把尺（环境变量 FD_USERDATA 指到哪儿算哪儿） */
fn 档落点(名: &str) -> PathBuf {
    crate::tauri_bind::pick_cmds::数据格().join(名)
}

/* 长出一格再写下去；写不进去不回报 —— 这两颗的口径是「记不住就算了，别把界面上那一步卡住」 */
fn 写明文(路: &Path, 文: &str) {
    if let Some(父) = 路.parent() {
        if !父.as_os_str().is_empty() {
            let _ = fs::create_dir_all(父);
        }
    }
    let _ = fs::write(路, 文);
}

/// cfg:closeGet —— 关窗口那一步走哪一档（读不懂、没那一份都算「问问我」）
#[tauri::command]
pub fn cfg_close_get() -> String {
    let 文 = fs::read_to_string(档落点(关法档名)).unwrap_or_default();
    关法从文(&文).to_string()
}

/// cfg:closeSet —— 记一档：先归到认得的那三档，再写下去，回的是归过以后那一档
#[tauri::command]
pub fn cfg_close_set(mode: String) -> String {
    let 档 = 认关法(&mode);
    if let Ok(文) = serde_json::to_string_pretty(&一档关法 { mode: 档 }) {
        写明文(&档落点(关法档名), &文);
    }
    档.to_string()
}

/// cfg:rimeGet —— 指过的那串路径原样端出来；没指过才看一眼默认那一格在不在
#[tauri::command]
pub fn cfg_rime_get() -> String {
    /* 记过就照记的报，哪怕那一个目录后来被挪走了 —— 那一头是「那一栏是字串就 return」，不查盘。
       读那份明文是动磁盘、认那一栏是判断（在 fd_core），两步分开写，不在一行里搅浑。 */
    if let Ok(文) = fs::read_to_string(档落点(里路档名)) {
        if let Some(记的) = 里路从文(&文) {
            return 记的;
        }
    }
    /* 没记过才去看小企鹅的默认位置：用户 roaming 那一格下的 Rime，那一格真是目录才报 */
    let 那格 = std::env::var("APPDATA")
        .ok()
        .filter(|x| !x.trim().is_empty())
        .map(|根| Path::new(&根).join(默认那格));
    if let Some(在) = 那格 {
        if fs::metadata(&在).map(|m| m.is_dir()).unwrap_or(false) {
            return 在.to_string_lossy().to_string();
        }
    }
    String::new()
}

/// cfg:rimeSet —— 记一格：传空串就是「别再自动读」，写不进去也照样回 true
#[tauri::command]
pub fn cfg_rime_set(p: Option<String>) -> bool {
    let 指 = p.unwrap_or_default(); /* 那一头是 String(p || '')：没给、给空都算清空这个指向 */
    if let Ok(文) = serde_json::to_string_pretty(&一处指认 { path: 指 }) {
        写明文(&档落点(里路档名), &文);
    }
    true
}
