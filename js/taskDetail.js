/**
 * TaskPixel 任务详情页功能模块
 * 提供任务详情显示、目标和子步骤管理、进度记录等功能
 */

console.log("taskDetail.js: 开始加载");

// 确保 TaskPixel 命名空间存在
window.TaskPixel = window.TaskPixel || {};

// 定义任务详情模块
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
    console.log("TaskDetail init: 开始初始化");

    try {
      // 直接从URL获取任务ID，不依赖TaskPixel.Navigation
      const urlParams = new URLSearchParams(window.location.search);
      this.currentTaskId = urlParams.get("id");
      console.log("TaskDetail init: 从URL直接获取任务ID", this.currentTaskId);

      // 如果无法从URL获取，尝试从其他地方获取
      if (!this.currentTaskId) {
        // 尝试通过TaskPixel.Navigation获取
        if (
          TaskPixel.Navigation &&
          typeof TaskPixel.Navigation.getUrlParams === "function"
        ) {
          const params = TaskPixel.Navigation.getUrlParams();
          if (params && params.id) {
            this.currentTaskId = params.id;
            console.log(
              "TaskDetail init: 通过Navigation获取任务ID",
              this.currentTaskId
            );
          }
        }
      }

      // 如果仍然没有ID，尝试从localStorage中最近打开的任务中获取
      if (!this.currentTaskId) {
        try {
          const raw = localStorage.getItem("taskpixel_data");
          if (raw) {
            const data = JSON.parse(raw);
            if (data.tasks && data.tasks.length > 0) {
              // 使用第一个任务的ID
              this.currentTaskId = data.tasks[0].id;
              console.log(
                "TaskDetail init: 从localStorage获取第一个任务ID",
                this.currentTaskId
              );
            }
          }
        } catch (e) {
          console.error("TaskDetail init: 读取localStorage出错", e);
        }
      }

      if (!this.currentTaskId) {
        console.warn("TaskDetail init: 所有方法均未获取到任务ID");
        alert("未能获取任务信息，将返回主页");
        window.location.href = "index.html";
        return;
      }

      // 初始化组件
      this.cacheElements();

      // 验证必要的元素是否存在
      const criticalElements = ["taskTitle", "taskDescription", "taskProgress"];
      const missingElements = criticalElements.filter(
        (el) => !this.elements[el]
      );

      if (missingElements.length > 0) {
        console.warn(
          `TaskDetail init: 缺少关键元素: ${missingElements.join(", ")}`
        );
      }

      // 尽管缺少元素，仍然继续加载
      this.loadTaskData();
      this.bindEvents();

      console.log("TaskDetail init: 任务详情页功能模块初始化完成");
    } catch (error) {
      console.error("TaskDetail init: 初始化过程中发生错误:", error);
      this.showMessage("初始化任务详情页时出错", "error");
    }
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

    console.log("TaskDetail cacheElements: 元素缓存完成", {
      backButton: !!this.elements.backButton,
      editButton: !!this.elements.editButton,
      completeButton: !!this.elements.completeButton,
    });
  },

  // 绑定事件处理函数
  bindEvents: function () {
    console.log("TaskDetail bindEvents: 开始绑定事件");

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
        console.log("TaskDetail: 返回按钮被点击");
        TaskPixel.Navigation.navigateTo("home");
      });
    }

    // 编辑按钮事件
    if (this.elements.editButton) {
      this.elements.editButton.addEventListener("click", () => {
        console.log("TaskDetail: 编辑按钮被点击");

        // 确保当前有任务ID和任务数据
        if (!this.currentTaskId) {
          console.warn("编辑按钮点击: 当前无任务ID");
        }

        // 使用call而不是bind，确保this上下文正确
        this.openEditTaskDialog.call(this);
      });
    }

    // 完成按钮事件
    if (this.elements.completeButton) {
      this.elements.completeButton.addEventListener("click", () => {
        console.log("TaskDetail: 完成按钮被点击");
        this.handleCompleteTask.bind(this)();
      });
    }

    // 目标容器事件（事件委托）
    if (this.elements.goalsContainer) {
      this.elements.goalsContainer.addEventListener(
        "click",
        this.handleGoalsContainerClick.bind(this)
      );
    }

    console.log("TaskDetail bindEvents: 事件绑定完成");
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
      let priorityText = task.priority ? "中优先级" : "";
      let priorityClass = task.priority
        ? "bg-accent-yellow/20 text-accent-yellow-800 border-accent-yellow-800"
        : "hidden";

      if (task.priority) {
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
      }

      this.elements.taskPriority.textContent = priorityText;

      // 更新优先级样式
      const oldClasses = this.elements.taskPriority.className
        .split(" ")
        .filter(
          (cls) =>
            !cls.startsWith("bg-") &&
            !cls.startsWith("text-") &&
            !cls.startsWith("border-") &&
            cls !== "hidden"
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
                </div>
                <div class="flex-shrink-0 flex gap-2 flex-wrap justify-end">
                    <button class="pixel-button-sm bg-accent-green text-white font-display py-1 px-2 text-xs flex items-center add-substep-button" data-goal-id="${
                      goal.id
                    }">
                        <span class="material-symbols-outlined text-sm align-middle">add</span>
                        添加子步骤
                    </button>
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
      this.addGoal({
        title,
        description,
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
  // 打开添加子步骤对话框
  openAddSubstepDialog: function (goalId) {
    if (!goalId) {
      console.error("openAddSubstepDialog: 没有提供目标ID");
      this.showMessage("无法添加子步骤，目标ID不存在", "error");
      return;
    }

    // 检查目标是否存在
    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task || !task.goals) {
      console.error("openAddSubstepDialog: 找不到任务或目标数据");
      return;
    }

    const goal = task.goals.find((g) => g.id === goalId);
    if (!goal) {
      console.error(`openAddSubstepDialog: 找不到ID为 ${goalId} 的目标`);
      this.showMessage("无法添加子步骤，目标不存在", "error");
      return;
    }

    // 创建对话框元素
    const dialogElement = document.createElement("div");
    dialogElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    dialogElement.id = "add-substep-dialog";

    // 构建对话框内容
    dialogElement.innerHTML = `
      <div class="pixel-border bg-white p-6 w-full max-w-md">
        <h2 class="text-2xl font-display mb-6">添加子步骤</h2>
        <p class="mb-4 text-text-secondary">目标: ${goal.title}</p>
        <form id="add-substep-form">
          <div class="mb-4">
            <label class="block font-display text-lg mb-2" for="substep-content">子步骤内容</label>
            <input type="text" id="substep-content" class="w-full" required placeholder="输入子步骤内容">
            <input type="hidden" id="goal-id" value="${goalId}">
          </div>
          <div class="flex justify-end gap-4">
            <button type="button" id="cancel-add-substep" class="pixel-button">取消</button>
            <button type="submit" class="pixel-button bg-primary text-white">添加</button>
          </div>
        </form>
      </div>
    `;

    // 将对话框添加到页面
    document.body.appendChild(dialogElement);

    // 绑定表单提交事件
    const form = document.getElementById("add-substep-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const content = document.getElementById("substep-content").value.trim();
      const goalIdInput = document.getElementById("goal-id").value;

      if (!content) {
        this.showMessage("子步骤内容不能为空", "error");
        return;
      }

      this.addSubstep(goalIdInput, content);

      // 关闭对话框
      document.body.removeChild(dialogElement);
    });

    // 绑定取消按钮事件
    const cancelButton = document.getElementById("cancel-add-substep");
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

    // 聚焦内容输入框
    setTimeout(() => {
      document.getElementById("substep-content").focus();
    }, 100);
  },

  // 添加子步骤
  addSubstep: function (goalId, content) {
    if (!this.currentTaskId || !goalId || !content) {
      console.error("addSubstep: 参数不完整", {
        taskId: this.currentTaskId,
        goalId,
        content,
      });
      return;
    }

    try {
      // 调用数据存储模块添加子步骤
      const success = TaskPixel.DataStore.addSubstepToGoal(
        this.currentTaskId,
        goalId,
        content
      );

      if (success) {
        console.log(`成功添加子步骤到目标 ${goalId}`);
        this.loadTaskData(); // 重新加载数据以显示新添加的子步骤
        this.showMessage("子步骤已添加", "success");
      } else {
        console.error("添加子步骤失败");
        this.showMessage("添加子步骤失败", "error");
      }
    } catch (error) {
      console.error("添加子步骤时出错:", error);
      this.showMessage(
        "添加子步骤时出错: " + (error.message || "未知错误"),
        "error"
      );
    }
  },

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
                        <input type="text" id="edit-goal-title" class="w-full" required placeholder="输入目标标题" value="${
                          goal.title || ""
                        }">
                    </div>
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="edit-goal-description">目标描述</label>
                        <textarea id="edit-goal-description" class="w-full h-32" placeholder="输入目标描述">${
                          goal.description || ""
                        }</textarea>
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancel-edit-goal" class="pixel-button">取消</button>
                        <button type="submit" class="pixel-button bg-primary text-white">保存</button>
                    </div>
                </form>
            </div>
        `;

    // 添加到DOM
    document.body.appendChild(dialogElement);

    // 绑定表单提交事件
    const form = document.getElementById("edit-goal-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const updatedGoal = {
        ...goal,
        title: document.getElementById("edit-goal-title").value,
        description: document.getElementById("edit-goal-description").value,
      };

      this.updateGoal(updatedGoal);
      this.closeEditGoalDialog();
    });

    // 绑定取消按钮
    document
      .getElementById("cancel-edit-goal")
      .addEventListener("click", () => {
        this.closeEditGoalDialog();
      });
  },

  // 关闭编辑目标对话框
  closeEditGoalDialog: function () {
    const dialog = document.getElementById("edit-goal-dialog");
    if (dialog) {
      dialog.remove();
    }
  },

  // 更新目标
  updateGoal: function (updatedGoal) {
    if (!this.currentTaskId) return;

    try {
      // 调用数据存储层更新目标
      TaskPixel.DataStore.updateGoal(
        this.currentTaskId,
        updatedGoal.id,
        updatedGoal
      );

      // 重新加载任务详情
      const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
      if (task) {
        this.renderTaskDetails(task);
      }

      // 显示成功提示
      TaskPixel.UI.showToast("目标已更新", "success");
    } catch (error) {
      console.error("更新目标时出错:", error);
      TaskPixel.UI.showToast("更新目标时出错，请重试", "error");
    }
  },

  // 确认删除目标
  confirmDeleteGoal: function (goalId) {
    if (!this.currentTaskId || !goalId) return;

    if (
      confirm(
        "确定要删除这个目标吗？这将同时删除所有相关的子步骤，且无法恢复。"
      )
    ) {
      this.deleteGoal(goalId);
    }
  },

  // 删除目标
  deleteGoal: function (goalId) {
    if (!this.currentTaskId || !goalId) return;

    try {
      // 调用数据存储层删除目标
      const success = TaskPixel.DataStore.deleteGoalFromTask(
        this.currentTaskId,
        goalId
      );

      if (success) {
        // 重新加载任务详情
        const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
        if (task) {
          this.renderTaskDetails(task);
        }

        // 显示成功提示
        this.showMessage("目标已删除", "success");
      } else {
        this.showMessage("删除目标失败", "error");
      }
    } catch (error) {
      console.error("删除目标时出错:", error);
      this.showMessage("删除目标时出错，请重试", "error");
    }
  },

  // 打开编辑任务对话框
  openEditTaskDialog: function () {
    console.log("TaskDetail.openEditTaskDialog: 开始打开编辑对话框");

    // 强制确认当前任务ID是否存在
    if (!this.currentTaskId) {
      try {
        // 尝试从URL获取任务ID
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get("id");
        console.log("TaskDetail.openEditTaskDialog: 从URL获取任务ID:", urlId);

        if (urlId) {
          this.currentTaskId = urlId;
        } else {
          // 作为最后尝试，从任何可能的来源获取ID
          const reqId =
            document.querySelector(".task-id")?.dataset?.id ||
            document.querySelector("[data-task-id]")?.dataset?.taskId;

          if (reqId) {
            console.log(
              "TaskDetail.openEditTaskDialog: 从DOM元素获取任务ID:",
              reqId
            );
            this.currentTaskId = reqId;
          }
        }
      } catch (e) {
        console.error("获取任务ID出错:", e);
      }

      if (!this.currentTaskId) {
        console.warn("TaskDetail.openEditTaskDialog: 未找到任务ID");
        this.showMessage("未找到任务ID，无法编辑", "error");
        return;
      }
    }

    console.log(
      "TaskDetail.openEditTaskDialog: 使用任务ID:",
      this.currentTaskId
    );

    // 尝试多种方式获取任务数据
    let task = null;

    // 方法1: 通过DataStore
    if (
      window.TaskPixel &&
      TaskPixel.DataStore &&
      typeof TaskPixel.DataStore.getTaskById === "function"
    ) {
      task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
      console.log(
        "TaskDetail.openEditTaskDialog: 通过DataStore获取任务:",
        task ? "成功" : "失败"
      );
    }

    // 方法2: 直接从localStorage获取
    if (!task) {
      try {
        const raw = localStorage.getItem("taskpixel_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          task = (parsed.tasks || []).find((t) => t.id === this.currentTaskId);
          console.log(
            "TaskDetail.openEditTaskDialog: 直接从localStorage获取任务:",
            task ? "成功" : "失败"
          );
        }
      } catch (e) {
        console.error("从localStorage获取任务数据出错:", e);
      }
    }

    if (!task) {
      console.warn("TaskDetail.openEditTaskDialog: 未找到任务数据");
      this.showMessage("未找到任务数据，无法编辑", "error");
      return;
    }

    console.log("TaskDetail.openEditTaskDialog: 成功获取任务数据", task);

    // 创建对话框元素
    const dialogElement = document.createElement("div");
    dialogElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    dialogElement.id = "edit-task-dialog";

    // 准备状态选项
    const statusOptions = `
      <option value="todo" ${
        task.status === "todo" ? "selected" : ""
      }>待处理</option>
      <option value="in-progress" ${
        task.status === "in-progress" ? "selected" : ""
      }>进行中</option>
      <option value="completed" ${
        task.status === "completed" ? "selected" : ""
      }>已完成</option>
    `;

    dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-lg">
                <h2 class="text-2xl font-display mb-6">编辑任务</h2>
                <form id="edit-task-form">
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="edit-task-title">任务标题</label>
                        <input type="text" id="edit-task-title" class="w-full" required placeholder="输入任务标题" value="${
                          task.title || ""
                        }">
                    </div>
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="edit-task-description">任务描述</label>
                        <textarea id="edit-task-description" class="w-full h-32" placeholder="输入任务描述">${
                          task.description || ""
                        }</textarea>
                    </div>
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="edit-task-status">状态</label>
                        <select id="edit-task-status" class="w-full">
                            ${statusOptions}
                        </select>
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancel-edit-task" class="pixel-button">取消</button>
                        <button type="submit" class="pixel-button bg-primary text-white">保存</button>
                    </div>
                </form>
            </div>
        `;

    document.body.appendChild(dialogElement);

    // 确保表单元素已被正确设置 - 有时innerHTML设置可能不会保留值
    const titleInput = document.getElementById("edit-task-title");
    const descInput = document.getElementById("edit-task-description");
    const statusSelect = document.getElementById("edit-task-status");

    if (titleInput && task.title) {
      titleInput.value = task.title;
      console.log("设置标题为:", task.title);
    }

    if (descInput && task.description) {
      descInput.value = task.description;
      console.log("设置描述为:", task.description);
    }

    if (statusSelect && task.status) {
      statusSelect.value = task.status;
      console.log("设置状态为:", task.status);
    }

    // 绑定表单提交
    const form = document.getElementById("edit-task-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("TaskDetail: 编辑表单提交");

        const titleElement = document.getElementById("edit-task-title");
        const descriptionElement = document.getElementById(
          "edit-task-description"
        );
        const statusElement = document.getElementById("edit-task-status");

        if (!titleElement) {
          console.error("保存任务失败: 找不到标题输入框");
          this.showMessage("保存任务失败，请重试", "error");
          return;
        }

        // 收集所有表单数据
        const updated = {
          title: titleElement.value.trim(),
          description: descriptionElement
            ? descriptionElement.value.trim()
            : "",
          status: statusElement ? statusElement.value : "in-progress",
        };

        // 确保标题不为空
        if (!updated.title) {
          this.showMessage("任务标题不能为空", "error");
          return;
        }

        console.log("TaskDetail: 准备更新任务", {
          id: this.currentTaskId,
          data: updated,
        });

        // 首先尝试使用DataStore更新
        let updateSuccess = false;

        try {
          if (
            window.TaskPixel &&
            TaskPixel.DataStore &&
            typeof TaskPixel.DataStore.updateTask === "function"
          ) {
            updateSuccess = TaskPixel.DataStore.updateTask(
              this.currentTaskId,
              updated
            );
            console.log(
              "TaskDetail: 通过DataStore更新任务:",
              updateSuccess ? "成功" : "失败"
            );
          }

          // 如果DataStore更新失败，直接更新localStorage
          if (!updateSuccess) {
            const raw = localStorage.getItem("taskpixel_data");
            if (raw) {
              const parsed = JSON.parse(raw);
              const taskIndex = parsed.tasks.findIndex(
                (t) => t.id === this.currentTaskId
              );

              if (taskIndex !== -1) {
                // 保留其他字段，只更新提交的字段
                parsed.tasks[taskIndex] = {
                  ...parsed.tasks[taskIndex],
                  ...updated,
                };

                localStorage.setItem("taskpixel_data", JSON.stringify(parsed));
                updateSuccess = true;
                console.log(
                  "TaskDetail: 通过直接修改localStorage更新任务: 成功"
                );
              }
            }
          }

          if (updateSuccess) {
            console.log("TaskDetail: 任务更新成功");
            this.loadTaskData(); // 重新加载数据
            this.showMessage("任务已更新", "success");
            this.closeEditTaskDialog();
          } else {
            console.error("TaskDetail: 所有更新方法均失败");
            this.showMessage("保存任务失败，请重试", "error");
          }
        } catch (err) {
          console.error("保存任务时出错", err);
          this.showMessage(
            "保存任务失败：" + (err.message || "未知错误"),
            "error"
          );
        }

        this.closeEditTaskDialog();
      });
    } else {
      console.error("TaskDetail: 找不到编辑表单元素");
    }

    const cancel = document.getElementById("cancel-edit-task");
    if (cancel) {
      cancel.addEventListener("click", () => this.closeEditTaskDialog());
    }
  },

  // 关闭编辑任务对话框
  closeEditTaskDialog: function () {
    const dialog = document.getElementById("edit-task-dialog");
    if (dialog) dialog.remove();
  },

  // 显示消息提示
  showMessage: function (message, type = "info") {
    console.log(`TaskDetail 消息 [${type}]: ${message}`);

    // 首先尝试使用 TaskPixel.UI.showToast
    if (typeof TaskPixel?.UI?.showToast === "function") {
      TaskPixel.UI.showToast(message, type);
      return;
    }

    // 备用：创建简单的消息元素
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    messageElement.style.position = "fixed";
    messageElement.style.bottom = "20px";
    messageElement.style.right = "20px";
    messageElement.style.padding = "10px 20px";
    messageElement.style.borderRadius = "4px";
    messageElement.style.zIndex = "9999";
    messageElement.style.fontWeight = "bold";

    // 根据类型设置样式
    switch (type) {
      case "success":
        messageElement.style.backgroundColor = "#4CAF50";
        messageElement.style.color = "white";
        break;
      case "error":
        messageElement.style.backgroundColor = "#F44336";
        messageElement.style.color = "white";
        break;
      case "warning":
        messageElement.style.backgroundColor = "#FF9800";
        messageElement.style.color = "white";
        break;
      default:
        messageElement.style.backgroundColor = "#2196F3";
        messageElement.style.color = "white";
    }

    document.body.appendChild(messageElement);

    // 3秒后移除
    setTimeout(() => {
      if (document.body.contains(messageElement)) {
        document.body.removeChild(messageElement);
      }
    }, 3000);
  },

  // 处理AI辅助按钮点击事件
  handleAiAssist: function () {
    // 获取当前任务
    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task) return;

    // 打开AI辅助对话框
    if (
      typeof TaskPixel.AiAssist !== "undefined" &&
      TaskPixel.AiAssist.openAiAssistDialog
    ) {
      TaskPixel.AiAssist.openAiAssistDialog(task, {
        type: "taskDetail",
        callback: (result) => {
          if (result && result.success) {
            // 刷新任务详情
            this.loadTaskData();
            TaskPixel.UI.showToast("AI辅助处理完成", "success");
          }
        },
      });
    } else {
      TaskPixel.UI.showToast("AI辅助功能暂不可用", "warning");
    }
  },

  // 处理任务完成状态切换
  handleCompleteTask: function () {
    console.log("TaskDetail.handleCompleteTask: 开始处理任务完成状态");

    if (!this.currentTaskId) {
      console.warn("TaskDetail.handleCompleteTask: 未找到当前任务ID");
      this.showMessage("无法更新任务状态，任务ID不存在", "error");
      return;
    }

    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task) {
      console.warn("TaskDetail.handleCompleteTask: 未找到任务数据");
      this.showMessage("无法更新任务状态，任务不存在", "error");
      return;
    }

    // 切换任务状态
    const newStatus = task.status === "completed" ? "in-progress" : "completed";

    // 准备更新任务对象
    const updatedTask = {
      ...task,
      status: newStatus,
    };

    // 如果是标记为已完成，设置进度为100%
    if (newStatus === "completed") {
      updatedTask.progress = 100;
    }
    // 如果是标记为未完成，重新计算基于子步骤的进度
    else {
      // 计算总进度
      let totalSubsteps = 0;
      let completedSubsteps = 0;

      if (task.goals && task.goals.length > 0) {
        task.goals.forEach((goal) => {
          if (goal.substeps && goal.substeps.length > 0) {
            totalSubsteps += goal.substeps.length;
            completedSubsteps += goal.substeps.filter(
              (s) => s.completed
            ).length;
          }
        });
      }

      // 计算进度百分比
      if (totalSubsteps > 0) {
        updatedTask.progress = Math.round(
          (completedSubsteps / totalSubsteps) * 100
        );
      } else {
        updatedTask.progress = 0; // 没有子步骤时，进度重置为0
      }

      console.log(
        `TaskDetail.handleCompleteTask: 任务标记为未完成，重新计算进度=${updatedTask.progress}%`
      );
    }

    console.log(
      `TaskDetail.handleCompleteTask: 将任务状态从 ${task.status} 更改为 ${newStatus}`
    );

    // 更新任务
    try {
      const success = TaskPixel.DataStore.updateTask(
        this.currentTaskId,
        updatedTask
      );

      if (success) {
        // 更新按钮文本
        if (this.elements.completeButton) {
          if (newStatus === "completed") {
            this.elements.completeButton.innerHTML = `
              <span class="material-symbols-outlined align-middle mr-2">replay</span>
              标记为未完成
            `;
            this.elements.completeButton.classList.add("bg-accent-yellow");
            this.elements.completeButton.classList.remove("bg-accent-green");
          } else {
            this.elements.completeButton.innerHTML = `
              <span class="material-symbols-outlined align-middle mr-2">check_circle</span>
              标记为完成
            `;
            this.elements.completeButton.classList.add("bg-accent-green");
            this.elements.completeButton.classList.remove("bg-accent-yellow");
          }
        }

        // 刷新任务详情
        this.loadTaskData();

        // 显示成功消息
        const message =
          newStatus === "completed" ? "任务已标记为完成" : "任务已标记为进行中";
        this.showMessage(message, "success");

        console.log(
          `TaskDetail.handleCompleteTask: 成功更新任务状态为 ${newStatus}`
        );
      } else {
        console.error("TaskDetail.handleCompleteTask: 更新任务失败");
        this.showMessage("更新任务状态失败，请重试", "error");
      }
    } catch (error) {
      console.error("更新任务状态时出错:", error);
      this.showMessage(
        "更新任务状态时出错: " + (error.message || "未知错误"),
        "error"
      );
    }
  },

  // 处理时间记录表单提交
  handleTimelineSubmit: function (e) {
    e.preventDefault();

    const content = this.elements.timelineContent.value.trim();
    const hoursStr = this.elements.timelineHours.value.trim();

    if (!content || !hoursStr) {
      TaskPixel.UI.showToast("请填写工作内容和时间", "warning");
      return;
    }

    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      TaskPixel.UI.showToast("请输入有效的时间（大于0）", "warning");
      return;
    }

    // 创建时间记录
    const timelineEntry = {
      id: TaskPixel.Utils.generateId(),
      date: new Date().toISOString(),
      content: content,
      hours: hours,
    };

    try {
      // 添加时间记录
      TaskPixel.DataStore.addTimelineToTask(this.currentTaskId, timelineEntry);

      // 清空表单
      this.elements.timelineContent.value = "";
      this.elements.timelineHours.value = "";

      // 重新加载任务数据
      this.loadTaskData();

      // 发布事件
      TaskPixel.EventBus.emit("timeline:added", {
        taskId: this.currentTaskId,
        timelineEntry: timelineEntry,
      });

      // 显示成功消息
      TaskPixel.UI.showToast("进度记录已添加", "success");
    } catch (error) {
      console.error("添加进度记录时出错:", error);
      TaskPixel.UI.showToast("添加进度记录时出错，请重试", "error");
    }
  },

  // 响应任务更新事件
  handleTaskUpdated: function (data) {
    // 检查是否是当前显示的任务
    if (data && data.taskId === this.currentTaskId) {
      // 重新加载任务数据
      this.loadTaskData();
    }
  },

  // 响应目标添加事件
  handleGoalAdded: function (data) {
    // 检查是否是当前显示的任务
    if (data && data.taskId === this.currentTaskId) {
      // 重新加载任务数据
      this.loadTaskData();
    }
  },

  // 响应子步骤添加事件
  handleSubstepAdded: function (data) {
    // 检查是否是当前显示的任务
    if (data && data.taskId === this.currentTaskId) {
      // 重新加载任务数据
      this.loadTaskData();
    }
  },

  // 响应子步骤更新事件
  handleSubstepUpdated: function (data) {
    // 检查是否是当前显示的任务
    if (data && data.taskId === this.currentTaskId) {
      // 重新加载任务数据
      this.loadTaskData();

      // 如果子步骤完成状态改变，可能需要更新任务进度
      if (data.completed !== undefined) {
        this.updateTaskProgress();
      }
    }
  },

  // 响应时间记录添加事件
  handleTimelineAdded: function (data) {
    // 检查是否是当前显示的任务
    if (data && data.taskId === this.currentTaskId) {
      // 重新加载时间线数据
      const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
      if (task) {
        this.renderTimeline(task.timeline);
      }
    }
  },

  // 更新任务进度（基于子步骤完成情况）
  updateTaskProgress: function () {
    if (!this.currentTaskId) return;

    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task) return;

    // 计算总进度
    let totalSubsteps = 0;
    let completedSubsteps = 0;

    task.goals.forEach((goal) => {
      if (goal.substeps && goal.substeps.length > 0) {
        totalSubsteps += goal.substeps.length;
        completedSubsteps += goal.substeps.filter((s) => s.completed).length;
      }
    });

    // 计算进度百分比
    let progress = 0;
    if (totalSubsteps > 0) {
      progress = Math.round((completedSubsteps / totalSubsteps) * 100);
    }

    // 更新任务进度
    const updatedTask = {
      ...task,
      progress: progress,
    };

    // 如果所有子步骤都完成了，将任务标记为已完成
    if (totalSubsteps > 0 && completedSubsteps === totalSubsteps) {
      updatedTask.status = "completed";
    }

    // 保存更新
    try {
      TaskPixel.DataStore.updateTask(this.currentTaskId, updatedTask);
      this.renderTaskDetails(updatedTask);
    } catch (error) {
      console.error("更新任务进度时出错:", error);
    }
  },

  // 打开编辑子步骤对话框
  openEditSubstepDialog: function (goalId, substepId) {
    if (!this.currentTaskId || !goalId || !substepId) {
      console.error("openEditSubstepDialog: 参数不完整", {
        taskId: this.currentTaskId,
        goalId,
        substepId,
      });
      return;
    }

    const task = TaskPixel.DataStore.getTaskById(this.currentTaskId);
    if (!task || !task.goals) return;

    const goal = task.goals.find((g) => g.id === goalId);
    if (!goal || !goal.substeps) return;

    const substep = goal.substeps.find((s) => s.id === substepId);
    if (!substep) return;

    // 创建对话框元素
    const dialogElement = document.createElement("div");
    dialogElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    dialogElement.id = "edit-substep-dialog";

    // 构建对话框内容
    dialogElement.innerHTML = `
      <div class="pixel-border bg-white p-6 w-full max-w-md">
        <h2 class="text-2xl font-display mb-6">编辑子步骤</h2>
        <p class="mb-4 text-text-secondary">目标: ${goal.title}</p>
        <form id="edit-substep-form">
          <div class="mb-4">
            <label class="block font-display text-lg mb-2" for="edit-substep-content">子步骤内容</label>
            <input type="text" id="edit-substep-content" class="w-full" required placeholder="输入子步骤内容" value="${
              substep.content || ""
            }">
            <input type="hidden" id="edit-goal-id" value="${goalId}">
            <input type="hidden" id="edit-substep-id" value="${substepId}">
          </div>
          <div class="flex justify-end gap-4">
            <button type="button" id="cancel-edit-substep" class="pixel-button">取消</button>
            <button type="submit" class="pixel-button bg-primary text-white">保存</button>
          </div>
        </form>
      </div>
    `;

    // 将对话框添加到页面
    document.body.appendChild(dialogElement);

    // 绑定表单提交事件
    const form = document.getElementById("edit-substep-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const content = document
        .getElementById("edit-substep-content")
        .value.trim();
      const goalIdInput = document.getElementById("edit-goal-id").value;
      const substepIdInput = document.getElementById("edit-substep-id").value;

      if (!content) {
        this.showMessage("子步骤内容不能为空", "error");
        return;
      }

      this.updateSubstep(goalIdInput, substepIdInput, content);

      // 关闭对话框
      document.body.removeChild(dialogElement);
    });

    // 绑定取消按钮事件
    const cancelButton = document.getElementById("cancel-edit-substep");
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

    // 聚焦内容输入框
    setTimeout(() => {
      document.getElementById("edit-substep-content").focus();
    }, 100);
  },

  // 编辑子步骤
  updateSubstep: function (goalId, substepId, content) {
    if (!this.currentTaskId || !goalId || !substepId || !content) {
      console.error("updateSubstep: 参数不完整");
      return;
    }

    try {
      // 调用数据存储模块更新子步骤
      const success = TaskPixel.DataStore.updateSubstep(
        this.currentTaskId,
        goalId,
        substepId,
        content
      );

      if (success) {
        console.log(`成功更新子步骤 ${substepId}`);
        this.loadTaskData(); // 重新加载数据以显示更新的子步骤
        this.showMessage("子步骤已更新", "success");
      } else {
        console.error("更新子步骤失败");
        this.showMessage("更新子步骤失败", "error");
      }
    } catch (error) {
      console.error("更新子步骤时出错:", error);
      this.showMessage(
        "更新子步骤时出错: " + (error.message || "未知错误"),
        "error"
      );
    }
  },

  // 确认删除子步骤
  confirmDeleteSubstep: function (goalId, substepId) {
    if (!this.currentTaskId || !goalId || !substepId) {
      console.error("confirmDeleteSubstep: 参数不完整");
      return;
    }

    if (confirm("确定要删除这个子步骤吗？此操作不可撤销。")) {
      this.deleteSubstep(goalId, substepId);
    }
  },

  // 删除子步骤
  deleteSubstep: function (goalId, substepId) {
    if (!this.currentTaskId || !goalId || !substepId) return;

    try {
      // 调用数据存储模块删除子步骤
      const success = TaskPixel.DataStore.deleteSubstep(
        this.currentTaskId,
        goalId,
        substepId
      );

      if (success) {
        console.log(`成功删除子步骤 ${substepId}`);
        this.loadTaskData(); // 重新加载数据
        this.showMessage("子步骤已删除", "success");

        // 更新任务进度
        this.updateTaskProgress();
      } else {
        console.error("删除子步骤失败");
        this.showMessage("删除子步骤失败", "error");
      }
    } catch (error) {
      console.error("删除子步骤时出错:", error);
      this.showMessage(
        "删除子步骤时出错: " + (error.message || "未知错误"),
        "error"
      );
    }
  },

  // 更新子步骤状态
  updateSubstepStatus: function (goalId, substepId, completed) {
    if (!this.currentTaskId || !goalId || !substepId) return;

    try {
      // 调用数据存储模块更新子步骤状态
      TaskPixel.DataStore.updateSubstepStatus(
        this.currentTaskId,
        goalId,
        substepId,
        completed
      );

      // 重新加载任务数据以更新UI
      this.loadTaskData();

      // 更新任务进度
      this.updateTaskProgress();
    } catch (error) {
      console.error("更新子步骤状态时出错:", error);
      this.showMessage("更新子步骤状态失败", "error");
    }
  },

  // 显示成功消息
  showSuccessMessage: function (message) {
    if (typeof TaskPixel.UI !== "undefined" && TaskPixel.UI.showToast) {
      TaskPixel.UI.showToast(message, "success");
    } else {
      alert(message);
    }
  },
};

console.log("taskDetail.js: TaskPixel.TaskDetail 已定义");
