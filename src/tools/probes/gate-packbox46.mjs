/* ============================================================
   gate-packbox46.mjs · 插件分离第 3 批 3.3 乙：发布环节那颗打包手钉住这些
   ------------------------------------------------------------
     node src/tools/probes/gate-packbox46.mjs
   一、这一颗只住发布环节：publish.mjs 那份「开发层」名单点得到它（拿名单里那几条正则现量，不猜），装出去的那一棵带不走；
   二、四段的形状与壳里那一头同一本账，两边共读那一份试件（JS 压、Rust 读，任一边改形状当场红）；
   三、这一版只产未签名、不加密那两档 —— 没实现就是没实现，不许写 0 当"验过了"；
   四、用户侧接不到这一颗：页面、插件、开发那台服务器、桥、壳的注册单五处都搜不到它，也没留半个"打包"的口；
   五、拿一家现成的目录现场压一份（只在内存里，不落盘）：信息段那六个键跟着那家的插件清单，三块都读得回来。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { rd, 记账, ROOT, 壳注册单 } from './lib-slice.mjs';
import { 打包, 打目录, 试件, 信息段字节, 标记, 格式版本, 头长, 块头长, 签名长 } from '../../_build/packbox.mjs';

const 台 = 记账('gate-packbox46');
const 打 = rd('src/_build/packbox.mjs');
const 发布 = rd('src/pack/publish.mjs');
const 纯 = rd('src/_tauri/src/core/pack_box.rs');
const 件路 = path.join(ROOT, 'src', 'tools', 'probes', '件-容器.hex');

/* ---------- 一把四段的读法（这一台自己解一遍，不借打包手的手） ---------- */
function 解包(字){
  const 出 = { 标记:字.slice(0,4).toString('ascii'), 版本:字.readUInt16BE(4), 标志:字.readUInt16BE(6), 信长:字.readUInt32BE(8) };
  出.信息 = JSON.parse(字.slice(头长, 头长 + 出.信长).toString('utf8'));
  let 游 = 头长 + 出.信长;
  出.块 = [];
  while(游 + 块头长 + 0 <= 字.length - 签名长){
    const 长 = 字.readUInt32BE(游), 号 = 字.readUInt16BE(游 + 4);
    出.块.push({ 号, 长, 字:字.slice(游 + 块头长, 游 + 块头长 + 长) });
    游 += 块头长 + 长;
  }
  出.尾起 = 游; 出.总长 = 字.length;
  出.签名段 = 字.slice(字.length - 签名长);
  return 出;
}

台.题('一、这一颗只住发布环节，装出去的那一棵带不走');
台.判('打包手在（' + 打.length.toLocaleString('en-US') + ' 字符），顶上把三条硬规矩写着自己那一格',
  打.length > 4000 && 打.includes('这一颗只住发布环节') && 打.includes('用户侧永远没有'));
const 名单 = (发布.match(/export const 开发层 = \[([\s\S]*?)\];/) || [])[1] || '';
/* 名单里那几条正则照原样建出来（只取 /正文/修饰符 那三段，不跑 eval —— 拿 eval 建闸，闸自己就成了个执行口） */
const 正则 = [...名单.matchAll(/\/(.+)\/([a-z]*)/g)].map(m => { try { return new RegExp(m[1], m[2]); } catch(e) { return null; } }).filter(Boolean);
台.数('publish.mjs 那份「开发层」名单几条', 名单.split('\n').filter(L => L.trim().startsWith('/')).length + ' 条 · 这一台建得出 ' + 正则.length + ' 条');
台.判('那份名单点得到这一颗（现量：拿名单里那几条正则试「_build/packbox.mjs」这一条路）',
  /packbox/.test(名单) && 正则.some(打 => 打.test('_build/packbox.mjs')));
