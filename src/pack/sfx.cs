/* ============================================================
   Flow-Desk 的首装那一个壳（自解压单 exe）
   ------------------------------------------------------------
   这一份是给 publish.mjs 当"信封"用的：publish 把这棵树的出厂内容压成一包 zip，
   整段粘在这个 exe 屁股后面（Windows 不在乎 exe 后面多出几百 MB，照样跑得起来），
   双击它 = 自己摊成一棵 Flow-Desk\ 然后开起来。
   为什么用"粘在后面"而不是"塞进资源里"：塞进资源要把内容编译进源文件，
   而粘在后面这个壳编一次能配每一版用，publish 只管换尾巴。

   只用 Windows 自带的那点东西：.NET Framework 4 的 csc.exe 编译（Win10/11 就有），
   不引第三方压缩库 —— zip 的目录自己读，压住的那一段交给 DeflateStream。
   这一颗既管首装也管升级：目标那一棵已经在了就照原样覆盖摊一遍，动手之前先把要被换掉的旧的
   挪进 update\backups\<时间戳>\（src\ 那一层整层挪，别的一个文件挪一份），装完就还是程序本身，
   不靠系统里装了什么。data\ 从头到尾不碰 —— 包里一个 data\ 开头的路径都没有（publish 有一道硬闸盯着），
   这一层也就没有被覆盖的机会。
   参数（都是自测和特殊场合用的，双击时一个都不用给）：
     --dest=<路径>   摊到哪儿（默认：这个 exe 旁边的 Flow-Desk\）
     --no-run        摊完不开程序
     --quiet         不弹窗，闷头摊（探针跑这条，看返回值和磁盘上的东西验收）
   返回值：0 成 · 3 读不到包 · 4 摊或挪到一半错 · 5 没点安装就关了 · 6 摊完根上没有 exe · 7 那一棵正在开着
   ============================================================ */
using System;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Drawing;

static class Sfx
{
    /* ---------- zip：只读，认自己写出去那一种（store / deflate，名字一律 utf8）---------- */
    class Entry
    {
        public string Name;      /* 用 / 分隔的树内相对路径 */
        public long LocalOff;    /* 本地头在这包 zip 里的起点（还没加整包的偏移） */
        public long CSize;
        public long USize;
        public int Method;
    }

    class Payload
    {
        public List<Entry> Items = new List<Entry>();
        public long Start;       /* 这包 zip 从这个 exe 的第几字节开始 */
        public long Total;
    }

    /* 读条目的数据时不许越过本条的长度：DeflateStream 会往前多要一口，
       不加这道闸就把下一条的开头一起吃掉了。 */
    class Bound : Stream
    {
        Stream inner; long left;
        public Bound(Stream s, long n){ inner = s; left = n; }
        public override bool CanRead { get { return true; } }
        public override bool CanSeek { get { return false; } }
        public override bool CanWrite { get { return false; } }
        public override void Flush() { }
        public override long Length { get { return left; } }
        public override long Position { get { return 0; } set { throw new Exception("不许找"); } }
        public override int Read(byte[] buf, int o, int c)
        {
            if(left <= 0) return 0;
            int n = inner.Read(buf, o, (int)Math.Min(c, left));
            left -= n;
            return n;
        }
        public override long Seek(long o, SeekOrigin r){ throw new Exception("不许找"); }
        public override void SetLength(long v){ throw new Exception("不许改"); }
        public override void Write(byte[] b, int o, int c){ throw new Exception("不许写"); }
        protected override void Dispose(bool disposing){ }   /* 关的是这层闸，不是里面那把文件 */
    }

    static ushort U16(byte[] b, int i){ return BitConverter.ToUInt16(b, i); }
    static uint  U32(byte[] b, int i){ return BitConverter.ToUInt32(b, i); }

