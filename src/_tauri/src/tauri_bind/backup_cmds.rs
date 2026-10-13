/* 四层里的第三层 · 定期备份那四颗（外46 三 批二 · 搬 main.cjs 612 / 614 / 616 / 618 与 backup.cjs 的动手那半）
   ------------------------------------------------------------
   Electron 那边抄这件事整个住在 src\pack\backup.cjs 里，那一颗把 fs / path / now 从外面递进去；
   壳这一头没有 Node，所以那份拆成两半：只看字符串就能定的（名字、时刻、到点、落点该不该停、该收哪几颗）
   全落进 fd_core::backup_rule，走树、抄字节、改名、收旧份这一手住在这里。
   回给页面的形状一格都不动（字段名跟着那一头用中文，一个都没换）：
     · backup:run 成了回 { ok, msg, 目录, 抄, 字, 坏, 数, 错, 收 }，
       停下来的那几种回 { ok:false, msg }（没定落点、跑在被抄的那几处里面、一处都没读到）
       或带 错 / 数 / 坏 / 目录 的那几种，照 backup.cjs 的 run 每一支一模一样；
       只有「长不出草稿那一格」这一支照那一头抛出去（页面那一头 backupRun 的 catch 会拼成
       { ok:false, msg:'备份没走通：…' }，跟 Electron 完全同一条路）；
     · backup:last 回的是那一串时间戳名字，没抄过、读不到都回空串；
     · backup:check 回 { 上回, 上回时, 到点, 下一回 } 四格；
     · backup:roots 回 [{ label, dir }] 那一串候选。
   落点这一头的口径（他 2026-10-11 定死的那一条）：存放目录由页面传进来，壳只按给定路径干活；
   这一棵里的位置登记在不进仓的那一颗 .cjs 里，Rust 读不到它，所以壳不自己去认「该备份到哪儿」。
   多出来的一道闸是落点不许跑进这一棵树里（Electron 那边没有）—— 备份写进仓就等于把用户数据
   塞回代码那一棵树，下一趟更新包与公开面扫描都得跟着倒霉。判断在纯那一格、带测试。 */
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::fd_core::backup_rule as 定;

/* ---------- 回给页面的那几格 ---------- */

/// backup:roots 与页面上那一串候选：{ label, dir }
#[derive(Serialize)]
pub struct 一处根 {
    label: String,
    dir: String,
}

/// 收旧份那一趟的账（照 backup.cjs 的 prune 回的那一格）
#[derive(Serialize)]
pub struct 一份收 {
    删: Vec<String>,
    留: Vec<String>,
    半: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    错: Option<String>,
}

/// backup:run 的回执：哪一格在该出现的时候没出现，就别硬塞（skip_serializing_if 那一手照 data_cmds 同规矩）
#[derive(Serialize)]
pub struct 一份抄账 {
    ok: bool,
    msg: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    目录: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    抄: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    字: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    坏: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    数: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    错: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    收: Option<一份收>,
}

/// backup:check 回的那四格
#[derive(Serialize)]
pub struct 一份到点 {
    上回: String,
    上回时: i64,
    到点: bool,
    下一回: i64,
}

/* ---------- 页面递进来的那几栏：照 String(x || '') 那一手认假值 ---------- */

fn 是假(v: &Value) -> bool {
    match v {
        Value::Null => true,
        Value::Bool(b) => !b,
        Value::String(s) => s.is_empty(),
        Value::Number(n) => n.as_f64().map(|f| f == 0.0 || f.is_nan()).unwrap_or(true),
        _ => false,
    }
}

/// 拿一格当字串（那一头是 String((x && x.key) || '')：没给、null、false、0、空串都算空）
fn 栏文(单: &Value, 名: &str) -> String {
    match 单.get(名) {
        Some(v) if !是假(v) => match v {
            Value::String(s) => s.clone(),
            它 => 它.to_string(),
        },
        _ => String::new(),
    }
}

/// 拿一格当真假（那一头的 cfg.on 就是直接当真假用）
fn 栏真(单: &Value, 名: &str) -> bool {
    单.get(名).map(|v| !是假(v)).unwrap_or(false)
}

