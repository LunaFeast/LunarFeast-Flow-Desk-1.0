/* ============================================================
   klog-ports46.mjs · 量测台：本机 127.0.0.1 上此刻谁在听、哪些端口不是 Flow-Desk 自己占的
   ------------------------------------------------------------
   为什么要有这一台（issue #62 / #63 / #64 / #66 那四条说的是同一件：本地服务端口撞车）：
   那四条报的都是**别人的**服务先把 127.0.0.1 上那一个端口占了，撞的一方只能把端口让出去。
   让之前得先看清现场 —— 所以这一台只量、只报，不改判据、不硬钉数字（钉死了每台机器都不一样）。
     node src/tools/probes/klog-ports46.mjs            看这一轮现场
   Flow-Desk 自己往本机听的只有开发期那两台（页面服务 8791、改字改图标那一屏 8792，都只听 127.0.0.1）；
   装出去的那一枚不开任何本地端口 —— 那一条钉在 gate-single46 第二节，不在这一台里重复。
   ============================================================ */
import { execFileSync } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';

const FD默认 = { 8791: '页面服务那台（src/_fd/fd-serve.mjs）', 8792: '改字改图标那一屏（src/_build/text-icon.mjs）' };
const 系统常客的进程名 = /^(svchost|System|services|lsass|wininit|spoolsv|taskhostw|SearchHost|RuntimeBroker|Qoder|node|python|java|postgres|mysqld|redis-server|mongod|memcached|ollama)/i;

function 在听() {
  const 出 = [];
  const 文 = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
  for (const 行 of 文.split(/\r?\n/)) {
    if (!/LISTENING/i.test(行)) continue;
    /* 那一列长这样：`  TCP    127.0.0.1:8794    0.0.0.0:0    LISTENING    6984` —— 协议那一格先跳掉，别拿 "TCP" 当地址 */
    const m = /\s(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)/i.exec(行);
    if (!m) continue;
    出.push({ 地址: m[1], 端口: +m[2], pid: +m[3] });
  }
  return 出;
}
function 进程名(pid) {
  try {
    const 文 = execFileSync('tasklist', ['/FI', 'PID eq ' + pid, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
    const m = /^"([^"]+)"/.exec(文.trim());
    return m ? m[1] : '?';
  } catch (e) { return '叫不到（与"没有这一号"是两件事）'; }
}
function 命令行(pid) {
  try {
    const 文 = execFileSync('wmic', ['process', 'where', 'processid=' + pid, 'get', 'CommandLine', '/VALUE'], { encoding: 'utf8' });
    const m = /CommandLine=(.*)/.exec(文.replace(/\r/g, ''));
    return m ? m[1].trim().slice(0, 160) : '';
  } catch (e) { return ''; }
}
const 能占 = (端口) => new Promise(解 => {
  const s = net.createServer();
  s.once('error', e => 解({ 端口, 中: e.code === 'EADDRINUSE' ? '占着' : '报 ' + e.code }));
  s.once('listening', () => s.close(() => 解({ 端口, 中: '空着' })));
  s.listen(端口, '127.0.0.1');
});
const 探http = (端口, 路) => new Promise(解 => {
  const 请 = http.get({ host: '127.0.0.1', port: 端口, path: 路, timeout: 1200 }, r => {
    let 文 = ''; r.on('data', c => 文 += c);
    r.on('end', () => 解({ 端口, 状态: r.statusCode, 类型: r.headers['content-type'] || '', 起头: 文.replace(/\s+/g, ' ').slice(0, 54) }));
  });
  请.on('error', e => 解({ 端口, 错: e.code }));
  请.on('timeout', () => { 请.destroy(); 解({ 端口, 错: 'TIMEOUT' }); });
});

const 听 = 在听();
if (!听.length) {
  /* 「一条都没parse出来」与「这台机器真没有在听的」是两件事：前者是这一台瞎了，不许报成后者 */
  console.error('停下来：netstat 叫得动却一行都认不出来 —— 那一本的列序或本机的输出格式变了，先修这一台再看现场');
  process.exit(1);
}
const 本机 = 听.filter(x => /^(127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\[::\])$/i.test(x.地址));
console.log('—— 本机方向在听的 TCP（127.0.0.1 直听 + 0.0.0.0 全听，共 ' + 本机.length + ' 个 / netstat 整本 ' + 听.length + ' 个）——');
const 名表 = new Map();
for (const x of 本机.sort((a, b) => a.端口 - b.端口)) {
  if (!名表.has(x.pid)) 名表.set(x.pid, 进程名(x.pid));
  const 是FD = FD默认[x.端口] ? '  ← ' + FD默认[x.端口] : '';
  console.log('  :' + x.端口 + ' (' + x.地址 + ')  pid ' + x.pid + ' ' + 名表.get(x.pid) + 是FD);
}

const FD的 = 本机.filter(x => FD默认[x.端口]);
console.log('\n—— Flow-Desk 自己占的那几个 ——');
console.log(FD的.length ? FD的.map(x => '  :' + x.端口 + ' ' + FD默认[x.端口]).join('\n') : '  （开发那两台此刻都没起 —— 这一轮FD一个本机端口都不占）');
const 起着的 = 本机.filter(x => x.端口 >= 8790 && x.端口 <= 8800 && !FD默认[x.端口]);
if (起着的.length) {
  console.log('  8790–8800 那一段还有别人在听（多半就是撞了的那几位）：' + 起着的.map(x => ':' + x.端口 + ' ' + 名表.get(x.pid) + '「' + 命令行(x.pid) + '」').join(' · '));
}

const 常见 = [6379, 27017, 27018, 3306, 5432, 9200, 11211, 11434, 5984, 9000, 8080, 8081, 3000, 5173, 4300, 45654, 7660];
console.log('\n—— 一批常见后端 / 开发服务端口在这一台机器上的现状 ——');
const 结 = [];
for (const p of 常见) 结.push(await 能占(p));
console.log(结.map(x => '  :' + x.端口 + ' ' + x.中).join('\n') + '\n  （「空着」是这一台自己占过又放了；「占着」才是要让出去的那一个）');

const 值得探 = [...new Set(本机.map(x => x.端口))].filter(p => p > 1024 && !系统常客的进程名.test(名表.get(本机.find(x => x.端口 === p).pid) || ''));
if (值得探.length) {
  console.log('\n—— 上头那些非系统进程听着的端口，探一眼是不是网页 ——');
  for (const p of 值得探.slice(0, 12)) {
    const r = await 探http(p, '/');
    console.log('  :' + p + ' → ' + (r.状态 ? r.status + ' ' + r.类型 + ' ' + r.起头 : '不是 http（' + r.错 + '）'));
  }
}
console.log('\n（这一台什么都不改：端口归谁、让不让，由他看着这张表定。）');
