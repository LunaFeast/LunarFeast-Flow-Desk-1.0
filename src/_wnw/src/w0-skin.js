/* ============================================================
   WNW 容器皮肤 —— 为写的代码挂进宿主页面之后，它那一整套骨架和外观底子
   ----------
   从前这些规则写在两份地方：装配模板 <style> 里那副骨架，和 w3-shell.js 的
   injectCss() 那一大段。两处都按「这一份文档只有我一个程序」写的，页面级选择器
   （html / body / :root）和裸标签选择器（button / select / textarea / input / *）
   直接盖整张页。搬进宿主之后那张页上还有别人，所以这一份把它们全收进 .wnw-root 那一层：

     · html,body / body / :root 这三种页面级选择器并成一条 .wnw-root —— 
       挂在容器上的自定义属性，容器里的后代照样继承得到，宿主的 :root 一点不脏；
     · 兜底色板那一段（装配模板 :root 里那一整套 --page-bg / --accent / --slot-*…）这里不留：
       宿主的外观三层本来就把同名 token 发在自己那层 :root 上，容器继承即可，
       抄第二份就会把宿主挑的色顶掉。只有 --base-fs 这一条量字的基准不是色，宿主没发过，
       留在这里给上面那条 font-size 用；
     · 裸标签规则一律加 .wnw-root 前缀，不加的那两条（控件字体、边框）会改掉整张页的控件长相；
     · #wnwToast 从 fixed 改 absolute，配 .wnw-root 的 position:relative，
       提示条只在容器里头浮，不再钉在整张页的底边。
   ============================================================ */
