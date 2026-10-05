"""
CLINOVA - Deterministic clinical analysis engines.
Clinical decision support prototype. Not a diagnostic device. Synthetic data.
All functions are deterministic - no randomness, no external API calls.
"""

import re
import numpy as np
from datetime import datetime, timedelta
from models import ClinicalEvent, EventType, Certainty, TimePrecision, ExtractionMethod


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _parse_date(d):
    """Parse ISO date string to datetime."""
    return datetime.fromisoformat(d)


def _days_between(a, b):
    """Days between two ISO date strings."""
    return (_parse_date(b) - _parse_date(a)).days


def _get_events(events, patient_id, event_type=None, concept=None):
    """Filter events for a patient, optionally by type and concept."""
    result = [e for e in events if e.patient_id == patient_id]
    if event_type:
        result = [e for e in result if e.event_type == event_type]
    if concept:
        result = [e for e in result if e.concept == concept]
    return sorted(result, key=lambda e: e.event_time)


def _get_numeric_series(events, patient_id, concept):
    """Get a time-value series for a numeric concept."""
    evts = _get_events(events, patient_id, concept=concept)
    series = []
    for e in evts:
        if e.value is not None:
            try:
                val = float(e.value)
                series.append({"date": e.event_time, "value": val, "event_id": e.event_id})
            except (ValueError, TypeError):
                pass
    return series


def _recent_events(events, patient_id, days=7):
    """Get events within the last N days of the patient's timeline."""
    patient_events = _get_events(events, patient_id)
    if not patient_events:
        return []
    latest = _parse_date(patient_events[-1].event_time)
    cutoff = latest - timedelta(days=days)
    return [e for e in patient_events if _parse_date(e.event_time) >= cutoff]


# ─── 0. Note Extraction (NegEx + relative time) ──────────────────────────────

def extract_from_note(note_text, patient_id, event_time, source_document, source_location):
    """
    Extract clinical events from raw note text.
    - Regex-based concept extraction
    - NegEx-style negation detection ("no", "denies", "without", "negative for")
    - Relative time resolution ("three weeks" -> APPROXIMATE, "six months ago" -> RETROSPECTIVE)
    """
    extracted = []
    negation_patterns = [
        r'\bno\s+', r'\bdenies\s+', r'\bwithout\s+', r'\bnegative\s+for\s+',
        r'\bnot\s+', r'\bno\s+history\s+of\s+',
    ]

    # Symptom patterns
    symptom_map = {
        r'reduced\s+urine\s+output': 'Reduced urine output',
        r'confusion': 'Confusion',
        r'fever': 'Fever',
        r'fatigue': 'Fatigue',
        r'chest\s+pain': 'Chest pain',
        r'chills': 'Chills',
        r'rigors': 'Rigors',
    }

    # Clinical history patterns
    history_map = {
        r'hospitalized\s+for\s+AKI': 'Prior AKI hospitalization',
        r'history\s+of\s+diabetes': 'Diabetes history',
    }

    # Relative time patterns
    relative_time_map = {
        r'three\s+weeks': (21, TimePrecision.APPROX, Certainty.APPROXIMATE),
        r'six\s+months?\s+ago': (180, TimePrecision.APPROX, Certainty.RETROSPECTIVE),
        r'yesterday': (1, TimePrecision.DAY, Certainty.CONFIRMED),
        r'past\s+few\s+days': (3, TimePrecision.APPROX, Certainty.APPROXIMATE),
    }

    text_lower = note_text.lower()
    event_dt = _parse_date(event_time)

    idx = 0

    def make_eid():
        nonlocal idx
        idx += 1
        return f"NLP-{patient_id}-{event_time}-{idx:03d}"

    # Check for negated concepts first
    def is_negated(concept_match_start, text):
        """Check if the concept at the given position is negated."""
        prefix = text[:concept_match_start]
        for neg_pat in [r'\bno\b', r'\bdenies\b', r'\bwithout\b', r'\bnegative\s+for\b',
                        r'\bnot\b', r'\bno\s+history\s+of\b']:
            if re.search(neg_pat, prefix[-40:], re.IGNORECASE):
                return True
        return False

    # Extract symptoms
    for pattern, concept in symptom_map.items():
        match = re.search(pattern, text_lower)
        if match:
            negated = is_negated(match.start(), text_lower)

            # Resolve time precision
            precision = TimePrecision.DAY
            certainty = Certainty.CONFIRMED
            resolved_time = event_time

            for time_pat, (days_offset, prec, cert) in relative_time_map.items():
                if re.search(time_pat, text_lower):
                    precision = prec
                    certainty = cert
                    resolved_time = (event_dt - timedelta(days=days_offset)).isoformat()[:10]
                    break

            extracted.append(ClinicalEvent(
                event_id=make_eid(),
                patient_id=patient_id,
                event_type=EventType.SYMPTOM,
                concept=concept,
                value="Absent" if negated else "Present",
                unit=None,
                event_time=resolved_time,
                time_precision=precision,
                source_document=source_document,
                source_location=source_location,
                certainty=certainty,
                confidence=0.85 if not negated else 0.90,
                extraction_method=ExtractionMethod.RULE_NLP,
                negated=negated,
            ))

    # Extract clinical history
    for pattern, concept in history_map.items():
        match = re.search(pattern, text_lower)
        if match:
            negated = is_negated(match.start(), text_lower)

            precision = TimePrecision.DAY
            certainty = Certainty.CONFIRMED
            resolved_time = event_time

            for time_pat, (days_offset, prec, cert) in relative_time_map.items():
                if re.search(time_pat, text_lower):
                    precision = prec
                    certainty = cert
                    resolved_time = (event_dt - timedelta(days=days_offset)).isoformat()[:10]
                    break

            etype = EventType.HOSPITALIZATION if "hospitalized" in pattern else EventType.CLINICAL_NOTE
            extracted.append(ClinicalEvent(
                event_id=make_eid(),
                patient_id=patient_id,
                event_type=etype,
                concept=concept,
                value="Negated" if negated else "Confirmed",
                unit=None,
                event_time=resolved_time,
                time_precision=precision,
                source_document=source_document,
                source_location=source_location,
                certainty=certainty,
                confidence=0.80 if negated else 0.75,
                extraction_method=ExtractionMethod.RULE_NLP,
                negated=negated,
            ))

    return extracted


# ─── 1. Trend ─────────────────────────────────────────────────────────────────

def trend(series):
    """
    Compute trend from a numeric time series.
    Uses numpy polyfit for slope. Baseline = mean of first 3 points.
    Returns slope, pct_change, baseline, current.
    """
    if len(series) < 2:
        return {"slope": 0.0, "pct_change": 0.0, "baseline": None, "current": None, "direction": "STABLE"}

    values = [s["value"] for s in series]
    # Use ordinal days as x
    dates = [_parse_date(s["date"]) for s in series]
    x = np.array([(d - dates[0]).days for d in dates], dtype=float)
    y = np.array(values, dtype=float)

    # Polyfit degree 1
    if len(x) >= 2 and x[-1] != x[0]:
        coeffs = np.polyfit(x, y, 1)
        slope = float(coeffs[0])
    else:
        slope = 0.0

    baseline = float(np.mean(y[:3])) if len(y) >= 3 else float(y[0])
    current = float(y[-1])
    pct_change = ((current - baseline) / abs(baseline) * 100) if baseline != 0 else 0.0

    if abs(pct_change) < 5:
        direction = "STABLE"
    elif pct_change > 0:
        direction = "RISING"
    else:
        direction = "FALLING"

    return {
        "slope": round(slope, 6),
        "pct_change": round(pct_change, 1),
        "baseline": round(baseline, 2),
        "current": round(current, 2),
        "direction": direction,
    }


