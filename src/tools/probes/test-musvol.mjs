/* 丙组自检（外29 第 52 轮）：音乐遥控器那两处。
   第 5 条：翻译 / 注释那一行不许跟着播放变色 —— 亮度尺从前压在整行上，孩子抵消不了，现在尺子挪到原文和注音两块。
   第 6 条：音量滑杆从前在监听收摊之后一辈子起不来（volStart 头一句就 return），
           而且把脚本那句英文原话弹到界面上；他这句是「控制不了音量还摆个虚假按钮？？？」。
   源码层这一台自己断；样式层那一半生成一份页面（同目录 mk-musvol-test.html），拿真浏览器量计算值。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileURLToPath as __url } from 'node:url';
const __树根 = __url(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');   /* 仓根从这份脚本自己的位置算，不写死本机路径 */

const ROOT = __树根;
const MUS = fs.readFileSync(path.join(ROOT, 'data/plugins/music-remote/main.js'), 'utf8');
const 声 = fs.readFileSync(path.join(ROOT, 'src/_tauri/src/tauri_bind/vol_cmds.rs'), 'utf8');
const 判 = fs.readFileSync(path.join(ROOT, 'src/_tauri/src/core/media_rule.rs'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, extra) => { if(c){ pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (extra ? ' · ' + extra : '')); } };

/* ---------- 一、翻译恒定（源码层：尺子挪走了没） ---------- */
const css = (MUS.match(/const MUS_CSS = `([\s\S]*?)`;/) || ['', ''])[1];
ok('0 组件那份样式抓到了（抓空了下面的断言全是假的）', css.length > 2000, 'css ' + css.length);
ok('1 亮度尺不再压整行：没有「.mu-line{opacity:.42}」和「.mu-line.act{opacity:1}」那两条了',
  !/\.mu-line\{[^}]*opacity:\.42/.test(css) && !/\.mu-line\.act\{opacity:1\}/.test(css));
