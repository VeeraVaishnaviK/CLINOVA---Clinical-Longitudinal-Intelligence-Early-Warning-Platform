"""
CLINOVA - Synthetic seed data for 5 patients.
Clinical decision support prototype. Not a diagnostic device. Synthetic data.
Every event has source_document and source_location for full traceability.
Raw clinical notes are processed by engines.extract_from_note().
"""

from models import ClinicalEvent, EventType, TimePrecision, Certainty, ExtractionMethod


def _e(eid, pid, etype, concept, value, unit, etime, src_doc, src_loc,
       certainty=Certainty.CONFIRMED, confidence=1.0,
       precision=TimePrecision.DAY, method=ExtractionMethod.STRUCTURED, negated=False):
    """Shorthand event builder."""
    return ClinicalEvent(
        event_id=eid, patient_id=pid, event_type=etype, concept=concept,
        value=value, unit=unit, event_time=etime, time_precision=precision,
        source_document=src_doc, source_location=src_loc,
        certainty=certainty, confidence=confidence,
        extraction_method=method, negated=negated,
    )


# ── Raw notes to be processed by engines.extract_from_note ──
RAW_NOTES = [
    {
        "patient_id": "P-1024",
        "text": "Patient reports reduced urine output over the past few days.",
        "event_time": "2026-09-25",
        "source_document": "progress_note_2026-09-25.txt",
        "source_location": "line 14",
    },
    {
        "patient_id": "P-1024",
        "text": "Confusion since yesterday, no fever noted.",
        "event_time": "2026-10-03",
        "source_document": "progress_note_2026-10-03.txt",
        "source_location": "line 8",
    },
    {
        "patient_id": "P-1024",
        "text": "Patient was hospitalized for AKI six months ago at external facility.",
        "event_time": "2026-10-01",
        "source_document": "clinical_summary_2026-10-01.txt",
        "source_location": "line 3",
    },
    {
        "patient_id": "P-1024",
        "text": "Reports fatigue for three weeks, no chest pain.",
        "event_time": "2026-09-28",
        "source_document": "progress_note_2026-09-28.txt",
        "source_location": "line 22",
    },
]


