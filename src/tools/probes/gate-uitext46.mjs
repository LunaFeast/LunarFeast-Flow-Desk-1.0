/* ============================================================
   gate-uitext46.mjs · 「界面文字」写回源码那一条路认它的落点
   ------------------------------------------------------------
     node src/tools/probes/gate-uitext46.mjs
   钉的是这么几件事：
     一 · 界面文字 apply 写回扫描量到的那一份源码（2026-10-13 他定的方案甲），
          装机那一张页面文件一个字节都不碰；落完笔给的是重新生成产物那三趟的次序；
     二 · 落笔之前那一道语法闸：喂一份「原样读得通 / 改完读不通」的文本必须报红（反向验），
          静态 html 与 ESM 两种形状都量到；
     三 · plan()/apply() 不再收「那一张页面文件」那一个参数（收了就是还留着老那条路）；
     四 · 对不上的仍进 miss；同一组底下每一处都换、别组一个字不动；拼接式按槽拆回去；
          「这句不要了」掏空；落完笔清单自己刷新（已经写进源码的那几行不再算改动）；
     六 · 程序里那台旧的「改界面文字」撤干净：运行时替换那一层、主进程与桥那八条通道、
          功能包递 Phrase 那一条 —— 都不许长回来。
   这一台不读 pages\ 里那一份真的页面文件（那是他的文稿目录，一个字节都不许量）：现场是沙盒里
   照 src\_fd\build.mjs 那一手现拼的一份假页，只做「原样相接」，所以每一份源码都在里面有一段。 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT, rd, 切, 尺在, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-uitext46');
const require = createRequire(import.meta.url);
const U = require(ROOT + 'src/pack/uitext.cjs');
const 文UIT = rd('src/pack/uitext.cjs');
const 文桥 = rd('src/_tauri/ui/fd-bridge.js');
/* 整棵源码汇一份文本：撤干净那几条扫的就是这一整棵（Electron 那两份退场后没有「另一头」可比了） */
let 全树文 = null;
function 全树(){
  if(全树文 !== null) return 全树文;
  const 中 = [];
  (function 走(d){
    for(const e of fs.readdirSync(d, { withFileTypes: true })){
      if(e.name === 'node_modules' || e.name.startsWith('.') || (d === path.join(ROOT, 'src') && e.name === 'tools')) continue;
      const p = path.join(d, e.name);
      if(e.isDirectory()) 走(p);
      else if(/\.(js|cjs|mjs|rs|html)$/.test(e.name)) 中.push(fs.readFileSync(p, 'utf8'));
    }
  })(path.join(ROOT, 'src'));
  全树文 = 中.join('\n');
  return 全树文;
}
const hash = p => { try{ const b = fs.readFileSync(p); return b.length + ':' + require('node:crypto').createHash('sha1').update(b).digest('hex'); }catch(e){ return '读不到'; } };
const 颗 = (源, 名) => { try{ return 切(源, 名); }catch(e){ return ''; } };

/* ---------- 沙盒：一棵假树（源码 + 一张拼好的假页） ---------- */
const 沙 = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-uitext46-'));
const 树 = path.join(沙, 'tree');
const 份 = (rel, 内) => { const p = path.join(树, rel); fs.mkdirSync(path.dirname(p), { recursive:true }); fs.writeFileSync(p, 内, 'utf8'); return p; };
份('src/_fd/src/z1-view.js', [
  '/* 沙盒那一份：界面上的几句字 */',
  'const Z1 = {',
  "  head(){ return h('span', '整屏') },",
  "  save(){ return h('button', '保存') },",
  "  again(){ return h('button', '保存') },",
  "  count(n){ return h('div', '一共 ' + n + ' 项') }",
  '};', ''
].join('\n'));
份('src/_fd/src/z2-view.js', "const Z2 = { put(){ return h('button', '保存') } };\n");
份('src/_fd/src/fd8-tools.js', "const put = c => ({ def:{ w:(c.def && c.def.w) || 16, h:(c.def && c.def.h) || 12 } });\n");
份('data/plugins/demo/manifest.json', '{"name":"演示卡","type":"tool"}');
份('data/plugins/demo/main.js', [
  'import x from "./y.js";',
  'export default {',
  "  name: '演示卡',",
  '  card:{ def:{ w:5, h:5 } },',
  "  view(){ return h('button', '插件自己的一句') }",
  '};', ''
].join('\n'));
份('src/_fd/template.html', '<!doctype html><html><head><title>沙盒标题</title></head><body><p>标签之间的一句</p></body></html>\n');
const 读 = rel => fs.readFileSync(path.join(树, rel), 'utf8');
const 页 = 份('Flow_Desk_1.2.3-alpha+build.deadbeef.html',
  '<!doctype html><html><head><title>沙盒</title></head><body><script>\n'
  + 读('src/_fd/src/z1-view.js') + '\n' + 读('src/_fd/src/z2-view.js') + '\n' + 读('src/_fd/src/fd8-tools.js')
  + '\n</script></body></html>\n');
