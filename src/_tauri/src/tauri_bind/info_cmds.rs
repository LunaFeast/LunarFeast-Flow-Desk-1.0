/* 第三层 · 图标、字体、关于、系统深浅、取色这一组动手的那一手（外46 三 第四组）
   ------------------------------------------------------------
   照 src\pack\main.cjs 里那五颗 ipcMain.handle 搬，收什么、回什么形状都是那两份原文量下来的：
     icons:list   → 一张「名字: 地址」的表，没有参数
     font:list    → { fonts: […], faces: { 名字: [{w, 名}] } }，收 force 一栏
     about:info   → { ok, pages, data, versions: { fd }, backups: […], packs: [{id, name, version}] }
     ming:system  → { dark }
     ocr:swatch   → { ok, lang, ow, oh, lines: [{t, x, y, w, h}] }，不成就 { ok:false, msg }，收一个路径
   app:restart 不在这一格 —— 那一颗跟着窗口与收摊走，落在 win_cmds。
   回给页面的字段名一个都没改；判断（名字怎么换算、表怎么合、缩到多大、框怎么并、话怎么说）全在 fd_core 那一格。

   哪一颗是正经接口（他定的那条：Electron 能在主进程 hack 的细节，这一头不许同类 hack）：
     · 字体清单与字重 —— DirectWrite：DWriteCreateFactory → IDWriteFactory::GetSystemFontCollection，
       一家一族；族底下逐张真脸看 IDWriteFont::GetSimulations（系统现合成的假粗假斜扔掉）、
       GetStretch（非 Normal 的窄体扔掉）、GetWeight（档数是系统自己给的数），
       名字取 IDWriteLocalizedStrings 上 en-us 与 zh-cn 那两档。
       主进程那边是开一趟 powershell 现起一个 WPF 数 SystemTypefaces（这台机器量过：2 秒、611 行），
       而 WPF 那张表本来就是从 DirectWrite 这份字体缓存上读的 —— 这一头没有 shell 出去的理由。
     · 系统深浅 —— 注册表：RegGetValueW 读
       HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme，
       也就是 Electron 里 nativeTheme 背后 Chromium 读的同一格；怎么算深色在 fd_core::ming_mode。
     · 取色 —— WinRT 的 Windows.Media.Ocr（OcrEngine::RecognizeAsync）配 Windows.Graphics.Imaging 的
       BitmapDecoder + BitmapTransform：图读进内存、缩与换像素格式由 WinRT 一趟办完，
       不落临时 png、不开子进程、不现编 C#（那是 ocr-swatch.ps1 那一段的正路版本）。
     · 图标与关于 —— 只认这一棵树以内的目录与清单文件；地址走壳自己那套 fdapp 门牌（见 page_cmds 注册的那一颗）。
   这一组里一颗都没有 shell 出去。 */
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{Emitter, State};
use windows::core::{BOOL, HSTRING, Interface, PCWSTR};
use windows::Graphics::Imaging::{
    BitmapAlphaMode, BitmapDecoder, BitmapInterpolationMode, BitmapPixelFormat, BitmapTransform, ColorManagementMode,
    ExifOrientationMode,
};
use windows::Media::Ocr::OcrEngine;
use windows::Storage::{FileAccessMode, StorageFile};
use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::Graphics::DirectWrite::{
    DWriteCreateFactory, IDWriteFactory, IDWriteFontCollection, IDWriteFontList, IDWriteLocalizedStrings,
    DWRITE_FACTORY_TYPE_SHARED, DWRITE_FONT_STRETCH_NORMAL,
};
use windows::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD};
use windows::Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED};

use crate::fd_core::about_info as 账上;
use crate::fd_core::font_table as 字体;
use crate::fd_core::icon_scan as 图标;
use crate::fd_core::ming_mode as 深浅;
use crate::fd_core::ocr_boxes as 取色;
use crate::fd_core::page_pick::挑最新;
use crate::tauri_bind::page_cmds::{三个格, 列候选};
use crate::tauri_bind::pick_cmds::数据格;

/* ---------- 共用的三颗小尺 ---------- */

