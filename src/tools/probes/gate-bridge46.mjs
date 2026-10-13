/* ============================================================
   gate-bridge46.mjs · 外46 三：页面上那套功能的落点（桥）搬过来之后钉住这些
   ------------------------------------------------------------
     node src/tools/probes/gate-bridge46.mjs
   一、生成物在，且重跑一趟一字不差（幂等）；
   二、生成物里不许再有任何 Node 专用的件（require、process、path 模块、fs 模块）；
   三、原身请壳的每一颗通道，生成物一处不漏地还在请（搬桥不许顺手丢功能）；
   四、原身挂给页面的那套名字（window.FD_APP 那一栏栏）两头一字不差；
   五、桥里换算后的名要么真在壳的注册单上，要么就明写着还没搬 —— 不许有半边桥；
   六、桥里的参数表是从壳的命令声明里取的，栏名与顺序都得对得上；
   七、虚拟地址落回磁盘那一条（pagePath）在桥里改成问壳，壳里也确实有那一颗；
   八、封装提供的传送动作，正好盖住原身用到的那些；
   九、壳这一侧才有的四件事（拿接口的时机、不残留 Electron 专用名字、门牌判本地、类型表两处一字不差）。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT, 桥全部, 桥请壳, 名换算, 壳注册单 } from './lib-slice.mjs';

const 台 = 记账('gate-bridge46');
const 壳根 = path.join(ROOT, 'src', '_tauri');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 生成 = rd('src/_tauri/bridge.mjs');
const 壳 = rd('src/_tauri/src/main.rs');
const 命令格 = path.join(壳根, 'src', 'tauri_bind');

台.题('一、桥这一份是源码（不再是从 Electron 那份生成的），硬地板那份名单重跑一字不差');
台.判('桥在（' + 桥.length.toLocaleString('en-US') + ' 字符）且顶上明写「这一份就是桥的原件」',
  桥.length > 20000 && 桥.startsWith('/* Flow-Desk') && 桥.includes('这一份就是桥的原件'));
台.判('桥读得通（拿 node --check 那把尺现量，转成源码之后这一份再没人替它兜着）', (() => {
  try{ execFileSync(process.execPath, ['--check', path.join(壳根, 'ui', 'fd-bridge.js')], { encoding: 'utf8' }); return true; }
  catch(e){ console.log('  · 桥语法过不去：' + String(e.stderr || e.message).split(/\r?\n/)[1]); return false; }
})());
const 跑 = (() => { try{ execFileSync(process.execPath, [path.join(壳根, 'bridge.mjs'), '--验'], { encoding: 'utf8' }); return 0; }
  catch(e){ return e.status || 1; } })();
台.判('硬地板那份名单拿 --验 重跑一趟：盘上那份没过期（退出码 ' + 跑 + '）', 跑 === 0);
台.判('那颗生成器不再读 Electron 那份桥（它现在只生硬地板名单那一份）',
  !生成.includes('preload.cjs') && !生成.includes('出件'));

台.题('二、生成物里没有 Node 专用的件');
for(const 禁 of ['require(', 'process.argv', 'nodePath', 'fsNode', '__dirname'])
  台.判('桥里没有「' + 禁 + '」', !桥.includes(禁));
台.判('桥改读壳递进来的那一份门牌（__FD_BOOT__）', 桥.includes('window.__FD_BOOT__'));

/* 通道名里有带连字符的那一族（'fs:read' 之外还有别家）—— 名段不许把 '-' 漏掉，漏了整族就逃过这一节
   （2026-10-13 头一版就是这么漏的，当时看着"一颗都不在单外"，其实整族根本被没扫到） */
