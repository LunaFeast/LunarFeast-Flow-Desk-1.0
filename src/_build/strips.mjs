/* ============================================================
   八项功能的「摘」：一项一份改法，打包那一趟按勾没勾现 applied 到一棵临时的树上
   ------------------------------------------------------------
     node src/_build/strips.mjs                列一遍：哪几项有改法、每份改几处、删哪几份
     node src/_build/strips.mjs --试=lyric-grid  拿现树复制一份到工区，把这一项摘一遍并出内核（验改法咬不咬得住）

   他 2026-10-13 把口径钉死过（原话记在 docs\GitHub版本资源助手.md 第十节）：
     · 「拆」**不是把他的代码删掉** —— 代码在他那一棵里永远全在，他就在这一棵上改东西；
     · 「拆」是**这一枚安装包里有没有、这一轮推不推**的区别：不勾的那一项，打包时从一棵临时的树上摘掉再打；
     · 每一项对应一条本地前瞻分支（feature/new/<那一项>），那条分支就是"这一项还在"的那一份。
   所以这一份里写的每一处改，都只在临时那一棵上发生，仓里、盘上他那一棵一个字节都不动。

   形状：每份改法 = { 改: [{ 份, 找, 换, 该 }], 删: [路径], 名单: [要从装配名单里去掉的那几行] }
   「该」是那一句话应当出现的次数 —— 对不上就整项停下来报，不许半摘（半摘出来的是坏包）。
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const 本 = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
export const 仓 = path.resolve(本, '..', '..');

/* ---------- 一、词格模式 ----------
   手法照他自己那份先例（统计那几块、＋ 那张清单都是「名单空着就什么都不摆」）：
   数据层顶上留一格开关与两张空名单，别处那一档全走这一格；那两份源码从装配名单里去掉。
   老章目录上 mode 还写着 lyric 的按正文那一档摆 —— 数据一个字节不动，勾上词格照旧全在。 */
const 开关 = `/* ---------- 词格那一档在不在（这一枚包没勾词格时，走这一格）----------
   本体在 w18-lyric.js 与 w19-cruise.js 里；这一枚没带上那两份，于是这一格全是空的 ——
   模式下拉里少一档、章与卷右键那几项巡航不摆、＋ 那张清单里那两条也不摆，界面上不留半个坏口。
   老章里 mode 还写着 lyric 的按正文那一档摆：c.lyric 与 lyrics\\ 那个明文文件一个字不动，
   勾上词格那一枚照旧全在。 */
const LYRIC_MODE = 'lyric';
const 词格档 = { 在:false, paras:c => (c && c.paras) || [] };
const 巡航菜单 = [];
const 巡航拾取 = [];

function uid(p){`;

