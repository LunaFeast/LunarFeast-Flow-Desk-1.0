/* 外46 九 · GitHub 版本资源助手第一批的第一颗：分支四类与「这条支能不能推远程」的判据。
   ------------------------------------------------------------
   判据只许住在 src\_build\push-list.mjs 一份（别处抄一份，界面与命令行迟早各说各话），
   所以这一台一半判行为、一半判"没有第二份"。
   他 2026-10-12 定的四类：feature/refactor/electron-to-tauri-shell（一次性）、feature/new/…、
   feature/tweak/…、local/all-features-test（永不进远程）。
   用法：node src\\tools\\probes\\gate-branchclass46.mjs */
import { 记账, rd } from './lib-slice.mjs';
import { 支类表, 认支类, 可推远程, 支名形状, 支类合规, 文字齐, 支名默认, 支名可用,
  拼清单, 读清单, 读清单显示, 改清单 } from '../../_build/push-list.mjs';

const 台 = 记账('gate-branchclass46');
台.题('一、四类各认得出，名字不成形状就认不出（不许蒙成最近的那一类）');
台.判('1 表里就那四类，一类一条：一次性重构 / 全新功能前瞻 / 已有功能优化 / 本地集成',
  支类表.map(x => x.类).join('、') === '重构、新增、优化、集成', 支类表.map(x => x.类).join('、'));
台.判('2 一次性重构支只认那一条名（写别的 refactor 名字不算）',
  认支类('feature/refactor/electron-to-tauri-shell').类 === '重构'
  && 认支类('feature/refactor/tauri-shell') === null
  && 认支类('feature/refactor/electron-to-tauri-shell-backup') === null);
台.判('3 前瞻支认得 plugin- 那种写法与多一层斜杠的（feature/new/plugin-notes），光 feature/new 不算',
  认支类('feature/new/heat-map').类 === '新增' && 认支类('feature/new/plugin-wnw-custom').类 === '新增'
  && 认支类('feature/new') === null);
台.判('4 优化支认得他给的两个例子，光 feature/tweak 不算',
  认支类('feature/tweak/export-progress-fix').类 === '优化'
  && 认支类('feature/tweak/window-resize-optimize').类 === '优化' && 认支类('feature/tweak') === null);
台.判('5 集成分支认这一条名，尾巴多个字就不认',
  认支类('local/all-features-test').类 === '集成' && 认支类('local/all-features-testx') === null);
台.判('6 空白与不是字符串的进来也不炸，只当认不出',
  认支类('  feature/new/heat-map  ').类 === '新增' && 认支类('') === null && 认支类(null) === null);

台.题('二、能不能往远程推');
台.判('7 集成分支当场拒绝，报的话里说明"只留本地，永不推远程"',
  可推远程('local/all-features-test').行 === false
  && /集成分支只留本地/.test(可推远程('local/all-features-test').话), 可推远程('local/all-features-test').话);