# ─── 2. Turning Point ─────────────────────────────────────────────────────────

def turning_point(series):
    """
    Detect turning point using CUSUM (cumulative sum of deviations from baseline)
    or two-segment split. Returns date, previous_state, new_state, supporting_event_ids, confidence.
    """
    if len(series) < 4:
        return None

    values = [s["value"] for s in series]
    dates = [s["date"] for s in series]
    event_ids = [s["event_id"] for s in series]
    y = np.array(values, dtype=float)
    n = len(y)

    # CUSUM: baseline = mean of first 3 points
    baseline = float(np.mean(y[:3]))
    std = float(np.std(y[:3]))
    threshold = max(2 * std, 0.10 * abs(baseline), 0.05)

    split_idx = None
    for i in range(3, n):
        if abs(y[i] - baseline) >= threshold:
            split_idx = i
            break

    if split_idx is None:
        dates_dt = [_parse_date(d) for d in dates]
        x = np.array([(d - dates_dt[0]).days for d in dates_dt], dtype=float)
        best_slope_diff = 0
        for i in range(2, n - 1):
            c1 = np.polyfit(x[:i], y[:i], 1)
            c2 = np.polyfit(x[i:], y[i:], 1)
            diff = abs(c2[0] - c1[0])
            if diff > best_slope_diff:
                best_slope_diff = diff
                split_idx = i

    if split_idx is None:
        return None

    prev_vals = y[:split_idx]
    post_vals = y[split_idx:]
    prev_mean = float(np.mean(prev_vals))
    post_mean = float(np.mean(post_vals))

    diff_pct = abs(post_mean - prev_mean) / (abs(prev_mean) + 0.001) * 100
    if diff_pct < 5:
        return None

    prev_state = "STABLE" if np.std(prev_vals) < 0.2 else "VARIABLE"
    new_state = "RISING" if post_mean > prev_mean else "FALLING"

    confidence = min(0.95, diff_pct / 100 + 0.3)

    return {
        "date": dates[split_idx],
        "previous_state": prev_state,
        "new_state": new_state,
        "supporting_event_ids": event_ids[max(0, split_idx-1):min(n, split_idx+2)],
        "confidence": round(confidence, 2),
    }


# ─── 3. Trajectories ──────────────────────────────────────────────────────────

def trajectories(events, patient_id):
    """
    Compute trajectory assessments for renal, inflammatory, hemodynamic,
    respiratory, and medication burden domains.
    """
    results = []

    # Renal trajectory
    cr_series = _get_numeric_series(events, patient_id, "Creatinine")
    egfr_series = _get_numeric_series(events, patient_id, "eGFR")
    cr_trend = trend(cr_series)
    cr_tp = turning_point(cr_series)
    renal_evidence = [s["event_id"] for s in cr_series] + [s["event_id"] for s in egfr_series]

    if cr_trend["pct_change"] > 30:
        renal_status = "ACCELERATING"
    elif cr_trend["pct_change"] > 15:
        renal_status = "PROGRESSIVE"
    elif cr_trend["pct_change"] > 5:
        renal_status = "EARLY_CHANGE"
    elif cr_trend["pct_change"] < -5:
        renal_status = "RECOVERING"
    else:
        renal_status = "STABLE"

    results.append({
        "name": "Renal",
        "trajectory_status": renal_status,
        "trend_direction": cr_trend["direction"],
        "rate_of_change": cr_trend["pct_change"],
        "baseline": cr_trend["baseline"],
        "current_state": cr_trend["current"],
        "turning_point": cr_tp,
        "confidence": 0.9 if len(cr_series) >= 3 else 0.6,
        "supporting_evidence": renal_evidence,
        "uncertainty": "Limited data points" if len(cr_series) < 3 else "Adequate longitudinal data",
    })

    # Inflammatory trajectory
    wbc_series = _get_numeric_series(events, patient_id, "WBC")
    crp_series = _get_numeric_series(events, patient_id, "CRP")
    wbc_trend = trend(wbc_series)
    wbc_tp = turning_point(wbc_series)
    inflam_evidence = [s["event_id"] for s in wbc_series] + [s["event_id"] for s in crp_series]

    if wbc_trend["pct_change"] > 50:
        inflam_status = "HIGH_CONCERN"
    elif wbc_trend["pct_change"] > 25:
        inflam_status = "ACCELERATING"
    elif wbc_trend["pct_change"] > 10:
        inflam_status = "PROGRESSIVE"
    elif wbc_trend["pct_change"] > 5:
        inflam_status = "EARLY_CHANGE"
    else:
        inflam_status = "STABLE"

    results.append({
        "name": "Inflammatory",
        "trajectory_status": inflam_status,
        "trend_direction": wbc_trend["direction"],
        "rate_of_change": wbc_trend["pct_change"],
        "baseline": wbc_trend["baseline"],
        "current_state": wbc_trend["current"],
        "turning_point": wbc_tp,
        "confidence": 0.85 if len(wbc_series) >= 3 else 0.5,
        "supporting_evidence": inflam_evidence,
        "uncertainty": "Limited data points" if len(wbc_series) < 3 else "Adequate longitudinal data",
    })

    # Hemodynamic trajectory
    hr_series = _get_numeric_series(events, patient_id, "Heart Rate")
    sbp_series = _get_numeric_series(events, patient_id, "Blood Pressure Systolic")
    hr_trend = trend(hr_series)
    sbp_trend = trend(sbp_series)
    hemo_evidence = [s["event_id"] for s in hr_series] + [s["event_id"] for s in sbp_series]

    # Rising HR + falling BP = concern
    if hr_trend["pct_change"] > 20 and sbp_trend["pct_change"] < -10:
        hemo_status = "HIGH_CONCERN"
    elif hr_trend["pct_change"] > 15 or sbp_trend["pct_change"] < -10:
        hemo_status = "PROGRESSIVE"
    elif hr_trend["pct_change"] > 5 or sbp_trend["pct_change"] < -5:
        hemo_status = "EARLY_CHANGE"
    else:
        hemo_status = "STABLE"

    combined_direction = "STABLE"
    if hr_trend["direction"] == "RISING" or sbp_trend["direction"] == "FALLING":
        combined_direction = "DETERIORATING"

    results.append({
        "name": "Hemodynamic",
        "trajectory_status": hemo_status,
        "trend_direction": combined_direction,
        "rate_of_change": hr_trend["pct_change"],
        "baseline": hr_trend["baseline"],
        "current_state": hr_trend["current"],
        "turning_point": turning_point(hr_series),
        "confidence": 0.85 if len(hr_series) >= 3 else 0.5,
        "supporting_evidence": hemo_evidence,
        "uncertainty": "Limited data points" if len(hr_series) < 3 else "Adequate longitudinal data",
    })

    # Respiratory trajectory
    rr_series = _get_numeric_series(events, patient_id, "Respiratory Rate")
    spo2_series = _get_numeric_series(events, patient_id, "SpO2")
    rr_trend = trend(rr_series)
    spo2_trend = trend(spo2_series)
    resp_evidence = [s["event_id"] for s in rr_series] + [s["event_id"] for s in spo2_series]

    if rr_trend["pct_change"] > 25 or spo2_trend["pct_change"] < -3:
        resp_status = "HIGH_CONCERN"
    elif rr_trend["pct_change"] > 10:
        resp_status = "PROGRESSIVE"
    elif rr_trend["pct_change"] > 5:
        resp_status = "EARLY_CHANGE"
    else:
        resp_status = "STABLE"

    results.append({
        "name": "Respiratory",
        "trajectory_status": resp_status,
        "trend_direction": rr_trend["direction"],
        "rate_of_change": rr_trend["pct_change"],
        "baseline": rr_trend["baseline"],
        "current_state": rr_trend["current"],
        "turning_point": turning_point(rr_series),
        "confidence": 0.85 if len(rr_series) >= 3 else 0.5,
        "supporting_evidence": resp_evidence,
        "uncertainty": "Limited data points" if len(rr_series) < 3 else "Adequate longitudinal data",
    })

    # Medication burden
    med_events = _get_events(events, patient_id)
    med_starts = [e for e in med_events if e.event_type == EventType.MEDICATION_START]
    med_stops = [e for e in med_events if e.event_type == EventType.MEDICATION_STOP]
    med_changes = [e for e in med_events if e.event_type == EventType.MEDICATION_CHANGE]
    med_count = len(med_starts) - len(med_stops)
    med_evidence_ids = [e.event_id for e in med_starts + med_stops + med_changes]

    if med_count > 5:
        med_status = "HIGH_CONCERN"
    elif len(med_changes) > 2:
        med_status = "PROGRESSIVE"
    elif med_count > 3:
        med_status = "EARLY_CHANGE"
    else:
        med_status = "STABLE"

    results.append({
        "name": "Medication Burden",
        "trajectory_status": med_status,
        "trend_direction": "RISING" if med_count > 3 else "STABLE",
        "rate_of_change": float(med_count),
        "baseline": float(len(med_starts[:1])) if med_starts else 0.0,
        "current_state": float(med_count),
        "turning_point": None,
        "confidence": 0.95,
        "supporting_evidence": med_evidence_ids,
        "uncertainty": "Based on recorded medication events only",
    })

    return results


