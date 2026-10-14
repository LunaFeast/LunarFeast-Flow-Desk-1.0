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
import { execFileSync } from 'node:child_process';
import { 记账, rd, ROOT } from './lib-slice.mjs';
import { 家 } from '../../_build/plugin-repos.mjs';

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
const 缺家 = 各家.filter(id => !有('data/plugins/' + id + '/manifest.json').length || !有('data/plugins-factory/' + id + '/manifest.json').length);
台.判('这一棵上那 ' + 各家.length + ' 家插件两格齐（活的 + 原版），一家不缺', 缺家.length === 0, 缺家);
台.判('树根那份说明在包里', 有('安装说明.txt').length === 1, 有('安装说明.txt'));
const 脏 = () => (包.清单 || []).filter(k => (k === 'data' || k.startsWith('data/'))
  && !k.startsWith('data/plugins/') && !k.startsWith('data/plugins-factory/'));
台.判('data\\ 底下除插件两格之外零份（那道硬闸）', 脏().length === 0, 脏().slice(0, 6));

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
  台.判('那一段只收小写 ASCII（中文的档位字样进不了文件名），而且发布这一趟只有从集成分支那一棵打的才带它 —— 基础版与发版的名字照旧',
    /\/\^\[a-z0-9\]\[a-z0-9_-\]\{0,15\}\$\/\.test\(s\)/.test(rd('src/pack/publish.mjs')) &&
    rd('src/_build/release.mjs').includes("自测档 === '完整' ? ['--setup-tag=full'] : []"));
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
台.判('data\\ 那一层还是从头到尾不碰（包里一个 data\\ 开头的路径都没有，除插件那两格）',
  /data\/plugins\//.test(壳) && 脏().length === 0);

台.收尾();
