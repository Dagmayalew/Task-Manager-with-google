# Design Document: Chronotask Extension Security Hardening

**Date:** 2026-11-19  
**Status:** Pending Approval  
**Target Files:**
- `src/services/extensionExporter.ts`
- `src/App.tsx`
- `src/components/ExtensionExportModal.tsx`

---

## 1. Intent & Purpose

The Chronotask Chrome Extension allows users to manage daily tasks via a browser popup and sidepanel, synchronizing offline tasks with the Chronotask web application and Google Tasks. This project hardens the extension and its bi-directional communication bridge against data leakage, Cross-Site Scripting (DOM XSS), unauthorized state manipulation, and Chrome Web Store policy violations.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Eliminate Data Leakage**: Restrict content scripts and tab querying to the official verified application origin (`https://task-manager-with-google.vercel.app/*`). Remove wildcards (`http://localhost/*`) that allow arbitrary local servers to intercept user task data.
- **Prevent DOM XSS**: Replace defective character escaping with comprehensive HTML entity escaping (including double `"` and single `'` quotes) across all dynamic element attributes (task IDs, folder IDs, titles, priorities, and styles) in `popup.js` and `sidepanel.html`.
- **Harden CSP**: Remove `'unsafe-inline'` from `style-src` by eliminating inline `<style>` tags in `sidepanel.html` and moving them to `popup.css`.
- **Secure Synchronization Bridge**: Deeply validate and sanitize all postMessage payloads in both `content.js` and `App.tsx` before writing to `chrome.storage.local` or triggering Google Tasks API mutations.
- **Strict Tab Matching**: Replace fuzzy substring checks (`includes('vercel.app')`) with exact origin parsing via `new URL(tab.url).origin`.
- **Input Boundaries**: Enforce maximum string lengths on task titles (500 chars), notes (2000 chars), and folder names (100 chars), with strict priority allowlists.

### Non-Goals
- Modifying the core visual UI design or user-facing theme.
- Changing Firebase Authentication or Google OAuth scopes.

### Anti-Goals
- Breaking offline functionality or task persistence in `chrome.storage.local`.
- Requesting intrusive permissions like the broad `tabs` permission ("Read browsing history").

---

## 3. Approaches Considered

1. **Approach A: Comprehensive Hardening (Selected by User)**
   - Audit and patch all layers: Manifest V3 permissions, CSP, DOM rendering, tab queries, input validation, and bi-directional postMessage schema verification.
   - *Trade-off*: Touches multiple parts of the exporter and bridge, but eliminates all identified threat vectors and complies with Chrome Web Store strict reviews.
2. **Approach B: Targeted Quick Patch (Rejected)**
   - Only patch `escapeHtml` and `.includes('vercel.app')` without touching manifest permissions, CSP, or `App.tsx` validation.
   - *Trade-off*: Leaves data leakage on localhost and unauthenticated Google API task flooding open.

---

## 4. Technical Design Specifications

### 4.1 Manifest V3 & CSP (`src/services/extensionExporter.ts`)
- **Permissions**: `['storage', 'sidePanel']`.
- **Host Permissions**: `['https://task-manager-with-google.vercel.app/*']`. (Grants URL access to the official app tab in `tabs.query` without needing broad `tabs` permission).
- **Content Scripts**: Scoped strictly to `['https://task-manager-with-google.vercel.app/*']`.
- **CSP**:
  ```text
  extension_pages: "script-src 'self'; object-src 'none'; frame-src 'none'; img-src 'self' data:; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"
  ```
- **Side Panel HTML**: Remove inline `<style> body { width: 100%; height: 100vh; } </style>` and add the rule directly to `popup.css`.

### 4.2 Complete HTML Attribute Escaping (`popup.js`)
Replace the DOM `textContent -> innerHTML` implementation with a complete entity escaper:
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
All dynamic attributes (`data-id`, `value`, `aria-label`, `class`, `title`) will pass through `escapeHtml`. Priorities will be validated against `['urgent', 'high', 'medium', 'low']`. Hex colors will be validated with `/^#[0-9a-fA-F]{6}$/`.

### 4.3 Safe Tab Querying (`popup.js`)
```javascript
function isOfficialAppTab(tab) {
  if (!tab || !tab.url) return false;
  try {
    const url = new URL(tab.url);
    return url.origin === 'https://task-manager-with-google.vercel.app';
  } catch (e) {
    return false;
  }
}
```

### 4.4 Bi-Directional Bridge Security (`content.js` and `src/App.tsx`)
- Verify `window === window.top` to avoid running inside nested third-party iframes.
- In `content.js`: Verify `event.origin === appOrigin` and `event.data.source === 'chronotask-web-app'`. Sanitize tasks with length limits (title: 500, notes: 2000, ID: 128) and strict priority checks.
- In `src/App.tsx`:
  - Verify `event.origin === window.location.origin` and `event.data.source === 'chronotask-extension'`.
  - Validate schema of incoming `tasks` and `lists` before updating state or enqueuing to Google Tasks sync queue.
  - Reject malformed or oversized task payloads.

### 4.5 Input Bounds & Validation in Popup Actions (`popup.js`)
- `addTask`: Title trimmed, capped to 500 characters. Priority checked against allowlist.
- `promptCreateFolder`: Title trimmed, capped to 100 characters.
- `saveTaskDetail`: Title capped to 500 chars, notes capped to 2000 chars, priority allowlist enforced.

---

## 5. Verification Plan

1. **Type Checking & Build**: `npm run lint` (`tsc --noEmit`) and `npm run build` must succeed without errors.
2. **Export Package Verification**: Verify generated `manifest.json`, `content.js`, `popup.js`, `popup.css`, `popup.html`, and `sidepanel.html` match the hardened specifications.
3. **Security Test Cases**:
   - Test injecting double quotes, script tags, and attributes into task titles, folder names, and notes: ensure they render as safe text without attribute breakout.
   - Verify `style-src 'self'` without `'unsafe-inline'` loads without CSP violations in popup and side panel.
   - Verify non-app tabs (arbitrary Vercel / Cloud Run tabs) are ignored by `tabs.query`.
   - Verify postMessage bridge only processes validated schemas from identical origin.
