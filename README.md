# CLINOVA — Clinical Longitudinal Intelligence & Early Warning Platform

> *"From fragmented clinical records to a clinically coherent story."*

CLINOVA is an explainable **Clinical Decision Support System (CDSS)** prototype. It synthesizes fragmented longitudinal records (vitals, laboratory panels, medications, progress notes, encounters) into coherent trajectories, early warning indicators, and fully traceable provenance trails.

---

## ⚠️ Regulatory & Clinical Decision Support Notice

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ CLINICAL DECISION SUPPORT PROTOTYPE. NOT A DIAGNOSTIC DEVICE.                │
│ SYNTHETIC DEMONSTRATION DATA ONLY. NOT CLINICALLY VALIDATED.                  │
│                                                                               │
│ • Deterministic, rule-based algorithms for demonstrative surveillance.        │
│ • All clinical statements carry deterministic evidence IDs and citations.      │
│ • Uses "deterioration-associated signals" or "may indicate", NEVER autonomous │
│   medical diagnosis (e.g. never "patient has sepsis").                        │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
                                    ┌────────────────────────┐
                                    │    Clinical Sources    │
                                    │ (Labs, Vitals, Notes,  │
                                    │   Medication Records)  │
                                    └───────────┬────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CLINOVA Deterministic Core Engines (Python 3.11+ / FastAPI)                                     │
│                                                                                                 │
│  1. NegEx NLP Extractor      2. Polyfit Trend Engine      3. CUSUM Turning Point Engine         │
│  4. Trajectory Classifier    5. Deterioration Scorer      6. WHY NOW Explainability Matrix      │
│  7. NEWS2 Lead Time Engine   8. Data Gap Detector         9. Clinical Conflict Engine           │
│ 10. Medication Safety Core  11. AI Unknowns / Blindspots 12. Encounter Change Tracker          │
│ 13. Longitudinal Storyline  14. Evidence Replay Stages   15. Provenance DAG & FHIR R4 Mapper    │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │ REST API (/api/v1)
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CLINOVA Clinical UI (Vite + React 18 + Tailwind CSS 3.4 + Recharts + React Flow)                │
│                                                                                                 │
│  • Overview Dashboard & 5-Step Ingestion Stepper         • Patient Workspace Hero & ECG Strip   │
│  • Multi-Track SVG Clinical Timeline with Data Gaps       • Domain Trajectory Small Multiples    │
│  • Longitudinal Evidence Replay & Interactive Scrubber    • Directed Evidence Graph (React Flow) │
│  • Alert Triage with Optimistic Mutation                 • Medication Contraindication Table    │
│  • 3-Column Clinical Conflict Governance                 • Structured Narrative Storyline       │
│  • Immutable Access & Clinical Governance Audit Trail     • Slide-over Traceable Evidence Drawer │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Synthetic Demonstration Cohort

Every record features strict source documentation (`source_document`, `source_location`) and confidence scores:

1. **P-1024 (Patient A, 62M)**: Progressive renal deterioration. Baseline Creatinine stable at 1.1 mg/dL until turning point around May 2026 (`2026-05-10`), rising through 1.3 → 1.5 → 1.8 → 2.1 mg/dL. Ibuprofen initiated in June exacerbating renal decline. Oliguria note on Sep 25. Final acute decompensation in October (HR 104, Temp 101.8°F, WBC 13.4). **CLINOVA flags longitudinal risk earlier than standard NEWS2.**
2. **P-2031 (Patient B, 58F)**: Acute infection-associated deterioration over 4 days. Progressive tachycardia (76 → 118 bpm), tachypnea (16 → 26 bpm), hyperthermia (103.1°F), leukocytosis (WBC 17.8), and lactate elevation (3.8 mmol/L).
3. **P-3007 (Patient C, 45M)**: Stable control baseline across 6 months. Normotensive, normal renal and inflammatory biomarkers. Trajectory status: `STABLE`, Risk score: `0.0`.
4. **P-4112 (Patient D, 67M)**: Clinical record contradiction and pharmacotherapy alert. Progress note explicitly states *"No history of diabetes"*, yet Metformin is active and HbA1c is 8.2%. Concurrent Lisinopril + Spironolactone with rising potassium (4.2 → 5.9 mEq/L).
5. **P-5090 (Patient E, 71F)**: 73-day clinical monitoring gap between March 15 and May 27, 2026, followed by progressive hemoglobin decline (13.2 → 9.2 g/dL).

