import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, Handle, Position, useNodesState, useEdgesState 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Database, Shield, ExternalLink, HelpCircle, Layers } from 'lucide-react';
import { getEvidenceGraph, getFhirMapping } from '../api';
import { usePatient } from '../context/PatientContext';
import { StatusChip } from '../components/Common';

// ── Custom Node Components ──

function PatientNode({ data }) {
  return (
    <div className="bg-[#0B1F33] text-white p-3 rounded-xl border border-[#132D48] shadow-card min-w-[150px] font-mono text-xs">
      <div className="text-[10px] text-[#7A8B99] uppercase">Patient Root</div>
      <div className="font-bold text-sm text-white mt-0.5">{data.label}</div>
      <div className="text-[11px] text-slate-300 mt-0.5">{data.age}y · {data.sex}</div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-[#1B6FB3]" />
    </div>
  );
}

function EventNode({ data }) {
  return (
    <div className="bg-white p-2.5 rounded-xl border border-[#E3EBF2] shadow-soft hover:border-[#1B6FB3] min-w-[140px] text-xs transition-colors cursor-pointer">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#7A8B99]" />
      <div className="text-[9px] uppercase font-mono text-[#5B6B7A]">{data.date}</div>
      <div className="font-semibold text-[#0B1F33] truncate">{data.label}</div>
      <div className="font-mono text-[#1B6FB3] font-bold text-[11px]">
        {data.value} {data.unit}
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#1B6FB3]" />
    </div>
  );
}

function TrajectoryNode({ data }) {
  return (
    <div className="bg-[#F8FAFC] p-3 rounded-xl border-2 border-[#0E9AA7] shadow-soft min-w-[150px] text-xs font-mono">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#0E9AA7]" />
      <div className="text-[9px] uppercase text-[#5B6B7A]">Trajectory</div>
      <div className="font-bold text-[#0B1F33] mt-0.5">{data.label}</div>
      <div className="mt-1">
        <StatusChip status={data.status} size="sm" />
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#0E9AA7]" />
    </div>
  );
}

function RiskNode({ data }) {
  return (
    <div className="bg-[#FFF6DD] p-3 rounded-xl border-2 border-[#D99A00] shadow-soft min-w-[140px] text-xs font-mono text-center">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#D99A00]" />
      <div className="text-[9px] uppercase text-[#A66F00] font-bold">Composite Risk</div>
      <div className="font-extrabold text-sm text-[#0B1F33] mt-0.5">{data.label}</div>
      <div className="text-[10px] text-[#D99A00] font-bold mt-0.5">{data.level}</div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#D99A00]" />
    </div>
  );
}

function AlertNode({ data }) {
  const isHigh = data.priority === 'HIGH';
  return (
    <div className={`p-3 rounded-xl border-2 shadow-soft min-w-[160px] text-xs ${
      isHigh ? 'bg-[#FDECEC] border-[#D6353A]' : 'bg-[#FFF6DD] border-[#D99A00]'
    }`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#D6353A]" />
      <div className="text-[9px] uppercase font-mono font-bold text-[#5B6B7A]">Active Warning</div>
      <div className="font-semibold text-[#0B1F33] mt-0.5 line-clamp-2">{data.label}</div>
      <div className="mt-1 font-mono text-[10px] font-bold text-[#D6353A]">{data.priority}</div>
    </div>
  );
}

const nodeTypes = {
  patient: PatientNode,
  event: EventNode,
  medication: EventNode,
  trajectory: TrajectoryNode,
  risk_signal: RiskNode,
  alert: AlertNode,
};

export function EvidenceGraph() {
  const { selectedPatientId, openEvidence } = usePatient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [fhirModalOpen, setFhirModalOpen] = useState(false);
  const [fhirData, setFhirData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);

    getEvidenceGraph(selectedPatientId)
      .then(graph => {
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPatientId, setNodes, setEdges]);

  const onNodeClick = useCallback((_, node) => {
    if (node.type === 'event' || node.type === 'medication') {
      openEvidence(node.id);
    }
  }, [openEvidence]);

  const loadFhir = () => {
    setFhirModalOpen(true);
    if (!fhirData) {
      getFhirMapping().then(setFhirData).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white shimmer rounded-[14px]" />
        <div className="h-[600px] bg-white shimmer rounded-[14px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header and FHIR Modal Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E3EBF2] gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] tracking-tight">Traceable Clinical Evidence Graph</h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Directed acyclic graph mapping patient root to events, domain trajectories, composite risk, and alerts
          </p>
        </div>

        <button
          onClick={loadFhir}
          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-[#E3EBF2] hover:bg-[#F8FAFC] text-[#1B6FB3] font-semibold text-xs rounded-lg shadow-sm transition-all"
        >
          <Database className="w-3.5 h-3.5" />
          <span>FHIR R4 Mapping</span>
        </button>
      </div>

      {/* ── React Flow Canvas ── */}
      <div className="bg-white rounded-[14px] border border-[#E3EBF2] shadow-soft h-[600px] overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#CBD6E2" gap={16} size={1} />
          <Controls />
          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'patient') return '#0B1F33';
              if (n.type === 'trajectory') return '#0E9AA7';
              if (n.type === 'risk_signal') return '#D99A00';
              if (n.type === 'alert') return '#D6353A';
              return '#1B6FB3';
            }}
            className="rounded-lg border border-[#E3EBF2] bg-white"
          />
        </ReactFlow>

        {/* Floating Instruction overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-[#E3EBF2] shadow-soft text-xs font-mono max-w-xs pointer-events-none">
          <div className="text-[10px] text-[#5B6B7A] uppercase font-bold mb-1">Graph Legend</div>
          <div className="space-y-1 text-[#0B1F33]">
            <div>• Left: Patient Root node</div>
            <div>• Mid: Observation & Medication events</div>
            <div>• Mid-Right: Domain Trajectory aggregation</div>
            <div>• Right: Triggered Warning Alerts</div>
          </div>
          <div className="text-[10px] text-[#1B6FB3] mt-2 font-sans font-medium">
            Click any event node to inspect evidence provenance.
          </div>
        </div>
      </div>

      {/* ── FHIR Mapping Modal ── */}
      {fhirModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[14px] max-w-2xl w-full p-6 border border-[#E3EBF2] shadow-drawer">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EBF2]">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-[#1B6FB3]" />
                <h3 className="text-base font-semibold text-[#0B1F33]">FHIR R4 Resource Mapping Specification</h3>
              </div>
              <button onClick={() => setFhirModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#5B6B7A]">
                Every event in CLINOVA maps deterministically to standard HL7 FHIR R4 resource definitions.
              </p>

              {fhirData ? (
                <div className="overflow-x-auto max-h-80 border border-[#E3EBF2] rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F8FAFC] border-b border-[#E3EBF2] text-[#5B6B7A] uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">CLINOVA Event Type</th>
                        <th className="p-2.5">Target FHIR Resource</th>
                        <th className="p-2.5">HL7 Structure Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3EBF2]">
                      {fhirData.mappings.map((m, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F8FB]">
                          <td className="p-2.5 font-bold text-[#0B1F33]">{m.event_type}</td>
                          <td className="p-2.5 text-[#1B6FB3] font-semibold">{m.fhir_resource}</td>
                          <td className="p-2.5 text-[#7A8B99] text-[11px] truncate max-w-xs">{m.profile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-32 shimmer rounded-lg" />
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setFhirModalOpen(false)}
                className="px-4 py-2 bg-[#1B6FB3] text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
