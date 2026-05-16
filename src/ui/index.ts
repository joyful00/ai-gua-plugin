// src/ui/index.ts
import { Logger } from '../utils/logger';
import { MainPanel } from './views/main-panel';
import { SettingsDialog } from './components/settings-dialog';
import { GM_addStyle } from '$';
import '@shoelace-style/shoelace/dist/shoelace.js';
import darkThemeCss from '@shoelace-style/shoelace/dist/themes/dark.css?raw';
// 🌟 修复图标不显示：引入 Shoelace 官方的路径设置工具
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

export const UIManager = {
    injectShoelace: () => {
        Logger.debug('开始从本地注入 Shoelace 环境...');
        GM_addStyle(darkThemeCss);
        
        // 🌟 修复图标不显示：强制指定与你本地版本 (2.20.1) 一致的资源路径
        setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/');

        // 🌟 修复网站变黑：删除以前写在全局的 sl-theme-dark (这里什么都不用加了)
    },

    mount: (): ShadowRoot => {
        Logger.debug('开始挂载 UI 结界...');

        const hostDiv = document.createElement('div');
        hostDiv.id = 'ai-gua-host';
        hostDiv.style.cssText = 'position: fixed; right: 20px; bottom: 20px; z-index: 999999;';
        
        // 🌟 修复网站变黑：只让我们的插件容器进入“暗黑模式”，绝不污染外部网页！
        hostDiv.classList.add('sl-theme-dark');

        document.body.appendChild(hostDiv);

        const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

        shadowRoot.innerHTML = `
            ${MainPanel.render()}
            ${SettingsDialog.render()}
        `;

        MainPanel.bindEvents(shadowRoot);
        SettingsDialog.bindEvents(shadowRoot);

        return shadowRoot;
    }
};