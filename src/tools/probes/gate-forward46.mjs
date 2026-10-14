/* ============================================================
   闸 · 八项前瞻功能与「勾哪几项进这一枚包」
   ------------------------------------------------------------
   钉的是他 2026-10-13 逐条给定的那八项：一项一条本地前瞻分支，基础那一支没有它、前瞻分支把它加回来；
   带哪几项进包由他在屏上勾；装好的软件里不许出现档位字样。
     node src/tools/probes/gate-forward46.mjs
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { 记账, rd, ROOT } from './lib-slice.mjs';
import { 八项, 认这项, 中文名, 分支of, 现在带不带, 合那一棵, 摊打包那一棵, 硬链接一份 } from '../../_build/forward-features.mjs';

const 台 = 记账('gate-forward46');
const 名单文 = rd('src/_build/forward-features.mjs');
const 发布文 = rd('src/_build/release.mjs');
const 屏文 = rd('src/_build/push-ui.html');
const 台文 = rd('src/_build/push-ui.mjs');

台.题('一 · 名单只有一份，八项一项一格（id · 中文名 · 分支 · 动的地方哪几处）');
台.判('八项齐（词格模式、音乐遥控器停靠、热力图、推演组件定制、空白网页、双栏停靠、卡片出场权重、推演记录）',
  八项.length === 8 && ['词格模式', '音乐遥控器停靠', '写作统计的热力图', '推演组件定制',
    '标签页加号打开空白网页', '双栏停靠', '卡片出场权重', '推演记录'].every(n => 八项.some(x => x.中文 === n)),
  八项.map(x => x.中文).join('、'));
台.判('id 不重复、分支名一律 feature/new/ 起头（前瞻支那一类），一项一条',
  new Set(八项.map(x => x.id)).size === 8 && 八项.every(x => /^feature\/new\/[\w-]+$/.test(x.分支) && x.分支.endsWith(x.id)),
  八项.map(x => x.分支).join(' '));
台.判('每一格都写了这一项动的是哪几处（不写「等等」，也不留空）',
  八项.every(x => Array.isArray(x.动的地方) && x.动的地方.length >= 1 && x.动的地方.every(s => s.length > 3 && !/等[等]$/.test(s))),
  八项.map(x => x.中文 + x.动的地方.length).join('、'));
台.判('两种形状各归各：整份文件那种写了路径，开关那种写明是要在几处开口子',
  八项.filter(x => x.形状 === 'whole-file').length === 4 && 八项.filter(x => x.形状 === 'switch').length === 4 &&
  八项.filter(x => x.形状 === 'whole-file').every(x => x.动的地方.some(s => /^[\w./-]+/.test(s))),
  'whole-file 4 · switch 4');
台.判('认这项三种写法都认（id、中文名、整条分支名），认不出回空',
  认这项('heat-map') === 'heat-map' && 认这项('推演记录') === 'gen-log' &&
  认这项('feature/new/music-dock') === 'music-dock' && 认这项('瞎写') === '' && 中文名('gen-log') === '推演记录' &&
  分支of('card-weight') === 'feature/new/card-weight');
台.判('这一棵现在带不带是量出来的，不是猜的：整份文件那种看文件在不在',
  现在带不带(ROOT, 八项.find(x => x.id === 'heat-map')).带 === fs.existsSync(ROOT + 'src/_wnw/src/w21-heat.js') &&
  现在带不带(ROOT, 八项.find(x => x.id === 'gen-log')).带 === fs.existsSync(ROOT + 'src/_shared/sh-log.js'));
台.判('八项每一项都登记了怎么量（路径或"哪一份里还有哪一串"），没有一项靠「带着」蒙 —— 屏上那行「这一棵：带着」背后要有凭据',
  八项.every(x => (x.量这份 || []).length || (x.量这句 || []).length) &&
  现在带不带(ROOT, 八项.find(x => x.id === 'lyric-grid')).话.includes('份在盘上') &&
  现在带不带(ROOT, 八项.find(x => x.id === 'card-weight')).话.includes('句还在源码里') &&
  /没登记怎么量/.test(现在带不带(ROOT, { id: 'x', 中文: '没登记的' }).话));

台.题('二 · 合那一棵真跑（沙盒里造一棵小仓：主干没有那一项 + 一条 feature/new/heat-map 加回来）');
const 沙 = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-forward46-'));
const 仓 = path.join(沙, 'repo');
const g = (... a) => execFileSync('git', a, { cwd: 仓, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
fs.mkdirSync(仓, { recursive: true });
g('init', '-q', '-b', 'main');
g('config', 'user.name', 't'); g('config', 'user.email', 't@invalid');   /* 沙盒那一棵自己的身份，不碰全局那一份 */
fs.writeFileSync(path.join(仓, 'a.txt'), '主干\n');
g('-c', 'user.name=t', '-c', 'user.email=t@invalid', 'add', '-A');
g('-c', 'user.name=t', '-c', 'user.email=t@invalid', 'commit', '-qm', '基础那一支：这一项不在');
g('checkout', '-q', '-b', 'feature/new/heat-map');
fs.mkdirSync(path.join(仓, 'src/_wnw/src'), { recursive: true });
fs.writeFileSync(path.join(仓, 'src/_wnw/src/w21-heat.js'), '热力图那份\n');
g('-c', 'user.name=t', '-c', 'user.email=t@invalid', 'add', '-A');
g('-c', 'user.name=t', '-c', 'user.email=t@invalid', 'commit', '-qm', '前瞻支：把这一项加回来');
g('checkout', '-q', 'main');
{
  const 果 = 合那一棵(仓, 'main', ['heat-map'], path.join(沙, '那一格'));
  台.判('勾上那一项：那一格里有那份文件（回执报的是哪条支合成了哪一笔）',
    fs.existsSync(path.join(果.目录, 'src/_wnw/src/w21-heat.js')) && 果.合了.length === 1 &&
    果.合了[0].中文 === '写作统计的热力图' && /^[0-9a-f]{7}$/.test(果.合了[0].笔));
  const 裸 = 合那一棵(仓, 'main', [], path.join(沙, '裸'));
  台.判('一条都不勾 = 基点那一棵原样（那份文件不在）', !fs.existsSync(path.join(裸.目录, 'src/_wnw/src/w21-heat.js')));
  let 抛 = '';
  try { 合那一棵(仓, 'main', ['gen-log'], path.join(沙, '不该有')); } catch (e) { 抛 = String(e.message); }
  台.判('反向验：分支没起来就抛并点名是哪一项（不拿现在这一棵冒充带上了）',
    /推演记录/.test(抛) && /feature\/new\/gen-log/.test(抛) && !fs.existsSync(path.join(沙, '不该有')), 抛.split('\n')[0]);
  let 抛2 = '';
  try { 合那一棵(仓, 'main', ['瞎写一项'], path.join(沙, '不该有2')); } catch (e) { 抛2 = String(e.message); }
  台.判('反向验：名单里没有的那一项当场抛（不静默丢掉）', /名单里没有/.test(抛2) && /forward-features/.test(抛2));
  果.撤(); 裸.撤();
  台.判('撤干净：那一格收了、那根临时指针没了、主干与那条前瞻支一笔都没被挪',
    !fs.existsSync(果.目录) && !fs.existsSync(裸.目录) && g('for-each-ref', 'refs/tmp/').length === 0 &&
    g('rev-parse', '--abbrev-ref', 'HEAD') === 'main' &&
    g('log', '--oneline', 'main').split('\n').length === 1 &&
    g('log', '--oneline', 'feature/new/heat-map').split('\n').length === 2);

  const 原件 = path.join(仓, 'src/pack/node_modules/electron/dist/electron.txt');
  /* 那一格不进仓（真仓里也一样：node_modules 是被 .gitignore 排掉的），所以它在盘上、不在任何一支里 */
  fs.mkdirSync(path.dirname(原件), { recursive: true });
  fs.writeFileSync(原件, '运行时那一份\n');
  const 摊 = 摊打包那一棵(仓, 'main', ['heat-map'], path.join(沙, '摊开'), ['src/pack/node_modules']);
  const 到了 = fs.existsSync(path.join(摊.目录, 'src/pack/node_modules/electron/dist/electron.txt'));
  摊.撤();
  台.判('摊那一棵把不进仓的运行时那一格硬链接过去；收掉那一格之后原来那一份一个字不少',
    到了 && fs.existsSync(原件) && fs.readFileSync(原件, 'utf8') === '运行时那一份\n' && 摊.链了.length === 1,
    JSON.stringify(摊.链了));
  let 抛3 = '';
  try { 硬链接一份(path.join(仓, '不存在的格子'), path.join(沙, 'x')); } catch (e) { 抛3 = String(e.message); }
  台.判('硬链接那一颗读不到源格子就抛（不静默出一棵缺运行时的树）', 抛3 !== '');
}
try { fs.rmSync(沙, { recursive: true, force: true }); } catch (e) {}

