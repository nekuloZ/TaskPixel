/**
 * TaskPixel 标签验证服务
 * 提供标签数据验证、清理和规范化功能
 */

TaskPixel.TagValidator = {
  // 验证规则配置
  rules: {
    name: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[\w\u4e00-\u9fa5\s-]+$/,
      required: true,
    },
    color: {
      pattern: /^#[0-9A-Fa-f]{6}$/,
      required: false,
    },
    description: {
      maxLength: 200,
      required: false,
    },
  },

  // 验证标签名称
  validateTagName: function (name) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: null,
    };

    if (!name || typeof name !== "string") {
      result.isValid = false;
      result.errors.push("标签名称是必需的");
      return result;
    }

    const sanitized = this.sanitizeTagName(name);
    result.sanitized = sanitized;

    if (sanitized.length < this.rules.name.minLength) {
      result.isValid = false;
      result.errors.push(`标签名称至少需要${this.rules.name.minLength}个字符`);
    }

    if (sanitized.length > this.rules.name.maxLength) {
      result.isValid = false;
      result.errors.push(`标签名称不能超过${this.rules.name.maxLength}个字符`);
    }

    if (!this.rules.name.pattern.test(sanitized)) {
      result.isValid = false;
      result.errors.push(
        "标签名称包含无效字符，只允许字母、数字、中文、空格和连字符"
      );
    }

    return result;
  },

  // 验证标签颜色
  validateTagColor: function (color) {
    const result = {
      isValid: true,
      errors: [],
    };

    if (color && !this.rules.color.pattern.test(color)) {
      result.isValid = false;
      result.errors.push("标签颜色格式无效，应为#RRGGBB格式");
    }

    return result;
  },

  // 验证完整标签数据
  validateTagData: function (data) {
    const result = {
      isValid: true,
      errors: [],
      sanitized: {},
    };

    if (!data || typeof data !== "object") {
      result.isValid = false;
      result.errors.push("标签数据必须是对象");
      return result;
    }

    // 验证名称
    const nameValidation = this.validateTagName(data.name);
    if (!nameValidation.isValid) {
      result.isValid = false;
      result.errors.push(...nameValidation.errors);
    } else {
      result.sanitized.name = nameValidation.sanitized;
      result.sanitized.display_text = "#" + nameValidation.sanitized;
    }

    // 验证颜色
    const colorValidation = this.validateTagColor(data.color);
    if (!colorValidation.isValid) {
      result.isValid = false;
      result.errors.push(...colorValidation.errors);
    } else if (data.color) {
      result.sanitized.color = data.color;
    }

    // 验证描述
    if (data.description) {
      if (typeof data.description !== "string") {
        result.errors.push("标签描述必须是字符串");
        result.isValid = false;
      } else if (data.description.length > this.rules.description.maxLength) {
        result.errors.push(
          `标签描述不能超过${this.rules.description.maxLength}个字符`
        );
        result.isValid = false;
      } else {
        result.sanitized.description = data.description.trim();
      }
    }

    return result;
  },

  // 清理标签名称
  sanitizeTagName: function (name) {
    if (!name || typeof name !== "string") return "";

    return name
      .replace(/^#/, "") // 移除开头的#
      .trim() // 移除前后空格
      .replace(/\s+/g, " ") // 合并多个空格为单个空格
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, "") // 移除无效字符
      .substring(0, this.rules.name.maxLength); // 限制长度
  },

  // 规范化标签数据
  normalizeTagData: function (data) {
    if (!data || typeof data !== "object") {
      return null;
    }

    const normalized = {
      id: data.id || TaskPixel.DataStore.generateId(),
      name: this.sanitizeTagName(data.name),
      color: data.color || TaskPixel.TagManager.getRandomColor(),
      description: (data.description || "").trim(),
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: Math.max(0, parseInt(data.usage_count) || 0),
    };

    normalized.display_text = "#" + normalized.name;

    return normalized;
  },

  // 检查重复标签
  checkDuplicates: function (name, excludeId = null) {
    if (!name) return null;

    try {
      const sanitizedName = this.sanitizeTagName(name);
      const allTags = TaskPixel.TagManager.getAllTags();

      return (
        allTags.find(
          (tag) =>
            tag.id !== excludeId &&
            tag.name.toLowerCase() === sanitizedName.toLowerCase()
        ) || null
      );
    } catch (error) {
      console.error("检查重复标签时发生错误:", error);
      return null;
    }
  },

  // 建议替代名称
  suggestAlternatives: function (name) {
    if (!name) return [];

    try {
      const baseName = this.sanitizeTagName(name);
      const suggestions = [];

      // 添加数字后缀
      for (let i = 2; i <= 5; i++) {
        const suggestion = `${baseName}${i}`;
        if (!this.checkDuplicates(suggestion)) {
          suggestions.push(suggestion);
        }
      }

      // 添加描述性后缀
      const suffixes = ["新", "备用", "临时", "项目"];
      for (const suffix of suffixes) {
        const suggestion = `${baseName}-${suffix}`;
        if (!this.checkDuplicates(suggestion)) {
          suggestions.push(suggestion);
        }
      }

      return suggestions.slice(0, 3); // 最多返回3个建议
    } catch (error) {
      console.error("生成替代名称时发生错误:", error);
      return [];
    }
  },

  // 批量验证标签数据
  validateBatch: function (tagDataArray) {
    if (!Array.isArray(tagDataArray)) {
      return {
        isValid: false,
        errors: ["输入必须是数组"],
        results: [],
      };
    }

    const results = tagDataArray.map((data, index) => {
      const validation = this.validateTagData(data);
      return {
        index: index,
        data: data,
        validation: validation,
      };
    });

    const hasErrors = results.some((r) => !r.validation.isValid);

    return {
      isValid: !hasErrors,
      errors: hasErrors ? ["批量验证中发现错误"] : [],
      results: results,
    };
  },
};
