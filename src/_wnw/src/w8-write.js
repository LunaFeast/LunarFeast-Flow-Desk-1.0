/* ============================================================
   WNW 写作 v0.4
   章 = 一个文档标签：章纲卡片（正文内，不外拖） + 正文
   正文一段一个 contenteditable，痕迹 / 批注 / 高亮直接标在字上
   写作模式只有正文，笔记模式全格式 + markdown；右栏收批注与痕迹
   ============================================================ */
addCss(`
/* 段 = 背景板（在下，画高亮与痕迹） + textarea（在上，输入法直接打在这里） */
.wnw-blk{display:flex;gap:8px;align-items:flex-start;position:relative;}
.wnw-gut{flex:0 0 2.6em;text-align:right;color:var(--text-light);font-size:.78em;padding-top:.62em;
  cursor:pointer;user-select:none;line-height:1.4;}
.wnw-gut:hover{color:var(--accent-text,var(--accent));}
.wnw-cb{border:0;background:transparent;cursor:pointer;color:var(--text-light);font-size:1.05em;padding:0;line-height:1;margin-top:.55em;}
.wnw-cb.done{color:var(--ok);}
.wnw-pt{position:relative;flex:1 1 auto;min-width:0;}
.wnw-hl,.wnw-ta{width:100%;line-height:1.9;padding:2px 4px;border:0;}
.wnw-hl{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;color:var(--text);
  white-space:pre-wrap;word-break:break-word;}
.wnw-ta{position:relative;z-index:1;display:block;background:transparent;color:transparent;caret-color:transparent;
  resize:none;overflow:hidden;min-height:1.9em;white-space:pre-wrap;word-break:break-word;}
/* 选区必须半透明：textarea 那层压在高亮层上面，实心色会把底下那行字整个盖没，
   看上去就像「一选中字就没了」；--sel-bg 掺三成到底色上，两边都看得见 */
.wnw-ta::selection{background:color-mix(in srgb, var(--sel-bg, var(--accent)) 34%, transparent);}
.wnw-ta::placeholder{color:var(--text-light);}
.wnw-blk.comp .wnw-ta{color:var(--text);}
.wnw-blk.comp .wnw-hl{opacity:0;}
.wnw-blk.focus .wnw-pt::after{content:'';position:absolute;inset:-1px;border-radius:var(--r-btn);pointer-events:none;
  box-shadow:0 0 0 1px var(--loaded-border);}
.wnw-blk.k-p .wnw-ta,.wnw-blk.k-p .wnw-hl{text-indent:2em;}
.wnw-blk.noind .wnw-ta,.wnw-blk.noind .wnw-hl{text-indent:0;}
.wnw-blk.k-h1 .wnw-ta,.wnw-blk.k-h1 .wnw-hl{font-size:1.5em;font-weight:800;line-height:1.6;}
.wnw-blk.k-h2 .wnw-ta,.wnw-blk.k-h2 .wnw-hl{font-size:1.29em;font-weight:800;line-height:1.6;}
.wnw-blk.k-h3 .wnw-ta,.wnw-blk.k-h3 .wnw-hl{font-size:1.14em;font-weight:700;line-height:1.7;}
.wnw-blk.k-h4 .wnw-ta,.wnw-blk.k-h4 .wnw-hl{font-size:1.05em;font-weight:700;}
.wnw-blk.k-h5 .wnw-ta,.wnw-blk.k-h5 .wnw-hl{font-weight:700;}
.wnw-blk.k-h6 .wnw-ta,.wnw-blk.k-h6 .wnw-hl{color:var(--text-light);font-weight:700;}
.wnw-blk.k-todo.done .wnw-hl{text-decoration:line-through;color:var(--text-light);}
.wnw-blk.md .wnw-ta,.wnw-blk.md .wnw-hl{font-family:var(--ff-code,ui-monospace,Consolas,monospace);}
.wnw-blk.md .wnw-ta,.wnw-blk.md .wnw-hl{text-indent:0;}
.wnw-blk.md.k-h1 .wnw-ta,.wnw-blk.md.k-h1 .wnw-hl,.wnw-blk.md.k-h2 .wnw-ta,.wnw-blk.md.k-h2 .wnw-hl,
.wnw-blk.md.k-h3 .wnw-ta,.wnw-blk.md.k-h3 .wnw-hl,.wnw-blk.md.k-h4 .wnw-ta,.wnw-blk.md.k-h4 .wnw-hl,
.wnw-blk.md.k-h5 .wnw-ta,.wnw-blk.md.k-h5 .wnw-hl,.wnw-blk.md.k-h6 .wnw-ta,.wnw-blk.md.k-h6 .wnw-hl{font-weight:400;font-size:1em;color:var(--text);}
/* 正文单层：一段一个 contenteditable，字就是能选能改的真字，痕迹 / 批注 / 高亮直接标在字上 */
.wnw-ce{flex:1 1 auto;min-width:0;line-height:1.9;padding:2px 4px;border:0;outline:0;min-height:1.9em;
  white-space:pre-wrap;word-break:break-word;caret-color:transparent;}
/* 段落聚焦的长相五项全走 CSS 变量（--fc-*），值由 FocusLook 写在 html 根上；
   没自定的那项留空，变量取不到值就落到这里写的默认。
   出厂默认是「不描边、不填底」（--fc-bw 兜 0）：从前兜的是 1px 一圈，他驳回的是这一手 ——
   「让你聚焦没让你隔离」，一段被画个框摆在那儿就成了隔离。要框的人自己在 设置 · 外观 那一排拉回来（那一档 0~6 都给拉）。 */
.wnw-ce:focus,.wnw-fc-pv{outline:var(--fc-bw,0) solid var(--fc-bd,var(--loaded-border));
  outline-offset:calc(0px - var(--fc-bw,1px));border-radius:var(--fc-r,var(--r-btn));
  background:var(--fc-bg,transparent);color:var(--fc-text,inherit);}
.wnw-ce:empty::before{content:attr(data-ph);color:var(--text-light);}
.wnw-blk.k-p > .wnw-ce{text-indent:2em;}
.wnw-blk.noind > .wnw-ce{text-indent:0;}
.wnw-blk.k-h1 > .wnw-ce{font-size:1.5em;font-weight:800;line-height:1.6;}
.wnw-blk.k-h2 > .wnw-ce{font-size:1.29em;font-weight:800;line-height:1.6;}
.wnw-blk.k-h3 > .wnw-ce{font-size:1.14em;font-weight:700;line-height:1.7;}
.wnw-blk.k-h4 > .wnw-ce{font-size:1.05em;font-weight:700;}
.wnw-blk.k-h5 > .wnw-ce{font-weight:700;}
.wnw-blk.k-h6 > .wnw-ce{color:var(--text-light);font-weight:700;}
.wnw-blk.k-todo.done > .wnw-ce{text-decoration:line-through;color:var(--text-light);}
/* 段首空两格对差（外13-G）：这条 md 规则原先顺手把 text-indent:0 也写死，
   笔记/富文本模式（.md 块）就吃不到上面 .k-p 的 2em——版式面板的"段首空两格"
   只在写作模式生效，差的就是这一处。md 源文本里的普通段（mdOf 对 k-p 不加行首记号）
   该照版式缩进；列表/标题/引用那类本就轮不到 .k-p 这条 2em，去掉这行不影响它们。
   要关缩进走版式面板（root 级 wnw-noind，见下方版式规则），不在这里越权。 */
.wnw-blk.md > .wnw-ce{font-family:var(--ff-code,ui-monospace,Consolas,monospace);font-weight:400;font-size:1em;color:var(--text);}
/* 列表层级：--的 / ---的 数短横个数，行首缩进也算一档，整块往右走 */
.wnw-blk.lv2{margin-left:2em;} .wnw-blk.lv3{margin-left:4em;} .wnw-blk.lv4{margin-left:6em;}
.wnw-blk.lv5{margin-left:8em;} .wnw-blk.lv6{margin-left:10em;}
/* 高亮吃的是全局那一串标记色（外13-N）：第 N 档取 --mark-N，宿主还没钉上（或这一串还没定过）
   就退回配色里那一档强调位 --slot-*，两头的取值写法一模一样，所以哪一帧都不会是空色。
   一次铺满 20 档（标记色最多 20 个）；从前只有 1~5 五条，是因为那时只有配色那五个强调位。
   选择器中间那一格空格是命门：hl-N 只写在正文里那些字上，wnw-root 只写在容器上（全仓一处），
   写成 .wnw-root.hl-N 要的是同一个元素同时带这两个名字，永远配不上 —— 外14 给这一串加 .wnw-root
   前缀的时候漏了中间那格空格（下面 修订痕迹那三条同一轮改的，那三条有空格、一直好好的），
   从那一轮起凡是没自己定过外观的高亮（设定卡名、内置那几条）都只剩一个空 class，看着就是不上色。 */
${Array.from({ length:20 }, (x, i) => `.wnw-root .hl-${i + 1}{color:var(--mark-${i + 1}, var(--slot-${(i % 5) + 1}));}`).join('')}
/* 高亮外观对话框：一行预览 + 四页 + 圆形色块。
   预览格和章纲卡片一起进外观层的表面名单（src\_shared\sh-look.js 的 SURF），底色归那一层画；
   圆形色块是输入框（input type=color），不在这份页面的描边名单里，所以宽度钉死 1px 走 --ctl-edge，
   免得质感那一档 --bw 是 0 的时候连一个选色的圆都看不见。 */
.wnw-hl-pv{border:var(--bw) solid var(--card-border);border-radius:var(--r-card);padding:14px 10px;text-align:center;}
.wnw-hl-page{display:flex;flex-direction:column;gap:8px;}
.wnw-hl-col{width:26px;height:26px;padding:0;border:1px solid var(--ctl-edge,var(--input-border));border-radius:50%;
  background:transparent;cursor:pointer;flex:0 0 auto;}
/* 选色那个圆的里面原本是一方块实色顶着圆边框（第 13 条）：圆是套在外壳上的，
   浏览器给色块自己留的那圈内边距和细边框还在，就把外壳裁成圆、里面仍摆着一张方片。
   这两条把色块自己铺满整个圆、去掉它那圈边 —— 现在整个圆就是那个颜色。 */
.wnw-hl-col::-webkit-color-swatch-wrapper{padding:0;border:0;}
.wnw-hl-col::-webkit-color-swatch{border:0;border-radius:50%;}
.wnw-hl-col::-moz-color-swatch{border:0;border-radius:50%;}
/* 线条样式的图示（边框 / 下划线 那两页的「样式」）：一条 26×10 的小线，五种都画得出来 */
.wnw-linebtns button{display:inline-flex;align-items:center;gap:5px;}
.wnw-hl-line{display:block;flex:0 0 auto;}
/* 修订痕迹和批注突出这三条都挂在内联的 span 上（paint 交回 <span class="rv-ins"> / <span class="anno-on">），
   写成一头的 .wnw-root.rv-ins 就一辈子配不上 —— 得是「在 .wnw-root 里头」那一档。 */
.wnw-root .rv-ins{color:var(--ok);text-decoration:underline;text-decoration-color:var(--ok);}
.wnw-root .rv-del{color:var(--bad);text-decoration:line-through;}
.wnw-root .rv-fmt{outline:1px dashed var(--mark-5, var(--slot-5));outline-offset:-1px;}
.wnw-root .anno-on{border-bottom:1px solid var(--accent);background:color-mix(in srgb, var(--accent) 14%, transparent);}
/* 图11：批注的原文从前只有一条下边线，一眼看不出来哪几个字是被批的那一句。
   再加一层底色（跟批注栏那条竖边同一个色位），底色 + 线两条一起，不改字号也不动行高。 */
.wnw-mirror{position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-break:break-word;}
/* 闪烁光标：竖条自己画（原生 caret 收掉了，见 WCaret）——
   Windows 把「光标闪烁频率」关掉时原生 caret 一动不动，自己画这条才能一直闪 */
.wnw-caret{position:fixed;z-index:70;display:none;width:2px;margin-left:-1px;border-radius:var(--r-pill,5px);
  background:var(--accent);pointer-events:none;}
.wnw-caret.on{display:block;}
.wnw-caret.blink{animation:wnw-caret 1.06s steps(1,end) infinite;}
@keyframes wnw-caret{0%,55%{opacity:1}55.01%,100%{opacity:0}}
/* 章纲卡片：这张卡进外观层的表面名单，底色和影子归那一层画，这里只留外框和圆角 */
.wnw-olcard{border:var(--bw) solid var(--card-border);border-radius:var(--r-card);
  margin-bottom:20px;overflow:hidden;display:flex;flex-direction:column;}
.wnw-olcard > .hd{display:flex;gap:8px;align-items:center;padding:7px 12px;cursor:pointer;user-select:none;}
.wnw-olcard > .hd b{font-size:.9em;}
/* 卡身不再自己铺一层底：这张卡的底色由外观层那一层画一遍，卡身跟着用同一块面，
   卡头和卡身中间那道 --hair 分界就够分出两层。从前这里写死 --card-bg —— 那是配色里那张
   没掺过墨的原卡，卡头一块、卡身另一块，看着就是两层色。 */
/* 卡身这一档的下限是一行：1.9 倍行距加上下 2px 内边，就是 .wnw-ce 一行的高度。
   从前这里是 min-height:0，卡被拖矮（或旧数据里那份矮值）时整行文字被 overflow 夹没 ——
   外13-D 要的是「最小一行」：再矮也不许比一行矮，也不许夹字。上面 buildOl 里那条当场量的
   min-height 是同一件事的另一半（算进卡头和把手），这一条保证首屏那一帧就不塌。 */
.wnw-olcard > .bd{padding:8px 12px 12px;border-top:var(--hair);
  flex:1 1 auto;min-height:calc(1.9em + 4px);overflow:auto;}
.wnw-olcard.shut > .bd{display:none;}
/* 底边把手：按住上下拖调这张卡的高度，高度按章记在 c.olH，超出的部分卡内滚动 */
.wnw-olrz{flex:0 0 auto;height:9px;cursor:ns-resize;position:relative;background:transparent;}
.wnw-olrz::after{content:'';position:absolute;left:50%;top:3px;transform:translateX(-50%);width:46px;height:3px;
  border-radius:var(--r-pill,5px);background:var(--hair-color);}
.wnw-olrz:hover::after,.wnw-olrz.on::after{background:var(--accent);}
.wnw-olcard.shut > .wnw-olrz{display:none;}
/* 文档壳 */
.wnw-doc-wrap{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}
/* 顶上这一条的底色走外观那一层的区域档（卡片面：跟着卡片那一块面走，四档外观模式都不脱开），这里只画分界线 */
.wnw-doc-top{flex:0 0 auto;display:flex;flex-direction:column;gap:10px;padding:10px 16px;border-bottom:var(--hair);}
.wnw-doc-name{display:flex;gap:10px;align-items:center;}
.wnw-doc-name > .wnw-hint{flex:0 0 auto;white-space:nowrap;}
.wnw-doc-name input{font-weight:800;font-size:1.05em;flex:0 1 260px;min-width:80px;}
.wnw-tools,.wnw-fmt{display:flex;gap:6px;align-items:center;}
.wnw-tools{flex-wrap:wrap;}
/* 版式那一行：装不下就换行接着摆，不出横向滚动条 —— 滚起来看不见后面那半排，等于没有 */
.wnw-fmt{flex-wrap:wrap;row-gap:2px;gap:2px;padding-bottom:3px;}
.wnw-tools button,.wnw-fmt button{border:0;background:transparent;color:var(--text-light);cursor:pointer;border-radius:var(--r-btn);
  min-width:26px;height:24px;padding:0 5px;font-size:.92em;display:inline-flex;align-items:center;justify-content:center;gap:4px;}
.wnw-tools button:hover,.wnw-fmt button:hover{background:var(--candidate-bg);color:var(--text);}
.wnw-tools button.on,.wnw-fmt button.on{background:var(--accent-light);color:var(--accent-text,var(--accent));font-weight:700;}
.wnw-tools i.sp,.wnw-fmt i.sp{width:1px;height:16px;background:var(--hair-color);margin:0 4px;flex:0 0 auto;}
.wnw-fmt .g{display:flex;gap:2px;align-items:center;flex:0 0 auto;}
.wnw-fmt .mk{flex:0 0 auto;padding:0 3px;color:var(--text-light);font-size:.9em;display:inline-flex;align-items:center;}
.wnw-fmt select{flex:0 0 auto;width:auto;min-width:56px;height:24px;padding:0 4px;font-size:.86em;}
.wnw-fmt input{flex:0 0 auto;width:58px;height:24px;padding:0 4px;font-size:.86em;}
/* 查找结果：条目一长串，框子自己滚 */
.wnw-find-res{max-height:46vh;overflow:auto;display:flex;flex-direction:column;}
/* 中响应的询问条：出现一次问一次，答过就记在卡上 */
.wnw-midask{display:flex;flex-direction:column;gap:6px;}
.wnw-midq{display:flex;gap:8px;align-items:center;border:var(--bw) solid var(--card-border);
  border-radius:var(--r-card);padding:5px 9px;font-size:.92em;}
.wnw-doc{flex:1 1 auto;min-height:0;overflow:auto;padding:20px 32px;}
.wnw-doc-inner{max-width:var(--doc-w, 820px);margin:0 auto;}
/* 章纲卡片和正文同一栏宽、同一居中：只有宽度约束，不跟正文字号字体，卡片自己那套字号照旧 */
.wnw-colw{max-width:var(--doc-w, 820px);margin:0 auto;}
/* 版式：排版面板调的就是这几个变量 + 三个 body 类。只认 .wnw-body（正文编辑器），章纲和预览不跟着变 */
.wnw-body .wnw-ce{line-height:var(--lh, 1.9);min-height:calc(var(--lh, 1.9) * 1em);}
.wnw-body .wnw-blk{margin-bottom:calc(var(--pgap, 0px) + var(--blank, 0px));}
.wnw-root.wnw-ju .wnw-body .wnw-ce{text-align:justify;}
.wnw-root.wnw-ct .wnw-body .wnw-ce{text-align:center;}
.wnw-root.wnw-rt .wnw-body .wnw-ce{text-align:right;}
/* 居中 / 右对齐时首行缩进会把整行推偏，这两档下缩进让位 */
.wnw-root.wnw-ct .wnw-body .wnw-blk.k-p > .wnw-ce,.wnw-root.wnw-rt .wnw-body .wnw-blk.k-p > .wnw-ce{text-indent:0;}
.wnw-root.wnw-noind .wnw-body .wnw-blk.k-p > .wnw-ce{text-indent:0;}
.wnw-root.wnw-noblank .wnw-body .wnw-blk.void > .wnw-ce{min-height:0;line-height:1;padding-top:0;padding-bottom:0;}
.wnw-doc-foot{flex:0 0 auto;display:flex;gap:12px;align-items:center;padding:6px 16px;border-top:var(--hair);
  font-size:.85em;color:var(--text-light);}
/* 正文 + 右侧批注/痕迹栏：都在编辑区内。
   侧栏永远待在正文右边，不许折到正文下面 —— 折下去那一横条把正文顶老长，读一行滚半天。
   窄到放不下是外壳的分栏底线拦住的（见 w3-shell 的 MID_MIN），不在这里靠换行兜。 */
.wnw-flow{display:flex;flex-wrap:nowrap;gap:16px;align-items:flex-start;position:relative;}
/* 图11：批注原文 ↔ 栏里那一条之间的连线。整张 svg 铺在这一层上，只画线不接鼠标（pointer-events:none），
   坐标两头都按这一层的矩形折算，所以正文滚到哪、窗口多大都不用另算滚动量。 */
.wnw-link{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;color:var(--accent);}
.wnw-link path{fill:none;stroke:currentColor;stroke-width:1;opacity:.6;}
.wnw-flow > .wnw-ed-col{flex:1 1 320px;min-width:0;}
.wnw-side{flex:0 1 232px;min-width:200px;position:sticky;top:0;max-height:calc(100vh - 190px);overflow:auto;
  display:flex;flex-direction:column;gap:10px;}
.wnw-side .hd{display:flex;gap:8px;align-items:center;font-size:.85em;color:var(--text-light);}
/* 右栏收起后留下的竖边条 */
.wnw-side-tab{flex:0 0 auto;align-self:stretch;width:24px;border:1px solid var(--ctl-edge,var(--input-border));border-radius:var(--r-card);
  background:var(--candidate-bg);color:var(--text-light);cursor:pointer;padding:8px 0;font-size:.82em;}
.wnw-side-tab span{writing-mode:vertical-rl;letter-spacing:.12em;}
.wnw-side-tab:hover{color:var(--accent-text,var(--accent));background:var(--accent-light);}
/* 批注与修订痕迹那两条：底色交给外观层的表面名单，左边这一条竖线是它的分类记号 */
.wnw-note{border-left:3px solid var(--accent);border-radius:0 var(--r-card) var(--r-card) 0;padding:9px 11px;font-size:.9em;line-height:1.7;}
.wnw-note .q{color:var(--text-light);font-size:.88em;margin-bottom:3px;}
.wnw-note .x{border:0;background:transparent;color:var(--text-light);cursor:pointer;padding:0 2px;float:right;}
.wnw-note .x:hover{color:var(--bad);}
.wnw-note.k-ins{border-left-color:var(--ok);}
.wnw-note.k-del{border-left-color:var(--bad);}
.wnw-note.k-fmt{border-left-color:var(--mark-5, var(--slot-5));}
/* 图10：批注就在栏里这一格写。草稿那一张只比写好的多一层浅底，不再套第二层框 */
.wnw-note.draft{background:var(--candidate-bg);}
.wnw-anno-in{display:block;width:100%;box-sizing:border-box;min-height:62px;resize:vertical;line-height:1.7;font-family:inherit;}
/* 左侧章节面板 */
.wnw-tree{flex:1 1 auto;min-height:0;overflow:auto;}
.wnw-vol,.wnw-ch{display:flex;gap:3px;align-items:center;padding:5px 6px;margin:1px 4px;border-radius:var(--r-card);font-size:.92em;}
.wnw-vol{margin-top:6px;background:var(--candidate-bg);}
.wnw-vol .tri{cursor:pointer;width:1.1em;color:var(--text-light);flex:0 0 auto;}
.wnw-vol .ttl,.wnw-ch .ttl{flex:0 1 auto;min-width:1em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-ch{padding-left:18px;cursor:pointer;}
.wnw-ch:hover{background:var(--candidate-bg);}
.wnw-ch.on{background:var(--accent-light);color:var(--accent-text,var(--accent));font-weight:700;}
/* 挑中那一档（外15 第 6 条）：从前这一行只有「正在看的这一章」（.on 吃强调色底）一档，
   没有「挑中」这一档 —— 一次只能指着一章，删两章就得删两回。现在能一把挑中好几章，就得多一层描边。
   取值和书架、看板那两处一句不差：outline 不占布局，行高、章名那 18px 缩进一点不动
   （换成 border 每一行都要胖两像素，整列会跟着抖）。
   用 --text 不用 --accent：强调色在这一列已经归「正在看的这一章」（.on）和悬停那层底，
   两档撞色就分不出「开着」和「挑中」。 */
.wnw-vol.sel,.wnw-ch.sel{outline:2px solid var(--text);outline-offset:-2px;}
/* 行尾那串数（外25 第 3 条）：整列贴右、只写数字。tabular-nums 让每一位占一样宽，
   1234 和 12345 上下对齐，一路扫下来能比大小，不会因为字宽抖。 */
.wnw-ch .cnt,.wnw-vol .cnt{font-size:.82em;color:var(--text-light);flex:0 0 auto;margin-left:auto;
  text-align:right;min-width:3.6em;font-variant-numeric:tabular-nums;}
/* 模式那一小张图（外25 第 8 条）：占位固定，章名不会因为有没有图而左右挪 */
.wnw-ch .wnw-mode{flex:0 0 auto;width:1.3em;display:inline-flex;align-items:center;justify-content:center;
  color:var(--text-light);opacity:.72;}
.wnw-ch.on .wnw-mode{opacity:1;}
/* 拖行换顺序（外25 第 4 条）：抓着的那一行淡下去，落点画一条插入线。
   从前 .dnd-tgt 只有一条"上线"，落在下半时线画在挨着的那一行的上沿，看着像插到它前面 —— 这里按 data-dnpos 分开。 */
.wnw-root .wnw-tree .dnd-tgt[data-dnpos="after"]{box-shadow:inset 0 -2px 0 0 var(--accent);background:var(--candidate-bg);}
.wnw-root .wnw-tree .dnd-tgt[data-dnpos="in"]{box-shadow:inset 0 0 0 1px var(--accent);}
.wnw-vol input[type=checkbox]{flex:0 0 auto;margin:0;cursor:pointer;}
.wnw-ch .sub{font-size:.78em;color:var(--text-light);flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-vol button.mini,.wnw-ch button.mini{border:0;background:transparent;color:var(--text-light);cursor:pointer;
  padding:0 3px;font-size:.92em;opacity:0;transition:opacity .15s;flex:0 0 auto;}
.wnw-vol:hover button.mini,.wnw-ch:hover button.mini{opacity:1;}
.wnw-bookhead{display:flex;gap:6px;align-items:center;padding:4px 2px;}
.wnw-bookhead .ttl{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800;}
.wnw-bookhead button{border:0;background:transparent;color:var(--text-light);cursor:pointer;padding:0 3px;}
.wnw-subtabs{display:flex;gap:4px;padding:6px 8px 0;}
.wnw-subtabs button{flex:1;border:0;background:transparent;color:var(--text-light);cursor:pointer;padding:4px 0;
  border-bottom:2px solid transparent;font-size:.9em;}
.wnw-subtabs button.on{color:var(--accent-text,var(--accent));border-color:var(--accent);font-weight:700;}
/* 卡片 / 属性 */
.wnw-card-list{display:flex;flex-direction:column;gap:4px;}
.wnw-card-row{display:flex;gap:8px;align-items:center;padding:7px 9px;border-radius:var(--r-card);cursor:pointer;
  border:var(--bw) solid transparent;}
.wnw-card-row:hover{background:var(--candidate-bg);}
.wnw-card-row.on{background:var(--accent-light);border-color:var(--loaded-border);}
.wnw-card-row .dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:var(--mark-1, var(--slot-1));}
.wnw-card-row .nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wnw-card-row .tp{font-size:.78em;color:var(--text-light);flex:0 0 auto;}
.wnw-f{display:grid;grid-template-columns:8.5em 1fr;gap:6px;align-items:start;padding:4px 0;}
.wnw-f > .fn{color:var(--text-light);font-size:.88em;text-align:right;padding-top:4px;}
.wnw-f .txt{width:100%;min-height:1.6em;border:var(--bw) solid transparent;border-radius:var(--r-card);padding:4px 8px;background:var(--input-bg);line-height:1.7;}
/* 悬停改边框色那一条 2026-10-04 撤了：这类输入框的空闲描边已经归外观层那处 1px --ctl-edge
   （一直看得见），再往 hover 上挂一条更淡的 --input-border 等于鼠标一放上去边框就褪色。 */
.wnw-f .txt:focus{border-color:var(--accent);}
.wnw-opts{display:flex;gap:4px;flex-wrap:wrap;}
.wnw-opt{border:var(--bw) solid var(--ctl-edge,var(--input-border));border-radius:var(--r-pill,5px);padding:1px 9px;font-size:.85em;cursor:pointer;background:var(--btn-bg);}
.wnw-opt.on{background:var(--sel-bg);color:var(--sel-text);border-color:transparent;}
.wnw-gph{display:flex;gap:6px;align-items:center;margin:10px 0 2px;color:var(--accent-text,var(--accent));font-weight:800;font-size:.95em;}
.wnw-grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));}
.wnw-insp{border:var(--bw) solid var(--card-border);border-radius:var(--r-card);background:var(--card-bg);padding:10px 12px;font-size:.93em;line-height:1.7;}
.wnw-insp .at{color:var(--text-light);font-size:.82em;margin-top:4px;}
.wnw-ta-big{width:100%;flex:1 1 auto;min-height:120px;line-height:1.9;padding:8px 10px;background:var(--input-bg);
  border:1px solid var(--ctl-edge,var(--input-border));border-radius:var(--r-card);resize:none;}
`);

/* ---------- 高亮规则：默认项里只「书名号」「关键词表」两档拆不掉，其余连内置那几条一起可改可删 ----------
   （外25 第 11 条）说话 / 地名 / 转折词 / 连用标点 这四条是出厂给的样子，式子摆在正则那一格里照改，
   删掉就记进 hl-gone 那份账，下次开软件不再把它们补回来 —— 从前是每回开软件都按 HL_SEED 重铺一遍，
   删了等于没删。生效范围：写作 / 笔记 / 两者。 */
