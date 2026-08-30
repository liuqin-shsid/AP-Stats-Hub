# AP Stats 小站

这是可直接发布的静态网站。请保持以下文件位于同一文件夹：

- `index.html`
- `style.css`
- `app.js`
- `linear-regression-data.xlsx`

发布步骤：

1. 登录 GitHub，点击右上角的 **+ → New repository**，仓库名可填写 `ap-stats-site`，选择 **Public**，然后点击 **Create repository**。
2. 在新仓库点击 **Add file → Upload files**，把本文件夹中的四个文件全部拖进去，点击 **Commit changes**。
3. 点击仓库上方的 **Settings → Pages**；在 **Build and deployment** 中将 Source 设为 **Deploy from a branch**，Branch 选择 **main** 和 **/(root)**，点击 **Save**。
4. 等待约 1–3 分钟，刷新此页面。页面顶部会出现网站地址，复制后即可发给学生。

以后如果要更新，只需在仓库里替换同名的 Excel 文件或网页文件，网站地址不会改变。

注意：网页首次打开需要联网，以便读取图表所需的公开 JavaScript 库。
