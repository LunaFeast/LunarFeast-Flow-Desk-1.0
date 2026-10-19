/* 发布环节那颗打包手 · 把一个解开的插件目录压成自有容器（.fdpkg）
   ------------------------------------------------------------
   插件分离第 3 批 3.3 乙。格式那一页：docs\插件容器格式.md；读的那一头：`fd_core::pack_box`。
   四段：文件头 12 + 信息段（明文 JSON）+ 内容段（一块一份文件）+ 签名段 72。
   块号 = 信息段 files 那张表里的下标，顺序照表走（读的那一头不靠猜）。
   ------------------------------------------------------------
   三条硬规矩，都写在这一页顶上，动手时当场量：
     ① 这一颗只住发布环节。它列在 src\pack\publish.mjs 那份「开发层」名单里，装出去的那一棵搜不到它；
        它也不在任何一个插件仓库里 —— 插件那一侧不许有能把自己压成包、更不许有能加密的那一手。
     ② 这一版只产**未签名、不加密**那两档：签名段算法位写 0（没签）、每块 enc 写 false、key_id 写 0。
        为什么现在不做：验签名要能跑 Ed25519 的那一件，加密要能跑 AES-256-GCM 的那一件，这台机器的离线缓存里
        都没有（能不进新依赖就不进），而**没实现就是没实现，不许把 0 当成"验过了"**。
        将来要动只动两处：这一份里 写签名段 那一颗换成真签，壳那一头 整包检查 加上验的那一手。
     ③ 用户侧永远没有"把一份包另存成加密包"的口：界面上、插件里、开发那台服务器里都不接这一颗，
        要改包就改自己手里那一份，重装进来（第 2 批 2.5 那条口径）。
   ------------------------------------------------------------
   用法：
     node src/_build/packbox.mjs --打 data/plugins/notes --出 一处目录/notes.fdpkg
     node src/_build/packbox.mjs --试件            把那份容器试件的字节按十六进制打出来（比对用）
     node src/_build/packbox.mjs --写试件          重新落那份试件（改了格式才用这一条，改完必复跑那道闸） */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TREE = path.join(HERE, '..', '..');

export const 标记 = 'FDP1';
export const 格式版本 = 1;
export const 头长 = 12;
export const 块头长 = 6;
export const 签名长 = 72;
/* 扩展名不在这里再写一遍：壳里那一枚 pack_box::扩展名 是全仓唯一的一处，这一颗的 --出 由人给整个落点。
   但发布与搬仓那两趟总得把文件落到一个有后缀的名字上 —— 所以这一颗不抄第二份，而是**去问那一处**：
   读壳里那一句常量。读不到就当场停（宁可打不出包，也不许悄悄落一份后缀写错、装不进去的东西）。 */
export function 扩展名(){
  const 相 = path.join(TREE, 'src', '_tauri', 'src', 'core', 'pack_box.rs');
  let 文 = '';
  try{ 文 = fs.readFileSync(相, 'utf8'); }catch(e){ 停('读不到壳里那一枚扩展名的出处：' + 相); }
  const 中 = /pub const 扩展名:\s*&str\s*=\s*"([A-Za-z0-9]+)"/.exec(文);
  if(!中) 停('壳里那一枚 pack_box::扩展名 读不出来（那一句的写法变了，这一颗跟着改）');
  return 中[1];
}

const 折 = n => Buffer.from(n);
const 停 = 句 => { throw new Error('打包停下：' + 句); };

/* ---------- 信息段：那十个键，顺序写死（同一份内容要打出同一串字节，不然比对没意义） ---------- */

export function 信息段字节(信){
  const 件 = [];
  const 加 = (键, 值) => { if(值 !== undefined) 件.push(JSON.stringify(键) + ':' + JSON.stringify(值)); };
  加('id', 信.id); 加('name', 信.name); 加('version', 信.version); 加('min_shell', 信.min_shell);
  加('author', 信.author); 加('source', 信.source); 加('key_id', 信.key_id);
  加('files', (信.files || []).map(份 => ({ path: 份.path, len: 份.len, sha256: 份.sha256, enc: !!份.enc })));
  if(信.kernels && 信.kernels.length) 加('kernels', 信.kernels);
  加('created', 信.created);
  return 折('{' + 件.join(',') + '}');
}

/* ---------- 四段拼一手 ---------- */

export function 签名段(算法 = 0, 钥匙号 = 0){
  const 出 = Buffer.alloc(签名长);
  出.writeUInt16BE(算法, 0);
  出.writeUInt16BE(钥匙号, 2);
  /* 那 4 字节保留位（只对某台机器有效那一档）与 64 字节签名位：这一版全 0，见顶上第②条 */
  return 出;
}

/** 读一颗已经压好的容器：回 { 信息, 件:Map(路径→字节) }，逐份的字节数与 SHA-256 都当场核。
    谁要"从盒子里把东西拿出来看一眼"都走这一颗（发布那一趟摆货架、搬仓那颗读回来对账），
    别处不许再各写一遍那四段的偏移 —— 头 12 / 信息段 / 每份一块（块头 6：长度 4 + 序号 2）/ 签名 72，
    这一份与壳里那一枚 pack_box.rs 是同一套读法。 */