const HL_SEED = [
  { id:'dialog', name:'说话', src:'“[^”]{1,80}”|「[^」]{1,80}」|『[^』]{1,80}』', on:true, slot:1, scope:'both' },
  { id:'book', name:'书名号', src:'《[^》]{1,60}》', on:true, slot:5, scope:'both' },
  { id:'keyword', name:'关键词表', kind:'keyword', on:true, slot:3, scope:'both' },
  { id:'place', name:'地名', src:'[\\u4e00-\\u9fa5]{1,6}(?:省|市|县|区|镇|乡|村|街|巷|山|岭|峰|谷|河|湖|海|岛|洲|城|关|渡|桥|塔|寺|庄|林|原|国)', on:false, slot:2, scope:'both' },
  { id:'pivot', name:'转折词', src:'但是|可是|然而|不过|只是|却|倒是|谁知|不料|反而|于是|后来|接着|与此同时', on:false, slot:4, scope:'both' },
  { id:'punct', name:'连用标点', src:'[！？]{2,}|……|——', on:false, slot:1, scope:'both' }
];
/* 拆不掉的只有这两条：书名号是稿子的骨架，关键词表那一格还挂着词表本身 */
const HL_LOCK = ['book', 'keyword'];
const isLockedRule = id => HL_LOCK.indexOf(String(id)) >= 0;
const isBuiltinRule = r => HL_SEED.some(b => b.id === r.id);
const WriteCfg = {
  rules:[],
  kw:[], 开:true, gone:[],
  async load(){
    let saved = [];
    try{
      const r = await State.get('hl-rules', null); if(Array.isArray(r)) saved = r;
      this.kw = (await State.get('hl-kw', [])) || [];
      this.开 = await State.get('hl-on', true);
      const g = await State.get('hl-gone', null); this.gone = Array.isArray(g) ? g.map(String) : [];
    }catch(e){}
    /* 直角引号早先单列一条，现在并进了「说话」 */
    saved = saved.filter(s => s.id !== 'corner');
    const byId = {}; for(const s of saved) byId[s.id] = s;
    /* 出厂那几条：被删过的不再补回来；用户改过的（式子、名字、开关、色位、长相）以存下来那份为准 */
    this.rules = HL_SEED.filter(s => isLockedRule(s.id) || this.gone.indexOf(s.id) < 0).map(s => {
      const o = byId[s.id] || {};
      return Object.assign({}, s, { on:o.on === undefined ? s.on : !!o.on, slot:o.slot || s.slot, scope:o.scope || s.scope,
        src:o.src === undefined ? s.src : o.src, name:o.name === undefined ? s.name : (o.name || s.name),
        st:o.st === undefined ? s.st : o.st });
    }).concat(saved.filter(s => !isBuiltinRule(s)));
    this.compile();
  },
  async save(){
    this.gone = HL_SEED.filter(s => !isLockedRule(s.id) && !this.rules.some(r => r.id === s.id)).map(s => s.id);
    await State.set('hl-rules', this.rules); await State.set('hl-kw', this.kw);
    await State.set('hl-on', this.开); await State.set('hl-gone', this.gone);
    this.compile();
    Bus.emit('desk:hl');
  },
  addRule(){ const n = typeof markCount === 'function' ? markCount() : 5; const r = { id:uid('hl'), name:'新规则', src:'', on:false, slot:this.rules.length % n + 1, scope:'both' }; this.rules.push(r); return r; },
  /* 那两条拆不掉的：返回 false，界面上一个删钮都不摆，走这儿也删不动 */
  delRule(id){ if(isLockedRule(id)) return false; this.rules = this.rules.filter(r => r.id !== id); return true; },
  compile(){
    this.re = this.rules.filter(r => r.on && r.src && !r.kind).map(r => {
      try{ return { re:new RegExp(r.src, 'g'), slot:r.slot, scope:r.scope || 'both', css:hlCss(r.st) }; }catch(e){ return null; }
    }).filter(Boolean);
    this.kwRe = null;
    const kws = this.kw.filter(Boolean);
    const kr = this.rules.find(r => r.id === 'keyword' && r.on);
    if(kws.length && kr){
      this.kwRe = {
        re:new RegExp('(' + kws.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g'),
        slot:kr.slot, scope:kr.scope || 'both', css:hlCss(kr.st)
      };
    }
  },
  /* 命中区间：正则 + 关键词 + 设定卡名（卡名由外部注入，改了卡就跟着变）
     mode 是这一屏的写作 / 笔记模式，规则只在自己的模式里亮 */
  spans(text, extra, mode){
    const m = mode === 'note' ? 'note' : 'write';
    const fit = s => !s || s === 'both' || s === m;
    const out = [];
    for(const r of this.re){ if(!fit(r.scope)) continue; r.re.lastIndex = 0; let m2;
      while((m2 = r.re.exec(text)) && m2[0]){ out.push({ from:m2.index, to:m2.index + m2[0].length, cls:'hl-' + r.slot, css:r.css }); if(m2.index === r.re.lastIndex) r.re.lastIndex++; } }
    if(this.kwRe && fit(this.kwRe.scope)){ this.kwRe.re.lastIndex = 0; let m2;
      while((m2 = this.kwRe.re.exec(text)) && m2[0]){ out.push({ from:m2.index, to:m2.index + m2[0].length, cls:'hl-' + this.kwRe.slot, css:this.kwRe.css }); if(m2.index === this.kwRe.re.lastIndex) this.kwRe.re.lastIndex++; } }
    for(const e of (extra || [])){ e.re.lastIndex = 0; let m2;
      /* css 也要跟着递：设定卡那头的「外观」就挂在这一串上（卡自己钉了长相的写进 span 的 style，
         没钉的是空串，marked() 那边就当没写，正文里吃 hl-N 那一串标记色） */
      while((m2 = e.re.exec(text)) && m2[0]){ out.push({ from:m2.index, to:m2.index + m2[0].length, cls:e.cls, card:e.card, css:e.css }); if(m2.index === e.re.lastIndex) e.re.lastIndex++; } }
    return out;
  }
};

/* ---------- 一条规则可以自己定长相（照笔落「幻彩主题 → 自定义」那四页：通用 / 背景 / 边框 / 下划线）
   st 没填 = 跟色位（hl-N 那个颜色）；填了就把这串内联样式写进命中的那个 span ---------- */
const HL_W = [['', '常规'], ['600', '半粗'], ['700', '粗体']];
const HL_F = [['', '跟正文'], ['"Songti SC",SimSun,serif', '宋体'], ['"Microsoft YaHei",sans-serif', '黑体'],
  ['KaiTi,serif', '楷体'], ['var(--ff-code,ui-monospace,Consolas,monospace)', '等宽']];
const HL_LINE = [['', '无'], ['solid', '实线'], ['dashed', '虚线'], ['dotted', '点线'], ['double', '双线'], ['wavy', '波浪线']];
const HL_BGK = [['none', '无'], ['solid', '纯色'], ['grad', '渐变']];
/* 六个现成样子，名字照他给的那张参照图；点了还能接着改，不是只能二选一 */
const HL_LOOKS = [
  { n:'紫烟', st:{ c:'#6b21a8', w:'600', i:false, f:'', r:8, p:[2,6,2,6], bg:{ k:'grad', c:'', g:['#f3e8ff','#e0e7ff'], a:14 }, bd:{ s:'', w:1, c:'' }, ul:{ s:'', c:'' } } },
  { n:'翠竹', st:{ c:'#14532d', w:'', i:false, f:'', r:6, p:[2,6,2,6], bg:{ k:'solid', c:'#dcfce7', g:[], a:14 }, bd:{ s:'', w:1, c:'' }, ul:{ s:'solid', c:'' } } },
  { n:'碧瓦', st:{ c:'#0f4c5c', w:'600', i:false, f:'', r:4, p:[2,5,2,5], bg:{ k:'solid', c:'#cffafe', g:[], a:14 }, bd:{ s:'solid', w:1, c:'#67e8f9' }, ul:{ s:'', c:'' } } },
  { n:'云影', st:{ c:'#1e3a8a', w:'', i:true, f:'', r:10, p:[2,7,2,7], bg:{ k:'grad', c:'', g:['#dbeafe','#f1f5f9'], a:90 }, bd:{ s:'', w:1, c:'' }, ul:{ s:'', c:'' } } },
  { n:'金阙', st:{ c:'#92400e', w:'700', i:false, f:'', r:4, p:[1,5,1,5], bg:{ k:'solid', c:'#fef3c7', g:[], a:14 }, bd:{ s:'dotted', w:1, c:'#f59e0b' }, ul:{ s:'', c:'' } } },
  { n:'秋梦', st:{ c:'#9f1239', w:'', i:false, f:'', r:6, p:[2,6,2,6], bg:{ k:'grad', c:'', g:['#ffe4e6','#fff7ed'], a:140 }, bd:{ s:'', w:1, c:'' }, ul:{ s:'wavy', c:'#fb7185' } } }
];
function hlNewSt(){
  return { c:'', w:'', i:false, f:'', r:0, p:[2,6,2,6],
    bg:{ k:'none', c:'', g:['#dbeafe','#f3e8ff'], a:14 }, bd:{ s:'', w:1, c:'' }, ul:{ s:'', c:'' } };
}
/* 色号 → 能安全写进 style 的 #rrggbb：走现成的 parseColor / resolveColor，
   FF10B981、cmyk(30,20,35,0)、191 193 169 都认；认不出就作废，
   不让用户从颜色框里塞一整串 css 进 span 的 style */
function normColor(v){
  const s = String(v == null ? '' : v).trim().replace(/^#/, '');
  if(!s) return '';
  const six = /^[0-9a-f]{8}$/i.test(s) ? s.slice(0, 6) : s;
  const r = resolveColor(parseColor(/^[0-9a-f]{3,6}$/i.test(six) ? '#' + six : s));
  return r && r.hex || '';
}
/* 线条样式的图示：把「实线 / 虚线 / 点线 / 双线 / 波浪线」这几个名字画成一条小线，
   放在选样式的那一排钮里。五种一律用 SVG 画，不走 border-top-style —— CSS 的边框画不出波浪线，
   五种里缺一种就不成套。颜色跟着 currentColor 走，所以选中那一个自动换成选中的字色。 */
function lineGlyph(s){
  if(!s) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wnw-hl-line');
  svg.setAttribute('viewBox', '0 0 26 10'); svg.setAttribute('width', '26'); svg.setAttribute('height', '10');
  svg.setAttribute('aria-hidden', 'true');
  const mk = (d, w) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', String(w || 1.6));
    if(s === 'dashed') p.setAttribute('stroke-dasharray', '5 3');
    if(s === 'dotted'){ p.setAttribute('stroke-dasharray', '0.1 3.6'); p.setAttribute('stroke-linecap', 'round'); }
    svg.appendChild(p);
  };
  if(s === 'double'){ mk('M1 3h24', 1); mk('M1 7.5h24', 1); }
  else if(s === 'wavy') mk('M1 5q3 -4 6 0t6 0t6 0t6 0', 1.4);
  else mk('M1 5h24');
  return svg;
}

function hlCss(st){
  if(!st) return '';
  let s = '';
  if(st.c) s += 'color:' + st.c + ';';
  if(st.w) s += 'font-weight:' + st.w + ';';
  if(st.i) s += 'font-style:italic;';
  if(st.f) s += 'font-family:' + st.f + ';';
  const p = st.p || [0, 0, 0, 0];
  if(p.some(x => x)) s += 'padding:' + (p[0] || 0) + 'px ' + (p[1] || 0) + 'px ' + (p[2] || 0) + 'px ' + (p[3] || 0) + 'px;';
  /* 圆角归全局：这条高亮规则没自己钉过圆角时吃控件那一档，钉成 0 才算真方角。
     从前这里是「没钉就不写」，浏览器留直角 —— 同一屏里那些钉过的圆角标签和它们一半圆一半方，
     就是外13-C 说的那批漏网的。 */
  if(st.r === undefined || st.r === null || st.r === '') s += 'border-radius:var(--r-btn,5px);';
  else s += 'border-radius:' + st.r + 'px;';
  const bg = st.bg || {};
  if(bg.k === 'solid' && bg.c) s += 'background:' + bg.c + ';';
  if(bg.k === 'grad' && (bg.g || []).length > 1) s += 'background:linear-gradient(' + (bg.a || 0) + 'deg,' + bg.g.join(',') + ');';
  const bd = st.bd || {};
  if(bd.s) s += 'border:' + (bd.w || 1) + 'px ' + bd.s + ' ' + (bd.c || 'currentColor') + ';';
  const ul = st.ul || {};
  if(ul.s) s += 'text-decoration:underline;text-decoration-style:' + ul.s + ';' + (ul.c ? 'text-decoration-color:' + ul.c + ';' : '');
  return s;
}

/* 批注显示开关：工具栏「批注」下拉里切，全局记住 */
const AnnoView = {
  on:true,
  async load(){ this.on = await State.get('anno-show', true); },
  set(v){ this.on = v; State.set('anno-show', v); }
};

/* ---------- 版式：全局一份，顶端那一行和设置里的格式定义改的都是它，只作用在正文上 ----------
   默认值 = v0.3 原来的样子：行距 1.9、段间不留距、空行随正文自己敲、左对齐、首行缩进两字 */
const TYPE_SEED = { 行距:1.9, 段距:0, 空行:'any', 对齐:'left', 缩进:true };
/* 顶端那一行只用图标（形状照 Word 那排符号的意思画，定义在 _shared/sh-ico.js，一个名字一张文件），
   汉字名放进悬停提示；以前夹在中间的那一列字符（⇤ ↔ ⇥ ≡ ¶ • ☑）整个撤了 —— 图标一律走文件，不拿字符顶。
   设置里的格式定义页共用这几张表，那里只取 [键, 汉字名] 两列。 */
const ALIGN_IT = [['left', '左对齐', 'al-left'], ['center', '居中', 'al-center'],
  ['right', '右对齐', 'al-right'], ['ju', '两端对齐', 'al-ju']];
const LH_IT = [1, 1.2, 1.5, 1.9, 2.2];
const PG_IT = [0, 4, 8, 12, 16];
const BLANK_IT = [['any', '∞', '段间空几行，看正文里自己敲的空段'], ['one', '1', '每两段之间再空出一行'], ['none', '0', '正文里自己敲的空段挤薄']];
const K_IT = [['p', '正文', 'pilcrow'], ['h1', '一级标题', 'h1'], ['h2', '二级标题', 'h2'], ['h3', '三级标题', 'h3'],
  ['h4', '四级标题', 'h4'], ['h5', '五级标题', 'h5'], ['h6', '六级标题', 'h6'],
  ['ul', '无序列表', 'ul'], ['ol', '有序列表', 'ol'], ['todo', '待办事项', 'todo']];
const Type = {
  cur:Object.assign({}, TYPE_SEED),
  async load(){
    try{ const s = await State.get('type', null); if(s) this.cur = Object.assign(this.cur, s); }catch(e){}
    this.apply();
  },
  async set(k, v){ this.cur[k] = v; await State.set('type', this.cur); this.apply(); Bus.emit('type:set'); },
  /* 行距、段距、对齐这五项从前写在 html 的自定义属性和 body 的类上：那是整张页的根，
     搬进来之后写上去就是把宿主的排版一起改了。改写在容器那一层，后代照样吃得到。 */
  apply(){
    const box = wnwRoot(); if(!box) return;
    const r = box.style, b = box.classList;
    r.setProperty('--lh', String(this.cur.行距));
    r.setProperty('--pgap', this.cur.段距 + 'px');
    r.setProperty('--blank', this.cur.空行 === 'one' ? 'calc(var(--lh, 1.9) * 1em)' : '0px');
    b.toggle('wnw-ju', this.cur.对齐 === 'ju');
    b.toggle('wnw-ct', this.cur.对齐 === 'center');
    b.toggle('wnw-rt', this.cur.对齐 === 'right');
    b.toggle('wnw-noind', !this.cur.缩进);
    b.toggle('wnw-noblank', this.cur.空行 === 'none');
  }
};

/* 格式定义页：设置 → 版式 用的就是这一段，顶端那一行是它的符号速记版 */
async function typeForm(){
  const box = h('div', { class:'wnw-col', style:'min-width:min(470px,92vw)' });
  const seg = (items, cur, pick) => {
    const g = h('div', { class:'wnw-seg' });
    for(const it of items){
      const b = h('button', { class:it[0] === cur ? 'on' : '', title:it[2] || String(it[1]) }, it[1]);
      b.addEventListener('click', async () => {
        for(const x of g.children) x.classList.remove('on');
        b.classList.add('on');
        await pick(it[0]);
      });
      g.appendChild(b);
    }
    return g;
  };
  const field = (lab, node) => box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, lab), node]));
  const T = Type.cur;
  field('首行缩进', seg([[true, '缩进两字'], [false, '不缩进']], T.缩进, v => Type.set('缩进', v)));
  field('对齐', seg(ALIGN_IT.map(it => [it[0], it[1]]), T.对齐, v => Type.set('对齐', v)));
  field('行距', seg(LH_IT.map(v => [v, String(v)]), T.行距, v => Type.set('行距', v)));
  field('段间距', seg(PG_IT.map(v => [v, v + ' px']), T.段距, v => Type.set('段距', v)));
  field('段落空行', seg(BLANK_IT, T.空行, v => Type.set('空行', v)));
  /* 字号 8–32 一共 25 档，下拉里每一项按自己的字号显示自己 */
  const fsSel = h('select', { class:'wnw-input', style:'width:auto;min-width:104px',
    onchange:() => Fs.edit(Fs.now, { doc:parseInt(fsSel.value, 10) }) });
  for(const s of Fs.steps) fsSel.appendChild(h('option', { value:String(s), style:'font-size:' + s + 'px' }, s + 'px'));
  fsSel.value = String(Fs.cur().doc);
  field('字号档', fsSel);
  const curW = String(await State.get('doc-w', '820'));
  const isCst = /^\d+$/.test(curW) && curW !== '820';
  const numW = h('input', { class:'wnw-input', type:'number', min:'360', max:'2400', step:'20', style:'width:78px',
    value:isCst ? curW : '900' });
  const setW = v => { State.set('doc-w', v); Shell.applyDocW(); Bus.emit('type:set'); };
  numW.addEventListener('change', () => setW(String(Math.min(2400, Math.max(360, parseInt(numW.value, 10) || 900)))));
  numW.style.display = isCst ? '' : 'none';
  const wSeg = seg([['820', '820 居中'], ['fill', '铺满'], ['cst', '自定义']], isCst ? 'cst' : curW, v => {
    numW.style.display = v === 'cst' ? '' : 'none';
    setW(v === 'cst' ? numW.value : v);
  });
  box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, '正文栏宽'), h('div', { class:'wnw-row', style:'flex-wrap:nowrap' }, [wSeg, numW])]));
  return box;
}

