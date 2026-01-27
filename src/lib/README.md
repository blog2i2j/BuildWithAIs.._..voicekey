# lib/

通用工具函数库。

## 文件

- `utils.ts` - `cn()`：合并 className（clsx + tailwind-merge）。
- `hotkey-utils.ts` - 快捷键工具：规范化/构建/格式化/校验 Accelerator，内置预设与系统保留键。
- `logger.ts` - 渲染进程日志初始化：转发 console 与未捕获错误到主进程日志。
- `__tests__/` - 渲染进程工具函数测试（hotkey-utils 等）。
