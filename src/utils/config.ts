// src/utils/config.ts
import { GM_info } from '$';

/**
 * 全局应用配置
 * 从油猴环境中自动读取名称和版本号，保证全局唯一真实来源
 */
export const AppConfig = {
    name: GM_info.script.name || 'AI 解卦助手',
    version: GM_info.script.version || '1.0.0',
    isDebug: false,
};
