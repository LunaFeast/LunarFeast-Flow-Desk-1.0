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

R.题('四 · 双栏拖不动（issue #19）：这一手改成指针自己算，不再求浏览器起拖');
{
  const 皮 = rd('src/_wnw/src/w0-skin.js');
  const 拖 = 切方法(壳, '  dockGrip(el, it){');
  const 点 = 切方法(壳, '  dockHit(x, y, src){');
  R.判('抓手听的是 pointerdown / pointermove / pointerup 这三下，浏览器自带那套（draggable、dragstart、drop）在这一颗里一个字都不剩',
    拖.includes("addEventListener('pointerdown'") && 拖.includes("addEventListener('pointermove'")
    && 拖.includes("addEventListener('pointerup'") && !/draggable|dragstart|dragend|dataTransfer/.test(拖),
    (拖.match(/addEventListener\('[a-z]+'/g) || []).join(' '));
  R.判('按下不动不算拖：挪过 4 像素才立这回事，没挪过的那一趟原样交给 click（点名字还是折叠 / 展开）',
    /< 4\) return;/.test(拖) && 拖.includes('拖着 = true'));
  R.判('落点从指针底下现量：先认卡片、再认空的那一栏，拖着自己那张回 null（在自己身上松手不该平白换位）',
    点.includes('document.elementFromPoint') && 点.includes("closest('.wnw-dock-card')")
    && 点.includes("closest('.wnw-dock-col')") && /card === src \? null/.test(点));
  R.判('上下位置照老规矩分：落在别的卡上半 = 插到它前面，下半 = 插到它后面；落在栏里 = 那一栏末尾',
    /pos:\(y < card\.getBoundingClientRect\(\)\.top \+ card\.getBoundingClientRect\(\)\.height \/ 2 \? 'before' : 'after'\)/.test(点)
    && 拖.includes("me.dockMoveTo(it, 落.col, null)") && 拖.includes('落.card.__dockItem, 落.pos)'));
  R.判('卡片建好那一刻就把对应那一条钉在自己身上（重画一次换一只，线跟着卡走，不另存一张表），松手时从那一格认回它',
    /card\.__dockItem = it;/.test(壳) && 拖.includes('落.card.__dockItem'));
  R.判('摆两栏才改栏归属，一栏时只换顺序（从前那条规矩没动）',
    拖.includes('me.colsShown === 2 ? me.dockColOf(落.card.__dockItem, 2) : null'));
  R.判('真拖过的那一趟紧跟着那一次 click 被拦掉（按下与抬起都在名字上时浏览器一定补这一下）：抖一下不该把面板折起来',
    /if\(拖着\) el\.addEventListener\('click'[\s\S]{0,120}capture:true, once:true/.test(拖));
  R.判('状态还是那一份：拖的时候记 dockCur、亮的是原来那三节课（dnd-out / dnd-tgt / dnd-col），暗的也是原来那颗 markCol',
    拖.includes('me.dockCur = it') && 拖.includes('me.markCol(') && 拖.includes('.dnd-out,.dnd-tgt,.dnd-col'));
  R.判('旧那两套 HTML5 的接法整块退场，全仓再没有第二处引它们（dockDnd / dockColDnd）',
    !壳.includes('dockDnd') && !壳.includes('dockColDnd'),
    'dockDnd 出现 ' + (壳.match(/dockDnd/g) || []).length + ' 次 · dockColDnd 出现 ' + (壳.match(/dockColDnd/g) || []).length + ' 次');
  R.判('那条 -webkit-user-drag 也整条撤（不改走 CSS 就不留死引用），可「这一张卡不许选出蓝底」那句还在',
    !皮.includes('-webkit-user-drag') && 皮.includes('.wnw-root .wnw-nosel{user-select:none;}'));
  R.判('停靠那张卡照旧挂着 .wnw-nosel（关的是选字，不再顺手把拖的手也一起管着 —— 这一手不归它了）',
    /class:'wnw-dock-card wnw-nosel/.test(壳));
  R.判('反证：把 pointerdown 那一行摘掉，这一道立刻叫（判的是真接上了指针，不是注释里提一嘴）',
    !/addEventListener\('pointerdown'/.test(拖.replace("el.addEventListener('pointerdown', ev => {", '')));
}

R.题('五 · 章纲那一档（issue #10：默认始终悬浮，三档在设置 · 版式 那一页换）');
{
  const 写 = rd('src/_wnw/src/w8-write.js');
  const 起 = rd('src/_wnw/src/w6-boot.js');
  R.判('三档一个不落：始终悬浮 / 自动折叠 / 随正文滚动，认的是同一个位（ol-way），默认是"始终悬浮"',
    /const OlWay = \{/.test(写) && 写.includes("值:'stick'") &&
    写.includes("'stick', '始终悬浮'") && 写.includes("'auto', '自动折叠'") && 写.includes("'flow', '随正文滚动'"));
  R.判('卡片那一格真按这一档换折与不折：auto 在正文装不下这一屏时按 shut 画；钉这一条挂到外面那一格身上',
    /const 折 = c\.olShut \|\| \(档 === 'auto' && OlWay\.该折\(this\)\);/.test(写)
    && /this\.olSlot\.className = 'wnw-colw' \+ \(档 === 'flow' \? '' : ' wnw-olpin'\);/.test(写)
    && /class:'wnw-olcard' \+ \(折 \? ' shut' : ''\)/.test(写));
  R.判('钉这一条挂的是正文那一栏的亲儿子那一格（.wnw-olpin），不是卡自己 —— 卡自己那一格高就等于卡高，sticky 走不动，一滚就跟着正文走了',
    /\.wnw-olpin\{position:sticky;top:0;z-index:3;\}/.test(写) && !/\.wnw-olcard\.stick\{/.test(写));
  R.判('反证：把 sticky 挪回卡上那一格，这一道立刻叫（钉不住等于这一档白做）',
    !/\.wnw-olpin\{/.test(写.replace('.wnw-olpin{position:sticky;top:0;z-index:3;}', '.wnw-olcard.stick{position:sticky;top:0;z-index:3;}')));
  R.判('「超出这一屏」量的是真在滚的那一格（.wnw-doc 那位 bodyBox，它才挂着 overflow:auto），用的还是正文自己的高度（正文那块自己 scrollHeight 永远等于 clientHeight，拿它比就一辈子不折；比底边又会在折与不折之间来回弹）',
    /该折\(视图\)\{[\s\S]{0,140}视图\.bodyBox[\s\S]{0,460}文\.offsetHeight > 滚\.clientHeight/.test(写)
    && !/scrollHeight > .*clientHeight/.test(写.slice(写.indexOf('该折(视图)'), 900)));
  R.判('量不到就当不折，扣掉的是这一格自己算出来的内边距与折叠那一条标题的高（不留一个说不清的数）',
    /if\(!滚 \|\| !文 \|\| !\(滚\.clientHeight > 0\)\) return false;/.test(写)
    && 写.includes('parseFloat(样.paddingTop)') && 写.includes('.offsetHeight : 0'));
  R.判('设置里点完当场把正开着的那几章重建一遍（等切一章才换样子，按下去那一眼就是没反应）',
    /for\(const \[, 视\] of ChOpen\) try\{ if\(视 && 视\.buildOl\) 视\.buildOl\(\); \}catch\(e\)\{\}/.test(写));
  R.判('开屏读回来、点完写回去（State 的 ol-way 是唯一那一份，不在两处各存一遍）',
    /State\.get\('ol-way', 'stick'\)/.test(写) && /State\.set\('ol-way', this\.值\)/.test(写) && /await OlWay\.读\(\);/.test(起));
  R.判('这一段待在 addCss 那一段外面（塞进模板字符串就当 CSS 发出去了，既不生效也脏了样式）',
    写.indexOf('const OlWay = {') > 写.indexOf('\n`);'),
    'OlWay 在第 ' + 写.slice(0, 写.indexOf('const OlWay = {')).split('\n').length + ' 行，addCss 收尾在第 ' + 写.slice(0, 写.indexOf('\n`);')).split('\n').length + ' 行');
  R.判('反证：把默认那档换成"随正文滚动"，这一道立刻叫（默认必须是他要的"始终悬浮"）',
    !写.replace("值:'stick',", "值:'flow',").includes("值:'stick',"));
}

R.收尾();
