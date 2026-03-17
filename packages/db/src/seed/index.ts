import { getDb } from '../index'

/**
 * Seed — 개발용 샘플 데이터
 *
 * 프로토타입 테스트용.
 * LŌCUS Weight 4축 정의 기준으로 작성.
 */
const SEED_STARS = [
  { text: '상사가 또 무시했다',    domain: 'Y', intensity: 4, direction: 'out', nature: '["recurring","unresolved"]' },
  { text: '잠을 제대로 못 잤다',   domain: 'X', intensity: 3, direction: 'in',  nature: '["recurring"]' },
  { text: '친구한테 연락이 없다',   domain: 'Z', intensity: 3, direction: 'out', nature: '["unresolved"]' },
  { text: '해야 할 일이 쌓였다',   domain: 'Y', intensity: 4, direction: 'in',  nature: '["unresolved","recurring"]' },
  { text: '혼자 있고 싶었다',      domain: 'Z', intensity: 2, direction: 'in',  nature: '["onetime"]' },
  { text: '오늘 발표를 망쳤다',    domain: 'Y', intensity: 4, direction: 'in',  nature: '["onetime"]' },
  { text: '밥을 또 대충 먹었다',   domain: 'X', intensity: 2, direction: 'in',  nature: '["recurring"]' },
  { text: '그 사람이 신경 쓰인다', domain: 'Z', intensity: 4, direction: 'out', nature: '["recurring","unresolved"]' },
]

function seed() {
  const db = getDb()

  const userId = 'seed-user-001'

  // 유저 생성
  db.prepare(`
    INSERT OR IGNORE INTO users (id, signal_level, gravity_unlocked, star_count)
    VALUES (?, 3, 1, ?)
  `).run(userId, SEED_STARS.length)

  // 별 생성
  const insertStar = db.prepare(`
    INSERT OR IGNORE INTO stars
      (id, user_id, text, domain, intensity, direction, nature, mass, classify_method, confidence)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 'keyword', 0.4)
  `)

  SEED_STARS.forEach((s, i) => {
    insertStar.run(
      `seed-star-${String(i).padStart(3,'0')}`,
      userId,
      s.text,
      s.domain,
      s.intensity,
      s.direction,
      s.nature,
      s.intensity * 10
    )
  })

  console.log(`\n  ✓ Seed 완료 — user: ${userId}, stars: ${SEED_STARS.length}개\n`)
}

seed()
