/* ---------- 词格（为写的歌词模式）：明文那份格式 + 它的文件层 ----------
   结构是他定死的四级：段 → 行 → 逗 → 格，格是最里层那个可拆可合的单位。
   文件形状也是他定死的：一句占两行，时值在上、词在下 ——
     【主歌1】
     注 = 这一遍轻一点
     时 = 480 420 390 410|620 540 - -
     词 = 真爱悲哀|人海醒来
   「注 = 」那一行是可选的段前说明，只管它下面那一行（主歌 / 副歌 / 换气 / 提醒都写这儿），一行上面顶多一行。
   行前面还能挂四行可选标记，都在这一行的时行上面：「音 = 」注音（一格一段，跟词行同一套格语法）、「译 = 」翻译（整行一条，界面上摆在行的下面，不给改）、
   「人 = 」演唱者、「唱 = 」唱法（独唱 / 合唱 / 和声）。后两行和【段名】一样是「往后挂」的 —— 不改就跟着上一行走，
   写出去只在变了的那一行前面补一行；独唱在明文里就是不写「唱 = 」（默认档不占行），独唱只许一个演唱者、合唱两个以上。
   「节 = 」是这一格唱几个音节（一格一个数，没标的写减号），整句填写那一档按它把横线上的一串字拆回格子。
   逗的正记号是竖线，两行共用；没打竖线、又能按空格切成「一格一字」的几截时，空格也算逗界（他在记事本里顺手敲的那种不必改成竖线就能认）。
   一格一字的行连着写（词 = 真爱悲哀|人海醒来 看着就是一句）；格子里但凡配过时值、或者有一格装了两字以上（拖出来的合并格，
   用斜杠连着写真爱 → 真/爱），就改成格之间空一格的写法，并且没配时值的那一格写一个减号占位 —— 数不串位。
   一个时值都没配的作词行，时行整行留空（记事本里一眼看出这一行还没配时值）。
   两边数对不上（时值的数比格少、逗号数挤歪了）只标出来，不拦着存 —— 他要的是记事本打得开、自己改得动。
   存放：宿主用户数据目录底下的 lyrics\ 一层平铺，一个词格一个文件（他给的原路径是 data\userdata-wnw\lyrics\，
   那一条今天到不了，缘由写在下面文件层那一段注释里，等他定）。
   解析和落盘都只管这份明文，界面在别处（词格那一排的格子）。 */

/* 一行词的树：{ seg:'主歌1', note:'这一遍轻一点', clauses:[ { cells:[ { t:'真', ms:480 }, … ] }, … ] }
   note 是没写就不摆的键（空串不算一项，否则明文往返比的是「有没有这个键」而不是内容）。
   整首：{ title:'', lines:[ … ] } —— lines 里保持段标签往后挂的形状，序列化时只在段变了的那一行前面补一行【段名】。 */
const LYRIC_HEAD = { time:'时', word:'词', note:'注', start:'起', beat:'拍', roman:'音', trans:'译', who:'人', how:'唱', syl:'节', cut:'分', part:'子' };
/* 一格内部的音节细分（外26 第 9、10 条）：
   cut = 这一格里在字第几个之后分开（可以好几处，界面上画成虚线；双击那一格进分音节这一档、在要分的地方单击落一刀，再双击出去）；
   pm  = 分开之后每一子唱多少毫秒（拍点打出来的就是这一串；没打就照这一格总时长平摊）。
   整体仍然是一格 —— 不把一个词拆成好几块，只有虚线画在分开的地方；而拍点、逐字 ttml 里每一子和
   一整格同等对待，各自有开始结束。 */
function lyricParts(c){
  const t = String((c && c.t) || '');
  const 字 = Array.from(t);
  const cuts = (c && Array.isArray(c.cut) ? c.cut : [])
    .map(x => Math.round(Number(x) || 0)).filter(x => x > 0 && x < 字.length).sort((a, b) => a - b);
  const 去 = []; for(const x of cuts) if(!去.length || 去[去.length - 1] !== x) 去.push(x);
  const n = 去.length + 1;
  const texts = [], durs = [];
  let prev = 0;
  for(const x of 去.concat([字.length])){ texts.push(字.slice(prev, x).join('')); prev = x; }
  const total = LyricFmt.okMs(c && c.ms) ? c.ms : 0;
  const pm = (c && Array.isArray(c.pm) ? c.pm : []).map(x => LyricFmt.okMs(x) ? Math.max(0, Math.round(x)) : -1);
  if(pm.length === n && pm.every(x => x >= 0) && pm.some(x => x > 0)){ for(let i = 0; i < n; i++) durs.push(pm[i]); }
  else if(total){ const each = Math.floor(total / n);
    for(let i = 0; i < n; i++) durs.push(i === n - 1 ? total - each * (n - 1) : each); }
  else for(let i = 0; i < n; i++) durs.push(0);
  return { n, 去, texts, durs, total:durs.reduce((a, b) => a + b, 0), 有分:n > 1 };
}
/* 一格里第 i 子的起止（相对这一格开口那一刻）；没细分就就是整格那一段 */
function lyricPartWin(c, i){
  const p = lyricParts(c);
  let s = 0;
  for(let k = 0; k < i; k++) s += p.durs[k] || 0;
  return { in:s, out:s + (p.durs[i] || 0) };
}
/* 唱法三档：独唱（默认，只许一个演唱者）、合唱（可以好几个演唱者）、和声（背景人声，也可以好几个）。
   他钉的两条：全句默认都是独唱，不动它就不许多出别的档；独唱只许一个演唱者，合唱才许多个。
   树里独唱就是「没有这个键」—— 和段前说明、翻译同一个办法，空值不占明文那一行。 */
