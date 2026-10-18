/* 四层里的第三层 · 插件那一列的五颗：有什么（pack:list）/ 包里一份文件（pack:file）/ 写名单（pack:set）/
   导入一家（pack:import）/ 清那两处数据（pack:wipe）
   ------------------------------------------------------------
   照 src\pack\main.cjs 那五颗 handler 搬（ipcMain.handle 分别在 1876 / 1880 / 1895 / 1995 / 2052 行），
   它们叫的 helper 就在同一个文件里：packScan()（1797 行）、packOne(dir,name,kind)（1774 行）、
   packRaw(id,rel)（1855 行）、packHas(id)（1844 行）、packAfterSet()（1892 行）、packManifestOf()（1918 行）、
   walkPackDir()（1926 行）、expandZipPack()（1936 行）、keepOriginal()（1988 行）。
   页面上请的串一个字不改：pack:set → pack_set 那一手换算在桥里做。
   回给页面的形状一格都不动（对着原件每一支的 return 逐格抄）：
     · pack:list → { dir, packs, off, error }（error 原件恒为空串，这一头也留这一格，不省）；
       packs 里每一格是 packOne 的产物：{ id, kind, manifest } / 文件夹那种多一格 files /
       读不成清单的是 { id, kind, error }（「有才有」那种 skip_serializing_if，两种款式互不出现）；
     · pack:file → { ok:false, msg }（取不到那份 / 过了 24MB 那道闸 / 转不成文本）
                 / { ok:true, text, size }；
     · pack:set  → { ok:true }（删掉那份名单那一支）/ { ok:true, ids }（写完那一支，ids 就是页面递进来的
       那一串照 String() 折过）/ { ok:false, msg }（那四句原话：建不出格 / 删不掉 / 不是列表 / 写不进）；
     · pack:import → { ok:true, id, where, files, name } / { ok:false, msg }（那十句原话逐字照抄）；
     · pack:wipe → { ok:true, removed } —— 原件永远 ok:true（那两步抹不动都是一句都不报、也不进 removed），
       这一头也一样：任何一步都不抛给页面。
   「哪一枚名字进这一列、两趟怎么收、那两份名单怎么读、开着的怎么换成卸掉的、导入那一条的门牌怎么折成绝对、
   清那两处该留哪几格、24MB 那道闸与那几句白话」全在 fd_core::pack_rule
   （闸：src\tools\probes\gate-tauripack46.mjs 现场读 main.cjs 1751~1887 与 1892~2072 那两段逐字对）；
   这一层只做三件事：认那一列在哪一格、问盘上有没有、把 core 算出来的东西落到字节上。
   ------------------------------------------------------------
   那一列住在哪一格（原件 PACKS_DIR = <数据层>\plugins，1751 行）：朝 comp_cmds::活的那一格() 借，
   与 comp_cmds 那一摊三颗、code:catRename 同一把尺同一处格，不在这一本里再抄一遍 "plugins" 那一名。
   压缩包怎么拆也朝共用那一颗借：fd_core::zip_pack 的 目录() 与 取一份()（外46 三 批六之前就有了，
   读中央目录、按本地头取一份、deflate 那一档都归它）—— 这一本里没有第二个解包器，
   包里那份插件清单、包里那一份文件、导入那一条摊开的整包走的都是它（原件三头用的也是同一份 zip-read.cjs）。
   自有容器那一种（插件分离第 3 批 3.4）也不在这一本里读四段：文件头怎么认、信息段齐不齐、哪一块对不上号、
   那七句报话、按表取那一份 —— 全朝 fd_core::pack_box 借（整包检查 / 取一块 / 钥匙表 / 带点后缀）。
   扫那一列从两趟收成三趟（文件夹、zip、自有容器），赢家还是那一格；运输形状不当运行形状使。
   从前导入那一下还顺手往 原厂那一格（data\plugins-factory\）留一份原版，落点朝 comp_rule 借；
   插件分离第 2 批 2.5 撤了那颗「恢复出厂」、2.6 把那一格整格撤了，这一步跟着没 —— 装上一格就是活的这一格。
   「音乐遥控器还在不在」那一问朝 media_cmds::装了音乐遥控器() 借（原件 packHas 那三条），
   收后台监听用的就是 media_cmds 那一颗 收监听（原件 mediaStop）—— 都不在这一本里另起第二份。
   ------------------------------------------------------------
   四处差，写在这儿（不是当没看见）：
     ① 段名洗法与 zip_pack 的 干净名 不同一处：原件 packRaw 对空段与 '.' 段是「整串不认」，
        cleanName 是「扔掉继续走」—— 两把尺各对各的原件，这一头照 packRaw（口径在 pack_rule::洗那串）。
     ② 读文本认严格 UTF-8：Node 的 readFileSync/toString 遇到不是 UTF-8 的字节是替换成 U+FFFD、不抛，
        这一头会落到「读不出文本：」/「插件清单读不成那份格式：」那一句。落点还是原件那一格，
        页面上看到的还是那一句白话。
     ③ 文件夹那一格读不出名册（原件 1781 行那句 readdirSync 没套 try，抛了会把整颗 packScan 顶起来、
        最后由 preload 那侧的 catch 变成 { ok:false, msg:'插件目录读不到：…' }）：这一头不抛给页面，
        按「那一家不进这一列」收 —— 与 comp_cmds 那三颗「任何一步都不许抛」同一口径。
     ④ 原件那几处 logLine('插件', …) 里此刻还剩的那一处（1831 行名单换算）照原样落进
        data\logs\ 那一天那一个文件 —— 动手在 tauri_bind::log_cmds，那一行的形状在 core::log_line。
        1991 / 1992 那两句（留底成了报几份、没留出原版报为什么）跟着「导入顺手留一份原版」那一步一起撤了。
     ⑤ 原件 packHas 第一道问的是 fs.existsSync(dir)（格与份都算「在」）：这一头 盘上有() 也是问
        metadata 成不成 —— 同一手；'.' 与 '..' 两种包名在原件走得进「这里已经有一份」那一句，
        这一头先落「包名不干净，不敢落地：」（差一句措辞，两处都动不了本家以外一个字节，详见 pack_rule 顶上第②处）。 */
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::Path;

use tauri::State;

use crate::fd_core::comp_rule::包名干净;
use crate::fd_core::data_path::落格;
use crate::fd_core::pack_rule::{
    包里没有那句, 包名不干净那句, 包读不动那句, 包那一格留着, 不像插件那句, 只收压包那句, 压包后缀, 压包那种,
    压包读不动那句, 同名那格已占, 太大那句, 在根以内, 拆成段, 格没带清单那句, 文件夹那种, 分成三趟, 卸掉监听那句,
    卸掉那一格, 卸掉那份, 读不到那份那句, 建不出那句, 记为卸掉, 折成绝对, 老单成列, 老的那份, 洗那串,
    开单成列, 开着的名单, 末段去后缀, 末段, 盘上, 摊那一条, 按名单收, 那份东西, 脏路径那句,
    落不成那句, 清单那份, 清单上的id, 清单上的名字, 清单读不成那句, 没带清单那句, 该看的名, 换成卸掉,
    递的那串, 读不出文本那句, 导入失败那句, 那一条, 已占那句, 是压包那份, 两不象那句,
    不是列表那句, 名单删不掉那句, 名单写不进那句, 封顶字节, 容器那种, 是容器那份,
    容器成名, 该提醒换, 换进来名, 换下去名, 一家留最新一颗,
};
use crate::fd_core::pack_box::{取一块, 整包检查, 钥匙表, 一张信息, 一份检查, 带点后缀};
use crate::fd_core::zip_pack::{取一份, 目录};
use crate::tauri_bind::media_cmds::{装了音乐遥控器, 收监听, 媒体手};

/* 报错那句话照那一头交给页面（Electron 那边 catch 到的是什么，这一头回的就是系统那一句） */
fn 说错(e: std::io::Error) -> String { e.to_string() }

/* 那一列在哪一格：<树根>\data\plugins（与「改代码」那六颗同一颗，不另起第二份口径） */
fn 那一列的格() -> String { crate::tauri_bind::comp_cmds::活的那一格() }

/* 盘上到底有没有那一份：与主进程那两个 try/catch 同两手（问不到就当没有，不抛）；
   是格还是份由 扫一遍 那一趟问 fs::metadata 判（原件 statSync 同一手），这儿不再单开一颗 */
fn 是不是份(p: &str) -> bool { fs::metadata(p).map(|m| m.is_file()).unwrap_or(false) }

/* 把一格和一颗名字并成一条落点（对应 Node 的 path.join，写法照 comp_cmds 那颗同名工具） */
fn 并路(格: &str, 名: &str) -> String {
    let mut s = String::from(格);
    while s.ends_with('\\') || s.ends_with('/') {
        s.pop();
    }
    format!("{}\\{}", s, 名)
}

/* ---------- 回给页面那三格：字段名与顺序照 main.cjs 的 return ---------- */

/// packOne 的产物：一格包（文件夹那种带 files，读不成清单的带 error，两种款式互不出现）
#[derive(Serialize)]
pub struct 一个包 {
    id: String,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    manifest: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    /* 壳这一头挡下了哪几颗通道（清单点名也不给的那几颗，判断在 core::perm_rule）。
       2026-10-11 批六第二步起才有这一格，页面上现在没人读它 —— 装载那一路接上之后拿它报话。
       清单里那一格同时被摘干净：页面上那把 JS 尺（packApp）照旧留着，两处各挡一遍。 */
    #[serde(rename = "deniedChannels", skip_serializing_if = "Vec::is_empty")]
    挡下的: Vec<String>,
}

impl 一个包 {
    /* 原件那三种读不成清单的回执都长同一形状：id + kind + error，没有 manifest 那一格 */
    fn 读不成(名: &str, 种: &'static str, 那句: String) -> Self {
        一个包 { id: 名.to_string(), kind: 种, manifest: None, files: None, error: Some(那句), 挡下的: vec![] }
    }
}

/// packScan 的产物（原件 1838 行那一格：dir / packs / off / error —— error 恒为空串，也照样留这一格）
#[derive(Serialize)]
pub struct 一次扫描 {
    dir: String,
    packs: Vec<一个包>,
    off: Vec<String>,
    error: String,
}

