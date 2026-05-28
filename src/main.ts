// src/main.ts
import { Logger } from './utils/logger';
import { UIManager } from './ui';

const bootstrap = () => {
    Logger.info('脚本开始初始化...');

    try {
        UIManager.injectShoelace();
        UIManager.mount();

        Logger.info('✨ 赛博解卦面板挂载成功！');
    } catch (err) {
        Logger.error('初始化失败:', err);
    }
};

bootstrap();
