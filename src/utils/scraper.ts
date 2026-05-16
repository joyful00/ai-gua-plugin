// src/utils/scraper.ts
import { Logger } from './logger';

export const PageScraper = {
    /**
     * 抓取网页上的排盘数据
     * @returns 提取到的网页纯文本内容
     */
    extractPaipanData: (): string => {
        Logger.info('开始扫描网页排盘数据...');

        let rawText = document.body.innerText || "";

        let cleanedText = rawText
            .replace(/\n{3,}/g, '\n\n') // 把连续3个以上的换行压缩成2个
            .replace(/\s{4,}/g, '   ')  // 压缩长空格
            .trim();

        if (cleanedText.length > 3000) {
            Logger.warn('网页文本过长，已截取前3000字');
            cleanedText = cleanedText.substring(0, 3000);
        }

        Logger.debug('抓取到的真实网页文本:', cleanedText);
        return cleanedText;
    }
};