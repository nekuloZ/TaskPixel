/**
 * TaskPixel TagInput 集成助手
 * 提供简化的API来集成TagInput组件到现有页面
 */

TaskPixel.TagInputIntegration = {
  // 活动的集成实例
  integrations: new Map(),

  // 为任务详情页面创建标签输入
  createForTaskDetail: function () {
    try {
      // 查找任务标签容器
      const taskContainer = document.querySelector('[data-target="task"]');
      if (taskContainer) {
        const instanceId = TaskPixel.TagInput.create(taskContainer, {
          placeholder: "输入任务标签...",
          allowCreate: true,
          showUsageCount: true,
        });

        if (instanceId) {
          // 监听标签选择事件
          taskContainer.addEventListener("tagSelected", (e) => {
            const taskId = taskContainer.dataset.taskId;
            if (taskId && e.detail.tagId) {
              this._addTagToTask(taskId, e.detail.tagId);
            }
          });

          this.integrations.set("task-detail-task", instanceId);
          console.log("任务标签输入创建成功");
        }
      }

      // 查找目标标签容器
      const goalContainers = document.querySelectorAll('[data-target="goal"]');
      goalContainers.forEach((container, index) => {
        const instanceId = TaskPixel.TagInput.create(container, {
          placeholder: "输入目标标签...",
          allowCreate: true,
          showUsageCount: true,
        });

        if (instanceId) {
          // 监听标签选择事件
          container.addEventListener("tagSelected", (e) => {
            const taskId = container.dataset.taskId;
            const goalId = container.dataset.goalId;
            if (taskId && goalId && e.detail.tagId) {
              this._addTagToGoal(taskId, goalId, e.detail.tagId);
            }
          });

          this.integrations.set(`task-detail-goal-${index}`, instanceId);
          console.log(`目标标签输入创建成功: ${index}`);
        }
      });
    } catch (error) {
      console.error(
        "TaskInputIntegration.createForTaskDetail: 创建失败",
        error
      );
    }
  },

  // 为标签管理页面创建标签输入
  createForTagManagement: function () {
    try {
      const container = document.querySelector(
        "#tag-management-input-container"
      );
      if (!container) return;

      const instanceId = TaskPixel.TagInput.create(container, {
        placeholder: "创建新标签...",
        allowCreate: true,
        showUsageCount: false,
        maxSuggestions: 5,
      });

      if (instanceId) {
        container.addEventListener("tagSelected", (e) => {
          // 标签管理页面可能需要不同的处理逻辑
          console.log("标签管理页面标签选择:", e.detail.tagId);
        });

        this.integrations.set("tag-management", instanceId);
        console.log("标签管理页面标签输入创建成功");
      }
    } catch (error) {
      console.error(
        "TaskInputIntegration.createForTagManagement: 创建失败",
        error
      );
    }
  },

  // 销毁所有集成
  destroyAll: function () {
    try {
      this.integrations.forEach((instanceId, key) => {
        TaskPixel.TagInput.destroy(instanceId);
      });
      this.integrations.clear();
      console.log("所有TagInput集成已销毁");
    } catch (error) {
      console.error("TaskInputIntegration.destroyAll: 销毁失败", error);
    }
  },

  // 刷新集成（重新创建）
  refresh: function () {
    this.destroyAll();

    // 根据当前页面重新创建
    const currentPage = this._detectCurrentPage();
    switch (currentPage) {
      case "task-detail":
        this.createForTaskDetail();
        break;
      case "tag-management":
        this.createForTagManagement();
        break;
    }
  },

  // 私有方法：添加标签到任务
  _addTagToTask: function (taskId, tagId) {
    try {
      const result = TaskPixel.TagManager.addTagToTask(taskId, tagId);
      if (result.success) {
        // 刷新任务标签显示
        this._refreshTaskTagsDisplay(taskId);
        console.log("标签已添加到任务:", tagId);
      } else {
        console.error("添加标签到任务失败:", result.error);
        this._showMessage(
          "添加标签失败: " + (result.error ? result.error.message : "未知错误"),
          "error"
        );
      }
    } catch (error) {
      console.error("_addTagToTask: 添加失败", error);
      this._showMessage("添加标签时发生错误", "error");
    }
  },

  // 私有方法：添加标签到目标
  _addTagToGoal: function (taskId, goalId, tagId) {
    try {
      const result = TaskPixel.TagManager.addTagToGoal(taskId, goalId, tagId);
      if (result.success) {
        // 刷新目标标签显示
        this._refreshGoalTagsDisplay(goalId);
        console.log("标签已添加到目标:", tagId);
      } else {
        console.error("添加标签到目标失败:", result.error);
        this._showMessage(
          "添加标签失败: " + (result.error ? result.error.message : "未知错误"),
          "error"
        );
      }
    } catch (error) {
      console.error("_addTagToGoal: 添加失败", error);
      this._showMessage("添加标签时发生错误", "error");
    }
  },

  // 私有方法：刷新任务标签显示
  _refreshTaskTagsDisplay: function (taskId) {
    try {
      const container = document.querySelector(".task-tags-display");
      if (!container) return;

      const tags = TaskPixel.DataStore.getTaskTags(taskId);
      this._renderTagsInContainer(container, tags, (tagId) => {
        this._removeTagFromTask(taskId, tagId);
      });
    } catch (error) {
      console.error("_refreshTaskTagsDisplay: 刷新失败", error);
    }
  },

  // 私有方法：刷新目标标签显示
  _refreshGoalTagsDisplay: function (goalId) {
    try {
      const container = document.querySelector(
        `[data-goal-id="${goalId}"] .goal-tags-display`
      );
      if (!container) return;

      // 需要找到taskId
      const goalContainer = document.querySelector(
        `[data-goal-id="${goalId}"]`
      );
      const taskId = goalContainer
        ? goalContainer.closest("[data-task-id]")?.dataset.taskId
        : null;

      if (taskId) {
        const tags = TaskPixel.DataStore.getGoalTags(taskId, goalId);
        this._renderTagsInContainer(container, tags, (tagId) => {
          this._removeTagFromGoal(taskId, goalId, tagId);
        });
      }
    } catch (error) {
      console.error("_refreshGoalTagsDisplay: 刷新失败", error);
    }
  },

  // 私有方法：在容器中渲染标签
  _renderTagsInContainer: function (container, tags, onRemove) {
    container.innerHTML = "";

    tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.className = "task-tag";
      tagElement.style.color = tag.color || "#374151";
      const displayText = tag.display_text || "#" + tag.name || "#" + tag.id;
      tagElement.textContent = displayText;
      tagElement.title = "点击移除此标签";

      tagElement.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm(`确定要移除标签 ${displayText} 吗？`)) {
          onRemove(tag.id);
        }
      });

      container.appendChild(tagElement);
    });
  },

  // 私有方法：从任务移除标签
  _removeTagFromTask: function (taskId, tagId) {
    try {
      const result = TaskPixel.TagManager.removeTagFromTask(taskId, tagId);
      if (result.success) {
        this._refreshTaskTagsDisplay(taskId);
        console.log("标签已从任务移除:", tagId);
      } else {
        console.error("从任务移除标签失败:", result.error);
        this._showMessage("移除标签失败", "error");
      }
    } catch (error) {
      console.error("_removeTagFromTask: 移除失败", error);
    }
  },

  // 私有方法：从目标移除标签
  _removeTagFromGoal: function (taskId, goalId, tagId) {
    try {
      const result = TaskPixel.TagManager.removeTagFromGoal(
        taskId,
        goalId,
        tagId
      );
      if (result.success) {
        this._refreshGoalTagsDisplay(goalId);
        console.log("标签已从目标移除:", tagId);
      } else {
        console.error("从目标移除标签失败:", result.error);
        this._showMessage("移除标签失败", "error");
      }
    } catch (error) {
      console.error("_removeTagFromGoal: 移除失败", error);
    }
  },

  // 私有方法：检测当前页面
  _detectCurrentPage: function () {
    const path = window.location.pathname;
    if (path.includes("task_detail.html")) {
      return "task-detail";
    } else if (path.includes("tags_management.html")) {
      return "tag-management";
    }
    return "unknown";
  },

  // 私有方法：显示消息
  _showMessage: function (message, type = "info") {
    // 简单的消息显示，可以根据需要改进
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

  // 初始化集成
  init: function () {
    // 监听页面加载完成
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this._autoInit();
      });
    } else {
      this._autoInit();
    }
  },

  // 自动初始化
  _autoInit: function () {
    const currentPage = this._detectCurrentPage();

    switch (currentPage) {
      case "task-detail":
        // 延迟初始化，等待页面元素完全加载
        setTimeout(() => {
          this.createForTaskDetail();
        }, 1000);
        break;
      case "tag-management":
        setTimeout(() => {
          this.createForTagManagement();
        }, 500);
        break;
    }
  },
};
