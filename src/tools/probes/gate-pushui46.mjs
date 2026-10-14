/* ============================================================
   gate-pushui46.mjs · 外46 七：推送那一摊的可视化（src\_build\push-ui.mjs + push-ui.html + src\tools\push-fd.bat）
   ------------------------------------------------------------
     node src/tools/probes/gate-pushui46.mjs
   钉的是这一台「只做三件事、一件都不越界」：
     一、它不自己实现任何发布动作 —— 起了就跑 release.mjs 那两条命令，git 只读不写，不碰密钥，不起他的程序；
     二、界面上看到的和写回去的，和那一格明文文件同源 —— 认形状那两颗（读清单显示 / 改清单）住在 push-list.mjs 里，只有一份；
     三、最后那一个字只有 release.mjs 等终端那一条路，界面只是把字喂进它的键盘输入那一头；
     四、多行更新描述、坏基线、坏编码、页面半路关掉 —— 台子都不许砸，也不许趁机推东西。
   能真跑的（第 12~16 条那几颗 round-trip）一律真跑，不拿正则糊过去。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { 记账, rd, 切, ROOT } from './lib-slice.mjs';
import { 探针沙盒 } from '../本地路径.mjs';
import { 拼清单, 读清单, 读清单显示, 改清单, 合法基线, 确认词 } from '../../_build/push-list.mjs';

const 台 = 记账('gate-pushui46');
const ui = rd('src/_build/push-ui.mjs');
const pg = rd('src/_build/push-ui.html');
const bat = rd('src/tools/push-fd.bat');
const rel = rd('src/_build/release.mjs');
const pr = rd('src/_build/pr.mjs');            /* 外46 八起：等确认那一句从 release.mjs 搬进了 pr.mjs（推支与建 PR 那一整手住这儿） */
const 起 = 切(ui, '起连');        /* 那一趟真spawn的手艺在这一颗里（起() 只是单趟的那层薄壳） */
const 存路 = 切(ui, '服务器');

/* ---------- 一份现成的清单，拿来真跑 round-trip ---------- */
const 样 = 拼清单({ 基线:'1.0.0-alpha', 笔:[
  { 名:'主程序 · Flow-Desk', 副题:'这一笔落在 main 那一支', 会动:'会动 · 多了 2 份改动', 现在:'1.0.0-alpha+build.aaaaaaa',
    会成:'1.0.0-alpha+build.（这一笔落下去才知道）', 话:['开头请留着「发布 」这两个字'], 描述:'发布 1.0.0-alpha · 记号', 份:['src/a.mjs', 'src/b.mjs'] },
  { 名:'日程 · schedule', 副题:'这一家的代码在 plugin/schedule 那一支', 会动:'不动', 现在:'1.0.0-alpha+build.bbbbbbb',
    会成:'还是现在这一串（这一家这一轮不动）', 话:[], 描述:null, 份:[] },
]});

台.题('一、这一台不自己实现发布动作');
台.判('起的只有那两条命令：release.mjs 的 --看 与 --照清单发，没有第三条路',
  起.includes('spawn(process.execPath, 列表[第]') && ui.includes("['src/_build/release.mjs', '--看']") &&
  ui.includes("['src/_build/release.mjs', '--照清单发']") && !/--dry|--不推/.test(ui));
