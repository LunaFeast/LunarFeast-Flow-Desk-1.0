/* 四层里的第一层 · 自有容器（.fdpkg）怎么读（插件分离第 3 批 3.2 · 规格在 docs\插件容器格式.md）
   ------------------------------------------------------------
   这一格只做字节算术与字段核对：给一串包字节，回"这是什么包、里面有哪几份、每一份对不对、
   这一台能不能读它"。开不开得到那份文件、落不落得了盘、页面上摆哪一句，全归第三层与页面。

   四段的形状（大端序）：
     [文件头 12]   标记 'FDP1'(4) · 格式版本 u16 · 头部标志 u16（现在必须 0）· 信息段长度 u32
     [信息段]      明文 JSON（故意不加密：管理页要在不加载任何东西的前提下把名字/版本/要求列出来，
                   开机自检也靠这一段核"齐不齐、坏没坏"）
     [内容段]      一份一块：长度 u32 · 块号 u16 · 数据；块号就是信息段 files 那张表里的下标，顺序照表走
     [签名段 72]   算法 u16 · 钥匙号 u16 · 保留 u32（现在必须 0，那一位留给"只对某台机器有效"）· 签名 64
                   （规格那一页原先写「固定 88 字节」，把这四件一加是 72 —— 2026-10-16 按四件之和改成 72，
                    两边现在同一数；改号只动这一枚常量与那两行表格）

   报话分开写死（#32 那条：不许合并成一句"出错了"）：
     读不了这种格式 / 信息段字段不齐或多了没见过的 / 某一块与对不上号 / 要的主程序比这台高 /
     签名这一档这台读不了 / 包比它自己声明的短 / 加密的那一块这台没有钥匙。

   哈希那一颗不自己写：用图里已经带着的 sha2（wry → sha2 那条链上就有，离线缓存里是 0.10.9，
   这一版没往依赖图里添新件）。试着自己写那一版，三句已知向量一句都没对上一字 —— 拿它当"改没改过"的尺，
   错了比没有更糟。测试里那三句向量照钉（含 1MB 那一长串，覆盖补位与多块两条路）。 */

use std::cmp::Ordering;

/* ---------- 那几个写死的数与名 ---------- */

/// 文件头那四枚标记
pub const 标记: &[u8; 4] = b"FDP1";
/// 这一版认得的格式号
pub const 认得版本: u16 = 1;
/// 文件头定长
pub const 头长: usize = 12;
/// 内容段里每一块自己的头（长度 4 + 块号 2）
pub const 块头长: usize = 6;
/// 签名段定长（算法 2 + 钥匙号 2 + 保留 4 + 签名 64 = 72）
pub const 签名长: usize = 72;
/// 一把块都不加密（1.0 免费开源那一档就是这一档）
pub const 没锁: u16 = 0;
/// 没签名：允许装、允许加载，管理页那一行标「用户插件」
pub const 没签: u16 = 0;
/// Ed25519：签名段里格式认得的另一种算法位（验它的那一手要等引入那颗件，见 整包检查 里那段）
pub const 爱德25519: u16 = 1;

/// 信息段允许出现的键（表外多一个键就报 —— 防的是"改了信息段忘了重签"那一类）
pub const 认得键: [&str; 10] = [
    "id", "name", "version", "min_shell", "author", "source", "key_id", "files", "kernels", "created",
];
/// 必填的那几个（author 与 source 是导入进来的第三方包认人用的）
pub const 必填键: [&str; 7] =
    ["id", "name", "version", "min_shell", "author", "source", "files"];

/* ---------- 那几句报话（措辞就是页面上摆的那一句） ---------- */

pub const 读不了格式那句: &str = "这一份不是 Flow-Desk 的插件包，或者用的格式版本这台读不了";
pub const 字段不齐那句: &str = "包里的信息段缺字段，或者多了这台没见过的字段";
pub const 哈希不对那句: &str = "包里有一份文件与对不上号（可能被改过，也可能坏了）";
pub const 版本不够那句: &str = "这一家要的主程序比这台当前的高 · 先更新主程序再加载它";
pub const 签名读不了那句: &str = "这一份带着这台还验不了的签名";
pub const 块短了那句: &str = "包比它自己声明的短，有一份文件整个没进来";
pub const 块加密那句: &str = "包里有加密的那一块，这台主程序还没有能解它的钥匙";
/// 三种时机里"核活着的那一格"用的那一句：包上写着有这一份，这一格里找不到
/// （这一句与上面那七句并列，凑成八种；#30 那句"一律不做缺失提示"管的是内核那一类，
///   这一句报的是"这一家自己的文件与包上对不上"，两回事）
pub const 少一份那句: &str = "这一格里少了一份文件（包上写着有，这一格里没找到）";
/// 未签名的包照他的定：允许装、允许加载，界面上标这一句
pub const 用户插件那句: &str = "用户插件";
/// 自有容器的扩展名（不含点）。规格第五节那条：他点头之前，这一处就是全项目唯一的一处
pub const 扩展名: &str = "fdpkg";
/// 带着那枚点的那一种写法（扫插件路径与落点拼接用的）；与上面那一枚同格、只这一处
pub const 带点后缀: &str = ".fdpkg";

/* ---------- 形状 ---------- */

/// 信息段 files 里的一条
#[derive(Debug, Clone, PartialEq)]
pub struct 一份文件 {
    pub 路径: String,
    pub 大小: u64,
    pub 哈希: String,
    pub 加密: bool,
}