const LYRIC_HOW = { solo:'独唱', choir:'合唱', bg:'和声' };
const LYRIC_HOWS = ['solo', 'choir', 'bg'];
const LYRIC_LAT = /[A-Za-z\u00c0-\u024f'’-]/;   /* 西文那一档：连着的字母（带撇号、连字符）算一格，不拆字 */
const LyricFmt = {
  /* 「这一个格到底有没有时值」只认这一个判法：必须是真数字。
     别用 isFinite(m) 单判 —— JS 里 isFinite(null) 是 true（null 先被当成 0），
     那一判会把空着的那些格当成「有值」，写出去就成一串 null 的字面（外23 自测页量到的，就这么栽的）。 */
  okMs(m){ return typeof m === 'number' && isFinite(m); },
  /* 拆一行里的格：数按空格分，字按字分（西文那种整词算一格，不拆字 —— 和音乐遥控器甲-2 定的按词切同一个口径） */
  timeCells(s){
    const out = [];
    for(const tk of String(s || '').trim().split(/\s+/)){
      if(!tk) continue;
      const n = Number(tk);
      out.push(isFinite(n) && n >= 0 ? Math.round(n) : null);
    }
    return out;
  },
  wordCells(s){
    const out = [];
    let buf = '';
    for(const ch of String(s || '')){
      if(LYRIC_LAT.test(ch)){ buf += ch; continue; }
      if(buf){ out.push(buf); buf = ''; }
      if(/\s/.test(ch)) continue;
      out.push(ch);
    }
    if(buf) out.push(buf);
    return out;
  },
  /* 记号就四个，都在词行那一行里用：
       竖线 |      —— 逗的界（时值那行同一个位置也用它）
       空格        —— 格的界
       斜杠 /      —— 并到同一格（他在格子上拖出来的「合」：一格装两字以上）
       下划线 _    —— 单独一个 token 时是「这一格空着」
     格界在词行里认的是「没被反斜杠顶住的空白」：空格、制表符、连着好几个空格都算，记事本里爱怎么排怎么排，不会把两格并成一格。
     词本身撞上这四个字符或者带空格（字幕里的分隔斜杠、合并格中间那个空格、真的下划线），
     就用反斜杠顶住下一个字符，顶住的算字不算记号：
       Oh/\ 不     —— 一格，内容是「Oh 不」；  \/  —— 一格，内容就是一个斜杠； \_ —— 一格，内容就是一个下划线。
     西文连写天生是一格，不用记号（真/爱 是一格两字，have 是一格四字母）。 */
  bindCell(t){
    const s = String(t || '');
    if(!s) return '_';   /* 空的这一格也要占一个位置，不占就被吞掉了 */
    let out = '', prev = null;
    for(const ch of Array.from(s)){
      if(prev !== null && !(LYRIC_LAT.test(prev) && LYRIC_LAT.test(ch))) out += '/';
      out += (/[\\/|_\s]/.test(ch) ? '\\' + ch : ch);
      prev = ch;
    }
    return out;
  },
  /* 读回一格：见反斜杠就把下一个字符当字，见斜杠就把下一个字符并进同一格，见没顶住的空格就换一格 */
  cellsOfPart(s){
    const str = String(s || ''), out = [];
    let buf = '', prev = null, glue = false;
    for(let i = 0; i < str.length; i++){
      let ch = str[i];
      if(ch === '\\'){ if(i + 1 >= str.length) break; ch = str[++i]; glue = true; }
      else if(ch === '/'){ glue = true; continue; }
      else if(/\s/.test(ch)){ if(buf){ out.push(buf); buf = ''; } prev = null; glue = false; continue; }
      else if(ch === '_' && !buf && prev === null){ out.push(''); continue; }   /* 单独一个下划线 = 这一格空着 */
      if(!glue && buf && prev !== null && !(LYRIC_LAT.test(prev) && LYRIC_LAT.test(ch))){ out.push(buf); buf = ''; }
      buf += ch; prev = ch; glue = false;
    }
    if(buf) out.push(buf);
    return out;
  },
  /* 按竖线切逗，反斜杠顶住的那一根不算界 */
  splitClauses(body){
    const str = String(body || ''), out = [];
    let buf = '';
    for(let i = 0; i < str.length; i++){
      const ch = str[i];
      if(ch === '\\'){ buf += ch + (i + 1 < str.length ? str[++i] : ''); continue; }
      if(ch === '|'){ out.push(buf); buf = ''; continue; }
      buf += ch;
    }
    out.push(buf);
    return out;
  },
  /* 挨着写会不会自己黏成一格：前一格的尾字和后一格的首字都是西文字母就得空一格，其余连着写正好看。
     后一格开头是反斜杠（它顶住的是空格、斜杠这些）也必须空一格 —— 不空就会被上一格吸过去。 */
  needGap(a, b){
    if(String(b || '').startsWith('\\') || a === '_' || b === '_') return true;
    const x = Array.from(String(a || '')), y = Array.from(String(b || ''));
    return !!x.length && !!y.length && LYRIC_LAT.test(x[x.length - 1]) && LYRIC_LAT.test(y[0]);
  },
  /* 明文 → 树。认得三类行：【段名】、时行、词行；别的行留着不猜。
     词行是一组的主干（逗由它数出来），时行只是往同一批格上贴数，所以顺序就是那两行的顺序：时在上、词在下；
     单独一行词没有配时值，就是作词那一档（格照样在，只是全空着），不报错。 */
  parse(text){
    const lines = [];
    let seg = '', pend = null, pnote = '', pstart = null, beat = null, pn = null, ptrans = '', psyl = null;
    let pcut = null, ppart = null;
    let who = [], how = '';
    const headOf = l => { const m = String(l).match(/^\s*(注|起|拍|音|译|人|唱|节|分|子|[时词])\s*[:=]\s*([\s\S]*)$/); return m ? { k:m[1], body:m[2] } : null; };
    /* 演唱者和唱法都是「往后挂」的：他不改，下面那几行就是同一个人、同一种唱法（和【段名】一个办法）。
       写出去只在变了的那一行前面补一行，没变不重复。 */
    const whoList = LyricFmt.whoList;
    /* 时行：竖线分逗，逗内一个数一格（减号 = 这一格没配时值）；整行一个字符都没有当作「这一行没有数」 */
    const timeGroups = body => {
      if(!String(body || '').trim()) return [];
      return LyricFmt.splitClauses(body).map(part => LyricFmt.timeCells(part));
    };
    /* 分行 / 子行：一格一个 token，token 里几家用点连着写（3.6 = 在第 3、6 个字后面分），没内容的格写减号。
       减号那一格要留一个空位 —— 抹掉它后面的格就会整体前移，分刀就贴到隔壁格上去了 */
    const subGroups = body => {
      if(!String(body || '').trim()) return [];
      return LyricFmt.splitClauses(body).map(part => {
        const toks = String(part).trim() ? String(part).trim().split(/\s+/) : [];
        return toks.map(tok => (tok === '-' || tok === '_') ? null
          : tok.split(/[.\u3001,]+/).map(x => Number(x)).filter(x => isFinite(x)));
      });
    };
    /* 词行：见到记号（竖线／斜杠／反斜杠）或者上面给了时值，就走「按格认」那一档；
       一格的词撞上了空格、斜杠这些，写出去是带反斜杠的，这里一并认。
       纯作词那一档（整行没一个记号、时值也空着）走「连着写」：空格当逗界，前提是切出来的每一截都是一格一字 ——
       他在记事本里顺手敲的「我有狂剑任天下 平生不快活」就这么认；英文那种整词一出现就退回整行一逗，不会拆散。 */
    const wordGroups = (body, timed) => {
      const b = String(body || '');
      if(!b.trim()) return [];
      const parts = LyricFmt.splitClauses(b);
      if(timed || /[\/|\\]/.test(b)){
        /* 配了时值又没写竖线，而空格正好把它切成和时值那行一样多的、一格一字的几截 —— 空格当逗界 */
        if(parts.length === 1 && timed && pend && pend.length > 1){
          const toks = b.trim().split(/\s+/).map(t => LyricFmt.cellsOfPart(t));
          if(toks.length === pend.length && toks.every(g => g.length && g.every(c => Array.from(c).length === 1)))
            return toks;
        }
        return parts.map(p => LyricFmt.cellsOfPart(p)).filter(g => g.length);
      }
      const toks = b.trim().split(/\s+/).map(t => LyricFmt.wordCells(t));
      return toks.length > 1 && toks.every(g => g.length && g.every(c => Array.from(c).length === 1))
        ? toks.filter(g => g.length) : [LyricFmt.wordCells(b)];
    };
    for(const raw of String(text || '').split(/\r?\n/)){
      if(!raw.trim()) continue;
      const segm = raw.trim().match(/^【(.*)】$/);
      if(segm){ seg = segm[1].trim(); continue; }
      /* 用没 trim 过的那一行取正文：末尾那一格要是顶住了一个空格（\␣），一 trim 就把这个空格弄丢了 */
      const hd = headOf(raw);
      if(!hd) continue;
      if(hd.k === LYRIC_HEAD.time){ pend = timeGroups(hd.body); continue; }
      /* 注行：这一行自己的说明（主歌 / 副歌 / 换气 / 提醒都行），排在时行上面，只管下面那一行。
         说明可以写好几行（跟译行同一个办法）：一行一个「注 =」写出去，读回来拼成同一条 */
      if(hd.k === LYRIC_HEAD.note){ const v = hd.body.trim(); pnote = pnote ? pnote + '\n' + v : v; continue; }
      /* 起行：这一句在歌里开口的那一刻（毫秒）。逐字 ttml 里本来有这个数，丢了它同步播放就对不上拍 */
      if(hd.k === LYRIC_HEAD.start){ const v = Number(String(hd.body).trim());
        pstart = (hd.body.trim() && isFinite(v)) ? Math.round(v) : null; continue; }
      /* 拍行：整首一份 —— 几几拍、bpm、第一个字落在小节的第几拍（6/8 那种一拍就是附点四分） */
      if(hd.k === LYRIC_HEAD.beat){ const m = String(hd.body).match(/(\d+)\s*\/\s*(\d+)[\s,]+([\d.]+)[\s,]+(\d+)/);
        if(m) beat = { sig:m[1] + '/' + m[2], bpm:Number(m[3]), from:Number(m[4]) }; continue; }
      /* 音行：注音，一格一段，跟词行同一套格语法（逗也用竖线）；数对不上就按格顺排，和时值那行同一个办法 */
      if(hd.k === LYRIC_HEAD.roman){ pn = wordGroups(hd.body, true); continue; }
      /* 节行：这一格唱几个音节（整数，没标的写减号）—— 用的就是时行那套数格子，只是它是自己独立一行 */
      if(hd.k === LYRIC_HEAD.syl){ psyl = timeGroups(hd.body); continue; }
      /* 分行：这一格里第几个字后面分一刀（界面上画虚线，双击那一格进来、单击落一刀） */
      if(hd.k === LYRIC_HEAD.cut){ pcut = subGroups(hd.body); continue; }
      /* 子行：分完之后每一子唱多少毫秒；没有这一行就照这一格的总时长平摊给各子 */
      if(hd.k === LYRIC_HEAD.part){ ppart = subGroups(hd.body); continue; }
      /* 译行：这一行的翻译，界面上摆在行的下面，不给改。翻译可能是两行（文件头那份「译法 + 一条 *注」竖着排），
         那就一行一个「译 =」写出去 —— 记事本里读着还是那两行，读回来也还是同一条翻译。 */
      if(hd.k === LYRIC_HEAD.trans){ const v = String(hd.body).replace(/\s+$/, '');
        ptrans = ptrans ? ptrans + '\n' + v : v; continue; }
      /* 人行：演唱者，几个人用顿号／逗号／& 连着写；空一行「人 =」表示往后这几行没人挂名 */
      if(hd.k === LYRIC_HEAD.who){ who = whoList(hd.body); continue; }
      /* 唱行：独唱（默认）／ 合唱 ／ 和声；独唱和空的一律落成「没有这一项」，明文里不占键 */
      if(hd.k === LYRIC_HEAD.how){ const b = String(hd.body).trim();
        how = (b.indexOf('和声') >= 0 || b === 'bg') ? 'bg'
          : (b.indexOf('合唱') >= 0 || b.indexOf('对唱') >= 0 || b === 'choir') ? 'choir' : '';
        continue; }
      /* 词行：先把逗数出来，再把等来的那串数按位置贴上去 */
      const wg = wordGroups(hd.body, !!(pend && pend.length));
      const flat = (pend || []).reduce((a, g) => a.concat(g), []);
      const L = { seg, clauses:[] };
      /* 没写说明就不留空键：树里「没有这一项」和「有但空着」是两件事，都摆进树，明文往返就比不出个所以然 */
      if(pnote) L.note = pnote;
      if(pstart != null) L.at = pstart;
      let k = 0;
      wg.forEach((cells, gi) => {
        /* 两边逗数正好一样：按逗对；不一样（英文整词、手改串了位）就把那一串数按格顺排过去，check() 里说明白 */
        const same = pend && pend.length === wg.length;
        const gsame = same && pend[gi].length === cells.length;
        L.clauses.push({ cells:cells.map((t, ci) => ({ t,
          ms:gsame ? pend[gi][ci] : (LyricFmt.okMs(flat[k + ci]) ? flat[k + ci] : null) })) });
        k += cells.length;
      });
      if(!wg.length && flat.length){
        /* 只有时行、这一组没写字：格数照时值摆着，字空着等他填 */
        L.clauses.push({ cells:flat.map(ms => ({ t:'', ms })) });
      }
      /* 注音贴到格子上：一格一段，先按逗对，对不上就按格顺排 —— 和时值那行同一个办法 */
      const nflat = (pn || []).reduce((a, g) => a.concat(g), []);
      if(nflat.length){ let q = 0;
        for(const cl of L.clauses) for(const c of cl.cells){ const v = nflat[q++]; if(v != null && v !== '') c.n = v; } }
      /* 音节数贴到格子上：同一个办法；一个都不标的格不留这个键（空值不占键，和注音、翻译一样） */
      const sflat = (psyl || []).reduce((a, g) => a.concat(g), []);
      if(sflat.length){ let q = 0;
        for(const cl of L.clauses) for(const c of cl.cells){ const v = sflat[q++]; if(LyricFmt.okMs(v) && v > 0) c.k = Math.round(v); } }
      /* 细分两行贴到格子上：还是「先按逗对，对不上按格顺排」那一个办法；一家的数都没给就不留键 */
      const cflat = (pcut || []).reduce((a, g) => a.concat(g), []);
      if(cflat.length){ let q = 0;
        for(const cl of L.clauses) for(const c of cl.cells){ const v = cflat[q++];
          if(Array.isArray(v) && v.length){ const 字 = Array.from(String(c.t || '')).length;
            const 对 = v.map(x => Math.round(x)).filter(x => x > 0 && x < 字);
            if(对.length){ c.cut = Array.from(new Set(对)).sort((a, b) => a - b); } } } }
      const pflat = (ppart || []).reduce((a, g) => a.concat(g), []);
      if(pflat.length){ let q = 0;
        for(const cl of L.clauses) for(const c of cl.cells){ const v = pflat[q++];
          if(Array.isArray(v) && v.length && c.cut && c.cut.length + 1 === v.length) c.pm = v.map(x => Math.max(0, Math.round(x))); } }
      if(ptrans) L.trans = ptrans;
      if(who.length) L.who = who.slice();
      if(how) L.how = how;
      pend = null; pnote = ''; pstart = null; pn = null; ptrans = ''; psyl = null; pcut = null; ppart = null;
      if(L.clauses.length) lines.push(L);
    }
    const doc = { title:'', lines };
    if(beat) doc.beat = beat;
    return doc;
  },
  /* 树 → 明文。两行一组恒定：作词那一档时值全空，时行照样写、后面是空的 —— 记事本里一眼看得出「这一行还没配时值」 */
  write(doc){
    const rows = [];
    /* 拍行整首一份，摆在最上面；没有节拍模式那份数就不写这一行 */
    const bt = doc && doc.beat;
    if(bt && bt.sig && LyricFmt.okMs(bt.bpm) && bt.bpm > 0)
      rows.push(LYRIC_HEAD.beat + ' = ' + bt.sig + ' ' + bt.bpm + ' ' + (Number(bt.from) || 1));
    let seg = '', pwho = '', phow = '';
    for(const L of (doc && doc.lines) || []){
      const s = (L && L.seg) || '';
      /* 段变了才补一行【段名】；从有段回到没段要补一行空牌子【】，不然读回来会挂着上一段的名字 */
      if(s !== seg){ rows.push('【' + s + '】'); seg = s; }
      /* 段前说明是这一行自己的，跟着这一行走（段名是粘着的分组，两回事）。
         写几行就一行一个「注 =」，读回来仍是同一条 —— 跟「译 =」同一个办法 */
      const nt = String((L && L.note) || '').trim();
      if(nt) for(const tl of nt.split(/\r?\n/)) if(tl.trim()) rows.push(LYRIC_HEAD.note + ' = ' + tl.replace(/\s+$/, ''));
      /* 演唱者与唱法：和段名一样是「变了才补一行」，没变的那几行读回来自动挂同一份 */
      const wk = ((L && L.who) || []).join('、');
      if(wk !== pwho){ rows.push(LYRIC_HEAD.who + ' = ' + wk); pwho = wk; }
      const hk = (L && L.how) || '';
      if(hk !== phow){ rows.push(LYRIC_HEAD.how + ' = ' + LYRIC_HOW[hk || 'solo']); phow = hk; }
      /* 这一句在歌里开口的时刻：只有真带这个数的（逐字 ttml 读来的、拍点模式点的）才写，作词那一档不硬造 */
      if(LyricFmt.okMs(L.at)) rows.push(LYRIC_HEAD.start + ' = ' + L.at);
      const units = ((L && L.clauses) || []).map(c => (c && c.cells) || []);
      const texts = units.map(cs => cs.map(x => (x && x.t) || ''));
      const nts = units.map(cs => cs.map(x => (x && x.n) || ''));
      const has = units.some(cs => cs.some(x => x && LyricFmt.okMs(x.ms)));
      const hasN = units.some(cs => cs.some(x => x && x.n));
      const hasK = units.some(cs => cs.some(x => x && LyricFmt.okMs(x.k) && x.k > 0));
      /* 一格一字、又不撞记号的行可以连着写；出现整词、合并格、空格、斜杠这些就得走「按格写」那一档，
         时行里的减号占位也跟着不能省，不然读回来数会串到别的格上。注音那一行同理 —— 它和词行必须一格对一格 */
      const grid = has || hasN || texts.some(ts => ts.some(t => !t || Array.from(t).length > 1 || /[\/|\\_\s]/.test(t)));
      const times = units.map(cs => cs.map(x => (x && LyricFmt.okMs(x.ms)) ? String(x.ms) : '-').join(' '));
      const body = ts => {
        const bs = ts.map(t => LyricFmt.bindCell(t));
        let s = '';
        bs.forEach((b, i) => { if(i && LyricFmt.needGap(bs[i - 1], b)) s += ' '; s += b; });
        return s;
      };
      const words = texts.map(body);
      const trans = String((L && L.trans) || '').replace(/\s+$/, '');
      /* 翻译带换行（文件头那份「译法 + *注」是两行）就一行一个「译 =」写出去，读回来仍是同一条 */
      if(trans) for(const tl of trans.split(/\r?\n/)) if(tl.trim()) rows.push(LYRIC_HEAD.trans + ' = ' + tl.replace(/\s+$/, ''));
      if(hasN) rows.push(LYRIC_HEAD.roman + ' = ' + (grid ? nts.map(body).join('|') : nts.map(body).filter(x => x).join(' ')));
      /* 节行：音节是一格一个数，多位数连着写会读成几个数，所以永远按格空一格（没标的写减号），逗还是竖线 */
      if(hasK) rows.push(LYRIC_HEAD.syl + ' = ' + units.map(cs => cs.map(x =>
        (x && LyricFmt.okMs(x.k) && x.k > 0) ? String(Math.round(x.k)) : '-').join(' ')).join('|'));
      /* 细分那两行：只在真分过的行里出现，没分的格写减号（跟节行一样永远按格空一格，点连着写几刀） */
      const hasCut = units.some(cs => cs.some(x => x && Array.isArray(x.cut) && x.cut.length));
      if(hasCut) rows.push(LYRIC_HEAD.cut + ' = ' + units.map(cs => cs.map(x => {
        const p = lyricParts(x); return p.有分 ? p.去.join('.') : '-'; }).join(' ')).join('|'));
      const hasPm = units.some(cs => cs.some(x => x && Array.isArray(x.pm) && x.pm.length > 1));
      if(hasPm) rows.push(LYRIC_HEAD.part + ' = ' + units.map(cs => cs.map(x => {
        const p = lyricParts(x);
        return p.有分 && Array.isArray(x.pm) && x.pm.length === p.n ? x.pm.map(v => Math.round(v)).join('.') : '-';
      }).join(' ')).join('|'));
      rows.push('时 = ' + (grid ? times.join('|') : ''));
      rows.push('词 = ' + (grid ? words.filter(x => x).join('|') : words.filter(x => x).join(' ')));
    }
    return rows.join('\n') + (rows.length ? '\n' : '');
  },
  /* 一行的词拼成给人看的一串（整本导出、投句、页脚都用这一枚）：一格一字连着写，整词之间空一格 */
  /* 一串演唱者 → 名单：顿号／逗号／&／斜杠 都当分隔（明文里、界面上、逐字 ttml 的声部名，三处同一个分法） */
  whoList(s){ return String(s || '').split(/[、,，&/+]+/).map(x => x.trim()).filter(Boolean); },
  lineText(L){
    return ((L && L.clauses) || []).map(cl => {
      const cs = ((cl && cl.cells) || []).map(x => (x && x.t) || '');
      return cs.join(cs.some(t => Array.from(t).length > 1) ? ' ' : '');
    }).filter(x => x).join(' ');
  },
  /* 数对不上是常态还是毛病，这里只负责说出来，不拦。
     一格不止一个字是常态（英文整词、拖出来的合并格），明文里用斜杠连着写，所以不算毛病、不报。 */
  check(doc){
    const bad = [];
    for(let i = 0; i < ((doc && doc.lines) || []).length; i++){
      const L = doc.lines[i];
      let n = 0, noMs = 0, hasMs = 0;
      for(const cl of (L && L.clauses) || []) for(const c of (cl.cells || [])){
        n++;
        if(LyricFmt.okMs(c.ms)) hasMs++; else noMs++;
      }
      if(!n) bad.push({ i, why:'这一行没有格' });
      else if(noMs && hasMs) bad.push({ i, why:'有 ' + noMs + ' 格没贴到时值（时值那一行的数比字的格少）', soft:true });
    }
    return bad;
  }
};

/* 文件头那一份声部名单（xml:id → { name, type }），形状和共用那把尺带出来的 d.agents 对齐。
   <p ttm:agent> 上挂的是编号、名字在头里声明，而整首只有一个声部时那把尺不摆名单 —— 这一份就得自己认，
   不然导回来「人 =」那一行写的会是 v1 这种编号。
   一个声部里可以声明好几个 <ttm:name>（他库里那个歌 v1000 就是两个人合用一个声部号）：全收下来按顿号串，
   这一串到了界面上正是「两个以上就算合唱」那条；type 也要留着，group 只挂一个名字（写作 "all" 那种）也得算合唱。 */
function lyricAgentRoster(text){
  const out = {};
  const re = /<\s*[\w.-]*:?agent\b([^>]*)>([\s\S]*?)<\s*\/\s*[\w.-]*:?agent\s*>/gi;
  let m;
  while((m = re.exec(String(text || '')))){
    const id = (m[1].match(/xml:id\s*=\s*"([^"]*)"/i) || m[1].match(/[\s"]id\s*=\s*"([^"]*)"/i) || [])[1];
    if(!id) continue;
    const type = (m[1].match(/[\s"]type\s*=\s*"([^"]*)"/i) || [])[1] || '';
    const all = (m[2].match(/<\s*[\w.-]*:?name[^>]*>([\s\S]*?)<\s*\/\s*[\w.-]*:?name\s*>/gi) || [])
      .map(x => String(x.replace(/<[^>]*>/g, '')).trim()).filter(Boolean);
    if(!all.length){ const d = (m[2].match(/<\s*[\w.-]*:?desc[^>]*>([\s\S]*?)<\s*\/\s*[\w.-]*:?desc\s*>/i) || [])[1];
      const s = String(d == null ? '' : d).replace(/<[^>]*>/g, '').trim(); if(s) all.push(s); }
    out[id] = { name:all.join('、'), type };
  }
  return out;
}
/* 从逐字 TTML 生成词格：一行一句，格 = 文件里的那一个 <span>（英文并成的整词也是一格），
   时值取那一格自己唱多久（行尾接下一格开头，由共用那把尺补齐）。ttml 里没有段、也没有逗的标记，
   所以生成出来是一段一逗：段名留空，逗界线等他自己在那一排格子上拖。 */
/* 标签里那份歌词 → 明文那一份的「词 = 」行（作者 2026-10-09 图11）。
   行首那些方括号两种都不是词：时间戳 [00:12.34]、元数据 [ti:歌名] [ar:某人]，一律剥掉；
   整行只剩时间戳的（间奏那一行）剥完就空了，跟着丢。为什么不自己建文档：明文那一条路已经测过，
   一行一句「词 = 」进去就是「一格一个字」，再建一套形状就是第二套真相。 */
function lyricTagLines(text){
  return String(text == null ? '' : text).split(/\r?\n/)
    .map(s => s.replace(/^\s*(?:\[(?:[0-9]{1,3}:[0-9]{2}(?:[.:][0-9]{1,3})?|[a-zA-Z#][^\]]*)\]\s*)+/g, '').trim())
    .filter(Boolean);
}
function lyricFromTtml(text){
  const d = (typeof shTtmlParse === 'function') ? shTtmlParse(text) : null;
  if(!d || !d.timed) return null;
  /* 声部名单：共用那把尺只在真有两个声部时才把名单带出来，整首一个声部的歌它不摆，
     所以头里那几行自己再认一遍，别让 v1 这种编号漏到界面上当人名。
     一个声部号底下声明好几个名字的（他库里那个歌 v1000 是两个人共用一个号），那把尺只取第一个，
     这一份把名字收全 —— 所以名单以这一份为准，它没认出名字的再回落到那把尺（那一份会按 type 给个「主唱／和声」）。 */
  const src = (d.agents && Object.keys(d.agents).length) ? d.agents : {};
  const rost = lyricAgentRoster(text), ag = {};
  for(const k in rost) ag[k] = rost[k].name ? rost[k] : (src[k] || rost[k]);
  for(const k in src) if(!ag[k]) ag[k] = src[k];
  const lines = [];
  for(const L of d.lines){
    const ws = L.words || [];
    /* 每格的窗口取「到自己开口为止，到下一格开口为止」，不取文件里那个 end ——
       字与字之间那点空档（他这个歌量到 33 处、合计 8.4 秒）要是丢掉，一行逐格相加就比这一行的窗口短，
       播放位置越走越早，下一行的「起」又把它拽回来，看着就是来回跳。空档并进前面那一格，
       一行的时长加起来正好等于这一行从开口到收尾，最后一格也接进行尾那点余音里。 */
    const keep = [];
    for(const w of ws) if(String(w.text == null ? '' : w.text).trim()) keep.push(w);
    const cs = [];
    for(let j = 0; j < keep.length; j++){
      const w = keep[j], nx = keep[j + 1];
      const o = { t:String(w.text).trim(), ms:null };
      if(LyricFmt.okMs(w.ms)){
        const from = Math.round(w.ms);
        /* 下一格的开口比这一格还早，是文件本身把两个音排得叠着（他库里那个日文歌第 54 行就是〔さ〕的 begin 掉在〔いな〕之后）：
           这种时候不能拿"到下一格为止"当窗口（一加就超出行尾），退回这一格自己的 end，一格还是一格 */
        let to = (nx && LyricFmt.okMs(nx.ms) && Math.round(nx.ms) > from) ? Math.round(nx.ms)
          : (LyricFmt.okMs(w.ms2) && w.ms2 > from) ? Math.round(w.ms2)
          : (LyricFmt.okMs(L.ms2) && L.ms2 > from) ? Math.round(L.ms2) : from + 120;
        o.ms = Math.max(1, to - from);
      }
      /* 注音一格一段，共用那把尺已经逐字绑好了（w.notes）；词尾那点空格是它特意搬过来的，别抹 */
      if(w.notes && w.notes.length) o.n = w.notes.map(x => String(x.text == null ? '' : x.text)).join('');
      cs.push(o);
    }
    if(!cs.length) continue;
    /* 这一句在歌里开口的那一刻：取这一行里最早的那一次开口（文件把字排得倒着时，第一个 <span> 并不是最早响的那个；
       拿行首的 begin 会把整行往后推，后面的字全错位）。没有逐字时间才退回行首的 begin。
       只留每格唱多久会把 ttml 里那份真实位置丢掉 —— 同步播放、出入点、节拍全都要靠它 */
    let a0 = null;
    for(const w of keep) if(LyricFmt.okMs(w.ms)){ const v = Math.round(w.ms); if(a0 == null || v < a0) a0 = v; }
    if(a0 == null && LyricFmt.okMs(L.ms)) a0 = Math.round(L.ms);
    const line = { seg:'', clauses:[{ cells:cs }] };
    if(a0 != null) line.at = a0;
    /* 翻译整行一条，界面上摆在行的下面（他给的参考图就是这个层次：注音在字上、原文在中、翻译在下） */
    if(L.trans) line.trans = String(L.trans);
    /* 声部名 → 演唱者；一串名字里有两个以上就算合唱，头里声明成 group 的那一个（只挂一个名字、写作 "all" 那种）也算合唱；
       整行都是背景人声才算这一行「和声」。
       主唱里夹几个和声字这种不动这一行的档 —— 那是那一格的出身，不是这一句的唱法（要留得逐格存，那份留给全标记）。 */
    const rec = L.agent ? ((ag || {})[L.agent] || null) : null;
    const nm = rec ? String(rec.name == null ? '' : rec.name) : String(L.agent || '');
    const ws2 = LyricFmt.whoList(nm);
    if(ws2.length) line.who = ws2;
    if(ws2.length > 1 || (rec && rec.type === 'group')) line.how = 'choir';
    if(ws.length && ws.every(w => w.bg)) line.how = 'bg';
    /* ttml 里没有段这一级（声部名不是段名），所以段留空，等他在那一排格子上标 */
    lines.push(line);
  }
  return lines.length ? { title:'', lines } : null;
}

/* 文件层：一个词格一个明文文件，平铺在宿主用户数据目录底下的 lyrics\ 里，一个一个文件。
   通道走现成那几条（FD_APP 上的 data* 只认相对路径，主进程挡着不许跑出用户目录；
   列目录要绝对路径，所以先问 dataDir() 再拼 —— 没有这座桥（本地开发那台服务器）就一句都不动盘）。
   他原样点名的落点是 data\userdata-wnw\lyrics\，这一条今天到不了，两条路都堵着：
   ⑴ data* 那几条的根是 app.getPath('userData')，主进程写死成 data\userdata-fd（src/pack/main.cjs:2451-2458，
      「一个程序一份」），递相对路径只会落进 userdata-fd\lyrics\；
   ⑵ 页面那套通道（pagePath）在 preload.cjs:238 明写「用户数据要走 data: 那几条口子」，
      凡是 data/userdata-* 一律抛错，所以 writePageFile / delPageFile 也进不去 userdata-wnw。
   要照原路径落，得在主进程补一条以 data\userdata-wnw 为根的读写 + 列目录 + 删（顺带把删一个词格补上，
   那是 F 组这一层现在唯一没有的动作），那是 src\pack\ 的改动，要重出更新包。等他一个词。 */
const Lyric = {
  DIR:'lyrics', EXT:'.txt',
  files:[], dir:'', got:false,
  bridge(){ return (window.FD_APP && typeof window.FD_APP.dataWrite === 'function') ? window.FD_APP : null; },
  async root(){
    const A = this.bridge();
    if(!A) return '';
    if(!this.dir) { try{ this.dir = String((await A.dataDir()) || '').replace(/[\\/]+$/, ''); }catch(e){ this.dir = ''; } }
    return this.dir;
  },
  async list(){
    const A = this.bridge();
    this.got = true;
    if(!A){ this.files = []; return this.files; }
    const p = (await this.root()) + '/' + this.DIR;
    let rows = [];
    try{ rows = (await A.dirTree(p, [this.EXT])) || []; }catch(e){ rows = []; }
    this.files = rows.map(r => ({ name:r.name, path:this.DIR + '/' + r.name, size:r.size, mtime:r.mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    return this.files;
  },
  async load(name){
    const A = this.bridge();
    if(!A) return null;
    const text = await A.dataRead(this.DIR + '/' + name);
    return text == null ? null : { name, text, doc:LyricFmt.parse(text) };
  },
  /* 存：文件名由标题来，撞了不覆盖别人的那个 —— 同名就是同一个词格（改的是记事本里那份也是它） */
  async save(name, doc){
    const A = this.bridge();
    if(!A) return { ok:false, msg:'这台机器没连上磁盘' };
    const text = LyricFmt.write(doc);
    await A.dataWrite(this.DIR + '/' + name, text);
    const i = this.files.findIndex(f => f.name === name);
    const rec = { name, path:this.DIR + '/' + name, size:text.length, mtime:Date.now() };
    if(i >= 0) this.files.splice(i, 1, rec); else this.files.unshift(rec);
    return { ok:true, name };
  },
  /* 删一个词格这一步先不做：preload 上只有整页文件那套（PageFiles 那条要认 pagePath 的门牌），
     FD_APP 上没有开着的 unlink 通道；用户数据这一侧要删文件得先补一条口子，那是主进程的改动（要重出更新包）。
     等词格那一排的界面落地、右键菜单真要有「删除」时一并补，届时候选抹的是已落盘的文件，按规矩要弹确认。 */
  /* 标题 → 文件名：留下中文、字母、数字、- _，斜杠冒号点号这些一律换下划线（点号也换 —— 带一串点的路径段
     就算主进程那边挡着不许跑出用户目录，也不该出现在文件名里）；空标题不硬编一个英文名糊上去 */
  fileName(title){
    const s = String(title || '').trim().replace(/[\\/:*?"<>|.]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
    return (s || '未命名') + this.EXT;
  }
};

/* ---------- 词格那一排的界面（这一档的模式名叫 lyric）----------
   一行词一串格子，时值写在字的正上方、逐格对齐（他定过那条：像注音在原文上方那样）。
   一格的宽度按它自己唱多久铺，所以格与格之间那道缝可以按住左右拖 —— 拖的就是时长，不给人输数字的框。
   双击格上方那个时值 = 把这一格拆成两格（字和时长都均分）；双击格之间的缝 = 并回上一格；双击逗之间那道斜缝 = 并逗。
   右键一格给全套（拆格／并到上一格／从这里分逗／清掉这一格／在这一行下面加一行）。
   真源是 data\userdata-wnw\lyrics\ 里那个明文文件，章对象里这份只是缓存 —— 开机按文件的时间戳认谁新。
   这一档一概不摆：块类型、样式、markdown、版式那一行、章纲、批注与修订痕迹那一栏、单章常规导出。
   押韵助手整个撤了（他说会自行调整后拿回来）：这里没有留任何接口 —— 从前那句「只留一条薄接口（每逗末格取字）」是空话，
   代码里搜不到取每逗末格的那一步，将来要做押韵得从那一格取字重新写。 */
const LYRIC_MODE = 'lyric';

/* 整排格子连字带框多大：一根滑杆管，全局记一份。
   这个数不进那个明文文件 —— 文件里存的是词和时值，字多大是这台机器这一屏的事。 */
const LYRIC_UI = { scale:100, whoW:7.4, got:false, num:'ms', fill:'cell', ph:'x',
  /* 三档显隐（「批量…」那个管着）：只决定这一屏摆不摆出来，那个文件里一个字都不动 */
  view:{ rom:true, trn:true, wrd:true },
  NUMS:[['ms','时长'], ['io','出入'], ['beat','节拍']],
  /* 填法三档：按格填（默认，一格格打字）／标音节（打进去的是这一格几个音节）／整句填（一行底下一根横线整句写，再一键对齐到音节） */
  FILLS:[['cell','按格填'], ['count','标音节'], ['fill','整句填']],
  async load(){
    if(this.got) return; this.got = true;
    try{ const v = await State.get('lyric-size', 100);
      if(typeof v === 'number' && v >= 60 && v <= 260) this.scale = v; }catch(e){}
    try{ const m = await State.get('lyric-num', 'ms');
      if(this.NUMS.some(x => x[0] === m)) this.num = m; }catch(e){}
    try{ const f = await State.get('lyric-fill', 'cell');
      if(this.FILLS.some(x => x[0] === f)) this.fill = f; }catch(e){}
    try{ const p = await State.get('lyric-ph', 'x');
      if(typeof p === 'string' && p.length === 1) this.ph = p; }catch(e){}
    try{ const v = await State.get('lyric-view', null);
      if(v && typeof v === 'object') for(const k of ['rom', 'trn', 'wrd']) if(typeof v[k] === 'boolean') this.view[k] = v[k]; }catch(e){}
    /* 演唱者那一格多宽：拖动那一条调的，和字号一样只归这台机器管 */
    try{ const w = await State.get('lyric-who-w', 7.4);
      if(typeof w === 'number' && w >= 4 && w <= 18) this.whoW = w; }catch(e){}
  },
  set(v){ this.scale = v; try{ State.set('lyric-size', v); }catch(e){} },
  setWhoW(v){ const w = Math.max(4, Math.min(18, Number(v) || 7.4)); this.whoW = w;
    try{ State.set('lyric-who-w', w); }catch(e){} },
  setNum(v){ this.num = v; try{ State.set('lyric-num', v); }catch(e){} },
  setFill(v){ this.fill = v; try{ State.set('lyric-fill', v); }catch(e){} },
  setView(k, on){ if(!(k in this.view)) return; this.view[k] = !!on;
    const s = { rom:this.view.rom, trn:this.view.trn, wrd:this.view.wrd };
    try{ State.set('lyric-view', s); }catch(e){} },
  setPh(v){ const p = String(v || ''); if(p.length !== 1) return; this.ph = p; try{ State.set('lyric-ph', p); }catch(e){} } };

/* 导出的四样落法。逐字 ttml 和逐句 lrc 是给外面用的；txt 只给人读（不带任何时间）；
   全标记那份是「换一台机器、另一个人，导入去能看到一模一样的东西」——段前说明、注音、翻译、
   音节标注、节拍参数这些两行明文装不下的，全在里面。 */
const LYRIC_EXPORTS = {
  ttml:{ ext:'ttml', label:'逐字 ttml', hint:'一格一个 <span>，begin / end 由每格时长累加出来；注音、翻译、和声、演唱者按音乐遥控器那一家读的同一套记号一并带上', kind:'ttml' },
  lrc:{ ext:'lrc', label:'逐句 lrc', hint:'一行一句，时间点取这一行开口那一刻', kind:'lrc' },
  txt:{ ext:'txt', label:'纯文字（不带时间）', hint:'只有词和段前说明，记事本里读着舒服', kind:'txt' },
  full:{ ext:'wnw.json', label:'全标记（给另一个人导入）', hint:'段名、段前说明、注音、翻译、演唱者与唱法、音节、节拍参数一个不落；这一份导入去看到的是同一棵树', kind:'full' }
};

addCss(`
/* 词格：一行 = 段名 + 一串（逗 → 格）+ 行尾的时长合计；格的宽度按时值铺。
   皮肤那条 .wnw-root input（w0-skin.js:92）权重比单类名高，格子和小牌这两处都要带 .wnw-root 前缀才压得住。 */
/* 开头那一排按钮悬浮：这一屏是整块滚的（停靠那一档由里面的滚动条管，做成整页时是 .wnw-panel-body 在滚），
   行一多这排就滚出视野了，导入 / 导出 / 加一行 / 拍点都够不着（外26 第 7 条） */
/* 顶上那 12 像素的缝（作者 2026-10-09 图4）：从前这一排靠 margin 撑开下面那一截，
   钉在顶上往下一滚，行从排底下钻出来时正好从这条 margin 里露一道 —— 衬底那一层只铺到排自己的方框，
   铺不进方框外面的 margin。改成 bottom padding 就并进方框里了：看着还是空 12 像素，
   但这一条底跟着排一起钉住，缝没了。（左右和往上那三条缝早先已经用 ::before 那层吃掉，见下面那一条。） */
.wnw-lbar{display:flex;gap:6px;align-items:center;flex-wrap:nowrap;margin:0;
  position:sticky;top:0;z-index:6;padding:6px 0 18px;background:var(--card-bg,#fff);}
/* 衬底要加就加全（外27 图1、2）：这一排是钉在滚动区顶上的，它自己那一块底只铺到排本身的方框 ——
   滚动区还有一圈内距、排的左右两头也各留一条槽，行从底下滚过去就在这三条缝里露出来。
   这一层往左右各铺出一个屏幕宽、往上把那一圈内距一起吃掉，只画底、不接鼠标，行再也透不出来。
   词巡航顶上那一排（.wnw-czbar）是同一条规矩，两条并成这一条摆在这儿（审查第 16 条：
   从前两棵源码里各写一遍、除类名外逐字相同，改一处只生效一半）。 */
.wnw-lbar::before,.wnw-czbar::before{content:'';position:absolute;left:-100vw;right:-100vw;bottom:0;z-index:-1;
  top:calc(-1 * var(--gap-blk,14px) - 6px);background:var(--card-bg,#fff);pointer-events:none;}
.wnw-lfile{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-light);font-size:.82em;}
.wnw-lwarn{color:var(--warn);font-size:.86em;margin:0 0 8px;}
.wnw-lhint{font-size:.78em;color:var(--text-light);margin:-6px 0 10px;}
.wnw-lbeat{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:-4px 0 10px;font-size:.78em;color:var(--text-light);}
.wnw-lbeat>input{font:inherit;padding:.15em .4em;text-align:center;}
.wnw-lyric{display:flex;flex-direction:column;gap:.34em;font-size:calc(1em * var(--lscale,1));}
.wnw-lrow{display:flex;align-items:flex-end;flex-wrap:nowrap;min-height:2.7em;}
.wnw-lnote{font-size:.8em;color:var(--accent);margin-bottom:-.22em;user-select:none;white-space:pre-line;}
/* 批量那一个给的三档显隐：只动这一屏摆不摆，那个文件里一个字都不动（和大小、填法同一类，这台机器记住） */
.wnw-lyric.hide-rom .wnw-ln{display:none;}
.wnw-lyric.hide-trn .wnw-lnote,.wnw-lyric.hide-trn .wnw-ltrans{display:none;}
.wnw-lyric.hide-wrd .wnw-ltxt:not(.wnw-ln){color:transparent;}
.wnw-lno{flex:0 0 2.3em;width:2.3em;text-align:right;font-size:.72em;color:var(--text-light);
  padding-bottom:.45em;font-variant-numeric:tabular-nums;user-select:none;}
.wnw-root .wnw-lseg{flex:0 0 auto;width:4.6em;font-size:.78em;color:var(--accent);background:transparent;border:0;
  border-bottom:1px solid transparent;border-radius:0;padding:.1em .25em .05em;margin-right:.45em;text-align:right;}
.wnw-lseg::placeholder{color:var(--text-light);opacity:.45;}
.wnw-root .wnw-lseg:focus{outline:none;border-bottom-color:var(--hair-color);background:var(--btn-bg);}
.wnw-lcl{display:flex;align-items:flex-end;flex:0 1 auto;min-width:0;flex-wrap:wrap;}
.wnw-lcell{display:flex;flex-direction:column;min-width:2.4em;position:relative;}
/* 一格内部细分（外26 第 9、10 条）：整格仍是一块，只在分开的地方画一条虚线（格间那根实线的兄弟、换成虚的）。
   那一层是盖在输入口上的，不认鼠标，免得挡着打字和右键。 */
.wnw-lcut{position:absolute;left:0;right:0;pointer-events:none;}
.wnw-lcut>i{position:absolute;top:3px;bottom:3px;width:0;border-left:1px dashed var(--accent);}
/* 分音节这一档开着的那一格先凸显出来（外27 图3）：底给成唱完那一档的白、外面描一圈强调色，
   一眼看得清现在落刀落在哪一格 —— 这一档是双击进来、单击落刀、再双击出去。 */
.wnw-root .wnw-lcell.cutting .wnw-ltxt{background:var(--input-bg,#fff);border-color:var(--accent);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 32%,transparent);}
.wnw-lcell.cutting .wnw-lms{color:var(--accent);}
.wnw-lms{font-size:.7em;line-height:1.35;color:var(--text-light);text-align:center;white-space:nowrap;
  font-variant-numeric:tabular-nums;cursor:pointer;user-select:none;}
.wnw-lcell.over .wnw-lms,.wnw-lcell.over .wnw-ltxt{color:var(--warn);}
/* 定成播放入点的那一格：那串数上色加粗，一眼看得出播放是从这里起的 */
.wnw-lms.from{color:var(--accent);font-weight:700;}
/* 格子要吃得准、看得见：底色用皮肤自己那枚输入底，边框走控件那道边，内距按字号给（一整排的字号由 --lscale 那一根滑杆管）。
   font:inherit 自己写一份，不靠皮肤那条 input 规则 —— 少了它就退回浏览器的 13.3 像素，整排缩放就白做了。 */
.wnw-root .wnw-ltxt{font:inherit;box-sizing:border-box;border:1px solid var(--ctl-edge,var(--input-border,#b9bec7));border-radius:4px;
  background:var(--input-bg,#fff);
  text-align:center;min-width:0;width:100%;padding:.24em .3em;line-height:1.4;}
.wnw-root .wnw-ltxt:hover{border-color:var(--accent);}
.wnw-root .wnw-ltxt:focus{outline:none;background:var(--btn-bg);border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);}
/* 注音那一格是同一格的上半：外观和原文那一格同步（作者 2026-10-09 图2、图3）。
   从前这里自己压了两样 —— 字小一档（.8em）、颜色降成次级（--text-light），理由是「看着才是一对」；
   他现在要的是同一档字、同一个正文色，边框和底色本来就跟着原文那一格走，不再另写。
   只留 margin-bottom 那一像素的缝，两层之间不留缝会糊成一块。 */
.wnw-root .wnw-ln{margin-bottom:1px;}
/* 演唱者那一枚小牌：跟着段名摆在行的起头，点一下改。默认独唱不写字，只有人名；唱法不是独唱才把唱法带上。
   槽位宽照 --lwho-w 走（默认 7.4em，拖动那一根可窄可宽，这台机器记住 —— 外26 第 1 条），牌本身照名字长短收，
   名字在牌里居中、牌整体贴在这一段宽度的右沿（外25 第 5 条）—— 槽位宽是为了每一行的歌词都从同一个地方起头。
   两个以上名字（合唱）各占一枚牌、上下摞着排，次序按文字 / 字母顺序（外26 第 8 条），只在这一屏这样排，
   文件里那一行「人 =」的原样不动。
   没挂名又没改唱法的那一行只留一格空槽（不画框、点不动），不然那一行的开头又往前蹿一格。 */
.wnw-root .wnw-lwho{flex:0 0 var(--lwho-w,7.4em);width:var(--lwho-w,7.4em);display:flex;justify-content:flex-end;
  align-items:center;align-self:center;margin-right:1.1em;gap:3px;position:relative;}
.wnw-root .wnw-lwho > .wnw-lwho-n{display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:0;
  max-width:100%;flex:0 1 auto;}
.wnw-root .wnw-lwho > .wnw-lwho-n > .wnw-lchip{font:inherit;box-sizing:border-box;font-size:.74em;line-height:1.3;color:var(--text-light);
  max-width:100%;background:var(--btn-bg,#eef2fa);border:1px solid var(--ctl-edge,var(--input-border,#b9bec7));
  border-radius:4px;padding:.18em .4em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;text-align:center;}
.wnw-root .wnw-lwho > .wnw-lwho-n > .wnw-lchip:hover{border-color:var(--accent);color:var(--accent);}
.wnw-lwho-n > .wnw-lchip.bg,.wnw-lwho-n > .wnw-lchip.choir{color:var(--accent);}
/* 拖动调宽那一条（外26 第 1 条）：挂在槽位右沿外面，不占槽内的地方 ——
   占进去就把牌从右沿顶开了，外25 第 5 条定的「牌整体贴在这一段宽度的右沿」会跟着破。
   平时不占眼神，鼠标进这一行才露出来，按住它自己时最亮。 */
.wnw-root .wnw-lwho-g{position:absolute;top:12%;bottom:12%;right:-9px;width:7px;cursor:ew-resize;opacity:0;
  border-left:2px solid var(--ctl-edge,var(--input-border,#b9bec7));touch-action:none;}
.wnw-lrow:hover .wnw-lwho-g{opacity:.55;}
.wnw-lwho-g:hover{opacity:1 !important;}
.wnw-ltrans{display:flex;align-items:baseline;gap:8px;font-size:.82em;color:var(--text-light);margin:-.16em 0 .1em 2.4em;}
.wnw-ltrans>span{white-space:pre-line;}
.wnw-ltrans .wnw-btn{visibility:hidden;}
.wnw-ltrans:hover .wnw-btn{visibility:visible;}
/* 音节数标在格子的最下面（上面那串数是时值，混在一块就读不出谁是谁）；标音节那一档不摆这一行，因为那一档格子里写的就是这个数 */
.wnw-lsyl{font-size:.68em;line-height:1.3;color:var(--text-light);text-align:center;font-variant-numeric:tabular-nums;user-select:none;}
/* 整句填写那一根横线：只有底边一条，看着就是「在这行字上写」；对齐的按钮跟在后面 */
.wnw-lfill{display:flex;align-items:center;gap:6px;margin:-.1em 0 .1em 2.4em;}
.wnw-root .wnw-lfill input{flex:1 1 auto;min-width:0;font:inherit;background:transparent;border:0;
  border-bottom:1px solid var(--hair-color,#c9ced8);border-radius:0;padding:.1em .2em;text-align:left;}
.wnw-root .wnw-lfill input:focus{outline:none;border-bottom-color:var(--accent);background:var(--btn-bg);}
.wnw-lfill i{font-style:normal;font-size:.72em;color:var(--text-light);flex:0 0 auto;}
/* 拍点那一排：正在给第几行打、已经打了几个点 */
.wnw-ltap{display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:.3em .5em;
  border:1px solid var(--ctl-edge,var(--input-border,#b9bec7));border-radius:5px;background:var(--btn-bg,#eef2fa);font-size:.86em;}
.wnw-ltap b{color:var(--accent);font-weight:inherit;font-variant-numeric:tabular-nums;}
.wnw-ltap span{flex:1;}
.wnw-lrow.tapping{box-shadow:inset 2px 0 0 var(--accent);}
.wnw-lsize{display:flex;align-items:center;gap:5px;flex:0 0 auto;font-size:.78em;color:var(--text-light);white-space:nowrap;}
.wnw-lsize input[type=range]{width:5.2em;}
.wnw-lseam{flex:0 0 9px;align-self:stretch;position:relative;cursor:col-resize;}
.wnw-lseam::after{content:'';position:absolute;left:4px;top:.4em;bottom:.2em;width:1px;background:var(--hair-color);}
.wnw-lseam:hover::after,.wnw-lseam.on::after{left:3px;width:3px;background:var(--accent);}
.wnw-lseam.dead{cursor:default;}
.wnw-lgap{flex:0 0 auto;width:1.15em;align-self:stretch;position:relative;cursor:pointer;}
.wnw-lgap::before{content:'';position:absolute;left:.55em;top:.35em;bottom:.2em;width:1px;background:var(--hair-color);
  transform:skewX(-14deg);}
.wnw-lgap:hover::before{background:var(--accent);width:2px;}
.wnw-lsum{flex:0 0 auto;width:4.6em;text-align:right;font-size:.76em;color:var(--text-light);padding-bottom:.2em;
  font-variant-numeric:tabular-nums;}
/* 播放里只留两档（外26 第 2 条 · 外27 图6、7 重做）：未唱 = 一块退到底色的格子，唱完 = 输入框那层白 + 彩字，
   中间那一趟过渡用的就是「唱完」这一档的底子从左铺到右 —— 两档之间不再第三种颜色。
   上一版给正推着的格子铺了一条青灰带子（accent 掺 26% 那一种），在他看来仍是「浅、暗、白」三种状态；
   未唱那一档从前是拿 opacity:.45 把整格压淡的，那样连铺进来的白也只剩四成半，铺了等于没铺 ——
   所以这一版把两档的颜色各自写实：未唱给按钮底、唱完给输入底，铺过来的那一条和唱完那一块是同一个数。
   遥控器那一家仍旧是三档（那一条是它定的），这一处只管词格。摆在最后，压得住上面那条「超了一字标黄」。 */
.wnw-lms2{color:var(--warn);}
.wnw-lcell.pre .wnw-ltxt,.wnw-lcell.now .wnw-ltxt{background:var(--btn-bg,#eef2fa);
  color:var(--text-light);border-color:var(--ctl-edge,var(--input-border,#b9bec7));}
/* 正推着的那一格：唱完那一档的白从 0 铺到满，行程 = 这一格剩下的时长，交给 CSS 自己走线性（不每帧改宽度） */
.wnw-lcell.now .wnw-ltxt{
  background-image:linear-gradient(var(--input-bg,#fff),var(--input-bg,#fff)),
    linear-gradient(var(--btn-bg,#eef2fa),var(--btn-bg,#eef2fa));
  background-repeat:no-repeat,no-repeat;background-position:0 0,0 0;background-size:0% 100%,100% 100%;}
.wnw-lcell.post .wnw-ltxt{background:var(--input-bg,#fff);color:var(--accent);border-color:var(--accent);}
.wnw-lcell.post .wnw-lms{color:var(--accent);}
`);

/* 这一屏弹出的框都归一档尺寸（外25 第 10 条）：节拍参数、导出、快捷建词格、演唱者与唱法、段前说明
   五张框内容长短差很多，从前每开一张窗口自己抽一回尺寸。 */
function lyricOverlay(title, body, foot){ Overlay.open(title, body, foot, { fix:'词格' }); }

class LyricGrid{
  constructor(host, view){
    this.host = host; this.view = view; this.c = view.c;
    this.doc = null; this.warn = ''; this.undo = []; this.redo = []; this.flat = [];
    this.cutCell = null; this.cutTimer = 0;       /* 分音节这一档正开在哪一格（认树里那个格子），和那一下延迟落刀的表 */
    this.marks = []; this.curRow = -1;
  }
  get lines(){ return (this.doc && this.doc.lines) || []; }
  /* ---------- 开：先认那个明文文件，文件比章里这份新就以文件为准 ---------- */
  async boot(){
    const c = this.c;
    await LYRIC_UI.load();
    if(!c.lyricFile) c.lyricFile = Lyric.fileName(c.title || '');
    this.warn = await this.pull();
    if(!c.lyric || !Array.isArray(c.lyric.lines)) c.lyric = this.fromParas();
    this.doc = c.lyric;
    this.bindDrop();
    /* 快捷键挂在这一排的根上：焦点在不在格子里都收得到，换一章这一排整个换掉，监听跟着走不留野 */
    this.host.addEventListener('keydown', e => this.hotKey(e));
    /* 拍点那三枚键也挂在根上（外26 第 12 条）：f 是「开这一趟」的键，所以没开的时候也得收得到 */
    this.host.addEventListener('keydown', e => this.tapKeys(e));
    this.render();
    this.view.drawFoot();
  }
  async pull(){
    const c = this.c;
    if(!c.lyricFile || !Lyric.bridge()) return '';
    let rec = null;
    try{ rec = ((await Lyric.list()) || []).find(f => f.name === c.lyricFile) || null; }catch(e){ rec = null; }
    if(!rec) return c.lyricAt ? ('lyrics\\' + c.lyricFile + ' 读不回来，这一屏先用章里存着的那份') : '';
    if(c.lyricAt && rec.mtime <= c.lyricAt) return '';
    const got = await Lyric.load(c.lyricFile);
    if(!got || !got.text) return '';
    c.lyric = got.doc; c.lyricAt = rec.mtime;
    return '';
  }
  /* 这一章在切进词格之前有正文：一行词换成一行格子，空格分逗、字逐格；没有正文就给一格空着等他写 */
  fromParas(){
    const lines = [];
    for(const p of (this.c.paras || [])){
      const t = String(typeof cleanText === 'function' ? cleanText(p) : ((p && p.t) || '')).trim();
      if(!t) continue;
      const clauses = t.split(/\s+/)
        .map(x => ({ cells:LyricFmt.wordCells(x).map(ch => ({ t:ch, ms:null })) }))
        .filter(g => g.cells.length);
      if(clauses.length) lines.push({ seg:'', clauses });
    }
    /* 词格这棵树不存标题：文件名就是这个词格的名字（c.title → lyrics\\<标题>.txt），
       明文那两行里也没有标题这一行 —— 存进去反而出现「章标题改了、树里那份还旧着」两处账。 */
    return { title:'',
      lines: lines.length ? lines : [{ seg:'', clauses:[{ cells:[{ t:'', ms:null }] }] }] };
  }
  /* ---------- 存：先落那个明文文件，章对象里那份是缓存（ChView.save 里排在这个前面） ---------- */
  async persist(){
    const c = this.c;
    if(!c.lyricFile || !this.doc) return;
    if(!Lyric.bridge()){ this.warn = '这台机器没连上磁盘，词格只存在这一章里'; return; }
    const r = await Lyric.save(c.lyricFile, this.doc);
    if(r && r.ok){ c.lyricAt = Date.now(); this.warn = ''; }
    else this.warn = (r && r.msg) || '存不进 lyrics 里那个文件';
  }
  /* ---------- 改一格的字不许重建整排（打字时重画会把光标丢掉），结构调整才重画 ---------- */
  norm(){
    for(const L of this.lines){
      if(!L.clauses || !L.clauses.length) L.clauses = [{ cells:[] }];
      for(const cl of L.clauses) if(!cl.cells.length) cl.cells.push({ t:'', ms:null });
    }
  }
  rowMs(L){ let s = 0, any = false; for(const cl of L.clauses || []) for(const c of cl.cells || [])
    if(LyricFmt.okMs(c.ms)){ s += c.ms; any = true; } return any ? s : 0; }
  timed(L){ return this.rowMs(L) > 0; }
  /* 这一行摆不摆注音那一层：格子上真带注音（文件里读来的），或者他从行里开了这一层等着填。
     明文那一头只认前者 —— 一格空注音在文件里和「没有」是一回事，不值得占一格。 */
  romanOn(L){ return !!(L && L.roman) || ((L && L.clauses) || []).some(cl => (cl.cells || []).some(c => c && c.n)); }
  /* 这一格超了一个字（英文整词不算 —— 甲-2 定的按词切，一格一词是本分） */
  over(c){ const t = (c && c.t) || ''; return LyricFmt.wordCells(t).length > 1; }
  /* ---------- 数值那一行怎么读：时长 / 出入点 / 节拍 —— 同一份格子三种读法，不动数据 ---------- */
  /* 每一格落在歌里的位置：带「起」的那一行从「起」算，其余接上一格的尾巴。
     不往格子上挂临时键 —— 树里多一个键，明文往返比的就不是内容而是键的有无了。 */
  timeline(){
    const rows = []; let t = 0;
    for(const L of this.lines){
      if(LyricFmt.okMs(L.at)) t = L.at;
      for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])){
        const d = LyricFmt.okMs(c.ms) ? c.ms : 0;
        rows.push({ c, in:t, out:t + d }); t += d;
      }
    }
    return { rows, end:t };
  }
  msText(ms){ return LyricFmt.okMs(ms) ? Math.round(ms) + 'ms' : '—'; }
  ioText(ms){ return LyricFmt.okMs(ms) ? shLrcClock(ms) : '—'; }
  /* 节拍：一拍 = 拍号分子里那一个大拍（6/8 就是附点四分），BPM 是这一拍一分钟跳几次，
     from 是第一个字落在小节的第几拍（从 1 数）。 */
  beatOf(ms){
    const b = (this.doc && this.doc.beat) || null;
    if(!b || !LyricFmt.okMs(b.bpm) || b.bpm <= 0 || !LyricFmt.okMs(ms)) return '—';
    const per = Number(String(b.sig || '4/4').split('/')[0]) || 4;
    const beats = ms / (60000 / b.bpm) + Math.max(0, (Number(b.from) || 1) - 1);
    const bar = Math.floor(beats / per) + 1;
    return bar + '.' + (Math.round((beats - Math.floor(beats / per) * per + 1) * 100) / 100);
  }
  topText(row, c){
    if(LYRIC_UI.num === 'io') return row ? this.ioText(row.in) : '—';
    if(LYRIC_UI.num === 'beat') return row ? this.beatOf(row.in) : '—';
    return this.msText(c && c.ms);
  }
  botText(row){ return LYRIC_UI.num === 'io' && row ? this.ioText(row.out) : ''; }
  /* 拖完、拆完、并完之后重算位置：只改这两格上面和下面的字，不重建整排（重建会把光标丢掉） */
  labelBox(box){
    const inp = box && box.querySelector('.wnw-ltxt'); if(!inp || !inp._cell) return;
    const rows = (this.tl && this.tl.rows) || [], row = rows.find(r => r.c === inp._cell) || null;
    const top = box.querySelector('.wnw-lms'), bot = box.querySelector('.wnw-lms2');
    if(top) top.textContent = this.topText(row, inp._cell);
    if(bot) bot.textContent = this.botText(row);
  }
  relabel(){ this.tl = this.timeline(); for(const f of this.flat) this.labelBox(f.inp.parentNode); }
  /* 段前说明、翻译、整句那一根横线都要跟歌词文字对头 —— 它们左边那点空档得盖过行号、段名格、演唱者小牌，
     而这三枚合起来多宽只有摆完了才知道（行号会位数变、小牌不一定在、字号和缩放都在动），所以量出来逐行贴。
     量不到（还没摆上屏、宽是 0）就不动，留着样式里那点默认缩进，别把对齐改成 0。 */
  indentRows(){
    const box = this.box; if(!box) return;
    let 上一行 = 0;
    for(const el of Array.from(box.children)){
      if(el.classList.contains('wnw-lrow')){
        const f = el.querySelector('.wnw-ltxt'), a = el.getBoundingClientRect();
        const x = (f && a.width) ? Math.max(0, Math.round(f.getBoundingClientRect().left - a.left)) : 0;
        上一行 = x;
        const pv = el.previousElementSibling;
        if(x && pv && pv.classList.contains('wnw-lnote')) pv.style.marginLeft = x + 'px';
      } else if(el.classList.contains('wnw-ltrans') || el.classList.contains('wnw-lfill')){
        if(上一行) el.style.marginLeft = 上一行 + 'px';
      }
    }
  }
  /* ---------- 播放：自己不出声。要么走一遍表（模拟），要么跟音乐遥控器那一份时钟 ---------- */
  /* 入点是这一格的开口那一刻（双击格子上面那串数定的）：模拟播放从这一刻起走，同步播放早于它的时刻整排按「还没唱到」摆。
     同一个点再双击一次取消；换了另一格就改到那一格。这是这一屏的播放起点，不写进那个文件。 */
  setFrom(row){
    if(!row) return;
    const at = Math.round(row.in);
    this.fromMs = (this.fromMs != null && Math.abs(this.fromMs - at) <= 1) ? null : at;
    this.render();
  }
  playLabel(){ return this.playing ? '停下' : (this.follow ? '跟遥控器播' : '模拟播放'); }
  barRefresh(){ if(this.playBtnEl) this.playBtnEl.textContent = this.playLabel(); }
  stopPlay(){
    this.playing = false;
    if(this.raf){ cancelAnimationFrame(this.raf); this.raf = 0; }
    for(const f of this.flat){ const b = f.inp.parentNode; if(b) b.classList.remove('now', 'post', 'pre');
      f.inp.style.transition = 'none'; f.inp.style.backgroundSize = ''; }
    this.marks = []; this.curRow = -1;
    this.barRefresh();
  }
  /* 页面上那一个公共时钟（_shared/sh-mus.js）：本地开发那台服务器里没有遥控器这一家，取不到就只走模拟 */
  mus(){ return (typeof MusClock === 'undefined') ? null : MusClock; }
  /* 走的是哪一份表：跟随那一档读音乐遥控器递过来的时钟（歌词延后那一档也算在它里面），
     模拟那一档就是按下这一刻起自己数。词格这一档自己不放声音 —— 播放器是遥控器那一家。 */
  nowMs(){
    if(this.follow){ const M = this.mus(); return M ? M.now() : 0; }
    return performance.now() - this.t0;
  }
  play(){
    if(this.playing){ this.stopPlay(); return; }
    this.tl = this.timeline();
    if(!this.tl.end){ toast('这一首还没配时值，播不动 —— 先拖缝或双击拆格把时长给上'); return; }
    const M = this.mus();
    if(this.follow && (!M || !M.live())){ toast('音乐遥控器这一头没连上正在放的歌 —— 先在那一家把曲播起来'); return; }
    this.playing = true; this.t0 = performance.now() - (this.fromMs != null ? this.fromMs : 0); this.cur = -1;
    const step = () => {
      if(!this.playing) return;
      const ms = this.nowMs();
      this.mark(ms);
      if(!this.follow && ms >= this.tl.end + 200){ this.stopPlay(); return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
    this.barRefresh();
  }
  setFollow(v){
    this.follow = !!v;
    const M = this.mus();
    if(this.follow && (!M || !M.live())) toast('音乐遥控器这一头还没连上正在放的歌，等它报上来才跟得住');
    this.barRefresh();
  }
  /* 播放只有两档（未播放 / 已播放），正推着的那一格算未播放 —— 但判档一律按每一格自己的时间窗，不看「当前是第几格」：
     一句和另一句在时间上叠着（和声）、或表里有行没配时值（这一时刻谁都不在窗里）时，
     按索引判会把整排的标记一起抹掉 —— 那就是未唱的歌词突然大段发白、又回到灰蒙蒙的那一下闪。
     落进谁的窗谁就在推（可以好几格同推），谁的窗都没落进就照旧按「没唱到」摆，绝不清空。 */
  /* 卡拉ok 那一扫：刚进「正在唱」的这一格，把彩那一层从 0 推到满，行程就是这一格剩下的时长，
     交给 CSS 自己走线性 —— 每格只在换档那一刻写两笔，不跟着每一帧改（跟遥控器 fillWord 同一办法）。
     撤下这一档时把这两笔清干净，不然下一回它带着上一次的进度起手。 */
  sweep(inp, st, row, ms){
    if(!inp) return;
    if(st !== 'now'){ inp.style.transition = 'none'; inp.style.backgroundSize = ''; return; }
    const dur = Math.max(1, Math.round((row && LyricFmt.okMs(row.out) ? row.out : ms) - ms));
    inp.style.transition = 'none'; inp.style.backgroundSize = '0% 100%,100% 100%';
    void inp.offsetWidth;
    inp.style.transition = 'background-size ' + dur + 'ms linear';
    inp.style.backgroundSize = '100% 100%,100% 100%';
  }
  mark(ms){
    const rows = (this.tl && this.tl.rows) || [], flat = this.flat;
    const marks = this.marks || (this.marks = []);
    /* 定过入点：早于那一刻的时刻不认「正唱到」也不认「唱过」，整排按没唱到摆（同步步走到那一刻才亮起来） */
    const wait = this.fromMs != null && ms < this.fromMs;
    let first = -1;
    for(let i = 0; i < flat.length; i++){
      const r = rows[i];
      const st = (!r || wait) ? 'pre' : (ms >= r.out ? 'post' : (ms >= r.in ? 'now' : 'pre'));
      /* 只改变了的这一格：每帧把三枚 class 往所有格子上重刷一遍，就是那片闪的来源 */
      if(st !== marks[i]){
        marks[i] = st;
        const b = flat[i].inp.parentNode; if(!b) continue;
        b.classList.toggle('now', st === 'now');
        b.classList.toggle('post', st === 'post');
        b.classList.toggle('pre', st === 'pre');
        this.sweep(flat[i].inp, st, rows[i], ms);
      }
      if(st === 'now' && first < 0) first = i;
    }
    this.cur = first;
    /* 换行才滚：同一行里走格子不必把视口拽过去（每帧滚一下也是闪） */
    if(first >= 0){
      const ri = flat[first].ri;
      if(ri !== this.curRow){ this.curRow = ri;
        try{ flat[first].inp.scrollIntoView({ block:'nearest' }); }catch(e){} }
    }
  }
  beatDlg(){
    const b = (this.doc && this.doc.beat) || { sig:'4/4', bpm:120, from:1 };
    const sig = h('input', { class:'wnw-input', value:String(b.sig || '4/4'), style:'width:6em' });
    const bpm = h('input', { class:'wnw-input', value:String(b.bpm || 120), style:'width:6em' });
    const from = h('input', { class:'wnw-input', value:String(b.from || 1), style:'width:4em' });
    const ln = (t, el) => h('div', { style:'display:flex;align-items:center;gap:8px;margin:6px 0' }, [h('span', {}, t), el]);
    const ok = () => {
      const v = { sig:sig.value.trim() || '4/4', bpm:Number(bpm.value), from:Number(from.value) || 1 };
      if(!(v.bpm > 0)){ toast('BPM 得是个大于 0 的数'); return; }
      Overlay.close(); this.push(); this.doc.beat = v; LYRIC_UI.setNum('beat'); this.render(); this.touch();
    };
    lyricOverlay('节拍参数', h('div', { style:'min-width:20em' }, [
      ln('几几拍', sig), ln('BPM', bpm), ln('第一个字起于第几拍', from)]), [
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '算了'),
      h('button', { class:'wnw-btn primary', onclick:ok }, '定了')]);
  }
  /* 节拍那一档从前只把数换算出来给人看，没给填的地方（他图 2 说的正是这个）：切到这一档就在上面摆三枚小框，
     填了当场重算每一格上面那串「小节.拍」，不用开对话框、不用等下一回。BPM 没填之前那个文件里不多出「拍 =」那一行。 */
  beatRow(){
    const put = (k, v) => {
      if(!this.doc.beat) this.doc.beat = { sig:'4/4', bpm:'', from:1 };
      /* BPM 和起拍存成数（那两枚按数算，字符串进不了 okMs 那把尺，拍子会算不动）；没填或填歪了留空，不硬造一个默认拍子 */
      this.doc.beat[k] = k === 'sig' ? (v || '4/4') : (v !== '' && isFinite(Number(v)) ? Number(v) : '');
      this.relabel(); this.touch();
    };
    const b = (this.doc && this.doc.beat) || {};
    const f = (val, w, k, tip) => h('input', { class:'wnw-input', style:'width:' + w, value:String(val == null ? '' : val),
      spellcheck:'false', title:tip, oninput:e => put(k, e.target.value.trim()) });
    return h('div', { class:'wnw-lbeat' }, [
      h('span', {}, '几几拍'), f(b.sig, '4.4em', 'sig', '分子是一小节里几个大拍，分母是几分音符当一个大拍（6/8 那种也算得对）'),
      h('span', {}, 'BPM'), f(b.bpm, '4.4em', 'bpm', '这一个大拍一分钟跳几次 —— 填了这一格，上面那串数才按拍子走'),
      h('span', {}, '第一个字起于'), f(b.from, '3.6em', 'from', '前奏之后第一个字落在小节的第几拍（从 1 数）')]);
  }
  render(focus){
    const host = this.host;
    if(!host) return;
    host.innerHTML = '';
    this.norm();
    host.appendChild(this.bar());
    host.appendChild(h('div', { class:'wnw-lhint' }, this.hintText()));
    if(LYRIC_UI.num === 'beat') host.appendChild(this.beatRow());
    if(this.warn) host.appendChild(h('div', { class:'wnw-lwarn' }, this.warn));
    if(this.tap) host.appendChild(this.tapStrip());
    const box = h('div', { class:'wnw-lyric' + (LYRIC_UI.view.rom ? '' : ' hide-rom')
      + (LYRIC_UI.view.trn ? '' : ' hide-trn') + (LYRIC_UI.view.wrd ? '' : ' hide-wrd') });
    this.box = box;
    box.style.setProperty('--lscale', String(LYRIC_UI.scale / 100));
    box.style.setProperty('--lwho-w', String(LYRIC_UI.whoW) + 'em');
    this.flat = [];
    this.marks = []; this.curRow = -1;
    this.tl = this.timeline();
    this.lines.forEach((L, li) => {
      const nt = String(L.note || '').trim();
      if(nt) box.appendChild(h('div', { class:'wnw-lnote', title:'这一行的段前说明，右键这一行改' }, nt));
      box.appendChild(this.row(L, li));
      if(LYRIC_UI.fill === 'fill') box.appendChild(this.fillRow(L, li));
      if(L.trans) box.appendChild(this.transRow(L));
    });
    host.appendChild(box);
    /* 拍点那一排上的数每回重画都跟着当前这一刻走（不在这里补一次，刚进去那一趟条上是空的） */
    if(this.tap) this.tapPaint();
    this.indentRows();
    this.paintCuts();
    if(focus != null && this.flat[focus]) { this.flat[focus].inp.focus(); this.flat[focus].inp.select(); }
  }
  bar(){
    const file = h('input', { type:'file', accept:'.ttml,.xml,.json,.txt', style:'display:none',
      onchange:async e => { const f = e.target.files && e.target.files[0];
        if(f) await this.importFile(f); e.target.value = ''; } });
    /* 图11 那一枚另开一只输入口：挑的是音频本身，不是歌词文件。后缀名单跟音乐遥控器那一家
       能认的那一串一字不差（mp3 / m4a / flac / ogg / m4a 系 / wav / wma / mkv） */
    const audio = h('input', { type:'file', accept:'.mp3,.m4a,.mp4,.aac,.flac,.ogg,.oga,.opus,.wav,.wma,.mkv,.webm', style:'display:none',
      onchange:async e => { const f = e.target.files && e.target.files[0];
        if(f) await this.importTag(f); e.target.value = ''; } });
    const btn = (txt, title, fn, off) => h('button', { class:'wnw-btn mini', title, disabled:!!off, onclick:fn }, txt);
    const rng = h('input', { type:'range', min:'60', max:'260', step:'10', value:String(LYRIC_UI.scale),
      title:'把格子和字一起放大 / 缩小（这台机器记住，不写进那个文件）',
      oninput:e => { LYRIC_UI.set(Number(e.target.value) || 100);
        if(this.box) this.box.style.setProperty('--lscale', String(LYRIC_UI.scale / 100)); } });
    return h('div', { class:'wnw-lbar' }, [
      btn('导入', '选一份逐字 ttml、这份明文、或全标记那份 JSON；也可以直接拖进这一屏', () => file.click()),
      btn('从歌曲标签', '挑一个音频文件，把它标签里内嵌的那份歌词读出来铺成行（mp3 的 USLT、flac/ogg 的 LYRICS 与 UNSYNCEDLYRICS、m4a 的 ©lyr、mkv 的 Tags）—— 读的是文件自己的标签，不去联网找；标签里没有歌词会当场说没有',
        () => audio.click()),
      btn('导出…', '逐字 ttml ／ 逐句 lrc ／ 纯文字 ／ 全标记 —— 出之前给文件名，名字撞回导进来那一份会先提醒一句',
        ev => Menu.under(ev.currentTarget, Object.keys(LYRIC_EXPORTS).map(k => ({ label:LYRIC_EXPORTS[k].label,
          title:LYRIC_EXPORTS[k].hint, fn:() => this.exportDlg(k) })))),
      btn('加一行', '在最后一行下面加一行', () => this.addRow()),
      btn('撤回', '撤回刚才那一步拆、并、拖', () => this.undoStep(), !this.undo.length),
      btn('重做', '把撤回掉的那一步放回去', () => this.redoStep(), !this.redo.length),
      h('label', { class:'wnw-lsize' }, [h('span', {}, '大小'), rng]),
      btn('数值：' + ((LYRIC_UI.NUMS.find(x => x[0] === LYRIC_UI.num) || LYRIC_UI.NUMS[0])[1]),
        '格子上面那串数怎么读：时长（这一格唱多少毫秒）／ 出入（入点在格子上、出点在格子下，分秒毫秒）／ 节拍（第几小节第几拍，要填拍号、BPM、起拍）',
        ev => Menu.under(ev.currentTarget, LYRIC_UI.NUMS.map(x => ({ label:x[1], on:LYRIC_UI.num === x[0],
          fn:() => { LYRIC_UI.setNum(x[0]); this.render(); } })).concat([{ sep:true },
            { label:'节拍参数…', fn:() => this.beatDlg() }]))),
      btn('填法：' + ((LYRIC_UI.FILLS.find(x => x[0] === LYRIC_UI.fill) || LYRIC_UI.FILLS[0])[1]),
        '同一份格子三种打法：按格填（一格格打字）／ 标音节（打的是这一格几个音节）／ 整句填（一行底下一根横线整句写，再一键拆回格子）；快捷建词格和拍点也在这张单子里',
        ev => Menu.under(ev.currentTarget, LYRIC_UI.FILLS.map(x => ({ label:x[1], on:LYRIC_UI.fill === x[0],
          title:x[0] === 'count' ? '程序不替你数音节 —— 数出来会有出入，他说要手标' : '',
          fn:() => this.setFill(x[0]) })).concat([{ sep:true },
            { label:'快捷建词格…', title:'照「xxxx xxxx」那一串铺出空格子：占位符、分格符、换行符都随他定', fn:() => this.quickDlg() },
            { label:this.tap ? '停下拍点' : '拍点打时值…',
              title:'跟着音乐遥控器正在放的那首歌，f 开始、空格一打一停、j 结束：点与点之间就是那一格唱多久，生成的是带时长的空格子（输入法要先切英文）', fn:() => this.tapToggle() }]))),
      btn('批量…', '整首一起处理：注音 / 翻译与注释 / 原文 三档显隐（只动这一屏摆不摆，那个文件一个字不动），另有三档整首删（删了能撤回）',
        ev => Menu.under(ev.currentTarget, this.batchItems())),
      this.playBtnEl = btn(this.playLabel(), '自己数着走一遍这一首，看颜色走到哪一格（词格这一档不出声音）', () => this.play()),
      btn('跟随遥控器' + (this.follow ? '：开' : '：关'), '跟着音乐遥控器那一家正在放的那首歌走：它播到第几毫秒，这边就亮到第几格（歌词延后那一档它已经扣过了）',
        () => this.setFollow(!this.follow)),
      h('span', { style:'flex:1' }),
      h('span', { class:'wnw-lfile', title:'一个词格一个明文文件，记事本打得开：落在宿主用户数据目录底下的 lyrics\\ 里' },
        'lyrics\\' + (this.c.lyricFile || '（还没落文件名）')),
      file, audio
    ]);
  }
  /* 「批量…」那六条（他第 6 条）：三条是这一屏摆不摆 —— 这台机器记住，那个文件一个字都不动；
     三条是整首删 —— 进撤回栈，删错了按「撤回」那一个拿回来，所以不再另问一遍。 */
  batchItems(){
    const v = LYRIC_UI.view;
    return [
      { label:(v.rom ? '隐藏' : '显示') + '所有注音', title:'只收掉每一格上面那一层注音，文件里的注音一个字不动', fn:() => this.viewToggle('rom') },
      { label:(v.trn ? '隐藏' : '显示') + '所有翻译与注释', title:'行上面的段前说明和行下面的翻译一起收掉 / 摆回来', fn:() => this.viewToggle('trn') },
      { label:(v.wrd ? '隐藏' : '显示') + '所有原文', title:'把词那一层遮住背：格子、时值、注音、翻译都还在，只是看不见词', fn:() => this.viewToggle('wrd') },
      { sep:true },
      { label:'删掉所有注音', title:'整首清掉每一格的注音（撤回拿得回来）', fn:() => this.dropAll('rom') },
      { label:'删掉所有翻译与注释', title:'整首清掉行下面的翻译和行上面的段前说明（撤回拿得回来）', fn:() => this.dropAll('trn') },
      { label:'删掉所有原文', title:'整首把格子里的词清掉，时值、注音、翻译留着（撤回拿得回来）', fn:() => this.dropAll('wrd') }];
  }
  viewToggle(k){ LYRIC_UI.setView(k, !LYRIC_UI.view[k]); this.render(); }
  countAll(k){
    let n = 0;
    for(const L of this.lines){
      if(k === 'trn'){ if(L.trans) n++; if(L.note) n++; continue; }
      for(const cl of (L.clauses || [])) for(const c of (cl.cells || []))
        if(k === 'rom' ? String((c && c.n) == null ? '' : c.n).trim() : String((c && c.t) || '').trim()) n++;
    }
    return n;
  }
  dropAll(k){
    const n = this.countAll(k);
    if(!n){ toast(k === 'rom' ? '这一首没有注音可删' : k === 'trn' ? '这一首没有翻译和段前说明可删' : '这一首格子里没有词'); return; }
    this.push();
    for(const L of this.lines){
      if(k === 'trn'){ if(L.trans) delete L.trans; if(L.note) delete L.note; continue; }
      if(k === 'rom'){ if(L.roman) delete L.roman; }
      for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])){
        if(!c) continue;
        if(k === 'rom'){ if('n' in c) delete c.n; }
        else if(k === 'wrd') c.t = '';
      }
    }
    this.render(); this.touch();
    toast('删掉 ' + n + ' 处 —— 撤回那一个能拿回来');
  }
  row(L, li){
    const r = h('div', { class:'wnw-lrow' });
    /* 这一行有没有注音那一层：格子上真带着注音（从文件里来的），或者他这一行开了这一层（等着填） */
    const hasN = this.romanOn(L);
    r.appendChild(h('span', { class:'wnw-lno', title:'第 ' + (li + 1) + ' 行' }, String(li + 1)));
    r.appendChild(h('input', { class:'wnw-lseg', value:L.seg || '', placeholder:'—', title:'这一段的名字',
      oninput:e => { L.seg = e.target.value; this.touch(); } }));
    const wc = this.whoChip(L, li); if(wc) r.appendChild(wc);
    (L.clauses || []).forEach((cl, ci) => {
      if(ci) r.appendChild(this.gap(L, ci));
      r.appendChild(this.clause(L, cl, ci, li, hasN));
    });
    const ms = this.rowMs(L);
    if(ms) r.appendChild(h('span', { class:'wnw-lsum', title:'这一行合计唱多久' }, (ms / 1000).toFixed(2) + '″'));
    /* 格子那一支自己拦了冒泡，所以落在行的其余任何地方都算「右键这一行」：
       从前只认正好点中行的空白，而一行被行号、段名、格子、缝占得满满的，等于根本没得点 */
    r.addEventListener('contextmenu', e => this.rowMenu(e, L, li));
    /* 拍点那一档：点哪一行就是给哪一行打点，正在打的那一左沿上一道色 */
    if(this.tap){ if(this.tap.li === li) r.classList.add('tapping');
      r.addEventListener('click', () => this.tapTo(li)); }
    return r;
  }
  /* 翻译摆在行的下面：这一层不给在这儿改（改的是那个明文文件里的「译 =」），但可以不显示 —— 删掉只删这一行的 */
  transRow(L){
    return h('div', { class:'wnw-ltrans' }, [
      h('span', { title:'这一行的翻译（要改去改文件里的「译 =」那一行）' }, String(L.trans || '')),
      h('button', { class:'wnw-btn mini', title:'不显示这一行的翻译',
        onclick:() => { this.push(); delete L.trans; this.render(); this.touch(); } }, '删掉翻译')
    ]);
  }
  clause(L, cl, ci, ri, hasN){
    const w = h('div', { class:'wnw-lcl' });
    const timed = this.timed(L);
    cl.cells.forEach((c, k) => {
      if(k) w.appendChild(this.seam(L, cl, k, timed));
      w.appendChild(this.cell(L, cl, ci, k, timed, ri, hasN));
    });
    return w;
  }
  cell(L, cl, ci, k, timed, ri, hasN){
    const c = cl.cells[k];
    const box = h('div', { class:'wnw-lcell' + (this.over(c) ? ' over' : '') + (this.cutCell === c ? ' cutting' : '') });
    if(timed) box.style.flex = Math.max(LyricFmt.okMs(c.ms) ? c.ms : 0, 1) + ' 1 0';
    else box.style.flex = '1 1 0';
    const t = (this.tl && this.tl.rows) ? this.tl.rows[this.flat.length] : null;
    /* 双击这串数 = 把这一格定成播放的入点（下一次播放从这一刻起走）；拆格走右键，两个手势不抢同一个地方 */
    const isFrom = this.fromMs != null && t && Math.round(t.in) === Math.round(this.fromMs);
    const 子说 = (() => { const p = lyricParts(c); return p.有分 ? ' ｜ 这一格里分 ' + p.n + ' 子：'
      + p.texts.map((x, i) => (x || '·') + ' ' + p.durs[i] + 'ms').join(' ＋ ') : ''; })();
    const ms = h('div', { class:'wnw-lms' + (isFrom ? ' from' : ''),
      title:(isFrom ? '这一格是播放的入点：双击这里取消' : '双击这里：把这一格定成播放的入点 —— 下一次模拟播放从这里起走，同步播放早于这一刻的时刻不点亮；要拆格右键这一格')
        + 子说 + (isFrom ? '' : ' ｜ 双击格子里那串字 = 进分音节这一档（进来后单击落一刀，再双击出去）'),
      ondblclick:() => this.setFrom(t) }, this.topText(t, c));
    /* 注音那一格和原文那一格是同一格的两层：宽窄按时值铺、时值标在顶上、拆并清都跟着这一格走，
       这里只多摆一个能改字的口 —— 注音存在格子自己身上（c.n），所以那些操作天生就是绑定的。
       两层各给一个 Delete：注音那一格里删只收注音，原文那一格一个字不动。 */
    const li = this.flat.length;
    const nin = hasN ? h('input', { class:'wnw-ltxt wnw-ln', value:(c && c.n != null) ? c.n : '', spellcheck:'false',
      title:'这一格的注音（和下面那格是一对，拆并拖都一起）；Delete 只收这一格的注音',
      oninput:e => { c.n = e.target.value; this.touch(); },
      onkeydown:e => { if(this.noteKey(e, nin, L, cl, k)) return; this.cellKey(e, nin); } }) : null;
    if(nin) nin._li = li;
    /* 标音节那一档：同一个口打进去的是这一格几个音节，不是字（他不许程序自己数，说数出来会有出入） */
    const counting = LYRIC_UI.fill === 'count';
    const inp = counting ? h('input', { class:'wnw-ltxt', value:(LyricFmt.okMs(c.k) && c.k > 0) ? String(Math.round(c.k)) : '',
      inputmode:'numeric', spellcheck:'false', title:'这一格唱几个音节（这一档打的是数，不是字）',
      oninput:e => { const v = String(e.target.value).replace(/[^\d]/g, ''); if(v !== e.target.value) e.target.value = v;
        if(Number(v) > 0) c.k = Number(v); else delete c.k; this.touch(); },
      oncontextmenu:e => this.cellMenu(e, L, cl, k) })
      : h('input', { class:'wnw-ltxt', value:c.t, spellcheck:'false',
      oninput:e => { c.t = e.target.value; box.classList.toggle('over', this.over(c)); this.touch(); },
      oncontextmenu:e => this.cellMenu(e, L, cl, k) });
    inp._cell = c; inp._cl = cl; inp._L = L;
    inp.addEventListener('keydown', e => this.cellKey(e, inp));
    inp.addEventListener('paste', e => this.cellPaste(e, inp));
    /* 分音节这一档改成三步（外27 图3）：双击那一格 = 进来（这一格凸显），
       进来之后单击 = 在点到的地方落一刀，再双击那一格 = 出去。
       从前是双击那一下直接落刀，鼠标走的那点距离全算进刀位 —— 他说分节位置飘，根子在这儿；
       而且一刀一合都在同一个手势里，人在格子上连点两下就把刚分的又合掉了。
       单击要等一小段再落刀：双击的头一下也会发一次单击，不等就会在出去那一下多落一刀。 */
    if(!counting){
      inp.addEventListener('click', e => { if(this.cutCell !== c) return;
        const x = e.clientX, y = e.clientY;
        clearTimeout(this.cutTimer);
        this.cutTimer = setTimeout(() => this.cutAt({ clientX:x, clientY:y }, inp, c), 220); });
      inp.addEventListener('dblclick', () => this.cutToggle(c));
    }
    box.appendChild(ms); if(nin) box.appendChild(nin); box.appendChild(inp);
    /* 出入那一档：入点写在格子上、出点写在格子下（他给的那张参考图就是这个摆法） */
    const bot = this.botText(t);
    if(bot) box.appendChild(h('div', { class:'wnw-lms wnw-lms2', title:'这一格的出点' }, bot));
    /* 音节数标在格子的最下面：上面那串数是时值，两个数挤在一块就读不出谁是谁 */
    if(!counting && LyricFmt.okMs(c.k) && c.k > 0)
      box.appendChild(h('div', { class:'wnw-lsyl', title:'这一格唱 ' + Math.round(c.k) + ' 个音节' }, String(Math.round(c.k))));
    /* 这一格在整排格子里的第几个：越格走、粘贴摊格子都按这个号找，不拿 indexOf 找（flat 里装的是包起来的那枚对象） */
    inp._li = li;
    this.flat.push({ inp, L, cl, k, ri });
    return box;
  }
  /* 量一串字多宽：输入框里做不到 Range 量位（input 不是 contenteditable），借一把 canvas 的尺，
     字号字体照那一格自己算出来的样式抄，缩放那一档（--lscale）已经含在 fontSize 里 */
  static measure(inp, s){
    const ctx = LyricGrid._cv || (LyricGrid._cv = document.createElement('canvas').getContext('2d'));
    const st = getComputedStyle(inp);
    ctx.font = [st.fontStyle, st.fontWeight, st.fontSize, st.fontFamily].filter(Boolean).join(' ');
    return ctx.measureText(String(s || '')).width;
  }
  /* 进 / 出某一格的「分音节」这一档。认的是格子那一棵树（c），不是界面那个口 —— 落一刀就重画一次，
     界面那一口每回都是新的，认 DOM 节点会在第二刀之前就把状态弄丢。 */
  cutToggle(c){
    clearTimeout(this.cutTimer);                      /* 双击的头一下那次单击不算落刀 */
    if(this.playing) return;                          /* 正在播的时候不抢这一枚手势 */
    if(this.cutCell === c){ this.cutCell = null; this.render(); this.touch(); toast('退出分音节'); return; }
    const 字 = Array.from(String((c && c.t) || ''));
    if(字.length < 2){ toast('这一格不到两个字，没什么可分的'); return; }
    this.cutCell = c; this.render(); this.touch();
    toast('这一格凸显出来了：在要分的地方单击落一刀，再双击这一格出去');
  }
  /* 双击那一格：把鼠标的位置换成「第几个字后面」，那里已经有一刀就合回去，没有就分一刀（外26 第 9、10 条）。
     分完之后各子怎么分这一格的时长：原来有逐子时长就把挨着那一刀的一段一劈两半，没有就留空（读回来照总时长平摊）。 */
  cutAt(e, inp, c){
    const 全 = String(inp.value == null ? c.t : inp.value) || '', 字 = Array.from(全);
    if(字.length < 2){ toast('这一格不到两个字，没什么可分的'); return; }
    const st = getComputedStyle(inp);
    const padL = parseFloat(st.paddingLeft) || 0, padR = parseFloat(st.paddingRight) || 0;
    const 内容宽 = Math.max(0, inp.clientWidth - padL - padR);
    const 总宽 = LyricGrid.measure(inp, 全);
    const 起 = inp.getBoundingClientRect().left + padL +
      (st.textAlign === 'center' ? Math.max(0, (内容宽 - 总宽) / 2) : 0);
    let 点 = 0;
    for(let i = 1; i < 字.length; i++) if(e.clientX >= 起 + LyricGrid.measure(inp, 字.slice(0, i).join(''))) 点 = i;
    const cuts = (Array.isArray(c.cut) ? c.cut.slice() : []).filter(x => x > 0 && x < 字.length);
    const at = cuts.indexOf(点);
    const 老 = (Array.isArray(c.pm) && c.pm.length === cuts.length + 1) ? c.pm.slice() : null;
    this.push();
    if(at >= 0){
      cuts.splice(at, 1);
      if(老){ const 合 = (老[at] || 0) + (老[at + 1] || 0); 老.splice(at, 2, 合); }
    }else{
      cuts.push(点); cuts.sort((a, b) => a - b);
      if(老){ let k = 0; for(let i = 0; i < cuts.length; i++) if(cuts[i] === 点){ k = i; break; }
        const 半 = Math.floor((老[k] || 0) / 2); 老.splice(k, 1, 半, Math.max(0, (老[k] || 0) - 半)); }
    }
    const 新 = cuts.filter(x => x > 0 && x < 字.length);
    if(新.length) c.cut = 新; else delete c.cut;
    if(老 && 新.length && 老.length === 新.length + 1) c.pm = 老; else delete c.pm;
    this.render(); this.touch();
    toast(新.length ? '这一格分成 ' + (新.length + 1) + ' 子' + (c.pm ? '（每子的时长已经分开）' : '（时长先平摊，拍点或改时值再调）')
      : '这一格合回一整块');
  }
  /* 把每一格的分刀画成虚线：盖在输入口那一条上，位置按字宽算（居中的那一档要把左右留白也算进去） */
  paintCuts(){
    const box = this.box; if(!box) return;
    for(const f of this.flat){
      const 格 = f.inp.parentNode; if(!格) continue;
      for(const old of Array.from(格.querySelectorAll('.wnw-lcut'))) old.remove();
      const c = f.inp._cell, 字 = Array.from(String(c && c.t || ''));
      const cuts = (c && Array.isArray(c.cut) ? c.cut : []).filter(x => x > 0 && x < 字.length);
      if(!cuts.length) continue;
      const st = getComputedStyle(f.inp);
      const padL = parseFloat(st.paddingLeft) || 0, padR = parseFloat(st.paddingRight) || 0;
      const 内容宽 = Math.max(0, f.inp.clientWidth - padL - padR);
      const 总宽 = LyricGrid.measure(f.inp, 字.join(''));
      const 起 = f.inp.offsetLeft + padL + (st.textAlign === 'center' ? Math.max(0, (内容宽 - 总宽) / 2) : 0);
      const ov = h('div', { class:'wnw-lcut', title:'这一格里分了音节：虚线就是那一刀（双击这一格进来分音节，在要分的地方单击落一刀，点在原来的刀上合回去，再双击这一格出去）' });
      for(const x of cuts) ov.appendChild(h('i', { style:'left:' + Math.round(起 + LyricGrid.measure(f.inp, 字.slice(0, x).join(''))) + 'px' }));
      ov.style.top = f.inp.offsetTop + 'px'; ov.style.height = f.inp.offsetHeight + 'px';
      格.appendChild(ov);
    }
  }
  /* 格之间的缝：拖着 = 把时长在两格之间挪；双击 = 并回上一格 */
  seam(L, cl, k, timed){
    const s = h('i', { class:'wnw-lseam' + (timed ? '' : ' dead'),
      title:timed ? '按住左右拖 = 把时长挪给隔壁那一格；双击 = 并回上一格' : '双击 = 并回上一格（这一行还没配时长，拖不出东西）' });
    if(timed) s.addEventListener('pointerdown', ev => this.dragSeam(ev, s, L, cl, k));
    s.addEventListener('dblclick', () => this.mergeCell(cl, k));
    return s;
  }
  /* 逗之间那道斜缝：双击把后一逗并回前一逗 */
  gap(L, ci){
    return h('i', { class:'wnw-lgap', title:'双击这里把这一逗并回上一逗；要在某一格上起新逗，右键那一格',
      ondblclick:() => { const a = L.clauses[ci - 1], b = L.clauses[ci];
        if(!a || !b) return; this.push();
        a.cells = a.cells.concat(b.cells); L.clauses.splice(ci, 1); this.render(); this.touch(); } });
  }
  /* 一格唱多久 ÷ 这一逗的画幅 = 一像素几毫秒；拖缝就是在这个逗里挪时长（总量守恒，不会拖出多出来的时间） */
  clMs(cl){ let s = 0; for(const c of (cl.cells || [])) if(LyricFmt.okMs(c.ms)) s += c.ms; return s; }
  dragSeam(ev, el, L, cl, k){
    /* 这一道缝编号 k 是「第 k 格左边那条」，所以它夹着的是 k-1 和 k 两格（并格也按这个号，两处同一个口径） */
    const a = cl.cells[k - 1], b = cl.cells[k];
    if(!a || !b) return;
    ev.preventDefault(); ev.stopPropagation();
    const a0 = LyricFmt.okMs(a.ms) ? a.ms : 0, b0 = LyricFmt.okMs(b.ms) ? b.ms : 0;
    if(!a0 && !b0) return;
    this.push();
    const row = el.closest('.wnw-lrow'), clw = el.parentNode;
    const x0 = ev.clientX;
    const px = Math.max(120, (clw && clw.clientWidth) || 120);
    const per = Math.max(1, this.clMs(cl)) / px;
    const paint = (c, box) => {
      if(!box || !box.classList.contains('wnw-lcell')) return;
      box.style.flex = Math.max(LyricFmt.okMs(c.ms) ? c.ms : 0, 1) + ' 1 0';
      /* 上面那串数按当前那一档重算（时长档看这一格多久，出入档看落点，节拍档看小节） */
      this.tl = this.timeline(); this.labelBox(box);
      const s = row && row.querySelector('.wnw-lsum');
      if(s) s.textContent = (this.rowMs(L) / 1000).toFixed(2) + '″';
    };
    el.classList.add('on');
    const mv = e => {
      const d = Math.max(-a0, Math.min(b0, Math.round((e.clientX - x0) * per)));
      a.ms = a0 + d; b.ms = b0 - d;
      paint(a, el.previousElementSibling); paint(b, el.nextElementSibling);
    };
    const up = () => { el.classList.remove('on');
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up); this.touch(); };
    el.setPointerCapture(ev.pointerId);
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
  /* ---------- 导出：四种落法，每一种都先过一道「叫什么名」的框 ----------
     这台程序没设 will-download，页面上走 download() 弹的就是系统那个另存为框（落在哪儿由他选），
     所以「另存为」不用另做；要防的是名字撞回导进来那一份 —— 撞上了必须先提醒，第二下才真出。 */
  exportDlg(kind){
    if(!this.doc || !this.lines.length){ toast('这一屏还没有词格'); return; }
    const f = LYRIC_EXPORTS[kind]; if(!f) return;
    const src = ((this.c.lyricSrc || '').match(/[^\\/]+$/) || [''])[0];
    const def = this.baseName() + '.' + f.ext;
    const name = h('input', { class:'wnw-input', value:def, style:'width:100%' });
    const warn = h('div', { class:'wnw-lwarn' });
    let ok2 = false;
    const hit = () => { const v = name.value.trim(); return !!src && v.toLowerCase() === src.toLowerCase(); };
    const chk = () => {
      if(hit()) warn.style.display = '', warn.textContent = ok2 ? '这一按就照这个名字出，会盖掉「' + src + '」'
        : '这个名字和导进来那一份同名（' + src + '）—— 存回原处会把原词冲掉，先换个名字，或再点一次确认要盖';
      else { warn.style.display = 'none'; ok2 = false; }
    };
    name.addEventListener('input', () => { ok2 = false; chk(); }); chk();
    const go = () => {
      const v = name.value.trim() || def;
      if(hit() && !ok2){ ok2 = true; chk(); return; }
      Overlay.close(); this.doExport(kind, v);
    };
    lyricOverlay('导出 · ' + f.label, h('div', { style:'min-width:24em' }, [
      h('div', { class:'wnw-hint' }, f.hint), name, warn]), [
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '算了'),
      h('button', { class:'wnw-btn primary', onclick:go }, '另存为')]);
    setTimeout(() => { try{ name.focus(); name.select(); }catch(e){} }, 30);
  }
  doExport(kind, name){
    const d = this.doc;
    if(kind === 'ttml'){
      let miss = 0;
      for(const L of this.lines) for(const cl of L.clauses) for(const c of cl.cells) if(!LyricFmt.okMs(c.ms)) miss++;
      download(name, lyricToTtml(d));
      toast('逐字 ttml 出了' + (miss ? '（有 ' + miss + ' 格还没配时长，按 0 写）' : ''));
    } else if(kind === 'lrc'){ download(name, lyricToLrc(d, this.c.title || '')); toast('逐句 lrc 出了'); }
    else if(kind === 'txt'){ download(name, lyricTxt(d)); toast('纯文字出了：只有词和段前说明，不带任何时间'); }
    else if(kind === 'full'){ download(name, lyricFull(d, this.c.title || '')); toast('全标记那份出了（段前说明、注音、翻译、音节、节拍参数都在里面）'); }
  }
  /* 导入认四样：逐字 ttml、这份明文、全标记那份 JSON、纯歌词 txt 走 ttml 那条读不动就报清楚 */
  async importFile(f){
    const nm = String(f.name || '');
    const text = await f.text();
    if(/\.json$/i.test(nm)){
      const d = lyricFromFull(text);
      if(!d){ toast('这份 JSON 不是词格导出去的那份全标记'); return; }
      this.push(); this.doc = d; this.c.lyric = d;
      this.render(); this.touch();
      toast('全标记那份读进来了：' + d.lines.length + ' 行');
      return;
    }
    if(/\.txt$/i.test(nm)){
      const d = LyricFmt.parse(text);
      if(!d.lines.length){ toast('这份 txt 里没认出「词 = 」那一行，读不了'); return; }
      this.push(); this.doc = d; this.c.lyric = d;
      if(f.path) this.c.lyricSrc = String(f.path);
      this.render(); this.touch();
      toast('按这份明文读进来了：' + d.lines.length + ' 行');
      return;
    }
    await this.importTtml(text, nm, f.path);
  }
  /* ---------- 从歌曲标签提取歌词（作者 2026-10-09 图11）----------
     字节解析（ID3v2 的 USLT/SYLT、Vorbis 注释、MP4 的 ©lyr、Matroska 的 Tags）住在音乐遥控器那一家里，
     它本来就要读这些才拿得到歌词 —— 这里不抄第二份，走 _shared\sh-mus.js 那一格拿它的读者（谁挂上来见
     data\plugins\music-remote\main.js 的 init）。所以那一家这一趟没加载时这一条走不通，话说明白，
     不假装「读到了但歌词是空的」。
     标签里那份歌词两种写法都有：光一行一句，或者带 LRC 那种时间戳。时间戳这一趟先剥掉 —— 词格要的是
     一格一格的字，那点时间是行级的、不是格级的，留着反而会被当成词里的字。铺法走现成的明文那一条
     （一行一句「词 = 」），不另起一套建文档的路子。 */
  async importTag(f){
    const T = (typeof MusTag === 'undefined') ? null : MusTag;
    if(!T || !T.ready){ toast('这一趟没连上音乐遥控器那一家：标签的读法在那一份里，先在桌面上摆上它再过来', true); return; }
    /* 递一个只读区间的口子给那一份解析器（它要的是文件句柄那个形状）：一段一段切，不整首读进内存 */
    const fh = { readRange:async (s, l) => new Uint8Array(await f.slice(s, s + l).arrayBuffer()) };
    let r = null;
    try{ r = await T.from(fh, String(f.name || '')); }
    catch(e){ toast('这个文件的标签读不了：' + ((e && e.message) || e), true); return; }
    const 原文 = String((r && r.text) || '');
    if(!原文.trim()){ toast('「' + (f.name || '这个文件') + '」的标签里没有内嵌歌词 · 旁边那枚「导入」挑 ttml / 明文 / 全标记', true); return; }
    /* 行首那些方括号（时间戳、[ti:] 那种元数据）都不是词：共用那一只手剥掉，见 lyricTagLines */
    const 句 = lyricTagLines(原文).map(s => '词 = ' + s).join('\n');
    const d = LyricFmt.parse(句);
    if(!d.lines.length){ toast('标签里那份歌词没认出一句词来'); return; }
    this.push(); this.doc = d; this.c.lyric = d;
    this.render(); this.touch();
    toast('从' + ((r && r.from) || '歌曲标签') + '读到 ' + d.lines.length + ' 行 · 时值还空着，用拍点或跟着播放补');
  }
  /* ---------- 键盘：Enter 去下一行的第一格（末尾那一行就当场加一行），← → 越格走 ----------
     第几格认的是输入框上挂的那个号（flat 里装的是包了一层的条目，拿 indexOf(输入框) 永远找不到） */
  cellKey(e, inp){
    const at = inp._li;
    if(at < 0) return;
    if(this.flat[at]) this.lastLi = this.flat[at].ri;
    /* 拍点那一档里空格、回车、Esc 都归上面那条拍点排管：空格不能变成格子里一个空格，回车不能顺手加一行 */
    if(this.tap && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ' || e.code === 'Space')) return;
    const go = i => { const t = this.flat[i]; if(t){ t.inp.focus(); t.inp.select(); } };
    if(e.key === 'Enter'){ e.preventDefault();
      const mine = this.flat[at].ri;
      let n = this.flat.findIndex(x => x.ri > mine);
      if(n < 0){ this.addRow(); n = this.flat.length - 1; }
      go(n); return;
    }
    if(e.key === 'Tab'){ e.preventDefault(); go(Math.min(this.flat.length - 1, at + 1)); return; }
    if(e.key === 'ArrowLeft' && !inp.selectionStart && !inp.selectionEnd){ if(at > 0) go(at - 1); return; }
    if(e.key === 'ArrowRight' && inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length)
      { if(at < this.flat.length - 1) go(at + 1); return; }
    if(e.key === 'Backspace' && !inp.value && at > 0){ e.preventDefault(); this.dropCell(at); }
    /* 拆、并、删、入点都给了键：填词那一路手不该为了动一格结构去够右键（Alt 系列不吞字，程序没有菜单栏） */
    if(e.altKey && !e.ctrlKey && !e.metaKey){ const k = String(e.key || '').toUpperCase();
      const x = this.flat[at]; if(!x) return;
      if(k === 'D'){ e.preventDefault(); this.splitCell(x.cl, x.k); return; }
      if(k === 'M'){ e.preventDefault(); this.mergeCell(x.cl, x.k); return; }
      if(k === 'X'){ e.preventDefault(); if(e.shiftKey) this.delRow(x.L); else this.dropCell(at); return; }
      if(k === 'N'){ e.preventDefault(); if(e.shiftKey) this.romanToggle(x.L); else this.dropNote(x.L, x.cl, x.k); return; }
      if(k === 'I'){ e.preventDefault(); this.setFrom(this.tl && this.tl.rows ? this.tl.rows[at] : null); return; }
      return;
    }
    if(e.key === 'Delete'){ e.preventDefault();
      if(e.shiftKey){ const x = this.flat[at]; if(x) this.delRow(x.L); } else this.dropCell(at); }
  }
  /* 注音那一格的 Delete（或这一格已经空着、再按 Backspace）：只删这一格的注音，不动原文那一格。
     带 Shift / Alt 的不算（那是删行、整行注音，归快捷键那套管）；这一格本来没注音也不算，让键盘往下走删格。 */
  noteKey(e, inp, L, cl, k){
    if(e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;
    const c = cl && cl.cells ? cl.cells[k] : null;
    if(!c || c.n == null) return false;
    if(e.key !== 'Delete' && !(e.key === 'Backspace' && !inp.value)) return false;
    e.preventDefault(); e.stopPropagation();
    this.dropNote(L, cl, k);
    return true;
  }
  dropNote(L, cl, k){
    const c = cl && cl.cells ? cl.cells[k] : null;
    if(!c || c.n == null) return;
    this.push(); delete c.n; this.render(); this.touch();
  }
  /* 程序里那一套永久快捷键：切三档填法、定 / 取消入点。焦点在不在格子里都收得到 */
  hotKey(e){
    if(!e.altKey || e.ctrlKey || e.metaKey) return;
    const k = String(e.key || '').toUpperCase();
    if(k === '1'){ e.preventDefault(); this.setFill('cell'); return; }
    if(k === '2'){ e.preventDefault(); this.setFill('count'); return; }
    if(k === '3'){ e.preventDefault(); this.setFill('fill'); return; }
  }
  /* 粘进来一串字：从这一格起一格一格摊开（一格一字，整词占一格），不够就在同一逗里长出新格 */
  cellPaste(e, inp){
    const d = e.clipboardData || window.clipboardData;
    if(!d) return;
    const txt = String(d.getData('text') || '');
    if(!txt) return;
    e.preventDefault();
    const at = inp._li; if(at == null || !this.flat[at]) return;
    const cs = txt.split(/\r?\n/).map(x => x.trim()).filter(x => x);
    this.push();
    if(cs.length > 1){
      const here = this.flat[at], rows = this.lines;
      const atL = rows.indexOf(here.L);
      const tail = rows.slice(atL + 1);
      rows.length = atL + 1;
      here.cl.cells.length = here.k + 1;   /* 粘的是好几行：从这一格起到这一逗的尾巴算被这一串替换 */
      cs.slice(1).forEach(t => rows.push(Object.assign({ seg:here.L.seg || '', clauses:[
        { cells:String(t).split(/\s+/).reduce((a, x) => a.concat(LyricFmt.wordCells(x)), []) } ] },
        /* 粘出来的这几行也跟在原来那一行的演唱者、唱法后面 */
        (here.L.who ? { who:here.L.who.slice() } : {}), (here.L.how ? { how:here.L.how } : {}))));
      rows.push.apply(rows, tail);
      this.fillFrom(at, cs[0]);
      this.render(this.flat.length - 1);
      return;
    }
    const got = LyricFmt.wordCells(txt);
    this.fillFrom(at, txt);
    this.render(Math.min(this.flat.length - 1, at + got.length - 1));
  }
  /* 从第 at 格起一格一格摊进去：已有的格子换成字（时长留住），不够的往这一逗后面长出来 */
  fillFrom(at, txt){
    const cells = LyricFmt.wordCells(txt);
    const s = this.flat[at];
    if(!s || !cells.length) return;
    const cl = s.cl;
    for(let i = 0; i < cells.length; i++){
      const k = s.k + i;
      if(k < cl.cells.length) cl.cells[k] = { t:cells[i], ms:cl.cells[k].ms };
      else cl.cells.push({ t:cells[i], ms:null });
    }
  }
  /* ---------- 拆、并、删 ---------- */
  splitCell(cl, k){
    const c = cl.cells[k]; if(!c) return;
    const at = this.flat.findIndex(x => x.cl === cl && x.k === k);
    this.push();
    const cs = Array.from(c.t || ''), ms = LyricFmt.okMs(c.ms) ? c.ms : null;
    const ns = c.n == null ? null : Array.from(c.n);
    const half = a => { const n = Math.ceil(a.length / 2); return [a.slice(0, n).join(''), a.slice(n).join('')]; };
    let left, right;
    if(cs.length > 1){ const p = half(cs); left = p[0]; right = p[1]; }
    else { left = c.t || ''; right = ''; }
    let nleft = null, nright = null;
    /* 注音跟着原文一刀两断：同一格里那两层必须切在同一处，不然拆完字和音就错开了 */
    if(ns){ if(ns.length > 1){ const p = half(ns); nleft = p[0]; nright = p[1]; } else { nleft = c.n; nright = ''; } }
    let ml = null, mr = null;
    if(ms != null){ ml = Math.round(ms / 2); mr = ms - ml; }
    const a = { t:left, ms:ml }, b = { t:right, ms:mr };
    if(ns){ a.n = nleft; b.n = nright; }
    /* 音节也一分为二：几个音节拆成两格，两格各占一半（一个音节的那一格拆出去另一格就没音节可占） */
    const kk = (LyricFmt.okMs(c.k) && c.k > 0) ? Math.round(c.k) : 0;
    if(kk > 1){ a.k = Math.ceil(kk / 2); b.k = kk - a.k; } else if(kk === 1){ a.k = 1; }
    cl.cells.splice(k, 1, a, b);
    this.render(at >= 0 ? at + 1 : null);
    this.touch();
  }
  mergeCell(cl, k){
    if(!k) return;
    const a = cl.cells[k - 1], b = cl.cells[k];
    if(!a || !b) return;
    this.push();
    a.t = String(a.t || '') + String(b.t || '');
    /* 注音并格也并字：两层各并各的，谁也不许把对方的内容吃掉 */
    if(a.n != null || b.n != null) a.n = String(a.n == null ? '' : a.n) + String(b.n == null ? '' : b.n);
    /* 并格并把音节并起来：两格几个音节，并成一格就是几个 */
    if((LyricFmt.okMs(a.k) && a.k > 0) || (LyricFmt.okMs(b.k) && b.k > 0))
      a.k = (LyricFmt.okMs(a.k) && a.k > 0 ? a.k : 0) + (LyricFmt.okMs(b.k) && b.k > 0 ? b.k : 0);
    if(LyricFmt.okMs(a.ms) || LyricFmt.okMs(b.ms))
      a.ms = (LyricFmt.okMs(a.ms) ? a.ms : 0) + (LyricFmt.okMs(b.ms) ? b.ms : 0);
    cl.cells.splice(k, 1);
    this.render(); this.touch();
  }
  dropCell(at){
    const x = this.flat[at]; if(!x) return;
    const L = x.L, k = x.k;
    if(L.clauses.length === 1 && L.clauses[0].cells.length === 1) return;
    const was = this.rowMs(L);
    this.push();
    x.cl.cells.splice(k, 1);
    if(!x.cl.cells.length && L.clauses.length > 1) L.clauses.splice(L.clauses.indexOf(x.cl), 1);
    this.keepTiming(L, was);
    this.render(at - 1); this.touch();
  }
  /* 删到这一行一个时值都不剩时，把原来合计的时长压回仅留的那一格（外26 第 11 条）。
     这样一行不会塌成「没有时值的空格子」—— 拍点、导出的窗口都还接得上这一行原本占的那一段。
     这一行本来就一处时值都没有的（刚加的行、快捷建的那些格）不自造数字，只保证至少还剩一格。 */
  keepTiming(L, was){
    if(!L.clauses || !L.clauses.length) L.clauses = [{ cells:[{ t:'', ms:was > 0 ? was : null }] }];
    let last = null;
    for(const cl of L.clauses) for(const c of (cl.cells || [])) last = c;
    if(!last){ L.clauses = [{ cells:[{ t:'', ms:was > 0 ? was : null }] }]; return; }
    if(was > 0 && !this.rowMs(L)) last.ms = was;
  }
  splitClause(cl, k){
    const L = this.lines.find(x => x.clauses.indexOf(cl) >= 0);
    if(!L || !k) return;
    this.push();
    L.clauses.splice(L.clauses.indexOf(cl) + 1, 0, { cells:cl.cells.splice(k) });
    this.render(); this.touch();
  }
  addRow(ri){
    this.push();
    const L = { seg:'', clauses:[{ cells:[{ t:'', ms:null }] }] };
    const at = ri == null ? this.lines.length : ri;
    /* 演唱者和唱法抄上面那一行：不动它就得跟着前一行走（明文里没变就不补那一行，读回来还是同一份） */
    const p = this.lines[at - 1];
    if(p && p.who) L.who = p.who.slice();
    if(p && p.how) L.how = p.how;
    this.lines.splice(at, 0, L);
    this.render(); this.touch();
  }
  delRow(L){
    /* 只剩这一行时不抹掉它，清成一行空格子 —— 原来唱多久留着，别让它变成一行没有时值的空档 */
    if(this.lines.length <= 1) { const was = this.rowMs(L); this.push();
      L.clauses = [{ cells:[{ t:'', ms:was > 0 ? was : null }] }]; this.render(); this.touch(); return; }
    this.push();
    this.lines.splice(this.lines.indexOf(L), 1);
    this.render(); this.touch();
  }
  rowMenu(e, L, li){
    e.preventDefault(); e.stopPropagation();
    const nt = String(L.note || '').trim(), rn = this.romanOn(L);
    Menu.open(e.clientX, e.clientY, [
      { label: nt ? '改段前说明' : '添加段前说明', title:'写在上面那一行：主歌 / 副歌 / 换气 / 提醒，随便写', fn:() => this.noteDlg(L, li) },
      { label:'删掉段前说明', fn:() => { this.push(); delete L.note; this.render(); this.touch(); }, on:!!nt },
      { label:'演唱者 / 唱法…', title:'这一行由谁唱、怎么唱：独唱（一个人）／ 合唱（两个以上）／ 和声；不改的就跟着上一行走', fn:() => this.whoDlg(L, li) },
      { label:(rn ? '去掉这一行的注音  Alt+Shift+N' : '给这一行加注音  Alt+Shift+N'),
        title: rn ? '把这一行每格上面的那一层收掉（里面已经填的注音一并删掉，这一步能撤回）' : '每一格上面多出一格，用来手写注音（文件里带进来的注音本来就在这一层里）',
        fn:() => this.romanToggle(L) },
      { sep:true },
      { label:'在这一行上面加一行', fn:() => this.addRow(li) },
      { label:'在这一行下面加一行', fn:() => this.addRow(li + 1) },
      { label:'删掉这一行  Alt+Shift+X', fn:() => this.delRow(L) }
    ]);
  }
  /* 演唱者 + 唱法那一枚小牌：默认独唱，所以独唱只写人名；没人名又没唱法也要占住那一格空槽 ——
     槽位宽是固定的，空着不画框也不点得动，为的是每一行的歌词都从同一个地方起头（他第 5 条） */
  /* 名单在这一屏按文字 / 字母顺序上下排；文件里那一行「人 =」谁先谁后原样不动（外26 第 8 条） */
  whoSorted(L){
    const who = ((L && L.who) || []).map(x => String(x || '')).filter(x => x.trim());
    if(who.length < 2) return who;
    return who.slice().sort((a, b) => {
      try{ const n = a.localeCompare(b, 'zh-Hans-CN'); if(!isNaN(n) && n !== 0) return n; }catch(e){}
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }
  /* 拖动调宽那一条（外26 第 1 条）：改的是这台机器上演唱者那一格多宽，一个词格的文件一个字不动 */
  whoGrip(){
    const g = h('span', { class:'wnw-lwho-g', title:'按住这一条左右拖：把演唱者那一格调窄或调宽（这台机器记住，不写进那个文件）' });
    g.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const w0 = LYRIC_UI.whoW, x0 = e.clientX;
      const fs = parseFloat(getComputedStyle(this.box || document.body).fontSize) || 13;
      const mv = ev => { const w = Math.max(4, Math.min(18, w0 + (ev.clientX - x0) / fs));
        LYRIC_UI.whoW = w; if(this.box) this.box.style.setProperty('--lwho-w', w + 'em'); };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        LYRIC_UI.setWhoW(LYRIC_UI.whoW); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    return g;
  }
  whoChip(L, li){
    const who = this.whoSorted(L), how = (L && L.how) || '';
    const 牌 = [];
    for(const nm of who) 牌.push(h('span', { class:'wnw-lchip' + (how && how !== 'solo' ? ' ' + how : ''),
      title:'这一行的演唱者：' + nm + '（点一下改，右键这一行也有）',
      onclick:ev => { ev.stopPropagation(); this.whoDlg(L, li); } }, nm));
    /* 唱法不是独唱才占一枚牌，和名字摞在一起 */
    if(how && how !== 'solo') 牌.push(h('span', { class:'wnw-lchip ' + how,
      title:'这一行的唱法：' + LYRIC_HOW[how] + '（点一下改）',
      onclick:ev => { ev.stopPropagation(); this.whoDlg(L, li); } }, LYRIC_HOW[how]));
    const grip = this.whoGrip();
    if(!牌.length) return h('span', { class:'wnw-lwho empty', title:'这一行还没设演唱者与唱法（右键这一行设）' }, grip);
    return h('span', { class:'wnw-lwho' }, [ h('span', { class:'wnw-lwho-n',
      title:'这一行的演唱者与唱法：' + who.join('、') + (how && how !== 'solo' ? ' · ' + LYRIC_HOW[how] : '') + '（点一下改，右键这一行也有）' }, 牌), grip ]);
  }
  /* 注音那一层的开关：开 = 每格上面多一格等着填；关 = 收掉这一层，已经填的注音跟着删（这一步在撤回栈里） */
  romanToggle(L){
    this.push();
    if(this.romanOn(L)){ delete L.roman;
      for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])) delete c.n; }
    else L.roman = true;
    this.render(); this.touch();
  }
  /* 那一行小字跟着填法改口：他要点的是「这一档打进去的是什么」，不是又一条说明 */
  hintText(){
    if(this.tap) return 'f = 开始，空格 = 连续打一个点，j 或回车 = 结束并生成格子，Esc = 取消（先把输入法切到英文那一档，中文会把这三枚键吃在选字那一层里）';
    if(LYRIC_UI.fill === 'count') return '这一档打进去的是这一格唱几个音节，不是字；标完把填法切回「按格填」再填词';
    if(LYRIC_UI.fill === 'fill') return '在每一行下面那根横线上整句写，右边那一个把这一行的字按音节数拆回格子';
    if(LYRIC_UI.num === 'beat') return '上面那三枚框填「几几拍 / BPM / 第一个字起于第几拍」，每一格上面那串数就按小节和拍子走（换成「时长」那一档看的还是毫秒）';
    return 'Tab 键、右方向键可以快捷切换到下一个格子 ｜ Alt+D 拆 · Alt+M 并 · Delete 删这一格 · Alt+Shift+X 删这一行 · Alt+1 / 2 / 3 换填法';
  }
  /* 整句填写那一根横线：一格一音的行直接写整句就行，标过音节数的格子按自己那几个音节去取字 */
  fillRow(L, li){
    const need = this.needOf(L);
    const inp = h('input', { class:'wnw-ltxt', value:L.fill || '', spellcheck:'false',
      placeholder:'整句写在这儿，右边那一个拆回格子',
      oninput:e => { L.fill = e.target.value; },
      onkeydown:e => { if(e.key === 'Enter'){ e.preventDefault(); this.alignFill(L, li); } } });
    const w = h('div', { class:'wnw-lfill' }, [inp, h('i', { title:'这一行有几个音节（没标的格按一个算）' },
      need + ' 音'), h('button', { class:'wnw-btn mini', title:'把横线上这一串字按每一格的音节数拆成格子（一格一个汉字；要顶掉几格就写几个占位符，拆完那一格留空以后再填）',
      onclick:() => this.alignFill(L, li) }, '一键对齐到音节')]);
    /* 横线左边那截空档和行号、段名对齐；点了横线也让拍点知道是哪一行 */
    if(this.tap) w.addEventListener('click', () => this.tapTo(li));
    return w;
  }
  needOf(L){ let n = 0; for(const cl of (L && L.clauses) || []) for(const c of (cl.cells || []))
    n += (LyricFmt.okMs(c.k) && c.k > 0) ? Math.round(c.k) : 1; return n; }
  /* 一键对齐到音节：横线上那串字按「一格几个音节」切给每一格。
     一个汉字占一个音节；占位符顶掉几格就留几格空着（他说的「拆分后再具体填写」）；
     横线上暂时只收这两种 —— 西文那一串是几个音节程序数不清，碰到了先拦下来让他用占位符顶掉。 */
  alignFill(L, li){
    const src = String(L.fill || '');
    if(!src.trim()){ toast('这一行的横线是空的 —— 整句写在这儿再对齐'); return; }
    /* 横线上暂时只收中文和他自定义的那个占位符号：西文一串里几个音节程序数不清，先拿占位符顶掉那几格，拆完之后那一格再具体填 */
    const ph = LYRIC_UI.ph;
    let 西 = '';
    for(let i = 0; i < src.length && !西; i++){ const ch = src.charAt(i);
      if(ch === ph || /\s/.test(ch) || !LYRIC_LAT.test(ch)) continue;
      let s = '';
      for(let j = i; j < src.length && src.charAt(j) !== ph && LYRIC_LAT.test(src.charAt(j)); j++) s += src.charAt(j);
      西 = s; }
    if(西){ toast('横线上暂时只支持中文和自定义占位符号 —— 先用占位符把「' + 西 + '」这类西文顶掉那几格，拆完之后那一格再具体填'); return; }
    const cs = [];
    for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])) cs.push(c);
    if(!cs.length){ toast('这一行还没有格子'); return; }
    let p = 0; const got = [];
    const skip = () => { while(p < src.length && /\s/.test(src.charAt(p))) p++; };
    for(const c of cs){
      skip();
      if(p >= src.length){ got.push(''); continue; }
      const need = (LyricFmt.okMs(c.k) && c.k > 0) ? Math.round(c.k) : 1;
      const ch = src.charAt(p);
      if(ch === ph){ let n = 0; while(n < need && src.charAt(p) === ph){ n++; p++; } got.push(''); continue; }
      let s = '';
      for(let n = 0; n < need && p < src.length; n++){
        const q = src.charAt(p);
        if(q === ph || /\s/.test(q)) break;
        s += q; p++;
      }
      got.push(s);
    }
    skip();
    const left = src.slice(p);
    this.push();
    cs.forEach((c, i) => { c.t = got[i] == null ? '' : got[i]; });
    L.fill = left;
    this.render(); this.touch();
    if(left) toast('这一行的字拆完了，横线上还多 ' + Array.from(left).length + ' 个音节没地方放 —— 还留在横线上（格子不够就先加几格）');
  }
  /* 换填法：整句填写要先有格子，标音节没有前置条件，切回去什么都不动（三档只是同一棵树三个输入口） */
  setFill(v){
    if(!LYRIC_UI.FILLS.some(x => x[0] === v)) return;
    LYRIC_UI.setFill(v); this.render();
  }
  /* 快捷建词格：他要的格式是「xxxx  xxxx  xxxx」这种 —— 占位符顶一个格，分格符分开每一格，换行分开每一行。
     两种记号都随他定（默认 x 和空格），换行就是输入框里真回车，另外还能再认一个自定义的行尾符号。 */
  quickDlg(){
    const ta = h('textarea', { class:'wnw-input', rows:'6', spellcheck:'false', style:'width:100%;font:inherit;resize:vertical',
      placeholder:'xxxx xxxx xxxx↵xxxx xxxxx' });
    const ph = h('input', { class:'wnw-input', value:LYRIC_UI.ph, maxlength:'1', style:'width:3.2em;text-align:center' });
    const sp = h('input', { class:'wnw-input', value:' ', maxlength:'1', style:'width:3.2em;text-align:center' });
    const br = h('input', { class:'wnw-input', value:'', maxlength:'1', style:'width:3.2em;text-align:center',
      placeholder:'—', title:'除了输入框里真回车，再认这一个符号当换行（可不填）' });
    const ln = (t, el, tip) => h('div', { style:'display:flex;align-items:center;gap:8px;margin:6px 0' },
      [h('span', { style:'flex:0 0 5.4em;font-size:.86em' }, t), el, h('span', { class:'wnw-lhint', style:'margin:0' }, tip)]);
    const ok = () => {
      const p = ph.value.length === 1 ? ph.value : 'x';
      LYRIC_UI.setPh(p);
      const n = this.quickBuild(ta.value, p, sp.value.length === 1 ? sp.value : '', br.value.length === 1 ? br.value : '');
      Overlay.close();
      /* 铺不成时那一串里混进了哪几个字符，quickBuild 自己会说，这里不再重复一遍 */
      if(n) toast('建出 ' + n + ' 行 · 空格子已铺好，切回「按格填」就能打字');
    };
    lyricOverlay('快捷建词格', h('div', { style:'min-width:26em' }, [
      h('div', { class:'wnw-hint' }, '一个占位符 = 一格空着等填。这儿只铺格子，不往里填词：除了你定的这三个记号，别的字符都当没这回事（要直接打字就切回「按格填」）。'),
      ta, ln('占位符', ph, '例子里那个 x'), ln('分格符', sp, '默认空格'), ln('换行符另认', br, '可不填')]), [
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '算了'),
      h('button', { class:'wnw-btn primary', onclick:ok }, '铺到词格里')]);
    setTimeout(() => { try{ ta.focus(); }catch(e){} }, 30);
  }
  quickBuild(text, ph, sp, br){
    const src = String(text || '');
    const rows = [], 杂 = [];
    for(let raw of src.split(/\r?\n/)){
      if(br) raw = raw.split(br).join('\n');
      /* 一行里可能因为那个自定义换行符变成几行 */
      for(const one of raw.split('\n')){
        const t = one.trim();
        if(!t) continue;
        const toks = sp ? t.split(sp) : Array.from(t);
        const cells = [];
        for(const tk of toks){
          for(const ch of String(tk || '')){
            /* 词格就是纯粹的词格：这儿只铺格子，只有他定的那一个占位符算一格，别的字符一律不当词用 */
            if(ch === ph){ cells.push({ t:'', ms:null }); continue; }
            if(/\s/.test(ch)) continue;
            if(杂.length < 4 && 杂.indexOf(ch) < 0) 杂.push(ch);
          }
        }
        if(cells.length) rows.push({ seg:'', clauses:[{ cells }] });
      }
    }
    if(杂.length){ toast('词格里只铺格子 —— 这儿只认占位符「' + ph + '」' + (sp ? '和分格符「' + sp + '」' : '') +
      (br ? '、换行符「' + br + '」' : '') + '；这一串里混进了' + 杂.map(x => '「' + x + '」').join('') + '，要它们当词就切回「按格填」直接打字'); return 0; }
    if(!rows.length){ toast('这一串里没认出一个格子 —— 一个占位符算一格，先写占位符'); return 0; }
    this.push();
    /* 只有一行空格子的那种「新开的一个词格」就原地换掉，别留一行空位在上面 */
    if(this.lines.length === 1 && this.rowMs(this.lines[0]) === 0 &&
      this.lines[0].clauses.length === 1 && this.lines[0].clauses[0].cells.length === 1 &&
      !String(this.lines[0].clauses[0].cells[0].t || '').trim()) this.doc.lines = rows;
    else this.doc.lines = this.lines.concat(rows);
    this.render(); this.touch();
    return rows.length;
  }
  /* ---------- 拍点模式：手点同步当前歌曲，空格打点，点与点之间就是那一格的时长 ----------
     跟着音乐遥控器那一份时钟走（那一家在放就取它那一毫秒）；没连上就从按下这一个按钮起自己数（模拟）。
     出来的每一段是一格「带时长的空格子」，格子本身和正常填词那套一模一样（拆、并、拖、撤回都通用）。 */
  tapNowMs(){
    const M = this.mus(), live = !!(M && M.live());
    if(!this.tap) return 0;
    return live ? Math.round(M.now()) : Math.round(performance.now() - this.tap.t0);
  }
  tapToggle(){
    if(this.tap){ this.tapCancel(); return; }
    if(!this.lines.length){ toast('还没有一行词，先加一行再打点'); return; }
    const M = this.mus(), live = !!(M && M.live());
    if(!live) toast('没连上正在放的歌 —— 这一趟从按下那一个起自己数（照着节拍器或心里数都行），出来的时长是相对这一段');
    this.tap = { li:Math.max(0, Math.min(this.lines.length - 1, this.lastLi == null ? this.lines.length - 1 : this.lastLi)),
      pts:[], live, t0:performance.now() };
    toast('先把输入法切到英文：f 开始、空格 连续、j 结束 —— 中文输入法会把这三枚键吃在选字那一层里');
    this.render();
  }
  /* 三枚键（外26 第 12 条）：f = 开始，空格 = 连续，j = 结束（回车仍旧算结束，Esc 取消）。
     f 这一枚在打字的地方不抢 —— 英文词里就有 f，那一敲必须先落进输入口。 */
  tapKeys(e){
    if(e.repeat) return;
    const tn = e.target;
    const 打字 = !!(tn && tn.closest && tn.closest('input,textarea,[contenteditable]'));
    const k = String(e.key || '').toLowerCase();
    if(!this.tap){ if(k === 'f' && !打字){ e.preventDefault(); this.tapToggle(); } return; }
    if(e.key === ' ' || e.code === 'Space'){
      /* 焦点在那个按钮上就让按钮自己收这一敲，不然一次空格会打两个点 */
      if(tn && tn.tagName === 'BUTTON') return;
      e.preventDefault(); this.tapPoint(); return;
    }
    if(k === 'j' || e.key === 'Enter'){ e.preventDefault(); this.tapDone(); return; }
    if(e.key === 'Escape'){ e.preventDefault(); this.tapCancel(); }
  }
  /* 手动点第一下 = 同步当前歌曲那一刻（他这条「手动点击同步当前歌曲」）：后面每一段都从这个点起算 */
  tapPoint(){
    if(!this.tap) return;
    this.tap.pts.push(this.tapNowMs());
    this.tapPaint();
  }
  tapTo(li){ if(this.tap && this.tap.li !== li){ this.tap.li = li; this.tapPaint(); } }
  tapPaint(){
    if(!this.tap || !this.tapInfo) return;
    const L = this.lines[this.tap.li] || null;
    this.tapInfo.textContent = '正在给第 ' + (this.tap.li + 1) + ' 行打点 ｜ 已打 ' + this.tap.pts.length +
      ' 点（= ' + Math.max(0, this.tap.pts.length - 1) + ' 格） ｜ 现在 ' + (this.tapNowMs() / 1000).toFixed(3) + ' 秒' +
      (L && LyricFmt.okMs(L.at) ? ' ｜ 这一行开口 ' + this.ioText(L.at) : '');
  }
  tapStrip(){
    const b = (txt, title, fn, prim) => h('button', { class:'wnw-btn mini' + (prim ? ' primary' : ''), title, onclick:fn }, txt);
    this.tapInfo = h('span', {}, '');
    const el = h('div', { class:'wnw-ltap' }, [
      b('连续（空格）', '点一下或者按一下空格：记下这一刻，它就是上一格的尾巴、这一格的开头', () => this.tapPoint(), true),
      this.tapInfo, h('span', {}),
      b('结束（j）', '把点与点之间那些段生成带时长的空格子', () => this.tapDone()),
      b('取消', '这一趟不要了（不动任何格子）', () => this.tapCancel())]);
    return el;
  }
  tapDone(){
    if(!this.tap) return;
    const pts = this.tap.pts.slice(), li = this.tap.li, live = this.tap.live;
    this.tapOff();
    if(pts.length < 2){ toast('至少要两个点（第一个字的开始和最后一个字的结束）才有时长可分'); this.render(); return; }
    const L = this.lines[li];
    if(!L){ this.render(); return; }
    const all = [];
    for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])) all.push(c);
    /* 这一行分过音节（外26 第 9、10 条）：点与点之间的段就是「子」，不是「格」——
       点数正好对上子的总数，就把每一子的时长写进各格，整格的时值是它几子之和 */
    const 单元 = [];
    for(const c of all){ const n = lyricParts(c).n; for(let i = 0; i < n; i++) 单元.push(c); }
    if(pts.length - 1 === 单元.length && all.some(c => c.cut && c.cut.length)){
      this.push();
      const 表 = new Map();
      for(let i = 1; i < pts.length; i++){ const c = 单元[i - 1];
        const arr = 表.get(c) || []; arr.push(Math.max(1, Math.round(pts[i] - pts[i - 1]))); 表.set(c, arr); }
      for(const [c, arr] of 表){ c.pm = arr; c.ms = arr.reduce((a, b) => a + b, 0); }
      if(live && LyricFmt.okMs(pts[0])) L.at = Math.round(pts[0]);
      this.render(); this.touch();
      toast('这一行分了音节：' + 单元.length + ' 子各记了自己的时长');
      return;
    }
    this.push();
    const cells = [];
    for(let i = 1; i < pts.length; i++) cells.push({ t:'', ms:Math.max(1, Math.round(pts[i] - pts[i - 1])) });
    const blank = (x) => !String((x && x.t) || '').trim();
    /* 只有跟着遥控器那一份时钟点的，第一个点才是这一句在歌里开口的那一刻。
       模拟那一档的点是从按下「拍点」这一个起自己数的，拿它当绝对位置会把这一行拽到歌曲开头，
       和它本来叠着的邻行一起乱 —— 所以模拟那一档既不写「起」，也不许把原来那一行文件里带进来的「起」删掉。 */
    if(live && LyricFmt.okMs(pts[0])) L.at = Math.round(pts[0]);
    if(all.length && all.every(blank)){
      /* 这一行本来就空着（拍点就是给这一行铺格子）：原来的空格子换成带时长的那一批 */
      L.clauses = [{ cells }];
    } else {
      /* 已经有词的那一行：点出来的格子接在最后，时值是真数，字还是空的等他自己对 */
      const last = L.clauses[L.clauses.length - 1] || (L.clauses[0] = { cells:[] });
      for(const c of cells) last.cells.push(c);
      toast('这一行本来有词：' + cells.length + ' 格带时长的空格子接在了后面');
    }
    this.render(); this.touch();
  }
  tapCancel(){ if(!this.tap) return; this.tapOff(); this.render(); }
  tapOff(){ this.tap = null; this.tapInfo = null; }
  /* 一行一档：独唱（只能一个演唱者）／ 合唱（两个以上）／ 和声（背景人声，几个都行）。
     默认全是独唱，所以独唱在树里就是「没有 how 这个键」；名字全空也不留 who 键 —— 和段前说明同一办法。
     框里的选择先搁在本地，「定了」才落到这一行，按「算了」出去什么都不会改。 */
  whoDlg(L, li){
    let how = L.how || 'solo';
    const seg = h('div', { style:'display:flex;gap:6px;margin:0 0 10px' });
    const names = h('input', { class:'wnw-input', style:'width:100%', value:((L.who || []).join('、')) });
    const tip = h('div', { class:'wnw-lhint', style:'margin:6px 0 0' });
    const paint = () => {
      for(const b of seg.children) b.classList.toggle('on', b.dataset.k === how);
      names.placeholder = how === 'solo' ? '一个人名（留空就是不挂名）'
        : how === 'choir' ? '两个以上，用、或 , 或 & 隔开' : '几个人都行，可不填';
      tip.textContent = how === 'solo' ? '独唱只许一个演唱者'
        : how === 'choir' ? '合唱至少两个演唱者' : '和声是垫在主唱后面的那一层';
    };
    for(const k of LYRIC_HOWS) seg.appendChild(h('button', { class:'wnw-btn mini', 'data-k':k,
      onclick:() => { how = k; paint(); } }, LYRIC_HOW[k]));
    paint();
    const ok = () => {
      const ws = LyricFmt.whoList(names.value);
      if(how === 'solo' && ws.length > 1){ toast('独唱只能设一个演唱者 —— 要几个人一起唱，先点合唱'); return; }
      if(how === 'choir' && ws.length < 2){ toast('合唱得填两个以上演唱者 —— 只有一个人就点独唱'); return; }
      Overlay.close();
      this.push();
      if(ws.length) L.who = ws; else delete L.who;
      if(how === 'solo') delete L.how; else L.how = how;
      this.render(); this.touch();
    };
    names.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); ok(); } });
    lyricOverlay('第 ' + (li + 1) + ' 行 · 演唱者与唱法', h('div', {}, [seg, names, tip]), [
      h('button', { class:'wnw-btn', title:'抄上一行的演唱者和唱法（上一行没有就是不挂名、独唱）',
        onclick:() => { const p = this.lines[li - 1]; if(!p) return;
          names.value = ((p.who || []).join('、')); how = p.how || 'solo'; paint(); } }, '跟随上一行'),
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '算了'),
      h('button', { class:'wnw-btn primary', onclick:ok }, '定了')]);
    setTimeout(() => { try{ names.focus(); names.select(); }catch(e){} }, 30);
  }
  /* 段前说明：一行一句，写在格子那一排的上面。存进那个明文文件就是这一行上面多出的「注 = …」一行。 */
  /* 段前说明可以写好几行（他第 7 条）：框子换成能回车的 textarea，回车在框里换行、不再当"定了"，
     一行一个「注 =」写进那个文件，读回来还是同一条 */
  noteDlg(L, li){
    const inp = h('textarea', { class:'wnw-input', rows:'4', spellcheck:'false', value:L.note || '',
      style:'width:100%;font:inherit;resize:vertical',
      placeholder:'主歌 / 副歌 / 换气 / 提醒，随便写；要写几行就回车换行' });
    const ok = () => { const v = inp.value.replace(/\s+$/, ''); Overlay.close();
      if(v === String(L.note || '').replace(/\s+$/, '')) return;
      this.push(); if(v.trim()) L.note = v.trim(); else delete L.note; this.render(); this.touch(); };
    lyricOverlay('第 ' + (li + 1) + ' 行的段前说明', h('div', { style:'min-width:24em' }, [
      inp, h('div', { class:'wnw-hint', style:'margin-top:6px' }, '这一段在唱什么、提醒什么，写这儿；摆在歌词那一行的上面，只跟着这一行。')]), [
      h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '算了'),
      h('button', { class:'wnw-btn primary', onclick:ok }, '定了')
    ]);
    setTimeout(() => { try{ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }catch(e){} }, 30);
  }
  cellMenu(e, L, cl, k){
    e.preventDefault(); e.stopPropagation();
    const c = cl.cells[k];
    Menu.open(e.clientX, e.clientY, [
      { label:'把这一格拆成两格  Alt+D', fn:() => this.splitCell(cl, k) },
      { label:'并到上一格  Alt+M', fn:() => this.mergeCell(cl, k), on:k > 0 },
      { sep:true },
      { label:'从这里分逗', fn:() => this.splitClause(cl, k), on:k > 0 },
      /* 细分那一档（外26 第 9、10 条）：界面上分的手势是双击那串字，菜单只给一条合回去的收口，
         而且只在真分过的格上摆 —— 没分的格给这一条就是点了白点一下 */
      ...(c && Array.isArray(c.cut) && c.cut.length
        ? [{ label:'这一格合回一整块', title:'撤掉这一格里的音节分刀（那些虚线），时长还给整格',
            fn:() => { this.push(); delete c.cut; delete c.pm; this.render(); this.touch(); } }] : []),
      { sep:true },
      /* 注音那一层单独能删：只在这一格带注音时才给这一条（不然点了是空一下） */
      ...(c && c.n != null ? [{ label:'删掉这一格的注音  Delete', fn:() => this.dropNote(L, cl, k) }] : []),
      { label:'删掉这一格  Delete', fn:() => this.dropCell(this.flat.findIndex(x => x.L === L && x.cl === cl && x.k === k)) },
      { label:'在这一行下面加一行', fn:() => this.addRow(this.lines.indexOf(L) + 1) }
    ]);
  }
  /* ---------- 撤 / 重做：词格这一档没有 CeEd 那套栈，自己留一份树的快照 ---------- */
  push(){
    const s = JSON.stringify(this.doc || null);
    if(s && s !== 'null'){ this.undo.push(s); if(this.undo.length > 100) this.undo.shift(); }
    this.redo = [];
  }
  undoStep(){
    const s = this.undo.pop(); if(!s) return;
    this.redo.push(JSON.stringify(this.doc || null));
    this.doc = JSON.parse(s); this.c.lyric = this.doc;
    this.render(); this.touch();
  }
  redoStep(){
    const s = this.redo.pop(); if(!s) return;
    this.undo.push(JSON.stringify(this.doc || null));
    this.doc = JSON.parse(s); this.c.lyric = this.doc;
    this.render(); this.touch();
  }
  touch(){
    this.c.lyric = this.doc;
    this.view.dirty();
  }
  /* ---------- 导入逐字 ttml（选文件或拖进这一屏）---------- */
  async importTtml(text, name, path){
    const d = lyricFromTtml(text);
    if(!d){ toast('这份 ttml 里没有带时间的逐字段'); return; }
    this.push();
    this.doc = d; this.c.lyric = d;
    /* 记住这份 ttml 从哪个文件来的（只是路径，不写那边一个字）：同名音频要靠它找 */
    if(path) this.c.lyricSrc = String(path);
    let cell = 0; for(const L of d.lines) for(const cl of L.clauses) cell += cl.cells.length;
    this.render(); this.touch();
    toast('导入了 ' + d.lines.length + ' 行 ' + cell + ' 格' + (name ? '（' + name + '）' : ''));
  }
  bindDrop(){
    const el = this.view.bodyBox || this.host;
    if(!el || el._lyricDrop) return;
    el._lyricDrop = true;
    el.addEventListener('dragover', e => { if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) e.preventDefault(); });
    el.addEventListener('drop', async e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if(!f) return;
      e.preventDefault();
      if(!/\.(ttml|xml|json|txt)$/i.test(f.name)){ toast('拖进来这份不是词格认的那几样（ttml / json / txt）'); return; }
      try{ await this.importFile(f); }
      catch(err){ toast('这份读不出来：' + ((err && err.message) || err)); }
    });
  }
  /* ---------- 导出 ---------- */
  baseName(){ return String(this.c.lyricFile || Lyric.fileName(this.c.title || '')).replace(/\.txt$/i, ''); }
  /* 灵感 / 卡片投进词格：一句换一行格子，空格分逗、字逐格（段名跟着上一行） */
  pourIn(text){
    const clauses = String(text || '').trim().split(/\s+/)
      .map(x => ({ cells:LyricFmt.wordCells(x).map(ch => ({ t:ch, ms:null })) })).filter(g => g.cells.length);
    if(!clauses.length) return false;
    this.push();
    this.lines.push({ seg:(this.lines[this.lines.length - 1] || {}).seg || '', clauses });
    this.render(); this.touch();
    return true;
  }
  /* 页脚那一行：词格档不给「本章几字」那套（那是 c.paras 的账），给行 / 格 / 时长 */
  foot(msg){
    const f = this.view.foot; if(!f) return;
    f.innerHTML = '';
    let n = 0, m = 0, ms = 0;
    for(const L of this.lines) for(const cl of L.clauses || []) for(const c of cl.cells || []){
      n++; if(LyricFmt.okMs(c.ms)){ m++; ms += c.ms; }
    }
    f.appendChild(h('span', {}, this.doc ? ('词格 ' + this.lines.length + ' 行 · ' + n + ' 格 · 带时长 ' + m + ' 格 · 合计 ' + (ms / 1000).toFixed(2) + ' 秒')
      : '词格在读那个文件…'));
    f.appendChild(h('span', { style:'flex:1' }));
    /* 存不进那个文件的时候不许页脚还报「已自动保存」那一句：那一格换成警告，落款时间不并列（并列读起来像「没连上磁盘但保存好了」） */
    if(this.warn){
      f.appendChild(h('span', { style:'color:var(--warn)' }, this.warn));
      if(msg) f.appendChild(h('span', {}, ' · ' + msg));
    } else {
      f.appendChild(h('span', {}, msg || '已自动保存 ' +
        new Date(this.c.at || Date.now()).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })));
    }
  }
}

