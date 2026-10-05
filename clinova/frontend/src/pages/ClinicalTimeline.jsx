import React, { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, Clock, Filter, AlertTriangle, Shield, 
  MapPin, ExternalLink, HelpCircle
} from 'lucide-react';
import { getTimeline, getGaps, getTurningPoints } from '../api';
import { usePatient } from '../context/PatientContext';
import { SectionHeader, CertaintyBadge, StatusChip, EmptyState } from '../components/Common';

export function ClinicalTimeline() {
  const { selectedPatientId, openEvidence } = usePatient();
  const [events, setEvents] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [turningPoints, setTurningPoints] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [hoveredEvent, setHoveredEvent] = useState(null);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    Promise.all([
      getTimeline(selectedPatientId),
      getGaps(selectedPatientId),
      getTurningPoints(selectedPatientId),
    ])
      .then(([evts, g, tp]) => {
        setEvents(evts);
        setGaps(g);
        setTurningPoints(tp);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPatientId]);

  // Track categories
  const TRACKS = [
    { id: 'DIAGNOSIS', label: 'Diagnosis & Milestones', color: '#1B6FB3', y: 40 },
    { id: 'LAB_RESULT', label: 'Laboratory Results', color: '#0E9AA7', y: 110 },
    { id: 'VITAL', label: 'Physiologic Vitals', color: '#2F80ED', y: 180 },
    { id: 'SYMPTOM', label: 'Reported Symptoms', color: '#D99A00', y: 250 },
    { id: 'MEDICATION', label: 'Medications', color: '#8E44AD', y: 320 },
    { id: 'CLINICAL_NOTE', label: 'Clinical Notes', color: '#5B6B7A', y: 390 },
    { id: 'HOSPITALIZATION', label: 'Hospital Encounters', color: '#D6353A', y: 460 },
  ];

  // Compute time range for SVG layout
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!events.length) return { minDate: null, maxDate: null, totalDays: 1 };
    const dates = events.map(e => new Date(e.event_time).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const days = Math.max(1, (max - min) / (1000 * 60 * 60 * 24));
    return { minDate: min, maxDate: max, totalDays: days };
  }, [events]);

  const svgWidth = 1100;
  const paddingLeft = 180;
  const paddingRight = 40;
  const chartWidth = svgWidth - paddingLeft - paddingRight;

  const getX = (dateStr) => {
    if (!minDate || totalDays <= 0) return paddingLeft;
    const t = new Date(dateStr).getTime();
    const daysFromStart = (t - minDate) / (1000 * 60 * 60 * 24);
    return paddingLeft + (daysFromStart / totalDays) * chartWidth;
  };

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events;
    if (filterType === 'MEDICATION') {
      return events.filter(e => e.event_type.startsWith('MEDICATION'));
    }
    return events.filter(e => e.event_type === filterType);
  }, [events, filterType]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white shimmer rounded-[14px]" />
        <div className="h-[520px] bg-white shimmer rounded-[14px]" />
      </div>
    );
  }

  // Find primary turning point date (e.g. Creatinine)
  const tpDate = turningPoints['Creatinine']?.date;

  return (
    <div className="space-y-6">
      
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Longitudinal Timeline</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Multi-track chronological visualization with certainty indicators and missing-interval bands
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 font-mono text-xs">
          {['ALL', 'LAB_RESULT', 'VITAL', 'SYMPTOM', 'MEDICATION', 'CLINICAL_NOTE'].map(ft => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === ft 
                  ? 'bg-[#1B6FB3] text-white font-semibold shadow-sm' 
                  : 'bg-white text-[#5B6B7A] hover:bg-[#F4F8FB] border border-[#E3EBF2]'
              }`}
            >
              {ft === 'ALL' ? 'All Tracks' : ft.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom Interactive SVG Timeline ── */}
      <div className="bg-white rounded-[14px] p-4 sm:p-6 border border-[#E3EBF2] shadow-soft overflow-x-auto">
        <svg 
          viewBox={`0 0 ${svgWidth} 520`} 
          className="w-full min-w-[900px] h-[520px] select-none"
        >
          {/* Track Guidelines & Labels */}
          {TRACKS.map(t => (
            <g key={t.id}>
              {/* Track label on left */}
              <text 
                x="15" 
                y={t.y + 4} 
                className="text-[11px] font-mono fill-[#5B6B7A] font-medium"
              >
                {t.label}
              </text>
              {/* Guideline across chart */}
              <line 
                x1={paddingLeft} 
                y1={t.y} 
                x2={svgWidth - paddingRight} 
                y2={t.y} 
                stroke="#E3EBF2" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
              />
            </g>
          ))}

          {/* ── Hatched Missing-Interval Bands (Gaps) ── */}
          {gaps.map((gap, idx) => {
            const x1 = getX(gap.start);
            const x2 = getX(gap.end);
            const width = Math.max(20, x2 - x1);
            return (
              <g key={idx}>
                {/* Diagonal stripes pattern fill */}
                <rect
                  x={x1}
                  y="20"
                  width={width}
                  height="470"
                  fill="url(#gapHatch)"
                  stroke="#D6353A"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.85"
                />
                <text
                  x={x1 + width / 2}
                  y="30"
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-[#D6353A]"
                >
                  {gap.days}-day data gap: state cannot be reliably established
                </text>
              </g>
            );
          })}

          {/* Pattern def for gap hatched stripes */}
          <defs>
            <pattern id="gapHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#D6353A" strokeWidth="2.5" opacity="0.12" />
            </pattern>
          </defs>

          {/* ── Vertical Turning-Point Marker ── */}
          {tpDate && (
            <g>
              <line
                x1={getX(tpDate)}
                y1="10"
                x2={getX(tpDate)}
                y2="490"
                stroke="#D99A00"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <rect
                x={getX(tpDate) - 55}
                y="10"
                width="110"
                height="20"
                rx="4"
                fill="#FFF6DD"
                stroke="#FDE199"
              />
              <text
                x={getX(tpDate)}
                y="24"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-[#A66F00]"
              >
                TURNING POINT
              </text>
            </g>
          )}

          {/* ── Event Markers ── */}
          {filteredEvents.map((evt) => {
            const x = getX(evt.event_time);
            let track = TRACKS.find(t => t.id === evt.event_type);
            if (!track && evt.event_type.startsWith('MEDICATION')) {
              track = TRACKS.find(t => t.id === 'MEDICATION');
            }
            if (!track) track = TRACKS[1];
            const y = track.y;

            const isHovered = hoveredEvent?.event_id === evt.event_id;
            const isApprox = evt.certainty === 'APPROXIMATE';
            const isRetro = evt.certainty === 'RETROSPECTIVE';

            return (
              <g 
                key={evt.event_id}
                onClick={() => openEvidence(evt.event_id)}
                onMouseEnter={() => setHoveredEvent(evt)}
                onMouseLeave={() => setHoveredEvent(null)}
                className="cursor-pointer group"
              >
                {/* Marker outer ring / certainty styling */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 9 : 6}
                  fill={isRetro ? "#CBD6E2" : track.color}
                  stroke={isApprox ? "#D99A00" : "#FFFFFF"}
                  strokeWidth={isApprox ? 2 : 1.5}
                  strokeDasharray={isApprox ? "2 2" : "none"}
                  className="transition-all duration-150"
                />

                {/* Inner center dot */}
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#FFFFFF"
                />
              </g>
            );
          })}

          {/* Time axis on bottom */}
          <line
            x1={paddingLeft}
            y1="495"
            x2={svgWidth - paddingRight}
            y2="495"
            stroke="#CBD6E2"
            strokeWidth="1.5"
          />
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredEvent && (
          <div className="mt-3 p-3 bg-[#0B1F33] text-white rounded-xl shadow-card flex items-center justify-between text-xs font-mono animate-in fade-in">
            <div className="flex items-center space-x-3">
              <span className="text-[#0E9AA7] font-bold">{hoveredEvent.event_time}</span>
              <span className="font-semibold text-white">{hoveredEvent.concept}</span>
              <span className="text-[#EAF2FE] bg-[#132D48] px-2 py-0.5 rounded">
                {hoveredEvent.value !== null ? String(hoveredEvent.value) : 'Reported'} {hoveredEvent.unit || ''}
              </span>
              <CertaintyBadge certainty={hoveredEvent.certainty} />
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-[#7A8B99]">
              <span>Doc: {hoveredEvent.source_document} ({hoveredEvent.source_location})</span>
              <span className="text-[#1B6FB3] font-bold underline cursor-pointer">Click to inspect</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Guide */}
      <div className="bg-white rounded-[14px] p-4 border border-[#E3EBF2] shadow-soft flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
          <span className="text-[#5B6B7A] font-semibold">Certainty Styles:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1B6FB3]" />
            <span>CONFIRMED (Solid)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-50" />
            <span>APPROXIMATE (Dashed)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full hatched-pattern border border-slate-400" />
            <span>RETROSPECTIVE (Hatched)</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[#7A8B99]">
          <HelpCircle className="w-4 h-4" />
          <span>Click any marker to open full evidence provenance hierarchy</span>
        </div>
      </div>

    </div>
  );
}
