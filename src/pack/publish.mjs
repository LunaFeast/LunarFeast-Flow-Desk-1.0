/* ============================================================
   Flow-Desk 发布：一条命令出三份产物
   ------------------------------------------------------------
     node src/pack/publish.mjs                插件 + 货架清单 + 首装那个 exe（全套）
     node src/pack/publish.mjs --packs        只压包和清单（不动壳，快得多）
     node src/pack/publish.mjs --zip          额外留一份不套壳的 payload zip（自测、看清单用）
     node src/pack/publish.mjs --dry          只报清单和体积，不落盘
     node src/pack/publish.mjs --skip=zzprobe  本地试用的那个包别进发布物（逗号分隔）
     node src/pack/publish.mjs --out=<目录>   产物落到别处（默认 Flow-Desk\dist\tauri）
     node src/pack/publish.mjs --壳件=<目录>  那颗编好的壳住在哪一格（默认取本地登记里的「编译缓存」）

   这一颗只出 Tauri 那一枚壳：桥、命令表、硬地板那份名单都编在 exe 里面，
   没有 Electron 那一份 resources\app 镜像要铺，运行时就是那颗 exe 加旁边那颗加载器。

   出货的东西（插件分离做完的形状：主程序是空壳，插件一家一颗）：
     dist\tauri\<id>.fdpkg                       一家一颗**自有格式**的容器（头 12 字节 + 信息段 + 每一份一块 + 签名段；
                                                 信息段里逐份记路径、字节数与 SHA-256，壳装之前整个查一遍）。
                                                 不出 zip，也不出"压完改个后缀"的假件 —— 后缀那一枚全仓只写在壳里（pack_box.rs）
     dist\tauri\index.json                        货架清单：每家的名字/版本/大小/最低外壳版本/图标/作者来源，页面里挂货架就读它
     dist\tauri\Flow_Desk_setup_<fd>.exe          空壳主程序的首装：Windows 自带的 csc 编出来的小壳 + 粘在屁股后面这一整棵树的出厂内容

   这一棵树里进发布物的、和不进的，口径写死在下面几段：
     进：运行时（那颗 exe 改名叫整棵树唯一的门牌 + WebView2 那颗加载器）、
         pages\ 只带当前这一支号那一张（老版本一张都不带）和非产物文件、
         src\（重新生成页面要用，node_modules 不带）、
         icons\ 与 material\（取 src\pack\ 里出厂那一份，铺到树根同名那一格 —— 运行时只认树根那一层）
     不进：**data\ 底下的一切**（空壳那一棵里没有任何一家的代码 —— 插件分离第 5 批之前那一段放行过
           data\plugins\ 那一层、让本体带着七家一起出门，分离做完这一条收回来了；
           装出来那一格是空的，用户把哪一家的容器放进去才有哪一家。
           还有用户写的书、词库副本、userdata-*、日志、这台机器的 off.json —— 私密，也不该跟着版本走）、
           update\（那是一台机器自己的更新账）、树根现在那两格 icons\ 与 material\（是他自己换过的图，出厂那一份另走一路）、
           老版本的 html（用户那棵树里想留几份留几份，发布物只带当前这一版）
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scan as packScan, writeZip } from '../_build/packs.mjs';
import { 打包 as 打容器, 扩展名 as 容器后缀 } from '../_build/packbox.mjs';
import { assertClean } from '../_build/scan-packs.mjs';
import { 号, 页名 } from '../_build/version.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TREE = process.env.FD_TREE ? path.resolve(process.env.FD_TREE) : path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const has = f => argv.some(a => a === f || a.startsWith(f + '='));
const val = (f, d) => { const a = argv.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : d; };
const DRY = has('--dry');
const PACKS_ONLY = has('--packs') || has('--no-exe');
const KEEP_ZIP = has('--zip');
const SKIP = new Set(val('--skip', '').split(',').map(s => s.trim()).filter(Boolean));
/* ---------- 运行时那一层：只有一颗壳 ----------
   一颗 exe 是整棵树唯一的门牌（为写和声笔输入法练习都在 Flow-Desk 那一张页里就地开，
   发布物里不带它们的独立页面 —— 要重新生成页面的机器自己跑 node src/_fd/build.mjs），
   旁边配 WebView2 那颗加载器。没有 locales，也没有 resources\app 那一层：
   桥、命令表、硬地板那份名单都编在 exe 里面（page_cmds 那句 include_str!），
   铺一份进去就是留第二份真身，「改了源码忘铺镜像」那种账又会回来。 */
