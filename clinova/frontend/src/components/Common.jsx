import React from 'react';
import { AlertTriangle, CheckCircle, Info, ShieldAlert, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export function StatusChip({ status, size = "md" }) {
  const s = (status || "").toUpperCase();
  let bg = "bg-slate-100 text-slate-700 border-slate-200";
  let dot = "bg-slate-400";
  let icon = null;

  if (s.includes("HIGH") || s.includes("ACCELERAT") || s.includes("CRITICAL")) {
    bg = "bg-[#FDECEC] text-[#D6353A] border-[#F8B4B6]";
    dot = "bg-[#D6353A]";
    icon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
  } else if (s.includes("EMERG") || s.includes("PROGRESSIVE") || s.includes("EARLY") || s.includes("MODERATE")) {
    bg = "bg-[#FFF6DD] text-[#A66F00] border-[#FDE199]";
    dot = "bg-[#D99A00]";
    icon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
  } else if (s.includes("STABLE") || s.includes("RECOVER") || s.includes("ROUTINE") || s.includes("LOW")) {
    bg = "bg-[#E8F6F0] text-[#1E9E6A] border-[#A8E2C9]";
    dot = "bg-[#1E9E6A]";
    icon = <CheckCircle className="w-3.5 h-3.5 mr-1" />;
  } else if (s.includes("INFO") || s.includes("OPEN")) {
    bg = "bg-[#EAF2FE] text-[#2F80ED] border-[#B9D5FD]";
    dot = "bg-[#2F80ED]";
    icon = <Info className="w-3.5 h-3.5 mr-1" />;
  }

  const sizeClass = size === "sm" 
    ? "px-2 py-0.5 text-[11px] font-medium" 
    : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span className={`inline-flex items-center rounded-full border ${bg} ${sizeClass} tracking-wide transition-colors duration-200`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} mr-1.5 shrink-0`} />
      {status}
    </span>
  );
}

export function MetricTile({ label, value, delta, sublabel, alert = false, onClick }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[14px] p-4 border border-[#E3EBF2] shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${onClick ? 'cursor-pointer' : ''} ${alert ? 'border-l-4 border-l-[#D6353A]' : ''}`}
    >
      <div className="text-[11px] uppercase tracking-wider text-[#5B6B7A] font-medium mb-1 truncate">
        {label}
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold font-mono tracking-tight text-[#0B1F33]">
          {value}
        </div>
        {delta !== undefined && delta !== null && (
          <div className={`flex items-center text-xs font-mono font-medium ${isPositive ? 'text-[#D6353A]' : isNegative ? 'text-[#1E9E6A]' : 'text-[#5B6B7A]'}`}>
            {isPositive ? <ArrowUp className="w-3 h-3 mr-0.5" /> : isNegative ? <ArrowDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      {sublabel && (
        <div className="text-xs text-[#7A8B99] mt-1.5 truncate">
          {sublabel}
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-[#E3EBF2] mb-4">
      <div>
        <h2 className="text-base font-semibold text-[#0B1F33] tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-[#5B6B7A] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function ConfidenceBar({ value, label = "Confidence" }) {
  const pct = Math.round((value > 1 ? value : value * 100));
  let color = "bg-[#1E9E6A]";
  if (pct < 60) color = "bg-[#D99A00]";
  if (pct < 40) color = "bg-[#D6353A]";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-[11px] text-[#5B6B7A] mb-1 font-mono">
        <span>{label}</span>
        <span className="font-semibold text-[#0B1F33]">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-[#E3EBF2] rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

export function CertaintyBadge({ certainty }) {
  const c = (certainty || "CONFIRMED").toUpperCase();
  
  if (c === "CONFIRMED") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-[#EAF2FE] text-[#1B6FB3] border border-[#B9D5FD]">
        CONFIRMED
      </span>
    );
  }
  if (c === "APPROXIMATE") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-amber-50 text-amber-700 border border-dashed border-amber-400">
        APPROXIMATE
      </span>
    );
  }
  if (c === "INFERRED") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-50 text-slate-600 border border-dotted border-slate-400">
        INFERRED
      </span>
    );
  }
  if (c === "RETROSPECTIVE") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded hatched-pattern text-slate-700 border border-slate-300">
        RETROSPECTIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-gray-100 text-gray-500 border border-gray-300">
      UNKNOWN
    </span>
  );
}

export function ECGStrip({ animated = true, width = 160, height = 30, color = "#1B6FB3" }) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 40" fill="none" className="overflow-visible">
      <path
        d="M0 20 L40 20 L48 20 L52 14 L56 26 L60 20 L75 20 L80 4 L86 36 L92 12 L96 22 L100 20 L115 20 L120 16 L124 20 L140 20 L155 20 L160 14 L164 24 L168 20 L200 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "ecg-path" : ""}
      />
    </svg>
  );
}

export function EmptyState({ message = "No data available", submessage }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-[14px] border border-[#E3EBF2]">
      <div className="w-10 h-10 rounded-full bg-[#F4F8FB] flex items-center justify-center text-[#5B6B7A] mb-3">
        <Info className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-[#0B1F33]">{message}</p>
      {submessage && <p className="text-xs text-[#5B6B7A] mt-1">{submessage}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#FDECEC] rounded-[14px] border border-[#F8B4B6]">
      <ShieldAlert className="w-8 h-8 text-[#D6353A] mb-2" />
      <p className="text-sm font-semibold text-[#D6353A]">Clinical Engine Error</p>
      <p className="text-xs text-slate-600 mt-1 max-w-md">{error || "Unable to retrieve clinical data."}</p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="mt-3 px-3 py-1.5 text-xs bg-white text-[#D6353A] border border-[#F8B4B6] rounded-md font-medium hover:bg-red-50"
        >
          Retry
        </button>
      )}
    </div>
  );
}