/* 词格 → 段落形状：给整本 / 整卷那种常规导出用（那一套只认块 + 文字）。一行一段，段名做成它前面那一行的小标题。 */
function lyricParas(doc){
  const out = []; let seg = '';
  for(const L of (doc && doc.lines) || []){
    const s = (L && L.seg) || '';
    if(s !== seg){ if(s) out.push(newPara('h2', s)); seg = s; }
    const t = LyricFmt.lineText(L);
    if(t) out.push(newPara('p', t));
  }
  return out;
}

/* ---------- 词格 → 逐字 TTML（一格一个 <span>，begin / end 由每格时长累加出来）----------
   行 = 一个 <p>（带 begin / end）；段名不进 ttml（那份结构里没有段这一级）；空的格子不占位但时长照样算进去。
   时长没配的那些格按 0 长出去：共用那把尺（shTtmlFlow 第 36 行）见到 0 长的格会垫成 120 毫秒，
   那是它给逐字歌词定的规矩，导出这边不跟它拧 —— 所以这类格读回来是 120 而不是 0；出 ttml 之前先报有几个这样的格。 */
function lyricWord(t){ return String(t || '').trim(); }
/* 两格之间要不要垫一个空格：认的是接缝那两个字 —— 前格字尾和后格字头都是西文字母就得垫，
   否则共用那把尺会把它们并回一格（它按「接缝两侧都是字母且前格字尾没空格」并音节）。
   整格是不是英文不管：me， 这种带全角逗号的字头也是字母，照样得垫。 */
