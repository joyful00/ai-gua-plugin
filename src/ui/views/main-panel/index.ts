import htmlContent from './template.html?raw';
import cssContent from './style.css?raw';
import { AIRequestService } from '../../../api';
import { Store } from '../../../store';
import type {
    AIResult,
    AppSettings,
    ChatMessage,
    ChatSession,
    ContextMode,
    DivinationType,
    ScrapedSource,
    SessionPhase
} from '../../../types';
import {
    ContextModeHints,
    ContextModeLabels,
    DivinationTypeLabels,
    SessionPhaseLabels,
    resolveDivinationType,
    shouldRestartFullAnalysis
} from '../../../utils/divination';
import { Logger } from '../../../utils/logger';
import { PageScraper } from '../../../utils/scraper';

const WELCOME_MESSAGE_HTML = `
    <div class="welcome-message">
        <sl-icon name="sparkles" style="font-size: 2.5rem; color: #00d4ff;"></sl-icon>
        <p>欢迎使用 AI 解卦助手</p>
        <small>请先抓取排盘数据，再开始首问分析；后续追问会自动切换到追问模式。</small>
    </div>
`;

const SETTINGS_FIELD_LABELS: Record<'baseUrl' | 'apiKey' | 'model', string> = {
    baseUrl: 'API 地址',
    apiKey: 'API Key',
    model: '模型名称'
};

const escapeHtml = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const safeMultilineHtml = (value: string): string => escapeHtml(value).replace(/\n/g, '<br>');

const formatAIValue = (val: any, fallback: string): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join('\n');
    if (typeof val === 'object') {
        return Object.entries(val)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
    }
    return String(val);
};

const normalizeBasis = (value: AIResult['盘面依据']): string[] => {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }

    return [];
};

type ExportSectionTone = 'analysis' | 'result' | 'basis' | 'meta';

interface ExportSection {
    title: string;
    content: string;
    tone: ExportSectionTone;
}

interface ExportReportPayload {
    divinationLabel: string;
    phaseLabel: string;
    contextModeLabel: string;
    question: string;
    sourceTitle?: string;
    sourceUrl?: string;
    analysis: string;
    result: string;
    basisList: string[];
}

const getLocalDateStamp = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const sanitizeFileName = (value: string): string => {
    return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').trim() || '术数报告';
};