/// 留几份：那一头是 Number(keep) || 0
fn 栏数(单: &Value, 名: &str) -> i64 {
    单.get(名)
        .and_then(|v| v.as_f64())
        .map(|f| if f.is_finite() { f as i64 } else { 0 })
        .unwrap_or(0)
}

fn 现在毫秒() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn 改到毫秒(d: SystemTime) -> i64 {
    match d.duration_since(UNIX_EPOCH) {
        Ok(v) => v.as_millis() as i64,
        Err(_) => 0,
    }
}

/* ---------- 要抄的几处：默认那一棵是数据层，外加页面自己点的几处 ---------- */

/// 数据层那一格：<树根>\data（与 data_cmds 同一把尺 —— 书、文稿、卡片、看板、逐字记录、
/// 连同这一宿主的用户目录都在它底下，所以不各列一条，列两条就把配置抄了两遍）
fn 默认那一处() -> 一处根 {
    一处根 {
        label: "数据".to_string(),
        dir: crate::tauri_bind::data_cmds::数据层格().to_string_lossy().to_string(),
    }
}

/// 一串路径里最后那一段（照 path.basename：尾巴上的分隔先去干净）
fn 尾名(那处: &str) -> String {
    那处.replace('\\', "/")
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("")
        .to_string()
}

fn 要抄的几处(单: &Value) -> Vec<一处根> {
    let mut 出 = vec![默认那一处()];
    /* 他自己再点的文件夹走 cfg.extra 递进来（挑目录那一口是页面那一步走的，壳不自己找） */
    if let Some(列) = 单.get("extra").and_then(|v| v.as_array()) {
        for x in 列 {
            let 那处 = 栏文(x, "dir");
            if 那处.is_empty() {
                continue;
            }
            let 名 = 栏文(x, "label");
            let 名 = 名.trim();
            let 名 = if !名.is_empty() {
                名.to_string()
            } else {
                let 底 = 尾名(&那处);
                if 底.is_empty() { "外加".to_string() } else { 底 }
            };
            出.push(一处根 { label: 名, dir: 那处 });
        }
    }
    /* 名字撞了要给号：两颗根重名会一起写进同一个子文件夹，后抄的那份把先抄的顶掉（照 backupRoots 那一手） */
    let mut 见: Vec<(String, usize)> = Vec::new();
    for r in 出.iter_mut() {
        let 有 = 见.iter().position(|(n, _)| *n == r.label);
        let 次 = match 有 {
            Some(i) => {
                见[i].1 += 1;
                见[i].1
            }
            None => {
                见.push((r.label.clone(), 1));
                0
            }
        };
        if 次 > 0 {
            r.label = format!("{}-{}", r.label, 次 + 1);
        }
    }
    出
}

/* ---------- backup:roots ---------- */

/// backup:roots —— 界面上能挑的那几处候选。
/// 照那一头 backupRoots({})：不带 cfg.extra 时就只有默认那一处（数据层那一棵）。
/// 这一颗不读这台机器的位置登记（那一颗 .cjs 不进仓、Rust 也读不动），也不编一个假来源出来。
#[tauri::command]
pub async fn backup_roots() -> Vec<一处根> {
    要抄的几处(&Value::Null)
}

/* ---------- 一、排一份计划：每个根走一遍树 ---------- */

#[derive(Serialize)]
struct 一件件 {
    rel: String,
    落: PathBuf,
}

struct 一处作业 {
    label: String,
    from: String,
    items: Vec<一件件>,
}

fn 走一层(目录: &Path, 根: &str, 跳过: &[String], 错: &mut Vec<String>) -> Vec<一件件> {
    let mut 出 = Vec::new();
    let 目 = match fs::read_dir(目录) {
        Ok(v) => v,
        Err(e) => {
            错.push(format!(
                "读不到这一处：{} · {}",
                目录.to_string_lossy(),
                e
            ));
            return 出;
        }
    };
    let mut 项: Vec<fs::DirEntry> = 目.flatten().collect();
    /* 按名字排（照 backup.cjs 的 ent.sort：读出来的顺序不动的话，清单每一趟都得重写一遍） */
    项.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    for x in 项 {
        let 名 = x.file_name().to_string_lossy().to_string();
        if 跳过.iter().any(|s| *s == 名) {
            continue;
        }
        let 相 = if 根.is_empty() { 名.clone() } else { format!("{}/{}", 根, 名) };
        let 全 = 目录.join(&名);
        let 型 = x.file_type().map(|t| (t.is_dir(), t.is_file())).unwrap_or((false, false));
        if 型.0 {
            出.extend(走一层(&全, &相, 跳过, 错));
            continue;
        }
        if !型.1 {
            continue; /* 链接、管道这类不抄 */
        }
        出.push(一件件 { rel: 相, 落: 全 });
    }
    出
}

