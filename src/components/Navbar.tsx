import React, { useState } from 'react';
import {
  Brain,
  Stethoscope,
  User,
  Plus,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Shield,
  Search,
} from 'lucide-react';
import { DoctorUser } from '../services/api';

interface NavbarProps {
  doctor: DoctorUser | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenAddPatient: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function Navbar({
  doctor,
  onOpenAuth,
  onOpenProfile,
  onOpenAddPatient,
  onLogout,
  searchQuery,
  onSearchChange,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight">NeuroRehab Connect</span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Doctor Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Clinical Prescription, Motor Rehabilitation & Biometric Verification
              </p>
            </div>
          </div>

          {/* Search bar (Desktop) */}
          {doctor && (
            <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search patients by name or diagnosis..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden transition"
                />
              </div>
            </div>
          )}

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            {doctor ? (
              <>
                <button
                  type="button"
                  onClick={onOpenAddPatient}
                  className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Prescribe Patient</span>
                </button>

                {/* Doctor User Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDoctorDropdownOpen(!doctorDropdownOpen)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-left"
                  >
                    {doctor.profilePic ? (
                      <img src={doctor.profilePic} alt="Profile" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-left hidden lg:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">{doctor.name}</div>
                      <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[130px]">
                        {doctor.specialty || 'Neurology MD'}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {doctorDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95"
                      onClick={() => setDoctorDropdownOpen(false)}
                    >
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-900">{doctor.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{doctor.email}</div>
                        <div className="text-[10px] text-blue-700 font-semibold mt-0.5">{doctor.hospital || 'Clinical Center'}</div>
                      </div>

                      <button
                        type="button"
                        onClick={onOpenProfile}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Doctor Profile & Credentials</span>
                      </button>

                      <button
                        type="button"
                        onClick={onLogout}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center gap-1.5">
            {doctor && (
              <button
                type="button"
                onClick={onOpenAddPatient}
                className="p-2 bg-blue-600 text-white rounded-xl shadow-xs"
                title="Prescribe Patient"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3 animate-in slide-in-from-top-2">
          {doctor && (
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          )}

          {doctor ? (
            <div className="space-y-2 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{doctor.name}</div>
                  <div className="text-[11px] text-slate-500">{doctor.specialty || 'Neurology'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="px-2.5 py-1 bg-white text-blue-700 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  Profile
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAddPatient();
                }}
                className="w-full py-2.5 px-4 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Prescribe New Patient</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2 px-4 bg-rose-50 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Sign In / Register</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
