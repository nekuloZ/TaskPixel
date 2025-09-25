# TaskPixel 标签系统设计方案

## 1. 数据结构设计

### 1.1 标签数据结构

```javascript
// 标签对象结构 - 简单扁平化设计
{
  id: "tag_001",                    // 唯一标识
  name: "前端开发",                 // 标签名称
  display_text: "#前端开发",        // 显示文本（包含#前缀）
  color: "#00FFFF",                 // 荧光色
  description: "前端开发相关任务",   // 标签描述（可选）
  created_at: "2024-01-01T00:00:00.000Z", // 创建时间
  usage_count: 5                    // 使用次数（用于排序和统计）
}
```

### 1.2 目标数据结构扩展

```javascript
// 在现有目标结构中添加标签字段
{
  id: "goal_001",
  title: "完成项目文档",
  description: "编写项目技术文档",
  priority: "高",
  priority_reason: "项目截止日期临近",
  substeps: [...],
  tags: ["tag_001", "tag_002"], // 新增：标签ID数组
  created_at: "2024-01-01T00:00:00.000Z"
}
```

### 1.3 全局数据存储扩展

```javascript
// 在 TaskPixel.DataStore.data 中添加
{
  tasks: [...],
  settings: {...},
  tags: [                    // 新增：全局标签列表
    {
      id: "tag_001",
      name: "前端开发",
      display_text: "#前端开发",
      color: "#00FFFF",
      description: "前端开发相关任务",
      created_at: "2024-01-01T00:00:00.000Z",
      usage_count: 5
    }
  ]
}
```

## 2. 核心功能模块

### 2.1 标签管理模块 (js/tagManager.js)

```javascript
TaskPixel.TagManager = {
  // 预定义荧光色
  defaultColors: [
    "#00FFFF", // 荧光青色
    "#FF00FF", // 荧光品红
    "#00FF00", // 荧光绿色
    "#FFFF00", // 荧光黄色
    "#FF0080", // 荧光粉色
    "#80FF00", // 荧光青绿
    "#FF8000", // 荧光橙色
    "#8000FF", // 荧光紫色
    "#00FF80", // 荧光薄荷绿
    "#FF0040", // 荧光红色
  ],

  // 获取所有标签
  getAllTags: function () {
    return TaskPixel.DataStore.data.tags || [];
  },

  // 创建新标签
  createTag: function (tagData) {
    const tagId = TaskPixel.DataStore.generateId();

    // 处理标签名称，移除开头的#号（如果有）
    let tagName = tagData.name.replace(/^#/, "").trim();

    // 检查标签是否已存在
    const existingTag = this.getAllTags().find((tag) => tag.name === tagName);
    if (existingTag) {
      return { success: false, reason: "tag_exists", tagId: existingTag.id };
    }

    const newTag = {
      id: tagId,
      name: tagName,
      display_text: "#" + tagName,
      color: tagData.color || this.getRandomColor(),
      description: tagData.description || "",
      created_at: new Date().toISOString(),
      usage_count: 0,
    };

    if (!TaskPixel.DataStore.data.tags) {
      TaskPixel.DataStore.data.tags = [];
    }

    TaskPixel.DataStore.data.tags.push(newTag);
    TaskPixel.DataStore.saveToStorage();

    return { success: true, tagId: tagId };
  },

  // 更新标签
  updateTag: function (tagId, updatedData) {
    const tagIndex = TaskPixel.DataStore.data.tags.findIndex(
      (tag) => tag.id === tagId
    );
    if (tagIndex === -1) return false;

    TaskPixel.DataStore.data.tags[tagIndex] = {
      ...TaskPixel.DataStore.data.tags[tagIndex],
      ...updatedData,
    };

    TaskPixel.DataStore.saveToStorage();
    return true;
  },

  // 删除标签
  deleteTag: function (tagId) {
    // 检查标签是否被使用
    const isUsed = this.isTagInUse(tagId);
    if (isUsed) {
      return { success: false, reason: "tag_in_use" };
    }

    const tagIndex = TaskPixel.DataStore.data.tags.findIndex(
      (tag) => tag.id === tagId
    );
    if (tagIndex === -1) return { success: false, reason: "tag_not_found" };

    TaskPixel.DataStore.data.tags.splice(tagIndex, 1);
    TaskPixel.DataStore.saveToStorage();

    return { success: true };
  },

  // 检查标签是否被使用
  isTagInUse: function (tagId) {
    const tasks = TaskPixel.DataStore.getAllTasks();
    for (const task of tasks) {
      if (task.goals) {
        for (const goal of task.goals) {
          if (goal.tags && goal.tags.includes(tagId)) {
            return true;
          }
        }
      }
    }
    return false;
  },

  // 获取随机颜色
  getRandomColor: function () {
    return this.defaultColors[
      Math.floor(Math.random() * this.defaultColors.length)
    ];
  },

  // 更新标签使用次数
  updateTagUsage: function (tagIds) {
    tagIds.forEach((tagId) => {
      const tag = TaskPixel.DataStore.data.tags.find((t) => t.id === tagId);
      if (tag) {
        tag.usage_count = (tag.usage_count || 0) + 1;
      }
    });
    TaskPixel.DataStore.saveToStorage();
  },

  // 按使用频率排序标签
  getTagsByUsage: function () {
    return this.getAllTags().sort(
      (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
    );
  },

  // 按名称排序标签
  getTagsByName: function () {
    return this.getAllTags().sort((a, b) => a.name.localeCompare(b.name));
  },

  // 搜索标签
  searchTags: function (query) {
    const searchTerm = query.toLowerCase().replace(/^#/, "");
    return this.getAllTags().filter(
      (tag) =>
        tag.name.toLowerCase().includes(searchTerm) ||
        (tag.description && tag.description.toLowerCase().includes(searchTerm))
    );
  },
};
```

### 2.2 目标标签功能扩展

在 `core.js` 中添加标签相关方法：

```javascript
// 为目标添加标签
addTagsToGoal: function(taskId, goalId, tagIds) {
  const task = this.getTaskById(taskId);
  if (!task) return false;

  const goal = task.goals.find(g => g.id === goalId);
  if (!goal) return false;

  if (!goal.tags) goal.tags = [];

  // 添加新标签，避免重复
  tagIds.forEach(tagId => {
    if (!goal.tags.includes(tagId)) {
      goal.tags.push(tagId);
    }
  });

  this.saveToStorage();
  TaskPixel.TagManager.updateTagUsage(tagIds);

  return true;
},

// 从目标移除标签
removeTagsFromGoal: function(taskId, goalId, tagIds) {
  const task = this.getTaskById(taskId);
  if (!task) return false;

  const goal = task.goals.find(g => g.id === goalId);
  if (!goal || !goal.tags) return false;

  goal.tags = goal.tags.filter(tagId => !tagIds.includes(tagId));

  this.saveToStorage();
  return true;
},

// 获取目标的标签对象
getGoalTags: function(taskId, goalId) {
  const task = this.getTaskById(taskId);
  if (!task) return [];

  const goal = task.goals.find(g => g.id === goalId);
  if (!goal || !goal.tags) return [];

  return goal.tags.map(tagId =>
    TaskPixel.TagManager.getAllTags().find(tag => tag.id === tagId)
  ).filter(tag => tag); // 过滤掉不存在的标签
}
```

