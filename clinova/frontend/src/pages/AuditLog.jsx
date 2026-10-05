import React, { useEffect, useState } from 'react';
import { FileCheck, Shield, Clock, Search, RefreshCw } from 'lucide-react';
import { getAudit } from '../api';
import { EmptyState } from '../components/Common';

export function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAudit = () => {
    setLoading(true);
    getAudit()
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.resource.toLowerCase().includes(term) ||
      (l.details && l.details.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Governance Audit Trail</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Immutable in-memory access log recording all clinician views, evidence inspections, and alert triage actions
          </p>
        </div>

        <button
          onClick={loadAudit}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E3EBF2] hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[14px] border border-[#E3EBF2] shadow-soft overflow-hidden">
        <div className="p-4 border-b border-[#E3EBF2] flex items-center justify-between">
          <div className="text-xs font-mono font-semibold text-[#0B1F33]">
            Audit Entries ({filteredLogs.length})
          </div>
          <input
            type="text"
            placeholder="Search action or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs font-mono px-3 py-1.5 rounded-lg border border-[#E3EBF2] focus:border-[#1B6FB3] focus:outline-none w-56"
          />
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 shimmer rounded" />
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#F8FAFC] border-b border-[#E3EBF2] text-[#5B6B7A] uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Clinician / User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Clinical Resource</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EBF2]">
                {filteredLogs.slice().reverse().map((entry, idx) => (
                  <tr key={idx} className="hover:bg-[#F4F8FB]">
                    <td className="py-3 px-4 text-[#7A8B99] whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0B1F33]">
                      {entry.user}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.action === 'EVIDENCE_OPEN' 
                          ? 'bg-[#EAF2FE] text-[#1B6FB3]' 
                          : entry.action === 'ACKNOWLEDGE'
                          ? 'bg-amber-50 text-amber-700'
                          : entry.action === 'DISMISS'
                          ? 'bg-red-50 text-red-700'
                          : entry.action === 'INGEST'
                          ? 'bg-[#E8F6F0] text-[#1E9E6A]'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#1B6FB3] font-medium">
                      {entry.resource}
                    </td>
                    <td className="py-3 px-4 text-[#5B6B7A] truncate max-w-xs">
                      {entry.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState message="No audit records found." />
          </div>
        )}
      </div>

    </div>
  );
}
