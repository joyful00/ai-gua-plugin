// src/api/openai-style.ts
import { GM_xmlhttpRequest } from '$';
import { Logger } from '../utils/logger';
import type { AppSettings, ChatMessage, AIResult, ILLMProvider } from '../types';

export const OpenAIProvider: ILLMProvider = {
    async generate(question, htmlContent, history, settings) {
        // 1. URL 容错处理 (自动处理尾部斜杠并拼接正确的端点)
        let endpoint = settings.baseUrl.trim().replace(/\/+$/, '');
        if (!endpoint.endsWith('/v1/chat/completions') && !endpoint.endsWith('/chat/completions')) {
            endpoint = `${endpoint}/v1/chat/completions`;
        }

        // 2. 构建系统指令
        const systemPrompt = "你是一位精通《易经》等传统玄学的资深解卦师。请根据用户提供的排盘网页内容和疑问进行解析。要求必须返回严格的JSON格式数据，包含'结果'和'分析过程'两个字段。不要有Markdown标记。";

        // 3. 构建标准的 messages 数组
        const messages: any[] = [{ role: "system", content: systemPrompt }];

        // 映射历史记录
        history.forEach(msg => {
            messages.push({ role: "user", content: msg.question });
            messages.push({ role: "assistant", content: JSON.stringify(msg.result) });
        });

        // 压入当前问题
        messages.push({
            role: "user",
            content: `【用户问题】\n${question}\n\n【排盘网页HTML】\n${htmlContent}`
        });

        const payload = {
            model: settings.model,
            messages: messages,
            temperature: 0.7,
            // 如果使用较新的 OpenAI 兼容接口，可以直接强约束 JSON 输出
            response_format: { type: "json_object" } 
        };

        Logger.debug("发起 OpenAI 风格请求", { endpoint, model: settings.model });

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
                            
                            // 这里可以复用之前写的 extractAndParseJson 逻辑
                            let resultObj: AIResult = JSON.parse(content);
                            if (!resultObj.结果) throw new Error("JSON 无结果字段");
                            resolve(resultObj);
                        } catch (err) {
                            Logger.warn("OpenAI 返回解析失败，文本回退");
                            resolve({ 
                                结果: "解析失败或未按 JSON 格式返回", 
                                分析过程: res.responseText 
                            });
                        }
                    } else {
                        reject(new Error(`请求失败 (${res.status}): ${res.responseText}`));
                    }
                },
                onerror: () => reject(new Error("网络请求失败")),
                ontimeout: () => reject(new Error("请求超时"))
            });
        });
    }
};