/* 数据集：工作表内容与中英文名称映射。
   数据本身由 data/*.js 预先生成（见 tools/build-data.js），各页面共用这里的 sheets。 */

/* sheetName -> 行对象数组 */
let sheets = {};

/* 英文界面下，Excel 的工作表名和变量名显示为对应英文；数据本身不变。 */
const englishSheetNames = {
  '1.海拔-气温': '1. Altitude–Temperature',
  '2.冰淇淋-空调销量': '2. Ice Cream–Air Conditioner Sales',
  '3.年龄-握力': '3. Age–Grip Strength',
  '4.酒精浓度-反应时间': '4. Blood Alcohol Concentration–Reaction Time',
  '5.身高-体重': '5. Height–Weight',
  '身高-体重分析': 'Height–Weight Analysis',
  '6.鞋码-GPA': '6. Shoe Size–GPA',
  '7.计算机使用-学习效果': '7. Computer Use–Learning Outcomes',
  '8.学习时长-考试成绩': '8. Study Time–Exam Score',
};
const englishVariableNames = {
  '性别': 'Gender', '海拔高度 (m)': 'Altitude (m)', '气温 (°C)': 'Temperature (°C)',
  '冰淇淋销量 (件/周)': 'Ice Cream Sales (units/week)', '空调销量 (台/周)': 'Air Conditioner Sales (units/week)',
  '年龄 (岁)': 'Age (years)', '握力 (kg)': 'Grip Strength (kg)',
  '血液酒精浓度 (%)': 'Blood Alcohol Concentration (%)', '反应时间 (秒)': 'Reaction Time (seconds)',
  '身高 (cm)': 'Height (cm)', '体重 (kg)': 'Weight (kg)', '身高（in)': 'Height (in)', '体重（lb)': 'Weight (lb)',
  '鞋码 (码)': 'Shoe Size', '平均学分绩点 (GPA)': 'Grade Point Average (GPA)',
  '每周计算机使用时长 (小时)': 'Weekly Computer Use (hours)', '学习效果综合评分': 'Learning Outcome Score',
  '每周学习时长 (小时)': 'Weekly Study Time (hours)', '期末考试成绩 (分)': 'Final Exam Score',
  'zx': 'Standardized Height (zx)', 'zy': 'Standardized Weight (zy)', 'Unnamed: 7': 'Product of z-scores',
};

function displaySheetName(name) { return lang === 'en' ? (englishSheetNames[name] || name) : name; }

function displayVariableName(name) {
  if (lang !== 'en') return name;
  // SheetJS 会给重复的 Excel 表头加 _1、_2 后缀，这里回退到英文基名。
  const base = name.replace(/_\d+$/, '');
  return englishVariableNames[name] || englishVariableNames[base] || name;
}

/* 一份工作表里所有“至少有一个数值”的列。 */
function numericColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter(k => rows.some(r => Number.isFinite(Number(r[k]))));
}
