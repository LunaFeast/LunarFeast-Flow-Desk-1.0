/* ============================================================
   gate-release44.mjs · 外44 三：发布脚本那九条 + 号只跟内容代码 + 铺那台不再有第二套口径
   ------------------------------------------------------------
     node src/tools/probes/gate-release44.mjs
   钉的是"顺序"和"闸"，不是钉某一行代码长什么样：
     ① 主仓没提交完不许发；② 七棵各自独立、没动整棵跳过；③ 各用各仓的哈希 + 本地 tag；
     ④ 号当环境变量传进打包（源码不改不写不滚）；⑤ 打包任何一步失败就当场停；⑥ 这一颗一个字节都不推
        （2026-10-11 的口径：推只推这一轮那条支，那一整手在 pr.mjs，要他亲手敲确认词那一道跟着推支走，见 gate-push46）；
     ⑦ 铺那台被 import 的时候一个字都不跑（这一条是我自己踩过一次才钉上的）
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-release44');
const rel = rd('src/_build/release.mjs');
const pr = rd('src/_build/pr.mjs');
const rep = rd('src/_build/plugin-repos.mjs');
const ver = rd('src/_build/version.mjs');
const pub = rd('src/pack/publish.mjs');

台.题('一、号：打包一次，尾巴那枚短哈希才变一次');
台.判('取号那一格：环境变量 FD_BUILD 是第一优先（发布脚本传进来就用它）', /process\.env\.FD_BUILD/.test(ver));
台.判('没传的时候退回 HEAD 那一笔（同一笔上重复生成不会凭空长号）', /rev-parse', '--short', 'HEAD/.test(ver));
台.判('号里没有任何"自己加一"的计数器', !/下一号|落账/.test(ver));
台.判('发布脚本每跑一次先落一笔"发布"提交当记号（源码一个字不改；外46 起走 commit-tree，不在盘上切树）', /'commit-tree'/.test(rel) && /main\^\{tree\}/.test(rel) && /这一趟打包的记号/.test(rel) && /源码一个字没改/.test(rel));
台.判('那一笔的短哈希就是这一趟的号，且传给打包', /主短 = git\(TREE, \['rev-parse', '--short', 笔\]\)/.test(rel) && /FD_BUILD: 主短/.test(rel));
台.判('只量那一趟不落那一笔（看计划不長号）', rel.indexOf("if(DRY){\n  P('主程序") > 0);
台.判('打包完把老版本挪去存档那一格（不是就地删），只认产物自己的名字、不碰文稿',
  /function 挪\(from, to\)/.test(rel) && /存档落点/.test(rel) && /\^Flow_Desk_/.test(rel) && !/rmSync\(path\.join\(格, n\)\)/.test(rel));

台.题('二、发布脚本那九条');
台.判('① 主仓有没提交的改动就停下报清单（不替他提交主仓）', /status', '--porcelain'/.test(rel) && rel.includes('要么提交掉，要么这一轮别发'));
台.判('① 程序开着也不发（页面和程序壳那一层被它读着）', /IMAGENAME eq Flow-Desk\.exe/.test(rel));
台.判('② 六家一种形状：拿各自那一支与拼装那一棵对树，独立仓那一条路（逐字节比自己那棵）整条退了',
  !/function 会动吗\(/.test(rel) && !/job\.仓/.test(rel) && /git\(TREE, \['diff', '--name-only', job\.支, 拼装支/.test(rel));
台.判('② 没动的那一家整家跳过：不送、不落笔、不打 tag', /if\(送\) P\(/.test(rel) && /if\(r\.动了\) r\.新tag/.test(rel));
台.判('② 送回各自那一支与写号都只叫 plugin-repos 那几颗底层接口（不在这里抄第二份）',
  /import \{[^}]*同步那一支[^}]*\} from/.test(rel) && /import \{[^}]*往那一支写/.test(rel) &&
  !/'src\/_build\/plugin-repos\.mjs', '--only='/.test(rel));
台.判('③ 每一家的号用它自己那一支上最后动过代码的那一笔的短哈希拼', /底号\(\) \+ '\+build\.' \+ 笔/.test(rel) && /那一支最后一笔\(job\)/.test(rel));
台.判('③ tag 由脚本本地打（v + 完整号），同名钉在另一笔上就停下', /git\(dir, \['tag', '-a', name/.test(rel) && rel.includes('别让它指歪'));
台.判('④ 号当环境变量传进打包：FD_BUILD + FD_PLUGINS 两格', /FD_BUILD: 主短/.test(rel) && /FD_PLUGINS: JSON\.stringify/.test(rel));
台.判('④ 打包那三趟按顺序跑：生成 → 铺出厂镜像 → 出发布物', rel.indexOf('src/_fd/build.mjs') < rel.indexOf('src/pack/build-app.mjs') && rel.indexOf('src/pack/build-app.mjs') < rel.indexOf('src/pack/publish.mjs'));
台.判('⑤ 任何一步砸了都走 停（里面一律不推）', rel.indexOf('停(') > 0 && /process\.exit\(1\)/.test(rel));
台.判('⑥ 这一颗一个字节都不推：release.mjs 里没有 push 那一手，推只在 pr.mjs 里推那一条支，而且排在同步→开支→落笔→扫公开面 之后',
  !/'push'/.test(rel) && !/push origin/.test(rel) &&
  pr.indexOf("'push', '-u', 远端, 名") > pr.indexOf('export function 同步远程') &&
  pr.indexOf('公开面闸(名, 远端)') < pr.indexOf("'push', '-u', 远端, 名") && pr.indexOf('公开面闸(名, 远端)') > pr.indexOf('export function 同步远程'));
台.判('⑥ 提交都已经在远端的棵不推（--dry 也不推）', /未推 === 0/.test(rel) && rel.includes('提交都已经在远端了，不推'));
台.判('试跑那一格留得下来：--不推 走完提交到本地 tag，一根不推（tag 是本地对象，不外传）', /const NOPUSH = has\('--不推'\)/.test(rel) && /if\(!NOPUSH\)/.test(rel) && rel.indexOf('打tag(TREE,') < rel.indexOf('if(!NOPUSH)'));
台.判('看一眼那两格留得下来：--dry 与 --看 都在真打包之前就退出，仓里什么都没写（自测包那一道里也写着 publish 那一名，所以钉的是真调用那一处）',
  /if\(DRY\)\{/.test(rel) && rel.includes('（--dry：什么都没写') && rel.includes('（--看：仓里什么都没写') &&
  rel.indexOf('process.exit(0)') < rel.indexOf("跑(process.execPath, ['src/pack/publish.mjs'])"));

台.题('三、插件那一头的旧口径撤干净了');
台.判('不再压成一颗没有爹的提交（amend / reset --soft 都下台了）', !/--amend/.test(rep) && !/'reset', '-q', '--soft'/.test(rep));
台.判('不再顺手 reflog expire / gc（那一套是为 amend 收尸的）', !/reflog', 'expire/.test(rep) && !/'gc', '--prune=now'/.test(rep));
台.判('有改动才另起一笔、树没变一个字都不落（独立仓那一棵的「新提交一笔 / 造了首次提交」跟着退了）',
  /if\(老树 && 老树 === 树\) return ''/.test(rep) && !/造了首次提交/.test(rep));
台.判('被当零件 import 时命令行那一段一个字都不跑', /if\(被当命令跑\)\{/.test(rep) && /const 被当命令跑 =/.test(rep));
/* Windows 上 import 绝对路径要写成 file:// URL，直接给盘符那一串会当场抛协议不对（路径从 lib-slice 那一颗取，不在这儿写死） */
const 那颗URL = pathToFileURL(path.resolve(ROOT, 'src/_build/plugin-repos.mjs')).href;
台.判('这一条不是白钉的：import 它一次，只报几家几棵，不报仓名（带独立仓那一家 2026-10-13 起是 0 棵）', (() => {
  const out = execFileSync(process.execPath, ['-e', 'import(' + JSON.stringify(那颗URL) + ').then(m => console.log("登记 " + m.家.length + " 家 · 要铺 " + m.REPOS.length + " 棵"))'],
    { cwd:ROOT, encoding:'utf8' });
  return out.trim() === '登记 6 家 · 要铺 0 棵' && !/Flow-Desk-plugin-/.test(out);
})());

