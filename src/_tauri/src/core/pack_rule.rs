/* 四层里的第一层 · 插件那一摊的尺（外46 三 批六搬前两摊、批七再补三摊 · 对 src\pack\main.cjs 1751~1887 与 1892~2072）
   ------------------------------------------------------------
   原件那五颗通道（pack:list / pack:file / pack:set / pack:import / pack:wipe）在 main.cjs 里靠这些 helper 干活：
   packScan()（1797 行）、packOne(dir,name,kind)（1774 行）、packRaw(id,rel)（1855 行）、packHas(id)（1844 行）、
   packAfterSet()（1892 行）、packManifestOf(buf)（1918 行）、walkPackDir(dir,rel,out)（1926 行）、
   expandZipPack(dir,buf,id)（1936 行）、keepOriginal(id)（1988 行）。
   三颗里「开不开得到盘、读不读得出字节」那一半归第三层动手；这一格只收「拿一串名字或一串字节就能定」的那几手：
     · 名字 —— 哪几个名字不进这一列（打头的点与下划线、那两份名单本体）、压缩包名怎么折成包名、
       包名那一名干不干净、末段与后缀怎么折（导入那一条的兜底包名）；
     · 三趟 —— 文件夹先收、同名 zip 与同名自有容器后收（原件 1794~1796 行那段理由，整段抄在下面 分成三趟 顶上；
       第三趟是插件分离第 3 批 3.4 加的：自有容器与 zip 同属"运输形状"，赢家永远是那一格）；
     · 名单 —— 那两份清单（off.json / installed.json）各种写法读成几颗名字、老那份换算成「记为卸掉」的哪几家、
       页面递的「开着的」换成落盘的「卸掉的」（1907 行那一手）；
     · 段名 —— pack:file 那一路的相对写法怎么洗、哪一种递法当场不认（原件 packRaw 头两行）、
       摊包那一条 zip 条目该怎么认（原件 expandZipPack 1944~1948 行那四手）；
     · 大小 —— 24MB 那道闸的数与那句白话（原件 1879~1884 行）；
     · 落点 —— 导入那一条页面递的门牌折成绝对落点（原件 1999 行 path.resolve 那一手）、
       清数据那一条还剩在数据层根以内不是、插件那一格留不留得下（2067~2068 行那两把闸）；
     · 句子 —— 三种读不成的原话 + 取不到那份的原话 + 读不出文本的前缀 + 写名单那四句 + 导入那十句 +
       清数据那一句理由，页面上摆的就是这一串。
   字面值由闸钉着：src\tools\probes\gate-tauripack46.mjs 现场读 main.cjs 那两段逐字对，动那边不动这边当场红。
   ------------------------------------------------------------
   与原件差在两处（写在这儿，别当没看见）：
   ① Node 的 readFileSync(...,'utf8') 与 toString('utf8') 遇到不是 UTF-8 的字节是替换成 U+FFFD、不抛，
     这一头读文本认严格 UTF-8：同样一串字节在这儿会落到「读不出文本：」/「插件清单读不成那份格式：」那一句。
     落点还是原件那两格（ok + msg / id + kind + error），页面上看到的还是那一句白话，只是后半截措辞不一样。
   ② 包名那道闸（原件 /^[A-Za-z0-9._-]+$/）整串就是 '.' 与 '..' 两种名字时，原件认它干净，
     于是 path.join(plugins, '..') 折到 data\、join(plugins, '.') 折到 plugins\ 自己 ——
     接着那一道「这里已经有一份「…」了」会把它挡下来（那两格盘上永远在），落不成半个字节。
     这一头沿用 fd_core::comp_rule::包名干净 那把尺（改代码那一摊早把这两种当不干净），
     所以同样动手不了别家，只是先走「包名不干净，不敢落地：」那一句而不是「这里已经有一份」那一句。 */
use serde_json::Value;

/* ---------- 那几处名字与那两串种类 ---------- */

/// 被卸掉的那几家（原件 OFF_LIST，1752 行）
pub const 卸掉那份: &str = "off.json";
/// 外41 六段之前那份「装了哪些」，读到一次就换算掉（原件 OLD_LIST，1753 行）
pub const 老的那份: &str = "installed.json";
/// 插件清单那一份（原件 packOne 两头都认这一名）
pub const 清单那份: &str = "manifest.json";
/// 文件夹那种（原件 kind === 'dir'，页面上判的就是这一串）
pub const 文件夹那种: &str = "dir";
/// 压缩包那种（原件 kind === 'zip'）
pub const 压包那种: &str = "zip";
/// 自有容器那种（插件分离第 3 批：页面上判的就是这一串，与 'dir' / 'zip' 同一款式）
pub const 容器那种: &str = "box";
/// 压缩包那一位后缀（原件 n.endsWith('.zip') 与 n.slice(0,-4)）
pub const 压包后缀: &str = ".zip";
/// 一份文件走这条道的上限（原件 PACK_FILE_MAX = 24 * 1024 * 1024，1879~1880 行）
pub const 封顶字节: u64 = 24 * 1024 * 1024;

/* ---------- 那几句原话：措辞与 main.cjs 一字不差 ---------- */

/// 文件夹那一格里插件清单读不成那句（原件 packOne 的 catch，后面接系统那句）
pub const 清单读不成那句: &str = "插件清单读不成那份格式：";
/// 压缩包没带插件清单那句（原件 packOne 那一支，不带前缀也不接别的话）
pub const 没带清单那句: &str = "压缩包里没带插件清单";
/// 压缩包整个读不动那句（原件 packOne 第二层 catch 的前缀）
pub const 压包读不动那句: &str = "zip 读不动：";
/// 取不到那份文件（原件 pack:file 第一支：拼的是页面递进来的那两串，不是洗过的）
pub fn 包里没有那句(id: &str, 相对: &str) -> String {
    format!("包里没有这份文件：{}/{}", id, 相对)
}
/// 转不成文本那句（原件 pack:file 最后一支的前缀）
pub const 读不出文本那句: &str = "读不出文本：";

/// 那一串字节折成「多少 MB」：原件是 Math.round(字节 / 1048576)，四舍五入、不带小数
fn 折成兆(字节: u64) -> i64 {
    (字节 as f64 / 1048576.0).round() as i64
}

/// 过了 24MB 那道闸那一句（原件：'这份文件 ' + Math.round(len/1048576) + 'MB，太大不走这条路'）
pub fn 太大那句(字节: u64) -> String {
    format!("这份文件 {}MB，太大不走这条路", 折成兆(字节))
}

/* ---------- 名字：哪几枚进这一列 ---------- */

/// 一枚名字在盘上是什么（原件是 fs.statSync 那一手：问不到就 continue，1805~1806 行）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum 盘上 {
    /// 是一格目录
    是格,
    /// 是一份文件
    是份,
    /// statSync 抛了（正在被别的程序删着、链接坏了那种）
    问不到,
}

/// 这个名字要不要进这一列（原件 1804 行：打头的点、打头的下划线、那两份名单本体都不进）
pub fn 该看的名(名: &str) -> bool {
    !名.starts_with('.') && !名.starts_with('_') && 名 != 卸掉那份 && 名 != 老的那份
}

/// 一份压缩包名折成包名（原件 n.endsWith('.zip') + n.slice(0,-4)）：不是这一后缀的回 None
pub fn 压包成名(名: &str) -> Option<&str> {
    名.strip_suffix(压包后缀)
}

/// 一份自有容器名折成包名：后缀那一枚住 pack_box::带点后缀，这一层不再写第二个字面（他定的"代码里的常量要留成一处"，规格第五节那条）。
/// 认两种写法（2026-10-17 跟着出货那一格放宽的一格）：
///   `<包名>.fdpkg` 与 `<包名>-<版本号>.fdpkg` —— 出货那一格里每一颗的名字都带着自己那一号
///   （他原话：「一个插件文件夹，里面插件包的名字是插件名字带上版本号」），把这样的名字丢进插件路径还认得回这一家。
/// 折法只一条：从左数**第一个后面紧跟数字的横杠**处砍一刀。为什么是这一条：包名自己就带横杠
///   （your-sentences / music-remote / singbit-input-practice / why-not-write），而号永远以数字开头（1.0.0-alpha+build.<那一笔>），
///   所以号前那一根横杠是唯一"后面跟着数字"的一根；号里面那些横杠（-alpha）在砍完之后就不算了。
/// 一道兜底：折出来的这一串只是"文件名说是哪一家"，装之前还有一道闸把信息段里那一栏与它逐字比
///   （规格那张表：目录名必须与信息段一样），对不上就一句退回，绝不含认成另一家。
pub fn 容器成名(名: &str) -> Option<&str> {
    let 干 = 名.strip_suffix(crate::fd_core::pack_box::带点后缀)?;
    let 节 = 干.as_bytes();
    for 位 in 0..节.len() {
        if 节[位] != b'-' { continue; }
        if 位 + 1 < 节.len() && 节[位 + 1].is_ascii_digit() {
            let 头 = &干[..位];
            if !头.is_empty() { return Some(头); }
            return Some(干);
        }
    }
    Some(干)
}

