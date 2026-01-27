# test/

测试支持文件目录，存放 Vitest 的全局设置。

- `setup.renderer.ts` - 渲染进程测试的全局配置（jsdom、jest-dom、Electron API mock）。
- `setup.main.ts` - 主进程测试的全局配置（Node 环境基础设置）。
