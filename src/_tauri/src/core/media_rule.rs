/* 四层里的第一层 · 音乐遥控器那一摊的纯判断（外46 三 批四 · 搬 main.cjs 1015 / 1023 / 1030 / 1039 / 1160 / 1167 / 1182 / 1278 / 1279 那九颗；
   批五 又添四颗：main.cjs 1287 / 1296 / 1298 / 1367 —— 音乐文件夹那两颗、开关那一句单键读写、给 MusicBee 装监听插件那一颗）
   ------------------------------------------------------------
   这一格只管「该不该、是多少、叫什么名」，不认识壳、不碰磁盘、不碰系统。真去问 SMTC、真去动 Core Audio、
   真去读那一份小抄、真去弹那道挑文件夹的框、真去盘上找 MusicBee 装在哪，都在 tauri_bind::media_cmds 与 tauri_bind::vol_cmds。
   每一条尺都是照着两处原文量下来的，一处都不许凭印象改：
     · main.cjs 那九颗 handler（值域、回给页面的形状、出错回什么）；
     · 转手 call 的那两颗常驻子进程的协议 —— 监听脚本 smtc-watcher.ps1 与音量脚本 vol-watcher.ps1
       （它们才是真正定字段名与单位的那一处：音量是 0~100 的整数、状态名是那六个枚举的字面量、
         挑会话的先后是 Playing > Paused > Changing/Opened > 其余）。
   壳这一头不再 shell 出去起子进程（这一批的口径见 info_cmds 顶上那一段）：
   播放状态走 WinRT 那一套系统会话接口，音量走 Core Audio 那一套端点接口（接口名与调用串在第三层那两本上写着），
   所以脚本里那些判断得有个 Rust 版本 —— 版本就写在这一格里，别在动手那一层再抄第二份。 */

/* ================= 一、这几颗该不该动手（闸） ================= */

/// 音乐遥控器没装那一句（原件 main.cjs 940 行的 mediaGate 第一支，一字不改）
pub const 没装那句: &str = "音乐遥控器没装 · 想听歌去「添加插件」里把它装回来";
/// 装了但这一处桌面上没挂着音乐那一句（原件 941 行）
pub const 没挂那句: &str = "这一处桌面上没有挂着音乐遥控器 · 挂上来就开始监听";
/// 音量那一路的闸只看装没装（原件 1076 行 volGate），没有「挂没挂」这一档
pub const 音量没装那句: &str = "音乐遥控器没装 · 系统音量控制长在这个插件里";
/// 子进程没起来那一支的兜底话（原件 1045 行 media.msg || '媒体子进程没起来'）
pub const 监听没起来那句: &str = "媒体子进程没起来";
/// 音量那一路同一档兜底（原件 1171 / 1187 / 1188 行 '音量监听没起来'）
pub const 音量监听没起来那句: &str = "音量监听没起来";

/// media:state / media:cmd 头顶那一道闸：先问装没装，再问这一处挂没挂。回 Some 就是不动手、直接把那句报给页面。
pub fn 媒体闸(装了: bool, 挂处数: u32) -> Option<&'static str> {
    if !装了 {
        return Some(没装那句);
    }
    if 挂处数 == 0 {
        return Some(没挂那句);
    }
    None
}

/// vol:get / vol:set / vol:mute 头顶那一道闸（只问装没装 —— 音量那位跟着 media:hold 起，不再另设一本账）
pub fn 音量闸(装了: bool) -> Option<&'static str> {
    if 装了 {
        None
    } else {
        Some(音量没装那句)
    }
}

/// 这一家在不在？照 packHas（main.cjs 1844 行）那三条：
/// 包那一格整个不在（文件夹拷到别的电脑、还没建过 data\plugins\）= 全当装了；
/// 在的话要「扫到了这一家」且「没被 off 名单点过名」。
/// 是不是这一家、有没有扫到、在不在黑名单，由动手那一层去盘上问，这一格只算结论。
pub fn 算装了(包格不在: bool, 扫到了: bool, 黑名单里有: bool) -> bool {
    if 包格不在 {
        return true;
    }
    扫到了 && !黑名单里有
}

/* ================= 二、挂账（media:hold / media:release） ================= */

/// 挂一处报一次 hold：这一处加一（原件 1024 行 `(mediaHolds.get(id) || 0) + 1`）
pub fn 挂账加(现数: u32) -> u32 {
    现数 + 1
}

/// 撤一处报一次 release：减到零为止，不许减成负数（原件 1031 行 Math.max(0, n - 1)）
pub fn 挂账减(现数: u32) -> u32 {
    if 现数 == 0 {
        0
    } else {
        现数 - 1
    }
}

/// 总数归零就把后台监听收掉（原件 1033 行与 999 行同一句）
pub fn 该收监听(总挂处: u32) -> bool {
    总挂处 == 0
}

/// 收监听那一句给页面看的话（原件 1034~1035 行 mediaStop / volStop 递的同一串字，界面念的就是这一句）
pub const 收监听那句: &str = "页面上最后一处音乐也撤了";

/* ================= 三、media:cmd 认哪些命令串 ================= */

/// 页面上能递进来的控制命令，一条不多一条不少（原件 main.cjs 1044 行那个 includes 的名单，顺序也照它）
pub const 认的命令: [&str; 9] = ["play", "pause", "toggle", "next", "prev", "stop", "seek", "snapshot", "pick"];

/// 这条认不认
pub fn 认这条命令(串: &str) -> bool {
    认的命令.iter().any(|c| *c == 串)
}

/// 不认的那一句（原件 '不认的媒体命令：' + cmd，冒号是全角）
pub const 不认那句: &str = "不认的媒体命令：";

/// 一家会话都没有时回显那一句（脚本那条命令链里是 'no player is publishing media right now'。
/// 界面上不许冒英文是这一摊的规矩（见 main.cjs 1064 行那段），所以这一头给的是同一意思的一句中文）
pub const 没会话那句: &str = "此刻没有播放器在报会话";
/// 钉住了那一家却没有会话（脚本 'pinned player has no session: ' + pin）
pub const 钉住没会话那句: &str = "钉住的那家此刻没有会话：";

/// 往子进程那一趟递的正文：pick 递 {cmd, app}，其余递 {cmd, pos}（原件 1047 行）
pub fn 命令递的是名字吗(串: &str) -> bool {
    串 == "pick"
}

/* ---------- MusicBee 那一家的近路（2026-10-14 议题 16 补上） ----------
   监听脚本 smtc-watcher.ps1 里"递命令"那一段从前没搬进壳：MusicBee 的命令不走系统 Try*，
   而是往 players\musicbee-cmd.txt 写一行明文，由装进 MusicBee 的那颗桥插件去执行。
   为什么绕这一道（主人 2026-10-05：「音乐遥控器以前不会抢系统媒体键，现在会抢，我不需要他抢」）：
   系统那一路要会话先向系统声明 IsPlayEnabled，一声明，键盘与耳机上那颗硬件媒体键就归了这个会话；
   插件那边那五枚按钮全关着，所以既按得动又不抢键。没搬的后果就是议题 16 报的那一句：
   钉住 MusicBee 时上一首 / 播放暂停 / 下一首 三枚全没反应（系统 Try* 递过去，MusicBee 不接）。 */

/// 那一行明文落在哪一份文件
pub const 桥命令件名: &str = "musicbee-cmd.txt";

/// 会话的发布者是不是 MusicBee（名字里含这一段就算，大小写不论）
pub fn 是音乐蜂(身份: &str) -> bool {
    身份.to_lowercase().contains("musicbee")
}

/// 递过去的那一行正文：seek 带位置，其余就一个命令名（脚本里同一句）
pub fn 桥命令正文(命令: &str, 进度: i64) -> String {
    if 命令 == "seek" { format!("seek:{}", 进度) } else { 命令.to_string() }
}

