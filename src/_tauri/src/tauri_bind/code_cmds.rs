/* 四层里的第三层 · 词库分类改名要去改代码引用那一颗（外46 三 批三 · 搬 main.cjs 2255 那颗）
   ------------------------------------------------------------
   那一头（code:catRename）干的活：分类名在代码里就是一个带引号的字符串（'对抗.优势'、"桥段模板"），
   配方 json 里也一样，所以旧名换了要真去改写引用了它的代码。扫两处：
     · 源码格里「底子那两格」（`_shared\` 与 `_wcustom\src\`）那几份（宿主、共用底子，还有推演定制那一棵 ——
       词库层 2026-10-16 搬进后一格）—— 只看 .js，不往里钻；改完要重新生成页面才生效；
     · 活的那一格 data\plugins\（插件自己那一格，乙案之后是一层层文件夹，main.js 在包里所以得往深里走）
       —— 看 .js 与 .json，往里钻。
   回给页面的形状一格都不动：
     · 停下来的那两种 { ok:false, msg }（旧名新名那一颗、没记下源码在哪儿那一颗，两句原话在 fd_core::cat_rename）；
     · 跑完那一支 { ok:true, hits, bad, packs, src, comp, msg } ——
       hits 每一项是 { file, n }（file 是绝对落点，n 是这一份里改了几处），
       bad 是「那颗名字：读不出」/「那颗名字：写不进去（系统那句）」那种句子串，
       packs 是改到了哪几家（页面拿它决定「刷新这一页就换」还是「得重新生成页面」），
       src / comp 两栏按「这一份在不在 底子那两格（<源码格>\_shared 与 <源码格>\_wcustom\src）里面」分，
       msg 是「改了 N 个文件 · 共 M 处」或「代码里没有引用【旧名】的地方」。
   判断（哪三种写法算命中、几名不许改、两句回执、后缀两张表、哪一家怎么认、src 与 comp 怎么分）
   全在 fd_core::cat_rename，这一层只走树、读原文、写回去。
   源码格那一颗与 sys:rebuild 共用同一颗（sys_cmds::源码格：认 FD_SRC，没指就看 <树根>\src 那一格）——
   同一把尺不另起第二份，两边认不到源码时报的都是各自那一句原话。
   活的那一格与「改代码」那六颗共用一颗（comp_cmds 里那个 活的那一格 = <树根>\data\plugins）。 */
use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::fd_core::cat_rename::{
    哪一家, 回执那句, 后缀认得, 是共用底子, 洗两名, 改写引用, 插件那两种后缀, 没记源码那句, 源码那种后缀,
};
use crate::tauri_bind::comp_cmds::活的那一格;
use crate::tauri_bind::sys_cmds::源码格;

/// 一处命中（原件 hits 里那一项的两格：{ file, n }）
#[derive(Serialize)]
struct 一处命中 {
    file: String,
    n: usize,
}

/// code:catRename 的那一格：停下来的那两种只带 msg，跑完那一支六栏全在
#[derive(Serialize)]
pub struct 一份改名 {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    hits: Option<Vec<一处命中>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bad: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    packs: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    src: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    comp: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg: Option<String>,
}

impl 一份改名 {
    fn 不成(那句: &str) -> Self {
        一份改名 {
            ok: false,
            hits: None,
            bad: None,
            packs: None,
            src: None,
            comp: None,
            msg: Some(那句.to_string()),
        }
    }
}

/// 走一格取要改的那几份（原件 collect）：只按后缀收、格不存在就当没那几份（readdirSync 抛了就回空的，不报错）、
/// statSync 抛的那一颗跳过（正被别的程序动着）。deep 那一档决定往不往里钻 —— 两处一张表一个深度，照原件。
/// 深度顶一道是壳这一头加的（原件靠 statSync 跟链接，真种一个自指的链接就会一路钻到栈崩）：
/// 十六层早把插件那几层的真实形状盖完了（改代码那把尺走树也是同一道顶）。
fn 收那几份(格: &str, 表: &[&str], 深: bool, 层: u8, 出: &mut Vec<String>) {
    if 层 > 16 {
        return;
    }
    let 读 = match fs::read_dir(格) {
        Ok(v) => v,
        Err(_) => return,
    };
    let mut 名册: Vec<String> = vec![];
    for 项 in 读.flatten() {
        名册.push(项.file_name().to_string_lossy().to_string());
    }
    /* 原件用的是 readdirSync 的序（Windows 上就是按名字），这一头排一遍，两台机器同一串落点 */
    名册.sort();
    for 名 in 名册 {
        let 路 = 并路(格, &名);
        let 相 = match fs::metadata(&路) {
            Ok(v) => v,
            Err(_) => continue, /* 跟原件同一手：statSync（会跟着链接走）抛了就当没这颗 */
        };
        if 相.is_dir() {
            if 深 {
                收那几份(&路, 表, true, 层 + 1, 出);
            }
            continue;
        }
        if 相.is_file() && 后缀认得(&名, 表) {
            出.push(路);
        }
    }
}

