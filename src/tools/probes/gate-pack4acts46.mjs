/* ============================================================
   gate-pack4acts46.mjs · 插件分离第 2 批 2.1~2.4 与 2.7：四个动作成形 + 界面上不許有"缺失"那种话
   ------------------------------------------------------------
     node src/tools/probes/gate-pack4acts46.mjs
   钉的是这么几件事：
     一、四个动作各是一颗、各管一段：安装（把包放进路径，装完先不加载）· 加载（请进使用页）·
        卸载（从使用页撤下来，包留在路径里）· 删除（把那一格连文件一起清掉）；
     二、旧那一屏上那一排整屏清空：眼睛（在不在列表里）、info 那一页、「显示已隐藏」那个勾、
        两颗「导入插件」、右下角那张「用推演组件定制做一个新组件」的加号卡 —— 一处不留；
     三、「加载了就上首页」这一条两端都钉：卸载 = 从桌上拿走那张卡、加载 = 下一趟开机补一张，
        不留"加载着但桌上没这张卡"那种中间状态；
     四、删除那一手卡死在插件路径以内：只认包名、越出去一律不删、删之前问一句；
     五、界面上的句子不許写"缺失"那一类话（#30：一律不做缺失提示）—— 扫的是引号里的字串，
        注释里交代历史的句子不算（那些话是写给改代码的人看的，不会摆到用户眼前）。
   这台自己也要被咬一口：末尾拿一句假话试一遍，扫不出来就是假绿。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { rd, 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-pack4acts46');
const 名单 = rd('src/_shared/sh-packs.js');
const 装载 = rd('src/_shared/sh-load.js');
const 桌 = rd('src/_fd/src/fd3-shell.js');
const 顶栏 = rd('src/_fd/src/fd9-title.js');
const 模板 = rd('src/_fd/template.html');
const 为写 = rd('src/_wnw/src/w3-shell.js');
const 尺 = rd('src/pack/comp-files.cjs');
const 壳导入 = rd('src/_tauri/src/tauri_bind/pack_cmds.rs');
const 壳文件 = rd('src/_tauri/src/tauri_bind/comp_cmds.rs');
const 媒体 = rd('src/_tauri/src/core/media_rule.rs');

/* 剥掉注释：界面上的句子认得回来，注释里交代历史的句子不算 */
function 只认代码(源){
  return String(源).replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*(\/\/|\*).*$/gm, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}
