/* ============================================================
   gate-bankmulti46.mjs · 插件分离第 4 批 4.6 · 词库多选（一个推演勾几张就用几张）
   ------------------------------------------------------------
     node src/tools/probes/gate-bankmulti46.mjs
   钉的是五件事：
     ① 一份还是一串都读得动 —— 老配方里那一串名字不改数据也照旧认（bankNames）；
     ② 勾了几张就并成一份给取词那几处用（并几张）：同一分类并到一起、同一条词不重复、
        底下任何一张重新读了，这份并表才重算；只有一份时交回那一份的实例（编辑器与 Bus 认的是它）；
     ③ 一张配方到底用了哪几张（GEN_BANKS）：顶层、每一块、每一路规则、每一个维度、每一个联动来源都收 ——
        从前这一颗只走界面那一棵树，规则 / 维度 / 来源写的词库是漏的；
     ④ 界面上那几处入口按几张来：向导里那一格是一串挑子（加一张 / 去一张 / 每张一颗改词库），
        主程序卡片与为写停靠那条也是几张几颗钮；
     ⑤ 绑重画与完全删除也按几张：每张各绑一次（别绑两遍、也别只绑头一张），删除问话把几张都列出来。
   反证三件：把并表那颗的分类表摘掉 → 取词当场撞空；把 GEN_BANKS 退回从前只走 ui 那一棵树 → 规则那几处漏收；
   把 genBind 退回"只绑一颗" → 第二张改了没人重画。
   ============================================================ */
