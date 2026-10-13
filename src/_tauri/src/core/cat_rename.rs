/* 四层里的第一层 · 词库分类改名要去改代码引用那一摊的判断（外46 三 批三 · 搬 main.cjs 2242~2293 那颗的判断那一半）
   ------------------------------------------------------------
   原件是 main.cjs 里的 catRenameHits + ipcMain.handle('code:catRename')：
   分类名在代码里就是一个带引号的字符串（'对抗.优势'、"桥段模板"），配方 json 里也一样，
   所以只动「整串正好等于旧名」和「整串以旧名 + . 开头」和「前缀那一半自己也是一串」那三种，
   写在界面文字里的同名散文不碰。走树、读原文、写回去、算改到了哪几家 —— 在第三层动手。
   这一格管四件事：
     · 两名 —— 旧名新名各自去掉首尾空白，两种都不许空、不许一样（回的是那一句原话）；
     · 改串 —— 照那颗正则一条条认引号串，命中几处、改成什么（这是全颗里最吃紧的一手，逐字对齐）；
     · 后缀 —— 两处各一张表：源码格那几份只看 .js（不往里钻），本家那一格看 .js 与 .json（往里钻）；
     · 账 —— 回执里 src / comp 两栏怎么分、改到了哪几家怎么认、顶上那一句怎么说。
   闸：src\tools\probes\gate-tauricomp46.mjs 现场读 main.cjs 的 catRenameHits 与那三句原话，
   跟这一格对 —— 那边动了判断（比如多认一种引号、多改一条规则），这边不跟着改就红。
   这里的例子写成「某处\一棵树」那种中性写法，仓里的字面不留下这台机器的地盘。 */

/// 旧名新名先洗一遍（原件头两行：trim 之后两种都不许空、不许一样）；给不出就是不许，理由是那一句原话
pub fn 洗两名(旧: &str, 新: &str) -> Result<(String, String), String> {
    let a = 旧.trim();
    let b = 新.trim();
    if a.is_empty() || b.is_empty() || a == b {
        return Err(不一样那句.to_string());
    }
    Ok((a.to_string(), b.to_string()))
}

/// 「旧名新名得不一样」—— 原件那一句（空名与同名两种写法都回这一句，页面上直接拼在「代码存在错误」后面）
pub const 不一样那句: &str = "旧名新名得不一样";
/// 「这台机器没记下源码在哪儿，代码引用改不了」—— 原件那一句（壳这一头认 FD_SRC，再看树里那一格）
pub const 没记源码那句: &str = "这台机器没记下源码在哪儿，代码引用改不了";

/// 三枚引号字（原件那颗字符类 ["'`]）
fn 是引号(c: char) -> bool {
    c == '"' || c == '\'' || c == '`'
}

/// 一条引号串的三种命中写法怎么改（原件 catRenameHits 里那三个 if，顺序照原样，中一条就走）：
/// 整串正好等于旧名 / 整串以「旧名 + .」开头 / 整串以「旧名 + .」拼出来的前缀收尾（'模块条目.' + mod 那种拼法）
fn 换一条(串: &str, 旧名: &str, 新名: &str) -> Option<String> {
    if 串 == 旧名 {
        return Some(新名.to_string());
    }
    let 旧带点 = format!("{}.", 旧名);
    if 串.starts_with(旧带点.as_str()) {
        /* 原件是 to + body.slice(from.length) —— 切的是旧名那一截，尾点留着（'对抗.优势' → '交锋.优势'） */
        return Some(format!("{}{}", 新名, &串[旧名.len()..]));
    }
    if 串.ends_with('.') {
        /* '模块条目.' + mod 那种拼法：前缀那一半自己就是一串，旧名正好是它。
           原件里这一支其实永远走不到（整串 = 旧名 + '.' 早被上一条接住），照原样留着不做删减 */
        let 去尾 = &串[..串.len() - 1];
        if 去尾 == 旧名 {
            return Some(format!("{}.", 新名));
        }
    }
    None
}

