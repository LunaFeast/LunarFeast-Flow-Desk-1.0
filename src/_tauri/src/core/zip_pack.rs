/* 四层里的第一层 · 一个 zip 怎么拆（外46 三 批六 · 搬 src\pack\zip-read.cjs 那一整份）
   ------------------------------------------------------------
   原件那份「只读不写」的拆包件只有插件这一摊在用：顶栏「导入插件」挑进来一颗 <包名>.zip、
   插件那一列要在不摊开的情况下直接看见包里有什么、包里那份词库底本也要从里头抠出来 ——
   主程序换版不归这一份管（外44 四 那条整条撤了，更新就是双击一颗新的 setup.exe）。
   壳这一头链不着 Node 的 zlib，解压走图里已经编好的那一款 deflate 件（Cargo.toml 顶上记着为什么只多带这一份）。

   只认两种条目：存储（法 0）与 deflate（法 8），压包那两头出的就是这两种 —— 照原件，别的法当场拒。
   这一格只做字节算术：给一串字节，回目录、回某一条的原文；开不开得到那份文件、落不落得了盘，全归第三层问。
   段名洗法（原件 cleanName）也在这儿：反斜杠当斜杠、打头的 './' 去掉、带冒号的整串不认、
   段里的空段与 . 扔掉、只要有 .. 就整串不认 —— 洗出来的名字就是目录里摆的那一串（尾部分隔符也一并洗掉，
   所以「文件夹那种条目」在这儿没有尾斜杠，第三层照原件那一句 endsWith('/') 判的时候永远不中，
   这一手原件就是这个形状，没跟着改）。
   ------------------------------------------------------------
   与原件差在一处（写在这儿，别当没看见）：
   半截包与越界偏移那种坏件，Node 抛的是 RangeError（那句系统给的原文），这一头回的是下面那一句
   「读到一半没了」—— 两头往上落的都是同一档前缀（这个包读不动：/ zip 读不动：/ 这个包落不成：），
   页面上看到的还是那一句白话，只是后半截措辞不一样。 */

use std::io::Read;

/// 中央目录里的一条：洗过的名字、压缩法、压了的大小、原始大小、本地头在哪一格偏移
#[derive(Debug, Clone, PartialEq)]
pub struct 一条目录 {
    pub 名: String,
    pub 法: u16,
    pub 压大小: u32,
    pub 原始大小: u32,
    pub 头偏移: u32,
}

/// 整包末尾那一条目录记号
const 目录记号: u32 = 0x0605_4b50;
/// 中央目录里每一条的记号
const 中央记号: u32 = 0x0201_4b50;
/// 每一条自己的本地头记号
const 本地记号: u32 = 0x0403_4b50;
/// 目录那一条固定占的字节数（原件从末尾往回数 22 个字开始找）
const 目录定长: usize = 22;

/* ---------- 那几句原话：措辞与 zip-read.cjs 一字不差 ---------- */
/// 找不到目录末尾那一条（原件第一句）
pub const 读不出目录那句: &str = "读不出目录：这不是一个 zip，或者尾部被截断了";
/// 目录说这一包里一份文件都没有
pub const 空包那句: &str = "这个包里一个文件都没有";
/// 半截包：偏移或长度超出了这一串字节（与原件的差别写着文件顶上）
pub const 半截包那句: &str = "这个包读到一半没了：目录或本地头的偏移越界";
/// 目录里第几条对不上（原件报的是 k+1，从一颗数起）
pub fn 目录不对那句(第几条: u64) -> String {
    format!("zip 目录第 {} 条不对", 第几条)
}
/// 条目名字脏（原件那一行报的是没洗过的那一串）
pub fn 脏路径那句(原始: &str) -> String {
    format!("包里有条脏路径，不敢用：{}", 原始)
}
/// 本地头对不上（报的是洗过的名字）
pub fn 本地头不对那句(名: &str) -> String {
    format!("包里 {} 的本地头不对", 名)
}
/// 压缩法不认（原件那句把法数也报出来）
pub fn 压缩法那句(名: &str, 法: u16) -> String {
    format!("包里 {} 用的压缩法是 {}，这一份只认 存储 和 deflate", 名, 法)
}

