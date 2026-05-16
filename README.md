# AI 赛博解卦助手

一个基于 AI 的八字排盘解卦浏览器插件，支持在排盘网站上直接调用 AI 进行卦象分析和运势解读。

## 功能特性

- 🔮 **智能解卦** - 基于传统玄学理论，AI 智能分析排盘数据
- 💬 **对话交互** - 支持多轮对话，可追问细节
- 📊 **数据抓取** - 自动抓取当前页面的排盘信息
- ⚙️ **灵活配置** - 支持自定义 API 地址、模型、密钥
- 🌙 **深色主题** - 精美的深色 UI 设计
- 🔒 **本地存储** - 配置安全保存在本地

## 安装方法

### 前置要求

1. 安装浏览器扩展：[Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 安装 Node.js 和 pnpm

### 构建步骤

```bash
# 克隆项目
git clone <repository-url>
cd ai-gua-plugin

# 安装依赖
pnpm install

# 构建生产版本
pnpm build
```

构建完成后，在 `dist/` 目录下会生成 `ai-gua-plugin.user.js` 文件。

### 安装脚本

1. 打开 Tampermonkey 扩展管理页面
2. 点击"添加新脚本"
3. 将 `dist/ai-gua-plugin.user.js` 的内容粘贴进去
4. 保存即可

## 使用说明

### 基本使用

1. 访问支持的排盘网站：
   - `https://www.china95.net/paipan/*`
   - `https://paipan.china95.net/*`

2. 页面右下角会出现一个蓝色的浮动按钮

3. 点击按钮打开 AI 解卦面板

4. 点击"抓取数据"获取当前页面的排盘信息

5. 在输入框中输入您的问题，点击发送

### 配置 API

首次使用需要配置 API：

1. 点击面板右上角的 ⚙️ 设置按钮

2. 填写以下配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| API 规范 | 接口格式类型 | OpenAI 兼容格式 |
| API 地址 | 后端服务地址 | `https://api.openai.com/v1` |
| API Key | 密钥 | `sk-xxx...` |
| 模型名称 | 使用的模型 | `gpt-4o` |
| 历史记录数 | 上下文保留条数 | `30` |

3. 点击"保存配置"

### 支持的 API 服务

本插件支持 OpenAI 兼容格式的各类 API 服务：

- OpenAI 官方 API
- DeepSeek
- 通义千问
- 智谱 AI
- 各类中转站服务

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Vite](https://vitejs.dev/) | ^8.0.12 | 构建工具 |
| [TypeScript](https://www.typescriptlang.org/) | ~6.0.2 | 开发语言 |
| [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) | ^8.0.5 | 油猴脚本打包 |
| [Shoelace](https://shoelace.style/) | ^2.20.1 | UI 组件库 |

## 项目结构

```
ai-gua-plugin/
├── src/
│   ├── main.ts                 # 入口文件
│   ├── ui/                     # UI 组件层
│   │   ├── index.ts            # UI 管理器
│   │   ├── views/
│   │   │   └── main-panel/     # 主面板（聊天界面）
│   │   └── components/
│   │       └── settings-dialog/ # 设置弹窗
│   ├── api/                    # API 服务层
│   │   ├── index.ts            # 统一请求入口
│   │   └── openai-style.ts     # OpenAI 风格适配器
│   ├── store/                  # 状态管理
│   │   └── index.ts            # 本地存储
│   ├── types/                  # 类型定义
│   │   └── index.ts            # TypeScript 类型
│   └── utils/                  # 工具函数
│       ├── config.ts           # 配置管理
│       └── logger.ts           # 日志工具
├── dist/                       # 构建输出
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 开发指南

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 预览

```bash
pnpm preview
```

## 注意事项

1. **API Key 安全** - 请勿将包含 API Key 的脚本分享给他人

2. **网络请求** - 插件通过 `GM_xmlhttpRequest` 跨域请求，请确保目标 API 允许跨域

3. **数据隐私** - 排盘数据和对话内容会发送到配置的 API 服务，请注意隐私保护

## 许可证

MIT License

## 作者

Joyful
