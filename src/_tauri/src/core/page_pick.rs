/* 四层里的第一层 · 页面那一头的三道纯判断（外46 三）
   ------------------------------------------------------------
   主进程那边是 resolveEntry / latestIn / toUrl / serve 那几颗，直接拿 Node 的 path、fs、
   正则算的。壳这边页面里没有这些件，所以判断挪到这一格，动磁盘与开窗口在第三层：
     · 样式拆段 —— 「Flow_Desk_*.html」这种带星号的样式，拆成头、尾两段，星号吃中间那一串；
     · 版本拆数 —— 中间那一串（1.0.0-alpha+build.9790f8a）拆成一串数，比大小用，非数字段留作次序；
     · 挑最新 —— 先比修改时间，再比版本，再比名字（跟主进程那颗同一口径，取页认最近写过的那一张）；
     · 百分号还原 —— 地址里 %E6%96%B0 这种还原回字，页面名是中文时必须还原；
     · 地址拆相对 —— fdapp://app/<相对> 与 Windows 那层改写后的 http://fdapp.localhost/app/<相对> 都吃得下。
   这里只算字符串与数，盘上到底有没有那一份由第三层问。 */

/// 带星号的样式拆成头尾两段；样式里不许有第二个星号（多了这一颗就当没星号，整串当文件名）
pub fn 样式拆段(样式: &str) -> (String, String) {
    match 样式.split_once('*') {
        Some((头, 尾)) if !尾.contains('*') => (头.to_string(), 尾.to_string()),
        _ => (String::new(), String::new()),
    }
}

/// 名字对不对得上这个样式（对不上回 false）
pub fn 对得上(名字: &str, 样式: &str) -> bool {
    let (头, 尾) = 样式拆段(样式);
    if 头.is_empty() && 尾.is_empty() {
        return 名字 == 样式;
    }
    if 尾.is_empty() {
        return 名字.starts_with(&头);
    }
    名字.starts_with(&头) && 名字.ends_with(&尾) && 名字.len() >= 头.len() + 尾.len()
}

/// 中间那一串吃掉的版本号：星号只吃「数字开头」的那一段（跟主进程那颗正则同一口径）
pub fn 吃得住(名字: &str, 样式: &str) -> Option<String> {
    /* 形状先问 对得上 那一颗 —— 两处各写一遍「头尾对不对得上」就是第二份真身，改一处忘一处 */
    if !对得上(名字, 样式) {
        return None;
    }
    let (头, 尾) = 样式拆段(样式);
    if 头.is_empty() && 尾.is_empty() {
        return Some(String::new());
    }
    let 中 = &名字[头.len()..名字.len() - 尾.len()];
    if 中.is_empty() || !中.starts_with(|c: char| c.is_ascii_digit()) {
        return None;
    }
    Some(中.to_string())
}

/// 一串数：按非数字切开，能读成数的留下（1.0.0-alpha+build.9790f8a → 1、0、0、9790、8）
pub fn 版本拆数(串: &str) -> Vec<u64> {
    let mut 数: Vec<u64> = vec![];
    let mut 当 = String::new();
    for c in 串.chars() {
        if c.is_ascii_digit() {
            当.push(c);
        } else {
            if !当.is_empty() {
                if let Ok(n) = 当.parse::<u64>() {
                    数.push(n);
                }
                当.clear();
            }
        }
    }
    if !当.is_empty() {
        if let Ok(n) = 当.parse::<u64>() {
            数.push(n);
        }
    }
    数
}

/// 两串版本号比大小：短的补零（1.0 与 1.0.0 平）
pub fn 比版本(a: &str, b: &str) -> i32 {
    let x = 版本拆数(a);
    let y = 版本拆数(b);
    let 长 = x.len().max(y.len());
    for i in 0..长 {
        let d = *x.get(i).unwrap_or(&0) as i64 - *y.get(i).unwrap_or(&0) as i64;
        if d != 0 {
            return if d > 0 { 1 } else { -1 };
        }
    }
    0
}

/// 一份候选：名字、它的版本号、修改时间（毫秒）
#[derive(Debug, Clone, PartialEq)]
pub struct 候选 {
    pub 名字: String,
    pub 版本: String,
    pub 改过: u64,
}

/// 挑哪一张开：先认最近写过的那一份，时间打平比版本，再打平比名字（与主进程那颗同口径）
pub fn 挑最新(清单: &[候选]) -> Option<String> {
    let mut 好: Vec<&候选> = 清单.iter().collect();
    if 好.is_empty() {
        return None;
    }
    好.sort_by(|a, b| {
        b.改过
            .cmp(&a.改过)
            .then_with(|| 比版本(&b.版本, &a.版本).cmp(&0))
            .then_with(|| b.名字.cmp(&a.名字))
    });
    Some(好[0].名字.clone())
}

/// 地址里的 %E4%B8%AD 还原回字；不是合法十六进制的百分号原样留着（不当错，页面里本来就不该有）
pub fn 百分号还原(串: &str) -> String {
    let 字: Vec<u8> = 串.bytes().collect();
    let mut 出: Vec<u8> = vec![];
    let mut i = 0;
    while i < 字.len() {
        if 字[i] == b'%' && i + 2 < 字.len() {
            let 两 = &字[i + 1..i + 3];
            if let Ok(值) = u8::from_str_radix(
                &String::from_utf8_lossy(两).replace('+', ""),
                16,
            ) {
                if String::from_utf8_lossy(两).chars().all(|c| c.is_ascii_hexdigit()) {
                    出.push(值);
                    i += 3;
                    continue;
                }
            }
        }
        出.push(字[i]);
        i += 1;
    }
    String::from_utf8_lossy(&出).into_owned()
}

