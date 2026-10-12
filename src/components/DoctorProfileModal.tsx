import React, { useState } from 'react';
import {
  X,
  Stethoscope,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
} from 'lucide-react';
import { ApiService, DoctorUser } from '../services/api';

interface DoctorProfileModalProps {
  isOpen: boolean;
  doctor: DoctorUser;
  onClose: () => void;
  onUpdate: (updated: DoctorUser) => void;
  onLogout: () => void;
}

export function DoctorProfileModal({ isOpen, doctor, onClose, onUpdate, onLogout }: DoctorProfileModalProps) {
  const [name, setName] = useState(doctor.name || '');
  const [specialty, setSpecialty] = useState(doctor.specialty || '');
  const [hospital, setHospital] = useState(doctor.hospital || '');

  // Change password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await ApiService.doctorUpdateProfile({
        name,
        specialty,
        hospital,
        phone: doctor.phone || '',
      });
      const updated = {
        ...doctor,
        name,
        specialty,
        hospital,
      };
      ApiService.setCurrentDoctor(updated);
      onUpdate(updated);
      setStatusMessage('Profile updated successfully');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Both current and new passwords are required' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ApiService.getDoctorToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div 
          className="relative px-6 py-5 text-white flex items-center justify-between"
          style={{ backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(30, 58, 138, 0.7)), url(/doctor-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20 overflow-hidden shrink-0">
              {doctor.profilePic ? (
                <img src={doctor.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Stethoscope className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">Doctor Profile & Credentials</h2>
              <p className="text-xs text-blue-200">Authorized NeuroRehab Prescribing Clinician</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.includes('success')
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {statusMessage.includes('success') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor Full Name & Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
              />
            </div>

            {/* Email — read-only */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{doctor.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Specialty
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Neurologist, Cardiologist"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital / Institution
                </label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="e.g. Metro Neurosciences Center"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showPasswordSection ? 'Hide Password Change' : 'Change Password'}</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>

          {/* Change Password Dropdown */}
          {showPasswordSection && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
              <h3 className="text-xs font-bold text-slate-800 mb-2">Change Clinician Password</h3>
              {passwordMsg && (
                <div className={`p-2.5 rounded-lg text-xs mb-3 flex items-center gap-2 ${
                  passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {passwordMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* Sign Out Action */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">Security: End physician session</span>
            <button
              type="button"
              onClick={onLogout}
              className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
