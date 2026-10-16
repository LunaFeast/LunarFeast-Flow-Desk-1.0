/* FD 组装：只拼外壳骨架 —— 插件代码不进产物。
   功能住在 data\plugins\<id>\，页面开机由加载器（_shared/sh-load.js）现名单、现 import；
   哪几家不加载归 off.json 说了算，构建这边不再认名单、不再拼段、不再打插件清单表。
   （发布侧的 zip / 货架仍然由 _build/packs.mjs 那把尺打包 —— 那是运输形状，不是产物内容。） */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { icodeEmbed } from '../_vendor/icode/embed.mjs';
import tree from '../_build/tree.cjs';
import { assertClean } from '../_build/scan-packs.mjs';
import uitext from '../pack/uitext.cjs';
import { 铺图标一层, 铺素材一层 } from '../_build/ico-dump.mjs';
import { 根列表 } from '../_build/邻居.mjs';
uitext.设邻居(根列表().slice(1));   /* 界面文字这本清单还得覆盖搬走的那几家：句子写回它自己那一棵那一份 */

import { 号, 页名 } from '../_build/version.mjs';
import { PACK_RENAME } from '../_build/pack-rename.mjs';

const ROOT = path.resolve(import.meta.dirname);
/* 源码定在 Flow-Desk\src\_fd\ 下面，生成页面进 pages\、插件住在 data\plugins（第 15 条）：
   全按相对位置找，整个 Flow-Desk 文件夹挪盘、拷到别的电脑，生成页面的路径跟着走 */
const TREE = tree(ROOT);
const OUT_DIR = TREE.pages;
/* 版本号：真身在 src\_build\version.json（前两段），build 那一段是打包那一刻所在仓的 HEAD 短哈希 ——
   由打包脚本用环境变量 FD_BUILD 传进来，没传就地问一次 git。这一趟一个字都不往版本格里写：
   先 commit → 拿短哈希 → 号传进打包 → 生成页面，顺序不能反（反了号和提交就对不上）。
   产物文件名带的就是这一串号，出包、更新标记、页面里显示的那一份都从它取，别再在别处写死第二串。 */
const 版 = 号();
const OUT = path.join(OUT_DIR, 页名(版));
/* 机械门槛：插件越界扫描。插件代码不再拼进产物，但它和外壳跑在同一个页面里 ——
   ES module 只藏住插件自己的顶层名字，宿主的经典脚本全局名（Store/Shell/Cover/Bus…）在模块里照样看得见，
   所以「组件只走 ctx」得由这把尺来查（禁用名表和该走的通道都在 _build/scan-packs.mjs）。
   放在最前面：先查组件再干活，越界就别生成这一版页面。 */
if(!assertClean(path.join(TREE.data, 'plugins'), '生成 Flow-Desk 页面')) process.exit(1);
/* 下面这些是外壳的骨架，一个功能都不带：存储、桌面、标题栏、设置面板、注册表、
   配色/词库/代码编辑器这些公用的底子，加上组件加载器那一半（sh-load + fd5-load 的宿主答卷）。
   从前这里还拼着一份 _shared/sh-rime.js（解析小企鹅 weasel 配色那台）：件-9 整条撤下 Rime 配色，
   它跟着从构建里摘掉，文件本身搬进 备份\2026-10-05-撤Rime配色\，没有直接删。
   fd8-tools.js 是中立工具的 FD 侧适配，必须排在 _shared/ 那几段前面；
   fd5-load.js 排在 fd8 之后：它要交上去的 DATA_PRE / ToolKv 都在那儿定义；
   从前这里还排着一颗 fd7-help.js，为的是帮助文档能在启动流程跑起来之前挂到顶栏 —— 文档整份撤了（外44 六），它跟着摘掉 */
/* 歌词解析不再拼在这儿：插件分离第 4 批 4.7 拆成各家一份（为写在 _wnw/src/w18-ttml.js，
   音乐遥控器在自己那一格里 ttml.js），两边对账靠 src/tools/probes/gate-lyric46.mjs。
   这一句说明写在名单外头：gate-concat 那台是从「const parts」那个开方括号往后切到收方括号，
   注释写在里面会被它当成一份文件去读，那一台就当"缺数据"哑掉了（2026-10-16 栽过一次）。 */
const parts = ['../_shared/sh-rand.js','../_shared/sh-store.js','../_shared/sh-packs.js','../_shared/sh-load.js','../_shared/sh-color.js','../_shared/sh-ico.js','../_shared/sh-font.js','fd2-store.js','fd3-shell.js','fd3-lib.js','fd11-cards.js','fd12-rime-colors.js','fd13-colour-v1.js','fd9-title.js','fd4-builtin.js','fd8-tools.js','fd5-load.js',
  '../_shared/sh-style.js','../_shared/sh-look.js','../_shared/sh-doc.js',
  '../_shared/sh-mus.js','../_shared/sh-gens.js',
  '../_shared/sh-icode.js',
  '../_shared/sh-log.js'];
/* 词库那两份（sh-banks / sh-bank-ui）不再拼在这儿：插件分离第 4 批 4.6 归进推演定制那一棵，
   跟着那颗产物注入。宿主读它的两处都带"这个名字在不在"的守卫，那一棵没加载就是没有词库这件事（#30）。
   这句说明写在名单外头 —— gate-concat 那台从「const parts」的开方括号切到收方括号，注释写在里面会被它当一份文件读。 */

