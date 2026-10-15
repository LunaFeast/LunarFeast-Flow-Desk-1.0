/* 四层里的第三层 · 自有容器那一份包（.fdpkg）：读回来，交给纯判断那一格
   ------------------------------------------------------------
   插件分离第 3 批 3.3 甲那一只手。规格在 docs\插件容器格式.md：四段怎么读、字段齐不齐、
   哪一块对不上号、这台读不读得动 —— 全在 fd_core::pack_box，这一层一个字都不重判。
   这一层只做四件事：
     ① 认那一份在哪一格：只认 <树根>\data\plugins\<包名>.fdpkg（过的是 comp_rule 那一把 定落点，
        包名不干净、想跑出自家那一格，当场拒 —— 与「删除」那一手同一张嘴，不另起第二道闸）；
     ② 把字节读回来：大小那道闸用的是 pack:file 同一把尺（pack_rule::封顶字节 = 24MB），不自己另数一个数；
     ③ 叫 整包检查，把回执折成页面上那一格（信息段 + 逐块结果 + 那几种报话各是各的措辞）；
     ④ 一句都不许抛给页面。
   ------------------------------------------------------------
   ok 这一栏说的是「这个包在这台能不能用」，不是「这一颗请得手没有」：
     · 盘上读不到那一份字节（没这一份 / 太大 / 读的时候出错）→ ok:false + msg，其余栏一概不出现；
     · 读到了但包有问题 → ok:false + msg（第一句报话）+ issues + blocks + info 照样列出来 ——
       坏一块不该把整包的信息一起藏掉（规格第三节那句「读得到的部分照样列给用户看」）。
   三种时机（开机自检、加载那一下、正用着）与插件管理那一屏吃的都是这一颗；本批先把这一颗通道本身立住。 */
use serde::Serialize;
use std::fs;

use crate::fd_core::comp_rule::{定落点, 没这份那句, 读不到那句};
use crate::fd_core::pack_box::{一条报, 一份检查, 整包检查, 扩展名, 钥匙表};
use crate::fd_core::pack_rule::{封顶字节, 太大那句};
use crate::tauri_bind::comp_cmds::活的那一格;

/* ---------- 回给页面那几格：字段名是给页面的，判断那一层用的中文名不外泄 ---------- */

/// 信息段那一格：十个键照规格第二节那张表
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct 一段信息 {
    id: String,
    name: String,
    version: String,
    min_shell: String,
    author: String,
    source: String,
    key_id: u64,
    created: u64,
    files: Vec<一份文件>,
    kernels: Vec<String>,
}

/// 信息段 files 里的一条（那四个键本来就是给页面看的写法，原样递）
#[derive(Serialize)]
struct 一份文件 {
    path: String,
    len: u64,
    sha256: String,
    enc: bool,
}

/// 逐块结果：这一块落在包的哪儿、多大、与对上了没有
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct 一块账 {
    path: String,
    index: usize,
    start: usize,
    len: usize,
    /// 「对上了」，或那几种报话里的某一句原话 —— 页面不再自己拼第二套字眼
    state: &'static str,
}

/// 一条报话：哪一种（七句之一的原串）+ 带上哪一块之后那一句
#[derive(Serialize)]
struct 一条话 {
    kind: &'static str,
    msg: String,
}

/// box:inspect 那一格
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct 一份检验 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
    /// 容器格式号（这台读不了这种包时报 0，读到了就照包上写的那一号报）
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<u16>,
    /// 签名段那两个数：算法位（0 = 没签名）与第几号钥匙
    #[serde(skip_serializing_if = "Option::is_none")]
    sign_algo: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    key_id: Option<u16>,
    /// 管理页那一行右边那一枚标记的字：没签名的包 = 「用户插件」（装与加载都不挡）；
    /// 带签名的包这一版给不出第二种标记，这一栏就不出现
    #[serde(skip_serializing_if = "Option::is_none")]
    note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    info: Option<一段信息>,
    blocks: Vec<一块账>,
    issues: Vec<一条话>,
}

impl 一份检验 {
    /// 盘上没读到那一份字节：只回 ok 与 msg 两栏
    fn 读不到(那句: String) -> 一份检验 {
        一份检验 {
            ok: false,
            msg: Some(那句),
            format: None,
            sign_algo: None,
            key_id: None,
            note: None,
            info: None,
            blocks: vec![],
            issues: vec![],
        }
    }
    /// 把纯判断那一格的回执折成页面上这一格：位置与核对那两列本就同序同长（都是从信息段那张表排的）
    fn 照回执(出: &一份检查) -> 一份检验 {
        let 块 = 出
            .块
            .iter()
            .zip(出.逐块.iter())
            .map(|(位, 核)| 一块账 {
                path: 核.路径.clone(),
                index: 核.块号,
                start: 位.数据起点,
                len: 位.长度,
                state: 核.状态,
            })
            .collect();
        let 信息 = 出.信息.as_ref().map(|信| 一段信息 {
            id: 信.id.clone(),
            name: 信.name.clone(),
            version: 信.version.clone(),
            min_shell: 信.min_shell.clone(),
            author: 信.author.clone(),
            source: 信.source.clone(),
            key_id: 信.key_id,
            created: 信.created,
            files: 信
                .files
                .iter()
                .map(|份| 一份文件 {
                    path: 份.路径.clone(),
                    len: 份.大小,
                    sha256: 份.哈希.clone(),
                    enc: 份.加密,
                })
                .collect(),
            kernels: 信.kernels.clone(),
        });
        一份检验 {
            ok: 出.ok,
            msg: if 出.报.is_empty() { None } else { Some(出.头一句()) },
            format: Some(出.版本),
            sign_algo: Some(出.签名算法),
            key_id: Some(出.签名钥匙号),
            note: 出.标记().map(|字| 字.to_string()),
            info: 信息,
            blocks: 块,
            issues: 出.报.iter().map(一条话::照).collect(),
        }
    }
}

