/* ============================================================
   gate-texticon46.mjs · 外46 七：文字与图标那一屏（src\_build\text-icon.mjs + text-icon.html + src\tools\text-icon.bat）
   ------------------------------------------------------------
     node src/tools/probes/gate-texticon46.mjs
   钉的是这一台「只管两样、两件都不越界」：
     一、它不实现任何发布动作 —— 起的子进程只有刷新清单、重新生成产物、重新对齐索引那三颗，git 只读不写，不碰密钥，不起他的程序；
     二、只听 127.0.0.1，写请求不带那一枚随机码就拒；被闸当零件借进去时不许占端口；
     三、界面上看到的与写回去的那两样都只有一份：句子住在 src\pack\uitext.cjs，图标那张表住在 icons\索引.txt 与 src\_build\ico-index.mjs；
     四、git 叫不动的时候顶上那一行只许说"问不出"，不许装成"盘上干净"；
     五、加、换、删一张图与存句子、预览、写回源码，全部在沙盒那一棵里真跑，不拿正则糊过去。
   2026-10-16 那一页「版本与推送」整块撤了（他点的：这一台只留改文字与改图标）—— 原来钉推送的那几节
   （那张清单同源、最后那一个字他亲手给、那一行「远端 main 里有了」不许骗人）跟着那一页一起删了；
   那些动作还在命令行里（src\_build\pr.mjs 与 src\_build\release.mjs），这一台连 import 都不 import。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, rd, 切, 尺在, rd在, 记账 } from './lib-slice.mjs';
import { 探针沙盒 } from '../本地路径.mjs';

const 台 = 记账('gate-texticon46');
const ui = rd('src/_build/text-icon.mjs');
const pg = rd('src/_build/text-icon.html');
const bat = rd('src/tools/text-icon.bat');
const 起 = 切(ui, '起连');        /* 那一趟真 spawn 的手艺在这一颗里（起() 只是单趟的那层薄壳） */

/* ---------- 先把那一层与那一格指到沙盒，再借这一份进来 ----------
   图标那一层、插件那一格、界面文字那一棵都是 text-icon.mjs **加载那一刻**按环境变量算好的，晚设一步就没用了：
   2026-10-17 这一版闸先在第二节 import 了一遍（那时环境变量还没设），后面真跑那颗 图标写 就朝仓根 icons\ 落了一张字。
   顺序记在这儿当教训，下面第七、第八节全用这一颗 那。 */
const 沙 = path.join(探针沙盒, '图标那一层-闸跑');
const 沙包 = path.join(探针沙盒, '插件封面-闸跑');
fs.rmSync(沙, { recursive: true, force: true });
fs.rmSync(沙包, { recursive: true, force: true });
fs.mkdirSync(沙, { recursive: true });
fs.mkdirSync(path.join(沙包, 'notes', 'images'), { recursive: true });
fs.writeFileSync(path.join(沙包, 'notes', 'images', 'icon.svg'), '<svg>闸跑前那一张</svg>', 'utf8');
fs.writeFileSync(path.join(沙, '索引.txt'),
  '【图标索引】一张图一行：文件名 = 这是干什么的（引用它的代码）\n\n# —— 通用图标（icons\\ 文件夹）——\ngear = 设置（齿轮）：某处 —— 引用：src/_fd/src/fd3-shell.js×1\ncal = 日历：某处 —— 引用：没有代码直接叫它（可能是备用或已改名）\n');
process.env.FD_ICONS = 沙;
process.env.FD_PLUGINS = 沙包;
const 那 = await import('../../_build/text-icon.mjs');

