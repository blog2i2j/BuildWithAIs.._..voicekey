import axios, { type AxiosResponse } from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import { createHash } from 'node:crypto'
import { GLM_ASR, GROQ_ASR } from '../shared/constants'
import { ASRConfig } from '../shared/types'

export interface TranscriptionResult {
  text: string
  id: string
  created: number
  model: string
}

export interface TranscriptionError {
  code: string
  message: string
}

type AsrResponseData = {
  text?: string
  id?: string
  created?: number
  model?: string
  x_groq?: {
    id?: string
  }
}

type TranscribeOptions = {
  audioFilePath: string
  endpoint: string
  apiKey: string
  providerLabel: string
  formFields: Record<string, string | undefined>
  mapResult: (data: AsrResponseData, text: string) => TranscriptionResult
}

export class ASRProvider {
  private config: ASRConfig

  constructor(config: ASRConfig) {
    this.config = config
  }

  // 更新配置
  updateConfig(config: ASRConfig): void {
    this.config = config
  }

  // 转录音频文件
  async transcribe(audioFilePath: string): Promise<TranscriptionResult> {
    if (this.config.provider === 'groq') {
      return this.transcribeGroq(audioFilePath)
    }
    return this.transcribeGlm(audioFilePath)
  }

  // 测试API连接
  async testConnection(): Promise<boolean> {
    if (this.config.provider === 'groq') {
      return this.testGroqConnection()
    }
    return this.testGlmConnection()
  }

  private ensureAudioFileExists(audioFilePath: string): void {
    if (!fs.existsSync(audioFilePath)) {
      throw new Error('Audio file not found')
    }
  }

