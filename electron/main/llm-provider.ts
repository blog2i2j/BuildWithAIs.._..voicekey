import axios from 'axios'
import { GLM_LLM } from '../shared/constants'
import type { ASRConfig, LLMRefineConfig } from '../shared/types'

type OpenAIMessageContent =
  | string
  | Array<
      | string
      | {
          type?: string
          text?: string
        }
    >

type OpenAIChoice = {
  message?: {
    content?: OpenAIMessageContent
  }
}

type OpenAIResponse = {
  choices?: OpenAIChoice[]
  error?: {
    message?: string
    code?: string
  }
}

const SYSTEM_PROMPT = `
You are a precise speech-text refiner.
Task:
1) Remove filler words and disfluencies.
2) Lightly polish grammar and punctuation for readability.
3) Fix likely homophone mistakes using context.
Rules:
- Keep original meaning and tone.
- Do not add new facts.
- Do not expand content.
- Output plain text only. No explanation, no markdown.
`

type LLMProviderDeps = {
  getASRConfig?: () => ASRConfig
}

export class LLMProvider {
  private config: LLMRefineConfig
  private deps: LLMProviderDeps

  constructor(config: LLMRefineConfig, deps: LLMProviderDeps = {}) {
    this.config = config
    this.deps = deps
  }

  updateConfig(config: LLMRefineConfig): void {
    this.config = config
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  hasValidConfig(): boolean {
    const asrConfig = this.deps.getASRConfig?.()
    if (!asrConfig) {
      return false
    }
    return resolveApiKey(asrConfig).length > 0
  }

  async refineText(input: string): Promise<string> {
    if (!this.config.enabled) {
      return input
    }

    const asrConfig = this.deps.getASRConfig?.()
    if (!asrConfig) {
      throw new Error('ASR config is unavailable')
    }

    const apiKey = resolveApiKey(asrConfig)
    if (!apiKey) {
      throw new Error('ASR API Key is required for LLM refine')
    }
    const endpoint = resolveGLMChatEndpoint(asrConfig)

    const basePayload = {
      model: GLM_LLM.MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT.trim(),
        },
        {
          role: 'user',
          content: input,
        },
      ],
      max_tokens: GLM_LLM.MAX_TOKENS,
      temperature: GLM_LLM.TEMPERATURE,
    }

    try {
      const response = await requestChatCompletion(endpoint, apiKey, basePayload)
      const refinedText = extractMessageContent(response)
      if (!refinedText) {
        throw new Error('LLM returned empty text')
      }
      return refinedText
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorMessage = extractAxiosErrorMessage(error)
        throw new Error(`LLM refine failed: ${errorMessage}`)
      }
      throw error
    }
  }
}

async function requestChatCompletion(
  endpoint: string,
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<OpenAIResponse> {
  const response = await axios.post<OpenAIResponse>(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: GLM_LLM.TIMEOUT_MS,
    responseType: 'json',
    responseEncoding: 'utf8',
  })
  return response.data
}

function extractAxiosErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Unknown error'
  }
  const responseError = error.response?.data
  if (
    typeof responseError === 'object' &&
    responseError &&
    'error' in responseError &&
    typeof responseError.error === 'object' &&
    responseError.error &&
    'message' in responseError.error &&
    typeof responseError.error.message === 'string'
  ) {
    return responseError.error.message
  }
  return error.message
}

function resolveApiKey(asrConfig: ASRConfig): string {
  const region = asrConfig.region || 'cn'
  return asrConfig.apiKeys?.[region]?.trim() || ''
}

export function resolveGLMChatEndpoint(asrConfig: ASRConfig): string {
  const endpoint = asrConfig.endpoint?.trim()
  if (endpoint) {
    if (endpoint.includes('/audio/transcriptions')) {
      return endpoint.replace('/audio/transcriptions', '/chat/completions')
    }
    if (endpoint.endsWith('/chat/completions')) {
      return endpoint
    }
  }
  return asrConfig.region === 'intl' ? GLM_LLM.ENDPOINT_INTL : GLM_LLM.ENDPOINT
}

function extractMessageContent(data: OpenAIResponse): string {
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    return ''
  }
  if (typeof content === 'string') {
    return content.trim()
  }
  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }
      return typeof part.text === 'string' ? part.text : ''
    })
    .join('')
    .trim()
}
