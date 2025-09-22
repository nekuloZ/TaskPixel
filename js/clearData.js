/**
 * TaskPixel 数据清除工具
 * 用于清除所有存储在localStorage中的TaskPixel数据
 */

// 清除TaskPixel数据
function clearTaskPixelData() {
  try {
    // 移除TaskPixel的localStorage数据
    localStorage.removeItem("taskpixel_data");
    console.log("✅ TaskPixel数据已成功清除");

    // 检查是否有其他相关数据需要清除
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes("taskpixel")) {
        keysToRemove.push(key);
      }
    }

    // 删除所有相关的数据项
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`✅ 已删除额外数据: ${key}`);
    });

    // 清除会话存储中的数据
    sessionStorage.clear();
    console.log("✅ 已清除会话存储");

    // 可选：显示确认消息
    alert("所有TaskPixel数据已成功清除！请重新启动应用以重新初始化。");

    return true;
  } catch (error) {
    console.error("❌ 清除数据时出错:", error);
    alert("清除数据时出错: " + error.message);
    return false;
  }
}

// 添加清除按钮到页面
function addClearDataButton() {
  // 创建按钮
  const clearButton = document.createElement("button");
  clearButton.innerText = "清除所有数据";
  clearButton.className =
    "pixel-button bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 fixed bottom-4 right-4 z-50";
  clearButton.onclick = function () {
    if (
      confirm(
        "确定要清除所有TaskPixel数据吗？此操作将删除所有任务、目标和设置，且无法撤销。"
      )
    ) {
      if (clearTaskPixelData()) {
        // 重新加载到首页
        window.location.href = "index.html";
      }
    }
  };

  // 添加到文档
  document.body.appendChild(clearButton);
}

// 页面加载完成后添加按钮
// 不会在页面加载时自动添加按钮。需要页面明确调用 addClearDataButton()。
// 将函数暴露到全局以便页面选择性调用。
window.addClearDataButton = addClearDataButton;
// 也可以直接从控制台调用
window.clearTaskPixelData = clearTaskPixelData;