def build_p1024():
    """P-1024 (A, 62M): Progressive renal deterioration."""
    pid = "P-1024"
    events = []
    idx = 0

    def eid():
        nonlocal idx
        idx += 1
        return f"E-1024-{idx:04d}"

    # Baseline stable period (Feb-Apr 2026)
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.1, "mg/dL",
                     "2026-02-15", "lab_report_0215.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 84.0, "mL/min",
                     "2026-02-15", "lab_report_0215.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 70.0, "bpm",
                     "2026-02-15", "vitals_chart_0215.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 126.0, "mmHg",
                     "2026-02-15", "vitals_chart_0215.csv", "row 2"))

    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.1, "mg/dL",
                     "2026-03-15", "lab_report_0315.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 83.0, "mL/min",
                     "2026-03-15", "lab_report_0315.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 71.0, "bpm",
                     "2026-03-15", "vitals_chart_0315.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 127.0, "mmHg",
                     "2026-03-15", "vitals_chart_0315.csv", "row 2"))

    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.1, "mg/dL",
                     "2026-04-15", "lab_report_0415.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 82.0, "mL/min",
                     "2026-04-15", "lab_report_0415.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 72.0, "bpm",
                     "2026-04-15", "vitals_chart_0415.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 128.0, "mmHg",
                     "2026-04-15", "vitals_chart_0415.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 78.0, "mmHg",
                     "2026-04-15", "vitals_chart_0415.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.4, "°F",
                     "2026-04-15", "vitals_chart_0415.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 16.0, "breaths/min",
                     "2026-04-15", "vitals_chart_0415.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 97.0, "%",
                     "2026-04-15", "vitals_chart_0415.csv", "row 6"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 7.5, "x10^9/L",
                     "2026-04-15", "lab_report_0415.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Lisinopril", "10mg daily", None,
                     "2026-03-01", "medication_record.csv", "row 1"))

    # May - still mostly stable, slight rise
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.3, "mg/dL",
                     "2026-05-10", "lab_report_0510.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 76.0, "mL/min",
                     "2026-05-10", "lab_report_0510.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 74.0, "bpm",
                     "2026-05-10", "vitals_chart_0510.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 130.0, "mmHg",
                     "2026-05-10", "vitals_chart_0510.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.6, "°F",
                     "2026-05-10", "vitals_chart_0510.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 7.8, "x10^9/L",
                     "2026-05-10", "lab_report_0510.csv", "row 5"))

    # June - Ibuprofen started (turning point area)
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Ibuprofen", "400mg TID", None,
                     "2026-06-05", "medication_record.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.CLINICAL_NOTE, "Knee pain management",
                     "Started NSAID for chronic knee pain", None,
                     "2026-06-05", "progress_note_2026-06-05.txt", "line 7"))

    # July - Creatinine rises
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.5, "mg/dL",
                     "2026-07-20", "lab_report_0720.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 68.0, "mL/min",
                     "2026-07-20", "lab_report_0720.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 78.0, "bpm",
                     "2026-07-20", "vitals_chart_0720.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 125.0, "mmHg",
                     "2026-07-20", "vitals_chart_0720.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.5, "°F",
                     "2026-07-20", "vitals_chart_0720.csv", "row 4"))

    # Sep - Acceleration
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.8, "mg/dL",
                     "2026-09-10", "lab_report_0910.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 57.0, "mL/min",
                     "2026-09-10", "lab_report_0910.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 82.0, "bpm",
                     "2026-09-10", "vitals_chart_0910.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 118.0, "mmHg",
                     "2026-09-10", "vitals_chart_0910.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 8.2, "x10^9/L",
                     "2026-09-10", "lab_report_0910.csv", "row 5"))

    # Final week - Rapid deterioration (late Sep / early Oct 2026)
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 96.0, "bpm",
                     "2026-10-01", "vitals_chart_1001.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 101.3, "°F",
                     "2026-10-01", "vitals_chart_1001.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 102.0, "mmHg",
                     "2026-10-01", "vitals_chart_1001.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 64.0, "mmHg",
                     "2026-10-01", "vitals_chart_1001.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 22.0, "breaths/min",
                     "2026-10-01", "vitals_chart_1001.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 94.0, "%",
                     "2026-10-01", "vitals_chart_1001.csv", "row 6"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 13.4, "x10^9/L",
                     "2026-10-02", "lab_report_1002.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 2.1, "mg/dL",
                     "2026-10-02", "lab_report_1002.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 45.0, "mL/min",
                     "2026-10-02", "lab_report_1002.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "CRP", 45.0, "mg/L",
                     "2026-10-02", "lab_report_1002.csv", "row 8"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Lactate", 2.8, "mmol/L",
                     "2026-10-02", "lab_report_1002.csv", "row 9"))

    # Vitals on Oct 3
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 104.0, "bpm",
                     "2026-10-03", "vitals_chart_1003.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 98.0, "mmHg",
                     "2026-10-03", "vitals_chart_1003.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 101.8, "°F",
                     "2026-10-03", "vitals_chart_1003.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 24.0, "breaths/min",
                     "2026-10-03", "vitals_chart_1003.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 93.0, "%",
                     "2026-10-03", "vitals_chart_1003.csv", "row 6"))

    return events


