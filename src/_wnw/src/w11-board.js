/* ============================================================
   WNW 看板 v0.5
   一套板子两种读法，轨道分家：
     事件线 —— 事件轨，一条轨一条长带，带内按事件序号（1 / 1.2 / 1.2.3）排成组织结构图
     时间线 —— 时间轨，一条轨一行，每条轨自带一套时间读法（拟真 / 架空 / 原点）
   序号自动画父子直角线，手画的上级/同级那些连线各是各的，两套同时存在。
   节点：底色挑过就以挑的为准，没挑过按所在轨自动取一份浅底（同轨同色、轨与轨错开一档）；
        描边单独一行色点；序号、评级只用来排序不外显；单击选中、双击改；
        可以挂本地图片（只记路径不存文件），图片多大节点就多高，这一行的间距自动加高；
        单击选中几个 → 右键成组，组是一整块实色底、无边框，整组一起拖，不支持嵌套；
        多选另两条：Shift 从锚点那一枚按「这一屏排出来的顺序」连一片（不是 id 序），Ctrl+A 捞满这一屏、Esc 放开，
        挑中两枚以上右键就是「批量删除」，一次确认逐枚删（外15 第 6 条）。
        左栏那份「看板」清单和右栏窄了的精简版一列是同一种条子的另两种长相，这一套交互一样不少。
   ============================================================ */

/* ---------- 事件序号：点号分层，不按小数读 ---------- */
/* 拖节点、拖组、拖轨道行高、拖带缝这四对监听都是「按下挂、抬起摘」的一对，
   从前挂在 window 上，现在只挂在为写自己那一层容器上（按下那个条子有指针捕获，事件照样落进容器）。 */
function wOn(mv, up){
  const b = wnwRoot(); if(!b) return;
  b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
}
function wUn(mv, up){
  const b = wnwRoot(); if(!b) return;
  b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
}
function seqParts(s){
  const m = /^(\d+(?:\.\d+)*)$/.exec(String(s || '').trim());
  return m ? m[1].split('.').map(Number) : null;
}
function cmpSeq(a, z){
  const p = a.p || a, q = z.p || z;
  for(let i = 0; i < Math.max(p.length, q.length); i++){
    const x = p[i], y = q[i];
    if(x === undefined) return -1;
    if(y === undefined) return 1;
    if(x !== y) return x - y;
  }
  return 0;
}
function seqCmp(x, y){ return cmpSeq({ p: seqParts(x) || [1e9] }, { p: seqParts(y) || [1e9] }); }

/* ---------- 三套时间读法：都从一行文字里取出一个能排序的秒数，取不出给 null ---------- */
const T_UNIT = { '秒':1, '分钟':60, '分':60, '刻':900, '小时':3600, '时':3600, '天':86400, '日':86400,
  '周':604800, '星期':604800, '月':2592000, '年':31536000 };