/* 一键排版的三件事：清空格、清空行、半角标点转全角。都只动 p.t，不碰痕迹 */
const WIDE_PUNCT = { ',':'，', ';':'；', ':':'：', '?':'？', '!':'！' };
const CJK = '[\\u4e00-\\u9fff]';
function widePunct(s){
  let n = 0;
  const w = m => { n++; return m; };
  const re = (src) => new RegExp(src, 'g');
  const out = s
    .replace(re('\\.\\.\\.'), () => w('……'))
    .replace(re('--'), () => w('——'))
    .replace(re('[,;:?!]'), m => w(WIDE_PUNCT[m]))
    .replace(re('(' + CJK + ')\\.(?!' + CJK + '|[0-9A-Za-z])'), (m, c) => { n++; return c + '。'; })
    .replace(re('(' + CJK + ')\\('), (m, c) => { n++; return c + '（'; })
    .replace(re('\\((?=' + CJK + ')'), () => w('（'))
    .replace(re('(' + CJK + ')\\)'), (m, c) => { n++; return c + '）'; })
    .replace(re('\\)(?=' + CJK + ')'), () => w('）'));
  /* 直引号成对才转，落单的留着不动，免得把英文引号配错 */
  const qn = (out.match(/"/g) || []).length;
  if(qn >= 2 && qn % 2 === 0){
    let i = 0;
    return [out.replace(/"/g, () => w(i++ % 2 ? '”' : '“')), n];
  }
  return [out, n];
}
function tidyLine(t){
  let n = 0;
  const s = t.replace(/^[ \t　]+|[ \t　]+$/g, () => { n++; return ''; })
    .replace(/[ \t　]{2,}/g, () => { n++; return ' '; });
  return [s, n];
}

/* 打一条修订：删掉的文字放回原位划掉，插进去的字留在原位划线。
   批量替换也走这一条，痕迹口径才和一个字一个字打出来的完全一致。 */
function recordRev(p, before, after){
  if(before === after) return null;
  let a = 0; while(a < before.length && a < after.length && before[a] === after[a]) a++;
  let b = 0; while(b < before.length - a && b < after.length - a && before[before.length - 1 - b] === after[after.length - 1 - b]) b++;
  const del = before.slice(a, before.length - b), ins = after.slice(a, after.length - b);
  if(!del && !ins) return null;
  if(del){
    Trace.mark(p, 'del', a, del);
    if(ins) Trace.mark(p, 'ins', a + del.length, ins);
    return { text:after.slice(0, a) + del + after.slice(a), caret:a + del.length + ins.length };
  }
  if(ins) Trace.mark(p, 'ins', a, ins);
  return null;
}
/* 一段里全部换掉：从后往前一处一处改，位置才不会因为前面变长而漂 */
function replaceIn(p, q, r, rev){
  const s = String(p.t || ''), lq = s.toLowerCase(), qq = q.toLowerCase();
  const spots = [];
  if(qq) for(let at = lq.indexOf(qq); at >= 0; at = lq.indexOf(qq, at + Math.max(1, qq.length))) spots.push(at);
  if(!spots.length) return 0;
  let cur = s, runs = p.s;
  for(let i = spots.length - 1; i >= 0; i--){
    const a = spots[i];
    const was = cur;
    const after = cur.slice(0, a) + r + cur.slice(a + q.length);
    if(rev){ const g = recordRev(p, cur, after); if(g) cur = g.text; else cur = after; }
    else cur = after;
    const box = { t:cur, s:runs }; shiftRuns(box, was, cur); runs = box.s;
  }
  p.t = cur; p.s = runs;
  return spots.length;
}
/* 查找的三个小算子：位置忽略大小写，命中数一处算一处，摘录把命中的那几个字框出来 */
function hitAt(t, q){
  if(!q) return -1;
  return String(t || '').toLowerCase().indexOf(String(q).toLowerCase());
}
function countOcc(t, q){
  const s = String(t || '').toLowerCase(), qq = String(q || '').toLowerCase();
  if(!qq) return 0;
  let n = 0;
  for(let at = s.indexOf(qq); at >= 0; at = s.indexOf(qq, at + qq.length)) n++;
  return n;
}
function snippet(t, at, len, span){
  t = String(t || '');
  const a = Math.max(0, at - (span || 22)), b = Math.min(t.length, at + len + (span || 22));
  return (a > 0 ? '…' : '') + t.slice(a, at) + '【' + t.slice(at, at + len) + '】' + t.slice(at + len, b) + (b < t.length ? '…' : '');
}
/* 跳去开某一章：已经有标签就切过去，没有就新开 */
async function openChTab(chId){
  Work.cur = chId;
  State.set('cur.' + Work.book.id, chId);
  const lf = Desk.leaves(Desk.st.tree).find(l => (l.tabs || []).some(t => t.kind === 'ch' && t.ref === chId));
  if(lf){ lf.act = lf.tabs.findIndex(t => t.kind === 'ch' && t.ref === chId); Desk.save(); Desk.drawMid(); return; }
  await Desk.addTab('ch', chId);
}
/* 从查找里跳过去、但那一章还没开：先记下，等它 boot 完自己走过去 */
let FindJump = null;

/* ---------- markdown 记号：只有笔记 / 富文本模式吃记号，写作模式一律当普通字 ----------
   行首记号（`##的`、`--的`、`[]的`、`1. 的`）换成块类型，显示的时候 mdOf 再把记号摆回行首，
   所以写作模式里根本不会出现标题层级；行内记号（`**` `~~` `` ` `` `[]()`）收进样式表。
   mark = 这行确实有记号被吃掉，pre = 吃掉几个字。 */
function mdLv(sp, mk){
  let w = 0; for(const c of sp) w += c === '\t' ? 2 : 1;
  return Math.min(6, (/^-+$/.test(mk) ? mk.length : 1) + Math.floor(w / 2));
}
function mdOf(p){
  const ind = p.lv > 1 ? '  '.repeat(Math.min(6, p.lv) - 1) : '';
  if(p.k === 'todo') return ind + '- [' + (p.done ? 'x' : ' ') + '] ' + p.t;
  if(p.k === 'ul') return ind + '- ' + p.t;
  if(p.k === 'ol') return ind + '1. ' + p.t;
  const b = BLOCK_MAP.get(p.k);
  return b && b.md ? b.md + ' ' + p.t : p.t;
}
function mdParse(s){
  s = String(s == null ? '' : s);
  let m;
  /* 标题：#~######，尾随的 # 当装饰一起吃掉；光打 # 不动，得有一个字才成形 */
  if((m = /^([ \t]*)(#{1,6})(?!#)([ \t]*)(\S[\s\S]*?)([ \t]*#*)$/.exec(s)))
    return { k:'h' + m[2].length, t:m[4], done:false, lv:1, pre:m[1].length + m[2].length + m[3].length, mark:true };
  /* 待办：[] / [x]（空方框也算，先成形后补勾），前面的列表记号可选 */
  if((m = /^([ \t]*)(-{1,6}|[*+][ \t])?([ \t]*)\[([ xX]?)\]([ \t]*)([\s\S]*)$/.exec(s)))
    return { k:'todo', t:m[6], done:m[4] === 'x' || m[4] === 'X', lv:m[2] ? mdLv(m[1], m[2]) : 1, pre:m[0].length - m[6].length, mark:true };
  /* 列表：正文第一个字不能又是杠 —— 光打两个杠（"--"）还在记号中间，别把第二个杠当成正文 */
  if((m = /^([ \t]*)(-{1,6}|[*+][ \t])([ \t]*)([^-\s][\s\S]*?)$/.exec(s)))
    return { k:'ul', t:m[4], done:false, lv:mdLv(m[1], m[2]), pre:m[0].length - m[4].length, mark:true };
  /* 有序列表：半角点后面必须跟空格，不然 2008.北京 / 3.14 都要被当成列表；
     顿号和括号是中文记号，不会出现在数字里，空不空格都认 */
  if((m = /^([ \t]*)(\d{1,9})\.([ \t]+)(\S[\s\S]*?)$/.exec(s)))
    return { k:'ol', t:m[4], done:false, lv:mdLv(m[1], ''), pre:m[0].length - m[4].length, mark:true };
  if((m = /^([ \t]*)(\d{1,9})[、)）]([ \t]*)([^\s\d][\s\S]*?)$/.exec(s)))
    return { k:'ol', t:m[4], done:false, lv:mdLv(m[1], ''), pre:m[0].length - m[4].length, mark:true };
  return { k:'p', t:s, done:false, lv:1, pre:0, mark:false };
}
/* 笔记模式：一行原文 → 段落模型。行首记号换成块类型，行内记号收进样式表；
   返回的 runs 是刚收进来的样式（坐标已经是干净 p.t 的），等调用方把老样式搬齐再并进去 */
function mdInto(p, s){
  const d = mdParse(s);
  let t = d.t;
  const r = Spans.mdInline(t);
  if(r){ t = r.t; d.runs = r.s; }
  p.k = d.k; p.t = t; p.done = !!d.done; p.lv = d.lv > 1 ? d.lv : undefined;
  return d;
}
/* 粘进来 / 回车拆出来的整段：笔记模式照旧吃记号，写作模式原样收字 */
function mdFill(p, line, note){
  if(note) mdInto(p, line);
  else p.t = line;
}
/* markdown 收来的行内样式并进样式表：同一处后写的盖住先写的，工具条按的加粗不冲突 */
function applyMdSpans(p, list){
  if(!p || !list || !list.length) return;
  for(const r of list){
    const props = {};
    for(const k of RICH_KEYS) if(r[k]) props[k] = r[k];
    p.s = Spans.set(p.s && p.s.length ? p.s : [], r.a, r.a + r.n, props);
  }
}

/* ---------- 闪烁光标 ----------
   正文 / 章纲那两层编辑器把原生 caret 收掉了（caret-color:transparent），
   这条竖条自己画：跟着选区走，选字的时候收起，输入法组合期间常亮不闪。 */
const MIRROR_KEYS = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing',
  'paddingLeft','paddingRight','paddingTop','paddingBottom','borderWidth','textIndent',
  'wordBreak','whiteSpace','textAlign'];
const isCaretHost = el => !!el && !!el.classList && (el.classList.contains('wnw-ta') || el.classList.contains('wnw-ce'));
const WCaret = {
  el:null, comp:false, raf:0,
  /* 竖条这块挂在容器里：stop 那一趟把容器清空，这块也跟着没了，
     手里那份引用要是不再认，下一次 start 就永远往一块已经不在页面上的节点上摆坐标 */
  make(){ if(!this.el || !this.el.isConnected) wnwRoot().appendChild(this.el = h('i', { class:'wnw-caret', 'aria-hidden':'true' })); return this.el; },
  hide(){ if(this.el) this.el.classList.remove('on', 'blink'); },
  /* textarea 里量插入点：文字是透明的，range 拿不到，照 caretLine 那套摆个镜像盒 */
  taBox(ta){
    const cs = getComputedStyle(ta);
    const m = h('div', { class:'wnw-mirror' });
    for(const k of MIRROR_KEYS) m.style[k] = cs[k];
    m.style.width = ta.clientWidth + 'px';
    m.textContent = ta.value.slice(0, ta.selectionStart || 0);
    const dot = document.createElement('span');
    dot.style.cssText = 'display:inline-block;width:0;height:1em;';
    m.appendChild(dot);
    wnwRoot().appendChild(m);
    const dr = dot.getBoundingClientRect(), mr = m.getBoundingClientRect(), tr = ta.getBoundingClientRect();
    const out = { x:tr.left + dr.left - mr.left, y:tr.top + dr.top - mr.top, h:dr.height || parseFloat(cs.fontSize) };
    m.remove();
    return out;
  },
  /* contenteditable 里量插入点：折叠 range 常常没有盒子，往前后各借一个字量 */
  ceBox(el, rg){
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
    const rc = rg.getClientRects();
    if(rc && rc.length){ const r = rc[rc.length - 1]; return { x:r.left, y:r.top, h:r.height || lh }; }
    const c = rg.startContainer, o = rg.startOffset;
    if(c.nodeType === 3 && c.data.length){
      const r2 = document.createRange();
      const nx = Math.min(c.data.length, o + 1);
      r2.setStart(c, Math.min(o, nx - 1)); r2.setEnd(c, nx);
      const q = r2.getClientRects();
      if(q && q.length){
        const r = q[q.length - 1];
        return { x: o >= c.data.length ? r.right : r.left, y:r.top, h:r.height || lh };
      }
    }
    /* 空段落里 range 量不出矩形，只能按盒子摆：行盒上半截那一条是行距留白（正文 line-height 1.9 时约 0.45em），
       字实际画在行盒偏下的地方。少加这半格 leading，竖条就贴在段落顶上，一打字有了真矩形才正 —— 就是他说的"光标偏上"。 */
    const fs = parseFloat(cs.fontSize) || lh;
    const lead = Math.max(0, (lh - fs) / 2);
    const rb = el.getBoundingClientRect();
    return { x: rb.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.textIndent) || 0),
      y: rb.top + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0) + lead, h: fs };
  },
  box(){
    const el = document.activeElement;
    if(!isCaretHost(el)) return null;
    if(el.classList.contains('wnw-ta')){
      if((el.selectionEnd || 0) !== (el.selectionStart || 0)) return null;
      return this.taBox(el);
    }
    const s = getSelection && getSelection();
    if(!s || !s.rangeCount || !s.isCollapsed || !el.contains(s.getRangeAt(0).startContainer)) return null;
    return this.ceBox(el, s.getRangeAt(0));
  },
  move(){
    const rc = this.box();
    if(!rc){ this.hide(); return; }
    const e = this.make();
    e.style.left = Math.round(rc.x) + 'px';
    e.style.top = Math.round(rc.y) + 'px';
    e.style.height = Math.round(rc.h) + 'px';
    e.classList.add('on');
    /* 打字 / 挪光标时竖条先亮住，停手再继续闪；输入法组字期间一直亮住 */
    if(this.comp){ e.classList.remove('blink'); return; }
    e.classList.remove('blink');
    void e.offsetWidth;
    e.classList.add('blink');
  },
  later(){ if(this.raf) return; this.raf = requestAnimationFrame(() => { this.raf = 0; this.move(); }); }
};
/* 竖条该跟着动的那九个时机：从前脚本一求值就全挂在 window 上，现在挂在容器上、随 stop 摘。
   挂在 window 上还有第二个毛病：宿主自己那张页里任何一处滚动、打字都会来量一次为写的光标。 */
WCaret.bind = function(host){
  if(typeof document === 'undefined' || !host) return;
  wnwOn(host, 'selectionchange', () => WCaret.later());
  wnwOn(host, 'keyup', () => WCaret.later());
  wnwOn(host, 'pointerup', () => WCaret.later());
  wnwOn(host, 'input', () => WCaret.later());
  wnwOn(host, 'focusin', ev => { WCaret.later(); });
  wnwOn(host, 'focusout', () => { setTimeout(() => { if(!isCaretHost(document.activeElement) || !host.contains(document.activeElement)) WCaret.hide(); }, 0); });
  wnwOn(host, 'compositionstart', () => { WCaret.comp = true; WCaret.later(); }, true);
  wnwOn(host, 'compositionend', () => { WCaret.comp = false; WCaret.later(); }, true);
  wnwOn(host, 'scroll', () => WCaret.later(), true);
};

/* ---------- 段落聚焦的外观：五项全能自己定，一行明文存 State，改完当场生效 ----------
   文字颜色 / 底色填充（整段填满，连文字背后一起）/ 边框颜色 / 边框粗细 / 圆角程度。
   某一项留空 = 不自己定，回到 CSS 里那条默认（跟配色走、不填底）。只有正文段落有聚焦这一说，
   章纲卡片和笔记块不跟着改。 */
const FOCUS_DEF = { text:'', bg:'', bd:'', bw:0, r:8 };
const FocusLook = {
  st:Object.assign({}, FOCUS_DEF),
  async load(){
    try{ this.st = Object.assign({}, FOCUS_DEF, (await State.get('para-focus', null)) || {}); }
    catch(e){}
    this.apply();
  },
  async set(patch){ Object.assign(this.st, patch || {}); this.apply(); await State.set('para-focus', this.st); },
  async reset(){ this.st = Object.assign({}, FOCUS_DEF); this.apply(); await State.set('para-focus', this.st); },
  apply(){
    const box = wnwRoot(); if(!box) return;
    const s = box.style, k = this.st;
    /* 空串是把这条变量摘掉，CSS 里的默认值就顶上来 */
    s.setProperty('--fc-text', k.text || '');
    s.setProperty('--fc-bg', k.bg || '');
    s.setProperty('--fc-bd', k.bd || '');
    s.setProperty('--fc-bw', (k.bw === FOCUS_DEF.bw || k.bw == null) ? '' : k.bw + 'px');
    s.setProperty('--fc-r', (k.r === FOCUS_DEF.r || k.r == null) ? '' : k.r + 'px');
  }
};
/* 段落聚焦那五项求值即应用，而它要写的就是容器那一层：挪进启动序列里跑。 */
function wnwBindTypeLook(){ Type.apply(); FocusLook.load(); }

/* ---------- 段落编辑器：章纲、正文、卡片正文、笔记都用它 ---------- */
class ParaEd{
  constructor(host, api){
    this.host = host; this.api = api;
    this.rows = [];
    this.showAnno = true; this.showRev = true;
    this.api.ed = this;
    this.draw();
  }
  get paras(){ return this.api.paras(); }
  get mode(){ return this.api.mode ? this.api.mode() : 'write'; }
  get revOn(){ return !!(this.api.revOn && this.api.revOn()); }
  draw(){
    this.host.innerHTML = '';
    this.host.className = 'wnw-ed' + (this.mode === 'note' ? ' md' : '');
    const list = h('div', { class:'wnw-doc-inner' });
    this.host.appendChild(list);
    this.list = list;
    const ps = this.paras;
    for(let i = 0; i < ps.length; i++) list.appendChild(this.row(ps[i], i));
    this.host.addEventListener('scroll', () => this.hideMenu());
  }
  blkClass(r){
    const p = r.p;
    return 'wnw-blk' + (this.mode === 'note' ? ' md' : '') + (p.lv > 1 ? ' lv' + Math.min(6, p.lv) : '') + (r.comp ? ' comp' : '') + (r.focus ? ' focus' : '') +
      (p.k === 'todo' && p.done ? ' done' : '') + (this.api.noIndent ? ' noind' : '') + ' k-' + p.k;
  }
  row(p, i){
    const r = { p, i, comp:false, focus:false };
    const blk = h('div', { class:this.blkClass(r) });
    const gut = h('div', { class:'wnw-gut', title:'点击改这一段是什么类型' }, '');
    const pt = h('div', { class:'wnw-pt' });
    const hl = h('div', { class:'wnw-hl' });
    const ta = h('textarea', { class:'wnw-ta', rows:'1', spellcheck:'false' });
    let cb = null;
    if(p.k === 'todo'){
      cb = h('button', { class:'wnw-cb' + (p.done ? ' done' : ''), title:'完成', 'aria-label':'完成',
        html:icoMarkup(p.done ? 'check' : 'box'), onclick:ev => {
        ev.preventDefault(); p.done = !p.done; this.pull(r); this.sync(i); this.api.dirty();
      } });
    }
    pt.appendChild(hl); pt.appendChild(ta);
    if(cb) blk.appendChild(cb);
    blk.appendChild(gut); blk.appendChild(pt);
    r.blk = blk; r.ta = ta; r.hl = hl; r.gut = gut; r.cb = cb;
    ta.value = this.mode === 'note' ? mdOf(p) : p.t;
    gut.innerHTML = this.gutHtml(p, i);
    this.paint(r);
    ta.addEventListener('input', () => this.onInput(r));
    ta.addEventListener('compositionstart', () => { r.comp = true; blk.classList.add('comp'); });
    ta.addEventListener('compositionend', () => { r.comp = false; blk.classList.remove('comp'); this.onInput(r, true); });
    ta.addEventListener('focus', () => { r.focus = true; blk.classList.add('focus'); this.api.setCur && this.api.setCur(i); });
    ta.addEventListener('blur', () => { r.focus = false; blk.classList.remove('focus'); this.pull(r); });
    ta.addEventListener('keydown', e => this.onKey(e, r));
    ta.addEventListener('paste', e => this.onPaste(e, r));
    gut.addEventListener('click', () => this.pickType(r));
    this.rows[i] = r;
    return blk;
  }
  /* #253 章纲和正文一个口径（正文那一份见 CeEd 的同名函数）：
     普通段落摆它是本章第几段，列表 / 标题 / 待办摆类型记号（点它是改块类型的入口）。
     以前普通段回落 ¶ 那个怪符号，他说章纲的段落符号也改为段落序号。 */
  gutHtml(p, i){
    if(p.k === 'todo') return icoMarkup('box');
    if(p.k === 'ul') return icoMarkup('bullet');
    if(p.k === 'ol') return icoMarkup('ol');
    if(p.k.startsWith('h')) return icoMarkup(p.k);
    return String((i | 0) + 1);
  }
  /* 背景板：先排修订痕迹，再排批注，最后排高亮规则，重叠时高优先级占位 */
  paint(r){
    const p = r.p, text = this.mode === 'note' ? mdOf(p) : p.t;
    const marks = [];
    if(this.showRev && this.api.revOn) for(const g of Trace.ranges(p)) marks.push({ from:g.from, to:g.to, cls:g.op === 'ins' ? 'rv-ins' : (g.op === 'del' ? 'rv-del' : 'rv-fmt'), id:g.id });
    if(this.showAnno && AnnoView.on && this.api.annos) for(const a of this.api.annos()){
      const at = locateAnno(p, a);
      if(at >= 0) marks.push({ from:at, to:at + (a.quote || '').length, cls:'anno-on', anno:a.id });
    }
    if(WriteCfg.开){
      const spans = Trace.trim(WriteCfg.spans(text, this.api.hlExtra && this.api.hlExtra(p), this.mode), marks);
      for(const s of spans) marks.push(s);
    }
    marks.sort((a, b) => a.from - b.from || b.to - a.from);
    const out = []; let at = 0;
    for(const m of marks){
      if(m.from < at || m.to <= m.from) continue;
      if(m.from > at) out.push(esc(text.slice(at, m.from)));
      out.push('<span class="' + m.cls + '"' + (m.css ? ' style="' + m.css + '"' : '') + (m.anno ? ' data-anno="' + m.anno + '"' : '') + (m.card ? ' data-card="' + m.card + '"' : '') + '>' + esc(text.slice(m.from, m.to)) + '</span>');
      at = m.to;
    }
    if(at < text.length) out.push(esc(text.slice(at)));
    r.hl.innerHTML = out.join('') || '<br>';
    this.fit(r);
  }
  paintAll(){ for(let i = 0; i < this.rows.length; i++) if(this.rows[i]) this.paint(this.rows[i]); }
  fit(r){
    const ta = r.ta;
    ta.style.height = 'auto';
    ta.style.height = Math.max(ta.scrollHeight, 22) + 'px';
  }
  pull(r){
    const p = r.p;
    if(this.mode === 'note') mdInto(p, r.ta.value);
    else{
      if(p.t !== r.ta.value && this.revOn) this.record(r, p.t, r.ta.value);
      p.t = r.ta.value;
    }
  }
  /* 修订记录：插入留在原位，删除的文字放回原位并划掉（Word 就是这个行为） */
  record(r, before, after){
    if(before === after) return;
    const p = r.p;
    let a = 0; while(a < before.length && a < after.length && before[a] === after[a]) a++;
    let b = 0; while(b < before.length - a && b < after.length - a && before[before.length - 1 - b] === after[after.length - 1 - b]) b++;
    const del = before.slice(a, before.length - b), ins = after.slice(a, after.length - b);
    if(!del && !ins) return;
    if(del){
      const head = after.slice(0, a), tail = after.slice(a + ins.length);
      r.ta.value = head + del + ins + tail;
      const pos = a + del.length + ins.length;
      try{ r.ta.setSelectionRange(pos, pos); }catch(e){}
      Trace.mark(p, 'del', a, del);
      Trace.mark(p, 'ins', a + del.length, ins);
      Trace.shift(p);
    } else {
      Trace.mark(p, 'ins', a, ins);
    }
  }
  onInput(r){
    const p = r.p, before = p.t;
    if(this.mode === 'note') mdInto(p, r.ta.value);
    else{
      p.t = r.ta.value;
      if(this.revOn && !r.comp) this.record(r, before, r.ta.value);
    }
    if(!r.comp){
      r.blk.className = this.blkClass(r);
      r.gut.innerHTML = this.gutHtml(p, this.rows.indexOf(r));
      this.paint(r);
    }
    this.fit(r);
    this.api.dirty(r);
  }
  sync(i){
    const old = this.rows[i];
    if(!old) return;
    const p = old.p;
    const node = this.row(p, i);
    old.blk.replaceWith(node);
    this.api.dirty();
  }
  /* 整片重建以后把光标放回原来那一行：重建会换掉所有 textarea，不放回去就等于选中和内容一起没了 */
  focusAt(i, caret){
    const r = this.rows[i];
    if(!r) return;
    r.focus = true; r.blk.classList.add('focus');
    r.ta.focus();
    const at = Math.max(0, Math.min(caret || 0, r.ta.value.length));
    try{ r.ta.setSelectionRange(at, at); }catch(e){}
    this.api.setCur && this.api.setCur(i);
  }
  /* 上下键按视觉行走：镜像盒量一次行高，段内没到头就交回这一层自己 */
  caretLine(ta){
    const m = h('div', { class:'wnw-mirror' });
    const cs = getComputedStyle(ta);
    for(const k of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','paddingLeft','paddingRight','paddingTop','paddingBottom','borderWidth','textIndent','wordBreak','whiteSpace']) m.style[k] = cs[k];
    m.style.width = ta.clientWidth + 'px';
    m.textContent = ta.value.slice(0, ta.selectionStart) || '';
    const tail = ta.value.slice(ta.selectionStart);
    if(!tail) m.appendChild(document.createTextNode(' '));
    wnwRoot().appendChild(m);
    const pad = parseFloat(cs.paddingTop) || 0;
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
    const total = (m.offsetHeight - pad * 2) / lh;
    const top = m.offsetHeight - pad * 2 - (m.lastChild && m.lastChild.nodeType === 3 ? 0 : 0);
    /* 用 Range 量插入点所在行的顶端，比按字符数推算稳 */
    let lineTop = 0;
    try{
      const rng = document.createRange();
      rng.selectNodeContents(m);
      const pre = document.createTextNode(ta.value.slice(0, ta.selectionStart));
      m.insertBefore(pre, m.firstChild);
      rng.setStart(pre, pre.length); rng.setEnd(pre, pre.length);
      const rects = rng.getClientRects();
      const mr = m.getBoundingClientRect();
      lineTop = (rects.length ? rects[rects.length - 1].top : mr.bottom) - mr.top - pad;
      m.removeChild(pre);
    }catch(e){}
    const line = Math.max(0, Math.round(lineTop / lh));
    const lines = Math.max(1, Math.round(total));
    m.remove();
    return { line, lines };
  }
  onKey(e, r){
    if(e.isComposing || e.keyCode === 229) return;
    this.pull(r);
    const ta = r.ta, p = r.p;
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase() === 's'){ e.preventDefault(); this.api.save(true); return; }
    if(e.key === 'Enter' && !e.shiftKey && !mod){
      e.preventDefault(); this.split(r, e); return;
    }
    if(e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0 && this.rows.indexOf(r) > 0){
      e.preventDefault(); this.mergeUp(r); return;
    }
    if(e.key === 'Tab'){
      e.preventDefault();
      const s = ta.selectionStart;
      ta.value = ta.value.slice(0, s) + (mod ? '' : '  ') + ta.value.slice(ta.selectionEnd);
      ta.setSelectionRange(s + (mod ? 0 : 2), s + (mod ? 0 : 2));
      this.onInput(r); return;
    }
    if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){
      const { line, lines } = this.caretLine(ta);
      const atTop = e.key === 'ArrowUp' && line === 0;
      const atEnd = e.key === 'ArrowDown' && line >= lines - 1;
      if(!atTop && !atEnd) return;
      const i = this.rows.indexOf(r), j = atTop ? i - 1 : i + 1;
      const t2 = this.rows[j];
      if(!t2) return;
      e.preventDefault();
      const off = atTop ? t2.ta.value.length : 0;
      t2.ta.focus();
      try{ t2.ta.setSelectionRange(off, off); }catch(err){}
      return;
    }
  }
  onPaste(e, r){
    const txt = e.clipboardData && e.clipboardData.getData('text/plain');
    if(!txt || txt.indexOf('\n') < 0) return;
    e.preventDefault();
    const ta = r.ta, s = ta.selectionStart, en = ta.selectionEnd;
    const parts = txt.split(/\r?\n/);
    const before = ta.value.slice(0, s), after = ta.value.slice(en);
    ta.value = before + parts[0];
    this.pull(r);
    const i = this.rows.indexOf(r);
    const add = parts.slice(1).map(t => newPara(this.api.defaultK || 'p', t));
    this.paras.splice(i + 1, 0, ...add.map(x => { mdFill(x, x.t, this.mode === 'note'); return x; }));
    const last = this.paras[this.paras.length - 1];
    if(after){ const l = this.rows[this.rows.length - 1]; if(l) l.ta.value = (this.mode === 'note' ? mdOf(l.p) : l.p.t) + after; }
    this.api.dirty();
    /* 重建之后 this.rows 是旧的一套，聚焦只能交给 redraw 的落点去做 */
    this.api.redraw(i + parts.length - 1, parts[parts.length - 1].length);
  }
  split(r, e){
    const ta = r.ta, p = r.p, s = ta.selectionStart;
    const i = this.rows.indexOf(r);
    const head = ta.value.slice(0, s), tail = ta.value.slice(ta.selectionEnd);
    ta.value = head; this.pull(r);
    const nk = p.k === 'p' || p.k.startsWith('h') ? (p.k.startsWith('h') ? 'p' : 'p') : p.k;
    const q = newPara(nk, '');
    if(['ul', 'ol', 'todo'].includes(nk)) q.lv = p.lv;
    mdFill(q, tail, this.mode === 'note');
    if(p.k === 'todo'){ q.k = 'todo'; }
    p.t = head;
    this.paras.splice(i + 1, 0, q);
    this.api.dirty();
    /* 后半句交给新行，光标落在新行开头：以前新行是空的，回车等于把后半句删了 */
    this.api.redraw(i + 1, 0);
  }
  mergeUp(r){
    const i = this.rows.indexOf(r);
    if(i <= 0) return;
    const up = this.rows[i - 1];
    const at = up.ta.value.length;
    up.p.t = this.mode === 'note' ? up.p.t : up.p.t;
    up.ta.value = up.ta.value + r.ta.value;
    this.pull(up);
    this.paras.splice(i, 1);
    this.api.dirty();
    this.api.redraw(i - 1, at);
  }
  pickType(r){
    const box = h('div', { class:'wnw-grid-pick' });
    for(const b of (this.api.blocks || BLOCKS)){
      box.appendChild(h('button', { class:'wnw-btn' + (r.p.k === b.k ? ' primary' : ''), onclick:() => {
        Overlay.close();
        const old = r.p.k;
        if(old === b.k) return;
        r.p.k = b.k;
        if(b.k !== 'todo') r.p.done = false;
        if(this.revOn) Trace.mark(r.p, 'fmt', 0, '', { k:b.k, k0:old });
        r.ta.value = this.mode === 'note' ? mdOf(r.p) : r.p.t;
        this.sync(this.rows.indexOf(r));
        this.api.dirty();
      }}, b.name));
    }
    Overlay.open('这一段是什么', box);
  }
  /* 图10：选中一段文字 → 直接在右侧那一栏里给一条空的批注，写就在栏里写，不弹框 */
  annoDlg(){
    const ta = document.activeElement;
    const r = this.rows.find(x => x.ta === ta);
    if(!r || r.ta.selectionStart === r.ta.selectionEnd){ toast('先在正文里选中要批注的文字'); return; }
    this.api.addAnno({ para:r.p.id, at:r.ta.selectionStart,
      quote:r.ta.value.slice(r.ta.selectionStart, r.ta.selectionEnd), text:'', replies:[] });
  }
}
/* 批注锚点：偏移对不上就按原文找，找不到就是孤条 */
function locateAnno(p, a){
  const t = p.t || '';
  if(a.quote && t.substr(a.at, a.quote.length) === a.quote) return a.at;
  if(a.quote){ const i = t.indexOf(a.quote); if(i >= 0){ a.at = i; return i; } }
  return -1;
}
Trace.trim = function(spans, taken){
  const out = [];
  for(const s of spans){
    let ok = true;
    for(const t of taken) if(!(s.to <= t.from || s.from >= t.to)){ ok = false; break; }
    if(ok) out.push(s);
  }
  return out;
};
function nlCount(s){ let n = 0; for(let i = 0; i < s.length; i++) if(s[i] === '\n') n++; return n; }

/* ============================================================
   正文编辑器：一段一个 contenteditable，只有一层
   字就是能选能改的真字；痕迹 / 批注 / 高亮直接标在这些字上，
   删掉的文字留在原位划掉，接受才真去掉
   ============================================================ */
const CE_BLK = /^(DIV|P|LI|UL|OL|BLOCKQUOTE|H[1-6])$/;
/* DOM → 纯文本：<br> 和块边界都算一个换行 */
function ceText(root){
  let s = '';
  const walk = (n) => { for(const c of n.childNodes){
    if(c.nodeType === 3){ s += c.nodeValue; continue; }
    if(c.nodeType !== 1) continue;
    if(c.nodeName === 'BR'){ s += '\n'; continue; }
    if(CE_BLK.test(c.nodeName) && s && !s.endsWith('\n')) s += '\n';
    walk(c);
  } };
  walk(root);
  return s;
}
/* (节点, 偏移) → 纯文本下标 */
function cePos(root, node, off){
  let n = 0, hit = -1;
  const walk = (par) => {
    const kids = par.childNodes;
    for(let k = 0; k < kids.length && hit < 0; k++){
      if(par === node && k === off){ hit = n; return; }
      const c = kids[k];
      if(c === node && c.nodeType === 3){ hit = n + Math.min(off, c.nodeValue.length); return; }
      if(c.nodeType === 3){ n += c.nodeValue.length; continue; }
      if(c.nodeType !== 1) continue;
      if(c.nodeName === 'BR'){ n += 1; continue; }
      if(CE_BLK.test(c.nodeName) && n > 0) n += 1;
      walk(c);
    }
    if(hit < 0 && par === node) hit = n;
  };
  walk(root);
  return Math.max(0, hit < 0 ? n : hit);
}
/* 纯文本下标 → (节点, 偏移) */
function cePoint(root, want){
  let n = 0, pt = null;
  const walk = (par) => {
    const kids = par.childNodes;
    for(let k = 0; k < kids.length && !pt; k++){
      const c = kids[k];
      if(c.nodeType === 3){
        const L = c.nodeValue.length;
        if(n + L >= want){ pt = [c, Math.max(0, want - n)]; return; }
        n += L; continue;
      }
      if(c.nodeType !== 1) continue;
      if(c.nodeName === 'BR'){ if(n >= want){ pt = [par, k]; return; } n += 1; continue; }
      if(CE_BLK.test(c.nodeName) && n > 0){ if(n >= want){ pt = [par, k]; return; } n += 1; }
      walk(c);
    }
    if(!pt && n >= want) pt = [par, par.childNodes.length];
  };
  if(!root.childNodes.length) return [root, 0];
  walk(root);
  return pt || [root, root.childNodes.length];
}

class CeEd{
  constructor(host, api){
    this.host = host; this.api = api;
    this.rows = []; this.cur = 0;
    this.undo = []; this.redo = []; this.base = ''; this.timer = null;
    this.api.ed = this;
    this.render();
    this.base = this.snapshot();
  }
  get paras(){ return this.api.paras(); }
  get mode(){ return this.api.mode ? this.api.mode() : 'write'; }
  get revOn(){ return !!(this.api.revOn && this.api.revOn()); }
  lineOf(p){ return this.mode === 'note' ? mdOf(p) : (p.t || ''); }
  curRow(){
    const act = document.activeElement;
    return this.rows.find(r => r && r.el && r.el === act) || (this.rows[this.cur] && this.rows[this.cur].el ? this.rows[this.cur] : this.rows.find(r => r && r.el)) || null;
  }
  /* ---------- 画 ---------- */
  blkClass(p){
    return 'wnw-blk' + (this.mode === 'note' ? ' md' : '') + (p.lv > 1 ? ' lv' + Math.min(6, p.lv) : '') +
      (p.k === 'todo' && p.done ? ' done' : '') +
      (this.api.noIndent ? ' noind' : '') + ' k-' + p.k;
  }
  /* 左侧标尺：普通段落摆它是本章第几段，列表 / 标题 / 待办摆类型记号（点它是改块类型的入口） */
  gutHtml(p, i){
    if(p.k === 'todo') return icoMarkup('box');
    if(p.k === 'ul') return icoMarkup('bullet');
    if(p.k === 'ol') return icoMarkup('ol');
    if(p.k === 'img') return icoMarkup('img');
    if(p.k === 'table') return icoMarkup('tbl');
    if(p.k.startsWith('h')) return icoMarkup(p.k);
    return String((i | 0) + 1);
  }
  /* 一段该长什么样：痕迹、批注、高亮、内联样式都标在字上，只包 span，不添字。
     两层各切各的边界再拼：痕迹 / 高亮一层（class，一段最多一条），内联样式一层（style，一段最多一条）。
     重叠的地方切成小段各归各的，不像过去那样谁盖住谁就整条丢掉。 */
  marked(p){
    const line = this.lineOf(p), t = p.t || '', pre = line.length - t.length;
    const lim = x => Math.max(pre, Math.min(line.length, x));
    const marks = [];
    for(const g of Trace.ranges(p)) marks.push({ from:g.from, to:g.to, cls:g.op === 'ins' ? 'rv-ins' : (g.op === 'del' ? 'rv-del' : 'rv-fmt') });
    if(AnnoView.on && this.api.annos) for(const a of this.api.annos()){ const at = locateAnno(p, a); if(at >= 0) marks.push({ from:at, to:at + (a.quote || '').length, cls:'anno-on', anno:a.id }); }
    if(WriteCfg.开) for(const s of Trace.trim(WriteCfg.spans(t, this.api.hlExtra && this.api.hlExtra(p), this.mode), marks)) marks.push(s);
    marks.sort((a, b) => a.from - b.from || b.to - a.from);
    const cls = marks.map(m => ({ from:lim(m.from + pre), to:lim(m.to + pre), cls:m.cls, css:m.css, card:m.card, anno:m.anno })).filter(m => m.to > m.from);
    /* 样式表两种模式都铺：写作模式打字收进来的 markdown 也记在这张表上，不铺就等于记了笔糊涂账 */
    const sty = Spans.norm(p.s).map(r => ({ from:lim(pre + r.a), to:lim(pre + r.a + r.n), r })).filter(m => m.to > m.from);
    const bs = new Set([0, line.length]);
    if(line.length <= pre) return esc(line);
    for(const m of cls){ bs.add(m.from); bs.add(m.to); }
    for(const m of sty){ bs.add(m.from); bs.add(m.to); }
    const bnd = [...bs].sort((a, b) => a - b);
    const out = [];
    for(let i = 0; i + 1 < bnd.length; i++){
      const a = bnd[i], b = bnd[i + 1];
      if(b <= a) continue;
      const cm = cls.find(m => m.from <= a && m.to >= b);
      const sm = sty.find(m => m.from <= a && m.to >= b);
      const txt = esc(line.slice(a, b));
      if(!cm && !sm){ out.push(txt); continue; }
      let tag = '<span';
      if(cm) tag += ' class="' + cm.cls + '"';
      /* 规则自己定义的外观和选中字的行内样式并排写：外观在前，行内的改字盖得住它 */
      const cssTxt = ((cm && cm.css) || '') + (sm ? Spans.css(sm.r) : '');
      if(cssTxt) tag += ' style="' + cssTxt + '"';
      if(cm && cm.card) tag += ' data-card="' + cm.card + '"';
      /* 图11：批注的那几个字带上这一条批注的号，栏里那一条对得上，折线才找得到两头 */
      if(cm && cm.anno) tag += ' data-anno="' + cm.anno + '"';
      if(sm && sm.r.l) tag += ' data-href="' + esc(sm.r.l) + '"';
      out.push(tag + '>' + txt + '</span>');
    }
    return out.join('');
  }
  render(){
    const at = this.sel();
    const had = this.host.contains(document.activeElement);
    this.host.innerHTML = '';
    this.rows = [];
    const ps = this.paras;
    for(let i = 0; i < ps.length; i++) this.host.appendChild(this.row(ps[i], i).blk);
    if(had && at) this.jumpTo(at.i, at.from, at.to - at.from);
  }
  row(p, i){
    /* 图片 / 表格不是能打字的一行：整块换成控件，光标进不去，坐标尺照旧走 p.t */
    const r = { p, k:p.k, done:!!p.done, lv:p.lv || 1, comp:false, compFrom:null, sig:'', want:'', lock:false, obj:OBJ_KINDS.includes(p.k) };
    const blk = h('div', { class:this.blkClass(p) });
    if(p.k === 'todo') blk.appendChild(h('button', { class:'wnw-cb' + (p.done ? ' done' : ''), title:'完成', 'aria-label':'完成', html:icoMarkup(p.done ? 'check' : 'box'), onclick:ev => {
      ev.preventDefault();
      this.flush(); p.done = !p.done; r.done = p.done;
      ev.target.className = 'wnw-cb' + (p.done ? ' done' : '');
      ev.target.innerHTML = icoMarkup(p.done ? 'check' : 'box');
      r.blk.className = this.blkClass(p);
      this.paint(r); this.api.dirty();
    } }));
    const gut = h('div', { class:'wnw-gut', title:this.gutTip(p), html:this.gutHtml(p, i) });
    blk.appendChild(gut);
    if(r.obj){
      r.blk = blk; r.gut = gut; r.el = null; r.box = h('div', { class:'wnw-obj' });
      blk.appendChild(r.box);
      this.rows[i] = r;
      this.paintObj(r);
      gut.addEventListener('click', () => this.gutTap(r));
      return r;
    }
    const el = h('div', { class:'wnw-ce', contenteditable:'true', spellcheck:'false' });
    blk.appendChild(el);
    r.blk = blk; r.gut = gut; r.el = el;
    this.rows[i] = r;
    this.paint(r);
    el.addEventListener('input', e => { r.iType = String((e && e.inputType) || ''); this.onInput(r); });
    el.addEventListener('compositionstart', () => { r.comp = true; r.compFrom = this.lineOf(p); });
    el.addEventListener('compositionend', () => { if(!r.comp) return; r.comp = false; this.onInput(r); });
    el.addEventListener('focus', () => { this.cur = this.rows.indexOf(r); });
    el.addEventListener('blur', () => { this.flush(); this.paint(r); });
    el.addEventListener('keydown', e => this.onKey(e, r));
    el.addEventListener('paste', e => this.onPaste(e, r));
    gut.addEventListener('click', () => this.gutTap(r));
    return r;
  }
  /* 左上角那个小图标：表格那档多两件事（开改表框、删掉这张表格），其余段落照旧只改类型 */
  gutTip(p){ return p.k === 'table' ? '点击：改这张表 / 删除这张表格' : '点击改这一段是什么类型'; }
  gutTap(r){
    if(r.p.k === 'table'){
      const items = [
        { label:'改表 · 增删行列 / 改格子里的字', fn:() => this.objTable(r) },
        { label:'删除这张表格', fn:() => this.objDel(r) }
      ];
      if(this.mode === 'note') items.push({ sep:true }, { label:'这一段是什么', fn:() => this.pickType(r) });
      Menu.under(r.gut, items);
      return;
    }
    if(this.mode === 'note') this.pickType(r);
  }
  /* 段号是「第几段」，行数一变整列都得重报一遍 */
  syncGut(){
    for(let i = 0; i < this.rows.length; i++){
      const r = this.rows[i];
      if(r && r.gut) r.gut.innerHTML = this.gutHtml(r.p, i);
    }
  }
  rebuild(i){
    const old = this.rows[i];
    if(!old) return null;
    const r = this.row(old.p, i);
    old.blk.replaceWith(r.blk);
    return r;
  }
  insertRow(i, p){
    this.rows.splice(i, 0, null);
    const r = this.row(p, i);
    this.host.insertBefore(r.blk, this.host.children[i] || null);
    this.syncGut();
    return r;
  }
  removeRow(i){
    const r = this.rows[i];
    /* 行号会跟模型错位（同一章开了多个活视图时），按段落本身找 */
    const at = r ? this.paras.indexOf(r.p) : -1;
    if(at >= 0) this.paras.splice(at, 1);
    if(r && r.blk) r.blk.remove();
    this.rows.splice(i, 1);
    this.syncGut();
  }
  /* 把该画的画上：正在打字时先记下，等手停下来 / 输入法收尾再刷，别半路抢光标 */
  paint(r, caret){
    if(r.obj){ this.paintObj(r); return; }
    r.want = this.marked(r.p);
    r.blk.classList.toggle('void', !String(this.lineOf(r.p) || '').trim());
    const drift = ceText(r.el) !== this.lineOf(r.p);
    if(!drift && r.want === r.sig && caret === undefined) return;
    if(r.comp && caret === undefined){ this.settleLater(); return; }
    this.apply(r, caret);
  }
  /* 图片 / 表格两块控件：图自己找地址，表格拿 p.t 重拼格子 */
  paintObj(r){
    const p = r.p, box = r.box;
    if(!box) return;
    /* 行还没挂上宿主时也能画：innerHTML 不依赖是否在文档里，绑事件照样带过去 */
    box.innerHTML = '';
    const bar = h('div', { class:'wnw-obj-bar' });
    const mini = (label, tip, fn) => bar.appendChild(h('button', { class:'wnw-btn mini', title:tip, onclick:ev => { ev.preventDefault(); fn(); } }, label));
    if(p.k === 'img'){
      const img = h('img', { class:'wnw-img', alt:p.t || '' });
      box.appendChild(img);
      box.appendChild(h('div', { class:'wnw-hint' }, p.t || '没插图'));
      mini('换图', '换一张本地图片', () => this.api.objImage(r));
      mini('删图', '删掉这一段（图片文件留着不动）', () => this.objDel(r));
      box.appendChild(bar);
      Img.url(p.t).then(u => {
        if(!box.isConnected) return;
        if(u) img.src = u;
        else { box.innerHTML = ''; box.appendChild(h('span', { class:'wnw-img-lose' }, '找不到这张图：' + (p.t || ''))); box.appendChild(bar); }
      });
      return;
    }
    if(!Array.isArray(p.grid) || Tbl.textOf(p.grid) !== p.t) p.grid = Tbl.square(Tbl.parse(p.t), Tbl.cols(Tbl.parse(p.t)));
    if(Array.isArray(p.span)) p.span = p.span.filter(s => s && s.r < p.grid.length && s.c < Tbl.cols(p.grid));
    /* 表格下面那排按钮撤了：拖格子的边改列宽行高、右键合并拆分都在就地做，
       改表和删除这张表格收进左上角那个表格小图标。 */
    box.innerHTML = Tbl.html(p);
    TblLive.bind(box, p, {
      push:() => this.pushStep(),
      commit:() => { this.paintObj(r); this.commitSnap(); this.api.dirty(); }
    });
  }
  objDel(r){
    this.pushStep();
    this.removeRow(this.rows.indexOf(r));
    this.api.dirty();
  }
  objTable(r){
    this.pushStep();
    const p = r.p;
    TblEdit.open(p, v => {
      const was = p.t;
      p.grid = v.grid; p.span = v.span; p.t = v.t;
      shiftRuns(p, was, p.t);
      this.paintObj(r);
      this.commitSnap();
      this.api.dirty();
    });
  }
  apply(r, caret){
    const keep = caret === undefined ? this.elCaret(r) : caret;
    if(r.el.innerHTML !== r.want) r.el.innerHTML = r.want;
    r.sig = r.want;
    if(keep !== null && keep !== undefined) this.setSel(r, keep, keep);
  }
  paintAll(){ for(const r of this.rows) if(r) this.paint(r); }
  settle(){
    clearTimeout(this.timer);
    for(const r of this.rows){ if(!r || r.comp || r.obj) continue; if(r.sig !== r.want || ceText(r.el) !== this.lineOf(r.p)) this.apply(r); }
    this.commitSnap();
  }
  settleLater(){ clearTimeout(this.timer); this.timer = setTimeout(() => this.settle(), 400); }
  flush(){ this.settle(); }
  elCaret(r){
    const s = document.getSelection && getSelection();
    if(!s || !s.rangeCount || !r || !r.el) return null;
    const rg = s.getRangeAt(0);
    if(!r.el.contains(rg.endContainer)) return null;
    return cePos(r.el, rg.endContainer, rg.endOffset);
  }
  selOf(el){
    const s = document.getSelection && getSelection();
    if(!s || !s.rangeCount || !el) return { from:0, to:0 };
    const rg = s.getRangeAt(0);
    if(!el.contains(rg.startContainer) || !el.contains(rg.endContainer)) return { from:0, to:0 };
    const a = cePos(el, rg.startContainer, rg.startOffset), b = cePos(el, rg.endContainer, rg.endOffset);
    return { from:Math.min(a, b), to:Math.max(a, b) };
  }
  caretRect(){
    const s = document.getSelection && getSelection();
    if(!s || !s.rangeCount) return null;
    const rg = s.getRangeAt(0);
    const rc = rg.getClientRects();
    if(rc && rc.length) return rc[rc.length - 1];
    const b = rg.getBoundingClientRect();
    return b && (b.width || b.height) ? b : null;
  }
  /* 选区换成模型（p.t）坐标；笔记模式的 markdown 记号在前缀里，减掉 */
  sel(){
    const s = document.getSelection && getSelection();
    if(!s || !s.rangeCount) return null;
    const rg = s.getRangeAt(0);
    for(let i = 0; i < this.rows.length; i++){
      const r = this.rows[i];
      if(!r || !r.el || !r.el.contains(rg.startContainer) || !r.el.contains(rg.endContainer)) continue;
      const t = r.p.t || '', pre = this.lineOf(r.p).length - t.length;
      const cl = (x) => Math.max(0, Math.min(t.length, x - pre));
      const a = cl(cePos(r.el, rg.startContainer, rg.startOffset)), b = cl(cePos(r.el, rg.endContainer, rg.endOffset));
      return { r, i, p:r.p, from:Math.min(a, b), to:Math.max(a, b), quote:t.slice(Math.min(a, b), Math.max(a, b)) };
    }
    return null;
  }
  setSel(r, a, b){
    if(!r || !r.el || !r.el.isConnected) return;
    const len = ceText(r.el).length;
    a = Math.max(0, Math.min(len, a)); b = Math.max(0, Math.min(len, b));
    const p1 = cePoint(r.el, a), p2 = b === a ? p1 : cePoint(r.el, b);
    const s = getSelection(); if(!s) return;
    r.el.focus();
    s.removeAllRanges();
    const rg = document.createRange();
    rg.setStart(p1[0], p1[1]); rg.setEnd(p2[0], p2[1]);
    s.addRange(rg);
  }
  jumpTo(i, at, len){
    const r = this.rows[i]; if(!r) return;
    const pre = this.lineOf(r.p).length - (r.p.t || '').length;
    this.setSel(r, at + pre, at + len + pre);
    r.el.scrollIntoView({ block:'center' });
  }
  /* ---------- 打字 ---------- */
  setModel(r, v){
    const p = r.p, oldT = p.t || '';
    let d = null;
    if(this.mode === 'note') d = mdInto(p, v);
    else p.t = v;
    shiftRuns(p, oldT, p.t);
    if(d) applyMdSpans(p, d.runs);
  }
  onInput(r){
    if(r.lock) return;
    const v = ceText(r.el);
    if(r.comp){ this.setModel(r, v); this.api.dirty(); return; }
    this.commit(r, v, r.compFrom);
    r.compFrom = null;
  }
  commit(r, v, compFrom){
    const p = r.p;
    const before = compFrom === null || compFrom === undefined ? this.lineOf(p) : compFrom;
    if(nlCount(v) > nlCount(before)){
      /* #254 删字 / 打字都不该凭空长段落：Chrome 把内容删空、删回行尾，或原生回车 / 输入法顶出来时，
         会在 contenteditable 里垫一个 <br> 或 <div><br></div> 占位块好让光标有地方落；
         ceText 把块边界和 br 各数成一个换行，这一步就误判成「多打了换行」，splitNL 拆出空白的后序段落 ——
         他说的那个 bug 就是这么来的（实测：占位块在场时打一个 x，段后就多出两段空的）。
         真想换行的入口 inputType 都是 insertLineBreak / insertParagraph / 粘贴 / 输入法确认；
         逐字打字（insertText）和删字（delete*）带回来的尾巴换行全是这一层垫的，裁掉再走普通提交，
         后面 paint 发现 DOM 和模型对不上会按模型重写，占位块顺手清干净。
         中间真有换行（光标停在垫出来的空行里打字那类）照旧拆段。 */
      if(/^(delete|insertText$|insertReplacementText$)/.test(r.iType || '')){
        const cut = v.replace(/\n+$/, '');
        if(nlCount(cut) <= nlCount(before)) v = cut;
        else { this.splitNL(r, cut); return; }
      } else { this.splitNL(r, v); return; }
    }
    /* 写作模式不碰 markdown：打进去的字原样进模型，记号就是记号；
       修订开着的时候记进了痕迹账，笔记模式没有账，直接按行首记号换块类型 */
    if(this.mode !== 'note' && this.revOn){
      const g = this.record(p, before, v);
      if(g){ this.setModel(r, g.text); this.paint(this.typeCheck(r), g.caret); }
      else { this.setModel(r, v); this.paint(this.typeCheck(r)); }
    } else {
      const at = this.mode === 'note' ? this.elCaret(r) : null;
      this.setModel(r, v);
      this.paint(this.typeCheck(r), this.caretInLine(r.p, v, at));
    }
    this.api.dirty();
    this.settleLater();
  }
  /* 行首记号变了 → 整段重排（样式、左侧标记、层级缩进跟着换）。返回换完那一行，旧行已经离开 DOM */
  typeCheck(r){
    if(r.k === r.p.k && r.done === !!r.p.done && r.lv === (r.p.lv || 1)) return r;
    const i = this.rows.indexOf(r), off = this.elCaret(r);
    const nr = this.rebuild(i);
    if(off !== null && nr) this.setSel(nr, off, off);
    return nr || r;
  }
  /* 光标在整行（含行首记号）上的落点：记号吃掉几个字就退几个字，行内记号照 map 换算，
     最后把 mdOf 重新摆出来的前缀长度加回去 —— 屏上算前缀，模型里不算，两边对不上光标就会跳。 */
  caretInLine(p, raw, at){
    if(at === null || at === undefined) return undefined;
    const d = mdParse(String(raw == null ? '' : raw));
    let x = d.mark ? at - d.pre : at;
    const r = Spans.mdInline(d.t);
    if(r) x = r.map[x] == null ? r.t.length : r.map[x];
    const t = p.t || '';
    x = Math.max(0, Math.min(t.length, x));
    return (this.lineOf(p).length - t.length) + x;
  }
  /* 修订记录：删掉的文字放回原位划掉，插进去的字留在原位划线 */
  record(p, before, after){ return recordRev(p, before, after); }
  /* 段里多出来的换行（输入法确认、粘贴多行）→ 按换行拆段 */
  splitNL(r, v){
    const i = this.rows.indexOf(r);
    const parts = v.split('\n');
    let line = 0, off = 0, rest = this.selOf(r.el).from;
    for(let k = 0; k < parts.length; k++){ if(rest <= parts[k].length){ line = k; off = rest; break; } rest -= parts[k].length + 1; }
    const nk = r.p.k;
    this.setModel(r, parts[0]);
    const add = [];
    for(let k = 1; k < parts.length; k++){
      const q = newPara(this.mode === 'note' ? nk : 'p', parts[k]);
      mdFill(q, parts[k], this.mode === 'note');
      add.push(q);
    }
    this.paras.splice(i + 1, 0, ...add);
    for(let k = 0; k < add.length; k++) this.insertRow(i + 1 + k, add[k]);
    this.paint(r);
    this.typeCheck(r);
    const tr = this.rows[Math.min(i + line, this.rows.length - 1)];
    const o = tr ? this.caretInLine(tr.p, parts[line], off) : off;
    this.setSel(tr, o, o);
    this.api.dirty();
    this.settleLater();
  }
  split(r){
    const i = this.rows.indexOf(r);
    const v = ceText(r.el), s = this.selOf(r.el);
    const head = v.slice(0, s.from), tail = v.slice(s.to);
    /* 后半截身上戴的样式要跟着搬过去：选区是行坐标，先折回 p.t 坐标 */
    const pre = this.lineOf(r.p).length - (r.p.t || '').length;
    const tailRuns = Spans.slice(r.p.s || [], Math.max(0, s.to - pre), Infinity);
    this.setModel(r, head);
    const q = newPara(['ul', 'ol', 'todo'].includes(r.p.k) ? r.p.k : 'p', tail);
    if(q.k !== 'p' && r.p.lv > 1) q.lv = r.p.lv;
    mdFill(q, tail, this.mode === 'note');
    q.s = Spans.norm((q.s || []).concat(tailRuns));
    this.paras.splice(i + 1, 0, q);
    const nr = this.insertRow(i + 1, q);
    this.paint(r);
    this.setSel(nr, 0, 0);
    this.api.dirty();
    this.settleLater();
  }
  mergeUp(r){
    const i = this.rows.indexOf(r);
    if(i <= 0) return;
    const up = this.rows[i - 1];
    const uv = ceText(up.el);
    const rText = r.p.t || '', rRuns = Spans.norm(r.p.s);
    this.setModel(up, uv + ceText(r.el));
    /* 并进来那段挪到合并后的尾巴上：偏移按新文本倒着算，笔记模式的前缀混进来也不会错位 */
    const off = Math.max(0, (up.p.t || '').length - rText.length);
    up.p.s = Spans.norm((up.p.s || []).concat(Spans.move(rRuns, off)));
    this.removeRow(i);
    this.paint(up);
    this.setSel(up, uv.length, uv.length);
    this.api.dirty();
    this.settleLater();
  }
  onKey(e, r){
    if(e.isComposing || e.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = String(e.key || '').toLowerCase();
    if(mod && k === 'z'){ e.preventDefault(); if(e.shiftKey) this.redoStep(); else this.undoStep(); return; }
    if(mod && k === 'y'){ e.preventDefault(); this.redoStep(); return; }
    if(mod && k === 's'){ e.preventDefault(); this.api.save(true); return; }
    /* Ctrl+A：正文一段一个可编辑块，浏览器默认只在你光标待着那一块里全选 —— 那是「选一段」不是「选全文」。
       这里接一手：范围铺满这一个编辑器里的所有段。章纲、笔记各自是另一个编辑器，互不牵连。
       只有一段时不插手（浏览器自己那条就是全选）。 */
    if(mod && k === 'a' && !e.altKey && !e.shiftKey){
      const els = this.rows.filter(x => x && x.el && document.contains(x.el));
      if(els.length < 2) return;
      e.preventDefault();
      const s = window.getSelection && window.getSelection(); if(!s) return;
      const rg = document.createRange(), last = els[els.length - 1].el;
      rg.setStart(els[0].el, 0); rg.setEnd(last, last.childNodes.length);
      s.removeAllRanges(); s.addRange(rg);
      return;
    }
    if(k === 'enter' && !e.shiftKey && !mod){ e.preventDefault(); this.flush(); this.split(r); return; }
    if(k === 'tab' && !mod){ e.preventDefault(); if(!this.insertText('  ')) this.onInput(r); return; }
    if(k === 'backspace'){
      const s = this.selOf(r.el);
      if(s.from === 0 && s.to === 0 && this.rows.indexOf(r) > 0){ e.preventDefault(); this.flush(); this.mergeUp(r); }
      return;
    }
    if(k === 'arrowup' || k === 'arrowdown'){
      const i = this.rows.indexOf(r), j = k === 'arrowup' ? i - 1 : i + 1;
      const t2 = this.rows[j];
      if(!t2) return;
      const rc = this.caretRect();
      if(!rc) return;
      const box = r.el.getBoundingClientRect();
      const first = rc.top - box.top <= 4, last = box.bottom - rc.bottom <= 4;
      if((k === 'arrowup' && !first) || (k === 'arrowdown' && !last)) return;
      e.preventDefault();
      this.setSel(t2, k === 'arrowup' ? ceText(t2.el).length : 0, k === 'arrowup' ? ceText(t2.el).length : 0);
    }
  }
  insertText(t){
    const ok = document.execCommand('insertText', false, t);
    if(ok) return true;
    const s = getSelection();
    if(s && s.rangeCount){ const rg = s.getRangeAt(0); rg.deleteContents(); rg.insertNode(document.createTextNode(t)); }
    return false;
  }
  onPaste(e, r){
    /* 只收纯文本：富文本一律剥掉样式，多个换行由 input 那边拆成几段 */
    e.preventDefault();
    const cd = e.clipboardData || window.clipboardData;
    const t = cd ? cd.getData('text/plain') : '';
    if(!t) return;
    this.flush();
    /* 笔记模式贴进来整串是个网址：走「抓标题当显示名」那条路 */
    if(this.mode === 'note' && URL_RE.test(t.trim())){ this.pasteLink(r, t.trim()); return; }
    if(!this.insertText(t)) this.onInput(r);
  }
  async pasteLink(r, url){
    const s0 = this.sel();
    if(!s0) return;
    const at = this.elCaret(r);
    let label = '';
    try{ label = await urlTitle(url); }catch(e){ label = ''; }
    label = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if(!label){ label = url; toast('抓不到这页的标题（站点不回应，或跨站读不了），照原样贴网址'); }
    if(!r.el || !r.el.isConnected || this.rows.indexOf(r) < 0) return;
    if(at !== null && at !== undefined) this.setSel(r, at, at);
    this.insertText(label);
    this.settle();
    /* 贴进去的这一截整体挂链接；settle 已把 DOM 变化落回模型，坐标按 p.t 算 */
    s0.p.s = Spans.set(s0.p.s, s0.from, s0.from + label.length, { l:url });
    this.paint(r);
    const pre = this.lineOf(s0.p).length - (s0.p.t || '').length;
    this.setSel(r, s0.from + label.length + pre, s0.from + label.length + pre);
    this.commitSnap();
    this.api.dirty();
  }
  pickType(r){
    const box = h('div', { class:'wnw-grid-pick' });
    for(const b of (this.api.blocks || BLOCKS)){
      box.appendChild(h('button', { class:'wnw-btn' + (r.p.k === b.k ? ' primary' : ''), onclick:() => {
        Overlay.close();
        const old = r.p.k;
        if(old === b.k) return;
        this.flush();
        r.p.k = b.k;
        if(b.k !== 'todo') r.p.done = false;
        if(this.revOn) Trace.mark(r.p, 'fmt', 0, '', { k:b.k, k0:old });
        const i = this.rows.indexOf(r), off = this.elCaret(r);
        const nr = this.rebuild(i);
        if(off !== null && nr) this.setSel(nr, off, off);
        this.api.dirty();
      }}, b.name));
    }
    Overlay.open('这一段是什么', box);
  }
  /* ---------- 撤销 / 重做：自己攒快照，不用自带的撤销栈 ---------- */
  snapshot(){ return JSON.stringify(this.paras); }
  /* 整段改写之前按一下：撤回一步就回到改写前 */
  pushStep(){ this.flush(); this.undo.push(this.snapshot()); if(this.undo.length > 80) this.undo.shift(); this.redo.length = 0; this.base = this.snapshot(); }
  commitSnap(){
    const now = this.snapshot();
    if(now === this.base) return;
    this.undo.push(this.base);
    if(this.undo.length > 80) this.undo.shift();
    this.redo.length = 0;
    this.base = now;
  }
  undoStep(){
    this.flush();
    if(!this.undo.length){ toast('这里到头了，再往前用历史版本'); return; }
    const at = this.sel();
    this.redo.push(this.snapshot());
    this.paste(this.undo.pop(), at);
  }
  redoStep(){
    if(!this.redo.length) return;
    const at = this.sel();
    this.undo.push(this.snapshot());
    this.paste(this.redo.pop(), at);
  }
  paste(json, at){
    const arr = JSON.parse(json);
    const a = this.paras;
    a.length = 0;
    for(const p of arr) a.push(p);
    this.base = this.snapshot();
    this.render();
    if(at) this.jumpTo(at.i, at.from, at.to - at.from);
    this.api.dirty();
  }
}

/* ============================================================
   章节视图：章纲卡片 + 正文 + 工具栏 + 修订 + 版本
   ============================================================ */
/* 开着的章：id → ChView，替换和一键排版要靠它走撤销栈 */
const ChOpen = new Map();
class ChView{
  constructor(host, ctx){ this.host = host; this.ctx = ctx; this.c = null; this.cur = 0; this.dirtyTimer = null; }
  async boot(){
    const id = this.ctx.ref;
    this.c = await Work.ch(id);
    if(!this.c){ this.host.appendChild(h('div', { class:'wnw-empty' }, '这一章不存在了')); return; }
    Work.cur = id;
    /* 哪一档存着东西就开哪一档（外25 第 8 条）：上次用的那一档已经空了、另一档有字，开门就替它翻过去，
       别让一打开面对的是一整屏空行。两边都有（正文和词格都写着字）就照上次用的那一档，不替他猜。 */
    const k0 = modeShown(this.c.mode, parasCount(this.c.paras).w > 0, lyricFilled(this.c));
    if(k0 !== this.c.mode) this.c.mode = k0;
    this.plain();
    await this.draw();
    /* 逐字记录的起点：这一章打开成什么样就先抄一份，之后每次改动跟这份对 */
    this.kWas = (this.c.paras || []).map(p => p.t || '');
    /* 查找里跳过来的：这一章刚开好，位置记在 FindJump 上 */
    if(FindJump && FindJump.ch === id){ const j = FindJump; FindJump = null; this.gotoHit(j); }
    const on = this.ctx.on || ((k, f) => Bus.on(k, f));
    on('desk:anno', () => { if(this.ed) this.ed.paintAll(); this.drawSide(); });
    on('desk:hl', () => { if(this.ed) this.ed.paintAll(); if(this.olEd) this.olEd.paintAll(); this.askMid(); });
    on('desk:rev', () => this.redraw());
    on('type:set', () => this.syncTypeRow());
    /* 灵感 / 卡片往正文里投一段：谁最后打开，就投进谁这一章。词格那一档投进来的是一行格子 */
    const sink = (text, k) => {
      if(this.c.mode === LYRIC_MODE && this.grid) return this.grid.pourIn(text);
      this.c.paras.push(newPara('p', text)); this.dirty(); this.drawBody(); return true;
    };
    ChPlug.sink = sink;
    /* 开着的章登记在这里，书内查找换完字以后能让它们进撤销栈并当场刷新 */
    ChOpen.set(id, this);
    /* 选区一挪就同步样式那一组的亮块：打字时事件很密，攒到一帧再算 */
    let pend = false;
    this.selWatch = () => { if(pend) return; pend = true; requestAnimationFrame(() => { pend = false;
      if(this.bodyBox && this.bodyBox.contains(document.activeElement)) this.syncFmt(); }); };
    document.addEventListener('selectionchange', this.selWatch);
    /* 图11：折线两头是量出来的，窗口一宽一窄就得重算 */
    this.linkWatch = () => this.syncLinksSoon();
    window.addEventListener('resize', this.linkWatch);
    if(this.ctx.dispose) this.ctx.dispose(() => {
      if(ChPlug.sink === sink) ChPlug.sink = null;
      if(ChOpen.get(id) === this) ChOpen.delete(id);
      if(this.selWatch){ document.removeEventListener('selectionchange', this.selWatch); this.selWatch = null; }
      if(this.linkWatch){ window.removeEventListener('resize', this.linkWatch); this.linkWatch = null; }
    });
    Desk.noteRecent('ch', id, this.c.title);
  }
  /* 写作模式只有正文：标题 / 列表 / 待办是笔记 / 富文本模式的东西。
     块类型退回段落时把行首记号摆回字里（## 的 → 普通字），切回笔记模式还能原样认回来，
     不然切一次模式就把人家的记号吞了。词格那一档的正文不住在 c.paras（住在 c.lyric，真源是 lyrics\\ 那个文件），
     切进去切出来都不许碰它那几段。 */
  plain(){
    if(this.c.mode === 'note' || this.c.mode === LYRIC_MODE) return;
    for(const p of this.c.paras){
      if(OBJ_KINDS.includes(p.k) || (p.k === 'p' && !p.done)) continue;
      const was = p.t;
      p.t = mdOf(p); p.k = 'p'; p.done = false; p.lv = undefined;
      shiftRuns(p, was, p.t);
    }
  }
  async draw(){
    this.host.innerHTML = '';
    const wrap = h('div', { class:'wnw-doc-wrap' });
    this.host.appendChild(wrap);
    this.topBox = h('div', {});
    wrap.appendChild(this.topBox);
    this.topBox.appendChild(this.head());
    this.bodyBox = h('div', { class:'wnw-doc' });
    /* 光标落到哪一段，块类型那一组就亮哪一个 */
    this.bodyBox.addEventListener('focusin', () => this.syncFmt());
    /* 图11：正文滚起来两头都在动，折线跟着这一列的滚动重算（这一格每次 draw 都是新的，不会攒） */
    this.bodyBox.addEventListener('scroll', () => this.syncLinksSoon(), { passive:true });
    wrap.appendChild(this.bodyBox);
    this.foot = h('div', { class:'wnw-doc-foot' });
    wrap.appendChild(this.foot);
    this.buildBody();
    this.drawFoot();
  }
  head(){
    const c = this.c;
    const top = h('div', { class:'wnw-doc-top' });
    this.docTop = top;
    const name = h('div', { class:'wnw-doc-name' }, [
      h('span', { class:'wnw-hint' }, Work.book.title),
      h('input', { class:'wnw-input', value:c.title, oninput:e => { c.title = e.target.value; this.dirty(); },
        onkeydown:e => { if(e.key === 'Enter') e.target.blur(); } }),
      h('span', { style:'flex:1' })
    ]);
    /* 模式不换第三个按钮：这一个显示当前那一档，点开下拉换（词格进下拉，不并排） */
    const MODE_IT = [['write', '写作模式'], ['note', '笔记 / 富文本模式'], [LYRIC_MODE, '词格模式']];
    const now = MODE_IT.find(m => m[0] === c.mode) || MODE_IT[0];
    const seg = h('div', { class:'wnw-seg' });
    seg.appendChild(h('button', { class:'on', title:'点开换这一屏的模式', onclick:ev => Menu.under(ev.currentTarget,
      MODE_IT.map(m => ({ label:m[1], on:c.mode === m[0], fn:() => this.setMode(m[0]) }))) },
      [h('span', {}, now[1]), h('i', { html:icoMarkup('caretDown') })]));
    name.appendChild(seg);
    top.appendChild(name);
    /* 词格这一档不摆工具条和版式那一行：块类型、样式、markdown 都进不来，动作在格子那排自己的头上 */
    if(c.mode !== LYRIC_MODE){ top.appendChild(this.toolbar()); top.appendChild(this.fmtRow()); }
    return top;
  }
  /* 换模式：切档不改另一档的数据 —— 词格那份挂在 c.lyric，正文那几段 c.paras 原样留着，切回去还在 */
  setMode(k){
    const c = this.c;
    if(c.mode === k) return;
    c.mode = k; this.plain(); this.dirty(); this.draw();
    /* 左栏那一行的模式图标跟着这一趟就改（外32 图5：「切换写作、笔记/富文本、词格模式，
       章节前的图标应当立即变化」）。从前只有自动保存落盘那一下（停下 1.2 秒）才有人重画左栏。 */
    Bus.emit('ch:mode', c.id);
  }
  /* ---------- 工具条：非排版的动作，图标 + 汉字 ---------- */
  toolbar(){
    const t = h('div', { class:'wnw-tools' });
    const btn = (ico, txt, title, fn, on) => t.appendChild(h('button', { title, class:on ? 'on' : '',
      'aria-label':txt, html:icoMarkup(ico), onclick:fn }, txt));
    btn('undo', '撤回', '撤回这一步', () => this.ed && this.ed.undoStep());
    btn('redo', '重做', '重做这一步', () => this.ed && this.ed.redoStep());
    t.appendChild(h('i', { class:'sp' }));
    btn('anno', '批注', '选中文字后点这里是加批注；没选中点开这里是显示 / 隐藏 / 删除', ev => this.annoBtn(ev.currentTarget), this.showSide !== false);
    btn('rev', '修订', this.c.revOn ? '正在记录改动' : '不记录改动', () => this.toggleRev(), !!this.c.revOn);
    t.appendChild(h('i', { class:'sp' }));
    btn('findBook', '书内查找', '在这一本书里找 · 找到就能换（Ctrl+F 是窗口自带的查找）', () => this.findBookDlg());
    btn('findAll', '全局查找', '在所有书的所有地方找', () => this.findAllDlg());
    btn('speak', '朗读', '朗读本章，再点停下', () => this.speak());
    t.appendChild(h('i', { class:'sp' }));
    btn('ver', '历史版本', '看 / 存 / 回退', () => this.verDlg());
    btn('exp', '导出', '导出本章', () => this.exportDlg());
    btn('expBook', '整本导出', '整本书 / 整卷导出成文稿文件夹（exe 里用）', () => BookExport.dlg('book'));
    btn('tidy', '一键排版', '整章按设置里定义的版式重排', () => this.tidyDlg());
    return t;
  }
  /* ---------- 版式一行：只有图标，形状照 Word 那排符号的意思，平铺一行装不下就横向滚 ---------- */
  fmtRow(){
    const row = h('div', { class:'wnw-fmt' });
    const syncers = [];
    const watch = f => { syncers.push(f); f(); };
    const grp = () => { const g = h('div', { class:'g' }); row.appendChild(g); return g; };
    const sp = () => row.appendChild(h('i', { class:'sp' }));
    /* 组名不写字，前面那个图标就是说明（悬停有汉字） */
    const mk = (g, ico, tip) => g.appendChild(h('span', { class:'mk', title:tip, 'aria-label':tip, html:icoMarkup(ico) }));
    /* 图标按钮：对齐、块类型这两组摆 icons\ 里的图（it[2] 是图标名，悬停汉字是 it[1]）；
       行距 / 段距 / 空行那几组摆的是数字和符号，照旧写字（it[2] 是说明） */
    const bt = (it, tip, ico) => ico ? h('button', { title:tip || it[1], 'aria-label':tip || it[1], html:icoMarkup(it[2]) })
      : h('button', { title:tip || it[2] || String(it[1]) }, it[1]);
    const seg = (g, items, get, set, ico) => {
      const bs = [];
      for(const it of items){
        const b = bt(it, null, ico);
        b.onclick = () => { for(const x of g.children) if(x.tagName === 'BUTTON') x.classList.remove('on'); b.classList.add('on'); set(it[0]); };
        g.appendChild(b); bs.push([b, it[0]]);
      }
      const sync = () => { const cur = get(); for(const [b, k] of bs) b.classList.toggle('on', k === cur); };
      watch(sync);
    };
    /* 块类型和样式两组只有笔记 / 富文本模式摆：写作模式靠打字认 markdown 来改块类型和加样式 */
    if(this.c.mode === 'note'){
      const g = grp();
      this.kGrp = g;
      for(const it of K_IT){
        const b = bt(it, null, true);
        b.onclick = () => { this.setK(it[0]); this.syncFmt(); };
        g.appendChild(b);
      }
      sp();
      const rg = grp();
      this.rBtns = {};
      for(const [key, s, tip] of RICH_IT){
        const b = h('button', { title:tip }, s);
        b.onclick = () => this.richToggle(key);
        this.rBtns[key] = b; rg.appendChild(b);
      }
      const col = h('input', { type:'color', title:'字色', value:'#c0392b', style:'width:26px;height:22px;padding:0;border:0;background:transparent' });
      col.oninput = () => this.richSet({ c:col.value });
      const hl = h('input', { type:'color', title:'手动高亮：无视高亮规则，直接给这几个字铺底色', value:'#ffe58a',
        style:'width:26px;height:22px;padding:0;border:0;background:transparent' });
      hl.oninput = () => this.richSet({ h:hl.value });
      rg.appendChild(col); rg.appendChild(hl);
      const only = (ico, tip, fn) => rg.appendChild(h('button', { title:tip, 'aria-label':tip, html:icoMarkup(ico), onclick:fn }));
      only('link', '给选中的字挂链接', () => this.linkDlg());
      only('clear', '清掉选中范围里的全部内联样式', () => this.richSet({ b:0, i:0, u:0, s:0, c:'', h:'', l:'' }));
      only('img', '插一段本地图片：Flow-Desk.exe 存进 <书名>/assets/，稿里记相对路径', () => this.insImage(null));
      only('tbl', '插一张简易表格：拖格子的边改列宽行高，右键合并、拆分', () => this.insTable());
      sp();
    } else { this.kGrp = null; this.rBtns = null; }
    const al = grp();
    seg(al, ALIGN_IT, () => Type.cur.对齐, v => Type.set('对齐', v), true);
    sp();
    const id = grp();
    const ib = h('button', { title:'首行缩进两字', 'aria-label':'首行缩进两字', html:icoMarkup('indent') });
    ib.onclick = () => Type.set('缩进', !Type.cur.缩进);
    id.appendChild(ib);
    watch(() => ib.classList.toggle('on', !!Type.cur.缩进));
    /* 缩进 / 行距 / 段距 / 空行 四组各是各的事，中间一道竖线分开，别挤成一团 */
    sp();
    const lg = grp(); mk(lg, 'lh', '行距');
    seg(lg, LH_IT.map(v => [v, String(v), '行距 ' + v]), () => Type.cur.行距, v => Type.set('行距', v));
    sp();
    const pg = grp(); mk(pg, 'pg', '段间距');
    seg(pg, PG_IT.map(v => [v, String(v), '段间距 ' + v + ' 像素']), () => Type.cur.段距, v => Type.set('段距', v));
    sp();
    const bl = grp(); mk(bl, 'blank', '段落空行');
    seg(bl, BLANK_IT, () => Type.cur.空行, v => Type.set('空行', v));
    sp();
    const fg = grp(); mk(fg, 'size', '正文字号');
    const fsSel = h('select', { title:'正文字号' });
    for(const s of Fs.steps) fsSel.appendChild(h('option', { value:String(s), style:'font-size:' + s + 'px' }, s + 'px'));
    fsSel.onchange = async () => { await Fs.edit(Fs.now, { doc:parseInt(fsSel.value, 10) }); };
    fg.appendChild(fsSel);
    watch(() => { fsSel.value = String(Fs.cur().doc); });
    sp();
    const wg = grp();
    this.wBtns = {};
    const numW = h('input', { type:'number', min:'360', max:'2400', step:'20', title:'自定义栏宽（像素）' });
    numW.value = '900';
    numW.onchange = () => { const v = String(Math.min(2400, Math.max(360, parseInt(numW.value, 10) || 900)));
      numW.value = v; State.set('doc-w', v); Shell.applyDocW(); this.syncWidth(); };
    for(const [k, ico, tip] of [['820', 'w-mid', '栏宽 820 居中'], ['fill', 'w-fill', '铺满这一栏'], ['cst', 'pencil', '自定义栏宽']]){
      const b = h('button', { title:tip, 'aria-label':tip, html:icoMarkup(ico) });
      b.onclick = () => { const v = k === 'cst' ? numW.value : k; State.set('doc-w', v); Shell.applyDocW(); this.syncWidth(); };
      this.wBtns[k] = b; wg.appendChild(b);
    }
    wg.appendChild(numW);
    this.numW = numW;
    this.syncWidth();
    this.typeSyncers = syncers;
    return row;
  }
  /* 设置里的版式改完，顶端这一行跟着亮同一档 */
  syncTypeRow(){ for(const f of this.typeSyncers || []) f(); this.syncWidth(); }
  async syncWidth(){
    const v = String(await State.get('doc-w', '820'));
    const cst = /^\d+$/.test(v) && v !== '820';
    for(const [k, b] of Object.entries(this.wBtns || {})) b.classList.toggle('on', k === 'fill' ? v === 'fill' : (k === 'cst' ? cst : (!cst && v === '820')));
    if(this.numW){ this.numW.style.display = cst ? '' : 'none'; if(cst) this.numW.value = v; }
  }
  /* 光标挪了以后把块类型那一组的亮块跟上 */
  syncFmt(){
    if(!this.kGrp) return;
    const r = this.ed && this.ed.curRow();
    const k = r ? r.p.k : '';
    for(let i = 0; i < this.kGrp.children.length; i++)
      this.kGrp.children[i].classList.toggle('on', K_IT[i][0] === k);
    const s = this.richRange();
    for(const [key, b] of Object.entries(this.rBtns || {}))
      b.classList.toggle('on', !!s && Spans.all(s.p.s, s.from, s.to, key));
  }
  /* ---------- 内联样式：只吃选区，光标不选中就不动 ---------- */
  richRange(){
    const s = this.ed && this.ed.sel();
    return s && s.to > s.from ? s : null;
  }
  richSet(props){
    const s = this.richRange(); if(!s) return;
    s.p.s = Spans.set(s.p.s, s.from, s.to, props);
    this.ed.paint(s.r);
    /* 重画会把选区收成光标，按 p.t 坐标还原成原来那一段 */
    const pre = this.ed.lineOf(s.p).length - (s.p.t || '').length;
    this.ed.setSel(s.r, s.from + pre, s.to + pre);
    this.syncFmt();
    this.ed.commitSnap();
    this.dirty();
  }
  richToggle(key){
    const s = this.richRange(); if(!s) return;
    this.richSet({ [key]: Spans.all(s.p.s, s.from, s.to, key) ? 0 : 1 });
  }
  /* 链接：地址 + 显示名，名字空着就用选中的字 */
  linkDlg(){
    const s = this.richRange();
    if(!s){ toast('先选中要挂链接的字'); return; }
    const cur = (Spans.norm(s.p.s).find(r => r.a <= s.from && r.a + r.n > s.from) || {}).l || '';
    const url = h('input', { class:'wnw-input wnw-mono', placeholder:'https://', value:cur, style:'flex:1' });
    const box = h('div', { class:'wnw-grid' }, [url]);
    const ok = () => { const v = url.value.trim(); Overlay.close(); if(v) this.richSet({ l:v }); };
    url.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); Overlay.close(); const v = url.value.trim(); if(v) this.richSet({ l:v }); } };
    Overlay.open('给选中的字挂链接', box,
      [h('button', { class:'wnw-btn', onclick:() => Overlay.close() }, '取消'),
       h('button', { class:'wnw-btn primary', onclick:ok }, '确定')]);
    setTimeout(() => { url.focus(); url.select(); }, 30);
  }
  /* ---------- 图片 / 表格：各自一段，块里摆控件 ---------- */
  async insImage(r){
    let got = [];
    try{ got = await Img.pick(); }catch(e){ toast('选图没走通：' + (e && e.message || e)); return; }
    if(!got.length) return;
    const ed = this.ed;
    ed.pushStep();
    if(r){ r.p.t = got[0].rel; ed.paint(r); }
    else{
      const at = Math.max(0, this.c.paras.indexOf((ed.curRow() || {}).p));
      for(let k = 0; k < got.length; k++){
        const p = newPara('img', got[k].rel);
        this.c.paras.splice(at + 1 + k, 0, p);
        ed.insertRow(at + 1 + k, p);
      }
    }
    this.dirty();
    toast(got[0].where === 'file' ? '图已存进 ' + Img.dir() + '/' + got[0].rel + '，稿子里记的是相对路径'
      : '开发服务器写不了文件：这张图存进了本文件库（导出 Word 照样带上），换到 Flow-Desk.exe 请重新插图');
  }
  /* 插一张 2×2 表格，后面紧跟一个空段，光标落在空段上接着写。
     不自动开改表框：表格就地能拖、能右键合并，弹一层反而把光标盖没了。 */
  insTable(){
    const ed = this.ed;
    const g = [['', ''], ['', '']];
    const p = newPara('table', Tbl.textOf(g));
    p.grid = g; p.span = [];
    const gap = newPara('p', '');
    ed.pushStep();
    const at = Math.max(0, this.c.paras.indexOf((ed.curRow() || {}).p));
    this.c.paras.splice(at + 1, 0, p, gap);
    ed.insertRow(at + 1, p);
    ed.insertRow(at + 2, gap);
    ed.jumpTo(at + 2, 0, 0);
    this.dirty();
  }
  setK(k){
    const ed = this.ed;
    const r = ed && ed.curRow();
    if(!r){ toast('先把光标放到某一段上'); return; }
    const old = r.p.k;
    if(old === k) return;
    ed.flush();
    r.p.k = k;
    if(k !== 'todo') r.p.done = false;
    if(this.c.revOn) Trace.mark(r.p, 'fmt', 0, '', { k, k0:old });
    ed.rebuild(ed.rows.indexOf(r));
    this.dirty();
  }
  /* ---------- 正文区：章纲卡片 + 单层正文 + 右侧批注 / 痕迹 ---------- */
  buildBody(){
    this.bodyBox.innerHTML = '';
    this.midBox = h('div', { class:'wnw-midask', style:'display:none' });
    this.docTop.appendChild(this.midBox);
    this.olSlot = h('div', { class:'wnw-colw' });
    this.edHost = h('div', { class:'wnw-doc-inner wnw-body' });
    this.sideBox = h('div', { class:'wnw-side' });
    /* 折叠时留一条竖边当展开入口：栏里没内容就整条消失，收起之后就再也找不回来了 */
    this.sideTab = h('button', { class:'wnw-side-tab', title:'展开批注 / 修订痕迹',
      onclick:() => { this.showSide = true; this.drawSide(); } }, h('span', {}, '批注 / 修订痕迹'));
    /* 章纲卡片摆在正文同一列里：批注那一栏占掉的宽度两边一起让，卡片才不会比正文宽出一截 */
    this.flow = h('div', { class:'wnw-flow' });
    /* 图11：批注原文 ↔ 栏里那一条的折线铺在这一层（svg 得走 createElementNS，h() 那把造的是普通元素） */
    this.linkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.linkSvg.setAttribute('class', 'wnw-link');
    this.linkSvg.setAttribute('aria-hidden', 'true');
    this.flow.appendChild(this.linkSvg);
    this.bodyBox.appendChild(this.flow);
    this.flow.appendChild(h('div', { class:'wnw-ed-col' }, [this.olSlot, this.edHost]));
    this.flow.appendChild(this.sideBox);
    this.flow.appendChild(this.sideTab);
    const c = this.c;
    this.grid = null;
    /* 词格这一档：正文是一排格子，不是编辑器 —— 章纲卡片、批注那一栏、右键那套都不建 */
    if(c.mode === LYRIC_MODE){
      this.ed = null;
      this.sideBox.style.display = 'none';
      this.sideTab.style.display = 'none';
      this.grid = new LyricGrid(this.edHost, this);
      this.grid.boot();
      return;
    }
    this.ed = new CeEd(this.edHost, {
      paras:() => c.paras, mode:() => c.mode,
      revOn:() => !!c.revOn,
      annos:() => c.annos,
      dirty:() => this.dirty(),
      /* 外13-L：高亮要把「这一段自己挂上来的卡」也算进去，所以把整段递给 CardHl.spans，
         段上的 cards 和卡片发起的关联同等待遇，一并亮 */
      hlExtra:(p) => CardHl.spans(c.id, p),
      objImage:(r) => this.insImage(r),
      save:() => this.save(true)
    });
    this.buildOl();
    this.drawSide();
    this.bindCtx();
    this.askMid();
  }
  /* 章纲卡头上的字数：口径和正文一样（Word 那套），写完一段就跟着变，
     不是只在重建卡片时算一次 */
  olCount(){
    const n = parasCount(this.c.outline);
    return n.w ? n.w + ' 字' : '还没写';
  }
  /* 章纲：正文内的卡片，折叠但不外拖；还是原来那套 textarea 行 */
  buildOl(){
    const c = this.c;
    this.olSlot.innerHTML = '';
    const card = h('div', { class:'wnw-olcard' + (c.olShut ? ' shut' : '') });
    if(c.olH) card.style.height = c.olH + 'px';
    const bar = h('div', { class:'hd' }, [
      h('span', { class:'wnw-gut', style:'padding:0', html:icoMarkup(c.olShut ? 'caretRight' : 'caretDown') }),
      h('b', {}, '章纲'),
      this.olCnt = h('span', { class:'wnw-hint' }, this.olCount()),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', title:'从正文挑一段当章纲', onclick:ev => { ev.stopPropagation(); this.olFromText(); } }, '取正文'),
      h('button', { class:'wnw-btn mini', title:'章纲插到正文前', onclick:ev => { ev.stopPropagation(); this.olToText(); } }, '→正文')
    ]);
    bar.addEventListener('click', () => { c.olShut = !c.olShut; this.dirty(); this.buildOl(); });
    const olBox = h('div', { class:'bd' });
    /* ParaEd 会把自己那层宿主改名，所以 .bd 只当壳，编辑器装在壳里面 */
    const olIn = h('div', {});
    olBox.appendChild(olIn);
    card.appendChild(bar);
    card.appendChild(olBox);
    const grip = h('i', { class:'wnw-olrz', title:'按住上下拖，调这张卡的高度' });
    /* 最小一行（外13-D）：这张卡矮到放不下「卡头 + 一行字」时，卡身那一条被夹没，
       章纲写的那一行就整个看不见了。一行有多高当场量，不写死数字 ——
       量的是章纲那一行自己的盒子（行距、字号、内边径都在里面），改了版式最小档跟着走。
       钉过的矮值（旧数据里那份）进卡时抬到这一档，存的那份数字不动，下次拖拽自然写成实际高度。 */
    const oneLine = () => {
      const ce = olBox.querySelector('.wnw-ce');
      if(ce) return ce.getBoundingClientRect().height;
      /* 一行都还没建起来（新建一章的头一次）：按章纲那一档的 1.9 倍行距 + 上下 2px 内边算 */
      return (parseFloat(getComputedStyle(olBox).fontSize) || 13) * 1.9 + 4;
    };
    const minH = () => {
      const cs = getComputedStyle(olBox);
      const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
        + (parseFloat(cs.borderTopWidth) || 0);
      const bd = getComputedStyle(card);
      const edge = (parseFloat(bd.borderTopWidth) || 0) + (parseFloat(bd.borderBottomWidth) || 0);
      return Math.ceil(bar.offsetHeight + oneLine() + pad + grip.offsetHeight + edge);
    };
    const fitMin = () => { const m = minH(); card.style.minHeight = m + 'px';
      if(c.olH) card.style.height = Math.max(m, c.olH) + 'px'; return m; };
    grip.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const y0 = ev.clientY, h0 = card.getBoundingClientRect().height;
      const min = minH(), max = Math.round(innerHeight * .8);
      grip.classList.add('on');
      const mv = e => { card.style.height = Math.round(Math.min(max, Math.max(min, h0 + e.clientY - y0))) + 'px'; };
      const up = () => {
        grip.classList.remove('on');
        grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up);
        /* 记下实际渲染出来的那一个高度：卡在最小档被顶住时，style.height 是拖的请求值，
           照它存下去，下次进卡还是矮的那个数，字又被夹掉一行 */
        c.olH = Math.round(card.getBoundingClientRect().height) || 0;
        this.dirty();
      };
      grip.setPointerCapture(ev.pointerId);
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
    });
    card.appendChild(grip);
    this.olSlot.appendChild(card);
    if(!c.outline.length) c.outline.push(newPara('p', ''));
    this.olEd = new ParaEd(olIn, {
      paras:() => c.outline, mode:() => c.mode, blocks:OL_BLOCKS, noIndent:true,
      /* 章纲结构变了只重建这张卡：连正文一起重画会把光标从章纲抢走。
         重建完按 (行号, 位置) 把光标放回去，不然回车 / 合并之后选区和光标都没了。 */
      dirty:() => this.dirty(), redraw:(i, caret) => { this.buildOl(); if(i !== undefined) this.olEd.focusAt(i, caret); },
      save:() => this.save(true), revOn:() => false, annos:() => []
    });
    fitMin();
  }
  /* 结构变了重排一遍：段落重建，撤销栈还在 */
  drawBody(){
    this.buildOl();
    if(this.ed) this.ed.render();
    this.drawSide();
    this.askMid();
  }
  /* ---------- 右栏：批注卡 + 痕迹卡，同色区分。展开/收起只看 showSide，不再要求有内容 ---------- */
  sideOn(){ return this.showSide !== false; }
  drawSide(){
    const box = this.sideBox;
    if(!box) return;
    /* 正在这一栏里写批注（图10 那一格草稿）就别重画它：dirty() 每敲一下都走这一趟，
       重画会把草稿那一格连光标一起换掉 —— 从前那条路走不通才改用弹框。
       但这道闸不能把「收起」那颗也吞掉：那颗钮自己就长在这一栏里，点它之前浏览器先给它焦点，
       于是这一趟整个当"他在写字"返回了，收起按下去一点反应没有（议题 7）。
       模式切换那条路能收起，就是因为焦点那会儿早离开这一栏了。 */
    const 焦点是颗钮 = !!(document.activeElement && document.activeElement.tagName === 'BUTTON');
    if(焦点在栏里且是钮()) { /* 点的是这一栏自己的按钮：往下走，把这一栏收起来 */ }
    else if(box.contains(document.activeElement)) return;
    function 焦点在栏里且是钮(){ return box.contains(document.activeElement) && 焦点是颗钮; }
    box.innerHTML = '';
    /* 词格这一档不接批注与修订痕迹那一栏：那一栏数的是 c.paras 上的段，这一档的正文不在那儿 */
    const lyric = !!this.c && this.c.mode === LYRIC_MODE;
    const on = !lyric && !!this.c && this.sideOn();
    box.style.display = on ? '' : 'none';
    if(this.sideTab) this.sideTab.style.display = on || lyric ? 'none' : '';
    /* 栏收起 / 词格这一档：折线也得跟着清一遍（少了这一趟，收起之后那些线会留在原地） */
    if(!on){ this.syncLinksSoon(); return; }
    const annos = AnnoView.on ? (this.c.annos || []) : [], revs = this.openRevs();
    box.appendChild(h('div', { class:'hd' }, [
      h('b', {}, '批注 ' + annos.length), h('b', {}, '痕迹 ' + revs.length), h('span', { style:'flex:1' }),
      revs.length ? h('button', { class:'wnw-btn mini', onclick:() => this.acceptAll() }, '全接受') : null,
      h('button', { class:'wnw-btn mini', onclick:() => { this.showSide = false; this.drawSide(); } }, '收起')
    ]));
    const items = [];
    this.c.paras.forEach((p, i) => {
      for(const a of annos) if(a.para === p.id) items.push({ i, kind:'anno', a });
      for(const g of Trace.ranges(p)) items.push({ i, kind:'rev', p, g });
    });
    for(const a of annos) if(!this.c.paras.some(p => p.id === a.para)) items.push({ i:this.c.paras.length, kind:'anno', a });
    if(!items.length) box.appendChild(h('div', { class:'wnw-hint' }, '这一章还没有批注，也没有待处理的修订痕迹'));
    for(const it of items.slice(0, 120)) box.appendChild(it.kind === 'anno' ? this.annoCard(it.a) : this.revCard(it));
    this.syncLinksSoon();
  }
  /* 图11：一条批注的原文 ↔ 栏里那一条，中间画一根折线。两头哪个不在屏上就不画那一条；
     一次排一帧，滚动、重画、改栏都走这一个口子（各画各的会一帧里算好几遍）。 */
  syncLinksSoon(){
    if(this.线约) return;
    this.线约 = requestAnimationFrame(() => { this.线约 = 0; this.syncLinks(); });
  }
  syncLinks(){
    const svg = this.linkSvg, flow = this.flow;
    if(!svg || !flow) return;
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const 有 = this.sideOn() && this.c && (this.c.annos || []).length && AnnoView.on;
    if(!有){ svg.style.display = 'none'; return; }
    const 底 = flow.getBoundingClientRect();
    let 画了 = 0;
    for(const a of (this.c.annos || [])){
      const 头 = (this.edHost && this.edHost.querySelector('[data-anno="' + a.id + '"]'))
        || (this.olSlot && this.olSlot.querySelector('[data-anno="' + a.id + '"]'));
      const 尾 = this.sideBox && this.sideBox.querySelector('[data-anno-card="' + a.id + '"]');
      if(!头 || !尾) continue;
      const A = 头.getBoundingClientRect(), B = 尾.getBoundingClientRect();
      if(!A.width && !A.height || !B.height) continue;
      if(A.bottom < 底.top || A.top > 底.bottom) continue;      /* 原文滚出屏了，这一条先不画 */
      const x1 = A.right - 底.left, y1 = A.top - 底.top + A.height / 2;
      const x2 = B.left - 底.left, y2 = B.top - 底.top + B.height / 2;
      if(x2 - x1 < 8) continue;                                  /* 两头贴在一起（栏收着、窄窗口），画出来是一团 */
      const 中 = x1 + Math.max(6, (x2 - x1) / 2);
      const p = document.createElementNS(svg.namespaceURI, 'path');
      p.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' H' + 中.toFixed(1) + ' V' + y2.toFixed(1) + ' H' + x2.toFixed(1));
      p.setAttribute('data-anno', a.id);
      svg.appendChild(p); 画了++;
    }
    svg.style.display = 画了 ? '' : 'none';
  }
  annoCard(a){
    /* 图10：写批注就在这一栏里写，不弹框。空着的那一条就是正在写的：
       写完走开（或按 Ctrl+Enter）就存住，一个字没写就走开 / 按 Esc 就整条收回，不留空批注。 */
    if(!a.text){
      const ta = h('textarea', { class:'wnw-input wnw-anno-in', rows:'3',
        placeholder:'写下你的批注', 'aria-label':'批注内容' });
      ta.value = '';
      const 收 = () => {
        if(this.草稿 !== a.id) return;
        this.草稿 = null;
        const v = String(ta.value || '').trim();
        if(v){ a.text = v; a.at2 = Date.now(); }
        else this.c.annos = (this.c.annos || []).filter(x => x !== a);
        this.dirty();
        if(this.ed) this.ed.paintAll();
        this.drawSide();
        Desk.emit('anno');
      };
      ta.addEventListener('blur', 收);
      /* 点开才认领：上一次没写完留下的空条，这一回打开章不会自己抢光标，点进去一样能写完存住 */
      ta.addEventListener('focus', () => { this.草稿 = a.id; });
      ta.addEventListener('keydown', e => {
        if(e.key === 'Escape'){ e.preventDefault(); ta.blur(); }
        else if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); ta.blur(); }
      });
      const card = h('div', { class:'wnw-note draft', 'data-anno-card':a.id }, [
        h('div', { class:'q' }, cut(a.quote || '（找不到原话）', 26)), ta
      ]);
      if(this.草稿 === a.id) requestAnimationFrame(() => { try{ ta.focus(); }catch(e){} });
      return card;
    }
    const card = h('div', { class:'wnw-note', 'data-anno-card':a.id }, [
      h('button', { class:'x', title:'删掉这条批注', html:icoMarkup('close'), onclick:async () => {
        if(!await wnwAsk('删掉这条批注？批注写的是：' + cut(a.text || '', 40)
          + ((a.replies || []).length ? '（连着 ' + a.replies.length + ' 条回复一起没）' : ''))) return;
        this.c.annos = (this.c.annos || []).filter(x => x !== a);
        this.dirty(); this.ed.paintAll(); this.drawSide(); Desk.emit('anno');
      }}),
      h('div', { class:'q' }, cut(a.quote || '（找不到原话）', 26)),
      h('div', {}, a.text)
    ]);
    for(const rp of (a.replies || [])) card.appendChild(h('div', { class:'q' }, '→ ' + (typeof rp === 'string' ? rp : (rp.text || ''))));
    return card;
  }
  revCard(it){
    const g = it.g;
    const nm = g.op === 'ins' ? '插入' : (g.op === 'del' ? '删除' : '格式');
    const body = g.op === 'fmt'
      ? (((BLOCK_MAP.get(g.k0) || {}).name || '正文') + ' → ' + ((BLOCK_MAP.get(g.k) || {}).name || '正文'))
      : (g.text || '（空）');
    return h('div', { class:'wnw-note k-' + g.op }, [
      h('div', { class:'q' }, nm + ' · 第 ' + (it.i + 1) + ' 段'),
      h('div', { class:g.op === 'ins' ? 'rv-ins' : (g.op === 'del' ? 'rv-del' : 'rv-fmt') }, body),
      h('div', { class:'wnw-row', style:'margin-top:4px' }, [
        h('button', { class:'wnw-btn mini', onclick:() => this.settleRev(it.p, g.id, true) }, '接受'),
        h('button', { class:'wnw-btn mini', onclick:() => this.settleRev(it.p, g.id, false) }, '拒绝')
      ])
    ]);
  }
  /* 一条痕迹的接受 / 拒绝；不给一键拒绝，避免误触把改好的文字全丢回去 */
  settleRev(p, id, ok){
    if(ok) Trace.accept(p, id); else Trace.reject(p, id);
    this.dirty();
    this.ed.paintAll();
    this.drawSide();
  }
  annoBtn(el){
    const sl = this.ed && this.ed.sel();
    if(sl && sl.to > sl.from){ this.newAnno(sl); return; }
    const on = this.showSide !== false;
    Menu.under(el, [
      { label:'显示所有批注', on, fn:() => { this.showSide = true; this.drawSide(); } },
      { label:'隐藏所有批注', on:!on, fn:() => { this.showSide = false; this.drawSide(); } },
      { sep:true },
      { label:'删除所有批注', fn:() => this.delAllAnno() }
    ]);
  }
  delAllAnno(){
    const n = (this.c.annos || []).length;
    if(!n){ toast('这一章没有批注'); return; }
    if(!confirm('删掉这一章的全部 ' + n + ' 条批注？')) return;
    this.c.annos = [];
    this.dirty(); this.ed.paintAll(); this.drawSide(); Desk.emit('anno');
    toast('已删掉 ' + n + ' 条批注');
  }
  /* ---------- 右键：选中的字 → 批注 / 卡片（新建卡片 / 关联卡片 / 关联卡片并高亮）；
     光标停在哪一段 → 本段关联卡片（外13-L：一段正文挂多张卡，反过来的多向关联） ---------- */
  bindCtx(){
    this.edHost.addEventListener('contextmenu', ev => {
      const sl = this.ed && this.ed.sel();
      if(!sl || !sl.p) return;
      ev.preventDefault();
      const has = sl.to > sl.from;
      const q = cut(sl.quote, 18);
      const items = [];
      if(has){
        items.push({ label:'添加批注', fn:() => this.newAnno(sl) });
        items.push({ sep:true });
        items.push({ label:'新建卡片：' + q, fn:() => this.mkCard(sl) });
        items.push({ label:'关联卡片', fn:() => this.linkCard(sl, false) });
        items.push({ label:'关联卡片并高亮', fn:() => this.linkCard(sl, true) });
        items.push({ sep:true });
      }
      /* 本段关联卡片：不管有没有选中字都能挂，纯这一段和哪几张卡有关 */
      items.push({ label:'本段关联卡片' + (sl.p.cards && sl.p.cards.length ? '（已挂 ' + sl.p.cards.length + ' 张）' : ''),
        fn:() => this.paraCards(sl.p) });
      Menu.open(ev.clientX, ev.clientY, items);
    });
    /* 正文里的链接和高亮的卡片名都不抢普通点击（那一下是要放光标打字），按住 Ctrl / ⌘ 才走：
       链接开外部，卡片名用现成的那一只口开成标签（跟卡片列表里双击一张卡、右键「在新标签页打开」同一个 Desk.addTab('card', 卡号)） */
    this.edHost.addEventListener('click', async ev => {
      if(!(ev.ctrlKey || ev.metaKey)) return;
      const z = ev.target.closest && ev.target.closest('[data-href],[data-card]');
      if(!z) return;
      const 卡 = z.getAttribute('data-card');
      ev.preventDefault();
      if(卡) await Desk.addTab('card', 卡);
      else window.open(z.getAttribute('data-href'), '_blank', 'noopener');
    });
  }
  selText(sl){ return String(sl.quote || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
  async mkCard(sl){
    const text = this.selText(sl);
    if(!text){ toast('先选中几个字'); return; }
    await Cards.loadTpls();
    const box = h('div', { class:'wnw-col' });
    const name = h('input', { class:'wnw-input', value:text });
    const tp = h('select', { class:'wnw-input' }, [h('option', { value:'' }, '空白卡')]
      .concat(Cards.tpls.map(t => h('option', { value:t.id }, t.name))));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '名字'), name]));
    box.appendChild(h('div', { class:'wnw-field' }, [h('label', {}, '模板'), tp]));
    Overlay.open('新建卡片', box, [h('button', { class:'wnw-btn primary', onclick:async () => {
      const n = name.value.trim();
      if(!n){ toast('先起个名'); return; }
      const dup = await Cards.taken(n, '', Work.book.id);
      if(dup){ toast('「' + dup + '」已经占了这个名，卡片不许重名'); return; }
      const c = await Cards.fromTpl(Cards.tpls.find(x => x.id === tp.value) || null, Work.book.id, n);
      Overlay.close(); Bus.emit('desk:cards'); Desk.addTab('card', c.id);
      toast('已建卡「' + n + '」，高响应，名字一出现就亮');
    }}, '建卡')]);
    name.focus(); name.select();
  }
  async linkCard(sl, hl){
    const text = this.selText(sl);
    if(!text){ toast('先选中几个字'); return; }
    const ms = await Cards.forBook(Work.book.id);
    if(!ms.length){ toast('这本书还没有卡片'); return; }
    const box = h('div', { class:'wnw-col' });
    box.appendChild(h('div', { class:'wnw-hint' }, '把「' + cut(text, 30) + '」挂到哪张卡片上？'));
    const q = h('input', { class:'wnw-input', type:'search', placeholder:'找卡' });
    const list = h('div', { class:'wnw-card-list', style:'max-height:340px;overflow:auto' });
    const fill = () => {
      const k = q.value.trim().toLowerCase();
      list.innerHTML = '';
      for(const m of ms.filter(x => !k || (m.title + ' ' + chips(m.aliases)).toLowerCase().includes(k)).sort((a, b) => b.at - a.at))
        list.appendChild(h('div', { class:'wnw-ci', onclick:() => { Overlay.close(); this.doLink(m.id, text, hl); } }, [
          h('i', { class:'d', style:'background:' + (m.color || 'var(--text-light)') }),
          h('span', { class:'nm' }, m.title), h('span', { style:'flex:1' }),
          h('span', { class:'wnw-hint' }, respName(m.resp)) ]));
      if(!list.children.length) list.appendChild(h('div', { class:'wnw-hint' }, '没有匹配的卡'));
    };
    q.addEventListener('input', fill);
    box.appendChild(q); box.appendChild(list); fill();
    Overlay.open('关联卡片', box);
  }
  async doLink(cardId, text, hl){
    const c = await Cards.get(cardId);
    if(!c) return;
    c.links = c.links || [];
    const hit = c.links.find(x => x.chId === this.c.id && x.text === text);
    if(hit){
      if(!hl || hit.hl){ toast('这一处已经关联过了'); return; }
      hit.hl = true;
    } else c.links.push({ chId:this.c.id, chTitle:this.c.title, bookId:Work.book.id, text, hl:!!hl, at:Date.now() });
    await Cards.put(c);
    await syncCardHl();
    Bus.emit('desk:cards');
    toast('已关联到「' + c.title + '」');
  }
  /* ---------- 外13-L：本段关联卡片（正文发起的多向关联） ----------
     一段正文挂多张卡，卡号存进这一段的 cards 数组；挂上后：
     ① 这一段无条件高亮这些卡的名字/别名（CardHl.spans 吃了 para 那份）；
     ② 每张被挂到的卡各记一次出场（Occur.scan 从 p.cards 现数，不乘权重）；
     ③ 取消关联就把这张从段上的 cards 里去掉，删段/删卡都跟着少一笔，不留虚数。 */
  paraCards(p){
    multiCardPickDlg((p.cards || []).slice(), async picked => {
      p.cards = picked;
      if(typeof Occur !== 'undefined') Occur.forget();
      await syncCardHl();
      this.ed.paintAll();
      this.dirty();
      Bus.emit('desk:cards');
      toast(picked.length ? ('这一段挂上 ' + picked.length + ' 张卡片') : '这一段不再挂卡片');
    }, '本段关联卡片');
  }
  /* ---------- 中响应：名字在本章出现了，先问一句再亮；问过就不再问 ---------- */
  async askMid(){
    if(!this.midBox) return;
    /* 这里 await 之前会清空、之后才写：连着装两次就会留两行，所以只让最后那次落地 */
    const g = this.midSeq = (this.midSeq || 0) + 1;
    this.midBox.innerHTML = '';
    if(!WriteCfg.开){ this.midBox.style.display = 'none'; return; }
    await CardHl.sync();
    if(g !== this.midSeq) return;
    const pend = CardHl.pending(this.c.id, this.c.paras.map(p => cleanText(p)).join('\n'));
    if(!pend.length){ this.midBox.style.display = 'none'; return; }
    this.midBox.style.display = '';
    for(const it of pend) this.midBox.appendChild(h('div', { class:'wnw-midq' }, [
      h('span', {}, '「' + it.card.title + '」在本章出现 ' + it.n + ' 次，要按名字高亮吗？'),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini', onclick:() => this.setMid(it.card, true) }, '高亮'),
      h('button', { class:'wnw-btn mini', onclick:() => this.setMid(it.card, false) }, '不用')
    ]));
  }
  async setMid(card, yes){
    const c = await Cards.get(card.id);
    if(c){ c.ok = c.ok || {}; c.ok[this.c.id] = !!yes; await Cards.put(c); }
    await syncCardHl();
    Bus.emit('desk:cards');
  }
  /* 图10：新建批注不再弹框 —— 只把这一条挂上（text 留空 = 草稿），
     正文那一处先亮起来，右侧栏立刻给出可写的那一格并把光标送进去。 */
  newAnno(sl){
    this.addAnno({ para:sl.p.id, at:sl.from, quote:sl.quote, text:'', replies:[] });
  }
  /* ---------- 一键排版：整章按设置里定义的版式重排；格式定义那一页在 设置 → 版式 ---------- */
  tidyDlg(){
    const T = Type.cur;
    const box = h('div', { class:'wnw-col', style:'min-width:min(440px,92vw)' });
    const st = { 范围:'正文', 缩进:true, 空行:true, 全角:true };
    const sg = (items, get, set) => {
      const g = h('div', { class:'wnw-seg' });
      for(const it of items){
        const b = h('button', { class:get() === it[0] ? 'on' : '', title:it[2] || it[1] }, it[1]);
        b.onclick = () => { for(const x of g.children) x.classList.remove('on'); b.classList.add('on'); set(it[0]); };
        g.appendChild(b);
      }
      box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, '范围'), g]));
    };
    sg([['正文', '只正文', '只重排正文'], ['正文+章纲', '正文 + 章纲', '正文和章纲一起重排']], () => st.范围, v => { st.范围 = v; });
    const sw = (txt) => {
      const cb = h('input', { type:'checkbox', checked:true });
      cb.addEventListener('change', () => { st[txt.k] = cb.checked; });
      box.appendChild(h('label', { class:'wnw-switch' }, [cb, h('span', {}, txt.s)]));
    };
    sw({ k:'缩进', s:'段首手工空格清掉，缩进按定义的走（定义：' + (T.缩进 ? '首行缩进两字' : '不缩进') + '）' });
    sw({ k:'空行', s:'空段按定义的空行档处理（定义：' + ((BLANK_IT.find(x => x[0] === T.空行) || [])[2] || '') + '）' });
    sw({ k:'全角', s:'半角标点转全角' });
    Overlay.open('一键排版', box, [
      h('button', { class:'wnw-btn mini', onclick:() => { Overlay.close(); Settings.open('type'); } }, '去改格式定义'),
      h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn primary', onclick:async () => { Overlay.close(); await this.tidy(st); } }, '整章重排')
    ]);
  }
  /* 带痕迹的段落一律不动：改了会把未接受的修订挤错位 */
  async tidy(st){
    const T = Type.cur;
    const sets = st.范围 === '正文+章纲' ? [[this.c.paras], [this.c.outline]] : [[this.c.paras]];
    let sp = 0, wide = 0, gone = 0, skip = 0;
    const plans = [];
    for(const [ps] of sets){
      const out = [], todo = [];
      let run = 0;
      for(const p of ps){
        if(p.rev && p.rev.length){ skip++; out.push(p); run = 0; continue; }
        const empty = !cleanText(p).trim();
        if(empty && st.空行){
          if(T.空行 === 'none'){ gone++; continue; }
          if(T.空行 === 'one'){ run++; if(run > 1){ gone++; continue; } } else run++;
        } else run = 0;
        if(!empty){
          let v = p.t || '';
          if(st.缩进){ const a = tidyLine(v); sp += a[1]; v = a[0]; }
          if(st.全角){ const b = widePunct(v); wide += b[1]; v = b[0]; }
          if(v !== p.t) todo.push([p, v]);
        }
        out.push(p);
      }
      plans.push([ps, out, todo]);
    }
    if(!sp && !wide && !gone){ toast(skip ? '没有要重排的，带痕迹的 ' + skip + ' 段没动' : '这一章已经按定义的版式排好了'); return; }
    /* 正文有撤销栈一步回到重排前；章纲那一份没有栈，改前先存一版自动版本 */
    if(sets.length > 1) await Versions.add(this.c, 'auto', '重排章纲之前');
    if(this.ed) this.ed.pushStep();
    for(const [ps, out, todo] of plans){
      ps.length = 0;
      for(const p of out) ps.push(p);
      /* 重排改了 p.t，内联样式的下标得跟着搬 */
      for(const t of todo){ shiftRuns(t[0], t[0].t, t[1]); t[0].t = t[1]; }
    }
    if(this.ed) this.ed.render();
    if(sets.length > 1) this.buildOl();
    this.drawSide();
    this.dirty();
    toast('已重排：空格 ' + sp + ' 处 · 全半角 ' + wide + ' 处 · 空段 ' + gone + ' 段' + (skip ? ' · 带痕迹 ' + skip + ' 段没动' : ''));
  }
  async addAnno(a){
    a.id = uid('a'); a.at2 = Date.now();
    a.paraIdx = this.c.paras.findIndex(p => p.id === a.para);
    this.c.annos.push(a);
    this.showSide = true;
    this.草稿 = a.text ? null : a.id;
    this.dirty();
    this.ed.paintAll();
    this.drawSide();
    Desk.emit('anno');
  }
  olFromText(){
    const r = this.ed && this.ed.curRow();
    if(!r || !r.p.t.trim()){ toast('先停在一段正文上'); return; }
    this.c.outline = (this.c.outline.length === 1 && !this.c.outline[0].t) ? [] : this.c.outline;
    for(const line of r.p.t.split('\n')) this.c.outline.push(newPara('ul', line));
    this.dirty(); this.drawBody(); toast('已把这段收进章纲');
  }
  olToText(){
    const txt = this.c.outline.map(p => p.t).filter(Boolean).join('\n');
    if(!txt){ toast('章纲是空的'); return; }
    this.c.paras.push(newPara('p', txt));
    this.dirty(); this.drawBody(); toast('章纲已插入正文末尾');
  }
  /* ---------- 修订 ---------- */
  headRefresh(){ if(this.topBox){ this.topBox.innerHTML = ''; this.topBox.appendChild(this.head()); } }
  toggleRev(){
    const c = this.c;
    if(c.revOn){
      c.revOn = false;
      this.dirty(); this.redraw(); this.headRefresh();
      toast('修订已停止记录，痕迹还在，右栏逐条处理');
      return;
    }
    c.revOn = true;
    /* 修订过程版本：一开修订就存一份带全部痕迹的快照，回头能翻 */
    Versions.add(c, 'rev-proc', '开始修订');
    this.dirty(); this.redraw(); this.headRefresh();
    toast('修订模式：现在的改动都会留下痕迹');
  }
  openRevs(){
    const out = [];
    this.c.paras.forEach((p, i) => { for(const g of Trace.ranges(p)) out.push({ p, i, g }); });
    return out;
  }
  acceptAll(){
    let n = 0;
    for(const p of this.c.paras){ const g = Trace.ranges(p); n += g.length; for(const x of g) Trace.accept(p, x.id); }
    if(!n){ toast('没有未处理的痕迹'); return; }
    /* 接受完 = 修订完成版 */
    Versions.add(this.c, 'rev-done', '接受全部 ' + n + ' 条');
    this.dirty(); this.redraw();
    toast('已接受 ' + n + ' 条，存了一个修订完成版');
  }
  /* ---------- 版本 ---------- */
  async manualVer(){
    await Versions.add(this.c, 'manual', '');
    this.dirty();
    toast('已存手动版本');
  }
  /* 开这一屏的每一笔都可能因为装着的壳比页面旧而抛（读档、问文件在不在）——
     抛了不许只是"点了没反应"，得当场说人话（2026-10-07 那条「历史版本完全点不开」）。 */
  verDlg(){ HistDlg.open(this).catch(e => toast('历史版本这一屏没打开：' + ((e && e.message) || e) + '（多半是装着的程序壳没跟上这一版，得重新打包）')); }
  /* ---------- 查找 / 导出 / 朗读 / 统计 ---------- */
  /* ---------- 书内查找：在这一本书的正文 / 章纲里找，找到就能换 ---------- */
  async findBookDlg(){
    const box = h('div', { class:'wnw-col', style:'min-width:min(640px,92vw)' });
    const st = { 正文:true, 章纲:true, 痕迹:true };
    const qi = h('input', { class:'wnw-input', placeholder:'在这本书里找' });
    const ri = h('input', { class:'wnw-input', placeholder:'换成（留空就是删掉）' });
    const cnt = h('div', { class:'wnw-hint' });
    const res = h('div', { class:'wnw-find-res' });
    const ops = h('div', { class:'wnw-row' });
    const scope = h('div', { class:'wnw-row' });
    let hits = [];
    let seq = 0;
    const drawOps = () => {
      ops.innerHTML = '';
      const one = (k, label) => {
        if(!st[k]) return;
        ops.appendChild(h('button', { class:'wnw-btn', title:'把这本书' + k + '里找到的都换成右边那几个字',
          onclick:() => go(k) }, label));
      };
      one('正文', '替换正文');
      one('章纲', '替换章纲');
      if(st.正文 && st.章纲)
        ops.appendChild(h('button', { class:'wnw-btn primary', onclick:() => go('全部') }, '全部替换'));
      if(!st.正文 && !st.章纲) ops.appendChild(h('span', { class:'wnw-hint' }, '两个范围都没勾，先勾一个'));
    };
    const scan = async () => {
      const my = ++seq;
      res.innerHTML = '';
      const hs = [];
      const q = qi.value.trim();
      if(!q){ cnt.textContent = '要找的字没写'; hits = []; drawOps(); return; }
      for(const m of Work.orderedChs()){
        const cv = ChOpen.get(m.id);
        const c = cv ? cv.c : await Work.ch(m.id);
        if(!c) continue;
        const add = (kind, ps) => ps.forEach((p, i) => {
          const at = hitAt(p.t, q);
          if(at < 0) return;
          hs.push({ ch:c.id, chTitle:c.title, kind, i, at, q, text:p.t, n:countOcc(p.t, q) });
        });
        if(st.正文) add('正文', c.paras);
        if(st.章纲) add('章纲', c.outline);
      }
      if(my !== seq) return;
      hits = hs;
      cur = -1;              /* 换了一批命中，「找下一处」从第一段重新数起 */
      cnt.textContent = hits.length ? '命中 ' + hits.length + ' 段 · ' +
        hits.reduce((a, x) => a + x.n, 0) + ' 处 · 点一条跳过去' : '这本书里没有「' + q + '」';
      for(const it of hits) res.appendChild(h('div', { class:'wnw-item', title:cut(it.text, 400),
        onclick:() => this.openHit(it) }, [
        h('span', { class:'ttl' }, it.chTitle + ' · ' + it.kind + ' · 第 ' + (it.i + 1) + ' 段 · ' + it.n + ' 处'),
        h('span', { class:'snip' }, snippet(it.text, it.at, it.q.length))
      ]));
      drawOps();
    };
    const go = async (kind) => {
      const n = await this.replaceBook(kind, qi.value.trim(), ri.value, st.痕迹);
      if(n) await scan();
    };
    /* 查找那一半原来只有「打字的同时在后面扫一遍」，界面上一个按钮都没有 —— 标题写着查找·替换，
       看着就剩下替换那一半（2026-10-07 报的那条）。这里补两个：一个明写着「查找」，
       一个「找下一处」按顺序跳，跳完回到第一处，计数写在命中那一行后面。 */
    let cur = -1;
    const nextHit = () => {
      if(!hits.length){ cnt.textContent = '先写要找的字，或这本书里没有这几个字'; return; }
      cur = (cur + 1) % hits.length;
      const it = hits[cur];
      cnt.textContent = '命中 ' + hits.length + ' 段 · 现在跳到第 ' + (cur + 1) + ' 段（' + it.chTitle + ' · ' + it.kind + ' · 第 ' + (it.i + 1) + ' 段 · ' + it.n + ' 处）';
      this.openHit(it);
    };
    const findBtn = h('button', { class:'wnw-btn', title:'在这本书里找左边那几个字', onclick:() => scan() }, '查找');
    const nextBtn = h('button', { class:'wnw-btn', title:'一段一段跳下去，跳完回到第一段', onclick:() => nextHit() }, '找下一处');
    for(const [k, s] of [['正文', '在正文查'], ['章纲', '在章纲查']]){
      const cb = h('input', { type:'checkbox', checked:true });
      cb.addEventListener('change', () => { st[k] = cb.checked; scan(); });
      scope.appendChild(h('label', { class:'wnw-switch' }, [cb, h('span', {}, s)]));
    }
    const tcb = h('input', { type:'checkbox', checked:true });
    tcb.addEventListener('change', () => { st.痕迹 = tcb.checked; });
    scope.appendChild(h('label', { class:'wnw-switch', title:'章纲没有痕迹显示，那一边的改动改前会先存一版自动版本' },
      [tcb, h('span', {}, '改动记进修订痕迹')]));
    qi.addEventListener('input', () => scan());
    qi.addEventListener('keydown', e => { if(e.isComposing || e.keyCode === 229) return; if(e.key === 'Enter') scan(); });
    ri.addEventListener('keydown', e => { if(e.isComposing || e.keyCode === 229) return;
      if(e.key === 'Enter') go(st.正文 && st.章纲 ? '全部' : (st.正文 ? '正文' : '章纲')); });
    box.appendChild(h('div', { class:'wnw-row', style:'gap:8px' }, [qi, findBtn, nextBtn, ri]));
    box.appendChild(scope);
    box.appendChild(cnt);
    box.appendChild(res);
    box.appendChild(ops);
    Overlay.open('书内查找 · 替换', box);
    qi.focus();
    scan();
  }
  /* 在什么范围查就在什么范围换；正文进修订痕迹和撤销栈，章纲改前存一版自动版本 */
  async replaceBook(kind, q, r, rev){
    if(!q){ toast('要找的字没写'); return 0; }
    const repl = String(r || '');
    const kinds = kind === '全部' ? ['正文', '章纲'] : [kind];
    const occ = (ps) => ps.reduce((a, p) => a + countOcc(p.t, q), 0);
    let chN = 0, n = 0;
    for(const m of Work.orderedChs()){
      const cv = ChOpen.get(m.id);
      const c = cv ? cv.c : await Work.ch(m.id);
      if(!c) continue;
      const bn = kinds.includes('正文') ? occ(c.paras) : 0;
      const on = kinds.includes('章纲') ? occ(c.outline) : 0;
      if(!bn && !on) continue;
      if(cv && cv.ed) cv.ed.pushStep();
      if(on) await Versions.add(c, 'auto', '替换章纲之前');
      if(bn) for(const p of c.paras) replaceIn(p, q, repl, rev);
      if(on) for(const p of c.outline) replaceIn(p, q, repl, false);
      n += bn + on; chN++;
      if(cv){ if(cv.ed) cv.ed.render(); if(on) cv.buildOl(); cv.drawSide(); cv.dirty(); }
      else await Work.saveCh(c);
    }
    if(!n){ toast('这本书的' + (kinds.join('和')) + '里没有「' + q + '」'); return 0; }
    toast('已换 ' + n + ' 处 · 在 ' + chN + ' 章里' + (rev ? ' · 正文记进修订痕迹' : '') + ' · 撤回一步回到换之前');
    return n;
  }
  /* ---------- 全局查找：所有书所有章，加上卡片、白板、灵感、批注四处，各一个手动开关；只找不换 ---------- */
  async findAllDlg(){
    const box = h('div', { class:'wnw-col', style:'min-width:min(700px,94vw)' });
    const st = { 卡:false, 灵感:false, 画板:false, 批注:false };
    const qi = h('input', { class:'wnw-input', placeholder:'在所有书的所有地方找，回车或点找' });
    const cnt = h('div', { class:'wnw-hint' });
    const res = h('div', { class:'wnw-find-res' });
    const scope = h('div', { class:'wnw-row' });
    let seq = 0;
    const scan = async () => {
      const my = ++seq;
      const q = qi.value.trim();
      res.innerHTML = '';
      if(!q){ cnt.textContent = '要找的字没写'; return; }
      cnt.textContent = '正在翻所有书…';
      const hits = [];
      const d = await Shelf.load();
      for(const row of d.books){
        const b = await Shelf.get(row.id);
        if(!b) continue;
        for(const m of (b.chs || [])){
          const cv = b.id === Work.book.id ? ChOpen.get(m.id) : null;
          const c = cv ? cv.c : await DB.get('book.' + b.id + '.ch.' + m.id, null);
          if(!c) continue;
          const push = (kind, text, at, n, go) => hits.push({ book:b.id, bookTitle:b.title, ch:c.id,
            chTitle:c.title, kind, text, at, n, q, go });
          c.paras.forEach((p, i) => { const at = hitAt(p.t, q); if(at >= 0) push('正文', p.t, at, countOcc(p.t, q), { i, at, len:q.length }); });
          c.outline.forEach((p, i) => { const at = hitAt(p.t, q); if(at >= 0) push('章纲', p.t, at, countOcc(p.t, q), { i:0, at:0, len:0, ol:true }); });
          if(st.批注) for(const a of (c.annos || [])){
            const hay = [a.quote, a.text].filter(Boolean).join('\n');
            const at = hitAt(hay, q);
            if(at >= 0) hits.push({ book:b.id, bookTitle:b.title, ch:c.id, chTitle:c.title, kind:'批注',
              text:hay, at, n:countOcc(hay, q), q, para:a.para }); }
        }
      }
      if(st.卡) for(const row of await Cards.all()){
        const c = await Cards.get(row.id); if(!c) continue;
        const bits = [c.title];
        for(const g of (c.groups || [])) for(const it of (g.items || [])) bits.push(it.name, ...(it.values || []));
        const hay = bits.filter(Boolean).join('\n');
        const at = hitAt(hay, q); if(at < 0) continue;
        hits.push({ kind:'卡片', text:hay, at, n:countOcc(hay, q), q, card:c.id });
      }
      if(st.灵感) for(const row of await Insp.all()){
        const at = hitAt(row.text, q); if(at < 0) continue;
        hits.push({ kind:'灵感', text:row.text, at, n:countOcc(row.text, q), q, insps:true });
      }
      if(st.画板) for(const row of await Boards.all()){
        const b = await Boards.get(row.id); if(!b) continue;
        const bits = [b.title];
        for(const nd of (b.nodes || [])) bits.push(nd.label, nd.t, nd.note, nd.seq);
        for(const lk of (b.links || [])) bits.push(lk.custom, lk.kind);
        const hay = bits.filter(Boolean).join('\n');
        const at = hitAt(hay, q); if(at < 0) continue;
        hits.push({ kind:'看板描述', text:hay, at, n:countOcc(hay, q), q, board:b.id });
      }
      if(my !== seq) return;
      cnt.textContent = hits.length ? hits.length + ' 处命中 · 点一条跳过去' : '哪个范围里都没有「' + q + '」';
      for(const it of hits) res.appendChild(h('div', { class:'wnw-item', title:cut(it.text, 400),
        onclick:() => this.openGlobal(it) }, [
        h('span', { class:'ttl' }, [it.bookTitle ? it.bookTitle + ' · ' : '', it.kind, it.chTitle ? ' · ' + it.chTitle : ''].join('')),
        h('span', { class:'snip' }, snippet(it.text, it.at, it.q.length))
      ]));
    };
    for(const [k, s] of [['卡', '卡片'], ['灵感', '灵感'], ['画板', '看板描述'], ['批注', '批注']]){
      const cb = h('input', { type:'checkbox' });
      cb.addEventListener('change', () => { st[k] = cb.checked; if(qi.value.trim()) scan(); });
      scope.appendChild(h('label', { class:'wnw-switch' }, [cb, h('span', {}, s)]));
    }
    qi.addEventListener('keydown', e => { if(e.isComposing || e.keyCode === 229) return; if(e.key === 'Enter') scan(); });
    box.appendChild(h('div', { class:'wnw-row', style:'gap:8px' }, [qi, h('button', { class:'wnw-btn mini', onclick:scan }, '找')]));
    box.appendChild(scope);
    box.appendChild(cnt);
    box.appendChild(res);
    box.appendChild(h('div', { class:'wnw-hint' }, '正文和章纲一直在找的范围里；上面四个开关只管要不要连它们一起翻，全开着会慢一点。'));
    Overlay.open('全局查找', box);
    qi.focus();
  }
  /* 跳过去：同书直接开那一章并选中，别书先换书；卡 / 灵感 / 画板各开各的标签 */
  async openGlobal(it){
    if(it.card){ Overlay.close(); await Desk.addTab('card', it.card); return; }
    if(it.insps){ Overlay.close(); await Desk.addTab('insps', null); return; }
    if(it.board){ Overlay.close(); await Desk.addTab('board', it.board); return; }
    const g = it.go || {};
    const j = { ch:it.ch, kind:it.kind, i:g.i === undefined ? -1 : g.i, at:g.at || 0, q:it.q, para:it.para };
    if(it.book !== Work.book.id){
      Overlay.close();
      FindJump = j;
      await Shell.openBook(it.book);
      await openChTab(it.ch);
      return;
    }
    await this.openHit(j);
  }
  async openHit(it){
    Overlay.close();
    const had = ChOpen.get(it.ch);
    if(had === this){ this.gotoHit(it); return; }
    FindJump = it;
    await openChTab(it.ch);
    /* 那一章本来就开着：切标签不会重新 boot，直接叫它自己跳 */
    if(had){ FindJump = null; had.gotoHit(it); }
  }
  gotoHit(it){
    if(it.kind === '正文' && this.ed && it.i >= 0){ this.ed.jumpTo(it.i, it.at, String(it.q || '').length); return; }
    if(it.kind === '章纲'){
      this.c.olShut = false; this.buildOl();
      const card = this.olSlot && this.olSlot.firstChild;
      if(card) card.scrollIntoView({ block:'center' });
      return;
    }
    const i = this.c.paras.findIndex(p => p.id === it.para);
    if(i >= 0){ this.showSide = true; this.drawSide(); if(this.ed) this.ed.jumpTo(i, 0, 0); return; }
    if(this.sideBox) this.sideBox.scrollIntoView({ block:'center' });
  }
  jump(i, at, len){ if(this.ed) this.ed.jumpTo(i, at, len); }
  exportDlg(){
    const box = h('div', { class:'wnw-col' });
    const st = { fmt:'md', marks:false, withOutline:false, withAnno:false };
    const EXT = { md:'md', word:'docx', txt:'txt' };
    const out = h('pre', { class:'wnw-out', style:'max-height:44vh;overflow:auto;background:var(--input-bg);padding:12px;border-radius:var(--r-card)' });
    const opts = () => ({ ch:this.c.id, withOutline:st.withOutline, withAnno:st.withAnno, marks:st.fmt === 'md' || st.marks });
    /* 笔记切到写作的段落带着 ## · - · 1. 这类记号：过滤还是外显只能由用户当场挑 */
    const nFmt = this.c.paras.filter(p => p.k && p.k !== 'p').length;
    const hint = h('div', { class:'wnw-hint' });
    const mkSeg = (items, get, set, off) => {
      const g = h('div', { class:'wnw-seg' });
      g.sync = () => { g.innerHTML = ''; const cur = get(), dis = off ? !!off() : false;
        for(const [k, n] of items) g.appendChild(h('button', { class:cur === k ? 'on' : '', disabled:dis,
          onclick:() => { if(dis) return; set(k); sync(); } }, n)); };
      return g;
    };
    const fmtSeg = mkSeg([['md', 'md'], ['word', 'word'], ['txt', 'txt']], () => st.fmt, k => st.fmt = k);
    const markSeg = mkSeg([['off', '过滤'], ['on', '外显']],
      () => st.fmt === 'md' || st.marks ? 'on' : 'off', k => st.marks = k === 'on',
      () => st.fmt === 'md');
    const o1 = h('input', { type:'checkbox' }); o1.addEventListener('change', () => { st.withOutline = o1.checked; go(); });
    const o2 = h('input', { type:'checkbox' }); o2.addEventListener('change', () => { st.withAnno = o2.checked; go(); });
    const cp = copyBtn(() => out.textContent, '复制');
    const dl = h('button', { class:'wnw-btn primary', onclick:async () => {
      const name = this.c.title + '.' + EXT[st.fmt];
      download(name, st.fmt === 'word' ? await Work.docx('ch', opts()) : out.textContent);
      toast('已下载 ' + name);
    }}, '下载');
    const go = async () => {
      if(st.fmt === 'word'){ out.textContent = 'Word 在这里预览不了，直接点下载。\n块格式照原样迁移；批注进 Word 的批注框，修订痕迹进「审阅」——这两种痕迹只有 .docx 无损，md 和 txt 会把痕迹化简成最终文字。'; }
      else out.textContent = await Work.dump('ch', st.fmt, opts());
      cp.style.display = st.fmt === 'word' ? 'none' : '';
      dl.textContent = st.fmt === 'word' ? '下载 .docx' : '下载';
    };
    const sync = () => { fmtSeg.sync(); markSeg.sync(); hint.textContent = nFmt
      ? '提醒：本章有 ' + nFmt + ' 段带着格式记号（从笔记的富文本 / markdown 切过来的就是这种）。' + (st.fmt === 'md' ? 'md 天生带符号，所以这一份保留全部符号。' : '要么纯文字、把 ## 这类符号过滤掉，要么保留全部符号。')
      : '「过滤」只留文字；「外显」把 ## · - · 1. 这类格式符号一起写进文件。';
      go(); };
    box.appendChild(h('div', { class:'wnw-row' }, [fmtSeg, markSeg,
      h('label', { class:'wnw-switch' }, [o1, h('span', {}, '带上章纲')]),
      h('label', { class:'wnw-switch' }, [o2, h('span', {}, '带上批注')])]));
    box.appendChild(hint);
    box.appendChild(out);
    sync();
    Overlay.open('导出本章 · ' + this.c.title, box, [cp, dl]);
  }
  speak(){
    const s = speechSynthesis;
    if(s.speaking){ s.cancel(); toast('已停止朗读'); return; }
    const u = new SpeechSynthesisUtterance(this.c.paras.map(p => cleanText(p)).join('。\n'));
    u.lang = 'zh-CN';
    s.speak(u);
    toast('开始朗读本章');
  }
  /* ---------- 存盘：停下 1.2 秒存一次，顺带留自动版本 ---------- */
  dirty(){
    /* 逐字记录：改前那一摞段文本是上一次抄的（一段一个字符串，只抄引用），这次抄一份跟它对，
       差在哪就记哪几笔。词格那一档的账在 lyrics\ 那个明文文件上，不在 c.paras 上，不记。 */
    this.logKeys();
    clearTimeout(this.dirtyTimer);
    this.drawFoot();
    /* 卡头上那行字数跟着页脚一起更新：以前只在重建卡片时算一次，越写越旧 */
    if(this.olCnt) this.olCnt.textContent = this.olCount();
    /* 新留下的痕迹要立刻进右栏，不然得等下一次重画 */
    this.drawSide();
    this.dirtyTimer = setTimeout(() => this.save(false), 1200);
  }
  logKeys(){
    const c = this.c;
    if(!c || c.mode === LYRIC_MODE) return;
    const now = (c.paras || []).map(p => p.t || '');
    const was = this.kWas;
    this.kWas = now;
    if(!was) return;
    /* 点工具条、换模式、开关修订这些都走 dirty()，正文一个字没动的喊声占大头 ——
       先对一遍，一样就不必排队走那一趟（每一趟还会顺手把没封的尾巴补封一枚指纹） */
    let 没动 = was.length === now.length;
    if(没动) for(let k = 0; k < now.length; k++) if(was[k] !== now[k]){ 没动 = false; break; }
    if(没动) return;
    /* 时刻在这里取：手指动的那一下，不是排到队头开始写的那一下 */
    KLog.diff(c.id, was, now, Date.now()).catch(e => this.drawFoot('逐字记录没写进去：' + ((e && e.message) || e)));
  }
  async save(manual){
    clearTimeout(this.dirtyTimer);
    if(!this.c) return;
    /* 词格那一档的真源是 lyrics\ 里那个明文文件：先把文件落稳，再留版本、再写章缓存（缓存里的 lyricAt 用来认新旧） */
    if(this.c.mode === LYRIC_MODE && this.grid) await this.grid.persist();
    /* 从前这里每存一次正文就顺手落一版整本快照（60 秒内不重复）。逐字记录上了之后那一摞快照不再需要：
       敲过的每一个字、隔多久敲的，都在 history\<章id>\keystroke.txt 里，一版都不落也回放得出来。
       手动「存一版」照旧留档，回退之前那一版也照旧留。 */
    await Work.saveCh(this.c);
    this.drawFoot('已保存');
    /* 图1 / 图7：从前这里每存一次就把左栏整块换掉（drawLeft 是拆了重挂，面板 render 又是异步的，
       中间空一帧就是一闪）。存盘能改的只有这一章的字数和标题，下面那句 desk:saved 会让目录就地改那几个字。 */
    Bus.emit('desk:saved', this.c.id);
    /* 图9：正文一改，屏幕上摆着的那几格「出场次数」跟着重算 —— Occur.load 自己比对指纹、算完自己 paint，
       不必把卡片那一列整个重画（那正是闪的来源）。一张都没摆着就不扫：1.2 秒一趟的自动保存不该背着全书的账。 */
    if(typeof Occur !== 'undefined' && Occur.cells.some(x => x.el && x.el.isConnected))
      Occur.load().catch(e => this.drawFoot('出场次数没重算：' + ((e && e.message) || e)));
  }
  drawFoot(msg){
    const c = this.c;
    if(!this.foot) return;
    /* 词格那一档的账在格子上，不在 c.paras 上：页脚给行 / 格 / 时长，不给「本章几字」 */
    if(c.mode === LYRIC_MODE && this.grid){ this.grid.foot(msg); return; }
    const cnt = parasCount(c.paras), ol = parasCount(c.outline);
    this.foot.innerHTML = '';
    this.foot.appendChild(h('span', {}, '本章 ' + cnt.w + ' 字' +
      (ol.w ? ' · 章纲 ' + ol.w : '') + ' · 全书 ' + Work.totalWords() + ' · 今日 +' + Work.todayWords()));
    this.foot.appendChild(h('span', { style:'flex:1' }));
    if(c.revOn) this.foot.appendChild(h('span', { class:'wnw-chip', style:'color:var(--ok)' }, '修订中'));
    this.foot.appendChild(h('span', {}, msg || '已自动保存 ' + new Date(c.at || Date.now()).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })));
  }
  redraw(){ if(this.c) this.drawBody(); }
}
const OL_BLOCKS = BLOCKS.filter(b => ['p', 'ul', 'ol', 'todo'].includes(b.k));

