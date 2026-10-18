/* 外30 己组：「改软件全部页面文字」那台小工具（src\pack\uitext.cjs）的复账。
   这一台只读不写：不碰他那份活的 data\ui-text.yaml（清单本身我已经照他点的跑过一趟刷新了），
   断的是三件他点名的事 ——
   ① 出处那一栏不许再出现光秃秃的文件名（fd3-lib / w0-skin / w18-lyric / w19-cruise / sh-look / sh-mus / sh-ttml，
      加这一批新添的 backup.cjs）；
   ② 这一批新加的界面话（定期备份那一块、挑正文自由选字那一框、倍速那一档）扫得到；
   ③ 他写在冒号右边的字不会因为重扫被吃掉（render → parse 在内存里对一遍）；
   外加一条防将来：.mjs 那道口子是量过才关的，五棵源码树里该扫的一份不漏。 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { 根列表 } from '../../_build/邻居.mjs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, 记账, rd, lsd } from './lib-slice.mjs';
import { fileURLToPath as __url } from 'node:url';

const __树根 = __url(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');   /* 仓根从这份脚本自己的位置算，不写死本机路径 */

const require = createRequire(import.meta.url);
const U = require(__树根 + '/src/pack/uitext.cjs');
/* 这一台是「自己另走一遍树」的复账，所以它也得会问邻居：先问本仓，本仓没有才问隔壁那一棵。
   邻居名单不抄第二本账，拿 src\_build\邻居.mjs 现算；相对路径按它自己那一棵切。 */
function 那格(根, 相){
  const 拆 = String(相).split('/').filter(Boolean);
  for(const 一 of [根, ...根列表().slice(1)]){ const 全 = path.join(一, ...拆); if(fs.existsSync(全)) return { 全, 根: 一 }; }
  return { 全: path.join(根, ...拆), 根 };
}
U.设邻居(根列表().slice(1));   /* 一家一仓之后那几家的源码在隔壁那一棵：这本清单还得覆盖它们（句子写回说话那一份） */
const Z = 记账('test-uitool');
const TREE = U.TREE;

Z.题('一、出处那一栏的名字都起齐了');
const 文件 = U.listFiles(TREE);
const dyn = U.settingPages(Object.fromEntries(文件.map(rel => [rel, rd(rel)])));
const packs = U.packNames(TREE);
const 裸名 = 文件.map(rel => ({ rel, page:U.pageOf(rel, '', dyn, packs).page }))
  .filter(x => /\.(js|cjs|mjs|html)$/.test(x.page)).map(x => x.rel + ' → ' + x.page);
Z.判('1 每一份被扫的文件都认得出「哪一页的中文名」：出处栏里一个裸文件名都没有（新加文件忘了起名就当场报）',
  裸名.length === 0, 裸名);
const 要点名 = {
  'src/_fd/src/fd3-lib.js':'三份库文件', 'src/_wnw/src/w0-skin.js':'皮肤与骨架',
  'src/_wnw/src/w18-lyric.js':'词格', 'src/_wnw/src/w19-cruise.js':'词巡航',
  'src/_shared/sh-look.js':'外观这一层', 'src/_shared/sh-mus.js':'播放进度那一条桥',
  'src/_wnw/src/w18-ttml.js':'歌词时间尺', 'src/pack/backup.cjs':'定期备份'
};
const 缺 = Object.entries(要点名).filter(([rel, 中]) => {
  const p = U.pageOf(rel, '', dyn, packs).page;
  return !p.includes(中);
}).map(([rel, 中]) => rel + ' 该含「' + 中 + '」，实际「' + U.pageOf(rel, '', dyn, packs).page + '」');
Z.判('2 那八份的名字一条条对得上（不是有个兜底的问号混过去就算过）', 缺.length === 0, 缺);
Z.判('3 八份里每一份确实被列进扫描名单（名字起对了、文件却没扫，等于白起）',
  Object.keys(要点名).every(rel => 文件.includes(rel)), 文件.filter(x => /backup|w0-skin|sh-mus/.test(x)));

