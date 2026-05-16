// src/main.ts
import { Logger } from './utils/logger';
import { UIManager } from './ui';
import { GM_deleteValue } from '$'; // 🌟 1. 引入删除 API
console.log("=================== 我是原始的打印测试 ===================");
const bootstrap = () => {
    Logger.info('脚本开始初始化...');

    try {
        GM_deleteValue('ai_gua_settings');
        UIManager.injectShoelace();
        UIManager.mount();

        Logger.info('✨ 赛博解卦面板挂载成功！');
    } catch (err) {
        Logger.error('初始化失败:', err);
    }
};

bootstrap();