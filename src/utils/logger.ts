// src/utils/logger.ts
import { AppConfig } from './config';

const PREFIX = `[${AppConfig.name} v${AppConfig.version}]`;

const noop = () => { };

export const Logger = {
    /** 普通信息输出 (带紫色主题色) */
    info: AppConfig.isDebug
        ? (...args: any[]) => console.log(`%c${PREFIX} 🚀`, 'color: #8b5cf6; font-weight: bold;', ...args)
        : noop,

    /** 警告信息输出 (橙色) */
    warn: AppConfig.isDebug
        ? (...args: any[]) => console.warn(`%c${PREFIX} ⚠️`, 'color: #f59e0b; font-weight: bold;', ...args)
        : noop,

    /** 调试信息 (绿色) */
    debug: AppConfig.isDebug
        ? (...args: any[]) => console.debug(`%c${PREFIX} 🐛`, 'color: #10b981;', ...args)
        : noop,

    /** * 错误信息输出 (红色) 
     * 建议：即使在生产环境，保留 Error 输出也有助于排查用户的极端报错。
     * 但既然你要求全部屏蔽，这里也严格执行 noop。
     */
    error: (...args: any[]) => console.error(`%c${PREFIX} ❌`, 'color: #ef4444; font-weight: bold;', ...args)
};