const WNW_ROOT_CSS = `
/* ---------- 骨架 ---------- */
.wnw-root,.wnw-root *{box-sizing:border-box;}
.wnw-root{
  position:relative;
  height:100%;margin:0;overflow:hidden;
  display:flex;flex-direction:column;
  font-family:var(--ff-ui);
  font-size:calc(var(--base-fs, 15px) * var(--vsc));
  background:var(--page-bg);color:var(--text);
  /* 结构量：圆角三档、间距、分区字号、字体四档。色号不在这里，跟着宿主那一层走。 */
  --vsc: calc(var(--wnw-vsc, 1)); --base-fs:15px;
  --radius:5px; --r-card:5px; --r-panel:var(--r-card,5px); --r-btn:5px; --r-pill:var(--r-btn,5px); --gap:10px; --gap-blk:18px;
  --fs-doc:14px; --fs-gang:13px; --fs-side:13px; --fs-top:14px;
  --ff-ui:${FF_BASE_WNW}; --ff-doc:${FF_BASE_WNW}; --ff-gang:${FF_BASE_WNW}; --ff-side:${FF_BASE_WNW}; --ff-code:${FF_MONO}; }
.wnw-root #wnwTop{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 16px;
  border-bottom:var(--hair);background:var(--card-bg);}
.wnw-root #wnwTop .brand{font-weight:800;font-size:1.1429em;letter-spacing:.02em;}
.wnw-root #wnwTop .brand small{display:block;font-weight:400;font-size:.6190em;letter-spacing:.18em;color:var(--text-light);}
.wnw-root #wnwNav{display:flex;gap:6px;margin-left:8px;min-width:0;flex-wrap:nowrap;}
.wnw-root #wnwTopRight{flex:0 0 auto;}
.wnw-root #wnwBody{flex:1 1 auto;min-height:0;display:flex;}
.wnw-root #wnwTool{flex:1 1 auto;min-width:0;overflow:auto;padding:14px 18px;}
.wnw-root .pane{display:flex;gap:14px;align-items:flex-start;min-height:100%;}
.wnw-root .pane > .col{min-width:0;}
.wnw-root .pane > .col-form{flex:0 1 460px;}
.wnw-root .pane > .col-out{flex:1 1 auto;position:sticky;top:0;}
/* 提示条：原来是 fixed 钉在整张页底边，现在浮在容器内（容器那一层已经 position:relative） */
.wnw-root #wnwToast{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:60;
  padding:8px 16px;border-radius:var(--r-pill,5px);background:var(--text);color:var(--card-bg);
  font-size:.8571em;opacity:0;pointer-events:none;transition:opacity .2s;}
.wnw-root #wnwToast.on{opacity:1;}
/* 骨架里写死的圆角归位到全局那一档：胶囊名 --r-pill 已经并到控件圆角，不再钉死 99px */
.wnw-root #wnwToast{border-radius:var(--r-pill,5px);}
/* 分区字号：四块各吃一个变量，块内一律用 em，所以改一处整块跟着缩放 */
.wnw-root .wnw-doc-inner{font-size:calc(var(--fs-doc) * var(--vsc));font-family:var(--ff-doc);}
.wnw-root .wnw-left,.wnw-root .wnw-olcard{font-size:calc(var(--fs-gang) * var(--vsc));font-family:var(--ff-gang);}
.wnw-root .wnw-right,.wnw-root .wnw-side,.wnw-root .wnw-panel{font-size:calc(var(--fs-side) * var(--vsc));font-family:var(--ff-side);}
.wnw-root #wnwTop,.wnw-root .wnw-shelf-wrap{font-size:calc(var(--fs-top) * var(--vsc));}
/* 顶栏 / 书架那两块的字号档已经并进上面，容器自己吃 --ff-ui，这里不再单列 body 规则 */
.wnw-root button{font:inherit;color:inherit;}
/* 模板给 #wnwTool 留了内边距和滚动：书架要滚，工作台要顶满，各自改 */
.wnw-root #wnwTool{height:100%;padding:0;overflow:hidden;}
.wnw-root #wnwTool.wnw-shelf-wrap{overflow:auto;}
.wnw-root .wnw-topstat{display:flex;gap:10px;align-items:center;font-size:.8571em;}
.wnw-root .wnw-topstat b{font-size:1.05em;}
/* 按钮 / 卡片 / 表单 / 结果块这几套样式搬到 _shared/sh-style.js，与宿主共用一份 */
.wnw-root .wnw-tab{border:var(--bw) solid transparent;background:transparent;color:var(--text-light);
  border-radius:var(--r-pill,5px);padding:5px 14px;cursor:pointer;white-space:nowrap;}
.wnw-root .wnw-tab.on{background:var(--accent-light);color:var(--accent-text,var(--accent));font-weight:700;border-color:var(--loaded-border);}
/* 顶栏书标签：一排胶囊，书名超长自己截断，整排不许把右边那串数字顶出容器 */
.wnw-root .wnw-btab{display:flex;align-items:center;gap:4px;min-width:0;max-width:11em;cursor:pointer;
  border:var(--bw) solid transparent;border-radius:var(--r-pill,5px);padding:4px 6px 4px 12px;color:var(--text-light);}
.wnw-root .wnw-btab:hover{background:var(--candidate-bg);}
.wnw-root .wnw-btab.on{background:var(--accent-light);color:var(--accent-text,var(--accent));border-color:var(--loaded-border);font-weight:700;}
.wnw-root .wnw-btab .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-root .wnw-btab .x{border:0;background:transparent;color:inherit;opacity:.55;padding:0 4px;border-radius:var(--r-pill,5px);cursor:pointer;}
.wnw-root .wnw-btab .x:hover{opacity:1;background:var(--hair-color);}
.wnw-root .wnw-badd{flex:0 0 auto;border:1px solid var(--ctl-edge,var(--input-border));background:transparent;color:var(--text-light);
  border-radius:var(--r-pill,5px);padding:4px 10px;cursor:pointer;}
.wnw-root .wnw-badd:hover{border-color:var(--text);color:var(--accent-text,var(--accent));}
/* 统计指标卡：数字在上、名字在下，格子按停靠栏宽度自己排 */
.wnw-root .wnw-stat-grid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr));}
.wnw-root .wnw-stat-cell{padding:6px 8px;text-align:center;}
.wnw-root .wnw-stat-cell .v{font-size:1.18em;font-weight:800;}
.wnw-root .wnw-field > .wnw-grid{align-self:center;}
/* 认「input 减去系统自绘那几种」，原来只列了四种 type，date / time / color / 裸 input 全漏在主题外。
   :not 那一串用 :where 包住：不然四条属性选择器把权重顶到 0-4-1，
   等宽那些类（.wnw-hl-re、.wnw-blk.md .wnw-ta）永远压不过去，代码档字体也就从来没生效过。
   边框宽度钉死 1px、颜色走 --ctl-edge，和 _shared/sh-style.js 里工具区那两条同一个写法：
   这一串选择器只有 0-0-1，裸 textarea / 裸 input 又不在外观层的描边名单里，
   跟着 --bw 走就在质感那一档当场没边（那个档位 --bw 是 0px）。
   加容器前缀是必须的：不加的话整张页面上别人的输入框也一起吃这一套字体和边框。 */
.wnw-root select,.wnw-root textarea,.wnw-root input:where(:not([type=checkbox],[type=radio],[type=range],[type=color])){
  font:inherit;color:var(--text);background:var(--input-bg);
  border:1px solid var(--ctl-edge,var(--input-border));border-radius:var(--r-btn);padding:4px 8px;min-width:0;}
.wnw-root input[type=checkbox],.wnw-root input[type=radio],.wnw-root input[type=range]{accent-color:var(--accent);}
/* 工具区的控件样式由 _shared/sh-style.js 在 .sh-tools 里再给一份，宿主用那份 */
.wnw-root textarea{resize:vertical;line-height:1.6;}
.wnw-root .wnw-switch{display:flex;gap:var(--gap);align-items:center;cursor:pointer;}
.wnw-root .wnw-set-sp{display:block;height:1px;background:var(--hair-color);}
/* 设置：左边一列竖标签，右边是这一档的内容；面板定死 1080×680，切档不跟着内容长短抖 */
.wnw-root .wnw-set{display:flex;gap:18px;align-items:stretch;flex:1;min-width:0;}
.wnw-root .wnw-set-tabs{flex:0 0 auto;min-width:104px;display:flex;flex-direction:column;gap:4px;align-content:start;
  border-right:var(--hair);padding-right:12px;}
.wnw-root .wnw-set-tabs .wnw-tab{text-align:left;border-radius:var(--r-btn,5px);}
.wnw-root .wnw-dots{display:inline-flex;gap:4px;align-items:center;}
.wnw-root .wnw-dots i{display:block;width:14px;height:14px;border-radius:50%;border:1px solid var(--hair-color);}
.wnw-root .wnw-set-body{flex:1;min-width:0;display:grid;gap:12px;align-content:start;overflow:auto;}
/* 设置里的高亮区：一条规则一格 */
.wnw-root .wnw-hl-list{display:grid;gap:0;}
.wnw-root .wnw-hl-item{display:grid;gap:5px;padding:7px 0;border-bottom:var(--hair);}
.wnw-root .wnw-hl-item:last-child{border-bottom:0;}
.wnw-root .wnw-hl-row{display:flex;gap:var(--gap);align-items:center;flex-wrap:wrap;}
.wnw-root .wnw-hl-row .nm{flex:1 1 auto;min-width:0;font-weight:700;}
.wnw-root .wnw-hl-row select{flex:0 0 auto;}
.wnw-root .wnw-slots{display:flex;gap:6px;align-items:center;flex:0 0 auto;}
.wnw-root .wnw-slot{width:15px;height:15px;border-radius:50%;border:1px solid var(--ctl-edge,var(--input-border));cursor:pointer;padding:0;}
/* 色位挑一个的选中确认（描边 + 内圈 + 勾）归 _shared/sh-style.js 外13-O 那一份全站统一语言，这里不再各画一份。
   从前这一条是 outline:2px —— 和外观层那条 2px 焦点框同一个通道：键盘走到选中那个时两条环叠成一条，
   分不清「选中」和「焦点」，所以撤掉；焦点框仍归外观层那一条，选中态只走圈内结构与勾。 */
.wnw-root .wnw-hl-re,.wnw-root .wnw-hl-kw{font-family:var(--ff-code,ui-monospace,Consolas,monospace);font-size:.9em;width:100%;}
.wnw-root .wnw-hl-kw{min-height:64px;line-height:1.7;resize:vertical;}
.wnw-root .wnw-hl-re.bad{border-color:var(--bad);color:var(--bad);}
/* 「可用的正则写法」那一张：名字一列、式子一列，说明跟在式子下面一行 */
.wnw-root .wnw-hl-re-grp{margin-top:8px;color:var(--accent-text,var(--accent));font-weight:800;font-size:.9em;}
.wnw-root .wnw-hl-re-row{display:grid;grid-template-columns:7.5em 1fr;gap:0 8px;align-items:baseline;padding:2px 0;}
.wnw-root .wnw-hl-re-row .nm{color:var(--text-light);font-size:.88em;}
.wnw-root .wnw-hl-re-row code{font-family:var(--ff-code,ui-monospace,Consolas,monospace);font-size:.9em;word-break:break-all;}
.wnw-root .wnw-hl-re-row .ds{grid-column:2;color:var(--text-light);font-size:.84em;}
/* 浮层和小菜单原来是 fixed 盖满整个视口、挂在 document.body 上；
   现在挂在容器内、改成 absolute，盖的就是这一容器（容器已经 position:relative） */
.wnw-root .wnw-overlay{position:absolute;inset:0;background:rgba(0,0,0,.34);display:flex;align-items:center;justify-content:center;z-index:50;}
.wnw-root .wnw-panel{background:var(--card-bg);border:var(--bw) solid var(--card-border);border-radius:var(--r-panel);
  max-width:min(820px,92%);max-height:88%;display:flex;flex-direction:column;}
.wnw-root .wnw-panel.wide{max-width:94%;width:1100px;}
/* 推演组件定制那一张要 1400px：只有它，词库编辑器、推演记录还是原来的宽 */
.wnw-root .wnw-panel.vwide{max-width:96%;width:min(1400px,96%);}
/* 设置那一档：1080×680 定死，内容在自己那一栏里滚。
   max-width 一起写：.wnw-panel 底子是 max-width:820，光给 width 会被它截住。 */
.wnw-root .wnw-panel.set{width:min(1080px,94%);max-width:94%;height:min(680px,88%);max-height:88%;}
.wnw-root .wnw-panel.set > .wnw-panel-body{flex:1 1 auto;min-height:0;display:flex;overflow:hidden;}
/* 左边那列竖标签不参与滚动：滚动只发生在右栏（.wnw-set-body）里 */
.wnw-root .wnw-set{min-height:0;}
.wnw-root .wnw-panel-head{display:flex;align-items:center;gap:var(--gap);padding:12px 16px;border-bottom:var(--hair);}
.wnw-root .wnw-panel-body{padding:var(--gap-blk);overflow:auto;}
.wnw-root .wnw-panel-foot{display:flex;gap:var(--gap);padding:12px 16px;border-top:var(--hair);}
/* .wnw-out / .wnw-result / .wnw-chip / .wnw-seg 在 _shared/sh-style.js */
.wnw-root .wnw-loading,.wnw-root .wnw-error{padding:28px;text-align:center;color:var(--text-light);}
.wnw-root .wnw-error{color:var(--bad);}
.wnw-root .wnw-input{font:inherit;color:var(--text);background:var(--input-bg);border:1px solid var(--ctl-edge,var(--input-border));
  border-radius:var(--r-btn);padding:4px 8px;min-width:0;}
.wnw-root .wnw-empty{padding:26px;text-align:center;color:var(--text-light);}
/* 小菜单 + 设定摘要浮窗 */
.wnw-root .wnw-menu-mask{position:absolute;inset:0;z-index:55;}
.wnw-root .wnw-menu{position:absolute;display:grid;gap:2px;min-width:158px;padding:5px;background:var(--card-bg);
  border:var(--bw) solid var(--card-border);border-radius:var(--r-panel);}
.wnw-root .wnw-menu button{border:0;background:transparent;text-align:left;padding:5px 9px;border-radius:var(--r-btn);cursor:pointer;}
.wnw-root .wnw-menu button:hover{background:var(--candidate-bg);}
.wnw-root .wnw-menu button.on{background:var(--accent-light);color:var(--accent-text,var(--accent));font-weight:700;}
.wnw-root .wnw-menu i.wnw-menu-sp{display:block;height:1px;background:var(--hair-color);margin:3px 0;}
.wnw-root .wnw-tip{position:absolute;z-index:56;max-width:320px;padding:8px 11px;background:var(--card-bg);
  border:var(--bw) solid var(--loaded-border);border-radius:var(--r-panel);
  line-height:1.6;pointer-events:none;}
.wnw-root .wnw-tip b{display:block;}
.wnw-root .wnw-tip .tp{color:var(--text-light);font-size:.86em;}
.wnw-root .wnw-tip .r{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin-top:5px;font-size:.9em;}
.wnw-root .wnw-tip .k{color:var(--text-light);text-align:right;}
/* 图17 那份时间对照：一整本书的时间能列很长，给它滚轮翻（翻那一步在 TimeHint 里接）。
   不吃鼠标这一条跟着 .wnw-tip 走，不许在这儿改回 auto —— 这一框正压在下一格「结束时间」上。 */
.wnw-root .wnw-time-hint{overflow-y:auto;}
.wnw-root .wnw-rename{flex:1 1 auto;min-width:0;font:inherit;font-size:.92em;padding:1px 5px;border-radius:var(--r-btn);
  border:1px solid var(--accent);background:var(--input-bg);color:var(--text);}
.wnw-root .wnw-warn{position:absolute;left:50%;transform:translateX(-50%);top:8px;z-index:60;background:var(--bad);color:var(--bad-text,#fff);
  border-radius:var(--r-pill,5px);padding:4px 14px;font-size:.85em;}
/* ---------- 书架 ---------- */
.wnw-root .wnw-shelf-wrap{height:100%;overflow:auto;background:var(--page-bg);}
.wnw-root .wnw-shelf{display:flex;flex-direction:column;min-height:100%;}
.wnw-root .wnw-shelf-top{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;flex-wrap:wrap;
  padding:12px 18px;background:var(--page-bg);border-bottom:var(--hair);}
.wnw-root .wnw-shelf-top .ttl{font-size:1.3em;font-weight:800;}
.wnw-root .wnw-shelf-top select,.wnw-root .wnw-shelf-top input{max-width:190px;}
.wnw-root .wnw-shelf-body{padding:20px;flex:1 1 auto;}
.wnw-root .wnw-shelf-h{display:flex;gap:var(--gap);align-items:center;margin:18px 0 12px;color:var(--accent-text,var(--accent));font-weight:800;}
.wnw-root .wnw-shelf-h:first-child{margin-top:0;}
.wnw-root .wnw-books{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));}
.wnw-root .wnw-books.list{grid-template-columns:1fr;gap:12px;}
.wnw-root .wnw-book{position:relative;border:var(--bw) solid transparent;border-radius:var(--r-card);background:var(--candidate-bg);
  padding:14px 12px 10px;min-height:190px;display:flex;flex-direction:column;gap:6px;cursor:pointer;
  transition:transform .12s, box-shadow .12s;}
/* 一眼分出哪本开着、哪本正在写：没挂标签的只给浅底不描边，挂着的描一条，当前这本粗边框挑出来。
   「开着」那一条从前吃 --card-border，质感那一档收 0 宽 + 透明，这个记号当场消失，
   辉光那一档又变成霓虹框 —— 它传达的是状态不是装饰，所以宽度钉死 1px、颜色走 --hair-color，
   四档一个样。「当前这本」的粗边框继续用强调色（那是有意的挑出来，不是分界）。
   两张卡（书架方卡 / 列表长条）的底色交给外观层的表面名单，这里只留「当前」那一档往表面色上再提一层。 */
.wnw-root .wnw-book.open{border:1px solid var(--hair-color);}
.wnw-root .wnw-book.cur{border:2px solid var(--accent);background:var(--face-solid,var(--card-bg));}
/* 选中那一档走 outline：外面那一条 2px 压在书脊（.cov 是绝对定位的子孙）之上，
   换成 inset 的 box-shadow 会被压在它下面看不见；outline 不占布局，也不动 .cur 那条强调色边框。
   用 --text 不用 --accent：强调色已经归「当前这本」了，两档撞色就分不出「开着」和「挑中」。 */
.wnw-root .wnw-book.sel{outline:2px solid var(--text);outline-offset:-2px;}
.wnw-root .wnw-book:hover{transform:translateY(-2px);}
/* 左边那一条书脊跟着封面同一色（同一张卡上钉的那一个 --book-cover），不再自己走一道渐变 */
.wnw-root .wnw-book .cov{position:absolute;left:0;top:0;width:26%;height:100%;border-radius:var(--r-card) 0 0 var(--r-card);
  background:var(--book-cover,var(--accent));opacity:.16;}
.wnw-root .wnw-book .nm{font-weight:800;line-height:1.45;word-break:break-word;}
.wnw-root .wnw-book .meta{margin-top:auto;color:var(--text-light);font-size:.82em;line-height:1.6;}
.wnw-root .wnw-book .bar{height:4px;border-radius:var(--r-pill,5px);background:var(--candidate-bg);overflow:hidden;}
.wnw-root .wnw-book .bar > i{display:block;height:100%;background:var(--accent);}
.wnw-root .wnw-book-row{display:flex;gap:12px;align-items:center;border:var(--bw) solid transparent;border-radius:var(--r-card);
  background:var(--candidate-bg);padding:9px 12px;cursor:pointer;}
.wnw-root .wnw-book-row.open{border:1px solid var(--hair-color);}
.wnw-root .wnw-book-row.cur{border:2px solid var(--accent);background:var(--face-solid,var(--card-bg));}
.wnw-root .wnw-book-row.sel{outline:2px solid var(--text);outline-offset:-2px;}
.wnw-root .wnw-book-row:hover{border-color:var(--accent);}
.wnw-root .wnw-book-row .nm{flex:0 0 220px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-root .wnw-book-row .bar{flex:1 1 auto;}
.wnw-root .wnw-book-row .pct{flex:0 0 auto;font-size:.85em;color:var(--text-light);}
/* ---------- 工作台三栏 ---------- */
.wnw-root .wnw-desk-wrap{height:100%;}
.wnw-root .wnw-desk{display:grid;grid-template-columns:auto var(--wnw-lw,250px) var(--wnw-ld,5px) minmax(0,1fr) var(--wnw-rd,5px) var(--wnw-rw,330px);
  height:100%;min-height:0;gap:0;}
.wnw-root .wnw-rail{display:flex;flex-direction:column;gap:2px;padding:6px 4px;
  border-right:var(--hair);align-items:center;}
.wnw-root .wnw-rail-btn{border:0;background:transparent;color:var(--text-light);cursor:pointer;border-radius:var(--r-card);
  width:44px;height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1;}
.wnw-root .wnw-rail-btn .ic{display:block;font-size:1.02em;}
.wnw-root .wnw-rail-btn .lb{font-size:.76em;white-space:nowrap;}
.wnw-root .wnw-rail-btn:hover{background:var(--candidate-bg);color:var(--text);}
.wnw-root .wnw-rail-btn.on{background:var(--accent-light);color:var(--accent-text,var(--accent));}
.wnw-root .wnw-rail-sp{display:block;flex:1 1 auto;min-height:4px;}
/* 返回书架和图标组之间那一道：浅浅的，不划出第二层框 */
.wnw-root .wnw-rail-div{display:block;flex:0 0 auto;width:30px;height:1px;background:var(--hair-color);margin:3px 0;}
.wnw-root .wnw-div{cursor:col-resize;background:transparent;position:relative;}
.wnw-root .wnw-div::after{content:'';position:absolute;inset:0 2px;background:var(--hair-color);}
.wnw-root .wnw-div:hover::after,.wnw-root .wnw-div.on::after{background:var(--accent);}
.wnw-root .wnw-left,.wnw-root .wnw-right{min-width:0;overflow:hidden;display:flex;flex-direction:column;}
/* 工作台这五块（图标条 / 章纲栏 / 正文栏 / 停靠栏 / 页签条）的底色、纹理全交给外观那一层画：
   卡面掺多少墨、四档外观模式给不给边框和影子、平铺小图都在 src\\_shared\\sh-look.js 的区域那一档里（AREA_CARD / AREA_PAGE 两串名单）。
   这里只留边框和分栏线 —— 那条线吃模式那一档的粗细和颜色，是外观模式的活。
   停靠栏的底色退到页面色、面板自己才是卡片，这条口径由 AREA_PAGE 那份面保住，没跟着翻成卡片色。 */
.wnw-root .wnw-left{border-right:var(--hair);}
.wnw-root .wnw-right{border-left:var(--hair);}
.wnw-root .wnw-mid{min-width:0;overflow:hidden;}
.wnw-root .wnw-phead{display:flex;gap:8px;align-items:center;padding:9px 12px;border-bottom:var(--hair);flex:0 0 auto;}
.wnw-root .wnw-phead b{font-size:.95em;}
/* 停在右栏卡片里的面板壳：标题和按钮都上卡片那一行标题栏了，这一行没塞东西时一点都不占位
   （筛选条、提示行那些是 panelUnder 塞在它后面的兄弟，不受这两条影响） */
.wnw-root .wnw-phead-dock{padding:0;border:0;min-height:0;gap:6px;}
.wnw-root .wnw-phead-dock:empty{display:none;}
/* 从正文挪上标题栏的那几枚：别被那一行的弹性挤扁，跟「常驻」那个站齐 */
.wnw-root .wnw-dock-bar .wnw-dock-op{flex:0 0 auto;}
.wnw-root .wnw-pbody{flex:1 1 auto;min-height:0;overflow:auto;padding:10px 12px;}
/* ---------- 分屏 + 标签 ---------- */
.wnw-root .wnw-split{display:grid;width:100%;height:100%;min-height:0;}
/* Chrome 不认 calc(0.5 * 1fr)：整条声明作废，格子退回单列竖着堆、分隔条被拉成一大块灰。用百分比。 */
.wnw-root .wnw-split.v{grid-template-columns:var(--r,50%) 5px minmax(0,1fr);}
.wnw-root .wnw-split.h{grid-template-rows:var(--r,50%) 5px minmax(0,1fr);}
.wnw-root .wnw-split-cell{min-width:0;min-height:0;overflow:hidden;}
.wnw-root .wnw-sdiv{cursor:col-resize;background:var(--hair-color);}
.wnw-root .wnw-sdiv:hover,.wnw-root .wnw-sdiv.on{background:var(--accent);}
.wnw-root .wnw-split.h > .wnw-sdiv{cursor:row-resize;}
.wnw-root .wnw-pane{display:flex;flex-direction:column;height:100%;min-height:0;position:relative;}
.wnw-root .wnw-strip{display:flex;gap:2px;align-items:center;padding:4px 6px 0;overflow-x:auto;flex:0 0 auto;
  border-bottom:var(--hair);}
.wnw-root .wnw-tabx{display:flex;gap:5px;align-items:center;border:var(--bw) solid var(--card-border);border-bottom:0;
  border-radius:var(--r-card) var(--r-card) 0 0;padding:3px 7px;background:var(--btn-bg);cursor:grab;max-width:190px;flex:0 0 auto;font-size:.9em;}
/* 选中那一片跟正文吃同一块面（外观那一层 AREA_PAGE 名单里的 .wnw-tabx.on）：
   页签要跟下面的正文连成一块，不能页签是自己一块色、正文是卡面那一块。 */
/* 选中那本书的页签靠这条边和旁边分开：它是「状态边界」，边界要 3:1，所以吃外观层现算的那条细边，
   不吃配色里 1.27:1 的旧值（无障碍走查 B-2）。 */
.wnw-root .wnw-tabx.on{border-color:var(--ctl-edge,var(--input-border));font-weight:700;}
.wnw-root .wnw-tabx .tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-root .wnw-tabx .x{border:0;background:transparent;color:var(--text-light);cursor:pointer;padding:0 2px;}
.wnw-root .wnw-tabx .x:hover{color:var(--bad);}
.wnw-root .wnw-tab-add,.wnw-root .wnw-tab-x,.wnw-root .wnw-tab-split{border:0;background:transparent;color:var(--text-light);cursor:pointer;border-radius:var(--r-btn);padding:2px 7px;flex:0 0 auto;}
.wnw-root .wnw-tab-add:hover,.wnw-root .wnw-tab-x:hover,.wnw-root .wnw-tab-split:hover{background:var(--candidate-bg);color:var(--text);}
.wnw-root .wnw-pane-body{flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
.wnw-root .wnw-view{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}
.wnw-root .wnw-drop-here{flex:1 1 auto;display:flex;flex-direction:column;gap:var(--gap);align-items:center;justify-content:center;color:var(--text-light);}
.wnw-root .wnw-drop-here .big{font-size:2.4em;opacity:.5;}
/* 拖放高亮画在 ::before 上：::after 是外观那一层铺平铺小图的位置（整块正文栏在区域名单里），
   占住它的话一拖文件纸纹就没了。z-index:2 压在纹理和内容之上，跟从前一样。 */
.wnw-root .wnw-pane.dropping{outline:3px solid var(--sel-bg);outline-offset:-3px;}
.wnw-root .wnw-pane.dropping::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:2;
  background:var(--sel-bg);opacity:.17;}
/* 高亮区的形状 = 判定形状（四边往里 26%，离哪条边近算哪条），所以四个角是斜的 */
.wnw-root .wnw-pane.dropping.z-t::before{clip-path:polygon(0 0,100% 0,82% 18%,18% 18%);}
.wnw-root .wnw-pane.dropping.z-b::before{clip-path:polygon(18% 82%,82% 82%,100% 100%,0 100%);}
.wnw-root .wnw-pane.dropping.z-l::before{clip-path:polygon(0 0,30% 30%,30% 70%,0 100%);}
.wnw-root .wnw-pane.dropping.z-r::before{clip-path:polygon(70% 30%,100% 0,100% 100%,70% 70%);}
.wnw-root .wnw-pane.dropping.z-c::before{opacity:.07;}
/* 拖放提示条：真元素、箭头走图（.hi 上挂 data-icofix，主进程报来那张当遮罩，颜色吃提示条字色）；
   icons\\ 读不到（本地开发那台服务器）才退回兜底字符。摆在各自判定区的正中间，一眼看见往哪儿拖。 */
.wnw-root .wnw-drop-hint{display:none;position:absolute;pointer-events:none;z-index:4;
  background:var(--sel-bg);color:var(--sel-text);border-radius:var(--r-btn);
  font-size:1em;font-weight:800;letter-spacing:.04em;line-height:32px;height:32px;padding:0 14px;
  white-space:nowrap;text-align:center;box-shadow:var(--sh-float,0 2px 12px rgba(0,0,0,.3));
  align-items:center;justify-content:center;gap:.4em;}
.wnw-root .wnw-pane.dropping .wnw-drop-hint{display:flex;}
.wnw-root .wnw-drop-hint[data-z=t]{top:10px;left:0;right:0;width:max-content;margin:0 auto;}
.wnw-root .wnw-drop-hint[data-z=b]{bottom:10px;left:0;right:0;width:max-content;margin:0 auto;}
.wnw-root .wnw-drop-hint[data-z=l]{left:10px;top:0;bottom:0;margin:auto;}
.wnw-root .wnw-drop-hint[data-z=r]{right:10px;top:0;bottom:0;margin:auto;}
.wnw-root .wnw-drop-hint[data-z=c]{top:0;bottom:0;left:0;right:0;margin:auto;width:max-content;}
.wnw-root .wnw-drop-hint .hi::before{font-size:1em;line-height:1;}
.wnw-root .wnw-drop-hint[data-z=t] .hi::before{content:'▲';}
.wnw-root .wnw-drop-hint[data-z=b] .hi::before{content:'▼';}
.wnw-root .wnw-drop-hint[data-z=l] .hi::before{content:'◀';}
.wnw-root .wnw-drop-hint[data-z=r] .hi::before{content:'▶';}
.wnw-root .wnw-drop-hint[data-z=c] .hi::before{content:'＋';}
.wnw-root .wnw-drop-hint .hi{width:1.15em;height:1.15em;display:inline-block;flex:0 0 auto;}
.wnw-root .wnw-drop-hint .hi[style*="--ico"]{-webkit-mask:var(--ico) no-repeat center/contain;mask:var(--ico) no-repeat center/contain;}
.wnw-root .wnw-drop-hint .hi[style*="--ico"]::before{content:none;}
/* ---------- 右栏停靠 ---------- */
.wnw-root .wnw-dock-head{display:flex;gap:8px;align-items:center;padding:9px 12px;border-bottom:var(--hair);flex:0 0 auto;}
/* 每个面板是一张独立圆角卡，卡之间留间距；原来是通栏白条挨着白条，看着就挤 */
.wnw-root .wnw-dock-list{flex:1 1 auto;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:10px;}
/* 丁-1：卡片可以缩 —— 一栏里排不下时先缩这一张的高，内容在这一格里滚；缩到地板了还排不下，
   就由栏内那条滚动条接住（.wnw-dock-list 本来就 overflow:auto）。
   min-height 这一道地板是给「卡片」的，不是给 body 的（外22 第 9 条「触底=0……果然看不到」当场量出来）：
     · 卡片 min-height:0 + body 无地板（改前）：一栏排 8 张时每张缩到 29 像素，标题栏 34 像素都被剪掉；
     · 地板只写 body（我上一版，写在 body 上）：卡片照旧 29 像素，body 撑到 108 像素但被卡片的 overflow:hidden 剪没 —— 没修好；
     · 地板写在卡片上（这一版）：每张 144 像素、里面看得见 110 像素，排不下的部分交给栏内滚动条（实测 scrollTop 能拉到 922）。
   所以卡片这里给 9em；body 那道 min-height 跟着撤掉，免得留一条不起作用的假闸。 */
.wnw-root .wnw-dock-card{flex:0 1 auto;min-height:9em;display:flex;flex-direction:column;border:var(--bw) solid var(--card-border);border-radius:var(--r-card);background:var(--card-bg);overflow:hidden;}
/* 收着的卡片没有 body，不许跟着一起被挤 —— 标题条不许缩，也不许被上面那道地板撑空 */
.wnw-root .wnw-dock-card.shut{flex:0 0 auto;min-height:0;}
.wnw-root .wnw-dock-bar{flex:0 0 auto;display:flex;gap:6px;align-items:center;padding:8px 10px;cursor:pointer;user-select:none;background:var(--candidate-bg);}
.wnw-root .wnw-dock-bar .tx{font-weight:700;font-size:.92em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-root .wnw-dock-bar .x{border:0;background:transparent;color:var(--text-light);cursor:pointer;padding:1px 4px;border-radius:var(--r-btn);font-size:.8571em;white-space:nowrap;flex:0 0 auto;}
.wnw-root .wnw-dock-bar .x:hover{background:var(--page-bg);color:var(--text);}
.wnw-root .wnw-dock-bar .x.on{color:var(--accent-text,var(--accent));font-weight:800;}
.wnw-root .wnw-dock-body{flex:0 1 auto;min-height:0;padding:10px 12px;max-height:46vh;overflow:auto;}
.wnw-root .wnw-dock-card.shut .wnw-dock-body{display:none;}
/* 第 15 条：面板下边沿那道把手 —— 和章纲卡同款的一条细手，按住上下拖就改这一格的高度 */
.wnw-root .wnw-dock-rz{flex:0 0 auto;display:block;height:9px;cursor:ns-resize;position:relative;background:transparent;}
.wnw-root .wnw-dock-rz::after{content:'';position:absolute;left:50%;top:3px;transform:translateX(-50%);width:46px;height:3px;
  border-radius:var(--r-pill,5px);background:var(--hair-color);}
.wnw-root .wnw-dock-rz:hover::after,.wnw-root .wnw-dock-rz.on::after{background:var(--accent);}
.wnw-root .wnw-dock-card.shut .wnw-dock-rz{display:none;}
/* 标题条上这几个是「能点的操作」，得看着像按钮：细描边一个，选中换淡底 */
.wnw-root .wnw-dock-bar .b{border:1px solid var(--ctl-edge,var(--input-border));background:transparent;color:var(--text-light);
  cursor:pointer;padding:1px 7px;border-radius:var(--r-btn);font-size:.8571em;white-space:nowrap;flex:0 0 auto;}
.wnw-root .wnw-dock-bar .b:hover{color:var(--text);border-color:var(--text-light);}
.wnw-root .wnw-dock-bar .b.on{background:var(--accent-light);border-color:var(--accent);color:var(--accent-text,var(--accent));font-weight:700;}
/* ---------- 多选那几张列表：只关浏览器原生的文字选区 ----------
   书架 / 卡片 / 灵感 / 卡片池 / 章节 / 看板这些条目的选中态一律是自己画的（.sel 那一档，
   长什么样归主人点过名，这里一个字不动）；蓝底那一片是浏览器的选区，不是「挑中了这批」。
   关只关列表这一层：里头真能打字的地方照旧可选可复制 —— 找卡找书那一栏、快捕那一格、
   正文和备注那些格子都得留着选字和复制。 */
.wnw-root .wnw-nosel{user-select:none;}
.wnw-root .wnw-nosel input,.wnw-root .wnw-nosel textarea,.wnw-root .wnw-nosel select,
.wnw-root .wnw-nosel [contenteditable]{user-select:text;}
/* ---------- 通用小件 ---------- */
.wnw-root .wnw-pick{display:grid;gap:8px;min-width:min(620px,90%);}
.wnw-root .wnw-pick-h{color:var(--accent-text,var(--accent));font-weight:800;margin-top:8px;font-size:.92em;}
.wnw-root .wnw-pick-row{display:flex;gap:6px;flex-wrap:wrap;}
/* 一行一项：打开那个 + 隐藏 / 删除两个小钮，贴着排 */
.wnw-root .wnw-pick-item{display:inline-flex;gap:2px;align-items:center;}
/* 最近打开那一枚后头的 ×：鼠标停上去才露脸（灵感那一条 .wnw-insp .x 就是这个画法），平时不占眼神 */
.wnw-root .wnw-pick-item .x{border:0;background:transparent;color:var(--text-light);cursor:pointer;
  padding:0 3px;border-radius:var(--r-pill,5px);opacity:0;}
.wnw-root .wnw-pick-item:hover .x{opacity:1;}
.wnw-root .wnw-item{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 4px;border-bottom:var(--hair);cursor:pointer;}
.wnw-root .wnw-item .ttl{font-weight:600;} .wnw-root .wnw-item .snip{flex:1 0 100%;color:var(--text-light);font-size:.85em;}
.wnw-root .wnw-grid-pick{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap);min-width:min(430px,86%);}
/* 滚动条原来吃视口那一层，现在收进容器：容器自己那条和里头各块那条一起给 */
.wnw-root::-webkit-scrollbar,.wnw-root *::-webkit-scrollbar{width:10px;height:10px;}
.wnw-root::-webkit-scrollbar-thumb,.wnw-root *::-webkit-scrollbar-thumb{background:var(--scrollbar,#c4c9d3);border-radius:var(--r-pill,5px);}
`;

