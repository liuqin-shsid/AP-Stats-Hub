/* 定量数据集的描述。
   pick 负责从 Excel 行里取出数值（顺便做清洗与筛选），返回 null 表示丢弃该行。
   label 可选，用于图上悬停提示。 */
'use strict';

const num = v => (v === null || v === undefined || v === '.' || v === '') ? null
               : (Number.isFinite(Number(v)) ? Number(v) : null);

module.exports = [
  {
    id: 'mathScores',
    file: 'data/source/Ch04_math_scores_2005.xls',
    name: { zh: '各州四年级数学成绩', en: 'Grade-4 Math Scores by State' },
    note: { zh: '教材 Ch4 · 2005 年 NAEP，50 个州', en: 'Textbook Ch4 · NAEP 2005, 50 states' },
    variable: { zh: '数学平均分', en: 'Average Math Score' },
    pick: r => num(r['Score']),
    label: r => r['State'],
  },
  {
    id: 'tsunamiAll',
    file: 'data/source/Ch04_tsunamis.xls',
    name: { zh: '海啸地震震级', en: 'Tsunami Earthquakes' },
    note: { zh: '教材 Ch4 图 4.1 · 1240 次有震级记录的地震', en: 'Textbook Ch4 Figure 4.1 · 1240 quakes with magnitude' },
    variable: { zh: '里氏震级', en: 'Magnitude (Richter)' },
    pick: r => num(r['Magnitude']),
    label: r => r['Country'],
  },
  {
    id: 'creditCard',
    file: 'data/source/Ch04_credit_card_expense.xls',
    name: { zh: '信用卡月均消费', en: 'Monthly Credit-Card Spending' },
    note: { zh: '教材 Ch4「描述直方图」示例 · 500 名持卡人，强右偏', en: 'Textbook Ch4 "Describing histograms" · 500 cardholders, strongly right-skewed' },
    variable: { zh: '月均消费（美元）', en: 'Average Monthly Spend ($)' },
    pick: r => num(r['Average Monthly Spend']),
  },
];
