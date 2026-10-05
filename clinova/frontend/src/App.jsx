import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';
import { Layout } from './components/Layout';

import { Overview } from './pages/Overview';
import { PatientWorkspace } from './pages/PatientWorkspace';
import { ClinicalTimeline } from './pages/ClinicalTimeline';
import { Trajectory } from './pages/Trajectory';
import { EvidenceReplay } from './pages/EvidenceReplay';
import { EvidenceGraph } from './pages/EvidenceGraph';
import { Alerts } from './pages/Alerts';
import { MedicationSafety } from './pages/MedicationSafety';
import { Contradictions } from './pages/Contradictions';
import { Storyline } from './pages/Storyline';
import { AuditLog } from './pages/AuditLog';

export default function App() {
  return (
    <BrowserRouter>
      <PatientProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/patient" element={<PatientWorkspace />} />
            <Route path="/timeline" element={<ClinicalTimeline />} />
            <Route path="/trajectory" element={<Trajectory />} />
            <Route path="/replay" element={<EvidenceReplay />} />
            <Route path="/graph" element={<EvidenceGraph />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/med-safety" element={<MedicationSafety />} />
            <Route path="/contradictions" element={<Contradictions />} />
            <Route path="/storyline" element={<Storyline />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </PatientProvider>
    </BrowserRouter>
  );
}
