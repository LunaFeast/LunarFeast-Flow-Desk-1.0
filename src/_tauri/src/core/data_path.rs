/* 四层里的第一层 · 数据层那几格：页面递进来的那串名字落在哪一格、能不能落（外46 三 批一）
   ------------------------------------------------------------
   主进程那边是 dataPath(那份文件 567~572 行)：拿 Node 的 path.resolve 把相对那一串并进用户数据那一格，
   再比一比合出来的还在这一格以内不在 —— 不在就地抛「数据路径跑出了用户目录：<那一串>」。
   壳这一头链不着 Node，那一手只能自己写；判断住在这一格，动磁盘的那一手在第三层：
     · 认绝对 —— 「字母 + 冒号 + 斜杠」那种盘符写法、两个斜杠开头的 UNC、还有 Windows 那条改名绕道的
       反斜杠问号前缀（并进来就变成别人的地盘），一律给不出落点；
     · 认爬 —— 段里的 .. 只许在这一格以内退，一退就退到根外面的当场拒。
       这一条和 boot_path 那份不是一回事，也不是抄了两遍：那一份管页面上的虚拟地址，
       顶到根就收住、留在根上；这一份是安全边界，爬出去就不给 —— path.resolve 那一步是真走到根外面去的。
     · 认空 —— 空串与只剩 . 的写法都不给落点（那一头把空串当成这一格自己：读它是「读一个目录」、
       写它是「写一个目录」，两种都是错，形状一样难看，这里直接挡在门口）；
     · 认名字 —— 库文件那五份只按原文比名单，带路径、带盘符的写法进不了名单。
   这里只算字符串与名字；盘上到底有没有那一格、写不写得进去，由第三层问。 */

/// 那一串相对地址落在这一格里的哪一处；给不出落点就是不许（理由由调用方那一句话说）
pub fn 落格(根: &str, 相对: &str) -> Option<String> {
    let 跟 = 去尾分隔(根);
    if 相对.is_empty() {
        return None;
    }
    let 串 = 相对.replace('\\', "/");
    /* 带冒号的两种写法都进不了这一格：字母打头是盘符（换个盘就跑出去了），名字中间带冒号是
       同一份文件里的备用数据流（换个写法就绕过后缀那道闸）—— Windows 的文件名本来也不认它 */
    if 串.contains(':') {
        return None;
    }
    /* 斜杠开头的是绝对地址与 UNC：两个斜杠打头的那一种，正是改名绕道那条口子（问号前缀也在里面） */
    if 串.starts_with('/') {
        return None;
    }
    let mut 段: Vec<&str> = vec![];
    for x in 串.split('/') {
        if x.is_empty() || x == "." {
            continue;
        }
        if x == ".." {
            /* 已经在这一格门口了还要往外退：path.resolve 那一步就走到根外面去了，当场拒 */
            if 段.is_empty() {
                return None;
            }
            段.pop();
            continue;
        }
        /* 这一格里落不了的名字（问号、星号这类 Windows 不认的字符，还有拿点和空格收尾绕法的）一律不给 */
        if !名字干净(x) {
            return None;
        }
        段.push(x);
    }
    /* 一路全是 . 与 .. —— 落点就是这一格自己，同空串那一手 */
    if 段.is_empty() {
        return None;
    }
    Some(format!("{}\\{}", 跟, 段.join("\\")))
}

/// 一段名字干不干净：不带 Windows 留给设备名与通配的字符，也不以点或空格收尾（那两个会被系统吃掉）
fn 名字干净(x: &str) -> bool {
    if x.chars().any(|c| matches!(c, '?' | '*' | '"' | '<' | '>' | '|')) {
        return false;
    }
    !x.ends_with('.') && !x.ends_with(' ')
}

fn 去尾分隔(p: &str) -> String {
    let mut s = p.to_string();
    while s.ends_with('\\') || s.ends_with('/') {
        s.pop();
    }
    s
}

/// 回给页面的那句错：措辞跟主进程那一头一字不差（dataPath 抛的就是这一句 + 页面递进来的那一串）
pub const 跑出那句: &str = "数据路径跑出了用户目录：";
/// 认不出的库文件那一句（那一头是「不认这一份库文件：<名字>」，界面上读的是这一句）
pub const 不认那句: &str = "不认这一份库文件：";

/// 库文件名单：色卡（成套那一份）、色卡（一个一个攒的）、外观方案、待实现清单、图片库清单。
/// 这一串名字就是唯一的闸 —— 和主进程那份 LIB_NAMES(1642 行)、开发服务器那份 LIB_NAMES 同一张表，
/// 漏登记的表现是「界面上改得动、报一句存不进文件、重启就没了」，所以三处都得有（钉它的闸见 gate-libnames 那一类）。
pub const 库名单: [&str; 5] = [
    "palettes.yaml",
    "cards.yaml",
    "looks.yaml",
    "lib-pending.json",
    "images.yaml",
];

/// 这份库文件认不认：按原文比，不折大小写、不拆路径（那一头就是 LIB_NAMES.includes(n)）
pub fn 库名在册(名: &str) -> bool {
    库名单.iter().any(|x| *x == 名)
}

/// 一键清理那张字条的名字：落在数据层那一格里（主进程那边 WIPE_FILE，121 行）
pub const 字条名: &str = "wipe-user.json";