const CLOCK = /(?:(凌晨|早上|上午|中午|下午|晚上|傍晚)\s*)?(\d{1,2})\s*[:：时点]\s*(\d{1,2})(?:\s*[:：分]\s*(\d{1,2})\s*秒?)?/;
function clockSec(str){
  const m = CLOCK.exec(str || '');
  if(!m) return 0;
  let hh = +m[2];
  const w = m[1];
  if((w === '下午' || w === '晚上' || w === '傍晚') && hh < 12) hh += 12;
  if(w === '中午' && hh < 11) hh += 12;
  if(hh > 23 || +m[3] > 59 || (m[4] || 0) > 59) return NaN;
  return hh * 3600 + (+m[3]) * 60 + (+(m[4] || 0));
}
/* 拟真：真实历法，2月30日这种假日期算不通过。返回一个能排序的秒数 */
function realTime(s){
  const str = String(s || '').trim();
  const m = /(\d{3,5})\s*[年\-/.]\s*(\d{1,2})\s*[月\-/.]\s*(\d{1,2})\s*日?/.exec(str);
  if(!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if(mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const sec = clockSec(str.slice((m.index || 0) + m[0].length));
  if(isNaN(sec)) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if(dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.getTime() / 1000 + sec;
}
function normCal(cal){
  const c = cal || {};
  const months = Math.max(1, Math.min(48, Math.round(+c.months || 12)));
  const raw = String(c.days || '30').split(/[,，、\s]+/).filter(x => x).map(x => Math.max(1, Math.min(99, Math.round(+x) || 30)));
  const days = [];
  for(let i = 0; i < months; i++) days.push(raw[Math.min(i, raw.length - 1)] || 30);
  return { months, days };
}
/* 图6：架空那一档三种写法都认 —— 只到年（45年）、到月（45年3月）、年月日俱全（45年3月12日）。
   交回 { y, mo, d, 档 }，mo / d 在只到年 / 到月时是 1（当成月初），档 记的是这一句停在哪儿一档；读不出交 null。
   到月 / 到年那两档必须带「月」「年」这个字，光秃秃两个数（45.5）不猜 —— 那是小数，不是日期。 */
const FAKE_D = /(\d+)\s*[年\-/.]\s*(\d{1,2})\s*[月\-/.]\s*(\d{1,2})\s*[日号]?/;
const FAKE_M = /(\d+)\s*年\s*(\d{1,2})\s*月/;
const FAKE_Y = /(\d+)\s*年(?!\s*\d)/;
function fakeParts(s){
  const str = String(s || '').trim();
  let m = FAKE_D.exec(str);
  if(m) return { y:+m[1], mo:+m[2], d:+m[3], 档:'日', 尾:str.slice((m.index || 0) + m[0].length) };
  m = FAKE_M.exec(str);
  if(m) return { y:+m[1], mo:+m[2], d:1, 档:'月', 尾:'' };
  m = FAKE_Y.exec(str);
  if(m) return { y:+m[1], mo:1, d:1, 档:'年', 尾:'' };
  return null;
}
/* 架空：也写 x年x月x日，但一年几个月、每月几天由这条轨的历法说了算。
   端 = 'end' 时按这一档的末尾算（只到年就是一年的最后一天）—— 卡片那个「结束时间」吃这一口，
   不然「结束 = 45年」会变成 45 年 1 月 1 日，把整年都关在外面。 */
function fakeTime(s, cal, 端){
  const p = fakeParts(s);
  if(!p) return null;
  const c = normCal(cal);
  if(p.y < 1 || p.mo < 1 || p.mo > c.months || p.d < 1 || p.d > c.days[p.mo - 1]) return null;
  let { mo, d } = p;
  if(端 === 'end'){ if(p.档 === '年') mo = c.months; if(p.档 !== '日') d = c.days[mo - 1]; }
  const sec = p.档 === '日' ? clockSec(p.尾) : 0;
  if(isNaN(sec)) return null;
  let yearDays = 0; for(const x of c.days) yearDays += x;
  let before = 0; for(let i = 0; i < mo - 1; i++) before += c.days[i];
  return ((p.y - 1) * yearDays + before + (d - 1)) * 86400 + sec;
}
/* 原点：没有真实年份，只写离零点多久 —— 3天前 / 2小时后，往前是负数 */
function originTime(s){
  const str = String(s || '').trim();
  if(!str) return null;
  let total = 0, hit = false;
  const re = /(\d+(?:\.\d+)?)\s*(秒|分钟|分|刻|小时|时|天|日|周|星期|月|年)\s*(前|后)?/g;
  let m;
  while((m = re.exec(str))){ hit = true; total += parseFloat(m[1]) * T_UNIT[m[2]] * (m[3] === '前' ? -1 : 1); }
  if(hit) return total;
  const n = /^(-?)(\d+(?:\.\d+)?)$/.exec(str);
  return n ? (n[1] === '-' ? -1 : 1) * parseFloat(n[2]) * 86400 : null;
}
const T_MODES = [ ['real', '拟真'], ['fake', '架空'], ['origin', '原点'] ];
/* 连线的色点就摆预设的那几个色点，挑中的写进 lk.c 盖掉预设色 */
const LINK_SLOTS = REL_KINDS.map(r => r.c);
function timeVal(tr, t, 端){
  if(tr && tr.mode === 'fake') return fakeTime(t, tr.cal, 端);
  if(tr && tr.mode === 'origin') return originTime(t);
  return realTime(t);
}
function modeName(m){ const x = T_MODES.find(x => x[0] === m); return x ? x[1] : '拟真'; }
function tTip(tr){
  return tr.mode === 'fake' ? '架空历法：一年几个月、每月几天在这条轨的历法里定；写 3年、3年5月、3年5月12日 三种都认'
    : tr.mode === 'origin' ? '原点：写离零点多久，比如 3天前、2小时后'
    : '拟真：写 2026-03-05 14:30，按真实历法校验';
}
/* 图6：只到年 / 到月这两种，同一条轨上撞了同一个年就得提醒 —— 两件事都写「45年」，谁先谁后读不出来。
   自己 = 这一句拆出来的那一档（fakeParts 交回的），句 = 同一条轨上别的那些时间写法（自己那一条 caller 已经剔掉）。
   交回要提醒的那句话，不撞交空。举例那一句照这一条自己写的年、月往下补，不给一个不相干的数。 */
function 同年撞(自己, 句){
  const p = 自己 || {};
  if(!p.档 || p.档 === '日' || !p.y) return '';
  const 撞 = (句 || []).map(x => fakeParts(x)).filter(Boolean).filter(z => z.y === p.y && z.档 !== '日');
  if(!撞.length) return '';
  return p.y + '年这条轨上已经有 ' + 撞.length + ' 件事也只写到' + 撞[0].档 + '：只到' + p.档
    + '排不出谁先谁后。补上' + (p.档 === '年' ? '月份（写成 ' + p.y + '年3月）或日月'
      : '日子（写成 ' + p.y + '年' + p.mo + '月12日）') + '就分得开。';
}
/* 图17：卡片上写的时间和看板上写的时间各存各的，谁都不替谁写，也不去猜「宝物 5 年离开 a 地 ⇒ 转移就发生在 5 年」
   —— 这种推断读的是故事，词库卡不死。能做的只有一件事：你往哪一格填时间，就把对面那一处已经写下的时间原样列出来给你看。
   列的是整本书的，不挑、不筛、不要求你先把卡片关联到节点上；以内以外都算对，认不认得出也不归这里管。
   这两颗只管取数，摆哪儿、什么时候收由 TimeHint 那颗管。 */
/* 卡片这边：这本书里所有关联行上写了起始 / 结束时间的那些 */
async function 卡片写过的时间(书){
  const 出 = [], 见 = new Set();
  for(const r of await linkRows(书 || '__ALL__')){
    if(!String(r.t0 || '').trim() && !String(r.t1 || '').trim()) continue;
    const 对 = [r.from, r.to].sort().join('>');
    const 键 = 对 + '|' + (r.t0 || '') + '|' + (r.t1 || '') + '|' + (r.rel || '') + '|' + (r.way || '');
    if(见.has(键)) continue;
    见.add(键);
    出.push({ 谁: r.fromTitle + ' → ' + CardNames.get(r.to), 话: linkDesc(r) });
  }
  return 出;
}
/* 看板这边：这本书里所有看板上写了时间的节点（一块板读不出来就跳过，不拖垮整趟） */
async function 看板写过的时间(书){
  const 出 = [];
  for(const m of await Boards.all()){
    if(书 && m.bookId && m.bookId !== 书) continue;
    const b = await Boards.get(m.id);
    if(!b) continue;
    for(const n of (b.nodes || [])){
      const s = String(n.t || '').trim();
      if(!s) continue;
      const tr = (b.ttracks || []).find(x => x.id === n.tt) || {};
      出.push({ 谁: (m.title || '看板') + ' › ' + (n.label || '这个节点'),
        话: s + '（' + modeName(tr.mode || 'real') + '）' });
    }
  }
  return 出;
}
function num(v, d){ return typeof v === 'number' && isFinite(v) ? v : d; }
/* 评级：纯数字，填了才算。同一轨里把用到的评级从小到大排，小的在上、大的在下 */
function rated(v){ return v !== '' && v != null && isFinite(+v); }
function rowRank(vals){
  const u = [...new Set(vals.filter(rated).map(v => +v))].sort((a, b) => a - b);
  return (v, base) => rated(v) ? Math.max(0, u.indexOf(+v)) : base;
}
/* 图18：一条手画连线的画法。两头几乎上下对齐时走直线 —— 从前不管什么位置都画同一张「水平中点」的
   三次曲线，上下排的两个节点被它挤成一条细弯，弯上再压一个字，两头都难看。
   交回这一条的 d 和字样该摆在哪（x / y / 锚），画和量都走这一颗。 */
function linkGeom(x1, y1, x2, y2){
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  if(Math.abs(x2 - x1) < 24)
    return { d:'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, x:mx + 7, y:my + 4, 锚:'start' };
  return { d:'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2,
    x:mx, y:my - 6, 锚:'middle' };
}
function relColor(lk){ return lk.c || (REL_KINDS.find(x => x.k === lk.kind) || {}).c || 'var(--text-light)'; }
/* 时间线一行的厚度；NH 是没图片时的最矮节点。
   事件线是往右下展开的阶梯：一个节点占一行（ROWV 是行的最薄厚度），每深一级往右错 INDX */
const BD = { NW:168, NH:62, GAPX:46, PADX:26, PADY:54, ROWH:108, LEVELH:104, TOP:6, ROWV:88, INDX:92, TRUNK:18 };
/* 一组浅底：组底深一档、节点底浅一档，
   同一条轨的节点压在自己那块组底上才分得开。全是实色，不掺透明度；
   从标记色和卡片底现算，换标记色或换肤时两档一起跟着走。 */
/* 自动取色吃的是全局那一串标记色（外13-N）：取值串里是 var(--mark-N …)，
   用户在 设置·外观 里换那个时这里跟着换；一串都还没定过时退回配色的强调位。
   个数在 paint 那一趟现问（这一层闭包跑在宿主开机之前，那时标记色还没认下来）。 */
const slotTint = (i, p) => 'color-mix(in srgb, ' + markVar(i) + ' ' + p + '%, var(--card-bg))';
const GROUP_TINT = 'color-mix(in srgb, ' + markVar(0) + ' 22%, var(--card-bg))';
function nodeTints(){
  const n = typeof markCount === 'function' ? markCount() : 5;
  return Array.from({ length:n }, (x, i) => slotTint(i, 14));
}
/* 底色串里带着 var() / color-mix()，JS 侧算不出数：借一个公用探针把它铺出来再读回实际色。
   同一个串只读一次；换肤之后槽位色的实际亮度会变，所以那一趟要清掉重读。
   判深和 Theme.read 认明暗一个口径：亮度不到一半就算深底。拿不到数就返回 null，让字色跟主题走。 */
const CSS_LUM = new Map();
let cssProbe = null;
function bgLum(css){
  if(CSS_LUM.has(css)) return CSS_LUM.get(css);
  let v = null;
  try{
    if(!cssProbe){
      cssProbe = h('div', { style:'position:absolute;left:-40px;top:-40px;width:1px;height:1px;pointer-events:none' });
      /* 探针挂在容器上：它量的是「这一串底色铺出来实际是什么色」，挂在哪一层就得吃哪一层的变量，
         宿主那套和为写那一层的色号取值不一样，挂错地方翻出来的字色就不对。 */
      wnwRoot().appendChild(cssProbe);
    }
    cssProbe.style.background = '';
    cssProbe.style.background = css;
    /* 这一串压根铺不上色（引擎不认 color-mix 这类写法）就别瞎翻字色，交回主题 */
    const c = cssProbe.style.background ? parseHex(getComputedStyle(cssProbe).backgroundColor) : null;
    if(c) v = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }catch(e){ /* 探针挂不上（还没文档可挂）就算不出来，这一格先不翻字色 */ }
  CSS_LUM.set(css, v);
  return v;
}
/* 节点的两行色点：「填充」一行、「边框」一行，各一整串标记色 + 一个「无」。点上的都是实色，没有淡色这一档。
   填充的「无」= 没挑过色，画的时候按所在轨自动取一份浅底；边框的「无」= 回到卡片描边。
   组的那一行底色也用它，「无」在那儿是回到默认的浅色实底 —— 两种「无」说法不一样，把话递给调用方。
   从前这里摊的是配色里那五个强调位（写死五个）；现在摊的是用户自己定的那一串标记色，三个到二十个都照实摆。
   存进存档的是「第几个」那一句取值串，所以从前钉过 var(--slot-N) 的老节点照 markIndexOf 认得出亮哪一个。 */
function dotRow(lab, get, set, none){
  const cur = markIndexOf(get());
  const list = typeof markSlots === 'function' ? markSlots() : COLOR_SLOTS;
  const row = h('div', { class:'wnw-row' }, [h('span', { class:'wnw-hint' }, lab)]
    .concat(list.map((c, i) => h('button', { class:'wnw-dot' + (cur === i ? ' on' : ''),
      style:'background:' + c, 'aria-pressed':cur === i ? 'true' : 'false',
      title:'第 ' + (i + 1) + ' 个标记色 · 点一下选上，再点一下回到无',
      onclick:() => set(cur === i ? '' : c) }))));
  row.appendChild(h('button', { class:'wnw-btn mini' + (get() === '' ? ' on' : ''), title:none || '这一样跟主题走',
    onclick:() => set('') }, '无'));
  return row;
}
/* 图片只认绝对路径，不往项目里存文件：Flow-Desk 程序里由主进程读盘缩好；
   没有主进程那一条通道时，只能拿 file:/// 拼一个地址交给页面自己试。 */
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)\??$/i;
function fileUrl(p){
  const s = String(p || '').replace(/\\/g, '/');
  return (/^[A-Za-z]:/.test(s) ? 'file:///' : 'file://') + s.replace(/^\/+/, '');
}
function baseName(p){ const s = String(p || '').replace(/\\/g, '/'); return s.slice(s.lastIndexOf('/') + 1); }

/* ---------- 多选这一档：Ctrl+A 归哪一张看板列表（外15 第 6 条）----------
   中栏一格加上右栏几块停靠，能同时摆着好几张看板的列表（一块板的画布、一块板的精简版一列、
   左栏那块「看板」清单），键盘上没有「焦点在这一张」这件事（点列表不改焦点），
   所以按下 Ctrl+A 的那一刻问 pickAsk()：指针最后在哪一张的条子上按下过就归它，
   那张已经从页面上摘掉了就当没人接 —— 绝不肯「找不到主人就每一张都全选一遍」，
   那是一下子选中四屏根本没在看的条目。名单里只记还挂着的实例，每回按之前先把掉出去的擦掉。 */
const BdPick = [];
function bdKeys(){
  /* 只绑一次：每挂上一张列表就往 document 上挂一枚的话，按一次 Ctrl+A 会全选好几遍。
     但认的不是「我绑过没有」—— 整副骨架拆掉重挂那一趟（wnwStop → wnwStart）里 wnwOffAll 会把这些
     监听一并摘走，光记着绑过就成了哑键。所以问的是「那一枚还挂在账上没有」。 */
  if(bdKeys.fn && WNW_ON.some(it => it[2] === bdKeys.fn)) return;
  bdKeys.fn = wnwOn(document, 'keydown', ev => {
    if(ev.isComposing || ev.keyCode === 229) return;
    /* 浮层和右键菜单开着的时候不抢键盘：那两头各有自己的关闭键 */
    if(Overlay.node || Menu.node) return;
    const k = String(ev.key || '').toLowerCase();
    if(k !== 'a' && k !== 'escape') return;
    /* 光标在板名那一格、节点编辑框、任何一个输入框里：Ctrl+A 是全选文字、Esc 是输入法自己的事 */
    if(ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable]')) return;
    for(let i = BdPick.length - 1; i >= 0; i--) if(!BdPick[i].pickEl || !BdPick[i].pickEl.isConnected) BdPick.splice(i, 1);
    const who = pickAsk();
    if(!who) return;
    for(const p of BdPick){
      if(p.pickEl !== who) continue;
      if(k === 'escape'){ p.pickClear(); return; }
      /* Alt / Shift 搭着的那一下各有别的意思，只认光板 Ctrl（Cmd 同） */
      if(!(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey) return;
      ev.preventDefault();
      p.pickAll();
      return;
    }
  });
}

class BoardView{
  constructor(host, ctx){
    this.host = host; this.ctx = ctx;
    this.b = null; this.link = null; this.linkMode = false;
    /* sel：单击选中的节点（多选靠 Ctrl，成组用）；thumbs：这一趟读过的图片缩略，不落盘 */
    this.sel = new Set(); this.thumbs = new Map(); this.peeking = new Set();
    this.nodeEl = new Map(); this.gEl = new Map();
    /* 锚点 = 最近一次普通点击或 Ctrl 点击的那一枚，shift 从它连一片；
       order 是这一趟屏上真排出来的节点顺序（时间线按时间、事件线按序号树，都不是 id 序）。
       rowEl 是精简版那一列的行（画布用 nodeEl，两种长相各记一份，选中样式都靠 markSel 改）。 */
    this.anchor = null; this.order = []; this.rowEl = new Map(); this.pickEl = null;
  }
  async boot(ref){
    const list = await Boards.forBook(Work.book.id);
    const id = ref || (list[0] && list[0].id) || null;
    this.b = id ? await Boards.get(id) : await Boards.create(Work.book.title + ' · 看板', Work.book.id, 'event');
    if(!this.b){ this.host.appendChild(h('div', { class:'wnw-empty' }, '这块看板不存在了')); return; }
    if(this.ctx.on){
      this.ctx.on('board:focus', () => this.centerOnLast());
      /* 设定卡改了名，节点上那一行卡名得跟着改：一次同步，不留轮询 */
      this.ctx.on('desk:cards', async () => { await this.syncNames(); if(this.cv) this.paint(); });
      /* 换肤：槽位色的实际亮度跟着变，深底浅底翻过来的字色要重判一遍 */
      this.ctx.on('look', () => { CSS_LUM.clear(); if(this.cv) this.paint(); });
      /* #252 除根：同一块板可以在两处都开着（右栏精简版 + 放大标签），谁改了数据都只画了自己那一份，
         另一份就留着已经删掉的节点 —— 精简版里它正是那个撤不掉的白点。
         600 毫秒存盘广播这一趟本来就有，以前只有左栏列表听，板视图从不回头。
         现在每份 BoardView 都听：不是自己发起的那一趟，就重新读盘、整幅重画。 */
      this.ctx.on('desk:boards', () => {
        if(this.selfSync){ this.selfSync = false; return; }
        this.pullSync(0);
      });
    }
    await this.syncNames();
    this.draw();
    Desk.noteRecent('board', this.b.id, this.b.title);
  }
  /* 卡 id → 卡名：节点上要显示关联的是哪张卡，只认这一份索引，不逐张去读文件 */
  async syncNames(){
    try{ this.cname = new Map(((await Cards.all()) || []).map(m => [m.id, m.title])); }
    catch(e){ this.cname = this.cname || new Map(); }
  }
  cardName(id){ return (this.cname && this.cname.get(id)) || ''; }
  dirty(){
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => { await Boards.put(this.b); this.selfSync = true; Bus.emit('desk:boards'); }, 600);
  }
  /* #252：另一份实例存了盘 → 这一份重新读盘、整幅重画，白点就是这么除根的。
     焦点还落在这一份的编辑框里（正在打板名、节点名）就先不打断：过一会儿再回来对一遍。 */
  async pullSync(tryN){
    if(this.host.contains(document.activeElement)){
      if(tryN < 30) setTimeout(() => this.pullSync(tryN + 1), 600);
      return;
    }
    try{
      const fresh = await Boards.get(this.b.id);
      if(!fresh) return;
      this.b = fresh;
      await this.syncNames();
      this.draw();
    }catch(e){}
  }
  tracks(){ const b = this.b; return b.mode === 'time' ? b.ttracks : b.etracks; }
  /* 精简版（右栏窄的时候）：不画板，只按当前读法的轨道列一遍 */
  draw(){
    this.host.innerHTML = '';
    this.sel.clear(); this.anchor = null;
    if(this.ctx.compact){ this.host.appendChild(this.ownPick(this.compactBox())); return; }
    const b = this.b;
    const top = h('div', { class:'wnw-doc-top' });
    const name = h('input', { class:'wnw-input wnw-card-name', value:b.title });
    name.addEventListener('input', () => { b.title = name.value.trim() || '看板'; this.dirty(); this.ctx.setTitle && this.ctx.setTitle(b.title); });
    const seg = h('div', { class:'wnw-seg' });
    for(const [k, lab, tip] of [['event', '事件线', '谁和谁有关系：一条事件轨一条长带，带内按事件序号排'], ['time', '时间线', '什么时候发生：按时间轨分行，行内按时间排']]){
      const btn = h('button', { class:b.mode === k ? 'on' : '', title:tip }, lab);
      btn.addEventListener('click', () => { b.mode = k; this.link = null; this.dirty(); this.draw(); });
      seg.appendChild(btn);
    }
    top.appendChild(h('div', { class:'wnw-row' }, [name, h('span', { style:'flex:1' }), seg]));
    top.appendChild(h('div', { class:'wnw-row', style:'margin-top:6px' }, [
      h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '节点', onclick:() => this.addDlg() }),
      h('button', { class:'wnw-btn mini w-txt', title:'从卡片取节点', html:icoMarkup('imp') + '卡片', onclick:() => this.pickCard() }),
      /* 这一枚要留一份引用：连线模式开没开，它的亮色就是唯一的脸面，可它是在 draw 里现造的，
         从前 toggleLink 只重画了板、没重画这一排，按下去那句提示都出来了、钮还是暗的 */
      this.relBtn = h('button', { class:'wnw-btn mini w-txt' + (this.linkMode ? ' on' : ''), title:'连线 · 三张关联图都在这儿下拉',
        onclick:ev => this.relMenu(ev.currentTarget), html:icoMarkup('rel') + '关联' }),
      h('button', { class:'wnw-btn mini', onclick:() => this.trackDlg() }, (b.mode === 'time' ? '时间轨 ' : '事件轨 ') + this.tracks().length),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', onclick:() => this.zoom(-.1), html:icoMarkup('minus') }),
      h('button', { class:'wnw-btn mini', onclick:() => this.zoom(.1), html:icoMarkup('plus') }),
      h('button', { class:'wnw-btn mini w-txt', title:b.mode === 'time' ? '把拖散的框收回时间线原位' : '按事件序号重摆一次', onclick:() => this.autoLayout(), html:icoMarkup('sort') + '排位置' }),
      h('button', { class:'wnw-btn mini', title:'导出成文字', onclick:() => this.exportDlg(), html:icoMarkup('exp') })
    ]));
    this.host.appendChild(top);
    this.scroller = h('div', { class:'wnw-bd-scroll' });
    this.host.appendChild(this.scroller);
    this.ownPick(this.scroller);
    this.paint();
  }
  compactBox(){
    const b = this.b;
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { class:'wnw-row' }, [h('b', {}, b.title), h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', onclick:() => Desk.addTab('board', b.id) }, '放大')]));
    /* 这一列的行按摆出来的顺序记一份，末尾一起交给 showing —— 它是 Ctrl+A 和 shift 连选的范围 */
    this.rowEl = new Map();
    const ord = [];
    for(const tr of this.tracks()){
      const ns = this.bandNodes(tr.id);
      box.appendChild(h('div', { class:'wnw-mini-h' }, tr.name + ' · ' + ns.length));
      /* 序号、评级只用来排序，这里也不外显 */
      for(const n of ns) box.appendChild(this.ciRow(n, ord));
    }
    if(b.mode === 'event'){
      const un = b.nodes.filter(n => !seqParts(n.seq));
      if(un.length){
        box.appendChild(h('div', { class:'wnw-mini-h' }, '未编号 · ' + un.length));
        for(const n of un) box.appendChild(this.ciRow(n, ord));
      }
    }
    if(!b.nodes.length) box.appendChild(h('div', { class:'wnw-hint' }, '空的，放大开画'));
    this.showing(ord);
    return box;
  }
  /* 精简版一行 = 画布上那一枚方块的同一种条子：交互一套都不落。
     从前单击这一行就把整块板开成一页（想挑第二条就得先被它跳走一次），现在单击只换选中集，
     双击做的才是从前那一下「放大开板」。 */
  ciRow(n, ord){
    ord.push(n.id);
    const el = h('div', { class:'wnw-ci' + (this.sel.has(n.id) ? ' sel' : ''),
      onclick:ev => this.choose(n, ev), ondblclick:ev => { ev.stopPropagation(); Desk.addTab('board', this.b.id); },
      oncontextmenu:ev => { ev.preventDefault(); ev.stopPropagation(); this.nodeMenu(ev, n); } }, [
      h('i', { class:'d', style:'background:' + (n.fill || n.line || 'var(--text-light)') }), h('span', { class:'nm' }, n.label),
      n.t ? h('span', { class:'wnw-hint' }, n.t) : null]);
    this.rowEl.set(n.id, el);
    return el;
  }
  /* 这一张列表登记给 Ctrl+A：一块板可以同时开着几份（标签一份、右栏精简版一份），
     指针在哪一份的条子上按下过，那一份就是主人。容器每重画一次是个新节点，所以先认一下再挂。 */
  ownPick(el){
    if(this.pickEl !== el){
      this.pickEl = pickBind(el);
      if(!BdPick.includes(this)) BdPick.push(this);
      bdKeys();
    }
    return el;
  }
  /* 全选这一趟屏上真摆出来的节点（不是 b.nodes 的全部：轨道筛掉的不在 order 里） */
  pickAll(){
    this.sel = new Set(this.order);
    this.anchor = this.order[this.order.length - 1] || null;
    this.markSel();
  }
  pickClear(){ if(!this.sel.size) return; this.sel.clear(); this.anchor = null; this.markSel(); }
  /* 摆出来的这些就是范围：换了读法、改了轨道、删了节点，从这一趟里掉出去的跟着从手里一起清掉，
     不然下一刀批量删除删到看不见的节点上。先清再补一遍样式，重画出来的和手里的才对得上。 */
  showing(ord){
    this.order = ord;
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    this.markSel();
  }
  toggleLink(){
    this.linkMode = !this.linkMode;
    this.link = null;
    if(this.relBtn) this.relBtn.classList.toggle('on', this.linkMode);
    this.paint();
    toast(this.linkMode ? '连线模式：点两个节点' : '连线模式已关');
  }
  /* 关联这一个按钮：连线和关联图都从这儿下拉，不用再跑到别处找入口
     （关联图那一头列的是四个主视角，进去之后在这张图顶上收关系视角 —— 外32 图7） */
  relMenu(el){
    Menu.under(el, [
      { label:this.linkMode ? '关掉连线模式' : '连线：点两个节点连一条线', on:this.linkMode, fn:() => this.toggleLink() },
      { sep:1 }
    ].concat(REL_PICKS.map(p => ({ label:p.label, fn:() => Desk.addTab(p.kind, p.ref(), null) }))));
  }
  zoom(dz){
    this.b.zoom = Math.max(.5, Math.min(1.6, (this.b.zoom || 1) + dz));
    this.dirty(); this.paint();
  }
  trackNodes(tid){
    const b = this.b;
    if(b.mode === 'event') return b.nodes.filter(n => n.et === tid);
    const tr = b.ttracks.find(x => x.id === tid) || b.ttracks[0];
    return b.nodes.filter(n => n.tt === tid).map((n, i) => ({ n, i })).sort((a, z) => {
      const x = timeVal(tr, a.n.t), y = timeVal(tr, z.n.t);
      if(x === null && y === null) return a.i - z.i;
      if(x === null) return 1;
      if(y === null) return -1;
      return x - y || a.i - z.i;
    }).map(x => x.n);
  }
  /* 一条轨里节点的读序：时间线那一头 trackNodes 已经按时间排好了；事件线那一头它给的是 b.nodes 的录入序，
     画布上真正走的是那一棵序号树 —— 从前精简版直接拿录入序，同一块板在精简版、画布、导出三处
     排出三种顺序（他说「排序」乱，这是其中一处：对不上号）。 */
  bandNodes(tid){
    const ns = this.trackNodes(tid);
    /* placed 是「先摆子再记父」那一趟的产物（行号在进子节点之前就定了），所以要按行号读一遍才是画布上从上到下的次序 */
    return this.b.mode === 'event'
      ? this.bandTree(ns).placed.slice().sort((a, z) => a.d - z.d).map(p => p.n) : ns;
  }
  /* 事件轨里的一整条长带：按序号建到树上，往右下展开成阶梯 ——
     一个节点占一行，排在它自己那一行的头上；每深一级往右错一格。
     序号断层的父级补一个占位，那一格留空但照样占一行；撞号的不进树，收到带尾。 */
  bandTree(ns){
    const key = a => a.join('.');
    const groups = new Map(); const dup = [];
    for(const n of ns){
      const p = seqParts(n.seq); if(!p) continue;
      const k = key(p);
      if(!groups.has(k)){ groups.set(k, { p, ms: [n], ph: false }); continue; }
      dup.push(n);
    }
    const kids = new Map(); const roots = [];
    for(const g of groups.values()){
      if(g.p.length === 1){ roots.push(g); continue; }
      const pk = key(g.p.slice(0, -1));
      if(!kids.has(pk)) kids.set(pk, []);
      kids.get(pk).push(g);
    }
    for(const g of [...groups.values()]){
      for(let i = g.p.length - 1; i > 0; i--){
        const pk = key(g.p.slice(0, i - 1)), k = key(g.p.slice(0, i));
        if(groups.has(k)) break;
        const ph = { p: g.p.slice(0, i), ms: [], ph: true };
        groups.set(k, ph);
        if(i - 1 === 0) roots.push(ph);
        else { if(!kids.has(pk)) kids.set(pk, []); kids.get(pk).push(ph); }
      }
    }
    const evOf = g => (g.ms[0] || {}).ev;
    /* 事件评级：填了评级的按评级排（小的在上 = 排在前面），这一堆里有谁没填就整堆照旧跟着序号。
       「有没有人没填」必须按一整堆定，不能按一对一定 —— 按对定拼出来不是全序：
       A、B 都填了评级（评级把 B 摆到 A 前），C 没填，A 与 C、C 与 B 都退回比序号，
       三条两两一比就转出一个 A < C < B < A 的环，Array.sort 落在哪一头全看传进去的原始次序 ——
       加一枚节点、删一枚节点，兄弟的次序就跟着抖，就是他报的「排序 / 自动排序」那一条。 */
    const rank = rowRank(ns.map(n => n.ev));
    const cmp = 堆 => {
      const 用评级 = 堆.length > 1 && 堆.every(g => rated(evOf(g)));
      return (a, z) => (用评级 ? rank(evOf(a), 0) - rank(evOf(z), 0) : 0) || cmpSeq(a, z);
    };
    for(const g of groups.values()){
      g.kids = (kids.get(key(g.p)) || []).slice();
      g.kids.sort(cmp(g.kids));
      for(const k of g.kids) k.up = g;
    }
    roots.sort(cmp(roots));
    const placed = [], edges = [];
    let row = 0, dep = 0;
    const walk = (g, d) => {
      g.depth = d; dep = Math.max(dep, d);
      g.row = row++;                       // 先给这一行，再往下摆它的子节点：父在上、子在下一行并往右
      for(const k of g.kids) walk(k, d + 1);
      if(g.ph) return;
      for(const n of g.ms) placed.push({ n, d: g.row, dep: d });
      let a = g.up;
      while(a && a.ph) a = a.up;
      if(a) for(const n of g.ms) edges.push({ a: a.ms[0].id, b: n.id });
    };
    for(const r of roots) walk(r, 0);
    for(const n of dup) placed.push({ n, d: row++, dep: 0 });
    return { placed, edges, rows: row, maxDep: dep };
  }
  /* 这一格节点多高：量过的照实算（挂了图片的节点会把格子撑高），没量过先按内容估一份，
     等 paint 完量到真实高度再写回 n.mh，下一趟就是准的。 */
  nh(n){
    if(n.mh) return n.mh;
    if(!n.img) return BD.NH;
    const t = this.thumbs.get(n.img);
    const iw = (t && t.w) || n.iw || 0, ih = (t && t.h) || n.ih || 0;
    const w = BD.NW - 16;
    const imh = iw && ih ? Math.round(w * ih / iw) : Math.round(w * .7);
    return 10 + Math.min(imh, 320) + 20 + (n.note ? 26 : 0) + (n.t ? 15 : 0) + (n.cards && n.cards.length ? 15 : 0);
  }
  /* 一行的厚度看这行里最高的那个节点：图片把这一行顶高，下一行跟着往下挪。
     返回每行相对行首的偏移 off[]、每行最高 tall[]、和整块的厚度 h。 */
  rowBands(placed, first, step){
    const tall = [];
    for(const p of placed){
      const d = Math.max(0, p.d | 0), t = this.nh(p.n);
      if(tall[d] == null || t > tall[d]) tall[d] = t;
    }
    const off = []; let y = 0;
    for(let d = 0; d < tall.length; d++){
      off[d] = y;
      y += Math.max(d === 0 ? first : step, tall[d] + 20);
    }
    return { off, tall, h:y };
  }
  /* 位置：一条轨一段带，带的位置由上一条带多厚决定；节点框还是跟着 x/y 走，所以都拖得动 */
  layout(){
    const b = this.b, z = b.zoom || 1;
    const { NW, GAPX, PADX } = BD;
    const pos = new Map(); const bands = []; let edges = [];
    /* 排出来的顺序：每一次 put 就是「这一枚在这屏上落了位」，按落位先后记一份 id。
       shift 连选和 Ctrl+A 用的都是这一份，不是 b.nodes 那份录入序 —— 
       时间线一行是按时间排的，事件线一条带是按序号树排的，跟 id 序完全不是一回事。 */
    const ord = [];
    let w = 700;
    const cellX = s => PADX + s * (NW + GAPX);
    /* 事件线的横坐标：不看这一格排第几个，看它在树的第几级 —— 每深一级往右错一格 */
    const indentX = d => PADX + d * BD.INDX;
    const bump = x => { w = Math.max(w, x + PADX * 2); };
    const put = (n, x, y) => { const h = this.nh(n); pos.set(n.id, { x, y, w:NW, h }); ord.push(n.id); return h; };
    let y = BD.PADY;
    if(b.mode === 'time'){
      for(const tr of b.ttracks){
        const ns = this.trackNodes(tr.id);
        /* 时间评级：填了评级的往下分行（小的在上），绑定点还钉在这条轨的线上 */
        const rank = rowRank(ns.map(n => n.tv));
        const placed = ns.map(n => ({ n, d: rank(n.tv, 0) }));
        const rb = this.rowBands(placed, BD.ROWH, BD.LEVELH);
        const hgt = Math.max(BD.ROWH, rb.h);
        bands.push({ tr, ny: y, y: y - 30, h: hgt, pitch: hgt + (tr.gap || 0) });
        ns.forEach((n, ci) => {
          const dx = cellX(ci);
          const x = num(n.x, dx), yy = num(n.y, y + rb.off[Math.max(0, rank(n.tv, 0))]);
          put(n, x, yy);
          const P = pos.get(n.id); P.ax = dx + NW / 2; P.ay = y; P.dx = dx; P.dy = y;
          bump(Math.max(x + NW, dx + NW));
        });
        y += hgt + (tr.gap || 0);
      }
    } else {
      for(const tr of b.etracks){
        const t = this.bandTree(this.trackNodes(tr.id));
        /* 一行一个节点（d 就是行号），行的厚度看这一行那个节点多高 */
        const rb = this.rowBands(t.placed, BD.ROWV, BD.ROWV);
        const hgt = BD.TOP + rb.h + 14;
        bands.push({ tr, ny: y, y: y - 30, h: hgt, pitch: hgt + (tr.gap || 0) });
        for(const p of t.placed){
          const dx = indentX(p.dep), dy = y + BD.TOP + rb.off[Math.max(0, p.d | 0)];
          const x = num(p.n.x, dx), yy = num(p.n.y, dy);
          const h = put(p.n, x, yy);
          const P = pos.get(p.n.id); P.ax = x + NW / 2; P.ay = yy + h / 2;
          bump(Math.max(x + NW, dx + NW));
        }
        edges = edges.concat(t.edges);
        y += hgt + (tr.gap || 0);
      }
      /* 没序号的节点另起一条「未编号」带，按录入顺序从左到右（这条带不成树，也就跟着阶梯走） */
      const un = b.nodes.filter(n => !seqParts(n.seq));
      if(un.length){
        const tall = un.reduce((m, n) => Math.max(m, this.nh(n)), BD.NH);
        const hgt = BD.TOP + tall + 14;
        bands.push({ tr: { id:'_', name:'未编号' }, ny: y, y: y - 30, h: hgt, pitch: hgt, un:true });
        un.forEach((n, ci) => {
          const dx = cellX(ci), dy = y + BD.TOP;
          const x = num(n.x, dx), yy = num(n.y, dy);
          const h = put(n, x, yy);
          const P = pos.get(n.id); P.ax = x + NW / 2; P.ay = yy + h / 2;
          bump(Math.max(x + NW, dx + NW));
        });
        y += hgt;
      }
    }
    return { pos, bands, edges, ord, w: Math.max(w, 700), h: Math.max(y + 90, 320), NW, z };
  }
  /* 父子线跟着阶梯走：从父节点左下起一道竖线，往下走到子节点那一行的正中，再往右接进子节点左边 */
  treePath(A, B){
    const x1 = A.x + BD.TRUNK, y1 = A.y + A.h;
    const x2 = B.x, y2 = B.y + B.h / 2;
    return 'M' + x1 + ' ' + y1 + ' L' + x1 + ' ' + y2 + ' L' + x2 + ' ' + y2;
  }
  paint(){
    /* 精简版那一列没有画布，也没有 scroller：从前删、拖、成组这些入口只长在画布上，
       paint 这辈子走不到精简版，所以这里直接摸 scroller 也没人骂。
       现在精简版一行也能右键删、也能一把全选，走到这里就改叫重画那一列，别再往下撞空节点。 */
    if(this.ctx.compact){ this.draw(); return; }
    /* 「正看着的这一条」是打开那条连线的对话框时亮起来的：框一关就该灭。
       从前没人管它 —— 看完一条线回到板上它还一直亮着，直到点开另一条才换人。 */
    if(this.hotLink && !Overlay.node) this.hotLink = '';
    const b = this.b, sc = this.scroller;
    sc.innerHTML = '';
    const L = this.layout();
    /* 拖动时要照着这份坐标改线，paint 完就一直有效，直到下一次重画 */
    this.L = L; this.linkEls = []; this.treeEls = []; this.stubEls = new Map();
    this.nodeEl = new Map(); this.gEl = new Map(); this.rowEl = new Map();
    const cv = h('div', { class:'wnw-bd-canvas' + (this.linkMode ? ' linking' : ''), style:'width:' + L.w + 'px;height:' + L.h + 'px;transform:scale(' + L.z + ')' });
    this.cv = cv;
    /* 轨道头一行：名字左边两枚把手 —— ⇅ 按住换轨序、↕ 按住改这条轨和上面紧邻那一条的距离；
       名字点开轨道表、时间线这边再挂读法和历法 */
    L.bands.forEach((bd, i) => {
      /* 间距只在两条带之间才拖得出东西：↕ 拖的是上一条和这一条之间那一截，所以挂在下面那一条的标题上，
         头一条带上面没有别的轨，给它挂个 ↕ 只会拖出一片空 */
      const above = i > 0 ? L.bands[i - 1] : null;
      const hasSeam = i < L.bands.length - 1;
      /* 「未编号」那一条带不在轨道表里，换不了序，也就别给它挂一枚按了没反应的 ⇅ */
      const kids = [];
      if(!bd.un) kids.push(h('span', { class:'gh move', title:'按住上下拖，换这条轨的位置',
        onpointerdown:ev => this.grabHead(ev, bd.tr), html:icoMarkup('sort') }));
      if(above) kids.push(h('span', { class:'gh gap', title:'按住上下拖，改这条轨和上面紧邻那一条的距离',
        onpointerdown:ev => this.grabSeam(ev, above) }, '↕'));
      kids.push(h('span', { class:'nm', title:'点开改名、加轨、删轨', onclick:() => { if(!bd.un) this.trackDlg(bd.tr); } }, bd.tr.name));
      if(!bd.un && b.mode === 'time'){
        kids.push(h('select', { class:'wnw-input mini', title:tTip(bd.tr), onchange:ev => this.setMode(bd.tr, ev.target.value) },
          T_MODES.map(m => h('option', { value:m[0], selected:bd.tr.mode === m[0] }, m[1]))));
        if(bd.tr.mode === 'fake') kids.push(h('button', { class:'wnw-btn mini', title:'这条轨的历法',
          onclick:() => this.calDlg(bd.tr) }, (bd.tr.cal && bd.tr.cal.name) || '历法'));
      }
      cv.appendChild(h('div', { class:'wnw-bd-head', style:'top:' + bd.y + 'px' }, kids));
      cv.appendChild(h('div', { class: b.mode === 'time' ? 'wnw-bd-rowline' : 'wnw-bd-bandline',
        style:'top:' + (b.mode === 'time' ? bd.ny : bd.ny - 6) + 'px;height:' + (b.mode === 'time' ? bd.pitch : 0) + 'px' }));
      /* 带与带之间那一截缝照样整条能拖，走的还是 grabSeam，改的是这一条带和下一条带之间那一截，
         跟下一条标题上那枚 ↕ 是同一个数，两个入口一个结果；
         缝上不再挂字数 —— 间距是多少只在轨道表那一格里看，板上不给它露脸 */
      if(hasSeam)
        cv.appendChild(h('div', { class:'wnw-bd-seam', title:'按住这里上下拖：下一条轨和这条轨的距离跟着变',
          style:'top:' + (L.bands[i + 1].y - 13) + 'px', onpointerdown:ev => this.grabSeam(ev, bd) }));
    });
    /* 组：一整块实色底、无边框，铺在成员节点底下。整组拖动、右键改名解散，不支持嵌套。 */
    for(const g of (b.groups || [])){
      const ps = g.m.map(id => L.pos.get(id)).filter(Boolean);
      if(ps.length < 2) continue;
      const x0 = Math.min(...ps.map(p => p.x)) - 9, y0 = Math.min(...ps.map(p => p.y)) - 24;
      const x1 = Math.max(...ps.map(p => p.x + p.w)) + 9, y1 = Math.max(...ps.map(p => p.y + p.h)) + 9;
      const el = h('div', { class:'wnw-bd-group' + (this.sel.size && g.m.some(id => this.sel.has(id)) ? ' hot' : ''),
        style:'left:' + x0 + 'px;top:' + y0 + 'px;width:' + (x1 - x0) + 'px;height:' + (y1 - y0) + 'px' + (g.c ? ';--gc:' + g.c : ''),
        title:'按住底色区拖动 = 整组一起挪 · 右键改名或解散',
        onpointerdown:ev => this.grabGroup(ev, g),
        oncontextmenu:ev => { ev.preventDefault(); ev.stopPropagation(); this.groupMenu(ev, g); } },
        [h('span', { class:'gn', onclick:ev => { ev.stopPropagation(); this.groupDlg(g); } }, g.name || '组')]);
      cv.appendChild(el);
      this.gEl.set(g.id, el);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wnw-bd-links');
    svg.setAttribute('width', L.w); svg.setAttribute('height', L.h); svg.setAttribute('viewBox', '0 0 ' + L.w + ' ' + L.h);
    /* 父子线先画，压在手画连线底下 */
    for(const e of L.edges){
      const A = L.pos.get(e.a), B = L.pos.get(e.b);
      if(!A || !B) continue;
      const p = document.createElementNS(svg.namespaceURI, 'path');
      p.setAttribute('d', this.treePath(A, B));
      p.setAttribute('class', 'wnw-bd-tree');
      svg.appendChild(p);
      this.treeEls.push({ a:e.a, b:e.b, p });
    }
    for(const lk of b.links){
      const A = L.pos.get(lk.a), B = L.pos.get(lk.b);
      if(!A || !B) continue;
      /* 连线一律接绑定点：事件线的绑定点就是节点正中，时间线的是轨道线上那个点 */
      const x1 = A.ax, y1 = A.ay, x2 = B.ax, y2 = B.ay;
      const 形 = linkGeom(x1, y1, x2, y2);
      const p = document.createElementNS(svg.namespaceURI, 'path');
      p.setAttribute('d', 形.d);
      p.setAttribute('stroke', relColor(lk));
      p.setAttribute('class', 'wnw-bd-link' + (lk.id === this.hotLink ? ' hot' : ''));
      p.addEventListener('click', () => this.linkDlg(lk));
      svg.appendChild(p);
      const lab = lk.custom || lk.kind || '';
      const tx = document.createElementNS(svg.namespaceURI, 'text');
      tx.setAttribute('x', 形.x); tx.setAttribute('y', 形.y);
      tx.setAttribute('text-anchor', 形.锚);
      tx.setAttribute('class', 'wnw-bd-lab');
      tx.textContent = lab;
      svg.appendChild(tx);
      this.linkEls.push({ a:lk.a, b:lk.b, p, tx });
    }
    if(b.mode === 'time'){
      /* 节点拖走后，用一截虚线把它和轨道上的绑定点牵在一起 */
      for(const n of b.nodes){
        const P = L.pos.get(n.id);
        if(!P) continue;
        const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
        const s = document.createElementNS(svg.namespaceURI, 'line');
        s.setAttribute('x1', P.ax); s.setAttribute('y1', P.ay); s.setAttribute('x2', cx); s.setAttribute('y2', cy);
        s.setAttribute('class', 'wnw-bd-stub');
        s.style.display = (P.x !== P.dx || P.y !== P.dy) ? '' : 'none';
        svg.appendChild(s);
        this.stubEls.set(n.id, s);
        const d = document.createElementNS(svg.namespaceURI, 'circle');
        d.setAttribute('cx', P.ax); d.setAttribute('cy', P.ay); d.setAttribute('r', 4.5);
        d.setAttribute('class', 'wnw-bd-anchor'); d.setAttribute('fill', n.fill || n.line || 'var(--accent)');
        svg.appendChild(d);
      }
    }
    cv.appendChild(svg);
    /* 画布空白处单击 = 清选；节点自己把 click 拦住 */
    cv.addEventListener('click', () => { if(this.sel.size){ this.sel.clear(); this.markSel(); } });
    for(const n of b.nodes){
      const at = L.pos.get(n.id);
      if(!at) continue;
      const el = this.node(n, at);
      this.nodeEl.set(n.id, el);
      cv.appendChild(el);
    }
    sc.appendChild(cv);
    this.peekAll();
    /* 这一趟排出来的顺序交给选中集：掉出这一屏的（换读法、删轨道、筛没了）一并从手里清出去 */
    this.showing(L.ord);
    this.measure();
  }
  /* 图片只读不存：这一趟见过的那个路径记一份缩略，节点高度量准了就重画一次。
     程序里走主进程（nativeImage 缩好再回传）；没有主进程这一层时只能拿 file:/// 碰一碰，
     本地开发那台服务器那一种开法读不到本地盘上的图，读不到就照实说。 */
  peekAll(){
    for(const n of this.b.nodes){
      const p = n.img;
      if(!p || this.thumbs.has(p) || this.peeking.has(p)) continue;
      this.peeking.add(p);
      this.peek(p).then(t => {
        this.peeking.delete(p);
        if(!t) return;
        this.thumbs.set(p, t);
        for(const x of this.b.nodes) if(x.img === p && (x.iw !== t.w || x.ih !== t.h)){ x.iw = t.w; x.ih = t.h; delete x.mh; }
        if(this.cv) this.paint();
      });
    }
  }
  peek(p){
    if(window.FD_APP && typeof FD_APP.imgPeek === 'function')
      return FD_APP.imgPeek(p, BD.NW * 2).then(r => (r && r.ok && r.url) ? { url:r.url, w:r.w, h:r.h, big:true } : { url:'', w:0, h:0, miss:(r && (r.miss || r.msg)) || '读不出这张图' }).catch(e => ({ url:'', w:0, h:0, miss:String((e && e.message) || e) }));
    return new Promise(res => {
      const u = fileUrl(p), im = new Image();
      im.onload = () => res({ url:u, w:im.naturalWidth, h:im.naturalHeight, big:true });
      im.onerror = () => res({ url:'', w:0, h:0, miss:'这个地址读不到图（没走主进程时只能读 file:/// 打得开的那几种）' });
      im.src = u;
    });
  }
  openImg(n){
    const p = n.img; if(!p) return;
    if(window.FD_APP && typeof FD_APP.imgOpen === 'function'){
      FD_APP.imgOpen(p).then(r => { if(r && !r.ok) toast(r.msg || '打不开这张图'); });
      return;
    }
    window.open(fileUrl(p), '_blank');
  }
  /* 量一遍真实高度：跟这一趟排版用的数不一样就写回 n.mh，再重画一次（不一样才重画，所以自己会停） */
  measure(){
    let changed = false;
    for(const [id, el] of this.nodeEl){
      const P = this.L.pos.get(id);
      if(!P) continue;
      const hh = Math.round(el.offsetHeight) || P.h;
      if(hh !== P.h){ const n = this.b.nodes.find(x => x.id === id); if(n){ n.mh = hh; changed = true; } }
    }
    if(changed) this.paint();
  }
  badT(n){
    const b = this.b;
    if(b.mode !== 'time' || !n.t) return false;
    const tr = b.ttracks.find(x => x.id === n.tt) || b.ttracks[0];
    return timeVal(tr, n.t) === null;
  }
  /* 没挑过填充色的节点自动取底：同一条轨上的节点同一个色，轨与轨错开一个槽位，
     五个轮完回到第一个。色跟着轨在这套轨道表里的位置现算，所以加轨、删轨、换序之后
     重新派一遍就对了，节点上不用多存一个字段。 */
  trackTint(n){
    const b = this.b;
    const list = b.mode === 'time' ? b.ttracks : b.etracks;
    const i = list.findIndex(x => x.id === (b.mode === 'time' ? n.tt : n.et));
    return nodeTints()[(i < 0 ? 0 : i) % (typeof markCount === 'function' ? markCount() : 5)];
  }
  node(n, at){
    const b = this.b;
    /* 填充挑过就用挑的，没挑过（fill 还是空串）按所在轨自动取一份浅底；
       边框挑了才盖，没挑跟主题描边走。底是实色，字色照着底的亮度翻。
       连线模式里点中的那一个让位给主题的选中底，挑没挑过色都一个长相。 */
    const picked = !!(this.link && this.link.a === n.id);
    const bg = picked ? '' : (n.fill || this.trackTint(n));
    const lum = bg ? bgLum(bg) : null;
    const el = h('div', { class:'wnw-bd-node' + (this.sel.has(n.id) ? ' sel' : '') + (picked ? ' pick' : '') +
      (lum === null ? '' : lum < .5 ? ' dk' : ' lt'),
      style:'left:' + at.x + 'px;top:' + at.y + 'px;width:' + at.w + 'px' +
        (n.line ? ';border-color:' + n.line : '') + (bg ? ';background:' + bg : '') });
    if(n.img){
      const t = this.thumbs.get(n.img);
      /* 图没读回来之前先占一格，别让人看见一个裂开的图标 */
      if(t && t.url) el.appendChild(h('img', { class:'im', src:t.url, alt:'', title:'点开看大图 · ' + n.img,
        onclick:ev => { ev.stopPropagation(); this.openImg(n); } }));
      else el.appendChild(h('div', { class:'im miss' }, (t && t.miss) || '正在读这张图…'));
      if(t && t.url && n.iw && n.ih) el.firstChild.style.aspectRatio = n.iw + ' / ' + n.ih;
    }
    el.appendChild(h('div', { class:'nm' }, n.label));
    if(n.t) el.appendChild(h('div', { class:'tm' + (this.badT(n) ? ' bad' : ''), title:this.badT(n) ? '这套时间读法认不出这一句，点节点改' : '' }, n.t));
    if(n.note) el.appendChild(h('div', { class:'nt' }, n.note));
    /* 关联了设定卡就把卡名摆在节点上，光一张牌认不出是哪张卡；一张也不挡，几张都列出来 */
    if((n.cards || []).length){
      const ns = n.cards.map(id => this.cardName(id) || '卡已不在');
      el.appendChild(h('div', { class:'cd w-txt', title:'关联卡片 · ' + ns.join('、') },
        [h('span', { class:'w-mk', html:icoMarkup('card') }), ns.join('、')]));
    }
    el.appendChild(h('button', { class:'dl', title:'删掉这个节点，连着它的线一起断',
      html:icoMarkup('close'), onclick:ev => { ev.stopPropagation(); this.delNode(n); } }));
    el.addEventListener('pointerdown', ev => this.grab(ev, n, el));
    /* 单击选中、双击才打开改：多选靠 Ctrl 点、Shift 从锚点连一片、Ctrl+A 一把捞满这一屏，
       凑齐了右键成组或一把删 */
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      if(this.dragged){ this.dragged = false; return; }
      if(this.linkMode){ this.linkStep(n.id); return; }
      ev.stopPropagation();
      this.choose(n, ev);
    });
    el.addEventListener('dblclick', ev => { ev.stopPropagation(); if(!this.linkMode) this.nodeDlg(n); });
    el.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); this.nodeMenu(ev, n); });
    return el;
  }
  /* 单击一枚、Ctrl/Cmd 逐个加减、Shift 从锚点连一片（外15 第 6 条，和书架那一档同一套口径）。
     只改选中状态和样式，不整幅重画：画一次要把图片重新读一遍，点一下闪一次太吵 */
  choose(n, ev){
    const id = n.id, all = this.order;
    /* Shift 从锚点连一片，按的是这一趟屏上排出来的顺序（时间线按时间、事件线按序号树）。
       从前 Shift 和 Ctrl 走的是同一条「加减」，压根连不出一片；
       锚点已经不在这一屏上了（换了读法、轨道动了、刚重画过）就退化成普通单击，别一口连整块板。 */
    if(ev && ev.shiftKey){
      const i = all.indexOf(this.anchor), j = all.indexOf(id);
      if(i >= 0 && j >= 0){
        this.sel.clear();
        for(let k = Math.min(i, j); k <= Math.max(i, j); k++) this.sel.add(all[k]);
        this.markSel(); return;
      }
    }
    if(ev && (ev.ctrlKey || ev.metaKey)){
      if(this.sel.has(id)) this.sel.delete(id); else this.sel.add(id);
    } else {
      /* 从前光板单击在「手里只剩这一枚、点的又是它」时会把选中清空，
         和书架那一档「单击就是把选中换成这一条」对不上，现在一律换成这一条。 */
      this.sel.clear(); this.sel.add(id);
    }
    this.anchor = id;
    this.markSel();
  }
  /* 选中状态只改样式，不整幅重画：画一次要把图片重新读一遍，点一下闪一次太吵。
     两种长相各有一份元素表（画布那枚方块在 nodeEl、精简版那一行在 rowEl），这儿一起过。 */
  markSel(){
    for(const [id, el] of this.nodeEl) el.classList.toggle('sel', this.sel.has(id));
    for(const [id, el] of this.rowEl) el.classList.toggle('sel', this.sel.has(id));
    for(const [id, el] of this.gEl){
      const g = this.b.groups.find(x => x.id === id);
      el.classList.toggle('hot', !!g && this.sel.size > 0 && g.m.some(x => this.sel.has(x)));
    }
  }
  groupOf(id){ return (this.b.groups || []).find(g => g.m.includes(id)) || null; }
  /* 组里成员先各自落好坐标，整组一起挪才挪得动 */
  members(g){
    const out = [];
    for(const id of g.m){
      const n = this.b.nodes.find(x => x.id === id), P = this.L && this.L.pos.get(id);
      if(!n || !P) continue;
      if(n.x == null){ n.x = P.x; n.y = P.y; }
      out.push(n);
    }
    return out;
  }
  /* 拖动中的那一帧就把组底跟着挪，松手再整幅重画 */
  grabGroup(ev, g){
    if(ev.button) return;
    if(ev.target.closest && ev.target.closest('.gn')) return;
    ev.preventDefault(); ev.stopPropagation();
    const ns = this.members(g);
    if(ns.length < 2){ this.paint(); return; }
    const z = this.b.zoom || 1, x0 = ev.clientX, y0 = ev.clientY;
    const o = ns.map(n => ({ n, x:n.x, y:n.y }));
    const el = this.gEl.get(g.id);
    const bx = parseFloat(el.style.left) || 0, by = parseFloat(el.style.top) || 0;
    let moved = false;
    const mv = e => {
      const dx = (e.clientX - x0) / z, dy = (e.clientY - y0) / z;
      if(Math.abs(dx) + Math.abs(dy) < 1) return;
      moved = true;
      for(const it of o){
        it.n.x = Math.max(0, Math.round(it.x + dx)); it.n.y = Math.max(0, Math.round(it.y + dy));
        const le = this.nodeEl.get(it.n.id);
        if(le){ le.style.left = it.n.x + 'px'; le.style.top = it.n.y + 'px'; }
        this.follow(it.n);
      }
      if(el){ el.style.left = (bx + dx) + 'px'; el.style.top = (by + dy) + 'px'; }
    };
    const up = () => {
      wUn(mv, up);
      if(!moved) return;
      this.dragged = true; setTimeout(() => { this.dragged = false; }, 160);
      this.dirty(); this.paint();
    };
    wOn(mv, up);
  }
  makeGroup(){
    const ids = [...this.sel];
    if(ids.length < 2){ toast('先点一个，再按住 Ctrl 点两三个，然后右键成组'); return; }
    /* 不支持嵌套：已经进过组的先挪出去，空下来的组顺手删掉 */
    for(const g of this.b.groups) g.m = g.m.filter(id => !this.sel.has(id));
    this.b.groups = this.b.groups.filter(g => g.m.length >= 2);
    const g = { id: uid('gp'), name:'组 ' + (this.b.groups.length + 1), c:GROUP_TINT, m: ids.slice() };
    for(const id of ids){ const n = this.b.nodes.find(x => x.id === id), P = this.L && this.L.pos.get(id);
      if(n && n.x == null && P){ n.x = P.x; n.y = P.y; } }
    this.b.groups.push(g);
    this.sel.clear();
    this.dirty(); this.paint();
    toast('已把这 ' + ids.length + ' 个框成一组');
  }
  breakGroup(g){
    this.sel = new Set(g.m);
    this.b.groups = this.b.groups.filter(x => x !== g);
    this.dirty(); this.paint();
    toast('这一组已解散，成员还留着选中');
  }
  groupMenu(ev, g){
    Menu.open(ev.clientX, ev.clientY, [
      { label:'改组名', fn:() => this.groupDlg(g) },
      { label:'解散这一组', fn:() => this.breakGroup(g) },
      { sep:1 },
      { label:'把组里所有节点打开改', fn:() => this.nodeDlg(this.b.nodes.find(x => x.id === g.m[0])) }
    ]);
  }
  groupDlg(g){
    const box = h('div', { class:'wnw-col' });
    const nm = h('input', { class:'wnw-input', value:g.name });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '组名'), nm]));
    /* 新建组带的是那层默认浅底，和「无」是一个长相 —— 读的时候把它当成无，选中态才对得上 */
    box.appendChild(dotRow('底色', () => g.c === GROUP_TINT ? '' : g.c, v => { g.c = v; this.draw(); }, '无 = 用默认那层浅色实底'));
    box.appendChild(h('div', { class:'wnw-hint' }, '组没有边框：这一排点挑的就是整块底色；「无」= 用默认那层浅色实底'));
    Overlay.open('这一组（' + g.m.length + ' 个节点）', box, [
      h('button', { class:'wnw-btn primary', onclick:() => {
        g.name = nm.value.trim() || g.name; Overlay.close(); this.dirty(); this.paint();
      }}, '保存'),
      h('button', { class:'wnw-btn bad', onclick:() => { Overlay.close(); this.breakGroup(g); } }, '解散'),
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消')]);
    nm.focus();
  }
  /* 右键菜单：成组、这一块组、打开、看大图、删掉这一枚，都是既有的走法。
     外15 第 6 条要的那三条里，「在新标签页打开」「在停靠打开」这两条在这里撤了 ——
     节点不是一种可打开的内容（Views 里没有它这一档），能开大的只有它脚下这块板，
     而能右键点到它，就说明这块板正开着：摆两条「开这块板」等于跳回自己，点了没反应，不如不摆。
     手里两枚以上、右键点的又正在手里，头顶多一条批量删除。 */
  nodeMenu(ev, n){
    if(!this.sel.has(n.id)){ this.sel.clear(); this.sel.add(n.id); this.anchor = n.id; this.markSel(); }
    const g = this.groupOf(n.id);
    const many = this.sel.size > 1 && this.sel.has(n.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 个 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:1 } : null,
      this.sel.size >= 2 ? { label:'成组（选中 ' + this.sel.size + ' 个）', fn:() => this.makeGroup() } : null,
      this.sel.size >= 2 ? { sep:1 } : null,
      g ? { label:'组名：' + g.name, fn:() => this.groupDlg(g) } : null,
      g ? { label:'解散这一组', fn:() => this.breakGroup(g) } : null,
      g ? { sep:1 } : null,
      { label:'打开这个节点', fn:() => this.nodeDlg(n) },
      n.img ? { label:'看大图', fn:() => this.openImg(n) } : null,
      { label:'删掉这个节点', fn:() => this.delNode(n) }
    ].filter(Boolean));
  }
  /* 一把删掉手里这些：确认只弹一次、说清几个，然后逐枚走 delNode（断线、散组那些账它自己会算完），
     删完选中集清空。从前只有手里一枚能删，删一排就得点一排确认。 */
  batchDel(){
    const ids = [...this.sel];
    const names = ids.map(id => { const n = this.b.nodes.find(x => x.id === id); return n ? n.label : ''; }).filter(Boolean);
    if(!confirm('删掉选中的 ' + ids.length + ' 个节点？连着它们的线一起断：\n' + names.join('、'))) return;
    for(const id of ids){ const n = this.b.nodes.find(x => x.id === id); if(n) this.delNode(n, true); }
    this.sel.clear(); this.anchor = null;
    toast('已删掉 ' + ids.length + ' 个节点');
  }
  /* 两种读法都让拖，坐标一律写回节点；时间线的绑定点钉在轨道线上，不跟着节点跑。
     选中了不止一个（或这个节点在组里）就整群一起走。 */
  grab(ev, n, el){
    if(this.linkMode) return;
    if(ev.button) return;
    if(ev.target.closest && ev.target.closest('.dl')) return;
    ev.preventDefault();
    const z = this.b.zoom || 1, x0 = ev.clientX, y0 = ev.clientY;
    let crew = null;
    const g = this.groupOf(n.id);
    if(g && g.m.length >= 2) crew = this.members(g);
    else if(this.sel.size >= 2 && this.sel.has(n.id)){
      crew = [];
      for(const id of this.sel){
        const x = this.b.nodes.find(k => k.id === id), P = this.L && this.L.pos.get(id);
        if(!x || !P) continue;
        if(x.x == null){ x.x = P.x; x.y = P.y; }
        crew.push(x);
      }
      if(crew.length < 2) crew = null;
    }
    if(crew) el.classList.add('drag');
    const o = crew ? crew.map(x => ({ x, le:this.nodeEl.get(x.id), X:x.x, Y:x.y })) : [{ x:n, le:el, X:parseFloat(el.style.left) || 0, Y:parseFloat(el.style.top) || 0 }];
    let moved = false;
    const mv = e => {
      if(Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) < 3) return;
      moved = true;
      const dx = (e.clientX - x0) / z, dy = (e.clientY - y0) / z;
      for(const it of o){
        it.x.x = Math.max(0, Math.round(it.X + dx));
        it.x.y = Math.max(0, Math.round(it.Y + dy));
        if(it.le){ it.le.style.left = it.x.x + 'px'; it.le.style.top = it.x.y + 'px'; }
        this.follow(it.x);
      }
    };
    const up = () => {
      for(const it of o) if(it.le) it.le.classList.remove('drag');
      wUn(mv, up);
      if(!moved) return;
      /* 拖完浏览器还会补一个 click，不拦一下就变成"一拖就弹对话框"，看着就像拖不动 */
      this.dragged = true;
      setTimeout(() => { this.dragged = false; }, 160);
      this.dirty();
      /* 重画一次：拖离原位后那截牵线和绑定点要跟着出来 */
      this.paint();
    };
    for(const it of o) if(it.le) it.le.classList.add('drag');
    wOn(mv, up);
  }
  /* 拖动的这一帧就把线改过来：只动端点那几个数，不整幅重画 —— 一重画节点就从鼠标底下跑了。
     事件线的绑定点是节点正中，跟着节点走；时间线的绑定点钉在轨道线上不动，跟着走的是那截牵线。 */
  follow(n){
    const L = this.L; if(!L) return;
    const P = L.pos.get(n.id); if(!P) return;
    P.x = n.x; P.y = n.y;
    if(L.bands[0] && this.b.mode === 'time'){
      const s = this.stubEls.get(n.id);
      if(s){
        const off = P.x !== P.dx || P.y !== P.dy;
        s.style.display = off ? '' : 'none';
        if(off){ s.setAttribute('x2', P.x + P.w / 2); s.setAttribute('y2', P.y + P.h / 2); }
      }
    } else { P.ax = n.x + P.w / 2; P.ay = n.y + P.h / 2; }
    for(const el of this.linkEls){
      if(el.a !== n.id && el.b !== n.id) continue;
      const A = L.pos.get(el.a), B = L.pos.get(el.b);
      if(!A || !B) continue;
      /* 画法要和画那一趟是同一颗（linkGeom）：从前这里自己另写了一遍三次曲线，
         图18 给「两头几乎上下对齐」加的那条直线分支和字样锚点它都不认 —— 一拖就弹回弯的、
         字还歪着，松手重画又摆回来，看着就是连线跟着鼠标乱跳。 */
      const 形 = linkGeom(A.ax, A.ay, B.ax, B.ay);
      el.p.setAttribute('d', 形.d);
      el.tx.setAttribute('x', 形.x); el.tx.setAttribute('y', 形.y);
      el.tx.setAttribute('text-anchor', 形.锚);
    }
    for(const el of this.treeEls){
      if(el.a !== n.id && el.b !== n.id) continue;
      const A = L.pos.get(el.a), B = L.pos.get(el.b);
      if(!A || !B) continue;
      el.p.setAttribute('d', this.treePath(A, B));
    }
  }
  /* 拖轨道标题左边那枚 ⇅：整条轨跟着上下换序 —— 松手前每挪过一条就当场重排一次 */
  grabHead(ev, tr){
    if(ev.button) return;
    ev.preventDefault(); ev.stopPropagation();
    const b = this.b, list = this.tracks();
    if(list.indexOf(tr) < 0) return;
    let last = -1;
    const mv = e => {
      const r = this.cv.getBoundingClientRect(), z = b.zoom || 1;
      const cy = (e.clientY - r.top) / z;
      const bs = this.L.bands;
      /* 落点要认「指针压着的那一条带子现在是哪条轨」，不能认它是第几条 —— 每换一次序整幅重画，
         带的 y 和 pitch 全变了，上一趟算出来的下标落到新布局上就指到别的轨去了：
         从前这里拿裸下标，指针不动、每挪一条就自己再抖一次，最后停在鼠标走过的那一格之外（他报的轨道换序）。
         未编号那一条带不在轨道表里（tr.id 是 '_'），落它上面就是落到最末一条真轨。 */
      let 压 = null;
      for(let i = 0; i < bs.length; i++){ if(cy < bs[i].y + bs[i].pitch / 2){ 压 = bs[i].tr; break; } }
      const 头 = 压 ? list.indexOf(压) : -1;
      const want = 头 < 0 ? list.length - 1 : 头;
      const from = list.indexOf(tr);
      if(want === last || want === from) return;
      list.splice(from, 1);
      /* 摘掉自己之后再插到「压着那一条现在坐的位子」前面：往下挪时要减掉自己腾出来的那一格，
         从前两头的下标都照同一份表算，往下拖就多越过一条（往上、往下不对称） */
      list.splice(Math.min(want > from ? want - 1 : want, list.length), 0, tr);
      last = want;
      this.dirty(); this.paint();
    };
    const up = () => {
      wUn(mv, up);
    };
    wOn(mv, up);
  }
  /* 拖轨道标题左边那枚 ↕，也拖带与带之间那一截缝：两个入口改的都是同一个数 —— 上面那条带和下面那条带之间那一截，
     落到界面上就是「这一条轨和它上面紧邻那一条的距离」，别的轨跟着上下挪。
     存的字段还是 tr.gap，一个没新加；往下拖拉开、往上拖靠近；只是拖的过程中不露数字。
     传进来的 bd 就是上面那一条带：↕ 从它下一条的标题递进来，缝那一头递的是这一趟循环里的 bd 自己；
     下限照 bd 的厚度算，拖的过程中不露数字 */
  grabSeam(ev, bd){
    if(ev.button) return;
    ev.preventDefault(); ev.stopPropagation();
    const z = this.b.zoom || 1, y0 = ev.clientY;
    const start = bd.tr.gap || 0, min = 64 - bd.h;
    let g = start;
    const mv = e => {
      g = Math.max(min, Math.min(1400, start + (e.clientY - y0) / z));
      if(g === bd.tr.gap) return;
      bd.tr.gap = Math.round(g);
      this.dirty(); this.paint();
    };
    const up = () => {
      wUn(mv, up);
      this.paint();
    };
    wOn(mv, up);
  }
  delNode(n, noAsk){
    if(!noAsk && !confirm('删掉「' + n.label + '」？连着它的线一起断。')) return;
    this.b.nodes = this.b.nodes.filter(x => x !== n);
    this.b.links = this.b.links.filter(x => x.a !== n.id && x.b !== n.id);
    /* 组里少了人，凑不满两个就地散掉 */
    for(const g of this.b.groups || []) g.m = g.m.filter(id => id !== n.id);
    this.b.groups = (this.b.groups || []).filter(g => g.m.length >= 2);
    this.sel.delete(n.id);
    this.dirty(); this.paint();
    toast('已删掉这个节点');
  }
  linkStep(id){
    if(!this.link){ this.link = { a: id }; this.paint(); return; }
    if(this.link.a === id){ this.link = null; this.paint(); return; }
    const a = this.b.nodes.find(x => x.id === this.link.a), z = this.b.nodes.find(x => x.id === id);
    this.link = null;
    if(!a || !z){ this.paint(); return; }
    this.newLink(a, z);
  }
  /* 连线：预设类型点一下就有、再点一下就没有；自定义写字就用字盖住预设；颜色跟着类型走，也可以自己挑 */
  linkForm(box, lk){
    const row = h('div', { class:'wnw-pick-row' });
    const dots = h('div', { class:'wnw-row', style:'gap:4px' });
    const cu = h('input', { class:'wnw-input', value:lk.custom || '', placeholder:'自己写一个字样，写了就用它标线' });
    cu.addEventListener('input', () => { lk.custom = cu.value.trim(); this.dirty(); });
    const paint = () => {
      row.innerHTML = '';
      for(const r of REL_KINDS) row.appendChild(h('button', { class:'wnw-btn' + (lk.kind === r.k ? ' on' : ''), style:'border-color:' + r.c,
        onclick:() => { lk.kind = lk.kind === r.k ? '' : r.k; paint(); } }, r.k));
      dots.innerHTML = '';
      /* 连线自己钉的颜色：先给那一串标记色（全局口径），后面再排五个关系预设色 ——
         存的就是「第几个」那一句取值串，回到跟类型那个按钮还在 */
      (typeof markSlots === 'function' ? markSlots() : []).forEach((c, i) => dots.appendChild(h('button', {
        class:'wnw-dot' + (markIndexOf(lk.c) === i ? ' on' : ''), style:'background:' + c,
        'aria-pressed':markIndexOf(lk.c) === i ? 'true' : 'false',
        title:'第 ' + (i + 1) + ' 个标记色', onclick:() => { lk.c = markIndexOf(lk.c) === i ? '' : c; this.dirty(); paint(); } })));
      for(const c of LINK_SLOTS) dots.appendChild(h('button', { class:'wnw-dot' + (lk.c === c ? ' on' : ''), style:'background:' + c,
        title:'线的颜色：跟关系类型那一色', onclick:() => { lk.c = lk.c === c ? '' : c; this.dirty(); paint(); } }));
      clear.style.display = lk.c ? '' : 'none';
    };
    const clear = h('button', { class:'wnw-btn mini', title:'线的颜色回到预设类型', onclick:() => { lk.c = ''; this.dirty(); paint(); } }, '跟类型');
    box.appendChild(h('div', { class:'wnw-hint' }, '关系类型'));
    box.appendChild(row);
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '自定义'), cu]));
    box.appendChild(h('div', { class:'wnw-row', style:'gap:8px;align-items:center' }, [dots, clear]));
    paint();
    return { lk, cu };
  }
  newLink(a, z){
    const lk = { id: uid('lk'), a: a.id, b: z.id, kind: '', custom: '', c: '' };
    const box = h('div', { class:'wnw-col' });
    /* 说明行拿箭头图标；下拉里每一行是原生 <option>，塞不进图片，改用白话「到 / 双向」 */
    box.appendChild(h('div', { class:'wnw-hint', html:esc(a.label) + icoMarkup('next') + esc(z.label) }));
    const dir = h('select', { class:'wnw-input' }, [h('option', { value:'ab' }, a.label + ' 到 ' + z.label), h('option', { value:'ba' }, z.label + ' 到 ' + a.label),
      h('option', { value:'both' }, a.label + ' 双向 ' + z.label)]);
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '方向'), dir]));
    this.linkForm(box, lk);
    Overlay.open('连一条关系', box, [h('button', { class:'wnw-btn primary', onclick:() => {
      const d = dir.value;
      if(d !== 'both') this.b.links.push({ ...lk, a: d === 'ab' ? a.id : z.id, b: d === 'ab' ? z.id : a.id });
      else { this.b.links.push({ ...lk }); this.b.links.push({ ...lk, id: uid('lk2'), a: z.id, b: a.id, twin:1 }); }
      Overlay.close(); this.dirty(); this.paint();
    }}, '连上')]);
  }
  linkDlg(lk){
    this.hotLink = lk.id; this.paint();
    const a = this.b.nodes.find(x => x.id === lk.a), z = this.b.nodes.find(x => x.id === lk.b);
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { html:esc(a ? a.label : '?') + icoMarkup('next') + esc(z ? z.label : '?') }));
    this.linkForm(box, lk);
    Overlay.open('这条连线', box, [h('button', { class:'wnw-btn', onclick:() => {
      Overlay.close(); this.dirty(); this.draw();
    }}, '保存'),
      h('button', { class:'wnw-btn bad', onclick:async () => {
        /* 连线是这块板上的一条记录，断了没有地方放回 —— 和「删掉这个节点」同一档，得问 */
        if(!await wnwAsk('断开这条连线？' + esc(a ? a.label : '?') + ' → ' + esc(z ? z.label : '?') + ' 这一条就没了。')) return;
        /* 双向那条是 newLink 拆成的两枚（反过来的那一枚带 twin 记号）：断开要连着那一对一起断，
           只摘手里这一枚就剩下半根孤线挂在图上，看着就像「断不掉、得再点一次」。 */
        const 伴 = x => x !== lk && (x.twin || lk.twin) && x.a === lk.b && x.b === lk.a;
        this.b.links = this.b.links.filter(x => x !== lk && !伴(x)); this.dirty(); Overlay.close(); this.paint();
      } }, '断开'),
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消')]);
  }
  /* 图6：这一条只到年 / 到月，同一条时间轨上又已经有别条只到年 / 到月的同年事件 → 交回那句提醒。
     拟真 / 原点两档不管（那两档写得出到分到秒）；这一句本身读不出的也不在这儿啰嗦。 */
  同年话(tt, s, 自己){
    const tr = this.b.ttracks.find(x => x.id === tt);
    if(!tr || tr.mode !== 'fake') return '';
    const p = fakeParts(s);
    if(!p || p.档 === '日' || fakeTime(s, tr.cal) === null) return '';
    return 同年撞(p, this.b.nodes.filter(x => x !== 自己 && x.tt === tt).map(x => x.t));
  }
  nodeDlg(n){
    const b = this.b;
    const box = h('div', { class:'wnw-col' });
    const name = h('input', { class:'wnw-input', value:n.label });
    const sq = h('input', { class:'wnw-input', value:n.seq || '', placeholder:'1.2.3，可空' });
    const tr = h('select', { class:'wnw-input' }, b.ttracks.map(x => h('option', { value:x.id, selected:n.tt === x.id }, x.name + ' · ' + modeName(x.mode))));
    const er = h('select', { class:'wnw-input' }, b.etracks.map(x => h('option', { value:x.id, selected:n.et === x.id }, x.name)));
    const t = h('input', { class:'wnw-input', value:n.t || '', placeholder:tTip(b.ttracks.find(x => x.id === n.tt) || b.ttracks[0]) });
    const note = h('textarea', { class:'wnw-fv wnw-big', rows:'2' }); note.value = n.note || '';
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '名字'), name]));
    /* 序号和评级只管排序，节点上不显示（第 15 条） */
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '事件序号（只用来排）'), sq]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '事件轨'), er]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '时间轨'), tr]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '时间'), t]));
    /* 图17：光标一进这一格，就把这本书里卡片上写过的时间列出来给你对着写。
       不挑哪张卡、不要求先关联，以内以外都算对，一个字都不替你写。 */
    TimeHint.挂(t, '卡片上写过的时间', () => 卡片写过的时间(b.bookId || Work.book.id));
    const ev = h('input', { class:'wnw-input', type:'number', step:'1', value:n.ev == null ? '' : n.ev,
      title:'同一条事件轨里比高低：数字小的在上、大的在下；空着就跟序号层级走', placeholder:'可空' });
    const tv = h('input', { class:'wnw-input', type:'number', step:'1', value:n.tv == null ? '' : n.tv,
      title:'同一条时间轨里比高低：数字小的在上、大的在下；空着就贴在轨道线上', placeholder:'可空' });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '事件评级（只用来排）'), ev]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '时间评级（只用来排）'), tv]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '描述'), note]));
    /* 第 17 条：节点也打上共用的标签，标签页那一格里就能找到它 */
    box.appendChild(tagBox(n, () => this.dirty()));
    /* 第 10 条：填充和边框各挑各的；填充挑「无」就交给所在轨自动取色，边框挑「无」回到卡片描边 */
    box.appendChild(dotRow('填充', () => n.fill, v => { n.fill = v; this.dirty(); this.paint(); }, '无 = 跟着所在轨自动取色'));
    box.appendChild(dotRow('边框', () => n.line, v => { n.line = v; this.dirty(); this.paint(); }, '无 = 跟主题的描边'));
    /* 第 12 条：图片只记这一行路径，字节不往项目里搬；点图交给系统默认的看图程序看大图 */
    const ip = h('input', { class:'wnw-input', value:n.img || '', placeholder:'本地图片路径（不复制进项目），也可以点「选图」' });
    const imgSec = h('div', { class:'wnw-row', style:'gap:6px;align-items:center' });
    const drawImg = () => {
      imgSec.innerHTML = '';
      imgSec.appendChild(ip);
      imgSec.appendChild(h('button', { class:'wnw-btn mini', onclick:async () => {
        try{
          const [f] = await window.showOpenFilePicker({ multiple:false,
            types:[{ description:'图片', accept:{ 'image/*':['.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg'] } }] });
          const p = window.FD_APP && typeof FD_APP.pathOf === 'function' ? FD_APP.pathOf(f) : '';
          if(p) setImg(p); else toast('这一张没报回本地路径，在上面那一格里把路径写上也一样');
        }catch(e){ /* 用户按了取消 */ }
      }}, '选图'));
      if(n.img) imgSec.appendChild(h('button', { class:'wnw-btn mini', onclick:() => this.openImg(n) }, '看大图'));
      if(n.img) imgSec.appendChild(h('button', { class:'wnw-btn mini bad', onclick:() => setImg('') }, '去掉'));
      if(n.img) imgSec.appendChild(h('span', { class:'wnw-hint' },
        this.thumbs.has(n.img) ? (baseName(n.img) + ' · 按节点宽等比缩放，这一行自己长高') : '正在读这张图…'));
    };
    const setImg = p => {
      n.img = p; ip.value = p;
      delete n.iw; delete n.ih; delete n.mh;
      this.dirty();
      /* 换了路径就重画：缩略读回来以后 paint 会量真实高度，把这一行的行距顶开 */
      Overlay.close(); this.draw();
      if(p) this.nodeDlg(n);
    };
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '图片'), imgSec]));
    /* 第 16 条：一张节点可以关联好几张设定卡 */
    const cardSec = h('div', { class:'wnw-col' });
    const drawCards = () => {
      cardSec.innerHTML = '';
      for(const id of (n.cards || [])){
        cardSec.appendChild(h('div', { class:'wnw-row', style:'gap:6px;align-items:center' }, [
          h('span', { class:'wnw-hint', style:'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
            title:this.cardName(id) || '这张卡已不在' }, this.cardName(id) || '这张卡已不在'),
          h('button', { class:'wnw-btn mini', onclick:() => { Overlay.close(); this.draw(); Desk.addTab('card', id); } }, '打开'),
          h('button', { class:'wnw-btn mini bad', onclick:() => {
            n.cards = n.cards.filter(x => x !== id); this.dirty(); this.paint(); drawCards();
          }}, '移除')
        ]));
      }
      if(!n.cards.length) cardSec.appendChild(h('div', { class:'wnw-hint' }, '还没关联卡片'));
      cardSec.appendChild(h('button', { class:'wnw-btn mini', style:'align-self:flex-start', onclick:() => {
        this.pickCard(async ids => {
          const 新 = ids.filter(id => !n.cards.includes(id));
          if(!新.length){ toast('这几张已经挂上了'); return; }
          for(const id of 新) n.cards.push(id);
          await this.syncNames(); this.dirty(); this.paint(); drawCards();
        });
      }, html:icoMarkup('plus') + '关联卡片' }));
    };
    drawCards();
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '卡片'), cardSec]));
    drawImg();
    const rel = b.links.filter(x => x.a === n.id || x.b === n.id);
    if(rel.length){
      const rl = h('div', { class:'wnw-col' });
      for(const lk of rel){
        const other = b.nodes.find(x => x.id === (lk.a === n.id ? lk.b : lk.a));
        rl.appendChild(h('div', { class:'wnw-chip', style:'border-color:' + relColor(lk) },
          (lk.custom || lk.kind || '连线') + ' · ' + (other ? other.label : '?')));
      }
      box.appendChild(h('div', { class:'wnw-hint' }, '连着 ' + rel.length + ' 条'));
      box.appendChild(rl);
    }
    Overlay.open('节点', box, [
      h('button', { class:'wnw-btn', onclick:() => {
        const s = sq.value.trim();
        if(s && !seqParts(s)){ toast('序号写成 1、1.2、1.2.3 这样'); return; }
        n.label = name.value.trim() || n.label;
        n.seq = s; n.t = t.value.trim(); n.tt = tr.value; n.et = er.value; n.note = note.value.trim();
        n.ev = ev.value.trim(); n.tv = tv.value.trim(); n.img = ip.value.trim();
        const 警 = this.同年话(n.tt, n.t, n);
        Overlay.close(); this.dirty(); this.draw();
        if(警) toast(警);
      }}, '保存'),
      h('button', { class:'wnw-btn bad', onclick:() => {
        if(!confirm('删掉「' + n.label + '」？连着它的线一起断。')) return;
        Overlay.close(); this.delNode(n, true);
      }}, '删除')].filter(Boolean));
    name.focus();
  }
  /* 第一个序号必须自己敲；敲过之后再加节点就顺着最大的一级事件往后填 */
  suggestSeq(){
    const tops = this.b.nodes.map(n => seqParts(n.seq)).filter(Boolean).map(p => p[0]);
    return tops.length ? String(Math.max(...tops) + 1) : '';
  }
  addDlg(pre){
    const b = this.b;
    const box = h('div', { class:'wnw-col' });
    const name = h('input', { class:'wnw-input', value:(pre && pre.label) || '', placeholder:'节点叫什么' });
    const sq = h('input', { class:'wnw-input', value:this.suggestSeq(), placeholder:'1.2.3，可空' });
    const er = h('select', { class:'wnw-input' }, b.etracks.map((x, i) => h('option', { value:x.id, selected:i === 0 }, x.name)));
    const tr = h('select', { class:'wnw-input' }, b.ttracks.map((x, i) => h('option', { value:x.id, selected:i === 0 }, x.name + ' · ' + modeName(x.mode))));
    const t = h('input', { class:'wnw-input', placeholder:tTip(b.ttracks[0]) });
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '名字'), name]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '事件序号'), sq]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '事件轨'), er]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '时间轨'), tr]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '时间'), t]));
    /* 图17：新建那一格也一样 —— 一进就把卡片上写过的时间列出来，不要求先把卡片关联上来 */
    TimeHint.挂(t, '卡片上写过的时间', () => 卡片写过的时间(b.bookId || Work.book.id));
    Overlay.open('加节点', box, [h('button', { class:'wnw-btn primary', onclick:() => {
      if(!name.value.trim()){ toast('总得有个名字'); return; }
      const s = sq.value.trim();
      if(s && !seqParts(s)){ toast('序号写成 1、1.2、1.2.3 这样'); return; }
      const 新 = { label: name.value.trim(), seq: s, t: t.value.trim(), tt: tr.value, et: er.value,
        cards: (pre && pre.cards) || [] };
      const 警 = this.同年话(新.tt, 新.t, null);
      this.pushNode(新);
      Overlay.close();
      if(警) toast(警);
    }}, '加上')]);
    name.focus();
  }
  /* 不画：批量加节点时压着，最后一并 redraw（图15 一次挑 8 张不该刷 8 遍） */
  pushNode(part, 不画){
    const b = this.b;
    /* fill / line 一律留空开局：空串就是「没挑过色」，画的时候按所在轨自动取底，
       这个语义不能拿自动色去占位，不然挑没挑过就分不出来了。
       格子由 layout 按序号 / 时间算出来，新节点一律不带坐标，拖过才写 */
    const n = Object.assign({ id: uid('nd'), fill:'', line:'', note:'', seq: '', ev: '', tv: '', cards: [], img: '' }, part);
    b.nodes.push(n);
    if(!不画){ this.dirty(); this.draw(); }
    return n;
  }
  /* 图15：两处挑卡都换成能一次挑多张，框子沿用卡片那头那一个（multiCardPickDlg，勾一批 → 保存）。
     顶上那颗「卡片」= 每张各成一个节点；节点详情里那颗 = 把挑中的这几张挂到这个节点上。 */
  async pickCard(pick){
    const ms = await Cards.forBook(Work.book.id);
    if(!ms.length){ toast('这本书还没有卡片'); return; }
    if(pick){
      multiCardPickDlg([], ids => pick(ids), '从卡片取节点');
      return;
    }
    multiCardPickDlg([], ids => {
      const b = this.b;
      const tt = (b.ttracks[0] || {}).id || '', et = (b.etracks[0] || {}).id || '';
      let 加了 = 0;
      for(const id of ids){
        const m = ms.find(x => x.id === id);
        if(!m || b.nodes.some(n => (n.cards || []).includes(id))) continue;
        this.pushNode({ label: m.title, cards: [id], tt, et }, true);
        加了++;
      }
      if(!加了){ toast('这几张已经都在板上了'); return; }
      this.dirty(); this.draw();
    }, '从卡片取节点');
  }
  trackDlg(jump){
    const b = this.b, list = this.tracks();
    const lab = b.mode === 'time' ? '时间轨' : '事件轨';
    const box = h('div', { class:'wnw-col' });
    const draw = () => {
      box.innerHTML = '';
      list.forEach((tr, i) => {
        const nm = h('input', { class:'wnw-input', value:tr.name });
        nm.addEventListener('change', () => { tr.name = nm.value.trim() || (lab + ' ' + (i + 1)); this.dirty(); });
        const mine = b.mode === 'time' ? b.nodes.filter(n => n.tt === tr.id) : b.nodes.filter(n => n.et === tr.id);
        const blk = h('div', { class:'wnw-col', style:'gap:4px' });
        blk.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [
          h('span', { class:'wnw-hint', title:'上下换序也可以直接在板上拖轨道标题左边的上下箭头' }, (i + 1) + ''),
          nm,
          h('span', { class:'wnw-hint' }, mine.length + ' 个'),
          h('button', { class:'wnw-btn mini', title:'挪到上一条', html:icoMarkup('up'), onclick:() => { if(i === 0) return; list.splice(i, 1); list.splice(i - 1, 0, tr); this.dirty(); draw(); this.paint(); } }),
          h('button', { class:'wnw-btn mini', title:'挪到下一条', html:icoMarkup('down'), onclick:() => { if(i === list.length - 1) return; list.splice(i, 1); list.splice(i + 1, 0, tr); this.dirty(); draw(); this.paint(); } }),
          h('button', { class:'wnw-btn mini bad', onclick:async () => {
            if(list.length <= 1){ toast('至少留一条'); return; }
            if(!await wnwAsk('删掉这条轨「' + (tr.name || '') + '」？这一条上的 ' + mine.length + ' 个节点会挪到剩下那条轨去，节点本身不丢。')) return;
            const rest = list.find(x => x !== tr);
            for(const n of mine) { if(b.mode === 'time') n.tt = rest.id; else n.et = rest.id; }
            list.splice(i, 1);
            this.dirty(); draw(); this.paint();
          }}, '删除')]));
        /* 第 9 条：换序拖 ⇅、间距拖 ↕ 或两条带之间那条缝，也能在这儿填准数 —— 拖的是大概，这一格改的是准数。
           这一格填的就是这条轨和下一条轨之间那一截，跟下一条标题上那枚 ↕ 是同一个数；最后一条填了只是在板底多留一段空 */
        const gp = h('input', { class:'wnw-input', type:'number', step:'10', min:'0', max:'1400', style:'width:6em',
          value:String(tr.gap == null ? 0 : tr.gap), title:'0 = 下一条紧贴在这条下面；加多少就在两条之间多留多少' });
        gp.addEventListener('input', () => {
          tr.gap = Math.max(0, Math.min(1400, Math.round(Number(gp.value) || 0)));
          this.dirty(); this.paint();
        });
        blk.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap;gap:6px;align-items:center' }, [
          h('span', { class:'wnw-hint', style:'width:2.6em' }, '间距'), gp,
          h('span', { class:'wnw-hint', style:'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
            '像素 · 板上也能拖下一条标题左边那枚 ↕，或两条带之间那条缝'),
          h('button', { class:'wnw-btn mini', title:'回到贴着下一条', onclick:() => { tr.gap = 0; this.dirty(); draw(); this.paint(); } }, '归零')
        ]));
        box.appendChild(blk);
      });
    };
    draw();
    Overlay.open(lab, box, [h('button', { class:'wnw-btn', onclick:() => {
      const id = uid(b.mode === 'time' ? 't' : 'e');
      list.push(b.mode === 'time' ? { id, name:'第 ' + (list.length + 1) + ' 条时间轨', mode:'real', gap:0 }
        : { id, name:'第 ' + (list.length + 1) + ' 条事件轨', gap:0 });
      this.dirty(); draw(); this.paint();
    }, html:icoMarkup('plus') + lab.slice(0, 3) }), h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); this.draw(); } }, '好')]);
  }
  /* 换读法：把这条轨上已经写了的时间列出来，认不出的标红，逐条改完再走 */
  setMode(tr, m){
    const b = this.b;
    if(tr.mode === m) return;
    const old = tr.mode;
    tr.mode = m;
    const ns = b.nodes.filter(n => n.tt === tr.id && n.t);
    if(!ns.length){ this.dirty(); this.paint(); return; }
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { class:'wnw-hint' }, '从「' + modeName(old) + '」切到「' + modeName(m) + '」，这条轨上 ' + ns.length + ' 条时间要逐条看：'));
    const list = h('div', { class:'wnw-col' });
    const draw = () => {
      list.innerHTML = '';
      for(const n of ns){
        const i = h('input', { class:'wnw-input', value:n.t, placeholder:tTip(tr) });
        const mark = h('span', { class:'wnw-hint' });
        const chk = () => { const ok = timeVal(tr, i.value.trim()) !== null; mark.textContent = ok ? '认得出' : '认不出'; mark.classList.toggle('bad', !ok); };
        i.addEventListener('input', () => { n.t = i.value.trim(); this.dirty(); chk(); });
        chk();
        list.appendChild(h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [h('span', { class:'wnw-hint nm' }, cut(n.label, 12)), i, mark]));
      }
    };
    draw();
    box.appendChild(list);
    Overlay.open('切时间读法', box, [h('button', { class:'wnw-btn primary', onclick:() => { Overlay.close(); this.dirty(); this.draw(); } }, '改好了'),
      h('button', { class:'wnw-btn mini', onclick:() => { tr.mode = old; Overlay.close(); this.dirty(); this.paint(); } }, '切回去')]);
  }
  /* 架空历法：一年几个月、每月几天，存成预设下次直接挑 */
  async calDlg(tr){
    const presets = (await State.get('bd.cal', [])) || [];
    const c = tr.cal || {};
    const box = h('div', { class:'wnw-col' });
    const mo = h('input', { class:'wnw-input', type:'number', min:'1', max:'48', value:c.months || 12, style:'width:80px' });
    const dy = h('input', { class:'wnw-input', value:c.days || '30', placeholder:'30 或 31,28,31' });
    const nm = h('input', { class:'wnw-input', value:c.name || '', placeholder:'给这套历法起个名' });
    const pick = h('select', { class:'wnw-input' }, [h('option', { value:'' }, '（挑已存好的预设）')]
      .concat(presets.map((p, i) => h('option', { value:String(i), selected:c.name === p.name }, p.name + ' · ' + p.months + '月/' + p.days))));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '每年几个月'), mo]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '每月几天'), dy]));
    box.appendChild(h('div', { class:'wnw-hint' }, '写一个数表示每月相同；逗号隔开逐月给，多出来的月照最后一个数'));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '预设名'), nm]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '预设'), pick]));
    const save = () => {
      tr.cal = { months: +mo.value || 12, days: dy.value.trim() || '30', name: nm.value.trim() };
      this.dirty(); this.paint();
    };
    pick.addEventListener('change', () => {
      const p = presets[+pick.value]; if(!p) return;
      mo.value = p.months; dy.value = p.days; nm.value = p.name; save();
    });
    for(const i of [mo, dy]) i.addEventListener('change', save);
    Overlay.open('架空历法', box, [
      h('button', { class:'wnw-btn', onclick:async () => {
        const name = nm.value.trim(); if(!name){ toast('先起个名'); return; }
        const row = { name, months: +mo.value || 12, days: dy.value.trim() || '30' };
        const arr = ((await State.get('bd.cal', [])) || []).filter(x => x.name !== name);
        arr.push(row); State.set('bd.cal', arr);
        save(); toast('已存好：' + name); Overlay.close();
      }}, '存为预设'),
      h('button', { class:'wnw-btn primary', onclick:() => { save(); Overlay.close(); this.draw(); } }, '好')]);
  }
  autoLayout(){
    const b = this.b;
    for(const n of b.nodes){ delete n.x; delete n.y; }
    this.dirty(); this.paint();
    toast(b.mode === 'time' ? '已按时间收回轨道原位' : '已按事件序号重摆');
  }
  centerOnLast(){
    const last = this.b.nodes[this.b.nodes.length - 1];
    if(!last || !this.scroller) return;
    /* 新节点自己不带坐标，得从 layout 拿它落在哪一格 */
    const p = this.layout().pos.get(last.id);
    if(!p) return;
    this.scroller.scrollLeft = Math.max(0, p.x * (this.b.zoom || 1) - 120);
    this.scroller.scrollTop = Math.max(0, p.y * (this.b.zoom || 1) - 80);
  }
  exportDlg(){
    const b = this.b;
    const lines = ['【' + b.title + '】', ''];
    if(b.mode === 'time'){
      for(const tr of b.ttracks){
        const ns = this.trackNodes(tr.id);
        if(!ns.length) continue;
        lines.push('■ ' + tr.name + '（' + modeName(tr.mode) + '）');
        for(const n of ns) lines.push('  · ' + (n.t ? n.t + ' ｜ ' : '') + n.label + (n.note ? '（' + n.note + '）' : ''));
        lines.push('');
      }
    } else {
      for(const tr of b.etracks){
        const ns = this.trackNodes(tr.id).filter(n => seqParts(n.seq));
        if(!ns.length) continue;
        lines.push('■ ' + tr.name);
        for(const n of ns.slice().sort((x, y) => seqCmp(x.seq, y.seq)))
          lines.push('  · ' + n.seq + ' ' + n.label + (n.note ? '（' + n.note + '）' : ''));
        lines.push('');
      }
      const un = b.nodes.filter(n => !seqParts(n.seq));
      if(un.length){
        lines.push('■ 未编号');
        for(const n of un) lines.push('  · ' + n.label + (n.note ? '（' + n.note + '）' : ''));
        lines.push('');
      }
    }
    if(b.links.length){
      lines.push('■ 关系');
      for(const lk of b.links){
        const a = b.nodes.find(x => x.id === lk.a), z = b.nodes.find(x => x.id === lk.b);
        lines.push('  · ' + (a ? a.label : '?') + ' —' + (lk.custom || lk.kind || '') + '→ ' + (z ? z.label : '?'));
      }
    }
    const txt = lines.join('\n');
    Overlay.open('导出看板', h('pre', { class:'wnw-out' }, txt), [copyBtn(txt, '复制'), h('button', { class:'wnw-btn', onclick:() => download(b.title + '.txt', txt) }, '下载')]);
  }
}
Views.reg('board', {
  name:'看板', icon:'board', dockable:true, compact:true, compactBelow:420,
  title:async (ref) => { const b = ref ? await Boards.get(ref) : null; return b ? b.title : '看板'; },
  render(host, ref, ctx){ new BoardView(host, ctx).boot(ref); }
});

