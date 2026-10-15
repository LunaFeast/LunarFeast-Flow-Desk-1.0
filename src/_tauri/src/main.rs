/* Flow-Desk 的 Tauri 壳 · 第一版骨架（外46 起这条线开工，目标是换掉 Electron 那一层）
   ------------------------------------------------------------
   这一棵现在干四件事，都是为了让后面那一大摊搬得有地方落：
     ① 认得出这一棵树装在哪（外壳自己所在目录，不写死盘符）；
     ② 把当前版本号报给前端 —— 号由发布脚本当环境变量传进来（FD_VERSION / FD_BUILD），
        壳自己不去 git 取号，也不在这份配置里再钉一遍字面值：他定的口径是「打包 ↔ 提交 ↔ tag ↔ 号」
        一一对应，取号那一头归 src\_build\version.mjs；
     ③ 开一张窗口；
     ④ 文件读写那一组十颗通道（外46 三搬的第一组，纯判断在 fd_core、动手在 tauri_bind::fs_cmds）；
     ⑤ 图标、字体、关于、系统深浅、取色这一组五颗，加重启自己一颗（外46 三搬的第四组；
        判断在 fd_core，动手在 tauri_bind::info_cmds 与 win_cmds）。
     ⑥ 数据层那一摊与配置那几格十一颗（外46 三批一：data:dir/read/write/list/wipe、lib:read/write、
        cfg:closeGet/Set、cfg:rimeGet/Set；判断在 fd_core::data_path 与 cfg_value，
        动手在 tauri_bind::data_cmds 与 cfg_cmds —— 页面递进来的相对路径挡在落格那一颗，IO 这一层不自己判）。
     ⑦ 「改组件代码」那一摊七颗（外46 三批三：comp:read/list/write/delete/restore/factory 六颗 +
        code:catRename 一颗；判断在 fd_core::comp_rule 与 cat_rename，动手在 tauri_bind::comp_cmds 与 code_cmds。
        「哪一家能读改删哪几份」那把尺整个搬进纯判断那一格，越界一律当场拒）。
     ⑧ 音乐遥控器那一摊的九颗（外46 三批四：media:state / hold / release / cmd / players / pin 六颗 +
        vol:get / set / mute 三颗；判断在 fd_core::media_rule，动手在 tauri_bind::media_cmds 与 vol_cmds。
        播放状态走 WinRT 的 SMTC（一条自己的线程 + 事件推，不轮询），音量走 Core Audio 的 IAudioEndpointVolume
        （每颗一趟后台线程 + 三秒超时），都不再起常驻 PowerShell 子进程）。
     ⑨ 音乐遥控器那四颗（外46 三批五：media:dirPick / media:dirSet / media:flag / media:bridge；
        判断还是住在 fd_core::media_rule，动手还是 tauri_bind::media_cmds。音乐文件夹那一行走原生对话框挑一颗、
        开关那一句是 music.txt 的单键读写、装监听插件那一颗靠注册表与常见落点找 MusicBee（不起子进程）——
        做不全等的几处全写在 media_cmds 顶上那一段，没装成搬齐）。
     ⑩ 插件那一列那两颗（外46 三批六：pack:list / pack:file；判断在 fd_core::pack_rule，动手在
        tauri_bind::pack_cmds。前者回 dir / packs / off / error 那一整格（文件夹赢同名 zip、两趟收，
        installed.json 读到一次就换算成 off.json），后者从包里取一份文件给页面（24MB 那道闸）；
        拆 zip 用的是共用的 fd_core::zip_pack，没在壳里出第二个解包器）。
     ⑪ 插件那一列剩下那三颗（外46 三批七：pack:set / pack:import / pack:wipe；判断还是住在
        fd_core::pack_rule，动手还是 tauri_bind::pack_cmds。写名单那一颗把页面递的「开着的」换成落盘的
        「卸掉的」（= 扫到的全部 减 开着的），递 null 就是删掉 off.json 那份名单，写完顺手查一眼音乐遥控器
        还在不在、不在就收掉后台监听（朝 media_cmds 那一颗借）；导入那一颗两种形状都认（.zip 摊成文件夹、
        解开的文件夹整格抄进来），同名一句退回、绝不动他原有的包，成了顺手留一份原版（落点朝 comp_rule 借）；
        清数据那一颗只动用户目录以内与数据层根底下那两处，插件那一格与名单永远留着，一颗都不许多删。
        摊包走的还是共用的 fd_core::zip_pack —— 壳里到现在也只有那一颗解包器）。
   命令名这一头有个硬限制：Rust 函数名就是页面上 invoke 的那个串，里面不能有冒号，
   所以现有主进程的「fs:read」这一类写法在壳里落成「fs_read」，冒号那道换算放在还没写的 JS 桥上做 ——
   页面上请壳的那串字一个字都不改（他定的「前端原样保留」）。
   （2026-10-12 当场对过：页面上真调的那些 FD_APP 名字，底下请的通道全在这 65 颗里；
   哪一颗落到了单外，由 gate-bridge46 那一道闸当场数着）。
   另三件不是通道：故障真隔离停下的那两步（见 docs\插件真隔离设计.md 第七节）、网格吸附、
   只许开一个程序那一颗（Electron 现在自己占端口问口令，这里该换正规插件）、以及打成安装包那条链。
   一条一条搬，每搬一条补一条闸。 */
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[path = "core/mod.rs"]
mod fd_core;            // 四层里的第一层：纯判断（目录仍叫 core，模块名避开 Rust 自己那个 core）
mod tauri_bind;          // 四层里的第三层：命令胶水与动磁盘的那一手

