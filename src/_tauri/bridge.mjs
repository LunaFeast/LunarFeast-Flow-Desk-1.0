/* Flow-Desk 的 Tauri 壳 · 硬地板那份名单的生成器（外46 三 · 2026-10-13 改成只管这一件）
   ------------------------------------------------------------
     node src/_tauri/bridge.mjs          从页面那一头的名单重出壳里的一份（Rust）
     node src/_tauri/bridge.mjs --验      只算不落盘，比一比盘上那份是不是已经过期

   这一颗以前兼两件事：一、从 Electron 那份桥生成壳这边的桥；二、生成硬地板那份名单。
   2026-10-13 第一件撤了（他定新仓不要 Electron 残留）：撤之前量过，那份桥与生成器产出的一字不差，
   所以它直接转成源码 —— 以后要改桥就改 `src\_tauri\ui\fd-bridge.js` 那一份，只有一份真身。
   桥里那张参数表（页面递的栏名与顺序）从前是生成时从壳的命令声明里取的，现在改成每一趟自检量一遍：
   判据住在 `src\tools\probes\gate-bridge46.mjs`，它自己独立读 Rust 的声明，不抄这儿的写法。
   第二件照旧 —— 名单不许手抄第二份，抄了就有两个真身，改一处忘一处。
   这颗的名字还带着 bridge，等删 Electron 那几份那一步一起改口。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const 树 = path.join(HERE, '..', '..');
/* 名单的真身住在页面那一头（共用模块加载那一份里），壳里这份是给它配的 Rust 侧 */
const 尺原件 = path.join(树, 'src', '_shared', 'sh-load.js');
const 地板件 = path.join(HERE, 'src', 'core', 'app_deny.rs');
const 验Only = process.argv.includes('--验');

function 地板文本(){
  const 源 = fs.readFileSync(尺原件, 'utf8');
  const 抓 = /const APP_DENY = \[([\s\S]*?)\];/.exec(源);
  if(!抓){ console.error('生成不了：sh-load.js 里找不到 `const APP_DENY = [...]` 那一颗'); process.exit(1); }
  const 名单 = [...抓[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  if(!名单.length){ console.error('生成不了：那份名单是空的（空表等于整道闸没了）'); process.exit(1); }
  const 重 = 名单.filter((x, i) => 名单.indexOf(x) !== i);
  if(重.length){ console.error('生成不了：名单里有重复的名：' + [...new Set(重)].join(' · ')); process.exit(1); }
  return '/* 生成物，别手改：这份名单由 src\\_tauri\\bridge.mjs 从 src\\_shared\\sh-load.js 里的\n'
    + '   `const APP_DENY` 那一颗读出来生成（跑一趟 node src\\_tauri\\bridge.mjs；--验 只比不写）。\n'
    + '   为什么要有这一份：硬地板是「清单点名也不给」那道闸，壳里那份判断（core::perm_rule）要认它，\n'
    + '   而它不许再抄第二份 —— 抄了就有两个真身，改一处忘一处。\n'
    + '   判据只有一条：这一颗是不是「宿主自己的事」（会动盘、会动别人家东西、会起网络都算）。\n'
    + '   名单 ' + 名单.length + ' 颗，顺序与页面那一头一字不差。 */\n\n'
    + '/// 硬地板：插件清单点名也不给的通道名（生成物，来源见顶上那段）\n'
    + 'pub const 硬地板: &[&str] = &[\n'
    + 名单.map(x => '    "' + x + '",').join('\n') + '\n];\n';
}
const 出地板 = 地板文本();
const 颗数 = (出地板.match(/^\s{4}"/gm) || []).length;

if(验Only){
  const 盘板 = fs.existsSync(地板件) ? fs.readFileSync(地板件, 'utf8') : '';
  if(盘板 !== 出地板){ console.log('硬地板那份名单过期了：跑一趟 node src/_tauri/bridge.mjs 重出'); process.exit(1); }
  console.log('硬地板那份名单与盘上那份一字不差（' + 颗数 + ' 颗）');
  process.exit(0);
}
fs.writeFileSync(地板件, 出地板, 'utf8');
console.log('硬地板那份名单出好了：' + 地板件 + ' · ' + 颗数 + ' 颗（读的是 sh-load.js 里 APP_DENY 那一颗）');
