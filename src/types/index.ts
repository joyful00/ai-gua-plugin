// src/types/index.ts

/** 支持的 API 风格枚举 */
export type APIFormat = 'openai' | 'gemini' | 'anthropic';

/** 术数类型 */
export type DivinationType =
    | 'auto'
    | 'bazi'
    | 'ziwei'
    | 'xiaoliuren'
    | 'liuyao'
    | 'meihua'
    | 'qimen'
    | 'xiaoqimen'
    | 'xiaochengtu'
    | 'daliuren'
    | 'jinkoujue'
    | 'xuankong'
    | 'general';
export type PromptDivinationType = Exclude<DivinationType, 'auto'>;

/** 追问上下文模式 */
export type ContextMode = 'smart' | 'anchored' | 'full';

/** 会话阶段 */
export type SessionPhase = 'initial' | 'followup';

/** 可编辑的 Prompt 配置 */
export interface PromptProfile {
    initial: string;
    followup: string;
}

export type PromptProfiles = Record<PromptDivinationType, PromptProfile>;

/** 结构化盘面摘要 */
export interface SourceDigest {
    chartSnapshot: string;
    coreIndicators: string[];
    questionFocus: string[];
    riskPoints: string[];
    answeringHints: string[];
}

/** 会话记忆 */
export interface SessionMemory {
    sourceDigest: SourceDigest;
    keyFields: Record<string, unknown>;
    latestConclusion?: string;
    suggestedDivinationType?: PromptDivinationType;
    detectionReason?: string;
}

/** 抓取后的页面信息 */
export interface ScrapedSource {
    title: string;
    url: string;
    rawHtml: string;
    rawText: string;
    cleanedText: string;
    promptText: string;
    excerpt: string;
    detectedType: PromptDivinationType;
    detectionReason: string;
}

/** 当前会话状态 */
export interface ChatSession {
    selectedDivinationType: DivinationType;
    resolvedDivinationType: PromptDivinationType;
    contextMode: ContextMode;
    phase: SessionPhase;
    source: ScrapedSource | null;
    memory: SessionMemory | null;
    initialQuestion: string;
    forceInitial: boolean;
}

/** 用户的本地设置结构 */
export interface AppSettings {
    apiFormat: APIFormat;          // 接口规范风格
    baseUrl: string;               // 自定义 API 基准地址
    apiKey: string;                // 密钥
    model: string;                 // 模型名称
    maxHistory: number;            // 历史记录数
    defaultDivinationType: DivinationType;
    contextMode: ContextMode;
    promptProfiles: PromptProfiles;
}

export interface AIResult {
    模式?: SessionPhase | string;
    结果: string;
    分析过程: string;
    盘面依据?: string[] | string;
    会话记忆?: SessionMemory;
}

export interface ChatMessage {
    id: number;
    phase: SessionPhase;
    divinationType: PromptDivinationType;
    question: string;
    result: AIResult;
}

export interface AIRequestPayload {
    question: string;
    history: ChatMessage[];
    settings: AppSettings;
    session: ChatSession;
    signal?: AbortSignal;
}

/** 🌐 统一定义一个 AI 提供者的接口契约 */
export interface ILLMProvider {
    generate(payload: AIRequestPayload): Promise<AIResult>;
}
