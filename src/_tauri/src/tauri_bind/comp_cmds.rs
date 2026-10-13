/* 四层里的第三层 · 「改组件代码」那一摊六颗：读 / 列 / 写 / 抹掉一整格 / 恢复出厂 / 有没有出厂原文
   ------------------------------------------------------------
   照 src\pack\main.cjs 那六颗 handler 搬（行号 2089 / 2092 / 2096 / 2098 / 2100 / 2102），
   页面上请的串一个字不改：comp:read → comp_read 那一手换算在桥里做。
   回给页面的形状一格都不动（每一格都是「有才有、没有就不出现」那种 skip_serializing_if，
   对着 comp-files.cjs 里 return 的那几支逐格抄）：
     · comp:read    → { ok:true, text, size, mtime, factory } /
                      { ok:false, msg } / { ok:false, msg, path }（这一格里没有那份文件时多带 path，
                      带的是页面递进来的那一串，不是算出来的落点）；
     · comp:list    → { ok:true, files } / { ok:false, msg }（这一格不在就回空的 files，仍是 ok:true）；
     · comp:write   → { ok:true, size } / { ok:false, msg }；
     · comp:delete  → { ok:true, removed } / { ok:false, msg }（本来就不在）/
                      { ok:false, msg, removed }（抹到一半抛了，抹着的那几颗照旧报出来）；
     · comp:restore → { ok:true, size } / { ok:false, msg }；
     · comp:factory → { ok:true, files, has } —— 那一头没套 try，这一头也不报错。
   那六颗 handler 里五颗（read / list / write / delete / restore）外面裹的都是「抛了就回 { ok:false, msg: 那句 }」，
   第六颗（factory）连 try 都没套 —— 所以这一层任何一步都不许抛给页面：能定成格子的就回格子，
   定不成的就照 core 那句原话回 msg。
   ------------------------------------------------------------
   「哪一家允许读 / 改 / 删哪几份」这把尺不在这一层：全在 fd_core::comp_rule（包名白名单、相对那一串拆段、
   落点必须在本家那一格里、出厂那一格里的对应位置、那十种可改后缀、那几句拒回来的原话）。
   这一层只做三件事：认那两格在哪、问盘上有没有、把 core 算出来的落点落到磁盘上。
   ------------------------------------------------------------
   两把格（口径与主进程同一处，main.cjs 49~53 那一段是钉它的地方）：
     · 活的那一格 = <树根>\data\plugins\<那一家>\ —— 运行时一家家 import 的就是这一格；
     · 原厂那一格 = <树根>\data\plugins-factory\<那一家>\ —— 导入那一下顺手真复制的一份底，
       「恢复出厂」从这一格拷回来、「有没有出厂原文」报的也是这一格。
   外43 起原厂底住在数据层（main.cjs 44~47 行写着为什么从自带的 resources\app\data\plugins\ 搬走：
   程序那一层每次更新都被整个换掉，用户的底放进去等于交给更新撤走）。
   main.cjs 2088 行顶上那句注释还写着「出厂原文取 resources\app\data\plugins\ 那一格」—— 那是外43 搬走之后
   没跟着改的旧话，代码认的是 ORIG_ROOT（= <树根>\data\plugins-factory），这一层照代码不照旧话。
   两把格都从 data_cmds::数据层格() 出（<树根>\data），与定期备份、库文件共用同一颗，不另起第二份口径。 */
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::fd_core::comp_rule::{
    写认这份, 出厂落点, 定落点, 恢复的那份, 读的那份, 清单排序, 上限字节, 原厂没这一家那句, 原厂那一家,
    可改, 列不出来那句, 删不掉那句, 读不到那句, 读太大那句, 读不出文本那句, 没说要写那句, 没这份那句,
    写太大那句, 写不进去那句, 拷不回来那句, 本来不在那句,
};

/* 报错那句话照那一头交给页面（Electron 那边 catch 到的是什么，这一头就回什么） */
fn 说错(e: std::io::Error) -> String { e.to_string() }

/* 活的那一格：<树根>\data\plugins（code:catRename 那一颗也认这一颗，两处一个口径） */
pub(crate) fn 活的那一格() -> String {
    crate::tauri_bind::data_cmds::数据层格().join("plugins").to_string_lossy().to_string()
}

/* 原厂那一格：<树根>\data\plugins-factory（main.cjs 的 ORIG_ROOT）。
   给 media_cmds 那颗 media:bridge 也认这一颗 —— 包里那一份插件文件读不到时，原件就是从这一格取同一份兜底的，
   两本共用一个口径，不在第二本里再抄一遍「plugins-factory」那一名 */
pub(crate) fn 原厂那一格() -> String {
    crate::tauri_bind::data_cmds::数据层格().join("plugins-factory").to_string_lossy().to_string()
}

