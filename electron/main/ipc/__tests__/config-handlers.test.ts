import { beforeEach, describe, expect, it, vi } from 'vitest'
import createIPCMock from 'electron-mock-ipc'
import { IPC_CHANNELS, type ASRConfig } from '@electron/shared/types'

type HandlerMap = Map<string, (event: unknown, ...args: unknown[]) => unknown>

let mockConfigManager: {
  getConfig: ReturnType<typeof vi.fn>
  setAppConfig: ReturnType<typeof vi.fn>
  setASRConfig: ReturnType<typeof vi.fn>
  setHotkeyConfig: ReturnType<typeof vi.fn>
}
let mockBroadcastLanguageSnapshot: ReturnType<typeof vi.fn>
let mockGetMainLanguageSnapshot: ReturnType<typeof vi.fn>
let mockSetMainLanguage: ReturnType<typeof vi.fn>
let mockHotkeyManager: { unregisterAll: ReturnType<typeof vi.fn> }
let mockIoHookManager: { removeAllListeners: ReturnType<typeof vi.fn> }
let mockASRProviderInstance: { testConnection: ReturnType<typeof vi.fn> }
let mockASRProviderCtor: ReturnType<typeof vi.fn>

const setupModuleMocks = (ipcMain: unknown, ipcRenderer?: unknown) => {
  vi.doMock('electron', () => ({ ipcMain, ipcRenderer }))
  vi.doMock('../../config-manager', () => ({ configManager: mockConfigManager }))
  vi.doMock('../../i18n', () => ({
    broadcastLanguageSnapshot: mockBroadcastLanguageSnapshot,
    getMainLanguageSnapshot: mockGetMainLanguageSnapshot,
    setMainLanguage: mockSetMainLanguage,
  }))
  vi.doMock('../../hotkey-manager', () => ({ hotkeyManager: mockHotkeyManager }))
  vi.doMock('../../iohook-manager', () => ({ ioHookManager: mockIoHookManager }))
  vi.doMock('../../asr-provider', () => ({ ASRProvider: mockASRProviderCtor }))
}

const createHandlers = () => {
  const handlers: HandlerMap = new Map()
  const ipcMain = {
    handle: vi.fn((channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    }),
  }
  return { ipcMain, handlers }
}

const setupCommonMocks = () => {
  mockConfigManager = {
    getConfig: vi.fn(() => ({ app: {}, asr: {}, hotkey: {} })),
    setAppConfig: vi.fn(),
    setASRConfig: vi.fn(),
    setHotkeyConfig: vi.fn(),
  }
  mockBroadcastLanguageSnapshot = vi.fn()
  mockGetMainLanguageSnapshot = vi.fn(() => ({
    setting: 'system',
    resolved: 'en',
    locale: 'en-US',
  }))
  mockSetMainLanguage = vi.fn().mockResolvedValue(undefined)
  mockHotkeyManager = { unregisterAll: vi.fn() }
  mockIoHookManager = { removeAllListeners: vi.fn() }
  mockASRProviderInstance = { testConnection: vi.fn().mockResolvedValue(true) }
  const MockImpl = function () {
    return mockASRProviderInstance
  }
  mockASRProviderCtor = vi.fn(MockImpl)
}

