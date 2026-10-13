/* 丁组第一步自检（外29 第 55 轮）：预设纹理整批撤 + 纹理强度那一串设置整批撤。
   作者的原话：「删除当前所有预设纹理，删除纹理强度系列设置」。
   这一台两半：函数层把 sh-look.js 里那几件真东西（CUSTOM_TEX / lookTexSet / lookTex / lookTexName / LOOK_DEFAULT）
   原样搬进虚拟机跑（第 56~57 轮纹理名单改吃图片库，lookTexGroups 那条没人走了、跟着撤，这里也不再切它）；
   其余按源码现场数，数的是「还剩几处提到强度和内置那 11 张」—— 不是拿记忆当证据。 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileURLToPath as __url } from 'node:url';
const __树根 = __url(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');   /* 仓根从这份脚本自己的位置算，不写死本机路径 */

const ROOT = __树根 + '/';
const rd = p => fs.readFileSync(ROOT + p, 'utf8');
const LOOK = rd('src/_shared/sh-look.js');
const LIB = rd('src/_fd/src/fd3-lib.js');
const SHL = rd('src/_fd/src/fd3-shell.js');
const UI = rd('src/_fd/src/fd4-builtin.js');
/* 外观方案那一份是程序开机从存档里长出来的（data\looks.yaml）：新克隆的一棵上还没有它，
   这一台量的就是「磁盘那一份里长什么样」，没有就明说量不出来，不拿空串当证据。 */
if(!fs.existsSync(ROOT + 'data/looks.yaml')){
  console.log('缺数据：这台机器上还没有 data\\looks.yaml（程序第一次跑过才会长出来）—— 这一台量不出来');
  process.exit(77);
}
const YAML = rd('data/looks.yaml');
const ALL = { 'src/_shared/sh-look.js':LOOK, 'src/_fd/src/fd3-lib.js':LIB, 'src/_fd/src/fd3-shell.js':SHL, 'src/_fd/src/fd4-builtin.js':UI };
let pass = 0, fail = 0;
const ok = (n, c, extra) => { if(c){ pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (extra ? ' · ' + extra : '')); } };
const hits = re => Object.entries(ALL).filter(([, s]) => re.test(s)).map(([f]) => f);

/* ---------- 一、内置那 11 张：一个名字都不许再当档摆出来 ---------- */
const PRESETS = ['宣纸', '牛皮纸', '羊皮纸', '水纹纸', '道林卡纸', '亚麻', '帆布', '斜纹', '粗呢', '灯芯绒', '毛毡'];
const stillIn = PRESETS.filter(n => new RegExp("name:['\"]" + n).test(LOOK));
ok('1 外观层里内置那 11 张的定义一个不剩（宣纸 / 牛皮纸 / 羊皮纸 / 水纹纸 / 道林卡纸 / 亚麻 / 帆布 / 斜纹 / 粗呢 / 灯芯绒 / 毛毡）',
  stillIn.length === 0, '还剩：' + stillIn.join(','));
ok('2 外观层那份源码里「纸质 / 布质」那两个组名也不再当纹理组摆出来',
  !/g:'纸质'/.test(LOOK) && !/g:'布质'/.test(LOOK));
const lt = Object.entries(ALL).filter(([, s]) => /LOOK_TEXTURES/.test(s));
ok('3 LOOK_TEXTURES 这个名字四份源码里出现 0 次（' + lt.map(([f]) => f).join(',') + '）', lt.length === 0);
const mt = Object.entries(ALL).filter(([, s]) => /LOOK_TEX_MAX/.test(s));
ok('4 LOOK_TEX_MAX（强度顶 40 那道闸）出现 0 次', mt.length === 0, mt.map(([f]) => f).join(','));

