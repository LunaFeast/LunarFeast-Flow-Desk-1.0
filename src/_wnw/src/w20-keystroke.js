/* ============================================================
   逐字记录（外28 一组）：正文每敲一下往文件末尾追加一行，一行一笔，只加不改。
   落在 <书名>/history/<章id>/keystroke.txt —— 跟整本快照那摞 .json 同住一层，各记各的。

   一行一笔长这样（时间写十进制毫秒，打开记事本一眼看得出隔了多久）：
     181|的             接着上一笔的落点插入「的」
     340|s2@7+词库      换到第 2 段第 7 个字处插入「词库」
     95|-2              从当前落点删掉 2 个字
     1200|\p            回车切成两段
     60|\m              这一段并回上一段
   段号和落点跟上一笔一样就省掉，所以连着敲一段话只有开头那个毫秒数是新的。
   字面里只有反斜杠要写成两条 —— 行尾就是字面的尽头，竖线、引号、数字都不用躲。

   控制行只有两种，都以 # 开头：
     #B<起始毫秒>|<json 段数组>   底片：这一章开始记时已经写好的那些段，一章只在建文件那趟写一次
     #S<第几枚> <11 位指纹>        每 200 笔一枚带钥匙的指纹（HMAC-SHA256 取前 64 位 → 11 位 base36）

   只追加：这一个文件里没有改写、没有删单条的函数，路只有一条 —— 往后面加。
   钥匙写在下面 KEY 那一行，拦的是"改了磁盘那份再把后面的链重算一遍"；
   存心翻源码抄钥匙不在这条拦得住的范围里，界面上和程序里没有第二条路。
   ============================================================ */
