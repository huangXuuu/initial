import type { Plugin } from 'vite';

const ignoreIdList = [
  'vue.js',
  'client.mjs'
];

const virtualId = 'virtual';

export default function myPlugin(): Plugin {
  return {
    name: 'vite-plugin-myTest',
    resolveId(source, importer, options) {
      // console.log('resolveId => source => ', source);
      // console.log('resolveId => importer => ', importer);
      // console.log('resolveId => options => ', options);
      if (source === virtualId) {
        return `replace_${virtualId}`
      }
    },
    load(id, options) {
      // console.log('load => id => ', id);
      // console.log('load => options => ', options);
      // 劫持对于`../utils/counter`模块的加载，返回我们定义的函数
      if (id.includes('utils/counter')) {
        return 'export default function counterReLoader() { return 8 }'
      }
    },
    transform(code, id, options) {
      if (ignoreIdList.filter(target => id.includes(target)).length > 0) {
        return null
      }
      // console.log('transform => id => ', id);
      // console.log('transform => code => ', code);
      // console.log('transform => options => ', options);
    }
  }
}