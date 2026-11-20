import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  type: string;
  content: string;
}

// Generate an icon PNG base64 via canvas
const generateIconDataUrl = (size: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Paper-cut cobalt tile
    ctx.fillStyle = '#1e4fd8';
    ctx.beginPath();
    const radius = size * 0.22;
    ctx.roundRect ? ctx.roundRect(0, 0, size, size, radius) : ctx.rect(0, 0, size, size);
    ctx.fill();

    // Checkmark symbol in white
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.52);
    ctx.lineTo(size * 0.45, size * 0.7);
    ctx.lineTo(size * 0.72, size * 0.32);
    ctx.stroke();

    // Single danger-red dot, same as the app's urgent marker
    ctx.fillStyle = '#b42318';
    ctx.beginPath();
    ctx.arc(size * 0.78, size * 0.25, Math.max(1.5, size * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL('image/png');
};

export const generateExtensionFiles = (clientId?: string): ExtensionFile[] => {
  const oAuthClientId = clientId || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  const manifestJson = {
    manifest_version: 3,
    name: 'Chronotask - Task Manager & Calendar Sync',
    version: '1.3.2',
    description: 'Minimalist personal task manager with folders, priority sorting, offline access, side panel, and Google Tasks sync.',
    permissions: [
      'storage',
      'sidePanel'
    ],
    host_permissions: [
      'https://task-manager-with-google.vercel.app/*'
    ],
    content_scripts: [
      {
        matches: [
          'https://task-manager-with-google.vercel.app/*'
        ],
        js: ['content.js'],
        run_at: 'document_start'
      }
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Chronotask Quick View',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png'
      }
    },
    side_panel: {
      default_path: 'sidepanel.html'
    },
    background: {
      service_worker: 'background.js',
      type: 'module'
    },
    commands: {
      '_execute_action': {
        suggested_key: {
          default: 'Ctrl+Shift+T',
          mac: 'Command+Shift+T'
        },
        description: 'Open Chronotask Task Manager'
      }
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'; frame-src 'none'; img-src 'self' data:; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  };

  const backgroundJs = `// Chronotask Service Worker v1.3.2
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chronotask extension v1.3.2 installed successfully.');
  updateBadge();
});

// Configure side panel behavior
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}

// Update icon badge with count of today's pending tasks
async function updateBadge() {
  try {
    const data = await chrome.storage.local.get(['chronotask_tasks_v1']);
    const raw = data.chronotask_tasks_v1 ? JSON.parse(data.chronotask_tasks_v1) : [];
    const today = new Date().toISOString().split('T')[0];
    const pendingToday = raw.filter(t => !t.completed && t.due === today).length;
    
    if (pendingToday > 0) {
      chrome.action.setBadgeText({ text: String(pendingToday) });
      chrome.action.setBadgeBackgroundColor({ color: '#e11d48' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    // ignore
  }
}

// Listen for storage changes to keep badge updated
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.chronotask_tasks_v1) {
    updateBadge();
  }
});

// Listen for sync completion messages
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'SYNC_COMPLETED') {
    updateBadge();
  }
});
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chronotask</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <header class="header">
    <div class="logo">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>Chronotask <small>v1.3</small></span>
    </div>
    <div class="actions">
      <div class="sync" id="syncStatus" role="status" aria-live="polite" title="Sync status">
        <span class="sync-dot" aria-hidden="true"></span>
        <span id="syncLabel">Local only</span>
      </div>
      <button id="openFullApp" title="Open Full Dashboard" aria-label="Open full dashboard">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
    </div>
  </header>

  <section class="quick-add">
    <input type="text" id="quickTaskInput" placeholder="Add a task… (or press Enter)" aria-label="New task title" autofocus>
    <div class="quick-add-bar">
      <select id="quickFolderSelect" class="mini-select" aria-label="Folder">
        <option value="default_my_tasks">General</option>
        <option value="default_work">Work & Projects</option>
        <option value="default_personal">Personal</option>
        <option value="default_urgent">Urgent & Critical</option>
      </select>
      <select id="quickPrioritySelect" class="mini-select" aria-label="Priority">
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium" selected>Medium</option>
        <option value="low">Low</option>
      </select>
      <button id="quickAddBtn" class="btn-quick-add" type="button" aria-label="Add task">+ Add Task</button>
    </div>
  </section>

  <div class="filter-controls">
    <div class="filter-tabs">
      <button class="tab active" data-filter="today" aria-pressed="true">Today</button>
      <button class="tab" data-filter="all" aria-pressed="false">All</button>
      <button class="tab" data-filter="upcoming" aria-pressed="false">Upcoming</button>
    </div>
    <div class="filter-right">
      <select id="folderFilterSelect" class="mini-select" title="Filter by folder" aria-label="Filter by folder">
        <option value="all">All folders</option>
      </select>
      <button id="sortToggleBtn" class="sort-btn" title="Toggle priority order" aria-label="Toggle priority order">
        ↓ Priority
      </button>
      <button id="copyFolderBtn" class="sort-btn" title="Copy tasks in the selected folder">
        Copy
      </button>
    </div>
  </div>

  <main id="taskList" class="task-list" aria-label="Tasks">
    <!-- Tasks list rendered dynamically -->
  </main>

  <!-- Inline Task Detail & Edit Drawer -->
  <div id="detailDrawer" class="detail-drawer hidden" role="dialog" aria-modal="true" aria-labelledby="detailTitleLabel">
    <div class="detail-header">
      <span class="detail-title-label" id="detailTitleLabel">Task details</span>
      <button id="closeDetailBtn" class="icon-btn" aria-label="Close task details">✕</button>
    </div>
    <div class="detail-body">
      <label class="form-label" for="editTaskTitle">Task title</label>
      <input type="text" id="editTaskTitle" class="form-input">

      <span class="form-label" id="priorityLabel">Priority</span>
      <div class="priority-chips" role="group" aria-labelledby="priorityLabel">
        <button type="button" class="chip" data-p="urgent">Urgent</button>
        <button type="button" class="chip" data-p="high">High</button>
        <button type="button" class="chip" data-p="medium">Medium</button>
        <button type="button" class="chip" data-p="low">Low</button>
      </div>

      <label class="form-label" for="editTaskFolder">Folder</label>
      <select id="editTaskFolder" class="form-input">
        <option value="default_my_tasks">General</option>
        <option value="default_work">Work & Projects</option>
        <option value="default_personal">Personal</option>
        <option value="default_urgent">Urgent & Critical</option>
      </select>

      <label class="form-label" for="editTaskDue">Due date</label>
      <input type="date" id="editTaskDue" class="form-input">

      <label class="form-label" for="editTaskNotes">Notes</label>
      <textarea id="editTaskNotes" rows="3" class="form-input" placeholder="Add notes..."></textarea>
    </div>
    <div class="detail-footer">
      <button id="deleteTaskBtn" class="btn-delete">Delete</button>
      <button id="saveDetailBtn" class="btn-save">Save Changes</button>
    </div>
  </div>

  <footer class="footer">
    <button id="openFullAppFooter" class="btn-sync" title="Sync with Google Tasks & Calendar via Web Dashboard">Sync Google Tasks ↗</button>
    <button id="openSidePanelBtn">Side Panel</button>
  </footer>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupCss = `/* Chronotask extension — editorial theme.
   Mirrors the web app tokens (paper / ink / line / accent) so the popup, the
   side panel and the dashboard read as one product. No gradients, no floating
   cards: hairlines, one accent, and small mono labels. */

:root {
  color-scheme: light;
  --paper: #f7f6f2;
  --surface: #ffffff;
  --subtle: #efeee8;
  --ink: #17191a;
  --ink-2: #5b5f61;
  --ink-3: #6d7172;
  --line: #e3e1d9;
  --line-strong: #cbc8bd;
  --accent: #1e4fd8;
  --accent-ink: #ffffff;
  --accent-soft: #edf1fe;
  --danger: #b42318;
  --danger-soft: #fdf1ef;
  --warn: #b54708;
  --ok: #067647;
  --font-ui: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Newsreader', 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --paper: #101112;
    --surface: #181a1b;
    --subtle: #202324;
    --ink: #f1f0ea;
    --ink-2: #a7aaa9;
    --ink-3: #8b8f8e;
    --line: #2a2d2e;
    --line-strong: #3d4142;
    --accent: #7ca0ff;
    --accent-ink: #0b1020;
    --accent-soft: #1a2338;
    --danger: #ff8a80;
    --danger-soft: #2a1615;
    --warn: #f5b26b;
    --ok: #6fd3a3;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 580px;
  max-width: 100vw;
  height: 600px;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

body.sidepanel-view {
  width: 100%;
  max-width: 100%;
  height: 100vh;
  max-height: 100vh;
}

button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
.hidden { display: none !important; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
::selection { background: var(--accent); color: var(--accent-ink); }

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--ink-3) 30%, transparent);
  border: 2px solid transparent;
  background-clip: content-box;
  border-radius: 999px;
}

/* Header ---------------------------------------------------------------- */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.logo svg { align-self: center; color: var(--ink); flex: 0 0 auto; }
.logo small {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.actions { display: flex; align-items: center; gap: 8px; }

/* Sync state ------------------------------------------------------------ */
.sync {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.sync-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-strong);
}
.sync.is-online .sync-dot { background: var(--ok); }
.sync.is-offline .sync-dot { background: var(--warn); }
.sync.is-local .sync-dot { background: var(--line-strong); }
.actions button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-2);
  transition: color 0.14s ease, border-color 0.14s ease, background 0.14s ease;
}
.actions button:hover { color: var(--ink); border-color: var(--line-strong); background: var(--subtle); }

