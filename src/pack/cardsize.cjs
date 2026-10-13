/* ============================================================
   卡片默认大小清单（#251）· 扫描、清单、写进装机那一份，全在这一份
   ----------
   要做的事：Flow Desk 桌面上每张卡片第一次摆出来的大小（宽 × 高，单位是格）由用户说了算。
   办法和界面文字清单同一套路，是一份明文清单（YAML · 按页分组），一张卡片两行：
     Flow Desk · 桌面:
       日程:
         出厂: 6 × 8
         你要:
   卡片名都住在「Flow Desk · 桌面」这一段底下 —— 桌面卡片只有 Flow Desk 有（为写、声笔输入法练习
   是开在这个窗口里的页面，没有桌面卡，这一份只管 Flow Desk）。
   清单存在 数据\card-size.yaml。
   ----------
   卡片大小原来住在这些地方，这一份挨个去认：
     · 功能包 data\plugins\<id>\main.js 里 export default 那一份定义：
       桌面卡片（widget）看最外面那一层的 def:{ w:N, h:M }，功能（tool）看 card:{ … def:{…} … }
       带默认大小的那一格里，写的是 def（插件自己那份）或 card.def（音乐控件那一类写法）
       是卡片还是功能由同目录 manifest.json 里那句 "type" 说了算，加载器 import 完照它登记
     · 没写 card 的功能用的是中立工具那处兜底（现在 16 × 12，跟着源码当下的数字报），
       清单里给它们各摆一张；写进程序时把 card:{ def:{…} } 插进那份定义的最外面一层
     · 配方 data\plugins\<id>\main.js + recipe.json：写进程序时两份都补 "card"，
       解释器（_wcustom/src/sh-gen.js 的 Gen.def）把 R.card 递给注册
     · 最后一张「其他卡片」认的是 fd8-tools.js 里那句兜底数字 —— 那一张改的是装机里那一份页面文件
   ----------
   命令行（在 src\pack 里跑，也可以从别处跑，路径按相对位置找）：
     node cardsize.cjs          重新扫一遍，刷新 数据\card-size.yaml（只动清单，源码一个字不碰）
     node cardsize.cjs stats    只报数
     node cardsize.cjs dump     把清单打到标准输出
   ============================================================ */
const fs = require('fs');
const path = require('path');
/* 位置从源码搬到那一张页面文件那一只手，和界面文字那一趟共用同一把（别处不写第二套）：
   量出来的道理写在 uitext.cjs 第 8 段那一条注释上头。 */
const { pageSpan, readPage } = require('./uitext.cjs');

const TREE_ROOT = (() => { const e = process.env.FD_TREE; return path.resolve(e || path.resolve(__dirname, '../..')); })();
const FB_PROG = 'Flow-Desk', FB_NAME = '其他卡片';
/* 外40 搬家：段名跟着程序名换成 Flow-Desk，读的那一头两样都认 —— 这一份清单每次重新生成页面
   都要先读回来保住他写在「你要」后面的大小，旧段名不认的话那一趟就把他自己的数丢了。写出去只写新的。 */
const FB_PROG_OLD = 'Flow Desk';
/* YAML 那几处的字：段名（哪一页）、卡片名底下两栏的名。名字改了旧清单就读不懂，别随手动。 */
const GROUP = FB_PROG + ' · 桌面', K_OLD = '出厂', K_NEW = '你要';
/* 大小那一栏：宽 × 高；他手写时 x / X / * 也认，出厂那一行永远写规范的 × */
const SIZE_RE = /^\s*(\d{1,3})\s*(?:×|[xX*])\s*(\d{1,3})\s*$/;
function sizeText(w, h){ return w + ' × ' + h; }
function parseSize(s){
  const m = SIZE_RE.exec(String(s || ''));
  if(!m) return null;
  const w = +m[1], h = +m[2];
  if(!(w >= 1 && w <= 64 && h >= 1 && h <= 36)) return null;
  return { w, h };
}

