import React, { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, ReferenceLine, ReferenceArea, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, HelpCircle, Shield } from 'lucide-react';
import { getTrajectories, getTimeline, getGaps } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip, SectionHeader } from '../components/Common';

export function Trajectory() {
  const { selectedPatientId, openEvidence } = usePatient();
  const [trajectories, setTrajectories] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    Promise.all([
      getTrajectories(selectedPatientId),
      getTimeline(selectedPatientId),
      getGaps(selectedPatientId),
    ])
      .then(([traj, evts, g]) => {
        setTrajectories(traj);
        setTimeline(evts);
        setGaps(g);
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
        <div className="h-14 bg-white shimmer rounded-[14px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-white shimmer rounded-[14px]" />
          ))}
        </div>
      </div>
    );
  }

  // Helper to extract series for recharts
  const getSeries = (concepts) => {
    const dates = Array.from(new Set(timeline.map(e => e.event_time))).sort();
    return dates.map(d => {
      const row = { date: d.slice(5) }; // MM-DD for label
      concepts.forEach(c => {
        const match = timeline.find(e => e.event_time === d && e.concept === c && e.value !== null);
        if (match) {
          row[c] = parseFloat(match.value);
          row[`${c}_id`] = match.event_id;
        }
      });
      return row;
    }).filter(row => concepts.some(c => row[c] !== undefined));
  };

  const renalData = getSeries(['Creatinine', 'eGFR']);
  const inflamData = getSeries(['WBC', 'CRP', 'Lactate']);
  const hemoData = getSeries(['Heart Rate', 'Blood Pressure Systolic']);
  const respData = getSeries(['Respiratory Rate', 'SpO2']);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Clinical Trajectories & Small Multiples</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Longitudinal trend decomposition, CUSUM inflection detection, and confidence envelopes
          </p>
        </div>
        <div className="text-xs font-mono text-[#5B6B7A] bg-white px-3 py-1.5 rounded-lg border border-[#E3EBF2]">
          Patient: {selectedPatientId}
        </div>
      </div>

      {/* Trajectory Status Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {trajectories.map((t) => (
          <div key={t.name} className="p-3 bg-white rounded-xl border border-[#E3EBF2] shadow-soft">
            <div className="text-[11px] font-mono text-[#5B6B7A] uppercase">{t.name}</div>
            <div className="mt-1.5">
              <StatusChip status={t.trajectory_status} size="sm" />
            </div>
            <div className="text-[10px] font-mono text-[#7A8B99] mt-2 flex justify-between">
              <span>ROC: {t.rate_of_change > 0 ? `+${t.rate_of_change}%` : `${t.rate_of_change}%`}</span>
              <span>{Math.round(t.confidence * 100)}% conf</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Small Multiples Charts (4 Domains) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Renal Trajectory */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F33]">Renal Function (Creatinine & eGFR)</h3>
              <p className="text-[11px] font-mono text-[#5B6B7A]">Serum Creatinine (mg/dL) [L] vs eGFR (mL/min) [R]</p>
            </div>
            <StatusChip status={trajectories.find(t => t.name === 'Renal')?.trajectory_status || 'STABLE'} size="sm" />
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={renalData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                <XAxis dataKey="date" stroke="#7A8B99" fontSize={11} fontFamily="monospace" />
                <YAxis yAxisId="left" stroke="#1B6FB3" fontSize={11} fontFamily="monospace" domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#0E9AA7" fontSize={11} fontFamily="monospace" domain={['auto', 'auto']} />
                <Tooltip />
                {/* Turning point indicator */}
                {trajectories.find(t => t.name === 'Renal')?.turning_point && (
                  <ReferenceLine 
                    yAxisId="left" 
                    x={trajectories.find(t => t.name === 'Renal')?.turning_point.date.slice(5)} 
                    stroke="#D99A00" 
                    strokeDasharray="4 4" 
                    label={{ value: 'Turning Point', fill: '#D99A00', fontSize: 10 }}
                  />
                )}
                <Line yAxisId="left" type="monotone" dataKey="Creatinine" stroke="#1B6FB3" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="eGFR" stroke="#0E9AA7" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Inflammatory Trajectory */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F33]">Inflammatory Response (WBC & CRP)</h3>
              <p className="text-[11px] font-mono text-[#5B6B7A]">WBC (x10^9/L) & CRP (mg/L)</p>
            </div>
            <StatusChip status={trajectories.find(t => t.name === 'Inflammatory')?.trajectory_status || 'STABLE'} size="sm" />
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inflamData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                <XAxis dataKey="date" stroke="#7A8B99" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#D6353A" fontSize={11} fontFamily="monospace" domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="WBC" stroke="#D6353A" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="CRP" stroke="#D99A00" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Lactate" stroke="#8E44AD" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Hemodynamic Trajectory */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F33]">Hemodynamics (HR & Systolic BP)</h3>
              <p className="text-[11px] font-mono text-[#5B6B7A]">Heart Rate (bpm) vs Systolic BP (mmHg)</p>
            </div>
            <StatusChip status={trajectories.find(t => t.name === 'Hemodynamic')?.trajectory_status || 'STABLE'} size="sm" />
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hemoData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                <XAxis dataKey="date" stroke="#7A8B99" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#0B1F33" fontSize={11} fontFamily="monospace" domain={[50, 160]} />
                <Tooltip />
                {/* Hypotension boundary */}
                <ReferenceLine y={90} stroke="#D6353A" strokeDasharray="3 3" label={{ value: 'Hypotension (90)', fill: '#D6353A', fontSize: 10 }} />
                {/* Tachycardia boundary */}
                <ReferenceLine y={100} stroke="#D99A00" strokeDasharray="3 3" label={{ value: 'Tachycardia (100)', fill: '#D99A00', fontSize: 10 }} />
                <Line type="monotone" dataKey="Heart Rate" stroke="#D6353A" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Blood Pressure Systolic" stroke="#1B6FB3" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Respiratory Trajectory */}
        <div className="bg-white rounded-[14px] p-5 border border-[#E3EBF2] shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F33]">Respiratory Status (RR & SpO2)</h3>
              <p className="text-[11px] font-mono text-[#5B6B7A]">Respiratory Rate (breaths/min) & SpO2 (%)</p>
            </div>
            <StatusChip status={trajectories.find(t => t.name === 'Respiratory')?.trajectory_status || 'STABLE'} size="sm" />
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={respData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                <XAxis dataKey="date" stroke="#7A8B99" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#0B1F33" fontSize={11} fontFamily="monospace" domain={[10, 100]} />
                <Tooltip />
                <ReferenceLine y={20} stroke="#D99A00" strokeDasharray="3 3" label={{ value: 'Tachypnea (>20)', fill: '#D99A00', fontSize: 10 }} />
                <ReferenceLine y={94} stroke="#D6353A" strokeDasharray="3 3" label={{ value: 'Hypoxia (<94%)', fill: '#D6353A', fontSize: 10 }} />
                <Line type="monotone" dataKey="Respiratory Rate" stroke="#D99A00" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="SpO2" stroke="#1E9E6A" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
