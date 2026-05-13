// src/api/index.ts
import type { AppSettings, ChatMessage, AIResult, ILLMProvider } from '../types';
import { OpenAIProvider } from './openai-style';

export const AIRequestService = {
    /**
     * 统一对外的请求入口，自动根据用户设置匹配合适的底层适配器
     */
    async execute(
        question: string, 
        htmlContent: string, 
        history: ChatMessage[], 
        settings: AppSettings
    ): Promise<AIResult> {
        
        let provider: ILLMProvider;

        // 根据配置的规范风格，动态选择“策略”
        switch (settings.apiFormat) {
            case 'openai':
                provider = OpenAIProvider;
                break;
            case 'gemini':
                // provider = GeminiProvider; 
                throw new Error("Gemini 原生适配器尚未挂载");
            default:
                provider = OpenAIProvider;
                break;
        }

        // 执行统一的生成逻辑
        return await provider.generate(question, htmlContent, history, settings);
    }
};