## 3. 用户界面设计

### 3.1 标签选择器组件

```javascript
// 标签选择器组件
TaskPixel.TagSelector = {
  // 创建标签选择器
  create: function (selectedTags = [], options = {}) {
    const container = document.createElement("div");
    container.className = "tag-selector";

    const allTags = TaskPixel.TagManager.getAllTags();

    container.innerHTML = `
      <div class="tag-selector-header flex justify-between items-center mb-3">
        <label class="font-display text-lg">选择标签</label>
        <button class="create-tag-btn pixel-button-sm bg-primary text-white">
          <span class="material-symbols-outlined text-sm">add</span>
          新建标签
        </button>
      </div>
      <div class="mb-3">
        <input type="text" class="tag-search" placeholder="搜索标签..." id="tag-search-input">
      </div>
      <div class="tag-list flex flex-wrap gap-2 mb-3">
        ${allTags
          .map(
            (tag) => `
          <label class="tag-option flex items-center cursor-pointer">
            <input type="checkbox" value="${tag.id}" 
                   ${selectedTags.includes(tag.id) ? "checked" : ""} 
                   class="hidden tag-checkbox">
            <span class="tag-badge pixel-border px-3 py-1 text-sm font-bold font-display transition-all
                         ${
                           selectedTags.includes(tag.id)
                             ? "bg-pixel-accent shadow-pixel-glow"
                             : "bg-white hover:bg-gray-50"
                         }"
                  style="border-color: ${tag.color}; color: ${tag.color}; 
                         ${
                           selectedTags.includes(tag.id)
                             ? `box-shadow: 0 0 10px ${tag.color}40;`
                             : ""
                         }">
              ${tag.display_text}
            </span>
          </label>
        `
          )
          .join("")}
      </div>
      ${
        allTags.length === 0
          ? '<p class="text-gray-500 text-center py-4">暂无标签，点击"新建标签"创建第一个标签</p>'
          : ""
      }
    `;

    // 绑定事件
    this.bindEvents(container);

    return container;
  },

  // 绑定事件
  bindEvents: function (container) {
    // 标签选择事件
    container.addEventListener("change", (e) => {
      if (e.target.classList.contains("tag-checkbox")) {
        const tagBadge = e.target.nextElementSibling;
        if (e.target.checked) {
          tagBadge.classList.add("border-gray-800");
          tagBadge.classList.remove("border-gray-300");
        } else {
          tagBadge.classList.remove("border-gray-800");
          tagBadge.classList.add("border-gray-300");
        }
      }
    });

    // 标签搜索功能
    const searchInput = container.querySelector("#tag-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterTags(container, e.target.value);
      });
    }

    // 新建标签按钮
    const createBtn = container.querySelector(".create-tag-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        this.showCreateTagDialog((newTag) => {
          // 刷新标签选择器
          const newContainer = this.create(this.getSelectedTags(container));
          container.parentNode.replaceChild(newContainer, container);
        });
      });
    }
  },

  // 筛选标签
  filterTags: function (container, query) {
    const tagOptions = container.querySelectorAll(".tag-option");
    const searchTerm = query.toLowerCase().replace(/^#/, "");

    tagOptions.forEach((option) => {
      const tagBadge = option.querySelector(".tag-badge");
      const tagText = tagBadge.textContent.toLowerCase().replace(/^#/, "");

      if (tagText.includes(searchTerm)) {
        option.style.display = "flex";
      } else {
        option.style.display = "none";
      }
    });
  },

  // 获取选中的标签
  getSelectedTags: function (container) {
    const checkboxes = container.querySelectorAll(".tag-checkbox:checked");
    return Array.from(checkboxes).map((cb) => cb.value);
  },

  // 显示创建标签对话框
  showCreateTagDialog: function (onSuccess) {
    const dialog = document.createElement("div");
    dialog.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    dialog.innerHTML = `
      <div class="pixel-border bg-white p-6 w-full max-w-md">
        <h2 class="text-2xl font-display mb-6">创建新标签</h2>
        <form id="create-tag-form">
          <div class="mb-4">
            <label class="block font-display text-lg mb-2">标签名称</label>
            <input type="text" id="tag-name" class="w-full pixel-input" required 
                   placeholder="例如: 前端开发 或 #学习">
            <p class="text-sm text-gray-600 mt-1">输入标签名称，可以包含或不包含 # 前缀</p>
          </div>
          <div class="mb-4">
            <label class="block font-display text-lg mb-2">标签颜色</label>
            <div class="color-picker flex flex-wrap gap-2">
              ${TaskPixel.TagManager.defaultColors
                .map(
                  (color) => `
                <button type="button" class="color-option w-8 h-8 pixel-border border-2 border-gray-300 
                                           hover:shadow-pixel-glow transition-all"
                        style="background-color: ${color}; box-shadow: inset 0 0 10px ${color}80;" 
                        data-color="${color}"></button>
              `
                )
                .join("")}
            </div>
            <input type="hidden" id="tag-color" value="${
              TaskPixel.TagManager.defaultColors[0]
            }">
          </div>
          <div class="mb-6">
            <label class="block font-display text-lg mb-2">描述（可选）</label>
            <textarea id="tag-description" class="w-full h-20" placeholder="输入标签描述"></textarea>
          </div>
          <div class="flex justify-end gap-4">
            <button type="button" class="cancel-btn pixel-button">取消</button>
            <button type="submit" class="pixel-button bg-primary text-white">创建</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    // 颜色选择
    dialog.addEventListener("click", (e) => {
      if (e.target.classList.contains("color-option")) {
        dialog
          .querySelectorAll(".color-option")
          .forEach((btn) => btn.classList.remove("border-gray-800"));
        e.target.classList.add("border-gray-800");
        document.getElementById("tag-color").value = e.target.dataset.color;
      }
    });

    // 表单提交
    dialog.querySelector("#create-tag-form").addEventListener("submit", (e) => {
      e.preventDefault();

      const tagData = {
        name: document.getElementById("tag-name").value.trim(),
        color: document.getElementById("tag-color").value,
        description: document.getElementById("tag-description").value.trim(),
      };

      const result = TaskPixel.TagManager.createTag(tagData);
      if (result.success) {
        document.body.removeChild(dialog);
        if (onSuccess) onSuccess(tagData);
      } else if (result.reason === "tag_exists") {
        alert("标签已存在！");
      } else {
        alert("创建标签失败，请重试");
      }
    });

    // 取消按钮
    dialog.querySelector(".cancel-btn").addEventListener("click", () => {
      document.body.removeChild(dialog);
    });

    // 默认选中第一个颜色
    dialog.querySelector(".color-option").classList.add("border-gray-800");
  },
};
```

### 3.2 目标编辑界面集成

在 `taskDetail.js` 中的目标编辑对话框中集成标签选择器：

```javascript
// 在 openEditGoalDialog 方法中添加标签选择器
openEditGoalDialog: function(goalId) {
  // ... 现有代码 ...

  // 获取目标当前的标签
  const currentTags = TaskPixel.DataStore.getGoalTags(this.currentTaskId, goalId)
                        .map(tag => tag.id);

  // 在对话框HTML中添加标签选择区域
  const tagSelectorContainer = document.createElement('div');
  tagSelectorContainer.className = 'mb-4';

  const tagSelector = TaskPixel.TagSelector.create(currentTags);
  tagSelectorContainer.appendChild(tagSelector);

  // 将标签选择器插入到表单中
  const form = dialogElement.querySelector('form');
  const submitButtons = form.querySelector('.flex.justify-end');
  form.insertBefore(tagSelectorContainer, submitButtons);

  // 在表单提交时处理标签
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedTags = TaskPixel.TagSelector.getSelectedTags(tagSelector);

    // 更新目标标签
    TaskPixel.DataStore.removeTagsFromGoal(this.currentTaskId, goalId, currentTags);
    TaskPixel.DataStore.addTagsToGoal(this.currentTaskId, goalId, selectedTags);

    // ... 其他更新逻辑 ...
  });
}
```

## 4. 目标列表页面标签功能

### 4.1 标签筛选器

```javascript
// 在 goals.js 中添加标签筛选功能
TaskPixel.Goals = {
  // ... 现有代码 ...

  // 当前筛选的标签
  currentFilterTags: [],

  // 渲染标签筛选器
  renderTagFilter: function () {
    const filterContainer = document.getElementById("tag-filter-container");
    if (!filterContainer) return;

    const allTags = TaskPixel.TagManager.getAllTags();

    filterContainer.innerHTML = `
      <div class="mb-4">
        <h3 class="font-display text-lg mb-2">按标签筛选</h3>
        <div class="flex flex-wrap gap-2">
          <button class="filter-tag-btn pixel-button font-display ${
            this.currentFilterTags.length === 0
              ? "bg-primary text-white shadow-pixel-glow"
              : "bg-white"
          }"
                  data-tag-id="all">
            全部
          </button>
          ${allTags
            .map(
              (tag) => `
            <button class="filter-tag-btn pixel-button font-display ${
              this.currentFilterTags.includes(tag.id)
                ? "shadow-pixel-glow"
                : "bg-white hover:bg-gray-50"
            }"
                    data-tag-id="${tag.id}"
                    style="border-color: ${tag.color}; color: ${tag.color};
                           ${
                             this.currentFilterTags.includes(tag.id)
                               ? `background-color: ${tag.color}20; box-shadow: 0 0 10px ${tag.color}40;`
                               : ""
                           }">
              ${tag.display_text}
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // 绑定筛选事件
    filterContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-tag-btn")) {
        const tagId = e.target.dataset.tagId;

        if (tagId === "all") {
          this.currentFilterTags = [];
        } else {
          const index = this.currentFilterTags.indexOf(tagId);
          if (index === -1) {
            this.currentFilterTags.push(tagId);
          } else {
            this.currentFilterTags.splice(index, 1);
          }
        }

        this.renderTagFilter();
        this.filterGoalsByTags();
      }
    });
  },

  // 根据标签筛选目标
  filterGoalsByTags: function () {
    if (this.currentFilterTags.length === 0) {
      this.currentGoals = TaskPixel.DataStoreAdapter.getAllGoals();
    } else {
      this.currentGoals = TaskPixel.DataStoreAdapter.getAllGoals().filter(
        (goal) => {
          return (
            goal.tags &&
            goal.tags.some((tagId) => this.currentFilterTags.includes(tagId))
          );
        }
      );
    }

    this.renderGoals();
  },
};
```

## 5. 实施步骤

1. **第一步：数据结构扩展**

   - 修改 `core.js` 添加标签相关数据存储方法
   - 扩展目标数据结构支持标签

2. **第二步：标签管理模块**

   - 创建 `js/tagManager.js`
   - 实现标签的增删改查功能

3. **第三步：标签选择器组件**

   - 创建可复用的标签选择器组件
   - 集成到目标编辑界面

4. **第四步：目标列表页面集成**

   - 在 `goals.html` 中添加标签筛选器
   - 修改 `goals.js` 实现标签筛选功能

5. **第五步：界面优化**
   - 在目标显示中添加标签展示
   - 优化标签的视觉效果

## 6. 标签显示组件

### 6.1 标签徽章组件

```javascript
// 标签显示组件
TaskPixel.TagBadge = {
  // 创建单个标签徽章
  create: function (tag, options = {}) {
    const badge = document.createElement("span");
    const size = options.size || "normal"; // normal, small, large
    const interactive = options.interactive || false;

    let sizeClass = "px-3 py-1 text-sm";
    if (size === "small") {
      sizeClass = "px-2 py-0.5 text-xs";
    } else if (size === "large") {
      sizeClass = "px-4 py-2 text-base";
    }

    badge.className = `tag-badge pixel-border font-display font-bold ${sizeClass} 
                       ${
                         interactive
                           ? "cursor-pointer hover:shadow-pixel-glow transition-all"
                           : ""
                       }`;

    badge.style.cssText = `
      border-color: ${tag.color};
      color: ${tag.color};
      background-color: ${tag.color}15;
      box-shadow: inset 0 0 5px ${tag.color}20;
    `;

    badge.textContent = tag.display_text;
    badge.dataset.tagId = tag.id;

    if (interactive) {
      badge.addEventListener("mouseenter", () => {
        badge.style.boxShadow = `0 0 10px ${tag.color}60, inset 0 0 5px ${tag.color}20`;
        badge.style.backgroundColor = `${tag.color}25`;
      });

      badge.addEventListener("mouseleave", () => {
        badge.style.boxShadow = `inset 0 0 5px ${tag.color}20`;
        badge.style.backgroundColor = `${tag.color}15`;
      });
    }

    return badge;
  },

  // 创建标签列表
  createList: function (tags, options = {}) {
    const container = document.createElement("div");
    container.className = "tag-list flex flex-wrap gap-2";

    tags.forEach((tag) => {
      const badge = this.create(tag, options);
      container.appendChild(badge);
    });

    return container;
  },
};
```

### 6.2 目标卡片中的标签显示

在 `taskDetail.js` 和 `home.js` 中集成标签显示：

```javascript
// 在目标元素创建时添加标签显示
createGoalElement: function(goal) {
  // ... 现有代码 ...

  // 获取目标的标签
  const goalTags = TaskPixel.DataStore.getGoalTags(this.currentTaskId, goal.id);

  // 在目标HTML中添加标签区域
  const tagsHtml = goalTags.length > 0 ? `
    <div class="goal-tags mt-2 mb-3">
      ${goalTags.map(tag => `
        <span class="tag-badge pixel-border px-2 py-0.5 text-xs font-display font-bold"
              style="border-color: ${tag.color}; color: ${tag.color};
                     background-color: ${tag.color}15;
                     box-shadow: inset 0 0 5px ${tag.color}20;">
          ${tag.display_text}
        </span>
      `).join('')}
    </div>
  ` : '';

  // 将标签HTML插入到目标元素中
  goalElement.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h4 class="font-display text-lg text-text-primary">${goal.title}</h4>
        <p class="text-text-secondary text-xl mt-1">${goal.description || "暂无描述"}</p>
        ${tagsHtml}
        <!-- 其他内容... -->
      </div>
      <!-- 按钮区域... -->
    </div>
  `;

  return goalElement;
}
```

## 7. CSS 样式定义

### 7.1 标签相关样式

```css
/* 标签基础样式 */
.tag-badge {
  display: inline-block;
  white-space: nowrap;
  user-select: none;
  position: relative;
}

/* 像素风格边框 */
.pixel-border {
  border-width: 2px;
  border-style: solid;
}

/* 荧光发光效果 */
.shadow-pixel-glow {
  filter: drop-shadow(0 0 8px currentColor);
}

/* 标签选择器样式 */
.tag-selector {
  max-height: 300px;
  overflow-y: auto;
}

.tag-selector::-webkit-scrollbar {
  width: 8px;
}

.tag-selector::-webkit-scrollbar-track {
  background: #f1f1f1;
  border: 2px solid #000;
}

.tag-selector::-webkit-scrollbar-thumb {
  background: #888;
  border: 1px solid #000;
}

.tag-selector::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 颜色选择器样式 */
.color-option {
  position: relative;
  transition: all 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.border-gray-800 {
  border-color: #1f2937 !important;
  transform: scale(1.2);
}

/* 标签筛选按钮样式 */
.filter-tag-btn {
  transition: all 0.2s ease;
  position: relative;
}

.filter-tag-btn:hover {
  transform: translateY(-1px);
}

/* 标签输入框样式 */
.pixel-input {
  border: 2px solid #000;
  padding: 8px 12px;
  font-family: "VT323", monospace;
  font-size: 16px;
  background-color: #fff;
  transition: all 0.2s ease;
}

.pixel-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4f46e5;
  border-color: #4f46e5;
}

/* 标签搜索框样式 */
.tag-search {
  border: 2px solid #000;
  padding: 8px 12px;
  font-family: "VT323", monospace;
  font-size: 14px;
  background-color: #fff;
  transition: all 0.2s ease;
  width: 100%;
  margin-bottom: 12px;
}

.tag-search:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4f46e5;
  border-color: #4f46e5;
}

/* 标签动画效果 */
@keyframes tag-glow {
  0% {
    box-shadow: inset 0 0 5px currentColor;
  }
  50% {
    box-shadow: inset 0 0 10px currentColor, 0 0 15px currentColor;
  }
  100% {
    box-shadow: inset 0 0 5px currentColor;
  }
}

.tag-badge.animate-glow {
  animation: tag-glow 2s ease-in-out infinite;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .tag-list {
    gap: 4px;
  }

  .tag-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
  }

  .color-picker {
    gap: 8px;
  }

  .color-option {
    width: 24px;
    height: 24px;
  }
}
```

## 8. 使用示例

### 8.1 创建标签

```javascript
// 创建工作相关标签
TaskPixel.TagManager.createTag({
  name: "工作",
  color: "#00FFFF",
  description: "工作相关任务",
});

// 创建技术标签
TaskPixel.TagManager.createTag({
  name: "前端开发",
  color: "#FF00FF",
  description: "前端开发任务",
});

// 创建项目标签
TaskPixel.TagManager.createTag({
  name: "React项目",
  color: "#00FF00",
  description: "React相关开发任务",
});

// 创建优先级标签
TaskPixel.TagManager.createTag({
  name: "紧急",
  color: "#FF0040",
  description: "紧急处理的任务",
});
```

### 8.2 在目标中使用标签

```javascript
// 为目标添加多个标签
TaskPixel.DataStore.addTagsToGoal(taskId, goalId, [
  "tag_work_frontend",
  "tag_urgent",
  "tag_client_project",
]);

// 获取目标的所有标签并显示
const goalTags = TaskPixel.DataStore.getGoalTags(taskId, goalId);
const tagContainer = TaskPixel.TagBadge.createList(goalTags, {
  size: "small",
  interactive: true,
});
```

## 9. 标签管理页面设计

### 9.1 页面结构 (tags.html)

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>标签管理 - TaskPixel</title>

    <!-- 字体 -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
      rel="stylesheet"
    />

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <script src="js/tailwind-config.js"></script>

    <!-- 应用样式 -->
    <link rel="stylesheet" href="assets/css/styles.css" />
    <link rel="stylesheet" href="assets/css/tags.css" />
  </head>

  <body class="bg-background-light font-display text-pixel-text-color">
    <div
      class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden"
    >
      <div class="flex h-full grow flex-col">
        <!-- Header -->
        <header
          class="flex items-center justify-between whitespace-nowrap border-b-4 border-pixel-border-color px-6 py-4 bg-white"
        >
          <div class="flex items-center gap-4">
            <svg
              class="text-pixel-text-color"
              fill="none"
              height="32"
              viewBox="0 0 32 32"
              width="32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clip-rule="evenodd"
                d="M0 0H8V8H0V0ZM8 8H16V16H8V8ZM16 16H24V24H16V16ZM0 16H8V24H0V16ZM8 24H16V32H8V24ZM16 0H24V8H16V0ZM24 8H32V16H24V8Z"
                fill="currentColor"
                fill-rule="evenodd"
              ></path>
            </svg>
            <h2 class="text-xl font-bold text-pixel-text-color">TaskPixel</h2>
          </div>
          <div class="hidden md:flex items-center gap-8 text-sm">
            <a
              class="text-black/70 hover:text-primary nav-link"
              href="index.html"
              >主页</a
            >
            <a class="text-black/70 hover:text-primary nav-link" href="#"
              >日历</a
            >
            <a
              class="text-black/70 hover:text-primary nav-link"
              href="goals.html"
              >目标</a
            >
            <a
              class="font-bold text-pixel-text-color nav-link active"
              href="tags.html"
              >标签</a
            >
            <a
              class="text-black/70 hover:text-primary nav-link"
              href="settings.html"
              >设置</a
            >
            <a
              class="text-black/70 hover:text-primary nav-link"
              href="data_management.html"
              >数据管理</a
            >
          </div>
        </header>

        <!-- Main Content -->
        <main class="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <!-- Page Title -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold mb-2">标签管理</h1>
            <p class="text-lg text-gray-600">管理你的标签，让目标分类更清晰</p>
          </div>

          <!-- Tag Management Panel -->
          <div class="pixel-border bg-white p-6 mb-8">
            <!-- Panel Header -->
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-2xl font-display font-bold">Manage Tags</h2>
                <p class="text-sm text-gray-600 mt-1">
                  Click to select, double-click to edit, hover to delete.
                </p>
              </div>
              <button
                id="new-tag-btn"
                class="pixel-button bg-primary text-white font-display py-2 px-4 flex items-center gap-2"
              >
                <span class="material-symbols-outlined text-lg">add</span>
                New Tag
              </button>
            </div>

            <!-- Search and Filter Bar -->
            <div class="mb-6">
              <div class="flex flex-col sm:flex-row gap-4">
                <!-- Search Input -->
                <div class="flex-1">
                  <input
                    type="text"
                    id="tag-search"
                    class="w-full pixel-input"
                    placeholder="搜索标签..."
                    autocomplete="off"
                  />
                </div>

                <!-- Sort Options -->
                <div class="flex gap-2">
                  <select id="tag-sort" class="pixel-select">
                    <option value="name">按名称排序</option>
                    <option value="usage">按使用频率</option>
                    <option value="created">按创建时间</option>
                    <option value="color">按颜色分组</option>
                  </select>

                  <button
                    id="refresh-tags"
                    class="pixel-button bg-gray-200 px-3 py-2"
                  >
                    <span class="material-symbols-outlined text-lg"
                      >refresh</span
                    >
                  </button>
                </div>
              </div>
            </div>

            <!-- Tags Grid -->
            <div id="tags-container" class="tags-grid">
              <!-- 标签将通过JavaScript动态生成 -->
            </div>

            <!-- Empty State -->
            <div id="empty-tags" class="text-center py-12 hidden">
              <div class="text-6xl mb-4">🏷️</div>
              <h3 class="text-xl font-bold mb-2">还没有标签</h3>
              <p class="text-gray-600 mb-4">
                创建你的第一个标签来开始分类管理目标
              </p>
              <button
                class="pixel-button bg-primary text-white create-first-tag"
              >
                创建标签
              </button>
            </div>
          </div>

          <!-- Statistics Panel -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="pixel-border bg-white p-4">
              <h3 class="font-display text-lg mb-2">总标签数</h3>
              <p class="text-3xl font-bold text-primary" id="total-tags-count">
                0
              </p>
            </div>
            <div class="pixel-border bg-white p-4">
              <h3 class="font-display text-lg mb-2">使用中的标签</h3>
              <p class="text-3xl font-bold text-green-500" id="used-tags-count">
                0
              </p>
            </div>
            <div class="pixel-border bg-white p-4">
              <h3 class="font-display text-lg mb-2">未使用的标签</h3>
              <p
                class="text-3xl font-bold text-gray-500"
                id="unused-tags-count"
              >
                0
              </p>
            </div>
          </div>

          <!-- Bulk Actions Panel -->
          <div
            class="pixel-border bg-white p-6"
            id="bulk-actions-panel"
            style="display: none;"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <span class="font-display text-lg"
                  >已选择 <span id="selected-count">0</span> 个标签</span
                >
                <button
                  id="select-all-tags"
                  class="pixel-button-sm bg-gray-200"
                >
                  全选
                </button>
                <button
                  id="clear-selection"
                  class="pixel-button-sm bg-gray-200"
                >
                  清除选择
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  id="bulk-delete"
                  class="pixel-button bg-red-500 text-white"
                >
                  <span class="material-symbols-outlined text-sm mr-1"
                    >delete</span
                  >
                  批量删除
                </button>
                <button
                  id="bulk-export"
                  class="pixel-button bg-blue-500 text-white"
                >
                  <span class="material-symbols-outlined text-sm mr-1"
                    >download</span
                  >
                  导出选中
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- 应用脚本 -->
    <script src="js/core.js"></script>
    <script src="js/tagManager.js"></script>
    <script src="js/tags.js"></script>
    <script>
      // 初始化应用
      document.addEventListener("DOMContentLoaded", function () {
        TaskPixel.init();
        TaskPixel.TagManager.init();
        TaskPixel.Tags.init();
      });
    </script>
  </body>
</html>
```

### 9.2 标签管理页面 JavaScript (js/tags.js)

```javascript
/**
 * TaskPixel 标签管理页面功能模块
 */

TaskPixel.Tags = {
  // 当前选中的标签
  selectedTags: [],

  // 当前显示的标签
  currentTags: [],

  // 排序方式
  currentSort: "name",

  // DOM元素引用
  elements: {
    tagsContainer: null,
    searchInput: null,
    sortSelect: null,
    newTagBtn: null,
    emptyState: null,
    bulkActionsPanel: null,
    selectedCount: null,
    totalTagsCount: null,
    usedTagsCount: null,
    unusedTagsCount: null,
  },

  // 初始化标签管理页面
  init: function () {
    this.cacheElements();
    this.bindEvents();
    this.loadTags();
    this.updateStatistics();
    console.log("标签管理页面初始化完成");
  },

  // 缓存DOM元素
  cacheElements: function () {
    this.elements.tagsContainer = document.getElementById("tags-container");
    this.elements.searchInput = document.getElementById("tag-search");
    this.elements.sortSelect = document.getElementById("tag-sort");
    this.elements.newTagBtn = document.getElementById("new-tag-btn");
    this.elements.emptyState = document.getElementById("empty-tags");
    this.elements.bulkActionsPanel =
      document.getElementById("bulk-actions-panel");
    this.elements.selectedCount = document.getElementById("selected-count");
    this.elements.totalTagsCount = document.getElementById("total-tags-count");
    this.elements.usedTagsCount = document.getElementById("used-tags-count");
    this.elements.unusedTagsCount =
      document.getElementById("unused-tags-count");
  },

  // 绑定事件
  bindEvents: function () {
    // 新建标签按钮
    if (this.elements.newTagBtn) {
      this.elements.newTagBtn.addEventListener(
        "click",
        this.showCreateTagDialog.bind(this)
      );
    }

    // 搜索输入
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener(
        "input",
        this.handleSearch.bind(this)
      );
    }

    // 排序选择
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener(
        "change",
        this.handleSort.bind(this)
      );
    }

    // 刷新按钮
    const refreshBtn = document.getElementById("refresh-tags");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", this.refreshTags.bind(this));
    }

    // 批量操作按钮
    const selectAllBtn = document.getElementById("select-all-tags");
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", this.selectAllTags.bind(this));
    }

    const clearSelectionBtn = document.getElementById("clear-selection");
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener(
        "click",
        this.clearSelection.bind(this)
      );
    }

    const bulkDeleteBtn = document.getElementById("bulk-delete");
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener("click", this.bulkDeleteTags.bind(this));
    }

    // 标签容器事件委托
    if (this.elements.tagsContainer) {
      this.elements.tagsContainer.addEventListener(
        "click",
        this.handleTagClick.bind(this)
      );
      this.elements.tagsContainer.addEventListener(
        "dblclick",
        this.handleTagDoubleClick.bind(this)
      );
    }

    // 监听标签数据变化
    TaskPixel.EventBus.on("tag:created", this.handleTagChanged.bind(this));
    TaskPixel.EventBus.on("tag:updated", this.handleTagChanged.bind(this));
    TaskPixel.EventBus.on("tag:deleted", this.handleTagChanged.bind(this));
  },

  // 加载标签
  loadTags: function () {
    this.currentTags = TaskPixel.TagManager.getAllTags();
    this.sortTags();
    this.renderTags();
    this.updateStatistics();
  },

  // 排序标签
  sortTags: function () {
    switch (this.currentSort) {
      case "name":
        this.currentTags = TaskPixel.TagManager.getTagsByName();
        break;
      case "usage":
        this.currentTags = TaskPixel.TagManager.getTagsByUsage();
        break;
      case "created":
        this.currentTags.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        break;
      case "color":
        this.currentTags.sort((a, b) => a.color.localeCompare(b.color));
        break;
    }
  },

  // 渲染标签
  renderTags: function () {
    if (!this.elements.tagsContainer) return;

    // 清空容器
    this.elements.tagsContainer.innerHTML = "";

    // 如果没有标签，显示空状态
    if (this.currentTags.length === 0) {
      this.showEmptyState();
      return;
    }

    // 隐藏空状态
    this.hideEmptyState();

    // 渲染每个标签
    this.currentTags.forEach((tag) => {
      const tagElement = this.createTagElement(tag);
      this.elements.tagsContainer.appendChild(tagElement);
    });
  },

  // 创建标签元素
  createTagElement: function (tag) {
    const tagElement = document.createElement("div");
    tagElement.className = `tag-item pixel-border bg-white p-3 cursor-pointer transition-all hover:shadow-lg ${
      this.selectedTags.includes(tag.id) ? "selected" : ""
    }`;
    tagElement.dataset.tagId = tag.id;

    // 使用次数显示
    const usageText =
      tag.usage_count > 0 ? `使用 ${tag.usage_count} 次` : "未使用";
    const usageClass = tag.usage_count > 0 ? "text-green-600" : "text-gray-500";

    tagElement.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="tag-badge-display pixel-border px-3 py-1 font-display font-bold text-sm"
                     style="border-color: ${tag.color}; color: ${tag.color}; 
                            background-color: ${tag.color}15; 
                            box-shadow: inset 0 0 5px ${tag.color}20;">
                    ${tag.display_text}
                </div>
                <div class="tag-actions opacity-0 transition-opacity">
                    <button class="edit-tag-btn pixel-button-sm bg-yellow-500 text-white mr-1" 
                            data-tag-id="${tag.id}" title="编辑标签">
                        <span class="material-symbols-outlined text-xs">edit</span>
                    </button>
                    <button class="delete-tag-btn pixel-button-sm bg-red-500 text-white" 
                            data-tag-id="${tag.id}" title="删除标签">
                        <span class="material-symbols-outlined text-xs">delete</span>
                    </button>
                </div>
            </div>
            <div class="text-xs ${usageClass} mb-1">${usageText}</div>
            ${
              tag.description
                ? `<div class="text-xs text-gray-600">${tag.description}</div>`
                : ""
            }
            <div class="text-xs text-gray-400 mt-2">
                创建于 ${new Date(tag.created_at).toLocaleDateString()}
            </div>
        `;

    // 悬停显示操作按钮
    tagElement.addEventListener("mouseenter", () => {
      const actions = tagElement.querySelector(".tag-actions");
      if (actions) actions.classList.remove("opacity-0");
    });

    tagElement.addEventListener("mouseleave", () => {
      const actions = tagElement.querySelector(".tag-actions");
      if (actions) actions.classList.add("opacity-0");
    });

    return tagElement;
  },

  // 处理标签点击（选择）
  handleTagClick: function (e) {
    // 如果点击的是操作按钮，不处理选择
    if (e.target.closest(".tag-actions")) {
      this.handleActionClick(e);
      return;
    }

    const tagItem = e.target.closest(".tag-item");
    if (!tagItem) return;

    const tagId = tagItem.dataset.tagId;
    this.toggleTagSelection(tagId);
  },

  // 处理标签双击（编辑）
  handleTagDoubleClick: function (e) {
    const tagItem = e.target.closest(".tag-item");
    if (!tagItem) return;

    const tagId = tagItem.dataset.tagId;
    this.editTag(tagId);
  },

  // 处理操作按钮点击
  handleActionClick: function (e) {
    e.stopPropagation();

    if (e.target.closest(".edit-tag-btn")) {
      const tagId = e.target.closest(".edit-tag-btn").dataset.tagId;
      this.editTag(tagId);
    } else if (e.target.closest(".delete-tag-btn")) {
      const tagId = e.target.closest(".delete-tag-btn").dataset.tagId;
      this.deleteTag(tagId);
    }
  },

  // 切换标签选择状态
  toggleTagSelection: function (tagId) {
    const index = this.selectedTags.indexOf(tagId);

    if (index === -1) {
      this.selectedTags.push(tagId);
    } else {
      this.selectedTags.splice(index, 1);
    }

    this.updateTagSelection();
    this.updateBulkActionsPanel();
  },

  // 更新标签选择状态显示
  updateTagSelection: function () {
    const tagItems = this.elements.tagsContainer.querySelectorAll(".tag-item");

    tagItems.forEach((item) => {
      const tagId = item.dataset.tagId;
      if (this.selectedTags.includes(tagId)) {
        item.classList.add("selected");
      } else {
        item.classList.remove("selected");
      }
    });
  },

  // 更新批量操作面板
  updateBulkActionsPanel: function () {
    if (!this.elements.bulkActionsPanel || !this.elements.selectedCount) return;

    if (this.selectedTags.length > 0) {
      this.elements.bulkActionsPanel.style.display = "block";
      this.elements.selectedCount.textContent = this.selectedTags.length;
    } else {
      this.elements.bulkActionsPanel.style.display = "none";
    }
  },

  // 处理搜索
  handleSearch: function (e) {
    const query = e.target.value.trim();

    if (query === "") {
      this.currentTags = TaskPixel.TagManager.getAllTags();
    } else {
      this.currentTags = TaskPixel.TagManager.searchTags(query);
    }

    this.sortTags();
    this.renderTags();
  },

  // 处理排序
  handleSort: function (e) {
    this.currentSort = e.target.value;
    this.sortTags();
    this.renderTags();
  },

  // 显示创建标签对话框
  showCreateTagDialog: function () {
    TaskPixel.TagSelector.showCreateTagDialog((newTag) => {
      this.loadTags();
      this.showMessage("标签创建成功", "success");
    });
  },

  // 编辑标签
  editTag: function (tagId) {
    const tag = TaskPixel.TagManager.getAllTags().find((t) => t.id === tagId);
    if (!tag) return;

    this.showEditTagDialog(tag);
  },

  // 显示编辑标签对话框
  showEditTagDialog: function (tag) {
    const dialog = document.createElement("div");
    dialog.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    dialog.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-md">
                <h2 class="text-2xl font-display mb-6">编辑标签</h2>
                <form id="edit-tag-form">
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2">标签名称</label>
                        <input type="text" id="edit-tag-name" class="w-full pixel-input" 
                               value="${tag.name}" required>
                    </div>
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2">标签颜色</label>
                        <div class="color-picker flex flex-wrap gap-2">
                            ${TaskPixel.TagManager.defaultColors
                              .map(
                                (color) => `
                                <button type="button" class="color-option w-8 h-8 pixel-border border-2 
                                               ${
                                                 color === tag.color
                                                   ? "border-gray-800"
                                                   : "border-gray-300"
                                               }
                                               hover:shadow-pixel-glow transition-all"
                                        style="background-color: ${color}; box-shadow: inset 0 0 10px ${color}80;" 
                                        data-color="${color}"></button>
                            `
                              )
                              .join("")}
                        </div>
                        <input type="hidden" id="edit-tag-color" value="${
                          tag.color
                        }">
                    </div>
                    <div class="mb-6">
                        <label class="block font-display text-lg mb-2">描述（可选）</label>
                        <textarea id="edit-tag-description" class="w-full h-20 pixel-input">${
                          tag.description || ""
                        }</textarea>
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" class="cancel-btn pixel-button">取消</button>
                        <button type="submit" class="pixel-button bg-primary text-white">保存</button>
                    </div>
                </form>
            </div>
        `;

    document.body.appendChild(dialog);

    // 颜色选择事件
    dialog.addEventListener("click", (e) => {
      if (e.target.classList.contains("color-option")) {
        dialog
          .querySelectorAll(".color-option")
          .forEach((btn) => btn.classList.remove("border-gray-800"));
        e.target.classList.add("border-gray-800");
        document.getElementById("edit-tag-color").value =
          e.target.dataset.color;
      }
    });

    // 表单提交
    dialog.querySelector("#edit-tag-form").addEventListener("submit", (e) => {
      e.preventDefault();

      const updatedData = {
        name: document.getElementById("edit-tag-name").value.trim(),
        display_text:
          "#" + document.getElementById("edit-tag-name").value.trim(),
        color: document.getElementById("edit-tag-color").value,
        description: document
          .getElementById("edit-tag-description")
          .value.trim(),
      };

      const success = TaskPixel.TagManager.updateTag(tag.id, updatedData);
      if (success) {
        document.body.removeChild(dialog);
        this.loadTags();
        this.showMessage("标签更新成功", "success");
      } else {
        this.showMessage("标签更新失败", "error");
      }
    });

    // 取消按钮
    dialog.querySelector(".cancel-btn").addEventListener("click", () => {
      document.body.removeChild(dialog);
    });
  },

  // 删除标签
  deleteTag: function (tagId) {
    const tag = TaskPixel.TagManager.getAllTags().find((t) => t.id === tagId);
    if (!tag) return;

    if (confirm(`确定要删除标签 "${tag.display_text}" 吗？`)) {
      const result = TaskPixel.TagManager.deleteTag(tagId);

      if (result.success) {
        this.loadTags();
        this.showMessage("标签删除成功", "success");
      } else if (result.reason === "tag_in_use") {
        this.showMessage("标签正在使用中，无法删除", "error");
      } else {
        this.showMessage("标签删除失败", "error");
      }
    }
  },

  // 全选标签
  selectAllTags: function () {
    this.selectedTags = this.currentTags.map((tag) => tag.id);
    this.updateTagSelection();
    this.updateBulkActionsPanel();
  },

  // 清除选择
  clearSelection: function () {
    this.selectedTags = [];
    this.updateTagSelection();
    this.updateBulkActionsPanel();
  },

  // 批量删除标签
  bulkDeleteTags: function () {
    if (this.selectedTags.length === 0) return;

    if (confirm(`确定要删除选中的 ${this.selectedTags.length} 个标签吗？`)) {
      let deletedCount = 0;
      let failedCount = 0;

      this.selectedTags.forEach((tagId) => {
        const result = TaskPixel.TagManager.deleteTag(tagId);
        if (result.success) {
          deletedCount++;
        } else {
          failedCount++;
        }
      });

      this.selectedTags = [];
      this.loadTags();

      if (failedCount === 0) {
        this.showMessage(`成功删除 ${deletedCount} 个标签`, "success");
      } else {
        this.showMessage(
          `删除了 ${deletedCount} 个标签，${failedCount} 个标签删除失败（可能正在使用中）`,
          "warning"
        );
      }
    }
  },

  // 刷新标签
  refreshTags: function () {
    this.selectedTags = [];
    this.loadTags();
    this.showMessage("标签列表已刷新", "success");
  },

  // 更新统计信息
  updateStatistics: function () {
    const allTags = TaskPixel.TagManager.getAllTags();
    const usedTags = allTags.filter((tag) => tag.usage_count > 0);
    const unusedTags = allTags.filter((tag) => tag.usage_count === 0);

    if (this.elements.totalTagsCount) {
      this.elements.totalTagsCount.textContent = allTags.length;
    }
    if (this.elements.usedTagsCount) {
      this.elements.usedTagsCount.textContent = usedTags.length;
    }
    if (this.elements.unusedTagsCount) {
      this.elements.unusedTagsCount.textContent = unusedTags.length;
    }
  },

  // 显示空状态
  showEmptyState: function () {
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.remove("hidden");
    }
  },

  // 隐藏空状态
  hideEmptyState: function () {
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.add("hidden");
    }
  },

  // 处理标签数据变化
  handleTagChanged: function () {
    this.loadTags();
  },

  // 显示消息
  showMessage: function (message, type = "info") {
    const messageElement = document.createElement("div");
    const bgColor =
      {
        success: "bg-green-500",
        error: "bg-red-500",
        warning: "bg-yellow-500",
        info: "bg-blue-500",
      }[type] || "bg-blue-500";

    messageElement.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 pixel-border z-50`;
    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    setTimeout(() => {
      if (document.body.contains(messageElement)) {
        document.body.removeChild(messageElement);
      }
    }, 3000);
  },
};
```

### 9.3 标签页面专用样式 (assets/css/tags.css)

```css
/* 标签管理页面样式 */

/* 标签网格布局 */
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  min-height: 200px;
}

/* 标签项样式 */
.tag-item {
  position: relative;
  border: 2px solid #000;
  transition: all 0.2s ease;
}

.tag-item:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0px #000;
}

.tag-item.selected {
  border-color: #4f46e5;
  background-color: #4f46e520;
  box-shadow: 0 0 0 2px #4f46e5;
}

/* 标签徽章显示 */
.tag-badge-display {
  display: inline-block;
  white-space: nowrap;
  user-select: none;
  transition: all 0.2s ease;
}

.tag-badge-display:hover {
  transform: scale(1.05);
}

/* 像素风格输入框 */
.pixel-input {
  border: 2px solid #000;
  padding: 8px 12px;
  font-family: "VT323", monospace;
  font-size: 16px;
  background-color: #fff;
  transition: all 0.2s ease;
}

.pixel-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4f46e5;
  border-color: #4f46e5;
}

/* 像素风格选择框 */
.pixel-select {
  border: 2px solid #000;
  padding: 8px 12px;
  font-family: "VT323", monospace;
  font-size: 14px;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
  appearance: none;
}

.pixel-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4f46e5;
  border-color: #4f46e5;
}

/* 标签操作按钮 */
.tag-actions {
  display: flex;
  gap: 4px;
}

.tag-actions .pixel-button-sm {
  padding: 4px 6px;
  font-size: 12px;
  min-width: auto;
}

/* 批量操作面板 */
#bulk-actions-panel {
  border: 2px solid #000;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 统计卡片 */
.pixel-border {
  border: 2px solid #000;
}

/* 颜色选择器增强 */
.color-option {
  position: relative;
  transition: all 0.2s ease;
  cursor: pointer;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.border-gray-800 {
  border-color: #1f2937 !important;
  transform: scale(1.2);
}

.color-option::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.color-option.border-gray-800::after {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tags-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .tag-item {
    padding: 12px;
  }

  .tag-badge-display {
    font-size: 12px;
    padding: 4px 8px;
  }

  #bulk-actions-panel .flex {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .pixel-input,
  .pixel-select {
    font-size: 14px;
    padding: 6px 10px;
  }

  .tag-actions {
    position: static;
    opacity: 1 !important;
    margin-top: 8px;
    justify-content: flex-end;
  }
}

/* 加载动画 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #000;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 空状态样式 */
#empty-tags {
  border: 2px dashed #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}

/* 搜索高亮 */
.search-highlight {
  background-color: #ffff0080;
  padding: 1px 2px;
  border-radius: 2px;
}
```

这个详细的标签管理页面设计提供了：

1. **完整的页面布局** - 包含头部导航、主要内容区域和统计面板
2. **标签网格显示** - 类似图片中的布局，荧光色标签整齐排列
3. **丰富的交互功能** - 点击选择、双击编辑、悬停显示操作按钮
4. **搜索和排序** - 实时搜索和多种排序方式
5. **批量操作** - 支持多选和批量删除
6. **统计信息** - 显示标签使用情况统计
7. **响应式设计** - 适配移动端和桌面端
8. **像素风格** - 完全符合 TaskPixel 的设计风格

这个设计既保持了像素风格的特色，又提供了现代化的用户体验和完整的标签管理功能。

## 9. 基于现有页面的标签管理功能实施方案

### 9.1 现有页面分析

基于 `tags_management.html` 页面，我们需要将静态的标签展示转换为动态的标签管理系统。现有页面包含：

1. **标签管理区域** - 显示所有标签，支持搜索
2. **筛选结果区域** - 显示被选中标签关联的任务和目标
3. **标签样式** - 已有荧光色像素风格的标签样式

### 9.2 功能改造计划

#### 9.2.1 标签管理区域改造

**现有结构：**

```html
<div class="pixel-border bg-gray-100 p-6">
  <!-- 标题和新建按钮 -->
  <!-- 搜索框 -->
  <!-- 静态标签列表 -->
</div>
```

**改造为：**

```html
<div class="pixel-border bg-gray-100 p-6">
  <div class="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
    <div>
      <h2 class="font-display text-2xl text-black">标签管理</h2>
      <p class="text-gray-600 text-xl mt-2">点击选择，双击编辑，悬停删除。</p>
    </div>
    <div class="flex items-center gap-4">
      <p class="text-gray-600 text-xl whitespace-nowrap">
        总计: <span id="total-tags-count">0</span>
      </p>
      <button
        id="new-tag-btn"
        class="pixel-button h-12 px-4 text-lg whitespace-nowrap"
      >
        <span class="material-symbols-outlined mr-2">add</span>新建标签
      </button>
    </div>
  </div>

  <!-- 搜索和排序 -->
  <div class="mb-6 flex flex-col sm:flex-row gap-4">
    <div class="flex-1 relative">
      <span
        class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-gray-600"
        >search</span
      >
      <input
        id="tag-search"
        class="pixel-input w-full pl-12"
        placeholder="搜索标签..."
        type="text"
      />
    </div>
    <select id="tag-sort" class="pixel-select">
      <option value="name">按名称排序</option>
      <option value="usage">按使用频率</option>
      <option value="created">按创建时间</option>
    </select>
  </div>

  <!-- 动态标签容器 -->
  <div id="tags-container" class="flex flex-wrap gap-4">
    <!-- 标签将通过JavaScript动态生成 -->
  </div>

  <!-- 空状态 -->
  <div id="empty-tags" class="text-center py-12 hidden">
    <div class="text-6xl mb-4">🏷️</div>
    <h3 class="text-xl font-bold mb-2">还没有标签</h3>
    <p class="text-gray-600 mb-4">创建你的第一个标签来开始分类管理目标</p>
    <button class="pixel-button bg-primary text-white create-first-tag">
      创建标签
    </button>
  </div>
</div>
```

#### 9.2.2 筛选结果区域改造

**功能增强：**

1. 动态显示选中标签
2. 实时更新筛选结果
3. 支持多标签筛选

```html
<div class="bg-gray-100 p-6 pixel-border" id="filter-results-section">
  <div class="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
    <div>
      <h2 class="font-display text-2xl text-black">筛选结果</h2>
      <div class="text-gray-600 text-xl mt-2">
        <span id="filter-description">显示标记为：</span>
        <div
          id="selected-tags-display"
          class="inline-flex flex-wrap gap-2 mt-2"
        >
          <!-- 选中的标签将动态显示在这里 -->
        </div>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <p class="text-gray-600 text-xl whitespace-nowrap">
        结果: <span id="filter-results-count">0</span>
      </p>
      <button id="clear-filter" class="pixel-button bg-gray-500 text-white">
        清除筛选
      </button>
    </div>
  </div>

  <!-- 标签页切换 -->
  <div x-data="{ activeTab: 'tasks' }">
    <div class="flex items-end">
      <button
        :class="{ 'active': activeTab === 'tasks' }"
        @click="activeTab = 'tasks'"
        class="pixel-tab active"
      >
        任务
      </button>
      <button
        :class="{ 'active': activeTab === 'goals' }"
        @click="activeTab = 'goals'"
        class="pixel-tab"
      >
        目标
      </button>
    </div>
    <div class="border-4 border-black bg-white p-4">
      <div x-show="activeTab === 'tasks'" id="filtered-tasks-container">
        <!-- 筛选的任务将动态显示 -->
      </div>
      <div x-show="activeTab === 'goals'" id="filtered-goals-container">
        <!-- 筛选的目标将动态显示 -->
      </div>
    </div>
  </div>
</div>
```

### 9.3 实施步骤

1. **第一步：修改现有页面结构**

   - 为关键元素添加 ID 和类名
   - 添加动态内容容器
   - 引入必要的 JavaScript 模块

2. **第二步：创建标签管理 JavaScript 模块**

   - 基于现有页面结构实现功能
   - 保持现有的荧光色像素风格
   - 集成标签筛选和管理功能

3. **第三步：扩展 CSS 样式**

   - 添加选中状态样式
   - 优化交互效果
   - 确保响应式布局

4. **第四步：集成到现有系统**
   - 连接标签管理器
   - 实现数据同步
   - 测试所有功能

### 9.4 关键功能特性

1. **标签管理**

   - 点击选择标签进行筛选
   - 双击编辑标签
   - 悬停显示删除按钮
   - 搜索和排序功能

2. **筛选功能**

   - 多标签组合筛选
   - 实时显示筛选结果
   - 分别显示任务和目标
   - 清除筛选功能

3. **视觉效果**
   - 保持荧光色像素风格
   - 选中状态高亮显示
   - 平滑的交互动画
   - 响应式布局适配

这个实施方案充分利用了现有的 `tags_management.html` 页面结构和样式，将静态展示转换为功能完整的标签管理系统，同时保持了 TaskPixel 独特的像素风格特色。