/* ---------- 左栏：章节（大纲 / 卷纲 / 章纲 三个子页） ---------- */
/* 这一张列表的多选（外15 第 6 条）：
   同一张章节列表可以同时挂着好几份（左栏一份、右栏停靠一份），选中集各自存各自的（在每一次 render
   的闭包里，这里只留一张「还挂在页上的实例」名单），不写成一张共用表 —— 一份挑中五章不该把另一份也点亮。
   键盘在模块级只绑一次：按下 Ctrl+A 那一刻问 pickAsk() 指针最后落在哪一份上，认不出主人
   （那一份已经从页面上摘掉了）就当没人接，绝不肯「找不到主人就每一份都全选一遍」，
   那是一把选中好几屏根本没在看的章。 */
const ChPick = [];
function chKeys(){
  /* 只绑一次：每渲染一份列表就往 document 上挂一枚的话，按一次 Ctrl+A 会全选好几遍。
     但认的不是「我绑过没有」—— 整副骨架拆掉重挂那一趟（wnwStop → wnwStart）里 wnwOffAll 会把这些
     监听一并摘走，光记着绑过就成了哑键。所以问的是「那一枚还挂在账上没有」。 */
  if(chKeys.fn && WNW_ON.some(it => it[2] === chKeys.fn)) return;
  chKeys.fn = wnwOn(document, 'keydown', ev => {
    if(ev.isComposing || ev.keyCode === 229) return;
    /* 浮层和右键菜单开着的时候不抢键盘：那两头各有自己的关闭键 */
    if(Overlay.node || Menu.node) return;
    const k = String(ev.key || '').toLowerCase();
    if(k !== 'a' && k !== 'escape') return;
    /* 这一条最要紧：正文编辑器就住在这个文件里，光标落在正文段、章纲格、任何一个输入框里的时候，
       Ctrl+A 必须是「全选这一段的字」，Esc 是输入法自己的事，列表一次都不许抢走。 */
    if(ev.target && ev.target.closest && ev.target.closest('input,textarea,select,[contenteditable]')) return;
    for(let i = ChPick.length - 1; i >= 0; i--) if(!ChPick[i].box || !ChPick[i].box.isConnected) ChPick.splice(i, 1);
    const who = pickAsk();
    if(!who) return;
    for(const p of ChPick){
      if(p.box !== who) continue;
      if(k === 'escape'){ if(p.sel.size){ p.sel.clear(); p.anchor = null; p.redraw(); } return; }
      /* Alt / Shift 搭着的那一下各有别的意思，只认光板 Ctrl（Cmd 同） */
      if(!(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey) return;
      ev.preventDefault();
      /* 全选的是这一屏摆出来的那些条子（ps.order），不是库里所有的章 */
      p.sel = new Set(p.order);
      p.anchor = p.order[p.order.length - 1] || null;
      p.redraw();
      return;
    }
  });
}
/* ---------- 大纲行尾那一串数（外25 第 3 条）：只写数字、整列右对齐，「字」这个字不再写出来 ----------
   own = 这一行自己的字数；den = 分母（0 或空 = 这一档不带比值）；cum = 累计到这一行（null = 没开这一档）；
   g = 目标字数（> 0 才在最后跟一个完成度）。分母是谁在 ⋮ 那一档里选：章比卷 / 章和卷都比全书。 */
function cntTxt(own, den, cum, g){
  let s = String(own);
  if(den > 0) s += '/' + den;
  if(cum != null) s += ' | ' + cum;
  const base = cum == null ? own : cum;
  if(g > 0) s += ' · ' + Math.min(999, Math.round(base / g * 100)) + '%';
  return s;
}
/* 一章存的是哪一档（外25 第 8 条）：三档各挂一张现成的图，不新造图形 */
const CH_MODE_ICO = { write:['pencil', '写作模式'], note:['list', '笔记 / 富文本模式'], lyric:['music', '词格模式'] };

Views.reg('panel-ch', {
  name:'章节', icon:'list', dockable:true, compactBelow:220,
  title:() => '章节',
  async render(host, ref, ctx){
    host.innerHTML = '';
    const b = Work.book;
    const st = { sub:'ch' };
    /* ⋮ 菜单里那几勾记住：累计字数按书籍从第一章加到这一行；快捷创建在列表末尾留一行「新建章节」；
       den 是行尾那串数的分母（off = 只显自己 / vol = 章比卷、卷比全书 / book = 章和卷都比全书） */
    const listSt = Object.assign({ cum:false, quick:false, den:'off' }, await State.get('ch.list', {}));
    /* 这一份列表自己的选中集：不进门档，关了软件再开不该还压着一摞挑中的章。
       order 是这一趟摆出来的条子顺序（卷一行、它底下的章一行行），shift 连选按屏上位置算，不按 id 算；
       box 是登记给 Ctrl+A 的那一块容器，redraw 就是重画这一列。 */
    const ps = { sel:new Set(), anchor:null, order:[], box:null, redraw:null, drag:null };
    /* 图1 / 图7：这一趟摆出来的行按屏上顺序记一份（每次重画重填）。自动保存那一趟只把变了的字写回
       原来那几个格子里 —— 整列重画会把左栏换成一块新壳、面板的 render 又是异步的，中间空一帧就是
       肉眼看见的一闪一弹；打字时每 1.2 秒来一趟，越打越闪。 */
    const 屏 = [];
    const head = h('div', { class:'wnw-phead' }, [h('b', {}, '章节'), h('span', { style:'flex:1' }),
      h('button', { class:'wnw-btn mini w-txt', title:'新建一章', onclick:() => add(), html:icoMarkup('plus') + '章' }),
      h('button', { class:'wnw-btn mini w-txt', title:'新建一卷', onclick:() => addVol(), html:icoMarkup('plus') + '卷' }),
      h('button', { class:'wnw-btn mini', title:'章节功能', html:icoMarkup('kebab'), onclick:ev => chMenu(ev) })]);
    const tabs = h('div', { class:'wnw-subtabs' });
    const body = h('div', { class:'wnw-pbody' });
    host.appendChild(head); host.appendChild(tabs); host.appendChild(body);
    const go = () => {
      tabs.innerHTML = '';
      /* 不分卷的书没有「卷纲」这一层可看，这一页就不摆出来 */
      const subs = [['ch','大纲']].concat(b.vols.length ? [['vol','卷纲']] : []).concat([['ol','章纲']]);
      if(!subs.some(x => x[0] === st.sub)) st.sub = 'ch';
      for(const [k, n] of subs)
        tabs.appendChild(h('button', { class:st.sub === k ? 'on' : '', onclick:() => { st.sub = k; go(); } }, n));
      draw();
    };
    /* 卷的有无翻了一面（解散成不分卷 / 新建第一卷），子页那一排跟着重摆 */
    let hadVols = b.vols.length > 0;
    const draw = () => {
      if((b.vols.length > 0) !== hadVols){ hadVols = b.vols.length > 0; go(); return; }
      body.innerHTML = '';
      if(st.sub === 'ch') body.appendChild(tree('ch'));
      else if(st.sub === 'vol') body.appendChild(tree('vol'));
      else body.appendChild(olList());
    };
    /* 行尾的数：Word 口径的字数；章后面再跟一个单章目标的完成度
       （这一章自己钉过的目标优先，没钉就吃书里那个单章目标） */
    const goalOf = m => m.goal || b.chGoal || 0;
    /* 拖拽排序（外25 第 4 条）：抓着的那一行记在 ps.drag 上（HTML5 的 dataTransfer 读不回内容，
       w3-shell 拖标签、卡片池拖格子都是这么办的）。落点分三种：
       章落到另一章的上半 = 插在它前面，下半 = 跟在它后面（顺带改成它那一卷）；
       章落到卷那一行 = 并进这一卷末尾；卷落到卷的上半 / 下半 = 挪到它前面 / 后面。
       卷不许插到章缝里 —— 那一档不 preventDefault，鼠标上就是一个不许放的样。 */
    const undrag = () => {
      ps.drag = null;
      for(const x of body.querySelectorAll('.dnd-out,.dnd-tgt')) x.classList.remove('dnd-out', 'dnd-tgt');
    };
    const rowDrag = (el, mine) => {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', ev => {
        ps.drag = mine;
        el.classList.add('dnd-out');
        try{ ev.dataTransfer.setData('text/plain', 'wnw'); ev.dataTransfer.effectAllowed = 'move'; }catch(e){}
        ev.stopPropagation();
      });
      el.addEventListener('dragend', undrag);
      el.addEventListener('dragover', ev => {
        const d = ps.drag;
        if(!d || d.id === mine.id) return;
        if(d.kind === mine.kind || (d.kind === 'ch' && mine.kind === 'vol')){
          ev.preventDefault(); ev.stopPropagation();
          const r = el.getBoundingClientRect();
          el.dataset.dnpos = mine.kind === 'vol' ? 'in' : (ev.clientY < r.top + r.height / 2 ? 'before' : 'after');
          try{ ev.dataTransfer.dropEffect = 'move'; }catch(e){}
          el.classList.add('dnd-tgt');
        }
      });
      el.addEventListener('dragleave', () => el.classList.remove('dnd-tgt'));
      el.addEventListener('drop', async ev => {
        const d = ps.drag;
        if(!d || d.id === mine.id) return;
        ev.preventDefault(); ev.stopPropagation();
        const pos = el.dataset.dnpos === 'after' ? 'after' : 'before';
        undrag();
        if(d.kind === 'ch' && mine.kind === 'vol') await Work.moveChToVol(d.id, mine.id);
        else if(d.kind === 'ch') await Work.reorderCh(d.id, mine.id, pos);
        else await Work.reorderVol(d.id, mine.id, pos);
        draw();
      });
      return el;
    };
    const MODE_TIP = '这一章存的是哪一档 · 双击打开就直接进这一档';
    /* 全书和逐卷的字数：大纲那一页、章纲那一页、就地刷新那三处都要用同一份。
       从前这两个名字只住在 tree() 里面，章纲那一页照着写了名字却够不着 —— 行尾一开「比值」就抛，
       整块左栏当场空掉（图7 说的弹动里有它一份）。 */
    const 字数账 = () => {
      const all = Work.orderedChs();
      const vsum = {};
      for(const c of all) vsum[c.vid] = (vsum[c.vid] || 0) + chWords(c);
      return { all, vsum, book:Work.totalWords() };
    };
    const tree = (kind) => {
      const box = h('div', { class:'wnw-tree' });
      屏.length = 0;
      box.appendChild(h('div', { class:'wnw-bookhead' }, [
        h('span', { class:'ttl' }, b.title),
        h('button', { title:'改书名', html:icoMarkup('pencil'), onclick:() => rename(b.title, t => { b.title = t; Work.saveBook(); Shell.showShelf(); }) }),
        h('button', { title:'书名 / 目标 / 千字单价', onclick:() => bookInfoDlg(draw) }, '信息'),
        h('button', { title:'回收站', onclick:() => trashDlg() }, '回收站')
      ]));
      /* 累计模式：从全书第一章起一路加下来，卷行加到本卷末，章行加到本章 */
      let run = 0;
      /* 比值的两个分母先各算一遍：卷总那一本（键是卷 id，不分卷的书键是空串）和全书那一本。
         逐行现算会每行把整本书加一遍，章多了就慢。 */
      const { all, vsum, book } = 字数账();
      /* 这一趟摆出来的条子按屏上顺序记一份，收起来的卷底下那些章没摆就不记 —— 
         shift 连选和 Ctrl+A 的范围都是这一趟，不是 b.chs 的全部 */
      const ord = [];
      const chRow = (m) => {
        ord.push(m.id);
        run += chWords(m);
        const denTip = listSt.den === 'vol' ? '本卷总字数' : listSt.den === 'book' ? '全书总字数' : '';
        const newCnt = h('span', { class:'cnt', title:listSt.cum
            ? (denTip ? '本章字数 / ' + denTip + ' | 全书累计到本章' : '本章字数 | 全书累计到本章')
            : (denTip ? '本章字数 / ' + denTip + ' · 点这里改这一章的目标字数' : '点这里改这一章的目标字数') },
          cntTxt(chWords(m), listSt.den === 'vol' ? (vsum[m.vid] || 0) : listSt.den === 'book' ? book : 0,
            listSt.cum ? run : null, goalOf(m)));
        newCnt.addEventListener('click', ev => { ev.stopPropagation(); if(!listSt.cum) goalDlg(m); });
        /* 哪一档存着字就亮哪一档的图（外25 第 8 条）：老章目录上还没记词格那个 ly，先信它自己存的 mode */
        const mk = modeShown(m.mode, chWords(m) > 0, metaHasLyr(m));
        const mi = CH_MODE_ICO[mk] || CH_MODE_ICO.write;
        /* 单击只把手挪到这一行（从前这一下是打开这一章），双击做的才是从前单击那一下。
           改名、上移、下移、删除那四枚图标从行上撤了（外25 第 4 条）：换顺序靠拖，改名和删除在右键这一行里。 */
        const 名 = h('span', { class:'ttl' }, m.title);
        const 牌 = h('span', { class:'wnw-mode', title:mi[1] + ' · ' + MODE_TIP, html:icoMarkup(mi[0]) });
        const 行 = rowDrag(h('div', { class:'wnw-ch' + (Work.cur === m.id ? ' on' : '') + (ps.sel.has(m.id) ? ' sel' : ''),
          title:'拖着我换顺序：落到另一章的上半排它前面、下半排它后面；落在卷那一行就并进那一卷末尾 · 右键改名和删除',
          onclick:ev => clickRow(m.id, ev), ondblclick:() => open(m),
          oncontextmenu:ev => { ev.preventDefault(); chRowMenu(m, ev); } }, [
          牌,
          名,
          kind === 'ol' ? h('span', { class:'sub' }, '…') : null,
          newCnt
        ]), { kind:'ch', id:m.id });
        /* 记进 屏：口径和上面那几行一模一样，只是把「现算」留到刷新那一步 */
        屏.push({ kind:'ch', id:m.id, 行, 名, 数:newCnt, 牌, 档:mk, 型:() => modeShown(m.mode, chWords(m) > 0, metaHasLyr(m)),
          文:() => m.title, 本:() => chWords(m),
          分:(全书, v和) => listSt.den === 'vol' ? (v和[m.vid] || 0) : listSt.den === 'book' ? 全书 : 0,
          标:() => goalOf(m) });
        return 行;
      };
      for(const v of b.vols){
        ord.push(v.id);
        const chs = all.filter(c => c.vid === v.id);
        const sum = chs.reduce((a, c) => a + chWords(c), 0);
        const cb = h('input', { type:'checkbox', title:'勾上 = 这一卷不参与序号修正' });
        cb.checked = v.noNum !== true;
        cb.onchange = () => { v.noNum = !cb.checked; Work.saveBook(); draw(); };
        /* 卷和章是同一种条子，所以一起进选中集。勾「不参与序号修正」那个和收卷的那枚三角
           是它们自己的事，按下这两处不许顺手把这一行挑中。
           卷名从前单击才打开（还只在卷纲那一页才打得开），现在单击只挑中，双击才开 —— 
           大纲那一页双击也照样开，不留一条点了没反应的行。 */
        const 卷名 = h('span', { class:'ttl' }, v.title);
        const 卷数 = h('span', { class:'cnt', style:'margin-left:auto', title:listSt.den === 'off'
          ? (listSt.cum ? '本卷字数 | 全书累计到本卷' : '本卷字数')
          : (listSt.cum ? '本卷字数 / 全书总字数 | 累计到本卷' : '本卷字数 / 全书总字数') },
          cntTxt(sum, listSt.den === 'off' ? 0 : book, listSt.cum ? run + sum : null, 0));
        const vol = rowDrag(h('div', { class:'wnw-vol' + (ps.sel.has(v.id) ? ' sel' : ''),
          title:'拖着我换卷的顺序：落到另一卷的上半排它前面、下半排它后面 · 章拖到我这一行就并进这一卷末尾',
          onclick:ev => { if(ev.target.closest && ev.target.closest('input,.tri')) return; clickRow(v.id, ev); },
          ondblclick:() => openVol(v), oncontextmenu:ev => { ev.preventDefault(); volRowMenu(v, ev); } }, [
          cb,
          h('span', { class:'tri', html:icoMarkup(v.collapsed ? 'caretRight' : 'caretDown'), onclick:() => { v.collapsed = !v.collapsed; Work.saveBook(); draw(); } }),
          卷名,
          卷数,
          h('button', { class:'mini', title:'这一卷的功能', html:icoMarkup('kebab'), onclick:ev => { ev.stopPropagation(); volMenu(ev, v); } })
        ]), { kind:'vol', id:v.id });
        /* 记进 屏：卷这一行的数是本卷各章加出来的，所以「本」现算；收起来的卷累计也要跟着加 */
        屏.push({ kind:'vol', id:v.id, 行:vol, 名:卷名, 数:卷数, 文:() => v.title,
          本:() => b.chs.filter(c => c.vid === v.id).reduce((a, c) => a + chWords(c), 0),
          分:(全书) => listSt.den === 'off' ? 0 : 全书, 标:() => 0, 收:() => !!v.collapsed });
        box.appendChild(vol);
        if(kind === 'vol'){
          const d = h('input', { class:'wnw-input', style:'width:100%;margin:2px 0 4px 18px', placeholder:'卷简介', value:v.desc || '' });
          d.addEventListener('change', () => Work.setVolDesc(v.id, d.value));
          box.appendChild(d);
        }
        if(v.collapsed){ run += sum; continue; }
        for(const m of chs) box.appendChild(chRow(m));
      }
      /* 不分卷：卷这一层整个没有，章直接挂在书名底下 */
      if(!b.vols.length) for(const m of all) box.appendChild(chRow(m));
      if(listSt.quick) box.appendChild(h('div', { class:'wnw-ch', onclick:() => add() }, [h('span', { class:'ttl', html:icoMarkup('plus') + '新建章节' })]));
      showing(ord);
      return box;
    };
    const olList = () => {
      const box = h('div', { class:'wnw-tree' });
      屏.length = 0;
      const { vsum, book } = 字数账();
      /* 章纲这一页是同一批章的另一种长相，交互一套都不落：单击只挑中、双击才打开这一章 */
      const ord = [];
      for(const m of Work.orderedChs()){
        ord.push(m.id);
        const row = h('div', { class:'wnw-ch' + (ps.sel.has(m.id) ? ' sel' : ''), style:'display:block' });
        const 名 = h('span', { class:'ttl' }, m.title);
        const 数 = h('span', { class:'cnt' },
          cntTxt(chWords(m), listSt.den === 'vol' ? (vsum[m.vid] || 0) : listSt.den === 'book' ? book : 0, null, goalOf(m)));
        row.appendChild(h('div', { style:'display:flex;gap:6px;align-items:center' }, [名, 数]));
        /* 这一页的行尾没有累计那一档（从前就没吃过 run），刷新时照旧不写那一段 */
        屏.push({ kind:'ch', id:m.id, 行:row, 名, 数, 累:false, 文:() => m.title, 本:() => chWords(m),
          分:(全书, v和) => listSt.den === 'vol' ? (v和[m.vid] || 0) : listSt.den === 'book' ? 全书 : 0,
          标:() => goalOf(m) });
        const pv = h('div', { class:'wnw-hint', style:'padding-left:2px' }, '读章纲…');
        row.appendChild(pv);
        Work.ch(m.id).then(c => {
          if(!c) return;
          pv.innerHTML = '';
          const t = c.outline.map(p => cleanText(p)).filter(Boolean).join(' / ');
          pv.textContent = t || '暂无章纲';
        });
        row.addEventListener('click', ev => clickRow(m.id, ev));
        row.addEventListener('dblclick', () => open(m));
        row.addEventListener('contextmenu', ev => { ev.preventDefault(); chRowMenu(m, ev); });
        box.appendChild(row);
      }
      showing(ord);
      return box;
    };
    /* 图1 / 图7：就地刷新 —— 只把变了的字写回原来那几个格子，不重画整列。
       口径和 tree() 里那一套一致：累计按屏上顺序一路加下来，卷行算到本卷末，收起来的卷也要把它的数并进累计。
       整列重画留给真改了结构的那几处（新建 / 删除 / 挪卷 / 换子页 / 换比值那一档）。 */
    const 就地刷新 = () => {
      if(!屏.length) return 0;
      const { vsum, book } = 字数账();
      let run = 0, 改 = 0;
      for(const r of 屏){
        const own = r.本();
        let cum;
        if(r.kind !== 'vol'){ run += own; cum = run; }
        else cum = r.收() ? (run += own) : run + own;
        const 文 = cntTxt(own, r.分(book, vsum), r.累 === false ? null : (listSt.cum ? cum : null), r.标());
        if(r.数.textContent !== 文){ r.数.textContent = 文; 改++; }
        const 名 = r.文();
        if(r.名.textContent !== 名){ r.名.textContent = 名; 改++; }
        /* 章前那一枚模式图标（外32 图5）：换模式那一下跟着就地换掉，不等下一次整列重画。
           从前只有存盘（停下 1.2 秒那一趟）才走这一趟，所以换了档图标要慢一拍才跟上。 */
        if(r.牌 && r.型){
          const 档 = r.型();
          if(r.档 !== 档){ const mi = CH_MODE_ICO[档] || CH_MODE_ICO.write;
            r.牌.innerHTML = icoMarkup(mi[0]); r.牌.title = mi[1] + ' · ' + MODE_TIP; r.档 = 档; 改++; }
        }
        if(r.kind !== 'vol'){
          const 当 = Work.cur === r.id;
          if(r.行.classList.contains('on') !== 当) r.行.classList.toggle('on', 当);
        }
      }
      return 改;
    };
    const open = async (m) => {
      Work.cur = m.id;
      State.set('cur.' + Work.book.id, m.id);
      const tb = (Desk.st.tree && Desk.leaves(Desk.st.tree).flatMap(l => l.tabs).find(t => t.kind === 'ch' && t.ref === m.id));
      if(tb){ for(const l of Desk.leaves(Desk.st.tree)){ const i = l.tabs.indexOf(tb); if(i >= 0){ l.act = i; break; } } Desk.save(); Desk.drawMid(); }
      else await Desk.addTab('ch', m.id);
      draw();
    };
    const add = async (vid) => {
      const c = await Work.newCh(vid || (Work.chMeta(Work.cur) && Work.chMeta(Work.cur).vid));
      const m = Work.chMeta(c.id);
      await open(m || { id:c.id });
      draw();
    };
    const addVol = async () => { await Work.newVol(); draw(); };
    /* noAsk：批量删除那一条路已经问过一次了，逐条走这里时别再一人一弹窗 */
    const delCh = async (m, noAsk) => {
      if(!noAsk && !confirm('删掉「' + m.title + '」？可以在回收站放回。')) return;
      await Work.delCh(m.id);
      for(const l of Desk.leaves(Desk.st.tree)) for(let i = l.tabs.length - 1; i >= 0; i--) if(l.tabs[i].kind === 'ch' && l.tabs[i].ref === m.id) Desk.closeTab(l, i);
      draw();
    };
    const delVol = async (v, noAsk) => {
      if(Work.book.vols.length <= 1){ toast('只剩一卷，不删 · 想连着卷壳一起去掉用「解散分卷」'); return; }
      if(!noAsk && !confirm('删掉「' + v.title + '」？里面的章会进回收站。')) return;
      await Work.delVol(v.id); draw();
    };
    /* ---------- 选中：单击只换选中集、Ctrl/Cmd 逐个加减、Shift 从锚点连一片（外15 第 6 条）----------
       从前单击就打开这一章，想连着删几章只能一章删一次；现在单击只把手挪过去。
       锚点 = 最近一次普通点击或 Ctrl 点击的那一条，shift 才有起点可连；
       shift 那一下锚点已经不在这屏上了（卷收起来了、子页换了）就退化成普通单击，别一口连整本书。 */
    const clickRow = (id, ev) => {
      const all = ps.order;
      if(ev.shiftKey){
        const i = all.indexOf(ps.anchor), j = all.indexOf(id);
        if(i >= 0 && j >= 0){
          ps.sel.clear();
          for(let k = Math.min(i, j); k <= Math.max(i, j); k++) ps.sel.add(all[k]);
          draw(); return;
        }
      }
      if(ev.ctrlKey || ev.metaKey){
        if(ps.sel.has(id)) ps.sel.delete(id); else ps.sel.add(id);
        ps.anchor = id; draw(); return;
      }
      ps.sel.clear(); ps.sel.add(id); ps.anchor = id; draw();
    };
    /* 选中集不许跨这一趟留残：收进卷里的、换到别的子页的、刚删掉的，一起从手里清出去。
       不清的后果是「批量删除」会删到屏幕上根本没摆出来的章。
       摆出来的这些条子同时也是 Ctrl+A 和 shift 连选的范围。 */
    const showing = ord => {
      ps.order = ord;
      if(ps.sel.size) ps.sel = new Set(ps.order.filter(id => ps.sel.has(id)));
    };
    const isVol = id => !!Work.vol(id);
    /* 右键三条（口径和书架那一档一样）：在新标签页打开 / 在停靠打开 / 删除。
       kind 用的是 'ch'、ref 就是这一章的 id —— 和「＋打开内容」里那一格「一章正文」取的是同一种值；
       开成标签走的是既有那一条 addTab（这一章已经开着时它会说「已经开着了 · 直接跳过去」，不是点了没反应）。 */
    const chRowMenu = (m, ev) => {
      const many = ps.sel.size > 1 && ps.sel.has(m.id);
      Menu.open(ev.clientX, ev.clientY, [
        many ? { label:'选中 ' + ps.sel.size + ' 条 · 批量删除', fn:() => batchDel() } : null,
        many ? { sep:true } : null,
        { label:'在新标签页打开', fn:() => Desk.addTab('ch', m.id) },
        { label:'在停靠打开', fn:() => Desk.dockIt('ch', m.id, m.title) },
        { sep:true },
        /* 改名和删除从行上那四枚图标挪到这儿（外25 第 4 条）：行上只留标题和那串数，换顺序靠拖 */
        { label:'改名', fn:() => rename(m.title, async t => { await Work.renameCh(m.id, t); draw(); }) },
        { sep:true },
        { label:'删掉这一章', fn:() => delCh(m) }
      ]);
    };
    const volRowMenu = (v, ev) => {
      const many = ps.sel.size > 1 && ps.sel.has(v.id);
      const only = b.vols.length <= 1;
      Menu.open(ev.clientX, ev.clientY, [
        many ? { label:'选中 ' + ps.sel.size + ' 条 · 批量删除', fn:() => batchDel() } : null,
        many ? { sep:true } : null,
        { label:'在新标签页打开', fn:() => openVol(v) },
        { label:'在停靠打开', fn:() => Desk.dockIt('vol', v.id, v.title) },
        /* 词巡航只吃「整卷的章都是词格」那种卷，不够格就不摆这一条（摆一条点不动的比少一条更糟） */
        cruiseReady(v.id) ? { label:'词巡航（这一卷的词格闪卡）', fn:() => Desk.addTab('cruise', v.id) } : null,
        { sep:true },
        /* 解散和删除是两回事，两条并排放着、各自把章的去向写在题目上：
           解散一章都不丢（只剩这一卷时全书改成不分卷，否则并进邻卷），删除才进回收站。 */
        { label: only ? '全书改成不分卷（章挂到书名底下）' : '解散这一卷（章并进' + (b.vols[0].id === v.id ? '后一卷' : '前一卷') + '）', fn:() => dissolve(v) },
        { label:'删除这一卷（章进回收站）', fn:() => delVol(v) }
      ]);
    };
    /* 一把删掉手里这些：确认只弹一次、说清几条，然后逐条走上面那两条既有的删除走法
       （章进回收站、卷里的章跟着进），删完选中集清空。
       卷不许连着删：Work.delVol 删完一卷会把剩下的每一章都归进头一卷（既有走法就是这样，删一卷就是这样），
       这时候再删第二卷，「属于这一卷的章」筛到的全是刚被并过来的别卷的章 —— 一把下去就把没挑中的章
       也送进回收站了。所以手里两卷以上时这一把只删章，卷要删就单独右键那一行删。 */
    const batchDel = async () => {
      const ids = [...ps.sel];
      const vs = ids.filter(isVol), ms = ids.filter(id => !isVol(id));
      const vols = vs.length === 1 ? vs : [];
      const going = vols.concat(ms);
      if(!going.length){ toast('卷一次只能删一卷 · 手里这 ' + vs.length + ' 卷请一卷一卷删'); return; }
      const names = going.map(id => { const x = Work.vol(id) || Work.chMeta(id); return x ? x.title : ''; }).filter(Boolean);
      const tail = '\n' + names.join('、');
      if(!confirm(!vols.length ? '删掉选中的 ' + ms.length + ' 章？可以在回收站放回：' + tail
        : ms.length ? '删掉选中的 ' + going.length + ' 条（' + ms.length + ' 章 + 1 卷）？可以在回收站放回：' + tail
        : '删掉选中的那一卷？里面的章会进回收站：' + tail)) return;
      for(const id of vols) await delVol(Work.vol(id), true);
      for(const id of ms){
        /* 跟着那一卷一起没的章这时候已经不在章目录里了，跳过就是 —— 它们已经进回收站了 */
        const m = Work.chMeta(id);
        if(m) await delCh(m, true);
      }
      if(vs.length > 1) toast('只删了选中的 ' + ms.length + ' 章 · 卷一次只能删一卷，剩下的 ' + vs.length + ' 卷请一卷一卷删');
      ps.sel.clear(); ps.anchor = null;
      draw();
    };
    /* 解散和删除是两回事：解散只拆卷壳，章一章都不动；删除把章送进回收站 */
    const dissolve = async (v) => {
      const only = b.vols.length <= 1;
      const n = Work.orderedChs().filter(c => c.vid === v.id).length;
      const nxt = b.vols[0].id === v.id ? '后一卷' : '前一卷';
      if(!confirm(only ? '全书改成不分卷？「' + v.title + '」这个卷壳去掉，' + n + ' 个章直接挂在书名底下。'
        : '解散「' + v.title + '」？这 ' + n + ' 个章并进' + nxt + '，卷壳去掉。')) return;
      await Work.dissolveVol(v.id);
      Bus.emit('desk:renamed', null);
      draw();
      toast(only ? '全书不分卷了，章直接挂在书名底下' : '这一卷已解散，' + n + ' 个章并进' + nxt);
    };
    const volMenu = (ev, v) => {
      const only = b.vols.length <= 1;
      Menu.open(ev.clientX, ev.clientY, [
        { label:'改名', fn:() => rename(v.title, async t => { await Work.renameVol(v.id, t); draw(); }) },
        { label:'这一卷加一章', fn:() => add(v.id) },
        cruiseReady(v.id) ? { label:'词巡航（这一卷的词格闪卡）', fn:() => Desk.addTab('cruise', v.id) } : null,
        { sep:1 },
        { label: only ? '全书改成不分卷（章挂到书名底下）' : '解散这一卷（章并进' + (b.vols[0].id === v.id ? '后一卷' : '前一卷') + '）', fn:() => dissolve(v) },
        { label:'删除这一卷（章进回收站）', fn:() => delVol(v) }
      ]);
    };
    const rename = (cur, cb) => {
      const inp = h('input', { class:'wnw-rename', value:cur });
      const box = h('div', { class:'wnw-row' }, [inp, h('button', { class:'wnw-btn mini', onclick:() => { cb(inp.value.trim() || cur); Overlay.close(); } }, '好')]);
      Overlay.open('改名字', box);
      inp.focus(); inp.select();
      inp.addEventListener('keydown', e => { if(e.key === 'Enter') box.children[1].click(); });
    };
    /* 单章目标：只给这一章钉一个数，钉了就不吃书里那个默认目标；0 = 跟着书走 */
    const goalDlg = (m) => {
      const cur = m.goal || 0;
      const inp = h('input', { class:'wnw-rename', type:'number', min:'0', value:String(cur), style:'width:120px' });
      const box = h('div', { class:'wnw-row' }, [inp,
        h('button', { class:'wnw-btn mini', onclick:async () => { await Work.setChGoal(m.id, inp.value); Overlay.close(); draw(); } }, '好'),
        cur ? h('button', { class:'wnw-btn mini', onclick:async () => { await Work.setChGoal(m.id, 0); Overlay.close(); draw(); } }, '跟着书走') : null]);
      Overlay.open('单章目标 · ' + m.title, box);
      inp.focus(); inp.select();
      inp.addEventListener('keydown', e => { if(e.key === 'Enter') box.children[1].click(); });
    };
    /* 章节功能：和笔落一样，收在章列表右上角那个 ⋮ 里 */
    const chMenu = (ev) => {
      Menu.open(ev.clientX, ev.clientY, [
        { label:'新建章节', fn:() => add() },
        { label:'新建分卷', fn:() => addVol() },
        { sep:1 },
        { label:'修正章节序号 · 序号格式', fn:() => SeqDlg.open() },
        { label:'重新计算字数', fn:async () => { const n = await Work.fillWords(true); draw(); toast(n ? '已重算 ' + n + ' 章' : '字数没变化'); } },
        { label:'列表反序', fn:async () => { await Work.reverseChs(); draw(); } },
        { sep:1 },
        { label:'书籍信息 · 目标 / 单价', fn:() => bookInfoDlg(draw) },
        { label:'回收站', fn:() => trashDlg() },
        { label:'整本导出', fn:() => BookExport.dlg('book') },
        /* 整本导入（外32 图6）：认的是这张书自己那套序号格式（自建那几种也算），外加整本导出那份 md 的 ## 卷 / ### 章。
           落点两枚在弹出的那一屏里挑，默认并进当前这本。 */
        { label:'整本导入', title:'挑一份 txt / md 摊成卷章：卷标题认「第X卷 / 卷X / 第X部 / 第X辑」，章节标题认「第X章 / 第X节 / 第X回」和你自建的那几种序号格式 · 卷标题一个没认出就整本按不分卷进 · 挑之前先给你看认出了几卷几章',
          fn:() => BookImport.pick('here', draw) },
        /* 书巡航（外26 追加）：跨卷把整本书每一卷的词格章串成一串闪卡。
           这本书一个词格都没有的时候这一条不摆（摆一条点开来是空屏的比少一条更糟）。 */
        cruiseBookReady() ? { label:'书巡航（整本书的词格闪卡）',
          title:'不分卷：这本书里哪些章是词格模式，就收哪些章的行；卷巡航只吃整卷都是词格的那一卷，这一条放宽到一章',
          fn:() => Desk.addTab('cruise', CRUISE_BOOK) } : null,
        { sep:1 },
        { label:'快捷创建章节', on:listSt.quick, fn:async () => { listSt.quick = !listSt.quick; await State.set('ch.list', listSt); draw(); } },
        { label:'显示累计字数（按书籍累计）', on:listSt.cum, fn:async () => { listSt.cum = !listSt.cum; await State.set('ch.list', listSt); draw(); } },
        { sep:1 },
        /* 行尾那串数的分母（外25 第 3 条）：三档各管一种比法，卷行在带比值的两档里都吃全书 */
        { label:'行尾只显字数', on:listSt.den === 'off', fn:() => setDen('off') },
        { label:'行尾加比值 · 章比本卷、卷比全书', on:listSt.den === 'vol', fn:() => setDen('vol') },
        { label:'行尾加比值 · 章和卷都比全书', on:listSt.den === 'book', fn:() => setDen('book') }
      ]);
    };
    const setDen = async (k) => { listSt.den = k; await State.set('ch.list', listSt); draw(); };
    const trashDlg = () => {
      const b = Work.book;
      const box = h('div', { class:'wnw-col', style:'min-width:min(520px,90vw)' });
      const list = (b.trash || []);
      if(!list.length) box.appendChild(h('div', { class:'wnw-hint' }, '回收站是空的'));
      for(const t of list.slice().reverse()){
        box.appendChild(h('div', { class:'wnw-item', style:'flex-wrap:nowrap' }, [
          h('span', { class:'ttl' }, t.title || '（无题）'), h('span', { class:'snip' }, new Date(t.at).toLocaleString('zh-CN')),
          h('span', { style:'flex:1' }),
          h('button', { class:'wnw-btn mini', onclick:async () => { await Work.restoreCh(t); Overlay.close(); draw(); toast('已放回大纲'); } }, '放回'),
          h('button', { class:'wnw-btn mini', onclick:async () => {
            /* 回收站里这一条是那份正文的最后一份，删掉就没有第二处可捞了 —— 这一个必须问 */
            if(!await wnwAsk('彻底删掉「' + (t.title || '（无题）') + '」？这是正文的最后一份，删了哪儿都捞不回来。')) return;
            await DB.del('book.' + b.id + '.ch.' + t.id); b.trash = b.trash.filter(x => x !== t); await Work.saveBook(); Overlay.close(); toast('已彻底删除');
          } }, '彻底删')
        ]));
      }
      Overlay.open('回收站', box);
    };
    const openVol = (v) => { Desk.addTab('vol', v.id); };
    /* 把这一份列表登记给 Ctrl+A：指针在它身上的条子按下过，那一下才归它（w0-skin 的 pickBind / pickAsk）。
       登记的是列表那一块容器，不是整张面板 —— 顶栏那几个按钮按下去不算「在这一张列表里按过」。 */
    ps.box = body; ps.redraw = draw;
    ChPick.push(ps); chKeys(); pickBind(body);
    go();
    /* 图1 / 图7 的根：从前这两条订的是 Bus.on，而退订那一只手是空的（下面那个 unmount 里什么都没做）。
       左栏每重画一次就多攒一对监听，而自动保存本身就在重画左栏 —— 打十分钟字，一次保存能牵出十几趟整列重画，
       越打越闪就是这么来的。换成 ctx.on 之后，卸这一屏时由 Desk.render 统一解监听；
       存盘这一趟也只就地改数，整列重画留给真改了结构的那几处（新建 / 删除 / 挪卷 / 换子页 / 换比值那一档）。 */
    ctx.on('desk:saved', () => 就地刷新());
    ctx.on('ch:mode', () => 就地刷新());   /* 换模式那一下：章前那一枚图标立刻跟着换（外32 图5） */
    ctx.on('desk:renamed', () => draw());
    return { unmount(){ } };
  }
});

