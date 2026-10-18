/* ============================================================
   gate-upgrade44.mjs · 外44 二：首装那一颗 exe 要能覆盖升级（升级走 exe，zip 归插件）
   ------------------------------------------------------------
     node src/tools/probes/gate-upgrade44.mjs
   钉的是这几件事，不是钉实现细节：
     ① 目标那一棵已经在了不再拒绝（从前那句「升级别用这一个」是这条链的断口）
     ② 动手之前先问「那一棵开着没有」，开着就一个字节不动
     ③ 不留旧版本备份（他 2026-10-17 撤的）：先摊新的，再清 src\ 那一层里这一包没带的散文件，
        pages\ 只覆盖包里带的（那一格同时是他放文稿的地方）
     ④ data\ 一个字节不碰 —— 靠 publish 那道「包里不许有 data\」的硬闸 + 这一颗只做两件事：挪走和摊开
     ⑤ 编译得过（这一颗是 Windows 自带的 csc 现编的，编不过就没有首装包）
   往探针工区（src\tools\本地路径.cjs 里那颗「工区」）编一颗检查用的壳，仓里那颗 sfx-stub.exe 不碰，C 盘不留东西。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT } from './lib-slice.mjs';
import { 工区 } from '../本地路径.mjs';

const 台 = 记账('gate-upgrade44');
const sfx = rd('src/pack/sfx.cs');
const pub = rd('src/pack/publish.mjs');

const 段 = 名 => {
  const 起 = sfx.indexOf('static Job ' + 名);
  if(起 < 0) throw new Error('切不到这一颗：' + 名);
  const 止 = sfx.indexOf('\n    }', 起);
  return sfx.slice(起, 止 < 0 ? sfx.length : 止 + 8);
};
const Install = 段('Install');
const 清理 = (sfx.match(/static Result Stash\(string dest, Payload pl\)[\s\S]*?\n    \}/) || [''])[0];

台.题('一、已经有的那一棵不再被拒');
台.判('从前那句「升级别用这一个」已经没了', !sfx.includes('升级别用这一个'));
台.判('从前那条「这儿已经有一棵」的拒绝整块没了', !sfx.includes('这儿已经有一棵'));
台.判('旧那个拒绝用的返回码不再往外抛（return 2 一处都没有）', !/(^|[^\d])return 2;/.test(sfx), (sfx.match(/return 2;/g) || []).length);
台.判('首装和覆盖升级走同一条道（Install 这一颗既是入口也认那一棵在不在）', /bool up = IsTree\(dest\);/.test(Install));
台.判('界面上那颗按钮跟着换话（覆盖升级 / 开始安装两副面孔）', /Go\.Text = upgrade \? "覆盖升级" : "开始安装";/.test(sfx));
台.判('窗口标题和错误框都认得出这一趟是升级', /"Flow-Desk 覆盖升级"/.test(sfx));

台.题('二、那一棵正开着就一个字节都不动');
台.判('动手前先问一遍能不能写（Busy 这一颗在）', /static string Busy\(string dest, Payload pl\)/.test(sfx));
台.判('探测的办法是独占打开（FileShare.None），不是猜进程名', /new FileStream\(to, FileMode\.Open, FileAccess\.Write, FileShare\.None\)/.test(sfx));
台.判('开着的时候先返回、不落到摊和清那两步', Install.indexOf('Busy(dest, pl)') < Install.indexOf('Stash(dest, pl)'));
台.判('开着这一条给的是单独的码 7（不是"出了岔子"那个 4）', /j\.Code = 7;/.test(Install));
台.判('码 7 不关窗口，让他退了再点一次', /if\(code != 7\)/.test(sfx));
台.判('码 7 那一趟把三颗控件放开（不是死窗口）', /d\.Go\.Enabled = true; d\.Pick\.Enabled = true; d\.Box\.Enabled = true;/.test(sfx));
台.判('话里说明白「一个字节都还没动」（这一句拆成了三小句住在顶上那一格，装那一趟取的还是它们）',
  Install.includes('UiBusyQuit') && /UiBusyHead\s*=\s*"这一棵正在开着，先别动它："/.test(sfx) && sfx.includes('一个字节都还没动'));

台.题('三、不留旧版本备份（他 2026-10-17 撤的：数据本来就能导出导入，想用旧版就装旧版再导回去）');
台.判('全文没有 update\\backups 那一路：不建那一格、不往那一格写，起时间戳那颗也一起撤了',
  !/backups/.test(sfx) && !/Stamp\(\)/.test(sfx) && !/Directory\.Move/.test(sfx));
台.判('次序钉死：先 Extract 摊新的，清旧的一定向后（没有备份可退，倒了就是先把源码删了再摊）',
  Install.indexOf('Extract(self, pl, dest') < Install.indexOf('Stash(dest, pl)'), Install.slice(0, 0) + 'Extract → Stash');
台.判('清的就是 src\\ 那一层里"这一包没带"的那几份（带着的一份不删、清完把份数报进成功那一句）',
  清理.length > 100 && /StartsWith\("src\/"\)/.test(清理) && /带\.Contains\(f\)/.test(清理) &&
  /File\.Delete\(f\)/.test(清理) && /r\.Files\+\+/.test(清理), 清理.length + ' 字');
台.判('删除只可能落在 dest\\src 那一层底下（整颗只认那一个根，data\\ 与 pages\\ 一个字都删不到）',
  /string 层 = Path\.Combine\(dest, "src"\)/.test(清理) &&
  (sfx.match(/File\.Delete/g) || []).length === 1 && (sfx.match(/Directory\.Delete/g) || []).length === 1 &&
  !/Delete\([^)]*"data"/.test(sfx) && !/Delete\([^)]*pages/i.test(sfx),
  'File.Delete ' + (sfx.match(/File\.Delete/g) || []).length + ' · Directory.Delete ' + (sfx.match(/Directory\.Delete/g) || []).length);
台.判('空掉的那一层从最里往外删（先长后短排，不然先动的是删不掉的父格）', /b\.Length\.CompareTo\(a\.Length\)/.test(清理));
台.判('清不动不算装失败，但那一句要摆到话里（不许悄悄少清）',
  /if\(s\.Error != null\) 清不动 = s\.Error/.test(Install) && Install.includes('UiStuckOld') && sfx.includes('没清掉'));
台.判('摊到一半砸了那一句不再提"挪回去就还是上一版"（没有备份可挪了），报的是这一棵删掉重装',
  !/UiOldAllIn|UiPutBack|挪回去/.test(sfx) && Install.includes('UiDeleteRetry'));

台.题('四、data\\ 不碰这件事靠什么成立');
台.判('publish 那道「包里不许有 data\\」的硬闸还在', pub.includes('首装那棵树里出现了数据层的格子'));
台.判('这一颗只有三种落子：摊开、删 src\\ 里这一包没带的那几份、删空掉的层格（data\\ 底下永远轮不到）',
  (sfx.match(/File\.Delete/g) || []).length === 1 && (sfx.match(/Directory\.Delete/g) || []).length === 1 &&
  !/File\.Delete[^]*"data/.test(sfx.slice(0, sfx.indexOf('File.Delete') + 400)),
  'File.Delete ' + (sfx.match(/File\.Delete/g) || []).length + ' · Directory.Delete ' + (sfx.match(/Directory\.Delete/g) || []).length);
台.判('摊开的目标只从选定的那一棵拼（不写死别的格）', /Path\.Combine\(dest, it\.Name\.Replace\(\'\/\', Path\.DirectorySeparatorChar\)\)/.test(sfx));

台.题('五、闷头那一条道（探针和脚本用的 --quiet）也走同一步');
台.判('--quiet 走的是 Install 这一颗，不是老的 Extract 直摊', /Job j = Install\(self, pl, dest, null\);/.test(sfx));
台.判('Extract 不再自己去开包（号取一次、检查一遍，同一个 Payload 用到底）', /static Result Extract\(string self, Payload pl, string dest/.test(sfx));
台.判('包读不出来当场停（码 3），不去动已有那一棵', /if\(pl == null\)\{ Say\(quiet, "这个 exe 后面没有包/.test(sfx));

台.题('六、编得过才算数');
const CS64 = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const CS32 = 'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe';
const csc = fs.existsSync(CS64) ? CS64 : fs.existsSync(CS32) ? CS32 : null;
台.判('这台机器有 Windows 自带的那个编译器', !!csc, csc);
if(csc && 工区){
  const out = path.join(工区, 'gate-upgrade44.exe');
  let 编 = '过', 成 = false;
  try{
    fs.mkdirSync(path.dirname(out), { recursive: true });   /* 工区那一格不在就先补一颗，别把检查用的壳落到 C 盘 */
    execFileSync(csc, ['-nologo', '-target:winexe', '-out:' + out,
      '-r:System.Windows.Forms.dll', '-r:System.Drawing.dll', path.join(ROOT, 'src/pack/sfx.cs')],
      { stdio: 'pipe' });
    成 = true;
  }catch(e){ 编 = String((e && (e.stdout || e.stderr)) || e.message).replace(/\r?\n/g, ' ').slice(0, 300); }
  台.判('这一颗 C# 编得成（检查用的壳落在探针工区那一格，仓里那颗 sfx-stub.exe 没碰）', 成, 编);
}else 台.数('编译那一步', '这台没登记编译器或探针工区（src\\tools\\本地路径.cjs 里那颗「工区」），不在就不量');
台.判('发布那一头仍会重编：壳比源码旧就再来一遍', /fs\.statSync\(stub\)\.mtimeMs < fs\.statSync\(stubSrc\)\.mtimeMs/.test(pub));
台.判('首装包的名字带完整号（含 +build.短哈希那一截）；名字那一段只从 setup名() 出（那里面除了可选的档位段就是号）',
  /const setup名 = 号 => 'Flow_Desk_setup_' \+ \(名段 \? 名段 \+ '_' : ''\) \+ 号 \+ '\.exe'/.test(pub) &&
  /setup: \{ file: setup名\(VER\.fd\)/.test(pub) && /path\.join\(OUT_DIR, setup名\(TAG\)\)/.test(pub) && /const TAG = VER\.fd;/.test(pub));
台.判('安装说明改口成「再双击一颗 exe 就是覆盖升级」，并且说明不留旧版本备份、清的是 src\\ 那一层',
  pub.includes('点「覆盖升级」') && pub.includes('不留旧版本备份') && pub.includes('src\\\\ 那一层里这一包没带的散文件') &&
  !pub.includes('update\\\\backups\\\\<时间戳>'));
台.判('安装说明里那条挑 zip 装更新的老路已经撤干净（主程序换版只剩 exe 这一颗）', !pub.includes('老路还在') && !pub.includes('本地更新'));

台.收尾();