# ─── 4. Deterioration Score ───────────────────────────────────────────────────

def deterioration_score(events, patient_id):
    """
    Weighted 0-100 score from vitals, labs, symptoms and medication changes
    in a recent window. Returns score and contributing signals.
    """
    recent = _recent_events(events, patient_id, days=14)
    all_patient = _get_events(events, patient_id)

    signals = []
    score = 0.0

    # Vital signs scoring
    hr_series = _get_numeric_series(events, patient_id, "Heart Rate")
    if hr_series:
        latest_hr = hr_series[-1]["value"]
        if latest_hr > 100:
            s = min(15, (latest_hr - 100) * 1.5)
            score += s
            signals.append({"signal": "Elevated heart rate", "value": latest_hr,
                          "unit": "bpm", "contribution": round(s, 1),
                          "evidence_id": hr_series[-1]["event_id"]})
        elif latest_hr > 90:
            s = (latest_hr - 90) * 0.5
            score += s
            signals.append({"signal": "Rising heart rate", "value": latest_hr,
                          "unit": "bpm", "contribution": round(s, 1),
                          "evidence_id": hr_series[-1]["event_id"]})

    temp_series = _get_numeric_series(events, patient_id, "Temperature")
    if temp_series:
        latest_temp = temp_series[-1]["value"]
        if latest_temp > 100.4:
            s = min(15, (latest_temp - 100.4) * 5)
            score += s
            signals.append({"signal": "Elevated temperature", "value": latest_temp,
                          "unit": "°F", "contribution": round(s, 1),
                          "evidence_id": temp_series[-1]["event_id"]})

    sbp_series = _get_numeric_series(events, patient_id, "Blood Pressure Systolic")
    if sbp_series:
        latest_sbp = sbp_series[-1]["value"]
        if latest_sbp < 100:
            s = min(15, (100 - latest_sbp) * 1.0)
            score += s
            signals.append({"signal": "Low blood pressure", "value": latest_sbp,
                          "unit": "mmHg", "contribution": round(s, 1),
                          "evidence_id": sbp_series[-1]["event_id"]})
        elif latest_sbp < 110:
            s = (110 - latest_sbp) * 0.5
            score += s
            signals.append({"signal": "Falling blood pressure", "value": latest_sbp,
                          "unit": "mmHg", "contribution": round(s, 1),
                          "evidence_id": sbp_series[-1]["event_id"]})

    rr_series = _get_numeric_series(events, patient_id, "Respiratory Rate")
    if rr_series:
        latest_rr = rr_series[-1]["value"]
        if latest_rr > 20:
            s = min(10, (latest_rr - 20) * 1.5)
            score += s
            signals.append({"signal": "Elevated respiratory rate", "value": latest_rr,
                          "unit": "breaths/min", "contribution": round(s, 1),
                          "evidence_id": rr_series[-1]["event_id"]})

    spo2_series = _get_numeric_series(events, patient_id, "SpO2")
    if spo2_series:
        latest_spo2 = spo2_series[-1]["value"]
        if latest_spo2 < 94:
            s = min(10, (94 - latest_spo2) * 2)
            score += s
            signals.append({"signal": "Low oxygen saturation", "value": latest_spo2,
                          "unit": "%", "contribution": round(s, 1),
                          "evidence_id": spo2_series[-1]["event_id"]})

    # Lab scoring
    wbc_series = _get_numeric_series(events, patient_id, "WBC")
    if wbc_series:
        latest_wbc = wbc_series[-1]["value"]
        if latest_wbc > 12:
            s = min(10, (latest_wbc - 12) * 1.5)
            score += s
            signals.append({"signal": "Elevated WBC", "value": latest_wbc,
                          "unit": "x10^9/L", "contribution": round(s, 1),
                          "evidence_id": wbc_series[-1]["event_id"]})

    cr_series = _get_numeric_series(events, patient_id, "Creatinine")
    if cr_series and len(cr_series) >= 2:
        cr_trend_data = trend(cr_series)
        if cr_trend_data["pct_change"] > 50:
            s = 20.0
        elif cr_trend_data["pct_change"] > 25:
            s = 15.0
        elif cr_trend_data["pct_change"] > 10:
            s = 8.0
        else:
            s = 0.0
        if s > 0:
            score += s
            signals.append({"signal": "Rising creatinine", "value": cr_series[-1]["value"],
                          "unit": "mg/dL", "contribution": round(s, 1),
                          "evidence_id": cr_series[-1]["event_id"]})

    crp_series = _get_numeric_series(events, patient_id, "CRP")
    if crp_series:
        latest_crp = crp_series[-1]["value"]
        if latest_crp > 10:
            s = min(10, latest_crp / 10)
            score += s
            signals.append({"signal": "Elevated CRP", "value": latest_crp,
                          "unit": "mg/L", "contribution": round(s, 1),
                          "evidence_id": crp_series[-1]["event_id"]})

    lactate_series = _get_numeric_series(events, patient_id, "Lactate")
    if lactate_series:
        latest_lac = lactate_series[-1]["value"]
        if latest_lac > 2.0:
            s = min(10, (latest_lac - 2.0) * 5)
            score += s
            signals.append({"signal": "Elevated lactate", "value": latest_lac,
                          "unit": "mmol/L", "contribution": round(s, 1),
                          "evidence_id": lactate_series[-1]["event_id"]})

    # Medication safety scoring
    med_safe = medication_safety(events, patient_id)
    for ms in med_safe:
        m_score = 15.0 if ms["severity"] == "HIGH" else 8.0
        score += m_score
        signals.append({"signal": f"Medication concern: {ms['medication']}", "value": "Risk alert",
                       "unit": None, "contribution": m_score,
                       "evidence_id": ms["evidence"][0] if ms["evidence"] else ""})

    # Symptom scoring
    symptoms = [e for e in recent if e.event_type == EventType.SYMPTOM and not e.negated]
    for sym in symptoms:
        s_score = 5.0
        score += s_score
        signals.append({"signal": f"Symptom: {sym.concept}", "value": sym.value,
                       "unit": None, "contribution": s_score,
                       "evidence_id": sym.event_id})

    # Cap at 100
    score = min(100.0, score)

    if score >= 45:
        level = "HIGH"
    elif score >= 20:
        level = "EMERGING"
    else:
        level = "LOW"

    return {
        "score": round(score, 1),
        "level": level,
        "contributing_signals": sorted(signals, key=lambda s: s["contribution"], reverse=True),
    }


