// src/ui/views/main-panel/index.ts
import htmlContent from './template.html?raw';
import cssContent from './style.css?raw';

export const MainPanel = {
    /** * 吐出这个视图完整的 HTML 字符串 (自带 Scoped 样式)
     */
    render: (): string => {
        return `
            <style>${cssContent}</style>
            ${htmlContent}
        `;
    },

    /** * 专门负责绑定【主面板】相关的交互事件
     */
    bindEvents: (shadowRoot: ShadowRoot) => {
        const toggleBtn = shadowRoot.getElementById('toggle-btn');
        const mainPanel = shadowRoot.getElementById('main-panel');
        const closeBtn = shadowRoot.getElementById('close-panel-btn');

        // 面板开关逻辑
        toggleBtn?.addEventListener('click', () => {
            mainPanel!.style.display = 'flex';
            toggleBtn.style.display = 'none';
        });

        closeBtn?.addEventListener('click', () => {
            mainPanel!.style.display = 'none';
            toggleBtn!.style.display = 'inline-flex';
        });

        // 发送按钮逻辑可以先占个位
        const sendBtn = shadowRoot.getElementById('send-btn');
        sendBtn?.addEventListener('click', () => {
            console.log("点击了发送推演...");
            // 稍后这里会调用 Engine 层
        });
    }
};