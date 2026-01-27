import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// 扩展 Vitest 的 expect 断言
expect.extend(matchers)

// 每个测试后清理 DOM
afterEach(() => {
  cleanup()
})

// Mock Electron APIs (渲染进程测试需要)
global.window.electronAPI = {
  platform: 'darwin',
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  onConfigChange: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  onRecordingStateChange: vi.fn(),
  onTranscriptionComplete: vi.fn(),
  onError: vi.fn(),
  getHistory: vi.fn(),
  clearHistory: vi.fn(),
  deleteHistoryItem: vi.fn(),
  getLogs: vi.fn(),
  clearLogs: vi.fn(),
  checkForUpdates: vi.fn(),
  onUpdateAvailable: vi.fn(),
  onUpdateDownloaded: vi.fn(),
  installUpdate: vi.fn(),
  showOverlay: vi.fn(),
  hideOverlay: vi.fn(),
  setOverlayMessage: vi.fn(),
} as any

// Mock i18next (避免异步初始化问题)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
  Trans: ({ children }: any) => children,
  I18nextProvider: ({ children }: any) => children,
}))

// Mock matchMedia (shadcn/ui 主题切换需要)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver (某些 UI 组件需要)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

console.log('✅ Test setup complete')
