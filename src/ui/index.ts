// src/ui/index.ts
import { Logger } from '../utils/logger';
import { MainPanel } from './views/main-panel';
// 引入刚刚写好的设置弹窗
import { SettingsDialog } from './components/settings-dialog';
import { GM_addStyle } from '$';
import '@shoelace-style/shoelace/dist/shoelace.js';
import darkThemeCss from '@shoelace-style/shoelace/dist/themes/dark.css?raw';

export const UIManager = {
    injectShoelace: () => {
        Logger.debug('开始从本地注入 Shoelace 环境...');
        GM_addStyle(darkThemeCss);
        document.body.setAttribute('data-shoelace', 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn');
        document.documentElement.classList.add('sl-theme-dark');
    },

    mount: (): ShadowRoot => {
        Logger.debug('开始挂载 UI 结界...');

        const hostDiv = document.createElement('div');
        hostDiv.id = 'ai-gua-host';
        hostDiv.style.cssText = 'position: fixed; right: 20px; bottom: 20px; z-index: 999999;';
        document.body.appendChild(hostDiv);

        const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

        // 🌟 把主面板和设置弹窗的 HTML 全都塞进结界里
        shadowRoot.innerHTML = `
            ${MainPanel.render()}
            ${SettingsDialog.render()}
        `;

        // 🌟 分别调用它们自己的事件绑定函数
        MainPanel.bindEvents(shadowRoot);
        SettingsDialog.bindEvents(shadowRoot);

        return shadowRoot;
    }
};