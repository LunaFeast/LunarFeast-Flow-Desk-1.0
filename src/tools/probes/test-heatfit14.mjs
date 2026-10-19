/* issue #14（他 2026-10-19）：为写「写作统计」那一面在窄的地方要自动缩小，不许出内部滚动。
   这台钉的是"缩得下来"这件事本身 —— 上一轮改法有一处自己把自己顶住了：
   格子写死 min-width:13px、min-height:13px，边长算到 5 像素也不动，整排在 overflow:hidden 里被切掉右边，
   看着像"缩小"其实是被裁。这种错误只有拿 CSS 与算式对着一量才看得出来，所以一条一条钉。 */
import { rd, 切方法, 记账 } from './lib-slice.mjs';

const 台 = 记账('图14 · 写作统计缩而不滚');
const 源 = rd('src/_wnw/src/w21-heat.js');
const 尺 = 切方法(源, '    const 尺 = () => {');
const 装 = 切方法(源, '  async mount(){');

台.题('一、不许有什么东西把缩小顶住');
{
  const 年 = (源.match(/\.wnw-heat-year i\{[^}]*\}/) || [''])[0];
  台.判('年那一排的小格不再写 min-width / min-height（顶住它就等于白算，剩下那截被 overflow:hidden 裁掉）',
    年.includes('border-radius') && !/min-(width|height)/.test(年), 年);
  const 冒 = 年.replace('border-radius:var(--r-btn,5px);', 'border-radius:var(--r-btn,5px);min-width:13px;min-height:13px;');
  台.判('反证 · 把 min-width 与 min-height 加回那一条，这一道立刻叫（钉的是那两条规则本身，注释里提一嘴不算数）',
    冒 !== 年 && /min-width/.test(冒), 冒.slice(0, 88));
  台.判('整块不滚：外面那层 overflow:hidden，里头那一排吃 100% 宽且 min-width:0（flex 里不写 min-width:0 就顶不开）',
    /\.wnw-heat\{overflow:hidden/.test(源) && /\.wnw-heat-body\{[^}]*width:100%;min-width:0/.test(源));
  台.判('当年那条撑开横向滚的 width:max-content 一句不留（剥掉注释再扫：那两句交代历史的注释留在原地）',
    !/max-content/.test(源.replace(/\/\*[\s\S]*?\*\//g, ' ')));
}

台.题('二、边长怎么算、算出来的那一个真被 CSS 吃');
{
  台.判('上下都给了档：最小 3 像素（再小就糊成一条线）、最大回到原来的 13，取的是这一格可用宽度减去那一列与每道缝',
    尺.includes('Math.max(3, Math.min(13, 格))') && 尺.includes("(列 - 1) * 缝") && /const 侧 = 月 \? 0 : 18, 缝 = 月 \? 4 : 3;/.test(尺));
  台.判('量不到宽度就不写这一笔（还没进布局时拿 0 去算会把格子夹成最小那一档）',
    /if\(!\(宽 > 0\)\) return;/.test(尺));
  台.判('算出来的那一个写进 --hc，且 CSS 里真有人吃它：列宽、行高、星期那一列的行高、月那一排的列宽四处同一个变量',
    尺.includes("setProperty('--hc'") && /\.wnw-heat-wk\{[^}]*repeat\(7,var\(--hc,13px\)\)/.test(源)
    && /\.wnw-heat-year\{[^}]*repeat\(7,var\(--hc,13px\)\)/.test(源)
    && /\.wnw-heat-year\{[^}]*grid-auto-columns:var\(--hc,13px\)/.test(源)
    && /grid-template-columns:repeat\(' \+ cols \+ ',var\(--hc,13px\)\)/.test(源));
  台.判('左边那列「一三五日」跟着一起缩：行高就是 --hc，字号也按 --hc 收（写到最小 6 像素为止），不然七行字叠成一团',
    /\.wnw-heat-wk i\{[^}]*line-height:var\(--hc,13px\)/.test(源)
    && /\.wnw-heat-wk i\{[^}]*font-size:max\(6px,calc\(var\(--hc, 13px\) - 4px\)\)/.test(源));
  台.判('不留没人吃的变量：JS 里 setProperty 写过的每一条，CSS 里都找得到 var 那一只（上一轮的 --hm 就是这种白写的）',
    [...new Set([...源.matchAll(/setProperty\('(--[a-z]+)'/g)].map(m => m[1]))]
      .every(量 => 源.includes('var(' + 量)),
    [...new Set([...源.matchAll(/setProperty\('(--[a-z]+)'/g)].map(m => m[1]))].join(' '));
}

台.题('三、这一眼挂上去与摘下来（缩是量出来的，量不能攒）');
{
  台.判('盯的是这一格自己（不是窗口）：拖窄停靠栏那一栏、换精简版都算得着',
    /new ResizeObserver\(尺\)/.test(装) && 装.includes('盯.observe(this.body)'));
  台.判('重挂之前先把上一眼摘掉（每画一遍攒一眼，画几十遍就把这一面盯死了）',
    /if\(this\.尺停\) this\.尺停\(\);/.test(装) && 装.includes('this.尺停 = () => 盯.disconnect();'));
  台.判('关掉这一面也摘：这一眼跟着旁边那三句 Bus.on 走同一个 ctx.dispose 的口子',
    /this\.ctx\.dispose\(this\.尺停\)/.test(装) && /this\.ctx\.dispose\(f\)/.test(装));
  台.判('算完当场先量一遍（不等第一次 resize，否则刚打开那一屏还是 13 像素撑着的旧样子）',
    /if\(this\.尺\) this\.尺\(\);/.test(源));
}

台.收尾();
