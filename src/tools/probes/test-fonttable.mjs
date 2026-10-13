/* 外31 三组 · 本地字体那份表（2026-10-08 作者改口：「明明各种字重我本地都有，链接一下就行了」
   「系统字体扫一下那么快，显示本地字体快得很，你设置一下那么慢」「你现在就换」）
   2026-10-14 改口：这一台从前切的是 `src\pack\main.cjs` 里 PowerShell 那一路（fontScanCmd / parseFontOut /
   parseFontRows / ffWeightNum），那一路整条随 Electron 退了 —— 壳这一头用的是系统 DirectWrite
   （`tauri_bind\info_cmds.rs`：DWriteCreateFactory → GetSystemFontCollection → IDWriteFont::GetSimulations
   把系统现合成的假粗假斜扔掉，一家一族、族底下逐张真脸），档名换算那几颗住在 `core\font_table.rs` 并自带测试。
   所以这一台改成钉两件事：壳里认的是系统那张表（不是从前那份只给名字的族表）+ 页面那一路的接线。
   「拿真机器数一遍」那一件由 Rust 那几颗 #[test] 与壳真跑那两趟管，这台不重做一遍。 */
import { rd } from './lib-slice.mjs';

const 壳信 = rd('src/_tauri/src/tauri_bind/info_cmds.rs');
const 壳表 = rd('src/_tauri/src/core/font_table.rs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const SHF = rd('src/_shared/sh-font.js');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if(c){ pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x ? ' · ' + x : '')); } };

/* ---------- 一、壳里认的是系统那张表，不是名字 ---------- */
ok('1 读的是系统字体族表（DWriteCreateFactory → GetSystemFontCollection），不是从前那份只给名字的 GDI 族表',
  /DWriteCreateFactory/.test(壳信) && /GetSystemFontCollection/.test(壳信) && !/InstalledFontCollection/.test(壳信));
ok('2 系统现合成的假粗假斜当场扔掉（IDWriteFont::GetSimulations 那一手在，霞鹜文楷等宽因此只剩真三档）',
  /GetSimulations/.test(壳信));
ok('3 一家一族、族底下逐张真脸都过一遍（IDWriteFontFamily / IDWriteFontList 那两手都在）',
  /IDWriteFontFamily/.test(壳信) && /IDWriteFontList/.test(壳信));
ok('4 字重那一路住在纯判断那一格（档名换算成数、认不出就不算一张脸），并且自带测试',
  /pub fn/.test(壳表) && (壳表.match(/#\[test\]/g) || []).length >= 3 && !/GetSystemFontCollection/.test(壳表));

/* ---------- 二、接线：页面读的是这一份对象，不是从前那一串名字 ---------- */
ok('5 页面那颗「重读系统字体」真强制重扫（桥把 force 递给壳里那一颗，点它走的不是缓存）',
  /async fontList\(force\)\{[\s\S]{0,120}invoke\('font:list', !!force\)/.test(桥));
ok('6 重数完推给各窗口那一句在壳里（font:changed 那一颗喊得出）；缓存那份不再有过期这一档（新装字体不该等 7 天）',
  /"font:changed"/.test(壳信) && !/FONTS_CACHE_AGE/.test(壳信 + 桥));
ok('7 正在扫的时候页面来问，等这一份就行，不另开第二趟（那把锁在壳里）',
  /Busy|在扫|锁/.test(壳信));
ok('8 页面收的是 { fonts, faces } 那一份，字重表存进 State（下一次开机不用重扫也有档）',
  /absorb\(got\)\{/.test(SHF) && /State\.set\('font-w', 表\)/.test(SHF) && /a\.onFontList\(got =>/.test(SHF));
ok('9 字重不再从字体名字里猜：ffBaseOf / ffWeightOf / ffWeightMark / FF_WEIGHT_WORDS 四颗都从源码里撤了',
  !/ffBaseOf|ffWeightOf|ffWeightMark|FF_WEIGHT_WORDS/.test(SHF));
ok('10 挑档那一路吃的就是这张表（weightsOf 读 wmap，认不到才退本家那一张 400）',
  /weightsOf\(f\)\{[\s\S]{0,260}this\.wmap\[本家名\][\s\S]{0,120}w:400/.test(SHF));
ok('11 组件那头拿不到这两条通道（硬地板清单里 fontList 旁边补上了 onFontList）',
  /'fontList', 'onFontList'/.test(rd('src/_shared/sh-load.js')));

console.log('\n' + pass + ' 过 ' + fail + ' 不过');
process.exit(fail ? 1 : 0);