/// 把原文里所有引号串按那三种写法改一遍：回 (新原文, 命中几处)。
/// 照那颗正则的语义来：(["'`])(?:\\.|(?!\1)[\s\S])*?\1 ——
///   · 从一颗引号往后找配对的收尾，中间「反斜杠 + 一个字」整对吃掉（所以 "'" 那种写法不算收尾）；
///   · 反斜杠 + 换行 不成对（正则里 \. 不吃过换行，那一手退回 [\\s\\S] 单吃一个字）；
///   · 找不到收尾的引号就当普通字，往后挪一个字再试（正则那一头就是这个行为）；
///   · 串里有反斜杠、或者串是空的 —— 整条不动（原件那两个 return s）。
pub fn 改写引用(原文: &str, 旧名: &str, 新名: &str) -> (String, usize) {
    let 字: Vec<char> = 原文.chars().collect();
    let mut 出 = String::with_capacity(原文.len());
    let mut 处 = 0usize;
    let mut i = 0usize;
    while i < 字.len() {
        let 头 = 字[i];
        if !是引号(头) {
            出.push(头);
            i += 1;
            continue;
        }
        /* 往里收串，同时找收尾那颗 */
        let mut 串 = String::new();
        let mut j = i + 1;
        let mut 成了 = false;
        while j < 字.len() {
            let c = 字[j];
            if c == '\\' && j + 1 < 字.len() && 字[j + 1] != '\n' {
                串.push(c);
                串.push(字[j + 1]);
                j += 2;
                continue;
            }
            if c == 头 {
                成了 = true;
                break;
            }
            串.push(c);
            j += 1;
        }
        if !成了 {
            /* 这一颗引号配不上对：正则那一头从下一个字再试，这里一模一样 */
            出.push(头);
            i += 1;
            continue;
        }
        if 串.is_empty() || 串.contains('\\') {
            出.push(头);
            出.push_str(&串);
            出.push(头);
            i = j + 1;
            continue;
        }
        match 换一条(&串, 旧名, 新名) {
            Some(新串) => {
                处 += 1;
                出.push(头);
                出.push_str(&新串);
                出.push(头);
            }
            None => {
                出.push(头);
                出.push_str(&串);
                出.push(头);
            }
        }
        i = j + 1;
    }
    (出, 处)
}

/// 顶上那一句（原件最后那个三元）：有命中报「改了 N 个文件 · 共 M 处」，没命中报「代码里没有引用【旧名】的地方」
pub fn 回执那句(改了几份: usize, 共几处: usize, 旧名: &str) -> String {
    if 改了几份 > 0 {
        format!("改了 {} 个文件 · 共 {} 处", 改了几份, 共几处)
    } else {
        format!("代码里没有引用【{}】的地方", 旧名)
    }
}

/// 源码格那一份表（原件 collect(<源码格>\_shared, ['.js'], false)）
pub const 源码那种后缀: [&str; 1] = [".js"];
/// 本家那一格那一份表（原件 collect(<树>\data\plugins, ['.js', '.json'], true)）
pub const 插件那两种后缀: [&str; 2] = [".js", ".json"];

/// 一颗名字的后缀（和「改代码」那把尺同一个口径：最后一个点往后，打头那个点不算，折成小写）
fn 后缀(名: &str) -> String {
    let 字: Vec<char> = 名.chars().collect();
    let 起 = match 字.iter().rposition(|c| *c == '.') {
        Some(i) if i > 0 => i,
        _ => return String::new(),
    };
    字[起..].iter().collect::<String>().to_lowercase()
}

/// 这一份在不在那一张后缀表里（原件 exts.includes(path.extname(nm).toLowerCase())）
pub fn 后缀认得(名: &str, 表: &[&str]) -> bool {
    let s = 后缀(名);
    表.contains(&s.as_str())
}

/// 这一份落在本家那一格里的哪一家（原件 path.relative(插件格, f).split(path.sep)[0]，
/// 空串与 '..' 两种都不算一家 —— 前者是插件格自己，后者是跑出去了）
pub fn 哪一家(插件那格: &str, 落点: &str) -> Option<String> {
    let 根 = 去尾分隔(插件那格);
    let 前缀 = format!("{}\\", 根);
    if !落点.starts_with(前缀.as_str()) {
        return None;
    }
    let 余 = &落点[前缀.len()..];
    let 段 = 余.split(['\\', '/']).next().unwrap_or("");
    if 段.is_empty() || 段 == ".." {
        return None;
    }
    Some(段.to_string())
}

