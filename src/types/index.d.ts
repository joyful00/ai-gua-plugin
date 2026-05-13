// src/types/index.d.ts

/** 支持的 API 风格枚举 */
export type APIFormat = 'openai' | 'gemini' | 'anthropic';

/** 用户的本地设置结构 */
export interface AppSettings {
    apiFormat: APIFormat;  // 接口规范风格
    baseUrl: string;       // 自定义 API 基准地址 (让用户能填中转站)
    apiKey: string;        // 密钥
    model: string;         // 模型名称
    maxHistory: number;    // 历史记录数
}

export interface AIResult {
    结果: string;
    分析过程: string;
}

export interface ChatMessage {
    id: number;
    question: string;
    result: AIResult;
}

/** 🌐 统一定义一个 AI 提供者的接口契约 */
export interface ILLMProvider {
    generate(
        question: string, 
        htmlContent: string, 
        history: ChatMessage[], 
        settings: AppSettings
    ): Promise<AIResult>;
}