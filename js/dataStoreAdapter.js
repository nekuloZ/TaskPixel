/**
 * TaskPixel 数据存储适配器模块
 * 为目标管理功能提供统一接口，兼容现有 DataStore 并扩展新功能
 */

TaskPixel.DataStoreAdapter = {
  // 初始化适配器
  init: function () {
    console.log("数据存储适配器初始化完成");

    // 不在初始化时自动添加示例数据；保留 addSampleGoals() 供手动调用
  },

  // 添加示例目标数据
  addSampleGoals: function () {
    // 获取所有任务
    const tasks = TaskPixel.DataStore.getAllTasks();

    // 如果没有任务，先创建一个示例任务
    if (tasks.length === 0) {
      const newTask = {
        id: "task-" + Date.now(),
        title: "个人发展计划",
        description: "2023年个人发展和学习计划",
        status: "in_progress",
        due_date: "2023-12-31",
        goals: [],
      };

      TaskPixel.DataStore.addTask(newTask);
    }

    // 再次获取任务列表，确保有任务可用
    const updatedTasks = TaskPixel.DataStore.getAllTasks();
    if (updatedTasks.length === 0) return;

    // 使用第一个任务添加示例目标
    const targetTask = updatedTasks[0];

    // 示例目标1
    this.addGoal(targetTask.id, {
      id: "goal-" + Date.now(),
      title: "学习新编程语言",
      description: "掌握Python编程基础并完成一个小项目",
      priority: "高",
      substeps: [
        { id: "substep-1", content: "完成Python基础教程", completed: true },
        { id: "substep-2", content: "学习数据结构和算法", completed: false },
        { id: "substep-3", content: "开发一个简单应用", completed: false },
      ],
    });

    // 示例目标2
    this.addGoal(targetTask.id, {
      id: "goal-" + (Date.now() + 1),
      title: "健身计划",
      description: "每周锻炼至少3次，提高身体素质",
      priority: "中",
      substeps: [
        { id: "substep-4", content: "制定每周锻炼计划", completed: true },
        { id: "substep-5", content: "购买必要的健身器材", completed: true },
        { id: "substep-6", content: "参加一个健身课程", completed: false },
      ],
    });

    // 示例目标3
    this.addGoal(targetTask.id, {
      id: "goal-" + (Date.now() + 2),
      title: "阅读计划",
      description: "今年阅读12本书，扩展知识面",
      priority: "低",
      substeps: [
        { id: "substep-7", content: "列出想读的书单", completed: true },
        { id: "substep-8", content: "每天固定阅读时间", completed: false },
        { id: "substep-9", content: "写读书笔记和总结", completed: false },
      ],
    });

    console.log("已添加示例目标数据");
  },

  /**
   * 目标相关方法
   */

  // 获取所有目标（跨任务）
  getAllGoals: function () {
    const tasks = TaskPixel.DataStore.getAllTasks();
    const allGoals = [];

    tasks.forEach((task) => {
      if (task.goals && Array.isArray(task.goals)) {
        // 为每个目标添加所属任务的信息
        const goalsWithTaskInfo = task.goals.map((goal) => ({
          ...goal,
          taskId: task.id,
          taskTitle: task.title,
        }));
        allGoals.push(...goalsWithTaskInfo);
      }
    });

    return allGoals;
  },

  // 获取单个目标
  getGoalById: function (taskId, goalId) {
    const task = TaskPixel.DataStore.getTaskById(taskId);
    if (!task || !task.goals) return null;

    const goal = task.goals.find((g) => g.id === goalId);
    if (goal) {
      return { ...goal, taskId: task.id, taskTitle: task.title };
    }

    return null;
  },

  // 添加目标到任务（封装现有方法）
  addGoal: function (taskId, goalData) {
    return TaskPixel.DataStore.addGoalToTask(taskId, goalData);
  },

  // 更新目标（封装现有方法）
  updateGoal: function (taskId, goalId, updatedData) {
    return TaskPixel.DataStore.updateGoal(taskId, goalId, updatedData);
  },

  // 删除目标（封装现有方法）
  deleteGoal: function (taskId, goalId) {
    return TaskPixel.DataStore.deleteGoal(taskId, goalId);
  },

  /**
   * 子步骤相关方法
   */

  // 添加子步骤（封装现有方法）
  addSubstep: function (taskId, goalId, substepContent) {
    return TaskPixel.DataStore.addSubstepToGoal(taskId, goalId, substepContent);
  },

  // 更新子步骤（封装现有方法）
  updateSubstep: function (taskId, goalId, substepId, updatedContent) {
    return TaskPixel.DataStore.updateSubstep(
      taskId,
      goalId,
      substepId,
      updatedContent
    );
  },

  // 删除子步骤（封装现有方法）
  deleteSubstep: function (taskId, goalId, substepId) {
    return TaskPixel.DataStore.deleteSubstep(taskId, goalId, substepId);
  },

  // 更新子步骤状态（封装现有方法）
  updateSubstepStatus: function (taskId, goalId, substepId, completed) {
    return TaskPixel.DataStore.updateSubstepStatus(
      taskId,
      goalId,
      substepId,
      completed
    );
  },

  // 按标签筛选目标（支持前缀匹配）
  /**
   * 优先级评估相关方法
   */

  // 保存多目标优先级评估结果
  saveMultiGoalPriorityEvaluation: function (goalIds, evaluationResults) {
    let success = true;

    // 为每个目标更新优先级和原因
    goalIds.forEach((goalInfo, index) => {
      const { taskId, goalId } = goalInfo;
      const result = evaluationResults[index];

      if (result && result.priority) {
        const updated = this.updateGoal(taskId, goalId, {
          priority: result.priority,
          priority_reason: result.reason || "",
        });

        if (!updated) success = false;
      }
    });

    return success;
  },

  /**
   * 任务进度计算
   * 优先使用任务下所有 goals 的 substeps 汇总计算进度；如果没有 goals 或 substeps，则回退到 task.substeps
   * 返回 0-100 的整数百分比
   */
  getTaskProgress: function (taskId) {
    const task = TaskPixel.DataStore.getTaskById(taskId);
    if (!task) return 0;

    // 先尝试遍历所有 goals 的 substeps
    let total = 0;
    let completed = 0;

    if (task.goals && Array.isArray(task.goals) && task.goals.length > 0) {
      task.goals.forEach((goal) => {
        if (goal.substeps && Array.isArray(goal.substeps)) {
          goal.substeps.forEach((s) => {
            total += 1;
            if (s.completed) completed += 1;
          });
        }
      });
    }

    // 回退到 task.substeps
    if (total === 0 && task.substeps && Array.isArray(task.substeps)) {
      task.substeps.forEach((s) => {
        total += 1;
        if (s.completed) completed += 1;
      });
    }

    if (total === 0) return 0;

    return Math.round((completed / total) * 100);
  },
};