/* 这几把尺住在 lib-slice 那一份里（五道同族闸共用），这一台不另抄第二份 */
const 通道串 = 桥全部, 请壳串 = 桥请壳, 换算 = 名换算;
const 注册 = 壳注册单();
台.题('三、桥请的每一颗命令都在壳的注册单上（尺子是 Rust 那一头，不再拿 Electron 那份桥比）');
const 桥通道 = 通道串(桥), 请壳 = 请壳串(桥);
台.数('桥请壳的通道共几颗', 桥通道.length + ' 颗（请壳与单向送 ' + 请壳.length + ' 颗 · 收消息 ' + (桥通道.length - 请壳.length) + ' 颗）');
const 单外 = [...new Set(请壳.map(换算))].filter(n => !注册.includes(n));
台.判('请壳的一颗都不许在单外（在单外就是桥请了一颗壳里没有的）：' + 单外.join(' '), 单外.length === 0);
台.判('这一节扫到了东西（扫空了上面那条判据就是假的）：请壳 ' + 请壳.length + ' 颗', 请壳.length >= 40, 请壳.join(' '));
/* 收消息那几颗是壳往外发的动作：要么 Rust 那一头喊得出这颗名（冒号形与下划线形都算），
   要么是桥自己那一层分发的（窗口状态、音乐、音量、明暗、词库变了那几路住在 winFans 那样的名单里）
   —— 两种都算有着落，一处都搜不到就是桥在听一件没人喊的事 */
const 事件 = 桥通道.filter(c => !请壳.includes(c));
const 全Rust = fs.readdirSync(path.join(壳根, 'src'), { recursive: true }).filter(f => String(f).endsWith('.rs'))
  .map(f => { try{ return fs.readFileSync(path.join(壳根, 'src', String(f)), 'utf8'); }catch(e){ return ''; } }).join('\n');
const 本地分发 = [...桥.matchAll(/const (\w*Fans)\s*=\s*\[\]/g)].map(m => m[1]);
const 喊不到 = 事件.filter(c => {
  const 冒 = '"' + c + '"', 下 = '"' + c.replace(':', '_') + '"';
  if(全Rust.includes(冒) || 全Rust.includes(下)) return false;
  return !new RegExp('\\b' + c.split(':')[1].replace(/^./, x => x.toUpperCase()) + '\\w*Fans\\b').test(桥) &&
         !new RegExp(c.split(':')[1]).test(桥);
});
台.数('桥收消息的通道几颗', 事件.length + ' 颗：' + 事件.join(' '));
台.数('桥里本地分发那几张名单', 本地分发.join(' · '));
台.判('每一颗都说得出是谁喊的（Rust 那颗事件名，或桥里本地分发那一张名单）：' + 喊不到.join(' '), 喊不到.length === 0);

/* window.FD_APP 那一栏栏：按大括号层数取到整颗对象，再按顶层逗号一段一段数键名。
   切的时候必须跳过注释与串 —— 那颗对象里满是这样一行：/* 例：{1} 、'a{b' —— 不跳会把层数算错、
   把键名整段整段漏掉（2026-10-13 头一版就漏掉 21 栏，看着像桥没挂，其实是这把尺自己坏了）。
   （从前那把尺还要求键名前面有换行，同一行里连着写的第二第三个键就漏认 —— root 与 label 都是那么漏的。）
   后面单独挂上去的那几栏（window.FD_APP.xxx = …）一起算。 */
