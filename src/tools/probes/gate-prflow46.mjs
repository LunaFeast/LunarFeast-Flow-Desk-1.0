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
     八、那一屏两颗按钮的先后：提交 PR 在前、打包发版他合并之后才亮；顶上多了「提交分支」那一格；
     九、公开面那道闸：串全部现场算（这台的位置、帐户名、私人目录名一串都不缺）、扫的是
        origin/main 到这条支之间新增和修改的每一本文本、二进制跳过、本地那一颗不算进扫描面，
        而且 pr.mjs 推之前真调用它；
     十、gh 不在或没登录时走「打印比对地址」那一条：不装任何东西、不要任何令牌、仓名现取不写死；
     十一、要他亲手敲那一个「推」字那一道跟着推支走，读的还是终端输入本身，非确认词一个字节都不推；
     十二、号那套一个字都没改。
   能真跑的（第三、第七、第九那些形状与判据）一律真跑，不拿正则糊过去。
   ============================================================ */
import os from 'node:os';
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
const ui = rd('src/_build/push-ui.mjs');
const pg = rd('src/_build/push-ui.html');
const scn = rd('src/_build/public-scan.mjs');
const lst = rd('src/_build/push-list.mjs');
const 提PR = pr.slice(pr.indexOf("has('--提交PR')"), pr.indexOf('else 跑(() => 停('));
const t46 = rd('src/tools/probes/gate-tauri46.mjs');
/* lib-slice 那颗 切 认的是行首的 const/function；这几颗如今都带 export 头，先把 export 那六个字摘掉再切 */
const 切出 = (文, 名) => 切(文.replace(/^export /gm, ''), 名);
const 推支 = 切出(pr, '推支');
const 同步 = 切出(pr, '同步远程');
const 开支 = 切出(pr, '本轮那一支');
const 落笔 = 切出(pr, '落笔到支');
const 开PR = 切出(pr, '开PR');
const 在用 = 切出(pr, '支名在用');
const 要确认 = 切出(pr, '要他确认');
const 快进 = 切出(rep, '各家快进');
const 分家 = 切出(rep, '分家');
const 独有 = 切出(rep, '那一支独有的别家内容');
/* 负判（"这一颗里没有那一手"）量的是代码不是散文：先把块注释与整行注释摘掉，
   免得头部说明里那句「这一颗里没有 push origin main」自己把自己判死。 */
const 代码 = 文 => String(文).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const pr码 = 代码(pr), rel码 = 代码(rel);

/* ---------- 一 ---------- */
台.题('一、推这一手只推一条支：main、tag、拼装那一棵、自动合并都不在 pr.mjs 里');
台.判('没有 push origin main 那一手（代码里没有 push 与 main 同在一句里，也没有把远端名与 main 写在一起的参数）',
  !/push[^\n]*\bmain\b/.test(pr码) && !/'push', 'origin', 'main'/.test(pr码));
台.判('没有 --force、没有 -f、没有强推那一手', !/--force/.test(pr码) && !/'-f'/.test(pr码));
台.判('没有 --tags（tag 只在本地打，推 tag 这一轮不做）', !/--tags/.test(pr码));
台.判('推支 那一颗点名挡掉 main 与拼装那一棵', 推支.includes("名 === 'main' || 名 === 拼装支") && 推支.includes('不推 '));
台.判('推那一步再钉一道名单闸（他第 4 件）：认不出类的与集成分支那种永不进远程的都拦，且拦在 公开面闸 与 push 之前',
  推支.includes('支名可用(名)') && 推支.includes('if(!可.行) 停(') &&
  推支.indexOf('支名可用(名)') < 推支.indexOf('公开面闸(名, 远端)') && 推支.indexOf('公开面闸(名, 远端)') < 推支.indexOf("'push', '-u', 远端, 名"));