/* ---------- 卷：卷简介 + 本卷章列表 ---------- */
Views.reg('vol', {
  name:'卷', icon:'log',
  title:(ref) => { const v = Work.vol(ref); return v ? v.title : '卷'; },
  render(host, ref){
    const v = Work.vol(ref);
    if(!v){ host.appendChild(h('div', { class:'wnw-empty' }, '这一卷不存在了')); return; }
    const box = h('div', { class:'wnw-doc' });
    host.appendChild(box);
    const inner = h('div', { class:'wnw-doc-inner' });
    box.appendChild(inner);
    inner.appendChild(h('h2', { style:'margin:.4em 0' }, v.title));
    const d = h('textarea', { class:'wnw-ta-big', placeholder:'这一卷讲什么', style:'min-height:120px' });
    d.value = v.desc || '';
    d.addEventListener('input', () => { v.desc = d.value; Work.saveBook(); });
    inner.appendChild(d);
    inner.appendChild(h('div', { class:'wnw-gph' }, '本卷章节'));
    for(const m of Work.orderedChs().filter(c => c.vid === v.id))
      inner.appendChild(h('div', { class:'wnw-card-row', onclick:() => Desk.addTab('ch', m.id) }, [
        h('span', { class:'dot' }), h('span', { class:'nm' }, m.title), h('span', { class:'tp' }, chWords(m) + '字')
      ]));
  }
});

