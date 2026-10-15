import React, { useState, useEffect } from 'react';
import {
  Activity,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Stethoscope,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Utensils,
  AlertCircle,
  Clock,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ApiService, DoctorUser } from '../services/api';
import { firestoreDb } from '../services/firebaseSync';
import { PatientMiniDetailCard } from './PatientMiniDetailCard';
import { FullPatientDetailView } from './FullPatientDetailView';
import { NewPatientPrescriptionModal } from './NewPatientPrescriptionModal';
import { DoctorProfileModal } from './DoctorProfileModal';

interface DoctorDashboardProps {
  doctor: DoctorUser | null;
  searchQuery: string;
  onOpenAddPatient: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onDoctorUpdated: (doc: DoctorUser) => void;
  onDoctorLogout: () => void;
  isAddPatientOpen: boolean;
  isProfileOpen: boolean;
  onCloseAddPatient: () => void;
  onCloseProfile: () => void;
}

export function DoctorDashboard({
  doctor,
  searchQuery,
  onOpenAddPatient,
  onOpenProfile,
  onOpenAuth,
  onDoctorUpdated,
  onDoctorLogout,
  isAddPatientOpen,
  isProfileOpen,
  onCloseAddPatient,
  onCloseProfile,
}: DoctorDashboardProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_activation'>('all');

  // Full Page Detail View State (triggered by "View Whole Detail" button)
  const [isFullDetailViewOpen, setIsFullDetailViewOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllToast, setSyncAllToast] = useState<string | null>(null);

  // Load patients list for current doctor
  useEffect(() => {
    if (!doctor) {
      setPatients([]);
      setSelectedPatientId(null);
      setPatientDetails(null);
      setLoading(false);
      return;
    }

    loadPatients();
  }, [doctor]);

  // Real-time Firestore & backend synchronization
  useEffect(() => {
    let unsubscribeFirestore = () => {};
    try {
      const colRef = collection(firestoreDb, 'patients');
      unsubscribeFirestore = onSnapshot(
        colRef,
        () => {
          // Instantly refresh patients in the background when Firestore document changes
          ApiService.getDoctorPatients().then((list) => {
            if (list && list.length > 0) {
              setPatients(list);
            }
          }).catch(() => {});
        },
        (err) => {
          console.warn('Real-time Firestore snapshot listener note:', err?.message || err);
        }
      );
    } catch (e) {
      console.warn('Firestore subscription note:', e);
    }

    // Polling fallback every 3.5 seconds to guarantee instant real-time synchronization
    const timer = setInterval(() => {
      ApiService.getDoctorPatients().then((list) => {
        if (list && list.length > 0) {
          setPatients(list);
        }
      }).catch(() => {});
    }, 3500);

    return () => {
      unsubscribeFirestore();
      clearInterval(timer);
    };
  }, []);

  async function loadPatients(targetSelectId?: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await ApiService.getDoctorPatients();
      setPatients(list || []);

      if (list && list.length > 0) {
        if (targetSelectId) {
          const match = list.find(
            (p: any) =>
              p.user?._id === targetSelectId ||
              p.user?.patientCode === targetSelectId ||
              p.profile?.patientCode === targetSelectId ||
              p.profile?.mrn === targetSelectId
          );
          if (match) {
            setSelectedPatientId(match.user._id);
          } else if (!selectedPatientId || !list.some((p: any) => p.user?._id === selectedPatientId)) {
            setSelectedPatientId(list[0].user?._id);
          }
        } else if (!selectedPatientId || !list.some((p: any) => p.user?._id === selectedPatientId)) {
          setSelectedPatientId(list[0].user?._id);
        }
      } else {
        setSelectedPatientId(null);
        setPatientDetails(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve assigned patients');
    } finally {
      setLoading(false);
    }
  }

  // Fetch details of selected patient
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetails(null);
      return;
    }

    async function fetchDetails() {
      try {
        const details = await ApiService.getPatientDetails(selectedPatientId!);
        setPatientDetails(details);
      } catch (err: any) {
        console.error('Error fetching patient details:', err);
      }
    }

    fetchDetails();
  }, [selectedPatientId]);

  async function handleSyncAllToMobile() {
    setIsSyncingAll(true);
    try {
      const res = await ApiService.syncAllPatientsWithFirebase();
      setSyncAllToast(res.message || 'All patients synced to Mobile App Firestore');
      setTimeout(() => setSyncAllToast(null), 4500);
      await loadPatients();
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err}`);
    } finally {
      setIsSyncingAll(false);
    }
  }

  // Filter patients by query and status
  const filteredPatients = patients.filter((p) => {
    const matchesStatus =
      statusFilter === 'all' || p.user?.accountStatus === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q) ||
      p.user?.patientCode?.toLowerCase().includes(q) ||
      p.profile?.patientCode?.toLowerCase().includes(q) ||
      p.profile?.mrn?.toLowerCase().includes(q) ||
      p.profile?.primaryDiagnosis?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // If doctor requested "View Whole Detail", render the dedicated Full Patient Page
  if (isFullDetailViewOpen && patientDetails) {
    return (
      <div className="space-y-6">
        <FullPatientDetailView
          patientData={patientDetails}
          doctor={doctor}
          onBack={() => setIsFullDetailViewOpen(false)}
          onRefresh={() => {
            if (selectedPatientId) {
              ApiService.getPatientDetails(selectedPatientId).then(setPatientDetails);
            }
            loadPatients();
          }}
        />

        {/* Prescription Modal */}
        <NewPatientPrescriptionModal
          isOpen={isAddPatientOpen}
          onClose={onCloseAddPatient}
          onCreated={() => {
            loadPatients();
          }}
          doctor={doctor}
        />

        {/* Doctor Profile Modal */}
        {doctor && (
          <DoctorProfileModal
            isOpen={isProfileOpen}
            doctor={doctor}
            onClose={onCloseProfile}
            onUpdate={onDoctorUpdated}
            onLogout={onDoctorLogout}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinician Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                Authorized Clinician Portal
              </span>
              <span className="text-xs text-blue-300/80">·</span>
              <span className="text-xs text-blue-300 font-medium">Tele-Rehabilitation Management</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {doctor ? `Welcome, ${doctor.name}` : 'Clinical Physician Portal'}
            </h1>

            {doctor ? (
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100 mt-2">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-300" />
                  <span><strong>{patients.length}</strong> Patient{patients.length !== 1 ? 's' : ''} Enrolled</span>
                </div>
                {doctor.hospital && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-blue-300" />
                      <span>{doctor.hospital}</span>
                    </div>
                  </>
                )}
                {doctor.specialty && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-blue-300" />
                      <span className="font-medium bg-blue-800/50 px-2 py-0.5 rounded-md border border-blue-400/20">{doctor.specialty}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed">
                Sign in to prescribe exercises, games, meal timings, and view patient progress in real-time.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {doctor ? (
              <button
                type="button"
                onClick={onOpenAddPatient}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Prescribe New Patient</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="py-2.5 px-5 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Clinician Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync All Toast */}
      {syncAllToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncAllToast}</span>
        </div>
      )}

      {/* Main 2-Column Split View: Left Patient List (4 cols), Right Mini Detail Card (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Patient List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Assigned Patients ({filteredPatients.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSyncAllToMobile}
              disabled={isSyncingAll}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              title="Sync all patients to Mobile App Firestore"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Syncing...' : 'Sync All'}</span>
            </button>
          </div>

          {/* Quick Select by Patient ID */}
          <div className="space-y-1.5 p-2.5 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
              <Search className="w-3 h-3 text-blue-600" />
              Quick Select Patient by ID:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['PT-4028', '482019', '912440', '459107'].map((code) => {
                const targetPatient = patients.find(
                  (p) => p.user?.patientCode === code || p.profile?.patientCode === code
                );
                const isCurrent = targetPatient && selectedPatientId === targetPatient.user?._id;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (targetPatient) {
                        setSelectedPatientId(targetPatient.user?._id);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer border ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    #{code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({patients.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending_activation')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
                statusFilter === 'pending_activation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pending
            </button>
          </div>

          {/* Patients List Items */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin text-blue-600 mb-2" />
              <span>Loading patient accounts...</span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-3">
              <User className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No patients match filter.</p>
              <button
                type="button"
                onClick={onOpenAddPatient}
                className="py-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                + Prescribe Patient
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredPatients.map((p) => {
                const isSelected = selectedPatientId === p.user?._id;
                const patientCode = p.user?.patientCode || p.profile?.patientCode || 'PT';
                const photo =
                  p.profile?.profilePhotoUrl ||
                  '/patient-default.png';

                return (
                  <button
                    key={p.user?._id}
                    type="button"
                    onClick={() => setSelectedPatientId(p.user?._id)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Patient Photo */}
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={photo}
                        alt={p.user?.name}
                        className="w-11 h-11 rounded-xl object-cover ring-2 ring-emerald-500/40 shadow-xs"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs">
                        <Shield className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {p.user?.name}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                            #{patientCode}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
                            p.user?.accountStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.user?.accountStatus === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {p.profile?.primaryDiagnosis || 'Post-stroke rehab'}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                        <span>{p.profile?.mrn || 'MRN-PENDING'}</span>
                        <span>•</span>
                        <span>{p.activeActivitiesCount || 4} Prescribed</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Mobile Synced</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: MINI DETAILS VIEW (8 cols) - Minimal, Unjumbled with "View Whole Detail" */}
        <div className="lg:col-span-8">
          {patientDetails ? (
            <PatientMiniDetailCard
              patientData={patientDetails}
              doctor={doctor}
              onViewWholeDetail={() => setIsFullDetailViewOpen(true)}
              onRefresh={() => {
                if (selectedPatientId) {
                  ApiService.getPatientDetails(selectedPatientId).then(setPatientDetails);
                }
                loadPatients();
              }}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">Select a Patient to View Protocol</h3>
                <p className="text-xs text-slate-500">
                  Select a patient from the list on the left to see their quick adherence overview and access their full graphical tracking dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddPatient}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Prescribe New Patient</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prescription / New Patient Modal */}
      <NewPatientPrescriptionModal
        isOpen={isAddPatientOpen}
        onClose={onCloseAddPatient}
        onCreated={(res: any) => {
          const newUserId = res?.patient?._id || res?.patient?.patientCode;
          loadPatients(newUserId);
          if (newUserId) {
            setSelectedPatientId(newUserId);
          }
        }}
        doctor={doctor}
      />

      {/* Doctor Profile Modal */}
      {doctor && (
        <DoctorProfileModal
          isOpen={isProfileOpen}
          doctor={doctor}
          onClose={onCloseProfile}
          onUpdate={onDoctorUpdated}
          onLogout={onDoctorLogout}
        />
      )}
    </div>
  );
}