const 源码清单 = ['src/_fd/src/z1-view.js', 'src/_fd/src/z2-view.js', 'src/_fd/src/fd8-tools.js'];

/* ---------- 一 · 落点是扫描量到的那一份源码 ---------- */
台.题('一 · 界面文字 apply 写回源码那一份，装机那一张页面一个字节不碰');
{
  const 前 = 源码清单.map(rel => hash(path.join(树, rel)));
  const 页前 = hash(页);
  const r = U.apply(树, [
    { prog:'Flow-Desk', page:'z1-view.js', from:'整屏', to:'满屏' },
    { prog:'功能包', page:'演示卡', from:'插件自己的一句', to:'换成这句' },
    { prog:'Flow-Desk', page:'页面骨架', from:'沙盒标题', to:'换了标题' },
  ]);
  const 落 = r.files.map(f => path.relative(树, f).split(path.sep).join('/')).sort();
  台.数('这一趟写掉的', r.list.length + ' 句 · ' + 落.length + ' 份文件：' + 落.join('、'));
  台.判('三句都认得到位置（清单里填了 → 源码里就写得到，一句不落）', r.list.length === 3 && r.miss.length === 0);
  台.判('落点就是扫描量到的那三份源码（功能包那一份与静态 html 都算，从前贴页面时那两家压根不在页面里）',
    落.join('|') === ['data/plugins/demo/main.js', 'src/_fd/src/z1-view.js', 'src/_fd/template.html'].join('|'), 落.join('|'));
  台.判('装机那一张页面文件一字未动（写的是源码，不动产物）', hash(页) === 页前);
  台.判('改动真的落在源码里：那句「整屏」变成了「满屏」', /h\('span', '满屏'\)/.test(读('src/_fd/src/z1-view.js')));
  台.判('功能包那一份也真落到了（ESM 那份 import 那一行原样在）',
    /h\('button', '换成这句'\)/.test(读('data/plugins/demo/main.js')) && /^import x from /.test(读('data/plugins/demo/main.js')));
  台.判('静态 html 里属性上那句也落到了（title 换掉、标签之间那段没动）',
    /<title>换了标题<\/title>/.test(读('src/_fd/template.html')) && /<p>标签之间的一句<\/p>/.test(读('src/_fd/template.html')));
  台.判('回执给的是重新生成产物那三趟的次序，且顺序是为写内核 → 推演组件定制内核 → 那一张页面',
    JSON.stringify(r.builds) === JSON.stringify(['src/_wnw/build-kernel.mjs', 'src/_wcustom/build-kernel.mjs', 'src/_fd/build.mjs']),
    JSON.stringify(r.builds));
  台.判('那三趟住在 uitext 这一份里（artifactBuilds 一颗），别处不抄第二份：界面文字那一屏叫的是它',
    /function artifactBuilds\(/.test(文UIT) && rd('src/_build/push-ui.mjs').includes('字.artifactBuilds()'));
  台.判('写完刷新清单本身：已经落进源码的那几行不再算「他写的改动」（不然下一趟就成了认不到的孤儿行）',
    /refresh\(TREE, 丢\)/.test(颗(文UIT, 'apply')) && /function refresh\(TREE, 丢掉\)/.test(文UIT));
  const 清 = 读('data/ui-text.yaml');
  台.判('刷出来的清单里那三句不再挂在冒号右边（改动已经进源码，不算待写改动）',
    !/:\s+(换了标题|换成这句|满屏)\s*$/.test(清), 清.split(/\r?\n/).filter(x => /换了标题|换成这句|满屏/.test(x)).join(' ⏎ '));
  台.判('那三句新词回到了清单左栏（成了下一轮的「原话」，屏上看得见）',
    /^\s+换了标题:/m.test(清) && /^\s+换成这句:/m.test(清) && /^\s+满屏:/m.test(清),
    清.split(/\r?\n/).filter(x => /换了标题|换成这句|满屏/.test(x)).join(' ⏎ '));
}

/* ---------- 二 · 落笔之前那一道语法闸 ---------- */
台.题('二 · 动笔之前那一道语法闸（喂坏输入必须报红）');
{
  const 闸 = U.checkSyntax;
  台.判('这一道闸对外交出来了（自检台喂坏输入用，别处不另写一把）', typeof 闸 === 'function');
  台.判('脚本形状：原样读得通、改完读不通 → 报红',
    闸({ rel:'a.js', 原:'const a = 1;', 文:'const a = 1;' }) === '' && /./.test(闸({ rel:'a.js', 原:'const a = 1;', 文:'const a = (' })),
    闸({ rel:'a.js', 原:'const a = 1;', 文:'const a = (' }));
  台.判('ESM 形状（功能包那几份）：原样读得通的过、改坏的报红',
    闸({ rel:'m.js', 原:'export default { a:1 };', 文:'export default { a:2 };' }) === ''
    && /./.test(闸({ rel:'m.js', 原:'export default { a:1 };', 文:'export default { a:( };' })),
    闸({ rel:'m.js', 原:'export default { a:1 };', 文:'export default { a:( };' }));
  台.判('import 那一行不被当成语法坏（剥掉 ESM 那几层再比，量的是差值不是形状）',
    闸({ rel:'m.js', 原:'import x from "./y.js";\nexport default { a:1 };', 文:'import x from "./y.js";\nexport default { a:2 };' }) === '');
  台.判('静态 html 不看 JS 语法（那份本来就不是脚本）', 闸({ rel:'a.html', 原:'<p>一</p>', 文:'<p>(</p>' }) === '');
  台.判('apply 里这一道闸排在落笔之前（认不过就整批一个字都不写）',
    颗(文UIT, 'apply').indexOf('语法闸') >= 0 && 颗(文UIT, 'apply').indexOf('语法闸') < 颗(文UIT, 'apply').indexOf('fs.writeFileSync'));
  台.判('认不过的时候报的是哪一份文件（不是笼统一句「写不进去」）',
    /份\.rel/.test(颗(文UIT, 'apply')) && /整批一个字都没写/.test(颗(文UIT, 'apply')));
}

/* ---------- 三 · 那一张页面文件不再是这一摊的参数 ---------- */
台.题('三 · plan()/apply() 不再收「那一张页面文件」那一个参数');
{
  台.判('locate / plan / apply 三颗的签名都只到 edits 为止',
    /function locate\(TREE, edits\)/.test(文UIT) && /function plan\(TREE, edits\)/.test(文UIT) && /function apply\(TREE, edits\)/.test(文UIT));
  台.判('locate 那一颗认位置靠的是每一份源码自己那一段（往一张已经生成的页面上搬位置那两把整台没了）',
    /每份\.values\(\)/.test(颗(文UIT, 'locate')) && !/pageSpan|readPage/.test(文UIT));
  台.判('界面文字那一屏不再让人挑「写进哪一张页面」（页面文件那一格整个撤了）',
    !rd('src/_build/push-ui.html').includes('id="字页"') && !rd('src/_build/push-ui.mjs').includes('function 页面单'));
  台.判('那一屏写句子那一道递给 apply 的是树与改动两样（多递一枚页面文件名就是还留着老路）',
    /字\.apply\)\(字树, 用\)/.test(rd('src/_build/push-ui.mjs')));
}

