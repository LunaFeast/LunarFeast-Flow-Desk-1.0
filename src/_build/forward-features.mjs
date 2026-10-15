/* ============================================================
   八项前瞻功能：哪一项、住哪一份文件、在自己那条分支上动的是哪几处、分支叫什么名
   ------------------------------------------------------------
     node src/_build/forward-features.mjs            列一遍：八项各自带不带、分支起没起
     node src/_build/forward-features.mjs --查分支    只问 git：这八条分支哪几条已经在仓里

   他 2026-10-13 逐条给定的口径（原话记在 docs\GitHub版本资源助手.md 第十节）：
     · 「拆」不是把功能搬出去当新插件，也不是删掉不要 —— 是拆出来成为**对应功能的本地前瞻分支**；
       基础那一支有一份「没有这个功能的产品」，前瞻分支把它加回来，前瞻分支是对这个产品的未来更新。
     · 基础版与全功能版差的就是这八项；带哪几项进这一枚包由他在屏上勾，我不替他定。
     · 安装包本身与装好之后的软件里任何地方都不许出现「简装」「完整」「全部功能」「缺失」这类字样 ——
       这一份名单只管开发这一头，界面上摆给装的人看的那几格一个字都不提档位。

   为什么要有这一份：从前这一摊只有「整家插件」那一颗开关（publish.mjs 的 --skip=），
   它砍得到一整家，砍不到「一家里面的某个功能」—— 这八项里有五项就在为写那一家里面。
   哪一项对应哪一条分支、动的是哪几份文件，只在这一份里说一次，别处（屏上、打包那一趟、闸）都从这里取。
   ============================================================ */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TREE = path.resolve(HERE, '..', '..');

/* 形状：
   id      分支尾巴那一段（feature/new/<id>），也是命令行与屏上认的那个名
   中文     屏上与他看得见的那句名字
   住在哪   这一项的代码主要在哪一层（为写内核 / 某一家插件 / 主程序 / 共用模块）
   动的地方  这一项在它自己那条分支上占的是哪几处（一份一份写全，不写「等等」）
   形状     whole-file = 整份文件加装配名单那种（合进来与不合都干净）；switch = 一家里的某个开关，要在几处各开口子 */
