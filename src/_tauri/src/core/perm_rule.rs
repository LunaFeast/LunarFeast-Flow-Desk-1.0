/* 四层里的第一层 · 权限这一摊的判断（外46 批六第二步，2026-10-11）
   ----------
   页面上那一份插件上下文（`src\_shared\sh-load.js` 里的 `PackCtx`）一家一家包着四道门：
   设置键 `kvKeys`、表单键 `stateKeys`、数据文件 `dataKeys`、后台通道 `appChannels`，
   通道那一道后面还跟着一道硬地板（清单点名也不给的那几颗）。
   这一颗先把**硬地板那一道**搬到壳里认一遍 —— 两处各挡一遍，哪一处被改坏，另一边还在。
   动这一手的位置在 `tauri_bind::pack_cmds`：读盘上那份插件清单、把该挡的从 `appChannels` 里摘掉，
   摘了哪几颗原样回报在包那一格的 `deniedChannels` 上（页面上现在没人读，装载那一路接上再报话）。
   硬地板那份名单**不在这里抄第二份** —— 它由 `src\_tauri\bridge.mjs` 从 `sh-load.js` 里读出来
   生成 `app_deny.rs`，跟那座桥同一趟生成、同一个 `--验` 口径（抄第二份就是第二个真身）。
   这一层不碰磁盘：读盘的那一手在 `tauri_bind`。 */
use serde_json::Value;

use super::app_deny::硬地板;

/// 这一颗在不在硬地板上（生成的那份是 `&[&str]`，比一颗 `&str` 用这一颗，免得两头各写一遍）
fn 在地板上(通道: &str) -> bool {
    硬地板.iter().any(|颗| *颗 == 通道)
}

/// 这一家点名的通道里，哪几颗属于「宿主自己的事」—— 按原序回，不改顺序
pub fn 该挡的(点名: &[String]) -> Vec<String> {
    点名.iter().filter(|颗| 在地板上(颗)).cloned().collect()
}

/* 另外四道门（设置键归谁、表单键归谁、数据文件归谁、这一颗通道认不认）现在不写：
   壳里要到「带身份的那一个入口」立起来才有调用者，先写就是四颗没人用的函数
   （cargo 那条 never used 警告会当场逮到）。规矩已经逐条抄在 docs\插件真隔离设计.md 第二节，
   那一步落地时再写，一起带测试。 */

/// 就地从一份插件清单里把该挡的通道摘掉，回摘了哪几颗（原序）。
/// 清单不是对象、或者没点 `appChannels` 这一格，都算「一颗也没摘」，不炸。
/// 名单里不是字符串的那一格原样留着 —— 页面那一头也认不出它是哪颗通道，两边一样。
pub fn 挡下该挡的(清单: &mut Value) -> Vec<String> {
    let 单 = match 清单.as_object_mut() {
        Some(o) => o,
        None => return vec![],
    };
    let 列 = match 单.get("appChannels").and_then(|v| v.as_array()) {
        Some(a) => a.iter().filter_map(|x| x.as_str().map(String::from)).collect::<Vec<String>>(),
        None => return vec![],
    };
    let 挡 = 该挡的(&列);
    if !挡.is_empty() {
        单.insert(
            "appChannels".to_string(),
            Value::Array(列.iter().filter(|颗| !挡.contains(颗)).map(|s| Value::String(s.clone())).collect()),
        );
    }
    挡
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    fn 串(列: &[&str]) -> Vec<String> {
        列.iter().map(|x| x.to_string()).collect()
    }

    #[test]
    fn 生成的那份名单不是空的() {
        /* app_deny.rs 是生成物：这一颗先钉它真被生成出来了、不是空表 ——
           空表等于「硬地板整道闸没了」，比漏几颗严重得多。
           具体几颗不在这一头钉：名单的唯一出处在 sh-load.js 的 APP_DENY，
           一颗一颗对不对得上由 src\tools\probes\gate-seal46.mjs 现场数（它拿桥那一头逐颗比）。
           这一头只留一道"整表被掏空"的地板。 */
        assert!(硬地板.len() >= 40, "硬地板只剩 {} 颗，生成那一趟八成没跑", 硬地板.len());
    }

    #[test]
    fn 会动盘会出网那几颗在名单上() {
        /* 2026-10-11 抓到的那批漏，一颗一颗钉住（点名钉，不写「以上全部」那种糊话） */
        for 颗 in ["dataWipe", "appendPageFile", "pageFileExists", "webTitle", "libWrite", "libRead",
                   "codeCatRename", "backupRun", "backupPick", "backupRoots", "setCloseChoice",
                   "winState", "systemMing", "onRebuildDone", "onIcons"] {
            assert!(在地板上(颗), "名单上少了这一颗：{}", 颗);
        }
    }

    #[test]
    fn 挑出该挡的按原序回() {
        let 点名 = 串(&["mediaState", "dataWipe", "volGet", "packWipe"]);
        assert_eq!(该挡的(&点名), 串(&["dataWipe", "packWipe"]));
    }

    #[test]
    fn 一家什么都没点名就是全不给() {
        assert!(该挡的(&[]).is_empty());
        let mut 单: Value = serde_json::json!({"id":"notes"});
        assert!(挡下该挡的(&mut 单).is_empty());
    }

    #[test]
    fn 挡下的那一手只动通道那一格() {
        let mut 单: Value = serde_json::from_str(
            r#"{"id":"schedule","name":"日程","appChannels":["mediaState","dataWipe","packWipe"],"kvKeys":["日程标签"]}"#
        ).unwrap();
        assert_eq!(挡下该挡的(&mut 单), 串(&["dataWipe", "packWipe"]));
        assert_eq!(单["appChannels"], serde_json::json!(["mediaState"]));
        assert_eq!(单["name"], "日程", "别的一格一个字都不动");
        assert_eq!(单["kvKeys"], serde_json::json!(["日程标签"]));
    }

    #[test]
    fn 没点通道与清单不是对象都不炸() {
        let mut 没点: Value = serde_json::json!({"id":"notes"});
        assert!(挡下该挡的(&mut 没点).is_empty());
        let mut 不是对象: Value = serde_json::json!(7);
        assert!(挡下该挡的(&mut 不是对象).is_empty());
        let mut 一列: Value = serde_json::json!(["a"]);
        assert!(挡下该挡的(&mut 一列).is_empty());
    }

    #[test]
    fn 全在本家那一格上就不摘() {
        let mut 单: Value = serde_json::json!({"appChannels": ["mediaState", "volGet"]});
        assert!(挡下该挡的(&mut 单).is_empty());
        assert_eq!(单["appChannels"], serde_json::json!(["mediaState", "volGet"]),
                   "一颗也没挡就别换那一格 —— 免得把清单顺序白改一遍");
    }
}
