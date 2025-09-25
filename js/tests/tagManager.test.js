/**
 * TaskPixel TagManager 单元测试
 * 测试重构后的TagManager API功能
 */

// 简单的测试框架
const TestFramework = {
  tests: [],
  results: {
    passed: 0,
    failed: 0,
    total: 0,
  },

  test: function (name, testFn) {
    this.tests.push({ name, testFn });
  },

  assertEqual: function (actual, expected, message = "") {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `断言失败: ${message}\n期望: ${JSON.stringify(
          expected
        )}\n实际: ${JSON.stringify(actual)}`
      );
    }
  },

  assertTrue: function (condition, message = "") {
    if (!condition) {
      throw new Error(`断言失败: ${message}\n期望: true\n实际: ${condition}`);
    }
  },

  assertFalse: function (condition, message = "") {
    if (condition) {
      throw new Error(`断言失败: ${message}\n期望: false\n实际: ${condition}`);
    }
  },

  run: function () {
    console.log("开始运行TagManager测试...");
    this.results = { passed: 0, failed: 0, total: 0 };

    for (const test of this.tests) {
      this.results.total++;
      try {
        // 重置测试环境
        this.setupTest();

        // 运行测试
        test.testFn();

        this.results.passed++;
        console.log(`✓ ${test.name}`);
      } catch (error) {
        this.results.failed++;
        console.error(`✗ ${test.name}: ${error.message}`);
      }
    }

    console.log(
      `\n测试完成: ${this.results.passed}/${this.results.total} 通过`
    );
    return this.results;
  },

  setupTest: function () {
    // 重置数据存储
    if (window.TaskPixel && window.TaskPixel.DataStore) {
      TaskPixel.DataStore.data = {
        tasks: [],
        settings: {},
        tags: [],
      };
      TaskPixel.TagManager.invalidateCache();
    }
  },
};

// TagManager 基础功能测试
TestFramework.test("TagManager初始化", function () {
  const result = TaskPixel.TagManager.init();
  TestFramework.assertTrue(result.success, "初始化应该成功");
  TestFramework.assertEqual(
    TaskPixel.DataStore.data.tags,
    [],
    "标签数组应该被初始化"
  );
});

TestFramework.test("创建有效标签", function () {
  const tagData = {
    name: "测试标签",
    color: "#374151",
    description: "这是一个测试标签",
  };

  const result = TaskPixel.TagManager.createTag(tagData);

  TestFramework.assertTrue(result.success, "创建标签应该成功");
  TestFramework.assertTrue(result.tagId, "应该返回标签ID");
  TestFramework.assertTrue(result.tag, "应该返回标签对象");
  TestFramework.assertEqual(result.tag.name, "测试标签", "标签名称应该正确");
  TestFramework.assertEqual(
    result.tag.display_text,
    "#测试标签",
    "显示文本应该正确"
  );
});

TestFramework.test("创建重复标签", function () {
  // 先创建一个标签
  TaskPixel.TagManager.createTag({ name: "重复标签" });

  // 尝试创建同名标签
  const result = TaskPixel.TagManager.createTag({ name: "重复标签" });

  TestFramework.assertFalse(result.success, "创建重复标签应该失败");
  TestFramework.assertEqual(
    result.error.code,
    "DUPLICATE_TAG",
    "错误类型应该是DUPLICATE_TAG"
  );
  TestFramework.assertTrue(result.existingTag, "应该返回现有标签");
});

TestFramework.test("创建无效标签", function () {
  const invalidData = {
    name: "", // 空名称
    color: "invalid-color", // 无效颜色
  };

  const result = TaskPixel.TagManager.createTag(invalidData);

  TestFramework.assertFalse(result.success, "创建无效标签应该失败");
  TestFramework.assertEqual(
    result.error.code,
    "VALIDATION_ERROR",
    "错误类型应该是VALIDATION_ERROR"
  );
});