/* ---------- 三趟收：文件夹赢同名的运输形状（zip 与自有容器都算运输形状） ---------- */

/// 分成三趟（原件 1803~1809 那一趟分类 + 1810~1819 那两趟收的形状，插件分离第 3 批 3.4 加第三趟）：
/// 第一串全是文件夹名、第二串是压缩包折出来的包名、第三串是自有容器折出来的包名，三种各自照给进来的序。
///
/// 为什么分趟收而不是照着读目录的顺序边走边记 —— 原件 1794~1796 行那段注释就是这么写的，照抄：
///   「扫一遍：文件夹先收，同名 zip 就不收了（文件夹赢，和生成页面那头一致）。
///     分两趟收而不是照着 readdir 的顺序边走边记 —— 名字排序碰巧让 zip 先露面的话，
///     同一个包会在页面上列两行。」
/// 一句话：赢家必须是「文件夹」这一种，不能是「谁先露面」，所以先分类、再按种类各收一趟。
/// 自有容器与 zip 同属"运输形状"：谁先露面都不算赢，只有真那一格才算；两种运输形状里
/// **文件夹排第一趟**这条没变，变的只是多一趟要问「同名那一格占没占」。
/// 同名那一家到底让不让开，归 同名那格已占 那颗问 —— 原件的 seen 只记真列进这一列的（if(p){...seen.add(n)}），
/// 文件夹那一格读不成（packOne 回 null）时占不算数，同名 zip 照样露面。
pub fn 分成三趟(名册: &[(String, 盘上)]) -> (Vec<String>, Vec<String>, Vec<String>) {
    let mut 格: Vec<String> = vec![];
    let mut 压: Vec<String> = vec![];
    let mut 容: Vec<String> = vec![];
    for (名, 相) in 名册 {
        if !该看的名(名) {
            continue;
        }
        match 相 {
            盘上::是格 => 格.push(名.clone()),
            /* 原件 1808 行：既不是格也不是 .zip 的一份（txt、exe、图片那种）一律不进这一列 */
            盘上::是份 => {
                if let Some(包名) = 压包成名(名) {
                    压.push(包名.to_string());
                } else if let Some(包名) = 容器成名(名) {
                    容.push(包名.to_string());
                }
            }
            盘上::问不到 => {}
        }
    }
    (格, 压, 容)
}

/// 同名那格占没占（原件 1816 行 if(seen.has(id)) continue：文件夹赢，这一颗替 zip 那一趟回答让不让）
pub fn 同名那格已占(已列出的: &[String], 包名: &str) -> bool {
    已列出的.iter().any(|x| x == 包名)
}

/* ---------- 两份名单：读成几颗名字、老那份怎么换算 ---------- */

/// 照 JS 的 String(x) 给个交代：那两份名单现实里只放字符串，别的形状也不许在这儿 panic。
/// （数那一档 serde_json 把 1.0 写成 "1.0"、JS 的 String(1.0) 是 "1"，只在有人往名单里塞小数时才看得出来）
/// 页面递进来的名单与回执都用这一颗（原件两处写的都是 .map(String)）
pub fn 串成(x: &Value) -> String {
    match x {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        Value::Array(a) => a.iter().map(串成).collect::<Vec<_>>().join(","),
        /* 原件 .map(String) 撞上一格对象就是这一串 */
        Value::Object(_) => "[object Object]".to_string(),
    }
}

/// off.json 读成那几家（原件 1834~1837 行：整份就是列表、或列表住在 off 那一格，两种以外都算一家都没卸；
/// 读不成 JSON 也是同一结果 —— 那一个 catch 里 off = []）
pub fn 开单成列(文本: &str) -> Vec<String> {
    let 值 = match serde_json::from_str::<Value>(文本) {
        Ok(v) => v,
        Err(_) => return vec![],
    };
    let 列 = match &值 {
        Value::Array(a) => Some(a),
        Value::Object(o) => match o.get("off") {
            Some(Value::Array(a)) => Some(a),
            _ => None,
        },
        _ => None,
    };
    match 列 {
        Some(a) => a.iter().map(串成).collect(),
        None => vec![],
    }
}

/// 老那份 installed.json 读成「装了哪些」（原件 1827 行：整份是列表、或列表住在 installed 那一格；
/// 读不成、两种都不是 → null，往下就是「老那份没记下任何一家」）
pub fn 老单成列(文本: &str) -> Option<Vec<String>> {
    let 值 = serde_json::from_str::<Value>(文本).ok()?;
    let 列 = match &值 {
        Value::Array(a) => Some(a),
        Value::Object(o) => match o.get("installed") {
            Some(Value::Array(a)) => Some(a),
            _ => None,
        },
        _ => None,
    };
    列.map(|a| a.iter().map(串成).collect())
}

/// 这一格里该记为卸掉的几家（原件 1828 行：扫到的每一家，老名单里没记的就进 off）。
/// 老那单是 None（读不成那份格式、或两种形状都不是）→ 一家都不记：原件同一支是 Array.isArray(ids) 不中、
/// 取 []，但换算那一趟照走（写 off.json、删掉老那份都还在同一个 try 里，1829~1830 行）—— 不是「读不成就不换算」。
pub fn 记为卸掉(扫到的: &[String], 老名单: Option<&[String]>) -> Vec<String> {
    match 老名单 {
        Some(装了) => 扫到的
            .iter()
            .filter(|家| !装了.iter().any(|x| x == *家))
            .cloned()
            .collect(),
        None => vec![],
    }
}

/// 写 off.json 那一串的形状（原件 1829 行 JSON.stringify({ off:卸 }, null, 2) + '\n'）：
/// 这儿只管把「记为卸掉」的那几家递成 { off: [...] } 那一格，缩进与尾巴那个换行由第三层落盘时照抄
pub fn 卸掉那一格(卸: &[String]) -> Value {
    serde_json::json!({ "off": 卸 })
}

/* ---------- pack:file 那一路的相对写法（原件 packRaw 头两行，1856~1857 行） ---------- */

/// 洗那一串段名：反斜杠当斜杠、打头的斜杠去掉，然后照原件「段里只要有 .. 或 . 或空段就整串不认」。
/// 注意与 zip_pack 里那颗 干净名 不同一处：干净名是把空段与 . 扔掉继续走，这一颗直接不认 ——
/// 原件 packRaw 与 zip-read.cjs 的 cleanName 本来就是两把尺，各对各的原件，不许在这儿给统一了。
pub fn 洗那串(相对: &str) -> Option<String> {
    let 斜 = 相对.replace('\\', "/");
    let 净 = 斜.trim_start_matches('/');
    if 净.is_empty() {
        return None;
    }
    for 段 in 净.split('/') {
        if 段.is_empty() || 段 == "." || 段 == ".." {
            return None;
        }
    }
    Some(净.to_string())
}

/// 段拆开（第三层把洗过那一串并成落点用，原件 path.join(dir, ...clean.split('/'))）
pub fn 拆成段(洗过的: &str) -> Vec<&str> {
    洗过的.split('/').collect()
}

/* ---------- pack:set：名单落盘那几句与「开着的换成卸掉的」（原件 packAfterSet 1892~1894、handler 1895~1910） ---------- */

/// 那一列建不出来那一句（原件 1897 行 mkdirSync 那一道；pack:import 2002 行建同一格，用的也是这一句）
pub const 建不出那句: &str = "插件目录建不出来：";
/// 那份名单删不掉那一句（原件 1901 行，后头接系统那句）
pub const 名单删不掉那句: &str = "名单删不掉：";
/// 那份名单写不进去那一句（原件 1909 行，后头接系统那句）
pub const 名单写不进那句: &str = "名单写不进去：";
/// 页面递上来的不是列表那一句（原件 1903 行：整句就是这一串，后头不接任何东西）
pub const 不是列表那句: &str = "名单得是一份 id 列表";
/// 卸完名单之后收后台监听时给的那句理由（原件 1893 行 mediaStop('音乐遥控器卸掉了')，落进监听账那一句「话」）
pub const 卸掉监听那句: &str = "音乐遥控器卸掉了";

/// 页面递的那一串换成一颗颗 id（原件 1904 行 new Set(ids.map(String)) 与 1908 行回给页面的 ids:ids.map(String)，两处同一串）
pub fn 开着的名单(递的: &[Value]) -> Vec<String> {
    递的.iter().map(串成).collect()
}

