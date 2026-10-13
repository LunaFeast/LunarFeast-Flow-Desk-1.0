/* 四层里的第三层 · 让程序重新生成页面那一手（外46 三 批二 · 搬 main.cjs 1406 那颗）
   ------------------------------------------------------------
   那一头做的事：拿这个 exe 自带的 electron（ELECTRON_RUN_AS_NODE=1）当 node，跑源码格里的
   _fd\build.mjs，把 Flow-Desk 那一份页面重新生成一遍；每开一步先送一句 rebuild:step，
   跑完朝所有窗口送一句 rebuild:done（顶上那条进度条吃的是「第几步 / 共几步 + 这一步在做什么」，不是猜的百分比）。
   回给页面的形状一格都不动：{ ok:true, msg } / { ok:false, msg }，那几句原话照那一头抄。
   两处壳与 Electron 不一样，都在这儿写着，不留到运行时才发现：
     ① 源码格：那一头从 root.json 的 src 那一栏认（产物里才有那一份），这一头认环境变量 FD_SRC，
        没指就看 <树根>\src 那一格在不在 —— 都不在就报同一句「这台机器没记下源码在哪儿，重新构建不了」；
     ② 拿什么当 node：那一头是 exe 自己带着的那一颗，壳这一头没绑一颗 node，
        所以认环境变量 FD_NODE，没指就用 PATH 里那颗 node；起不来就照那一头的 runBuild
        走同一支（码 -1 + 那一句），报「页面构建失败（-1）」，不假装构建过了。 */
use serde::Serialize;
use std::io::{BufRead, Read};
use std::path::Path;
use std::process::{Command, Stdio};

use tauri::{AppHandle, Emitter};

/// 回给页面那一格（照那一头 { ok:false, msg } / { ok:true, msg }）
#[derive(Serialize)]
pub struct 一个回执 {
    ok: bool,
    msg: String,
}

/// rebuild:step 那一格：{ label, pct }，跟着日志走的那一句多带一格 log
#[derive(Serialize, Clone)]
struct 一步 {
    label: String,
    pct: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    log: Option<String>,
}

/// rebuild:done 那一格：{ files }
#[derive(Serialize, Clone)]
struct 一份写完 {
    files: Vec<String>,
}

fn 不成(那句: &str) -> 一个回执 {
    一个回执 { ok: false, msg: 那句.to_string() }
}

/// 源码格在哪：FD_SRC 指到哪儿算哪儿，没指就看树里那一格
/// （这一颗给两颗通道共用：sys:rebuild 跑 _fd\build.mjs、code:catRename 改 _shared\ 那几份 ——
///   认法只有一份，别处不许再抄第二份，见 code_cmds.rs）
pub(crate) fn 源码格(树: &str) -> Option<String> {
    let 指 = std::env::var("FD_SRC").unwrap_or_default();
    if !指.trim().is_empty() {
        return Some(指);
    }
    let 格 = Path::new(树).join("src");
    if 格.is_dir() {
        return Some(格.to_string_lossy().to_string());
    }
    None
}

