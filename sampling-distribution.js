/* Sampling Distribution：浏览器版。
   把 Python/matplotlib 版本改成纯前端 SVG + 伪随机抽样。
   依赖 app.js 中的 translations、$、escapeHtml、scale、ticks、fmt 等全局函数。 */
(() => {
  Object.assign(translations.zh, {
    sampling_title:'抽样分布',
    sampling_desc:'从总体中反复抽样，观察样本均值的抽样分布如何趋近正态。',
    sampling_population:'总体分布',
    sampling_normal:'正态分布',
    sampling_uniform:'均匀分布',
    sampling_custom:'自定义（手绘）',
    sampling_sample_size:'样本量 n',
    sampling_draws:'每次抽样次数',
    sampling_run:'开始抽样',
    sampling_reset:'重置',
    sampling_pop_title:'(1) 总体分布',
    sampling_sample_title:'(2) 最近一次样本',
    sampling_means_title:'(3) 样本均值的抽样分布',
    sampling_pop_aria:'总体分布直方图',
    sampling_sample_aria:'最近一次样本的直方图',
    sampling_means_aria:'样本均值的抽样分布直方图',
    sampling_hint_normal:'当前总体为正态分布。点击“开始抽样”，观察样本均值的分布。',
    sampling_hint_uniform:'当前总体为均匀分布。样本量越大，样本均值的抽样分布越接近正态。',
    sampling_hint_custom:'请在上方总体图中按住鼠标手绘一条密度曲线，松开后生成总体。',
    sampling_hint_custom_ready:'自定义总体已生成。点击“开始抽样”查看样本均值分布。',
    sampling_hint_custom_empty:'手绘曲线