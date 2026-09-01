# Online Gomoku

닉네임과 6자리 참여 코드로 친구와 실시간 대국하는 온라인 오목입니다. 자유룰과 렌주룰, 무작위 흑백 배정, 서버 권위 착수 판정, 30초 시간제한을 지원합니다.

## Local Node server

```bash
npm install
npm start
```

브라우저에서 `http://localhost:2020`을 엽니다.

## Tests

```bash
npm test
```

## Cloudflare Worker

정적 자산은 Worker Assets로 제공하고 게임 방은 SQLite 기반 `GameRoom` Durable Object에서 실행합니다.

```bash
npm run build
npx wrangler dev
```

Cloudflare Workers Builds 설정:

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

배포 성공 후 Worker의 Custom Domain에 `gomoku.geteqls.com`을 연결합니다.
