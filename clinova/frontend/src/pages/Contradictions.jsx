import React, { useEffect, useState } from 'react';
import { Split, AlertTriangle, Shield, CheckCircle, FileText, ExternalLink, HelpCircle } from 'lucide-react';
import { getContradictions } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip, SectionHeader, EmptyState } from '../components/Common';

export function Contradictions() {
  const { selectedPatientId, openEvidence, addToast } = usePatient();
  const [contradictions, setContradictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalConflict, setReviewModalConflict] = useState(null);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    getContradictions(selectedPatientId)
      .then(data => {
        setContradictions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPatientId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white shimmer rounded-[14px]" />
        <div className="h-72 bg-white shimmer rounded-[14px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Record Contradiction Detection</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Cross-source conflict surveillance identifying discordant EHR notes, medications, and laboratory values
          </p>
        </div>
      </div>

      {/* Mandatory Conflict Banner */}
      <div className="bg-[#FFF6DD] p-4 rounded-[14px] border border-[#FDE199] flex items-start space-x-3 text-xs text-[#A66F00]">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#D99A00]" />
        <div>
          <span className="font-bold">Clinical Conflict Governance: </span>
          Clinical record conflict detected. Clinician verification required. 
          The CLINOVA platform surfaces competing claims from fragmented sources with full provenance but NEVER automatically chooses a winner.
        </div>
      </div>

      {/* Contradiction Cards */}
      <div className="space-y-6">
        {contradictions.length > 0 ? (
          contradictions.map((c) => (
            <div key={c.id} className="bg-white rounded-[14px] p-5 sm:p-6 border border-[#E3EBF2] shadow-soft space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3EBF2]">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F33] flex items-center space-x-2">
                    <Split className="w-4 h-4 text-[#D99A00]" />
                    <span>{c.description}</span>
                  </h3>
                  <div className="text-[11px] font-mono text-[#5B6B7A] mt-0.5">
                    Conflict ID: {c.id} · Patient: {selectedPatientId}
                  </div>
                </div>

                <button
                  onClick={() => setReviewModalConflict(c)}
                  className="px-3.5 py-1.5 bg-[#1B6FB3] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  Review Conflict
                </button>
              </div>

              {/* 3 Columns: Source A | Source B | Source C */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Source A */}
                {c.source_a && (
                  <div className="p-4 rounded-xl border border-[#E3EBF2] bg-[#F8FAFC] flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-[#5B6B7A] font-bold">
                        Source A: {c.source_a.type}
                      </div>
                      <div className="text-sm font-semibold text-[#0B1F33] mt-2 italic bg-white p-2.5 rounded-lg border border-[#E3EBF2]">
                        "{c.source_a.text}"
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-[#E3EBF2] font-mono text-[10px] text-[#7A8B99] flex items-center justify-between">
                      <span className="truncate">{c.source_a.document}</span>
                      {c.source_a.event_id && (
                        <button 
                          onClick={() => openEvidence(c.source_a.event_id)}
                          className="text-[#1B6FB3] underline shrink-0 ml-1"
                        >
                          Evidence
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Source B */}
                {c.source_b && (
                  <div className="p-4 rounded-xl border border-[#E3EBF2] bg-[#F8FAFC] flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-[#5B6B7A] font-bold">
                        Source B: {c.source_b.type}
                      </div>
                      <div className="text-sm font-semibold text-[#0B1F33] mt-2 italic bg-white p-2.5 rounded-lg border border-[#E3EBF2]">
                        "{c.source_b.text}"
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-[#E3EBF2] font-mono text-[10px] text-[#7A8B99] flex items-center justify-between">
                      <span className="truncate">{c.source_b.document}</span>
                      {c.source_b.event_id && (
                        <button 
                          onClick={() => openEvidence(c.source_b.event_id)}
                          className="text-[#1B6FB3] underline shrink-0 ml-1"
                        >
                          Evidence
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Source C */}
                {c.source_c ? (
                  <div className="p-4 rounded-xl border border-[#E3EBF2] bg-[#F8FAFC] flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-[#5B6B7A] font-bold">
                        Source C: {c.source_c.type}
                      </div>
                      <div className="text-sm font-semibold text-[#0B1F33] mt-2 italic bg-white p-2.5 rounded-lg border border-[#E3EBF2]">
                        "{c.source_c.text}"
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-[#E3EBF2] font-mono text-[10px] text-[#7A8B99] flex items-center justify-between">
                      <span className="truncate">{c.source_c.document}</span>
                      {c.source_c.event_id && (
                        <button 
                          onClick={() => openEvidence(c.source_c.event_id)}
                          className="text-[#1B6FB3] underline shrink-0 ml-1"
                        >
                          Evidence
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-[#CBD6E2] flex items-center justify-center text-center text-xs text-[#7A8B99]">
                    Two-way contradiction between Source A & Source B.
                  </div>
                )}

              </div>

            </div>
          ))
        ) : (
          <EmptyState message="No clinical record contradictions detected for this patient." />
        )}
      </div>

      {/* ── Clinician Verification Modal (Never Picks a Winner) ── */}
      {reviewModalConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[14px] max-w-lg w-full p-6 border border-[#E3EBF2] shadow-drawer">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EBF2]">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#1B6FB3]" />
                <h3 className="text-base font-semibold text-[#0B1F33]">Clinician Verification Protocol</h3>
              </div>
              <button onClick={() => setReviewModalConflict(null)} className="text-slate-400 hover:text-slate-700">
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#5B6B7A]">
              <p>
                <strong>Conflict: </strong>{reviewModalConflict.description}
              </p>
              <div className="bg-[#FFF6DD] p-3 rounded-lg border border-[#FDE199] text-[#A66F00]">
                <strong>AI Neutrality Rule:</strong> The system maintains strict neutrality between EHR notes, active prescription logs, and laboratory reports. Only a licensed physician can reconcile historical documentation vs current biological status.
              </div>
              
              <div className="space-y-2 pt-2">
                <label className="font-semibold text-[#0B1F33]">Reconciliation Action:</label>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <label className="flex items-center space-x-2 p-2 rounded bg-slate-50 border border-slate-200">
                    <input type="radio" name="reconcile" defaultChecked />
                    <span>Flag for Attending Physician encounter review</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 rounded bg-slate-50 border border-slate-200">
                    <input type="radio" name="reconcile" />
                    <span>Order confirmatory HbA1c / metabolic panel</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 rounded bg-slate-50 border border-slate-200">
                    <input type="radio" name="reconcile" />
                    <span>Annotate EHR: "Historical record note superseded by current active Rx"</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setReviewModalConflict(null)}
                className="px-4 py-2 bg-white text-slate-700 border border-[#E3EBF2] text-xs font-medium rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addToast("Conflict review logged in clinical audit trail", "success");
                  setReviewModalConflict(null);
                }}
                className="px-4 py-2 bg-[#1B6FB3] text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
              >
                Log Verification
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
