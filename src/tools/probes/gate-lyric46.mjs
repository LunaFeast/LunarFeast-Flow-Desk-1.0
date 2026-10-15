/* ============================================================
   gate-lyric46.mjs · 插件分离第 4 批 4.7：歌词解析拆成各家一份，靠这一台对账
   ------------------------------------------------------------
     node src/tools/probes/gate-lyric46.mjs
   为什么要有这一台：从前音乐遥控器与为写共读 _shared/sh-ttml.js 一份，拆开之后两边各存一份，
   「拆走了别家的正确」这件事没法靠共用保证 —— 所以拿同一份歌词交给两家分别解析，
   时间戳与字与注音逐格比，必须一字不差。两份里那份时刻尺（毫秒 → LRC 时标）也照样比一遍。
   这一台不装浏览器、不抄第二份算法：两份源码原样端进虚拟机，只垫一台最小 XML 桩（够 TTML 那一点用），
   所以量的确实是这两份源码本身。
   三件反证钉住（不然就是橡皮章）：① 两份源码文本必须不一样（同档两次就是假对账）；
   ② 桩真的解析出了东西（行与字都得有数）；③ 把其中一份的「0 长垫 120 毫秒」改成 121，这一台必须红。
   ============================================================ */
import vm from 'node:vm';
import { rd, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-lyric46');
const 为写源 = rd('src/_wnw/src/w18-ttml.js');
const 遥控源 = rd('data/plugins/music-remote/ttml.js');

/* ---------- 一台最小 XML 桩：TTML 用到的那几样（元素、属性、文字、前缀折成 localName） ---------- */
const 实体 = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", rsquo:'’', lsquo:'‘', rdquo:'”', ldquo:'“', mdash:'—', hellip:'…', nbsp:' ' };
const 解实体 = s => s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (全, 内) => {
  if(内[0] === '#') return String.fromCodePoint(parseInt(内[1] === 'x' || 内[1] === 'X' ? 内.slice(2) : 内.slice(1), 内[1] === 'x' || 内[1] === 'X' ? 16 : 10));
  return 实体[内] === undefined ? 全 : 实体[内];
});
function 建节点(名, 属性串){
  const 属 = [];
  const 重 = /([:A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while((m = 重.exec(属性串 || ''))) 属.push({ name:m[1], localName:m[1].split(':').pop().toLowerCase(), value:m[2] });
  return {
    nodeType:1, nodeName:名, localName:名.split(':').pop().toLowerCase(), attributes:属, childNodes:[],
    get textContent(){ return this.childNodes.map(c => c.nodeType === 3 ? c.nodeValue : c.textContent).join(''); },
  };
}
function 解XML(文){
  const 根 = { nodeType:1, nodeName:'tt', localName:'tt', attributes:[], childNodes:[], get textContent(){ return ''; } };
  const 栈 = [根];
  const 扫 = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([^>]+)\s*>|<([:A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>'"])*?)(\/?)>|([^<]+)/g;
  let m;
  while((m = 扫.exec(文))){
    const 全 = m[0];
    if(全.startsWith('<!--') || 全.startsWith('<?')) continue;
    if(全.startsWith('<![CDATA[')){ 栈[栈.length - 1].childNodes.push({ nodeType:3, nodeValue:m[1] }); continue; }
    if(m[2] !== undefined){                            /* 收尾 */
      if(栈.length > 1) 栈.pop();
      continue;
    }
    if(m[3] !== undefined){                            /* 起头（或自闭） */
      const 节 = 建节点(m[3], m[4]);
      栈[栈.length - 1].childNodes.push(节);
      if(!m[5]) 栈.push(节);
      continue;
    }
    if(m[6] !== undefined){                            /* 文字 */
      const t = 解实体(m[6]);
      if(t) 栈[栈.length - 1].childNodes.push({ nodeType:3, nodeValue:t });
    }
  }
  return { documentElement:根, getElementsByTagName:名 => (名 === 'parsererror' ? [] : []) };
}

/* ---------- 两份源码各端进一台虚拟机，取出来对比的那几颗 ---------- */
function 载(源, 名表){
  const 净 = 源.replace(/^export\s+/gm, '');               /* 包里那份是 ES 模块：摘掉 export 关键字好端进虚拟机 */
  const ctx = vm.createContext({ DOMParser: function(){ this.parseFromString = t => 解XML(t); }, Math, Number, String,
    isFinite, parseFloat, RegExp, Array, Object, Set, JSON, parseInt });
  vm.runInContext(净 + '\n;globalThis.__出 = () => [' + 名表.join(',') + '];', ctx);
  const 拿 = vm.runInContext('__出()', ctx);
  const 出 = {};
  名表.forEach((名, 序) => { 出[名] = 拿[序]; });
  return 出;
}
const 为写 = 载(为写源, ['wTtmlParse', 'wTtmlClose', 'wTtmlClock', 'wLrcClock', 'wLrcStamp', 'wClockPad']);
const 遥控 = 载(遥控源, ['parse', 'close', 'stamp', 'lrcClock', 'clockPad']);

/* ---------- 两份歌词料：一份侧车形状（文件里的那一份），一份内嵌形状（歌曲标签里的那一份） ---------- */
const 头 = '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xmlns:ttm="http://www.w3.org/ns/ttml#metadata"><head><metadata><ttm:agent type="person" xml:id="v1"><ttm:name>主唱</ttm:name></ttm:agent><ttm:agent type="other" xml:id="v2"><ttm:name>和声</ttm:name></ttm:agent>';
const 侧车 = 头 +
  '<itunes:transliterations><text for="1"><span begin="0:00.100" end="0:00.300">Ma</span><span begin="0:00.300" end="0:00.600">mi</span></text></itunes:transliterations>' +
  '<itunes:translations><text for="1">第一行译法</text><text for="1">* 这一条是注释，讲的是文字游戏</text></itunes:translations>' +
  '</metadata></head><body><div>' +
  '<p begin="0:00.100" end="0:02.400" itunes:key="1" ttm:agent="v1"><span begin="0:00.100" end="0:00.600">Ma</span><span begin="0:00.600" end="0:01.100">mi</span> <span begin="0:01.100" end="0:01.700">that</span><span begin="0:01.700" end="0:01.900">&rsquo;</span><span begin="0:01.900" end="0:02.400">ll</span><span ttm:role="x-bg" begin="0:01.200" end="0:01.600">和声两个</span><span ttm:role="x-roman">马米 罗马音</span><span ttm:role="x-translation">行内译法</span></p>' +
  '<p begin="0:03.000" ttm:agent="v2"><span>没有 begin 的第一格</span><span end="0:04.500">第二格</span></p>' +
  '<p begin="0:03.000"><span>同戳的另一行</span></p>' +
  '</div></body></tt>';
const 内嵌 = 头.replace('<head>', '<head>') + '<itunes:translations><text for="2">第二行译法</text></itunes:translations></metadata></head><body><div>' +
  '<p begin="0:00.000" end="0:00.000" itunes:key="2"><span begin="0:00.000" end="0:00.000">零长的一格</span><span begin="0:00.000">跟着没 end 的一格</span></p>' +
  '<p><span begin="0:05.000" end="0:06.000">整行没 begin，靠字补</span></p>' +
  '</div></body></tt>';

const 比 = x => JSON.stringify(x, (k, v) => (v && typeof v === 'object' ? v : v));   /* 结构一比，字段顺序跟着源码走 */
function 收(出){
  const 行 = (出 && 出.lines) || [];
  return 行.map(L => ({ ms:L.ms, ms2:L.ms2, agent:L.agent, text:L.text, trans:L.trans,
    noteText:L.noteText, timed:!!(出 && 出.timed), 字数:(L.words || []).length,
    格:(L.words || []).map(w => [w.text, w.ms, w.ms2, w.bg ? 1 : 0,
      (w.notes || []).map(n => [n.text, n.ms, n.ms2])]) }));
}
const 格数 = 行 => 行.reduce((n, L) => n + L.字数, 0);
const 注数 = 行 => 行.reduce((n, L) => n + L.格.reduce((m, w) => m + w[4].length, 0), 0);
const 和声数 = 行 => 行.reduce((n, L) => n + L.格.filter(w => w[3]).length, 0);

台.题('一、同一份歌词两份，两家算出来的必须一字不差');
for(const [名, 文, 期望行, 期望格, 期望注, 期望和声] of [['侧车那一份', 侧车, 3, 6, 2, 1], ['内嵌那一份', 内嵌, 2, 3, 0, 0]]){
  const 甲 = 为写.wTtmlParse(文), 乙 = 遥控.parse(文);
  台.判('两家都认这一份是 TTML（' + 名 + '）', !!(甲 && 乙 && 甲.timed && 乙.timed), JSON.stringify([!!甲, !!乙]));
  const A = 收(甲), B = 收(乙);
  台.判(名 + '：行、格、注音、和声、翻译、时刻全部一致（' + A.length + ' 行 ' + 格数(A) + ' 格）',
    比(A) === 比(B), A.length !== B.length ? '行数就不同' : '第 ' + A.findIndex((L, i) => 比(L) !== 比(B[i])) + ' 行开始不同');
  /* 行数、格数、注音段数、和声格数当场钉死：万一 XML 桩哪一条没解析出来，两份同样残缺的表面对称就成了假对账 */
  台.判(名 + '：桩真按预期解析出了东西（' + 期望行 + ' 行 ' + 期望格 + ' 格 · 注音 ' + 注数(A) + ' 段 · 和声 ' + 和声数(A) + ' 格）',
    A.length === 期望行 && 格数(A) === 期望格 && 注数(A) === 期望注 && 和声数(A) === 期望和声,
    '实到 ' + A.length + ' 行 ' + 格数(A) + ' 格 · 注音 ' + 注数(A) + ' 段 · 和声 ' + 和声数(A) + ' 格');
}
/* 钉一句绝对形状（不只"两边一样"）：英文音节格并回整词、字距搬进注音、和声单列一层 —— 这一条两边同时错也照样一样 */
const 首 = 收(为写.wTtmlParse(侧车))[0];
台.判('侧车第一行确实并成了两格英文加一格和声（Mami／that’ll／和声两个），注音挂在字身上',
  比(首.格.map(w => [w[0], w[1], w[2], w[3]])) === 比([['Mami ', 100, 1100, 0], ['that’ll', 1100, 2400, 0], ['和声两个', 1200, 1600, 1]])
  && 比(首.格.map(w => w[4])) === 比([[['Ma ', 100, 300]], [['mi', 300, 600]], []]),
  比(首.格));
台.判('声部名单两边同（两份都只在真有两个声部时才带上）',
  比((为写.wTtmlParse(侧车) || {}).agents || null) === 比((遥控.parse(侧车) || {}).agents || null));

台.题('二、时刻那两把尺也逐格比');
const 刻 = [0, 7, 999, 1000, 61500, 3600000, 3661234, 86399999, -50, NaN, undefined, 'abc'];
台.判('LRC 时标（行首 [..] 与句内 <..> 两种）十一档全同',
  刻.every(ms => 为写.wLrcStamp(ms) === 遥控.stamp(ms) && 为写.wLrcStamp(ms, true) === 遥控.stamp(ms, true)),
  刻.map(ms => [为写.wLrcStamp(ms), 遥控.stamp(ms)].join('/')).find((x, i, 全) => x.split('/')[0] !== x.split('/')[1]));
台.判('LRC 时刻 m:ss.xxx（导出与句内打点用的那把尺）十一档全同',
  刻.every(ms => 为写.wLrcClock(ms) === 遥控.lrcClock(ms)),
  刻.map(ms => ms + ':' + 为写.wLrcClock(ms) + '/' + 遥控.lrcClock(ms)).find(x => x.split(':')[1].split('/')[0] !== x.split('/')[1]));
台.判('LRC 百分秒那一档（导出 LRC 行首用的 frac=2）十一档全同',
  刻.every(ms => 为写.wLrcClock(ms, 2) === 遥控.lrcClock(ms, 2)),
  刻.map(ms => ms + ':' + 为写.wLrcClock(ms, 2) + '/' + 遥控.lrcClock(ms, 2)).find(x => x.split(':')[1].split('/')[0] !== x.split(':')[1]));
台.判('补零那一颗两边同（上面几把尺都靠它）',
  [[7, 2], [7, 3], [1234, 2], [0, 3]].every(([n, w]) => 为写.wClockPad(n, w) === 遥控.clockPad(n, w)));
台.判('为写那一份的 TTML 时刻写成 HH:MM:SS.mmm 十二位（包里没有这一种写法，只钉它自己那份的形状）',
  为写.wTtmlClock(3661234) === '01:01:01.234', 为写.wTtmlClock(3661234));

台.题('三、三件反证（这台不许是橡皮章）');
台.判('两家读的确实是两份源码（文本不一样：拆成了各家一份，同档两次就是假对账）',
  为写源 !== 遥控源 && 为写源.length > 6000 && 遥控源.length > 6000,
  [为写源.length, 遥控源.length].join(' vs '));
const 改过的 = 载(为写源.replace('s.ms2 = s.ms + 120;', 's.ms2 = s.ms + 121;'), ['wTtmlParse']);
台.判('把为写那一份里"0 长的一格垫 120 毫秒"改成 121，这一台立刻报不一致（差异看得见才算对账）',
  比(收(改过的.wTtmlParse(内嵌))) !== 比(收(遥控.parse(内嵌))));
台.判('空文与读不通的 XML，两家一样都回没有（不许一家抛一家回 null）',
  [为写.wTtmlParse('不是 XML'), 遥控.parse('不是 XML'), 为写.wTtmlParse(''), 遥控.parse('')].every(x => x === null),
  [为写.wTtmlParse(''), 遥控.parse('')].map(x => x === null ? '没有' : typeof x).join(' / '));

台.题('四、旧的共读那一份真撤干净了');
台.判('_shared/sh-ttml.js 已经不在了（拆成就一处不剩，不留第二份真身）',
  !rd('src/_fd/build.mjs').includes('sh-ttml') && !rd('src/_shared/sh-load.js').includes('shTtmlParse'));
台.判('宿主不再随 ctx 发这只手，包也不再向宿主借（两边各用各的）',
  !/ctx\.ttml\s*=/.test(rd('src/_shared/sh-load.js')) && !/K\.ttml\./.test(rd('data/plugins/music-remote/main.js')));
台.判('为写那份在为写内核的装配单上、包里那份在包内（各归各家）',
  rd('src/_wnw/build-kernel.mjs').includes("'w18-ttml.js'") && rd('data/plugins/music-remote/main.js').includes("from './ttml.js'"));

台.收尾();
