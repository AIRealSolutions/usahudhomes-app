#!/usr/bin/env python3
"""
Regression test for the YouTube upload Supabase Edge Functions.

Verifies that both edge functions are deployed and return expected responses.

Usage:
    python3 test_youtube_upload_functions.py

Environment variables required:
    SUPABASE_URL      — Supabase project URL
    SUPABASE_ANON_KEY — Supabase anon key (for invoking edge functions)

Optional (for live upload test):
    TEST_JOB_ID — a video_jobs row ID in 'done' state with youtube_title set
"""

import os
import sys
import json
import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
TEST_JOB_ID = os.environ.get("TEST_JOB_ID", "")


def invoke_function(function_name: str, body: dict) -> tuple[int, dict]:
    """Call a Supabase Edge Function and return (status_code, response_body)."""
    url = f"{SUPABASE_URL}/functions/v1/{function_name}"
    data = json.dumps(body).encode()
    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        try:
            return e.code, json.loads(body_bytes)
        except Exception:
            return e.code, {"error": body_bytes.decode(errors="replace")}


def check(name: str, condition: bool, detail: str = ""):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))
    return condition


def main():
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.")
        sys.exit(1)

    passed = 0
    failed = 0

    # ── Test 1: generate-video-metadata exists and handles missing API key gracefully ──
    print("\nTest: generate-video-metadata function reachability")
    status, resp = invoke_function("generate-video-metadata", {
        "city": "Fayetteville", "state": "NC", "county": "Cumberland",
        "price": 85000, "beds": 3, "baths": 2,
        "bids_open": "2026-02-01", "listing_period": "OO",
        "case_number": "387-012345",
    })
    # Function exists if we get anything other than 404
    if check("generate-video-metadata is deployed", status != 404,
             f"status={status}"):
        passed += 1
    else:
        failed += 1
        print("    → Function not deployed. Run: supabase functions deploy generate-video-metadata")

    # If 200, verify response shape
    if status == 200:
        if check("response has 'title' field", "title" in resp):
            passed += 1
        else:
            failed += 1
        if check("response has 'description' field", "description" in resp):
            passed += 1
        else:
            failed += 1
        if check("title is non-empty", bool(resp.get("title"))):
            passed += 1
        else:
            failed += 1
    elif status == 500 and "error" in resp:
        # Function deployed but config missing (e.g. OPENAI_API_KEY not set) — that's OK
        print(f"    Note: function returned 500 (likely missing OPENAI_API_KEY secret): {resp['error'][:120]}")
        passed += 1  # Deployed and responding is what matters

    # ── Test 2: upload-to-youtube exists and returns auth error (not 404) ──
    print("\nTest: upload-to-youtube function reachability")
    status, resp = invoke_function("upload-to-youtube", {"job_id": "00000000-0000-0000-0000-000000000000"})
    if check("upload-to-youtube is deployed", status != 404,
             f"status={status}"):
        passed += 1
    else:
        failed += 1
        print("    → Function not deployed. Run: supabase functions deploy upload-to-youtube")

    if status == 500 and "error" in resp:
        err_msg = resp["error"]
        if check("credentials error is descriptive",
                 "YouTube" in err_msg or "YOUTUBE_" in err_msg or "not found" in err_msg.lower(),
                 err_msg[:120]):
            passed += 1
        else:
            failed += 1

    # ── Test 3: upload-to-youtube rejects missing job_id ──
    print("\nTest: upload-to-youtube validates input")
    status, resp = invoke_function("upload-to-youtube", {})
    if check("rejects missing job_id", status in (400, 500),
             f"status={status}, error={resp.get('error', '')[:80]}"):
        passed += 1
    else:
        failed += 1

    # ── Test 4: generate-video-metadata with job_id (DB save path) ──
    if TEST_JOB_ID:
        print(f"\nTest: generate-video-metadata with real job_id={TEST_JOB_ID}")
        status, resp = invoke_function("generate-video-metadata", {
            "job_id": TEST_JOB_ID,
            "city": "Fayetteville", "state": "NC", "county": "Cumberland",
            "price": 85000, "beds": 3, "baths": 2,
        })
        if check("returns 200 with real job_id", status == 200, f"status={status}"):
            passed += 1
        else:
            failed += 1

    # ── Summary ──
    total = passed + failed
    print(f"\n{'='*50}")
    print(f"Results: {passed}/{total} passed")
    if failed:
        print("Some tests failed — check the output above.")
        sys.exit(1)
    else:
        print("All tests passed.")


if __name__ == "__main__":
    main()
