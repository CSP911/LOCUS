import type { Domain, Nature } from '@locus/shared'

/**
 * 클라이언트 사이드 분류 (static export용)
 * 서버 API 없이 키워드 기반으로 분류
 */
export interface ClassifyResult {
  domain: Domain
  intensity: number
  direction: 'in' | 'out'
  nature: Nature[]
}

export function classifyText(text: string): ClassifyResult {
  const xw = ['잠','피곤','밥','몸','쉬','운동','식사','수면','정리','아프','건강','산책','스트레칭']
  const yw = ['일','야근','발표','상사','마감','업무','성과','인정','실수','실패','집중','보고서','회의','공부','시험']
  const zw = ['친구','연락','말','대화','사람','관계','혼자','외롭','신경','가족','엄마','아빠','연인']

  let sx = 0, sy = 0, sz = 0
  xw.forEach(w => { if (text.includes(w)) sx++ })
  yw.forEach(w => { if (text.includes(w)) sy++ })
  zw.forEach(w => { if (text.includes(w)) sz++ })

  let domain: Domain
  if (!sx && !sy && !sz) domain = 'Y' // 기본값: 성과
  else if (sx >= sy && sx >= sz) domain = 'X'
  else if (sy >= sx && sy >= sz) domain = 'Y'
  else domain = 'Z'

  const nature: Nature[] = []
  if (/또|항상|매번|맨날|계속/.test(text)) nature.push('recurring')
  if (/아직|여전히|못|안|미루/.test(text)) nature.push('unresolved')
  if (nature.length === 0) nature.push('onetime')

  let intensity = 3
  if (nature.includes('recurring')) intensity += 1
  if (nature.includes('unresolved')) intensity += 1
  intensity = Math.min(5, intensity)

  const direction = /상사|환경|날씨|타인|남|걔|외부/.test(text) ? 'out' as const : 'in' as const

  return { domain, intensity, direction, nature }
}

/**
 * 작은 버전 제안 (클라이언트 fallback)
 */
export function suggestSmall(goal: string): string {
  const suggestions: Record<string, string[]> = {
    '운동': ['스트레칭 1분만 할까요?', '제자리 걷기 30초만 할까요?', '팔 돌리기 5번만 할까요?'],
    '공부': ['한 문장만 읽어볼까요?', '단어 3개만 볼까요?', '노트 펼치기만 할까요?'],
    '읽': ['한 페이지만 펼쳐볼까요?', '목차만 훑어볼까요?', '한 문단만 읽어볼까요?'],
    '정리': ['물건 하나만 제자리에 놓을까요?', '서랍 하나만 열어볼까요?', '책상 위만 치울까요?'],
    '연락': ['이모지 하나만 보내볼까요?', '안부 한 줄만 쓸까요?', '전화번호만 열어볼까요?'],
    '글': ['한 문장만 써볼까요?', '제목만 정해볼까요?', '키워드 3개만 적어볼까요?'],
  }

  for (const [key, opts] of Object.entries(suggestions)) {
    if (goal.includes(key)) {
      return opts[Math.floor(Math.random() * opts.length)]
    }
  }

  // 기본 제안
  const defaults = [
    `${goal} — 1분만 해볼까요?`,
    `${goal}의 가장 작은 첫 단계만 할까요?`,
    `지금 30초만 시작해볼까요?`,
  ]
  return defaults[Math.floor(Math.random() * defaults.length)]
}