/* ============================================================
   容器这一层：为写那套代码往后只认这一个节点
   ----------
   宿主递一个普通元素进来，这套代码就在它里面现搭骨架、现贴皮肤、现接监听。
   所有「从前打在整张页上」的东西都从这两个口子过一遍，卸载时照单摘。
   ============================================================ */
let WNW_HOST = null;
/* 还没挂上容器时的退路：皮肤和浮层这些要落地的地方（start 之前哪来的容器，就当没有） */
function wnwRoot(){ return WNW_HOST; }
/* 皮肤分两拨：装配期各段自带的那几块先攒着，等容器就位那一刻一次性贴进去。
   拼进宿主页面之后，代码求值和容器就位中间隔着不知道多久，不能再往文档头上贴。 */
const WNW_CSS = [];
const WNW_ON = [];
function wnwOn(target, type, fn, opt){
  if(!target) return null;
  target.addEventListener(type, fn, opt);
  WNW_ON.push([target, type, fn, opt]);
  return fn;
}
function wnwOffAll(){
  for(const it of WNW_ON.splice(0)){
    try{ it[0].removeEventListener(it[1], it[2], it[3]); }catch(e){}
  }
}
/* ---------- 多选这一档：Ctrl+A 归哪一张列表（外15 第 6、8、9 条共用）----------
   中栏一格 + 右栏几块停靠可以同时摆着卡片、灵感、章节、看板好几张列表，
   键盘上没有「焦点在这一张」这件事（点列表不改焦点），所以自己记一笔：
   指针在哪一张列表里按下过，Ctrl+A 就归它；那张被关掉了就没人接（回到 null），
   不许「找不到主人就每张都全选一遍」—— 那是一下子选中四屏没在看的条目。 */
