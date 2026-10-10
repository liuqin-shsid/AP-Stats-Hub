/* 页面与侧边栏分组清单 —— 新增一个页面，在这里加一条即可，
   index.html 和路由都不用动。

   NAV_GROUPS 顺序 = 侧边栏分组顺序；PAGES 顺序 = 组内顺序。
   PAGES 的第一条同时是网页打开时的默认页。 */

const NAV_GROUPS = [
  { key:'display',  labelKey:'nav_display'  },
  { key:'linreg',   labelKey:'nav_linreg'   },
  { key:'sampling', labelKey:'nav_sampling' },
];

/* tool     侧边栏按钮的 data-tool 值，也是 apstats:tool 事件的 detail
   group    所属分组，对应 NAV_GROUPS 的 key
   pageId   页面容器 div 的 id
   titleKey 浏览器标签页标题用的翻译键，同时也是侧边栏按钮文字 */
const PAGES = [
  { tool:'categorical', group:'display',  pageId:'catPage',         titleKey:'cat_title' },
  { tool:'quantitative', group:'display',  pageId:'quantPage',       titleKey:'quant_title' },
  { tool:'compare',     group:'display',  pageId:'cmpPage',         titleKey:'cmp_title' },
  { tool:'correlation', group:'linreg',   pageId:'correlationPage', titleKey:'heading_title' },
  { tool:'scatter',     group:'linreg',   pageId:'scatterPage',     titleKey:'scatter_title' },
  { tool:'outlier',     group:'linreg',   pageId:'outlierPage',     titleKey:'outlier_title' },
  { tool:'linear',      group:'linreg',   pageId:'linearPage',      titleKey:'linear_title' },
  { tool:'zscore',      group:'linreg',   pageId:'zscorePage',      titleKey:'zscore_title' },
  { tool:'sampling',    group:'sampling', pageId:'samplingPage',    titleKey:'sampling_title' },
  { tool:'proportion',  group:'sampling', pageId:'proportionPage',  titleKey:'proportion_title' },
];