台.判('这一台里一件 git 写活都没有：不落笔、不挪指针、不打 tag、不推',
  !/commit-tree|update-ref|write-tree|hash-object|merge-tree|'tag'|"tag"|'push'|"push'|往那一支写|同步那一支|拼装\(/.test(ui));
台.判('跑的 git 只被读的那几样叫到（status / rev-parse），颗里也没有写支的口子',
  /rev-parse|--porcelain/.test(ui) && !/git\(\s*TREE\s*,\s*\[\s*'(commit|push|tag|checkout|reset|stash)/.test(ui));
台.判('不起他的程序：Flow-Desk.exe 只出现在 tasklist 那一眼里，没有 spawn 它',
  (ui.match(/Flow-Desk\.exe/g) || []).length === 1 && !/spawn\([^)]*Flow-Desk/.test(ui));
台.判('不读不写任何密钥：没有令牌、口令那几样，spawn 也不另传环境变量（推那一步用的是这台已经配好的那套）',
  !/token|password|secret|PAT\b/.test(ui) && !/env:/.test(起));
台.判('量与发都只有一条道：仓里写不写、推不推，全在 release.mjs 那两条自己身上，这一台不加分支',
  !/execFileSync\([^)]*git[^)]*'--write'/.test(ui) && 起.includes('if(当值.手)'));

台.题('二、界面和那一格明文文件同源');
台.判('认形状那两颗住在 push-list.mjs 里，这一台只是叫它们（不在界面上再 parse 一遍）',
  ui.includes('读清单显示') && ui.includes('改清单') && !/split\(\/\\r\?\\n/.test(存路) && !/【\(.+?\)】/.test(ui));
{
  const 拿 = ((ui.match(/import \{([^}]*)\} from '\.\/plugin-repos\.mjs'/) || [, ''])[1])
    .split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
  台.判('这一台七家的名字从那份家表取，不抄第二份：拿进来的是「家 as 家表」这一份真身，屏上一家都没写死' +
    '（2026-10-13 他指着要手打 id 那一格问「这个是什么」—— 改成一家一格勾，格上只有中文名）',
    拿.includes('TREE') && 拿.includes('本地前瞻支') && ui.includes('家 as 家表') &&
    !/你的便签|音乐遥控器|声笔输入法练习|你的句子/.test(pg) && !pg.includes('简装不带'), 拿.join('、'));
}
台.判('页面里的格子名和文件里的行名是同一串字（会不会动 / 现在挂的号 / 会迭代成 / 更新描述）',
  ['会不会动', '现在挂的号', '会迭代成', '更新描述'].every(k => pg.includes(k) && 样.includes(k)));
台.判('只往 127.0.0.1 听，端口默认 8792（8791 是那台页面服务的，各占一个）',
  ui.includes("服务器.listen(PORT, '127.0.0.1'") && /PORT \|\| 8792/.test(ui));
台.判('那一枚随机码是起台子时现生成的，写请求不带就拒',
  /const 码 = crypto\.randomBytes/.test(ui) && /req\.headers\['x-push-code'\] !== 码/.test(ui) && pg.includes("'x-push-code':码"));

台.题('三、能改的两样，改得对（真跑）');
台.判('版本基线不成的样子当场拒，界面上那条路先过这把尺',
  存路.includes('合法基线') && !合法基线('1.2.3-beta+build.abc') && !合法基线('') && 合法基线('1.0.0-alpha') && 合法基线('1.2.3'));
台.判('多行更新描述：写出去摊成几行「更新描述 =」，读回来还是那一串（换行不丢）',
  (() => {
    const 多行 = '第一行说的是这一轮\n第二行是从别处粘来的\n第三行带一个 = 号';
    const 新 = 改清单(样, { 基线:'1.0.0-alpha', 描述:{ '主程序 · Flow-Desk': 多行 } });
    const 数 = (新.match(/^[ \t]+更新描述 = /gm) || []).length;   /* 只数那一行本身，头部说明里也提到这个词 */
    return 数 === 3 && 读清单(新).描述['主程序 · Flow-Desk'] === 多行 && 读清单显示(新).笔[0].描述 === 多行;
  })(), 读清单(改清单(样, { 描述:{ '主程序 · Flow-Desk':'a\nb' } })).描述);
台.判('改清单 只动那两行：一笔里的会动、号、份，还有说明行，全部逐字不动',
  (() => {
    const 新 = 改清单(样, { 基线:'9.9.9-dev', 描述:{ '主程序 · Flow-Desk':'换成一句话' } });
    const 留 = ['会不会动 = 会动 · 多了 2 份改动', '现在挂的号 = 1.0.0-alpha+build.aaaaaaa',
                '会迭代成 = 1.0.0-alpha+build.（这一笔落下去才知道）', '动了哪些份 =', '    src/a.mjs', '    src/b.mjs',
                '  # 开头请留着「发布 」这两个字'];
    return 新.includes('版本基线 = 9.9.9-dev') && 留.every(x => 新.includes(x)) && !新.includes('· 记号');
  })());
台.判('没点到的那一笔一个字不碰（只改主程序，日程那一笔原样）',
  改清单(样, { 描述:{ '主程序 · Flow-Desk':'换' } }).includes('更新描述 = 发布 1.0.0-alpha · 记号') === false &&
  改清单(样, { 基线:'1.0.0-alpha' }) === 样);
台.判('一笔里没有「更新描述 =」那一行，读回来是 null —— 界面上不给框（这一笔压根不落笔）',
  读清单显示(样).笔[1].描述 === null && 读清单显示(样).笔[0].描述 !== null);
台.判('两颗尺对同一份文件说的是同一串：读清单 与 读清单显示 的更新描述一致',
  (() => { const a = 读清单(样).描述, b = {}; for(const x of 读清单显示(样).笔) if(x.描述 !== null) b[x.名] = x.描述;
           return JSON.stringify(a) === JSON.stringify(b); })());
台.判('份那一摊：两格都空的时候读回来是零份，不是把别的行当份',
  读清单显示(样).笔[1].份.length === 0 && 读清单显示(样).笔[0].份.length === 2);

台.题('四、最后那一个字还是他亲手给的（2026-10-14 换的形状：点下去先摊单，敲对了那个字才起子进程）');
台.判('确认那一个字只认 push-list.mjs 导出的那一颗，这一台没自己写死（往 import 那一串里加名字不算改这一条）',
  /import \{[^}]*确认词[^}]*\} from '\.\/push-list\.mjs'/.test(ui) && !/'推'/.test(ui));
台.判('往远程送东西的那两道（推送这一轮的改动 / 推勾中的那几项）起子进程之前一律先过 收字 这一道',
  (存路.match(/if\(!收字\(res, 身\)\) return;/g) || []).length === 2,
  (存路.match(/if\(!收字\(res, 身\)\) return;/g) || []).length);
台.判('收字 比的还是 push-list 那一颗；不对就 400 并报名字，子进程根本不起',
  /function 收字\(res, 身\)\{/.test(ui) && ui.includes('if(答 !== 确认词)') && ui.includes('发(res, 400,') &&
  !/当值\.手\.stdin/.test(ui));
台.判('这一台一个字节都不往子进程的键盘输入里写：起一趟就把那一头关掉 —— 万一哪天哪一道漏了 --已确认，它读到的是"读不到输入"，按 pr.mjs 那条老规矩一个字节都不推',
  (ui.match(/stdin\.write\(/g) || []).length === 0 && ui.includes('子.stdin.end();'));
台.判('起了真跑那一道必带 --已确认（屏上已经敲过那个字，pr.mjs 那头不再问第二遍）',
  ui.includes("['src/_build/pr.mjs', '--提交PR', '--已确认']") &&
  ui.includes("['src/_build/pr.mjs', '--推前瞻支', '--推=' + 项.join(','), '--已确认']"));
台.判('那一份单不在界面里另写一套：/api/摊单 直接叫 pr.mjs 那两颗算好的（提交单 / 前瞻单）',
  ui.includes('前瞻单(递).单') && ui.includes('提交单().单') && /if\(路 === '\/api\/摊单'\)/.test(ui));
台.判('pr.mjs 那两颗摊单全是只读的：一根指针都不挪（update-ref 只在 本轮那一支 与 --开这一轮的支 那两道里）',
  ['前瞻单', '提交单', '看那一支'].every(f => !/update-ref/.test(切(pr.replace(/^export /gm, ''), f))));
台.判('往远程送东西这一台只有那两个口子：没有"推 main"那一颗 —— 第一次建远程 main 那一颗用完就整块拆了（2026-10-14 上午他敲字推的那一次）',
  !/建远程/.test(ui) && !/建远程/.test(pg) && !/建远程/.test(pr) && !/'push'[^\n]*'main'/.test(pr));
台.判('屏上是点钮 → 先拿单 → 才开那一格输入框，日志中段不再冒框',
  pg.includes('async function 摊着来(') && pg.includes('function 开确(') && pg.includes("取('确').classList.add('开')") &&
  !pg.includes("全.includes('确认词：')") && !pg.includes('取(\'确\').classList.remove(\'开\');\n  跑着'));
台.判('屏上比的也是同一颗字：敲错了当场说一句"一个字节都没送"，请求都不发',
  pg.includes('if(答 !== (状.确认词') && pg.includes('一个字节都没送'));
台.判('只许一趟在跑：上一趟没跑完就起第二趟，回绝并报名字',
  起.includes('上一趟还没跑完'));

台.题('五、台子砸不了');
台.判('坏编码的 URL 不砸台子：还原砸了就用原样比', /const 拆路 = u => \{ try\{\{?return decodeURIComponent/.test(ui) || ui.includes('try{ return decodeURIComponent(u); }catch(e){ return u; }'));
台.判('端口被占报的是人话，还给出换端口那一条', ui.includes('EADDRINUSE') && ui.includes('换个端口'));
台.判('读不到页面那一颗时报的是它的名字，不是一句 500', ui.includes('读不到 ') && ui.includes('页面路'));
台.判('读不懂送来的东西就回空对象，不炸（界面上少写一格也不至于崩台）', /try\{ 收\(JSON\.parse\(文 \|\| '\{\}'\)\)/.test(ui));

台.题('六、双击那一颗入口');
台.判('入口在 src\\tools\\push-fd.bat，指的就是这一台', fs.existsSync(ROOT + 'src/tools/push-fd.bat') && bat.includes('node push-ui.mjs'));
台.判('那颗是 CRLF（cmd.exe 读 LF 会吃行首，这一条早钉过）', /\r\n/.test(bat) && !/[^\r]\n/.test(bat));
台.判('它开的端口和这一台的默认端口是同一串（写死两处，比一次）',
  new RegExp('start http://127\\.0\\.0\\.1:' + /PORT \|\| (\d+)/.exec(ui)[1] + '/').test(bat));
台.判('没有 node 的时候给话并停住，不闪退', bat.includes('没找到 node') && bat.includes('pause'));
台.判('浏览器等一秒再开：台子还没听就冲过去，那一屏只会是白的', bat.includes('timeout /t 1'));

台.题('七、界面那一屏说的还是那六条');
台.判('一屏里能看见：会不会动、号从哪一串到哪一串、动了哪些份、更新描述',
  ['会不会动', '现在挂的号', '动了哪些份', '更新描述'].every(k => pg.includes(k)));
台.判('那一份单的框把话说全：空着、别的字一律不送；pr.mjs 那一头那份单里 main、assemble 那条拼装的分支、tag、集成分支都写明不推',
  pg.includes('一个字节都不送') && pg.includes('这一趟一个字节都不送') &&
  pr.includes('main：不推（只能你人工合并）· assemble 那条拼装的分支：不推 · tag：不推') &&
  pg.includes('合并由你在 GitHub 网页上人工点'));
台.判('「开始发」先把界面上改的两样写回文件再起那一趟（不让他改了没存就发）',
  pg.includes("if(await 存(true)) 跑('发'") && pg.includes('async function 存'));
台.判('这一台自己的头部注释说清它不实现发布动作（他读脚本一眼就知道边界）',
  ui.includes('这一台不自己实现任何发布动作') && ui.includes('一份清单文件、一条链、一个字'));

台.题('九、git 叫不动的时候，那一屏不许装成"盘上干净"（2026-10-12 双击起台子被骗过一回）');
{
  台.判('1 跑git 分得清问出来与问不出：回的是 { 好, 文, 话 }，不是一律一个空串',
    /function 跑git\(args\)\{/.test(ui) && ui.includes('好: true, 文: execFileSync') && ui.includes('好: false, 文: \'\', 话:'));
  台.判('2 现场那一眼：问不出报 脏 = -1（不是 0），并带 git好 / git话 给屏上说；问不出就不问合并状态、不列前瞻支',
    ui.includes('脏: 脏单 ? 脏单.length : -1') && ui.includes('git好: 问脏.好 && 问站.好') &&
    ui.includes('if(支 && 问脏.好 && 支名收(支))') && ui.includes('前瞻: 问脏.好 ? 本地前瞻支() : []'));
  台.判('3 那十四道要动 git 的（量 / 同步 / 开支 / 落笔 / 推项 / 查 / 快进 / 删支 / 自测 / 完整 / 提交 PR / 摊单 / 打包发版 / 重建集成分支）' +
    '起子进程之前各问一次，问不出就 503 什么都不做',
    (ui.match(/git不中\(res\)/g) || []).length === 14 && ui.includes('const 叫得动git') && ui.includes('发(res, 503,'),
    (ui.match(/git不中\(res\)/g) || []).length);
  台.判('4 屏上那行话跟着改口：问不出写「盘上问不出（git 叫不动）」，只有真量到 0 处才写「本地改动都提交完了」',
    pg.includes('对.脏 < 0 ?') && pg.includes('盘上问不出') && pg.includes("'本地改动都提交完了'") &&
    pg.includes('git坏 = 对.git好 === false') && pg.includes('id="git警"'));
  台.判('5 四颗钮一起不亮（量 / 提交 PR / 打包发版 / 重建集成分支），不让人对着假数点下去',
    pg.includes('取(\'量\').disabled = 对.在跑 || git坏') && pg.includes('底 = !对.清单在 || 对.在跑 || git坏') &&
    pg.includes('取(\'发\').disabled = !对.清单在 || git坏') && pg.includes('n === 0 || 跑着 || git坏'));
  台.判('6 双击那个起台的先认一遍系统路径、再往那几个常见位置找 git，找不到就把话说在前头（且没写死本机绝对路径）',
    bat.includes('where git >nul 2>nul') && bat.includes('%ProgramFiles%\\Git\\cmd') &&
    bat.includes('%USERPROFILE%\\.qoder-cn\\bin\\git\\cmd') && bat.includes('这一台找不到 git') &&
    !/\b[A-Za-z]:[\\/]/.test(bat), '那一条正则抓到盘符就是泄露本机路径');
}

台.题('十、图标素材那一栏并进这一台（他 2026-10-12 点的两半之一）：读那份现成的索引，不搜第二套');
{
  const 索 = rd('src/_build/ico-index.mjs');
  const 那串 = /const EXT = \[([^\]]*)\]/.exec(索);
  const 这台 = /const 图标后缀 = \[([^\]]*)\]/.exec(ui);
  台.判('1 六个后缀与那颗索引脚本那一份同字（两边各写一套，早晚一台认 webp 一台不认）',
    !!那串 && !!这台 && 那串[1].replace(/\s/g, '') === 这台[1].replace(/\s/g, ''), 那串 && 那串[1] + ' ≠ ' + (这台 && 这台[1]));
  台.判('2 每一张是什么、哪份代码叫它几次，读的是 icons\\索引.txt 那一份现成答案；这一台不再自己搜引用（第二套迟早与索引漂移）',
    ui.includes("const 索引路 = path.join(图标层, '索引.txt')") && ui.includes('function 读索引()') &&
    !/git grep/.test(ui) && !/'grep'/.test(ui));
  台.判('3 索引文件自己的标题行（中间也带 " = "）不许变成一条图标：段首之前的一律不算数据',
    ui.includes('if(!当段){ continue; }') && ui.includes('段首之前的一律不算数据'));
  台.判('4 插件包那七张按索引说的真位置取（data\\plugins\\<包>\\images\\icon.<后缀>），不混进 icons 那一格里比"丢图"',
    ui.includes("path.join(插件层, 包, 'images', 档)") && ui.includes("const 插件层 = process.env.FD_PLUGINS") &&
    ui.includes('const 通用没图 =') && ui.includes('插件丢图: 插件.filter(x => !x.在不在)'));
  台.判('5 取图那两道路径闸：icons 那一格以外不认、子目录不许往外钻；插件那张只认合式的包名与 icon.<六种后缀>',
    ui.includes('只认 icons 这个文件夹里的图') && ui.includes('全.startsWith(根 + path.sep)') &&
    ui.includes("^[a-z0-9][a-z0-9-]*$") && ui.includes('jpe?g') &&
    ui.includes('插件包那张图标只认'));
  台.判('6 「重新对齐一遍」那颗跑的就是那颗现成的索引脚本，这一台自己从不写那份索引',
    ui.includes("起(['src/_build/ico-index.mjs']") && !/writeFileSync\([^)]*索引/.test(ui));
  台.判('7 屏上三页签在（版本与推送 / 图标素材 / 界面文字），图标那一栏列出干什么、引用、大小、预览，图标索引没登记、没这张图、取不到文件都分开报',
    pg.includes('id="t版"') && pg.includes('id="t图"') && pg.includes('id="t字"') &&
    pg.includes('图标索引里还没有这一张') && pg.includes("' · 取不到这个文件'") && pg.includes('没登记') && pg.includes('alt="'));
  台.判('8 界面文字那一栏也接上了：一屏只画挑中的那一页、能搜、五颗手（刷新清单 / 保存句子 / 预览改动 / 写进源码 / 重新生成产物）都在；'
    + '落点是源码，所以不再让人挑「写进哪一张页面」',
    pg.includes('id="字段"') && pg.includes('id="字搜"') &&
    pg.includes('字扫') && pg.includes('字存') && pg.includes('字预') && pg.includes('字落') && pg.includes('字重')
    && !pg.includes('还没接上') && !pg.includes('id="字页"'));
  台.判('9 加、换、删三颗手都在屏上（icons 那一格一张两颗 + 顶上"加一张图"）',
    pg.includes('data-换=') && pg.includes('data-删=') && pg.includes('id="加名"') && pg.includes('id="加档"') &&
    pg.includes('取(\'加送\').onclick'));
  台.判('10 插件包那七张也给「换这张」（同名盖进它自己那一格），但不给「删这张」也不给往包里添新的 —— 那一个文件名写在它的插件清单与那份索引上',
    pg.includes('data-换包=') && pg.includes('发插件封面') && /accept="\.'/.test(pg) &&
    pg.includes('不给改名也不给删') && !/data-删包=/.test(pg));
  台.判('11 「加一张图」挑完文件名字自己填上（照那个文件名改，空格与不许的字符换成横杠），不必自己起英文名',
    pg.includes('const 图名 =') && pg.includes("取('加档').onchange") && pg.includes('名字按挑中的文件填好了')
    && /取\('加送'\)\.onclick[\s\S]{0,300}图名\(档\.name\)/.test(pg));
  台.判('12 界面文字那一栏一行一条不换行：那一格一段（不再切成四列小卡），行里三格排成一排',
    pg.includes('#字格{ grid-template-columns:1fr; }') && pg.includes('.字行{ display:flex')
    && pg.includes("class=\"项 字行\"") && pg.includes('text-overflow:ellipsis'));
  台.判('13 页签选中那一颗不许是黑底配黑字（2026-10-13 他截图：中间那一格成了一团黑）',
    /\.页\.主\{ background:none;/.test(pg));
}

台.题('十一、界面文字那一栏：扫描、排版、预览、写回源码全叫 src\\pack\\uitext.cjs 那一份，这一台不另写一套');
{
  /* 借这一份之前先把"图标那一层"与"插件包那一格"指到沙盒那一格：第十二节要在里面真写、真删、真盖封面，
     不能往他仓根 icons\ 与 data\plugins\ 里落一个字（FD_ICONS 与页面服务那台同名，FD_PLUGINS 是同一类口子） */
  const 沙 = path.join(探针沙盒, '图标那一层-闸跑');
  const 沙包 = path.join(探针沙盒, '插件封面-闸跑');
  fs.mkdirSync(沙, { recursive: true });
  fs.mkdirSync(path.join(沙包, 'notes', 'images'), { recursive: true });
  fs.writeFileSync(path.join(沙包, 'notes', 'images', 'icon.svg'), '<svg>闸跑前那一张</svg>', 'utf8');
  fs.writeFileSync(path.join(沙, '索引.txt'),
    '【图标索引】一张图一行：文件名 = 这是干什么的（引用它的代码）\n\n# —— 通用图标（icons\\ 文件夹）——\ngear = 设置（齿轮）：某处 —— 引用：src/_fd/src/fd3-shell.js×1\ncal = 日历：某处 —— 引用：没有代码直接叫它（可能是备用或已改名）\n');
  process.env.FD_ICONS = 沙;
  process.env.FD_PLUGINS = 沙包;
  const 那 = await import('../../_build/push-ui.mjs');
  const 字 = 那.界面文字那颗;
  const 原 = rd('data/ui-text.yaml');
  const 条 = 字.parse(原);
  const 两 = 条.filter(r => !r.to && !r.del);
  const 一 = 两[0], 二 = 两[1];
  const 写 = 那.文字写;
  const r1 = 写(原, [{ prog:一.prog, page:一.page, from:一.from, to:'闸里试的句子' }, { prog:二.prog, page:二.page, from:二.from, del:true }]);
  台.判('1 存句子只动对得上的那几行的冒号右边：动了 2 行、总行数一字不差、其余各行原样',
    r1.动 === 2 && r1.文.split('\n').length === 原.split('\n').length &&
    原.split('\n').filter((l, i) => l !== r1.文.split('\n')[i]).length === 2, '动了 ' + r1.动 + ' 行');
  台.判('2 写进去再读回来是同一串：那一句读回新句子，划掉那一句读回 del（冒号右边那对空引号是它唯一的记号，不与"没改"混）',
    (() => { const 回 = 字.parse(r1.文);
      const a = 回.find(x => x.prog === 一.prog && x.page === 一.page && x.from === 一.from);
      const b = 回.find(x => x.prog === 二.prog && x.page === 二.page && x.from === 二.from);
      return !!a && a.to === '闸里试的句子' && !a.del && !!b && b.del === true; })(), 一.from.slice(0, 10) + ' / ' + 二.from.slice(0, 10));
  const r2 = 写(原, [{ prog:一.prog, page:一.page, from:'这一句清单里根本没有', to:'不该动任何东西' }]);
  台.判('3 对不上的那一句一个字节都不改（回 0 动、原文一字不差）—— 不拿"没找到"当成"改成空"',
    r2.动 === 0 && r2.文 === 原, '动 ' + r2.动);
  const 带冒 = 条.find(r => /:/.test(r.from));
  台.判('4 一行怎么切成名字与值，用的是 uitext 那一份 kvOf（自己切冒号碰到句子里带冒号的就切错一位，一句都对不上）',
    ui.includes('字.kvOf(s.trim())') && (!带冒 || 写(原, [{ prog:带冒.prog, page:带冒.page, from:带冒.from, to:'试' }]).动 === 1),
    带冒 ? 带冒.from.slice(0, 24) : '（清单里没有带冒号的句子）');
  台.判('5 预览与写进源码都以那一格文件为准（不吃屏上现填的框），并且直接叫 plan / apply 那两颗、只递树与改动两样',
    ui.includes(".filter(r => String(r.to || '').trim() || r.del)") && ui.includes("路 === '/api/文字/预览' ? 字.plan : 字.apply")
    && ui.includes(')(字树, 用);'));
  台.判('6 补一句没填就回绝：清单里一句都没填的时候不起那一趟（免得一屏报「写掉 0 句」）',
    ui.includes('清单里一句都没填'));
  台.判('7 写落完给的是重新生成产物那三趟，屏上那颗「重新生成产物」跑的就是 uitext 里那一颗（这三份脚本的名字没在这一台里抄第二份）',
    ui.includes("路 === '/api/文字/重生成'") && ui.includes('字.artifactBuilds().map(相 => [相])')
    && pg.includes("跑('文字/重生成'") && !/src\/_wnw\/build-kernel/.test(ui));
  台.判('8 那一屏认的树可以用 FD_TREE 指到沙盒那一棵（与图标那一格同一个口子）：生成那三趟跟着这一棵走，不拿沙盒清单去跑他仓里的脚本',
    /const 字树 = process\.env\.FD_TREE/.test(ui) && ui.includes('res, 字树);') && /cwd: 树/.test(起));
  台.判('6 刷新清单那颗跑的就是现成的命令行（uitext 自己有 require.main 那道闸，当零件借不会自己跑起来）',
    ui.includes("起(['src/pack/uitext.cjs']") && rd('src/pack/uitext.cjs').includes('if(require.main === module)'));
  台.判('7 这一份被闸借走时不许占端口（不然跑闸会把你正开着的那一屏顶掉）',
    ui.includes('const 被当命令跑 =') && ui.includes('if(被当命令跑) 服务器.listen') && ui.includes('if(被当命令跑) 服务器.on'));
}

台.题('十二、图标那一格的加、换、删：真跑在沙盒那一格里，删之前先看有没有代码在叫它');
{
  const 沙 = path.join(探针沙盒, '图标那一层-闸跑');
  const 那 = await import('../../_build/push-ui.mjs');
  const 仓里 = fs.readdirSync(path.join(ROOT, 'icons')).length;
  const 甲 = s => Buffer.from(s).toString('base64');
  const 小 = 甲('<svg xmlns="http://www.w3.org/2000/svg"/>');
  const 名 = 'gate-round-trip.svg', 路 = p => path.join(沙, p);
  /* 沙盒那一格里先摆两张真图，配上面那份假索引：gear 说"有代码在叫它"、cal 说"没有代码直接叫它" */
  fs.writeFileSync(路('gear.svg'), 小, 'base64');
  fs.writeFileSync(路('cal.svg'), 小, 'base64');
  fs.rmSync(路(名), { force: true });
  const 加 = 那.图标写(名, 小, '加'), 加完的字节 = fs.readFileSync(路(名)), 加二 = 那.图标写(名, 小, '加');
  const 换 = 那.图标写(名, 甲('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"/>'), '换'), 换完的字节 = fs.readFileSync(路(名));
  台.判('1 加一张：真落进那一层、字节与送来的一致；同名再加被拒（要盖就点「换这张」）',
    加.好 === true && 加.新建 === true && 加完的字节.equals(Buffer.from(小, 'base64')) &&
    加二.好 === undefined && /已经有这一张/.test(String(加二.错)), JSON.stringify(加二).slice(0, 60));
  台.判('2 换这张：同名盖上去、字节变了、不新增文件；换一张本来没有的被拒',
    换.好 === true && 换.新建 === false && !换完的字节.equals(加完的字节) && 换完的字节.toString('utf8').includes('viewBox') &&
    /本来没有这一张/.test(String(那.图标写('gate-none.svg', 小, '换').错)), 换.大 + ' 字节');
  const 删 = 那.图标删(名);
  台.判('3 删这张：索引上说"没有代码直接叫它"才让删（沙盒那份索引里 cal 就是这句），删完文件真没了',
    删.好 === true && !fs.existsSync(路(名)), JSON.stringify(删).slice(0, 60));
  const 拒 = 那.图标删('gear.svg');
  台.判('4 索引上说有代码在叫它（沙盒那份写的 src/_fd/src/fd3-shell.js×1）→ 拒删、把是哪几处报出来、文件原样还在',
    拒.好 === undefined && /有代码在叫这一张/.test(拒.拒 || '') && /fd3-shell/.test(拒.拒 || '') && fs.existsSync(路('gear.svg')),
    (拒.拒 || '').split('\n')[0]);
  const 拒2 = 那.图标删('cal.svg');
  台.判('5 同一份索引里另一张（没有代码叫它）就让删 —— 拒与放行分得开，不是一律放行也不是一律拒',
    拒2.好 === true && !fs.existsSync(路('cal.svg')), JSON.stringify(拒2).slice(0, 50));
  台.判('6 五把守门各说各的话、一个字节不落：说明书本身、往外钻、错后缀、怪字符名、超大文件',
    /说明书/.test(那.图标落点('索引.txt').错) && /往外钻/.test(那.图标落点('../data/x.svg').错) &&
    /六种后缀/.test(那.图标落点('a.txt').错) && /只许字母数字/.test(那.图标落点('图 标.svg').错) &&
    /超过/.test((那.图标写('gate-big.svg', 甲('x'.repeat(600 * 1024)), '加').错) || '') &&
    !fs.existsSync(path.join(沙, 'gate-big.svg')) && !fs.existsSync(path.join(ROOT, 'data', 'x.svg')));
  台.判('7 跑完这一节，你仓根 icons\\ 一个字节没动（文件数与跑前一样，那份说明书也没被改）',
    fs.readdirSync(path.join(ROOT, 'icons')).length === 仓里 && fs.existsSync(path.join(ROOT, 'icons', '索引.txt')),
    仓里 + ' → ' + fs.readdirSync(path.join(ROOT, 'icons')).length);
  台.判('8 那一层可以指到别处（环境变量名与页面服务那台同一个：FD_ICONS），默认才是仓根 icons\\',
    ui.includes("process.env.FD_ICONS ? path.resolve(process.env.FD_ICONS)") && ui.includes("path.join(TREE, 'icons')") &&
    rd('src/_fd/fd-serve.mjs').includes('FD_ICONS'));
  /* ---- 插件包那一张封面：同名盖进它自己那一格（沙盒那一棵，不碰他仓里的包） ---- */
  {
    const 包路 = p => path.join(探针沙盒, '插件封面-闸跑', p);
    const 他仓那一张 = fs.readFileSync(path.join(ROOT, 'data/plugins/notes/images/icon.svg'));
    const 原 = fs.readFileSync(包路('notes/images/icon.svg'));
    const 新 = 甲('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6"/>');
    const 成 = 那.图标写插件('notes', 'icon.svg', 新);
    台.判('9 插件包那一张：换这张真同名盖进 data\\plugins\\<包>\\images\\，字节变了、不新增文件',
      成.好 === true && 成.路径 === 'data/plugins/notes/images/icon.svg' &&
      !fs.readFileSync(包路('notes/images/icon.svg')).equals(原) && fs.readFileSync(包路('notes/images/icon.svg')).includes('viewBox') &&
      fs.readdirSync(包路('notes/images')).length === 1, JSON.stringify(成).slice(0, 70));
    台.判('10 五把守门各拦各的：包名往外钻 / 包名大写 / 文件名换成别的 / 后缀不在六种 / 那一包里本来没这张',
      /小写字母/.test(那.插件封面('../..', 'icon.svg').错) && /小写字母/.test(那.插件封面('Notes', 'icon.svg').错) &&
      /只认 icon/.test(那.插件封面('notes', 'other.svg').错) && /只认 icon/.test(那.插件封面('notes', 'icon.exe').错) &&
      /本来没有那张封面/.test(那.图标写插件('nosuch', 'icon.svg', 新).错), '五道都拦');
    台.判('11 往外钻的文件名拦得住（icon.svg 之外一律拒，../../ 那种连试的机会都不给）',
      /只认 icon/.test(那.插件封面('notes', '../../evil.svg').错) && !fs.existsSync(path.join(ROOT, 'evil.svg')));
    台.判('12 超大与空图都拒、拒完那一张原样不动',
      /超过/.test(那.图标写插件('notes', 'icon.svg', 甲('x'.repeat(600 * 1024))).错) &&
      /是空的/.test(那.图标写插件('notes', 'icon.svg', '').错));
    台.判('13 插件层也能指到别处（FD_PLUGINS），默认才是仓里 data\\plugins\\',
      ui.includes("process.env.FD_PLUGINS ? path.resolve(process.env.FD_PLUGINS)") && ui.includes("path.join(TREE, 'data', 'plugins')"));
    台.判('14 跑完这一节，你仓里 data\\plugins\\notes 那一张封面一个字节没动（逐字节比跑前那一份）',
      fs.readFileSync(path.join(ROOT, 'data/plugins/notes/images/icon.svg')).equals(他仓那一张),
      '跑前 ' + 他仓那一张.length + ' 字节');
  }
  fs.rmSync(沙, { recursive: true, force: true });
  fs.rmSync(path.join(探针沙盒, '插件封面-闸跑'), { recursive: true, force: true });
}

台.题('十三、那一行「远端 main 里有了」不许骗人（2026-10-13 他截图抓到：站在重构支上却被说成远端已合）');
{
  const 场 = 切(ui, '现场');
  /* 数的是「同一枚键名写了两遍」这一种错：只认紧跟在 { 或 , 后面的那一枚整名 远端 */
  const 枚数 = (场.replace(/\n\s*/g, ' ').match(/[{,]\s*远端\s*:/g) || []).length;
  台.判('现场() 那一格里 远端 只许出现一枚（同一枚键写两遍，后一枚会把前一枚布尔值顶掉）· 现在 ' + 枚数 + ' 枚',
    枚数 <= 1 && 场.includes('远端笔:!!状.远端笔') && 场.includes('远端名:状.远端'),
    (场.split('\n').find(l => l.includes('查合并(支')) || '（切不到那一行）').trim());
  const 那 = await import('../../_build/push-ui.mjs');
  const 合 = 那.现场().支名合 || {};
  台.判('真跑一趟现场()：远端笔 是布尔、远端名 才是那串名字（拿名字当布尔判 = 只要配过远端就永远报「远端里有了」）',
    typeof 合.远端笔 === 'boolean' && typeof 合.本地 === 'boolean' && typeof 合.远端名 === 'string',
    JSON.stringify({ 本地:合.本地, 远端笔:合.远端笔, 远端名:合.远端名 }));
  台.判('屏上那一行判的是 合.远端笔，不是 合.远端',
    pg.includes('合 && 合.远端笔') && !/合 && 合\.远端\)/.test(pg));
  台.判('这一条不是空跑：现场() 真回了一串查合并的话（' + String(合.一眼 || '').slice(-56) + '）',
    typeof 合.一眼 === 'string' && /merge-base --is-ancestor/.test(合.一眼));
  /* ---- 灰掉的钮自己要说为什么灰（他原话：「提交PR为什么毫无反应」—— 点在一颗灰钮上本来什么都不发生） ---- */
  const 等 = 切(pg, '等字');
  台.判('等字() 除了点那两栏空着的说明，还给「这两颗这会儿不亮」写了话：量在跑 / 没清单 / 这条分支没合进 main 三种各说各的',
    等.includes('小助手一次只跑一趟') && 等.includes('还没有那张表') && 等.includes('还没合进 main') &&
    等.includes('merge --ff-only'), (等.match(/话\.push\([^\n]*/g) || []).length + ' 句');
  台.判('那条「人工 merge」的话里带的是哪一棵树与哪个远端（现场() 真回了 树 与 远端名，不是屏上自己编）',
    typeof 那.现场().树 === 'string' && 那.现场().树.length > 3 && typeof 合.远端名 === 'string' && 合.远端名.length > 0,
    那.现场().树 + ' · 远端 ' + 合.远端名);
  台.判('一起跑那一趟的当下就把这话写出来（跑() 一开头就调 等字()，不是等跑完才补）',
    /跑着 = true;[^\n]*等字\(\)/.test(pg));
}

台.收尾();
