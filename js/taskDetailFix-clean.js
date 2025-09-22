// 任务编辑功能修复脚本 - 静默版本

// 获取编辑表单元素
function getEditFormElements() {
  return {
    titleElement: document.getElementById("edit-task-title"),
    descriptionElement: document.getElementById("edit-task-description"),
    statusElement: document.getElementById("edit-task-status"),
  };
}

// 收集表单数据
function collectFormData() {
  const { titleElement, descriptionElement, statusElement } =
    getEditFormElements();

  if (!titleElement || !descriptionElement || !statusElement) {
    return null;
  }

  return {
    title: titleElement.value.trim(),
    description: descriptionElement.value.trim(),
    status: statusElement.value,
  };
}

// 更新任务数据
function updateTaskData(taskId, updated) {
  try {
    // 方法1：尝试使用DataStore
    if (
      window.TaskPixel &&
      TaskPixel.DataStore &&
      typeof TaskPixel.DataStore.updateTask === "function"
    ) {
      const updateSuccess = TaskPixel.DataStore.updateTask(taskId, updated);
      if (updateSuccess) {
        return true;
      }
    }

    // 方法2：直接修改localStorage
    const raw = localStorage.getItem("taskpixel_data");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          const taskIndex = parsed.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex !== -1) {
            Object.assign(parsed.tasks[taskIndex], updated);
            localStorage.setItem("taskpixel_data", JSON.stringify(parsed));
            return true;
          }
        }
      } catch (e) {
        // 静默处理错误
      }
    }
  } catch (error) {
    // 静默处理错误
  }

  return false;
}

// 修复编辑表单提交功能
function fixEditFormSubmit() {
  const form = document.getElementById("edit-task-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const taskId =
      new URLSearchParams(window.location.search).get("id") ||
      window.currentTaskId ||
      (window.TaskPixel && TaskPixel.TaskDetail
        ? TaskPixel.TaskDetail.currentTaskId
        : null);

    if (!taskId) {
      alert("未找到任务ID，无法保存");
      return;
    }

    const formData = collectFormData();
    if (!formData) {
      alert("表单数据不完整，请检查所有字段");
      return;
    }

    if (!formData.title) {
      alert("任务标题不能为空");
      return;
    }

    try {
      const success = updateTaskData(taskId, formData);

      if (success) {
        // 关闭对话框
        const dialog = document.getElementById("edit-task-dialog");
        if (dialog) dialog.remove();

        // 刷新页面
        location.reload();
      } else {
        alert("保存失败，请重试");
      }
    } catch (error) {
      alert("保存时出错，请重试");
    }
  });
}

// 添加编辑对话框监听器
function addEditDialogListener() {
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1 && node.id === "edit-task-dialog") {
            setTimeout(() => fixEditFormSubmit(), 100);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(addEditDialogListener, 1000);
});