use std::path::PathBuf;

/* 树在哪：拿壳自己所在那一格，整棵树照相对位置找（跟现有「路径全按这个文件夹的相对位置」同一口径） */
fn tree_root() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

/* 号：环境变量优先，没传就退回这一档的底色（本地自己跑壳的时候不至于报空号） */
fn version() -> String {
    let 底 = match std::env::var("FD_VERSION") {
        Ok(v) if !v.trim().is_empty() => v.trim().to_string(),
        _ => "2.0.0-alpha".to_string(),
    };
    match std::env::var("FD_BUILD") {
        Ok(v) if !v.trim().is_empty() => format!("{}+build.{}", 底, v.trim().replace("build.", "")),
        _ => 底,
    }
}

#[tauri::command]
fn shell_info() -> serde_json::Value {
    serde_json::json!({
        "version": version(),
        "root": tree_root().to_string_lossy(),
        "runtime": "tauri",
    })
}

fn main() {
    /* fdapp 这个地址要先注册，窗口才吃得到（页面里那些相对地址、图标、纹理全走这一条） */
    let 壳 = tauri_bind::page_cmds::注册页面协议(tauri::Builder::default());
    壳
        /* 只许开一个程序：走官方那颗单实例插件（批十）。Windows 上它用的是一枚命名互斥体
           加一扇看不见的事件窗 —— 第二份一进来就认出"已经有一份在跑"，把命令行交给那一份、
           自己退掉（插件里走 cleanup_before_exit + process::exit(0)）。
           Electron 那边是 app.requestSingleInstanceLock()，原先记下过"换到 Tauri 不许同类 hack，
           必须用正规接口"，所以这里不再自己占一个本机端口问口令。
           这颗要排在其他插件最前面：插件按登记顺序跑，第二份必须在别的 setup 动手之前就被认出来。 */
        .plugin(tauri_plugin_single_instance::init(|应用, _命令行, _工作目录| {
            tauri_bind::win_cmds::第二份进来了(应用);
        }))
        /* 挑文件与挑目录那两道框走官方那颗对话框插件的 Rust 接口（不是 JS 那一头，页面碰不到它） */
        .plugin(tauri_plugin_dialog::init())
        /* 窗口这一组要记着的三件事：当前缩放、关窗口那张框问出去没有、是不是已经在收摊 */
        .manage(tauri_bind::win_cmds::窗口手::default())
        /* 图标那一张表的账：半秒之内谁再来问都沿用上一趟（插件页每列一行都要问一遍） */
        .manage(tauri_bind::info_cmds::图标手::default())
        /* 音乐遥控器那一摊的账：挂了几处音乐（按窗口记）+ 后台监听那一条线程的账与令口 */
        .manage(tauri_bind::media_cmds::媒体手::default())
        /* 系统音量的那本账：最近读回来的数、滑杆待定那一个值、90ms 那颗合并在不在排 */
        .manage(tauri_bind::vol_cmds::音量手::default())
        /* 探针预置的那串挑好的（环境变量 FD_AUTOTEST_PICK），起壳时取一次 */
        .manage(tauri_bind::pick_cmds::对话框手::起())
        /* 关窗口先拦下来问页面；窗口形状一变就回报 win:state */
        .on_window_event(tauri_bind::win_cmds::窗口事件)
        /* 托盘：那张框上「收进托盘」那条要有地方去，左键露/缩、右键开单 */
        .setup(|app| {
            tauri_bind::win_cmds::建托盘(app.handle())?;
            /* 那一扇窗：按 Flow_Desk_*.html 挑最近写过的那一张，门牌与桥递进去 */
            match tauri_bind::page_cmds::开页面窗口(app.handle()) {
                Ok(名) => println!("[壳] 页面 = {}", 名),
                Err(e) => eprintln!("[壳] {}", e),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            shell_info,
            tauri_bind::fs_cmds::fs_read,
            tauri_bind::fs_cmds::fs_read_range,
            tauri_bind::fs_cmds::fs_stat,
            tauri_bind::fs_cmds::fs_write,
            tauri_bind::fs_cmds::fs_append,
            tauri_bind::fs_cmds::fs_mkdir,
            tauri_bind::fs_cmds::fs_unlink,
            tauri_bind::fs_cmds::fs_list,
            tauri_bind::fs_cmds::fs_tree,
            tauri_bind::fs_cmds::fs_read_text,
            tauri_bind::fs_cmds::fs_resolve,
            /* 批一 · 数据层那一摊与配置那几格（11 颗）：判断在 fd_core::data_path 与 cfg_value，
               动手在 tauri_bind::data_cmds 与 cfg_cmds */
            tauri_bind::data_cmds::data_dir,
            tauri_bind::data_cmds::data_read,
            tauri_bind::data_cmds::data_write,
            tauri_bind::data_cmds::data_list,
            tauri_bind::data_cmds::data_wipe,
            tauri_bind::data_cmds::lib_read,
            tauri_bind::data_cmds::lib_write,
            tauri_bind::cfg_cmds::cfg_close_get,
            tauri_bind::cfg_cmds::cfg_close_set,
            tauri_bind::cfg_cmds::cfg_rime_get,
            tauri_bind::cfg_cmds::cfg_rime_set,
            tauri_bind::win_cmds::win_ctl,
            tauri_bind::win_cmds::win_close_answer,
            tauri_bind::win_cmds::app_restart,
            tauri_bind::info_cmds::icons_list,
            tauri_bind::info_cmds::font_list,
            tauri_bind::info_cmds::about_info,
            tauri_bind::info_cmds::ming_system,
            tauri_bind::info_cmds::ocr_swatch,
            tauri_bind::pick_cmds::fsa_pick_files,
            tauri_bind::pick_cmds::fsa_pick_dir,
            /* 批二 · 定期备份那四颗 + 重新构建一颗 + 取标题一颗 + 图片库两张（共 8 颗）：
               判断在 fd_core::backup_rule / web_page / img_bytes，
               动手在 tauri_bind::backup_cmds / sys_cmds / web_cmds / img_cmds。
               备份的落点由页面递进来，壳只按给定路径干活，并挡「落点不许跑进这一棵树里」那一道。 */
            tauri_bind::backup_cmds::backup_run,
            tauri_bind::backup_cmds::backup_last,
            tauri_bind::backup_cmds::backup_check,
            tauri_bind::backup_cmds::backup_roots,
            tauri_bind::sys_cmds::sys_rebuild,
            tauri_bind::web_cmds::web_title,
            tauri_bind::img_cmds::img_peek,
            tauri_bind::img_cmds::img_open,
            /* 批三 · 插件那一格的文件三颗 + 词库改名那颗：comp:read / write / delete 与 code:catRename。
               从前这一摊是七颗（六颗 comp 的 + catRename），页面上那颗「改代码」与那颗「恢复出厂」
               随插件分离第 2 批 2.5 撤了，配套的 comp:list / comp:restore / comp:factory 一起撤。
               判断（哪一家能读改删哪几份、改名那三种写法）在 fd_core::comp_rule 与 fd_core::cat_rename，
               动手在 tauri_bind::comp_cmds 与 code_cmds。活的那一格 = <树根>\data\plugins。 */
            tauri_bind::comp_cmds::comp_read,
            tauri_bind::comp_cmds::comp_write,
            tauri_bind::comp_cmds::comp_delete,
            tauri_bind::code_cmds::code_cat_rename,
            /* 批四 · 音乐遥控器那一摊的九颗（6 + 3）：media:state / hold / release / cmd / players / pin
               与 vol:get / set / mute。判断（值域、认哪些命令串、挑哪一家会话、那几句报给页面的话）
               在 fd_core::media_rule，动手在 tauri_bind::media_cmds 与 tauri_bind::vol_cmds。
               SMTC 走 WinRT 的 GlobalSystemMediaTransportControlsSessionManager（一条自己的线程 + 事件，
               不轮询），系统音量走 Core Audio 的 IAudioEndpointVolume（每颗一趟后台线程 + 三秒超时）。 */
            tauri_bind::media_cmds::media_state,
            tauri_bind::media_cmds::media_hold,
            tauri_bind::media_cmds::media_release,
            tauri_bind::media_cmds::media_cmd,
            tauri_bind::media_cmds::media_players,
            tauri_bind::media_cmds::media_pin,
            tauri_bind::vol_cmds::vol_get,
            tauri_bind::vol_cmds::vol_set,
            tauri_bind::vol_cmds::vol_mute,
            /* 批五 · 音乐遥控器那四颗（main.cjs 1287 / 1296 / 1298 / 1367）：media:dirPick 弹原生框挑音乐文件夹、
               media:dirSet 落那一行、media:flag 开关那一句单键读写、media:bridge 给 MusicBee 装监听插件。
               判断（那两句洗法、表的重排、找 MusicBee 的候选清单与那四句话）在 fd_core::media_rule，
               动手在 tauri_bind::media_cmds。dirPick 与 bridge 是 async（等用户点框、一格一格数盘，
               都不占窗口那一条线程）；bridge 找装在哪走的是注册表 + 常见落点那两条，不起子进程 —— 
               差在哪几处全写在 media_cmds 顶上那段，没装成搬齐。 */
            tauri_bind::media_cmds::media_dir_pick,
            tauri_bind::media_cmds::media_dir_set,
            tauri_bind::media_cmds::media_flag,
            tauri_bind::media_cmds::media_bridge,
            /* 批六 · 插件那一列那两颗（main.cjs 1876 / 1880 行）：pack:list 扫那一列（含 off.json 与
               installed.json 那一次换算）、pack:file 从包里取一份文件（词库底本那种）。
               判断（哪一枚名字进这一列、文件夹赢同名 zip 的两趟收、那两份名单的读法、24MB 那道闸与那几句白话）
               在 fd_core::pack_rule，动手在 tauri_bind::pack_cmds；解包不新写一颗，走的还是共用的
               fd_core::zip_pack（目录 / 取一份）—— 那一列住在哪一格也朝 comp_cmds 那一颗借，不另起口径。 */
            tauri_bind::pack_cmds::pack_list,
            tauri_bind::pack_cmds::pack_file,
            /* 批七 · 插件那一列剩下那三颗（main.cjs 1895 / 1995 / 2052 行）：pack:set 写名单（页面递「开着的」，
               落盘换成「卸掉的」= 扫到的全部 减 开着的；递 null / undefined 就是删掉 off.json 那份名单）、
               pack:import 导入一家（.zip 摊成文件夹、解开的文件夹整格抄进来，两种都顺手留一份原版）、
               pack:wipe 抹掉卸一家时勾的那两处数据（只动用户目录以内与数据层根底下、插件那一格永远留着）。
               判断（那四句原话与「开着的换成卸掉的」、导入那十句原话与门牌折法、清那两处该留哪几格）
               在 fd_core::pack_rule，动手在 tauri_bind::pack_cmds；摊包走的还是共用的 fd_core::zip_pack，
               装没装音乐遥控器与收后台监听朝 media_cmds 借，留一份原版的落点朝 comp_rule 借 —— 都没另起第二把尺。 */
            tauri_bind::pack_cmds::pack_set,
            tauri_bind::pack_cmds::pack_import,
            tauri_bind::pack_cmds::pack_wipe,
        ])
        .run(tauri::generate_context!())
        .expect("Flow-Desk 的 Tauri 壳起不来");
}