fn 现在() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn 改到(件: &Path) -> u64 {
    /* 盘上问不到就当 0 —— 那边 iconUrl 的 try/catch 也是这个退法，地址尾巴上那颗 at 不能缺 */
    件.metadata().ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn 宽串(串: &str) -> Vec<u16> {
    串.encode_utf16().chain(std::iter::once(0)).collect()
}

fn 说错(e: windows::core::Error) -> String {
    e.to_string()
}

/* ================= 图标：icons:list ================= */

/* 扫一次的账：半秒之内沿用上一趟（主进程那个 iconCache 同一手） */
#[derive(Default)]
pub struct 图标手 {
    账: Mutex<Option<(BTreeMap<String, String>, u64)>>,
}

fn 看账<'a>(手: &'a State<'_, 图标手>) -> std::sync::MutexGuard<'a, Option<(BTreeMap<String, String>, u64)>> {
    /* 哪一处崩过都不该把这张表锁死：中毒的账照样交出来 */
    手.账.lock().unwrap_or_else(|e| e.into_inner())
}

#[tauri::command]
pub fn icons_list(手: State<'_, 图标手>) -> BTreeMap<String, String> {
    let (树, 页, 数) = 三个格();
    let 此刻 = 现在();
    {
        let 守 = 看账(&手);
        if let Some((旧表, 上回)) = 守.as_ref() {
            if !图标::该重扫(此刻, Some(*上回)) {
                return 旧表.clone();
            }
        }
    }
    let 表 = 扫图标(&树, &页, &数);
    *看账(&手) = Some((表.clone(), 此刻));
    表
}

/* 四个出处汇一张表：icons\ 顶上、icons\ 下一层子格、图片库那一格（不抢名字）、每一家包里的 icon */
fn 扫图标(树: &str, 页: &str, 数: &str) -> BTreeMap<String, String> {
    let mut 表 = BTreeMap::new();
    收一格(&mut 表, &Path::new(树).join("icons"), "", false, 树, 页, 数);
    收一格(&mut 表, &Path::new(数).join("images"), "images-", true, 树, 页, 数);
    let 包格 = Path::new(数).join("plugins");
    for 一家 in 列名字(&包格) {
        if !账上::算一家(&一家) {
            continue;
        }
        let Some(件) = 包里那张(&包格.join(&一家).join("images")) else { continue };
        if let Some(址) = 图标::地址(树, 页, 数, &件.to_string_lossy(), 改到(&件)) {
            表.insert(format!("pack-{}", 图标::名换算(&一家)), 址);
        }
    }
    表
}

fn 收一格(表: &mut BTreeMap<String, String>, 目录: &Path, 前: &str, 让住: bool, 树: &str, 页: &str, 数: &str) {
    let Ok(目) = std::fs::read_dir(目录) else { return };
    let mut 列: Vec<(String, bool)> = 目.flatten()
        .filter_map(|x| x.file_name().to_str().map(|n| (n.to_string(), x.path().is_dir())))
        .collect();
    /* NTFS 交出来的名字本来就按名字排；自己排一遍，免得换一台机器「谁占了名字」那一档变卦 */
    列.sort_by(|a, b| a.0.cmp(&b.0));
    for (名, 是目录) in 列 {
        let 全 = 目录.join(&名);
        if 是目录 {
            /* 只认一层：只有 icons\ 顶上这一趟（前是空）才往里钻，钻进去那一层再往里不算图标 */
            if 前.is_empty() && !名.starts_with('.') {
                收一格(表, &全, &图标::子层前缀(&名), false, 树, 页, 数);
            }
            continue;
        }
        if 图标::吃后缀(&名).is_none() {
            continue;
        }
        let 键 = format!("{}{}", 前, 图标::名换算(&图标::拆后缀(&名).0));
        if 键.is_empty() || !图标::该写入(表.contains_key(&键), 让住) {
            continue;
        }
        if let Some(址) = 图标::地址(树, 页, 数, &全.to_string_lossy(), 改到(&全)) {
            表.insert(键, 址);
        }
    }
}

/* 包里这张不认文件名，只认「icon.这个先后里的第一张后缀」：同时丢 svg 和 png 就用 svg */
fn 包里那张(格: &Path) -> Option<PathBuf> {
    图标::图标后缀.iter()
        .map(|后缀| 格.join(format!("icon{}", 后缀)))
        .find(|件| 件.is_file())
}

fn 列名字(格: &Path) -> Vec<String> {
    let Ok(目) = std::fs::read_dir(格) else { return Vec::new() };
    let mut 出: Vec<String> = 目.flatten().filter_map(|x| x.file_name().to_str().map(String::from)).collect();
    出.sort();
    出
}

/* ================= 系统字体：font:list ================= */

const 字体缓存档: &str = "fonts-cache.json";

/* 缓存那一份的落点与形状照主进程那颗：用户目录里 fonts-cache.json，
   多一栏 at 记的是哪一刻铺的（两个壳共用同一份文件，谁数完谁铺，读的那一头只认 fonts 与 faces） */
#[derive(Serialize)]
struct 一份缓存<'a> {
    at: u64,
    fonts: &'a [String],
    faces: &'a BTreeMap<String, Vec<字体::一档>>,
}

