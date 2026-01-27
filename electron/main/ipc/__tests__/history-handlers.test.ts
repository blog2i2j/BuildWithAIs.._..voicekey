import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@electron/shared/types'

type IpcHandler = (event: unknown, ...args: unknown[]) => unknown

const createIpcMain = () => {
  const handlers = new Map<string, IpcHandler>()
  const ipcMain = {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers.set(channel, handler)
    }),
  }
  return { ipcMain, handlers }
}

describe('history-handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('wires history handlers to historyManager', async () => {
    const { ipcMain, handlers } = createIpcMain()
    const mockHistoryManager = {
      getAll: vi.fn(() => [{ id: '1' }]),
      clear: vi.fn(),
      delete: vi.fn(() => true),
    }

    vi.doMock('electron', () => ({ ipcMain }))
    vi.doMock('../../history-manager', () => ({ historyManager: mockHistoryManager }))

    const { registerHistoryHandlers } = await import('../history-handlers')
    registerHistoryHandlers()

    const result = await handlers.get(IPC_CHANNELS.HISTORY_GET)?.(null)
    await handlers.get(IPC_CHANNELS.HISTORY_CLEAR)?.(null)
    const deleted = await handlers.get(IPC_CHANNELS.HISTORY_DELETE)?.(null, '1')

    expect(mockHistoryManager.getAll).toHaveBeenCalled()
    expect(result).toEqual([{ id: '1' }])
    expect(mockHistoryManager.clear).toHaveBeenCalled()
    expect(mockHistoryManager.delete).toHaveBeenCalledWith('1')
    expect(deleted).toBe(true)
  })
})
