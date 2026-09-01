# Online Gomoku Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and deploy a server-authoritative, code-based two-player online Gomoku game with freestyle and Renju rule options.

**Architecture:** A Node.js HTTP server serves the existing browser client and hosts a WebSocket endpoint. Pure rule functions validate moves, while a room manager owns ephemeral rooms, player connections, turns, rematches, and cleanup; the browser only renders server-confirmed state.

**Tech Stack:** Node.js 22, native HTTP server, `ws`, native `node:test`, HTML, CSS, browser JavaScript, Playwright for two-browser smoke testing

---

### Task 1: Establish the Node.js application and test runner

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `server/index.js`
- Test: `test/server-smoke.test.js`

**Step 1: Write the failing server smoke test**

Create a test that imports `createAppServer`, listens on an ephemeral port, requests `/`, and expects HTTP 200 with the game title.

**Step 2: Run the test to verify it fails**

Run: `npm test -- test/server-smoke.test.js`

Expected: FAIL because `server/index.js` does not exist.

**Step 3: Add the minimal package and server implementation**

Define scripts for `start`, `dev`, and `test`, add `ws` as a runtime dependency, export `createAppServer`, and serve `index.html`, `style.css`, and `script.js` with safe fixed-path routing.

**Step 4: Run the test to verify it passes**

Run: `npm test -- test/server-smoke.test.js`

Expected: PASS with one HTTP smoke test.

**Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore server/index.js test/server-smoke.test.js
git commit -m "build: add Node server scaffold"
```

### Task 2: Extract and test core board rules

**Files:**
- Create: `server/game-rules.js`
- Test: `test/game-rules.test.js`

**Step 1: Write failing tests for board primitives and freestyle wins**

Cover empty 15×15 board creation, bounds checks, occupied intersections, horizontal, vertical, and both diagonal wins, and a six-stone freestyle win.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- test/game-rules.test.js`

Expected: FAIL because the rule exports are missing.

**Step 3: Implement the minimal pure rule API**

Export `BOARD_SIZE`, `EMPTY`, `BLACK`, `WHITE`, `createBoard`, `isInside`, `countLine`, and `getFreestyleWinner`. Keep all functions independent of WebSocket and room state.

**Step 4: Run the tests to verify they pass**

Run: `npm test -- test/game-rules.test.js`

Expected: PASS for every freestyle direction and invalid placement case.

**Step 5: Commit**

```bash
git add server/game-rules.js test/game-rules.test.js
git commit -m "feat: add freestyle gomoku rules"
```

### Task 3: Implement Renju forbidden-move analysis

**Files:**
- Modify: `server/game-rules.js`
- Test: `test/renju-rules.test.js`

**Step 1: Write failing table-driven Renju tests**

Add explicit board fixtures for overline, double-four, double-three, legal single-three, edge-constrained shapes, exact-five precedence, and unrestricted white moves. Assert both legality and the user-facing reason code: `overline`, `double-four`, or `double-three`.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- test/renju-rules.test.js`

Expected: FAIL because `analyzeRenjuMove` is missing.

**Step 3: Implement directional shape analysis**

Temporarily place the candidate black stone, scan all four axes, reject overlines first, accept an exact five as a win, then count distinct legal four and open-three lines. Export `analyzeRenjuMove(board, row, col, player)` returning `{ legal, reason, wins }`.

**Step 4: Run the Renju and freestyle suites**

Run: `npm test -- test/renju-rules.test.js test/game-rules.test.js`

Expected: PASS with no freestyle regression.

**Step 5: Commit**

```bash
git add server/game-rules.js test/renju-rules.test.js
git commit -m "feat: validate Renju forbidden moves"
```

### Task 4: Build the room lifecycle as a pure service

**Files:**
- Create: `server/room-manager.js`
- Test: `test/room-manager.test.js`

**Step 1: Write failing room lifecycle tests**

Test unique six-character codes, normalized nicknames, host creation as black, guest join as white, rejection of unknown/full rooms, waiting-state move rejection, turn enforcement, occupied-point rejection, win transition, draw transition, and room deletion on disconnect.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- test/room-manager.test.js`

Expected: FAIL because `RoomManager` is missing.

**Step 3: Implement the minimal room manager**