/// pos 那一栏：不是数当 0，负的一律按 0（原件 1046 行 Math.max(0, Number(msg.pos) || 0)）
pub fn 进度取值(给: Option<f64>) -> i64 {
    match 给 {
        Some(v) if v.is_finite() && v > 0.0 => v as i64,
        _ => 0,
    }
}

/// app 那一栏截 300（原件 1047 行 .slice(0, 300)：JS 的 slice 数的是 UTF-16 单元，这一头按字切，
/// 差别只在带 emoji 的名字上 —— 那种名字本来就对不上任何一个会话，截多截少不影响挑得到挑不到）
pub fn 截三百(串: &str) -> String {
    串.chars().take(300).collect()
}

/* ================= 四、系统音量：0~100 这一档（不是 0~1） ================= */

/// 页面递来的音量按 0~100 的整数收（原件 main.cjs 1172 行 Math.max(0, Math.min(100, Math.round(Number(v) || 0)))；
/// 监听脚本 Pct() 往回报的也是这一档：Math.round(scalar * 100) 再夹住两头）。
/// 不是数（NaN、没递、递了个字）一律当 0，和那句 Number(v) || 0 同一手。
pub fn 音量取值(给: Option<f64>) -> u32 {
    match 给 {
        Some(v) if v.is_finite() => v.round().clamp(0.0, 100.0) as u32,
        _ => 0,
    }
}

/// 0~100 那一档换成 Core Audio 那颗 scalar（0.0~1.0）：脚本里就是 v / 100.0f
pub fn 音量比例(档: u32) -> f32 {
    档.min(100) as f32 / 100.0
}

/// scalar 换回 0~100：先四舍五入再夹住两头（脚本 Pct() 同一手；先夹后舍会在 100.4 那种数上多出一格）
pub fn 音量百分比(scalar: f32) -> u32 {
    if !scalar.is_finite() {
        return 0;
    }
    (scalar as f64 * 100.0).round().clamp(0.0, 100.0) as u32
}

/* ================= 五、静音那三档 ================= */

/// 页面递来的那一栏原样（JS 那头是 `mode === 0 || mode === 'off' ? 0 : (mode === 1 || mode === 'on' ? 1 : 2)`，
/// 认的是「严格相等」：数 0、数 1、字 'off'、字 'on' 四种，其余 —— 含字符串 "0" —— 全落进切换那一档）
#[derive(Clone, Debug, PartialEq)]
pub enum 递来的 {
    没给,
    是个数(f64),
    是个字(String),
    是别的,
}

/// 换算成脚本认的那三档：0 = 取消静音，1 = 静音，2 = 切换
pub fn 静音档(递: &递来的) -> u8 {
    match 递 {
        递来的::是个数(v) if *v == 0.0 => 0,
        递来的::是个数(v) if *v == 1.0 => 1,
        递来的::是个字(s) if s == "off" => 0,
        递来的::是个字(s) if s == "on" => 1,
        _ => 2,
    }
}

/// 这一档落到「静音那位开不开」：切换那一档翻现况（脚本 Mute()：on == 2 ? !m : on == 1）
pub fn 静音开不开(档: u8, 现况: bool) -> bool {
    match 档 {
        0 => false,
        1 => true,
        _ => !现况,
    }
}

/// 设音量顺带撤静音：大于 0 才撤（脚本 Set()：`if (v > 0) epv.SetMute(false, ref g)`，0 那一档不动静音）
pub fn 设音量要撤静音吗(档: u32) -> bool {
    档 > 0
}

/// 监听脚本那头的英文换成界面能给他看的一句（原件 volMsg，main.cjs 1066~1074 行）：
/// 判的是脚本说的话，原话另外留着进日志（音量原话留底）。
pub fn 音量话(原话: &str) -> &'static str {
    let 小 = 原话.to_lowercase();
    if 小.contains("watcher closed") {
        "音量监听收摊了，正在重起"
    } else if 小.contains("command failed") {
        "音量命令没执行成"
    } else if 小.contains("denied") || 小.contains("forbidden") || 小.contains("privilege") {
        "系统不让改音量（权限被拒）"
    } else if !原话.trim().is_empty() {
        "音量监听出了岔子，原话进了日志"
    } else {
        "音量监听停了"
    }
}

/// 原话留底截 300（原件 vol.raw = t.slice(0, 300)，先 trim 再截）
pub fn 音量原话留底(原话: &str) -> String {
    原话.trim().chars().take(300).collect()
}

/* ================= 六、SMTC：状态名、挑哪一个会话 ================= */

/// 系统会话那一头的「播放状态」枚举那六档的数（接口名写在第三层那两本上，这一格不认它：
/// Closed=0 Opened=1 Changing=2 Stopped=3 Playing=4 Paused=5）。
/// 脚本那边是 pi.PlaybackStatus.ToString()，界面上比的就是这六个字面量（'Playing' / 'Paused' / 'Changing' …），
/// 所以这一颗把数换回同一个字面量 —— 换错了，页面上那句「正在放」和播放/暂停那颗钮全反。
pub fn 状态名(值: i32) -> &'static str {
    match 值 {
        0 => "Closed",
        1 => "Opened",
        2 => "Changing",
        3 => "Stopped",
        4 => "Playing",
        5 => "Paused",
        _ => "",
    }
}

/// 挑会话的先后（脚本 Rank()）：正在放 > 暂停 > 加载中/换歌中 > 其余。
/// 脚本那句判的是 "Changing" 或 "Opening"，而这个枚举里没有 Opening 这一档（只有 Opened），
/// 所以照脚本原样只认 Changing/Opened 之外的都排到最后 —— Opened 在脚本里落到 return 3，这一头同一数。
pub fn 会话排名(状态: &str) -> u8 {
    match 状态 {
        "Playing" => 0,
        "Paused" => 1,
        "Changing" => 2,
        _ => 3,
    }
}

/// 名字尾巴那一截（脚本 PathOf()：去掉两头空白，再从最后一个斜杠或反斜杠后面取）——
/// 播放器报上来的身份有两种写法：一种光剩文件名「MusicBee.exe」，一种带着一整条装机的路径
/// （目录那一层结尾跟着一个反斜杠再加文件名）。钉住一个要两种都认，所以整串相等或者末段相等都算同一家。
pub fn 名字末段(串: &str) -> String {
    let 净 = 串.trim();
    match 净.rfind(|c| c == '/' || c == '\\') {
        Some(i) => 净[i + 1..].to_string(),
        None => 净.to_string(),
    }
}

/// 这两个身份是不是同一个播放器（脚本 Same()：整串忽略大小写相等，或者末段忽略大小写相等；两边空都当空串）
pub fn 同一个播放器(甲: &str, 乙: &str) -> bool {
    if 甲.trim().eq_ignore_ascii_case(乙.trim()) {
        return true;
    }
    名字末段(甲).to_lowercase() == 名字末段(乙).to_lowercase()
}

/// 一个会话在挑这一趟里看得见的两样：身份与状态名（别的字段挑的时候用不上，别在这儿多留）
#[derive(Clone, Debug, PartialEq)]
pub struct 一个会话 {
    pub 身份: String,
    pub 状态: String,
}

/// 挑的结果：第几个会话（下标）、怎么挑到的（脚本那个 how：auto / pin / pin-missing / none）、钉住那位还在不在
#[derive(Clone, Debug, PartialEq)]
pub struct 挑中的 {
    pub 第几: Option<usize>,
    pub 挑法: &'static str,
    pub 钉住对上: bool,
}

