import htmlContent from './template.html?raw';
import cssContent from './style.css?raw';
import { Store } from '../../../store';
import { PROMPT_DIVINATION_TYPES } from '../../../utils/divination';
import { Logger } from '../../../utils/logger';
import type { AppSettings, PromptDivinationType, PromptProfiles } from '../../../types';

type PromptInputMap = Record<PromptDivinationType, {
    initial: HTMLTextAreaElement;
    followup: HTMLTextAreaElement;
}>;

const PROMPT_TYPES = PROMPT_DIVINATION_TYPES;

export const PromptSettingsDialog = {
    render: (): string => {
        return `<style>${cssContent}</style>${htmlContent}`;
    },

    bindEvents: (shadowRoot: ShadowRoot) => {
        const dialog = shadowRoot.getElementById('prompt-settings-dialog') as any;
        const settingsDialog = shadowRoot.getElementById('settings-dialog') as any;
        const saveBtn = shadowRoot.getElementById('save-prompts-btn') as any;
        const backBtn = shadowRoot.getElementById('back-to-settings-btn');
        const resetPromptsBtn = shadowRoot.getElementById('reset-prompts-btn') as any;

        const getPromptInputs = (): PromptInputMap => {
            return PROMPT_TYPES.reduce((inputs, type) => {
                inputs[type] = {
                    initial: shadowRoot.getElementById(`prompt-${type}-initial`) as HTMLTextAreaElement,
                    followup: shadowRoot.getElementById(`prompt-${type}-followup`) as HTMLTextAreaElement
                };

                return inputs;
            }, {} as PromptInputMap);
        };

        const fillPromptInputs = (profiles: PromptProfiles) => {
            const inputs = getPromptInputs();
            PROMPT_TYPES.forEach(type => {
                inputs[type].initial.value = profiles[type].initial;
                inputs[type].followup.value = profiles[type].followup;
            });
        };

        const collectPromptProfiles = (): PromptProfiles => {
            const inputs = getPromptInputs();
            const defaultProfiles = Store.getDefaultSettings().promptProfiles;

            return PROMPT_TYPES.reduce((profiles, type) => {
                profiles[type] = {
                    initial: inputs[type].initial.value || defaultProfiles[type].initial,
                    followup: inputs[type].followup.value || defaultProfiles[type].followup
                };

                return profiles;
            }, {} as PromptProfiles);
        };

        const loadSettingsIntoForm = (settings: AppSettings) => {
            fillPromptInputs(settings.promptProfiles);
        };

        window.addEventListener('ai-gua-open-prompt-settings', () => {
            loadSettingsIntoForm(Store.getSettings());
            settingsDialog?.hide();
            dialog.show();
        });

        backBtn?.addEventListener('click', () => {
            dialog.hide();
            settingsDialog?.show();
        });

        resetPromptsBtn?.addEventListener('click', () => {
            fillPromptInputs(Store.getDefaultSettings().promptProfiles);
        });

        saveBtn?.addEventListener('click', () => {
            const newSettings: AppSettings = {
                ...Store.getSettings(),
                promptProfiles: collectPromptProfiles()
            };

            Store.saveSettings(newSettings);
            dialog.hide();

            Logger.info('Prompt 模板已保存');
            window.dispatchEvent(new CustomEvent('ai-gua-settings-saved', { detail: newSettings }));

            const toast = document.createElement('sl-alert');
            toast.setAttribute('variant', 'success');
            toast.setAttribute('duration', '3000');
            toast.innerHTML = `
                <sl-icon slot="icon" name="check2-circle"></sl-icon>
                <strong>保存成功</strong><br>
                Prompt 模板已保存到本地
            `;
            shadowRoot.appendChild(toast);
            toast.toast();
        });
    }
};