Store rooms in a `Map`. Inject the code generator for deterministic tests. Keep socket identifiers separate from public player data, expose only sanitized snapshots, and route every move through the rule module.

**Step 4: Run the test to verify it passes**

Run: `npm test -- test/room-manager.test.js`

Expected: PASS for lifecycle, validation, and cleanup cases.

**Step 5: Commit**

```bash
git add server/room-manager.js test/room-manager.test.js
git commit -m "feat: add authoritative room lifecycle"
```

### Task 5: Add mutual rematch and color swapping

**Files:**
- Modify: `server/room-manager.js`
- Modify: `test/room-manager.test.js`

**Step 1: Write failing rematch tests**

Verify that one request only records readiness, both requests reset the board, color assignments swap, the new black moves first, duplicate requests are harmless, and active games reject rematch requests.

**Step 2: Run the focused tests to verify they fail**

Run: `npm test -- test/room-manager.test.js`

Expected: FAIL on the new rematch cases.

**Step 3: Implement rematch state**

Track a readiness set by stable player ID. When both finished-game players agree, create a new board, swap colors, clear the last move and result, and broadcast a fresh playing snapshot.

**Step 4: Run the room tests**

Run: `npm test -- test/room-manager.test.js`

Expected: PASS for original and rematch behavior.

**Step 5: Commit**

```bash
git add server/room-manager.js test/room-manager.test.js
git commit -m "feat: add mutual rematches"
```

### Task 6: Define and test the WebSocket protocol

**Files:**
- Create: `server/socket-handler.js`
- Modify: `server/index.js`
- Test: `test/websocket.test.js`

**Step 1: Write failing integration tests with two WebSocket clients**

Cover `create_room`, `join_room`, `place_stone`, `request_rematch`, and `leave_room`. Assert `room_created`, `state_changed`, `request_rejected`, and `room_closed` responses; verify a third client cannot join and a disconnect closes the room immediately.

**Step 2: Run the integration test to verify it fails**

Run: `npm test -- test/websocket.test.js`

Expected: FAIL because no WebSocket endpoint is attached.

**Step 3: Implement the protocol adapter**

Parse JSON defensively, validate message type and fields, associate each socket with at most one player, call `RoomManager`, and broadcast sanitized snapshots. Use short stable error codes plus Korean display messages.

**Step 4: Run all server tests**

Run: `npm test`

Expected: PASS for HTTP, rules, rooms, rematches, and WebSocket behavior.

**Step 5: Commit**

```bash
git add server/index.js server/socket-handler.js test/websocket.test.js
git commit -m "feat: expose online game WebSocket protocol"
```

### Task 7: Build the lobby and room interface

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `script.js`

**Step 1: Add a failing browser smoke assertion**

Extend the smoke test or add a static markup test that requires nickname input, freestyle/Renju selection, create-room button, join-code input, join button, room-code display, copy button, player cards, rule badge, board status, rematch button, and leave button.

**Step 2: Run the test to verify it fails**

Run: `npm test -- test/server-smoke.test.js`

Expected: FAIL because the lobby controls are absent.

**Step 3: Implement accessible lobby and game views**

Use one-page view switching. Preserve the responsive wooden-board direction, label every form control, provide keyboard focus styles and live status announcements, and keep the board usable on narrow mobile screens.

**Step 4: Run the smoke test**

Run: `npm test -- test/server-smoke.test.js`

Expected: PASS with all required UI landmarks present.

**Step 5: Commit**

```bash
git add index.html style.css script.js test/server-smoke.test.js
git commit -m "feat: add online lobby and room interface"
```

### Task 8: Connect the browser to authoritative game state

**Files:**
- Modify: `script.js`
- Modify: `style.css`
- Test: `test/client-state.test.js`

**Step 1: Write failing client state tests**

