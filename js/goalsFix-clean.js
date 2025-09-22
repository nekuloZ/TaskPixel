// 目标与子步骤增强脚本 - 静默版本

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(setupEnhancement, 500);
});

function setupEnhancement() {
  addGoalButton();
  setupEventListeners();
}

function addGoalButton() {
  const goalsContainer = document.querySelector(".goals-container");
  if (!goalsContainer || goalsContainer.querySelector(".add-goal-btn")) return;

  const addButton = document.createElement("button");
  addButton.className =
    "pixel-button bg-primary text-white font-display py-2 px-4 text-sm flex items-center add-goal-btn mt-6";
  addButton.innerHTML =
    '<span class="material-symbols-outlined text-base mr-2">add</span>添加新目标';

  addButton.addEventListener("click", function () {
    if (window.TaskPixel?.TaskDetail?.openAddGoalDialog) {
      TaskPixel.TaskDetail.openAddGoalDialog();
    } else {
      openAddGoalDialogFallback();
    }
  });

  goalsContainer.appendChild(addButton);
}

function setupEventListeners() {
  document.addEventListener("click", function (event) {
    if (event.target.closest(".add-substep-button")) {
      const button = event.target.closest(".add-substep-button");
      const goalId = button.dataset.goalId;

      if (goalId) {
        if (window.TaskPixel?.TaskDetail?.openAddSubstepDialog) {
          TaskPixel.TaskDetail.openAddSubstepDialog(goalId);
        } else {
          openAddSubstepDialogFallback(goalId);
        }
      }
    }

    if (event.target.closest(".edit-substep-button")) {
      const button = event.target.closest(".edit-substep-button");
      const goalId = button.dataset.goalId;
      const substepId = button.dataset.substepId;

      if (goalId && substepId) {
        if (window.TaskPixel?.TaskDetail?.openEditSubstepDialog) {
          TaskPixel.TaskDetail.openEditSubstepDialog(goalId, substepId);
        } else {
          openEditSubstepDialogFallback(goalId, substepId);
        }
      }
    }

    if (event.target.closest(".delete-substep-button")) {
      const button = event.target.closest(".delete-substep-button");
      const goalId = button.dataset.goalId;
      const substepId = button.dataset.substepId;

      if (goalId && substepId) {
        if (window.TaskPixel?.TaskDetail?.confirmDeleteSubstep) {
          TaskPixel.TaskDetail.confirmDeleteSubstep(goalId, substepId);
        } else {
          confirmDeleteSubstepFallback(goalId, substepId);
        }
      }
    }
  });
}

function openAddGoalDialogFallback() {
  const taskId =
    new URLSearchParams(window.location.search).get("id") ||
    window.currentTaskId;

  if (!taskId) {
    alert("找不到当前任务ID，无法添加目标");
    return;
  }

  const dialogElement = document.createElement("div");
  dialogElement.className =
    "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

  dialogElement.innerHTML = `
    <div class="pixel-border bg-white p-6 w-full max-w-md">
      <h2 class="text-2xl font-display mb-6">添加新目标</h2>
      <form id="add-goal-form-fallback">
        <div class="mb-4">
          <label class="block font-display text-lg mb-2" for="goal-title-fallback">目标标题</label>
          <input type="text" id="goal-title-fallback" class="w-full" required placeholder="输入目标标题">
        </div>
        <div class="mb-4">
          <label class="block font-display text-lg mb-2" for="goal-description-fallback">目标描述</label>
          <textarea id="goal-description-fallback" class="w-full h-32" placeholder="输入目标描述"></textarea>
        </div>
        <div class="flex justify-end gap-4">
          <button type="button" id="cancel-add-goal-fallback" class="pixel-button">取消</button>
          <button type="submit" class="pixel-button bg-primary text-white">添加</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(dialogElement);

  const form = document.getElementById("add-goal-form-fallback");
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("goal-title-fallback").value.trim();
    const description = document
      .getElementById("goal-description-fallback")
      .value.trim();

    if (!title) {
      alert("目标标题不能为空");
      return;
    }

    try {
      // 多种方式尝试添加目标
      let success = false;

      if (window.TaskPixel?.DataStore?.addGoalToTask) {
        const goalId = TaskPixel.DataStore.addGoalToTask(taskId, {
          title,
          description,
        });

        if (goalId) {
          success = true;
        }
      }

      // 备用方法：直接操作localStorage
      if (!success) {
        try {
          const raw = localStorage.getItem("taskpixel_data");
          if (raw) {
            const data = JSON.parse(raw);
            const task = (data.tasks || []).find((t) => t.id === taskId);

            if (task) {
              // 确保任务有goals数组
              if (!task.goals) {
                task.goals = [];
              }

              // 创建新目标
              const newGoal = {
                id:
                  "goal-" +
                  Date.now() +
                  "-" +
                  Math.random().toString(36).substr(2, 9),
                title: title,
                description: description,
                priority: "",
                priority_reason: "",
                substeps: [],
              };

              task.goals.push(newGoal);
              localStorage.setItem("taskpixel_data", JSON.stringify(data));
              success = true;
            }
          }
        } catch (e) {
          console.error("备用添加目标失败:", e);
        }
      }

      if (success) {
        document.body.removeChild(dialogElement);
        location.reload();
      } else {
        alert("添加目标失败，请检查任务数据");
      }
    } catch (e) {
      console.error("添加目标出错:", e);
      alert("添加目标出错: " + e.message);
    }
  });

  const cancelButton = document.getElementById("cancel-add-goal-fallback");
  cancelButton.addEventListener("click", function () {
    document.body.removeChild(dialogElement);
  });
}

function openAddSubstepDialogFallback(goalId) {
  // 实现添加子步骤对话框的备用版本
  // 简化实现，可根据需要扩展
}

function openEditSubstepDialogFallback(goalId, substepId) {
  // 实现编辑子步骤对话框的备用版本
  // 简化实现，可根据需要扩展
}

function confirmDeleteSubstepFallback(goalId, substepId) {
  if (confirm("确定要删除这个子步骤吗？")) {
    // 实现删除子步骤的备用版本
    // 简化实现，可根据需要扩展
  }
}
