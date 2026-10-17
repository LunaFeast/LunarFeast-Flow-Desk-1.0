/* ============================================================
   这一摊开发树的形状只此一处（2026-10-16 他定：编程 Flow-Desk 与它的插件单独一摊，路径一律英文）
   ------------------------------------------------------------
     <开发那一摊>\
       flow-desk\            主程序那一仓（远程还是 LunarFeast-Flow-Desk-1.0）
       plugins\              八家插件各一仓，仓名照 GitHub 上那一种写法
       sandbox\              开发期临时格（探针沙盒、pack-lite、搬仓那颗铺的样棵）
       assets\  notes\       搬进来的素材权属与开发笔记（不进任何仓，见 .gitignore 之外那一层）
   三颗都从这一份取，别处不许再各算一遍 dirname(TREE)：
     主仓根   = 这一棵仓的根
     插件格   = 八家那一格（搬仓那颗铺的默认落点、邻居那把尺问的那几棵）
     沙盒格   = 探针与工具临时生的那些棵（跑完当场删）
   全英文：中文名在别的工具链里出过未知形状的坑，这一摊一律不往路径里塞中文。
   ============================================================ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const 主仓根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const 开发那一摊 = path.dirname(主仓根);
export const 插件格 = path.join(开发那一摊, 'plugins');
export const 沙盒格 = path.join(开发那一摊, 'sandbox');
export const 主程序仓名 = path.basename(主仓根);            /* 隔壁那一颗找主程序时用的那一名 */
