#!/usr/bin/env python3
"""
One-time script to create Supabase Auth users for approved residents.

Usage:
  SUPABASE_SERVICE_ROLE_KEY="your-key" python3 create_resident_users.py

Get the service_role key from:
  https://supabase.com/dashboard/project/ogkxlgyybnjnikntzfag/settings/api
"""
import requests
import os
import sys
import time

SUPABASE_URL = "https://ogkxlgyybnjnikntzfag.supabase.co"

# Read service_role key from environment (never hardcode)
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SERVICE_ROLE_KEY:
    print("ERROR: Set SUPABASE_SERVICE_ROLE_KEY environment variable")
    print("  Get it from: https://supabase.com/dashboard/project/ogkxlgyybnjnikntzfag/settings/api")
    print()
    print("Usage:")
    print('  SUPABASE_SERVICE_ROLE_KEY="your-key" python3 create_resident_users.py')
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json"
}

# Approved residents to create in Supabase Auth
# Add more entries here if needed
RESIDENTS = [
    {
        "email": "suunilk98@gmail.com",
        "password": "SunSTD701!",
        "flat_no": "STD-701",
        "owner_name": "suunilk98",
        "mobile": ""
    },
]

def create_resident(res):
    """Create a Supabase Auth user and update profile for one resident."""
    email = res["email"].strip().lower()
    print(f"\n--- Creating user: {email} ---")

    # 1. Create auth user
    resp = requests.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=HEADERS, json={
        "email": email,
        "password": res["password"],
        "email_confirm": True,
        "user_metadata": {
            "role": "resident",
            "flat_no": res["flat_no"],
            "display_name": res["owner_name"]
        }
    })

    if resp.status_code in (200, 201):
        user_data = resp.json()
        user_id = user_data.get("id")
        print(f"  ✅ Auth user created: {email} (ID: {user_id})")
    elif resp.status_code == 422 and "already been registered" in resp.text.lower():
        print(f"  ⚠️  User already exists: {email}")
        # Try to find existing user to update profile
        list_resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50",
            headers=HEADERS
        )
        if list_resp.status_code == 200:
            users = list_resp.json().get("users", [])
            user_match = next((u for u in users if u.get("email", "").lower() == email), None)
            if user_match:
                user_id = user_match["id"]
                print(f"  Found existing user ID: {user_id}")
                # Update password
                update_resp = requests.put(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                    headers=HEADERS,
                    json={"password": res["password"], "email_confirm": True}
                )
                if update_resp.status_code == 200:
                    print(f"  ✅ Password updated for existing user")
                else:
                    print(f"  ❌ Password update failed: {update_resp.status_code} {update_resp.text}")
            else:
                print(f"  ❌ Could not find existing user in list")
                return False
        else:
            print(f"  ❌ Could not list users: {list_resp.status_code}")
            return False
    else:
        print(f"  ❌ Failed to create user: {resp.status_code}")
        print(f"     {resp.text}")
        return False

    # 2. Wait for trigger to create profile row
    print(f"  Waiting for profile trigger...")
    time.sleep(2)

    # 3. Update profile row with full details
    profile_resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
        headers={**HEADERS, "Prefer": "return=representation"},
        json={
            "display_name": res["owner_name"],
            "flat_no": res["flat_no"],
            "mobile": res.get("mobile", ""),
            "role": "resident",
            "status": "active"
        }
    )

    if profile_resp.status_code in (200, 201):
        profiles = profile_resp.json()
        if profiles and len(profiles) > 0:
            print(f"  ✅ Profile updated: role={profiles[0].get('role')}, flat={profiles[0].get('flat_no')}")
        else:
            # Profile might not exist yet (trigger delay), try INSERT
            print(f"  ⚠️  Profile not found, creating...")
            insert_resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers={**HEADERS, "Prefer": "return=representation"},
                json={
                    "id": user_id,
                    "email": email,
                    "display_name": res["owner_name"],
                    "flat_no": res["flat_no"],
                    "mobile": res.get("mobile", ""),
                    "role": "resident",
                    "status": "active"
                }
            )
            if insert_resp.status_code in (200, 201):
                print(f"  ✅ Profile created manually")
            else:
                print(f"  ❌ Profile insert failed: {insert_resp.status_code} {insert_resp.text}")
    elif profile_resp.status_code == 404:
        print(f"  ⚠️  Profile row not found, inserting...")
        insert_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={**HEADERS, "Prefer": "return=representation"},
            json={
                "id": user_id,
                "email": email,
                "display_name": res["owner_name"],
                "flat_no": res["flat_no"],
                "mobile": res.get("mobile", ""),
                "role": "resident",
                "status": "active"
            }
        )
        if insert_resp.status_code in (200, 201):
            print(f"  ✅ Profile created manually")
        else:
            print(f"  ❌ Profile insert failed: {insert_resp.status_code} {insert_resp.text}")
    else:
        print(f"  ❌ Profile update failed: {profile_resp.status_code} {profile_resp.text}")

    return True


def main():
    print("=" * 60)
    print("Sun Tower RWA — Create Resident Auth Users")
    print("=" * 60)
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Residents to create: {len(RESIDENTS)}")

    # Verify service_role key works
    test_resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1",
        headers=HEADERS
    )
    if test_resp.status_code != 200:
        print(f"\n❌ Service role key validation failed: {test_resp.status_code}")
        print(f"   {test_resp.text}")
        print("   Check that you're using the correct service_role key (not the anon key)")
        sys.exit(1)
    print("✅ Service role key validated")

    success = 0
    failed = 0
    for res in RESIDENTS:
        if create_resident(res):
            success += 1
        else:
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"Done: {success} created, {failed} failed")
    if success > 0:
        print(f"\nResidents can now login at suntower.in with their email and password.")
    print("=" * 60)


if __name__ == "__main__":
    main()
