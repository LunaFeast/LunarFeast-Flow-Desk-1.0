/* 四层里的第一层 · 关于那一屏要的那一列怎么排（外46 三 第四组）
   ------------------------------------------------------------
   主进程那边是 about:info 里那一句「装着的那几家一家一行」（src\pack\main.cjs 2303~2330 行）：
     · 插件那一列：data\plugins\ 里点开头的、下划线开头的那一格不算一家（off.json 那种清单也不是家），
       名字拿清单上的 name，没有就拿 id 顶；号拿清单上的 version，没有就报空串，不编一个号出来。
   号本身（Flow_Desk_<版本>.html 里那一串）由 page_pick 那三颗管，这一格不另开第二份尺。
   真去列目录、读清单在 tauri_bind::info_cmds。
   从前这一格还有一列「最近的升级备份」（update\backups\ 里那几格的名字）—— 覆盖升级不再留旧版本，
   那一列没有东西可列了，2026-10-17 整块撤掉（不留一句"以前这里有备份"）。 */

/// 这一格算不算一家：点开头（隐藏件）与下划线开头（他自己在那一格里的杂件）都不算
pub fn 算一家(名字: &str) -> bool {
    !名字.is_empty() && !名字.starts_with('.') && !名字.starts_with('_')
}

/// 插件那一行报的名字：清单上有 name 就用，没有就拿 id 顶（跟那边 `p.manifest.name || p.id` 同一手）
pub fn 一家名(id: &str, 清单上的名: Option<&str>) -> String {
    match 清单上的名 {
        Some(s) if !s.is_empty() => s.to_string(),
        _ => id.to_string(),
    }
}

/// 插件那一行报的号：清单上没有就报空串（不编一个号出来）
pub fn 一家号(清单上的号: Option<&str>) -> String {
    清单上的号.unwrap_or("").to_string()
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 点与下划线那一格不算一家() {
        assert!(算一家("notes"));
        assert!(!算一家(".DS_Store"));
        assert!(!算一家("_草稿"));
        assert!(!算一家(""));
    }

    #[test]
    fn 名没有就拿id顶号没有就报空() {
        assert_eq!(一家名("notes", Some("你的便签")), "你的便签");
        assert_eq!(一家名("notes", Some("")), "notes");
        assert_eq!(一家名("notes", None), "notes");
        assert_eq!(一家号(Some("1.0.0")), "1.0.0");
        assert_eq!(一家号(None), "");
    }
}
