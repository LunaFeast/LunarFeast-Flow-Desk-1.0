/* 推演组件定制分离这一轮的闸（外39 · 2026-10-09 他定「推演组件定制本身也要分离出来，改名为 wnw-custom」）
   ------------------------------------------------------------
   形状照为写那一套：源码单独一棵（src\_wcustom\src\）→ 自己出一颗产物；
   插件分离第 1 批起那颗产物不再拼进整页，改成铺进 data\plugins\wnw-custom\，开机由加载器注进来。
   界面上多一张启动卡，包 id = wnw-custom。
   钉四件事，每条都报数：
     一 · 那一棵的形状：名单和磁盘一一对得上、搬走那三份在老地方一处不剩、装配单不再点源码、词库那两份照旧住 _shared
     二 · 不套闭包这条口径没被改掉（名字照旧落在整页顶层，理由写在 build-kernel.mjs 开头）
     三 · 这一家包在位：三份文件齐、插件清单 id 对得上目录名、在名单里、那张卡只吃 ctx
     四 · 宿主递出去的那只口（fd5-load 里的 wcustom）两头都判：内核在开得起来、不在就说实话
   最后咬口：把「内核在不在」那一句判反 —— 干净那一跑开得得到的，必须变成开不到。 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ROOT, rd, 记账 } from './lib-slice.mjs';

const 台 = 记账('推演组件定制分离');
const 棵 = ROOT + 'src/_wcustom/';
const 包 = ROOT + 'data/plugins/wnw-custom/';

/* ---------- 一 · 那一棵的形状 ---------- */
台.题('一 · 一棵源码 + 一颗产物 + 装配单只读产物');
const 装 = rd('src/_wcustom/build-kernel.mjs');
const 名单 = (/const PARTS = \[([\s\S]*?)\]/.exec(装)[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ''));
const 盘上 = fs.readdirSync(棵 + 'src').filter(n => /\.js$/.test(n)).sort();
台.数('名单 ' + 名单.length + ' 份 · 磁盘 ' + 盘上.length + ' 份', 盘上.join('、'));
台.判('名单和磁盘一一对得上（多一份少一份都算漏）',
  名单.slice().sort().join(',') === 盘上.join(','), 名单.join('、') + ' 对 ' + 盘上.join('、'));
const 旧位置 = ['sh-gen.js', 'sh-wizard.js', 'sh-code.js']
  .filter(n => fs.existsSync(ROOT + 'src/_shared/' + n));
台.判('那三份在老地方（src\\_shared\\）一份不剩', 旧位置.length === 0, 旧位置.join('、'));
/* 词库那两份（sh-banks.js / sh-bank-ui.js）留在 _shared 里两家共用，不跟着进这一棵 ——
   从前这条把 sh-banks.js 也算进"搬走的四份"，那是那一趟没落成的形状；
   插件分离第 5 批搬仓时它归推演定制那一仓，到时候这条跟着改。 */
台.判('词库那两份照旧住在 _shared（这一棵不带它，带了就是两份真身）',
  fs.existsSync(ROOT + 'src/_shared/sh-banks.js') && fs.existsSync(ROOT + 'src/_shared/sh-bank-ui.js'), '');
const 装配 = rd('src/_fd/build.mjs');
/* 第 1 批之后那颗产物不再拼进整页：build.mjs 把它铺进 data\plugins\wnw-custom\，
   开机由加载器照插件清单 kernels 那一点注进来。 */
台.判('装配单不再点那三份源码，那颗产物改成铺进这一家自己那一格',
  !/_shared\/(?:sh-gen|sh-wizard|sh-code)\.js/.test(装配) && /wnw-custom-kernel\.js/.test(装配), 'build.mjs 那一段');
let 新 = false, 话 = '';
try{ execFileSync(process.execPath, [棵 + 'build-kernel.mjs', '--比'], {stdio:'pipe'}); 新 = true; }
catch(e){ 话 = String((e.stderr && String(e.stderr)) || (e.stdout && String(e.stdout)) || e.message).split(/\r?\n/)[0]; }
台.判('盘上那颗产物和这三份源码对得上（改了源码没重跑，就是旧字进页）', 新, 话 || '一致');

