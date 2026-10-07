/* 定量数据集的描述。
   pick    从 Excel 行里取出数值（顺便清洗筛选），返回 null 表示丢弃该行
   label   可选，用于图上悬停提示
   displays 这份数据要展示哪几种图，按顺序排布：
            hist 直方图 / dot 点图 / stem 茎叶图 / ogive 累积频率曲线 / box 箱线图
            —— 点图和茎叶图只适合小数据量，所以不是每份数据都给。 */
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
    displays: ['hist', 'dot', 'stem', 'box'],
    pick: r => num(r['Score']),
    label: r => r['State'],
  },
  {
    id: 'creditCard',
    file: 'data/source/Ch04_credit_card_expense.xls',
    name: { zh: '信用卡月均消费', en: 'Monthly Credit-Card Spending' },
    note: { zh: '教材 Ch4「描述直方图」示例 · 500 名持卡人，强右偏', en: 'Textbook Ch4 "Describing histograms" · 500 cardholders, strongly right-skewed' },
    variable: { zh: '月均消费（美元）', en: 'Average Monthly Spend ($)' },
    displays: ['hist', 'ogive', 'box'],
    pick: r => num(r['Average Monthly Spend']),
  },
];