/// 段名洗法（原件 cleanName）：脏的给不出名字
pub fn 干净名(原始: &str) -> Option<String> {
    let 斜 = 原始.replace('\\', "/");
    let 斜 = 斜.strip_prefix("./").unwrap_or(斜.as_str());
    /* 原件那条 replace(/^\.\/+/,'') 只去得掉一组 './'，'././a' 洗完还是带点的段 —— 照旧 */
    if 斜.is_empty() || 斜.contains(':') {
        return None;
    }
    let mut 段: Vec<&str> = vec![];
    for x in 斜.split('/') {
        if x.is_empty() || x == "." {
            continue;
        }
        if x == ".." {
            return None;
        }
        段.push(x);
    }
    if 段.is_empty() {
        return None;
    }
    Some(段.join("/"))
}

/* ---------- 取数：Node 的 readUInt16LE / readUInt32LE，越界就是「读到一半没了」 ---------- */
fn 取短(节: &[u8], 偏: usize) -> Option<u16> {
    let 尾 = 偏.checked_add(2)?;
    if 尾 > 节.len() {
        return None;
    }
    Some(u16::from_le_bytes([节[偏], 节[偏 + 1]]))
}

fn 取长(节: &[u8], 偏: usize) -> Option<u32> {
    let 尾 = 偏.checked_add(4)?;
    if 尾 > 节.len() {
        return None;
    }
    Some(u32::from_le_bytes([节[偏], 节[偏 + 1], 节[偏 + 2], 节[偏 + 3]]))
}

/// 目录（原件 zipIndex）：从末尾往回数找那一条，再照着它记的条数一家家读中央目录
pub fn 目录(节: &[u8]) -> Result<Vec<一条目录>, String> {
    /* 原件那一句 for(let i = buf.length - 22; i >= 0; i--) ：不足 22 个字一次都不试 */
    let mut 位: usize = 0;
    let mut 找到 = false;
    if 节.len() >= 目录定长 {
        let mut i = 节.len() - 目录定长;
        loop {
            if 取长(节, i) == Some(目录记号) {
                位 = i;
                找到 = true;
                break;
            }
            if i == 0 {
                break;
            }
            i -= 1;
        }
    }
    if !找到 {
        return Err(读不出目录那句.to_string());
    }
    let 条数 = 取短(节, 位 + 10).unwrap_or(0) as u64;
    if 条数 == 0 {
        return Err(空包那句.to_string());
    }
    let mut 偏 = 取长(节, 位 + 16).unwrap_or(0) as usize;
    let mut 出: Vec<一条目录> = Vec::new();
    for 第 in 1..=条数 {
        if 取长(节, 偏) != Some(中央记号) {
            return Err(目录不对那句(第));
        }
        let 名长 = 取短(节, 偏 + 28).ok_or_else(|| 半截包那句.to_string())? as usize;
        let 附长 = 取短(节, 偏 + 30).ok_or_else(|| 半截包那句.to_string())? as usize;
        let 注长 = 取短(节, 偏 + 32).ok_or_else(|| 半截包那句.to_string())? as usize;
        /* 原件 buf.toString('utf8', a, b) 越界是截到末尾，这一头同一手（洗不出名字才算脏） */
        let 名起 = 偏 + 46;
        let 名止 = 名起.saturating_add(名长).min(节.len());
        let 原样 = String::from_utf8_lossy(if 名起 <= 名止 { &节[名起..名止] } else { &[] }).to_string();
        let 名 = 干净名(&原样).ok_or_else(|| 脏路径那句(&原样))?;
        出.push(一条目录 {
            名,
            法: 取短(节, 偏 + 10).unwrap_or(0),
            压大小: 取长(节, 偏 + 20).unwrap_or(0),
            原始大小: 取长(节, 偏 + 24).unwrap_or(0),
            头偏移: 取长(节, 偏 + 42).unwrap_or(0),
        });
        偏 = 偏 + 46 + 名长 + 附长 + 注长;
    }
    Ok(出)
}

