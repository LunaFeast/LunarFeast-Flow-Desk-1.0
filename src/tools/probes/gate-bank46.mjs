/* ============================================================
   gate-bank46.mjs · 插件分离第 4 批 4.6 第一刀：把词库层那两处"无守卫"补成有守卫
   ------------------------------------------------------------
     node src/tools/probes/gate-bank46.mjs
   为什么先量这两处：2026-10-13 那一趟想把词库层搬去推演定制那一棵，搬不成，理由原文写在
   `src/_wcustom/build-kernel.mjs:15-18` —— 「宿主那几处无守卫地读它，留在这一棵里就等于拆掉这一家、
   六家插件一起开不了」。2026-10-16 现场量，那几处只剩两处真的没守卫：装载器建插件上下文那两只手
   （`sh-load.js` 递 `mkBank` / 整颗 `Banks`）、主程序换词库文件那颗钮（伸手进 `Banks._base` 那格私存）。
   这一台钉的就是这两处补完之后的样子，外加两件"搬文件那一刀不能悄悄坏"的现状钉子：
   装配单还点着这两份、整库改名那条 Rust 硬写着源码格 `_shared` 那一层。
   ============================================================ */
import fs from 'node:fs';
import { rd, 切, 切方法, 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-bank46');
const 载 = rd('src/_shared/sh-load.js');
const 层 = rd('src/_wcustom/src/sh-banks.js');
const 主 = rd('src/_fd/src/fd8-tools.js');
const 为写 = rd('src/_wnw/src/w1-core.js');
const 为写数据 = rd('src/_wnw/src/w7-data.js');

台.题('一、装载器那两只手：词库层不在就当这一家没有词库这件事，不抛错、不摆一句缺失');
{
  const 那一手 = 切方法(载, '      bank:which => {');
  台.判('切得出「按清单放行那一只」，且这一句里第一道就是"这颗名字在不在"（不是先叫了再说）',
    /bank:which =>/.test(那一手) && /if\(typeof mkBank !== 'function'\) return null;/.test(那一手));
  台.判('真跑：词库层没加载（mkBank 这个名子虚的）时点这一只手 —— 回空，一句错都不抛',
    (() => {
      const 造 = new Function('mkBank', 'deny', 'm', 'return (' + 那一手.replace(/^\s*bank:/, '') + ');');
      const 手 = 造(undefined, () => { throw new Error('不该走到拒这一笔'); }, { bank:null });
      return 手('b:某个库') === null;
    })());
  台.判('真跑：词库层在、可插件清单没点名这一张 —— 还是照旧拒（守卫不是把拒那一道也放掉了）',
    (() => {
      const 造 = new Function('mkBank', 'deny', 'm', 'return (' + 那一手.replace(/^\s*bank:/, '') + ');');
      const 手 = 造(w => '实例' + w, x => { throw new Error('拒:' + x); }, { bank:{ which:'b:甲' } });
      try{ return 手('b:乙') === null; }
      catch(e){ return /拒:词库「b:乙」/.test(String(e.message || e)); }
    })());
  台.判('真跑：清单点名的那一张照样拿到实例',
    (() => {
      const 造 = new Function('mkBank', 'deny', 'm', 'return (' + 那一手.replace(/^\s*bank:/, '') + ');');
      const 手 = 造(w => '实例' + w, x => { throw new Error('不该拒'); }, { bank:{ which:'b:甲' } });
      return 手('b:甲') === '实例b:甲';
    })());
  /* 反证：把守卫那一行摘掉，这一句就退回"先叫了再说"——名字虚的当场抛 */
  台.判('反证：把守卫那一行摘掉，词库层没加载时点这一只手就当场抛（钉的确实是这一行在管事）',
    (() => {
      const 摘 = 那一手.replace("if(typeof mkBank !== 'function') return null;", '');
      const 造 = new Function('mkBank', 'deny', 'm', 'return (' + 摘.replace(/^\s*bank:/, '') + ');');
      const 手 = 造(undefined, () => { }, { bank:{ which:'b:甲' } });
      try{ 手('b:甲'); return false; }
      catch(e){ return /mkBank|not defined|is not a function/.test(String((e && e.message) || e)); }
    })());
  const 那一只 = /banks:(typeof Banks[^\r\n]*)/.exec(载);
  台.判('整颗交出去那一只也带同一道守卫：词库层不在就是空，页面照样把这一家加载起来',
    !!那一只 && /typeof Banks !== 'undefined' \? Banks : null/.test(那一只[1]));
  台.判('反证：那一行退回从前那种"直接递名字"，词库层不在时建上下文就抛 ReferenceError',
    (() => {
      try{ new Function('return Banks')(); return false; }
      catch(e){ return /Banks is not defined/.test(String((e && e.message) || e)); }
    })());
}

台.题('二、换词库文件那颗钮：叫词库层自己那颗明面上的手，不再伸手进它私存');
{
  const 手 = 切方法(层, '  forget(which){');
  台.判('那颗手切得出来，且只清这一格缓存（说明里写死了不动用户改过的分类与开着的实例）',
    /forget\(which\)\{ this\._base\[which\] = null; \}/.test(手) && !/_ov|_live/.test(手));
  台.判('真跑：忘一次之后下一次读重新去拿原文（不是拿旧缓存）',
    (() => {
      let 取 = 0;
      const 颗 = { _base:{}, _ov:{}, _live:{},
        text0(){ 取++; return Promise.resolve('【甲】\n一条\n'); },
        async text(w){ if(this._base[w] != null) return this._base[w]; return (this._base[w] = await this.text0(w)); },
        forget(w){ this._base[w] = null; } };
      return 颗.text('b:甲').then(() => 颗.text('b:甲')).then(() => { 颗.forget('b:甲'); return 颗.text('b:甲'); })
        .then(() => 取 === 2);
    })(), '拿原文那一句被叫了两回：读两回 + 忘一回之后再来一回');
  台.判('真跑：忘一笔不顺手把用户改过的分类和开着的实例抹掉',
    (() => {
      const 颗 = { _base:{ 'b:甲':'原文' }, _ov:{ 'b:甲':{ 分类:['改过的一条'] } }, _live:{ 'b:甲':3 } };
      new Function('return ({' + 手 + '})')().forget.call(颗, 'b:甲');
      return 颗._base['b:甲'] === null && 颗._ov['b:甲'].分类[0] === '改过的一条' && 颗._live['b:甲'] === 3;
    })());
  台.判('反证：把那颗手那句赋值摘掉，"换一份文件"之后读到的还是缓存里那一份',
    (() => {
      const 摘 = 手.replace('this._base[which] = null;', '');
      const 颗 = { _base:{ 'b:甲':'原文' } };
      new Function('return ({' + 摘 + '})')().forget.call(颗, 'b:甲');
      return 颗._base['b:甲'] === '原文';
    })());
  台.判('主程序那处已经改口：这一头不再出现 `Banks._base`（穿过皮直接摸内脏），叫的是那颗手',
    !/Banks\._base/.test(主) && /Banks\.forget\(which\)/.test(主));
  台.判('私存那两格（_base / _ov / _live）只在词库层这一份文件里出现，别处一家都不许直接读写',
    !/Banks\._(base|ov|live)/.test(为写数据) && !/Banks\._(base|ov|live)/.test(载)
    && !/Banks\._(base|ov|live)/.test(rd('src/_wcustom/src/sh-gen.js'))
    && !/Banks\._(base|ov|live)/.test(rd('src/_wcustom/src/sh-bank-ui.js')));
}

台.题('三、今天那份"清单驱动"确实是空转（现场量的这一格，别当已经接上）');
{
  const 宣 = 切(层, 'bankDecl'), 同 = 切(层, 'bankSync'), 名 = 切(层, 'BANK_NAME');
  const 跑 = (Packs) => {
    const 环 = new Function('Packs', 名 + '\n' + 宣 + '\n' + 同 + '\nreturn { bankDecl, bankSync, BANK_NAME };');
    return 环(Packs);
  };
  台.判('盘上七家的插件清单里今天没有一家声明 bank —— 所以认名单那两颗此刻就是空',
    (() => { const P = 跑({ list:() => [{ id:'notes' }, { id:'music-remote' }] });
      return P.bankDecl('b:某个库') === null && Object.keys(P.bankSync()).length === 0; })());
  台.判('反证：清单里真有一家声明时这两颗就认得上、填得出名字（不是恒空的两颗死物）',
    (() => { const P = 跑({ list:() => [{ id:'wnw-custom', bank:{ which:'b:某个库', name:'某个库' } }] });
      return P.bankDecl('b:某个库') !== null && P.bankSync()['b:某个库'] === '某个库'; })());
  台.判('界面上看得见的词库全是自建那一种形状：按名字反查不到出厂那几张就落回 `b:` 加名字，查得到就用那一张的号',
    (() => {
      const 查 = 切(层, 'bankWhich');
      const 造 = new Function(名 + '\n' + 查 + '\nreturn { bankWhich, BANK_NAME };');
      const 空 = 造(), 满 = 造(); 满.BANK_NAME['b:甲'] = '甲库';
      return 空.bankWhich('甲库') === 'b:甲库' && 满.bankWhich('甲库') === 'b:甲' && 满.bankWhich('b:乙') === 'b:乙';
    })());
}

台.题('四、搬文件那一刀的四扇门（2026-10-16 第二刀真搬了，这四条钉的是"搬完之后每一处都跟着改了"）');
{
  const 装 = rd('src/_fd/build.mjs');
  台.判('装配单不再点着这两份（词库层与词库编辑器跟着那颗定制产物注入，整页顶层不再有这两个名字）',
    !/_shared\/sh-bank/.test(装) && !/_wcustom\/src\/sh-bank/.test(装) && /sh-log\.js/.test(装));
  台.判('定制那棵的产物名单接上这两份，且次序是"底层在前、用它的在后"',
    (() => { const 部 = rd('src/_wcustom/build-kernel.mjs');
      const 段 = 部.slice(部.indexOf('const PARTS'), 部.indexOf('const PARTS') + 300);
      return /'sh-banks\.js'/.test(段) && /'sh-bank-ui\.js'/.test(段)
        && 段.indexOf('sh-banks.js') < 段.indexOf('sh-gen.js') && /'sh-gen\.js'/.test(段); })());
  const 命 = rd('src/_tauri/src/core/cat_rename.rs'), 令 = rd('src/_tauri/src/tauri_bind/code_cmds.rs');
  台.判('整库改名那条不再只认源码格 `_shared` 一格 —— 词库层搬进去那一格也收，且 src / comp 那一栏按两格分（少收一格就是悄悄不改）',
    令.includes('底子那两格') && 令.includes('并路(&源, "_wcustom\\\\src")') && 令.includes('在底子里(&x.file)')
    && 命.includes('落点.starts_with(去尾分隔(源码那一格).as_str())'));
  const 名 = rd('src/_build/plugin-repos.mjs');
  台.判('七家路径那一张表里，这两份归到推演定制那一家（别处不许另抄一份对应表）',
    /'src\/_wcustom\/src\/sh-banks\.js', 'src\/_wcustom\/src\/sh-bank-ui\.js'/.test(名.replace(/\r?\n\s*/g, ' ')));
  台.判('宿主读词库层的四处全带"这个名字在不在"：装载器那两只手、卡片菜单那颗、为写侧栏那颗、词库没读到那张卡上那颗钮',
    /if\(typeof mkBank !== 'function'\) return null;/.test(载) && /banks:typeof Banks !== 'undefined' \? Banks : null/.test(载)
    && /typeof BankDlg !== 'undefined'/.test(rd('src/_fd/src/fd3-shell.js'))
    && /typeof BankDlg !== 'undefined'/.test(rd('src/_wnw/src/w3-shell.js'))
    && /typeof Banks !== 'undefined' && typeof mkBank === 'function'/.test(主));
  台.判('老地方那两份一份不剩（搬不是复制：留第二份真身就是两份真相）',
    !fs.existsSync(ROOT + 'src/_shared/sh-banks.js') && !fs.existsSync(ROOT + 'src/_shared/sh-bank-ui.js')
    && fs.existsSync(ROOT + 'src/_wcustom/src/sh-banks.js') && fs.existsSync(ROOT + 'src/_wcustom/src/sh-bank-ui.js'));
}

台.题('五、词库层只认宿主接口那一格四样东西（两个宿主各递一份，层本身不认宿主的名）');
{
  台.判('层里用到的宿主四样：键值存储、数据层前缀、用户手动选过的那份原文、对话框 —— 全部现问 window.TOOL_HOST，不在装载时就抓全局量',
    /const H = \(\) => window\.TOOL_HOST;/.test(层) && /H\(\)\.kv/.test(层) && /\.picked\(/.test(层)
    && /const T = H\(\);/.test(层) && /T\.dlg\.(open|close)/.test(层));
  /* 取的是那份宿主接口的正身（从前头一处提到 TOOL_HOST 的名字在说明里，拿第一处当正文就扫空了 —— 这一条量错过的） */
  const 递 = 文 => { const m = /TOOL_HOST\s*=\s*\{/.exec(文); return m ? 文.slice(m.index, m.index + 1500) : ''; };
  台.判('主程序那一份宿主接口把四样都递上了',
    /bankDir:/.test(递(主)) && /picked\w*\(/.test(递(主)) && /dlg:\{/.test(递(主)) && /get kv\(\)\{/.test(递(主)),
    '取到的是这一段：' + 递(主).slice(0, 24).replace(/\s+/g, ' '));
  台.判('为写那一份也递上了（两家各一份、词库层只有一份真身）',
    /bankDir:/.test(递(为写数据)) && /picked\(/.test(递(为写数据)) && /dlg:\{/.test(递(为写数据)) && /get kv\(\)\{/.test(递(为写数据)),
    '取到的是这一段：' + 递(为写数据).slice(0, 24).replace(/\s+/g, ' '));
  台.判('这一层里不硬写任何一家的词库名和目录名（名单、路径、底本全从包上现取）',
    !/MusicBee|便签|日程|金句/.test(层) && !/'b:[^']*'/.test(层.replace(/'b:' \+ /g, '')));
}

台.题('六、格式这一批照你 2026-10-16 那句「暂时保留」钉住（将来要加别的符号，先改这一条再改代码）');
{
  const 切文 = 切方法(层, '  split(txt){');
  const 份 = new Function('return ({' + 切文 + '})')().split;
  const 试文 = '【大类.子类】\n甲词\n乙词\n# 这行打头是井号\n; 这行打头是分号\n- 这行打头是减号\n【另一类】\n丙词\n';
  const 切 = 份(试文);
  台.判('只认一种行首：`【分类.路径】` 打头那一行才算分类（分类里带点就是层级），其余每一行都算一条词',
    切.cats.length === 2 && 切.cats[0].name === '大类.子类' && 切.cats[1].name === '另一类',
    切.cats.map(c => c.name).join(' | '));
  台.判('井号、分号、减号这三种行首都**不算**分类（你说的是暂时保留现状，这一条就是那条决定的形状）',
    切.cats.every(c => !/^[#;-]/.test(c.name)) && 切.cats[0].to - 切.cats[0].from >= 4,
    '第一类从第 ' + (切.cats[0].from + 1) + ' 行到第 ' + 切.cats[0].to + ' 行');
  台.判('认分类那一句整仓只有两处、且吃同一对符号：切片那颗（词库层）与主程序那道"像不像词库"的门槛，不各写第二份判定',
    切文.includes('/^【(.+)】$/') && 主.includes('/^【.+】$/m')
    && 主.includes('这份文件里没有【分类】打头的行，不像词库'));
  台.判('反证：把切片那句行首判据放宽到也认井号，同一份文本就多出一节分类 —— 上面那两条测的确实是这一句在管事',
    (() => {
      const 宽 = 切文.split('/^【(.+)】$/').join('/^(?:【(.+)】|#\\s*(.+))$/');
      const 切2 = new Function('return ({' + 宽 + '})')().split(试文);
      return 切2.cats.length > 切.cats.length;
    })(), '放宽之后那一节被认成了分类');
}

台.收尾();
