/**
 * TaskPixel 日历模块
 * 提供周视图时间管理和  // 缓存DOM元素
  cacheElements: function () {
    this.elements.miniCalendar = document.getElementById("mini-calendar");
    this.elements.weekGrid = document.getElementById("week-grid");
    this.elements.currentWeek = document.getElementById("current-week");
    this.elements.weekRange = document.getElementById("week-range");
    this.elements.timeBlockModal = document.getElementById("time-block-modal");
    this.elements.timeBlockForm = document.getElementById("time-block-form");
    this.elements.modalTitle = document.querySelector("#time-block-modal h3");
    this.elements.timeBlockTitle = document.getElementById("modal-activity");
    this.elements.timeBlockStart = document.getElementById("modal-start-time");
    this.elements.timeBlockEnd = document.getElementById("modal-end-time");
    this.elements.timeBlockCategory = document.getElementById("modal-category");
    this.elements.timeBlockDescription = document.getElementById("modal-notes");
  },*/

TaskPixel.Calendar = {
  // 当前状态
  currentDate: new Date(),
  currentWeekStart: null,
  selectedDate: null,
  editingBlockId: null,
  timeBlocks: [], // 存储时间块数据数组

  // DOM元素引用
  elements: {
    miniCalendar: null,
    weekGrid: null,
    currentWeek: null,
    weekRange: null,
    timeBlockModal: null,
    timeBlockForm: null,
  },

  // 初始化日历模块
  init: function () {
    this.cacheElements();
    this.initializeDate();
    this.bindEvents();
    this.loadTimeBlocks();
    console.log("加载的时间块数据:", this.timeBlocks);
    console.log("当前日期:", this.formatDate(new Date()));
    console.log("当前周开始:", this.formatDate(this.currentWeekStart));
    this.renderMiniCalendar();
    this.renderWeekView();

    // 启动当前时间线更新定时器（每分钟更新一次）
    this.startTimeLineUpdater();
    console.log("日历模块初始化完成");
  },

  // 缓存DOM元素引用
  cacheElements: function () {
    this.elements.miniCalendar = document.getElementById("mini-calendar");
    this.elements.weekGrid = document.getElementById("week-grid");
    this.elements.currentWeek = document.getElementById("current-week");
    this.elements.weekRange = document.getElementById("week-range");
    this.elements.timeBlockModal = document.getElementById("time-block-modal");
    this.elements.timeBlockForm = document.getElementById("time-block-form");
    this.elements.modalTitle = document.querySelector("#time-block-modal h3");
    this.elements.timeBlockTitle = document.getElementById("modal-activity");
    this.elements.timeBlockStart = document.getElementById("modal-start-time");
    this.elements.timeBlockEnd = document.getElementById("modal-end-time");
    this.elements.timeBlockCategory = document.getElementById("modal-category");
    this.elements.timeBlockDescription = document.getElementById("modal-notes");
    this.elements.subtasksContainer =
      document.getElementById("subtasks-container");
    this.elements.addSubtaskBtn = document.getElementById("add-subtask");
    this.elements.emptySubtasks = document.getElementById("empty-subtasks");
  },

  // 初始化日期
  initializeDate: function () {
    this.selectedDate = new Date();
    this.currentWeekStart = this.getWeekStart(this.currentDate);
  },

  // 绑定事件
  bindEvents: function () {
    // 周导航
    document
      .getElementById("prev-week")
      .addEventListener("click", () => this.navigateWeek(-1));
    document
      .getElementById("next-week")
      .addEventListener("click", () => this.navigateWeek(1));
    document
      .getElementById("today-btn")
      .addEventListener("click", () => this.goToToday());

    // 月导航
    document
      .getElementById("prev-month")
      .addEventListener("click", () => this.navigateMonth(-1));
    document
      .getElementById("next-month")
      .addEventListener("click", () => this.navigateMonth(1));

    // 快速添加
    document
      .getElementById("quick-add")
      .addEventListener("click", () => this.quickAddTimeBlock());

    // 模态框
    document
      .getElementById("close-modal")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("cancel-modal")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("delete-block")
      .addEventListener("click", () => this.deleteTimeBlock());
    this.elements.timeBlockForm.addEventListener("submit", (e) =>
      this.saveTimeBlock(e)
    );

    // 子任务相关事件
    this.elements.addSubtaskBtn.addEventListener("click", () =>
      this.addSubtask()
    );

    // 点击模态框外部关闭
    this.elements.timeBlockModal.addEventListener("click", (e) => {
      if (e.target === this.elements.timeBlockModal) {
        this.closeModal();
      }
    });
  },

  // 获取周的开始日期（周一）
  getWeekStart: function (date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    return new Date(d.setDate(diff));
  },

  // 周导航
  navigateWeek: function (direction) {
    this.currentWeekStart.setDate(
      this.currentWeekStart.getDate() + direction * 7
    );
    this.renderWeekView();
  },

  // 月导航
  navigateMonth: function (direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.renderMiniCalendar();
  },

  // 跳转到今天
  goToToday: function () {
    this.currentDate = new Date();
    this.currentWeekStart = this.getWeekStart(this.currentDate);
    this.selectedDate = new Date();
    this.renderMiniCalendar();
    this.renderWeekView();
  },

  // 渲染迷你月历
  renderMiniCalendar: function () {
    if (!this.elements.miniCalendar) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();

    // 创建月历标题
    const monthNames = [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月",
    ];
    const header = `<div class="mini-calendar-header">${year}年 ${monthNames[month]}</div>`;

    // 创建星期标题
    const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
    const weekHeader = weekDays
      .map(
        (day) =>
          `<div class="mini-calendar-cell" style="font-weight: bold; background: #e9ecef;">${day}</div>`
      )
      .join("");

    // 获取月份信息
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = (firstDay.getDay() + 6) % 7; // 调整为周一开始
    const daysInMonth = lastDay.getDate();

    let cells = "";

    // 上个月的填充日期
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      cells += `<div class="mini-calendar-cell other-month">${day}</div>`;
    }

    // 当前月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDate(date);
      const isToday = this.isSameDay(date, today);
      const isSelected =
        this.selectedDate && this.isSameDay(date, this.selectedDate);
      const hasRecords = this.hasTimeBlocksForDate(dateStr);

      let classes = "mini-calendar-cell";
      if (isToday) classes += " today";
      if (isSelected) classes += " selected";
      if (hasRecords) classes += " has-records";

      cells += `<div class="${classes}" data-date="${dateStr}" onclick="TaskPixel.Calendar.selectDate('${dateStr}')">${day}</div>`;
    }

    // 下个月的填充日期
    const totalCells = Math.ceil((firstDayWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - firstDayWeek - daysInMonth;
    for (let day = 1; day <= remainingCells; day++) {
      cells += `<div class="mini-calendar-cell other-month">${day}</div>`;
    }

    this.elements.miniCalendar.innerHTML = `
      ${header}
      <div class="mini-calendar-grid">
        ${weekHeader}
        ${cells}
      </div>
    `;
  },

  // 渲染周视图
  renderWeekView: function () {
    if (!this.elements.weekGrid) return;

    // 更新周标题
    const weekNum = this.getWeekNumber(this.currentWeekStart);
    const year = this.currentWeekStart.getFullYear();
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    this.elements.currentWeek.textContent = `${year}年第${weekNum}周`;
    this.elements.weekRange.textContent = `${this.formatDateRange(
      this.currentWeekStart
    )} - ${this.formatDateRange(weekEnd)}`;

    // 创建新的日列布局
    let gridHTML = '<div class="week-column-view">';

    // 添加时间轴
    gridHTML += '<div class="time-axis">';
    gridHTML += '<div class="time-axis-header"></div>';
    for (let hour = 0; hour < 24; hour++) {
      const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
      gridHTML += `<div class="time-label">${timeLabel}</div>`;
    }
    gridHTML += "</div>";

    // 添加7个日期列
    for (let day = 0; day < 7; day++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + day);
      const dateStr = this.formatDate(date);
      const dayName = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][
        day
      ];

      // 获取这一天的所有时间块
      const dayBlocks = this.getTimeBlocksForDate(dateStr);

      gridHTML += `<div class="day-column" data-date="${dateStr}">
        <div class="day-header">
          <div class="day-name">${dayName}</div>
          <div class="date-number">${date.getDate()}</div>
        </div>
        <div class="day-content" onclick="TaskPixel.Calendar.createTimeBlock('${dateStr}')">
          ${this.renderDayTimeBlocks(dayBlocks)}
        </div>
      </div>`;
    }

    gridHTML += "</div>";
    this.elements.weekGrid.innerHTML = gridHTML;

    // 添加当前时间线
    this.renderCurrentTimeLine();
  },

  // 获取某日期的时间块
  getTimeBlocksForDate: function (dateStr) {
    return this.timeBlocks.filter((block) => block.date === dateStr);
  },

  // 渲染某天的时间块
  renderDayTimeBlocks: function (blocks) {
    if (!blocks || blocks.length === 0) {
      return '<div class="empty-day">点击添加时间块</div>';
    }

    // 按开始时间排序
    blocks.sort(
      (a, b) =>
        this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    let html = "";
    blocks.forEach((block) => {
      const startMinutes = this.timeToMinutes(block.startTime);
      const endMinutes = this.timeToMinutes(block.endTime);
      const duration = endMinutes - startMinutes;

      // 计算垂直位置和高度（每小时60px，即每分钟1px）
      const top = startMinutes;
      const height = Math.max(duration, 30); // 最小高度30px

      html += `<div class="time-block-card ${block.category}" 
                    style="top: ${top}px; height: ${height}px;"
                    onclick="event.stopPropagation(); TaskPixel.Calendar.editTimeBlock('${
                      block.id
                    }')">
                 <div class="block-title">${
                   block.title || block.activity || "未命名活动"
                 }</div>
                 <div class="block-time">${block.startTime} - ${
        block.endTime
      }</div>
                 ${this.renderSubtasksDisplay(block.subtasks)}
               </div>`;
    });

    return html;
  },

  // 渲染当前时间线
  renderCurrentTimeLine: function () {
    // 移除已存在的时间线
    const existingLine = document.querySelector(".current-time-line");
    if (existingLine) {
      existingLine.remove();
    }

    const now = new Date();
    const currentDateStr = this.formatDate(now);

    // 检查当前日期是否在显示的周内
    const weekStart = new Date(this.currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (now < weekStart || now > weekEnd) {
      return; // 当前时间不在显示的周内
    }

    // 计算当前时间的分钟数（从00:00开始）
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 创建时间线元素
    const timeLine = document.createElement("div");
    timeLine.className = "current-time-line";
    timeLine.style.top = `${60 + currentMinutes}px`; // 60px是头部高度

    // 添加时间点
    const timeDot = document.createElement("div");
    timeDot.className = "current-time-dot";
    timeLine.appendChild(timeDot);

    // 添加时间标签
    const timeLabel = document.createElement("div");
    timeLabel.className = "current-time-label";
    timeLabel.textContent = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    timeLine.appendChild(timeLabel);

    // 添加到周视图容器
    const weekContainer = document.querySelector(".week-column-view");
    if (weekContainer) {
      weekContainer.appendChild(timeLine);
    }
  },

  // 在小时格子中渲染时间块
  renderTimeBlockInCell: function (block, hour) {
    const categoryClass = block.category || "other";
    const efficiencyClass = `efficiency-${block.efficiency || 3}`;

    return `
      <div class="time-block-cell ${categoryClass} ${efficiencyClass}" 
           title="${block.activity} (${block.startTime}-${block.endTime})"
           onclick="event.stopPropagation(); TaskPixel.Calendar.editTimeBlock('${block.id}')">
        <div class="block-content-cell">
          <div class="block-title">${block.activity}</div>
          <div class="block-time">${block.startTime}-${block.endTime}</div>
        </div>
      </div>
    `;
  },

  // 渲染时间块
  renderTimeBlock: function (block) {
    const startMinutes = this.timeToMinutes(block.startTime);
    const endMinutes = this.timeToMinutes(block.endTime);
    const duration = endMinutes - startMinutes;

    // 计算位置和高度（每分钟1px）
    const top = startMinutes;
    const height = duration;

    const categoryClass = block.category || "other";
    const efficiencyClass = `efficiency-${block.efficiency || 3}`;

    return `
      <div class="time-block ${categoryClass} ${efficiencyClass}" 
           style="position: absolute; top: ${top}px; height: ${height}px; left: 5px; right: 5px; z-index: 2;"
           title="${block.activity} (${block.startTime}-${block.endTime}, 效率: ${block.efficiency}/5)"
           onclick="TaskPixel.Calendar.editTimeBlock('${block.id}')">
        <div class="block-content">
          <div class="block-title">${block.activity}</div>
          <div class="block-time">${block.startTime}-${block.endTime}</div>
        </div>
      </div>
    `;
  },

  // 时间转换为分钟数
  timeToMinutes: function (timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  },

  // 分钟数转换为时间
  minutesToTime: function (minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  },

  // 选择日期
  selectDate: function (dateStr) {
    this.selectedDate = new Date(dateStr);

    // 如果选择的日期不在当前周，切换到该周
    const selectedWeekStart = this.getWeekStart(this.selectedDate);
    if (selectedWeekStart.getTime() !== this.currentWeekStart.getTime()) {
      this.currentWeekStart = selectedWeekStart;
      this.renderWeekView();
    }

    this.renderMiniCalendar();
  },

  // 创建新时间块
  createTimeBlock: function (dateStr) {
    // 重置表单
    this.elements.timeBlockTitle.value = "";
    this.elements.timeBlockStart.value = "09:00";
    this.elements.timeBlockEnd.value = "10:00";
    this.elements.timeBlockCategory.value = "other";
    this.elements.timeBlockDescription.value = "";

    // 设置日期（如果有日期输入框的话）
    const dateInput = document.getElementById("modal-date");
    if (dateInput) {
      dateInput.value = dateStr;
    }

    // 重置编辑模式
    this.editingBlockId = null;
    this.elements.modalTitle.textContent = "添加时间块";
    document.getElementById("delete-block").classList.add("hidden");

    // 清空子任务
    this.clearSubtasks();

    // 显示模态框
    this.elements.timeBlockModal.classList.remove("hidden");
    document.getElementById("modal-activity").focus();
  },

  // 编辑时间块
  editTimeBlock: function (blockId) {
    const block = this.timeBlocks.find((b) => b.id === blockId);
    if (!block) return;

    // 填充表单数据
    this.elements.timeBlockTitle.value = block.title || block.activity;
    this.elements.timeBlockStart.value = block.startTime;
    this.elements.timeBlockEnd.value = block.endTime;
    this.elements.timeBlockCategory.value = block.category;
    this.elements.timeBlockDescription.value =
      block.description || block.notes || "";

    // 设置日期
    const dateInput = document.getElementById("modal-date");
    if (dateInput) {
      dateInput.value = block.date;
    }

    // 设置编辑模式
    this.editingBlockId = blockId;
    this.elements.modalTitle.textContent = "编辑时间块";

    // 显示删除按钮（编辑模式才显示）
    document.getElementById("delete-block").classList.remove("hidden");

    // 加载子任务
    this.loadSubtasksToForm(block.subtasks);

    // 显示模态框
    this.elements.timeBlockModal.classList.remove("hidden");
  },

  // 保存时间块
  saveTimeBlock: function (e) {
    e.preventDefault();

    const dateStr = document.getElementById("modal-date").value;
    const startTime = document.getElementById("modal-start-time").value;
    const endTime = document.getElementById("modal-end-time").value;
    const activity = document.getElementById("modal-activity").value.trim();
    const category = document.getElementById("modal-category").value;
    const efficiency = parseInt(
      document.getElementById("modal-efficiency").value
    );
    const notes = document.getElementById("modal-notes").value.trim();

    if (!dateStr || !startTime || !endTime || !activity) {
      alert("请填写完整信息");
      return;
    }

    // 验证时间有效性
    if (startTime >= endTime) {
      alert("结束时间必须晚于开始时间");
      return;
    }

    // 检查时间冲突
    if (
      !this.checkTimeConflict(dateStr, startTime, endTime, this.editingBlockId)
    ) {
      alert("时间段与现有记录冲突，请调整时间");
      return;
    }

    const blockData = {
      id: this.editingBlockId || this.generateId(),
      date: dateStr,
      startTime,
      endTime,
      activity,
      category,
      efficiency,
      notes,
      subtasks: this.collectSubtasksFromForm(),
      created: this.editingBlockId
        ? this.timeBlocks.find((b) => b.id === this.editingBlockId)?.created ||
          new Date().toISOString()
        : new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    if (this.editingBlockId) {
      // 更新现有时间块
      const index = this.timeBlocks.findIndex(
        (b) => b.id === this.editingBlockId
      );
      if (index !== -1) {
        this.timeBlocks[index] = blockData;
      }
    } else {
      // 添加新时间块
      this.timeBlocks.push(blockData);
    }

    this.editingBlockId = null;
    this.saveTimeBlocks();
    this.renderWeekView();
    this.renderMiniCalendar();
    this.closeModal();
  },

  // 删除时间块
  deleteTimeBlock: function () {
    if (!this.editingBlockId) return;

    if (confirm("确定要删除这个时间块吗？")) {
      const index = this.timeBlocks.findIndex(
        (b) => b.id === this.editingBlockId
      );
      if (index !== -1) {
        this.timeBlocks.splice(index, 1);
        this.saveTimeBlocks();
        this.renderWeekView();
        this.renderMiniCalendar();
        this.closeModal();
      }
      this.editingBlockId = null;
    }
  },

  // 快速添加时间块
  quickAddTimeBlock: function () {
    const activity = document.getElementById("quick-activity").value.trim();
    const startTime = document.getElementById("quick-start-time").value;
    const endTime = document.getElementById("quick-end-time").value;

    console.log("快速添加输入:", { activity, startTime, endTime });

    if (!activity || !startTime || !endTime) {
      alert("请填写完整信息");
      return;
    }

    if (startTime >= endTime) {
      alert("结束时间必须晚于开始时间");
      return;
    }

    const today = this.formatDate(new Date());
    console.log("今天的日期:", today);

    // 检查时间冲突
    if (!this.checkTimeConflict(today, startTime, endTime)) {
      alert("时间段与现有记录冲突，请调整时间");
      return;
    }

    const blockData = {
      id: this.generateId(),
      date: today,
      startTime,
      endTime,
      activity,
      category: "other",
      efficiency: 3,
      notes: "",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    this.timeBlocks.push(blockData);
    this.saveTimeBlocks();

    // 确保当前周包含今天
    const todayWeekStart = this.getWeekStart(new Date());
    if (todayWeekStart.getTime() !== this.currentWeekStart.getTime()) {
      this.currentWeekStart = todayWeekStart;
    }

    this.renderWeekView();
    this.renderMiniCalendar();

    // 清空输入
    document.getElementById("quick-activity").value = "";
    document.getElementById("quick-start-time").value = "";
    document.getElementById("quick-end-time").value = "";

    console.log("快速添加时间块成功:", blockData);
    console.log("当前所有时间块:", this.timeBlocks);
    console.log("当前周开始日期:", this.formatDate(this.currentWeekStart));
  },

  // 生成唯一ID
  generateId: function () {
    return (
      "block_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  },

  // 检查时间冲突
  checkTimeConflict: function (date, startTime, endTime, excludeId = null) {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    const dayBlocks = this.getTimeBlocksForDate(date).filter((block) =>
      excludeId ? block.id !== excludeId : true
    );

    for (let block of dayBlocks) {
      const blockStartMinutes = this.timeToMinutes(block.startTime);
      const blockEndMinutes = this.timeToMinutes(block.endTime);

      // 检查是否有重叠
      if (startMinutes < blockEndMinutes && endMinutes > blockStartMinutes) {
        return false;
      }
    }

    return true;
  },

  // 关闭模态框
  closeModal: function () {
    this.elements.timeBlockModal.classList.add("hidden");
  },

  // 工具方法
  formatDate: function (date) {
    // 使用本地时区格式化日期，避免UTC时区问题
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  formatDateRange: function (date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  isSameDay: function (date1, date2) {
    return this.formatDate(date1) === this.formatDate(date2);
  },

  getWeekNumber: function (date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  },

  hasTimeBlocksForDate: function (dateStr) {
    return this.timeBlocks.some((block) => block.date === dateStr);
  },

  // 数据持久化
  saveTimeBlocks: function () {
    try {
      localStorage.setItem(
        "taskpixel_timeblocks",
        JSON.stringify(this.timeBlocks)
      );
    } catch (error) {
      console.error("保存时间块数据失败:", error);
    }
  },

  loadTimeBlocks: function () {
    try {
      const saved = localStorage.getItem("taskpixel_timeblocks");
      if (saved) {
        const loadedData = JSON.parse(saved);
        // 如果是旧格式的对象，转换为新格式的数组
        if (
          loadedData &&
          typeof loadedData === "object" &&
          !Array.isArray(loadedData)
        ) {
          this.timeBlocks = [];
        } else {
          this.timeBlocks = loadedData || [];
        }
      }
    } catch (error) {
      console.error("加载时间块数据失败:", error);
      this.timeBlocks = [];
    }
  },

  // 渲染子任务显示
  renderSubtasksDisplay: function (subtasks) {
    if (!subtasks || subtasks.length === 0) {
      return "";
    }

    let html = '<div class="time-block-subtasks">';
    const maxDisplay = 4; // 最多显示4个子任务

    for (let i = 0; i < Math.min(subtasks.length, maxDisplay); i++) {
      const subtask = subtasks[i];
      const completedClass = subtask.completed ? " subtask-completed" : "";
      const title = subtask.title || "未命名子任务";
      // 限制显示长度，避免过长的子任务标题影响布局
      const displayTitle =
        title.length > 18 ? title.substring(0, 18) + "..." : title;
      html += `<div class="subtask-display-item${completedClass}" title="${title}">${displayTitle}</div>`;
    }

    // 如果还有更多子任务，显示省略提示
    if (subtasks.length > maxDisplay) {
      html += `<div class="subtask-display-item subtask-more">+${
        subtasks.length - maxDisplay
      } 更多</div>`;
    }

    html += "</div>";
    return html;
  },

  // 添加子任务
  addSubtask: function () {
    const subtaskId = "subtask-" + Date.now();
    const subtaskHtml = `
      <div class="subtask-item" data-id="${subtaskId}">
        <input type="checkbox" class="subtask-checkbox" />
        <input type="text" class="subtask-input" placeholder="子任务内容..." />
        <span class="subtask-remove" onclick="TaskPixel.Calendar.removeSubtask('${subtaskId}')">×</span>
      </div>
    `;

    this.elements.subtasksContainer.insertAdjacentHTML(
      "beforeend",
      subtaskHtml
    );
    this.elements.emptySubtasks.style.display = "none";
  },

  // 移除子任务
  removeSubtask: function (subtaskId) {
    const subtaskElement = document.querySelector(`[data-id="${subtaskId}"]`);
    if (subtaskElement) {
      subtaskElement.remove();
    }

    // 如果没有子任务了，显示空状态
    const remainingSubtasks =
      this.elements.subtasksContainer.querySelectorAll(".subtask-item");
    if (remainingSubtasks.length === 0) {
      this.elements.emptySubtasks.style.display = "block";
    }
  },

  // 清空子任务容器
  clearSubtasks: function () {
    const subtasks =
      this.elements.subtasksContainer.querySelectorAll(".subtask-item");
    subtasks.forEach((subtask) => subtask.remove());
    this.elements.emptySubtasks.style.display = "block";
  },

  // 加载子任务到编辑界面
  loadSubtasksToForm: function (subtasks) {
    this.clearSubtasks();

    if (subtasks && subtasks.length > 0) {
      subtasks.forEach((subtask) => {
        const subtaskId = subtask.id || "subtask-" + Date.now();
        const subtaskHtml = `
          <div class="subtask-item" data-id="${subtaskId}">
            <input type="checkbox" class="subtask-checkbox" ${
              subtask.completed ? "checked" : ""
            } />
            <input type="text" class="subtask-input" value="${
              subtask.title || ""
            }" placeholder="子任务内容..." />
            <span class="subtask-remove" onclick="TaskPixel.Calendar.removeSubtask('${subtaskId}')">×</span>
          </div>
        `;

        this.elements.subtasksContainer.insertAdjacentHTML(
          "beforeend",
          subtaskHtml
        );
      });
      this.elements.emptySubtasks.style.display = "none";
    }
  },

  // 从表单收集子任务数据
  collectSubtasksFromForm: function () {
    const subtasks = [];
    const subtaskElements =
      this.elements.subtasksContainer.querySelectorAll(".subtask-item");

    subtaskElements.forEach((element, index) => {
      const checkbox = element.querySelector(".subtask-checkbox");
      const titleInput = element.querySelector(".subtask-input");

      const title = titleInput.value.trim();
      if (title) {
        subtasks.push({
          id: element.dataset.id,
          title: title,
          completed: checkbox.checked,
        });
      }
    });

    return subtasks;
  },

  // 启动时间线更新定时器
  startTimeLineUpdater: function () {
    // 立即更新一次
    this.renderCurrentTimeLine();

    // 每分钟更新一次
    setInterval(() => {
      this.renderCurrentTimeLine();
    }, 60000); // 60秒 = 1分钟
  },
};
