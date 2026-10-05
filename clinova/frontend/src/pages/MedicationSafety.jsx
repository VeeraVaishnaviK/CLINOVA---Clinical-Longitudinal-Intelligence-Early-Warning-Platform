import React, { useEffect, useState } from 'react';
import { Pill, AlertTriangle, Shield, CheckCircle, ExternalLink, Info } from 'lucide-react';
import { getMedicationSafety } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip, SectionHeader, EmptyState } from '../components/Common';

export function MedicationSafety() {
  const { selectedPatientId, openEvidence, addToast } = usePatient();
  const [safetyList, setSafetyList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    getMedicationSafety(selectedPatientId)
      .then(data => {
        setSafetyList(data);
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
        <div className="h-64 bg-white shimmer rounded-[14px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Medication Safety & Interaction Surveillance</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Active drug-condition and multi-agent contraindication surveillance for {selectedPatientId}
          </p>
        </div>
      </div>

      {/* Mandatory Regulatory Banner */}
      <div className="bg-[#FFF6DD] p-4 rounded-[14px] border border-[#FDE199] flex items-start space-x-3 text-xs text-[#A66F00]">
        <Shield className="w-5 h-5 shrink-0 mt-0.5 text-[#D99A00]" />
        <div>
          <span className="font-bold">Demonstration Notice: </span>
          Curated demonstration rule set, not a substitute for a licensed drug-interaction database. 
          Algorithms evaluate physiologic trajectories (e.g. creatinine, potassium) alongside active pharmacotherapy to surface deterioration-associated risks.
        </div>
      </div>

      {/* Table of Safety Findings */}
      <div className="bg-white rounded-[14px] border border-[#E3EBF2] shadow-soft overflow-hidden">
        <div className="p-4 border-b border-[#E3EBF2] flex items-center justify-between">
          <h3 className="text-xs uppercase font-mono font-semibold text-[#0B1F33]">
            Active Medication Concerns ({safetyList.length})
          </h3>
          <span className="text-xs font-mono text-[#5B6B7A]">Patient: {selectedPatientId}</span>
        </div>

        {safetyList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E3EBF2] text-[#5B6B7A] font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Medication / Combination</th>
                  <th className="py-3 px-4">Related Clinical Finding</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Engine Confidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EBF2]">
                {safetyList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F4F8FB]">
                    <td className="py-3.5 px-4 font-semibold text-[#0B1F33]">
                      <div className="flex items-center space-x-2">
                        <Pill className="w-4 h-4 text-[#8E44AD] shrink-0" />
                        <span>{item.medication}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#7A8B99] mt-0.5">{item.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6B7A] max-w-md leading-relaxed">
                      {item.related_finding}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusChip status={item.severity} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0B1F33]">
                      {Math.round(item.confidence * 100)}%
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {item.evidence && item.evidence.length > 0 && (
                        <button
                          onClick={() => openEvidence(item.evidence[0])}
                          className="px-2.5 py-1 text-xs text-[#1B6FB3] hover:underline font-mono"
                        >
                          View Evidence
                        </button>
                      )}
                      <button
                        onClick={() => addToast(`Medication risk ${item.id} acknowledged`, "info")}
                        className="px-2.5 py-1 bg-white border border-[#E3EBF2] hover:bg-slate-50 text-slate-700 rounded text-xs font-medium"
                      >
                        Acknowledge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState message="No medication safety concerns detected for this patient record." />
          </div>
        )}
      </div>

    </div>
  );
}
