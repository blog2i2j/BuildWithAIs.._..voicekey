import { beforeEach, describe, expect, it, vi } from 'vitest'

const uiohookHandlers = vi.hoisted(() => ({
  keydown: undefined as undefined | ((e: { type: number; keycode: number }) => void),
  keyup: undefined as undefined | ((e: { type: number; keycode: number }) => void),
}))

const uiohookMock = vi.hoisted(() => ({
  on: vi.fn(
    (event: 'keydown' | 'keyup', handler: (e: { type: number; keycode: number }) => void) => {
      uiohookHandlers[event] = handler
    },
  ),
  start: vi.fn(),
  stop: vi.fn(),
}))

const uiohookKeyMock = vi.hoisted(() => ({
  Shift: 1,
  ShiftRight: 2,
  Ctrl: 3,
  CtrlRight: 4,
  Alt: 5,
  AltRight: 6,
  Meta: 7,
  MetaRight: 8,
  Space: 9,
  A: 10,
}))

vi.mock('uiohook-napi', () => ({
  uIOhook: uiohookMock,
  UiohookKey: uiohookKeyMock,
}))

const createManager = async () => {
  const module = await import('../iohook-manager')
  return new module.IOHookManager()
}

const emitKeyDown = (keycode: number) => {
  uiohookHandlers.keydown?.({ type: 4, keycode })
}

const emitKeyUp = (keycode: number) => {
  uiohookHandlers.keyup?.({ type: 5, keycode })
}

describe('IOHookManager.isPressed', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    uiohookHandlers.keydown = undefined
    uiohookHandlers.keyup = undefined
  })

  it('returns false when main key is not pressed', async () => {
    const manager = await createManager()
    manager.start()

    emitKeyDown(uiohookKeyMock.Meta)
    expect(manager.isPressed(['meta'], uiohookKeyMock.Space)).toBe(false)
  })

  it('returns true when required modifier and main key are pressed', async () => {
    const manager = await createManager()
    manager.start()

    emitKeyDown(uiohookKeyMock.MetaRight)
    emitKeyDown(uiohookKeyMock.Space)
    expect(manager.isPressed(['meta'], uiohookKeyMock.Space)).toBe(true)
  })

  it('returns false when required modifier is missing', async () => {
    const manager = await createManager()
    manager.start()

    emitKeyDown(uiohookKeyMock.Space)
    expect(manager.isPressed(['ctrl'], uiohookKeyMock.Space)).toBe(false)
  })

  it('returns false when extra modifier is pressed', async () => {
    const manager = await createManager()
    manager.start()

    emitKeyDown(uiohookKeyMock.Ctrl)
    emitKeyDown(uiohookKeyMock.Alt)
    emitKeyDown(uiohookKeyMock.Space)
    expect(manager.isPressed(['ctrl'], uiohookKeyMock.Space)).toBe(false)
  })

  it('clears pressed state on keyup', async () => {
    const manager = await createManager()
    manager.start()

    emitKeyDown(uiohookKeyMock.Meta)
    emitKeyDown(uiohookKeyMock.Space)
    expect(manager.isPressed(['meta'], uiohookKeyMock.Space)).toBe(true)

    emitKeyUp(uiohookKeyMock.Space)
    expect(manager.isPressed(['meta'], uiohookKeyMock.Space)).toBe(false)
  })
})