/* Quick add ------------------------------------------------------------- */
.quick-add {
  padding: 10px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.quick-add input[type="text"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink);
  font-size: 13px;
  outline: none;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}
.quick-add input[type="text"]::placeholder { color: var(--ink-3); }
.quick-add input[type="text"]:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.quick-add-bar { display: flex; gap: 6px; margin-top: 6px; }

.mini-select {
  max-width: 132px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  outline: none;
}
.mini-select:focus-visible { border-color: var(--accent); }

.btn-quick-add {
  margin-left: auto;
  padding: 4px 10px;
  border: 1px solid var(--ink);
  border-radius: 4px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease, opacity 0.14s ease;
}
.btn-quick-add:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}
.btn-quick-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Filters --------------------------------------------------------------- */
.filter-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.filter-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
}
.tab {
  padding: 4px 10px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--ink-2);
  font-size: 11px;
  font-weight: 600;
  transition: color 0.14s ease, background 0.14s ease;
}
.tab:hover { color: var(--ink); }
.tab.active { background: var(--ink); color: var(--paper); }

.filter-right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.filter-right .mini-select { max-width: 160px; }

.sort-btn, .copy-folder-btn {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transition: color 0.14s ease, border-color 0.14s ease;
}
.sort-btn:hover, .copy-folder-btn:hover { color: var(--ink); border-color: var(--line-strong); }

/* Task list ------------------------------------------------------------- */
.task-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 2px 14px 10px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.12s ease;
}
.task-item:last-child { border-bottom: 0; }
.task-item:hover { background: color-mix(in srgb, var(--subtle) 55%, transparent); }
.task-item.completed { opacity: 0.68; }
.task-item.completed .task-title {
  color: var(--ink-3);
  text-decoration: line-through;
  text-decoration-color: var(--line-strong);
}

.task-check {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  margin: -5px -6px -5px -5px;
  cursor: pointer;
}