  private buildFormData(
    audioFilePath: string,
    fields: Record<string, string | undefined>,
  ): FormData {
    const formDataStartTime = Date.now()
    const formData = new FormData()
    formData.append('file', fs.createReadStream(audioFilePath))
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value)
      }
    })
    const formDataDuration = Date.now() - formDataStartTime
    console.log(`[ASR] ⏱️  FormData preparation took ${formDataDuration}ms`)
    return formData
  }

  private async makeAsrRequest(
    endpoint: string,
    apiKey: string,
    formData: FormData,
    providerLabel: string,
  ): Promise<AxiosResponse<AsrResponseData>> {
    const requestStartTime = Date.now()
    console.log(
      `[ASR] [${new Date().toISOString()}] Sending POST request to ASR API (${providerLabel})...`,
    )
    console.log(`[ASR] Endpoint: ${endpoint}`)

    const response = await axios.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 60000,
      responseType: 'json',
      responseEncoding: 'utf8',
    })
    const requestDuration = Date.now() - requestStartTime
    console.log(`[ASR] [${new Date().toISOString()}] API response received`)
    console.log(`[ASR] ⏱️  API network request took ${requestDuration}ms`)

    return response
  }

  private validateAndLogResponse(
    response: AxiosResponse<AsrResponseData>,
    transcribeStartTime: number,
  ): string {
    if (!response.data || !response.data.text) {
      throw new Error('Invalid response from ASR service')
    }

    const receivedText = response.data.text
    const textHash = createHash('sha256').update(receivedText, 'utf8').digest('hex')
    console.log('[ASR] Text length:', receivedText.length)
    console.log('[ASR] Text hash (sha256):', textHash)

    const totalDuration = Date.now() - transcribeStartTime
    console.log(`[ASR] ⏱️  Total transcribe() call took ${totalDuration}ms`)

    return receivedText
  }

  private handleTranscriptionError(error: unknown, transcribeStartTime: number): never {
    const errorDuration = Date.now() - transcribeStartTime
    console.error(`[ASR] Transcription failed after ${errorDuration}ms`)
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data
      const errorPayload =
        responseData && typeof responseData === 'object' && 'error' in responseData
          ? (responseData as { error?: { message?: string; code?: string } }).error
          : undefined
      if (errorPayload) {
        const errorMessage = errorPayload.message || errorPayload.code || 'Unknown error'
        throw new Error(`ASR Error: ${errorMessage}`)
      }
      throw new Error(`Network Error: ${error.message}`)
    }
    throw error
  }

  private async transcribeWithProvider(options: TranscribeOptions): Promise<TranscriptionResult> {
    const transcribeStartTime = Date.now()
    this.ensureAudioFileExists(options.audioFilePath)

    try {
      const formData = this.buildFormData(options.audioFilePath, options.formFields)
      const response = await this.makeAsrRequest(
        options.endpoint,
        options.apiKey,
        formData,
        options.providerLabel,
      )
      const receivedText = this.validateAndLogResponse(response, transcribeStartTime)

      return options.mapResult(response.data, receivedText)
    } catch (error) {
      return this.handleTranscriptionError(error, transcribeStartTime)
    }
  }

  private async transcribeGlm(audioFilePath: string): Promise<TranscriptionResult> {
    const region = this.config.region || 'cn'
    const apiKey = this.config.apiKeys[region]

    if (!apiKey) {
      throw new Error(`API Key not configured for region: ${region}`)
    }

    const endpoint =
      this.config.endpoint || (region === 'intl' ? GLM_ASR.ENDPOINT_INTL : GLM_ASR.ENDPOINT)

    return this.transcribeWithProvider({
      audioFilePath,
      endpoint,
      apiKey,
      providerLabel: `GLM/${region}`,
      formFields: {
        model: GLM_ASR.MODEL,
        stream: 'false',
        language: this.config.language || undefined,
      },
      mapResult: (data, text) => ({
        text,
        id: data.id || '',
        created: data.created || Date.now(),
        model: data.model || GLM_ASR.MODEL,
      }),
    })
  }

  private async transcribeGroq(audioFilePath: string): Promise<TranscriptionResult> {
    const apiKey = this.config.groqApiKey

    if (!apiKey) {
      throw new Error('Groq API Key not configured')
    }

    return this.transcribeWithProvider({
      audioFilePath,
      endpoint: GROQ_ASR.ENDPOINT,
      apiKey,
      providerLabel: 'Groq',
      formFields: {
        model: GROQ_ASR.MODEL,
        temperature: '0',
        response_format: 'json',
        language: this.config.language || undefined,
      },
      mapResult: (data, text) => ({
        text,
        id: data.x_groq?.id || data.id || '',
        created: data.created || Date.now(),
        model: data.model || GROQ_ASR.MODEL,
      }),
    })
  }

  private async testGlmConnection(): Promise<boolean> {
    try {
      const region = this.config.region || 'cn'
      const apiKey = this.config.apiKeys[region]

      if (!apiKey) {
        throw new Error('No API Key provided for selected region')
      }

      let endpoint = this.config.endpoint
      if (!endpoint) {
        endpoint = region === 'intl' ? GLM_ASR.ENDPOINT_INTL : GLM_ASR.ENDPOINT
      }

      // 创建一个简单的测试请求
      // 由于GLM ASR需要音频文件，这里只做一个简单的端点检查
      // 使用 POST 请求，因为 api.z.ai 可能不支持 HEAD
      // 即使没有文件，如果 API Key 正确，服务端通常会返回 400 (Bad Request)
      // 如果 Key 错误，则返回 401 (Unauthorized)
      try {
        await axios.post(
          endpoint,
          {},
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 5000,
          },
        )
        return true
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          // 400 意味着缺少参数（文件），但连接和认证通常通过了（或者至少连接通过了）
          // 严谨一点，401 肯定是 Key 错
          if (error.response.status === 400) {
            return true
          }
        }
        throw error
      }
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  private async testGroqConnection(): Promise<boolean> {
    try {
      const apiKey = this.config.groqApiKey

      if (!apiKey) {
        throw new Error('No Groq API Key provided')
      }

      // 使用 POST 请求，Groq 接口不支持 HEAD
      // 缺少文件参数通常返回 400，Key 错误返回 401
      try {
        await axios.post(
          GROQ_ASR.ENDPOINT,
          {},
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 5000,
          },
        )
        return true
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 400) {
            return true
          }
        }
        throw error
      }
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }
}
