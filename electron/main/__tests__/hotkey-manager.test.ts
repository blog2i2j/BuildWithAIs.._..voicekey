import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRegister = vi.fn()
const mockUnregister = vi.fn()
const mockUnregisterAll = vi.fn()
const mockIsRegistered = vi.fn()

vi.mock('electron', () => ({
  globalShortcut: {
    register: mockRegister,
    unregister: mockUnregister,
    unregisterAll: mockUnregisterAll,
    isRegistered: mockIsRegistered,
  },
}))

const createManager = async () => {
  const module = await import('../hotkey-manager')
  return new module.HotkeyManager()
}

describe('HotkeyManager', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('registers hotkey successfully', async () => {
    mockRegister.mockReturnValue(true)
    const manager = await createManager()
    const callback = vi.fn()

    const result = manager.register('Command+Space', callback)

    expect(result).toBe(true)
    expect(mockRegister).toHaveBeenCalledWith('Command+Space', callback)
    expect(manager.getRegistered()).toEqual(['Command+Space'])
  })

  it('rejects duplicate registration', async () => {
    mockRegister.mockReturnValue(true)
    const manager = await createManager()
    const callback = vi.fn()

    expect(manager.register('Command+Space', callback)).toBe(true)
    expect(manager.register('Command+Space', callback)).toBe(false)
    expect(mockRegister).toHaveBeenCalledTimes(1)
  })

  it('returns false when registration fails', async () => {
    mockRegister.mockReturnValue(false)
    const manager = await createManager()

    expect(manager.register('Command+Space', vi.fn())).toBe(false)
    expect(manager.getRegistered()).toEqual([])
  })

  it('returns false when registration throws', async () => {
    mockRegister.mockImplementation(() => {
      throw new Error('boom')
    })
    const manager = await createManager()

    expect(manager.register('Command+Space', vi.fn())).toBe(false)
    expect(manager.getRegistered()).toEqual([])
  })

  it('unregisters a hotkey', async () => {
    mockRegister.mockReturnValue(true)
    const manager = await createManager()

    manager.register('Command+Space', vi.fn())
    manager.unregister('Command+Space')

    expect(mockUnregister).toHaveBeenCalledWith('Command+Space')
    expect(manager.getRegistered()).toEqual([])
  })

  it('unregisters all hotkeys', async () => {
    mockRegister.mockReturnValue(true)
    const manager = await createManager()

    manager.register('Command+Space', vi.fn())
    manager.register('Ctrl+Alt+P', vi.fn())
    manager.unregisterAll()

    expect(mockUnregisterAll).toHaveBeenCalled()
    expect(manager.getRegistered()).toEqual([])
  })

  it('delegates isRegistered to globalShortcut', async () => {
    mockIsRegistered.mockReturnValue(true)
    const manager = await createManager()

    expect(manager.isRegistered('Command+Space')).toBe(true)
    expect(mockIsRegistered).toHaveBeenCalledWith('Command+Space')
  })
})
