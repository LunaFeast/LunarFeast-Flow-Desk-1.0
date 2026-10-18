/* issue #66 · 桌面卡上那几颗钮挪到卡片外面（他举的形状：手机长按图标冒出来的快捷菜单）
   根子在两层 overflow:hidden：.fd-card 和 .fd-grid 都写着裁剪，从前那一排怎么摆都在卡边里挤着，
   所以「挪到卡外面」只有一条路 —— 固定定位（不吃祖先裁剪，卡片本身没有 transform / filter）。
   这一台不抄第二份公式：把真源码里那颗 bindTools 端进虚拟机，给四种卡片位置量气泡落在哪儿。 */
import vm from 'node:vm';
import { rd, 切方法, 记账 } from './lib-slice.mjs';

const R = 记账('图66 · 卡外的按钮气泡');
const S = rd('src/_fd/src/fd3-shell.js');
const 定bind = 切方法(S, '  bindTools(card, tools){');
const 定place = 切方法(S, '  place(card, it){');
const 定登记 = S.slice(S.indexOf('const ToolPop = {'), S.indexOf('window.addEventListener(\'resize\''));
const 样式段 = S.slice(S.indexOf('.fd-card-tools{position:fixed'));

/* 一台虚拟机：卡片和那一排都是假物件，只把「按矩形算落点」这一颗真源码端进来 */
function 开一台(窗宽, 窗高){
  const ctx = {
    Math, String, Number,
    window: { innerWidth: 窗宽, innerHeight: 窗高 },
    ToolPop: { 开(){}, 关(){} },
    h(){ return { style:{}, offsetWidth:0, offsetHeight:0, addEventListener(){} }; },
  };
  vm.createContext(ctx);
  const 造 = vm.runInContext('({' + 定bind + '}).bindTools', ctx);
  return {
    摆(矩形, 气泡 = { w:120, h:26 }){
      const card = { isConnected:true, style:{}, addEventListener(){}, getBoundingClientRect:() => 矩形 };
      const row = 造(card, []);
      row.offsetWidth = 气泡.w; row.offsetHeight = 气泡.h;
      card._popTools();
      return { 左: parseFloat(row.style.left), 上: parseFloat(row.style.top), 宽: 气泡.w, 高: 气泡.h,
               卡: 矩形, 读数: row.style.left + ' / ' + row.style.top };
    }
  };
}
const 台 = 开一台(1600, 900);
const 在窗口里 = r => r.左 >= 0 && r.上 >= 0 && r.左 + r.宽 <= 1600 && r.上 + r.高 <= 900;

R.题('一 · 真跑落点：先试卡上方，顶到窗口边就翻到卡下方');
{
  const 中 = 台.摆({ x:400, y:300, left:400, top:300, width:300, height:200, right:700, bottom:500 });
  R.判('卡在中间：气泡压在卡的正上方，且下沿压进卡边 6 像素（中间不留缝 —— 那道缝就是"点不中"的根）', 中.上 === 300 - 26 + 6, 中.读数);
  R.判('卡在中间：气泡的右边对齐卡片的右上角（左 = 卡右 - 气泡宽）', 中.左 === 700 - 120, 中.读数);

  const 首行 = 台.摆({ left:400, top:20, width:300, height:200, right:700, bottom:220 });
  R.判('第一行的卡：上方只剩 20 像素放不下，翻到卡的下方，那一款也压进卡边 6 像素', 首行.上 === 220 - 6, 首行.读数);

  const 贴右 = 台.摆({ left:1400, top:300, width:200, height:200, right:1600, bottom:500 });
  R.判('贴右窗口边的卡：气泡整颗收进窗口里（右边留 6 像素，不伸到屏幕外）', 贴右.左 === 1600 - 120 - 6, 贴右.读数);

  const 贴左 = 台.摆({ left:8, top:300, width:60, height:200, right:68, bottom:500 });
  R.判('贴左窗口边、比气泡还窄的卡：左边顶到 6 像素为止（不跑成负数）', 贴左.左 === 6, 贴左.读数);

  const 满高 = 台.摆({ left:400, top:4, width:300, height:886, right:700, bottom:890 });
  R.判('几乎占满整窗的卡：翻到下方也还夹在窗口里（下沿留 6 像素）', 满高.上 === 900 - 26 - 6, 满高.读数);
  for(const 形 of [[{ left:400, top:300, width:300, height:200, right:700, bottom:500 }, '中间的卡'],
                  [{ left:400, top:20, width:300, height:200, right:700, bottom:220 }, '第一行的卡'],
                  [{ left:1400, top:300, width:200, height:200, right:1600, bottom:500 }, '贴右的卡'],
                  [{ left:8, top:300, width:60, height:200, right:68, bottom:500 }, '贴左的窄卡'],
                  [{ left:400, top:4, width:300, height:886, right:700, bottom:890 }, '满高的卡']]){
    R.判(形[1] + '：算出来的落点整颗在窗口内', 在窗口里(台.摆(形[0])), 台.摆(形[0]).读数);
  }

  const 挪 = 台.摆({ left:400, top:600, width:300, height:200, right:700, bottom:800 });
  R.判('卡片挪了位置，落点跟着重算（不是只量一次钉死）', 挪.上 === 600 - 26 + 6, 挪.读数);
}

