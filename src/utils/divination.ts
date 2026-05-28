import type {
    ContextMode,
    DivinationType,
    PromptDivinationType,
    ScrapedSource,
    SessionPhase
} from '../types';

export interface DivinationDetectionResult {
    type: PromptDivinationType;
    reason: string;
}

export const PROMPT_DIVINATION_TYPES = [
    'bazi',
    'ziwei',
    'xiaoliuren',
    'liuyao',
    'meihua',
    'qimen',
    'xiaoqimen',
    'xiaochengtu',
    'daliuren',
    'jinkoujue',
    'xuankong',
    'general'
] as const satisfies readonly PromptDivinationType[];

export const DivinationTypeLabels: Record<DivinationType, string> = {
    auto: '自动识别',
    bazi: '八字',
    ziwei: '紫微斗数',
    xiaoliuren: '小六壬',
    liuyao: '六爻',
    meihua: '梅花易数',
    qimen: '奇门遁甲',
    xiaoqimen: '飞宫小奇门',
    xiaochengtu: '小成图',
    daliuren: '大六壬',
    jinkoujue: '金口诀',
    xuankong: '玄空风水',
    general: '通用问事'
};

export const ContextModeLabels: Record<ContextMode, string> = {
    smart: '智能模式',
    anchored: '强关联模式',
    full: '完整原盘模式'
};

export const ContextModeHints: Record<ContextMode, string> = {
    smart: '优先发送盘面摘要、关键字段与最近追问',
    anchored: '在智能模式基础上补充更多盘面原文片段',
    full: '每轮都附带更完整的原始盘面文本'
};

export const SessionPhaseLabels: Record<SessionPhase, string> = {
    initial: '首问分析',
    followup: '后续追问'
};

const KEYWORD_GROUPS: Record<PromptDivinationType, string[]> = {
    bazi: ['八字', '四柱', '日主', '十神', '大运', '流年', '命局', '格局', '财星', '夫妻宫'],
    ziwei: ['紫微', '斗数', '命宫', '身宫', '十二宫', '十四主星', '紫微星', '天府', '化禄', '化权', '化科', '化忌'],
    xiaoliuren: ['小六壬', '大安', '留连', '速喜', '赤口', '小吉', '空亡'],
    liuyao: ['六爻', '本卦', '变卦', '动爻', '世爻', '应爻', '用神', '纳甲', '六亲', '六神', '伏神'],
    meihua: ['梅花易数', '梅花', '体卦', '用卦', '互卦', '变卦', '外应', '年月日时起卦'],
    qimen: ['奇门', '遁甲', '值符', '值使', '九宫', '开门', '休门', '生门', '伤门', '杜门', '景门'],
    xiaoqimen: ['飞宫小奇门', '小奇门', '飞宫', '九宫飞布', '直符', '直使', '天盘', '地盘'],
    xiaochengtu: ['小成图', '中宫', '天盘', '地盘', '人盘', '旁通', '触类', '归藏', '八宫'],
    daliuren: ['大六壬', '四课', '三传', '天将', '月将', '贵人', '课传', '发用', '初传', '中传', '末传'],
    jinkoujue: ['金口诀', '人元', '贵神', '将神', '地分', '课内', '课外', '旺相休囚'],
    xuankong: ['玄空', '飞星', '山星', '向星', '下卦', '替卦', '宅盘', '二十四山', '九运'],
    general: []
};

const URL_DIVINATION_RULES: ReadonlyArray<{
    host: string;
    path: string;
    type: PromptDivinationType;
    pageName: string;
    reason?: string;
}> = [
    { host: 'paipan.china95.net', path: '/BaZi/BaZi.asp', type: 'bazi', pageName: 'china95 八字排盘' },
    { host: 'paipan.china95.net', path: '/ZiDou/ZiDou.asp', type: 'ziwei', pageName: 'china95 紫微斗数' },
    { host: 'paipan.china95.net', path: '/LiuYao/LiuYao.asp', type: 'liuyao', pageName: 'china95 六爻梅花' },
    { host: 'paipan.china95.net', path: '/QiMen/QiMen.asp', type: 'qimen', pageName: 'china95 奇门遁甲' },
    { host: 'paipan.china95.net', path: '/DaLiuRen/DaLiuRen.asp', type: 'daliuren', pageName: 'china95 大六壬排盘' },
    { host: 'paipan.china95.net', path: '/JinKouJue/JinKouJue.asp', type: 'jinkoujue', pageName: 'china95 金口诀' },
    { host: 'paipan.china95.net', path: '/XuanKong/XuanKong.asp', type: 'xuankong', pageName: 'china95 玄空风水' },
    { host: 'www.china95.net', path: '/paipan/liuyao/liuyao.asp', type: 'liuyao', pageName: 'china95 六爻' },
    { host: 'www.china95.net', path: '/paipan/bazi/bazi_show.asp', type: 'bazi', pageName: 'china95 八字' },
    { host: 'www.china95.net', path: '/paipan/ziwei/ziwei.asp', type: 'ziwei', pageName: 'china95 紫微斗数' },
    { host: 'www.china95.net', path: '/paipan/qimen/qimen.asp', type: 'qimen', pageName: 'china95 奇门遁甲' },
    { host: 'www.china95.net', path: '/paipan/qimen_show.asp', type: 'qimen', pageName: 'china95 奇门遁甲展示版' },
    { host: 'www.china95.net', path: '/paipan/meihua_show.asp', type: 'meihua', pageName: 'china95 梅花易数' },
    { host: 'www.china95.net', path: '/paipan/xiaochengtu_show.asp', type: 'xiaochengtu', pageName: 'china95 小成图' },
    { host: 'www.china95.net', path: '/paipan/xiaoqimen_show.asp', type: 'xiaoqimen', pageName: 'china95 飞宫小奇门' },
    { host: 'www.china95.net', path: '/paipan/jinkoujue_show.asp', type: 'jinkoujue', pageName: 'china95 金口诀展示版' }
];

