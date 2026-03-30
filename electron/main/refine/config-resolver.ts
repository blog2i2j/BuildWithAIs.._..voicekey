import { buildRefineSystemPrompt, OPENAI_CHAT } from '../../shared/constants'
import { buildRefineChatEndpoint, normalizeRefineBaseUrl } from '../../shared/refine-url'
import type { LLMRefineConfig } from '../../shared/types'

export interface ResolvedRefineRequestConfig {
  endpoint: string
  apiKey: string
  model: string
  timeoutMs: number
  maxTokens: number
  temperature: number
  systemPrompt: string
}

export interface ResolveRefineRequestConfigOptions {
  glossaryTerms?: readonly string[]
}

export function resolveRefineRequestConfig(
  refineConfig: LLMRefineConfig,
  options: ResolveRefineRequestConfigOptions = {},
): ResolvedRefineRequestConfig | null {
  const baseUrl = normalizeRefineBaseUrl(refineConfig.endpoint)
  const endpoint = buildRefineChatEndpoint(baseUrl)
  const model = refineConfig.model.trim()
  const apiKey = refineConfig.apiKey.trim()

  if (!baseUrl || !endpoint || !model || !apiKey) {
    return null
  }

  return {
    endpoint,
    model,
    apiKey,
    timeoutMs: OPENAI_CHAT.TIMEOUT_MS,
    maxTokens: OPENAI_CHAT.MAX_TOKENS,
    temperature: OPENAI_CHAT.TEMPERATURE,
    systemPrompt: buildRefineSystemPrompt({
      glossaryTerms: options.glossaryTerms,
      translateToEnglish: refineConfig.translateToEnglish,
    }),
  }
}
