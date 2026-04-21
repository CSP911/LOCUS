/**
 * API 호출 유틸리티
 *
 * Railway 서버 우선, 실패 시 null 반환 (클라이언트 fallback으로 이어짐)
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://locus-api-production-ec46.up.railway.app'

export async function apiCall<T>(path: string, body: any): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