/// 信息段折出来那一张（字段名照 docs\插件容器格式.md 第二节那张表）
#[derive(Debug, Clone, PartialEq, Default)]
pub struct 一张信息 {
    pub id: String,
    pub name: String,
    pub version: String,
    pub min_shell: String,
    pub author: String,
    pub source: String,
    pub key_id: u64,
    pub created: u64,
    pub files: Vec<一份文件>,
    pub kernels: Vec<String>,
}

/// 内容段里一块落在哪、多长
#[derive(Debug, Clone, PartialEq)]
pub struct 一块位置 {
    pub 路径: String,
    pub 块号: usize,
    pub 数据起点: usize,
    pub 长度: usize,
}

/// 一条报话：哪一种 + 那一句（带得上"哪一块"的就带）
#[derive(Debug, Clone, PartialEq)]
pub struct 一条报 {
    pub 种: &'static str,
    pub 句: String,
}

/// 逐块核对的结果（规格第三节那句「坏一块只报那一块，读得到的部分照样列给用户看」落在这儿）
#[derive(Debug, Clone, PartialEq)]
pub struct 一块核对 {
    pub 路径: String,
    pub 块号: usize,
    /// 对上了 / 哈希不对那句 / 块短了那句 / 块加密那句 —— 不另造第二套字眼
    pub 状态: &'static str,
}

/// 这一块与它自己声明的哈希对上了（状态位里唯一那句"没问题"）
pub const 对上了: &str = "对上了";

impl 一条报 {
    fn 新(种: &'static str, 句: impl Into<String>) -> 一条报 { 一条报 { 种, 句: 句.into() } }
}

/// 一次整包检查的回执（第三层原样递给页面）
#[derive(Debug, Clone, PartialEq)]
pub struct 一份检查 {
    pub ok: bool,
    pub 版本: u16,
    pub 信息: Option<一张信息>,
    pub 内容起点: usize,
    pub 块: Vec<一块位置>,
    pub 逐块: Vec<一块核对>,
    pub 签名算法: u16,
    pub 签名钥匙号: u16,
    pub 签名: Vec<u8>,
    pub 报: Vec<一条报>,
}

impl 一份检查 {
    fn 不成(句: &'static str) -> 一份检查 {
        一份检查 {
            ok: false,
            版本: 0,
            信息: None,
            内容起点: 0,
            块: vec![],
            逐块: vec![],
            签名算法: 没签,
            签名钥匙号: 没锁,
            签名: vec![],
            报: vec![一条报::新(句, 句)],
        }
    }
    /// 页面上那一行摆的第一句报话（没有报 = 空串）
    pub fn 头一句(&self) -> String {
        self.报.first().map(|x| x.句.clone()).unwrap_or_default()
    }
    /// 没签名的包：管理页那一行标「用户插件」
    pub fn 用户插件(&self) -> bool {
        self.签名算法 == 没签
    }
    /// 管理页那一行右边那一枚标记的字（只有未签名这一种；签了名的这一版给不出第二种标记）
    pub fn 标记(&self) -> Option<&'static str> {
        if self.用户插件() { Some(用户插件那句) } else { None }
    }
}

/* ---------- 小工具：大端取数 ---------- */

fn 读u16(全: &[u8], 起: usize) -> Option<u16> {
    Some(u16::from_be_bytes([*全.get(起)?, *全.get(起 + 1)?]))
}
fn 读u32(全: &[u8], 起: usize) -> Option<u32> {
    Some(u32::from_be_bytes([*全.get(起)?, *全.get(起 + 1)?, *全.get(起 + 2)?, *全.get(起 + 3)?]))
}

/* ---------- SHA-256（用依赖图里已经带着的那颗 sha2，不自己写） ---------- */

/// 一串字节的 SHA-256，回 64 位小写十六进制（信息段里存的就是这一串写法）
pub fn 算哈希(字节: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    Sha256::digest(字节).iter().map(|枚| format!("{:02x}", 枚)).collect()
}

/* ---------- 号怎么比（照页面与发布那两把 cmpVer 同一口：逐段取数，缺的当 0） ---------- */

fn 号段(号: &str) -> Vec<u64> {
    /* '1.0.0-alpha+build.abc1234' 这种：'+' 后面那截（构建号）与 '-' 后面的预发布标记都不参与高低 */
    let 主 = 号.split('+').next().unwrap_or("");
    let 主 = 主.split('-').next().unwrap_or("");
    主.split('.')
        .map(|段| 段.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0u64))
        .collect()
}

/// 两个号谁高
pub fn 比号(甲: &str, 乙: &str) -> Ordering {
    let (a, b) = (号段(甲), 号段(乙));
    for i in 0..a.len().max(b.len()) {
        let (x, y) = (a.get(i).copied().unwrap_or(0), b.get(i).copied().unwrap_or(0));
        if x != y {
            return x.cmp(&y);
        }
    }
    Ordering::Equal
}

/* ---------- 文件头 ---------- */

/// 读那 12 个字节：回（格式号, 信息段长度）。不是这种包 / 版本不认识 / 长度对不上，一律回那一句
pub fn 读头(全: &[u8]) -> Result<(u16, usize), &'static str> {
    if 全.len() < 头长 + 签名长 || &全[0..4] != 标记 {
        return Err(读不了格式那句);
    }
    let 版 = 读u16(全, 4).ok_or(读不了格式那句)?;
    if 版 != 认得版本 {
        return Err(读不了格式那句);
    }
    /* 头部标志现在只许全 0：那一位留给"整包都加密"，没定之前不许写 1（写了就是这台读不了） */
    if 读u16(全, 6).ok_or(读不了格式那句)? != 0 {
        return Err(读不了格式那句);
    }
    let 信长 = 读u32(全, 8).ok_or(读不了格式那句)? as usize;
    if 头长 + 信长 + 签名长 > 全.len() {
        return Err(读不了格式那句);
    }
    Ok((版, 信长))
}

