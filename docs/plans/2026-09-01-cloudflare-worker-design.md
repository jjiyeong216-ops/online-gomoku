# Cloudflare Worker 배포 설계

## 목표

온라인 오목을 Cloudflare Workers Builds로 자동 배포하고 `gomoku.geteqls.com`에서 정적 화면과 실시간 1:1 WebSocket 대국을 제공한다.

## 구조

- Worker는 빌드된 HTML, CSS, JavaScript 정적 자산을 제공한다.
- 방 만들기 또는 참여 요청이 들어오면 Worker가 6자리 코드에 대응하는 Durable Object로 WebSocket 업그레이드를 전달한다.
- 게임 방 하나당 `GameRoom` Durable Object 하나를 사용한다.
- Durable Object가 플레이어, 무작위 흑백 배정, 보드, 턴, 룰, 승패를 최종 관리한다.
- 브라우저는 서버가 확정해 전송한 상태만 렌더링한다.

## 연결 흐름

1. 방 만들기를 누르면 브라우저가 닉네임과 룰을 포함해 `/ws?mode=create`로 연결한다.
2. Worker가 6자리 코드를 생성하고 코드 이름의 Durable Object로 연결을 전달한다.
3. 참여자는 닉네임과 코드를 포함해 `/ws?mode=join`으로 연결한다.
4. 동일 코드의 Durable Object가 두 연결을 모아 흑과 백을 무작위 배정한다.
5. 이후 착수와 상태 변경은 해당 Durable Object 안에서만 처리한다.

## 상태와 시간제한

- 게임 상태는 SQLite 기반 Durable Object Storage에 저장한다.
- WebSocket Hibernation API를 사용해 유휴 연결 비용을 줄이고 재활성화 시 연결 정보를 복원한다.
- 매 수의 30초 마감 시각을 저장하고 Durable Object Alarm으로 시간패를 확정한다.
- 한 사용자의 연결이 종료되면 기존 요구대로 방을 즉시 종료하고 상대에게 알린다.

## 정적 자산과 빌드

- `npm run build`가 `index.html`, `style.css`, `script.js`를 `dist/`로 복사한다.
- `wrangler.jsonc`는 Worker 진입점, `dist/` 자산, Durable Object 바인딩과 SQLite 마이그레이션을 정의한다.
- Cloudflare Workers Builds는 `npm run build` 후 `npx wrangler deploy`를 실행한다.

## 도메인

- 최초 Worker 배포 성공 후 Cloudflare 대시보드의 Custom Domain에 `gomoku.geteqls.com`을 연결한다.
- 정적 파일과 WebSocket 모두 동일한 HTTPS 도메인을 사용한다.

## 오류와 보호

- 잘못된 모드, 닉네임, 룰, 참여 코드는 WebSocket 연결 전에 거부한다.
- 방 정원은 두 명으로 제한한다.
- WebSocket 메시지 크기와 JSON 형식을 검증한다.
- 존재하지 않거나 종료된 방 참여를 거부한다.

## 검증

- 기존 자유룰, 렌주룰, 방 상태 테스트를 유지한다.
- Cloudflare 설정과 빌드 결과를 자동 검사한다.
- Wrangler dry-run으로 Worker 번들, 정적 자산, Durable Object 마이그레이션 구성을 검증한다.
- 로컬 Worker에서 두 WebSocket 클라이언트의 생성, 참여, 착수, 시간패 흐름을 확인한다.
