/* ============================================================
   一家一仓之后「那一份到底在哪儿」只此一处（插件分离第 5 批第四刀）
   ------------------------------------------------------------
   先问本仓，本仓没有就问旁边那一层的各家那一棵；邻居那几棵的名字**不抄第二份名单**，
   拿搬仓那一颗（src\_build\pack-repo.mjs）的 仓名 那张表现算。那一本问不到时（这一棵本来就是
   某一家自己那一棵，或者这一棵没带搬仓那颗）邻居是空 —— 问不到就把本仓那一条交回去，
   让调用方拿到它自己的 ENOENT，绝不在这儿编一个"看着像对"的空结果。

   这一颗只回答"在哪儿、在不在、读一份、列一格"，不改任何判据：
   主程序那一仓推出去的还是空壳，一个插件字节都不在里面。
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const 本仓根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const 切段 = 相 => String(相).split('/').filter(Boolean);
let 邻 = [];
try{
  const { 仓名 } = await import(pathToFileURL(path.join(本仓根, 'src', '_build', 'pack-repo.mjs')).href);
  邻 = Object.values(仓名).map(名 => path.join(path.dirname(本仓根), 名));
}catch(e){ /* 问不到那一本：没有邻居，只认本仓 */ }

export const 邻居数 = () => 邻.length;
/* 给非 ESM 的那几颗用（src\pack\uitext.cjs 是 .cjs，import 不了这一份）：
   它只要一份"按顺序找"的仓根名单，第一个是本仓，后面是隔壁那几棵。 */
export const 根列表 = () => [本仓根, ...邻];
export function 找(相, 根 = 本仓根){
  const 本 = path.join(根, ...切段(相));
  if(fs.existsSync(本)) return 本;
  for(const 院 of 邻){ const 相2 = path.join(院, ...切段(相)); if(fs.existsSync(相2)) return 相2; }
  return 本;
}
export const 在 = (相, 根) => fs.existsSync(找(相, 根));
export const 文本 = (相, 根) => fs.readFileSync(找(相, 根), 'utf8');
export const 字节 = (相, 根) => fs.readFileSync(找(相, 根));
export const 列 = (相, 根) => fs.readdirSync(找(相, 根));
/* 这一份现在是从哪一棵读到的 —— 报出来给人看一眼，不闷着（界面上与自检输出都用这一句） */
export function 出自(相, 根 = 本仓根){
  const p = 找(相, 根);
  if(p.startsWith(根)) return '主程序仓';
  for(const 院 of 邻) if(p.startsWith(院 + path.sep)) return path.basename(院);
  return '哪儿都没有';
}
