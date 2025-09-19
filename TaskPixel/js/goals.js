/**
 * TaskPixel 目标列表页功能模块
 * 提供目标展示、标签筛选、排序和全局优先级评估功能
 */

TaskPixel.Goals = {
    // 应用筛选的标签
    selectedTags: [],

    // DOM元素引用
    elements: {
        goalsContainer: null,
        tagsContainer: null,
        emptyGoalsMessage: null,
        sortSelect: null,
        aiPriorityButton: null,
        priorityEvaluationDialog: null,
        goalSelectionContainer: null,
        startPriorityEvaluationButton: null,
        cancelPriorityEvaluationButton: null,
        clearTagsButton: null
    },

    // 初始化目标列表页功能
    init: function() {
        this.cacheElements();
        this.loadAllGoals();
        this.loadAllTags();
        this.bindEvents();
        console.log('目标列表页功能模块初始化完成');
    },

    // 缓存DOM元素引用
    cacheElements: function() {
        this.elements.goalsContainer = document.getElementById('goals-container');
        this.elements.tagsContainer = document.getElementById('tags-container');
        this.elements.emptyGoalsMessage = document.getElementById('empty-goals');
        this.elements.sortSelect = document.getElementById('sort-select');
        this.elements.aiPriorityButton = document.getElementById('ai-priority-button');
        this.elements.priorityEvaluationDialog = document.getElementById('priority-evaluation-dialog');
        this.elements.goalSelectionContainer = document.getElementById('goal-selection-container');
        this.elements.startPriorityEvaluationButton = document.getElementById('start-priority-evaluation');
        this.elements.cancelPriorityEvaluationButton = document.getElementById('cancel-priority-evaluation');
        this.elements.clearTagsButton = document.getElementById('clear-tags-button');
    },

    // 绑定事件处理函数
    bindEvents: function() {
        // 排序下拉菜单变化事件
        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', this.handleSortChange.bind(this));
        }

        // AI优先级评估按钮事件
        if (this.elements.aiPriorityButton) {
            this.elements.aiPriorityButton.addEventListener('click', this.openPriorityEvaluationDialog.bind(this));
        }

        // 开始优先级评估按钮事件
        if (this.elements.startPriorityEvaluationButton) {
            this.elements.startPriorityEvaluationButton.addEventListener('click', this.startPriorityEvaluation.bind(this));
        }

        // 取消优先级评估按钮事件
        if (this.elements.cancelPriorityEvaluationButton) {
            this.elements.cancelPriorityEvaluationButton.addEventListener('click', this.closePriorityEvaluationDialog.bind(this));
        }

        // 清除标签按钮事件
        if (this.elements.clearTagsButton) {
            this.elements.clearTagsButton.addEventListener('click', this.clearTagFilter.bind(this));
        }

        // 监听数据变化
        TaskPixel.EventBus.on('goal:added', this.handleGoalAdded.bind(this));
        TaskPixel.EventBus.on('goal:updated', this.handleGoalUpdated.bind(this));
        TaskPixel.EventBus.on('goal:deleted', this.handleGoalDeleted.bind(this));
    },

    // 加载所有目标
    loadAllGoals: function() {
        const tasks = TaskPixel.DataStore.getAllTasks();
        
        // 收集所有目标
        const allGoals = [];
        tasks.forEach(task => {
            if (task.goals && task.goals.length > 0) {
                task.goals.forEach(goal => {
                    // 为每个目标添加所属任务信息
                    allGoals.push({
                        ...goal,
                        taskId: task.id,
                        taskTitle: task.title
                    });
                });
            }
        });
        
        // 渲染目标
        this.renderGoals(allGoals);
    },

    // 加载所有标签
    loadAllTags: function() {
        const tasks = TaskPixel.DataStore.getAllTasks();
        
        // 收集所有标签
        const allTags = new Set();
        tasks.forEach(task => {
            if (task.goals && task.goals.length > 0) {
                task.goals.forEach(goal => {
                    if (goal.tags && goal.tags.length > 0) {
                        goal.tags.forEach(tag => allTags.add(tag));
                    }
                });
            }
        });
        
        // 渲染标签
        this.renderTags(Array.from(allTags));
    },

    // 渲染目标
    renderGoals: function(goals) {
        if (!this.elements.goalsContainer) return;
        
        // 清空现有内容
        this.elements.goalsContainer.innerHTML = '';
        
        // 应用标签筛选
        let filteredGoals = goals;
        if (this.selectedTags.length > 0) {
            filteredGoals = goals.filter(goal => {
                if (!goal.tags || goal.tags.length === 0) return false;
                return this.selectedTags.every(tag => goal.tags.includes(tag));
            });
        }
        
        // 应用排序
        const sortMethod = this.elements.sortSelect ? this.elements.sortSelect.value : 'priority';
        filteredGoals = this.sortGoals(filteredGoals, sortMethod);
        
        // 显示或隐藏空状态消息
        if (filteredGoals.length === 0) {
            this.elements.goalsContainer.classList.add('hidden');
            this.elements.emptyGoalsMessage.classList.remove('hidden');
            return;
        } else {
            this.elements.goalsContainer.classList.remove('hidden');
            this.elements.emptyGoalsMessage.classList.add('hidden');
        }
        
        // 渲染每个目标
        filteredGoals.forEach(goal => {
            const goalElement = this.createGoalElement(goal);
            this.elements.goalsContainer.appendChild(goalElement);
        });
    },

    // 创建目标元素
    createGoalElement: function(goal) {
        const goalElement = document.createElement('div');
        goalElement.className = 'border-4 border-border-color p-4 bg-white shadow-pixel-sm goal-item';
        goalElement.dataset.goalId = goal.id;
        goalElement.dataset.taskId = goal.taskId;
        
        // 计算子步骤完成进度
        const totalSubsteps = goal.substeps.length;
        const completedSubsteps = goal.substeps.filter(substep => substep.completed).length;
        const progressPercent = totalSubsteps > 0 ? Math.round((completedSubsteps / totalSubsteps) * 100) : 0;
        
        // 渲染标签
        const tagsHtml = goal.tags && goal.tags.length > 0 
            ? `<div class="mt-2 flex flex-wrap gap-2">
                ${goal.tags.map(tag => `
                    <span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 border border-gray-300 rounded tag-item" data-tag="${tag}">
                        ${tag}
                    </span>
                `).join('')}
               </div>`
            : '';
        
        // 构建目标HTML
        goalElement.innerHTML = `
            <h3 class="font-display text-lg mb-2">${goal.title}</h3>
            <p class="text-sm text-gray-600 mb-2">来自: ${goal.taskTitle}</p>
            <p class="text-gray-700 mb-3">${goal.description || '暂无描述'}</p>
            
            ${goal.priority ? `
                <div class="mb-2">
                    <span class="inline-block px-2 py-1 text-xs font-bold ${this.getPriorityClass(goal.priority)}">
                        ${this.getPriorityText(goal.priority)}
                    </span>
                </div>
            ` : ''}
            
            ${tagsHtml}
            
            ${totalSubsteps > 0 ? `
                <div class="mt-3">
                    <div class="w-full h-2 bg-gray-200 rounded-full">
                        <div class="h-full bg-primary rounded-full" style="width: ${progressPercent}%"></div>
                    </div>
                    <p class="text-right text-xs text-gray-500 mt-1">${completedSubsteps}/${totalSubsteps} 完成</p>
                </div>
            ` : ''}
            
            <div class="mt-4 flex justify-end">
                <a href="task_detail.html?id=${goal.taskId}" class="pixel-button-sm bg-primary text-white font-display py-1 px-2 text-xs flex items-center">
                    <span class="material-symbols-outlined text-sm mr-1">visibility</span>
                    查看任务
                </a>
            </div>
        `;

        // 为标签添加点击事件
        const tagElements = goalElement.querySelectorAll('.tag-item');
        tagElements.forEach(tagElement => {
            tagElement.addEventListener('click', () => {
                const tag = tagElement.dataset.tag;
                this.addTagFilter(tag);
            });
        });
        
        return goalElement;
    },

    // 渲染标签
    renderTags: function(tags) {
        if (!this.elements.tagsContainer) return;
        
        // 清空现有内容
        this.elements.tagsContainer.innerHTML = '';
        
        // 如果没有标签，显示提示
        if (!tags || tags.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'text-gray-500';
            emptyMessage.textContent = '暂无标签';
            this.elements.tagsContainer.appendChild(emptyMessage);
            return;
        }
        
        // 排序标签
        const sortedTags = [...tags].sort();
        
        // 渲染每个标签
        sortedTags.forEach(tag => {
            const isSelected = this.selectedTags.includes(tag);
            const tagElement = document.createElement('button');
            tagElement.className = `px-3 py-1 rounded ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'} text-sm tag-filter-button`;
            tagElement.dataset.tag = tag;
            tagElement.textContent = tag;
            
            tagElement.addEventListener('click', () => {
                if (isSelected) {
                    this.removeTagFilter(tag);
                } else {
                    this.addTagFilter(tag);
                }
            });
            
            this.elements.tagsContainer.appendChild(tagElement);
        });
    },

    // 添加标签筛选
    addTagFilter: function(tag) {
        if (!this.selectedTags.includes(tag)) {
            this.selectedTags.push(tag);
            this.loadAllGoals(); // 重新加载并筛选目标
            this.loadAllTags(); // 更新标签UI状态
        }
    },

    // 移除标签筛选
    removeTagFilter: function(tag) {
        this.selectedTags = this.selectedTags.filter(t => t !== tag);
        this.loadAllGoals(); // 重新加载并筛选目标
        this.loadAllTags(); // 更新标签UI状态
    },

    // 清除所有标签筛选
    clearTagFilter: function() {
        this.selectedTags = [];
        this.loadAllGoals();
        this.loadAllTags();
    },

    // 排序目标
    sortGoals: function(goals, sortMethod) {
        switch (sortMethod) {
            case 'priority':
                // 按优先级排序：高>中>低>未设置
                return [...goals].sort((a, b) => {
                    const priorityOrder = { 'high': 1, '高': 1, 'medium': 2, '中': 2, 'low': 3, '低': 3 };
                    const aOrder = a.priority ? (priorityOrder[a.priority] || 4) : 4;
                    const bOrder = b.priority ? (priorityOrder[b.priority] || 4) : 4;
                    return aOrder - bOrder;
                });
                
            case 'alpha':
                // 按标题字母顺序排序
                return [...goals].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
                
            case 'task':
                // 按所属任务分组
                return [...goals].sort((a, b) => {
                    // 先按任务标题排序
                    const taskCompare = a.taskTitle.localeCompare(b.taskTitle, 'zh-CN');
                    if (taskCompare !== 0) return taskCompare;
                    
                    // 如果是同一任务，再按优先级排序
                    const priorityOrder = { 'high': 1, '高': 1, 'medium': 2, '中': 2, 'low': 3, '低': 3 };
                    const aOrder = a.priority ? (priorityOrder[a.priority] || 4) : 4;
                    const bOrder = b.priority ? (priorityOrder[b.priority] || 4) : 4;
                    return aOrder - bOrder;
                });
                
            default:
                return goals;
        }
    },

    // 处理排序变化
    handleSortChange: function() {
        this.loadAllGoals();
    },

    // 打开优先级评估对话框
    openPriorityEvaluationDialog: function() {
        if (!this.elements.priorityEvaluationDialog) return;
        
        // 加载所有目标供选择
        this.renderGoalSelections();
        
        // 显示对话框
        this.elements.priorityEvaluationDialog.classList.remove('hidden');
    },

    // 关闭优先级评估对话框
    closePriorityEvaluationDialog: function() {
        if (!this.elements.priorityEvaluationDialog) return;
        this.elements.priorityEvaluationDialog.classList.add('hidden');
    },

    // 渲染目标选择列表
    renderGoalSelections: function() {
        if (!this.elements.goalSelectionContainer) return;
        
        // 清空现有内容
        this.elements.goalSelectionContainer.innerHTML = '';
        
        // 获取所有任务和目标
        const tasks = TaskPixel.DataStore.getAllTasks();
        let hasGoals = false;
        
        // 按任务分组渲染目标选择
        tasks.forEach(task => {
            if (!task.goals || task.goals.length === 0) return;
            
            hasGoals = true;
            
            // 创建任务组标题
            const taskTitle = document.createElement('h3');
            taskTitle.className = 'font-bold text-lg mb-2 mt-4';
            taskTitle.textContent = task.title;
            this.elements.goalSelectionContainer.appendChild(taskTitle);
            
            // 创建目标列表
            task.goals.forEach(goal => {
                const goalItem = document.createElement('div');
                goalItem.className = 'flex items-center p-3 border-2 border-gray-300 rounded mb-2';
                
                goalItem.innerHTML = `
                    <input type="checkbox" name="selected-goal" value="${goal.id}" data-task-id="${task.id}" class="mr-3">
                    <div>
                        <p class="font-medium">${goal.title}</p>
                        <p class="text-sm text-gray-600">${goal.description || '暂无描述'}</p>
                        ${goal.priority ? `
                            <span class="inline-block px-2 py-1 text-xs ${this.getPriorityClass(goal.priority)} mt-1">
                                ${this.getPriorityText(goal.priority)}
                            </span>
                        ` : ''}
                    </div>
                `;
                
                this.elements.goalSelectionContainer.appendChild(goalItem);
            });
        });
        
        // 如果没有目标，显示提示
        if (!hasGoals) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'text-center text-gray-500';
            emptyMessage.textContent = '没有可评估的目标';
            this.elements.goalSelectionContainer.appendChild(emptyMessage);
        }
    },

    // 开始优先级评估
    startPriorityEvaluation: async function() {
        // 获取选中的目标
        const selectedInputs = document.querySelectorAll('input[name="selected-goal"]:checked');
        
        if (selectedInputs.length < 2) {
            alert('请至少选择两个目标进行比较');
            return;
        }
        
        // 收集选中的目标数据
        const selectedGoals = [];
        selectedInputs.forEach(input => {
            const goalId = input.value;
            const taskId = input.dataset.taskId;
            const task = TaskPixel.DataStore.getTaskById(taskId);
            
            if (task) {
                const goal = task.goals.find(g => g.id === goalId);
                if (goal) {
                    selectedGoals.push({
                        id: goal.id,
                        taskId: taskId,
                        title: goal.title,
                        description: goal.description,
                        priority: goal.priority,
                        substeps: goal.substeps
                    });
                }
            }
        });
        
        // 关闭对话框
        this.closePriorityEvaluationDialog();
        
        // 显示加载状态
        const removeLoadingMessage = this.showLoadingMessage('AI正在分析目标，生成优先级比较问卷...');
        
        try {
            // 调用AI辅助模块生成比较问卷
            const questions = await TaskPixel.AI.generateComparisonQuestionnaire(selectedGoals);
            
            // 移除加载消息
            if (removeLoadingMessage) removeLoadingMessage();
            
            if (questions && questions.length > 0) {
                // 显示问卷对话框
                this.showComparisonQuestionnaireDialog(selectedGoals, questions);
            } else {
                console.error('生成比较问卷失败');
                this.showErrorMessage('生成比较问卷失败，请重试');
            }
        } catch (error) {
            console.error('生成优先级比较问卷出错:', error);
            this.showErrorMessage('生成比较问卷时出错，请重试');
            
            // 移除加载消息
            if (removeLoadingMessage) removeLoadingMessage();
        }
    },

    // 显示比较问卷对话框
    showComparisonQuestionnaireDialog: function(selectedGoals, questions) {
        // 创建对话框元素
        const dialogElement = document.createElement('div');
        dialogElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        dialogElement.id = 'comparison-questionnaire-dialog';
        
        // 构建问卷内容HTML
        const questionsHtml = questions.map(question => `
            <div class="mb-8 question-item" data-question-id="${question.id}">
                <h4 class="text-lg font-bold mb-3">${question.text}</h4>
                <div class="space-y-2">
                    ${question.options.map(option => `
                        <label class="flex items-center p-3 border-2 border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="${question.id}" value="${option.id}" class="mr-3" data-value="${option.value}">
                            <span>${option.text}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // 构建对话框内容
        dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <h2 class="text-2xl font-display mb-2">目标优先级比较</h2>
                <p class="text-gray-600 mb-6">请回答以下问题，以帮助评估各目标之间的相对优先级</p>
                
                <form id="comparison-questionnaire-form">
                    ${questionsHtml}
                    
                    <div class="flex justify-end gap-4 mt-8">
                        <button type="button" id="cancel-questionnaire" class="pixel-button">取消</button>
                        <button type="submit" class="pixel-button bg-primary text-white">提交评估</button>
                    </div>
                </form>
            </div>
        `;
        
        // 将对话框添加到页面
        document.body.appendChild(dialogElement);
        
        // 绑定表单提交事件
        const form = document.getElementById('comparison-questionnaire-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 收集用户回答
            const answers = {};
            questions.forEach(question => {
                const selectedOption = document.querySelector(`input[name="${question.id}"]:checked`);
                if (selectedOption) {
                    answers[question.id] = selectedOption.value;
                }
            });
            
            // 检查是否有未回答的问题
            if (Object.keys(answers).length < questions.length) {
                alert('请回答所有问题');
                return;
            }
            
            // 关闭问卷对话框
            document.body.removeChild(dialogElement);
            
            // 显示加载状态
            const removeLoadingMessage = this.showLoadingMessage('AI正在评估目标优先级...');
            
            try {
                // 调用AI辅助模块评估比较结果
                const result = await TaskPixel.AI.evaluateComparisonResults(
                    selectedGoals,
                    answers,
                    questions
                );
                
                // 移除加载消息
                if (removeLoadingMessage) removeLoadingMessage();
                
                if (result && result.rankings) {
                    console.log('AI评估结果:', result);
                    
                    // 更新目标优先级
                    this.updateGoalPriorities(result.rankings);
                    
                    // 显示评估结果
                    this.showComparisonResultDialog(result);
                } else {
                    console.error('AI评估失败');
                    this.showErrorMessage('AI评估失败，请重试');
                }
            } catch (error) {
                console.error('评估目标优先级出错:', error);
                this.showErrorMessage('评估目标优先级时出错，请重试');
                
                // 移除加载消息
                if (removeLoadingMessage) removeLoadingMessage();
            }
        });
        
        // 绑定取消按钮事件
        const cancelButton = document.getElementById('cancel-questionnaire');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogElement);
        });
    },

    // 更新目标优先级
    updateGoalPriorities: function(rankings) {
        rankings.forEach(item => {
            const { goalId, taskId, priority, reason } = item;
            
            // 更新目标优先级
            TaskPixel.DataStore.updateGoal(taskId, goalId, {
                priority,
                priority_reason: reason
            });
        });
        
        // 刷新目标列表
        this.loadAllGoals();
    },

    // 显示比较结果对话框
    showComparisonResultDialog: function(result) {
        // 创建对话框元素
        const dialogElement = document.createElement('div');
        dialogElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        dialogElement.id = 'comparison-result-dialog';
        
        // 构建结果内容HTML
        const rankingsHtml = result.rankings.map((item, index) => {
            const priorityClass = this.getPriorityClass(item.priority);
            const priorityText = this.getPriorityText(item.priority);
            
            return `
                <div class="border-2 border-gray-200 p-4 ${index === 0 ? 'bg-yellow-50' : 'bg-white'} mb-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-lg">${index + 1}. ${item.title}</h4>
                            <p class="text-sm text-gray-600 mb-2">${item.description || '暂无描述'}</p>
                            <span class="inline-block px-2 py-1 text-xs ${priorityClass}">
                                ${priorityText}
                            </span>
                        </div>
                    </div>
                    <div class="mt-3 text-sm">
                        <p><strong>原因:</strong> ${item.reason}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        // 构建对话框内容
        dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <h2 class="text-2xl font-display mb-2">目标优先级评估结果</h2>
                <p class="text-gray-600 mb-6">AI已根据您的回答对目标进行了优先级排序</p>
                
                <div class="mb-4">
                    ${rankingsHtml}
                </div>
                
                <div class="mt-6 text-center">
                    <button id="close-result-dialog" class="pixel-button bg-primary text-white py-2 px-6">
                        确认
                    </button>
                </div>
            </div>
        `;
        
        // 将对话框添加到页面
        document.body.appendChild(dialogElement);
        
        // 绑定关闭按钮事件
        const closeButton = document.getElementById('close-result-dialog');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(dialogElement);
        });
    },

    // 获取优先级文本
    getPriorityText: function(priority) {
        switch (priority) {
            case '高':
            case 'high':
                return '高优先级';
            case '中':
            case 'medium':
                return '中优先级';
            case '低':
            case 'low':
                return '低优先级';
            default:
                return '未设置优先级';
        }
    },

    // 获取优先级样式类
    getPriorityClass: function(priority) {
        switch (priority) {
            case '高':
            case 'high':
                return 'bg-red-100 text-red-800 border border-red-800';
            case '中':
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-800';
            case '低':
            case 'low':
                return 'bg-blue-100 text-blue-800 border border-blue-800';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-800';
        }
    },

    // 事件处理函数
    handleGoalAdded: function(data) {
        this.loadAllGoals();
        this.loadAllTags();
    },

    handleGoalUpdated: function(data) {
        this.loadAllGoals();
        this.loadAllTags();
    },

    handleGoalDeleted: function(data) {
        this.loadAllGoals();
        this.loadAllTags();
    },

    // 显示成功消息
    showSuccessMessage: function(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'fixed bottom-4 right-4 bg-accent-green text-white px-4 py-2 rounded shadow-lg pixel-border z-50';
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 3000);
    },

    // 显示错误消息
    showErrorMessage: function(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'fixed bottom-4 right-4 bg-accent-red text-white px-4 py-2 rounded shadow-lg pixel-border z-50';
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 3000);
    },

    // 显示加载消息
    showLoadingMessage: function(message) {
        // 先移除可能存在的加载消息
        const existingMessage = document.getElementById('loading-message');
        if (existingMessage) {
            document.body.removeChild(existingMessage);
        }
        
        const messageElement = document.createElement('div');
        messageElement.id = 'loading-message