/* ---------- 统计那一屏底下的可插块：谁家要再挂一块，自己 StatBlock.reg 一份 ----------
   块自己管显不显、自己管重画，统计本体不认识任何一块的名字 —— 摘掉一块这边一个字不用改
   （外46 十 · 可拆性整理 2026-10-12：本体原先直接养着指标卡底下那一块，拆功能的时候两支会撞这一颗文件，
   所以改成名单登记，那一块搬去它自己那份源码里）。 */
const STAT_BLOCKS = [];
const StatBlock = { reg(b){ STAT_BLOCKS.push(b); } };

/* ---------- 写作统计：指标卡网格，看哪几张自己勾（勾选存全局） ---------- */
Views.reg('stat', {
  name:'写作统计', icon:'stats', dockable:true, compactBelow:300,
  title:() => '写作统计',
  async render(host, ref, ctx){
    host.innerHTML = '';
    /* 这一格摆的全是读数（字数、时长、流畅度那一排排数字），按住拖出蓝底没意义 → 关掉原生选区 */
    const box = h('div', { class:'wnw-pbody wnw-nosel' });
    /* 指标卡底下那几块是各家自己登记进来的（名单在上面 STAT_BLOCKS），立起来要在 box 之后 ——
       那一块是排在读数下面的。每块自己管显不显，本体只挨个叫一声。 */
    const blocks = [];
    const showBlocks = async () => { for(const b of blocks) await b.repaint(); };
    /* 这两枚：停在右栏卡片里就交给卡片那一行标题栏（正文里不再单占一行），开成标签时照旧摆在顶上 */
    const ops = [
      h('button', { class:'wnw-btn mini', onclick:() => statPrefsDlg(draw) }, '选卡'),
      h('button', { class:'wnw-btn mini', onclick:async () => { await draw(); for(const b of blocks) b.refresh && b.refresh(); } }, '刷新')];
    const dbar = dockBarOf(host);
    if(!dbar) host.appendChild(h('div', { class:'wnw-phead wnw-nosel' }, [h('span', { style:'flex:1' })].concat(ops)));
    else dockOpsInto(dbar, ops);
    host.appendChild(box);
    for(const reg of STAT_BLOCKS) blocks.push(reg.mount(host, ctx));
    await showBlocks();
    const cell = (n, t) => h('div', { class:'wnw-card wnw-stat-cell' }, [
      h('div', { class:'v' }, String(n)), h('div', { class:'wnw-hint' }, t)]);
    const draw = async () => {
      box.innerHTML = '';
      await showBlocks();
      const b = Work.book;
      if(!b){ box.appendChild(h('div', { class:'wnw-hint' }, '还没打开书')); return; }
      const st = await statNumbers();
      box.appendChild(h('div', { class:'wnw-grid wnw-stat-grid' },
        STAT_CARDS.filter(c => Meter.cards[c.k]).map(c => cell(st[c.k], c.k))));
      if(!STAT_CARDS.some(c => Meter.cards[c.k])) box.appendChild(h('div', { class:'wnw-hint' }, '一张卡都没勾，点上面「选卡」挑几张'));
      const open = Work.cur ? await Work.ch(Work.cur) : null;
      if(open){
        box.appendChild(h('div', { class:'wnw-gph' }, '本章'));
        box.appendChild(h('div', { class:'wnw-hint' }, '正文 ' + parasCount(open.paras).w + ' 字 · 章纲 ' + parasCount(open.outline).w +
          ' 字 · 批注 ' + open.annos.length + ' 条 · 未处理痕迹 ' + open.paras.reduce((a, p) => a + Trace.ranges(p).length, 0) +
          ' · 版本 ' + (await Hist.count(open.id))));
      }
    };
    draw();
    /* 这一台每 5 秒把整份库摊一遍（statNumbers 里 Meter.allSec 要 await Shelf.get 每一本书、
       登记在册的那几块又要各自重画一遍）。浮层开着的时候这一趟正好挤在第一次按键前面
       （外34 追加：「这里总是卡一会儿才能输入书名」），面板已经从页面上摘下去时也白跑 ——
       两种情况都跳过这一拍：数还是那一拍到了再对，不丢东西。 */
    const timer = setInterval(() => { if(Overlay.node || !host.isConnected) return; draw(); }, 5000);
    if(ctx && ctx.dispose) ctx.dispose(() => clearInterval(timer));
  }
});