/* ---------- 信息段 ---------- */

fn 十六进制哈希(s: &str) -> bool {
    s.len() == 64 && s.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
}

/// 折信息段：字段齐不齐、键认不认得、路径干不干净、哈希写法对不对，全在这儿判。
/// 路径过的是 comp_rule 那一把 拆段（同一张嘴，不在这一格另起第二份）。
pub fn 折信息段(文: &[u8]) -> Result<一张信息, Vec<String>> {
    let 全 = match std::str::from_utf8(文) {
        Ok(s) => s,
        Err(_) => return Err(vec![字段不齐那句.to_string()]),
    };
    let 值: serde_json::Value = match serde_json::from_str(全) {
        Ok(v) => v,
        Err(e) => return Err(vec![format!("{}（读不成 JSON：{}）", 字段不齐那句, e)]),
    };
    let 表 = match 值.as_object() {
        Some(m) => m,
        None => return Err(vec![字段不齐那句.to_string()]),
    };
    let mut 错: Vec<String> = vec![];
    for 键 in 表.keys() {
        if !认得键.contains(&键.as_str()) {
            错.push(format!("{}：多了没见过的键「{}」", 字段不齐那句, 键));
        }
    }
    for 键 in 必填键.iter() {
        if !表.contains_key(*键) {
            错.push(format!("{}：缺「{}」", 字段不齐那句, 键));
        }
    }
    let 取串 = |k: &str| -> String { 表.get(k).and_then(|v| v.as_str()).unwrap_or("").to_string() };
    let 出 = 一张信息 {
        id: 取串("id"),
        name: 取串("name"),
        version: 取串("version"),
        min_shell: 取串("min_shell"),
        author: 取串("author"),
        source: 取串("source"),
        key_id: 表.get("key_id").and_then(|v| v.as_u64()).unwrap_or(0),
        created: 表.get("created").and_then(|v| v.as_u64()).unwrap_or(0),
        files: vec![],
        kernels: vec![],
    };
    if 出.id.is_empty() {
        错.push(format!("{}：「id」得是一串非空的字", 字段不齐那句));
    }
    let mut 份表: Vec<一份文件> = vec![];
    match 表.get("files").and_then(|v| v.as_array()) {
        None => 错.push(format!("{}：「files」得是一张表", 字段不齐那句)),
        Some(数) => {
            if 数.is_empty() {
                错.push(format!("{}：「files」是空的", 字段不齐那句));
            }
            for 条 in 数 {
                let 路 = 条.get("path").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if crate::fd_core::comp_rule::拆段(&路).is_none() {
                    错.push(format!("{}：路径不干净「{}」", 字段不齐那句, 路));
                }
                let 斯 = 条.get("sha256").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if !十六进制哈希(&斯) {
                    错.push(format!("{}：哈希不是 64 位小写十六进制「{}」", 字段不齐那句, 路));
                }
                份表.push(一份文件 {
                    路径: 路,
                    大小: 条.get("len").and_then(|v| v.as_u64()).unwrap_or(0),
                    哈希: 斯,
                    加密: 条.get("enc").and_then(|v| v.as_bool()).unwrap_or(false),
                });
            }
        }
    }
    /* kernels 是各家清单里点名的内核产物：列了就必须能在 files 里找到（第 1 批那一档的口径） */
    let mut 核表: Vec<String> = vec![];
    if let Some(k) = 表.get("kernels").and_then(|v| v.as_array()) {
        for 名 in k.iter().filter_map(|v| v.as_str()) {
            核表.push(名.to_string());
            if !份表.iter().any(|份| 份.路径 == 名) {
                错.push(format!("{}：kernels 点了「{}」，files 里却没有这一份", 字段不齐那句, 名));
            }
        }
    }
    if !错.is_empty() {
        return Err(错);
    }
    let mut 出 = 出;
    出.files = 份表;
    出.kernels = 核表;
    Ok(出)
}

/* ---------- 内容段：块布局 ---------- */

/// 从内容起点开始，照信息段那张表一块一块排下去；回每一块的数据落在哪儿、多长。
/// 声明的大小与包的实际长度对不对得上，由 整包检查 那一颗报（这一颗只算位置）。
pub fn 块布局(信息: &一张信息, 起点: usize) -> Vec<一块位置> {
    let mut 出 = vec![];
    let mut 游 = 起点;
    for (序, 份) in 信息.files.iter().enumerate() {
        出.push(一块位置 {
            路径: 份.路径.clone(),
            块号: 序,
            数据起点: 游.saturating_add(块头长),
            长度: 份.大小 as usize,
        });
        /* saturating：信息段里那一个「多大」是包自己写的，写成一百万兆也不许把这里的加法撑出去 */
        游 = 游.saturating_add(块头长).saturating_add(份.大小 as usize);
    }
    出
}

/* ---------- 核活着的那一格（三种时机里"开机后台"与"加载那一下"要做的） ---------- */

