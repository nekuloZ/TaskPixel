/**
 * TaskPixel 主页功能模块
 * 提供任务列表渲染、交互和下一步行动推荐功能
 */

TaskPixel.Home = {
  // DOM元素引用
  elements: {
    taskContainer: null,
    newTaskButton: null,
    weeklyReviewButton: null,
    nextActionsContainer: null,
    bulkActionsToolbar: null,
    toggleBulkModeBtn: null,
    bulkDeleteBtn: null,
    cancelSelectionBtn: null,
    selectedCountDisplay: null,
  },

  // 批量操作状态
  bulkMode: false,
  selectedTasks: new Set(),

  // 初始化主页功能
  init: function () {
    this.cacheElements();
    this.bindEvents();
    this.renderTasks();
    // 初始化拖拽排序（在渲染后）
    this.initSortable();
    this.renderNextActions();
    console.log("主页功能模块初始化完成");
  },

  // 缓存DOM元素引用
  cacheElements: function () {
    this.elements.taskContainer =
      document.querySelector(".task-container") ||
      document.querySelector(".grid");
    this.elements.newTaskButton =
      document.querySelector(".create-task-button") ||
      document.querySelector(".pixel-button:first-child");
    this.elements.weeklyReviewButton = document.querySelector(
      ".weekly-review-button"
    );
    this.elements.nextActionsContainer =
      document.querySelector(".next-actions-container") ||
      document.querySelector(".space-y-6");

    // 批量操作相关元素
    this.elements.bulkActionsToolbar =
      document.getElementById("bulkActionsToolbar");
    this.elements.toggleBulkModeBtn = document.querySelector(
      ".toggle-bulk-mode-btn"
    );
    this.elements.bulkDeleteBtn = document.querySelector(".bulk-delete-btn");
    this.elements.cancelSelectionBtn = document.querySelector(
      ".cancel-selection-btn"
    );
    this.elements.selectedCountDisplay =
      document.querySelector(".selected-count");
  },

  // 绑定事件处理函数
  bindEvents: function () {
    // 如果不存在，则创建"创建任务"按钮点击事件类
    if (
      this.elements.newTaskButton &&
      !this.elements.newTaskButton.classList.contains("create-task-button")
    ) {
      this.elements.newTaskButton.classList.add("create-task-button");
    }

    // 周报按钮事件
    if (this.elements.weeklyReviewButton) {
      this.elements.weeklyReviewButton.addEventListener(
        "click",
        this.showWeeklyReview.bind(this)
      );
    }

    // 监听任务数据变化
    TaskPixel.EventBus.on("task:added", this.renderTasks.bind(this));
    TaskPixel.EventBus.on("task:updated", this.renderTasks.bind(this));
    TaskPixel.EventBus.on("task:deleted", this.renderTasks.bind(this));
    TaskPixel.EventBus.on("data:imported", this.renderTasks.bind(this));

    // 批量操作事件绑定
    this.bindBulkActionEvents();
  },

  // 绑定批量操作事件
  bindBulkActionEvents: function () {
    // 切换批量管理模式
    if (this.elements.toggleBulkModeBtn) {
      this.elements.toggleBulkModeBtn.addEventListener("click", () => {
        this.toggleBulkMode();
      });
    }

    // 批量删除按钮
    if (this.elements.bulkDeleteBtn) {
      this.elements.bulkDeleteBtn.addEventListener("click", () => {
        this.performBulkDelete();
      });
    }

    // 取消选择按钮
    if (this.elements.cancelSelectionBtn) {
      this.elements.cancelSelectionBtn.addEventListener("click", () => {
        this.clearSelection();
      });
    }
  },

  // 渲染任务列表
  renderTasks: function () {
    if (!this.elements.taskContainer) return;

    // 获取所有任务
    const tasks = (TaskPixel.DataStore.getAllTasks() || []).slice();
    // 按 order 字段排序（如果存在）
    tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

    // 如果没有任务容器，则创建一个
    if (!this.elements.taskContainer) {
      const container = document.createElement("div");
      container.className =
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 task-container";

      // 找到合适的位置插入容器
      const mainContent = document.querySelector("main");
      if (mainContent) {
        const section = mainContent.querySelector("div:first-child");
        if (section) {
          section.appendChild(container);
          this.elements.taskContainer = container;
        }
      }
    }

    // 清空现有内容
    if (this.elements.taskContainer) {
      this.elements.taskContainer.innerHTML = "";
    }

    // 如果没有任务，显示空状态
    if (tasks.length === 0) {
      this.renderEmptyState();
      return;
    }

    // 渲染每个任务卡片
    tasks.forEach((task) => {
      const taskCard = this.createTaskCard(task);
      this.elements.taskContainer.appendChild(taskCard);
    });

    // 重新绑定事件到新渲染的元素
    this.bindTaskCardEvents();
    // 重新初始化 Sortable（防止 DOM 替换后实例失效）
    this.initSortable();
  },

  // 绑定任务卡片事件
  bindTaskCardEvents: function () {
    if (!this.elements.taskContainer) return;

    // 移除之前的事件监听器（如果存在）
    this.elements.taskContainer.removeEventListener(
      "click",
      this.handleTaskClick
    );

    // 重新绑定事件
    this.elements.taskContainer.addEventListener(
      "click",
      this.handleTaskClick.bind(this)
    );

    // 如果处于批量模式，绑定复选框事件
    if (this.bulkMode) {
      this.bindCheckboxEvents();
    }
  },

  // 创建任务卡片元素
  createTaskCard: function (task) {
    // 创建卡片容器
    const cardElement = document.createElement("div");
    cardElement.className =
      "pixel-card p-5 flex flex-col justify-between task-card relative";
    cardElement.dataset.taskId = task.id;

    // 确定截止日期状态
    let dueStatusClass = "text-blue-500";
    let dueStatusText = "未设置截止日期";

    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();

      // 规范化日期到午夜再比较，避免时分秒造成的偏差
      const dueDateMid = new Date(dueDate);
      dueDateMid.setHours(0, 0, 0, 0);
      const todayMid = new Date(today);
      todayMid.setHours(0, 0, 0, 0);

      const diffTime = dueDateMid - todayMid;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        dueStatusClass = "text-red-500";
        dueStatusText = `已逾期 ${Math.abs(diffDays)} 天`;
      } else if (diffDays === 0) {
        dueStatusClass = "text-red-500";
        dueStatusText = "今天截止";
      } else if (diffDays === 1) {
        dueStatusClass = "text-yellow-500";
        dueStatusText = "明天截止";
      } else if (diffDays <= 3) {
        dueStatusClass = "text-blue-500";
        dueStatusText = `还剩 ${diffDays} 天`;
      } else {
        dueStatusClass = "text-gray-500";
        dueStatusText = TaskPixel.Utils.formatDate(task.due_date);
      }
    }

    // 确定任务状态显示
    let taskStatusText = "进行中";
    let taskStatusClass =
      "bg-accent-yellow/20 text-accent-yellow-800 border-accent-yellow-800";

    switch (task.status) {
      case "todo":
        taskStatusText = "待处理";
        taskStatusClass =
          "bg-accent-blue/20 text-accent-blue-800 border-accent-blue-800";
        break;
      case "on-hold":
        taskStatusText = "搁置";
        taskStatusClass =
          "bg-accent-red/20 text-accent-red-800 border-accent-red-800";
        break;
      case "completed":
        taskStatusText = "已完成";
        taskStatusClass =
          "bg-accent-green/20 text-accent-green-800 border-accent-green-800";
        break;
      case "in-progress":
      default:
        taskStatusText = "进行中";
        taskStatusClass =
          "bg-accent-yellow/20 text-accent-yellow-800 border-accent-yellow-800";
        break;
    }

    // 构建卡片内容
    const cardContent = `
            <!-- 批量选择复选框 -->
            <div class="task-checkbox-container absolute top-2 left-2 hidden">
                <input type="checkbox" class="task-checkbox w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2" 
                       data-task-id="${task.id}" />
            </div>
      <!-- 拖拽句柄 -->
      <!-- 不再显示拖拽句柄：使用长按触发拖拽 -->
            <div>
                <div class="flex justify-between items-center mb-2">
                    <p class="text-xs font-bold ${dueStatusClass}">${dueStatusText}</p>
                    <span class="text-xs px-2 py-1 rounded border-2 ${taskStatusClass}">${taskStatusText}</span>
                </div>
                <p class="text-lg font-bold my-2">${task.title}</p>
                <p class="text-base text-black/70 leading-relaxed font-sans">${
                  task.description || "暂无描述"
                }</p>
                <div class="mt-2">
                    <div class="w-full h-2 bg-gray-200 rounded-full">
                        <div class="h-full bg-primary rounded-full" style="width: ${
                          TaskPixel.DataStoreAdapter.getTaskProgress(task.id) ||
                          0
                        }%"></div>
                    </div>
                    <p class="text-right text-xs text-gray-500 mt-1">${
                      TaskPixel.DataStoreAdapter.getTaskProgress(task.id) || 0
                    }% 完成</p>
                </div>
            </div>
            <div class="flex justify-end items-center mt-4 pt-4 border-t border-gray-200">
                <button class="pixel-button-sm bg-red-500 text-white px-3 py-1 text-xs delete-task-btn" 
                        data-task-id="${task.id}">
                    删除
                </button>
            </div>
        `;

    cardElement.innerHTML = cardContent;

    // 长按触发拖拽，不再使用句柄，因此无需阻止句柄事件传播
    return cardElement;
  },

  // 初始化 Sortable（任务列表）
  initSortable: function () {
    if (!window.Sortable) {
      console.warn("SortableJS 未加载，跳过可拖拽初始化");
      return;
    }

    const container = document.querySelector(".task-container");
    if (!container) return;

    // 若已初始化则销毁后重建（防止重复绑定）
    if (this._sortableInstance) {
      try {
        this._sortableInstance.destroy();
      } catch (e) {
        // ignore
      }
      this._sortableInstance = null;
    }

    // 使用 delay（长按）触发拖拽，用户按住一段时间后即可拖动整个项
    this._sortableInstance = Sortable.create(container, {
      delay: 220,
      animation: 150,
      onEnd: (evt) => {
        try {
          const ordered = Array.from(container.querySelectorAll(".task-card"))
            .map((el) => el.dataset.taskId)
            .filter(Boolean);
          if (ordered && ordered.length) {
            TaskPixel.DataStore.updateTaskOrder(ordered);
          }
        } catch (err) {
          console.error("保存任务顺序失败", err);
        }
      },
    });
  },

  // 渲染空状态
  renderEmptyState: function () {
    if (!this.elements.taskContainer) return;

    const emptyState = document.createElement("div");
    emptyState.className = "col-span-full text-center p-8";
    emptyState.innerHTML = `
            <div class="text-6xl mb-4">🎮</div>
            <h3 class="text-xl font-bold mb-2">你还没有任务</h3>
            <p class="text-gray-600 mb-4">点击"新任务"按钮创建你的第一个任务</p>
            <button class="pixel-button bg-primary text-white create-task-button">创建任务</button>
        `;

    this.elements.taskContainer.appendChild(emptyState);

    // 为新创建的按钮绑定事件
    const newButton = emptyState.querySelector(".create-task-button");
    if (newButton) {
      newButton.addEventListener("click", function () {
        if (
          TaskPixel.TaskCreation &&
          typeof TaskPixel.TaskCreation.openDialog === "function"
        ) {
          TaskPixel.TaskCreation.openDialog();
        }
      });
    }
  },

  // 处理任务卡片点击
  handleTaskClick: function (e) {
    console.log("Task click handler triggered", e.target);

    // 检查是否点击了复选框或复选框容器，如果是则不处理
    if (
      e.target.classList.contains("task-checkbox") ||
      e.target.closest(".task-checkbox-container")
    ) {
      console.log("Checkbox clicked, ignoring card click");
      return;
    }

    // 检查是否点击了删除按钮
    if (e.target.classList.contains("delete-task-btn")) {
      e.preventDefault();
      e.stopPropagation();
      const taskId = e.target.dataset.taskId;
      console.log("Delete button clicked for task:", taskId);
      this.deleteTask(taskId);
      return;
    }

    // 向上查找最近的任务卡片元素
    let taskCard = e.target.closest(".task-card");
    if (!taskCard) return;

    const taskId = taskCard.dataset.taskId;
    if (!taskId) return;

    console.log("Navigating to task detail:", taskId);
    // 导航到任务详情页
    TaskPixel.Navigation.navigateTo("task_detail", { taskId });
  },

  // 删除任务
  deleteTask: function (taskId) {
    if (!taskId) {
      alert("任务ID无效");
      return;
    }

    if (confirm("确定要删除这个任务吗？此操作不能撤销。")) {
      try {
        const result = TaskPixel.DataStore.deleteTask(taskId);

        if (result) {
          // 重新渲染任务列表（EventBus 事件会在 DataStore 中触发）
          this.renderTasks();
          alert("任务删除成功");
        } else {
          console.error("Task not found:", taskId);
          alert("删除失败：未找到指定的任务");
        }
      } catch (error) {
        console.error("Delete task error:", error);
        alert("删除任务失败: " + error.message);
      }
    }
  },

  // 显示周报
  showWeeklyReview: function () {
    // 获取所有任务
    const allTasks = TaskPixel.DataStore.getAllTasks();

    // 获取过去一周的日期
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    // 筛选本周完成的任务和新增的任务
    const completedTasks = [];
    const newTasks = [];
    let totalHours = 0;

    allTasks.forEach((task) => {
      // 检查任务是否在本周完成
      if (task.status === "completed") {
        const completedDate = new Date(task.completed_at || today);
        if (completedDate >= oneWeekAgo) {
          completedTasks.push(task);
        }
      }

      // 检查任务是否在本周创建
      const createdDate = new Date(task.created_at);
      if (createdDate >= oneWeekAgo) {
        newTasks.push(task);
      }

      // 累计工作时间
      task.timeline.forEach((record) => {
        const recordDate = new Date(record.date);
        if (recordDate >= oneWeekAgo) {
          totalHours += parseFloat(record.hours) || 0;
        }
      });
    });

    // 创建周报对话框
    this.createWeeklyReviewDialog(completedTasks, newTasks, totalHours);
  },

  // 创建周报对话框
  createWeeklyReviewDialog: function (completedTasks, newTasks, totalHours) {
    // 创建对话框元素
    const dialogElement = document.createElement("div");
    dialogElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    dialogElement.id = "weekly-review-dialog";

    // 格式化日期范围
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const dateRangeText = `${TaskPixel.Utils.formatDate(
      oneWeekAgo
    )} - ${TaskPixel.Utils.formatDate(today)}`;

    // 构建对话框内容
    dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-2xl overflow-y-auto max-h-[80vh]">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-display">周报</h2>
                    <button id="close-weekly-review" class="pixel-button p-1">
                        <span class="text-xl">×</span>
                    </button>
                </div>
                
                <div class="mb-4">
                    <p class="text-lg text-gray-600">${dateRangeText}</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="pixel-border p-4 bg-blue-50">
                        <h3 class="font-bold text-lg mb-2">已完成任务</h3>
                        <p class="text-3xl">${completedTasks.length}</p>
                    </div>
                    <div class="pixel-border p-4 bg-green-50">
                        <h3 class="font-bold text-lg mb-2">新增任务</h3>
                        <p class="text-3xl">${newTasks.length}</p>
                    </div>
                    <div class="pixel-border p-4 bg-yellow-50">
                        <h3 class="font-bold text-lg mb-2">总工作时间</h3>
                        <p class="text-3xl">${totalHours.toFixed(1)} 小时</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="font-display text-xl mb-3">已完成的任务</h3>
                    <div class="space-y-2">
                        ${
                          completedTasks.length > 0
                            ? completedTasks
                                .map(
                                  (task) => `
                                <div class="pixel-border p-3 bg-white">
                                    <p class="font-bold">${task.title}</p>
                                </div>
                            `
                                )
                                .join("")
                            : '<p class="text-gray-500">本周没有完成任何任务</p>'
                        }
                    </div>
                </div>
                
                <div>
                    <h3 class="font-display text-xl mb-3">新增的任务</h3>
                    <div class="space-y-2">
                        ${
                          newTasks.length > 0
                            ? newTasks
                                .map(
                                  (task) => `
                                <div class="pixel-border p-3 bg-white">
                                    <p class="font-bold">${task.title}</p>
                                </div>
                            `
                                )
                                .join("")
                            : '<p class="text-gray-500">本周没有新增任何任务</p>'
                        }
                    </div>
                </div>
            </div>
        `;

    // 将对话框添加到页面
    document.body.appendChild(dialogElement);

    // 绑定关闭按钮事件
    const closeButton = document.getElementById("close-weekly-review");
    if (closeButton) {
      closeButton.addEventListener("click", function () {
        document.body.removeChild(dialogElement);
      });
    }

    // 绑定ESC键关闭对话框
    const escHandler = function (e) {
      if (e.key === "Escape") {
        document.body.removeChild(dialogElement);
        document.removeEventListener("keydown", escHandler);
      }
    };

    document.addEventListener("keydown", escHandler);
  },

  // 渲染下一步行动推荐
  renderNextActions: function () {
    if (!this.elements.nextActionsContainer) return;

    // 清空现有内容
    this.elements.nextActionsContainer.innerHTML = "";

    // 获取所有任务
    const tasks = TaskPixel.DataStore.getAllTasks();

    // 如果没有任务，显示默认推荐
    if (tasks.length === 0) {
      this.renderDefaultNextActions();
      return;
    }

    // 从未完成的任务中选择优先级高的或者进度接近完成的
    const activeTasks = tasks.filter((task) => task.status !== "completed");

    // 按优先级和进度排序
    activeTasks.sort((a, b) => {
      // 优先级高的排在前面
      const priorityScore = { high: 3, medium: 2, low: 1 };
      const scoreA = priorityScore[a.priority] || 0;
      const scoreB = priorityScore[b.priority] || 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // 进度接近完成的排在前面
      return (b.progress || 0) - (a.progress || 0);
    });

    // 选择最多2个任务推荐
    const recommendedTasks = activeTasks.slice(0, 2);

    // 如果没有活跃任务，显示默认推荐
    if (recommendedTasks.length === 0) {
      this.renderDefaultNextActions();
      return;
    }

    // 渲染推荐
    recommendedTasks.forEach((task) => {
      // 查找未完成的子步骤
      let nextStep = "继续推进此任务";
      let stepFound = false;

      for (const goal of task.goals || []) {
        for (const substep of goal.substeps || []) {
          if (!substep.completed) {
            nextStep = substep.content;
            stepFound = true;
            break;
          }
        }
        if (stepFound) break;
      }

      const nextActionCard = document.createElement("div");
      nextActionCard.className =
        "pixel-card p-5 flex items-center justify-between next-action-card";
      nextActionCard.dataset.taskId = task.id;

      nextActionCard.innerHTML = `
                <div class="flex-1">
                    <p class="text-xs font-bold text-green-500 mb-2 flex items-center gap-2">
                        <svg class="bi bi-stars" fill="currentColor" height="12" viewBox="0 0 16 16" width="12" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.9l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.9A1.73 1.73 0 0 0 2.31 4.807l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"></path>
                        </svg> 
                        AI建议
                    </p>
                    <p class="text-lg font-bold">${task.title}</p>
                    <p class="text-base text-black/70 mt-2 leading-relaxed font-sans">${nextStep}</p>
                </div>
            `;

      this.elements.nextActionsContainer.appendChild(nextActionCard);
    });

    // 为推荐卡片绑定点击事件
    const actionCards =
      this.elements.nextActionsContainer.querySelectorAll(".next-action-card");
    actionCards.forEach((card) => {
      card.addEventListener("click", () => {
        const taskId = card.dataset.taskId;
        if (taskId) {
          TaskPixel.Navigation.navigateTo("task_detail", { taskId });
        }
      });
    });
  },

  // 渲染默认的下一步行动推荐
  renderDefaultNextActions: function () {
    if (!this.elements.nextActionsContainer) return;

    const defaultActions = [
      {
        title: "创建你的第一个任务",
        description: '点击"新任务"按钮开始你的任务管理之旅',
      },
      {
        title: "探索任务管理功能",
        description: "了解如何使用目标、子步骤和AI辅助功能来提高工作效率",
      },
    ];

    defaultActions.forEach((action) => {
      const actionCard = document.createElement("div");
      actionCard.className =
        "pixel-card p-5 flex items-center justify-between next-action-card";

      actionCard.innerHTML = `
                <div class="flex-1">
                    <p class="text-xs font-bold text-green-500 mb-2 flex items-center gap-2">
                        <svg class="bi bi-stars" fill="currentColor" height="12" viewBox="0 0 16 16" width="12" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.9l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.9A1.73 1.73 0 0 0 2.31 4.807l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"></path>
                        </svg> 
                        建议
                    </p>
                    <p class="text-lg font-bold">${action.title}</p>
                    <p class="text-base text-black/70 mt-2 leading-relaxed font-sans">${action.description}</p>
                </div>
            `;

      this.elements.nextActionsContainer.appendChild(actionCard);
    });
  },

  // ==================== 批量操作方法 ====================

  // 切换批量管理模式
  toggleBulkMode: function () {
    this.bulkMode = !this.bulkMode;

    if (this.bulkMode) {
      this.enterBulkMode();
    } else {
      this.exitBulkMode();
    }
  },

  // 进入批量管理模式
  enterBulkMode: function () {
    this.bulkMode = true;

    // 显示所有复选框
    const checkboxContainers = document.querySelectorAll(
      ".task-checkbox-container"
    );
    checkboxContainers.forEach((container) => {
      container.classList.remove("hidden");
    });

    // 更新按钮文本
    if (this.elements.toggleBulkModeBtn) {
      this.elements.toggleBulkModeBtn.textContent = "退出批量管理";
      this.elements.toggleBulkModeBtn.classList.remove("bg-pixel-secondary");
      this.elements.toggleBulkModeBtn.classList.add(
        "bg-red-500",
        "hover:bg-red-600",
        "text-white"
      );
    }

    // 绑定复选框事件
    this.bindCheckboxEvents();
  },

  // 退出批量管理模式
  exitBulkMode: function () {
    this.bulkMode = false;

    // 隐藏所有复选框
    const checkboxContainers = document.querySelectorAll(
      ".task-checkbox-container"
    );
    checkboxContainers.forEach((container) => {
      container.classList.add("hidden");
    });

    // 隐藏批量操作工具栏
    if (this.elements.bulkActionsToolbar) {
      this.elements.bulkActionsToolbar.classList.add("hidden");
    }

    // 恢复按钮样式
    if (this.elements.toggleBulkModeBtn) {
      this.elements.toggleBulkModeBtn.textContent = "批量管理";
      this.elements.toggleBulkModeBtn.classList.remove(
        "bg-red-500",
        "hover:bg-red-600",
        "text-white"
      );
      this.elements.toggleBulkModeBtn.classList.add("bg-pixel-secondary");
    }

    // 清空选择
    this.clearSelection();
  },

  // 绑定复选框事件
  bindCheckboxEvents: function () {
    const checkboxes = document.querySelectorAll(".task-checkbox");
    checkboxes.forEach((checkbox) => {
      // 同时绑定change和click事件来确保事件处理正确
      checkbox.addEventListener("change", (e) => {
        this.handleTaskSelection(e);
      });

      checkbox.addEventListener("click", (e) => {
        // 阻止点击事件冒泡到卡片
        e.stopPropagation();
      });
    });
  },

  // 处理任务选择
  handleTaskSelection: function (event) {
    // 阻止事件冒泡，避免触发卡片点击
    event.stopPropagation();

    const checkbox = event.target;
    const taskId = checkbox.dataset.taskId;

    if (checkbox.checked) {
      this.selectedTasks.add(taskId);
    } else {
      this.selectedTasks.delete(taskId);
    }

    this.updateBulkActionUI();
  },

  // 更新批量操作UI
  updateBulkActionUI: function () {
    const selectedCount = this.selectedTasks.size;

    // 更新选中数量显示
    if (this.elements.selectedCountDisplay) {
      this.elements.selectedCountDisplay.textContent = `已选择 ${selectedCount} 个任务`;
    }

    // 显示或隐藏批量操作工具栏
    if (this.elements.bulkActionsToolbar) {
      if (selectedCount > 0) {
        this.elements.bulkActionsToolbar.classList.remove("hidden");
      } else {
        this.elements.bulkActionsToolbar.classList.add("hidden");
      }
    }
  },

  // 清空选择
  clearSelection: function () {
    this.selectedTasks.clear();

    // 取消所有复选框的选中状态
    const checkboxes = document.querySelectorAll(".task-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    this.updateBulkActionUI();
  },

  // 执行批量删除
  performBulkDelete: function () {
    const selectedCount = this.selectedTasks.size;

    if (selectedCount === 0) {
      alert("请先选择要删除的任务");
      return;
    }

    // 确认删除
    const confirmMessage = `确定要删除选中的 ${selectedCount} 个任务吗？\n\n此操作不可撤销！`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // 执行删除
    let successCount = 0;
    let failureCount = 0;

    this.selectedTasks.forEach((taskId) => {
      try {
        TaskPixel.DataStore.deleteTask(taskId);
        successCount++;
      } catch (error) {
        console.error(`删除任务 ${taskId} 失败:`, error);
        failureCount++;
      }
    });

    // 显示结果反馈
    if (failureCount === 0) {
      alert(`成功删除 ${successCount} 个任务！`);
    } else {
      alert(`删除完成！成功: ${successCount} 个，失败: ${failureCount} 个`);
    }

    // 清空选择并退出批量模式
    this.clearSelection();
    this.exitBulkMode();

    // 重新渲染任务列表
    this.renderTasks();

    // 触发数据更新事件
    TaskPixel.EventBus.emit("task:deleted");
  },
};