.task-checkbox {
  appearance: none;
  -webkit-appearance: none;
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  margin-top: 2px;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  background: var(--surface);
  cursor: pointer;
  position: relative;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.task-checkbox:hover { border-color: var(--ink-3); }
.task-checkbox:checked { background: var(--accent); border-color: var(--accent); }
.task-checkbox:checked::after {
  content: "";
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-6' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
}

.task-content { flex: 1; min-width: 0; }

.task-title {
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.folder-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 5px;
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  vertical-align: 1px;
}
.folder-badge::before {
  content: "";
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.folder-badge.folder-urgent { color: var(--danger); }
.folder-badge.folder-work { color: var(--ink-2); }

.task-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 6px;
  margin-top: 3px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.priority-tag { font-weight: 700; letter-spacing: 0.06em; }
.priority-urgent, .priority-high { color: var(--danger); }
.priority-medium { color: var(--accent); }
.priority-low { color: var(--ink-3); }

.task-copy {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.task-item:hover .task-copy, .task-copy:focus-visible { opacity: 1; }
.task-copy:hover { color: var(--ink); border-color: var(--line); background: var(--surface); }

.empty-state {
  padding: 34px 18px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
  text-align: center;
}

/* Footer ---------------------------------------------------------------- */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 14px;
  background: var(--paper);
  border-top: 1px solid var(--line);
}
.footer button {
  padding: 5px 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: color 0.14s ease, border-color 0.14s ease;
}
.footer button:hover { color: var(--ink); border-color: var(--line-strong); }
.footer .btn-sync {
  padding-left: 0;
  border-color: transparent;
  background: transparent;
  color: var(--accent);
}
.footer .btn-sync:hover { color: var(--ink); }

/* Detail drawer --------------------------------------------------------- */
.detail-drawer {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: var(--paper);
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.detail-title-label {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.icon-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 12px;
  line-height: 1;
}
.icon-btn:hover { color: var(--ink); border-color: var(--line-strong); }

.detail-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px 16px;
  background: var(--paper);
}
.form-label {
  margin-top: 10px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.form-label:first-child { margin-top: 0; }

.form-input {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 12px;
  outline: none;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}
.form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
textarea.form-input { min-height: 66px; resize: vertical; }

.priority-chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.chip {
  padding: 6px 4px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: center;
  transition: color 0.14s ease, border-color 0.14s ease;
}
.chip:hover { color: var(--ink); border-color: var(--line-strong); }
.chip.selected { background: var(--ink); border-color: var(--ink); color: var(--paper); font-weight: 600; }
.chip.selected[data-p="urgent"] { background: var(--danger); border-color: var(--danger); color: #fff; }

.detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid var(--line);
  background: var(--paper);
}
.btn-delete {
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--danger);
  font-size: 11.5px;
  font-weight: 600;
}
.btn-delete:hover { background: var(--danger-soft); }
.btn-save {
  padding: 7px 14px;
  border: 1px solid var(--ink);
  border-radius: 4px;
  background: var(--ink);
  color: var(--paper);
  font-size: 11.5px;
  font-weight: 600;
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}
.btn-save:hover { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

/* Narrow surfaces: Chrome's 200% zoom halves the popup to ~190 CSS px. */
@media (max-width: 260px) {
  .logo small { display: none; }
  #syncLabel { display: none; }
  .quick-add-bar { flex-wrap: wrap; }
  .quick-add-bar .mini-select { flex: 1 1 90px; max-width: none; min-width: 0; }
  .btn-quick-add { width: 100%; margin-left: 0; }
  .filter-right { flex-wrap: wrap; }
  .filter-right .mini-select { flex: 1 1 100%; }
  .footer { flex-wrap: wrap; }
  .task-copy { display: none; }
  .task-item { gap: 8px; }
  .priority-chips { grid-template-columns: repeat(2, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.001ms !important; }
}`

  const popupJs = `// Chronotask Extension Popup Logic v1.3.2
let currentFilter = 'today';
let selectedFolderId = 'all';
let prioritySortHighToLow = true;
let editingTaskId = null;

const PRIORITY_WEIGHT = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const DEFAULT_FOLDERS = [
  { id: 'default_my_tasks', title: 'General', color: '#1e4fd8' },
  { id: 'default_work', title: 'Work & Projects', color: '#059669' },
  { id: 'default_personal', title: 'Personal', color: '#7c3aed' },
  { id: 'default_urgent', title: 'Urgent & Critical', color: '#e11d48' },
];

function isChronotaskTab(tab) {
  if (!tab || !tab.url) return false;
  try {
    const parsed = new URL(tab.url);
    return parsed.origin === 'https://task-manager-with-google.vercel.app';
  } catch (e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderFolderDropdowns();
  await renderTasks();
  await updateSyncStatus();

  // On popup open, immediately trigger a sync check with any open Chronotask tab
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({}, (tabs) => {
      const matchTab = tabs.find(isChronotaskTab);
      if (matchTab && matchTab.id) {
        chrome.tabs.sendMessage(matchTab.id, { type: 'TRIGGER_PAGE_SYNC' }, () => {});
      }
    });
  }

  // Periodic automatic sync check while popup is open
  setInterval(async () => {
    await renderTasks();
    await updateSyncStatus();
  }, 2500);

  // Listen for real-time changes synced from Vercel Web App
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.chronotask_lists_v1) {
          renderFolderDropdowns();
        }
        if (changes.chronotask_tasks_v1 || changes.chronotask_lists_v1) {
          renderTasks();
        }
        if (changes.chronotask_last_synced || changes.chronotask_user) {
          updateSyncStatus();
        }
      }
    });
  }

  const taskInput = document.getElementById('quickTaskInput');
  const quickAddBtn = document.getElementById('quickAddBtn');

  const submitQuickTask = async () => {
    if (!taskInput) return;
    const title = taskInput.value.trim();
    if (!title) return;
    const folderEl = document.getElementById('quickFolderSelect');
    const folder = folderEl ? folderEl.value : 'default_my_tasks';
    const priorityEl = document.getElementById('quickPrioritySelect');
    const priority = priorityEl ? priorityEl.value : 'medium';
    await addTask(title, folder, priority);
    taskInput.value = '';
    renderTasks();
    taskInput.focus();
  };

  if (taskInput) {
    taskInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await submitQuickTask();
      }
    });
  }

  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', async () => {
      await submitQuickTask();
    });
  }

  // Folder creation on quickFolderSelect
  const quickFolderEl = document.getElementById('quickFolderSelect');
  if (quickFolderEl) {
    quickFolderEl.addEventListener('change', async (e) => {
      if (e.target.value === '__NEW_FOLDER__') {
        const createdId = await promptCreateFolder();
        if (createdId) {
          quickFolderEl.value = createdId;
        } else {
          quickFolderEl.value = 'default_my_tasks';
        }
      }
    });
  }

  // Folder creation on editTaskFolder
  const editFolderEl = document.getElementById('editTaskFolder');
  if (editFolderEl) {
    editFolderEl.addEventListener('change', async (e) => {
      if (e.target.value === '__NEW_FOLDER__') {
        const createdId = await promptCreateFolder();
        if (createdId) {
          editFolderEl.value = createdId;
        } else {
          editFolderEl.value = 'default_my_tasks';
        }
      }
    });
  }

  // Folder filter toolbar
  const folderFilterEl = document.getElementById('folderFilterSelect');
  if (folderFilterEl) {
    folderFilterEl.addEventListener('change', (e) => {
      selectedFolderId = e.target.value;
      renderTasks();
    });
  }

  const copyFolderBtn = document.getElementById('copyFolderBtn');
  if (copyFolderBtn) {
    copyFolderBtn.addEventListener('click', copyCurrentFolderTasks);
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      currentFilter = tab.dataset.filter || 'today';
      renderTasks();
    });
  });

  // Sort toggle
  const sortToggleBtn = document.getElementById('sortToggleBtn');
  if (sortToggleBtn) {
    sortToggleBtn.addEventListener('click', () => {
      prioritySortHighToLow = !prioritySortHighToLow;
      sortToggleBtn.textContent = prioritySortHighToLow ? '↓ Priority' : '↑ Priority';
      renderTasks();
    });
  }

  const openFullApp = document.getElementById('openFullApp');
  if (openFullApp) {
    openFullApp.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: 'https://task-manager-with-google.vercel.app' });
      } else {
        window.open('https://task-manager-with-google.vercel.app', '_blank');
      }
    });
  }

  const footerSync = document.getElementById('openFullAppFooter');
  if (footerSync) {
    footerSync.addEventListener('click', async () => {
      footerSync.textContent = 'Syncing...';
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({}, (tabs) => {
          const matchTab = tabs.find(isChronotaskTab);
          if (matchTab && matchTab.id) {
            chrome.tabs.sendMessage(matchTab.id, { type: 'TRIGGER_PAGE_SYNC' }, () => {});
            chrome.tabs.update(matchTab.id, { active: true });
          } else {
            chrome.tabs.create({ url: 'https://task-manager-with-google.vercel.app' });
          }
        });
      } else {
        window.open('https://task-manager-with-google.vercel.app', '_blank');
      }

      setTimeout(async () => {
        await renderFolderDropdowns();
        await renderTasks();
        await updateSyncStatus();
      }, 500);
    });
  }

  const sidePanelBtn = document.getElementById('openSidePanelBtn');
  if (sidePanelBtn) {
    sidePanelBtn.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.sidePanel.open({ tabId: tab.id });
        }
      }
    });
  }

  // Drawer handlers
  const closeDetailBtn = document.getElementById('closeDetailBtn');
  if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailDrawer);

  const saveDetailBtn = document.getElementById('saveDetailBtn');
  if (saveDetailBtn) saveDetailBtn.addEventListener('click', saveTaskDetail);

  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  if (deleteTaskBtn) deleteTaskBtn.addEventListener('click', deleteTask);

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  // Keyboard: "/" focuses capture, Esc closes the drawer, Cmd/Ctrl+Enter saves.
  document.addEventListener('keydown', (e) => {
    const drawer = document.getElementById('detailDrawer');
    const drawerOpen = drawer && !drawer.classList.contains('hidden');

    if (e.key === 'Escape' && drawerOpen) {
      e.preventDefault();
      closeDetailDrawer();
      return;
    }
    if (drawerOpen && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveTaskDetail();
      return;
    }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const active = document.activeElement;
      const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
      if (!typing) {
        e.preventDefault();
        const input = document.getElementById('quickTaskInput');
        if (input) input.focus();
      }
    }
  });

  window.addEventListener('online', updateSyncStatus);
  window.addEventListener('offline', updateSyncStatus);
});