#[tauri::command]
pub async fn font_list(app: tauri::AppHandle, force: Option<bool>) -> 字体::一张字体表 {
    if !force.unwrap_or(false) {
        if let Some(存) = 读字体缓存() {
            return 存;
        }
    }
    match 数系统字体() {
        Some(表) if !表.fonts.is_empty() => {
            写字体缓存(&表);
            /* 数完推给每一扇窗：页面那一路听的是 font:changed（桥里 onFontList 登记的就是这一颗）。
               不推的话新装的字体现在这一扇看得到、别的那几扇要等下一次重开才现身。 */
            let _ = app.emit("font:changed", 表.clone());
            表
        }
        /* 数不动就当没读到：回缓存那份，缓存也没有就回 { fonts:[], faces:{} } —— 那一头同一退法 */
        _ => 读字体缓存().unwrap_or_default(),
    }
}

fn 数系统字体() -> Option<字体::一张字体表> {
    /* 一行是一张真脸，剩下的合并规矩在 fd_core::font_table（那一格有测试） */
    unsafe {
        let 厂: IDWriteFactory = DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED).ok()?;
        let 集: IDWriteFontCollection = {
            let mut 集: Option<IDWriteFontCollection> = None;
            厂.GetSystemFontCollection(&mut 集, false).ok()?;
            集?
        };
        let mut 行 = Vec::new();
        for 序 in 0..集.GetFontFamilyCount() {
            let Ok(族) = 集.GetFontFamily(序) else { continue };
            let Ok(家名) = 族.GetFamilyNames() else { continue };
            /* 源名照 WPF 那个 Source 的取法：en-us 那一档家名，没有就取第一条
               （这台机器 611 行量过：两把在 610 行上是同一个字，剩那一行正是「没 en-us 就退第一条」） */
            let 英 = 取档(&家名, "en-us").or_else(|| 取第(&家名, 0)).unwrap_or_default();
            let 中 = 取档(&家名, "zh-cn").unwrap_or_default();
            if 英.is_empty() {
                continue;
            }
            /* 一家底下的每一张脸：族本身就是个脸表（IDWriteFontFamily : IDWriteFontList） */
            let Ok(脸表) = 族.cast::<IDWriteFontList>() else { continue };
            for 脸序 in 0..脸表.GetFontCount() {
                let Ok(脸) = 脸表.GetFont(脸序) else { continue };
                /* 系统现合成的假粗假斜不算一档（霞鹜文楷等宽因此只剩三档，和「设置 → 个性化 → 字体」一样） */
                if 脸.GetSimulations().0 != 0 {
                    continue;
                }
                if 脸.GetStretch().0 != DWRITE_FONT_STRETCH_NORMAL.0 {
                    continue; /* 字重滑杆要的是粗细不是宽窄：等线那一族的窄体另算 */
                }
                let 脸名 = 脸.GetFaceNames().ok()
                    .and_then(|串| 取档(&串, "en-us").or_else(|| 取第(&串, 0)))
                    .unwrap_or_default();
                行.push(字体::一行(英.clone(), 脸.GetWeight().0, 脸名, 英.clone(), 中.clone()));
            }
        }
        if 行.is_empty() {
            return None;
        }
        Some(字体::合表(&行))
    }
}