# ─── 5. Why Now ───────────────────────────────────────────────────────────────

def why_now(events, patient_id):
    """
    Identify signals that changed in the latest window.
    HIGH requires at least 3 independent signals.
    """
    recent = _recent_events(events, patient_id, days=7)
    older = [e for e in _get_events(events, patient_id) if e not in recent]

    changed_signals = []

    # Compare latest vs baseline for key metrics
    for concept in ["Heart Rate", "Temperature", "Blood Pressure Systolic",
                    "Respiratory Rate", "SpO2", "WBC", "Creatinine", "CRP", "Lactate"]:
        recent_series = [e for e in recent if e.concept == concept and e.value is not None]
        older_series = [e for e in older if e.concept == concept and e.value is not None]

        if recent_series and older_series:
            try:
                latest_val = float(recent_series[-1].value)
                prev_val = float(older_series[-1].value)
                if prev_val != 0:
                    pct = round((latest_val - prev_val) / abs(prev_val) * 100, 1)
                else:
                    pct = 0.0

                if abs(pct) > 5:
                    direction = "↑" if pct > 0 else "↓"
                    changed_signals.append({
                        "signal": concept,
                        "previous": prev_val,
                        "current": latest_val,
                        "pct_change": pct,
                        "direction": direction,
                        "evidence_id": recent_series[-1].event_id,
                    })
            except (ValueError, TypeError):
                pass

    # New symptoms in recent window
    new_symptoms = [e for e in recent if e.event_type == EventType.SYMPTOM and not e.negated]
    for sym in new_symptoms:
        changed_signals.append({
            "signal": f"New symptom: {sym.concept}",
            "previous": "Not reported",
            "current": sym.value,
            "pct_change": None,
            "direction": "NEW",
            "evidence_id": sym.event_id,
        })

    n_signals = len(changed_signals)
    if n_signals >= 3:
        urgency = "HIGH"
    elif n_signals >= 1:
        urgency = "EMERGING"
    else:
        urgency = "LOW"

    return {
        "urgency": urgency,
        "signal_count": n_signals,
        "message": f"{n_signals} independent signals changed in the same window" if n_signals >= 3
                   else f"{n_signals} signal(s) changed recently",
        "signals": changed_signals,
    }


# ─── 6. NEWS2 ─────────────────────────────────────────────────────────────────

def news2(events, patient_id):
    """
    Standard NEWS2 score from latest vitals.
    Also computes clinova_first_flag_date vs news2_first_trigger_date.
    """
    def news2_component(param, value):
        """Score individual NEWS2 components."""
        if param == "Respiratory Rate":
            if value <= 8:
                return 3
            elif value <= 11:
                return 1
            elif value <= 20:
                return 0
            elif value <= 24:
                return 2
            else:
                return 3
        elif param == "SpO2":
            if value <= 91:
                return 3
            elif value <= 93:
                return 2
            elif value <= 95:
                return 1
            else:
                return 0
        elif param == "Temperature":
            # Convert °F to °C for NEWS2
            temp_c = (value - 32) * 5 / 9
            if temp_c <= 35.0:
                return 3
            elif temp_c <= 36.0:
                return 1
            elif temp_c <= 38.0:
                return 0
            elif temp_c <= 39.0:
                return 1
            else:
                return 2
        elif param == "Blood Pressure Systolic":
            if value <= 90:
                return 3
            elif value <= 100:
                return 2
            elif value <= 110:
                return 1
            elif value <= 219:
                return 0
            else:
                return 3
        elif param == "Heart Rate":
            if value <= 40:
                return 3
            elif value <= 50:
                return 1
            elif value <= 90:
                return 0
            elif value <= 110:
                return 1
            elif value <= 130:
                return 2
            else:
                return 3
        return 0

    # Calculate NEWS2 at each time point
    patient_events = _get_events(events, patient_id)
    dates = sorted(set(e.event_time for e in patient_events))

    news2_scores = []
    news2_first_trigger = None

    for date in dates:
        date_events = [e for e in patient_events if e.event_time == date]
        vitals = {}
        for e in date_events:
            if e.event_type == EventType.VITAL and e.value is not None:
                try:
                    vitals[e.concept] = float(e.value)
                except (ValueError, TypeError):
                    pass

        if len(vitals) >= 3:  # Need at least 3 vital signs
            total = 0
            components = {}
            for param in ["Respiratory Rate", "SpO2", "Temperature",
                         "Blood Pressure Systolic", "Heart Rate"]:
                if param in vitals:
                    sc = news2_component(param, vitals[param])
                    components[param] = sc
                    total += sc

            news2_scores.append({"date": date, "score": total, "components": components})

            if total >= 5 and news2_first_trigger is None:
                news2_first_trigger = date

    # CLINOVA first flag: when deterioration score first exceeded 30
    # We'll compute at each date
    clinova_first_flag = None
    for date in dates:
        # Build events up to this date
        events_to_date = [e for e in patient_events if e.event_time <= date]
        det = deterioration_score(events_to_date + [e for e in events if e.patient_id != patient_id], patient_id)
        if det["score"] >= 30 and clinova_first_flag is None:
            clinova_first_flag = date

    days_earlier = 0
    if clinova_first_flag and news2_first_trigger:
        days_earlier = _days_between(clinova_first_flag, news2_first_trigger)

    latest_score = news2_scores[-1] if news2_scores else {"score": 0, "components": {}}

    return {
        "current_score": latest_score["score"],
        "components": latest_score.get("components", {}),
        "history": news2_scores,
        "news2_first_trigger_date": news2_first_trigger,
        "clinova_first_flag_date": clinova_first_flag,
        "days_earlier": days_earlier,
        "message": f"CLINOVA flagged {days_earlier} days earlier than NEWS2" if days_earlier > 0
                   else "NEWS2 and CLINOVA flagged at similar times",
    }


# ─── 7. Gaps ──────────────────────────────────────────────────────────────────

def gaps(events, patient_id):
    """Find intervals over 30 days with no data."""
    patient_events = _get_events(events, patient_id)
    if len(patient_events) < 2:
        return []

    dates = sorted(set(e.event_time for e in patient_events))
    result = []

    for i in range(len(dates) - 1):
        days = _days_between(dates[i], dates[i + 1])
        if days > 30:
            result.append({
                "start": dates[i],
                "end": dates[i + 1],
                "days": days,
                "message": "Clinical state during this interval cannot be reliably established.",
                "confidence_penalty": round(min(0.4, days / 200), 2),
            })

    return result


# ─── 8. Contradictions ────────────────────────────────────────────────────────

