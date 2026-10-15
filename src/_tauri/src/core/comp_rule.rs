/* 四层里的第一层 · 插件那一格文件读写的同一把尺（外46 三 批三 · 搬 src\pack\comp-files.cjs 的判断那一半）
   ------------------------------------------------------------
   原件在 src\pack\comp-files.cjs：主进程那三颗（comp:read / write / delete）
   和本地开发那台 http 服务器的 /_comp 都吃同一把尺，所以「哪一家允许读 / 改 / 删哪几份」只有一把。
   壳这一头链不着 Node，那份里「只看字符串就能定」的那几手全挪到这一格，剩下的（读字节、抹掉）在第三层动手。
   从前这一摊还有「列这一格有哪几份文本」「从原厂那一格拷回那一份」「原厂那一格里有哪几份」三颗，
   页面上那颗「改代码」与那颗「恢复出厂」随插件分离第 2 批 2.5 撤了，这三颗跟着撤；
   那一格「原厂」（data\plugins-factory\）也随第 2.6 整格撤 —— 这一格里连「这一家在原厂那一格的哪一格」
   都不再需要算，只剩读 / 写 / 删要用的那几道判断和那几句原话。
   这一格管这么几件事：
     · 名字 —— 包名只认干净字符；相对那一串拆成段，段里不许 . 与 .. ，不许空段；
     · 落点 —— 算完必须落在 plugins\<那一家>\ 里面，跑出去就是不许（原件 locate 第三道闸）；
     · 默认 —— 「读」rel 没给按入口那份 main.js 办，「写」rel 没给就是不许（两种口径各是原件那一行的口径，
       一处都不许多统一、也不许少统一）；
     · 句子 —— 每一道拒回来那句原话（页面上读的就是这一串，一个字都不许改）。
   两张表由哪道闸钉住一致：src\tools\probes\gate-tauricomp46.mjs 现场读 comp-files.cjs 的
   ID_OK / MAX_BYTES 与那几句错话，跟这一格里的常量一颗颗对 —— 不是抄第二份会漂移的表，
   是对面那一份的字面值在这儿有个 Rust 形状的落点，动那边不动这边当场红。
   ------------------------------------------------------------
   两处比原件紧一档，都写在这儿（不是发明新形状，是把原件「折回本家那一格」的两手在门口就拒掉）：
     ① 绝对写法（盘符、冒号、斜杠或 UNC 打头）：原件 segsOf 只挡 . 与 .. ，那种写法会被
        path.join 折成「plugins\<那一家>\<那个盘名>\...」这种 nested 名字（盘名那一格是字母加冒号，
        这里不落成字面，免得仓里出现这台机器的地盘写法）—— 读回来是「这一格里没有这份文件」、
        写下去是系统那句非法目录名，本家以外一个字节都碰不到；壳这一头直接判「路径不干净」，
        回的还是原件那一句（多了个「不敢动手」的门牌），拒的格子还是 ok + msg 那两格；
     ② 包名整串就是 . 或 ..：原件 ID_OK 认这种名字（点和减号都在白名单里），于是
        path.join(plugins, '..') 折到 data\、join(plugins, '.') 折到 plugins\ 自己 —— 递一句就改到别家那一份。
        壳这一头把这两颗当不干净（回的还是原件那句「包名不干净，不敢动手：」）。
   这里的例子全写成「某处\一棵树」那种中性写法，仓里的字面不留下这台机器的地盘。 */

/// 包名白名单里那些字（原件 ID_OK = /^[A-Za-z0-9._-]+$/）：字母、数、点、下划线、减号
fn 包名认这个字(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-'
}

/// 包名干不干净：至少一个字、每个字都在白名单里，且整串不是 . 与 .. （那两种会折到上一格，见文件顶上第 ② 处）
pub fn 包名干净(名: &str) -> bool {
    let mut 有字 = false;
    for c in 名.chars() {
        if !包名认这个字(c) {
            return false;
        }
        有字 = true;
    }
    有字 && 名 != "." && 名 != ".."
}