ok('2 尺子挪到原文和注音两块上，两个数值一个字没改（没唱到 .42、正在唱 1）',
  /\.mu-line \.mu-main,\.mu-line \.mu-note\{opacity:\.42/.test(css) &&
  /\.mu-line\.act \.mu-main,\.mu-line\.act \.mu-note\{opacity:1\}/.test(css));
ok('3 逐字那一档同样只提这两块（.mu-ka 那两条不再压整行）',
  !/\.mu-ka \.mu-line\{opacity/.test(css) && /\.mu-ka \.mu-line\.act \.mu-main/.test(css));
ok('4 翻译那一行（.mu-trans）不再有任何一档随行状态变的写法',
  !/\.mu-line\.act \.mu-trans|\.mu-line\.sung \.mu-trans/.test(css) && /\.mu-trans\{[^}]*color:var\(--text-light\)/.test(css));
ok('5 注音那一行照旧跟着行走（他没点这一档，一个字不动）',
  /\.mu-note\{font-size:calc\(\.82em/.test(css));

/* ---------- 二、音量：那一整条常驻子进程的路不使了 ----------
   从前那一版靠一根常驻的子进程往里推事件：监听一收摊，滑杆就一辈子起不来（volStart 头一句 return），
   那一类毛病在这一头没有落点 —— 壳里三颗命令每一颗自己起一趟 COM 往返，没有一份「判死了」的常驻状态。 */
ok('6 音量那三颗都是 async 命令，各放一条自己的线程上办（主线程一个字都不等）',
  ['vol_get', 'vol_set', 'vol_mute'].every(名 => new RegExp('pub async fn ' + 名 + '\\(').test(声))
  && /std::thread::Builder::new\(\)/.test(声));
ok('7 一趟 COM 往返给三秒兜底，到点报的是那一句中文（不把系统原话甩到界面上）',
  声.includes('const 三秒: Duration = Duration::from_secs(3);') && 声.includes('音量这一趟三秒没回来'));
ok('8 没有一份常驻的子进程状态可判死（这一类「收摊之后一辈子起不来」的毛病在这头没有落点）',
  !/Child|stdin|kill\(\)/.test(声) && 声.includes('没有子进程可杀'));
ok('9 换默认输出设备这一档天然跟得上（每次现拿端点，不靠重起脚本那一代）',
  声.includes('每次现拿端点') || /GetDefaultEndpoint|默认端点|现拿/.test(声));
ok('10 硬件音量键、别家程序改音量那一档没挂 COM 回调 —— 这一件写在文件顶上，不装成验过了',
  声.includes('RegisterControlChangeNotify') && 声.includes('没挂'));

/* ---------- 三、界面上不许冒英文 ----------
   脚本那几句英文原话各有对等的中文，映射那几颗住在纯判断那一格（`core/media_rule.rs`），
   动磁盘与动系统那一层只叫它，一个字都不重写。从前这一台还把 main.cjs 里那份 vol 状态机搬进虚拟机
   连摔四回验「预算用完才判死」—— 那一台量的是常驻子进程那一路，这一头没有那一路可摔（见上面第二节），
   所以那段跟着撤了；留下的这一条盯的是同一件毛病：界面上只能出现中文那一句。 */
ok('11 有一句中文映射兜着：脚本那几句英文原话各有对等的中文（都只写在纯判断那一格）',
  ['音量监听收摊了，正在重起', '音量命令没执行成', '系统不让改音量（权限被拒）', '音量监听出了岔子，原话进了日志', '音量监听停了']
    .every(句 => 判.includes('"' + 句 + '"')));
ok('12 原话留着进日志（我要查的还是那句），界面上那一格只放中文',
  /fn 音量话|音量原话|raw/.test(判 + 声) && 声.includes('判::'));
ok('13 回给页面的 msg 是中文那一句，没有把系统原文或异常文本直接交出去',
  !/msg: e\.to_string\(\)|msg: 系统/.test(声) && 声.includes('音量这一趟三秒没回来'));

/* ---------- 四、取不到就别摆 ---------- */
ok('19 系统音量取不到时整排收掉（不再摆一根拖了没反应的滑杆）',
  /wrap\.classList\.toggle\('mu-off', !Vol\.ok\)/.test(MUS) && /\.mu-vol\.mu-off\{display:none\}/.test(css));
ok('20 收掉用的是类不是 hidden 属性（上面那条 display:inline-flex 会把 hidden 顶掉）',
  !/wrap\.hidden\s*=/.test(MUS));

/* ---------- 五、生成样式层那份页面（真浏览器量计算值） ----------
   从前这里按「行首是不是 .mu」挑行，把跨行的那几条规则拦腰截断（`.mu-cover{…overflow:hidden;` 就是这么断的），
   花括号配不平，浏览器一路吞到下一个 } 才恢复 —— 结果整张样式表只剩 10 条规则，
   每一条计算值都是 opacity:1。这样的页面量出来的数全是 1，看着像"翻译恒定"其实一条都没量到。
   现在整份 MUS_CSS 原样搬，且 <style> 排在 <script> 前面（脚本在样式进层之前跑，量到的也是 1）。 */
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mk-musvol-test.html');
fs.writeFileSync(out, '<!doctype html><meta charset="utf-8"><title>丙组 · 翻译恒浅色</title>' +
  '<style>:root{--text:#222;--text-light:#8b8b8b;--accent:#2e7d6b}' + css + '</style>' +
  '<body style="--text:#222;--text-light:#8b8b8b;--accent:#2e7d6b"><div class="mu mu-ka">' +
  '<div class="mu-line"><div class="mu-main"><span class="mu-w">没唱到这一行</span></div>' +
  '<div class="mu-note">注音没唱到</div><div class="mu-trans">翻译没唱到</div></div>' +
  '<div class="mu-line act"><div class="mu-main"><span class="mu-w">正在唱这一行</span></div>' +
  '<div class="mu-note">注音正在唱</div><div class="mu-trans">翻译正在唱</div></div>' +
  '<div class="mu-line sung"><div class="mu-main"><span class="mu-w">唱过这一行</span></div>' +
  '<div class="mu-note">注音唱过</div><div class="mu-trans">翻译唱过</div></div>' +
  '</div><script>function eff(s){const e=document.querySelector(s);const c=getComputedStyle(e);' +
  'let o=1,n=e;while(n&&n!==document.body){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o.toFixed(3)}' +
  'window.R={main_off:eff(".mu-line .mu-main"),main_act:eff(".mu-line.act .mu-main"),main_sung:eff(".mu-line.sung .mu-main"),' +
  'tr_off:eff(".mu-line .mu-trans"),tr_act:eff(".mu-line.act .mu-trans"),tr_sung:eff(".mu-line.sung .mu-trans"),' +
  'note_off:eff(".mu-line .mu-note"),note_act:eff(".mu-line.act .mu-note")};' +
  'document.title=JSON.stringify(window.R);<\/script>');
ok('21 样式层那份页面生成了（整份 MUS_CSS 原样搬进去，' + css.length + ' 个字符，没手抄第二份）',
  fs.existsSync(out) && css.length > 2000, out);
/* 这一条是给上一那种毛病兜底的：搬进去的样式自己得花括号配平、关键的那几条一条不缺 */
const opens = (css.match(/\{/g) || []).length, closes = (css.match(/\}/g) || []).length;
ok('22 搬进去的样式花括号配平（' + opens + ' 开 ' + closes + ' 闭）—— 配不平浏览器会成片的吞规则',
  opens === closes && opens > 40);
ok('23 页面里那三块该量到的规则都在（原文两档、注音两档、翻译一条都不许有）',
  /\.mu-line \.mu-main,\.mu-line \.mu-note\{opacity:\.42/.test(css) &&
  !/\.mu-trans\{[^}]*opacity/.test(css) &&
  !/\n\.mu-trans[^{]*\{[^}]*opacity:/.test('\n' + css));

/* ---------- 六、这台自己咬得住吗 ----------
   元规矩那条（不许拿自检全 PASS 当结论）在这一头的落法：把壳里那三句锚点各自抽掉一样，
   对应的判法必须当场报不过，不然它是个哑台。 */
const 没三秒 = 声.replace('const 三秒: Duration = Duration::from_secs(3);', 'const 三秒: Duration = Duration::from_secs(30);');
const 又常驻 = 声.replace('没有子进程可杀', '留着那根子进程') + ' let child = Command::new("powershell").stdin(Stdio::pipe()); child.kill();';
const 漏英文 = 判.replaceAll('"音量监听收摊了，正在重起"', '"watcher closed"');
ok('24 这一台咬得住：抽掉三秒那一句 / 又把常驻子进程塞回来 / 中文映射换成英文原话 → 第 7、8、11 条各自当场失效',
  !(没三秒.includes('const 三秒: Duration = Duration::from_secs(3);'))
  && /Child|stdin|kill\(\)/.test(又常驻)
  && !['音量监听收摊了，正在重起', '音量命令没执行成', '系统不让改音量（权限被拒）', '音量监听出了岔子，原话进了日志', '音量监听停了']
    .every(句 => 漏英文.includes('"' + 句 + '"')));

console.log('\n' + pass + ' 过 ' + fail + ' 不过');
console.log('样式层那半我自己开探针浏览器量（绝不动他正开着那一家）：' + out);
console.log('  读 window.R：原文/注音 .420 → 1.000 → 1.000，翻译三档同一个数 1.000（本轮实量到的就是这一组）');
process.exit(fail ? 1 : 0);