const drawAndExportImage = (payload: ExportReportPayload) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = Math.max(2, Math.min(window.devicePixelRatio || 2, 3));
    const cardWidth = 720;
    const padding = 44;
    const contentWidth = cardWidth - padding * 2;
    const sectionGap = 24;
    const footerHeight = 62;
    const fonts = {
        title: 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif',
        subtitle: '14px "PingFang SC", "Microsoft YaHei", sans-serif',
        sectionTitle: 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif',
        body: '15px "PingFang SC", "Microsoft YaHei", sans-serif',
        result: '500 16px "PingFang SC", "Microsoft YaHei", sans-serif',
        footer: '12px "PingFang SC", "Microsoft YaHei", sans-serif'
    };

    const sectionStyles: Record<ExportSectionTone, { title: string; body: string; bg: string; border: string; font: string }> = {
        result: {
            title: '#10b981',
            body: '#dcfce7',
            bg: 'rgba(16, 185, 129, 0.10)',
            border: 'rgba(16, 185, 129, 0.32)',
            font: fonts.result
        },
        analysis: {
            title: '#8bdcff',
            body: '#e4e4e7',
            bg: 'rgba(14, 165, 233, 0.06)',
            border: 'rgba(14, 165, 233, 0.24)',
            font: fonts.body
        },
        basis: {
            title: '#fcd34d',
            body: '#fde68a',
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.26)',
            font: fonts.body
        },
        meta: {
            title: '#c7d2fe',
            body: '#d1d5db',
            bg: 'rgba(99, 102, 241, 0.08)',
            border: 'rgba(99, 102, 241, 0.22)',
            font: fonts.body
        }
    };

    const wrapText = (text: string, maxWidth: number, font: string): string[] => {
        ctx.font = font;
        const lines: string[] = [];
        const paragraphs = text.split('\n');

        paragraphs.forEach(p => {
            if (!p.trim()) {
                lines.push('');
                return;
            }
            let line = '';
            for (const char of Array.from(p)) {
                const testLine = line + char;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line) {
                    lines.push(line);
                    line = char;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                lines.push(line);
            }
        });
        return lines;
    };

    const sections: ExportSection[] = [
        { title: '推演分析', content: payload.analysis, tone: 'analysis' },
        { title: '断语结果', content: payload.result, tone: 'result' }
    ];

    if (payload.basisList.length) {
        sections.push({
            title: '盘面依据',
            content: payload.basisList.map((item, index) => `${index + 1}. ${item}`).join('\n'),
            tone: 'basis'
        });
    }

    const metaItems = [
        `提问：${payload.question}`,
        payload.sourceTitle ? `来源：${payload.sourceTitle}` : '',
        payload.sourceUrl ? `地址：${payload.sourceUrl}` : ''
    ].filter(Boolean);

    if (metaItems.length) {
        sections.push({
            title: '会话信息',
            content: metaItems.join('\n'),
            tone: 'meta'
        });
    }

    const preparedSections = sections.map(section => {
        const style = sectionStyles[section.tone];
        const lines = wrapText(section.content, contentWidth - 32, style.font);
        const lineHeight = section.tone === 'result' ? 29 : 27;
        const height = 58 + lines.length * lineHeight;
        return { ...section, lines, lineHeight, height };
    });

    let currentY = padding + 88;
    const sectionPositions = preparedSections.map(section => {
        const top = currentY;
        currentY += section.height + sectionGap;
        return { top, section };
    });

    const canvasHeight = currentY + footerHeight - sectionGap;
    canvas.width = cardWidth * scale;
    canvas.height = canvasHeight * scale;
    canvas.style.width = `${cardWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, cardWidth, canvasHeight);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, cardWidth - 32, canvasHeight - 32);

    ctx.strokeStyle = '#2d2d31';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, cardWidth - 44, canvasHeight - 44);

    ctx.fillStyle = '#d4af37';
    ctx.font = fonts.title;
    ctx.textAlign = 'center';
    ctx.fillText(`${payload.divinationLabel} · ${payload.phaseLabel}`, cardWidth / 2, padding + 22);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = fonts.subtitle;
    ctx.fillText(`AI 解卦报告 · ${payload.contextModeLabel}`, cardWidth / 2, padding + 50);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding + 68);
    ctx.lineTo(cardWidth - padding, padding + 68);
    ctx.stroke();

    ctx.textAlign = 'left';
    sectionPositions.forEach(({ top, section }) => {
        const style = sectionStyles[section.tone];
        const boxX = padding - 12;
        const boxY = top - 26;
        const boxWidth = contentWidth + 24;
        const boxHeight = section.height;

        ctx.fillStyle = style.bg;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.strokeStyle = style.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = style.title;
        ctx.font = fonts.sectionTitle;
        ctx.fillText(`【${section.title}】`, padding, top);

        ctx.fillStyle = style.body;
        ctx.font = style.font;

        let y = top + 34;
        section.lines.forEach(line => {
            ctx.fillText(line, padding, y);
            y += section.lineHeight;
        });
    });

    ctx.fillStyle = '#52525b';
    ctx.font = fonts.footer;
    ctx.textAlign = 'right';
    ctx.fillText(`Generated by AI Cyber Divination Assistant · ${getLocalDateStamp()}`, cardWidth - padding, canvasHeight - 24);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${sanitizeFileName(payload.divinationLabel)}报告_${getLocalDateStamp()}.png`;
    link.href = dataUrl;
    link.click();
};

