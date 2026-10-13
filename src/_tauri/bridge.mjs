/* Flow-Desk 的 Tauri 壳 · 桥的生成器（外46 三）
   ------------------------------------------------------------
     node src/_tauri/bridge.mjs          从 Electron 那份桥生成壳这边的一份
     node src/_tauri/bridge.mjs --验      只算不落盘，比一比盘上那份是不是已经过期

   为什么是"生成"而不是照着再写一份：那份桥 562 行、78 处请壳、window.FD_APP 十七栏，
   还有两个假文件句柄与一处 IndexedDB 补丁。手抄一份就是第二个真身 —— 以后改一处忘一处。
   这里只换最上面那一层传送（Electron 的 ipcRenderer 换成壳的 invoke），
   页面能看见的东西一个形状都不改，这也是他定的「前端原样保留」。

   换的只有五处，别的照抄：
     一、require('electron') 那两处 → 一层薄封装：请壳的名按 Rust 的规矩换算（冒号与驼峰换成下划线），
         参数按壳里那颗命令声明的顺序对上去；没搬进来的通道当场说清是哪一颗没搬，绝不静默回空。
     二、require('path') 与 require('fs') → 换成 JS 自己算的两颗小工具（拼路径、取上一格）。
     三、命令行参数里那三处门牌（--fd-root= 那一套）→ 起窗口时由壳递进来的一份 window.__FD_BOOT__。
     四、pagePath 那颗（虚拟地址落回磁盘哪一格）→ 改成问壳（判断在纯判断那一格，动磁盘在第三层）。
     五、它六个调用点跟着加 await（这一颗从同步变成要问一次壳）。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const 树 = path.join(HERE, '..', '..');
const 原件 = path.join(树, 'src', 'pack', 'preload.cjs');
const 出件 = path.join(HERE, 'ui', 'fd-bridge.js');
const 命令格 = path.join(HERE, 'src', 'tauri_bind');
/* 第二份生成物：硬地板那份名单的 Rust 侧。判断住在纯判断那一格（core::perm_rule），
   名单不许手抄第二份 —— 抄了就有两个真身，改一处忘一处；这里跟那座桥同一趟生成、同一个 --验 口径。 */
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

if(!fs.existsSync(原件)){ console.error('找不到那份桥的原身：' + 原件); process.exit(1); }
let 文 = fs.readFileSync(原件, 'utf8');

