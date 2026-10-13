
// 文件那一组里的“判断”部分：给扩展名认内容类型、把要读的区间夹进文件里、
// 整棵树一次报完时收哪些、深度与条数各到哪一档停、写进来的那一团是什么字节。
// 口径照 Electron 那一头 src\pack\main.cjs 里文件那十条通道的现行写法搬，数值一个字不改。

// 扩展名 -> 内容类型。表照主进程那张搬，多一个都不给（认不出来的一律 octet-stream）。
/// 本地协议回文件时挂的类型。一颗颗对着 Electron 那侧 main.cjs 的 MIME 表抄的（外46 三 批七）。
/// 为什么必须有 `.js`：插件是 `import()` 进来的 ES 模块，浏览器对模块脚本查类型查得死 ——
/// 回了 `application/octet-stream` 就当场拒绝，七家插件一家都加载不进来
/// （2026-10-12 无窗跑真页量到的：桌面画出了卡、数据也读到了，插件那一列全报 "Failed to fetch dynamically imported module"）。
/// 文本那几类一律带 `charset=utf-8`，跟 Electron 那侧一字不差，免得中文页在两个壳里行为不一样。
pub fn mime_of(path: &str) -> &'static str {
    match extension_of(&path.to_lowercase()).as_str() {
        ".html" => "text/html; charset=utf-8",
        ".js" | ".mjs" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".json" => "application/json; charset=utf-8",
        ".map" => "application/json",
        ".txt" => "text/plain; charset=utf-8",
        ".md" => "text/markdown; charset=utf-8",
        ".yaml" | ".yml" => "text/yaml; charset=utf-8",
        ".png" => "image/png",
        ".jpg" | ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".bmp" => "image/bmp",
        ".svg" => "image/svg+xml",
        ".ico" => "image/x-icon",
        ".woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

// 最后一截扩展名（带着点）。两种斜杠都当分隔；没有点就是空串。
pub fn extension_of(low_path: &str) -> String {
    let 尾 = 尾名(low_path);
    match 尾.rfind('.') {
        Some(i) if i > 0 => 尾[i..].to_string(),
        _ => String::new(),
    }
}

fn 尾名(path: &str) -> &str {
    let 去尾 = path.trim_end_matches(['/', '\\']);
    match 去尾.rfind(['/', '\\']) {
        Some(i) => &去尾[i + 1..],
        None => 去尾,
    }
}

// 要读的区间夹进文件里：起点不过文件尾，长度不过剩下那点。
// 来路是页面传的两个数（可能是小数、也可能根本不是数），拿不到数就当 0 —— 跟那一头 Math.floor(Number(x) || 0) 同一手。
pub fn clamp_range(size: u64, start: f64, length: f64) -> (u64, usize) {
    let 总 = size as f64;
    let 起 = if start.is_finite() { start.floor().max(0.0).min(总) } else { 0.0 };
    let 长 = if length.is_finite() { length.floor().max(0.0).min(总 - 起) } else { 0.0 };
    (起 as u64, 长 as usize)
}

// 整棵树一次报完的两道顶（照那一头：几百个文件逐个问一遍，光往返回就把省下的吃回去）
pub const TREE_MAX_ENTRIES: usize = 20000;
pub const TREE_MAX_DEPTH: usize = 12;

// 收不收这一份：没给后缀名单就全收，给了就拿小写名字比后缀。
pub fn tree_wants(low_name: &str, want: Option<&[String]>) -> bool {
    match want {
        None => true,
        Some(list) => list.iter().any(|s| low_name.ends_with(s.as_str())),
    }
}

// 树里报的是从根那一格起的那一串，分隔固定用 /（跟那一头 base + '/' + name 同写法）
pub fn rel_of(base: &str, name: &str) -> String {
    if base.is_empty() { name.to_string() } else { format!("{}/{}", base, name) }
}

// 写进来那一团是什么形状：文本字符串、还是逐个数出来的字节数组。
// 原始字节那条口子（壳与页之间不走 JSON 那一手）等能跑起来量了再定，这里不猜。
pub fn payload_bytes(v: &serde_json::Value) -> Vec<u8> {
    match v {
        serde_json::Value::String(s) => s.as_bytes().to_vec(),
        serde_json::Value::Array(list) => list.iter().filter_map(|x| x.as_u64().map(|n| n as u8)).collect(),
        serde_json::Value::Null => Vec::new(),
        other => other.to_string().into_bytes(),
    }
}

#[cfg(test)]
mod 验判断 {
    use super::*;

    #[test]
    fn 扩展名认类型_认不出的一律未知流() {
        assert_eq!(mime_of("某处\\子层\\一首歌.MP3"), "application/octet-stream");
        assert_eq!(mime_of("a/b/词.yaml"), "text/yaml; charset=utf-8");
        assert_eq!(mime_of("a/b/词.YML"), "text/yaml; charset=utf-8");
        assert_eq!(mime_of("封面.PNG"), "image/png");
        assert_eq!(mime_of("没有后缀"), "application/octet-stream");
        assert_eq!(mime_of("点开头"), "application/octet-stream");
    }

    #[test]
    fn 模块与样式回对类型_不然插件一家都进不来() {
        /* 插件是 import() 进来的 ES 模块：类型回成 application/octet-stream 浏览器当场拒收，
           七家全报 "Failed to fetch dynamically imported module"（2026-10-12 无窗跑真页量到的）。 */
        assert_eq!(mime_of("data/plugins/notes/main.js"), "text/javascript; charset=utf-8");
        assert_eq!(mime_of("某处/一件.mjs"), "text/javascript; charset=utf-8");
        assert_eq!(mime_of("a/样.CSS"), "text/css; charset=utf-8");
        assert_eq!(mime_of("a/页.HTML"), "text/html; charset=utf-8");
        assert_eq!(mime_of("a/说.md"), "text/markdown; charset=utf-8");
        assert_eq!(mime_of("a/表.json"), "application/json; charset=utf-8");
        assert_eq!(mime_of("a/底本.js.map"), "application/json");
        assert_eq!(mime_of("a/图.SVG"), "image/svg+xml");
        assert_eq!(mime_of("a/标.ico"), "image/x-icon");
        assert_eq!(mime_of("a/字.woff2"), "font/woff2");
    }

    #[test]
    fn 后缀两种斜杠都认() {
        assert_eq!(extension_of("甲/乙/丙.txt"), ".txt");
        assert_eq!(extension_of("甲/.隐藏"), "");
    }

    #[test]
    fn 区间夹取越界与不是数都收到零() {
        assert_eq!(clamp_range(100, 10.0, 20.0), (10, 20));
        assert_eq!(clamp_range(100, 90.0, 20.0), (90, 10));      // 长度过文件尾：截到剩下那点
        assert_eq!(clamp_range(100, 120.0, 5.0), (100, 0));      // 起点已经出界：读到零长
        assert_eq!(clamp_range(100, -5.0, 5.0), (0, 5));         // 负起点：按零
        assert_eq!(clamp_range(100, f64::NAN, f64::NAN), (0, 0)); // 不是数：按零
        assert_eq!(clamp_range(0, 0.0, 10.0), (0, 0));           // 空文件
    }

    #[test]
    fn 树只收点名的后缀且相对路径用斜杠() {
        let 名单 = vec![".md".to_string(), ".yaml".to_string()];
        assert!(tree_wants("章/一.md", Some(&名单)));
        assert!(tree_wants("甲\\乙.MD".to_lowercase().as_str(), Some(&名单)));
        assert!(!tree_wants("一.txt", Some(&名单)));
        assert!(tree_wants("一.txt", None));
        assert_eq!(rel_of("", "一.md"), "一.md");
        assert_eq!(rel_of("章", "一.md"), "章/一.md");
    }

    #[test]
    fn 写进来的文本与字节数组都化成字节() {
        assert_eq!(payload_bytes(&serde_json::json!("一行字")), "一行字".as_bytes().to_vec());
        assert_eq!(payload_bytes(&serde_json::json!([1, 2, 255])), vec![1u8, 2, 255]);
        assert_eq!(payload_bytes(&serde_json::json!(null)), Vec::<u8>::new());
    }
}
