import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@electron/shared/types'
import { LOG_TAIL_MAX_BYTES } from '@electron/shared/constants'

type IpcHandler = (event: unknown, ...args: unknown[]) => unknown
type IpcListener = (event: unknown, ...args: unknown[]) => void

const createIpcMain = () => {
  const handlers = new Map<string, IpcHandler>()
  const listeners = new Map<string, IpcListener>()
  const ipcMain = {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers.set(channel, handler)
    }),
    on: vi.fn((channel: string, listener: IpcListener) => {
      listeners.set(channel, listener)
    }),
  }
  return { ipcMain, handlers, listeners }
}

describe('log-handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('clamps log tail byte size and returns tail', async () => {
    const { ipcMain, handlers } = createIpcMain()
    const mockReadLogTail = vi.fn(() => 'tail')
    const mockGetLogDirectory = vi.fn(() => '/tmp/logs')
    const mockWriteLog = vi.fn()
    const mockOpenPath = vi.fn(() => 'ok')

    vi.doMock('electron', () => ({ ipcMain, shell: { openPath: mockOpenPath } }))
    vi.doMock('../../logger', () => ({
      readLogTail: mockReadLogTail,
      getLogDirectory: mockGetLogDirectory,
      writeLog: mockWriteLog,
    }))

    const { registerLogHandlers } = await import('../log-handlers')
    registerLogHandlers()

    await handlers.get(IPC_CHANNELS.LOG_GET_TAIL)?.(null, { maxBytes: 10 })
    expect(mockReadLogTail).toHaveBeenCalledWith(1024)

    await handlers.get(IPC_CHANNELS.LOG_GET_TAIL)?.(null, { maxBytes: LOG_TAIL_MAX_BYTES * 10 })
    expect(mockReadLogTail).toHaveBeenCalledWith(LOG_TAIL_MAX_BYTES * 5)

    await handlers.get(IPC_CHANNELS.LOG_GET_TAIL)?.(null)
    expect(mockReadLogTail).toHaveBeenCalledWith(LOG_TAIL_MAX_BYTES)
  })

  it('opens log folder via shell', async () => {
    const { ipcMain, handlers } = createIpcMain()
    const mockReadLogTail = vi.fn()
    const mockGetLogDirectory = vi.fn(() => '/tmp/logs')
    const mockWriteLog = vi.fn()
    const mockOpenPath = vi.fn(() => 'ok')

    vi.doMock('electron', () => ({ ipcMain, shell: { openPath: mockOpenPath } }))
    vi.doMock('../../logger', () => ({
      readLogTail: mockReadLogTail,
      getLogDirectory: mockGetLogDirectory,
      writeLog: mockWriteLog,
    }))

    const { registerLogHandlers } = await import('../log-handlers')
    registerLogHandlers()

    const result = await handlers.get(IPC_CHANNELS.LOG_OPEN_FOLDER)?.(null)
    expect(mockOpenPath).toHaveBeenCalledWith('/tmp/logs')
    expect(result).toBe('ok')
  })

  it('writes log entries with default scope', async () => {
    const { ipcMain, listeners } = createIpcMain()
    const mockReadLogTail = vi.fn()
    const mockGetLogDirectory = vi.fn()
    const mockWriteLog = vi.fn()
    const mockOpenPath = vi.fn()

    vi.doMock('electron', () => ({ ipcMain, shell: { openPath: mockOpenPath } }))
    vi.doMock('../../logger', () => ({
      readLogTail: mockReadLogTail,
      getLogDirectory: mockGetLogDirectory,
      writeLog: mockWriteLog,
    }))

    const { registerLogHandlers } = await import('../log-handlers')
    registerLogHandlers()

    listeners.get(IPC_CHANNELS.LOG_WRITE)?.(null, { level: 'info' })
    listeners.get(IPC_CHANNELS.LOG_WRITE)?.(null, { message: 'hi' })
    expect(mockWriteLog).not.toHaveBeenCalled()

    listeners.get(IPC_CHANNELS.LOG_WRITE)?.(null, {
      level: 'info',
      message: 'hello',
      data: { ok: true },
    })

    expect(mockWriteLog).toHaveBeenCalledWith({
      level: 'info',
      message: 'hello',
      data: { ok: true },
      scope: 'renderer',
    })
  })
})
