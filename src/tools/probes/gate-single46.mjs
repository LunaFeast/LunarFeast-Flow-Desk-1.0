/* ============================================================
   gate-single46.mjs · 外46 三 批十：只许开一个程序，换官方那颗插件
   ------------------------------------------------------------
     node src/tools/probes/gate-single46.mjs
   钉的是这么几件事：
     一、依赖进了 Cargo.toml（版本钉着），THIRD-PARTY.txt 同批登记了名、版本与许可；
     二、这颗排在其他插件最前面 —— 第二份要在别的 setup 动手之前就被认出来；
     三、回调只干一件事：叫 win_cmds 里那一颗，不在闭包里堆活；
     四、那一句日志的原话与类别跟 Electron 那一份一字不差（两头现场抓）；
     五、动窗口那三步齐，且自证那一档（FD_SHELL_NOWIN）不露窗；
     六、没有再自己占一个本机端口问口令那种手；
     七、反向对照三例。
   ============================================================ */
import { rd, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-single46');

const 清单 = rd('src/_tauri/Cargo.toml');
const 主干 = rd('src/_tauri/src/main.rs');
const 窗口 = rd('src/_tauri/src/tauri_bind/win_cmds.rs');
const 原件 = rd('src/pack/main.cjs');
const 随行 = rd('THIRD-PARTY.txt');

/* ---------- 一、依赖与随行清单 ---------- */
台.题('一、依赖进了清单，随行那一册也登记了');
const 有依赖 = /^tauri-plugin-single-instance = "([0-9.]+)"/m.test(清单);
const 版本 = (清单.match(/^tauri-plugin-single-instance = "([0-9.]+)"/m) || [])[1] || '';
台.数('Cargo.toml 里钉的版本', 版本);
台.判('Cargo.toml 里有这一颗且钉着版本', 有依赖);
台.判('随行册里登记了这一颗（名 + 版本 + 许可两个都写）',
  new RegExp('tauri-plugin-single-instance\\s*' + 版本.replace(/\./g, '\\.') + '[\\s\\S]{0,320}(MIT|Apache)').test(随行));
台.判('许可那一栏写的是双授（Apache-2.0 或 MIT 两个名都出现）',
  /Apache-2\.0/.test(随行) && /MIT/.test(随行));

/* ---------- 二、排在最前 ---------- */
台.题('二、这颗排在其他插件最前面');
const 单位 = 主干.indexOf('tauri_plugin_single_instance::init');
const 对位 = 主干.indexOf('tauri_plugin_dialog::init');
台.判('两颗都在主干里登记了', 单位 > 0 && 对位 > 0);
台.判('单实例这一颗在前（对话框那颗在后）', 单位 > 0 && 单位 < 对位);
台.判('注释写明了为什么要排在最前', /排在其他插件最前面|这颗要排在其他插件最前面/.test(主干));

/* ---------- 三、回调只干一件事 ---------- */
台.题('三、回调只叫那一颗，不在闭包里堆活');
const 回调 = (主干.match(/tauri_plugin_single_instance::init\([\s\S]{0,400}?\}\)/) || [''])[0];
台.判('回调叫的是 win_cmds 里那一颗', /tauri_bind::win_cmds::第二份进来了/.test(回调));
const 句数 = (回调.match(/;/g) || []).length;
台.数('回调闭包里几句话', 句数);
台.判('不超过两句话（活都在那一颗里）', 句数 <= 2);

/* ---------- 四、那句原话两头一致 ---------- */
台.题('四、日志那句原话与类别，两头一字不差');
const 原段 = (原件.match(/'second-instance'[\s\S]{0,240}/) || [''])[0];
const 原句 = (原段.match(/logLine\('([^']+)',\s*'([^']+)'\)/) || [])[0] || '';
const 原类 = (原句.match(/logLine\('([^']+)'/) || [])[1] || '';
const 原文 = (原句.match(/,\s*'([^']+)'\)/) || [])[1] || '';
const 壳段 = (窗口.match(/记一笔\("([^"]+)",\s*"([^"]+)"\)/) || [])[0] || '';
const 壳类 = (壳段.match(/记一笔\("([^"]+)"/) || [])[1] || '';
const 壳文 = (壳段.match(/,\s*"([^"]+)"\)/) || [])[1] || '';
台.数('Electron 那一份', 原类 + ' · ' + 原文);
台.数('壳这一份', 壳类 + ' · ' + 壳文);
台.判('类别一字不差', 原类 !== '' && 原类 === 壳类);
台.判('那句原话一字不差', 原文 !== '' && 原文 === 壳文);

/* ---------- 五、动窗口那三步与不露窗那一档 ---------- */
台.题('五、露出来那三步齐，自证那一档不露');
const 那一颗 = (窗口.match(/pub fn 第二份进来了[\s\S]{0,700}?\n\}/) || [''])[0];
台.判('那一颗在窗口这一格里', 那一颗.length > 0);
台.判('先记日志再动窗口', 那一颗.indexOf('记一笔') >= 0 && 那一颗.indexOf('记一笔') < 那一颗.indexOf('get_webview_window'));
台.判('三步齐：不最小化、露出来、拿到光标',
  /unminimize\(\)/.test(那一颗) && /\.show\(\)/.test(那一颗) && /set_focus\(\)/.test(那一颗));
台.判('认 FD_SHELL_NOWIN 那一档（自证时任何窗口都不许到前台）', /FD_SHELL_NOWIN/.test(那一颗));

/* ---------- 六、不许再来一次同类 hack ---------- */
台.题('六、没有再自己占端口问口令');
台.判('这两格里不出现自己开服务器那一手（listen / createServer / net.createServer）',
  !/\blisten\(|createServer\(/.test(那一颗 + 回调));
台.判('也没有自己挑一个本机端口当口令牌（port 号那种字面）',
  !/\b9\d{3}\b|\b8\d{3}\b/.test(那一颗));

/* ---------- 七、反向对照 ---------- */
台.题('七、反向对照（判据不是空闸）');
/* 把两颗的登记位置真对调一遍（借一个占位符换手），判据必须红 */
const 甲名 = 'tauri_plugin_single_instance::init';
const 乙名 = 'tauri_plugin_dialog::init';
const 对调 = 主干.replace(甲名, '\u0001').replace(乙名, 甲名).replace('\u0001', 乙名);
台.判('把两颗的顺序对调，第二条那一档就红',
  !((对调.indexOf(甲名) > 0) && (对调.indexOf(甲名) < 对调.indexOf(乙名))));
const 改话 = 窗口.replace(壳段, 壳段.replace(壳文, 壳文 + '（改了个字）'));
const 改后句 = (改话.match(/记一笔\("[^"]+",\s*"([^"]+)"\)/) || [])[1] || '';
台.判('把壳里那句改一个字，第四条那一条就红', 改后句 !== '' && 改后句 !== 原文);
const 没登记 = 随行.replace(/tauri-plugin-single-instance[\s\S]{0,40}/, '没这一行 ');
台.判('把随行册那一行拿掉，第一条那一条就红',
  !new RegExp('tauri-plugin-single-instance\\s*' + 版本.replace(/\./g, '\\.')).test(没登记));
const 少一步 = 那一颗.replace(/let _ = 窗\.set_focus\(\);/, '');
台.判('把拿光标那一步拆掉，第五条那一条就红', !(/unminimize\(\)/.test(少一步) && /\.show\(\)/.test(少一步) && /set_focus\(\)/.test(少一步)));

台.收尾();