fn 取档(串: &IDWriteLocalizedStrings, 语种: &str) -> Option<String> {
    let 名 = 宽串(语种);
    unsafe {
        let mut 序 = 0u32;
        let mut 有 = BOOL::default();
        串.FindLocaleName(PCWSTR(名.as_ptr()), &mut 序, &mut 有).ok()?;
        /* 认不到那一档时 exists 交回 0、同时 index 给的是「该插哪儿」—— 照那个数取值会串到隔壁那一档 */
        if !有.as_bool() {
            return None;
        }
        取第(串, 序)
    }
}

fn 取第(串: &IDWriteLocalizedStrings, 序: u32) -> Option<String> {
    unsafe {
        if 序 >= 串.GetCount() {
            return None;
        }
        let 长 = 串.GetStringLength(序).ok()? as usize;
        let mut 存 = vec![0u16; 长 + 1]; /* 那一颗 API 要的是「连同收尾那个 0」的格子 */
        串.GetString(序, &mut 存).ok()?;
        Some(String::from_utf16_lossy(&存[..长]))
    }
}

fn 读字体缓存() -> Option<字体::一张字体表> {
    let 文 = std::fs::read_to_string(数据格().join(字体缓存档)).ok()?;
    let 得: 字体::一张字体表 = serde_json::from_str(&文).ok()?;
    /* 空表就当没读到（跟那边 Array.isArray(j.fonts) && j.fonts.length 一句同一手） */
    if 得.fonts.is_empty() {
        None
    } else {
        Some(得)
    }
}

fn 写字体缓存(表: &字体::一张字体表) {
    let 路 = 数据格().join(字体缓存档);
    if let Some(父) = 路.parent() {
        let _ = std::fs::create_dir_all(父);
    }
    let 包 = 一份缓存 { at: 现在(), fonts: &表.fonts, faces: &表.faces };
    if let Ok(文) = serde_json::to_string(&包) {
        let _ = std::fs::write(路, 文);
    }
}

/* ================= 关于那一屏：about:info ================= */

const 页面样式: &str = "Flow_Desk_*.html";

#[derive(Serialize)]
pub struct 一个关于 {
    ok: bool,
    pages: String,
    data: String,
    versions: 一套版本,
    backups: Vec<String>,
    packs: Vec<一行插件>,
}

#[derive(Serialize)]
pub struct 一套版本 {
    fd: String,
}

#[derive(Serialize)]
pub struct 一行插件 {
    id: String,
    name: String,
    version: String,
}

#[tauri::command]
pub fn about_info() -> 一个关于 {
    let (树, 页, 数) = 三个格();
    一个关于 {
        ok: true,
        pages: 页.clone(),
        data: 数.clone(),
        versions: 一套版本 { fd: 页面的号(&页) },
        backups: 账上::备份列(&列名字(&Path::new(&树).join("update").join("backups"))),
        packs: 装着的那几家(&数),
    }
}

/* 号取的是这一棵上最近写过的那一张页面文件 —— 挑哪一张的尺在 fd_core::page_pick，跟开窗口那颗是同一颗 */
fn 页面的号(页: &str) -> String {
    let 候 = 列候选(页, 页面样式);
    let Some(名) = 挑最新(&候) else { return String::new() };
    候.iter().find(|c| c.名字 == 名).map(|c| c.版本.clone()).unwrap_or_default()
}

/* 装着的那几家一家一行，号取的是运行时真正加载的那一份清单；没清单的那一格不列，不编一个号出来。
   只看摊开的那一格：主进程那边开机第一件事就把丢进来的 zip 摊成文件夹（packAdopt），
   摊不动的那一份本来也读不出插件清单，关于这一屏同样列不出它。 */
fn 装着的那几家(数: &str) -> Vec<一行插件> {
    let 包格 = Path::new(数).join("plugins");
    let mut 出 = Vec::new();
    for 一家 in 列名字(&包格) {
        if !账上::算一家(&一家) {
            continue;
        }
        let Ok(文) = std::fs::read_to_string(包格.join(&一家).join("manifest.json")) else { continue };
        let Ok(单) = serde_json::from_str::<serde_json::Value>(&文) else { continue };
        出.push(一行插件 {
            id: 一家.clone(),
            name: 账上::一家名(&一家, 单.get("name").and_then(|v| v.as_str())),
            version: 账上::一家号(单.get("version").and_then(|v| v.as_str())),
        });
    }
    出
}

/* ================= 系统深浅：ming:system ================= */

#[derive(Serialize)]
pub struct 一个深浅 {
    dark: bool,
}

