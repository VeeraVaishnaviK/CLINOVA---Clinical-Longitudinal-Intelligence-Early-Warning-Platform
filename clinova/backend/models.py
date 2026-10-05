"""
CLINOVA - Pydantic models for clinical events and API responses.
Clinical decision support prototype. Not a diagnostic device.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum


class EventType(str, Enum):
    LAB_RESULT = "LAB_RESULT"
    VITAL = "VITAL"
    SYMPTOM = "SYMPTOM"
    DIAGNOSIS = "DIAGNOSIS"
    MEDICATION_START = "MEDICATION_START"
    MEDICATION_STOP = "MEDICATION_STOP"
    MEDICATION_CHANGE = "MEDICATION_CHANGE"
    HOSPITALIZATION = "HOSPITALIZATION"
    CLINICAL_NOTE = "CLINICAL_NOTE"


class TimePrecision(str, Enum):
    DAY = "DAY"
    MONTH = "MONTH"
    APPROX = "APPROX"


class Certainty(str, Enum):
    CONFIRMED = "CONFIRMED"
    APPROXIMATE = "APPROXIMATE"
    RETROSPECTIVE = "RETROSPECTIVE"
    INFERRED = "INFERRED"
    UNKNOWN = "UNKNOWN"


class ExtractionMethod(str, Enum):
    STRUCTURED = "STRUCTURED"
    RULE_NLP = "RULE_NLP"
    INFERRED = "INFERRED"


class ClinicalEvent(BaseModel):
    event_id: str
    patient_id: str
    event_type: EventType
    concept: str
    value: Optional[Any] = None
    unit: Optional[str] = None
    event_time: str  # ISO date string
    time_precision: TimePrecision = TimePrecision.DAY
    source_document: str
    source_location: str
    certainty: Certainty = Certainty.CONFIRMED
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    extraction_method: ExtractionMethod = ExtractionMethod.STRUCTURED
    negated: bool = False


class PatientSummary(BaseModel):
    patient_id: str
    label: str
    age: int
    sex: str
    primary_signal: str
    trajectory_status: str
    priority: str
    deterioration_score: float
    last_encounter: str
    event_count: int


class TurningPoint(BaseModel):
    date: str
    previous_state: str
    new_state: str
    supporting_event_ids: List[str]
    confidence: float


class TrajectoryResult(BaseModel):
    name: str
    trajectory_status: str
    trend_direction: str
    rate_of_change: float
    baseline: Optional[float] = None
    current_state: Optional[float] = None
    turning_point: Optional[TurningPoint] = None
    confidence: float
    supporting_evidence: List[str]
    uncertainty: str


class DeteriorationResult(BaseModel):
    score: float
    level: str
    contributing_signals: List[dict]
    why_now: dict
    news2: dict


class GapResult(BaseModel):
    start: str
    end: str
    days: int
    message: str
    confidence_penalty: float


class ContradictionResult(BaseModel):
    id: str
    description: str
    source_a: dict
    source_b: dict
    source_c: Optional[dict] = None
    evidence_ids: List[str]
    message: str


class MedicationSafetyResult(BaseModel):
    id: str
    medication: str
    related_finding: str
    evidence: List[str]
    severity: str
    confidence: float
    source: str


class AlertModel(BaseModel):
    id: str
    patient_id: str
    priority: str
    title: str
    why_now: str
    confidence: float
    evidence_ids: List[str]
    status: str  # OPEN, ACKNOWLEDGED, DISMISSED


class AuditEntry(BaseModel):
    timestamp: str
    user: str
    action: str
    resource: str
    details: Optional[str] = None
