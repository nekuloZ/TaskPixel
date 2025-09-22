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
        } else {
          console.log("未找到已保存的数据，使用默认数据");
        }
      } catch (error) {
        console.error("加载数据出错:", error);
      }
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
        timeline: [],
      };

      this.data.tasks.push(newTask);
      this.saveToStorage();
      TaskPixel.EventBus.emit("task:added", newTask);
      return taskId;
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
      if (taskIndex === -1) return false;

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
   */
  EventBus: {
    events: {},

    init: function () {
      this.events = {};
      console.log("事件总线初始化完成");
    },

    // 订阅事件
    on: function (eventName, callback) {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }

      this.events[eventName].push(callback);
      return true;
    },

    // 取消订阅
    off: function (eventName, callback) {
      if (!this.events[eventName]) return false;

      if (callback) {
        // 移除特定回调
        this.events[eventName] = this.events[eventName].filter(
          (cb) => cb !== callback
        );
      } else {
        // 移除所有回调
        delete this.events[eventName];
      }

      return true;
    },

    // 触发事件
    emit: function (eventName, data) {
      if (!this.events[eventName]) return false;

      this.events[eventName].forEach((callback) => {
        setTimeout(() => {
          callback(data);
        }, 0);
      });

      return true;
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