def contradictions(events, patient_id):
    """
    Detect contradictions in the clinical record.
    Rules: note "no history of diabetes" vs diabetes medication vs HbA1c >= 6.5.
    Never picks a winner.
    """
    patient_events = _get_events(events, patient_id)
    results = []

    # Rule 1: Diabetes contradiction
    negated_diabetes = [e for e in patient_events
                       if ("diabetes" in str(e.value).lower() or "diabetes" in e.concept.lower())
                       and (e.negated or "no" in str(e.value).lower().split()[:3])]
    diabetes_meds = [e for e in patient_events
                    if e.event_type == EventType.MEDICATION_START
                    and e.concept.lower() in ["metformin", "insulin", "glipizide", "glyburide",
                                               "sitagliptin", "empagliflozin"]]
    hba1c_high = [e for e in patient_events
                 if e.concept == "HbA1c" and e.value is not None
                 and float(e.value) >= 6.5]

    if negated_diabetes and (diabetes_meds or hba1c_high):
        evidence_ids = ([e.event_id for e in negated_diabetes] +
                       [e.event_id for e in diabetes_meds] +
                       [e.event_id for e in hba1c_high])

        source_a = {
            "type": "Clinical Note",
            "text": negated_diabetes[0].value if negated_diabetes else "No history of diabetes",
            "document": negated_diabetes[0].source_document if negated_diabetes else "",
            "location": negated_diabetes[0].source_location if negated_diabetes else "",
            "event_id": negated_diabetes[0].event_id if negated_diabetes else "",
        }
        source_b = None
        if diabetes_meds:
            source_b = {
                "type": "Medication Record",
                "text": f"{diabetes_meds[0].concept} {diabetes_meds[0].value}",
                "document": diabetes_meds[0].source_document,
                "location": diabetes_meds[0].source_location,
                "event_id": diabetes_meds[0].event_id,
            }
        source_c = None
        if hba1c_high:
            source_c = {
                "type": "Lab Result",
                "text": f"HbA1c {hba1c_high[0].value}%",
                "document": hba1c_high[0].source_document,
                "location": hba1c_high[0].source_location,
                "event_id": hba1c_high[0].event_id,
            }

        results.append({
            "id": f"CONTRA-{patient_id}-001",
            "description": "Diabetes status conflict",
            "source_a": source_a,
            "source_b": source_b,
            "source_c": source_c,
            "evidence_ids": evidence_ids,
            "message": "Clinical record conflict detected. Clinician verification required.",
        })

    return results


# ─── 9. Medication Safety ─────────────────────────────────────────────────────

def medication_safety(events, patient_id):
    """
    Curated demonstration rule set, not a substitute for a licensed
    drug-interaction database.
    Rules: NSAID + rising creatinine, ACE + spironolactone + rising K+,
    duplicate drug class.
    """
    patient_events = _get_events(events, patient_id)
    results = []

    # Active medications
    med_starts = [e for e in patient_events if e.event_type == EventType.MEDICATION_START]
    med_stops = [e for e in patient_events if e.event_type == EventType.MEDICATION_STOP]
    stopped_concepts = {e.concept for e in med_stops}
    active_meds = [e for e in med_starts if e.concept not in stopped_concepts]

    nsaids = ["Ibuprofen", "Naproxen", "Diclofenac", "Celecoxib", "Aspirin"]
    ace_inhibitors = ["Lisinopril", "Enalapril", "Ramipril", "Captopril"]
    arbs = ["Losartan", "Valsartan", "Candesartan"]

    active_med_names = [e.concept for e in active_meds]

    # Rule 1: NSAID + rising creatinine
    nsaid_active = [m for m in active_med_names if m in nsaids]
    cr_series = _get_numeric_series(events, patient_id, "Creatinine")
    cr_trend_data = trend(cr_series)

    if nsaid_active and cr_trend_data["pct_change"] > 10:
        nsaid_event = [e for e in active_meds if e.concept in nsaids][0]
        cr_event = cr_series[-1] if cr_series else None
        evidence = [nsaid_event.event_id]
        if cr_event:
            evidence.append(cr_event["event_id"])

        results.append({
            "id": f"MEDSAFE-{patient_id}-001",
            "medication": nsaid_active[0],
            "related_finding": f"Rising creatinine ({cr_trend_data['pct_change']}% increase) "
                             f"with active NSAID may indicate nephrotoxic risk",
            "evidence": evidence,
            "severity": "HIGH",
            "confidence": 0.85,
            "source": "Curated demonstration rule set, not a substitute for a licensed drug-interaction database",
        })

    # Rule 2: ACE inhibitor + Spironolactone + rising potassium
    ace_active = [m for m in active_med_names if m in ace_inhibitors]
    spiro_active = "Spironolactone" in active_med_names
    k_series = _get_numeric_series(events, patient_id, "Potassium")
    k_trend_data = trend(k_series)

    if ace_active and spiro_active and k_series and k_series[-1]["value"] > 5.0:
        ace_event = [e for e in active_meds if e.concept in ace_inhibitors][0]
        spiro_event = [e for e in active_meds if e.concept == "Spironolactone"][0]
        evidence = [ace_event.event_id, spiro_event.event_id]
        if k_series:
            evidence.append(k_series[-1]["event_id"])

        results.append({
            "id": f"MEDSAFE-{patient_id}-002",
            "medication": f"{ace_active[0]} + Spironolactone",
            "related_finding": f"Potassium {k_series[-1]['value']} mEq/L with concurrent ACE inhibitor "
                             f"and aldosterone antagonist may indicate hyperkalemia risk",
            "evidence": evidence,
            "severity": "HIGH",
            "confidence": 0.90,
            "source": "Curated demonstration rule set, not a substitute for a licensed drug-interaction database",
        })

    # Rule 3: Duplicate drug class
    if len([m for m in active_med_names if m in ace_inhibitors]) > 1:
        results.append({
            "id": f"MEDSAFE-{patient_id}-003",
            "medication": "Multiple ACE inhibitors",
            "related_finding": "Duplicate drug class detected",
            "evidence": [e.event_id for e in active_meds if e.concept in ace_inhibitors],
            "severity": "MODERATE",
            "confidence": 0.95,
            "source": "Curated demonstration rule set, not a substitute for a licensed drug-interaction database",
        })

    if len([m for m in active_med_names if m in arbs]) > 1:
        results.append({
            "id": f"MEDSAFE-{patient_id}-004",
            "medication": "Multiple ARBs",
            "related_finding": "Duplicate drug class detected",
            "evidence": [e.event_id for e in active_meds if e.concept in arbs],
            "severity": "MODERATE",
            "confidence": 0.95,
            "source": "Curated demonstration rule set, not a substitute for a licensed drug-interaction database",
        })

    return results


# ─── 10. Data Quality ─────────────────────────────────────────────────────────

