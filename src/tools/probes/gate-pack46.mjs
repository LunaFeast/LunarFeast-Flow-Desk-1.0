/* ============================================================
   gate-pack46.mjs · 外46：本体和七家插件一起打包（取消发布物零插件）
   ------------------------------------------------------------
     node src/tools/probes/gate-pack46.mjs
   钉的是这么几件事：
     一、发布脚本把每一家铺进活的这一格（data\plugins\），用的就是零卖那包 zip 的同一批字节，号也是同一串；
        从前还铺第二格「原版」（data\plugins-factory\）—— 那颗「恢复出厂」随插件分离第 2 批 2.5 撤了、
        那一格跟着 2.6 整格撤，这一条改成钉「第二格一名不剩」；
     二、data\ 那道硬闸从「一个字节都不许进」改成「只许插件那一格」，再加一条正向钉：
        货架上有几家，树里就得有几家，缺一家当场停工报名字；
     三、安装壳覆盖升级遇到 data\plugins\ 里已经有同一个名字的文件就不搬不写
        —— 那一格是用户自己改过、推演定制存过东西的地方，换回出厂那一份就是弄丢他写的东西；
     四、旧口径那几句话（一个插件都不带 / 一棵都不进 / 不许带插件代码）在所有说明和报错里消失；
     五、真跑一趟 publish --dry：树里报出的家数与货架上的包数对得上，且一个字节没写；
     六、每一家那一格不许挂占位死号，且每一家那个号都有一枚 tag 钉在号里那笔提交上（七家都在这一个仓里）。
        外46 四又换了一把尺：原来这条拿「两格逐字节相同」当规矩，可开发树上活的那一格本来就是给他改的，
        拿相等当规矩只会逼人去覆盖另一格，尺放错了地方 —— 那一格撤了之后这条只剩一个落点，尺照旧。
        这一节是 2026-10-10 量出来两笔旧账之后补的：开发树那一格还挂着占位死号 1.0.0；
        四棵插件仓一枚 tag 都没打过 —— 那是 --dry 漏判那一趟把清单写了、tag 却没打，
        后来真跑那趟见「号已是真的、代码又没动」就一字不碰，缺口一直留着。
        tag 是发第一版那一趟才有的东西：这一棵还没发过的时候这一节明说量不出来，不发空判。
   ============================================================ */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT } from './lib-slice.mjs';
import { 家 } from '../../_build/plugin-repos.mjs';

const 台 = 记账('gate-pack46');
const pub = rd('src/pack/publish.mjs');
const sfx = rd('src/pack/sfx.cs');
const 闸 = rd('src/tools/audit.mjs');

台.题('一、每一家铺活的这一格，用的是零卖那包同一批字节');
台.判('包内件这一颗在（把一家拆成名字→字节）', pub.includes('function 包内件(p, 用了号){'));
台.判('压零卖的包走的就是这一批字节（packZip 只剩一行）',
  pub.includes('function packZip(p, 用了号){ return writeZip(包内件(p, 用了号)); }'));
台.判('活的那一格铺进树', pub.includes("made.set('data/plugins/' + m.id"));
/* 从前这里还钉着「原版那一格（data\plugins-factory\）铺进树」—— 那颗「恢复出厂」随插件分离第 2 批 2.5 撤了，
   那一格跟着 2.6 整格撤，发布这一趟只剩一个落点（认代码不认注释：顶上那几句交代历史的照旧留著）。 */
