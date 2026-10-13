/* ============================================================
   gate-push46.mjs · 外46 六：发布与推送拆成两道命令，中间夹一次他改那份明文清单
                     外46 八（2026-10-11）：推不再由这一颗做 —— 只推这一轮那条支，那一整手在 pr.mjs
   ------------------------------------------------------------
     node src/tools/probes/gate-push46.mjs
   钉的是他这几条里的硬事实（一条都不含糊，也不许谁事后把路改回去）：
     一、--看 只量不写：不落提交、不拼装、不打包、不打 tag、不推，写的只有那一格清单文件；
     二、那一格清单里「版本基线 =」「提交分支 =」「本轮说明 =」与每一笔「更新描述 =」都是可改的行，而且能被原样读回去；
     三、push 之前必须有一道读终端输入的确认，非确认词一律不推 ——
         钉的是「没有任何一条路会不经确认就 push」；这一道从前在 release.mjs，2026-10-11 起跟着推支走，在 pr.mjs；
     四、tag 在本地就打（本地对象，不依赖推）；release.mjs 这一颗一个字节都不推 —— 不推 main、不推 tag；
     五、中途任何一步失败即停；
     六、名单还是只有一份：脚本里不许出现第二份 id→路径 或 id→仓名 的对应表。
   ============================================================ */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { rd, 记账, 切, ROOT } from './lib-slice.mjs';
import { 拼清单, 读清单, 读清单显示, 等字的格, 合法基线, 清单名, 确认词 } from '../../_build/push-list.mjs';
import { 底号 } from '../../_build/version.mjs';

const 台 = 记账('gate-push46');
const rel = rd('src/_build/release.mjs');
const pr = rd('src/_build/pr.mjs');
const rep = rd('src/_build/plugin-repos.mjs');
const lst = rd('src/_build/push-list.mjs');
const ver = rd('src/_build/version.mjs');
/* lib-slice 那颗 切 认行首的 const/function；pr.mjs 那几颗都带 export 头，先摘掉再切 */
const 切出 = (文, 名) => 切(文.replace(/^export /gm, ''), 名);
/* 负判量的是代码不是散文：块注释与整行注释先摘掉 */
const 代码 = 文 => String(文).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const rel码 = 代码(rel), pr码 = 代码(pr);
const 落清单 = 切(rel, '落清单');
const 问一句 = 切出(pr, '问一句');
const 要确认 = 切出(pr, '要他确认');
const 推支 = 切出(pr, '推支');
const 停颗 = 切(rel, '停');
const 被挡 = (路) => { try{ execFileSync('git', ['check-ignore', '-q', '--', 路], { cwd:ROOT, stdio:['ignore','ignore','ignore'] }); return true; }catch(e){ return false; } };

台.题('一、--看 只量不写：仓里一个字节都不动');
台.判('认得 --看 这一道口，且它和 --dry 同属「不往仓里写」那一头（DRY 的定义包含 --看）',
  /const 看 = has\('--看'\)/.test(rel) && /const DRY = 看 \|\| has\('--dry'\)/.test(rel));
台.判('--看 与 --照清单发 不许挤在同一道命令里（两条路不能含糊）', rel.includes("停('--看 与 --照清单发 是两道命令"));
台.判('不给参数就一条道跑到推那一步已经撤了：裸跑当场停（现在认的是 --看 / --打自测包 / --照清单发 / --dry 四道，各自单独走）',
  /if\(!看 && !发 && !自测 && !DRY\)/.test(rel) && rel.includes('不再直接自动推送上去'));
台.判('只量那一趟在拼装之前就退出：走不到 拼装 与 打包，而这一颗里连 push 那一手都没有',
  rel.indexOf('process.exit(0)') > 0 && rel.indexOf('process.exit(0)') < rel.indexOf('const 装 = 拼装(') && !/'push'/.test(rel));
