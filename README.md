# AI 赛博解卦助手

一个面向 china95 排盘页面的浏览器用户脚本。它会在排盘页面右下角注入 AI 解卦面板，支持自动抓取盘面、识别术数类型、调用 OpenAI 兼容接口进行首问分析与后续追问，并可复制或导出分析报告图片。

## 当前能力

- 自动抓取当前排盘页面的标题、地址和盘面正文。
- 根据 URL 与页面关键词识别术数类型，支持自动识别和手动切换。
- 区分“首问分析”和“后续追问”，避免每次追问都重复完整起盘。
- 支持智能、强关联、完整原盘三种上下文模式。
- 支持按术数单独配置 Prompt 模板。
- 支持复制报告、导出图片报告。
- 支持请求超时兜底、手动停止本次请求和失败后快速重试。
- 配置保存在用户脚本管理器本地存储中，不内置任何 API Key。

## 支持页面

脚本默认匹配以下站点：

- `https://www.china95.net/paipan/*`
- `https://paipan.china95.net/*`

已配置识别规则的 china95 页面：

| 术数 | 页面 |
| --- | --- |
| 八字 | `/paipan/bazi/bazi_show.asp`、`/BaZi/BaZi.asp` |
| 紫微斗数 | `/paipan/ziwei/ziwei.asp`、`/ZiDou/ZiDou.asp` |
| 六爻 | `/paipan/liuyao/liuyao.asp`、`/LiuYao/LiuYao.asp` |
| 奇门遁甲 | `/paipan/qimen/qimen.asp`、`/paipan/qimen_show.asp`、`/QiMen/QiMen.asp` |
| 梅花易数 | `/paipan/meihua_show.asp` |
| 飞宫小奇门 | `/paipan/xiaoqimen_show.asp` |
| 小成图 | `/paipan/xiaochengtu_show.asp` |
| 大六壬 | `/DaLiuRen/DaLiuRen.asp` |
| 金口诀 | `/paipan/jinkoujue_show.asp`、`/JinKouJue/JinKouJue.asp` |
| 玄空风水 | `/XuanKong/XuanKong.asp` |

未命中规则但仍在 china95 排盘路径下的页面，会回退为“通用问事”处理。

## 安装使用

### 环境要求

- Node.js
- pnpm
- Tampermonkey 或 Violentmonkey

### 构建脚本

```bash
pnpm install
pnpm build
```

构建产物位于 `dist/ai-gua-plugin.user.js`。

### 安装到浏览器

1. 打开 Tampermonkey 或 Violentmonkey 管理页面。
2. 新建用户脚本。
3. 将 `dist/ai-gua-plugin.user.js` 内容粘贴进去并保存。
4. 打开支持的排盘页面，右下角会出现浮动按钮。

## 基本流程

1. 打开支持的排盘页面。
2. 点击右下角浮动按钮打开面板。
3. 首次使用先进入设置，填写 API 地址、API Key 和模型名。
4. 点击“抓取数据”，确认识别到的术数类型。
5. 输入问题并发送。
6. 首轮回答后，可继续追问、复制报告或导出图片。

如果请求时间过长，可以点击发送按钮切换出来的“停止”按钮取消本次请求。取消或失败后，原问题会回填到输入框，方便修改后重试。

## API 配置

当前稳定支持 OpenAI 兼容格式接口。

| 配置项 | 说明 | 示例 |
| --- | --- | --- |
| API 规范 | 当前建议选择 OpenAI 兼容格式 | `OpenAI 兼容格式` |
| API 地址 | OpenAI 兼容接口地址，可填 `/v1` 或完整 `/chat/completions` | `https://api.openai.com/v1` |
| API Key | 服务商提供的密钥 | `sk-...` |
| 模型名称 | 具体模型名 | `gpt-4o`、`deepseek-chat` |
| 历史记录数 | 保留用于追问上下文的历史轮数 | `30` |
| 默认术数类型 | 默认自动识别，也可固定某类术数 | `自动识别` |
| 默认上下文模式 | 控制每轮发送给模型的盘面长度 | `智能模式` |

### 上下文模式

| 模式 | 适用场景 |
| --- | --- |
| 智能模式 | 默认推荐，发送摘要和关键片段，速度较快 |
| 强关联模式 | 需要更强盘面锚定时使用，会发送更多原文 |
| 完整原盘模式 | 排查遗漏信息或需要完整上下文时使用，消耗更多 token |

## Prompt 配置

设置页中可以打开“高级 Prompt 配置”，为每种术数分别维护两套模板：

- 首问分析：用于第一次完整分析当前盘面。
- 后续追问：用于基于已有盘面记忆回答追问。

保存后的 Prompt 会写入本地设置，并立即影响后续请求。也可以一键恢复默认模板。

## 开发命令

```bash
pnpm dev
pnpm build
pnpm preview
```

## 项目结构

```text
ai-gua-plugin/
├── src/
│   ├── main.ts
│   ├── api/
│   │   ├── index.ts
│   │   ├── openai-style.ts
│   │   └── prompts.ts
│   ├── store/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── ui/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── settings-dialog/
│   │   │   └── prompt-settings-dialog/
│   │   └── views/
│   │       └── main-panel/
│   └── utils/
│       ├── divination.ts
│       ├── logger.ts
│       └── scraper.ts
├── dist/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 隐私与安全

- API Key 保存在用户脚本管理器本地存储中，请不要把包含个人配置的脚本或浏览器配置分享给他人。
- 盘面数据、问题和对话上下文会发送给你配置的 API 服务商。
- 如果使用第三方中转服务，请自行确认其隐私策略、日志策略和可用性。

## 已知限制

- 当前只实现了 OpenAI 兼容格式请求适配。
- Gemini 原生格式和 Anthropic 格式还未接入底层 provider。
- 自动识别依赖已配置 URL 和页面关键词，未收录页面会回退到“通用问事”。
- 图片导出使用 Canvas 绘制报告摘要，不是对原始排盘网页截图。

## 发布状态

当前目标版本：`0.0.1`。

发布前建议至少完成一次：

```bash
pnpm build
```

## 作者

Joyful