台.判('不自动合并：没有 gh pr merge、没有 --auto、不跑 git merge', !/'pr', 'merge'/.test(pr) && !/--auto/.test(pr) && !/'merge'/.test(pr));
台.判('建完 PR 就停：开PR 那一颗里没有第二趟 git 写活', !/execFileSync\('git'/.test(开PR));
台.判('pr.mjs 里 push 只有一处，就是 推支 里那一处', (pr.match(/'push'/g) || []).length === 1 && 推支.includes("'push', '-u', 远端, 名"));
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
  /update-ref', 'refs\/heads\/' \+ 名, 支头/.test(开支) && !/checkout/.test(开支));
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
台.判('六家不再各自开 PR：pr.mjs 里 push 只有一处，快进那一趟只在合进 main 之后才跑',
  (pr.match(/'push'/g) || []).length === 1 && pr.includes('还没被合进 main，六家那一支先不快进'));

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
台.题('八、那一屏：两颗按钮的先后与顶上那一格');
台.判('「提交 PR」起的是 pr.mjs --提交PR 那一整手，日志流回同一屏',
  ui.includes("['src/_build/pr.mjs', '--提交PR']") && ui.includes('推支→建 PR'));
台.判('「打包发版」起的是 release.mjs --照清单发，标题里不再写「等你确认」',
  ui.includes("['src/_build/release.mjs', '--照清单发']") && !ui.includes('最后等你确认'));
台.判('没合并就点打包：后端当场回绝那句「先合并 PR，再打包」，界面上那颗也先不亮',
  ui.includes('先合并 PR，再打包 —— 号要钉在 main 上真实存在的那一笔上') && pg.includes("!(合 && 合.本地)"));
台.判('顶上多了「提交分支」那一格：能改、能粘贴，读回来也写回去',
  pg.includes('id="支"') && pg.includes("取('支').value") && pg.includes('提交分支: 取') && pg.includes('本轮说明: 取'));
台.判('支名那一格后端也过同一把尺（这一屏不再自己判：收与不收只问 支名可用）',
  ui.includes('if(!支名收(名)){ 发(res, 400, 支名拒话(名)); return; }') &&
  ui.includes('const 支名收 = 名 => 支名可用(名).行;') && ui.includes('支名可用(串).话') && !/支名形状/.test(ui));
台.判('「分支类型」那一格：下拉里那四个名字从服务端那张表来（页面不自己抄一份），后端只收那四个或空着',
  ui.includes('支类: 支类表.map(c => ({ 类: c.类, 话: c.话 }))') && ui.includes('!支类表.some(c => c.类 === 型)') &&
  pg.includes('(对.支类 || []).map(c =>') && pg.includes('<option value="">（照支名认）</option>') &&
  pg.includes("分支类型: 取('型').value"));
台.判('类型与支名不是同一类：后端 400 拒收，屏幕上那一行也当场报出来（不等走到落笔那一步才发现）',
  ui.includes('const 判 = 支类合规(型, 名); if(!判.行)') && pg.includes('对.类判 && 对.类判.行 === false'));
台.判('「不点就不落笔」两颗都在：屏幕那颗钮按 等字的格 的同一把尺不亮，后端 /api/pr 也拿它挡在起子进程之前',
  pg.includes('function 等字()') && pg.includes('textarea[data-会动="1"]') && pg.includes('取(\'pr\').disabled = 底 || !!缺.length || 没说明') &&
  ui.includes('const 缺 = 等字的格(读清单显示(文));') && ui.includes("if(缺.length){ 发(res, 409, '这几格还空着"));
台.判('界面上每一笔的输入框拿参照文字当 placeholder（我交的那句只在提示里，不进数据那一格）',
  pg.includes("'参照：' + b.参照") && pg.includes('这一笔的提交说明，你自己写') && pg.includes('data-会动='));
台.判('端口、只听 127.0.0.1、随机码、坏编码不砸台、页面关掉补空行 —— 一条都没退化',
  ui.includes("服务器.listen(PORT, '127.0.0.1'") && /PORT \|\| 8792/.test(ui) && /const 码 = crypto\.randomBytes/.test(ui) &&
  /req\.headers\['x-push-code'\] !== 码/.test(ui) && ui.includes('try{ return decodeURIComponent(u); }catch(e){ return u; }') &&
  ui.includes("res.on('close'") && ui.includes('当值.等确认') && ui.includes("子.stdin.write('\\n')"));
台.判('那一屏不再写「几根指针都推上去」：确认那一格说的是只推这一条支、main 与 tag 都不推',
  pg.includes('要推的就是上面日志里列的那一条支') && pg.includes('main 不推、拼装那一棵不推、tag 不推') && !pg.includes('那几根指针'));

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
台.判('pr.mjs 推之前真调用它：公开面闸 排在 push 那一行之前，对的就是 origin/main 到这条支',
  推支.indexOf('公开面闸(名, 远端)') < 推支.indexOf("'push', '-u', 远端, 名") && pr.includes("const 对 = (远端 || 远端名()) + '/main'"));
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
台.判('它打印的那一句和 push-ui 等的那一句是同一串字（界面靠这一句才出现那一格输入框）',
  要确认.includes("'  确认词：' + 确认词 + ' > '") && ui.includes("当值.收.includes('确认词：' + 确认词)"));
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
  台.判('6 重建那一颗一条一条合：撞车就报是哪一条撞的、已经合上去的是哪几条，那一根停在原地不跳着合',
    重.includes('for(const 名 of 挑)') && 重.includes('合到「') && 重.includes('已经合上去的是') && 重.includes('没有自动解'));
  台.判('7 --提交PR 那一串里这两下排在 要你确认 与 推支 之前，确认那一格还多列一行"本地已经合过"',
    提PR.indexOf('合进那条支(支.名,') < 提PR.indexOf('要他确认(') &&
    提PR.indexOf('合进那条支(集成分支名,') < 提PR.indexOf('推支(支.名') && 提PR.includes('本地已经合过'));
  台.判('8 集成分支那一条名字只有一份：支类表 那条「集成」正则就是拿它钉出来的（改天换名不会两处不一样）',
    lst.includes('export const 集成分支名 =') && lst.includes('正则: 钉死(集成分支名)') &&
    认支类(集成分支名).类 === '集成' && 可推远程(集成分支名).行 === false, 集成分支名);
}

