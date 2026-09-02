# Game Result Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show each player a clear, accessible win or loss modal exactly once when an online Gomoku match finishes.

**Architecture:** Add a hidden dialog-like overlay to the existing page and render it from the authoritative `finished` game state. Keep result wording in a small pure browser module so win/loss and timeout variants can be tested directly without a DOM framework.

**Tech Stack:** HTML, CSS, browser JavaScript ES modules, Node.js built-in test runner, Cloudflare Workers/Wrangler

---

### Task 1: Result wording

**Files:**
- Create: `game-result.js`
- Create: `test/game-result.test.js`

**Step 1: Write the failing test**

Test `getGameResult(state, myColor)` for normal victory, normal defeat, timeout victory, and timeout defeat.

**Step 2: Run test to verify it fails**

Run: `node --test test/game-result.test.js`
Expected: FAIL because `game-result.js` does not exist.

**Step 3: Write minimal implementation**

Export `getGameResult` returning a title, description, result class, and icon based on `state.winner`, `state.finishReason`, and `myColor`.

**Step 4: Run test to verify it passes**

Run: `node --test test/game-result.test.js`
Expected: all result wording tests PASS.

### Task 2: Accessible modal markup and presentation

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `test/server-smoke.test.js`

**Step 1: Write the failing test**

Assert that the page contains a hidden `role="dialog"` result modal with `aria-modal`, labelled title and description, and a lobby return button.

**Step 2: Run test to verify it fails**

Run: `node --test test/server-smoke.test.js`
Expected: FAIL because the modal is absent.

**Step 3: Write minimal implementation**

Add the overlay markup and responsive styles matching the current board palette. Include visible focus, restrained entrance motion, and a reduced-motion override.

**Step 4: Run test to verify it passes**

Run: `node --test test/server-smoke.test.js`
Expected: modal markup test PASS.

### Task 3: Show the result once and return to lobby

**Files:**
- Modify: `index.html`
- Modify: `script.js`
- Modify: `scripts/build.mjs`
- Modify: `test/server-smoke.test.js`

**Step 1: Write the failing test**

Assert that the browser loads `game-result.js`, uses the result helper when status is `finished`, guards repeated presentation, focuses the lobby button, and reloads when that button is clicked.

**Step 2: Run test to verify it fails**

Run: `node --test test/server-smoke.test.js`
Expected: FAIL because result modal wiring is absent.

**Step 3: Write minimal implementation**

Load the result helper as a module, track whether the current result has been presented, fill and open the modal once, focus its button, and reload on confirmation. Copy the new module during builds.

**Step 4: Run test to verify it passes**

Run: `node --test test/server-smoke.test.js`
Expected: client wiring tests PASS.

### Task 4: Verify, commit, and deploy

**Files:**
- Verify all modified files

**Step 1: Run full verification**

Run: `npm run build && npm test && node_modules/wrangler/bin/wrangler.js deploy --dry-run`
Expected: build succeeds, all tests pass, and Wrangler validates the Worker bundle.

**Step 2: Commit and push**

Run: `git add ... && git commit -m "feat: show game result modal" && git push origin main`

**Step 3: Confirm deployment**

Check the GitHub `Workers Builds: online-gomoku` result for the new commit.
Expected: completed with conclusion `success`.
