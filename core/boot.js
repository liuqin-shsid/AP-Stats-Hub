/* 启动：最后加载。此时所有页面都已注册好自己的翻译词条，侧边栏才能带着正确文字生成。 */
buildSidebar();
bindNav();
showTool(PAGES[0].tool);   // 默认停在清单里的第一页
applyLang();