Extract testable helpers for code normalization, WebSocket URL selection, status copy, allowed-cell state, last-move marker, and forbidden-point reason labels. Test that local clicks never mutate the board before a server snapshot arrives.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- test/client-state.test.js`

Expected: FAIL because the helpers and server-driven rendering are missing.

**Step 3: Implement browser messaging and rendering**

Connect using `wss:` on HTTPS and `ws:` locally. Send room and move commands, render snapshots, show waiting/playing/finished/closed states, copy the participation code, and display Korean error messages without using blocking alerts.

**Step 4: Run all unit and integration tests**

Run: `npm test`

Expected: PASS across server and client helpers.

**Step 5: Commit**

```bash
git add script.js style.css test/client-state.test.js
git commit -m "feat: synchronize browser game state"
```

### Task 9: Render and block Renju forbidden points

**Files:**
- Modify: `server/room-manager.js`
- Modify: `script.js`
- Modify: `style.css`
- Modify: `test/room-manager.test.js`
- Modify: `test/client-state.test.js`

**Step 1: Write failing forbidden-point snapshot tests**

Verify that the server returns forbidden coordinates and reason codes only during black's Renju turn, and the client maps them to disabled intersections with Korean labels.

**Step 2: Run the focused tests to verify they fail**

Run: `npm test -- test/room-manager.test.js test/client-state.test.js`

Expected: FAIL because forbidden-point snapshots are absent.

**Step 3: Implement server enumeration and client markers**

Analyze each empty point after a valid state change, include only forbidden points in the black player's snapshot, render a translucent red X, set an accessible label such as `8행 8열, 삼삼 금수`, and block click submission.

**Step 4: Run all tests**

Run: `npm test`

Expected: PASS with forbidden points hidden on white turns and freestyle rooms.

**Step 5: Commit**

```bash
git add server/room-manager.js script.js style.css test/room-manager.test.js test/client-state.test.js
git commit -m "feat: show Renju forbidden intersections"
```

### Task 10: Verify the full two-player browser flow

**Files:**
- Create: `playwright.config.js`
- Create: `test/e2e/online-game.spec.js`
- Modify: `package.json`

**Step 1: Write the end-to-end scenario**

Open two isolated browser contexts, create a freestyle room, copy its code, join from the second context, alternate moves to a black victory, accept a rematch from both players, verify swapped colors, then close one context and confirm the other receives the immediate-termination message.

**Step 2: Run it to verify any missing behavior fails**

Run: `npm run test:e2e`

Expected: FAIL until every browser event and selector is wired correctly.

**Step 3: Fix only behavior exposed by the scenario**

Add stable `data-testid` attributes where necessary and correct protocol/UI timing without adding unrelated features.

**Step 4: Run complete verification**

Run: `npm test && npm run test:e2e`

Expected: all unit, integration, and two-browser tests PASS.

**Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.js test/e2e/online-game.spec.js index.html script.js
git commit -m "test: cover complete online match flow"
```

### Task 11: Add production deployment configuration and documentation

**Files:**
- Create: `README.md`
- Create: `render.yaml`
- Modify: `server/index.js`
- Test: `test/server-smoke.test.js`

**Step 1: Add failing production configuration tests**

Assert that the server respects `PORT`, serves a health endpoint, and returns safe 404 responses without exposing arbitrary files.

**Step 2: Run the test to verify it fails**

Run: `npm test -- test/server-smoke.test.js`

Expected: FAIL on the missing health endpoint or production behavior.

**Step 3: Implement deployment support and usage documentation**

Add `/health`, graceful shutdown, a Render web-service blueprint, local setup commands, room flow, rule summaries, connection-loss behavior, test commands, and deployment steps. Note that the host must support persistent WebSocket connections and that in-memory rooms are lost when the service restarts.

**Step 4: Run final verification**

Run: `npm test && npm run test:e2e`

Expected: all checks PASS and no uncommitted generated artifacts remain.

**Step 5: Commit**

```bash
git add README.md render.yaml server/index.js test/server-smoke.test.js
git commit -m "docs: add production deployment setup"
```

### Task 12: Publish and deploy

**Files:**
- Verify: all tracked files

**Step 1: Inspect repository state**

Run: `git status --short && git log --oneline --decorate -12`

Expected: clean worktree with the planned commits on `main`.

**Step 2: Push the completed branch**

Run: `git push -u origin main`

Expected: GitHub accepts `main` and reports the new upstream.

**Step 3: Create the hosting service from `render.yaml`**

Connect the GitHub repository to the WebSocket-capable hosting provider and deploy the production start command.

**Step 4: Verify the deployed health endpoint and two-device match**

Run: `curl -fsS https://<deployed-host>/health`

Expected: HTTP 200, followed by a successful room creation and join from two separate internet connections.

**Step 5: Record the production URL**

Add the live URL to the GitHub repository description and README, then commit and push the documentation update.
