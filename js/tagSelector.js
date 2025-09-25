/**
 * TaskPixel 标签选择器组件 (已重构为 TagDisplay 代理)
 * 为向后兼容性保留此文件
 */

TaskPixel.TagSelector = {
  // 创建标签选择器 (代理到 TagDisplay)
  create: function (selectedTags = [], options = {}) {
    console.warn(
      "TagSelector.create 已废弃，请使用 TagDisplay.createTagSelector"
    );
    return TaskPixel.TagDisplay.createTagSelector(selectedTags, options);
  },

  // 获取选中的标签 (代理到 TagDisplay)
  getSelectedTags: function (selectorContainer) {
    console.warn(
      "TagSelector.getSelectedTags 已废弃，请使用 TagDisplay.getSelectedTags"
    );
    return TaskPixel.TagDisplay.getSelectedTags(selectorContainer);
  },

  // 设置选中的标签 (代理到 TagDisplay)
  setSelectedTags: function (selectorContainer, tagIds) {
    console.warn(
      "TagSelector.setSelectedTags 已废弃，请使用 TagDisplay.setSelectedTags"
    );
    return TaskPixel.TagDisplay.setSelectedTags(selectorContainer, tagIds);
  },

  // 显示创建标签对话框 (代理到 TagDisplay)
  showCreateTagDialog: function (onSuccess) {
    console.warn(
      "TagSelector.showCreateTagDialog 已废弃，请使用 TagDisplay.showCreateTagDialog"
    );
    return TaskPixel.TagDisplay.showCreateTagDialog(onSuccess);
  },
};