台.判('名单里没把整格 _build 一锅端（别的那几颗还要跟着版本走，只有点名的这几颗不带出门）',
  !/^\/\^_build\/\//m.test(名单) && 正则.every(打 => !打.test('_build/version.mjs')));

台.题('二、四段的形状与壳里那一头同一本账');
for(const [名, JS, Rust] of [['标记', 标记, 'b"FDP1"'], ['格式版本', 格式版本, '认得版本: u16 = 1'],
  ['文件头', 头长, '头长: usize = 12'], ['一块自己的头', 块头长, '块头长: usize = 6'], ['签名段', 签名长, '签名长: usize = 72']])
  台.判('「' + 名 + '」两处同一个数（JS 这一头 ' + JS + '）', String(纯).includes(Rust));
const 键 = Object.keys(信息段段());
function 信息段段(){ return JSON.parse(信息段字节({ id:'x', name:'x', version:'1', min_shell:'1', author:'x', source:'x', key_id:0, files:[], created:1 }).toString('utf8')); }
const 认得 = [...纯.match(new RegExp('pub const 认得键: \\[&str; 10\\] = \\[([^\\]]*)\\]', 's'))[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
台.判('打包手写出来的键一个不出那张表（' + 键.join(' ') + '）', 键.every(k => 认得.includes(k)), 键.filter(k => !认得.includes(k)).join(' '));
台.判('壳里那七个必填键里，那六个字类的键打包手一份不缺（files 由它自己算出来；缺一条它自己就当场停）',
  ['id', 'name', 'version', 'min_shell', 'author', 'source'].every(k => 键.includes(k))
  && 打.includes("['id', 'name', 'version', 'min_shell', 'author', 'source']"));

台.题('三、那一份容器试件：JS 压、Rust 读，两边共读同一串字节');
const 跑 = execFileSync(process.execPath, [path.join(ROOT, 'src', '_build', 'packbox.mjs'), '--试件'], { encoding: 'utf8' }).trim();
const 盘 = fs.readFileSync(件路, 'utf8').trim();
台.判('盘上那一份十六进制与打包手现跑出来的一字不差（改了格式必须 --写试件 重落，不然这一条红）', 跑 === 盘, 跑.slice(0, 40) + ' ≠ ' + 盘.slice(0, 40));
台.判('壳里那颗判断真吃着这一份件（include_str! 那条在，不是写给人看的注释）',
  /include_str!\("\.\.\/\.\.\/\.\.\/tools\/probes\/件-容器\.hex"\)/.test(纯));
const 包 = 解包(Buffer.from(盘, 'hex'));
台.判('这一串字节自己解得开：标记 ' + 包.标记 + ' · 格式 ' + 包.版本 + ' · 标志全 0 · 信息段 ' + 包.信长 + ' 字节',
  包.标记 === 'FDP1' && 包.版本 === 1 && 包.标志 === 0 && 包.信长 > 0);
台.判('逐块哈希与块号：' + 包.块.length + ' 块一块不差，每块与自己声明的数对得上',
  包.块.length === 包.信息.files.length && 包.块.every((块, 序) => {
    const 份 = 包.信息.files[序];
    return 块.号 === 序 && 块.长 === 份.len && crypto.createHash('sha256').update(块.字).digest('hex') === 份.sha256;
  }), JSON.stringify(包.块.map(x => [x.号, x.长])));
台.判('块与块之间不塞对齐字节：内容段读完正好落在签名段那一手开头',
  包.尾起 === 包.总长 - 签名长, 包.尾起 + ' vs ' + (包.总长 - 签名长));
台.判('kernels 点了的那一份，files 里真在（壳里那一头就认这一条）',
  包.信息.kernels.every(名 => 包.信息.files.some(份 => 份.path === 名)), JSON.stringify(包.信息.kernels));

台.题('四、这一版只产未签名、不加密 —— 没实现就不许当"验过了"');
台.判('签名段那两位算法位是 0（没签）、钥匙号是 0、那四位保留位全 0',
  包.签名段.readUInt16BE(0) === 0 && 包.签名段.readUInt16BE(2) === 0 && 包.签名段.slice(4, 8).every(x => x === 0));
台.判('每一份都写 enc:false、key_id:0（加密那一档的字段留着，值不许假装）',
  包.信息.files.every(份 => 份.enc === false) && 包.信息.key_id === 0);
台.判('打包手里没有真加密与真签名那两手（不许哪天顺手把 0 换成一段自制的假签）',
  !/createCipheriv|createSign|Ed25519|hkdf|aes-?gcm/i.test(打.replace(/\/\*[\s\S]*?\*\//g, '')));
台.判('为什么现在不做那两手，那一段话写在文件顶上（不许哪天删了注释当成已实现）',
  打.includes('没实现就是没实现') && 打.includes('将来要动只动两处'));

台.题('五、用户侧接不到这一颗，也没留半个"打包"的口');
const 页面层 = ['src/_fd', 'src/_wnw', 'src/_shared', 'src/_wcustom', 'src/tools', 'data/plugins'].flatMap(格 => {
  const 全 = path.join(ROOT, 格);
  if(!fs.existsSync(全)) return [];
  const 收 = [];
  (function 走(d){ for(const e of fs.readdirSync(d, { withFileTypes: true })){
    const 相 = path.join(d, e.name);
    if(e.isDirectory()){ if(!['node_modules', 'images'].includes(e.name)) 走(相); continue; }
    if(/\.(js|cjs|mjs)$/.test(e.name)) 收.push(相);
  } } )(全);
  return 收;
}).filter(p => !p.includes('gate-packbox46'));
const 喊过 = 页面层.filter(p => /packbox|打目录|打包手/.test(fs.readFileSync(p, 'utf8')));
台.数('用户侧那几棵里提到这一颗的几处', 喊过.length + ' 处' + (喊过.length ? '：' + 喊过.join(' ') : '（一处都没有）'));
台.判('页面、插件、开发那台服务器都请不到这一颗', 喊过.length === 0);
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
台.判('桥与壳的注册单里没有"打包"那一颗（读的那一颗在，写的这一颗只在发布环节）',
  !/box:pack|pack:build|boxPack/.test(桥) && !壳注册单().some(n => /pack_build|box_pack/.test(n)));
台.判('插件那份硬地板没多出"打包"那一颗：名单还是那 54 颗，读的那一颗在里头',
  (() => {
    const 名 = [...rd('src/_tauri/src/core/app_deny.rs').matchAll(/^\s{4}"([A-Za-z]+)",$/gm)].map(m => m[1]);
    return 名.length === 54 && 名.includes('boxInspect') && !名.some(n => /pack(Build|Box)|boxPack|packBuild/i.test(n));
  })());

台.题('六、拿一家现成的目录现场压一份（只在内存里，不落盘）');
const 家 = path.join(ROOT, 'data', 'plugins', 'notes');
const 门前 = JSON.stringify(fs.existsSync(家) ? fs.readdirSync(家).sort() : []);
台.判('data\\plugins\\notes 这一家在（现场量它）', fs.existsSync(家));
const 真 = 打目录(家);
const 解 = 解包(真.字节);
const 单 = JSON.parse(fs.readFileSync(path.join(家, 'manifest.json'), 'utf8'));
台.数('压出来多大 · 几份', 真.字节.length + ' 字节 · ' + 解.信息.files.length + ' 份（' + 解.信息.files.map(f => f.path).join('、') + '）');
台.判('信息段那六个必填键跟着这一家的插件清单走（不是打包手自己编的）',
  解.信息.id === 单.id && 解.信息.name === 单.name && 解.信息.version === 单.version
  && 解.信息.min_shell === 单.minShell && 解.信息.author === 单.author && 解.信息.source === 单.source);
台.判('这一家也一块不差、块号照表走', 解.块.length === 解.信息.files.length
  && 解.块.every((块, 序) => 块.号 === 序 && 块.长 === 解.信息.files[序].len
    && crypto.createHash('sha256').update(块.字).digest('hex') === 解.信息.files[序].sha256));
台.判('同一格再压一遍，字节一模一样（打包手不许掺进当前时刻之类的东西 —— created 由调用方给）',
  打目录(家, 1760000000).字节.equals(打目录(家, 1760000000).字节));
台.判('这一台量完什么都没留下：插件那一格进门前后一份不多（这一颗只在内存里压）',
  JSON.stringify(fs.readdirSync(家).sort()) === 门前, 门前 + ' → ' + fs.readdirSync(家).sort().join(','));

台.收尾();
