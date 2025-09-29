// 共享 Tailwind 配置（在页面中引入）
// 该文件用于在运行时设置 tailwind 配置（适用于通过 <script src="https://cdn.tailwindcss.com"></script> 的场景）

(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.taskPixelTailwindConfig = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          primary: "#4F46E5",
          "primary-hover": "#4338CA",
          "background-light": "#F3F4F6",
          "background-dark": "#1a1a1a",
          "pixel-border-color": "#000000",
          "pixel-text-color": "#000000",
          "pixel-accent": "#FFD300",
          "pixel-secondary": "#E5E7EB",
          "accent-blue": "#3b82f6",
          "accent-green": "#22c55e",
          "accent-yellow": "#f59e0b",
          "accent-red": "#ef4444",
        },
        fontFamily: {
          display: [
            "'Press Start 2P'",
            "'SimHei'",
            "'Microsoft YaHei'",
            "cursive",
          ],
          sans: ["VT323", "'SimHei'", "'Microsoft YaHei'", "monospace"],
          body: ["VT323", "'SimHei'", "'Microsoft YaHei'", "monospace"],
        },
        borderRadius: {
          DEFAULT: "0px",
          lg: "0px",
          xl: "0px",
          full: "0px",
        },
        boxShadow: {
          pixel: "4px 4px 0px 0px rgba(0,0,0,1)",
          "pixel-inset": "inset 2px 2px 0px 0px rgba(0,0,0,0.2)",
          "pixel-inset-active": "inset -2px -2px 0px 0px rgba(0,0,0,0.2)",
        },
      },
    },
  };

  // 如果页面使用了 tailwind CDN，则注入配置
  if (window.tailwind) {
    try {
      tailwind.config = Object.assign(
        {},
        tailwind.config || {},
        window.taskPixelTailwindConfig
      );
      console.log("已注入共享 Tailwind 配置");
    } catch (e) {
      console.warn("注入 Tailwind 配置失败", e);
    }
  }
})();
