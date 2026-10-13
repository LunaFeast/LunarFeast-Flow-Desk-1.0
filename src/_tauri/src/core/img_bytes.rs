/* 四层里的第一层 · 看板节点上那两张图片：字节怎么化成页面吃得下的那一串（外46 三 批二）
   ------------------------------------------------------------
   主进程那边是 img:peek(837) 与 img:open(862)：nativeImage 认得动的格式现量一份、
   认不动的（svg 那一类）原样交给页面自己画，回给页面的一直是 { ok, url, w, h, big } 那一格。
   壳这一头链不着 nativeImage，所以这一格只做"读得懂字节头"的那一手判断：
     · 裸字节 → 页面那一串 base64。这一手最要紧的是中间一步都不许经过字符串 ——
       图片字节是随机的，一旦按 UTF-8 走一遍，非法字节就被换成替换字符、图就烂在半路上。
       所以进来的类型是 &[u8]、出去的是 ASCII 表里挑出来的六个字一组，一颗 to_string 都不掺；
     · 宽高：PNG / JPEG / GIF / BMP / WebP 五种的头读得出来，别的读不出就回 0 0
       —— 跟那一头 nativeImage 认不动时回 w:0, h:0 同一个形状，页面照样画得动；
     · 要缩到多宽：照那一头 Math.max(64, Math.min(1200, Number(maxW) || 360)) 同一把尺；
     · 是不是本地绝对路径、后缀对应的类型（表照 IMG_MIME 搬，认不出退回 image/png，不是 octet-stream）；
     · 那几句回给页面的原话（措辞一个字都不改，界面上读的就是这一句）。
   缩略那一手（比要的宽就现量一份）在壳里没搬：那是 nativeImage 解码 + 重采样，
   这一头只有 std 的字节，没有解码件 —— 现在回的是原图的裸字节包成 data 地址，
   形状与宽高一格都没变，只是节点一多时内存比 Electron 那头多吃一点。 */

/// 后缀 -> 内容类型：表照主进程那张 IMG_MIME 搬，一颗都不许多加
/// 认不出的一律 image/png —— 跟 img:peek 里 `IMG_MIME[ext] || 'image/png'` 同一退法
pub fn 图类型(路径: &str) -> &'static str {
    match 后缀(路径).as_str() {
        ".png" => "image/png",
        ".jpg" | ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".bmp" => "image/bmp",
        ".svg" => "image/svg+xml",
        _ => "image/png",
    }
}

fn 后缀(路径: &str) -> String {
    let 低 = 路径.to_lowercase();
    let 尾 = 低.replace('\\', "/");
    let 尾 = 尾.rsplit('/').next().unwrap_or("");
    match 尾.rfind('.') {
        Some(i) if i > 0 => 尾[i..].to_string(),
        _ => String::new(),
    }
}

/// 这张图太大那一道顶（照那一头 64 * 1024 * 1024）
pub const 太大的字节: u64 = 64 * 1024 * 1024;

/// 要缩到多宽：不是数、零、负的都按 360，再夹到 64~1200（照 Math.max(64, Math.min(1200, Number(maxW) || 360))）
pub fn 要那一档宽(递进来的: Option<f64>) -> u32 {
    let 给 = match 递进来的 {
        Some(v) if v.is_finite() && v != 0.0 => v as i64,
        _ => 360,
    };
    给.clamp(64, 1200) as u32
}

/// 这一串是不是本地绝对路径（照 path.isAbsolute 在 Windows 上的口径：盘符 + 冒号 + 斜杠，或两个斜杠打头）
pub fn 是本地绝对路径(串: &str) -> bool {
    let 字: Vec<char> = 串.chars().collect();
    if 字.len() >= 2 && matches!(字[0], '\\' | '/') && 字[1] == 字[0] {
        return true;
    }
    字.len() >= 3 && 字[0].is_ascii_alphabetic() && 字[1] == ':' && matches!(字[2], '\\' | '/')
}

/* ---------- 裸字节 → 那一串 base64 ---------- */

const 表: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/// 把这团字节化成 base64（带补位）。
/// 中间一步都不许经过字符串：入参是 &[u8]，出的每个字都是从 ASCII 表里挑的，
/// 所以 0xFF 这种非法 UTF-8 字节也照样原样进、原样出（钉它的测试拿一段故意不是 UTF-8 的字节跑一遍）
pub fn 裸字节转那一串(节: &[u8]) -> String {
    let mut 出 = String::with_capacity((节.len() + 2) / 3 * 4);
    for 块 in 节.chunks(3) {
        let a = 块[0] as u32;
        let b = 块.get(1).copied().unwrap_or(0) as u32;
        let c = 块.get(2).copied().unwrap_or(0) as u32;
        let 合 = (a << 16) | (b << 8) | c;
        出.push(表[(合 >> 18) as usize & 63] as char);
        出.push(表[(合 >> 12) as usize & 63] as char);
        出.push(if 块.len() > 1 { 表[(合 >> 6) as usize & 63] as char } else { '=' });
        出.push(if 块.len() > 2 { 表[合 as usize & 63] as char } else { '=' });
    }
    出
}

