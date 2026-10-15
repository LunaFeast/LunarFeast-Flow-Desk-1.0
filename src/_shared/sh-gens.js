/* ---------- 推演登记处：哪一家做了哪些推演，报一份给主程序（插件分离第 4 批 4.3 · #35）----------
   从前为写要列「我能调用哪些推演」，看的是推演定制那一家的顶层名字（`typeof Gen !== 'undefined' ? Gen.list() : []`，
   w3-shell.js 里三处都这么读；连主程序自己那份推演记录面板 sh-log.js 也这么读）。
   那是两家直接伸手摸对方的注册表：一家改了形状，另一家跟着坏，分开搬仓之后更是够不着。
   这一节把中间那一份摆到主程序来，三条规矩：
     · 登 —— 推演定制每注册一张配方就顺手往这里登一份（开机加载器一家家 import 就是「每次启动登记一次」；
       向导存新配方、完全删除走的也是同一颗 Gen.def / Gen.remove，所以「有变动自动更新」是这一处的副作用，不另设轮询）；
     · 读 —— 为写和推演记录那一排只向这里要名单与内容，不再认那一家的名字；
     · 手 —— 「替别人把向导打开」「整户重报一遍」「把别处导出的配方 JSON 装回来」这三颗手由登记者自己挂上来：
       主程序不认识任何一张配方，它只管收着、递话。为写那块手动刷新缓存的钮吃的就是「重扫」那颗。
   这份缓存住在内存里：每次启动由登记者填，平时按它走，不重复扫盘。
   来源那一栏记的是哪一家登的 —— 撤的时候只许撤自己那一家的，别人家的条目一律不动。
   三颗手在表里的名字（wizard / rescan / importer）用英文：这一份是两家之间的协议名，
   不是给人看的句子 —— 写成中文会被「改软件全部页面文字」那台小工具扫进界面文字清单里，清单里就多几条假句子。 */
const GenReg = {
  表:new Map(),      /* 配方 id → { R 那份配方, 来源 哪一家登的 } */
  手:{},             /* 来源 → { wizard, rescan, importer }，三颗都由登记者挂上来 */
  登(R, 来源){
    if(!R || !R.id) return false;
    this.表.set(R.id, { R, 来源:String(来源 || '') });
    return true;
  },
  /* 整户重报：只清这一家自己登的那些，别家的条目留着 */
  整批换(几份, 来源){
    const 谁 = String(来源 || '');
    for(const [id, 格] of [...this.表]) if(格.来源 === 谁) this.表.delete(id);
    for(const R of (几份 || [])) this.登(R, 来源);
    return this.有几张();
  },
  撤(id, 来源){
    const 格 = this.表.get(id);
    if(!格) return false;
    if(来源 && 格.来源 && 格.来源 !== String(来源)) return false;
    this.表.delete(id);
    return true;
  },
  挂手(o, 来源){
    const 谁 = String(来源 || '');
    this.手[谁] = Object.assign({}, this.手[谁], o);
    return true;
  },
  有那颗(那颗){ return Object.keys(this.手).some(k => typeof this.手[k][那颗] === 'function'); },
  开那颗(那颗){
    for(const k of Object.keys(this.手)){ const f = this.手[k][那颗]; if(typeof f === 'function') return f; }
    return null;
  },
  /* 给读的一头：名单只给摘要（哪几张、叫什么），要点开向导或跑生成的人才再要内容 */
  名单(){
    return [...this.表.values()].map(格 => ({
      id:格.R.id, name:格.R.name, icon:格.R.icon || '', desc:格.R.desc || '', 来源:格.来源 }));
  },
  内容(id){ const 格 = this.表.get(id); return 格 ? 格.R : null; },
  有几张(){ return this.表.size; },
  /* 三颗手的门面：没挂上时 有向导 / 有导入 回 false，读的一头自己决定那一整块摆不摆（空壳不提示缺失）；
     刷新没人挂「重扫」时也只报现值几张，回的是一个数，不抛也不回 null。 */
  有向导(){ return this.有那颗('wizard'); },
  开向导(id){ const f = this.开那颗('wizard'); if(!f) return false; f(id); return true; },
  有导入(){ return this.有那颗('importer'); },
  开导入(重画){ const f = this.开那颗('importer'); if(!f) return false; f(重画); return true; },
  async 刷新(){
    const f = this.开那颗('rescan');
    if(f) await f();
    return this.有几张();
  }
};