/// 这一份是不是源码格 _shared 那几份（回执里 src / comp 两栏就按这一条分：中了一栏算 src，不中算 comp）
pub fn 是共用底子(源码那一格: &str, 落点: &str) -> bool {
    落点.starts_with(去尾分隔(源码那一格).as_str())
}

fn 去尾分隔(p: &str) -> String {
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
    fn 整串正好等于旧名改一条() {
        let (新, 处) = 改写引用("const 类 = '对抗.优势';", "对抗.优势", "交锋.优势");
        assert_eq!(新, "const 类 = '交锋.优势';");
        assert_eq!(处, 1);
    }

    #[test]
    fn 整串以旧名加点开头跟着改() {
        let (新, 处) = 改写引用("\"桥段模板.开场\"", "桥段模板", "情节模板");
        assert_eq!(新, "\"情节模板.开场\"");
        assert_eq!(处, 1);
        /* 三层分点也照这一手：只换前缀那一段 */
        assert_eq!(改写引用("'大类.小类.小小类'", "大类", "另一类").0, "'另一类.小类.小小类'");
    }

    #[test]
    fn 前缀那一半自己就是一串的拼法也改() {
        /* '模块条目.' + mod 那种：旧名正好是去掉尾点那一半 */
        let (新, 处) = 改写引用("const k = '对抗.' + mod;", "对抗", "交锋");
        assert_eq!(新, "const k = '交锋.' + mod;");
        assert_eq!(处, 1);
        /* 尾点但前面不等旧名 —— 不动 */
        assert_eq!(改写引用("'别的.', ", "对抗", "交锋").1, 0);
    }

    #[test]
    fn 界面文字里的同名散文不碰() {
        /* 不是整串（旧名只是句子里的一段）就不动 —— 原件那三个 if 就是这个意思 */
        let (新, 处) = 改写引用("提示：请用对抗.优势那一类", "对抗.优势", "交锋.优势");
        assert_eq!(新, "提示：请用对抗.优势那一类");
        assert_eq!(处, 0);
        /* 引号里没有旧名也不动 */
        assert_eq!(改写引用("'别的名字'", "对抗", "交锋").1, 0);
    }

    #[test]
    fn 串里有反斜杠或空串整条不动() {
        /* 原件：body.indexOf('\\') >= 0 || !body 就原样退回 */
        assert_eq!(改写引用("'对抗\\优势'", "对抗", "交锋").1, 0);
        assert_eq!(改写引用("''", "对抗", "交锋").1, 0);
        /* 带转义引号的那种串（收尾那颗是被转义的）也不动 */
        let (新, 处) = 改写引用("'它\\'的对抗'", "对抗", "交锋");
        assert_eq!(新, "'它\\'的对抗'");
        assert_eq!(处, 0);
    }

    #[test]
    fn 三种引号都认() {
        assert_eq!(改写引用("`对抗.优势`", "对抗", "交锋").0, "`交锋.优势`");
        assert_eq!(改写引用("\"对抗\"", "对抗", "交锋").0, "\"交锋\"");
        assert_eq!(改写引用("'对抗'", "对抗", "交锋").0, "'交锋'");
    }

    #[test]
    fn 配不上对的引号往后挪一个字再试() {
        /* 打头那颗单引号没有收尾（整行没配上对），正则那一头是从下一个字再试 ——
           后面那对双引号照样改到 */
        let (新, 处) = 改写引用("a = '没关的; b = \"对抗\";", "对抗", "交锋");
        assert_eq!(新, "a = '没关的; b = \"交锋\";");
        assert_eq!(处, 1);
        /* 尾巴上一颗孤立引号（后面什么都没有）也算不上对，原文一字不改 */
        assert_eq!(改写引用("x = 1;", "对抗", "交锋").1, 0);
        assert_eq!(改写引用("x = '", "对抗", "交锋").0, "x = '");
    }

    #[test]
    fn 一处一条连着数() {
        let 原文 = "const a = '对抗', b = ['对抗.优势', '对抗'], c = '桥段模板';";
        let (新, 处) = 改写引用(原文, "对抗", "交锋");
        assert_eq!(处, 3);
        assert_eq!(新, "const a = '交锋', b = ['交锋.优势', '交锋'], c = '桥段模板';");
        /* 换另一颗旧名，一处都不中 */
        assert_eq!(改写引用(原文, "桥段", "情节").1, 0);
    }

    #[test]
    fn 旧名新名两种写法都不许() {
        assert_eq!(洗两名("", "新名").err().unwrap(), 不一样那句);
        assert_eq!(洗两名("  ", "新名").err().unwrap(), 不一样那句);
        assert_eq!(洗两名("旧名", "").err().unwrap(), 不一样那句);
        assert_eq!(洗两名("旧名", "旧名").err().unwrap(), 不一样那句);
        /* 首尾空白去掉后一样也算一样 */
        assert_eq!(洗两名("旧名 ", " 旧名").err().unwrap(), 不一样那句);
        assert_eq!(洗两名(" 旧名 ", " 新名 ").unwrap(), ("旧名".to_string(), "新名".to_string()));
    }

    #[test]
    fn 顶上那一句两种写法() {
        assert_eq!(回执那句(2, 7, "对抗.优势"), "改了 2 个文件 · 共 7 处");
        assert_eq!(回执那句(0, 0, "对抗.优势"), "代码里没有引用【对抗.优势】的地方");
        /* 有文件没中一处不会发生（中零处就不进 hits），照原件：只看份数 */
        assert_eq!(回执那句(1, 0, "旧"), "改了 1 个文件 · 共 0 处");
    }

    #[test]
    fn 两处各一张后缀表() {
        assert_eq!(源码那种后缀, [".js"]);
        assert_eq!(插件那两种后缀, [".js", ".json"]);
        assert!(后缀认得("取词的份.js", &源码那种后缀));
        assert!(!后缀认得("配方.json", &源码那种后缀)); /* 源码格那一趟只看 .js */
        assert!(后缀认得("配方.json", &插件那两种后缀));
        assert!(后缀认得("main.js", &插件那两种后缀));
        assert!(!后缀认得("词库底本.txt", &插件那两种后缀));
        assert!(!后缀认得("没后缀", &插件那两种后缀));
        /* 大小写换个写法照旧认（原件 extname(...).toLowerCase()） */
        assert!(后缀认得("那一份.JS", &插件那两种后缀));
        assert_eq!(后缀(".npmrc"), "");
    }

    #[test]
    fn 改到了哪一家按第一层名字认() {
        assert_eq!(
            哪一家("某处\\一棵树\\data\\plugins", "某处\\一棵树\\data\\plugins\\demo-scene\\main.js").unwrap(),
            "demo-scene"
        );
        assert_eq!(
            哪一家("某处\\一棵树\\data\\plugins\\", "某处\\一棵树\\data\\plugins\\a.b\\sub\\配方.json").unwrap(),
            "a.b"
        );
        /* 插件格自己（相对那一串是空）与跑出去的那种都不算一家 —— 原件那两个 if */
        assert_eq!(哪一家("某处\\一棵树\\data\\plugins", "某处\\一棵树\\data\\plugins"), None);
        assert_eq!(哪一家("某处\\一棵树\\data\\plugins", "某处\\一棵树\\data\\userdata\\x.js"), None);
        /* 源码格那一份不在插件格里，页面上那栏 packs 不该收下它 */
        assert_eq!(哪一家("某处\\一棵树\\data\\plugins", "某处\\源码\\_shared\\取词的份.js"), None);
    }

    #[test]
    fn 回执里src与comp那两栏怎么分() {
        let 源码格 = "某处\\源码\\_shared";
        assert!(是共用底子(源码格, "某处\\源码\\_shared\\取词的份.js"));
        assert!(!是共用底子(源码格, "某处\\一棵树\\data\\plugins\\demo-scene\\main.js"));
        /* 尾分隔带不带都一样认（原件那栏是 String(file).startsWith(SRC_DIR)） */
        assert!(是共用底子("某处\\源码\\_shared\\", "某处\\源码\\_shared\\x.js"));
        /* 只差一层前缀的名字不算中（'某处\\源码\\_shared2\\x.js' 不该被认成共用底子）——
           原件用的是 startsWith(SRC_DIR) 不加尾分隔，这一条照原样：那种落点在这一趟里根本不会出 */
        assert!(是共用底子(源码格, "某处\\源码\\_sharedX\\x.js"));
    }
}
