/* 铺树根那两格随包件（图标 / 素材）。出厂那一份都住在 src\pack\ 底下，而程序与页面读的是树根那一格。
   图标这一格由线稿现画，一个名字一个文件：
     1) src\pack\icons\     出厂默认（跟着代码走，改代码就重画，装到机器上带的就是这一格那一份）
     2) 树根 icons\         给他换图的那一层：只补没有的，他自己改过的那张绝不动
   素材那一格不画，照同名搬：src\pack\material\ → 树根 material\（页面写的是相对地址，本地协议按树根去找）。
   node src/_build/ico-dump.mjs              出厂全按代码重画，树根那两格只补缺
   node src/_build/ico-dump.mjs --force      两处都重画（树根那层他改过的会被覆盖）
   代码里那份 ICO_D 只是浏览器直接打开单文件时的兜底，真正改图改的是 icons\ 里的文件。
   ----------
   树根那一格为什么要有：程序（壳与开发服务器那台）扫的是 <树根>\icons 与 <树根>\material ——
   界面上那些图标、托盘与 exe 上那三张正经图（FD_Icon.png 那种）、打开文件夹就能看的 索引.txt、
   那几张随包纹理，都从这两格取。所以这一趟除了画线稿，把出厂那一格里**不是线稿画出来的**那几份
   （png、索引）也照同名补过去。
   从前这两格是出 Electron 包那一趟顺手铺的；这一棵只剩这一颗壳，铺的活儿就落回这一颗 ——
   生成页面那一趟（src\_fd\build.mjs）叫它一次，新克隆的一棵跑一遍生成就齐了。
   写盘都收在这一颗里：生成那一趟自己不直接写树根那两格（test-dataround 钉着 build.mjs 往磁盘写的
   目标只有产物那两颗，书的文件不在它射程里）。 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import treeOf from './tree.cjs';

const force = process.argv.includes('--force');

/* 从共享模块里把 ICO_D 抠出来：整份文件在沙箱里跑一遍，只认这一个常量 */
function 线稿(){
  const 树 = treeOf(import.meta.dirname).tree;
  const src = fs.readFileSync(path.join(树, 'src/_shared/sh-ico.js'), 'utf8');
  const m = /const ICO_D = (\{[\s\S]*?\n\});/.exec(src);
  if(!m) throw new Error('没在 sh-ico.js 里找到 ICO_D');
  return { 树, ICO_D: vm.runInContext('(' + m[1] + ')', vm.createContext({})) };
}

/* 铺一层：出厂那一格按代码重画，树根那一格只补缺（--force 才两处都重画）。回三个数。 */
export function 铺图标一层(在){
  const { 树, ICO_D } = 线稿();
  const 根 = 在 ? path.resolve(在) : 树;
  const FACTORY = path.join(根, 'src', 'pack', 'icons');
  const LIVE = path.join(根, 'icons');
  fs.mkdirSync(FACTORY, { recursive:true });
  fs.mkdirSync(LIVE, { recursive:true });
  let fac = 0, live = 0, kept = 0;
  for(const name of Object.keys(ICO_D)){
    /* 独立成图时 currentColor 就是黑：写死 #000，遮罩只看 alpha，别留悬案 */
    const body = ICO_D[name].replace(/stroke="currentColor"/g, 'stroke="#000"');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="#000" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>\n';
    const fp = path.join(FACTORY, name + '.svg');
    fs.writeFileSync(fp, svg); fac++;
    const lp = path.join(LIVE, name + '.svg');
    if(fs.existsSync(lp) && !force){ kept++; continue; }
    fs.writeFileSync(lp, svg); live++;
  }
  /* 出厂那一格里不是线稿画出来的那几份（png 那三张、索引.txt）：照同名补进树根，已有的不动 */
  for(const 件 of fs.readdirSync(FACTORY)){
    if(Object.keys(ICO_D).includes(件.replace(/\.svg$/, ''))) continue;
    const lp = path.join(LIVE, 件);
    if(fs.existsSync(lp) && !force){ kept++; continue; }
    fs.copyFileSync(path.join(FACTORY, 件), lp); live++;
  }
  return { 树: 根, 出厂: fac, 补上: live, 保住: kept, 名字: Object.keys(ICO_D).length };
}

/* 素材那一格（随包纹理那几张）：照同名从 src\pack\material 搬到树根 material\，已有的不动 ——
   这一格他也能自己换图，换过的不能被生成那一趟吃掉。回 { 补上, 保住 }。 */
export function 铺素材一层(在){
  const 树 = treeOf(import.meta.dirname).tree;
  const 根 = 在 ? path.resolve(在) : 树;
  const 从 = path.join(根, 'src', 'pack', 'material'), 到 = path.join(根, 'material');
  let 补 = 0, 保 = 0;
  const 走 = (a, b) => {
    fs.mkdirSync(b, { recursive:true });
    for(const e of fs.readdirSync(a, { withFileTypes:true })){
      const s = path.join(a, e.name), d = path.join(b, e.name);
      if(e.isDirectory()){ 走(s, d); continue; }
      if(fs.existsSync(d)){ 保++; continue; }
      fs.copyFileSync(s, d); 补++;
    }
  };
  if(fs.existsSync(从)) 走(从, 到);
  return { 树: 根, 补上: 补, 保住: 保 };
}

if(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])){
  const r = 铺图标一层();
  const 素 = 铺素材一层(r.树);
  console.log('出厂 src\\pack\\icons\\ 重画 ' + r.出厂 + ' 张 · 树根 icons\\ 补了 ' + r.补上 +
    ' 张，保住他改过的 ' + r.保住 + ' 张 · 线稿 ' + r.名字 + ' 个名字 · 那一棵：' + r.树);
  console.log('随包素材：树根 material\\ 补了 ' + 素.补上 + ' 张，保住他换过的 ' + 素.保住 + ' 张');
}
