import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, FastForward, 
  RotateCcw, AlertTriangle, Shield, Clock, Calendar, CheckCircle2 
} from 'lucide-react';
import { getReplay, getTimeline, getAlerts } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip, ConfidenceBar } from '../components/Common';

export function EvidenceReplay() {
  const { selectedPatientId, openEvidence } = usePatient();
  const [stages, setStages] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);
    setIsPlaying(false);
    setCurrentStep(0);

    Promise.all([
      getReplay(selectedPatientId),
      getTimeline(selectedPatientId),
      getAlerts(),
    ])
      .then(([rep, evts, allAlerts]) => {
        setStages(rep);
        setTimeline(evts);
        setAlerts(allAlerts.filter(a => a.patient_id === selectedPatientId));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPatientId]);

  // Unique chronological dates for scrubber
  const dates = useMemo(() => {
    return Array.from(new Set(timeline.map(e => e.event_time))).sort();
  }, [timeline]);

  const maxSteps = Math.max(1, dates.length - 1);
  const currentDate = dates[currentStep] || dates[0] || '2026-10-01';

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = 1600 / playbackSpeed;

    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= maxSteps) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, maxSteps]);

  // Keyboard navigation: Left / Right arrows
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentStep(prev => Math.min(maxSteps, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep(prev => Math.max(0, prev - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxSteps]);

  // Filter events visible up to currentDate
  const visibleEvents = useMemo(() => {
    return timeline.filter(e => e.event_time <= currentDate);
  }, [timeline, currentDate]);

  // Events that occurred on the current date (pulse)
  const currentEncounterEvents = useMemo(() => {
    return timeline.filter(e => e.event_time === currentDate);
  }, [timeline, currentDate]);

  // Current stage calculation
  const currentStageName = useMemo(() => {
    if (!stages.length) return 'STABLE';
    for (const s of stages) {
      if (currentDate >= s.date_range[0] && currentDate <= s.date_range[1]) {
        return s.stage;
      }
    }
    return stages[stages.length - 1].stage;
  }, [stages, currentDate]);

  // Active risk score for current stage
  const currentRiskScore = useMemo(() => {
    const pct = currentStep / maxSteps;
    if (selectedPatientId === 'P-1024') {
      return Math.round(15 + pct * 65);
    }
    if (selectedPatientId === 'P-2031') {
      return Math.round(20 + pct * 70);
    }
    return 10;
  }, [currentStep, maxSteps, selectedPatientId]);

  if (loading || !dates.length) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white shimmer rounded-[14px]" />
        <div className="h-96 bg-white shimmer rounded-[14px]" />
      </div>
    );
  }

  const STAGE_ORDER = ["STABLE", "EARLY_SIGNAL", "PROGRESSIVE", "TURNING_POINT", "ACCELERATION", "CURRENT"];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Longitudinal Evidence Replay</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Step through clinical evolution day-by-day with synchronized trajectory revelation and alert triggers
          </p>
        </div>
        <div className="text-xs font-mono text-[#5B6B7A] bg-white px-3 py-1.5 rounded-lg border border-[#E3EBF2]">
          Space: Play/Pause · ←/→: Step
        </div>
      </div>

      {/* ── 1. Replay Control Deck ── */}
      <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft space-y-4">
        
        {/* Stage Stepper Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E3EBF2]">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-semibold uppercase text-[#5B6B7A]">Replay Stage:</span>
            <StatusChip status={currentStageName} />
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className="text-[#0B1F33]">
              Encounter: <span className="font-bold text-[#1B6FB3]">{currentDate}</span>
            </div>
            <div className="text-[#5B6B7A]">
              Step <span className="font-bold">{currentStep + 1}</span> of {dates.length}
            </div>
          </div>
        </div>

        {/* Stepper Pipeline Visual */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 font-mono text-[11px]">
          {STAGE_ORDER.map((stageKey, idx) => {
            const isPassed = STAGE_ORDER.indexOf(currentStageName) >= idx;
            const isCurrent = currentStageName === stageKey;
            return (
              <div 
                key={stageKey}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isCurrent 
                    ? 'border-[#1B6FB3] bg-[#EAF2FE] text-[#1B6FB3] font-bold shadow-sm' 
                    : isPassed 
                    ? 'border-[#A8E2C9] bg-[#E8F6F0] text-[#1E9E6A]' 
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <div className="truncate">{stageKey.replace('_', ' ')}</div>
              </div>
            );
          })}
        </div>

        {/* Scrubber Range Slider */}
        <div className="pt-2">
          <input
            type="range"
            min={0}
            max={maxSteps}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(parseInt(e.target.value));
            }}
            className="w-full h-2 bg-[#E3EBF2] rounded-lg appearance-none cursor-pointer accent-[#1B6FB3]"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#7A8B99] mt-1">
            <span>{dates[0]} (Baseline)</span>
            <span>{dates[Math.floor(dates.length / 2)]}</span>
            <span>{dates[dates.length - 1]} (Current)</span>
          </div>
        </div>

        {/* Playback Button Toolbar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentStep(0)}
              className="p-2 rounded-lg border border-[#E3EBF2] bg-white hover:bg-slate-50 text-[#0B1F33] transition-colors"
              title="Reset to beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="p-2 rounded-lg border border-[#E3EBF2] bg-white hover:bg-slate-50 text-[#0B1F33] disabled:opacity-40 transition-colors"
              title="Previous encounter"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-[#1B6FB3] hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-2 shadow-sm transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Replay' : 'Play Replay'}</span>
            </button>

            <button
              onClick={() => setCurrentStep(prev => Math.min(maxSteps, prev + 1))}
              disabled={currentStep >= maxSteps}
              className="p-2 rounded-lg border border-[#E3EBF2] bg-white hover:bg-slate-50 text-[#0B1F33] disabled:opacity-40 transition-colors"
              title="Next encounter"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Switcher */}
          <div className="flex items-center space-x-1 font-mono text-xs">
            <span className="text-[#5B6B7A] mr-1">Speed:</span>
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-1 rounded border text-xs ${
                  playbackSpeed === s 
                    ? 'bg-[#0B1F33] text-white border-[#0B1F33]' 
                    : 'bg-white text-[#5B6B7A] border-[#E3EBF2] hover:bg-slate-50'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── 2. Replay Live Stage: Synchronized Evolution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Unfolding Clinical Encounter Events */}
        <div className="lg:col-span-2 bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3EBF2] mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F33]">
                Chronological Events Revealed Up To {currentDate}
              </h3>
              <p className="text-xs text-[#5B6B7A]">
                {visibleEvents.length} of {timeline.length} events revealed
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#1B6FB3] bg-[#EAF2FE] px-2.5 py-1 rounded-full">
              {currentEncounterEvents.length} on this date
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            <AnimatePresence>
              {visibleEvents.map((evt) => {
                const isCurrentEncounter = evt.event_time === currentDate;
                return (
                  <motion.div
                    key={evt.event_id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => openEvidence(evt.event_id)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isCurrentEncounter 
                        ? 'border-[#1B6FB3] bg-[#EAF2FE]/50 shadow-card font-medium ring-1 ring-[#1B6FB3]/30' 
                        : 'border-[#E3EBF2] bg-[#F8FAFC] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-[10px] text-[#5B6B7A] bg-slate-200 px-1.5 py-0.5 rounded">
                        {evt.event_time}
                      </span>
                      <span className="font-semibold text-[#0B1F33]">{evt.concept}</span>
                      <span className="font-mono font-bold text-[#1B6FB3]">
                        {evt.value !== null ? String(evt.value) : 'Recorded'} {evt.unit || ''}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <StatusChip status={evt.event_type} size="sm" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Col: Progressive Risk Score & Triggered Alerts */}
        <div className="space-y-6">
          
          {/* Evolving Risk Meter */}
          <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
            <div className="text-xs uppercase font-mono tracking-wider text-[#5B6B7A] font-semibold mb-2">
              Deterioration Score at {currentDate}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-4xl font-extrabold font-mono transition-colors duration-300 ${
                currentRiskScore >= 50 ? 'text-[#D6353A]' : currentRiskScore >= 30 ? 'text-[#D99A00]' : 'text-[#1E9E6A]'
              }`}>
                {currentRiskScore}
              </span>
              <span className="text-xs text-[#7A8B99] font-mono">/ 100</span>
            </div>

            <div className="mt-3">
              <ConfidenceBar value={currentRiskScore} label="Composite Risk Index" />
            </div>
          </div>

          {/* Alerts Triggered By This Encounter */}
          <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
            <h3 className="text-xs uppercase font-mono tracking-wider text-[#0B1F33] font-semibold pb-2 border-b border-[#E3EBF2] mb-3">
              Active Alerts at this Date
            </h3>

            <div className="space-y-2.5">
              {alerts.length > 0 && currentRiskScore >= 30 ? (
                alerts.slice(0, 2).map((a) => (
                  <div 
                    key={a.id} 
                    className="p-2.5 rounded-lg border border-l-4 border-l-[#D6353A] border-[#F8B4B6] bg-[#FDECEC]/30 text-xs"
                  >
                    <div className="font-semibold text-[#0B1F33]">{a.title}</div>
                    <div className="text-[11px] text-[#5B6B7A] mt-1">{a.why_now}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#7A8B99] py-4 text-center">
                  All longitudinal parameters within normal limits.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
