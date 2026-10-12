import React, { useState, useEffect } from 'react';
import { ApiService, DoctorUser } from './services/api';
import { Navbar } from './components/Navbar';
import { DoctorDashboard } from './components/DoctorDashboard';
import { DoctorAuthModal } from './components/DoctorAuthModal';
import { LandingPage } from './components/LandingPage';

export default function App() {
  const [doctor, setDoctor] = useState<DoctorUser | null>(() => ApiService.getCurrentDoctor());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStatus, setDbStatus] = useState<string>('Online');

  useEffect(() => {
    // Check database health
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.database?.status === 'UP') {
          setDbStatus(data.database.engine === 'external-mongodb' ? 'MongoDB Atlas' : 'Embedded Data Engine');
        }
      })
      .catch(() => setDbStatus('Port 3000'));

    // Check if doctor has active session
    async function checkDoctorAuth() {
      if (ApiService.isDoctorAuthenticated()) {
        try {
          const me = await ApiService.doctorGetMe();
          setDoctor(me);
        } catch {
          setDoctor(null);
        }
      } else {
        setDoctor(null);
      }
    }

    checkDoctorAuth();
  }, []);

  function handleLogout() {
    ApiService.doctorLogout();
    setDoctor(null);
    setIsProfileOpen(false);
  }

  if (!doctor) {
    return (
      <>
        <LandingPage onLoginClick={() => setIsAuthModalOpen(true)} />
        <DoctorAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(loggedDoc) => {
            setDoctor(loggedDoc);
            setIsAuthModalOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Clinician Navigation Bar */}
      <Navbar
        doctor={doctor}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAddPatient={() => setIsAddPatientOpen(true)}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Doctor Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DoctorDashboard
          doctor={doctor}
          searchQuery={searchQuery}
          onOpenAddPatient={() => setIsAddPatientOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onDoctorUpdated={(doc) => setDoctor(doc)}
          onDoctorLogout={handleLogout}
          isAddPatientOpen={isAddPatientOpen}
          isProfileOpen={isProfileOpen}
          onCloseAddPatient={() => setIsAddPatientOpen(false)}
          onCloseProfile={() => setIsProfileOpen(false)}
        />
      </main>

      {/* Clinical Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>NeuroRehab Connect • Physician Tele-Rehabilitation Portal & Mobile App API</span>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Database: {dbStatus}</span>
            <span aria-hidden="true">·</span>
            <span>REST API: <code className="text-slate-600 font-mono">/api/v1/*</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
