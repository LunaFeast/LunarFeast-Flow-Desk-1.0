/* issue #8（他 2026-10-19）：为写「＋打开内容」里那一栏不该是插件管理，该是插件「停靠」。
   三件事一件件钉：① 那一栏不再挂卸载那颗（插件管理归 Flow-Desk 那一屏）；
   ② 名单只认插件清单自己写了 "dock": true 的那几家，为写与日程不摆；
   ③ 借过来的那一家真能挂进右栏 —— 登记成为一种视图，render 里叫的是 Flow-Desk 那张表里那一家的 mount。 */
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const R = 记账('图8 · 插件停靠那一栏');
const 壳 = rd('src/_wnw/src/w3-shell.js');
const 载 = rd('src/_wnw/src/w5-load.js');
const 起 = rd('src/_wnw/src/w6-boot.js');
const 单 = 切方法(壳, '          for(const m of 可停){');
const 栏 = 壳.slice(壳.indexOf('const 可停 ='), 壳.indexOf('/* 插件路径里有这一格'));
const 那颗 = 切(载, 'wnwBindDocks');

R.题('一 · 那一栏摆什么');
{
  R.判('标题改成「插件「停靠」」，从前那句「不占功能位 · 只加设置或后台」整句退场（不留半句）',
    栏.includes("'插件「停靠」'") && !栏.includes('不占功能位 · 只加设置或后台'), (栏.match(/wnw-pick-h' \}, '[^']*'/) || [''])[0]);
  R.判('行尾不再挂卸载那颗：这一栏一个 PackOps.unloadButton 都没有（插件管理在 Flow-Desk 那一屏，四颗钮齐全）',
    !栏.includes('unloadButton') && 单.includes("'停靠'"), '这一栏里 unloadButton 出现 ' + (栏.match(/unloadButton/g) || []).length + ' 次');
  R.判('每一行那颗叫「停靠」，点下去关浮层再走 Desk.dockIt（挂的是这一家的 id，不是抄一份新名单）',
    /Desk\.dockIt\(m\.id, null, m\.name \|\| m\.id\)/.test(单) && /Overlay\.close\(\)/.test(单));
  R.判('名单只认清单自己点了头的（m.dock === true）：这一层不抄第二张 id 表，也没拿 host 当挡箭牌',
    栏.includes('m.dock === true') && !/'notes'|'schedule'|why-not-write/.test(栏), (栏.match(/filter\([^\n]*/) || [''])[0].slice(0, 120));
}

R.题('二 · 借过来的卡面真挂得上');
{
  R.判('登记走 Views.reg，形状与 registerTool 那一颗一致（name / icon / desc / title / render 五样齐）',
    /Views\.reg\(m\.id, \{ name:/.test(那颗) && 那颗.includes('title:() =>') && 那颗.includes('render(host, ref, ctx)'),
    (那颗.match(/Views\.reg\([^\n]*/) || [''])[0].slice(0, 120));
  R.判('render 里叫的是 Flow-Desk 那张表里这一家自己的 mount，宿主只递上下文，不替它画',
    /Registry\.get\(m\.id\)/.test(那颗) && /卡\.mount\(host,/.test(那颗) && /PackLoader\.ctxOf\(m\.id\)/.test(那颗));
  R.判('停靠那一档给上 host.dataset.scroll（与 registerTool 那条同一手），长组件不把整栏越拖越长',
    /ctx\.where === 'dock'\) host\.dataset\.scroll = '1'/.test(那颗));
  R.判('已经是为写一种内容的（音乐遥控器那一类）不顶；这一家这一轮没加载起来就不登记',
    那颗.includes('if(Views.get(m.id)) continue;') && 那颗.includes('!卡 || typeof 卡.mount !==') );
  R.判('开书那一趟真叫它（只定义不叫，界面上永远少这一栏）',
    /wnwBindTools\(\); wnwBindDocks\(\);/.test(起), (起.match(/wnwBindTools[^\n]*/) || [''])[0].trim());
}

R.题('三 · 三家清单各自点了头，另外四家没有');
{
  const 该有 = [['data/plugins/notes/manifest.json', '你的便签'], ['data/plugins/singbit-input-practice/manifest.json', '声笔输入法练习'], ['data/plugins/your-sentences/manifest.json', '你的句子']];
  const 该没 = [['data/plugins/schedule/manifest.json', '日程'], ['data/plugins/why-not-write/manifest.json', '为写'], ['data/plugins/music-remote/manifest.json', '音乐遥控器']];
  for(const [相, 名] of 该有){
    let m = null; try{ m = JSON.parse(rd(相)); }catch(e){}
    R.判('「' + 名 + '」清单里 dock 是真：' + 相, !!m && m.dock === true, m ? 'dock=' + JSON.stringify(m.dock) : '读不到那一份');
  }
  for(const [相, 名] of 该没){
    let m = null; try{ m = JSON.parse(rd(相)); }catch(e){}
    R.判('「' + 名 + '」没写 dock（这一栏不摆它）：' + 相, !!m && m.dock === undefined, m ? 'dock=' + JSON.stringify(m.dock) : '读不到那一份');
  }
}

R.题('四 · 双栏拖不动的根（issue #19：那张卡整张不许选，把拖拽的手也一起禁了）');
{
  const 皮 = rd('src/_wnw/src/w0-skin.js');
  R.判('那颗抓手还是走 HTML5 拖（draggable + dragstart 记 dockCur），没换成第二套',
    壳.includes("el.setAttribute('draggable', 'true')") && /addEventListener\('dragstart'/.test(壳));
  R.判('停靠那张卡确实挂着 .wnw-nosel（user-select:none）—— 这就是坑：Chromium 上选择权被禁的元素起不了 HTML5 拖拽',
    /class:'wnw-dock-card wnw-nosel/.test(壳) && /\.wnw-root \.wnw-nosel\{user-select:none;/.test(皮));
  R.判('修法只给那颗抓手单独放行（-webkit-user-drag:element），没把整张卡的"不许选出蓝底"改掉',
    皮.includes('.wnw-root .wnw-grip{-webkit-user-drag:element;}') && 皮.includes('.wnw-root .wnw-nosel{user-select:none;}'),
    (皮.match(/\.wnw-root \.wnw-grip\{[^}]*\}/) || [''])[0]);
  R.判('抓手那颗的类名确实是 wnw-grip（CSS 落不到别处，也漏不掉这一颗）',
    壳.includes("el.classList.add('wnw-grip')"));
  R.判('反证：把那条放行整条摘掉，这一道立刻叫（判的是那一条规则本身，注释里提一嘴不算数）',
    !/\.wnw-root \.wnw-grip\{-webkit-user-drag:element;\}/
      .test(皮.replace('.wnw-root .wnw-grip{-webkit-user-drag:element;}', '')));
}

R.题('五 · 章纲那一档（issue #10：默认始终悬浮，三档在设置 · 版式 那一页换）');
{
  const 写 = rd('src/_wnw/src/w8-write.js');
  const 起 = rd('src/_wnw/src/w6-boot.js');
  R.判('三档一个不落：始终悬浮 / 自动折叠 / 随正文滚动，认的是同一个位（ol-way），默认是"始终悬浮"',
    /const OlWay = \{/.test(写) && 写.includes("值:'stick'") &&
    写.includes("'stick', '始终悬浮'") && 写.includes("'auto', '自动折叠'") && 写.includes("'flow', '随正文滚动'"));
  R.判('卡片那一格真按这一档换类：flow 不钉、其余钉；auto 在正文超出这一屏时再按 shut 画',
    /const 折 = c\.olShut \|\| \(档 === 'auto' && OlWay\.该折\(this\)\);/.test(写) &&
    /'wnw-olcard' \+ \(折 \? ' shut' : ''\) \+ \(档 === 'flow' \? '' : ' stick'\)/.test(写));
  R.判('样式那一条在：.wnw-olcard.stick 钉在顶端（position:sticky），另外两条类各有样子',
    /\.wnw-olcard\.stick\{position:sticky;top:0;z-index:3;\}/.test(写));
  R.判('量不到正文那一栏就当不折（宁可不折，不许把章纲无故收掉）',
    /该折\(视图\)\{[\s\S]{0,200}return !!\(主 && 主\.scrollHeight > 主\.clientHeight \+ 2\);/.test(写));
  R.判('开屏读回来、点完写回去（State 的 ol-way 是唯一那一份，不在两处各存一遍）',
    /State\.get\('ol-way', 'stick'\)/.test(写) && /State\.set\('ol-way', this\.值\)/.test(写) && /await OlWay\.读\(\);/.test(起));
  R.判('这一段待在 addCss 那一段外面（塞进模板字符串就当 CSS 发出去了，既不生效也脏了样式）',
    写.indexOf('const OlWay = {') > 写.indexOf('\n`);'),
    'OlWay 在第 ' + 写.slice(0, 写.indexOf('const OlWay = {')).split('\n').length + ' 行，addCss 收尾在第 ' + 写.slice(0, 写.indexOf('\n`);')).split('\n').length + ' 行');
  R.判('反证：把默认那档换成"随正文滚动"，这一道立刻叫（默认必须是他要的"始终悬浮"）',
    !写.replace("值:'stick',", "值:'flow',").includes("值:'stick',"));
}

R.收尾();
