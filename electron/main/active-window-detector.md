# active-window-detector.ts

活跃窗口检测模块，用于获取用户当前正在使用的应用程序信息，支持上下文感知的 AI 润色功能。

## 功能

- 检测当前活跃窗口的应用名称和进程名
- 支持 Windows 和 macOS 平台
- 处理权限问题（macOS 需要辅助功能权限）
- 提供用户友好的错误提示

## 使用

```typescript
import { activeWindowDetector, getDetectionFailureMessage } from './active-window-detector'

// 检测活跃窗口
const result = await activeWindowDetector.detect()

if (result.success) {
  console.log('当前应用:', result.info.appName)
  console.log('进程名:', result.info.processName)
  console.log('平台:', result.info.platform)
} else {
  console.error('检测失败:', getDetectionFailureMessage(result.reason))
}
```

## 数据结构

```typescript
interface WindowInfo {
  appName: string // 如 "Visual Studio Code"
  processName: string // 如 "Code.exe"
  platform: 'win32' | 'darwin'
}
```

## 注意事项

- **Windows**: 无需额外权限
- **macOS**: 需要用户在"系统设置 > 隐私与安全性 > 辅助功能"中授予权限
