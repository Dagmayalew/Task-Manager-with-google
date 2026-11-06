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
    version: '1.0.0',
    description: 'Personal task manager with Google Tasks, Google Calendar time-blocking, and offline access.',
    permissions: [
      'storage',
      'alarms',
      'identity',
      'sidePanel'
    ],
    host_permissions: [
      'https://tasks.googleapis.com/*',
      'https://www.googleapis.com/*'
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
    oauth2: {
      client_id: oAuthClientId,
      scopes: [
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  };

  const backgroundJs = `// Chronotask Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chronotask extension installed successfully.');
  // Set initial badge
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
    const tasks = data.chronotask_tasks_v1 ? JSON.parse(data.chronotask_tasks_v1) : [];
    const today = new Date().toISOString().split('T')[0];
    const pendingToday = tasks.filter(t => !t.completed && t.due === today).length;
    
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>Chronotask</span>
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
  </section>

  <div class="filter-tabs">
    <button class="tab active" data-filter="today">Today</button>
    <button class="tab" data-filter="all">All</button>
    <button class="tab" data-filter="upcoming">Upcoming</button>
  </div>

  <main id="taskList" class="task-list">
    <!-- Rendered dynamically -->
  </main>

  <footer class="footer">
    <span id="syncIndicator">Offline Ready</span>
    <button id="openSidePanelBtn">Dock to Side Panel</button>
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
.quick-add input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  background: #fafaf9;
  border: 1px solid #e5e5e5;
  color: #171717;
  font-size: 13px;
  outline: none;
}
.quick-add input:focus {
  border-color: #171717;
}
.filter-tabs {
  display: flex;
  padding: 8px 14px 4px 14px;
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
  padding: 8px 4px;
  border-bottom: 1px solid #f0f0f0;
  transition: opacity 0.15s;
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
  width: 15px;
  height: 15px;
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
.task-badge {
  font-size: 10px;
  font-family: monospace;
  color: #737373;
}
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
`;

  const popupJs = `// Chronotask Extension Popup Logic
let currentFilter = 'today';

document.addEventListener('DOMContentLoaded', async () => {
  renderTasks();

  document.getElementById('quickTaskInput').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const title = e.target.value.trim();
      if (!title) return;
      await addTask(title);
      e.target.value = '';
      renderTasks();
    }
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  document.getElementById('openFullApp').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });

  const sidePanelBtn = document.getElementById('openSidePanelBtn');
  if (sidePanelBtn) {
    sidePanelBtn.addEventListener('click', async () => {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.sidePanel.open({ tabId: tab.id });
        }
      }
    });
  }
});

async function getStoredTasks() {
  const result = await chrome.storage.local.get(['chronotask_tasks_v1']);
  return result.chronotask_tasks_v1 ? JSON.parse(result.chronotask_tasks_v1) : [];
}

async function saveStoredTasks(tasks) {
  await chrome.storage.local.set({ 'chronotask_tasks_v1': JSON.stringify(tasks) });
}

async function addTask(title) {
  const tasks = await getStoredTasks();
  const newTask = {
    id: 't_' + Date.now(),
    title,
    completed: false,
    priority: 'medium',
    due: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
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
    await saveStoredTasks(tasks);
    renderTasks();
  }
}

async function renderTasks() {
  const tasks = await getStoredTasks();
  const container = document.getElementById('taskList');
  const today = new Date().toISOString().split('T')[0];

  let filtered = tasks;
  if (currentFilter === 'today') {
    filtered = tasks.filter(t => t.due === today || (!t.completed && (!t.due || t.due <= today)));
  } else if (currentFilter === 'upcoming') {
    filtered = tasks.filter(t => t.due && t.due > today && !t.completed);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding: 30px; color:#64748b; font-size:12px;">No tasks found. Press Enter above to add one!</div>';
    return;
  }

  container.innerHTML = filtered.map(t => \`
    <div class="task-item \${t.completed ? 'completed' : ''}" data-id="\${t.id}">
      <input type="checkbox" class="task-checkbox" \${t.completed ? 'checked' : ''}>
      <div class="task-content">
        <div class="task-title">\${escapeHtml(t.title)}</div>
      </div>
      \${t.due ? \`<span class="task-badge">\${t.due === today ? 'Today' : t.due}</span>\` : ''}
    </div>
  \`).join('');

  container.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const parent = e.target.closest('.task-item');
      toggleTask(parent.dataset.id);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>Chronotask Side Panel</span>
    </div>
    <div class="actions">
      <button id="openFullApp" title="Open Full App">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      </button>
    </div>
  </header>

  <section class="quick-add">
    <input type="text" id="quickTaskInput" placeholder="Quick capture task...">
  </section>

  <div class="filter-tabs">
    <button class="tab active" data-filter="today">Today</button>
    <button class="tab" data-filter="all">All</button>
    <button class="tab" data-filter="upcoming">Upcoming</button>
  </div>

  <main id="taskList" class="task-list">
  </main>

  <footer class="footer">
    <span id="syncIndicator">Offline & Synced</span>
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
  a.download = 'chronotask-extension-v1.0.0.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