/// 相对那一串拆成段（原件 segsOf）：反斜杠当成斜杠、打头的斜杠去掉、空段扔掉。
/// 给不出段就是不许：段里有 . 与 .. 、整串空、带冒号（盘符与同一份文件里的备用数据流）、斜杠打头（UNC 与绝对写法）。
pub fn 拆段(相对: &str) -> Option<Vec<String>> {
    let 斜 = 相对.replace('\\', "/");
    if 斜.is_empty() || 斜.starts_with('/') || 斜.contains(':') {
        return None;
    }
    let mut 段: Vec<String> = vec![];
    for x in 斜.split('/') {
        if x.is_empty() {
            continue;
        }
        if x == "." || x == ".." {
            return None;
        }
        段.push(x.to_string());
    }
    if 段.is_empty() {
        return None;
    }
    Some(段)
}

/// 一段落点：这一家（包名）、这一格的门牌（家）、要动手的那一份（落，没给子路径时就是这一格自己）
#[derive(Debug, Clone, PartialEq)]
pub struct 一个落点 {
    pub 包名: String,
    pub 落: String,
    pub 家: String,
}

/// 拼一条 Windows 落点：根去掉尾分隔，段之间一个反斜杠（对齐 Node 的 path.resolve + path.join）
fn 拼路(根: &str, 段: &[&str]) -> String {
    let mut 跟 = 根.to_string();
    while 跟.ends_with('\\') || 跟.ends_with('/') {
        跟.pop();
    }
    let 尾: Vec<String> = 段.iter().map(|s| s.to_string()).collect();
    if 尾.is_empty() {
        return 跟;
    }
    format!("{}\\{}", 跟, 尾.join("\\"))
}

/// 包名 + 相对那一串 → 本家那一格里的落点（原件 locate 那三道闸）。
/// Err 里回的就是给页面的那一句原话；相对没给（None 与空串两种写法，原件都算）就是这一格自己 ——
/// 列清单与抹掉一整格走的就是这一支，读与写各自先按自己的口径把空串换算过才进来。
pub fn 定落点(活的那格: &str, 包名: &str, 相对: Option<&str>) -> Result<一个落点, String> {
    let 包 = 包名.trim();
    if !包名干净(包) {
        return Err(format!("{}{}", 包名不干净那句, 包));
    }
    if 活的那格.is_empty() {
        return Err(目录没定那句.to_string());
    }
    let 家 = 拼路(活的那格, &[包]);
    let 递 = 相对.unwrap_or("");
    if 递.is_empty() {
        return Ok(一个落点 { 包名: 包.to_string(), 落: 家.clone(), 家 });
    }
    let 段 = 拆段(递).ok_or_else(|| format!("{}{}", 路径不干净那句, 递))?;
    let 借: Vec<&str> = 段.iter().map(|s| s.as_str()).collect();
    let 落 = 拼路(&家, &借);
    /* 原件那第三道闸的兜底比对：段里不许 . 与 .. 之后这一支永远中，留着是因为它挡的是「跑出自己的那一格」 */
    if 落 != 家 && !落.starts_with(&format!("{}\\", 家)) {
        return Err(format!("{}{}", 跑出那句, 递));
    }
    Ok(一个落点 { 包名: 包.to_string(), 落, 家 })
}

/// 「读」认的那一份：rel 没给、空串、只剩空白都按入口那份办（原件 read 第一行用的是 trim 判空）
pub fn 读的那份(相对: Option<&str>) -> String {
    match 相对 {
        None => 入口那份.to_string(),
        Some(x) if x.trim().is_empty() => 入口那份.to_string(),
        Some(x) => x.to_string(),
    }
}

/// 「写」认不认这个 rel：空串与只剩空白都不认（原件 write 第一行）
pub fn 写认这份(相对: &str) -> bool {
    !相对.trim().is_empty()
}