/* 盘上到底有没有：两份「问系统」的手，对应原件里那两个 statSync 的 try/catch（问不到就当没有，不抛） */
fn 是不是格(p: &str) -> bool { fs::metadata(p).map(|m| m.is_dir()).unwrap_or(false) }
fn 是不是份(p: &str) -> bool { fs::metadata(p).map(|m| m.is_file()).unwrap_or(false) }

/* 把一格和一颗名字并成一条落点（对应 Node 的 path.join） */
fn 并路(格: &str, 名: &str) -> String {
    let mut s = String::from(格);
    while s.ends_with('\\') || s.ends_with('/') {
        s.pop();
    }
    format!("{}\\{}", s, 名)
}

fn 改到毫秒(d: std::time::SystemTime) -> i64 {
    match d.duration_since(std::time::UNIX_EPOCH) {
        Ok(v) => v.as_millis() as i64,
        Err(_) => 0,
    }
}

/* ---------- 回给页面那六格：字段名与顺序照 comp-files.cjs 的 return ---------- */

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
    factory: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
}

impl 一份原文 {
    fn 不成(那句: String) -> Self {
        一份原文 { ok: false, text: None, size: None, mtime: None, factory: None, msg: Some(那句), path: None }
    }
    /* 这一格里没有那份文件：原件在这一支多带一格 path（回的是页面递进来的那一串） */
    fn 没有(那句: String, 递的那串: String) -> Self {
        一份原文 { path: Some(递的那串), ..一份原文::不成(那句) }
    }
}

/// comp:write / comp:restore 那一格（成了报 size，不成报 msg）
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

/// comp:list 那一格
#[derive(Serialize)]
pub struct 一份清单 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
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

/// comp:factory 那一格（那一头永远 ok:true，两栏都在）
#[derive(Serialize)]
pub struct 一份原厂 {
    ok: bool,
    files: Vec<String>,
    has: bool,
}

/* ---------- comp:read —— 读本家那一格里的一份（「改代码」打开的就是这一颗） ---------- */

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
    /* 这一份有没有出厂原文（页面上「恢复出厂」那颗按钮摆不摆吃这一栏）：
       取的是原厂那一格里同名的那一份，格没在 / 段不干净 / 那份不在 都算没有 */
    let 原厂 = 原厂那一格();
    let 有底 = match 出厂落点(&原厂, &落.包名, &要读) {
        Some(p) => 是不是格(&原厂) && 是不是份(&p),
        None => false,
    };
    一份原文 {
        ok: true,
        text: Some(文),
        size: Some(相.len()),
        mtime: Some(改到毫秒(相.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH))),
        factory: Some(有底),
        msg: None,
        path: None,
    }
}

/* ---------- comp:list —— 这一格里有哪几份能改的文本文件（「改代码」顶上那个挑文件的下拉吃这个） ---------- */

/// 走树一层：图片、随行 exe / dll / 脚本、超过上限的、点开头的、链接都不摆（口径全在 core 的 可改 那一颗）。
/// 递归的是子格，段与段之间用斜杠拼（原件 list 回的就是这种相对写法，页面拿它再去请 comp:read）。
fn 走树(格: &str, 前: &str, 列: &mut Vec<String>, 深: u8) -> std::io::Result<()> {
    if 深 > 16 {
        return Ok(()); /* 原件没这一道：它靠 Dirent 不跟链接，天然不会成环；这一头钉一层顶，免得有人种一个自指的链接 */
    }
    let mut 名册: Vec<(String, std::fs::FileType)> = vec![];
    for 项 in fs::read_dir(格)? {
        let 项 = 项?;
        let 名 = 项.file_name().to_string_lossy().to_string();
        if 名.starts_with('.') {
            continue;
        }
        名册.push((名, 项.file_type()?));
    }
    /* 原件靠 readdirSync 的顺序（Windows 上就是按名字），这一头自己排一遍，免得每台机器枚举序不同 */
    名册.sort_by(|a, b| a.0.cmp(&b.0));
    for (名, 类型) in 名册 {
        /* 链接既不是格也不是份（Node 的 Dirent 对 reparse 就这两种都回 false），原件两种都不认，照旧 */
        let 是格 = 类型.is_dir() && !类型.is_symlink();
        let r = if 前.is_empty() { 名.clone() } else { format!("{}/{}", 前, 名) };
        if 是格 {
            走树(&并路(格, &名), &r, 列, 深 + 1)?;
            continue;
        }
        if !类型.is_file() || !可改(&名) {
            continue;
        }
        let 大 = match fs::metadata(并路(格, &名)) {
            Ok(m) => m.len(),
            Err(_) => continue, /* 原件那一句 statSync 抛了就 continue（这一颗正被别的程序删着），不算列不出来 */
        };
        if 大 > 上限字节 {
            continue;
        }
        列.push(r);
    }
    Ok(())
}