export const 八项 = [
  { id: 'lyric-grid', 中文: '词格模式', 住在哪: '为写内核 + 共用模块', 形状: 'switch',
    量这份: ['src/_wnw/src/w18-lyric.js', 'src/_wnw/src/w19-cruise.js'],
    分支: 'feature/new/lyric-grid',
    /* 这一项拆开的形状（2026-10-13 在仓外那一格真做过一遍：15 处改 + 装配名单少两行 + 删那两份，产物 1,171,113 → 990,794 字节、
       那 38 颗符号一处不剩）：基础版留一格开关与两张空名单 ——
         w7-data.js 顶上：const LYRIC_MODE='lyric'、const 词格档={在:false,paras:…}、const 巡航菜单=[]、const 巡航拾取=[]
       别处那一档全走这一格（模式下拉里那一档、章与卷右键那几项巡航、＋ 那张清单那两条、章上那个图标）；
       老章目录上 mode 还写着 lyric 的按正文那一档摆，c.lyric 与 lyrics\ 那个明文文件一个字不动。
       那条分支上多出来的只有四行登记：w18 末尾 词格档.在=true、词格档.paras=lyricParas、CH_MODE_ICO 那项由开关自己长回来；
       w19 末尾 巡航菜单.push(卷巡航/书巡航那两条)、巡航拾取.push(＋ 清单那两条)。 */
    动的地方: ['src/_wnw/src/w18-lyric.js（词格本体）', 'src/_wnw/src/w19-cruise.js（词巡航、书巡航）',
      'src/_wnw/build-kernel.mjs 装配名单里那两行',
      'src/_wnw/src/w8-write.js 那 13 处：模式下拉那一档、工具条与版式那一行的开关、批注与修订那一栏、页脚那一句、' +
        '章上图标、卷上与章上右键那几项巡航',
      'src/_wnw/src/w3-shell.js ＋ 那张清单里那两条巡航（词巡航、书巡航）',
      'src/_wnw/src/w7-data.js 整本导出读正文那一处（词格那份正文不住在 c.paras）',
      '公开的 src/_shared/sh-mus.js、sh-ttml.js 只在词格里被叫（那两份自己不进装配名单，留着不动）'] },
  { id: 'music-dock', 中文: '音乐遥控器停靠', 住在哪: '音乐遥控器那一家 + 为写停靠栏', 形状: 'switch',
    量这句: [['data/plugins/music-remote/manifest.json', '"wnw"']],
    分支: 'feature/new/music-dock',
    动的地方: ['data/plugins/music-remote/manifest.json 的 host 里那一格 "wnw"（基础版只留 "fd"：首页那张卡照用，为写那一侧不摆它）',
      'data/plugins/music-remote/main.js 里挂进为写右栏停靠那一段（第 1268、1274、1277 行那三处注释标着的档）'] },
  { id: 'heat-map', 中文: '写作统计的热力图', 住在哪: '为写内核', 形状: 'whole-file',
    量这份: ['src/_wnw/src/w21-heat.js'],
    分支: 'feature/new/heat-map',
    动的地方: ['src/_wnw/src/w21-heat.js 整份', 'src/_wnw/build-kernel.mjs 装配名单里那一行',
      '统计那一屏底下那张名单（STAT_BLOCKS）里那一项 —— 名单空着就什么都不摆，界面上不留半个坏口'] },
  { id: 'wnw-custom', 中文: '推演组件定制', 住在哪: '独立那一家 + 出内核那颗', 形状: 'whole-file',
    量这份: ['data/plugins/wnw-custom/manifest.json', 'src/_wcustom/build-kernel.mjs'],
    分支: 'feature/new/wnw-custom',
    动的地方: ['data/plugins/wnw-custom 那一格（活的）',
      'src/_wcustom/src 那四份源码与 src/_wcustom/build-kernel.mjs',
      'src/_fd/build.mjs 里读推演组件定制那颗产物的那一段',
      'src/_build/plugin-repos.mjs 家表里那一家（七家变六家）'] },
  { id: 'blank-web', 中文: '标签页加号打开空白网页', 住在哪: '为写内核', 形状: 'whole-file',
    量这份: ['src/_wnw/src/w22-web.js'],
    分支: 'feature/new/blank-web',
    动的地方: ['src/_wnw/src/w22-web.js 整份', 'src/_wnw/build-kernel.mjs 装配名单里那一行',
      '＋ 那张清单的分组名单（PICK_GROUPS）里那一组 —— 同热力图那一手，空着就不摆'] },
  { id: 'dock-two-column', 中文: '双栏停靠', 住在哪: '为写停靠栏', 形状: 'switch',
    量这句: [['src/_wnw/src/w3-shell.js', '停靠两栏']],
    分支: 'feature/new/dock-two-column',
    动的地方: ['src/_wnw/src/w3-shell.js 里「丙-1 停靠两栏」那一档（含窄到 300 就不许再摆两栏那道限）',
      'src/_wnw/src/w0-skin.js 里「停靠里的长组件：整块不再越拖越长，左右两栏各滚各的」那一段样式',
      '说明：Flow-Desk 那几处「两栏」（src/_fd/src/fd3-lib.js 外观方案、fd8-tools.js 卡片展开、' +
        'src/_shared/sh-look.js 阴影与纸纹）不是这一项，一个字都不动'] },
  { id: 'card-weight', 中文: '卡片出场权重', 住在哪: '为写卡片那一层', 形状: 'switch',
    量这句: [['src/_wnw/src/w10-cards.js', '中权重']],
    分支: 'feature/new/card-weight',
    动的地方: ['src/_wnw/src/w10-cards.js 里中、低权重那两枚可调的数（全局一份、0.1~1、步进 0.1）与调完整圈换算那一颗',
      '同一份里那两处界面：× 中权重 / × 低权重 那两行提示与「权重」那一栏',
      '基础版照旧计入出场，三种响应一律权重 1、不给调'] },
  { id: 'gen-log', 中文: '推演记录', 住在哪: '共用模块（为写与 Flow-Desk 共用）', 形状: 'whole-file',
    量这份: ['src/_shared/sh-log.js'],
    分支: 'feature/new/gen-log',
    动的地方: ['src/_shared/sh-log.js 整份（它自己顶上那行就写着「推演记录 · WNW 和 FD 共用这一份」）',
      'src/_fd/build.mjs 装配名单里那一句 ../_shared/sh-log.js（第 45 行）',
      'src/_wnw/src/w3-shell.js、src/_wnw/src/w0-skin.js 里进推演记录那一页的入口',
      'src/_wcustom/src/sh-gen.js 里往推演记录记一笔的那几处（推演组件定制自己那本记录不动）'] },
];