/* 一本里所有引号包着的句子（JS 单引号与 Rust 双引号都收；模板里那种 <button>…</button> 的正文单独收） */
function 界面上的话(源, 取){ return (取 || (s => [...s.matchAll(/'([^'\n]*)'/g)].map(m => m[1])))(源); }

/* ---------- 一 · 四个动作各是一颗 ---------- */
台.题('一、四个动作各是一颗、各管一段');
for(const 颗 of ['load(', 'unload(', 'remove(', 'importOne(']){
  台.判('中立那本里有这一颗：' + 颗.slice(0, -1), 名单.includes('  async ' + 颗));
}
for(const 颗 of ['loadButton', 'unloadButton', 'removeButton', 'installButton']){
  台.判('画钮那一颗在：' + 颗, 名单.includes('  ' + 颗 + '('));
}
/* 每颗只做自己那一段：改名单的绝不碰盘，碰盘的抹成了才改名单 */
const 那一段 = (起, 止) => 名单.slice(名单.indexOf(起), 名单.indexOf(止));
台.判('加载与卸载只改名单（那两段里搜不到删整格的手）',
  /async load\(id\)\{[\s\S]*?apply\(cur\.concat\(\[id\]\)/.test(名单)
  && /async unload\(id, opt\)\{[\s\S]*?apply\(cur\.filter\(x => x !== id\)/.test(名单)
  && !那一段('async load(id){', 'async remove(id, opt){').includes('compDelete')
  && !那一段('async load(id){', 'async remove(id, opt){').includes("op:'delete'"));
台.判('装完不自动加载：包进路径之后写的是「除它以外那几家」',
  /装完先不加载|装完不自动加载/.test(名单) && /this\.apply\(cur\.filter\(x => x !== r\.id\)/.test(名单));
台.判('删除这一颗先抹那一格、抹成了才改名单（反过来的话，抹不掉就成了"名单说该加载、盘上没这一格"）',
  (() => { const 段 = 那一段('async remove(id, opt){', 'async importOne(');
    return 段.includes("op:'delete'") && 段.indexOf("op:'delete'") < 段.indexOf('cur.filter(x => x !== id)'); })());
/* 屏幕与两处入口 */
台.判('Flow-Desk 那一屏叫「插件管理」，顶栏那颗与右下角那颗都指向它',
  桌.includes("Modal.open('插件管理'") && 顶栏.includes("i('插件管理', '', () => Shell.packManager())")
  && 模板.includes('id="fdAddBtn">插件管理<'));

/* ---------- 二 · 旧那一屏清空 ---------- */
台.题('二、旧那一屏那一排一处不留');
for(const 件 of [['眼睛（在不在列表里）', /icoMarkup\((?:'|\")eye(Off)?('|\")/],
                 ['info 那一页', /PackOps\.(?:infoAsk|diskInfoAsk)/],
                 ['「显示已隐藏」那个勾', /显示已隐藏/],
                 ['那张加号卡', /用推演组件定制做一个新组件/],
                 ['旧的「装上 / 卸掉」字样', /'(?:装上|卸掉)'/]]){
  台.判('Flow-Desk 那一屏里不再有「' + 件[0] + '」', !件[1].test(只认代码(桌)), 件[0]);
}
台.判('中立那本里 info 那一页整台撤了（infoAsk / diskInfoAsk / infoBox 三个名字一处不剩）',
  !/infoAsk|diskInfoAsk|infoBox/.test(只认代码(名单)));
/* 为写那一屏也换了这一套动作的名字（它的列表与隐藏那一档是它自己的界面，不在这一条射程里） */
台.判('为写那一屏用的是同一套动作名，界面上不再有「装上 / 卸掉」',
  /PackOps\.(?:unloadButton|loadButton|removeButton)/.test(为写) && !/'(?:装上|卸掉)'/.test(只认代码(为写)));

/* ---------- 三 · 加载了就上首页 ---------- */
台.题('三、加载了就上首页，不留中间状态');
台.判('开机那一趟剪完孤卡就补一张（补齐桌面卡紧跟在 pruneMissing 后面）',
  桌.indexOf('this.pruneMissing();') > 0 && 桌.indexOf('this.补齐桌面卡();') > 桌.indexOf('this.pruneMissing();'));
台.判('补的那一张走的是问摆放那颗（插件分离第 4 批 4.1：主程序那张出厂布局表 → 这一家自己递上来的默认尺寸 → 问来的最小尺寸），位置仍然交 firstFit',
  /补齐桌面卡\(\)\{[\s\S]{0,900}?this\.问摆放\(w\)/.test(桌)
  && /问摆放\(卡名\)\{[\s\S]*?案\.w \|\| 默\.w \|\| 小\.w[\s\S]*?this\.firstFit\(w, h\)/.test(桌)
  && /问最小\(def\)\{[\s\S]*?def\.minSize[\s\S]*?def\.minW/.test(桌));
台.判('那张卡撤下这颗钮走的是「卸载」同一颗（同一个问话，不再自己抹布局）',
  /PackOps\.unloadAsk\(cid\)/.test(桌) && !/layout\.items = this\.layout\.items\.filter\(x => x\.id !== it\.id\)/.test(只认代码(桌)));
台.判('外壳不认任何一家的名字：补卡那一趟只问注册表与插件清单',
  !/['"]notes['"]|['"]schedule['"]|['"]why-not-write['"]/.test(桌.slice(桌.indexOf('补齐桌面卡(){'), 桌.indexOf('补齐桌面卡(){') + 1600)));

/* ---------- 四 · 删除卡死在插件路径内 ---------- */
台.题('四、删除那一手只认插件路径以内');
台.判('页面上那一颗走的是壳里那一颗 comp:delete（开发那台服务器走同一条 op，两条一个口径）',
  /compDelete/.test(名单) && /op:'delete'/.test(名单));
台.判('壳里那一颗只按包名动手、不接子路径，落点算完必须在 plugins\\<包名>\\ 里面',
  /pub fn comp_delete\(id: String\)/.test(壳文件) && 壳文件.includes('定落点(&活的那一格(), &id, None)'));
台.判('那把尺同一条规矩（开发那台与主进程共用一颗）', /remove\(id\)\{/.test(尺) && 尺.includes('路径跑出了这一格'));
台.判('包导入那一条不再留第二格（那一格随第 2 批 2.6 撤了，删除也只有一格可删）',
  !只认代码(壳导入).includes('留一份原版') && !只认代码(尺).includes('factory'));
台.判('删之前那一句摆出来了（removeAsk 里问一句，勾上才连数据一起清）',
  /removeAsk\(id, after\)/.test(名单) && /删除插件 · /.test(名单) && /wipe:cb\.checked/.test(名单));

/* ---------- 五 · 界面上不许有"缺失"那种话 ---------- */
台.题('五、四个动作的屏面上不寫「缺失」那一类话（#30）');
const 禁 = ['缺失', '没有内核', '未安装', '没装', '还没装', '装不回来'];
const 要看 = [['中立那本', 名单], ['装载器', 装载], ['Flow-Desk 那一屏', 桌], ['为写那一屏', 为写], ['那把尺', 尺], ['壳里那三颗', 壳导入 + 壳文件], ['媒体那几句', 媒体]];
const 犯 = [];
for(const [名, 源] of 要看){
  const 净 = 只认代码(源);
  const 句 = 界面上的话(名 === '媒体那几句' || 名 === '壳里那三颗' || 名 === '那把尺'
    ? 源 : 净, 名 === '媒体那几句' || 名 === '壳里那三颗' ? (s => [...s.matchAll(/"([^"\n]*)"/g)].map(m => m[1])) : null);
  for(const s of 句) for(const 字 of 禁) if(s.includes(字)) 犯.push(名 + '：「' + s + '」里有「' + 字 + '」');
}
台.数('扫到几句带禁字的界面上的话', String(犯.length) + ' 句');
台.判('一句都没有（缺东西这件事不摆到用户眼前，界面只报现状 + 给一颗钮）', 犯.length === 0, 犯.slice(0, 6).join(' | '));
/* 咬口：自己造一句假话喂进去，扫不出来就是这台子摆设 */
const 试 = 只认代码("const a = 'x';\n/* 注释里写「没装」不算 */\nconst 句 = '这台机器上还没装那个包';\nconst b = '没事的一句话';");
台.判('咬口 · 同样的扫法能逮住一句假话（逮不住说明这条是空闸）',
  界面上的话(试).some(s => s.includes('还没装')));
台.判('咬口 · 注释里那一句不吃（否则整仓历史注释全得改口，闸就变成了橡皮图章）',
  !界面上的话(试).some(s => s.includes('没装」不算')));
/* 装载器那两张卡说清的是"这一家出错了"，不是"缺一件东西" —— 顺带钉住措辞换了 */
台.判('出错卡指向现在真办得成的那两件事（卸载它 · 重装那一份包），不再提已撤的那颗入口',
  装载.includes('插件管理') && !/改代码/.test(只认代码(装载)));

/* ---- 他 2026-10-17 三条 issue 里的 #56「插件管理功能不显示插件」----
   根因不是数据读不到，是那一屏自己抛：fd3-shell.js 里那句 上了 读了一颗**没声明的** 加载中
   （f6ed1ba 那一刀删了声明、没改这一行），draw() 第一趟就 ReferenceError，整屏一份插件都不列。
   下面四条把他要的三条形状与这一颗变量一起钉住。 ---- */
台.题('七、issue #56：这一屏要列出路径里所有插件，四颗钮一律摆出来');
台.判('1 「上了没」问的是桌上那一片（这一轮真加载进页面了才算），不再读那颗没声明的 加载中 —— 那一句把整屏抛没了',
  桌.includes('const 上了 = 桌上.has(id) || 桌上.has(件名);') && !/加载中/.test(桌));
台.判('2 列表按他说的来：plugins 路径里存在插件包的就列（不再按 host 挑掉不归本宿主的那几家）',
  桌.includes('.filter(p => p.manifest && p.manifest.id)') && !/forHost\(p\.manifest\)/.test(桌));
台.判('3 每一行四颗全摆：加载、卸载、删除、换版（从前加载/卸载二选一，还要 .filter(Boolean) 摘掉回 null 的那颗；换版那颗也常在，按下去自己说这一趟不用换）',
  桌.includes('PackOps.loadButton(id, 名), PackOps.unloadButton(id, draw), PackOps.removeButton(id, draw),\n            PackOps.updateButton(id, 换完)]')
  && !/上了 \? PackOps\.unloadButton/.test(桌) && !/\.filter\(Boolean\)\)\n/.test(桌)
  && !/updateButton\(id, after\)\{\s*const 一 = this\.换版表\.get\(String\(id\)\);\s*if\(!一\) return null;/.test(名单));
台.判('4 四颗钮一律回一颗钮（「安装」那颗要始终在屏上）：读不到路径这种时候按下去把话说明白，不靠藏起来当提示',
  !/if\(!this\.can\(\)\) return null;/.test(名单) && 名单.includes('这一台能使()') &&
  /installButton\(\)\{\s*return h\('button'/.test(名单));
台.判('5 卸载与删除两颗顶上写着字（他要点名的是「加载、卸载、删除」三颗，光一颗图标认不出谁是谁）',
  /icoMarkup\('eject'\) \+ '卸载'/.test(名单) && /icoMarkup\('trash'\) \+ '删除'/.test(名单) &&
  /icoMarkup\('run'\) \+ '加载'/.test(名单) && /icoMarkup\('install'\) \+ '安装'/.test(名单));

/* ---- 他 #55「左上角菜单存在多余的分隔线」：三条线删掉，随之没人用的那颗与那条样式一起清 ---- */
台.题('八、issue #55：左上角那份菜单一条流水，不留分隔线');
台.判('三条分隔线全删（设置与放大之间、全屏与最小化之间、尾巴上那一条），生成名单那颗与画线那一支、那条样式一并撤走',
  !/gap\(\)/.test(顶栏) && !/sep:true/.test(顶栏) && !/r\.sep/.test(顶栏) && !/fd-msep/.test(模板));
台.判('菜单条目一种不少（重新载入页面 / 强制重新载入 / 插件管理 / 设置 / 放大 / 缩小 / 实际大小 / 全屏 / 最小化 / 还原窗口或最大化 / 退出程序）',
  ['重新载入页面', '强制重新载入', '插件管理', '设置', '放大', '缩小', '实际大小', '全屏', '最小化', '退出程序']
    .every(条 => 顶栏.includes("'" + 条 + "'")) && 顶栏.includes("this.st.maximized ? '还原窗口' : '最大化'"));

/* ---- 他 #25 这一轮现场量到的：包是新的、跑的还是旧代码 ----
   data\plugins\<那一家>\ 那一格换了，页面手里那份 kernel 却是开机那一刻 PackLoader.load 请进来的，
   点完「更新」界面上一个字都不变 —— 从他那头看就是「完全没修」。
   所以换完必须问一句重启；而"看得见哪几家可以换"不用重启（每画一遍列表都现问一次），
   从前那两句写的「重启后这里会告诉你」是句错话，害他白重启一趟。 ---- */
台.题('九、插件换上新的那一份之后：问一句重启，屏上那两句说清哪一步要重启');
{
  const 设 = rd('src/_fd/src/fd4-builtin.js');
  台.判('换完那一趟不是重画列表就完了：先重画，再问一句重启，答"立刻"才真重启',
    /const 换完 = async \(\) => \{[\s\S]*?await draw\(\);[\s\S]*?fdRestartAsk\([\s\S]*?\) === 'now'\) await fdRestart\(\);/.test(桌),
    (桌.match(/const 换完 = async \(\) => \{[\s\S]{0,240}/) || [''])[0].replace(/\n\s*/g, ' '));
  台.判('问话与那颗「立刻重启」全程序只有 fd3-shell.js 顶上那两颗：一键清理那一条也走它，措辞不留第二份',
    /function fdRestartAsk\(msg\)\{[\s\S]*?Modal\.open\('改动已经写进程序'/.test(桌)
    && 桌.includes("function fdRestart(){ return window.FD_APP && window.FD_APP.restartApp")
    && 设.includes('askRestart(msg){ return fdRestartAsk(msg); }') && 设.includes('restart(){ return fdRestart(); }')
    && !/Modal\.open\('改动已经写进程序'/.test(设));
  台.判('那句错话改了：要看得见哪几家可以换，按「重看」就当场告诉你，不叫他先重启',
    !名单.includes('重启后这里会告诉你') && !名单.includes('重启后软件会告诉你')
    && 名单.includes('再按这一屏上面那颗「重看」'));
  台.判('换上之前那一颗的悬停格里就写了"换完会问一句重启"（他要先知道这一趟不止换盘上那一格）',
    名单.includes('换完会问一句重启'));
  台.判('咬口 · 把「问一句重启」那一行摘掉，这一道立刻叫（留着重画列表也照样像没换）',
    !/const 换完 = async \(\) => \{[\s\S]*?fdRestartAsk/.test(
      桌.replace("if(await fdRestartAsk('插件已经换上新的那一份：重启之后，为写和各家面板跑的就是那一版。') === 'now') await fdRestart();", '')));
}

台.收尾();
