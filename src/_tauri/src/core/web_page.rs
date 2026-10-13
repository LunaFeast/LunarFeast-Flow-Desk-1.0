/* 四层里的第一层 · 粘网址抓标题那两句判断（外46 三 批二 · 搬 main.cjs 632 那颗的内半）
   ------------------------------------------------------------
   主进程那边是 web:title(632)：页面里 fetch 别的域名会被同源策略拦掉，只能主进程去取。
   那颗自己只做两件事 —— 认这地址取不取得，与把整页原文洗成一句标题；
   中间那一步（真去取回来）是动网络的手，住在第三层。
   认法照那一头一条不改：
     · 只认 http 与 https 两种方案（那一头是 /^https?:$/ 试 u.protocol），别的回空串；
     · <title> 里那一截最长四百字，超了就算没标题（那一头是 [\s\S]{0,400}? 的写法）；
     · 洗完去掉标签、认十进制与十六进制的数字实体、把那一串常用命名实体换成字、
       空白并成一个空格、收尾去掉，最后只留前一百二十个字。
   这里只算字符串，取不取得回来由第三层问。 */

/// 这地址取不取得：方案必须是 http / https，且主机那一截不能空
/// （那一头先 new URL(...) 认格式，再用 /^https?:$/ 试 u.protocol —— 认不出格式与方案不对都是回空串）
pub fn 肯取的地址(串: &str) -> bool {
    let 串 = 串.trim();
    let (方, 余) = match 拆方案(串) {
        Some(v) => v,
        None => return false,
    };
    if 方 != "http" && 方 != "https" {
        return false;
    }
    /* 方案后面得跟两道斜杠（那一头 URL 认的是 //主机 那一截），主机取到下一个分隔为止 */
    let 头 = 余.strip_prefix("//").unwrap_or(余);
    let 主机 = 头.split(['/', '?', '#']).next().unwrap_or("");
    !主机.is_empty()
}

fn 拆方案(串: &str) -> Option<(String, &str)> {
    let 处 = 串.find(':')?;
    let (方, 余) = 串.split_at(处);
    if 方.is_empty() || !方.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.') {
        return None;
    }
    Some((方.to_lowercase(), &余[1..]))
}

/// <title> 那一截的天花板：超了就不算标题（照 [\s\S]{0,400}?）
const 最长一截: usize = 400;
/// 洗完之后留多少个字（照 .slice(0, 120)）
const 留多少字: usize = 120;

/// 从整页原文里取标题：找不到、或者那一截超过四百字，都回空串（那一头也是空串）
pub fn 取标题(文: &str) -> String {
    /* 先找 <title，再跳到它的 '>' 之后，正文到 </title> 为止（大小写不论，照 /i）。
       比法按字节走、只把 ASCII 折大小写 —— 不整页 to_lowercase：那样一改字节长度，
       切出来的那一截就可能落在半个字上（UTF-8 的后续字节都在 0x80 以上，撞不上 ASCII，这样比是安全的） */
    let 起 = match 找不认大小写(文, "<title", 0) {
        Some(i) => i,
        None => return String::new(),
    };
    let 正文起 = match 文[起..].find('>') {
        Some(i) => 起 + i + 1,
        None => return String::new(),
    };
    let 尾 = match 找不认大小写(文, "</title>", 正文起) {
        Some(i) => i,
        None => return String::new(),
    };
    if 尾 < 正文起 {
        return String::new();
    }
    let 那一截 = &文[正文起..尾];
    if 那一截.chars().count() > 最长一截 {
        return String::new();
    }
    洗标题(那一截)
}

/// 从某一起点往后找一串 ASCII 字（不认大小写），回它开头的字节位置
fn 找不认大小写(文: &str, 那一串: &str, 从: usize) -> Option<usize> {
    let 字 = 文.as_bytes();
    let 牌 = 那一串.as_bytes();
    let mut 到 = 从;
    while 到 + 牌.len() <= 字.len() {
        if (0..牌.len()).all(|k| 字[到 + k].to_ascii_lowercase() == 牌[k]) {
            return Some(到);
        }
        到 += 1;
    }
    None
}

/// 把标题那一截洗成页面上那一句：去标签 → 认实体 → 空白并一格 → 去尾空白 → 留一百二十字
fn 洗标题(串: &str) -> String {
    let 去标签 = 挑掉标签(串);
    let 换过 = 换实体(&去标签);
    let mut 出 = String::new();
    let mut 空 = false;
    for c in 换过.chars() {
        if c.is_whitespace() {
            空 = true;
            continue;
        }
        if 出.len() > 0 && 空 {
            出.push(' ');
        }
        空 = false;
        出.push(c);
    }
    出.chars().take(留多少字).collect()
}

/// 去掉夹在尖括号里的那一截（照 .replace(/<[^>]+>/g, '')）
fn 挑掉标签(串: &str) -> String {
    let mut 出 = String::new();
    let mut 在里 = false;
    for c in 串.chars() {
        if c == '<' {
            在里 = true;
        } else if !在里 {
            出.push(c);
        }
        if c == '>' {
            在里 = false;
        }
    }
    出
}

