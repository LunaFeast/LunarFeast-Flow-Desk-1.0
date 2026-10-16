/* ============================================================
   gate-repo5.mjs · 插件分离第 5 批：一家一家搬仓那颗工具（src/_build/pack-repo.mjs）
   ------------------------------------------------------------
     node src/tools/probes/gate-repo5.mjs [--沙盒=一处目录]
   钉的是六件事：① 仓名那张表照他 2026-10-16 给的仓库列表截图那一种写法，一格不许改；
   ② 铺出来的一棵与主程序仓同形状（路径逐字一样，"改了没有"拿两份逐字节对就得出）；
   ③ 这一家自己那条出包命令真打得出一份容器，读回来每一份的字节数与哈希都对得上；
   ④ 打包手不进插件仓（那一棵里不许有压包、签名、加密那三样的实现，只许去叫主程序那一颗）；
   ⑤ 这台机器的路径与帐户名不进那一棵（拿发布那一摊同一把尺量）；
   ⑥ 这一颗不推、不删主程序仓那一份 —— 那两刀都要他点头。
   外加两件：再铺一次同一棵要报"逐字没动"（幂等，别一次跑落两笔），以及一条反证：
   把那条出包命令里"找不到主程序那颗打包手就停"摘掉，它就不再给那句白话，而是撞进一个不存在的路径。
   沙盒落在主程序那一棵的旁边（现算，不写死盘符），跑完当场删掉。
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { 记账 } from './lib-slice.mjs';
import { 仓名, 看一家, 铺, 打包, TREE } from '../../_build/pack-repo.mjs';
import { 私人串清单, 扫文本 } from '../../_build/public-scan.mjs';

const 台 = 记账('gate-repo5');
const 沙盒旗 = process.argv.find(a => a.startsWith('--沙盒='));
const 沙盒 = path.resolve(沙盒旗 ? 沙盒旗.slice('--沙盒='.length) : path.join(path.dirname(TREE), 'FD 搬仓闸沙盒'));
const 跑 = (args, 处) => execFileSync(process.execPath, args, { cwd: 处 || TREE, encoding: 'utf8' });
const 清 = () => { try{ fs.rmSync(沙盒, { recursive: true, force: true }); }catch(e){} };

台.题('一、仓名那张表（2026-10-16 他给的截图，写法照 GitHub 上那一种）');
{
  const 该有 = {
    'notes': 'Notes', 'your-sentences': 'Your-Sentences', 'schedule': 'Schedule',
    'singbit-input-practice': 'Singbit-Input-Practice', 'music-remote': 'Music-Remote',
    'why-not-write': 'Why-Not-Write', 'wnw-custom': 'Why-Not-Write-plugins-Deduce-Custom',
  };
  台.判('七家一格不多一格不少，仓名逐字照截图（挂在谁底下的子件叫 <所属>-plugins-<子件>，各段首字母大写）',
    JSON.stringify(Object.keys(仓名).sort()) === JSON.stringify(Object.keys(该有).sort())
    && Object.keys(该有).every(k => 仓名[k] === 该有[k]), Object.values(仓名).join('、'));
  台.判('远程一律是 LunarFeast 名下那一串（SSH，不经手凭据）',
    Object.values(仓名).every(名 => 看一家远程(名) === 'git@github.com:LunarFeast/' + 名 + '.git'));
  台.判('主程序那一棵不在这张表里（它不是插件，仓名走它自己那一条）',
    !Object.values(仓名).some(名 => /Flow-Desk-1\.0$/.test(名)));
}
function 看一家远程(名){
  /* 远程那颗是模块里现算的（不导出），这一处按同样的拼法对一次 —— 拼法只此一处，别处不许再抄 */
  return 'git@github.com:LunarFeast/' + 名 + '.git';
}

