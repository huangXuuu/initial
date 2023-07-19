import { createUnplugin } from 'unplugin'
import type { Options, PublicPluginAPI } from '../types'
import { Context } from './context'
import { shouldTransform, stringifyComponentImport } from './utils'

// 入口函数
export default createUnplugin<Options>((options = {}) => {
  // 注册插件时创建上下文对象，保存配置信息
  const ctx: Context = new Context(options)

  return {
    name: 'unplugin-vue-components',
    enforce: 'post',
    // 注册transform钩子函数，等待Vite调用
    async transform(code, id) {
      // 判断是否为被忽略的文件
      // 带有下面注释则会忽略
      //  '/* unplugin-vue-components disabled */'
      if (!shouldTransform(code))
        return null
      try {
        // 核心操作，转换代码
        const result = await ctx.transform(code, id)
        // 生成声明文件，一般默认为component.d.ts
        ctx.generateDeclaration()
        return result
      }
      catch (e) {
        this.error(e)
      }
    }
  }
})
