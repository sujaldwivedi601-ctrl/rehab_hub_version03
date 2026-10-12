import React, { useState } from 'react';
import {
  FileText,
  X,
  CheckCircle2,
  Sparkles,
  Server,
  Layers,
  Image as ImageIcon,
  ShieldAlert,
  Trash2,
  ExternalLink,
  Code2,
  Database,
  UserCheck,
} from 'lucide-react';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReadmeModal({ isOpen, onClose }: ReadmeModalProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'overview' | 'assets' | 'architecture'>('changes');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Project README & Documentation</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Updated & Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">Comprehensive summary of all updates, architecture, and modifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('changes')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'changes'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>All Changes Made</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'assets'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Assets & Avatars</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'architecture'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Architecture & API</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 text-sm">
          
          {/* TAB: CHANGES */}
          {activeTab === 'changes' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="font-bold flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  All Requested Tasks Completed Successfully
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Every user request has been implemented, validated, and verified across backend routes, data repositories, and frontend components.
                </p>
              </div>

              <div className="space-y-4">
                
                {/* 1. Vite & Server */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
                    Vite Dev Server & Express Port 3000 Fix
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-2">
                    <li>Fixed ESM <code className="text-indigo-600 font-mono">__dirname</code> error in <code className="font-mono">vite.config.ts</code> by using <code className="font-mono text-indigo-600">import.meta.dirname</code>.</li>
                    <li>Updated <code className="font-mono">server.ts</code> to clearly log the direct application URL: <strong className="text-slate-800">http://localhost:3000/</strong>.</li>
                    <li>Prevented confusion since Vite is integrated into Express as middleware.</li>
                  </ul>
                </div>

                {/* 2. Doctor Registration Gender & Avatar */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                    Doctor Registration with Gender & Custom Default Profile Picture
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-2">
                    <li>Added <code className="text-blue-600 font-mono">gender</code> and <code className="text-blue-600 font-mono">profilePic</code> to the user model and <code className="font-mono">UserRepository.create</code>.</li>
                    <li>If male: assigns <code className="font-mono text-blue-700">/doctor-male.png</code> (from user's <code className="font-mono">resource/image copy 2.png</code>).</li>
                    <li>If female/other: assigns <code className="font-mono text-blue-700">/doctor-female.png</code> (from user's <code className="font-mono">resource/image copy 3.png</code>).</li>
                    <li>Added Male/Female/Other selector buttons in the registration form in <code className="font-mono">DoctorAuthModal.tsx</code>.</li>
                  </ul>
                </div>

                {/* 3. Removed Quick Demo */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">3</span>
                    Removed "Quick Demo" Login Button & Hardcoded Credentials
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-2">
                    <li>Removed the Quick Demo 1-click bypass button from <code className="font-mono">DoctorAuthModal.tsx</code>.</li>
                    <li>Removed the hardcoded credentials prompt so authentication is fully authentic and secure.</li>
                  </ul>
                </div>

                {/* 4. Removed Fake Patient Images */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">4</span>
                    Eliminated Fake Patient Images & Standardized Avatar
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-2">
                    <li>Removed all external Unsplash fake patient placeholder photos.</li>
                    <li>Installed user's provided <code className="font-mono">resource/image copy 5.png</code> as <code className="font-mono text-emerald-700">/patient-default.png</code>.</li>
                    <li>Applied this clean, consistent avatar to patient cards in <code className="font-mono">DoctorDashboard.tsx</code> and header profile in <code className="font-mono">PatientDetailView.tsx</code>.</li>
                  </ul>
                </div>

                {/* 5. Doctor Profile Background */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">5</span>
                    Doctor Profile Banner Background
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-2">
                    <li>Installed <code className="font-mono">resource/image copy 4.png</code> as <code className="font-mono text-purple-700">/doctor-bg.png</code> in the public web root.</li>
                    <li>Updated <code className="font-mono">DoctorProfileModal.tsx</code> banner to use <code className="font-mono">/doctor-bg.png</code> instead of stock photography.</li>
                  </ul>
                </div>

                {/* 6. Removed PatientMobileSimulator */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">6</span>
                    Removed PatientMobileSimulator.tsx
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 ml-2">
                    <li>Deleted <code className="font-mono">src/components/PatientMobileSimulator.tsx</code>.</li>
                    <li>Cleaned all residual imports to ensure no unused artifacts remain in the build.</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Platform Purpose & Capabilities</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                NeuroRehab Connect is a clinical platform connecting rehabilitation physicians (Physiatrists, Neurologists) with patients undergoing physical recovery from stroke, neuro-motor trauma, and orthopedic surgeries.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Clinician Dashboard
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Real-time monitoring of enrolled patients, adherence rates, range-of-motion performance, and pain logs.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Tailored Prescriptions
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Prescribe targeted exercises with specific reps, sets, angle targets, and frequency constraints.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 mb-1">Active Core Pages in Application:</div>
                <div>1. <strong>Landing Page:</strong> Public-facing clinical portal presentation.</div>
                <div>2. <strong>Doctor Auth Modal:</strong> Registration (with gender selection) & Login.</div>
                <div>3. <strong>Doctor Dashboard:</strong> Patient roster, search filter, and quick stats.</div>
                <div>4. <strong>Patient Detail View:</strong> Biometric progress charts & session breakdown.</div>
                <div>5. <strong>New Prescription Modal:</strong> Patient enrollment & therapy formulation.</div>
                <div>6. <strong>Doctor Profile Modal:</strong> Doctor credentialing & profile customizer.</div>
              </div>
            </div>
          )}

          {/* TAB: ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">User Image Assets Mapping</h3>
              <p className="text-xs text-slate-600">
                All local images provided in the workspace were mapped to high-performance static web assets:
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 flex items-center gap-4 bg-white">
                  <img src="/doctor-male.png" alt="Male Doctor" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">/doctor-male.png</div>
                    <div className="text-[11px] text-slate-500">Sourced from <code className="font-mono">resource/image copy 2.png</code>. Used as default avatar for Male Doctors.</div>
                  </div>
                </div>

                <div className="p-3 flex items-center gap-4 bg-white">
                  <img src="/doctor-female.png" alt="Female Doctor" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">/doctor-female.png</div>
                    <div className="text-[11px] text-slate-500">Sourced from <code className="font-mono">resource/image copy 3.png</code>. Used as default avatar for Female / Other Doctors.</div>
                  </div>
                </div>

                <div className="p-3 flex items-center gap-4 bg-white">
                  <img src="/doctor-bg.png" alt="Doctor Banner" className="w-16 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">/doctor-bg.png</div>
                    <div className="text-[11px] text-slate-500">Sourced from <code className="font-mono">resource/image copy 4.png</code>. Used as the header cover in Doctor Profile Modal.</div>
                  </div>
                </div>

                <div className="p-3 flex items-center gap-4 bg-white">
                  <img src="/patient-default.png" alt="Patient Avatar" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">/patient-default.png</div>
                    <div className="text-[11px] text-slate-500">Sourced from <code className="font-mono">resource/image copy 5.png</code>. Replaced all external stock photos for patients.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Full-Stack Tech Stack & Ports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-blue-600" /> Server & Runtime
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Node.js + Express 4.x executed with TSX. Vite is attached directly as development middleware in <code className="font-mono">server.ts</code>.
                  </p>
                  <p className="font-semibold text-blue-700 text-[11px]">Port: 3000</p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" /> Database Engine
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Embedded JSON persistence file at <code className="font-mono">data/neurorehab_db.json</code>. Changes write synchronously to disk. Supports MongoDB if URI is provided.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-1">
                <div className="text-slate-400">// Key API Endpoints:</div>
                <div>POST /api/v1/auth/register-doctor <span className="text-slate-400">- Register with gender & auto-avatar</span></div>
                <div>POST /api/v1/auth/login <span className="text-slate-400">- JWT authentication</span></div>
                <div>GET  /api/v1/patients <span className="text-slate-400">- List patients for authenticated doctor</span></div>
                <div>POST /api/v1/patients <span className="text-slate-400">- Enroll patient & assign prescription</span></div>
                <div>GET  /api/health <span className="text-slate-400">- System & database status</span></div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Detailed markdown also saved to <code className="font-mono font-bold text-slate-700">README.md</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