/* ---------- 先量壳里真有哪些命令、各收哪几栏（照声明顺序） ---------- */
function 命令参数(){
  const 表 = {};
  const 不是给页面的 = /^(app|手|窗口|状态|事件)/;
  for(const 件 of fs.readdirSync(命令格).filter(f => f.endsWith('_cmds.rs'))){
    const 源 = fs.readFileSync(path.join(命令格, 件), 'utf8');
    for(const m of 源.matchAll(/#\[[^\]]*tauri::command[^\]]*\]\s*pub\s+(?:async\s+)?fn\s+(\w+)\s*\(([\s\S]*?)\)\s*->/g)){
      const 名 = m[1];
      const 栏 = m[2].split(',').map(s => s.trim()).filter(Boolean).flatMap(s => {
        const i = s.indexOf(':'); if(i < 0) return [];
        const 参名 = s.slice(0, i).trim(), 类型 = s.slice(i + 1).trim();
        if(参名 === 'self') return [];
        if(不是给页面的.test(参名)) return [];
        if(/AppHandle|Window|State|Webview/.test(类型)) return [];
        return [参名];
      });
      表[名] = 栏;
    }
  }
  return 表;
}
const 表 = 命令参数();
const 桥名 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/* ---------- 那一层薄封装（生成的文件里唯一新写的运行时代码） ---------- */
const 封装 = `/* 这一份是生成物，别手改：node src/_tauri/bridge.mjs
   原身是主程序那一棵的 src\\pack\\preload.cjs —— 只换最上面那层传送，页面看见的形状一个字不改。
   下面这段是壳这边独有的：请壳的名按 Rust 的规矩换算，参数按壳里命令声明的顺序对上去。 */
/* 这一层跑在文档最开头（壳那边是 initialization_script），那一刻 Tauri 的全局接口还没注进来，
   一次拿死会当场抛一句「没在壳里打开」然后整个桥不挂 —— 2026-10-12 无窗跑真页量到的就是这一手。
   所以改成用到才拿：页面真请壳的时候再认，认不到还是报那一句。 */
function 拿壳(){
  const 壳 = window.__TAURI__;
  if(!壳 || !壳.core) throw new Error('这一张页面没在 Flow-Desk 的壳里打开（拿不到 window.__TAURI__）');
  return 壳;
}
const 请壳 = (n, 包) => 拿壳().core.invoke(n, 包);
const 听壳 = (n, 手) => { const 壳 = window.__TAURI__;
  return (壳 && 壳.event) ? 壳.event.listen(n, 手) : Promise.reject(new Error('壳没给事件那一层')); };
const 参表 = ${JSON.stringify(表)};
const 名换算 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const 对不上 = (n, 有, 递) => {
  if(递 <= 有) return true;
  throw new Error('壳里那颗命令收不了这么多栏：' + n + '（壳里 ' + 有 + ' 栏，页面上递了 ' + 递 + ' 栏）');
};
const 收 = {};
function 起监听(n){
  if(收[n] || !听壳) return;
  收[n] = [];
  听壳(n, ev => { (收[n] || []).slice().forEach(f => { try{ f(null, ev.payload); }catch(e){} }); })
    .then(撤 => { 收[n + '·撤'] = 撤; })
    .catch(() => {});
}
const ipcRenderer = {
  invoke(name, ...args){
    const 命 = 名换算(name);
    if(!Object.prototype.hasOwnProperty.call(参表, 命))
      return Promise.reject(new Error('这颗通道还没搬进壳：' + name));
    const 栏 = 参表[命];
    对不上(name, 栏.length, args.length);
    const 包 = {};
    栏.forEach((k, i) => { if(i < args.length && args[i] !== undefined) 包[k] = args[i]; });
    return 请壳(命, 包);
  },
  send(name, ...args){ this.invoke(name, ...args).catch(() => {}); },
  on(name, fn){ 起监听(name); if(收[name]) 收[name].push(fn); return ipcRenderer; },
  removeListener(name, fn){
    const 列 = 收[name];
    if(列){ const i = 列.indexOf(fn); if(i >= 0) 列.splice(i, 1); }
    if(收[name] && !收[name].length){
      const 撤 = 收[name + '·撤'];
      if(撤){ 撤(); delete 收[name + '·撤']; }
      delete 收[name];
    }
  },
};`;

/* ---------- 五处替换，一处对不上就停工，别出半份 ---------- */
function 换(from, to, 件名, 全部){
  /* 原身那一份的行尾是回车加换行两处一起，这里写的替换文本只带了一处 —— 先对齐，
     不然锚找得到、换进去那一段却跟四周不是一种行尾（换行在这台机器上是当字节算的事） */
  if(to.includes('\n') && 文.includes('\r\n')) to = to.split('\n').join('\r\n');
  const 次 = 文.split(from).length - 1;
  if(!次){ console.error('这一处没在原身里找到，生成停下（原身改过形状？）：' + 件名 + '\n  要找的开头：' + from.slice(0, 60)); process.exit(1); }
  if(全部){ 文 = 文.split(from).join(to); return; }
  if(次 !== 1){ console.error('这一处在原身里冒了 ' + 次 + ' 次，不敢猜改哪一处：' + 件名); process.exit(1); }
  文 = 文.split(from).join(to);
}
const 行首 = s => String(s).split(/\r?\n/);

换("const { ipcRenderer } = require('electron');\nconst nodePath = require('path');", 封装, '一、传送那一层');

换(行首(文).find(l => l.startsWith('const arg = p =>')) || '@@找不到@@',
    "const 开壳 = window.__FD_BOOT__ || { root: '', which: 'fd', pages: '', data: '' };", '三、命令行参数那一颗');
换("const ROOT = arg('--fd-root='), WHICH = arg('--fd-app=');",
    'const ROOT = 开壳.root, WHICH = 开壳.which;', '三、树在哪与这是哪一棵');
换("const PAGES_DIR = arg('--fd-pages=') || ROOT;",
    'const PAGES_DIR = 开壳.pages || ROOT;', '三、页面层那一格');
换("const DATA_DIR = arg('--fd-data=') || nodePath.join(ROOT, 'data');",
    "const DATA_DIR = 开壳.data || join(ROOT, 'data');", '三、数据层那一格');
/* 2026-10-12 无窗跑真页量到的漏：这一处调用没换掉，桥挂到一半就抛
   「ReferenceError: arg is not defined」，整座桥不挂、插件一家不加载、桌面零张卡。
   壳这一侧只有一张窗（为写和练习都在同一张页里就地开），名字就是程序名。 */
换("label: arg('--fd-label=')",
    "label: 开壳.label || 'Flow-Desk'", '三、这一框叫什么');
换("const fsNode = require('fs');", '/* 盘上有没有那一格由壳回答，这里不再直接摸磁盘 */', '二、fs');
换("nodePath.dirname(", "dirnameOf(", '二、取上一格那一处调用', true);
换("function base(p){ return p.replace(/[\\\\/]+$/, '').split(/[\\\\/]/).pop(); }",
    "function base(p){ return p.replace(/[\\\\/]+$/, '').split(/[\\\\/]/).pop(); }\nfunction dirnameOf(p){ const s = String(p == null ? '' : p).replace(/[\\\\/]+$/, ''); const i = Math.max(s.lastIndexOf('\\\\'), s.lastIndexOf('/')); return i < 0 ? '' : s.slice(0, i); }",
    '二、取上一格那颗小工具');

/* 四、虚拟地址落回磁盘：整颗换成问壳（判断在纯判断那一格，动磁盘在第三层） */
const 找 = /\n  pagePath\(rel\)\{[\s\S]*?\n    return target;\n  \},/;
if(!找.test(文)){ console.error('第四处（pagePath 那一整颗）在原身里没找到整块，生成停下'); process.exit(1); }
文 = 文.replace(找, `
  async pagePath(rel){
    /* Windows 这层把自定义地址写成 http://fdapp.localhost/…，location.protocol 看到的是 http:，
       光按 'fdapp:' 判会把壳当成不能动文件的页面 —— 壳塞的那份门牌在，就算本地（跟页面里 DATA_PRE 那一处同一个判法）。 */
    if(location.protocol !== 'fdapp:' && !window.__FD_BOOT__) throw new Error('当前页面不是本地协议，动不了文件');
    const virt = decodeURIComponent(new URL(String(rel), location.href).pathname).replace(/^\\/+/, '');
    return await ipcRenderer.invoke('fs:resolve', virt);
  },`);

/* 五、六个调用点跟着加 await */
const 几 = (文.match(/this\.pagePath\(rel\)/g) || []).length;
if(!几){ console.error('第五处：一个 this.pagePath(rel) 调用点都没找到'); process.exit(1); }
文 = 文.split('this.pagePath(rel)').join('await this.pagePath(rel)');
const 剩 = ['require(', 'process.', 'nodePath', 'fsNode'].filter(k => 文.includes(k));
if(剩.length){ console.error('生成物里还留着不该留的东西：' + 剩.join(' · ')); process.exit(1); }
/* 原身用到的 ipcRenderer 动作必须全在这层薄封装里给到，缺一样就是运行时才炸的暗坑 */
const 用过的 = [...new Set([...文.matchAll(/ipcRenderer\.(\w+)/g)].map(m => m[1]))].sort();
const 给了 = ['invoke', 'send', 'on', 'removeListener'];
const 缺 = 用过的.filter(k => !给了.includes(k));
if(缺.length){ console.error('这层封装没提供原身用到的动作：' + 缺.join(' · ')); process.exit(1); }
console.log('  原身用到的传送动作：' + 用过的.join(' · ') + '（封装都提供了）');

const 头 = '/* Flow-Desk 的壳 · 页面上那套功能的落点（生成物，改它请改 src\\pack\\preload.cjs 与 src\\_tauri\\bridge.mjs）\n'
  + '   壳里已搬通的命令：' + Object.keys(表).length + ' 颗 · 桥里请壳的地方：'
  + (文.match(/invoke\('([a-z]+:[A-Za-z]+)'/g) || []).length + ' 处 */\n';
const 出 = 头 + 文;

/* 漏一颗就停工：原身里那些只在 Electron 那边存在的名字（命令行参数那颗 arg、node 的 path、require），
   只要还有一处调用没换掉，桥挂到那一行就当场抛 —— 2026-10-12 那次「label: arg('--fd-label=')」漏换，
   语法检查全过（它不认未定义的名字），桥静默不挂，界面上只是"一张卡都没有"。
   所以这一道放在写盘之前，比 --check 狠一层。 */
const 不许留 = [['arg(', /\barg\(/g], ['nodePath.', /\bnodePath\./g], ['require(', /\brequire\(/g]];
const 漏了 = 不许留.filter(([名, 式]) => 式.test(出)).map(([名]) => 名);
if(漏了.length){
  const 行 = 出.split(/\r?\n/).map((L, i) => [L, i + 1]).filter(([L]) => /\barg\(|\bnodePath\.|\brequire\(/.test(L)).map(([L, i]) => '  第 ' + i + ' 行：' + L.trim().slice(0, 90));
  console.error('桥里还留着 Electron 那边才有的名字（' + 漏了.join(' · ') + '）—— 生成停下：\n' + 行.slice(0, 8).join('\n'));
  process.exit(1);
}
if(验Only){
  const 盘 = fs.existsSync(出件) ? fs.readFileSync(出件, 'utf8') : '';
  const 盘板 = fs.existsSync(地板件) ? fs.readFileSync(地板件, 'utf8') : '';
  const 两份 = [['桥', 盘, 出], ['硬地板那份名单', 盘板, 出地板]];
  const 过期 = 两份.filter(([, 盘上, 该是]) => 盘上 !== 该是).map(([名]) => 名);
  if(过期.length){ console.log('生成物过期了（' + 过期.join(' · ') + '）：跑一趟 node src/_tauri/bridge.mjs 重出'); process.exit(1); }
  console.log('生成物与盘上那份一字不差（桥 · 硬地板 ' + 出地板.match(/^\s{4}"/gm).length + ' 颗）');
  process.exit(0);
}
fs.mkdirSync(path.dirname(出件), { recursive: true });
fs.writeFileSync(出件, 出, 'utf8');
fs.writeFileSync(地板件, 出地板, 'utf8');
const 法 = spawnSync(process.execPath, ['--check', 出件], { encoding: 'utf8' });
if(法.status !== 0){ console.error('生成了，但语法过不去：\n' + (法.stderr || 法.stdout)); process.exit(1); }
console.log('桥出好了：' + 出件 + ' · ' + 出.length.toLocaleString('en-US') + ' 字符 · 壳里已搬 ' + Object.keys(表).length + ' 颗命令 · 语法过');
console.log('硬地板那份名单出好了：' + 地板件 + ' · ' + 出地板.match(/^\s{4}"/gm).length + ' 颗（读的是 sh-load.js 里 APP_DENY 那一颗）');