async function getStoredLists() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(['chronotask_lists_v1']);
    if (result.chronotask_lists_v1) {
      try {
        const parsed = JSON.parse(result.chronotask_lists_v1);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          DEFAULT_FOLDERS.forEach(df => map.set(df.id, df));
          parsed.forEach(p => map.set(p.id, { ...map.get(p.id), ...p }));
          return Array.from(map.values());
        }
      } catch (e) {}
    }
  }
  return DEFAULT_FOLDERS;
}

async function saveStoredLists(lists) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ 'chronotask_lists_v1': JSON.stringify(lists) });
  }
}

async function promptCreateFolder() {
  const name = window.prompt('Enter new folder name:');
  if (!name || !name.trim()) return null;
  const safeName = name.trim().slice(0, 100);
  const lists = await getStoredLists();
  const newFolder = {
    id: 'folder_' + Date.now(),
    title: safeName,
    color: '#1e4fd8'
  };
  lists.push(newFolder);
  await saveStoredLists(lists);
  await renderFolderDropdowns();
  return newFolder.id;
}

async function renderFolderDropdowns() {
  const lists = await getStoredLists();

  // 1. Quick folder select
  const quickSelect = document.getElementById('quickFolderSelect');
  if (quickSelect) {
    const currentVal = quickSelect.value || 'default_my_tasks';
    quickSelect.innerHTML = lists.map(l => '<option value="' + escapeHtml(l.id) + '">' + escapeHtml(l.title) + '</option>').join('') +
      '<option value="__NEW_FOLDER__">➕ New Folder...</option>';
    if (lists.some(l => l.id === currentVal)) {
      quickSelect.value = currentVal;
    } else {
      quickSelect.value = lists[0] ? lists[0].id : 'default_my_tasks';
    }
  }

  // 2. Edit folder select in task drawer
  const editSelect = document.getElementById('editTaskFolder');
  if (editSelect) {
    const currentVal = editSelect.value;
    editSelect.innerHTML = lists.map(l => '<option value="' + escapeHtml(l.id) + '">' + escapeHtml(l.title) + '</option>').join('') +
      '<option value="__NEW_FOLDER__">➕ New Folder...</option>';
    if (currentVal && lists.some(l => l.id === currentVal)) {
      editSelect.value = currentVal;
    }
  }

  // 3. Filter folder select in toolbar
  const filterSelect = document.getElementById('folderFilterSelect');
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">All folders</option>' +
      lists.map(l => '<option value="' + escapeHtml(l.id) + '">' + escapeHtml(l.title) + '</option>').join('');
    if (selectedFolderId === 'all' || lists.some(l => l.id === selectedFolderId)) {
      filterSelect.value = selectedFolderId;
    } else {
      selectedFolderId = 'all';
      filterSelect.value = 'all';
    }
  }
}

async function getStoredTasks() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const result = await chrome.storage.local.get(['chronotask_tasks_v1']);
    const raw = result.chronotask_tasks_v1 ? JSON.parse(result.chronotask_tasks_v1) : [];
    return raw.map(t => ({
      ...t,
      priority: t.priority || 'medium',
      folderId: t.folderId || t.listId || 'default_my_tasks',
    }));
  }
  return [];
}

