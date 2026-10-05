import React, { useEffect, useState } from 'react';
import { 
  BookOpen, HelpCircle, Shield, FileText, CheckCircle2, 
  AlertTriangle, ExternalLink, Calendar, Info 
} from 'lucide-react';
import { getStoryline } from '../api';
import { usePatient } from '../context/PatientContext';
import { ConfidenceBar, SectionHeader, StatusChip } from '../components/Common';

export function Storyline() {
  const { selectedPatientId, openEvidence } = usePatient();
  const [storylineData, setStorylineData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    getStoryline(selectedPatientId)
      .then(data => {
        setStorylineData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPatientId]);

  if (loading || !storylineData) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white shimmer rounded-[14px]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white shimmer rounded-[14px]" />
          <div className="h-96 bg-white shimmer rounded-[14px]" />
        </div>
      </div>
    );
  }

  const { sections, confidence, unknowns, data_quality } = storylineData;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Storyline Narrative</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Template-structured clinical synthesis with embedded deterministic evidence provenance
          </p>
        </div>

        <div className="w-48 bg-white p-2.5 rounded-xl border border-[#E3EBF2] shadow-soft">
          <ConfidenceBar value={confidence} label="Narrative Confidence" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left 2 Cols: Sectioned Narrative Cards ── */}
        <div className="lg:col-span-2 space-y-4">
          {sections.map((sec, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft space-y-2 hover:border-[#1B6FB3] transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1B6FB3]">
                  {sec.title}
                </h3>
                {sec.evidence_ids && sec.evidence_ids.length > 0 && (
                  <span className="text-[10px] font-mono text-[#5B6B7A] bg-[#F4F8FB] px-2 py-0.5 rounded border border-[#E3EBF2]">
                    {sec.evidence_ids.length} supporting evidence items
                  </span>
                )}
              </div>

              <p className="text-xs text-[#0B1F33] leading-relaxed font-sans">
                {sec.content}
              </p>

              {/* Inline Evidence Chips */}
              {sec.evidence_ids && sec.evidence_ids.length > 0 && (
                <div className="pt-2 flex items-center flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className="text-[#7A8B99] mr-1">Trace:</span>
                  {sec.evidence_ids.slice(0, 5).map(eid => (
                    <button
                      key={eid}
                      onClick={() => openEvidence(eid)}
                      className="px-2 py-0.5 bg-[#EAF2FE] text-[#1B6FB3] hover:bg-[#1B6FB3] hover:text-white rounded transition-colors flex items-center space-x-1"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      <span>{eid}</span>
                    </button>
                  ))}
                  {sec.evidence_ids.length > 5 && (
                    <span className="text-[#7A8B99] px-1">+{sec.evidence_ids.length - 5} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Right Col: What AI Does NOT Know + Quality Bars ── */}
        <div className="space-y-6">
          
          {/* Side Card 1: What AI Does NOT Know */}
          <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-[#D99A00]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0B1F33]">
                  What the Engine Does NOT Know
                </h3>
              </div>
              <p className="text-[11px] text-[#5B6B7A] mt-0.5">
                Explicit delineation of clinical blindspots and non-observed states
              </p>
            </div>

            {/* Unknowns List */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-semibold text-[#D6353A] flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Clinical Record Unknowns ({unknowns?.unknown?.length || 0}):</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#5B6B7A] font-sans pl-1">
                {unknowns?.unknown?.map((u, i) => (
                  <li key={i} className="flex items-start space-x-2 bg-red-50/50 p-2 rounded border border-red-100">
                    <span className="text-[#D6353A] font-bold">•</span>
                    <span className="leading-tight">{u}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Knowns List */}
            <div className="space-y-2 pt-2 border-t border-[#E3EBF2]">
              <div className="text-[11px] font-mono font-semibold text-[#1E9E6A] flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Directly Observed ({unknowns?.known?.length || 0}):</span>
              </div>
              <ul className="space-y-1 text-xs text-[#5B6B7A] font-sans pl-1">
                {unknowns?.known?.map((k, i) => (
                  <li key={i} className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E9E6A]" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Side Card 2: Data Quality Breakdown */}
          {data_quality && (
            <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft space-y-3 font-mono text-xs">
              <div className="text-xs uppercase font-bold text-[#0B1F33]">
                Patient Record Completeness
              </div>
              
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] text-[#5B6B7A] mb-1">
                    <span>Overall Completeness</span>
                    <span className="font-bold text-[#0B1F33]">{data_quality.overall}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E3EBF2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1B6FB3]" style={{ width: `${data_quality.overall}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#5B6B7A] mb-1">
                    <span>Laboratory Density</span>
                    <span className="font-bold text-[#0B1F33]">{data_quality.lab}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E3EBF2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0E9AA7]" style={{ width: `${data_quality.lab}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#5B6B7A] mb-1">
                    <span>Vital Signs Density</span>
                    <span className="font-bold text-[#0B1F33]">{data_quality.vital}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E3EBF2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#2F80ED]" style={{ width: `${data_quality.vital}%` }} />
                  </div>
                </div>
              </div>

              {data_quality.confidence_reduction > 0 && (
                <div className="p-2 bg-amber-50 text-amber-800 text-[10px] rounded border border-amber-200 mt-2">
                  Confidence reduced by -{Math.round(data_quality.confidence_reduction * 100)}% due to missing intervals.
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
