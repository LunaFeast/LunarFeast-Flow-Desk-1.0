/* ============================================================
   gate-tauribox46.mjs · 插件分离第 3 批 3.2 + 3.3 甲：自有容器那一片钉住这些
   ------------------------------------------------------------
     node src/tools/probes/gate-tauribox46.mjs
   一、容器那一格住纯判断那层，四段那几个数与 docs\插件容器格式.md 同一张表（签名段那 72 字节是重点钉的死数）；
   二、那一格不碰磁盘、不认识壳；SHA-256 走依赖图里已经带着的那颗件，不在壳里自己写第二份；
   三、动手那一颗只认插件路径以内那一份字节，落点与大小两道闸都借现成那把尺，扩展名全仓只有一枚常量；
   四、桥、硬地板、壳的注册单三头一致 —— 这一颗页面请得到、插件请不到；
   五、界面上还没有一处调用点（管理页与三种时机的接线归 3.4），不留半成品；本批几本文本里没有本机路径。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT, 桥原文, 桥请壳, 名换算, 壳注册单 } from './lib-slice.mjs';

const 台 = 记账('gate-tauribox46');
const 纯 = rd('src/_tauri/src/core/pack_box.rs');
const 判断 = 纯.split('#[cfg(test)]')[0];           /* 测试段自己列着那几颗禁字，扫它会把闸自己判红 */
const 测试 = 纯.slice(纯.indexOf('#[cfg(test)]'));   /* 测试段现在有两处 #[cfg(test)]（那两把搭包手 + 判断那一段），slice 才拿得全 */
const 动 = rd('src/_tauri/src/tauri_bind/box_cmds.rs');
const 动手 = 动.slice(0, 动.indexOf('#[cfg(test)]'));  /* 这一层的测试段拿 serde_json 量形状，unwrap 是家常饭，不算"抛给页面"那本账 */
const 壳 = rd('src/_tauri/src/main.rs');
const 规格 = rd('docs/插件容器格式.md');
const 桥 = 桥原文();
const 壳单 = 壳注册单();

台.题('一、四段那几个数：代码与规格那一页同一本账');
台.判('容器那一格在 core 那一层（不碰磁盘、不碰壳，cargo test 直接验）',
  fs.existsSync(path.join(ROOT, 'src', '_tauri', 'src', 'core', 'pack_box.rs'))
  && /^pub mod pack_box;$/m.test(rd('src/_tauri/src/core/mod.rs')));
台.判('标记那四枚是 FDP1，格式号此刻只认 1', /pub const 标记: &\[u8; 4\] = b"FDP1";/.test(判断) && /pub const 认得版本: u16 = 1;/.test(判断));
台.判('文件头 12 字节、一块自己的头 6 字节', /pub const 头长: usize = 12;/.test(判断) && /pub const 块头长: usize = 6;/.test(判断));
台.判('签名段是 72 字节（算法 2 + 钥匙号 2 + 保留 4 + 签名 64 = 72）',
  /pub const 签名长: usize = 72;/.test(判断) && 判断.includes('算法 2 + 钥匙号 2 + 保留 4 + 签名 64 = 72'));
const 账 = 规格.split('### 5.1')[1] || '';      /* 那一小节就是改账本：88 只许出现在「原先写错了」那一句里 */
台.判('规格那一页两处「88」都改成了 72；这个数只在 5.1 那笔改账里留名，别处不再当签名段长度使',
  规格.includes('固定 72 字节') && 规格.includes('### 1.4 签名段（72 字节，文件结尾）')
  && !/88/.test(规格.split('### 5.1')[0]) && 账.includes('88'),
  规格.split('### 5.1')[0].match(/.{0,12}88.{0,12}/g) || []);
台.判('那七句报话一句不缺（读不了格式 / 字段不齐 / 哈希不对 / 版本不够 / 签名读不了 / 块短了 / 块加密）',
  ['读不了格式那句', '字段不齐那句', '哈希不对那句', '版本不够那句', '签名读不了那句', '块短了那句', '块加密那句']
    .every(名 => new RegExp('pub const ' + 名 + ': &str').test(判断)));
