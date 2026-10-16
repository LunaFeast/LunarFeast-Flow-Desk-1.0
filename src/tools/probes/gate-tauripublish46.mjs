/* ============================================================
   gate-tauripublish46.mjs · 首装那一颗包里到底有什么（这一棵只剩这一颗壳）
   ------------------------------------------------------------
     node src/tools/probes/gate-tauripublish46.mjs
   钉的是这么几件事（2026-10-12 那一批立起来，2026-10-14 随 Electron 那一层退了改成一条道）：
     一、发布脚本干跑吐出一份路径清单，页面层 / 插件那两格 / src 层 / 货架 / 首装壳 / 清单 /
        data 那道闸 都从这一份代码里出；
     二、包里不许混进 Electron 的件（locales、resources\app、electron 的 dll 与那批 pak）——
        桥、命令表、硬地板那份名单都编在 exe 里（page_cmds 那句 include_str!），
        铺一份进去就是留第二份真身，「改了源码忘铺镜像」那种账会回来；
     三、包里必须带着那颗 exe（进包改名成整棵树唯一的门牌）与 WebView2 那颗加载器；
     四、该带的层一份不差：当前这一支号那一张页（只一张）、src 层、插件两格（活的与原版）、
        树根那份安装说明；data\ 那道闸成立（除插件两格之外零份）；
     五、产物落 dist\tauri\ 那一格；那颗 exe 没编出来时当场停，并说清先跑哪一趟；
     六、首装那颗壳（sfx.cs）认「这一棵是不是装过的程序」认的是那颗门牌，
        覆盖升级整层挪走的是 src\ 那一层 —— 两样都别再指回 Electron 那层。
   对账走发布脚本自己吐的那一份路径清单（--dry --json）：
   dist\ 那一格是产物，不许当核对面去翻，所以"包里有什么"由脚本自己报。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { 记账, rd, ROOT } from './lib-slice.mjs';
import { 家 } from '../../_build/plugin-repos.mjs';
import { 私人串清单 } from '../../_build/public-scan.mjs';

const 台 = 记账('gate-tauripublish46.mjs');

function 跑发布(额外, 多几个字段){
  const 试 = () => execFileSync(process.execPath, ['src/pack/publish.mjs', '--dry', '--json', ...额外],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let 出 = '';
  try{ 出 = 试(); }
  catch(e){
    /* 产物上那一串号是从"这一根指针的最新一笔"现算的，所以每落一笔，pages\ 里就少当前那一号那张页，
       这一道会先撞一次「pages\ 里没有当前这一支号的页」。那张页是产物（不进仓），生成它不写他任何一个原件：
       补跑一次生成那三趟里的页面那一趟再试一次 —— 只补这一件，别的一律照旧红。
       （从前这里每落一笔就得手动跑一次 node src\_fd\build.mjs，一天撞两次，写在 docs\进度看板.md 10:40 那一节。） */
    const 话 = String((e && (e.stdout || e.stderr)) || (e && e.message) || e);
    if(!/pages\\ 里没有当前这一支号的页/.test(话)) return { 成: false, 码: e.status, 全文: 话 };
    try{ execFileSync(process.execPath, ['src/_fd/build.mjs'], { cwd: ROOT, encoding:'utf8', stdio:['ignore','pipe','pipe'] }); }catch(e2){ /* 生成砸了就把下面那一次的原文报出来 */ }
    try{ 出 = 试(); }
    catch(e2){ return { 成: false, 码: e2.status, 全文: String((e2 && (e2.stdout || e2.stderr)) || (e2 && e2.message) || e2) }; }
  }
  const 行 = 出.split(/\r?\n/).find(l => l.startsWith('MANIFEST '));
  const 清单 = 行 ? JSON.parse(行.slice('MANIFEST '.length)) : null;
  return { 成: true, 清单, 全文: 出 };
}
const 包 = 跑发布([]);
const 有 = (前缀) => (包.清单 || []).filter(k => k === 前缀 || k.startsWith(前缀));

台.题('一、干跑一趟，吐出一份路径清单');
台.判('发布脚本干跑过（不认参数、不认第二颗壳 —— 就一条道）',
  包.成 && Array.isArray(包.清单) && 包.清单.length > 100, 包.全文.slice(-400));