import { rd, 切, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-bankmulti46');
const 层 = rd('src/_wcustom/src/sh-banks.js');
const 生 = rd('src/_wcustom/src/sh-gen.js');
const 导 = rd('src/_wcustom/src/sh-wizard.js');
const 壳 = rd('src/_fd/src/fd3-shell.js');
const 写 = rd('src/_wnw/src/w3-shell.js');

/* ---------- 两份假词库：甲有「场景」两条，乙同名分类一条 + 自己的一条 ---------- */
function 假张(名, 分类){
  const 张 = { which:'b:' + 名, 名, ver:0, loaded:false, cats:new Map(Object.entries(分类)),
    raw(c){ return this.cats.get(c) || []; },
    opts(c){ return ['随机'].concat(this.raw(c).filter(w => w !== '随机')); },
    pool(c){ return this.raw(c).filter(w => w !== '随机'); },
    subs(p){ const 前 = p + '.'; const out = []; for(const c of this.cats.keys()) if(c.startsWith(前)){ const s = c.slice(前.length).split('.')[0]; if(s && out.indexOf(s) < 0) out.push(s); } return out; },
    names(){ return [...this.cats.keys()].sort(); },
    async load(){ this.loaded = true; 张.读 = (张.读 || 0) + 1; return this; },
    async reload(){ this.ver++; 张.读 = (张.读 || 0) + 1; return this; },
    get file(){ return '目录/' + 名 + '/data.txt'; } };
  return 张;
}
function 跑并(分类们){
  const 池 = {};
  for(const [名, 分类] of Object.entries(分类们)) 池['b:' + 名] = 假张(名, 分类);
  const 码 = 切(层, 'bankNames') + '\n' + 切(层, 'BANK_MUL') + '\n' + 切(层, '并几张') + '\nreturn { bankNames, 并几张 };';
  const 造 = new Function('mkBank', 'bankWhich', 码);
  return { ...造(n => 池[n] || 假张(String(n), {}), 名 => 'b:' + 名), 池, 清:() => { } };
}

台.题('一、一份还是一串都读得动（老配方那一串名字不改数据也认）');
{
  const { bankNames } = 跑并({});
  台.判('一串 → 去空去重照原序；一份 → 当成一张；空 → 一份也没有',
    bankNames(['甲', '乙', '甲', '', null]).join() === '甲,乙' && bankNames('甲').join() === '甲'
    && bankNames(undefined).length === 0 && bankNames([]).length === 0, bankNames(['甲','乙','甲','',null]).join('|'));
  台.判('向导里那一格现在写的是一份名单（新建时先按名单头一张填上，和从前一样有个着落）',
    /bank:\(Banks\.list\(\)\[0\] \? \[Banks\.list\(\)\[0\]\] : \[\]\)/.test(导) && /案 = \(\) => bankNames\(R\.bank\)/.test(导));
}

台.题('二、几张并成一份给取词那几处用');
{
  const 甲 = { '场景':['山顶', '渡口'], '场景.天气':['晴'] };
  const 乙 = { '场景':['渡口', '石桥'], '动作':['走'] };
  const { 并几张, 池 } = 跑并({ 甲, 乙 });
  const 单 = 并几张('甲');
  台.判('只有一份时交回那一份的实例本身（不是并的）—— 编辑器保存那条 ' + "'bank:' + which" + ' 认的就是它',
    单 === 池['b:甲'] && 单.which === 'b:甲', 单 === 池['b:甲'] ? '同一颗' : '换了颗');
  const 合 = 并几张(['甲', '乙']);
  台.判('两张并起来：同一分类对上就合、同一条词不重复收',
    合.raw('场景').join('、') === '山顶、渡口、石桥', 合.raw('场景').join('、'));
  台.判('并表把取词那几颗口子都给齐了：分类名、下拉、抽取、子类、名单',
    合.names().join('、') === '动作、场景、场景.天气' && 合.pool('场景').join('、') === '山顶、渡口、石桥'
    && 合.opts('场景')[0] === '随机' && 合.subs('场景').join('、') === '天气', 合.names().join('、'));
  台.判('两张的名字与落点都报得出来（界面上要说清是哪几张）',
    合.which === 'b:甲、b:乙' && 合.file.indexOf('甲') >= 0 && 合.file.indexOf('乙') >= 0, 合.which);
  台.判('同一串名单拿到的并表是同一个对象；底下任何一张重新读了（版号一跳），并表才重算',
    (() => { const 再 = 并几张(['甲', '乙']);
      if(再 !== 合) return false;
      if(合.raw('场景').indexOf('新添的一条') >= 0) return false;
      池['b:乙'].cats.set('场景', ['渡口', '石桥', '新添的一条']); 池['b:乙'].ver++;
      return 合.raw('场景').indexOf('新添的一条') >= 0; })(), '版号 ' + 合.ver);
  const 结 = await (async () => { const 新 = 跑并({ 甲, 乙 }); const 合2 = 新.并几张(['甲', '乙']);
    await 合2.load(); await 合2.reload();
    return 新.池['b:甲'].读 === 2 && 新.池['b:乙'].读 === 2 && 合2.loaded === true; })();
  台.判('load 与 reload 都叫到每一张（开界面读齐、保存之后重取，一张都不落）', 结 === true,
    '两张各读了两回');
  台.判('反证：把并表那颗的分类表摘掉（回 null），取词那一句当场撞上 —— 上面两条测的确实是这份并表在管事',
    (() => {
      const 码 = 切(层, 'bankNames') + '\n' + 切(层, 'BANK_MUL') + '\n'
        + 切(层, '并几张').replace('get cats(){', 'get cats_disabled(){').replace('const m = new Map();', 'const m = null;');
      const 造 = new Function('mkBank', 'bankWhich', 码 + '\nreturn 并几张;');
      const 池2 = { 'b:甲':假张('甲', { '场景':['山顶'] }), 'b:乙':假张('乙', { '场景':['石桥'] }) };
      const 合坏 = 造(n => 池2[n], 名 => 'b:' + 名)(['甲', '乙']);
      try{ 合坏.raw('场景'); return false; }
      catch(e){ return /cats|undefined|null|场景/.test(String((e && e.message) || e)); }
    })());
}

台.题('三、一张配方用了哪几张：顶层、每一块、每一路规则、每一个维度、每一个联动来源都收');
{
  const 码 = 切(层, 'bankNames') + '\n' + 切(生, 'GEN_BANKS') + '\nreturn GEN_BANKS;';
  const 走 = new Function('bankNames', 码)(bank => bank);
  const 配方 = { id:'x', bank:['甲', '乙'],
    ui:[{ t:'ctl', bank:'丙', items:[{ t:'row', bank:'丁' }] },
        { t:'group', sources:[{ cat:'场景', bank:'戊' }] }],
    rules:[{ k:'like', cat:'词表', bank:'己' }],
    dims:[{ cat:'植被', bank:'庚' }] };
  台.判('六处写的词库一颗不漏，顺序不去管、重复的只收一次',
    走(配方).join('、') === '甲、乙、丙、丁、戊、己、庚', 走(配方).join('、'));
  台.判('老配方（顶层那一格是一串名字，不是名单）照旧读得动',
    走({ id:'y', bank:'甲', ui:[{ t:'ctl' }] }).join() === '甲', 走({ bank:'甲', ui:[] }).join());
  台.判('反证：把这一颗退回从前"只走界面那一棵树"那版，规则、维度、联动来源那三处就漏收',
    (() => {
      const 旧 = R => { const out = []; if(R.bank) out.push(R.bank);
        const w = a => { for(const n of a || []){ if(n.bank && out.indexOf(n.bank) < 0) out.push(n.bank); w(n.items); } };
        w(R.ui); return out; };
      const 收 = 旧(配方).join('、');
      return 收.indexOf('己') < 0 && 收.indexOf('庚') < 0 && 收.indexOf('戊') < 0; })());
}

台.题('四、界面上那几处入口按几张来');
{
  台.判('向导里那一格是一串挑子：每张一个小条，条上一颗改词库、一颗去掉，右边那只下拉是「加词库…」',
    /bankChips\(\)\{/.test(导) && /案\(\)\.filter\(x => x !== n\)/.test(导)
    && /'加词库…'/.test(导) && /R\.bank = 案\(\)\.concat\(\[n\]\)/.test(导));
  台.判('从前那颗单选下拉在这一格一处不剩（不留"界面上还能单选、底下其实按名单"两套写法）',
    !/selVal\(this\.banks\.map\(n => \[n, n\]\), R\.bank/.test(导));
  台.判('底下每一块还能各自点自己那一张，标签上把配方勾的那几张都念出来',
    /跟这张配方勾的词库（' \+ bankNames\(this\.R\.bank\)\.join\('、'\) \+ '）/.test(导));
  台.判('主程序卡片顶上与为写停靠条上：几张词库几颗钮，一颗开一张',
    /toolBankWhichs\(cid\)\.map\(w => h\('button'/.test(壳) && /哪几张\.map\(w => h\('button'/.test(写)
    && !/BankDlg\.open\(toolBankWhich\(cid\)\)/.test(壳) && !/BankDlg\.open\(which\)/.test(写));
  台.判('那颗"这个功能到底有没有词库"的老问法留着（回名单头一张），检查台与别处还在用它',
    生.includes('function toolBankWhich(kind)') && 生.includes('toolBankWhichs(kind)')
    && /return 名\.length \? 名\[0\]/.test(生));
}

台.题('五、绑重画与完全删除也按几张');
{
  台.判('每张各绑一次重画（第二张改了也要重画），同一张不绑两遍',
    /for\(const 份 of \(b\.张 && b\.张\.length \? b\.张 : \[b\]\)\)\{/.test(生)
    && /Bus\.on\('bank:' \+ 份\.which, genPaint\)/.test(生) && /if\(GEN_BOUND\.has\(份\.which\)\) continue;/.test(生));
  台.判('真跑：一张配方递进去两张，绑到的是两张各一次；再递一次同一串，一颗都不多绑',
    (() => {
      const 绑过 = [], 池 = { 'b:甲':假张('甲', {}), 'b:乙':假张('乙', {}) };
      const 合 = { which:'b:甲、b:乙', 张:[池['b:甲'], 池['b:乙']] };
      const 码 = 切(生, 'genBind') + '\nreturn genBind;';
      const 手 = new Function('genBank', 'GEN_BOUND', 'Banks', 'Bus', 'genPaint', 码)(() => 合, new Set(),
        { bind:b => 绑过.push('绑' + b.which) }, { on:(k) => 绑过.push(k) }, () => { });
      手(['甲', '乙']); 手(['甲', '乙']);
      return 绑过.join('|') === '绑b:甲|bank:b:甲|绑b:乙|bank:b:乙'; })(), '第二次递同一串应当一颗都不多');
  台.判('完全删除那张问话：能删的几张都列出来各报各的"还有谁在用"，自带的模型那几张不参与',
    /const 名 = bankNames\(R\.bank\);/.test(生) && /可删 = 名\.filter\(n => !Banks\.isBuiltin\(n\)\)/.test(生)
    && /连这几张词库一起删：' \+ 可删\.join\('、'\)/.test(生) && /for\(const n of bankNames\(R\.bank\)\)\{/.test(生)
    && /if\(Banks\.isBuiltin\(n\)\) continue;/.test(生));
  台.判('反证：删除那一颗退回从前"只删顶层那一个名字"，一串两张时第二张留在盘上没人管',
    生.includes('await Banks.remove(R.bank)') === false && !/opt\.bank && R\.bank/.test(生));
}

台.题('六、生成那一路还是一份一份取，没并出第二套口径');
{
  台.判('取词那十一处照旧叫 genBank(...)，一份还是一串都由那一颗去并（不在各处各写一份"取头一张"）',
    (生.match(/genBank\([a-zA-Z.]+\.bank \|\| (?:this|v)\.R\.bank\)/g) || []).length >= 8
    && !/\.bank\[0\]/.test(生) && !/bankNames\([^)]*\)\[0\]/.test(生));
  台.判('genBank 这一颗就是并几张那一颗（一张交回实例、几张给并表），两家不各写一份',
    /function genBank\(name\)\{ return 并几张\(name\); \}/.test(生));
  台.判('词库跟着推演定制那一棵走（4.6 第二刀）：装配单不点它，整库改名收的两格里也有它',
    !/_shared\/sh-banks/.test(rd('src/_fd/build.mjs'))
    && rd('src/_tauri/src/tauri_bind/code_cmds.rs').includes('_wcustom\\\\src'));
}

台.收尾();
