/* ============================================================
   gate-prflow46.mjs · 外46 八：一律独立分支 + Pull Request（合并只能人工点）
   ------------------------------------------------------------
     node src/tools/probes/gate-prflow46.mjs
   钉的是他 2026-10-11 那四条规矩落到代码上的硬事实，一条都不许事后从后门改回去：
     一、pr.mjs 里没有 push origin main、没有 --force、没有 --tags、不推拼装那一棵，也不自动合并；
     二、「远程 main 挪了就先停」那道闸排在推支之前，全程不自动 rebase / merge / reset；
     三、支名形状、支头取本地 main、同名支不许复用（本地与远端都问一遍）；
     四、分家 的默认落点已经不是字面量 'main'，是清单里那一条支；main 那一支只被当支头读；
     五、各家快进 只挪指针、已有的一笔都不改写，真分叉或撞车就报是哪一家然后停；
     六、--照清单发 在那条支还没合进 main 时拒绝打包，并报 merge-base --is-ancestor 那一眼；
     七、清单多认「提交分支 =」与「本轮说明 =」两样，写出去读回来对得上，--看 重跑保住他写的值；
     八、那一摊只剩命令：提交 PR 与打包发版各自一道（pr.mjs --提交PR / release.mjs --照清单发），没合并就打包当场停；
        顶上那三格与那份摊单从前在屏上，2026-10-16 那一页整块撤了，屏上一根线都不许留；
     九、公开面那道闸：串全部现场算（这台的位置、帐户名、私人目录名一串都不缺）、扫的是
        origin/main 到这条支之间新增和修改的每一本文本、二进制跳过、本地那一颗不算进扫描面，
        而且 pr.mjs 推之前真调用它；
     十、gh 不在或没登录时走「打印比对地址」那一条：不装任何东西、不要任何令牌、仓名现取不写死；
     十一、要他亲手敲那一个「推」字那一道跟着推支走，读的还是终端输入本身，非确认词一个字节都不推；
     十二、号那套一个字都没改。
   能真跑的（第三、第七、第九那些形状与判据）一律真跑，不拿正则糊过去。
   ============================================================ */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rd, 记账, 切, ROOT } from './lib-slice.mjs';
import { 拼清单, 读清单, 读盘清单, 读清单显示, 改清单, 支名默认, 支名形状, 确认词, 认支类,
  可推远程, 集成分支名 } from '../../_build/push-list.mjs';
import { 各家说明, 挑一句, 笔名, 主程序笔名, 分支家, 合进那条支, 重建集成分支, 本地前瞻支 } from '../../_build/plugin-repos.mjs';
import { 私人串清单, 扫文本, 是二进制, 不扫 } from '../../_build/public-scan.mjs';
import { 校验支名 } from '../../_build/pr.mjs';
import { 素材目录, 工区, 存档落点, 探针沙盒, Rust工具链, Rust包缓存, Rust链接件, 编译缓存 } from '../本地路径.mjs';

const 台 = 记账('gate-prflow46');
const pr = rd('src/_build/pr.mjs');
const rel = rd('src/_build/release.mjs');
const rep = rd('src/_build/plugin-repos.mjs');
const ui = rd('src/_build/text-icon.mjs');
const pg = rd('src/_build/text-icon.html');
const scn = rd('src/_build/public-scan.mjs');
const lst = rd('src/_build/push-list.mjs');
const 提PR = pr.slice(pr.indexOf("has('--提交PR')"), pr.indexOf('else 跑(() => 停('));
const t46 = rd('src/tools/probes/gate-tauri46.mjs');
/* lib-slice 那颗 切 认的是行首的 const/function；这几颗如今都带 export 头，先把 export 那六个字摘掉再切 */
const 切出 = (文, 名) => 切(文.replace(/^export /gm, ''), 名);
const 推支 = 切出(pr, '推支');
const 同步 = 切出(pr, '同步远程');
/* 开这一轮那条支那一手 2026-10-14 拆成两半：看那一支（只读 —— 摊单那一屏也用它，一根指针都不挪）
   与 本轮那一支（照它落那一根新指针，或沿用上一趟「写进各支」已经开出来的那一根）。
   闸量的还是那一整手，所以两半接起来看。 */
const 开支 = 切出(pr, '看那一支') + 切出(pr, '本轮那一支');
const 落笔 = 切出(pr, '落笔到支');
const 开PR = 切出(pr, '开PR');
const 在用 = 切出(pr, '支名在用');
const 远程话 = 切出(pr, '远程没main话');
const 要确认 = 切出(pr, '要他确认');
const 快进 = 切出(rep, '各家快进');
const 分家 = 切出(rep, '分家');
const 独有 = 切出(rep, '那一支独有的别家内容');
/* 负判（"这一颗里没有那一手"）量的是代码不是散文：先把块注释与整行注释摘掉，
   免得头部说明里那句「这一颗里没有 push origin main」自己把自己判死。 */
const 代码 = 文 => String(文).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const pr码 = 代码(pr), rel码 = 代码(rel);

/* ---------- 一 ---------- */
/* 2026-10-14 上午那一下"建出远程第一根 main"（--建远程main）已经用完并整块拆掉了：
   这一节因此回到最严的那一条 —— 这一颗里连一次"推 main"都不许出现，push 只许出现在 推支 那一处。
   留一道记录在这儿：拆之前它是有过的，拆完要有闸钉住"别哪天又长回来"。 */
台.题('一、推这一手只推一条支：main、tag、拼装那一棵、自动合并都不在 pr.mjs 里（第一次建远程 main 那一颗已经拆了）');
台.判('代码里 push 只有一处，就是 推支 里那一处', (pr码.match(/'push'/g) || []).length === 1 && 推支.includes("'push', '-u', 远端, 名"),
  (pr码.match(/'push'/g) || []).length);
台.判('没有任何一条路推 main：push 与 main 这两个参数不同在一句里，也没有 push origin main 那一串',
  !/'push'[^\n]*'main'/.test(pr码) && !/'push', 'origin', 'main'/.test(pr码));
台.判('第一次那一颗整块拆干净了：这一颗与那一屏里「建远程」这三个字一处都不留（连注释里都不许留成一枚还能按的钮）',
  !/建远程/.test(pr) && !/建远程/.test(rd('src/_build/text-icon.mjs')) && !/建远程/.test(rd('src/_build/text-icon.html')));