TestFramework.test("获取所有标签", function () {
  // 创建几个标签
  TaskPixel.TagManager.createTag({ name: "标签1" });
  TaskPixel.TagManager.createTag({ name: "标签2" });
  TaskPixel.TagManager.createTag({ name: "标签3" });

  const tags = TaskPixel.TagManager.getAllTags();

  TestFramework.assertEqual(tags.length, 3, "应该返回3个标签");
  TestFramework.assertTrue(
    tags.every((tag) => tag.name && tag.id),
    "所有标签应该有名称和ID"
  );
});

TestFramework.test("按ID获取标签", function () {
  const createResult = TaskPixel.TagManager.createTag({ name: "测试标签" });
  const tagId = createResult.tagId;

  const tag = TaskPixel.TagManager.getTagById(tagId);

  TestFramework.assertTrue(tag, "应该找到标签");
  TestFramework.assertEqual(tag.id, tagId, "标签ID应该匹配");
  TestFramework.assertEqual(tag.name, "测试标签", "标签名称应该匹配");
});

TestFramework.test("获取不存在的标签", function () {
  const tag = TaskPixel.TagManager.getTagById("non-existent-id");
  TestFramework.assertEqual(tag, null, "不存在的标签应该返回null");
});

TestFramework.test("更新标签", function () {
  const createResult = TaskPixel.TagManager.createTag({ name: "原始标签" });
  const tagId = createResult.tagId;

  const updateResult = TaskPixel.TagManager.updateTag(tagId, {
    name: "更新标签",
    description: "更新的描述",
  });

  TestFramework.assertTrue(updateResult.success, "更新应该成功");

  const updatedTag = TaskPixel.TagManager.getTagById(tagId);
  TestFramework.assertEqual(updatedTag.name, "更新标签", "标签名称应该被更新");
  TestFramework.assertEqual(
    updatedTag.description,
    "更新的描述",
    "描述应该被更新"
  );
  TestFramework.assertEqual(
    updatedTag.display_text,
    "#更新标签",
    "显示文本应该被更新"
  );
});

TestFramework.test("更新不存在的标签", function () {
  const result = TaskPixel.TagManager.updateTag("non-existent-id", {
    name: "新名称",
  });

  TestFramework.assertFalse(result.success, "更新不存在的标签应该失败");
  TestFramework.assertEqual(
    result.error.code,
    "TAG_NOT_FOUND",
    "错误类型应该是TAG_NOT_FOUND"
  );
});

TestFramework.test("删除未使用的标签", function () {
  const createResult = TaskPixel.TagManager.createTag({ name: "待删除标签" });
  const tagId = createResult.tagId;

  const deleteResult = TaskPixel.TagManager.deleteTag(tagId);

  TestFramework.assertTrue(deleteResult.success, "删除应该成功");

  const deletedTag = TaskPixel.TagManager.getTagById(tagId);
  TestFramework.assertEqual(deletedTag, null, "标签应该被删除");
});

TestFramework.test("搜索标签", function () {
  TaskPixel.TagManager.createTag({
    name: "前端开发",
    description: "JavaScript相关",
  });
  TaskPixel.TagManager.createTag({
    name: "后端开发",
    description: "Python相关",
  });
  TaskPixel.TagManager.createTag({ name: "设计", description: "UI设计" });

  const searchResults1 = TaskPixel.TagManager.searchTags("开发");
  TestFramework.assertEqual(
    searchResults1.length,
    2,
    '搜索"开发"应该返回2个结果'
  );

  const searchResults2 = TaskPixel.TagManager.searchTags("JavaScript");
  TestFramework.assertEqual(
    searchResults2.length,
    1,
    '搜索"JavaScript"应该返回1个结果'
  );

  const searchResults3 = TaskPixel.TagManager.searchTags("不存在");
  TestFramework.assertEqual(
    searchResults3.length,
    0,
    "搜索不存在的内容应该返回0个结果"
  );
});

