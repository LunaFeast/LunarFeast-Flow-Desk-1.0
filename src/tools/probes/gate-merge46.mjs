
/* ============================================================
   gate-merge46.mjs · 这一个仓：七家插件与那几棵内核源码都在这一棵里（2026-10-14 新仓没有第二棵）
   ------------------------------------------------------------
     node src/tools/probes/gate-merge46.mjs
   钉的是这么几件事：
     一、七家的代码真的在这一棵里被跟踪（不只是盘上躺着）—— 为写 2026-10-13 起也算这一家；
     二、为写那一家：插件那一格那三件与 src 底下那一批内核源码都在版本名单里，内核那颗产物不认；
     三、忽略规则实测：该认的认、该排的排，插件那一格不许有第三种东西露在外面；
     四、名单只有一份：七家全在 plugin-repos 那张表里，发布脚本 import 它，别处不再抄一份；
     五、号一种形状：七家全拿这一棵里动过自己那些份的那一笔（独立仓那一条路跟着为写一起退了）；
     六、这一棵里不留第二份：产物不认进版本，搬去各自那条分支的两份不在基础版这一棵里。
   ============================================================ */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { ROOT, lsd, rd, 尺在, 记账 } from './lib-slice.mjs';
import { 家, REPOS } from '../../_build/plugin-repos.mjs';
import { 仓名 } from '../../_build/pack-repo.mjs';   /* 哪一家叫什么仓，只此一张表 */

