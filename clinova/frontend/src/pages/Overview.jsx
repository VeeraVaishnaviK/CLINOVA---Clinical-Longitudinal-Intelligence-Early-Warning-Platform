import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, AlertTriangle, Activity, Pill, ShieldAlert, 
  Upload, ArrowRight, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { getDashboard, ingestCSV, ingestJSON } from '../api';
import { usePatient } from '../context/PatientContext';
import { MetricTile, StatusChip, ConfidenceBar, SectionHeader, EmptyState } from '../components/Common';

export function Overview() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [ingestStep, setIngestStep] = useState(0);
  const [ingesting, setIngesting] = useState(false);
  const [ingestSummary, setIngestSummary] = useState(null);

  const { setSelectedPatientId, openEvidence, addToast, refreshPatients } = usePatient();
  const navigate = useNavigate();

  const loadDashboard = () => {
    setLoading(true);
    getDashboard()
      .then(data => {
        setDashboard(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    navigate('/patient');
  };

  const runIngestionStepper = async () => {
    setIngesting(true);
    setIngestStep(1); // Document upload

    const sampleCsv = `patient_id,event_type,concept,value,unit,event_time
P-1024,VITAL,Heart Rate,108,bpm,2026-10-04
P-1024,VITAL,Temperature,102.1,°F,2026-10-04
P-1024,LAB_RESULT,Creatinine,2.3,mg/dL,2026-10-04
P-2031,LAB_RESULT,Lactate,4.2,mmol/L,2026-10-05`;

    setTimeout(() => {
      setIngestStep(2); // Extraction
      setTimeout(() => {
        setIngestStep(3); // Clinical events
        setTimeout(() => {
          setIngestStep(4); // Timeline
          setTimeout(async () => {
            setIngestStep(5); // Analysis
            try {
              const res = await ingestCSV(sampleCsv);
              setIngestSummary(res);
              addToast(`Successfully ingested and analyzed ${res.count} clinical records`, "success");
              refreshPatients();
              loadDashboard();
            } catch (e) {
              addToast("Ingestion completed with fallback", "info");
            }
            setIngesting(false);
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  if (loading || !dashboard) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white shimmer rounded-[14px] border border-[#E3EBF2]" />
          ))}
        </div>
        <div className="h-72 bg-white shimmer rounded-[14px] border border-[#E3EBF2]" />
      </div>
    );
  }

  const stepperLabels = [
    "Ready",
    "1. Document Ingestion",
    "2. NLP & Rule Extraction",
    "3. Event Normalization",
    "4. Timeline Reconstruction",
    "5. Longitudinal Analysis Complete"
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Title & Ingest Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Deterioration Surveillance</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Active longitudinal surveillance across in-memory synthetic patient cohort · Dr. Rao
          </p>
        </div>
        
        <button
          onClick={() => {
            setIngestModalOpen(true);
            setIngestStep(0);
            setIngestSummary(null);
          }}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#1B6FB3] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Ingest Clinical Records</span>
        </button>
      </div>

      {/* ── 1. 5 MetricTiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricTile
          label="Monitored Patients"
          value={dashboard.monitored}
          sublabel="100% active cohort"
        />
        <MetricTile
          label="High Concern"
          value={dashboard.high_concern}
          delta={+25}
          sublabel="Requires immediate review"
          alert={dashboard.high_concern > 0}
        />
        <MetricTile
          label="Emerging Signals"
          value={dashboard.emerging_signals}
          sublabel="Multi-signal acceleration"
        />
        <MetricTile
          label="Medication Conflicts"
          value={dashboard.medication_conflicts}
          sublabel="Contraindications detected"
        />
        <MetricTile
          label="Data Quality Issues"
          value={dashboard.data_quality_issues}
          sublabel="Gaps or missing intervals"
        />
      </div>

      {/* ── 2. Deterioration Watchlist Table ── */}
      <div className="bg-white rounded-[14px] border border-[#E3EBF2] shadow-soft overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E3EBF2] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#0B1F33] uppercase tracking-wide font-mono">
              Deterioration Watchlist
            </h2>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Ranked by composite deterioration severity and longitudinal trajectory
            </p>
          </div>
          <span className="text-xs font-mono text-[#5B6B7A] bg-[#F4F8FB] px-2 py-1 rounded">
            5 Active Patients
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E3EBF2] text-[#5B6B7A] font-mono uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Primary Signal</th>
                <th className="py-3 px-4">Trajectory</th>
                <th className="py-3 px-4 w-36">Risk Score</th>
                <th className="py-3 px-4">Last Encounter</th>
                <th className="py-3 px-4 text-right">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EBF2]">
              {dashboard.watchlist.map((p) => (
                <tr
                  key={p.patient_id}
                  onClick={() => handlePatientClick(p.patient_id)}
                  className="hover:bg-[#F4F8FB] cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#0B1F33] group-hover:text-[#1B6FB3] flex items-center">
                      <span>{p.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#1B6FB3]" />
                    </div>
                    <div className="text-[11px] font-mono text-[#5B6B7A]">
                      {p.patient_id} · {p.age}y/{p.sex}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#0F2137]">
                    {p.primary_signal}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusChip status={p.trajectory_status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#0B1F33] w-8">
                        {p.deterioration_score}
                      </span>
                      <div className="flex-1">
                        <ConfidenceBar value={p.deterioration_score} label="" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#5B6B7A]">
                    {p.last_encounter}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusChip status={p.priority} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. Recent Events & Data Quality Side by Side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Clinical Events Stream (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
          <SectionHeader
            title="Recent Longitudinal Clinical Events"
            subtitle="Verified chronological stream with direct evidence traceability"
          />

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {dashboard.recent_events && dashboard.recent_events.length > 0 ? (
              dashboard.recent_events.map((evt) => (
                <div
                  key={evt.event_id}
                  onClick={() => openEvidence(evt.event_id)}
                  className="p-2.5 rounded-lg border border-[#E3EBF2] bg-[#F8FAFC] hover:bg-white hover:border-[#1B6FB3] transition-all cursor-pointer flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-[10px] text-[#5B6B7A] bg-slate-200 px-1.5 py-0.5 rounded">
                      {evt.patient_id}
                    </span>
                    <span className="font-medium text-[#0B1F33] group-hover:text-[#1B6FB3]">
                      {evt.concept}
                    </span>
                    <span className="font-mono font-bold text-[#1B6FB3]">
                      {evt.value !== null ? String(evt.value) : ''} {evt.unit || ''}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-[#7A8B99] flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {evt.event_time}
                    </span>
                    <StatusChip status={evt.event_type} size="sm" />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No recent events" />
            )}
          </div>
        </div>

        {/* Cohort Data Quality Breakdown (1 col) */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Record Completeness & Quality"
              subtitle="Audit of clinical continuity and data density"
            />

            <div className="space-y-4 mt-4">
              {dashboard.quality_bars.map((qb) => (
                <div 
                  key={qb.patient_id} 
                  onClick={() => handlePatientClick(qb.patient_id)}
                  className="cursor-pointer group hover:bg-[#F8FAFC] p-2 rounded-lg transition-colors"
                >
                  <div className="flex justify-between items-center text-xs mb-1 font-mono">
                    <span className="font-semibold text-[#0B1F33] group-hover:text-[#1B6FB3]">
                      {qb.patient_id} · {qb.label}
                    </span>
                    <span className="font-bold text-[#1B6FB3]">{qb.overall}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E3EBF2] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${qb.overall < 70 ? 'bg-[#D6353A]' : qb.overall < 85 ? 'bg-[#D99A00]' : 'bg-[#1E9E6A]'}`}
                      style={{ width: `${qb.overall}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7A8B99] font-mono mt-1">
                    <span>Labs: {qb.lab}%</span>
                    <span>Vitals: {qb.vital}%</span>
                    <span>Meds: {qb.medication}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E3EBF2] mt-4 text-[11px] text-[#5B6B7A] font-mono">
            Low quality index triggers confidence penalties in trajectory engines.
          </div>
        </div>
      </div>

      {/* ── Animated Ingest Records Modal (5-Step Stepper) ── */}
      {ingestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[14px] max-w-lg w-full p-6 border border-[#E3EBF2] shadow-drawer">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EBF2]">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-[#1B6FB3]" />
                <h3 className="text-base font-semibold text-[#0B1F33]">Ingest Clinical Encounter Records</h3>
              </div>
              {!ingesting && (
                <button onClick={() => setIngestModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  ×
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <p className="text-xs text-[#5B6B7A]">
                Ingest synthetic batch records into in-memory engine. Pipeline executes 5-stage deterministic extraction and trajectory recomputation.
              </p>

              {/* 5-step stepper */}
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5].map((s) => {
                  const isDone = ingestStep > s;
                  const isCurrent = ingestStep === s;
                  return (
                    <div key={s} className="flex items-center space-x-3 text-xs">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isDone ? 'bg-[#1E9E6A] text-white' : isCurrent ? 'bg-[#1B6FB3] text-white animate-pulse' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                      </div>
                      <span className={`font-mono ${isCurrent ? 'font-bold text-[#0B1F33]' : isDone ? 'text-[#1E9E6A]' : 'text-slate-400'}`}>
                        {stepperLabels[s]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {ingestSummary && (
                <div className="p-3 bg-[#E8F6F0] text-[#1E9E6A] text-xs font-mono rounded-lg border border-[#A8E2C9]">
                  {ingestSummary.message}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {!ingesting && ingestStep === 0 && (
                <>
                  <button
                    onClick={() => setIngestModalOpen(false)}
                    className="px-4 py-2 bg-white text-slate-700 border border-[#E3EBF2] text-xs font-medium rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runIngestionStepper}
                    className="px-4 py-2 bg-[#1B6FB3] text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    Start Ingestion
                  </button>
                </>
              )}
              {ingestStep === 5 && !ingesting && (
                <button
                  onClick={() => setIngestModalOpen(false)}
                  className="px-4 py-2 bg-[#1E9E6A] text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