/// 卡片和命令说话的那一个会话（脚本 Pick() 整颗）：
///   · 一家会话都没有 → 挑法 none、钉住算对上（没钉住也就谈不上没对上）；
///   · 钉住了 → 只认那一家；找不到就 pin-missing，绝不悄悄换成别家（脚本顶上那句注释就是这个意思）；
///   · 没钉住 → 按排名挑，同分让「系统当前那一家」赢，自家那一处（页面自己在放）跳过。
pub fn 挑会话(会话: &[一个会话], 钉住: &str, 自家: &str, 当前: &str) -> 挑中的 {
    if 会话.is_empty() {
        return 挑中的 { 第几: None, 挑法: "none", 钉住对上: true };
    }
    if !钉住.is_empty() {
        for (序, 一) in 会话.iter().enumerate() {
            if 同一个播放器(&一.身份, 钉住) {
                return 挑中的 { 第几: Some(序), 挑法: "pin", 钉住对上: true };
            }
        }
        return 挑中的 { 第几: None, 挑法: "pin-missing", 钉住对上: false };
    }
    let mut 胜: Option<usize> = None;
    let mut 胜名分 = 100u8;
    let mut 胜是当前 = false;
    let mut 挑法 = "none";
    for (序, 一) in 会话.iter().enumerate() {
        if !自家.is_empty() && 同一个播放器(&一.身份, 自家) {
            continue;
        }
        let 名分 = 会话排名(&一.状态);
        let 是当前家 = !当前.is_empty() && 同一个播放器(&一.身份, 当前);
        let 更好 = 名分 < 胜名分 || (名分 == 胜名分 && 是当前家 && !胜是当前);
        if 更好 {
            胜名分 = 名分;
            胜 = Some(序);
            胜是当前 = 是当前家;
            挑法 = "auto";
        }
    }
    挑中的 { 第几: 胜, 挑法, 钉住对上: true }
}

/// 倍速：脚本那一句是「0 与 1000 之间才算数，其余落回 1」——0 是「人没手动定」那一档的数，不是真倍速
pub fn 倍速(给: Option<f64>) -> f64 {
    match 给 {
        Some(v) if v.is_finite() && v > 0.0 && v < 1000.0 => v,
        _ => 1.0,
    }
}

/// TimeSpan 那一档（100 纳秒一个数）换成毫秒：脚本 (long)tl.Position.TotalMilliseconds 也是朝零截
pub fn 时长毫秒(计数: i64) -> i64 {
    计数 / 10_000
}

/// 毫秒换成递进去的 100 纳秒计数（脚本 pos * 10000L，TryChangePlaybackPositionAsync 收的就是这个单位）
pub fn 毫秒计数(毫秒: i64) -> i64 {
    毫秒.saturating_mul(10_000)
}

/* ================= 七、监听往回推的那几行 ================= */

/// 这三种事件之外，正文一个字没变就别播（脚本 Say()：mustAnswer = ready/ask/pick/self/rescan）。
/// 没在放的播放器照样一秒一跳，全播出去卡片就会一直重画。
pub fn 是非问必答(理由: &str) -> bool {
    matches!(理由, "ready" | "ask" | "pick" | "self" | "rescan")
}

/// 这一趟播不播
pub fn 该播这一趟吗(必须答: bool, 正文变了: bool) -> bool {
    必须答 || 正文变了
}

/// 挑到了会话、还带着歌名 —— 这一份快照才算「活的」（脚本 Live()：既没有 "session":null，歌名也不是空串）。
/// 不活就接着补读三趟（脚本 Warm()）：播放器刚起来、单曲列表被跳过，都是先报事件后报状态。
pub fn 快照算活吗(挑到了: bool, 歌名: &str) -> bool {
    挑到了 && !歌名.is_empty()
}

/// 补读的间隔与趟数（脚本 Warm()：Thread.Sleep(900) × 3）
pub const 补读间隔毫秒: u64 = 900;
pub const 补读趟数: u32 = 3;

/// 第一趟读要等到的那句 ready（脚本 Await 默认 3000 毫秒，读歌名那一趟给 6000）
pub const 常规等毫秒: u64 = 3000;
pub const 读歌名等毫秒: u64 = 6000;

/// 意外退出重起的预算与间隔（main.cjs 977 行：media.ready 过才重起、最多三回、隔 1200 毫秒）
pub const 重起预算: u32 = 3;
pub const 重起间隔毫秒: u64 = 1200;

/// 这一回还重起重不起：起过没有（ready）、试了几回、是不是我们自己收的摊
pub fn 还该重起(起过: bool, 已试: u32, 是自己收的: bool) -> bool {
    !是自己收的 && 起过 && 已试 < 重起预算
}

/* ================= 八、播放器小抄那一份文件夹 ================= */

/// 小抄那一格的三层名（原件 1221 行：path.join(LA_BASE, 'Flow-Desk', 'players')，
/// LA_BASE = process.env.LOCALAPPDATA，没有就退 app.getPath('appData')）
pub const 程序数据格: &str = "Flow-Desk";
pub const 小抄格名: &str = "players";

/// 钉住那一份的文件名
pub const 钉住件名: &str = "pin.txt";
/// MusicBee 桥插件报「现在在放哪个文件」那一份
pub const 桥报件名: &str = "musicbee.txt";
/// 音乐文件夹那一份
pub const 音乐目录件名: &str = "musicdir.txt";
/// 音乐遥控器那几个开关那一份（一行一个 key=value）
pub const 开关件名: &str = "music.txt";
/// 「被卸掉的那几家」那一份名单的文件名（原件 1752 行 OFF_LIST）——
/// 音乐遥控器在不在要读这一份，名写在这一格，动手那一层不自己念第二遍
pub const 卸单名: &str = "off.json";
/// 同一份名单里那一栏的名（原件 1836 行读的是 j.off；两种写法：数组 / `{ off: [...] }`）
pub const 卸单键名: &str = "off";

/// 读一份小抄：尾巴上的空白去掉（原件 playRead 那一句 replace(/\s+$/, '')；读不到当空串）
pub fn 小抄取值(文: &str) -> String {
    文.trim_end().to_string()
}

/// 写一份小抄时那一栏该长成什么样：pin.txt 不切尾巴空白（钉住的名字可能就以空格结尾），其余切掉；
/// 原件 String(value || '')，落盘时再加一个换行（playWrite 那一句 to + '\n'）
pub fn 小抄写入值(格名: &str, 值: &str) -> String {
    if 格名 == 钉住件名 {
        值.to_string()
    } else {
        值.trim_end().to_string()
    }
}

/// 内容没动就别碰文件 —— 一碰就惊一次文件监听（原件 playWrite 第一句 if(playRead(name) === to) return {ok:true}）
pub fn 该不该写(现值: &str, 新值: &str) -> bool {
    现值 != 新值
}

/// music.txt：一行一个 key=value，读不出来当没有（原件 playFlags）。
/// 号在前面的空段（=abc）不算一条（原件那句 if(i > 0)）；值里可以再带号。
/// 同名两回两条都按行序留着，后写的那一条排在尾巴上（原件 out[k] = v 一句后写的盖掉前写的，
/// 靠的就是这一序 —— 动手那一层一行行贴进表，贴到的就是最后那一条）。
pub fn 开关表(文: &str) -> Vec<(String, String)> {
    let mut 出 = Vec::new();
    for 行 in 文.split(|c| c == '\n' || c == '\r') {
        let 行 = 行.trim();
        if 行.is_empty() {
            continue;
        }
        match 行.find('=') {
            Some(i) if i > 0 => {
                let 名 = 行[..i].trim();
                let 值 = 行[i + 1..].trim();
                if !名.is_empty() {
                    出.push((名.to_string(), 值.to_string()));
                }
            }
            _ => {}
        }
    }
    出
}

/* ================= 九、音乐文件夹那两颗与开关那一句（media:dirPick / media:dirSet / media:flag） ================= */

/// 挑音乐文件夹那一道框的题（原件 1289 行 showOpenDialog 里那一栏 title，一字不改）
pub const 挑目录题: &str = "挑音乐文件夹";
/// 开关名洗完全空那一句（原件 playFlagSet 1253 行，回的是 { ok:false, msg:那句 }）
pub const 开关名不对那句: &str = "开关名不对";

