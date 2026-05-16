// src/api/openai-style.ts
import { GM_xmlhttpRequest } from '$';
import { Logger } from '../utils/logger';
import type { AIResult, ILLMProvider } from '../types';

export const OpenAIProvider: ILLMProvider = {
    async generate(question, htmlContent, history, settings) {
        // 1. URL 容错处理 (自动处理尾部斜杠并拼接正确的端点)
        let endpoint = settings.baseUrl.trim().replace(/\/+$/, '');
        if (!endpoint.endsWith('/v1/chat/completions') && !endpoint.endsWith('/chat/completions')) {
            endpoint = `${endpoint}/v1/chat/completions`;
        }

        const systemPrompt = "你是一位精通传统玄学和术数的资深解卦师。根据用户提供的排盘数据和具体问题，结合传统命理学理论进行专业、细致的解析。\n\n要求：\n1. 仔细分析排盘数据中的关键信息（如八字、五行、格局等）\n2. 针对用户提出的具体问题给出精准、有条理的回答\n3. 回答要通俗易懂，避免过于晦涩的术语堆砌\n4. 保持客观理性，不夸大其词\n\n返回格式：严格JSON格式，包含'结果'和'分析过程'两个字段，不要有任何Markdown标记。";

        const messages: any[] = [{ role: "system", content: systemPrompt }];

        history.forEach(msg => {
            messages.push({ role: "user", content: msg.question });
            messages.push({ role: "assistant", content: JSON.stringify(msg.result) });
        });

        messages.push({
            role: "user",
            content: `【用户问题】\n${question}\n\n【排盘网页HTML】\n${htmlContent}`
        });

        const payload = {
            model: settings.model,
            messages: messages,
            temperature: 0.7,
            // ⚠️ 盲猜是这里导致的 500 错误。
            // 很多非官方的中转 API 不支持这个参数。我们先把它注释掉试试！
            // response_format: { type: "json_object" } 
        };

        // 🌟【DEBUG 增强 1】发送前，彻底打印我们要发给服务器的所有底牌
        Logger.debug("====== [API 请求出栈] ======");
        Logger.debug("目标地址:", endpoint);
        Logger.debug("请求头 Auth:", `Bearer ${settings.apiKey}`);
        Logger.debug("请求包体 Payload:", JSON.stringify(payload, null, 2));
        Logger.debug("============================");

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
                    // 🌟【DEBUG 增强 2】收到响应后，第一时间打印原始状态和文本
                    Logger.debug("====== [API 响应入栈] ======");
                    Logger.debug("HTTP Status:", res.status);
                    Logger.debug("Response Text:", res.responseText);
                    Logger.debug("============================");

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
                        // 🌟【DEBUG 增强 3】非 200 错误时，把原始报错抛出去
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