impl 一次扫描 {
    /* 那一列根本不在 / 读不出名册（原件 1800 行 catch 那一支）：空列 + 空名单 + 空 error，
       老那份换算与读 off 那两手都不再走 */
    fn 空在这一格(格: &str) -> Self {
        一次扫描 { dir: 格.to_string(), packs: vec![], off: vec![], error: String::new() }
    }
}

/// pack:file 那一格（成了是 ok + text + size，不成是 ok + msg）
#[derive(Serialize)]
pub struct 一份包里文件 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

impl 一份包里文件 {
    fn 不成(那句: String) -> Self { 一份包里文件 { ok: false, text: None, size: None, msg: Some(那句) } }
}

/// pack:set 那一格（原件 1900 / 1908 行两种款式：删掉名单只回 ok，写完名单多带 ids ——
/// 带的是页面递进来的那一串照 String() 折过的，不是算出来的那几家卸掉的）
#[derive(Serialize)]
pub struct 一份名单 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

impl 一份名单 {
    fn 不成(那句: String) -> Self { 一份名单 { ok: false, ids: None, msg: Some(那句) } }
}

/// pack:import 那一格（原件 2018 / 2040 行成了款式：id / where / files / name 四格全带，
/// where 就是「<包名>/」那一串斜杠写法；不成那一支只有 ok + msg）
#[derive(Serialize)]
pub struct 一份导入 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<String>,
    #[serde(rename = "where", skip_serializing_if = "Option::is_none")]
    落在哪: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    files: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

impl 一份导入 {
    fn 不成(那句: String) -> Self {
        一份导入 { ok: false, id: None, 落在哪: None, files: None, name: None, msg: Some(那句) }
    }
    /// 成了那一支四格（原件两处 return 同形状：where 带尾斜杠、files 是落了几份、name 退包名）
    fn 成了(包名: &str, 数: u64, 名: String) -> Self {
        一份导入 {
            ok: true,
            id: Some(包名.to_string()),
            落在哪: Some(format!("{}/", 包名)),
            files: Some(数),
            name: Some(名),
            msg: None,
        }
    }
}

/// pack:wipe 那一格（原件 2071 行只有一种款式：{ ok:true, removed }，抹不着的进不了 removed，一句也不报错）
#[derive(Serialize)]
pub struct 一份清理 {
    ok: bool,
    removed: Vec<String>,
}

/* ---------- 问盘上有没有：三颗新用的那一手（对应原件 fs.existsSync） ---------- */

/* 原件那一手是 fs.existsSync（格与份都算「在」，问不到就是不在）：这一头问 metadata 成不成，同一手。
   与上面 是不是份 不是一把尺 —— 那一颗是 statSync().isFile()，钉的是 packOne 与导入那两条分支 */
fn 盘上有(p: &str) -> bool { fs::metadata(p).is_ok() }

/// 这一家在路径里有没有配着一份自有容器；有就把信息段折出来（只读那一段，不逐块算哈希 ——
/// 运行时每读一份都跑一趟，代价要小）。读不到、不是容器、字段不齐 —— 一律 None = 没得核。
fn 容器信息(格: &str, 包名: &str) -> Option<crate::fd_core::pack_box::一张信息> {
    let 到 = format!("{}{}", 并路(格, 包名), crate::fd_core::pack_box::带点后缀);
    if let Ok(字) = fs::read(&到) {
        return crate::fd_core::pack_box::读信息(&字);
    }
    /* 那一颗的名字带着号（出货那一格那一种写法）：拼出来的那一名不在，才多问一次这一格里躺着的那一颗。
       装成之后这一路本来就到不了这里 —— 那颗运输件摊完就删了（他 2026-10-17 那一条）。 */
    let 名们: Vec<String> = fs::read_dir(格).ok()?.filter_map(|项| 项.ok().map(|x| x.file_name().to_string_lossy().to_string())).collect();
    let 名册: Vec<(String, 盘上)> = 名们.into_iter().map(|名| (名, 盘上::是份)).collect();
    let 那一名 = 容器那一名(&名册, 包名)?;
    crate::fd_core::pack_box::读信息(&fs::read(并路(格, &那一名)).ok()?)
}

/// 运行时读到一份东西：拿着这一家那份容器指一下这一份。Some(那一句原话) = 与包上对不上，
/// 调用方就不该把内容递出去；None = 没得核（没有容器）或包上没写着这一份，或本来就是对的。
fn 读过那一份(格: &str, 包名: &str, 相对: &str, 字节: &[u8]) -> Option<String> {
    let 信 = 容器信息(格, 包名)?;
    (crate::fd_core::pack_box::核那一份(&信, 相对, 字节)
        == Some(crate::fd_core::pack_box::哈希不对那句))
        .then(|| format!("{}：{}", crate::fd_core::pack_box::哈希不对那句, 相对))
}

/* 当前那一格（原件 path.resolve 用的是进程当前目录，Electron 起的就是这一棵树所在那一格）：
   问不到就退回壳自己所在那一格，只为把「那份东西读不到：」那一句报成一条绝对地址，不影响动盘 */
fn 当前那一格() -> String {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| crate::tree_root().to_string_lossy().to_string())
}

/* ---------- packOne：一个包摊平后的样子（原件 1774~1793 行） ---------- */

/// 压缩包那一份里读插件清单（原件 packOne 的 zip 那一支：zipIndex 找 manifest.json、unzipEntry 再 JSON.parse）。
/// 回的那一句已经是成品：「压缩包里没带插件清单」不带前缀，另外几种都挂着「zip 读不动：」——
/// 原件那两层 catch 的分界就在这一颗里，外面那一层只负责把它塞进 error 那一格。
fn 压包里的清单(节: &[u8]) -> Result<Value, String> {
    let 目 = 目录(节).map_err(|e| format!("{}{}", 压包读不动那句, e))?;
    let 项 = match 目.iter().find(|x| x.名 == 清单那份) {
        Some(v) => v,
        None => return Err(没带清单那句.to_string()),
    };
    let 文 = 取一份(节, 项).map_err(|e| format!("{}{}", 压包读不动那句, e))?;
    serde_json::from_slice::<Value>(&文).map_err(|e| format!("{}{}", 压包读不动那句, e))
}

/// 一家摊开：文件夹那种读 <那一格>\manifest.json 并带上那一格里的名册，压缩包那种从包里拆清单。
/// 回 None = 原件回 null 那两支（那一格里没带插件清单 / 那颗 zip 读不到），一家家收的时候直接跳过这一格。
fn 摊开一家(格: &str, 名: &str, 种: &'static str, 件名: Option<&str>) -> Option<一个包> {
    if 种 == 文件夹那种 {
        let 那一格 = 并路(格, 名);
        let 清单 = 并路(&那一格, 清单那份);
        /* 原件 fs.existsSync(f)：没带插件清单的这一格整个不列（不是「读不成」） */
        if !是不是份(&清单) {
            return None;
        }
        /* 读不出与解析不成是同一句前缀（原件那两手在同一个 try 里） */
        let 文 = match fs::read_to_string(&清单) {
            Ok(v) => v,
            Err(e) => return Some(一个包::读不成(名, 种, format!("{}{}", 清单读不成那句, 说错(e)))),
        };
        let mut 单 = match serde_json::from_str::<Value>(&文) {
            Ok(v) => v,
            Err(e) => return Some(一个包::读不成(名, 种, format!("{}{}", 清单读不成那句, e))),
        };
        /* files 只有文件夹那种才有（原件 readdirSync 那一格，图片、随行件、脚本全在里面，一律不筛）；
           读不出名册那一种见文件顶上第 ③ 处。原件照枚举序，这一头排一遍免得每台机器枚举序不同
           （comp_cmds 走树那颗同一手），列出来的还是同一串名字 */
        let mut 名册: Vec<String> = match fs::read_dir(&那一格) {
            Ok(目) => 目.filter_map(|项| 项.ok().map(|x| x.file_name().to_string_lossy().to_string())).collect(),
            Err(_) => return None,
        };
        名册.sort();
        /* 壳这一头先把「宿主自己的事」那几颗通道摘掉（名单是生成的那份，判断在 core::perm_rule）*/
        let 挡 = crate::fd_core::perm_rule::挡下该挡的(&mut 单);
        return Some(一个包 { id: 名.to_string(), kind: 种, manifest: Some(单), files: Some(名册), error: None, 挡下的: 挡 });
    }
    /* 自有容器那一支（插件分离第 3 批 3.4）：读那颗容器的字节 → 整包检查 → 从包里取 manifest.json。
       读不动与不过检回的都是「读不成」那一格（带那一句原话），一家家收的那一头不因此停整趟扫描。
       件名 = 盘上那一份运输件自己叫什么（扫一遍那一名册折出来的）：出货那一格里名字带着号
       （notes-1.0.0-alpha+build.x.fdpkg），拿包名拼出来的那一名不是它 —— 拼的那一种只当兜底。 */
    let 后缀 = if 种 == 容器那种 { crate::fd_core::pack_box::带点后缀 } else { 压包后缀 };
    let 拼的 = format!("{}{}", 名, 后缀);
    let 节 = match fs::read(并路(格, 件名.unwrap_or(&拼的))) {
        Ok(v) => v,
        Err(_) => return None,
    };
    if 种 == 容器那种 {
        let 出 = 整包检查(&节, &crate::version(), 钥匙表);
        if !出.ok {
            return Some(一个包::读不成(名, 种, 出.头一句()));
        }
        let 文 = match 取一块(&节, 清单那份) {
            Some(v) => v,
            None => return Some(一个包::读不成(名, 种, 没带清单那句.to_string())),
        };
        return match serde_json::from_slice::<Value>(&文) {
            Ok(mut 单) => {
                let 挡 = crate::fd_core::perm_rule::挡下该挡的(&mut 单);
                Some(一个包 { id: 名.to_string(), kind: 种, manifest: Some(单), files: None, error: None, 挡下的: 挡 })
            }
            Err(e) => Some(一个包::读不成(名, 种, format!("{}{}", 清单读不成那句, e))),
        };
    }
    /* zip 那一支：先按 <包名>.zip 读到字节（原件读不到回 null，不是报错） */
    match 压包里的清单(&节) {
        Ok(mut 单) => {
            let 挡 = crate::fd_core::perm_rule::挡下该挡的(&mut 单);
            Some(一个包 { id: 名.to_string(), kind: 种, manifest: Some(单), files: None, error: None, 挡下的: 挡 })
        }
        Err(那句) => Some(一个包::读不成(名, 种, 那句)),
    }
}

