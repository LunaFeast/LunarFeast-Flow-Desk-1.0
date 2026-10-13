/* ============================================================
   gate-tauripublish46.mjs · 外46 三 批八：首装那一颗走新壳，包里到底有什么
   ------------------------------------------------------------
     node src/tools/probes/gate-tauripublish46.mjs
   钉的是这么几件事（2026-10-12 凌晨这一批做的）：
     一、发布脚本认 --壳=tauri 这一档，两种壳差的只有「运行时那一层」，
        页面层 / 插件那两格 / src 层 / 货架 / 首装壳 / 清单 / data 那道闸 两处共用同一套代码；
     二、新壳那一棵里不许混进 Electron 的件（locales、resources\app、electron 的 dll 与 pak）；
     三、新壳那一棵必须带着 exe（改名成整棵树唯一的门牌）与 WebView2 那颗加载器；
     四、Electron 那一棵照旧带着它那些件 —— 这一批不许把日常在用的那条路改坏；
     五、两包的 src 层与插件两格一份不差、同一张页同一个号；
     六、data\ 那道闸在两包里都成立（除插件两格之外零份）；
     七、产物各落一格（dist\ 与 dist\tauri\），--壳 传错值当场停。
   对账走发布脚本自己吐的那一份路径清单（--dry --json）：
   dist\ 那一格是产物，不许当核对面去翻，所以"包里有什么"由脚本自己报。
   ============================================================ */
import { execFileSync } from 'node:child_process';
import { 记账, ROOT } from './lib-slice.mjs';

const 台 = 记账('gate-tauripublish46.mjs');

function 跑发布(额外){
  try{
    const 出 = execFileSync(process.execPath, ['src/pack/publish.mjs', '--dry', '--json', ...额外],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const 行 = 出.split(/\r?\n/).find(l => l.startsWith('MANIFEST '));
    const 清单 = 行 ? JSON.parse(行.slice('MANIFEST '.length)) : null;
    return { 成: true, 清单, 全文: 出 };
  }catch(e){
    return { 成: false, 码: e.status, 全文: String(e.stdout || '') + String(e.stderr || '') };
  }
}
const 旧 = 跑发布([]);
const 新 = 跑发布(['--壳=tauri']);

台.题('一、两趟都跑得通，各自吐出一份路径清单');
台.判('Electron 那一棵干跑过', 旧.成 && Array.isArray(旧.清单) && 旧.清单.length > 100, 旧.全文.slice(-400));
台.判('新壳那一棵干跑过', 新.成 && Array.isArray(新.清单) && 新.清单.length > 100, 新.全文.slice(-400));
台.数('Electron 一份', (旧.清单 || []).length + ' 路径');
台.数('新壳一份', (新.清单 || []).length + ' 路径');

const 有 = (包, 前缀) => (包.清单 || []).filter(k => k === 前缀 || k.startsWith(前缀));
台.题('二、新壳那一棵不混 Electron 的件');
台.判('没有 locales 那一层', 有(新, 'locales/').length === 0, 有(新, 'locales/').slice(0, 4));
台.判('没有 resources/app 那一层（桥和命令都编在 exe 里，铺一份就是留第二份真身）',
  有(新, 'resources/').length === 0, 有(新, 'resources/').slice(0, 4));
台.判('没有 electron 那颗 dll 与那批 pak',
  !有(新, '').includes('electron.dll') && 有(新, '').filter(k => /\.pak$/.test(k)).length === 0);
台.判('Electron 那一棵照旧带着 locales 与 resources/app（日常那条路没被改坏）',
  有(旧, 'locales/').length > 0 && 有(旧, 'resources/app/').length > 0,
  { locales: 有(旧, 'locales/').length, app: 有(旧, 'resources/app/').length });

台.题('三、新壳带着该带的两颗件，名字是整棵树唯一的门牌');
台.判('根上有 Flow-Desk.exe（新壳那颗 exe 进包改了名 —— 页面、托盘、进程名三处都认这一串）',
  有(新, 'Flow-Desk.exe').length === 1);
台.判('根上有 WebView2Loader.dll', 有(新, 'WebView2Loader.dll').length === 1);
台.判('Electron 那一棵没有加载器这一颗（各带各的运行时）', 有(旧, 'WebView2Loader.dll').length === 0);

const 页 = 包 => (包.清单 || []).filter(k => /^pages\/Flow_Desk_.*\.html$/.test(k));
const 源 = 包 => (包.清单 || []).filter(k => k.startsWith('src/'));
const 家 = 'music-remote notes schedule singbit-input-practice why-not-write wnw-custom your-sentences'.split(' ');
台.题('四、两处共用的那几层一份不差');
台.判('两包里那张页同名（同一个号，不会一个带新页一个带旧页）',
  页(新).length === 1 && 页(旧).length === 1 && 页(新)[0] === 页(旧)[0], { 新: 页(新), 旧: 页(旧) });
台.判('src 层份数一致（同一套源码，页面生成、改代码都要它）',
  源(新).length > 100 && 源(新).length === 源(旧).length, { 新: 源(新).length, 旧: 源(旧).length });
const 缺家 = 家.filter(id => !有(新, 'data/plugins/' + id + '/manifest.json').length || !有(新, 'data/plugins-factory/' + id + '/manifest.json').length);
台.判('七家插件两格齐（活的 + 原版），一家不缺', 缺家.length === 0, 缺家);
const 缺说明 = ['安装说明.txt'].filter(n => !有(新, n).length);
台.判('树根那份说明在包里', 缺说明.length === 0, 缺说明);

const 脏 = 包 => (包.清单 || []).filter(k => (k === 'data' || k.startsWith('data/'))
  && !k.startsWith('data/plugins/') && !k.startsWith('data/plugins-factory/'));
台.题('五、data 那道闸在两包里都成立');
台.判('新壳那一棵 data\\ 底下除插件两格之外零份', 脏(新).length === 0, 脏(新).slice(0, 6));
台.判('Electron 那一棵同样零份', 脏(旧).length === 0, 脏(旧).slice(0, 6));

台.题('六、产物各落一格、错值当场停');
台.判('新壳的产物格是 dist\\tauri（两棵不混在一格里）', /产物在 .*[\\/]dist[\\/]tauri/.test(新.全文), (新.全文.match(/产物在 .*/) || [''])[0]);
台.判('Electron 的产物格是 dist（后面不带 tauri）', /产物在 .*[\\/]dist(\r?\n|$)/.test(旧.全文), (旧.全文.match(/产物在 .*/) || [''])[0]);
const 错 = (() => { try{
  execFileSync(process.execPath, ['src/pack/publish.mjs', '--dry', '--壳=qt'], { cwd: ROOT, encoding: 'utf8' });
  return { 码: 0 };
}catch(e){ return { 码: e.status, 话: String(e.stdout || '') + String(e.stderr || '') }; } })();
台.判('--壳 传了不认的值就停（不出一份半对的包）', 错.码 !== 0 && /只认 electron \/ tauri/.test(错.话), 错);

台.收尾();
