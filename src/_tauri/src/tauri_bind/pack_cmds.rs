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
    压包读不动那句, 同名那格已占, 太大那句, 在根以内, 拆成段, 格没带清单那句, 文件夹那种, 分成两趟, 卸掉监听那句,
    卸掉那一格, 卸掉那份, 读不到那份那句, 建不出那句, 记为卸掉, 折成绝对, 老单成列, 老的那份, 洗那串,
    开单成列, 开着的名单, 末段去后缀, 末段, 盘上, 摊那一条, 按名单收, 那份东西, 脏路径那句,
    落不成那句, 清单那份, 清单上的id, 清单上的名字, 清单读不成那句, 没带清单那句, 该看的名, 换成卸掉,
    递的那串, 读不出文本那句, 导入失败那句, 那一条, 已占那句, 是压包那份, 两不象那句,
    不是列表那句, 名单删不掉那句, 名单写不进那句, 封顶字节,
};
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
fn 摊开一家(格: &str, 名: &str, 种: &'static str) -> Option<一个包> {
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
    /* zip 那一支：先按 <包名>.zip 读到字节（原件读不到回 null，不是报错） */
    let 节 = match fs::read(并路(格, &format!("{}{}", 名, 压包后缀))) {
        Ok(v) => v,
        Err(_) => return None,
    };
    match 压包里的清单(&节) {
        Ok(mut 单) => {
            let 挡 = crate::fd_core::perm_rule::挡下该挡的(&mut 单);
            Some(一个包 { id: 名.to_string(), kind: 种, manifest: Some(单), files: None, error: None, 挡下的: 挡 })
        }
        Err(那句) => Some(一个包::读不成(名, 种, 那句)),
    }
}

/* ---------- packScan：扫一遍那一列（原件 1797~1839 行） ---------- */

/// 两趟收：文件夹那一趟先走、压缩包那一趟后走，同名让开判断与「只有真列出来的才算占上」
/// 全在 core（分成两趟 / 同名那格已占 / 记为卸掉），这一颗只负责问盘、摊开、落那两份名单。
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
    let (文件夹那一批, 压包那一批) = 分成两趟(&名册);
    let mut 列: Vec<一个包> = vec![];
    let mut 扫到: Vec<String> = vec![];
    for 名 in &文件夹那一批 {
        if let Some(包) = 摊开一家(格, 名, 文件夹那种) {
            列.push(包);
            扫到.push(名.clone());
        }
    }
    for 包名 in &压包那一批 {
        /* 文件夹赢同名 zip（原件 if(seen.has(id)) continue）；seen 只记真列进这一列的那几家 */
        if 同名那格已占(&扫到, 包名) {
            continue;
        }
        if let Some(包) = 摊开一家(格, 包名, 压包那种) {
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
    /* 原件 2012 行：文件夹与同名 zip 两种都算「这里已经有一份」，一个字节都不碰 */
    if 盘上有(&并路(格, &包名)) || 盘上有(&并路(格, &format!("{}{}", 包名, 压包后缀))) {
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
    if 盘上有(&到) || 盘上有(&format!("{}{}", 到, 压包后缀)) {
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
