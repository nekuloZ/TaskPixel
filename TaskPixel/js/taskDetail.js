/**
 * TaskPixel 任务详情页功能模块
 * 提供任务详情显示、目标和子步骤管理、进度记录等功能
 */

TaskPixel.TaskDetail = {
  // 当前显示的任务ID
  currentTaskId: null,

  // DOM元素引用
  elements: {
    taskTitle: null,
    taskDescription: null,
    taskProgress: null,
    taskStatus: null,
    taskPriority: null,
    goalsContainer: null,
    timelineForm: null,
    timelineContent: null,
    timelineHours: null,
    timelineContainer: null,
    aiAssistButton: null,
    backButton: null,
    editButton: null,
    completeButton: null,
  },

  // 初始化任务详情页功能
  init: function () {
    // 从URL获取任务ID
    const params = TaskPixel.Navigation.getUrlParams();
    this.currentTaskId = params.id || "";

    if (!this.currentTaskId) {
      alert("未指定任务ID，返回主页");
      TaskPixel.Navigation.navigateTo("home");
      return;
    }

    this.cacheElements();
    this.loadTaskData();
    this.bindEvents();
    console.log("任务详情页功能模块初始化完成");
  },

  // 缓存DOM元素引用
  cacheElements: function () {
    this.elements.taskTitle =
      document.querySelector(".task-title") || document.querySelector("h2");
    this.elements.taskDescription = document.querySelector(".task-description");
    this.elements.taskProgress = document.querySelector(".progress-bar-fill");
    this.elements.taskStatus = document.querySelector(".task-status");
    this.elements.taskPriority = document.querySelector(".task-priority");
    this.elements.goalsContainer = document.querySelector(".goals-container");
    this.elements.timelineForm = document.getElementById("timeline-form");
    this.elements.timelineContent = document.getElementById("work-content");
    this.elements.timelineHours = document.getElementById("time-spent");
    this.elements.timelineContainer = document.querySelector(
      ".timeline-container"
    );
    this.elements.aiAssistButton = document.querySelector(".ai-assist-button");
    this.elements.backButton = document.querySelector(".back-button");
    this.elements.editButton = document.querySelector(".edit-button");
    this.elements.completeButton = document.querySelector(".complete-button");
  },

  // 绑定事件处理函数
  bindEvents: function () {
    // AI辅助按钮事件
    if (this.elements.aiAssistButton) {
      this.elements.aiAssistButton.addEventListener(
        "click",
        this.handleAiAssist.bind(this)
      );
    }

    // 返回按钮事件
    if (this.elements.backButton) {
      this.elements.backButton.addEventListener("click", () => {
        TaskPixel.Navigation.navigateTo("home");
      });
    }

    // 编辑按钮事件
    if (this.elements.editButton) {
      this.elements.editButton.addEventListener(
        "click",
        this.openEditTaskDialog.bind(this)
      );
    }

    // 完成按钮事件
    if (this.elements.completeButton) {
      this.elements.completeButton.addEventListener(
        "click",
        this.handleCompleteTask.bind(this)
      );
    }

    // 时间记录表单提交事件
    if (this.elements.timelineForm) {
      this.elements.timelineForm.addEventListener(
        "submit",
        this.handleTimelineSubmit.bind(this)
      );
    }

    // 绑定目标容器的事件委托
    if (this.elements.goalsContainer) {
      this.elements.goalsContainer.addEventListener(
        "click",
        this.handleGoalsContainerClick.bind(this)
      );
    }

    // 监听任务数据变化
    TaskPixel.EventBus.on("task:updated", this.handleTaskUpdated.bind(this));
    TaskPixel.EventBus.on("goal:added", this.handleGoalAdded.bind(this));
    TaskPixel.EventBus.on("substep:added", this.handleSubstepAdded.bind(this));
    TaskPixel.EventBus.on(
      "substep:updated",
      this.handleSubstepUpdated.bind(this)
    );
    TaskPixel.EventBus.on(
      "timeline:added",
      this.handleTimelineAdded.bind(this)
    );
  },

  // 加载任务数据
  loadTaskData: function () {
    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);

    if (!task) {
      alert("未找到任务，返回主页");
      TaskPixel.Navigation.navigateTo("home");
      return;
    }

    this.renderTaskDetails(task);
    this.renderGoals(task.goals);
    this.renderTimeline(task.timeline);
  },

  // 渲染任务详情
  renderTaskDetails: function (task) {
    // 设置任务标题
    if (this.elements.taskTitle) {
      this.elements.taskTitle.textContent = `任务: ${task.title}`;
    }

    // 设置任务描述
    if (this.elements.taskDescription) {
      this.elements.taskDescription.textContent =
        task.description || "暂无描述";
    }

    // 设置任务进度
    if (this.elements.taskProgress) {
      this.elements.taskProgress.style.width = `${task.progress || 0}%`;

      // 更新进度文本
      const progressText = document.querySelector(".progress-text");
      if (progressText) {
        progressText.textContent = `${task.progress || 0}% 完成`;
      }
    }

    // 设置任务状态
    if (this.elements.taskStatus) {
      let statusText = "进行中";
      let statusClass =
        "bg-accent-yellow/20 text-accent-yellow-800 border-accent-yellow-800";

      switch (task.status) {
        case "todo":
          statusText = "待处理";
          statusClass =
            "bg-accent-blue/20 text-accent-blue-800 border-accent-blue-800";
          break;
        case "completed":
          statusText = "已完成";
          statusClass =
            "bg-accent-green/20 text-accent-green-800 border-accent-green-800";
          break;
      }

      this.elements.taskStatus.textContent = statusText;

      // 更新状态样式
      const oldClasses = this.elements.taskStatus.className
        .split(" ")
        .filter(
          (cls) =>
            !cls.startsWith("bg-") &&
            !cls.startsWith("text-") &&
            !cls.startsWith("border-")
        );
      this.elements.taskStatus.className = [
        ...oldClasses,
        ...statusClass.split(" "),
      ].join(" ");
    }

    // 设置任务优先级
    if (this.elements.taskPriority) {
      let priorityText = "中优先级";
      let priorityClass =
        "bg-accent-yellow/20 text-accent-yellow-800 border-accent-yellow-800";

      switch (task.priority) {
        case "high":
          priorityText = "高优先级";
          priorityClass =
            "bg-accent-red/20 text-accent-red-800 border-accent-red-800";
          break;
        case "low":
          priorityText = "低优先级";
          priorityClass =
            "bg-accent-blue/20 text-accent-blue-800 border-accent-blue-800";
          break;
      }

      this.elements.taskPriority.textContent = priorityText;

      // 更新优先级样式
      const oldClasses = this.elements.taskPriority.className
        .split(" ")
        .filter(
          (cls) =>
            !cls.startsWith("bg-") &&
            !cls.startsWith("text-") &&
            !cls.startsWith("border-")
        );
      this.elements.taskPriority.className = [
        ...oldClasses,
        ...priorityClass.split(" "),
      ].join(" ");
    }

    // 更新完成按钮状态
    if (this.elements.completeButton) {
      if (task.status === "completed") {
        this.elements.completeButton.textContent = "标记为未完成";
        this.elements.completeButton.classList.remove("bg-accent-green");
        this.elements.completeButton.classList.add("bg-accent-yellow");
      } else {
        this.elements.completeButton.textContent = "标记为完成";
        this.elements.completeButton.classList.remove("bg-accent-yellow");
        this.elements.completeButton.classList.add("bg-accent-green");
      }
    }
  },

  // 渲染目标列表
  renderGoals: function (goals) {
    if (!this.elements.goalsContainer) return;

    // 清空现有内容
    this.elements.goalsContainer.innerHTML = "";

    // 如果没有目标，显示空状态
    if (!goals || goals.length === 0) {
      this.renderEmptyGoalsState();
      return;
    }

    // 渲染每个目标
    goals.forEach((goal) => {
      const goalElement = this.createGoalElement(goal);
      this.elements.goalsContainer.appendChild(goalElement);
    });

    // 添加"添加新目标"按钮
    const addGoalButton = document.createElement("button");
    addGoalButton.className =
      "pixel-button bg-primary text-white font-display py-2 px-4 text-sm flex items-center mt-4 add-goal-button";
    addGoalButton.innerHTML = `
            <span class="material-symbols-outlined text-base mr-1">add</span>
            添加新目标
        `;

    this.elements.goalsContainer.appendChild(addGoalButton);
  },

  // 创建目标元素
  createGoalElement: function (goal) {
    const goalElement = document.createElement("div");
    goalElement.className =
      "border-4 border-border-color p-4 bg-[#fafafa] shadow-pixel-sm mb-6 goal-item";
    goalElement.dataset.goalId = goal.id;

    // 计算子步骤完成进度
    const totalSubsteps = goal.substeps.length;
    const completedSubsteps = goal.substeps.filter(
      (substep) => substep.completed
    ).length;
    const progressPercent =
      totalSubsteps > 0
        ? Math.round((completedSubsteps / totalSubsteps) * 100)
        : 0;

    // 渲染标签
    const tagsHtml = goal.tags && goal.tags.length > 0 
        ? `<div class="mt-2 flex flex-wrap gap-2">
            ${goal.tags.map(tag => `
                <span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 border border-gray-300 rounded">
                    ${tag}
                </span>
            `).join('')}
           </div>`
        : '';

    // 构建目标HTML
    goalElement.innerHTML = `
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h4 class="font-display text-lg text-text-primary">${
                      goal.title
                    }</h4>
                    <p class="text-text-secondary text-xl mt-1">${
                      goal.description || "暂无描述"
                    }</p>
                    ${
                      goal.priority
                        ? `
                        <div class="mt-2">
                            <span class="inline-block px-2 py-1 text-xs font-bold ${this.getPriorityClass(
                              goal.priority
                            )}">
                                ${this.getPriorityText(goal.priority)}
                            </span>
                        </div>
                    `
                        : ""
                    }
                    ${tagsHtml}
                </div>
                <div class="flex-shrink-0 flex gap-2">
                    <button class="pixel-button-sm bg-accent-yellow text-white font-display py-1 px-2 text-xs flex items-center edit-goal-button" data-goal-id="${
                      goal.id
                    }">
                        <span class="material-symbols-outlined text-sm align-middle">edit</span>
                        编辑目标
                    </button>
                    <button class="pixel-button-sm bg-accent-red text-white font-display py-1 px-2 text-xs flex items-center delete-goal-button" data-goal-id="${
                      goal.id
                    }">
                        <span class="material-symbols-outlined text-sm align-middle">delete</span>
                        删除目标
                    </button>
                    <button class="pixel-button-sm bg-accent-blue text-white font-display py-1 px-2 text-xs flex items-center add-substep-button" data-goal-id="${
                      goal.id
                    }">
                        <span class="material-symbols-outlined text-sm align-middle">add</span>
                        添加子步骤
                    </button>
                    <button class="pixel-button-sm bg-primary text-white font-display py-1 px-2 text-xs flex items-center evaluate-priority-button" data-goal-id="${
                      goal.id
                    }">
                        <span class="material-symbols-outlined text-sm align-middle">auto_awesome</span>
                        AI评估优先级
                    </button>
                </div>
            </div>
            
            ${
              totalSubsteps > 0
                ? `
                <div class="mt-2 mb-3">
                    <div class="w-full h-2 bg-gray-200 rounded-full">
                        <div class="h-full bg-primary rounded-full" style="width: ${progressPercent}%"></div>
                    </div>
                    <p class="text-right text-xs text-gray-500 mt-1">${completedSubsteps}/${totalSubsteps} 完成</p>
                </div>
            `
                : ""
            }
            
            <div class="mt-4 space-y-3 pl-6 border-l-4 border-dashed border-border-color ml-3 substeps-container">
                ${goal.substeps
                  .map(
                    (substep) => `
                    <div class="flex items-center gap-x-4">
                        <input type="checkbox" class="substep-checkbox" data-substep-id="${
                          substep.id
                        }" data-goal-id="${goal.id}" ${
                      substep.completed ? "checked" : ""
                    }>
                        <span class="text-text-primary text-xl">${
                          substep.content
                        }</span>
                        <div class="ml-auto flex gap-2">
                            <button class="edit-substep-button text-accent-yellow" data-substep-id="${
                              substep.id
                            }" data-goal-id="${goal.id}">
                                <span class="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button class="delete-substep-button text-accent-red" data-substep-id="${
                              substep.id
                            }" data-goal-id="${goal.id}">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;

    return goalElement;
  },

  // 获取优先级文本
  getPriorityText: function (priority) {
    switch (priority) {
      case "高":
      case "high":
        return "高优先级";
      case "中":
      case "medium":
        return "中优先级";
      case "低":
      case "low":
        return "低优先级";
      default:
        return "未设置优先级";
    }
  },

  // 获取优先级样式类
  getPriorityClass: function (priority) {
    switch (priority) {
      case "高":
      case "high":
        return "bg-red-100 text-red-800 border border-red-800";
      case "中":
      case "medium":
        return "bg-yellow-100 text-yellow-800 border border-yellow-800";
      case "低":
      case "low":
        return "bg-blue-100 text-blue-800 border border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-800";
    }
  },

  // 渲染空目标状态
  renderEmptyGoalsState: function () {
    const emptyState = document.createElement("div");
    emptyState.className =
      "text-center p-6 border-4 border-dashed border-gray-300 bg-gray-50";
    emptyState.innerHTML = `
            <p class="text-lg text-gray-500 mb-4">还没有目标，添加目标来组织你的任务</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="pixel-button bg-primary text-white font-display py-2 px-4 text-sm flex items-center justify-center add-goal-button">
                    <span class="material-symbols-outlined text-base mr-1">add</span>
                    添加目标
                </button>
                <button class="pixel-button bg-accent-blue text-white font-display py-2 px-4 text-sm flex items-center justify-center ai-generate-goals-button">
                    <span class="material-symbols-outlined text-base mr-1">auto_awesome</span>
                    AI生成目标
                </button>
            </div>
        `;

    this.elements.goalsContainer.appendChild(emptyState);
  },

  // 渲染时间线记录
  renderTimeline: function (timeline) {
    if (!this.elements.timelineContainer) return;

    // 清空现有内容
    this.elements.timelineContainer.innerHTML = "";

    // 如果没有记录，显示空状态
    if (!timeline || timeline.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "text-center p-4";
      emptyState.innerHTML = '<p class="text-gray-500">还没有进度记录</p>';

      this.elements.timelineContainer.appendChild(emptyState);
      return;
    }

    // 按日期降序排序
    const sortedTimeline = [...timeline].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // 渲染每条记录
    sortedTimeline.forEach((record, index) => {
      const recordElement = document.createElement("div");
      recordElement.className = `flex items-start justify-between gap-4 ${
        index < sortedTimeline.length - 1
          ? "border-b-4 border-dashed border-border-color pb-4 mb-4"
          : ""
      }`;

      const recordDate = new Date(record.date);
      const formattedDate =
        recordDate.getFullYear() +
        "-" +
        String(recordDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(recordDate.getDate()).padStart(2, "0");

      recordElement.innerHTML = `
                <div>
                    <p class="font-display text-base text-text-primary">${formattedDate}</p>
                    <p class="text-text-secondary text-xl mt-1">${record.content} <span class="font-bold text-text-primary">(${record.hours} 小时)</span></p>
                </div>
                <button class="pixel-button-sm p-1 edit-timeline-button" data-record-id="${record.id}">
                    <span class="material-symbols-outlined text-sm">edit</span>
                </button>
            `;

      this.elements.timelineContainer.appendChild(recordElement);
    });
  },

  // 处理目标容器点击事件（事件委托）
  handleGoalsContainerClick: function (e) {
    // 添加目标按钮
    if (e.target.closest(".add-goal-button")) {
      this.openAddGoalDialog();
      return;
    }

    // AI生成目标按钮
    if (e.target.closest(".ai-generate-goals-button")) {
      this.generateGoalsWithAI();
      return;
    }

    // 编辑目标按钮
    if (e.target.closest(".edit-goal-button")) {
      const button = e.target.closest(".edit-goal-button");
      const goalId = button.dataset.goalId;

      if (goalId) {
        this.openEditGoalDialog(goalId);
      }
      return;
    }

    // 删除目标按钮
    if (e.target.closest(".delete-goal-button")) {
      const button = e.target.closest(".delete-goal-button");
      const goalId = button.dataset.goalId;

      if (goalId) {
        this.confirmDeleteGoal(goalId);
      }
      return;
    }

    // 添加子步骤按钮
    if (e.target.closest(".add-substep-button")) {
      const button = e.target.closest(".add-substep-button");
      const goalId = button.dataset.goalId;

      if (goalId) {
        this.openAddSubstepDialog(goalId);
      }
      return;
    }

    // AI评估优先级按钮
    if (e.target.closest(".evaluate-priority-button")) {
      const button = e.target.closest(".evaluate-priority-button");
      const goalId = button.dataset.goalId;

      if (goalId) {
        this.evaluateGoalPriority(goalId);
      }
      return;
    }

    // 编辑子步骤按钮
    if (e.target.closest(".edit-substep-button")) {
      const button = e.target.closest(".edit-substep-button");
      const substepId = button.dataset.substepId;
      const goalId = button.dataset.goalId;

      if (substepId && goalId) {
        this.openEditSubstepDialog(goalId, substepId);
      }
      return;
    }

    // 删除子步骤按钮
    if (e.target.closest(".delete-substep-button")) {
      const button = e.target.closest(".delete-substep-button");
      const substepId = button.dataset.substepId;
      const goalId = button.dataset.goalId;

      if (substepId && goalId) {
        this.confirmDeleteSubstep(goalId, substepId);
      }
      return;
    }

    // 子步骤复选框
    if (e.target.classList.contains("substep-checkbox")) {
      const checkbox = e.target;
      const substepId = checkbox.dataset.substepId;
      const goalId = checkbox.dataset.goalId;

      if (substepId && goalId) {
        this.updateSubstepStatus(goalId, substepId, checkbox.checked);
      }
      return;
    }
  },

  // 打开添加目标对话框
  openAddGoalDialog: function () {
    // 创建对话框元素
    const dialogElement = document.createElement("div");
    dialogElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    dialogElement.id = "add-goal-dialog";

    // 构建对话框内容
    dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-md">
                <h2 class="text-2xl font-display mb-6">添加新目标</h2>
                <form id="add-goal-form">
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="goal-title">目标标题</label>
                        <input type="text" id="goal-title" class="w-full" required placeholder="输入目标标题">
                    </div>
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="goal-description">目标描述</label>
                        <textarea id="goal-description" class="w-full h-32" placeholder="输入目标描述"></textarea>
                    </div>
                    <div class="mb-6">
                        <label class="block font-display text-lg mb-2" for="goal-tags">标签</label>
                        <input type="text" id="goal-tags" class="w-full" placeholder="输入标签，用逗号分隔">
                        <p class="text-sm text-gray-500 mt-1">多个标签请用逗号分隔，例如：重要, 工作, 紧急</p>
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancel-add-goal" class="pixel-button">取消</button>
                        <button type="submit" class="pixel-button bg-primary text-white">添加</button>
                    </div>
                </form>
            </div>
        `;

    // 将对话框添加到页面
    document.body.appendChild(dialogElement);

    // 绑定表单提交事件
    const form = document.getElementById("add-goal-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = document.getElementById("goal-title").value.trim();
      const description = document
        .getElementById("goal-description")
        .value.trim();
      const tagsString = document.getElementById("goal-tags").value.trim();
      
      // 解析标签，移除空值
      const tags = tagsString
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag !== '');

      this.addGoal({
        title,
        description,
        tags
      });

      // 关闭对话框
      document.body.removeChild(dialogElement);
    });

    // 绑定取消按钮事件
    const cancelButton = document.getElementById("cancel-add-goal");
    cancelButton.addEventListener("click", () => {
      document.body.removeChild(dialogElement);
    });

    // 绑定ESC键关闭对话框
    const escHandler = function (e) {
      if (e.key === "Escape") {
        document.body.removeChild(dialogElement);
        document.removeEventListener("keydown", escHandler);
      }
    };

    document.addEventListener("keydown", escHandler);

    // 聚焦标题输入框
    setTimeout(() => {
      document.getElementById("goal-title").focus();
    }, 100);
  },

  // 添加目标
  addGoal: function (goalData) {
    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task) return;

    // 调用数据存储模块添加目标
    const goalId = TaskPixel.DataStore.addGoalToTask(
      this.currentTaskId,
      goalData
    );

    if (goalId) {
      console.log("目标添加成功:", goalId);

      // 刷新目标列表
      this.loadTaskData();

      // 显示成功消息
      this.showSuccessMessage("目标添加成功");
    } else {
      console.error("目标添加失败");
      alert("添加目标时出错，请重试");
    }
  },

  // 打开编辑目标对话框
  openEditGoalDialog: function (goalId) {
    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task) return;

    const goal = task.goals.find((g) => g.id === goalId);
    if (!goal) return;

    // 解析已有标签
    const existingTags = goal.tags || [];
    const tagsString = existingTags.join(', ');

    // 创建对话框元素
    const dialogElement = document.createElement("div");
    dialogElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    dialogElement.id = "edit-goal-dialog";

    // 构建对话框内容
    dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-md">
                <h2 class="text-2xl font-display mb-6">编辑目标</h2>
                <form id="edit-goal-form">
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="edit-goal-title">目标标题</label>
