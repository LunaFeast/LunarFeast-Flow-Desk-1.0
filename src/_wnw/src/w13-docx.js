/* ============================================================
   Word 导出：自己拼 OOXML，不引第三方库
   单文件产物里塞一个 zip 库不值当，所以 zip 走「存储」法（不压缩），CRC32 自己算；
   Word / WPS 对不压缩的 docx 一样认。
   批注 → word/comments.xml，修订痕迹 → w:ins / w:del，这两种痕迹只有 Word 能无损吃下，
   所以 md / txt 里痕迹照旧化简（删除去掉、插入留下），到 docx 才还原成真痕迹。
   ============================================================ */
const CRC32T = (() => {
  const t = new Uint32Array(256);
  for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(u){
  let c = 0xFFFFFFFF;
  for(let i = 0; i < u.length; i++) c = CRC32T[(c ^ u[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const TXT_ENC = new TextEncoder();
/* 只写本地头 + 中央目录 + EOCD 三件事，方法一律 0（存储） */
function zipStore(files){
  const d = new Date();
  const tm = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  const td = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  const chunks = [], central = [];
  let off = 0;
  for(const f of files){
    const name = TXT_ENC.encode(f.name);
    const data = typeof f.data === 'string' ? TXT_ENC.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, tm, true); lh.setUint16(12, td, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), name, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0, true);
    cd.setUint16(10, 0, true); cd.setUint16(12, tm, true); cd.setUint16(14, td, true); cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true);
    cd.setUint16(30, 0, true); cd.setUint16(32, 0, true); cd.setUint16(34, 0, true); cd.setUint16(36, 0, true);
    cd.setUint32(38, 0, true); cd.setUint32(42, off, true);
    central.push(new Uint8Array(cd.buffer), name);
    off += 30 + name.length + data.length;
  }
  let csize = 0; for(const c of central) csize += c.length;
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(8, files.length, true); eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, csize, true); eocd.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(eocd.buffer)], { type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function xesc(s){
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]))
    /* 控制字符进了 XML 就是坏文件，只留制表 / 换行 */
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}
function isoDate(ts){ return new Date(ts || Date.now()).toISOString().replace(/\.\d+Z$/, 'Z'); }

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
/* document.xml 多带三组命名空间：图片（wp/a/pic）和超链接关系（r） */
const DOC_NS = W_NS
  + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
  + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
  + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
  + ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const DOCX_STYLE = { h1:'Heading1', h2:'Heading2', h3:'Heading3', h4:'Heading4', h5:'Heading5', h6:'Heading6' };
const DOCX_TYPE = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.bmp':'image/bmp' };
/* Word 只认 6 位十六进制，而且不要 # 号 */
function hex(s){ const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim()); return m ? m[1].toUpperCase() : ''; }
/* 一页正文宽（A4 减页边距）的 EMU，图比这宽就等比缩下来 */
const EMU_W = 5730000;
function pxEMU(n){ return Math.max(1, Math.round((n | 0) * 9525)); }
/* 图片原始尺寸：Word 要的是 extent，字节头里自己读；读不到就按 96dpi 摆一个安全宽度 */
function imgSize(bytes, ext){
  const u = bytes, at = i => (u[i] << 8) + u[i + 1], at4 = i => ((u[i] << 24) | (u[i + 1] << 16) | (u[i + 2] << 8) | u[i + 3]) >>> 0;
  try{
    if(ext === '.png' && u.length > 24) return { w:at4(16), h:at4(20) };
    if(ext === '.gif' && u.length > 10) return { w:at(6), h:at(8) };
    if(ext === '.bmp' && u.length > 26) return { w:Math.abs((u[18] | u[19] << 8 | u[20] << 16 | u[21] << 24)), h:Math.abs((u[22] | u[23] << 8 | u[24] << 16 | u[25] << 24)) };
    if(ext === '.jpg' || ext === '.jpeg'){
      for(let i = 2; i + 9 < u.length;){
        if(u[i] !== 0xFF){ i++; continue; }
        const m = u[i + 1];
        if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w:at(i + 7), h:at(i + 5) };
        i += 2 + at(i + 2);
      }
    }
  }catch(e){}
  return null;
}

