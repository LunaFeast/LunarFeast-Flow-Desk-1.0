/* 四层里的第一层 · 图标那一张表：谁叫什么名、谁让住、地址长什么样（外46 三 第四组）
   ------------------------------------------------------------
   主进程那边是 iconScan / iconKey / iconUrl / iconIn 四颗（src\pack\main.cjs 2104~2176 行）。
   四个出处汇成一张「一个名字一条地址」的表：
     · 树根 icons\ 顶上这一层 —— 名字就是文件名去掉后缀；
     · icons\ 下面那一层子文件夹 —— 名字念作「文件夹名-文件名」，只认一层，再往里钻不算；
     · 数据层 images\（图片库那一格）—— 名字念作「images-文件名」，已有名字不抢；
     · 包里那张 icon.<后缀> —— 名字叫 pack-<包名>，同一张里按后缀先后取第一张（svg 排在 png 前面就赢）。
   这一格只管字符串：后缀吃不吃、名字怎么换算、地址怎么拼、半秒之内该不该再扫一遍。
   真转目录、真问盘上有没有那一格，在 tauri_bind::info_cmds。 */

/// 图标只认这六个后缀（跟主进程那份 ICON_EXT 同一串；顺序也是包里挑「icon.这个先后里第一张」的先后）
pub const 图标后缀: [&str; 6] = [".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"];

/// 扫一次的账留半秒：插件页每列一行都要问一遍「这个包带图没有」，一回要转一圈包目录
pub const 留半秒: u64 = 500;

/// 名字切成（去掉后缀的干，小写后缀）。点开头的暗文件（就叫 ".svg" 的那种）按没有后缀算 ——
/// 跟 Node 那颗 extname 同一口径，差一个字就会把隐藏件当成图标收进表里。
pub fn 拆后缀(名字: &str) -> (String, String) {
    match 名字.rfind('.') {
        Some(i) if i > 0 => {
            let 尾 = 名字[i..].to_lowercase();
            (名字[..i].to_string(), 尾)
        }
        _ => (名字.to_string(), String::new()),
    }
}

/// 这张后缀是不是图标（认不出回 None，和主进程那句 ICON_EXT.includes(ext) 同一档）
pub fn 吃后缀(名字: &str) -> Option<String> {
    let 尾 = 拆后缀(名字).1;
    if 图标后缀.iter().any(|e| *e == 尾) { Some(尾) } else { None }
}

/// 文件名带空格、中文，CSS 类名装不下 —— 页面那侧 sh-ico.js 的 cssName 是同一个换算，两头对得上。
/// 只留 ASCII 的字母数字、下划线和横杠，其余一律换成横杠（跟那句 replace(/[^a-zA-Z0-9_-]/g,'-') 一字不差）。
pub fn 名换算(串: &str) -> String {
    串.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '-' })
        .collect()
}

/// 子文件夹那一层的名字前缀：「文件夹名-」
pub fn 子层前缀(目录名: &str) -> String {
    format!("{}-", 名换算(目录名))
}

/// 这个名字已经有人占了，新来的该不该让住：图片库那一格让（他导进来的一张平铺图不该顶掉界面上那些正经图标），
/// icons\ 自己那两趟不让（后写的盖掉前写的，跟主进程那句 if(keepFirst && out[k]) continue 同一手）。
pub fn 该写入(已有: bool, 让住: bool) -> bool {
    !(已有 && 让住)
}

/// 树里这一格之内的那一串段（用斜杠分开）；不在这格里面回 None
pub fn 剥根(根: &str, 那条: &str) -> Option<String> {
    if !crate::fd_core::boot_path::在根内(根, 那条) {
        return None;
    }
    let 尾 = 那条[去尾斜杠(根).len()..].trim_start_matches('\\');
    if 尾.is_empty() {
        return None;
    }
    Some(尾.replace('\\', "/"))
}

/// encodeURIComponent 那一档：字母数字和 - _ . ! ~ * ' ( ) 原样留着，其余按 UTF-8 一字节一个百分号。
/// 地址里的斜杠由调用处切开再逐段编，编完再接回去。
pub fn 段编码(段: &str) -> String {
    let mut 出 = String::new();
    for c in 段.chars() {
        match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '!' | '~' | '*' | '\'' | '(' | ')' => 出.push(c),
            _ => {
                let mut 节 = [0u8; 4];
                for b in c.encode_utf8(&mut 节).as_bytes() {
                    出.push_str(&format!("%{:02X}", b));
                }
            }
        }
    }
    出
}

