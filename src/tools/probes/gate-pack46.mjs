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
     三、安装壳覆盖升级把这一包里带来的那几件自带插件代码换新（不留旧版本备份：摊完清 src\ 里多出来的），
        icons\ 与 material\ 那两格照旧护住他自己换过的那一张 —— 2026-10-16 改的这一口：
        从前 data\plugins\ 整层护住，于是程序换新了、自带的几家代码留在上一版，
        界面上就是那几张形状不对、又没有卸载按钮的旧版卡；
        用户自己写的东西本来就不在这一包里（词库明文在 data\<库名>\、正文在 data\<书名>\、
        桌面与设置在 data\userdata-fd\、他自己装的包与向导现做的组件是这一格里的另一批名字），
        这一颗循环只看包里带着的路径，碰不到那些。
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
import { ROOT, lsd, rd, 尺在, 记账 } from './lib-slice.mjs';
import { 家 } from '../../_build/plugin-repos.mjs';

const 台 = 记账('gate-pack46');
const pub = rd('src/pack/publish.mjs');
const sfx = rd('src/pack/sfx.cs');
const 闸 = rd('src/tools/audit.mjs');

台.题('一、一家一颗自有格式的容器（不是 zip、也不是"压完改个后缀"）；主程序那一棵树里不铺任何一家的代码');
台.判('包内件这一颗在（把一家拆成名字→字节，插件清单那一格换成发布传进来的号）',
  pub.includes('function 包内件(p, 用了号){') && pub.includes('version: 用了号'));
/* 2026-10-16 改口（规划第五节：主程序那一仓打出来的是空壳，第一版讨论就定的那一条）。
   这两条从前钉的是「packZip 只剩一行」与「活的那一格铺进树」—— zip 那一档撤了，出货只走自有格式；
   树里那一格也不再铺，一家一颗容器与那颗 setup 摆在同一格里（那一格的名字是主程序的版本号）。 */
