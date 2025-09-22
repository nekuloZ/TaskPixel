/**
 * TaskPixel AI辅助模块扩展
 * 添加多目标优先级评估和问卷功能
 */

// 扩展现有的 TaskPixel.AI 模块
Object.assign(TaskPixel.AI, {
  /**
   * 默认优先级原因
   */
  getDefaultPriorityReason: function (priority) {
    const reasons = {
      高: "此目标对任务完成至关重要，需要优先处理。",
      中: "此目标具有一定重要性，应当适当关注。",
      低: "此目标相对次要，可以在处理完更重要的目标后再考虑。",
    };
    return reasons[priority] || reasons["中"];
  },

  /**
   * 生成多目标优先级评估问卷
   * @param {Array} goals - 要评估的目标数组
   * @returns {Object} 包含问题和选项的问卷
   */
  generateMultiGoalPriorityQuestionnaire: async function (goals) {
    if (!goals || !Array.isArray(goals) || goals.length < 2) {
      console.error("需要至少两个目标才能生成问卷");
      return null;
    }

    // 限制最多评估6个目标
    const targetGoals = goals.slice(0, 6);

    try {
      // 构建提示词
      const goalsText = targetGoals
        .map(
          (goal, index) =>
            `目标${index + 1}: ${goal.title}\n描述: ${
              goal.description || "无描述"
            }`
        )
        .join("\n\n");

      const prompt = `
        你是一个任务优先级评估专家AI助手。请为以下${targetGoals.length}个目标生成一个问卷，用于评估它们的相对优先级。
        
        ${goalsText}
        
        请生成2个关键问题，每个问题有多个选项，用于帮助用户确定这些目标的相对优先级。
        问题应涵盖紧急性和重要性两个维度。
        请使用以下JSON格式回答:
        {
            "questionnaire": {
                "questions": [
                    {
                        "id": "q1",
                        "text": "问题1",
                        "options": [
                            {"id": "q1_o1", "text": "选项1", "scores": [3, 2, 1, 0, 0, 0]},
                            {"id": "q1_o2", "text": "选项2", "scores": [1, 3, 2, 0, 0, 0]},
                            {"id": "q1_o3", "text": "选项3", "scores": [1, 1, 3, 0, 0, 0]}
                        ]
                    },
                    {
                        "id": "q2",
                        "text": "问题2",
                        "options": [
                            {"id": "q2_o1", "text": "选项1", "scores": [3, 1, 1, 0, 0, 0]},
                            {"id": "q2_o2", "text": "选项2", "scores": [1, 3, 1, 0, 0, 0]},
                            {"id": "q2_o3", "text": "选项3", "scores": [1, 1, 3, 0, 0, 0]}
                        ]
                    }
                ]
            }
        }
        
        注意：scores数组中的每个数字代表对应目标的得分，顺序与上面列出的目标相同。数组长度应与目标数量相同。
      `;

      try {
        const response = await this.sendRequest(prompt);

        // 尝试解析JSON响应
        try {
          // 提取响应中的JSON部分
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonResponse = JSON.parse(jsonMatch[0]);
            return jsonResponse.questionnaire;
          }
        } catch (e) {
          console.warn("解析JSON失败，使用本地回退问卷");
        }
      } catch (error) {
        console.error("生成问卷出错:", error);
      }

      // 本地回退：返回默认问卷
      return this.generateDefaultQuestionnaire(targetGoals);
    } catch (error) {
      console.error("生成问卷出错:", error);
      return this.generateDefaultQuestionnaire(targetGoals);
    }
  },

  /**
   * 生成默认问卷（本地回退）
   * @param {Array} goals - 要评估的目标数组
   * @returns {Object} 默认问卷
   */
  generateDefaultQuestionnaire: function (goals) {
    // 确保目标数量不超过6个
    const targetGoals = goals.slice(0, 6);
    const goalCount = targetGoals.length;

    // 创建默认得分数组模板
    const createScoreArray = (position) => {
      // 创建一个全为1的数组
      const scores = new Array(goalCount).fill(1);
      // 将指定位置的得分设为3（高权重）
      if (position >= 0 && position < goalCount) {
        scores[position] = 3;
      }
      return scores;
    };

    // 默认问卷
    return {
      questions: [
        {
          id: "q1",
          text: "哪个目标对于整体任务的完成最为重要？",
          options: targetGoals.map((goal, index) => ({
            id: `q1_o${index + 1}`,
            text: `目标${index + 1}: ${goal.title}`,
            scores: createScoreArray(index),
          })),
        },
        {
          id: "q2",
          text: "哪个目标需要最紧急处理？",
          options: targetGoals.map((goal, index) => ({
            id: `q2_o${index + 1}`,
            text: `目标${index + 1}: ${goal.title}`,
            scores: createScoreArray(index),
          })),
        },
      ],
    };
  },

  /**
   * 评估多个目标的优先级
   * @param {Array} goals - 要评估的目标数组
   * @param {Object} answers - 用户问卷回答 {questionId: selectedOptionId}
   * @returns {Array} 目标优先级评估结果数组
   */
  evaluateMultipleGoals: async function (goals, answers) {
    if (!goals || !Array.isArray(goals) || goals.length < 2) {
      console.error("需要至少两个目标才能评估");
      return [];
    }

    try {
      // 获取问卷（应该已经在之前的步骤中生成）
      const questionnaire = await this.generateMultiGoalPriorityQuestionnaire(
        goals
      );

      if (!questionnaire || !questionnaire.questions) {
        throw new Error("问卷生成失败");
      }

      // 计算每个目标的总分
      const goalScores = new Array(goals.length).fill(0);

      // 根据用户回答计算得分
      Object.keys(answers).forEach((questionId) => {
        const question = questionnaire.questions.find(
          (q) => q.id === questionId
        );
        if (!question) return;

        const selectedOptionId = answers[questionId];
        const option = question.options.find((o) => o.id === selectedOptionId);
        if (!option || !option.scores) return;

        // 将选项得分加到总分中
        option.scores.forEach((score, index) => {
          if (index < goalScores.length) {
            goalScores[index] += score;
          }
        });
      });

      // 确定每个目标的优先级
      const priorities = ["低", "中", "高"];
      const results = goals.map((goal, index) => {
        const score = goalScores[index];
        let priorityIndex;

        // 简单的得分到优先级映射
        if (score >= 8) {
          priorityIndex = 2; // 高
        } else if (score >= 4) {
          priorityIndex = 1; // 中
        } else {
          priorityIndex = 0; // 低
        }

        return {
          goalId: goal.id,
          priority: priorities[priorityIndex],
          reason: this.generatePriorityReason(
            goal,
            priorities[priorityIndex],
            score
          ),
        };
      });

      return results;
    } catch (error) {
      console.error("评估多目标优先级出错:", error);

      // 本地回退：按照目标的标题字母顺序分配不同优先级
      return goals.map((goal, index) => {
        const priority = index % 3 === 0 ? "高" : index % 3 === 1 ? "中" : "低";
        return {
          goalId: goal.id,
          priority,
          reason: this.getDefaultPriorityReason(priority),
        };
      });
    }
  },

  /**
   * 生成优先级原因
   * @param {Object} goal - 目标对象
   * @param {string} priority - 优先级
   * @param {number} score - 得分
   * @returns {string} 优先级原因
   */
  generatePriorityReason: function (goal, priority, score) {
    const defaultReason = this.getDefaultPriorityReason(priority);

    // 基于得分和优先级生成更具体的原因
    if (priority === "高") {
      return `此目标得分较高 (${score} 分)，对任务完成至关重要，建议优先处理。`;
    } else if (priority === "中") {
      return `此目标得分适中 (${score} 分)，具有一定重要性，应当适当关注。`;
    } else {
      return `此目标得分较低 (${score} 分)，相对次要，可以在处理完更重要的目标后再考虑。`;
    }
  },
});