/// 这一格根本不在 → ok:true + 空的 files（原件就是这么回的，页面那侧自己会退回猜的那三份）
#[tauri::command]
pub fn comp_list(id: String) -> 一份清单 {
    let 落 = match 定落点(&活的那一格(), &id, None) {
        Ok(v) => v,
        Err(那句) => return 一份清单 { ok: false, files: None, msg: Some(那句) },
    };
    if !是不是格(&落.落) {
        return 一份清单 { ok: true, files: Some(vec![]), msg: None };
    }
    let mut 列: Vec<String> = vec![];
    if let Err(e) = 走树(&落.落, "", &mut 列, 0) {
        return 一份清单 { ok: false, files: None, msg: Some(format!("{}{}", 列不出来那句, 说错(e))) };
    }
    清单排序(&mut 列);
    一份清单 { ok: true, files: Some(列), msg: None }
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

/* ---------- comp:restore —— 从原厂那一格把这一份原样拷回来（真复制，不用链接） ---------- */

/// rel 没给或空串按 main.js 办（这一颗的口径与「读」那颗不同，照原件不 trim，见 core 的 恢复的那份）。
/// 原厂那一格里没有这一份 → 那一句带包名的原话；拷不动 → 「拷不回来：」+ 系统那句。
#[tauri::command]
pub fn comp_restore(id: String, rel: Option<String>) -> 一个回执 {
    let 要恢复 = 恢复的那份(rel.as_deref());
    let 落 = match 定落点(&活的那一格(), &id, Some(&要恢复)) {
        Ok(v) => v,
        Err(那句) => return 一个回执::不成(那句),
    };
    let 原厂 = 原厂那一格();
    /* 原件 factFile 头两道：那一格没定或不在 → 一份都取不到 */
    let 取 = match 出厂落点(&原厂, &落.包名, &要恢复) {
        Some(p) if 是不是格(&原厂) && 是不是份(&p) => p,
        _ => return 一个回执::不成(原厂没这一家那句(&落.包名)),
    };
    let 手 = (|| -> std::io::Result<u64> {
        /* 连父格一起长出来再拷（原件 copyFile 那两手）；报的是拷完那一份的大小，量不到就报 0 */
        if let Some(父) = Path::new(&落.落).parent() {
            if !父.as_os_str().is_empty() {
                fs::create_dir_all(父)?;
            }
        }
        fs::copy(&取, &落.落)?;
        Ok(fs::metadata(&落.落).map(|m| m.len()).unwrap_or(0))
    })();
    match 手 {
        Ok(大) => 一个回执::成了(大),
        Err(e) => 一个回执::不成(format!("{}{}", 拷不回来那句, 说错(e))),
    }
}

/* ---------- comp:factory —— 这一家有没有出厂原文、原厂那一格里有哪几份 ---------- */

/// 走原厂那一层：这一家有几份原版（信息页与「恢复出厂」的说明吃这两栏）。
/// 原件 factoryFiles 不挑后缀（原版里有几份就报几份，图片也报），也不排序，照 readdirSync 的序 ——
/// 这一头把名排一遍，免得同一棵树上每次问出来的序不一样。
fn 走原厂树(格: &str, 前: &str, 列: &mut Vec<String>, 深: u8) -> std::io::Result<()> {
    if 深 > 16 {
        return Ok(());
    }
    let mut 名册: Vec<(String, std::fs::FileType)> = vec![];
    for 项 in fs::read_dir(格)? {
        let 项 = 项?;
        let 名 = 项.file_name().to_string_lossy().to_string();
        if 名.starts_with('.') {
            continue;
        }
        名册.push((名, 项.file_type()?));
    }
    名册.sort_by(|a, b| a.0.cmp(&b.0));
    for (名, 类型) in 名册 {
        let 是格 = 类型.is_dir() && !类型.is_symlink();
        let r = if 前.is_empty() { 名.clone() } else { format!("{}/{}", 前, 名) };
        if 是格 {
            走原厂树(&并路(格, &名), &r, 列, 深 + 1)?;
        } else {
            /* 原件这一支是 else out.push(r)：不是格的一律算一份（链接那种也算，照旧） */
            列.push(r);
        }
    }
    Ok(())
}

/// 那一头没套 try，永远回 { ok:true, files, has }；这一头也一样：问不到就回空表 + false，不报错。
#[tauri::command]
pub fn comp_factory(id: String) -> 一份原厂 {
    let 原厂 = 原厂那一格();
    let 家 = 原厂那一家(&原厂, &id);
    let 有这一家 = 家.as_deref().map(是不是格).unwrap_or(false);
    let mut 列: Vec<String> = vec![];
    if let Some(格) = &家 {
        if 有这一家 {
            let _ = 走原厂树(格, "", &mut 列, 0);
        }
    }
    一份原厂 { ok: true, files: 列, has: 有这一家 }
}

/* 这一层只准用 core 那把尺：白名单、后缀表、上限那几个数与那几句拒话全在 fd_core::comp_rule，
   这一本里一个字都没重写（钉它的闸：src\tools\probes\gate-tauricomp46.mjs 第三节）。 */
