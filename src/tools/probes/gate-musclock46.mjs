/* ============================================================
   gate-musclock46.mjs · 插件分离第 4 批 4.2：播放位置归主程序（填的与读必须是同一颗钟）
   ------------------------------------------------------------
     node src/tools/probes/gate-musclock46.mjs
   管的是三件事：
     ① 那一颗钟（第几毫秒 + 那一刻的墙钟 + 倍速）整张页只有主程序那一份，住在 src/_shared/sh-mus.js；
     ② 音乐遥控器只往这一颗里改字段、绝不换对象 —— 而且它自己那两条路（系统播放器 SMTC、手动选的音频）
        都得往里填：从前本地那棵 <audio> 只写卡片不写钟，卡片读 audio、词格读钟，就是"两份位置"的真实现场；
     ③ 词格读的就是同一颗：跟得上就跟，那一家整个不在（钟一次都没报过真值）就自己按文件里的时间戳播完，
        全程不弹一句错（第 4 批验收那一条）；只有在"那一家在、歌没在放"时才说一句老实话。
   怎么算真量：三头都从原文切 —— 钟是 sh-mus.js 里那颗 MusClock 整颗端进来，填的一头切插件的 Music.tell()，
   读的一头切词格的 mus()/有时钟()/跟着()/nowMs()/play()/stopPlay()/setFollow()/playLabel()，
   外面只假造 audio 元素、假造 performance 与 rAF、假造 timeline。所以跑的确实是这三段真码。
   反证三件钉住这台不是橡皮章：摘掉 tell() 里补的那一段 → 手动音频那一路立刻退回旧位置；
   把词格"报过真值才弹那句"这一道判断摘掉 → 那一家不在时也会弹错；把钟换成一份复制 → 两边读的不是同一颗，当场红。
   ============================================================ */
import { rd, 切, 切方法, 记账 } from './lib-slice.mjs';

const 台 = 记账('gate-musclock46');
const 钟源 = rd('src/_shared/sh-mus.js');
const 包源 = rd('data/plugins/music-remote/main.js');
const 词源 = rd('src/_wnw/src/w18-lyric.js');

/* ---------- 一、主程序那一份钟（整颗端进来，不抄第二份算式） ---------- */
function 新钟(){
  return new Function(切(钟源, 'MusClock') + '\nreturn MusClock;')();
}
台.题('一、那一份钟：三样都在，插值与遥控器那一头同一套算式');
{
  const M = 新钟();
  台.判('时钟里那三样齐着（pos 第几毫秒 / at 那一刻的墙钟 / rate 倍速）',
    'pos' in M && 'at' in M && 'rate' in M && typeof M.set === 'function' && typeof M.now === 'function');
  M.set({ pos:10000, at:Date.now() - 1000, rate:1, status:'Playing', title:'甲', dur:0 });
  const 一倍 = M.now(), 一号 = M.rate, 一活 = M.live();
  M.set({ pos:10000, at:Date.now() - 1000, rate:2, status:'Playing', dur:0 });
  const 两倍 = M.now(), 倍号 = M.rate;
  M.set({ pos:20000, at:Date.now(), rate:1, status:'Paused', dur:0 });
  const 暂停 = M.now();
  台.判('在放才往前走、倍速照着 rate 走（墙钟过了一秒：rate 1 → ' + Math.round(一倍) + '，rate 2 → ' + Math.round(两倍) + '）',
    一号 === 1 && 倍号 === 2 && 一活 && 一倍 >= 11000 && 一倍 <= 11500 && 两倍 >= 12000 && 两倍 <= 12500,
    [一倍, 两倍].join(' / '));
  台.判('暂停了就报最后知道的那一格，不许自己瞎走（外15 第 1 条那一条规矩长在钟上）',
    暂停 === 20000 && !M.live(), 暂停);
  M.set({ pos:19900, at:Date.now() - 9000, rate:1, status:'Playing', dur:20000 });
  台.判('走到头夹在时长上，不许报出比这首歌还长的位置', M.now() === 20000, M.now());
}

