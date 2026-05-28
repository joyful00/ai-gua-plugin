// src/utils/scraper.ts
import type { ScrapedSource } from '../types';
import { detectDivinationType } from './divination';
import { Logger } from './logger';

const MAX_PROMPT_TEXT_LENGTH = 3200;
const MAX_CLEANED_TEXT_LENGTH = 8000;
const MAX_EXCERPT_LENGTH = 1200;

const normalizeText = (rawText: string): string => {
    return rawText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{4,}/g, '   ')
        .trim();
};

export const PageScraper = {
    /**
     * 抓取网页上的排盘数据
     */
    extractPaipanData: (): ScrapedSource => {
        Logger.info('开始扫描网页排盘数据...');

        const title = document.title || '未命名页面';
        const url = window.location.href;
        const rawHtml = document.documentElement?.outerHTML || '';
        const rawText = document.body?.innerText || '';
        let cleanedText = normalizeText(rawText);

        if (cleanedText.length > MAX_CLEANED_TEXT_LENGTH) {
            Logger.warn(`网页文本过长，已截取前${MAX_CLEANED_TEXT_LENGTH}字用于会话上下文`);
            cleanedText = cleanedText.slice(0, MAX_CLEANED_TEXT_LENGTH);
        }

        const excerpt = cleanedText.slice(0, MAX_EXCERPT_LENGTH);
        const promptText = cleanedText.slice(0, MAX_PROMPT_TEXT_LENGTH);
        const detection = detectDivinationType(cleanedText, url, title);

        const source: ScrapedSource = {
            title,
            url,
            rawHtml,
            rawText,
            cleanedText,
            promptText,
            excerpt,
            detectedType: detection.type,
            detectionReason: detection.reason
        };

        Logger.debug('抓取到的页面摘要:', {
            title: source.title,
            url: source.url,
            detectedType: source.detectedType,
            detectionReason: source.detectionReason,
            excerpt: source.excerpt
        });

        return source;
    }
};
