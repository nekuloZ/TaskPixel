/**
 * TaskPixel 目标列表页功能模块
 * 提供目标展示、标签筛选、排序和全局优先级评估功能
 */

TaskPixel.Goals = {
  // 当前显示的目标
  currentGoals: [],

  // 多目标评估选中的目标
  selectedGoalsForEvaluation: [],

  // 当前问卷和评估目标
  currentQuestionnaire: null,
  currentEvaluationGoals: null,

  // DOM元素引用
  elements: {
    goalsContainer: null,
    emptyGoalsMessage: null,
    sortSelect: null,
    aiPriorityButton: null,
    questionnaireDialog: null,
    questionnaireContainer: null,
    submitQuestionnaireButton: null,
    cancelQuestionnaireButton: null,
    evaluateSelectedGoalsButton: null,
  },

  // 初始化目标列表页功能
  init: function () {
    // 初始化适配器
    if (
      TaskPixel.DataStoreAdapter &&
      typeof TaskPixel.DataStoreAdapter.init === "function"
    ) {
      TaskPixel.DataStoreAdapter.init();
    }

    this.cacheElements();
    this.loadAllGoals();
    this.bindEvents();
    console.log("目标列表页功能模块初始化完成");
  },

  // 缓存DOM元素引用
  cacheElements: function () {
    this.elements.goalsContainer = document.getElementById("goals-container");
    this.elements.emptyGoalsMessage = document.getElementById("empty-goals");
    this.elements.sortSelect = document.getElementById("sort-select");
    this.elements.aiPriorityButton =
      document.getElementById("ai-priority-button");
    this.elements.questionnaireDialog = document.getElementById(
      "questionnaire-dialog"
    );
    this.elements.questionnaireContainer = document.getElementById(
      "questionnaire-container"
    );
    this.elements.submitQuestionnaireButton = document.getElementById(
      "submit-questionnaire"
    );
    this.elements.cancelQuestionnaireButton = document.getElementById(
      "cancel-questionnaire"
    );
    this.elements.evaluateSelectedGoalsButton = document.getElementById(
      "evaluate-selected-goals"
    );
  },

  // 绑定事件处理程序
  bindEvents: function () {
    // 排序下拉框事件
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener("change", () => {
        this.sortGoals(this.elements.sortSelect.value);
      });
    }

    // 优先级评估按钮事件
    if (this.elements.aiPriorityButton) {
      this.elements.aiPriorityButton.addEventListener("click", () => {
        this.evaluateSelectedGoals();
      });
    }

    // 取消问卷按钮事件
    if (this.elements.cancelQuestionnaireButton) {
      this.elements.cancelQuestionnaireButton.addEventListener("click", () => {
        this.hideQuestionnaireDialog();
      });
    }

    // 提交问卷按钮事件
    if (this.elements.submitQuestionnaireButton) {
      this.elements.submitQuestionnaireButton.addEventListener("click", () => {
        this.submitQuestionnaire();
      });
    }

    // 监听数据变化事件
    TaskPixel.EventBus.on("goal:added", this.handleGoalChanged.bind(this));
    TaskPixel.EventBus.on("goal:updated", this.handleGoalChanged.bind(this));
    TaskPixel.EventBus.on("goal:deleted", this.handleGoalChanged.bind(this));
  },

  // 处理目标变化事件
  handleGoalChanged: function () {
    this.loadAllGoals();
  },

  // 加载所有目标
  loadAllGoals: function () {
    // 使用适配器获取所有目标
    this.currentGoals = TaskPixel.DataStoreAdapter.getAllGoals();

    // 应用排序
    this.sortGoals(
      this.elements.sortSelect ? this.elements.sortSelect.value : "priority"
    );

    // 渲染目标
    this.renderGoals();
  },

  // 排序目标
  sortGoals: function (sortBy) {
    if (!this.currentGoals) return;

    switch (sortBy) {
      case "priority":
        // 按优先级排序：高 > 中 > 低
        this.currentGoals.sort((a, b) => {
          const priorityOrder = { 高: 3, 中: 2, 低: 1, "": 0 };
          return (
            priorityOrder[b.priority || ""] - priorityOrder[a.priority || ""]
          );
        });
        break;

      case "alpha":
        // 按标题字母顺序排序
        this.currentGoals.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );
        break;

      case "task":
        // 按任务分组排序
        this.currentGoals.sort((a, b) =>
          (a.taskTitle || "").localeCompare(b.taskTitle || "")
        );
        break;
    }

    this.renderGoals();
  },

  // 渲染目标
  renderGoals: function () {
    if (!this.elements.goalsContainer) return;

    this.elements.goalsContainer.innerHTML = "";

    if (!this.currentGoals || this.currentGoals.length === 0) {
      // 显示空状态
      if (this.elements.emptyGoalsMessage) {
        this.elements.emptyGoalsMessage.classList.remove("hidden");
      }
      return;
    }

    // 隐藏空状态
    if (this.elements.emptyGoalsMessage) {
      this.elements.emptyGoalsMessage.classList.add("hidden");
    }

    // 渲染每个目标
    this.currentGoals.forEach((goal) => {
      const goalElement = this.createGoalElement(goal);
      this.elements.goalsContainer.appendChild(goalElement);
    });
  },

  // 创建目标元素
  createGoalElement: function (goal) {
    const goalCard = document.createElement("div");
    goalCard.className = "pixel-border bg-white p-4";
    goalCard.dataset.goalId = goal.id;
    goalCard.dataset.taskId = goal.taskId;

    // 优先级标签
    const priorityClass = {
      高: "bg-red-100 text-red-800",
      中: "bg-yellow-100 text-yellow-800",
      低: "bg-green-100 text-green-800",
    };

    const priorityLabel = goal.priority
      ? `<span class="px-2 py-1 text-xs ${
          priorityClass[goal.priority] || ""
        } rounded-full mr-2">${goal.priority}</span>`
      : "";

    // 任务标签
    const taskLabel = goal.taskTitle
      ? `<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">${goal.taskTitle}</span>`
      : "";

    // 子步骤列表
    let substepsHtml = "";
    if (goal.substeps && goal.substeps.length > 0) {
      substepsHtml = '<ul class="mt-2 text-sm space-y-1">';
      goal.substeps.forEach((substep) => {
        const checkedClass = substep.completed
          ? "line-through text-gray-500"
          : "";
        substepsHtml += `<li class="${checkedClass}">• ${substep.content}</li>`;
      });
      substepsHtml += "</ul>";
    }

    // 优先级原因
    const reasonHtml = goal.priority_reason
      ? `<p class="text-sm text-gray-600 mt-2">${goal.priority_reason}</p>`
      : "";

    goalCard.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-display text-lg">${goal.title}</h3>
        <div class="flex gap-1">
          ${priorityLabel}
          ${taskLabel}
        </div>
      </div>
      <p class="text-sm text-gray-700">${goal.description || ""}</p>
      ${substepsHtml}
      ${reasonHtml}
      <div class="flex justify-between mt-3 pt-2 border-t border-gray-200">
        <a href="task_detail.html?id=${
          goal.taskId
        }" class="pixel-button text-xs py-1 px-2">查看任务</a>
        <button class="goal-select-button pixel-button text-xs py-1 px-2 ${
          this.isGoalSelectedForEvaluation(goal) ? "bg-primary text-white" : ""
        }" data-goal-id="${goal.id}" data-task-id="${goal.taskId}">
          ${this.isGoalSelectedForEvaluation(goal) ? "已选择" : "选择"}
        </button>
      </div>
    `;

    // 绑定选择按钮事件
    const selectButton = goalCard.querySelector(".goal-select-button");
    if (selectButton) {
      selectButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleGoalSelection(goal);
      });
    }

    return goalCard;
  },

  // 检查目标是否已选择用于评估
  isGoalSelectedForEvaluation: function (goal) {
    return this.selectedGoalsForEvaluation.some(
      (selected) =>
        selected.goalId === goal.id && selected.taskId === goal.taskId
    );
  },

  // 切换目标选择状态
  toggleGoalSelection: function (goal) {
    const index = this.selectedGoalsForEvaluation.findIndex(
      (selected) =>
        selected.goalId === goal.id && selected.taskId === goal.taskId
    );

    if (index === -1) {
      // 添加到选择列表
      this.selectedGoalsForEvaluation.push({
        goalId: goal.id,
        taskId: goal.taskId,
        title: goal.title,
        description: goal.description,
      });
    } else {
      // 从选择列表移除
      this.selectedGoalsForEvaluation.splice(index, 1);
    }

    // 更新界面
    this.renderGoals();
    this.updatePriorityButtonState();
  },

  // 更新优先级按钮状态
  updatePriorityButtonState: function () {
    if (!this.elements.aiPriorityButton) return;

    if (this.selectedGoalsForEvaluation.length >= 2) {
      this.elements.aiPriorityButton.disabled = false;
      this.elements.aiPriorityButton.classList.remove("opacity-50");
      this.elements.aiPriorityButton.textContent = `评估 ${this.selectedGoalsForEvaluation.length} 个目标`;
    } else {
      this.elements.aiPriorityButton.disabled = true;
      this.elements.aiPriorityButton.classList.add("opacity-50");
      this.elements.aiPriorityButton.textContent = "选择至少2个目标";
    }
  },

  // 评估选中的目标
  evaluateSelectedGoals: function () {
    if (this.selectedGoalsForEvaluation.length < 2) {
      alert("请选择至少2个目标进行评估");
      return;
    }

    // 开始评估流程
    this.startPriorityEvaluation();
  },

  // 开始优先级评估
  startPriorityEvaluation: async function () {
    if (this.selectedGoalsForEvaluation.length < 2) {
      alert("请选择至少2个目标进行评估");
      return;
    }

    this.showLoadingMessage("正在生成评估问卷...");

    try {
      // 获取完整的目标对象
      const goalsToEvaluate = this.selectedGoalsForEvaluation.map(
        (selected) => {
          const fullGoal = this.currentGoals.find(
            (goal) =>
              goal.id === selected.goalId && goal.taskId === selected.taskId
          );
          return fullGoal || selected;
        }
      );

      // 生成问卷
      const questionnaire =
        await TaskPixel.AI.generateMultiGoalPriorityQuestionnaire(
          goalsToEvaluate
        );

      // 隐藏加载信息
      this.hideLoadingMessage();

      // 显示问卷
      this.showQuestionnaireDialog(questionnaire, goalsToEvaluate);
    } catch (error) {
      console.error("生成问卷出错:", error);
      this.hideLoadingMessage();
      alert("生成问卷时出错，请稍后重试");
    }
  },

  // 显示加载信息
  showLoadingMessage: function (message) {
    const loadingElement = document.createElement("div");
    loadingElement.id = "loading-message";
    loadingElement.className =
      "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    loadingElement.innerHTML = `
      <div class="pixel-border bg-white p-6">
        <div class="flex items-center">
          <div class="loading-spinner mr-3"></div>
          <p>${message}</p>
        </div>
      </div>
    `;
    document.body.appendChild(loadingElement);
  },

  // 隐藏加载信息
  hideLoadingMessage: function () {
    const loadingElement = document.getElementById("loading-message");
    if (loadingElement) {
      loadingElement.remove();
    }
  },

  // 显示问卷对话框
  showQuestionnaireDialog: function (questionnaire, goals) {
    if (
      !this.elements.questionnaireDialog ||
      !this.elements.questionnaireContainer
    ) {
      console.error("问卷对话框元素不存在");
      return;
    }

    // 保存当前问卷和目标，用于后续提交
    this.currentQuestionnaire = questionnaire;
    this.currentEvaluationGoals = goals;

    // 渲染问卷内容
    this.elements.questionnaireContainer.innerHTML = "";

    // 目标列表
    const goalsList = document.createElement("div");
    goalsList.className = "mb-6 p-3 bg-gray-50 border-2 border-gray-200";
    goalsList.innerHTML = `
      <h3 class="font-display text-lg mb-2">评估的目标</h3>
      <ol class="list-decimal pl-5">
        ${goals.map((goal) => `<li>${goal.title}</li>`).join("")}
      </ol>
    `;
    this.elements.questionnaireContainer.appendChild(goalsList);

    // 问题列表
    if (questionnaire && questionnaire.questions) {
      questionnaire.questions.forEach((question) => {
        const questionElement = document.createElement("div");
        questionElement.className = "mb-6";
        questionElement.innerHTML = `
          <h3 class="font-display text-lg mb-3">${question.id}. ${
          question.text
        }</h3>
          <div class="space-y-3 options-container" data-question-id="${
            question.id
          }">
            ${question.options
              .map(
                (option) => `
                <label class="flex items-start p-3 border-2 border-gray-200 hover:border-primary cursor-pointer">
                  <input type="radio" name="${question.id}" value="${option.id}" class="mt-0.5 mr-3">
                  <div>
                    <p>${option.text}</p>
                  </div>
                </label>
              `
              )
              .join("")}
          </div>
        `;
        this.elements.questionnaireContainer.appendChild(questionElement);
      });
    }

    // 显示对话框
    this.elements.questionnaireDialog.classList.remove("hidden");
  },

  // 隐藏问卷对话框
  hideQuestionnaireDialog: function () {
    if (!this.elements.questionnaireDialog) return;
    this.elements.questionnaireDialog.classList.add("hidden");

    // 清除当前问卷和目标
    this.currentQuestionnaire = null;
    this.currentEvaluationGoals = null;
  },

  // 提交问卷
  submitQuestionnaire: async function () {
    if (!this.currentQuestionnaire || !this.currentEvaluationGoals) {
      alert("问卷数据不完整，请重试");
      return;
    }

    // 收集用户回答
    const answers = {};
    const questions = this.currentQuestionnaire.questions || [];

    // 验证所有问题都已回答
    let allAnswered = true;

    questions.forEach((question) => {
      const selectedOption = document.querySelector(
        `input[name="${question.id}"]:checked`
      );
      if (selectedOption) {
        answers[question.id] = selectedOption.value;
      } else {
        allAnswered = false;
      }
    });

    if (!allAnswered) {
      alert("请回答所有问题");
      return;
    }

    this.hideQuestionnaireDialog();
    this.showLoadingMessage("正在分析评估结果...");

    try {
      // 评估目标优先级
      const evaluationResults = await TaskPixel.AI.evaluateMultipleGoals(
        this.currentEvaluationGoals,
        answers
      );

      // 保存评估结果
      const goalIds = this.selectedGoalsForEvaluation.map((goal) => ({
        taskId: goal.taskId,
        goalId: goal.goalId,
      }));

      const saved = TaskPixel.DataStoreAdapter.saveMultiGoalPriorityEvaluation(
        goalIds,
        evaluationResults
      );

      // 隐藏加载信息
      this.hideLoadingMessage();

      if (saved) {
        // 刷新目标列表
        this.loadAllGoals();
        // 清除选择
        this.selectedGoalsForEvaluation = [];
        this.updatePriorityButtonState();

        // 显示成功信息
        alert("优先级评估已完成并保存");
      } else {
        alert("保存评估结果时出错，请重试");
      }
    } catch (error) {
      console.error("评估优先级出错:", error);
      this.hideLoadingMessage();
      alert("评估优先级时出错，请稍后重试");
    }
  },
};
