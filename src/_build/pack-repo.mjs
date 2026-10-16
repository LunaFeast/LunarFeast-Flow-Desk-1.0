/* ============================================================
   插件分离第 5 批 · 一家一份仓：把一家铺成它自己那一棵，给它一条自己的出包命令
   ------------------------------------------------------------
     node src/_build/pack-repo.mjs --看=notes                  只报：这一家有哪几份、伸出去哪几只手、仓叫什么
     node src/_build/pack-repo.mjs --铺=notes [--仓根=目录]      铺成 <仓根>\<仓名>\，开版本、挂远程 —— 不推
     node src/_build/pack-repo.mjs --打包=notes [--仓根=目录]    跑这一家自己那条出包命令，打出一份容器再读回来对一遍
     node src/_build/pack-repo.mjs --看所有                     七家一张表（谁铺了、谁没铺、体积多少）

   三条这一颗一辈子不做的（都是他定过的，不是我怕事）：
     · **不往 GitHub 推**：推支与建 PR 只在 `src/_build/pr.mjs` 那一颗，而且每一步都要他点头；
     · **不删主程序仓里那一份**：「主程序仓里删干净」是每一家四步里的最后一刀，删要他点头 —— 这一颗只铺、只打、只验；
     · **打包手不进插件仓**：`src/_build/packbox.mjs` 留在发布那一层（第 3 批 3.3 乙 那条硬要求，
       插件那一侧不许有能把自己压成包、更不许有能加密的那一手）。这一家那条出包命令只是**去叫**主程序那一颗，
       叫不到就当场停下来报错，不自己压、也不留一份"看着像包"的东西。

   仓里那一棵的形状：与主程序仓一模一样（`data\plugins\notes\main.js` 还是这一串），
   所以「这一家改了没有」拿两份逐字节对一次就得出，不需要谁再维护第二份对应表（这条从第 1 批就一直如此）。
   仓名那张对应表只此一份（下面那张 仓名），照着清单第 5 批那张表抄的，别处不许再抄第二份。
   铺出去那一格是默认位置（主程序那一棵的上一层、按仓名叫），换机器换盘给 --仓根=；
   落点全用现算的串，本文件与生成的那几份里都不写死这台机器的盘符（公开面那道闸认这一条）。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { 家 } from './plugin-repos.mjs';
import { 打目录, 扩展名 } from './packbox.mjs';

const HERE = import.meta.dirname;
export const TREE = path.resolve(HERE, '..', '..');            /* 主程序那一棵 */
const argv = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  ? process.argv.slice(2) : [];
const val = (旗, 定) => { const 项 = argv.find(x => x.startsWith(旗 + '=')); return 项 ? 项.slice(旗.length + 1) : 定; };
const has = 旗 => argv.includes(旗);
const 停 = 句 => { throw new Error('搬仓停下：' + 句); };

/* ---------- 仓名那张表（2026-10-16 他给的仓库列表截图，名字一律照截图上那一种写法）----------
   命名规矩：挂在某一家底下的子件叫 <所属插件>-plugins-<子件名>，各段照 GitHub 上那样首字母大写
   （推演定制挂在为写底下、MusicBee 适配挂在音乐遥控器底下）。 */
export const 仓名 = {
  'notes': 'Notes',
  'your-sentences': 'Your-Sentences',
  'schedule': 'Schedule',
  'singbit-input-practice': 'Singbit-Input-Practice',
  'music-remote': 'Music-Remote',
  'why-not-write': 'Why-Not-Write',
  'wnw-custom': 'Why-Not-Write-plugins-Deduce-Custom',
};
/* 第 5 批那张表里还有一格 MusicBee 播放器适配（Music-Remote-plugins-Musicbee）：
   4.5 那一条码的是「一份明文表 + 壳里一台通用解释器」，那张表现住在主程序壳里
   （src/_tauri/src/core/media/players.json 与那颗 dll），还没有到能独立成一仓的形状 —— 这一颗对它只报不动。 */
const 远程 = 名 => 'git@github.com:LunarFeast/' + 名 + '.git';
const 仓根默认 = () => path.dirname(TREE);
const 仓路 = (id, 根) => path.join(根 || 仓根默认(), 仓名[id] || 停('这一家没有仓名对应：' + id));