台.题('一、这一台只管两样，不实现发布动作');
{
  const 叫 = [...ui.matchAll(/跑git\(\['([^']+)'/g)].map(m => m[1]);
  const 路由 = [...new Set([...ui.matchAll(/路 === '(\/api\/[^']+)'/g)].map(m => m[1]))].sort();
  const 该有 = ['/api/图柜', '/api/图柜/一张', '/api/图标', '/api/图标/一张', '/api/图标/加', '/api/图标/删', '/api/图标/对齐', '/api/图标/换',
    '/api/现场', '/api/文字', '/api/文字/存', '/api/文字/扫', '/api/文字/落', '/api/文字/预览', '/api/文字/重生成'].sort();
  台.判('这一台只开该开的那几格，推送那一摊的路由一格不剩（量 / 摊单 / 推项 / 快进 / 删支 / 自测 / 完整 / 集成 / pr / 发 / 开产物 都不在）',
    JSON.stringify(路由) === JSON.stringify(该有) && !/摊单|推项|快进|删支|自测|集成|开产物/.test(ui), 路由.join('、'));
  台.判('起的子进程只有那三颗：刷新清单（src/pack/uitext.cjs）、重新生成产物（uitext 那份 artifactBuilds() 的名单）、重新对齐索引（src/_build/ico-index.mjs）—— 没有第二道口子',
    (ui.match(/起\(\['/g) || []).length === 2 && ui.includes("['src/pack/uitext.cjs']") &&
    ui.includes("['src/_build/ico-index.mjs']") && ui.includes('字.artifactBuilds().map(相 => [相])') &&
    !/'src\/_build\/(release|pr)\.mjs'/.test(ui), (ui.match(/起\(\['[^\]]*\]/g) || []).join(' '));
  台.判('那四本（push-list / pr / version / forward-features）这一份一概不再 import —— 推送那一摊不留一根线在这一台里',
    !/from '\.\/(push-list|pr|version|forward-features)\.mjs'/.test(ui));
  台.判('这一台里一件 git 写活都没有：不落笔、不挪指针、不打 tag、不推',
    !/commit-tree|update-ref|write-tree|hash-object|merge-tree|'tag'|"tag"|'push'|"push'|往那一支写|同步那一支|拼装\(/.test(ui));
  台.判('跑的 git 只被读的那三样叫到（status / rev-parse / --version），此外一句 git 都不叫',
    叫.length === 3 && 叫.every(a => ['status', 'rev-parse', '--version'].includes(a)), 叫.join('、'));
  台.判('不起他的程序：Flow-Desk.exe 只出现在 tasklist 那一眼里，没有 spawn 它',
    (ui.match(/Flow-Desk\.exe/g) || []).length === 1 && /tasklist/.test(ui) && !/spawn\([^)]*Flow-Desk/.test(ui));
  台.判('不读不写任何密钥：没有令牌、口令那几样，spawn 也不另传环境变量（这一台什么都不往远程送）',
    !/token|password|secret|PAT\b/.test(ui) && !/env:/.test(起));
  台.判('一个字节都不往子进程的键盘输入里写：起一趟就把那一头关掉',
    (ui.match(/stdin\.write\(/g) || []).length === 0 && 起.includes('子.stdin.end();'));
  台.判('只许一趟在跑：上一趟没跑完就起第二趟，回绝并报名字', 起.includes('上一趟还没跑完'));
  台.判('浏览器那一头半路关掉不许掐子进程（它正往仓里落笔）', /子\.on\('close'/.test(起) && !/当值\.手\.kill/.test(起));
}

台.题('二、只听本机、只认这一页、被闸借走时不许占端口');
台.判('只往 127.0.0.1 听，端口默认 8792（8791 是那台页面服务的，各占一个）',
  ui.includes("服务器.listen(PORT, '127.0.0.1'") && /PORT \|\| 8792/.test(ui));
台.判('那一枚随机码是起台子时现生成的，写请求不带就拒',
  /const 码 = crypto\.randomBytes/.test(ui) && /req\.headers\['x-push-code'\] !== 码/.test(ui) && pg.includes("'x-push-code':码"));
台.判('这一份被闸借走时不许听端口、也不许挂 error（不然跑闸会把你正开着的那一屏顶掉）',
  ui.includes('const 被当命令跑 =') && ui.includes('if(被当命令跑) 服务器.listen') && ui.includes('if(被当命令跑) 服务器.on'));
{
  台.判('4 真借一遍：import 进来之后 被当命令跑 是假，端口没被占（这一台 8792 还归你双击那一颗）',
    那.被当命令跑 === false, String(那.被当命令跑));
  const 落 = 那.图标落点('gear.svg');
  台.判('5 借进来的这一份，图标那一层认的是沙盒那一格、插件那一格也是（认错了就是往你仓根 icons\ 里落字、往 data\plugins\ 里盖封面）',
    落.根 === path.resolve(沙) && path.resolve(那.插件层) === path.resolve(沙包), 落.根 + ' / ' + 那.插件层);
}

台.题('三、双击那一颗入口');
台.判('入口在 src\\tools\\text-icon.bat，指的就是这一台', 尺在('src/tools/text-icon.bat') && bat.includes('node text-icon.mjs'));
台.判('那颗是 CRLF（cmd.exe 读 LF 会吃行首，这一条早钉过）', /\r\n/.test(bat) && !/[^\r]\n/.test(bat));
台.判('它开的端口和这一台的默认端口是同一串（写死两处，比一次）',
  new RegExp('start http://127\\.0\\.0\\.1:' + /PORT \|\| (\d+)/.exec(ui)[1] + '/').test(bat));
台.判('没有 node 的时候给话并停住，不闪退', bat.includes('没找到 node') && bat.includes('pause'));
台.判('浏览器等一秒再开：台子还没听就冲过去，那一屏只会是白的', bat.includes('timeout /t 1'));
台.判('顶上那几行说明说的是这一台现在管的这两样，不再提"量、提交、打包、重建集成分支"那四道（2026-10-16 整块撤了的那一页）',
  bat.includes('只管两样') && bat.includes('改界面上的句子') && !/重建集成分支|推送这一屏|那四颗都不亮/.test(bat));

台.题('四、台子砸不了');
台.判('坏编码的 URL 不砸台子：还原砸了就用原样比', /const 拆路 = u => \{ try\{ return decodeURIComponent/.test(ui));
台.判('端口被占报的是人话，还给出换端口那一条', ui.includes('EADDRINUSE') && ui.includes('换个端口'));
台.判('读不到页面那一颗时报的是它的名字，不是一句 500', ui.includes('读不到 ') && ui.includes('页面路'));
台.判('读不懂送来的东西就回空对象，不炸（界面上少写一格也不至于崩台）', /try\{ 收\(JSON\.parse\(文 \|\| '\{\}'\)\)/.test(ui));

台.题('五、git 叫不动的时候，顶上那一行不许装成"盘上干净"（2026-10-12 双击起台子被骗过一回）');
{
  台.判('1 跑git 分得清问出来与问不出：回的是 { 好, 文, 话 }，不是一律一个空串',
    /function 跑git\(args\)\{/.test(ui) && ui.includes('好: true, 文: execFileSync') && ui.includes('好: false, 文: \'\', 话:'));
  台.判('2 现场那一眼：问不出报 脏 = -1（不是 0），并带 git好 / git话 给屏上说',
    ui.includes('脏: 脏单 ? 脏单.length : -1') && ui.includes('git好: 问脏.好 && 问站.好') && ui.includes('git话: 叫得动git()'));
  台.判('3 这一台不拿 git 当门槛：那一道 503（"量 / 提交 PR / 打包发版 / 重建集成分支这四道都要叫得动 git"）跟着那一页一起撤了，现在一台里一处 503 都没有',
    !/503/.test(ui) && !/git不中/.test(ui));
  台.判('4 屏上那行话跟着改口：问不出写「盘上问不出」，只有真量到 0 处才写「本地改动都提交完了」',
    pg.includes('问不出 = 对.git好 === false') && pg.includes('盘上问不出') && pg.includes("'本地改动都提交完了'") && pg.includes('id="git警"'));
  台.判('5 那两样照旧能使：改句子与改图标那几颗钮只按「上一趟还在跑」按住，不因为 git 叫不动就按住',
    /钮\.disabled = 跑着;/.test(pg) && !/跑着 \|\| git坏/.test(pg));
  台.判('6 双击那个起台的先认一遍系统路径、再往那几个常见位置找 git，找不到就把话说在前头（且没写死本机绝对路径）',
    bat.includes('where git >nul 2>nul') && bat.includes('%ProgramFiles%\\Git\\cmd') &&
    bat.includes('%USERPROFILE%\\.qoder-cn\\bin\\git\\cmd') && bat.includes('找不到 git') &&
    !/\b[A-Za-z]:[\\/]/.test(bat), '那一条正则抓到盘符就是泄露本机路径');
}

台.题('六、图标素材那一栏：读那份现成的索引，不搜第二套');
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
  台.判('7 屏上两栏在（图标素材 / 界面文字），「版本与推送」那一栏与那一枚对话框都不许留壳；图标那一栏列出干什么、引用、大小、预览，索引没登记、没这张图、取不到文件分开报',
    pg.includes('id="t图"') && pg.includes('id="t字"') && !pg.includes('id="t版"') && !pg.includes('id="p版"') &&
    !pg.includes('class="挡') && !pg.includes('摊着来(') &&
    pg.includes('图标索引里还没有这一张') && pg.includes("' · 取不到这个文件'") && pg.includes('没登记') && pg.includes('alt="'));
  台.判('8 加、换、删三颗手都在屏上（icons 那一格一张两颗 + 顶上"加一张图"）',
    pg.includes('data-换=') && pg.includes('data-删=') && pg.includes('id="加名"') && pg.includes('id="加档"') &&
    pg.includes('取(\'加送\').onclick'));
  台.判('9 插件包那七张也给「换这张」（同名盖进它自己那一格），但不给「删这张」也不给往包里添新的 —— 那一个文件名写在它的插件清单与那份索引上',
    pg.includes('data-换包=') && pg.includes('发插件封面') &&
    pg.includes('不给改名也不给删') && !/data-删包=/.test(pg));
  台.判('9b 屏上只剩两处选文件的地方（图标柜那一行与「加一张图」那一行），六后缀写死在 accept 里；每张卡上那枚隐藏 file input 撤了',
    (pg.match(/accept="\.svg,\.png,\.jpg,\.jpeg,\.webp,\.gif"/g) || []).length === 2 && !/hidden data-档=/.test(pg));
  台.判('10 「加一张图」挑完文件名字自己填上（照那个文件名改，空格与不许的字符换成横杠），不必自己起英文名',
    pg.includes('const 图名 =') && pg.includes("取('加档').onchange") && pg.includes('名字按挑中的文件填好了')
    && /取\('加送'\)\.onclick[\s\S]{0,300}图名\(档\.name\)/.test(pg));
  台.判('11 页签选中那一颗不许是黑底配黑字（2026-10-13 他截图：中间那一格成了一团黑）',
    /\.页\.主\{ background:none;/.test(pg));
  台.判('12 那一栏可以指到别处（环境变量名与页面服务那台同一个：FD_ICONS），默认才是仓根 icons\\',
    ui.includes("process.env.FD_ICONS ? path.resolve(process.env.FD_ICONS)") && ui.includes("path.join(TREE, 'icons')") &&
    rd('src/_fd/fd-serve.mjs').includes('FD_ICONS'));
  台.判('13 插件层也能指到别处（FD_PLUGINS），默认才是仓里 data\\plugins\\',
    ui.includes("process.env.FD_PLUGINS ? path.resolve(process.env.FD_PLUGINS)") && ui.includes("path.join(TREE, 'data', 'plugins')"));
}

台.题('七、界面文字那一栏：扫描、排版、预览、写回源码全叫 src\\pack\\uitext.cjs 那一份，这一台不另写一套');
{
  /* 那一层与那一格在文件顶上就指到沙盒了（第七、第八节要在里面真写、真删、真盖封面，
     不能往他仓根 icons\ 与 data\plugins\ 里落一个字：FD_ICONS 与页面服务那台同名，FD_PLUGINS 是同一类口子） */
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
  台.判('7 写落完给的是重新生成产物那几趟，屏上那颗「重新生成产物」跑的就是 uitext 里那一颗名单（是哪几趟不在这一台里抄第二份）',
    ui.includes("路 === '/api/文字/重生成'") && ui.includes('字.artifactBuilds().map(相 => [相])')
    && pg.includes("跑('文字/重生成'") && !/src\/_wnw\/build-kernel/.test(ui) && !/三趟/.test(ui));
  台.判('8 那一屏认的树可以用 FD_TREE 指到沙盒那一棵（与图标那一格同一个口子）：生成那几趟跟着这一棵走，不拿沙盒清单去跑他仓里的脚本',
    /const 字树 = process\.env\.FD_TREE/.test(ui) && ui.includes('res, 字树);') && /cwd: 树/.test(起));
  台.判('9 刷新清单那颗跑的就是现成的命令行（uitext 自己有 require.main 那道闸，当零件借不会自己跑起来）',
    ui.includes("起(['src/pack/uitext.cjs']") && rd('src/pack/uitext.cjs').includes('if(require.main === module)'));
  台.判('10 屏上那一栏一屏一条不换行：那一格一段（不再切成四列小卡），行里三格排成一排',
    pg.includes('#字格{ grid-template-columns:1fr; }') && pg.includes('.字行{ display:flex')
    && pg.includes("'<div class=\"项 字行'") && pg.includes('text-overflow:ellipsis'));
  台.判('11 屏上那五颗手（刷新清单 / 保存句子 / 预览改动 / 写进源码 / 重新生成产物）都在，且不让人挑「写进哪一张页面」（落点是源码）',
    pg.includes('id="字段"') && pg.includes('id="字搜"') &&
    pg.includes('字扫') && pg.includes('字存') && pg.includes('字预') && pg.includes('字落') && pg.includes('字重')
    && !pg.includes('还没接上') && !pg.includes('id="字页"'));
}

台.题('八、图标那一格的加、换、删：真跑在沙盒那一格里，删之前先看有没有代码在叫它');
{
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
  /* ---- 插件包那一张封面：同名盖进它自己那一格（沙盒那一棵，不碰他仓里的包） ---- */
  {
    const 包路 = p => path.join(探针沙盒, '插件封面-闸跑', p);
    /* 插件分离第四刀：data\plugins\<id>\ 那一家不住本仓了 —— 位置与那一张都问尺（本仓先问、再问隔壁那一棵）。
       比的还是同一张封面、同一逐字节判据，只是"到哪儿找那一份"交回 src\_build\邻居.mjs 那一处。 */
    const 那一张 = 'data/plugins/notes/images/icon.svg';
    const 他仓那一张 = fs.readFileSync(rd在(那一张));
    const 原 = fs.readFileSync(包路('notes/images/icon.svg'));
    const 新 = 甲('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6"/>');
    const 成 = 那.图标写插件('notes', 'icon.svg', 新);
    台.判('8 插件包那一张：换这张真同名盖进 data\\plugins\\<包>\\images\\，字节变了、不新增文件',
      成.好 === true && 成.路径 === 'data/plugins/notes/images/icon.svg' &&
      !fs.readFileSync(包路('notes/images/icon.svg')).equals(原) && fs.readFileSync(包路('notes/images/icon.svg')).includes('viewBox') &&
      fs.readdirSync(包路('notes/images')).length === 1, JSON.stringify(成).slice(0, 70));
    台.判('9 五把守门各拦各的：包名往外钻 / 包名大写 / 文件名换成别的 / 后缀不在六种 / 那一包里本来没这张',
      /小写字母/.test(那.插件封面('../..', 'icon.svg').错) && /小写字母/.test(那.插件封面('Notes', 'icon.svg').错) &&
      /只认 icon/.test(那.插件封面('notes', 'other.svg').错) && /只认 icon/.test(那.插件封面('notes', 'icon.exe').错) &&
      /本来没有那张封面/.test(那.图标写插件('nosuch', 'icon.svg', 新).错), '五道都拦');
    台.判('10 往外钻的文件名拦得住（icon.svg 之外一律拒，../../ 那种连试的机会都不给）',
      /只认 icon/.test(那.插件封面('notes', '../../evil.svg').错) && !fs.existsSync(path.join(ROOT, 'evil.svg')));
    台.判('11 超大与空图都拒、拒完那一张原样不动',
      /超过/.test(那.图标写插件('notes', 'icon.svg', 甲('x'.repeat(600 * 1024))).错) &&
      /是空的/.test(那.图标写插件('notes', 'icon.svg', '').错));
    台.判('12 跑完这一节，你仓里 data\\plugins\\notes 那一张封面一个字节没动（逐字节比跑前那一份）',
      fs.readFileSync(rd在(那一张)).equals(他仓那一张),
      '跑前 ' + 他仓那一张.length + ' 字节');
  }
  fs.rmSync(沙, { recursive: true, force: true });
  fs.rmSync(path.join(探针沙盒, '插件封面-闸跑'), { recursive: true, force: true });
}

台.题('九、图标柜（他 2026-10-17 第 2、3 条）：指定一格、真预览、点中一张去换 —— 全在沙盒那一格里真跑');
{
  const 那0 = await import('../../_build/text-icon.mjs');
  const 柜根 = path.join(ROOT, 'icons');                       /* 只读它，一个字都不写 */
  const 柜沙 = 那0.图标落点('gear.svg').根;      /* 这一份认的那一格，不是我自己另起的一格 */
  fs.mkdirSync(柜沙, { recursive: true });
  fs.writeFileSync(path.join(柜沙, '索引.txt'),
    '【图标索引】一张图一行：文件名 = 这是干什么的（引用它的代码）\n\n# —— 通用图标（icons\\ 文件夹）——\ngear = 设置（齿轮）：某处 —— 引用：没有代码直接叫它\n');
  fs.writeFileSync(path.join(柜沙, 'gear.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');
  const 列 = 那0.柜列(柜根);
  台.判('1 列一格真跑：读的是盘上那一份（icons 那一格 ' + 列.张 + ' 张），每张带回 相对名 / 字节 / 后缀，后缀只在这六种里',
    !列.错 && 列.张 > 20 && 列.单.length === 列.张 &&
    列.单.every(x => x.相 && typeof x.大 === 'number' && 那0.图标后缀.includes(x.后)) &&
    列.单.every(x => !/^[A-Za-z]:/.test(x.相) && !x.相.startsWith('..')), 列.根 + ' · ' + 列.张 + ' 张');
  台.判('2 三种"量不到"分得开：不存在的一格报读不到、空着报先写一格、是文件不是文件夹也报明白 —— 不拿空名单冒充"这一格没有图"',
    /读不到这一格/.test(那.柜列(path.join(ROOT, '没有这么一格')).错 || '') && /先写一个文件夹/.test(那.柜列('').错 || '') &&
    /不是文件夹/.test(那.柜列(path.join(ROOT, 'src/_build/text-icon.mjs')).错 || ''));
  台.判('3 取预览那一路三道拦：往外钻的相对名、六种后缀之外、超大那一张 —— 一律拒，不把别处的文件递出去',
    /往外钻/.test(那.柜一张(柜根, '../../../package.json').错 || '') &&
    /六种后缀/.test(那.柜一张(柜根, '索引.txt').错 || '') &&
    /往外钻/.test(那.柜一张(柜根, '../src/_build/text-icon.mjs').错 || '') &&
    !那0.柜一张(柜根, 列.单[0].相).错, 那0.柜一张(柜根, 列.单[0].相).错 || '第一张取到 ' + 那0.柜一张(柜根, 列.单[0].相).字.length + ' 字节');
  {
    /* 真跑一遍他要点的那一手：从柜里挑一张 → 换进 icons 那一格（这一格现在是沙盒）→ 逐字节比 */
    const 挑 = 列.单.find(x => /\.svg$/.test(x.相)) || 列.单[0];
    const 源 = 那0.柜一张(柜根, 挑.相);
    const 落 = 那0.图标写('gear.svg', 源.字.toString('base64'), '换');
    const 盘 = fs.readFileSync(path.join(柜沙, 'gear.svg'));
    台.判('4 端到端真跑：柜里挑中「' + 挑.相 + '」→ 换这张落进 icons 那一格 → 盘上那一份与柜里那一份逐字节一样',
      !源.错 && 落.好 === true && 落.新建 === false && 盘.equals(源.字), '柜里 ' + 源.字.length + ' 字节 → 盘上 ' + 盘.length + ' 字节');
  }
  fs.rmSync(柜沙, { recursive: true, force: true });
  台.判('5 两道路由在（/api/图柜 与 /api/图柜/一张），带 码=1 那一发回 base64 给「点中这张」用；两格都从这一份导出来给闸真跑',
    ui.includes("路 === '/api/图柜'") && ui.includes("路 === '/api/图柜/一张'") && ui.includes("参.get('码')") &&
    /柜列, 柜一张/.test(ui.slice(ui.indexOf('export {'))) && ui.includes('柜MIME'));
  台.判('6 屏上那一窗齐：路径格 / 列这一格 / 找 / 预览格 / 待挑那一句 / 后备那颗选文件，开屏把上一次那一格填回来（存在浏览器本地，这一台不落文件）',
    pg.includes('id="柜路"') && pg.includes('id="柜列"') && pg.includes('id="柜搜"') && pg.includes('id="柜格"') &&
    pg.includes('id="挑话"') && pg.includes('id="柜档"') && pg.includes('id="加柜"') &&
    pg.includes("localStorage.getItem('fd图标柜那一格')") && pg.includes('localStorage.setItem(柜存') &&
    !/图柜/.test(rd('src/pack/publish.mjs')) /* 这一格是开发期的东西，绝不进装出去的那一枚包 */);
  台.判('7 换这张不再走系统那个选文件框（每张卡上那枚隐藏 file input 撤了），改成挂成待挑、到柜里点中一张',
    !/data-档="/.test(pg) && pg.includes("挑 = { 类:'换', 名: 换.dataset['换'] }") &&
    pg.includes("挑 = { 类:'换包'") && pg.includes('async function 送那张(') && pg.includes('柜开口()'));
  台.判('8 图标柜与那一片卡是左右并列（他 2026-10-17 那句「滚动下去了就看不到图标库怎么挑！！换成左右并列」）：两栏网格、柜栏排在卡栏前面、两栏各自定高各自滚、柜栏顶上填路径那一行钉住不动',
    /\.两栏\{ display:grid; grid-template-columns:minmax\(340px,32%\) 1fr/.test(pg) &&
    /\.柜栏\{[^}]*height:calc\(100vh - 150px\)/.test(pg) && /\.卡栏\{ height:calc\(100vh - 150px\); overflow:auto/.test(pg) &&
    /\.柜栏 > \.行\{ position:sticky/.test(pg) &&
    pg.indexOf('class="两栏"') < pg.indexOf('class="柜栏"') && pg.indexOf('class="柜栏"') < pg.indexOf('class="卡栏"') &&
    pg.indexOf('id="柜格"') < pg.indexOf('id="图格"'));
}

台.题('十、界面文字那一栏收紧（他 2026-10-17 第 1 条）：三格不再拉满整行，勾的是哪一句要看得出来');
台.判('1 原句与输入框各给一个定宽（从前输入框 flex:1 拉满，勾那颗被顶到最右边，中间一大片空白）',
  /\.字行 \.句\{ flex:0 0 24em/.test(pg) && /\.字行 input\[type=text\]\{ flex:0 0 24em/.test(pg) &&
  !/\.字行 input\[type=text\]\{ flex:1 1 auto/.test(pg));
台.判('2 那一行的样式在：整行底色 + 左边一道红 + 原句划掉 + 鼠标走过看得见',
  /\.字行\.删\{ background:#fbeeea/.test(pg) && /\.字行\.删 \.句\{ text-decoration:line-through/.test(pg) &&
  /\.字行:hover\{ background:/.test(pg));
台.判('2b 勾一下当场翻那一行的状态（不用等「保存这些句子」）',
  /classList\.toggle\(['"]删['"]/.test(pg));
台.判('2c 画出来时就带上已勾的那几条（重看一遍之后，勾着的还是勾着的）',
  /项 字行' \+ \(r\.del/.test(pg) && /r\.del \? ' 删' : ''/.test(pg));

台.收尾();
