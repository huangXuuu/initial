import type { Options, ResolvedOptions, Transformer, ComponentInfo } from './types'
import { parseId, resolveAlias, normalizeComponetInfo, getNameFromFilePath, pascalCase } from './utils'
import { resolveOptions } from './options'
import { searchComponents } from './fs/glob'
import transformer from './transformer'

export class Context {
  options: ResolvedOptions
  transformer: Transformer = undefined!

  private _componentPaths = new Set<string>()
  private _componentNameMap: Record<string, ComponentInfo> = {}
  private _componentUsageMap: Record<string, Set<string>> = {}

  root = process.cwd()

  constructor(
    private rawOptions: Options,
  ) {
    // 解析配置
    this.options = resolveOptions(rawOptions, this.root)
    // 设置transformer
    this.setTransformer(this.options.transformer)
  }

  setTransformer(name: Options['transformer']) {
    // 默认设置transformer为vue3
    // 生成transformer函数
    this.transformer = transformer(this, name || 'vue3')
  }

  // 钩子函数被调用时，执行了这个方法
  transform(code: string, id: string) {
    const { path, query } = parseId(id)
    // 调用构造时生成的函数，返回处理结果
    return this.transformer(code, id, path, query)
  }


  _searched = false

  /**
   * This search for components in with the given options.
   * Will be called multiple times to ensure file loaded,
   * should normally run only once.
   */
  searchGlob() {
    if (this._searched)
      return

    searchComponents(this)
    this._searched = true
  }

  normalizePath(path: string) {
    // @ts-expect-error backward compatibility
    return resolveAlias(path, this.viteConfig?.resolve?.alias || this.viteConfig?.alias || [])
  }

  addComponents(paths: string | string[]) {
    debug.components('add', paths)

    const size = this._componentPaths.size
    toArray(paths).forEach(p => this._componentPaths.add(p))
    if (this._componentPaths.size !== size) {
      this.updateComponentNameMap()
      return true
    }
    return false
  }

  private updateComponentNameMap() {
    this._componentNameMap = {}

    Array
      .from(this._componentPaths)
      .forEach((path) => {
        const name = pascalCase(getNameFromFilePath(path, this.options))
        if (this._componentNameMap[name] && !this.options.allowOverrides) {
          console.warn(`[unplugin-vue-components] component "${name}"(${path}) has naming conflicts with other components, ignored.`)
          return
        }

        this._componentNameMap[name] = {
          as: name,
          from: path,
        }
      })
  }

  async findComponent(name: string, type: 'component' | 'directive', excludePaths: string[] = []): Promise<ComponentInfo | undefined> {
    // resolve from fs
    let info = this._componentNameMap[name]
    if (info && !excludePaths.includes(info.from) && !excludePaths.includes(info.from.slice(1)))
      return info

    // custom resolvers
    for (const resolver of this.options.resolvers) {
      if (resolver.type !== type)
        continue

      const result = await resolver.resolve(type === 'directive' ? name.slice(DIRECTIVE_IMPORT_PREFIX.length) : name)
      if (!result)
        continue

      if (typeof result === 'string') {
        info = {
          as: name,
          from: result,
        }
      }
      else {
        info = {
          as: name,
          ...normalizeComponetInfo(result),
        }
      }
      if (type === 'component')
        this.addCustomComponents(info)
      else if (type === 'directive')
        this.addCustomDirectives(info)
      return info
    }

    return undefined
  }
}
