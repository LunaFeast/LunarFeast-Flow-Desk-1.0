/* ============================================================
   gate-gens46.mjs · 插件分离第 4 批 4.3：推演走登记 + 缓存（#35）
   ------------------------------------------------------------
     node src/tools/probes/gate-gens46.mjs
   这一台管的是"两家不再互相伸手"：从前为写要列能调用哪些推演，看的是推演定制那一家的顶层名字
   （Gen.list() / Gen.get() / GenWizard.open() / genImportAsk()），连主程序自己那份推演记录面板也这么读。
   现在中间多一份登记处住在主程序（src/_shared/sh-gens.js 的 GenReg）：定制登、为写读、两颗手（开向导 / 重扫 / 导入）由登记者挂上来。
   量法：GenReg 那颗整份从原文切出来端进 node 真跑（登、撤、整批换、名单、内容、挂手、开向导、刷新全是真函数）；
   两头接线与"不再伸手摸别人名字"用静态钉。
   反证三件：别的来源撤不动别人登的那一格；整批换只换自己那一户、别家的留着；
   手没挂上时开向导回 false、刷新回缓存张数 —— 一句都不抛（空壳不提示缺失那条口径）。
   ============================================================ */
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-gens46');
const 登源 = rd('src/_shared/sh-gens.js');
const 定制棵 = rd('src/_wcustom/src/sh-gen.js');
const 向导棵 = rd('src/_wcustom/src/sh-wizard.js');
const 为写 = rd('src/_wnw/src/w3-shell.js');
const 记录 = rd('src/_shared/sh-log.js');
const 装载 = rd('src/_shared/sh-load.js');

/* ---------- 端真函数：GenReg 整颗 ---------- */
function 新登记处(){
  return new Function(切(登源, 'GenReg') + '\nreturn GenReg;')();
}

