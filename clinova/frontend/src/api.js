import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = () => api.get('/health').then(r => r.data);
export const getDashboard = () => api.get('/dashboard').then(r => r.data);
export const getPatients = () => api.get('/patients').then(r => r.data);
export const getPatient = (id) => api.get(`/patients/${id}`).then(r => r.data);
export const getTimeline = (id) => api.get(`/patients/${id}/timeline`).then(r => r.data);
export const getTrajectories = (id) => api.get(`/patients/${id}/trajectories`).then(r => r.data);
export const getTurningPoints = (id) => api.get(`/patients/${id}/turning-points`).then(r => r.data);
export const getDeterioration = (id) => api.get(`/patients/${id}/deterioration`).then(r => r.data);
export const getGaps = (id) => api.get(`/patients/${id}/gaps`).then(r => r.data);
export const getContradictions = (id) => api.get(`/patients/${id}/contradictions`).then(r => r.data);
export const getMedicationSafety = (id) => api.get(`/patients/${id}/medication-safety`).then(r => r.data);
export const getDataQuality = (id) => api.get(`/patients/${id}/data-quality`).then(r => r.data);
export const getUnknowns = (id) => api.get(`/patients/${id}/unknowns`).then(r => r.data);
export const getWhatChanged = (id) => api.get(`/patients/${id}/what-changed`).then(r => r.data);
export const getReplay = (id) => api.get(`/patients/${id}/replay`).then(r => r.data);
export const getStoryline = (id) => api.get(`/patients/${id}/storyline`).then(r => r.data);
export const getEvidenceGraph = (id) => api.get(`/patients/${id}/evidence-graph`).then(r => r.data);
export const getEvidence = (eventId) => api.get(`/evidence/${eventId}`).then(r => r.data);
export const getAlerts = () => api.get('/alerts').then(r => r.data);
export const getFhirMapping = () => api.get('/fhir-mapping').then(r => r.data);
export const getAudit = () => api.get('/audit').then(r => r.data);

export const acknowledgeAlert = (id) => api.post(`/alerts/${id}/acknowledge`).then(r => r.data);
export const dismissAlert = (id) => api.post(`/alerts/${id}/dismiss`).then(r => r.data);
export const ingestCSV = (csv_content) => api.post('/ingest/csv', { csv_content }).then(r => r.data);
export const ingestJSON = (events) => api.post('/ingest/json', { events }).then(r => r.data);

export default api;
