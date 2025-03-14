# AI Life Coach 项目 (v0.1)

## 版本说明
当前版本：v0.1
- 初始版本发布
- 实现基础对话功能
- 完成核心API集成

## 功能特点
### 当前版本（v0.1）功能
- 实时对话：支持与 AI 进行流畅的实时对话
  - 基于 DeepSeek R1 API 的智能对话系统
  - 流式响应，实现即时反馈
  - 清晰的对话界面展示
- 个性化建议：基于用户输入提供定制化的建议
  - 智能分析用户问题
  - 提供针对性的生活建议
- 响应式设计：适配各种设备屏幕尺寸
  - 支持桌面端和移动端访问
  - 自适应布局优化

## 技术架构
### 前端
- 纯 HTML5 + CSS3 构建
- 响应式布局（Flexbox + Grid）
- 简洁现代的用户界面

### 后端
- Node.js 服务器
- DeepSeek R1 API 集成
- 流式响应处理

## 页面结构
### 主页面 (index.html)
- 顶部标题栏：展示网站名称和简介
- 对话区域：
  - 聊天记录显示区
  - 消息输入框
  - 发送按钮
- 响应式布局，在移动设备上自动调整

### 样式设计 (styles.css)
- 现代简约风格
- 柔和的配色方案
- 流畅的动画效果

## API 配置
- 端点：https://ark.cn-beijing.volces.com/api/v3/chat/completions
- 超时设置：60秒
- 温度设置：0.7
- 流式输出：启用

## 开发计划
1. 搭建基础项目结构
2. 实现前端界面
3. 配置 Node.js 后端服务
4. 集成 DeepSeek R1 API
5. 实现流式对话功能
6. 优化用户体验
7. 测试和调试

## 注意事项
- API 密钥安全保护
- CORS 配置处理
- 错误处理机制  
- 响应超时处理