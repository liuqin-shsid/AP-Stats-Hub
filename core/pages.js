/* 页面清单 —— 新增一个页面，在这里加一条即可。
   tool     侧边栏按钮的 data-tool 值，也是 apstats:tool 事件的 detail
   pageId   页面容器 div 的 id
   titleKey 浏览器标签页标题用的翻译键
   顺序 = 侧边栏顺序。 */
const PAGES = [
  { tool:'correlation', pageId:'correlationPage', titleKey:'heading_title' },
  { tool:'scatter',     pageId:'scatterPage',     titleKey:'scatter_title' },
  { tool:'outlier',     pageId:'outlierPage',     titleKey:'outlier_title' },
  { tool:'linear',      pageId:'linearPage',      titleKey:'linear_title' },
  { tool:'sampling',    pageId:'samplingPage',    titleKey:'sampling_title' },
  { tool:'proportion',  pageId:'proportionPage',  titleKey:'proportion_title' },
];
