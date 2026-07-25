import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        result: 'result/index.html',
        activate: 'activate/index.html',
        first50: 'first50/index.html',
        thanks: 'thanks/index.html',
        mail: 'mail/index.html',
      },
    },
  },
})