/* ---------- 写（2026-10-11 他改的口：不写回源码，改装机里那一份已经生成的页面文件）----------
   两处落点分开看：
   · 那一句兜底数字（「其他卡片」）住在 src\_fd\src\fd8-tools.js —— 它跟着那份源码原样拼进页面，
     所以今天改的是 pages\ 底下那一张 Flow_Desk_<号>.html 里的那一段，src\ 一个字节都不碰
     （位置怎么搬过去、为什么搬得动，全写在 uitext.cjs 第 8 段那一条注释里，pageSpan 也从那儿取，不写第二套）。
   · 那一家卡片自己的 def:{ w, h } 住在 data\plugins\<id>\main.js（配方的那一份还有 recipe.json）：
     那本来就不是源码，是装机里运行时读的那一份，照旧写它自己 —— 和从前一样，只是不再重新生成页面。
   ----------
   扫：每一张卡片当下的大小住在哪一行（认位置这一档，落点见上面）
   返回 site：{ name, w, h, kind, rel, ...定位信息 }
   kind：'def'        —— 那份定义里已写着 def:{ w:N, h:M }，写进程序时改那两个数字
         'insTool'    —— 那一家还没写 card，写进程序时在 export default 那句里面插一段 card:{ def:{…} }
         'insCard'    —— 写了 card 却没写 def，往 card 那对花括号里插 def:{…}
         'recipe'     —— 配方生成的功能，写进程序时给 main.js 和 recipe.json 各补一段 card
         'fallback'   —— fd8-tools.js 那句兜底数字（这一张写的是装机里那一张页面文件，见上面）
   ----------
   组件是乙案之后那种 ES module：main.js 只 export default 一份定义，登记成卡片还是功能，
   由同目录 manifest.json 里那句 "type" 说了算（widget / tool / recipe），加载器 import 完才去注册。
   所以这里先读插件清单认类型，再回 main.js 认那一段大小住在哪一行；字符串和注释里的花括号不数。 */
