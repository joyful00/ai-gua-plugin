// src/api/index.ts
import type {
    AIRequestPayload,
    AIResult,
    ILLMProvider,
    SessionMemory,
    SourceDigest
} from '../types';
import { OpenAIProvider } from './openai-style';

const normalizeStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }

    return [];
};

const normalizeSourceDigest = (
    input: Partial<SourceDigest> | undefined,
    fallbackQuestion: string,
    fallbackExcerpt: string
): SourceDigest => {
    return {
        chartSnapshot: String(input?.chartSnapshot || fallbackExcerpt || '暂无盘面摘要').trim(),
        coreIndicators: normalizeStringArray(input?.coreIndicators),
        questionFocus: normalizeStringArray(input?.questionFocus).length
            ? normalizeStringArray(input?.questionFocus)
            : [fallbackQuestion],
        riskPoints: normalizeStringArray(input?.riskPoints),
        answeringHints: normalizeStringArray(input?.answeringHints)
    };
};

const normalizeSessionMemory = (payload: AIRequestPayload, result: AIResult): SessionMemory => {
    const incomingMemory: Partial<SessionMemory> = result.会话记忆 ?? {};
    const existingMemory = payload.session.memory;
    const source = payload.session.source;
    const fallbackExcerpt = source?.excerpt || source?.promptText || '暂无盘面摘要';
    const fallbackDetectedType = source?.detectedType || payload.session.resolvedDivinationType;
    const fallbackReason = source?.detectionReason || '沿用当前会话术数类型';

    return {
        sourceDigest: normalizeSourceDigest(
            incomingMemory.sourceDigest || existingMemory?.sourceDigest,
            payload.question,
            fallbackExcerpt
        ),
        keyFields: (
            incomingMemory.keyFields &&
            typeof incomingMemory.keyFields === 'object' &&
            !Array.isArray(incomingMemory.keyFields)
        )
            ? incomingMemory.keyFields as Record<string, unknown>
            : (existingMemory?.keyFields || {}),
        latestConclusion: String(
            incomingMemory.latestConclusion ||
            result.结果 ||
            existingMemory?.latestConclusion ||
            ''
        ).trim(),
        suggestedDivinationType: incomingMemory.suggestedDivinationType || existingMemory?.suggestedDivinationType || fallbackDetectedType,
        detectionReason: String(incomingMemory.detectionReason || existingMemory?.detectionReason || fallbackReason)
    };
};

const normalizeResult = (payload: AIRequestPayload, result: AIResult): AIResult => {
    return {
        模式: result.模式 || payload.session.phase,
        分析过程: String(result.分析过程 || '（AI 未返回详细分析过程）'),
        结果: String(result.结果 || '（AI 未返回结果）'),
        盘面依据: normalizeStringArray(result.盘面依据),
        会话记忆: normalizeSessionMemory(payload, result)
    };
};

export const AIRequestService = {
    /**
     * 统一对外的请求入口，自动根据用户设置匹配合适的底层适配器
     */
    async execute(payload: AIRequestPayload): Promise<AIResult> {
        let provider: ILLMProvider;

        switch (payload.settings.apiFormat) {
            case 'openai':
                provider = OpenAIProvider;
                break;
            case 'gemini':
                throw new Error('Gemini 原生适配器尚未挂载');
            case 'anthropic':
                throw new Error('Anthropic 适配器尚未挂载');
            default:
                throw new Error(`暂不支持的 API 规范：${payload.settings.apiFormat}`);
                break;
        }

        const result = await provider.generate(payload);
        return normalizeResult(payload, result);
    }
};