台.数('一份清单几路径', (包.清单 || []).length + ' 路径');

台.题('二、包里不许混 Electron 那层的件');
台.判('没有 locales 那一层', 有('locales/').length === 0, 有('locales/').slice(0, 4));
台.判('没有 resources/app 那一层（桥和命令都编在 exe 里，铺一份就是留第二份真身）',
  有('resources/').length === 0, 有('resources/').slice(0, 4));
台.判('没有 electron 那颗 dll 与那批 pak',
  !有('').includes('electron.dll') && 有('').filter(k => /\.pak$/.test(k)).length === 0);
台.判('发布脚本与首装壳那两份里也不再分「两种壳」（一条道不写两套话）',
  !/壳种|新壳|electron/.test(rd('src/pack/publish.mjs')) && !/resources[\\\\/]app/.test(rd('src/pack/sfx.cs')));

台.题('三、该带的两颗运行时件，名字是整棵树唯一的门牌');
台.判('根上有 Flow-Desk.exe（那颗 exe 进包改了名 —— 页面、托盘、进程名三处都认这一串）',
  有('Flow-Desk.exe').length === 1);
台.判('根上有 WebView2Loader.dll', 有('WebView2Loader.dll').length === 1);

const 页 = () => (包.清单 || []).filter(k => /^pages\/Flow_Desk_.*\.html$/.test(k));
const 源 = () => (包.清单 || []).filter(k => k.startsWith('src/'));
台.题('四、该带的层一份不差');
台.判('只带当前这一支号那一张页（老版本一张都不带）',
  页().length === 1 && /Flow_Desk_.*\.html$/.test(页()[0] || ''), 页());
台.判('src 层带够了（重新生成页面要读它）', 源().length > 100, 源().length + ' 份');
台.判('src 层里没有一个 node_modules 与一个藏文件',
  源().every(k => !k.split('/').includes('node_modules') && !/(^|\/)\.[^/]/.test(k)));
const 各家 = 家.map(j => j.id);
/* 2026-10-16 改口（规划第五节：主程序那一枚是空壳）：从前这两条一条核"树里七家那一格齐"、
   一条核"data\ 底下除插件那一格之外零份" —— 现在树里连插件那一格都没有，
   七家改成核「货架上七颗自有格式的容器一颗不缺」，data\ 那一道闸回到零放行。 */
const 在架 = Number((包.全文.match(/货架 (\d+) 家各一颗容器/) || [])[1] || 0);
台.判('货架上那 ' + 各家.length + ' 家一颗容器都不缺（发布那一趟当场报的数，不是照屏上勾的）',
  在架 === 各家.length, '报的是 ' + 在架 + ' 家');
台.判('树里一家的代码都没有（空壳：data\\plugins 那一路零份）', 有('data/plugins/').length === 0, 有('data/plugins/').slice(0, 4));
台.判('树根那份说明在包里', 有('安装说明.txt').length === 1, 有('安装说明.txt'));
const 脏 = () => (包.清单 || []).filter(k => k === 'data' || k.startsWith('data/'));
台.判('data\\ 底下一份都不带（空壳那一枚的硬闸：连插件那一格也不放行）', 脏().length === 0, 脏().slice(0, 6));

