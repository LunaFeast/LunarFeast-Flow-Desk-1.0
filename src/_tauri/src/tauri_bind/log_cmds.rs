/* 运行日志那一手（外46 批六第三步补的那一格，2026-10-11）
   ----------
   原件在 Electron 主进程里那十六行（src\pack\main.cjs 2404~2423）：取时刻、拼那一行、
   排着队往 data\logs\<那一天>.log 后面追加，整条路裹在 try 里 —— 写日志这件事绝不能把程序带倒。
   这一头分两半：那一行长什么样、落到哪一个文件名，全在 core::log_line（纯判断，带测试）；
   这一层只取时刻（本地墙上时间，与原件 new Date() 同一口径）、建那一格、追加。

   三处做不全等，全写在这儿，不藏：
     ① 900 个字那一刀的数法不同 —— 原件 .slice(0, 900) 数 UTF-16 单元，这一头数「一个字」；
        中文、假名、常用符号两边一样，带增补平面的字（emoji 那种）原件算两个、这一头算一个。
     ② 原件在探针 / 开发实例（带 FD_USERDATA 环境变量）时把日志写到用户数据那一格旁边，
        不往他的 logs\ 里掺；壳里到现在没有 FD_USERDATA 这一说（整个壳都按 <树根>\data 找数据层），
        所以这一头也只有 <树根>\data\logs 一处 —— 等壳能按环境变量换数据层根时一起跟上。
     ③ 原件那条 Promise 队列换成一颗进程内的锁：同一颗程序里排着写，
        别和同时写这一个文件的人咬出半截（原件注释同一句原话）。

   这一颗**不是页面上请的通道**：Electron 那边 logLine 也只在主进程里用，页面上碰不到，
   所以它不进那座桥、不进命令注册表 —— 只有壳自己（media_cmds、pack_cmds 那几处）叫它。 */
use std::io::Write;
use std::sync::Mutex;

/* 排着队写：锁本身不带数据，只为把同一进程里的两次追加隔开 */
static 写队: Mutex<()> = Mutex::new(());

/// 记一笔。写不成都当没写（原件那两个 catch 同一口径），绝不抛、绝不回错。
pub(crate) fn 记一笔(类别: &str, 原话: impl AsRef<str>) {
    use chrono::{Datelike, Timelike};
    /* 本地墙上时间（backup_cmds 那颗同一手：先 naive_local 再一颗颗取字段） */
    let 今 = chrono::Local::now().naive_local();
    let (件名, 行) = crate::fd_core::log_line::一行(
        今.year(),
        今.month(),
        今.day(),
        今.hour(),
        今.minute(),
        今.second(),
        今.nanosecond() / 1_000_000,
        类别,
        原话.as_ref(),
    );
    let 格 = crate::tauri_bind::data_cmds::数据层格().join("logs");
    let 到 = 格.join(&件名);
    /* 拿不到锁（另一颗线程正写着）也不等死：拿它里面那份继续 —— 锁里装的本来就是空东西 */
    let _排 = 写队.lock().unwrap_or_else(|坏| 坏.into_inner());
    if std::fs::create_dir_all(&格).is_err() {
        return;
    }
    if let Ok(mut 手) = std::fs::OpenOptions::new().create(true).append(true).open(&到) {
        let _ = 手.write_all(行.as_bytes());
    }
}
