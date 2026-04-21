# Railway 배포 이슈 기록

## 배포 정보
- **프로젝트**: locus-api
- **URL**: https://locus-api-production-ec46.up.railway.app
- **계정**: qct8377@gmail.com (GitHub 연동)

---

## 이슈 1: Monorepo 루트 package.json 읽기 문제

**증상**: Railway가 monorepo 루트의 `package.json`을 읽어 `better-sqlite3` 등 불필요한 네이티브 모듈을 설치하려 함. gyp 빌드 실패.

**원인**: Root Directory 미설정 시 프로젝트 루트에서 빌드됨.

**해결**: Railway 대시보드 → Settings → **Root Directory를 `apps/api`로 설정**

---

## 이슈 2: Start Command에 `cd apps/api` 포함

**증상**:
```
/bin/bash: line 1: cd: apps/api: No such file or directory
```
반복 출력 후 컨테이너 재시작 루프.

**원인**: Root Directory를 `apps/api`로 설정했으므로 이미 해당 디렉토리 안에 있음. `railway.json`의 `startCommand`에 `cd apps/api &&`가 남아있었음.

**해결**: `railway.json`에서 `startCommand`를 `npx tsx src/index.ts`로 변경

---

## 이슈 3: package-lock.json 불일치

**증상**:
```
npm ci can only install packages when your package.json and package-lock.json are in sync.
Missing: @anthropic-ai/sdk@0.52.0 from lock file
```

**원인**: Monorepo workspace 환경에서 `npm install` 하면 루트 lock file이 갱신되고 `apps/api` 전용 lock file이 생성되지 않음.

**해결**: 임시 디렉토리에서 독립적으로 `package.json` 복사 → `npm install` → `package-lock.json` 생성 → `apps/api`에 복사
```bash
cd /tmp && mkdir build && cp apps/api/package.json build/
cd build && npm install && cp package-lock.json /path/to/apps/api/
```

---

## 이슈 4: Workspace 의존성 (`@locus/shared`, `@locus/ai-engine`)

**증상**: Railway에서 monorepo workspace 패키지를 찾을 수 없음.

**원인**: `apps/api`만 배포하면 `packages/shared`, `packages/ai-engine`이 포함되지 않음.

**해결**:
- `@locus/shared` 타입을 `apps/api/src/types/shared.ts`로 직접 복사
- `package.json`에서 `@locus/shared`, `@locus/ai-engine` 의존성 제거
- 소스 코드의 import 경로를 로컬 파일로 변경

---

## 이슈 5: `npm warn config production` 경고

**증상**: `npm warn config production Use --omit=dev instead.`

**원인**: Railway의 Nixpacks가 `--production` 플래그를 사용하는데, 최신 npm에서 deprecated.

**해결**: `apps/api/.npmrc` 파일 생성
```
production=false
```

---

## 이슈 6: Anthropic SDK 네이티브 빌드 실패

**증상**: `@anthropic-ai/sdk@0.21.0`에서 gyp 빌드 실패.

**원인**: 구버전 SDK에 네이티브 의존성이 포함됨.

**해결**: SDK 버전을 `^0.52.0`으로 업그레이드. 순수 JS 버전은 네이티브 빌드 불필요.

---

## 최종 작동 설정

**railway.json** (프로젝트 루트):
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npx tsx src/index.ts",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Railway 대시보드 설정**:
- Root Directory: `apps/api`
- Variables: `ANTHROPIC_API_KEY=sk-ant-...`

**환경변수**:
- `ANTHROPIC_API_KEY` — Claude API 키 (Variables 탭에서 설정)
- `PORT` — Railway가 자동 주입 (기본 8080)