/// 一条地址：**根相对** `/<层内相对，逐段编码>?at=<改到毫秒>`。
/// 为什么不写死门牌：Windows 上 WebView2 只把 `http://fdapp.localhost/…` 当本地内容，
/// 页面自己的 `location` 就是那个样子（`location.protocol` 是 `http:`）。CSS 里写 `fdapp://app/…`
/// 等于让本地页面去引一个它够不着的 scheme —— 图标遮罩与底纹全部取不到，屏幕上就是一块纯色或干脆空着
/// （2026-10-14 他报「大量图标不显示 / 不居中」量到的就是这个）。根相对写法三种门牌下都落得对：
/// 壳里 `http://fdapp.localhost/icons/x.svg`、Electron 的 `fdapp://app/icons/x.svg`、开发那台服务器也一样。
/// 尾巴上那个 at：同名换一张图，光是内容变了不算，页面手里那张旧的靠这个数作废。
pub fn 地址(树: &str, 页: &str, 数: &str, 文件: &str, 改到: u64) -> Option<String> {
    if let Some(相) = 剥根(数, 文件) {
        return Some(拼地址("data/", &相, 改到));
    }
    let 相 = 剥根(页, 文件).or_else(|| 剥根(树, 文件))?;
    Some(拼地址("", &相, 改到))
}

fn 拼地址(头: &str, 相: &str, 改到: u64) -> String {
    let 段: Vec<String> = 相.split('/').map(段编码).collect();
    format!("/{}{}?at={}", 头, 段.join("/"), 改到)
}

/// 这一趟要不要真扫一遍：没扫过、或者上回已经过了半秒
pub fn 该重扫(现在: u64, 上次: Option<u64>) -> bool {
    match 上次 {
        None => true,
        Some(上) => 上 > 现在 || 现在 - 上 >= 留半秒,
    }
}

fn 去尾斜杠(p: &str) -> String {
    let mut s = p.to_string();
    while s.ends_with('\\') || s.ends_with('/') {
        s.pop();
    }
    s
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 后缀切开与暗文件不算图标() {
        assert_eq!(拆后缀("open.svg"), ("open".to_string(), ".svg".to_string()));
        assert_eq!(拆后缀("齿轮.PNG"), ("齿轮".to_string(), ".png".to_string()));
        assert_eq!(拆后缀("没有后缀"), ("没有后缀".to_string(), String::new()));
        assert_eq!(拆后缀(".svg"), (".svg".to_string(), String::new())); // 暗文件按没后缀算
        assert_eq!(吃后缀("a.svg"), Some(".svg".to_string()));
        assert_eq!(吃后缀("a.tiff"), None);
        assert_eq!(吃后缀(".svg"), None);
    }

    #[test]
    fn 名字换算把装不下的字换成横杠() {
        assert_eq!(名换算("al left"), "al-left");
        assert_eq!(名换算("对齐"), "--");   // 汉字在 CSS 类名里装不下，一个字换一根横杠
        assert_eq!(名换算("a_b-c9"), "a_b-c9");
        assert_eq!(子层前缀("my dir"), "my-dir-");
    }

    #[test]
    fn 占了名字谁让住() {
        assert!(!该写入(true, true));  // 图片库那一格：已有名字就让
        assert!(该写入(true, false));  // icons\ 自己：后写的盖掉前写的
        assert!(该写入(false, true));
    }

    #[test]
    fn 地址按三层根相对拼并逐段编码() {
        let 树 = "某处\\一棵树";
        let 页 = "某处\\一棵树\\pages";
        let 数 = "某处\\一棵树\\data";
        assert_eq!(
            地址(树, 页, 数, "某处\\一棵树\\icons\\open.svg", 123).unwrap(),
            "/icons/open.svg?at=123"
        );
        assert_eq!(
            地址(树, 页, 数, "某处\\一棵树\\pages\\纹理.svg", 7).unwrap(),
            "/%E7%BA%B9%E7%90%86.svg?at=7"
        );
        assert_eq!(
            地址(树, 页, 数, "某处\\一棵树\\data\\images\\一张.png", 9).unwrap(),
            "/data/images/%E4%B8%80%E5%BC%A0.png?at=9"
        );
        assert_eq!(地址(树, 页, 数, "某处\\另一棵\\icons\\x.svg", 1), None);
    }

    #[test]
    fn 半秒之内不再重扫() {
        assert!(该重扫(1000, None));
        assert!(!该重扫(1000, Some(600)));
        assert!(该重扫(1000, Some(500)));   // 正好半秒就扫（那边是 < 500 才沿用）
        assert!(该重扫(900, Some(1000)));   // 表上的钟倒退也别卡死在旧表上
    }
}