let 编译缓存 = '';
try{ 编译缓存 = (await import('../tools/本地路径.mjs')).编译缓存 || ''; }catch(e){}
const 壳目录 = (() => {
  const 指 = val('--壳件', '');
  if(指) return path.resolve(指);
  if(!编译缓存) throw new Error('没登记「编译缓存」那格（src\\tools\\本地路径），不知道那颗 exe 在哪 —— 用 --壳件=<那一格> 指一下');
  return path.join(编译缓存, 'flowdesk', 'x86_64-pc-windows-gnu', 'release');
})();
/* 三层名字跟着生成页面那把尺：树里可能还是没改完名的老样子 */
const pickL = list => { for(const p of list){ if(fs.existsSync(p)) return p; } return list[0]; };
const PAGES = pickL([path.join(TREE, 'pages'), path.join(TREE, '页面')]);
const DATA = pickL([path.join(TREE, 'data'), path.join(TREE, '数据')]);
const PACKS_DIR = path.join(DATA, 'plugins');
/* 产物那一格叫 dist\tauri\ —— 这一棵只剩这一颗壳，这一层名先留着：
   动它要跟着动「收旧版本」那一块与屏上读产物的那几处，不在这趟顺手改 */
const OUT_DIR = path.resolve(val('--out', path.join(TREE, 'dist', 'tauri')));
const EXE_NAME = 'Flow-Desk.exe';
/* ---------- 产物文件名上那一段"这是哪一种包"的字（他 2026-10-14 点的：两种包在文件名上要分得开；
   这种字样只许待在文件名里，装出去的那一棵里一个字都不许出现 —— 原话与理由记在 docs\进度看板.md 10:05 那一节）----------
   --setup-tag=full 只改这一个东西：落在产物那一格里的那一个 exe 叫什么。
     Flow_Desk_setup_1.0.0-alpha+build.32561a7.exe            ← 没给这一段（主版本那条链打出来的，名字跟从前一模一样）
     Flow_Desk_setup_full_1.0.0-alpha+build.bfe759d.exe       ← 给的是 full（从本地集成分支那一棵打出来的那一枚）
   树里的每一份文件、安装说明那一份、flow-desk-install.json、货架那份清单的正文，一个字都不因为这枚而变 ——
   装好之后软件里读不到任何这类字样（这一条已经钉在 gate-forward46 第五节：这类字样一进发布那一层就红）。
   名字只收小写字母数字与 - _，最长 16 字：这一段是拼进文件名里的，不收怪字符（也不许拿它往路径里钻）。 */
const 名段 = (() => {
  const s = String(val('--setup-tag', '')).trim();
  if(!s) return '';
  if(!/^[a-z0-9][a-z0-9_-]{0,15}$/.test(s))
    throw new Error('--setup-tag 只收小写字母、数字、- 和 _，开头是字母或数字，最长 16 字（现在给的是「' + s + '」）');
  return s; })();
const setup名 = 号 => 'Flow_Desk_setup_' + (名段 ? 名段 + '_' : '') + 号 + '.exe';