/// sys:rebuild —— 把页面重新生成一遍，一步一句报给页面
#[tauri::command]
pub async fn sys_rebuild(app: AppHandle) -> 一个回执 {
    let 树 = crate::tree_root().to_string_lossy().to_string();
    let 源 = match 源码格(&树) {
        Some(v) => v,
        None => return 不成("这台机器没记下源码在哪儿，重新构建不了"),
    };
    let 脚本 = Path::new(&源).join("_fd").join("build.mjs");
    if !脚本.is_file() {
        return 不成(&format!("找不到构建脚本：{}", 脚本.to_string_lossy()));
    }
    /* 那两步的字面与百分比照那一头的 steps 数组搬，一颗都不许多加 */
    let 头一步 = 一步 { label: "生成 Flow-Desk 页面".to_string(), pct: 8, log: None };
    let 尾一步 = 一步 { label: "页面生成好了".to_string(), pct: 92, log: None };
    let _ = app.emit("rebuild:step", 头一步.clone());
    let 说 = |段: 一步| {
        let _ = app.emit("rebuild:step", 段);
    };
    let 得 = 跑一趟(&脚本.to_string_lossy(), &树, &头一步, &说);
    /* 那一头 runBuild 回来的三样：code / out / err —— 不是零就当失败，报的是同一句话 */
    if 得.0 != 0 {
        let 底 = if 得.2.is_empty() { 得.1.clone() } else { 得.2.clone() };
        return 一个回执 { ok: false, msg: format!("Flow-Desk 页面构建失败（{}）：\n{}", 得.0, 底) };
    }
    /* 写了哪几份是从 stdout 里挑 WROTE 打头那几行（那一头同一手，界面上读的就是这一串） */
    let 清单: Vec<String> = 得
        .1
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| s.starts_with("WROTE"))
        .collect();
    说(尾一步);
    /* 插件名单是整张页共用的：所有窗口都广播一句，让它们自己提示「刷新才换血」，不替用户 reload */
    let _ = app.emit("rebuild:done", 一份写完 { files: 清单.clone() });
    let 文 = 清单.join("\n");
    一个回执 {
        ok: true,
        msg: if 文.is_empty() { "构建跑完了，但没听说写了哪个文件".to_string() } else { 文 },
    }
}

/// 跑一趟构建脚本：回 (退出码, stdout, stderr)。
/// 起不来那一手照那一头的 p.on('error')：码 -1、err 是那句错，别当成跑了个零。
fn 跑一趟(脚本: &str, 树: &str, 头一步: &一步, 说: &dyn Fn(一步)) -> (i64, String, String) {
    let 节点 = {
        let 指 = std::env::var("FD_NODE").unwrap_or_default();
        if 指.trim().is_empty() { "node".to_string() } else { 指 }
    };
    let 子 = Command::new(&节点)
        .arg(脚本)
        .current_dir(Path::new(脚本).parent().unwrap_or(Path::new(".")))
        /* FD_TREE 一起带过去：构建脚本才知道该往哪棵树的 页面\ 生成、从 数据\plugins 取配方 */
        .env("FD_TREE", 树)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    let mut 子 = match 子 {
        Ok(v) => v,
        Err(e) => return (-1, String::new(), format!("{}{}", 起不来那句, e)),
    };
    /* 两条管道都要有人接着读，不然缓冲区满了这一趟就卡在那儿：stderr 交给一条自己的线程，
       stdout 在这一条线上一行一行读 —— 读到一行就送一句 rebuild:step（那一头的 onLine 同一手） */
    let 错管 = 子.stderr.take();
    let 出管 = 子.stdout.take();
    let 错口 = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
    let 错手 = {
        let 错口 = 错口.clone();
        std::thread::spawn(move || {
            let mut 串 = String::new();
            if let Some(管) = 错管 {
                let _ = std::io::BufReader::new(管).read_to_string(&mut 串);
            }
            let mut 放 = 错口.lock().unwrap_or_else(|e| e.into_inner());
            *放 = 串;
        })
    };
    let mut 出 = String::new();
    if let Some(管) = 出管 {
        let mut 读 = std::io::BufReader::new(管);
        let mut 行 = String::new();
        loop {
            match 读.read_line(&mut 行) {
                Ok(0) | Err(_) => break,
                Ok(_) => {}
            }
            出.push_str(&行);
            let 整 = 行.trim();
            if !整.is_empty() {
                说(一步 {
                    label: 头一步.label.clone(),
                    pct: 头一步.pct,
                    log: Some(整.chars().take(120).collect()),
                });
            }
            行.clear();
        }
    }
    let 码 = 子.wait().map(|s| s.code().unwrap_or(-1) as i64).unwrap_or(-1);
    let _ = 错手.join();
    let 错 = (*错口.lock().unwrap_or_else(|e| e.into_inner())).clone();
    (码, 出, 错)
}

const 起不来那句: &str = "重新构建没跑起来：";