#[tauri::command]
pub fn ming_system() -> 一个深浅 {
    一个深浅 { dark: 深浅::是深色(读深浅值()) }
}

fn 读深浅值() -> Option<u32> {
    let 子 = 宽串(深浅::深浅子键);
    let 名 = 宽串(深浅::深浅值名);
    let mut 值: u32 = 0;
    let mut 长 = std::mem::size_of::<u32>() as u32;
    unsafe {
        let 果 = RegGetValueW(
            HKEY_CURRENT_USER,
            PCWSTR(子.as_ptr()),
            PCWSTR(名.as_ptr()),
            RRF_RT_REG_DWORD,
            None,
            Some(&mut 值 as *mut u32 as *mut core::ffi::c_void),
            Some(&mut 长),
        );
        /* 这一格没写过（那一类错码）就当「系统没设过深色」，不猜 */
        if 果 == ERROR_SUCCESS { Some(值) } else { None }
    }
}

/* ================= 取色：ocr:swatch ================= */

#[derive(Serialize)]
pub struct 一个取色 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    lang: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ow: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    oh: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    lines: Option<Vec<一行字>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

#[derive(Serialize)]
pub struct 一行字 {
    t: String,
    /* 框那四栏摆平在同一层：页面上使的是 {t,x,y,w,h}，不能多套一层 */
    #[serde(flatten)]
    框: 取色::行框,
}

impl 一个取色 {
    fn 成了(lang: String, ow: u32, oh: u32, lines: Vec<一行字>) -> 一个取色 {
        一个取色 { ok: true, lang: Some(lang), ow: Some(ow), oh: Some(oh), lines: Some(lines), msg: None }
    }
    fn 不成(msg: String) -> 一个取色 {
        一个取色 { ok: false, lang: None, ow: None, oh: None, lines: None, msg: Some(msg) }
    }
}

#[tauri::command]
pub async fn ocr_swatch(p: String) -> 一个取色 {
    /* Windows 认字那一路用的那几件（StorageFile、BitmapDecoder、SoftwareBitmap 这一类）不是 agile 的那一种，
       拿不到 Send，而 Tauri 的异步命令要在多线程运行时上跑 —— 所以这一趟整块交给一条自己的线程，
       那条线程上开一个只跑这一趟的运行时：异步那一段一个字节都不跨线程。
       三十秒这一道兜底照那一头：那边是杀掉子进程，这一头没有子进程可杀，到点就报同一句话
       （那条线程让它自己跑完 —— 它手里那份图没人等了） */
    let (发, mut 收) = tokio::sync::mpsc::channel::<一个取色>(1);
    if let Err(e) = std::thread::Builder::new().name("fd-取色".into()).spawn(move || {
        let 得 = match tokio::runtime::Builder::new_current_thread().build() {
            Ok(台) => 台.block_on(认一张(&p)),
            Err(e) => 一个取色::不成(format!("取色这一趟起不来：{}", e)),
        };
        let _ = 发.blocking_send(得);
    }) {
        return 一个取色::不成(format!("取色这一趟起不来：{}", e));
    }
    match tokio::time::timeout(Duration::from_secs(30), 收.recv()).await {
        Ok(Some(得)) => 得,
        /* 那条线程散了却没交货：报的是解码不成那一句，不假装认成功 */
        Ok(None) => 一个取色::不成(取色::话解码不成.to_string()),
        Err(_) => 一个取色::不成(取色::话三十秒.to_string()),
    }
}

async fn 认一张(路径: &str) -> 一个取色 {
    /* WinRT 那一头要先给这条线程定线程模型（RoInitialize；DirectWrite 那一颗不用） */
    unsafe {
        let _ = RoInitialize(RO_INIT_MULTITHREADED);
    }
    if !Path::new(路径).is_file() {
        return 一个取色::不成(format!("{}{}", 取色::话读不到, 路径));
    }
    let Some(引擎) = 挑引擎() else {
        return 一个取色::不成(取色::话没语言包.to_string());
    };
    match 认进去(&引擎, 路径).await {
        Ok(得) => 得,
        Err(话) => 一个取色::不成(话),
    }
}

