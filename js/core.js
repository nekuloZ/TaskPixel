/**
 * TaskPixel 核心功能模块
 * 提供数据管理、事件管理、页面导航和工具函数
 */

// 命名空间
const TaskPixel = {
  // 初始化应用程序
  init: function () {
    // 初始化各个模块
    this.DataStore.init();
    this.EventBus.init();
    this.Navigation.init();

    console.log("TaskPixel 初始化完成");
  },

  /**
   * 数据存储模块 - 负责所有数据的CRUD操作
   */
  DataStore: {
    // 存储键名
    STORAGE_KEY: "taskpixel_data",

    // 数据结构
    data: {
      tasks: [],
      settings: {
        theme: "light",
        notifications: "all",
        username: "Sarah",
        email: "",
      },
      tags: [], // 新增：全局标签列表
    },

    // 初始化数据存储
    init: function () {
      this.loadFromStorage();
      console.log("数据存储初始化完成");
    },

    // 从localStorage加载数据
    loadFromStorage: function () {
      try {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        if (savedData) {
          this.data = JSON.parse(savedData);
          console.log("数据加载成功");

          // 检查是否需要数据迁移
          const currentVersion = this.detectDataVersion();
          if (currentVersion !== this.DATA_VERSION) {
            console.log("检测到旧版本数据，开始迁移...");
            const migrationResult = this.migrateData();
            if (migrationResult.success) {
              console.log(migrationResult.message);
            } else {
              console.error("数据迁移失败:", migrationResult.error);
            }
          }

          // 验证数据完整性
          const integrityReport = this.validateDataIntegrity();
          if (!integrityReport.isValid) {
            console.warn("数据完整性检查发现问题:", integrityReport.issues);
            if (integrityReport.fixes.length > 0) {
              console.log("自动修复:", integrityReport.fixes);
            }
          }

          // 触发数据加载事件
          TaskPixel.EventBus.emit("data:loaded", this.data);
        } else {
          console.log("未找到已保存的数据，使用默认数据");
          // 设置版本号
          this.data.version = this.DATA_VERSION;
        }
      } catch (error) {
        console.error("加载数据出错:", error);
        // 尝试恢复备份
        this._attemptDataRecovery();
      }
    },

    // 尝试数据恢复
    _attemptDataRecovery: function () {
      try {
        // 查找最新的备份
        const backupKeys = Object.keys(localStorage)
          .filter((key) => key.startsWith(this.STORAGE_KEY + "_backup_"))
          .sort()
          .reverse();

        if (backupKeys.length > 0) {
          const latestBackup = localStorage.getItem(backupKeys[0]);
          if (latestBackup) {
            this.data = JSON.parse(latestBackup);
            console.log("从备份恢复数据成功:", backupKeys[0]);
            this.saveToStorage(); // 保存恢复的数据
            return true;
          }
        }
      } catch (error) {
        console.error("数据恢复失败:", error);
      }

      // 如果恢复失败，使用默认数据
      console.log("使用默认数据结构");
      this.data = {
        tasks: [],
        settings: {
          theme: "light",
          notifications: "all",
          username: "Sarah",
          email: "",
        },
        tags: [],
        version: this.DATA_VERSION,
      };
      return false;
    },

    // 保存数据到localStorage
    saveToStorage: function () {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        console.log("数据保存成功");
        return true;
      } catch (error) {
        console.error("保存数据出错:", error);
        return false;
      }
    },

    // 获取所有任务
    getAllTasks: function () {
      return this.data.tasks;
    },

    // 按ID获取任务
    getTaskById: function (taskId) {
      return this.data.tasks.find((task) => task.id === taskId);
    },

    // 添加新任务
    addTask: function (taskData) {
      // 生成唯一ID
      const taskId = this.generateId();
      const newTask = {
        id: taskId,
        title: taskData.title || "未命名任务",
        description: taskData.description || "",
        created_at: new Date().toISOString(),
        due_date: taskData.due_date || null,
        progress: 0,
        goals: [],
        order: this.data.tasks ? this.data.tasks.length : 0,
        timeline: [],
      };

      this.data.tasks.push(newTask);
      this.saveToStorage();
      TaskPixel.EventBus.emit("task:added", newTask);
      return taskId;
    },

    // 批量更新任务顺序（接受按新顺序排列的任务ID数组）
    updateTaskOrder: function (orderedTaskIds) {
      if (!Array.isArray(orderedTaskIds)) return false;
      // 创建一个映射到索引
      orderedTaskIds.forEach((taskId, idx) => {
        const t = this.getTaskById(taskId);
        if (t) t.order = idx;
      });
      // 按 order 排序以保持内部数组一致
      this.data.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      this.saveToStorage();
      TaskPixel.EventBus.emit("tasks:reordered", this.data.tasks);
      return true;
    },

    // 更新任务
    updateTask: function (taskId, updatedData) {
      const taskIndex = this.data.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) return false;

      // 合并现有数据和更新数据
      const updatedTask = { ...this.data.tasks[taskIndex], ...updatedData };
      this.data.tasks[taskIndex] = updatedTask;

      this.saveToStorage();
      TaskPixel.EventBus.emit("task:updated", updatedTask);
      return true;
    },

    // 删除任务
    deleteTask: function (taskId) {
      const taskIndex = this.data.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) {
        console.warn("Task not found with ID:", taskId);
        return false;
      }

      const deletedTask = this.data.tasks[taskIndex];
      this.data.tasks.splice(taskIndex, 1);

      this.saveToStorage();
      TaskPixel.EventBus.emit("task:deleted", deletedTask);
      return true;
    },

    // 添加目标到任务
    addGoalToTask: function (taskId, goalData) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      // 确保任务有goals数组
      if (!task.goals) {
        task.goals = [];
      }

      const goalId = this.generateId();
      const newGoal = {
        id: goalId,
        title: goalData.title || "未命名目标",
        description: goalData.description || "",
        priority: goalData.priority || "",
        priority_reason: goalData.priority_reason || "",
        substeps: [],
        order: task.goals ? task.goals.length : 0,
      };

      task.goals.push(newGoal);
      this.saveToStorage();
      TaskPixel.EventBus.emit("goal:added", { taskId, goal: newGoal });
      return goalId;
    },

    // 从任务中删除目标
    deleteGoalFromTask: function (taskId, goalId) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goalIndex = task.goals.findIndex((g) => g.id === goalId);
      if (goalIndex === -1) return false;

      // 保存被删除的目标，用于事件触发
      const deletedGoal = task.goals[goalIndex];

      // 从任务中移除目标
      task.goals.splice(goalIndex, 1);

      // 保存数据并触发事件
      this.saveToStorage();
      TaskPixel.EventBus.emit("goal:deleted", { taskId, goalId });

      return true;
    },

    // 添加子步骤到目标
    addSubstepToGoal: function (taskId, goalId, substepContent) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goal = task.goals.find((g) => g.id === goalId);
      if (!goal) return false;

      const substepId = this.generateId();
      const newSubstep = {
        id: substepId,
        content: substepContent,
        completed: false,
        order: goal.substeps ? goal.substeps.length : 0,
      };

      goal.substeps.push(newSubstep);
      this.saveToStorage();
      TaskPixel.EventBus.emit("substep:added", {
        taskId,
        goalId,
        substep: newSubstep,
      });
      return substepId;
    },

    // 更新目标顺序（接受 taskId 和按新顺序的 goalId 数组）
    updateGoalOrder: function (taskId, orderedGoalIds) {
      const task = this.getTaskById(taskId);
      if (!task || !Array.isArray(orderedGoalIds)) return false;
      orderedGoalIds.forEach((goalId, idx) => {
        const g = task.goals.find((gg) => gg.id === goalId);
        if (g) g.order = idx;
      });
      task.goals.sort((a, b) => (a.order || 0) - (b.order || 0));
      this.saveToStorage();
      TaskPixel.EventBus.emit("goals:reordered", { taskId, goals: task.goals });
      return true;
    },

    // 更新子步骤顺序（taskId, goalId, orderedSubstepIds）
    updateSubstepOrder: function (taskId, goalId, orderedSubstepIds) {
      const task = this.getTaskById(taskId);
      if (!task || !Array.isArray(orderedSubstepIds)) return false;
      const goal = task.goals.find((g) => g.id === goalId);
      if (!goal) return false;
      orderedSubstepIds.forEach((sid, idx) => {
        const s = goal.substeps.find((ss) => ss.id === sid);
        if (s) s.order = idx;
      });
      goal.substeps.sort((a, b) => (a.order || 0) - (b.order || 0));
      this.saveToStorage();
      TaskPixel.EventBus.emit("substeps:reordered", {
        taskId,
        goalId,
        substeps: goal.substeps,
      });
      return true;
    },

    // 更新子步骤状态
    updateSubstepStatus: function (taskId, goalId, substepId, completed) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goal = task.goals.find((g) => g.id === goalId);
      if (!goal) return false;

      const substep = goal.substeps.find((s) => s.id === substepId);
      if (!substep) return false;

      substep.completed = completed;

      // 更新任务进度百分比
      this.updateTaskProgress(taskId);

      this.saveToStorage();
      TaskPixel.EventBus.emit("substep:updated", { taskId, goalId, substep });
      return true;
    },

    // 计算并更新任务进度
    updateTaskProgress: function (taskId) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      let totalSubsteps = 0;
      let completedSubsteps = 0;

      task.goals.forEach((goal) => {
        goal.substeps.forEach((substep) => {
          totalSubsteps++;
          if (substep.completed) completedSubsteps++;
        });
      });

      if (totalSubsteps === 0) {
        task.progress = 0;
      } else {
        task.progress = Math.round((completedSubsteps / totalSubsteps) * 100);
      }

      this.saveToStorage();
      return true;
    },

    // 更新目标信息
    updateGoal: function (taskId, goalId, updatedData) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goalIndex = task.goals.findIndex((g) => g.id === goalId);
      if (goalIndex === -1) return false;

      // 合并现有数据和更新数据
      const updatedGoal = { ...task.goals[goalIndex], ...updatedData };
      task.goals[goalIndex] = updatedGoal;

      this.saveToStorage();
      TaskPixel.EventBus.emit("goal:updated", { taskId, goal: updatedGoal });
      return true;
    },

    // 删除目标
    deleteGoal: function (taskId, goalId) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goalIndex = task.goals.findIndex((g) => g.id === goalId);
      if (goalIndex === -1) return false;

      const deletedGoal = task.goals[goalIndex];
      task.goals.splice(goalIndex, 1);

      // 更新任务进度
      this.updateTaskProgress(taskId);

      this.saveToStorage();
      TaskPixel.EventBus.emit("goal:deleted", {
        taskId,
        goalId,
        goal: deletedGoal,
      });
      return true;
    },

    // 更新子步骤内容
    updateSubstep: function (taskId, goalId, substepId, updatedContent) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goal = task.goals.find((g) => g.id === goalId);
      if (!goal) return false;

      const substep = goal.substeps.find((s) => s.id === substepId);
      if (!substep) return false;

      substep.content = updatedContent;

      this.saveToStorage();
      TaskPixel.EventBus.emit("substep:updated", { taskId, goalId, substep });
      return true;
    },

    // 删除子步骤
    deleteSubstep: function (taskId, goalId, substepId) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const goal = task.goals.find((g) => g.id === goalId);
      if (!goal) return false;

      const substepIndex = goal.substeps.findIndex((s) => s.id === substepId);
      if (substepIndex === -1) return false;

      const deletedSubstep = goal.substeps[substepIndex];
      goal.substeps.splice(substepIndex, 1);

      // 更新任务进度
      this.updateTaskProgress(taskId);

      this.saveToStorage();
      TaskPixel.EventBus.emit("substep:deleted", {
        taskId,
        goalId,
        substepId,
        substep: deletedSubstep,
      });
      return true;
    },

    // 添加时间记录
    addTimelineRecord: function (taskId, recordData) {
      const task = this.getTaskById(taskId);
      if (!task) return false;

      const recordId = this.generateId();
      const newRecord = {
        id: recordId,
        date: new Date().toISOString(),
        content: recordData.content || "",
        hours: recordData.hours || 0,
      };

      task.timeline.push(newRecord);
      this.saveToStorage();
      TaskPixel.EventBus.emit("timeline:added", { taskId, record: newRecord });
      return recordId;
    },

    // 更新用户设置
    updateSettings: function (settings) {
      this.data.settings = { ...this.data.settings, ...settings };
      this.saveToStorage();
      TaskPixel.EventBus.emit("settings:updated", this.data.settings);
      return true;
    },

    // 获取用户设置
    getSettings: function () {
      return this.data.settings;
    },

    // 为目标添加标签（改进版本）
    addTagsToGoal: function (taskId, goalId, tagIds) {
      try {
        // 参数验证
        if (
          !taskId ||
          !goalId ||
          !Array.isArray(tagIds) ||
          tagIds.length === 0
        ) {
          console.warn("addTagsToGoal: 无效参数", { taskId, goalId, tagIds });
          return false;
        }

        const task = this.getTaskById(taskId);
        if (!task) {
          console.warn("addTagsToGoal: 任务不存在", taskId);
          return false;
        }

        const goal = task.goals.find((g) => g.id === goalId);
        if (!goal) {
          console.warn("addTagsToGoal: 目标不存在", goalId);
          return false;
        }

        // 确保标签数组存在
        if (!goal.tags) goal.tags = [];

        // 验证标签是否存在
        const validTagIds = tagIds.filter((tagId) => {
          const tagExists =
            this.data.tags && this.data.tags.some((tag) => tag.id === tagId);
          if (!tagExists) {
            console.warn("addTagsToGoal: 标签不存在", tagId);
          }
          return tagExists;
        });

        if (validTagIds.length === 0) {
          console.warn("addTagsToGoal: 没有有效的标签ID");
          return false;
        }

        // 添加新标签，避免重复
        let addedCount = 0;
        validTagIds.forEach((tagId) => {
          if (!goal.tags.includes(tagId)) {
            goal.tags.push(tagId);
            addedCount++;
          }
        });

        if (addedCount > 0) {
          // 添加元数据
          if (!goal.tag_metadata) goal.tag_metadata = {};
          validTagIds.forEach((tagId) => {
            if (!goal.tag_metadata[tagId]) {
              goal.tag_metadata[tagId] = {
                added_at: new Date().toISOString(),
              };
            }
          });

          this.saveToStorage();
          TaskPixel.EventBus.emit("goal:tags_updated", {
            taskId,
            goalId,
            tags: goal.tags,
            addedTags: validTagIds,
          });
        }

        return true;
      } catch (error) {
        console.error("addTagsToGoal: 发生错误", error);
        return false;
      }
    },

    // 从目标移除标签（改进版本）
    removeTagsFromGoal: function (taskId, goalId, tagIds) {
      try {
        // 参数验证
        if (
          !taskId ||
          !goalId ||
          !Array.isArray(tagIds) ||
          tagIds.length === 0
        ) {
          console.warn("removeTagsFromGoal: 无效参数", {
            taskId,
            goalId,
            tagIds,
          });
          return false;
        }

        const task = this.getTaskById(taskId);
        if (!task) {
          console.warn("removeTagsFromGoal: 任务不存在", taskId);
          return false;
        }

        const goal = task.goals.find((g) => g.id === goalId);
        if (!goal || !goal.tags) {
          console.warn("removeTagsFromGoal: 目标不存在或没有标签", goalId);
          return false;
        }

        const originalLength = goal.tags.length;
        const removedTags = [];

        // 移除标签并记录被移除的标签
        goal.tags = goal.tags.filter((tagId) => {
          const shouldRemove = tagIds.includes(tagId);
          if (shouldRemove) {
            removedTags.push(tagId);
          }
          return !shouldRemove;
        });

        if (removedTags.length > 0) {
          // 清理元数据
          if (goal.tag_metadata) {
            removedTags.forEach((tagId) => {
              delete goal.tag_metadata[tagId];
            });
          }

          this.saveToStorage();
          TaskPixel.EventBus.emit("goal:tags_updated", {
            taskId,
            goalId,
            tags: goal.tags,
            removedTags: removedTags,
          });
        }

        return true;
      } catch (error) {
        console.error("removeTagsFromGoal: 发生错误", error);
        return false;
      }
    },

    // 获取目标的标签对象（改进版本）
    getGoalTags: function (taskId, goalId) {
      try {
        if (!taskId || !goalId) {
          console.warn("getGoalTags: 缺少必要参数", { taskId, goalId });
          return [];
        }

        const task = this.getTaskById(taskId);
        if (!task) {
          console.warn("getGoalTags: 任务不存在", taskId);
          return [];
        }

        const goal = task.goals.find((g) => g.id === goalId);
        if (!goal || !goal.tags) {
          return [];
        }

        const tags = [];
        const orphanedTagIds = [];

        // 获取标签对象，同时检测孤立的标签引用
        goal.tags.forEach((tagId) => {
          const tag =
            this.data.tags && this.data.tags.find((tag) => tag.id === tagId);
          if (tag) {
            tags.push(tag);
          } else {
            orphanedTagIds.push(tagId);
            console.warn("getGoalTags: 发现孤立的标签引用", tagId);
          }
        });

        // 自动清理孤立的标签引用
        if (orphanedTagIds.length > 0) {
          goal.tags = goal.tags.filter(
            (tagId) => !orphanedTagIds.includes(tagId)
          );
          if (goal.tag_metadata) {
            orphanedTagIds.forEach((tagId) => {
              delete goal.tag_metadata[tagId];
            });
          }
          this.saveToStorage();
          console.log("getGoalTags: 自动清理了孤立的标签引用", orphanedTagIds);
        }

        return tags;
      } catch (error) {
        console.error("getGoalTags: 发生错误", error);
        return [];
      }
    },

    // 为任务添加标签（改进版本）
    addTagsToTask: function (taskId, tagIds) {
      try {
        // 参数验证
        if (!taskId || !Array.isArray(tagIds) || tagIds.length === 0) {
          console.warn("addTagsToTask: 无效参数", { taskId, tagIds });
          return false;
        }

        const task = this.getTaskById(taskId);
        if (!task) {
          console.warn("addTagsToTask: 任务不存在", taskId);
          return false;
        }

        // 确保标签数组存在
        if (!task.tags) task.tags = [];

        // 验证标签是否存在
        const validTagIds = tagIds.filter((tagId) => {
          const tagExists =
            this.data.tags && this.data.tags.some((tag) => tag.id === tagId);
          if (!tagExists) {
            console.warn("addTagsToTask: 标签不存在", tagId);
          }
          return tagExists;
        });

        if (validTagIds.length === 0) {
          console.warn("addTagsToTask: 没有有效的标签ID");
          return false;
        }

        // 添加新标签，避免重复
        let addedCount = 0;
        validTagIds.forEach((tagId) => {
          if (!task.tags.includes(tagId)) {
            task.tags.push(tagId);
            addedCount++;
          }
        });

        if (addedCount > 0) {
          // 添加元数据
          if (!task.tag_metadata) task.tag_metadata = {};
          validTagIds.forEach((tagId) => {
            if (!task.tag_metadata[tagId]) {
              task.tag_metadata[tagId] = {
                added_at: new Date().toISOString(),
              };
            }
          });

          this.saveToStorage();
          TaskPixel.EventBus.emit("task:tags_updated", {
            taskId,
            tags: task.tags,
            addedTags: validTagIds,
          });
        }

        return true;
      } catch (error) {
        console.error("addTagsToTask: 发生错误", error);
        return false;
      }
    },

    // 从任务移除标签（改进版本）
    removeTagsFromTask: function (taskId, tagIds) {
      try {
        // 参数验证
        if (!taskId || !Array.isArray(tagIds) || tagIds.length === 0) {
          console.warn("removeTagsFromTask: 无效参数", { taskId, tagIds });
          return false;
        }

        const task = this.getTaskById(taskId);
        if (!task || !task.tags) {
          console.warn("removeTagsFromTask: 任务不存在或没有标签", taskId);
          return false;
        }

        const removedTags = [];

        // 移除标签并记录被移除的标签
        task.tags = task.tags.filter((tagId) => {
          const shouldRemove = tagIds.includes(tagId);
          if (shouldRemove) {
            removedTags.push(tagId);
          }
          return !shouldRemove;
        });

        if (removedTags.length > 0) {
          // 清理元数据
          if (task.tag_metadata) {
            removedTags.forEach((tagId) => {
              delete task.tag_metadata[tagId];
            });
          }

          this.saveToStorage();
          TaskPixel.EventBus.emit("task:tags_updated", {
            taskId,
            tags: task.tags,
            removedTags: removedTags,
          });
        }

        return true;
      } catch (error) {
        console.error("removeTagsFromTask: 发生错误", error);
        return false;
      }
    },

    // 获取任务的标签对象（改进版本）
    getTaskTags: function (taskId) {
      try {
        if (!taskId) {
          console.warn("getTaskTags: 缺少任务ID");
          return [];
        }

        const task = this.getTaskById(taskId);
        if (!task || !task.tags) {
          return [];
        }

        const tags = [];
        const orphanedTagIds = [];

        // 获取标签对象，同时检测孤立的标签引用
        task.tags.forEach((tagId) => {
          const tag =
            this.data.tags && this.data.tags.find((tag) => tag.id === tagId);
          if (tag) {
            tags.push(tag);
          } else {
            orphanedTagIds.push(tagId);
            console.warn("getTaskTags: 发现孤立的标签引用", tagId);
          }
        });

        // 自动清理孤立的标签引用
        if (orphanedTagIds.length > 0) {
          task.tags = task.tags.filter(
            (tagId) => !orphanedTagIds.includes(tagId)
          );
          if (task.tag_metadata) {
            orphanedTagIds.forEach((tagId) => {
              delete task.tag_metadata[tagId];
            });
          }
          this.saveToStorage();
          console.log("getTaskTags: 自动清理了孤立的标签引用", orphanedTagIds);
        }

        return tags;
      } catch (error) {
        console.error("getTaskTags: 发生错误", error);
        return [];
      }
    },

    // 生成唯一ID
    generateId: function () {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // 导出数据为JSON文件
    exportData: function () {
      try {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataUri =
          "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

        const exportFileName =
          "taskpixel_data_" + new Date().toISOString().slice(0, 10) + ".json";

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileName);
        linkElement.click();

        console.log("数据导出成功");
        return true;
      } catch (error) {
        console.error("导出数据出错:", error);
        return false;
      }
    },

    // 数据迁移和版本管理
    DATA_VERSION: "2.0.0",

    // 检测数据版本
    detectDataVersion: function () {
      return this.data.version || "1.0.0";
    },

    // 迁移数据到最新版本
    migrateData: function () {
      try {
        const currentVersion = this.detectDataVersion();

        if (currentVersion === this.DATA_VERSION) {
          return { success: true, message: "数据已是最新版本" };
        }

        console.log(`开始数据迁移: ${currentVersion} -> ${this.DATA_VERSION}`);

        // 备份当前数据
        const backup = JSON.stringify(this.data);
        localStorage.setItem(
          this.STORAGE_KEY + "_backup_" + Date.now(),
          backup
        );

        // 执行迁移
        if (currentVersion === "1.0.0") {
          this._migrateFromV1();
        }

        // 更新版本号
        this.data.version = this.DATA_VERSION;
        this.saveToStorage();

        console.log("数据迁移完成");
        return {
          success: true,
          message: `数据已迁移到版本 ${this.DATA_VERSION}`,
        };
      } catch (error) {
        console.error("数据迁移失败:", error);
        return { success: false, error: error.message };
      }
    },

    // 从V1.0迁移
    _migrateFromV1: function () {
      // 确保标签数组存在
      if (!this.data.tags) {
        this.data.tags = [];
      }

      // 为现有标签添加缺失字段
      this.data.tags.forEach((tag) => {
        if (!tag.updated_at) {
          tag.updated_at = tag.created_at || new Date().toISOString();
        }
        if (!tag.display_text) {
          tag.display_text = "#" + tag.name;
        }
        if (typeof tag.usage_count !== "number") {
          tag.usage_count = 0;
        }
      });

      // 为任务和目标添加标签元数据
      this.data.tasks.forEach((task) => {
        if (task.tags && task.tags.length > 0 && !task.tag_metadata) {
          task.tag_metadata = {};
          task.tags.forEach((tagId) => {
            task.tag_metadata[tagId] = {
              added_at: task.created_at || new Date().toISOString(),
            };
          });
        }

        if (task.goals) {
          task.goals.forEach((goal) => {
            if (goal.tags && goal.tags.length > 0 && !goal.tag_metadata) {
              goal.tag_metadata = {};
              goal.tags.forEach((tagId) => {
                goal.tag_metadata[tagId] = {
                  added_at:
                    goal.created_at ||
                    task.created_at ||
                    new Date().toISOString(),
                };
              });
            }
          });
        }
      });

      console.log("V1.0 -> V2.0 迁移完成");
    },

    // 验证数据完整性
    validateDataIntegrity: function () {
      const issues = [];
      const fixes = [];

      try {
        // 检查基本结构
        if (!this.data.tasks) {
          this.data.tasks = [];
          fixes.push("修复缺失的tasks数组");
        }
        if (!this.data.tags) {
          this.data.tags = [];
          fixes.push("修复缺失的tags数组");
        }
        if (!this.data.settings) {
          this.data.settings = {};
          fixes.push("修复缺失的settings对象");
        }

        // 检查标签完整性
        this.data.tags.forEach((tag, index) => {
          if (!tag.id) {
            issues.push(`标签[${index}]缺少ID`);
          }
          if (!tag.name) {
            issues.push(`标签[${index}]缺少名称`);
          }
          if (!tag.display_text) {
            tag.display_text = "#" + (tag.name || "未知");
            fixes.push(`修复标签[${index}]的显示文本`);
          }
        });

        // 检查任务和目标的标签引用
        this.data.tasks.forEach((task, taskIndex) => {
          if (task.tags) {
            task.tags.forEach((tagId) => {
              const tagExists = this.data.tags.some((tag) => tag.id === tagId);
              if (!tagExists) {
                issues.push(`任务[${taskIndex}]引用了不存在的标签: ${tagId}`);
              }
            });
          }

          if (task.goals) {
            task.goals.forEach((goal, goalIndex) => {
              if (goal.tags) {
                goal.tags.forEach((tagId) => {
                  const tagExists = this.data.tags.some(
                    (tag) => tag.id === tagId
                  );
                  if (!tagExists) {
                    issues.push(
                      `任务[${taskIndex}]目标[${goalIndex}]引用了不存在的标签: ${tagId}`
                    );
                  }
                });
              }
            });
          }
        });

        // 如果有修复，保存数据
        if (fixes.length > 0) {
          this.saveToStorage();
        }

        return {
          isValid: issues.length === 0,
          issues: issues,
          fixes: fixes,
        };
      } catch (error) {
        console.error("验证数据完整性时发生错误:", error);
        return {
          isValid: false,
          issues: [`验证过程出错: ${error.message}`],
          fixes: [],
        };
      }
    },

    // 清理孤立的标签引用
    cleanupOrphanedTagReferences: function () {
      let cleanedCount = 0;

      try {
        this.data.tasks.forEach((task) => {
          if (task.tags) {
            const originalLength = task.tags.length;
            task.tags = task.tags.filter((tagId) =>
              this.data.tags.some((tag) => tag.id === tagId)
            );
            cleanedCount += originalLength - task.tags.length;

            // 清理元数据
            if (task.tag_metadata) {
              Object.keys(task.tag_metadata).forEach((tagId) => {
                if (!task.tags.includes(tagId)) {
                  delete task.tag_metadata[tagId];
                }
              });
            }
          }

          if (task.goals) {
            task.goals.forEach((goal) => {
              if (goal.tags) {
                const originalLength = goal.tags.length;
                goal.tags = goal.tags.filter((tagId) =>
                  this.data.tags.some((tag) => tag.id === tagId)
                );
                cleanedCount += originalLength - goal.tags.length;

                // 清理元数据
                if (goal.tag_metadata) {
                  Object.keys(goal.tag_metadata).forEach((tagId) => {
                    if (!goal.tags.includes(tagId)) {
                      delete goal.tag_metadata[tagId];
                    }
                  });
                }
              }
            });
          }
        });

        if (cleanedCount > 0) {
          this.saveToStorage();
          console.log(`清理了 ${cleanedCount} 个孤立的标签引用`);
        }

        return { success: true, cleanedCount: cleanedCount };
      } catch (error) {
        console.error("清理孤立标签引用时发生错误:", error);
        return { success: false, error: error.message };
      }
    },

    // 导入数据
    importData: function (jsonData) {
      try {
        const parsedData = JSON.parse(jsonData);

        // 验证数据结构
        if (!parsedData.tasks || !Array.isArray(parsedData.tasks)) {
          throw new Error("无效的数据格式");
        }

        this.data = parsedData;
        this.saveToStorage();

        TaskPixel.EventBus.emit("data:imported", this.data);
        console.log("数据导入成功");
        return true;
      } catch (error) {
        console.error("导入数据出错:", error);
        return false;
      }
    },
  },

  /**
   * 事件总线模块 - 发布-订阅模式实现组件间通信
   * 扩展版本，支持标签相关事件和高级功能
   */
  EventBus: {
    events: {},
    eventHistory: [],
    maxHistorySize: 100,
    debugMode: false,

    // 标签相关事件类型定义
    TagEvents: {
      CREATED: "tag:created",
      UPDATED: "tag:updated",
      DELETED: "tag:deleted",
      USAGE_UPDATED: "tag:usage_updated",
      TASK_TAGS_UPDATED: "task:tags_updated",
      GOAL_TAGS_UPDATED: "goal:tags_updated",
      TAGS_SYNCED: "tags:synced",
      TAG_VALIDATION_FAILED: "tag:validation_failed",
    },

    init: function () {
      this.events = {};
      this.eventHistory = [];

      // 设置标签相关事件的自动同步
      this._setupTagEventHandlers();

      console.log("事件总线初始化完成");
    },

    // 订阅事件
    on: function (eventName, callback, options = {}) {
      try {
        if (!eventName || typeof callback !== "function") {
          console.warn("EventBus.on: 无效参数", { eventName, callback });
          return false;
        }

        if (!this.events[eventName]) {
          this.events[eventName] = [];
        }

        // 包装回调函数以支持选项
        const wrappedCallback = {
          fn: callback,
          once: options.once || false,
          priority: options.priority || 0,
          context: options.context || null,
        };

        this.events[eventName].push(wrappedCallback);

        // 按优先级排序
        this.events[eventName].sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
          console.log(`EventBus: 订阅事件 ${eventName}`, options);
        }

        return true;
      } catch (error) {
        console.error("EventBus.on: 订阅事件失败", error);
        return false;
      }
    },

    // 一次性订阅事件
    once: function (eventName, callback, options = {}) {
      return this.on(eventName, callback, { ...options, once: true });
    },

    // 取消订阅
    off: function (eventName, callback) {
      try {
        if (!this.events[eventName]) return false;

        if (callback) {
          // 移除特定回调
          this.events[eventName] = this.events[eventName].filter(
            (wrapper) => wrapper.fn !== callback
          );
        } else {
          // 移除所有回调
          delete this.events[eventName];
        }

        if (this.debugMode) {
          console.log(`EventBus: 取消订阅事件 ${eventName}`);
        }

        return true;
      } catch (error) {
        console.error("EventBus.off: 取消订阅失败", error);
        return false;
      }
    },

    // 触发事件
    emit: function (eventName, data, options = {}) {
      try {
        if (!this.events[eventName]) {
          if (this.debugMode) {
            console.log(`EventBus: 没有监听器的事件 ${eventName}`);
          }
          return false;
        }

        const eventData = {
          name: eventName,
          data: data,
          timestamp: new Date().toISOString(),
          source: options.source || "unknown",
        };

        // 记录事件历史
        this._recordEvent(eventData);

        // 执行回调
        const callbacks = [...this.events[eventName]]; // 复制数组避免修改问题
        let executedCount = 0;

        callbacks.forEach((wrapper) => {
          try {
            // 异步执行回调
            setTimeout(() => {
              if (wrapper.context) {
                wrapper.fn.call(wrapper.context, data, eventData);
              } else {
                wrapper.fn(data, eventData);
              }
            }, 0);

            executedCount++;

            // 如果是一次性监听器，移除它
            if (wrapper.once) {
              this.events[eventName] = this.events[eventName].filter(
                (w) => w !== wrapper
              );
            }
          } catch (callbackError) {
            console.error(`EventBus: 回调执行失败 ${eventName}`, callbackError);
          }
        });

        if (this.debugMode) {
          console.log(`EventBus: 触发事件 ${eventName}`, {
            data,
            listenersCount: executedCount,
          });
        }

        return true;
      } catch (error) {
        console.error("EventBus.emit: 触发事件失败", error);
        return false;
      }
    },

    // 等待事件触发
    waitFor: function (eventName, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.off(eventName, handler);
          reject(new Error(`等待事件 ${eventName} 超时`));
        }, timeout);

        const handler = (data) => {
          clearTimeout(timeoutId);
          resolve(data);
        };

        this.once(eventName, handler);
      });
    },

    // 批量触发事件
    emitBatch: function (events) {
      try {
        if (!Array.isArray(events)) {
          console.warn("EventBus.emitBatch: events必须是数组");
          return false;
        }

        events.forEach(({ name, data, options }) => {
          this.emit(name, data, options);
        });

        return true;
      } catch (error) {
        console.error("EventBus.emitBatch: 批量触发失败", error);
        return false;
      }
    },

    // 获取事件统计
    getEventStats: function () {
      try {
        const stats = {
          totalEvents: Object.keys(this.events).length,
          totalListeners: 0,
          eventHistory: this.eventHistory.length,
          events: {},
        };

        Object.keys(this.events).forEach((eventName) => {
          const listeners = this.events[eventName].length;
          stats.totalListeners += listeners;
          stats.events[eventName] = listeners;
        });

        return stats;
      } catch (error) {
        console.error("EventBus.getEventStats: 获取统计失败", error);
        return {
          totalEvents: 0,
          totalListeners: 0,
          eventHistory: 0,
          events: {},
        };
      }
    },

    // 清理事件历史
    clearHistory: function () {
      this.eventHistory = [];
      console.log("EventBus: 事件历史已清理");
    },

    // 启用/禁用调试模式
    setDebugMode: function (enabled) {
      this.debugMode = enabled;
      console.log(`EventBus: 调试模式 ${enabled ? "启用" : "禁用"}`);
    },

    // 私有方法：记录事件历史
    _recordEvent: function (eventData) {
      this.eventHistory.push(eventData);

      // 限制历史记录大小
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
      }
    },

    // 私有方法：设置标签事件处理器
    _setupTagEventHandlers: function () {
      // 标签创建事件处理
      this.on(this.TagEvents.CREATED, (tagData) => {
        if (this.debugMode) {
          console.log("标签创建事件:", tagData);
        }
        // 触发同步事件
        this.emit(this.TagEvents.TAGS_SYNCED, {
          action: "created",
          tag: tagData,
        });
      });

      // 标签更新事件处理
      this.on(this.TagEvents.UPDATED, (tagData) => {
        if (this.debugMode) {
          console.log("标签更新事件:", tagData);
        }
        // 触发同步事件
        this.emit(this.TagEvents.TAGS_SYNCED, {
          action: "updated",
          tag: tagData,
        });
      });

      // 标签删除事件处理
      this.on(this.TagEvents.DELETED, (tagData) => {
        if (this.debugMode) {
          console.log("标签删除事件:", tagData);
        }
        // 触发同步事件
        this.emit(this.TagEvents.TAGS_SYNCED, {
          action: "deleted",
          tag: tagData,
        });
      });

      // 任务标签更新事件处理
      this.on(this.TagEvents.TASK_TAGS_UPDATED, (data) => {
        if (this.debugMode) {
          console.log("任务标签更新事件:", data);
        }
        // 更新标签使用统计
        if (data.addedTags && data.addedTags.length > 0) {
          this.emit(this.TagEvents.USAGE_UPDATED, {
            tagIds: data.addedTags,
            action: "increment",
          });
        }
      });

      // 目标标签更新事件处理
      this.on(this.TagEvents.GOAL_TAGS_UPDATED, (data) => {
        if (this.debugMode) {
          console.log("目标标签更新事件:", data);
        }
        // 更新标签使用统计
        if (data.addedTags && data.addedTags.length > 0) {
          this.emit(this.TagEvents.USAGE_UPDATED, {
            tagIds: data.addedTags,
            action: "increment",
          });
        }
      });

      // 跨页面数据同步
      this.on(this.TagEvents.TAGS_SYNCED, (data) => {
        // 通知所有组件更新
        this._notifyComponentsUpdate(data);
      });
    },

    // 私有方法：通知组件更新
    _notifyComponentsUpdate: function (data) {
      try {
        // 通知TagManager刷新缓存
        if (window.TaskPixel && window.TaskPixel.TagManager) {
          TaskPixel.TagManager.invalidateCache();
        }

        // 通知TagDisplay组件刷新
        if (window.TaskPixel && window.TaskPixel.TagDisplay) {
          // 可以添加刷新逻辑
        }

        // 通知TagInput组件刷新建议
        if (window.TaskPixel && window.TaskPixel.TagInput) {
          // 可以添加刷新逻辑
        }

        if (this.debugMode) {
          console.log("组件更新通知已发送:", data);
        }
      } catch (error) {
        console.error("通知组件更新失败:", error);
      }
    },
  },

  /**
   * 导航模块 - 处理页面跳转和URL管理
   */
  Navigation: {
    currentPage: "",

    init: function () {
      // 根据URL设置当前页面
      this.handleLocationChange();

      // 监听URL变化
      window.addEventListener("popstate", this.handleLocationChange.bind(this));

      console.log("导航模块初始化完成");
    },

    // 处理URL变化
    handleLocationChange: function () {
      const path = window.location.pathname;
      const pageName = this.getPageNameFromPath(path);

      this.currentPage = pageName;
      TaskPixel.EventBus.emit("navigation:changed", pageName);
    },

    // 从路径中提取页面名称
    getPageNameFromPath: function (path) {
      // 移除开头的斜杠和结尾的.html
      let pageName = path.replace(/^\//, "").replace(/\.html$/, "");

      // 如果是空字符串或index，则为主页
      if (pageName === "" || pageName === "index") {
        return "home";
      }

      return pageName;
    },

    // 跳转到指定页面
    navigateTo: function (pageName, params = {}) {
      let url = "";

      // 构建URL
      switch (pageName) {
        case "home":
          url = "index.html";
          break;
        case "goals":
          url = "goals.html";
          break;
        case "task_detail":
          url = `task_detail.html?id=${params.taskId || ""}`;
          break;
        case "ai_evaluation":
          url = `ai_evaluation.html?taskId=${params.taskId || ""}&goalId=${
            params.goalId || ""
          }`;
          break;
        case "settings":
          url = "settings.html";
          break;
        default:
          url = `${pageName}.html`;
      }

      // 执行跳转
      window.location.href = url;
    },

    // 获取URL参数
    getUrlParams: function () {
      const params = {};
      const queryString = window.location.search.substring(1);

      if (queryString) {
        const pairs = queryString.split("&");
        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i].split("=");
          params[decodeURIComponent(pair[0])] = decodeURIComponent(
            pair[1] || ""
          );
        }
      }

      return params;
    },
  },

  /**
   * 工具函数
   */
  Utils: {
    // 格式化日期: 2023-04-15 -> 2023年4月15日
    formatDate: function (dateString) {
      if (!dateString) return "";

      try {
        const date = new Date(dateString);
        return `${date.getFullYear()}年${
          date.getMonth() + 1
        }月${date.getDate()}日`;
      } catch (error) {
        console.error("日期格式化错误:", error);
        return dateString;
      }
    },

    // 生成随机颜色
    randomColor: function () {
      const colors = [
        "#4F46E5", // primary
        "#22C55E", // green
        "#F59E0B", // yellow
        "#EF4444", // red
        "#3B82F6", // blue
      ];

      return colors[Math.floor(Math.random() * colors.length)];
    },

    // 防抖函数
    debounce: function (func, wait) {
      let timeout;

      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // 解析日期输入，支持多种格式
    parseDate: function (input) {
      // 如果已经是Date对象
      if (input instanceof Date) return input;

      // 如果是ISO字符串
      if (typeof input === "string") {
        // 尝试解析 YYYY-MM-DD 格式
        const dateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const match = input.match(dateRegex);

        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // 月份从0开始
          const day = parseInt(match[3]);

          return new Date(year, month, day);
        }

        // 尝试其他格式...
        const date = new Date(input);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // 默认返回当前日期
      return new Date();
    },
  },
};