/* boot 排最后：加载器、注册表、外壳底子都站好了才开机 */
const BOOT = 'fd6-boot.js';

/* ---------- 内核不进这一趟（插件分离第 5 批：一家一仓）----------
   为写、推演组件定制、声笔输入法练习那三颗内核，产物与源码都在各家自己那一仓里，
   由那一仓自己的 `出包.mjs` 第一步现出、第二步压成容器；开机时加载器（_shared/sh-load.js）
   按装进 data\plugins\ 的那一份插件清单里 kernels 那一格注进来。
   主程序这一棵既没有它们的源码，也不再往那一格里铺产物 —— 这一趟只出页面那一张。 */

/* 全页唯一的一串号和那一张改名表：写在最前面，后面每一段（含为写、声笔练习那两层闭包）
   往外读到的都是这一份。用 var 不用 const —— 拼进同一个作用域的段里万一有同名声明，
   var 顶多重置，const 直接报错。 */
let js = '\n/* ==== 版本号 · 真身在 src\\_build\\version.json，这一趟生成写进来，别处不再抄一份 ==== */\n'
  + 'var FD_VERSION = ' + JSON.stringify(版) + ';\n'
  + '/* ==== 包 id 改名那一张表 · 真身在 src\\_build\\pack-rename.mjs，桌面搬家和 node 那头共用同一份 ==== */\n'
  + 'var PACK_RENAME = ' + JSON.stringify(PACK_RENAME) + ';\n';
/* 批⑤-6 · 界面文字清单：构建时把 数据\ui-text.yaml 跟着源码刷新一遍（已经写进源码的那几句自动回到「原句」那一栏）。
   这一份产物里从来不嵌，程序运行时也不读它 —— 它是「GitHub 版本资源助手」那一屏的工作台：
   在那里填一句 → 写回源码那一份 → 重跑下面这三趟 → 界面上就是新句子（2026-10-13 方案甲）。 */
uitext.refresh(TREE.tree);
/* 树根 icons\ 那一格：程序和开发服务器扫的是它（一个名字一张图）。出厂那一格里不是线稿的那几份
   （FD_Icon.png、索引.txt）照同名补过去，他换过的图不动 —— 新克隆的一棵跑这一趟就齐了。 */
{ const 图 = 铺图标一层(TREE.tree);
  console.log('图标：出厂 ' + 图.出厂 + ' 张重画 · 树根 icons\\ 补了 ' + 图.补上 + ' 张，保住他改过的 ' + 图.保住 + ' 张'); }
/* 随包素材那一层（material\ 底下那几张纹理）：页面写的是相对地址 material/文件名，
   本地协议按树根去找，所以这一格要落在树根底下；已有的不覆盖（他自己换的图不被这一趟吃掉）。
   写盘收在 ico-dump 那一颗里，这一趟自己不直接写树根那两格。 */
{ const 素 = 铺素材一层(TREE.tree);
  console.log('随包素材：树根 material\\ 补了 ' + 素.补上 + ' 张，保住他换过的 ' + 素.保住 + ' 张'); }
function add(name, src){
  try{ new vm.Script(src, { filename:name }); }
  catch(e){ console.error('SYNTAX FAIL ' + name + ': ' + e.message); process.exit(1); }
  js += '\n/* ==== ' + name + ' ==== */\n' + src;
}
/* 内置代码编辑器的运行时和样式：打进 window.ICODE_SRC，第一次真用到才塞进 <head>
   （见 _shared/sh-icode.js）。 */
add('icode-src', icodeEmbed());
for(const p of parts) add(p, fs.readFileSync(p.startsWith('../') ? path.join(ROOT, p) : path.join(ROOT, 'src', p), 'utf8'));
/* 内核不铺了（插件分离第 5 批）：那三颗住在各家自己那一仓，由那一仓的 出包.mjs 现出。 */
add(BOOT, fs.readFileSync(path.join(ROOT, 'src', BOOT), 'utf8'));

const tpl = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
if(!tpl.includes('/*__FD__*/')){ console.error('模板缺少 /*__FD__*/ 占位'); process.exit(1); }
/* 回调用函数形式：源码里出现 $& 之类的串不会被当成替换模式 */
const html = tpl.replace('/*__FD__*/', () => js);
try{ new vm.Script(js, { filename:'fd-bundle' }); }catch(e){ console.error('BUNDLE FAIL ' + e.message); process.exit(1); }
fs.mkdirSync(OUT_DIR, { recursive:true });
fs.writeFileSync(OUT, html, 'utf8');
/* 号不烧、不记：这一串就是「当前提交」，同一笔提交再生成一次还是同一个文件名（覆盖那一张）。 */
console.log('SYNTAX OK');
/* 组件这一段不再进产物：开机从 data\plugins\ 加载，名单归运行时认 */
console.log('插件 · 运行时加载（构建不拼段）：' + path.join(TREE.data, 'plugins'));
console.log('WROTE ' + OUT + '  ' + Buffer.byteLength(html) + ' bytes  ' + html.split('\n').length + ' lines');
