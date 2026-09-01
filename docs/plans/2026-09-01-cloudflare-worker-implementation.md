# Cloudflare Worker Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the online Gomoku repository build and deploy automatically as a Cloudflare Worker with one Durable Object per game room.

**Architecture:** Wrangler serves compiled static assets and routes WebSocket upgrades to a deterministic `GameRoom` Durable Object based on the six-character room code. The Durable Object owns the two sockets, game state, persistence, and the 30-second alarm while reusing the existing pure rule functions.

**Tech Stack:** Cloudflare Workers, SQLite Durable Objects, Hibernation WebSockets, Wrangler, native Node.js tests

---

### Task 1: Add a reproducible Cloudflare build

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `scripts/build.mjs`
- Create: `wrangler.jsonc`
- Test: `test/cloudflare-build.test.js`

**Steps:**

1. Write a failing test requiring `build` and `deploy` scripts, a Worker entrypoint, static asset directory, Durable Object binding, SQLite migration, and copied `dist` assets.
2. Run `npm test -- test/cloudflare-build.test.js` and confirm failure.
3. Add Wrangler, the build script, configuration, and `dist/` ignore rule.
4. Run `npm run build` and the focused test; expect PASS.
5. Commit with `build: add Cloudflare Worker pipeline`.

### Task 2: Route static assets and WebSocket rooms

**Files:**
- Create: `worker/index.js`
- Create: `worker/room-code.js`
- Test: `test/worker-routing.test.js`

**Steps:**

1. Write failing pure tests for code generation and create/join request validation.
2. Run the focused test and confirm missing exports.
3. Implement the Worker fetch handler: delegate non-WebSocket requests to `env.ASSETS`, validate `/ws`, generate or normalize the room code, and forward upgrades to `env.GAME_ROOM.getByName(code)`.
4. Run the focused test and expect PASS.
5. Commit with `feat: route Cloudflare game rooms`.

### Task 3: Implement the GameRoom Durable Object

**Files:**
- Create: `worker/game-room.js`
- Modify: `worker/index.js`
- Modify: `script.js`
- Test: `test/cloudflare-room.test.js`

**Steps:**

1. Write failing tests for the room state transitions used by the Durable Object: host, guest, random colors, moves, win, timeout, and disconnect.
2. Run the focused test and confirm failure.
3. Implement Hibernation WebSocket acceptance, serialized player attachments, persisted room state, broadcasts, and Alarm-based timeout. Change the browser to connect only when creating or joining a room.
4. Run rule, room, and Worker tests; expect PASS.
5. Commit with `feat: run matches in Durable Objects`.

### Task 4: Verify Workers Builds deployment input

**Files:**
- Modify: `README.md`
- Verify: `wrangler.jsonc`

**Steps:**

1. Run `npm run build`.
2. Run `npx wrangler deploy --dry-run --outdir /tmp/online-gomoku-worker` and require a successful bundle with static assets and the `GAME_ROOM` binding.
3. Run `npm test` and require zero failures.
4. Document Cloudflare Build command `npm run build`, Deploy command `npx wrangler deploy`, production branch `main`, and Custom Domain `gomoku.geteqls.com`.
5. Commit and push `main` so Workers Builds deploys automatically.
