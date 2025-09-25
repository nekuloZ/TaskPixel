TaskPixel.TagsManagement = {
  init: function () {
    console.log("标签管理页面初始化完成");

    // 确保 DataStore 重新加载最新数据
    TaskPixel.DataStore.loadFromStorage();

    // 如果有标签容器，渲染标签
    const container = document.getElementById("tags-container");
    if (container) {
      this.renderTags(container);
    } else {
      console.warn("未找到标签容器元素");
    }

    // 绑定创建标签按钮
    this.bindCreateTagButton();

    // 绑定搜索和排序功能
    this.bindSearchAndSort();

    // 绑定清除筛选按钮
    this.bindClearFilterButton();
  },

  bindSearchAndSort: function () {
    const searchInput = document.getElementById("tag-search");
    const sortSelect = document.getElementById("tag-sort");

    if (searchInput) {
      // 清除之前的事件监听器
      searchInput.removeEventListener("input", this.handleSearchInput);

      // 创建绑定的事件处理函数
      this.handleSearchInput = (e) => {
        this.filterTags(e.target.value);
      };

      searchInput.addEventListener("input", this.handleSearchInput);
    }

    if (sortSelect) {
      // 清除之前的事件监听器
      sortSelect.removeEventListener("change", this.handleSortChange);

      // 创建绑定的事件处理函数
      this.handleSortChange = (e) => {
        this.sortTags(e.target.value);
      };

      sortSelect.addEventListener("change", this.handleSortChange);
    }
  },

  filterTags: function (query) {
    const container = document.getElementById("tags-container");
    if (!container) return;

    const searchTerm = query.toLowerCase().trim();

    // 如果搜索框为空，重新渲染所有标签
    if (searchTerm === "") {
      const allTags = TaskPixel.TagManager.getAllTags();
      container.innerHTML = "";
      this.renderTagsManually(container, allTags);
      this.updateFilterResults(allTags.length, "");
      return;
    }

    const tagElements = container.querySelectorAll(".management-tag");
    let visibleCount = 0;

    tagElements.forEach((tagElement) => {
      const tagText = tagElement.textContent
        .toLowerCase()
        .replace("×", "")
        .trim();

      if (tagText.includes(searchTerm)) {
        tagElement.style.display = "inline-block";
        visibleCount++;
      } else {
        tagElement.style.display = "none";
      }
    });

    // 更新结果提示
    this.updateFilterResults(visibleCount, query);
  },

  sortTags: function (sortBy) {
    const container = document.getElementById("tags-container");
    if (!container) return;

    // 获取当前显示的标签
    let allTags = TaskPixel.TagManager.getAllTags();

    // 根据排序方式重新排序
    switch (sortBy) {
      case "name":
        allTags.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "usage":
        allTags.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        break;
      case "created":
        allTags.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        break;
    }

    // 清空容器后重新渲染
    container.innerHTML = "";
    this.renderTagsManually(container, allTags);
  },

  updateFilterResults: function (count, query) {
    const filterDesc = document.getElementById("filter-description");
    if (filterDesc) {
      if (query.trim()) {
        filterDesc.textContent = `搜索 "${query}" 的结果: ${count} 个标签`;
      } else {
        filterDesc.textContent = `显示所有标签: ${count} 个`;
      }
    }
  },

  renderTags: function (container) {
    try {
      console.log("开始渲染标签...");

      // 强制刷新 DataStore 和 TagManager 缓存
      TaskPixel.DataStore.loadFromStorage();
      TaskPixel.TagManager.invalidateCache();

      const allTags = TaskPixel.TagManager.getAllTags();

      console.log("获取到的标签数量:", allTags.length);
      console.log("标签数据:", allTags);

      // 也直接检查 localStorage 中的数据
      const rawData = JSON.parse(
        localStorage.getItem("taskpixel_data") || "{}"
      );
      console.log("localStorage 中的标签数据:", rawData.tags);

      // 清空容器
      container.innerHTML = "";

      if (allTags.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12 text-gray-500">
            <p class="text-lg">暂无标签</p>
            <p class="text-sm mt-2">在任务详情页添加标签或点击"创建新标签"开始添加标签</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">刷新页面</button>
          </div>
        `;
        return;
      }

      // 统一使用手动渲染方法，确保交互功能正常工作
      this.renderTagsManually(container, allTags);

      // 更新标签计数
      this.updateTagCount(allTags.length);
    } catch (error) {
      console.error("渲染标签失败:", error);
      container.innerHTML = `
        <div class="text-center py-12 text-red-500">
          <p>加载标签失败</p>
          <p class="text-sm mt-2">错误: ${error.message}</p>
        </div>
      `;
    }
  },

  renderTagsManually: function (container, tags) {
    // 防御性清理：确保容器是空的
    if (container.children.length > 0) {
      console.warn("容器不为空，正在清理...");
      container.innerHTML = "";
    }

    // 创建标签网格容器
    const tagsGrid = document.createElement("div");
    tagsGrid.className = "flex flex-wrap gap-3 p-4";

    tags.forEach((tag) => {
      // 创建简单的标签元素，与任务详情页面完全一致
      const tagElement = document.createElement("span");
      tagElement.className = "management-tag";
      tagElement.dataset.tagId = tag.id;
      tagElement.dataset.selected = "false";

      // 设置标签样式
      const tagColor = tag.color || "#374151";
      tagElement.style.color = tagColor;
      tagElement.style.borderColor = tagColor;
      tagElement.style.backgroundColor = this.hexToRgba(tagColor, 0.1);

      // 使用 fallback 机制确保显示文本
      const displayText = tag.display_text || "#" + tag.name || tag.id;
      tagElement.textContent = displayText;

      // 设置标题显示更多信息
      tagElement.title = `标签: ${displayText}\n使用次数: ${
        tag.usage_count || 0
      }\n创建时间: ${new Date(
        tag.created_at || Date.now()
      ).toLocaleDateString()}\n\n点击选择，双击编辑，悬停删除`;

      // 绑定交互事件
      this.bindTagInteractions(tagElement, tag);

      tagsGrid.appendChild(tagElement);
    });

    container.appendChild(tagsGrid);
  },

  bindTagInteractions: function (tagElement, tag) {
    const tagId = tag.id;
    const displayText = tag.display_text || "#" + tag.name || tag.id;
    const originalText = tagElement.textContent;

    // 1. 单击选择/取消选择
    tagElement.addEventListener("click", (e) => {
      // 检查是否点击了删除符号区域
      const rect = tagElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      // 如果点击在右侧30px区域（删除符号区域），并且标签处于悬停状态
      // CSS ::after 伪元素会在悬停时显示删除符号
      if (x > width - 30) {
        e.preventDefault();
        e.stopPropagation();

        if (
          confirm(
            `确定要删除标签 "${displayText}" 吗？\n\n注意：这将从系统中完全删除此标签。`
          )
        ) {
          this.deleteTag(tagId);
        }
        return;
      }

      // 否则是选择/取消选择
      e.preventDefault();
      const isSelected = tagElement.dataset.selected === "true";

      if (isSelected) {
        this.deselectTag(tagElement);
      } else {
        this.selectTag(tagElement, tag);
      }
    });

    // 2. 双击编辑
    tagElement.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.editTag(tagId);
    });

    // 3. 悬停删除检测
    // 删除符号完全由CSS的::after伪元素处理，这里不需要手动添加
    // 只需要在点击时检测是否点击了删除区域
  },

  selectTag: function (tagElement, tag) {
    // 先取消其他选中的标签
    const container = document.getElementById("tags-container");
    const selectedTags = container.querySelectorAll('[data-selected="true"]');
    selectedTags.forEach((selectedTag) => {
      this.deselectTag(selectedTag);
    });

    // 选中当前标签
    tagElement.dataset.selected = "true";
    tagElement.classList.add("selected");

    console.log("选中标签:", tag);
    this.showMessage(
      `已选中标签: ${tag.display_text || "#" + tag.name}`,
      "info"
    );

    // 更新选中标签显示
    this.updateSelectedTagsDisplay([tag]);

    // 筛选并显示相关内容
    this.filterBySelectedTags([tag]);
  },

  updateSelectedTagsDisplay: function (selectedTags) {
    const display = document.getElementById("selected-tags-display");
    if (!display) return;

    if (selectedTags.length === 0) {
      display.innerHTML = '<span class="text-gray-500">未选择任何标签</span>';
      return;
    }

    display.innerHTML = selectedTags
      .map((tag) => {
        const displayText = tag.display_text || "#" + tag.name || tag.id;
        return `
        <span class="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-sm">
          <span style="color: ${tag.color || "#374151"}">${displayText}</span>
          <button class="text-gray-400 hover:text-red-500 ml-1" onclick="this.parentElement.remove()">×</button>
        </span>
      `;
      })
      .join("");
  },

  deselectTag: function (tagElement) {
    tagElement.dataset.selected = "false";
    tagElement.classList.remove("selected");

    // 清除选中标签显示
    this.updateSelectedTagsDisplay([]);

    // 清除筛选结果
    this.clearFilterResults();
  },

  bindCreateTagButton: function () {
    const createBtn = document.getElementById("new-tag-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        this.showCreateTagDialog();
      });
    }
  },

  bindClearFilterButton: function () {
    const clearBtn = document.getElementById("clear-filter");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        // 取消所有标签选择
        const container = document.getElementById("tags-container");
        const selectedTags = container.querySelectorAll(
          '[data-selected="true"]'
        );
        selectedTags.forEach((selectedTag) => {
          this.deselectTag(selectedTag);
        });

        // 清除筛选结果
        this.clearFilterResults();

        // 更新选中标签显示
        this.updateSelectedTagsDisplay([]);

        this.showMessage("已清除所有筛选", "info");
      });
    }
  },

  showCreateTagDialog: function () {
    // 统一使用简单的创建标签对话框，避免依赖TagDisplay组件
    const tagName = prompt("请输入标签名称:");
    if (tagName && tagName.trim()) {
      const result = TaskPixel.TagManager.createTag({
        name: tagName.trim(),
        color: "#374151",
        description: "",
      });

      if (result.success) {
        const container = document.getElementById("tags-container");
        if (container) {
          this.renderTags(container);
        }
        this.showMessage("标签创建成功", "success");
      } else {
        this.showMessage(
          "创建标签失败: " + (result.error || "未知错误"),
          "error"
        );
      }
    }
  },

  editTag: function (tagId) {
    try {
      const tag = TaskPixel.TagManager.getTagById(tagId);
      if (!tag) {
        this.showMessage("标签不存在", "error");
        return;
      }

      this.showEditTagDialog(tag);
    } catch (error) {
      console.error("编辑标签失败:", error);
      this.showMessage("编辑标签失败", "error");
    }
  },

  showEditTagDialog: function (tag) {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const displayText = tag.display_text || "#" + tag.name || tag.id;

    modal.innerHTML = `
      <div class="pixel-border bg-white p-6 max-w-md w-full mx-4 rounded">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-display">编辑标签</h3>
          <button class="close-modal text-xl hover:text-red-500 transition-colors">×</button>
        </div>
        
        <form class="edit-tag-form space-y-4">
          <div>
            <label class="block text-sm font-display mb-2">标签名称</label>
            <input type="text" class="tag-name-input pixel-input w-full" 
                   value="${tag.name}" required>
          </div>
          
          <div>
            <label class="block text-sm font-display mb-2">显示文本</label>
            <input type="text" class="tag-display-input pixel-input w-full" 
                   value="${displayText}" placeholder="显示文本，默认为 #标签名称">
          </div>
          
          <div>
            <label class="block text-sm font-display mb-2">颜色</label>
            <input type="color" class="tag-color-input w-full h-10 pixel-border rounded" 
                   value="${tag.color || "#374151"}">
          </div>
          
          <div>
            <label class="block text-sm font-display mb-2">描述</label>
            <textarea class="tag-desc-input pixel-input w-full h-20" 
                      placeholder="标签描述">${tag.description || ""}</textarea>
          </div>
          
          <div class="flex gap-2 justify-end">
            <button type="button" class="cancel-btn pixel-button hover:bg-gray-100 transition-colors">取消</button>
            <button type="submit" class="save-btn pixel-button bg-primary text-white hover:bg-blue-600 transition-colors">保存</button>
          </div>
        </form>
      </div>
    `;

    // 绑定事件
    const form = modal.querySelector(".edit-tag-form");
    const closeBtn = modal.querySelector(".close-modal");
    const cancelBtn = modal.querySelector(".cancel-btn");

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = form.querySelector(".tag-name-input").value.trim();
      const displayText = form.querySelector(".tag-display-input").value.trim();
      const color = form.querySelector(".tag-color-input").value;
      const description = form.querySelector(".tag-desc-input").value.trim();

      if (!name) {
        this.showMessage("请输入标签名称", "error");
        return;
      }

      const updateData = {
        name: name,
        color: color,
        description: description,
      };

      if (displayText && displayText !== "#" + name) {
        updateData.display_text = displayText;
      }

      try {
        const result = TaskPixel.TagManager.updateTag(tag.id, updateData);
        if (result.success) {
          closeModal();
          // 重新渲染标签列表
          const container = document.getElementById("tags-container");
          if (container) {
            this.renderTags(container);
          }
          this.showMessage("标签更新成功", "success");
        } else {
          this.showMessage(
            "更新标签失败: " + (result.error || "未知错误"),
            "error"
          );
        }
      } catch (error) {
        console.error("更新标签时发生错误:", error);
        this.showMessage("更新标签时发生错误", "error");
      }
    });

    document.body.appendChild(modal);

    // 自动聚焦到名称输入框
    setTimeout(() => {
      modal.querySelector(".tag-name-input").focus();
    }, 100);
  },

  deleteTag: function (tagId) {
    try {
      const tag = TaskPixel.TagManager.getTagById(tagId);
      if (!tag) {
        this.showMessage("标签不存在", "error");
        return;
      }

      const displayText = tag.display_text || "#" + tag.name || tag.id;
      if (confirm(`确定要删除标签 "${displayText}" 吗？`)) {
        const result = TaskPixel.TagManager.deleteTag(tagId);
        if (result.success) {
          // 重新渲染
          const container = document.getElementById("tags-container");
          if (container) {
            this.renderTags(container);
          }
          this.showMessage("标签删除成功", "success");
        } else {
          this.showMessage(
            "删除标签失败: " + (result.error || "未知错误"),
            "error"
          );
        }
      }
    } catch (error) {
      console.error("删除标签失败:", error);
      this.showMessage("删除标签失败", "error");
    }
  },

  showMessage: function (message, type = "info") {
    const messageElement = document.createElement("div");
    const bgColor =
      {
        success: "bg-green-500",
        error: "bg-red-500",
        warning: "bg-yellow-500",
        info: "bg-blue-500",
      }[type] || "bg-blue-500";

    messageElement.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 pixel-border z-50 rounded`;
    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    setTimeout(() => {
      if (document.body.contains(messageElement)) {
        document.body.removeChild(messageElement);
      }
    }, 3000);
  },

  updateTagCount: function (count) {
    const totalTagsCount = document.getElementById("total-tags-count");
    if (totalTagsCount) {
      totalTagsCount.textContent = count;
    }
  },

  hexToRgba: function (hex, alpha) {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (error) {
      return `rgba(55, 65, 81, ${alpha})`; // 默认颜色
    }
  },

  // 根据选中标签筛选内容
  filterBySelectedTags: function (selectedTags) {
    if (!selectedTags || selectedTags.length === 0) {
      this.clearFilterResults();
      return;
    }

    const tagIds = selectedTags.map((tag) => tag.id);
    console.log("筛选标签ID:", tagIds);

    // 获取所有任务和目标
    try {
      const data = JSON.parse(localStorage.getItem("taskpixel_data") || "{}");

      // 筛选任务
      const filteredTasks = (data.tasks || []).filter((task) => {
        return (
          task.tags && task.tags.some((taskTagId) => tagIds.includes(taskTagId))
        );
      });

      // 筛选目标
      const filteredGoals = [];
      (data.tasks || []).forEach((task) => {
        if (task.goals) {
          task.goals.forEach((goal) => {
            if (
              goal.tags &&
              goal.tags.some((goalTagId) => tagIds.includes(goalTagId))
            ) {
              filteredGoals.push({
                ...goal,
                taskId: task.id,
                taskTitle: task.title,
              });
            }
          });
        }
      });

      this.displayFilterResults(filteredTasks, filteredGoals);
    } catch (error) {
      console.error("筛选标签内容时出错:", error);
      this.showMessage("筛选失败", "error");
    }
  },

  // 显示筛选结果
  displayFilterResults: function (tasks, goals) {
    const tasksContainer = document.getElementById("filtered-tasks-container");
    const goalsContainer = document.getElementById("filtered-goals-container");
    const resultsCount = document.getElementById("filter-results-count");

    // 更新结果计数
    if (resultsCount) {
      resultsCount.textContent = tasks.length + goals.length;
    }

    // 显示任务结果
    if (tasksContainer) {
      if (tasks.length === 0) {
        tasksContainer.innerHTML =
          '<p class="text-gray-500 text-center py-4">没有找到相关任务</p>';
      } else {
        tasksContainer.innerHTML = tasks
          .map(
            (task) => `
          <li class="flex justify-between items-center py-2 border-b-2 border-dashed border-black/30">
            <div class="flex items-center gap-4">
              <span class="material-symbols-outlined text-3xl ${
                task.status === "completed" ? "text-green-600" : "text-gray-600"
              }">
                ${
                  task.status === "completed"
                    ? "check_circle"
                    : "radio_button_unchecked"
                }
              </span>
              <a href="task_detail.html?id=${
                task.id
              }" class="text-xl text-black hover:text-blue-600 transition-colors duration-200">
                ${task.title}
              </a>
            </div>
            <div class="flex items-center gap-2">
              ${this.renderTaskTags(task)}
            </div>
          </li>
        `
          )
          .join("");
      }
    }

    // 显示目标结果
    if (goalsContainer) {
      if (goals.length === 0) {
        goalsContainer.innerHTML =
          '<p class="text-gray-500 text-center py-4">没有找到相关目标</p>';
      } else {
        goalsContainer.innerHTML = goals
          .map(
            (goal) => `
          <div class="py-2 border-b-2 border-dashed border-black/30">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-yellow-600 text-3xl">rocket_launch</span>
                <div>
                  <p class="text-xl text-black">${goal.title}</p>
                  <p class="text-sm text-gray-600">来自任务: ${
                    goal.taskTitle
                  }</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${this.renderGoalTags(goal)}
              </div>
            </div>
          </div>
        `
          )
          .join("");
      }
    }
  },

  // 渲染任务标签
  renderTaskTags: function (task) {
    if (!task.tags || task.tags.length === 0) return "";

    return task.tags
      .map((tagId) => {
        const tag = TaskPixel.TagManager.getTagById(tagId);
        if (tag) {
          const displayText = tag.display_text || "#" + tag.name;
          return `
          <div class="pixel-tag shadow-tag-shadow bg-white !text-base !cursor-default !py-1 !px-2">
            <span style="color: ${tag.color || "#374151"}">${displayText}</span>
          </div>
        `;
        }
        return "";
      })
      .join("");
  },

  // 渲染目标标签
  renderGoalTags: function (goal) {
    if (!goal.tags || goal.tags.length === 0) return "";

    return goal.tags
      .map((tagId) => {
        const tag = TaskPixel.TagManager.getTagById(tagId);
        if (tag) {
          const displayText = tag.display_text || "#" + tag.name;
          return `
          <div class="pixel-tag shadow-tag-shadow bg-white !text-base !cursor-default !py-1 !px-2">
            <span style="color: ${tag.color || "#374151"}">${displayText}</span>
          </div>
        `;
        }
        return "";
      })
      .join("");
  },

  // 清除筛选结果
  clearFilterResults: function () {
    const tasksContainer = document.getElementById("filtered-tasks-container");
    const goalsContainer = document.getElementById("filtered-goals-container");
    const resultsCount = document.getElementById("filter-results-count");

    if (tasksContainer) {
      tasksContainer.innerHTML =
        '<p class="text-gray-500 text-center py-4">请选择标签进行筛选</p>';
    }

    if (goalsContainer) {
      goalsContainer.innerHTML =
        '<p class="text-gray-500 text-center py-4">请选择标签进行筛选</p>';
    }

    if (resultsCount) {
      resultsCount.textContent = "0";
    }
  },
};
