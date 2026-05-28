// src/store/index.ts
import { GM_getValue, GM_setValue } from '$';
import { createDefaultPromptProfiles } from '../api/prompts';
import { PROMPT_DIVINATION_TYPES } from '../utils/divination';
import { Logger } from '../utils/logger';
import type { AppSettings, PromptProfiles } from '../types';

type RequiredSettingsField = 'baseUrl' | 'apiKey' | 'model';

// 定义安全的默认配置：不内置任何敏感值，用户保存后走本地持久化
const DEFAULT_SETTINGS: AppSettings = {
    apiFormat: 'openai',
    baseUrl: '',
    apiKey: '',
    model: 'gpt-4o',
    maxHistory: 30,
    defaultDivinationType: 'auto',
    contextMode: 'smart',
    promptProfiles: createDefaultPromptProfiles()
};

const cloneDefaultSettings = (): AppSettings => ({
    ...DEFAULT_SETTINGS,
    promptProfiles: createDefaultPromptProfiles()
});

const mergePromptProfiles = (profiles?: Partial<PromptProfiles>): PromptProfiles => {
    const defaults = createDefaultPromptProfiles();

    return PROMPT_DIVINATION_TYPES.reduce((mergedProfiles, type) => {
        mergedProfiles[type] = {
            ...defaults[type],
            ...profiles?.[type]
        };

        return mergedProfiles;
    }, {} as PromptProfiles);
};

const normalizeSettings = (settings: AppSettings): AppSettings => {
    const maxHistory = Number(settings.maxHistory) || DEFAULT_SETTINGS.maxHistory;

    return {
        ...cloneDefaultSettings(),
        ...settings,
        apiFormat: settings.apiFormat === 'openai' ? 'openai' : DEFAULT_SETTINGS.apiFormat,
        baseUrl: settings.baseUrl.trim(),
        apiKey: settings.apiKey.trim(),
        model: settings.model.trim(),
        maxHistory: Math.min(Math.max(maxHistory, 1), 100),
        promptProfiles: mergePromptProfiles(settings.promptProfiles)
    };
};

const getMissingSettingsFields = (settings: AppSettings): RequiredSettingsField[] => {
    const normalized = normalizeSettings(settings);
    const missingFields: RequiredSettingsField[] = [];

    if (!normalized.baseUrl) {
        missingFields.push('baseUrl');
    }

    if (!normalized.apiKey) {
        missingFields.push('apiKey');
    }

    if (!normalized.model) {
        missingFields.push('model');
    }

    return missingFields;
};

export const Store = {
    /**
     * 获取当前设置
     */
    getSettings(): AppSettings {
        try {
            const raw = GM_getValue('ai_gua_settings', '');
            if (raw) {
                const parsed = JSON.parse(raw);
                return normalizeSettings({ ...cloneDefaultSettings(), ...parsed });
            }
        } catch (err) {
            Logger.error('读取本地设置失败，将使用默认配置', err);
        }

        return normalizeSettings(cloneDefaultSettings());
    },

    /**
     * 持久化保存设置
     */
    saveSettings(settings: AppSettings): void {
        try {
            const normalizedSettings = normalizeSettings(settings);
            GM_setValue('ai_gua_settings', JSON.stringify(normalizedSettings));
            Logger.info('⚙️ 设置已成功持久化到本地');
        } catch (err) {
            Logger.error('保存设置失败', err);
        }
    },

    getDefaultSettings(): AppSettings {
        return cloneDefaultSettings();
    },

    getMissingSettingsFields(settings: AppSettings): RequiredSettingsField[] {
        return getMissingSettingsFields(settings);
    },

    isSettingsConfigured(settings: AppSettings): boolean {
        return getMissingSettingsFields(settings).length === 0;
    }
};