/// 「开着的」换成「卸掉的」（原件 1907 行：off = 这一格里扫到的全部 减 开着的，名单里没点名的都算开着）。
/// 算术与老那份名单换算那一次（1828 行）是同一把尺 —— 就着 记为卸掉 那一颗，不在这一格抄第二遍 filter。
/// 递进来的 全部 是 扫一遍 那一列里每家折出来的 id（原件 p => String(p.id)，pack id 本来就是名）。
pub fn 换成卸掉(全部: &[String], 开着: &[String]) -> Vec<String> {
    记为卸掉(全部, Some(开着))
}

/* ---------- pack:import：那十句原话与几手字符串活（原件 1995~2044 行 + packManifestOf 1918、walkPackDir 1926、expandZipPack 1936） ---------- */

/// 那一份东西读不到那一句（原件 2001 行，后头接的是折成绝对之后的那一串门牌）
pub const 读不到那份那句: &str = "那份东西读不到：";
/// 挑的是文件又不是那两种压好的包那一句（原件 2005 行只认 zip；第 3 批 3.4 多认自有容器，措辞跟着改口）
pub const 只收压包那句: &str = "挑文件这一条只收压好的包 · 解开的样子请挑那个文件夹";
/// 压缩包读不动那一句（原件 2009 行 packManifestOf 那一道的前缀；摊开那一步读不成走的也是这一句，1939 行）
pub const 包读不动那句: &str = "这个包读不动：";
/// 压缩包没带插件清单那一句（原件 1922 行 packManifestOf 抛的那一句）
pub const 不像插件那句: &str = "这个压缩包里没带插件清单，不像一个插件";
/// 文件夹里没带插件清单那一句（原件 2022 行；与上面那句只差在「压缩包 / 文件夹」那一截）
pub const 格没带清单那句: &str = "这个文件夹里没带插件清单，不像一个插件";
/// 包名不干净那一句（原件 2011 / 2027 行，后头接的是折出来的那一名 —— 与「改代码」那一摊那句「不敢动手」不同一句）
pub const 包名不干净那句: &str = "包名不干净，不敢落地：";
/// 同名已经在那儿了那一句（原件 2013 / 2029 行，包名夹在两枚书名号中间）
pub fn 已占那句(包名: &str) -> String {
    format!("这里已经有一份「{}」了 · 要换先把它挪走", 包名)
}
/// 包里有脏路径那一句（原件 1948 / 1950 / 2034 行三处都是这一串，后头接没洗过的那一条）
pub fn 脏路径那句(那一条: &str) -> String {
    format!("包里有脏路径，不敢落地：{}", 那一条)
}
/// 摊包时那条目录记的是空路径（原件 1946 行 throw 的那一句，往上落还是挂「这个包落不成：」那一句）
pub const 空路径那句: &str = "空路径";
/// 落了一半卡住了那一句（原件 1958 行，后头接系统那句；这一支之前那半截已经整格删掉）
pub const 落不成那句: &str = "这个包落不成：";
/// 挑的既不是文件也不是文件夹（原件 2042 行，整句就是这一串）
pub const 两不象那句: &str = "挑的东西既不是文件也不是文件夹";
/// 整颗兜底那一句（原件 2043 行，后头接系统那句）
pub const 导入失败那句: &str = "导入失败：";

/// 原件那一手 String(x || '')：没给、给了空串、给了 null、给了 false、给了 0 都算空串，
/// 剩下的照 JS 的 String() 折（与 串成 同一把尺；空数组折出来也是空串，两头一致）
pub fn 递的那串(值: &Value) -> String {
    match 值 {
        Value::Null => String::new(),
        Value::Bool(b) => if *b { "true".to_string() } else { String::new() },
        Value::Number(n) => {
            if n.as_f64().map(|v| v == 0.0).unwrap_or(false) { String::new() } else { 串成(值) }
        }
        Value::String(s) => s.clone(),
        /* 数组与对象在 JS 里都是真值，走 String() 那一手（空数组是 ''，空对象是 '[object Object]'） */
        _ => 串成(值),
    }
}

/// 页面递进来的那份东西的门牌（原件 1999 行 String(p.src || '')：payload 没递、src 没写都算空串）
pub fn 那份东西(递的: &Value) -> String {
    递的那串(递的.get("src").unwrap_or(&Value::Null))
}

/// 插件清单上点名的那一格（原件 2010 / 2026 行 String(m.id || 兜底).trim()）：没写、写了空串都退兜底，
/// 兜底由调用方算好（压包那一种是不带后缀的末段、文件夹那一种是末段本身）
pub fn 清单上的id(单: &Value, 兜底: &str) -> String {
    let 写 = 递的那串(单.get("id").unwrap_or(&Value::Null));
    if 写.is_empty() { 兜底.to_string() } else { 写 }.trim().to_string()
}

/// 插件清单上那个名字（原件 1960 / 2040 行 m.name || id）：回给页面 name 那一格的就是它，
/// 与 id 不同一处 —— 原件这一栏压根没 trim，照旧不去首尾空白
pub fn 清单上的名字(单: &Value, 兜底: &str) -> String {
    let 写 = 递的那串(单.get("name").unwrap_or(&Value::Null));
    if 写.is_empty() { 兜底.to_string() } else { 写 }
}

/// 收不收这一份压缩包（原件 2005 行 /\.zip$/i）：只看尾巴那四个字，大小写两种都算
pub fn 是压包那份(那串: &str) -> bool {
    那串.to_ascii_lowercase().ends_with(压包后缀)
}

/// 收不收这一份自有容器（插件分离第 3 批 3.4）：只看尾巴那一段，大小写两种都算；
/// 后缀那一枚不自建第二份 —— 认的是 pack_box::带点后缀（全仓一处）
pub fn 是容器那份(那串: &str) -> bool {
    那串.to_ascii_lowercase().ends_with(crate::fd_core::pack_box::带点后缀)
}

/// 一串路径的末段（原件 path.basename）：反斜杠与斜杠都当分隔；整串只剩分隔符时给空串（Node 同一手）
pub fn 末段(那串: &str) -> String {
    let 洗 = 那串.replace('/', "\\");
    match 洗.rsplit_once('\\') {
        Some((_, 尾)) => 尾.to_string(),
        None => 洗,
    }
}

/// 一串路径的后缀（原件 path.extname）：末段里最后一个点往后的那一段（带着那枚点）。
/// 点在末段的第一个字上（'.zip' 那种当名字用的写法）算没后缀，整串没点也算没后缀 —— 两头同字
pub fn 后缀(那串: &str) -> String {
    let 段 = 末段(那串);
    match 段.rfind('.') {
        Some(位) if 位 > 0 => 段[位..].to_string(),
        _ => String::new(),
    }
}

/// 末段去掉后缀（原件 2010 行 path.basename(src, path.extname(src))，压包没写 id 时的兜底包名）。
/// 整段就等于后缀时不折空（原件也不给空名字）
pub fn 末段去后缀(那串: &str) -> String {
    let 段 = 末段(那串);
    let 尾 = 后缀(那串);
    if !尾.is_empty() && 段 != 尾 && 段.ends_with(&尾) {
        return 段[..段.len() - 尾.len()].to_string();
    }
    段
}

/// 一串路径的顶（折成绝对 用）：回「顶」与「顶以外的那一串」。
/// 认三种写法：字母 + 冒号 + 分隔（盘符，顶就是「字母 + 冒号」这一段）、两个分隔符打头（UNC，顶是机器名加共享名）、
/// 单个分隔符打头（原件按同一个盘的当前目录往上算，顶就取 当前格 里那枚盘符）；剩下的一律算相对写法，并进 当前格
fn 拆顶(那串: &str, 当前格: &str) -> (String, String) {
    let 字 = 那串.as_bytes();
    if let Some(尾) = 那串.strip_prefix("\\\\") {
        let 们: Vec<&str> = 尾.split('\\').filter(|x| !x.is_empty()).collect();
        return match (们.first(), 们.get(1)) {
            (Some(机), Some(享)) => (format!("\\\\{}\\{}", 机, 享), 们.iter().skip(2).copied().collect::<Vec<_>>().join("\\")),
            (Some(机), None) => (format!("\\\\{}", 机), String::new()),
            /* 只剩分隔符那种（'\\\\'）：原件折出来就是 '\\\\'，这一头当相对写法办，动的还是同一格 */
            _ => (去尾分隔(当前格), 尾.to_string()),
        };
    }
    if 字.len() >= 3 && 字[1] == b':' && 字[2] == b'\\' {
        return (那串[..2].to_string(), 那串[3..].to_string());
    }
    /* 只剩盘符那一截（'X:'）：原件给的是那一个盘的当前目录，壳里不知道那一格在哪，就按盘根算 */
    if 字.len() == 2 && 字[1] == b':' && 字[0].is_ascii_alphanumeric() {
        return (那串[..2].to_string(), String::new());
    }
    if 那串.starts_with('\\') {
        return (盘根(当前格), 那串[1..].to_string());
    }
    (去尾分隔(当前格), 那串.to_string())
}