export const 八项表 = () => Object.fromEntries(八项.map(x => [x.id, x]));
export const 分支名单 = () => 八项.map(x => x.分支);
/* 屏上那一行要说人话：id 与分支名是一回事的两面，名字只在这一份里有一份 */
export const 中文名 = id => (八项表()[id] || {}).中文 || id;
export const 分支of = id => (八项表()[id] || {}).分支 || '';
/* 命令行与屏上都可能被他写成中文，两种都认；认不出来回空，让叫那一头点名 */
export const 认这项 = 名 => {
  const s = String(名 || '').trim();
  const hit = 八项.find(x => x.id === s || x.中文 === s || x.分支 === s);
  return hit ? hit.id : '';
};

function git(在, 参数) {
  return execFileSync('git', 参数, { cwd: 在, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/* 这一条分支起没起来：起了回那一笔短哈希，没起来回空（不拿主干凑 —— 屏上那一格要能看出是哪一项还没拆） */
export function 分支在不在(在, 分支) {
  try { return git(在 || TREE, ['rev-parse', '--short', 'refs/heads/' + 分支]); } catch (e) { return ''; }
}

/* 这一棵现在带不带这一项 —— 量给你看，不猜：
   「量这份」给的是路径（那几份在 = 带着）；「量这句」给的是「哪一份里还有哪一串」（还在 = 带着）。
   两样都没登记的回「没登记怎么量」，不许写成「带着」—— 2026-10-13 他指着屏上那行「带着」问「到底拆了没有」：
   开关那种从前一律回「带着」，等于把没量说成量过。 */
export function 现在带不带(在, 项) {
  const 根 = path.resolve(在 || TREE);
  const 份 = (项.量这份 || []).filter(Boolean);
  if (份.length) {
    const 有 = 份.filter(p => fs.existsSync(path.join(根, p)));
    return { 带: 有.length > 0, 话: 有.length + '/' + 份.length + ' 份在盘上（' + 份.map(p => p.split('/').pop()).join('、') + '）' };
  }
  const 句 = (项.量这句 || []).filter(x => Array.isArray(x) && x.length === 2);
  if (句.length) {
    const 中 = 句.filter(([p, 串]) => { try { return fs.readFileSync(path.join(根, p), 'utf8').includes(串); } catch (e) { return false; } });
    return { 带: 中.length > 0, 话: 中.length + '/' + 句.length + ' 句还在源码里' };
  }
  return { 带: null, 话: '这一项还没登记怎么量（不当它带着，也不当它没有）' };
}

/* 把一棵里那些「不进仓、但跑那三趟要」的东西（运行时那一格、本机那份登记）用硬链接铺过去：
   同一块盘上只存一份，243 MB 的运行时不复制第二遍；删那一格里的副本动不到原来那一份。
   源可以是一整格，也可以就一份文件（src\tools\本地路径.cjs 那一种：它不进仓，可在临时那一棵里跑的
   编壳与发布两趟都要读它 —— 少带这一份，临时那一棵里报的是「本地那份登记里没写 Rust 那三颗位置」）。
   跨盘链不动 —— 当场抛并说清楚为什么（那一格得换到仓所在那一块盘上）。 */
export function 硬链接一份(源, 到) {
  let 数 = 0;
  const 链 = (s, d) => { try{ fs.linkSync(s, d); 数++; } catch(err){
    throw new Error('链不动 ' + s + ' → ' + d + '：' + ((err && err.message) || err) + '（同一块盘上才链得上 —— 那一格得换到仓所在那一块盘上）');
  } };
  const 单 = fs.statSync(源);   /* 读不到就当场抛：宁可停在这儿，也别静默出一棵缺件子的树 */
  if(单.isFile()){
    fs.mkdirSync(path.dirname(到), { recursive: true });
    fs.rmSync(到, { force: true });
    /* 一份文件跨盘链不上就照原样复制一份（这台：仓在 D 盘、临时那一棵在 E 盘）——
       要的只是「临时那一棵里读得到同一份内容」，省不省那几 KB 无关紧要。
       一整格那种（几百 MB 的运行时）不暗地复制：那是真占地方，链不动就停下报名字。 */
    try{ 链(源, 到); }
    catch(err){
      if(!/cross-device|EXDEV/.test(String((err && err.message) || err))) throw err;
      fs.copyFileSync(源, 到);
    }
    return 数;
  }
  const walk = (a, b) => {
    fs.mkdirSync(b, { recursive: true });
    for(const e of fs.readdirSync(a, { withFileTypes:true })){
      const s = path.join(a, e.name), d = path.join(b, e.name);
      if(e.isDirectory()){ walk(s, d); continue; }
      fs.rmSync(d, { force: true });
      链(s, d);
    }
  };
  walk(源, 到);
  return 数;
}

/* 打包用的那一棵：合上勾中的那几项 + 把跑那一串要的东西链过去。
   要链的名单只在这一份里说一次，两样都不进仓：
     · src/pack/node_modules —— 从前 electron 那一颗的运行时，发布那一步要读它（这一棵上没有就自动跳过）；
     · src/tools/本地路径.cjs —— 这台机器的登记（Rust 那三颗位置、编译缓存那一格、工区、存档落点）。
       临时那一棵里跑的编壳与发布两趟都要读它；少带这一份，报的是「本地那份登记里没写 Rust 那三颗位置」。 */
export function 摊打包那一棵(在, 基点, 项列表, 那一格, 要链, 额外支) {
  const 根 = path.resolve(在 || TREE);
  const 果 = 合那一棵(根, 基点, 项列表, 那一格, 额外支);
  const 链 = (要链 || ['src/pack/node_modules', 'src/tools/本地路径.cjs']).filter(相 => fs.existsSync(path.join(根, 相)));
  const 链了 = [];
  for(const 相 of 链){
    const 数 = 硬链接一份(path.join(根, 相), path.join(果.目录, 相));
    链了.push({ 相, 数 });
  }
  果.链了 = 链了;
  return 果;
}

/* 把勾中的那几项合到「打包用的那一棵」上：全程只挪仓外那一格里的一棵临时树 ——
   不碰工作树（他正站在那一棵上改代码）、不碰任何一根已有的指针、不推任何东西。
   做法是现成那一套：两条支拿 merge-tree 现算一棵树，再 commit-tree 挂一笔，最后 worktree --detach 摊到仓外那一格。
   返回 撤()：把那一格收掉、把那几笔临时对象与那根临时指针清干净（用完当场删，不在仓里留影子）。 */
export function 合那一棵(在, 基点, 项列表, 那一格, 额外支) {
  const 根 = path.resolve(在 || TREE);
  const 起 = String(基点 || '').trim();
  if (!起) throw new Error('没给基点：合那一棵要知道从哪一笔起（一般是工作树站的这一棵）。');
  const 挑 = [...new Set((项列表 || []).map(认这项).filter(Boolean))];
  const 认不出 = (项列表 || []).map(s => String(s || '').trim()).filter(Boolean).filter(s => !认这项(s));
  if (认不出.length) throw new Error('这几项名单里没有：' + 认不出.join('、') + '（八项的 id 与中文名都认，见 forward-features.mjs）');
  /* 额外那几条支照原样合（插件那七家住在各自那一支上：从集成分支打全功能那一枚时得把它们一起合进来） */
  const 合单 = 挑.map(id => ({ 名: 分支of(id), 话: '临时：打包用，合上 ' + 中文名(id) }))
    .concat((额外支 || []).map(s => String(s || '').trim()).filter(Boolean).map(名 => ({ 名, 话: '临时：打包用，合上 ' + 名 })));
  let 头 = git(根, ['rev-parse', 起]);
  const 合了 = [];
  for (const { 名: 分支, 话 } of 合单) {
    let 支头 = '';
    try { 支头 = git(根, ['rev-parse', '--verify', 'refs/heads/' + 分支]); } catch (e) {
      throw new Error((分支.startsWith('feature/new/') ? '「' + 中文名(分支.replace('feature/new/', '')) + '」这一项的分支 ' : '那条支 ') + 分支 +
        ' 还没起来：勾了也没东西可合。');
    }
    let 树 = '';
    try {
      树 = git(根, ['merge-tree', '--write-tree', '--no-messages', 头, 支头]);
    } catch (e) {
      throw new Error('「' + 分支 + '」这一条合不上（跟基点撞车）：' +
        String((e && (e.stderr || e.message)) || e).split(/\r?\n/)[0]);
    }
    const 新笔 = git(根, ['commit-tree', 树, '-p', 头, '-m', 话]);
    合了.push({ id: 分支.replace(/^feature\/new\//, ''), 中文: 分支.startsWith('feature/new/') ? 中文名(分支.replace('feature/new/', '')) : 分支,
      分支, 支头: 支头.slice(0, 7), 笔: 新笔.slice(0, 7) });
    头 = 新笔;
  }
  const 笔 = 头;
  const 指针 = 'refs/tmp/打包-' + 笔.slice(0, 7);
  git(根, ['update-ref', 指针, 笔]);
  const 目录 = path.resolve(那一格 || path.join(path.dirname(根), 'Flow-Desk-打包那一棵'));
  const 列表 = [];
  /* 这一格只由这一颗自己摊、自己收。上一趟要是崩在半路（停 = 当场退，从前那一趟没收回这一格），
     下一趟 git 报的就是「missing but already registered worktree」，非先 prune 才走得动 ——
     摊之前按同一把尺把它收干净：清的就是这一格，别处一根指针、一格东西都不碰。 */
  if (fs.existsSync(目录)){
    try { git(根, ['worktree', 'remove', '--force', 目录]); } catch (e) {}
    try { fs.rmSync(目录, { recursive: true, force: true }); } catch (e) {}
  }
  git(根, ['worktree', 'add', '--detach', 目录, 笔]);
  列表.push(目录);
  return {
    目录, 那一笔: 笔, 基点: 起.slice(0, 7), 合了,
    撤: () => {
      try { git(根, ['worktree', 'remove', '--force', 目录]); } catch (e) {}
      try { git(根, ['update-ref', '-d', 指针]); } catch (e) {}
      列表.length = 0;
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const 查分支 = process.argv.includes('--查分支');
  console.log('八项前瞻功能（名单只这一份：src/_build/forward-features.mjs）\n');
  for (const x of 八项) {
    const 起 = 分支在不在(TREE, x.分支);
    const 带 = 现在带不带(TREE, x);
    console.log('  ' + x.中文.padEnd(12, '　') + ' ' + x.分支 + '  分支：' + (起 || '没起来') +
      (查分支 ? '' : '  这一棵：' + (带.带 ? '带着' : '没有') + '（' + 带.话 + '）'));
  }
  const 起了 = 八项.filter(x => 分支在不在(TREE, x.分支)).length;
  console.log('\n  八条分支里起来了 ' + 起了 + ' 条；没起来的那几项，打包勾了会当场停下来等那一笔。');
}