/* ---------- 二 · 不套闭包 ---------- */
台.题('二 · 名字照旧落在整页顶层（这一棵和为写不一样的一处）');
const 产物 = fs.readFileSync(棵 + 'wnw-custom-kernel.js', 'utf8');
const 顶层名 = [...产物.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
台.数('产物里顶层声明', 顶层名.length + ' 个');
台.判('产物没被整层闭包包住（去掉开头那段注释，第一句不是 (function）',
  !/^\s*\(function/.test(产物.replace(/^\/\*[\s\S]*?\*\//, '')), 产物.replace(/^\/\*[\s\S]*?\*\//, '').trim().slice(0, 30));
const 该有 = ['GenWizard', 'Gen', 'PackCode'];
台.判('外壳要认的那几个名字都落在顶层（缺一个就是那一处入口点了没动静）',
  该有.every(n => 顶层名.includes(n)), 该有.filter(n => !顶层名.includes(n)).join('、') || '全在');
const 壳 = rd('src/_fd/src/fd3-shell.js');
const 答卷 = rd('src/_fd/src/fd5-load.js');
const 为写 = rd('src/_wnw/src/w3-shell.js');
const 判法 = s => (s.match(/typeof (?:GenWizard|Gen|toolBankWhich)\s*[!=]==?\s*(?:'function'|'undefined')/g) || []).length;
/* 插件分离第 2 批撤了两处：那颗「改代码」（codeEntry）与「插件管理」那一屏上按 Gen / GenWizard 摆的
   两颗导入配方、那张加号卡 —— 外壳里这种「名字在不在」的判法因此从 fd3-shell 挪到了
   宿主交上去的那份答卷（ctx.wcustom 认的就是 GenWizard 在不在）和为写那一屏（导入配方那条还留着）。 */
台.数('三本里那种「名字在不在」的判法', [壳, 答卷, 为写].map(判法).join(' + ') + ' 处');
台.判('判法还在，只是搬了地方：宿主那份答卷认 GenWizard 在不在、为写那一屏认 Gen 在不在（不带内核那一版才不会当场抛）',
  /typeof GenWizard !== 'undefined'/.test(答卷) && /typeof Gen !== 'undefined'/.test(为写), 'fd5-load / w3-shell');
/* 插件分离第 2 批 2.5：「改代码」那枚铅笔、为写停靠上那颗「改代码」、那只编辑对话框一起撤了。
   钉这里是因为这三处都在推演组件定制那一棵的射程里 —— 撤干净没有，界面上会不会又长出一颗。
   判的是"那颗口没人点、那三个字不进界面上的句子"（注释里交代历史不算，所以认带引号的那一种）。 */
const 那颗口 = /[ ](?:codeEntry|PackCode\.open)\s*\(/;
const 那句话 = /'[^'\n]*改代码/;
台.判('两个宿主和那颗编辑对话框里都没有「改代码」这一处入口了',
  !那颗口.test(壳) && !那句话.test(壳)
  && !那颗口.test(rd('src/_wnw/src/w3-shell.js')) && !那句话.test(rd('src/_wnw/src/w3-shell.js'))
  && !那颗口.test(rd('src/_wcustom/src/sh-code.js')) && !那句话.test(rd('src/_wcustom/src/sh-code.js')),
  'fd3-shell / w3-shell / sh-code');

/* ---------- 三 · 这一家包在位 ---------- */
台.题('三 · wnw-custom 这一家在数据层');
const 缺 = ['manifest.json', 'main.js', 'images/icon.svg'].filter(f => !fs.existsSync(包 + f));
台.判('三份一份不缺（插件清单 / 卡 / 自己那张图标）', 缺.length === 0, 缺.join('、') || '齐');
const 说 = JSON.parse(fs.readFileSync(包 + 'manifest.json', 'utf8'));
/* 名单照运行时同一个口径读：data\plugins\off.json 这一份文件不在 = 一家都没卸载（新克隆的那一棵就该这样），
   不许因为读不到这份文件就整台报「缺数据跑不了」（2026-10-15 插件分离第 2 批改的这一手）。 */
let 卸掉的 = [];
try{ 卸掉的 = (JSON.parse(fs.readFileSync(ROOT + 'data/plugins/off.json', 'utf8')).off || []).map(String); }catch(e){}
台.判('插件清单里的 id 就是目录名，界面上叫「推演组件定制」',
  说.id === 'wnw-custom' && 说.name === '推演组件定制', 说.id + ' / ' + 说.name);
/* 「在不在不加载名单里」是他那一格的数据状态，不是代码属性：清完用户数据、或者在「插件管理」里
   把七家都卸掉之后，这张卡本来就不该摆 —— 那种时候这一条没有可判的对象，报一句跳过的原因，
   不许按失败算（2026-10-10 他一句「首次安装就是空的」）。 */
const 卸了 = 卸掉的.includes('wnw-custom');
if(卸了) 台.数('这一条这一趟没判：它在「不加载」名单里（界面上本来就不摆这张卡）', 'off.json 记着 ' + 卸掉的.length + ' 家');
else 台.判('它没被卸掉（卸掉了就没有这张卡，也不该有）', true);
const 卡 = fs.readFileSync(包 + 'main.js', 'utf8');
const 伸手 = ['GenWizard', 'Gen', 'Banks', 'PackCode', 'window.'].filter(n => 卡.includes(n));
台.判('那张卡只吃 ctx，不伸手摸整页顶层那些名字（组件边界这一条不给打洞）',
  伸手.length === 0 && /ctx\.wcustom/.test(卡), 伸手.join('、') || '干净');

/* ---------- 四 · 宿主递出去的那只口 ---------- */
台.题('四 · fd5-load 交下去的 ctx.wcustom（内核在不在、开不开得起来）');
const 答 = rd('src/_fd/src/fd5-load.js');
const 块 = /wcustom:\{[\s\S]*?\n    \}/.exec(答);
if(!块) throw new Error('没在 fd5-load.js 里找到 wcustom 那一段（换了写法，这台要跟着改）');
/* 那句实话从 fd5-load.js 里现读，不在这里抄第二份 —— 抄一份就等于这台子自己量自己写的字，
   宿主改了措辞它照样绿（2026-10-15 插件分离第 1 批改文案时看出的这一手）。 */
const 那句 = /const WCUSTOM_MISSING = '([^']+)'/.exec(答);
if(!那句) throw new Error('没在 fd5-load.js 里读到 WCUSTOM_MISSING 那一句（换了写法，这台要跟着改）');
const 造 = new Function('GenWizard', 'FD_VERSION', 'const WCUSTOM_MISSING = ' + JSON.stringify(那句[1])
  + ';\nreturn ' + 块[0].replace(/^wcustom:/, '') + ';');
const 假内核 = { open(){ 假内核.叫过 = (假内核.叫过 || 0) + 1; }, onSaved:null };
const 有 = 造(假内核, '1.4.0');
有.open(() => {});
台.判('内核在：available 说 true，open 真把那台向导叫起来、回调交到了它手上',
  有.available === true && 假内核.叫过 === 1 && typeof 假内核.onSaved === 'function',
  'available=' + 有.available + ' · 叫了几次=' + 假内核.叫过 + ' · 回调=' + (typeof 假内核.onSaved));
const 没 = 造(undefined, '1.4.0');
台.判('内核不在：available 说 false，open 不抛个 undefined 而是给一句实话（那一句说的是"没读进来"这一件真事，不是"这一版没带某某内核"）',
  没.available === false && /内核没读进来/.test(String(没.version)) && !/这一版|还没拼进/.test(那句[1]),
  'available=' + 没.available + ' · version=' + 没.version);
let 抛 = '';
try{ 没.open(() => {}); }catch(e){ 抛 = e.message; }
台.判('内核不在还硬开：抛的是那一句实话（不是 undefined 那种看不懂的）', /内核没读进来/.test(抛), 抛 || '没抛');
/* 咬口：把 available 那一句判反，干净那一跑该开得起来的必须开不到 */
const 反 = new Function('GenWizard', 'FD_VERSION', 'const WCUSTOM_MISSING = "x";\nreturn '
  + 块[0].replace(/^wcustom:/, '').replace(/typeof GenWizard !== 'undefined'/, "typeof GenWizard === 'undefined'") + ';')(假内核, '1.4.0');
台.判('咬口 · 把「在不在」那一句判反，内核明明在却说没有（反不过说明那一句没承重）',
  反.available === false, 反.available);

台.收尾();