台.题('三 · 命令行那两道闸（喂真命令，跑任何一趟之前就停）');
/* 反向验「那一条分支还没起来」要有这么一棵：单支克隆只带走 main，八条前瞻支一条都没有。
   克隆落在仓外那一格临时目录，跑完连格一起收 —— 他那一棵一个字节不动，仓里也不留影子。 */
const 单沙 = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-forward46-单-'));
const 只main = path.join(单沙, 'clone');
const 有克隆 = (() => {
  try{ execFileSync('git', ['clone', '-q', '--single-branch', '-b', 'main', ROOT, 只main],
    { encoding:'utf8', stdio:['ignore','pipe','pipe'] }); return true; }
  catch(e){ return false; }
})();
const 砸 = (参数, 在) => { try { const out = execFileSync(process.execPath, ['src/_build/release.mjs'].concat(参数),
    { cwd: 在 || ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); return { 码: 0, 文: out }; }
  catch (e) { return { 码: e.status, 文: String((e && (e.stderr || e.stdout)) || (e && e.message) || e) }; } };
const 甲 = 砸(['--打自测包', '--带=瞎写']);
台.判('1 --带 里点了名单没有的那一项就停，并把八项的 id·中文名全报出来 · 退出码 ' + 甲.码,
  甲.码 === 1 && /名单里没有/.test(甲.文) && /lyric-grid·词格模式/.test(甲.文) && !/\$ node /.test(甲.文),
  甲.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
const 乙 = 砸(['--打自测包', '--带=heat-map'], 只main);
台.判('2 反向验（在那一棵只有 main 的克隆里跑）：勾了而那条分支还没起来 —— 停在那一句上，一个字节都不打 · 退出码 ' + 乙.码,
  有克隆 && 乙.码 === 1 && /还没起来/.test(乙.文) && !/\$ node /.test(乙.文) && !/合上 /.test(乙.文) && !/摊到/.test(乙.文),
  乙.文.split(/\r?\n/).filter(l => l.includes('停下来')).join('') || '克隆那一棵没起来（git 用不了？）');
const 丙 = 砸(['--看', '--带=heat-map']);
台.判('3 反向验：--带 没配 --打自测包 就停（别在量清单那一趟里合树）· 退出码 ' + 丙.码,
  丙.码 === 1 && /只在 --打自测包 那一档有用/.test(丙.文), 丙.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
台.判('4 那一棵摊在仓外那一格、跑完 finally 里撤（工作树那一棵一个字不动，也不在仓里留影子）',
  发布文.includes('摊打包那一棵(TREE,') && 发布文.includes("那棵.撤()") && 发布文.includes('} finally {') &&
  发布文.includes('cwd:跑在') && !/worktree/.test(rd('src/_build/plugin-repos.mjs')));

台.题('四 · 屏上那一栏（他点名的「这个选择也做到小助手当中去」）');
台.判('1 那一栏八行从名单那一份读，屏上不抄第二份名单',
  台文.includes("from './forward-features.mjs'") && 台文.includes('八项: 问脏.好 ? 八项名单.map') &&
  !/词格模式/.test(屏文) && 屏文.includes('画八项(对.八项)'));
台.判('2 一条一格：那颗勾、分支起没起、这一棵带不带、这一项动的是哪几处（details 摊开）',
  屏文.includes("data-项=") && 屏文.includes('分支还没起来') && 屏文.includes('这一项动的是哪几处') &&
  屏文.includes('function 带中()'));
台.判('2b 那一格不再说"摘"与"已拆"（新仓里没勾的那几条分支不参与合并，屏上不许留旧模型的说法）',
  !/摘/.test(屏文 + 台文 + 名单文) && !/已拆/.test(屏文 + 台文 + 名单文) &&
  !/摘掉没勾的|有改法|strips\.mjs/.test(发布文),
  ((屏文 + 台文 + 名单文 + 发布文).match(/.{0,12}摘.{0,12}/g) || []).slice(0, 3).join(' ⹂ '));
台.判('3 分支没起来的那一条勾都点不动；点打包把勾中的那几项递给 --带',
  屏文.includes("' disabled'") && 屏文.includes('带: 带的.join') && 台文.includes("身.带"));
台.判('4 那一栏只在这台开发用的屏上，装好的软件里读不到它（走的是本地那一屏，不进 pages\\）',
  !/八项/.test(rd('src/_fd/src/fd3-shell.js')) && !/forward-features/.test(rd('src/_fd/build.mjs')));
台.判('5 一屏改成一条流水（他 2026-10-13：「结构混乱」「给我按照流程一步一个按钮」）：十步一步一行、每行一颗钮，' +
  '从前那两栏的标题不许长回来',
  (屏文.match(/class="步"/g) || []).length === 10 &&
  (屏文.match(/<b>第 \d+ 步 ·/g) || []).length === 10 &&
  !屏文.includes('<h2 class="区">一、') && !屏文.includes('<h2 class="区">二、') &&
  屏文.includes('id="格"') && 屏文.indexOf('id="格"') > 屏文.indexOf('第 3 步') &&
  屏文.indexOf('id="八项"') > 屏文.indexOf('第 4 步') && 屏文.indexOf('id="自测"') > 屏文.indexOf('第 5 步') &&
  屏文.indexOf('id="只在"') > 屏文.indexOf('第 6 步') && 屏文.indexOf('id="pr"') > 屏文.indexOf('第 7 步') &&
  屏文.indexOf('id="发"') > 屏文.indexOf('第 10 步'), (屏文.match(/<b>第 \d+ 步 ·[^<]*/g) || []).map(s => s.slice(3, 9)).join('|'));
const 那十四颗 = ['同步', '开支', '量', '存', '落笔', '推项', '自测', '集成', '完整', 'pr', '查', '快进', '删支', '发'];
台.判('6 十四颗钮一颗不落：屏上有 id、脚本里点了有反应、后端那一条路接得到命令',
  那十四颗.every(id => 屏文.includes('id="' + id + '"') && 屏文.includes("取('" + id + "').onclick")) &&
  那十四颗.every(id => id === '存' || 台文.includes("'/api/" + id + "'")),
  那十四颗.filter(id => !台文.includes("'/api/" + id + "'")).join('、') || '全接上');
const 手文 = rd('src/_build/pr.mjs');
台.判('7 从前缺的那几步现在有命令可跑：同步主干 / 开这一轮的支 / 删本地已发布支（都只挪指针、不碰工作树、不推）',
  手文.includes("has('--同步主干')") && 手文.includes("has('--开这一轮的支')") && 手文.includes("has('--删本地已发布支')") &&
  手文.includes("['update-ref', 'refs/heads/main', 远, 本]") && 手文.includes("['update-ref', '-d', 'refs/heads/' + 名]"));
台.判('8 反向验：删支那一颗先核对（main 里没有它那一笔、两边内容也对不上就停），同步那一颗见本地多写就不动',
  /还差\.length && !内容一样/.test(手文) && /main 只是那一根的镜像/.test(手文) && !/update-ref[^\n]*main[^\n]*--force/.test(手文));
台.判('9 第 6 步那颗「用这一棵打安装包」：那条合好的分支没起来就不亮并说为什么；=完整 那一档不再挡',
  屏文.includes('状.集成在') && 屏文.includes('先在下面勾中要合的功能分支') && 屏文.includes('把勾中的几条合到一起') &&
  台文.includes('集成在:') &&
  发布文.includes("自测档 === '完整' ? 集成分支名 : 'HEAD'") && !/还差一步：那一棵是干净的一棵/.test(发布文));
台.判('10 第 4 步顶上那句说清楚了两处勾选互不相干（勾这些不决定推哪几条分支）',
  屏文.includes('不决定推哪几条分支') && 屏文.indexOf('不决定推哪几条分支') > 屏文.indexOf('第 4 步') &&
  屏文.indexOf('不决定推哪几条分支') < 屏文.indexOf('第 5 步'));
台.判('12 推送这一头也可选（他 2026-10-13：「那推送里有没有？可不可以选择？不可选择就不对」）：' +
  'pr.mjs 多一道 --推前瞻支，屏上第 7 步右边那八格勾哪几项才推哪几条前瞻支、各建一个 PR',
  手文.includes("has('--推前瞻支')") && 手文.includes('一颗都没勾') &&
  屏文.includes('id="推项"') && 屏文.includes('function 画推项') && 台文.includes("'/api/推项'") &&
  台文.includes("'--推前瞻支'"));
{
  const 推 = (参数, 在) => { try { const out = execFileSync(process.execPath, ['src/_build/pr.mjs'].concat(参数),
      { cwd: 在 || ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); return { 码: 0, 文: out }; }
    catch (e) { return { 码: e.status, 文: String((e && (e.stderr || e.stdout)) || (e && e.message) || e) }; } };
  const 一 = 推(['--推前瞻支']);
  const 二 = 推(['--推前瞻支', '--推=heat-map'], 只main);
  台.判('13 反向验真跑：一颗都没勾就停（不拿"全推"当默认）· 退出码 ' + 一.码 +
    '；那条分支还没起来的那一项也停（在那一棵只有 main 的克隆里跑，不推一条不存在的支）· 退出码 ' + 二.码,
    一.码 === 1 && /一颗都没勾/.test(一.文) && 有克隆 && 二.码 === 1 && /还没起来/.test(二.文) && !/push/.test(一.文 + 二.文),
    (一.文.split(/\r?\n/).find(l => l.includes('停下来')) || '') + ' ⹂ ' + (二.文.split(/\r?\n/).find(l => l.includes('停下来')) || ''));
  try{ fs.rmSync(单沙, { recursive: true, force: true }); }catch(e){}
}
台.判('14 摘法只往一棵临时的树上使：他的开发那一棵八项全在，删代码这一步在打包那一趟里（不勾才摘）',
  fs.existsSync(ROOT + 'src/_wnw/src/w21-heat.js') &&
  rd('src/_build/strips.mjs').includes('仓里、盘上他那一棵一个字节都不动') &&
  发布文.includes('摘掉没勾的(那棵.目录, 没勾)') && 发布文.includes('这几项没勾，但它们的摘法还没登记'));
台.判('11 第 4 步那两栏全是勾，没有一处要他手打内部名字（插件那七家一家一格、名字从家表取；内部 id 只在递给命令那一刻出现）',
  屏文.includes('function 画插件家') && 台文.includes('插件家: 家表.map') && 屏文.includes('data-家=') &&
  !屏文.includes('id="简装不带"') && !/placeholder="[^"]*id，逗号分隔/.test(屏文) &&
  !/(music-remote|your-sentences|singbit-input-practice|why-not-write)/.test(屏文),
  (屏文.match(/placeholder="[^"]*"/g) || []).filter(s => /id/.test(s)).join(' | ') || '没有要手打的格子');

台.题('五 · 装出去的那一层不许出现档位字样（他 2026-10-13 定的）');
{
  /* 档位字样：说的是「这是哪一版产品」的那几个词。他 2026-10-13 的原话是安装包与装好之后任何地方都不许出现。 */
  const 档 = /简装|完整版|全功能|全部功能|缺失功能/;
  const 壳 = rd('src/pack/sfx.cs'), 发 = rd('src/pack/publish.mjs');
  const 字 = (() => { try { return fs.readFileSync(ROOT + 'data/ui-text.yaml', 'utf8'); } catch (e) { return ''; } })();
  台.判('首装那个窗口那一份 C# 里一个档位字样都没有（那句「便携版」说的是装法，不是档位）',
    !档.test(壳) && 壳.includes('Flow-Desk 便携版'));
  台.判('发布那一格（安装说明.txt 与 flow-desk-install.json 那两份是它写的）里也没有档位字样', !档.test(发));
  台.判('界面文字那份清单里也没有档位字样（那 4416 行就是装好之后屏幕上能看见的话）', !档.test(字));
  /* 「不完整」这两个字眼下只在两句报错里，说的都是"这一份东西缺件"，不是说哪一版产品。
     他要不要连这两句一起改口，等他一句；这一条钉住的是别让它长到第三处去。 */
  const 全 = 字.match(/[^\n]*不完整[^\n]*/g) || [];
  台.判('「不完整」现在只挂在两句报错上（widget 定义缺件、音乐遥控器的包缺件），第三处一冒出来就红',
    全.length === 2 && 全.some(s => s.includes('widget 定义')) && 全.some(s => s.includes('音乐遥控器的包里没带插件文件')),
    全.join(' ⹂ '));
  台.判('档位这些词只许出现在开发这一头：名单、发布脚本的报话、文档',
    名单文.includes('简装') && 发布文.includes('简装'));
}

台.收尾();
