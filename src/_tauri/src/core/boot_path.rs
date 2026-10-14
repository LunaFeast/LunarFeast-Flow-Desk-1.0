/* 四层里的第一层 · 页面上那些"相对地址"该落到盘上哪一格
   ------------------------------------------------------------
   主进程那边是 preload 里那颗 pagePath（那份文件 231~250 行）直接拿 Node 的 path 与 fs 算的。
   壳这边页面里既没有 path 也没有 fs，所以判断挪到这一格、动磁盘的那一手在第三层：
     · 归一 —— 带 ../ 的相对地址顶到根就收住（跟按 URL 口径归一同一效果）；
     · 门牌 —— 带 data/ 开头的落数据层，其余先当页面层、页面层里没有才落数据层；
     · 新建的那一份 —— 文件还不存在时按"上一层在不在"定门牌，免得新文件被写进页面那一层；
     · 三道不许：跑出树外面、用户数据那一格（userdata-*）、都不在这格放行，只把话回出去。
   这里只算字符串，盘上到底有没有那一格由第三层问。 */

/// 两种斜杠换成一种，并把 . 与 .. 收干净；顶到根外面就停在根上
pub fn 归一(根: &str, 相对: &str) -> String {
    let 跟 = 去尾斜杠(根);
    let 串 = 相对.replace('\\', "/");
    let 起 = if 串.starts_with('/') { String::new() } else { 串.clone() };
    let mut 段: Vec<String> = vec![];
    for x in 起.split('/') {
        if x.is_empty() || x == "." { continue; }
        if x == ".." { 段.pop(); continue; }
        段.push(x.to_string());
    }
    if 段.is_empty() { return 跟; }
    format!("{}\\{}", 跟, 段.join("\\"))
}

/// 这道地址是不是要跑出根外面（根自己算在内）
pub fn 在根内(根: &str, 那条: &str) -> bool {
    let 跟 = 去尾斜杠(根);
    那条 == 跟 || 那条.starts_with(&format!("{}\\", 跟))
}

/// 用户数据那一格（userdata-* 那几份）不许页面直接碰，要走 data: 那几条口子
pub fn 用户数据直取(virt: &str) -> bool {
    let 换过 = virt.replace('\\', "/");
    let 段: Vec<&str> = 换过.split('/').filter(|x| !x.is_empty()).collect();
    段.len() >= 2 && 段[0].eq_ignore_ascii_case("data") && {
        /* 比的是字节，不拿一串字的前八枚去切：这一串是地址还原回来的，用户的插图就落在数据层的
           书名底下（data/<书名>/assets/xxx.png，见页面 Img.dir 那一颗），书名三个字共九个字节，
           第 8 枚落在一个字中间 —— 按字切下去就是「byte index is not a char boundary」。
           这一颗跑在 WebView2 回资源的回调里，错撤不回去，整个程序当场没
           （2026-10-14 整本导入与双击章节闪退那一摊的根）。 */
        let 字 = 段[1].as_bytes();
        字.len() > 8 && 字[..8].eq_ignore_ascii_case(b"userdata") && matches!(字[8], b'-' | b'.')
    }
}

/// 门牌候选：data/ 开头只有一格，其余先页面层再数据层
pub fn 候选(根: &str, 页面层: &str, 数据层: &str, virt: &str) -> Vec<String> {
    let 清 = virt.replace('\\', "/").trim_start_matches('/').to_string();
    if 清.split('/').next().unwrap_or("").eq_ignore_ascii_case("data") {
        return vec![归一(根, &清)];
    }
    vec![归一(页面层, &清), 归一(数据层, &清)]
}

fn 去尾斜杠(p: &str) -> String {
    let mut s = p.to_string();
    while s.ends_with('\\') || s.ends_with('/') { s.pop(); }
    s
}

/// 回给页面的那句错（措辞跟主进程那边一字不差，免得界面上换了一句话）
pub const 跑出数据目录: &str = "路径跑出了数据目录：";
pub const 用户数据那句: &str = "用户数据要走 data: 那几条口子，页面不直接碰：";

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 相对地址顶到根就收住() {
        assert_eq!(归一("某处\\一棵树", "data/词.yaml"), "某处\\一棵树\\data\\词.yaml");
        assert_eq!(归一("某处\\一棵树", "../外面.txt"), "某处\\一棵树\\外面.txt");
        assert_eq!(归一("某处\\一棵树", "./a/../b.txt"), "某处\\一棵树\\b.txt");
        assert_eq!(归一("某处\\一棵树\\", "子层\\那一份.md"), "某处\\一棵树\\子层\\那一份.md");
        assert_eq!(归一("某处\\一棵树", ""), "某处\\一棵树");
    }

    #[test]
    fn 根外面的认得出来() {
        assert!(在根内("某处\\一棵树", "某处\\一棵树"));
        assert!(在根内("某处\\一棵树", "某处\\一棵树\\data"));
        assert!(!在根内("某处\\一棵树", "某处\\另一棵"));
        /* 同名不同径的隔壁那一棵不能算在内（少了那道反斜杠就会看走眼） */
        assert!(!在根内("某处\\一棵树", "某处\\一棵树旁"));
    }

    #[test]
    fn 用户数据那一格拦得住() {
        assert!(用户数据直取("data/userdata-fd/那一份"));
        assert!(用户数据直取("data\\userdata-wnw\\x"));
        assert!(用户数据直取("data/userdata.x/a"));
        assert!(!用户数据直取("data/plugins/notes/main.js"));
        assert!(!用户数据直取("data/userdata"));
        assert!(!用户数据直取("词.yaml"));
    }

    /* 2026-10-14 闪退那一摊：这一段从前拿 头[..8] 切，中文书名一进地址就在这个字节上炸，
       而炸在 WebView2 回资源的回调里撤不回去 —— 整个程序没。这里钉的就是「不许炸」。 */
    #[test]
    fn 中文目录名不许按字节切坏() {
        assert!(!用户数据直取("data/叠纸梦/x.png"));                 /* 三字书名 = 9 字节，第 8 枚在字中间 */
        assert!(!用户数据直取("data/奇迹暖暖的背景音/img-1.png"));
        assert!(!用户数据直取("data/ab/x"));                        /* 短于一枚前缀 */
        assert!(!用户数据直取("data/userdata界/x"));                  /* 第九枚字节是中文：不算 userdata 那一格 */
        assert!(用户数据直取("data/userdata-wnw/歌词/一.txt"));        /* 前缀对得上，后面跟着中文照样拦 */
        assert!(!用户数据直取("pages/userdata-fd/x"));                /* 不是 data 底下的那一格就不算 */
    }

    #[test]
    fn 门牌按两层顺序排() {
        let a = 候选("某处\\一棵树", "某处\\一棵树\\页", "某处\\一棵树\\data", "data/词.yaml");
        assert_eq!(a, vec!["某处\\一棵树\\data\\词.yaml".to_string()]);
        let b = 候选("某处\\一棵树", "某处\\一棵树\\页", "某处\\一棵树\\data", "词库/那一份.txt");
        assert_eq!(b, vec!["某处\\一棵树\\页\\词库\\那一份.txt".to_string(), "某处\\一棵树\\data\\词库\\那一份.txt".to_string()]);
    }
}