def build_p2031():
    """P-2031 (B, 58F): Infection-associated signals over 4 days."""
    pid = "P-2031"
    events = []
    idx = 0

    def eid():
        nonlocal idx
        idx += 1
        return f"E-2031-{idx:04d}"

    # Baseline (Sep 2026)
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.6, "°F",
                     "2026-09-28", "vitals_chart_0928.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 76.0, "bpm",
                     "2026-09-28", "vitals_chart_0928.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 16.0, "breaths/min",
                     "2026-09-28", "vitals_chart_0928.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 132.0, "mmHg",
                     "2026-09-28", "vitals_chart_0928.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 82.0, "mmHg",
                     "2026-09-28", "vitals_chart_0928.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 98.0, "%",
                     "2026-09-28", "vitals_chart_0928.csv", "row 6"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 7.2, "x10^9/L",
                     "2026-09-28", "lab_report_0928.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "CRP", 3.0, "mg/L",
                     "2026-09-28", "lab_report_0928.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Lactate", 1.0, "mmol/L",
                     "2026-09-28", "lab_report_0928.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 0.9, "mg/dL",
                     "2026-09-28", "lab_report_0928.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Amoxicillin", "500mg TID", None,
                     "2026-09-15", "medication_record.csv", "row 1"))

    # Day 1 of infection signals (Oct 1)
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 100.2, "°F",
                     "2026-10-01", "vitals_chart_1001.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 88.0, "bpm",
                     "2026-10-01", "vitals_chart_1001.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 18.0, "breaths/min",
                     "2026-10-01", "vitals_chart_1001.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 126.0, "mmHg",
                     "2026-10-01", "vitals_chart_1001.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 9.8, "x10^9/L",
                     "2026-10-01", "lab_report_1001.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "CRP", 18.0, "mg/L",
                     "2026-10-01", "lab_report_1001.csv", "row 2"))

    # Day 2 (Oct 2)
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 101.4, "°F",
                     "2026-10-02", "vitals_chart_1002.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 98.0, "bpm",
                     "2026-10-02", "vitals_chart_1002.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 21.0, "breaths/min",
                     "2026-10-02", "vitals_chart_1002.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 118.0, "mmHg",
                     "2026-10-02", "vitals_chart_1002.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 12.5, "x10^9/L",
                     "2026-10-02", "lab_report_1002.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "CRP", 48.0, "mg/L",
                     "2026-10-02", "lab_report_1002.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Lactate", 1.8, "mmol/L",
                     "2026-10-02", "lab_report_1002.csv", "row 3"))

    # Day 3 (Oct 3)
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 102.5, "°F",
                     "2026-10-03", "vitals_chart_1003.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 110.0, "bpm",
                     "2026-10-03", "vitals_chart_1003.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 24.0, "breaths/min",
                     "2026-10-03", "vitals_chart_1003.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 105.0, "mmHg",
                     "2026-10-03", "vitals_chart_1003.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 95.0, "%",
                     "2026-10-03", "vitals_chart_1003.csv", "row 6"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 15.2, "x10^9/L",
                     "2026-10-03", "lab_report_1003.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "CRP", 95.0, "mg/L",
                     "2026-10-03", "lab_report_1003.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Lactate", 2.8, "mmol/L",
                     "2026-10-03", "lab_report_1003.csv", "row 3"))

    # Day 4 (Oct 4)
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 103.1, "°F",
                     "2026-10-04", "vitals_chart_1004.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 118.0, "bpm",
                     "2026-10-04", "vitals_chart_1004.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 26.0, "breaths/min",
                     "2026-10-04", "vitals_chart_1004.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 95.0, "mmHg",
                     "2026-10-04", "vitals_chart_1004.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 58.0, "mmHg",
                     "2026-10-04", "vitals_chart_1004.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 93.0, "%",
                     "2026-10-04", "vitals_chart_1004.csv", "row 6"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 17.8, "x10^9/L",
                     "2026-10-04", "lab_report_1004.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "CRP", 142.0, "mg/L",
                     "2026-10-04", "lab_report_1004.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Lactate", 3.8, "mmol/L",
                     "2026-10-04", "lab_report_1004.csv", "row 3"))

    events.append(_e(eid(), pid, EventType.SYMPTOM, "Chills", "Present", None,
                     "2026-10-02", "progress_note_2026-10-02.txt", "line 5",
                     method=ExtractionMethod.RULE_NLP))
    events.append(_e(eid(), pid, EventType.SYMPTOM, "Rigors", "Present", None,
                     "2026-10-03", "progress_note_2026-10-03.txt", "line 3",
                     method=ExtractionMethod.RULE_NLP))

    return events


