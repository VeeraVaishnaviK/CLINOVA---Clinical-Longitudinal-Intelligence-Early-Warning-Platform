import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, ArrowUp, ArrowDown, Activity, ShieldCheck, 
  Calendar, Clock, ExternalLink, Zap, Flame, HeartHandshake, Eye
} from 'lucide-react';
import { getPatient, getDeterioration, getWhatChanged, getTrajectories, getAlerts } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip, ECGStrip, ConfidenceBar, SectionHeader, EmptyState } from '../components/Common';

export function PatientWorkspace() {
  const { selectedPatientId, openEvidence } = usePatient();
  const [patient, setPatient] = useState(null);
  const [deterioration, setDeterioration] = useState(null);
  const [whatChanged, setWhatChanged] = useState(null);
  const [trajectories, setTrajectories] = useState([]);
  const [patientAlerts, setPatientAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    Promise.all([
      getPatient(selectedPatientId),
      getDeterioration(selectedPatientId),
      getWhatChanged(selectedPatientId),
      getTrajectories(selectedPatientId),
      getAlerts(),
    ])
      .then(([pat, det, wc, traj, allAlerts]) => {
        setPatient(pat);
        setDeterioration(det);
        setWhatChanged(wc);
        setTrajectories(traj);
        setPatientAlerts(allAlerts.filter(a => a.patient_id === selectedPatientId));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPatientId]);

  if (loading || !patient || !deterioration) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-white shimmer rounded-[14px] border border-[#E3EBF2]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white shimmer rounded-[14px]" />
          <div className="h-64 bg-white shimmer rounded-[14px]" />
          <div className="h-64 bg-white shimmer rounded-[14px]" />
        </div>
      </div>
    );
  }

  const isHighConcern = patient.priority === 'HIGH' || deterioration.level === 'HIGH';
  const news2 = deterioration.news2;
  const whyNow = deterioration.why_now;

  return (
    <div className="space-y-6">
      
      {/* ── 1. Hero Patient Header ── */}
      <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1F33] text-white flex flex-col items-center justify-center font-mono shadow-sm">
            <span className="text-[10px] text-[#7A8B99] uppercase leading-none">PATIENT</span>
            <span className="text-base font-bold leading-tight mt-0.5">{patient.patient_id.slice(-4)}</span>
          </div>

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">{patient.label}</h1>
              <span className="text-xs font-mono text-[#5B6B7A] bg-[#F4F8FB] px-2 py-0.5 rounded border border-[#E3EBF2]">
                {patient.patient_id}
              </span>
              <StatusChip status={patient.priority} />
            </div>
            <div className="text-xs text-[#5B6B7A] flex items-center space-x-3 mt-1 font-mono">
              <span>{patient.age} years old · {patient.sex}</span>
              <span>·</span>
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-[#7A8B99]" />
                Last: {patient.last_encounter}
              </span>
              <span>·</span>
              <span>{patient.event_count} clinical events recorded</span>
            </div>
          </div>
        </div>

        {/* Right Header Status: ECG Strip & Deterioration Dial */}
        <div className="flex items-center space-x-5 self-end md:self-center">
          {isHighConcern && (
            <div className="hidden lg:block text-right">
              <div className="text-[10px] font-mono uppercase text-[#D6353A] font-semibold flex items-center justify-end mb-1">
                <span className="w-2 h-2 rounded-full bg-[#D6353A] animate-ping mr-1.5" />
                Active High Deterioration
              </div>
              <ECGStrip animated={true} width={140} height={26} color="#D6353A" />
            </div>
          )}

          <div className="p-3 bg-[#F4F8FB] rounded-xl border border-[#E3EBF2] text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-mono text-[#5B6B7A] font-semibold">Risk Score</div>
            <div className={`text-2xl font-bold font-mono ${isHighConcern ? 'text-[#D6353A]' : 'text-[#0B1F33]'}`}>
              {deterioration.score}
              <span className="text-xs text-[#7A8B99] font-normal">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Three Clinical Panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Panel A: What Changed Since Last Visit */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E3EBF2] mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-[#0B1F33]">
                What Changed Since Last Encounter
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#EAF2FE] text-[#1B6FB3] font-mono text-[11px] font-bold">
                {whatChanged ? whatChanged.total_count : 0} changes
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {whatChanged && whatChanged.total_count > 0 ? (
                <>
                  {whatChanged.new_symptoms.map((s, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => openEvidence(s.evidence_id)}
                      className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between cursor-pointer hover:bg-amber-100"
                    >
                      <span className="font-medium">New Symptom: {s.concept}</span>
                      <span className="font-mono text-[11px] font-bold">Present</span>
                    </div>
                  ))}

                  {whatChanged.lab_changes.map((l, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => openEvidence(l.evidence_id)}
                      className="p-2 rounded bg-[#F8FAFC] border border-[#E3EBF2] flex items-center justify-between cursor-pointer hover:bg-white hover:border-[#1B6FB3]"
                    >
                      <span className="font-medium text-[#0B1F33]">{l.concept}</span>
                      <span className="font-mono font-bold text-[#D6353A]">
                        {l.old} → {l.new} {l.unit}
                      </span>
                    </div>
                  ))}

                  {whatChanged.vital_changes.map((v, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => openEvidence(v.evidence_id)}
                      className="p-2 rounded bg-[#F8FAFC] border border-[#E3EBF2] flex items-center justify-between cursor-pointer hover:bg-white hover:border-[#1B6FB3]"
                    >
                      <span className="font-medium text-[#0B1F33]">{v.concept}</span>
                      <span className="font-mono font-bold text-[#D6353A]">
                        {v.old} → {v.new} {v.unit}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-[#5B6B7A] py-4 text-center">No significant changes from previous encounter.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E3EBF2] mt-3 flex justify-between text-[11px] font-mono text-[#7A8B99]">
            <span>Prior: {whatChanged ? whatChanged.previous_date : 'N/A'}</span>
            <span>Latest: {whatChanged ? whatChanged.latest_date : 'N/A'}</span>
          </div>
        </div>

        {/* Panel B: Current Longitudinal Trajectory */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E3EBF2] mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-[#0B1F33]">
                Current Trajectories
              </h3>
              <button 
                onClick={() => navigate('/trajectory')}
                className="text-xs font-medium text-[#1B6FB3] hover:underline flex items-center"
              >
                <span>Details</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>

            <div className="space-y-2.5">
              {trajectories.slice(0, 4).map((t) => (
                <div key={t.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#F8FAFC] border border-[#E3EBF2]">
                  <div>
                    <span className="font-semibold text-[#0B1F33]">{t.name}</span>
                    {t.turning_point && (
                      <div className="text-[10px] font-mono text-[#D99A00]">
                        Turning point: {t.turning_point.date}
                      </div>
                    )}
                  </div>
                  <StatusChip status={t.trajectory_status} size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E3EBF2] mt-3 text-[11px] text-[#5B6B7A] font-mono">
            Analyzed via numpy polyfit & CUSUM baseline departure.
          </div>
        </div>

        {/* Panel C: Active Clinical Alerts */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E3EBF2] mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-[#0B1F33]">
                Active Alerts ({patientAlerts.length})
              </h3>
              <button 
                onClick={() => navigate('/alerts')}
                className="text-xs font-medium text-[#1B6FB3] hover:underline flex items-center"
              >
                <span>Triage</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[190px] overflow-y-auto">
              {patientAlerts.length > 0 ? (
                patientAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      a.priority === 'HIGH' 
                        ? 'border-l-4 border-l-[#D6353A] border-[#F8B4B6] bg-[#FDECEC]/40' 
                        : 'border-l-4 border-l-[#D99A00] border-[#FDE199] bg-[#FFF6DD]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0B1F33] truncate max-w-[200px]">{a.title}</span>
                      <StatusChip status={a.priority} size="sm" />
                    </div>
                    <p className="text-[11px] text-[#5B6B7A] mt-1 line-clamp-2">{a.why_now}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#5B6B7A] py-6 text-center">No active alerts for this patient.</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E3EBF2] mt-3 text-right">
            <button
              onClick={() => navigate('/replay')}
              className="text-xs font-mono text-[#1B6FB3] font-semibold hover:underline"
            >
              Launch Evidence Replay →
            </button>
          </div>
        </div>

      </div>

      {/* ── 3. WHY NOW Panel (Multi-Signal Window Delta) ── */}
      <div className="bg-white rounded-[14px] p-5 sm:p-6 border border-[#E3EBF2] shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#D99A00]" />
              <h2 className="text-sm font-semibold text-[#0B1F33] uppercase tracking-wide font-mono">
                WHY NOW Clinical Rationale
              </h2>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Explainable multi-signal deviation analysis in current 7-day observation window
            </p>
          </div>

          <div className="px-3 py-1 rounded-full bg-[#FFF6DD] border border-[#FDE199] text-xs font-mono text-[#A66F00] font-semibold self-start sm:self-center">
            {whyNow.message}
          </div>
        </div>

        {whyNow.signals && whyNow.signals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {whyNow.signals.map((sig, idx) => {
              const isIncrease = sig.pct_change > 0;
              return (
                <div
                  key={idx}
                  onClick={() => openEvidence(sig.evidence_id)}
                  className="p-3.5 rounded-xl border border-[#E3EBF2] bg-[#F8FAFC] hover:bg-white hover:border-[#1B6FB3] hover:shadow-card transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#0B1F33] group-hover:text-[#1B6FB3]">
                      {sig.signal}
                    </span>
                    {sig.pct_change !== null && (
                      <span className={`inline-flex items-center font-mono font-bold text-xs ${isIncrease ? 'text-[#D6353A]' : 'text-[#1E9E6A]'}`}>
                        {isIncrease ? <ArrowUp className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDown className="w-3.5 h-3.5 mr-0.5" />}
                        {Math.abs(sig.pct_change)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#E3EBF2]/60 font-mono text-xs">
                    <span className="text-[#7A8B99]">Prev: {sig.previous}</span>
                    <span className="font-bold text-[#0B1F33]">Current: {sig.current}</span>
                  </div>

                  <div className="mt-2 text-[10px] font-mono text-[#1B6FB3] flex items-center justify-end group-hover:underline">
                    <span>Evidence: {sig.evidence_id}</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No acute multi-signal deviations detected in current window." />
        )}
      </div>

      {/* ── 4. NEWS2 vs CLINOVA Early Warning Card ── */}
      <div className="bg-white rounded-[14px] p-5 sm:p-6 border border-[#E3EBF2] shadow-soft">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#E3EBF2] mb-4">
          <Activity className="w-4 h-4 text-[#1B6FB3]" />
          <h2 className="text-sm font-semibold text-[#0B1F33] uppercase tracking-wide font-mono">
            Early Warning Lead Time: CLINOVA vs Standard NEWS2
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Lead time metric banner */}
          <div className={`p-5 rounded-2xl border text-center ${
            news2.days_earlier > 0 
              ? 'bg-[#E8F6F0] border-[#A8E2C9] text-[#1E9E6A]' 
              : 'bg-[#F4F8FB] border-[#E3EBF2] text-[#5B6B7A]'
          }`}>
            <div className="text-[11px] uppercase tracking-widest font-mono font-semibold">
              Early Warning Advance
            </div>
            <div className="text-4xl font-extrabold font-mono mt-1 text-[#0B1F33]">
              {news2.days_earlier > 0 ? `+${news2.days_earlier}` : news2.days_earlier}
              <span className="text-sm font-sans font-medium text-[#5B6B7A] ml-1">days</span>
            </div>
            <p className="text-xs mt-2 font-medium">
              {news2.message}
            </p>
          </div>

          {/* Trigger comparisons */}
          <div className="md:col-span-2 space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E3EBF2] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#1B6FB3]">CLINOVA Longitudinal Flag Date</div>
                <div className="text-[11px] text-[#5B6B7A] mt-0.5 font-sans">
                  Detected multi-signal renal trajectory acceleration and oliguria
                </div>
              </div>
              <span className="font-bold text-sm text-[#0B1F33]">
                {news2.clinova_first_flag_date || "Not triggered"}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E3EBF2] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#5B6B7A]">Standard NEWS2 First Trigger Date (Score ≥ 5)</div>
                <div className="text-[11px] text-[#5B6B7A] mt-0.5 font-sans">
                  Requires acute vital sign breakdown before triggering
                </div>
              </div>
              <span className="font-bold text-sm text-[#0B1F33]">
                {news2.news2_first_trigger_date || "Not triggered"}
              </span>
            </div>

            <div className="text-[11px] font-sans text-[#7A8B99] pt-1">
              Standard point-in-time scores (NEWS2) miss pre-decompensation lab trends and medication interactions.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