/// 拿包上那张表核"摊开来在跑的那一格"：每份文件由调用方给一手"按路径读回来"（这一格不认识盘，
/// 也不许自己开文件）。回的是一串报话，空 = 对得上。
/// 少一份、对不上号、要求的主程序比这台高、加密的那一块 —— 四种话各是各的，不许并一句"出错了"。
pub fn 核那一格(信: &一张信息, 读: &dyn Fn(&str) -> Option<Vec<u8>>, 当前号: &str) -> Vec<一条报> {
    let mut 报: Vec<一条报> = vec![];
    for 份 in 信.files.iter() {
        if 份.加密 {
            报.push(一条报::新(块加密那句, format!("{}：{}", 块加密那句, 份.路径)));
            continue;
        }
        match 读(&份.路径) {
            None => 报.push(一条报::新(少一份那句, format!("{}：{}", 少一份那句, 份.路径))),
            Some(字) => {
                if 算哈希(&字) != 份.哈希.to_lowercase() {
                    报.push(一条报::新(哈希不对那句, format!("{}：{}", 哈希不对那句, 份.路径)));
                }
            }
        }
    }
    if !信.min_shell.is_empty() && 比号(&信.min_shell, 当前号) == Ordering::Greater {
        报.push(一条报::新(
            版本不够那句,
            format!("{}（要 {}，这台是 {}）", 版本不够那句, 信.min_shell, 当前号),
        ));
    }
    报
}

/* ---------- 钥匙号 ---------- */

/// 这一台主程序带的那张钥匙表：1.0 这一版一把都没有（免费开源那一档整包不加密）。
/// 往表里加号是发布那一趟的事；**往表里减号永远不许** —— 撤一把老钥匙等于让还没更新主程序的人
/// 打不开自己手里那一份包（规格第二节那条「只加不减」）。
pub const 钥匙表: &[u16] = &[];

/// 包上那一个「第几号钥匙」在这张表里能不能解：没锁（0）永远算能；表**只加不减**
pub fn 认钥匙号(号: u16, 表: &[u16]) -> bool {
    号 == 没锁 || 表.contains(&号)
}

/* ---------- 取一份：包内那一份文件的字节（交给装载与自检那一头） ---------- */

/// 按信息段那张表取某一路径的那一块。回 None 的三种情况：这一份不在包里、整包读不动、那一块是加密的
/// （密文不许在这一头假装能当明文递出去 —— 这一版没有能解它的那一手）。
pub fn 取一块(全: &[u8], 路径: &str) -> Option<Vec<u8>> {
    let (_, 信长) = 读头(全).ok()?;
    let 信 = 折信息段(&全[头长..头长 + 信长]).ok()?;
    let 序 = 信.files.iter().position(|份| 份.路径 == 路径)?;
    /* 密文那一块不许当明文递出去：这一版没有能解它的那一手 */
    if 信.files[序].加密 {
        return None;
    }
    let 块 = 块布局(&信, 头长 + 信长)[序].clone();
    全.get(块.数据起点..块.数据起点.saturating_add(块.长度)).map(|x| x.to_vec())
}

/* ---------- 一次整包检查（第三层与页面吃的就是这一颗） ---------- */

/// 整包检查：全 = 一个 .fdpkg 的全部字节；当前号 = 这台主程序的号；表 = 主程序带的那张钥匙表
pub fn 整包检查(全: &[u8], 当前号: &str, 表: &[u16]) -> 一份检查 {
    let (版, 信长) = match 读头(全) {
        Ok(v) => v,
        Err(句) => return 一份检查::不成(句),
    };
    let 一张 = match 折信息段(&全[头长..头长 + 信长]) {
        Ok(v) => v,
        Err(错) => {
            let mut 出 = 一份检查::不成(字段不齐那句);
            出.报 = 错.into_iter().map(|句| 一条报::新(字段不齐那句, 句)).collect();
            出.版本 = 版;
            return 出;
        }
    };
    let 内容起点 = 头长 + 信长;
    let 签名起 = 全.len() - 签名长;
    let 算法 = 读u16(全, 签名起).unwrap_or(没签);
    let 号 = 读u16(全, 签名起 + 2).unwrap_or(没锁);
    let 保留 = &全[签名起 + 4..签名起 + 8];
    let 签名 = 全[签名起 + 8..].to_vec();
    /* 保留位非 0 = 启用「只对某台机器有效」那一步的包，这一版认不得 */
    if 保留.iter().any(|b| *b != 0) {
        return 一份检查::不成(读不了格式那句);
    }
    let mut 报: Vec<一条报> = vec![];
    /* 这一版壳里没有验 Ed25519 的那一手（不另下一套 crate）：带签名的包照实说读不了，
       绝不假装"对上了"。装不装由第三层照 ok 判。 */
    if 算法 != 没签 {
        报.push(一条报::新(签名读不了那句, 签名读不了那句.to_string()));
    }
    if !认钥匙号(号, 表) {
        报.push(一条报::新(块加密那句, format!("{}（第 {} 号钥匙这台没有）", 块加密那句, 号)));
    }
    let 块表 = 块布局(&一张, 内容起点);
    let 应有 = 块表.last().map(|x| x.数据起点.saturating_add(x.长度)).unwrap_or(内容起点);
    if 应有 > 签名起 {
        报.push(一条报::新(块短了那句, 块短了那句.to_string()));
    }
    /* 逐块算哈希：坏一块只报那一块（读得到的部分照样列给用户看） */
    let mut 有加密块 = false;
    let mut 逐块: Vec<一块核对> = vec![];
    for (序, 份) in 一张.files.iter().enumerate() {
        if 份.加密 {
            有加密块 = true;
            /* 密文算不出与明文同一个数，这一版不猜 */
            逐块.push(一块核对 { 路径: 份.路径.clone(), 块号: 序, 状态: 块加密那句 });
            continue;
        }
        let 位 = &块表[序];
        /* 一块只许占内容段那一段：越进签名段的那些字节不是它的数据，
           包比它自己声明的短就走「短了」那一句，不许拿签名段的零头去对明文的哈希 */
        let 止 = 位.数据起点.saturating_add(位.长度);
        match 全.get(位.数据起点..止).filter(|_| 位.数据起点 <= 签名起 && 止 <= 签名起) {
            None => {
                报.push(一条报::新(块短了那句, format!("{}：{}", 块短了那句, 份.路径)));
                逐块.push(一块核对 { 路径: 份.路径.clone(), 块号: 序, 状态: 块短了那句 });
            }
            Some(字) => {
                let 坏 = 算哈希(字) != 份.哈希.to_lowercase();
                if 坏 {
                    报.push(一条报::新(哈希不对那句, format!("{}：{}", 哈希不对那句, 份.路径)));
                }
                逐块.push(一块核对 {
                    路径: 份.路径.clone(),
                    块号: 序,
                    状态: if 坏 { 哈希不对那句 } else { 对上了 },
                });
            }
        }
    }
    if 有加密块 && 号 == 没锁 {
        报.push(一条报::新(
            块加密那句,
            format!("{}（信息段说 key_id 是 0，却标了加密的块）", 块加密那句),
        ));
    }
    if 一张.min_shell.is_empty() {
        报.push(一条报::新(字段不齐那句, format!("{}：「min_shell」是空的", 字段不齐那句)));
    } else if 比号(&一张.min_shell, 当前号) == Ordering::Greater {
        报.push(一条报::新(
            版本不够那句,
            format!("{}（要 {}，这台是 {}）", 版本不够那句, 一张.min_shell, 当前号),
        ));
    }
    一份检查 {
        ok: 报.is_empty(),
        版本: 版,
        信息: Some(一张),
        内容起点,
        块: 块表,
        逐块,
        签名算法: 算法,
        签名钥匙号: 号,
        签名,
        报,
    }
}