function 挂的名字(s){
  const 起 = s.indexOf('window.FD_APP = {');
  const 出 = [];
  if(起 >= 0){
    /* 先按大括号配对取整颗对象的范围，路上跳注释与串 */
    const 源 = s.slice(起);
    let 深 = 0, 始 = -1, 末 = -1;
    for(let i = 0; i < 源.length; i++){
      const c = 源[i], d = 源[i + 1];
      if(c === '/' && d === '/'){ i = (源.indexOf('\n', i) + 1 || 源.length) - 1; continue; }
      if(c === '/' && d === '*'){ const e = 源.indexOf('*/', i + 2); i = e < 0 ? 源.length : e + 1; continue; }
      if(c === "'" || c === '"' || c === '`'){ i = 跳串(源, i); continue; }
      if(c === '{'){ 深++; if(深 === 1){ 始 = i; continue; } }
      else if(c === '}'){ 深--; if(深 === 0){ 末 = i; break; } }
    }
    if(末 > 始){
      const 体 = 源.slice(始 + 1, 末);
      let 深2 = 0, 当 = '';
      const 段 = [];
      for(let i = 0; i < 体.length; i++){
        const c = 体[i], d = 体[i + 1];
        if(c === '/' && d === '/'){ i = (体.indexOf('\n', i) + 1 || 体.length) - 1; continue; }
        if(c === '/' && d === '*'){ const e = 体.indexOf('*/', i + 2); i = e < 0 ? 体.length : e + 1; continue; }
        if(c === "'" || c === '"' || c === '`'){ i = 跳串(体, i); continue; }
        if('([{'.includes(c)) 深2++;
        else if(')]}'.includes(c)) 深2--;
        if(c === ',' && 深2 === 0){ 段.push(当); 当 = ''; continue; }
        当 += c;
      }
      段.push(当);
      for(const 一 of 段){
        const m = /^\s*(?:async|get|set|static)\s+([A-Za-z_$][\w$]*)/.exec(一) || /^\s*([A-Za-z_$][\w$]*)\s*[(:]/.exec(一);
        if(m) 出.push(m[1]);
      }
    }
  }
  for(const m of s.matchAll(/window\.FD_APP\.([A-Za-z_$][\w$]*)\s*=/g)) 出.push(m[1]);
  return [...new Set(出)].sort();
}
function 跳串(文, i){          /* 从一颗引号的位置走到底，跳掉里面的转义与模板串里的 ${…} */
  const q = 文[i];
  for(let k = i + 1; k < 文.length; k++){
    const c = 文[k];
    if(c === '\\'){ k++; continue; }
    if(q === '`' && c === '$' && 文[k + 1] === '{'){ let 深 = 1, j = k + 2; while(j < 文.length && 深){ if(文[j] === '{') 深++; else if(文[j] === '}') 深--; j++; } k = j - 1; continue; }
    if(c === q) return k;
  }
  return 文.length;
}
台.题('四、页面上请桥用到的那一栏栏，桥每一栏都挂到了（另一头是页面源码，不再拿 Electron 那份桥比）');
function 走页(格, 收 = []){
  const 全 = path.join(ROOT, 格);
  if(!fs.existsSync(全)) return 收;
  for(const e of fs.readdirSync(全, { withFileTypes: true })){
    const 相 = 格 + '/' + e.name;
    if(e.isDirectory()){ if(!['node_modules', 'images'].includes(e.name)) 走页(相, 收); continue; }
    if(/\.(js|cjs|html)$/.test(e.name)) 收.push(相);
  }
  return 收;
}
const 页面层 = ['src/_fd', 'src/_wnw', 'src/_shared', 'src/_wcustom', 'data/plugins'].flatMap(d => 走页(d));
const 用的 = [...new Set(页面层.flatMap(相 => [...rd(相).matchAll(/FD_APP\.([A-Za-z_$][\w$]*)/g)].map(m => m[1])))].sort();
const 桥名 = 挂的名字(桥);
const 缺 = 用的.filter(n => !桥名.includes(n));
台.数('页面那一头扫几份、用到几栏', 页面层.length + ' 份 · 用到 ' + 用的.length + ' 栏 · 桥挂出 ' + 桥名.length + ' 栏');
台.判('页面上请的每一栏桥都挂到了（缺了那一颗当场是 undefined）：' + 缺.join(' '), 缺.length === 0);
台.判('这一节扫到了东西（桥一栏没挂、页面一栏没用，这两条判据就都是假的）', 桥名.length >= 40 && 用的.length >= 30, 桥名.length + ' / ' + 用的.length);

台.题('五、换算后的名：要么在注册单上，要么明写没搬');
const 封装里 = /这颗通道还没搬进壳/.test(桥);
台.判('桥对没搬的那颗当场说清是哪一颗（不静默回空）', 封装里);
const 已搬 = [...new Set(桥通道.map(换算))].filter(n => 注册.includes(n)).sort();
台.数('桥里请的通道里已在壳里的', 已搬.length + ' 颗 · ' + 已搬.join(' '));
台.判('已搬的有一批（文件读写、窗口、挑选、地址换算，加批一那十一颗数据与配置都在）', 已搬.length >= 31);
/* 反过来量：注册单上有、桥里却不请的那几颗，必须一一说得出为什么在这儿
   （报版本那一颗是壳自己写的、不在 tauri_bind 这张单上，占位页用完就该撤） */
const 壳多 = 注册.filter(n => !已搬.includes(n)).sort();
台.判('壳里多出来的只准是建目录那一颗 —— 它是写文件时顺带的一栏，页面不单独请',
  JSON.stringify(壳多) === JSON.stringify(['fs_mkdir']), 壳多.join(' '));

台.题('六、桥里的参数表是从壳的命令声明里取的');
/* 独立算一遍壳里的栏：按尖括号/圆括号层数拆，不在 <> 里面遇逗号就断 —— 这样
   `手: State<'_, 窗口手>` 才会被当成一整栏。生成器那一份用另一套写法，两遍对得上才算数。 */
function 拆栏(s){
  const 出 = []; let 深 = 0, 当 = '';
  for(const c of s){
    if(c === '<' || c === '(' || c === '[' || c === '{') 深++;
    else if(c === '>' || c === ')' || c === ']' || c === '}') 深--;
    if(c === ',' && 深 === 0){ 出.push(当); 当 = ''; continue; }
    当 += c;
  }
  if(当.trim()) 出.push(当);
  return 出;
}
function 壳里声明(源, 名){
  const 起 = 源.indexOf('fn ' + 名 + '(');
  if(起 < 0) return null;
  let 深 = 0, i = 源.indexOf('(', 起);
  for(; i < 源.length; i++){
    const c = 源[i];
    if(c === '(') 深++;
    else if(c === ')'){ 深--; if(深 === 0) break; }
  }
  return 拆栏(源.slice(源.indexOf('(', 起) + 1, i));
}
const 表文 = (桥.match(/const 参表 = (\{[\s\S]*?\});/) || [])[1] || '{}';
const 表 = JSON.parse(表文);
台.判('参数表里的每一颗都在注册单上', Object.keys(表).every(n => 注册.includes(n) || n === 'shell_info'));
/* 命令层那一份合起来的源码：这一节与第七节都用它，取一次不抄第二遍 */
const 源 = fs.readdirSync(命令格).filter(f => f.endsWith('_cmds.rs')).map(f => fs.readFileSync(path.join(命令格, f), 'utf8')).join('\n');
let 全对 = true;
for(const [n, 栏] of Object.entries(表)){
  const 宣 = 壳里声明(源, n);
  if(!宣){ 全对 = false; console.log('  · 壳里找不到那颗命令的声明：' + n); continue; }
  const 栏名 = 宣.flatMap(s => {
    const i = s.indexOf(':'); if(i < 0) return [];
    const 参名 = s.slice(0, i).trim(), 类型 = s.slice(i + 1).trim();
    if(参名 === 'self' || /^(app|手|窗口|状态|事件)/.test(参名)) return [];
    if(/AppHandle|Window|State|Webview/.test(类型)) return [];
    return [参名];
  });
  if(JSON.stringify(栏名) !== JSON.stringify(栏)){ 全对 = false; console.log('  · ' + n + ' 壳里声明是 ' + 栏名.join(',') + '，桥里记的是 ' + 栏.join(',')); }
}
台.判('每颗命令的栏名与顺序都跟壳里声明一致', 全对);
台.判('读写那两颗对得上页面上递的顺序', JSON.stringify(表.fs_write) === JSON.stringify(['p', 'data', 'mkdir'])
  && JSON.stringify(表.fs_read_range) === JSON.stringify(['p', 'start', 'length']));

台.题('七、虚拟地址落回磁盘那一条改成问壳了');
台.判('桥里请的是 fs:resolve', 桥.includes("invoke('fs:resolve'"));
台.判('壳里确实有这一颗', 壳.includes('fs_cmds::fs_resolve') && /fn fs_resolve/.test(源));
台.判('桥里那颗 pagePath 成了异步，六个调用点都跟着 await',
  /async pagePath\(rel\)\{/.test(桥) && (桥.match(/await this\.pagePath\(rel\)/g) || []).length === 6);

台.题('八、桥里的传送全走那一层封装');
const 给了 = [...new Set([...桥.matchAll(/^\s{2}(invoke|send|on|removeListener)\(/gm)].map(m => m[1]))].sort();
台.数('封装提供', 给了.join(' · '));
台.判('该给的四颗都给到了（请壳、单向送、收消息、退掉监听）', ['invoke', 'send', 'on', 'removeListener'].every(k => 给了.includes(k)), 给了.join(' '));
const 直读 = 桥.split(/\r?\n/).filter(L => /window\.__TAURI__/.test(L)).length;
台.判('直接碰接口的那几行只准住在拿壳与听壳那两颗里（现在 ' + 直读 + ' 行，绕过封装去请壳就没人替这一趟把关）', 直读 === 3);

台.题('九、壳这一侧才有的三件事（2026-10-12 无窗跑真页量出来的坑，2026-10-13 撤了生成器那一道停工之后剩这三件）');
台.判('桥不许在文档最开头一次拿死全局接口 —— 那一刻 Tauri 还没注进来（必须是有用才拿的那一颗）',
  /function 拿壳\(\)/.test(桥) && !/^const 壳 = window\.__TAURI__;$/m.test(桥));
台.判('桥里不残留只在 Electron 那边存在的名字（arg / nodePath / require）',
  !/\barg\(/.test(桥) && !/\bnodePath\./.test(桥) && !/\brequire\(/.test(桥));
台.判('虚拟地址落回磁盘那一颗认壳塞的门牌（Windows 上协议是 http:）',
  /location\.protocol !== 'fdapp:' && !window\.__FD_BOOT__/.test(桥));
/* 文件类型那张表现在只有壳里一份：Electron 那份 main.cjs 里的 const MIME 从 2026-10-13 起不再是尺子
   （同一份文件里还有 MIME_TYPE_BY_EXT 与 IMG_MIME 两张别的用途的表，从前扫全文会把三张并成一张）。
   下面那 15 档是撤之前从 Electron 那份表里抄下来的要求清单 —— 插件是 import() 进来的模块，
   少一档就回成 octet-stream，模块当场拒收，界面上只表现为「这一家开不了」。 */
台.题('十、文件类型那张表以壳里那一份为唯一，那 15 档一档不许缺');
const 要求档 = ['.html', '.js', '.css', '.json', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff2', '.map'];
const 壳块 = rd('src/_tauri/src/core/fs_policy.rs');
const 壳表 = {};
for(const 行 of (壳块.match(/^\s*"[.\w]+"(?: \| "[.\w]+")* => "[^"]+",/gm) || [])){
  const 值 = 行.match(/=> "([^"]+)"/)[1];
  for(const 后 of (行.match(/"\.[\w]+"/g) || [])) 壳表[后.replace(/"/g, '')] = 值;
}
const 共 = Object.keys(壳表);
台.数('壳里那张表几档', 共.length + ' 档：' + 共.join(' '));
台.判('表扫到了（扫空了下面两条判据就是假的）', 共.length >= 12, 共);
const 缺档 = 要求档.filter(后 => !壳表[后]);
台.判('那 15 档壳里都有（缺了就回 octet-stream，那一家当场进不来）：' + 缺档.join(' '), 缺档.length === 0);
const 兜底 = Object.entries(壳表).filter(([, 值]) => 值 === 'application/octet-stream').map(([后]) => 后);
台.判('没有一档写成兜底那一个：' + 兜底.join(' '), 兜底.length === 0);
台.判('那颗带测试钉着 .js 这一档', /text\/javascript; charset=utf-8/.test(壳块));

台.收尾();
