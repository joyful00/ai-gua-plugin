// src/store/index.ts
import { GM_getValue, GM_setValue } from '$';
import { Logger } from '../utils/logger';
import type { AppSettings } from '../types';

// 定义出厂默认配置，作为兜底和覆盖基准
const DEFAULT_SETTINGS: AppSettings = {
    apiFormat: 'openai',
    baseUrl: '', 
    apiKey: '',
    model: 'gpt-4o',
    maxHistory: 30
};

export const Store = {
    /**
     * 获取当前设置
     */
    getSettings(): AppSettings {
        try {
            // 从油猴沙箱中读取字符串，默认返回空字符串
            const raw = GM_getValue('ai_gua_settings', '');
            if (raw) {
                const parsed = JSON.parse(raw);
                // 核心技巧：合并对象。
                // 确保哪怕用户的本地数据缺失了某个新字段，也会被 DEFAULT_SETTINGS 补齐
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (err) {
            Logger.error('读取本地设置失败，将使用默认配置', err);
        }
        
        return { ...DEFAULT_SETTINGS };
    },

    /**
     * 持久化保存设置
     */
    saveSettings(settings: AppSettings): void {
        try {
            // 序列化为 JSON 字符串保存，跨脚本管理器兼容性最好
            GM_setValue('ai_gua_settings', JSON.stringify(settings));
            Logger.info('⚙️ 设置已成功持久化到本地');
        } catch (err) {
            Logger.error('保存设置失败', err);
        }
    }
};