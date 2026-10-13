/* ============================================================
   gate-perm46.mjs · 外46 批六第二步：壳里那第二道闸
   ------------------------------------------------------------
     node src/tools/probes/gate-perm46.mjs
   钉的是这么几件事：
     一、硬地板那份名单在壳里有一份 Rust 侧的，但它是**生成物** ——
        由 src\_tauri\bridge.mjs 从 src\_shared\sh-load.js 里那颗 APP_DENY 读出来生成
        src\_tauri\src\core\app_deny.rs。手抄第二份就是第二个真身，改一处忘一处。
     二、生成的那份与页面那一头逐颗同名同序；名单不许为空（空表等于整道闸没了）、不许重名。
     三、壳里真在用它：core/mod.rs 登记了 app_deny 与 perm_rule（上一批 zip_pack.rs 那笔"文件在盘上但从没编过"
        的漏就是被零警告逮的，登记这一条不再靠眼力），pack_cmds 那两种形状（文件夹、zip）都过这一道。
     四、页面那一头那道 JS 尺一个字没撤 —— 两处各挡一遍，谁被改坏另一边还在。
   ============================================================ */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-perm46');
/* 本机位置一律从 lib-slice 那一份 ROOT 拿，不在这里写第二遍（公开面那道闸逮的就是写死） */
const 仓 = ROOT.replace(/[\\/]+$/, '');

const 尺 = rd('src/_shared/sh-load.js');
const 板 = rd('src/_tauri/src/core/app_deny.rs');
const 判 = rd('src/_tauri/src/core/perm_rule.rs');
const 动 = rd('src/_tauri/src/tauri_bind/pack_cmds.rs');
const 单 = rd('src/_tauri/src/core/mod.rs');
const 桥 = rd('src/_tauri/bridge.mjs');

const JS那份 = [...(/const APP_DENY = \[([\s\S]*?)\];/.exec(尺)[1].matchAll(/'([^']+)'/g)).map(m => m[1])];
const 壳那份 = [...(板.match(/^\s{4}"([^"]+)",$/gm) || [])].map(x => x.replace(/^\s{4}"|",$/g, ''));

台.题('一 · 那份名单是生成的，不是抄的');
台.数('页面那一头几颗', JS那份.length);
台.数('壳里这一份几颗', 壳那份.length);
台.判('壳里那份与页面那一头逐颗同名同序', JSON.stringify(JS那份) === JSON.stringify(壳那份),
  { 只在页面有: JS那份.filter(x => !壳那份.includes(x)), 只在壳里有: 壳那份.filter(x => !JS那份.includes(x)) });
台.判('生成物自己写明"别手改"与来源', 板.includes('生成物，别手改') && 板.includes('sh-load.js'));
台.判('跑一趟 --验 报一字不差（真跑，不是看字符串）',
  (() => { try{ return execFileSync(process.execPath, ['src/_tauri/bridge.mjs', '--验'], { cwd: 仓, encoding: 'utf8' }); }
    catch(e){ return String(e.stdout || '') + String(e.stderr || ''); } })().includes('一字不差'));
台.判('生成那一趟不许出空表', 桥.includes("名单是空的") && 桥.includes('process.exit(1)'));
台.判('生成那一趟不许出重名', 桥.includes('名单里有重复的名'));

台.题('二 · 壳里真在用它');
台.判('core/mod.rs 登记了 app_deny', /^pub mod app_deny;$/m.test(单));
台.判('core/mod.rs 登记了 perm_rule', /^pub mod perm_rule;$/m.test(单));
台.判('判断那一格只认生成的名单，不抄第二份', 判.includes('use super::app_deny::硬地板;') && !/pub const 硬地板/.test(判));
台.判('文件夹那种与 zip 那种两种形状都过这一道',
  (动.match(/perm_rule::挡下该挡的\(&mut 单\)/g) || []).length === 2,
  (动.match(/perm_rule::挡下该挡的/g) || []).length);
台.判('摘下来的那几颗原样回报在 deniedChannels 上', 动.includes('#[serde(rename = "deniedChannels"'));
台.判('一颗也没挡的时候那一格不出现（回执形状不许多长东西）',
  /#\[serde\(rename = "deniedChannels", skip_serializing_if = "Vec::is_empty"\)\]/.test(动));
台.判('读盘上那份清单，不读页面递上来的那一份（判断在 core，动盘在 tauri_bind）',
  动.includes('fs::read_to_string(&清单)') && 判.includes('不碰磁盘'));

台.题('三 · 测试与警告的规矩');
const 测名 = [...判.matchAll(/fn ([^()]+)\(\)/g)].map(m => m[1]);
台.数('判断那一格几颗测试', 测名.length);
台.判('每一颗测试都有名字且是中文那句（他能直接读懂哪一条过了）',
  测名.length >= 6 && 测名.every(x => /[一-龥]/.test(x)), 测名);
台.判('不许拿 #[allow] 糊警告（判断那一格与生成物里都没有）', !/#!?\[allow/.test(判 + 板));
台.判('会动盘会出网那几颗在测试里被一颗颗点过名',
  ['dataWipe', 'appendPageFile', 'webTitle', 'libWrite', 'backupRun', 'codeCatRename']
    .every(颗 => 判.includes('"' + 颗 + '"')));

台.题('四 · 页面那一头那道尺一个字没撤');
台.判('APP_DENY 那颗还在（两处各挡一遍）', /const APP_DENY = \[/.test(尺));
台.判('packApp 那句"硬地板挡下"的报话还在', 尺.includes('这条通道不给组件，硬地板挡下'));
台.判('登记表冻透那一步还在（上一批钉的）', 尺.includes('function sealDeep') && 尺.includes('sealDeep({'));
台.判('装载器里"门先做好再 import"那句顺序没被改回去',
  (() => { const 段 = 尺.slice(尺.indexOf('async one(id){'), 尺.indexOf('register(id, def, ctx){'));
    return 段.indexOf('PackCtx.make(id)') < 段.indexOf('await import(url)'); })());

台.收尾();
