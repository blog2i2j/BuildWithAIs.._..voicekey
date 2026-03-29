import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SettingsPage from '../SettingsPage'

vi.mock('@/components/HotkeySettings', () => ({
  HotkeySettings: ({ value, onChange, isLoading }: any) => (
    <div>
      <input
        aria-label="ptt"
        disabled={isLoading}
        value={value.pttKey}
        onChange={(e) => onChange({ ...value, pttKey: e.target.value })}
      />
      <input
        aria-label="toggle"
        disabled={isLoading}
        value={value.toggleSettings}
        onChange={(e) => onChange({ ...value, toggleSettings: e.target.value })}
      />
    </div>
  ),
}))

vi.mock('@/components/LogViewerDialog', () => ({
  LogViewerDialog: () => null,
}))

const mockGetConfig = vi.fn()
const mockSetConfig = vi.fn()
const mockTestConnection = vi.fn()
const mockTestRefineConnection = vi.fn()
const mockGetUpdateStatus = vi.fn()
const mockCheckForUpdates = vi.fn()
const mockOpenExternal = vi.fn()

const assignElectronAPI = () => {
  window.electronAPI = {
    platform: 'darwin',
    getConfig: mockGetConfig,
    setConfig: mockSetConfig,
    testConnection: mockTestConnection,
    testRefineConnection: mockTestRefineConnection,
    getUpdateStatus: mockGetUpdateStatus,
    checkForUpdates: mockCheckForUpdates,
    openExternal: mockOpenExternal,
  } as unknown as Window['electronAPI']
}

const baseConfig = {
  app: { language: 'system', autoLaunch: false },
  asr: {
    provider: 'glm',
    region: 'cn' as const,
    apiKeys: { cn: 'k-cn', intl: '' },
    lowVolumeMode: true,
    endpoint: '',
    language: 'auto',
  },
  llmRefine: {
    enabled: false,
    endpoint: '',
    model: '',
    apiKey: '',
  },
  hotkey: { pttKey: 'Command+K', toggleSettings: 'Command+,' },
}

