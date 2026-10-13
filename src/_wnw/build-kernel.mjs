/* 为写内核出包（同步 GitHub 第 4 条 · 2026-10-09 定「为写分离」）
   ------------------------------------------------------------
   从前是宿主那份装配（src\_fd\build.mjs）直接抓 src\_wnw\src\ 那一批源码来拼 ——
   等于公开仓库里必须留着为写的全部源码才打得出一张页。现在分成两趟：
     这一份   私有那一棵自己跑：src\_wnw\src\*.js → src\_wnw\wnw-kernel.js（一层闭包，往外只交 window.WNW_KERNEL）
     宿主那一份  公开这一棵只读那一颗产物，贴进页面，不再认 src\_wnw\src\ 里的任何文件名
   产物那一颗已经进了 .gitignore：仓库里从此没有整包拼好的内核，也没有为写的源码。

   闭包这一层是必需的，不是风格：它自己那批源码之间靠裸全局名互相引用
   （Work / Desk / Overlay / State / Views / Bus / Shell / Theme / h / toast…），
   而宿主外壳里有一批同名不同物的（h / toast / Bus / State / Theme / Shell / Settings /
   Store / DATA_PRE / TOOL_HOST），拼进同一个作用域就撞。关进闭包之后名字只在自己这一层可见，
   天然不撞；往外读宿主顶层那批常量（FD_VERSION 就是其中之一）靠词法作用域，照样读得到。
   所以既不给那几个名字加前缀，也不在这批源码里改名。
   公用的底子（_shared/sh-*.js）由宿主拼一份，这边不拼第二遍。

   用法：node src\_wnw\build-kernel.mjs      （跑一次生成/更新之前先跑它）
         node src\_wnw\build-kernel.mjs --比   （只算不写，和现成那颗比字节，探针用这条） */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const HERE = import.meta.dirname;
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'wnw-kernel.js');
/* 顺序沿用为写自己那份装配单的相对次序 —— 装配那份（w6-boot）排在数据层之后的那一份，
   要的是它交上去的宿主接口先定义好，别自己重排。 */
const PARTS = ['w0-skin.js', 'w1-core.js', 'w2-theme.js', 'w3-shell.js', 'w7-data.js', 'w5-load.js', 'w12-rich.js',
  'w8-write.js', 'w22-web.js', 'w14-num.js', 'w15-hist.js', 'w9-shelf.js', 'w10-cards.js', 'w11-board.js', 'w17-tags.js',
  'w20-keystroke.js',
  'w13-docx.js', 'w16-export.js', 'w6-boot.js'];

function die(msg){ console.error('为写内核出包失败：' + msg); process.exit(1); }
/* 名单和磁盘必须一字不差对上：少一份就是静默少一功能 —— 页面照打，为写开起来缺一块；
   多一份是没搬干净的旧件，同样停在这一趟。 */
const 有 = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(n => n.endsWith('.js')).sort() : [];
const 名单 = PARTS.slice().sort();
const 缺 = 名单.filter(n => 有.indexOf(n) < 0);
const 多 = 有.filter(n => 名单.indexOf(n) < 0);
if(缺.length) die(SRC + ' 里少了名单上那几份：' + 缺.join('、'));
if(多.length) die(SRC + ' 里有名单外的份：' + 多.join('、') + '（要么补进名单，要么搬走）');

let body = '';
for(const p of PARTS){
  const src = fs.readFileSync(path.join(SRC, p), 'utf8');
  try{ new vm.Script(src, { filename:p }); }
  catch(e){ die(p + ' 语法不过：' + e.message); }
  body += src + '\n';
}
const bundle = '/* 为写内核 · 由 src\\_wnw\\build-kernel.mjs 从 src\\_wnw\\src\\ 那 ' + PARTS.length
  + ' 份源码拼出来的一颗产物（私有那一棵的代码，公开仓库不收这一份）。\n'
  + '   别手改这一份，改了下次出包就被盖掉；要改回 src\\_wnw\\src\\ 里改。 */\n'
  + '(function(){\n' + body + '\n})();\n';
try{ new vm.Script(bundle, { filename:'wnw-kernel' }); }
catch(e){ die('整包语法不过：' + e.message); }

if(process.argv.indexOf('--比') >= 0){
  const 现 = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  console.log(现 === bundle ? '内核产物是最新的' : '内核产物落后了（现 ' + Buffer.byteLength(现)
    + ' 字节 / 该有 ' + Buffer.byteLength(bundle) + ' 字节）：跑 node src\\_wnw\\build-kernel.mjs');
  process.exit(现 === bundle ? 0 : 1);
}
fs.writeFileSync(OUT, bundle, 'utf8');
console.log('WROTE ' + OUT + '  ' + Buffer.byteLength(bundle) + ' bytes  ' + PARTS.length + ' 份源码');