/// 开关名：只留 [\w-]（JS 那个不带 u 的 \w 就是 ASCII 的字母数字下划线，中文与空格一律剔掉），再取前 24 段。
/// 空了算名不对，由动手那一层挡（原件 1252~1253 行就是这一先一后）。
pub fn 开关名清洗(递: &str) -> String {
    递.chars()
        .filter(|字| 字.is_ascii_alphanumeric() || *字 == '_' || *字 == '-')
        .take(24)
        .collect()
}

/// 开关值那一手照原件的 `String(value == null ? '' : value)`：没递、递 null 都算空串
/// （JS 的 == null 同时管 undefined 与 null，所以这一头的「没这一栏」也走同一支）；
/// 布尔念成 true / false，数念成它自己那一串（-500 就是 "-500"，不许多出个 .0），字串照原样。
/// 表与对象这一头回的是那一份的 JSON 原文，原件念成 "[object Object]" —— 页面上那颗 flagSet 只会递数、
/// 布尔与字串（见 data\plugins\music-remote\main.js 的 flagVal），递不到那一档，照实记着不装全等。
pub fn 开关值文本(递: Option<&serde_json::Value>) -> String {
    match 递 {
        None | Some(serde_json::Value::Null) => String::new(),
        Some(serde_json::Value::String(串)) => 串.clone(),
        Some(其余) => 其余.to_string(),
    }
}

/// 开关值落地前那一手：行里行外的换行整个去掉（原件 replace(/[\r\n]/g,'') —— 不是切尾巴空白，
/// 中间夹的换行也剔，免得一行 key=value 被劈成两条），再取前 200 段
pub fn 开关值清洗(递: &str) -> String {
    递.chars().filter(|字| *字 != '\r' && *字 != '\n').take(200).collect()
}

/// 现值：同名几回取最后写进去的那一份正文（原件 playFlags 那句 out[k] = v，后写的盖掉前写的）
pub fn 开关取(表: &[(String, String)], 名: &str) -> Option<String> {
    表.iter().rev().find(|(名在, _)| 名在 == 名).map(|(_, 值)| 值.clone())
}

/// 新表正文：一行一条 key=value、用 \n 连着（原件 Object.keys(cur).map(x => x + '=' + cur[x]).join('\n')）。
/// 顺序照 JS 对象的插入序：同名几回只留第一次出现的那一个位置、正文取最后那一条；
/// 改哪一栏就替哪一栏（位置不动），盘上没这一栏才添到尾巴上 —— 序一重排，两边共用同一份的小抄就多出一趟没必要的改写。
pub fn 开关并入(表: &[(String, String)], 名: &str, 值: &str) -> String {
    let mut 出: Vec<(String, String)> = Vec::new();
    for (名在, _) in 表 {
        if 出.iter().any(|(已, _)| 已 == 名在) {
            continue;
        }
        let 正文 = if 名在 == 名 { 值.to_string() } else { 开关取(表, 名在).unwrap_or_default() };
        出.push((名在.clone(), 正文));
    }
    if !出.iter().any(|(已, _)| 已 == 名) {
        出.push((名.to_string(), 值.to_string()));
    }
    出.iter().map(|(名在, 值在)| format!("{}={}", 名在, 值在)).collect::<Vec<String>>().join("\n")
}

/* ================= 十、给 MusicBee 装监听插件那一颗（media:bridge） ================= */

/// 这一家没装回去那一句（原件 1369 行，一字不改）
pub const 桥没装那句: &str = "音乐遥控器这个插件没装，插件文件就在它的包里。去「添加插件」把它装回来再按这个按钮。";
/// 包里没带那一颗插件文件那一句（原件 1372 行）
pub const 桥没件那句: &str = "音乐遥控器的包里没带插件文件（插件清单 assets.bridge 那个），这一份包不完整";
/// 插件清单里那一栏住在哪一格里（原件 packAssetOf 读的是 manifest.assets）
pub const 随行格里: &str = "assets";
/// 同一格里点这一颗文件的那一栏名（原件 call 的是 landAsset('music-remote', 'bridge')）
pub const 桥件键名: &str = "bridge";
/// 这一家底下的插件文件夹（原件 path.join(dir, 'Plugins')）
pub const 插件格名: &str = "Plugins";
/// 落过去那一份文件的名 —— 原件把这一串钉死在 1378 行，不跟着插件清单里那一栏的名字走
pub const 桥插件件名: &str = "mb_FlowDesk.dll";
/// 认「这一格真是 MusicBee」用的那一颗可执行文件（只认到目录不算，免得撞见同名文件夹 —— 原件 1363 行）
pub const 认家件名: &str = "MusicBee.exe";
/// 注册表 App Paths 那一格（原件 reg.exe query 的那一串，/ve 读的是这一格的默认值；HKLM 那一头由第三层定）
pub const 认家注册格: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\MusicBee.exe";
/// 每一格盘上那六种摆法（原件 mbGuesses 对每个盘根做的那六条 path.join，序也照它）
pub const 那六摆: [&str; 6] = [
    "MusicBee",
    "Programs\\MusicBee",
    "Program Files\\MusicBee",
    "Program Files (x86)\\MusicBee",
    "Apps\\MusicBee",
    "Software\\MusicBee",
];
/// 用户数据那一格底下另两种摆法（原件最后补的那两条，顺序是 Programs\MusicBee 在前）
pub const 另两摆: [&str; 2] = ["Programs\\MusicBee", "MusicBee"];

/// 找 MusicBee 装在哪的候选清单（原件 mbGuesses 1319~1329 行）：先每格盘 × 那六摆，
/// 再补用户数据那一格底下那两摆。哪一格真在盘上由第三层挨个问（认的是「这一格里有 MusicBee.exe」）。
/// 盘根那一串也是第三层问出来的（原件 mbDriveRoots：A 到 Z 一格一格看存不存在）。
pub fn 桥候选(盘根: &[String], 用户数据格: &str) -> Vec<String> {
    let mut 出 = Vec::new();
    for 根 in 盘根 {
        for 摆 in 那六摆 {
            出.push(并一格(根, 摆));
        }
    }
    for 摆 in 另两摆 {
        出.push(并一格(用户数据格, 摆));
    }
    出
}

/// 一格底下拼一段（原件 path.join；先去掉尾巴上反复的分隔符，不然拼出两重；那一格空就只留下头那一段）
fn 并一格(格: &str, 下: &str) -> String {
    let 头 = 格.trim_end_matches(['\\', '/']);
    if 头.is_empty() {
        return 下.to_string();
    }
    format!("{}\\{}", 头, 下)
}

/// 盘上那句错码里「文件被别的程序咬住了」是哪一条（Windows 的 ERROR_SHARING_VIOLATION）。
/// media:bridge 那一颗拿它认「MusicBee 正开着，dll 拷不过去」，成了 busy:true 那一支。
pub const 咬住错码: i32 = 32;

/// 拆插件清单里 assets.<键> 那一栏（原件 packAssetOf + packRaw 头顶那三道闸）：
/// 读不出 JSON、没 assets 那一格、那一栏不是字串都算没有；反斜杠当斜杠、去头里的斜杠，
/// 某一段是空 / '.' / '..' 也算没有（不许它顺着往上爬出包外）。
/// 比原件多挡一道：带冒号的那一段也挡 —— 原件走 Node 的 path.join（那种段就当普通名字贴上去了），
/// Rust 的 join 碰到「X:」这种段会把整条路换掉，不挡就等于让它爬出包外。
/// 回的是「相对包里那一格」的那一串，在不在盘上由第三层问。
pub fn 随行件名(清单正文: &str, 键: &str) -> Option<String> {
    let 文: serde_json::Value = serde_json::from_str(清单正文).ok()?;
    let 指 = 文.get(随行格里)?.get(键)?.as_str()?;
    let 净 = 指.replace('\\', "/").trim_start_matches('/').to_string();
    if 净.is_empty() || 净.split('/').any(|段| 段.is_empty() || 段 == "." || 段 == ".." || 段.contains(':')) {
        return None;
    }
    Some(净)
}