export function 读容器(字){
  const 有 = Buffer.isBuffer(字) ? 字 : Buffer.from(字);
  if(有.length < 头长 + 签名长) 停('这一颗太短，不是容器：' + 有.length + ' 字节');
  if(有.subarray(0, 4).toString('ascii') !== 标记) 停('头四个字节不是 ' + 标记 + '：这一颗不是这台打包手压出来的');
  const 版 = 有.readUInt16BE(4);
  if(版 !== 格式版本) 停('容器格式版本 ' + 版 + '，这一颗只认 v' + 格式版本);
  const 信长 = 有.readUInt32BE(8);
  if(信长 <= 0 || 头长 + 信长 > 有.length) 停('信息段长度不成样子：' + 信长);
  let 信 = null;
  try{ 信 = JSON.parse(有.subarray(头长, 头长 + 信长).toString('utf8')); }
  catch(e){ 停('信息段读不懂（不是 JSON）：' + String((e && e.message) || e)); }
  const 件 = new Map();
  let 偏 = 头长 + 信长;
  (信.files || []).forEach((份, 序) => {
    if(偏 + 块头长 > 有.length) 停('第 ' + 序 + ' 份的块头读不到：' + 份.path);
    const 长 = 有.readUInt32BE(偏), 号 = 有.readUInt16BE(偏 + 4);
    if(号 !== 序) 停('块号对不上：第 ' + 序 + ' 份写的是 ' + 号);
    偏 += 块头长;
    if(偏 + 长 > 有.length) 停('第 ' + 序 + ' 份超出这一颗的末尾：' + 份.path);
    const 字块 = 有.subarray(偏, 偏 + 长); 偏 += 长;
    if(字块.length !== 份.len) 停('份数对不上：' + 份.path + ' 信息段写 ' + 份.len + ' 字节，盒里是 ' + 字块.length + ' 字节');
    if(crypto.createHash('sha256').update(字块).digest('hex') !== 份.sha256) 停('哈希对不上：' + 份.path + '（这一颗被人改过，或者压到一半）');
    件.set(份.path, 字块);
  });
  if(偏 + 签名长 !== 有.length) 停('末尾多出 ' + (有.length - 偏 - 签名长) + ' 字节（这一颗不是完整的一颗）');
  return { 信息: 信, 件, 格式: 版 };
}

/** 打包：件 = [{路径, 字节}]，信 = 那十个键（files 由这一颗自己算，不许外面递进来） */
export function 打包(件, 信, 时间秒){
  if(!件 || !件.length) 停('一份文件都没有，压不出包');
  const 列 = 件.map(份 => {
    const 路 = String(份.路径).replace(/\\/g, '/');
    if(!路 || 路.startsWith('/') || /^[A-Za-z]:/.test(路) || 路.split('/').some(x => x === '..' || x === '.'))
      停('路径不干净：' + 份.路径 + '（只许包内的相对写法）');
    const 字 = Buffer.isBuffer(份.字节) ? 份.字节 : Buffer.from(份.字节);
    return { path: 路, len: 字.length, sha256: crypto.createHash('sha256').update(字).digest('hex'), enc: false, 字 };
  });
  const 全 = { ...信, key_id: 0, created: Math.floor(Number(时间秒) || Date.now() / 1000),
    files: 列.map(({ path, len, sha256, enc }) => ({ path, len, sha256, enc })) };
  if(全.kernels){
    for(const 名 of 全.kernels)
      if(!全.files.some(份 => 份.path === 名)) 停('kernels 点了「' + 名 + '」，这一格里没这份文件');
  }
  for(const 必 of ['id', 'name', 'version', 'min_shell', 'author', 'source'])
    if(!全[必]) 停('插件清单缺「' + 必 + '」这一格 —— 信息段那六个必填键，缺一条壳那一头就报字段不齐');
  if(!/^[a-f0-9]{64}$/.test(全.files[0].sha256)) 停('自己算出来的哈希写法不对，这一版不该可能发生');

  const 信段 = 信息段字节(全);
  const 出 = [];
  const 头 = Buffer.alloc(头长);
  头.write(标记, 0, 'ascii');
  头.writeUInt16BE(格式版本, 4);
  头.writeUInt16BE(0, 6);                    /* 头部标志：现在只许全 0 */
  头.writeUInt32BE(信段.length, 8);
  出.push(头, 信段);
  列.forEach((份, 序) => {
    const 块头 = Buffer.alloc(块头长);
    块头.writeUInt32BE(份.字.length, 0);
    块头.writeUInt16BE(序, 4);               /* 块号 = files 那张表里的下标 */
    出.push(块头, 份.字);
  });
  出.push(签名段());
  return { 字节: Buffer.concat(出), 信息: 全 };
}

/* ---------- 从一个解开的插件目录读件与那六个键 ---------- */

