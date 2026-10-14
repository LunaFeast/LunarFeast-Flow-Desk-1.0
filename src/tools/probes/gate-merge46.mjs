
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
import { rd, 记账, ROOT } from './lib-slice.mjs';
import { 家, REPOS } from '../../_build/plugin-repos.mjs';

const 台 = 记账('gate-merge46');
const 问 = a => { try{ return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); }catch(e){ return ''; } };
const 成 = a => { try{ execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }); return true; }catch(e){ return false; } };
const 行 = s => String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const rel = rd('src/_build/release.mjs');
const rep = rd('src/_build/plugin-repos.mjs');
const 闸 = rd('src/tools/probes/gate-pack46.mjs');
const 跟踪 = 问(['ls-files']).split(/\r?\n/).filter(Boolean);
const 各家 = 家.map(j => j.id);

台.题('一、七家的代码在主仓里被跟踪（2026-10-13 为写回到插件这一格，七家同一待遇）');
台.数('表里那几家', 各家.join('、'));
for(const id of 各家){
  const 格 = 'data/plugins/' + id + '/';
  const 份 = 跟踪.filter(f => f.startsWith(格));
  台.判(id + ' 那一格里 main.js 与插件清单都被跟踪（现在 ' + 份.length + ' 份）',
    份.includes(格 + 'main.js') && 份.includes(格 + 'manifest.json'));
}
for(const f of ['src/_build/p1.js', 'src/_build/p6.js', 'src/_build/rp-kernel.mjs', 'src/_build/rp-base.html',
                 'src/_wcustom/build-kernel.mjs', 'src/_wcustom/src/sh-code.js',
                 'src/pack/plugin/FlowDeskBridge.cs', 'src/pack/plugin/build-plugin.ps1'])
  台.判(f + ' 进仓了', 跟踪.includes(f));

台.题('二、为写这一家：插件那一格那三件 + src 底下那一批内核源码都在这一个仓里（2026-10-13 他一句「怎么会有主仓/私有两个」）');
台.判('插件那一格里为写那三件在跟踪名单里（启动卡、插件清单、封面）',
  跟踪.includes('data/plugins/why-not-write/main.js') && 跟踪.includes('data/plugins/why-not-write/manifest.json'));
台.判('src 底下那 22 份内核源码与出内核那颗脚本都在跟踪名单里（从前那一棵私有的，现在并进这一个仓）',
  跟踪.filter(f => f.startsWith('src/_wnw/src/w') && f.endsWith('.js')).length === 22 &&
  跟踪.includes('src/_wnw/build-kernel.mjs'),
  跟踪.filter(f => f.startsWith('src/_wnw/')).length + ' 份在名单里');

台.题('三、忽略规则实测');
for(const q of ['data/plugins/notes/main.js', 'data/plugins/why-not-write/main.js', 'src/_wcustom/src/sh-code.js',
                'src/pack/plugin/FlowDeskBridge.cs', 'src/_build/p1.js', 'src/_wnw/src/w1-core.js', 'src/_wnw/build-kernel.mjs'])
  台.判(q + ' 该认（没被排掉）', !成(['check-ignore', '-q', '--', q]));
for(const q of ['data/plugins/off.json', 'data/plugins-factory/notes/main.js',
                 'src/_wnw/wnw-kernel.js', 'src/_wcustom/wnw-custom-kernel.js', 'src/pack/plugin/dist/mb_FlowDesk.dll'])
  台.判(q + ' 该排掉', 成(['check-ignore', '-q', '--', q]));
/* 露在外面的只数「没登记过的那一种」（?? 开头那些 = 既不在仓里、也没被 .gitignore 排掉）。
   改过的在册文件（M 那一档）不算「第三种东西」—— 这一条钉的是忽略规则，不是「插件那一格不许有改动」。 */
const 露 = 行(问(['status', '--porcelain', '--untracked-files=all', '--', 'data/plugins'])).filter(l => l.startsWith('??'));
台.判('插件那一格没有第三种东西露在外面（现在 ' + 露.length + ' 处）', 露.length === 0, 露.join(' | '));

台.题('四、名单只有一份');
台.判('表里七家全登着', 家.length === 7);
台.判('带仓的一家都没有了（为写 2026-10-13 不再搞独立仓）', REPOS.length === 0, REPOS.map(j => j.id).join('、'));
const 货架 = fs.readdirSync(ROOT + 'data/plugins', { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
台.判('表上那七家与插件那一格盘上的七家一一对齐', JSON.stringify(货架) === JSON.stringify(家.map(j => j.id).sort()));
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
/* 六家那一支早就在；为写是 2026-10-13 才并进来的，那一支还没起来 —— 这一条钉的是「量不出来要老实说量不出来」，
   不是拿 HEAD 凑一个数当量到了（从前那一版把没问出来的一律退回 HEAD，看着就像有历史）。 */
for(const j of 家){
  const 笔 = 问(['log', '-1', '--format=%h', '--invert-grep', '--grep=^记号 ', '--grep=发布记号', '--'].concat(j.from));
  if(!/^[0-9a-f]{7,}$/.test(笔)){
    台.判(j.id + ' 这一支还没起来 → 发布那一趟报的是「量不出来：那一支还没起来」，不拿 HEAD 凑数',
      j.id === 'why-not-write' && rel.includes('量不出来：这一家那一支还没起来'), 笔 || '（没问出）');
    continue;
  }
  const 在 = 问(['ls-tree', '--name-only', 笔, 'data/plugins/' + j.id + '/']);
  台.判(j.id + ' 问得出最后一笔（' + 笔 + '），那一笔里这一家的格还在', 行(在).length >= 3);
}

台.题('六、这一棵里不留第二份（内核产物不认进版本；搬去分支的那两份不在基础版里）');
台.判('为写这一家在这个仓里只有那颗内核产物不认（它是 w1..w22 拼出来的，留源码又留产物就是两份同一个东西）',
  成(['check-ignore', '-q', '--', 'src/_wnw/wnw-kernel.js']) && !成(['check-ignore', '-q', '--', 'src/_wnw/src/w1-core.js']) &&
  跟踪.some(f => f === 'src/_wnw/src/w21-heat.js') && 跟踪.some(f => f === 'src/_wnw/src/w22-web.js'));

台.收尾();