/* ================= 测试共用的两把搭包手（只在 cargo test 里存在，不进产物） =================
   为什么摆在这一格而不是各自的测试段里：动手那两层（tauri_bind::box_cmds）也要拿同一形状的真包
   验它回给页面的那一格 —— 各写一份就会有两把形状，改容器的时候必漏一处。 */

#[cfg(test)]
pub(crate) fn 拼一份(信息: &str, 块: &[&[u8]], 算法: u16, 号: u16) -> Vec<u8> {
    let mut 出: Vec<u8> = vec![];
    出.extend_from_slice(标记);
    出.extend_from_slice(&认得版本.to_be_bytes());
    出.extend_from_slice(&0u16.to_be_bytes());
    出.extend_from_slice(&(信息.len() as u32).to_be_bytes());
    出.extend_from_slice(信息.as_bytes());
    for (序, 字) in 块.iter().enumerate() {
        出.extend_from_slice(&(字.len() as u32).to_be_bytes());
        出.extend_from_slice(&(序 as u16).to_be_bytes());
        出.extend_from_slice(字);
    }
    出.extend_from_slice(&算法.to_be_bytes());
    出.extend_from_slice(&号.to_be_bytes());
    出.extend_from_slice(&[0u8; 4]);
    出.extend_from_slice(&[0u8; 64]);
    出
}

/// 信息段：份 = [(路径, 哈希, 大小)]，多 = 原样追加在末尾的那几条键
#[cfg(test)]
pub(crate) fn 信息段(份: &[(&str, &str, u64)], 多: &str) -> String {
    let 列: Vec<String> = 份
        .iter()
        .map(|(路, 斯, 大)| format!("{{\"path\":\"{}\",\"len\":{},\"sha256\":\"{}\",\"enc\":false}}", 路, 大, 斯))
        .collect();
    let 尾 = if 多.is_empty() { String::new() } else { format!(",{}", 多) };
    format!(
        "{{\"id\":\"notes\",\"name\":\"你的便签\",\"version\":\"1.0.0\",\"min_shell\":\"1.0.0\",\"author\":\"某人\",\"source\":\"某人那台\",\"key_id\":0,\"created\":1,\"files\":[{}]{}}}",
        列.join(","),
        尾
    )
}

/* ================= 纯判断：不起壳、不碰磁盘，cargo test 直接验 ================= */