台.判('第二格不再铺（去掉注释之后，"plugins-factory" 那一名在发布这一本里一处不剩）',
  !pub.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').includes('plugins-factory'));
台.判('铺件那一个循环只剩一格（不再读第二遍磁盘）', pub.includes('for(const e of 件){'));
台.判('插件清单那一格换成传进来的号（三处一个串：关于、零卖的包、树里活的）', pub.includes('version: 用了号'));

台.题('二、data 那道闸：只放那一格，还正向钉齐不齐');
台.判('放行只看那一个前缀',
  pub.includes("const 放行 = k => k.startsWith('data/plugins/');"));
台.判('旧那句「一个字节都不许进」没了', !pub.includes('份路径里没有一个落在'));
台.判('报错话改成「插件那一格之外一律不进」', pub.includes('插件那一格之外一律不进'));
台.判('正向钉：哪一家缺格就报名字并停工',
  pub.includes('插件没铺进首装那棵树：') && pub.includes('process.exit(1)'));

台.题('三、安装壳让开用户改过的那一份');
台.判('KeepUserFile 这一颗在', sfx.includes('static bool KeepUserFile(string dest, Entry it)'));
台.判('认的就是活的这一格那一条前缀', sfx.includes('StartsWith("data/plugins/")'));
const 让 = (sfx.match(/KeepUserFile\(dest, it\)/g) || []).length;
台.数('让路那一手出现在几处', 让);
台.判('正好三处：占用检查、旧的搬备份、新的摊出去（少一处就是要么白搬走要么强覆盖）', 让 === 3);

台.题('四、旧口径那几句话消失');
for(const f of ['src/pack/publish.mjs', 'src/pack/comp-files.cjs',
                'src/pack/sfx.cs', 'src/tools/audit.mjs', 'src/_fd/fd-serve.mjs',
                'src/_build/release.mjs']){
  台.判(f + ' 里不再说「一个插件都不带 / 一棵都不进 / 不许带插件代码」',
    !/一个插件都不|一棵都不进这一棵树|发布物里不许带插件代码/.test(rd(f)));
}
台.判('安装说明改口成「带着插件」', pub.includes('这一份发布物带着插件（'));
台.判('自查那条「程序代码这一层不收插件」还钉着（盯的地方从出厂镜像那一格换成 src\\ 那一层）',
  闸.includes('底下有插件的形状') && 闸.includes('程序代码这一层不收') && !/MIRROR/.test(闸));

台.题('五、真跑一趟 publish --dry');
/* 号跟着「最近那一笔发布提交」取，跟发布脚本同一把尺。单独跑 publish 拿的是 HEAD 那一笔，
   而我这一轮又往里补了几笔别的提交 —— HEAD 那一支号的页本来就不该存在，
   这正是外44 定下的行为：不挑号最大的那一张，只认当前号那一张，不在就停工。
   这一棵还没发过第一版的时候（没有 发布 那笔提交、pages\ 里没有那一号的页）这一节量不出来 ——
   明说一句，不算过也不算败：发第一版那一趟跑完它自己就跟上。 */
let 发布 = '', 报 = '';
try{
  发布 = execFileSync('git', ['log', '-1', '--format=%h', '--grep=^发布 '],
    { cwd: ROOT, encoding: 'utf8' }).trim();
}catch(e){ 发布 = ''; }
const 有那一页 = !!发布 && fs.existsSync(ROOT + 'pages')
  && fs.readdirSync(ROOT + 'pages').some(f => f.endsWith('+build.' + 发布 + '.html'));
if(!发布 || !有那一页)
  台.数('五 这一节量不出来：' + (!发布 ? '还没有 发布 那一笔提交' : 'pages\\ 里没有 ' + 发布 + ' 那一号的页')
    + ' —— 这一棵没发过第一版，发完自动跟上');
else try{
  报 = execFileSync(process.execPath, ['src/pack/publish.mjs', '--dry'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FD_BUILD: 发布 } });
}catch(e){ 报 = String((e && e.stdout) || '') + String((e && e.stderr) || (e && e.message) || e); }
const m = 报.match(/([0-9]+) 家齐/);
const 货架 = (报.match(/货架 ([0-9]+) 个包/) || [])[1];
if(发布 && 有那一页){
  台.判('照最近那一笔发布提交取号（' + 发布 + '）', 发布.length >= 7);
  台.判('--dry 报出几家齐（只有活的这一格 · 实际：' + (m ? m[1] + ' 家' : '没报') + '）', !!m);
  台.判('树里那几家与货架那几个包同一个数（' + 货架 + '）', !!m && !!货架 && m[1] === 货架);
  台.判('--dry 一个字节没写：那一趟自己说了（没落盘）', 报.includes('（没落盘）'));
}

台.题('六、每一家那一格不许挂占位死号，每一家的号都有一枚 tag 钉得准（七家都在这一个仓里，2026-10-13 为写也并进来了）');
/* tag 是发布那一趟打的，没发过第一版就没有：那种时候明说量不出来，不发空判。
   从前这里看的是「data\plugins-factory 那一格在不在」—— 那一格随插件分离第 2 批 2.6 整格撤了，
   改成直接问 git 有没有一枚 tag（量的还是同一件事：这一棵发过没有）。 */
let 有tag = false;
try{ 有tag = execFileSync('git', ['tag', '-l'], { cwd: ROOT, encoding: 'utf8' }).trim().length > 0; }catch(e){ 有tag = false; }
if(!有tag) 台.数('六 这一节量不出来：这一棵还没发过第一版（一枚 tag 都没有，号与 tag 都是发布那一趟写的）');
for(const j of (有tag ? 家 : [])){
  const id = j.id;
  const 活 = ROOT + 'data/plugins/' + id;
  let 号 = '';
  try{ 号 = String(JSON.parse(fs.readFileSync(活 + '/manifest.json', 'utf8')).version || ''); }catch(e){ 号 = '（读不到）'; }
  台.判(id + ' 那一格不许挂占位死号（现在写的是 ' + 号 + '）', /\+build\./.test(号));
  const 尾 = 号.split('+build.')[1] || '';
  let 钉 = '';
  try{
    钉 = execFileSync('git', ['rev-parse', '--short', 'v' + 号 + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim();
  }catch(e){ 钉 = ''; }
  台.判(id + ' 这一棵 有 tag v' + 号 + ' 且钉在 ' + (尾 || '（号里没有短哈希）') + '（tag 指向：' + (钉 || '没有这枚 tag') + '）', !!尾 && 钉 === 尾);
}

台.收尾();
