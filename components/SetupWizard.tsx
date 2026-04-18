'use client';

import { useState } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle2, Globe, Wifi,
  Copy, Check, Fingerprint, MonitorSmartphone,
} from 'lucide-react';
import clsx from 'clsx';
import type { Config } from '@/lib/types';

interface Props {
  onComplete: (config: Config) => void;
}

// ── Progress bar ────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-1.5 rounded-full transition-all duration-500',
            i < current ? 'bg-indigo-500 flex-1' :
            i === current ? 'bg-indigo-400 flex-[2]' :
            'bg-gray-700 flex-1',
          )}
        />
      ))}
    </div>
  );
}

// ── Checklist item ──────────────────────────────────────────────────────

function Check4({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0 mt-0.5" />
      <span className="text-gray-300 text-sm">{text}</span>
    </li>
  );
}

// ── Numbered step ───────────────────────────────────────────────────────

function NumStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl p-3.5">
      <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-indigo-300 text-xs font-bold">{n}</span>
      </div>
      <p className="text-gray-300 text-sm pt-0.5">{text}</p>
    </div>
  );
}

// ── Copy row ────────────────────────────────────────────────────────────

function CopyRow({
  label, value, onCopy, copied,
}: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-700/40 last:border-0">
      <span className="text-gray-400 text-sm">{label}:</span>
      <div className="flex items-center gap-2">
        <code className="text-white font-mono text-sm bg-gray-900/70 px-2.5 py-1 rounded-lg">
          {value}
        </code>
        <button
          onClick={onCopy}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Copy"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Main wizard ─────────────────────────────────────────────────────────

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'push' | 'pull'>('push');
  const [pullUrl, setPullUrl] = useState('');
  const [pollInterval, setPollInterval] = useState(3000);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';
  const host   = typeof window !== 'undefined' ? window.location.hostname : 'your-app.vercel.app';
  const port   = typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? '443' : '80') : '443';
  const https  = port === '443' ? 'Yes' : 'No';

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const testPull = async () => {
    setTestState('testing');
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(pullUrl)}`);
      setTestState(res.ok ? 'ok' : 'error');
    } catch {
      setTestState('error');
    }
    setTimeout(() => setTestState('idle'), 5000);
  };

  const finish = () =>
    onComplete({ mode, pullUrl: mode === 'pull' ? pullUrl : undefined, pollInterval });

  // ── Step 0: Welcome ────────────────────────────────────────────────

  const StepWelcome = (
    <div className="text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
        <Fingerprint size={42} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Welcome to Biometric Live</h1>
      <p className="text-gray-400 text-lg mb-8 max-w-sm mx-auto">
        See who checks in and out on a live screen — updated in seconds.
      </p>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 mb-8 text-left">
        <p className="text-white font-semibold text-sm mb-3">Before you start, you need:</p>
        <ul className="space-y-2.5">
          <Check4 text="Your ZKTeco biometric device (N9, RS-9N, or similar) turned on" />
          <Check4 text="The device connected to the internet — either via WiFi or ethernet cable to your router" />
          <Check4 text="About 5 minutes" />
        </ul>
      </div>

      <button
        onClick={() => setStep(1)}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl
          font-bold text-lg transition-colors flex items-center justify-center gap-2"
      >
        Let&apos;s Begin <ChevronRight size={20} />
      </button>
    </div>
  );

  // ── Step 1: Choose mode ────────────────────────────────────────────

  const StepMode = (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">How is your device connected?</h2>
      <p className="text-gray-400 mb-6 text-sm">
        This tells the dashboard how to receive data from your device.
      </p>

      <div className="space-y-3 mb-8">
        <button
          onClick={() => setMode('push')}
          className={clsx(
            'w-full p-4 rounded-xl border-2 text-left transition-all',
            mode === 'push' ? 'border-indigo-500 bg-indigo-600/10' : 'border-gray-700 hover:border-gray-600',
          )}
        >
          <div className="flex items-start gap-3">
            <Globe size={22} className={clsx('flex-shrink-0 mt-0.5', mode === 'push' ? 'text-indigo-400' : 'text-gray-500')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={clsx('font-bold', mode === 'push' ? 'text-white' : 'text-gray-300')}>
                  My device can reach the internet
                </span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold flex-shrink-0">
                  Recommended
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                Device pushes data directly to this dashboard. Works from anywhere in the world.
                Best for offices using Vercel or any cloud server.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('pull')}
          className={clsx(
            'w-full p-4 rounded-xl border-2 text-left transition-all',
            mode === 'pull' ? 'border-indigo-500 bg-indigo-600/10' : 'border-gray-700 hover:border-gray-600',
          )}
        >
          <div className="flex items-start gap-3">
            <Wifi size={22} className={clsx('flex-shrink-0 mt-0.5', mode === 'pull' ? 'text-indigo-400' : 'text-gray-500')} />
            <div className="flex-1 min-w-0">
              <p className={clsx('font-bold mb-1', mode === 'pull' ? 'text-white' : 'text-gray-300')}>
                My device is only on the office network
              </p>
              <p className="text-gray-500 text-sm">
                Dashboard fetches from a local server or device IP. Only works when you&apos;re on the same WiFi.
                You&apos;ll need the device&apos;s IP address.
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(0)}
          className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl
            font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={() => setStep(2)}
          className="flex-[3] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl
            font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // ── Step 2: Configure ──────────────────────────────────────────────

  const StepConfigure = (
    <div>
      {mode === 'push' ? (
        <>
          <h2 className="text-2xl font-bold text-white mb-2">Set up your N9 device</h2>
          <p className="text-gray-400 text-sm mb-5">
            Follow these steps on the device screen. It only takes 2 minutes.
          </p>

          <div className="space-y-2 mb-5">
            <NumStep n={1} text='On your N9 device, press the ☰ Menu button (bottom left).' />
            <NumStep n={2} text='Go to: Comm. → Cloud Settings  (or: Communication → ADMS Settings)' />
            <NumStep n={3} text='Type in the Server Address and Port shown below.' />
            <NumStep n={4} text='Set "Enable Push" to ON, then save.' />
            <NumStep n={5} text='The device will restart and start sending data here.' />
          </div>

          {/* Settings box */}
          <div className="bg-gray-800/60 border border-indigo-500/25 rounded-xl px-4 pt-3 pb-1 mb-4">
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">
              Type these into the device:
            </p>
            <CopyRow label="Server Address" value={host}  onCopy={() => copy(host,  'host')}  copied={copiedKey === 'host'} />
            <CopyRow label="Server Port"    value={port}  onCopy={() => copy(port,  'port')}  copied={copiedKey === 'port'} />
            <CopyRow label="HTTPS / SSL"    value={https} onCopy={() => copy(https, 'https')} copied={copiedKey === 'https'} />
          </div>

          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3.5 mb-5 text-sm text-amber-300">
            <strong className="text-amber-200">Can&apos;t find Cloud Settings?</strong>{' '}
            Try these alternate paths on your device:<br />
            <span className="text-amber-400/80 text-xs">
              Menu → Comm. → Cloud &nbsp;·&nbsp; Menu → Network → ADMS &nbsp;·&nbsp; Menu → Setup → Cloud Server
            </span>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-white mb-2">Enter your device address</h2>
          <p className="text-gray-400 text-sm mb-5">
            This is the web address where your device&apos;s attendance data can be fetched.
            Ask your IT person if you&apos;re unsure.
          </p>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Device or Server Web Address (URL)
            </label>
            <input
              type="url"
              value={pullUrl}
              onChange={e => setPullUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080/api/attendance"
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors text-sm"
            />
            <p className="text-gray-600 text-xs mt-1.5">
              Example: <code className="text-gray-500">http://192.168.1.100:8080/api/attendance</code>
            </p>
          </div>

          <button
            onClick={testPull}
            disabled={!pullUrl || testState === 'testing'}
            className={clsx(
              'w-full py-2.5 rounded-xl font-semibold text-sm transition-all border mb-5 disabled:opacity-40',
              testState === 'ok'    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' :
              testState === 'error' ? 'bg-red-500/15 border-red-500/40 text-red-300' :
              'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300',
            )}
          >
            {testState === 'testing' ? '⏳ Testing connection…' :
             testState === 'ok'      ? '✅ Connected! The URL works.' :
             testState === 'error'   ? '❌ Could not connect — check the URL and try again.' :
             '→ Test Connection'}
          </button>

          <div className="mb-5">
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              How often to check for new records
            </label>
            <select
              value={pollInterval}
              onChange={e => setPollInterval(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500
                rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
            >
              <option value={2000}>Every 2 seconds — most live</option>
              <option value={3000}>Every 3 seconds — recommended</option>
              <option value={5000}>Every 5 seconds</option>
              <option value={10000}>Every 10 seconds</option>
            </select>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl
            font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={mode === 'pull' && !pullUrl}
          className="flex-[3] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl
            font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {mode === 'push' ? "Done — I've entered those settings" : 'Continue'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // ── Step 3: All done ───────────────────────────────────────────────

  const StepDone = (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40
        flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={44} className="text-emerald-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-3">You&apos;re all set!</h2>
      <p className="text-gray-400 text-lg mb-7 max-w-sm mx-auto">
        {mode === 'push'
          ? 'Your dashboard is ready. The moment someone scans, it will appear here — live.'
          : 'Your dashboard will start showing records automatically.'}
      </p>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 mb-8 text-left">
        <p className="text-gray-200 font-semibold text-sm mb-3">What happens next:</p>
        <ul className="space-y-2.5">
          {(mode === 'push'
            ? [
                'Your N9 device connects and starts sending scan data',
                'Every fingerprint or card tap appears here within seconds',
                'Green card = Checked In   •   Red card = Checked Out',
                'You can enable sound alerts with the 🔇 button in the top bar',
              ]
            : [
                'The dashboard checks your device URL every few seconds',
                'New records appear automatically — no refresh needed',
                'Green = Checked In   •   Red = Checked Out',
              ]
          ).map((t, i) => <Check4 key={i} text={t} />)}
        </ul>
      </div>

      <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4 mb-6 text-left">
        <div className="flex items-start gap-3">
          <MonitorSmartphone size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-indigo-200 text-sm font-semibold mb-0.5">Tip: Pin this page</p>
            <p className="text-indigo-400/80 text-xs">
              Add this page to your home screen or bookmark it for instant access on any device.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={finish}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl
          font-bold text-lg transition-colors"
      >
        Open Dashboard →
      </button>
    </div>
  );

  const steps = [StepWelcome, StepMode, StepConfigure, StepDone];
  const labels = ['Welcome', 'Connection', 'Device Setup', 'Done'];

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-xl">
          {/* Step label + progress */}
          {step < 4 && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className="font-medium">{labels[step]}</span>
                <span>Step {step + 1} of {steps.length}</span>
              </div>
              <StepBar current={step} total={steps.length} />
            </div>
          )}

          <div>{steps[step]}</div>
        </div>
      </div>
    </div>
  );
}