/* ---------- 左栏：看板列表 ---------- */
Views.reg('panel-board', {
  name:'看板', icon:'board', dockable:false,
  title:() => '看板',
  render(host, ref, ctx){ new BoardPanel(host, ctx).boot(); }
});
class BoardPanel{
  constructor(host, ctx){
    this.host = host; this.ctx = ctx;
    /* 选中集和锚点不进门档：这张清单重开一次就该是空的。
       order 是这一趟摆出来的板子顺序（就是当前这本书名下的那些），rows 留着好念板名。 */
    this.sel = new Set(); this.anchor = null; this.order = []; this.rows = new Map();
    this.rowEl = new Map(); this.pickEl = null;
  }
  async boot(){ this.draw(); if(this.ctx.on) this.ctx.on('desk:boards', () => this.list()); }
  draw(){
    this.host.innerHTML = '';
    const { body } = panelShell(this.host, '看板', [h('button', { class:'wnw-btn mini', onclick:() => this.add(), html:icoMarkup('plus') })]);
    this.listBox = h('div', {});
    body.appendChild(this.listBox);
    /* 这张清单登记给 Ctrl+A：指针在它身上某一行按下过，Ctrl+A 才归它（画布那份另有主人） */
    this.ownPick(this.listBox);
    this.list();
  }
  async list(){
    const all = await Boards.forBook(Work.book.id);
    this.listBox.innerHTML = '';
    /* 选中集不许跨这一趟留残：换了书、删了板，手里不许还攥着屏幕上没摆出来的那块 */
    this.rows = new Map(all.map(m => [m.id, m]));
    this.order = all.map(m => m.id);
    if(this.sel.size) this.sel = new Set(this.order.filter(id => this.sel.has(id)));
    this.rowEl = new Map();
    if(!all.length){ this.listBox.appendChild(h('div', { class:'wnw-hint' }, '还没有看板，点上面的新增按钮开一块')); return; }
    for(const m of all){
      const b = await Boards.get(m.id);
      /* 单击只把手挪到这一块板（从前这一下是把板开成一页），双击做的才是从前那一下；
         行尾那个停靠按钮和它的走法一个字没动。 */
      const el = h('div', { class:'wnw-ci' + (this.sel.has(m.id) ? ' sel' : ''),
        onclick:ev => this.click(m, ev), ondblclick:() => Desk.addTab('board', m.id),
        oncontextmenu:ev => { ev.preventDefault(); this.rowMenu(m, ev); } }, [
        h('span', { class:'nm' }, m.title), h('span', { style:'flex:1' }),
        h('span', { class:'wnw-hint' }, (b ? b.nodes.length : 0) + ' 节点'),
        h('button', { class:'wnw-btn mini', title:'停靠到右栏', html:icoMarkup('dock'), onclick:ev => { ev.stopPropagation(); Desk.dockIt('board', m.id, m.title); } })]);
      this.rowEl.set(m.id, el);
      this.listBox.appendChild(el);
    }
  }
  /* 这一张列表登记给 Ctrl+A（清单每重画一次是个新容器，认一下再挂） */
  ownPick(el){
    if(this.pickEl !== el){
      this.pickEl = pickBind(el);
      if(!BdPick.includes(this)) BdPick.push(this);
      bdKeys();
    }
    return el;
  }
  pickAll(){
    this.sel = new Set(this.order);
    this.anchor = this.order[this.order.length - 1] || null;
    this.markSel();
  }
  pickClear(){ if(!this.sel.size) return; this.sel.clear(); this.anchor = null; this.markSel(); }
  markSel(){ for(const [id, el] of this.rowEl) el.classList.toggle('sel', this.sel.has(id)); }
  /* 单击只换选中集、Ctrl/Cmd 逐个加减、Shift 从锚点按这一趟摆出来的顺序连一片（和书架那一档同一口径） */
  click(m, ev){
    const id = m.id, all = this.order;
    if(ev.shiftKey){
      const i = all.indexOf(this.anchor), j = all.indexOf(id);
      if(i >= 0 && j >= 0){
        this.sel.clear();
        for(let k = Math.min(i, j); k <= Math.max(i, j); k++) this.sel.add(all[k]);
        this.markSel(); return;
      }
    }
    if(ev.ctrlKey || ev.metaKey){
      if(this.sel.has(id)) this.sel.delete(id); else this.sel.add(id);
    } else {
      this.sel.clear(); this.sel.add(id);
    }
    this.anchor = id;
    this.markSel();
  }
  /* 右键三条：在新标签页打开 / 在停靠打开 / 删掉这块板。
     kind 是 'board'、ref 就是这块板的 id —— 和「＋打开内容」里那一格看板、行尾那个停靠按钮同一条路，
     看板这一档 dockable 不是 false，所以「在停靠打开」摆得出来也真挂得上。
     手里两块以上、右键点的又正在手里，头顶多一条批量删除。 */
  rowMenu(m, ev){
    const many = this.sel.size > 1 && this.sel.has(m.id);
    Menu.open(ev.clientX, ev.clientY, [
      many ? { label:'选中 ' + this.sel.size + ' 块 · 批量删除', fn:() => this.batchDel() } : null,
      many ? { sep:1 } : null,
      { label:'在新标签页打开', fn:() => Desk.addTab('board', m.id) },
      { label:'在停靠打开', fn:() => Desk.dockIt('board', m.id, m.title) },
      { sep:1 },
      { label:'删掉这块看板', fn:() => this.del(m) }
    ]);
  }
  async del(m){
    if(!confirm('删掉「' + m.title + '」？这块板上的节点、连线、组都会一起没。')) return;
    this.shut(m.id);
    await Boards.del(m.id);
    this.sel.delete(m.id);
    Bus.emit('desk:boards');
  }
  /* 一把删掉手里这些：确认只弹一次、说清几块，然后逐块走上面那条删除的走法，删完选中集清空 */
  async batchDel(){
    const ids = [...this.sel];
    const names = ids.map(id => (this.rows.get(id) || {}).title).filter(Boolean);
    if(!confirm('删掉选中的 ' + ids.length + ' 块看板？这些板上的节点、连线、组会一起没：\n' + names.join('、'))) return;
    for(const id of ids){ this.shut(id); await Boards.del(id); }
    this.sel.clear(); this.anchor = null;
    Bus.emit('desk:boards');
    toast('已删掉 ' + ids.length + ' 块看板');
  }
  /* 板子删了，指着它的标签和右栏停靠得一起收掉：留着的是「这块看板不存在了」那一页。
     从前这张清单连一个删按钮都没有，删不动也就没人碰过这一层。
     停靠那几块照 dropKind 的样子先把活实例解掉再抹行 —— 只抹表的话那块板还在暗处活着，
     下一次重画右栏它还会去读那块已经不存在的板。 */
  shut(id){
    for(const l of Desk.leaves(Desk.st.tree))
      for(let i = l.tabs.length - 1; i >= 0; i--) if(l.tabs[i].kind === 'board' && l.tabs[i].ref === id) Desk.closeTab(l, i);
    const gone = Desk.st.dock.filter(d => d.kind === 'board' && d.ref === id);
    if(!gone.length) return;
    for(const it of gone){
      const api = Desk.live.get('dock.' + it.id);
      try{ api && api.unmount && api.unmount(); }catch(e){}
      Desk.live.delete('dock.' + it.id);
    }
    Desk.st.dock = Desk.st.dock.filter(d => !gone.includes(d));
    Desk.save(); Desk.drawRight();
  }
  async add(){
    const box = h('div', { class:'wnw-col' });
    const name = h('input', { class:'wnw-input', value:Work.book.title + ' · 看板' });
    const mode = h('select', { class:'wnw-input' }, [h('option', { value:'event' }, '事件线为主（一条轨一条长带）'), h('option', { value:'time' }, '时间线为主（分行）')]);
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '名字'), name]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '默认读法'), mode]));
    Overlay.open('新看板', box, [h('button', { class:'wnw-btn primary', onclick:async () => {
      const b = await Boards.create(name.value.trim() || '新看板', Work.book.id, mode.value);
      Overlay.close(); Bus.emit('desk:boards'); Desk.addTab('board', b.id);
    }}, '开板')]);
    name.focus();
  }
}

