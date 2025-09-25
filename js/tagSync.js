/**
 * TaskPixel 标签数据同步服务
 * 实现跨页面的数据一致性和实时同步
 */

TaskPixel.TagSync = {
  // 同步状态
  isEnabled: true,
  syncInterval: null,
  lastSyncTime: null,

  // 同步配置
  config: {
    autoSync: true,
    syncIntervalMs: 5000, // 5秒检查一次
    storageEventSync: true, // 监听storage事件
    crossTabSync: true, // 跨标签页同步
  },

  // 初始化同步服务
  init: function () {
    try {
      if (!this.isEnabled) return;

      // 设置事件监听器
      this._setupEventListeners();

      // 启动自动同步
      if (this.config.autoSync) {
        this._startAutoSync();
      }

      // 设置跨标签页同步
      if (this.config.crossTabSync) {
        this._setupCrossTabSync();
      }

      console.log("标签同步服务初始化完成");
      return { success: true };
    } catch (error) {
      console.error("标签同步服务初始化失败:", error);
      return { success: false, error: error.message };
    }
  },

  // 手动同步
  sync: function () {
    try {
      const syncData = this._collectSyncData();

      // 触发同步事件
      TaskPixel.EventBus.emit("tags:sync_started", syncData);

      // 执行同步逻辑
      const result = this._performSync(syncData);

      if (result.success) {
        this.lastSyncTime = new Date().toISOString();
        TaskPixel.EventBus.emit("tags:sync_completed", {
          timestamp: this.lastSyncTime,
          changes: result.changes,
        });
      } else {
        TaskPixel.EventBus.emit("tags:sync_failed", {
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      console.error("手动同步失败:", error);
      return { success: false, error: error.message };
    }
  },

  // 强制刷新所有组件
  forceRefresh: function () {
    try {
      // 清理所有缓存
      if (TaskPixel.TagManager) {
        TaskPixel.TagManager.invalidateCache();
      }

      // 触发全局刷新事件
      TaskPixel.EventBus.emit("tags:force_refresh", {
        timestamp: new Date().toISOString(),
        source: "manual",
      });

      // 重新加载数据
      TaskPixel.DataStore.loadFromStorage();

      console.log("强制刷新完成");
      return { success: true };
    } catch (error) {
      console.error("强制刷新失败:", error);
      return { success: false, error: error.message };
    }
  },

  // 启用/禁用同步
  setEnabled: function (enabled) {
    this.isEnabled = enabled;

    if (enabled) {
      this.init();
    } else {
      this._stopAutoSync();
    }

    console.log(`标签同步服务 ${enabled ? "启用" : "禁用"}`);
  },

  // 获取同步状态
  getSyncStatus: function () {
    return {
      isEnabled: this.isEnabled,
      lastSyncTime: this.lastSyncTime,
      autoSync: this.config.autoSync,
      crossTabSync: this.config.crossTabSync,
    };
  },

  // 私有方法：设置事件监听器
  _setupEventListeners: function () {
    // 监听标签相关事件
    const tagEvents = [
      TaskPixel.EventBus.TagEvents.CREATED,
      TaskPixel.EventBus.TagEvents.UPDATED,
      TaskPixel.EventBus.TagEvents.DELETED,
      TaskPixel.EventBus.TagEvents.TASK_TAGS_UPDATED,
      TaskPixel.EventBus.TagEvents.GOAL_TAGS_UPDATED,
    ];

    tagEvents.forEach((eventName) => {
      TaskPixel.EventBus.on(
        eventName,
        (data) => {
          this._handleTagEvent(eventName, data);
        },
        { context: this }
      );
    });

    // 监听数据加载事件
    TaskPixel.EventBus.on("data:loaded", () => {
      this._handleDataLoaded();
    });

    // 监听数据导入事件
    TaskPixel.EventBus.on("data:imported", () => {
      this._handleDataImported();
    });
  },

  // 私有方法：处理标签事件
  _handleTagEvent: function (eventName, data) {
    try {
      // 记录事件
      if (TaskPixel.EventBus.debugMode) {
        console.log(`TagSync: 处理事件 ${eventName}`, data);
      }

      // 根据事件类型执行相应的同步逻辑
      switch (eventName) {
        case TaskPixel.EventBus.TagEvents.CREATED:
        case TaskPixel.EventBus.TagEvents.UPDATED:
        case TaskPixel.EventBus.TagEvents.DELETED:
          this._syncTagChanges(eventName, data);
          break;

        case TaskPixel.EventBus.TagEvents.TASK_TAGS_UPDATED:
        case TaskPixel.EventBus.TagEvents.GOAL_TAGS_UPDATED:
          this._syncTagUsage(eventName, data);
          break;
      }
    } catch (error) {
      console.error("处理标签事件失败:", error);
    }
  },

  // 私有方法：同步标签变化
  _syncTagChanges: function (eventName, data) {
    // 通知所有相关组件更新
    const syncEvent = {
      type: "tag_change",
      action: eventName.split(":")[1], // created, updated, deleted
      tag: data,
      timestamp: new Date().toISOString(),
    };

    // 延迟触发，确保数据已保存
    setTimeout(() => {
      TaskPixel.EventBus.emit("tags:change_synced", syncEvent);
    }, 100);
  },

  // 私有方法：同步标签使用情况
  _syncTagUsage: function (eventName, data) {
    // 更新标签使用统计
    if (data.addedTags && data.addedTags.length > 0) {
      setTimeout(() => {
        if (TaskPixel.TagManager && TaskPixel.TagManager.updateTagUsage) {
          TaskPixel.TagManager.updateTagUsage(data.addedTags);
        }
      }, 50);
    }
  },

  // 私有方法：处理数据加载
  _handleDataLoaded: function () {
    console.log("TagSync: 数据加载完成，开始同步检查");

    // 验证数据完整性
    if (TaskPixel.TagManager && TaskPixel.TagManager.validateDataIntegrity) {
      const report = TaskPixel.TagManager.validateDataIntegrity();
      if (!report.isValid) {
        console.warn("TagSync: 检测到数据完整性问题", report.issues);
        TaskPixel.EventBus.emit("tags:integrity_issues", report);
      }
    }
  },

  // 私有方法：处理数据导入
  _handleDataImported: function () {
    console.log("TagSync: 数据导入完成，强制刷新所有组件");
    this.forceRefresh();
  },

  // 私有方法：启动自动同步
  _startAutoSync: function () {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this._performPeriodicSync();
    }, this.config.syncIntervalMs);
  },

  // 私有方法：停止自动同步
  _stopAutoSync: function () {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  },

  // 私有方法：执行周期性同步
  _performPeriodicSync: function () {
    try {
      // 检查数据完整性
      if (TaskPixel.TagManager && TaskPixel.TagManager.validateDataIntegrity) {
        const report = TaskPixel.TagManager.validateDataIntegrity();
        if (!report.isValid && report.issues.length > 0) {
          console.log("TagSync: 周期性检查发现数据问题，尝试修复");
          TaskPixel.TagManager.cleanupOrphanedTags();
        }
      }

      // 重新计算使用统计
      if (TaskPixel.TagManager && TaskPixel.TagManager.recalculateUsageCounts) {
        TaskPixel.TagManager.recalculateUsageCounts();
      }
    } catch (error) {
      console.error("周期性同步失败:", error);
    }
  },

  // 私有方法：设置跨标签页同步
  _setupCrossTabSync: function () {
    // 监听localStorage变化
    window.addEventListener("storage", (e) => {
      if (e.key === TaskPixel.DataStore.STORAGE_KEY) {
        console.log("TagSync: 检测到跨标签页数据变化");

        // 重新加载数据
        TaskPixel.DataStore.loadFromStorage();

        // 强制刷新组件
        this.forceRefresh();
      }
    });
  },

  // 私有方法：收集同步数据
  _collectSyncData: function () {
    return {
      tags: TaskPixel.TagManager ? TaskPixel.TagManager.getAllTags() : [],
      timestamp: new Date().toISOString(),
      version: TaskPixel.DataStore.DATA_VERSION || "1.0.0",
    };
  },

  // 私有方法：执行同步
  _performSync: function (syncData) {
    try {
      // 这里可以添加实际的同步逻辑
      // 目前主要是本地同步，未来可以扩展到服务器同步

      return {
        success: true,
        changes: {
          tags: syncData.tags.length,
          timestamp: syncData.timestamp,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