---

## How Each Engine Works

1. **`trend(series)`**: Fits a 1st-degree polynomial using `numpy.polyfit`. Computes rate of change against baseline (mean of first 3 points).
2. **`turning_point(series)`**: Implements CUSUM (cumulative sum of deviations from baseline threshold) and two-segment piecewise regression to detect the exact encounter date of state transition.
3. **`trajectories(patient)`**: Classifies organ systems (Renal, Inflammatory, Hemodynamic, Respiratory, Medication Burden) into `STABLE`, `EARLY_CHANGE`, `PROGRESSIVE`, `ACCELERATING`, or `HIGH_CONCERN`.
4. **`deterioration_score(patient)`**: Computes a weighted 0–100 composite index from multi-organ vitals, labs, reported symptoms, and active medication concerns in a recent window.
5. **`why_now(patient)`**: Identifies delta changes in the latest encounter window. Flags HIGH urgency when ≥3 independent physiologic signals deviate concurrently.
6. **`news2(patient)`**: Computes standard Royal College of Physicians National Early Warning Score (NEWS2) alongside CLINOVA longitudinal flags, demonstrating early lead time.
7. **`gaps(patient)`**: Automatically detects unmonitored intervals >30 days. Emits the mandatory clinical statement: *"Clinical state during this interval cannot be reliably established."*
8. **`contradictions(patient)`**: Cross-examines unstructured text, prescriptions, and lab tests to detect conflicts. Displays competing sources without picking a winner.
9. **`medication_safety(patient)`**: Rule-based screening for nephrotoxic combinations, hyperkalemia risks, and duplicated therapeutic classes.
10. **`data_quality(patient)`**: Assesses record continuity, data density, and applies confidence penalties for sparse or gapped timelines.
11. **`unknowns(patient)`**: Explicitly articulates what the CDSS cannot observe (adherence, external hospitalization, symptom onset timing).
12. **`what_changed(patient)`**: Quantifies encounter-to-encounter deltas across symptoms, vitals, labs, and active medications.
13. **`replay(patient)`**: Generates timeline checkpoints (`STABLE` → `EARLY_SIGNAL` → `PROGRESSIVE` → `TURNING_POINT` → `ACCELERATION` → `CURRENT`) for step-by-step playback.
14. **`storyline(patient)`**: Produces structured narrative sections with citations linking every sentence to underlying event IDs.
15. **`evidence_graph(patient)`**: Constructs a directed acyclic graph (React Flow compatible) connecting Patient Root → Events → Domain Trajectories → Alerts.
16. **`alerts(patient)`**: Triage warning generator with mutable in-memory state (`OPEN`, `ACKNOWLEDGED`, `DISMISSED`).

---

## Quickstart & Run Commands

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm 9+

### 1. Run Backend Server
```bash
cd clinova/backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
- API Health Check: `http://localhost:8000/api/v1/health`
- Interactive API Docs: `http://localhost:8000/docs`

### 2. Run Verification Test Suite
```bash
cd clinova/backend
python verify.py
```
*Validates that all endpoints return 200, turning points, gaps, contradictions, alerts, and lead times match clinical specifications.*

### 3. Run Frontend Application
```bash
cd clinova/frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000` (automatically proxies `/api` to port 8000)

---

## Production Roadmap

- [ ] PostgreSQL + TimescaleDB for continuous telemetry time-series streaming
- [ ] Native HL7 FHIR R4 Bundle Ingestion & Subscription Service
- [ ] Clinical Document PDF & OCR parsing pipeline
- [ ] MIMIC-IV & eICU benchmark validation
- [ ] Prospective clinical comparison studies (CLINOVA vs standard NEWS2 / qSOFA)