/* ---------- 开机把运输形状摊成运行用的那一格 ----------
   他 2026-10-16 装空壳那一次量到的：装出去那一棵里 data\plugins\ 是空的（主程序那一枚本来就不带插件），
   安装说明上写着「把那颗包丢进这一格、重启一次就认」，可这一趟从前只列名不摊，
   页面那一头两种运输形状都不当运行形状使 —— 丢进去的容器于是永远加载不上。
   与导入那两路的分别只有两条：那一份包本身已经在这一格里了（不再拷第二份），
   以及「同名已占」这一判反过来用 —— 那一格已经在了就说明摊过，这一趟一个字节都不动。
   容器照旧先整包检查：不过检一个字节不落（报不动手），那一行带着那一句原话进管理页。 */
fn 开机摊一家(格: &str, 名: &str, 种: &'static str, 件名: Option<&str>) {
    let 到 = 并路(格, 名);
    if 盘上有(&到) {
        return;
    }
    let 后缀 = if 种 == 容器那种 { crate::fd_core::pack_box::带点后缀 } else { 压包后缀 };
    let 拼的 = format!("{}{}", 名, 后缀);
    let 那一份 = 件名.unwrap_or(&拼的);
    let 节 = match fs::read(并路(格, 那一份)) {
        Ok(v) => v,
        Err(_) => return,
    };
    if 种 == 容器那种 {
        let 出 = 整包检查(&节, &crate::version(), 钥匙表);
        if !出.ok {
            return;     /* 不过检：一个字节不落；列名那一头把这一句原话报出来 */
        }
        let 信 = match &出.信息 {
            Some(v) => v.clone(),
            None => return,
        };
        /* 目录名必须与信息段那一栏一样（规格那张表），对不上就不摊：
           摊出去会造出一格与包上那一名不符的目录，管理页两行说不清谁是谁 */
        if 信.id.trim() != 名 {
            return;
        }
        if 信.files.iter().any(|份| 份.加密) {
            return;     /* 带加密块这一版不摊（明文不许写盘那条硬规矩） */
        }
        /* 摊的这一手与装、换版共用同一颗（摊进一格），这一本里不落第二份写盘的代码 */
        if let Err(_) = 摊进一格(&节, &出, &信, &到) {
            抹掉半截(&到);
            return;
        }
        /* 摊成了就把那颗运输件删掉：插件路径里只留解开的这一份（他 2026-10-17 那条「装好以后 plugins 里就是上面那些文件夹，下面的 fdpkg 自动删除」）。
           删不掉不算摊失败 —— 那一格已经是新的了，下一趟开机再删一次。 */
        let _ = fs::remove_file(并路(格, 那一份));
        return;
    }
    /* zip 那一支：读名册 → 一份份摊；摊不动抹掉半截，那份 zip 留着，下一趟开机再试 */
    let (目, _) = match 包里的清单与名册(&节) {
        Ok(v) => v,
        Err(_) => return,
    };
    if 摊成一家(格, &节, &目, 名).is_err() {
        抹掉半截(&到);
    }
}

/* ---------- packScan：扫一遍那一列（原件 1797~1839 行） ---------- */

/// 两趟收：文件夹那一趟先走、压缩包那一趟后走，同名让开判断与「只有真列出来的才算占上」
/// 全在 core（分成两趟 / 同名那格已占 / 记为卸掉），这一颗只负责问盘、摊开、落那两份名单。
/// 这一家在盘上配的那一颗容器叫什么名：先认 `<包名>.fdpkg` 那一种，认不到再拿名册里那一名折回来对
///   —— 出货那一格里每一颗的名字都带着自己那一号（`<包名>-<号>.fdpkg`，他 2026-10-17 要的那种摆法），
///   折法与分成三趟同一把尺（core::pack_rule::容器成名），这里不写第二把。zip 不需要这一手：它的原名就是包名加后缀。
fn 容器那一名(名册: &[(String, 盘上)], 包名: &str) -> Option<String> {
    let 拼 = format!("{}{}", 包名, 带点后缀);
    if 名册.iter().any(|(名, _)| 名 == &拼) {
        return Some(拼);
    }
    名册.iter().find(|(名, _)| 容器成名(名) == Some(包名)).map(|(名, _)| 名.clone())
}

fn 扫一遍(格: &str) -> 一次扫描 {
    let 目 = match fs::read_dir(格) {
        Ok(v) => v,
        Err(_) => return 一次扫描::空在这一格(格),
    };
    /* 原件 1799~1806 行：先拿名、再一家家 statSync 问是格还是份，问不到的 continue（这一头交给 core 那颗 问不到） */
    let mut 名们: Vec<String> = 目.filter_map(|项| 项.ok().map(|x| x.file_name().to_string_lossy().to_string())).collect();
    名们.sort();
    let mut 名册: Vec<(String, 盘上)> = vec![];
    for 名 in 名们 {
        if !该看的名(&名) {
            continue;
        }
        let 相 = match fs::metadata(并路(格, &名)) {
            Ok(m) if m.is_dir() => 盘上::是格,
            Ok(_) => 盘上::是份,
            Err(_) => 盘上::问不到,
        };
        名册.push((名, 相));
    }
    let (文件夹那一批, 压包那一批, 容器那一批) = 分成三趟(&名册);
    let mut 列: Vec<一个包> = vec![];
    let mut 扫到: Vec<String> = vec![];
    for 名 in &文件夹那一批 {
        if let Some(包) = 摊开一家(格, 名, 文件夹那种, None) {
            列.push(包);
            扫到.push(名.clone());
        }
    }
    /* 两趟运输形状：zip 先、容器后（同一格里两种都放着时，谁先露面谁占名 —— 与原件那条「文件夹赢」同一把尺，
       赢的永远是那一格，不是谁先露面）。
       2026-10-16 加一手：列之前先把那一格摊出来（开机摊一家），摊成了就报**文件夹**那一行 ——
       页面那一头只吃摊开的那一格，从前这里只列名不摊，丢进这一格的容器于是永远加载不上。
       摊不成（不过检、带加密块、名对不上）才留运输形状那一行，带着那一句原话给管理页说。 */
    for 包名 in &压包那一批 {
        /* 文件夹赢同名 zip（原件 if(seen.has(id)) continue）；seen 只记真列进这一列的那几家 */
        if 同名那格已占(&扫到, 包名) {
            continue;
        }
        开机摊一家(格, 包名, 压包那种, None);
        let 包 = 摊开一家(格, 包名, 文件夹那种, None).or_else(|| 摊开一家(格, 包名, 压包那种, None));
        if let Some(包) = 包 {
            列.push(包);
            扫到.push(包名.clone());
        }
    }
    for 包名 in &容器那一批 {
        if 同名那格已占(&扫到, 包名) {
            continue;
        }
        /* 那一名：盘上这一家配的那一颗容器叫什么 —— 出货那一格里带着号（<包名>-<号>.fdpkg），拿包名拼不出这一名 */
        let 那一名 = 容器那一名(&名册, 包名);
        开机摊一家(格, 包名, 容器那种, 那一名.as_deref());
        let 包 = 摊开一家(格, 包名, 文件夹那种, None).or_else(|| 摊开一家(格, 包名, 容器那种, 那一名.as_deref()));
        if let Some(包) = 包 {
            列.push(包);
            扫到.push(包名.clone());
        }
    }
    /* 老那份「装了哪些」换算一次（原件 1823~1833 行：整段一个 try，读不成也照样换 —— 换完删掉老那份，
       只此一趟，不留两条路并读；那一句「名单换算」照原件落进日志）。 */
    let 老的 = 并路(格, 老的那份);
    if 是不是份(&老的) {
        let 老名单 = fs::read_to_string(&老的).ok().and_then(|文| 老单成列(&文));
        let 卸 = 记为卸掉(&扫到, 老名单.as_deref());
        if let Ok(文) = serde_json::to_string_pretty(&卸掉那一格(&卸)) {
            /* 原件那两手是写盘在前、删老那份在后：写不成就不删，别让老那份两头都没了 */
            if fs::write(并路(格, 卸掉那份), format!("{}\n", 文)).is_ok() {
                let _ = fs::remove_file(&老的);
                crate::tauri_bind::log_cmds::记一笔("插件", format!(
                    "名单换算 {} → {}：记为卸掉 {} 家（扫到 {} 家）", 老的那份, 卸掉那份, 卸.len(), 扫到.len()));
            }
        }
    }
    /* off.json：两种写法都认，读不成就当一家都没卸（原件 1834~1837 行那一个 catch） */
    let off = match fs::read_to_string(并路(格, 卸掉那份)) {
        Ok(文) => 开单成列(&文),
        Err(_) => vec![],
    };
    一次扫描 { dir: 格.to_string(), packs: 列, off, error: String::new() }
}

/// pack:list —— 回 packScan() 那一整格（原件 1876 行就是 () => packScan()，不收栏）
#[tauri::command]
pub fn pack_list() -> 一次扫描 {
    扫一遍(&那一列的格())
}

/* ---------- packRaw + pack:file（原件 1855~1887 行） ---------- */

/// 从包里取一份文件的原始字节（原件 packRaw）：文件夹直接读，zip 从里头拆出来 —— 两个 exe 都能看到包里那份底本。
/// 回 None 就是原件回 null 那五支：段名不干净 / 这一家不在这一列 / 落点跑出这一格 / 读不到 / 包里没这一名。
fn 取原始(格: &str, 包: &一个包, 净: &str) -> Option<Vec<u8>> {
    if 包.kind == 文件夹那种 {
        let 那一格 = 并路(格, &包.id);
        let mut 落 = 那一格.clone();
        for 段 in 拆成段(净) {
            落 = 并路(&落, 段);
        }
        /* 原件 1864 行那一道：算出来的落点必须还在这一格里。洗那串 已经挡了 ..，这一道是原件自带的第二把，照抄不撤 */
        if 落 != 那一格 && !落.starts_with(&format!("{}\\", 那一格)) {
            return None;
        }
        return fs::read(&落).ok();
    }
    /* 包里那一份：走共用的解包那一颗（目录() 读中央目录、取一份() 拿那一条的原文） */
    let 节 = fs::read(并路(格, &format!("{}{}", 包.id, 压包后缀))).ok()?;
    let 目 = 目录(&节).ok()?;
    let 项 = 目.iter().find(|x| x.名 == 净)?;
    取一份(&节, 项).ok()
}