/// 一份文件走这条道的上限（原件 MAX_BYTES = 8 * 1024 * 1024）：几 MB 的词库底本走包导入那条道
pub const 上限字节: u64 = 8 * 1024 * 1024;

/// 那一串字节折成「多少 MB」：原件是 Math.round(字节 / 1048576)，四舍五入、不带小数
fn 折成兆(字节: u64) -> i64 {
    (字节 as f64 / 1048576.0).round() as i64
}

/// 读的那一颗嫌太大那一句（原件是「这份文件 NMB，太大不走这条路」）
pub fn 读太大那句(字节: u64) -> String {
    format!("这份文件 {}MB，太大不走这条路", 折成兆(字节))
}

/// 写的那一颗嫌太大那一句（原件这一句省了「文件」两个字：「这份 NMB，太大不走这条路」）
pub fn 写太大那句(字节: u64) -> String {
    format!("这份 {}MB，太大不走这条路", 折成兆(字节))
}

/* ---------- 那几句拒回来的原话：措辞与 comp-files.cjs 一字不差（闸逐句对） ---------- */
/// 包名那一颗不认（原件 locate 第一道闸）
pub const 包名不干净那句: &str = "包名不干净，不敢动手：";
/// 活的那一格还没定下来（原件 locate 第二道闸：主进程那把尺的 live 给了空值）
pub const 目录没定那句: &str = "插件目录还没定下来";
/// 相对那一串拆不出段（原件 locate 第三道闸）
pub const 路径不干净那句: &str = "路径不干净，不敢动手：";
/// 落点跑出了这一家那一格（原件 locate 兜底那一道）
pub const 跑出那句: &str = "路径跑出了这一格：";
/// 这一格里没有要读的这份文件（原件 read；这一格多带一格 path，回的是页面递进来的那一串）
pub const 没这份那句: &str = "这一格里没有这份文件";
/// 写这一颗没说要写哪份（原件 write 第一行）
pub const 没说要写那句: &str = "得说要写这一格里的哪份文件";
/// 抹掉一整格时那一格本来就不在（原件 remove：目录和 <包名>.zip 两处都没抹着东西）
pub const 本来不在那句: &str = "这一格本来就不在";
/* 动手那一层报错时前缀的那几句，也钉在这儿，免得第三层自己另写一套话 */
/// statSync 抛那句的前缀（原件 read）
pub const 读不到那句: &str = "读不到：";
/// readFileSync 抛那句的前缀（原件 read）
pub const 读不出文本那句: &str = "读不出文本：";
/// writeFileSync 那一段抛的前缀（原件 write）
pub const 写不进去那句: &str = "写不进去：";
/// 抹掉那一步抛的前缀（原件 remove，这一格还多带一格 removed）
pub const 删不掉那句: &str = "删不掉：";
/// 入口那一份（原件 read 的默认与列清单排最前那一颗都用它）
pub const 入口那份: &str = "main.js";

