import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Inspect from 'vite-plugin-inspect';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Inspect(),
    // 全局注册component
    Components({
      /**
       * typeScript支持。
       * typeScript安装状态下默认为true，否则false
       * 如果指定为true则默认生成至【./components.d.ts】
       */
      // dts: './src/components.d.ts',
      dts: false,
      /**
       * 默认只会自动注册【src/components】目录下的组件
       * 可以指定目标目录
       */
      dirs: ['src/component', 'src/components'],
      /**
       * 目标文件后缀
       */
      // extensions: ['vue'],
      /**
       * Glob方式目标文件过滤
       * 此选项拥有最高优先级，会覆盖【extensions】及【dirs】配置
       */
      // globs: ['src/components/*.{vue}'],
      /**
       * 子文件夹是否自动导入,默认【true】
       */
      deep: true,
      /**
       * 解析其他三方库的自动导入
       */
      resolvers: [
        ElementPlusResolver()
      ]
    }),
  ],
})
