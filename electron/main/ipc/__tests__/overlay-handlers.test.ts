import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@electron/shared/types'

type IpcListener = (event: unknown, ...args: unknown[]) => void

const createIpcMain = () => {
  const listeners = new Map<string, IpcListener>()
  const ipcMain = {
    on: vi.fn((channel: string, listener: IpcListener) => {
      listeners.set(channel, listener)
    }),
  }
  return { ipcMain, listeners }
}

describe('overlay-handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('forwards audio level updates', async () => {
    const { ipcMain, listeners } = createIpcMain()
    const mockSendAudioLevel = vi.fn()
    const mockSetIgnore = vi.fn()

    vi.doMock('electron', () => ({ ipcMain }))
    vi.doMock('../../window/overlay', () => ({
      sendAudioLevel: mockSendAudioLevel,
      setOverlayIgnoreMouseEvents: mockSetIgnore,
    }))
    vi.doMock('../../i18n', () => ({
      t: (key: string) => `t:${key}`,
    }))

    const { initOverlayHandlers, registerOverlayHandlers } = await import('../overlay-handlers')
    initOverlayHandlers({
      showNotification: vi.fn(),
      getCurrentSession: vi.fn(() => null),
      setSessionError: vi.fn(),
    })
    registerOverlayHandlers()

    listeners.get(IPC_CHANNELS.OVERLAY_AUDIO_LEVEL)?.(null, 0.5)
    expect(mockSendAudioLevel).toHaveBeenCalledWith(0.5)
  })

  it('sets overlay ignore mouse events', async () => {
    const { ipcMain, listeners } = createIpcMain()
    const mockSendAudioLevel = vi.fn()
    const mockSetIgnore = vi.fn()

    vi.doMock('electron', () => ({ ipcMain }))
    vi.doMock('../../window/overlay', () => ({
      sendAudioLevel: mockSendAudioLevel,
      setOverlayIgnoreMouseEvents: mockSetIgnore,
    }))
    vi.doMock('../../i18n', () => ({
      t: (key: string) => `t:${key}`,
    }))

    const { initOverlayHandlers, registerOverlayHandlers } = await import('../overlay-handlers')
    initOverlayHandlers({
      showNotification: vi.fn(),
      getCurrentSession: vi.fn(() => null),
      setSessionError: vi.fn(),
    })
    registerOverlayHandlers()

    listeners.get('set-ignore-mouse-events')?.(null, true, { forward: true })
    expect(mockSetIgnore).toHaveBeenCalledWith(true, { forward: true })
  })

  it('reports renderer errors and updates session state', async () => {
    const { ipcMain, listeners } = createIpcMain()
    const mockSendAudioLevel = vi.fn()
    const mockSetIgnore = vi.fn()
    const showNotification = vi.fn()
    const setSessionError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.doMock('electron', () => ({ ipcMain }))
    vi.doMock('../../window/overlay', () => ({
      sendAudioLevel: mockSendAudioLevel,
      setOverlayIgnoreMouseEvents: mockSetIgnore,
    }))
    vi.doMock('../../i18n', () => ({
      t: (key: string) => `t:${key}`,
    }))

    const { initOverlayHandlers, registerOverlayHandlers } = await import('../overlay-handlers')
    initOverlayHandlers({
      showNotification,
      getCurrentSession: vi.fn(() => ({ status: 'recording' }) as any),
      setSessionError,
    })
    registerOverlayHandlers()

    listeners.get('error')?.(null, 'boom')
    expect(showNotification).toHaveBeenCalledWith('t:notification.errorTitle', 'boom')
    expect(setSessionError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
