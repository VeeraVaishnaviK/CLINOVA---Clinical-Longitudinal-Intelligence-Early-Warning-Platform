import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle, XCircle, 
  FileText, ExternalLink, Filter, Clock 
} from 'lucide-react';
import { getAlerts, acknowledgeAlert, dismissAlert } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip, ConfidenceBar, EmptyState } from '../components/Common';

export function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { openEvidence, addToast } = usePatient();

  const loadAlerts = () => {
    setLoading(true);
    getAlerts()
      .then(data => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async (alertId) => {
    // Optimistic UI update
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a));
    try {
      await acknowledgeAlert(alertId);
      addToast(`Alert ${alertId} acknowledged`, "info");
    } catch (e) {
      addToast("Failed to acknowledge alert", "error");
      loadAlerts();
    }
  };

  const handleDismiss = async (alertId) => {
    // Optimistic UI update
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'DISMISSED' } : a));
    try {
      await dismissAlert(alertId);
      addToast(`Alert ${alertId} dismissed`, "info");
    } catch (e) {
      addToast("Failed to dismiss alert", "error");
      loadAlerts();
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterPriority !== 'ALL' && a.priority !== filterPriority) return false;
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-14 bg-white shimmer rounded-[14px]" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white shimmer rounded-[14px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Alert Triage</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Real-time surveillance warnings prioritized by acuity and clinical risk score
          </p>
        </div>

        {/* Priority & Status Filters */}
        <div className="flex items-center space-x-2 font-mono text-xs flex-wrap gap-y-2">
          <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-[#E3EBF2]">
            {['ALL', 'HIGH', 'EMERGING', 'INFO'].map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  filterPriority === p ? 'bg-[#1B6FB3] text-white font-bold' : 'text-[#5B6B7A] hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-[#E3EBF2]">
            {['ALL', 'OPEN', 'ACKNOWLEDGED', 'DISMISSED'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  filterStatus === s ? 'bg-[#0B1F33] text-white font-bold' : 'text-[#5B6B7A] hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alert Cards List ── */}
      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((a) => {
            const isHigh = a.priority === 'HIGH';
            const isDismissed = a.status === 'DISMISSED';

            return (
              <div
                key={a.id}
                className={`bg-white rounded-[14px] p-5 border shadow-soft transition-all duration-200 ${
                  isDismissed ? 'opacity-50' : ''
                } ${
                  isHigh 
                    ? 'border-l-4 border-l-[#D6353A] border-[#E3EBF2]' 
                    : a.priority === 'EMERGING'
                    ? 'border-l-4 border-l-[#D99A00] border-[#E3EBF2]'
                    : 'border-l-4 border-l-[#2F80ED] border-[#E3EBF2]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-[#5B6B7A] bg-[#F4F8FB] px-2 py-0.5 rounded border border-[#E3EBF2]">
                      {a.patient_id}
                    </span>
                    <h2 className="text-sm font-semibold text-[#0B1F33]">{a.title}</h2>
                  </div>

                  <div className="flex items-center space-x-2">
                    <StatusChip status={a.priority} size="sm" />
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-medium ${
                      a.status === 'OPEN' 
                        ? 'bg-blue-50 text-blue-700' 
                        : a.status === 'ACKNOWLEDGED' 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                </div>

                {/* Why Now Snippet */}
                <p className="text-xs text-[#5B6B7A] mt-2 leading-relaxed">
                  {a.why_now}
                </p>

                {/* Evidence & Action Toolbar */}
                <div className="mt-4 pt-3 border-t border-[#E3EBF2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-28">
                      <ConfidenceBar value={a.confidence} label="Engine Conf" />
                    </div>
                    {a.evidence_ids && a.evidence_ids.length > 0 && (
                      <div className="flex items-center space-x-1 text-xs font-mono text-[#1B6FB3]">
                        <span>Evidence:</span>
                        {a.evidence_ids.map(eid => (
                          <button
                            key={eid}
                            onClick={() => openEvidence(eid)}
                            className="underline hover:text-blue-800"
                          >
                            {eid}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions: View Evidence, Acknowledge, Dismiss */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {a.evidence_ids && a.evidence_ids.length > 0 && (
                      <button
                        onClick={() => openEvidence(a.evidence_ids[0])}
                        className="px-3 py-1.5 bg-[#F4F8FB] hover:bg-slate-200 text-[#0B1F33] rounded-lg font-medium transition-colors flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Evidence</span>
                      </button>
                    )}

                    {a.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcknowledge(a.id)}
                        className="px-3 py-1.5 bg-white border border-[#E3EBF2] hover:bg-amber-50 hover:border-amber-300 text-amber-800 rounded-lg font-medium transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {a.status !== 'DISMISSED' && (
                      <button
                        onClick={() => handleDismiss(a.id)}
                        className="px-3 py-1.5 bg-white border border-[#E3EBF2] hover:bg-slate-100 text-slate-600 rounded-lg font-medium transition-colors flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <EmptyState message="No alerts matching the selected priority and status filters." />
        )}
      </div>

    </div>
  );
}
