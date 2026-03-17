# LŌCUS

> 당신의 중심점.

사용자가 일상의 짐들을 텍스트로 던지면 — 3D 성운 공간에 별로 쌓입니다. 쌓인 것들이 Gravity를 형성하고, Gravity가 충분해지면 LŌCUS가 조용히 제안합니다.

---

## 구조

```
locus/
├── apps/
│   ├── web/          # Next.js 14 (App Router)
│   └── api/          # Express + TypeScript
├── packages/
│   ├── shared/       # 공유 타입 (Weight 4축, Star, Signal ...)
│   ├── ai-engine/    # 분류 엔진 (Claude API → KoBERT)
│   └── db/           # SQLite 스키마 + 마이그레이션
├── turbo.json
└── package.json
```

---

## 핵심 개념

### Weight 4축
사용자가 던진 텍스트를 분류하는 기준:

| 축 | 정의 | 값 |
|---|---|---|
| Domain | X(기반) / Y(성과) / Z(관계) | 복수 시 비율 배분 |
| Intensity | 머릿속에 얼마나 무겁게 올라오는가 | 1~5 |
| Direction | 통제 가능(in) / 통제 불가(out) | 복수 시 비율 |
| Nature | 미결(unresolved) / 반복(recurring) / 일회(onetime) | 복수 허용, onetime 단독 |

### Star Candy
내부 설계 언어. X/Y/Z 세 축의 Weight 분포가 레이더 차트 형태(별사탕)를 만든다.

- **항성 (Anchor Star)**: 영역 내 가장 무거운 별
- **행성**: 항성 주변 공전
- **위성**: 행성 주변 공전
- **성운 글로우**: 많이 던진 영역일수록 밝아짐

### Signal (제안)
Gravity가 충분히 형성되면 단 한 줄만 조용히 올라옵니다.
- 해결 요구 없음. 분석 없음. 사실의 출현.
- 사용자가 해도 되고 안 해도 됨.

---

## 시작하기

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# ANTHROPIC_API_KEY 설정 필요

# 개발 서버 실행
npm run dev
# web: http://localhost:3000
# api: http://localhost:4000
```

---

## AI 엔진 로드맵

```
Phase 1 (현재)   Claude API 기반 분류 — 프로토타입 검증
Phase 2 (예정)   레이블링 데이터 구축 (500~2000개)
Phase 3 (예정)   KoBERT 파인튜닝
Phase 4 (예정)   소형 모델 교체 — 온디바이스 추론
```

---

## 기획 문서

`docs/` 폴더 또는 LŌCUS Planning v1.3 참조.

---

## 백로그

- [ ] 화두 질문 풀 30~50개 완성
- [ ] 온보딩 질문 10~15개 + 선택지 설계
- [ ] 성운 시각화 Three.js 구현
- [ ] AI 분류 레이블링 데이터 구축
- [ ] Gravity 임계값 수치화 (배포 후 실험)
- [ ] Gravity 기반 Signal 로직 고도화
- [ ] Mass Signature 화면 (Star Candy 형상)
