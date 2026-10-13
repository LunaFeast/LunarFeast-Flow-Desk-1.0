
// 文件那一组：主进程里那十条通道一条条搬过来（外46 三 第一步）。
// 名字从 fs:read 这种写法换成 fs_read —— 通道名要当 Rust 函数名用，冒号留不住；
// 页面那一头拿到的还是原来那一套形状（换名在桥那一份里做，页面一个字不改）。
// 判断（类型、区间、上限、后缀）全在 core 那一层，这里只动磁盘。

use serde::Serialize;
use std::fs;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;

use crate::fd_core::fs_policy;

// 报错话照那一头的样子交给页面（Electron 那边抛出的是什么，这一头就回什么）
fn 说错(e: std::io::Error) -> String { e.to_string() }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct 一项状态 {
    exists: bool,
    is_directory: bool,
    size: u64,
    mtime: i64,
    // 比 Electron 那一头多这一格：读整份文件改成回原始字节之后，类型得有个地方报
    mime: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct 一个条目 {
    name: String,
    kind: String,
}

#[derive(Serialize)]
pub struct 一棵条目 {
    path: String,
    name: String,
    size: u64,
    mtime: i64,
}

fn 改到毫秒(d: std::time::SystemTime) -> i64 {
    match d.duration_since(std::time::UNIX_EPOCH) {
        Ok(v) => v.as_millis() as i64,
        Err(_) => 0,
    }
}

// fs:read —— 整份文件的字节。名字、类型、改到时间从 fs_stat 那一手拿（那边现在一并报）。
#[tauri::command]
pub fn fs_read(p: String) -> Result<tauri::ipc::Response, String> {
    let 节 = fs::read(&p).map_err(说错)?;
    Ok(tauri::ipc::Response::new(节))
}

// fs:readRange —— 只读一段（内嵌歌词在音频头部那截标签里，别为一行歌词搬整首歌）
#[tauri::command]
pub fn fs_read_range(p: String, start: f64, length: f64) -> Result<tauri::ipc::Response, String> {
    let mut 件 = fs::File::open(&p).map_err(说错)?;
    let 大 = 件.metadata().map_err(说错)?.len();
    let (起, 长) = fs_policy::clamp_range(大, start, length);
    let mut 节 = vec![0u8; 长];
    if 长 > 0 {
        件.seek(SeekFrom::Start(起)).map_err(说错)?;
        件.read_exact(&mut 节).map_err(说错)?;
    }
    Ok(tauri::ipc::Response::new(节))
}

// fs:stat —— 在不在、是不是目录、多大、改于哪一刻（顺带报类型）
#[tauri::command]
pub fn fs_stat(p: String) -> 一项状态 {
    match fs::metadata(&p) {
        Ok(st) => 一项状态 {
            exists: true,
            is_directory: st.is_dir(),
            size: st.len(),
            mtime: st.modified().map(改到毫秒).unwrap_or(0),
            mime: fs_policy::mime_of(&p),
        },
        Err(_) => 一项状态 { exists: false, is_directory: false, size: 0, mtime: 0, mime: fs_policy::mime_of(&p) },
    }
}

// fs:write —— 写一份（要的话先把父那一格长出来）
#[tauri::command]
pub fn fs_write(p: String, data: serde_json::Value, mkdir: Option<bool>) -> Result<bool, String> {
    let 节 = fs_policy::payload_bytes(&data);
    let 路 = Path::new(&p);
    if mkdir.unwrap_or(false) {
        if let Some(父) = 路.parent() { if !父.as_os_str().is_empty() { fs::create_dir_all(父).map_err(说错)?; } }
    }
    fs::File::create(路).and_then(|mut f| f.write_all(&节)).map(|_| true).map_err(说错)
}

// fs:append —— 只往末尾接一段（为写那一章的逐字记录用）：这条路只能加，不能盖
#[tauri::command]
pub fn fs_append(p: String, text: String) -> Result<bool, String> {
    let 路 = Path::new(&p);
    if let Some(父) = 路.parent() { if !父.as_os_str().is_empty() { fs::create_dir_all(父).map_err(说错)?; } }
    fs::OpenOptions::new().create(true).append(true).open(路)
        .and_then(|mut f| f.write_all(text.as_bytes())).map(|_| true).map_err(说错)
}

// fs:mkdir —— 长出一格（路上缺哪一段补哪一段）
#[tauri::command]
pub fn fs_mkdir(p: String) -> Result<bool, String> {
    fs::create_dir_all(&p).map(|_| true).map_err(说错)
}

// fs:unlink —— 删文件/删目录：目录那一手只在点了递归的时候才动；找不到就算删过了（那一头 force:true 同一手）
#[tauri::command]
pub fn fs_unlink(p: String, recursive: Option<bool>) -> Result<bool, String> {
    let 路 = Path::new(&p);
    let 第一次 = if recursive.unwrap_or(false) { fs::remove_dir_all(路) } else { fs::remove_file(路) };
    match 第一次 {
        Ok(()) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(true),
        Err(_) => fs::remove_file(路).map(|_| true).map_err(说错),
    }
}

// fs:list —— 列一层：读不到就当空的（那一头 catch 里回 []）
#[tauri::command]
pub fn fs_list(p: String) -> Vec<一个条目> {
    match fs::read_dir(&p) {
        Ok(目) => 目.flatten().filter_map(|x| x.file_name().to_str().map(|n| 一个条目 {
            name: n.to_string(),
            kind: if x.file_type().map(|t| t.is_dir()).unwrap_or(false) { "directory".into() } else { "file".into() },
        })).collect(),
        Err(_) => Vec::new(),
    }
}

// fs:tree —— 整棵树的 stat 一次报完：只收点名的后缀，深度与条数各一道顶，不读内容
#[tauri::command]
pub fn fs_tree(p: String, exts: Option<Vec<String>>) -> Vec<一棵条目> {
    let 名单: Option<Vec<String>> = match exts {
        Some(l) if !l.is_empty() => Some(l.iter().map(|x| x.to_lowercase()).collect()),
        _ => None,
    };
    let mut 出 = Vec::new();
    走一层(Path::new(&p), "", 0, 名单.as_deref(), &mut 出);
    出
}

fn 走一层(目录: &Path, 根: &str, 深: usize, 名单: Option<&[String]>, 出: &mut Vec<一棵条目>) {
    if 出.len() >= fs_policy::TREE_MAX_ENTRIES || 深 > fs_policy::TREE_MAX_DEPTH { return; }
    let 目 = match fs::read_dir(目录) { Ok(v) => v, Err(_) => return };
    for x in 目.flatten() {
        let 名 = match x.file_name().to_str() { Some(s) => s.to_string(), None => continue };
        let 相 = fs_policy::rel_of(根, &名);
        let 全 = 目录.join(&名);
        if x.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            走一层(&全, &相, 深 + 1, 名单, 出);
            continue;
        }
        if !fs_policy::tree_wants(&名.to_lowercase(), 名单) { continue; }
        if let Ok(st) = fs::metadata(&全) {
            出.push(一棵条目 { path: 相, name: 名, size: st.len(), mtime: st.modified().map(改到毫秒).unwrap_or(0) });
            if 出.len() >= fs_policy::TREE_MAX_ENTRIES { return; }
        }
    }
}

