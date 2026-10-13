/* 四层里的第一层 · 「操作系统现在是深色还是浅色」这一档怎么认（外46 三 第四组）
   ------------------------------------------------------------
   主进程那边一句就完了：`{ dark: !!nativeTheme.shouldUseDarkColors }`（src\pack\main.cjs 1206 行），
   值住在 Chromium 里。这一头没有 Electron 那一层，正路是去读 Chromium 自己读的那一格注册表：
     HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme
   （桌面应用的深浅就是这一颗 DWORD；0 = 深色，非 0 = 浅色，这一格没写过 = 没设过 = 浅色）。
   所以这一格只算「读回来的那个数是不是深色」，真去读那一格在 tauri_bind::info_cmds。
   往回广播那一趟（nativeTheme.on('updated')）不在这一组里，没搬。 */

/// 注册表里那一格的路（子键）
pub const 深浅子键: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";
/// 那一格里头的值名
pub const 深浅值名: &str = "AppsUseLightTheme";

/// 读回来的那颗数（读不到就是没设过）是不是深色
pub fn 是深色(浅色值: Option<u32>) -> bool {
    matches!(浅色值, Some(v) if v == 0)
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 零是深色其余都算浅色() {
        assert!(是深色(Some(0)));
        assert!(!是深色(Some(1)));
        assert!(!是深色(Some(2)));   // 认不出的数不猜，照 Chromium 那一句 ==0 的手
        assert!(!是深色(None));      // 这一格从来没写过 = 系统没设过深色
    }

    #[test]
    fn 那一格的名字是两处一起改的() {
        /* 子键与值名错位就会永远报「浅色」，界面上跟着系统走那一档整条不灵，钉在这儿 */
        assert_eq!(深浅子键, "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize");
        assert_eq!(深浅值名, "AppsUseLightTheme");
    }
}
