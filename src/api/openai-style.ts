// src/api/openai-style.ts
import { GM_xmlhttpRequest } from '$';
import type { AIResult, ILLMProvider } from '../types';
import { Logger } from '../utils/logger';
import { SystemPrompts } from './prompts';

export const OpenAIProvider: ILLMProvider = {
    async generate(question, htmlContent, history, settings) {
        let endpoint = settings.baseUrl.trim().replace(/\/+$/, '');
        if (!endpoint.endsWith('/v1/chat/completions') && !endpoint.endsWith('/chat/completions')) {
            endpoint = `${endpoint}/v1/chat/completions`;
        }

        const messages: any[] = [{ role: "system", content: SystemPrompts.DIVINATION_EXPERT }];

        history.forEach(msg => {
            messages.push({ role: "user", content: msg.question });
            messages.push({ role: "assistant", content: JSON.stringify(msg.result) });
        });

        messages.push({
            role: "user",
            content: `【用户问题】\n${question}\n\n【排盘网页HTML】\n${htmlContent}`
        });
        Logger.debug("messages:", messages);

        const payload = {
            model: settings.model,
            messages: messages,
            temperature: 0.7,
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: endpoint,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${settings.apiKey.trim()}`
                },
                data: JSON.stringify(payload),
                timeout: 90000,
                onload: (res) => {

                    if (res.status === 200) {
                        try {
                            const raw = JSON.parse(res.responseText);
                            const content = raw.choices?.[0]?.message?.content || "";

                            let resultObj: AIResult = JSON.parse(content);
                            if (!resultObj.结果) throw new Error("JSON 无结果字段");
                            resolve(resultObj);
                        } catch (err: any) {
                            Logger.warn("OpenAI 返回解析失败，文本回退", err.message);
                            resolve({
                                结果: "解析失败或未按 JSON 格式返回",
                                分析过程: res.responseText
                            });
                        }
                    } else {
                        Logger.error(`API 拒绝了请求 [HTTP ${res.status}]`, res.responseText);
                        reject(new Error(`请求失败 (${res.status}): ${res.responseText}`));
                    }
                },
                onerror: (err) => {
                    Logger.error("底层的网络请求失败 (CORS、断网或插件限制)", err);
                    reject(new Error("网络请求失败"));
                },
                ontimeout: () => {
                    Logger.warn("请求超时 (90秒)");
                    reject(new Error("请求超时"));
                }
            });
        });
    }
};