const scoreKeywords = (content: string, keywords: string[]): number => {
    return keywords.reduce((score, keyword) => score + (content.includes(keyword) ? 1 : 0), 0);
};

const parseUrlForDetection = (rawUrl: string): { host: string; path: string; raw: string } => {
    const raw = rawUrl.toLowerCase();

    try {
        const parsed = new URL(rawUrl);
        return {
            host: parsed.hostname.toLowerCase(),
            path: parsed.pathname.toLowerCase(),
            raw
        };
    } catch {
        return {
            host: raw,
            path: raw,
            raw
        };
    }
};

const detectByUrl = (url: string): DivinationDetectionResult | null => {
    if (!url.trim()) {
        return null;
    }

    const parsedUrl = parseUrlForDetection(url);
    const rule = URL_DIVINATION_RULES.find(candidate => {
        const normalizedPath = candidate.path.toLowerCase();
        const matchesHost = parsedUrl.host === candidate.host || parsedUrl.host.endsWith(`.${candidate.host}`);
        const matchesPath = parsedUrl.path === normalizedPath || parsedUrl.path.endsWith(normalizedPath);
        const matchesRawUrl = parsedUrl.raw.includes(`${candidate.host}${normalizedPath}`);

        return (matchesHost && matchesPath) || matchesRawUrl;
    });

    if (!rule) {
        return null;
    }

    return {
        type: rule.type,
        reason: rule.reason || `根据${rule.pageName}页面地址识别为${DivinationTypeLabels[rule.type]}`
    };
};

const isChina95PaipanPage = (url: string): boolean => {
    const normalizedUrl = url.toLowerCase();
    return normalizedUrl.includes('paipan.china95.net') || normalizedUrl.includes('www.china95.net/paipan/');
};

export const detectDivinationType = (
    rawText: string,
    url: string = '',
    title: string = ''
): DivinationDetectionResult => {
    const urlMatch = detectByUrl(url);
    if (urlMatch) {
        return urlMatch;
    }

    const corpus = `${title}\n${url}\n${rawText}`.toLowerCase();
    const scoredTypes = PROMPT_DIVINATION_TYPES
        .filter(type => type !== 'general')
        .map(type => ({
            type,
            score: scoreKeywords(corpus, KEYWORD_GROUPS[type].map(keyword => keyword.toLowerCase()))
        }))
        .sort((a, b) => b.score - a.score);

    const bestMatch = scoredTypes[0];
    if (bestMatch && bestMatch.score > 0) {
        return {
            type: bestMatch.type,
            reason: `根据页面关键词识别为${DivinationTypeLabels[bestMatch.type]}`
        };
    }

    if (isChina95PaipanPage(url)) {
        return {
            type: 'general',
            reason: '识别到 china95 排盘页面，但当前地址未命中已配置规则，按通用问事处理'
        };
    }

    return {
        type: 'general',
        reason: '未识别到明显术数特征，按通用问事处理'
    };
};

export const resolveDivinationType = (
    selectedType: DivinationType,
    detectedType: PromptDivinationType
): PromptDivinationType => {
    return selectedType === 'auto' ? detectedType : selectedType;
};

const FULL_REANALYSIS_PATTERNS = [
    /重新.*(分析|看|断|解|排盘)/,
    /(重看|重断|重算|重排|再看一遍|重新起盘)/,
    /(完整分析|完整看盘|完整解读|重新完整分析)/,
    /(从头分析|从头再看|重新全面分析)/
];

export const shouldRestartFullAnalysis = (question: string): boolean => {
    const normalized = question.replace(/\s+/g, '');
    return FULL_REANALYSIS_PATTERNS.some(pattern => pattern.test(normalized));
};

export const getSourceContextByMode = (source: ScrapedSource, mode: ContextMode): string => {
    switch (mode) {
        case 'full':
            return source.cleanedText;
        case 'anchored':
            return source.cleanedText.slice(0, 4500);
        case 'smart':
        default:
            return source.promptText;
    }
};
