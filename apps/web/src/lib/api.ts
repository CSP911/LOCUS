/**
 * API 호출 유틸리티
 *
 * 서버가 있으면 서버로, 없으면 클라이언트 fallback
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export async function apiCall<T>(path: string, body: any): Promise<T | null> {
  if (!API_URL) return null

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