// fs:readText —— 按路径读一份文本（比完指纹只读变了的那几份）：读不到回空
#[tauri::command]
pub fn fs_read_text(p: String) -> Option<String> {
    fs::read_to_string(&p).ok()
}

// fs:resolve —— 页面上那串虚拟地址该落回盘上哪一格。原来是桥里直接拿 Node 的 path 与 fs 现算的
// （主程序那份 preload 里那颗 pagePath），这一头页面里没有 path 也没有 fs，所以判断挪进
// fd_core::boot_path、盘上到底有没有那一格由这里问。三道不许的措辞照那一头一字不动。
// 两层门牌落在哪两格：环境变量 FD_PAGES / FD_DATA 指到哪儿算哪儿，没指就照树里的老位置
// （页面层退到树本身，跟那一头 --fd-pages= 没递进来时同一个退法）。
#[tauri::command]
pub fn fs_resolve(p: String) -> Result<String, String> {
    use crate::fd_core::boot_path as 路;
    if 路::用户数据直取(&p) { return Err(format!("{}{}", 路::用户数据那句, p)); }
    let 树 = crate::tree_root().to_string_lossy().to_string();
    let 页 = std::env::var("FD_PAGES").unwrap_or_else(|_| 树.clone());
    let 数 = std::env::var("FD_DATA").unwrap_or_else(|_| 路::归一(&树, "data"));
    let 列 = 路::候选(&树, &页, &数, &p);
    let 在根 = |s: &String| 路::在根内(&树, s);
    let 是文件 = |s: &String| Path::new(s).is_file();
    let 上一层在 = |s: &String| Path::new(s).parent().map(|d| d.is_dir()).unwrap_or(false);
    let 挑 = |取: &dyn Fn(&String) -> bool| 列.iter().filter(|s| 在根(s)).find(|s| 取(s)).cloned();
    let 落 = 挑(&是文件)
        .or_else(|| 挑(&上一层在))
        .unwrap_or_else(|| 列.iter().filter(|s| 在根(s)).last().cloned().unwrap_or_default());
    if 落.is_empty() || !路::在根内(&树, &落) { return Err(format!("{}{}", 路::跑出数据目录, p)); }
    Ok(落)
}
