import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from "./package.json";

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts',
            userscript: {
                name: 'AI 赛博解卦助手',
                namespace: 'npm/vite-plugin-monkey',
                version: "0.0.1",
                description: "AI算卦、赛博修仙！",
                match: ['https://www.china95.net/paipan/*', 'https://paipan.china95.net/*'],
                grant: ['GM_xmlhttpRequest', 'GM_addStyle'],
                author: 'Joyful',
                tag: "解卦 AI 八字",
            },
        }),
    ],
});