/// 当前那一格里的那枚盘符（单个分隔符打头那种写法要用）：认不出盘符就只剩一个分隔符当顶
fn 盘根(当前格: &str) -> String {
    let 字 = 当前格.as_bytes();
    if 字.len() >= 2 && 字[1] == b':' && 字[0].is_ascii_alphanumeric() {
        return 当前格[..2].to_string();
    }
    "\\".to_string()
}

fn 去尾分隔(串: &str) -> String {
    let mut s = 串.to_string();
    while s.ends_with('\\') || s.ends_with('/') {
        s.pop();
    }
    s
}

/// 页面递进来的那串折成绝对落点（对应原件 1999 行 path.resolve(String(p.src || ''))）：
/// 空串就是当前那一格；绝对写法照它自己那一格当顶、相对写法并进当前那一格。
/// 段里的 . 与空段扔掉、.. 退一格（退得进顶自己的段，退到顶就停住 —— 与原件同一手），分隔一律折成反斜杠 ——
/// 折出来的这一串只用在两处：问盘上有没有（原件 statSync）与那句「那份东西读不到：」后头接的那一串。
/// 与原件差在一处：'C:x' 那种盘符后头不带分隔的写法，原件走的是同一个盘的当前目录（壳里不知道那是哪一格），
/// 这一头当相对写法并进当前那一格（读不到就落那句「那份东西读不到：」，一个字节都不会多动）。
pub fn 折成绝对(那串: &str, 当前格: &str) -> String {
    let 串 = 那串.replace('/', "\\");
    let (顶, 余下) = if 串.is_empty() { 拆顶(当前格, 当前格) } else { 拆顶(&串, 当前格) };
    let (标记, 顶段) = 分标记(&顶);
    let mut 段: Vec<String> = 顶段;
    for x in 余下.split('\\') {
        if x.is_empty() || x == "." {
            continue;
        }
        if x == ".." {
            /* 顶自己的段也一并退（原件 path.resolve 就是把整串折平），退到标记那一格就停住 */
            if !段.is_empty() {
                段.pop();
            }
            continue;
        }
        段.push(x.to_string());
    }
    if 段.is_empty() {
        /* 顶上什么段都不剩：盘符那一档要把顶上那枚分隔补回去（原件把一路全退光就退到那一个盘的根） */
        return if 标记.is_empty() {
            "\\".to_string()
        } else if 标记.ends_with(':') {
            format!("{}\\", 标记)
        } else {
            标记
        };
    }
    if 标记.is_empty() {
        return format!("\\{}", 段.join("\\"));
    }
    format!("{}\\{}", 标记, 段.join("\\"))
}

/// 一串绝对写法拆成「标记」与「标记底下的段」（折成绝对 用）：
/// 两个分隔符打头的是 UNC（机器名 + 共享名 那一串整个当标记，底下的段才许退，退不出共享名以外）；
/// 「字母 + 冒号」当标记（底下的段一路退可以到盘根）；其余写法整串当段，标记是空串（顶就是那一个盘的根）。
/// 拆之前 拆顶 已经把分隔折成反斜杠、尾分隔去掉，所以这儿只看开头那几枚字
fn 分标记(顶: &str) -> (String, Vec<String>) {
    let 字 = 顶.as_bytes();
    if 顶.starts_with("\\\\") {
        return (顶.to_string(), vec![]);
    }
    if 字.len() >= 2 && 字[1] == b':' && 字[0].is_ascii_alphanumeric() {
        let 尾 = 顶[2..].replace('/', "\\");
        return (顶[..2].to_string(), 尾.split('\\').filter(|x| !x.is_empty()).map(|x| x.to_string()).collect());
    }
    if 顶 == "\\" {
        return (String::new(), vec![]);
    }
    /* 认不出标记的写法（当前那一格本身不是绝对地址那种）：整串都算段，退到头就是空 */
    (String::new(), 顶.split('\\').filter(|x| !x.is_empty()).map(|x| x.to_string()).collect())
}

/// 摊开那一条目录记的什么（原件 expandZipPack 1944~1948 行那四手，一次一条）
#[derive(Debug, PartialEq, Eq)]
pub enum 那一条 {
    /// 有人压包会把文件夹也记一条（尾巴带分隔符），跳过这一条不落地
    跳过,
    /// 干净段名，可以照着落到这一家那一格里
    落成(Vec<String>),
    /// 脏（含空路径）：整格删掉重来，这一串就是往上落的那半句原话
    脏(String),
}

/// 一条目录名该怎么摊（原件那四手）：反斜杠当斜杠 → 带尾斜杠的跳过 → 空路径算脏 →
/// 空段与 . 扔掉、段里有 .. 或整串没段就算脏。
/// 差在一处（照 zip_pack 顶上那条同一口径）：共用的那颗解包件读目录时已经把段名洗过一遍
/// （干净名 挡的就是带 .. 与空段那种），所以 脏 这一支在这儿永远不中；留着是照抄原件那三道闸，一道都不撤。
pub fn 摊那一条(名: &str) -> 那一条 {
    let 相 = 名.replace('\\', "/");
    if 相.ends_with('/') {
        return 那一条::跳过;
    }
    if 相.is_empty() {
        return 那一条::脏(空路径那句.to_string());
    }
    let 段: Vec<String> = 相.split('/').filter(|x| !x.is_empty() && *x != ".").map(|x| x.to_string()).collect();
    if 段.is_empty() || 段.iter().any(|x| x == "..") {
        return 那一条::脏(脏路径那句(&相));
    }
    那一条::落成(段)
}

/* ---------- pack:wipe：删哪几格、留哪几格（原件 2052~2072 行，一手都不许多删） ---------- */

/// 原件 2054 / 2062 行那两把 Array.isArray：页面递的不是列表就按空的一串办（一颗都不动）
pub fn 按名单收(递的: Option<&Value>) -> Vec<&Value> {
    match 递的 {
        Some(Value::Array(列)) => 列.iter().collect(),
        _ => vec![],
    }
}

/// 那一串还在数据层根以内不是（原件 2067 行 rf.startsWith(root + path.sep)）：
/// 等号那一格自己不算以内 —— 根本体这一颗也不给删（原件同字）
pub fn 在根以内(落: &str, 根: &str) -> bool {
    let 跟 = 去尾分隔(根);
    落.starts_with(&format!("{}\\", 跟))
}

/// 插件那一格与它底下的永远留着（原件 2061 行 comp = path.resolve(PACKS_DIR()) 与 2068 行那一道）：
/// 「包和名单永远留着」说的就是这一格 —— 装得回来靠的就是包还在，off.json 也住在这一格里。
/// 除这一格以外的数据层根底下的东西（用户目录、库文件、日志…）原件都许删，这一头一处都不许多留、也不许少留。
pub fn 包那一格留着(落: &str, 包格: &str) -> bool {
    let 跟 = 去尾分隔(包格);
    落 == 跟 || 落.starts_with(&format!("{}\\", 跟))
}

/// 号里参与比大小的那两段：`主.次.补丁` 与（有的话）预发布。`+build.…` 那一截丢掉 ——
/// semver 明写 build 元数据不参与排序，比它比出来的"新"是假的。读不出回 None（读不出与相等是两件事）。
fn 拆号(号: &str) -> Option<(Vec<u64>, Option<Vec<String>>)> {
    let 取 = 号.trim().split('+').next()?.trim();
    let (核, 预) = match 取.find('-') {
        Some(i) => (&取[..i], 取[i + 1..].split('.').map(|s| s.to_string()).collect::<Vec<_>>()),
        None => (取, Vec::new()),
    };
    let 有预 = 取.find('-').is_some();
    let 段: Vec<u64> = 核.split('.').map(|s| s.parse::<u64>().ok()).collect::<Option<_>>()?;
    if 段.len() != 3 { return None; }
    Some((段, if 有预 { Some(预) } else { None }))
}

/// 预发布那一段照 semver 第 11 条比：逐段来，纯数字段按数比、其余按字典比，数字段排在非数字段前面；
/// 前面每一段都平而段数少的算小。
fn 比预(甲: &[String], 乙: &[String]) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    for i in 0..甲.len().min(乙.len()) {
        let (x, y) = (&甲[i], &乙[i]);
        let (数x, 数y) = (x.parse::<u64>().ok(), y.parse::<u64>().ok());
        let 结 = match (数x, 数y) {
            (Some(a), Some(b)) => a.cmp(&b),
            (Some(_), None) => Ordering::Less,
            (None, Some(_)) => Ordering::Greater,
            (None, None) => x.cmp(y),
        };
        if 结 != Ordering::Equal { return 结; }
    }
    甲.len().cmp(&乙.len())
}

