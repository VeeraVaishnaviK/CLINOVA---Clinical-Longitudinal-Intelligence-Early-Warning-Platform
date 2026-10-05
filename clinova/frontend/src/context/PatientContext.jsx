import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPatients } from '../api';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const [selectedPatientId, setSelectedPatientId] = useState("P-1024");
  const [patients, setPatients] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [evidenceDrawerEventId, setEvidenceDrawerEventId] = useState(null);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState(false);

  const addToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openEvidence = (eventId) => {
    if (!eventId) return;
    setEvidenceDrawerEventId(eventId);
    setIsEvidenceDrawerOpen(true);
  };

  const closeEvidence = () => {
    setIsEvidenceDrawerOpen(false);
  };

  const refreshPatients = () => {
    getPatients().then(data => setPatients(data)).catch(console.error);
  };

  useEffect(() => {
    refreshPatients();
  }, []);

  return (
    <PatientContext.Provider value={{
      selectedPatientId,
      setSelectedPatientId,
      patients,
      refreshPatients,
      toasts,
      addToast,
      removeToast,
      openEvidence,
      closeEvidence,
      evidenceDrawerEventId,
      isEvidenceDrawerOpen,
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatient = () => useContext(PatientContext);
