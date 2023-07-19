import { DISABLE_COMMENT } from './constants'
import type { Context } from './context'
import transformComponent from './transforms/component'
import transformDirectives from './transforms/directive'

export interface ResolveResult {
  rawName: string
  replace: (resolved: string) => void
}

// 一个工厂函数，传入上下文及
export default function transformer(ctx: Context, transformer: SupportedTransformer): Transformer {
  return async (code, id, path) => {
    // 查找目标路径下符合条件的所有文件，将其记录下来
    // 目标路径由以下几个配置决定
    // dirs、extensions、globs
    ctx.searchGlob()

    // 解析目标SFC path
    const sfcPath = ctx.normalizePath(path)

    // 生成MagicString对象
    const s = new MagicString(code)

    // 转换组件，非纯函数，改变了MagicString对象值
    await transformComponent(code, transformer, s, ctx, sfcPath)
    // 转换指令
    if (ctx.options.directives)
      await transformDirectives(code, transformer, s, ctx, sfcPath)

    s.prepend(DISABLE_COMMENT)

    // 将被处理后的MagicString值返回，插件结束
    const result: TransformResult = { code: s.toString() }
    return result
  }
}