fn 排计划(单: &Value, 几处: &[一处根]) -> (Vec<一处作业>, Vec<String>, usize) {
    let 跳过: Vec<String> = 单
        .get("skip")
        .and_then(|v| v.as_array())
        .map(|列| 列.iter().map(|x| x.as_str().unwrap_or("").to_string()).collect())
        .unwrap_or_default();
    let mut 作业 = Vec::new();
    let mut 错 = Vec::new();
    for r in 几处 {
        if r.dir.is_empty() {
            continue;
        }
        let 路 = Path::new(&r.dir);
        if fs::metadata(路).is_err() {
            错.push(format!("{}：那一处读不到（{}）", r.label, r.dir));
            continue;
        }
        let 件件 = 走一层(路, "", &跳过, &mut 错);
        作业.push(一处作业 { label: r.label.clone(), from: r.dir.clone(), items: 件件 });
    }
    let 数 = 作业.iter().map(|j| j.items.len()).sum();
    (作业, 错, 数)
}

/* ---------- 二、抄：先落进 .正在写 那一颗，齐了再改名 ---------- */

/// 「抄的时间」那一句：照那一头 时.toLocaleString()（本机墙上时间，月与日不带零）
fn 那一刻(刻: chrono::NaiveDateTime) -> String {
    use chrono::{Datelike, Timelike};
    format!(
        "{}/{}/{} {}:{}:{}",
        刻.year(),
        刻.month(),
        刻.day(),
        刻.hour(),
        刻.minute(),
        刻.second()
    )
}

fn 抄一件(件: &Path, 到: &Path) -> Result<usize, String> {
    /* 读、长父格、写下去 —— 三步任何一步不成都算「没抄上」，那一头的 try 就是罩着这三步 */
    let 节 = fs::read(件).map_err(|e| e.to_string())?;
    if let Some(父) = 到.parent() {
        if !父.as_os_str().is_empty() {
            fs::create_dir_all(父).map_err(|e| e.to_string())?;
        }
    }
    fs::write(到, &节).map_err(|e| e.to_string())?;
    Ok(节.len())
}

