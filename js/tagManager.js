/**
 * TaskPixel 标签管理模块 - 重构版本
 * 提供统一的标签管理API，包含缓存、验证和错误处理
 */

TaskPixel.TagManager = {
  // 预定义深色调调色板
  defaultColors: [
    "#374151", // 深灰色
    "#6B7280", // 中等灰色
    "#4B5563", // 深灰蓝色
    "#1F2937", // 深色
    "#065F46", // 深绿色
    "#7C2D12", // 深红棕色
    "#581C87", // 深紫色
    "#92400E", // 深橙色
  ],

  // 缓存管理
  _cache: {
    tags: null,
    lastUpdate: null,
    isValid: false,
    searchCache: new Map(),
    usageCache: null,
  },

  // 错误类型定义
  ErrorTypes: {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    DUPLICATE_TAG: "DUPLICATE_TAG",
    TAG_NOT_FOUND: "TAG_NOT_FOUND",
    TAG_IN_USE: "TAG_IN_USE",
    STORAGE_ERROR: "STORAGE_ERROR",
  },

  // 初始化标签管理器
  init: function () {
    try {
      // 确保标签数组存在
      if (!TaskPixel.DataStore.data.tags) {
        TaskPixel.DataStore.data.tags = [];
      }

      // 初始化缓存
      this.refreshCache();

      // 监听数据变化事件
      TaskPixel.EventBus.on("data:loaded", () => this.invalidateCache());
      TaskPixel.EventBus.on("data:imported", () => this.invalidateCache());

      console.log("标签管理器初始化完成");
      return { success: true };
    } catch (error) {
      console.error("标签管理器初始化失败:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  // 缓存管理方法
  invalidateCache: function () {
    this._cache.isValid = false;
    this._cache.tags = null;
    this._cache.searchCache.clear();
    this._cache.usageCache = null;
  },

  refreshCache: function () {
    try {
      this._cache.tags = [...(TaskPixel.DataStore.data.tags || [])];
      this._cache.lastUpdate = Date.now();
      this._cache.isValid = true;
      this._cache.searchCache.clear();
      this._cache.usageCache = null;
    } catch (error) {
      console.error("刷新缓存失败:", error);
      this._cache.isValid = false;
    }
  },

  _getCachedTags: function () {
    if (!this._cache.isValid || !this._cache.tags) {
      this.refreshCache();
    }
    return this._cache.tags || [];
  },

  // 获取所有标签
  getAllTags: function () {
    try {
      // 确保 DataStore 有最新数据
      if (!TaskPixel.DataStore.data.tags) {
        TaskPixel.DataStore.loadFromStorage();
      }

      return this._getCachedTags();
    } catch (error) {
      console.error("获取标签失败:", error);
      // 直接从 localStorage 读取作为备用方案
      try {
        const data = JSON.parse(localStorage.getItem("taskpixel_data") || "{}");
        return data.tags || [];
      } catch (fallbackError) {
        console.error("备用方案也失败:", fallbackError);
        return [];
      }
    }
  },

  // 按ID获取标签
  getTagById: function (tagId) {
    if (!tagId) return null;

    try {
      const tags = this._getCachedTags();
      return tags.find((tag) => tag.id === tagId) || null;
    } catch (error) {
      console.error("获取标签失败:", error);
      return null;
    }
  },

  // 数据验证方法（使用TagValidator服务）
  _validateTagData: function (tagData) {
    if (TaskPixel.TagValidator) {
      return TaskPixel.TagValidator.validateTagData(tagData);
    }

    // 备用验证逻辑
    const errors = [];

    if (!tagData || typeof tagData !== "object") {
      errors.push("标签数据必须是对象");
      return { isValid: false, errors };
    }

    if (!tagData.name || typeof tagData.name !== "string") {
      errors.push("标签名称是必需的");
    } else {
      const cleanName = tagData.name.replace(/^#/, "").trim();
      if (cleanName.length === 0) {
        errors.push("标签名称不能为空");
      } else if (cleanName.length > 50) {
        errors.push("标签名称不能超过50个字符");
      } else if (!/^[\w\u4e00-\u9fa5\s-]+$/.test(cleanName)) {
        errors.push("标签名称包含无效字符");
      }
    }

    if (tagData.color && !/^#[0-9A-Fa-f]{6}$/.test(tagData.color)) {
      errors.push("标签颜色格式无效");
    }

    if (tagData.description && tagData.description.length > 200) {
      errors.push("标签描述不能超过200个字符");
    }

    return { isValid: errors.length === 0, errors };
  },

  _sanitizeTagName: function (name) {
    if (TaskPixel.TagValidator) {
      return TaskPixel.TagValidator.sanitizeTagName(name);
    }
    return name.replace(/^#/, "").trim().replace(/\s+/g, " ");
  },

  _createError: function (type, message, details = null) {
    return {
      code: type,
      message: message,
      details: details,
      timestamp: new Date().toISOString(),
    };
  },

  // 创建新标签
  createTag: function (tagData) {
    try {
      // 验证输入数据
      const validation = this._validateTagData(tagData);
      if (!validation.isValid) {
        return {
          success: false,
          error: this._createError(
            this.ErrorTypes.VALIDATION_ERROR,
            validation.errors.join("; ")
          ),
        };
      }

      const tagId = TaskPixel.DataStore.generateId();
      const tagName = this._sanitizeTagName(tagData.name);

      // 检查标签是否已存在（不区分大小写）
      const existingTag = this.getAllTags().find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
      );

      if (existingTag) {
        return {
          success: false,
          error: this._createError(this.ErrorTypes.DUPLICATE_TAG, "标签已存在"),
          tagId: existingTag.id,
          existingTag: existingTag,
        };
      }

      const newTag = {
        id: tagId,
        name: tagName,
        display_text: "#" + tagName,
        color: tagData.color || this.getRandomColor(),
        description: tagData.description || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
      };

      // 确保数据结构存在
      if (!TaskPixel.DataStore.data.tags) {
        TaskPixel.DataStore.data.tags = [];
      }

      TaskPixel.DataStore.data.tags.push(newTag);

      // 保存到存储
      const saveResult = TaskPixel.DataStore.saveToStorage();
      if (!saveResult) {
        return {
          success: false,
          error: this._createError(
            this.ErrorTypes.STORAGE_ERROR,
            "保存标签失败"
          ),
        };
      }

      // 更新缓存
      this.invalidateCache();

      // 触发事件
      TaskPixel.EventBus.emit("tag:created", newTag);

      return { success: true, tagId: tagId, tag: newTag };
    } catch (error) {
      console.error("创建标签时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  // 更新标签
  updateTag: function (tagId, updatedData) {
    try {
      if (!tagId) {
        return {
          success: false,
          error: this._createError(
            this.ErrorTypes.VALIDATION_ERROR,
            "标签ID是必需的"
          ),
        };
      }

      // 验证更新数据
      if (updatedData.name !== undefined) {
        const validation = this._validateTagData({ name: updatedData.name });
        if (!validation.isValid) {
          return {
            success: false,
            error: this._createError(
              this.ErrorTypes.VALIDATION_ERROR,
              validation.errors.join("; ")
            ),
          };
        }
      }

      const tagIndex = TaskPixel.DataStore.data.tags.findIndex(
        (tag) => tag.id === tagId
      );

      if (tagIndex === -1) {
        return {
          success: false,
          error: this._createError(this.ErrorTypes.TAG_NOT_FOUND, "标签不存在"),
        };
      }

      const currentTag = TaskPixel.DataStore.data.tags[tagIndex];
      const updates = { ...updatedData };

      // 如果更新名称，需要处理相关字段
      if (updates.name) {
        const sanitizedName = this._sanitizeTagName(updates.name);

        // 检查新名称是否与其他标签重复
        const duplicateTag = this.getAllTags().find(
          (tag) =>
            tag.id !== tagId &&
            tag.name.toLowerCase() === sanitizedName.toLowerCase()
        );

        if (duplicateTag) {
          return {
            success: false,
            error: this._createError(
              this.ErrorTypes.DUPLICATE_TAG,
              "标签名称已存在"
            ),
            existingTag: duplicateTag,
          };
        }

        updates.name = sanitizedName;
        updates.display_text = "#" + sanitizedName;
      }

      // 添加更新时间
      updates.updated_at = new Date().toISOString();

      // 应用更新
      const updatedTag = {
        ...currentTag,
        ...updates,
      };

      TaskPixel.DataStore.data.tags[tagIndex] = updatedTag;

      // 保存到存储
      const saveResult = TaskPixel.DataStore.saveToStorage();
      if (!saveResult) {
        return {
          success: false,
          error: this._createError(
            this.ErrorTypes.STORAGE_ERROR,
            "保存标签更新失败"
          ),
        };
      }

      // 更新缓存
      this.invalidateCache();

      // 触发事件
      TaskPixel.EventBus.emit("tag:updated", updatedTag);

      return { success: true, tag: updatedTag };
    } catch (error) {
      console.error("更新标签时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  // 删除标签
  deleteTag: function (tagId, options = {}) {
    try {
      if (!tagId) {
        return {
          success: false,
          error: this._createError(
            this.ErrorTypes.VALIDATION_ERROR,
            "标签ID是必需的"
          ),
        };
      }

      const tagIndex = TaskPixel.DataStore.data.tags.findIndex(
        (tag) => tag.id === tagId
      );

      if (tagIndex === -1) {
        return {
          success: false,
          error: this._createError(this.ErrorTypes.TAG_NOT_FOUND, "标签不存在"),
        };
      }

      const tagToDelete = TaskPixel.DataStore.data.tags[tagIndex];

      // 检查标签是否被使用（除非强制删除）
      if (!options.force) {
        const usageInfo = this.getTagUsageInfo(tagId);
        if (usageInfo.isUsed) {
          return {
            success: false,
            error: this._createError(
              this.ErrorTypes.TAG_IN_USE,
              "标签正在使用中"
            ),
            usageInfo: usageInfo,
          };
        }
      }

      // 如果强制删除，先清理所有引用
      if (options.force) {
        this._removeTagFromAllReferences(tagId);
      }

      // 删除标签
      TaskPixel.DataStore.data.tags.splice(tagIndex, 1);

      // 保存到存储
      const saveResult = TaskPixel.DataStore.saveToStorage();
      if (!saveResult) {
        return {
          success: false,
          error: this._createError(
            this.ErrorTypes.STORAGE_ERROR,
            "保存删除操作失败"
          ),
        };
      }

      // 更新缓存
      this.invalidateCache();

      // 触发事件
      TaskPixel.EventBus.emit("tag:deleted", tagToDelete);

      return { success: true, deletedTag: tagToDelete };
    } catch (error) {
      console.error("删除标签时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  // 检查标签是否被使用
  isTagInUse: function (tagId) {
    if (!tagId) return false;

    try {
      const usageInfo = this.getTagUsageInfo(tagId);
      return usageInfo.isUsed;
    } catch (error) {
      console.error("检查标签使用状态时发生错误:", error);
      return false;
    }
  },

  // 获取标签使用详情
  getTagUsageInfo: function (tagId) {
    const usageInfo = {
      isUsed: false,
      taskCount: 0,
      goalCount: 0,
      tasks: [],
      goals: [],
    };

    if (!tagId) return usageInfo;

    try {
      const tasks = TaskPixel.DataStore.getAllTasks();

      for (const task of tasks) {
        // 检查任务是否使用了该标签
        if (task.tags && task.tags.includes(tagId)) {
          usageInfo.isUsed = true;
          usageInfo.taskCount++;
          usageInfo.tasks.push({
            id: task.id,
            title: task.title,
          });
        }

        // 检查任务的目标是否使用了该标签
        if (task.goals) {
          for (const goal of task.goals) {
            if (goal.tags && goal.tags.includes(tagId)) {
              usageInfo.isUsed = true;
              usageInfo.goalCount++;
              usageInfo.goals.push({
                id: goal.id,
                title: goal.title,
                taskId: task.id,
                taskTitle: task.title,
              });
            }
          }
        }
      }

      return usageInfo;
    } catch (error) {
      console.error("获取标签使用信息时发生错误:", error);
      return usageInfo;
    }
  },

  // 从所有引用中移除标签
  _removeTagFromAllReferences: function (tagId) {
    try {
      const tasks = TaskPixel.DataStore.getAllTasks();
      let modified = false;

      for (const task of tasks) {
        // 从任务中移除标签
        if (task.tags && task.tags.includes(tagId)) {
          task.tags = task.tags.filter((id) => id !== tagId);
          modified = true;
        }

        // 从目标中移除标签
        if (task.goals) {
          for (const goal of task.goals) {
            if (goal.tags && goal.tags.includes(tagId)) {
              goal.tags = goal.tags.filter((id) => id !== tagId);
              modified = true;
            }
          }
        }
      }

      if (modified) {
        TaskPixel.DataStore.saveToStorage();
      }

      return modified;
    } catch (error) {
      console.error("清理标签引用时发生错误:", error);
      return false;
    }
  },

  // 获取随机颜色
  getRandomColor: function () {
    return this.defaultColors[
      Math.floor(Math.random() * this.defaultColors.length)
    ];
  },

  // 更新标签使用次数
  updateTagUsage: function (tagIds) {
    if (!Array.isArray(tagIds) || tagIds.length === 0) return;

    try {
      let modified = false;

      tagIds.forEach((tagId) => {
        const tag = TaskPixel.DataStore.data.tags.find((t) => t.id === tagId);
        if (tag) {
          tag.usage_count = (tag.usage_count || 0) + 1;
          tag.updated_at = new Date().toISOString();
          modified = true;
        }
      });

      if (modified) {
        TaskPixel.DataStore.saveToStorage();
        this.invalidateCache();
      }
    } catch (error) {
      console.error("更新标签使用次数时发生错误:", error);
    }
  },

  // 重新计算所有标签的使用次数
  recalculateUsageCounts: function () {
    try {
      const tasks = TaskPixel.DataStore.getAllTasks();
      const usageCounts = new Map();

      // 统计使用次数
      for (const task of tasks) {
        // 统计任务标签
        if (task.tags) {
          task.tags.forEach((tagId) => {
            usageCounts.set(tagId, (usageCounts.get(tagId) || 0) + 1);
          });
        }

        // 统计目标标签
        if (task.goals) {
          for (const goal of task.goals) {
            if (goal.tags) {
              goal.tags.forEach((tagId) => {
                usageCounts.set(tagId, (usageCounts.get(tagId) || 0) + 1);
              });
            }
          }
        }
      }

      // 更新标签使用次数
      let modified = false;
      TaskPixel.DataStore.data.tags.forEach((tag) => {
        const newCount = usageCounts.get(tag.id) || 0;
        if (tag.usage_count !== newCount) {
          tag.usage_count = newCount;
          tag.updated_at = new Date().toISOString();
          modified = true;
        }
      });

      if (modified) {
        TaskPixel.DataStore.saveToStorage();
        this.invalidateCache();
      }

      return {
        success: true,
        updatedCount: modified ? TaskPixel.DataStore.data.tags.length : 0,
      };
    } catch (error) {
      console.error("重新计算标签使用次数时发生错误:", error);
      return { success: false, error: error.message };
    }
  },

  // 按使用频率排序标签
  getTagsByUsage: function () {
    try {
      if (this._cache.usageCache) {
        return [...this._cache.usageCache];
      }

      const sortedTags = this.getAllTags().sort(
        (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
      );

      this._cache.usageCache = [...sortedTags];
      return sortedTags;
    } catch (error) {
      console.error("按使用频率排序标签时发生错误:", error);
      return [];
    }
  },

  // 按名称排序标签
  getTagsByName: function () {
    try {
      return this.getAllTags().sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("按名称排序标签时发生错误:", error);
      return [];
    }
  },

  // 搜索标签（带缓存）
  searchTags: function (query) {
    if (!query || typeof query !== "string") return [];

    try {
      const searchKey = query.toLowerCase().trim();

      // 检查缓存
      if (this._cache.searchCache.has(searchKey)) {
        return [...this._cache.searchCache.get(searchKey)];
      }

      const searchTerm = searchKey.replace(/^#/, "");
      const results = this.getAllTags().filter(
        (tag) =>
          tag.name.toLowerCase().includes(searchTerm) ||
          (tag.description &&
            tag.description.toLowerCase().includes(searchTerm))
      );

      // 缓存搜索结果
      this._cache.searchCache.set(searchKey, [...results]);

      // 限制缓存大小
      if (this._cache.searchCache.size > 50) {
        const firstKey = this._cache.searchCache.keys().next().value;
        this._cache.searchCache.delete(firstKey);
      }

      return results;
    } catch (error) {
      console.error("搜索标签时发生错误:", error);
      return [];
    }
  },

  // 获取标签统计信息
  getTagStats: function () {
    try {
      const allTags = this.getAllTags();
      const usedTags = allTags.filter((tag) => tag.usage_count > 0);
      const unusedTags = allTags.filter((tag) => tag.usage_count === 0);

      return {
        total: allTags.length,
        used: usedTags.length,
        unused: unusedTags.length,
        averageUsage:
          allTags.length > 0
            ? allTags.reduce((sum, tag) => sum + (tag.usage_count || 0), 0) /
              allTags.length
            : 0,
      };
    } catch (error) {
      console.error("获取标签统计信息时发生错误:", error);
      return {
        total: 0,
        used: 0,
        unused: 0,
        averageUsage: 0,
      };
    }
  },

  // 任务和目标标签关联管理
  addTagToTask: function (taskId, tagId) {
    try {
      const result = TaskPixel.DataStore.addTagsToTask(taskId, [tagId]);
      if (result) {
        this.updateTagUsage([tagId]);
        return { success: true };
      }
      return {
        success: false,
        error: this._createError(
          this.ErrorTypes.STORAGE_ERROR,
          "添加标签到任务失败"
        ),
      };
    } catch (error) {
      console.error("添加标签到任务时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  removeTagFromTask: function (taskId, tagId) {
    try {
      const result = TaskPixel.DataStore.removeTagsFromTask(taskId, [tagId]);
      if (result) {
        // 重新计算使用次数
        this.recalculateUsageCounts();
        return { success: true };
      }
      return {
        success: false,
        error: this._createError(
          this.ErrorTypes.STORAGE_ERROR,
          "从任务移除标签失败"
        ),
      };
    } catch (error) {
      console.error("从任务移除标签时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  addTagToGoal: function (taskId, goalId, tagId) {
    try {
      const result = TaskPixel.DataStore.addTagsToGoal(taskId, goalId, [tagId]);
      if (result) {
        this.updateTagUsage([tagId]);
        return { success: true };
      }
      return {
        success: false,
        error: this._createError(
          this.ErrorTypes.STORAGE_ERROR,
          "添加标签到目标失败"
        ),
      };
    } catch (error) {
      console.error("添加标签到目标时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  removeTagFromGoal: function (taskId, goalId, tagId) {
    try {
      const result = TaskPixel.DataStore.removeTagsFromGoal(taskId, goalId, [
        tagId,
      ]);
      if (result) {
        // 重新计算使用次数
        this.recalculateUsageCounts();
        return { success: true };
      }
      return {
        success: false,
        error: this._createError(
          this.ErrorTypes.STORAGE_ERROR,
          "从目标移除标签失败"
        ),
      };
    } catch (error) {
      console.error("从目标移除标签时发生错误:", error);
      return {
        success: false,
        error: this._createError(this.ErrorTypes.STORAGE_ERROR, error.message),
      };
    }
  },

  // 数据清理和修复
  cleanupOrphanedTags: function () {
    try {
      const allTags = this.getAllTags();
      const orphanedTags = [];

      for (const tag of allTags) {
        const usageInfo = this.getTagUsageInfo(tag.id);
        if (!usageInfo.isUsed && tag.usage_count > 0) {
          // 修复使用次数
          tag.usage_count = 0;
          tag.updated_at = new Date().toISOString();
        }
      }

      // 重新计算所有使用次数
      this.recalculateUsageCounts();

      return {
        success: true,
        orphanedCount: orphanedTags.length,
        fixedCount: allTags.filter((tag) => tag.usage_count === 0).length,
      };
    } catch (error) {
      console.error("清理孤立标签时发生错误:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // 验证数据完整性
  validateDataIntegrity: function () {
    const report = {
      isValid: true,
      issues: [],
      fixedIssues: [],
    };

    try {
      const allTags = this.getAllTags();

      // 检查重复标签
      const nameMap = new Map();
      allTags.forEach((tag) => {
        const lowerName = tag.name.toLowerCase();
        if (nameMap.has(lowerName)) {
          report.isValid = false;
          report.issues.push(`重复标签名称: ${tag.name}`);
        } else {
          nameMap.set(lowerName, tag);
        }
      });

      // 检查无效数据
      allTags.forEach((tag) => {
        if (!tag.id || !tag.name) {
          report.isValid = false;
          report.issues.push(`标签数据不完整: ${JSON.stringify(tag)}`);
        }

        if (!tag.display_text) {
          tag.display_text = "#" + tag.name;
          report.fixedIssues.push(`修复标签显示文本: ${tag.name}`);
        }

        if (!tag.created_at) {
          tag.created_at = new Date().toISOString();
          report.fixedIssues.push(`添加创建时间: ${tag.name}`);
        }
      });

      // 如果有修复，保存数据
      if (report.fixedIssues.length > 0) {
        TaskPixel.DataStore.saveToStorage();
        this.invalidateCache();
      }

      return report;
    } catch (error) {
      console.error("验证数据完整性时发生错误:", error);
      report.isValid = false;
      report.issues.push(`验证过程出错: ${error.message}`);
      return report;
    }
  },
};
