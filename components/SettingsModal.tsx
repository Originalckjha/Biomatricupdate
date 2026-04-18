'use client';

import { useState } from 'react';
import { X, Copy, Check, Globe, Wifi, AlertCircle, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { Config } from '@/lib/types';

interface Props {
  config: Config;
  onSave: (c: Config) => void;
  onClose: () => void;
  onClear: () => Promise<void>;
}

type TestState = 'idle' | 'testing' | 'ok' | 'error';

export default function SettingsModal({ config, onSave, onClose, onClear }: Props) {
  const [local, setLocal] = useState<Config>({ ...config });
  const [copied, setCopied] = useState(false);
  const [testState, setTestState] = useState<TestState>('idle');
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const pushEndpoint =
    typeof window !== 'undefined' ? `${window.location.origin}/iclock/cdata` : '/iclock/cdata';
  const pushHost =
    typeof window !== 'undefined' ? window.location.hostname : 'your-app.vercel.app';
  const pushPort =
    typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? '443' : '80') : '443';

  const copyEndpoint = () => {
    navigator.clipboard.writeText(pushEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    if (!local.pullUrl) return;
    setTestState('testing');
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(local.pullUrl)}`);
      setTestState(res.ok ? 'ok' : 'error');
    } catch {
      setTestState('error');
    }
    setTimeout(() => setTestState('idle'), 4000);
  };

  const handleClear = async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setClearing(true);
    await onClear();
    setClearing(false);
    setConfirmClear(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/60 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Device Configuration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Mode */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Connection Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(['push', 'pull'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setLocal(c => ({ ...c, mode }))}
                  className={clsx(
                    'p-4 rounded-xl border text-left transition-all',
                    local.mode === mode
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300',
                  )}
                >
                  <div className="mb-1.5">
                    {mode === 'push' ? <Globe size={18} /> : <Wifi size={18} />}
                  </div>
                  <div className="font-semibold text-sm">{mode === 'push' ? 'Push Mode' : 'Pull Mode'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {mode === 'push' ? 'N9 device sends data here' : 'Fetch from device/server'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Push mode settings */}
          {local.mode === 'push' && (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Push Endpoint</label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                    text-emerald-400 text-sm font-mono break-all">
                    {pushEndpoint}
                  </code>
                  <button
                    onClick={copyEndpoint}
                    className="px-3 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600
                      rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-blue-950/40 border border-blue-500/20 rounded-xl space-y-1.5 text-sm">
                <p className="font-bold text-blue-200 mb-2">N9 Device Setup (Menu → Cloud / ADMS)</p>
                <div className="space-y-1 text-blue-300">
                  <p><span className="text-blue-400 font-medium">Server Address:</span> {pushHost}</p>
                  <p><span className="text-blue-400 font-medium">Server Port:</span> {pushPort}</p>
                  <p><span className="text-blue-400 font-medium">Enable Push:</span> ON</p>
                </div>
                <p className="text-blue-500 text-xs mt-2">
                  The device will upload attendance logs automatically every few seconds.
                </p>
              </div>
            </div>
          )}

          {/* Pull mode settings */}
          {local.mode === 'pull' && (
            <div className="space-y-2">
              <label className="block text-gray-300 text-sm font-semibold mb-2">Device / Server URL</label>
              <input
                type="url"
                value={local.pullUrl ?? ''}
                onChange={e => setLocal(c => ({ ...c, pullUrl: e.target.value }))}
                placeholder="http://192.168.1.100:8080/api/attendance"
                className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                  rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none transition-colors"
              />
              <button
                onClick={testConnection}
                disabled={!local.pullUrl || testState === 'testing'}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors border font-medium disabled:opacity-40',
                  testState === 'ok'    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  testState === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-300',
                )}
              >
                {testState === 'testing' ? 'Testing…' :
                 testState === 'ok'      ? '✓ Connected' :
                 testState === 'error'   ? '✗ Failed' : 'Test Connection'}
              </button>
              <div className="flex gap-1.5 text-xs text-gray-600 pt-1">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-gray-600" />
                <span>Must return JSON: <code className="text-gray-500">{'{ "records": [...] }'}</code></span>
              </div>
            </div>
          )}

          {/* Refresh interval */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Refresh Interval</label>
            <select
              value={local.pollInterval ?? 3000}
              onChange={e => setLocal(c => ({ ...c, pollInterval: parseInt(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-colors"
            >
              <option value={1000}>1 second</option>
              <option value={2000}>2 seconds</option>
              <option value={3000}>3 seconds (recommended)</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>

          {/* Danger zone */}
          <div className="border border-red-900/40 rounded-xl p-4 bg-red-950/20">
            <p className="text-red-400 text-sm font-semibold mb-1">Danger Zone</p>
            <p className="text-gray-500 text-xs mb-3">
              Clears all attendance records from memory. This cannot be undone.
            </p>
            <button
              onClick={handleClear}
              disabled={clearing}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                confirmClear
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-800 border border-red-900/50 hover:border-red-700/50 text-red-400',
              )}
            >
              <Trash2 size={14} />
              {clearing ? 'Clearing…' : confirmClear ? 'Confirm — clear all data' : 'Clear All Records'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700/60 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