/// 取包里的一份文件给页面（原件 1880~1887 行）。
/// 取不到那一种（含段名不干净、包不在、包里没这一名）都是同一句「包里没有这份文件：<id>/<rel>」——
/// 拼的是页面递进来的那两串，不是洗过的那一串（原件 String(id) + '/' + String(rel)）。
/// 大小闸那道算式与那句白话（'这份文件 ' + Math.round(len/1048576) + 'MB，太大不走这条路'）在 core。
#[tauri::command]
pub fn pack_file(id: String, rel: String) -> 一份包里文件 {
    let 那句 = 包里没有那句(&id, &rel);
    let 净 = match 洗那串(&rel) {
        Some(v) => v,
        None => return 一份包里文件::不成(那句),
    };
    let 格 = 那一列的格();
    /* 原件 packRaw 叫的是整颗 packScan()：一家家摊平一遍才认得出这一家在不在（包里那份底本也是这么找到的） */
    let 扫 = 扫一遍(&格);
    let 包 = match 扫.packs.iter().find(|x| x.id == id) {
        Some(v) => v,
        None => return 一份包里文件::不成(那句),
    };
    let 节 = match 取原始(&格, 包, &净) {
        Some(v) => v,
        None => return 一份包里文件::不成(那句),
    };
    let 大 = 节.len() as u64;
    /* 原件 1883 行是严格大于：正好 24MB 还走这条路 */
    if 大 > 封顶字节 {
        return 一份包里文件::不成(太大那句(大));
    }
    /* #32 那三种时机里的第三种（正在用着）：读到这一份，顺手拿这一家自己那份容器指着它核一下。
       没那份容器（文件夹或旧 zip 进来的）= 没得核，照旧给；对不上就不给内容，回的是那一句原话
       —— 界面上拿它判要不要停这一家（那三步的界面归第 4 批）。 */
    if let Some(那句) = 读过那一份(&格, &id, &净, &节) {
        return 一份包里文件::不成(那句);
    }
    match String::from_utf8(节) {
        Ok(文) => 一份包里文件 { ok: true, text: Some(文), size: Some(大), msg: None },
        /* 原件那一句 catch 在这一头才真走得通（差在第 ② 处写着） */
        Err(e) => 一份包里文件::不成(format!("{}{}", 读不出文本那句, e)),
    }
}

/* ---------- pack:set：名单落盘（原件 1895~1910 行）+ packAfterSet（1892~1894 行） ---------- */

/* packAfterSet：写完名单顺手查一眼音乐遥控器还在不在 —— 不在就把后台监听收掉（不等窗口关）。
   「监听跟着音乐插件走」要的就是这个：卡卸了还在后台转进程，说不通。
   装没装那一问朝 media_cmds::装了音乐遥控器() 借（原件 packHas 那三条：那一格整个不在 = 全当装了、
   在的话要扫得到、且没被 off 点过名），这一本里没有第二把尺；
   监听没在跑的时候 收监听 自己就 return（对应原件 media.child 那一道闸），一句副作用都不留 */
fn 收掉后台监听(手: &媒体手) {
    if !装了音乐遥控器() {
        收监听(手, 卸掉监听那句);
    }
}

/// 页面递进来的是「开着的」那几家（界面那头的说法没改），落盘换成「卸掉的」= 扫到的全部 减 开着的；
/// 递 null / undefined（桥那边栏没给也算 undefined）就是删掉那份名单文件 = 一家都不卸。
/// 四道闸的顺序照原件：建不出格 → 删那份名单 → 不是列表 → 写不下去（前一道中了就轮不到后一道）。
#[tauri::command]
pub fn pack_set(手: State<'_, 媒体手>, ids: Option<Value>) -> 一份名单 {
    let 格 = 那一列的格();
    /* 原件 1897 行：先长那一格（一家都没有也要有这一格，off.json 才落得下去） */
    if let Err(e) = fs::create_dir_all(&格) {
        return 一份名单::不成(format!("{}{}", 建不出那句, 说错(e)));
    }
    let 落 = 并路(&格, 卸掉那份);
    /* 原件 1899~1902 行：那份名单本来就不在就当删过了（existsSync 那一道），删不动才报那句 */
    let 递的 = match ids {
        None => {
            if 盘上有(&落) {
                if let Err(e) = fs::remove_file(&落) {
                    return 一份名单::不成(format!("{}{}", 名单删不掉那句, 说错(e)));
                }
            }
            收掉后台监听(&手);
            return 一份名单 { ok: true, ids: None, msg: None };
        }
        Some(v) => v,
    };
    let 列 = match &递的 {
        Value::Array(a) => a,
        /* 原件 1903 行：不是列表就这一句回，后头不接任何东西 */
        _ => return 一份名单::不成(不是列表那句.to_string()),
    };
    let 开着 = 开着的名单(列);
    /* 原件 1906 行那一道 try 包的是整颗 packScan()：这一头那颗不抛，扫到几家就是几家 */
    let 全部: Vec<String> = 扫一遍(&格).packs.iter().map(|p| p.id.clone()).collect();
    let 卸 = 换成卸掉(&全部, &开着);
    /* 落盘那一串的形状与缩进照原件 1907 行（JSON.stringify({ off:卸 }, null, 2) + '\n'），与换算老名单那一次同一颗 */
    let 文 = match serde_json::to_string_pretty(&卸掉那一格(&卸)) {
        Ok(v) => v,
        Err(e) => return 一份名单::不成(format!("{}{}", 名单写不进那句, e)),
    };
    if let Err(e) = fs::write(&落, format!("{}\n", 文)) {
        return 一份名单::不成(format!("{}{}", 名单写不进那句, 说错(e)));
    }
    /* 原件 1908 行：写完才查监听那一步，回的是页面递进来的那一串（不是算出来的那几家） */
    收掉后台监听(&手);
    一份名单 { ok: true, ids: Some(开着), msg: None }
}

/* ---------- pack:import（原件 1995~2044 行）与摊包、抄树、留底那几手（1918~1994 行） ---------- */

/// 那一整包的名字册与插件清单（原件 packManifestOf 1918~1925 行：zipIndex 找 manifest.json、unzipEntry 再 JSON.parse）。
/// Err 给的是没挂前缀的那半句 —— 原件这一颗是往外抛，由叫它的两处各自挂「这个包读不动：」（1939 / 2009 行同一前缀）
fn 包里的清单与名册(字节: &[u8]) -> Result<(Vec<crate::fd_core::zip_pack::一条目录>, Value), String> {
    let 目 = 目录(字节)?;
    let 项 = match 目.iter().find(|x| x.名 == 清单那份) {
        Some(v) => v,
        None => return Err(不像插件那句.to_string()),
    };
    let 文 = 取一份(字节, 项)?;
    let 单 = serde_json::from_slice::<Value>(&文).map_err(|e| e.to_string())?;
    Ok((目, 单))
}

/* 抹掉落到一半的那一格（原件 1957 行 rmSync(to, {recursive:true, force:true}) 套一个 catch）：
   有一份坏的不留半截 —— 整格删掉重来，删不成也不往上抛 */
fn 抹掉半截(到: &str) {
    match fs::metadata(到) {
        Ok(相) if 相.is_dir() => { let _ = fs::remove_dir_all(到); }
        Ok(_) => { let _ = fs::remove_file(到); }
        Err(_) => {}
    }
}

/// 把一份 zip 摊成 那一列\<包名>\（原件 expandZipPack 1936~1961 行）：每一先过闸，再落地；
/// 有一份卡住就整格删掉重来，只留「这个包落不成：」那一句。
/// 三条闸（尾斜杠那种条目跳过 / 空路径 / 段里有 .. 与 . 与空段）全在 core 那颗 摊那一条，
/// 落点必须还在这一格里那一道是原件 1950 行自带的第二把，照抄不撤。
fn 摊成一家(格: &str, 字节: &[u8], 目: &[crate::fd_core::zip_pack::一条目录], 名: &str) -> Result<u64, String> {
    let 到 = 并路(格, 名);
    let mut 数 = 0u64;
    for 项 in 目 {
        let 段 = match 摊那一条(&项.名) {
            那一条::跳过 => continue,
            那一条::脏(那句) => return Err(format!("{}{}", 落不成那句, 那句)),
            那一条::落成(v) => v,
        };
        let mut 落 = 到.clone();
        for 一 in &段 {
            落 = 并路(&落, 一);
        }
        if !落.starts_with(&format!("{}\\", 到)) {
            return Err(format!("{}{}", 落不成那句, 脏路径那句(&项.名)));
        }
        let 文 = match 取一份(字节, 项) {
            Ok(v) => v,
            Err(e) => return Err(format!("{}{}", 落不成那句, e)),
        };
        /* 原件 1952 行：先长父那一格再写这一份（子目录里的随行件靠这一手才落得下去） */
        if let Some(父) = Path::new(&落).parent() {
            if !父.as_os_str().is_empty() {
                if let Err(e) = fs::create_dir_all(父) {
                    return Err(format!("{}{}", 落不成那句, 说错(e)));
                }
            }
        }
        if let Err(e) = fs::write(&落, &文) {
            return Err(format!("{}{}", 落不成那句, 说错(e)));
        }
        数 += 1;
    }
    Ok(数)
}

/* 数一格里有哪几份（原件 walkPackDir 1926~1933 行）：打头的点那种名字不算，回的是斜杠拼的相对名。
   原件照读目录回来的序走，这一头排一遍免得每台机器序不同（抄的内容与份数一个字节都不变） */