let pickOwner = null;
function pickTake(el){ pickOwner = el; }
/* 列表按下这两下（单击选中、右键出菜单）都算「这一张归我管」，指针事件最靠得住 */
function pickBind(el){
  if(!el) return el;
  /* 这一层顺手关掉浏览器原生的文字选择：这套选中全是我们自己画的（单击、Ctrl 点选、Shift 连选），
     浏览器那一份选区只会添乱 —— Shift 点下去、按住拖过几行，就拖出一片蓝底，
     看着像挑中了一批其实没有。打在容器上比在每一处 click 里 preventDefault 收口得干净，
     里头真能打字的那几样（输入框、找卡找书那一栏、正文格）由皮肤那句 .wnw-nosel 放回去。 */
  el.classList.add('wnw-nosel');
  /* 这两枚走 addEventListener，不走上面那个 wnwOn：wnwOn 是把账记进全局 WNW_ON、只在整副骨架拆掉
     （wnwStop → wnwStart）那一刻才清，而这里递进来的 el 是「每重画一次就换一只」的列表容器 ——
     记账的话每刷一次就多攒两枚没人认领的，旧容器还被那本账拽着释放不掉，正是「每改一回代码多攒一份常驻订阅」那一类。
     容器离开页面，它身上的监听跟着一起没了，本来就不需要谁来摘；
     pickAsk() 那一头已经会认 `isConnected`，容器不在了就当没人接。 */
  el.addEventListener('pointerdown', () => pickTake(el));
  el.addEventListener('contextmenu', () => pickTake(el));
  return el;
}
/* 起点落在能打字的那一块里、往外拖的那一趟（外26 第 3 条）：上面那层 .wnw-nosel 只管得住「从非编辑区起头拖」，
   从正文段里起手往外拖，浏览器一路把目录、卡片头选成一片蓝。
   Chromium 不认 user-select:contain（实测：写进去的原样是空、计算值退回 auto），所以自己在拖的那一趟里把选区夹回这一块 ——
   尾巴跑出去收到块尾，头跑出去收到块头，两块都不在这一块里就收成一个点。 */
