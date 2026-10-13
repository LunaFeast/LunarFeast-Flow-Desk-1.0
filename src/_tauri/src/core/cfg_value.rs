/* 四层里的第一层 · 配置那两格怎么认（外46 三 批一）
   ------------------------------------------------------------
   主进程那边是 readCloseMode / writeCloseMode(那份文件 2343~2353 行) 与 readRimeDir / writeRimeDir(2358~2369)：
   两份都落在 exe 旁用户数据那一格里，明文 json，记事本可看可删。各自的判断是这三件：
     · 关窗那一档只认三串字（ask 问问我 / tray 收进托盘 / quit 直接退出）—— 值不是这三串、整份读不懂、
       压根没那一格，都回「问问我」，绝不因为一份写坏了的明文就把关窗口这一步卡住；
     · 输入法那一格记的是「指过的那串路径」：字段是字串就原样端出来（空串也算指过，意思是别再自动读），
       不是字串就当没记过 —— 这时候才去看默认那一格在不在，那是动磁盘的事，住在第三层；
     · 往回写的形状照 JSON.stringify({ 那一格 }, null, 2)：两格缩进、键名照旧，
       外部编辑器里对比才不会看成整份被改过。
   这里只认串与算形状；读哪一份、写哪一份由第三层动手。 */

/// 关窗那一档：只认这三串，别的写法（换个大小写、多一个空格、编个新词）都归到「问问我」
pub fn 认关法(串: &str) -> &'static str {
    match 串 {
        "tray" => "tray",
        "quit" => "quit",
        _ => "ask",
    }
}

/// 从那份明文里认关窗那一档：读不懂、没那一格、值不是字串 —— 都按「问问我」（照那一头 catch 回 ask）
pub fn 关法从文(明文: &str) -> &'static str {
    let 值: serde_json::Value = match serde_json::from_str(明文) {
        Ok(v) => v,
        Err(_) => return "ask",
    };
    match 值.get("mode").and_then(|m| m.as_str()) {
        Some(m) => 认关法(m),
        None => "ask",
    }
}

/// 从那份明文里取指过的路径：字段不是字串（没这一格、是数、是团东西）就当没记过
pub fn 里路从文(明文: &str) -> Option<String> {
    let 值: serde_json::Value = serde_json::from_str(明文).ok()?;
    值.get("path").and_then(|p| p.as_str()).map(|p| p.to_string())
}

/// 关窗那一档落在用户数据格里的文件名（那一头 CLOSE_FILE，2342 行）
pub const 关法档名: &str = "close-choice.json";
/// 输入法目录落在用户数据格里的文件名（那一头 RIME_FILE，2357 行）
pub const 里路档名: &str = "rime-dir.json";
/// 没记过时去看的那一格叫什么（小企鹅的默认位置：用户 roaming 那一格下的 Rime）
pub const 默认那格: &str = "Rime";

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 关窗那一档只认三串字() {
        assert_eq!(认关法("ask"), "ask");
        assert_eq!(认关法("tray"), "tray");
        assert_eq!(认关法("quit"), "quit");
        assert_eq!(认关法(""), "ask");
        assert_eq!(认关法("Tray"), "ask"); /* 换个大小写就不算这一档 */
        assert_eq!(认关法("hide"), "ask"); /* 自己编的词也不算 */
    }

    #[test]
    fn 明文读不懂就按问问我() {
        assert_eq!(关法从文("{ \"mode\": \"quit\" }"), "quit");
        assert_eq!(关法从文("{\"mode\":\"tray\"}"), "tray");
        assert_eq!(关法从文("{\"mode\": 7}"), "ask"); /* 那一格不是字串 */
        assert_eq!(关法从文("{\"别的\":\"tray\"}"), "ask"); /* 没 mode 那一格 */
        assert_eq!(关法从文(""), "ask");
        assert_eq!(关法从文("一团不是 json 的字"), "ask");
    }

    #[test]
    fn 指过的路径原样端出来() {
        assert_eq!(里路从文(r#"{"path":"那盘里的\\Rime"}"#), Some("那盘里的\\Rime".to_string()));
        /* 空串也算指过 —— 那一头是 typeof p === 'string' 就回，页面拿空串表示「别再自动读」 */
        assert_eq!(里路从文(r#"{"path":""}"#), Some(String::new()));
        assert_eq!(里路从文(r#"{"path": 7}"#), None);
        assert_eq!(里路从文(r#"{"别的":"那里"}"#), None);
        assert_eq!(里路从文(""), None);
    }

    #[test]
    fn 两份明文的名字与默认那一格照旧() {
        assert_eq!(关法档名, "close-choice.json");
        assert_eq!(里路档名, "rime-dir.json");
        assert_eq!(默认那格, "Rime");
    }
}