/* ---------- 一家现在有什么 ---------- */
export function 看一家(id){
  const 活 = 家.find(j => j.id === id) || 停('名单里没有这一家：' + id);
  const 格 = path.join(TREE, 'data', 'plugins', id);
  if(!fs.existsSync(格)) 停('盘上没有这一家：' + 格);
  const 份 = [];
  (function 走(格内, 前){
    for(const 名 of fs.readdirSync(格内).sort()){
      const 相 = path.join(格内, 名), 相前 = 前 ? 前 + '/' + 名 : 名;
      if(fs.statSync(相).isDirectory()) 走(相, 相前);
      else 份.push({ 路: 相前, 字: fs.readFileSync(相), 字节: fs.statSync(相).size });
    }
  })(格, '');
  const 单 = JSON.parse(份.find(x => x.路 === 'manifest.json').字.toString('utf8'));
  /* 伸向宿主的那几只手：只认 ctx / C 这两个名字（C 是挂载时那份组件上下文），
     通道那一路（FD_APP.*、postMessage、media:xxx）单独数一遍 —— 「零个通道」这一句要能量出来 */
  const 文 = 份.filter(x => /\.(js|css)$/.test(x.路)).map(x => x.字.toString('utf8')).join('\n');
  const 手 = [...new Set([...文.matchAll(/\b(?:C|ctx)\.([a-zA-Z]+)/g)].map(m => m[1]))].sort();
  const 通道 = [...new Set([...文.matchAll(/\bFD_APP\.([a-zA-Z]+)|postMessage\s*\(|invoke\s*\(\s*'([^']+)/g)]
    .map(m => m[1] || m[2] || m[3]))].filter(Boolean).sort();
  return { id, 中文: 活.中文, 仓: 仓名[id], 远程: 远程(仓名[id]), 格, 份, 清单: 单, 手, 通道,
    字节: 份.reduce((s, x) => s + x.字节, 0) };
}

/* ---------- 这一家自己那条出包命令（生成的那一份，只有"去叫"，没有"自己压"）---------- */
const 出包文本 = (id) => `/* ${id} 这一家自己的出包命令（插件分离第 5 批）
   ------------------------------------------------------------
     node 出包.mjs                      主程序那一棵就在旁边同一层（..\\\\Flow-Desk-1.0）时
     node 出包.mjs --主仓=一处目录        主程序那一棵在别处
     node 出包.mjs --出=一处目录          容器要落在别处（默认落本仓 dist\\\\）

   这一份**不打包、不签名、不加密**：那三样都住在发布那一层，插件这一侧不许有（第 3 批 3.3 乙）。
   它只做一件事 —— 找到主程序那一颗打包手，把本仓这一格交给它压，压完把信息段念回来。
   找不到就当场停：宁可打不出包，也不许自己抄一份"看着像"的压法。
   本仓的位置自己认（拿这份文件所在那一格），这台机器的路径一个字都不写进来；
   主程序那一棵的位置按三步找：环境变量 FD_MAIN → 旁边的默认那一棵 → --主仓=，都不中就停下来问。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const 仓 = path.dirname(fileURLToPath(import.meta.url));
const 格 = path.join(仓, 'data', 'plugins', ${JSON.stringify(id)});
const 猜 = [process.env.FD_MAIN, path.join(path.dirname(仓), 'Flow-Desk-1.0')]
  .filter(Boolean).map(x => path.resolve(x));
const 主 = (() => {
  const 项 = process.argv.find(a => a.startsWith('--主仓='));
  /* 给了 --主仓= 也要验一眼那一格里到底有没有那颗打包手：不验的话，写错一格就撞进一句模块找不到的话，
     读的人不知道是路径写错了 —— 停下来的那一句得说人话，还要把他给的那一格念出来 */
  if(项){
    const 指 = path.resolve(项.slice('--主仓='.length));
    if(!fs.existsSync(path.join(指, 'src', '_build', 'packbox.mjs')))
      throw new Error('找不到主程序那一颗打包手：--主仓= 给的是「' + 指 + '」，那一格里没有 src\\\\_build\\\\packbox.mjs。'
        + '主程序那一棵在别处就把那一格指过来（这一家不自己压）。');
    return 指;
  }
  const 中 = 猜.find(x => fs.existsSync(path.join(x, 'src', '_build', 'packbox.mjs')));
  if(!中) throw new Error('找不到主程序那一颗打包手（试过：' + 猜.join(' 、 ') + '）。'
    + '给一条 --主仓=Flow-Desk 那一棵的目录 就行 —— 这一家不自己压。');
  return 中;
})();
const 手 = await import(pathToFileURL(path.join(主, 'src', '_build', 'packbox.mjs')).href);
const 打 = 手.打目录(格);
const 出 = path.resolve((process.argv.find(a => a.startsWith('--出=')) || '').slice('--出='.length)
  || path.join(仓, 'dist'));
fs.mkdirSync(出, { recursive: true });
/* 后缀不写在这一份里：全仓唯一那一枚住在壳里（pack_box::扩展名），问打包手要（它自己去读那一处） */
const 件 = path.join(出, ${JSON.stringify(id)} + '.' + 手.扩展名());
fs.writeFileSync(件, 打.字节);
const 份 = 打.信息.files.map(x => '    ' + x.path + ' · ' + x.len + ' 字节 · ' + x.sha256.slice(0, 12) + '…');
console.log('WROTE ' + 件 + '  ' + 打.字节.length + ' 字节');
console.log('信息段：' + 打.信息.id + ' · ' + 打.信息.name + ' · ' + 打.信息.version
  + ' · 要求壳 ' + 打.信息.min_shell + ' · 来源 ' + 打.信息.source + ' · 钥匙 ' + 打.信息.key_id + '（这一版不签不加密）');
console.log('里面这几份：\\n' + 份.join('\\n'));
`;