def data_quality(events, patient_id):
    """
    Compute data quality scores for overall, lab, vital, medication,
    notes and historical completeness.
    """
    patient_events = _get_events(events, patient_id)
    if not patient_events:
        return {"overall": 0, "lab": 0, "vital": 0, "medication": 0, "notes": 0,
                "historical": 0, "confidence_reduction": 0.5}

    labs = [e for e in patient_events if e.event_type == EventType.LAB_RESULT]
    vitals = [e for e in patient_events if e.event_type == EventType.VITAL]
    meds = [e for e in patient_events if e.event_type in
            (EventType.MEDICATION_START, EventType.MEDICATION_STOP, EventType.MEDICATION_CHANGE)]
    notes = [e for e in patient_events if e.event_type == EventType.CLINICAL_NOTE]
    historical = [e for e in patient_events if e.event_type == EventType.HOSPITALIZATION]

    # Score based on data density and coverage
    dates = sorted(set(e.event_time for e in patient_events))
    if len(dates) >= 2:
        span_days = max(1, _days_between(dates[0], dates[-1]))
        density = len(dates) / max(1, span_days / 30)  # visits per month
    else:
        density = 0
        span_days = 0

    gap_list = gaps(events, patient_id)
    gap_penalty = sum(g["confidence_penalty"] for g in gap_list)

    lab_score = min(100, len(labs) * 8)
    vital_score = min(100, len(vitals) * 5)
    med_score = min(100, len(meds) * 20)
    notes_score = min(100, len(notes) * 25)
    historical_score = min(100, len(historical) * 50 + 30) if historical else 30

    overall = (lab_score * 0.3 + vital_score * 0.3 + med_score * 0.15 +
               notes_score * 0.15 + historical_score * 0.1)
    overall = max(0, overall - gap_penalty * 100)

    confidence_reduction = round(max(0, 0.5 - overall / 200), 2)

    return {
        "overall": round(overall, 1),
        "lab": round(lab_score, 1),
        "vital": round(vital_score, 1),
        "medication": round(med_score, 1),
        "notes": round(notes_score, 1),
        "historical": round(historical_score, 1),
        "confidence_reduction": confidence_reduction,
        "gap_count": len(gap_list),
    }


# ─── 11. Unknowns ─────────────────────────────────────────────────────────────

def unknowns(events, patient_id):
    """What AI does NOT know. Known vs unknown lists."""
    patient_events = _get_events(events, patient_id)
    gap_list = gaps(events, patient_id)

    known = []
    unknown = []

    # Check what we have
    has_labs = any(e.event_type == EventType.LAB_RESULT for e in patient_events)
    has_vitals = any(e.event_type == EventType.VITAL for e in patient_events)
    has_meds = any(e.event_type in (EventType.MEDICATION_START, EventType.MEDICATION_STOP)
                   for e in patient_events)
    has_notes = any(e.event_type == EventType.CLINICAL_NOTE for e in patient_events)

    if has_labs:
        known.append("Laboratory results available")
    else:
        unknown.append("No laboratory data available")

    if has_vitals:
        known.append("Vital signs recorded")
    else:
        unknown.append("No vital signs data")

    if has_meds:
        known.append("Medication records available")
        unknown.append("Medication adherence status unknown")
    else:
        unknown.append("No medication records available")

    if has_notes:
        known.append("Clinical notes on file")
    else:
        unknown.append("No clinical notes available")

    # Gaps
    for g in gap_list:
        unknown.append(f"Missing data interval: {g['start']} to {g['end']} ({g['days']} days)")

    # Standard unknowns
    unknown.append("External hospital records may exist but are not available")
    unknown.append("Exact symptom onset timing may differ from documented dates")

    # Approximate events
    approx_events = [e for e in patient_events
                    if e.certainty in (Certainty.APPROXIMATE, Certainty.RETROSPECTIVE)]
    if approx_events:
        known.append(f"{len(approx_events)} events with approximate timing")
        unknown.append("Precise timing of approximate events cannot be established")

    return {
        "known": known,
        "unknown": unknown,
        "known_count": len(known),
        "unknown_count": len(unknown),
    }


# ─── 12. What Changed ─────────────────────────────────────────────────────────

def what_changed(events, patient_id):
    """
    Latest vs previous encounter changes.
    """
    patient_events = _get_events(events, patient_id)
    dates = sorted(set(e.event_time for e in patient_events))

    if len(dates) < 2:
        return {"new_symptoms": [], "lab_changes": [], "vital_changes": [],
                "medication_changes": [], "new_alerts": [], "trajectory_changes": [],
                "total_count": 0}

    latest_date = dates[-1]
    # Find the previous encounter (different date)
    prev_dates = [d for d in dates if d < latest_date]
    if not prev_dates:
        prev_date = latest_date
    else:
        prev_date = prev_dates[-1]

    latest_events = [e for e in patient_events if e.event_time == latest_date]
    prev_events = [e for e in patient_events if e.event_time == prev_date]

    # New symptoms
    new_symptoms = [{"concept": e.concept, "value": e.value, "evidence_id": e.event_id}
                   for e in latest_events if e.event_type == EventType.SYMPTOM and not e.negated]

    # Lab changes
    lab_changes = []
    for le in latest_events:
        if le.event_type == EventType.LAB_RESULT and le.value is not None:
            prev_lab = [e for e in prev_events
                       if e.event_type == EventType.LAB_RESULT
                       and e.concept == le.concept and e.value is not None]
            if prev_lab:
                try:
                    old_val = float(prev_lab[-1].value)
                    new_val = float(le.value)
                    lab_changes.append({
                        "concept": le.concept,
                        "old": old_val, "new": new_val,
                        "unit": le.unit,
                        "evidence_id": le.event_id,
                    })
                except (ValueError, TypeError):
                    pass

    # Vital changes
    vital_changes = []
    for ve in latest_events:
        if ve.event_type == EventType.VITAL and ve.value is not None:
            prev_vital = [e for e in prev_events
                         if e.event_type == EventType.VITAL
                         and e.concept == ve.concept and e.value is not None]
            if prev_vital:
                try:
                    old_val = float(prev_vital[-1].value)
                    new_val = float(ve.value)
                    vital_changes.append({
                        "concept": ve.concept,
                        "old": old_val, "new": new_val,
                        "unit": ve.unit,
                        "evidence_id": ve.event_id,
                    })
                except (ValueError, TypeError):
                    pass

    # Medication changes
    medication_changes = [{"concept": e.concept, "value": e.value,
                          "type": e.event_type.value, "evidence_id": e.event_id}
                         for e in latest_events
                         if e.event_type in (EventType.MEDICATION_START,
                                            EventType.MEDICATION_STOP,
                                            EventType.MEDICATION_CHANGE)]

    total = len(new_symptoms) + len(lab_changes) + len(vital_changes) + len(medication_changes)

    return {
        "latest_date": latest_date,
        "previous_date": prev_date,
        "new_symptoms": new_symptoms,
        "lab_changes": lab_changes,
        "vital_changes": vital_changes,
        "medication_changes": medication_changes,
        "new_alerts": [],
        "trajectory_changes": [],
        "total_count": total,
    }


# ─── 13. Replay ───────────────────────────────────────────────────────────────