fn 数一棵树(格: &str, 前: &str, 列: &mut Vec<String>) -> std::io::Result<()> {
    let 走 = if 前.is_empty() { 格.to_string() } else { 并路(格, 前) };
    let mut 名册: Vec<String> = vec![];
    for 项 in fs::read_dir(&走)? {
        let 项 = 项?;
        let 名 = 项.file_name().to_string_lossy().to_string();
        if 名.starts_with('.') {
            continue;
        }
        let 是格 = 项.file_type().map(|t| t.is_dir()).unwrap_or(false);
        名册.push(if 是格 { format!("{}/", 名) } else { 名 });
    }
    名册.sort();
    for 名 in 名册 {
        let r = if 前.is_empty() { 名.clone() } else { format!("{}/{}", 前, 名) };
        if 名.ends_with('/') {
            数一棵树(格, &r.trim_end_matches('/'), 列)?;
        } else {
            列.push(r);
        }
    }
    Ok(())
}

/// 导入一家（原件 pack:import）：页面挑一样东西进来，两种形状都认 ——
/// 一颗 <包名>.zip（别人传给你的成品包，进门就摊成文件夹）与一个解开的文件夹（里面有插件清单）。
/// 落点就是 那一列 那一格，与生成页面那把尺认的同一处；同名已经在那儿了就一句退回，绝不动他原有的包。
#[tauri::command]
pub fn pack_import(payload: Option<Value>) -> 一份导入 {
    let 格 = 那一列的格();
    /* 原件 1999~2001 行：门牌折成绝对 → statSync，读不到就那一句（报的是折过的那一串，不是页面递进来的） */
    let 那串 = 折成绝对(&那份东西(&payload.unwrap_or(Value::Null)), &当前那一格());
    let 相 = match fs::metadata(&那串) {
        Ok(v) => v,
        Err(_) => return 一份导入::不成(format!("{}{}", 读不到那份那句, 那串)),
    };
    /* 原件 2002 行：那一格建不出来就那一句（与写名单那一道同一句原话） */
    if let Err(e) = fs::create_dir_all(&格) {
        return 一份导入::不成(format!("{}{}", 建不出那句, 说错(e)));
    }
    /* 原件 2003~2043 行那一大段 try：两种形状各自干活，任何一手抛了都落最后那一句「导入失败：」 */
    if 相.is_file() {
        /* 自有容器另走一只手（插件分离第 3 批 3.4）：它先过整包检查，不过检一个字节都不落 */
        if 是容器那份(&那串) {
            return 落一份容器(&格, &那串);
        }
        return 落一份压包(&格, &那串);
    }
    if 相.is_dir() {
        return 落一棵文件夹(&格, &那串);
    }
    一份导入::不成(两不象那句.to_string())
}

/// 挑的是文件那一支（原件 2004~2019 行）：只收 .zip → 读整包 → 读插件清单 → 折包名 → 同名让开 → 摊开 → 留底
fn 落一份压包(格: &str, 那串: &str) -> 一份导入 {
    if !是压包那份(那串) {
        return 一份导入::不成(只收压包那句.to_string());
    }
    /* 原件 2006 行那句 readFileSync 在大 try 里，读不动落的是最后那一句「导入失败：」 */
    let 字节 = match fs::read(那串) {
        Ok(v) => v,
        Err(e) => return 一份导入::不成(format!("{}{}", 导入失败那句, 说错(e))),
    };
    let (目, 单) = match 包里的清单与名册(&字节) {
        Ok(v) => v,
        Err(那句) => return 一份导入::不成(format!("{}{}", 包读不动那句, 那句)),
    };
    /* 包名：清单上写了就用那一栏，没写就拿门牌的末段去掉后缀（原件 2010 行），再 trim */
    let 包名 = 清单上的id(&单, &末段去后缀(那串));
    if !包名干净(&包名) {
        return 一份导入::不成(format!("{}{}", 包名不干净那句, 包名));
    }
    /* 原件 2012 行：文件夹与同名 zip 两种都算「这里已经有一份」，一个字节都不碰；
       第 3 批 3.4 起自有容器也算那第三种（一种包在路径里只许有一行） */
    if 盘上有(&并路(格, &包名)) || 盘上有(&并路(格, &format!("{}{}", 包名, 压包后缀)))
        || 盘上有(&并路(格, &format!("{}{}", 包名, crate::fd_core::pack_box::带点后缀))) {
        return 一份导入::不成(已占那句(&包名));
    }
    let 数 = match 摊成一家(格, &字节, &目, &包名) {
        Ok(v) => v,
        /* 这一支之前那半截已经整格删掉（不留半截包） */
        Err(那句) => {
            抹掉半截(&并路(格, &包名));
            return 一份导入::不成(那句);
        }
    };
    一份导入::成了(&包名, 数, 清单上的名字(&单, &包名))
}

/// 挑的是自有容器那一支（插件分离第 3 批 3.4）：先整包检查，不过检一个字节都不落（报不动手）；
/// 成了才两步落地 —— ① 容器本身拷进路径（<包名>.fdpkg，这一份就是这一家的凭据：管理页那一行、
/// 开机后台自检、加载那一下读的都是它的信息段），② 照信息段摊出运行用的那一格（运行那一头吃的还是
/// 文件夹，与收 zip 同一手）。
/// 一条要说清的位置：**带加密块的容器这一版不摊**（明文不许写盘那条硬规矩在 docs\插件容器格式.md 第一节
/// 与 规划第七节；等能解它的那一手进来，装载改走内存，不在这儿先写盘再补收回）。
fn 落一份容器(格: &str, 那串: &str) -> 一份导入 {
    let 字节 = match fs::read(那串) {
        Ok(v) => v,
        Err(e) => return 一份导入::不成(format!("{}{}", 导入失败那句, 说错(e))),
    };
    let 出 = 整包检查(&字节, &crate::version(), 钥匙表);
    /* 那七句各是各的原话，一句都不合并、不改写：装不动的就是这一句 */
    if !出.ok {
        return 一份导入::不成(出.头一句());
    }
    let 信 = match &出.信息 {
        Some(v) => v.clone(),
        None => return 一份导入::不成(出.头一句()),
    };
    if 信.files.iter().any(|份| 份.加密) {
        return 一份导入::不成(crate::fd_core::pack_box::块加密那句.to_string());
    }
    let 清单 = match 取一块(&字节, 清单那份) {
        Some(v) => v,
        None => return 一份导入::不成(没带清单那句.to_string()),
    };
    let 单 = match serde_json::from_slice::<Value>(&清单) {
        Ok(v) => v,
        Err(e) => return 一份导入::不成(format!("{}{}", 清单读不成那句, e)),
    };
    /* 包名只认信息段那一栏（规格那张表：目录名与它必须一样），门牌末段不再当兜底 */
    let 包名 = 信.id.trim().to_string();
    if !包名干净(&包名) {
        return 一份导入::不成(format!("{}{}", 包名不干净那句, 包名));
    }
    let 到 = 并路(格, &包名);
    let 压包位 = format!("{}{}", 到, 压包后缀);
    let 容器位 = format!("{}{}", 到, crate::fd_core::pack_box::带点后缀);
    /* 「这里已经有一份」那一问不许把**正在装的那一颗自己**算成另一套：
       他把 notes.fdpkg 丢进插件路径再点安装，那颗文件本身就在 容器位 上 —— 那一格不在才算没装，
       拿自己当对手就会回一句「已经有一份了」，那条路永远走不通（他 2026-10-17 要的那条正是这一条）。 */
    let 就是它 = Path::new(&容器位) == Path::new(那串);
    if 盘上有(&到) || 盘上有(&压包位) || (!就是它 && 盘上有(&容器位)) {
        return 一份导入::不成(已占那句(&包名));
    }
    /* 运输件不再往这一格里放一份（他 2026-10-17 那条：装好以后这一格里就是解开的文件夹，那颗 fdpkg 自动删除）：
       直接按信息段那张表往 <这一格>\<包名>\ 摊；任何一份落不动就把那一整格抹掉，不留半截包。
       摊这一手与换版那一趟共用同一颗（摊进一格），这一本里不落第二份解包写盘的代码。 */
    let 数 = match 摊进一格(&字节, &出, &信, &到) {
        Ok(n) => n,
        Err(句) => {
            抹掉半截(&到);
            return 一份导入::不成(句);
        }
    };
    /* 摊成了：挑的那一颗本来就丢在插件路径里 → 顺手删掉它（从别处挑的不动，那是他手里那份原件）。
       删不掉不算装失败 —— 那一格已经是新的了。 */
    if Path::new(那串).parent().map(|父| 父 == Path::new(格)).unwrap_or(false) {
        let _ = fs::remove_file(那串);
    }
    一份导入::成了(&包名, 数, 清单上的名字(&单, &包名))
}

/* ---------- 更新那两道（他 2026-10-17 定的形状：新包丢进插件路径 → 进软件提醒一句 → 点一下换进那一格 → 那颗包删掉） ----------
   判"值不值得提醒"那一手在 core::pack_rule::该提醒换 —— **包上那份必须比这一格上的新才提醒**：
   先比号里参与排序那两段（`+build.` 那一截按 semver 规定不参与排序），平手再比清单里 `created` 那一格打包时刻，
   两样都拿不出就不提醒。从前这里只认"号不一样"，而每一家的号都是 `1.0.0-alpha+build.<那一笔>`，
   那一段比不出高低 —— 结果路径里躺着六颗旧包也被当成"等着更新"，点下去是把旧的换进来、等于降级
   （他 2026-10-18 那一句「点下去是降级」）。
   用户写的东西不在这一趟的射程里：插件的数据住 数据\userdata-fd\，这一趟只动 <插件路径>\<包名>\ 那一格。
   换的走法是"先摊到旁边那一格 → 旧的挪开 → 新的挪进 → 旧的删掉"：任何一步砸了都把旧的挪回来，
   那一格任何时刻都是完整的一版，不会出现半新半旧跑起来说不清的状态。 */

/// 壳给每一家留的那张来路条（摊成那一刻写进那一格）：下划线开头 = 算一家不认它，
/// 它也不在容器那张表里、不参与「这一格被改过」那三道核。
const 来路那份: &str = "_装过的.json";

