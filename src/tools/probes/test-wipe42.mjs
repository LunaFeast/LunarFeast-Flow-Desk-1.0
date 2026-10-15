/* 外42 这一批的闸（他三条点名：删「临时调试」那一档 / 数据页加一键清理 / 更新改页面文字那台小工具）
   ------------------------------------------------------------
   三件事各自钉住，每一条都报数：
     一 · 那一档删干净了 —— 源码里注册没了、实现整块没了；
         设置左边剩下的档数点得出来（少一档，不是多一档）
     二 · 一键清理这一条链接得上 —— 页面点的那一颗 → preload 那颗方法 → 主进程那条通道，
         名字一处对一处；真删排在开机那一趟，所以调用位置必须在内核认领用户目录（setPath）之前；
         留哪三样点名；界面上两句问话一字不改地摆着（点按钮算第一次，两道窗是第二、第三次）
     三 · 改页面文字那台工具补的两处 —— html 里内嵌脚本的话收得进清单；
         原句以槽结尾时，用户写在句尾的字不再被悄悄丢掉；html 那一层报的行号对得上源码
   主进程那颗真删（userWipe）要跑起来才有现场，这一台判的是它的写法和不许动的三样；
   真点一遍归人工闸：他自己开探针浏览器按那三次确认。 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, rd, 切, 记账 } from './lib-slice.mjs';

const 台 = 记账('外42 一键清理与改字工具');
const require = createRequire(import.meta.url);
const U = require(ROOT + 'src/pack/uitext.cjs');

/* ---------- 一 · 临时调试那一档删干净 ---------- */
台.题('一 · 那一档还在不在');
const fd4 = rd('src/_fd/src/fd4-builtin.js');
台.判('源码里不再注册「临时调试」那一档', !/SetupTabs\.add\(\s*'临时调试'/.test(fd4));
台.判('那一档的实现整块没了（tabDebug 一处不剩）', !/tabDebug/.test(fd4));
台.判('它自己那两张色位表也跟着没了（DBG_SLOTS / DBG_MORE）', !/DBG_SLOTS|DBG_MORE/.test(fd4));
const 档数 = (fd4.match(/^SetupTabs\.add\(/gm) || []).length;
台.数('设置里现在摆几档', 档数);
台.判('摆的是外观 / 程序 / 快捷键 / 数据那四档', 档数 === 4
  && /SetupTabs\.add\('外观'/.test(fd4) && /SetupTabs\.add\('程序'/.test(fd4)
  && /SetupTabs\.add\('快捷键'/.test(fd4) && /SetupTabs\.add\('数据'/.test(fd4));

/* ---------- 二 · 一键清理的接线 ---------- */
台.题('二 · 那一颗按钮到壳里这一串接得上');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
/* 整棵源码汇一份，用来判「那一整台撤干净了没有」；src\tools\ 那一格不算（探针嘴里念着这些名是检查用语） */
function 扫树(认){
  const 中 = [];
  (function 走(d){
    for(const e of fs.readdirSync(d, { withFileTypes: true })){
      if(e.name === 'node_modules' || e.name.startsWith('.') || (d === path.join(ROOT, 'src') && e.name === 'tools')) continue;
      const p = path.join(d, e.name);
      if(e.isDirectory()) 走(p);
      else if(/\.(js|cjs|mjs|rs|html)$/.test(e.name)) 中.push(p);
    }
  })(path.join(ROOT, 'src'));
  return 中.filter(p => { try{ return 认(fs.readFileSync(p, 'utf8')); }catch(e){ return false; } })
    .map(p => path.relative(ROOT, p).replace(/\\/g, '/'));
}
const 数颗 = rd('src/_tauri/src/tauri_bind/data_cmds.rs');
const 页面 = 切(fd4, 'tabData');
const 通道 = (桥.match(/async dataWipe[\s\S]{0,200}?invoke\('([^']+)'/) || [])[1] || '';
台.数('桥那颗方法走的通道名', 通道);
台.判('界面上有那一颗「一键清理所有用户数据」', 页面.includes('一键清理所有用户数据'));
台.判('桥里有 dataWipe 这一颗，走的是 data:wipe', 通道 === 'data:wipe', 通道);
台.判('壳里挂的通道名和桥那一条一模一样（注册单上也有）',
  rd('src/_tauri/src/main.rs').includes('data_cmds::data_wipe') && /pub fn data_wipe/.test(数颗));
台.判('那张字条就叫 wipe-user.json，落在 data\\ 根上（不在插件那一格里）',
  rd('src/_tauri/src/core/data_path.rs').includes('pub const 字条名: &str = "wipe-user.json";')
  && 数颗.includes('let 路 = 格.join(字条名)') && !数颗.includes('userdata'));
台.判('读写用的都是同一个件名那一颗（不是两处各写一遍名字）',
  (数颗.match(/字条名/g) || []).length >= 2 && !数颗.includes('"wipe-user.json"'));
台.判('这一颗一颗都不删（浏览器存储那一格此刻被内核占着，当场删一半比不删更糟）',
  !/remove_dir|remove_file|fs::remove/.test(数颗));
台.判('已经排着就不重写，只把时间戳留着', 数颗.includes('already: Some(true)'));
const 留着 = (rd('src/_tauri/src/core/data_path.rs').match(/pub const 留着那几格: \[&str; 3\] = \[([^\]]+)\]/) || [])[1] || '';
台.数('留着的那几样', 留着.replace(/\s+/g, ''));
台.判('留插件那一格（代码与名单不是用户数据）', 留着.includes('"plugins"'));
台.判('留日志', 留着.includes('"logs"'));
台.判('留搬家那本账', 留着.includes('"relocate.txt"'));
/* 这一件是明写的缺口，不是已实现：真删排在本机开机那一趟，而开机那一路还没搬进壳 ——
   所以此刻按下那颗按钮只落一张字条。这条判据钉的是「这句话还写在文件顶上」，
   哪天有人悄悄把注释撤了、把没搬齐的当成搬齐了，这条就红。 */
台.判('开机真删那一路还没搬进壳：这句话写在 data:wipe 顶上，不许当成已实现',
  数颗.includes('真删排在开机那一趟') && 数颗.includes('还没搬'));
台.题('二 · 三次确认的口径');
/* 只盯这一颗按钮自己那一段：数据那一档里「断开目录」「导入」也各有一道确认，别混进来数 */
const 起 = 页面.indexOf('一键清理所有用户数据');
const 清块 = 起 >= 0 ? 页面.slice(起, 起 + 1400) : '';
台.判('点按钮算第一次，后面两道窗各问一句', (清块.match(/await fdAsk\(/g) || []).length === 2, (清块.match(/await fdAsk\(/g) || []).length);
台.判('第二道窗问的那句一字不改', 页面.includes('删除后无法从软件中找回，除非您已另有完整备份'));
台.判('第三道窗问的那句一字不改', 页面.includes('您确定要删除吗？'));
台.判('两句是连着问的（先过第二句才轮到第三句）', 页面.indexOf('删除后无法从软件中找回') < 页面.indexOf('您确定要删除吗？'));
台.判('第三道窗过了才真发那道清理', 页面.indexOf('您确定要删除吗？') < 页面.indexOf('dataWipe()'));
台.判('排下去之后给一次重启的选择（真删在下一趟开机）', 页面.includes('askRestart'));

/* ---------- 三 · 改页面文字那台工具 ---------- */
台.题('三 · 那台小工具补的两处');
const 尾 = U.splitTemplate('甲{1}{2}乙', 1);
台.数('一句「甲{1}{2}乙」只有一段字面量可写，拆出来是', JSON.stringify(尾));
台.判('写在句尾的「乙」没被丢掉（并进最后那一段）', 尾.length === 1 && 尾[0] === '甲乙', 尾);
const 中 = U.splitTemplate('一共 {1} 项', 2);
台.判('普通那句照旧拆成两段，没被这次改动带坏', 中.length === 2 && 中[0] === '一共 ' && 中[1] === ' 项', 中);
const { occ } = U.collectAll(ROOT.replace(/\/$/, ''));
const 骨架 = occ.filter(o => String(o.rel).replace(/\\/g, '/').endsWith('rp-base.html'));
const 脚本层 = 骨架.filter(o => o.why !== '静态页面');
台.数('声笔练习那页骨架收进多少处 · 其中内嵌脚本那一层', 骨架.length + ' · ' + 脚本层.length);
台.判('内嵌脚本里的话收得进清单（从前那一层整个被挖掉）', 脚本层.length > 0);
const 平 = s => String(s).replace(/\s+/g, ' ');   /* 清单里的字是把空白收拢过的（全角空格也算），比对时同一把尺 */
const 样本 = 脚本层.find(o => String(o.text).includes('lua-item')) || 脚本层[0];
const 骨架文 = rd('src/_build/rp-base.html');
台.判('脚本层报的行号对得上源码那一行', !!样本 && 平(骨架文.split('\n')[样本.line - 1] || '').includes(平(样本.text).slice(0, 10)), 样本 && 样本.line);
const 模板文 = rd('src/_fd/template.html');
const 标签后 = occ.filter(o => /\.html$/.test(String(o.rel).replace(/\\/g, '/')) && o.why === '静态页面');
const 错行 = 标签后.filter(o => {
  const 全文 = /rp-base\.html$/.test(o.rel) ? 骨架文 : 模板文;
  const 行 = 平(全文.split('\n')[o.line - 1] || '');
  return !行.includes(平(o.text).slice(0, 8));
});
台.数('html 标签之间那几处的行号 · 对不上的', 标签后.length + ' · ' + 错行.length);
台.判('标签之间那句的行号也对得上（从前差一行）', 错行.length === 0, 错行.slice(0, 2).map(o => o.line + ':' + o.text));

/* ---------- 四 · 清完那一趟就得是刚装好的样子（这一件还没搬进壳，明写着） ----------
   从前那一版是主进程开机排第一趟：先按字条删，删过的再走一遍摆树把详单与两份清单补回来，
   一句「重启之后就是刚装好的样子」才当场成立。壳这一头只落了写字条那一步（见第二节），
   删与补铺那一整趟还没搬 —— 这一节因此改成钉两件事：缺口写着、程序运行时不再往 data\ 铺那几份。 */
台.题('四 · 程序运行时不往数据层铺那几份（清完补铺那一趟是另一件，见上）');
台.判('开机把出厂清单补铺到数据层那一整台没了（整棵源码里 layList / syncLists 一处不剩）',
  扫树(l => /function layList|function syncLists|syncLists\(/.test(l)).length === 0,
  扫树(l => /syncLists/.test(l)).join(' | '));
const pub = rd('src/pack/publish.mjs');
台.判('发布那一趟不往产物里铺那两份清单（界面文字与卡片大小的名一处不剩）',
  !/card-size|ui-text|出厂清单/.test(pub), (pub.match(/card-size|ui-text|出厂清单/g) || []).join('、'));
台.判('用户数据详单也不由发布铺（它是用户自己写的那一篇，首次安装就没有它）', !/userdata-list/.test(pub));
台.判('仓里也没有它的一份（不在公开面）', !fs.existsSync(ROOT + 'src/pack/data/userdata-list.md'));

/* ---------- 五 · 插件往发布物里走的三条路：两条仍然堵着，一条外46 又铺开了 ----------
   ① 程序代码那一层（发布物里的 src\）不收插件 —— 仍然堵着（Electron 那层 resources\app 已随那颗壳一起撤掉，
      现在盯的是发布那一趟 addLayer('src/') 那一格和它顶上 data\ 那道闸）。
   ② 开机看见没有插件格就把自带那一层铺出来 —— 仍然堵着（seedMissing 没了）。
   ③ publish 把插件铺进首装树 —— 外43 拆过，外46 又铺开了：他 2026-10-10 定本体和插件一起打包，
      铺进去的是树里的 data\plugins\ 那一格，不是 app 那一层。
   从前还铺第二格 data\plugins-factory\（导入那一下留的原版，给那颗「恢复出厂」与随行文件兜底取），
   那颗钮随插件分离第 2 批 2.5 撤了、那一格随 2.6 整格撤 —— 要换回早先那一份就把自己手里那一个包重装。 */
台.题('五 · 插件走发布物那三条路（两条堵着、一条外46 铺开；第 2 批 2.6 之后只有活的这一格）');
const comp = rd('src/pack/comp-files.cjs'), serve = rd('src/_fd/fd-serve.mjs');
台.判('首装那棵树现在铺插件：只落地 data\\plugins\\ 那一格（外46 起本体和插件一起打包）',
  pub.indexOf("made.set('data/plugins/'") >= 0 && pub.indexOf("made.set('data/plugins-factory/'") < 0);
台.判('插件进产物只有 data\\plugins\\ 那一条前缀（程序代码那一层 src\\ 不带插件字节）',
  /const 放行 = k => k\.startsWith\('data\/plugins\/'\);/.test(pub)
  && !/addLayer\('src\/',[^)]*packs/.test(pub));
const 插件落点 = [...pub.matchAll(/made\.set\('([^']+)' \+ m\.id/g)].map(x => x[1]);
台.判('插件字节只有一个落点（活的这一格），没有第二格（原版那一格整格撤了，程序代码那一层也不收插件）',
  插件落点.join(' ') === 'data/plugins/', 插件落点.join(' '));
台.判('开机不再把自带那一层铺成插件（seedMissing 那一颗整棵源码里一处不剩）',
  扫树(l => /seedMissing/.test(fs.readFileSync(l, 'utf8'))).length === 0 && !/seedMissing/.test(comp));
/* 从前这里还钉着「铺插件那一步换成给老树搬家」（adoptOldFactory 从 resources\app\data\plugins 取底）
   和壳里那两处留底 —— 原版那一格撤了，那几手一起没，钉它们就只剩钉注释。 */
/* 认的是代码不是话：那几本顶上交代历史的注释里还写得到「原厂那一格」「factory」这些名，
   那是这段历史的来龙去脉，不算漏撤 —— 比的时候先把注释去了。 */
const 净 = s => String(s).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*(\/\/|\*).*$/gm, ' ');
台.判('那一把尺与开发服务器都不再认第二格（factory 那几个名字一处不剩）',
  !/factory/i.test(净(comp)) && !净(serve).includes('plugins-factory') && !净(serve).includes('FD_FACTORY_COMPONENTS'));
const 留底 = rd('src/_tauri/src/tauri_bind/pack_cmds.rs');
台.判('壳里导入那一路不再留底（那一步与它用的抄树三颗一起撤了）',
  !净(留底).includes('留一份原版') && !净(留底).includes('抄一棵树') && !净(留底).includes('原厂'));
台.判('media 那一份插件文件只从活的这一格取（不再退第二格）',
  !rd('src/_tauri/src/tauri_bind/media_cmds.rs').includes('原厂那一格'));
台.判('一键清理那张名单里不再有那一格（书名闸也不认它是一条数据）',
  !/"plugins-factory"/.test(rd('src/_tauri/src/core/data_path.rs')));
台.判('首装那份说明改口了（不再说一个插件都不带，改说跟着本体一起出门）',
  !/这一份发布物里一个插件都没有/.test(pub) && !/出厂带的那些包/.test(pub) && /这一份发布物带着/.test(pub));
台.收尾();
