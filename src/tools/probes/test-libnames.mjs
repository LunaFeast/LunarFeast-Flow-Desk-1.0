/* 库文件名两道闸对账（外29 色卡那一整轮的真 bug 抓出来的）
   页面里每多一份「用户能改、要落盘」的库文件，要在两处登记：壳里 `src\_tauri\src\core\data_path.rs` 的 库名单、
   开发服务器 `src\_fd\fd-serve.mjs` 的 LIB_NAMES。漏一处的表现很难看：界面上改得动、
   报一句「存不进文件：只认这几份库文件」、重启就没了 —— 色卡那一份 cards.yaml 就是漏登记过一整轮。
   这台不改代码，只做一件事：把页面里真走这条通道的名字数出来，跟两道闸逐条比，并且咬三口确认比得动。 */
import fs from 'node:fs';
import { ROOT, rd, 尺在, 记账 } from './lib-slice.mjs';

const R = 记账('test-libnames');
const 壳 = rd('src/_tauri/src/core/data_path.rs');
const 壳颗 = rd('src/_tauri/src/tauri_bind/data_cmds.rs');
const SERVE = rd('src/_fd/fd-serve.mjs');
const 页面 = {
  'fd11-cards.js': rd('src/_fd/src/fd11-cards.js'),
  'fd3-lib.js': rd('src/_fd/src/fd3-lib.js'),
  'fd3-shell.js': rd('src/_fd/src/fd3-shell.js'),
  /* 推演组件定制那一份源码住在它自己那条分支上：这一棵上没有就不数它，
     「名字要在两处登记」那条规矩对它在那一条分支上照样量（那一条分支上这一份就在） */
  ...(ROOT && 尺在('src/_wcustom/src/sh-gen.js') ? { 'sh-gen.js': rd('src/_wcustom/src/sh-gen.js') } : {})
};

/* 名单：两处各是一份数组字面量，从源码里原样端出来（壳里那一本按 Rust 的字面量抽，服务器那一本按 JS 的抽） */
function 闸(文, 哪一道){
  const m = /const LIB_NAMES = \[([^\]]*)\]/.exec(文) || /pub const 库名单: \[&str; \d+\] = \[([\s\S]*?)\];/.exec(文);
  if(!m) throw new Error('切不到名单：' + 哪一道);
  return (m[1].match(/'[^']+'|"[^"]+"/g) || []).map(s => s.slice(1, -1));
}
/* 页面要走的名字：一颗顶层常量指着某个文件名，而那个常量名真被喂进了库文件通道
   （LibStore.fetchRaw / putRaw / later，或 A.libRead / A.libWrite / '/_lib?name='）。
   只认「真走这条通道」的：appearance.json 那种走 Store.loadJSON 的不算，硬要它登记就是发明规矩。 */
