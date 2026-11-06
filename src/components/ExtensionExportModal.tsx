import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Code, 
  Puzzle, 
  ExternalLink, 
  CheckCircle2, 
  HelpCircle,
  FileCode,
  Sparkles
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

  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const currentFile = files[activeFileIndex] || files[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Chrome Extension Release & Setup Package</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  Manifest V3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ready-to-load unpacked Chrome Extension with Side Panel and Popup support.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Quick Guide Card */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-200 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>How to Install into Google Chrome (4 Simple Steps)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-indigo-400 block mb-1">STEP 1</span>
                <p className="text-slate-300">
                  Click <strong>Download All Files</strong> below and place them in a folder.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-indigo-400 block mb-1">STEP 2</span>
                <p className="text-slate-300">
                  Open Chrome and go to <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded font-mono">chrome://extensions</code>
                </p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-indigo-400 block mb-1">STEP 3</span>
                <p className="text-slate-300">
                  Toggle on <strong>Developer mode</strong> in the top right.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-indigo-400 block mb-1">STEP 4</span>
                <p className="text-slate-300">
                  Click <strong>Load unpacked</strong> and select your folder!
                </p>
              </div>
            </div>
          </div>

          {/* File Inspector & Tabs */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {files.map((file, idx) => (
                  <button
                    key={file.name}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition shrink-0 flex items-center gap-1.5 ${
                      activeFileIndex === idx
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownloadFile(currentFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Code preview area */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto overflow-x-auto leading-relaxed select-text">
              <pre>{currentFile.content}</pre>
            </div>
          </div>

          {/* Release Checklist */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-200 block mb-1">
              Release Readiness Features:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Offline caching & storage (`chrome.storage.local`)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Google OAuth scopes (`tasks`, `calendar.events`)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Side Panel API & Compact Popup support</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Dynamic badge with count of today's pending tasks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            {downloadSuccess ? (
              <span className="text-emerald-400 font-medium">✓ chronotask-extension-v1.0.0.zip downloaded!</span>
            ) : isZipping ? (
              <span className="text-indigo-400 font-medium animate-pulse">Packaging extension ZIP with icons...</span>
            ) : (
              'Ready for unpacked loading or Chrome Web Store publishing.'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-sm transition active:scale-98"
            >
              <Download className={`w-4 h-4 ${isZipping ? 'animate-bounce' : ''}`} />
              <span>{isZipping ? 'Bundling ZIP...' : 'Download Extension ZIP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