/// 这一格上现在挂的是哪一号、那一份是哪一刻打的（来路条里 `created` 那一格，Unix 秒）。
/// 读不出号回空串 —— 空串不提醒，那是要重装的那一家，不是要换版的那一家；
/// 时刻读不出回空串（这一格装上之前摊的那批没这张条），纯判断那一颗会因此比不出新旧（宁可不提，不许拿旧包换掉好好的一格）。
fn 那一格的号与时刻(格: &str, 包名: &str) -> (String, String) {
    let 家 = 并路(格, 包名);
    let 号 = match fs::read_to_string(并路(&家, 清单那份)) {
        Ok(文) => match serde_json::from_str::<Value>(&文) {
            Ok(单) => 单.get("version").and_then(|v| v.as_str()).unwrap_or("").trim().to_string(),
            Err(_) => String::new(),
        },
        Err(_) => String::new(),
    };
    let 秒 = fs::read_to_string(并路(&家, 来路那份)).ok()
        .and_then(|文| serde_json::from_str::<Value>(&文).ok())
        .map(|单| 清单上的一刻(&单)).unwrap_or_default();
    (号, 秒)
}

/// 读一张 JSON 里那格 `created`（Unix 秒）。写成数或写成串都认；没有、读不出回空串。
pub(crate) fn 清单上的一刻(单: &Value) -> String {
    match 单.get("created") {
        Some(v) => match (v.as_u64(), v.as_str()) {
            (Some(秒), _) => 秒.to_string(),
            (None, Some(串)) => 串.trim().to_string(),
            _ => String::new(),
        },
        None => String::new(),
    }
}

/// 插件路径里躺着的那几颗运输件：（包名, 那颗的路径, 包上的号, 包上那一格打包时刻, 那份插件清单）。
/// 不过检的一颗先摘掉（坏包不配提醒），信息段那一名与文件名对不上也不列（规格那张表：目录名必须与信息段一样）。
/// 同一家还剩两颗（新的丢进来、旧的忘了删）留哪一颗交给纯判断那一颗（一家留最新一颗：认文件时间，不认名字、也不比号）。
fn 躺着的那几颗(格: &str) -> Vec<(String, String, String, String, Value)> {
    let 目 = match fs::read_dir(格) {
        Ok(v) => v,
        Err(_) => return vec![],
    };
    let mut 候选: Vec<(String, u64, String, String, String, Value)> = vec![];   /* 原名 · 毫秒 · 路径 · 号 · 打的时刻 · 清单 */
    for 项 in 目.filter_map(|x| x.ok()) {
        let 名 = 项.file_name().to_string_lossy().to_string();
        if 容器成名(&名).is_none() {
            continue;
        }
        let 那串 = 并路(格, &名);
        let 字节 = match fs::read(&那串) { Ok(v) => v, Err(_) => continue };
        let 检 = 整包检查(&字节, &crate::version(), 钥匙表);
        if !检.ok { continue; }
        let 信 = match &检.信息 { Some(v) => v.clone(), None => continue };
        let 包名 = match 容器成名(&名) { Some(v) => v.to_string(), None => continue };
        if 信.id.trim() != 包名 || 信.files.iter().any(|份| 份.加密) { continue; }
        let 单 = match 取一块(&字节, 清单那份) {
            Some(文) => serde_json::from_slice::<Value>(&文).unwrap_or(Value::Null),
            None => Value::Null,
        };
        let 毫 = 项.metadata().ok().and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64).unwrap_or(0);
        /* 打包时刻读信息段那一份（created，Unix 秒；这一格装上之前出的旧包没写，回空串） */
        候选.push((名, 毫, 那串, 信.version.trim().to_string(),
                   if 信.created > 0 { 信.created.to_string() } else { String::new() }, 单));
    }
    let 选 = 一家留最新一颗(&候选.iter().map(|(名, 毫, ..)| (名.clone(), *毫)).collect::<Vec<_>>());
    let mut 出列: Vec<(String, String, String, String, Value)> = vec![];
    for 名 in 选 {
        if let Some((_, _, 那串, 号, 刻, 单)) = 候选.iter().find(|(那一名, ..)| 那一名 == &名) {
            出列.push((容器成名(&名).unwrap_or("").to_string(), 那串.clone(), 号.clone(), 刻.clone(), 单.clone()));
        }
    }
    出列
}

#[derive(Serialize)]
pub struct 一条换版 {
    id: String,
    name: String,
    from: String,
    to: String,
    file: String,
}

#[derive(Serialize)]
pub struct 一份换版列 {
    ok: bool,
    list: Vec<一条换版>,
}

/// pack:updates —— 哪几颗**比这一格上的新**（管理页那一行与开机那一句提醒都读这一份）
#[tauri::command]
pub fn pack_updates() -> 一份换版列 {
    let 格 = 那一列的格();
    let 列: Vec<一条换版> = 躺着的那几颗(&格).into_iter().filter_map(|(包名, 那串, 号, 打的刻, 单)| {
        let 那一格 = 并路(&格, &包名);
        /* 那一格不在 = 这一家还没装：那是"装"的那一路（开机自己会摊），不算换版提醒 */
        if !盘上有(&那一格) { return None; }
        let (现在, 现在的一刻) = 那一格的号与时刻(&格, &包名);
        if !该提醒换(&现在, &号, &现在的一刻, &打的刻) { return None; }
        Some(一条换版 { id: 包名.clone(), name: 清单上的名字(&单, &包名), from: 现在, to: 号, file: 那串 })
    }).collect();
    一份换版列 { ok: true, list: 列 }
}

/// 把一颗容器里的每一份按信息段那张表写进 到 那一格（不碰别的、不删别的）；砸了回那句原话，收摊交调用方
fn 摊进一格(字节: &[u8], 检: &一份检查, 信: &一张信息, 到: &str) -> Result<u64, String> {
    let mut 数 = 0u64;
    for (位, 份) in 检.块.iter().zip(信.files.iter()) {
        let 文 = match 字节.get(位.数据起点..位.数据起点.saturating_add(位.长度)) {
            Some(v) => v,
            None => return Err(crate::fd_core::pack_box::块短了那句.to_string()),
        };
        let mut 落 = 到.to_string();
        for 一 in 拆成段(&份.路径) {
            落 = 并路(&落, 一);
        }
        if 落 != 到 && !落.starts_with(&format!("{}\\", 到)) {
            return Err(脏路径那句(&份.路径));
        }
        if let Some(父) = Path::new(&落).parent() {
            if !父.as_os_str().is_empty() {
                if let Err(e) = fs::create_dir_all(父) {
                    return Err(format!("{}{}", 落不成那句, 说错(e)));
                }
            }
        }
        if let Err(e) = fs::write(&落, 文) {
            return Err(format!("{}{}", 落不成那句, 说错(e)));
        }
        数 += 1;
    }
    /* 摊成了，给这一格留一张来路条（壳自己那本账，不是插件的文件）：下划线开头 = 列一家时不认它，
       它也不在容器那张表里、不参与「这一格被改过」那三道核。
       为什么非留不可：号里 `+build.` 那一截按 semver 不比高低，比不出新旧时只剩"这一格是哪一刻摊出来的、
       摊的是哪一刻打的那一颗"这一条凭据 —— 没有它，路径里躺着一颗旧包也会被当成"等着更新"，点下去是降级
       （他 2026-10-18 那一句）。写砸了不影响这一格已经摊好的那些文件，所以只当没留成。 */
    if let Ok(刻) = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        let 条 = serde_json::json!({
            "id": 信.id, "version": 信.version, "created": 信.created, "摊于": 刻.as_secs()
        });
        let _ = fs::write(并路(到, 来路那份), 条.to_string());
    }
    Ok(数)
}

/// pack:update { id } —— 点一下把那一颗换进已经在那一格里的那一家，换完把那颗包删掉
#[tauri::command]
pub fn pack_update(id: Option<String>) -> 一份导入 {
    let 格 = 那一列的格();
    let 包名 = match id { Some(v) => v.trim().to_string(), None => String::new() };
    if !包名干净(&包名) {
        return 一份导入::不成(format!("{}{}", 包名不干净那句, 包名));
    }
    let 那一格 = 并路(&格, &包名);
    if !盘上有(&那一格) {
        return 一份导入::不成(format!("「{}」这一格里此刻是空的 —— 那颗包直接丢进这一格、重启一次就是装它", 包名));
    }
    let 那串 = match 躺着的那几颗(&格).into_iter().find(|(名, _, _, _, _)| *名 == 包名) {
        Some((_, 路径, _, _, _)) => 路径,
        None => return 一份导入::不成(format!("这一格里没有「{}」那颗新包 —— 把那颗 {} 丢进这一格再点", 包名, 带点后缀)),
    };
    let 字节 = match fs::read(&那串) { Ok(v) => v, Err(e) => return 一份导入::不成(format!("{}{}", 导入失败那句, 说错(e))) };
    let 检 = 整包检查(&字节, &crate::version(), 钥匙表);
    if !检.ok {
        return 一份导入::不成(检.头一句());
    }
    let 信 = match &检.信息 { Some(v) => v.clone(), None => return 一份导入::不成(检.头一句()) };
    if 信.files.iter().any(|份| 份.加密) {
        return 一份导入::不成(crate::fd_core::pack_box::块加密那句.to_string());
    }
    let 单 = match 取一块(&字节, 清单那份) {
        Some(文) => match serde_json::from_slice::<Value>(&文) { Ok(v) => v, Err(e) => return 一份导入::不成(format!("{}{}", 清单读不成那句, e)) },
        None => return 一份导入::不成(没带清单那句.to_string()),
    };
    /* 一、先整份摊到旁边那一格临时名（下划线开头那一格 算一家 不认，半路不会被列成一家） */
    let 临时 = 并路(&格, &换进来名(&包名));
    let 数 = match 摊进一格(&字节, &检, &信, &临时) {
        Ok(n) => n,
        Err(句) => {
            抹掉半截(&临时);
            return 一份导入::不成(句);
        }
    };
    /* 二、旧的挪开、新的挪进；挪进砸了就把旧的挪回来（这一格始终是完整的一版） */
    let 旧的 = 并路(&格, &换下去名(&包名));
    let _ = fs::remove_dir_all(&旧的);
    if let Err(e) = fs::rename(&那一格, &旧的) {
        抹掉半截(&临时);
        return 一份导入::不成(format!("旧的那一格挪不开：{}", 说错(e)));
    }
    if let Err(e) = fs::rename(&临时, &那一格) {
        let _ = fs::rename(&旧的, &那一格);
        抹掉半截(&临时);
        return 一份导入::不成(format!("新的那一格挪不进：{}", 说错(e)));
    }
    /* 三、换下来的那份不留（他 2026-10-17 那条：旧版本不备份，想用旧版就装旧版再把数据导回去）；
       那颗运输件也删掉 —— 这一格里最后只剩解开的这一份 */
    let _ = fs::remove_dir_all(&旧的);
    let _ = fs::remove_file(&那串);
    一份导入::成了(&包名, 数, 清单上的名字(&单, &包名))
}

