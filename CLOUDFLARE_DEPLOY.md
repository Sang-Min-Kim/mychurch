# Cloudflare 배포 안내 (AI API 불필요)

이 프로젝트는 외부 AI API 키(`GEMINI_API_KEY` 등) 없이 **Cloudflare Pages** 또는 **Cloudflare Workers**로 배포할 수 있습니다.

---

## 방법 1: Cloudflare Pages 배포 (GitHub 연동, 가장 간단)

Cloudflare Pages는 저장소의 `bun.lock`을 감지해 `bun install --frozen-lockfile`을 실행합니다. (`package.json`과 `bun.lock` 모두 `@google/genai`가 제거된 상태로 동기화되어 있습니다.)

- **Framework preset**: `Vite` (또는 `None`)
- **Build command**: `npm run build` (또는 `bun run build`)
- **Build output directory**: `dist`
- 백엔드 서버가 없는 정적 환경에서는 자동으로 브라우저 저장소(`localStorage`)와 탭 간 동기화(`BroadcastChannel`) 모드로 전환되어, 오늘의 말씀·기도 지향 봉헌·3D VR 순례·성당 구조 안내·사목실 관리(`1225`)가 모두 정상 동작합니다.

> **참고**: GitHub 저장소에 코드를 올릴 때 `package.json`과 함께 갱신된 **`bun.lock`** 파일을 반드시 같이 커밋/푸시해 주세요.

---

## 방법 2: Cloudflare Workers 배포 (실시간 동시 순례자 WebSocket + 영구 저장 포함)

`wrangler.worker.jsonc`와 `worker/index.ts`를 사용해 정적 웹(`dist/`)과 API(`/api/*`), 실시간 WebSocket(`/ws/sanctuary`)을 Cloudflare 엣지에서 실행할 수 있습니다.

1. 의존성 설치 및 프론트엔드 빌드
   ```bash
   bun install --frozen-lockfile
   bun run build
   ```
2. Cloudflare 로그인 및 배포
   ```bash
   npx wrangler login
   npx wrangler deploy -c wrangler.worker.jsonc
   ```
3. 사목실 관리자 비밀번호 변경(선택)
   ```bash
   npx wrangler secret put PARISH_ADMIN_CODE -c wrangler.worker.jsonc
   ```