const KLog = {
  FP_EVERY:200,
  KEY:'fd.hist.keystroke.v1',
  NAME:'keystroke.txt',
  st:new Map(),          // 章id -> { last, pi, at, n, seals, prev, seg, bytes }
  q:new Map(),           // 章id -> 排到哪儿了（改动喊声之间不等回音，靠这个排队）
  app(){ return !!(window.FD_APP && location.protocol === 'fdapp:'); },
  /* 历史那一层的目录归 Hist 管（w15-hist.js），这一个文件就住在它下面 —— 口径只留一处 */
  dirOf(chId){ return Hist.dirOf(chId); },
  relOf(chId){ return this.dirOf(chId) + '/' + this.NAME; },
  keyOf(chId){ return 'klog.' + Work.book.id + '.' + chId; },
  b36(v, w){ const A = '0123456789abcdefghijklmnopqrstuvwxyz'; let s = ''; for(let i = 0; i < w; i++){ s = A[Number(v % 36n)] + s; v /= 36n; } return s; },
  /* ---------- 一、指纹 ---------- */
  async seal(text){
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(this.KEY), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const d = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text)));
    let v = 0n; for(const x of d.subarray(0, 8)) v = (v << 8n) | BigInt(x);
    return this.b36(v % (36n ** 11n), 11);
  },
  /* ---------- 二、磁盘进出：只有追加和读，没有改写 ---------- */
  async read(chId){
    if(this.app()){
      try{ return await FD_APP.readPageFile(this.relOf(chId)) || ''; }
      /* 「没有这个文件」和「这个文件这一趟没读动」是两件事，混成一件就会出大事：
         读不动被当成没记过 → 往同一个文件尾巴再补一枚底片 → 重放时整章正文重复一遍，这一章的记录作废。
         所以补一枚底片之前先问一句在不在，在的话把错抛出去。 */
      catch(e){
        /* 分不清「没这个文件」和「没读动」就别往下走：宁可报出去。
           壳落后一步时这个名字压根没有，从前这里直接 FD_APP.pageFileExists(...) → TypeError 往上抛，
           历史版本那一屏在开层之前 await 了这一笔，于是点了没反应、连一句提示都没有（2026-10-07 报的那四条之一）。 */
        if(!FD_APP.pageFileExists) throw new Error('主进程那个「在不在」没装上（程序壳没跟上，得重新打包）');
        if(await FD_APP.pageFileExists(this.relOf(chId))) throw e;
        return '';
      }
    }
    return await DB.get(this.keyOf(chId), '') || '';
  },
  async put(chId, text){
    if(this.app()){
      /* 跑在 exe 里却没有只追加那一条 = 装的那份主进程代码比页面旧。这时候转存浏览器库，
         他会看见文稿目录里永远等不到那份明文文件而一声不吭 —— 宁可报出去 */
      if(!FD_APP.appendPageFile) throw new Error('主进程那条只追加的路没装上（程序壳没跟上，得重新打包）');
      await FD_APP.appendPageFile(this.relOf(chId), text);
    }
    /* 开发服务器没有追加这条路，只能整份读回来接上再写 —— 只有开发时走得到 */
    else await DB.put(this.keyOf(chId), (await this.read(chId)) + text);
    const s = this.st.get(chId); if(s) s.bytes += new Blob([text]).size;
  },
  /* ---------- 三、一行一笔：写 ---------- */
  /* 一笔 = 毫秒差 | [s第几段] [@第几个字] 动作。落点跟上一笔接得上时那两个前缀全省。 */
  async add(chId, op){
    const s = this.st.get(chId);
    /* 时间差想写几位就写几位（隔几十年也就十几位数字，重放那头读的是开头那一串数字）；
       只有电脑时钟往回跳的那一次夹成 0 —— 重放要的是先后不乱 */
    let head = String(Math.max(0, op.at_ms - s.last));
    s.last = op.at_ms;
    if(op.pi !== s.pi) head += 's' + op.pi;
    const move = op.at !== undefined && op.at !== s.at;
    let act;
    if(op.ins !== undefined) act = '+' + String(op.ins).replace(/\\/g, '\\\\');
    else if(op.del) act = '-' + op.del;
    else if(op.split) act = '\\p';
    else act = '\\m';
    if(move && op.join !== 1) head += '@' + op.at;
    const line = head + '|' + act;
    s.n++; s.seg += line + '\n';
    await this.put(chId, line + '\n');
    this.follow(s, op);
    if(s.n % this.FP_EVERY === 0) await this.stamp(chId, s);
    return line;
  },
  /* 落点跟着走：插入完停在字面之后，删完停在原地，分段后停在新段开头，合段后停在接合处 */
  follow(s, op){
    if(op.ins !== undefined){ s.pi = op.pi; s.at = (op.at || 0) + [...String(op.ins)].length; }
    else if(op.del){ s.pi = op.pi; s.at = op.at || 0; }
    else if(op.split){ s.pi = op.pi + 1; s.at = 0; }
    else { s.pi = Math.max(0, op.pi - 1); s.at = op.prevLen || 0; }
  },
  async stamp(chId, s){
    const dig = await this.seal((s.prev || '') + s.seg);
    s.seals++; s.prev = dig; s.seg = '';
    await this.put(chId, '#S' + s.seals + ' ' + dig + '\n');
  },
  /* 底片：这一章开始记时已经写好的那些段（交进来的必须是"这一笔动手之前"的那些段）。
     新建的空章就是 []，一行几个字符。底片跟着第一枚指纹一起算，换掉底片同样对不上。 */
  async seed(chId, texts, 刻){
    const t = 刻 || Date.now();
    const line = '#B' + t + '|[' + (texts || []).map(x => JSON.stringify(String(x || ''))).join(',') + ']';
    const s = { last:t, pi:0, at:0, n:0, seals:0, prev:'', seg:line + '\n', bytes:0 };
    this.st.set(chId, s);
    await this.put(chId, line + '\n');
    return s;
  },
  /* 开章：把已有的那份重放一遍，恢复出"上一笔停在哪、第几枚指纹、还差多少笔凑一枚"，之后接着往后面加。
     尾部不足 200 笔那一截当场补一枚指纹封住 —— 不然改的就是没人对账的那一段。 */
  async open(chId, texts, 刻){
    if(this.st.has(chId)) return this.st.get(chId);
    const r = await this.decode(chId, await this.read(chId));
    if(!r.n && !r.bytes) return this.seed(chId, texts, 刻);
    const s = { last:r.state.last, pi:r.state.pi, at:r.state.at, n:r.n, seals:r.seals, prev:r.state.prev, seg:r.state.seg, bytes:r.bytes };
    this.st.set(chId, s);
    if(s.seg) await this.stamp(chId, s);
    return s;
  },
  /* ---------- 四、一行一笔：读 ---------- */
  parse(line){
    const bar = line.indexOf('|');
    const head = line.slice(0, bar);
    let k = 0; while(k < head.length && head[k] >= '0' && head[k] <= '9') k++;
    const op = { gap:Number(head.slice(0, k)) || 0, s:null, at:null };
    for(const m of head.slice(k).matchAll(/([s@])(\d+)/g)){ if(m[1] === 's') op.s = Number(m[2]); else op.at = Number(m[2]); }
    const act = line.slice(bar + 1);
    if(act[0] === '+') op.ins = act.slice(1).replace(/\\\\/g, '\\');
    else if(act[0] === '-') op.del = Number(act.slice(1)) || 0;
    else if(act === '\\p') op.split = 1;
    else op.join = 1;
    return op;
  },
  /* 从头重放：交出每一笔的时刻和那之后的全文，回放那一屏吃这个。
     指纹一枚一枚当场重算，对不上就把对不上的那一枚的序号交出去（tamper），不许照原样演。
     第三个参数 onStep(第几笔, 这一笔, 这一笔之后的那摞段文本)：历史那一屏要的是"一笔一屏的全文"，
     它自己在外面再算一套状态机就会和这里对不上（AGENTS.md 那条元规矩说的就是这种事），
     所以出口开在这台机器里面 —— 不传就一笔带过，数笔数那一条路（stats）走的还是老样子。 */
  async decode(chId, txt, onStep){
    txt = txt !== undefined ? txt : await this.read(chId);
    const bytes = new Blob([txt]).size;
    const s = { last:Date.now(), pi:0, at:0, prev:'', seg:'' };
    const ps = []; const events = [];
    let seals = 0, want = 1, tamper = 0, n = 0, seed = [];
    for(const l of txt.split('\n')){
      if(!l) continue;
      if(l.startsWith('#B')){ s.last = Number(l.slice(2, l.indexOf('|'))) || s.last; s.seg = l + '\n'; try{ for(const x of JSON.parse(l.slice(l.indexOf('|') + 1))) ps.push(x); }catch(e){} seed = ps.slice(); continue; }
      if(l.startsWith('#S')){
        const sp = l.lastIndexOf(' ');
        const got = l.slice(sp + 1);
        /* 行里那个「第几枚」也参与对账：号跟这一趟数出来的对不上，就是这一行被动过、或者整段被挪了位置 */
        if(!tamper && Number(l.slice(2, sp)) !== want) tamper = want;
        const mine = await this.seal(s.prev + s.seg);
        if(!tamper && mine !== got) tamper = want;
        seals++; want++; s.prev = got; s.seg = '';
        continue;
      }
      n++;
      const op = this.parse(l);
      if(op.s !== null) s.pi = op.s;
      if(op.at !== null) s.at = op.at;
      op.pi = s.pi; op.at = s.at; s.last += op.gap; op.at_ms = s.last;
      s.seg += l + '\n';
      if(op.ins !== undefined){ ps[op.pi] = (ps[op.pi] === undefined ? '' : ps[op.pi]) ; ps[op.pi] = ps[op.pi].slice(0, op.at) + op.ins + ps[op.pi].slice(op.at); }
      else if(op.del){ ps[op.pi] = (ps[op.pi] || '').slice(0, op.at) + (ps[op.pi] || '').slice(op.at + op.del); }
      else if(op.split){ const p = ps[op.pi] || ''; ps[op.pi] = p.slice(0, op.at); ps.splice(op.pi + 1, 0, p.slice(op.at)); }
      else { const p = ps[op.pi] || ''; const up = ps[op.pi - 1] === undefined ? '' : ps[op.pi - 1]; op.prevLen = [...up].length; ps[op.pi - 1] = up + p; ps.splice(op.pi, 1); }
      this.follow(s, op);
      events.push(op);
      if(onStep) onStep(n - 1, op, ps.slice());
    }
    return { events, paras:ps, bytes, tamper, seals, n, state:s, at:s.last, seed };
  },
  /* 历史那一屏吃的：每一笔走到哪、那一笔之后全文是什么样子。
     走的就是上面那台机器，不在外面另算一套 —— 交回来的段数和正文跟真编辑器对得上。 */
  async steps(chId){
    const out = [];
    const r = await this.decode(chId, undefined, (i, op, ps) => out.push({ i, op, ps }));
    return { steps:out, seed:r.seed || [], n:r.n, bytes:r.bytes, tamper:r.tamper };
  },
  /* ---------- 五、正文那一头调的那一个口 ----------
     diff(章id, 改前那摞段文本, 改后那摞段文本)：打字、回车分段、段首合并、粘贴多段、
     删一整段、撤销，全走这一个口，不必在每一处改动旁边各埋一个钩子。
     中文输入法一次上屏就是一个词，那是输入法给到的最细一层，不是这里合起来的。 */
  async _edit(chId, pi, before, after, 刻){
    if(before === after) return;
    let a = 0; while(a < before.length && a < after.length && before[a] === after[a]) a++;
    let b = 0; while(b < before.length - a && b < after.length - a && before[before.length - 1 - b] === after[after.length - 1 - b]) b++;
    const del = before.slice(a, before.length - b), ins = after.slice(a, after.length - b);
    if(!del && !ins) return;
    if(del) await this.add(chId, { pi, at:a, del:[...del].length, at_ms:刻 });
    if(ins) await this.add(chId, { pi, at:a, ins, at_ms:刻 });
  },
  /* 正文那头每次改动都喊一声，喊声之间不等回音 —— 排队走，后一笔一定接在前一笔落稳之后，
     不然两笔同时往文件尾巴上挤，顺序就乱了 */
  /* 刻 = 手指动那一下的时刻，由喊声那头带过来（正文那一头是 dirty()）——
     排队排到什么时候才写、磁盘慢不慢，都不该影响记下来的时刻。 */
  diff(chId, was, now, 刻){
    const tail = this.q.get(chId) || Promise.resolve();
    const run = () => this.diffNow(chId, was, now, 刻);
    const next = tail.then(run, run);
    this.q.set(chId, next.catch(() => {}));
    return next;
  },
  /* 编码器跟重放是同一台状态机：手里揣着"这会儿的段文本"，一格一格往目标挪。
     能"切一刀把后半截挪过去"的绝不把后半截重打一遍 —— 回车分段就是这么记的。 */
  async diffNow(chId, was, now, 刻){
    was = was || []; now = now || [];
    刻 = 刻 || Date.now();
    await this.open(chId, was, 刻);
    const cur = was.slice();
    let 笔 = 0, 圈 = 0;
    for(;;){
      /* 转满 2 万圈还没追平 = 这一笔没记全。宁可报错到页脚，也不能不出声 ——
         喊声那头已经把这次的樣子抄走当基线了，静默走人就是从此记录和正文对不上而没人知道 */
      if(++圈 > 20000) throw new Error('逐字记录一次改动转了 2 万圈还没追平，这一笔没记全');
      let p = -1;
      for(let k = 0; k < Math.max(cur.length, now.length); k++){ if(cur[k] !== now[k]){ p = k; break; } }
      if(p < 0) break;
      const c = cur[p] === undefined ? '' : cur[p], t = now[p] === undefined ? '' : now[p];
      /* 段数不够，先补一格：能从前一段末尾切一刀就切，前面根本没有段就凭空冒出一格空的 */
      if(p >= cur.length){
        if(p > 0){ await this.add(chId, { pi:p - 1, at:[...cur[p - 1]].length, split:1, at_ms:刻 }); 笔++; cur.splice(p, 0, ''); }
        else cur[p] = '';
        continue;
      }
      /* 回车分段：改前这一格的前头正好就是改后这一格的样子，后半截挪到下一格去 */
      if(cur.length < now.length && t && c.startsWith(t)){
        await this.add(chId, { pi:p, at:[...t].length, split:1, at_ms:刻 }); 笔++;
        cur.splice(p + 1, 0, c.slice(t.length)); cur[p] = t;
        continue;
      }
      /* 格数多了：这一格先删干净，再并回前一段（第 0 格没得并，就把后一段提上来接住它） */
      if(cur.length > now.length){
        if(c !== ''){ await this._edit(chId, p, c, '', 刻); 笔++; }
        if(p > 0){ await this.add(chId, { pi:p, prevLen:[...cur[p - 1]].length, join:1, at_ms:刻 }); 笔++; cur.splice(p, 1); }
        else { await this.add(chId, { pi:1, prevLen:0, join:1, at_ms:刻 }); 笔++; cur.splice(0, 1); }
        continue;
      }
      await this._edit(chId, p, c, t, 刻); 笔++; cur[p] = t;
    }
    return 笔;
  },
  /* 历史页那一行真数：这一章记了多少笔、占了多大、有没有被动过 */
  async stats(chId){
    const r = await this.decode(chId, await this.read(chId));
    return { n:r.n, bytes:r.bytes, seals:r.seals, tamper:r.tamper };
  }
};
