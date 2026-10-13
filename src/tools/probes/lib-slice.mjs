/* 探针共用的「从真源码里切一颗」的尺 —— 外30 这一批新台子都用它，不再各自抄第二份。
   规矩和 test-marks.mjs 那把一样：切的是仓库里那一份原文（不抄第二份），
   函数看到配对的大括号就收，常量看到浅层分号就收；字符串、注释、正则字面量里的括号不算数。
   文件名不带 test-/gate-/klog- 前缀：selfcheck 那一头只点那三类，这一颗是零件不是台子。 */
import fs from 'node:fs';
import { fileURLToPath as __url } from 'node:url';
const __树根 = __url(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');   /* 仓根从这份脚本自己的位置算，不写死本机路径 */

export const ROOT = __树根 + '/';
export const rd = p => fs.readFileSync(ROOT + p, 'utf8');

function 扫过(s, i){
  const c = s[i], d = s[i + 1];
  if(c === '/' && d === '/'){ const n = s.indexOf('\n', i); return n < 0 ? s.length : n; }
  if(c === '/' && d === '*'){ const n = s.indexOf('*/', i + 2); return n < 0 ? s.length : n + 2; }
  if(c === '"' || c === "'" || c === '`'){
    let k = i + 1;
    while(k < s.length){ if(s[k] === '\\'){ k += 2; continue; } if(s[k] === c) return k + 1; k++; }
    return s.length;
  }
  if(c === '/'){
    let k = i + 1, 方 = false;
    while(k < s.length){
      const x = s[k];
      if(x === '\\'){ k += 2; continue; }
      if(x === '\n') break;
      if(方){ if(x === ']') 方 = false; k++; continue; }
      if(x === '['){ 方 = true; k++; continue; }
      if(x === '/') return k + 1;
      k++;
    }
    return i + 1;
  }
  return i;
}
const 正则位 = c => c === undefined || '(,=:[!&|?{};+\n'.includes(c);

/* 从一份源码文本里按名字切出一整颗顶层声明（const / let / var / function / async function） */
export function 切(src, 名){
  const 起 = new RegExp('^(?:const|let|var|function|async[ \\t]+function)[ \\t]+' + 名 + '(?![\\w$])', 'm').exec(src);
  if(!起) throw new Error('切不到这一颗：' + 名);
  const 函数 = /function/.test(起[0]);
  let i = 起.index + 起[0].length, d = 0, 开过 = false, 前 = ' ';
  while(i < src.length){
    const c = src[i];
    if(c === '/' || c === '"' || c === "'" || c === '`'){
      const n = (c === '/' && !正则位(前)) ? i + 1 : 扫过(src, i);
      if(n === i){ 前 = c; i++; } else { i = n; 前 = '/'; }
      continue;
    }
    if(c === '{' || c === '[' || c === '('){ d++; 开过 = true; }
    else if(c === '}' || c === ']' || c === ')'){ d--; if(函数 && c === '}' && d === 0 && 开过) return src.slice(起.index, i + 1); }
    else if(!函数 && c === ';' && d === 0) return src.slice(起.index, i + 1);
    if(!/\s/.test(c)) 前 = c;
    i++;
  }
  if(!函数 && d === 0) return src.slice(起.index);
  throw new Error(名 + ' 没收尾');
}

/* 从对象字面量 / class 里切一颗方法（Cards.put、CardView.dirty 这种：给方法名那一行的开头，连缩进原样端出来）。
   同名方法一家 class 里到处都有（dirty / draw 满天飞），所以给一个「从哪儿往后找」的起点；
   再给一个「到哪儿为止」（下一个 class 的开头）—— 越界就当没找到抛出来：
   从前这里少给一个界，CardView.dirty 改过签名之后静悄悄切到了后面某一家的同名方法，跑出来的是替身的账。 */
export function 切方法(src, 头, 起 = 0, 止 = src.length){
  const i = src.indexOf('\n' + 头, 起);
  if(i < 0 || i >= 止) throw new Error('切不到这一颗方法：' + 头.trim() + (起 ? '（从第 ' + 起 + ' 个字往后、到第 ' + 止 + ' 个字为止）' : ''));
  let j = src.indexOf('{', i + 1), d = 0;
  let k = j, 前 = ' ';
  while(k < src.length){
    const c = src[k];
    if(c === '/' || c === '"' || c === "'" || c === '`'){
      const n = (c === '/' && !正则位(前)) ? k + 1 : 扫过(src, k);
      if(n === k){ 前 = c; k++; } else { k = n; 前 = '/'; }
      continue;
    }
    if(c === '{' || c === '[' || c === '(') d++;
    else if(c === '}' || c === ']' || c === ')'){ d--; if(d === 0 && c === '}') return src.slice(i + 1, k + 1); }
    if(!/\s/.test(c)) 前 = c;
    k++;
  }
  throw new Error(头.trim() + ' 没收尾');
}

/* ---------- 桥与壳的那一把尺（六道闸共用一份，别处不再抄第二份） ----------
   从前这几台各自拿 Electron 主进程那份 `src\pack\main.cjs` 里的 ipcMain.handle 当"该有哪些通道"的标准答案，
   五道各数一遍、还互相核对数字别对不上 —— 那一层已经不进产品链了，标准答案换成真在跑的这两份：
     · 桥（src\_tauri\ui\fd-bridge.js）请了哪几颗 —— 页面上真喊得出的名字；
     · 壳（src\_tauri\src\main.rs 的 invoke_handler 那张注册单）注册了哪几颗。
   通道名到 Rust 函数名的换算（冒号与连字符都变下划线、驼峰变下划线）也只在这一处说一次。 */
export const 桥原文 = () => rd('src/_tauri/ui/fd-bridge.js');
export const 名换算 = n => n.replace(/[-:]/g, '_').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
/* 通道名里有带连字符的那一族 —— 名段漏掉 '-' 就整族逃过（2026-10-13 头一版就是这么漏的） */
const 抓通道 = (s, 只请壳) => [...new Set([...s.matchAll(
  new RegExp(只请壳 ? /(?:invoke|send)\('([a-z][a-z-]*:[A-Za-z][A-Za-z]*)'/g : /(?:invoke|send|on)\('([a-z][a-z-]*:[A-Za-z][A-Za-z]*)'/g, 'g')
)].map(m => m[1]))].sort();
export const 桥请壳 = s => 抓通道(s, true);
export const 桥全部 = s => 抓通道(s, false);
export const 壳注册单 = () => [...rd('src/_tauri/src/main.rs').matchAll(/tauri_bind::\w+::(\w+)/g)].map(m => m[1]);
/* 一批通道在不在「桥请得到 + 壳也注册了」这两张名单上（缺一处就是那一批没搬齐） */
export function 对名单(批, 桥, 单){
  const 请 = new Set(桥请壳(桥).map(名换算));
  return { 桥没请: 批.filter(n => !请.has(名换算(n))), 单没注册: 批.filter(n => !单.includes(名换算(n))) };
}

/* 一台结果账：判() 每条都要报数，最后 收尾() 打印并退出码 */
export function 记账(台名){
  let pass = 0, fail = 0;
  const 目 = [];
  return {
    题(t){ console.log('\n=== ' + t + '（' + 台名 + '）'); },
    判(n, c, extra){
      if(c){ pass++; console.log('  PASS ' + n); }
      else { fail++; console.log('  FAIL ' + n + (extra === undefined ? '' : ' · 实际：' + fmt(extra))); }
      目.push([n, !!c]);
      return !!c;
    },
    数(k, v){ console.log('  · ' + k + ' = ' + fmt(v)); },
    收尾(){
      console.log('\n' + 台名 + '：' + pass + ' 过 ' + fail + ' 不过（共 ' + (pass + fail) + ' 条）');
      if(!pass && !fail) { console.log('这台一条都没判 —— 哑台，不算跑过'); process.exitCode = 1; }
      if(fail) process.exitCode = 1;
    }
  };
}
function fmt(v){
  if(typeof v === 'string') return v;
  try{ return JSON.stringify(v); }catch(e){ return String(v); }
}
