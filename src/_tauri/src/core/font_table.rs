/* 四层里的第一层 · 系统字体那张表怎么合（外46 三 第四组）
   ------------------------------------------------------------
   主进程那边是 parseFontRows（src\pack\main.cjs 772~791 行）：一趟数出的每一行是一张真脸，
   合出来的是「哪一家、底下有哪几档」这两样 ——
     · 一家一条进名单，脸面是中文名，没中文名就用源名；
     · 字重表里同一个名字底下不摆两个同样的档数（系统把一张脸报两遍是常事）；
     · 源名、英文名、中文名三把都登记进表，CSS 里写哪一把都读得到同一份档；
     · 每一家的档从小到大排好。
   壳这边数脸的是 DirectWrite（见 tauri_bind::info_cmds），它把字重直接给成数，
   所以主进程那张「档名 → 数」的对照表（FF_WEIGHT_NUM）在这头没有要翻的东西 —— 那一颗是给
   PowerShell 吐回来的 "Light"/"290" 那种字串准备的，抄过来就是第二份真身。
   数不认（0 或负数）的照样丢掉，不硬给一个数。 */
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};

/// 一张脸：（源名，系统给的档数，脸名，英文名，中文名）—— 顺序跟主进程那五栏一样
#[derive(Debug, Clone, PartialEq)]
pub struct 一行(pub String, pub i32, pub String, pub String, pub String);

/// 一档字重：回给页面的两栏就是 w 和 名（这一对名字是页面那边使的，一个字都不许改）
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct 一档 {
    pub w: i32,
    pub 名: String,
}

/// 合好的那一份：{ fonts: […], faces: { 名字: [{w,名}…] } }
/// （读缓存那一路也要它 —— 盘上那一份 fonts-cache.json 就是这两个字段，两个壳共用）
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct 一张字体表 {
    pub fonts: Vec<String>,
    pub faces: BTreeMap<String, Vec<一档>>,
}

fn 净(s: &str) -> String {
    s.trim().to_string()
}

/// 一行一张脸 → 名单 + 字重表（照 parseFontRows 那四步，一步不多）
pub fn 合表(行: &[一行]) -> 一张字体表 {
    let mut 表 = 一张字体表 { fonts: Vec::new(), faces: BTreeMap::new() };
    for 一行(源, 档, 脸, 英, 中) in 行 {
        let (源, 脸, 英, 中) = (净(源), 净(脸), 净(英), 净(中));
        if 源.is_empty() || 档 <= &0 {
            continue;
        }
        let 脸面 = if 中.is_empty() { 源.clone() } else { 中.clone() };
        if !表.fonts.contains(&脸面) {
            表.fonts.push(脸面);
        }
        认(&mut 表.faces, &源, *档, &脸);
        if !英.is_empty() && 英 != 源 {
            认(&mut 表.faces, &英, *档, &脸);
        }
        if !中.is_empty() && 中 != 源 {
            认(&mut 表.faces, &中, *档, &脸);
        }
    }
    for 档列 in 表.faces.values_mut() {
        档列.sort_by_key(|x| x.w);
    }
    表
}

/// 这个名字底下摆一档：同一个数不摆两遍，脸名空着就拿档数当名字（跟那边 `脸 || String(档)` 同一手）
fn 认(表: &mut BTreeMap<String, Vec<一档>>, 名: &str, 档: i32, 脸: &str) {
    let 列 = 表.entry(名.to_string()).or_default();
    if 列.iter().any(|x| x.w == 档) {
        return;
    }
    let 名 = if 脸.is_empty() { 档.to_string() } else { 脸.to_string() };
    列.push(一档 { w: 档, 名 });
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    fn 行(源: &str, 档: i32, 脸: &str, 英: &str, 中: &str) -> 一行 {
        一行(源.into(), 档, 脸.into(), 英.into(), 中.into())
    }

    #[test]
    fn 一家一条脸面认中文名() {
        let 得 = 合表(&[行("LXGW WenKai Mono", 300, "Light", "LXGW WenKai Mono", "霞鹜文楷等宽"),
                        行("LXGW WenKai Mono", 400, "Regular", "LXGW WenKai Mono", "霞鹜文楷等宽")]);
        assert_eq!(得.fonts, vec!["霞鹜文楷等宽".to_string()]);
        assert_eq!(得.faces["霞鹜文楷等宽"].iter().map(|x| x.w).collect::<Vec<_>>(), vec![300, 400]);
        /* 中文名不是「源」的时候，两把都登记：写英文也读得到同一份档 */
        assert_eq!(得.faces["LXGW WenKai Mono"].len(), 2);
    }

    #[test]
    fn 没有中文名就用源名() {
        let 得 = 合表(&[行("Togalite", 400, "medium", "Togalite", "")]);
        assert_eq!(得.fonts, vec!["Togalite".to_string()]);
        assert_eq!(得.faces["Togalite"][0].名, "medium");
    }

    #[test]
    fn 同一个档数不摆两遍() {
        let 得 = 合表(&[行("甲", 400, "Regular", "", ""), 行("甲", 400, "Normal", "", ""), 行("甲", 700, "Bold", "", "")]);
        assert_eq!(得.faces["甲"], vec![一档 { w: 400, 名: "Regular".into() }, 一档 { w: 700, 名: "Bold".into() }]);
    }

    #[test]
    fn 档从小到大排脸名空了拿数当名() {
        let 得 = 合表(&[行("乙", 700, "", "", ""), 行("乙", 290, "", "", ""), 行("乙", 400, "Regular", "", "")]);
        assert_eq!(得.faces["乙"].iter().map(|x| x.w).collect::<Vec<_>>(), vec![290, 400, 700]);
        assert_eq!(得.faces["乙"][0].名, "290");
    }

    #[test]
    fn 认不出的丢掉空表也是那两栏() {
        let 得 = 合表(&[行("", 400, "x", "", ""), 行("丙", 0, "x", "", ""), 行("丁", -1, "x", "", "")]);
        assert!(得.fonts.is_empty());
        assert!(得.faces.is_empty());
        /* 页面那侧 catch 里退的也是这一份形状（{ fonts:[], faces:{} }），空表不能缺栏 */
        let 文 = serde_json::to_string(&得).unwrap();
        assert_eq!(文, r#"{"fonts":[],"faces":{}}"#);
    }
}