#[cfg(test)]
mod 验判断 {
    use super::*;

    fn 查(一: &[u8]) -> 一份检查 {
        整包检查(一, "1.0.0", &[0, 7])
    }

    #[test]
    fn sha256_三句已知向量一字不差() {
        assert_eq!(算哈希(b""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        assert_eq!(算哈希(b"abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        let 长 = "a".repeat(1000000);
        assert_eq!(
            算哈希(长.as_bytes()),
            "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"
        );
    }

    #[test]
    fn 号比的是逐段取数缺的当零() {
        assert_eq!(比号("1.0.1", "1.0.0"), Ordering::Greater);
        assert_eq!(比号("1.0", "1.0.0"), Ordering::Equal);
        assert_eq!(比号("0.9.9", "1.0.0"), Ordering::Less);
        /* 构建号与预发布标记不参与高低（照 publish.mjs 那把 cmpVer） */
        assert_eq!(比号("1.0.0-alpha+build.abc1234", "1.0.0"), Ordering::Equal);
    }

    #[test]
    fn 不是这种包与版本不认识都走那一句() {
        assert_eq!(读头(b"PK\x03\x04whatever").unwrap_err(), 读不了格式那句);
        let 底 = 信息段(&[], "");
        let mut 一 = 拼一份(&底, &[], 没签, 没锁);
        一[5] = 9; /* 格式版本 9 —— 这台读不了，不猜 */
        assert_eq!(读头(&一).unwrap_err(), 读不了格式那句);
        assert_eq!(读头(&一[..8]).unwrap_err(), 读不了格式那句);
    }

    #[test]
    fn 头部标志与签名段保留位非零都当不认识() {
        let 字 = b"x";
        let 底 = 信息段(&[("main.js", &算哈希(字), 1)], "");
        let mut 一 = 拼一份(&底, &[字], 没签, 没锁);
        一[7] = 1; /* 头部标志那两枚的低字节 */
        assert_eq!(读头(&一).unwrap_err(), 读不了格式那句);
        let mut 二 = 拼一份(&底, &[字], 没签, 没锁);
        let 起 = 二.len() - 签名长;
        二[起 + 7] = 1; /* 保留位那四枚的最后一枚 */
        assert_eq!(查(&二).头一句(), 读不了格式那句);
    }

    #[test]
    fn 信息段少键多键都报字段不齐() {
        let 错 = 折信息段(b"{\"id\":\"notes\"}").unwrap_err();
        assert!(错.iter().all(|句| 句.starts_with(字段不齐那句)), "{:?}", 错);
        assert!(错.iter().any(|句| 句.contains("缺「files」")), "{:?}", 错);
        let 多 = 信息段(&[("main.js", &算哈希(b"x"), 1)], "\"extra\":1");
        let 错2 = 折信息段(多.as_bytes()).unwrap_err();
        assert!(错2.iter().any(|句| 句.contains("多了没见过的键「extra」")), "{:?}", 错2);
    }

    #[test]
    fn 路径回退写法与哈希写法当场不认() {
        let 脏 = 信息段(&[("../外.js", &算哈希(b"x"), 1)], "");
        assert!(折信息段(脏.as_bytes()).unwrap_err().iter().any(|句| 句.contains("路径不干净")));
        let 短 = 信息段(&[("main.js", "abc", 1)], "");
        assert!(折信息段(短.as_bytes())
            .unwrap_err()
            .iter()
            .any(|句| 句.contains("哈希不是 64 位小写十六进制")));
    }

    #[test]
    fn kernels点了的份files里必须有() {
        let 斯 = 算哈希(b"x");
        let 底 = 信息段(&[("main.js", &斯, 1)], "");
        let 带 = 底.replace("\"created\":1", "\"created\":1,\"kernels\":[\"box-kernel.js\"]");
        assert!(折信息段(带.as_bytes()).unwrap_err().iter().any(|句| 句.contains("files 里却没有这一份")));
        let 齐 = 带.replace("\"files\":[", "\"files\":[{\"path\":\"box-kernel.js\",\"len\":1,\"sha256\":\"x\"},");
        /* 上面那句哈希写成 "x" 故意不合法：报的是哈希那一条，不是 kernels 那一条 */
        let 错 = 折信息段(齐.as_bytes()).unwrap_err();
        assert!(错.iter().any(|句| 句.contains("哈希不是")), "{:?}", 错);
        assert!(!错.iter().any(|句| 句.contains("files 里却没有")));
    }

    #[test]
    fn kernels那条认得也原样折出来() {
        /* 直接拼一份两块的：kernels 点了 box-kernel.js，files 里就得有那一份，折出来也要带在手上 */
        let 斯 = 算哈希(b"x");
        let 一条 = |路: &str| format!("{{\"path\":\"{}\",\"len\":1,\"sha256\":\"{}\",\"enc\":false}}", 路, 斯);
        let 信 = format!(
            "{{\"id\":\"notes\",\"name\":\"你的便签\",\"version\":\"1.0.0\",\"min_shell\":\"1.0.0\",\"author\":\"某人\",\"source\":\"某人那台\",\"key_id\":0,\"created\":1,\"files\":[{},{}],\"kernels\":[\"box-kernel.js\"]}}",
            一条("box-kernel.js"),
            一条("main.js")
        );
        let 出 = 折信息段(信.as_bytes()).unwrap();
        assert_eq!(出.kernels, vec!["box-kernel.js".to_string()]);
        assert_eq!(出.files.len(), 2);
    }

    #[test]
    fn 加密的那一块这台没钥匙就照实说不去猜哈希() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1)], "").replace("\"enc\":false", "\"enc\":true");
        /* 第 9 号钥匙：主程序那张表（只加不减）里只有 0 与 7 —— 这一台解不了，照实说 */
        let 一 = 拼一份(&信, &[字], 没签, 9);
        let 出 = 整包检查(&一, "1.0.0", &[0, 7]);
        assert!(出.报.iter().any(|x| x.种 == 块加密那句), "{:?}", 出.报);
        assert!(!出.报.iter().any(|x| x.种 == 哈希不对那句), "密文不该拿去对明文的哈希：{:?}", 出.报);
        /* 另一处自相矛盾：key_id 写 0（没锁）却标了加密的块 —— 单独一句，不混进上一条 */
        let 二 = 拼一份(&信, &[字], 没签, 没锁);
        assert!(整包检查(&二, "1.0.0", &[0, 7]).报.iter().any(|x| x.句.contains("却标了加密的块")));
    }

    #[test]
    fn 块布局照信息段那张表一段接一段() {
        let 字 = b"hello";
        let 信 = 信息段(&[("main.js", &算哈希(字), 5), ("manifest.json", &算哈希(b"{}"), 2)], "");
        let 一 = 拼一份(&信, &[字, b"{}"], 没签, 没锁);
        let (版, 信长) = 读头(&一).unwrap();
        assert_eq!(版, 认得版本);
        let 出 = 折信息段(&一[头长..头长 + 信长]).unwrap();
        let 块 = 块布局(&出, 头长 + 信长);
        assert_eq!(块.len(), 2);
        assert_eq!(块[0].数据起点, 头长 + 信长 + 块头长);
        assert_eq!(块[0].长度, 5);
        assert_eq!(块[1].数据起点, 块[0].数据起点 + 5 + 块头长);
    }

    /* 发布侧那一颗打包手（src\_build\packbox.mjs）压出来的同一串字节，这一头原样读一遍：
       JS 压、Rust 读，两边拿同一份件核形状 —— 任一边改了布局或哈希写法，这一颗当场红。
       那份件是文字十六进制（不是二进制堆），落在 tools 那一格，发布物里带不出去。 */
    #[test]
    fn 发布侧压的那份试件这一头读得通() {
        let 文 = include_str!("../../../tools/probes/件-容器.hex");
        let 字: Vec<u8> = 文.trim().as_bytes()
            .chunks(2)
            .map(|双| u8::from_str_radix(std::str::from_utf8(双).unwrap(), 16).unwrap())
            .collect();
        let 出 = 查(&字);
        assert!(出.ok, "{:?}", 出.报);
        let 信 = 出.信息.clone().unwrap();
        assert_eq!(信.id, "notes");
        assert_eq!(信.min_shell, "1.0.0");
        assert_eq!(信.files.len(), 3);
        assert_eq!(信.kernels, vec!["box-kernel.js".to_string()]);
        assert!(出.用户插件(), "未签名的包：这一头认它是用户插件，不当成问题");
        assert_eq!(出.头一句(), "");
        assert_eq!(出.逐块.iter().filter(|核| 核.状态 == 对上了).count(), 3, "三块都该与对得上号");
    }

    #[test]
    fn 取一块按信息段那张表拿那一份() {
        let 甲 = b"hello";
        let 乙 = "{}".as_bytes();
        let 信 = 信息段(&[("main.js", &算哈希(甲), 甲.len() as u64), ("manifest.json", &算哈希(乙), 乙.len() as u64)], "");
        let 一 = 拼一份(&信, &[甲, 乙], 没签, 没锁);
        assert_eq!(取一块(&一, "main.js").unwrap(), 甲.to_vec());
        assert_eq!(取一块(&一, "manifest.json").unwrap(), 乙.to_vec());
        assert_eq!(取一块(&一, "没这一份.js"), None, "包里没这一份就是没这一份，不许回半截");
        assert_eq!(取一块("不是包".as_bytes(), "main.js"), None, "整包读不动也不许硬取");
    }

    #[test]
    fn 加密的那一块不当明文递出去() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1)], "").replace("\"enc\":false", "\"enc\":true");
        let 一 = 拼一份(&信, &[字], 没签, 9);
        assert_eq!(取一块(&一, "main.js"), None, "这一版没有能解它的钥匙，密文一块一处都不许当明文漏出去");
    }

    #[test]
    fn 整包好的过检并且标成用户插件() {        let 字 = "/* 便签 */".as_bytes();
        let 信 = 信息段(&[("main.js", &算哈希(字), 字.len() as u64)], "");
        let 一 = 拼一份(&信, &[字], 没签, 没锁);
        let 出 = 查(&一);
        assert!(出.ok, "{:?}", 出.报);
        assert!(出.用户插件());
        assert_eq!(出.头一句(), "");
        let 名 = 出.信息.clone().unwrap();
        assert_eq!(名.id, "notes");
        assert_eq!(名.files.len(), 1);
    }

    #[test]
    fn 改一个字节就报哈希对不上并且带是哪一块() {
        let 字 = "/* 便签 */".as_bytes();
        let 信 = 信息段(&[("main.js", &算哈希(字), 字.len() as u64)], "");
        let 一 = 拼一份(&信, &[字], 没签, 没锁);
        assert!(查(&一).ok);
        let mut 坏 = 一.clone();
        let 数据起 = 头长 + 读头(&坏).unwrap().1 + 块头长;
        坏[数据起] ^= 0xff;
        let 出 = 查(&坏);
        assert!(!出.ok);
        assert_eq!(出.报[0].种, 哈希不对那句, "{:?}", 出.报);
        assert!(出.报[0].句.contains("main.js"), "{:?}", 出.报);
    }

    #[test]
    fn 少一份块报的是短了不是哈希() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1), ("没进来.js", &算哈希(b"y"), 1)], "");
        let 一 = 拼一份(&信, &[字], 没签, 没锁); /* 第二块整个不写 */
        let 出 = 查(&一);
        assert!(!出.ok);
        assert!(出.报.iter().any(|x| x.种 == 块短了那句), "{:?}", 出.报);
        assert!(!出.报.iter().any(|x| x.种 == 哈希不对那句), "短了不该顺带报哈希：{:?}", 出.报);
    }

    #[test]
    fn 声明的大小比整包还大不许把加法撑出去() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1_000_000_000)], "");
        let 一 = 拼一份(&信, &[字], 没签, 没锁);
        let 出 = 查(&一);
        assert!(!出.ok);
        assert!(出.报.iter().all(|x| x.种 == 块短了那句), "{:?}", 出.报);
        assert_eq!(出.逐块[0].状态, 块短了那句, "这一块根本没写满，不该走到算哈希那一步");
    }

    #[test]
    fn 要的主程序更高就报版本不够() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1)], "").replace("\"min_shell\":\"1.0.0\"", "\"min_shell\":\"9.9.9\"");
        let 一 = 拼一份(&信, &[字], 没签, 没锁);
        let 出 = 查(&一);
        assert!(出.报.iter().any(|x| x.种 == 版本不够那句), "{:?}", 出.报);
    }

    #[test]
    fn 带签名的包这台读不了不假装对上() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1)], "");
        let 一 = 拼一份(&信, &[字], 爱德25519, 没锁);
        let 出 = 查(&一);
        assert!(!出.ok);
        assert!(出.报.iter().any(|x| x.种 == 签名读不了那句), "{:?}", 出.报);
        assert!(!出.用户插件());
    }

    #[test]
    fn 钥匙表只加不减不在表里就报没有那把() {
        assert!(认钥匙号(没锁, &[0, 7]), "没锁永远算能");
        assert!(认钥匙号(7, &[0, 7]));
        assert!(!认钥匙号(9, &[0, 7]), "表里没这一号就是解不了");
        assert!(认钥匙号(0, &[0]), "老钥匙不许从表里减掉");
    }

    #[test]
    fn 扩展名那两枚说的是同一种后缀() {
        assert!(带点后缀.ends_with(扩展名) && 带点后缀.len() == 扩展名.len() + 1, "{} 与 {}", 带点后缀, 扩展名);
    }

    #[test]
    fn 报话各是各的措辞不许合并成一句() {
        let 全 = [
            读不了格式那句, 字段不齐那句, 哈希不对那句, 版本不够那句, 签名读不了那句, 块短了那句, 块加密那句, 少一份那句,
        ];
        assert_eq!(全.iter().collect::<std::collections::HashSet<_>>().len(), 8, "有两句一模一样了");
        for 句 in 全 {
            /* 界面上摆的是白话：不许出现"出错了"那种合并句，也不许出现"缺失"那一类话（#30） */
            assert!(!句.contains("出错了") && !句.contains("缺失") && !句.contains("没装"), "{}", 句);
        }
    }

    #[test]
    fn 核活着的那一格_对得上就一句都不报() {
        let 甲 = b"hello";
        let 乙 = "{}".as_bytes();
        let 信 = 折信息段(信息段(&[("main.js", &算哈希(甲), 甲.len() as u64), ("manifest.json", &算哈希(乙), 乙.len() as u64)], "").as_bytes()).unwrap();
        let 读 = |路: &str| -> Option<Vec<u8>> {
            match 路 { "main.js" => Some(甲.to_vec()), "manifest.json" => Some(乙.to_vec()), _ => None }
        };
        assert!(核那一格(&信, &读, "1.0.0").is_empty(), "两份都对得上、要求也够，就该一句不报");
    }

    #[test]
    fn 核活着的那一格_少一份与改过一份报的是两种话() {
        let 甲 = b"hello";
        let 信 = 折信息段(信息段(&[("main.js", &算哈希(甲), 甲.len() as u64), ("随行.svg", &算哈希(b"<svg/>"), 6)], "").as_bytes()).unwrap();
        /* 第二份整个不在，第一份被人改过一个字 */
        let 读 = |路: &str| -> Option<Vec<u8>> {
            match 路 { "main.js" => Some(b"heLlo".to_vec()), _ => None }
        };
        let 报 = 核那一格(&信, &读, "1.0.0");
        assert_eq!(报.len(), 2, "{:?}", 报);
        assert!(报.iter().any(|x| x.种 == 哈希不对那句 && x.句.contains("main.js")), "{:?}", 报);
        assert!(报.iter().any(|x| x.种 == 少一份那句 && x.句.contains("随行.svg")), "{:?}", 报);
        assert!(!报.iter().any(|x| x.种 == 块短了那句), "格子里少一份不该用报包短了那一句（那是包自己的形状）");
    }

    #[test]
    fn 核活着的那一格_要求的主程序比这台高也要报() {
        let 信 = 折信息段(信息段(&[("main.js", &算哈希(b"x"), 1)], "")
            .replace("\"min_shell\":\"1.0.0\"", "\"min_shell\":\"2.5.0\"").as_bytes()).unwrap();
        let 读 = |_: &str| -> Option<Vec<u8>> { Some(b"x".to_vec()) };
        let 报 = 核那一格(&信, &读, "1.0.0");
        assert_eq!(报.len(), 1, "{:?}", 报);
        assert_eq!(报[0].种, 版本不够那句);
        assert!(报[0].句.contains("2.5.0") && 报[0].句.contains("1.0.0"), "{:?}", 报[0].句);
    }

    #[test]
    fn 这一格不认识壳也不碰磁盘() {
        /* 只扫判断那一截：测试里为了列这几颗禁字，自己把它们写成了串（含进来就是自己判自己红） */
        let 源 = include_str!("pack_box.rs");
        let 源 = 源.split("#[cfg(test)]").next().unwrap_or("");
        for 禁 in ["std::fs", "File::open", "fs::read", "tauri::", "AppHandle", "emit(", "read_to_string"] {
            assert!(!源.contains(禁), "纯判断那一格里出现了「{}」", 禁);
        }
    }
}