台.判('规格第三节那张表也是这七种（一页一码不许各说各话）', (规格.match(/^\| .+ \| .+ \|$/gm) || []).length >= 7 && 规格.includes('分七种'));
台.判('未签名不当问题：那一句是「用户插件」，装与加载都不挡', /pub const 用户插件那句: &str = "用户插件";/.test(判断) && 规格.includes('**未签名的包允许装、允许加载'));
台.判('那七句各是各的措辞，一句都不许合并成「出错了」，也不许出现「缺失」「没装」那一类话（#30 与 2.7 同一口径）',
  new Set(['读不了格式那句', '字段不齐那句', '哈希不对那句', '版本不够那句', '签名读不了那句', '块短了那句', '块加密那句']
    .map(名 => (判断.match(new RegExp('pub const ' + 名 + ': &str = "([^"]*)"')) || ['', ''])[1])).size === 7
  && !['出错了', '缺失', '没装'].some(字 => ['读不了格式那句', '字段不齐那句', '哈希不对那句', '版本不够那句', '签名读不了那句', '块短了那句', '块加密那句']
    .map(名 => (判断.match(new RegExp('pub const ' + 名 + ': &str = "([^"]*)"')) || ['', ''])[1]).some(句 => 句.includes(字))));

台.题('二、那一格只算字节；哈希不自己写第二份');
for(const 禁 of ['std::fs', 'File::open', 'fs::read', 'fs::write', 'tauri::', 'AppHandle', 'emit(', 'std::env', 'Command', 'read_to_string'])
  台.判('判断那一截里没有「' + 禁 + '」', !判断.includes(禁));
台.判('SHA-256 走图里已带的 sha2（wry → sha2 那条链上本来就有），不另下一套件',
  判断.includes('use sha2::{Digest, Sha256}') && /sha2 = "0\.10"/.test(rd('src/_tauri/Cargo.toml'))
  && rd('src/_tauri/Cargo.lock').includes('name = "sha2"'));
台.判('自己写那一版真撤干净了：没有那张 64 个常数的表，也没有手搓的补位',
  !/K: \[u32; 64\]/.test(纯) && !/rotate_right/.test(纯));