/* ---------- 十四、只在本地那一条清单（他 2026-10-12 第 5 件）---------- */
台.题('十四、没推的前瞻支在屏上标「只在本地」，并列出它相对基础版多了哪几处');
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
  台.判('4 屏上那一条在：一格一支、标「只在本地」、勾一颗、多了哪几笔与哪几份都摊得开',
    pg.includes('function 画前瞻') && pg.includes('只在本地') && pg.includes("data-支=") &&
    pg.includes('多了哪几笔') && pg.includes('多了哪几份') && pg.includes('相对基础版多'));
  台.判('5 集成分支那一根名字从服务端递过来（页面不写死），重建那颗拿勾中的那几条去叫 --重建集成分支',
    ui.includes('集成: 集成分支名') && pg.includes('集成名 = 对.集成') && !/local\/all-features-test/.test(pg) &&
    ui.includes("路 === '/api/集成'") && ui.includes("'--重建集成分支', '--支=' + 列.join(',')") &&
    pg.includes("跑('集成', '重建集成分支', { 支: 列 })"));
  台.判('6 一条都没勾时后端 400、前端也不起那一趟（不拿空列表去挪那一根）',
    ui.includes("if(!列.length){ 发(res, 400, '一条支都没勾") && pg.includes('一条都没勾：先在那几条前瞻支上勾'));
  台.判('7 点下「重建集成分支」之前先复述一遍要合谁、说清那一根从 main 重新起且旧的不删（挪指针的手不留悄悄）',
    pg.includes('if(!confirm(') && pg.includes('那一根先从本地 main 重新起') && pg.includes('旧 assemble 那一支一个字不动') && pg.includes('全程不推远程'));
}

台.收尾();
