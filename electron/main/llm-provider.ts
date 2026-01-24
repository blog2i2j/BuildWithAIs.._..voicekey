import axios from 'axios'
import { GLM_LLM } from '../shared/constants'
import type { AIConfig, ASRConfig } from '../shared/types'

const UNIFIED_SYSTEM_PROMPT = `# Role
你是一个智能语音文本处理引擎。能够自动识别文本包含的指令并执行，或者对普通文本进行润色清洗。

# Input
用户的语音转文字（ASR）原始内容。

# Processing Logic
请按以下优先级判断并执行：

1. **指令识别 (Command Detection)**
   - 检查文本中是否隐含**针对文本本身的编辑指令**（通常在末尾，如“翻译成英文”、“润色一下”、“变代码”、“转列表”）。
   - **判定规则**：
     - "翻译这段话" -> 是指令。
     - "帮我搜索天气" -> 否（这是正文），进入清洗模式。
     - "把刚才的整理一下" -> 是指令。
     - "去买苹果" -> 否（这是正文）。

2. **模式执行**

   ## Mode A: 执行指令 (Command Execution)
   - **行为**：去除指令词，对剩余文本执行指令要求。
   - **标准**：
     - **翻译**：信达雅，地道表达，避免翻译腔。
     - **润色**：修正语病，提升流畅度，不改变原意。
     - **摘要/列表**：使用 Markdown 列表格式。
     - **代码**：仅输出代码块。

   ## Mode B: 基础清洗 (Default Cleanup)
   - **行为**：当无指令时，执行智能清洗。
   - **标准**：
     - 修正同音错字（ASR 错误修复）。
     - 去除口语赘词（“呃”、“那个...”）。
     - 加上正确的标点符号。
     - **严禁**改变原意或添加原本不存在的信息。

# Output Rules
- **直接输出结果**：不要包含“好的”、“这是结果”等废话。
- **纯净文本**：不要重复输入的指令部分。
`

interface LLMDeltaContentItem {
  type?: string
  text?: string
}

interface LLMStreamChunkChoiceDelta {
  role?: string
  content?: string | LLMDeltaContentItem[]
}

interface LLMStreamChunkChoice {
  index?: number
  delta?: LLMStreamChunkChoiceDelta
}

interface LLMStreamChunk {
  choices?: LLMStreamChunkChoice[]
  error?: {
    message?: string
    code?: string
  }
}

// Router types removed

type StreamListener = (...args: unknown[]) => void

type StreamLike = {
  on: (event: 'data' | 'end' | 'error', listener: StreamListener) => void
  off: (event: 'data' | 'end' | 'error', listener: StreamListener) => void
  destroy?: () => void
}

export interface LLMStreamOptions {
  onToken?: (token: string) => void
}

export class LLMProvider {
  private asrConfig: ASRConfig
  private aiConfig: AIConfig

  constructor(asrConfig: ASRConfig, aiConfig: AIConfig) {
    this.asrConfig = asrConfig
    this.aiConfig = aiConfig
  }

  updateConfig(asrConfig: ASRConfig, aiConfig: AIConfig): void {
    this.asrConfig = asrConfig
    this.aiConfig = aiConfig
  }

  async processText(input: string, options: LLMStreamOptions = {}): Promise<string> {
    return await this.streamWithPrompt(UNIFIED_SYSTEM_PROMPT, input, options)
  }

  private resolveRequestConfig(): { endpoint: string; apiKey: string; model: string } {
    const region = this.asrConfig.region || 'cn'
    const apiKey = this.asrConfig.apiKeys?.[region]
    if (!apiKey) {
      throw new Error(`API Key not configured for region: ${region}`)
    }
    const endpoint = region === 'intl' ? GLM_LLM.ENDPOINT_INTL : GLM_LLM.ENDPOINT
    const model = this.aiConfig.model || GLM_LLM.MODEL
    return { endpoint, apiKey, model }
  }

  private async streamWithPrompt(
    systemPrompt: string,
    input: string,
    options: LLMStreamOptions = {},
  ): Promise<string> {
    const { endpoint, apiKey, model } = this.resolveRequestConfig()

    const response = await axios.post(
      endpoint,
      {
        model,
        stream: true,
        do_sample: false,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: input,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        responseType: 'stream',
        timeout: 120000,
      },
    )

    const stream = response.data as StreamLike
    let buffered = ''
    let done = false
    let output = ''

    const extractContent = (chunk: LLMStreamChunk): string => {
      const content = chunk.choices?.[0]?.delta?.content
      if (typeof content === 'string') {
        return content
      }
      if (Array.isArray(content)) {
        return content.map((item) => item.text || '').join('')
      }
      return ''
    }

    return await new Promise((resolve, reject) => {
      let settled = false

      const cleanup = () => {
        stream.off('data', onData as StreamListener)
        stream.off('error', onError as StreamListener)
        stream.off('end', onEnd as StreamListener)
      }

      const finish = (error?: Error, text?: string) => {
        if (settled) return
        settled = true
        cleanup()
        if (error) {
          reject(error)
          return
        }
        resolve(text ?? '')
      }

      const handleLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) return

        const payload = trimmed.replace(/^data:\s*/, '')
        if (!payload) {
          return
        }
        if (payload === '[DONE]') {
          done = true
          stream.destroy?.()
          finish(undefined, output)
          return
        }

        try {
          const parsed = JSON.parse(payload) as LLMStreamChunk
          if (parsed.error?.message || parsed.error?.code) {
            const message = parsed.error?.message || parsed.error?.code || 'LLM stream error'
            finish(new Error(message))
            return
          }
          const delta = extractContent(parsed)
          if (delta) {
            output += delta
            options.onToken?.(delta)
          }
        } catch (error) {
          console.warn('[LLM] Failed to parse stream chunk:', error)
        }
      }

      const onData = (chunk: Buffer) => {
        buffered += chunk.toString('utf8')
        const lines = buffered.split(/\r?\n/)
        buffered = lines.pop() ?? ''
        lines.forEach(handleLine)
      }

      const onEnd = () => {
        if (!done) {
          finish(new Error('LLM stream ended unexpectedly'))
        }
      }

      const onError = (error: Error) => {
        finish(error)
      }

      stream.on('data', onData as StreamListener)
      stream.on('end', onEnd as StreamListener)
      stream.on('error', onError as StreamListener)
    })
  }
}