/* 每张卡的数都在这儿算，一次算完 */
async function statNumbers(){
  const b = Work.book;
  const d = Meter.today() || { han:0, sec:0, type:0, delS:0, delL:0, typeSec:0, think:0, slack:0 };
  const open = Work.cur ? await Work.ch(Work.cur) : null;
  /* 本章字数只算正文；进度看这一章自己钉的目标，没钉就吃书里的单章目标 */
  const chWords = open ? parasCount(open.paras).w : 0;
  const bookWords = Work.totalWords();
  const net = Meter.netDay(d);
  const pay = b.pay || 0, goal = b.goal || 0;
  const md = Work.chMeta(Work.cur);
  const chGoal = (md && md.goal) || b.chGoal || 0;
  const perMin = d.typeSec > 30 ? Math.round(net / (d.typeSec / 60)) : 0;
  const allW = await Meter.allWords(), allS = await Meter.allSec();
  const shelf = await Shelf.load();
  const yuan = n => (n / 1000 * pay).toFixed(2) + ' 元';
  return {
    '本章字数': chWords, '本书字数': bookWords,
    '本章进度': chGoal ? Math.min(999, Math.round(chWords / chGoal * 100)) + '%' : '—',
    '今日字数': net, '今日时长': hms(d.sec || 0),
    '今日速度': perMin ? perMin : '—',
    '流畅度': d.type ? Math.round(d.type / (d.type + d.delS) * 100) + '%' : '—',
    '专注度': (d.typeSec + d.think + d.slack) ? Math.round(d.typeSec / (d.typeSec + d.think + d.slack) * 100) + '%' : '—',
    '思考时长': hms(d.think || 0), '摸鱼时长': hms(d.slack || 0),
    '本书目标进度': goal ? Math.min(999, Math.round(bookWords / goal * 100)) + '%' : '—',
    '总共字数': allW, '总时长': hms(allS),
    '平均速度': allS > 60 ? Math.round(allW / (allS / 60)) : '—',
    '作品数': shelf.books.length,
    '本章预估稿费': pay ? yuan(chWords) : '—', '本书预估稿费': pay ? yuan(bookWords) : '—'
  };
}