台.判('8 重构支与两条功能支都放行（功能支那两条另标"要点字"：要他亲手敲那个字才算下过指令）',
  可推远程('feature/refactor/electron-to-tauri-shell').行 === true
  && 可推远程('feature/new/heat-map').类 === '新增' && 支类表.find(x => x.类 === '新增').可推 === '要点字'
  && 支类表.find(x => x.类 === '集成').可推 === false);
{
  const r = 可推远程('feature/milestone-heatmap');   /* 这一轮之前我自己起过的旧名，正是要被拦的那一类 */
  台.判('9 认不出类的名字一律不放行，报的话把这四条形状原样列出来',
    r.行 === false && /四类/.test(r.话) && /milestone-heatmap/.test(r.话), r.话);
}
台.题('三、判据没有第二份');
const 名单 = ['src/_build/push-list.mjs', 'src/_build/pr.mjs', 'src/_build/release.mjs',
  'src/_build/plugin-repos.mjs', 'src/tools/probes/gate-push46.mjs', 'src/tools/probes/gate-prflow46.mjs',
  'src/tools/probes/gate-texticon46.mjs', 'src/tools/probes/gate-branchclass46.mjs'];
{
  const 抄 = 名单.filter(p => {
    if(p === 'src/_build/push-list.mjs' || p.includes('gate-branchclass46')) return false;
    const 正文 = rd(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const 另立表 = /支类表\s*[=:]|function\s+认支类|const\s+认支类/.test(正文);                        /* 自己抄一张表、另写一颗判断 */
    const 写死名 = p.startsWith('src/_build/') && /all-features-test|electron-to-tauri-shell/.test(正文); /* 程序里把名字写死；闸里那些样本是拿来试判据的，不算第二份 */
    return 另立表 || 写死名;
  });
  台.判('10 那四类形状与那张表只在 push-list.mjs 一份：程序里把名字写死、或别处自己另立一张表就报出来（注释里的不算，从这一份 import 过去调用不算，闸里当样本使的也不算）',
    抄.length === 0, 抄);
  台.判('11 旧那颗 支名形状 原样还在（pr.mjs 与那两道闸还在吃它，界面那一批改一起换）',
    typeof 支名形状 === 'object' && 支名形状.test('hotfix/bug-nudge') && 支名形状.test('release/v1')
    && !支名形状.test('local/all-features-test'));
}

台.数('这四类各能不能推', 支类表.map(x => x.类 + '=' + (x.可推 === false ? '禁推' : x.可推 === true ? '可推' : '要点字')).join(' · '));

台.题('四、清单上「分支类型」与支名要同一类；文字没填不许落笔');
{
  const a = 支类合规('新增', 'feature/new/heat-map');
  const b = 支类合规('优化', 'feature/new/heat-map');      /* 他要是把类型填错了，这一条必须拦 */
  const c = 支类合规('', 'feature/tweak/export-progress-fix');
  台.判('12 类型与支名同一类就放行；填错类（把 new 那条说成 优化）当场拦下并报出它其实属于哪一类',
    a.行 === true && a.类 === '新增' && b.行 === false && /是「新增」那一类/.test(b.话), b.话);
  台.判('13 「分支类型」那一格空着不算错（照支名自己认出来的那类走），认不出名字照样拦',
    c.行 === true && c.类 === '优化' && 支类合规('', 'feature/milestone-heatmap').行 === false);
  const 都空 = 文字齐({ 提交说明: '', 本轮说明: '' });
  const 半填 = 文字齐({ 提交说明: '他填过的一句', 本轮说明: '  \n' });
  const 齐 = 文字齐({ 提交说明: '他填过的一句', 本轮说明: '标题一行\n正文一行' });
  台.判('14 提交说明与本轮说明两格都空 → 拦，且把两格都点名（他不填我不替他补默认文字）',
    都空.行 === false && /提交说明/.test(都空.话) && /本轮说明/.test(都空.话), 都空.话);
  台.判('15 只填了一格 → 照样拦，只点名还空着那一格（光空白与换行算没填）',
    半填.行 === false && /本轮说明/.test(半填.话) && !/提交说明、/.test(半填.话), 半填.话);
  台.判('16 两格都有字 → 放行', 齐.行 === true);
}

台.题('五、界面上改了「分支类型」要存得回清单（改清单 那两手：有那一行就换掉、老清单没那一行就在第一笔之前补）');
const 样 = 拼清单({ 基线:'1.0.0-alpha', 分支类型:'重构', 提交分支:'feature/refactor/electron-to-tauri-shell',
  本轮说明:'这一轮把类型那一格接上',
  笔:[{ 名:'主程序 · Flow-Desk', 副题:'这一笔落在 main 那一支', 会动:'会动 · 多了 2 份改动', 现在:'1.0.0-alpha+build.aaaaaaa',
    会成:'1.0.0-alpha+build.（这一笔落下去才知道）', 话:['开头请留着「发布 」这两个字'], 描述:'发布 1.0.0-alpha · 记号', 份:['src/a.mjs'] }] });
{
  const 新 = 改清单(样, { 分支类型:'优化' });
  台.判('17 清单上有那一行 → 只换那一行：读回来是「优化」，支名/本轮说明/号/份/更新描述一个字节没动',
    读清单(新).分支类型 === '优化' && 读清单(新).提交分支 === 读清单(样).提交分支
    && 读清单(新).本轮说明 === 读清单(样).本轮说明 && 读清单(新).基线 === '1.0.0-alpha'
    && 读清单(新).描述['主程序 · Flow-Desk'] === '发布 1.0.0-alpha · 记号'
    && 新.includes('    src/a.mjs') && 新.includes('  # 开头请留着「发布 」这两个字'), 读清单(新).分支类型);
  const 老 = 样.replace(/^分支类型 = .*\n?/m, '');
  const 补 = 改清单(老, { 分支类型:'优化' });
  const 顶补 = 补.slice(0, 补.indexOf('【主程序 · Flow-Desk】'));
  台.判('18 老清单没那一行（2026-10-12 之前那一份）→ 界面上改的类型在第一笔之前补进去，两把尺都读得回；没有那一行时两把尺都回空串（不是这把空串那把 undefined）',
    读清单(老).分支类型 === '' && 读清单显示(老).分支类型 === '' && !/^分支类型 = /m.test(老) &&
    /^分支类型 = 优化$/m.test(补) && 读清单(补).分支类型 === '优化' && 读清单显示(补).分支类型 === '优化'
    && 顶补.includes('分支类型 = 优化'), 读清单显示(老).分支类型);
  const 三 = 改清单(样.replace(/^分支类型 = .*\n?/m, '').replace(/^提交分支 = .*\n?/m, '').replace(/^本轮说明 = .*$/gm, '# 空'),
    { 分支类型:'新增', 提交分支:'feature/new/heat-map', 本轮说明:'补一段' });
  const 顶三 = 三.slice(0, 三.indexOf('【主程序 · Flow-Desk】'));
  台.判('19 三行一起补时按 拼清单 顶上那个顺序（类型在支名之前、支名在说明之前），且类型与支名同一类（不是各填各的）',
    顶三.indexOf('分支类型 = 新增') >= 0 && 顶三.indexOf('提交分支 = feature/new/heat-map') >= 0 && 顶三.indexOf('本轮说明 = 补一段') >= 0 &&
    顶三.indexOf('分支类型 = 新增') < 顶三.indexOf('提交分支 = feature/new/heat-map') &&
    顶三.indexOf('提交分支 = feature/new/heat-map') < 顶三.indexOf('本轮说明 = 补一段') &&
    支类合规(读清单(三).分支类型, 读清单(三).提交分支).行 === true, 顶三);
  台.判('20 没给类型那一格 → 原样回（--看 重跑不搅他写过的），给了空串也照他写的落上去',
    改清单(样, { 基线:'1.0.0-alpha' }) === 样 && 读清单(改清单(样, { 分支类型:'' })).分支类型 === '');
}
{
  const 名 = 支名默认('外46 搬 tauri 数据通道 mjs', '20261012');
  台.判('21 --看 的默认支名属于四类之一（落在「优化」那一类，不再回一个四类之外的 feature/<尾>）',
    名 === 'feature/tweak/46-tauri' && 认支类(名).类 === '优化' && 可推远程(名).行 === true, 名);
  台.判('22 顶不住时退的那一条也在四类里（空说明 → feature/tweak/round-<日>），类型空着也照支名认得出类',
    支名默认('', '20261012') === 'feature/tweak/round-20261012'
    && 认支类(支名默认('全是中文没有英文', '2026-10-12')).类 === '优化'
    && 支类合规('', 支名默认('', '20261012')).行 === true);
}
台.数('默认支名这一串', 支名默认('外46 搬 tauri 数据通道 mjs', '20261012'));

台.题('六、"这个名字这一轮能不能用"只有一颗：支名可用（叫它的只有 pr.mjs 那两处）');
{
  台.判('23 旧那三种头一段照收（--看 从前生成的名字、已经开出去的支都算），认不出类的也不硬给它安一类',
    支名可用('feature/46-tauri-data').行 === true && 支名可用('hotfix/9-fu').行 === true && 支名可用('release/1.2.3-do').行 === true &&
    支名可用('hotfix/9-fu').类 === '');
  台.判('24 四类里能往远程推的收（带回它是哪一类），集成分支拒、话里说"永不推远程"',
    支名可用('feature/tweak/46-tauri').类 === '优化' && 支名可用('feature/refactor/electron-to-tauri-shell').类 === '重构' &&
    支名可用('local/all-features-test').行 === false && /永不推远程/.test(支名可用('local/all-features-test').话));
  台.判('25 认不出类的拒，报的话把那四条形状列出来；空名字也拒且说清是那一格空的',
    支名可用('feature/外46').行 === false && /四类/.test(支名可用('feature/外46').话) &&
    支名可用('').行 === false && /那一行是空的/.test(支名可用('').话) && 支名可用(null).行 === false);
  const 抄 = ['src/_build/pr.mjs', 'src/_build/release.mjs']
    .filter(p => { const 正 = rd(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      return /支名形状\.test\(/.test(正) || /可推远程\([^)]*\)\.行/.test(正); });
  台.判('26 收与不收不再各处判第二遍：那三颗文件里不许再出现 支名形状.test( 或 可推远程(...).行（都改叫 支名可用）',
    抄.length === 0, 抄);
}
台.收尾();