台.判('压的那一颗用的是打包手那颗（src/_build/packbox.mjs 的 打包），zip 那一颗整颗撤了',
  /import \{ 打包 as 打容器, 扩展名 as 容器后缀 \} from/.test(pub) && /const 容 = 打容器\(/.test(pub)
  && !/function packZip/.test(pub));
台.判('后缀不吃第二份：容器那颗叫什么问打包手要（全仓唯一那一枚住在壳里 pack_box.rs）',
  /m\.id \+ '\.' \+ 容器后缀\(\)/.test(pub) && !/\.fdpkg'/.test(pub));
台.判('信息段那六个必填键与 kernels 都递到了（壳装之前整个查一遍，kernels 点了一份而包里没这份就当场停）',
  /id: m\.id, name: m\.name, version: 出, min_shell:/.test(pub) && /kernels: Array\.isArray\(m\.kernels\)/.test(pub));
台.判('树里**不铺**任何一家的代码（made 那一本里不再有 data/plugins 那一路，"铺进首装那棵树"那一句也撤了）',
  !/made\.set\('data\/plugins\//.test(pub)
  && !/铺进首装那棵树/.test(pub.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')));
台.判('第二格不再铺（去掉注释之后，"plugins-factory" 那一名在发布这一本里一处不剩）',
  !pub.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').includes('plugins-factory'));

台.题('二、data 那道闸：空壳这一枚一个字节都不进（连插件那一格也不放行）');
台.判('放行那一串现在是空的（从前放行 data/plugins/ 那一条收回来了）',
  !/const 放行 = k => k\.startsWith\('data\/plugins\/'\)/.test(pub)
  && /const dirty = 全部\.filter\(k => k === 'data' \|\| k\.startsWith\('data\/'\)\);/.test(pub));
台.判('报错话说的是这件事：主程序那一枚是空壳，一个字节都不许带', pub.includes('主程序那一枚是空壳，一个字节都不许带'));
台.判('正向钉：货架上少一家容器就报名字并停工（用户就少一家能装）',
  pub.includes('货架上少了那几家：') && pub.includes('process.exit(1)'));
台.判('反证 · 把那条放行加回去（老规矩"插件那一格跟着本体出门"），上面第一条立刻红 —— 钉的确实是这一句收回了',
  (() => { const 老 = pub.replace("const dirty = 全部.filter(k => k === 'data' || k.startsWith('data/'));",
    "const dirty = 全部.filter(k => (k === 'data' || k.startsWith('data/')) && !k.startsWith('data/plugins/'));");
    return 老 !== pub && /!k\.startsWith\('data\/plugins\/'\)/.test(老); })());

台.题('三、安装壳：护住 icons 与 material 那两格；data\\ 那一层空壳本来就不带，覆盖升级也不写它');
台.判('KeepUserFile 这一颗在', sfx.includes('static bool KeepUserFile(string dest, Entry it)'));
/* 那颗判定只掐那一份函数体：注释里出现过的旧前缀不算数（这一节的反证要改的就是那一句代码） */
const 那颗 = (sfx.match(/static bool KeepUserFile\(string dest, Entry it\)[\s\S]*?\n    \}/) || [''])[0];
台.数('这一颗抓到了（抓空了整节就是假绿）', 那颗.length);
台.判('data/plugins/ 那条护住的前缀不在这一颗里（空壳那一枚根本不带插件代码，谈不上"盖掉用户那一份"；他 2026-10-16 指着覆盖升级后那几张旧版卡改的：程序换新、代码却留在上一版）',
  !/StartsWith\("data\/plugins\/"\)/.test(那颗));
台.判('icons/ 与 material/ 那两条照旧护住：他自己换过的那一张、加进去的那一张，覆盖升级都不许盖',
  /StartsWith\("icons\/"\)/.test(那颗) && /StartsWith\("material\/"\)/.test(那颗));
台.判('装完替用户把插件那一格开出来（空壳装出来那一格是空的，他要放进去才有东西）',
  /CreateDirectory\(Path\.Combine\(Path\.Combine\(dest, "data"\), "plugins"\)\)/.test(sfx));
const 让 = (sfx.match(/KeepUserFile\(dest, it\)/g) || []).length;
台.数('让路那一手出现在几处', 让);
台.判('正好两处：占用检查与摊出去那一步（旧的不再往备份挪，所以那一处跟着没了 —— 多一处就是有人把备份那一手偷偷加回来）', 让 === 2);
/* 换新这一手伤不到用户写的东西，是因为那一趟循环只看这一包里带着的路径；
   这一包里带哪几份由发布脚本定，它只铺货架上那几家自己那一格（上面第二节钉着）。
   这里量的是实物：仓里 data\plugins 顶层一份文件都没有 —— 名单（off.json）与自建词库名单（banks.json）
   都只有装出去那一棵里才有，所以它们不可能出现在这一包里，也就不会被这趟换新动到。 */
{
  const 顶层格 = 尺在('data/plugins')
    ? fs.readdirSync(ROOT + 'data/plugins', { withFileTypes:true }).filter(d => !d.isDirectory()).map(d => d.name) : ['这一格不在'];
  台.数('仓里 data\\plugins 顶层散着几份文件', 顶层格.length);
  台.判('那两份名单（plugins\\off.json 与 plugins\\banks.json）都不在这一包里，覆盖升级换新碰不到它们',
    顶层格.length === 0 || !顶层格.some(n => n === 'off.json' || n === 'banks.json'), 顶层格.join('、') || '一份没有');
}
台.判('反证：把那一条前缀加回去（老规矩"已有就不动"），这一节头一条立刻红 —— 测的确实是那一句',
  (() => {
    const 老 = 那颗.replace(/if\(!it\.Name\.StartsWith\("icons\/"\)/,
      'if(!it.Name.StartsWith("data/plugins/") && !it.Name.StartsWith("icons/")');
    return /StartsWith\("data\/plugins\/"\)/.test(老) && !/StartsWith\("data\/plugins\/"\)/.test(那颗);
  })());

台.题('四、旧口径那几句话消失');
for(const f of ['src/pack/publish.mjs', 'src/pack/comp-files.cjs',
                'src/pack/sfx.cs', 'src/tools/audit.mjs', 'src/_fd/fd-serve.mjs',
                'src/_build/release.mjs']){
  台.判(f + ' 里不再说「一个插件都不带 / 一棵都不进 / 不许带插件代码」',
    !/一个插件都不|一棵都不进这一棵树|发布物里不许带插件代码/.test(rd(f)));
}
台.判('安装说明改口成「主程序这一枚是空壳 + 一家一颗容器」（从前那一句是"这一份发布物带着插件"）',
  !pub.includes('这一份发布物带着插件（') && pub.includes('主程序这一枚是空壳'));
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
const 有那一页 = !!发布 && 尺在('pages')
  && lsd('pages').some(f => f.endsWith('+build.' + 发布 + '.html'));
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