TestFramework.test("按使用频率排序", function () {
  const tag1 = TaskPixel.TagManager.createTag({ name: "标签1" });
  const tag2 = TaskPixel.TagManager.createTag({ name: "标签2" });
  const tag3 = TaskPixel.TagManager.createTag({ name: "标签3" });

  // 模拟使用次数
  TaskPixel.TagManager.updateTagUsage([tag1.tagId, tag1.tagId]); // 使用2次
  TaskPixel.TagManager.updateTagUsage([tag2.tagId]); // 使用1次
  // tag3 未使用

  const sortedTags = TaskPixel.TagManager.getTagsByUsage();

  TestFramework.assertEqual(
    sortedTags[0].name,
    "标签1",
    "使用最多的标签应该排在第一位"
  );
  TestFramework.assertEqual(
    sortedTags[1].name,
    "标签2",
    "使用次数中等的标签应该排在第二位"
  );
  TestFramework.assertEqual(
    sortedTags[2].name,
    "标签3",
    "未使用的标签应该排在最后"
  );
});

TestFramework.test("按名称排序", function () {
  TaskPixel.TagManager.createTag({ name: "C标签" });
  TaskPixel.TagManager.createTag({ name: "A标签" });
  TaskPixel.TagManager.createTag({ name: "B标签" });

  const sortedTags = TaskPixel.TagManager.getTagsByName();

  TestFramework.assertEqual(sortedTags[0].name, "A标签", "按字母顺序第一个");
  TestFramework.assertEqual(sortedTags[1].name, "B标签", "按字母顺序第二个");
  TestFramework.assertEqual(sortedTags[2].name, "C标签", "按字母顺序第三个");
});

TestFramework.test("获取标签统计信息", function () {
  TaskPixel.TagManager.createTag({ name: "已使用标签" });
  TaskPixel.TagManager.createTag({ name: "未使用标签" });

  // 模拟一个标签被使用
  const usedTag = TaskPixel.TagManager.getAllTags()[0];
  TaskPixel.TagManager.updateTagUsage([usedTag.id]);

  const stats = TaskPixel.TagManager.getTagStats();

  TestFramework.assertEqual(stats.total, 2, "总标签数应该是2");
  TestFramework.assertEqual(stats.used, 1, "已使用标签数应该是1");
  TestFramework.assertEqual(stats.unused, 1, "未使用标签数应该是1");
});

TestFramework.test("缓存功能", function () {
  // 创建标签
  TaskPixel.TagManager.createTag({ name: "缓存测试" });

  // 第一次获取（应该从数据源获取）
  const tags1 = TaskPixel.TagManager.getAllTags();

  // 第二次获取（应该从缓存获取）
  const tags2 = TaskPixel.TagManager.getAllTags();

  TestFramework.assertEqual(
    tags1.length,
    tags2.length,
    "缓存的数据应该与原始数据一致"
  );
  TestFramework.assertEqual(
    tags1[0].name,
    tags2[0].name,
    "缓存的标签名称应该一致"
  );
});

TestFramework.test("数据完整性验证", function () {
  // 创建一些测试数据
  TaskPixel.TagManager.createTag({
    name: "完整标签",
    description: "完整的标签",
  });

  // 手动破坏数据（模拟数据损坏）
  const tags = TaskPixel.DataStore.data.tags;
  tags.push({ id: "broken-tag", name: "broken" }); // 缺少必要字段

  const report = TaskPixel.TagManager.validateDataIntegrity();

  TestFramework.assertTrue(
    report.fixedIssues.length > 0,
    "应该检测并修复数据问题"
  );
});

// 运行所有测试
if (typeof window !== "undefined" && window.TaskPixel) {
  // 在浏览器环境中运行
  window.TagManagerTests = TestFramework;
  console.log("TagManager测试框架已加载，使用 TagManagerTests.run() 运行测试");
} else {
  // 在Node.js环境中运行
  module.exports = TestFramework;
}