/* ---------- 走目录、比版本号大小：这一份发布脚本到处在用。号本身从 _build/version.mjs 取，见下面 ---------- */
function walk(dir, base){
  const out = [];
  base = base || '';
  for(const e of fs.readdirSync(dir, { withFileTypes: true })){
    const rel = base ? base + '/' + e.name : e.name;
    if(e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}
function cmpVer(a, b){ for(let i = 0; i < Math.max(a.length, b.length); i++){ const d = (a[i] || 0) - (b[i] || 0); if(d) return d; } return 0; }
/* 比大小只比 +build 之前那一段：短哈希不参与排序，它只负责认「是哪一笔提交」 */
function verNum(raw){ return String(raw).split('+')[0].split(/[^\d]+/).filter(Boolean).map(Number); }
/* 只有 Flow-Desk 这一个版本号：为写和声笔输入法练习的代码都拼在这一张页里，各自不再出独立页面。
   号只有一处真身（src\_build\version.mjs）—— 这一趟不再「从 pages\ 里挑号最大的那一张」：
   号从 1.4.0-dev 回跳到 1.0.0-alpha 之后，「最大」会挑回那张旧页，发布物就带着上上个版本出门了。 */
const VER = { fd: 号() };
const 当前页 = 页名(VER.fd);
if(!fs.existsSync(path.join(PAGES, 当前页)))
  throw new Error('pages\\ 里没有当前这一支号的页（' + 当前页 + '）—— 先跑 node src\\_fd\\build.mjs 生成，再来打包');
/* 每一家插件的版本由发布脚本传进来（各仓自己那一笔的短哈希那一串，见 src\_build\release.mjs）。
   插件清单里那一格 version 是老版本 —— 打包这一趟不写它也不取它（他 2026-10-10 定）。
   没传这一格（本地自己跑 publish 看清单）就照插件清单那一格摆。 */
const 递来的家 = (() => {
  const raw = String(process.env.FD_PLUGINS || '').trim();
  if(!raw) return null;
  try{ return JSON.parse(raw); }
  catch(e){ throw new Error('FD_PLUGINS 传进来的不是合法 JSON：' + e.message); }
})();

/* 当前这一支号那一张进发布物，其余老版本都不带 */
function superseded(rel){
  if(!/\.html$/.test(rel)) return false;
  const n = rel.split('/').pop();
  return /^Flow_Desk_/.test(n) && n !== 当前页;
}

/* ---------- 这一棵树里哪些文件进发布物 ---------- */
const files = new Map();      /* 包内路径（/ 分隔）→ 磁盘路径 */
const made = new Map();       /* 现生成的那几份：包内路径 → Buffer */
function addLayer(pre, dir, skip){
  if(!fs.existsSync(dir)) throw new Error('没有这一层：' + dir);
  for(const rel of walk(dir)){
    if(skip && skip(rel)) continue;
    files.set(pre + rel, path.join(dir, ...rel.split('/')));
  }
}
const inNodeModules = rel => rel.split('/').includes('node_modules');
/* ---------- 开发那一层不带走（2026-10-14 他量出来的）----------
   装出去的那一棵里当时躺着：src\tools\ 整格 110 份（探针、自查、audit、start-fd.bat、那台小助手 text-icon.bat）
   与 src\_build\ 里推送发布那一摊（pr.mjs / release.mjs / text-icon.mjs / text-icon.html / push-list.mjs /
   public-scan.mjs / plugin-repos.mjs / forward-features.mjs / ico-index.mjs / packs.mjs）。
   这些是"做这个程序"用的，不是程序本身，也不是给用户的东西。名单只写这一处，闸读这一份（gate-tauripublish46 第七节）。
   2026-10-16 第 3 批 3.3 乙往这一摊里加一颗 packbox.mjs —— 自有容器那颗打包手。它进这一层是硬要求，不是顺手：
   打包那颗只在发布环节用，用户侧任何界面、任何工具都不许有"把一个包另存成压好的包 / 加密包"的口（插件分离规划第八节）。 */
export const 开发层 = [
  /^tools\//,
  /^_build\/(plugin-repos|pr|release|text-icon|push-list|public-scan|forward-features|ico-index|packs|packbox|pack-repo)\.(mjs|html)$/,
];
const 是开发层 = rel => 开发层.some(打 => 打.test(rel));
/* 没进版本的一律不带走：这台自己的位置记在 src\tools\ 底下那一颗不进仓的路径表里（ Rust 与那几格素材、工区、
   存档都写在那一份上），它本来就靠 .gitignore 挡在仓外 —— 可从前这一层是照着**盘上**走的，
   所以 2026-10-14 量到它跟着 setup 出了门。现在这一层只认「这一棵里被版本管着的那几份」；
   问不出 git 就当场停，不拿"照盘上走"兜底（宁可不装这一枚，也不带一台的私货出门）。 */
const 进版本 = (() => {
  let 出 = '';
  try{ 出 = execFileSync('git', ['-C', TREE, 'ls-files', '-z'], { encoding:'utf8' }); }
  catch(e){ throw new Error('问不出这一棵里哪些份进了版本（git ls-files 没跑成）：' + String((e && (e.stderr || e.message)) || e) +
    '\n  src 这一层不照盘上走了 —— 从前就是这么把 src\\tools\\本地路径.cjs 装进发布物的。'); }
  return new Set(String(出).split('\0').filter(Boolean).map(s => s.split(path.sep).join('/')));
})();

/* 一、运行时那一层：编出来的那颗 exe（进包改名成整棵树唯一的门牌）+ WebView2 那颗加载器 */
{
  const 件 = path.join(壳目录, 'flowdesk.exe'), 加载器 = path.join(壳目录, 'WebView2Loader.dll');
  if(!fs.existsSync(件)) throw new Error('那颗壳没编出来：' + 件 + ' —— 先跑 node src\\_tauri\\build.mjs');
  if(!fs.existsSync(加载器)) throw new Error('那颗壳旁边没有 WebView2 的加载器：' + 加载器);
  files.set(EXE_NAME, 件);
  files.set('WebView2Loader.dll', 加载器);
}
/* 二、页面层：当前这一支号那一张页 */
addLayer('pages/', PAGES, rel => superseded(rel));
/* 三、源码：重新生成页面要读的（node_modules 一个字节都不带 —— 生成页面只用 node 自带模块）。
   两道闸：开发那一层不带走（上面 开发层 那份名单）、没进版本的一律不带走（这台的位置就住在这一类里）。 */
addLayer('src/', path.join(TREE, 'src'), rel => inNodeModules(rel) || /(^|\/)\.[^/]/.test(rel) || 是开发层(rel) || !进版本.has('src/' + rel));
/* 四、图标与随包素材那两格：取的是出厂那一份（src\pack\icons\、src\pack\material\），铺到树根同名那一格。
   运行时只认树根这一层 —— 图标那张表（info_cmds 收 icons\ 顶上与往下一层子格）、
   页面里 material/textures\ 那些相对地址，都从 <树根>\ 取；少了这两层，图标那一屏是空的、内置纹理取不到。
   树根现在那一格不直接取：里面是他自己换过的图，出厂那一份才跟着版本走（覆盖升级也不盖他的，见 sfx 的 KeepUserFile）。 */
addLayer('icons/', path.join(TREE, 'src', 'pack', 'icons'));
addLayer('material/', path.join(TREE, 'src', 'pack', 'material'));
/* 五、插件：**不进这一棵树**（主程序那一枚是空壳）。
   这一段从前铺的是 data\plugins\<id>\（外46 起七家跟着本体一起出门，他 2026-10-10 定"取消发布物零插件"）；
   插件分离第 5 批做完，形状回到第一版讨论就定的那一条 —— 装出来那一格是空的，
   一家一颗自有格式的容器与那颗 setup 一起摆在产物那一格，用户要哪一家放哪一颗。
   再往前还铺过一格「原版」（data\plugins-factory\，给那颗「恢复出厂」取用）—— 第 2 批 2.5 撤了那颗钮、2.6 整格撤了。
   卸没卸过那一格（off.json）也不进包 —— 那是每台机器自己的状态，不在发布物里带。 */
/* 出货之前再过一遍越界这道门（和两个构建同一把尺）：货架上发的源码是要给别人看的，
   组件和主程序之间只能有接口调用，不能有内部耦合。 */
if(!assertClean(PACKS_DIR, '发插件')){ console.error('插件越界没清完，publish 停下。'); process.exit(1); }
const packs = packScan(PACKS_DIR).filter(p => !SKIP.has(p.id));

/* ---------- 货架：一家一颗自有格式的容器（不是 zip 改后缀）----------
   容器那一套的格式与那份规格同源（src\_build\packbox.mjs 与 src\_tauri\src\core\pack_box.rs）：
   头 12 字节 + 信息段 + 每一份一块 + 签名段，信息段里逐份记路径、字节数与 SHA-256 ——
   壳那一头装之前整个查一遍，改一个字节就对不上（第 3 批那一整批定的就是这个）。
   zip 那一档从前是"运输件"，本体的那一棵树与它一起出门；插件分离做完之后主程序是空壳，
   出货只走自有格式这一条道，不再摆一份 zip 让人以为是两种东西。 */
/* 一个包里有哪些件（名字 → 字节）：压容器取这一里 */
function 包内件(p, 用了号){
  const m = p.manifest;
  const names = Array.from(p.files.keys()).sort();
  if(!names.includes('manifest.json')) throw new Error('包 ' + p.id + ' 里没有 manifest.json');
  const entries = names.map(name => ({
    name,
    /* 插件清单按发布这一趟重序列化一遍：字段顺序、缩进都定下来，压出来的包字节可复现；
       版本号这一格换成发布脚本传进来的那一个 —— 源码里那一格是人手写的，不动它就永远老在原地，
       用户导入之后在「关于」里看到的就是上一个号。 */
    data: name === 'manifest.json'
      ? Buffer.from(JSON.stringify(Object.assign({}, m, { version: 用了号 }), null, 2) + '\n', 'utf8')
      : p.files.get(name)
  }));
  return entries;
}
const shelf = [];
if(!DRY) fs.mkdirSync(OUT_DIR, { recursive: true });
for(const p of packs){
  if(p.error) continue;
  const m = p.manifest;
  /* 发布脚本传进来的那一家自己的那一串优先；没传（单独跑 publish）才退回插件清单那一格 */
  const 出 = (递来的家 && 递来的家[m.id] && 递来的家[m.id].version) || m.version;
  const 件 = 包内件(p, 出);
  /* 自有格式那一颗容器：信息段那六个必填键 + 逐份的路径、字节数、SHA-256 都在里面（壳装之前整个查一遍） */
  const 容 = 打容器(件.map(e => ({ 路径: e.name, 字节: e.data })), {
    id: m.id, name: m.name, version: 出, min_shell: m.minShell || '0',
    author: m.author || '', source: m.source || '',
    kernels: Array.isArray(m.kernels) && m.kernels.length ? m.kernels.map(String) : undefined
  }, 0);
  shelf.push({
    id: m.id, name: m.name, desc: m.desc || '',
    version: 出,
    author: m.author || '', source: m.source || '', icon: m.icon || '',
    host: m.host || ['fd'], order: m.order || 100, minShell: m.minShell || '0',
    file: m.id + '.' + 容器后缀(),
    bytes: 容.字节.length, size: (容.字节.length / 1024).toFixed(1) + ' KB',
    bank: m.bank || null, sharedKeys: m.sharedKeys || [], dataKeys: m.dataKeys || [], kvKeys: m.kvKeys || [],
    /* 这个包自己带的随行文件（监听脚本、桥插件那种），货架上照着摆，用户才知道装它要多拿几份 */
    assets: m.assets || {},
    files: 容.信息.files.map(f => f.path)
  });
  /* 容器落在产物那一格里，一家一颗；**不铺进首装那棵树** —— 主程序那一枚是空壳，
     装出来插件那一格是空的，要哪一家由用户把那一颗容器放进去（第 5 批定的形状）。 */
  if(!DRY) fs.writeFileSync(path.join(OUT_DIR, m.id + '.' + 容器后缀()), 容.字节);
}
shelf.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
const minShell = shelf.reduce((a, x) => (!a || cmpVer(verNum(x.minShell), verNum(a)) > 0 ? x.minShell : a), '') || VER.fd;
const index = {
  kind: 'flow-desk-shelf',
  made: new Date().toISOString(),
  shell: { fd: VER.fd, minShell: minShell, engine: 'tauri' },
  setup: { file: setup名(VER.fd), bytes: 0, size: '' },
  packs: shelf,
  note: '货架清单：与主程序同一格摆着的那几颗 <id>.' + 容器后缀() + ' 是一家一颗的插件容器（自有格式，不是 zip 改的后缀），导入用；'
    + 'setup 那一个是**空壳**主程序的首装树（树里一家的代码都没有）。data\\ 里的用户内容从不参与发布。'
};

/* ---------- 树根上现生成的两份：给人看的说明 + 给壳读的那个标记 ---------- */
/* 首装那个窗口顶上那一行是「那句系列话 + 这一趟的号」拼的：系列话（「Flow-Desk 便携版」）住在
   src\pack\sfx.cs 那一格（他 2026-10-13 定：窗口上的字也要在「界面文字」那一页改得动），
   这一格只往标记里记号 —— 记成整句的话，窗口上那句系列字就有一份不在扫描那几棵树里。 */
const label = VER.fd;
made.set('flow-desk-install.json', Buffer.from(JSON.stringify({
  kind: 'flow-desk-tree', label: label, made: new Date().toISOString(),
  versions: VER, packs: shelf.map(p => p.id),
  /* 每一家插件这一趟带的是哪一串号、它要的外壳最低是哪一号（发布脚本传进来的，不取插件清单那一格） */
  plugins: shelf.map(p => ({ id:p.id, name:p.name, version:p.version, 兼容外壳:p.minShell })),
  note: '这一棵树是首装摊出来的：整文件夹删掉就算卸载，不写注册表。**主程序那一枚是空壳** —— 树里没有任何一家的代码，装出来 data\\plugins\\ 是空的；'
    + '这一趟一起出货的 ' + shelf.length + ' 家放在旁边那一格里，一家一颗自有格式的容器（.' + 容器后缀() + '），要哪一家就把哪一颗放进 data\\plugins\\。'
    + '换新版本再双击一颗新的 setup 指到同一棵就是覆盖升级（你放进去的那几颗不动）。'
}, null, 2) + '\n', 'utf8'));
made.set('安装说明.txt', Buffer.from([
  'Flow-Desk · 便携版（首装）',
  '========================================',
  '',
  '双击 Flow-Desk.exe 就开，不用安装。窗口里用的是系统自带的网页控件（WebView2 Runtime，Windows 10 / 11 一般已经带着；缺它会在启动那一句里说清楚）。',
  '整个文件夹可以随便改名、挪到别的盘、拷到别的电脑：程序和用户数据分两层放着，路径全按这个文件夹的相对位置找。',
  '',
  '  pages\\    程序读的那一张页面（换新版本见下面「更新」）',
  '  data\\     你自己长出来的东西，更新永远不会碰这一层：',
  '            <书名>\\（正文和它的历史快照）、plugins\\（你装的插件）、',
  '            <包名>-bank\\（组件自带的词库）、logs\\（运行日志）',
  '  update\\   覆盖升级那一摊自己待着的那一格（旧版本不留备份，这一格里只有它自己的账）',
  '  src\\      Flow-Desk 自己的源码：只有改了它才需要重新生成页面（功能模块不在这里，装卸不用这一趟）',
  '',
  '主程序这一枚是空壳（第一版讨论就定的那一条）：装完打开，桌面是空的，data\\plugins\\ 那一格里一家都没有。',
  '要哪一家就放哪一家 —— 这一趟一起出货的 ' + shelf.length + ' 家，一家一颗自有格式的容器（.' + 容器后缀() + '），都在产物那一格旁边的 plugins\\ 小格里（一颗的名字带着自己那一号）：',
  '  ' + shelf.map(p => p.id + '.' + 容器后缀() + '（' + p.name + '）').join('、'),
  '放进去有两条路：',
  '  顶栏的「插件管理」→ 按「安装」，挑那颗容器（壳会先把里面每一份的字节数与校验数整个查一遍，对不上就一个字节不落）；',
  '  或者直接把那颗容器丢进 data\\plugins\\，重启一次软件就认（当场摊开成解开的样子，摊完那颗容器自己删掉 —— 这一格里只留文件夹那一种）。',
  '已经装着的那一家要换新版：把新的那颗丢进同一格，重启后软件提一句「有 N 家等着更新」，在「插件管理」那一行点「更新」就把那一格换成包里的内容（你写的东西在 数据\\userdata-fd\\，这一趟不碰）。',
  '插件的代码不在程序里改：要换回早先那一份，把自己手里那一个包重装一次。',
  '这一屏上四颗动作：安装（放进路径）· 加载（请进使用页）· 卸载（从使用页撤下来）· 删除（连文件一起清掉）。',
  '  卸载 = 下一次开机不再加载它那一份代码（改名单 + 刷新这一页），包留在路径里；勾选「同步清除数据」才会连它存的词库和记录一起清。',
  '  每一个组件跑的就是 data\\plugins\\<它>\\main.js。',
  '',
  '更新：还是用这一颗 —— 下载新的 Flow_Desk_setup_<版本号>.exe，双击它、把目录指到这一棵上，点「覆盖升级」。',
  '它不留旧版本备份：新的一份直接摊进来，摊完把 src\\ 那一层里这一包没带的散文件清掉（那一格里没有你写的东西），',
  'pages\\ 只换这一个包里带的那几个名 —— 你放在那一格里的稿子原地不动；data\\ 从头到尾一个字节不碰。',
  '这一棵正开着的时候它一个字节都不动，会让你先退干净（右下角托盘图标上右键 → 退出）。',
  '插件包只有一种：自有格式那一颗（.' + 容器后缀() + '，一个文件带齐插件清单、代码与每一份的校验数）。不再出 zip，也不出"压完改个后缀"的那种假件。',
  '',
  '图标：icons\\FD_Icon.png、WNW_Icon.png、RP_Icon.png，想换成自己的图就用同名正方形 PNG（256×256 起）覆盖它，重启后换成你的图。',
  '这一份发布物只带 Flow-Desk.exe 一个：写作和练习是从 FD 的启动卡里开的，页面跟着 pages\\ 走。',
  '',
  'MusicBee 的监听：它本体不往系统的媒体控件写东西，得给它装一个插件。',
  '  关掉 MusicBee，把 data\\plugins\\music-remote\\mb_FlowDesk.dll 拷到 <MusicBee>\\Plugins\\（同名就覆盖），再开 MusicBee。',
  '  音乐遥控器的卡片上也有那个「装插件」的钮。',
  '',
  '卸载：把整个 Flow-Desk 文件夹删掉就行，它不写注册表。',
  ''
].join('\r\n'), 'utf8'));

/* ---------- 一道硬闸：data\ 底下一个字节都不进（主程序那一枚是空壳）----------
   插件分离第 5 批之前那一段放行过 data\plugins\ 那一层（本体带着七家一起出门）。
   分离做完的形状是第一版讨论就定下的那一条：**主程序 = 空壳** —— 那一棵里没有任何一家的代码，
   装出来插件那一格是空的，用户把哪一家的容器放进去才有哪一家（规划第五节那五步）。
   所以放行那一串现在是空的：用户写的书、词库副本、userdata-*、日志、这台机器卸没卸过的 off.json，
   以及任何一家的代码 —— 进一个字节就当场停下。 */
{
  const 全部 = [...files.keys(), ...made.keys()];
  const dirty = 全部.filter(k => k === 'data' || k.startsWith('data/'));
  if(dirty.length){
    console.error('首装那棵树里出现了数据层的格子（主程序那一枚是空壳，一个字节都不许带）：\n  ' + dirty.slice(0, 12).join('\n  '));
    process.exit(1);
  }
  /* 反向再钉一条：货架上那几家一颗容器都没少（少一家就是有人放不进插件路径） */
  const 少 = packs.filter(p => !p.error && !shelf.some(s => s.id === p.id));
  if(少.length){ console.error('货架上少了那几家：' + 少.map(p => p.id).join('、')); process.exit(1); }
  console.log('  data\\ 那道闸过了：' + 全部.length + ' 份路径里一落在 data\\ 底下的都没有（空壳）· 货架 ' + shelf.length + ' 家各一颗容器');
}

/* ---------- 体积先看一眼：整包里最肥的是那个 200MB 的 exe，不划算就别真打 ---------- */
let n = 0, bytes = 0;
for(const abs of files.values()){ n++; bytes += fs.statSync(abs).size; }
for(const buf of made.values()){ n++; bytes += buf.length; }
const packBytes = shelf.reduce((s, p) => s + p.bytes, 0);
console.log('发布清单：一棵树 ' + n + ' 个文件 · 展开 ' + (bytes / 1048576).toFixed(1) + 'MB' +
  ' · 货架 ' + shelf.length + ' 个包 · ' + (packBytes / 1024).toFixed(1) + ' KB');
/* 顶层每一格几个文件：少一格就是装完那棵树缺东西（icons\ 空 = 图标那一屏没图，material\ 空 = 内置纹理取不到） */
{
  const 格 = {};
  for(const k of [...files.keys(), ...made.keys()]){ const 顶 = k.split('/')[0]; 格[顶] = (格[顶] || 0) + 1; }
  console.log('  顶层每一格：' + Object.entries(格).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · '));
}
console.log('  版本 ' + JSON.stringify(VER) + ' · 最低外壳 ' + minShell);
console.log('  产物在 ' + OUT_DIR);
if(DRY){
  /* --json：把这一包里每一份的路径原样吐出来，给检查脚本对账用。
     为什么要有这一档：dist\\ 那一格不许谁去翻（发布产物不是核对面），
     所以"这一包里到底有什么"由发布脚本自己报，而不是打完再去读那个包。 */
  if(has('--json')) console.log('MANIFEST ' + JSON.stringify([...files.keys(), ...made.keys()].sort()));
  /* 名字先报出来：那一段档位的字只进这里，屏上与终端在没落盘的那一趟就看得见最终文件名（包里每一份的路径不受它影响） */
  console.log('  首装那颗的文件名：' + setup名(VER.fd));
  console.log('（没落盘）' + (PACKS_ONLY ? '' : ' · 首装那个 = 壳 + 这一棵树的 zip，约 ' + (bytes / 1048576).toFixed(1) + 'MB 展开'));
  for(const p of shelf) console.log('  ' + p.id.padEnd(16) + (p.name + '').padEnd(12) + p.size.padStart(10) + ' · ' + p.host.join('/') + ' · ' + p.author + '/' + p.source);
  process.exit(0);
}

/* ---------- zip：整棵树那一包，边算边写，别把 200MB 的 exe 在内存里翻两份 ---------- */
const CRC = (() => { const t = new Int32Array(256);
  for(let i = 0; i < 256; i++){ let c = i; for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[i] = c; }
  return t; })();
function crc32(u){ let c = -1; for(let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function dosTime(d){ return (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1); }
function dosDate(d){ return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(); }
/* 大二进制压不动也不划算（那个 exe 自己就是压缩过的东西），按 1 档走个形式；其余 6 档 */
function levelOf(name, size){ return size > 20 * 1048576 ? 1 : 6; }

/* 写一整包：entries 里每项 { name, abs | buf }，落到 fd 的当前位置，返回写出的字节数 */
function writeZipTo(fd, entries){
  let off = 0; const central = [];
  for(const e of entries){
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = e.buf ? e.buf : fs.readFileSync(e.abs);
    const packed = zlib.deflateRawSync(raw, { level: levelOf(e.name, raw.length) });
    const crc = crc32(raw);
    const st = e.buf ? null : fs.statSync(e.abs);
    const when = (st && st.mtime) || new Date();
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt16LE(dosTime(when), 10); lh.writeUInt16LE(dosDate(when), 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(packed.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    fs.writeSync(fd, lh); fs.writeSync(fd, nameBuf); fs.writeSync(fd, packed);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(dosTime(when), 12); ch.writeUInt16LE(dosDate(when), 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(packed.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(off, 42);
    central.push(Buffer.concat([ch, nameBuf]));
    off += 30 + nameBuf.length + packed.length;
    if(off >= 0xFFFFFFFF) throw new Error('这一包超过 4GB，zip32 装不下：减点东西再发');
  }
  let cdSize = 0;
  for(const c of central){ fs.writeSync(fd, c); cdSize += c.length; }
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(central.length, 8); eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(cdSize, 12); eocd.writeUInt32LE(off, 16);
  fs.writeSync(fd, eocd);
  return off + cdSize + 22;
}

/* 条目排个定序：先树里读来的（按包内路径），再现生成的，同一路径不重复 */
const entries = [];
for(const [name, abs] of [...files].sort((a, b) => a[0] < b[0] ? -1 : 1)) entries.push({ name, abs });
for(const [name, buf] of [...made].sort((a, b) => a[0] < b[0] ? -1 : 1)){
  const i = entries.findIndex(e => e.name === name);
  if(i >= 0) entries.splice(i, 1);
  entries.push({ name, buf });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const TAG = VER.fd;
const tmp = path.join(OUT_DIR, '.payload-' + TAG + '.zip');
const zf = fs.openSync(tmp, 'w');
const zBytes = writeZipTo(zf, entries);
fs.closeSync(zf);
console.log('  树那一包 ' + (zBytes / 1048576).toFixed(1) + 'MB · ' + entries.length + ' 个文件（展开 ' + (bytes / 1048576).toFixed(1) + 'MB）');

if(KEEP_ZIP){
  const keep = path.join(OUT_DIR, 'Flow_Desk_payload_' + TAG + '.zip');
  fs.copyFileSync(tmp, keep);
  console.log('  不套壳那一份 ' + keep);
}
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');

/* ---------- 首装那个：壳（Windows 自带的 csc 现编，比 sfx.cs 旧才重编）+ 粘在后面的这一包 ---------- */
if(PACKS_ONLY){
  fs.rmSync(tmp, { force: true });
  console.log('写了 dist\\plugins\\*.zip 和 dist\\index.json（--packs：没出首装那个）');
  process.exit(0);
}
const CS = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const CS32 = 'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe';
const csc = fs.existsSync(CS) ? CS : fs.existsSync(CS32) ? CS32 : null;
const stubSrc = path.join(HERE, 'sfx.cs');
const stub = path.join(HERE, 'sfx-stub.exe');
if(!csc){
  console.log('  ! 这台机器没有 csc.exe（.NET Framework 4 自带的那个编译器），首装那个没出 —— 树那一包留在 dist\\Flow_Desk_payload_*.zip，加 --zip 就留住它');
  if(!KEEP_ZIP) fs.renameSync(tmp, path.join(OUT_DIR, 'Flow_Desk_payload_' + TAG + '.zip'));
  process.exit(0);
}
if(!fs.existsSync(stub) || fs.statSync(stub).mtimeMs < fs.statSync(stubSrc).mtimeMs){
  console.log('  编首装壳 sfx-stub.exe …');
  execFileSync(csc, ['-nologo', '-target:winexe', '-out:' + stub,
    '-r:System.Windows.Forms.dll', '-r:System.Drawing.dll', stubSrc], { cwd: HERE, stdio: 'pipe' });
}
const out = path.join(OUT_DIR, setup名(TAG));
const wfd = fs.openSync(out, 'w');
const stubBuf = fs.readFileSync(stub);
fs.writeSync(wfd, stubBuf);
/* 壳从末尾往回找 EOCD，再按目录里写的偏移倒推出这包从第几字节开始，所以前面垫多少都成 */
const rfd = fs.openSync(tmp, 'r');
const buf = Buffer.alloc(4 * 1048576);
let r, copied = 0;
while((r = fs.readSync(rfd, buf, 0, buf.length)) > 0){ fs.writeSync(wfd, buf, 0, r); copied += r; }
fs.closeSync(rfd); fs.closeSync(wfd);
fs.rmSync(tmp, { force: true });
if(!KEEP_ZIP) fs.rmSync(path.join(OUT_DIR, 'Flow_Desk_payload_' + TAG + '.zip'), { force: true });
index.setup.bytes = fs.statSync(out).size;
index.setup.size = (index.setup.bytes / 1048576).toFixed(1) + ' MB';
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('WROTE ' + out);
console.log('  壳 ' + (stubBuf.length / 1024).toFixed(0) + 'KB + 树 ' + (copied / 1048576).toFixed(1) + 'MB = ' + index.setup.size);
/* 那两格落在哪一格，按实际的产物格说 —— 原先写死「dist\」，产物出到 dist\tauri\ 时这句话就是假的 */
console.log('  货架 ' + shelf.length + ' 颗容器就在 ' + OUT_DIR + ' 这一格里（一家一颗 <id>.' + 容器后缀() + '）· 清单 ' + path.join(OUT_DIR, 'index.json'));
console.log('  主程序那一枚是空壳：树里 ' + 'data\\plugins\\ 一家的代码都没铺，装出来那一格是空的，容器由用户自己放进去');