台.判('远程那一头万一没有 main（那一根被人删了、或这台挂错了远程）：同步那一道照样当场停，报的是人话，而且不替你重建那一根',
  同步.includes('if(!表.main) 停(远程没main话(表))') && 远程话.includes('这一颗什么都不推') && 远程话.includes('这一颗不替你重建 main 那一根'));
台.判('没有 --force、没有 -f、没有强推那一手', !/--force/.test(pr码) && !/'-f'/.test(pr码));
台.判('没有 --tags（tag 只在本地打，推 tag 这一轮不做）', !/--tags/.test(pr码));
台.判('推支 那一颗点名挡掉 main 与拼装那一棵', 推支.includes("名 === 'main' || 名 === 拼装支") && 推支.includes('不推 '));
台.判('推那一步再钉一道名单闸（他第 4 件）：认不出类的与集成分支那种永不进远程的都拦，且拦在 公开面闸 与 push 之前',
  推支.includes('支名可用(名)') && 推支.includes('if(!可.行) 停(') &&
  推支.indexOf('支名可用(名)') < 推支.indexOf('公开面闸(名, 远端)') && 推支.indexOf('公开面闸(名, 远端)') < 推支.indexOf("'push', '-u', 远端, 名"));
台.判('不自动合并：没有 gh pr merge、没有 --auto、不跑 git merge', !/'pr', 'merge'/.test(pr) && !/--auto/.test(pr) && !/'merge'/.test(pr));
台.判('建完 PR 就停：开PR 那一颗里没有第二趟 git 写活', !/execFileSync\('git'/.test(开PR));
台.判('release.mjs 里一处 push 都没有（打包那一颗什么都不推）', !/'push'/.test(rel) && !/push origin/.test(rel));

/* ---------- 二 ---------- */
台.题('二、先同步远程 main：挪了就停，绝不自动 rebase / merge / reset');
台.判('fetch 只问 main 那一根（git fetch origin main），是只读的那一手，也没有 pull', 同步.includes("'fetch', 远端, 'main'") && !/'pull'/.test(同步));
台.判('本地不是它的后代就当场停，话里报「缺几笔」和「请人工处理」',
  /const 缺 = Number\(git\(TREE, \['rev-list', '--count', 本 \+ '\.\.' \+ 远\]\)\)/.test(同步) &&
  同步.includes('远程 main 已经挪了，本地缺 ') && 同步.includes('请人工处理'));
台.判('停下来那一段明写不自动 rebase、不自动 merge、不 reset；那颗里也真没有这两个手',
  同步.includes('绝不自动 rebase、绝不自动 merge、绝不 reset') && !/'rebase'/.test(pr) && !/'reset'/.test(pr));
台.判('那道闸排在推支之前：定义在前，--提交PR 那一串里也排在 开支 与 推支 之前',
  pr.indexOf('export function 同步远程') < pr.indexOf('export function 推支') &&
  pr.indexOf('同步远程()') < pr.indexOf('本轮那一支()') && pr.indexOf('本轮那一支()') < pr.indexOf('推支(支.名'));
台.判('网络那几趟都不许弹口令：GIT_TERMINAL_PROMPT 一律钉成 0，也不传 GIT_ASKPASS',
  (pr.match(/GIT_TERMINAL_PROMPT:\s*'0'/g) || []).length >= 3 && !/GIT_ASKPASS/.test(pr));
台.判('fetch 砸了就当场停（不重试别的招、不当它没挪）', 同步.includes('fetch 没跑成'));

/* ---------- 三 ---------- */
台.题('三、支名：形状、支头、不许复用');
台.判('形状就是那条规矩那一串（feature|hotfix|release，斜杠后小写字母或数字起头，只许 a-z 0-9 . _ -）',
  支名形状.source === '^(feature|hotfix|release)\\/[a-z0-9][a-z0-9._-]*$');
台.判('形状只有一份：pr.mjs 收不收一个名字只问 push-list 那颗 支名可用，自己不再留第二条判据',
  pr.includes('支名可用(串).行') && !/支名形状\.test\(串\)/.test(pr) &&
  !/new RegExp\('\^\(feature/.test(pr) && !/\/\^feature\|\|/.test(pr));
台.判('不合形状就停下来报哪里不对（真跑：五种坏名各停一次，话里说出错在哪）',
  (() => {
    const 坏 = ['feature/外46-tauri', 'Feature/abc', 'main', 'hotfix/-x', 'tech/abc', ''];
    const 报 = 坏.map(n => { try{ return '没停:' + 校验支名(n); }catch(e){ return String(e.message); } });
    return 报.every(s => !s.startsWith('没停')) && /头一段|小写字母|只许|空的/.test(报[0]) && /头一段/.test(报[2]) && /小写字母或数字起头/.test(报[3]);
  })());
台.判('合形状的三种头一段都过（真跑）',
  校验支名('feature/46-tauri-data') === 'feature/46-tauri-data' && 校验支名('hotfix/9-fu') === 'hotfix/9-fu' &&
  校验支名('release/1.2.3-do') === 'release/1.2.3-do');
台.判('新规范那四类里能推的也过（feature/tweak/… 正是 --看 现在默认生成的那种），local/all-features-test 在形状这一关就停（不等它走到推）',
  校验支名('feature/tweak/46-tauri') === 'feature/tweak/46-tauri' &&
  校验支名('feature/new/heat-map') === 'feature/new/heat-map' &&
  校验支名('feature/refactor/electron-to-tauri-shell') === 'feature/refactor/electron-to-tauri-shell' &&
  (() => { try{ return '没停:' + 校验支名('local/all-features-test'); }catch(e){ return /集成分支只留本地/.test(String(e.message)); } })());
台.判('支头取本地 main 那一笔（不是远端那一笔：本地还没推出去的那些就是这一轮要发的东西）',
  开支.includes("git(TREE, ['rev-parse', 'main'])") && !开支.includes("rev-parse', 远端"));
台.判('同名支已经存在（本地或远端任一）就停下来报「上一轮用过，换一个名字」',
  开支.includes('支名在用(名, 远端)') && 开支.includes('这条支上一轮用过，换一个名字') && 开支.includes('不许复用旧支'));
台.判('本地与远端各问一遍，问不出就停 —— 不猜、不当它不存在', 在用.includes("'show-ref', '--verify', '--quiet'") && 在用.includes("'ls-remote', '--heads'") && 在用.includes('不猜、不当它不存在'));
台.判('开那条支只立新指针，不碰盘上那棵树、也不动 main（update-ref 一次，没有 checkout）',
  /update-ref', 'refs\/heads\/' \+ 底\.名, 底\.支头/.test(开支) && !/checkout/.test(开支));
台.判('「提交分支 =」写 main 或写拼装那一棵都被挡掉', 开支.includes("名 === 'main' || 名 === 拼装支"));
台.判('落笔到支 走的是 分家 那一套（临时索引 + commit-tree + update-ref），不碰工作树，并且把"一家一句"那张表递进去',
  落笔.includes('分家(话, 名, 各家)') && 落笔.includes('各家说明(名)') && !/checkout|reset/.test(落笔));
台.判('落笔之前先叫 文字齐：这一轮那条支那一桶的说明与「本轮说明」哪格空就停下来点名（不拿本轮说明顶到别家头上）',
  落笔.includes('文字齐({ 提交说明: 各家[名], 本轮说明: 话 })') && 落笔.includes('if(!判.行) 停(判.话'));
台.判('落笔前后各读一次 main 那一笔，main 被动了就当场停', 落笔.includes("['rev-parse', 'refs/heads/main']") && 落笔.includes('这一手不该动 main 那一支'));

/* ---------- 四 ---------- */
台.题('四、分家 的默认落点不再是 main');
台.判('分家 收了第二、第三枚参数（落点、各家说明），默认那一头取清单里的支名',
  /export function 分家\(说明, 落点, 各家\)/.test(rep) && 分家.includes("String(落点 || '').trim() || 本轮那一支名()"));
{
  const 表 = { 'plugin/notes': '这一轮便签存档修好了', 'plugin/schedule': '   ' };
  const 报 = 落 => { try{ return '没抛:' + 挑一句(表, 落, '日程 · schedule', '顶上那一句'); }catch(e){ return String(e.message); } };
  台.判('一家一句 真跑：递了那张表就按落点取那一句；那一格空着（连空白也算空）当场抛、点名是哪一笔，话说清不拿「本轮说明」顶上去',
    挑一句(表, 'plugin/notes', '你的便签 · notes', '顶上那一句') === '这一轮便签存档修好了' &&
    !报('plugin/schedule').startsWith('没抛:') && /日程 · schedule/.test(报('plugin/schedule')) &&
    /不拿顶上「本轮说明」那一行顶上去/.test(报('plugin/schedule')));
  台.判('CLI 那趟（--收改动 --msg=…）不递表：那一句是他亲手打的字，照旧一句走到底、不抛；分家 那一圈就叫这一颗挑',
    挑一句(null, 'plugin/notes', '你的便签 · notes', '他 --msg= 打的那一句') === '他 --msg= 打的那一句' &&
    分家.includes('挑一句(各家, 去, 那一笔, 说明)'));
}
{
  const 表 = 各家说明('feature/tweak/46-换吃');
  const 各家支 = 分支家.map(j => j.支);
  台.判('各家说明 真跑：一张表八格（七家那一支 + 这一轮那条支那一桶），名字与落点都对得上（读的是盘上那一格清单，一个字节不写）',
    Object.keys(表).length === 8 && 各家支.every(支 => 支 in 表) && 'feature/tweak/46-换吃' in 表 &&
    各家支.includes('plugin/why-not-write') &&
    Object.values(表).every(v => typeof v === 'string'), JSON.stringify(Object.keys(表)));
  台.判('那一桶的说明就是清单顶上「主程序 · Flow-Desk」那一笔（两颗名字同一颗定义：笔名 与 主程序笔名 都只住在 plugin-repos 那一份）',
    表['feature/tweak/46-换吃'] === 读清单(读盘清单()).描述[主程序笔名] && 主程序笔名 === '主程序 · Flow-Desk' &&
    笔名({ 中文:'日程', id:'schedule' }) === '日程 · schedule' && !/const 笔名 = /.test(rd('src/_build/release.mjs')));
}
台.判('那一句「主 ? 主.支 : 默认落点」在 —— 字面量 main 已经从落点那一句里下台',
  分家.includes('主 ? 主.支 : 默认落点') && !/:\s*'main'/.test(分家));
台.判('本轮那一支名 拿形状校验（旧那三种头一段与四类里能推的都认），空或不成样就抛，不退回 main',
  /export function 本轮那一支名\(\)/.test(rep) && rep.includes('if(!名) throw new Error') &&
  rep.includes('if(!支名形状.test(名) && !可推远程(名).行) throw new Error') && !rep.includes("return 'main'"));
台.判('分家 重拼那一手把落点传给 拼装（盘上这一棵得与那条支对得上）', 分家.includes("拼装('分家提交之后重拼', 默认落点)"));
台.判('拼装 的基点是一个参数，默认才是 main（打包那一趟照旧从 main 起合）',
  /export function 拼装\(在做什么, 基点\)/.test(rep) && /const 主干 = String\(基点 \|\| ''\)\.trim\(\) \|\| 'main'/.test(rep));
台.判('这一颗里剩下的 main 只有「当支头读」与「打包那一趟的基点」两种用法，没有往 main 写的一笔',
  !/update-ref', 'refs\/heads\/main'/.test(rep) && !/往那一支写\('main'/.test(rep));

/* ---------- 五 ---------- */
台.题('五、各家快进：只挪指针，真分叉就停');
台.判('只走指针那一套：merge-tree + commit-tree + update-ref，没有 rebase / amend / --force / checkout',
  快进.includes("'merge-tree', '--write-tree'") && 快进.includes("'commit-tree'") && 快进.includes("'update-ref'") &&
  !/rebase|--amend|--force|'checkout'/.test(快进));
台.判('update-ref 带旧值（那一支被谁挪过就报错，不悄悄盖掉）', /update-ref', 'refs\/heads\/' \+ job\.支, 笔, 支头/.test(快进));
台.判('先问「这一支上有没有 main 里不存在的内容」—— 有就报是哪一家并跳过它，不自动处理',
  快进.includes('那一支独有的别家内容(job, 基)') && 快进.includes('真分叉，停下来人工处理'));
台.判('撞车（merge-tree 合不上）也报是哪一家，话里说明不自动解决', 快进.includes('不自动解决，停下来报这一家'));
台.判('那一份独有内容的判据按「归那一家」算，认的还是 家 那一张表（没有第二份对应表）',
  /return 改\.filter\(f => 归那一家\(f\) !== job\)/.test(独有) && !/'notes'/.test(独有));
台.判('已经在 main 后面那一支不挪（纯快进的那一格先问 is-ancestor）',
  快进.includes('是祖先(支头, 头)') && /merge-base', '--is-ancestor', 甲, 乙/.test(切出(rep, '是祖先')));
台.判('六家不再各自开 PR：pr.mjs 里 push 只有 推支 那一处（第一次建远程 main 那颗已拆），快进那一趟只在合进 main 之后才跑',
  (pr码.match(/'push'/g) || []).length === 1 && pr.includes('还没被合进 main，六家那一支先不快进'));

/* ---------- 六 ---------- */
台.题('六、那条支还没合进 main 就拒绝打包');
台.判('release.mjs 在 照清单发 那一支上问合并状态，用的是 pr.mjs 那一颗（判据只有一份）',
  /import \{ 校验支名, 查合并 \} from '\.\/pr\.mjs'/.test(rel) && rel.includes('查合并(名, { 不拉:true })'));
台.判('没合就停，报那一句原话：先合并 PR，再打包 —— 号要钉在 main 上真实存在的那一笔上',
  rel.includes('先合并 PR，再打包 —— 号要钉在 main 上真实存在的那一笔上'));
台.判('停下来那一段给出查合并那一眼（那颗里就是 merge-base --is-ancestor）',
  rel.includes('查合并那一眼：') && /merge-base', '--is-ancestor', 名, 主干/.test(pr));
台.判('远端合了、本地 main 没跟上时说的是「人工 merge --ff-only」，这一颗不自动合',
  rel.includes('merge --ff-only') && rel.includes('不自动合、不 rebase、不 reset'));
台.判('「提交分支 =」空着也拒绝打包（不能靠猜名字问合并）', rel.includes('清单里那一行「提交分支 =」是空的'));

/* ---------- 七 ---------- */
台.题('七、清单多认「提交分支 =」与「本轮说明 =」（真跑）');
const 样 = 拼清单({ 基线:'1.0.0-alpha', 提交分支:'feature/46-tauri-data', 本轮说明:'外46 搬数据通道那一摊\n第二段从别处粘来的',
  笔:[
    { 名:'主程序 · Flow-Desk', 副题:'这一笔落在 main 那一支', 会动:'会动 · 多了 2 份改动', 现在:'1.0.0-alpha+build.aaaaaaa',
      会成:'1.0.0-alpha+build.（这一笔落下去才知道）', 话:['开头请留着「发布 」这两个字'], 描述:'发布 1.0.0-alpha · 记号', 份:['src/a.mjs', 'src/b.mjs'] },
    { 名:'日程 · schedule', 副题:'这一家的代码在 plugin/schedule 那一支', 会动:'不动', 现在:'1.0.0-alpha+build.bbbbbbb',
      会成:'还是现在这一串（这一家这一轮不动）', 话:[], 描述:null, 份:[] },
  ]});
台.判('写出来是一行一句话：顶上那三行各就各位（版本基线、提交分支、本轮说明），还是没有花括号与绝对路径',
  /^版本基线 = 1\.0\.0-alpha$/m.test(样) && /^提交分支 = feature\/46-tauri-data$/m.test(样) &&
  /^本轮说明 = 外46 搬数据通道那一摊$/m.test(样) && !/[{}]/.test(样.replace(/^\s*#.*/gm, '')) && !/\b[A-Za-z]:[\\/]/.test(样));
台.判('读清单 认那两行，多行本轮说明摊成几行也读回同一串',
  读清单(样).提交分支 === 'feature/46-tauri-data' && 读清单(样).本轮说明 === '外46 搬数据通道那一摊\n第二段从别处粘来的');
台.判('读清单 与 读清单显示 对同一份文件说同一串（那两行与每一笔的更新描述都对得上）',
  (() => { const a = 读清单(样), b = 读清单显示(样), 描 = {};
    for(const x of b.笔) if(x.描述 !== null) 描[x.名] = x.描述;
    return a.提交分支 === b.提交分支 && a.本轮说明 === b.本轮说明 && a.基线 === b.基线 && JSON.stringify(a.描述) === JSON.stringify(描); })());
台.判('改清单 换那两行，其余各行（会动、号、份、说明行、每一笔的更新描述）一颗都不动',
  (() => {
    const 新 = 改清单(样, { 基线:'1.0.0-alpha', 提交分支:'hotfix/9-改两行', 本轮说明:'换成一句话', 描述:{ '主程序 · Flow-Desk':'这一轮换了' } });
    const 留 = ['会不会动 = 会动 · 多了 2 份改动', '现在挂的号 = 1.0.0-alpha+build.aaaaaaa', '动了哪些份 =', '    src/a.mjs',
      '  # 开头请留着「发布 」这两个字', '更新描述 = 这一轮换了'];
    return /^提交分支 = hotfix\/9-改两行$/m.test(新) && /^本轮说明 = 换成一句话$/m.test(新) && 留.every(x => 新.includes(x)) &&
      !新.includes('外46 搬数据通道那一摊') && !新.includes('· 记号');
  })());
台.判('什么都不改时 改清单 回的就是原文（--看 重跑不会把他写的两行搅了）', 改清单(样, { 基线:'1.0.0-alpha' }) === 样);
台.判('他写过的值原样保住：读回来再写回去还是那一串（round-trip）',
  (() => { const 清 = 读清单(样), 显 = 读清单显示(样);
    const 回 = 拼清单({ 基线:清.基线, 提交分支:清.提交分支, 本轮说明:清.本轮说明,
      笔: 显.笔.map(x => ({ 名:x.名, 副题:x.副题, 会动:x.会不会动, 现在:x.现在挂的号, 会成:x.会迭代成, 描述:x.描述, 份:x.份 })) });
    const 二 = 读清单(回); return 二.提交分支 === 清.提交分支 && 二.本轮说明 === 清.本轮说明 && 二.基线 === 清.基线; })());
台.判('老那份清单（没那两行）也能补上：改清单 给那两行时在第一笔之前插进去',
  (() => { const 老 = 样.replace(/^提交分支 = .$\n?/m, '').replace(/^本轮说明 = .*$/gm, '# 空');
    const 新 = 改清单(老, { 提交分支:'feature/9-补一行', 本轮说明:'补一段' });
    return /^提交分支 = feature\/9-补一行$/m.test(新) && /^本轮说明 = 补一段$/m.test(新) &&
      新.indexOf('提交分支') < 新.indexOf('【主程序 · Flow-Desk】'); })());
台.判('--看 给的默认支名一定属于四类之一（默认是「优化」那一类；说明里有中文、纯中文、空说明都顶得住）',
  认支类(支名默认('外46 搬 tauri 数据通道 mjs', '20261011')).类 === '优化' &&
  认支类(支名默认('全是中文没有英文', '20261011')).类 === '优化' &&
  支名默认('', '20261011') === 'feature/tweak/round-20261011');
台.判('那一格头部注释跟着改成五样（⑤ 是「分支类型 =」），并把这一轮的顺序写成：量 → 改清单 → 提交 PR → 他合并 → 再跑打包',
  样.includes('能改的五样') && 样.includes('③ 「提交分支 =」') && 样.includes('④ 「本轮说明 =」') &&
  样.includes('⑤ 「分支类型 =」') && 样.includes('上面那五样改完存盘') &&
  样.includes('① 量：') && 样.includes('② 改清单：') && 样.includes('③ 提交 PR：') && 样.includes('④ 你合并：') && 样.includes('⑤ 再打包：'));
台.判('确认词还是那一颗字，头部也还写着「要他亲手敲一个『推』字」与「回车、空、别的字都不算」',
  确认词 === '推' && 样.includes('亲手敲一个「推」字') && 样.includes('回车、空、别的字都不算'));

/* ---------- 八 ---------- */
台.题('八、那一屏 2026-10-16 整块撤了「版本与推送」：那一摊只剩 pr.mjs 与 release.mjs 两颗命令');
台.判('1 提交 PR 与打包发版那一整手只剩命令：pr.mjs 的 --提交PR、release.mjs 的 --照清单发 还在原处，那一屏既不 spawn 它们，也没有那两颗钮',
  pr.includes("has('--提交PR')") && rel.includes("has('--照清单发')") &&
  !ui.includes("'src/_build/pr.mjs'") && !ui.includes("'src/_build/release.mjs'") &&
  !pg.includes('id="pr"') && !pg.includes('id="发"'));
台.判('2 没合并就打包那一道还在：release.mjs 当场停，报的是那句「先合并 PR，再打包」与 merge-base --is-ancestor 那一眼；那一屏连这句回绝话都没有',
  rel.includes('先合并 PR，再打包 —— 号要钉在 main 上真实存在的那一笔上') && rel.includes('merge-base') &&
  !ui.includes('先合并 PR'));
台.判('3 顶上那三格（提交分支 / 本轮说明 / 分支类型）不进任何屏：那一屏不认支名也不认类型，那两把尺只住在 push-list 与 pr.mjs 里',
  !pg.includes('id="支"') && !pg.includes("取('型')") && !ui.includes('支名可用') && !ui.includes('支类合规') &&
  pr.includes('支名可用(串).行') && pr.includes("from './push-list.mjs'"));
台.判('4 「这几格还空着」那道闸从前是那一屏与后端各拿一份：屏撤了之后这一台一个字都不读那一格清单（清单读写归 pr.mjs 与 release.mjs 那两头）',
  !ui.includes('等字的格') && !pg.includes('等字的格') && !ui.includes('读清单显示') && !ui.includes('改清单') &&
  !ui.includes("from './push-list.mjs'"));
台.判('5 那一屏不再有任何一笔的输入框（提交说明、更新描述那些格子跟着那一页一起撤；他写的字还是进那一格明文清单）',
  !pg.includes('data-会动=') && !pg.includes('参照：') && !pg.includes('textarea'));
台.判('6 往远程送东西那三道连同「敲那一个字才算确认」一起从这一屏撤了：这一台不带 --提交PR、不带 --已确认、没有收字那一颗；本机那三道（只听 127.0.0.1、随机码、坏编码不砸台）由 gate-texticon46 第二与第四节钉',
  !ui.includes('--提交PR') && !ui.includes('--已确认') && !ui.includes('收字') && !pg.includes('确认词') && !ui.includes('确认词'));
台.判('7 那一份「这一趟要推什么」的单只在 pr.mjs 里摊：写明 main、assemble 那条拼装的分支、tag、集成分支都不推；那一屏不再有摊单那一格，也不自己再算一份',
  pr.includes('main：不推（只能你人工合并）· assemble 那条拼装的分支：不推 · tag：不推') && pr.includes('：不推（永不进远程）') &&
  !pg.includes('这一趟还没跑，一个字节都没送') && !ui.includes("'/api/摊单'") && !ui.includes('前瞻单') && !ui.includes('提交单'));

/* ---------- 九 ---------- */
台.题('九、公开面那道闸（推之前必须过）');
const 串 = 私人串清单();
const 串表 = 串.串.map(x => x.串);
const 切段 = p => String(p).split(/[\\/]+/).filter(Boolean);
const 前缀 = p => { const 段 = 切段(p), 出 = []; for(let 到 = 2; 到 <= 段.length; 到++){ 出.push(段[0] + '\\' + 段.slice(1, 到).join('\\')); 出.push(段[0] + '/' + 段.slice(1, 到).join('/')); } return 出; };
const 要 = [...前缀(path.dirname(ROOT.replace(/[\\/]+$/, ''))), ...前缀(os.homedir()), os.userInfo().username];
for(const p of [素材目录, 工区, 存档落点, 探针沙盒, Rust工具链, Rust包缓存, Rust链接件, 编译缓存]){
  if(!/^[A-Za-z]:[\\/]/.test(String(p || ''))) continue;
  要.push(...前缀(p));
  const 段 = 切段(p);
  if(段[1] && !['users', 'programs', 'rust', 'music'].includes(段[1].toLowerCase())) 要.push(段[1]);
  if(/[\s\u4e00-\u9fff]/.test(String(段[2] || ''))) 要.push(段[2]);
}
台.数('现场算出几串（本地登记 ' + 串.登记了 + ' 格）', 串表.length + ' 串');
台.判('要查的那一串一样不缺：仓外那一格两种写法、家目录两种写法、帐户名、私人那一格前两层与那几个目录名',
  要.every(x => 串表.includes(x)), 要.filter(x => !串表.includes(x)).join('、'));
台.判('串全部现场算：public-scan 那一颗里一个私人字面量都没有（把要查的那一串一条一条拿去问它自己，一句都不许在）',
  串表.every(x => !scn.includes(x.串)) && !scn.includes(os.userInfo().username) && !scn.includes(path.dirname(ROOT.replace(/[\\/]+$/, ''))));
台.判('每一串长度都在 3 个字符往上，每一串都写了由来', 串.串.every(x => x.串.length >= 3 && x.由来.length > 1));
台.判('每一串都真查得出来：拿含它的样一行喂 扫文本，必须命中（真跑）',
  串.串.every(x => 扫文本('本地那一格写在 ' + x.串 + ' 底下，别推上去', 串.串).length > 0));
台.判('干净的一行不误报（这一棵树自己、相对路径、仓内那一格都放过）',
  扫文本("const 路 = path.join(TREE, 'data', 'note.json'); // 仓内那一格", 串.串).length === 0);
台.判('扫描面就是那份名单：git diff --name-only --diff-filter=AM 对 origin/main 到这条支（新增与修改都算）',
  scn.includes("'diff', '--name-only', '--diff-filter=AM'") && scn.includes("对 + '...' + 支") && scn.includes("'origin/main'"));
台.判('二进制按后缀跳掉，读的是那一条支上的字节而不是盘上那一份（git show 支:份），带 NUL 的也当二进制',
  是二进制('a/MBHeader.dll') && !是二进制('src/_tauri/src/main.rs') && scn.includes("'show', 支 + ':' + 份") && scn.includes('if(/\\0/.test(文)) continue;'));
台.判('src/tools/本地路径.cjs 不算进扫描面（它本来就不进仓）', 不扫.has('src/tools/本地路径.cjs'));
台.判('pr.mjs 推之前真调用它：公开面闸 排在 push 那一行之前，对的就是 origin/main 到这条支（第一次推 main 那一趟没有基线可比，对的是"进仓的全部文本"）',
  推支.indexOf('公开面闸(名, 远端)') < 推支.indexOf("'push', '-u', 远端, 名") &&
  pr.includes("const 比 = 对 || (远端 || 远端名()) + '/main'"));
台.判('--不推 也照扫（这一道量的是公开面干不干净，不是为推才装的）', 推支.indexOf('公开面闸(名, 远端)') < 推支.indexOf('选项.不推'));
台.判('命中就非零退出并列是哪一份哪一行', /process\.exit\(1\)/.test(scn) && scn.includes("h.份 + ':' + h.行号"));
台.判('闸（gate-tauri46）用的是同一颗，没有第二份判据（也不许把那一串串抄进闸里 —— 抄进去这一份自己就漏了）',
  t46.includes('跑闸(支,') && t46.includes("from '../../_build/public-scan.mjs'") &&
  !私人串清单().串.some(x => t46.includes(x.串)));

/* ---------- 十 ---------- */
台.题('十、gh 不在或未登录：只打印比对地址，不装东西、不要令牌');
台.判('先探 gh 在不在、再问 gh auth status 登没登录（两条都问）',
  切出(pr, 'gh在手').includes("execFileSync('gh', ['--version']") && 切出(pr, 'gh已登录').includes("'auth', 'status'"));
台.判('gh 在且已登录才跑 gh pr create（base=main、head=那条支、带标题与正文）',
  开PR.includes("'pr', 'create', '--base', 'main', '--head', 名, '--title', 标题, '--body', 正文"));
台.判('不在或未登录走打印那一条：比对地址带 expand=1、title 与 body 都编码过',
  开PR.includes('比对地址(名, 标题, 正文') && /expand=1&title=.*&body=/.test(pr) &&
  pr.includes('encodeURIComponent(标题)') && pr.includes('encodeURIComponent(正文)'));
台.判('地址里那条支在 compare 那一段（main...<支>），仓名与主机从 git remote get-url origin 现取、没写死',
  pr.includes("'/compare/main...' + 名") && pr.includes("'remote', 'get-url'") && !/github\.com\/[A-Za-z0-9._-]+\/Flow-Desk/.test(pr));
台.判('两条路都把四样原样报出来：标题、正文、base、compare',
  开PR.includes("'  标题：'") && 开PR.includes("'  base：main'") && 开PR.includes("'  compare：'") && 开PR.includes("'  正文：'"));
台.判('不装任何东西：没有 npm / winget / choco / curl 下载安装那几样', !/npm |winget|choco|curl |Invoke-WebRequest/.test(pr));
台.判('不要令牌：整份 pr.mjs 没有 token / PAT / 口令那一摊，也不读 gh 那一格的凭据文件',
  !/token|TOKEN|PAT\b|passwd|password|\.config\/gh/.test(pr));
台.判('gh auth status 的输出一个字节都不回显（只看它回不回 0）', 切出(pr, 'gh已登录').includes("stdio:['ignore','pipe','pipe']") && !/console\.log\(/.test(切出(pr, 'gh已登录')));

/* ---------- 十一 ---------- */
台.题('十一、推支与建 PR 之前那一道确认');
台.判('读的是终端输入本身（fs.readSync 那一类同步读法），不是猜的', /fs\.readSync\(0/.test(切出(pr, '问一句')));
台.判('比的是一整行正好等于确认词：回车（空）、别的字、读不到都算不过',
  /if\(答 !== 确认词\)/.test(pr) && pr.includes('读不到终端输入'));
台.判('确认不过就回 false，--提交PR 那一串里推支与建 PR 都排在它后面（不确认就走不到 push）',
  pr.indexOf('要他确认(') < pr.indexOf('推支(支.名') && pr.indexOf('要他确认(') < pr.indexOf('开PR(支.名') &&
  /if\(!要他确认\(/.test(pr) && 要确认.includes('return false'));
台.判('那一个「推」字只由终端亲口给：pr.mjs 的 要他确认 认的还是 push-list 那一颗 确认词；那一屏既不问也不代填（连 确认词 这三个字都不该出现）',
  要确认.includes("'  确认词：' + 确认词 + ' > '") && 要确认.includes('if(答 !== 确认词)') &&
  !ui.includes('确认词') && !pg.includes('确认词') && !ui.includes('当值.收'));
台.判('那一颗字只有一个出处：push-list 导出的 确认词，pr/release/ui 都没再写死一遍',
  !/=== '推'/.test(pr + rel + ui) && 确认词 === '推' && pr.includes("from './push-list.mjs'") && pr.includes('确认词'));

台.题('十二、号那套一个都没改');
台.判('主程序还是取 main 上那笔空的「发布」记号，号 = 底号+build.<那一笔>',
  rel.includes("git(TREE, ['commit-tree', git(TREE, ['rev-parse', 'main^{tree}']), '-p', 'main', '-m'") &&
  rel.includes("update-ref', 'refs/heads/main', 笔, 旧") && rel.includes("主号 = 底号() + '+build.' + 主短"));
台.判('六家还是取各自那一支最后动过代码的一笔（跳过「记号 」起头那一类笔），为写还是它自己那一棵',
  rel.includes('那一支最后一笔(job)') && rep.includes("--grep=^记号 ") && rep.includes("--grep=发布记号"));
台.判('tag 还是钉在代码那一笔上，不钉在记号那一笔', rel.includes("打tag(r.dir, 'v' + r.号") && rel.includes('r.sha'));
台.判('号那一套一个都没改：那一支最后一笔 与 底号+build. 两串还在原处（pr.mjs 不参与取号）', !/底号|那一支最后一笔/.test(pr));

/* ---------- 十三、阶段二那两步与「重建集成分支」（他 2026-10-12 第 2、7 件）---------- */
台.题('十三、main → 功能支 → 集成分支：方向钉死、撞车不自动解、校验排在挪指针之前');
{
  const 根 = () => String(execFileSync('git', ['-C', ROOT, 'for-each-ref', '--format=%(refname:short)=%(objectname)', 'refs/heads/'],
    { encoding: 'utf8' })).split(/\r?\n/).filter(Boolean).sort().join('、');
  const 前 = 根();
  const 抛 = 手 => { try{ return '没抛:' + JSON.stringify(手()).slice(0, 60); }catch(e){ return String((e && e.message) || e); } };
  const 甲 = 抛(() => 重建集成分支([])), 乙 = 抛(() => 重建集成分支(['main']));
  const 丙 = 抛(() => 重建集成分支(['assemble'])), 丁 = 抛(() => 重建集成分支([集成分支名]));
  const 戊 = 抛(() => 重建集成分支(['feature/外46'])), 己 = 抛(() => 合进那条支('main', 'main'));
  const 庚 = 抛(() => 合进那条支('feature/tweak/没这一条', 'main', { 起点: '没这一根' }));
  台.判('1 七道输入闸各拦各的（真跑）：一条没勾 / 勾主干 / 勾拼装那一棵 / 勾集成分支本身 / 勾认不出类的 / 自合 / 起点取不到',
    /一条支都没勾/.test(甲) && /不能往集成分支上合：main/.test(乙) && /不能往集成分支上合：assemble/.test(丙) &&
    /不能往集成分支上合：local\/all-features-test/.test(丁) && /不是那两类前瞻支/.test(戊) &&
    /合进它自己/.test(己) && /取不到那一笔/.test(庚), [甲, 乙, 丙, 丁, 戊, 己, 庚].map(s => s.slice(0, 26)).join(' | '));
  台.判('2 这七次真跑一个字节都没落下：本地每一根指针的 sha 与跑之前一模一样（盯的是"校验必须排在 update-ref 之前"）',
    根() === 前, 根() === 前 ? '' : '跑前 ' + 前.slice(0, 60) + ' ≠ 跑后 ' + 根().slice(0, 60));
  const 合 = 切出(rep, '合进那条支'), 重 = 切出(rep, '重建集成分支');
  台.判('3 走的还是那套底层接口：merge-tree 现合一棵 + commit-tree 两枚父 + update-ref 带旧值挪；不 checkout、不 reset、不 --force',
    合.includes("'merge-tree', '--write-tree'") && 合.includes("'-p', 支头, '-p', 从头") &&
    合.includes("'update-ref', 'refs/heads/' + 支, 新, 支头") && !/checkout|reset|--force/.test(合));
  台.判('4 撞车不自动解：抛的话说清"冲突只在这一支里解、不许切到 main 去合"，并把撞的份与人工那一眼列出来',
    合.includes('撞车') && 合.includes('不许切到 ') && 合.includes('撞在这些份') && 合.includes('log --oneline'));
  台.判('5 主干那一笔已经全在支里就不造空的一笔（幂等），方向只有一条：动的只有 支 那一根',
    合.includes("'merge-base', '--is-ancestor', 从头, 支头]") && 合.includes('这一趟不用合') &&
    !/update-ref[^)]*refs\/heads\/main/.test(合));
  台.判('6 重建那一颗一条一条合：撞车的那一条点名跳过、后面合得上的照旧合（一条撞车不许把后面全部带走 —— 2026-10-14 他「完整版打包没打上」：八项全勾，第五项撞车停住，后面三条合得上的也没合，打出来只有 4 项），但一个字都不替他解',
    重.includes('下轮.push(名)') && 重.includes('跳的') && 重.includes('撞单') &&
    !/throw new Error\('合到「/.test(重) && 合.includes('不许切到 '));
  {
    /* 真跑要一对会撞车的分支。八项都合回 main 之后，仓里现成的分支两两都不撞了，所以这一节自己造：
       同一份文件两边各写一行 → 撞；再造一笔把两行都收进来 → 那根"已经齐"的支。
       造的只有提交对象与四根临时 ref（跑完全删）+ 一根临时索引文件，他那几根指针一根不碰。 */
    const 件 = 'data/gate-clash.txt';
    const 索引 = path.join(os.tmpdir(), 'fd-闸验索引-' + process.pid);
    const 环 = { ...process.env, GIT_DIR: path.join(ROOT, '.git'), GIT_INDEX_FILE: 索引 };
    const 造跑 = (参, 入) => execFileSync('git', 参, { env:环, encoding:'utf8', ...(入 === undefined ? {} : { input:入 }) }).trim();
    const 跑 = 参 => execFileSync('git', ['-C', ROOT, ...参], { encoding:'utf8' }).trim();
    const 那根 = 名 => { try{ return 跑(['rev-parse', 名]); }catch(e){ return ''; } };
    const 底 = 跑(['rev-parse', 'main']);
    const 造一笔 = (内容, 父, 另些父) => {
      造跑(['read-tree', 父]);
      const 块 = 造跑(['hash-object', '-w', '--stdin'], 内容);
      造跑(['update-index', '--add', '--cacheinfo', '100644,' + 块 + ',' + 件]);
      const 树 = 造跑(['write-tree']);
      const 参2 = ['commit-tree', 树];
      for(const p of [父].concat(另些父 || [])) 参2.push('-p', p);
      return 造跑(参2, '');   // 说明空着：这一台往他历史里落的每一笔都不该带一个字
    };
    const 甲名 = 'feature/new/gate-clash-a', 乙名 = 'feature/new/gate-clash-b', 试名 = 'tmp/闸验跳过', 退名 = 'tmp/闸验退回';
    let 果 = null, 抛话 = '', 前 = '', 后 = '', 抛二 = '', 前2 = 根();
    try{
      const 甲 = 造一笔('甲的这一行\n', 底), 乙 = 造一笔('乙的这一行\n', 底);
      跑(['update-ref', 'refs/heads/' + 甲名, 甲]); 跑(['update-ref', 'refs/heads/' + 乙名, 乙]);
      果 = 重建集成分支([甲名, 乙名], { 集成分支: 试名 });
      const 丙 = 造一笔('甲的这一行\n乙的这一行\n', 甲, [乙]);   // 两行都在的那一棵 = "已经齐"
      跑(['update-ref', 'refs/heads/' + 退名, 丙]);
      前 = 那根(退名);
      try{ 重建集成分支([甲名, 乙名], { 集成分支: 退名 }); 抛二 = '没抛：那一根被从两条退成了一条'; }
      catch(e){ 抛二 = String((e && e.message) || e); }
      后 = 那根(退名);
    }catch(e){ 抛话 = String((e && e.message) || e); }
    finally{
      for(const 名 of [甲名, 乙名, 试名, 退名]){ try{ 跑(['update-ref', '-d', 'refs/heads/' + 名]); }catch(e){} }
      try{ fs.rmSync(索引, { force: true }); }catch(e){}
    }
    台.判('7 真跑：一条撞车的后面那条合得上的照样合上去，撞车那条进 跳的 并点名撞在哪几份（他那几根指针一根没动）',
      !!果 && !抛话 && 果.合了.length === 1 && 果.合了[0].支 === 甲名 && 果.跳的.join() === 乙名 &&
      果.撞单.length === 1 && 果.撞单[0].撞.some(p => p === 件) && 根() === 前2,
      果 ? '合了 ' + 果.合了.map(x => x.支).join('、') + ' · 跳的 ' + 果.跳的.join('、') +
        ' · 撞在 ' + (果.撞单[0] || {}).撞?.join('、') : '抛了：' + 抛话.slice(0, 120));
    台.判('10 退回保护（真跑）：那一根已经装着两条时，一条一条重合只合得上 1 条 —— 必须原样退回并停下（按一颗钮把齐的退成缺的，就是丢东西）',
      /退回成/.test(抛二) && 前.length === 40 && 后 === 前 && 根() === 前2,
      前.slice(0, 7) + ' → ' + 后.slice(0, 7) + ' · ' + 抛二.split(/\r?\n/)[0].slice(0, 70));
  }
  台.判('8 --提交PR 那一串里这两下排在 要你确认 与 推支 之前，确认那一格还多列一行"本地已经合过"',
    提PR.indexOf('合进那条支(支.名,') < 提PR.indexOf('要他确认(') &&
    提PR.indexOf('合进那条支(集成分支名,') < 提PR.indexOf('推支(支.名') && 提PR.includes('本地已经合过'));
  台.判('9 集成分支那一条名字只有一份：支类表 那条「集成」正则就是拿它钉出来的（改天换名不会两处不一样）',
    lst.includes('export const 集成分支名 =') && lst.includes('正则: 钉死(集成分支名)') &&
    认支类(集成分支名).类 === '集成' && 可推远程(集成分支名).行 === false, 集成分支名);
}

/* ---------- 十四、只在本地那一条清单（他 2026-10-12 第 5 件）---------- */
台.题('十四、没推的前瞻支：量出来的那几条带齐名字、哪一类、几笔、几份（屏上那一栏 2026-10-16 跟着那一页一起撤了，只剩这一颗判断与命令行）');
{
  const 列 = 本地前瞻支();
  台.判('1 真跑：量出来的每一条都是那两类前瞻支之一，且相对主干确实有笔（不列空壳）',
    列.every(x => (x.类 === '新增' || x.类 === '优化') && x.笔数 > 0 && /^feature\/(new|tweak)\//.test(x.名)) &&
    !列.some(x => ['main', 'assemble', 'plugin/notes'].includes(x.名)), 列.map(x => x.名 + '=' + x.笔数 + '笔/' + x.份数 + '份').join(' | ') || '（一条都没有）');
  台.判('2 每一条都带齐屏上要摊开的六样：名字、哪一类、几笔、哪几笔、几份、远程有没有它',
    列.every(x => typeof x.已推 === 'boolean' && Array.isArray(x.笔) && Array.isArray(x.份) &&
      x.笔.length === x.笔数 && typeof x.份全 === 'boolean'), 列.length + ' 条');
  台.判('3 这一颗全程纯读：没有 git 的 fetch / push / update-ref 那一类写法（拿不到主干就干脆不列，不蒙一条空的给你看）',
    !/['"]fetch['"]|['"]push['"]|update-ref/.test(代码(切出(rep, '本地前瞻支'))) &&
    代码(切出(rep, '本地前瞻支')).includes('catch(e){ continue; }'),
    (代码(切出(rep, '本地前瞻支')).match(/['"]fetch['"]|['"]push['"]|update-ref/g) || []).join('、'));
  台.判('4 屏上不再摆那一栏（2026-10-14 他把拆分撤了：八项都在 main 里；2026-10-16 那一页整块没了）：那一格、那颗钮、那种勾都不在屏上',
    !pg.includes('function 画前瞻') && !pg.includes('id="只在"') && !pg.includes('id="八项"') &&
    !pg.includes('id="推项格"') && !pg.includes('id="集成"') && !pg.includes('id="完整"'),
    ['画前瞻', 'id="只在"', 'id="八项"', 'id="推项格"', 'id="集成"', 'id="完整"'].filter(s => pg.includes(s)).join('、') || '屏上六样都没有');
  台.判('5 重建集成分支那一道只剩命令：pr.mjs 的 --重建集成分支 还在（不点 --支= 就取量出来的那些），这一屏那两条路由（/api/集成 与 /api/完整）跟着那一页一起撤了',
    pr.includes("has('--重建集成分支')") && pr.includes('一条都没有 ——') &&
    !ui.includes("'/api/集成'") && !ui.includes("'/api/完整'") && !ui.includes('--重建集成分支') &&
    !pg.includes('id="集成"') && !pg.includes('id="完整"'));
  台.判('6 那几条一条都没量到，由命令自己说那一行「一条都没有」，不拿空列表去挪那一根；屏上那道 400 跟着那一页一起撤了',
    !ui.includes('一条支都没勾') && pr.includes('一条都没有 ——'));
}

台.收尾();