台.题('一、登记处住在主程序那一头，且进了页面装配名单');
台.判('src/_shared/sh-gens.js 里那颗 GenReg 就是这一份缓存（表、手两颗都在）',
  /const GenReg = \{/.test(登源) && /表:new Map\(\)/.test(登源) && /手:\{\}/.test(登源));
台.判('它跟着页面装配名单走（与 sh-mus、sh-log 同一待遇，不是哪家插件私有的）',
  rd('src/_fd/build.mjs').includes("'../_shared/sh-gens.js'"));
台.判('不靠新通道：桥的参表里没有 gens / GenReg 这一颗（这份缓存住在页里，不走壳）',
  !/gens|GenReg/.test(rd('src/_tauri/ui/fd-bridge.js')));
台.判('加载器把配方交给定制那一颗 Gen.def 的地方还是一处（登记这一条道只有一个入口）',
  (装载.match(/Gen\.def\(/g) || []).length === 1);

台.题('二、别家不再伸手摸这一家的名字（三棵树各扫一遍）');
{
  const 摸名字 = (文, 名) => new RegExp('(?<![\\w.])' + 名 + '\\s*[.(]', 'g');
  const 为写摸 = ['Gen.list', 'Gen.get', 'GenWizard.open', 'genImportAsk'].filter(名 => 摸名字(为写, 名).test(为写));
  台.判('为写那一棵里搜不到 Gen.list( / Gen.get( / GenWizard.open( / genImportAsk(（只向登记处要）',
    为写摸.length === 0, 为写摸.join('、'));
  const 记录摸 = ['Gen.list', 'Gen.get'].filter(名 => 摸名字(记录, 名).test(记录));
  台.判('主程序自己那份推演记录面板也不再看这一家的名字（两处都换成登记处）',
    记录摸.length === 0 && /GenReg\.名单\(\)/.test(记录) && /GenReg\.内容\(/.test(记录), 记录摸.join('、'));
  const 定制摸 = ['Gen.list', 'Gen.get', 'GenWizard.open', 'genImportAsk'].filter(名 => 摸名字(定制棵 + 向导棵, 名).test(定制棵 + 向导棵));
  台.判('这一家自己里头照旧用自己的注册表（登记是加法，不是把自己那份换成别人的）', 定制摸.length === 4, 定制摸.join('、'));
}

台.题('三、登记与缓存真跑一遍（切出来的那颗 GenReg）');
{
  const G = 新登记处();
  const 甲 = { id:'jia', name:'甲推演', icon:'pencil', desc:'一张' };
  const 乙 = { id:'yi', name:'乙推演' };
  台.判('登一张就有的一张：名单给摘要、内容给那一份配方',
    G.登(甲, 'wnw-custom') && G.有几张() === 1 && G.名单().length === 1
    && G.名单()[0].name === '甲推演' && G.名单()[0].来源 === 'wnw-custom' && G.内容('jia') === 甲);
  台.判('缺 id 的那一份登不进去（不许造出一格没有名字的条目）',
    G.登({ name:'没名字' }, 'x') === false && G.有几张() === 1);
  台.判('同一张再登一次是覆盖那一格，不攒第二份',
    G.登({ id:'jia', name:'甲改过' }, 'wnw-custom') && G.有几张() === 1 && G.内容('jia').name === '甲改过');
  G.登(乙, '另一家');
  台.判('撤只许撤自己那一家的：别的来源来撤，回没有、条目还在',
    G.撤('yi', 'wnw-custom') === false && G.内容('yi') === 乙 && G.撤('yi', '另一家') === true && !G.内容('yi'));
  const G2 = 新登记处();
  G2.登(甲, 'wnw-custom'); G2.登({ id:'别的', name:'别家那张' }, '另一家');
  const 张 = G2.整批换([{ id:'jia', name:'甲第三版' }], 'wnw-custom');
  台.判('整户重报只换自己那一户：别家那一格留着，报完回的是总共几张',
    张 === 2 && G2.内容('jia').name === '甲第三版' && !!G2.内容('别的'));
}
{
  const G = 新登记处();
  台.判('手没挂上时：有向导回 false、开向导回 false —— 一句都不抛（空壳不提示缺失那条口径）',
    G.有向导() === false && G.开向导('jia') === false && G.有导入() === false && G.有几张() === 0);
  const 空刷新 = await G.刷新();
  台.判('没人挂「重扫」时刷新也只是报现值几张（回 0，不是 null、不是抛）', 空刷新 === 0, String(空刷新));
  const 开过 = [];
  G.挂手({ wizard:id => 开过.push(id), rescan:async () => { G.整批换([{ id:'新', name:'重扫捞回来的' }], 'wnw-custom'); return 1; } }, 'wnw-custom');
  G.开向导('');
  台.判('挂上手之后：有向导真认得上、开向导真把那颗手叫到了（记下了要点开的那一张）',
    G.有向导() && 开过.length === 1 && 开过[0] === '', JSON.stringify(开过));
  const 张 = await G.刷新();
  台.判('手动刷新那颗钮吃的是登记者自己那颗「重扫」：重报之后名单里就是它报上来的那一张',
    张 === 1 && G.名单()[0].id === '新', 张 + ' / ' + JSON.stringify(G.名单()));
  台.判('两颗手挂两次不攒第二份（同一来源覆盖，别家来源各一格）',
    (() => { const 前 = Object.keys(G.手).length; G.挂手({ wizard:() => {} }, 'wnw-custom'); return Object.keys(G.手).length === 前; })());
}

{
  /* 反证：把"只许撤自己那一家的"那一道判断摘掉，同一笔撤就成功了 —— 上面那条测的确实是这一道 */
  const 摘闸 = 切(登源, 'GenReg').replace(/if\(来源 && 格\.来源 && 格\.来源 !== String\(来源\)\) return false;/, '');
  const G = new Function(摘闸 + '\nreturn GenReg;')();
  G.登({ id:'yi', name:'乙推演' }, '另一家');
  台.判('摘掉来源那道判断后，别的来源也能把这一格撤走（说明那一条来源保护真在管事）',
    摘闸 !== 切(登源, 'GenReg') && G.撤('yi', 'wnw-custom') === true && G.有几张() === 0);
}

台.题('四、两头的接线（静态钉：谁在哪一句上登记、撤、报）');
{
  const 登 = 切方法(定制棵, '  def(R){');
  const 挂手句 = /GenReg\.挂手\(\{ wizard:id => GenWizard\.open\(id\), rescan:genRescan, importer:重画 => genImportAsk\(重画\) \}, 'wnw-custom'\)/;
  台.判('定制那张注册表每加一张就顺手报登记处一份（wizard / rescan / importer 那三颗手不在这一处挂了）',
    /GenReg\.登\(R, 'wnw-custom'\)/.test(登) && !挂手句.test(登));
  /* 2026-10-16 那一改：三颗手改在这一棵一加载就挂。从前挂在 Gen.def 里面，于是这台机器上一张组件
     都还没做过的时候登记处没有手 —— 为写那一头的入口整块摆不出来，第一次做组件反倒没地方点；
     推演定制从首页撤下之后那条成了唯一的入口，这一处必须提前。 */
  台.判('三颗手在这一棵的顶层挂，不等第一张配方（wizard / rescan / importer 是协议名，不写成中文句子）',
    挂手句.test(定制棵));
  台.判('反证：把这一句整颗挪回 Gen.def 里头（老写法），"顶层挂"那一条立刻没处可认 —— 上面那两条测的确实是这一句写在哪儿',
    (() => {
      const 句 = (挂手句.exec(定制棵) || [''])[0];
      if(!句) return false;
      const 老 = 定制棵.replace(句, '/* 这一颗挪回 def 里 */')
        .replace(/GenReg\.登\(R, 'wnw-custom'\)/, "GenReg.登(R, 'wnw-custom');\n      " + 句);
      const 登老 = 切方法(老, '  def(R){'), 位 = 老.indexOf(句), def起 = 老.indexOf(登老), def止 = def起 + 登老.length;
      return def起 >= 0 && 位 >= def起 && 位 < def止 && 老.indexOf(句, def止) < 0;
    })());
  const 删 = 切方法(定制棵, '  async remove(id, opt){');
  台.判('完全删除那一手也撤登记处那一格（自己那一家的来源写死在句子上一块）',
    /GenReg\.撤\(id, 'wnw-custom'\)/.test(删));
  const 扫 = 切(向导棵, 'genRescan');
  台.判('那颗「重扫」先把 kv 镜像里那几张捞回注册表，再整户重报（不重复扫盘、不装第二套缓存）',
    /await GenLocal\.warm\(\)/.test(扫) && /GenReg\.整批换\(全, 'wnw-custom'\)/.test(扫));
  台.判('为写那一块只在登记处挂着向导那颗手时才摆，读的是名单那份摘要',
    /GenReg\.有向导\(\)/.test(为写) && /for\(const R of GenReg\.名单\(\)\)/.test(为写));
  台.判('手动刷新缓存那颗钮还在为写那一格里（#35 点名的那一条），按下去重报之后连那一格一起重画',
    /await GenReg\.刷新\(\)/.test(为写) && /画\(\);/.test(为写) && /重新读一遍推演名单/.test(为写));
  /* 2026-10-16：那一块从「设置 · 功能」那一屏底下搬进这一台工作台的停靠栏 —— 搬法是登记成为一个功能，
     「＋打开内容」的辅助功能那一组里有它一行、右栏挂得上、那一行尾跟着卸载那颗钮。
     名字与插件清单那一格同名，那一行才认得出"这是哪一家带的"；设置那一屏不再垫第二块（一块内容不摆两个入口）。 */
  台.判('那一格登记成为一个功能，名字与插件清单那一格同名（卸载那颗钮跟着摆得出来）',
    /registerTool\(\{\s*\n\s*id:'wnw-custom'/.test(为写));
  台.数('「用推演组件定制做一个插件」那一枚在为写这一份源码里出现几次', (为写.match(/用推演组件定制做一个插件/g) || []).length);
  台.判('只一次：那块从「设置 · 功能」那一屏撤干净了，不在两处摆同一个入口',
    (为写.match(/用推演组件定制做一个插件/g) || []).length === 1 && !/这块空白给生成器/.test(为写));
  台.判('「导入配方」那颗也走挂上来的手，不再直接叫 genImportAsk',
    /GenReg\.有导入\(\)/.test(为写) && /GenReg\.开导入\(draw\)/.test(为写));
  /* 中文协议名会被那台小工具当句子扫走（'开向导' / '重扫' 就是这一批差点混进去的；'导入' 那几个是界面上本来就有的按钮字） */
  const 单 = rd('data/ui-text.yaml');
  台.判('登记处那一棵不给界面文字清单添句子：清单里没有「开向导」「重扫」这种协议名，也不起「推演登记处」那一格',
    !/^\s*(开向导|重扫):/m.test(单) && !/推演登记处/.test(单));
}

台.题('五、界面上那几句话不许是"缺失"那一类（2.7 同一把尺）');
{
  const 忌 = ['缺失', '没有内核', '未安装', '没装', '还没装', '装不回来'];
  const 新句 = ['重新读一遍推演名单', '推演名单重报了一遍：现在 '];
  const 撞 = 忌.filter(w => 为写.split(/\r?\n/).some(l => 新句.some(s => l.includes(s)) && l.includes(w)));
  台.判('这一批新加的那两句里没有"缺失"那一类字样（那一头没加载时整块不摆，不解释、不告错）', 撞.length === 0, 撞.join('、'));
}

台.题('六、这一家自己那一棵没被改成别的样子（4.3 只加一条报话）');
台.判('推演定制内核那三份源码照旧（登记处不住在那一棵里，也不给它另开一颗产物）',
  rd('src/_wcustom/build-kernel.mjs').includes("'sh-gen.js'") && rd('src/_wcustom/build-kernel.mjs').includes("'sh-wizard.js'")
  && !rd('src/_wcustom/build-kernel.mjs').includes('sh-gens'));
台.判('为写那颗内核也不打包登记处（它是页面上的那一份，两家读同一颗才叫缓存）',
  !rd('src/_wnw/build-kernel.mjs').includes('sh-gens'));

台.收尾();
