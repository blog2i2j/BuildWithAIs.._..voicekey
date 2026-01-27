import { describe, it, expect, beforeEach } from 'vitest'
import { buildAccelerator, formatHotkey, normalizeKey, validateHotkey } from '../hotkey-utils'

describe('hotkey-utils', () => {
  describe('normalizeKey', () => {
    it('maps Meta to Command', () => {
      const event = new KeyboardEvent('keydown', { key: 'Meta' })
      expect(normalizeKey(event)).toBe('Command')
    })

    it('uppercases letters', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' })
      expect(normalizeKey(event)).toBe('A')
    })
  })

  describe('buildAccelerator', () => {
    it('orders modifiers and keeps last main key', () => {
      const keys = new Set(['Alt', 'Command', 'A', 'B'])
      expect(buildAccelerator(keys)).toBe('Command+Alt+B')
    })
  })

  describe('formatHotkey', () => {
    beforeEach(() => {
      const mockElectronAPI: Partial<Window['electronAPI']> = { platform: 'darwin' }
      window.electronAPI = mockElectronAPI as Window['electronAPI']
    })

    it('formats mac symbols', () => {
      expect(formatHotkey('Command+Shift+Space')).toBe('⌘ ⇧ ␣')
    })

    it('formats windows labels', () => {
      const mockElectronAPI: Partial<Window['electronAPI']> = { platform: 'win32' }
      window.electronAPI = mockElectronAPI as Window['electronAPI']
      expect(formatHotkey('Command+A')).toBe('Win+A')
    })
  })

  describe('validateHotkey', () => {
    it('rejects empty accelerators', () => {
      const result = validateHotkey('')
      expect(result.valid).toBe(false)
      expect(result.messageKey).toBe('missing')
    })
  })
})
