// src/ui/views/main-panel/index.ts
import htmlContent from './template.html?raw';
import cssContent from './style.css?raw';
import { AIRequestService } from '../../../api';
import { Store } from '../../../store';
import { Logger } from '../../../utils/logger';
import type { ChatMessage } from '../../../types';

let currentHistory: ChatMessage[] = [];
let currentHtmlContent = "";

export const MainPanel = {
    render: (): string => {
        return `<style>${cssContent}</style>\n${htmlContent}`;
    },

    bindEvents: (shadowRoot: ShadowRoot) => {
        const toggleBtn = shadowRoot.getElementById('toggle-btn');
        const mainPanel = shadowRoot.getElementById('main-panel');
        const closeBtn = shadowRoot.getElementById('close-panel-btn');
        const clearHistoryBtn = shadowRoot.getElementById('clear-history-btn');

        const chatHistoryContainer = shadowRoot.getElementById('chat-history') as HTMLElement;
        const questionInput = shadowRoot.getElementById('question-input') as any;
        const sendBtn = shadowRoot.getElementById('send-btn') as any;

        const extractDataBtn = shadowRoot.getElementById('extract-data-btn') as any;
        const dataStatus = shadowRoot.getElementById('data-status') as HTMLElement;

        const scrollToBottom = () => {
            if (chatHistoryContainer) {
                setTimeout(() => {
                    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
                }, 50);
            }
        };

        const hideWelcome = () => {
            const welcome = chatHistoryContainer.querySelector('.welcome-message');
            if (welcome) {
                welcome.remove();
            }
        };

        const appendMessage = (role: 'user' | 'ai', content: string): HTMLElement => {
            hideWelcome();

            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${role}-message`;

            const avatarIcon = role === 'user'
                ? `<sl-icon name="user-circle" style="font-size: 24px; color: #888;"></sl-icon>`
                : `<sl-icon name="cpu" style="font-size: 24px; color: #888;"></sl-icon>`;

            msgDiv.innerHTML = `
                ${role === 'ai' ? `<div class="msg-avatar">${avatarIcon}</div>` : ''}
                <div class="msg-bubble">${content}</div>
                ${role === 'user' ? `<div class="msg-avatar">${avatarIcon}</div>` : ''}
            `;

            chatHistoryContainer.appendChild(msgDiv);
            scrollToBottom();
            return msgDiv;
        };

        const clearHistory = () => {
            currentHistory = [];
            chatHistoryContainer.innerHTML = `
                <div class="welcome-message">
                    <sl-icon name="sparkles" style="font-size: 2.5rem; color: var(--sl-color-primary-400);"></sl-icon>
                    <p>欢迎使用 AI 解卦助手</p>
                    <small>请先抓取排盘数据，然后输入您的问题</small>
                </div>
            `;
            Logger.info('对话历史已清除');
        };

        toggleBtn?.addEventListener('click', () => {
            (mainPanel as HTMLElement).style.display = 'flex';
            (toggleBtn as HTMLElement).style.display = 'none';
        });

        closeBtn?.addEventListener('click', () => {
            (mainPanel as HTMLElement).style.display = 'none';
            (toggleBtn as HTMLElement).style.display = '';
        });

        clearHistoryBtn?.addEventListener('click', clearHistory);

        extractDataBtn?.addEventListener('click', () => {
            extractDataBtn.loading = true;
            dataStatus.textContent = '正在抓取排盘数据...';

            setTimeout(() => {
                currentHtmlContent = "【模拟网页排盘数据】：甲子年、乙丑月、丙寅日、丁卯时。求测事项：今日运势。";
                extractDataBtn.loading = false;
                extractDataBtn.variant = "success";
                dataStatus.textContent = '已成功抓取排盘数据';
                dataStatus.classList.add('success');
                Logger.info('排盘数据抓取成功');
            }, 600);
        });

        const handleSend = async () => {
            const question = questionInput.value.trim();
            if (!question) return;

            if (!currentHtmlContent) {
                appendMessage('ai', `<span style="color: var(--sl-color-warning-600);"><sl-icon name="exclamation-triangle"></sl-icon> 请先点击"抓取数据"获取排盘信息</span>`);
                return;
            }

            appendMessage('user', question);
            questionInput.value = '';

            sendBtn.disabled = true;
            sendBtn.loading = true;
            questionInput.disabled = true;

            const aiMsgDiv = appendMessage('ai', `<sl-spinner></sl-spinner> <span style="margin-left: 8px;">正在推演天机...</span>`);
            const bubble = aiMsgDiv.querySelector('.msg-bubble') as HTMLElement;

            try {
                const settings = Store.getSettings();
                const res = await AIRequestService.execute(question, currentHtmlContent, currentHistory, settings);

                bubble.innerHTML = `
                    <div style="color: var(--sl-color-success-600); font-weight: 600; margin-bottom: 10px;">
                        <sl-icon name="check2-circle"></sl-icon> 断语结果
                    </div>
                    <div style="margin-bottom: 12px; padding: 10px; background: var(--sl-color-success-50); border-radius: 8px;">
                        ${res.结果}
                    </div>
                    <div style="color: var(--sl-color-neutral-600); font-weight: 600; margin-bottom: 10px;">
                        <sl-icon name="diagram-3"></sl-icon> 推演过程
                    </div>
                    <div style="font-size: 0.9em; color: var(--sl-color-neutral-700); padding: 10px; background: var(--sl-color-neutral-50); border-radius: 8px;">
                        ${res.分析过程.replace(/\n/g, '<br>')}
                    </div>
                `;

                currentHistory.push({ id: Date.now(), question, result: res });

                if (currentHistory.length > settings.maxHistory) {
                    currentHistory.shift();
                }

            } catch (error: any) {
                Logger.error("请求失败", error);
                bubble.innerHTML = `<span style="color: var(--sl-color-danger-600);"><sl-icon name="exclamation-triangle"></sl-icon> 推演失败：${error.message}</span>`;
            } finally {
                sendBtn.disabled = false;
                sendBtn.loading = false;
                questionInput.disabled = false;
                questionInput.focus();
                scrollToBottom();
            }
        };

        sendBtn?.addEventListener('click', handleSend);

        questionInput?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.loading) {
                    handleSend();
                }
            }
        });
    }
};