export const 改法 = {
  'lyric-grid': {
    中文: '词格模式',
    改: [
      { 份: 'src/_wnw/src/w7-data.js', 找: 'function uid(p){', 换: 开关, 该: 1 },
      { 份: 'src/_wnw/src/w7-data.js',
        找: 'const body = (c.mode === LYRIC_MODE && c.lyric) ? lyricParas(c.lyric) : c.paras;',
        换: 'const body = (词格档.在 && c.mode === LYRIC_MODE && c.lyric) ? 词格档.paras(c) : c.paras;', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: 'if(this.c.mode === LYRIC_MODE && this.grid) return this.grid.pourIn(text);',
        换: 'if(词格档.在 && this.c.mode === LYRIC_MODE && this.grid) return this.grid.pourIn(text);', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: "if(this.c.mode === 'note' || this.c.mode === LYRIC_MODE) return;",
        换: "if(this.c.mode === 'note' || (词格档.在 && this.c.mode === LYRIC_MODE)) return;", 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: "const MODE_IT = [['write', '写作模式'], ['note', '笔记 / 富文本模式'], [LYRIC_MODE, '词格模式']];",
        换: "const MODE_IT = [['write', '写作模式'], ['note', '笔记 / 富文本模式']].concat(词格档.在 ? [[LYRIC_MODE, '词格模式']] : []);", 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: 'if(c.mode !== LYRIC_MODE){ top.appendChild(this.toolbar());',
        换: 'if(!(词格档.在 && c.mode === LYRIC_MODE)){ top.appendChild(this.toolbar());', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js', 找: 'if(c.mode === LYRIC_MODE){',
        换: 'if(词格档.在 && c.mode === LYRIC_MODE){', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js', 找: 'const lyric = !!this.c && this.c.mode === LYRIC_MODE;',
        换: 'const lyric = !!this.c && 词格档.在 && this.c.mode === LYRIC_MODE;', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js', 找: 'if(!c || c.mode === LYRIC_MODE) return;',
        换: 'if(!c || (词格档.在 && c.mode === LYRIC_MODE)) return;', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js', 找: 'if(this.c.mode === LYRIC_MODE && this.grid) await this.grid.persist();',
        换: 'if(词格档.在 && this.c.mode === LYRIC_MODE && this.grid) await this.grid.persist();', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js', 找: 'if(c.mode === LYRIC_MODE && this.grid){ this.grid.foot(msg); return; }',
        换: 'if(词格档.在 && c.mode === LYRIC_MODE && this.grid){ this.grid.foot(msg); return; }', 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: "const CH_MODE_ICO = { write:['pencil', '写作模式'], note:['list', '笔记 / 富文本模式'], lyric:['music', '词格模式'] };",
        换: "const CH_MODE_ICO = { write:['pencil', '写作模式'], note:['list', '笔记 / 富文本模式'] };\n/* 词格那一档在的时候，w18 自己把 lyric 那一项添回来 */\nif(词格档.在) CH_MODE_ICO[LYRIC_MODE] = ['music', '词格模式'];", 该: 1 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: "        cruiseReady(v.id) ? { label:'词巡航（这一卷的词格闪卡）', fn:() => Desk.addTab('cruise', v.id) } : null,",
        换: '        ...巡航菜单,', 该: 2 },
      { 份: 'src/_wnw/src/w8-write.js',
        找: "        cruiseBookReady() ? { label:'书巡航（整本书的词格闪卡）',\n          title:'不分卷：这本书里哪些章是词格模式，就收哪些章的行；卷巡航只吃整卷都是词格的那一卷，这一条放宽到一章',\n          fn:() => Desk.addTab('cruise', CRUISE_BOOK) } : null,",
        换: '        ...巡航菜单,', 该: 1 },
      { 份: 'src/_wnw/src/w3-shell.js',
        找: "        ...(cruiseAnyVol() ? [{ kind:'cruise', ref:() => cruiseAnyVol(), label:'词巡航（整卷词格闪卡）' }] : []),\n        /* 书巡航（外26 追加）跨卷：这本书里只要有一章是词格就摆这一条，ref 递那枚哨兵 */\n        ...(cruiseBookReady() ? [{ kind:'cruise', ref:() => CRUISE_BOOK, label:'书巡航（整本书词格闪卡）' }] : [])",
        换: '        ...巡航拾取   /* 词巡航与书巡航那两条：勾上词格的那一枚由 w19 登记进来，没勾就一条都不摆 */', 该: 1 },
      { 份: 'src/_wnw/build-kernel.mjs',
        找: "'w17-tags.js', 'w18-lyric.js',\n  'w19-cruise.js', 'w20-keystroke.js',",
        换: "'w17-tags.js',\n  'w20-keystroke.js',", 该: 1 },
    ],
    删: ['src/_wnw/src/w18-lyric.js', 'src/_wnw/src/w19-cruise.js'],
  },
};

export const 摘过哪几项 = () => Object.keys(改法);
export const 有改法 = id => !!改法[id];

/* 把一项摘到那一棵上：先整份数一遍"该几处"，对不上就抛（半摘出来的是坏包，不如不打） */
export function 摘到树上(那一棵, id) {
  const 份 = 改法[id];
  if (!份) throw new Error('这一项没有登记改法：' + id);
  const 动过 = new Map();
  for (const 条 of 份.改) {
    const 全 = path.join(那一棵, 条.份);
    let 文 = 动过.has(条.份) ? 动过.get(条.份) : fs.readFileSync(全, 'utf8');
    const 次 = 文.split(条.找).length - 1;
    if (次 !== 条.该) throw new Error('「' + 份.中文 + '」这一处对不上：' + 条.份 + ' 里那句话出现 ' + 次 + ' 处，登记的是 ' + 条.该 +
      ' 处 —— 源码改了形，这一项的改法得跟着改（半摘不打）。\n  那句：' + 条.找.slice(0, 70));
    文 = 文.split(条.找).join(条.换);
    动过.set(条.份, 文);
  }
  for (const [份名, 文] of 动过) fs.writeFileSync(path.join(那一棵, 份名), 文, 'utf8');
  for (const 份名 of (份.删 || [])) {
    const 全 = path.join(那一棵, 份名);
    if (fs.existsSync(全)) fs.rmSync(全);
  }
  return { 中文: 份.中文, 改了: 动过.size + ' 份 · ' + 份.改.length + ' 处', 删了: (份.删 || []).length + ' 份' };
}

/* 打包那一趟喊这一颗：没勾的、且登记了改法的，一项一项摘到那一棵上 */
export function 摘掉没勾的(那一棵, 没勾) {
  const 出 = [];
  for (const id of (没勾 || [])) {
    if (!有改法(id)) continue;
    出.push({ id, ...摘到树上(那一棵, id) });
  }
  return 出;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\//g, path.sep)) {
  const 试 = process.argv.find(a => a.startsWith('--试='));
  if (试) {
    const id = 试.slice(4);
    const 去 = path.join(os.tmpdir(), 'strip-试-' + id);
    fs.rmSync(去, { recursive: true, force: true });
    fs.cpSync(仓, 去, { recursive: true, filter: p => !/node_modules|\\dist\\|\\pages\\|\\\.git$/.test(p.replace(/\//g, '\\')) });
    const 报 = 摘到树上(去, id);
    execFileSync(process.execPath, ['src/_wnw/build-kernel.mjs'], { cwd: 去, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const 大 = fs.statSync(path.join(去, 'src/_wnw/wnw-kernel.js')).size;
    console.log('摘完 ' + JSON.stringify(报) + ' · 那颗内核 ' + 大 + ' 字节（现树 ' + fs.statSync(path.join(仓, 'src/_wnw/wnw-kernel.js')).size + '）');
    fs.rmSync(去, { recursive: true, force: true });
  } else {
    console.log('八项里登记了改法的：' + 摘过哪几项().join('、') + '（其余几项还没写改法）');
    for (const id of 摘过哪几项()) console.log('  ' + 改法[id].中文 + '：改 ' + 改法[id].改.length + ' 处、删 ' + (改法[id].删 || []).length + ' 份');
  }
}
