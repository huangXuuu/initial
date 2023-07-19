# unplugin-vue-components核心代码领读

我们掌握了Vite插件的常用钩子函数及其作用，现在就来看看unplugin-vue-components到底做了什么吧。
细枝末节全部都说到的话篇幅太长，这里只关注核心点。
### 首先是入口文件`unplugin.ts`
```js
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
```
这里做了三件事情：
1. 导出默认入口函数
2. 插件注册时创建上下文对象，保存上下文信息
3. 注册了transform钩子函数，等待Vite调用

### 接下来看上下文对象的构造函数，看看这里做了些什么`context.ts`
```js
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
    this.transformer = transformer(this, name || 'vue3')
  }

  // 钩子函数被调用时，执行了这个方法
  transform(code: string, id: string) {
    const { path, query } = parseId(id)
    // 调用构造时生成的函数，返回处理结果
    return this.transformer(code, id, path, query)
  }
```
这里做了三件事：
1. 解析配置，这里不是核心逻辑，不展开说明
2. 设置transformer
3. 提供核心业务函数transform，入口函数的`ctx.transform(code, id)`就是调用这里

### 接下来就是看`transformer(this, name || 'vue3')`到底干了啥`transformer.ts`
```js
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
```
这里是一个经典的工厂函数，完美利用闭包提供了一切执行时上下文。
看看他生成的函数。也就是最核心的转换逻辑。
1. 根据配置查找了全部需要插件导入的文件路径，保存到了上下文对象中
2. 转换组件
3. 转换指令

接下来我们着重关注转换组件操作`transformComponent(code, transformer, s, ctx, sfcPath)`
```js
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
```
这里就是一个匹配及转换逻辑
1. 根据`@vitejs/plugin-vue`插件产生的render函数特性，找到未被import的组件
2. 在之前收集到的组件列表内进行匹配
3. 将匹配到的结果置换为变量，并在文件头部重新导入

效果如下：
![image.png](https://upload-images.jianshu.io/upload_images/16327703-141d6d3af4b43bed.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)


### 完结
至此，unplugin-vue-components对我们`components`文件夹下组件的自动导入功能就完全实现了。