台.题('五、产物落哪一格、那颗 exe 没编出来时怎么停、名字上那一段档位的字只管文件名');
台.判('产物格是 dist\\tauri', /产物在 .*[\\/]dist[\\/]tauri/.test(包.全文), (包.全文.match(/产物在 .*/) || [''])[0]);
{
  /* 他 2026-10-14 那两句是分开的两件事：文件名上要分得清哪一种包；装出去的那一棵里不许写这种档位字样。
     所以这一节量的是「加了那一段之后，包里的路径清单一个字都没变」+「那一段只出现在产物名字上」。 */
  const 带段 = 跑发布(['--setup-tag=full']);
  const 坏段 = (() => { try{
      execFileSync(process.execPath, ['src/pack/publish.mjs', '--dry', '--setup-tag=../坏名'],
        { cwd: ROOT, encoding:'utf8' }); return { 码:0, 话:'' }; }
    catch(e){ return { 码:e.status, 话:String(e.stdout || '') + String(e.stderr || '') }; } })();
  台.判('真跑带那一段的干跑：产物名字变成 Flow_Desk_setup_full_<号>.exe，而包里的路径清单与不带那一段时逐条一模一样（那一段只进文件名）',
    带段.成 && /Flow_Desk_setup_full_[0-9a-z.+-]*\.exe/.test(带段.全文) &&
    JSON.stringify(带段.清单) === JSON.stringify(包.清单),
    (带段.全文.match(/Flow_Desk_setup\S*/) || ['没报出产物名'])[0] + ' · 清单条数 ' + (带段.清单 || []).length + ' 对 ' + (包.清单 || []).length);
  台.判('那一段插在 Flow_Desk_setup_ 与号之间，号那一截（1.0.0-alpha+build.短哈希）一个字没被挤掉 —— 覆盖升级认的就是号，名字多了那一段也不能对不上',
    带段.成 && 带段.全文.includes('首装那颗的文件名：Flow_Desk_setup_full_' + ((带段.全文.match(/"fd":"([^"]+)"/) || [,''])[1]) + '.exe'),
    (带段.全文.match(/首装那颗的文件名：\S*/) || ['没报出文件名'])[0]);
  台.判('反向验真跑：那一段写成往上钻的样子就当场停（它是拼进文件名的，不收怪字符）· 退出码 ' + 坏段.码,
    坏段.码 === 1 && /setup-tag 只收/.test(坏段.话), (坏段.话.split(/\r?\n/).find(l => l.includes('Error')) || '').slice(0, 120));
  台.判('那一段只收小写 ASCII（中文的档位字样进不了文件名），而且那一段照实量 —— 八项齐才写 full，差几项写「几 of8」，基础版与发版的名字照旧不带那一段（叫 full 的那一枚不许其实是 4 项）',
    /\/\^\[a-z0-9\]\[a-z0-9_-\]\{0,15\}\$\/\.test\(s\)/.test(rd('src/pack/publish.mjs')) &&
    rd('src/_build/release.mjs').includes("自测档 === '完整' ? (齐 ? 'full' : 带了.length + 'of8') : ''") &&
    rd('src/_build/release.mjs').includes(".concat(名段 ? ['--setup-tag=' + 名段] : [])"));
}
const 没编 = (() => { try{
  execFileSync(process.execPath, ['src/pack/publish.mjs', '--dry', '--壳件=' + ROOT + '这一格本来就没有'],
    { cwd: ROOT, encoding: 'utf8' });
  return { 码: 0, 话: '' };
}catch(e){ return { 码: e.status, 话: String(e.stdout || '') + String(e.stderr || '') }; } })();
台.判('反向验真跑：那颗壳没编出来就停，并说清先跑哪一趟（不出一个半对的包）',
  没编.码 !== 0 && /先跑 node src\\_tauri\\build\.mjs/.test(没编.话), 没编.话.split(/\r?\n/).find(l => l.includes('没编出来')) || 没编.话.slice(0, 160));

台.题('六、首装那颗壳认的两样都在这颗壳的形状上');
const 壳 = rd('src/pack/sfx.cs');
台.判('认「这一棵是不是装过的程序」认的是那颗门牌（不是一层镜像里的一份代码）',
  /IsTree/.test(壳) && /Path\.Combine\(dest, "Flow-Desk\.exe"\)/.test(壳));
台.判('覆盖升级整层挪走的是 src\\ 那一层，逐件挪的那一圈跳过 src/',
  /Path\.Combine\(dest, "src"\)/.test(壳) && /it\.Name\.StartsWith\("src\/"\)/.test(壳));
台.判('data\\ 那一层只碰自带那几家的代码，别的一律不碰（包里 data\\ 开头的路径只有插件那一格；那颗"已有就不动"的判定里 data/plugins/ 这条前缀 2026-10-16 撤了，覆盖升级要换新那几家的代码）',
  !/StartsWith\("data\/plugins\/"\)/.test(壳) && 脏().length === 0);

台.题('七、开发那一层与这台自己的位置，一个字节都不许跟着包出门（2026-10-14 他量出来的那一件）');
{
  /* 他原话：「为什么用户安装的版本也有GitHub小助手这些东西！这不是该打包给用户的东西！泄露我的GitHub信息怎么办！」
     量出来是真的：装出去的那一棵里当时有 src\tools\ 整格 110 份（探针、自查、audit、start-fd.bat、那台小助手 push-fd.bat）、
     src\_build\ 里推送发布那一摊 10 份，还有 src\tools\ 底下那颗不进仓的路径表（这台自己的那几格位置全写在里面，
     具体哪几格不抄在这里 —— 抄进这份文本就等于把它送到公开面上，这一节最后那道逐份扫的判据就是防这一手的）。
     根因：src 这一层从前是照着**盘上**走的，而 .gitignore 只挡得住仓，挡不住"盘上有的就被打进包"；
     公开面那道闸量的也是仓里进版本的文本，所以它对这一层整个是瞎的。这一节就是补那道瞎掉的闸。 */
  const 单 = 包.清单 || [];
  台.判('装出去的那一棵里没有 src\\tools\\ 那一份（探针、自查、audit、两颗 .bat、本地路径 全在这一格）',
    单.length > 100 && 单.filter(k => k.startsWith('src/tools/')).length === 0,
    单.filter(k => k.startsWith('src/tools/')).length + ' 份');
  台.判('推送与发布那一摊十份不在包里（pr / release / push-ui 两份 / push-list / public-scan / plugin-repos / forward-features / ico-index / packs）',
    ['pr.mjs', 'release.mjs', 'push-ui.mjs', 'push-ui.html', 'push-list.mjs', 'public-scan.mjs',
     'plugin-repos.mjs', 'forward-features.mjs', 'ico-index.mjs', 'packs.mjs']
      .every(名 => !单.some(k => k === 'src/_build/' + 名)));
  台.判('这台自己的位置那份（src\\tools\\本地路径.cjs）与编译中间产物 sfx-stub.exe 都不在包里 —— 它们都进了盘、都没进版本，正是从前那一层照盘上走会带走的两种',
    !单.includes('src/tools/本地路径.cjs') && !单.includes('src/tools/本地路径.mjs') && !单.includes('src/pack/sfx-stub.exe'));
  台.判('这一层只认"进了版本的那几份"：src 底下每一份都在 git 的名单里（问不出 git 时发布脚本当场停，不照盘上兜底）',
    (() => {
      /* -z 这一枚不能省：不带它，git 会把中文文件名转义成 "...\345\243..." 那种写法，一比就"查无此份"（假红） */
      const 管 = new Set(String(execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { encoding:'utf8' }))
        .split('\0').filter(Boolean).map(s => s.replace(/\\/g, '/')));
      const 没 = 单.filter(k => k.startsWith('src/')).filter(k => !管.has(k));
      return 没.length === 0;
    })(), (() => {
      const 管 = new Set(String(execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { encoding:'utf8' }))
        .split('\0').filter(Boolean).map(s => s.replace(/\\/g, '/')));
      return 单.filter(k => k.startsWith('src/')).filter(k => !管.has(k)).slice(0, 5).join(' 、');
    })());
  const 串 = 私人串清单().串.map(x => (x && x.串) || String(x)).concat(['LunarFeast']);
  const 中 = [];
  for(const 相 of 单){
    if(!/\.(mjs|cjs|js|json|txt|html|md|bat|rs|yaml|css)$/i.test(相)) continue;
    let 文 = '';
    try{ 文 = fs.readFileSync(path.join(ROOT.replace(/[\\/]$/, ''), 相), 'utf8'); }catch(e){ continue; }
    for(const s of 串) if(文.includes(s)) 中.push(相 + ' → ' + s);
  }
  台.判('逐份扫这一棵要带出去的文本：这台的位置、帐户名、GitHub 那串名字，一处都不许有（现量 ' +
    单.filter(k => /\.(mjs|cjs|js|json|txt|html|md|bat|rs|yaml|css)$/i.test(k)).length + ' 份文本、' + 串.length + ' 串）',
    中.length === 0, 中.slice(0, 6).join(' ⹂ '));
}

台.收尾();