/* ---------- 四 · 对不上的进 miss / 每一处都换 / 形状 ---------- */
台.题('四 · 认位置与回执');
{
  const p = U.plan(树, [
    { prog:'Flow-Desk', page:'z1-view.js', from:'保存', to:'存一下' },
    { prog:'别处', page:'没这一页', from:'压根没有的一句', to:'改成那句' },
  ]);
  台.判('源码里认不到的那一句进 miss（list 1 · miss 1）· 递进去 ' + 2 + ' 句', p.list.length === 1 && p.miss.length === 1);
  台.判('miss 那份回的是原句（屏上那句照旧显示）', p.miss[0].from === '压根没有的一句');
  台.判('plan 与 apply 用同一颗 locate（预览说要改几处，真写就是几处）',
    JSON.stringify(p.list) === JSON.stringify(U.apply(树, [
      { prog:'Flow-Desk', page:'z1-view.js', from:'保存', to:'存一下' }]).list));
  const 后 = 读('src/_fd/src/z1-view.js');
  台.判('同一句原话那一组底下每一处都换（z1 里两处「保存」都成了「存一下」）', (后.match(/'存一下'/g) || []).length === 2);
  台.判('别组一个字不动（z2 那一句「保存」是另一页的）', /const Z2[\s\S]*'保存'/.test(读('src/_fd/src/z2-view.js')));
  台.判('at 报的是源码里那几处「哪一份文件第几行」', /z1-view\.js:\d+/.test((p.list[0].at || []).join(',')));
  /* 拼接式：两段字面量都换，中间那段代码原样在 */
  const r2 = U.apply(树, [{ prog:'Flow-Desk', page:'z1-view.js', from:'一共 {1} 项', to:'总共 {1} 份' }]);
  const 拼 = 读('src/_fd/src/z1-view.js');
  台.判('拼接式按槽拆回去写：两段都换、中间那句代码（+ n +）没被当字面量抄走',
    r2.list.length === 1 && /'总共 '/.test(拼) && /' 份'/.test(拼) && !/' 项'/.test(拼) && /\+ n \+/.test(拼));
  const r3 = U.apply(树, [{ prog:'Flow-Desk', page:'z1-view.js', from:'满屏', to:'', del:true }]);
  台.判('「这句不要了」= 把那一句字面量掏空', r3.list.length === 1 && /h\('span', ''\)/.test(读('src/_fd/src/z1-view.js')));
  const r4 = U.apply(树, [
    { prog:'Flow-Desk', page:'z2-view.js', from:'保存', to:'只写一遍' },
    { prog:'Flow-Desk', page:'z2-view.js', from:'保存', to:'第二遍不算' }]);
  台.判('清单上同一行写了两遍：只下刀一次，第二遍报对不上（两把刀叠在同一处会把那份写坏）',
    r4.list.length === 1 && r4.miss.length === 1 && (读('src/_fd/src/z2-view.js').match(/'只写一遍'/g) || []).length === 1
    && !/第二遍不算/.test(读('src/_fd/src/z2-view.js')));
  const 页末 = hash(页);
  const r5 = U.apply(树, []);
  台.判('清单里没有改动时一个字节都不写（list 0 · files 0 · 那份源码与那一张页面都没变）',
    r5.list.length === 0 && r5.files.length === 0 && hash(页) === 页末 && 页末 === hash(页));
  台.判('plan 与 apply 的回执同一形状（list / miss 两栏；写的时候多 files / builds）',
    Array.isArray(p.list) && Array.isArray(p.miss) && Array.isArray(r5.list) && Array.isArray(r5.files) && Array.isArray(r5.builds));
  台.判('写完之后那几份源码还读得动（改坏源码比不改更糟）',
    源码清单.every(rel => { try{ new vm.Script(读(rel), { filename:rel }); return true; }catch(e){ return false; } }));
}

