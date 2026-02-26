#!/usr/bin/env python3
"""
One-time migration: Import residents.json → Supabase residents_directory table.

Usage:
  SUPABASE_SERVICE_ROLE_KEY="your-key" python3 scripts/migrate_residents.py

Get the service_role key from:
  https://supabase.com/dashboard/project/ogkxlgyybnjnikntzfag/settings/api
"""
import json
import os
import sys
import requests
import time

SUPABASE_URL = "https://ogkxlgyybnjnikntzfag.supabase.co"
JSON_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "residents.json")

SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SERVICE_ROLE_KEY:
    print("ERROR: Set SUPABASE_SERVICE_ROLE_KEY environment variable")
    print("  Get it from: https://supabase.com/dashboard/project/ogkxlgyybnjnikntzfag/settings/api")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Field mapping: residents.json → residents_directory table
# JSON fields: n=name, f=flat_full, t=tower, fn=flat_no, tp=resident_type,
#              oc=occupancy, st=status, mb=mobile
def map_resident(r):
    return {
        "name": r.get("n", "").strip(),
        "flat_full": r.get("f", "").strip(),
        "tower": r.get("t", "").strip(),
        "flat_no": r.get("fn", "").strip(),
        "resident_type": r.get("tp", "").strip(),
        "occupancy": r.get("oc", "").strip(),
        "status": r.get("st", "Active").strip(),
        "mobile": r.get("mb", "").strip(),
        "email": r.get("em", "").strip() if r.get("em") else None
    }


def main():
    print("=" * 60)
    print("Sun Tower RWA — Migrate residents.json → Supabase")
    print("=" * 60)

    # Load JSON
    json_path = os.path.abspath(JSON_FILE)
    if not os.path.exists(json_path):
        print(f"ERROR: {json_path} not found")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    print(f"Loaded {len(raw)} records from residents.json")

    # Map to table format
    rows = [map_resident(r) for r in raw]
    # Filter out empty names
    rows = [r for r in rows if r["name"]]
    print(f"Valid records after filtering: {len(rows)}")

    # Check if table already has data
    check_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/residents_directory?select=id&limit=1",
        headers=HEADERS
    )
    if check_resp.status_code == 200:
        existing = check_resp.json()
        if existing:
            print(f"\nWARNING: residents_directory already has data ({len(existing)}+ rows)")
            confirm = input("Continue and insert anyway? (y/N): ").strip().lower()
            if confirm != 'y':
                print("Aborted.")
                sys.exit(0)
    elif check_resp.status_code == 404:
        print("ERROR: residents_directory table not found. Run 002_schema.sql first.")
        sys.exit(1)

    # Insert in batches of 50
    BATCH_SIZE = 50
    success = 0
    failed = 0

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE

        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/residents_directory",
            headers=HEADERS,
            json=batch
        )

        if resp.status_code in (200, 201):
            inserted = resp.json()
            success += len(inserted)
            print(f"  Batch {batch_num}/{total_batches}: inserted {len(inserted)} records")
        else:
            failed += len(batch)
            print(f"  Batch {batch_num}/{total_batches}: FAILED ({resp.status_code})")
            print(f"    {resp.text[:200]}")

        # Brief pause to avoid rate limits
        if i + BATCH_SIZE < len(rows):
            time.sleep(0.3)

    print(f"\n{'=' * 60}")
    print(f"Migration complete: {success} inserted, {failed} failed")
    print(f"Total records in source: {len(rows)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
