import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 全局注册component
    Components({
      // 指定输出目录（默认./components.d.ts）
      dts: './src/components.d.ts'
    }),
  ],
})
