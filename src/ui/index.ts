// src/ui/index.ts
import { Logger } from '../utils/logger';
import { MainPanel } from './views/main-panel';
import { GM_addStyle } from '$';
import '@shoelace-style/shoelace/dist/shoelace.js';
import darkThemeCss from '@shoelace-style/shoelace/dist/themes/dark.css?raw';

export const UIManager = {
    /**
     * 注入 Shoelace 环境
     */
    injectShoelace: () => {
        Logger.debug('开始从本地注入 Shoelace 环境...');
        GM_addStyle(darkThemeCss);
        document.body.setAttribute('data-shoelace', 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.0/cdn');
        document.documentElement.classList.add('sl-theme-dark');
    },

    /**
     * 渲染完整 UI 并挂载到页面
     */
    mount: (): ShadowRoot => {
        Logger.debug('开始挂载 UI 结界...');

        // 1. 创建顶级容器
        const hostDiv = document.createElement('div');
        hostDiv.id = 'ai-gua-host';
        hostDiv.style.cssText = 'position: fixed; right: 20px; bottom: 20px; z-index: 999999;';
        document.body.appendChild(hostDiv);

        // 2. 开启 Shadow DOM
        const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

        // 3. 将各个组件/视图的 HTML 组装进去
        shadowRoot.innerHTML = `
            ${MainPanel.render()}
            `;

        // 4. 委派各个组件去绑定自己的事件
        MainPanel.bindEvents(shadowRoot);
        // SettingsDialog.bindEvents(shadowRoot);

        return shadowRoot;
    }
};