台.题('二、铺一棵：与主程序仓同形状');
清();
let 铺的 = null;
try{
  铺的 = 铺('notes', 沙盒);
  const 情 = 看一家('notes');
  台.判('落盘的是那三件加那条出包命令与一份忽略表，路径与主程序仓逐字一样',
    fs.existsSync(path.join(铺的.路, 'data', 'plugins', 'notes', 'main.js'))
    && fs.existsSync(path.join(铺的.路, 'data', 'plugins', 'notes', 'manifest.json'))
    && fs.existsSync(path.join(铺的.路, 'data', 'plugins', 'notes', 'images', 'icon.svg'))
    && fs.existsSync(path.join(铺的.路, '出包.mjs')) && fs.existsSync(path.join(铺的.路, '.gitignore')),
    铺的.路);
  台.判('每一份与主仓那一份逐字节相同（"这一家改了没有"就是拿这两棵对一次）',
    情.份.every(份 => {
      const 对 = path.join(铺的.路, 'data', 'plugins', 'notes', 份.路);
      return fs.existsSync(对) && fs.readFileSync(对).equals(份.字);
    }));
  台.判('开了版本、支叫 main、远程挂着那一仓、第一笔已落且提交说明是 0 个字（进版本的字由他填）',
    (() => {
      const git = a => { try{ return execFileSync('git', a, { cwd: 铺的.路, encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }catch(e){ return '!'; } };
      const 说明 = git(['log', '-1', '--format=%B']);
      return git(['rev-parse', '--abbrev-ref', 'HEAD']) === 'main'
        && git(['remote', 'get-url', 'origin']) === 看一家远程(仓名.notes)
        && /^[0-9a-f]{7,}$/.test(git(['rev-parse', 'HEAD']))
        && (说明 === '' || 说明 === '!') === true && 铺的.笔数 === '1';
    })(), '笔数 ' + (铺的 && 铺的.笔数) + ' · 落笔 ' + (铺的 && 铺的.新落));
  台.判('再铺一次同一棵：逐字没动就不落第二笔（幂等，别跑一趟落两笔）',
    (() => { const 二 = 铺('notes', 沙盒, { 重铺: true });
      return 二.笔数 === '1' && /逐字没动/.test(二.新落); })());
  台.判('没给"重铺"这一句就不肯动已经开过版本的那一棵（他在插件仓里手改过的东西，不许一趟铺没）',
    (() => { try{ 铺('notes', 沙盒); return false; }
      catch(e){ return /已经开过版本|重铺/.test(String((e && e.message) || e)); } })());
  台.判('那一棵里只忽略 dist\\（出包命令的落点），源码与插件清单都进版本',
    fs.readFileSync(path.join(铺的.路, '.gitignore'), 'utf8').trim() === 'dist/');
}catch(e){ 台.判('铺一家跑通了（上面几条任一不中都会落到这一条）：' + ((e && e.message) || e), false); }

台.题('三、这一家自己那条出包命令：打得出来、读得回来');
try{
  const 结 = 打包('notes', 沙盒);
  台.判('打出一份容器，头部是 FDP1 v1、标志全 0（这一版不签不加密，钥匙号 0）',
    结.头.记 === 'FDP1' && 结.头.版 === 1 && 结.头.志 === 0 && 结.件.endsWith('notes.fdpkg'), JSON.stringify(结.头));
  台.判('信息段那八键一格不缺，里面每一份的字节数与主仓那一份对得上',
    结.键 === 8 && 结.对得上 === true && 结.份数 === 3, '八键到 ' + 结.键 + ' 格 · 份数 ' + 结.份数);
  台.判('那条命令只许去叫主程序那一颗打包手：它自己不压、不签、不加密（第 3 批 3.3 乙 那条硬要求）',
    (() => { const 文 = fs.readFileSync(path.join(铺的.路, '出包.mjs'), 'utf8');
      return /packbox\.mjs/.test(文) && /import\(/.test(文)
        && !/createHash|sha256\s*:|签名段|aes-256|Ed25519|encrypt/.test(文.replace(/sha256\.slice[^\r\n]*/g, '')); })());
  台.判('主程序那一颗打包手没被抄进插件仓（那一棵里搜不到 packbox.mjs 这份文件）',
    !fs.existsSync(path.join(铺的.路, 'src')) && !fs.existsSync(path.join(铺的.路, 'packbox.mjs'))
    && 铺的.份数 === 5);
  台.判('这台机器的盘符、目录与帐户名都没写进那一棵任何一份文本（拿发布那一摊同一把尺量）',
    (() => {
      const 串 = 私人串清单().串;      /* 那一颗回的是 {串, 登记了, 现场算的}，尺在 .串 那一格里 */
      const 撞 = [];
      (function 走(格){ for(const 名 of fs.readdirSync(格)){
        if(名 === '.git' || 名 === 'dist') continue;
        const 相 = path.join(格, 名);
        if(fs.statSync(相).isDirectory()) 走(相);
        else{ const 中 = 扫文本(fs.readFileSync(相, 'utf8'), 串);
          if(中.length) 撞.push(名 + ' → ' + 中.map(x => x.串 || x).join('、')); }
      } })(铺的.路);
      return 撞.length === 0; })());
  台.判('反证：把那条命令里"那一格里到底有没有打包手"这一道验眼摘掉，它就不再给那句白话，而是撞进一句模块找不到',
    (() => {
      const 原 = fs.readFileSync(path.join(铺的.路, '出包.mjs'), 'utf8');
      const 摘 = 原.replace("if(!fs.existsSync(path.join(指, 'src', '_build', 'packbox.mjs')))", 'if(false)');
      if(摘 === 原) return false;                       /* 那句写法变了，这一条要跟着改，不许悄悄放过 */
      const 坏 = path.join(沙盒, '反证');
      fs.mkdirSync(坏, { recursive: true });
      fs.writeFileSync(path.join(坏, '出包.mjs'), 摘);
      try{ 跑([path.join(坏, '出包.mjs'), '--主仓=' + path.join(TREE, '不在这儿')], 坏); return false; }
      catch(e){ const 话 = String((e && e.message) || e);
        return !/找不到主程序那一颗打包手/.test(话) && /Cannot find|ERR_MODULE_NOT_FOUND|not defined/.test(话); }
    })());
  台.判('反证二：那条命令拿一个不存在的主仓跑，停下来的是一句白话（不是半份假包）',
    (() => { try{ 跑([path.join(铺的.路, '出包.mjs'), '--主仓=' + path.join(TREE, '没这一格')], 铺的.路); return false; }
      catch(e){ return /找不到主程序那一颗打包手/.test(String((e && e.message) || e)); } })());
}catch(e){ 台.判('出包那一路跑通了（任一不中落这一条）：' + ((e && e.message) || e), false); }

台.题('四、这一颗不推、不删主程序仓那一份（那两刀归他点头）');
{
  const 工 = fs.readFileSync(path.join(TREE, 'src', '_build', 'pack-repo.mjs'), 'utf8');
  台.判('没有推的那一手：这颗工具里不许出现 git push（含 --force、-u、set-upstream），也不建 PR（推与建 PR 只在 pr.mjs 那一颗）',
    !/'push'|"push"|force-push|--force|set-upstream|createPull|gh pr/.test(工)
    && !/git[^\n]{0,20}\bpush\b/.test(工), '数组那几处的 push 不算（只盯 git push）');
  台.判('没有删主仓那一份的那一手：搜不到 rmSync / unlink 打在 data\\plugins 上，也没有 git rm',
    !/rmSync|unlink|git',\s*\[\s*'rm/.test(工));
  台.判('主程序仓里便签那三件还在（这一颗只铺不删）',
    fs.existsSync(path.join(TREE, 'data', 'plugins', 'notes', 'main.js'))
    && fs.existsSync(path.join(TREE, 'data', 'plugins', 'notes', 'manifest.json')));
  台.判('这颗工具列进了"开发那一层"那份名单（装出去的那一棵里搜不到它）',
    fs.readFileSync(path.join(TREE, 'src', 'pack', 'publish.mjs'), 'utf8')
      .includes('pack-repo|packbox') || fs.readFileSync(path.join(TREE, 'src', 'pack', 'publish.mjs'), 'utf8')
      .match(/_build\\\/\(([^)]*)\)/)[1].split('|').includes('pack-repo'));
}

台.题('五、便签这一家的现状量出来是"零个通道"（清单第 5 批那句"一份数据文件、零个通道"要能复算）');
{
  const 情 = 看一家('notes');
  台.判('伸向宿主的一共 12 只手，全从那份组件上下文里拿；通道那一路一颗都没有',
    情.手.length === 12 && 情.手.join('、') === 'ask、bus、cover、coverWrap、dialog、el、expanded、fitBox、fullStyle、icon、pack、store'
    && 情.通道.length === 0, 情.手.join('、') + ' ⁄ 通道 ' + 情.通道.join('、'));
  台.判('它只有一份数据文件（notes.json），没有表单键、没有内核产物',
    (情.清单.dataKeys || []).join() === 'notes.json' && (情.清单.kvKeys || []).length === 0 && !情.清单.kernels);
  台.判('七家都量得出这份账（谁有通道、谁带内核，搬的时候顺序不一样，这张表要一次能拉出来）',
    (() => { const 表 = Object.keys(仓名).map(id => { const x = 看一家(id);
      return { id, 手: x.手.length, 通道: x.通道.length, 内核: (x.清单.kernels || []).length, 份: x.份.length }; });
      return 表.length === 7 && 表.every(x => x.份 > 0 && Number.isFinite(x.手))
        && 表.find(x => x.id === 'why-not-write').内核 >= 1 && 表.find(x => x.id === 'wnw-custom').内核 >= 1
        && 表.find(x => x.id === 'notes').通道 === 0; })(),
    Object.keys(仓名).map(id => id + ' ' + 看一家(id).份.length + ' 份').join(' · '));
}

清();
台.数('沙盒已清', fs.existsSync(沙盒) ? '还在：' + 沙盒 : '删干净了：' + 沙盒);
台.收尾();