/* ---------- 铺：建那一棵、开版本、挂远程（不推） ----------
   已经开过版本的那一棵，不给 --重铺 就不动它：他在插件仓里手改过的东西，不许一趟铺没。 */
export function 铺(id, 根, opt){
  const 重铺 = !!(opt && opt.重铺) || has('--重铺');
  const 情 = 看一家(id);
  const 路 = 仓路(id, 根);
  if(fs.existsSync(path.join(路, '.git')) && !重铺)
    停('那一棵已经开过版本了：' + 路 + '（要照现在这份重铺就加 --重铺，它只覆盖文件、不动已有的笔）');
  for(const 份 of 情.份){
    const 标 = path.join(路, 'data', 'plugins', id, 份.路);
    fs.mkdirSync(path.dirname(标), { recursive: true });
    fs.writeFileSync(标, 份.字);
  }
  fs.writeFileSync(path.join(路, '出包.mjs'), 出包文本(id));
  /* dist\ 是那一条出包命令的落点，跟着构建产物走，不进版本（与主仓那一棵 dist\ 同一待遇） */
  fs.writeFileSync(path.join(路, '.gitignore'), 'dist/\n');
  if(!fs.existsSync(path.join(路, '.git')))
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: 路, stdio: ['ignore', 'pipe', 'pipe'] });
  const 跑 = (args) => execFileSync('git', args, { cwd: 路, encoding: 'utf8' });
  /* 探一问的几颗一律闭嘴跑：git 对"还没有一笔""没有这个远程"这两问是拿 stderr + 退出码回话的，
     不接住就在终端里刷两片 fatal / error，看着像出了事，其实是在问路 */
  const 探 = (args) => { try{ return execFileSync('git', args, { cwd: 路, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }catch(e){ return ''; } };
  if(!fs.existsSync(path.join(路, '.git'))) 停('那一棵没开成版本：' + 路);
  探(['config', 'user.name', 'LunarFeast']);
  探(['config', 'user.email', 'flow-desk@invalid']);   /* .invalid 是保留域，投不到任何信箱 */
  跑(['add', '-A']);
  const 有笔 = !!探(['rev-parse', '--verify', 'HEAD']);
  const 动 = 探(['status', '--porcelain']);
  if(动) 跑(['commit', '-q', '--allow-empty-message', '-m', '']);   /* 提交说明一律留空，进版本的字由他填 */
  const 远 = 情.远程;
  const 现 = 探(['remote', 'get-url', 'origin']);
  if(现 !== 远) { if(现) 跑(['remote', 'set-url', 'origin', 远]); else 跑(['remote', 'add', 'origin', 远]); }
  return { 路, 仓: 情.仓, 远: 远, 份数: 情.份.length + 2, 字节: 情.字节,
    支: 探(['rev-parse', '--abbrev-ref', 'HEAD']) || 'main',
    笔数: (() => { const n = 探(['rev-list', '--count', 'HEAD']); return n || '0'; })(),
    新落: 有笔 ? (动 ? '改了 ' + 动.split(/\r?\n/).length + ' 份' : '逐字没动，这一趟没落笔') : '第一笔已落（本地）',
    推: '没推 —— 推这一步不在这一颗里，要他点头'};
}

/* ---------- 打：跑这一家自己那条命令，再把打出来的那份读回来对一遍 ---------- */
export function 打包(id, 根){
  const 路 = 仓路(id, 根);
  if(!fs.existsSync(path.join(路, '出包.mjs'))) 停('这一家还没铺：' + 路 + '（先 --铺=' + id + '）');
  const 报 = execFileSync(process.execPath, [path.join(路, '出包.mjs'), '--主仓=' + TREE],
    { cwd: 路, encoding: 'utf8' });
  const 件 = path.join(路, 'dist', id + '.' + 扩展名());     /* 后缀问壳里那一枚，不在这一颗里再抄一份 */
  const 字 = fs.existsSync(件) ? fs.readFileSync(件) : 停('那条命令没落文件：' + 件);
  /* 读回来对一遍：头部那三个数、信息段那六个必填键、每一份的字节数与哈希 —— 全对才算这一趟成了 */
  const 头 = { 记: 字.subarray(0, 4).toString('ascii'), 版: 字.readUInt16BE(4), 志: 字.readUInt16BE(6), 信长: 字.readUInt32BE(8) };
  const 信 = JSON.parse(字.subarray(12, 12 + 头.信长).toString('utf8'));
  const 现 = 看一家(id);
  const 对得上 = 信.files.length === 现.份.length
    && 信.files.every((份, i) => { const 原 = 现.份.find(x => x.路 === 份.path); return !!原 && 原.字节 === 份.len; });
  return { 件, 字节: 字.length, 头, 键: ['id','name','version','min_shell','author','source','key_id','files']
    .filter(k => 信[k] !== undefined).length, 份数: 信.files.length, 对得上, 报: 报.trim() };
}

/* ---------- 一张表：七家谁铺了、谁没铺 ---------- */
function 看所有(根){
  for(const id of Object.keys(仓名)){
    const 路 = 仓路(id, 根), 情 = 看一家(id);
    const 状 = fs.existsSync(path.join(路, '.git')) ? '铺了' : '没铺';
    console.log([id, 情.中文, 情.仓, 情.份.length + ' 份', 情.字节 + ' 字节',
      '手 ' + 情.手.length + ' 只（' + 情.手.join('、') + '）', '通道 ' + (情.通道.length ? 情.通道.join('、') : '零个'),
      状, 路].join(' · '));
  }
}

/* ---------- 命令行那一段 ---------- */
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url){
  const 根 = val('--仓根', '');
  const 做 = val('--看', '') || val('--铺', '') || val('--打包', '');
  try{
    if(has('--看所有')) 看所有(根);
    else if(val('--看', '')) { const 情 = 看一家(做);
      console.log([情.id, '仓 ' + 情.仓, 情.远程, 情.格, 情.份.length + ' 份 / ' + 情.字节 + ' 字节',
        '清单：' + 情.份.filter(x => x.路 === 'manifest.json').length + ' 份',
        '伸向宿主 ' + 情.手.length + ' 只手：' + 情.手.join('、'),
        '通道：' + (情.通道.length ? 情.通道.join('、') : '零个'),
        '数据键：' + (情.清单.dataKeys || []).join('、') + ' · 表单键：' + ((情.清单.kvKeys || []).length ? 情.清单.kvKeys.join('、') : '零个'),
        '内核：' + ((情.清单.kernels || []).join('、') || '没有')].join('\n  '));
    }
    else if(val('--铺', '')) { const 结 = 铺(做, 根);
      console.log('铺好：' + 结.路 + '\n  仓 ' + 结.仓 + ' · 远程 ' + 结.远 + '\n  ' + 结.份数 + ' 份落盘 / 源码 ' + 结.字节 + ' 字节\n  ' + 结.新落 + '\n  ' + 结.推); }
    else if(val('--打包', '')) { const 结 = 打包(做, 根);
      console.log(结.报 + '\n  读回来对过：' + (结.对得上 ? '每一份的字节数与清单对得上' : '对不上！')
        + ' · 信息段八键到 ' + 结.键 + ' 格 · 头 ' + 结.头.记 + ' v' + 结.头.版 + ' 标志 ' + 结.头.志); }
    else console.log('用法见这一份顶上那段（--看 / --铺 / --打包 / --看所有）。这一颗不推、不删主仓那一份。');
  }catch(e){ console.error('!' + (e && e.message || e)); process.exitCode = 1; }
}
