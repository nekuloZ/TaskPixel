// 进度计算修复脚本 - 静默版本

// 应用进度计算修复
function applyProgressFix() {
  if (!window.TaskPixel || !TaskPixel.TaskDetail) {
    return;
  }

  // 增强完成按钮功能
  enhanceCompleteButtonFunction();

  // 增强任务进度计算功能
  enhanceTaskProgressCalculation();
}

// 增强完成按钮功能
function enhanceCompleteButtonFunction() {
  const completeButton = document.querySelector(".complete-button");
  if (!completeButton) return;

  completeButton.addEventListener("click", function (e) {
    e.preventDefault();

    const taskId =
      new URLSearchParams(window.location.search).get("id") ||
      window.currentTaskId;
    if (!taskId) return;

    try {
      const raw = localStorage.getItem("taskpixel_data");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const task = (parsed.tasks || []).find((t) => t.id === taskId);
      if (!task) return;

      // 切换任务完成状态
      if (task.status === "completed") {
        task.status = "in-progress";
        // 重新计算进度基于目标完成情况
        task.progress = calculateProgressFromGoals(task.goals || []);
      } else {
        task.status = "completed";
        task.progress = 100;
      }

      localStorage.setItem("taskpixel_data", JSON.stringify(parsed));
      location.reload();
    } catch (e) {
      // 静默处理错误
    }
  });
}

// 从目标完成情况计算进度
function calculateProgressFromGoals(goals) {
  if (!goals || goals.length === 0) return 0;

  let totalSubsteps = 0;
  let completedSubsteps = 0;

  goals.forEach((goal) => {
    if (goal.substeps && Array.isArray(goal.substeps)) {
      totalSubsteps += goal.substeps.length;
      completedSubsteps += goal.substeps.filter(
        (substep) => substep.completed
      ).length;
    }
  });

  return totalSubsteps > 0
    ? Math.round((completedSubsteps / totalSubsteps) * 100)
    : 0;
}

// 增强任务进度计算功能
function enhanceTaskProgressCalculation() {
  // 重写TaskDetail的进度计算逻辑
  if (
    TaskPixel.TaskDetail &&
    typeof TaskPixel.TaskDetail.updateTaskProgress === "function"
  ) {
    TaskPixel.TaskDetail.updateTaskProgress = function (taskId) {
      try {
        const task = TaskPixel.DataStore.getTaskById(taskId);
        if (!task) return;

        // 根据目标完成情况计算进度
        const newProgress = calculateProgressFromGoals(task.goals || []);

        // 更新任务进度
        TaskPixel.DataStore.updateTask(taskId, { progress: newProgress });

        // 更新UI显示
        const progressElement = document.querySelector(".task-progress");
        if (progressElement) {
          progressElement.textContent = `进度: ${newProgress}%`;
        }

        const progressBar = document.querySelector(".progress-fill");
        if (progressBar) {
          progressBar.style.width = `${newProgress}%`;
        }
      } catch (error) {
        // 静默处理错误
      }
    };
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(applyProgressFix, 1500);
});
