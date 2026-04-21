/**
 * API 호출 유틸리티
 *
 * Railway 서버 우선, 실패 시 null 반환 (클라이언트 fallback으로 이어짐)
 */

// 하드코딩 — static export에서 process.env가 작동하지 않음
const API_URL = 'https://locus-api-production-ec46.up.railway.app'

export async function apiCall<T>(path: string, body: any): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