function lyricTailLat(t){ return !!t && LYRIC_LAT.test(Array.from(String(t)).pop()); }
function lyricHeadLat(t){ return !!t && LYRIC_LAT.test(String(t).charAt(0)); }
function lyricToTtml(doc){
  const out = [], notes = [];
  /* 声部名单：同一串演唱者共用一个 xml:id（文件头声明一次，行上只指过去） */
  const ag = {}, agOrder = [], agGrp = {};
  let cur = 0, kn = 0;
  for(const L of (doc && doc.lines) || []){
    /* 带着「起」的那一句照它本来的开口出（逐字 ttml 导进来时那个数是留着的），其余照上一句的尾巴接 */
    if(LyricFmt.okMs(L.at)) cur = L.at;
    const begin = cur, segs = [], nsp = [];
    const bg = L.how === 'bg';
    let prev = '';
    for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])){
      /* 一格分了几子就出几个 span（外26 第 9、10 条）：每一子和一整格同等对待，各自的 begin / end；
         没分的格还是那一个 span，一个字都不多写 */
      const P = lyricParts(c), 头 = cur;
      let 有字 = false;
      for(let si = 0; si < P.n; si++){
        const ms = P.durs[si] || 0;
        const w = lyricWord(P.texts[si]);
        if(w){
          有字 = true;
          if(lyricTailLat(prev) && lyricHeadLat(w)) segs.push(' ');
          segs.push('<span' + (bg ? ' ttm:role="x-bg"' : '') + ' begin="' + shTtmlClock(cur) +
            '" end="' + shTtmlClock(cur + ms) + '">' + esc(w) + '</span>');
          prev = w;
        }
        cur += ms;
      }
      /* 注音得压在字上才有意义：一格分了几子，注音盖整格那一段；这一格没字，它就没有落脚的地方（明文那份照旧留着） */
      const n = String(c.n == null ? '' : c.n).trim();
      if(n && 有字) nsp.push('<span begin="' + shTtmlClock(头) + '" end="' + shTtmlClock(cur) + '">' + esc(n) + '</span>');
    }
    if(L.trans) segs.push('<span ttm:role="x-translation">' + esc(String(L.trans)) + '</span>');
    let key = '';
    if(nsp.length){ key = 'k' + (++kn);
      notes.push('      <text ttm:for="' + key + '">' + nsp.join('') + '</text>'); }
    let id = '';
    const who = ((L.who || []).join('、')).trim();
    if(who){ if(!ag[who]){ ag[who] = 'v' + (agOrder.length + 1); agOrder.push(who); agGrp[who] = false; }
      /* 合唱得在文件里留得下来：一串名字那种靠「两个以上」本身就回得来，只挂一个名字的合唱（他那份里 "all" 就是）靠 type */
      if(L.how === 'choir' || LyricFmt.whoList(who).length > 1) agGrp[who] = true;
      id = ag[who]; }
    out.push('    <p begin="' + shTtmlClock(begin) + '" end="' + shTtmlClock(cur) + '"' +
      (key ? ' itunes:key="' + key + '"' : '') + (id ? ' ttm:agent="' + id + '"' : '') + '>' +
      (segs.length ? segs.join('') : esc(LyricFmt.lineText(L))) + '</p>');
  }
  const head = [];
  for(const nm of agOrder) head.push('    <ttm:agent type="' + (agGrp[nm] ? 'group' : 'person') + '" xml:id="' + ag[nm] + '"><ttm:name>' + esc(nm) + '</ttm:name></ttm:agent>');
  let hx = '';
  if(head.length || notes.length) hx = '  <head>\n' + (head.length ? head.join('\n') + '\n' : '') +
    (notes.length ? '    <translations>\n' + notes.join('\n') + '\n    </translations>\n' : '') + '  </head>\n';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<tt xml:lang="zxx" xmlns="http://www.w3.org/ns/ttml"' +
    ' xmlns:ttm="http://www.w3.org/ns/ttml#metadata"' +
    ' xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" itunes:timing="Word">\n' + hx +
    '  <body>\n    <div>\n' + out.join('\n') + '\n    </div>\n  </body>\n</tt>\n';
}
/* 词格 → 逐句 LRC：一行一句，时间点就是这一行的开口 */
function lyricToLrc(doc, title){
  const rows = [];
  let cur = 0;
  for(const L of (doc && doc.lines) || []){
    /* 带着「起」的那一句照它本来的开口出，不拿上一句的尾巴硬接 —— 间奏那道空档就是这么丢的 */
    if(LyricFmt.okMs(L.at)) cur = L.at;
    /* 秒尾那两位直接吃毫秒数往下取整（和共用那把尺 shLrcClock(ms,2) 同一档）——
       从前是 Math.round(sec*100%100)：995~999 毫秒会被凑成 100，写出 [00:00.100] 这种三位小数又不往秒进位的行。
       负数或读不出的按 0 算（和那把尺同一个口径）；分钟这一头保留两位补零（LRC 常见写法），其余一个字节都不动。 */
    const t = Math.max(0, Math.round(+cur || 0));
    rows.push('[' + shClockPad(Math.floor(t / 60000)) + ':' + shClockPad(Math.floor(t % 60000 / 1000)) + '.' +
      shClockPad(Math.floor(t % 1000 / 10)) + ']' + LyricFmt.lineText(L));
    let ms = 0;
    for(const cl of (L.clauses || [])) for(const c of (cl.cells || [])) if(LyricFmt.okMs(c.ms)) ms += c.ms;
    cur += ms;
  }
  return (title ? ('[ti:' + title + ']\n') : '') + rows.join('\n') + (rows.length ? '\n' : '');
}
/* 纯文字那份：只有词和段前说明，一个时间标记都不带（他要的 txt 就是这一种）。
   段名带【】摆着，说明另起一行 —— 读的人一眼分得出哪句是词。 */
function lyricTxt(doc){
  const out = []; let seg = '';
  for(const L of (doc && doc.lines) || []){
    const s = String((L && L.seg) || '');
    if(s !== seg){ if(s) out.push('【' + s + '】'); seg = s; }
    const nt = String((L && L.note) || '').trim();
    if(nt) out.push(nt);
    out.push(LyricFmt.lineText(L));
  }
  return out.join('\n') + (out.length ? '\n' : '');
}
/* 全标记那份：两行明文装不下的东西（注音、翻译、音节标注、节拍参数、每句在歌里的开口）原样交给 JSON，
   另一个人导入去看到的是同一棵树。文件里带一枚「我是谁」，免得和为写那种整本备份（app:'wnw'）混成一类。 */
function lyricFull(doc, title){
  return JSON.stringify({ app:'wnw-lyric', v:1, title:title || (doc && doc.title) || '', at:Date.now(), doc }, null, 1) + '\n';
}
function lyricFromFull(text){
  let j = null;
  try{ j = JSON.parse(String(text || '')); }catch(e){ return null; }
  if(!j || j.app !== 'wnw-lyric' || !j.doc || !Array.isArray(j.doc.lines)) return null;
  return j.doc;
}