/* ============================================================
   左栏：查找 —— 正文 / 章纲 / 卡片 / 灵感一起找
   ============================================================ */
Views.reg('panel-find', {
  name:'查找', icon:'findAll', dockable:false,
  title:() => '查找',
  render(host, ref, ctx){ new FindPanel(host, ctx).boot(); }
});
class FindPanel{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.q = ''; }
  boot(){ this.draw(); }
  draw(){
    this.host.innerHTML = '';
    const { body } = panelShell(this.host, '查找');
    const inp = h('input', { class:'wnw-input', type:'search', placeholder:'找正文、章纲、卡片、灵感', style:'width:100%' });
    inp.value = this.q;
    inp.addEventListener('input', () => { this.q = inp.value; this.run(); });
    body.appendChild(inp);
    this.listBox = h('div', { style:'margin-top:8px' });
    body.appendChild(this.listBox);
    if(this.q) this.run();
  }
  async run(){
    const q = this.q.trim();
    this.listBox.innerHTML = '';
    if(q.length < 1){ this.listBox.appendChild(h('div', { class:'wnw-hint' }, '打点字再找')); return; }
    const hits = [];
    for(const h1 of await Work.search(q)) hits.push({ g:h1.kind, label:h1.chTitle, text:h1.text, go:() => Desk.addTab('ch', h1.ch) });
    for(const m of await Cards.forBook(Work.book.id))
      if(m.title.includes(q) || chips(m.aliases).includes(q)) hits.push({ g:'卡片', label:m.title, text:m.tplName || '', go:() => Desk.addTab('card', m.id) });
    for(const m of await Insp.forBook(Work.book.id))
      if(String(m.text).toLowerCase().includes(q.toLowerCase())) hits.push({ g:'灵感', label:cut(m.text, 26), text:agoText(m.at), go:() => Desk.addTab('insps', null) });
    if(!hits.length){ this.listBox.appendChild(h('div', { class:'wnw-hint' }, '没有「' + q + '」')); return; }
    const byG = new Map();
    for(const x of hits){ if(!byG.has(x.g)) byG.set(x.g, []); byG.get(x.g).push(x); }
    for(const [g, arr] of byG){
      this.listBox.appendChild(h('div', { class:'wnw-mini-h' }, g + ' · ' + arr.length));
      for(const x of arr.slice(0, 30))
        this.listBox.appendChild(h('div', { class:'wnw-hit', onclick:() => x.go() }, [
          h('span', { class:'nm' }, x.label), h('span', { style:'flex:1' }), h('span', { class:'wnw-hint' }, cut(x.text, 18))]));
    }
  }
}