/// 清理那一趟留着的几格（主进程那边 WIPE_KEEP，122 行）：插件那一格是程序不是数据、
/// 原版插件那一格是导入时留的底、日志、搬家那本账 —— 一颗都不许多留，也不许少留。
pub const 留着那几格: [&str; 4] = ["plugins", "plugins-factory", "logs", "relocate.txt"];

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 这一格以内的相对路径放行() {
        assert_eq!(落格("某处\\用户档", "a/b.yaml"), Some("某处\\用户档\\a\\b.yaml".to_string()));
        assert_eq!(落格("某处\\用户档", "notes.json"), Some("某处\\用户档\\notes.json".to_string()));
        assert_eq!(落格("某处\\用户档", "词库/那一份/词.yaml"), Some("某处\\用户档\\词库\\那一份\\词.yaml".to_string()));
        /* 根上带不带尾斜杠都同一个落点，落点里的分隔固定用反斜杠 */
        assert_eq!(落格("某处\\用户档", "a\\b.json"), Some("某处\\用户档\\a\\b.json".to_string()));
        assert_eq!(落格("某处\\用户档\\", "子层\\那一份.md"), Some("某处\\用户档\\子层\\那一份.md".to_string()));
        /* 在这一格以内绕道又落回来的，那一头 path.resolve 也是放行 */
        assert_eq!(落格("某处\\用户档", "a/b/../c.json"), Some("某处\\用户档\\a\\c.json".to_string()));
        assert_eq!(落格("某处\\用户档", "./那一份.md"), Some("某处\\用户档\\那一份.md".to_string()));
    }

    #[test]
    fn 爬出这一格的一律拒() {
        assert_eq!(落格("某处\\用户档", "../x"), None);
        assert_eq!(落格("某处\\用户档", ".."), None);
        assert_eq!(落格("某处\\用户档", "..\\..\\x"), None);
        assert_eq!(落格("某处\\用户档", "a/../../x"), None);
        assert_eq!(落格("某处\\用户档", "a/b/../../.."), None);
        assert_eq!(落格("某处\\用户档", "a/../../"), None);
    }

    #[test]
    fn 空串与只剩点的写法给不出落点() {
        assert_eq!(落格("某处\\用户档", ""), None);
        assert_eq!(落格("某处\\用户档", "."), None);
        assert_eq!(落格("某处\\用户档", "./"), None);
    }

    #[test]
    fn 盘符与双斜杠开头的与改名绕道都不算这一格里的() {
        /* 盘符那两写法：字母 + 冒号 + 斜杠。这里拼出来写，不在仓里的字面上留这台机器的地盘 */
        let 反斜杠盘符 = format!("{}:\\Windows\\x", 'C');
        let 斜杠盘符 = format!("{}:/Windows/x", 'C');
        assert_eq!(落格("某处\\用户档", &反斜杠盘符), None);
        assert_eq!(落格("某处\\用户档", &斜杠盘符), None);
        assert_eq!(落格("某处\\用户档", "C:x"), None); /* 同一手：带冒号就不给进这一格 */
        assert_eq!(落格("某处\\用户档", "/etc/那一份"), None);
        assert_eq!(落格("某处\\用户档", "\\\\另一台\\那一格\\x"), None); /* UNC */
        /* 改名绕道那条口子：反斜杠 + 问号 + 反斜杠 打头，后面再跟一个盘符。
           仓里的字面不留下「字母 + 冒号 + 斜杠」那一串（这台机器的地盘不进公开面），所以拼出来写 */
        let 绕道整串 = format!("\\\\?\\{}:\\Windows\\x", 'C');
        assert_eq!(落格("某处\\用户档", &绕道整串), None);
        let 问号打头 = format!("?\\{}:\\Windows\\x", 'C');
        assert_eq!(落格("某处\\用户档", &问号打头), None);
        assert_eq!(落格("某处\\用户档", "那一份?.json"), None);
        assert_eq!(落格("某处\\用户档", "绕一笔.json."), None);
        assert_eq!(落格("某处\\用户档", "绕一笔.json "), None);
        /* 名字中间带空是正常写法（"Colour v1" 那一类），不该挡 —— 只挡收尾那点与那空格，
           因为系统会把它们吃掉，留进去就成了改名绕道的第二手 */
        assert_eq!(落格("某处\\用户档", "那一 份.json"), Some("某处\\用户档\\那一 份.json".to_string()));
    }

    #[test]
    fn 库文件只认在册的那五份() {
        assert_eq!(库名单.len(), 5);
        for n in 库名单 {
            assert!(库名在册(n), "在册的这一份认不出：{}", n);
        }
        assert!(!库名在册(""));
        assert!(!库名在册("Palettes.yaml")); /* 大小写换个写法也不认（那一头按原文比） */
        assert!(!库名在册("./palettes.yaml")); /* 换个路径写法绕不进名单 */
        assert!(!库名在册("../palettes.yaml"));
        assert!(!库名在册("palettes.yaml "));
    }

    #[test]
    fn 清理那一趟的落点与留着的四格照旧() {
        assert_eq!(字条名, "wipe-user.json");
        assert_eq!(留着那几格, ["plugins", "plugins-factory", "logs", "relocate.txt"]);
        /* 那张字条自己不在这四格里：它自己由开机那一趟删（这一句钉的是「别把它算成要留的」） */
        assert!(!留着那几格.contains(&字条名));
    }
}