/* ---------- 二、填的一头：插件那颗 tell() 真跑（两条路都要往里填） ---------- */
function 跑tell(钟, 自己){
  const 收 = [];
  const K = { mus: { set(s){ 收.push(s); 钟.set(s); } } };
  const 对 = new Function('MUS_VIEWS', 'K', 'return {' + 切方法(包源, '  tell(){') + '};')(
    [], { mus: K.mus });
  对.pump = () => {};
  对.update = () => {};
  Object.assign(对, 自己);
  对.tell();
  return { 收, 钟 };
}
台.题('二、音乐遥控器只改这一颗钟的字段；两条路（系统播放器、手动选的音频）都得填');
{
  const 钟 = 新钟();
  const 自己 = { pos:5000, at:123, rate:1.5, status:'Playing', title:'测试歌', artist:'某人', dur:300000 };
  跑tell(钟, 自己);
  台.判('系统播放器那一路：tell() 报的是"第几毫秒 + 墙钟 + 倍速"这三样，一个都不少',
    钟.pos === 5000 && 钟.at === 123 &&钟.rate === 1.5 && 钟.status === 'Playing', JSON.stringify(钟.pos) + ' / ' + 钟.rate);
}
{
  const 钟 = 新钟();
  const 假audio = { currentTime:12.34, paused:false, playbackRate:1.5, duration:200 };
  跑tell(钟, { pos:0, at:0, rate:1, status:'', title:'手动那首', artist:'', dur:0, audio:假audio });
  台.判('手动选音频那一路也填进同一颗钟（本轮补的那一段）：卡片读 audio，钟里也得是 audio 那一毫秒',
    钟.pos === 12340 && 钟.status === 'Playing' && 钟.rate === 1.5 && 钟.dur === 200000,
    JSON.stringify({ pos:钟.pos, status:钟.status, rate:钟.rate, dur:钟.dur }));
  假audio.paused = true;
  跑tell(钟, { pos:12340, at:0, rate:1.5, status:'', title:'手动那首', artist:'', dur:200000, audio:假audio });
  台.判('audio 停了钟就报 Paused（不许还挂着 Playing 让词格空跑）', 钟.status === 'Paused' && !钟.live(), 钟.status);
}
{
  const 摘掉 = 切方法(包源, '  tell(){').replace(/if\(this\.audio\)\{[\s\S]*?\n    \}\n/, '');
  const 对 = new Function('MUS_VIEWS', 'K', 'return {' + 摘掉 + '};')([], { mus:{ set(){ } } });
  const 钟 = 新钟(); 对.pump = () => {}; 对.audio = { currentTime:12.34, paused:false, playbackRate:1, duration:0 };
  对.pos = 0; 对.at = 0; 对.rate = 1; 对.status = ''; 对.title = ''; 对.artist = ''; 对.dur = 0;
  对.tell();
  台.判('把那段补上的话摘掉，手动那一路立刻退回旧位置 0 —— 说明上面那两条测的确实是那一段',
    钟.pos === 0 && 钟.status === '', 钟.pos + ' / ' + 钟.status);
}
{
  const 装 = rd('src/_shared/sh-load.js');
  台.判('装载器原样把这一颗递出去（ctx.mus = MusClock），不包一层、不克隆',
    /if\(typeof MusClock !== 'undefined'\) ctx\.mus = MusClock;/.test(装)
    && !/ctx\.mus\s*=\s*\{/.test(装) && !/Object\.assign\([^)]*ctx\.mus/.test(装));
  台.判('插件那一头只写 K.mus.set(...)，全仓没有第二处把 ctx.mus 换成别的对象',
    (包源.match(/K\.mus\.set\(/g) || []).length === 1 && !/K\.mus\s*=/.test(包源)
    && (rd('src/_shared/sh-load.js').match(/ctx\.mus\s*=/g) || []).length === 1);
  台.判('插件不认识页面那颗全局的名字（它只吃递进来的 ctx.mus，不自己抓 MusClock）',
    !/MusClock/.test(包源));
}

/* ---------- 三、读的一头：词格那八颗真码端进假播放器 ---------- */
const 八颗 = ['  mus(){', '  有时钟(){', '  跟着(){', '  nowMs(){', '  playLabel(){', '  play(){', '  stopPlay(){', '  setFollow(v){']
  .map(头 => 切方法(词源, 头));
function 词格(钟, 表){
  let 错 = [];
  let 表针 = 0;
  let 步 = null;
  const 假 = {
    performance: { now: () => 表针 },
    toast: (m) => { 错.push(String(m)); },
    requestAnimationFrame: (fn) => { 步 = fn; return 1; },
    cancelAnimationFrame: () => { 步 = null; },
    MusClock: 钟,
  };
  const 对 = new Function('MusClock', 'toast', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
    'return ({' + 八颗.join(',') + ', timeline(){ return __表; }, mark(){ __标.push(1); }, barRefresh(){} });')
    (假.MusClock, 假.toast, 假.performance, 假.requestAnimationFrame, 假.cancelAnimationFrame);
  Object.assign(对, { follow:false, playing:false, t0:0, cur:-1, fromMs:null, tl:null, raf:0, flat:[], marks:[], curRow:-1, playBtnEl:null });
  对.__表 = 表 || { end:10000 };
  对.timeline = () => 对.__表;
  对.mark = () => { 对.__标.push(1); };
  对.__标 = [];
  return { 对, 得错:() => 错.slice(), 清错:() => { 错 = []; }, 走一步:() => { if(步) 步(); }, 有步:() => !!步,
    拨表:(ms) => { 表针 = ms; } };
}
台.题('三、词格读的是同一颗；那一家整个不在就自己按时间戳播完，不弹错');
{
  const 钟 = 新钟(); 钟.set({ pos:8000, at:Date.now(), rate:1, status:'Playing', dur:0 });
  const H = 词格(钟, { end:10000 }), 格 = H.对;
  格.follow = true; H.拨表(500); 格.t0 = 500;
  台.判('钟活着：读的是它那一毫秒，不是自家那张表', 格.nowMs() >= 8000 && 格.跟着() && 格.有时钟(), 格.nowMs());
  钟.set({ pos:8000, at:Date.now(), rate:1, status:'Paused', dur:0 });
  台.判('钟暂停：报的是它冻结的那一格，词格不自己往前推', 格.nowMs() === 8000, 格.nowMs());
}
{
  const H = 词格(undefined, { end:10000 });
  H.对.follow = true;
  H.清错(); H.对.play();
  台.判('那一家整个没加载（页面上根本没有这颗钟）：点播放一句错都不弹，照样播起来',
    H.得错().length === 0 && H.对.playing, JSON.stringify(H.得错()));
  H.拨表(4000);
  台.判('这一趟走的是自家那张表（从入点起自己数），不是那颗不存在的钟给个 0',
    H.对.nowMs() > 0 && H.对.跟着() === false, H.对.nowMs());
  H.对.stopPlay();
  台.判('字样跟着说实话：这一档停下之后那颗钮写「模拟播放」，不许还写「跟遥控器播」',
    H.对.playLabel() === '模拟播放', H.对.playLabel());
}
{
  const H = 词格(新钟(), { end:10000 });
  H.对.follow = true;
  H.清错(); H.对.play();
  台.判('钟在、可一次真值都没报过（那一家加载了但没连上歌）：同样不弹错、走自家表',
    H.得错().length === 0 && H.对.playing, JSON.stringify(H.得错()));
  H.拨表(10300); H.走一步();
  台.判('自家表播到末格之后自己停（不空转），这一步 rAF 已经撤了',
    H.对.playing === false && !H.有步(), H.对.playing + ' / 步=' + H.有步());
}
{
  const 钟 = 新钟(); 钟.set({ pos:1000, at:Date.now(), rate:1, status:'Paused', dur:0 });
  const H = 词格(钟, { end:10000 });
  H.对.follow = true; H.清错(); H.对.play();
  台.判('那一家在、歌没在放：仍说那一句老实话并且不播（跟着的只会是冻结那一格，空跑不如说清）',
    H.得错().some(t => /没连上/.test(t)) && !H.对.playing, JSON.stringify(H.得错()));
  H.清错(); H.对.setFollow(false); H.对.setFollow(true);
  台.判('只是把「跟随」那颗拧开也一样：这一句只在真有钟报过的时候才说',
    H.得错().some(t => /没连上/.test(t)), JSON.stringify(H.得错()));
}
{
  const 钟 = 新钟(); 钟.set({ pos:8000, at:Date.now(), rate:1, status:'Playing', dur:0 });
  const H = 词格(钟, { end:10000 });
  H.对.follow = true; H.拨表(10500); H.对.play();
  const 标数 = H.对.__标.length; 走几趟(H);
  台.判('跟着钟播的那一趟过了末格也不自己停（停下归那一家说了算），自家表才停在 end+200',
    H.对.playing && H.对.__标.length > 标数, H.对.playing + ' / 标了 ' + H.对.__标.length + ' 次');
  H.对.stopPlay(); H.对.follow = false; H.拨表(10500); H.对.play(); const 二 = H.对.__标.length;
  H.拨表(21000); H.走一步();
  台.判('换成自家表之后（同一颗钟、同样这些毫秒数），末格 + 200 毫秒那一档就停，不许空转',
    H.对.playing === false && H.对.__标.length === 二 + 1, H.对.playing + ' / 标了 ' + H.对.__标.length + ' 次（起于 ' + 二 + '）');
}
function 走几趟(H){ for(let i = 0; i < 5; i++){ H.拨表(H.对.t0 + 1000 + i * 100); H.走一步(); } }
{
  /* "包一层"就是这份检查的靶子：把读的那一句换成"头一次摘一份快照、以后都读那份快照"，
     快照听不见钟后来报上来的位置 —— 那正是"填的和读的分成两份"会长出来的错。 */
  const 钟 = 新钟(); 钟.set({ pos:8000, at:Date.now() - 1000, rate:1, status:'Playing', dur:0 });
  const H = 词格(钟, { end:200000 }); H.对.follow = true;
  const 头 = H.对.nowMs();
  const 包一层 = 八颗.map(文 => 文.replace('this.mus().now()',
    '(this.__快照 || (this.__快照 = Object.assign({}, this.mus()))).now()'));
  const 副本 = new Function('MusClock', 'toast', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
    'return ({' + 包一层.join(',') + '});')(钟, () => {}, { now: () => 0 }, () => 1, () => {});
  Object.assign(副本, { follow:true, 有时钟:() => true, 跟着:() => true, mus:() => 钟 });
  const 副头 = 副本.nowMs();
  钟.set({ pos:60000, at:Date.now(), rate:1, status:'Playing', dur:0 });
  const 尾 = H.对.nowMs();
  钟.set({ pos:99000, at:Date.now(), rate:1, status:'Playing', dur:0 });
  const 副尾 = 副本.nowMs();
  台.判('同一颗钟才跟得上：真读的那一份随钟走（' + Math.round(头) + ' → ' + Math.round(尾) + '），'
    + '包一层副本的那一份听不见后面两次报上来的位置（' + Math.round(副头) + ' → ' + Math.round(副尾) + '）',
    尾 >= 60000 && 副尾 < 20000 && 副尾 >= 8000, [头, 尾, 副头, 副尾].map(Math.round).join(' / '));
}

台.题('四、界面上那一遍还是你的（这台不开浏览器、不碰你正开着那一家）');
台.数('真机要点的那几条', '删掉音乐遥控器再开机 → 词格按「模拟播放」能播完不弹错；'
  + '加载着但没放歌 → 点跟播弹那一句老实话；手动选一首音频 → 词格跟着卡片同一步走');

台.收尾();
