import type { ReactNode } from 'react'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const hasWindow = typeof window !== 'undefined'

afterEach(() => {
  if (hasWindow) {
    cleanup()
  }
})

if (hasWindow) {
  const mockElectronAPI: Partial<Window['electronAPI']> = {
    platform: 'darwin',
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    testConnection: vi.fn(),
    getAppLanguage: vi.fn(),
    onAppLanguageChanged: vi.fn(),
  }

  window.electronAPI = mockElectronAPI as Window['electronAPI']

  vi.doMock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        changeLanguage: vi.fn(),
      },
    }),
    Trans: ({ children }: { children?: ReactNode }) => children ?? null,
  }))

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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
}