/// 挑的是文件夹那一支（原件 2020~2041 行）：先认插件清单 → 折包名 → 同名让开 → 一份一份抄（脏路径那一道照原件）
fn 落一棵文件夹(格: &str, 那串: &str) -> 一份导入 {
    let 清单 = 并路(那串, 清单那份);
    if !盘上有(&清单) {
        return 一份导入::不成(格没带清单那句.to_string());
    }
    /* 读不成与解析不成挂同一句前缀（原件那两手在同一个 try 里，2024~2025 行） */
    let 文 = match fs::read_to_string(&清单) {
        Ok(v) => v,
        Err(e) => return 一份导入::不成(format!("{}{}", 清单读不成那句, 说错(e))),
    };
    let 单 = match serde_json::from_str::<Value>(&文) {
        Ok(v) => v,
        Err(e) => return 一份导入::不成(format!("{}{}", 清单读不成那句, e)),
    };
    let 包名 = 清单上的id(&单, &末段(那串));
    if !包名干净(&包名) {
        return 一份导入::不成(format!("{}{}", 包名不干净那句, 包名));
    }
    let 到 = 并路(格, &包名);
    if 盘上有(&到) || 盘上有(&format!("{}{}", 到, 压包后缀))
        || 盘上有(&format!("{}{}", 到, crate::fd_core::pack_box::带点后缀)) {
        return 一份导入::不成(已占那句(&包名));
    }
    let mut 列: Vec<String> = vec![];
    if let Err(e) = 数一棵树(那串, "", &mut 列) {
        return 一份导入::不成(format!("{}{}", 导入失败那句, 说错(e)));
    }
    for 相对 in &列 {
        let mut 落 = 到.clone();
        for 段 in 拆成段(相对) {
            落 = 并路(&落, 段);
        }
        /* 原件 2034 行那一道：这一支的 rel 是自己一格一格数出来的，段里本来就不会有 .. ，照抄不撤 */
        if 落 != 到 && !落.starts_with(&format!("{}\\", 到)) {
            return 一份导入::不成(脏路径那句(相对));
        }
        let 起 = {
            let mut 累 = 那串.to_string();
            for 段 in 拆成段(相对) {
                累 = 并路(&累, 段);
            }
            累
        };
        /* 原件这一段没留半截就退：抄到第几份就是第几份（照旧，不自作主张整格删） */
        if let Some(父) = Path::new(&落).parent() {
            if !父.as_os_str().is_empty() {
                if let Err(e) = fs::create_dir_all(父) {
                    return 一份导入::不成(format!("{}{}", 导入失败那句, 说错(e)));
                }
            }
        }
        if let Err(e) = fs::copy(&起, &落) {
            return 一份导入::不成(format!("{}{}", 导入失败那句, 说错(e)));
        }
    }
    一份导入::成了(&包名, 列.len() as u64, 清单上的名字(&单, &包名))
}

/* ---------- pack:wipe：卸一家时勾了「同步清除数据」那两处（原件 2052~2072 行） ----------
   删的就两摊，一格都不许多删：
     · files 点名的那些：按 用户数据那一格（原件 dataPath = DATA_DIR() = data\userdata-<哪一棵>）算落点，
       跑出用户目录的一律不动（原件那一句 catch 就是 continue），抹成了才进 removed，
       报的是页面递进来的那一串原文（原件 del.push(String(rel))，首尾空白都不去）；
     · shared 点名的那些：按 数据层根（<树根>\data）算落点，段里带 .. / . / 空段一律不动，
       根本体与根以外一律不动，插件那一格（包与 off.json 都在里面）永远留着 —— 装得回来靠的就是包还在；
       进了 removed 的是折过的那一串（反斜杠折成斜杠、打头斜杠去掉）。
   这一颗不写备份、不落字条、不动浏览器存储、不碰包本身，也不像 data:wipe 那样只排一张字条。 */

/* 盘上有就抹掉，抹成了才记进回执（原件 2058 / 2069 行那两个 try：抹不动一句都不报、也不进 removed 那一串）。
   rmSync(recursive:true, force:true) 那一手：格整棵抹、份抹一份、本来不在不算错 */
fn 抹那一份(落: &str, 报的那一串: &str, 抹了: &mut Vec<String>) {
    let 相 = match fs::metadata(落) {
        Ok(v) => v,
        Err(_) => return,
    };
    let 成 = if 相.is_dir() { fs::remove_dir_all(落) } else { fs::remove_file(落) };
    if 成.is_ok() {
        抹了.push(报的那一串.to_string());
    }
}

/// 卸一家时勾了「同步清除数据」（原件 pack:wipe）：回 { ok:true, removed } —— 永远 ok:true，
/// 两家递进来的都不是列表也照样这一格（原件那两把 Array.isArray 就是按空的一串办）
#[tauri::command]
pub fn pack_wipe(files: Option<Value>, shared: Option<Value>) -> 一份清理 {
    let 用户格 = crate::tauri_bind::pick_cmds::数据格().to_string_lossy().to_string();
    let 根 = crate::tauri_bind::data_cmds::数据层格().to_string_lossy().to_string();
    let 包格 = 那一列的格();
    let mut 抹了: Vec<String> = vec![];
    for 一 in 按名单收(files.as_ref()) {
        let 递的 = 递的那串(一);
        /* 原件 2055 行：整串只剩空白的一颗都不动 */
        if 递的.trim().is_empty() {
            continue;
        }
        /* 原件 2057 行 dataPath 抛了就是 continue —— 判断朝 fd_core::data_path::落格 借，这一层不自己判 */
        if let Some(落) = 落格(&用户格, &递的) {
            抹那一份(&落, &递的, &mut 抹了);
        }
    }
    for 一 in 按名单收(shared.as_ref()) {
        /* 洗法与 packRaw 那一路是同一颗（原件 2063~2064 行那两把尺一字不差）：段里有 .. / . / 空段就整串不动 */
        let 净 = match 洗那串(&递的那串(一)) {
            Some(v) => v,
            None => continue,
        };
        let mut 落 = 根.clone();
        for 段 in 拆成段(&净) {
            落 = 并路(&落, 段);
        }
        /* 原件 2067 行：数据层根以外不动（根本体自己也算以外） */
        if !在根以内(&落, &根) {
            continue;
        }
        /* 原件 2068 行：包和名单永远留着 */
        if 包那一格留着(&落, &包格) {
            continue;
        }
        抹那一份(&落, &净, &mut 抹了);
    }
    一份清理 { ok: true, removed: 抹了 }
}

/* 这一层只准用 core 那把尺：两趟收的判断、那两份名单的读法、开着的怎么换成卸掉的、导入那一条的门牌与那十句白话、
   清那两处该留哪几格、24MB 那道闸 —— 全在 fd_core::pack_rule；解包那一颗用的是共用的 fd_core::zip_pack，
   「装没装音乐遥控器」那一问朝 media_cmds 借 —— 这一本里一个字都没重写。
   这一层五颗都不抛给页面（返回的类型都不是 Result），跟 comp_cmds 那一摊同一口径。 */