function 要(页们){
  const 通道 = /LibStore\.(?:fetchRaw|putRaw|later)\(|A\.lib(?:Read|Write)\(|'\/_lib\?name='/;
  const 出 = new Set();
  for(const 文 of Object.values(页们)){
    for(const m of 文.matchAll(/^const ([A-Z_0-9]+_FILE) = '([^']+\.(?:yaml|json))';/gm)){
      const [, 名, 值] = m;
      /* 这一颗常量出现的那几行里，只要有一处真把它喂进了库文件通道，就算「页面要的一份」 */
      for(const u of 文.matchAll(new RegExp('[\\s\\S]{0,120}' + 名 + '[\\s\\S]{0,120}', 'g'))) if(通道.test(u[0])) 出.add(值);
    }
  }
  return [...出].sort();
}

const 壳闸 = 闸(壳, '壳里那一本'), 服闸 = 闸(SERVE, '开发服务器'), 页面要 = 要(页面);

R.题('一、页面里真走库文件通道的那几个名字（先数清楚有几份）');
R.判('数得到名字，而且不是数漏了才显得对得上（色卡那一份必须在这串里）',
  页面要.length >= 4 && 页面要.includes('cards.yaml'), 页面要);
/* 待实现清单（lib-pending.json）那一格是推演组件定制那一家写的，它的源码住在自己那条分支上。
   这一棵上没有那一家，就把这一格单独钉住：两道闸里必须在册（那条分支合回来当场就要存得下去），
   而页面里此刻没人写它。这一条形同白名单，只此一名 —— 别的名字敢「没人写却在册」，当场红。 */
const 分支上才写的 = 尺在('src/_wcustom/src/sh-gen.js') ? [] : ['lib-pending.json'];
R.判('一份文件只指一个名字：四份库文件各管一件事（色卡两套 / 外观方案 / 图片库 / 待实现清单）',
  ['cards.yaml', 'palettes.yaml', 'looks.yaml', 'images.yaml', 'lib-pending.json']
    .every(n => 页面要.includes(n) || 分支上才写的.includes(n)), 页面要);

R.题('二、两道闸跟这串名字逐条比');
R.判('壳里那道闸认全了页面要的每一份（漏一份就是程序里存不下去）',
  页面要.every(n => 壳闸.includes(n)), { 页面要, 壳闸 });
R.判('开发服务器那道闸认全了页面要的每一份（漏一份就是开发浏览器里存不下去、程序里存得下去，两套真相）',
  页面要.every(n => 服闸.includes(n)), { 页面要, 服闸 });
R.判('色卡那一份 cards.yaml 两边都在册（外29 那一轮两处都漏了，界面上报「存不进文件」）',
  壳闸.includes('cards.yaml') && 服闸.includes('cards.yaml'), { 壳闸, 服闸 });
R.判('两道闸一字不差（同一条尺：壳里那一本是准，服务器那一本跟着它）',
  壳闸.join(',') === 服闸.join(','), { 壳闸, 服闸 });
R.判('闸里不许养着页面里没人写的名字（多一条就是废旧，将来读它的、写它的对不上）—— 只放行那一格跟着分支走的',
  壳闸.every(n => 页面要.includes(n) || 分支上才写的.includes(n)), 壳闸.filter(n => !页面要.includes(n) && !分支上才写的.includes(n)));
R.判('那一格「跟着分支走」的名单自己也得钉住：既然这一棵上没那一家，它就必须还在两道闸里（合回来当场存得下去）',
  分支上才写的.every(n => 壳闸.includes(n) && 服闸.includes(n)), 分支上才写的);

R.题('三、读那一路吃的是同一道闸（读写两条都得认，否则开机读不到、又拿「文件不存在」当空盖掉用户攒的）');
R.判('lib:read 和 lib:write 都拿 库名在册 拦（那一颗吃的就是 库名单），没另开第二张名单',
  /pub fn lib_read/.test(壳颗) && /pub fn lib_write/.test(壳颗)
  && (壳颗.match(/库名在册\(/g) || []).length === 2 && !壳颗.includes('LIB_NAMES'));
R.判('读不到（ok:false）跟文件确实空着（交回空串）在页面那头是两种返回值，不许混（混了会把只含预设的那一份盖到用户攒的那些上面）',
  /if\(!r \|\| r\.ok === false\) return null;/.test(页面['fd3-lib.js']), '');

R.题('四、接线钉：色卡这一摊的存盘走的是那颗通道，不是另写一份文件');
R.判('色卡改名、删一个、挑中的存成一组之后都要喊 persist（当场落盘那一趟）',
  /persist\(\)\{ if\(this\.ready\) LibStore\.later\(CARD_FILE, this\.text\(\)\); \}/.test(页面['fd11-cards.js']), '');
R.判('开发页面上那条写通道报回来的错要当面说出来（toast「存不进文件：…」），不许悄悄吞（吞了就没人发现闸漏了名字）',
  /toast\('存不进文件：'/.test(页面['fd3-lib.js']), '');
R.判('名单加一份要两边各改一次的这句提醒写在两处源码里（漏登记的人得在源头撞见它）',
  /test-libnames\.mjs/.test(壳) && /test-libnames\.mjs/.test(SERVE), '');

R.题('五、咬口（确认这些判法真咬得住）');
{
  const 壳文 = 壳.replace(/pub const 库名单: \[&str; 5\] = \[[\s\S]*?\];/,
    'pub const 库名单: [&str; 4] = [\n    "palettes.yaml",\n    "looks.yaml",\n    "lib-pending.json",\n    "images.yaml",\n];');
  const 摘主 = 闸(壳文, '咬口一那一份改过的名单');
  R.判('咬口一：把壳里那份名单改回漏登记色卡之前的样子 → 三条判法当场失效（这一段是逐字改源码再重抽，不是改数组自己玩）',
    壳闸.length === 5 && 摘主.length === 4 &&
    !(页面要.every(n => 摘主.includes(n)) && 摘主.join(',') === 服闸.join(',') && 摘主.includes('cards.yaml')), 摘主);

  const 服文 = SERVE.replace(/const LIB_NAMES = \[[^\]]*\]/, "const LIB_NAMES = ['palettes.yaml', 'looks.yaml', 'lib-pending.json', 'images.yaml']");
  const 摘服 = 闸(服文, '咬口二那一份改过的名单');
  R.判('咬口二：只把开发服务器那一份改回漏登记的样子 → 「两套真相」那条当场失效，但壳里那条照样过（正是外29 那一轮的真形状）',
    页面要.every(n => 壳闸.includes(n)) && !页面要.every(n => 摘服.includes(n)) && 壳闸.join(',') !== 摘服.join(','), 摘服);

  const 页2 = Object.assign({}, 页面, { 'fd11-cards.js': 页面['fd11-cards.js']
    .replace("const CARD_FILE = 'cards.yaml';", "const CARD_FILE = 'cards-v2.yaml';") });
  const 要2 = 要(页2);
  R.判('咬口三：页面里新增一份没登记的文件 → 「两道闸认全了」当场失效（这条盯的是下一个新功能重犯）',
    要2.includes('cards-v2.yaml') && !壳闸.every(n => 要2.includes(n)) && !服闸.every(n => 要2.includes(n)), 要2);

  const 养废 = [...壳闸, 'ghost.yaml'];
  R.判('咬口四：闸里多出一条页面里没人写的名字 → 「不许养着废旧」那条当场失效',
    !养废.every(n => 页面要.includes(n)), 养废.filter(n => !页面要.includes(n)));
}

R.数('页面要走库文件通道的名字', 页面要);
R.数('壳里那道闸', 壳闸);
R.数('开发服务器那道闸', 服闸);
R.收尾();
