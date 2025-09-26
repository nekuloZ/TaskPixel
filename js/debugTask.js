/**
 * 任务创建调试模块
 * 用于诊断任务创建失败的问题
 */

const TaskCreationDebug = {
  // 调试配置
  config: {
    autoCreateTestTask: false, // 是否自动创建测试任务
    enableConsoleLogging: true, // 是否启用控制台日志
  },

  init: function () {
    if (this.config.enableConsoleLogging) {
      console.log("=== 任务创建调试开始 ===");
    }
    this.checkElements();
    this.checkDataStore();

    // 只有在配置允许时才自动创建测试任务
    if (this.config.autoCreateTestTask) {
      this.testTaskCreation();
    }
  },

  // 检查DOM元素
  checkElements: function () {
    if (!this.config.enableConsoleLogging) return;

    console.log("--- 检查DOM元素 ---");

    const elements = {
      createTaskButton: document.querySelector(".create-task-button"),
      taskDialog: document.getElementById("task-dialog"),
      taskForm: document.getElementById("task-form"),
      taskTitleInput: document.getElementById("task-title"),
      taskDescriptionInput: document.getElementById("task-description"),
      createButton: document.querySelector(".create-task-confirm"),
      cancelButton: document.querySelector(".create-task-cancel"),
    };

    Object.keys(elements).forEach((key) => {
      const element = elements[key];
      console.log(`${key}:`, element ? "✓ 找到" : "✗ 未找到");
    });
  },

  // 检查数据存储模块
  checkDataStore: function () {
    if (!this.config.enableConsoleLogging) return;

    console.log("--- 检查数据存储模块 ---");

    if (typeof TaskPixel === "undefined") {
      console.error("TaskPixel 对象未定义");
      return;
    }

    if (typeof TaskPixel.DataStore === "undefined") {
      console.error("TaskPixel.DataStore 未定义");
      return;
    }

    console.log("DataStore 数据:", TaskPixel.DataStore.data);
    console.log("当前任务数量:", TaskPixel.DataStore.data.tasks.length);
  },

  // 测试任务创建（手动调用）
  testTaskCreation: function () {
    console.log("--- 测试任务创建 ---");

    try {
      const testTaskData = {
        title: "测试任务 " + Date.now(),
        description: "这是一个测试任务",
      };

      console.log("测试数据:", testTaskData);

      if (typeof TaskPixel.DataStore.addTask === "function") {
        const taskId = TaskPixel.DataStore.addTask(testTaskData);
        console.log("任务创建结果:", taskId ? "成功" : "失败");
        console.log("返回的任务ID:", taskId);
      } else {
        console.error("addTask 方法不存在");
      }
    } catch (error) {
      console.error("测试任务创建时出错:", error);
    }
  },

  // 手动触发测试任务创建（仅用于调试）
  manualTestTaskCreation: function () {
    console.log("手动触发测试任务创建");
    this.testTaskCreation();
  },

  // 检查localStorage
  checkLocalStorage: function () {
    console.log("--- 检查localStorage ---");

    try {
      const data = localStorage.getItem("taskpixel_data");
      if (data) {
        const parsed = JSON.parse(data);
        console.log("localStorage 数据:", parsed);
      } else {
        console.log("localStorage 中没有数据");
      }
    } catch (error) {
      console.error("读取localStorage出错:", error);
    }
  },
};

// 页面加载完成后运行调试（仅检查，不创建测试任务）
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => TaskCreationDebug.init(), 1000);
  });
} else {
  setTimeout(() => TaskCreationDebug.init(), 1000);
}

// 调试工具使用说明：
// 1. 启用自动测试任务创建：TaskCreationDebug.config.autoCreateTestTask = true
// 2. 禁用控制台日志：TaskCreationDebug.config.enableConsoleLogging = false
// 3. 手动创建测试任务：TaskCreationDebug.manualTestTaskCreation()
// 4. 重新运行完整调试：TaskCreationDebug.init()