台.判('三句已知向量钉在测试里（空串、abc、一百万个 a —— 覆盖补位与多块两条路）',
  测试.includes('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  && 测试.includes('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  && 测试.includes('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0'));
台.判('钥匙表那一张只许加不许减：那一枚常量此刻一把钥匙都没有（1.0 这一档整包不加密）',
  /pub const 钥匙表: &\[u16\] = &\[\];/.test(判断) && 判断.includes('只加不减') && 规格.includes('**只加不减**'));
台.判('这一格的测试名全中文、mod 只开一颗（照 zip_pack 那个形状）',
  (纯.match(/mod 验判断/g) || []).length === 1
  && [...测试.matchAll(/fn ([^(\s]+)\(\)/g)].every(m => /[\u4e00-\u9fff]/.test(m[1])));

台.题('三、动手那一颗只认插件路径以内那一份字节');
台.判('这一颗在 tauri_bind 那一层，且 mod 与注册单两头都有',
  /^pub mod box_cmds;$/m.test(rd('src/_tauri/src/tauri_bind/mod.rs')) && 壳单.includes('box_inspect')
  && 壳.includes('tauri_bind::box_cmds::box_inspect'));
台.判('main.rs 顶上那一段也点了这一颗（⑫ 那一段），不是只往注册单里塞了一行',
  壳.includes('⑫ 自有容器那一份包') && 壳.indexOf('⑫ 自有容器那一份包') < 壳.indexOf('tauri_bind::box_cmds::box_inspect'));
台.判('那一格在哪一格借 comp_cmds 那颗现成的（本层不另起第二份口径）',
  动.includes('crate::tauri_bind::comp_cmds::活的那一格'));
台.判('落点过的是 comp_rule 那一把 定落点（不自己拼路径、不自己判分隔符）',
  动.includes('定落点') && !动.includes('path::join') && !动.includes('push_str'));
台.判('大小那道闸借 pack:file 同一把尺（24MB 那个数不在这一层再写一遍）',
  动.includes('封顶字节') && 动.includes('太大那句') && !/24 \* 1024/.test(动));
台.判('扩展名全仓只有一枚常量：除 pack_box 那一处与这份闸自己的说明，别处搜不到 fdpkg 那五个字',
  /pub const 扩展名: &str = "fdpkg";/.test(判断) && 动.includes('扩展名') && !动.includes('"fdpkg"'));
/* 注释里提一句「.fdpkg」是给读代码的人交代形状，使用法那一行也一样 —— 要拦的是第二份**常量**：
   一枚被代码拿去拼路径的字面串。所以剥掉注释之后，只认 fdpkg 单独被引号包成一颗串的那种写法。 */
const 去注 = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const 常量形 = /["'`]\.?fdpkg["'`]/;   /* 带不带那枚点都算：JS 那一头拼的是 '.fdpkg'，Rust 那一头是 "fdpkg" 与 ".fdpkg" */
const 数那一处 = (后缀式, 放过) => fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })
  .filter(f => 后缀式.test(String(f)) && !放过.some(跳 => String(f).includes(跳)))
  .map(f => ({ 相: String(f).replace(/\\/g, '/'), 文: fs.readFileSync(path.join(ROOT, 'src', String(f)), 'utf8') }))
  .filter(x => 常量形.test(去注(x.文)))
  .map(x => ({ 相: x.相, 次: (去注(x.文).match(new RegExp(常量形.source, 'g')) || []).length }));
const 壳外 = 数那一处(/\.rs$/, ['pack_box.rs', 'gate-tauribox46']);
台.判('壳那一头没被抄成第二处：除 pack_box 之外，没有别的 .rs 把 fdpkg 写成一颗串（代码与测试段都算，注释除外）：' + 壳外.map(x => x.相).join(' '),
  壳外.length === 0, 壳外.map(x => x.相));
/* 页面那一头读不到 Rust 的常量，只许 sh-packs 那一枚 容器后缀 写着它（数的是出现几次，不是一份文件就算过） */
const 页外 = 数那一处(/\.(js|cjs|mjs)$/, ['gate-tauribox46']);
台.数('页面那一头这枚后缀落在哪几份文件', 页外.map(x => x.相).join(' ') || '（一处都没有）');
台.判('页面那一头只有一处写着它（sh-packs.js 那一枚 容器后缀，出现次数 ' + (页外[0] ? 页外[0].次 : 0) + '）',
  页外.length === 1 && 页外[0].相.endsWith('sh-packs.js') && 页外[0].次 === 1, 页外.map(x => x.相 + '×' + x.次));
台.判('这一层一句都不许抛给页面（unwrap / expect / panic 一颗不留）',
  !/\bunwrap\(\)/.test(动手) && !/\.expect\(/.test(动手) && !/panic!/.test(动手));
台.判('盘上读不到与包有问题是两件事，各自的话：读不到只回 ok 与 msg 两栏，包有问题照样把信息段与逐块列出来',
  动.includes('fn 读不到') && 动.includes('fn 照回执') && 动.includes('没这份那句') && 动.includes('读不到那句'));
台.判('回给页面那一格十个栏位齐（ok / msg / format / signAlgo / keyId / note / info / blocks / issues + 逐块那五个）',
  ['ok:', 'msg:', 'format:', 'sign_algo:', 'key_id:', 'note:', 'info:', 'blocks:', 'issues:']
    .every(k => 动.includes(k))
  && ['path:', 'index:', 'start:', 'len:', 'state:'].every(k => 动.includes(k)));
台.判('管理页那一行那一枚标记的字借 pack_box 那一句，产品那一段里不另写第二串「用户插件」',
  动手.includes('出.标记()') && !动手.includes('"用户插件"'));
台.判('回给页面那一格有三道测试钉着（好包十栏、坏一块报的是哪一块、读不到只回两栏）',
  动.includes('mod 验回话') && (动.slice(动.indexOf('#[cfg(test)]')).match(/#\[test\]/g) || []).length === 3);
const 搭包手 = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })
  .filter(f => String(f).endsWith('.rs'))
  .filter(f => rd('src/' + String(f).replace(/\\/g, '/')).includes('fn 拼一份('));
台.判('搭一份真包那两把手全仓只有一处（摆在纯判断那一格，动手那一层借它，不抄第二份容器形状）：' + 搭包手.join(' '),
  搭包手.length === 1 && String(搭包手[0]).includes('pack_box'), 搭包手);

台.题('四、桥、硬地板、注册单三头一致：页面请得到，插件请不到');
const 表 = JSON.parse((桥.match(/const 参表 = (\{[\s\S]*?\});/) || [])[1] || '{}');
台.判('桥的换算把 box:inspect 落到 box_inspect，且这颗真在壳的注册单上',
  名换算('box:inspect') === 'box_inspect' && 壳单.includes('box_inspect'));
台.判('桥里参数表记的是栏名与顺序与壳里声明一致（一颗 id）',
  JSON.stringify(表.box_inspect) === JSON.stringify(['id']), JSON.stringify(表.box_inspect));
台.判('桥真请了这一颗（FD_APP.boxInspect → invoke box:inspect）',
  /async boxInspect\(id\)\{[^}]*invoke\('box:inspect'/.test(桥) && 桥请壳(桥).includes('box:inspect'));
台.判('硬地板收了这一颗：插件清单点名也不给（读包这件事是宿主自己的事）',
  /const APP_DENY = \[[\s\S]*?'boxInspect'/.test(rd('src/_shared/sh-load.js')));
台.判('壳里那份生成物跟着更新了（名单 54 颗，且顶上那句数的也是 54）',
  rd('src/_tauri/src/core/app_deny.rs').includes('"boxInspect"') && /名单 54 颗/.test(rd('src/_tauri/src/core/app_deny.rs')));
const 跑 = (() => { try { execFileSync(process.execPath, [path.join(ROOT, 'src', '_tauri', 'bridge.mjs'), '--验'], { encoding: 'utf8' }); return 0; }
  catch(e) { return e.status || 1; } })();
台.判('那份名单拿 --验 重跑一趟：盘上这一份没过期（退出码 ' + 跑 + '）', 跑 === 0);

台.题('五、这一批的账');
const 页面层 = ['src/_fd', 'src/_wnw', 'src/_shared', 'src/_wcustom', 'data/plugins'].flatMap(格 => {
  const 全 = path.join(ROOT, 格);
  if (!fs.existsSync(全)) return [];
  const 收 = [];
  const 走 = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!['node_modules', 'images'].includes(e.name)) 走(path.join(d, e.name)); continue; }
    if (/\.(js|cjs|html)$/.test(e.name)) 收.push(path.join(d, e.name));
  } };
  走(全);
  return 收;
});
const 喊过 = 页面层.filter(p => /boxInspect|box:inspect/.test(fs.readFileSync(p, 'utf8')) && !p.includes('sh-load.js'));
台.数('页面上真喊这一颗的几处', 喊过.length + ' 处' + (喊过.length ? '：' + 喊过.join(' ') : '（管理页与三种时机归 3.4）'));
台.判('界面上还没有半成品：除了硬地板那一份名单，页面源码里一处都不喊这一颗', 喊过.length === 0);
台.判('这一批那几本文本里一个字节都没写这台机器的盘符、帐户名、私人目录名',
  !/(^|[^A-Za-z0-9])[A-Za-z]:[\\/]/.test(动 + 判断 + 壳 + 规格),
  (动 + 判断 + 壳 + 规格).match(/.{0,20}[A-Za-z]:[\\/].{0,20}/g) || []);

台.收尾();