/// 比两串号的新旧：包上 vs 装着的。读不出任何一边回 None（不许当成相等，也不许当成谁新）。
pub fn 比号(甲: &str, 乙: &str) -> Option<std::cmp::Ordering> {
    use std::cmp::Ordering;
    let (a核, a预) = 拆号(甲)?;
    let (b核, b预) = 拆号(乙)?;
    for i in 0..3 {
        let 结 = a核[i].cmp(&b核[i]);
        if 结 != Ordering::Equal { return Some(结); }
    }
    Some(match (a预, b预) {
        (None, None) => Ordering::Equal,
        (None, Some(_)) => Ordering::Greater,      /* 1.0.0 比 1.0.0-alpha 新 */
        (Some(_), None) => Ordering::Less,
        (Some(x), Some(y)) => 比预(&x, &y),
    })
}

/// 那一颗躺在插件路径里的运输件值不值得提醒一句。**手里只有两个版本号，就只比这两个号**：
/// ① 号里参与排序的那几段分得出高低（`+build.` 那一截按 semver 规定不比）—— 包上的更新才提醒，
///    更旧一律不提醒（他 2026-10-18 那一句「点下去是降级」：路径里躺着一颗旧包也被当成"等着更新"是错的）；
/// ② 号比不出高低、两个号却不一样 —— 照样提醒，把两个号一起摆到界面上让人自己看
///    （他 2026-10-19 那一句「比不出来我要版本号干什么」）。从前这一格回 false，等于把"我比不出"
///    偷换成"你已经是最新"，他把新包丢进去却被告知没得更新，就是那一手；
/// ③ 两个号一模一样才回 false（那是同一份，不是新旧问题）。
/// 不比打包时刻、不读盘上文件时间、不在那一格里另留一张"装过什么"的条 ——
/// 他那两句原话：「记什么提交时刻啊！！谁家安装包记录时间啊」「为什么需要额外记录哪个装了哪个没装？纯属多余」。
/// 要分得出新旧就把号打成比得出大小的样子（排序那一段写进预发布里，见 src\_build\version.mjs 与各家 出包.mjs）。
pub fn 该提醒换(装着的: &str, 包上的: &str) -> bool {
    use std::cmp::Ordering;
    let (甲, 乙) = (装着的.trim(), 包上的.trim());
    if 甲.is_empty() || 乙.is_empty() { return false; }
    match 比号(乙, 甲) {
        Some(Ordering::Greater) => true,
        Some(Ordering::Less) => false,
        /* 平手或有一边不成号：号不一样就提醒，一样才算同一份 */
        _ => 甲 != 乙,
    }
}

/// 换进来那两道的临时名：下划线开头那一格 算一家 不认（off.json 那种也不是家），所以不会在半路被列成一家
pub fn 换进来名(包名: &str) -> String { format!("_换进来-{}", 包名) }
pub fn 换下去名(包名: &str) -> String { format!("_换下去-{}", 包名) }

/// 同一家在插件路径里躺着好几颗运输件时留哪一颗：**最近放进去的那一颗**（回的是选中那一颗的原文件名）。
/// 为什么不比号：`比号` 那一颗把 `+build.` 后面那一截丢掉，两颗平手；
/// 为什么不按名字排：`notes-1.0.0-…` 排在 `notes-2.0.0-…` 前面，按名字留头一颗就会提醒人换成**旧的那一号**。
/// 时间一样（同一秒里丢进两颗）时按名字倒着排，至少每次跑选的是同一颗。
pub fn 一家留最新一颗(名册: &[(String, u64)]) -> Vec<String> {
    let mut 排 = 名册.to_vec();
    排.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| b.0.cmp(&a.0)));
    let mut 出: Vec<(String, String)> = vec![];
    for (名, _) in 排 {
        let 包名 = match 容器成名(&名) { Some(v) => v.to_string(), None => continue };
        if !出.iter().any(|已| 已.0 == 包名) { 出.push((包名, 名)); }
    }
    出.sort_by(|a, b| a.0.cmp(&b.0));
    出.into_iter().map(|(_, 名)| 名).collect()
}