/// 报给页面那个大小：Math.round(字节 / 1024)（原件 1390 行 —— 四舍五入，不是整除截断）
pub fn 算千字节(字节: u64) -> u64 {
    ((字节 as f64) / 1024.0).round() as u64
}

/// 注册表那一格读回来的那串算不算这一家：原件那句正则 /REG_SZ\s+(\S+musicbee\.exe)/i 认的就是
/// 「结尾是 musicbee.exe」，大小写无所谓（它拿整串去 path.dirname，这一头同样只认结尾再取上一格）
pub fn 那是这一家吗(串: &str) -> bool {
    串.to_ascii_lowercase().ends_with(&认家件名.to_ascii_lowercase())
}

/// 「没检测到 MusicBee 装在哪」那一句（原件 1376 行：把源那一串与手动装的写法带上）
pub fn 桥没找着句(从: &str) -> String {
    format!(
        "没检测到 MusicBee 装在哪。手动装一次也行：把 {} 拷到 <MusicBee>\\{}\\ 里（同名就覆盖），再开 MusicBee。",
        从, 插件格名
    )
}

/// 「被它咬住了」那一句（原件 1381 行，带目标位置）
pub fn 桥咬住句(到: &str) -> String {
    format!(
        "MusicBee 正开着，插件文件被它咬住了。先在托盘里右键 MusicBee 选「退出」（不是关窗口），再点一次这个按钮。目标位置：{}",
        到
    )
}

/// 装成了那一句（原件 1392 行：目标 + 千字节 + 报上来的那一行明文住在哪一格）
pub fn 桥装好句(到: &str, 千字节: u64) -> String {
    format!(
        "插件已装到 {}（{}KB）· 开 MusicBee 就能监到，正在放的歌会把文件路径写进 {}\\{}",
        到, 千字节, 小抄格名, 桥报件名
    )
}

/// 拷不过去那一句（原件 1394 行：盘上那句原话 + 源 + 目标那一格，手动补的路径给到那一格为止）
pub fn 桥拷不动句(那句: &str, 从: &str, 插件格: &str) -> String {
    format!("拷不过去（{}）：手动把 {} 拷到 {} 里", 那句, 从, 插件格)
}

/* ================= 测试：只验判断，不起壳、不碰系统 ================= */