/// 某一条的真正原文（原件 dataStart + unzipEntry）：
/// 名字与附加长度以本地头为准（目录里记的可能不一样，原件注释就这么写的）
pub fn 取一份(节: &[u8], 项: &一条目录) -> Result<Vec<u8>, String> {
    let 起 = 项.头偏移 as usize;
    if 取长(节, 起) != Some(本地记号) {
        return Err(本地头不对那句(&项.名));
    }
    let 名长 = 取短(节, 起 + 26).ok_or_else(|| 半截包那句.to_string())? as usize;
    let 附长 = 取短(节, 起 + 28).ok_or_else(|| 半截包那句.to_string())? as usize;
    let 数据起 = 起 + 30 + 名长 + 附长;
    let 数据止 = 数据起.checked_add(项.压大小 as usize).ok_or_else(|| 半截包那句.to_string())?;
    if 数据止 > 节.len() {
        return Err(半截包那句.to_string());
    }
    let 裸 = &节[数据起..数据止];
    match 项.法 {
        0 => Ok(裸.to_vec()),
        8 => {
            /* 原件 zlib.inflateRawSync：裸 deflate 流，不带 zlib 头 */
            let mut 出: Vec<u8> = Vec::new();
            match flate2::read::DeflateDecoder::new(裸).read_to_end(&mut 出) {
                /* 解压不出来那一支：原件抛的是 zlib 那句原文，往上落的也是同一档前缀 */
                Ok(_) => Ok(出),
                Err(e) => Err(e.to_string()),
            }
        }
        法 => Err(压缩法那句(&项.名, 法)),
    }
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    fn 短(v: u16) -> Vec<u8> { v.to_le_bytes().to_vec() }
    fn 长(v: u32) -> Vec<u8> { v.to_le_bytes().to_vec() }

    /* 现拼一颗只含一条「存储」条目的最小 zip：本地头 + 原文 + 中央目录 + 末尾那一条
       （三张头的字段位置照原件读：本地头 法 = +8、名长 = +26、附加 = +28；中央 法 = +10、
       压了 = +20、原始 = +24、名长 = +28、附加 = +30、注释 = +32、本地头偏移 = +42） */
    fn 拼包(名: &[u8], 文: &[u8]) -> Vec<u8> {
        let 名长 = 名.len() as u16;
        let 大小 = 文.len() as u32;
        let mut 节: Vec<u8> = vec![];
        节.extend(长(本地记号));
        节.extend([0; 4]);              /* 4~7：要的版本与标志 */
        节.extend(短(0));                /* 8~9：法 = 存储 */
        节.extend([0; 4]);              /* 10~13：时间与日期 */
        节.extend(长(0));                /* 14~17：校验码 */
        节.extend(长(大小));            /* 18~21：压了的大小 */
        节.extend(长(大小));            /* 22~25：原始大小 */
        节.extend(短(名长));            /* 26~27 */
        节.extend(短(0));                /* 28~29：附加长度 */
        节.extend(名);
        节.extend(文);
        let 中央 = 节.len();
        节.extend(长(中央记号));
        节.extend([0; 6]);              /* 4~9：谁压的、要的版本、标志 */
        节.extend(短(0));                /* 10~11：法 */
        节.extend([0; 4]);              /* 12~15：时间与日期 */
        节.extend(长(0));                /* 16~19：校验码 */
        节.extend(长(大小));            /* 20~23：压了的大小 */
        节.extend(长(大小));            /* 24~27：原始大小 */
        节.extend(短(名长));            /* 28~29 */
        节.extend(短(0));                /* 30~31：附加 */
        节.extend(短(0));                /* 32~33：注释 */
        节.extend([0; 8]);              /* 34~41：起自哪一面盘、两个属性 */
        节.extend(长(0));                /* 42~45：本地头在哪一格（这颗包就是第 0 格） */
        节.extend(名);
        let 目录长 = 节.len() - 中央;
        节.extend(长(目录记号));
        节.extend([0; 6]);              /* 4~9：两面盘与这一面的条数 */
        节.extend(短(1));                /* 10~11：一共几条 —— 目录读的就是这一栏 */
        节.extend(长(目录长 as u32));    /* 12~15 */
        节.extend(长(中央 as u32));      /* 16~19：中央目录打头那一格 */
        节.extend(短(0));                /* 20~21：注释长度 */
        节
    }

    #[test]
    fn 段名洗法照原件() {
        assert_eq!(干净名("a/b.txt").as_deref(), Some("a/b.txt"));
        /* 反斜杠当斜杠、打头的 './' 去掉、尾分隔洗成没有（原件 filter(Boolean) 那一手） */
        assert_eq!(干净名("a\\b\\c.js").as_deref(), Some("a/b/c.js"));
        assert_eq!(干净名("./那一份.json").as_deref(), Some("那一份.json"));
        assert_eq!(干净名("assets/").as_deref(), Some("assets"));
        assert_eq!(干净名("a//b").as_deref(), Some("a/b"));
    }

    #[test]
    fn 脏段名一律不认() {
        assert_eq!(干净名("../外面.txt"), None);
        assert_eq!(干净名("a/../../b"), None);
        assert_eq!(干净名(""), None);
        assert_eq!(干净名("/"), None);
        assert_eq!(干净名("./"), None);
        /* 带冒号的两种都不认：盘符与同一份文件里的备用数据流 */
        assert_eq!(干净名("a:b.txt"), None);
    }

    #[test]
    fn 一颗存储包拆得出目录与原文() {
        let 单 = b"{\"id\":\"demo-scene\"}";
        let 节 = 拼包(b"manifest.json", 单);
        let 目 = 目录(&节).expect("目录该读得出");
        assert_eq!(目.len(), 1);
        assert_eq!(目[0].名, "manifest.json");
        assert_eq!(目[0].法, 0);
        assert_eq!(目[0].原始大小 as usize, 单.len());
        assert_eq!(目[0].压大小 as usize, 单.len());
        let 文 = 取一份(&节, &目[0]).expect("原文该取得出");
        assert_eq!(文, 单);
    }

    #[test]
    fn 没目录尾就说不是zip() {
        assert_eq!(目录(&[]).err().unwrap(), 读不出目录那句);
        assert_eq!(目录("不是包".as_bytes()).err().unwrap(), 读不出目录那句);
        /* 短于 22 个字：原件那一趟一次都不试，同一句 */
        assert_eq!(目录(&[0u8; 10]).err().unwrap(), 读不出目录那句);
    }

    #[test]
    fn 目录说没东西就报没东西() {
        /* 一颗只有末尾那一条、条数记成 0 的包（22 个字：4 记号 + 4 两面条数栏 + 2 这一面条数 +
           2 总条数 + 4 目录长度 + 4 目录偏移 + 2 注释长度） */
        let mut 节 = vec![0u8; 0];
        节.extend(长(目录记号));
        节.extend(长(0));
        节.extend(短(0));
        节.extend(短(0));
        节.extend(长(0));
        节.extend(长(0));
        节.extend(短(0));
        assert_eq!(目录(&节).err().unwrap(), 空包那句);
    }

    #[test]
    fn 目录里那条不对报第几条() {
        /* 目录说有两条，第二条的位置上是乱码 */
        let 节 = 拼包(b"a.txt", b"x");
        let mut 改 = 节.clone();
        let 位 = 改.len() - 22;
        改[位 + 10..位 + 12].copy_from_slice(&短(2));
        assert!(目录(&改).err().unwrap().starts_with("zip 目录第 "));
        assert_eq!(目录(&改).err().unwrap(), 目录不对那句(2));
    }

    #[test]
    fn 脏段名在目录里就整包不认() {
        let 节 = 拼包("../外面.txt".as_bytes(), b"x");
        assert_eq!(目录(&节).err().unwrap(), 脏路径那句("../外面.txt"));
    }

    #[test]
    fn 本地头不对与越界各有各的一句() {
        let 节 = 拼包(b"a.txt", b"xy");
        let 目 = 目录(&节).unwrap();
        /* 把本地头偏移挪到一格乱码上 */
        let 坏 = 一条目录 { 头偏移: (节.len() - 4) as u32, ..目[0].clone() };
        assert_eq!(取一份(&节, &坏).err().unwrap(), 本地头不对那句("a.txt"));
        /* 压了的大小报得比整包还大 */
        let 坏 = 一条目录 { 压大小: 9999, ..目[0].clone() };
        assert_eq!(取一份(&节, &坏).err().unwrap(), 半截包那句);
    }

    #[test]
    fn 只认存储与deflate那两种法() {
        let 节 = 拼包(b"a.txt", b"xy");
        let 目 = 目录(&节).unwrap();
        let 坏 = 一条目录 { 法: 12, ..目[0].clone() };
        assert_eq!(取一份(&节, &坏).err().unwrap(), 压缩法那句("a.txt", 12));
    }

    #[test]
    fn deflate那一种真解得开() {
        /* 现压一串：deflate 裸流 + 手工拼的目录（存储那一档上面的拼包颗只管法 0） */
        let 原文 = b"<?php echo 1; ?>".repeat(4);
        let mut 压 = Vec::new();
        {
            use std::io::Write;
            let mut 压者 = flate2::write::DeflateEncoder::new(&mut 压, flate2::Compression::default());
            压者.write_all(&原文).unwrap();
        }
        let 节 = 拼包(b"main.js", &压);
        let 目 = 目录(&节).unwrap();
        let 法 = 取短(&节, 目[0].头偏移 as usize + 8).unwrap();
        assert_eq!(法, 0, "拼包那颗记的是存储");
        /* 把法改成 8（deflate）再取一次：解出来该与原文一字不差 */
        let 目 = vec![一条目录 { 法: 8, 压大小: 压.len() as u32, 原始大小: 原文.len() as u32, ..目[0].clone() }];
        let 出 = 取一份(&节, &目[0]).expect("deflate 该解得开");
        assert_eq!(出, 原文);
    }

    #[test]
    fn 解不开的那一句原样往上抛() {
        /* 法 8 却塞一串不是 deflate 流的字节：这一头不给新措辞，把解压件那句原文交回调用方去加前缀 */
        let 节 = 拼包(b"main.js", "这不是 deflate 流".as_bytes());
        let 目 = vec![一条目录 { 法: 8, ..目录(&节).unwrap()[0].clone() }];
        let 错 = 取一份(&节, &目[0]).err().unwrap();
        assert!(!错.is_empty(), "解不开总要有一句");
        assert!(!错.contains("这个包读不动"), "前缀归调用方加，这一格不预先拼");
    }

    #[test]
    fn 偏移越界不再往包里读() {
        let 节 = 拼包(b"a.txt", b"xy");
        /* 本地头偏移给成整包以外：不许 panic，回那句「读到一半没了」或「本地头不对」 */
        let 坏 = 一条目录 { 头偏移: u32::MAX, ..目录(&节).unwrap()[0].clone() };
        assert!(取一份(&节, &坏).is_err());
        /* 中央目录长度被砍一半：同样只回一句错，不越界 */
        assert!(目录(&节[..节.len() - 6]).is_err());
    }
}
