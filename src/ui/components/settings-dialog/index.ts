// src/ui/components/settings-dialog/index.ts
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

        const inputFormat = shadowRoot.getElementById('set-api-format') as any;
        const inputBaseUrl = shadowRoot.getElementById('set-base-url') as any;
        const inputApiKey = shadowRoot.getElementById('set-api-key') as any;
        const inputModel = shadowRoot.getElementById('set-model') as any;
        const inputMaxHistory = shadowRoot.getElementById('set-max-history') as any;

        openBtn?.addEventListener('click', () => {
            const settings = Store.getSettings();
            inputFormat.value = settings.apiFormat;
            inputBaseUrl.value = settings.baseUrl;
            inputApiKey.value = settings.apiKey;
            inputModel.value = settings.model;
            inputMaxHistory.value = settings.maxHistory;
            dialog.show();
        });

        cancelBtn?.addEventListener('click', () => {
            dialog.hide();
        });

        saveBtn?.addEventListener('click', () => {
            const maxHistory = parseInt(inputMaxHistory.value, 10) || 30;
            
            const newSettings: AppSettings = {
                ...Store.getSettings(),
                apiFormat: inputFormat.value,
                baseUrl: inputBaseUrl.value,
                apiKey: inputApiKey.value,
                model: inputModel.value,
                maxHistory: Math.min(Math.max(maxHistory, 1), 100)
            };
            
            Store.saveSettings(newSettings);
            dialog.hide();
            
            Logger.info('设置已保存:', newSettings);
            
            const toast = document.createElement('sl-alert');
            toast.setAttribute('variant', 'success');
            toast.setAttribute('duration', '3000');
            toast.innerHTML = `
                <sl-icon slot="icon" name="check2-circle"></sl-icon>
                <strong>保存成功</strong><br>
                API 配置已更新
            `;
            shadowRoot.appendChild(toast);
            toast.toast();
        });
    }
};
