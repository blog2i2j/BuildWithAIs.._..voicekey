import { app, BrowserWindow, Notification, Menu, nativeImage } from 'electron'
import path from 'node:path'
import { ASRProvider } from './asr-provider'
import { configManager } from './config-manager'
import { hotkeyManager } from './hotkey-manager' // 待整理
import { ioHookManager } from './iohook-manager' // 待整理
import { registerGlobalHotkeys } from './hotkey'
import { initMainI18n, t } from './i18n'
import { initializeLogger } from './logger'
import { textInjector } from './text-injector'
import { UpdaterManager } from './updater-manager'
import { createTray, refreshLocalizedUi } from './tray'

import {
  createBackgroundWindow,
  // Settings 模块
  createSettingsWindow,
  getSettingsWindow,
  focusSettingsWindow,
} from './window/index'
import { initIPCHandlers, registerAllIPCHandlers } from './ipc'
import {
  // Session Manager
  handleStartRecording,
  handleStopRecording,
  handleAudioData,
  handleCancelSession,
  getCurrentSession,
  setSessionError,
  // Processor
  initProcessor,
} from './audio'

import { initEnv, VITE_DEV_SERVER_URL } from './env'
// 全局变量
let asrProvider: ASRProvider | null = null

// 设置开机自启
function updateAutoLaunchState(enable: boolean) {
  console.log(`[Main] Updating auto-launch state: ${enable}`)
  // Windows/macOS 通用 API
  // openAsHidden: true 让应用启动时隐藏主窗口（只显示托盘）
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
  })
}

// 初始化ASR Provider
function initializeASRProvider() {
  const config = configManager.getASRConfig()
  asrProvider = new ASRProvider(config)
}

// 显示系统通知
function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
    }).show()
  }
}

// 应用程序生命周期
app.whenReady().then(async () => {
  initEnv() // 必须第一个调用
  initializeLogger()
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }

  // 初始化
  const appConfig = configManager.getAppConfig()
  await initMainI18n(appConfig.language)
  updateAutoLaunchState(appConfig.autoLaunch ?? false)
  initializeASRProvider()
  createBackgroundWindow()
  createTray()
  // 初始化音频处理器（需要 ASR Provider 依赖）
  initProcessor({
    getAsrProvider: () => asrProvider,
    initializeASRProvider,
  })
  // 初始化 IPC 处理器依赖
  initIPCHandlers({
    // config-handlers 依赖
    config: {
      updateAutoLaunchState,
      refreshLocalizedUi,
      initializeASRProvider,
      registerGlobalHotkeys,
      getAsrProvider: () => asrProvider,
    },

    // session-handlers 依赖
    session: {
      // 这些现在直接从 audio/ 模块导入
      handleStartRecording,
      handleStopRecording,
      handleAudioData,
      handleCancelSession,
      getCurrentSession,
    },

    // overlay-handlers 依赖
    overlay: {
      showNotification,
      getCurrentSession, // 同样从 audio/ 导入
      setSessionError, // 同样从 audio/ 导入
    },
  })
  registerAllIPCHandlers()
  void UpdaterManager.checkForUpdates()
  registerGlobalHotkeys()
  ioHookManager.start()

  // 设置 Dock 图标和应用名称（macOS）
  if (process.platform === 'darwin') {
    app.setName(t('app.name'))
    const dockIconPath = path.join(process.env.VITE_PUBLIC, 'voice-key-dock-icon.png')
    app.dock.setIcon(nativeImage.createFromPath(dockIconPath))
  }

  // 开发环境下自动打开设置窗口
  if (VITE_DEV_SERVER_URL) {
    createSettingsWindow()
  }

  // 检查权限（macOS）
  if (process.platform === 'darwin') {
    textInjector.checkPermissions().then((result) => {
      if (!result.hasPermission && result.message) {
        showNotification(t('notification.permissionTitle'), result.message)
      }
    })
  }
})

app.on('window-all-closed', () => {
  // MVP版本：即使关闭所有窗口也继续运行（托盘应用）
  // 用户需要从托盘退出
})

app.on('before-quit', () => {
  // 清理资源
  hotkeyManager.unregisterAll()
  ioHookManager.stop()
})

app.on('activate', () => {
  // macOS: 点击 Dock 图标时打开设置窗口
  const settingsWin = getSettingsWindow()
  if (BrowserWindow.getAllWindows().length === 0 || !settingsWin) {
    createSettingsWindow()
  } else {
    focusSettingsWindow()
  }
})
