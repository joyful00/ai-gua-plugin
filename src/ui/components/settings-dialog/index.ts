import htmlContent from './template.html?raw';
import cssContent from './style.css?raw';
import { Store } from '../../../store';
import { Logger } from '../../../utils/logger';
import type { AppSettings } from '../../../types';

export const SettingsDialog = {
    render: (): string => {
        return `<style>${cssContent}</style>${htmlContent}`;
    },

    bindEvents: (shadowRoot: ShadowRoot) => {
        const dialog = shadowRoot.getElementById('settings-dialog') as any;
        const openBtn = shadowRoot.getElementById('open-settings-btn');
        const saveBtn = shadowRoot.getElementById('save-settings-btn');
        const cancelBtn = shadowRoot.getElementById('cancel-settings-btn');
        const openPromptSettingsBtn = shadowRoot.getElementById('open-prompt-settings-btn');

        const inputFormat = shadowRoot.getElementById('set-api-format') as any;
        const inputBaseUrl = shadowRoot.getElementById('set-base-url') as any;
        const inputApiKey = shadowRoot.getElementById('set-api-key') as any;
        const inputModel = shadowRoot.getElementById('set-model') as any;
        const inputMaxHistory = shadowRoot.getElementById('set-max-history') as any;
        const inputDefaultDivinationType = shadowRoot.getElementById('set-default-divination-type') as any;
        const inputContextMode = shadowRoot.getElementById('set-context-mode') as any;

        const loadSettingsIntoForm = (settings: AppSettings) => {
            inputFormat.value = settings.apiFormat;
            inputBaseUrl.value = settings.baseUrl;
            inputApiKey.value = settings.apiKey;
            inputModel.value = settings.model;
            inputMaxHistory.value = settings.maxHistory;
            inputDefaultDivinationType.value = settings.defaultDivinationType;
            inputContextMode.value = settings.contextMode;
        };

        openBtn?.addEventListener('click', () => {
            loadSettingsIntoForm(Store.getSettings());
            dialog.show();
        });

        cancelBtn?.addEventListener('click', () => {
            dialog.hide();
        });

        openPromptSettingsBtn?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ai-gua-open-prompt-settings'));
        });

        saveBtn?.addEventListener('click', () => {
            const maxHistory = parseInt(inputMaxHistory.value, 10) || 30;

            const newSettings: AppSettings = {
                ...Store.getSettings(),
                apiFormat: inputFormat.value,
                baseUrl: inputBaseUrl.value,
                apiKey: inputApiKey.value,
                model: inputModel.value,
                maxHistory: Math.min(Math.max(maxHistory, 1), 100),
                defaultDivinationType: inputDefaultDivinationType.value,
                contextMode: inputContextMode.value
            };

            Store.saveSettings(newSettings);
            dialog.hide();

            Logger.info('基础配置已保存');
            window.dispatchEvent(new CustomEvent('ai-gua-settings-saved', { detail: newSettings }));

            const toast = document.createElement('sl-alert');
            toast.setAttribute('variant', 'success');
            toast.setAttribute('duration', '3000');
            toast.innerHTML = `
                <sl-icon slot="icon" name="check2-circle"></sl-icon>
                <strong>保存成功</strong><br>
                基础配置已保存到本地，下次无需重复输入
            `;
            shadowRoot.appendChild(toast);
            toast.toast();
        });
    }
};
