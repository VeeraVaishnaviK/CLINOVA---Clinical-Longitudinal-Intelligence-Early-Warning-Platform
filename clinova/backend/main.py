"""
CLINOVA - FastAPI Backend
Clinical decision support prototype. Not a diagnostic device. Synthetic data.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

from models import ClinicalEvent, EventType
from seed import build_all_events, RAW_NOTES, PATIENTS_META
import engines

# ─── App Setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CLINOVA API",
    description="Clinical Longitudinal Intelligence & Early Warning Platform. "
                "Clinical decision support prototype. Not a diagnostic device.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory data store ─────────────────────────────────────────────────────

EVENTS: List[ClinicalEvent] = []
ALERTS_STORE: dict = {}  # alert_id -> alert dict (mutable status)
AUDIT_LOG: list = []


def _audit(action: str, resource: str, details: str = None):
    """Record an audit entry."""
    AUDIT_LOG.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "user": "Dr. Rao (DOCTOR)",
        "action": action,
        "resource": resource,
        "details": details,
    })


def _init_data():
    """Initialize all seed data and process raw notes."""
    global EVENTS, ALERTS_STORE

    # Build structured events
    EVENTS.clear()
    EVENTS.extend(build_all_events())

    # Process raw notes through NLP extractor
    for note in RAW_NOTES:
        extracted = engines.extract_from_note(
            note["text"], note["patient_id"], note["event_time"],
            note["source_document"], note["source_location"],
        )
        EVENTS.extend(extracted)

    # Sort all events by time
    EVENTS.sort(key=lambda e: e.event_time)

    # Initialize alerts store
    ALERTS_STORE.clear()
    for pid in PATIENTS_META:
        patient_alerts = engines.alerts(EVENTS, pid, PATIENTS_META)
        for a in patient_alerts:
            ALERTS_STORE[a["id"]] = a


# Initialize on import
_init_data()


# ─── Helper ────────────────────────────────────────────────────────────────────

def _check_patient(patient_id: str):
    """Raise 404 if patient not found."""
    if patient_id not in PATIENTS_META:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")


def _patient_summary(pid: str):
    """Build patient summary."""
    meta = PATIENTS_META[pid]
    det = engines.deterioration_score(EVENTS, pid)
    trajs = engines.trajectories(EVENTS, pid)
    patient_events = engines._get_events(EVENTS, pid)

    # Primary trajectory status
    worst_status = "STABLE"
    status_rank = {"STABLE": 0, "UNKNOWN": 0, "EARLY_CHANGE": 1, "RECOVERING": 1,
                   "PROGRESSIVE": 2, "ACCELERATING": 3, "HIGH_CONCERN": 4}
    for t in trajs:
        if status_rank.get(t["trajectory_status"], 0) > status_rank.get(worst_status, 0):
            worst_status = t["trajectory_status"]

    # Priority
    if det["level"] == "HIGH":
        priority = "HIGH"
    elif det["level"] == "EMERGING":
        priority = "EMERGING"
    else:
        priority = "ROUTINE"

    last_encounter = patient_events[-1].event_time if patient_events else "N/A"

    return {
        "patient_id": pid,
        "label": meta["label"],
        "age": meta["age"],
        "sex": meta["sex"],
        "primary_signal": meta["primary_signal"],
        "trajectory_status": worst_status,
        "priority": priority,
        "deterioration_score": det["score"],
        "last_encounter": last_encounter,
        "event_count": len(patient_events),
    }


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "CLINOVA", "version": "0.1.0",
            "disclaimer": "Clinical decision support prototype. Not a diagnostic device."}


@app.get("/api/v1/patients")
def list_patients():
    _audit("VIEW", "patient_list")
    summaries = [_patient_summary(pid) for pid in PATIENTS_META]
    # Sort by priority (HIGH first)
    priority_order = {"HIGH": 0, "EMERGING": 1, "ROUTINE": 2}
    summaries.sort(key=lambda s: (priority_order.get(s["priority"], 3), -s["deterioration_score"]))
    return summaries


@app.get("/api/v1/patients/{patient_id}")
def get_patient(patient_id: str):
    _check_patient(patient_id)
    _audit("VIEW", f"patient/{patient_id}")
    return _patient_summary(patient_id)


@app.get("/api/v1/patients/{patient_id}/timeline")
def get_timeline(patient_id: str):
    _check_patient(patient_id)
    _audit("VIEW", f"patient/{patient_id}/timeline")
    patient_events = engines._get_events(EVENTS, patient_id)
    return [e.model_dump() for e in patient_events]


@app.get("/api/v1/patients/{patient_id}/trajectories")
def get_trajectories(patient_id: str):
    _check_patient(patient_id)
    _audit("VIEW", f"patient/{patient_id}/trajectories")
    return engines.trajectories(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/turning-points")
def get_turning_points(patient_id: str):
    _check_patient(patient_id)
    results = {}
    for concept in ["Creatinine", "eGFR", "WBC", "Heart Rate", "Hemoglobin",
                    "Potassium", "CRP", "Lactate"]:
        series = engines._get_numeric_series(EVENTS, patient_id, concept)
        tp = engines.turning_point(series)
        if tp:
            results[concept] = tp
    return results


@app.get("/api/v1/patients/{patient_id}/deterioration")
def get_deterioration(patient_id: str):
    _check_patient(patient_id)
    _audit("VIEW", f"patient/{patient_id}/deterioration")
    det = engines.deterioration_score(EVENTS, patient_id)
    wn = engines.why_now(EVENTS, patient_id)
    n2 = engines.news2(EVENTS, patient_id)
    return {
        "score": det["score"],
        "level": det["level"],
        "contributing_signals": det["contributing_signals"],
        "why_now": wn,
        "news2": n2,
    }


@app.get("/api/v1/patients/{patient_id}/gaps")
def get_gaps(patient_id: str):
    _check_patient(patient_id)
    return engines.gaps(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/contradictions")
def get_contradictions(patient_id: str):
    _check_patient(patient_id)
    return engines.contradictions(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/medication-safety")
def get_medication_safety(patient_id: str):
    _check_patient(patient_id)
    return engines.medication_safety(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/data-quality")
def get_data_quality(patient_id: str):
    _check_patient(patient_id)
    return engines.data_quality(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/unknowns")
def get_unknowns(patient_id: str):
    _check_patient(patient_id)
    return engines.unknowns(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/what-changed")
def get_what_changed(patient_id: str):
    _check_patient(patient_id)
    return engines.what_changed(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/replay")
def get_replay(patient_id: str):
    _check_patient(patient_id)
    return engines.replay(EVENTS, patient_id)


@app.get("/api/v1/patients/{patient_id}/storyline")
def get_storyline(patient_id: str):
    _check_patient(patient_id)
    _audit("VIEW", f"patient/{patient_id}/storyline")
    return engines.storyline(EVENTS, patient_id, PATIENTS_META)


@app.get("/api/v1/patients/{patient_id}/evidence-graph")
def get_evidence_graph(patient_id: str):
    _check_patient(patient_id)
    return engines.evidence_graph(EVENTS, patient_id, PATIENTS_META)


@app.get("/api/v1/evidence/{event_id}")
def get_evidence(event_id: str):
    _audit("EVIDENCE_OPEN", f"evidence/{event_id}")
    for e in EVENTS:
        if e.event_id == event_id:
            return e.model_dump()
    raise HTTPException(status_code=404, detail=f"Event {event_id} not found")


@app.get("/api/v1/alerts")
def get_all_alerts():
    # Return all alerts sorted by priority
    priority_order = {"HIGH": 0, "EMERGING": 1, "INFO": 2}
    alerts_list = sorted(ALERTS_STORE.values(),
                        key=lambda a: priority_order.get(a["priority"], 3))
    return alerts_list


@app.get("/api/v1/dashboard")
def get_dashboard():
    _audit("VIEW", "dashboard")
    summaries = [_patient_summary(pid) for pid in PATIENTS_META]

    high_count = sum(1 for s in summaries if s["priority"] == "HIGH")
    emerging_count = sum(1 for s in summaries if s["priority"] == "EMERGING")

    # Medication conflicts
    med_conflicts = 0
    for pid in PATIENTS_META:
        med_conflicts += len(engines.medication_safety(EVENTS, pid))

    # Data quality issues
    dq_issues = 0
    for pid in PATIENTS_META:
        dq = engines.data_quality(EVENTS, pid)
        if dq["overall"] < 70:
            dq_issues += 1

    # Recent events (last 7 days across all patients)
    all_events = sorted(EVENTS, key=lambda e: e.event_time, reverse=True)
    recent = [e.model_dump() for e in all_events[:20]]

    # Data quality per patient
    quality_bars = []
    for pid in PATIENTS_META:
        dq = engines.data_quality(EVENTS, pid)
        quality_bars.append({
            "patient_id": pid,
            "label": PATIENTS_META[pid]["label"],
            "overall": dq["overall"],
            "lab": dq["lab"],
            "vital": dq["vital"],
            "medication": dq["medication"],
            "notes": dq["notes"],
        })

    return {
        "monitored": len(PATIENTS_META),
        "high_concern": high_count,
        "emerging_signals": emerging_count,
        "medication_conflicts": med_conflicts,
        "data_quality_issues": dq_issues,
        "watchlist": sorted(summaries,
                           key=lambda s: ({"HIGH": 0, "EMERGING": 1, "ROUTINE": 2}.get(s["priority"], 3),
                                         -s["deterioration_score"])),
        "recent_events": recent,
        "quality_bars": quality_bars,
    }


@app.get("/api/v1/fhir-mapping")
def get_fhir_mapping():
    return {
        "mappings": [
            {"event_type": "LAB_RESULT", "fhir_resource": "Observation",
             "profile": "http://hl7.org/fhir/StructureDefinition/Observation"},
            {"event_type": "VITAL", "fhir_resource": "Observation",
             "profile": "http://hl7.org/fhir/StructureDefinition/vitalsigns"},
            {"event_type": "DIAGNOSIS", "fhir_resource": "Condition",
             "profile": "http://hl7.org/fhir/StructureDefinition/Condition"},
            {"event_type": "MEDICATION_START", "fhir_resource": "MedicationStatement",
             "profile": "http://hl7.org/fhir/StructureDefinition/MedicationStatement"},
            {"event_type": "MEDICATION_STOP", "fhir_resource": "MedicationStatement",
             "profile": "http://hl7.org/fhir/StructureDefinition/MedicationStatement"},
            {"event_type": "MEDICATION_CHANGE", "fhir_resource": "MedicationStatement",
             "profile": "http://hl7.org/fhir/StructureDefinition/MedicationStatement"},
            {"event_type": "HOSPITALIZATION", "fhir_resource": "Encounter",
             "profile": "http://hl7.org/fhir/StructureDefinition/Encounter"},
            {"event_type": "CLINICAL_NOTE", "fhir_resource": "DocumentReference",
             "profile": "http://hl7.org/fhir/StructureDefinition/DocumentReference"},
            {"event_type": "SYMPTOM", "fhir_resource": "Observation",
             "profile": "http://hl7.org/fhir/StructureDefinition/Observation"},
        ],
        "disclaimer": "Mapping is for demonstration only. Not a certified FHIR implementation.",
    }


@app.get("/api/v1/audit")
def get_audit():
    return AUDIT_LOG


@app.post("/api/v1/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    if alert_id not in ALERTS_STORE:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    ALERTS_STORE[alert_id]["status"] = "ACKNOWLEDGED"
    _audit("ACKNOWLEDGE", f"alert/{alert_id}")
    return ALERTS_STORE[alert_id]


@app.post("/api/v1/alerts/{alert_id}/dismiss")
def dismiss_alert(alert_id: str):
    if alert_id not in ALERTS_STORE:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    ALERTS_STORE[alert_id]["status"] = "DISMISSED"
    _audit("DISMISS", f"alert/{alert_id}")
    return ALERTS_STORE[alert_id]


class IngestCSV(BaseModel):
    csv_content: str


class IngestJSON(BaseModel):
    events: List[dict]


@app.post("/api/v1/ingest/csv")
def ingest_csv(payload: IngestCSV):
    """Parse CSV content and append events."""
    _audit("INGEST", "csv", f"Content length: {len(payload.csv_content)}")
    lines = payload.csv_content.strip().split("\n")
    if len(lines) < 2:
        return {"count": 0, "message": "No data rows found"}

    headers = [h.strip() for h in lines[0].split(",")]
    count = 0
    for i, line in enumerate(lines[1:], 1):
        vals = [v.strip() for v in line.split(",")]
        if len(vals) >= 6:
            try:
                event = ClinicalEvent(
                    event_id=f"INGEST-CSV-{datetime.utcnow().isoformat()}-{i}",
                    patient_id=vals[0],
                    event_type=EventType(vals[1]),
                    concept=vals[2],
                    value=vals[3] if vals[3] else None,
                    unit=vals[4] if vals[4] else None,
                    event_time=vals[5],
                    source_document="csv_ingest",
                    source_location=f"row {i}",
                )
                EVENTS.append(event)
                count += 1
            except Exception:
                pass

    return {"count": count, "message": f"Ingested {count} events from CSV"}


@app.post("/api/v1/ingest/json")
def ingest_json(payload: IngestJSON):
    """Parse JSON events and append."""
    _audit("INGEST", "json", f"Event count: {len(payload.events)}")
    count = 0
    for i, evt_data in enumerate(payload.events):
        try:
            event = ClinicalEvent(
                event_id=evt_data.get("event_id", f"INGEST-JSON-{datetime.utcnow().isoformat()}-{i}"),
                patient_id=evt_data["patient_id"],
                event_type=EventType(evt_data["event_type"]),
                concept=evt_data["concept"],
                value=evt_data.get("value"),
                unit=evt_data.get("unit"),
                event_time=evt_data["event_time"],
                source_document=evt_data.get("source_document", "json_ingest"),
                source_location=evt_data.get("source_location", f"item {i}"),
            )
            EVENTS.append(event)
            count += 1
        except Exception:
            pass

    return {"count": count, "message": f"Ingested {count} events from JSON"}
