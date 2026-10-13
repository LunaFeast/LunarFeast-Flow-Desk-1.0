/* 四层里的第一层 · 取色那一张图怎么缩、认回来的字怎么排（外46 三 第四组）
   ------------------------------------------------------------
   主进程那边这一段住在 src\pack\ocr-swatch.ps1（它现编一段 C# 去调 WinRT 的 Windows.Media.Ocr），
   壳这一头不抄那一手 —— 直接拿 windows 这颗的 WinRT 接口（见 tauri_bind::info_cmds），
   所以这儿只留下两处判断：
     · 图要先缩：认字的引擎有尺寸上限，缩到那一档以内还得留够 320 的下限（框小一点认得准一点）；
     · 一行里的词框并成一个框：拿所有词的外接框，退化成一粒点的（宽或高没有）就当 0,0,1,1。
   回给页面的字段名照那一头：{ok,lang,ow,oh,lines:[{t,x,y,w,h}]}。 */

/// 认字之前最长边顶多少留这么多（再小就认不动了）
pub const 最短一边: u32 = 320;
/// 页面没点名时的最长边（那颗 ps1 的 -MaxSide 默认值）
pub const 默认上限: u32 = 1600;

/// 缩到多大：最长边先夹进「点名的那一档」与「引擎吃的最大那一档」，再兜住 320 那道底
pub fn 缩到(宽: u32, 高: u32, 上限: u32, 引擎最大: u32) -> (u32, u32) {
    let 顶 = 上限.min(引擎最大).max(最短一边);
    let 长边 = 宽.max(高) as f64;
    let 倍 = if 长边 <= 0.0 { 1.0 } else { (顶 as f64 / 长边).min(1.0) };
    let 新宽 = ((宽 as f64 * 倍).round().max(1.0)) as u32;
    let 新高 = ((高 as f64 * 倍).round().max(1.0)) as u32;
    (新宽, 新高)
}

/// 一个词框：引擎报回来的 (x, y, 宽, 高)，浮的
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct 词框(pub f64, pub f64, pub f64, pub f64);

/// 回给页面的那一行框（四个整数：左上与宽高）
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
pub struct 行框 {
    pub x: i64,
    pub y: i64,
    pub w: i64,
    pub h: i64,
}

/// 一行里的所有词框并成一个外接框；并出来没有面积的（甚至一个词框都没有）就摆一粒 1x1 在原点
pub fn 并成行(词: &[词框]) -> 行框 {
    let (mut 左, mut 上) = (1e9f64, 1e9f64);
    let (mut 右, mut 下) = (-1e9f64, -1e9f64);
    for 词框(x, y, w, h) in 词 {
        左 = 左.min(*x);
        上 = 上.min(*y);
        右 = 右.max(x + w);
        下 = 下.max(y + h);
    }
    if 右 <= 左 || 下 <= 上 {
        return 行框 { x: 0, y: 0, w: 1, h: 1 };
    }
    行框 { x: 左.round() as i64, y: 上.round() as i64, w: (右 - 左).round() as i64, h: (下 - 上).round() as i64 }
}

/// 这一行要不要：两头空白剃掉，一个字不剩就别往页面上摆
pub fn 要这行(字: &str) -> Option<String> {
    let 净 = 字.trim();
    if 净.is_empty() { None } else { Some(净.to_string()) }
}

/// 报给页面的那几句（措辞跟那一头一致，界面上不许换一句话）
pub const 话读不到: &str = "file not found: ";
pub const 话没语言包: &str = "no OCR language pack installed (Windows settings > time and language > language > OCR)";
pub const 话解码不成: &str = "decode failed";
pub const 话三十秒: &str = "OCR 三十秒没回来";

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 大图缩到点名那一档() {
        assert_eq!(缩到(4000, 3000, 默认上限, 20000), (1600, 1200));
        assert_eq!(缩到(3000, 4000, 默认上限, 20000), (1200, 1600));
    }

    #[test]
    fn 小图不放大长图各边自己算() {
        assert_eq!(缩到(80, 40, 默认上限, 20000), (80, 40));       // 倍率夹在 1，不许放大
        assert_eq!(缩到(1600, 100, 默认上限, 20000), (1600, 100)); // 最长边到了就整条不动
        assert_eq!(缩到(0, 0, 默认上限, 20000), (1, 1));           // 报回来的尺寸是 0 也不给出 0 的图
    }

    #[test]
    fn 顶不过引擎那一档与那道底() {
        assert_eq!(缩到(4000, 4000, 默认上限, 1000), (1000, 1000)); // 引擎只吃 1000
        assert_eq!(缩到(4000, 2000, 100, 20000), (320, 160));        // 点名点得太小也得兜住 320
    }

    #[test]
    fn 词框并成外接框() {
        let 词 = [词框(10.4, 20.6, 30.0, 10.0), 词框(50.0, 5.0, 12.0, 40.0)];
        assert_eq!(并成行(&词), 行框 { x: 10, y: 5, w: 52, h: 40 });
        assert_eq!(并成行(&[]), 行框 { x: 0, y: 0, w: 1, h: 1 });
        /* 一行里全是零面积（引擎偶尔这么报）也别摆一个负数框出去 */
        assert_eq!(并成行(&[词框(7.0, 7.0, 0.0, 0.0)]), 行框 { x: 0, y: 0, w: 1, h: 1 });
    }

    #[test]
    fn 空白行不往页面上摆() {
        assert_eq!(要这行("  C05 "), Some("C05".to_string()));
        assert_eq!(要这行("\t  "), None);
    }
}