    /* 从末尾往回找中央目录结尾（EOCD），再算出整包在这个 exe 里的起点：
       中央目录正好停在 EOCD 前面，所以「EOCD 的位置 − 目录大小 − 目录里写的起点」就是这包的起点
       （目录里那些偏移都是"包里第几字节"，取任何一条的数据前都得把这个起点加上）。 */
    static Payload Open(string self)
    {
        using(FileStream fs = File.OpenRead(self))
        {
            long len = fs.Length;
            int back = (int)Math.Min(len, 66000);
            byte[] tail = new byte[back];
            fs.Seek(len - back, SeekOrigin.Begin);
            fs.Read(tail, 0, back);
            int p = -1;
            for(int i = back - 22; i >= 0; i--)
                if(tail[i] == 0x50 && tail[i+1] == 0x4b && tail[i+2] == 0x05 && tail[i+3] == 0x06){ p = i; break; }
            if(p < 0) return null;
            int count = U16(tail, p + 10);
            long cdSize = U32(tail, p + 12);
            long cdOff = U32(tail, p + 16);
            long start = (len - back + p) - cdSize - cdOff;
            if(start < 0 || count <= 0) return null;

            Payload pl = new Payload();
            pl.Start = start;
            fs.Seek(start + cdOff, SeekOrigin.Begin);
            byte[] head = new byte[46];
            for(int k = 0; k < count; k++)
            {
                fs.Read(head, 0, 46);
                if(U32(head, 0) != 0x02014b50) return null;
                int nl = U16(head, 28), el = U16(head, 30), cl = U16(head, 32);
                byte[] nm = new byte[nl];
                fs.Read(nm, 0, nl);
                Entry e = new Entry();
                e.Name = Encoding.UTF8.GetString(nm);
                e.Method = U16(head, 10);
                e.CSize = U32(head, 20);
                e.USize = U32(head, 24);
                e.LocalOff = U32(head, 42);
                pl.Items.Add(e);
                pl.Total += e.USize;
                fs.Seek(el + cl, SeekOrigin.Current);
            }
            return pl;
        }
    }

    /* 路径先审一遍：.. 跳出去的、带盘符的一概不要 */
    static bool Clean(string name)
    {
        if(string.IsNullOrEmpty(name)) return false;
        if(name.IndexOf(':') >= 0) return false;
        foreach(string s in name.Replace('\\', '/').Split('/'))
            if(s == "..") return false;
        return true;
    }

    /* 本地头里的名字/附加长度和中央目录里可能不一样，取数据起点以本地头为准 */
    static long DataStart(FileStream fs, long localHeader)
    {
        long back = fs.Position;
        fs.Seek(localHeader, SeekOrigin.Begin);
        byte[] lh = new byte[30];
        fs.Read(lh, 0, 30);
        if(U32(lh, 0) != 0x04034b50) throw new Exception("包里文件头对不上");
        long at = localHeader + 30 + U16(lh, 26) + U16(lh, 28);
        fs.Seek(back, SeekOrigin.Begin);
        return at;
    }

    static long Copy(Stream src, Stream dst)
    {
        byte[] buf = new byte[1 << 20];
        long n0 = 0;
        int n;
        while((n = src.Read(buf, 0, buf.Length)) > 0)
        {
            dst.Write(buf, 0, n);
            n0 += n;
        }
        return n0;
    }

    static long Copy(Stream src, Stream dst, Action<long> tick)
    {
        byte[] buf = new byte[1 << 20];
        long n0 = 0;
        int n;
        while((n = src.Read(buf, 0, buf.Length)) > 0)
        {
            dst.Write(buf, 0, n);
            n0 += n;
            if(tick != null) tick(n);
        }
        return n0;
    }