def replay(events, patient_id):
    """
    Build replay stages: STABLE, EARLY_SIGNAL, PROGRESSIVE,
    TURNING_POINT, ACCELERATION, CURRENT.
    """
    patient_events = _get_events(events, patient_id)
    if not patient_events:
        return []

    dates = sorted(set(e.event_time for e in patient_events))
    if len(dates) < 2:
        return [{
            "stage": "CURRENT",
            "date_range": [dates[0], dates[0]],
            "events": [e.event_id for e in patient_events],
            "status": "STABLE",
            "alerts": [],
            "score": 0,
        }]

    # Divide timeline into stages
    n_dates = len(dates)
    stages = []

    # Compute deterioration at each date
    scores_by_date = []
    for i, date in enumerate(dates):
        events_to_date = [e for e in patient_events if e.event_time <= date]
        all_events_to_date = [e for e in events if e.event_time <= date]
        det = deterioration_score(all_events_to_date, patient_id)
        scores_by_date.append({"date": date, "score": det["score"], "level": det["level"]})

    # Find turning point for segmentation
    cr_series = _get_numeric_series(events, patient_id, "Creatinine")
    tp = turning_point(cr_series)
    tp_date = tp["date"] if tp else None

    # Build stages based on score progression
    stage_defs = [
        ("STABLE", lambda s: s < 15),
        ("EARLY_SIGNAL", lambda s: 15 <= s < 30),
        ("PROGRESSIVE", lambda s: 30 <= s < 45),
        ("TURNING_POINT", lambda s: 45 <= s < 60),
        ("ACCELERATION", lambda s: 60 <= s < 75),
        ("CURRENT", lambda s: s >= 75),
    ]

    current_stage_idx = 0
    stage_events = []
    stage_start = dates[0]

    for sd in scores_by_date:
        # Determine which stage this score belongs to
        new_stage_idx = 0
        for si, (sname, sfunc) in enumerate(stage_defs):
            if sfunc(sd["score"]):
                new_stage_idx = si
                break
        else:
            new_stage_idx = len(stage_defs) - 1

        if new_stage_idx > current_stage_idx and stage_events:
            stages.append({
                "stage": stage_defs[current_stage_idx][0],
                "date_range": [stage_start, stage_events[-1]],
                "events": [e.event_id for e in patient_events
                          if stage_start <= e.event_time <= stage_events[-1]],
                "status": stage_defs[current_stage_idx][0],
                "alerts": [],
                "score": sd["score"],
            })
            stage_start = sd["date"]
            stage_events = [sd["date"]]
            current_stage_idx = new_stage_idx
        else:
            stage_events.append(sd["date"])

    # Add final stage
    if stage_events:
        final_score = scores_by_date[-1]["score"] if scores_by_date else 0
        # If no stages were added, this is the only stage
        final_stage_name = "CURRENT"
        if current_stage_idx < len(stage_defs):
            final_stage_name = stage_defs[min(current_stage_idx, len(stage_defs)-1)][0]

        stages.append({
            "stage": final_stage_name,
            "date_range": [stage_start, stage_events[-1]],
            "events": [e.event_id for e in patient_events
                      if stage_start <= e.event_time <= stage_events[-1]],
            "status": final_stage_name,
            "alerts": [],
            "score": final_score,
        })

    # Ensure CURRENT is the last stage
    if stages and stages[-1]["stage"] != "CURRENT":
        stages[-1]["stage"] = "CURRENT"

    # Ensure we have at least a STABLE and CURRENT stage
    if len(stages) == 1:
        # If only one stage, keep it as STABLE + CURRENT
        single = stages[0]
        mid_idx = len(dates) // 2
        if mid_idx > 0:
            stages = [
                {
                    "stage": "STABLE",
                    "date_range": [dates[0], dates[mid_idx]],
                    "events": [e.event_id for e in patient_events
                              if e.event_time <= dates[mid_idx]],
                    "status": "STABLE",
                    "alerts": [],
                    "score": scores_by_date[mid_idx]["score"] if mid_idx < len(scores_by_date) else 0,
                },
                {
                    "stage": "CURRENT",
                    "date_range": [dates[mid_idx + 1] if mid_idx + 1 < len(dates) else dates[mid_idx], dates[-1]],
                    "events": [e.event_id for e in patient_events
                              if e.event_time > dates[mid_idx]],
                    "status": "CURRENT",
                    "alerts": [],
                    "score": single["score"],
                },
            ]

    return stages


# ─── 14. Storyline ─────────────────────────────────────────────────────────────

def storyline(events, patient_id, patient_meta):
    """
    Template-based narrative sections. Every sentence has evidence_ids.
    """
    patient_events = _get_events(events, patient_id)
    if not patient_events:
        return {"sections": [], "confidence": 0}

    trajs = trajectories(events, patient_id)
    det = deterioration_score(events, patient_id)
    gap_list = gaps(events, patient_id)
    contras = contradictions(events, patient_id)
    med_safety = medication_safety(events, patient_id)
    dq = data_quality(events, patient_id)
    unk = unknowns(events, patient_id)
    cr_series = _get_numeric_series(events, patient_id, "Creatinine")
    tp = turning_point(cr_series)

    meta = patient_meta.get(patient_id, {})
    age = meta.get("age", "Unknown")
    sex = meta.get("sex", "Unknown")

    sections = []

    # Summary
    primary_signal = meta.get("primary_signal", "Under monitoring")
    event_ids = [e.event_id for e in patient_events[:3]]
    sections.append({
        "title": "Patient Summary",
        "content": f"{age}-year-old {sex} patient monitored for: {primary_signal}. "
                   f"Current deterioration score: {det['score']}/100 ({det['level']}). "
                   f"Total clinical events on record: {len(patient_events)}.",
        "evidence_ids": event_ids,
    })

    # Longitudinal Story
    dates = sorted(set(e.event_time for e in patient_events))
    span = f"{dates[0]} to {dates[-1]}" if len(dates) >= 2 else dates[0]
    traj_summaries = []
    for t in trajs:
        if t["trajectory_status"] != "STABLE":
            traj_summaries.append(f"{t['name']}: {t['trajectory_status']}")

    story_text = f"Clinical record spans {span} ({len(dates)} encounter dates). "
    if traj_summaries:
        story_text += f"Active trajectories: {', '.join(traj_summaries)}. "
    else:
        story_text += "All trajectories are currently stable. "
    story_evidence = [e.event_id for e in patient_events[:5]]
    sections.append({
        "title": "Longitudinal Story",
        "content": story_text,
        "evidence_ids": story_evidence,
    })

    # Milestones
    milestones = []
    med_starts = [e for e in patient_events if e.event_type == EventType.MEDICATION_START]
    for ms in med_starts:
        milestones.append(f"{ms.event_time}: {ms.concept} started")
    hospitalizations = [e for e in patient_events if e.event_type == EventType.HOSPITALIZATION]
    for h in hospitalizations:
        milestones.append(f"{h.event_time}: {h.concept}")

    milestone_text = "; ".join(milestones) if milestones else "No major milestones recorded."
    sections.append({
        "title": "Major Milestones",
        "content": milestone_text,
        "evidence_ids": [e.event_id for e in med_starts + hospitalizations],
    })

    # Turning Points
    if tp:
        tp_text = (f"Turning point detected around {tp['date']}: "
                  f"transition from {tp['previous_state']} to {tp['new_state']}. "
                  f"Confidence: {tp['confidence']:.0%}.")
        sections.append({
            "title": "Turning Points",
            "content": tp_text,
            "evidence_ids": tp["supporting_event_ids"],
        })
    else:
        sections.append({
            "title": "Turning Points",
            "content": "No significant turning points detected in available data.",
            "evidence_ids": [],
        })

    # Current State
    current_text = f"Deterioration score: {det['score']}/100 ({det['level']}). "
    if det["contributing_signals"]:
        top_signals = det["contributing_signals"][:3]
        sig_texts = [f"{s['signal']} ({s['value']} {s.get('unit', '')})" for s in top_signals]
        current_text += f"Top contributing signals: {', '.join(sig_texts)}."
    sections.append({
        "title": "Current State",
        "content": current_text,
        "evidence_ids": [s["evidence_id"] for s in det["contributing_signals"][:3]],
    })

    # Uncertainty
    uncertainty_items = []
    if gap_list:
        for g in gap_list:
            uncertainty_items.append(f"Data gap: {g['start']} to {g['end']} ({g['days']} days)")
    if contras:
        for c in contras:
            uncertainty_items.append(f"Contradiction: {c['description']}")
    approx = [e for e in patient_events if e.certainty == Certainty.APPROXIMATE]
    if approx:
        uncertainty_items.append(f"{len(approx)} events with approximate timing")

    uncertainty_text = "; ".join(uncertainty_items) if uncertainty_items else "No major uncertainties identified."
    sections.append({
        "title": "Uncertainty",
        "content": uncertainty_text,
        "evidence_ids": [e.event_id for e in approx],
    })

    # Evidence count
    sections.append({
        "title": "Evidence",
        "content": f"This narrative is supported by {len(patient_events)} clinical events "
                   f"from {len(set(e.source_document for e in patient_events))} source documents.",
        "evidence_ids": [e.event_id for e in patient_events],
    })

    overall_confidence = round(min(0.95, dq["overall"] / 100 - dq["confidence_reduction"]), 2)
    overall_confidence = max(0.3, overall_confidence)

    return {
        "sections": sections,
        "confidence": overall_confidence,
        "unknowns": unk,
        "data_quality": dq,
    }