台.题('四、插件清单里那一格老版本不再当成打包取的号');
台.判('publish 认 FD_PLUGINS 传进来的那一家自己的号', /const 递来的家 = \(\(\) =>/.test(pub) && /递来的家 && 递来的家\[m\.id\] && 递来的家\[m\.id\]\.version/.test(pub));
台.判('传进来的不是合法 JSON 就当场报错，不静悄悄退回老号', /FD_PLUGINS 传进来的不是合法 JSON/.test(pub));
台.判('安装标记里带上每一家的号和它要的外壳那一档（他第九条要的那三样）', /plugins: shelf\.map\(p => \(\{ id:p\.id, name:p\.name, version:p\.version, 兼容外壳:p\.minShell/.test(pub));

台.题('五、本地自测包那一道（流程第 3 步「本地打包简装版，我手动测试」）');
{
  const 起 = rel.indexOf('if(自测){');
  const 自 = 起 < 0 ? '' : rel.slice(起, rel.indexOf('\n}\n', 起) + 3);
  台.判('0 那一道切得出来（不是空切片：切不到就是这一档被挪走或删了，下面几条会全成空跑）',
    自.length > 400, 自.length + ' 字');
  台.判('1 这一档只跑那三趟，且四样 git 写活一个都不沾：不落笔、不挪指针、不打 tag、不推',
    /'src\/_fd\/build\.mjs', 'src\/pack\/build-app\.mjs', 'src\/pack\/publish\.mjs'/.test(自) &&
    !/commit-tree|update-ref|merge-tree|往那一支写|拼装\(|同步那一支\(|'tag'|'push'/.test(自), '三趟 + 零写活');
  台.判('2 号只当环境变量传进生成那一趟（不写 version.json、不写各家清单）',
    /FD_BUILD: 短/.test(自) && !自.includes('写清单(') && !自.includes('号写回清单'));
  台.判('3 盘上没提交照打（这一趟要量的就是这些），但 Flow-Desk 开着就停 —— 页面与壳那一层会被它自己咬住',
    /status', '--porcelain'/.test(自) && /IMAGENAME eq Flow-Desk\.exe/.test(自) && !自.includes('要么提交掉'));
  台.判('4 那道「必须已合进 main」的闸不适用于这一档（第 3 步本来就发生在推送与合并之前）',
    !自.includes('查合并') && !自.includes('先合并 PR'));
  /* 反向验：三样坏输入喂进真命令，必须当场报红且什么都不跑（这两道都在跑任何一趟之前就停） */
  const 砸 = (参数) => { try{ const out = execFileSync(process.execPath, ['src/_build/release.mjs'].concat(参数),
      { cwd:ROOT, encoding:'utf8', stdio:['ignore','pipe','pipe'] }); return { 码:0, 文:out }; }
    catch(e){ return { 码:e.status, 文:String((e && (e.stderr || e.stdout)) || (e && e.message) || e) }; } };
  const 甲 = 砸(['--打自测包=完整']);
  台.判('5 反向验：=完整 那一档现在放开了，但本地集成分支那根还没起 —— 停在那一句上、一个字节都不打 · 退出码 ' + 甲.码,
    甲.码 === 1 && /集成分支/.test(甲.文) && /重建集成分支/.test(甲.文) && !/\$ node /.test(甲.文),
    甲.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
  const 乙 = 砸(['--打自测包', '--看']);
  台.判('6 反向验：与 --看 / --照清单发 混在一次里就该挡 · 退出码 ' + 乙.码,
    乙.码 === 1 && /单独那一道/.test(乙.文), 乙.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
  const 丙 = 砸(['--打自测包=瞎写']);
  台.判('7 反向验：档位写错也挡（只认 简装 / 完整 两档，不拿它当简装蒙着跑）· 退出码 ' + 丙.码,
    丙.码 === 1 && /只认两档/.test(丙.文), 丙.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
  台.判('8 屏上那颗钮在，且走的是这一道（不是「② 打包发版」那一条合并之后才放行的路）',
    rd('src/_build/push-ui.html').includes('id="自测"') && rd('src/_build/push-ui.html').includes("跑('自测'") &&
    rd('src/_build/push-ui.mjs').includes("'--打自测包'"));
  /* 简装这一枚不带哪几家 —— 名字归他点，家表只当尺（2026-10-13 他那一句「简单版没有任何拆解出去的功能」） */
  const 丁 = 砸(['--打自测包', '--不带=zzz']);
  台.判('9 反向验：--不带 里点了家表没有的名字就当场停，并把六家 id·中文名全报出来 · 退出码 ' + 丁.码,
    丁.码 === 1 && /对不上家表/.test(丁.文) && /why-not-write·为写/.test(丁.文) &&
    !/\$ node /.test(丁.文), 丁.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
  const 戊 = 砸(['--看', '--不带=notes']);
  台.判('10 反向验：--不带 没配 --打自测包 就停（这一格只管自测那一档，别在发版那一趟里偷偷少带一家）· 退出码 ' + 戊.码,
    戊.码 === 1 && /只在 --打自测包 那一档有用/.test(戊.文), 戊.文.split(/\r?\n/).find(l => l.includes('停下来')) || '');
  台.判('11 那一格空着不挡：照打，但话里说明白「这一枚带的就是这一棵上的全部，不是简装」',
    自.includes("val('--不带', '')") && 自.includes('没点 —— 这一枚带的就是这一棵上的全部') &&
    !/停\('--不带.*空着/.test(自));
  台.判('12 不带的落到发布那一趟的 --skip=（publish 里那一颗已经把两格与货架一起挑掉，这里不另写一份挑货的）',
    /'--skip=' \+ 不带\.join\(','/.test(自) && 自.includes("趟 === 'src/pack/publish.mjs'") &&
    自.includes('家表.some(j => j.id === id)') && !自.includes("'--skip=notes'"));
  台.判('13 屏上那两栏勾完直接递给这一道（插件那六家一家一格、功能那八项一项一格，屏上不露内部名字、不要他手打）',
    rd('src/_build/push-ui.html').includes('id="七家"') && rd('src/_build/push-ui.html').includes('function 不带的家') &&
    rd('src/_build/push-ui.html').includes('带: 带的.join') && !rd('src/_build/push-ui.html').includes('简装不带') &&
    rd('src/_build/push-ui.mjs').includes('身.不带') && rd('src/_build/push-ui.mjs').includes('身.带'));
}

台.题('六、--看 在脏树上照量（2026-10-13 他为「屏上还不统一」问的那两处根因）');
{
  const 起 = rel.indexOf("/* ---------- ① 这一棵必须已经提交完");
  const 段 = 起 < 0 ? '' : rel.slice(起, rel.indexOf('/* ---------- ①加', 起));
  台.判('1 那三道（盘上没提交 / 站的地方 / 拼装那一棵会丢的笔）只管 发；看 照跑并把这三样原样报出来',
    段.includes('if(看){') && 段.includes('--看 照量：盘上') && 段.includes('const 会丢 = 看 ? [] : 没回main的改动()') &&
    /}else\{[\s\S]*主仓还有 /.test(段), 段.length + ' 字');
  台.判('2 「看 只往 data\\推送清单.txt 落这一轮的现场、仓里一个字节不动」这句口径还在（放宽它的前提就是这一句）',
    rel.includes('仓里什么都没写、没提交、没拼装、没打包、没推；只把这一轮的现场落到'));
  台.判('3 反向验：从前那一行没兜住（号写回清单里那句 git show 直接抛），现在读不到就当读不到、报一句跳过',
    /try\{ 老文 = r\.支 \? git\(TREE, \['show'/.test(rel) && /catch\(e\)\{ 老文 = ''/.test(rel) &&
    rel.includes('读不到它那份清单，这一家这一趟不刷号'));
  台.判('4 为写那一格的话与其余六家同一个来源（副题只从家表那一支拼，家表里也没有哪家还挂着另一棵仓）',
    rel.includes("副题: '这一家的代码在 ' + r.支 + ' 那一支'") && !/自己那一棵（Flow-Desk-plugin/.test(rel) &&
    !/仓:\s*'Flow-Desk-plugin/.test(rd('src/_build/plugin-repos.mjs')));
  const 真 = (() => { try { const out = execFileSync(process.execPath, ['src/_build/release.mjs', '--看'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); return { 码: 0, 文: out }; }
    catch (e) { return { 码: e.status, 文: String((e && (e.stdout || e.stderr)) || (e && e.message) || e) }; } })();
  台.判('5 真跑一趟 --看（盘上此刻就是脏的）：跑到底、不崩，并把那一句提醒打出来 · 退出码 ' + 真.码,
    真.码 === 0 && /--看 照量：盘上 \d+ 处没提交/.test(真.文) && !/invalid object name/.test(真.文),
    真.文.split(/\r?\n/).find(l => l.includes('照量')) || '');
  const 清 = fs.readFileSync(ROOT + 'data/推送清单.txt', 'utf8');
  台.判('6 量完的清单上六家一个形状（为写那格的副题也是「这一家的代码在 plugin/why-not-write 那一支」）',
    (清.match(/^【.*】这一家的代码在 plugin\/[\w-]+ 那一支$/gm) || []).length === 6 &&
    !/自己那一棵/.test(清), (清.match(/^【/gm) || []).length + ' 笔');
}

台.收尾();
