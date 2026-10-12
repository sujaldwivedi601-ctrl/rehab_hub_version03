import React from 'react';
import { motion } from 'motion/react';
import { Activity, Users, ActivitySquare, ArrowRight, Play, CheckCircle2, TrendingUp, HeartPulse, Brain } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              NeuroRehab<span className="text-blue-600">Connect</span>
            </span>
          </div>
          <button
            onClick={onLoginClick}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-sm shadow-blue-600/20 transition-all active:scale-95"
          >
            Clinician Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Tele-Rehabilitation Platform
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              Empower patient recovery beyond the <span className="text-blue-600">clinic walls.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
              NeuroRehab Connect bridges the gap between clinical visits. Assign tailored physical and cognitive therapies, monitor adherence in real-time, and make data-driven adjustments to ensure optimal recovery.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button
                onClick={onLoginClick}
                className="px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Access Dashboard <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3.5 text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                See How It Works
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-white rounded-3xl transform rotate-3 scale-105 -z-10" />
            <img
              src="/hero-doctor.png"
              alt="Doctor analyzing patient dashboard"
              className="rounded-2xl shadow-2xl border border-slate-200/60 object-cover w-full"
            />
            
            {/* Floating UI Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600 w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Adherence Rate</p>
                <p className="text-xl font-bold text-slate-900">87% <span className="text-sm font-normal text-green-600">↑ 12%</span></p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The Cycle / Two-Way System */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">A Seamless Two-Way System</h2>
            <p className="text-lg text-slate-600">
              Our continuous feedback loop ensures that patients are performing the right exercises, and doctors have the right data to guide them.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4 items-center">
            {[
              { step: 1, title: 'Assign', icon: <ActivitySquare className="w-6 h-6" /> },
              { step: 2, title: 'Perform', icon: <Play className="w-6 h-6" /> },
              { step: 3, title: 'Record', icon: <CheckCircle2 className="w-6 h-6" /> },
              { step: 4, title: 'Review', icon: <Users className="w-6 h-6" /> },
              { step: 5, title: 'Update', icon: <HeartPulse className="w-6 h-6" /> },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative flex flex-col items-center text-center p-4"
              >
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm border border-blue-100 z-10 relative">
                  {item.icon}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                
                {/* Arrow connector */}
                {index < 4 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-blue-100 -z-0">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-blue-200"></div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 relative"
            >
              <div className="absolute inset-0 bg-blue-600/5 rounded-3xl transform -rotate-3 scale-105" />
              <img
                src="/feature-exercise.png"
                alt="Patient performing exercises"
                className="rounded-2xl shadow-xl object-cover"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2 space-y-6"
            >
              <h2 className="text-3xl font-bold text-slate-900">Guided Recovery at Home</h2>
              <p className="text-lg text-slate-600">
                Patients perform their physical therapies and cognitive games in the comfort of their home using our mobile app. The application utilizes computer vision to accurately record kinematics and validate exercises.
              </p>
              <ul className="space-y-3">
                {[
                  'Real-time joint tracking and angle measurement',
                  'Interactive cognitive rehabilitation games',
                  'Instant feedback on form and cadence',
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold text-slate-900">Data-Driven Adjustments</h2>
              <p className="text-lg text-slate-600">
                Review comprehensive synchronized data on your clinician dashboard. See exactly which sessions were completed, analyze performance trends, and read patient feedback.
              </p>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-900 mb-2">Example Scenario:</h4>
                <p className="text-slate-600 text-sm">
                  The dashboard shows a patient easily completing their Arm Raise exercises with 100% form accuracy. You can instantly update the prescription directly from the website—changing the target from 10 repetitions to 12. The patient's app will sync the new target automatically.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-blue-600/5 rounded-3xl transform rotate-3 scale-105" />
              <img
                src="/feature-review.png"
                alt="Clinician reviewing data with patient"
                className="rounded-2xl shadow-xl object-cover"
              />
            </motion.div>
          </div>

          {/* NEW SECTION 1: Advanced Cognitive Training */}
          <div className="grid lg:grid-cols-3 gap-8 py-10 border-t border-slate-200">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Cognitive Gamification</h3>
              <p className="text-slate-600">
                Prescribe from 13 different cognitive games (like Stroop Color Clash or Memory Match). Keep patients engaged with fun, interactive neural training tailored to their recovery.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Biometric Security</h3>
              <p className="text-slate-600">
                Ensure the correct patient is performing the exercise. Our platform uses AI-powered face verification before each session to maintain medical compliance and data integrity.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Effortless Onboarding</h3>
              <p className="text-slate-600">
                Register patients with just their name, a simple ID, and their specific exercise regimen. We auto-generate secure login credentials they can use instantly on their mobile devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">Ready to modernize your neurorehabilitation practice?</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join the network of clinicians using NeuroRehab Connect to deliver better, data-driven care to their patients.
          </p>
          <button
            onClick={onLoginClick}
            className="px-10 py-4 text-lg font-bold text-blue-600 bg-white hover:bg-slate-50 rounded-full shadow-2xl transition-all active:scale-95 inline-flex items-center gap-2"
          >
            Log in to Dashboard
          </button>
          
          <div className="pt-8">
            <p className="text-sm text-blue-200">
              Demo Credentials:<br/>
              <strong>Email:</strong> doctor.chen@neurorehab-connect.health<br/>
              <strong>Password:</strong> Password123!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
