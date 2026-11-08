/* 页面与侧边栏分组清单 */
const NAV_GROUPS = [
  { key:'display',     labelKey:'nav_display' },
  { key:'linreg',      labelKey:'nav_linreg' },
  { key:'probability', labelKey:'nav_probability' }, // 新增：概率模型分支
  { key:'sampling',    labelKey:'nav_sampling' },
];

const PAGES = [
  { tool:'categorical', group:'display',  pageId:'catPage',         titleKey:'cat_title' },
  { tool:'quantitative', group:'display', pageId:'quantPage',       titleKey:'quant_title' },
  { tool:'compare',      group:'display', pageId:'cmpPage',         titleKey:'cmp_title' },
  { tool:'correlation',  group:'linreg',  pageId:'correlationPage', titleKey:'heading_title' },
  { tool:'scatter',      group:'linreg',  pageId:'scatterPage',     titleKey:'scatter_title' },
  { tool:'outlier',      group:'linreg',  pageId:'outlierPage',     titleKey:'outlier_title' },
  { tool:'linear',       group:'linreg',  pageId:'linearPage',      titleKey:'linear_title' },
  { tool:'zscore',       group:'linreg',  pageId:'zscorePage',      titleKey:'zscore_title' },
  // 将二项分布移入概率模型分支
  { tool:'binomial',     group:'probability', pageId:'binomialPage', titleKey:'binomial_title' },
  { tool:'sampling',     group:'sampling', pageId:'samplingPage',   titleKey:'sampling_title' },
  { tool:'proportion',   group:'sampling', pageId:'proportionPage', titleKey:'proportion_title' },
];
