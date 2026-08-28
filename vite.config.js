import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { sites } from '@openai/sites-vite-plugin'
import { VITE_INPUTS } from './config/site-routes.js'
import feishuScreeningApi from './scripts/feishu-screening-api.mjs'
import feishuEduCliApi from './scripts/feishu-edu-cli-api.mjs'
import feishuArtisanApi from './scripts/feishu-artisan-api.mjs'

export default defineConfig({
  plugins: [sites(), feishuScreeningApi(), feishuEduCliApi(), feishuArtisanApi(), vue(), tailwindcss()],
  build: {
    rollupOptions: {
      input: VITE_INPUTS,
    },
  },
})
