/**
 * TaskPixel 任务创建模块
 * 提供新任务创建对话框、表单验证和数据保存功能
 */

TaskPixel.TaskCreation = {
  // DOM元素引用
  elements: {
    createTaskButton: null,
    taskDialog: null,
    taskForm: null,
    taskTitleInput: null,
    taskDescriptionInput: null,
    createButton: null,
    cancelButton: null,
  },

  // 当前编辑的任务ID（如果是编辑模式）
  currentEditingTaskId: null,

  // 初始化任务创建模块
  init: function () {
    this.cacheElements();
    this.bindEvents();
    console.log("任务创建模块初始化完成");
  },

  // 缓存DOM元素引用
  cacheElements: function () {
    this.elements.createTaskButton = document.querySelector(
      ".create-task-button"
    );
    this.elements.taskDialog = document.getElementById("task-dialog");
    this.elements.taskForm = document.getElementById("task-form");
    this.elements.taskTitleInput = document.getElementById("task-title");
    this.elements.taskDescriptionInput =
      document.getElementById("task-description");
    this.elements.createButton = document.querySelector(".create-task-confirm");
    this.elements.cancelButton = document.querySelector(".create-task-cancel");
  },

  // 绑定事件处理函数
  bindEvents: function () {
    // 确保元素存在再绑定事件
    if (this.elements.createTaskButton) {
      this.elements.createTaskButton.addEventListener("click", () => {
        console.log("点击新任务按钮");
        this.createNewTask(); // 使用专门的创建方法
      });
    }

    if (this.elements.taskForm) {
      this.elements.taskForm.addEventListener(
        "submit",
        this.handleSubmit.bind(this)
      );
    }

    if (this.elements.cancelButton) {
      this.elements.cancelButton.addEventListener(
        "click",
        this.closeDialog.bind(this)
      );
    }

    // 监听ESC键关闭对话框
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.elements.taskDialog &&
        this.elements.taskDialog.classList.contains("active")
      ) {
        this.closeDialog();
      }
    });
  },

  // 创建任务对话框的HTML结构
  createDialogHTML: function () {
    // 如果页面中没有任务对话框元素，则创建一个
    if (!this.elements.taskDialog) {
      const dialogHTML = `
                <div id="task-dialog" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 hidden">
                    <div class="pixel-border bg-white p-6 w-full max-w-md">
                        <h2 class="text-2xl font-display mb-6">创建新任务</h2>
                        <form id="task-form">
                            <div class="mb-4">
                                <label class="block font-display text-lg mb-2" for="task-title">任务标题</label>
                                <input type="text" id="task-title" class="w-full" required placeholder="输入任务标题">
                            </div>
                            <div class="mb-6">
                                <label class="block font-display text-lg mb-2" for="task-description">任务描述</label>
                                <textarea id="task-description" class="w-full h-32" placeholder="输入任务描述"></textarea>
                            </div>
                            <div class="flex justify-end gap-4">
                                <button type="button" class="pixel-button create-task-cancel">取消</button>
                                <button type="submit" class="pixel-button bg-primary text-white create-task-confirm">创建</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

      // 将对话框HTML添加到页面
      document.body.insertAdjacentHTML("beforeend", dialogHTML);

      // 重新缓存元素
      this.elements.taskDialog = document.getElementById("task-dialog");
      this.elements.taskForm = document.getElementById("task-form");
      this.elements.taskTitleInput = document.getElementById("task-title");
      this.elements.taskDescriptionInput =
        document.getElementById("task-description");
      this.elements.createButton = document.querySelector(
        ".create-task-confirm"
      );
      this.elements.cancelButton = document.querySelector(
        ".create-task-cancel"
      );

      // 重新绑定事件
      this.elements.taskForm.addEventListener(
        "submit",
        this.handleSubmit.bind(this)
      );
      this.elements.cancelButton.addEventListener(
        "click",
        this.closeDialog.bind(this)
      );
    }
  },

  // 公共方法：创建新任务
  createNewTask: function () {
    console.log("调用创建新任务方法");
    this.openDialog(); // 明确调用无参数版本
  },

  // 公共方法：编辑任务
  editTask: function (taskId) {
    console.log("调用编辑任务方法, taskId:", taskId);
    this.openDialog(taskId);
  },

  // 打开任务创建对话框
  openDialog: function (taskId = null) {
    console.log("打开对话框, taskId:", taskId);

    // 首先重置编辑状态，确保从干净状态开始
    this.currentEditingTaskId = null;

    // 然后设置编辑模式（如果有taskId）
    if (taskId) {
      this.currentEditingTaskId = taskId;
    }

    console.log("设置 currentEditingTaskId:", this.currentEditingTaskId);

    // 确保对话框HTML已创建
    this.createDialogHTML();

    // 如果是编辑模式，填充现有数据
    if (taskId) {
      console.log("编辑模式，填充数据");
      this.fillEditData(taskId);
    } else {
      console.log("创建模式，清除表单");
      this.clearForm();
    }

    // 显示对话框
    this.elements.taskDialog.classList.remove("hidden");
    this.elements.taskDialog.classList.add("active");

    // 聚焦标题输入框
    setTimeout(() => {
      this.elements.taskTitleInput.focus();
    }, 100);
  },

  // 填充编辑数据
  fillEditData: function (taskId) {
    const task = TaskPixel.DataStore.getTaskById(taskId);
    if (task) {
      this.elements.taskTitleInput.value = task.title || "";
      this.elements.taskDescriptionInput.value = task.description || "";

      // 更新对话框标题和按钮文本
      const dialogTitle = this.elements.taskDialog.querySelector("h2");
      const submitButton = this.elements.taskDialog.querySelector(
        ".create-task-confirm"
      );

      if (dialogTitle) {
        dialogTitle.textContent = "编辑任务";
      }
      if (submitButton) {
        submitButton.textContent = "保存";
      }
    }
  },

  // 清空表单
  clearForm: function () {
    console.log("清空表单");

    this.elements.taskTitleInput.value = "";
    this.elements.taskDescriptionInput.value = "";

    // 确保重置编辑状态
    this.currentEditingTaskId = null;

    console.log("清空后 currentEditingTaskId:", this.currentEditingTaskId);

    // 重置对话框标题和按钮文本
    const dialogTitle = this.elements.taskDialog.querySelector("h2");
    const submitButton = this.elements.taskDialog.querySelector(
      ".create-task-confirm"
    );

    if (dialogTitle) {
      dialogTitle.textContent = "新建任务";
    }
    if (submitButton) {
      submitButton.textContent = "创建";
    }
  },

  // 关闭任务创建对话框
  closeDialog: function () {
    console.log("关闭对话框");

    if (this.elements.taskDialog) {
      this.elements.taskDialog.classList.add("hidden");
      this.elements.taskDialog.classList.remove("active");

      // 重置表单
      if (this.elements.taskForm) {
        this.elements.taskForm.reset();
      }

      // 清除编辑状态
      this.currentEditingTaskId = null;

      console.log("关闭后 currentEditingTaskId:", this.currentEditingTaskId);

      // 重置对话框标题和按钮文本
      this.clearForm();
    }
  },

  // 处理表单提交
  handleSubmit: function (e) {
    e.preventDefault();

    console.log("表单提交开始");
    console.log("当前编辑任务ID:", this.currentEditingTaskId);

    // 获取表单数据
    const taskData = {
      title: this.elements.taskTitleInput.value.trim(),
      description: this.elements.taskDescriptionInput.value.trim(),
    };

    console.log("表单数据:", taskData);

    // 表单验证
    if (!this.validateForm(taskData)) {
      return;
    }

    // 根据模式创建或更新任务
    if (this.currentEditingTaskId) {
      console.log("执行更新任务:", this.currentEditingTaskId);
      this.updateTask(this.currentEditingTaskId, taskData);
    } else {
      console.log("执行创建任务");
      this.createTask(taskData);
    }
  },

  // 表单验证
  validateForm: function (taskData) {
    if (!taskData.title) {
      alert("请输入任务标题");
      this.elements.taskTitleInput.focus();
      return false;
    }

    return true;
  },

  // 创建任务
  createTask: function (taskData) {
    try {
      console.log("开始创建任务:", taskData);

      // 检查任务数据是否有效
      if (!taskData || !taskData.title) {
        console.error("无效的任务数据");
        alert("任务数据无效，请检查输入");
        return;
      }

      // 检查 DataStore 是否可用
      if (
        !TaskPixel.DataStore ||
        typeof TaskPixel.DataStore.addTask !== "function"
      ) {
        console.error("DataStore.addTask 不可用");
        alert("数据存储模块不可用，请刷新页面重试");
        return;
      }

      // 调用数据存储模块创建任务
      const taskId = TaskPixel.DataStore.addTask(taskData);

      if (taskId) {
        console.log("任务创建成功:", taskId);

        // 关闭对话框
        this.closeDialog();

        // 显示成功消息
        this.showSuccessMessage("任务创建成功");

        // 刷新任务列表（如果在主页）
        if (
          TaskPixel.Navigation &&
          TaskPixel.Navigation.currentPage === "home"
        ) {
          if (
            typeof TaskPixel.Home !== "undefined" &&
            typeof TaskPixel.Home.renderTasks === "function"
          ) {
            TaskPixel.Home.renderTasks();
          }
        } else {
          // 如果不在主页，则导航到主页
          if (
            TaskPixel.Navigation &&
            typeof TaskPixel.Navigation.navigateTo === "function"
          ) {
            TaskPixel.Navigation.navigateTo("home");
          }
        }
      } else {
        console.error("任务创建失败");
        alert("创建任务时出错，请重试");
      }
    } catch (error) {
      console.error("创建任务出错:", error);
      alert("创建任务时出错，请重试");
    }
  },

  // 更新任务
  updateTask: function (taskId, taskData) {
    try {
      console.log("开始更新任务:", taskId, taskData);

      // 检查 taskId 是否有效
      if (!taskId) {
        console.error("无效的任务ID");
        alert("无效的任务ID，请重试");
        return;
      }

      // 检查 DataStore 是否可用
      if (
        !TaskPixel.DataStore ||
        typeof TaskPixel.DataStore.updateTask !== "function"
      ) {
        console.error("DataStore.updateTask 不可用");
        alert("数据存储模块不可用，请刷新页面重试");
        return;
      }

      // 调用数据存储模块更新任务
      const success = TaskPixel.DataStore.updateTask(taskId, taskData);

      if (success) {
        console.log("任务更新成功:", taskId);

        // 关闭对话框
        this.closeDialog();

        // 显示成功消息
        this.showSuccessMessage("任务更新成功");

        // 触发任务更新事件
        if (
          TaskPixel.EventBus &&
          typeof TaskPixel.EventBus.emit === "function"
        ) {
          TaskPixel.EventBus.emit("task:updated", { taskId });
        }

        // 刷新任务列表（如果在主页）
        if (
          TaskPixel.Navigation &&
          TaskPixel.Navigation.currentPage === "home"
        ) {
          if (
            typeof TaskPixel.Home !== "undefined" &&
            typeof TaskPixel.Home.renderTasks === "function"
          ) {
            TaskPixel.Home.renderTasks();
          }
        }
      } else {
        console.error("任务更新失败");
        alert("更新任务时出错，请重试");
      }
    } catch (error) {
      console.error("更新任务出错:", error);
      alert("更新任务时出错，请重试");
    }
  },

  // 显示成功消息
  showSuccessMessage: function (message = "操作成功") {
    // 创建消息元素
    const messageElement = document.createElement("div");
    messageElement.className =
      "fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg pixel-border";
    messageElement.textContent = message;

    // 添加到页面
    document.body.appendChild(messageElement);

    // 3秒后移除
    setTimeout(() => {
      if (document.body.contains(messageElement)) {
        document.body.removeChild(messageElement);
      }
    }, 3000);
  },
};
