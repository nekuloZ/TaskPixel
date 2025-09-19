# TaskPixel应用启动指南

## 方法一：直接打开HTML文件

最简单的方法是直接在浏览器中打开index.html文件：

1. 找到TaskPixel文件夹
2. 双击打开index.html文件

**注意**：直接打开HTML文件时，某些浏览器可能会限制JavaScript的某些功能，特别是localStorage和跨域请求。

## 方法二：使用本地HTTP服务器

为了获得最佳体验，建议使用本地HTTP服务器来运行应用：

### 使用Node.js的http-server（推荐）

1. 确保已安装Node.js
2. 打开命令行，切换到TaskPixel项目根目录
3. 运行以下命令安装http-server（如果尚未安装）：
   `
   npm install -g http-server
   `
4. 启动服务器：
   `
   http-server -p 8080
   `
5. 在浏览器中访问：http://localhost:8080

### 使用Python的SimpleHTTPServer

1. 确保已安装Python
2. 打开命令行，切换到TaskPixel项目根目录
3. 对于Python 3，运行：
   `
   python -m http.server 8080
   `
   对于Python 2，运行：
   `
   python -m SimpleHTTPServer 8080
   `
4. 在浏览器中访问：http://localhost:8080

## 方法三：使用VSCode的Live Server插件

1. 在VSCode中安装Live Server插件
2. 在VSCode中打开TaskPixel项目文件夹
3. 右键点击index.html文件
4. 选择"Open with Live Server"
5. 浏览器会自动打开应用

## 设置Ollama（用于AI功能）

要使用AI辅助功能，需要设置Ollama：

1. 从[官方网站](https://ollama.com/)下载并安装Ollama
2. 运行Ollama，默认会启动在http://localhost:11434
3. 下载llama3模型（或任何你喜欢的模型）：
   `
   ollama pull llama3
   `
4. 确保Ollama在使用TaskPixel的AI功能前正在运行

如果Ollama未运行或不可用，应用会自动使用预设的响应。
