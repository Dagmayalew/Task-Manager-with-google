import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileCode,
  ShieldCheck,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { generateExtensionFiles, exportExtensionAsZip, ExtensionFile } from '../services/extensionExporter';
import firebaseConfig from '../../firebase-applet-config.json';

interface ExtensionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionExportModal: React.FC<ExtensionExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'store_answers' | 'files' | 'local_install' | 'extension_auth'>('store_answers');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const clientId = firebaseConfig.oAuthClientId || '';
  const files: ExtensionFile[] = generateExtensionFiles(clientId);

  // Public production HTTPS URL on Vercel
  const vercelAppUrl = 'https://task-manager-with-google.vercel.app';
  const hostedPrivacyUrl = `${vercelAppUrl}/privacy.html`;

  const storeFields = [
    {
      id: 'host_permission_justification',
      title: 'Host Permission Justification (https://task-manager-with-google.vercel.app/*)',
      location: 'Privacy practices tab → Host permissions justification',
      requiredFor: 'A justification for host permission use is required',
      value: 'Required solely to communicate with the user\'s official Chronotask web application dashboard at https://task-manager-with-google.vercel.app. The content script synchronizes the user\'s task lists and Google Tasks authorization status between the web app and the extension\'s local storage in real time. No data is accessed, collected, or transmitted on any other website.',
      instruction: 'Paste into the justification field under Host permissions on the Privacy practices tab.'
    },
    {
      id: 'privacy_policy',
      title: 'Privacy Policy URL (Verified Public HTTPS Link)',
      location: 'Privacy practices tab → Privacy policy link',
      requiredFor: 'Privacy policy link is not valid or not reachable',
      value: hostedPrivacyUrl,
      instruction: 'Paste into the Privacy policy field on the Privacy practices tab. It is hosted live on your Vercel deployment.'
    },
    {
      id: 'store_website',
      title: 'Official Web App URL',
      location: 'Store listing tab → Homepage Website',
      requiredFor: 'Web App Hub & Google OAuth Redirect',
      value: vercelAppUrl,
      instruction: 'Paste into the Homepage / Website field on your Chrome Web Store listing.'
    },
    {
      id: 'version_info',
      title: 'Package Version 1.3.0 (Security Hardening & Refresh)',
      location: 'Package tab → Upload New Package',
      requiredFor: 'Version 1.3.0 Release Update',
      value: 'chronotask-extension-v1.3.0.zip',
      instruction: 'Upload the v1.3.0 ZIP file. Increments published version 1.2.0. Adds security hardening (strict origin-scoped host permissions, DOM XSS entity escaping, strict tab matching, and bi-directional sync validation), editorial dark mode, keyboard shortcuts, and full Google Tasks sync with https://task-manager-with-google.vercel.app.'
    },
    {
      id: 'single_purpose',
      title: 'Single Purpose Description',
      location: 'Privacy practices tab → Single purpose field',
      requiredFor: 'The single purpose description is required',
      value: 'A personal productivity task manager that organizes to-dos and synchronizes them directly with Google Tasks and Google Calendar.',
      instruction: 'Paste into the Single Purpose description box.'
    },
    {
      id: 'detailed_description',
      title: 'Detailed Description (≥ 25 characters)',
      location: 'Store listing tab → Detailed description',
      requiredFor: 'The detailed description is too short or is missing',
      value: 'Chronotask is a minimalist, Swiss-inspired personal task manager built for focused daily productivity. It connects seamlessly with Google Tasks to sync your to-do lists across devices and schedules focus time blocks directly on Google Calendar. Chronotask features offline-first local storage, an instant keyboard shortcut capture popup, and a convenient Chrome side panel view.',
      instruction: 'Paste in the detailed description box on the Store Listing tab.'
    },
    {
      id: 'developer_certification',
      title: 'Developer Program Policies Certification',
      location: 'Privacy practices tab → Bottom checkbox',
      requiredFor: 'Certify that your data usage complies with our Developer Program Policies',
      value: 'Check all 3 compliance boxes: (1) I do not sell user data. (2) I do not use or transfer user data for purposes unrelated to the item\'s core single purpose. (3) I do not use or transfer user data to determine creditworthiness or for lending purposes.',
      instruction: 'Check the certification checkbox at the bottom of the Privacy practices tab.'
    }
  ];

  const currentFile = files[activeFileIndex] || files[0];

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadFile = (file: ExtensionFile) => {
    const blob = new Blob([file.content], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await exportExtensionAsZip(clientId);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e) {
      console.error('Error generating zip:', e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-3xl bg-surface border border-line rounded-md p-5 text-ink max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              Chrome Web Store · Deployment & Submission
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Extension Release & Publishing Guide
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 border-b border-line pt-2 pb-2">
          <button
            onClick={() => setActiveTab('store_answers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'store_answers'
                ? 'bg-ink text-paper'
                : 'text-ink-2 hover:text-ink hover:bg-subtle'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Web Store Answers (Privacy Tab)</span>
          </button>

          <button
            onClick={() => setActiveTab('local_install')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'local_install'
                ? 'bg-ink text-paper'
                : 'text-ink-2 hover:text-ink hover:bg-subtle'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Local Install (chrome://extensions)</span>
          </button>

          <button
            onClick={() => setActiveTab('extension_auth')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'extension_auth'
                ? 'bg-ink text-paper'
                : 'text-ink-2 hover:text-ink hover:bg-subtle'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Extension Sign-In FAQ</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'files'
                ? 'bg-ink text-paper'
                : 'text-ink-2 hover:text-ink hover:bg-subtle'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Manifest V3 Source Code</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {activeTab === 'store_answers' && (
            <div className="space-y-4">
              {/* Alert explaining why preview URL is unreachable */}
              <div className="p-3.5 bg-danger-soft border border-line rounded-md text-xs space-y-2">
                <div className="flex items-center gap-2 text-danger font-semibold">
                  <span>Why Chrome says: "Privacy policy link is not reachable"</span>
                </div>
                <p className="text-ink-2 leading-relaxed">
                  The AI Studio preview domain requires your personal Google login. Because Chrome Web Store’s automated crawler does not have your login cookie, it receives a redirect when testing the link.
                </p>
                <div className="p-2.5 bg-surface border border-line rounded text-xs space-y-1.5">
                  <span className="font-semibold text-ink block">
                    Fastest 1-Minute Fix (Accepted by Google):
                  </span>
                  <ol className="list-decimal pl-4 space-y-1 text-ink-2">
                    <li>Create a new doc at <a href="https://docs.google.com/document/create" target="_blank" rel="noreferrer" className="text-accent underline">docs.google.com</a>.</li>
                    <li>Click the button below to copy the complete policy text and paste it into the doc.</li>
                    <li>In Google Docs, click <strong>File → Share → Publish to web → Publish</strong>.</li>
                    <li>Copy that published URL and paste it into the Chrome Web Store.</li>
                  </ol>
                  <button
                    onClick={() => {
                      const fullPolicy = `# Privacy Policy for Chronotask
Last Updated: November 6, 2026
Developer Contact: dagmayalew489@gmail.com

Single Purpose Commitment:
Chronotask is a personal productivity extension and task manager designed solely to help users create, organize, and synchronize their personal tasks with Google Tasks and block focus time on Google Calendar.

1. Overview and Core Principles
Chronotask is designed with an offline-first architecture prioritizing user privacy. We do not sell your personal data, we do not show advertisements, and we do not track your internet browsing activities across websites.

2. Information Collected and Permissions Requested
Chronotask requests only the minimum necessary permissions in compliance with Chrome Web Store Minimal Permissions policy:
- Storage API (storage): Used to cache your task lists, tasks, and settings locally on your device for offline productivity.
- Side Panel API (sidePanel): Used to allow docking the task manager alongside web pages in Google Chrome for personal note-taking.
- Host Permission (https://task-manager-with-google.vercel.app/*): Used solely to synchronize your personal tasks between the extension and the official Chronotask web application dashboard. No other domains or browsing activities are accessed.

3. How We Use and Store Data
- Local Storage: All tasks and settings are stored locally on your device.
- Google Synchronization: When you connect your Google Account, your tasks and calendar events are transmitted directly between your browser and Google's official servers via encrypted HTTPS connections.
- No Central Data Collection: We do not operate external third-party tracking servers that collect or aggregate your task content.

4. Compliance with Google API Services User Data Policy
Chronotask's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements:
- We never use Google Workspace data for serving advertisements.
- We never sell or transfer Google user data to data brokers.
- We never use your data for training machine learning or artificial intelligence models.

5. Your Rights and Data Deletion
- You can delete individual tasks or lists at any time through the application interface.
- You can sign out of your Google Account at any time, which immediately terminates and discards active access tokens.
- Uninstalling the extension immediately removes all locally cached data from your computer.

6. Developer Certification & Inquiries
We certify that our collection and use of user data strictly complies with the Chrome Web Store Developer Program Policies.
Developer Contact: dagmayalew489@gmail.com`;
                      handleCopyText(fullPolicy, 'full_policy_doc');
                    }}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-accent text-paper hover:text-accent-ink rounded text-xs font-medium transition"
                  >
                    {copiedField === 'full_policy_doc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'full_policy_doc' ? 'Copied Full Policy!' : 'Copy Policy Text for Google Docs / Gist'}</span>
                  </button>
                </div>
              </div>

              {storeFields.map((field) => (
                <div 
                  key={field.id}
                  className="border border-line rounded-md p-3 bg-subtle/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-ink">
                        {field.title}
                      </span>
                      <span className="font-mono text-[10px] text-ink-3 ml-2">
                        · {field.location}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyText(field.value, field.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-surface border border-line rounded text-xs font-mono text-ink-2 hover:border-ink hover:text-accent transition"
                    >
                      {copiedField === field.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent" />
                          <span className="text-accent font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-ink-2 font-mono">
                    Fixes error: <span className="text-danger">"{field.requiredFor}"</span>
                  </p>

                  <div className="p-2 bg-surface border border-line rounded text-xs font-mono select-all text-ink break-all leading-relaxed">
                    {field.value}
                  </div>

                  {field.id === 'privacy_policy' && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <a 
                        href={field.value} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-accent hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open & test live privacy policy page</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'local_install' && (
            <div className="space-y-4">
              <div className="border border-line rounded-md p-3.5 bg-subtle/60">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3 block mb-2">
                  Installation Procedure
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs text-ink-2">
                  <div>
                    <span className="font-mono text-[10px] text-accent font-semibold block mb-0.5">01. DOWNLOAD</span>
                    <p>Click "Download Extension ZIP" and extract the folder.</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-accent font-semibold block mb-0.5">02. EXTENSIONS</span>
                    <p>Open <code className="font-mono text-[11px] text-ink">chrome://extensions</code> in Chrome.</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-accent font-semibold block mb-0.5">03. DEV MODE</span>
                    <p>Turn on "Developer mode" in the top-right corner.</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-accent font-semibold block mb-0.5">04. LOAD</span>
                    <p>Click "Load unpacked" and select the folder.</p>
                  </div>
                </div>
              </div>

              <div className="border border-line rounded-md p-3 text-xs text-ink-2 space-y-2">
                <span className="font-semibold text-ink block">Keyboard Shortcuts & Features</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong className="text-ink">Ctrl+Shift+T / Cmd+Shift+T:</strong> Instantly opens the Chronotask popup from any browser tab.</li>
                  <li><strong className="text-ink">Side Panel:</strong> Click "Dock to Side Panel" in the popup to keep tasks visible while you browse.</li>
                  <li><strong className="text-ink">Today's Badge:</strong> The red badge count reflects tasks scheduled for today.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'extension_auth' && (
            <div className="space-y-4 text-xs">
              <div className="border border-line bg-accent-soft rounded-md p-4 space-y-2">
                <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                  <span className="text-accent">Why does Google Sign-In not open inside the extension popup?</span>
                </h3>
                <p className="text-ink-2 leading-relaxed">
                  Google Chrome extensions run on a sandboxed <code className="font-mono bg-accent-soft px-1 py-0.5 rounded text-[11px]">chrome-extension://</code> internal protocol. Google OAuth 2.0 and Firebase Authentication security standards strictly restrict web popup authentication to registered, verified HTTP/HTTPS origins.
                </p>
                <p className="text-ink-2 leading-relaxed">
                  Additionally, Chrome automatically closes any extension popup the moment focus moves to another window (such as an OAuth consent screen), immediately terminating any in-progress sign-in attempts.
                </p>
              </div>

              <div className="border border-line rounded-md p-4 space-y-3 bg-subtle/60">
                <h4 className="font-semibold text-xs uppercase tracking-wider font-mono text-ink">
                  How Vercel Web App & Extension Real-Time Sync Works (v1.3.0):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-surface border border-line rounded">
                    <span className="font-mono text-[10px] text-accent font-bold block mb-1">STEP 1</span>
                    <p className="font-medium text-ink mb-1">Open Vercel App</p>
                    <p className="text-ink-2 text-[11px]">Click "Open Full Dashboard" (<ExternalLink className="w-2.5 h-2.5 inline" />) in popup to open <code className="font-mono text-[10px]">task-manager-with-google.vercel.app</code>.</p>
                  </div>

                  <div className="p-3 bg-surface border border-line rounded">
                    <span className="font-mono text-[10px] text-accent font-bold block mb-1">STEP 2</span>
                    <p className="font-medium text-ink mb-1">Sign In with Google</p>
                    <p className="text-ink-2 text-[11px]">Click "Sign In with Google" on Vercel. Google Tasks and Calendar events are fetched live.</p>
                  </div>

                  <div className="p-3 bg-surface border border-line rounded">
                    <span className="font-mono text-[10px] text-accent font-bold block mb-1">STEP 3</span>
                    <p className="font-medium text-ink mb-1">Automatic Content Bridge</p>
                    <p className="text-ink-2 text-[11px]"><code className="font-mono text-[10px]">content.js</code> automatically bridges tasks and auth into extension <code className="font-mono text-[10px]">chrome.storage.local</code> in real time!</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-line rounded bg-surface">
                <div>
                  <span className="font-semibold text-ink block">Web Dashboard Link:</span>
                  <span className="font-mono text-[11px] text-ink-2">{hostedPrivacyUrl.replace('/privacy.html', '')}</span>
                </div>
                <a
                  href={hostedPrivacyUrl.replace('/privacy.html', '')}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-ink hover:bg-accent text-paper hover:text-accent-ink rounded text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>Launch Web App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  {files.map((file, idx) => (
                    <button
                      key={file.name}
                      onClick={() => setActiveFileIndex(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors shrink-0 flex items-center gap-1.5 ${
                        activeFileIndex === idx
                          ? 'bg-ink text-paper font-medium'
                          : 'text-ink-2 hover:text-ink hover:bg-subtle'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{file.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => handleCopyText(currentFile.content, currentFile.name)}
                    className="flex items-center gap-1 px-2.5 py-1 border border-line text-ink-2 rounded text-xs hover:border-ink hover:text-accent transition"
                  >
                    {copiedField === currentFile.name ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === currentFile.name ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile(currentFile)}
                    className="flex items-center gap-1 px-2.5 py-1 border border-line text-ink-2 rounded text-xs hover:border-ink hover:text-accent transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>File</span>
                  </button>
                </div>
              </div>

              {/* Code preview */}
              <div className="bg-subtle border border-line rounded-md p-3.5 font-mono text-[11px] text-ink max-h-60 overflow-y-auto leading-relaxed select-text">
                <pre>{currentFile.content}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-line">
          <span className="text-xs font-mono text-ink-3">
            {downloadSuccess ? (
              <span className="text-accent font-medium">✓ ZIP downloaded.</span>
            ) : isZipping ? (
              'Generating ZIP bundle...'
            ) : (
              'Ready for Chrome extension loading.'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-ink-2 hover:text-ink"
            >
              Close
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-paper bg-ink hover:bg-accent disabled:opacity-50 rounded-md transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling...' : 'Download Extension ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