/// 认三种实体写法：&#x十六进制; / &#十进制; / 那一串命名实体
/// 命名实体那张表照那一头那七条换法（&nbsp; &quot; &#39; &apos; &lt; &gt; &amp;），一条都不许多加
fn 换实体(串: &str) -> String {
    let mut 出 = String::new();
    let 字: Vec<char> = 串.chars().collect();
    let mut i = 0usize;
    while i < 字.len() {
        if 字[i] != '&' {
            出.push(字[i]);
            i += 1;
            continue;
        }
        /* 找这一条实体收尾的分号；中间不许夹空白与另一个 &，不然就算原文照抄 */
        let 收 = match (i + 1..字.len()).find(|k| 字[*k] == ';') {
            Some(k) if k - i <= 12 => k,
            _ => {
                出.push('&');
                i += 1;
                continue;
            }
        };
        let 名: String = 字[i + 1..收].iter().collect();
        let 换过 = 认一条(&名);
        match 换过 {
            Some(字串) => {
                出.push_str(&字串);
                i = 收 + 1;
            }
            None => {
                出.push('&');
                i += 1;
            }
        }
    }
    出
}

/// 认一条实体名（不带 & 与分号）：认不出就回 None，让原文照抄下去
fn 认一条(名: &str) -> Option<String> {
    if let Some(余) = 名.strip_prefix("#x").or_else(|| 名.strip_prefix("#X")) {
        let 码 = u32::from_str_radix(余, 16).ok()?;
        return Some(一个码点(码));
    }
    if let Some(余) = 名.strip_prefix('#') {
        let 码: u32 = 余.parse().ok()?;
        return Some(一个码点(码));
    }
    match 名.to_lowercase().as_str() {
        "nbsp" => Some(" ".to_string()),
        "quot" => Some("\"".to_string()),
        "apos" => Some("'".to_string()),
        "lt" => Some("<".to_string()),
        "gt" => Some(">".to_string()),
        "amp" => Some("&".to_string()),
        _ => None,
    }
}

/// 数出来的码点换成一个字：超出 Unicode 那一段就按替换字符（JS 那一头是 fromCodePoint，撞上越界会抛、
/// 整颗 handler 被 catch 掉回空串；这一头不抛、只回一个可见的替换字符，界面上不至于整条标题没了）
fn 一个码点(码: u32) -> String {
    match char::from_u32(码) {
        Some(c) => c.to_string(),
        None => "\u{FFFD}".to_string(),
    }
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 只认http与https那两种方案() {
        assert!(肯取的地址("https://某处.example/那一页"));
        assert!(肯取的地址("http://某处.example"));
        assert!(肯取的地址("HTTP://某处.example")); /* 方案折大小写（URL 那头本来就不分） */
        assert!(!肯取的地址("ftp://某处.example"));
        assert!(!肯取的地址("某处.example/那一页"));
        assert!(!肯取的地址(""));
        /* 那一种「方案对、主机空」的写法 new URL 认不出，那一头 catch 回空串 */
        assert!(!肯取的地址("https://"));
        assert!(!肯取的地址("javascript:alert(1)"));
    }

    #[test]
    fn 找到title就洗成一句() {
        assert_eq!(取标题("<html><head><title>那一页 · 某站</title></head>"), "那一页 · 某站");
        /* 大小写与带属性的那一档都要认（照 /i 与 [^>]*） */
        assert_eq!(取标题("<TITLE lang=x>字面上这一句</title>"), "字面上这一句");
        /* 夹在里面的标签去掉，空白并成一格，尾上的空白去掉 */
        assert_eq!(取标题("<title>\n  甲  <b>乙</b>  丙 \n</title>"), "甲 乙 丙");
        assert_eq!(取标题("没有标题的一页"), "");
        assert_eq!(取标题("<title>开了口没收尾"), "");
    }

    #[test]
    fn 那一截超过四百字就不算标题() {
        let 长 = "字".repeat(401);
        let 页 = format!("<title>{}</title>", 长);
        assert_eq!(取标题(&页), "");
        let 刚好 = "字".repeat(400);
        let 页 = format!("<title>{}</title>", 刚好);
        assert_eq!(取标题(&页).chars().count(), 120); /* 四百字进得来，出来只留一百二十 */
    }

    #[test]
    fn 三种实体写法都认() {
        assert_eq!(取标题("<title>A&amp;B</title>"), "A&B");
        assert_eq!(取标题("<title>&#x4e2d;&#x6587;</title>"), "中文");
        assert_eq!(取标题("<title>&#20013;&#25991;</title>"), "中文");
        assert_eq!(取标题("<title>甲&nbsp;&quot;乙&quot;&apos;&lt;&gt;</title>"), "甲 \"乙\"'<>");
        assert_eq!(取标题("<title>&#39;那一串&#39;</title>"), "'那一串'");
        /* 认不出的写法照原文抄下去，不许吞字、也不许留下半条实体 */
        assert_eq!(取标题("<title>甲 & 乙</title>"), "甲 & 乙");
        assert_eq!(取标题("<title>&没收尾的</title>"), "&没收尾的");
        assert_eq!(取标题("<title>&copy; 某处</title>"), "&copy; 某处");
        /* 越界的码点不至于让整条标题没掉 */
        assert!(!取标题("<title>&#x110000;那一页</title>").is_empty());
    }

    #[test]
    fn 尖括号里的那一截整条去掉() {
        assert_eq!(取标题("<title>前<span>中</span>后</title>"), "前中后");
        /* 收尾那个 > 之后的字要留下 */
        assert_eq!(取标题("<title>甲<script>坏</script>乙</title>"), "甲坏乙");
    }
}
