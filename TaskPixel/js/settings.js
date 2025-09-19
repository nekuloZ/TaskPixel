/**
 * TaskPixel 设置页面功能模块
 * 提供个人信息管理、应用首选项设置和账户管理功能
 */

TaskPixel.Settings = {
    // DOM元素引用
    elements: {
        nameInput: null,
        emailInput: null,
        themeSelect: null,
        notificationsRadios: null,
        changePasswordButton: null,
        deleteAccountButton: null,
        exportDataButton: null,
        importDataButton: null,
        saveSettingsButton: null
    },
    
    // 初始化设置页面功能
    init: function() {
        this.cacheElements();
        this.loadSettings();
        this.bindEvents();
        console.log('设置页面功能模块初始化完成');
    },
    
    // 缓存DOM元素引用
    cacheElements: function() {
        this.elements.nameInput = document.getElementById('name');
        this.elements.emailInput = document.getElementById('email');
        this.elements.themeSelect = document.getElementById('theme');
        this.elements.notificationsRadios = document.querySelectorAll('input[name="notifications"]');
        this.elements.changePasswordButton = document.querySelector('.change-password-button');
        this.elements.deleteAccountButton = document.querySelector('.delete-account-button');
        this.elements.exportDataButton = document.querySelector('.export-data-button') || this.createExportButton();
        this.elements.importDataButton = document.querySelector('.import-data-button') || this.createImportButton();
        this.elements.saveSettingsButton = document.querySelector('.save-settings-button') || this.createSaveButton();
    },
    
    // 创建导出按钮（如果页面中不存在）
    createExportButton: function() {
        // 查找合适的位置插入按钮
        const accountSection = document.querySelector('section:last-child');
        if (!accountSection) return null;
        
        // 创建数据管理区域
        const dataManagementDiv = document.createElement('div');
        dataManagementDiv.className = 'mt-6';
        
        // 添加标题
        const title = document.createElement('h3');
        title.className = 'text-2xl font-display font-bold mb-4 border-b-2 border-black pb-2';
        title.textContent = '数据管理';
        
        // 创建按钮容器
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'flex flex-col sm:flex-row gap-4';
        
        // 创建导出按钮
        const exportButton = document.createElement('button');
        exportButton.className = 'w-full sm:w-auto px-6 py-2 pixel-button text-lg font-bold export-data-button';
        exportButton.textContent = '导出数据';
        
        // 创建导入按钮
        const importButton = document.createElement('button');
        importButton.className = 'w-full sm:w-auto px-6 py-2 pixel-button text-lg font-bold import-data-button';
        importButton.textContent = '导入数据';
        
        // 组装DOM
        buttonsDiv.appendChild(exportButton);
        buttonsDiv.appendChild(importButton);
        dataManagementDiv.appendChild(title);
        dataManagementDiv.appendChild(buttonsDiv);
        
        // 添加到页面
        accountSection.after(dataManagementDiv);
        
        return exportButton;
    },
    
    // 创建导入按钮（如果页面中不存在）
    createImportButton: function() {
        // 如果已经创建了导出按钮，那么导入按钮也已经创建
        return document.querySelector('.import-data-button');
    },
    
    // 创建保存按钮（如果页面中不存在）
    createSaveButton: function() {
        // 查找合适的位置插入按钮
        const settingsContainer = document.querySelector('.max-w-2xl');
        if (!settingsContainer) return null;
        
        // 创建保存按钮容器
        const saveButtonDiv = document.createElement('div');
        saveButtonDiv.className = 'mt-8 text-center';
        
        // 创建保存按钮
        const saveButton = document.createElement('button');
        saveButton.className = 'px-8 py-3 pixel-button pixel-button-primary text-lg font-bold save-settings-button';
        saveButton.textContent = '保存设置';
        
        // 组装DOM
        saveButtonDiv.appendChild(saveButton);
        
        // 添加到页面
        settingsContainer.appendChild(saveButtonDiv);
        
        return saveButton;
    },
    
    // 创建隐藏的文件输入元素（用于导入）
    createFileInput: function() {
        // 检查是否已存在
        let fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            return fileInput;
        }
        
        // 创建文件输入元素
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'import-file-input';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        // 添加到页面
        document.body.appendChild(fileInput);
        
        return fileInput;
    },
    
    // 绑定事件处理函数
    bindEvents: function() {
        // 保存设置按钮
        if (this.elements.saveSettingsButton) {
            this.elements.saveSettingsButton.addEventListener('click', this.saveSettings.bind(this));
        }
        
        // 导出数据按钮
        if (this.elements.exportDataButton) {
            this.elements.exportDataButton.addEventListener('click', this.exportData.bind(this));
        }
        
        // 导入数据按钮
        if (this.elements.importDataButton) {
            this.elements.importDataButton.addEventListener('click', this.importData.bind(this));
        }
        
        // 修改密码按钮
        if (this.elements.changePasswordButton) {
            this.elements.changePasswordButton.addEventListener('click', this.showChangePasswordDialog.bind(this));
        }
        
        // 删除账户按钮
        if (this.elements.deleteAccountButton) {
            this.elements.deleteAccountButton.addEventListener('click', this.showDeleteAccountDialog.bind(this));
        }
    },
    
    // 加载设置
    loadSettings: function() {
        // 获取用户设置
        const settings = TaskPixel.DataStore.getSettings();
        
        // 填充表单
        if (this.elements.nameInput) {
            this.elements.nameInput.value = settings.username || '';
        }
        
        if (this.elements.emailInput) {
            this.elements.emailInput.value = settings.email || '';
        }
        
        if (this.elements.themeSelect) {
            const themeOption = Array.from(this.elements.themeSelect.options).find(option => option.value === settings.theme);
            if (themeOption) {
                themeOption.selected = true;
            }
        }
        
        if (this.elements.notificationsRadios.length > 0) {
            const notificationRadio = Array.from(this.elements.notificationsRadios).find(radio => radio.value === settings.notifications);
            if (notificationRadio) {
                notificationRadio.checked = true;
            }
        }
    },
    
    // 保存设置
    saveSettings: function() {
        // 收集表单数据
        const settings = {
            username: this.elements.nameInput ? this.elements.nameInput.value.trim() : '',
            email: this.elements.emailInput ? this.elements.emailInput.value.trim() : '',
            theme: this.elements.themeSelect ? this.elements.themeSelect.value : 'light',
            notifications: 'all'
        };
        
        // 获取选中的通知选项
        if (this.elements.notificationsRadios.length > 0) {
            const checkedRadio = Array.from(this.elements.notificationsRadios).find(radio => radio.checked);
            if (checkedRadio) {
                settings.notifications = checkedRadio.value;
            }
        }
        
        // 更新设置
        const updated = TaskPixel.DataStore.updateSettings(settings);
        
        if (updated) {
            console.log('设置已保存:', settings);
            this.showSuccessMessage('设置已保存');
            
            // 应用主题
            this.applyTheme(settings.theme);
        } else {
            console.error('保存设置失败');
            this.showErrorMessage('保存设置失败，请重试');
        }
    },
    
    // 应用主题
    applyTheme: function(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },
    
    // 导出数据
    exportData: function() {
        const exported = TaskPixel.DataStore.exportData();
        
        if (exported) {
            this.showSuccessMessage('数据导出成功');
        } else {
            this.showErrorMessage('数据导出失败，请重试');
        }
    },
    
    // 导入数据
    importData: function() {
        const fileInput = this.createFileInput();
        
        // 设置文件选择回调
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const jsonData = event.target.result;
                    const imported = TaskPixel.DataStore.importData(jsonData);
                    
                    if (imported) {
                        this.showSuccessMessage('数据导入成功');
                        this.loadSettings(); // 重新加载设置
                    } else {
                        this.showErrorMessage('数据导入失败，请检查文件格式');
                    }
                } catch (error) {
                    console.error('导入数据出错:', error);
                    this.showErrorMessage('导入数据出错，请检查文件格式');
                }
            };
            
            reader.readAsText(file);
            
            // 重置文件输入，以便可以选择同一个文件
            fileInput.value = '';
        };
        
        // 触发文件选择对话框
        fileInput.click();
    },
    
    // 显示修改密码对话框
    showChangePasswordDialog: function() {
        // 创建对话框元素
        const dialogElement = document.createElement('div');
        dialogElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        dialogElement.id = 'change-password-dialog';
        
        // 构建对话框内容
        dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-md">
                <h2 class="text-2xl font-display mb-6">修改密码</h2>
                <form id="change-password-form">
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="current-password">当前密码</label>
                        <input type="password" id="current-password" class="w-full" required placeholder="输入当前密码">
                    </div>
                    <div class="mb-4">
                        <label class="block font-display text-lg mb-2" for="new-password">新密码</label>
                        <input type="password" id="new-password" class="w-full" required placeholder="输入新密码">
                    </div>
                    <div class="mb-6">
                        <label class="block font-display text-lg mb-2" for="confirm-password">确认新密码</label>
                        <input type="password" id="confirm-password" class="w-full" required placeholder="再次输入新密码">
                    </div>
                    <div class="flex justify-end gap-4">
                        <button type="button" id="cancel-change-password" class="pixel-button">取消</button>
                        <button type="submit" class="pixel-button bg-primary text-white">保存</button>
                    </div>
                </form>
            </div>
        `;
        
        // 将对话框添加到页面
        document.body.appendChild(dialogElement);
        
        // 绑定表单提交事件
        const form = document.getElementById('change-password-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // 检查密码是否匹配
            if (newPassword !== confirmPassword) {
                alert('新密码与确认密码不匹配');
                return;
            }
            
            // 由于这是演示应用，没有实际的密码管理，只显示成功消息
            this.showSuccessMessage('密码已修改');
            
            // 关闭对话框
            document.body.removeChild(dialogElement);
        });
        
        // 绑定取消按钮事件
        const cancelButton = document.getElementById('cancel-change-password');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogElement);
        });
        
        // 绑定ESC键关闭对话框
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(dialogElement);
                document.removeEventListener('keydown', escHandler);
            }
        };
        
        document.addEventListener('keydown', escHandler);
    },
    
    // 显示删除账户对话框
    showDeleteAccountDialog: function() {
        // 创建对话框元素
        const dialogElement = document.createElement('div');
        dialogElement.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        dialogElement.id = 'delete-account-dialog';
        
        // 构建对话框内容
        dialogElement.innerHTML = `
            <div class="pixel-border bg-white p-6 w-full max-w-md">
                <h2 class="text-2xl font-display mb-2 text-red-600">删除账户</h2>
                <p class="mb-6 text-gray-700">此操作将永久删除您的账户和所有数据，且无法恢复。</p>
                <div class="mb-6">
                    <label class="block font-display text-lg mb-2" for="confirm-delete">请输入"DELETE"确认删除</label>
                    <input type="text" id="confirm-delete" class="w-full" required placeholder="DELETE">
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" id="cancel-delete-account" class="pixel-button">取消</button>
                    <button type="button" id="confirm-delete-account" class="pixel-button bg-accent-red text-white">删除账户</button>
                </div>
            </div>
        `;
        
        // 将对话框添加到页面
        document.body.appendChild(dialogElement);
        
        // 绑定确认按钮事件
        const confirmButton = document.getElementById('confirm-delete-account');
        confirmButton.addEventListener('click', () => {
            const confirmText = document.getElementById('confirm-delete').value;
            
            if (confirmText === 'DELETE') {
                // 由于这是演示应用，清空所有数据
                TaskPixel.DataStore.importData('{"tasks":[],"settings":{}}');
                
                this.showSuccessMessage('账户已删除');
                
                // 关闭对话框
                document.body.removeChild(dialogElement);
                
                // 延迟跳转到首页
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                alert('请输入"DELETE"确认删除');
            }
        });
        
        // 绑定取消按钮事件
        const cancelButton = document.getElementById('cancel-delete-account');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogElement);
        });
        
        // 绑定ESC键关闭对话框
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(dialogElement);
                document.removeEventListener('keydown', escHandler);
            }
        };
        
        document.addEventListener('keydown', escHandler);
    },
    
    // 显示成功消息
    showSuccessMessage: function(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg pixel-border z-50';
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 3000);
    },
    
    // 显示错误消息
    showErrorMessage: function(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg pixel-border z-50';
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 3000);
    }
};
