# Side Ad Rails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stable 160×600 Kakao AdFit placeholder slots to both sides of the online Gomoku app on wide desktop screens.

**Architecture:** Wrap the existing `main.app` with a three-column page shell containing two independent ad slots. Keep the central app unchanged and hide both ad rails below the desktop breakpoint.

**Tech Stack:** Semantic HTML, responsive CSS, native `node:test`

---

### Task 1: Add and verify the two advertising rails

**Files:**
- Modify: `test/server-smoke.test.js`
- Modify: `index.html`
- Modify: `style.css`

**Step 1: Write the failing tests**

Require `leftAdSlot` and `rightAdSlot` elements with an `ad-slot` class. Read `style.css` and require a three-column `.page-shell`, 160px-wide and 600px-tall slots, and a media query that hides `.ad-rail` below 1300px.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/server-smoke.test.js`

Expected: FAIL because no advertising slots exist.

**Step 3: Implement the minimal semantic layout**

Wrap the existing app in `<div class="page-shell">`. Add `<aside class="ad-rail">` elements on both sides, with stable IDs and a child placeholder. Use CSS grid columns `160px minmax(0, 900px) 160px`, a 24px gap, and fixed 160×600 slot dimensions. Hide rails at `max-width: 1299px`.

**Step 4: Run focused and full verification**

Run: `npm test -- test/server-smoke.test.js && npm test && git diff --check`

Expected: all tests PASS and no whitespace errors.

**Step 5: Commit and push**

```bash
git add index.html style.css test/server-smoke.test.js docs/plans/2026-09-01-side-ad-rails-implementation.md
git commit -m "feat: add desktop side ad slots"
git push origin main
```
