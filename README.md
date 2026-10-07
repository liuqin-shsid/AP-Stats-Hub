# AP Stats Hub

AP Stats小站，双击 `index.html` 就能用，不需要服务器或联网。数据已经预先转成 JS 放在 `data/` 里，第三方库也都在 `vendor/` 里。右上角可以切换中文 / English。

---

## 目录结构

```
index.html           入口：页面容器 + 脚本清单
style.css            全站样式
core/                共用层（见下）
pages/               每个页面一个文件
data/                网页实际读取的数据（.js，自动生成，别手改）
data/source/         数据源 Excel —— 要改数据就改这里
tools/               数据转换脚本与数据集配置
vendor/              第三方库：SheetJS、PapaParse、jStat、KaTeX
```

`core/` 里：

| 文件 | 负责 |
|---|---|
| `dom.js` | `$`、`escapeHtml`、`setOptions` |
| `plot.js` | 坐标映射、刻度、数值格式 |
| `stats.js` | 回归、五数概括、均值标准差 |
| `i18n.js` | 中英文词条与语言切换 |
| `data.js` | 工作表数据与中英文名称映射 |
| `pages.js` | **页面与侧边栏分组的清单** |
| `router.js` | 页面切换 |
| `sidebar.js` | 依清单生成侧边栏 |
| `boot.js` | 启动：建侧边栏 → 绑定点击 → 落到第一页 |

---

## 想加一个新页面

改 3 个地方：

**1. 新建 `pages/my-page.js`**

```js
(() => {
  // 本页用到的词条写在自己文件里
  Object.assign(translations.zh, { my_title: '我的新页面' });
  Object.assign(translations.en, { my_title: 'My New Page' });

  function render() {
    $('myPage').innerHTML = `<h1>${translations[lang].my_title}</h1>`;
  }

  render();
  document.addEventListener('apstats:tool', e => { if (e.detail === 'mine') render(); });
  document.addEventListener('apstats:language', render);
})();
```

**2. `index.html` 加两行**

```html
<div id="myPage" hidden></div>              <!-- 和其它页面容器放一起 -->
<script src="pages/my-page.js"></script>     <!-- 放在 core/boot.js 之前 -->
```

**3. `core/pages.js` 的 `PAGES` 里加一条**

```js
{ tool:'mine', group:'display', pageId:'myPage', titleKey:'my_title' },
```

侧边栏会自动出现这一项。`PAGES` 的顺序就是侧边栏顺序，**第一条是打开网页的默认页**。想新建一个分组就在 `NAV_GROUPS` 里加一条。

---

## 想给某个页面加数据集

**第一步**：把 Excel 放进 `data/source/`。

**第二步**：在对应的配置文件里加一条。

| 页面 | 配置文件 |
|---|---|
| 分类数据的展示 | `tools/datasets.categorical.js` |
| 定量数据的展示 | `tools/datasets.quantitative.js` |
| 比较分布 | `tools/datasets.grouped.js` |

例如给「定量数据的展示」加一份：

```js
{
  id: 'myData',
  file: 'data/source/我的数据.xls',
  name: { zh: '我的数据', en: 'My Data' },
  note: { zh: '数据来源说明', en: 'Where it came from' },
  variable: { zh: '身高 (cm)', en: 'Height (cm)' },
  displays: ['hist', 'dot', 'stem', 'box'],   // 要显示哪几种图
  pick: r => Number(r['身高']),                // 从 Excel 行里取数值
}
```

`displays` 可选：`hist` 直方图、`dot` 点图、`stem` 茎叶图、`ogive` 累积频率曲线、`box` 箱线图。点图和茎叶图只适合小数据量（几十到一两百），数据多了改用直方图。

**第三步**：在仓库根目录跑一次转换。

```bash
npm run build:data
```

刷新网页就有了。（第一次用需要先 `npm install` 装转换脚本的依赖；网站本身不需要。）

---

## 发布到网上

仓库推到 GitHub 后，在 **Settings → Pages** 把 Source 设为 **Deploy from a branch**，分支选 `main`、目录选 `/(root)`，保存后等 1–3 分钟就有网址了。以后更新只要推代码，网址不变。