/// 从地址里取出相对那一段。三种形状都吃：
///   fdapp://app/data/词.yaml      （页面里写出来的那种）
///   http://fdapp.localhost/app/x  （Windows 那层把自定义地址改写成的样子）
///   /app/x                        （只剩路径）
pub fn 地址拆相对(整串: &str) -> String {
    let 去头 = if let Some(尾) = 整串.strip_prefix("fdapp://") {
        尾.to_string()
    } else if let Some(尾) = 整串.strip_prefix("http://fdapp.localhost/") {
        尾.to_string()
    } else if let Some(尾) = 整串.strip_prefix("https://fdapp.localhost/") {
        尾.to_string()
    } else if let Some(尾) = 整串.strip_prefix('/') {
        尾.to_string()
    } else {
        整串.to_string()
    };
    let 去问 = match 去头.split_once('?') {
        Some((前, _)) => 前.to_string(),
        None => 去头,
    };
    /* 主机名那一段两种都得剥：`app` 是 Electron 那一棵在用的（main.cjs 的 toUrl），
       `localhost` 是壳这一侧新用的 —— Windows 上 Tauri 只把 http://fdapp.localhost/… 当本地内容，
       门牌写成 fdapp://app/… 会被判成远程，权限层把整组命令挡死（2026-10-12 无窗跑真页量到的）。 */
    let 相 = match 去问
        .strip_prefix("app/")
        .or_else(|| 去问.strip_prefix("localhost/"))
    {
        Some(尾) => 尾.to_string(),
        None => 去问,
    };
    百分号还原(相.trim_start_matches('/'))
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 样式只对得上同形状的名字() {
        assert!(对得上("Flow_Desk_1.0.0-alpha+build.9790f8a.html", "Flow_Desk_*.html"));
        assert_eq!(
            吃得住("Flow_Desk_1.0.0-alpha+build.9790f8a.html", "Flow_Desk_*.html").unwrap(),
            "1.0.0-alpha+build.9790f8a"
        );
        assert!(吃得住("Flow_Desk_help.html", "Flow_Desk_*.html").is_none()); // 星号只吃数字开头的
        assert!(吃得住("别的_1.0.html", "Flow_Desk_*.html").is_none());
        assert!(对得上("index.html", "index.html")); // 没星号就是整串比
    }

    #[test]
    fn 版本比大小补零() {
        assert_eq!(比版本("1.0.1", "1.0.0"), 1);
        assert_eq!(比版本("1.0", "1.0.0"), 0);
        assert_eq!(比版本("1.10.0", "1.9.0"), 1); // 按数比，不是按字比
        assert_eq!(版本拆数("1.0.0-alpha+build.9790f8a"), vec![1u64, 0, 0, 9790, 8]);
    }

    #[test]
    fn 取页认最近写过的那一张() {
        let 清单 = vec![
            候选 { 名字: "旧.html".into(), 版本: "1.0.0".into(), 改过: 100 },
            候选 { 名字: "新.html".into(), 版本: "0.9.0".into(), 改过: 200 },
        ];
        assert_eq!(挑最新(&清单).unwrap(), "新.html"); // 时间赢，哪怕版本号小
        let 打平 = vec![
            候选 { 名字: "甲.html".into(), 版本: "1.0.0".into(), 改过: 200 },
            候选 { 名字: "乙.html".into(), 版本: "1.0.1".into(), 改过: 200 },
        ];
        assert_eq!(挑最新(&打平).unwrap(), "乙.html"); // 时间一样看版本
        assert_eq!(挑最新(&[]), None);
    }

    #[test]
    fn 地址三种形状都拆得出相对() {
        assert_eq!(地址拆相对("fdapp://app/data/词.yaml"), "data/词.yaml");
        /* 壳那一侧的门牌：主机名是 localhost（Tauri 认它是本地内容，命令才过得去权限层） */
        assert_eq!(地址拆相对("fdapp://localhost/x.html"), "x.html");
        assert_eq!(地址拆相对("fdapp://localhost/data/词.yaml"), "data/词.yaml");
        assert_eq!(地址拆相对("http://fdapp.localhost/data/词.yaml"), "data/词.yaml");
        assert_eq!(
            地址拆相对("http://fdapp.localhost/app/Flow_Desk_1.0.html"),
            "Flow_Desk_1.0.html"
        );
        assert_eq!(地址拆相对("/app/icons/open.svg"), "icons/open.svg");
        assert_eq!(地址拆相对("fdapp://app/x.html?v=2"), "x.html");
    }

    #[test]
    fn 百分号还原中文与不认识的写法() {
        assert_eq!(百分号还原("%E8%AF%8D.yaml"), "词.yaml");
        assert_eq!(百分号还原("a%2Fb"), "a/b");           // 编码过的斜杠还原回分隔符
        assert_eq!(百分号还原("100%"), "100%");           // 后头没有两位十六进制就原样留着
        assert_eq!(百分号还原("%zz"), "%zz");
    }
}
