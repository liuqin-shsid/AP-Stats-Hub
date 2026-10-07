/* 中英双语。各页面在自己的文件里用 Object.assign(translations.zh/en, {...}) 追加自己的词条。 */

const translations = {
  zh: {
    brand: 'AP Stats Hub',
    sidebar_title: '学习工具',
    nav_linreg: '线性回归教学',
    heading_title: '相关关系探究',
    heading_desc: '拖动数据点，观察最佳拟合线、相关系数与 R² 的变化。',
    label_sheet: '选择案例',
    label_x: 'X 变量',
    label_y: 'Y 变量',
    label_fit: '显示拟合直线',
    label_delete: '删除模式',
    label_reset: '重置数据',
    hint_normal: '提示：直接拖动蓝色数据点；开启删除模式后，点击数据点即可删除。',
    hint_delete: '删除模式已开启：点击红色数据点即可删除。',
    count_label: '数据点：',
    metrics_need_points: '至少需要 2 个数据点进行线性回归。',
    metrics_hidden: '拟合直线已隐藏。',
    loading: '正在读取数据…',
    load_error_option: '数据文件读取失败',
    load_error_hint: '无法读取数据文件 data/regression.js。若改过 data/source/ 里的 Excel，请在仓库根目录执行 npm run build:data 重新生成。',
    lang_button: 'EN',
    empty_chart: '没有数据点，请点击“重置数据”。',
    controls_aria: '控制面板',
    chart_aria: '互动散点图',
    best_fit_line: '最佳拟合直线',
    slope: '斜率',
    intercept: '截距',
  },
  en: {
    brand: 'AP Stats Hub',
    sidebar_title: 'Learning tools',
    nav_linreg: 'Linear Regression',
    heading_title: 'Correlation Explorer',
    heading_desc: 'Drag the data points and watch the best-fit line, correlation, and R² update live.',
    label_sheet: 'Select dataset',
    label_x: 'X variable',
    label_y: 'Y variable',
    label_fit: 'Show best-fit line',
    label_delete: 'Delete mode',
    label_reset: 'Reset data',
    hint_normal: 'Tip: drag the blue points directly; turn on delete mode to click a point and remove it.',
    hint_delete: 'Delete mode is on: click a red point to remove it.',
    count_label: 'Data points: ',
    metrics_need_points: 'At least 2 data points are needed for linear regression.',
    metrics_hidden: 'Best-fit line hidden.',
    loading: 'Loading data…',
    load_error_option: 'Failed to load data file',
    load_error_hint: 'Could not read data/regression.js. If you edited the Excel files in data/source/, run "npm run build:data" in the repository root to regenerate it.',
    lang_button: '中文',
    empty_chart: 'No data points — click "Reset data".',
    controls_aria: 'Controls',
    chart_aria: 'Interactive scatterplot',
    best_fit_line: 'Best-Fit Line',
    slope: 'Slope',
    intercept: 'Intercept',
  },
};
let lang = localStorage.getItem('apstats-lang') || 'zh';

/* 语言切换时需要重绘的页面在这里登记。
   注册顺序 = 执行顺序，且都在 apstats:language 事件派发之前跑完。 */
const languageHooks = [];
function onLanguageApply(fn) { languageHooks.push(fn); }

function applyLang() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => { if (t[el.dataset.i18n] !== undefined) el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { if (t[el.dataset.i18nAria] !== undefined) el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
  document.title = `AP Stats Hub · ${t.heading_title}`;
  $('langToggle').textContent = t.lang_button;
  languageHooks.forEach(fn => fn());
  document.dispatchEvent(new Event('apstats:language'));
}
function setLang(l) { lang = l; localStorage.setItem('apstats-lang', l); applyLang(); }
$('langToggle').addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'));