Z.题('四、五棵源码树该扫的一份不漏，那道口关得有理');
{
  /* 自己另走一遍树（不叫小工具带路），把该扫的列出来和它的名单对 */
  const 收 = [];
  const 跳 = ['node_modules','images','userdata-fd','userdata-wnw','userdata-rp','logs','plugin','dist','tools','_build'];
  const walk = (d, 根 = TREE) => { for(const e of fs.readdirSync(d, { withFileTypes:true })){
    if(e.isDirectory()){ if(跳.includes(e.name)) continue; walk(path.join(d, e.name), 根); }
    else if(/\.(js|cjs)$/.test(e.name) && !/\.code\.js$/.test(e.name)) 收.push(path.relative(根, path.join(d, e.name)).replace(/\\/g,'/'));
  } };
  for(const d of ['src/pack','src/_fd','src/_wnw','src/_shared','data/plugins']){ const 格 = 那格(TREE, d); walk(格.全, 格.根); }
  const 该扫 = 收.filter(x => !/uitext\.cjs|(^|\/)(wnw-kernel|wnw-custom-kernel|rp-kernel)\.js$/.test(x));
  const 漏 = 该扫.filter(x => !文件.includes(x));
  Z.判('4 五棵树里每一份 .js / .cjs 都进了扫描名单（除了界面文字那台生成器自己和为写内核那颗产物）：漏一份就是那一页的字进不了清单',
    漏.length === 0, 漏);
  /* 为写内核那颗是产物不是源码（同步 GitHub 第 4 条：src\_wnw\src\ 那一批拼出来的一份复制，
     .gitignore 已经关了它）—— 扫它等于把同一批字抄第二遍，所以两头都要指名排掉：
     名单里没有它、扫描那一头写着排它。份数不写死（2026-10-12 可拆性整理一家一家往上添，写死一次红一次）：
     磁盘上那一批、内核装配名单上那一批、扫描名单里那一批，三批一字不差才对得上。 */
  const 扫描 = rd('src/pack/uitext.cjs');
  const 装配名单 = (rd('src/_wnw/build-kernel.mjs')
    .match(/const PARTS = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g) || []).map(s => s.slice(1, -1)).sort();
  const 源码份 = lsd('src/_wnw/src').filter(n => /.js$/.test(n)).sort();
  const 扫到的 = 文件.filter(x => x.startsWith('src/_wnw/src/')).map(x => x.slice('src/_wnw/src/'.length)).sort();
  Z.判('4b 为写内核那颗产物不在扫描名单里，uitext 那一头写着排它，磁盘 / 装配名单 / 扫描名单三份一字不差',
    !文件.includes('src/_wnw/wnw-kernel.js')
    && /SKIP_NAME = new Set\(\[[^\]]*'wnw-kernel\.js'/.test(扫描)
    && 装配名单.length > 0 && String(源码份) === String(装配名单) && String(扫到的) === String(装配名单),
    '磁盘 ' + 源码份.length + ' 份 · 装配 ' + 装配名单.length + ' 份 · 扫到 ' + 扫到的.length + ' 份 · 差在：'
      + [源码份.filter(x => !装配名单.includes(x)), 装配名单.filter(x => !源码份.includes(x)),
         装配名单.filter(x => !扫到的.includes(x)), 扫到的.filter(x => !装配名单.includes(x))]
        .flat().join('、'));
  const mjs = [];
  const walk2 = (d, 根 = TREE) => { for(const e of fs.readdirSync(d, { withFileTypes:true })){
    const p = path.join(d, e.name);
    if(e.isDirectory()){ if(跳.includes(e.name) || e.name === '备份' || e.name === 'dist' || e.name === 'update') continue; walk2(p, 根); }
    else if(/\.mjs$/.test(e.name)) mjs.push(path.relative(根, p).replace(/\\/g,'/'));
  } };
  for(const d of ['src/pack','src/_fd','src/_wnw','src/_shared']){ const 格 = 那格(TREE, d); walk2(格.全, 格.根); }
  const 界面上的话 = mjs.filter(rel => { try{ return /\btoast\(/.test(rd(rel)); }catch(e){ return false; } });
  Z.判('5 「只认 .js / .cjs」这一刀是量过的：这几份 .mjs 全是敲命令行跑的构建脚本，一句往界面上说的话都没有' +
    '（份数不写死 —— 加一颗少一颗都改一次数字，写死一次红一次）',
    mjs.length >= 5 && 界面上的话.length === 0, { mjs, 界面上的话 });
  Z.判('6 自检台（src/tools/）压根不在射程里：清单里不该混进断言句子',
    !文件.some(x => x.startsWith('src/tools/')));
}

Z.题('二、这一批新加的界面话扫得到');
{
  let occ = [];
  for(const rel of 文件){
    const t = rd(rel);
    try{ occ = occ.concat(/\.html$/.test(rel) ? U.scanHtml(rel, t, packs) : U.scanJs(rel, t, dyn, packs)); }
    catch(e){ Z.判('! 扫不动 ' + rel, false, e.message); }
  }
  const 有 = s => occ.filter(o => o.text.includes(s)).map(o => o.rel + ':' + o.line + ' · ' + U.pageOf(o.rel, o.fn, dyn, packs).page);
  const 新句 = ['立刻抄一份', '收进关联', '开这一档', '倍速', '这一处已经收过了', '还没挂正文', '整段收了进来', '再加一处文件夹', '立刻抄一份'];
  const 缺句 = [...new Set(新句)].filter(s => 有(s).length === 0);
  Z.判('7 这一批新摆的那几句全在名单里（写了却不进清单，等于他改不到）', 缺句.length === 0, 缺句);
  /* 只挑界面上真会露面的那几句（往备份清单文件里写的那几行不算界面话，不归这一档管） */
  const 备份句 = ['这一份没收住', '还没定备份到哪一个文件夹', '抄了 {1} 个文件', '备份的落点跑在'];
  const 落页 = 备份句.map(s => { const o = occ.find(x => x.text.includes(s)); return o ? U.pageOf(o.rel, o.fn, dyn, packs).page : '找不到'; });
  Z.判('8 那几句界面上说的话都归到「定期备份」那一档（Electron 那一头与壳那一头各一页，两处都算认上；不许是问号、裸文件名、找不到）',
    落页.every(p => /^定期备份/.test(p)), 落页);
  const 跨 = occ.filter(o => /跨 \{1\} 段/.test(o.text));
  Z.判('9 带数那一句（跨 {1} 段）认成了带槽的一条，不是把花括号当字抄进去',
    跨.length >= 1 && 跨.every(o => o.slots >= 1), 跨.map(o => [o.text, o.slots]));
  const 问号 = occ.filter(o => { const p = U.pageOf(o.rel, o.fn, dyn, packs); return p.page === '?' || !p.page; });
  Z.判('10 扫出来的每一处都说得出「哪个程序的哪一页」（出处栏一个问号不留）',
    问号.length === 0, 问号.slice(0, 4).map(o => o.rel + ':' + o.line));
  Z.数('扫到多少处', occ.length);
}

Z.题('三、他写的字不会被重扫吃掉（内存里对一遍，不碰他那份活清单）');
{
  const 处 = (rel, line) => [{ rel, line, pieces:[{ off:0, len:5, q:'str' }], slots:0, why:'' }];
  const gs = [
    { prog:'Flow-Desk', page:'定期备份', text:'立刻抄一份', fn:'', pos:'按钮', at:处('src/pack/backup.cjs', 1) },
    { prog:'Flow-Desk', page:'定期备份', text:'抄了 {1} 个文件', fn:'', pos:'按钮', slots:1, at:处('src/pack/backup.cjs', 2) } ];
  gs[1].at = [{ rel:'src/pack/backup.cjs', line:2, pieces:[{ off:0, len:6, q:'str' }], slots:1, why:'' }];
  const 底 = U.render(gs, []);
  Z.判('11 清单形状没跑：段首是「程序 · 页」，底下每行两格缩进、冒号左边是原话',
    /^\nFlow-Desk · 定期备份:\n {2}立刻抄一份:\n {2}"抄了 \{1\} 个文件":|^\nFlow-Desk · 定期备份:\n {2}立刻抄一份:\n {2}抄了 \{1\} 个文件:/m.test(底),
    底.split('\n').filter(l => l.includes('备份') || l.includes('抄')).slice(0, 4));
  const 改了 = 底.replace('  立刻抄一份:', '  立刻抄一份: 现在就去抄');
  const 读回 = U.parse(改了);
  const 那行 = 读回.find(r => r.from === '立刻抄一份');
  Z.判('12 他写在冒号右边的字读得回来（from = 原话、to = 他要的字、哪一页也认得出）',
    那行 && 那行.to === '现在就去抄' && 那行.page === '定期备份', 那行);
  const 没改 = 读回.find(r => r.from === '抄了 {1} 个文件');
  Z.判('13 冒号右边空着 = 沿用原话：读回来是空串，不算改动也不报错',
    没改 && 没改.to === '' && 没改.del === false, 没改);
  const 再扫 = U.render(gs, 读回);
  Z.判('14 重扫一份新清单：他改过的那一句原样带着（不是整份重排把右边抹平）',
    再扫.includes('立刻抄一份: 现在就去抄') && 再扫.includes('抄了 {1} 个文件'),
    再扫.split('\n').filter(l => l.includes('立刻抄一份')));
  const 掉了 = U.render([{ prog:'Flow-Desk', page:'定期备份', text:'断开目录', fn:'', pos:'按钮', at:处('x', 9) }], 读回);
  Z.判('15 源码里认不到的一句（功能卸了、原话改了名）不删他的字：照样打出来，认回来还回到原来那一段',
    掉了.includes('立刻抄一份') && 掉了.includes('现在就去抄'), 掉了.split('\n').filter(l => l.trim()).slice(-4));
  const 不要 = U.parse('Flow-Desk · 定期备份:\n  立刻抄一份: ""\n  抄了 {1} 个文件:');
  Z.判('16 「这句不要了」和「没改」分得开：一对空引号读回来是 del=true，空着是 del=false',
    不要.find(r => r.from === '立刻抄一份').del === true
    && 不要.find(r => r.from === '抄了 {1} 个文件').del === false, 不要);
  Z.判('17 打了出去又读得回来：字里带冒号、井号、引号那几句裹上引号也不串位', (() => {
    const 怪 = [{ prog:'Flow-Desk', page:'定期备份', text:'备份：# 一份 "抄" 的字', fn:'', pos:'按钮', at:处('x', 1) }];
    const r = U.parse(U.render(怪, []));
    return r.length === 1 && r[0].from === '备份：# 一份 "抄" 的字' && r[0].page === '定期备份';
  })());
  Z.判('18 写坏的行只坏那一行：冒号都没有的那一行跳过，其余照常读', (() => {
    const r = U.parse('Flow-Desk · 定期备份:\n  这一行没有冒号\n  立刻抄一份: 现在就去抄');
    return r.length === 1 && r[0].from === '立刻抄一份';
  })());
}

Z.题('五、拼接式不许越过本句的末尾（外32 图7 踩出来的那一条）');
{
  const 扫 = 码 => U.scanJs('src/_wnw/src/w0-样例.js', 码, dyn, packs);
  const 真句 = "const selName = (main, sides) => sideName(main) + ' · 关系：' + sortSides(sides).map(sideName).join('、');\n"
    + "const 后 = toast('后面那一句还在不在');";
  const 得 = 扫(真句);
  Z.判('19 图7 那一行「字 + 变量」的拼接式在句末就收住：同一份文件里后面那一句照样进清单',
    得.some(o => o.text === '后面那一句还在不在') && 得.some(o => /· 关系：\{\d+\}/.test(o.text)), 得.map(o => o.text));
  const 三种 = [
    "const a = '甲' + f(x);\nconst b = toast('第二句');",
    "const a = f(x) + '甲' + f(y);\nconst b = toast('第二句');",
    "const a = '甲' + f(x) + '乙';\nconst b = toast('第二句');"
  ].map(码 => 扫(码).some(o => o.text === '第二句'));
  Z.判('20 字开头、字在中间、字在两头三种拼法都收得住（一种越过句末就少一片清单）',
    三种.every(Boolean), 三种.join(' / '));
  const 一颗 = 扫(rd('src/_wnw/src/w10-cards.js')).length;
  Z.判('21 拿真源码再量一遍：卡片那一摊扫出来的条数不该掉一截（外32 图7 那一版只剩 26 条，一份清单当场少四百多行）',
    一颗 > 450, 一颗);
}

/* ---------- 单跑这一颗（命令行 / 小工具那颗「刷新清单」）也要覆盖搬走的那几家 ----------
   2026-10-17 量到的：邻居名单只有 src\_fd\build.mjs 那一趟递，命令行这一支没递，
   于是它按"只有本仓这一棵"排这本清单 —— 装壳那几句话改完单跑一次，清单从 4199 行掉到 1275 行，
   七家的句子整段从这本账上消失（他要是接着点「写进源码」，那几家就再也写不回去）。 */
Z.题('单跑那一支递不递邻居（少递就是这本清单静默窄掉一大截）');
{
  const 文 = rd('src/pack/uitext.cjs');
  const 那支 = (文.match(/if\(require\.main === module\)\{[\s\S]*\n\}\n/) || [''])[0];
  Z.数('命令行那一段抓到几个字', 那支.length);
  Z.判('那一段自己借了邻居那一把尺（import 邻居.mjs 的 根列表，并照生成页面那一趟同一写法 slice(1) 去掉本仓）',
    那支.includes("src/_build/邻居.mjs") && /根列表\(\)[\s\S]{0,24}slice\(1\)/.test(那支) && 那支.includes('设邻居('));
  Z.判('借不到就明说并给非零退出码（不闷着写一本窄清单）',
    /只按本仓这一棵排/.test(那支) && /process\.exitCode = 1/.test(那支));
  /* 真跑一眼：stats 那一档只量不写盘，正好拿它看七家在不在 */
  let 出 = '';
  try{
    出 = execFileSync(process.execPath, ['src/pack/uitext.cjs', 'stats'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  }catch(e){ 出 = String((e && e.stdout) || '') + String((e && e.stderr) || e); }
  const 行 = Number((出.match(/合并成清单 (\d+) 行/) || [])[1] || 0);
  const 份 = Number((出.match(/扫过文件 (\d+) 个/) || [])[1] || 0);
  Z.判('单跑 stats 真量到四千多行、一百一十多份文件（不递邻居只有 1275 行、几十份 —— 搬走那几家的源码根本没进这一趟）',
    行 > 4000 && 份 > 100 && 出.includes('为写') && 出.includes('声笔输入法练习') && 出.includes('推演组件定制'),
    '清单 ' + 行 + ' 行 · 文件 ' + 份 + ' 份');
  /* 反证：把邻居那一手摘掉，同一颗脚本立刻量不到那几家 —— 测的确实是"递没递" */
  const 字 = createRequire(import.meta.url)('../../pack/uitext.cjs');
  字.设邻居([]);
  const 窄 = 字.groupsOf(字.collectAll(ROOT).occ).length;
  字.设邻居(根列表().slice(1));
  const 全 = 字.groupsOf(字.collectAll(ROOT).occ).length;
  Z.判('同一颗脚本两跑：不递邻居 ' + 窄 + ' 段，递了 ' + 全 + ' 段（少的那一段一段都是搬走的那几家）',
    全 > 窄 + 20, 窄 + ' → ' + 全);
}

Z.收尾();
