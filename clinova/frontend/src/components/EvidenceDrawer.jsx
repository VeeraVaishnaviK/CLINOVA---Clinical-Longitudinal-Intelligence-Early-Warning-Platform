import React, { useEffect, useState } from 'react';
import { X, FileText, CheckCircle2, Shield, Calendar, MapPin, ExternalLink, Activity } from 'lucide-react';
import { getEvidence } from '../api';
import { CertaintyBadge, StatusChip } from './Common';

export function EvidenceDrawer({ eventId, isOpen, onClose }) {
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!eventId || !isOpen) {
      setEvidence(null);
      return;
    }
    setLoading(true);
    setError(null);
    getEvidence(eventId)
      .then(data => {
        setEvidence(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Could not load evidence item.");
        setLoading(false);
      });
  }, [eventId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0B1F33]/40 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-drawer flex flex-col z-10 border-l border-[#E3EBF2] animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EBF2] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#EAF2FE] flex items-center justify-center text-[#1B6FB3]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F33]">Traceable Clinical Evidence</h3>
              <p className="text-[11px] font-mono text-[#5B6B7A]">{eventId || "Evidence Viewer"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#5B6B7A] hover:text-[#0B1F33] hover:bg-slate-200 transition-colors"
            aria-label="Close evidence drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading && (
            <div className="space-y-4">
              <div className="h-6 w-3/4 shimmer rounded" />
              <div className="h-20 shimmer rounded-[14px]" />
              <div className="h-32 shimmer rounded-[14px]" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {evidence && !loading && (
            <>
              {/* Claim / Concept summary */}
              <div className="bg-[#F8FAFC] rounded-[14px] p-4 border border-[#E3EBF2]">
                <div className="text-[11px] uppercase font-mono tracking-wider text-[#5B6B7A] mb-1">
                  Clinical Statement
                </div>
                <div className="text-base font-semibold text-[#0B1F33] flex items-baseline justify-between">
                  <span>{evidence.concept}</span>
                  <span className="font-mono text-lg font-bold text-[#1B6FB3]">
                    {evidence.value !== null ? String(evidence.value) : 'Reported'} {evidence.unit || ''}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <StatusChip status={evidence.event_type} size="sm" />
                  <CertaintyBadge certainty={evidence.certainty} />
                </div>
              </div>

              {/* Provenance Hierarchy */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#0B1F33] uppercase tracking-wider font-mono">
                  Evidence Provenance
                </div>

                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E3EBF2]">
                  {/* Step 1: Extraction */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#1B6FB3] flex items-center justify-center text-[10px] font-bold text-[#1B6FB3]">
                      1
                    </span>
                    <div className="text-xs font-medium text-[#0B1F33]">Extraction Method</div>
                    <div className="text-xs text-[#5B6B7A] font-mono mt-0.5">
                      {evidence.extraction_method} ({evidence.confidence ? `${Math.round(evidence.confidence * 100)}% confidence` : 'Deterministic'})
                    </div>
                  </div>

                  {/* Step 2: Source Document */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#0E9AA7] flex items-center justify-center text-[10px] font-bold text-[#0E9AA7]">
                      2
                    </span>
                    <div className="text-xs font-medium text-[#0B1F33]">Source Document</div>
                    <div className="text-xs text-[#0B1F33] font-mono bg-[#E8F6F0] p-2 rounded border border-[#A8E2C9] mt-1 flex items-center justify-between">
                      <span className="truncate">{evidence.source_document}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#1E9E6A] shrink-0 ml-1" />
                    </div>
                  </div>

                  {/* Step 3: Source Location */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#D99A00] flex items-center justify-center text-[10px] font-bold text-[#D99A00]">
                      3
                    </span>
                    <div className="text-xs font-medium text-[#0B1F33]">Exact Document Location</div>
                    <div className="text-xs text-[#5B6B7A] font-mono mt-0.5 flex items-center">
                      <MapPin className="w-3 h-3 text-[#5B6B7A] mr-1" />
                      {evidence.source_location}
                    </div>
                  </div>

                  {/* Step 4: Timestamp & Precision */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#1B6FB3] flex items-center justify-center text-[10px] font-bold text-[#1B6FB3]">
                      4
                    </span>
                    <div className="text-xs font-medium text-[#0B1F33]">Event Timing & Precision</div>
                    <div className="text-xs text-[#5B6B7A] font-mono mt-0.5 flex items-center">
                      <Calendar className="w-3 h-3 text-[#5B6B7A] mr-1" />
                      {evidence.event_time} ({evidence.time_precision})
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision Support Compliance Note */}
              <div className="bg-[#FFF6DD] p-3 rounded-lg border border-[#FDE199] text-[11px] text-[#A66F00] flex items-start space-x-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-[#D99A00]" />
                <div>
                  <span className="font-semibold">Clinical Traceability: </span>
                  Every clinical statement generated by CLINOVA carries deterministic source provenance. 
                  Zero synthetic hallucinations. Clinician verification advised before clinical action.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E3EBF2] bg-[#F8FAFC] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-[#E3EBF2] rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
