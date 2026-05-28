// src/api/openai-style.ts
import { GM_xmlhttpRequest } from '$';
import type { AIRequestPayload, AIResult, ChatMessage, ILLMProvider } from '../types';
import { getSourceContextByMode } from '../utils/divination';
import { Logger } from '../utils/logger';
import { buildSystemPrompt, getPromptProfile } from './prompts';

const REQUEST_TIMEOUT_MS = 120000;
const trimHistory = (history: ChatMessage[], maxHistory: number): ChatMessage[] => {
    const safeMaxHistory = Math.min(Math.max(maxHistory, 1), 100);
    return history.slice(-safeMaxHistory);
};

const formatJsonBlock = (value: unknown): string => JSON.stringify(value, null, 2);

const MAX_DEBUG_RESPONSE_LENGTH = 2400;

const createHistorySummary = (msg: ChatMessage): string => {
    const basis = Array.isArray(msg.result.盘面依据)
        ? msg.result.盘面依据.join('；')
        : (msg.result.盘面依据 || '');
    const conclusion = msg.result.会话记忆?.latestConclusion || msg.result.结果;

    return [
        `阶段：${msg.phase}`,
        `术数：${msg.divinationType}`,
        `问题：${msg.question}`,
        `结论摘要：${conclusion}`,
        basis ? `盘面依据：${basis}` : ''
    ].filter(Boolean).join('\n');
};

const buildInitialUserContent = (payload: AIRequestPayload): string => {
    const source = payload.session.source!;
    const contextText = getSourceContextByMode(source, payload.session.contextMode);

    return [
        `【用户问题】\n${payload.question}`,
        `【页面标题】\n${source.title}`,
        `【页面地址】\n${source.url}`,
        `【自动识别结果】\n${source.detectedType}（${source.detectionReason}）`,
        `【当前解析术数】\n${payload.session.resolvedDivinationType}`,
        `【上下文模式】\n${payload.session.contextMode}`,
        `【盘面原始文本】\n${contextText}`
    ].join('\n\n');
};

const buildFollowupContextContent = (payload: AIRequestPayload): string => {
    const source = payload.session.source!;
    const memory = payload.session.memory;
    const contextLines = [
        `【首次问题】\n${payload.session.initialQuestion || '未记录'}`,
        `【当前解析术数】\n${payload.session.resolvedDivinationType}`,
        `【会话记忆】\n${formatJsonBlock(memory || {})}`,
        `【盘面锚点】\n${source.excerpt}`
    ];

    if (payload.session.contextMode !== 'smart') {
        contextLines.push(`【补充盘面文本】\n${getSourceContextByMode(source, payload.session.contextMode)}`);
    }

    return contextLines.join('\n\n');
};

const buildCurrentQuestionContent = (payload: AIRequestPayload): string => {
    return [
        `【当前问题】\n${payload.question}`,
        `【回答要求】\n请直接回答本轮问题。若需要回到盘面细节，请在“盘面依据”中列出依据。若依据不足，请明确说明。`
    ].join('\n\n');
};

const coerceContentToText = (content: unknown): string => {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content.map(item => {
            if (typeof item === 'string') {
                return item;
            }

            if (item && typeof item === 'object' && 'text' in item) {
                return String((item as { text?: unknown }).text || '');
            }

            return '';
        }).join('');
    }

    return '';
};

const extractChoiceContent = (choice: unknown): string => {
    if (!choice || typeof choice !== 'object') {
        return '';
    }

    const maybeChoice = choice as {
        message?: { content?: unknown };
        delta?: { content?: unknown };
        text?: unknown;
    };

    return [
        coerceContentToText(maybeChoice.message?.content),
        coerceContentToText(maybeChoice.delta?.content),
        coerceContentToText(maybeChoice.text)
    ].join('');
};

const extractOpenAIContent = (raw: unknown): string => {
    if (!raw || typeof raw !== 'object') {
        return '';
    }

    if ('结果' in raw) {
        return JSON.stringify(raw);
    }

    const maybeResponse = raw as {
        choices?: unknown[];
        message?: { content?: unknown };
        content?: unknown;
    };

    const choiceContent = Array.isArray(maybeResponse.choices)
        ? maybeResponse.choices.map(extractChoiceContent).join('')
        : '';

    return [
        choiceContent,
        coerceContentToText(maybeResponse.message?.content),
        coerceContentToText(maybeResponse.content)
    ].join('');
};

const parseSseContent = (responseText: string): string => {
    const chunks: string[] = [];

    responseText.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data:')) {
            return;
        }

        const payloadText = trimmedLine.slice(5).trim();
        if (!payloadText || payloadText === '[DONE]') {
            return;
        }

        try {
            const payload = JSON.parse(payloadText);
            const content = extractOpenAIContent(payload);
            if (content) {
                chunks.push(content);
            }
        } catch {
            chunks.push(payloadText);
        }
    });

    return chunks.join('');
};

const stripJsonFence = (content: string): string => {
    return content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
};

const parseJsonFromContent = (content: string): AIResult => {
    const strippedContent = stripJsonFence(content);

    try {
        return JSON.parse(strippedContent);
    } catch {
        const startIndex = strippedContent.indexOf('{');
        const endIndex = strippedContent.lastIndexOf('}');

        if (startIndex >= 0 && endIndex > startIndex) {
            return JSON.parse(strippedContent.slice(startIndex, endIndex + 1));
        }

        throw new Error('模型正文不是可解析的 JSON');
    }
};