/// 包成页面那一串 data 地址（照 'data:' + mime + ';base64,' + buf.toString('base64')）
pub fn 包成data地址(mime: &str, 节: &[u8]) -> String {
    format!("data:{};base64,{}", mime, 裸字节转那一串(节))
}

/* ---------- 从字节头认出宽长 ---------- */

fn 大端(节: &[u8], 起: usize) -> Option<u32> {
    Some(((节[起] as u32) << 24) | ((节[起 + 1] as u32) << 16) | ((节[起 + 2] as u32) << 8) | 节[起 + 3] as u32)
}
fn 小端两(节: &[u8], 起: usize) -> Option<u32> {
    Some(节[起] as u32 | ((节[起 + 1] as u32) << 8))
}
fn 小端四(节: &[u8], 起: usize) -> Option<u32> {
    Some(节[起] as u32 | ((节[起 + 1] as u32) << 8) | ((节[起 + 2] as u32) << 16) | ((节[起 + 3] as u32) << 24))
}
fn 三字节小端(节: &[u8], 起: usize) -> Option<u32> {
    Some(节[起] as u32 | ((节[起 + 1] as u32) << 8) | ((节[起 + 2] as u32) << 16))
}

/// JPEG：从 0xFFD8 起一段段跳，撞上 SOF0~SOF15（除了 D8/D9 那两种没有长度的）就取那四个字节
fn 认jpeg(节: &[u8]) -> Option<(u32, u32)> {
    if 节.len() < 4 || 节[0] != 0xFF || 节[1] != 0xD8 {
        return None;
    }
    let mut 到 = 2usize;
    while 到 + 4 < 节.len() {
        if 节[到] != 0xFF {
            return None;
        }
        /* 连续的 0xFF 是填充字节，跳过去 */
        while 到 < 节.len() && 节[到] == 0xFF {
            到 += 1;
        }
        let 牌 = *节.get(到)?;
        到 += 1;
        if 牌 == 0xDA || 牌 == 0xD9 || 牌 == 0x01 || (0xD0..=0xD7).contains(&牌) {
            continue;
        }
        let 长 = 大端两(节, 到)? as usize;
        /* SOF 那一档（0xC0~0xCF，除了 0xC4/0xC8/0xCC）：精度一字节，后面高两字节、宽两字节 */
        if (0xC0..=0xCF).contains(&牌) && !matches!(牌, 0xC4 | 0xC8 | 0xCC) {
            let 高 = 大端两(节, 到 + 3)?;
            let 宽 = 大端两(节, 到 + 5)?;
            if 宽 > 0 && 高 > 0 {
                return Some((宽, 高));
            }
            return None;
        }
        到 += 长;
    }
    None
}

fn 大端两(节: &[u8], 起: usize) -> Option<u32> {
    Some(((节[起] as u32) << 8) | 节[起 + 1] as u32)
}

/// 从一整个文件的字节头认宽长：认不出（svg、坏了的头、没给够字节）就回 None，页面那层照 0 0 那一样画
pub fn 认宽长(节: &[u8]) -> Option<(u32, u32)> {
    /* PNG：签名八字节，IHDR 紧接着就是宽（16 起）与高（20 起） */
    if 节.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) && 节.len() >= 24 {
        let (宽, 高) = (大端(节, 16)?, 大端(节, 20)?);
        return if 宽 > 0 && 高 > 0 { Some((宽, 高)) } else { None };
    }
    /* GIF：'GIF8' 打头，宽长各两个小端字节 */
    if 节.starts_with(b"GIF8") && 节.len() >= 10 {
        return Some((小端两(节, 6)?, 小端两(节, 8)?));
    }
    /* BMP：'BM' 打头，DIB 头里宽是带符号的四字节（高为负是上下倒的那一种，这儿取绝对值） */
    if 节.starts_with(b"BM") && 节.len() >= 26 {
        let 宽 = 小端四(节, 18)?;
        let 高 = (小端四(节, 22)? as i32).unsigned_abs();
        if 宽 > 0 && 高 > 0 {
            return Some((宽, 高));
        }
        return None;
    }
    /* WebP：'RIFF' + 长 + 'WEBP'，再看 12 起那一个子块牌子 */
    if 节.starts_with(b"RIFF") && 节.len() >= 30 && 节.get(8..12) == Some(&b"WEBP"[..]) {
        match &节[12..16] {
            /* 有损：帧头之后第 6、8 字节各取低 14 位 */
            b"VP8 " => {
                let 宽 = 小端两(节, 26)? & 0x3FFF;
                let 高 = 小端两(节, 28)? & 0x3FFF;
                return Some((宽, 高));
            }
            /* 无损：21 起那串位里先是 14 位宽减一、再 14 位高减一（每字节的低位先排） */
            b"VP8L" => {
                let 宽 = 取位(节, 21, 0, 14)? + 1;
                let 高 = 取位(节, 21, 14, 14)? + 1;
                return Some((宽, 高));
            }
            /* 扩展：画布尺寸是 24 起与 27 起各三字节（小端，都要加一） */
            b"VP8X" => {
                let 宽 = 三字节小端(节, 24)? + 1;
                let 高 = 三字节小端(节, 27)? + 1;
                return Some((宽, 高));
            }
            _ => return None,
        }
    }
    if 节.starts_with(&[0xFF, 0xD8]) {
        return 认jpeg(节);
    }
    None
}