#[cfg(test)]
mod 验判断 {
    use super::*;

    /* ---- 一、闸 ---- */

    #[test]
    fn 没装音乐遥控器时报那句没装() {
        assert_eq!(媒体闸(false, 3), Some(没装那句));
        assert_eq!(没装那句, "音乐遥控器没装 · 想听歌去「添加插件」里把它装回来");
    }

    #[test]
    fn 装了但一处没挂着时报那句没挂() {
        assert_eq!(媒体闸(true, 0), Some(没挂那句));
        assert_eq!(没挂那句, "这一处桌面上没有挂着音乐遥控器 · 挂上来就开始监听");
        assert_eq!(媒体闸(true, 1), None);
    }

    #[test]
    fn 音量那道闸只看装没装() {
        /* 音量那位跟着 media:hold 起，但它自己的闸里没有「挂没挂」这一档（原件 volGate 就一句） */
        assert_eq!(音量闸(false), Some(音量没装那句));
        assert_eq!(音量没装那句, "音乐遥控器没装 · 系统音量控制长在这个插件里");
        assert_eq!(音量闸(true), None);
    }

    #[test]
    fn 包格整个不在就算全装着() {
        assert!(算装了(true, false, true));
        assert!(!算装了(false, false, false));
        assert!(算装了(false, true, false));
        assert!(!算装了(false, true, true));
    }

    /* ---- 二、挂账 ---- */

    #[test]
    fn 挂账加一减一不减成负数() {
        assert_eq!(挂账加(0), 1);
        assert_eq!(挂账加(2), 3);
        assert_eq!(挂账减(1), 0);
        assert_eq!(挂账减(0), 0);
        assert!(该收监听(0));
        assert!(!该收监听(1));
    }

    /* ---- 三、media:cmd 认哪些命令串 ---- */

    #[test]
    fn 认的命令就那九条一个不多一个不少() {
        assert_eq!(
            认的命令,
            ["play", "pause", "toggle", "next", "prev", "stop", "seek", "snapshot", "pick"]
        );
        for 条 in 认的命令 {
            assert!(认这条命令(条), "这条该认：{}", 条);
        }
        for 条 in ["", "Play", "PLAY", "stop ", "volume", "self", "rescan", "mute"] {
            assert!(!认这条命令(条), "这条不该认：{}", 条);
        }
    }

    #[test]
    fn 不认那句的开头是全角冒号() {
        assert_eq!(不认那句, "不认的媒体命令：");
        assert_eq!(监听没起来那句, "媒体子进程没起来");
        assert_eq!(音量监听没起来那句, "音量监听没起来");
    }

    #[test]
    fn 递名字那一支其余递进度() {
        assert!(命令递的是名字吗("pick"));
        assert!(!命令递的是名字吗("seek"));
        assert!(!命令递的是名字吗(""));
    }

    #[test]
    fn 进度不是数或负的一律按零() {
        assert_eq!(进度取值(None), 0);
        assert_eq!(进度取值(Some(-5.0)), 0);
        assert_eq!(进度取值(Some(0.0)), 0);
        assert_eq!(进度取值(Some(1234.0)), 1234);
        assert_eq!(进度取值(Some(f64::NAN)), 0);
    }

    #[test]
    fn 钉住的名字截三百字() {
        let 长 = "x".repeat(400);
        assert_eq!(截三百(&长).chars().count(), 300);
        assert_eq!(截三百("MusicBee.exe"), "MusicBee.exe");
        assert_eq!(截三百(""), "");
    }

    /* ---- 四、音量值域：0~100 不是 0~1 ---- */

    #[test]
    fn 音量夹在零到一百还四舍五入() {
        assert_eq!(音量取值(None), 0);
        assert_eq!(音量取值(Some(0.0)), 0);
        assert_eq!(音量取值(Some(37.4)), 37);
        assert_eq!(音量取值(Some(37.5)), 38);
        assert_eq!(音量取值(Some(-1.0)), 0);
        assert_eq!(音量取值(Some(199.0)), 100);
        assert_eq!(音量取值(Some(f64::NAN)), 0);
    }

    #[test]
    fn 音量两头换算对得上() {
        assert!((音量比例(0) - 0.0).abs() < 1e-9);
        assert!((音量比例(50) - 0.5).abs() < 1e-6);
        assert!((音量比例(100) - 1.0).abs() < 1e-6);
        assert_eq!(音量比例(199), 1.0); /* 夹过一遍再进来的数不该再有 >100 */
        assert_eq!(音量百分比(0.0), 0);
        assert_eq!(音量百分比(0.5), 50);
        assert_eq!(音量百分比(0.375), 38);
        assert_eq!(音量百分比(1.0), 100);
        assert_eq!(音量百分比(1.9), 100);
        assert_eq!(音量百分比(-0.2), 0);
    }

    #[test]
    fn 静音三档照那四种严格相等() {
        assert_eq!(静音档(&递来的::是个数(0.0)), 0);
        assert_eq!(静音档(&递来的::是个数(1.0)), 1);
        assert_eq!(静音档(&递来的::是个字("off".into())), 0);
        assert_eq!(静音档(&递来的::是个字("on".into())), 1);
        /* 字符串 "0" 落不进 0 那一档（JS 那句是严格相等），照原样当切换 */
        assert_eq!(静音档(&递来的::是个字("0".into())), 2);
        assert_eq!(静音档(&递来的::是个数(2.0)), 2);
        assert_eq!(静音档(&递来的::没给), 2);
        assert_eq!(静音档(&递来的::是别的), 2);
    }

    #[test]
    fn 静音切换那一档翻现况() {
        assert!(!静音开不开(0, true));
        assert!(静音开不开(1, false));
        assert!(静音开不开(2, false));
        assert!(!静音开不开(2, true));
        assert!(设音量要撤静音吗(1));
        assert!(!设音量要撤静音吗(0));
    }

    #[test]
    fn 脚本那句英文换成界面能看的一句() {
        assert_eq!(音量话("volume watcher closed"), "音量监听收摊了，正在重起");
        assert_eq!(音量话("command failed: boom"), "音量命令没执行成");
        assert_eq!(音量话("Access is denied"), "系统不让改音量（权限被拒）");
        assert_eq!(音量话("operation FORBIDDEN"), "系统不让改音量（权限被拒）");
        assert_eq!(音量话("insufficient privilege"), "系统不让改音量（权限被拒）");
        assert_eq!(音量话("something odd"), "音量监听出了岔子，原话进了日志");
        assert_eq!(音量话("   "), "音量监听停了");
        assert_eq!(音量话(""), "音量监听停了");
    }

    #[test]
    fn 原话留底先去空白再截三百() {
        assert_eq!(音量原话留底("  abc\n "), "abc");
        let 长 = "y".repeat(400);
        assert_eq!(音量原话留底(&长).chars().count(), 300);
    }

    /* ---- 五、SMTC 的状态名与挑法 ---- */

    #[test]
    fn 状态名是那六个字面量() {
        assert_eq!(状态名(0), "Closed");
        assert_eq!(状态名(1), "Opened");
        assert_eq!(状态名(2), "Changing");
        assert_eq!(状态名(3), "Stopped");
        assert_eq!(状态名(4), "Playing");
        assert_eq!(状态名(5), "Paused");
        assert_eq!(状态名(9), "");
    }

    #[test]
    fn 挑会话的先后是放暂停换其余() {
        assert_eq!(会话排名("Playing"), 0);
        assert_eq!(会话排名("Paused"), 1);
        assert_eq!(会话排名("Changing"), 2);
        assert_eq!(会话排名("Opened"), 3);
        assert_eq!(会话排名("Stopped"), 3);
        assert_eq!(会话排名(""), 3);
    }

    #[test]
    fn 一个路径写法一个名字也算同一家() {
        assert!(同一个播放器("MusicBee.exe", "MusicBee.exe"));
        assert!(同一个播放器("musicbee.exe", "MusicBee.exe"));
        assert!(同一个播放器(r"播放器目录\MusicBee.exe", "MusicBee.exe"));
        assert!(同一个播放器("/opt/bin/Foobar", "foobar"));
        assert!(!同一个播放器("Spotify.exe", "MusicBee.exe"));
        assert!(同一个播放器("", ""));
    }

    #[test]
    fn 名字末段只认最后那一截() {
        assert_eq!(名字末段(r"某个目录\下一层\MusicBee.exe"), "MusicBee.exe");
        assert_eq!(名字末段("  MusicBee.exe  "), "MusicBee.exe");
        assert_eq!(名字末段("MusicBee.exe"), "MusicBee.exe");
        assert_eq!(名字末段(""), "");
    }

    #[test]
    fn 一家会话都没有时挑法是none() {
        let 结 = 挑会话(&[], "", "", "");
        assert_eq!(结.挑法, "none");
        assert_eq!(结.第几, None);
        assert!(结.钉住对上);
    }

    #[test]
    fn 钉住了就别家一律不挑() {
        let 家 = [
            一个会话 { 身份: "Spotify.exe".into(), 状态: "Playing".into() },
            一个会话 { 身份: "MusicBee.exe".into(), 状态: "Stopped".into() },
        ];
        let 结 = 挑会话(&家, "MusicBee.exe", "", "");
        assert_eq!(结.挑法, "pin");
        assert_eq!(结.第几, Some(1));
        assert!(结.钉住对上);
    }

    #[test]
    fn 钉住那位没开会话时报没对上不悄悄换家() {
        let 家 = [一个会话 { 身份: "Spotify.exe".into(), 状态: "Playing".into() }];
        let 结 = 挑会话(&家, "MusicBee.exe", "", "");
        assert_eq!(结.挑法, "pin-missing");
        assert_eq!(结.第几, None);
        assert!(!结.钉住对上);
    }

    #[test]
    fn 自动挑先认正在放的那一家() {
        let 家 = [
            一个会话 { 身份: "A.exe".into(), 状态: "Stopped".into() },
            一个会话 { 身份: "B.exe".into(), 状态: "Paused".into() },
            一个会话 { 身份: "C.exe".into(), 状态: "Playing".into() },
        ];
        let 结 = 挑会话(&家, "", "", "");
        assert_eq!(结.挑法, "auto");
        assert_eq!(结.第几, Some(2));
    }

    #[test]
    fn 同分时系统当前那一家赢() {
        let 家 = [
            一个会话 { 身份: "A.exe".into(), 状态: "Paused".into() },
            一个会话 { 身份: "B.exe".into(), 状态: "Paused".into() },
        ];
        assert_eq!(挑会话(&家, "", "", "B.exe").第几, Some(1));
        assert_eq!(挑会话(&家, "", "", "A.exe").第几, Some(0));
        /* 没报当前那一家时，第一家的分先拿住，后面的同分不抢 */
        assert_eq!(挑会话(&家, "", "", "").第几, Some(0));
    }

    #[test]
    fn 自家那一处在放的不算() {
        /* 页面自己就是会话之一：不跳过它就会把卡片指到自家那一段音频上 */
        let 家 = [
            一个会话 { 身份: "Flow-Desk.exe".into(), 状态: "Playing".into() },
            一个会话 { 身份: "PotPlayer.exe".into(), 状态: "Paused".into() },
        ];
        let 结 = 挑会话(&家, "", "Flow-Desk.exe", "");
        assert_eq!(结.第几, Some(1));
        assert_eq!(结.挑法, "auto");
        /* 只有自家一家时挑法停在 none */
        let 只自家 = [一个会话 { 身份: "Flow-Desk.exe".into(), 状态: "Playing".into() }];
        let 结2 = 挑会话(&只自家, "", "Flow-Desk.exe", "");
        assert_eq!(结2.第几, None);
        assert_eq!(结2.挑法, "none");
    }

    #[test]
    fn 倍速只认零到一千之间() {
        assert_eq!(倍速(None), 1.0);
        assert_eq!(倍速(Some(0.0)), 1.0);
        assert_eq!(倍速(Some(-1.0)), 1.0);
        assert_eq!(倍速(Some(5000.0)), 1.0);
        assert_eq!(倍速(Some(1.25)), 1.25);
    }

    #[test]
    fn 时长两个方向按一百纳秒一档() {
        assert_eq!(时长毫秒(0), 0);
        assert_eq!(时长毫秒(10_000), 1);
        assert_eq!(时长毫秒(15_000), 1); /* 朝零截，不是四舍五入 */
        assert_eq!(毫秒计数(1), 10_000);
        assert_eq!(毫秒计数(0), 0);
    }

    /* ---- 六、往回推那几行 ---- */

    #[test]
    fn 五种问句一定要答其余变字才播() {
        for 理 in ["ready", "ask", "pick", "self", "rescan"] {
            assert!(是非问必答(理), "这句该必答：{}", 理);
        }
        for 理 in ["playback", "media", "timeline", "warm", "cmd", "bye"] {
            assert!(!是非问必答(理), "这句不该必答：{}", 理);
        }
        assert!(该播这一趟吗(true, false));
        assert!(该播这一趟吗(false, true));
        assert!(!该播这一趟吗(false, false));
    }

    #[test]
    fn 没挑到会话或没歌名都不算活() {
        assert!(快照算活吗(true, "一首歌"));
        assert!(!快照算活吗(true, ""));
        assert!(!快照算活吗(false, "一首歌"));
    }

    #[test]
    fn 补读三趟隔九百毫秒() {
        assert_eq!(补读趟数, 3);
        assert_eq!(补读间隔毫秒, 900);
        assert_eq!(常规等毫秒, 3000);
        assert_eq!(读歌名等毫秒, 6000);
        assert_eq!(重起预算, 3);
        assert_eq!(重起间隔毫秒, 1200);
    }

    #[test]
    fn 自己收的摊不重起没起过的也不重起() {
        assert!(还该重起(true, 0, false));
        assert!(还该重起(true, 2, false));
        assert!(!还该重起(true, 3, false));
        assert!(!还该重起(false, 0, false)); /* 一帧都没报上来就死了：不是意外退出 */
        assert!(!还该重起(true, 0, true)); /* 我们自己收掉的，下一句命令自然重起一代 */
    }

    /* ---- 七、小抄 ---- */

    #[test]
    fn 小抄那三层名字照原件() {
        assert_eq!(程序数据格, "Flow-Desk");
        assert_eq!(小抄格名, "players");
        assert_eq!(钉住件名, "pin.txt");
        assert_eq!(桥报件名, "musicbee.txt");
        assert_eq!(音乐目录件名, "musicdir.txt");
        assert_eq!(开关件名, "music.txt");
    }

    #[test]
    fn 挑不着会话那两句是全角冒号收尾的那两句() {
        assert_eq!(没会话那句, "此刻没有播放器在报会话");
        assert_eq!(钉住没会话那句, "钉住的那家此刻没有会话：");
    }

    #[test]
    fn 音乐蜂那一家的近路认名字与递正文() {
        /* 会话的发布者名字各家写法不一（进程名带后缀、大小写不一），含这一段就算 */
        assert!(是音乐蜂("MusicBee.exe"));
        assert!(是音乐蜂("musicbee"));
        assert!(是音乐蜂("MusicBee"));
        assert!(!是音乐蜂("Spotify.exe"));
        assert!(!是音乐蜂("Windows Media Player"));
        /* 文件名叫那个（桥插件盯的就是这一份），正文 seek 带位置、其余就一个命令名 */
        assert_eq!(桥命令件名, "musicbee-cmd.txt");
        assert_eq!(桥命令正文("toggle", 0), "toggle");
        assert_eq!(桥命令正文("next", 0), "next");
        assert_eq!(桥命令正文("seek", 82660), "seek:82660");
    }

    #[test]
    fn 读小抄切尾巴空白写pin一个字不切() {
        assert_eq!(小抄取值("MusicBee.exe\r\n"), "MusicBee.exe");
        /* 原件 playWrite：只有 pin.txt 那一格不切尾巴空白（钉住的名字可以就以空格结尾） */
        assert_eq!(小抄写入值("pin.txt", "MusicBee "), "MusicBee ");
        assert_eq!(小抄写入值(钉住件名, "MusicBee\r\n"), "MusicBee\r\n");
        assert_eq!(小抄写入值(音乐目录件名, "某目录\r\n"), "某目录");
        assert!(该不该写("a", "b"));
        assert!(!该不该写("a", "a"));
    }

    #[test]
    fn 开关表一行一条号在前面的不算() {
        let 表 = 开关表("note=120\r\ntrans=90\r\n=坏的一行\r\n没号的一行\r\nsync=3\r\n");
        assert_eq!(
            表,
            vec![
                ("note".to_string(), "120".to_string()),
                ("trans".to_string(), "90".to_string()),
                ("sync".to_string(), "3".to_string())
            ]
        );
        /* 号在前面的空段与没号的一行都不算一条，所以名单里既没有空名也没有 off 这一栏 */
        assert!(表.iter().all(|(名, _)| !名.is_empty()));
        assert_eq!(表.iter().filter(|(名, _)| 名 == 卸单键名).count(), 0);
        assert_eq!(开关表("").len(), 0);
        assert_eq!(开关表("x").len(), 0);
    }

    #[test]
    fn 同名两回后头那一条赢() {
        let 表 = 开关表("note=100\nnote=140");
        /* 两条都留着，后写的那一条排在最后 —— 一行行贴进表的就是它 */
        assert_eq!(表.len(), 2);
        assert_eq!(表[1], ("note".to_string(), "140".to_string()));
    }

    /* ---- 八、音乐文件夹那两颗与开关那一句（批五） ---- */

    #[test]
    fn 挑框题与那句名不对照原件() {
        assert_eq!(挑目录题, "挑音乐文件夹");
        assert_eq!(开关名不对那句, "开关名不对");
        assert_eq!(音乐目录件名, "musicdir.txt");
        assert_eq!(开关件名, "music.txt");
    }

    #[test]
    fn 开关名只留字母数字下划线减号() {
        /* 原件 .replace(/[^\w-]/g,'') —— 不带 u 的 \w 是 ASCII 那一套，中文与空格一律剔掉 */
        assert_eq!(开关名清洗("fsNote"), "fsNote");
        assert_eq!(开关名清洗("a-b_9"), "a-b_9");
        assert_eq!(开关名清洗("中文 off!"), "off");
        assert_eq!(开关名清洗("note=1"), "note1");
        assert_eq!(开关名清洗("  "), "");
        assert_eq!(开关名清洗(""), "");
    }

    #[test]
    fn 开关名截到二十四段() {
        let 长 = "a".repeat(40);
        assert_eq!(开关名清洗(&长).chars().count(), 24);
        /* 剔掉的段不占位：先洗再截，所以 40 段中文加 30 个字母出来的就是 24 个字母 */
        assert_eq!(开关名清洗(&format!("{}{}", "中".repeat(40), "b".repeat(30))), "b".repeat(24));
    }

    #[test]
    fn 开关值念法和原件同一手() {
        use serde_json::json;
        /* 原件 String(value == null ? '' : value)：没递与递 null 都算空串 */
        assert_eq!(开关值文本(None), "");
        assert_eq!(开关值文本(Some(&json!(null))), "");
        assert_eq!(开关值文本(Some(&json!("120"))), "120");
        assert_eq!(开关值文本(Some(&json!(true))), "true");
        assert_eq!(开关值文本(Some(&json!(false))), "false");
        /* 数不许多出一个 .0 —— 页面上 off（延后几毫秒）递的就是负数 */
        assert_eq!(开关值文本(Some(&json!(-500))), "-500");
        assert_eq!(开关值文本(Some(&json!(0))), "0");
        assert_eq!(开关值文本(Some(&json!(0.5))), "0.5");
    }

    #[test]
    fn 开关值去行内换行再截二百段() {
        assert_eq!(开关值清洗("一行\r第二行\n第三行"), "一行第二行第三行");
        assert_eq!(开关值清洗("  两头空白留着  "), "  两头空白留着  ");
        assert_eq!(开关值清洗(&"x".repeat(300)).chars().count(), 200);
        assert_eq!(开关值清洗(""), "");
    }

    #[test]
    fn 开关现值取最后写进去那一条() {
        let 表 = 开关表("note=100\noff=-5\nnote=140");
        assert_eq!(开关取(&表, "note").as_deref(), Some("140"));
        assert_eq!(开关取(&表, "off").as_deref(), Some("-5"));
        assert_eq!(开关取(&表, "trans"), None);
        assert_eq!(开关取(&[], "note"), None);
    }

    #[test]
    fn 改一栏位置不动没这一栏才添尾巴() {
        let 表 = 开关表("note=100\ntrans=90\nnote=140");
        /* 改 note：位置还在头一个，正文换成新值，trans 跟着留一份（原件写的就是整表） */
        assert_eq!(开关并入(&表, "note", "180"), "note=180\ntrans=90");
        /* 添一栏：排到尾巴上 */
        assert_eq!(开关并入(&表, "off", "-5"), "note=140\ntrans=90\noff=-5");
        /* 盘上本来一个字没有 */
        assert_eq!(开关并入(&[], "note", "100"), "note=100");
        /* 新值是空串也照写一栏（原件 cur[k]='' 一句后照样 join 出去） */
        assert_eq!(开关并入(&表, "trans", ""), "note=140\ntrans=");
    }

    #[test]
    fn 开关并入出来的那一份再读回去等于新表() {
        let 表 = 开关表("fsNote=100\nfwMain=0");
        let 新 = 开关并入(&表, "sync", "3");
        let 回 = 开关表(&新);
        assert_eq!(回.len(), 3);
        assert_eq!(开关取(&回, "fsNote").as_deref(), Some("100"));
        assert_eq!(开关取(&回, "sync").as_deref(), Some("3"));
        /* 值里带号也不劈行：号只在第一个那一个地方切（原件 indexOf('=') 那一手） */
        let 带号 = 开关并入(&[], "k", "a=b");
        assert_eq!(开关取(&开关表(&带号), "k").as_deref(), Some("a=b"));
    }

    /* ---- 九、给 MusicBee 装监听插件（批五） ---- */

    #[test]
    fn 桥那两句原话与那几个名照原件() {
        assert_eq!(桥没装那句, "音乐遥控器这个插件没装，插件文件就在它的包里。去「添加插件」把它装回来再按这个按钮。");
        assert_eq!(桥没件那句, "音乐遥控器的包里没带插件文件（插件清单 assets.bridge 那个），这一份包不完整");
        assert_eq!(随行格里, "assets");
        assert_eq!(桥件键名, "bridge");
        assert_eq!(插件格名, "Plugins");
        assert_eq!(桥插件件名, "mb_FlowDesk.dll");
        assert_eq!(认家件名, "MusicBee.exe");
        assert!(认家注册格.ends_with("App Paths\\MusicBee.exe"));
        assert!(认家注册格.starts_with("SOFTWARE\\"));
    }

    #[test]
    fn 那六摆与另两摆一名不落() {
        assert_eq!(
            那六摆,
            ["MusicBee", "Programs\\MusicBee", "Program Files\\MusicBee",
             "Program Files (x86)\\MusicBee", "Apps\\MusicBee", "Software\\MusicBee"]
        );
        assert_eq!(另两摆, ["Programs\\MusicBee", "MusicBee"]);
    }

    #[test]
    fn 候选的序是先一盘六条再补两条() {
        let 盘 = vec!["第一格\\".to_string(), "第二格\\".to_string()];
        let 候 = 桥候选(&盘, "用户数据那一格");
        /* 2 格盘 × 六摆 + 另两摆 */
        assert_eq!(候.len(), 14);
        assert_eq!(候[0], "第一格\\MusicBee");
        assert_eq!(候[1], "第一格\\Programs\\MusicBee");
        assert_eq!(候[5], "第一格\\Software\\MusicBee");
        assert_eq!(候[6], "第二格\\MusicBee");
        assert_eq!(候[12], "用户数据那一格\\Programs\\MusicBee");
        assert_eq!(候[13], "用户数据那一格\\MusicBee");
        /* 那一格尾巴上带不带分隔符拼出来是同一串；整格空着就只留下头那一段 */
        assert_eq!(桥候选(&["某格\\".to_string()], ""), 桥候选(&["某格".to_string()], ""));
        assert_eq!(桥候选(&[], "")[0], "Programs\\MusicBee");
        assert_eq!(桥候选(&[], "").len(), 2);
    }

    #[test]
    fn 随行件名只认那一栏还不许爬出包外() {
        let 单 = r#"{"id":"music-remote","assets":{"bridge":"mb_FlowDesk.dll","watcher":"smtc-watcher.ps1"}}"#;
        assert_eq!(随行件名(单, 桥件键名).as_deref(), Some("mb_FlowDesk.dll"));
        /* 反斜杠当斜杠、头里的斜杠去掉（原件 packRaw 那一句 replace(/\\/g,'/').replace(/^\/+/,'')） */
        assert_eq!(随行件名(r#"{"assets":{"bridge":"\\子格\\mb.dll"}}"#, "bridge").as_deref(), Some("子格/mb.dll"));
        assert_eq!(随行件名(r#"{"assets":{"bridge":"mb.dll/"}}"#, "bridge"), None);
        assert_eq!(随行件名(r#"{"assets":{"bridge":"../坏的一格/mb.dll"}}"#, "bridge"), None);
        assert_eq!(随行件名(r#"{"assets":{"bridge":"./mb.dll"}}"#, "bridge"), None);
        assert_eq!(随行件名(r#"{"assets":{"bridge":""}}"#, "bridge"), None);
        /* 没 assets 那一格 / 那一栏不是字串 / 整份读不出 JSON —— 都算包里没带 */
        assert_eq!(随行件名(r#"{"id":"x"}"#, 桥件键名), None);
        assert_eq!(随行件名(r#"{"assets":{"bridge":404}}"#, 桥件键名), None);
        assert_eq!(随行件名("不是 JSON", 桥件键名), None);
        /* 这一头比原件多挡的那一道：带冒号的那一段（Rust 的 join 会被它整条换掉） */
        assert_eq!(随行件名(r#"{"assets":{"bridge":"C:坏的一格/mb.dll"}}"#, 桥件键名), None);
        assert_eq!(随行件名(r#"{"assets":{"bridge":"子格/mb.dll"}}"#, 桥件键名).as_deref(), Some("子格/mb.dll"));
    }

    #[test]
    fn 千字节是四舍五入不是整除截断() {
        assert_eq!(算千字节(0), 0);
        assert_eq!(算千字节(1024), 1);
        /* 1536 = 1.5KB → 2（Math.round 朝大的那一头走） */
        assert_eq!(算千字节(1536), 2);
        assert_eq!(算千字节(1023), 1);
        assert_eq!(算千字节(100_000), 98);
    }

    #[test]
    fn 注册表那一串只认结尾那颗文件() {
        assert!(那是这一家吗(r"某个目录\MusicBee.exe"));
        assert!(那是这一家吗(r"某个目录\musicbee.EXE"));
        assert!(!那是这一家吗(r"某个目录\MusicBee.exe.bak"));
        assert!(!那是这一家吗("musicbee"));
        assert!(!那是这一家吗(""));
    }

    #[test]
    fn 桥那四句话逐字对得上原件() {
        assert_eq!(
            桥没找着句("某包格\\music-remote\\mb_FlowDesk.dll"),
            "没检测到 MusicBee 装在哪。手动装一次也行：把 某包格\\music-remote\\mb_FlowDesk.dll 拷到 <MusicBee>\\Plugins\\ 里（同名就覆盖），再开 MusicBee。"
        );
        assert_eq!(
            桥咬住句("某家\\Plugins\\mb_FlowDesk.dll"),
            "MusicBee 正开着，插件文件被它咬住了。先在托盘里右键 MusicBee 选「退出」（不是关窗口），再点一次这个按钮。目标位置：某家\\Plugins\\mb_FlowDesk.dll"
        );
        assert_eq!(
            桥装好句("某家\\Plugins\\mb_FlowDesk.dll", 96),
            "插件已装到 某家\\Plugins\\mb_FlowDesk.dll（96KB）· 开 MusicBee 就能监到，正在放的歌会把文件路径写进 players\\musicbee.txt"
        );
        assert_eq!(
            桥拷不动句("撞墙了", "某包格\\mb_FlowDesk.dll", "某家\\Plugins"),
            "拷不过去（撞墙了）：手动把 某包格\\mb_FlowDesk.dll 拷到 某家\\Plugins 里"
        );
    }
}