addCss(`
.wnw-bd-scroll{flex:1 1 auto;min-height:0;overflow:auto;background:var(--page-bg);
  background-image:radial-gradient(var(--hair-color) 1px, transparent 1px);background-size:22px 22px;}
.wnw-bd-canvas{position:relative;transform-origin:0 0;}
.wnw-bd-links{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:3;}
.wnw-bd-link{fill:none;stroke-width:2;cursor:pointer;pointer-events:stroke;}
.wnw-bd-link:hover,.wnw-bd-link.hot{stroke-width:4;}
/* 图18：字样看不清的那两处一起改 —— 从前 11 像素、跟线同色、还压在曲线上，看着就是一团糊。
   现在走正文字色（线自己还是那条色，认关系看线就够），再围一圈画布底色的光晕：
   paint-order 让描边先铺、字盖在上面，线从字底下穿过也读得清。摆哪儿由 linkGeom 逐条定，
   所以 text-anchor 不在这里钉死（钉在这儿会把元素上那一句盖掉）。 */
.wnw-bd-lab{font-size:12.5px;font-weight:600;fill:var(--text);pointer-events:none;
  stroke:var(--page-bg);stroke-width:4px;stroke-linejoin:round;paint-order:stroke;}
/* 组：一整块实色底、无边框（第 13 条）。颜色直接挂在元素自己身上（--gc），
   没挑过就用槽位 1 派的那层浅底 —— 淡到看不见等于没颜色，所以底一律铺实的。
   只给一点极浅的阴影，让节点浮在组底上；边框不加，厚边框和拟物都不要。 */
.wnw-bd-group{position:absolute;border:0;border-radius:var(--r-card,5px);z-index:2;cursor:grab;
  background:var(--gc, color-mix(in srgb, var(--slot-1) 22%, var(--card-bg)));
  box-shadow:var(--sh-card,0 10px 22px -20px rgba(0,0,0,.45));}
.wnw-bd-group.hot{outline:var(--bw) dashed var(--accent);}
.wnw-bd-group .gn{position:absolute;left:7px;top:2px;padding:0 6px;border-radius:var(--r-pill,5px);
  background:var(--candidate-bg);color:var(--text-light);font-size:.7em;font-weight:800;cursor:pointer;line-height:1.6;}
.wnw-bd-node{position:absolute;border:var(--bw) solid var(--card-border);border-radius:var(--r-card);background:var(--card-bg);
  padding:5px 8px;cursor:grab;user-select:none;z-index:4;overflow:hidden;}
/* 挑中那一档走 outline，取值和书架、章栏那两处一句不差。
   从前是 box-shadow:0 0 0 2px var(--accent) 再顺手把 border-color 也改成强调色：
   border-color 那半压根生效不了 —— 节点这一圈描边是用户自己挑的色，画的时候直接写在 style 上，
   样式表压不住行内取值；那圈阴影环又要和组底、卡片自己的投影挤在一处，缩到一半几乎看不出来。
   outline 不占布局、也不碰 border，挑过的描边色原样留着。
   用 --text 不用 --accent：强调色在这块板上已经归「悬停」和「连线模式点中的那一个」（.pick），
   两档撞色就分不出「挑中」和「指着」。
   精简版那一行（.wnw-ci，看板的另一种长相）和左栏那块板的清单行是同一个类，跟着走同一句。 */
.wnw-bd-node.sel,.wnw-ci.sel{outline:2px solid var(--text);outline-offset:-2px;}
/* 底是实色，字色就跟着底的亮度走：深底翻白、浅底压黑（画的时候量出来的，见 bgLum）。
   浅底在明主题里就用主题自己的字色（本来就是深字），暗主题里主题字色是浅的，压成黑字才读得清。
   小字那几行原本吃主题的强调色和浅灰，压在深底上读不清，一起换成实色。 */
.wnw-bd-node.dk{color:#fff;}
.wnw-bd-node.lt{color:var(--text);}
.wnw-root[data-wnw-theme=dark] .wnw-bd-node.lt{color:#1a1a1a;}
.wnw-bd-node.dk .tm{color:#cfe0ff;}
.wnw-bd-node.dk .tm.bad{color:#ffb1a8;}
.wnw-bd-node.dk .nt,.wnw-bd-node.dk .cd{color:#d7dbe2;}
.wnw-bd-node.dk .im.miss{background:#3a3e46;border-color:#6b7280;color:#d7dbe2;}
/* 图片按节点宽等比缩放，节点总高跟着长（第 12 条） */
.wnw-bd-node .im{display:block;width:100%;height:auto;margin:0 0 4px;border-radius:calc(var(--r-card) - 2px);cursor:zoom-in;object-fit:cover;}
.wnw-bd-node .im.miss{display:flex;align-items:center;justify-content:center;min-height:44px;aspect-ratio:4 / 3;
  background:var(--candidate-bg);border:var(--hair-w) dashed var(--hair-color);color:var(--text-light);font-size:.72em;cursor:default;}
.wnw-bd-node .nm{font-weight:700;line-height:1.35;word-break:break-word;}
.wnw-bd-node .tm{font-size:.78em;color:var(--accent-text,var(--accent));}
.wnw-bd-node .tm.bad{color:var(--bad);font-weight:700;}
.wnw-bd-node .nt{font-size:.78em;color:var(--text-light);line-height:1.4;max-height:3.2em;overflow:hidden;}
.wnw-bd-node .cd{font-size:.78em;color:var(--text-light);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.wnw-bd-node:hover{border-color:var(--accent);}
.wnw-bd-node.drag{cursor:grabbing;border-color:var(--accent);}
/* 悬停才露出来的删除角标 */
.wnw-bd-node .dl{position:absolute;right:3px;top:2px;display:none;width:18px;height:18px;padding:0;border:0;border-radius:var(--r-btn);
  background:var(--card-bg);color:var(--text-light);cursor:pointer;font-size:.78em;line-height:1;}
.wnw-bd-node:hover .dl{display:block;}
.wnw-bd-node .dl:hover{color:var(--bad);}
/* 时间线的绑定点 + 节点拖走后牵的一截虚线 */
.wnw-bd-anchor{stroke:var(--card-bg);stroke-width:2;}
.wnw-bd-stub{stroke:var(--hair-color);stroke-width:2;stroke-dasharray:4 3;}
.wnw-bd-node.pick{border-color:var(--accent);background:var(--accent-light);}
.wnw-bd-canvas.linking .wnw-bd-node{cursor:crosshair;}
/* 自动父子线：细、淡，跟手画的关系线两种长相 */
.wnw-bd-tree{fill:none;stroke:var(--text-light);stroke-width:1.5;opacity:.5;}
.wnw-bd-head{position:absolute;left:6px;display:flex;gap:6px;align-items:center;height:24px;z-index:6;}
.wnw-bd-head .nm{font-size:.82em;font-weight:800;color:var(--accent-text,var(--accent));cursor:pointer;}
/* 轨道标题左边那两枚把手：⇅ 拖换序、↕ 拖改这条轨和上面紧邻那一条的距离。灰字 + 悬停微亮，一眼认得出能抓。
   ↕ 就用 U+2195 这个字符本身，不拿图标顶 */
.wnw-bd-head .gh{color:var(--text-light);font-size:.9em;padding:0 3px;border-radius:var(--r-btn);line-height:1.5;user-select:none;}
.wnw-bd-head .gh:hover{color:var(--accent-text,var(--accent));background:var(--candidate-bg);}
.wnw-bd-head .gh.move{cursor:grab;}
.wnw-bd-head .gh.gap{cursor:ns-resize;}
.wnw-bd-head select.mini,.wnw-bd-head button.mini{height:22px;font-size:.76em;padding:0 5px;width:auto;}
/* 破坏性动作：描边不变，只有文字变红 */
.wnw-btn.bad{color:var(--bad);}
/* 两条带之间那条缝：整条都能按住上下拖，悬停亮一下就够，不写字数 */
/* 缝这一条要压在节点底下（节点 z4）：它高 16 像素、摆的位置是下一条带往上 43 像素，
   两轨之间挤成 0 的时候那 16 像素正好盖在上一条带最底下一排节点身上 —— 从前它 z5 盖在上面，
   在那一块按下手去拖的是间距、点不开节点，看着就像节点最下面一条边「点不动」。 */
.wnw-bd-seam{position:absolute;left:0;right:0;height:16px;display:flex;align-items:center;cursor:ns-resize;z-index:3;}
.wnw-bd-seam:hover{background:var(--accent-light);}
.wnw-bd-rowline{position:absolute;left:0;right:0;border-top:var(--hair-w) dashed var(--hair-color);pointer-events:none;z-index:1;}
.wnw-bd-bandline{position:absolute;left:0;right:0;border-top:var(--hair-w) dashed var(--hair-color);pointer-events:none;z-index:1;}
.wnw-hit{display:flex;gap:8px;align-items:center;padding:5px 8px;border-radius:var(--r-card);cursor:pointer;}
.wnw-hit:hover{background:var(--candidate-bg);}
.wnw-hit .nm{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-bd-head .nm.nm{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-row .nm.nm{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-hint.bad{color:var(--bad);}
`);
