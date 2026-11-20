# Chronotask ⏱️

A personal task manager web app and Chrome Extension with Google Tasks sync, Google Calendar scheduling, and offline support.

---

## Features

- **Google Tasks Sync** — Two-way sync with your Google Tasks lists
- **Google Calendar Scheduling** — Convert tasks into calendar time-blocks
- **Offline-First** — Local-first with an automatic background sync queue and retry engine
- **Chrome Extension (v1.3.2)** — Access tasks via browser popup or the Chrome Side Panel
- **Editorial Design** — Calm light/dark theme built on a semantic design system
- **Keyboard-First** — `/` to search, quick-add bar, batch actions, completion confetti

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer Motion) |
| Build Tool | Vite 8 |
| Auth | Firebase Authentication (Google OAuth) |
| APIs | Google Tasks REST API, Google Calendar REST API |
| AI | Google Gemini API (`@google/genai`) |
| Extension | Chrome Manifest V3 (Popup + Side Panel) |

---

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- A Google Cloud project with **Google Tasks API** and **Google Calendar API** enabled
- A Firebase project with **Authentication** enabled (Google sign-in provider)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Clone the repo

```bash
git clone https://github.com/Dagmayalew/Task-Manager-with-google.git
cd Task-Manager-with-google
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio |
| `APP_URL` | The URL where this app is hosted (e.g. `http://localhost:3000`) |

### 4. Configure Firebase

Copy the Firebase config template and fill in your project details:

```bash
cp firebase-applet-config.example.json firebase-applet-config.json
```

Then edit `firebase-applet-config.json` with your Firebase project values (found in the Firebase console under Project Settings).

> **Important**: Never commit `firebase-applet-config.json` with real credentials. It is in `.gitignore`.

### 5. Set up Google OAuth

In your Google Cloud Console:
1. Create an OAuth 2.0 Client ID (Web Application type)
2. Add your app URL to **Authorized JavaScript Origins**
3. Add your auth domain to **Authorized Redirect URIs**
4. Enable the **Google Tasks API** and **Google Calendar API**
5. Copy the OAuth Client ID into `firebase-applet-config.json` → `oAuthClientId`

### 6. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Chrome Extension

The Chrome Extension is generated from the same codebase. To build and load it:

1. Build the app: `npm run build`
2. In the app UI, open the **Tools** menu → **Download Extension**
3. In Chrome, go to `chrome://extensions`, enable **Developer Mode**, and click **Load unpacked** — select the downloaded and unzipped extension folder

Pre-built extension `.zip` files are also available in the [Releases](../../releases) page.

---

## Project Structure

```
├── src/
│   ├── App.tsx                  # Root component and app state
│   ├── components/              # UI components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TaskItem.tsx
│   │   ├── TaskDetailModal.tsx
│   │   ├── QuickAddBar.tsx
│   │   ├── ContextRail.tsx
│   │   ├── ExtensionExportModal.tsx
│   │   ├── CalendarScheduleView.tsx
│   │   └── TrendsDashboard.tsx
│   ├── services/
│   │   ├── firebaseAuth.ts      # Google OAuth via Firebase
│   │   ├── googleTasksApi.ts    # Google Tasks REST API client
│   │   ├── googleCalendarApi.ts # Google Calendar REST API client
│   │   ├── storageService.ts    # LocalStorage persistence
│   │   └── extensionExporter.ts # Chrome Extension builder
│   └── types/index.ts           # TypeScript type definitions
├── public/                      # Static assets and extension ZIPs
├── docs/design/                 # Design specs and screenshots
├── firebase-applet-config.example.json
├── .env.example
└── vite.config.ts
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type check |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