def build_p3007():
    """P-3007 (C, 45M): Stable patient with flat values."""
    pid = "P-3007"
    events = []
    idx = 0

    def eid():
        nonlocal idx
        idx += 1
        return f"E-3007-{idx:04d}"

    for month_offset, month_str in enumerate(["2026-05-15", "2026-06-15", "2026-07-15",
                                               "2026-08-15", "2026-09-15", "2026-10-01"]):
        m_tag = month_str[5:7] + month_str[8:10]
        events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 0.9, "mg/dL",
                         month_str, f"lab_report_{m_tag}.csv", "row 1"))
        events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 95.0, "mL/min",
                         month_str, f"lab_report_{m_tag}.csv", "row 2"))
        events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 70.0, "bpm",
                         month_str, f"vitals_chart_{m_tag}.csv", "row 1"))
        events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 120.0, "mmHg",
                         month_str, f"vitals_chart_{m_tag}.csv", "row 2"))
        events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 75.0, "mmHg",
                         month_str, f"vitals_chart_{m_tag}.csv", "row 3"))
        events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.4, "°F",
                         month_str, f"vitals_chart_{m_tag}.csv", "row 4"))
        events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 15.0, "breaths/min",
                         month_str, f"vitals_chart_{m_tag}.csv", "row 5"))
        events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 98.0, "%",
                         month_str, f"vitals_chart_{m_tag}.csv", "row 6"))
        events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 6.5, "x10^9/L",
                         month_str, f"lab_report_{m_tag}.csv", "row 3"))

    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Atorvastatin", "20mg daily", None,
                     "2026-04-01", "medication_record.csv", "row 1"))

    return events


def build_p4112():
    """P-4112 (D, 67M): Contradiction + medication safety concerns."""
    pid = "P-4112"
    events = []
    idx = 0

    def eid():
        nonlocal idx
        idx += 1
        return f"E-4112-{idx:04d}"

    # Contradiction: note says "No history of diabetes" but Metformin active + HbA1c 8.2%
    events.append(_e(eid(), pid, EventType.CLINICAL_NOTE, "Diabetes history",
                     "No history of diabetes", None,
                     "2026-06-01", "admission_note_2026-06-01.txt", "line 12",
                     method=ExtractionMethod.RULE_NLP))
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Metformin", "500mg BID", None,
                     "2026-05-01", "medication_record.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "HbA1c", 8.2, "%",
                     "2026-06-15", "lab_report_0615.csv", "row 1"))

    # ACE inhibitor + Spironolactone + rising potassium
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Lisinopril", "10mg daily", None,
                     "2026-04-01", "medication_record.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Spironolactone", "25mg daily", None,
                     "2026-05-15", "medication_record.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Potassium", 4.2, "mEq/L",
                     "2026-05-01", "lab_report_0501.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Potassium", 4.8, "mEq/L",
                     "2026-06-15", "lab_report_0615.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Potassium", 5.3, "mEq/L",
                     "2026-07-20", "lab_report_0720.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Potassium", 5.6, "mEq/L",
                     "2026-08-25", "lab_report_0825.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Potassium", 5.9, "mEq/L",
                     "2026-09-30", "lab_report_0930.csv", "row 1"))

    # Other vitals and labs for completeness
    for dt, cr in [("2026-05-01", 1.0), ("2026-06-15", 1.0), ("2026-07-20", 1.1),
                   ("2026-08-25", 1.1), ("2026-09-30", 1.2)]:
        m_tag = dt[5:7] + dt[8:10]
        events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", cr, "mg/dL",
                         dt, f"lab_report_{m_tag}.csv", "row 3"))
        events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 72.0, "bpm",
                         dt, f"vitals_chart_{m_tag}.csv", "row 1"))
        events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 135.0, "mmHg",
                         dt, f"vitals_chart_{m_tag}.csv", "row 2"))
        events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 85.0, "mmHg",
                         dt, f"vitals_chart_{m_tag}.csv", "row 3"))
        events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.4, "°F",
                         dt, f"vitals_chart_{m_tag}.csv", "row 4"))
        events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 16.0, "breaths/min",
                         dt, f"vitals_chart_{m_tag}.csv", "row 5"))
        events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 97.0, "%",
                         dt, f"vitals_chart_{m_tag}.csv", "row 6"))
        events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 7.0, "x10^9/L",
                         dt, f"lab_report_{m_tag}.csv", "row 4"))

    return events