台.判('落清单 那一颗里只有写那一格文件，没有一件 git 写活（不落笔、不挪指针、不打 tag、不推）',
  落清单.includes('写清单(') && !/commit-tree|update-ref|往那一支写|拼装\(|同步那一支\(|'tag'|'push'/.test(落清单));
台.判('落清单 只在 --看 那一支被叫到（--dry 连那一格文件都不落）', rel.includes('if(看){\n    落清单();'));
台.判('清单那一格住在 data\\ 底下，和界面文字清单同一格，而且不进仓',
  lst.includes("path.join(TREE, 'data', '推送清单.txt')") && 被挡('data/推送清单.txt'));
台.判('只量那一趟报的话说明白：仓里什么都没写、没提交、没拼装、没打包、没推',
  rel.includes('什么都没写、没提交、没拼装、没打包、没推') && rel.includes('--dry：什么都没写'));

台.题('二、清单里那几行改得动，也读得回来');
const 样 = 拼清单({ 基线:'1.0.0-alpha', 笔:[
  { 名:'主程序 · Flow-Desk', 副题:'这一笔落在 main 那一支', 会动:'会动', 现在:'1.0.0-alpha+build.9790f8a', 会成:'1.0.0-alpha+build.（这一笔落下去才知道）', 描述:'发布 1.0.0-alpha · 这一趟打包的记号（源码一个字没改）', 份:['src/_build/release.mjs'] },
  { 名:'你的便签 · notes', 副题:'这一家的代码在 plugin/notes 那一支', 会动:'会动 · 代码动了 2 份，号也跟着换一串', 现在:'1.0.0-alpha+build.37c45ae', 会成:'1.0.0-alpha+build.（plugin/notes 落完这一轮的代码之后才知道）', 描述:'外46 五 · 你的便签：这一轮的改动从拼装那一棵送回这一支', 份:['data/plugins/notes/main.js', 'data/plugins/notes/manifest.json'] },
  { 名:'日程 · schedule', 副题:'这一家的代码在 plugin/schedule 那一支', 会动:'不动', 现在:'1.0.0-alpha+build.1111111', 会成:'还是现在这一串（这一家这一轮不动）', 描述:null, 份:[] },
]});
台.判('写出来是一行一句话的明文：没有 JSON 花括号、没有内部编号、没有绝对路径',
  !/[{}]/.test(样.replace(/^\s*#.*/gm, '')) && !/\b[A-Za-z]:[\\/]/.test(样) && 样.includes('【你的便签 · notes】'));
台.判('「版本基线 =」是顶上那一行（不是藏在结构里）', /^版本基线 = 1\.0\.0-alpha$/m.test(样));
const 描述行 = 文 => 文.split('\n').filter(l => /^[ \t]*更新描述[ \t]*=/.test(l));
台.判('每一笔的「更新描述 =」各自一行，就在自己那一笔底下（会动几笔就有几行）', 描述行(样).length === 2);
const 日程段 = '【日程 · schedule】' + 样.split('【日程 · schedule】')[1].split('\n\n')[0];
台.判('不动的那一笔不给更新描述那一行（没有落笔，就没有要写的说明）', !日程段.includes('更新描述'));
台.判('动了的几笔都把「动了哪些份」一行一份列出来', 样.includes('    data/plugins/notes/main.js') && 样.includes('    data/plugins/notes/manifest.json'));
台.判('2026-10-11 新加的那两样也在形状里：顶上「提交分支 =」一行与「本轮说明 =」那几行（拼出来就有）',
  /^提交分支 = $/m.test(样) && /^本轮说明 = $/m.test(样) && 样.includes('③ 「提交分支 =」') && 样.includes('④ 「本轮说明 =」'));
const 改过 = 样.replace(/^版本基线 = .*$/m, '版本基线 = 1.2.3-beta')
             .replace(/^提交分支 = .*$/m, '提交分支 = feature/46-拆两道')
             .replace(/^本轮说明 = .*$/m, '本轮说明 = 这一轮把推送改成立 PR')
             .replace(/(【主程序 · Flow-Desk】[\s\S]*?更新描述 = ).*$/m, '$1这一轮把发布链拆成两道')
             .replace(/(【你的便签 · notes】[\s\S]*?更新描述 = ).*$/m, '$1这一轮便签存档修好了');
const 回读 = 读清单(改过);
台.判('他改完顶行，读回来就是那一串（1.2.3-beta）', 回读.基线 === '1.2.3-beta', JSON.stringify(回读.基线));
台.判('他改完每一笔那句，读回来一字不差，两笔各归各的',
  回读.描述['主程序 · Flow-Desk'] === '这一轮把发布链拆成两道' && 回读.描述['你的便签 · notes'] === '这一轮便签存档修好了',
  JSON.stringify(回读.描述));
台.判('他改完「提交分支」与「本轮说明」，读回来同样一字不差（2026-10-11 那两行走同一把尺）',
  回读.提交分支 === 'feature/46-拆两道' && 回读.本轮说明 === '这一轮把推送改成立 PR', JSON.stringify([回读.提交分支, 回读.本轮说明]));
台.判('每一笔认得出是谁（【名字】那一段按笔分开，不串到隔壁）', 回读.那笔.length === 3 && 回读.那笔[2] === '日程 · schedule');
台.判('行首 # 是说明：整段说明读成一团空气，不影响那几行', 读清单(样).基线 === '1.0.0-alpha' && Object.keys(读清单(样).描述).length === 2);
台.判('那一句被他清空了就用默认那句，不落一笔空说明', 读清单(样.replace(/(【你的便签 · notes】[\s\S]*?更新描述 = ).*$/m, '$1')).描述['你的便签 · notes'] === '');
台.判('坏写法挡得住（不成样的基线不认，带 +build. 尾巴的也不认）',
  合法基线('1.0.0-alpha') && 合法基线('1.2.3') && !合法基线('1.0') && !合法基线('1.0.0-alpha+build.9790f8a') && !合法基线('') && !合法基线(undefined));
台.判('发布脚本把那一行当这一趟的底号传进去（环境变量 FD_底号），不改源码里那一格',
  /process\.env\.FD_底号 = 基线/.test(rel) && /const 基线 = 旧清单\.有基线行 \? 旧清单\.基线 : 底号\(\)/.test(rel));
台.判('version.mjs 认 FD_底号，不成样子当场报错，不悄悄退回账上那一串',
  /process\.env\.FD_底号/.test(ver) && /throw new Error\('这一趟要用的底号不成样子/.test(ver));
const 旧底 = process.env.FD_底号;
process.env.FD_底号 = '2.3.4-beta';
台.判('传进去那一串真的换掉了底号（临时覆盖，只算这一趟）', 底号() === '2.3.4-beta', 底号());
delete process.env.FD_底号;
台.判('撤掉环境变量就回到 version.json 那一格（源码里那个基线没被改过）', 底号() === '1.0.0-alpha', 底号());

台.题('三、push 之前那道确认（2026-10-11 起跟着推支走，在 pr.mjs 里）');
台.判('确认词就是一个「推」字', 确认词 === '推');
台.判('读的是终端输入本身（fs.readSync 那一类同步读法），不是猜的', /fs\.readSync\(0/.test(问一句));
台.判('比的是一整行正好等于确认词：回车（空）、别的字、读不到都算不过',
  /if\(答 !== 确认词\)/.test(pr) && pr.includes('读不到终端输入'));
台.判('比之前只掐掉首尾空白（粘进来多带的一个空格不算改了内容），确认词本身一个字符没放宽',
  /const 答 = 敲的 === null \? null : 敲的\.trim\(\);/.test(要确认) && /if\(答 !== 确认词\)/.test(要确认));
台.判('确认不过就走不到推：那一颗回 false，--提交PR 那一串里 推支 与 开PR 都排在它后面且有 if(!要他确认) 挡着',
  要确认.includes('return false') && /if\(!要他确认\(/.test(pr) &&
  pr.indexOf('要他确认(') < pr.indexOf('推支(支.名') && pr.indexOf('推支(支.名') < pr.indexOf('开PR(支.名'));
台.判('脚本里没有任何一条路会不经确认就 push：release.mjs 一处 push 都没有；pr.mjs 那一处只有一个，而 --提交PR 那一串里它排在 要他确认 之后、还被 if(!要他确认) 那道回绝挡着',
  !/'push'/.test(rel) && (pr码.match(/'push'/g) || []).length === 1 &&
  (() => { const 手 = pr.slice(pr.indexOf("has('--提交PR')"));
    return /if\(!要他确认\(/.test(手) && 手.indexOf('要他确认(') < 手.indexOf('推支(支.名') && 手.indexOf('推支(支.名') < 手.indexOf('开PR(支.名'); })());
台.判('推的那一头只有这一条支：没有 push 与 main 同一句、没有 --tags、没有 --force、没有拼装那一棵',
  !/push[^\n]*\bmain\b/.test(pr码) && !/--tags/.test(pr码) && !/--force/.test(pr码) && !/'-u', 远端, 拼装支/.test(pr码));
台.判('试跑那一格（--不推）绕不出确认：确认排在 推支 之前，--不推 只在 push 那一行前面挡一下（公开面那道闸照跑）',
  /const 不推 = has\('--不推'\)/.test(pr) && 推支.indexOf('公开面闸(名, 远端)') < 推支.indexOf('选项.不推') &&
  推支.indexOf('选项.不推') < 推支.indexOf("'push', '-u', 远端, 名") && pr.indexOf('要他确认(') < pr.indexOf('推支(支.名'));
台.判('提示里把粘贴这件事说给他了（终端里粘贴就是键盘输入）', rel.includes('粘贴就是键盘输入') && pr.includes('确认词：'));
台.判('清单文件里也写了最后要他亲手敲那一个字，不是悄悄加的一道手续', lst.includes('亲手敲一个「推」字') && lst.includes('回车、空、别的字都不算'));
台.判('release.mjs 里那道从前等确认的读终端那一手整个下台了（这一颗什么都不推，没必要等字）',
  !/'问一句/.test(rel码) && !rel.includes('确认词：'));

台.题('四、tag 只在本地打；这一颗不推 main 也不推 tag');
台.判('本地打 tag 那一手还在，钉的是这一趟那笔发布记号', rel.includes("git(dir, ['tag', '-a'") && rel.includes("打tag(TREE, 'v' + 主号, 'Flow-Desk', 主短)"));
台.判('打 tag 不被「--不推」管着：它是本地对象（排在那一段之前已经打好了）', rel.indexOf('打tag(TREE,') < rel.indexOf('if(!NOPUSH)'));
台.判('最后列给他的那一眼还是有：哪几根指针、本地哪一笔、远端哪一笔、差几笔 —— 只列不推',
  rel.includes('最后那一眼') && /rev-parse', '--short', 'origin\//.test(rel) && /rev-list', '--count', 'origin\//.test(rel) && rel.includes('也不由这一颗推'));
台.判('拼装那一棵还是不推（谁要自己合），main 也交给 pr.mjs 之外的手续：这一颗里没有任何 push',
  !rel.includes('ref:拼装支') && !/'push', 'origin', 拼装支/.test(rel码) && !/'push', 'origin', 'main'/.test(rel码));
台.判('推支与建 PR 那一手在 pr.mjs，release.mjs 只指路不代做', rel.includes('node src/_build/pr.mjs --提交PR'));

台.题('五、失败即停');
台.判('任何一步砸了都走 停（里面 process.exit(1)）', 停颗.includes('process.exit(1)'));
const 发链 = rel.slice(rel.indexOf('const 跑 = (cmd, args)'));
台.判('发布那一串任何一趟砸了都当场停，停得比推那一步还早（什么都不推）',
  发链.includes('uitext.artifactBuilds()') &&
  发链.indexOf("src/_tauri/build.mjs") < 发链.indexOf("src/pack/publish.mjs") &&
  发链.indexOf("src/pack/publish.mjs") < 发链.indexOf('if(!NOPUSH)') &&
  发链.includes('这一趟没跑成，一律不推'));
台.判('那条支推砸了也报是哪一条（不吞、不说含混话、不重试强推）', pr.includes('那条支推砸了（'));
台.判('未合并那道闸排在任何写活之前：号要钉在 main 上真实存在的那一笔上',
  rel.indexOf('先合并 PR，再打包') < rel.indexOf('const 装 = 拼装(') && rel.indexOf('先合并 PR，再打包') > rel.indexOf('const 主仓dirty'));

台.题('六、名单还是只有一份');
台.判('发布脚本 import 那一张表，不抄第二份（表里没有一处 id→仓名 的字面量）',
  /import \{ 家 as 家表/.test(rel) && !rel.includes("'Flow-Desk-plugin-") && !/'notes':\s*'/.test(rel));
台.判('份的清单从那一张表的 from 取（git 对两支的树），没有再自己扫一遍插件那一格',
  /\.concat\(job\.from\)/.test(rel) && !/readdirSync\([^)]*data[\\/]+plugins/.test(rel));
台.判('那一格清单的形状里也没有第二份对应表（只认行首那几样）',
  !lst.includes("'notes'") && !/id:/.test(lst) && !lst.includes('Flow-Desk-plugin'));
台.判('号一种形状：七家全从各自那一支上最后动过代码的那一笔取（独立仓那一条路退了）',
  /那一支最后一笔\(job\)/.test(rel) && !/function 会动吗\(/.test(rel) && !/job\.仓/.test(rel));
台.判('铺出去那一格的默认位置是现算的（这一棵树的上一层），字面量盘符已经下台',
  /const OUT = path\.resolve\(val\('--out', OUT_DEFAULT\)\)/.test(rep) && !/'[A-Za-z]:[\\/]/.test(代码(rep)));

台.题('七、那一格文件的名字与位置（他改的就是这一份）');
台.判('名字是 data\\推送清单.txt（跟「界面文字清单」同一格）', 清单名 === 'data\\推送清单.txt');
台.判('那一颗 import 进来不带副作用（不写盘、不跑 git，只报名字）', (() => {
  const 那颗URL = pathToFileURL(path.resolve(ROOT + 'src/_build/push-list.mjs')).href;
  const 出 = execFileSync(process.execPath, ['-e',
    'import(' + JSON.stringify(那颗URL) + ').then(m => console.log("名字 " + m.清单名 + " · 确认词 " + m.确认词))'],
    { cwd:ROOT, encoding:'utf8' });
  return 出.trim() === '名字 data\\推送清单.txt · 确认词 推';
})());
台.判('这一颗不是白钉的：清单里那几处能改的行，脚本头部注释也各说了一次（他读脚本也看得懂）',
  rel.includes('写成明文清单') && rel.includes(清单名) && rel.includes('要他亲手敲一个「推」字') &&
  rel.includes('「提交分支 =」') && rel.includes('「本轮说明 =」'));
台.判('头部那一段也写了这一轮的顺序：独立分支 + PR、他人工合并、之后才打包',
  rel.includes('他人工合并') && rel.includes('提交 PR') && rel.includes('再跑打包'));

/* ---------- 八、提交说明归他填（他 2026-10-12 第 3 条）---------- */
台.题('八、每一笔的提交说明由他填：--看 不预填、脚本不替他补一句、空着就不落那一笔');
{
  const 说 = 切(rel, '描述给');
  /* 把每一处 描述给(...) 的实参单独挑出来看（括号配对，嵌套一层也算）——
     拿 [^)]* 那种粗匹配扫会停在 笔名(job) 那个括号上，偷偷多递一枚默认参数都看不见。 */
  const 实参 = 文 => { const 串 = 代码(文), 头 = '描述给('.length, 出 = [];
    for(let i = 串.indexOf('描述给('); i >= 0; i = 串.indexOf('描述给(', i + 1)){
      let 深 = 1, 结 = i + 头;
      while(结 < 串.length && 深){ if(串[结] === '(') 深++; else if(串[结] === ')') 深--; 结++; }
      出.push(串.slice(i + 头, 结 - 1).trim());
    }
    return 出;
  };
  台.判('1 落清单 那两格描述只从旧清单取他写过的，没有"取不到就用脚本那句"的退路',
    !/旧清单\.描述\[[^\]]+\]\s*\|\|\s*(默认描述|主描述默认)/.test(落清单) &&
    落清单.includes("String(旧清单.描述[主程序名] || '')") && 落清单.includes("String(旧清单.描述[笔名(r)] || '')"));
  台.判('2 我只交参照文字，交法是清单里那一行 # 说明（他看得见、两颗读尺都不当数据）',
    落清单.includes("'参照文字（照这个意思改成你自己那句就行）：' + 主描述默认") &&
    落清单.includes("'参照文字（照这个意思改成你自己那句就行）：' + 默认描述(r)"));
  台.判('3 描述给 只剩一枚参数：空着当场停下来点名等哪一格，从前那第二枚"默认那句"整条撤了',
    /function 描述给\(名\)\{/.test(rel) && 说.includes('停(') && !代码(说).includes('return 默认'));
  台.判('每一处调用都只递一枚参数，没有一处还偷偷递默认句（六家、main 那笔记号、最后那一眼；为写那一棵那一处跟着独立仓退了）',
    实参(rel).length >= 4 && 实参(rel).every(a => !a.includes(',')), 实参(rel).join(' | '));
  const 样2 = 拼清单({ 基线:'1.0.0-alpha', 提交分支:'feature/tweak/46-说明', 本轮说明:'',
    笔:[{ 名:'主程序 · Flow-Desk', 副题:'这一笔落在 main 那一支', 会动:'会动 · 多了 2 份改动', 现在:'1.0.0-alpha+build.aaaaaaa',
      会成:'1.0.0-alpha+build.（这一笔落下去才知道）', 描述:'', 份:['src/a.mjs'],
      话:['这一行整行换成你自己要说的那句话；空着这一笔就不落，我不替你写。', '参照文字（照这个意思改成你自己那句就行）：发布 1.0.0-alpha · 这一趟打包的记号'] },
      { 名:'日程 · schedule', 副题:'这一家的代码在 plugin/schedule 那一支', 会动:'不动', 现在:'1.0.0-alpha+build.bbbbbbb',
        会成:'还是现在这一串（这一家这一轮不动）', 描述:null, 份:[] }]});
  const 显2 = 读清单显示(样2);
  台.判('5 真跑 等字的格：空着那一笔与空着的本轮说明都被点名，这一轮不动的那一笔不冤枉它',
    JSON.stringify(等字的格(显2)) === JSON.stringify(['主程序 · Flow-Desk', '「本轮说明」（PR 的标题与正文就从这儿来）']),
    JSON.stringify(等字的格(显2)));
  台.判('6 他填了就不催（两格都有字 → 名单空）',
    等字的格(读清单显示(样2.replace(/^  更新描述 = $/m, '  更新描述 = 这一轮把说明交回他填')
      .replace(/^本轮说明 = $/m, '本轮说明 = 标题一行'))).length === 0);
  台.判('7 参照那一行只进"显示"那把尺当提示；另一把尺一个字都不当数据（两颗尺对「更新描述」不打架）',
    显2.笔[0].参照 === '发布 1.0.0-alpha · 这一趟打包的记号' && 读清单(样2).描述['主程序 · Flow-Desk'] === '' &&
    读清单(样2).那笔.length === 2 && 显2.笔[1].参照 === '');
  台.判('8 那一行提示是"行首 #"，改清单 与 拼清单 之间来回不把它变成数据',
    !/^  更新描述 = 发布 1\.0\.0-alpha/m.test(样2) && 样2.includes('  # 参照文字（照这个意思改成你自己那句就行）：'));
}

台.收尾();