const 台 = 记账('gate-merge46');
const 问 = a => { try{ return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); }catch(e){ return ''; } };
const 成 = a => { try{ execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }); return true; }catch(e){ return false; } };
const 行 = s => String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const rel = rd('src/_build/release.mjs');
const rep = rd('src/_build/plugin-repos.mjs');
const 闸 = rd('src/tools/probes/gate-pack46.mjs');
const 跟踪 = 问(['ls-files']).split(/\r?\n/).filter(Boolean);
const 各家 = 家.map(j => j.id);
const 旁 = ROOT.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]*$/, '');
const 那一仓 = 仓 => { try{ return execFileSync('git', ['-C', 旁 + '/' + 仓, 'ls-files'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean); }catch(e){ return []; } };

台.题('一、七家的代码不在主仓的名单里，在各自那一仓的名单里（2026-10-16 第四刀：一家一仓，主程序那一仓改作空壳）');
台.数('表里那几家', 各家.join('、'));
for(const j of 家){
  const 格 = 'data/plugins/' + j.id + '/';
  const 壳里 = 跟踪.filter(f => f.startsWith(格)), 那边 = 那一仓(仓名[j.id]);
  台.判(j.id + '：主仓名单里 0 份，' + 仓名[j.id] + ' 那一仓里 main.js 与插件清单都在（那边 ' + 那边.filter(f => f.startsWith(格)).length + ' 份）',
    壳里.length === 0 && 那边.includes(格 + 'main.js') && 那边.includes(格 + 'manifest.json'),
    '主仓 ' + 壳里.length + ' 份 · 那边 ' + 那边.filter(f => f.startsWith(格)).length + ' 份');
}
台.判('声笔那几份、定制那一棵、MusicBee 那三份都不在主仓名单里（各自在自家那一仓）',
  !跟踪.some(f => /^src\/_build\/p[1-6]\.js$/.test(f)) && !跟踪.some(f => f.startsWith('src/_build/rp-'))
  && !跟踪.some(f => f.startsWith('src/_wcustom/')) && !跟踪.some(f => f.startsWith('src/pack/plugin/')));

台.题('二、为写那一整棵：主仓里一份不剩，Why-Not-Write 那一仓里一份不缺（23 = 原来 22 份 + 第 4 批 4.7 歌词时间尺那一份）');
{
  const 写 = 那一仓('Why-Not-Write');
  台.判('那一仓里 src\\_wnw\\src 那 23 份源码与出内核那颗脚本都在，主仓名单里 src\\_wnw 一个字节都没有',
    写.filter(f => f.startsWith('src/_wnw/src/w') && f.endsWith('.js')).length === 23 && 写.includes('src/_wnw/build-kernel.mjs')
    && !跟踪.some(f => f.startsWith('src/_wnw/')),
    '那边 ' + 写.filter(f => f.startsWith('src/_wnw/')).length + ' 份 / 主仓 ' + 跟踪.filter(f => f.startsWith('src/_wnw/')).length + ' 份');
}

台.题('三、忽略规则实测（2026-10-16 第四刀之后改的口：主程序这一仓里既没有插件源码、也没有插件产物）');
/* 从前这一节问的是"主仓里那几格该认、那三颗产物该排" —— 那是七家还住在一棵里的事。
   现在壳里 data\plugins 这一整格整个不进仓（装进来的包不是这一仓的内容），插件那几棵源码也不在这仓里，
   所以两条都要反过来量：壳自己那几份该认；装进来的那一路与该排的运行时数据一份都不许漏进版本。 */
for(const q of ['src/_fd/src/fd3-shell.js', 'src/_build/邻居.mjs', 'src/pack/publish.mjs', 'src/_tauri/ui/fd-bridge.js'])
  台.判('壳自己那一份该认（没被排掉）：' + q, !成(['check-ignore', '-q', '--', q]));
for(const q of ['data/plugins/notes/main.js', 'data/plugins/why-not-write/wnw-kernel.js', 'data/plugins/off.json',
                 'data/userdata-fd/notes.json', 'src/tools/probes/对照.html'])
  台.判('该排掉（装出来的东西与运行时那一路，一个字节都不进版本）：' + q, 成(['check-ignore', '-q', '--', q]));
台.判('主程序仓的名单里一家插件都没有（壳就是壳）',
  跟踪.filter(f => f.startsWith('data/plugins/') || f.startsWith('src/_wnw/') || f.startsWith('src/_wcustom/') || f.startsWith('src/pack/plugin/')).length === 0,
  跟踪.filter(f => /^(data\/plugins|src\/_wnw|src\/_wcustom|src\/pack\/plugin)/.test(f)).slice(0, 4).join('、') || '一份都没有');
/* 露在外面的只数「没登记过的那一种」（?? 开头那些 = 既不在仓里、也没被 .gitignore 排掉）。
   改过的在册文件（M 那一档）不算「第三种东西」—— 这一条钉的是忽略规则，不是「插件那一格不许有改动」。 */
const 露 = 行(问(['status', '--porcelain', '--untracked-files=all', '--', 'data/plugins'])).filter(l => l.startsWith('??'));
台.判('插件那一格没有第三种东西露在外面（现在 ' + 露.length + ' 处）', 露.length === 0, 露.join(' | '));

台.题('四、名单只有一份');
台.判('表里七家全登着', 家.length === 7);
台.判('带仓的一家都没有了（为写 2026-10-13 不再搞独立仓）', REPOS.length === 0, REPOS.map(j => j.id).join('、'));
/* 插件分离第 5 批（2026-10-16 第四刀）：主程序仓里 data\plugins 这一格是空的 —— 一家一仓，
   七家各自住在旁边那一层自己那一棵里。所以这一节改成两条：壳里一个插件字节都不留（正向钉空），
   表上那七家逐家问那把尺（问得到 = 那一仓里真站着）。 */
const 壳里 = lsd('data/plugins').filter(n => !n.endsWith('.json')).sort();
台.判('主程序仓里那一格是空的（壳就是壳：七家一家都不在这儿）', 壳里.length === 0, 壳里.join('、') || '空');
台.判('表上那七家一家都在自己那一仓里站着（拿那张表逐家问那把尺，插件清单读得到才算）',
  家.every(j => 尺在('data/plugins/' + j.id + '/manifest.json')),
  家.map(j => j.id + (尺在('data/plugins/' + j.id + '/manifest.json') ? '在' : '不在')).join('、'));
台.判('发布脚本 import 的是那一张表（不抄第二份）', /import \{ 家 as 家表/.test(rel) && !rel.includes("'Flow-Desk-plugin-"));
台.判('plugin-repos 那一颗也不再往隔壁那一棵铺东西（铺树那一条尾巴退了，没有仓名可写）',
  !rep.includes("'Flow-Desk-plugin-") && rep.includes('这一颗不再往隔壁那一棵铺东西了'));
台.判('gate-pack46 第六节不再自带一份仓名表', !闸.includes("'notes': 'Flow-Desk-plugin-Notes'"));

台.题('五、号一种形状：七家全从各自那一支取');
台.判('从前那两种形状（逐字节比自己那一棵 / 拿两支对树）里，独立仓那一种已经整条退了',
  !/function 会动吗\(/.test(rel) && !/if\(job\.仓\)\{/.test(rel) && !/job\.仓/.test(rel));
台.判('七家拿各自那一支上最后动过代码的那一笔（那一颗是 plugin-repos 的底层接口，不在这里抄第二份）',
  /import \{[^}]*那一支最后一笔/.test(rel) && /那一支最后一笔\(job\)/.test(rel));
台.判('问那一笔时两种「只写号」的写法都跳过', rep.includes("'--grep=^记号 ', '--grep=发布记号'"));
台.判('七家的号写回都走各自那一支上另起的一笔（不在盘上切树）',
  rel.includes('往那一支写(r.支,') && rel.includes("'记号 ' + r.中文"));
/* 2026-10-16 第四刀之后：一家一仓，号不再从主仓里那条支上取 ——
   每一家的号取自它自己那一仓最后动过代码的那一笔（那一仓顶上那颗 出包.mjs 就是这么写的）。
   所以这一节问的是那一棵：那一笔问不问得出、那一笔里这一家那一格在不在。 */
for(const j of 家){
  const 仓 = 仓名[j.id];
  let 笔 = '';
  try{ 笔 = execFileSync('git', ['-C', 旁 + '/' + 仓, 'log', '-1', '--format=%h'], { encoding: 'utf8' }).trim(); }catch(e){ 笔 = ''; }
  const 格数 = 那一仓(仓).filter(f => f.startsWith('data/plugins/' + j.id + '/')).length;
  台.判(仓 + '：号取自它自己那一仓那一笔（' + (笔 || '问不出') + '），那一笔里这一家那一格 ' + 格数 + ' 份都在',
    /^[0-9a-f]{7,}$/.test(笔) && 格数 >= 3, '那一笔 ' + (笔 || '问不出') + ' · 那边 ' + 格数 + ' 份');
}

台.题('六、这一棵里不留第二份（2026-10-16 第四刀之后：源码与产物各归各家那一仓，壳里两份都没有）');
/* "留源码又留产物就是两份同一个东西"这条规矩没作废，只是搬了家 —— 现在由那一仓自己的 .gitignore 守：
   源码进版本、那颗内核产物挡在门外（由那一仓的 出包.mjs 第一步现出）。这一节就到各家那一棵里问一遍。 */
/* 隔壁那一棵在哪：从 ROOT（这一颗自己的位置算出来的仓根）往上退一层，再按仓名找 —— 不写死这台机器的盘符 */
const 问那一棵 = (仓, 相) => { try{ execFileSync('git', ['-C', 旁 + '/' + 仓, 'check-ignore', '-q', '--', 相], {stdio:'pipe'}); return true; }catch(e){ return e && e.status === 1 ? false : null; } };
const 产物家 = [['Why-Not-Write', 'src/_wnw/wnw-kernel.js', 'src/_wnw/src/w1-core.js'],
             ['Why-Not-Write-plugins-Deduce-Custom', 'src/_wcustom/wnw-custom-kernel.js', 'src/_wcustom/src/sh-gen.js'],
             ['Singbit-Input-Practice', 'data/plugins/singbit-input-practice/rp-kernel.js', 'src/_build/rp-kernel.mjs']];
台.判('那三家各自那一仓里：内核产物被那一仓的 .gitignore 挡着，同一仓里那份源码照旧进版本',
  产物家.every(([仓, 品, 源]) => 问那一棵(仓, 品) === true && 问那一棵(仓, 源) === false),
  产物家.map(([仓, 品, 源]) => 仓 + ' 产物' + (问那一棵(仓, 品) === true ? '挡' : '没挡') + '/源码' + (问那一棵(仓, 源) === false ? '进' : '没进')).join(' · '));
台.判('主程序这一仓里那三颗产物一份都不剩（连源码一起都不在，第二份无从谈起）',
  跟踪.filter(f => /wnw-kernel|wnw-custom-kernel|rp-kernel/.test(f)).length === 0);

台.收尾();
