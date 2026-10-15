/* ============================================================
   插件文件层 · 主进程和开发探针共用的同一把尺
   ----------
   插件的代码和自带文件都住在 data\plugins\<id>\ 这一格里：
   推演定制存一个新组件写的就是这一格里的 main.js + recipe.json + manifest.json，
   存了就是新的，重载这一家立刻生效 —— 不再有「写一份覆盖副本、等重新生成页面才嵌进去」那一趟。
   「改代码」那颗钮和它的编辑对话框，连同伴着它长的「列这一格有哪几份文本」「拷回原版」「有没有原版」，
   随插件分离第 2 批 2.5 撤了；原版那一格（data\plugins-factory\）跟着第 2.6 整格撤 ——
   没有用户装机要照顾，要换回早先那一份，把自己手里那一个包重装一次。
   ----------
   三道闸（谁都绕不过去，包括页面里递上来的路径）：
     1 包名只认干净字符（字母数字点横线下划线），别的一律不落地；
     2 相对路径不许有 .. 或 . 或空段；
     3 落点算完必须在 plugins\<id>\ 里面，跑出去就报错。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ID_OK = /^[A-Za-z0-9._-]+$/;
/* 一份文件走这条道的上限：代码、插件清单、随行小文件都在这个数以内；
   真要搬大东西（几 MB 的词库底本）走的是包导入那条道，不经过这里。 */
const MAX_BYTES = 8 * 1024 * 1024;

/* 'a/b.txt' → ['a','b.txt']；脏路径回 null */
function segsOf(rel){
  const s = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '').split('/');
  const out = s.filter(Boolean);
  if(!out.length) return null;
  if(out.some(x => x === '.' || x === '..')) return null;
  return out;
}
function isDir(p){ try{ return fs.statSync(p).isDirectory(); }catch(e){ return false; } }
function isFile(p){ try{ return fs.statSync(p).isFile(); }catch(e){ return false; } }

module.exports = function make(opt){
  const o = opt || {};
  const dir = k => { const v = typeof o[k] === 'function' ? o[k]() : o[k]; return v ? path.resolve(String(v)) : ''; };
  const LIVE = () => dir('live');          /* data\plugins\ —— 程序现在真正加载的那一层 */

  /* 包名 + 相对路径 → 这一格里的真路径；不干净的回错误话，绝不落盘 */
  function locate(id, rel){
    const nm = String(id || '').trim();
    if(!ID_OK.test(nm)) return { msg:'包名不干净，不敢动手：' + nm };
    const root = LIVE();
    if(!root) return { msg:'插件目录还没定下来' };
    const base = path.join(root, nm);
    if(rel === undefined || rel === null || rel === '') return { id:nm, file:base, root };
    const seg = segsOf(rel);
    if(!seg) return { msg:'路径不干净，不敢动手：' + String(rel) };
    const f = path.join(base, ...seg);
    if(f !== base && !f.startsWith(base + path.sep)) return { msg:'路径跑出了这一格：' + String(rel) };
    return { id:nm, file:f, root };
  }
  return {
    MAX_BYTES,
    liveDir:LIVE,

    /* ---------- 读这一格里的一份文件 ----------
       rel 没给（null / 空串 / undefined 三种都算，主进程那条通道传的是 null）：按入口那份 main.js 办 */
    read(id, rel){
      const what = (rel === undefined || rel === null || String(rel).trim() === '') ? 'main.js' : rel;
      const L = locate(id, what);
      if(L.msg) return { ok:false, msg:L.msg };
      if(!isFile(L.file)) return { ok:false, msg:'这一格里没有这份文件', path:String(what) };
      let st = null;
      try{ st = fs.statSync(L.file); }catch(e){ return { ok:false, msg:'读不到：' + (e && e.code || e) }; }
      if(st.size > MAX_BYTES) return { ok:false, msg:'这份文件 ' + Math.round(st.size / 1048576) + 'MB，太大不走这条路' };
      let text = '';
      try{ text = fs.readFileSync(L.file, 'utf8'); }catch(e){ return { ok:false, msg:'读不出文本：' + (e && e.code || e) }; }
      return { ok:true, text, size:st.size, mtime:Math.floor(st.mtimeMs) };
    },
    /* ---------- 写这一格里的一份文件：存了就是新的 ---------- */
    write(id, rel, text){
      if(rel === undefined || rel === null || String(rel).trim() === '') return { ok:false, msg:'得说要写这一格里的哪份文件' };
      const L = locate(id, rel);
      if(L.msg) return { ok:false, msg:L.msg };
      const buf = Buffer.from(String(text == null ? '' : text), 'utf8');
      if(buf.length > MAX_BYTES) return { ok:false, msg:'这份 ' + Math.round(buf.length / 1048576) + 'MB，太大不走这条路' };
      try{
        fs.mkdirSync(path.dirname(L.file), { recursive:true });
        fs.writeFileSync(L.file, buf);
        return { ok:true, size:buf.length };
      }catch(e){ return { ok:false, msg:'写不进去：' + (e && e.code || e) }; }
    },
    /* ---------- 抹掉一整格：只按包名动手，不接子路径（「删除」那一步用的就是它） ---------- */
    remove(id){
      const L = locate(id);
      if(L.msg) return { ok:false, msg:L.msg };
      const gone = [];
      try{
        if(isDir(L.file)){ fs.rmSync(L.file, { recursive:true, force:true }); gone.push(L.id + '/'); }
        if(isFile(L.file + '.zip')){ fs.unlinkSync(L.file + '.zip'); gone.push(L.id + '.zip'); }
        if(!gone.length) return { ok:false, msg:'这一格本来就不在' };
        return { ok:true, removed:gone };
      }catch(e){ return { ok:false, msg:'删不掉：' + (e && e.code || e), removed:gone }; }
    }
  };
};