    /* 包里的一个小文件整个读进内存（就用来看那份安装标记） */
    static byte[] ReadEntry(FileStream fs, long zipStart, Entry it)
    {
        fs.Seek(DataStart(fs, zipStart + it.LocalOff), SeekOrigin.Begin);
        byte[] raw = new byte[it.CSize];
        fs.Read(raw, 0, raw.Length);
        if(it.Method == 0) return raw;
        using(MemoryStream ms = new MemoryStream(raw))
        using(DeflateStream ds = new DeflateStream(ms, CompressionMode.Decompress))
        using(MemoryStream outm = new MemoryStream())
        {
            Copy(ds, outm);
            return outm.ToArray();
        }
    }

    /* 标记里那一行给人看的版本号（"label" 那一个字段）：不引 JSON 库，掐字符串够用 */
    static string MarkerLabel(FileStream fs, Payload pl)
    {
        Entry it = pl.Items.Find(delegate(Entry e){ return e.Name == "flow-desk-install.json"; });
        if(it == null) return "";
        try{ return Snipe(Encoding.UTF8.GetString(ReadEntry(fs, pl.Start, it))); }
        catch(Exception){ return ""; }
    }

    /* ---------- 正事：把尾巴上那一包摊到 dest 里 ---------- */
    class Result { public int Files; public long Bytes; public string Error; }

    /* 外46：本体带着插件一起出门（他 2026-10-10 定）。活的这一格（data\plugins\）是「改代码」直接改的地方 ——
       目标已经有了同一个名字就不再动它：覆盖升级把用户改过的 main.js 换回出厂那一份就是弄丢他写的东西。
       要换回出厂有那颗「恢复出厂」（取 data\plugins-factory\）。原版那一格不在这条前缀里（斜杠挡着），照旧覆盖。
       占用检查、旧的搬备份、新的摊出去三处共用这一颗判定 —— 少管一处就是丢东西。 */
    static bool KeepUserFile(string dest, Entry it)
    {
        if(!it.Name.StartsWith("data/plugins/")) return false;
        return File.Exists(Path.Combine(dest, it.Name.Replace('/', Path.DirectorySeparatorChar)));
    }

