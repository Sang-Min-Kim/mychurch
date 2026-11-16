# Cloudflare 배포 안내 (AI API 불필요)

이 프로젝트는 외부 AI API 키(`GEMINI_API_KEY` 등) 없이 **Cloudflare Workers** 또는 **Cloudflare Pages**로 바로 배포할 수 있습니다.

---

## 방법 1: Cloudflare Workers 배포 (실시간 동시 순례자 WebSocket + 데이터 영구 저장 포함, 권장)

`wrangler.jsonc`와 `worker/index.ts`가 이미 포함되어 있어 정적 웹(`dist/`)과 API(`/api/*`), 실시간 WebSocket(`/ws/sanctuary`)을 Cloudflare 엣지 한 곳에서 실행합니다.

1. 의존성 설치 및 프론트엔드 빌드
   ```bash
   npm install
   npm run build
   ```
2. Cloudflare 로그인 및 배포
   ```bash
   npx wrangler login
   npx wrangler deploy
   ```
3. 사목실 관리자 비밀번호 변경(선택)
   `wrangler.jsonc`의 `"PARISH_ADMIN_CODE"` 값을 수정하거나, 비밀 변수로 설정할 수 있습니다.
   ```bash
   npx wrangler secret put PARISH_ADMIN_CODE
   ```

---

## 방법 2: Cloudflare Pages 정적 배포 (가장 간단한 정적 호스팅)

서버나 Durable Object 없이 **Cloudflare Pages**에 정적 파일만 배포할 수도 있습니다.
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- 백엔드 서버가 없는 정적 환경에서는 자동으로 브라우저 저장소(`localStorage`)와 탭 간 동기화(`BroadcastChannel`) 모드로 전환되어, 오늘의 말씀·기도 지향 봉헌·3D VR 순례·성당 구조 안내가 모두 정상 동작합니다.
