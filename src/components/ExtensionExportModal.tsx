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
  if (!isOpen) return null;

  const clientId = firebaseConfig.oAuthClientId || '';
  const files: ExtensionFile[] = generateExtensionFiles(clientId);

  const [activeTab, setActiveTab] = useState<'store_answers' | 'files' | 'local_install'>('store_answers');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Dynamic public HTTPS URL for the privacy policy
  const hostedPrivacyUrl = typeof window !== 'undefined' && window.location.origin.startsWith('https://')
    ? `${window.location.origin}/privacy.html`
    : 'https://ais-pre-onshekxu4tnyswwyz7v5qf-225900507391.europe-west2.run.app/privacy.html';

  const storeFields = [
    {
      id: 'privacy_policy',
      title: 'Privacy Policy URL',
      location: 'Store Listing tab & Privacy practices tab',
      requiredFor: 'Privacy policy link is not valid',
      value: hostedPrivacyUrl,
      instruction: 'Paste this public HTTPS link into the "Privacy policy" input field. It is publicly served and compliant.'
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
      id: 'alarms_justification',
      title: 'Alarms Permission Justification',
      location: 'Privacy practices tab → Permission justifications → alarms',
      requiredFor: 'A justification for alarms is required',
      value: 'Used solely to periodically update the extension action badge icon with the count of pending tasks scheduled for today.',
      instruction: 'Paste in the justification text area for the "alarms" permission.'
    },
    {
      id: 'host_justification',
      title: 'Host Permission Justification',
      location: 'Privacy practices tab → Permission justifications → host permissions',
      requiredFor: 'A justification for host permission use is required',
      value: 'Used exclusively to connect to tasks.googleapis.com and www.googleapis.com to synchronize task lists and schedule calendar focus time directly with the user\'s authorized Google account.',
      instruction: 'Paste in the justification text area for host permissions (*://tasks.googleapis.com/* & *://www.googleapis.com/*).'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-5 text-neutral-900 dark:text-neutral-100 max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Chrome Web Store · Deployment & Submission
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Extension Release & Publishing Guide
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-200/80 dark:border-neutral-800/80 pt-2 pb-2">
          <button
            onClick={() => setActiveTab('store_answers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'store_answers'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Web Store Answers (Privacy Tab)</span>
          </button>

          <button
            onClick={() => setActiveTab('local_install')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'local_install'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Local Install (chrome://extensions)</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Manifest V3 Source Code</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {activeTab === 'store_answers' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-md text-xs text-neutral-700 dark:text-neutral-300">
                <span className="font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">
                  Direct Copy & Paste for Chrome Web Store Developer Console
                </span>
                Click the <strong>Copy</strong> button on each item below to paste into the Chrome Web Store Developer Console to clear each rejection notice.
              </div>

              {storeFields.map((field) => (
                <div 
                  key={field.id}
                  className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3 bg-neutral-50/40 dark:bg-neutral-950/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {field.title}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400 ml-2">
                        · {field.location}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyText(field.value, field.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs font-mono text-neutral-700 dark:text-neutral-300 hover:border-blue-600 hover:text-blue-600 transition"
                    >
                      {copiedField === field.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-blue-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-neutral-500 font-mono">
                    Fixes error: <span className="text-rose-600 dark:text-rose-400">"{field.requiredFor}"</span>
                  </p>

                  <div className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-xs font-mono select-all text-neutral-800 dark:text-neutral-200 break-all leading-relaxed">
                    {field.value}
                  </div>

                  {field.id === 'privacy_policy' && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <a 
                        href={field.value} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
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
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3.5 bg-neutral-50/60 dark:bg-neutral-950/60">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-2">
                  Installation Procedure
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <div>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mb-0.5">01. DOWNLOAD</span>
                    <p>Click "Download Extension ZIP" and extract the folder.</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mb-0.5">02. EXTENSIONS</span>
                    <p>Open <code className="font-mono text-[11px] text-neutral-900 dark:text-neutral-200">chrome://extensions</code> in Chrome.</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mb-0.5">03. DEV MODE</span>
                    <p>Turn on "Developer mode" in the top-right corner.</p>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mb-0.5">04. LOAD</span>
                    <p>Click "Load unpacked" and select the folder.</p>
                  </div>
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
                <span className="font-semibold text-neutral-900 dark:text-neutral-200 block">Keyboard Shortcuts & Features</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong className="text-neutral-800 dark:text-neutral-200">Ctrl+Shift+T / Cmd+Shift+T:</strong> Instantly opens the Chronotask popup from any browser tab.</li>
                  <li><strong className="text-neutral-800 dark:text-neutral-200">Side Panel:</strong> Click "Dock to Side Panel" in the popup to keep tasks visible while you browse.</li>
                  <li><strong className="text-neutral-800 dark:text-neutral-200">Today's Badge:</strong> The red badge count reflects tasks scheduled for today.</li>
                </ul>
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
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
                    className="flex items-center gap-1 px-2.5 py-1 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded text-xs hover:border-blue-600 hover:text-blue-600 transition"
                  >
                    {copiedField === currentFile.name ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === currentFile.name ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile(currentFile)}
                    className="flex items-center gap-1 px-2.5 py-1 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded text-xs hover:border-blue-600 hover:text-blue-600 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>File</span>
                  </button>
                </div>
              </div>

              {/* Code preview */}
              <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md p-3.5 font-mono text-[11px] text-neutral-800 dark:text-neutral-300 max-h-60 overflow-y-auto leading-relaxed select-text">
                <pre>{currentFile.content}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <span className="text-xs font-mono text-neutral-400">
            {downloadSuccess ? (
              <span className="text-blue-600 dark:text-blue-400 font-medium">✓ ZIP downloaded.</span>
            ) : isZipping ? (
              'Generating ZIP bundle...'
            ) : (
              'Ready for Chrome extension loading.'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            >
              Close
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition shadow-2xs"
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