#[cfg(test)]
mod 验判断 {
    use super::*;

    /* 根上那处例子写成中性写法：某处\一棵树\data\plugins（原厂那一格随插件分离第 2 批 2.6 撤了） */
    const 活格: &str = "某处\\一棵树\\data\\plugins";

    #[test]
    fn 本家那几份放行() {
        /* 页面递的都是这种：入口那份、插件清单、配方、子层里的一份 */
        assert_eq!(
            定落点(活格, "demo-scene", Some("main.js")),
            Ok(一个落点 {
                包名: "demo-scene".to_string(),
                落: "某处\\一棵树\\data\\plugins\\demo-scene\\main.js".to_string(),
                家: "某处\\一棵树\\data\\plugins\\demo-scene".to_string()
            })
        );
        assert!(定落点(活格, "manifest.json", Some("manifest.json")).is_ok());
        assert!(定落点(活格, "wnw-bank", Some("recipe.json")).is_ok());
        /* 斜杠与反斜杠两种写法同一个落点（原件先 replace(/\\/g,'/') 再 join，join 出的是反斜杠） */
        assert_eq!(
            定落点(活格, "音乐那一家", Some("images/icon.svg")),
            定落点(活格, "音乐那一家", Some("images\\icon.svg"))
        );
        assert_eq!(
            定落点(活格, "a.b_c-d", Some("sub/x/../y.js")).err().unwrap(),
            format!("{}{}", 路径不干净那句, "sub/x/../y.js")
        );
    }

    #[test]
    fn 回退写法一律拒() {
        for 脏 in ["../x.js", "..\\x.js", "..", "a/..", "a/../b.js", "./../x", "../"] {
            assert!(拆段(脏).is_none(), "这种写法居然拆出了段：{}", 脏);
            let 拒 = 定落点(活格, "demo-scene", Some(脏)).err().unwrap();
            assert!(拒.starts_with(路径不干净那句), "{} 回的不是那一句：{}", 脏, 拒);
        }
        /* 单点也一样：原件 segsOf 里 '.' 与 '..' 一条判式 */
        assert!(拆段("./x").is_none());
        assert!(拆段(".").is_none());
    }

    #[test]
    fn 绝对写法当场拒() {
        /* 盘符那两写法与 UNC，拼出来写：仓里的字面不留下这台机器的地盘 */
        let 反斜杠盘符 = format!("{}:\\Windows\\x.js", 'C');
        let 斜杠盘符 = format!("{}:/Windows/x.js", 'C');
        let 问号绕道 = format!("\\\\?\\{}:\\Windows\\x.js", 'C');
        for 脏 in [
            反斜杠盘符.as_str(),
            斜杠盘符.as_str(),
            问号绕道.as_str(),
            "\\\\另一台\\那一格\\x.js",
            "/etc/passwd",
        ] {
            assert!(拆段(脏).is_none(), "绝对写法居然拆出了段：{}", 脏);
            let 拒 = 定落点(活格, "demo-scene", Some(脏)).err().unwrap();
            assert!(拒.starts_with(路径不干净那句), "{} 回的不是那一句：{}", 脏, 拒);
        }
        /* 名字中间带冒号（同一份文件里的备用数据流那种绕法）也不给进这一格 */
        assert!(拆段("那一 份.js:旁流").is_none());
    }

    #[test]
    fn 空串与只剩空白拆不出段() {
        assert_eq!(拆段(""), None);
        assert_eq!(拆段("/"), None);
        assert_eq!(拆段("a//b"), Some(vec!["a".to_string(), "b".to_string()])); /* 中间的空段扔掉，同原件 filter(Boolean) */
        assert!(拆段("  ").is_some()); /* 只剩空白是「一个名字里有空白的段」，原件也这么算 */
        /* 空串与没给两种写法，定落点都算「这一格自己」（原件 rel === undefined || null || '' 那一支） */
        assert_eq!(定落点(活格, "demo-scene", None).unwrap().落, "某处\\一棵树\\data\\plugins\\demo-scene");
        assert_eq!(定落点(活格, "demo-scene", Some("")).unwrap().落, "某处\\一棵树\\data\\plugins\\demo-scene");
    }

    #[test]
    fn 写这一颗不认空rel读那一份按入口() {
        /* 两种口径各照原件，不许被谁统一掉 */
        assert!(!写认这份(""));
        assert!(!写认这份("   "));
        assert!(写认这份("main.js"));
        assert_eq!(读的那份(None), 入口那份);
        assert_eq!(读的那份(Some("")), 入口那份);
        assert_eq!(读的那份(Some("   ")), 入口那份); /* 原件 read 判的是 trim() === '' */
        assert_eq!(读的那份(Some("recipe.json")), "recipe.json");
    }

    #[test]
    fn 改到别人家那一格拒() {
        /* 借回退爬进别家：这一手被回退写法那道闸挡了 */
        assert!(定落点(活格, "demo-scene", Some("../别的家/main.js")).is_err());
        assert!(定落点(活格, "demo-scene", Some("..\\别的家\\main.js")).is_err());
        /* 直接点名别家那一格：包名只认干净字符，带斜杠的一律不落地 */
        assert!(定落点(活格, "别的家/../demo-scene", Some("main.js")).is_err());
        /* 包名整串是 . 与 .. 那两手（原件 ID_OK 认，join 就折到上一格 —— 见文件顶上第 ② 处）：
           壳这一头当场拒，回的还是那句「包名不干净」 */
        assert_eq!(定落点(活格, "..", Some("x.js")).err().unwrap(), format!("{}{}", 包名不干净那句, ".."));
        assert_eq!(定落点(活格, ".", Some("x.js")).err().unwrap(), format!("{}{}", 包名不干净那句, "."));
        assert!(!包名干净(".."));
        assert!(!包名干净("."));
        assert!(!包名干净(""));
    }

    #[test]
    fn 包名白名单与原件同一串字符() {
        assert!(包名干净("demo-scene"));
        assert!(包名干净("wnw.custom_v2"));
        assert!(包名干净("A1"));
        /* 空格、中文、正斜杠、反斜杠、冒号、星号 —— 原件那个字符类一个都不认 */
        for 脏 in ["带 空格", "中文名", "a/b", "a\\b", "a:b", "a*b", "a?b", "a|b", "a\0"] {
            assert!(!包名干净(脏), "这种包名不该认：{}", 脏);
        }
        /* 首尾空白由定落点去掉再比（原件 String(id).trim()） */
        assert!(定落点(活格, "  demo-scene  ", Some("main.js")).is_ok());
        assert_eq!(定落点(活格, "  demo-scene  ", Some("main.js")).unwrap().包名, "demo-scene");
    }

    #[test]
    fn 太大那两句的字数与原件同一式() {
        assert_eq!(上限字节, 8 * 1024 * 1024);
        /* 四舍五入到整兆：原件是 Math.round(字节 / 1048576) */
        assert_eq!(读太大那句(8 * 1024 * 1024 + 1), "这份文件 8MB，太大不走这条路");
        assert_eq!(读太大那句(9 * 1048576), "这份文件 9MB，太大不走这条路");
        assert_eq!(读太大那句(8 * 1048576 + 524288), "这份文件 9MB，太大不走这条路");
        /* 写那一句省了「文件」两个字 —— 原件两句话就不一样，别给改齐了 */
        assert_eq!(写太大那句(9 * 1048576), "这份 9MB，太大不走这条路");
    }

    #[test]
    fn 拒回来的句子与原件一字不差() {
        assert_eq!(包名不干净那句, "包名不干净，不敢动手：");
        assert_eq!(目录没定那句, "插件目录还没定下来");
        assert_eq!(路径不干净那句, "路径不干净，不敢动手：");
        assert_eq!(跑出那句, "路径跑出了这一格：");
        assert_eq!(没这份那句, "这一格里没有这份文件");
        assert_eq!(没说要写那句, "得说要写这一格里的哪份文件");
        assert_eq!(本来不在那句, "这一格本来就不在");
        assert_eq!(读不到那句, "读不到：");
        assert_eq!(读不出文本那句, "读不出文本：");
        assert_eq!(写不进去那句, "写不进去：");
        assert_eq!(删不掉那句, "删不掉：");
        assert_eq!(入口那份, "main.js");
        /* 活的那一格没定下来：回的是那一句，不是「包名不干净」 */
        assert_eq!(定落点("", "demo-scene", Some("main.js")).err().unwrap(), 目录没定那句);
    }

    #[test]
    fn 格名里的尾分隔不吃落点() {
        /* 根上带不带尾斜杠都同一个家（原件 dir() 走的是 path.resolve，尾分隔早被吃掉） */
        assert_eq!(定落点("某处\\一棵树\\data\\plugins\\", "a", Some("x.js")).unwrap().家, "某处\\一棵树\\data\\plugins\\a");
        assert_eq!(定落点("某处\\一棵树\\data\\plugins/", "a", Some("x.js")).unwrap().落, "某处\\一棵树\\data\\plugins\\a\\x.js");
    }
}