def build_p5090():
    """P-5090 (E, 71F): 73-day data gap + declining hemoglobin."""
    pid = "P-5090"
    events = []
    idx = 0

    def eid():
        nonlocal idx
        idx += 1
        return f"E-5090-{idx:04d}"

    # Data on 15 Mar 2026
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Hemoglobin", 13.2, "g/dL",
                     "2026-03-15", "lab_report_0315.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.0, "mg/dL",
                     "2026-03-15", "lab_report_0315.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "eGFR", 88.0, "mL/min",
                     "2026-03-15", "lab_report_0315.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 68.0, "bpm",
                     "2026-03-15", "vitals_chart_0315.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 140.0, "mmHg",
                     "2026-03-15", "vitals_chart_0315.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Diastolic", 88.0, "mmHg",
                     "2026-03-15", "vitals_chart_0315.csv", "row 3"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.2, "°F",
                     "2026-03-15", "vitals_chart_0315.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.VITAL, "Respiratory Rate", 16.0, "breaths/min",
                     "2026-03-15", "vitals_chart_0315.csv", "row 5"))
    events.append(_e(eid(), pid, EventType.VITAL, "SpO2", 97.0, "%",
                     "2026-03-15", "vitals_chart_0315.csv", "row 6"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 6.8, "x10^9/L",
                     "2026-03-15", "lab_report_0315.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.MEDICATION_START, "Amlodipine", "5mg daily", None,
                     "2026-03-01", "medication_record.csv", "row 1"))

    # 73-day GAP: next data on 27 May 2026
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Hemoglobin", 11.8, "g/dL",
                     "2026-05-27", "lab_report_0527.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Creatinine", 1.1, "mg/dL",
                     "2026-05-27", "lab_report_0527.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 74.0, "bpm",
                     "2026-05-27", "vitals_chart_0527.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 138.0, "mmHg",
                     "2026-05-27", "vitals_chart_0527.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.4, "°F",
                     "2026-05-27", "vitals_chart_0527.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 7.0, "x10^9/L",
                     "2026-05-27", "lab_report_0527.csv", "row 4"))

    # Declining hemoglobin (Jun onward)
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Hemoglobin", 10.5, "g/dL",
                     "2026-07-10", "lab_report_0710.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 78.0, "bpm",
                     "2026-07-10", "vitals_chart_0710.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 135.0, "mmHg",
                     "2026-07-10", "vitals_chart_0710.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.3, "°F",
                     "2026-07-10", "vitals_chart_0710.csv", "row 4"))

    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Hemoglobin", 9.8, "g/dL",
                     "2026-08-20", "lab_report_0820.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 82.0, "bpm",
                     "2026-08-20", "vitals_chart_0820.csv", "row 1"))

    events.append(_e(eid(), pid, EventType.LAB_RESULT, "Hemoglobin", 9.2, "g/dL",
                     "2026-09-25", "lab_report_0925.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Heart Rate", 86.0, "bpm",
                     "2026-09-25", "vitals_chart_0925.csv", "row 1"))
    events.append(_e(eid(), pid, EventType.VITAL, "Blood Pressure Systolic", 132.0, "mmHg",
                     "2026-09-25", "vitals_chart_0925.csv", "row 2"))
    events.append(_e(eid(), pid, EventType.VITAL, "Temperature", 98.5, "°F",
                     "2026-09-25", "vitals_chart_0925.csv", "row 4"))
    events.append(_e(eid(), pid, EventType.LAB_RESULT, "WBC", 7.2, "x10^9/L",
                     "2026-09-25", "lab_report_0925.csv", "row 4"))

    return events


# Patient metadata
PATIENTS_META = {
    "P-1024": {"label": "Patient A", "age": 62, "sex": "M", "primary_signal": "Progressive renal deterioration"},
    "P-2031": {"label": "Patient B", "age": 58, "sex": "F", "primary_signal": "Infection-associated signals"},
    "P-3007": {"label": "Patient C", "age": 45, "sex": "M", "primary_signal": "Stable baseline"},
    "P-4112": {"label": "Patient D", "age": 67, "sex": "M", "primary_signal": "Record contradictions and medication concerns"},
    "P-5090": {"label": "Patient E", "age": 71, "sex": "F", "primary_signal": "Data gap and declining hemoglobin"},
}


def build_all_events():
    """Build all seed events for all 5 patients."""
    all_events = []
    all_events.extend(build_p1024())
    all_events.extend(build_p2031())
    all_events.extend(build_p3007())
    all_events.extend(build_p4112())
    all_events.extend(build_p5090())
    return all_events