describe('config-handlers (unit)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setupCommonMocks()
  })

  it('returns config on CONFIG_GET', async () => {
    const { ipcMain, handlers } = createHandlers()
    setupModuleMocks(ipcMain)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    initConfigHandlers({
      updateAutoLaunchState: vi.fn(),
      refreshLocalizedUi: vi.fn(),
      initializeASRProvider: vi.fn(),
      registerGlobalHotkeys: vi.fn(),
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const handler = handlers.get(IPC_CHANNELS.CONFIG_GET)
    expect(handler).toBeDefined()
    const result = await handler?.(null)
    expect(mockConfigManager.getConfig).toHaveBeenCalled()
    expect(result).toEqual({ app: {}, asr: {}, hotkey: {} })
  })

  it('returns language snapshot on APP_LANGUAGE_GET', async () => {
    const { ipcMain, handlers } = createHandlers()
    setupModuleMocks(ipcMain)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    initConfigHandlers({
      updateAutoLaunchState: vi.fn(),
      refreshLocalizedUi: vi.fn(),
      initializeASRProvider: vi.fn(),
      registerGlobalHotkeys: vi.fn(),
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const handler = handlers.get(IPC_CHANNELS.APP_LANGUAGE_GET)
    const snapshot = await handler?.(null)
    expect(mockGetMainLanguageSnapshot).toHaveBeenCalled()
    expect(snapshot).toEqual({
      setting: 'system',
      resolved: 'en',
      locale: 'en-US',
    })
  })

  it('updates app config and triggers language + autolaunch effects', async () => {
    const { ipcMain, handlers } = createHandlers()
    setupModuleMocks(ipcMain)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    const updateAutoLaunchState = vi.fn()
    const refreshLocalizedUi = vi.fn()

    initConfigHandlers({
      updateAutoLaunchState,
      refreshLocalizedUi,
      initializeASRProvider: vi.fn(),
      registerGlobalHotkeys: vi.fn(),
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const handler = handlers.get(IPC_CHANNELS.CONFIG_SET)
    await handler?.(null, { app: { autoLaunch: true, language: 'en' } })

    expect(mockConfigManager.setAppConfig).toHaveBeenCalledWith({
      autoLaunch: true,
      language: 'en',
    })
    expect(updateAutoLaunchState).toHaveBeenCalledWith(true)
    expect(mockSetMainLanguage).toHaveBeenCalledWith('en')
    expect(mockBroadcastLanguageSnapshot).toHaveBeenCalled()
    expect(refreshLocalizedUi).toHaveBeenCalled()
  })

  it('updates ASR config and reinitializes provider', async () => {
    const { ipcMain, handlers } = createHandlers()
    setupModuleMocks(ipcMain)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    const initializeASRProvider = vi.fn()
    initConfigHandlers({
      updateAutoLaunchState: vi.fn(),
      refreshLocalizedUi: vi.fn(),
      initializeASRProvider,
      registerGlobalHotkeys: vi.fn(),
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const handler = handlers.get(IPC_CHANNELS.CONFIG_SET)
    await handler?.(null, { asr: { region: 'intl' } })
    expect(mockConfigManager.setASRConfig).toHaveBeenCalledWith({ region: 'intl' })
    expect(initializeASRProvider).toHaveBeenCalled()
  })

  it('updates hotkey config and re-registers listeners', async () => {
    const { ipcMain, handlers } = createHandlers()
    setupModuleMocks(ipcMain)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    const registerGlobalHotkeys = vi.fn()
    initConfigHandlers({
      updateAutoLaunchState: vi.fn(),
      refreshLocalizedUi: vi.fn(),
      initializeASRProvider: vi.fn(),
      registerGlobalHotkeys,
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const handler = handlers.get(IPC_CHANNELS.CONFIG_SET)
    await handler?.(null, { hotkey: { pttKey: 'Alt', toggleSettings: 'Command+Shift+,' } })

    expect(mockConfigManager.setHotkeyConfig).toHaveBeenCalledWith({
      pttKey: 'Alt',
      toggleSettings: 'Command+Shift+,',
    })
    expect(mockHotkeyManager.unregisterAll).toHaveBeenCalled()
    expect(mockIoHookManager.removeAllListeners).toHaveBeenCalledWith('keydown')
    expect(mockIoHookManager.removeAllListeners).toHaveBeenCalledWith('keyup')
    expect(registerGlobalHotkeys).toHaveBeenCalled()
  })

  it('tests connection with provided config using ASRProvider', async () => {
    const { ipcMain, handlers } = createHandlers()
    setupModuleMocks(ipcMain)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    initConfigHandlers({
      updateAutoLaunchState: vi.fn(),
      refreshLocalizedUi: vi.fn(),
      initializeASRProvider: vi.fn(),
      registerGlobalHotkeys: vi.fn(),
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const config: ASRConfig = {
      provider: 'glm',
      region: 'cn',
      apiKeys: { cn: 'k', intl: '' },
    }

    const handler = handlers.get(IPC_CHANNELS.CONFIG_TEST)
    const result = await handler?.(null, config)
    expect(mockASRProviderCtor).toHaveBeenCalledWith(config)
    expect(mockASRProviderInstance.testConnection).toHaveBeenCalled()
    expect(result).toBe(true)
  })
})

describe('config-handlers (ipc invoke)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setupCommonMocks()
  })

  it('handles CONFIG_GET via ipcRenderer.invoke', async () => {
    const mocked = createIPCMock()
    setupModuleMocks(mocked.ipcMain, mocked.ipcRenderer)
    const { initConfigHandlers, registerConfigHandlers } = await import('../config-handlers')

    initConfigHandlers({
      updateAutoLaunchState: vi.fn(),
      refreshLocalizedUi: vi.fn(),
      initializeASRProvider: vi.fn(),
      registerGlobalHotkeys: vi.fn(),
      getAsrProvider: vi.fn(),
    })
    registerConfigHandlers()

    const result = await mocked.ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET)
    expect(mockConfigManager.getConfig).toHaveBeenCalled()
    expect(result).toEqual({ app: {}, asr: {}, hotkey: {} })
  })
})