/* 选卡：勾要看哪几张 + 错删阈值 */
function statPrefsDlg(onDone){
  const box = h('div', { class:'wnw-col', style:'gap:12px;min-width:min(460px,88vw)' });
  const grid = h('div', { class:'wnw-grid', style:'grid-template-columns:repeat(auto-fill,minmax(9.5em,1fr));gap:6px' });
  for(const c of STAT_CARDS){
    const cb = h('input', { type:'checkbox', checked:!!Meter.cards[c.k] });
    cb.addEventListener('change', async () => { Meter.cards[c.k] = cb.checked; await Meter.save(); if(onDone) onDone(); });
    /* 名字那一栏不给折行：原来按 112px 排，「本章预估稿费」这种六个字的刚好差一点点，
       就在常规字号下折成两行，整张对话框跟着抖。改吃 em，格子宽度随字号走，字永远在一行上 */
    grid.appendChild(h('label', { class:'wnw-switch' }, [cb, h('span', { style:'white-space:nowrap' }, c.k)]));
  }
  box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, '指标卡'), grid]));
  /* 底下那几块各自的设定项，由登记进来的那一家自己摆（本体不认得它们要什么档） */
  for(const reg of STAT_BLOCKS) if(reg.prefs) reg.prefs(box, onDone);
  const dn = h('input', { class:'wnw-input', type:'number', min:'0', value:String(Meter.delN), style:'width:72px' });
  dn.addEventListener('change', async () => { Meter.delN = Math.max(0, parseInt(dn.value, 10) || 0); dn.value = String(Meter.delN); await Meter.save(); if(onDone) onDone(); });
  box.appendChild(h('div', { class:'wnw-field' }, [h('span', {}, '删几字以内算错删'), dn]));
  Overlay.open('统计', box);
}

/* 书籍信息：书名 / 全书目标 / 单章目标 / 千字单价 */
/* ---------- 高亮外观：四个页签各管一摊（通用 / 背景 / 边框 / 下划线），顶上那行随时给预览
   「跟色位」= 不自己定长相，回到设置里点的那个色点 ---------- */
function hlStyleDlg(r, onDone, save){
  /* 存到哪儿交给调用方：设置·高亮里每条规则存进 WriteCfg，卡片面板里那一个入口存到卡自己身上，
     两头的长相编辑器是同一只口（他要的「就像规则高亮的外观设定那样」），不该各写一份。 */
  const 存 = save || (() => WriteCfg.save());
  const st = r.st ? JSON.parse(JSON.stringify(r.st)) : hlNewSt();
  const f = (lab, node) => h('div', { class:'wnw-field' }, [h('span', {}, lab), node]);
  const pv = h('span', { class:'hl-' + (r.slot || 1) }, '她说《半山文集》里的地名要亮一下');
  const paintPv = () => { pv.style.cssText = hlCss(st); };
  const sel = (list, val, fn) => {
    const s = h('select', { class:'wnw-input' });
    for(const [k, n] of list) s.appendChild(h('option', { value:k, selected:k === val }, n));
    s.addEventListener('change', () => { fn(s.value); paintPv(); });
    return s;
  };
  /* 「样式」那一格从下拉换成一段画着线的钮（第 13 条「线条加上预览」）：下拉里只有名字，
     点开才知道哪条是虚线哪条是点线；画出来一眼认得出，选中的那一个照旧吃 --sel-bg。
     用的是全站现成的分段控件，键盘 Tab 得到、Enter 按得下，不另起一套机制。
     回调和原来那一条一致（调用方自己 fill() 重铺这一页，所以选中态跟着重建，不用手工挪 class）。 */
  const lineSel = (list, val, fn) => {
    const seg = h('div', { class:'wnw-seg wnw-linebtns' });
    for(const [k, n] of list){
      const g = lineGlyph(k);
      seg.appendChild(h('button', { class:k === val ? 'on' : '', title:n,
        onclick:() => { fn(k); paintPv(); } }, g ? [g, h('span', {}, n)] : [h('span', {}, n)]));
    }
    return seg;
  };
  const num = (v, mn, mx, fn) => {    const i = h('input', { class:'wnw-input', type:'number', value:String(v == null ? 0 : v), min:mn, max:mx, step:'1' });
    i.style.width = '60px';
    i.addEventListener('input', () => { fn(Math.max(mn, Math.min(mx, parseInt(i.value, 10) || 0))); paintPv(); });
    return i;
  };
  const slide = (v, mn, mx, fn) => {
    const rg = h('input', { type:'range', min:mn, max:mx, step:'1', value:String(v) });
    const tx = h('span', { class:'wnw-hint' }, String(v));
    rg.addEventListener('input', () => { const n = parseInt(rg.value, 10) || 0; tx.textContent = String(n); fn(n); paintPv(); });
    return h('div', { class:'wnw-row', style:'gap:7px;align-items:center' }, [rg, tx]);
  };
  const colBox = (v, fn) => {
    const isVar = s => /^var\(--(?:mark|slot)-\d+/.test(String(s || '').trim());
    const pk = h('input', { type:'color', class:'wnw-hl-col', value:/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#808080' });
    const tx = h('input', { class:'wnw-input', value:v || '', placeholder:'色号' });
    tx.style.width = '110px';
    const clr = h('button', { class:'wnw-btn mini' }, '清除');
    /* 从标记色里挑一个（外13-N）：存进存档的是「第几个」那一句取值（var(--mark-N …)），不是色号，
       所以用户在 设置·外观 里换那个颜色时这一处跟着换，不必回来重挑。
       这里不摊一整排（一屏五种颜色，每种二十个会把对话框撑爆），点「标记色」才展开这一排。 */
    const mrow = h('div', { class:'wnw-slots', style:'display:none' });
    const mbtn = h('button', { class:'wnw-btn mini', title:'从全局那一串标记色里挑一个' }, '标记色');
    const paintMarks = () => {
      mrow.innerHTML = '';
      const cur = markIndexOf(tx.value);
      (typeof markSlots === 'function' ? markSlots() : []).forEach((c, i) => mrow.appendChild(h('button', {
        class:'wnw-slot' + (cur === i ? ' on' : ''), title:'第 ' + (i + 1) + ' 个标记色',
        'aria-pressed':cur === i ? 'true' : 'false', style:'background:' + c,
        onclick:() => { fn(c); tx.value = c; pk.value = '#808080'; mrow.style.display = 'none'; paintPv(); } })));
    };
    mbtn.addEventListener('click', () => {
      const open = mrow.style.display !== 'none';
      if(open){ mrow.style.display = 'none'; return; }
      paintMarks(); mrow.style.display = 'flex';
    });
    pk.addEventListener('input', () => { tx.value = pk.value; fn(pk.value); paintPv(); });
    tx.addEventListener('change', () => { const s = tx.value.trim(); const c = isVar(s) ? s : (normColor(s) || ''); fn(c); if(/^#[0-9a-f]{6}$/i.test(c)) pk.value = c; else tx.value = c; paintPv(); });
    clr.addEventListener('click', () => { tx.value = ''; fn(''); paintPv(); });
    return h('div', { class:'wnw-col', style:'gap:5px' }, [
      h('div', { class:'wnw-row', style:'gap:5px;align-items:center' }, [pk, tx, mbtn, clr]), mrow ]);
  };
  /* 内边距：上 / 右 / 下 / 左 各一格 */
  const pads = () => {
    const row = h('div', { class:'wnw-row', style:'gap:5px;align-items:center' });
    ['上', '右', '下', '左'].forEach((n, i) => {
      row.appendChild(h('span', { class:'wnw-hint' }, n));
      row.appendChild(num(st.p[i], 0, 24, v => { st.p[i] = v; }));
    });
    return row;
  };
  const gradRow = () => {
    const box = h('div', { class:'wnw-col', style:'gap:5px' });
    const fill = () => {
      box.innerHTML = '';
      st.bg.g.forEach((c, i) => {
        const row = h('div', { class:'wnw-row', style:'gap:5px;align-items:center' });
        row.appendChild(colBox(c, v => { st.bg.g[i] = v || '#808080'; }));
        row.appendChild(h('button', { class:'wnw-btn mini', title:'去掉这一段颜色', html:icoMarkup('close'), onclick:() => { if(st.bg.g.length < 6){ st.bg.g.splice(i, 1); fill(); paintPv(); } } }));
        box.appendChild(row);
      });
      box.appendChild(h('button', { class:'wnw-btn mini w-txt', html:icoMarkup('plus') + '加一段颜色', onclick:() => { if(st.bg.g.length < 6){ st.bg.g.push('#ffe4a3'); fill(); paintPv(); } } }));
    };
    fill();
    return box;
  };
  const pages = {
    通用(){
      return h('div', { class:'wnw-col', style:'gap:8px' }, [
        f('字体样式', sel(HL_F, st.f, v => { st.f = v; })),
        f('字重', sel(HL_W, st.w, v => { st.w = v; })),
        f('斜体', h('label', { class:'wnw-switch' }, [h('input', { type:'checkbox', checked:!!st.i,
          onchange:ev => { st.i = ev.target.checked; paintPv(); } }), h('span', {}, '打斜')])),
        f('文字颜色', colBox(st.c, v => { st.c = v; })),
        f('圆角', slide(st.r, 0, 20, v => { st.r = v; })),
        f('内边距', pads())
      ]);
    },
    背景(){
      /* 纯色 ↔ 渐变 来回切时把颜色带着走：切过去是空的那格没法看，也没法点两下才成形 */
      const seed = () => {
        if(st.bg.k === 'grad'){
          if(!st.bg.g.length) st.bg.g = [st.bg.c || '#dbeafe', '#f3e8ff'];
          else if(st.bg.g.length === 1) st.bg.g.push('#f3e8ff');
        }
        if(st.bg.k === 'solid' && !st.bg.c) st.bg.c = (st.bg.g || [])[0] || '#dbeafe';
      };
      const body = h('div', { class:'wnw-col', style:'gap:8px' });
      const fill = () => {
        body.innerHTML = '';
        body.appendChild(f('类型', sel(HL_BGK, st.bg.k, v => { st.bg.k = v; seed(); fill(); paintPv(); })));
        if(st.bg.k === 'solid') body.appendChild(f('纯色', colBox(st.bg.c, v => { st.bg.c = v; })));
        if(st.bg.k === 'grad'){
          body.appendChild(f('角度', slide(st.bg.a, 0, 359, v => { st.bg.a = v; })));
          body.appendChild(f('渐变色', gradRow()));
        }
      };
      fill();
      return body;
    },
    边框(){
      const body = h('div', { class:'wnw-col', style:'gap:8px' });
      const fill = () => {
        body.innerHTML = '';
        body.appendChild(f('样式', lineSel(HL_LINE.filter(x => ['', 'solid', 'dashed', 'dotted'].includes(x[0])), st.bd.s, v => { st.bd.s = v; fill(); paintPv(); })));
        if(!st.bd.s) return;
        body.appendChild(f('宽度', num(st.bd.w, 1, 6, v => { st.bd.w = v; })));
        body.appendChild(f('颜色', colBox(st.bd.c, v => { st.bd.c = v; })));
      };
      fill();
      return body;
    },
    下划线(){
      const body = h('div', { class:'wnw-col', style:'gap:8px' });
      const fill = () => {
        body.innerHTML = '';
        body.appendChild(f('样式', lineSel(HL_LINE, st.ul.s, v => { st.ul.s = v; fill(); paintPv(); })));
        if(!st.ul.s) return;
        body.appendChild(f('颜色', colBox(st.ul.c, v => { st.ul.c = v; })));
      };
      fill();
      return body;
    }
  };
  const tabRow = h('div', { class:'wnw-row', style:'gap:4px' });
  const pageBox = h('div', { class:'wnw-hl-page' });
  let now = '通用';
  const show = k => {
    now = k; pageBox.innerHTML = ''; pageBox.appendChild(pages[k]());
    for(const b of tabRow.children) b.classList.toggle('on', b.textContent === k);
  };
  for(const k of ['通用', '背景', '边框', '下划线'])
    tabRow.appendChild(h('button', { class:'wnw-tab', onclick:() => show(k) }, k));
  const looks = h('div', { class:'wnw-row', style:'gap:4px;flex-wrap:wrap' });
  for(const p of HL_LOOKS) looks.appendChild(h('button', { class:'wnw-btn mini', style:'background:' + hlCss({ bg:p.st.bg }),
    onclick:() => { const c = JSON.parse(JSON.stringify(p.st)); Object.assign(st, c); show(now); paintPv(); } }, p.n));
  looks.appendChild(h('button', { class:'wnw-btn mini', onclick:() => { Object.assign(st, hlNewSt()); show(now); paintPv(); } }, '清空'));
  const box = h('div', { class:'wnw-col', style:'gap:10px;min-width:min(420px,90vw)' }, [
    h('div', { class:'wnw-hl-pv' }, [pv]),
    f('现成样子', looks),
    tabRow, pageBox,
    h('div', { class:'wnw-row', style:'gap:8px' }, [
      h('button', { class:'wnw-btn', onclick:async () => {
        r.st = null; await 存(); Overlay.close(); toast('这条改回跟色位'); if(onDone) onDone();
      } }, '跟色位'),
      h('button', { class:'wnw-btn primary', onclick:async () => {
        st.c = normColor(st.c); st.bd.c = normColor(st.bd.c); st.bg.c = normColor(st.bg.c);
        st.bg.g = st.bg.g.map(x => normColor(x) || x);
        r.st = st; await 存(); Overlay.close(); toast('外观已存'); if(onDone) onDone();
      } }, '存好')
    ])
  ]);
  paintPv(); show('通用');
  Overlay.open('高亮外观 · ' + r.name, box, null, { fix:'高亮' });
}

/* 可用的正则写法（外25 第 11 条）：高亮那一屏给一个按钮点开它。
   写的是这一台引擎实际做的事，不是泛泛的正则教程：式子按 JavaScript 正则读、加 g 全局扫、
   命中的整段一起上色（括号只管分组）；能空着的式子每回往后挪一格，所以不会卡住但会一格一格亮成一片。 */
function hlRegexHelp(){
  const row = (n, s, w) => h('div', { class:'wnw-hl-re-row' }, [
    h('span', { class:'nm' }, n), h('code', {}, s), h('span', { class:'ds' }, w)]);
  const grp = t => h('div', { class:'wnw-hl-re-grp' }, t);
  const box = h('div', { class:'wnw-col', style:'gap:6px;min-width:min(620px,92vw)' }, [
    h('div', { class:'wnw-hint' }, '规则那一格写的是一条 JavaScript 正则（全局扫），命中的整段一起上色。下面这些是这一台认的写法和现成的例子。'),
    grp('认的记号'),
    row('或', '但是|可是|然而', '竖线两边任选一边'),
    row('一组', '(省|市|县)', '括号只管分组，不多算一段'),
    row('一类字', '[！？]{2,}', '方括号里任一一个；后面 {2,} 是至少两个'),
    row('个数', '[0-9]{4} 年', '{4} 正好四个、{1,6} 一到六个'),
    row('多与少', '\\w+ \\w* \\w?', '+ 至少一个 · * 零或多个 · ? 可有可无'),
    row('中文', '[\\u4e00-\\u9fa5]', '这一段码位是所有汉字'),
    row('任一字 / 空白', '. \\s \\d', '. 任一字 · \\s 空白 · \\d 一个数字'),
    row('前后看', '(?=[，。])', '只在这一处前后是这些东西时才亮，亮的不含它们'),
    row('要写它自己', '\\. \\* \\+ \\? \\( \\) \\[ \\] \\{ \\} \\| \\\\', '点、星号、加号、问号、括号、花括号、竖线、反斜杠：前面都得顶一个反斜杠'),
    grp('几条现成的（出厂那几条的式子，可以直接抄走改）'),
    ...HL_SEED.filter(s => s.src).map(s => row(s.name, s.src, '')),
    grp('两档要注意'),
    row('能空着的式子', 'a*  x?', '不会卡住（每回往后挪一格），但会一格一格亮成一片 —— 别这么写'),
    row('式子写坏了', '（比如括号没合）', '那一格边框标红，这一条不参与高亮，别的不受影响'),
    h('div', { class:'wnw-row', style:'gap:8px;margin-top:4px' }, [
      h('button', { class:'wnw-btn primary', onclick:() => Overlay.close() }, '关闭')])]
  );
  Overlay.open('可用的正则写法', box, null, { fix:'高亮' });
}

function bookInfoDlg(onDone){  const b = Work.book; if(!b) return;
  const f = (lab, node) => h('div', { class:'wnw-field' }, [h('span', {}, lab), node]);
  const inp = (v, ty) => h('input', { class:'wnw-input', type:ty || 'text', value:String(v == null ? '' : v) });
  const name = inp(b.title), goal = inp(b.goal || 0, 'number'), chGoal = inp(b.chGoal || 0, 'number'), pay = inp(b.pay || 0, 'number');
  for(const el of [goal, chGoal, pay]) el.style.width = '110px';
  const box = h('div', { class:'wnw-col', style:'gap:10px;min-width:min(400px,88vw)' }, [
    f('书名', name), f('全书目标字数', goal), f('单章目标字数', chGoal), f('千字单价（元）', pay),
    h('div', { class:'wnw-hint' }, '创建 ' + todayKey(new Date(b.created || b.at)) + ' · ' + b.chs.length + ' 章 · 全书 ' + Work.totalWords() + ' 字'),
    h('div', { class:'wnw-row' }, [h('button', { class:'wnw-btn primary', onclick:async () => {
      const t = name.value.trim();
      if(t) b.title = t;
      b.goal = Math.max(0, parseInt(goal.value, 10) || 0);
      b.chGoal = Math.max(0, parseInt(chGoal.value, 10) || 0);
      b.pay = Math.max(0, parseFloat(pay.value) || 0);
      await Work.saveBook();
      Desk.drawTop();
      Overlay.close();
      toast('书籍信息已存');
      if(onDone) onDone();
    } }, '存好')])
  ]);
  Overlay.open('书籍信息', box);
}

/* ---------- 章节视图注册 + 顶栏入口 ---------- */
Views.reg('ch', {
  name:'章', icon:'log',
  title:async (ref) => { const c = await Work.ch(ref); return c ? c.title : '章'; },
  render(host, ref, ctx){ new ChView(host, Object.assign({ ref }, ctx)).boot(); }
});
registerTool({ id:'write', name:'写作', desc:'书架 → 书 → 章', core:true, order:-1,
  ready: Promise.resolve(), mount(){ } });
