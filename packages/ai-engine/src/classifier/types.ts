import type { Weight } from '@locus/shared'

export interface ClassifyResult extends Weight {
  confidence: number    // 0.0 ~ 1.0
  method: 'claude' | 'kobert' | 'keyword' // 분류 방법
  rawText: string
}
