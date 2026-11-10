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
    // Solid Cobalt Blue canvas
    ctx.fillStyle = '#2563eb';
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

    // Swiss Vermilion accent point
    ctx.fillStyle = '#e11d48';
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
    version: '1.2.0',
    description: 'Minimalist personal task manager with folders, priority sorting, offline access, side panel, and Google Tasks sync.',
    permissions: [
      'storage',
      'sidePanel'
    ],
    content_scripts: [
      {
        matches: [
          'https://task-manager-with-google.vercel.app/*',
          'https://*.vercel.app/*',
          'https://*.run.app/*',
          'http://localhost/*',
          'http://127.0.0.1/*'
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
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  };

  const backgroundJs = `// Chronotask Service Worker v1.2.0
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chronotask extension v1.2.0 installed successfully.');
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>Chronotask <small style="font-size:10px; color:#2563eb; font-family:monospace;">v1.2</small></span>
    </div>
    <div class="actions">
      <button id="openFullApp" title="Open Full Dashboard">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
    </div>
  </header>

  <section class="quick-add">
    <input type="text" id="quickTaskInput" placeholder="Add task... (Press Enter)" autofocus>
    <div class="quick-add-bar">
      <select id="quickFolderSelect" class="mini-select">
        <option value="default_my_tasks">📁 General</option>
        <option value="default_work">📁 Work & Projects</option>
        <option value="default_personal">📁 Personal</option>
        <option value="default_urgent">📁 Urgent & Critical</option>
      </select>
      <select id="quickPrioritySelect" class="mini-select">
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium" selected>Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  </section>

  <div class="filter-controls">
    <div class="filter-tabs">
      <button class="tab active" data-filter="today">Today</button>
      <button class="tab" data-filter="all">All</button>
      <button class="tab" data-filter="upcoming">Upcoming</button>
    </div>
    <div class="filter-right">
      <select id="folderFilterSelect" class="mini-select" title="Filter by folder">
        <option value="all">📁 All Folders</option>
      </select>
      <button id="sortToggleBtn" class="sort-btn" title="Toggle Priority High to Low">
        ↓ Priority
      </button>
    </div>
  </div>

  <main id="taskList" class="task-list">
    <!-- Tasks list rendered dynamically -->
  </main>

  <!-- Inline Task Detail & Edit Drawer -->
  <div id="detailDrawer" class="detail-drawer hidden">
    <div class="detail-header">
      <span class="detail-title-label">Task Details</span>
      <button id="closeDetailBtn" class="icon-btn">✕</button>
    </div>
    <div class="detail-body">
      <label class="form-label">Task Title</label>
      <input type="text" id="editTaskTitle" class="form-input">

      <label class="form-label">Priority (High to Low)</label>
      <div class="priority-chips">
        <button type="button" class="chip" data-p="urgent">Urgent</button>
        <button type="button" class="chip" data-p="high">High</button>
        <button type="button" class="chip" data-p="medium">Medium</button>
        <button type="button" class="chip" data-p="low">Low</button>
      </div>

      <label class="form-label">Folder / Type</label>
      <select id="editTaskFolder" class="form-input">
        <option value="default_my_tasks">📁 General</option>
        <option value="default_work">📁 Work & Projects</option>
        <option value="default_personal">📁 Personal</option>
        <option value="default_urgent">📁 Urgent & Critical</option>
      </select>

      <label class="form-label">Due Date</label>
      <input type="date" id="editTaskDue" class="form-input">

      <label class="form-label">Notes</label>
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

  const popupCss = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 380px;
  height: 520px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #fafaf9;
  color: #171717;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e5e5;
  background-color: #ffffff;
}
.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: -0.01em;
  color: #171717;
}
.actions button {
  background: transparent;
  border: none;
  color: #737373;
  cursor: pointer;
  padding: 4px;
}
.actions button:hover {
  color: #171717;
}
.quick-add {
  padding: 10px 14px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}
.quick-add input[type="text"] {
  width: 100%;
  padding: 7px 10px;
  border-radius: 4px;
  background: #fafaf9;
  border: 1px solid #e5e5e5;
  color: #171717;
  font-size: 13px;
  outline: none;
}
.quick-add input[type="text"]:focus {
  border-color: #2563eb;
}
.quick-add-bar {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.mini-select {
  font-size: 11px;
  padding: 3px 6px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #fafaf9;
  color: #404040;
  outline: none;
  cursor: pointer;
  max-width: 120px;
  text-overflow: ellipsis;
}
.filter-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px 4px 14px;
  gap: 8px;
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.filter-tabs {
  display: flex;
  gap: 4px;
}
.tab {
  background: transparent;
  border: none;
  color: #737373;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.tab.active {
  background: #2563eb;
  color: #ffffff;
}
.sort-btn {
  background: transparent;
  border: 1px solid #e5e5e5;
  color: #2563eb;
  font-size: 10px;
  font-family: monospace;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}
.sort-btn:hover {
  background: #eff6ff;
  border-color: #2563eb;
}
.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px 10px 14px;
  display: flex;
  flex-direction: column;
}
.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 4px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
  cursor: pointer;
}
.task-item:hover {
  background: #f5f5f4;
}
.task-item.completed {
  opacity: 0.4;
}
.task-item.completed .task-title {
  text-decoration: line-through;
  color: #737373;
}
.task-checkbox {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}
.task-content {
  flex: 1;
  min-width: 0;
}
.task-title {
  font-size: 13px;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-meta {
  font-size: 10px;
  color: #737373;
  font-family: monospace;
  margin-top: 2px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.priority-tag {
  font-weight: 700;
  text-transform: uppercase;
}
.priority-urgent { color: #e11d48; }
.priority-high { color: #e11d48; }
.priority-medium { color: #2563eb; }
.priority-low { color: #a3a3a3; }
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-top: 1px solid #e5e5e5;
  font-size: 11px;
  color: #737373;
  background: #ffffff;
}
.footer button {
  background: transparent;
  border: 1px solid #e5e5e5;
  color: #525252;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}
.footer button:hover {
  border-color: #171717;
  color: #171717;
}
.btn-sync {
  color: #2563eb !important;
  font-weight: 500;
}
.folder-badge {
  font-size: 9px;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid #e5e5e5;
  background: #f5f5f4;
  color: #525252;
  margin-right: 4px;
  display: inline-block;
}
.folder-badge.folder-urgent {
  background: #fef2f2;
  border-color: #fecdd3;
  color: #e11d48;
  font-weight: 600;
}
.folder-badge.folder-work {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
  font-weight: 600;
}

/* Detail Drawer */
.detail-drawer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
.detail-drawer.hidden { display: none; }
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e5e5;
  font-weight: 600;
  font-size: 13px;
}
.icon-btn {
  background: transparent;
  border: none;
  color: #737373;
  cursor: pointer;
  font-size: 14px;
}
.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-size: 10px;
  font-family: monospace;
  text-transform: uppercase;
  color: #737373;
  letter-spacing: 0.05em;
  margin-top: 4px;
}
.form-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  font-size: 12px;
  color: #171717;
  background: #fafaf9;
  outline: none;
}
.form-input:focus { border-color: #2563eb; }
.priority-chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.chip {
  padding: 4px 6px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #fafaf9;
  font-size: 10px;
  font-family: monospace;
  cursor: pointer;
  text-align: center;
}
.chip.selected[data-p="urgent"] { background: #e11d48; color: #fff; border-color: #e11d48; font-weight: 700; }
.chip.selected[data-p="high"] { background: #fef2f2; color: #e11d48; border-color: #e11d48; font-weight: 700; }
.chip.selected[data-p="medium"] { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 700; }
.chip.selected[data-p="low"] { background: #e5e5e5; color: #171717; border-color: #a3a3a3; font-weight: 700; }
.detail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid #e5e5e5;
}
.btn-delete {
  background: transparent;
  border: none;
  color: #e11d48;
  font-size: 11px;
  cursor: pointer;
}
.btn-save {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
`;

  const popupJs = `// Chronotask Extension Popup Logic v1.2.0
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
  { id: 'default_my_tasks', title: 'General', color: '#2563eb' },
  { id: 'default_work', title: 'Work & Projects', color: '#059669' },
  { id: 'default_personal', title: 'Personal', color: '#7c3aed' },
  { id: 'default_urgent', title: 'Urgent & Critical', color: '#e11d48' },
];

document.addEventListener('DOMContentLoaded', async () => {
  await renderFolderDropdowns();
  await renderTasks();
  await updateSyncStatus();

  // On popup open, immediately trigger a sync check with any open Chronotask tab
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({}, (tabs) => {
      const matchTab = tabs.find(t => t.url && (t.url.includes('vercel.app') || t.url.includes('run.app') || t.url.includes('localhost') || t.url.includes('127.0.0.1')));
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
  if (taskInput) {
    taskInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const title = e.target.value.trim();
        if (!title) return;
        const folderEl = document.getElementById('quickFolderSelect');
        const folder = folderEl ? folderEl.value : 'default_my_tasks';
        const priorityEl = document.getElementById('quickPrioritySelect');
        const priority = priorityEl ? priorityEl.value : 'medium';
        await addTask(title, folder, priority);
        e.target.value = '';
        renderTasks();
      }
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

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
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
          const matchTab = tabs.find(t => t.url && (t.url.includes('vercel.app') || t.url.includes('run.app') || t.url.includes('localhost') || t.url.includes('127.0.0.1')));
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
  const lists = await getStoredLists();
  const newFolder = {
    id: 'folder_' + Date.now(),
    title: name.trim(),
    color: '#2563eb'
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
    quickSelect.innerHTML = lists.map(l => '<option value="' + l.id + '">📁 ' + escapeHtml(l.title) + '</option>').join('') +
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
    editSelect.innerHTML = lists.map(l => '<option value="' + l.id + '">📁 ' + escapeHtml(l.title) + '</option>').join('') +
      '<option value="__NEW_FOLDER__">➕ New Folder...</option>';
    if (currentVal && lists.some(l => l.id === currentVal)) {
      editSelect.value = currentVal;
    }
  }

  // 3. Filter folder select in toolbar
  const filterSelect = document.getElementById('folderFilterSelect');
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="all">📁 All Folders</option>' +
      lists.map(l => '<option value="' + l.id + '">📁 ' + escapeHtml(l.title) + '</option>').join('');
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
  const newTask = {
    id: 't_' + Date.now(),
    title,
    listId: folderId || 'default_my_tasks',
    folderId: folderId || 'default_my_tasks',
    completed: false,
    priority: priority || 'medium',
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
}

function closeDetailDrawer() {
  const drawer = document.getElementById('detailDrawer');
  if (drawer) drawer.classList.add('hidden');
  editingTaskId = null;
}

async function saveTaskDetail() {
  if (!editingTaskId) return;
  const tasks = await getStoredTasks();
  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    const titleEl = document.getElementById('editTaskTitle');
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) return;

    const selectedChip = document.querySelector('.chip.selected');
    const priority = selectedChip && selectedChip.dataset.p ? selectedChip.dataset.p : 'medium';

    const folderEl = document.getElementById('editTaskFolder');
    if (folderEl) {
      task.folderId = folderEl.value;
      task.listId = task.folderId;
    }

    const dueEl = document.getElementById('editTaskDue');
    task.due = dueEl && dueEl.value ? dueEl.value : undefined;

    const notesEl = document.getElementById('editTaskNotes');
    task.notes = notesEl && notesEl.value.trim() ? notesEl.value.trim() : undefined;

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
    container.innerHTML = '<div style="text-align:center; padding: 35px 20px; color:#a3a3a3; font-size:12px;">No tasks in this view. Press Enter above to add one.</div>';
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
    else if (folder && folder.color) {
      folderStyle = 'border-color: ' + folder.color + '40; color: ' + folder.color + ';';
    }

    const safeTitle = escapeHtml(t.title || '');
    const isCompleted = Boolean(t.completed);
    const pTag = t.priority || 'medium';
    const dueLabel = t.due ? (t.due === today ? 'Today' : t.due) : '';
    const dueSpan = dueLabel ? '<span>· ' + dueLabel + '</span>' : '';
    const noteSpan = t.notes ? '<span>· Note</span>' : '';

    return '<div class="task-item ' + (isCompleted ? 'completed' : '') + '" data-id="' + t.id + '">' +
      '<input type="checkbox" class="task-checkbox" ' + (isCompleted ? 'checked' : '') + '>' +
      '<div class="task-content">' +
        '<div class="task-title">' +
          '<span class="folder-badge ' + extraCls + '" style="' + folderStyle + '">📁 ' + escapeHtml(folderTitle) + '</span> ' +
          safeTitle +
        '</div>' +
        '<div class="task-meta">' +
          '<span class="priority-tag priority-' + pTag + '">' + pTag + '</span>' +
          dueSpan +
          noteSpan +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  container.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = e.target.closest('.task-item');
      if (parent && parent.dataset.id) {
        toggleTask(parent.dataset.id);
      }
    });
  });

  // Click on task opens detail edit drawer
  container.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('task-checkbox')) return;
      const taskId = item.dataset.id;
      const targetTask = tasks.find(t => t.id === taskId);
      if (targetTask) {
        openDetailDrawer(targetTask);
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

async function updateSyncStatus() {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    const data = await chrome.storage.local.get(['chronotask_last_synced', 'chronotask_user']);
    const footerSync = document.getElementById('openFullAppFooter');
    if (!footerSync) return;
    if (data.chronotask_last_synced) {
      const user = data.chronotask_user ? JSON.parse(data.chronotask_user) : null;
      const d = new Date(data.chronotask_last_synced);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      footerSync.textContent = '✓ Synced ' + timeStr + ' ↗';
      footerSync.title = (user && user.email ? 'Connected: ' + user.email + ' · ' : '') + 'Synced with Vercel Web App at ' + timeStr;
    } else {
      footerSync.textContent = 'Sync Google Tasks ↗';
    }
  } catch (e) {}
}
`;

  const contentJs = `// Chronotask Extension Sync Bridge v1.2.0
// Synchronizes tasks and folders bidirectionally between Chronotask Web App and chrome.storage.local

(function() {
  console.log('[Chronotask Bridge] Initialized on ' + window.location.href);

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
        }, '*');
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
    }, '*');
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
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.source === 'chronotask-extension') return; // Ignore own messages

    if (event.data.type === 'CHRONOTASK_SYNC_TO_EXTENSION') {
      const { tasks, lists, accessToken, user, lastSynced } = event.data;
      const updateData = {};
      if (Array.isArray(tasks)) {
        updateData['chronotask_tasks_v1'] = JSON.stringify(tasks);
      }
      if (Array.isArray(lists)) {
        updateData['chronotask_lists_v1'] = JSON.stringify(lists);
      }
      if (accessToken) {
        updateData['chronotask_access_token'] = accessToken;
      }
      if (user) {
        updateData['chronotask_user'] = JSON.stringify(user);
      }
      if (lastSynced) {
        updateData['chronotask_last_synced'] = lastSynced;
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
  <style>
    body { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>Chronotask <small style="font-size:10px; color:#2563eb; font-family:monospace;">Side Panel</small></span>
    </div>
    <div class="actions">
      <button id="openFullApp" title="Open Full Dashboard">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
    </div>
  </header>

  <section class="quick-add">
    <input type="text" id="quickTaskInput" placeholder="Add task... (Press Enter)" autofocus>
    <div class="quick-add-bar">
      <select id="quickFolderSelect" class="mini-select">
        <option value="default_my_tasks">📁 General</option>
        <option value="default_work">📁 Work & Projects</option>
        <option value="default_personal">📁 Personal</option>
        <option value="default_urgent">📁 Urgent & Critical</option>
      </select>
      <select id="quickPrioritySelect" class="mini-select">
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium" selected>Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  </section>

  <div class="filter-controls">
    <div class="filter-tabs">
      <button class="tab active" data-filter="today">Today</button>
      <button class="tab" data-filter="all">All</button>
      <button class="tab" data-filter="upcoming">Upcoming</button>
    </div>
    <div class="filter-right">
      <select id="folderFilterSelect" class="mini-select" title="Filter by folder">
        <option value="all">📁 All Folders</option>
      </select>
      <button id="sortToggleBtn" class="sort-btn" title="Toggle Priority High to Low">
        ↓ Priority
      </button>
    </div>
  </div>

  <main id="taskList" class="task-list">
  </main>

  <!-- Inline Task Detail & Edit Drawer -->
  <div id="detailDrawer" class="detail-drawer hidden">
    <div class="detail-header">
      <span class="detail-title-label">Task Details</span>
      <button id="closeDetailBtn" class="icon-btn">✕</button>
    </div>
    <div class="detail-body">
      <label class="form-label">Task Title</label>
      <input type="text" id="editTaskTitle" class="form-input">

      <label class="form-label">Priority (High to Low)</label>
      <div class="priority-chips">
        <button type="button" class="chip" data-p="urgent">Urgent</button>
        <button type="button" class="chip" data-p="high">High</button>
        <button type="button" class="chip" data-p="medium">Medium</button>
        <button type="button" class="chip" data-p="low">Low</button>
      </div>

      <label class="form-label">Folder / Type</label>
      <select id="editTaskFolder" class="form-input">
        <option value="default_my_tasks">📁 General</option>
        <option value="default_work">📁 Work & Projects</option>
        <option value="default_personal">📁 Personal</option>
        <option value="default_urgent">📁 Urgent & Critical</option>
      </select>

      <label class="form-label">Due Date</label>
      <input type="date" id="editTaskDue" class="form-input">

      <label class="form-label">Notes</label>
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
  a.download = 'chronotask-extension-v1.2.0.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