export function 打目录(目录, 时间秒 = Math.floor(Date.now() / 1000)){
  if(!fs.existsSync(目录)) 停('没有这一格：' + 目录);
  const 清路 = path.join(目录, 'manifest.json');
  if(!fs.existsSync(清路)) 停('这一格里没有插件清单：' + 清路);
  const 单 = JSON.parse(fs.readFileSync(清路, 'utf8'));
  /* 打包时刻（Unix 秒）只写进信息段那一份（下面 打包() 落）：格式文档那张表里 `created` 早就写着必填、
     只管审计，可这颗打包手从前既不写它、也不管用进来的 时间秒 那一个参数 —— 号比不出新旧时一点凭据都没有，
     2026-10-18 那六颗旧包被当成"新版"、点下去是降级，就是这么来的。
     不往清单里塞：清单那一份要跟仓里那一字不差（"这一格被改过"那两道核的就是这条）。
     这一格只管审计：新旧由版本号自己比得出大小（排序那一段写在预发布里，见 version.mjs 与各家 出包.mjs），
     摊开之后那一格里不再另留任何"装过什么"的条子（他 2026-10-19：「为什么需要额外记录哪个装了哪个没装？纯属多余」）。 */
  const 秒 = Math.floor(Number(时间秒) || Date.now() / 1000);
  const 件 = [];
  (function 走(格, 前){
    for(const 名 of fs.readdirSync(格).sort()){
      const 相 = path.join(格, 名), 相前 = 前 ? 前 + '/' + 名 : 名;
      if(fs.statSync(相).isDirectory()) 走(相, 相前);
      else 件.push({ 路径: 相前, 字节: fs.readFileSync(相) });
    }
  })(目录, '');
  return 打包(件, {
    id: 单.id, name: 单.name, version: 单.version, min_shell: 单.minShell,
    author: 单.author, source: 单.source, kernels: 单.kernels,
  }, 秒);
}

/* ---------- 容器试件：两份写死的件 + 固定时间，产出确定的字节 ----------
   为什么要有这一份：JS 这一头压、Rust 那一头读，两边必须拿同一串字节核 —— 壳里那颗判断
   用 include_str! 吃这一份的十六进制（src/tools/probes/件-容器.hex），任一边改了形状当场红。 */
export const 试件清单 = {
  id: 'notes', name: '你的便签', version: '1.0.0', minShell: '1.0.0',
  author: 'Flow-Desk', source: '内置出厂', kernels: ['box-kernel.js'],
};
export function 试件(){
  const 清 = JSON.stringify({ ...试件清单, entry: ['main.js'], kernels: ['box-kernel.js'] });
  return 打包([
    { 路径: 'manifest.json', 字节: Buffer.from(清) },
    { 路径: 'box-kernel.js', 字节: Buffer.from('/* 容器试件的一颗内核 · 一行 */\n') },
    { 路径: 'main.js', 字节: Buffer.from('/* 容器试件的入口 · 一行 */\nexport default { id:"notes" };\n') },
  ], {
    id: 试件清单.id, name: 试件清单.name, version: 试件清单.version, min_shell: 试件清单.minShell,
    author: 试件清单.author, source: 试件清单.source, kernels: 试件清单.kernels,
  }, 1760000000);
}
export const 试件路 = path.join(TREE, 'src', 'tools', 'probes', '件-容器.hex');

/* ---------- 命令行 ---------- */
/* 只有直接跑这一份才动嘴；闸与别的手艺 import 这一份时不该多出几行使用法 */
const 是主 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if(是主){
  const 论 = process.argv.slice(2);
  const 有 = 名 => 论.includes(名);
  const 值 = 名 => { const i = 论.indexOf(名); return i < 0 ? '' : (论[i + 1] || ''); };
  if(有('--试件')){
    console.log(试件().字节.toString('hex'));
  } else if(有('--写试件')){
    const 字 = 试件().字节.toString('hex') + '\n';
    fs.writeFileSync(试件路, 字);
    console.log('试件落了：' + 试件路 + ' · ' + 试件().字节.length + ' 字节 · ' + 字.length + ' 个十六进制字（带换行）');
  } else if(有('--打')){
    const 目录 = 值('--打'), 出 = 值('--出');
    if(!出) 停('--打 要配 --出（压好的那份包落在哪儿）');
    const 包 = 打目录(目录);
    fs.writeFileSync(出, 包.字节);
    console.log('压好了：' + 出 + ' · ' + 包.字节.length + ' 字节 · ' + 包.信息.files.length + ' 份文件 · 未签名（管理页那一行会标「用户插件」）');
    console.log('  信息段：id=' + 包.信息.id + ' version=' + 包.信息.version + ' min_shell=' + 包.信息.min_shell +
      ' kernels=' + (包.信息.kernels || []).join('、'));
  } else {
  console.log('用法：node src/_build/packbox.mjs --打 <插件目录> --出 <压好的那一份包落在哪儿>');
    console.log('      node src/_build/packbox.mjs --试件 | --写试件');
  }
}
