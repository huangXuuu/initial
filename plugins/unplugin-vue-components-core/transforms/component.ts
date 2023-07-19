import type MagicString from 'magic-string'
import { pascalCase, stringifyComponentImport } from '../utils'
import type { Context } from '../context'
import type { ResolveResult } from '../transformer'


function resolveVue2(code: string, s: MagicString) {
  const results: ResolveResult[] = []
  for (const match of code.matchAll(/\b(_c|h)\([\s\n\t]*['"](.+?)["']([,)])/g)) {
    const [full, renderFunctionName, matchedName, append] = match
    if (match.index != null && matchedName && !matchedName.startsWith('_')) {
      const start = match.index
      const end = start + full.length
      results.push({
        rawName: matchedName,
        replace: resolved => s.overwrite(start, end, `${renderFunctionName}(${resolved}${append}`),
      })
    }
  }

  return results
}

function resolveVue3(code: string, s: MagicString) {
  const results: ResolveResult[] = []

  /**
   * when using some plugin like plugin-vue-jsx, resolveComponent will be imported as resolveComponent1 to avoid duplicate import
   */
  // Vue3的官方解析插件@vitejs/plugin-vue会将未知组件（没有import的）解析为render函数
  // 对于SFC中引用的组件，会解析为如下模样
  // const _component_HelloWorldCopy = _resolveComponent("HelloWorldCopy")
  for (const match of code.matchAll(/_resolveComponent[0-9]*\("(.+?)"\)/g)) {
    // 所以经过match，这里的matchedName就是目标组件的名字HelloWorldCopy
    const matchedName = match[1]
    if (match.index != null && matchedName && !matchedName.startsWith('_')) {
      // 记录需要置换的位置
      const start = match.index
      const end = start + match[0].length
      results.push({
        rawName: matchedName,
        replace: resolved => s.overwrite(start, end, resolved),
      })
    }
  }

  return results
}

export default async function transformComponent(code: string, transformer: any, s: MagicString, ctx: Context, sfcPath: string) {
  let no = 0

  const results = transformer === 'vue2' ? resolveVue2(code, s) : resolveVue3(code, s)

  // 拿到需要置换的组件名及闭包函数
  for (const { rawName, replace } of results) {
    const name = pascalCase(rawName)
    ctx.updateUsageMap(sfcPath, [name])
    // 根据之前ctx.searchGlob()方法存储的可供使用的组件路径库，查找符合的组件
    const component = await ctx.findComponent(name, 'component', [sfcPath])
    if (component) {
      // 匹配成功后，置换_resolveComponent("HelloWorldCopy")为`__unplugin_components_${no}`
      // 并在文件最上方导入此组件
      const varName = `__unplugin_components_${no}`
      s.prepend(`${stringifyComponentImport({ ...component, as: varName }, ctx)};\n`)
      no += 1
      replace(varName)
    }
  }
}