async function saveStoredTasks(tasks) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ 'chronotask_tasks_v1': JSON.stringify(tasks) });
  }
}

async function addTask(title, folderId, priority) {
  const tasks = await getStoredTasks();
  const cleanTitle = (title || '').trim().slice(0, 500);
  if (!cleanTitle) return;
  const cleanFolder = (folderId || 'default_my_tasks').slice(0, 128);
  const cleanPriority = sanitizePriority(priority);
  const newTask = {
    id: 't_' + Date.now(),
    title: cleanTitle,
    listId: cleanFolder,
    folderId: cleanFolder,
    completed: false,
    priority: cleanPriority,
    due: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only'
  };
  tasks.unshift(newTask);
  await saveStoredTasks(tasks);
}

async function toggleTask(id) {
  const tasks = await getStoredTasks();
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    task.updatedAt = new Date().toISOString();
    await saveStoredTasks(tasks);
    renderTasks();
  }
}

function openDetailDrawer(task) {
  const drawer = document.getElementById('detailDrawer');
  if (!drawer) return;
  editingTaskId = task.id;

  const titleEl = document.getElementById('editTaskTitle');
  if (titleEl) titleEl.value = task.title || '';

  const folderEl = document.getElementById('editTaskFolder');
  if (folderEl) folderEl.value = task.folderId || task.listId || 'default_my_tasks';

  const dueEl = document.getElementById('editTaskDue');
  if (dueEl) dueEl.value = task.due || '';

  const notesEl = document.getElementById('editTaskNotes');
  if (notesEl) notesEl.value = task.notes || '';

  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('selected', c.dataset.p === (task.priority || 'medium'));
  });

  drawer.classList.remove('hidden');
  const focusTarget = document.getElementById('editTaskTitle');
  if (focusTarget) focusTarget.focus();
}

function closeDetailDrawer() {
  const drawer = document.getElementById('detailDrawer');
  if (drawer) drawer.classList.add('hidden');
  editingTaskId = null;
  const quick = document.getElementById('quickTaskInput');
  if (quick) quick.focus();
}

async function saveTaskDetail() {
  if (!editingTaskId) return;
  const tasks = await getStoredTasks();
  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    const titleEl = document.getElementById('editTaskTitle');
    const title = titleEl ? titleEl.value.trim().slice(0, 500) : '';
    if (!title) return;

    const selectedChip = document.querySelector('.chip.selected');
    const rawPriority = selectedChip && selectedChip.dataset.p ? selectedChip.dataset.p : 'medium';
    const priority = sanitizePriority(rawPriority);

    const folderEl = document.getElementById('editTaskFolder');
    if (folderEl) {
      task.folderId = (folderEl.value || 'default_my_tasks').slice(0, 128);
      task.listId = task.folderId;
    }

    const dueEl = document.getElementById('editTaskDue');
    const rawDue = dueEl && dueEl.value ? dueEl.value : '';
    task.due = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(rawDue) ? rawDue : undefined;

    const notesEl = document.getElementById('editTaskNotes');
    task.notes = notesEl && notesEl.value.trim() ? notesEl.value.trim().slice(0, 2000) : undefined;

    task.title = title;
    task.priority = priority;
    task.updatedAt = new Date().toISOString();

    await saveStoredTasks(tasks);
    closeDetailDrawer();
    renderTasks();
  }
}

async function deleteTask() {
  if (!editingTaskId) return;
  let tasks = await getStoredTasks();
  tasks = tasks.filter(t => t.id !== editingTaskId);
  await saveStoredTasks(tasks);
  closeDetailDrawer();
  renderTasks();
}

async function copyText(text, feedbackButton) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (feedbackButton) {
      const original = feedbackButton.textContent;
      feedbackButton.textContent = 'Copied!';
      setTimeout(() => { feedbackButton.textContent = original; }, 1400);
    }
  } catch (e) {
    console.warn('Copy failed:', e);
  }
}

function formatTaskForCopy(task, listMap) {
  const folder = listMap.get(task.folderId || task.listId || 'default_my_tasks');
  const details = [
    task.completed ? 'Completed' : 'Open',
    (task.priority || 'medium') + ' priority',
    task.due ? 'Due ' + task.due + (task.dueTime ? ' at ' + task.dueTime : '') : '',
    folder ? 'Folder: ' + folder.title : ''
  ].filter(Boolean);
  return [task.title || 'Untitled task', details.join(' · '), task.notes || ''].filter(Boolean).join('\\n');
}

async function copyTaskById(taskId, button) {
  const [tasks, lists] = await Promise.all([getStoredTasks(), getStoredLists()]);
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const listMap = new Map();
  lists.forEach(list => listMap.set(list.id, list));
  await copyText(formatTaskForCopy(task, listMap), button);
}

async function copyCurrentFolderTasks() {
  const [tasks, lists] = await Promise.all([getStoredTasks(), getStoredLists()]);
  const listMap = new Map();
  lists.forEach(list => listMap.set(list.id, list));
  const selectedTasks = selectedFolderId === 'all'
    ? tasks
    : tasks.filter(task => (task.folderId || task.listId || 'default_my_tasks') === selectedFolderId);
  const folderTitle = selectedFolderId === 'all'
    ? 'All Tasks'
    : (listMap.get(selectedFolderId) || {}).title || 'Folder Tasks';
  const text = [
    folderTitle + ' — ' + selectedTasks.length + ' task' + (selectedTasks.length === 1 ? '' : 's'),
    '',
    ...selectedTasks.map((task, index) => (index + 1) + '. ' + formatTaskForCopy(task, listMap))
  ].join('\\n\\n');
  await copyText(text, document.getElementById('copyFolderBtn'));
}