/// 从某一起点按"每字节的低位先排"读出那么几位（WebP 无损那一种打包写法）
fn 取位(节: &[u8], 起字节: usize, 位偏: usize, 长: usize) -> Option<u32> {
    let mut 值 = 0u32;
    for i in 0..长 {
        let k = 位偏 + i;
        值 |= (((*节.get(起字节 + k / 8)? >> (k % 8)) & 1) as u32) << i;
    }
    Some(值)
}

/* ---------- 回给页面的那几句原话（措辞照主进程那两颗 handler 一字不动） ---------- */

/// img:peek：递进来的不是本地绝对路径（那一头是 '这一条不是本地绝对路径：' + 那一串）
pub const 递路那句: &str = "这一条不是本地绝对路径：";
/// img:peek：那一个位置 stat 不到
pub const 读不到那句: &str = "这个位置读不到东西";
/// img:peek：stat 到了但不是文件（目录、链接那一类）
pub const 不是文件那句: &str = "这一条不是一个文件";
/// img:peek：超过 64 MB
pub const 太大那句: &str = "这张图太大（超过 64 MB）";
/// img:peek：读字节那一步抛了
pub const 打不开那句: &str = "这张图打不开：";
/// img:open：递进来的不是本地绝对路径（这一句后头不拼那一串，照那一头）
pub const 开图那句: &str = "这一条不是本地绝对路径";
/// img:open：文件不在原来的位置了（后头拼那一串 —— 先自己确认过再交给系统，
/// 免得 Windows 自己弹「找不到文件」那一颗系统模态框把这一路 await 死在这儿）
pub const 不在原处那句: &str = "这个文件不在原来的位置了：";

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 后缀认图类型认不出的一律退成png() {
        assert_eq!(图类型("某处\\那一格\\封面.PNG"), "image/png");
        assert_eq!(图类型("甲/乙/丙.jpeg"), "image/jpeg");
        assert_eq!(图类型("甲/乙/丙.jpg"), "image/jpeg");
        assert_eq!(图类型("那一张.webp"), "image/webp");
        assert_eq!(那一张_svg(), "image/svg+xml");
        assert_eq!(图类型("没有后缀的一份"), "image/png");
        assert_eq!(图类型("点开头"), "image/png");
        assert_eq!(图类型("一首歌.mp3"), "image/png"); /* 与 fs_policy 那张表不同：这一头退 png，不退 octet-stream */
    }

    fn 那一张_svg() -> &'static str {
        图类型("某处/那一张.SVG")
    }

    #[test]
    fn 要那一档宽夹在64到1200() {
        assert_eq!(要那一档宽(None), 360);
        assert_eq!(要那一档宽(Some(f64::NAN)), 360);
        assert_eq!(要那一档宽(Some(0.0)), 360);
        assert_eq!(要那一档宽(Some(-8.0)), 64); /* 负数是给真数：夹到那一档底 64（Math.max(64, -8) 同一手） */
        assert_eq!(要那一档宽(Some(10.0)), 64);
        assert_eq!(要那一档宽(Some(9999.0)), 1200);
        assert_eq!(要那一档宽(Some(420.0)), 420);
    }

    #[test]
    fn 绝对路径两种写法都认相对的不认() {
        /* 盘符那两写法在这儿拼出来写，仓里的字面不留这台机器的地盘 */
        assert!(是本地绝对路径(&format!("{}:\\某格\\那一张.png", 'C')));
        assert!(是本地绝对路径(&format!("{}:/某格/那一张.png", 'C')));
        assert!(是本地绝对路径("\\\\另一台\\那一格\\那一张.png"));
        assert!(是本地绝对路径("//另一台/那一格/那一张.png"));
        assert!(!是本地绝对路径("那一张.png"));
        assert!(!是本地绝对路径("某格\\那一张.png"));
        assert!(!是本地绝对路径(&format!("{}:那一张.png", 'C')));
        assert!(!是本地绝对路径(""));
    }

    #[test]
    fn 裸字节化成那一串一步没过字符串() {
        /* 这一段故意不是合法的 UTF-8：0xFF 0xD8 0xFF 0xE0 是 JPEG 的头。
           只要中间哪一步按字符串走一遍，这几个字节就会被换成替换字符，出来就不是这一串 */
        let 头: Vec<u8> = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00];
        assert_eq!(裸字节转那一串(&头), "/9j/4AAQSkZJRgA=");
        assert_eq!(裸字节转那一串(&[]), "");
        assert_eq!(裸字节转那一串(b"Man"), "TWFu");
        assert_eq!(裸字节转那一串(b"Ma"), "TWE=");
        assert_eq!(裸字节转那一串(b"M"), "TQ==");
        /* data 地址那一串的形状照那一头：'data:' + mime + ';base64,' + 那一串 */
        assert_eq!(
            包成data地址("image/jpeg", &[0xFF, 0xD8]),
            "data:image/jpeg;base64,/9g=".to_string()
        );
    }

    #[test]
    fn 从字节头认得出四种图的宽长() {
        /* PNG：签名 + IHDR 里大端的宽与高 */
        let mut 片 = vec![0x89u8, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
        片.extend_from_slice(&[0; 8]);
        片.extend_from_slice(&[0, 0, 1, 0]); /* 宽 256 */
        片.extend_from_slice(&[0, 0, 0, 200]); /* 长 200 */
        assert_eq!(认宽长(&片), Some((256, 200)));
        /* GIF：小端两字节 */
        let mut 片 = b"GIF89a".to_vec();
        片.extend_from_slice(&[100, 0, 60, 1]);
        assert_eq!(认宽长(&片), Some((100, 316)));
        /* BMP：宽是四字节小端，高是带符号的（负的就是上下倒着存） */
        let mut 片 = b"BM".to_vec();
        片.extend_from_slice(&[0; 16]); /* 前面那 16 字节不认，只把 18 与 22 那两格摆对 */
        片.extend_from_slice(&[40, 0, 0, 0]);
        片.extend_from_slice(&[0xff, 0xff, 0xff, 0xff]); /* 高 -1 → 取绝对值 1 */
        assert_eq!(认宽长(&片), Some((40, 1)));
        /* WebP 扩展档：三字节小端都要加一（24 起与 27 起各三字节是画布的宽与高减一） */
        let mut 片 = b"RIFF\x00\x00\x00\x00WEBPVP8X\x00\x00\x00\x00".to_vec();
        片.extend_from_slice(&[0, 0, 0, 0, 9, 0, 0, 19, 0, 0]);
        assert_eq!(认宽长(&片), Some((10, 20)));
    }

    #[test]
    fn jpeg一段一段跳到那一档才取宽长() {
        let mut 片 = vec![0xFFu8, 0xD8];
        /* APP0 一段：0xFF + 牌子 + 长度两字节 + 内容 */
        片.extend_from_slice(&[0xFF, 0xE0, 0x00, 0x04, b'J', b'F']);
        /* SOF0：0xFF + 牌子 + 长度 17 + 精度 8 + 高 2 + 宽 3 */
        片.extend_from_slice(&[0xFF, 0xC0, 0x00, 0x11, 8]);
        片.extend_from_slice(&[0x00, 0x02, 0x00, 0x03]);
        assert_eq!(认宽长(&片), Some((3, 2)));
        /* 还没跳到 SOF 就撞上 SOS：认不出，回 None（页面那一头照 0 0 画） */
        let 只有头 = vec![0xFFu8, 0xD8, 0xFF, 0xDA, 0x00, 0x00];
        assert_eq!(认宽长(&只有头), None);
    }

    #[test]
    fn 认不出的字节头回空而不是猜() {
        assert_eq!(认宽长(b"<svg viewBox='0 0 1 1'></svg>"), None);
        assert_eq!(认宽长(&[]), None);
        assert_eq!(认宽长(&[0x89, b'P', b'N', b'G']), None); /* 签名都不全 */
    }

    #[test]
    fn 那几句原话与主进程同一串() {
        assert_eq!(递路那句, "这一条不是本地绝对路径：");
        assert_eq!(开图那句, "这一条不是本地绝对路径");
        assert_eq!(读不到那句, "这个位置读不到东西");
        assert_eq!(不是文件那句, "这一条不是一个文件");
        assert_eq!(太大那句, "这张图太大（超过 64 MB）");
        assert_eq!(打不开那句, "这张图打不开：");
        assert_eq!(不在原处那句, "这个文件不在原来的位置了：");
        assert_eq!(太大的字节, 64 * 1024 * 1024);
    }
}
