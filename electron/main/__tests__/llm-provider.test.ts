import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GLM_LLM } from '../../shared/constants'
import type { ASRConfig } from '../../shared/types'

const mockPost = vi.fn()
const mockIsAxiosError = vi.fn()

vi.mock('axios', () => ({
  default: {
    post: mockPost,
    isAxiosError: mockIsAxiosError,
  },
}))

const createProvider = async (
  options: { enabled?: boolean } = {},
  asrConfigOverride: Partial<ASRConfig> = {},
) => {
  const { LLMProvider } = await import('../llm-provider')
  const asrConfig: ASRConfig = {
    provider: 'glm',
    region: 'cn',
    apiKeys: {
      cn: 'asr-cn-key',
      intl: 'asr-intl-key',
    },
    endpoint: '',
    language: 'auto',
    ...asrConfigOverride,
  }
  return new LLMProvider(
    {
      enabled: options.enabled ?? true,
    },
    {
      getASRConfig: () => asrConfig,
    },
  )
}

describe('LLMProvider', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockIsAxiosError.mockReturnValue(false)
    mockPost.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: 'refined text',
            },
          },
        ],
      },
    })
  })

  it('returns original text when disabled', async () => {
    const provider = await createProvider({ enabled: false })
    await expect(provider.refineText('raw')).resolves.toBe('raw')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('uses CN endpoint and ASR CN key', async () => {
    const provider = await createProvider({}, { region: 'cn' })
    await expect(provider.refineText('raw')).resolves.toBe('refined text')
    expect(mockPost).toHaveBeenCalledWith(
      GLM_LLM.ENDPOINT,
      expect.objectContaining({
        model: GLM_LLM.MODEL,
        messages: expect.any(Array),
        max_tokens: GLM_LLM.MAX_TOKENS,
        temperature: GLM_LLM.TEMPERATURE,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer asr-cn-key',
        }),
      }),
    )
  })

  it('uses INTL endpoint and ASR INTL key', async () => {
    const provider = await createProvider({}, { region: 'intl' })
    await expect(provider.refineText('raw')).resolves.toBe('refined text')
    expect(mockPost).toHaveBeenCalledWith(
      GLM_LLM.ENDPOINT_INTL,
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer asr-intl-key',
        }),
      }),
    )
  })

  it('uses custom ASR endpoint by converting /audio/transcriptions', async () => {
    const provider = await createProvider(
      {},
      { endpoint: 'https://x.y/api/paas/v4/audio/transcriptions' },
    )
    await expect(provider.refineText('raw')).resolves.toBe('refined text')
    expect(mockPost).toHaveBeenCalledWith(
      'https://x.y/api/paas/v4/chat/completions',
      expect.any(Object),
      expect.any(Object),
    )
  })

  it('hasValidConfig returns false when ASR key is missing', async () => {
    const provider = await createProvider({}, { apiKeys: { cn: '', intl: '' } })
    expect(provider.hasValidConfig()).toBe(false)
  })

  it('maps axios errors to readable message', async () => {
    mockIsAxiosError.mockReturnValue(true)
    mockPost.mockRejectedValueOnce({
      message: 'Request failed',
      response: { data: { error: { message: 'invalid api key' } } },
    })
    const provider = await createProvider()
    await expect(provider.refineText('raw')).rejects.toThrow('LLM refine failed: invalid api key')
  })
})

describe('resolveGLMChatEndpoint', () => {
  it('resolves endpoint by region and custom ASR endpoint', async () => {
    const { resolveGLMChatEndpoint } = await import('../llm-provider')
    expect(
      resolveGLMChatEndpoint({
        provider: 'glm',
        region: 'cn',
        apiKeys: { cn: 'k', intl: '' },
      }),
    ).toBe(GLM_LLM.ENDPOINT)

    expect(
      resolveGLMChatEndpoint({
        provider: 'glm',
        region: 'intl',
        apiKeys: { cn: '', intl: 'k' },
      }),
    ).toBe(GLM_LLM.ENDPOINT_INTL)

    expect(
      resolveGLMChatEndpoint({
        provider: 'glm',
        region: 'cn',
        apiKeys: { cn: 'k', intl: '' },
        endpoint: 'https://foo.bar/audio/transcriptions',
      }),
    ).toBe('https://foo.bar/chat/completions')
  })
})
