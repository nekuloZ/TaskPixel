/**
 * TaskPixel 统一标签输入组件
 * 提供可复用的标签输入界面，支持多实例管理
 */

TaskPixel.TagInput = {
  // 组件实例管理
  instances: new Map(),
  activeInstance: null,

  // 防抖定时器
  debounceTimers: new Map(),

  // 配置选项
  defaultOptions: {
    placeholder: "输入标签名称...",
    debounceDelay: 300,
    maxSuggestions: 8,
    allowCreate: true,
    autoComplete: true,
    showUsageCount: true,
  },

  // 创建标签输入实例
  create: function (container, options = {}) {
    try {
      if (!container || !container.nodeType) {
        console.error("TagInput.create: 无效的容器元素");
        return null;
      }

      const instanceId = this._generateInstanceId();
      const config = { ...this.defaultOptions, ...options };

      // 创建实例数据
      const instance = {
        id: instanceId,
        container: container,
        config: config,
        isVisible: false,
        currentQuery: "",
        selectedIndex: -1,
        suggestions: [],
        elements: {},
      };

      // 创建DOM结构
      this._createElements(instance);
      this._bindEvents(instance);

      // 存储实例
      this.instances.set(instanceId, instance);

      console.log("TagInput实例创建成功:", instanceId);
      return instanceId;
    } catch (error) {
      console.error("TagInput.create: 创建实例失败", error);
      return null;
    }
  },

  // 销毁实例
  destroy: function (instanceId) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        console.warn("TagInput.destroy: 实例不存在", instanceId);
        return false;
      }

      // 清理事件监听器
      this._unbindEvents(instance);

      // 清理DOM
      if (instance.elements.wrapper && instance.elements.wrapper.parentNode) {
        instance.elements.wrapper.parentNode.removeChild(
          instance.elements.wrapper
        );
      }

      // 清理定时器
      if (this.debounceTimers.has(instanceId)) {
        clearTimeout(this.debounceTimers.get(instanceId));
        this.debounceTimers.delete(instanceId);
      }

      // 移除实例
      this.instances.delete(instanceId);

      if (this.activeInstance === instanceId) {
        this.activeInstance = null;
      }

      console.log("TagInput实例销毁成功:", instanceId);
      return true;
    } catch (error) {
      console.error("TagInput.destroy: 销毁实例失败", error);
      return false;
    }
  },

  // 显示输入框
  show: function (instanceId) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        console.warn("TagInput.show: 实例不存在", instanceId);
        return false;
      }

      // 隐藏其他实例
      this._hideAll();

      // 显示当前实例
      instance.elements.addButton.classList.add("hidden");
      instance.elements.wrapper.classList.remove("hidden");
      instance.isVisible = true;
      this.activeInstance = instanceId;

      // 聚焦输入框
      setTimeout(() => {
        instance.elements.input.focus();
      }, 50);

      return true;
    } catch (error) {
      console.error("TagInput.show: 显示失败", error);
      return false;
    }
  },

  // 隐藏输入框
  hide: function (instanceId) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        console.warn("TagInput.hide: 实例不存在", instanceId);
        return false;
      }

      instance.elements.addButton.classList.remove("hidden");
      instance.elements.wrapper.classList.add("hidden");
      instance.elements.suggestions.classList.add("hidden");
      instance.elements.input.value = "";
      instance.isVisible = false;
      instance.currentQuery = "";
      instance.selectedIndex = -1;
      instance.suggestions = [];

      if (this.activeInstance === instanceId) {
        this.activeInstance = null;
      }

      return true;
    } catch (error) {
      console.error("TagInput.hide: 隐藏失败", error);
      return false;
    }
  },

  // 处理输入
  handleInput: function (instanceId, value) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      instance.currentQuery = value.trim();

      // 清除之前的防抖定时器
      if (this.debounceTimers.has(instanceId)) {
        clearTimeout(this.debounceTimers.get(instanceId));
      }

      // 设置新的防抖定时器
      this.debounceTimers.set(
        instanceId,
        setTimeout(() => {
          this._performSearch(instance);
        }, instance.config.debounceDelay)
      );
    } catch (error) {
      console.error("TagInput.handleInput: 处理输入失败", error);
    }
  },

  // 处理键盘事件
  handleKeyboard: function (instanceId, event) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          this.hide(instanceId);
          break;

        case "Enter":
          event.preventDefault();
          this._handleEnterKey(instance);
          break;

        case "ArrowDown":
          event.preventDefault();
          this._navigateSuggestions(instance, 1);
          break;

        case "ArrowUp":
          event.preventDefault();
          this._navigateSuggestions(instance, -1);
          break;

        case "Tab":
          if (instance.suggestions.length > 0 && instance.selectedIndex >= 0) {
            event.preventDefault();
            this._selectSuggestion(instance, instance.selectedIndex);
          }
          break;
      }
    } catch (error) {
      console.error("TagInput.handleKeyboard: 处理键盘事件失败", error);
    }
  },

  // 显示建议
  showSuggestions: function (instanceId, suggestions) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      instance.suggestions = suggestions || [];
      instance.selectedIndex = -1;

      this._renderSuggestions(instance);
    } catch (error) {
      console.error("TagInput.showSuggestions: 显示建议失败", error);
    }
  },

  // 隐藏建议
  hideSuggestions: function (instanceId) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      instance.elements.suggestions.classList.add("hidden");
      instance.suggestions = [];
      instance.selectedIndex = -1;
    } catch (error) {
      console.error("TagInput.hideSuggestions: 隐藏建议失败", error);
    }
  },

  // 选择建议
  selectSuggestion: function (instanceId, tagId) {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      // 触发选择事件
      this._triggerSelectEvent(instance, tagId);

      // 隐藏输入框
      this.hide(instanceId);
    } catch (error) {
      console.error("TagInput.selectSuggestion: 选择建议失败", error);
    }
  },

  // 私有方法：生成实例ID
  _generateInstanceId: function () {
    return (
      "tag-input-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5)
    );
  },

  // 私有方法：创建DOM元素
  _createElements: function (instance) {
    const container = instance.container;

    // 创建添加按钮
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "add-tags-btn";
    addButton.textContent = "+Tags";

    // 创建输入包装器
    const wrapper = document.createElement("div");
    wrapper.className = "tag-input-wrapper hidden";

    // 创建输入框
    const input = document.createElement("input");
    input.type = "text";
    input.className = "tag-input-field";
    input.placeholder = instance.config.placeholder;
    input.autocomplete = "off";

    // 创建建议容器
    const suggestions = document.createElement("div");
    suggestions.className = "tag-suggestions hidden";

    // 组装DOM结构
    wrapper.appendChild(input);
    wrapper.appendChild(suggestions);
    container.appendChild(addButton);
    container.appendChild(wrapper);

    // 存储元素引用
    instance.elements = {
      addButton: addButton,
      wrapper: wrapper,
      input: input,
      suggestions: suggestions,
    };
  },

  // 私有方法：绑定事件
  _bindEvents: function (instance) {
    const instanceId = instance.id;

    // 添加按钮点击事件
    instance.elements.addButton.addEventListener("click", () => {
      this.show(instanceId);
    });

    // 输入框事件
    instance.elements.input.addEventListener("input", (e) => {
      this.handleInput(instanceId, e.target.value);
    });

    instance.elements.input.addEventListener("keydown", (e) => {
      this.handleKeyboard(instanceId, e);
    });

    instance.elements.input.addEventListener("blur", (e) => {
      // 延迟隐藏，允许点击建议项
      setTimeout(() => {
        if (this.activeInstance === instanceId) {
          this.hide(instanceId);
        }
      }, 150);
    });

    // 建议容器事件
    instance.elements.suggestions.addEventListener("mousedown", (e) => {
      e.preventDefault(); // 防止输入框失去焦点
    });

    instance.elements.suggestions.addEventListener("click", (e) => {
      const suggestionItem = e.target.closest(".tag-suggestion-item");
      if (suggestionItem) {
        const tagId = suggestionItem.dataset.tagId;
        const isCreateNew = suggestionItem.dataset.createNew === "true";

        if (isCreateNew) {
          this._createAndSelectTag(instance, suggestionItem.dataset.tagName);
        } else {
          this.selectSuggestion(instanceId, tagId);
        }
      }
    });
  },

  // 私有方法：解绑事件
  _unbindEvents: function (instance) {
    // 由于使用了箭头函数和匿名函数，这里主要是清理DOM元素
    // 实际的事件监听器会在DOM元素被移除时自动清理
  },

  // 私有方法：隐藏所有实例
  _hideAll: function () {
    this.instances.forEach((instance, instanceId) => {
      if (instance.isVisible) {
        this.hide(instanceId);
      }
    });
  },

  // 私有方法：执行搜索
  _performSearch: function (instance) {
    try {
      const query = instance.currentQuery;

      if (!query) {
        this.hideSuggestions(instance.id);
        return;
      }

      // 搜索现有标签
      const existingTags = TaskPixel.TagManager.searchTags(query);
      const suggestions = [];

      // 添加现有标签建议
      existingTags
        .slice(0, instance.config.maxSuggestions - 1)
        .forEach((tag) => {
          suggestions.push({
            type: "existing",
            tag: tag,
            displayText:
              tag.display_text +
              (instance.config.showUsageCount && tag.usage_count > 0
                ? ` (${tag.usage_count})`
                : ""),
          });
        });

      // 检查是否需要添加"创建新标签"选项
      if (instance.config.allowCreate) {
        const exactMatch = existingTags.find(
          (tag) => tag.name.toLowerCase() === query.toLowerCase()
        );

        if (!exactMatch && TaskPixel.TagValidator) {
          const validation = TaskPixel.TagValidator.validateTagName(query);
          if (validation.isValid) {
            suggestions.push({
              type: "create",
              tagName: validation.sanitized,
              displayText: `创建新标签: #${validation.sanitized}`,
            });
          }
        }
      }

      this.showSuggestions(instance.id, suggestions);
    } catch (error) {
      console.error("TagInput._performSearch: 搜索失败", error);
    }
  },

  // 私有方法：渲染建议
  _renderSuggestions: function (instance) {
    const suggestionsContainer = instance.elements.suggestions;

    if (instance.suggestions.length === 0) {
      suggestionsContainer.classList.add("hidden");
      return;
    }

    suggestionsContainer.innerHTML = "";

    instance.suggestions.forEach((suggestion, index) => {
      const item = document.createElement("div");
      item.className = "tag-suggestion-item";

      if (suggestion.type === "existing") {
        item.dataset.tagId = suggestion.tag.id;
        item.style.color = suggestion.tag.color || "#374151";
      } else if (suggestion.type === "create") {
        item.dataset.createNew = "true";
        item.dataset.tagName = suggestion.tagName;
      }

      item.textContent = suggestion.displayText;

      // 高亮选中项
      if (index === instance.selectedIndex) {
        item.classList.add("selected");
      }

      suggestionsContainer.appendChild(item);
    });

    suggestionsContainer.classList.remove("hidden");
  },

  // 私有方法：导航建议
  _navigateSuggestions: function (instance, direction) {
    if (instance.suggestions.length === 0) return;

    const newIndex = instance.selectedIndex + direction;

    if (newIndex >= 0 && newIndex < instance.suggestions.length) {
      instance.selectedIndex = newIndex;
    } else if (newIndex < 0) {
      instance.selectedIndex = instance.suggestions.length - 1;
    } else {
      instance.selectedIndex = 0;
    }

    this._renderSuggestions(instance);
  },

  // 私有方法：处理回车键
  _handleEnterKey: function (instance) {
    if (instance.suggestions.length > 0 && instance.selectedIndex >= 0) {
      const suggestion = instance.suggestions[instance.selectedIndex];

      if (suggestion.type === "existing") {
        this.selectSuggestion(instance.id, suggestion.tag.id);
      } else if (suggestion.type === "create") {
        this._createAndSelectTag(instance, suggestion.tagName);
      }
    } else if (instance.currentQuery && instance.config.allowCreate) {
      // 直接创建标签
      this._createAndSelectTag(instance, instance.currentQuery);
    }
  },

  // 私有方法：选择建议项
  _selectSuggestion: function (instance, index) {
    if (index >= 0 && index < instance.suggestions.length) {
      const suggestion = instance.suggestions[index];

      if (suggestion.type === "existing") {
        this.selectSuggestion(instance.id, suggestion.tag.id);
      } else if (suggestion.type === "create") {
        this._createAndSelectTag(instance, suggestion.tagName);
      }
    }
  },

  // 私有方法：创建并选择标签
  _createAndSelectTag: function (instance, tagName) {
    try {
      const result = TaskPixel.TagManager.createTag({ name: tagName });

      if (result.success) {
        this._triggerSelectEvent(instance, result.tagId);
        this.hide(instance.id);
      } else if (result.error && result.error.code === "DUPLICATE_TAG") {
        // 如果标签已存在，选择现有标签
        this._triggerSelectEvent(instance, result.tagId);
        this.hide(instance.id);
      } else {
        console.error("创建标签失败:", result.error);
        // 显示错误消息
        this._showError(
          instance,
          result.error ? result.error.message : "创建标签失败"
        );
      }
    } catch (error) {
      console.error("TagInput._createAndSelectTag: 创建标签失败", error);
      this._showError(instance, "创建标签时发生错误");
    }
  },

  // 私有方法：触发选择事件
  _triggerSelectEvent: function (instance, tagId) {
    try {
      const event = new CustomEvent("tagSelected", {
        detail: {
          instanceId: instance.id,
          tagId: tagId,
          container: instance.container,
        },
      });

      instance.container.dispatchEvent(event);
    } catch (error) {
      console.error("TagInput._triggerSelectEvent: 触发事件失败", error);
    }
  },

  // 私有方法：显示错误
  _showError: function (instance, message) {
    // 简单的错误显示，可以根据需要改进
    const errorElement = document.createElement("div");
    errorElement.className = "tag-input-error";
    errorElement.textContent = message;
    errorElement.style.cssText =
      "color: red; font-size: 12px; margin-top: 4px;";

    instance.elements.wrapper.appendChild(errorElement);

    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement);
      }
    }, 3000);
  },

  // 全局事件处理：点击外部隐藏
  init: function () {
    document.addEventListener("click", (e) => {
      // 如果点击的不是标签输入相关元素，隐藏所有实例
      if (!e.target.closest(".tags-input-container")) {
        this._hideAll();
      }
    });

    console.log("TagInput组件初始化完成");
  },
};