#[cfg(test)]
mod 验判断 {
    use super::*;
    use serde_json::json;

    fn 名(格: &[&str], 份: &[&str]) -> Vec<(String, 盘上)> {
        let mut 出 = vec![];
        for n in 格 {
            出.push((n.to_string(), 盘上::是格));
        }
        for n in 份 {
            出.push((n.to_string(), 盘上::是份));
        }
        出
    }

    #[test]
    fn 打头那两种与两份名单本体都不进这一列() {
        assert!(!该看的名(".隐藏"));
        assert!(!该看的名("_下划线"));
        assert!(!该看的名(卸掉那份));
        assert!(!该看的名(老的那份));
        assert!(该看的名("demo-scene"));
        assert!(该看的名("demo-scene.zip"));
        /* 名单那两名打头也是字母，别拿 starts_with 那一手误放进来 */
        assert!(!该看的名("off.json"));
        assert!(!该看的名("installed.json"));
    }

    #[test]
    fn 压缩包名折成包名只认那一位后缀() {
        assert_eq!(压包成名("词库.zip"), Some("词库"));
        assert_eq!(压包成名("词库.ZIP"), None);
        assert_eq!(压包成名("词库"), None);
        assert_eq!(压包成名(".zip"), Some("")); /* 原件 slice(0,-4) 也是这一结果，照旧不特殊处理 */
    }

    #[test]
    fn 容器名折成包名认的是那一枚后缀不在这里再写一遍字面() {
        /* 这一颗自己就不写那五个字：名字拿 pack_box::扩展名 拼出来，折回来还是那一家 */
        use crate::fd_core::pack_box::扩展名;
        let 一 = format!("{}.{}", "词库", 扩展名);
        assert_eq!(容器成名(&一), Some("词库"));
        assert_eq!(容器成名("词库.FDPKG"), None, "折名那一趟照 zip 同一手：只认小写那一种写法");
        assert_eq!(容器成名("词库.zip"), None);
        assert_eq!(容器成名("词库"), None);
        assert!(是容器那份(&format!("甲/notes.{}", 扩展名)), "收不收那一条认的也是同一枚常量");
        assert!(是容器那份("甲/notes.FDPKG"), "大小写两种都算（与 zip 同一把尺）");
        assert!(!是容器那份("甲/notes.zip"));
    }

    #[test]
    fn 出货那一格的名字带着号也折得回这一家() {
        /* 2026-10-17 那一格：插件包里每一颗的名字都写成 <包名>-<版本号>.fdpkg，号永远以数字开头，
           所以"第一个后面紧跟数字的横杠"就是包名与号的分界；号自己里面还有横杠（-alpha）也不能砍错。 */
        let 后 = crate::fd_core::pack_box::带点后缀;
        let 折 = |名: &str| 容器成名(&format!("{}{}", 名, 后)).map(|出| 出.to_string());
        assert_eq!(折("notes-1.0.0-alpha+build.deadbeef"), Some("notes".to_string()));
        /* 包名自己带横杠的这几家：横杠后面跟的是字母，不算分界 */
        assert_eq!(折("your-sentences"), Some("your-sentences".to_string()));
        assert_eq!(折("your-sentences-1.0.0"), Some("your-sentences".to_string()));
        assert_eq!(折("music-remote-2.0.0-beta+build.1a2b3c4"), Some("music-remote".to_string()));
        assert_eq!(折("singbit-input-practice-0.9.1"), Some("singbit-input-practice".to_string()));
        assert_eq!(折("why-not-write"), Some("why-not-write".to_string()));
        /* 号不以数字开头（有人手写了一段字）就不砍：那一串原样当包名，装的时候由「信息段 == 文件名」那道闸退回，不含认 */
        assert_eq!(折("notes-最新"), Some("notes-最新".to_string()));
        assert_eq!(折("-1.0.0"), Some("-1.0.0".to_string()), "横杠前是空串不许折成空包名");
    }

    #[test]
    fn 同一家躺着两颗留最近放进去的那一颗() {
        /* 出货那一格的名字带号，所以按名字排会把旧号排在前面 —— 这一颗认的是文件时间 */
        let 名册 = vec![
            ("notes-1.0.0-alpha+build.aaa.fdpkg".to_string(), 100u64),
            ("notes-2.0.0-alpha+build.bbb.fdpkg".to_string(), 200u64),
            ("schedule-1.0.0-alpha+build.ccc.fdpkg".to_string(), 150u64),
        ];
        assert_eq!(一家留最新一颗(&名册), vec![
            "notes-2.0.0-alpha+build.bbb.fdpkg".to_string(),
            "schedule-1.0.0-alpha+build.ccc.fdpkg".to_string()], "一家只留一颗，且留的是新放进去的那一颗");
        /* 不带号那一种写法也一起认：同一家两种写法都躺着，还是留时间新的 */
        let 混 = vec![
            ("notes.fdpkg".to_string(), 300u64),
            ("notes-1.0.0.fdpkg".to_string(), 100u64),
        ];
        assert_eq!(一家留最新一颗(&混), vec!["notes.fdpkg".to_string()]);
        /* 时间打平时按名字倒着来，至少每次跑选同一颗 */
        let 平 = vec![
            ("notes-1.0.0.fdpkg".to_string(), 7u64),
            ("notes-2.0.0.fdpkg".to_string(), 7u64),
        ];
        assert_eq!(一家留最新一颗(&平), vec!["notes-2.0.0.fdpkg".to_string()]);
        /* 不是容器的那些名一律不进这一列（zip 与文件夹归另两趟） */
        assert!(一家留最新一颗(&[("说明.txt".to_string(), 9u64), ("甲.zip".to_string(), 9u64)]).is_empty());
    }

    #[test]
    fn 分成三趟把文件夹排在前面那串() {
        let (格, 压, 容) = 分成三趟(&名(&["甲家", "乙家"], &["丙.zip", "丁.txt", "戊.zip", "己.fdpkg"]));
        assert_eq!(格, vec!["甲家".to_string(), "乙家".to_string()]);
        assert_eq!(压, vec!["丙".to_string(), "戊".to_string()]);
        assert_eq!(容, vec!["己".to_string()], "自有容器另走一趟，与 zip 不混一格");
    }

    #[test]
    fn zip名字排在前面也不会列两行() {
        /* 原件那段理由钉这一手：读目录回来的序碰巧让 zip 先露面（"a.zip" 排在 "a" 之前），
           三趟收之后同名那一格还是文件夹赢，页面上只列一行 */
        let 名册 = vec![
            ("a.zip".to_string(), 盘上::是份),
            ("a".to_string(), 盘上::是格),
        ];
        let (格, 压, 容) = 分成三趟(&名册);
        assert_eq!(格, vec!["a".to_string()]);
        assert_eq!(压, vec!["a".to_string()]);
        assert!(容.is_empty());
        assert!(同名那格已占(&格, "a"));
    }

    #[test]
    fn 容器排在前面也一样让开那一格() {
        /* 同一条理由换一种运输形状再钉一遍：赢家必须是那一格，不能是谁先露面 */
        let 名册 = vec![
            ("a.fdpkg".to_string(), 盘上::是份),
            ("a".to_string(), 盘上::是格),
        ];
        let (格, 压, 容) = 分成三趟(&名册);
        assert_eq!(格, vec!["a".to_string()]);
        assert!(压.is_empty());
        assert_eq!(容, vec!["a".to_string()]);
        assert!(同名那格已占(&格, "a"), "容器那一趟收之前也要先问这一格占没占，不许多列一行");
    }

    #[test]
    fn 问不到的与既不是格又不带后缀的一律不收() {
        let 名册 = vec![
            ("坏链接".to_string(), 盘上::问不到),
            ("说明.txt".to_string(), 盘上::是份),
        ];
        let (格, 压, 容) = 分成三趟(&名册);
        assert!(格.is_empty() && 压.is_empty() && 容.is_empty());
    }

    #[test]
    fn 文件夹没列成时同名zip照样露面() {
        /* 原件 seen 只记真推进这一列的那几家：文件夹那一格读不成（回 null）就不占名字 */
        let 已列出: Vec<String> = vec![];
        assert!(!同名那格已占(&已列出, "甲家"));
        let 已列出 = vec!["甲家".to_string()];
        assert!(同名那格已占(&已列出, "甲家"));
        assert!(!同名那格已占(&已列出, "乙家"));
    }

    #[test]
    fn 种类那两串照原件() {
        assert_eq!(文件夹那种, "dir");
        assert_eq!(压包那种, "zip");
    }

    #[test]
    fn 那三句读不成的前缀逐字对() {
        assert_eq!(清单读不成那句, "插件清单读不成那份格式：");
        assert_eq!(没带清单那句, "压缩包里没带插件清单");
        assert_eq!(压包读不动那句, "zip 读不动：");
        assert_eq!(读不出文本那句, "读不出文本：");
    }

    #[test]
    fn 包里没有那句拼的是递进来的那两串() {
        assert_eq!(
            包里没有那句("词库", "bank\\data.txt"),
            "包里没有这份文件：词库/bank\\data.txt"
        );
        assert_eq!(包里没有那句("", ""), "包里没有这份文件：/");
    }

    #[test]
    fn 二十四兆那道闸的数与那句白话() {
        assert_eq!(封顶字节, 24 * 1024 * 1024);
        /* 闸本身是「严格大于」：正好 24MB 还是走这条路（原件 buf.length > PACK_FILE_MAX） */
        assert_eq!(太大那句(封顶字节 + 1), "这份文件 24MB，太大不走这条路");
        assert_eq!(太大那句(25 * 1048576), "这份文件 25MB，太大不走这条路");
        /* Math.round 那一手：半兆往上进一颗 */
        assert_eq!(太大那句(24 * 1048576 + 524288), "这份文件 25MB，太大不走这条路");
        assert_eq!(太大那句(1048576 * 3), "这份文件 3MB，太大不走这条路");
    }

    #[test]
    fn off名单那两种写法都认第三种算一家都没卸() {
        assert_eq!(开单成列(r#"["甲家","乙家"]"#), vec!["甲家".to_string(), "乙家".to_string()]);
        assert_eq!(开单成列(r#"{"off":["甲家"]}"#), vec!["甲家".to_string()]);
        assert!(开单成列(r#"{"installed":["甲家"]}"#).is_empty());
        assert!(开单成列("{}").is_empty());
        assert!(开单成列("读不成那份格式").is_empty());
    }

    #[test]
    fn 老名单那两种写法都认别的形状回没记下() {
        assert_eq!(老单成列(r#"["甲家"]"#), Some(vec!["甲家".to_string()]));
        assert_eq!(老单成列(r#"{"installed":["甲家","乙家"]}"#), Some(vec!["甲家".to_string(), "乙家".to_string()]));
        assert_eq!(老单成列(r#"{"off":["甲家"]}"#), None);
        assert_eq!(老单成列("读不成那份格式"), None);
    }

    #[test]
    fn 老名单里没记的才记为卸掉() {
        let 扫到的 = vec!["甲家".to_string(), "乙家".to_string(), "丙家".to_string()];
        let 装了 = vec!["甲家".to_string()];
        assert_eq!(记为卸掉(&扫到的, Some(&装了)), vec!["乙家".to_string(), "丙家".to_string()]);
        /* 老那份读不成：一家都不记，但换算那一趟照走（见 记为卸掉 顶上那段） */
        assert!(记为卸掉(&扫到的, None).is_empty());
        assert!(记为卸掉(&[], Some(&装了)).is_empty());
    }

    #[test]
    fn 名单里塞了非字符串也照原件给个交代() {
        assert_eq!(开单成列(r#"{"off":[1,true,null]}"#), vec!["1".to_string(), "true".to_string(), "null".to_string()]);
        assert_eq!(开单成列(r#"{"off":[{}]}"#), vec!["[object Object]".to_string()]);
        assert_eq!(开单成列(r#"{"off":[["甲","乙"]]}"#), vec!["甲,乙".to_string()]);
    }

    #[test]
    fn 卸掉那一格就是off那一格() {
        let 卸 = vec!["乙家".to_string()];
        assert_eq!(
            serde_json::to_string_pretty(&卸掉那一格(&卸)).unwrap(),
            "{\n  \"off\": [\n    \"乙家\"\n  ]\n}"
        );
        assert_eq!(serde_json::to_string_pretty(&卸掉那一格(&[])).unwrap(), "{\n  \"off\": []\n}");
    }

    #[test]
    fn 段名洗法照原件那两行() {
        assert_eq!(洗那串("bank/data.txt").as_deref(), Some("bank/data.txt"));
        assert_eq!(洗那串("bank\\data.txt").as_deref(), Some("bank/data.txt"));
        assert_eq!(洗那串("///bank//../x").as_deref(), None); /* 打头斜杠去掉后还剩空段与 .. */
        assert_eq!(洗那串("./a"), None); /* 原件只去打头斜杠，点段留给下面那一道拒 —— './a' 一样不认 */
    }

    #[test]
    fn 回退写法与空段当场不认() {
        assert_eq!(洗那串(""), None);
        assert_eq!(洗那串("/"), None);
        assert_eq!(洗那串(".."), None);
        assert_eq!(洗那串("a/../../b"), None);
        assert_eq!(洗那串("a/./b"), None);
        assert_eq!(洗那串("a//b"), None);
        assert_eq!(洗那串("a/b/"), None);
    }

    #[test]
    fn 洗过的再拆开就是一段一段() {
        assert_eq!(拆成段("bank/data.txt"), vec!["bank", "data.txt"]);
        assert_eq!(拆成段("data.txt"), vec!["data.txt"]);
    }

    #[test]
    fn 那几处名字常量照原件() {
        assert_eq!(卸掉那份, "off.json");
        assert_eq!(老的那份, "installed.json");
        assert_eq!(清单那份, "manifest.json");
        assert_eq!(压包后缀, ".zip");
    }

    /* ---------- 批七：写名单 / 导入 / 清数据 那三摊的尺 ---------- */

    #[test]
    fn 写名单与导入那十四句原话逐字对() {
        assert_eq!(建不出那句, "插件目录建不出来：");
        assert_eq!(名单删不掉那句, "名单删不掉：");
        assert_eq!(名单写不进那句, "名单写不进去：");
        assert_eq!(不是列表那句, "名单得是一份 id 列表");
        assert_eq!(卸掉监听那句, "音乐遥控器卸掉了");
        assert_eq!(读不到那份那句, "那份东西读不到：");
        assert_eq!(只收压包那句, "挑文件这一条只收压好的包 · 解开的样子请挑那个文件夹");
        assert_eq!(包读不动那句, "这个包读不动：");
        assert_eq!(不像插件那句, "这个压缩包里没带插件清单，不像一个插件");
        assert_eq!(格没带清单那句, "这个文件夹里没带插件清单，不像一个插件");
        assert_eq!(包名不干净那句, "包名不干净，不敢落地：");
        assert_eq!(落不成那句, "这个包落不成：");
        assert_eq!(两不象那句, "挑的东西既不是文件也不是文件夹");
        assert_eq!(导入失败那句, "导入失败：");
    }

    #[test]
    fn 那两句带包名与带那一条的都是原件那一串拼法() {
        assert_eq!(已占那句("词库"), "这里已经有一份「词库」了 · 要换先把它挪走");
        assert_eq!(已占那句(""), "这里已经有一份「」了 · 要换先把它挪走");
        assert_eq!(脏路径那句("a/../b"), "包里有脏路径，不敢落地：a/../b");
        assert_eq!(空路径那句, "空路径");
    }

    #[test]
    fn 页面递的名单折成一颗颗id() {
        let 递的: Vec<Value> = serde_json::from_str(r#"["甲家",2,true,null,{"a":1},["乙","丙"]]"#).unwrap();
        /* 原件那一手是 ids.map(String)：一颗都不筛，形状各异也照 String() 折 */
        assert_eq!(开着的名单(&递的),
            vec!["甲家".to_string(), "2".to_string(), "true".to_string(), "null".to_string(),
                 "[object Object]".to_string(), "乙,丙".to_string()]);
        assert!(开着的名单(&[]).is_empty());
    }

    #[test]
    fn 开着的换成卸掉的是扫到的全部减开着的() {
        let 全部: Vec<String> = vec!["甲家".to_string(), "乙家".to_string(), "丙家".to_string()];
        let 开着 = vec!["甲家".to_string(), "丙家".to_string()];
        /* 落盘的是「卸掉的」：这一格里扫到的、页面没点名说开着的（原件 1907 行那一句 filter） */
        assert_eq!(换成卸掉(&全部, &开着), vec!["乙家".to_string()]);
        /* 一家都没点名 ⇒ 全部记成卸掉；点名的那一家本来就没扫到 ⇒ off 里不会多出名字 */
        assert_eq!(换成卸掉(&全部, &[]), 全部);
        assert_eq!(换成卸掉(&全部, &["丁家".to_string()]), 全部);
        assert!(换成卸掉(&[], &开着).is_empty());
    }

    #[test]
    fn 递的那串照原件那一手只有假值才算空() {
        assert_eq!(递的那串(&Value::Null), "");
        assert_eq!(递的那串(&json!("")), "");
        assert_eq!(递的那串(&json!(false)), "");
        assert_eq!(递的那串(&json!(0)), "");
        assert_eq!(递的那串(&json!("a")), "a");
        assert_eq!(递的那串(&json!(true)), "true");
        assert_eq!(递的那串(&json!(7)), "7");
        assert_eq!(递的那串(&json!([])), "");
        assert_eq!(递的那串(&json!(["x", "y"])), "x,y");
    }

    #[test]
    fn 那份东西只读src那一栏没递也算空串() {
        assert_eq!(那份东西(&json!({"src": "某处\\一棵树\\甲家.zip"})), "某处\\一棵树\\甲家.zip");
        assert_eq!(那份东西(&json!({"src": ""})), "");
        assert_eq!(那份东西(&json!({"src": null})), "");
        assert_eq!(那份东西(&json!({})), "");
        assert_eq!(那份东西(&Value::Null), "");
        assert_eq!(那份东西(&json!([])), "");
    }

    #[test]
    fn 清单上的id退兜底并去掉首尾空白() {
        let 单 = json!({"id": "  甲家  ", "name": "  甲之名  "});
        assert_eq!(清单上的id(&单, "兜底名"), "甲家");
        /* 没写 id、写了空串、写了 null 都退兜底（原件 String(m.id || 兜底)） */
        assert_eq!(清单上的id(&json!({}), "兜底名"), "兜底名");
        assert_eq!(清单上的id(&json!({"id": ""}), "兜底名"), "兜底名");
        assert_eq!(清单上的id(&json!({"id": null}), "兜底名"), "兜底名");
        /* 名字那一栏不 trim —— 原件 m.name || id 就是照原文给 */
        assert_eq!(清单上的名字(&单, "兜底名"), "  甲之名  ");
        assert_eq!(清单上的名字(&json!({"name": ""}), "甲家"), "甲家");
    }

    #[test]
    fn 收不收压缩包只看尾巴那四个字() {
        assert!(是压包那份("某处\\那一格\\甲家.zip"));
        assert!(是压包那份("某处\\那一格\\甲家.ZIP"));
        assert!(!是压包那份("某处\\那一格\\甲家"));
        assert!(!是压包那份("某处\\那一格\\zip"));
        assert!(!是压包那份(""));
    }

    #[test]
    fn 末段与后缀两头折法照node() {
        assert_eq!(末段("某处\\那一格\\甲家.zip"), "甲家.zip");
        assert_eq!(末段("某处/那一格/甲家.zip"), "甲家.zip");
        assert_eq!(末段("甲家"), "甲家");
        assert_eq!(末段(""), "");
        assert_eq!(后缀("某处\\那一格\\甲家.zip"), ".zip");
        /* 点在末段第一个字上（'.zip' 那种当名字用）算没后缀 —— path.extname 同一手 */
        assert_eq!(后缀("某处\\那一格\\.zip"), "");
        assert_eq!(后缀("某处\\那一格\\甲家"), "");
        assert_eq!(末段去后缀("某处\\那一格\\甲家.zip"), "甲家");
        assert_eq!(末段去后缀("某处\\那一格\\甲家.b.zip"), "甲家.b");
        assert_eq!(末段去后缀("某处\\那一格\\甲家"), "甲家");
        /* 整段就等于后缀时不折成空名字 */
        assert_eq!(末段去后缀("某处\\那一格\\.hidden\\.hidden"), ".hidden");
    }

    #[test]
    fn 折成绝对三种写法各归各的顶() {
        let 当前 = format!("{}:\\某处\\一棵树", 'C');
        /* 空串：原件 path.resolve('') 就是当前那一格 */
        assert_eq!(折成绝对("", &当前), format!("{}:\\某处\\一棵树", 'C'));
        /* 相对写法：并进当前那一格 */
        assert_eq!(折成绝对("那一格\\甲家.zip", &当前), format!("{}:\\某处\\一棵树\\那一格\\甲家.zip", 'C'));
        /* 盘符写法：斜杠折成反斜杠、顶上那枚分隔留着 */
        assert_eq!(折成绝对(&format!("{}:/那一格/甲家", 'D'), &当前), format!("{}:\\那一格\\甲家", 'D'));
        assert_eq!(折成绝对(&format!("{}:", 'D'), &当前), format!("{}:\\", 'D'));
        /* 单个分隔打头：原件走同一个盘的根，这里也从 当前格 里取那枚盘符 */
        assert_eq!(折成绝对("\\那一格\\甲家", &当前), format!("{}:\\那一格\\甲家", 'C'));
        /* UNC：机器名 + 共享名 当顶 */
        assert_eq!(折成绝对("\\\\另一台\\那一格\\甲家.zip", &当前), "\\\\另一台\\那一格\\甲家.zip");
    }

    #[test]
    fn 折成绝对把段里的点与回退折干净() {
        let 当前 = format!("{}:\\某处\\一棵树", 'C');
        assert_eq!(折成绝对(&format!("{}:\\甲\\乙\\.\\丙", 'D'), &当前), format!("{}:\\甲\\乙\\丙", 'D'));
        assert_eq!(折成绝对(&format!("{}:\\甲\\乙\\..\\丙", 'D'), &当前), format!("{}:\\甲\\丙", 'D'));
        /* 退到顶就停住：原件 path.resolve 也不会退到顶以外 */
        assert_eq!(折成绝对(&format!("{}:\\..\\..", 'D'), &当前), format!("{}:\\", 'D'));
        assert_eq!(折成绝对("甲\\..\\..\\乙", &当前), format!("{}:\\某处\\乙", 'C'));
        assert_eq!(折成绝对("甲//乙/", &当前), format!("{}:\\某处\\一棵树\\甲\\乙", 'C'));
    }

    #[test]
    fn 摊那一条三种款式各照原件那一手() {
        assert_eq!(摊那一条("assets/"), 那一条::跳过);
        assert_eq!(摊那一条("assets\\"), 那一条::跳过);
        assert_eq!(摊那一条(""), 那一条::脏(空路径那句.to_string()));
        assert_eq!(摊那一条("./a//b"), 那一条::落成(vec!["a".to_string(), "b".to_string()]));
        assert_eq!(摊那一条("a\\b.txt"), 那一条::落成(vec!["a".to_string(), "b.txt".to_string()]));
        assert_eq!(摊那一条("a/../../b"), 那一条::脏(脏路径那句("a/../../b")));
        assert_eq!(摊那一条(".."), 那一条::脏(脏路径那句("..")));
        /* 原件那一手先判尾斜杠（1945 行），'./' 那种记的是文件夹，跳过轮不到段名那一道 */
        assert_eq!(摊那一条("./"), 那一条::跳过);
    }

    #[test]
    fn 页面递的不是列表就按空的一串办() {
        let 列 = json!(["甲", "乙"]);
        assert_eq!(按名单收(Some(&列)).len(), 2);
        assert!(按名单收(Some(&json!("甲"))).is_empty());
        assert!(按名单收(Some(&json!({"a": 1}))).is_empty());
        assert!(按名单收(None).is_empty());
        assert!(按名单收(Some(&Value::Null)).is_empty());
    }

    #[test]
    fn 清数据只在数据层根以内动手() {
        let 根 = "某处\\一棵树\\data";
        assert!(在根以内("某处\\一棵树\\data\\userdata-fd\\notes.json", 根));
        assert!(在根以内("某处\\一棵树\\data\\logs", 根));
        /* 等号那一格自己不算以内（原件 root + path.sep 那一手）：数据层根本体不许整颗删 */
        assert!(!在根以内(根, 根));
        assert!(!在根以内("某处\\一棵树\\data2\\x", 根));
        assert!(!在根以内("某处\\一棵树", 根));
        /* 根上带不带尾分隔都同一个比法 */
        assert!(在根以内("某处\\一棵树\\data\\x", "某处\\一棵树\\data\\"));
    }

    #[test]
    fn 插件那一格与名单永远留着只挡这一格() {
        let 包格 = "某处\\一棵树\\data\\plugins";
        /* 整格本身与底下每一份都留着（包与 off.json 永远不许动 —— 装得回来靠的就是它还在） */
        assert!(包那一格留着(包格, 包格));
        assert!(包那一格留着("某处\\一棵树\\data\\plugins\\甲家\\main.js", 包格));
        assert!(包那一格留着("某处\\一棵树\\data\\plugins\\off.json", 包格));
        /* 名字像但不是的那一格不挡（原件比的是 resolve 完的前缀） */
        assert!(!包那一格留着("某处\\一棵树\\data\\pluginsx", 包格));
        /* 从前还有一格「plugins-factory」（导入时留的原版）也只当普通格子 —— 那一格随插件分离第 2 批 2.6 整格撤了，
           名字像但不是的那一种照旧不挡（原件比的是 resolve 完的前缀） */
        assert!(!包那一格留着("某处\\一棵树\\data\\plugins-factory\\甲家", 包格));
        assert!(!包那一格留着("某处\\一棵树\\data\\logs", 包格));
    }

    #[test]
    fn 号比不出高低就把两个号摆出来让人看() {
        /* 号里 +build. 那一截不参与排序：两边都是 1.0.0-alpha —— 从前这一条回"不提醒"，
           于是他把新包丢进去、界面说"已经是最新"（他 2026-10-19 那一问）。改口：两个号不一样就提醒，
           界面上把"这一格哪一号 / 这颗哪一号"一起写出来，换不换由他点。
           真正拦降级的是号里那一段排序数（1.0.0-alpha.58 赢 1.0.0-alpha.57），不是盘上时间。 */
        assert!(该提醒换("1.0.0-alpha+build.094eeb7", "1.0.0-alpha+build.2ac34ee"));
        assert!(该提醒换("1.0.0-alpha+build.2ac34ee", "1.0.0-alpha+build.094eeb7"));
        assert!(!该提醒换("1.0.0-alpha+build.2ac34ee", "1.0.0-alpha+build.2ac34ee"));
        /* 两头都有空格也算同一串（号是从清单与信息段里读的，不该被空格骗出一次提醒） */
        assert!(!该提醒换(" 1.0.0 ", "1.0.0 "));
        /* 这一格还没摊出号（清单读不出、那一格里没 manifest.json）不提醒 —— 那是要重装的那一家，不是要换版的那一家 */
        assert!(!该提醒换("", "1.0.0-alpha+build.2ac34ee"));
        /* 包上没号也不提醒（不许拿一个空号去换掉好好的一格） */
        assert!(!该提醒换("1.0.0-alpha+build.2ac34ee", ""));
    }

    #[test]
    fn 号分得出高低就照号比() {
        /* 主段大的赢 —— 号是明写的新旧，别的地方不再另留一份凭据 */
        assert!(该提醒换("1.0.0-alpha.7+build.aaaaaaa", "1.0.0-alpha.8+build.bbbbbbb"));
        assert!(!该提醒换("1.0.0-alpha.8+build.bbbbbbb", "1.0.0-alpha.7+build.aaaaaaa"));
        /* 预发布比正式版旧：1.0.0-alpha 不比 1.0.0 新 */
        assert!(!该提醒换("1.0.0", "1.0.0-alpha"));
        assert!(该提醒换("1.0.0-alpha", "1.0.0"));
        /* 预发布里数字段按数比：alpha.9 输给 alpha.10（拿字典比就会翻过来） */
        assert!(该提醒换("1.0.0-alpha.9", "1.0.0-alpha.10"));
        /* 段数少的算小：alpha < alpha.1 */
        assert!(该提醒换("1.0.0-alpha", "1.0.0-alpha.1"));
        /* 主段先赢：1.0.1 的 alpha 也比 1.0.1 的正式版旧 */
        assert!(!该提醒换("1.0.1", "1.0.1-alpha"));
    }

    #[test]
    fn 拿不出第三个凭据也不许把门关上() {
        /* 从前这里靠"打包时刻"与那一格里的来路条比新旧，两样都被他否了（2026-10-19）：
           「记什么提交时刻啊」「为什么需要额外记录哪个装了哪个没装？纯属多余」。
           这一道钉的就是**这颗手里只剩两个号**：号不一样就提醒，谁都不许拿"比不出"当"不用动"。 */
        assert!(该提醒换("1.0.0-alpha", "1.0.0-alpha+build.abcdef0"));
        assert!(!该提醒换("1.0.0-alpha+build.abcdef0", "1.0.0-alpha+build.abcdef0"));
        /* 不成号的写法（主段不是三段那种）比不出高低，也照样按"号不一样"提醒 */
        assert!(该提醒换("1.0", "2.0"));
    }

    #[test]
    fn 比号读不出回空不许当成相等() {
        use std::cmp::Ordering;
        assert_eq!(比号("1.0.0", "1.0.0"), Some(Ordering::Equal));
        assert_eq!(比号("1.0", "1.0.0"), None);           /* 主段不是三段 */
        assert_eq!(比号("甲.乙.丙", "1.0.0"), None);       /* 主段不是数字 */
        assert_eq!(比号("", "1.0.0"), None);
    }

    #[test]
    fn 换进来换下去那两名下划线开头列不成一家() {
        /* 「哪一格算一家」那把尺住在 about_info 那一格（关于那一屏与管理页共用），这里借它验临时名 */
        let 算 = crate::fd_core::about_info::算一家;
        assert!(!算(&换进来名("notes")));
        assert!(!算(&换下去名("notes")));
        assert!(算("notes"));
        assert!(换进来名("notes") != 换下去名("notes"));
    }
}
