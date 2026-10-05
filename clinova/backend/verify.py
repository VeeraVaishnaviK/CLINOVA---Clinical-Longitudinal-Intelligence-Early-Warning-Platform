"""
CLINOVA - Verification script for Phase 1.
Tests every endpoint for all 5 patients and validates core clinical assertions:
- All endpoints return 200
- P-1024 has turning point around May 2026, a HIGH alert, and CLINOVA flags earlier than NEWS2
- P-5090 has a 73-day gap
- P-4112 has a contradiction and a medication alert
- P-3007 is STABLE with no HIGH alert
"""

import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

PATIENT_IDS = ["P-1024", "P-2031", "P-3007", "P-4112", "P-5090"]

ENDPOINTS = [
    "",
    "/timeline",
    "/trajectories",
    "/turning-points",
    "/deterioration",
    "/gaps",
    "/contradictions",
    "/medication-safety",
    "/data-quality",
    "/unknowns",
    "/what-changed",
    "/replay",
    "/storyline",
    "/evidence-graph",
]

def run_tests():
    print("=== 1. Testing System & Global Endpoints ===")
    
    r = client.get("/api/v1/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    print("[PASS] GET /api/v1/health -> 200")
    
    r = client.get("/api/v1/patients")
    assert r.status_code == 200, f"Patients list failed: {r.status_code}"
    patients = r.json()
    assert len(patients) == 5, f"Expected 5 patients, got {len(patients)}"
    print(f"[PASS] GET /api/v1/patients -> 200 (Count: {len(patients)})")
    
    r = client.get("/api/v1/dashboard")
    assert r.status_code == 200, f"Dashboard failed: {r.status_code}"
    print("[PASS] GET /api/v1/dashboard -> 200")

    r = client.get("/api/v1/alerts")
    assert r.status_code == 200, f"Alerts list failed: {r.status_code}"
    alerts = r.json()
    print(f"[PASS] GET /api/v1/alerts -> 200 (Count: {len(alerts)})")

    r = client.get("/api/v1/fhir-mapping")
    assert r.status_code == 200, f"FHIR mapping failed: {r.status_code}"
    print("[PASS] GET /api/v1/fhir-mapping -> 200")

    r = client.get("/api/v1/audit")
    assert r.status_code == 200, f"Audit log failed: {r.status_code}"
    print("[PASS] GET /api/v1/audit -> 200")

    print("\n=== 2. Testing All Endpoints for All 5 Patients ===")
    for pid in PATIENT_IDS:
        for ep in ENDPOINTS:
            url = f"/api/v1/patients/{pid}{ep}"
            res = client.get(url)
            assert res.status_code == 200, f"Failed {url}: {res.status_code} {res.text}"
        print(f"[PASS] All endpoints returned 200 for {pid}")

    print("\n=== 3. Testing Evidence Endpoint ===")
    # Pick first event from P-1024 timeline
    r = client.get("/api/v1/patients/P-1024/timeline")
    timeline = r.json()
    first_eid = timeline[0]["event_id"]
    r_ev = client.get(f"/api/v1/evidence/{first_eid}")
    assert r_ev.status_code == 200, f"Evidence lookup failed: {r_ev.status_code}"
    print(f"[PASS] GET /api/v1/evidence/{first_eid} -> 200")

    print("\n=== 4. Testing Specific Clinical Rules & Assertions ===")

    # Assertion 1: P-1024 has turning point around May 2026, HIGH alert, and CLINOVA flags earlier than NEWS2
    tp_res = client.get("/api/v1/patients/P-1024/turning-points").json()
    assert "Creatinine" in tp_res or len(tp_res) > 0, "P-1024 must have a turning point"
    if "Creatinine" in tp_res:
        tp_date = tp_res["Creatinine"]["date"]
        print(f"[PASS] P-1024 Creatinine turning point date: {tp_date}")
        assert "2026-05" in tp_date or "2026-06" in tp_date or "2026-07" in tp_date, f"Unexpected TP date: {tp_date}"
    
    det_1024 = client.get("/api/v1/patients/P-1024/deterioration").json()
    assert det_1024["level"] == "HIGH", f"P-1024 should have HIGH deterioration, got {det_1024['level']}"
    news2_info = det_1024["news2"]
    print(f"[PASS] P-1024 Deterioration level: {det_1024['level']} (Score: {det_1024['score']})")
    print(f"[PASS] P-1024 NEWS2 trigger: {news2_info.get('news2_first_trigger_date')}, CLINOVA flag: {news2_info.get('clinova_first_flag_date')}, days earlier: {news2_info.get('days_earlier')}")
    assert news2_info.get("days_earlier", 0) > 0, f"CLINOVA must flag earlier than NEWS2: {news2_info}"

    # Check P-1024 has HIGH alert in /alerts or patient alerts
    alerts_1024 = [a for a in client.get("/api/v1/alerts").json() if a["patient_id"] == "P-1024"]
    has_high_alert = any(a["priority"] == "HIGH" for a in alerts_1024)
    assert has_high_alert, "P-1024 must have at least one HIGH alert"
    print("[PASS] P-1024 has HIGH priority alert")

    # Assertion 2: P-5090 has a 73-day gap
    gaps_5090 = client.get("/api/v1/patients/P-5090/gaps").json()
    assert len(gaps_5090) > 0, "P-5090 must have gap"
    gap_days = [g["days"] for g in gaps_5090]
    print(f"[PASS] P-5090 detected gaps: {gap_days}")
    assert 73 in gap_days, f"Expected 73-day gap in P-5090, found: {gap_days}"
    assert "cannot be reliably established" in gaps_5090[0]["message"]
    print("[PASS] P-5090 73-day gap verified with standard clinical gap message")

    # Assertion 3: P-4112 has a contradiction and a medication alert
    contra_4112 = client.get("/api/v1/patients/P-4112/contradictions").json()
    assert len(contra_4112) > 0, "P-4112 must have at least one contradiction"
    print(f"[PASS] P-4112 contradiction detected: {contra_4112[0]['description']}")
    assert "Clinician verification required" in contra_4112[0]["message"]

    med_4112 = client.get("/api/v1/patients/P-4112/medication-safety").json()
    assert len(med_4112) > 0, "P-4112 must have medication safety concern"
    print(f"[PASS] P-4112 medication safety concerns: {[m['medication'] for m in med_4112]}")

    # Assertion 4: P-3007 is STABLE with no HIGH alert
    p3007 = client.get("/api/v1/patients/P-3007").json()
    assert p3007["trajectory_status"] == "STABLE", f"P-3007 should be STABLE, got {p3007['trajectory_status']}"
    assert p3007["priority"] != "HIGH", f"P-3007 priority should not be HIGH, got {p3007['priority']}"
    alerts_3007 = [a for a in client.get("/api/v1/alerts").json() if a["patient_id"] == "P-3007"]
    assert not any(a["priority"] == "HIGH" for a in alerts_3007), "P-3007 must have NO HIGH alerts"
    print(f"[PASS] P-3007 is STABLE with no HIGH alerts (Score: {p3007['deterioration_score']})")

    print("\n=== 5. Testing Alert Mutation & Ingest Endpoints ===")
    test_alert = alerts[0]["id"]
    r_ack = client.post(f"/api/v1/alerts/{test_alert}/acknowledge")
    assert r_ack.status_code == 200 and r_ack.json()["status"] == "ACKNOWLEDGED"
    print(f"[PASS] POST /api/v1/alerts/{test_alert}/acknowledge -> ACKNOWLEDGED")

    r_dism = client.post(f"/api/v1/alerts/{test_alert}/dismiss")
    assert r_dism.status_code == 200 and r_dism.json()["status"] == "DISMISSED"
    print(f"[PASS] POST /api/v1/alerts/{test_alert}/dismiss -> DISMISSED")

    # Ingest CSV test
    csv_payload = {"csv_content": "patient_id,event_type,concept,value,unit,event_time\nP-1024,VITAL,Heart Rate,88,bpm,2026-10-04"}
    r_csv = client.post("/api/v1/ingest/csv", json=csv_payload)
    assert r_csv.status_code == 200 and r_csv.json()["count"] == 1
    print("[PASS] POST /api/v1/ingest/csv -> Ingested 1 event")

    # Ingest JSON test
    json_payload = {"events": [{"patient_id": "P-2031", "event_type": "LAB_RESULT", "concept": "Lactate", "value": "3.9", "unit": "mmol/L", "event_time": "2026-10-05"}]}
    r_json = client.post("/api/v1/ingest/json", json=json_payload)
    assert r_json.status_code == 200 and r_json.json()["count"] == 1
    print("[PASS] POST /api/v1/ingest/json -> Ingested 1 event")

    # Check audit log updated
    r_audit = client.get("/api/v1/audit")
    assert len(r_audit.json()) >= 5
    print(f"[PASS] Audit log verified with {len(r_audit.json())} recorded entries")

    print("\n==========================================")
    print("ALL PHASE 1 VERIFICATIONS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
