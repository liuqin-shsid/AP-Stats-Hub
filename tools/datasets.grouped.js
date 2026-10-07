/* 比较分布（Ch5）用的数据：一个定量变量 + 一个把它分成若干组的分类变量。
   levels 的顺序 = 图表与表格里的组顺序。 */
'use strict';

const num = v => (v === null || v === undefined || v === '') ? null
               : (Number.isFinite(Number(v)) ? Number(v) : null);

module.exports = [
  {
    id: 'populationGrowth',
    file: 'data/source/Ch05_Population_growth.xls',
    name: { zh: '各州人口增长率', en: 'State Population Growth' },
    note: { zh: '教材 Ch5 · 48 个州，按地区分成两组', en: 'Textbook Ch5 · 48 states in two regions' },
    variable: { zh: '人口增长率 (%)', en: 'Percent Change (%)' },
    groupName: { zh: '地区', en: 'Region' },
    value: r => num(r['Percent Change']),
    group: r => r['Region'],
    levels: [
      { v: 'NE/MW', zh: '东北 / 中西部', en: 'Northeast & Midwest' },
      { v: 'S/W',   zh: '南部 / 西部',   en: 'South & West' },
    ],
  },
];