const Docx = {
  /* 导出 docx 时落在批注/修订上的作者名：用为写的中文名，别再写英文缩写 */
  author:'为写',
  /* 一段话按「修订边界 + 批注边界 + 内联样式边界」切成最小片段：
     痕迹和批注都只能在片段边界上开合，样式则整条落在一个片段里
     b.pre 是「符号外显」时挂在行首的 markdown 记号，痕迹、批注、样式的下标都得跟着往后挪 */
  pieces(b, annos){
    const pre = String(b.pre || '');
    const raw = pre + String(b.text || '');
    const marks = [];
    for(const r of (b.rev || [])){
      if(r.status !== 'open' || (r.op !== 'ins' && r.op !== 'del')) continue;
      const from = Math.max(pre.length, Math.min(raw.length, (r.at | 0) + pre.length));
      const to = Math.min(raw.length, from + String(r.text || '').length);
      if(to > from) marks.push({ from, to, op:r.op, ts:r.ts });
    }
    const styles = [];
    for(const r of Spans.norm(b.runs)){
      const from = Math.max(0, Math.min(raw.length, pre.length + (r.a | 0)));
      const to = Math.min(raw.length, from + (r.n | 0));
      if(to > from) styles.push({ from, to, p:r });
    }
    const notes = [];
    for(const a of (annos || [])){
      const q = String(a.quote || ''), want = pre.length + (a.at | 0);
      let from = q && raw.slice(want, want + q.length) === q ? want : (q ? raw.indexOf(q) : -1);
      if(from < 0) from = pre.length;
      notes.push({ from, to: q && from + q.length <= raw.length ? from + q.length : raw.length, a });
    }
    const bounds = new Set([0, raw.length]);
    for(const m of marks){ bounds.add(m.from); bounds.add(m.to); }
    for(const s of styles){ bounds.add(s.from); bounds.add(s.to); }
    for(const n of notes){ bounds.add(n.from); bounds.add(n.to); }
    const xs = [...bounds].filter(v => v >= 0 && v <= raw.length).sort((a, b) => a - b);
    const out = [];
    for(let i = 0; i < xs.length - 1; i++){
      const from = xs[i], to = xs[i + 1];
      if(to <= from) continue;
      const mk = marks.find(m => m.from <= from && m.to >= to);
      const st = styles.find(s => s.from <= from && s.to >= to);
      out.push({ from, to, text:raw.slice(from, to), op:mk ? mk.op : '', ts:mk ? mk.ts : 0, st:st ? st.p : null,
        open:notes.filter(n => n.from === from).map(n => n.a),
        close:notes.filter(n => n.to === to).map(n => n.a) });
    }
    if(!out.length) out.push({ from:0, to:raw.length, text:raw, op:'', ts:0, st:null, open:notes.map(n => n.a), close:notes.map(n => n.a) });
    return { list:out, notes };
  },
  /* 内联样式 → rPr：子元素按 schema 的顺序排（rStyle → rFonts → b → i → strike → color → u → shd），颠倒 Word 会判文件坏 */
  rPr(p, link){
    const x = [];
    if(link) x.push('<w:rStyle w:val="Hyperlink"/>');
    if(p){
      if(p.k) x.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas"/>');
      if(p.b) x.push('<w:b/><w:bCs/>');
      if(p.i) x.push('<w:i/><w:iCs/>');
      if(p.s) x.push('<w:strike/>');
      const c = hex(p.c); if(c) x.push('<w:color w:val="' + c + '"/>');
      if(p.u) x.push('<w:u w:val="single"/>');
      const h = hex(p.h); if(h) x.push('<w:shd w:val="clear" w:color="auto" w:fill="' + h + '"/>');
    }
    return x.length ? '<w:rPr>' + x.join('') + '</w:rPr>' : '';
  },
  run(text, op, ctx, ts, props){
    const rpr = this.rPr(props, props && props.l);
    const t = '<w:r>' + rpr + '<w:t xml:space="preserve">' + xesc(text) + '</w:t></w:r>';
    if(!op) return t;
    const who = ' w:id="' + (ctx.id++) + '" w:author="' + xesc(ctx.author) + '" w:date="' + isoDate(ts) + '"';
    return op === 'del'
      ? '<w:del' + who + '><w:r>' + rpr + '<w:delText xml:space="preserve">' + xesc(text) + '</w:delText></w:r></w:del' + '>'
      : '<w:ins' + who + '>' + t + '</w:ins>';
  },
  paraXml(b, ctx){
    const pr = [];
    if(b.kind === 'title') pr.push('<w:pStyle w:val="Title"/>');
    else if(DOCX_STYLE[b.kind]) pr.push('<w:pStyle w:val="' + DOCX_STYLE[b.kind] + '"/>');
    else if(b.kind === 'quote') pr.push('<w:pStyle w:val="Quote"/>');
    else if(b.kind === 'label') pr.push('<w:pStyle w:val="Label"/>');
    if(b.kind === 'ul' || b.kind === 'ol' || b.kind === 'todo'){
      const lv = Math.max(0, Math.min(8, (b.lv || 1) - 1));
      pr.push('<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="' + lv + '"/><w:numId w:val="' + (b.kind === 'ol' ? 2 : 1) + '"/></w:numPr>');
    }
    if(b.ind) pr.push('<w:ind w:left="480"/>');
    const head = pr.length ? '<w:pPr>' + pr.join('') + '</w:pPr>' : '';
    const { list } = this.pieces(b, b.annos);
    let body = '';
    for(const s of list){
      for(const a of s.open){ body += '<w:commentRangeStart w:id="' + a.__cid + '"/>'; }
      const url = s.st && s.st.l;
      const inner = this.run(s.text, s.op, ctx, s.ts, s.st);
      body += url ? '<w:hyperlink r:id="' + ctx.link(url) + '" w:history="1">' + inner + '</w:hyperlink>' : inner;
      for(const a of s.close){
        body += '<w:commentRangeEnd w:id="' + a.__cid + '"/>'
          + '<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="' + a.__cid + '"/></w:r>';
      }
      ctx.notes.push(...s.open);
    }
    return '<w:p>' + head + (body || '<w:r><w:t xml:space="preserve"></w:t></w:r>') + '</w:p>';
  },
  /* 图片 / 表格这类没有整段文字的块也要能挂批注：range 标记必须落在 <w:p> 里面，
     直接挂在 <w:body> 上 Word 不认，所以开圈塞进第一个格子（或图那段）的段落、闭圈塞进最后一个 */
  annoOpen(as, ctx){ if(!as || !as.length) return ''; ctx.notes.push(...as);
    return as.map(a => '<w:commentRangeStart w:id="' + a.__cid + '"/>').join(''); },
  annoClose(as){
    if(!as || !as.length) return '';
    return as.map(a => '<w:commentRangeEnd w:id="' + a.__cid + '"/>'
      + '<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="' + a.__cid + '"/></w:r>').join('');
  },
  /* 表格：p.t 摊平的那份文本按 grid / span 还原成真表格。
     横向合并用 gridSpan（被盖住的格子整个不写），竖向用 vMerge（下面的行要写占位 tc） */
  tableXml(b, ctx){
    const g = Array.isArray(b.grid) && b.grid.length ? b.grid : Tbl.parse(b.text);
    const sp = Array.isArray(b.span) ? b.span : [];
    const n = Tbl.cols(g);
    const cw = Math.floor(9026 / n);
    const at = (r, c) => sp.find(s => s && r >= s.r && r < s.r + (s.rs || 1) && c >= s.c && c < s.c + (s.cs || 1)) || null;
    const cell = txt => '<w:p><w:r><w:t xml:space="preserve">' + xesc(txt) + '</w:t></w:r></w:p>';
    const rows = [];
    for(let r = 0; r < g.length; r++){
      const tds = [];
      for(let c = 0; c < n; c++){
        const m = at(r, c);
        if(m){
          if(c > m.c) continue;
          const head = '<w:tcPr><w:tcW w:w="' + (cw * (m.cs || 1)) + '" w:type="dxa"/>'
            + ((m.cs || 1) > 1 ? '<w:gridSpan w:val="' + m.cs + '"/>' : '')
            + (m.rs > 1 ? (r === m.r ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') : '') + '</w:tcPr>';
          tds.push('<w:tc>' + head + cell(m.rs > 1 && r > m.r ? '' : String(g[r][c] == null ? '' : g[r][c])) + '</w:tc>');
          continue;
        }
        tds.push('<w:tc><w:tcPr><w:tcW w:w="' + cw + '" w:type="dxa"/></w:tcPr>'
          + cell(String((g[r] || [])[c] == null ? '' : g[r][c])) + '</w:tc>');
      }
      if(tds.length) rows.push(tds);
    }
    const open = this.annoOpen(b.annos, ctx), close = this.annoClose(b.annos);
    if(rows.length && (open || close)){
      if(open) rows[0][0] = rows[0][0].replace('<w:p>', '<w:p>' + open);
      const lr = rows[rows.length - 1];
      lr[lr.length - 1] = lr[lr.length - 1].replace('</w:p>', close + '</w:p>');
    }
    let x = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/>'
      + '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(k => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>').join('')
      + '</w:tblBorders></w:tblPr><w:tblGrid>';
    for(let c = 0; c < n; c++) x += '<w:gridCol w:w="' + cw + '"/>';
    x += '</w:tblGrid>';
    for(const tds of rows) x += '<w:tr>' + tds.join('') + '</w:tr>';
    return x + '</w:tbl>';
  },
  /* 图片：字节在 build 之前由 Work.docx 备好（取字节是异步的，这里只管摆） */
  imageXml(b, ctx){
    const as = b.annos || [];
    const note = txt => '<w:p>' + this.annoOpen(as, ctx) + '<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">' + xesc(txt) + '</w:t></w:r>' + this.annoClose(as) + '</w:p>';
    const f = b.file;
    if(!f || !f.bytes || !f.bytes.length) return note('[这张图没找到文件：' + (b.img || b.text || '') + ']');
    const ext = f.ext && DOCX_TYPE[f.ext] ? f.ext : '';
    if(!ext) return note('[这张图是 ' + (f.ext || '未知格式') + '，Word 只吃 png / jpg / gif / bmp，换这几种格式再导出；稿子里记的是 ' + (b.img || b.text || '') + ']');
    const no = ctx.media.length + 1;
    ctx.media.push({ name:'word/media/image' + no + ext, data:f.bytes, ext:ext.slice(1) });
    const rid = 'rIdI' + no;
    const d = imgSize(f.bytes, ext);
    let cx = EMU_W, cy = pxEMU(300);
    if(d && d.w){ cx = Math.min(EMU_W, pxEMU(d.w)); cy = Math.round(cx * (d.h / d.w)); }
    const id = 1000 + no;
    return '<w:p>' + this.annoOpen(as, ctx)
      + '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
      + '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
      + '<wp:docPr id="' + id + '" name="图片 ' + no + '"/>'
      + '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
      + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
      + '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="image' + no + ext + '"/><pic:cNvPicPr/></pic:nvPicPr>'
      + '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
      + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>'
      + '<a:prstGeom prst="rect"><a:noFill/><a:ln><a:noFill/></a:ln></a:prstGeom></pic:spPr>'
      + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>' + this.annoClose(as) + '</w:p>';
  },
  commentsXml(ctx){
    if(!ctx.notes.length) return '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:comments ' + W_NS + '>' + ctx.notes.map(a => '<w:comment w:id="' + a.__cid + '" w:author="' + xesc(ctx.author)
        + '" w:date="' + isoDate(a.at2) + '" w:initials="W"><w:p><w:pPr><w:pStyle w:val="CommentText"/></w:pPr><w:r><w:t xml:space="preserve">'
        + xesc((a.quote ? '「' + a.quote + '」 ' : '') + a.text + annoReply(a))
        + '</w:t></w:r></w:p></w:comment>').join('') + '</w:comments>';
  },
  stylesXml(){
    const p = (id, name, rpr, ppr) => '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/>'
      + (ppr || '') + (rpr || '') + '</w:style>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:styles ' + W_NS + '>'
      + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:eastAsia="宋体" w:cs="Times New Roman"/>'
      + '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault>'
      + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
      + p('Title', 'Title', '<w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr>', '<w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>')
      + p('Quote', 'Quote', '<w:rPr><w:i/><w:color w:val="666666"/></w:rPr>', '<w:pPr><w:ind w:left="480"/></w:pPr>')
      + p('Label', 'Label', '<w:rPr><w:b/></w:rPr>')
      + p('ListParagraph', 'List Paragraph', '', '<w:pPr><w:ind w:left="720" w:hanging="360"/><w:contextualSpacing/></w:pPr>')
      + [1, 2, 3, 4, 5, 6].map(n => p('Heading' + n, 'heading ' + n,
          '<w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="' + (40 - n * 4) + '"/><w:szCs w:val="' + (40 - n * 4) + '"/></w:rPr>',
          '<w:pPr><w:keepNext/><w:outlineLvl w:val="' + (n - 1) + '"/><w:spacing w:before="' + (240 - n * 20) + '"/></w:pPr>')).join('')
      + '<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/>'
      + '<w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>'
      + '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="Normal"/>'
      + '<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
      + '<w:style w:type="paragraph" w:styleId="CommentText"><w:name w:val="annotation text"/><w:basedOn w:val="Normal"/>'
      + '<w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'
      + '</w:styles>';
  },
  numberingXml(){
    const lvl = (fmt, txt, font) => '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/><w:lvlText w:val="' + txt + '"/>'
      + '<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>'
      + (font ? '<w:rPr><w:rFonts w:ascii="' + font + '" w:hAnsi="' + font + '" w:hint="default"/></w:rPr>' : '') + '</w:lvl>';
    /* 子元素顺序按 schema 来：nsid → tmpl → multiLevelType → lvl，颠倒过来 Word 会判文件损坏 */
    const abs = (id, inner) => '<w:abstractNum w:abstractNumId="' + id + '">'
      + '<w:nsid w:val="00' + id + 'A1B2C3"/><w:tmpl w:val="00' + id + 'A1B2C3"/><w:multiLevelType w:val="singleLevel"/>'
      + inner
      + '<w:lvl w:ilvl="1"/><w:lvl w:ilvl="2"/><w:lvl w:ilvl="3"/><w:lvl w:ilvl="4"/><w:lvl w:ilvl="5"/>'
      + '<w:lvl w:ilvl="6"/><w:lvl w:ilvl="7"/><w:lvl w:ilvl="8"/></w:abstractNum>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:numbering ' + W_NS + '>'
      + abs(0, lvl('bullet', '·', '')) + abs(1, lvl('decimal', '%1.', ''))
      + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
      + '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
      + '</w:numbering>';
  },
  /* model: { title, blocks:[{kind, text, done, rev, annos, ind, runs, grid, span, img, file}] }
     字节（图片）由调用方先取好挂在 blk.file 上 —— 取文件是异步的，这里全同步 */
  build(model){
    const ctx = { id:1, author:this.author, notes:[], media:[], links:[],
      link(url){ const u = String(url || ''); if(!u) return '';
        const i = this.links.indexOf(u); if(i >= 0) return 'rIdH' + (i + 1);
        this.links.push(u); return 'rIdH' + this.links.length; } };
    const body = [];
    const blocks = model.blocks || [];
    for(let n = 0; n < blocks.length; n++){
      const b = blocks[n];
      /* 两张表中间必须隔一个段落，文档结尾也不能直接落在表格上，不然 Word 判损坏 */
      const nxt = blocks[n + 1];
      if(b.kind === 'img'){ body.push(this.imageXml(b, ctx)); continue; }
      if(b.kind === 'table'){
        body.push(this.tableXml(b, ctx));
        if(!nxt || nxt.kind === 'table') body.push('<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>');
        continue;
      }
      const blk = Object.assign({}, b);
      /* 待办在 Word 里没有对应物：勾没勾只能写回文字里 */
      if(blk.kind === 'todo') blk.text = (blk.done ? '[√] ' : '[ ] ') + (blk.text || '');
      body.push(this.paraXml(blk, ctx));
    }
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:document ' + DOC_NS + '><w:body>' + body.join('')
      + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr>'
      + '</w:body></w:document>';
    const rels = ctx.notes.length
      ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>' : '';
    /* 超链接是外部关系，图片是包内部件，两份都得登记到 document.xml.rels */
    const linkRels = ctx.links.map((u, i) => '<Relationship Id="rIdH' + (i + 1) + '"'
      + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"'
      + ' Target="' + xesc(u) + '" TargetMode="External"/>').join('');
    const imgRels = ctx.media.map((m, i) => '<Relationship Id="rIdI' + (i + 1) + '"'
      + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"'
      + ' Target="media/' + xesc(m.name.replace('word/media/', '')) + '"/>').join('');
    const imgTypes = [...new Set(ctx.media.map(m => m.ext))]
      .map(e => '<Default Extension="' + e + '" ContentType="' + DOCX_TYPE['.' + e] + '"/>').join('');
    const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + imgTypes
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
      + (ctx.notes.length ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' : '')
      + '</Types>';
    const files = [
      { name:'[Content_Types].xml', data:types },
      { name:'_rels/.rels', data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name:'word/document.xml', data:doc },
      { name:'word/_rels/document.xml.rels', data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
        + rels + linkRels + imgRels + '</Relationships>' },
      { name:'word/styles.xml', data:this.stylesXml() },
      { name:'word/numbering.xml', data:this.numberingXml() }
    ].concat(ctx.media);
    if(ctx.notes.length) files.push({ name:'word/comments.xml', data:this.commentsXml(ctx) });
    return zipStore(files);
  }
};