function wnwBindSelFence(){
  let 块 = null;
  const 夹 = () => {
    if(!块) return;
    const s = window.getSelection();
    if(!s || !s.rangeCount) return;
    const r = s.getRangeAt(0);
    const 头 = 块.contains(r.startContainer), 尾 = 块.contains(r.endContainer);
    if(头 && 尾) return;
    const rr = r.cloneRange();
    if(头) rr.setEnd(块, 块.childNodes.length);
    else if(尾) rr.setStart(块, 0);
    else { rr.selectNodeContents(块); rr.collapse(false); }
    s.removeAllRanges(); s.addRange(rr);
  };
  const 收 = () => { 夹(); window.removeEventListener('mousemove', 夹); window.removeEventListener('mouseup', 收); 块 = null; };
  wnwOn(document, 'mousedown', ev => {
    if(块) return;
    const t = ev.target;
    块 = (t && t.closest) ? t.closest('[contenteditable="true"]') : null;
    if(!块) return;
    window.addEventListener('mousemove', 夹);
    window.addEventListener('mouseup', 收);
  });
}
/* 键盘这一趟该叫谁：认得的主人还挂在页面上就叫它，已经不在了就当没人 */
function pickAsk(){
  if(pickOwner && pickOwner.isConnected) return pickOwner;
  pickOwner = null;
  return null;
}
/* 量容器而不是量视口：挂在宿主封面上的时候，「窗口多大」和「这一格多大」不是一回事 */
function wnwBox(){
  const n = WNW_HOST;
  return n ? { w:n.clientWidth || innerWidth, h:n.clientHeight || innerHeight } : { w:innerWidth, h:innerHeight };
}
/* 视口坐标 → 容器内坐标：浮层、小菜单、摘要浮窗从前都按 fixed 摆，现在按 absolute 摆在容器里 */
function wnwLocal(x, y){
  const n = WNW_HOST;
  if(!n) return { x, y };
  const r = n.getBoundingClientRect();
  return { x:x - r.left, y:y - r.top };
}
