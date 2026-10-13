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
import { rd, 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-bridge46');
const 壳根 = path.join(ROOT, 'src', '_tauri');
const 原身 = rd('src/pack/preload.cjs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const 生成 = rd('src/_tauri/bridge.mjs');
const 壳 = rd('src/_tauri/src/main.rs');
const 命令格 = path.join(壳根, 'src', 'tauri_bind');

台.题('一、生成物在，且重跑一趟一字不差');
台.判('桥出好了（' + 桥.length.toLocaleString('en-US') + ' 字符）', 桥.length > 20000 && 桥.startsWith('/* Flow-Desk'));
const 跑 = (() => { try{ execFileSync(process.execPath, [path.join(壳根, 'bridge.mjs'), '--验'], { encoding: 'utf8' }); return 0; }
  catch(e){ return e.status || 1; } })();
台.判('拿 --验 重跑一趟：盘上那份没过期（退出码 ' + 跑 + '）', 跑 === 0);

台.题('二、生成物里没有 Node 专用的件');
for(const 禁 of ['require(', 'process.argv', 'nodePath', 'fsNode', '__dirname'])
  台.判('桥里没有「' + 禁 + '」', !桥.includes(禁));
台.判('桥改读壳递进来的那一份门牌（__FD_BOOT__）', 桥.includes('window.__FD_BOOT__'));

const 通道串 = s => [...new Set([...s.matchAll(/(?:invoke|send|on)\('([a-z]+:[A-Za-z][A-Za-z]*)'/g)].map(m => m[1]))].sort();
台.题('三、原身请壳的通道，生成物一处不漏');
const 原通道 = 通道串(原身), 桥通道 = 通道串(桥);
台.数('原身请壳的通道共几颗', 原通道.length + ' 颗（请壳与收消息与单向送都算）');
const 丢了 = 原通道.filter(c => !桥通道.includes(c));
台.判('一颗没丢（少了这些就是搬桥搬出问题）：' + 丢了.join(' '), 丢了.length === 0);
const 丢的 = 桥通道.filter(c => !原通道.includes(c) && c !== 'fs:resolve');
台.判('也没多出凭空造的通道（fs:resolve 是搬桥时新添的那一颗，把虚拟地址交给壳换算）', 丢的.length === 0, 丢的.join(' '));

/* window.FD_APP 那一栏栏：按大括号层数扫出顶层键名 */
function 挂的名字(s){
  const 起 = s.indexOf('window.FD_APP = {');
  if(起 < 0) return [];
  let 深 = 0, 出 = [];
  for(let i = 起 + 'window.FD_APP = '.length; i < s.length; i++){
    const c = s[i];
    if(c === '{'){ 深++; continue; }
    if(c === '}'){ 深--; if(深 === 0) break; continue; }
    if(深 !== 1) continue;
    const m = /^[\s\r\n]*(?:async\s+)?([A-Za-z_$][\w$]*)\s*[(:]/.exec(s.slice(i, i + 80));
    if(m && /[\r\n]/.test(s.slice(Math.max(0, i - 2), i))){ 出.push(m[1]); i += m[1].length; }
  }
  return [...new Set(出)].sort();
}
台.题('四、挂给页面的那套名字两头一字不差');
const 原名 = 挂的名字(原身), 桥名 = 挂的名字(桥);
台.数('原身挂了多少栏', 原名.length + ' 栏');
台.判('两边同一套（差集：' + [...原名.filter(x => !桥名.includes(x)), ...桥名.filter(x => !原名.includes(x))].join(' ') + '）',
  原名.length > 40 && JSON.stringify(原名) === JSON.stringify(桥名));

台.题('五、换算后的名：要么在注册单上，要么明写没搬');
const 注册 = [...壳.matchAll(/tauri_bind::\w+::(\w+)/g)].map(m => m[1]);
const 换算 = n => n.replace(/:/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const 封装里 = /这颗通道还没搬进壳/.test(桥);
台.判('桥对没搬的那颗当场说清是哪一颗（不静默回空）', 封装里);
/* 桥实际会请的那批通道（含搬桥时新添的 fs:resolve）换算成 Rust 的名，再对注册单 */
const 已搬 = [...new Set([...桥通道, ...原通道].map(换算))].filter(n => 注册.includes(n)).sort();
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

台.题('八、封装盖住原身用到的传送动作');
const 用过的 = [...new Set([...原身.matchAll(/ipcRenderer\.(\w+)/g)].map(m => m[1]))].sort();
const 给了 = [...new Set([...桥.matchAll(/^\s{2}(invoke|send|on|removeListener)\(/gm)].map(m => m[1]))].sort();
台.数('原身用到', 用过的.join(' · '));
台.数('封装提供', 给了.join(' · '));
台.判('用到的全提供到了', 用过的.every(k => 给了.includes(k)));
台.判('生成器只干五处替换这一件事，锚一处对不上就停工（不出一份半成品）',
  (生成.match(/^换\(/gm) || []).length >= 7 && 生成.includes('不敢猜改哪一处') && /生成停下/.test(生成));

台.题('九、壳这一侧才有的四件事（2026-10-12 无窗跑真页量出来的四个坑）');
台.判('桥不许在文档最开头一次拿死全局接口 —— 那一刻 Tauri 还没注进来（必须是有用才拿的那一颗）',
  /function 拿壳\(\)/.test(桥) && !/^const 壳 = window\.__TAURI__;$/m.test(桥));
台.判('桥里不残留只在 Electron 那边存在的名字（arg / nodePath / require）',
  !/\barg\(/.test(桥) && !/\bnodePath\./.test(桥) && !/\brequire\(/.test(桥));
台.判('生成器带一道"漏了就停工"，不出半成品', 生成.includes('不许留') && 生成.includes('桥里还留着 Electron 那边才有的名字'));
台.判('虚拟地址落回磁盘那一颗认壳塞的门牌（Windows 上协议是 http:）',
  /location\.protocol !== 'fdapp:' && !window\.__FD_BOOT__/.test(桥));
/* 类型表两处一份：Electron 那份在 main.cjs 的 const MIME（serve 用的那一份 —— 同一文件里还有
   MIME_TYPE_BY_EXT 与 IMG_MIME 两张别的用途的表，扫全文会把三张并成一张，量出来全是假差异），
   壳那份在 fs_policy.rs 的 mime_of。插件是 import() 进来的模块，类型回成 octet-stream 就一家都进不来。 */
const 电块 = (rd('src/pack/main.cjs').match(/const MIME = \{[\s\S]*?\};/) || [''])[0];
const 电表 = Object.fromEntries([...电块.matchAll(/'(\.\w+)'\s*:\s*'([^']+)'/g)].map(m => [m[1], m[2]]));
const 壳块 = rd('src/_tauri/src/core/fs_policy.rs');
const 壳表 = {};
for(const 行 of (壳块.match(/^\s*"[.\w]+"(?: \| "[.\w]+")* => "[^"]+",/gm) || [])){
  const 值 = 行.match(/=> "([^"]+)"/)[1];
  for(const 后 of (行.match(/"\.[\w]+"/g) || [])) 壳表[后.replace(/"/g, '')] = 值;
}
const 共 = Object.keys(电表);
台.数('Electron 那份类型表几档', 共.length + ' 档：' + 共.join(' '));
台.判('Electron 那张表扫到了（扫空了这条判据就是假的）', 共.length >= 12, 共);
const 缺档 = 共.filter(后 => !壳表[后]);
const 错档 = 共.filter(后 => 壳表[后] && 壳表[后] !== 电表[后]).map(后 => 后 + '：壳回 ' + 壳表[后] + '，Electron 回 ' + 电表[后]);
台.判('Electron 表里每一档壳里都有（缺了就回 octet-stream，模块当场拒收）', 缺档.length === 0, 缺档);
台.判('两处一字不差（同一份表不许有两个说法）', 错档.length === 0, 错档);
台.判('壳里那颗带测试钉着 .js 这一档', /text\/javascript; charset=utf-8/.test(rd('src/_tauri/src/core/fs_policy.rs')));

台.收尾();
