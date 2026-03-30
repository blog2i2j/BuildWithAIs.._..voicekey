import axios from 'axios'
import { REFINE_GLOSSARY_REMOTE, REFINE_GLOSSARY_TERMS } from '../../shared/constants'

const COMMENT_PREFIX = '#'
const FALLBACK_GLOSSARY_TERMS = [...REFINE_GLOSSARY_TERMS]
const SUPPORTED_CONTENT_TYPES = ['text/plain', 'application/octet-stream'] as const

function normalizeGlossaryTerms(terms: readonly string[]): string[] {
  return Array.from(new Set(terms.map((term) => term.trim()).filter((term) => term.length > 0)))
}

function getContentType(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object') {
    return null
  }

  const contentType = (headers as Record<string, unknown>)['content-type']
  if (typeof contentType === 'string') {
    return contentType
  }

  if (Array.isArray(contentType)) {
    const [firstContentType] = contentType
    return typeof firstContentType === 'string' ? firstContentType : null
  }

  return null
}

function isSupportedContentType(contentType: string | null): boolean {
  if (!contentType) {
    return true
  }

  const normalizedContentType = contentType.toLowerCase()
  return SUPPORTED_CONTENT_TYPES.some((supportedType) =>
    normalizedContentType.includes(supportedType),
  )
}

function parseRemoteGlossaryText(rawText: string): string[] {
  const normalizedText = rawText.replace(/^\uFEFF/, '')
  const glossaryTerms = normalizeGlossaryTerms(
    normalizedText
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith(COMMENT_PREFIX)),
  )

  if (glossaryTerms.length === 0) {
    throw new Error('Remote glossary is empty')
  }

  return glossaryTerms
}

export class RefineGlossaryCache {
  private glossaryTerms: string[]

  constructor() {
    this.glossaryTerms = normalizeGlossaryTerms(FALLBACK_GLOSSARY_TERMS)
  }

  getTerms(): readonly string[] {
    return this.glossaryTerms
  }

  resetToFallback(): void {
    this.glossaryTerms = normalizeGlossaryTerms(FALLBACK_GLOSSARY_TERMS)
  }

  async refreshFromRemote(): Promise<readonly string[]> {
    const response = await axios.get<string>(REFINE_GLOSSARY_REMOTE.URL, {
      headers: {
        Accept: 'text/plain',
      },
      responseEncoding: 'utf8',
      responseType: 'text',
      timeout: REFINE_GLOSSARY_REMOTE.TIMEOUT_MS,
    })

    const contentType = getContentType(response.headers)
    if (!isSupportedContentType(contentType)) {
      throw new Error(`Unexpected glossary content type: ${contentType}`)
    }

    if (typeof response.data !== 'string') {
      throw new Error('Remote glossary response is not plain text')
    }

    const glossaryTerms = parseRemoteGlossaryText(response.data)
    this.glossaryTerms = glossaryTerms

    return this.glossaryTerms
  }
}
