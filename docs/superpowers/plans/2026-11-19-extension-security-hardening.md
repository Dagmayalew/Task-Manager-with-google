# Extension Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all identified security vulnerabilities in the Chronotask Chrome extension (cross-site data leakage, DOM XSS, unauthenticated postMessage spoofing, overly broad tab matching, and loose CSP) while ensuring Chrome Web Store compliance.

**Architecture:** Hardens the extension export generator (`src/services/extensionExporter.ts`), the web app synchronization bridge (`src/App.tsx`), and the export modal documentation (`src/components/ExtensionExportModal.tsx`). Replaces loose matching and escaping with strict origin validation, full entity escaping, bounded schemas, and tightened CSP.

**Tech Stack:** TypeScript, React 19, Chrome Extensions MV3, JSZip.

**Spec:** [docs/superpowers/specs/2026-11-19-extension-security-hardening-design.md](file:///Users/dagmayalew/Projects/taskManager/Task-Manager-with-google/docs/superpowers/specs/2026-11-19-extension-security-hardening-design.md)

## Global Constraints

- Manifest version must remain 3.
- Permissions must remain strictly minimal: `storage`, `sidePanel`, and `host_permissions: ['https://task-manager-with-google.vercel.app/*']`.
- No broad `tabs` permission allowed.
- CSP must disallow inline scripts and inline styles (`style-src 'self'`).
- Task titles max length: 500 characters; notes max length: 2000 characters; folder titles max length: 100 characters.
- TypeScript check (`npm run lint`) must pass with 0 errors.

## Review Focus

1. Double quote and single quote injection in task titles and notes does not break HTML attributes.
2. Visiting unrelated localhost or third-party origins does not trigger content script execution or postMessage data broadcasting.
3. Unauthenticated or malformed `postMessage` payloads cannot trigger unbounded Google Tasks creation or crash the state.
4. Tab queries in popup ignore non-official origins (no accidental messages to phishing domains).
5. Removal of `'unsafe-inline'` from CSP does not break side panel or popup layout.

---

### Task 1: Manifest V3, CSP, and Styling Hardening

**Files:**
- Modify: `src/services/extensionExporter.ts:47-100`, `src/services/extensionExporter.ts:266-310`, `src/services/extensionExporter.ts:1678-1710`

**Interfaces:**
- Produces: Hardened `manifestJson`, `popupCss`, and `sidepanelHtml`.
- `manifestJson.host_permissions`: `['https://task-manager-with-google.vercel.app/*']`
- `manifestJson.content_scripts[0].matches`: `['https://task-manager-with-google.vercel.app/*']`
- `manifestJson.content_security_policy.extension_pages`: `"script-src 'self'; object-src 'none'; frame-src 'none'; img-src 'self' data:; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"`

- [ ] **Step 1: Update `manifestJson` in `extensionExporter.ts`**
  - Add `host_permissions: ['https://task-manager-with-google.vercel.app/*']`.
  - Update `content_scripts.matches` to only include `https://task-manager-with-google.vercel.app/*`.
  - Remove `'unsafe-inline'` from `content_security_policy.extension_pages`.

- [ ] **Step 2: Migrate inline `<style>` out of `sidepanelHtml`**
  - In `sidepanelHtml`, remove `<style> body { width: 100%; height: 100vh; } </style>`.
  - In `popupCss`, add `body.sidepanel-view { width: 100%; height: 100vh; margin: 0; }` and add `class="sidepanel-view"` to `<body class="sidepanel-view">` in `sidepanelHtml`.

- [ ] **Step 3: Verify TypeScript compilation**
  Run: `npm run lint`
  Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 1**
  ```bash
  git add src/services/extensionExporter.ts
  git commit -m "fix(security): harden manifest permissions, content script matches, and CSP"
  ```

---

### Task 2: DOM XSS Elimination & Strict HTML Escaping in `popup.js`

**Files:**
- Modify: `src/services/extensionExporter.ts:887-1470`

**Interfaces:**
- Produces: Safe `popupJs` template with robust `escapeHtml`, attribute escaping, color validation, and input length bounds.

- [ ] **Step 1: Implement robust `escapeHtml` in `popupJs`**
  Replace DOM innerHTML extraction with explicit replacement:
  ```javascript
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  ```

- [ ] **Step 2: Add validation helpers in `popupJs`**
  - `isValidHexColor(color)`: `/^#[0-9a-fA-F]{6}$/.test(color)`
  - Priority validation: ensure value is in `['urgent', 'high', 'medium', 'low']`, defaulting to `'medium'`.

- [ ] **Step 3: Secure dropdown and task list rendering in `popupJs`**
  - In `renderFolderDropdowns`: escape `l.id` using `escapeHtml(l.id)` in all `<option value="...">`.
  - In `renderTasks`:
    - Escape `t.id` in `data-id="${escapeHtml(t.id)}"`.
    - Escape `safeLabel` and `safeTitle` properly with `escapeHtml`.
    - Verify `folder.color` with `isValidHexColor`; if valid, use it; otherwise fallback to default `#1e4fd8`.
    - Ensure `pTag` is validated against allowed priorities before insertion into class and text.

- [ ] **Step 4: Bound input fields in `popupJs`**
  - In `addTask`: slice `title` to 500 characters, validate priority.
  - In `promptCreateFolder`: slice `name` to 100 characters.
  - In `saveTaskDetail`: slice `title` to 500 characters, `notes` to 2000 characters, validate priority.

- [ ] **Step 5: Verify TypeScript compilation**
  Run: `npm run lint`
  Expected: PASS with 0 errors.

- [ ] **Step 6: Commit Task 2**
  ```bash
  git add src/services/extensionExporter.ts
  git commit -m "fix(security): eliminate DOM XSS and add input validation in popup logic"
  ```

---

### Task 3: Secure Tab Querying in `popup.js`

**Files:**
- Modify: `src/services/extensionExporter.ts:850-865`, `src/services/extensionExporter.ts:980-1005`

**Interfaces:**
- Produces: Exact origin-matched tab lookup in `popupJs`.
- Replaces substring checks (`includes('vercel.app')`) with strict `new URL(tab.url).origin === 'https://task-manager-with-google.vercel.app'`.

- [ ] **Step 1: Define `isChronotaskTab(tab)` in `popupJs`**
  ```javascript
  function isChronotaskTab(tab) {
    if (!tab || !tab.url) return false;
    try {
      var url = new URL(tab.url);
      return url.origin === 'https://task-manager-with-google.vercel.app';
    } catch (e) {
      return false;
    }
  }
  ```

- [ ] **Step 2: Use `isChronotaskTab` on startup sync and "Sync Google Tasks ↗" click**
  - In DOMContentLoaded handler: use `tabs.find(isChronotaskTab)`.
  - In `footerSync` click handler: use `tabs.find(isChronotaskTab)`.

- [ ] **Step 3: Verify TypeScript compilation**
  Run: `npm run lint`
  Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**
  ```bash
  git add src/services/extensionExporter.ts
  git commit -m "fix(security): restrict tab querying to exact official web app origin"
  ```

---

### Task 4: Secure Bi-Directional Synchronization Bridge (`content.js` & `App.tsx`)

**Files:**
- Modify: `src/services/extensionExporter.ts:1513-1675` (`contentJs`)
- Modify: `src/App.tsx:187-260`

**Interfaces:**
- Produces: Iframe-guarded, schema-validated bi-directional sync channel between extension and web app.

- [ ] **Step 1: Harden `contentJs`**
  - Add iframe check: `if (window !== window.top) return;`.
  - Restrict `ALLOWED_ORIGINS` to `['https://task-manager-with-google.vercel.app']`.
  - Validate `event.origin === appOrigin` and `event.data.source === 'chronotask-web-app'`.
  - Deeply sanitize incoming tasks (limit 1000 items, title <= 500, notes <= 2000, valid priority, valid due timestamp).

- [ ] **Step 2: Harden `handleExtensionSyncMessage` in `src/App.tsx`**
  - Verify `event.source === window` and `event.origin === window.location.origin`.
  - Verify `event.data.source === 'chronotask-extension'`.
  - Validate schema of incoming `event.data.tasks` and `event.data.lists`:
    - Cap tasks to 1000 items.
    - Validate each task has non-empty string `id` (<= 128 chars), string `title` (<= 500 chars), valid priority, boolean `completed`.
    - Discard malformed items.
    - Sanitize `lists` (cap to 200 items, valid id, title <= 200 chars, valid hex color).

- [ ] **Step 3: Verify TypeScript compilation**
  Run: `npm run lint`
  Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 4**
  ```bash
  git add src/services/extensionExporter.ts src/App.tsx
  git commit -m "fix(security): validate schemas and guard iframe context in sync bridge"
  ```

---

### Task 5: Store Guidance Alignment & End-to-End Verification

**Files:**
- Modify: `src/components/ExtensionExportModal.tsx:40-96`
- Modify: `src/services/extensionExporter.ts:1795-1830` (`README_INSTALL.md`)

**Interfaces:**
- Produces: Fully aligned Web Store answers and updated `README_INSTALL.md`.

- [ ] **Step 1: Align `ExtensionExportModal.tsx` store fields**
  - Confirm host permissions justification in `storeFields` perfectly matches the hardened manifest.
  - Remove any legacy mentions of localhost content script matching.

- [ ] **Step 2: Run build and lint verification**
  Run: `npm run lint && npm run build`
  Expected: Build succeeds with zero errors, producing updated bundle in `dist/`.

- [ ] **Step 3: Commit Task 5**
  ```bash
  git add src/components/ExtensionExportModal.tsx src/services/extensionExporter.ts
  git commit -m "docs(extension): update store permissions guide and installation docs"
  ```
