'use client';

import { useState } from 'react';
import { X, Copy, Check, Globe, Wifi, Trash2, HelpCircle, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { Config } from '@/lib/types';

interface Props {
  config: Config;
  onSave: (c: Config) => void;
  onClose: () => void;
  onClear: () => Promise<void>;
}

type TestState = 'idle' | 'testing' | 'ok' | 'error';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-700/40 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-white font-mono text-sm bg-gray-900/60 px-2.5 py-1 rounded-lg">{value}</code>
        <button
          onClick={doCopy}
          title={`Copy ${label}`}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function SettingsModal({ config, onSave, onClose, onClear }: Props) {
  const [local, setLocal] = useState<Config>({ ...config });
  const [testState, setTestState] = useState<TestState>('idle');
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const host  = typeof window !== 'undefined' ? window.location.hostname : 'your-app.vercel.app';
  const port  = typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? '443' : '80') : '443';
  const https = port === '443' ? 'Yes' : 'No';

  const testPull = async () => {
    if (!local.pullUrl) return;
    setTestState('testing');
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(local.pullUrl)}`);
      setTestState(res.ok ? 'ok' : 'error');
    } catch {
      setTestState('error');
    }
    setTimeout(() => setTestState('idle'), 5000);
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
          <h2 className="text-white font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Connection mode ── */}
          <section>
            <label className="block text-white font-semibold text-sm mb-1">Connection Mode</label>
            <p className="text-gray-500 text-xs mb-3">How does data get from the device to this screen?</p>
            <div className="grid grid-cols-2 gap-3">
              {(['push', 'pull'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setLocal(c => ({ ...c, mode }))}
                  className={clsx(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    local.mode === mode
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-gray-700 hover:border-gray-600',
                  )}
                >
                  <div className="mb-1.5">
                    {mode === 'push' ? <Globe size={18} className={local.mode === mode ? 'text-indigo-400' : 'text-gray-500'} /> : <Wifi size={18} className={local.mode === mode ? 'text-indigo-400' : 'text-gray-500'} />}
                  </div>
                  <p className={clsx('font-bold text-sm', local.mode === mode ? 'text-white' : 'text-gray-400')}>
                    {mode === 'push' ? 'Device pushes here' : 'I pull from device'}
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {mode === 'push' ? 'Best for cloud / Vercel' : 'Best for local network'}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* ── Push mode: device setup ── */}
          {local.mode === 'push' && (
            <section>
              <label className="block text-white font-semibold text-sm mb-1">Device Configuration</label>
              <p className="text-gray-500 text-xs mb-3">
                Enter these values into your N9 device under{' '}
                <span className="text-gray-400">Menu → Comm. → Cloud Settings</span>
              </p>
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl px-4 pt-2 pb-1">
                <CopyField label="Server Address" value={host} />
                <CopyField label="Server Port"    value={port} />
                <CopyField label="HTTPS / SSL"    value={https} />
              </div>
              <div className="flex items-start gap-2 mt-3 text-xs text-amber-400/80">
                <HelpCircle size={13} className="flex-shrink-0 mt-0.5 text-amber-500/70" />
                <span>
                  Can&apos;t find Cloud Settings? Try:{' '}
                  <span className="text-amber-500/90">Comm. → ADMS</span> or{' '}
                  <span className="text-amber-500/90">Network → Cloud Server</span>
                </span>
              </div>
            </section>
          )}

          {/* ── Pull mode: URL input ── */}
          {local.mode === 'pull' && (
            <section>
              <label className="block text-white font-semibold text-sm mb-1">Device or Server URL</label>
              <p className="text-gray-500 text-xs mb-3">
                The web address where your device&apos;s attendance data can be read. Must return JSON.
              </p>
              <input
                type="url"
                value={local.pullUrl ?? ''}
                onChange={e => setLocal(c => ({ ...c, pullUrl: e.target.value }))}
                placeholder="http://192.168.1.100:8080/api/attendance"
                className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                  rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none transition-colors"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={testPull}
                  disabled={!local.pullUrl || testState === 'testing'}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-40',
                    testState === 'ok'    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                    testState === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                    'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300',
                  )}
                >
                  {testState === 'testing' ? '⏳ Testing…' :
                   testState === 'ok'      ? '✅ Connected' :
                   testState === 'error'   ? '❌ Failed — check URL' :
                   'Test Connection'}
                </button>
              </div>
              {testState === 'error' && (
                <p className="text-red-400/70 text-xs mt-2">
                  Could not reach that address. Make sure the device is on and the URL is correct.
                  If it&apos;s on a local network, you must be on the same WiFi.
                </p>
              )}
            </section>
          )}

          {/* ── Refresh speed ── */}
          <section>
            <label className="block text-white font-semibold text-sm mb-1">Refresh Speed</label>
            <p className="text-gray-500 text-xs mb-3">How often the screen checks for new scans.</p>
            <select
              value={local.pollInterval ?? 3000}
              onChange={e => setLocal(c => ({ ...c, pollInterval: parseInt(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
            >
              <option value={1000}>Every 1 second — most live, uses more data</option>
              <option value={2000}>Every 2 seconds</option>
              <option value={3000}>Every 3 seconds — recommended</option>
              <option value={5000}>Every 5 seconds</option>
              <option value={10000}>Every 10 seconds — saves data</option>
              <option value={30000}>Every 30 seconds</option>
            </select>
          </section>

          {/* ── Help link ── */}
          <section className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <HelpCircle size={17} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-indigo-200 text-sm font-semibold mb-0.5">Need help connecting your device?</p>
                <p className="text-indigo-400/70 text-xs mb-2">
                  The step-by-step setup guide walks you through everything in plain language.
                </p>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                >
                  <ExternalLink size={12} /> Open Setup Guide
                </button>
              </div>
            </div>
          </section>

          {/* ── Danger zone ── */}
          <section className="border border-red-900/40 rounded-xl p-4 bg-red-950/20">
            <p className="text-red-400 font-semibold text-sm mb-1">Clear Data</p>
            <p className="text-gray-500 text-xs mb-3">
              Removes all attendance records from memory. The device will keep sending new data — this only clears what&apos;s on screen now.
            </p>
            <button
              onClick={handleClear}
              disabled={clearing}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                confirmClear
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-800 border border-red-900/50 hover:border-red-700/60 text-red-400',
              )}
            >
              <Trash2 size={14} />
              {clearing ? 'Clearing…' : confirmClear ? 'Tap again to confirm' : 'Clear All Records'}
            </button>
          </section>
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