    static Result Extract(string self, Payload pl, string dest, Action<long, long> onProgress)
    {
        Result r = new Result();
        try{
            long total = pl.Total, done = 0;
            using(FileStream fs = File.OpenRead(self))
            {
                foreach(Entry it in pl.Items)
                {
                    if(!Clean(it.Name)){ r.Error = "包里有跳出去的路径：" + it.Name; return r; }
                    if(KeepUserFile(dest, it)) continue;   /* 用户改过的那一份不覆盖 */
                    string to = Path.Combine(dest, it.Name.Replace('/', Path.DirectorySeparatorChar));
                    Directory.CreateDirectory(Path.GetDirectoryName(to));
                    fs.Seek(DataStart(fs, pl.Start + it.LocalOff), SeekOrigin.Begin);
                    Stream src = it.Method == 0
                        ? (Stream)new Bound(fs, it.CSize)
                        : new DeflateStream(new Bound(fs, it.CSize), CompressionMode.Decompress);
                    using(src)
                    using(Stream w = new FileStream(to, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        long got = Copy(src, w, null);
                        if(got != it.USize){ r.Error = it.Name + " 摊出来的字节数不对（" + got + " ≠ " + it.USize + "），这一包别用了。"; return r; }
                        done += got;
                    }
                    r.Files++; r.Bytes += it.USize;
                    if(onProgress != null) onProgress(done, total);
                }
            }
        }catch(Exception e){ r.Error = e.Message; }
        return r;
    }

    /* ---------- 覆盖升级用的三件事 ---------- */
    static string Stamp(){ return DateTime.Now.ToString("yyyyMMdd-HHmmss"); }

    /* 这一棵现在装的是哪一版：读树根那份 flow-desk-install.json 里 label 那一行（首装那一步写进去的）。
       不引 JSON 库，掐字符串就够 —— 读不出来当"没记版本号"，不影响覆盖这件事。 */
    static string Snipe(string txt)
    {
        int i = txt.IndexOf("\"label\"");
        if(i < 0) return "";
        int a = txt.IndexOf('"', txt.IndexOf(':', i) + 1);
        int b = txt.IndexOf('"', a + 1);
        if(a < 0 || b <= a) return "";
        return txt.Substring(a + 1, b - a - 1);
    }
    static string TreeLabel(string dest)
    {
        try{ return Snipe(File.ReadAllText(Path.Combine(dest, "flow-desk-install.json"), Encoding.UTF8)); }
        catch(Exception){ return ""; }
    }

    /* 正开着的程序会把它自己那颗 exe 和几个 dll 咬住，Windows 当场不让写。
       动手之前先把要覆盖的每一个文件问一遍能不能独占打开 —— 摊到一半卡住留下半新一半旧的树，
       比不开这一趟糟得多。返回咬住的那一个的名字，全能写就返回空。 */
    static string Busy(string dest, Payload pl)
    {
        foreach(Entry it in pl.Items)
        {
            string to = Path.Combine(dest, it.Name.Replace('/', Path.DirectorySeparatorChar));
            if(KeepUserFile(dest, it)) continue;   /* 这一张本来就不打算写，不必问它能不能咬住 */
            if(!File.Exists(to)) continue;
            try{ using(FileStream t = new FileStream(to, FileMode.Open, FileAccess.Write, FileShare.None)){ } }
            catch(IOException){ return it.Name; }
            catch(UnauthorizedAccessException){ return it.Name; }
        }
        return null;
    }

    /* 旧的先去备份，再让新的进来 —— 落点是一台机器自己的更新账那一格（update\backups\<时间戳>\），
       设置 → 程序 那一屏列的就是这些格子。两档口径是有理由的：
         src\ 整层挪 —— 那一格是程序自己的源码，装好的那一棵里没有一个用户写的东西，
                        挪干净才不会留下上一版的散文件；
         别的一个文件挪一份 —— pages\ 同时是他放文稿的地方，整层挪走等于把他的稿子搬空。
       中途挪不动就停下：已经挪走的都在那一格里，照着挪回去就还是上一版。 */
    static Result Stash(string dest, Payload pl, string back)
    {
        Result r = new Result();
        string srcLayer = Path.Combine(dest, "src");
        if(Directory.Exists(srcLayer))
        {
            string to = Path.Combine(back, "src");
            try{
                Directory.CreateDirectory(Path.GetDirectoryName(to));
                Directory.Move(srcLayer, to);
                r.Files++;
            }catch(Exception e){ r.Error = "旧的 src\\ 那一层挪不动：" + e.Message; return r; }
        }
        foreach(Entry it in pl.Items)
        {
            if(KeepUserFile(dest, it)) continue;   /* 也不把他那一份搬进备份 */
            if(it.Name.StartsWith("src/")) continue;
            string from = Path.Combine(dest, it.Name.Replace('/', Path.DirectorySeparatorChar));
            if(!File.Exists(from)) continue;
            try{
                string to = Path.Combine(back, it.Name.Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(Path.GetDirectoryName(to));
                File.Move(from, to);
                r.Files++;
            }catch(Exception e){ r.Error = "旧的 " + it.Name + " 挪不动：" + e.Message; return r; }
        }
        return r;
    }

    /* ---------- 窗口上那几句话摆在这一格（2026-10-13 他指着这一格说「这里的文字也要提供修改」）----------
       一句一行、句子里不夹换行：「界面文字」那份清单是一行一句的，要换行的在拼的时候接 NL。
       改完这一份要重新打包才看得见 —— 编首装壳那一步比的是这份文件的时间戳，改完必重编。 */
    static readonly string NL = "\r\n";
    static readonly string UiFlavor = "Flow-Desk 便携版";
    static readonly string UiFailed = "没弄成：";
    static readonly string UiDidUp = "覆盖升级了 ";
    static readonly string UiDidNew = "摊好 ";
    static readonly string UiFilesOf = " 个文件 · ";
    static readonly string UiOk = "弄好了 · ";
    static readonly string UiDropTo = "摊到这儿（整个文件夹挪走就算卸载，不写注册表）：";
    static readonly string UiUpHave = "这一棵已经装了 ";
    static readonly string UiUpInto = "这一次覆盖成 ";
    static readonly string UiUpStash = " · 旧的先挪进 update\\backups\\<这一趟>，data\\ 一个字节不动";
    static readonly string UiUpHere = "就是这儿：";
    static readonly string UiBusyHead = "这一棵正在开着，先别动它：";
    static readonly string UiBusyFiles = "正被咬住的文件：";
    static readonly string UiBusyQuit = "把它退干净（右下角托盘图标上右键 → 退出），再点一次。一个字节都还没动。";
    static readonly string UiOldAllIn = "已经挪走的旧文件都在";
    static readonly string UiPutBack = "照着挪回去就还是上一版。";
    static readonly string UiHalfIn = "已经摊出来的那一半在";
    static readonly string UiDeleteRetry = "整个文件夹删掉重来就行。";
    static readonly string UiOldAt = "旧的在 ";

    /* ---------- 界面：一句话 + 目标目录 + 一根进度条，别整花活 ---------- */
    class Dlg : Form
    {
        public TextBox Box;
        public Button Go, Pick;
        public ProgressBar Bar;
        public Label Info, Stat;
        public Dlg(string label, string def, bool upgrade, string cur)
        {
            Text = upgrade ? "Flow-Desk 覆盖升级" : "Flow-Desk 首装";
            StartPosition = FormStartPosition.CenterScreen;
            MaximizeBox = false;
            ClientSize = new Size(520, 214);
            Info = new Label();
            Info.Left = 16; Info.Top = 14; Info.Width = 488; Info.Height = 52;
            Info.Text = upgrade
                ? UiUpHave + cur + NL + UiUpInto + label + NL + UiUpStash + NL + UiUpHere
                : label + NL + UiDropTo;
            Box = new TextBox();
            Box.Left = 16; Box.Top = 72; Box.Width = 400; Box.Text = def;
            Pick = new Button();
            Pick.Left = 424; Pick.Top = 68; Pick.Width = 80; Pick.Height = 26; Pick.Text = "换个地方";
            Pick.Click += delegate{
                using(FolderBrowserDialog f = new FolderBrowserDialog()){
                    f.SelectedPath = Box.Text;
                    if(f.ShowDialog(this) == DialogResult.OK) Box.Text = f.SelectedPath;
                }
            };
            Go = new Button();
            Go.Left = 16; Go.Top = 108; Go.Width = 120; Go.Height = 30;
            Go.Text = upgrade ? "覆盖升级" : "开始安装";
            Bar = new ProgressBar();
            Bar.Left = 16; Bar.Top = 150; Bar.Width = 488; Bar.Height = 14; Bar.Maximum = 1000;
            Stat = new Label();
            Stat.Left = 16; Stat.Top = 172; Stat.Width = 488; Stat.Height = 20; Stat.Text = "还没开始";
            Controls.Add(Info); Controls.Add(Box); Controls.Add(Pick); Controls.Add(Go);
            Controls.Add(Bar); Controls.Add(Stat);
        }
    }

    static string DestOf(Dlg d){ return d.Box.Text.Trim().Trim('"'); }

    /* back 不是空 = 这一趟是覆盖升级，旧的就在那一格 */
    /* ---------- 装过的那一棵记在哪一格（外44 五：双击新 exe 要自己找到安装文件夹）----------
       用户目录里一个明文一行，装成一次就记一次；下一次双击新 exe，默认那一行摆的就是它。
       照样能改：框是编辑框，旁边那颗「换个地方」也还在，想挪去别的盘就自己指。
       记不上不算错 —— 顶多回到 exe 旁边那一棵 Flow-Desk 这个默认值。 */
    static string MemoFile()
    {
        return Path.Combine(Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Flow-Desk"), "install.txt");
    }
    static string Memo()
    {
        try{
            string s = File.ReadAllText(MemoFile(), Encoding.UTF8).Trim();
            return s.Length == 0 ? null : s;
        }catch(Exception){ return null; }
    }
    static void MemoWrite(string dest)
    {
        try{
            Directory.CreateDirectory(Path.GetDirectoryName(MemoFile()));
            File.WriteAllText(MemoFile(), dest + Environment.NewLine, Encoding.UTF8);
        }catch(Exception){}
    }

    /* ---------- 动手那一条道：首装和覆盖升级走同一条 ----------
       认那一棵在不在 → 在就先把要覆盖的每一个文件问一遍能不能写（正开着的一概不动）→
       旧的挪进 update\backups\<这一趟> → 摊新的。码和话一起带回去，界面那头只管摆。 */
    class Job { public int Code; public string Msg; public int Files; public long Bytes; }

    static Job Install(string self, Payload pl, string dest, Action<long, long> onProgress)
    {
        Job j = new Job();
        bool up = IsTree(dest);
        string back = null;
        if(up)
        {
            string busy = Busy(dest, pl);
            if(busy != null)
            {
                j.Code = 7;
                j.Msg = UiBusyHead + NL + dest + NL + UiBusyFiles + busy + NL + UiBusyQuit;
                return j;
            }
            back = Path.Combine(Path.Combine(Path.Combine(dest, "update"), "backups"), Stamp());
            Result s = Stash(dest, pl, back);
            if(s.Error != null){ j.Code = 4; j.Msg = UiFailed + s.Error + NL + UiOldAllIn + NL + back; return j; }
        }
        Result r = Extract(self, pl, dest, onProgress);
        if(r.Error != null)
        {
            j.Code = 4;
            j.Msg = UiFailed + r.Error +
                (back != null ? NL + UiOldAllIn + NL + back + NL + UiPutBack : NL + UiHalfIn + NL + dest + NL + UiDeleteRetry);
            return j;
        }
        if(!File.Exists(Path.Combine(dest, "Flow-Desk.exe")))
        {
            j.Code = 6; j.Msg = "摊完了，可这棵树的根上没有 Flow-Desk.exe —— 这一包不全，换个下载来源再试。";
            return j;
        }
        j.Code = 0; j.Files = r.Files; j.Bytes = r.Bytes;
        MemoWrite(dest);
        j.Msg = (up ? UiDidUp : UiDidNew) + r.Files + UiFilesOf + MB(r.Bytes) + " → " + dest +
            (up ? NL + UiOldAt + back : "");
        return j;
    }

    static int Finish(Dlg d, Job j, bool run)
    {
        string dest = DestOf(d);
        bool up = IsTree(dest);
        string title = up ? "Flow-Desk 覆盖升级" : "Flow-Desk 首装";
        if(j.Code != 0){
            MessageBox.Show(d, j.Msg, title, MessageBoxButtons.OK,
                j.Code == 7 ? MessageBoxIcon.Warning : MessageBoxIcon.Error);
            if(j.Code == 7){   /* 没动他那一棵：话摆完把按钮放开，退了再点一次 */
                try{ d.Go.Enabled = true; d.Pick.Enabled = true; d.Box.Enabled = true; d.Stat.Text = "那一棵正在开着，先退干净"; }catch(Exception){ }
            }
            return j.Code;
        }
        try{ d.Bar.Value = 1000; d.Stat.Text = UiOk + j.Files + UiFilesOf + MB(j.Bytes) +
            (up ? " · 旧的在 update\\backups 里" : "") + (run ? "，这就开" : ""); }catch(Exception){ }
        if(run) Launch(dest);
        Thread.Sleep(700);
        return 0;
    }

    [STAThread]
    static int Main(string[] argv)
    {
        string self = Process.GetCurrentProcess().MainModule.FileName;
        string dest = null;
        bool run = true, quiet = false;
        foreach(string a in argv)
        {
            if(a.StartsWith("--dest=")) dest = a.Substring(7);
            else if(a == "--no-run") run = false;
            else if(a == "--quiet") quiet = true;
        }
        if(string.IsNullOrEmpty(dest))
        {
            /* 命令行没指地方：先用上一次装过记下的那一棵，没有才回到 exe 旁边那棵 Flow-Desk */
            string memo = Memo();
            dest = string.IsNullOrEmpty(memo) ? Path.Combine(Path.GetDirectoryName(self), "Flow-Desk") : memo;
        }
        dest = Path.GetFullPath(dest);

        Payload pl = Open(self);
        if(pl == null){ Say(quiet, "这个 exe 后面没有包，摊不出东西来（要么它不是发布出来的首装包，要么拷贝/下载被截断了）。"); return 3; }
        /* 树根那份标记里记的是这一趟打包的号（publish 写的 label）；顶上那句系列话住在上面那一格，改得动 */
        string fd = "";
        using(FileStream fs = File.OpenRead(self)) fd = MarkerLabel(fs, pl);
        string label = string.IsNullOrEmpty(fd) ? UiFlavor : UiFlavor + " " + fd;

        if(quiet)
        {
            Job j = Install(self, pl, dest, null);
            Console.WriteLine(j.Msg);
            if(j.Code == 0 && run) Launch(dest);
            return j.Code;
        }

        /* 窗口上那一句按默认那一条目录摆；他要是换了地方，动手那一趟重算（见下面点「开始」那一段） */
        bool atDefault = IsTree(dest);
        Application.EnableVisualStyles();
        Dlg d = new Dlg(label, dest, atDefault, atDefault ? TreeLabel(dest) : "");
        int code = 5;   /* 5 = 没点安装就关了 */
        d.Go.Click += delegate{
            d.Go.Enabled = false; d.Pick.Enabled = false; d.Box.Enabled = false;
            Thread th = new Thread(delegate(){
                Job j = Install(self, pl, DestOf(d), delegate(long done, long total){
                    try{
                        d.BeginInvoke((Action)delegate{
                            d.Bar.Value = total <= 0 ? 0 : (int)Math.Min(1000, done * 1000 / total);
                            d.Stat.Text = "正在摊开 " + MB(done) + " / " + MB(total);
                        });
                    }catch(Exception){}
                });
                code = Finish(d, j, run);
                /* 7 = 那一棵正开着，一个字节都没动：话摆完让他退了再点一次，窗口留着 */
                if(code != 7) try{ d.BeginInvoke((Action)delegate{ d.Close(); }); }catch(Exception){}
            });
            th.IsBackground = true;
            th.Start();
        };
        Application.Run(d);
        return code;
    }

    static void Launch(string dest)
    {
        try{
            ProcessStartInfo si = new ProcessStartInfo(Path.Combine(dest, "Flow-Desk.exe"));
            si.WorkingDirectory = dest;
            si.UseShellExecute = true;
            Process.Start(si);
        }catch(Exception){}
    }

    static bool IsTree(string dest)
    {
        /* 认这一棵是不是「装过的程序」：认那颗门牌 —— 桥与命令都编在这颗 exe 里面，
           只放稿子的文件夹里没有这一颗，所以不会把他的目录认成程序那一棵。 */
        return File.Exists(Path.Combine(dest, "Flow-Desk.exe"));
    }

    static string MB(long b){ return (b / 1048576.0).ToString("0.#") + " MB"; }

    static void Say(bool quiet, string msg)
    {
        if(quiet){ Console.WriteLine(msg); return; }
        MessageBox.Show(msg, "Flow-Desk 首装", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }
}
