# VITE插件学习

[unplugin-vue-components](https://github.com/antfu/unplugin-vue-components)是我们应用Vite中的插件，想要搞清楚他干了什么事，就要先了解Vite插件。
### 关于插件的题外话
Vite官方团队在创造Vite时，为了使其可以服务更多方向（不仅局限于Vue），将一些Vue专属的解析工作做成了插件[@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#readme)。

这使得Vite与Vue完全解耦。

而插件本身，就是我们要解决各种各样的场景下的不便利性，而创造的工具。
### 言回正传
Vite插件是基于Rollup而构建，提供了各种钩子函数，以便在不同生命周期节点执行插件代码，

以完成我们想要实现的目标。

[unplugin-vue-components](https://github.com/antfu/unplugin-vue-components)帮我们免去了繁琐的组件的导入工作，使SFC文件更加干净，更加着眼于业务代码。

Vite插件基于Rollup提供了几个[钩子](https://cn.vitejs.dev/guide/api-plugin.html#universal-hooks)，我们着重聊三个最常见的：
### 1. [resolveid](https://cn.rollupjs.org/plugin-development/#resolveid)
    官方解释：定义一个自定义解析器。解析器可以用于定位第三方依赖项等。
    可以追踪到三方依赖，然后进行自定义解析。

我们在Vue文件中导入三方模块`virtual`
```Vue
// Vue文件
<script setup lang="ts">
import counter from '../utils/counter';
import cat from 'virtual';

defineProps<{ msg: string }>()

</script>

<template>
  <h1>我是HelloWorldCopy</h1>
  <h1>{{ msg }}</h1>
  <h1>{{ counter(1, 2) }}</h1>
  <h1>{{ cat() }}</h1>
</template>
```
在插件中捕获对'virtual'的导入，将其置换为`replace_virtual`
```ts
// plugins.ts
const virtualId = 'virtual';

export default function myPlugin(): Plugin {
  return {
    name: 'vite-plugin-myTest',
    resolveId(source, importer, options) {
      console.log('resolveId => source => ', source);
      console.log('resolveId => importer => ', importer);
      console.log('resolveId => options => ', options);
      if (source === virtualId) {
        return `replace_${virtualId}`
      }
    }
}
```
插件执行后被置换为`replace_virtual`
![image.png](https://upload-images.jianshu.io/upload_images/16327703-4a57653e30c59ba0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 2. [load](https://cn.rollupjs.org/plugin-development/#load)
    官方解释：定义自定义加载器。
    我们在使用ESM导入、加载一个模块时，可以被这个钩子劫持，加载想要置换的内容。

创建counter.ts
```ts
export default function counter(numberA: number, numberB: number): number {
  return numberA + numberB
}
```
这里我们从`../utils/counter`导入counter，传入参数1,2。
```Vue
// Vue文件
<script setup lang="ts">
import counter from '../utils/counter';
// import cat from 'virtual';

defineProps<{ msg: string }>()

</script>

<template>
  <h1>我是HelloWorldCopy</h1>
  <h1>{{ msg }}</h1>
  <h1>{{ counter(1, 2) }}</h1>
  <!-- <h1>{{ cat() }}</h1> -->
</template>
```
很显然，这时候页面会渲染3。
上插件：
```ts
export default function myPlugin(): Plugin {
  return {
    name: 'vite-plugin-myTest'
    load(id, options) {
      console.log('load => id => ', id);
      console.log('load => options => ', options);
      // 劫持对于`../utils/counter`模块的加载，返回我们定义的函数
      if (id.includes('utils/counter')) {
        return 'export default function counterReLoader() { return 8 }'
      }
    }
  }
}
```
插件生效后，页面渲染为

![image.png](https://upload-images.jianshu.io/upload_images/16327703-2e7c7fdfa5764188.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

### 3. [transform](https://cn.rollupjs.org/plugin-development/#transform)
    官方解释：可用于转换单个模块。
    大多数解析插件的舞台，Vue官方插件也是在这里将SFC解析为AST的

这里不做特别说明，因为我们本次研究的主角`unplugin-vue-components`，舞台也在这里。
下一节来研究它究竟干了些什么。
