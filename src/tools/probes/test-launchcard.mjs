/* issue #65 · 两张启动卡的卡面（他 2026-10-19 那条）：
   从前卡面上写一整句「打开为写，开始写作」，认人靠读字；他要的是卡面摆这一家自己的封面，
   右上角一串浅色英文缩写（为写 WNW、声笔输入法练习 SIP），那整句退进悬停提示。
   这一台不抄第二份写法：把真源码里那颗 mountLauncher 端进虚拟机，喂两种清单，看画出来的是什么。 */
import vm from 'node:vm';
import { rd, 切, 记账 } from './lib-slice.mjs';

const R = 记账('图65 · 启动卡的封面与缩写');
const 壳 = rd('src/_fd/src/fd4-builtin.js');
const 载 = rd('src/_shared/sh-load.js');
const 样 = rd('src/_fd/src/fd3-shell.js');
const 那颗 = 切(壳, 'mountLauncher');

/* 一台小虚拟机：h() 造的是假节点，只留这一台要量的那几样（类名、提示、文本、子节点、量出来的尺寸） */
function 开一台(包, 尺, item){
  const 叫过 = [];
  const 拆 = [];
  const 造 = (tag, p, kid) => ({
    tag, class: (p && p.class) || '', title: (p && p.title) || '', html: (p && p.html) || '',
    text: typeof kid === 'string' ? kid : '', kids: Array.isArray(kid) ? kid.slice() : [],
    style: (p && p.style) || { setProperty(){} },
    clientWidth: 尺 ? 尺[0] : 0, clientHeight: 尺 ? 尺[1] : 0,
    addEventListener(){}, onclick: null,
    appendChild(x){ this.kids.push(x); return x; },
  });
  const ctx = {
    h: 造,
    icoFor(id, name){ 叫过.push([id, name]); return '<span class="w-ico" data-ico="pack-' + id + '"></span>'; },
    Shell: { cellW: 60, cellH: 57, gap: 10 },
    ResizeObserver: class { constructor(f){ this.f = f; } observe(el){ 拆.push(el); } disconnect(){ this.拆 = true; } },
    Math, String, Number, JSON,
  };
  vm.createContext(ctx);
  const 跑 = vm.runInContext('(' + 那颗 + ')', ctx);
  const body = 造('div', { class: 'fd-card-body' }, []);
  const 回 = 跑(body, { action: '开始写作', open(){} }, { pack: 包, item: item || null });
  return { body, 回, 叫过, 拆, face: body.kids[0] };
}

const 为写 = { id: 'why-not-write', name: '为写', icon: '✎', abbr: 'WNW' };
const 练习 = { id: 'singbit-input-practice', name: '声笔输入法练习', icon: '⌨', abbr: 'SIP' };

