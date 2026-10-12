import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Shield,
  Lock,
  Database,
  RefreshCw,
  Clock,
  Terminal,
  Send,
  Code2,
} from 'lucide-react';
import { ApiService, API_BASE } from '../services/api';

export function TestVerificationSuite() {
  const [testData, setTestData] = useState<any | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  // Live API Probe tool
  const [endpointMethod, setEndpointMethod] = useState<'GET' | 'POST'>('GET');
  const [probeEndpoint, setProbeEndpoint] = useState<string>('/api/health');
  const [probeResponse, setProbeResponse] = useState<any | null>(null);
  const [probing, setProbing] = useState<boolean>(false);

  const executeSuite = async () => {
    setRunning(true);
    try {
      const data = await ApiService.runAutomatedTests();
      setTestData(data);
    } catch (err: any) {
      alert(`Test run failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const executeProbe = async () => {
    setProbing(true);
    try {
      const res = await fetch(probeEndpoint, {
        method: endpointMethod,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ApiService.getDoctorToken() || ''}`,
        },
      });
      const json = await res.json();
      setProbeResponse({
        status: res.status,
        ok: res.ok,
        data: json,
      });
    } catch (err: any) {
      setProbeResponse({
        status: 500,
        ok: false,
        data: { error: err.message },
      });
    } finally {
      setProbing(false);
    }
  };

  const results = testData?.results || [];
  const filteredResults = results.filter((r: any) => {
    if (filter === 'passed') return r.passed;
    if (filter === 'failed') return !r.passed;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Test Runner Hero Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Section 14 — Automated Acceptance & Verification Suite</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Executes rigorous integration assertions across Authentication, RBAC data isolation, doctor assignments, idempotent synchronization, and offline retry logic directly against the running Node.js / MongoDB backend.
          </p>
        </div>

        <button
          onClick={executeSuite}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2 transition"
        >
          {running ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Executing Test Harness...' : 'Run All Acceptance Tests'}
        </button>
      </div>

      {/* Summary Scorecard */}
      {testData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tests</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{testData.summary.total}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Passing</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{testData.summary.passed}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Failing</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{testData.summary.failed}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Harness Duration</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{testData.summary.durationMs}ms</div>
          </div>
        </div>
      )}

      {/* Test Matrix */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Integration Test Results</h3>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'passed' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Passed
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1 rounded-md transition ${
                filter === 'failed' ? 'bg-white shadow-xs text-red-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {!testData ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed rounded-lg">
            Click "Run All Acceptance Tests" above to execute the integration verification suite.
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No tests match current filter.</div>
        ) : (
          <div className="space-y-2.5">
            {filteredResults.map((test: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{test.name}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-[11px] font-mono text-slate-500">{test.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{test.details}</p>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-400 shrink-0">{test.durationMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live REST API Probe / Playground */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h3 className="font-bold text-slate-900 text-sm">Interactive API Playground (Section 9 & 10)</h3>
        </div>
        <p className="text-xs text-slate-500">
          Probe backend endpoints directly from the browser to inspect live JSON responses.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={endpointMethod}
            onChange={(e) => setEndpointMethod(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>

          <input
            type="text"
            value={probeEndpoint}
            onChange={(e) => setProbeEndpoint(e.target.value)}
            placeholder="/api/health or /api/v1/patient/me"
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
          />

          <button
            onClick={executeProbe}
            disabled={probing}
            className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            {probing ? 'Calling...' : 'Send Request'}
          </button>
        </div>

        {/* Quick Endpoint Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Presets:</span>
          <button
            type="button"
            onClick={() => {
              setEndpointMethod('GET');
              setProbeEndpoint('/api/health');
            }}
            className="text-blue-600 hover:underline font-mono text-[11px]"
          >
            /api/health
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => {
              setEndpointMethod('GET');
              setProbeEndpoint('/api/v1/doctor/patients');
            }}
            className="text-blue-600 hover:underline font-mono text-[11px]"
          >
            /api/v1/doctor/patients
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => {
              setEndpointMethod('GET');
              setProbeEndpoint('/api/v1/science/protocols');
            }}
            className="text-blue-600 hover:underline font-mono text-[11px]"
          >
            /api/v1/science/protocols
          </button>
        </div>

        {/* Probe Output */}
        {probeResponse && (
          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-2 overflow-x-auto">
            <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800 pb-1.5">
              <span>Status: {probeResponse.status}</span>
              <span>{probeResponse.ok ? 'HTTP OK' : 'HTTP ERROR'}</span>
            </div>
            <pre className="text-[11px] leading-relaxed">
              {JSON.stringify(probeResponse.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