async function flushAutoSave() {
  await new Promise((resolve) => setTimeout(resolve, 800))
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    ;(globalThis as any).__APP_VERSION__ = '0.1.0'
    assignElectronAPI()
    mockGetConfig.mockResolvedValue(baseConfig)
    mockGetUpdateStatus.mockResolvedValue(null)
    mockSetConfig.mockResolvedValue(undefined)
  })

  it('loads config without rendering a save button', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    expect(screen.getByLabelText('ptt')).toHaveValue('Command+K')
    expect(screen.getByLabelText('toggle')).toHaveValue('Command+,')
    expect(screen.queryByText('settings.saveConfig')).not.toBeInTheDocument()
  })

  it('auto-saves ASR changes after debounce', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('switch', { name: 'settings.lowVolumeMode' }))
    await flushAutoSave()

    await waitFor(() =>
      expect(mockSetConfig).toHaveBeenCalledWith({
        asr: {
          ...baseConfig.asr,
          lowVolumeMode: false,
        },
      }),
    )
    expect(screen.getByTestId('save-status-card')).toHaveTextContent('settings.autoSave.saved')
  })

  it('auto-saves refine config changes after debounce', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/settings\.refineEndpoint/), {
      target: { value: 'https://example.com/v1' },
    })
    fireEvent.change(screen.getByLabelText(/settings\.refineModel/), {
      target: { value: 'gpt-4.1-mini' },
    })
    fireEvent.change(screen.getByLabelText(/settings\.refineApiKey/), {
      target: { value: 'refine-key' },
    })

    await flushAutoSave()

    await waitFor(() =>
      expect(mockSetConfig).toHaveBeenCalledWith({
        llmRefine: {
          enabled: false,
          endpoint: 'https://example.com/v1',
          model: 'gpt-4.1-mini',
          apiKey: 'refine-key',
        },
      }),
    )
  })

  it('auto-saves valid hotkeys after debounce', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('ptt'), { target: { value: 'Command+J' } })
    await flushAutoSave()

    await waitFor(() =>
      expect(mockSetConfig).toHaveBeenCalledWith({
        hotkey: { pttKey: 'Command+J', toggleSettings: 'Command+,' },
      }),
    )
  })

  it('does not auto-save invalid hotkeys and shows inline validation', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('toggle'), { target: { value: 'Command+K' } })
    await flushAutoSave()

    expect(mockSetConfig).not.toHaveBeenCalled()
    expect(screen.getByTestId('hotkey-validation-status')).toHaveTextContent(
      'settings.result.hotkeyInvalid',
    )
    expect(screen.getByTestId('save-status-card')).toHaveTextContent(
      'settings.result.hotkeyInvalid',
    )
  })

  it('shows refine validation without auto-saving invalid enabled config', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('switch', { name: 'settings.llmRefineEnabled' }))
    await flushAutoSave()

    expect(mockSetConfig).not.toHaveBeenCalled()
    expect(screen.getByTestId('refine-validation-status')).toHaveTextContent(
      'settings.result.refineConfigRequired',
    )
  })

  it('tests ASR connection in the ASR section', async () => {
    mockTestConnection.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.click(screen.getByText('settings.testConnection'))
    await waitFor(() => expect(mockTestConnection).toHaveBeenCalled())
    expect(screen.getByTestId('asr-test-status')).toHaveTextContent(
      'settings.result.connectionSuccess',
    )

    fireEvent.click(screen.getByText('settings.testConnection'))
    await waitFor(() =>
      expect(screen.getByTestId('asr-test-status')).toHaveTextContent(
        'settings.result.connectionFailed',
      ),
    )
    expect(screen.queryByText('settings.saveConfig')).not.toBeInTheDocument()
  })

  it('tests refine connection with current form values in place', async () => {
    mockTestRefineConnection.mockResolvedValueOnce({ ok: true })
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/settings\.refineEndpoint/), {
      target: { value: 'https://example.com/v1' },
    })
    fireEvent.change(screen.getByLabelText(/settings\.refineModel/), {
      target: { value: 'gpt-4.1-mini' },
    })
    fireEvent.change(screen.getByLabelText(/settings\.refineApiKey/), {
      target: { value: 'refine-key' },
    })

    fireEvent.click(screen.getByText('settings.testRefineConnection'))

    await waitFor(() =>
      expect(mockTestRefineConnection).toHaveBeenCalledWith({
        enabled: false,
        endpoint: 'https://example.com/v1',
        model: 'gpt-4.1-mini',
        apiKey: 'refine-key',
      }),
    )
    expect(screen.getByTestId('refine-test-status')).toHaveTextContent(
      'settings.result.refineConnectionSuccess',
    )
  })

  it('shows save failure and retries on the next change', async () => {
    mockSetConfig.mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(undefined)
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('switch', { name: 'settings.lowVolumeMode' }))
    await flushAutoSave()

    await waitFor(() =>
      expect(screen.getByTestId('save-status-card')).toHaveTextContent('settings.autoSave.error'),
    )

    fireEvent.change(screen.getByLabelText('ptt'), { target: { value: 'Command+J' } })
    await flushAutoSave()

    await waitFor(() =>
      expect(screen.getByTestId('save-status-card')).toHaveTextContent('settings.autoSave.saved'),
    )
    expect(mockSetConfig).toHaveBeenCalledTimes(2)
  })

  it('saves language changes immediately', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('combobox', { name: 'settings.appLanguage' }))
    fireEvent.click(await screen.findByText('settings.languageEnglish'))

    await waitFor(() => expect(mockSetConfig).toHaveBeenCalledWith({ app: { language: 'en' } }))
  })

  it('checks update and shows no-update state', async () => {
    mockCheckForUpdates.mockResolvedValue({ hasUpdate: false, latestVersion: '', releaseUrl: '' })
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetConfig).toHaveBeenCalled())

    fireEvent.click(screen.getByText('settings.checkUpdate'))
    await waitFor(() => expect(mockCheckForUpdates).toHaveBeenCalled())
    expect(screen.getByText('settings.noUpdate')).toBeInTheDocument()
  })

  it('opens release page when update available', async () => {
    mockGetUpdateStatus.mockResolvedValue({
      hasUpdate: true,
      latestVersion: '1.2.0',
      releaseUrl: 'https://example.com',
      releaseNotes: '',
    })
    render(<SettingsPage />)
    await waitFor(() => expect(mockGetUpdateStatus).toHaveBeenCalled())

    fireEvent.click(screen.getByText('settings.downloadUpdate'))
    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com')
  })
})