# ─── 15. Evidence Graph ───────────────────────────────────────────────────────

def evidence_graph(events, patient_id, patient_meta):
    """
    Build React-Flow-friendly {nodes, edges}.
    Node types: patient, event, medication, trajectory, risk_signal, alert.
    Edge types: supports, triggers, associated_with.
    """
    patient_events = _get_events(events, patient_id)
    trajs = trajectories(events, patient_id)
    det = deterioration_score(events, patient_id)
    alert_list = alerts(events, patient_id, patient_meta)

    nodes = []
    edges = []

    meta = patient_meta.get(patient_id, {})

    # Patient node
    nodes.append({
        "id": patient_id,
        "type": "patient",
        "data": {"label": meta.get("label", patient_id), "age": meta.get("age"),
                "sex": meta.get("sex")},
        "position": {"x": 0, "y": 250},
    })

    # Event nodes (sample key events)
    key_events = []
    # Get latest of each type
    seen_concepts = set()
    for e in reversed(patient_events):
        key = f"{e.event_type.value}_{e.concept}"
        if key not in seen_concepts:
            seen_concepts.add(key)
            key_events.append(e)
        if len(key_events) >= 12:
            break

    for i, e in enumerate(key_events):
        node_type = "event"
        if e.event_type in (EventType.MEDICATION_START, EventType.MEDICATION_STOP,
                           EventType.MEDICATION_CHANGE):
            node_type = "medication"

        nodes.append({
            "id": e.event_id,
            "type": node_type,
            "data": {"label": e.concept, "value": str(e.value) if e.value else "",
                    "unit": e.unit or "", "date": e.event_time,
                    "event_type": e.event_type.value,
                    "certainty": e.certainty.value},
            "position": {"x": 250, "y": 50 + i * 50},
        })
        edges.append({
            "id": f"e-{patient_id}-{e.event_id}",
            "source": patient_id,
            "target": e.event_id,
            "type": "associated_with",
            "animated": False,
        })

    # Trajectory nodes
    for i, t in enumerate(trajs):
        t_id = f"traj-{patient_id}-{t['name']}"
        nodes.append({
            "id": t_id,
            "type": "trajectory",
            "data": {"label": t["name"], "status": t["trajectory_status"],
                    "direction": t["trend_direction"]},
            "position": {"x": 500, "y": 50 + i * 80},
        })
        # Connect supporting evidence
        for eid in t["supporting_evidence"][:3]:
            if any(n["id"] == eid for n in nodes):
                edges.append({
                    "id": f"e-{eid}-{t_id}",
                    "source": eid,
                    "target": t_id,
                    "type": "supports",
                    "animated": False,
                })

    # Risk signal node
    if det["score"] > 30:
        risk_id = f"risk-{patient_id}"
        nodes.append({
            "id": risk_id,
            "type": "risk_signal",
            "data": {"label": f"Risk Score: {det['score']}", "level": det["level"]},
            "position": {"x": 750, "y": 200},
        })
        for t in trajs:
            if t["trajectory_status"] not in ("STABLE", "UNKNOWN"):
                t_id = f"traj-{patient_id}-{t['name']}"
                edges.append({
                    "id": f"e-{t_id}-{risk_id}",
                    "source": t_id,
                    "target": risk_id,
                    "type": "triggers",
                    "animated": True,
                })

    # Alert nodes
    for i, a in enumerate(alert_list):
        nodes.append({
            "id": a["id"],
            "type": "alert",
            "data": {"label": a["title"], "priority": a["priority"]},
            "position": {"x": 750, "y": 350 + i * 80},
        })
        for eid in a["evidence_ids"][:2]:
            if any(n["id"] == eid for n in nodes):
                edges.append({
                    "id": f"e-{eid}-{a['id']}",
                    "source": eid,
                    "target": a["id"],
                    "type": "triggers",
                    "animated": a["priority"] == "HIGH",
                })

    return {"nodes": nodes, "edges": edges}


# ─── 16. Alerts ────────────────────────────────────────────────────────────────

def alerts(events, patient_id, patient_meta):
    """
    Generate alerts based on analysis results.
    Priority: HIGH, EMERGING, INFO.
    """
    result = []
    det = deterioration_score(events, patient_id)
    wn = why_now(events, patient_id)
    med_safe = medication_safety(events, patient_id)
    contras = contradictions(events, patient_id)
    gap_list = gaps(events, patient_id)

    # Deterioration alerts
    if det["level"] == "HIGH":
        top_signals = det["contributing_signals"][:3]
        why_text = ", ".join([s["signal"] for s in top_signals])
        result.append({
            "id": f"ALERT-{patient_id}-DET",
            "patient_id": patient_id,
            "priority": "HIGH",
            "title": "Multiple deterioration-associated signals detected",
            "why_now": f"Deterioration score {det['score']}/100. Key signals: {why_text}",
            "confidence": min(0.95, det["score"] / 100),
            "evidence_ids": [s["evidence_id"] for s in top_signals],
            "status": "OPEN",
        })
    elif det["level"] == "EMERGING":
        result.append({
            "id": f"ALERT-{patient_id}-EMR",
            "patient_id": patient_id,
            "priority": "EMERGING",
            "title": "Emerging deterioration-associated signals",
            "why_now": f"Deterioration score {det['score']}/100. {wn['message']}",
            "confidence": min(0.85, det["score"] / 100),
            "evidence_ids": [s.get("evidence_id", "") for s in wn["signals"][:3]],
            "status": "OPEN",
        })

    # Medication safety alerts
    for ms in med_safe:
        result.append({
            "id": f"ALERT-{patient_id}-MED-{ms['id']}",
            "patient_id": patient_id,
            "priority": "HIGH" if ms["severity"] == "HIGH" else "EMERGING",
            "title": f"Medication concern: {ms['medication']}",
            "why_now": ms["related_finding"],
            "confidence": ms["confidence"],
            "evidence_ids": ms["evidence"],
            "status": "OPEN",
        })

    # Contradiction alerts
    for c in contras:
        result.append({
            "id": f"ALERT-{patient_id}-CONTRA-{c['id']}",
            "patient_id": patient_id,
            "priority": "EMERGING",
            "title": f"Record conflict: {c['description']}",
            "why_now": c["message"],
            "confidence": 0.9,
            "evidence_ids": c["evidence_ids"],
            "status": "OPEN",
        })

    # Gap alerts
    for g in gap_list:
        result.append({
            "id": f"ALERT-{patient_id}-GAP-{g['start']}",
            "patient_id": patient_id,
            "priority": "INFO",
            "title": f"Data gap: {g['days']} days",
            "why_now": g["message"],
            "confidence": 1.0,
            "evidence_ids": [],
            "status": "OPEN",
        })

    return result