const RE_DEF = /(?<![\w$.])["']?def["']?\s*:\s*\{\s*["']?w["']?\s*:\s*(\d+)\s*,\s*["']?h["']?\s*:\s*(\d+)\s*\}/g;
const RE_CARD = /(?<![\w$.])["']?card["']?\s*:\s*\{/g;
const RE_NAME = /(?<![\w$.])["']?name["']?\s*:\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/g;
/* 闭引号往后跳：反斜杠那一位连着跳过，模板字面量里的 ${…} 整块跳掉（里头可以带花括号） */
function strEnd(text, i){
  const q = text[i];
  let j = i + 1;
  while(j < text.length){
    const c = text[j];
    if(c === '\\'){ j += 2; continue; }
    if(c === q) return j + 1;
    if(q === '`' && c === '$' && text[j + 1] === '{'){
      let d = 0, k = j + 1;
      while(k < text.length){
        if(text[k] === '{') d++;
        else if(text[k] === '}'){ d--; if(!d){ k++; break; } }
        k++;
      }
      j = k; continue;
    }
    j++;
  }
  return j;
}
/* text[open] 是那一个左花括号：回它配对的右花括号后一位，配不上回 -1 */
function objSpan(text, open){
  let d = 0, i = open;
  while(i < text.length){
    const c = text[i], nx = text[i + 1];
    if(c === '/' && nx === '/'){ const e = text.indexOf('\n', i); i = e < 0 ? text.length : e; continue; }
    if(c === '/' && nx === '*'){ const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
    if(c === '"' || c === "'" || c === '`'){ i = strEnd(text, i); continue; }
    if(c === '{') d++;
    else if(c === '}'){ d--; if(!d) return i + 1; }
    i++;
  }
  return -1;
}
/* 这一段里每一个字符处在第几层花括号里：open 那一位算第 0 层，它身体里的键是第 1 层，键的值再往里一层 */
function depths(text, open, close){
  const dep = new Array(close - open).fill(0);
  let d = 0, i = open;
  while(i < close){
    const c = text[i], nx = text[i + 1];
    let j = i + 1;
    if(c === '/' && nx === '/'){ const e = text.indexOf('\n', i); j = e < 0 ? close : Math.min(e, close); }
    else if(c === '/' && nx === '*'){ const e = text.indexOf('*/', i + 2); j = e < 0 ? close : Math.min(e + 2, close); }
    else if(c === '"' || c === "'" || c === '`') j = Math.min(strEnd(text, i), close);
    for(let k = i; k < j; k++) dep[k - open] = d;
    if(j === i + 1){ if(c === '{') d++; else if(c === '}') d--; }
    i = j;
  }
  return dep;
}
/* 在这几层里找第一个落在 want 那一层的键 */
function keyAt(text, open, close, dep, re, want){
  re.lastIndex = open;
  let m;
  while((m = re.exec(text)) && m.index < close){
    if(dep[m.index - open] === want) return m;
  }
  return null;
}
/* 一份定义的对象范围：JS 那份认 export default { ，JSON 那份认最外面那对花括号（向导写的配方就是 JSON） */
function rootObj(text, shape){
  const m = shape === 'json' ? /^[\s\uFEFF]*\{/ : /\bexport\s+default\s*\{/;
  const hit = m.exec(text);
  if(!hit) return null;
  const open = hit.index + hit[0].lastIndexOf('{');
  const close = objSpan(text, open);
  if(close < 0) return null;
  return { open, close, dep:depths(text, open, close) };
}
function nameOf(o, text, m, id){
  const nm = o ? keyAt(text, o.open, o.close, o.dep, RE_NAME, 1) : null;
  return nm ? nm[2] : String(m.name || id);
}
/* 认 card 里面那一句 def：回 { def, cardOpen, cardClose }；card 都没有时回 { cardOpen:-1 } */
function cardDef(text, o){
  const cm = keyAt(text, o.open, o.close, o.dep, RE_CARD, 1);
  if(!cm) return { cardOpen:-1 };
  const cin = cm.index + cm[0].length - 1;
  const cout = objSpan(text, cin);
  if(cout < 0) return { cardOpen:-1 };
  return { cardOpen:cin, cardClose:cout, def:keyAt(text, cin, cout, depths(text, cin, cout), RE_DEF, 1) };
}
function defSite(name, dm, rel){
  return { name, w:+dm[1], h:+dm[2], kind:'def', rel, start:dm.index, len:dm[0].length };
}
/* 一家包：插件清单认类型，main.js 认那一段大小 */
function packSites(TREE, dir, fb){
  const base = path.join(TREE, 'data', 'plugins', dir);
  let m = null;
  try{ m = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8')); }catch(e){ return []; }
  const relMain = 'data/plugins/' + dir + '/main.js';
  let text = '';
  try{ text = fs.readFileSync(path.join(base, 'main.js'), 'utf8'); }catch(e){ return []; }
  const o = rootObj(text, 'js');
  if(!o) return [];
  const name = nameOf(o, text, m, dir);
  if(m.type === 'recipe') return recipeSites(TREE, dir, name, o, text, fb);
  if(m.type === 'tool'){
    /* 功能卡的大小住在 card:{ … def:{ w, h } … }；那一句没写的吃 fd8-tools 的兜底数字 */
    const cd = cardDef(text, o);
    if(cd.cardOpen < 0) return [{ name, w:fb.w, h:fb.h, kind:'insTool', rel:relMain, at:o.open + 1 }];
    if(!cd.def) return [{ name, w:fb.w, h:fb.h, kind:'insCard', rel:relMain, at:cd.cardOpen + 1 }];
    return [defSite(name, cd.def, relMain)];
  }
  /* widget：桌面卡片，大小就在最外面那一层的 def:{ w, h }；没写的那家运行时拿自己的底子，不进清单 */
  const dm = keyAt(text, o.open, o.close, o.dep, RE_DEF, 1);
  return dm ? [defSite(name, dm, relMain)] : [];
}
/* 配方包：运行时 import 的是 main.js 里那一份 export default，同目录 recipe.json 是它的明文兄弟
   （向导保存时两份一起写，内容一样）。大小写在配方的 card.def 里，Gen.def 把它递给 registerTool。
   报的是 main.js 当下那个；写进程序时两份都要改，不然下次向导一存就把改过的数字丢了。 */
function recipeSites(TREE, dir, name, o, text, fb){
  const cd = cardDef(text, o);
  const dm = cd.def || keyAt(text, o.open, o.close, o.dep, RE_DEF, 1);
  return [{ name, w:dm ? +dm[1] : fb.w, h:dm ? +dm[2] : fb.h, kind:'recipe',
    rel:'data/plugins/' + dir + '/main.js', relJson:'data/plugins/' + dir + '/recipe.json', id:dir }];
}
/* 「其他卡片」那一张吃的兜底数字：住在 fd8-tools.js 注册时现算的那一对里。
   认它、改它都用这一把尺（从前这两处各抄一份正则，改一处漏一处）。 */
const FB_REL = 'src/_fd/src/fd8-tools.js';
const FB_RE = /def:\{\s*w:\(c\.def && c\.def\.w\) \|\|\s*(\d+)\s*,\s*h:\(c\.def && c\.def\.h\) \|\|\s*(\d+)\s*\}/;
const fbSizeText = (w, h) => 'def:{ w:(c.def && c.def.w) || ' + w + ', h:(c.def && c.def.h) || ' + h + ' }';
function collectAll(TREE){
  const sites = [];
  /* 兜底那一行先认：功能卡没写 card 时吃的就是这两个数字，清单里「出厂」那一栏得报它当下的值 */
  let fb = { w:16, h:12 }, fm = null;
  try{
    const fbText = fs.readFileSync(path.join(TREE, FB_REL), 'utf8');
    fm = FB_RE.exec(fbText);
    if(fm) fb = { w:+fm[1], h:+fm[2] };
  }catch(e){ fm = null; }
  const compDir = path.join(TREE, 'data', 'plugins');
  let names = [];
  try{ names = fs.readdirSync(compDir, { withFileTypes:true }).filter(e => e.isDirectory()).map(e => e.name); }catch(e){ names = []; }
  for(const n of names.sort()){
    if(n.startsWith('.') || n.startsWith('_')) continue;
    for(const s of packSites(TREE, n, fb)) sites.push(s);
  }
  if(fm) sites.push({ name:FB_NAME, w:fb.w, h:fb.h, kind:'fallback', rel:FB_REL, start:fm.index, len:fm[0].length });
  return sites;
}

/* ---------- 清单文本（YAML · 按页分组，和界面文字那份同一套路） ----------
   形状：
     Flow Desk · 桌面:
       日程:
         出厂: 6 × 8
         你要: 8 × 10
   段首那一行是「哪个程序的哪一页」（桌面卡片只有 Flow Desk 有），底下缩进两格一张卡片，
   卡片名底下两行：出厂那一行是程序原来给的大小（只当参照，改它没用），你要那一行写你要的大小。
   你要那一行空着、或者写成跟出厂一样、或者整张卡片删掉，都算没改。
   ----------
   为什么一张卡片占两行而不像预览里那样占一行：出厂值得留在盘上 —— 判断「这张卡你亲手拉过没有」
   拿的就是它当下的大小跟出厂大小比，只写一栏就没法比了。
   写出去之前过一道 plainOk（跟界面文字那份同一把尺）：卡片名里带冒号井号的会裹上引号。
   读的时候一行一行为政，认不动的那一行跳过，只坏那一行。 */
function plainOk(s){
  const t = String(s);
  if(t === '' || /[\r\n\t]/.test(t)) return false;
  if(/^\s|\s$/.test(t)) return false;
  if(/^[-?:,[\]{}#&*!|>'"%@`]/.test(t)) return false;
  if(/:\s/.test(t) || /\s#/.test(t)) return false;
  return true;
}
function yq(s){ const t = String(s); return plainOk(t) ? t : JSON.stringify(t); }
function yunq(s){
  const t = String(s);
  if(t[0] === '"'){ try{ const v = JSON.parse(t); return typeof v === 'string' ? v : t; }catch(e){ return t; } }
  if(t[0] === "'" && /'$/.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  const c = t.search(/\s#/);
  return (c < 0 ? t : t.slice(0, c)).trim();
}
function colonAt(line){
  for(let i = 0; i < line.length; i++){
    if(line[i] !== ':') continue;
    if(i + 1 >= line.length || line[i + 1] === ' ') return i;
  }
  return -1;
}
function kvOf(line){
  const s = String(line);
  if(s[0] === '"' || s[0] === "'"){
    let i = 1, esc = false;
    while(i < s.length){
      const c = s[i];
      if(esc) esc = false;
      else if(c === '\\' && s[0] === '"') esc = true;
      else if(c === s[0]){ if(s[0] === "'" && s[i + 1] === "'"){ i++; } else break; }
      i++;
    }
    if(i >= s.length) return null;
    const key = yunq(s.slice(0, i + 1));
    let j = i + 1; while(j < s.length && s[j] === ' ') j++;
    if(s[j] !== ':') return null;
    return { key, val:yunq(s.slice(j + 1).trim()) };
  }
  const k = colonAt(s);
  if(k < 0) return null;
  return { key:yunq(s.slice(0, k).trim()), val:yunq(s.slice(k + 1).trim()) };
}
const HEAD = [
  '【卡片大小清单】桌面上每张卡片第一次摆出来的大小（宽 × 高）由你说了算',
  '  这是一份 YAML（YAML 就是"用缩进和冒号排版"的纯文本），记事本、Notepad++ 都能直接改；存盘请保持 UTF-8 编码。',
  '  一张卡片两行：出厂那一行是程序原来给的大小，只当参照；你要那一行写你要的大小。',
  '  大小写成「宽 × 高」，单位是桌面上的格子数，宽最多 64、高最多 36，夹在两个数字中间的符号 x 也认。',
  '  你要那一行什么都不写、写得跟出厂一样、或者把这张卡片整段删掉，都算没改。',
  '  改完存盘，程序就按这一份读：新摆到桌上的卡片按新大小；你从来没亲手拉过大小的卡片也跟着变，',
  '    亲手拉过的卡片保着你拉的样子，不动它。',
  '  写坏一行只坏那一行：读不懂的那一行程序自己跳过，那张卡片回到出厂大小，其余各行照常按这一份读。',
  '  「其他卡片」这一张是不在这份清单上的卡片共用的底子；卡片名跟着源码走，功能卸了那一张自然没了。',
  '  改完想让它变成程序本来就有的一段代码：设置 → 数据 → 卡片大小 里点「把改动写进程序」，先给你看改动清单，你确认才落笔。',
  '  这一份由程序在每次重新生成页面时刷新，你写在「你要」后面的大小不会丢。以 # 开头的行是说明，程序读的时候跳过。'
];
function tagOf(name){ return FB_PROG + ' · ' + name; }
function one(s){ return String(s).replace(/[\r\n]+/g, ' '); }
function render(sites, prevRows){
  const keep = new Map();
  for(const r of (prevRows || [])) keep.set(r.name, r.to);
  const lines = HEAD.map(s => '# ' + s);
  const sorted = [...sites].sort((a, b) =>
    (a.kind === 'fallback' ? 1 : 0) - (b.kind === 'fallback' ? 1 : 0) || a.name.localeCompare(b.name, 'zh'));
  lines.push('');
  lines.push(yq(GROUP) + ':');
  for(const s of sorted){
    const from = one(sizeText(s.w, s.h));
    const kept = keep.get(s.name);
    const to = kept && kept !== from ? one(kept) : '';
    lines.push('  ' + yq(s.name) + ':');
    lines.push('    ' + K_OLD + ': ' + yq(from));
    lines.push('    ' + K_NEW + ':' + (to ? ' ' + yq(to) : ''));
  }
  return lines.join('\n') + '\n';
}
/* 读清单：段首行认「哪个程序的哪一页」，缩进两格是卡片名，卡片名底下缩进四格那两行是出厂 / 你要 */
function parse(text){
  const rows = [];
  let page = '', name = '', cur = null;
  const flush = () => {
    if(!cur) return;
    const from = cur.old;
    let v = (cur.new || '').trim();
    if(name && page === '桌面' && parseSize(from)){
      if(v && !parseSize(v)) v = '';                     /* 「你要」写坏了：这一张算没改 */
      if(v === from) v = '';
      rows.push({ src:tagOf(name), prog:FB_PROG, name, from, to:v });
    }
    cur = null;
  };
  for(const raw of String(text || '').split(/\r?\n/)){
    const s = raw.trimEnd();
    if(!s.trim() || s.trimStart().startsWith('#')) continue;
    const ind = /^\s*/.exec(s)[0].replace(/\t/g, '  ').length;
    const kv = kvOf(s.trim());
    if(!kv){ if(ind === 0) page = ''; continue; }        /* 认不动的这一行跳过：只坏这一行 */
    if(ind === 0){ flush(); const t = String(kv.key).split(' · ');
      const who = t[0].trim();
      page = (who === FB_PROG || who === FB_PROG_OLD) ? (t[1] || '').trim() : ''; name = ''; continue; }
    if(ind <= 2){ flush(); name = kv.key; continue; }
    if(!name) continue;
    if(!cur) cur = { old:'', new:'' };
    if(kv.key === K_OLD) cur.old = kv.val;
    else if(kv.key === K_NEW) cur.new = kv.val;
  }
  flush();
  return rows;
}

/* ---------- 写进装机里那一份已经生成的东西（2026-10-11 他改的口：不写回源码）----------
   edits = 清单里「你要」跟「出厂」不一样的那几张卡片（[{name, from, to}]）
   plan(TREE, edits, pageFile) 只出改动清单，一个字都不写；apply(TREE, edits, pageFile) 真写。
   pageFile 是主进程拿 resolveEntry 认出来的那一张（pages\ 底下最近写过的 Flow_Desk_<号>.html）。
   这一趟 src\ 底下一个字节都不碰，也不再跑「从源码重新生成页面」那一步。两处落点分开看：
     · 「其他卡片」那一张（kind 'fallback'）：那一句兜底数字住在 fd8-tools.js 里，而它是跟着那份源码
       原样拼进页面的，所以改的是那一张页面文件里的那一段 —— 位置怎么搬过去、生成那一步会不会改写
       字面量（结论：不改写），全写在 uitext.cjs 第 8 段那一条注释里，pageSpan 也从那儿取。
       那一段在这一张页面文件里对不上（页面和源码不同趟了、或者被生成步骤换过形状）→ 不动它，回 miss。
     · 其余几家（def / insTool / insCard / recipe）：落点是 data\plugins\<id>\main.js（配方还有 recipe.json）。
       那两份本来就不是 src\ 底下的源码，是运行时 import 的那一份装机件，照旧写它们自己：
       一家卡片的默认大小只在那一份里定义，那一张页面文件里根本没有那一段，硬往页面上写等于凭空造一个对不上。 */
/* 在一份定义文本里为「卡片大小」下刀：已经有 card.def 就改那两个数字，
   写了 card 没写 def 就往 card 里补一句 def，两个都没有就往最外面那层补一段 card。
   f.root 说这份怎么起头（JS 认 export default { ，JSON 认最外面那对花括号），
   f.quoted 说这份里键带不带双引号（向导写的配方两份都是 JSON 写法，包自己手写的定义不带）。 */
function sizePatch(text, f, w, h){
  const o = rootObj(text, f.root);
  if(!o) return null;
  /* 两种写法各自跟着所在那一份走：包里手写的定义不带引号，向导写的配方（两份）是 JSON */
  const defTxt = f.quoted ? '"def": { "w": ' + w + ', "h": ' + h + ' }' : 'def:{ w:' + w + ', h:' + h + ' }';
  const cd = cardDef(text, o);
  const hit = cd.def || keyAt(text, o.open, o.close, o.dep, RE_DEF, 1);
  if(hit) return { type:'rep', start:hit.index, len:hit[0].length, text:defTxt };    /* 已经写着数字：改那两个 */
  if(cd.cardOpen >= 0) return { type:'ins', at:cd.cardOpen + 1, text:' ' + defTxt + ',' };
  const cardTxt = f.quoted ? '"card": { ' + defTxt + ' },' : 'card:{ ' + defTxt + ' },';
  return { type:'ins', at:o.open + 1, text:'\n  ' + cardTxt };
}
/* 「其他卡片」那一处在页面文件里的下刀位置：先从源码里认出那一句，再搬过去；对不上回 null */
function fallbackCut(TREE, bundle, w, h){
  let body = '';
  try{ body = fs.readFileSync(path.join(TREE, FB_REL), 'utf8'); }catch(e){ return null; }
  const fm = FB_RE.exec(body);
  if(!fm) return null;
  const at = pageSpan(body, bundle, { off:fm.index, len:fm[0].length });
  return at < 0 ? null : { at, len:fm[0].length, text:fbSizeText(w, h) };
}
function plan(TREE, edits, pageFile){
  const sites = collectAll(TREE);
  const list = [], miss = [];
  let bundle;                                     /* 只有「其他卡片」那一张要读那一份页面文件，别白读一遍 */
  const 那一张页 = () => bundle === undefined ? (bundle = readPage(pageFile)) : bundle;
  for(const e of (edits || [])){
    const to = parseSize(e.to);
    if(!to) continue;
    const hit = sites.find(s => s.name === e.name);
    if(!hit){ miss.push({ name:e.name, from:e.from, to:e.to }); continue; }
    if(to.w === hit.w && to.h === hit.h) continue;   /* 装机那一份已经是新数字：不用动 */
    if(hit.kind === 'fallback' && !fallbackCut(TREE, 那一张页(), to.w, to.h)){
      miss.push({ name:e.name, from:e.from, to:e.to }); continue;      /* 那一句兜底在页面里认不出：不动它 */
    }
    /* 配方那一家有两份要跟着走：main.js（运行时 import 的）和 recipe.json（向导读的明文） */
    const files = hit.kind === 'recipe'
      ? [{ rel:hit.rel, root:'js', quoted:true }, { rel:hit.relJson, root:'json', quoted:true }].filter(f => f.rel)
      : [{ rel:hit.rel, root:'js', quoted:false }];
    list.push({ name:hit.name, from:sizeText(hit.w, hit.h), to:sizeText(to.w, to.h), w:to.w, h:to.h,
      kind:hit.kind, files, at:files.map(f => f.rel) });
  }
  return { list, miss };
}
/* 每个文件攒自己的改动：替换和插入都算位置上的剪贴，全按起点从后往前下刀，互不串位 */
function splice(text, patches){
  const all = patches.map(p => p.type === 'rep'
    ? { at:p.start, del:p.len, add:p.text }
    : { at:p.at, del:0, add:p.text });
  all.sort((a, b) => b.at - a.at);
  let out = text;
  for(const p of all) out = out.slice(0, p.at) + p.add + out.slice(p.at + p.del);
  return out;
}
function apply(TREE, edits, pageFile){
  const p = plan(TREE, edits, pageFile);
  const touched = new Map();      /* rel → 这一份动过 */
  const done = [];
  let bundle = null, bundleCut = null;   /* 那一张页面文件：整轮只读一次，最后一次性写回去 */
  for(const e of p.list){
    const at = [];
    if(e.kind === 'fallback'){
      /* 兜底那一句不是对象定义，是中立工具注册时现算的那一对数字，照原样改 —— 改的是那一张页面文件里的那一段 */
      if(bundle === null) bundle = readPage(pageFile);
      const cut = fallbackCut(TREE, bundle, e.w, e.h);
      if(!cut) continue;
      bundleCut = cut; at.push(pageFile);
    } else {
      for(const f of e.files){
        let text = '';
        try{ text = fs.readFileSync(path.join(TREE, f.rel), 'utf8'); }catch(err){ continue; }
        const patch = sizePatch(text, f, e.w, e.h);
        if(!patch) continue;
        const next = splice(text, [patch]);
        if(next === text) continue;
        fs.writeFileSync(path.join(TREE, f.rel), next);
        touched.set(f.rel, true); at.push(f.rel);
      }
    }
    done.push({ name:e.name, from:e.from, to:e.to, at });
  }
  const files = [...touched.keys()];
  if(bundleCut){
    bundle = bundle.slice(0, bundleCut.at) + bundleCut.text + bundle.slice(bundleCut.at + bundleCut.len);
    fs.writeFileSync(pageFile, bundle, 'utf8');
    files.push(pageFile);
  }
  return { done, files, miss:p.miss };
}


/* ---------- 刷新清单文件 ---------- */
function cardSizePath(TREE){ return path.join(TREE, 'data', 'card-size.yaml'); }
function refresh(TREE){
  const file = cardSizePath(TREE);
  let prev = [];
  try{ prev = parse(fs.readFileSync(file, 'utf8')); }catch(e){}
  const sites = collectAll(TREE);
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, render(sites, prev));
  return { file, rows:sites.length };
}

module.exports = { collectAll, render, parse, plan, apply, refresh, cardSizePath, parseSize, sizeText,
  yq, kvOf, plainOk, GROUP, K_OLD, K_NEW, FB_PROG, FB_NAME, TREE:TREE_ROOT };

if(require.main === module){
  const TREE = TREE_ROOT;
  const mode = process.argv[2];
  const sites = collectAll(TREE);
  if(mode === 'stats'){
    console.log('卡片 ' + sites.length + ' 处：');
    for(const s of sites) console.log('  ' + s.name + ' ' + sizeText(s.w, s.h) + '  [' + s.kind + '] ' + s.rel);
  } else if(mode === 'dump'){
    let prev = [];
    try{ prev = parse(fs.readFileSync(cardSizePath(TREE), 'utf8')); }catch(e){}
    process.stdout.write(render(sites, prev));
  } else {
    const r = refresh(TREE);
    console.log('WROTE ' + r.file + '  卡片 ' + r.rows + ' 行');
  }
}
