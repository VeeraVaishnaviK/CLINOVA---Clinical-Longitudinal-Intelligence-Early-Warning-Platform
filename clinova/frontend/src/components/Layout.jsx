import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, User, Clock, LineChart, AlertTriangle, 
  Pill, Split, Network, PlayCircle, BookOpen, FileCheck, 
  Search, Bell, Shield, Info, Play, Pause, ChevronRight
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import { ECGStrip, StatusChip } from './Common';
import { EvidenceDrawer } from './EvidenceDrawer';
import { getAlerts } from '../api';

export function Layout({ children }) {
  const { 
    selectedPatientId, setSelectedPatientId, patients, 
    toasts, removeToast, evidenceDrawerEventId, 
    isEvidenceDrawerOpen, closeEvidence 
  } = usePatient();
  
  const [openAlertsCount, setOpenAlertsCount] = useState(0);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getAlerts().then(all => {
      const open = all.filter(a => a.status === 'OPEN').length;
      setOpenAlertsCount(open);
    }).catch(() => {});
  }, [location.pathname]);

  // Demo mode auto-navigation
  // Overview -> P-1024 Why Now -> Replay -> P-5090 gap -> P-4112 conflict -> Storyline
  useEffect(() => {
    if (!demoActive) return;

    const demoSteps = [
      { path: '/', patient: 'P-1024', label: '1/6 Dashboard Overview' },
      { path: '/patient', patient: 'P-1024', label: '2/6 Patient A: WHY NOW Deterioration' },
      { path: '/replay', patient: 'P-1024', label: '3/6 Evidence Replay with Interactive Scrubber' },
      { path: '/timeline', patient: 'P-5090', label: '4/6 Patient E: 73-Day Data Gap' },
      { path: '/contradictions', patient: 'P-4112', label: '5/6 Patient D: Clinical Record Conflict' },
      { path: '/storyline', patient: 'P-1024', label: '6/6 Clinical Storyline & Known vs Unknown' },
    ];

    const timer = setTimeout(() => {
      const nextStep = (demoStep + 1) % demoSteps.length;
      setDemoStep(nextStep);
      setSelectedPatientId(demoSteps[nextStep].patient);
      navigate(demoSteps[nextStep].path);
    }, 6000);

    return () => clearTimeout(timer);
  }, [demoActive, demoStep, navigate, setSelectedPatientId]);

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/patient', label: 'Workspace', icon: User },
    { to: '/timeline', label: 'Timeline', icon: Clock },
    { to: '/trajectory', label: 'Trajectory', icon: LineChart },
    { to: '/replay', label: 'Evidence Replay', icon: PlayCircle },
    { to: '/graph', label: 'Evidence Graph', icon: Network },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle, badge: openAlertsCount },
    { to: '/med-safety', label: 'Med Safety', icon: Pill },
    { to: '/contradictions', label: 'Contradictions', icon: Split },
    { to: '/storyline', label: 'Storyline', icon: BookOpen },
    { to: '/audit', label: 'Audit Log', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FB] text-[#0F2137]">
      
      {/* ── Top Bar ── */}
      <header className="h-14 bg-[#0B1F33] text-white flex items-center justify-between px-4 sm:px-6 border-b border-[#132D48] sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1B6FB3] flex items-center justify-center font-bold tracking-wider text-white shadow-sm">
              CL
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">CLINOVA</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest text-[#7A8B99] px-1.5 py-0.5 rounded bg-[#132D48]">
                CDSS v0.1
              </span>
            </div>
          </div>
          
          <div className="hidden lg:block ml-4 pl-4 border-l border-[#1C3E60]">
            <ECGStrip animated={true} width={130} height={24} color="#0E9AA7" />
          </div>
        </div>

        {/* Global Patient Selector & Search */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[#7A8B99]" />
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-[#132D48] text-xs font-mono text-white pl-8 pr-8 py-1.5 rounded-lg border border-[#1C3E60] focus:border-[#1B6FB3] focus:outline-none appearance-none cursor-pointer"
            >
              {patients.map(p => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.patient_id} · {p.label} ({p.priority})
                </option>
              ))}
            </select>
          </div>

          {/* Demo Mode Button */}
          <button
            onClick={() => setDemoActive(!demoActive)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              demoActive 
                ? 'bg-[#D99A00] text-[#0B1F33] animate-pulse font-semibold' 
                : 'bg-[#132D48] text-slate-300 hover:text-white hover:bg-[#1C3E60]'
            }`}
            title="Auto-tour prototype features"
          >
            {demoActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{demoActive ? 'Demo Active' : 'Demo Tour'}</span>
          </button>

          {/* Alerts Bell */}
          <NavLink
            to="/alerts"
            className="relative p-2 rounded-lg bg-[#132D48] text-slate-300 hover:text-white hover:bg-[#1C3E60] transition-colors"
            title="View clinical alerts"
          >
            <Bell className="w-4 h-4" />
            {openAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D6353A] text-white text-[10px] font-bold flex items-center justify-center">
                {openAlertsCount}
              </span>
            )}
          </NavLink>

          {/* User badge */}
          <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-[#1C3E60]">
            <div className="w-7 h-7 rounded-full bg-[#1B6FB3] flex items-center justify-center text-xs font-bold">
              DR
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-white leading-none">Dr. Rao</div>
              <div className="text-[10px] font-mono text-[#7A8B99] mt-0.5">DOCTOR</div>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Tour Toast Bar */}
      {demoActive && (
        <div className="bg-[#FFF6DD] border-b border-[#FDE199] px-4 py-1.5 text-xs text-[#A66F00] flex items-center justify-between font-mono animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#D99A00] animate-ping" />
            <span>DEMO TOUR RUNNING: Step {demoStep + 1} of 6 (6s per view)</span>
          </div>
          <button 
            onClick={() => setDemoActive(false)}
            className="text-xs underline font-sans text-[#A66F00] hover:text-[#0B1F33]"
          >
            Exit Tour
          </button>
        </div>
      )}

      {/* ── Main Container: Sidebar + Page Content ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Rail */}
        <aside className="w-16 md:w-56 bg-[#0B1F33] text-slate-300 border-r border-[#132D48] flex flex-col justify-between shrink-0 transition-all duration-300">
          <div className="py-3 px-2 md:px-3 space-y-1">
            <div className="hidden md:block px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#7A8B99]">
              Clinical Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-[#1B6FB3] text-white shadow-sm' 
                      : 'hover:bg-[#132D48] text-slate-300 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline truncate">{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full bg-[#D6353A] text-white text-[10px] font-mono">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Bottom actions: Roadmap & Info */}
          <div className="p-2 md:p-3 border-t border-[#132D48] space-y-1">
            <button
              onClick={() => setShowRoadmap(true)}
              className="w-full flex items-center justify-center md:justify-start space-x-2 px-3 py-2 rounded-lg text-xs text-[#7A8B99] hover:text-white hover:bg-[#132D48] transition-colors"
            >
              <Info className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Roadmap & Limitations</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* ── Persistent Regulatory Decision Support Footer ── */}
      <footer className="bg-white border-t border-[#E3EBF2] py-2 px-4 sm:px-6 text-center text-[11px] text-[#5B6B7A] shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-[#1B6FB3]" />
          <span className="font-semibold text-[#0B1F33]">CLINOVA</span>
          <span className="hidden sm:inline">· Clinical Longitudinal Intelligence & Early Warning Platform</span>
        </div>
        <div className="font-mono text-[10px] text-[#7A8B99]">
          Clinical decision support prototype. Not a diagnostic device. Synthetic data. Not clinically validated.
        </div>
      </footer>

      {/* Global Slide-over Evidence Drawer */}
      <EvidenceDrawer 
        eventId={evidenceDrawerEventId}
        isOpen={isEvidenceDrawerOpen}
        onClose={closeEvidence}
      />

      {/* Toast Notification Container */}
      <div className="fixed bottom-12 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#0B1F33] text-white text-xs px-4 py-2.5 rounded-lg shadow-card border border-[#1C3E60] flex items-center justify-between space-x-3 animate-in slide-in-from-bottom duration-200"
          >
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-white">
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Roadmap & Limitations Modal */}
      {showRoadmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[14px] max-w-lg w-full p-6 border border-[#E3EBF2] shadow-drawer">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EBF2]">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#1B6FB3]" />
                <h3 className="text-base font-semibold text-[#0B1F33]">Platform Disclaimers & Roadmap</h3>
              </div>
              <button onClick={() => setShowRoadmap(false)} className="text-slate-400 hover:text-slate-700">
                ×
              </button>
            </div>
            
            <div className="mt-4 space-y-3 text-xs text-[#5B6B7A] leading-relaxed">
              <div className="bg-[#FFF6DD] p-3 rounded-lg border border-[#FDE199] text-[#A66F00]">
                <strong>Current Limitations:</strong> This software is a functional prototype utilizing deterministic clinical engines and synthetic patient records. It is designed exclusively for decision support and clinical retrospective analysis, NOT autonomous medical diagnosis.
              </div>
              <p>
                <strong>Engine Architecture:</strong> Polyfit slopes, piecewise regression/CUSUM inflection detection, multi-signal window delta weighting, rule-based NegEx negation detection, and zero random or hallucinated states.
              </p>
              <div className="pt-2 border-t border-[#E3EBF2]">
                <h4 className="font-semibold text-[#0B1F33] mb-1">Production Architecture Roadmap:</h4>
                <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
                  <li>PostgreSQL + TimescaleDB for continuous vitals streaming</li>
                  <li>Native HL7 FHIR R4 Bundle Ingestion & Subscription</li>
                  <li>Hospital EHR Clinical Document OCR & PDF Parsers</li>
                  <li>Clinical validation against MIMIC-IV & eICU benchmark datasets</li>
                  <li>Prospective clinical trials comparing CLINOVA vs standard NEWS2/qSOFA</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowRoadmap(false)}
                className="px-4 py-2 bg-[#1B6FB3] text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