async function renderTasks() {
  const container = document.getElementById('taskList');
  if (!container) return;

  const [tasks, lists] = await Promise.all([getStoredTasks(), getStoredLists()]);
  const listMap = new Map();
  lists.forEach(l => listMap.set(l.id, l));

  const today = new Date().toISOString().split('T')[0];

  let filtered = tasks;
  if (currentFilter === 'today') {
    filtered = tasks.filter(t => t.due === today || (!t.completed && (!t.due || t.due <= today)));
  } else if (currentFilter === 'upcoming') {
    filtered = tasks.filter(t => t.due && t.due > today && !t.completed);
  }

  // Filter by selected folder if not 'all'
  if (selectedFolderId !== 'all') {
    filtered = filtered.filter(t => (t.folderId || t.listId || 'default_my_tasks') === selectedFolderId);
  }

  // Priority Sorting (High to Low)
  filtered.sort((a, b) => {
    const wa = PRIORITY_WEIGHT[a.priority] || 2;
    const wb = PRIORITY_WEIGHT[b.priority] || 2;
    if (prioritySortHighToLow) {
      if (wb !== wa) return wb - wa;
    } else {
      if (wa !== wb) return wa - wb;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No tasks in this view. Press Enter above to add one.</div>';
    return;
  }

  container.innerHTML = filtered.map(t => {
    const fId = t.folderId || t.listId || 'default_my_tasks';
    const folder = listMap.get(fId);
    const folderTitle = folder ? folder.title : 'General';
    let folderStyle = '';
    let extraCls = '';
    if (fId === 'default_urgent') extraCls = 'folder-urgent';
    else if (fId === 'default_work') extraCls = 'folder-work';
    else if (folder && isValidHexColor(folder.color)) {
      folderStyle = 'border-color: ' + folder.color + '40; color: ' + folder.color + ';';
    }

    const safeTaskId = escapeHtml(t.id || '');
    const safeTitle = escapeHtml(t.title || '');
    const safeLabel = escapeHtml(t.title || 'Untitled task');
    const folderBadge = selectedFolderId === 'all'
      ? '<span class="folder-badge ' + extraCls + '" style="' + folderStyle + '">' + escapeHtml(folderTitle) + '</span> '
      : '';
    const isCompleted = Boolean(t.completed);
    const pTag = sanitizePriority(t.priority);
    const dueLabel = t.due ? (t.due === today ? 'Today' : escapeHtml(t.due)) : '';
    const dueSpan = dueLabel ? '<span>· ' + dueLabel + '</span>' : '';
    const noteSpan = t.notes ? '<span>· Note</span>' : '';

    return '<div class="task-item ' + (isCompleted ? 'completed' : '') + '" data-id="' + safeTaskId + '">' +
      '<label class="task-check"><input type="checkbox" class="task-checkbox" ' + (isCompleted ? 'checked' : '') + ' aria-label="Complete ' + safeLabel + '"></label>' +
      '<div class="task-content">' +
        '<div class="task-title">' +
          folderBadge +
          safeTitle +
        '</div>' +
        '<div class="task-meta">' +
          '<span class="priority-tag priority-' + pTag + '">' + pTag + '</span>' +
          dueSpan +
          noteSpan +
        '</div>' +
      '</div>' +
      '<button type="button" class="task-copy" data-id="' + safeTaskId + '" title="Copy task" aria-label="Copy task">⧉</button>' +
    '</div>';
  }).join('');

  container.querySelectorAll('.task-check').forEach(label => {
    label.addEventListener('click', (e) => e.stopPropagation());
  });

  container.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = e.target.closest('.task-item');
      if (parent && parent.dataset.id) {
        toggleTask(parent.dataset.id);
      }
    });
  });

  container.querySelectorAll('.task-copy').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      copyTaskById(button.dataset.id, button);
    });
  });

  // Click on task opens detail edit drawer
  container.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('task-checkbox') || e.target.classList.contains('task-copy')) return;
      const taskId = item.dataset.id;
      const targetTask = tasks.find(t => t.id === taskId);
      if (targetTask) {
        openDetailDrawer(targetTask);
      }
    });
  });
}

function isValidHexColor(color) {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
}

function sanitizePriority(priority) {
  const allowed = ['urgent', 'high', 'medium', 'low'];
  return allowed.indexOf(priority) >= 0 ? priority : 'medium';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function updateSyncStatus() {
  const statusEl = document.getElementById('syncStatus');
  const labelEl = document.getElementById('syncLabel');
  const footerSync = document.getElementById('openFullAppFooter');

  function setState(state, text, title) {
    if (statusEl) {
      statusEl.classList.remove('is-online', 'is-offline', 'is-local');
      statusEl.classList.add('is-' + state);
      if (title) statusEl.title = title;
    }
    if (labelEl) labelEl.textContent = text;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setState('offline', 'Offline', 'This browser has no network connection');
    if (footerSync) footerSync.textContent = 'Sync Google Tasks ↗';
    return;
  }

  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      setState('local', 'Local only', 'Extension storage is unavailable');
      if (footerSync) footerSync.textContent = 'Sync Google Tasks ↗';
      return;
    }
    const data = await chrome.storage.local.get(['chronotask_last_synced', 'chronotask_user']);
    let user = null;
    try { user = data.chronotask_user ? JSON.parse(data.chronotask_user) : null; } catch (e) {}

    if (!data.chronotask_last_synced) {
      setState('local', 'Local only', 'Not connected to the web app yet. Use Sync Google Tasks.');
      if (footerSync) footerSync.textContent = 'Sync Google Tasks ↗';
      return;
    }

    const when = new Date(data.chronotask_last_synced);
    const minutes = Math.max(0, Math.floor((Date.now() - when.getTime()) / 60000));
    const relative = minutes < 1 ? 'just now' : minutes < 60 ? minutes + 'm ago' : Math.floor(minutes / 60) + 'h ago';
    const timeStr = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const stale = minutes > 60 * 24;
    const who = user && user.email ? 'Connected: ' + user.email + ' · ' : '';
    setState(
      stale ? 'offline' : 'online',
      stale ? 'Stale' : 'Synced ' + relative,
      who + 'Last sync ' + timeStr
    );
    if (footerSync) {
      footerSync.textContent = '✓ Synced ' + timeStr + ' ↗';
      footerSync.title = who + 'Synced with the web app at ' + timeStr;
    }
  } catch (e) {
    setState('local', 'Local only', 'Sync status unavailable');
    if (footerSync) footerSync.textContent = 'Sync Google Tasks ↗';
  }
}
`;

  const contentJs = `// Chronotask Extension Sync Bridge v1.3.2
// Synchronizes tasks and folders bidirectionally between Chronotask Web App and chrome.storage.local