const getDebugResponseText = (responseText: string): string => {
    if (responseText.length <= MAX_DEBUG_RESPONSE_LENGTH) {
        return responseText;
    }

    return `${responseText.slice(0, MAX_DEBUG_RESPONSE_LENGTH)}\n...（原始响应过长，已截断）`;
};

const createTimeoutError = (): Error => {
    return new Error(`请求超过 ${Math.round(REQUEST_TIMEOUT_MS / 1000)} 秒未返回，已自动停止。请稍后重试，或切换为“智能模式”减少上下文长度。`);
};

const parseAIResult = (responseText: string): AIResult => {
    const trimmedResponse = responseText.trim();
    const content = trimmedResponse.startsWith('data:')
        ? parseSseContent(trimmedResponse)
        : extractOpenAIContent(JSON.parse(trimmedResponse));

    if (!content) {
        throw new Error('接口返回了空正文或仅返回流式用量信息，请确认中转服务没有强制流式输出，且当前模型支持 chat/completions 返回正文');
    }

    return parseJsonFromContent(content);
};

export const OpenAIProvider: ILLMProvider = {
    async generate(payload: AIRequestPayload) {
        const baseUrl = payload.settings.baseUrl.trim().replace(/\/+$/, '');
        let endpoint = baseUrl;

        if (endpoint.endsWith('/v1/chat/completions') || endpoint.endsWith('/chat/completions')) {
            // 用户已经填了完整 endpoint，直接复用
        } else if (endpoint.endsWith('/v1')) {
            endpoint = `${endpoint}/chat/completions`;
        } else {
            endpoint = `${endpoint}/v1/chat/completions`;
        }

        if (!payload.session.source) {
            throw new Error('尚未抓取盘面数据，无法发起 AI 分析');
        }

        const phase = payload.session.forceInitial ? 'initial' : payload.session.phase;
        const customPrompt = getPromptProfile(
            payload.settings.promptProfiles,
            payload.session.resolvedDivinationType,
            phase
        );
        const systemPrompt = buildSystemPrompt(payload.session.resolvedDivinationType, phase, customPrompt);
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt }
        ];

        if (phase === 'followup') {
            messages.push({
                role: 'user',
                content: buildFollowupContextContent(payload)
            });
        }

        trimHistory(payload.history, payload.settings.maxHistory).forEach(msg => {
            messages.push({
                role: 'user',
                content: msg.question
            });
            messages.push({
                role: 'assistant',
                content: createHistorySummary(msg)
            });
        });

        messages.push({
            role: 'user',
            content: phase === 'initial'
                ? buildInitialUserContent(payload)
                : buildCurrentQuestionContent(payload)
        });

        Logger.debug('AI 请求摘要:', {
            model: payload.settings.model,
            phase,
            divinationType: payload.session.resolvedDivinationType,
            contextMode: payload.session.contextMode,
            messageCount: messages.length
        });

        const requestPayload = {
            model: payload.settings.model,
            messages,
            temperature: 0.7,
            stream: false
        };

        return new Promise((resolve, reject) => {
            if (payload.signal?.aborted) {
                reject(new Error('请求已取消'));
                return;
            }

            let settled = false;
            let request: { abort?: () => void } | undefined;
            const fail = (error: Error) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(error);
            };
            const succeed = (result: AIResult) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(result);
            };
            const handleAbort = () => {
                request?.abort?.();
                fail(new Error('请求已取消'));
            };
            const timeoutTimer = window.setTimeout(() => {
                Logger.warn(`请求超过 ${REQUEST_TIMEOUT_MS}ms，触发前端兜底超时`);
                request?.abort?.();
                fail(createTimeoutError());
            }, REQUEST_TIMEOUT_MS);
            function cleanup() {
                window.clearTimeout(timeoutTimer);
                payload.signal?.removeEventListener('abort', handleAbort);
            }

            payload.signal?.addEventListener('abort', handleAbort, { once: true });

            try {
                request = GM_xmlhttpRequest({
                    method: 'POST',
                    url: endpoint,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${payload.settings.apiKey.trim()}`
                    },
                    data: JSON.stringify(requestPayload),
                    timeout: REQUEST_TIMEOUT_MS,
                    onload: (res: any) => {
                        if (res.status === 200) {
                            try {
                                const result = parseAIResult(res.responseText);
                                if (!result.结果) {
                                    throw new Error('JSON 无结果字段');
                                }
                                succeed(result);
                            } catch (err: unknown) {
                                const message = err instanceof Error ? err.message : String(err);
                                Logger.warn('OpenAI 返回解析失败，文本回退', message);
                                succeed({
                                    模式: phase,
                                    结果: `解析失败：${message}`,
                                    分析过程: getDebugResponseText(res.responseText),
                                    盘面依据: ['模型未按结构化 JSON 返回，已回退原始响应用于排查']
                                });
                            }
                        } else {
                            Logger.error(`API 拒绝了请求 [HTTP ${res.status}]`, res.responseText);
                            fail(new Error(`请求失败 (${res.status}): ${res.responseText}`));
                        }
                    },
                    onerror: (err: unknown) => {
                        Logger.error('底层的网络请求失败 (CORS、断网或插件限制)', err);
                        fail(new Error('网络请求失败'));
                    },
                    ontimeout: () => {
                        Logger.warn(`请求超时 (${Math.round(REQUEST_TIMEOUT_MS / 1000)}秒)`);
                        fail(createTimeoutError());
                    },
                    onabort: () => {
                        fail(new Error('请求已取消'));
                    }
                } as any) as { abort?: () => void };
            } catch (err: unknown) {
                Logger.error('请求创建失败', err);
                fail(err instanceof Error ? err : new Error(String(err)));
            }
        });
    }
};