/* 用户那一档语言没装识别包就退到系统里装了的那一颗（跟那一头同一手） */
fn 挑引擎() -> Option<OcrEngine> {
    if let Ok(引擎) = OcrEngine::TryCreateFromUserProfileLanguages() {
        return Some(引擎);
    }
    let 表 = OcrEngine::AvailableRecognizerLanguages().ok()?;
    for 序 in 0..表.Size().ok()? {
        let 语 = 表.GetAt(序).ok()?;
        if let Ok(引擎) = OcrEngine::TryCreateFromLanguage(&语) {
            return Some(引擎);
        }
    }
    None
}

async fn 认进去(引擎: &OcrEngine, 路径: &str) -> Result<一个取色, String> {
    /* 解码器直接开那一份文件：那一头是先 GDI 缩出一张临时 png 落盘、再叫 WinRT 认，
       这一头缩与换像素格式在这一趟解码里一起办完，不落盘、也不开子进程 */
    let 件 = StorageFile::GetFileFromPathAsync(&HSTRING::from(路径)).map_err(说错)?.await.map_err(说错)?;
    let 流 = 件.OpenAsync(FileAccessMode::Read).map_err(说错)?.await.map_err(说错)?;
    let 码 = BitmapDecoder::CreateAsync(&流).map_err(说错)?.await.map_err(说错)?;
    let (原宽, 原高) = (码.PixelWidth().map_err(说错)?, 码.PixelHeight().map_err(说错)?);
    let (新宽, 新高) = 取色::缩到(原宽, 原高, 取色::默认上限, OcrEngine::MaxImageDimension().unwrap_or(u32::MAX));
    let 影 = BitmapTransform::new().map_err(说错)?;
    if 新宽 != 原宽 || 新高 != 原高 {
        影.SetScaledWidth(新宽).map_err(说错)?;
        影.SetScaledHeight(新高).map_err(说错)?;
        /* Cubic 是 WinRT 这一档里最细的那一级插值（那一头用的是 GDI 的 HighQualityBicubic，同一档意思） */
        影.SetInterpolationMode(BitmapInterpolationMode::Cubic).map_err(说错)?;
    }
    /* 认字的引擎只吃 Bgra8 这一档像素格式：那一头还留了一句「退回它自己那一份原样」的兜底，
       可那份照样过不去这道格式闸 —— 所以这一头不摆第二条路，解码不成照同一句话报 */
    let 图 = 码
        .GetSoftwareBitmapTransformedAsync(
            BitmapPixelFormat::Bgra8,
            BitmapAlphaMode::Ignore,
            &影,
            ExifOrientationMode::IgnoreExifOrientation,
            ColorManagementMode::ColorManageToSRgb,
        )
        .map_err(说成解码不成)?
        .await
        .map_err(说成解码不成)?;
    let (宽, 高) = (图.PixelWidth().map_err(说错)? as u32, 图.PixelHeight().map_err(说错)? as u32);
    let 果 = 引擎.RecognizeAsync(&图).map_err(说错)?.await.map_err(说错)?;
    let 行 = 果.Lines().map_err(说错)?;
    let mut 出列 = Vec::new();
    for 序 in 0..行.Size().map_err(说错)? {
        let Ok(一) = 行.GetAt(序) else { continue };
        let Some(字) = 取色::要这行(&一.Text().map(|串| 串.to_string_lossy().to_string()).unwrap_or_default()) else { continue };
        let mut 框 = Vec::new();
        if let Ok(词) = 一.Words() {
            for 词序 in 0..词.Size().unwrap_or(0) {
                if let Ok(个) = 词.GetAt(词序) {
                    if let Ok(r) = 个.BoundingRect() {
                        框.push(取色::词框(r.X as f64, r.Y as f64, r.Width as f64, r.Height as f64));
                    }
                }
            }
        }
        出列.push(一行字 { t: 字, 框: 取色::并成行(&框) });
    }
    let 语 = 引擎.RecognizerLanguage().ok()
        .and_then(|语| 语.LanguageTag().ok())
        .map(|串| 串.to_string_lossy().to_string())
        .unwrap_or_default();
    Ok(一个取色::成了(语, 宽, 高, 出列))
}

/* 认字那份像素格式都取不到 —— 这一句照那一头 C# 里那一句，别说别的 */
fn 说成解码不成(_: windows::core::Error) -> String {
    取色::话解码不成.to_string()
}