R.题('二 · 形状：那一排挂在卡片自己身上，不再挤在标题条里');
{
  R.判('卡片摆完标题条之后紧接一句 appendChild(this.bindTools(...))',
    /card\.appendChild\(this\.bindTools\(card, tools\)\);/.test(S));
  R.判('标题条那一行里再没有 fd-card-tools（钮整个搬出去了）',
    !/fd-card-head' \}, \[[^\n]*fd-card-tools/.test(S));
  R.判('为摆钮而浮的那条空标题条（fd-card-head float）整条撤了：JS 与样式两处都不留',
    !/fd-card-head float/.test(S) && !/\.fd-card-head\.float/.test(S),
    (S.match(/fd-card-head[.\s]{1,2}float/g) || []).length + ' 处残留');
  R.判('没有标题的那两种（notitle / noname）如今一条标题条都不摆，只有有名字的才摆',
    /if\(!bare\) card\.appendChild\(h\('div', \{ class:'fd-card-head' \}/.test(S));
  R.判('那一排还是卡片的直接子节点（Tab 走进卡片的顺序、:focus-within 都不用改）',
    /h\('span', \{ class:'fd-card-tools' \}, tools\)/.test(定bind));
}

R.题('三 · 样式：固定定位才出得了那两层裁剪，藏着的时候还得点不着');
{
  R.判('那一排是 position:fixed（absolute 出不了 .fd-card 那道 overflow:hidden）',
    /\.fd-card-tools\{position:fixed/.test(样式段));
  R.判('两层裁剪还在（正因为还在，卡里才画不出去）',
    /\.fd-card\{position:absolute[^\n]*overflow:hidden/.test(S) && /\.fd-grid\{position:absolute[^\n]*overflow:hidden/.test(S));
  R.判('藏着的时候 pointer-events:none —— 一排看不见的钮不许压着上面那张卡吃掉鼠标',
    /opacity:0;pointer-events:none;transition:opacity/.test(样式段));
  R.判('露不露由 ToolPop 挂的 .tools-on 管；键盘那一条 :focus-within 各写各的（无障碍走查 C-3）',
    /\.fd-card\.tools-on > \.fd-card-tools,\s*\n\.fd-card:focus-within > \.fd-card-tools\{opacity:1;pointer-events:auto;\}/.test(S));
  R.判('不再拿 .fd-card:hover 当开关：那一排冒到卡外面，鼠标一挪进中间那道缝，卡的悬停就断、一排当场消失',
    !/\.fd-card:hover > \.fd-card-tools/.test(S));
  R.判('悬停那一张卡整个抬到最上层（那一排是卡的孩子，不抬卡片就被上面那张卡盖住 —— 他 08:24 那一句「气泡置顶」）',
    /\.fd-card\.tools-on\{z-index:40;\}/.test(S));
  R.判('没改用 visibility 藏（改了键盘就走不进来）', !/\.fd-card-tools\{[^}]*visibility:hidden/.test(样式段));
  R.判('拖起来那一下整排藏掉：卡片带着 transform 时固定定位会改按卡片算坐标',
    /\.fd-card\.lift > \.fd-card-tools\{opacity:0;pointer-events:none;\}/.test(S));
  R.判('层级压在别的卡上面（40：高于卡片与把手，低于封面 50 / 弹窗 60 / 菜单 70）',
    /z-index:40/.test(样式段));
}

R.题('四 · 会动的三处都接了重量：卡片挪、窗口改大小、摘掉已经不在了的那张');
{
  R.判('place() 末尾：这张卡的气泡正开着就跟着重量一次', /if\(ToolPop\.cur === card\) card\._popTools\(\);/.test(定place));
  R.判('拖拽收尾那一句重量一次（落位之后气泡摆在真正的落点旁边）', /ToolPop\.重量\(\);/.test(切方法(S, '  bindDrag(card, it, def){')));
  const 挂 = S.match(/window\.addEventListener\('resize'[^\n]*/g) || [];
  R.判('窗口改大小挂了一条，而且只挂这一条（不是一张卡一条，免得重画一次漏一条）',
    挂.length === 1 && /window\.addEventListener\('resize', \(\) => ToolPop\.重量\(\)\);/.test(S), 挂.join(' ⏎ '));
  R.判('登记表只记「现在开着哪一张卡」，那张卡不在页面上了就摘掉（重画一次不留尾巴）',
    /cur:null/.test(定登记) && /this\.cur\.isConnected/.test(定登记) && /else this\.cur = null;/.test(定登记));
  R.判('开的时候也先量一次再登记（不然露出来的第一帧是上一个位置的坐标）',
    /开\(card\)\{ clearTimeout\(this\.延\); if\(!card\._popTools\) return; card\._popTools\(\); this\.cur = card; card\.classList\.add\('tools-on'\); \}/.test(定登记));
  R.判('离开留 200 毫秒宽限、宽限里再进来就把"收掉"那一步撤掉（手抖出界不算走）',
    /关\(card, 等\)\{\s*clearTimeout\(this\.延\);\s*if\(等\)\{\s*this\.延 = setTimeout\(\(\) => this\.关\(card\), 200\)/.test(定登记)
    && /card\.addEventListener\('pointerleave', \(\) => ToolPop\.关\(card, true\)\)/.test(定bind),
    (定bind.match(/pointerleave[^\n]*/g) || []).join(' ⏎ '));
  R.判('拖拽那颗守卫还在：按下这一排不给卡片起拖', /closest\('\.fd-card-tools'\)/.test(S));
}

R.收尾();