(function() {
  // Prevent execution inside embedded or third-party iframes
  if (window !== window.top) return;

  // Only run on the official verified Chronotask web application
  const ALLOWED_ORIGINS = [
    'https://task-manager-with-google.vercel.app'
  ];
  if (ALLOWED_ORIGINS.indexOf(window.location.origin) < 0) return;

  console.log('[Chronotask Bridge] Initialized on ' + window.location.href);
  const appOrigin = window.location.origin;

  // Tokens are intentionally kept in the web app only. Remove values written by
  // older exports so upgrading the extension also clears the stale credential.
  chrome.storage.local.remove(['chronotask_access_token']);

  const PRIORITIES = ['urgent', 'high', 'medium', 'low'];

  function text(value, max) {
    return typeof value === 'string' ? value.slice(0, max) : '';
  }

  function sanitizeTask(task, index) {
    if (!task || typeof task !== 'object') return null;
    const clean = Object.assign({}, task);
    clean.id = text(task.id, 128) || 'task_' + index;
    clean.title = text(task.title, 500);
    clean.notes = typeof task.notes === 'string' ? task.notes.slice(0, 2000) : undefined;
    clean.completed = Boolean(task.completed);
    clean.priority = PRIORITIES.indexOf(task.priority) >= 0 ? task.priority : 'medium';
    clean.due = typeof task.due === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ].*)?$/.test(task.due)
      ? task.due.slice(0, 40)
      : undefined;
    if (typeof task.folderId === 'string') clean.folderId = task.folderId.slice(0, 128);
    if (typeof task.listId === 'string') clean.listId = task.listId.slice(0, 128);
    return clean;
  }

  function sanitizeList(list, index) {
    if (!list || typeof list !== 'object') return null;
    const clean = Object.assign({}, list);
    clean.id = text(list.id, 128) || 'list_' + index;
    clean.title = text(list.title, 200);
    if (typeof list.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(list.color)) {
      clean.color = list.color;
    } else {
      delete clean.color;
    }
    return clean;
  }

  // Send extension's stored tasks and folders to web app
  function sendExtensionStateToWeb() {
    try {
      chrome.storage.local.get(['chronotask_tasks_v1', 'chronotask_lists_v1', 'chronotask_last_synced'], (res) => {
        if (chrome.runtime.lastError) return;
        const tasks = res.chronotask_tasks_v1 ? JSON.parse(res.chronotask_tasks_v1) : [];
        const lists = res.chronotask_lists_v1 ? JSON.parse(res.chronotask_lists_v1) : [];
        window.postMessage({
          type: 'CHRONOTASK_SYNC_FROM_EXTENSION',
          source: 'chronotask-extension',
          tasks,
          lists,
          lastSynced: res.chronotask_last_synced || null
        }, appOrigin);
      });
    } catch (e) {
      console.warn('[Chronotask Bridge] Read storage error:', e);
    }
  }

  // Request current state from web app
  function requestPageState() {
    window.postMessage({
      type: 'CHRONOTASK_PING_FOR_STATE',
      source: 'chronotask-extension'
    }, appOrigin);
  }

  // Trigger sync on start and at multiple lifecycle stages
  sendExtensionStateToWeb();
  requestPageState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      sendExtensionStateToWeb();
      requestPageState();
    });
  }
  window.addEventListener('load', () => {
    sendExtensionStateToWeb();
    requestPageState();
  });

  // Automated continuous periodic sync every 3 seconds while web app is open
  setInterval(() => {
    requestPageState();
  }, 3000);

  // Listen for messages from web app (App.tsx)
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== appOrigin) return;
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.source === 'chronotask-extension') return; // Ignore own messages

    if (event.data.type === 'CHRONOTASK_SYNC_TO_EXTENSION') {
      if (event.data.source !== 'chronotask-web-app') return;
      const updateData = {};
      if (Array.isArray(event.data.tasks)) {
        const tasks = event.data.tasks.slice(0, 1000).map(sanitizeTask).filter(Boolean);
        updateData['chronotask_tasks_v1'] = JSON.stringify(tasks);
      }
      if (Array.isArray(event.data.lists)) {
        const lists = event.data.lists.slice(0, 200).map(sanitizeList).filter(Boolean);
        updateData['chronotask_lists_v1'] = JSON.stringify(lists);
      }
      if (event.data.user && typeof event.data.user === 'object') {
        updateData['chronotask_user'] = JSON.stringify({
          email: text(event.data.user.email, 200),
          displayName: text(event.data.user.displayName, 200)
        });
      }
      if (typeof event.data.lastSynced === 'string' && !isNaN(Date.parse(event.data.lastSynced))) {
        updateData['chronotask_last_synced'] = event.data.lastSynced.slice(0, 40);
      }

      chrome.storage.local.set(updateData, () => {
        try {
          chrome.runtime.sendMessage({ type: 'SYNC_COMPLETED', count: tasks ? tasks.length : 0 }).catch(() => {});
        } catch (_) {}
      });
    }

    if (event.data.type === 'CHRONOTASK_REQUEST_EXTENSION_SYNC') {
      sendExtensionStateToWeb();
    }
  });

  // Watch for changes made within extension popup/sidepanel while web app is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.chronotask_tasks_v1 || changes.chronotask_lists_v1)) {
      sendExtensionStateToWeb();
    }
  });

  // Listen for direct sync triggers from extension popup
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request && request.type === 'TRIGGER_PAGE_SYNC') {
        sendExtensionStateToWeb();
        requestPageState();
        sendResponse({ status: 'ok' });
      }
    });
  }
})();
`;


  const sidepanelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chronotask Side Panel</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body class="sidepanel-view">
  <header class="header">
    <div class="logo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>Chronotask <small>Side panel</small></span>
    </div>
    <div class="actions">
      <div class="sync" id="syncStatus" role="status" aria-live="polite" title="Sync status">
        <span class="sync-dot" aria-hidden="true"></span>
        <span id="syncLabel">Local only</span>
      </div>
      <button id="openFullApp" title="Open Full Dashboard" aria-label="Open full dashboard">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
    </div>
  </header>

  <section class="quick-add">
    <input type="text" id="quickTaskInput" placeholder="Add a task… (or press Enter)" aria-label="New task title" autofocus>
    <div class="quick-add-bar">
      <select id="quickFolderSelect" class="mini-select" aria-label="Folder">
        <option value="default_my_tasks">General</option>
        <option value="default_work">Work & Projects</option>
        <option value="default_personal">Personal</option>
        <option value="default_urgent">Urgent & Critical</option>
      </select>
      <select id="quickPrioritySelect" class="mini-select" aria-label="Priority">
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium" selected>Medium</option>
        <option value="low">Low</option>
      </select>
      <button id="quickAddBtn" class="btn-quick-add" type="button" aria-label="Add task">+ Add Task</button>
    </div>
  </section>

  <div class="filter-controls">
    <div class="filter-tabs">
      <button class="tab active" data-filter="today" aria-pressed="true">Today</button>
      <button class="tab" data-filter="all" aria-pressed="false">All</button>
      <button class="tab" data-filter="upcoming" aria-pressed="false">Upcoming</button>
    </div>
    <div class="filter-right">
      <select id="folderFilterSelect" class="mini-select" title="Filter by folder" aria-label="Filter by folder">
        <option value="all">All folders</option>
      </select>
      <button id="sortToggleBtn" class="sort-btn" title="Toggle priority order" aria-label="Toggle priority order">
        ↓ Priority
      </button>
    </div>
  </div>

  <main id="taskList" class="task-list" aria-label="Tasks">
  </main>

  <!-- Inline Task Detail & Edit Drawer -->
  <div id="detailDrawer" class="detail-drawer hidden" role="dialog" aria-modal="true" aria-labelledby="detailTitleLabel">
    <div class="detail-header">
      <span class="detail-title-label" id="detailTitleLabel">Task details</span>
      <button id="closeDetailBtn" class="icon-btn" aria-label="Close task details">✕</button>
    </div>
    <div class="detail-body">
      <label class="form-label" for="editTaskTitle">Task title</label>
      <input type="text" id="editTaskTitle" class="form-input">

      <span class="form-label" id="priorityLabel">Priority</span>
      <div class="priority-chips" role="group" aria-labelledby="priorityLabel">
        <button type="button" class="chip" data-p="urgent">Urgent</button>
        <button type="button" class="chip" data-p="high">High</button>
        <button type="button" class="chip" data-p="medium">Medium</button>
        <button type="button" class="chip" data-p="low">Low</button>
      </div>

      <label class="form-label" for="editTaskFolder">Folder</label>
      <select id="editTaskFolder" class="form-input">
        <option value="default_my_tasks">General</option>
        <option value="default_work">Work & Projects</option>
        <option value="default_personal">Personal</option>
        <option value="default_urgent">Urgent & Critical</option>
      </select>

      <label class="form-label" for="editTaskDue">Due date</label>
      <input type="date" id="editTaskDue" class="form-input">

      <label class="form-label" for="editTaskNotes">Notes</label>
      <textarea id="editTaskNotes" rows="3" class="form-input" placeholder="Add notes..."></textarea>
    </div>
    <div class="detail-footer">
      <button id="deleteTaskBtn" class="btn-delete">Delete</button>
      <button id="saveDetailBtn" class="btn-save">Save Changes</button>
    </div>
  </div>

  <footer class="footer">
    <button id="openFullAppFooter" class="btn-sync" title="Sync with Google Tasks & Calendar via Web Dashboard">Sync Google Tasks ↗</button>
  </footer>

  <script src="popup.js"></script>
</body>
</html>`;

  const readmeInstall = `# Chronotask Chrome Extension Installation Guide

Thank you for downloading Chronotask! This extension gives you instant quick-capture, side-panel productivity, Google Tasks synchronization, and Google Calendar time-blocking.

## 🚀 How to Load Unpacked in Google Chrome:

1. **Extract or Save the Files**:
   Ensure all files from this extension package are saved into a dedicated folder on your computer (e.g., \`Documents/chronotask-extension\`).
   
   Structure:
   - \`manifest.json\`
   - \`background.js\`
   - \`content.js\` (Real-Time Bidirectional Sync Bridge with https://task-manager-with-google.vercel.app)
   - \`popup.html\`
   - \`popup.css\`
   - \`popup.js\`
   - \`sidepanel.html\`
   - \`icons/\`

2. **Open Extensions Page in Chrome**:
   - In Google Chrome address bar, navigate to: \`chrome://extensions\`
   - Or click the three dots menu (⋮) -> **Extensions** -> **Manage Extensions**.

3. **Enable Developer Mode**:
   - In the top-right corner of the Extensions page, switch the **"Developer mode"** toggle to **ON**.

4. **Load the Extension**:
   - Click the **"Load unpacked"** button in the top-left toolbar.
   - Select your \`chronotask-extension\` folder.

5. **Pin to Toolbar**:
   - Click the puzzle icon (🧩) on your Chrome toolbar.
   - Find **Chronotask** and click the pin icon.

6. **Keyboard Shortcut**:
   - Press **\`Command+Shift+T\`** (Mac) or **\`Ctrl+Shift+T\`** (Windows/Linux) anytime to instantly toggle your tasks!
`;

  return [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      type: 'application/json',
      content: JSON.stringify(manifestJson, null, 2),
    },
    {
      name: 'background.js',
      path: 'background.js',
      type: 'text/javascript',
      content: backgroundJs,
    },
    {
      name: 'content.js',
      path: 'content.js',
      type: 'text/javascript',
      content: contentJs,
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      type: 'text/html',
      content: popupHtml,
    },
    {
      name: 'popup.css',
      path: 'popup.css',
      type: 'text/css',
      content: popupCss,
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      type: 'text/javascript',
      content: popupJs,
    },
    {
      name: 'sidepanel.html',
      path: 'sidepanel.html',
      type: 'text/html',
      content: sidepanelHtml,
    },
    {
      name: 'README_INSTALL.md',
      path: 'README_INSTALL.md',
      type: 'text/markdown',
      content: readmeInstall,
    },
  ];
};

export const exportExtensionAsZip = async (clientId?: string): Promise<void> => {
  const zip = new JSZip();
  const files = generateExtensionFiles(clientId);

  // Add all text/code files
  files.forEach((f) => {
    zip.file(f.path, f.content);
  });

  // Fetch or bundle privacy.html in root of ZIP
  try {
    const privacyResp = await fetch('/privacy.html');
    if (privacyResp.ok) {
      const privacyHtml = await privacyResp.text();
      zip.file('privacy.html', privacyHtml);
    }
  } catch (e) {
    // optional offline fallback
  }

  // Add generated icon PNG files in icons/ folder
  const iconSizes = [16, 48, 128];
  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    iconSizes.forEach((sz) => {
      const dataUrl = generateIconDataUrl(sz);
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      iconsFolder.file(`icon${sz}.png`, base64Data, { base64: true });
    });
  }

  // Generate zip blob and initiate download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chronotask-extension-v1.3.2.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