#[cfg(test)]
mod 临时落盘验 {
    use super::*;
    fn 字节() -> Vec<u8> {
        include_str!("../../../tools/probes/件-容器.hex").trim().as_bytes()
            .chunks(2).map(|双| u8::from_str_radix(std::str::from_utf8(双).unwrap(), 16).unwrap()).collect()
    }
    fn 沙盒(名: &str) -> std::path::PathBuf {
        /* 每颗自己一格：cargo 是多线程跑的，同一进程号撞在同一格上会互相删来删去 */
        let 到 = std::env::temp_dir().join(format!("fd-包沙盒-{}-{}", 名, std::process::id()));
        let _ = fs::remove_dir_all(&到);
        fs::create_dir_all(&到).unwrap();
        到
    }
    #[test]
    fn 装一份容器进沙盒_成了再装就让开() {
        let 沙 = 沙盒("成");
        /* 原件放在沙盒**外面**那一格：这一颗验的是"从别处挑"那一路 —— 手里那一份不该被删 */
        let 外 = std::env::temp_dir().join(format!("fd-包原件-{}", std::process::id()));
        let _ = fs::remove_dir_all(&外);
        fs::create_dir_all(&外).unwrap();
        let 源名 = format!("从别处挑的.{}", crate::fd_core::pack_box::扩展名);
        let 源 = 外.join(源名);
        fs::write(&源, 字节()).unwrap();
        let 沙串 = 沙.to_string_lossy().to_string();
        let 回 = serde_json::to_value(落一份容器(&沙串, &源.to_string_lossy())).unwrap();
        assert_eq!(回["ok"], true, "{:?}", 回);
        assert_eq!(回["id"], "notes");
        assert_eq!(回["files"], 3);
        for 份 in ["main.js", "manifest.json", "box-kernel.js"] {
            assert!(沙.join("notes").join(份).exists(), "摊开那一格里少了 {}", 份);
        }
        /* 运输件不再跟着进这一格（他 2026-10-17 那条：装好以后 plugins 里就是解开的文件夹，那颗 fdpkg 自动删除） */
        assert!(!沙.join(format!("notes.{}", crate::fd_core::pack_box::扩展名)).exists(),
            "路径里多出一份运输件 —— 那一格里只许留解开的那一份");
        /* 从别处挑的原件不动（那是他手里那一份，删它没道理） */
        assert!(源.exists(), "从别处挑的那一颗被删了");
        /* 同一颗再走一遍：那一格已经在了，算「这里已经有一份」，一个字节都不许多动 */
        let 前 = fs::read(沙.join("notes").join("main.js")).unwrap();
        let 回2 = serde_json::to_value(落一份容器(&沙串, &源.to_string_lossy())).unwrap();
        assert_eq!(回2["ok"], false, "{:?}", 回2);
        assert_eq!(fs::read(沙.join("notes").join("main.js")).unwrap(), 前, "已占那一句不许先动了再拒");
        /* 扫一遍：文件夹赢同名容器，notes 只列一行，且那一行是 dir 那一支 */
        let 扫 = serde_json::to_value(扫一遍(&沙串)).unwrap();
        let 行: Vec<&str> = 扫["packs"].as_array().unwrap().iter()
            .filter(|p| p["id"] == "notes").map(|p| p["kind"].as_str().unwrap()).collect();
        assert_eq!(行, vec!["dir"], "{:?}", 扫["packs"]);
        let _ = fs::remove_dir_all(&外);
        let _ = fs::remove_dir_all(&沙);  /* 清不干净不算这一颗失败：Windows 上刚写的文件可能被索引器短暂占着 */
    }

    /* 丢进这一格再点安装：摊成了，那颗包就地删掉（同一格里不留两份真身） */
    /* 出货那一格里那颗的名字带着号（`notes-1.0.0-alpha+build.x.fdpkg`，他 2026-10-17 要的那一种摆法）：
       丢进插件路径以后还得认得回这一家 —— 折名字那一手在 core::pack_rule::容器成名，这里验的是它真被走到。 */
    #[test]
    fn 名字带着号的那一颗也认得回这一家() {
        let 沙 = 沙盒("带号的名字");
        let 沙串 = 沙.to_string_lossy().to_string();
        fs::write(沙.join(format!("notes-1.0.0-alpha+build.deadbeef.{}", crate::fd_core::pack_box::扩展名)), 字节()).unwrap();
        let 扫 = serde_json::to_value(扫一遍(&沙串)).unwrap();
        let 行: Vec<(&str, &str)> = 扫["packs"].as_array().unwrap().iter()
            .map(|p| (p["id"].as_str().unwrap_or("?"), p["kind"].as_str().unwrap_or("?"))).collect();
        assert_eq!(行, vec![("notes", "dir")], "那一颗要折回 notes 这一家、摊成文件夹那一行：{:?}", 扫["packs"]);
        assert!(沙.join("notes").join("manifest.json").exists(), "带着号的名字没摊出那一格");
        let _ = fs::remove_dir_all(&沙);
    }

    #[test]
    fn 挑的那颗就在路径里_摊成了把它删掉() {
        let 沙 = 沙盒("就地删");
        let 沙串 = 沙.to_string_lossy().to_string();
        let 那颗 = 沙.join(format!("notes.{}", crate::fd_core::pack_box::扩展名));
        fs::write(&那颗, 字节()).unwrap();
        let 回 = serde_json::to_value(落一份容器(&沙串, &那颗.to_string_lossy())).unwrap();
        assert_eq!(回["ok"], true, "{:?}", 回);
        assert!(沙.join("notes").join("manifest.json").exists(), "那一格没摊出来");
        assert!(!那颗.exists(), "摊成了那颗运输件还留着");
        let _ = fs::remove_dir_all(&沙);
    }

    /* 他 2026-10-16 装空壳那一次量到的那一件：说明上写着「把那颗包丢进 data\plugins\，重启一次就认」，
       可扫这一趟从前只列名不摊，页面那一头两种运输形状都不当运行形状使 —— 丢进去的那一颗永远加载不上。 */
    #[test]
    fn 开机把丢进来的容器摊成那一格_不过检的一字节不落() {
        let 沙 = 沙盒("开机摊");
        let 沙串 = 沙.to_string_lossy().to_string();
        fs::write(沙.join(format!("notes.{}", crate::fd_core::pack_box::扩展名)), 字节()).unwrap();
        let 扫 = serde_json::to_value(扫一遍(&沙串)).unwrap();
        let 行: Vec<&str> = 扫["packs"].as_array().unwrap().iter()
            .filter(|p| p["id"] == "notes").map(|p| p["kind"].as_str().unwrap()).collect();
        assert_eq!(行, vec!["dir"], "丢进来的那一颗要摊成那一格、并按文件夹那一行报出去：{:?}", 扫["packs"]);
        for 份 in ["main.js", "manifest.json", "box-kernel.js"] {
            assert!(沙.join("notes").join(份).exists(), "摊开那一格里少了 {}", 份);
        }
        /* 摊成了就把那颗运输件删掉：这一格里最后只留解开的那一份（他 2026-10-17 那条「fdpkg 自动删除」） */
        assert!(!沙.join(format!("notes.{}", crate::fd_core::pack_box::扩展名)).exists(),
            "开机摊成了，那颗包还留在路径里");
        let 前 = fs::read(沙.join("notes").join("main.js")).unwrap();
        let _ = 扫一遍(&沙串);
        assert_eq!(fs::read(沙.join("notes").join("main.js")).unwrap(), 前, "那一格已在就不许再动它");
        /* 改一个字节的那一颗：整包检查不过 → 一个字节不落，那一行带着那一句原话进管理页 */
        let 字 = 字节();
        let mut 坏 = 字.clone();
        let 数据起 = 12 + u32::from_be_bytes([字[8], 字[9], 字[10], 字[11]]) as usize + 6;
        坏[数据起] ^= 0xff;
        fs::write(沙.join(format!("notes2.{}", crate::fd_core::pack_box::扩展名)), &坏).unwrap();
        let 二 = serde_json::to_value(扫一遍(&沙串)).unwrap();
        assert!(!沙.join("notes2").exists(), "不过检的那一颗不许摊出格来");
        let 那 = 二["packs"].as_array().unwrap().iter()
            .find(|p| p["id"] == "notes2")
            .expect("不过检的那一颗也要列出来，好把原话说给用户");
        assert_eq!(那["kind"].as_str().unwrap(), "box", "{:?}", 那);
        assert!(那["error"].as_str().unwrap().contains("对不上号"), "{:?}", 那);
        let _ = fs::remove_dir_all(&沙);  /* 清不干净不算这一颗失败：Windows 上刚写的文件可能被索引器短暂占着 */
    }

    #[test]
    fn 坏一个字节就报不动手_路径里什么都没多() {
        let 沙 = 沙盒("坏");
        let 字 = 字节();
        let mut 坏 = 字.clone();
        let 数据起 = 12 + u32::from_be_bytes([字[8], 字[9], 字[10], 字[11]]) as usize + 6;
        坏[数据起] ^= 0xff;
        let 源 = 沙.join(format!("坏了一份.{}", crate::fd_core::pack_box::扩展名));
        fs::write(&源, &坏).unwrap();
        let 回 = serde_json::to_value(落一份容器(&沙.to_string_lossy(), &源.to_string_lossy())).unwrap();
        assert_eq!(回["ok"], false);
        assert!(回["msg"].as_str().unwrap().contains("对不上号"), "{:?}", 回);
        assert!(!沙.join("notes").exists(), "不过检的那一份不许摊出格来");
        assert!(!沙.join(format!("notes.{}", crate::fd_core::pack_box::扩展名)).exists(), "不过检的那一份不许进路径");
        let _ = fs::remove_dir_all(&沙);  /* 清不干净不算这一颗失败：Windows 上刚写的文件可能被索引器短暂占着 */
    }

    #[test]
    fn 要求的主程序比这台高也是报不动手() {
        let 沙 = 沙盒("高");
        let 字 = 字节();
        let 信长 = u32::from_be_bytes([字[8], 字[9], 字[10], 字[11]]) as usize;
        let 文 = String::from_utf8(字[12..12 + 信长].to_vec()).unwrap();
        let 换 = 文.replace("\"min_shell\":\"1.0.0\"", "\"min_shell\":\"99.0.0\"");
        /* 信息段换了字就换了长度，文件头那四枚要跟着改 —— 不改就是造一份坏包，不是造一份要求高的包 */
        let 头 = (换.len() as u32).to_be_bytes();
        let mut 一 = Vec::new();
        一.extend_from_slice(&字[0..8]);
        一.extend_from_slice(&头);
        一.extend_from_slice(换.as_bytes());
        一.extend_from_slice(&字[12 + 信长..]);
        let 源 = 沙.join(format!("要得高.{}", crate::fd_core::pack_box::扩展名));
        fs::write(&源, &一).unwrap();
        let 回 = serde_json::to_value(落一份容器(&沙.to_string_lossy(), &源.to_string_lossy())).unwrap();
        assert_eq!(回["ok"], false);
        assert!(回["msg"].as_str().unwrap().contains("先更新主程序再加载它"), "{:?}", 回);
        assert!(!沙.join("notes").exists(), "要求版本高也不许先摊开再说");
        let _ = fs::remove_dir_all(&沙);  /* 清不干净不算这一颗失败：Windows 上刚写的文件可能被索引器短暂占着 */
    }

    /* 把容器与摊开那一格一起摆进沙盒（装那一手干的事；这里只摆料，不测那一手） */
    fn 摆进沙盒(到: &std::path::Path, 字: &[u8]) {
        fs::write(到.join(format!("notes.{}", crate::fd_core::pack_box::扩展名)), 字).unwrap();
        let 信 = crate::fd_core::pack_box::读信息(字).unwrap();
        for 份 in 信.files.iter() {
            let 落 = 到.join("notes").join(&份.路径);
            if let Some(父) = 落.parent() { let _ = fs::create_dir_all(父); }
            fs::write(&落, 取一块(字, &份.路径).unwrap()).unwrap();
        }
    }

    #[test]
    fn 运行时读到一份_与包上对不上就指得出_没容器就不管() {
        let 到 = 沙盒("读");
        let 字 = 字节();
        摆进沙盒(&到, &字);
        let 沙串 = 到.to_string_lossy().to_string();
        assert_eq!(读过那一份(&沙串, "notes", "main.js", &取一块(&字, "main.js").unwrap()), None, "原样那一份没得说，内容照旧递");
        let 那句 = 读过那一份(&沙串, "notes", "main.js", "heLlo".as_bytes());
        assert!(那句.is_some() && 那句.unwrap().contains("main.js"), "运行时撞到不符要指得出是哪一份");
        assert_eq!(读过那一份(&沙串, "notes", "别人家的.txt", b"x"), None, "包上没写着的那一份，这张表不管");
        let 别处 = 沙盒("无容器");
        assert_eq!(读过那一份(&别处.to_string_lossy(), "notes", "main.js", b"hello"), None, "没那份容器 = 没得核");
        let _ = fs::remove_dir_all(&到);
        let _ = fs::remove_dir_all(&别处);
    }
}
