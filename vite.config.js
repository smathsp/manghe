import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import feishuScreeningApi from './scripts/feishu-screening-api.mjs'

export default defineConfig({
  plugins: [feishuScreeningApi(), vue(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        result: 'result/index.html',
        activate: 'activate/index.html',
        first50: 'first50/index.html',
        thanks: 'thanks/index.html',
        voidBox: 'void-box/index.html',
        mail: 'mail/index.html',
        screening: 'screening/index.html',
      },
    },
  },
})