/* ---------- 五 · 程序里那台旧的改字代码撤干净 ---------- */
台.题('五 · 旧的「改界面文字」在程序里不留一根线（乙 运行时那一层 / 丙 通道 / 丁 名单）');
{
  台.判('运行时替换那一层整份没了（src\\_shared\\sh-text.js）', !尺在('src/_shared/sh-text.js'));
  台.判('生成那一趟不再把它拼进产物', !/sh-text/.test(rd('src/_fd/build.mjs')));
  const 壳 = ['src/_fd/src/fd3-shell.js', 'src/_fd/src/fd6-boot.js', 'src/_fd/src/fd4-builtin.js',
    'src/_wnw/src/w1-core.js', 'src/_wnw/src/w3-shell.js', 'src/_wnw/src/w6-boot.js', 'src/_wnw/src/w10-cards.js',
    'src/_wcustom/src/sh-wizard.js', 'src/_build/rp-kernel.mjs', 'data/plugins/music-remote/main.js'];
  台.判('那十份壳与内核里再没有一处喊 Txt / Phrase',
    壳.every(f => !/\bTxt\.|\bPhrase\b/.test(rd(f))), 壳.filter(f => /\bTxt\.|\bPhrase\b/.test(rd(f))).join('、'));
  台.判('h() 里那两处查表与 data-txp 那一钉都撤了（title/placeholder 走回原生那一路）',
    !/data-txp/.test(rd('src/_fd/src/fd3-shell.js')) && !/data-txp/.test(rd('src/_wnw/src/w3-shell.js')));
  台.判('#275「跳到那一处」整块与它那条 uitext-jump 通道一起没了',
    !/JUMP_TOOL|const Jump = \{/.test(rd('src/_fd/src/fd3-shell.js')) && !/uitext-jump/.test(全树()));
  台.判('界面文字那六条通道一颗不留（read/write/open/plan/apply/adopt）',
    !/ui-text:/.test(全树()));
  台.判('页面上那八颗喊手在两头都没了（uiTextRead / Write / Open / Plan / Apply / Adopt / Changed / List）',
    !/uiText(?:Read|Write|Open|Plan|Apply|Adopt|Changed|List)/.test(全树()));
  台.判('加载器那一道硬地板与打包那把尺里也一并退了（挡空的名不留，桥上有的才在名单上）',
    !/uiText/.test(rd('src/_shared/sh-load.js')) && !/uiText/.test(rd('src/_build/scan-packs.mjs')));
  台.判('Rust 那一头的地板与测试同样退了这两颗', !/uiText/.test(rd('src/_tauri/src/core/app_deny.rs'))
    && !/uiText/.test(rd('src/_tauri/src/core/perm_rule.rs')));
  台.判('「开机把出厂清单补铺到数据层」那一整台没了（程序运行时不读界面文字清单）',
    !/syncLists|layList/.test(全树()));
  台.判('装完卸完功能都不重扫界面文字清单（运行时那几本里没有一颗读它的）',
    !/UIT\./.test(全树().replace(rd('src/pack/uitext.cjs'), '')));
  台.判('卡片大小那一台一处不留：清单生成器、运行时那一份、四颗通道、设置里那一行',
    !尺在('src/pack/cardsize.cjs') && !尺在('src/_fd/src/fd10-size.js')
    && !/cardSize|card-size/.test(全树())
    && !/SizeList|SizeCfg/.test(rd('src/_fd/src/fd3-shell.js') + rd('src/_fd/src/fd4-builtin.js') + rd('src/_fd/src/fd6-boot.js')));
}

/* ---------- 六 · 首装那一个窗口的字也在扫描那几棵树里（2026-10-13 他指着那一格说「这里的文字也要提供修改」）---------- */
台.题('六 · 双击 setup.exe 看到的那一格：句子进清单、写回落进 sfx.cs');
{
  const 壳 = rd('src/pack/sfx.cs'), 发 = rd('src/pack/publish.mjs');
  台.判('扫描那一份里登记了这一份 C# 壳（只点名一份，不放开「只认 .js / .cjs」那个口子）',
    /const CS_FILES = \['src\/pack\/sfx\.cs'\]/.test(文UIT) && /for\(const f of CS_FILES\)/.test(文UIT) &&
    !/\(js\|cjs\|cs\)/.test(文UIT));
  const 名册 = U.listFiles(ROOT);
  台.判('真树扫那一名册里确有这一份（读的是盘上那一份，一个字节不写）', 名册.includes('src/pack/sfx.cs'), 名册.length + ' 份');
  台.判('出处给的是「首装那一个 exe · 首装那个窗口」（不是文件名也不是问号）',
    JSON.stringify(U.pageOf('src/pack/sfx.cs', '', {}, {})) === JSON.stringify({ prog:'首装那一个 exe', page:'首装那个窗口' }));

  const 行 = U.groupsOf(U.collectAll(ROOT).occ).filter(g => g.prog === '首装那一个 exe');
  const 有 = s => 行.some(g => g.text === s);
  台.判('他点的那几句全在清单里（顶上那句系列话、摊到那儿的提示、两颗按钮、进度那一句）',
    有('Flow-Desk 便携版') && 有('摊到这儿（整个文件夹挪走就算卸载，不写注册表）：') && 有('换个地方') &&
    有('开始安装') && 有('覆盖升级') && 有('还没开始') && 有('正在摊开 {1} / {2}'),
    行.length + ' 行');
  台.判('覆盖升级那三行话、装坏与装完那几句也都在（从前它们夹着换行，一句都进不了清单）',
    有('这一棵已经装了 ') && 有('这一次覆盖成 ') && 有('就是这儿：') && 有('已经挪走的旧文件都在') &&
    有('照着挪回去就还是上一版。') && 有('整个文件夹删掉重来就行。') && 有('弄好了 · ') && 有(' 个文件 · '),
    行.map(g => g.text).slice(0, 3).join(' / '));

  /* 反向验：句子里夹 \r\n 的那种写法，清单那一行只能写一句，扫描本来就不收 —— 顶上那一格是承重的，不是摆设 */
  const 旧 = 'class P{ void M(string label){ Info.Text = label + "\\r\\n摊到这儿（整个文件夹挪走就算卸载，不写注册表）："; } }\n';
  const 新 = 'class P{ static readonly string NL = "\\r\\n";\n' +
    '  static readonly string UiDropTo = "摊到这儿（整个文件夹挪走就算卸载，不写注册表）：";\n' +
    '  void M(string label){ Info.Text = label + NL + UiDropTo; } }\n';
  const 扫 = 内 => U.groupsOf(U.scanJs('src/pack/sfx.cs', 内, {}, {}));
  台.判('反向验咬得住：旧写法（句子里夹着换行）扫得出 0 行，拆成顶上那一格才扫得出那一句',
    扫(旧).filter(g => g.prog === '首装那一个 exe').length === 0 &&
    扫(新).filter(g => g.prog === '首装那一个 exe').some(g => g.text === '摊到这儿（整个文件夹挪走就算卸载，不写注册表）：'));
  台.判('换行不再藏在句子里：顶上那一格之外，窗口那几句字面量里一个 \\r\\n 都不许留',
    (壳.match(/"\\r\\n[^"]*[\u4e00-\u9fa5]/g) || []).length === 0,
    (壳.match(/"\\r\\n[^"]*[\u4e00-\u9fa5]/g) || []).join(' | '));

  /* 沙盒真写回一句：落点就是那一份 C#，写歪了整批不写 */
  份('src/pack/sfx.cs', 新);
  const 写 = U.apply(树, [{ prog:'首装那一个 exe', page:'首装那个窗口',
    from:'摊到这儿（整个文件夹挪走就算卸载，不写注册表）：', to:'放到这儿（整个文件夹挪走就算卸载，不写注册表）：' }]);
  台.判('写回落到这一份 C# 那一句上（新句在、旧句没了），回执报的是同一处',
    写.list.length === 1 && 写.files.some(f => /sfx\.cs$/.test(f)) &&
    读('src/pack/sfx.cs').includes('放到这儿（整个文件夹挪走就算卸载，不写注册表）：') &&
    !读('src/pack/sfx.cs').includes('摊到这儿'), JSON.stringify(写.list[0] && 写.list[0].at));
  台.判('这一份不是脚本，那一道语法闸不许拿 js 的尺拦它（拦了就是一个字都写不进去）',
    U.checkSyntax({ rel:'src/pack/sfx.cs', 原:'class A{ void M(){ X("甲"); } }', 文:'class A{ void M(){ X("乙"); } }' }) === '' &&
    U.checkSyntax({ rel:'src/_fd/src/别的一份.js', 原:'var a = 1;', 文:'var a = (' }) !== '');

  台.判('顶上那句系列话只有一处真身：sfx.cs 里那一句，发布脚本那一格只往标记里记号',
    /const label = VER\.fd;/.test(发) && !/'Flow-Desk 便携版 ' \+ VER\.fd/.test(发) &&
    /static readonly string UiFlavor = "Flow-Desk 便携版";/.test(壳) &&
    /label = string\.IsNullOrEmpty\(fd\) \? UiFlavor : UiFlavor \+ " " \+ fd;/.test(壳));
  台.判('改完这一份必定重编：编首装壳那一步比的是这份源文件的时间戳',
    /fs\.statSync\(stub\)\.mtimeMs < fs\.statSync\(stubSrc\)\.mtimeMs/.test(发));
}

台.数('沙盒在', 沙);
try{ fs.rmSync(沙, { recursive:true, force:true }); }catch(e){}
台.收尾();