fn 实跑(单: &Value) -> Result<一份抄账, String> {
    let 落点 = 栏文(单, "dest");
    let 落点 = 落点.trim();
    let 几处 = 要抄的几处(单);
    let 被抄: Vec<(&str, &str)> = 几处.iter().map(|r| (r.label.as_str(), r.dir.as_str())).collect();
    let 树 = crate::tree_root().to_string_lossy().to_string();
    /* 落点这一道全在纯判断那一格：没定 / 跑在被抄的那几处里面 / 带回退写法 / 不是绝对地址 / 写进这一棵树 */
    if let Some(那句) = 定::落点不许(落点, &树, &被抄) {
        return Ok(一份抄账 {
            ok: false,
            msg: 那句,
            目录: None,
            抄: None,
            字: None,
            坏: None,
            数: None,
            错: None,
            收: None,
        });
    }
    let 刻 = chrono::Local::now().naive_local();
    let 名 = 定::时间戳(刻);
    let 底 = Path::new(落点);
    let 成品 = 底.join(&名);
    let 草稿 = 底.join(format!("{}{}", 名, 定::半拉子尾));
    let (作业, 错, 数) = 排计划(单, &几处);
    if 数 == 0 {
        return Ok(一份抄账 {
            ok: false,
            msg: "一处都没读到，什么都没抄".to_string(),
            目录: None,
            抄: None,
            字: None,
            坏: None,
            数: Some(0),
            错: Some(错),
            收: None,
        });
    }
    /* 草稿那一格长不出来是这一趟真动不了手 —— 那一头这里没罩 try，照样抛给页面 */
    fs::create_dir_all(&草稿).map_err(|e| e.to_string())?;
    let 留几份 = 栏数(单, "keep");
    let 留几份文 = 栏文(单, "keep");
    let mut 清 = vec![
        "Flow-Desk 备份清单".to_string(),
        format!("抄的时间：{}", 那一刻(刻)),
        format!("备份到：{}", 落点),
        format!("留几份：{}", 留几份文),
        String::new(),
    ];
    let mut 抄 = 0u64;
    let mut 字 = 0u64;
    let mut 坏: Vec<String> = Vec::new();
    for j in &作业 {
        清.push(format!("—— {} · 源：{} · {} 个文件", j.label, j.from, j.items.len()));
        for it in &j.items {
            /* 落点里那一串分隔照 backup.cjs：rel 是用 / 拼的，一段一段接上去 */
            let mut 到 = 草稿.join(&j.label);
            for 段 in it.rel.split('/') {
                到 = 到.join(段);
            }
            match 抄一件(&it.落, &到) {
                Ok(长) => {
                    抄 += 1;
                    字 += 长 as u64;
                    清.push(format!("  {}/{}\t{}", j.label, it.rel, 长));
                }
                Err(e) => 坏.push(format!("{}/{} · {}", j.label, it.rel, e)),
            }
        }
        清.push(String::new());
    }
    /* 抄不动的文件一声不响不行：哪一个失败了列进清单的「没抄上」那一节，页面上报出个数 */
    if !坏.is_empty() {
        清.push(format!("—— 没抄上的 {} 个：", 坏.len()));
        for b in &坏 {
            清.push(format!("  {}", b));
        }
    }
    /* 清单最后一个落：半成品那一颗里没有清单，收旧份那一头就认不出它、也就不会当成成品 */
    let 收尾 = fs::write(草稿.join(定::清档名), 清.join("\n"))
        .map_err(|e| e.to_string())
        .and_then(|_| fs::rename(&草稿, &成品).map_err(|e| e.to_string()));
    if let Err(那句) = 收尾 {
        let mut 错 = 错;
        错.push(那句.clone());
        return Ok(一份抄账 {
            ok: false,
            msg: format!("这一份没收住：{}", 那句),
            目录: Some(草稿.to_string_lossy().to_string()),
            抄: Some(抄),
            字: Some(字),
            坏: Some(坏),
            数: None,
            错: Some(错),
            收: None,
        });
    }
    let 收 = 收旧份(落点, 留几份);
    Ok(一份抄账 {
        ok: true,
        msg: format!("抄了 {} 个文件 · {}", 抄, 定::报多大(字)),
        目录: Some(成品.to_string_lossy().to_string()),
        抄: Some(抄),
        字: Some(字),
        坏: Some(坏),
        数: Some(数 as u64),
        错: Some(错),
        收: Some(收),
    })
}

/// backup:run —— 抄一整趟。cfg 是页面上那一整格配置（dest / keep / skip / on / every / extra）。
/// 落点由页面递进来，壳只按给定路径干活，外加「不许写进这一棵树」那一道闸（判断在 fd_core::backup_rule）。
#[tauri::command]
pub async fn backup_run(cfg: Option<Value>) -> Result<一份抄账, String> {
    /* 这一趟可能几十万个文件，全程都在摸磁盘：交给异步命令那一头跑，别占着窗口那一条线程。
       页面上 backupRun 收的也是这一格形状（那一头连 cfg 不是对象都罩成 {}，这一头 Option<Value> 认 null） */
    let 单 = cfg.unwrap_or_else(|| Value::Object(Default::default()));
    实跑(&单)
}

/* ---------- 三、收旧份：只收自己造的、有清单的那几颗 ---------- */