fn 并路(格: &str, 名: &str) -> String {
    let mut s = String::from(格);
    while s.ends_with('\\') || s.ends_with('/') {
        s.pop();
    }
    format!("{}\\{}", s, 名)
}

fn 那颗名字(落点: &str) -> String {
    Path::new(落点)
        .file_name()
        .map(|v| v.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// code:catRename —— 真去把引用了这个分类名的代码改一遍，回改了哪几份、哪几份没改成、动到了哪几家
#[tauri::command]
pub fn code_cat_rename(from: String, to: String) -> 一份改名 {
    /* 一、两名不许：空串与「去掉首尾空白后一模一样」都算不许（原件那一句） */
    let (旧名, 新名) = match 洗两名(&from, &to) {
        Ok(v) => v,
        Err(那句) => return 一份改名::不成(&那句),
    };
    /* 二、源码格认不到就停在这儿（那一头看的是 root.json 的 src 一栏，这一头认 FD_SRC 再看树里那一格） */
    let 树 = crate::tree_root().to_string_lossy().to_string();
    let 源 = match 源码格(&树) {
        Some(v) => v,
        None => return 一份改名::不成(没记源码那句),
    };
    /* 三、两处各一张表一个深度（照原件那两句 collect）。
       源码格里今天有两格算「底子」：`_shared`（宿主与共用件）与 `_wcustom\src`（推演定制那一棵 ——
       2026-10-16 词库层与词库编辑器搬进那一格，那两份里写着的分类名引用也跟着改）。
       少收一格的表现不是报错，是「界面上改了名、代码里那一处没跟着改」，所以两格都得收，深度照旧：
       只看这一格里那一层的 .js，不往里钻。 */
    let 底子那两格 = [并路(&源, "_shared"), 并路(&源, "_wcustom\\src")];
    let 插件那格 = 活的那一格();
    let mut 那几份: Vec<String> = vec![];
    for 格 in 底子那两格.iter() {
        收那几份(格, &源码那种后缀, false, 0, &mut 那几份);
    }
    收那几份(&插件那格, &插件那两种后缀, true, 0, &mut 那几份);

    let mut 命中: Vec<一处命中> = vec![];
    let mut 坏: Vec<String> = vec![];
    let mut 几家: Vec<String> = vec![];
    for 路 in 那几份 {
        let 名 = 那颗名字(&路);
        let 文 = match fs::read_to_string(&路) {
            Ok(v) => v,
            /* 读不出：只报那颗名字，原件这一句不带系统那句 */
            Err(_) => {
                坏.push(format!("{}：读不出", 名));
                continue;
            }
        };
        if !文.contains(旧名.as_str()) {
            continue; /* 原文里根本没这几个字，连改串那一趟都不必跑 */
        }
        let (新文, 处) = 改写引用(&文, &旧名, &新名);
        if 处 == 0 {
            continue; /* 有那几个字但不是那三种写法（界面文字里的同名散文） */
        }
        match fs::write(&路, 新文.as_bytes()) {
            Ok(_) => 命中.push(一处命中 { file: 路.clone(), n: 处 }),
            Err(e) => 坏.push(format!("{}：写不进去（{}）", 名, e)),
        }
        /* 记下动到了哪一家 —— 原件这一手写在 try/catch 之后，写不进去的那一份也照样算动到，照旧 */
        if let Some(家) = 哪一家(&插件那格, &路) {
            if !几家.contains(&家) {
                几家.push(家);
            }
        }
    }
    /* 四、src / comp 两栏按落点在不在「底子那两格」里面分（原件那两行 filter + startsWith；
       判法本身还是判断层那颗 是共用底子，这一层只管挨个格子问一遍） */
    let 在底子里 = |路: &str| 底子那两格.iter().any(|格| 是共用底子(格, 路));
    let 数源 = 命中.iter().filter(|x| 在底子里(&x.file)).count();
    let 数件 = 命中.iter().filter(|x| !在底子里(&x.file)).count();
    let 几份 = 命中.len();
    let 几处 = 命中.iter().map(|x| x.n).sum();
    一份改名 {
        ok: true,
        hits: Some(命中),
        bad: Some(坏),
        packs: Some(几家),
        src: Some(数源),
        comp: Some(数件),
        msg: Some(回执那句(几份, 几处, &旧名)),
    }
}