impl 一条话 {
    fn 照(报: &一条报) -> 一条话 { 一条话 { kind: 报.种, msg: 报.句.clone() } }
}

/* ---------- box:inspect ---------- */

/// 读插件路径里那一个 .fdpkg，整包查一遍。id 就是包名（不带扩展名，与 comp:* 那三颗同一个递法）。
#[tauri::command]
pub fn box_inspect(id: String) -> 一份检验 {
    let 包 = id.trim().to_string();
    let 落 = match 定落点(&活的那一格(), &包, None) {
        Ok(家) => format!("{}.{}", 家.落, 扩展名),
        /* 定落点 那句拒话已经把包名带上了（"包名不干净，不敢动手：xxx"），这一层不再重复一遍 */
        Err(那句) => return 一份检验::读不到(那句),
    };
    let 相 = match fs::metadata(&落) {
        Ok(m) if m.is_file() => m,
        _ => return 一份检验::读不到(format!("{}：{}.{}", 没这份那句, 包, 扩展名)),
    };
    if 相.len() > 封顶字节 {
        return 一份检验::读不到(太大那句(相.len()));
    }
    let 全 = match fs::read(&落) {
        Ok(v) => v,
        Err(e) => return 一份检验::读不到(format!("{}{}", 读不到那句, e)),
    };
    /* 当前号从壳自己那一颗取（环境变量 FD_VERSION 那一头），钥匙表是主程序带的那一张：两处都只有一本账 */
    一份检验::照回执(&整包检查(&全, &crate::version(), 钥匙表))
}

/* ================= 回给页面那一格：栏名与形状（cargo test 直接验，不起壳、不碰磁盘） =================
   为什么要钉这一格：判断那一格改字段名，这一层靠 serde 换算成页面上那十个栏 —— 换算错了界面上只是
   一行摆不出来，cargo 与闸都不报，要等接线那一屏才发现。测试用的那两把搭包手借纯判断那一格的，
   不在这里抄第二份容器形状。 */
#[cfg(test)]
mod 验回话 {
    use super::*;
    use crate::fd_core::pack_box::{
        信息段, 块头长, 拼一份, 整包检查, 头长, 算哈希, 没签, 没锁, 钥匙表,
    };

    #[test]
    fn 好包回给页面那一格十个栏各归各位() {
        let 字 = "/* 便签 */".as_bytes();
        let 信 = 信息段(&[("main.js", &算哈希(字), 字.len() as u64)], "");
        let 一 = 拼一份(&信, &[字], 没签, 没锁);
        let 格 = serde_json::to_value(一份检验::照回执(&整包检查(&一, "1.0.0", 钥匙表))).unwrap();
        assert_eq!(格["ok"], true);
        assert_eq!(格["note"], "用户插件", "没签名的包：管理页那一行标这一句");
        assert_eq!(格["format"], 1);
        assert_eq!(格["signAlgo"], 0);
        assert_eq!(格["keyId"], 0);
        assert_eq!(格["info"]["minShell"], "1.0.0", "驼峰换算要真换成页面那一头认的写法");
        assert_eq!(格["info"]["files"][0]["sha256"], 算哈希(字));
        assert_eq!(格["blocks"][0]["state"], "对上了");
        assert_eq!(格["blocks"][0]["index"], 0);
        assert_eq!(格["blocks"][0]["len"], 字.len());
        assert_eq!(格["blocks"][0]["start"], 头长 + 信.len() + 块头长);
        assert!(格["issues"].as_array().unwrap().is_empty());
        assert!(格.get("msg").is_none(), "没问题就不该有 msg 那一栏");
    }

    #[test]
    fn 坏的那一块报的是哪一块不把整包判死() {
        let 字 = b"x";
        let 信 = 信息段(&[("main.js", &算哈希(字), 1), ("插件清单.json", &算哈希(b"{}"), 2)], "");
        let 一 = 拼一份(&信, &[字, "改过的".as_bytes()], 没签, 没锁);
        let 格 = serde_json::to_value(一份检验::照回执(&整包检查(&一, "1.0.0", 钥匙表))).unwrap();
        assert_eq!(格["ok"], false);
        assert_eq!(格["blocks"][0]["state"], "对上了", "坏一块不该把好的那一块一起判死");
        assert!(格["blocks"][1]["state"].as_str().unwrap().contains("对不上号"));
        assert!(格["issues"][0]["msg"].as_str().unwrap().contains("插件清单.json"));
        assert_eq!(格["info"]["files"].as_array().unwrap().len(), 2, "读得到的部分照样列给用户看");
    }

    #[test]
    fn 读不到那一份只回两栏不假装查过() {
        let 那句 = format!("{}：{}.{}", 没这份那句, "notes", 扩展名);
        let 格 = serde_json::to_value(一份检验::读不到(那句)).unwrap();
        assert_eq!(格["ok"], false);
        assert!(格["msg"].as_str().unwrap().contains("notes"));
        for 栏 in ["format", "signAlgo", "keyId", "note", "info"] {
            assert!(格.get(栏).is_none(), "盘上没读到那一份的时候不许出现「{}」那一栏", 栏);
        }
        assert!(格["blocks"].as_array().unwrap().is_empty());
        assert!(格["issues"].as_array().unwrap().is_empty());
    }
}
