/**
 * TaskPixel 统一错误处理框架
 * 提供错误处理、用户反馈和数据恢复功能
 */

TaskPixel.ErrorHandler = {
  // 错误类型定义
  ErrorTypes: {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    DUPLICATE_TAG: "DUPLICATE_TAG",
    TAG_NOT_FOUND: "TAG_NOT_FOUND",
    TAG_IN_USE: "TAG_IN_USE",
    STORAGE_ERROR: "STORAGE_ERROR",
    NETWORK_ERROR: "NETWORK_ERROR",
    PERMISSION_ERROR: "PERMISSION_ERROR",
    SYSTEM_ERROR: "SYSTEM_ERROR",
  },

  // 错误级别
  ErrorLevels: {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
  },

  // 错误日志
  errorLog: [],
  maxLogSize: 100,

  // 用户通知配置
  notificationConfig: {
    duration: 5000,
    position: "bottom-right",
    showDetails: false,
    allowDismiss: true,
  },

  // 处理错误
  handleError: function (error, context = {}) {
    try {
      // 标准化错误对象
      const standardError = this._standardizeError(error, context);

      // 记录错误
      this._logError(standardError);

      // 确定错误级别
      const level = this._determineErrorLevel(standardError);

      // 根据级别处理错误
      switch (level) {
        case this.ErrorLevels.LOW:
          this._handleLowLevelError(standardError);
          break;
        case this.ErrorLevels.MEDIUM:
          this._handleMediumLevelError(standardError);
          break;
        case this.ErrorLevels.HIGH:
          this._handleHighLevelError(standardError);
          break;
        case this.ErrorLevels.CRITICAL:
          this._handleCriticalError(standardError);
          break;
      }

      // 尝试恢复
      this._attemptRecovery(standardError);

      return standardError;
    } catch (handlingError) {
      console.error("错误处理器本身发生错误:", handlingError);
      this._showFallbackError("系统错误处理失败");
    }
  },

  // 显示错误消息
  showErrorMessage: function (error, options = {}) {
    try {
      const config = { ...this.notificationConfig, ...options };
      const message = this._formatErrorMessage(error);

      this._createNotification(message, "error", config);
    } catch (err) {
      console.error("显示错误消息失败:", err);
      this._showFallbackError("无法显示错误消息");
    }
  },

  // 显示成功消息
  showSuccessMessage: function (message, options = {}) {
    try {
      const config = { ...this.notificationConfig, ...options };
      this._createNotification(message, "success", config);
    } catch (err) {
      console.error("显示成功消息失败:", err);
    }
  },

  // 显示警告消息
  showWarningMessage: function (message, options = {}) {
    try {
      const config = { ...this.notificationConfig, ...options };
      this._createNotification(message, "warning", config);
    } catch (err) {
      console.error("显示警告消息失败:", err);
    }
  },

  // 显示信息消息
  showInfoMessage: function (message, options = {}) {
    try {
      const config = { ...this.notificationConfig, ...options };
      this._createNotification(message, "info", config);
    } catch (err) {
      console.error("显示信息消息失败:", err);
    }
  },

  // 显示恢复选项
  showRecoveryOptions: function (options) {
    try {
      if (!Array.isArray(options) || options.length === 0) {
        return;
      }

      const modal = this._createRecoveryModal(options);
      document.body.appendChild(modal);
    } catch (err) {
      console.error("显示恢复选项失败:", err);
    }
  },

  // 数据恢复
  recoverFromCorruption: function () {
    try {
      console.log("开始数据恢复...");

      const recoverySteps = [
        () => this._validateDataStructure(),
        () => this._repairMissingFields(),
        () => this._cleanupInvalidReferences(),
        () => this._rebuildIndexes(),
        () => this._verifyDataIntegrity(),
      ];

      const results = [];
      let totalFixed = 0;

      for (const step of recoverySteps) {
        try {
          const result = step();
          results.push(result);
          if (result.fixed) {
            totalFixed += result.fixed;
          }
        } catch (stepError) {
          console.error("恢复步骤失败:", stepError);
          results.push({ success: false, error: stepError.message });
        }
      }

      const success = results.every((r) => r.success !== false);

      if (success && totalFixed > 0) {
        TaskPixel.DataStore.saveToStorage();
        console.log(`数据恢复完成，修复了 ${totalFixed} 个问题`);
      }

      return {
        success: success,
        totalFixed: totalFixed,
        details: results,
      };
    } catch (error) {
      console.error("数据恢复失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // 验证数据完整性
  validateDataIntegrity: function () {
    try {
      const report = {
        isValid: true,
        issues: [],
        warnings: [],
        suggestions: [],
      };

      // 检查基本数据结构
      if (!TaskPixel.DataStore.data) {
        report.isValid = false;
        report.issues.push("数据存储对象不存在");
        return report;
      }

      // 检查标签数据
      this._validateTagsData(report);

      // 检查任务数据
      this._validateTasksData(report);

      // 检查引用完整性
      this._validateReferences(report);

      return report;
    } catch (error) {
      console.error("验证数据完整性失败:", error);
      return {
        isValid: false,
        issues: [`验证过程出错: ${error.message}`],
        warnings: [],
        suggestions: [],
      };
    }
  },

  // 获取错误统计
  getErrorStats: function () {
    try {
      const stats = {
        total: this.errorLog.length,
        byType: {},
        byLevel: {},
        recent: this.errorLog.slice(-10),
      };

      this.errorLog.forEach((error) => {
        // 按类型统计
        const type = error.type || "UNKNOWN";
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // 按级别统计
        const level = error.level || "UNKNOWN";
        stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("获取错误统计失败:", error);
      return { total: 0, byType: {}, byLevel: {}, recent: [] };
    }
  },

  // 清理错误日志
  clearErrorLog: function () {
    this.errorLog = [];
    console.log("错误日志已清理");
  },

  // 私有方法：标准化错误对象
  _standardizeError: function (error, context) {
    const standardError = {
      id: this._generateErrorId(),
      timestamp: new Date().toISOString(),
      type: error.code || error.type || this.ErrorTypes.SYSTEM_ERROR,
      message: error.message || String(error),
      details: error.details || null,
      context: context,
      stack: error.stack || null,
      level: null, // 将在后续确定
    };

    return standardError;
  },

  // 私有方法：记录错误
  _logError: function (error) {
    this.errorLog.push(error);

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // 控制台输出
    console.error("TaskPixel错误:", error);
  },

  // 私有方法：确定错误级别
  _determineErrorLevel: function (error) {
    const criticalTypes = [
      this.ErrorTypes.STORAGE_ERROR,
      this.ErrorTypes.SYSTEM_ERROR,
    ];
    const highTypes = [
      this.ErrorTypes.TAG_IN_USE,
      this.ErrorTypes.PERMISSION_ERROR,
    ];
    const mediumTypes = [
      this.ErrorTypes.TAG_NOT_FOUND,
      this.ErrorTypes.NETWORK_ERROR,
    ];
    const lowTypes = [
      this.ErrorTypes.VALIDATION_ERROR,
      this.ErrorTypes.DUPLICATE_TAG,
    ];

    if (criticalTypes.includes(error.type)) {
      return this.ErrorLevels.CRITICAL;
    } else if (highTypes.includes(error.type)) {
      return this.ErrorLevels.HIGH;
    } else if (mediumTypes.includes(error.type)) {
      return this.ErrorLevels.MEDIUM;
    } else {
      return this.ErrorLevels.LOW;
    }
  },

  // 私有方法：处理不同级别的错误
  _handleLowLevelError: function (error) {
    // 低级别错误：简单通知，不中断用户操作
    this.showWarningMessage(this._getUserFriendlyMessage(error), {
      duration: 3000,
    });
  },

  _handleMediumLevelError: function (error) {
    // 中级别错误：显示错误消息，可能需要用户注意
    this.showErrorMessage(error, {
      duration: 5000,
      showDetails: true,
    });
  },

  _handleHighLevelError: function (error) {
    // 高级别错误：显示详细错误信息，可能提供恢复选项
    this.showErrorMessage(error, {
      duration: 8000,
      showDetails: true,
    });

    // 提供恢复建议
    const suggestions = this._getRecoverySuggestions(error);
    if (suggestions.length > 0) {
      setTimeout(() => {
        this.showRecoveryOptions(suggestions);
      }, 1000);
    }
  },

  _handleCriticalError: function (error) {
    // 关键错误：立即显示，阻止进一步操作
    this.showErrorMessage(error, {
      duration: 0, // 不自动消失
      showDetails: true,
      allowDismiss: false,
    });

    // 尝试自动恢复
    setTimeout(() => {
      this.recoverFromCorruption();
    }, 2000);
  },

  // 私有方法：尝试恢复
  _attemptRecovery: function (error) {
    try {
      switch (error.type) {
        case this.ErrorTypes.STORAGE_ERROR:
          this._recoverFromStorageError();
          break;
        case this.ErrorTypes.TAG_NOT_FOUND:
          this._recoverFromMissingTag(error);
          break;
        // 其他恢复策略...
      }
    } catch (recoveryError) {
      console.error("自动恢复失败:", recoveryError);
    }
  },

  // 私有方法：创建通知
  _createNotification: function (message, type, config) {
    const notification = document.createElement("div");
    const typeColors = {
      success: "bg-green-500",
      error: "bg-red-500",
      warning: "bg-yellow-500",
      info: "bg-blue-500",
    };

    notification.className = `fixed ${this._getPositionClass(
      config.position
    )} ${typeColors[type]} text-white px-4 py-3 pixel-border z-50 max-w-sm`;

    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    notification.appendChild(messageElement);

    if (config.allowDismiss) {
      const closeButton = document.createElement("button");
      closeButton.innerHTML = "×";
      closeButton.className = "ml-2 font-bold";
      closeButton.onclick = () => this._removeNotification(notification);
      notification.appendChild(closeButton);
    }

    document.body.appendChild(notification);

    if (config.duration > 0) {
      setTimeout(() => {
        this._removeNotification(notification);
      }, config.duration);
    }

    return notification;
  },

  // 私有方法：移除通知
  _removeNotification: function (notification) {
    if (notification && notification.parentNode) {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  },

  // 私有方法：获取位置类
  _getPositionClass: function (position) {
    const positions = {
      "top-left": "top-4 left-4",
      "top-right": "top-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "bottom-right": "bottom-4 right-4",
    };
    return positions[position] || positions["bottom-right"];
  },

  // 私有方法：格式化错误消息
  _formatErrorMessage: function (error) {
    return this._getUserFriendlyMessage(error);
  },

  // 私有方法：获取用户友好的错误消息
  _getUserFriendlyMessage: function (error) {
    const friendlyMessages = {
      [this.ErrorTypes.VALIDATION_ERROR]: "输入的数据格式不正确",
      [this.ErrorTypes.DUPLICATE_TAG]: "标签已存在",
      [this.ErrorTypes.TAG_NOT_FOUND]: "标签不存在",
      [this.ErrorTypes.TAG_IN_USE]: "标签正在使用中，无法删除",
      [this.ErrorTypes.STORAGE_ERROR]: "数据保存失败",
      [this.ErrorTypes.NETWORK_ERROR]: "网络连接出现问题",
      [this.ErrorTypes.PERMISSION_ERROR]: "没有执行此操作的权限",
      [this.ErrorTypes.SYSTEM_ERROR]: "系统出现错误",
    };

    return friendlyMessages[error.type] || error.message || "发生未知错误";
  },

  // 私有方法：获取恢复建议
  _getRecoverySuggestions: function (error) {
    const suggestions = [];

    switch (error.type) {
      case this.ErrorTypes.STORAGE_ERROR:
        suggestions.push({
          text: "重新加载页面",
          action: () => window.location.reload(),
        });
        suggestions.push({
          text: "清理浏览器缓存",
          action: () => this._showCacheClearInstructions(),
        });
        break;

      case this.ErrorTypes.TAG_IN_USE:
        suggestions.push({
          text: "查看使用此标签的项目",
          action: () => this._showTagUsage(error.details),
        });
        suggestions.push({
          text: "强制删除标签",
          action: () => this._forceDeleteTag(error.details),
        });
        break;
    }

    return suggestions;
  },

  // 私有方法：创建恢复模态框
  _createRecoveryModal: function (options) {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const content = document.createElement("div");
    content.className = "pixel-border bg-white p-6 max-w-md";

    content.innerHTML = `
      <h3 class="text-xl font-display mb-4">恢复选项</h3>
      <p class="mb-4">选择一个恢复选项来解决此问题：</p>
      <div class="recovery-options space-y-2"></div>
      <div class="mt-6 flex justify-end">
        <button class="cancel-recovery pixel-button">取消</button>
      </div>
    `;

    const optionsContainer = content.querySelector(".recovery-options");
    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "w-full text-left pixel-button mb-2";
      button.textContent = option.text;
      button.onclick = () => {
        option.action();
        document.body.removeChild(modal);
      };
      optionsContainer.appendChild(button);
    });

    content.querySelector(".cancel-recovery").onclick = () => {
      document.body.removeChild(modal);
    };

    modal.appendChild(content);
    return modal;
  },

  // 私有方法：验证标签数据
  _validateTagsData: function (report) {
    const tags = TaskPixel.DataStore.data.tags || [];

    tags.forEach((tag, index) => {
      if (!tag.id) {
        report.issues.push(`标签[${index}]缺少ID`);
        report.isValid = false;
      }
      if (!tag.name) {
        report.issues.push(`标签[${index}]缺少名称`);
        report.isValid = false;
      }
      if (!tag.display_text) {
        report.warnings.push(`标签[${index}]缺少显示文本`);
      }
    });
  },

  // 私有方法：验证任务数据
  _validateTasksData: function (report) {
    const tasks = TaskPixel.DataStore.data.tasks || [];

    tasks.forEach((task, taskIndex) => {
      if (!task.id) {
        report.issues.push(`任务[${taskIndex}]缺少ID`);
        report.isValid = false;
      }

      if (task.goals) {
        task.goals.forEach((goal, goalIndex) => {
          if (!goal.id) {
            report.issues.push(`任务[${taskIndex}]目标[${goalIndex}]缺少ID`);
            report.isValid = false;
          }
        });
      }
    });
  },

  // 私有方法：验证引用完整性
  _validateReferences: function (report) {
    const tags = TaskPixel.DataStore.data.tags || [];
    const tasks = TaskPixel.DataStore.data.tasks || [];
    const tagIds = new Set(tags.map((tag) => tag.id));

    tasks.forEach((task, taskIndex) => {
      // 检查任务标签引用
      if (task.tags) {
        task.tags.forEach((tagId) => {
          if (!tagIds.has(tagId)) {
            report.issues.push(
              `任务[${taskIndex}]引用了不存在的标签: ${tagId}`
            );
            report.isValid = false;
          }
        });
      }

      // 检查目标标签引用
      if (task.goals) {
        task.goals.forEach((goal, goalIndex) => {
          if (goal.tags) {
            goal.tags.forEach((tagId) => {
              if (!tagIds.has(tagId)) {
                report.issues.push(
                  `任务[${taskIndex}]目标[${goalIndex}]引用了不存在的标签: ${tagId}`
                );
                report.isValid = false;
              }
            });
          }
        });
      }
    });
  },

  // 私有方法：生成错误ID
  _generateErrorId: function () {
    return (
      "error-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5)
    );
  },

  // 私有方法：显示备用错误
  _showFallbackError: function (message) {
    alert("系统错误: " + message);
  },

  // 数据恢复相关的私有方法
  _validateDataStructure: function () {
    let fixed = 0;

    if (!TaskPixel.DataStore.data.tags) {
      TaskPixel.DataStore.data.tags = [];
      fixed++;
    }
    if (!TaskPixel.DataStore.data.tasks) {
      TaskPixel.DataStore.data.tasks = [];
      fixed++;
    }
    if (!TaskPixel.DataStore.data.settings) {
      TaskPixel.DataStore.data.settings = {};
      fixed++;
    }

    return { success: true, fixed: fixed };
  },

  _repairMissingFields: function () {
    let fixed = 0;

    // 修复标签缺失字段
    TaskPixel.DataStore.data.tags.forEach((tag) => {
      if (!tag.display_text) {
        tag.display_text = "#" + (tag.name || "未知");
        fixed++;
      }
      if (!tag.created_at) {
        tag.created_at = new Date().toISOString();
        fixed++;
      }
      if (typeof tag.usage_count !== "number") {
        tag.usage_count = 0;
        fixed++;
      }
    });

    return { success: true, fixed: fixed };
  },

  _cleanupInvalidReferences: function () {
    let fixed = 0;
    const validTagIds = new Set(
      TaskPixel.DataStore.data.tags.map((tag) => tag.id)
    );

    TaskPixel.DataStore.data.tasks.forEach((task) => {
      if (task.tags) {
        const originalLength = task.tags.length;
        task.tags = task.tags.filter((tagId) => validTagIds.has(tagId));
        fixed += originalLength - task.tags.length;
      }

      if (task.goals) {
        task.goals.forEach((goal) => {
          if (goal.tags) {
            const originalLength = goal.tags.length;
            goal.tags = goal.tags.filter((tagId) => validTagIds.has(tagId));
            fixed += originalLength - goal.tags.length;
          }
        });
      }
    });

    return { success: true, fixed: fixed };
  },

  _rebuildIndexes: function () {
    // 重建使用计数等索引
    return { success: true, fixed: 0 };
  },

  _verifyDataIntegrity: function () {
    const report = this.validateDataIntegrity();
    return { success: report.isValid, fixed: 0 };
  },
};