/* ---------- 二、强度那一串：读、写、界面上那一根、恢复出厂那一句 ---------- */
const tn = Object.entries(ALL).filter(([, s]) => /texOn\s*[=:]|c\.texOn|Math\.round\(\+c\.texOn/.test(s));
ok('5 texOn 这一栏不再读也不再写（只剩说明里那两处提到「整串撤了」）',
  tn.length === 0, tn.map(([f]) => f).join(','));
ok('6 界面上那一根滑杆没了：fd4-builtin 里没有 row(\'强度\' 这一行', !/row\('强度'/.test(UI));
ok('7 恢复出厂那一路三处话都说「两档圆角 + 卡片间距」（弹框正文、按钮悬停说明、那一行小字），没有一处还留着 set(强度 这一笔',
  /卡片圆角 ' \+ f\.卡片圆角 \+ ' 像素、控件圆角 /.test(UI) && /两档圆角和卡片间距回到出厂那一档/.test(UI)
  && /两档圆角回到出厂那一档、卡片间距回到自动/.test(UI)
  && /set\('间距', f\.间距, false\)/.test(UI) && !/set\('强度'/.test(UI) && !/f\.强度/.test(UI));
ok('8 文件那一份（data\\looks.yaml）里 强度 那一栏 0 行、说明里那句「0~40」也撤了',
  !/^  强度:/m.test(YAML) && !/强度/.test(YAML));
ok('9 上屏那一串：纹理层的不透明度只剩「没挑图 = 0」和「原图进 = 1 / 去色 = LOOK_TEX_GRAY」这几个写法，没有 strength 参与',
  /v\['--tex-opacity'\] = 0;/.test(LOOK)
  && /v\['--tex-opacity'\] = e\.texGray \? LOOK_TEX_GRAY : 1;/.test(LOOK)
  && (LOOK.match(/v\['--tex-opacity'\]/g) || []).length === 2
  && !/e\.strength/.test(LOOK) && !/strength/.test(LOOK));
ok('10 方案里挑上的是「无」以外那张时，认不认得只看图在不在（不再夹一个数）',
  /if\(e\.tex\)\{[\s\S]{0,200}--tex-opacity'\] = e\.texGray \? LOOK_TEX_GRAY : 1/.test(LOOK));

/* ---------- 三、函数层：拿真函数跑名单 ---------- */
function braceSlice(src, marker, open = '{', close = '}'){
  const i = src.indexOf(marker); if(i < 0) throw new Error('找不到 ' + marker);
  let d = 0, j = src.indexOf(open, i);
  for(let k = j; k < src.length; k++){ if(src[k] === open) d++; else if(src[k] === close){ d--; if(!d) return src.slice(i, k + 1); } }
  throw new Error(marker + ' 没配平');
}
const pieces = ['let CUSTOM_TEX = [];', braceSlice(LOOK, 'function lookTexSet'), braceSlice(LOOK, 'function lookTex('),
  braceSlice(LOOK, 'function lookTexName('),
  /^const LOOK_DEFAULT = \{[^}]*\}/m.exec(LOOK)[0]];
const sb = { console };
vm.createContext(sb);
vm.runInContext(pieces.join('\n') + '\nthis.X = { lookTexSet, lookTex, lookTexName, LOOK_DEFAULT };', sb);
const X = sb.X;
ok('11 函数层真跑：一张也没喂过的时候，内置那批的名字一个都认不到（lookTex("linen") / lookTexName("亚麻") 都交回 null）—— 那一串名单这一趟是空的',
  X.lookTex('linen') === null && X.lookTexName('亚麻') === null);
vm.runInContext('lookTexSet([{k:"shuimo",name:"水磨石"},{k:"",name:"缺键的不算"}])', sb);
ok('12 函数层真跑：递进去两条，缺键那一条被 lookTexSet 那道滤吃掉（认不到），水磨石按名字和按键都认得到',
  X.lookTexName('水磨石') !== null && X.lookTex('shuimo').name === '水磨石'
  && X.lookTex('') === null && X.lookTexName('缺键的不算') === null);
ok('13 函数层真跑：自己导的那张按名字认得到（从前只有内置那批认得到，那一手早就修了）',
  !!X.lookTexName('水磨石') && X.lookTex('shuimo').name === '水磨石');
const old = ['宣纸', '亚麻', '毛毡'].map(n => !!X.lookTexName(n));
ok('14 函数层真跑：旧方案里写着「宣纸 / 亚麻 / 毛毡」那种值现在一律认不到（' + old.join(',') + '）—— 认不到就落回「无」，不报错也不铺半张图',
  old.every(x => x === false));
ok('15 默认值那一份里没留 texOn：LOOK_DEFAULT = ' + JSON.stringify(X.LOOK_DEFAULT), !('texOn' in X.LOOK_DEFAULT));

/* ---------- 四、旧文件里那一栏还在怎么办（读到的那一刻不能炸） ---------- */
ok('16 读方案那一路对认不到的纹理名有兜底：lookTexByName(...) || {} 那一句还在（缺键落回空串，不抛）',
  /\(lookTexByName\(tx\) \|\| \{\}\)\.k \|\| ''/.test(LIB));
const 栏串 = (/^\s*\['配色',[^\]]*\]/m.exec(LIB) || [''])[0];
const 栏数 = (栏串.match(/'[^']*'/g) || []).length;
ok('17 写方案那一路不再往文件里塞 强度 这一栏（表头那一串现在 ' + 栏数 + ' 栏：外31 二组添了 字重，外34 图12 又添了 明暗，逐字比对过：' +
   (/强度/.test(栏串) ? '还写着它' : '没有它') + '）',
  栏数 === 15 && !/强度/.test(栏串) && !/强度:String\(/.test(LIB) && !/'强度'/.test(LIB));

ok('18 这两条跟着撤干净（都是被这一批断了来路的）：lookTexGroups 全仓 ' +
   (LOOK + LIB + SHL + UI).split('lookTexGroups').length + ' 处提到（1 就是只剩说明里那一句）、texReady ' +
   (LOOK + LIB + SHL + UI).split('texReady').length + ' 处',
  (LOOK + LIB + SHL + UI).split('lookTexGroups').length === 2 && (LOOK + LIB + SHL + UI).split('texReady').length === 1);

/* ---------- 五、2026-10-08 作者的话：「说了纹理全删」—— 残片一头不许留（上一轮我只撤了名单，图和文件都留着） ----------
   数的是「代码里还在不在走那一条路」，认的是带引号的那一种写法（源码里那些「从前这儿有一条 /_tex」之类的话是留给人看的来路记录，
   程序读不到它们，所以这一台不按「这两个字出现过没有」判 —— 那样判会把说明也判成毛病，将来谁也不敢写注释）。 */
const 壳扫 = rd('src/_tauri/src/core/icon_scan.rs');
const 壳信 = rd('src/_tauri/src/tauri_bind/info_cmds.rs');
const 壳表 = rd('src/_tauri/src/core/data_path.rs');
const SERVE = rd('src/_fd/fd-serve.mjs');
const 桥 = rd('src/_tauri/ui/fd-bridge.js');
const ICO = rd('src/_shared/sh-ico.js');
const 六份 = { 'src\\_tauri\\src\\core\\icon_scan.rs':壳扫, 'src\\_tauri\\src\\tauri_bind\\info_cmds.rs':壳信,
  'src\\_tauri\\src\\core\\data_path.rs':壳表, 'src\\_fd\\fd-serve.mjs':SERVE, 'src\\_tauri\\ui\\fd-bridge.js':桥,
  'src\\_shared\\sh-ico.js':ICO, 'src\\_fd\\src\\fd3-lib.js':LIB, 'src\\_shared\\sh-look.js':LOOK };
const 码名 = ["'textures.yaml'", "'textures'", 'TEX_FILE', 'DATA_TEX_DIR', 'texReq', 'TEX_EXT', "'/_tex'", "'textures-'"];
const 还在 = [];
for(const n of 码名) for(const [f, s] of Object.entries(六份)) if(s.includes(n)) 还在.push(n + '（在 ' + f + '）');
ok('19 那七个旧写法在这八份源码里一个不剩（' + 码名.join(' / ') + '）—— 现在还剩 ' + 还在.length + ' 处' + (还在.length ? '：' + 还在.join('、') : ''),
  还在.length === 0);
const 路 = ['icons/textures', 'src/pack/icons/textures', 'data/textures.yaml', 'data/textures', 'src/_build/tex-gen.mjs'];
const 存 = 路.filter(p => fs.existsSync(ROOT + p));
ok('20 盘上那五样也真没了（icons\\textures 那 11 张、出厂层那一份副本、data\\textures.yaml、data\\textures 那一格、造那 11 张图的脚本）' +
   ' —— 还在的：' + (存.length ? 存.join(',') : '一个也没有'), 存.length === 0);
const 图剩 = fs.readdirSync(ROOT + 'icons').filter(n => n.indexOf('textures') >= 0);
ok('21 图标那一格里再也没有叫 textures 的东西（数到 ' + (图剩.join(',') || '一个也没有') + '），出厂那一份子目录也整个不在',
  图剩.length === 0 && !fs.existsSync(ROOT + 'src/pack/icons/textures'));
const 张数 = fs.readdirSync(ROOT + 'icons').filter(n => /\.(svg|png|jpg|jpeg|webp|gif)$/i.test(n)).length;
ok('22 图标那一层还在使（顶层 ' + 张数 + ' 张，界面上那些正经图标一张没被牵连），只是往里那一层现在空的或者根本没有',
  张数 > 60 && !fs.existsSync(ROOT + 'icons/textures'));
ok('23 两头扫图标都只剩一条数据层那一路：壳里 收一格(图片库那一格, "images-", true)、开发那台 take(..., images-, /images/, true)，' +
   '两头都不再拼 textures- 那一个前缀（数到 ' + ((壳扫 + 壳信 + SERVE + ICO).match(/textures-/g) || []).length + ' 处）',
  /收一格\(&mut 表, &Path::new\(数\)\.join\("images"\), "images-", true/.test(壳信)
  && /take\(DATA_IMG_DIR, 'images-', '\/images\/', true\)/.test(SERVE)
  && !/textures-/.test(壳扫 + 壳信) && !/textures-/.test(SERVE) && !/textures-/.test(ICO));
const 图身 = (/function imgUrl\(t\)\{[\s\S]*?\n\}/.exec(LIB) || [''])[0];
ok('24 地址那一路只问图片库那一头（旧那份清单的图留在原地、两头都问那一句已经作废）：' +
   ((图身.match(/Ico\.url\([^)]*\)/g) || []).join(' + ') || '一句也没有'),
  (图身.match(/Ico\.url\(/g) || []).length === 1 && /Ico\.url\('images-' \+ k\)/.test(图身) && !/textures-/.test(图身));
const 外身 = (/  url\(k\)\{[\s\S]*?\n  \},/.exec(LOOK) || [''])[0];
ok('25 外观层那一句也一样只问 images-（一张平铺图只有一条来路）：问 ' + (外身.match(/Ico\.url\(/g) || []).length + ' 回头',
  /Ico\.url\('images-' \+ key\)/.test(外身) && !/textures-/.test(外身));
const 开身 = (/async boot\(\)\{[\s\S]*?\n  \},/.exec(LIB) || [''])[0];
ok('26 开机那一路不再搬旧清单：ImgLib.boot 的函数体里 fetchRaw 只叫 ' + ((开身.match(/fetchRaw/g) || []).length) +
   ' 回（认 images.yaml 那一句），TEX_FILE 那一个 const 整个不在',
  !/TEX_FILE/.test(LIB) && (开身.match(/fetchRaw/g) || []).length === 1);
const 抽名 = (文, 样) => ((样.exec(文) || ['', ''])[1].match(/["'][^"']+["']/g) || []).map(s => s.slice(1, -1));
const 壳名 = 抽名(壳表, /pub const 库名单: \[&str; \d+\] = \[([\s\S]*?)\];/);
const 服名 = 抽名(SERVE, /const LIB_NAMES = \[([^\]]*)\]/);
ok('27 开发那台服务器的写名单和壳里那一条现在一份不差（' + 壳名.join(',') + '）—— 从前那一份写着 textures.yaml、不收 images.yaml，' +
   '图库清单在开发浏览器里存不下去、在程序里存得下去，两头各一套',
  壳名.join(',') === 服名.join(',') && !壳名.includes('textures.yaml') && 壳名.includes('images.yaml'));
ok('28 图标索引那台生成脚本里也不再拼 textures- 那一串（texDesc 那一段整块撤了 —— 它切的 LOOK_TEXTURES 早就没了，只是一直没人跑它）',
  !/function texDesc/.test(rd('src/_build/ico-index.mjs'))
  && !rd('src/_build/ico-index.mjs').includes("m['textures-'")
  && !rd('src/_build/ico-index.mjs').includes('纹理平铺图 ·')),

console.log('\n' + pass + ' 过 ' + fail + ' 不过');
process.exit(fail ? 1 : 0);
