/**
 * LŌCUS DB Schema
 *
 * SQLite (개발/MVP) → PostgreSQL (프로덕션)으로 마이그레이션 예정
 *
 * 테이블 구조:
 * - users: 유저 기본 정보 + signalLevel
 * - stars: 던진 것들 (Weight 4축 포함)
 * - gravity_snapshots: Gravity Field 스냅샷 (주기적 저장)
 * - signals: 제안 기록
 * - onboarding_answers: 초기 캘리브레이션 답변
 */

export const SCHEMA = `
-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  signal_level    INTEGER NOT NULL DEFAULT 0,    -- 0~5 기능 잠금 해제 단계
  gravity_unlocked INTEGER NOT NULL DEFAULT 0,   -- 온보딩 완료 여부
  star_count      INTEGER NOT NULL DEFAULT 0
);

-- ── Stars ─────────────────────────────────────────────────────
-- 사용자가 던진 것들. LŌCUS 핵심 데이터.
CREATE TABLE IF NOT EXISTS stars (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,                 -- 최대 30자
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),

  -- Weight 4축
  domain          TEXT NOT NULL CHECK(domain IN ('X', 'Y', 'Z')),
  domain_ratio    TEXT,                          -- JSON: {"Y":0.6,"Z":0.4}
  intensity       INTEGER NOT NULL CHECK(intensity BETWEEN 1 AND 5),
  direction       TEXT NOT NULL CHECK(direction IN ('in', 'out')),
  direction_ratio TEXT,                          -- JSON: {"in":0.4,"out":0.6}
  nature          TEXT NOT NULL DEFAULT '["onetime"]', -- JSON array

  -- Gravity / Star Candy
  mass            REAL NOT NULL DEFAULT 3.0,     -- intensity 기반 계산값
  is_anchor       INTEGER NOT NULL DEFAULT 0,    -- 영역 내 항성 여부
  orbit_parent_id TEXT REFERENCES stars(id),     -- 공전 대상

  -- AI 분류 메타
  classify_method TEXT DEFAULT 'keyword',        -- claude | kobert | keyword
  confidence      REAL DEFAULT 0.4
);

CREATE INDEX IF NOT EXISTS idx_stars_user_id ON stars(user_id);
CREATE INDEX IF NOT EXISTS idx_stars_domain ON stars(domain);
CREATE INDEX IF NOT EXISTS idx_stars_created_at ON stars(created_at);

-- ── Gravity Snapshots ─────────────────────────────────────────
-- Gravity Field 주기적 스냅샷 (Mass Signature 누적용)
CREATE TABLE IF NOT EXISTS gravity_snapshots (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  x_ratio         REAL NOT NULL DEFAULT 0.0,    -- X 영역 비율
  y_ratio         REAL NOT NULL DEFAULT 0.0,    -- Y 영역 비율
  z_ratio         REAL NOT NULL DEFAULT 0.0,    -- Z 영역 비율
  total_mass      REAL NOT NULL DEFAULT 0.0,
  is_balanced     INTEGER NOT NULL DEFAULT 0    -- Star Candy 균형 여부
);

CREATE INDEX IF NOT EXISTS idx_gravity_user_id ON gravity_snapshots(user_id);

-- ── Signals ───────────────────────────────────────────────────
-- LŌCUS 제안 기록
CREATE TABLE IF NOT EXISTS signals (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  type            TEXT NOT NULL,                -- schedule_timing | energy_warning | absence | pattern | shift
  message         TEXT NOT NULL,
  domain          TEXT,
  seen            INTEGER NOT NULL DEFAULT 0,
  seen_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_signals_user_id ON signals(user_id);

-- ── Onboarding Answers ────────────────────────────────────────
-- 초기 캘리브레이션 (10~15개 질문 답변)
CREATE TABLE IF NOT EXISTS onboarding_answers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  question_id     TEXT NOT NULL,
  choice_index    INTEGER NOT NULL,
  weight_domain   TEXT,
  weight_intensity INTEGER,
  weight_direction TEXT
);
`

export const DROP_ALL = `
DROP TABLE IF EXISTS onboarding_answers;
DROP TABLE IF EXISTS signals;
DROP TABLE IF EXISTS gravity_snapshots;
DROP TABLE IF EXISTS stars;
DROP TABLE IF EXISTS users;
`