const createSessionFromSettings = (settings: AppSettings): ChatSession => {
    return {
        selectedDivinationType: settings.defaultDivinationType,
        resolvedDivinationType: settings.defaultDivinationType === 'auto' ? 'general' : settings.defaultDivinationType,
        contextMode: settings.contextMode,
        phase: 'initial',
        source: null,
        memory: null,
        initialQuestion: '',
        forceInitial: false
    };
};

export const MainPanel = {
    render: (): string => {
        return `<style>${cssContent}</style>\n${htmlContent}`;
    },

    bindEvents: (shadowRoot: ShadowRoot) => {
        const toggleBtn = shadowRoot.getElementById('toggle-btn') as HTMLElement;
        const mainPanel = shadowRoot.getElementById('main-panel') as HTMLElement;
        const closeBtn = shadowRoot.getElementById('close-panel-btn');
        const openSettingsBtn = shadowRoot.getElementById('open-settings-btn');
        const restartAnalysisBtn = shadowRoot.getElementById('restart-analysis-btn');
        const clearHistoryBtn = shadowRoot.getElementById('clear-history-btn');

        const chatHistoryContainer = shadowRoot.getElementById('chat-history') as HTMLElement;
        const questionInput = shadowRoot.getElementById('question-input') as any;
        const sendBtn = shadowRoot.getElementById('send-btn') as any;

        const extractDataBtn = shadowRoot.getElementById('extract-data-btn') as any;
        const dataStatus = shadowRoot.getElementById('data-status') as HTMLElement;
        const divinationTypeSelect = shadowRoot.getElementById('divination-type-select') as any;
        const contextModeSelect = shadowRoot.getElementById('context-mode-select') as any;
        const resolvedTypeBadge = shadowRoot.getElementById('resolved-type-badge') as HTMLElement;
        const phaseBadge = shadowRoot.getElementById('phase-badge') as HTMLElement;
        const detectionBadge = shadowRoot.getElementById('detection-badge') as HTMLElement;

        let currentHistory: ChatMessage[] = [];
        let currentSession = createSessionFromSettings(Store.getSettings());
        let activeRequestController: AbortController | null = null;

        const setSendButtonState = (isSending: boolean) => {
            sendBtn.loading = false;
            sendBtn.disabled = false;
            sendBtn.variant = isSending ? 'danger' : 'primary';
            sendBtn.innerHTML = `
                <sl-icon name="${isSending ? 'stop-circle' : 'send'}" slot="prefix"></sl-icon>
                ${isSending ? '停止' : '发送'}
            `;
        };

        const syncSessionResolution = () => {
            const detectedType = currentSession.source?.detectedType || 'general';
            currentSession.resolvedDivinationType = resolveDivinationType(currentSession.selectedDivinationType, detectedType);
        };

        const setDataStatus = (text: string, tone: 'default' | 'success' | 'warning' | 'danger' = 'default') => {
            dataStatus.style.display = 'inline-block';
            dataStatus.textContent = text;
            dataStatus.style.color =
                tone === 'success'
                    ? 'var(--sl-color-success-500)'
                    : tone === 'warning'
                        ? 'var(--sl-color-warning-500)'
                        : tone === 'danger'
                            ? 'var(--sl-color-danger-500)'
                            : '#888';
        };

        const clearChatView = () => {
            chatHistoryContainer.innerHTML = WELCOME_MESSAGE_HTML;
        };

        const scrollToBottom = () => {
            setTimeout(() => {
                chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
            }, 50);
        };

        const appendMessage = (role: 'user' | 'ai', content: string, options?: { html?: boolean }) => {
            const welcome = chatHistoryContainer.querySelector('.welcome-message');
            if (welcome) {
                welcome.remove();
            }

            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${role}-message`;
            const avatar = role === 'user'
                ? ''
                : `<div class="msg-avatar" style="width: 32px; height: 32px; border-radius: 50%; background-color: var(--sl-color-primary-600); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: var(--sl-shadow-small);">
                       <sl-icon name="cpu" style="font-size: 18px;"></sl-icon>
                   </div>`;

            const bubbleContent = options?.html ? content : safeMultilineHtml(content);

            msgDiv.innerHTML = `
                ${role === 'ai' ? avatar : ''}
                <div class="msg-bubble">${bubbleContent}</div>
            `;

            chatHistoryContainer.appendChild(msgDiv);
            scrollToBottom();
            return msgDiv;
        };

        const appendNote = (content: string) => {
            appendMessage('ai', `<div class="note-bubble">${safeMultilineHtml(content)}</div>`, { html: true });
        };

        const updateSessionBadges = () => {
            syncSessionResolution();
            divinationTypeSelect.value = currentSession.selectedDivinationType;
            contextModeSelect.value = currentSession.contextMode;

            const resolvedLabel = DivinationTypeLabels[currentSession.resolvedDivinationType];
            const typeModeLabel = currentSession.selectedDivinationType === 'auto' ? '自动' : '手动';
            resolvedTypeBadge.textContent = `当前术数：${resolvedLabel}（${typeModeLabel}）`;

            const effectivePhase: SessionPhase = currentSession.forceInitial ? 'initial' : currentSession.phase;
            phaseBadge.textContent = `当前阶段：${SessionPhaseLabels[effectivePhase]}`;

            if (currentSession.source) {
                const detectedLabel = DivinationTypeLabels[currentSession.source.detectedType];
                detectionBadge.textContent = `识别结果：${detectedLabel}`;
                detectionBadge.title = currentSession.source.detectionReason;
            } else {
                detectionBadge.textContent = '识别结果：尚未抓取';
                detectionBadge.title = '';
            }
        };

        const updateDataStatusFromSession = () => {
            if (!currentSession.source) {
                setDataStatus('点击“抓取数据”获取当前页面排盘信息');
                return;
            }

            const source = currentSession.source;
            const detectedLabel = DivinationTypeLabels[source.detectedType];
            const resolvedLabel = DivinationTypeLabels[currentSession.resolvedDivinationType];
            setDataStatus(
                `已抓取 ${source.cleanedText.length} 字，识别为 ${detectedLabel}，当前按 ${resolvedLabel} 处理`,
                'success'
            );
            dataStatus.title = `${source.detectionReason}；${ContextModeHints[currentSession.contextMode]}`;
        };

        const resetConversation = (preserveSource: boolean, note?: string) => {
            currentHistory = [];
            currentSession.memory = null;
            currentSession.phase = 'initial';
            currentSession.initialQuestion = '';
            currentSession.forceInitial = false;

            if (!preserveSource) {
                currentSession.source = null;
            }

            syncSessionResolution();
            clearChatView();
            updateSessionBadges();
            updateDataStatusFromSession();

            if (note) {
                appendNote(note);
            }
        };

        const confirmResetIfNeeded = (message: string): boolean => {
            if (!currentHistory.length && !currentSession.memory && !currentSession.initialQuestion) {
                return true;
            }
            return window.confirm(message);
        };

        const applySource = (source: ScrapedSource, askConfirm: boolean): boolean => {
            if (askConfirm && !confirmResetIfNeeded('重新抓取盘面会清空当前会话记录，并以新盘面重新开始。是否继续？')) {
                return false;
            }

            currentSession.source = source;
            currentSession.memory = null;
            currentSession.phase = 'initial';
            currentSession.forceInitial = false;
            currentSession.initialQuestion = '';
            currentHistory = [];
            syncSessionResolution();
            clearChatView();
            updateSessionBadges();
            updateDataStatusFromSession();

            appendNote(
                `盘面已抓取完成。\n自动识别：${DivinationTypeLabels[source.detectedType]}\n当前解析：${DivinationTypeLabels[currentSession.resolvedDivinationType]}\n识别依据：${source.detectionReason}`
            );
            return true;
        };

        const renderAIResult = (result: AIResult, phase: SessionPhase): { html: string; plainText: string } => {
            const safeAnalysis = formatAIValue(result.分析过程, '（AI 未返回详细的推演过程，请看最终断语）');
            const safeResult = formatAIValue(result.结果, '（AI 未能按标准格式返回断语结果）');
            const basisList = normalizeBasis(result.盘面依据);
            const resolvedLabel = DivinationTypeLabels[currentSession.resolvedDivinationType];
            const phaseLabel = SessionPhaseLabels[phase];
            const basisHtml = basisList.length > 0
                ? `
                    <div class="ai-result-basis">
                        <div class="ai-result-title">
                            <sl-icon name="journal-text"></sl-icon>
                            <span>盘面依据</span>
                        </div>
                        <ul>${basisList.map(item => `<li>${safeMultilineHtml(item)}</li>`).join('')}</ul>
                    </div>
                `
                : '';
            const plainText = [
                `【${resolvedLabel} · ${phaseLabel}】`,
                `【推演分析】\n${safeAnalysis}`,
                `【断语结果】\n${safeResult}`,
                basisList.length > 0 ? `【盘面依据】\n${basisList.join('\n')}` : ''
            ].filter(Boolean).join('\n\n');

            return {
                plainText,
                html: `
                    <div class="ai-result-card">
                        <div class="ai-result-meta">
                            <span class="result-chip">${resolvedLabel}</span>
                            <span class="result-chip">${phaseLabel}</span>
                            <span class="result-chip">${ContextModeLabels[currentSession.contextMode]}</span>
                        </div>

                        <div class="ai-result-section">
                            <div class="ai-result-title">
                                <sl-icon name="compass"></sl-icon>
                                <span>推演分析</span>
                            </div>
                            <div class="ai-result-content">${safeMultilineHtml(safeAnalysis)}</div>
                        </div>

                        <div class="ai-result-primary">
                            <div class="ai-result-title">
                                <sl-icon name="check-circle-fill"></sl-icon>
                                <span>断语结果</span>
                            </div>
                            <div class="ai-result-content">${safeMultilineHtml(safeResult)}</div>
                        </div>

                        ${basisHtml}

                        <div class="ai-result-actions">
                            <sl-button size="small" variant="text" class="copy-report-btn" style="padding: 0; --sl-spacing-x-small: 4px;">
                                <sl-icon name="copy" slot="prefix"></sl-icon>
                                <span class="copy-text">复制报告</span>
                            </sl-button>
                            <sl-button size="small" variant="text" class="export-report-btn" style="padding: 0; --sl-spacing-x-small: 4px;">
                                <sl-icon name="image" slot="prefix"></sl-icon>
                                <span>导出图片</span>
                            </sl-button>
                        </div>
                    </div>
                `
            };
        };

        const syncSessionDefaultsIfIdle = (settings: AppSettings) => {
            if (currentHistory.length || currentSession.source || currentSession.memory || currentSession.initialQuestion) {
                return;
            }

            currentSession = createSessionFromSettings(settings);
            updateSessionBadges();
            updateDataStatusFromSession();
        };

        toggleBtn?.addEventListener('click', () => {
            mainPanel.style.display = 'flex';
            toggleBtn.style.display = 'none';
        });

        closeBtn?.addEventListener('click', () => {
            mainPanel.style.display = 'none';
            toggleBtn.style.display = '';
        });

        extractDataBtn?.addEventListener('click', () => {
            extractDataBtn.loading = true;
            try {
                const source = PageScraper.extractPaipanData();
                if (applySource(source, true)) {
                    extractDataBtn.variant = 'success';
                }
            } catch (err) {
                Logger.error('抓取失败', err);
                setDataStatus('抓取失败 ❌', 'danger');
            } finally {
                extractDataBtn.loading = false;
            }
        });

        clearHistoryBtn?.addEventListener('click', () => {
            if (!currentSession.source && !currentHistory.length) {
                appendNote('当前还没有可清空的对话记录。');
                return;
            }

            resetConversation(
                true,
                currentSession.source
                    ? '已清空当前对话，保留当前盘面。你可以直接重新发起首问分析。'
                    : '已清空当前对话。'
            );
        });

        restartAnalysisBtn?.addEventListener('click', () => {
            if (!currentSession.source) {
                appendNote('请先抓取盘面数据，再重新完整分析。');
                return;
            }

            if (!confirmResetIfNeeded('重新完整分析会清空当前追问上下文，并回到首问分析模式。是否继续？')) {
                return;
            }

            currentHistory = [];
            currentSession.memory = null;
            currentSession.phase = 'initial';
            currentSession.initialQuestion = '';
            currentSession.forceInitial = true;
            clearChatView();
            updateSessionBadges();
            updateDataStatusFromSession();
            appendNote('已切回首问分析模式，当前盘面已保留。请输入新的完整问题。');
        });

        divinationTypeSelect?.addEventListener('sl-change', () => {
            const nextType = divinationTypeSelect.value as DivinationType;
            const previousType = currentSession.selectedDivinationType;

            if (nextType === previousType) return;

            if (currentSession.source && !confirmResetIfNeeded('切换术数类型会按新的术数模板重新开始当前盘面的会话。是否继续？')) {
                divinationTypeSelect.value = previousType;
                return;
            }

            currentSession.selectedDivinationType = nextType;
            syncSessionResolution();

            if (currentSession.source && (currentHistory.length || currentSession.memory || currentSession.initialQuestion)) {
                resetConversation(true, `已切换术数类型为 ${DivinationTypeLabels[currentSession.resolvedDivinationType]}，请重新发起首问分析。`);
            } else {
                updateSessionBadges();
                updateDataStatusFromSession();
            }
        });

        contextModeSelect?.addEventListener('sl-change', () => {
            currentSession.contextMode = contextModeSelect.value as ContextMode;
            updateSessionBadges();
            updateDataStatusFromSession();
            appendNote(`上下文模式已切换为 ${ContextModeLabels[currentSession.contextMode]}。下一轮请求将按新模式组装上下文。`);
        });

        window.addEventListener('ai-gua-settings-saved', (event: Event) => {
            const detail = (event as CustomEvent<AppSettings>).detail;
            if (!detail) return;
            syncSessionDefaultsIfIdle(detail);
        });

        const handleSend = async () => {
            if (activeRequestController) {
                return;
            }

            const question = questionInput.value.trim();
            if (!question) return;

            const settings = Store.getSettings();
            const missingFields = Store.getMissingSettingsFields(settings);

            if (missingFields.length > 0) {
                const missingLabels = missingFields.map((field) => SETTINGS_FIELD_LABELS[field]).join('、');
                setDataStatus(`请先完成本地配置：${missingLabels}`, 'warning');
                appendNote(`请先在设置中补全：${missingLabels}。保存后会自动保存在本地，下次无需重复输入。`);
                openSettingsBtn?.dispatchEvent(new Event('click'));
                questionInput.focus();
                return;
            }

            if (!currentSession.source) {
                Logger.info('用户未手动抓取，触发自动抓取...');
                const source = PageScraper.extractPaipanData();
                if (!applySource(source, false)) {
                    return;
                }
            }

            if (currentSession.phase === 'followup' && shouldRestartFullAnalysis(question)) {
                currentHistory = [];
                currentSession.memory = null;
                currentSession.phase = 'initial';
                currentSession.initialQuestion = '';
                currentSession.forceInitial = true;
                updateSessionBadges();
                updateDataStatusFromSession();
                appendNote('检测到你这次问题更像是“重新完整分析”，本轮将按首问分析模式重新处理当前盘面。');
            }

            appendMessage('user', question);
            questionInput.value = '';

            const requestController = new AbortController();
            activeRequestController = requestController;
            setSendButtonState(true);
            questionInput.disabled = true;

            const aiMsgDiv = appendMessage('ai', `<sl-spinner></sl-spinner> <span style="margin-left: 8px;">正在推演天机...</span>`, { html: true });
            const bubble = aiMsgDiv.querySelector('.msg-bubble') as HTMLElement;
            const requestPhase: SessionPhase = currentSession.forceInitial ? 'initial' : currentSession.phase;

            try {
                const res = await AIRequestService.execute({
                    question,
                    history: currentHistory,
                    settings,
                    session: currentSession,
                    signal: requestController.signal
                });

                const rendered = renderAIResult(res, requestPhase);
                const exportPayload: ExportReportPayload = {
                    divinationLabel: DivinationTypeLabels[currentSession.resolvedDivinationType],
                    phaseLabel: SessionPhaseLabels[requestPhase],
                    contextModeLabel: ContextModeLabels[currentSession.contextMode],
                    question,
                    sourceTitle: currentSession.source?.title,
                    sourceUrl: currentSession.source?.url,
                    analysis: formatAIValue(res.分析过程, '（AI 未返回详细分析过程）'),
                    result: formatAIValue(res.结果, '（AI 未返回断语结果）'),
                    basisList: normalizeBasis(res.盘面依据)
                };
                bubble.innerHTML = rendered.html;

                const copyBtn = bubble.querySelector('.copy-report-btn') as any;
                const exportBtn = bubble.querySelector('.export-report-btn') as any;

                copyBtn?.addEventListener('click', () => {
                    navigator.clipboard.writeText(rendered.plainText).then(() => {
                        const icon = copyBtn.querySelector('sl-icon');
                        const textSpan = copyBtn.querySelector('.copy-text');
                        if (icon) icon.name = 'check-lg';
                        if (textSpan) textSpan.textContent = '已复制';
                        copyBtn.variant = 'success';

                        setTimeout(() => {
                            if (icon) icon.name = 'copy';
                            if (textSpan) textSpan.textContent = '复制报告';
                            copyBtn.variant = 'text';
                        }, 2000);
                    });
                });

                exportBtn?.addEventListener('click', () => {
                    exportBtn.loading = true;
                    try {
                        drawAndExportImage(exportPayload);
                    } catch (err) {
                        Logger.error('导出分享图失败', err);
                    } finally {
                        exportBtn.loading = false;
                    }
                });

                if (requestPhase === 'initial') {
                    currentSession.initialQuestion = question;
                }

                currentSession.memory = res.会话记忆 || currentSession.memory;
                currentSession.phase = 'followup';
                currentSession.forceInitial = false;
                currentHistory = [
                    ...currentHistory,
                    {
                        id: Date.now(),
                        phase: requestPhase,
                        divinationType: currentSession.resolvedDivinationType,
                        question,
                        result: res
                    }
                ].slice(-settings.maxHistory);
                updateSessionBadges();
                updateDataStatusFromSession();
            } catch (error: any) {
                Logger.error('请求失败', error);
                const message = String(error.message || '未知错误');
                questionInput.value = question;
                bubble.innerHTML = message === '请求已取消'
                    ? '<span style="color: var(--sl-color-warning-400);"><sl-icon name="stop-circle"></sl-icon> 已停止本次推演，可修改问题后重试。</span>'
                    : `<span style="color: var(--sl-color-danger-400);"><sl-icon name="exclamation-triangle"></sl-icon> 推演失败：<br>${safeMultilineHtml(message)}</span>`;
            } finally {
                if (activeRequestController === requestController) {
                    activeRequestController = null;
                }
                setSendButtonState(false);
                questionInput.disabled = false;
                questionInput.focus();
                scrollToBottom();
            }
        };

        sendBtn?.addEventListener('click', () => {
            if (activeRequestController) {
                activeRequestController.abort();
                return;
            }

            handleSend();
        });

        questionInput?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!activeRequestController) {
                    handleSend();
                }
            }
        });

        updateSessionBadges();
        updateDataStatusFromSession();
    }
};