fn 收旧份(落点: &str, 留几份: i64) -> 一份收 {
    let 目 = match fs::read_dir(落点) {
        Ok(v) => v,
        Err(e) => {
            return 一份收 { 删: vec![], 留: vec![], 半: vec![], 错: Some(e.to_string()) }
        }
    };
    let 目项: Vec<(String, bool)> = 目
        .flatten()
        .map(|x| {
            let 是格 = x.file_type().map(|t| t.is_dir()).unwrap_or(false);
            (x.file_name().to_string_lossy().to_string(), 是格)
        })
        .collect();
    /* 抄到一半崩了会留下一颗没改名的 .正在写：它不算一份，但摆在那儿越攒越多。
       半小时开外的一律收掉 —— 这一刻真在抄的那一颗没这么老，收不到它。 */
    let mut 半 = Vec::new();
    for (名, 是格) in &目项 {
        if !*是格 || !定::是半拉子的那一颗(名) {
            continue;
        }
        let 路 = Path::new(落点).join(名);
        let 老 = match fs::metadata(&路).and_then(|m| m.modified()) {
            Ok(t) => 现在毫秒() - 改到毫秒(t),
            Err(_) => continue,
        };
        if 老 > 1_800_000 {
            if fs::remove_dir_all(&路).is_ok() {
                半.push(名.clone());
            }
        }
    }
    if 留几份 <= 0 {
        return 一份收 { 删: vec![], 留: vec![], 半, 错: None };
    }
    let 我的: Vec<String> = 目项
        .iter()
        .filter(|(名, 是格)| *是格 && 定::是自家造的那一颗(名))
        .map(|(名, _)| 名.clone())
        .filter(|名| Path::new(落点).join(名).join(定::清档名).is_file())
        .collect();
    /* 他自己在那个文件夹里放的东西一律不碰：认名字合不合式、里头有没有备份清单，两条都中才算 */
    let 删单 = 定::该收哪几份(&我的, 留几份);
    let mut 删了 = Vec::new();
    for d in 删单 {
        if fs::remove_dir_all(Path::new(落点).join(&d)).is_ok() {
            删了.push(d);
        }
    }
    let 留 = 我的.into_iter().filter(|x| !删了.contains(x)).collect();
    一份收 { 删: 删了, 留, 半, 错: None }
}

/* ---------- 四、上一次抄到什么时候、到点没、下一颗表 ---------- */

/// 在目标文件夹里找有清单的那几颗里最新的一个名字；没抄过、那一格读不到都回空串。
/// 那一头 backup.cjs 是按 readdir 的顺序从后往前找，这一头先按名字排再往后找 ——
/// 时间戳那串名字本身就是可排的写法，排过才真的拿到最新的那一颗。
fn 上一次(落点: &str) -> String {
    if 落点.is_empty() {
        return String::new();
    }
    let 名们: Vec<String> = match fs::read_dir(落点) {
        Ok(目) => 目
            .flatten()
            .filter(|x| x.file_type().map(|t| t.is_dir()).unwrap_or(false))
            .map(|x| x.file_name().to_string_lossy().to_string())
            .collect(),
        Err(_) => return String::new(),
    };
    for 名 in 定::从新到旧(&名们) {
        if Path::new(落点).join(&名).join(定::清档名).is_file() {
            return 名;
        }
    }
    String::new()
}

/// backup:last —— 上一次抄到哪一刻那一串名字（页面上「上次备份：…」读的就是这一句）
#[tauri::command]
pub async fn backup_last(dest: Option<String>) -> String {
    上一次(&dest.unwrap_or_default())
}

/// backup:check —— 一问答完：上一次抄到什么时候、到点没、下一颗表该设到哪一刻。
/// 这一句摆在这儿而不是让页面自己算，是因为「上一次」写在磁盘上的文件夹名里，页面看不见。
#[tauri::command]
pub async fn backup_check(cfg: Option<Value>) -> 一份到点 {
    let 单 = cfg.unwrap_or_else(|| Value::Object(Default::default()));
    let 落点 = 栏文(&单, "dest");
    let 名 = 上一次(&落点);
    let 时 = 定::戳回时刻(&名);
    let 档 = 栏文(&单, "every");
    let 开着 = 栏真(&单, "on");
    let 现在 = 现在毫秒();
    一份到点 {
        上回: 名,
        上回时: 时,
        到点: 定::到点没(开着, &档, 时, 现在),
        下一回: 定::下一回(开着, &档, 时, 现在),
    }
}
