/**
 * TaskPixel AI辅助模块
 * 提供与Ollama API的通信，实现AI功能
 */

// AI辅助功能命名空间
TaskPixel.AI = {
  // Ollama API配置
  config: {
    baseUrl: "http://localhost:11434/api",
    model: "hf.co/unsloth/gpt-oss-20b-GGUF:Q5_K_M", // 默认模型
    temperature: 0.7, // 创造性和一致性的平衡
    maxTokens: 2042, // 生成的最大token数
  },

  // 初始化AI模块
  init: function () {
    console.log("AI辅助模块初始化完成");
  },

  /**
   * 发送请求到Ollama API
   * @param {string} prompt - 提示词
   * @param {object} options - 其他选项
   * @returns {Promise} - 返回Promise对象
   */
  sendRequest: async function (prompt, options = {}) {
    const requestOptions = {
      ...this.config,
      ...options,
    };

    try {
      const response = await fetch(`${requestOptions.baseUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: requestOptions.model,
          prompt: prompt,
          temperature: requestOptions.temperature,
          max_tokens: requestOptions.maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.response || ""; // Ollama API返回格式的响应字段
    } catch (error) {
      console.error("AI请求错误:", error);
      throw error;
    }
  },

  /**
   * 评估目标优先级
   * @param {string} taskTitle - 任务标题
   * @param {string} taskDescription - 任务描述
   * @param {string} goalTitle - 目标标题
   * @param {string} goalDescription - 目标描述
   * @param {string} userDescription - 用户描述的当前情况或困难（可选）
   * @returns {Promise} - 返回包含优先级和原因的Promise
   */
  evaluateGoalPriority: async function (
    taskTitle,
    taskDescription,
    goalTitle,
    goalDescription,
    userDescription = ""
  ) {
    const prompt = `
            你是一个任务管理专家AI助手。请评估以下目标的优先级。
            
            任务标题: ${taskTitle}
            任务描述: ${taskDescription}
            
            目标标题: ${goalTitle}
            目标描述: ${goalDescription}
            
            ${userDescription ? `用户当前情况描述: ${userDescription}` : ""}
            
            ${
              userDescription ? "请主要根据用户描述的当前情况，" : "请"
            }根据重要性和紧急性评估此目标的优先级(高、中、低)，并简要说明原因。
            请使用以下JSON格式回答:
            {
                "priority": "高/中/低",
                "reason": "原因解释..."
            }
        `;

    try {
      const response = await this.sendRequest(prompt);
      let jsonResponse = null;

      // 如果是纯 JSON
      try {
        jsonResponse = JSON.parse(response);
      } catch (e) {
        // 尝试提取首个 JSON 对象块
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            jsonResponse = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.warn("解析截取的JSON失败，response:", response);
          }
        } else {
          console.warn("未找到 JSON 块，AI 原始输出:", response);
        }
      }

      if (jsonResponse && jsonResponse.priority) {
        return {
          priority: jsonResponse.priority,
          reason:
            jsonResponse.reason ||
            this.getDefaultPriorityReason(jsonResponse.priority),
        };
      }

      // 文本解析回退
      if (response.includes("高"))
        return { priority: "高", reason: response.trim() };
      if (response.includes("低"))
        return { priority: "低", reason: response.trim() };
      return {
        priority: "中",
        reason: response.trim() || this.getDefaultPriorityReason("中"),
      };
    } catch (error) {
      console.error("评估优先级出错:", error);
      return { priority: "中", reason: this.getDefaultPriorityReason("中") };
    }
  },

  /**
   * 为任务生成目标和子步骤
   * @param {string} taskTitle - 任务标题
   * @param {string} taskDescription - 任务描述
   * @param {string} userDescription - 用户描述的当前情况或困难（可选）
   * @returns {Promise} - 返回包含目标和子步骤的Promise
   */
  generateGoalsAndSubsteps: async function (
    taskTitle,
    taskDescription,
    userDescription = ""
  ) {
    const prompt = `
            你是一个任务分解专家AI助手。请为以下任务生成目标和子步骤。
            
            任务标题: ${taskTitle}
            任务描述: ${taskDescription}
            
            ${userDescription ? `用户当前情况描述: ${userDescription}` : ""}
            
            ${
              userDescription ? "请主要根据用户描述的当前情况，" : "请"
            }生成3-5个明确的目标，每个目标包含2-4个具体可执行的子步骤。
            请使用以下JSON格式回答:
            {
                "goals": [
                    {
                        "title": "目标1标题",
                        "description": "目标1描述",
                        "substeps": ["子步骤1", "子步骤2", "子步骤3"]
                    },
                    {
                        "title": "目标2标题",
                        "description": "目标2描述",
                        "substeps": ["子步骤1", "子步骤2"]
                    }
                ]
            }
        `;

    try {
      const response = await this.sendRequest(prompt);

      // 尝试解析JSON响应
      try {
        // 提取响应中的JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          return jsonResponse.goals;
        }

        // 如果没有找到JSON格式，返回默认目标
        return [
          {
            title: "分析任务需求",
            description: "详细了解任务的具体要求和期望",
            substeps: ["列出任务关键点", "确认任务优先级", "设置完成标准"],
          },
        ];
      } catch (parseError) {
        console.error("解析AI响应出错:", parseError);
        return [
          {
            title: "分析任务需求",
            description: "详细了解任务的具体要求和期望",
            substeps: ["列出任务关键点", "确认任务优先级", "设置完成标准"],
          },
        ];
      }
    } catch (error) {
      console.error("生成目标和子步骤出错:", error);
      return [
        {
          title: "分析任务需求",
          description: "详细了解任务的具体要求和期望",
          substeps: ["列出任务关键点", "确认任务优先级", "设置完成标准"],
        },
      ];
    }
  },

  /**
   * 根据任务数据生成下一步行动建议
   * @param {object} taskData - 任务数据
   * @returns {Promise} - 返回包含行动建议的Promise
   */
  suggestNextActions: async function (taskData) {
    // 构建任务信息
    const goalsInfo = taskData.goals.map((goal) => {
      const completedSubsteps = goal.substeps.filter((s) => s.completed).length;
      const totalSubsteps = goal.substeps.length;

      return {
        title: goal.title,
        progress:
          totalSubsteps > 0
            ? Math.round((completedSubsteps / totalSubsteps) * 100)
            : 0,
        substeps: goal.substeps.map((s) => ({
          content: s.content,
          completed: s.completed,
        })),
      };
    });

    const prompt = `
            你是一个任务管理专家AI助手。根据以下任务的当前状态，请推荐接下来最应该优先执行的2-3个行动。
            
            任务标题: ${taskData.title}
            任务描述: ${taskData.description}
            任务进度: ${taskData.progress}%
            
            当前目标和子步骤:
            ${JSON.stringify(goalsInfo, null, 2)}
            
            考虑现有进度、优先级和最佳实践，推荐接下来的具体行动。
            请使用以下JSON格式回答:
            {
                "nextActions": [
                    {
                        "action": "建议的具体行动1",
                        "reason": "推荐原因"
                    },
                    {
                        "action": "建议的具体行动2",
                        "reason": "推荐原因"
                    }
                ]
            }
        `;

    try {
      const response = await this.sendRequest(prompt);

      // 尝试解析JSON响应
      try {
        // 提取响应中的JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          return jsonResponse.nextActions;
        }

        // 如果没有找到JSON格式，进行文本解析
        return [
          {
            action: "继续完成未完成的子步骤",
            reason: "根据任务进度分析",
          },
        ];
      } catch (parseError) {
        console.error("解析AI响应出错:", parseError);
        return [
          {
            action: "继续完成未完成的子步骤",
            reason: "根据任务进度分析",
          },
        ];
      }
    } catch (error) {
      console.error("生成行动建议出错:", error);
      return [
        {
          action: "继续完成未完成的子步骤",
          reason: "由于技术原因无法获取AI建议，已设置为默认建议。",
        },
      ];
    }
  },

  /**
   * 检查Ollama API连接状态
   * @returns {Promise<boolean>} - 返回是否连接成功
   */
  checkConnection: async function () {
    try {
      const response = await fetch(`${this.config.baseUrl}/version`, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Ollama连接成功:", data);
        return true;
      } else {
        console.error("Ollama连接失败:", response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error("Ollama连接检查错误:", error);
      return false;
    }
  },

  /**
   * 获取可用模型列表
   * @returns {Promise<string[]>} - 返回可用模型列表
   */
  getAvailableModels: async function () {
    try {
      const response = await fetch(`${this.config.baseUrl}/tags`, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        return models.map((model) => model.name);
      } else {
        console.error(
          "获取模型列表失败:",
          response.status,
          response.statusText
        );
        return [this.config.model];
      }
    } catch (error) {
      console.error("获取模型列表错误:", error);
      return [this.config.model];
    }
  },

  /**
   * 更新AI配置
   * @param {object} newConfig - 新配置
   */
  updateConfig: function (newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log("AI配置已更新:", this.config);
  },

  /**
   * 生成目标优先级评估问卷
   * @param {string} taskTitle - 任务标题
   * @param {string} taskDescription - 任务描述
   * @param {string} goalTitle - 目标标题
   * @param {string} goalDescription - 目标描述
   * @param {Array} substeps - 子步骤数组
   * @returns {Promise} - 返回包含问卷问题的Promise
   */
  generatePriorityQuestionnaire: async function (
    taskTitle,
    taskDescription,
    goalTitle,
    goalDescription,
    substeps = []
  ) {
    const prompt = `
            你是一个任务管理专家AI助手。请根据以下目标信息，生成一个用于评估优先级的简短问卷。
            
            任务标题: ${taskTitle}
            任务描述: ${taskDescription}
            
            目标标题: ${goalTitle}
            目标描述: ${goalDescription}
            
            子步骤: ${JSON.stringify(substeps.map((s) => s.content))}
            
            请生成3-5个问题，每个问题2-4个选项，用于评估此目标的优先级。问题应涵盖紧急性、重要性、复杂度、资源需求和依赖关系等方面。
            请使用以下JSON格式回答:
            {
                "questions": [
                    {
                        "id": "q1",
                        "text": "问题1",
                        "options": [
                            {"id": "q1a", "text": "选项A", "value": 3},
                            {"id": "q1b", "text": "选项B", "value": 2},
                            {"id": "q1c", "text": "选项C", "value": 1}
                        ]
                    },
                    {
                        "id": "q2",
                        "text": "问题2",
                        "options": [
                            {"id": "q2a", "text": "选项A", "value": 3},
                            {"id": "q2b", "text": "选项B", "value": 2},
                            {"id": "q2c", "text": "选项C", "value": 1}
                        ]
                    }
                ]
            }
        `;

    try {
      const response = await this.sendRequest(prompt);

      // 尝试解析JSON响应
      try {
        // 提取响应中的JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          return jsonResponse.questions || [];
        }

        // 如果没有找到JSON格式，返回默认问卷
        return this.getDefaultQuestionnaire();
      } catch (parseError) {
        console.error("解析AI响应出错:", parseError);
        return this.getDefaultQuestionnaire();
      }
    } catch (error) {
      console.error("生成问卷问题出错:", error);
      return this.getDefaultQuestionnaire();
    }
  },

  /**
   * 根据问卷回答评估优先级
   * @param {string} goalTitle - 目标标题
   * @param {string} goalDescription - 目标描述
   * @param {object} answers - 用户的问卷回答，格式为 {questionId: selectedOptionId}
   * @param {Array} questions - 问卷问题数组
   * @returns {Promise} - 返回包含优先级评估结果的Promise
   */
  evaluateFromQuestionnaire: async function (
    goalTitle,
    goalDescription,
    answers,
    questions
  ) {
    // 计算每个问题的得分
    let totalScore = 0;
    let maxPossibleScore = 0;
    let answeredQuestions = [];

    questions.forEach((question) => {
      const selectedOptionId = answers[question.id];
      if (selectedOptionId) {
        const selectedOption = question.options.find(
          (opt) => opt.id === selectedOptionId
        );
        if (selectedOption) {
          totalScore += selectedOption.value;
          answeredQuestions.push({
            question: question.text,
            answer: selectedOption.text,
            value: selectedOption.value,
          });
        }
      }

      // 计算可能的最高分（每个问题的最高得分选项）
      const maxOptionValue = Math.max(
        ...question.options.map((opt) => opt.value)
      );
      maxPossibleScore += maxOptionValue;
    });

    // 如果没有回答任何问题，返回默认中等优先级
    if (answeredQuestions.length === 0) {
      return {
        priority: "中",
        reason: "未提供足够的问卷回答，无法进行准确评估。",
      };
    }

    // 计算优先级得分百分比
    const scorePercentage = (totalScore / maxPossibleScore) * 100;

    // 根据得分确定优先级
    let priority;
    if (scorePercentage >= 70) {
      priority = "高";
    } else if (scorePercentage >= 40) {
      priority = "中";
    } else {
      priority = "低";
    }

    // 生成评估理由的提示词
    const prompt = `
            你是一个任务管理专家AI助手。用户完成了一份关于以下目标的优先级评估问卷:
            
            目标标题: ${goalTitle}
            目标描述: ${goalDescription}
            
            问卷回答:
            ${answeredQuestions
              .map((a) => `问题: ${a.question}\n回答: ${a.answer}`)
              .join("\n\n")}
            
            根据问卷结果，此目标的优先级为: ${priority}
            
            请简明扼要地解释为什么此目标应该被评为${priority}优先级，分析用户回答揭示的关键因素。回答不超过3句话。
        `;

    try {
      const response = await this.sendRequest(prompt);

      return {
        priority: priority,
        reason: response.trim() || this.getDefaultPriorityReason(priority),
      };
    } catch (error) {
      console.error("生成优先级评估理由出错:", error);
      return {
        priority: priority,
        reason: this.getDefaultPriorityReason(priority),
      };
    }
  },

  /**
   * 获取默认问卷问题
   * @returns {Array} - 返回默认问卷问题数组
   */
  getDefaultQuestionnaire: function () {
    return [
      {
        id: "q1",
        text: "这个目标对整体任务的完成有多重要？",
        options: [
          { id: "q1a", text: "非常重要，是关键环节", value: 3 },
          { id: "q1b", text: "比较重要，但不是必须的", value: 2 },
          { id: "q1c", text: "重要性较低，是锦上添花", value: 1 },
        ],
      },
      {
        id: "q2",
        text: "这个目标的时间紧迫程度如何？",
        options: [
          { id: "q2a", text: "非常紧急，需要立即处理", value: 3 },
          { id: "q2b", text: "有一定时间压力，但不是特别紧急", value: 2 },
          { id: "q2c", text: "时间充裕，可以稍后处理", value: 1 },
        ],
      },
      {
        id: "q3",
        text: "完成这个目标的难度如何？",
        options: [
          { id: "q3a", text: "非常困难，需要专业技能和大量时间", value: 3 },
          { id: "q3b", text: "中等难度，需要一定的专注和努力", value: 2 },
          { id: "q3c", text: "相对简单，容易完成", value: 1 },
        ],
      },
      {
        id: "q4",
        text: "这个目标与其他目标的依赖关系如何？",
        options: [
          { id: "q4a", text: "其他目标高度依赖它，是前置条件", value: 3 },
          { id: "q4b", text: "与部分目标有依赖关系", value: 2 },
          { id: "q4c", text: "几乎没有依赖关系，可以独立完成", value: 1 },
        ],
      },
    ];
  },

  /**
   * 获取默认优先级理由
   * @param {string} priority - 优先级（高、中、低）
   * @returns {string} - 返回默认理由文本
   */
  getDefaultPriorityReason: function (priority) {
    switch (priority) {
      case "高":
        return "此目标对任务整体成功至关重要，且时间紧迫。它是完成其他目标的关键前提，需要优先分配资源完成。";
      case "中":
        return "此目标对任务有一定重要性，有适当的时间限制。它与其他目标有一些依赖关系，需要在平衡其他工作的同时进行处理。";
      case "低":
        return "此目标对任务整体影响较小，时间要求不紧迫。可以在完成更高优先级目标后再处理，或在有额外资源时进行。";
      default:
        return "无法确定此目标的优先级理由。";
    }
  },
};