R.题('一 · 卡面上摆的是什么');
{
  const 台 = 开一台(为写, [300, 120]);
  const 全 = JSON.stringify(台.face && { 类: 台.face.class, 提示: 台.face.title, 子: 台.face.kids.map(k => ({ 类: k.class, 文: k.text, 图: k.html })) });
  R.判('卡面不再写整句引导文字：那一句只在悬停提示里（title），不当卡面上的字',
    台.face.title === '打开为写，开始写作' && 台.face.kids.every(k => !String(k.text).includes('打开')), 全);
  R.判('中间那一张走的是这一家自己那张封面：icoFor 收到的是包 id（它先按 pack-<id> 找）',
    台.叫过.length === 1 && 台.叫过[0][0] === 'why-not-write', JSON.stringify(台.叫过));
  R.判('右上角那一串是清单里的缩写，节点类名就是给浅色那一条用的',
    台.face.kids.length === 2 && 台.face.kids[1].text === 'WNW' && 台.face.kids[1].class === 'fd-launch-abbr', 全);
  R.判('整块卡面还是"点一下就开"：挂的是 div 上的一颗 onclick，没有再铺一层盖住卡面的按钮',
    台.body.kids.length === 1 && 台.face.tag === 'div' && typeof 台.face.onclick === 'function');
  R.判('从前那种"整句文字塞进一个 span"的写法整个退场（不留第二套画法）',
    !/h\('span', \{\}, '打开'/.test(那颗) && !/white-space:nowrap/.test(那颗));
}

R.题('二 · 缩写从插件清单流到界面，那一条路一处不漏');
{
  R.判('metaOf 把清单里那两样（icon / abbr）认进 def —— 不认，界面就拿不到',
    /icon:m\.icon \|\| ''/.test(载) && /abbr:m\.abbr \|\| ''/.test(载));
  R.判('ctx.pack 也带这一串：插件那一家自己不抄第二份，卡面吃的是同一份清单',
    /pack:\{[^}]*abbr:m\.abbr \|\| ''/.test(载.replace(/\s+/g, ' ')), 'ctx.pack 那一段：' + (载.match(/pack:\{[^\n]*/g) || []).join(' ⏎ ').slice(0, 160));
  const 台 = 开一台({ id: 'notes', name: '你的便签', abbr: '' }, [300, 120]);
  R.判('反证：清单没写缩写的（便签那几家本来就没有）只摆封面，不硬凑一串空字',
    台.face.kids.length === 1 && 台.face.kids[0].class === 'fd-launch-ico');
  const 两 = [['data/plugins/why-not-write/manifest.json', 'WNW'], ['data/plugins/singbit-input-practice/manifest.json', 'SIP']];
  for(const [相, 该] of 两){
    let m = null; try{ m = JSON.parse(rd(相)); }catch(e){}
    R.判('隔壁那一棵的插件清单真写了这一串（' + 该 + '）：' + 相, !!m && m.abbr === 该, m ? 'abbr=' + m.abbr : '读不到那一份清单');
  }
}

R.题('三 · 图标跟着卡面大小走（卡片能改大小，画死一个数就不对）');
{
  const 量 = (尺, item) => 开一台(为写, 尺, item).face.kids[0].style.fontSize;
  R.判('宽卡（300×120）：取短边 120 的一半 60，封顶 44 像素', 量([300, 120]) === '44px', 量([300, 120]));
  R.判('小卡（80×60）：短边 60 的一半 30，落在 16..44 之间就照它', 量([80, 60]) === '30px', 量([80, 60]));
  R.判('挂载这一刻量不到（还没进网格）：按格子数与格边自己算一个，不写死（1×1 那一格 → 短的那轴 47 的一半）',
    量([0, 0], { w: 1, h: 1 }) === '24px', 量([0, 0], { w: 1, h: 1 }));
  R.判('ResizeObserver 盯的是卡面自己：卡片改大小、窗口改宽窄都重量一次',
    /new ResizeObserver\(量\)/.test(那颗) && /ro\.observe\(face\)/.test(那颗));
}

R.题('四 · 样式那一段（浅色靠透明度，不靠新加解释小字）');
{
  const 段 = 样.slice(样.indexOf('.fd-launch{'));
  R.判('三条都在：卡面铺满、图标居中、缩写钉在右上角',
    段.startsWith('.fd-launch{') && 段.includes('.fd-launch-ico{') && 段.includes('.fd-launch-abbr{'));
  R.判('缩写是"浅"：拿 opacity 压，不另配一行说明文字（他的界面规矩）',
    /\.fd-launch-abbr\{[^}]*opacity:\.3/.test(段) && /\.fd-launch-abbr\{[^}]*pointer-events:none/.test(段), 段.slice(0, 260));
  R.判('缩写位置在右上角（right + top，不是居中那一排里挤着）',
    /\.fd-launch-abbr\{[^}]*right:6px;top:3px/.test(段));
  R.判('卡面那一条吃 flex:1 与 min-height:0：铺满卡片又不把卡片顶大',
    /\.fd-launch\{[^}]*flex:1[^}]*min-height:0/.test(段));
}

R.收尾();
