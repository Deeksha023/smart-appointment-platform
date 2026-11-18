import requests
import json
import time
from app import create_app
from app.database import get_db

def run_workflow_verification():
    print("=" * 70)
    print("SMART APPOINTMENT PLATFORM - COMPLETE WORKFLOW VERIFICATION TEST")
    print("=" * 70)

    app = create_app()
    client = app.test_client()

    # Step 1: Register a new user
    print("\n[Step 1] Registering a new test user...")
    test_email = f"testuser_{int(time.time())}@smartapp.com"
    reg_res = client.post("/api/auth/register", json={
        "name": "David Miller",
        "email": test_email,
        "phone": "+1 (555) 019-8765",
        "password": "Password@123",
        "role": "user"
    })
    assert reg_res.status_code == 201, f"Expected 201, got {reg_res.status_code}: {reg_res.get_json()}"
    reg_data = reg_res.get_json()["data"]
    print(f"  ✓ User registered: {reg_data['user']['name']} ({reg_data['user']['email']})")

    # Step 2: Log in as a user
    print("\n[Step 2] Logging in as the registered user...")
    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "Password@123"
    })
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}"
    user_token = login_res.get_json()["data"]["token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("  ✓ Login successful, JWT token obtained.")

    # Step 3: View available appointment slots
    print("\n[Step 3] Fetching available appointment slots...")
    slots_res = client.get("/api/slots?available_only=1", headers=user_headers)
    assert slots_res.status_code == 200
    available_slots = slots_res.get_json()["data"]
    assert len(available_slots) > 0, "No available slots found"
    selected_slot = available_slots[0]
    selected_slot_id = selected_slot["id"]
    print(f"  ✓ Found {len(available_slots)} available slots. Selected slot #{selected_slot_id}: {selected_slot['title']} on {selected_slot['date']} at {selected_slot['start_time']}")

    # Step 4: Book an appointment
    print(f"\n[Step 4] Booking slot #{selected_slot_id}...")
    book_res = client.post("/api/appointments", json={
        "slot_id": selected_slot_id,
        "reason": "Quarterly Technical Performance Review",
        "notes": "Testing platform booking workflow"
    }, headers=user_headers)
    assert book_res.status_code == 201, f"Expected 201, got {book_res.status_code}: {book_res.get_json()}"
    booking_data = book_res.get_json()["data"]
    booking_id = booking_data["id"]
    booking_ref = booking_data["booking_reference"]
    print(f"  ✓ Appointment booked! Reference: {booking_ref}, Status: {booking_data['status']}")

    # Step 5: Verify that the slot becomes unavailable
    print(f"\n[Step 5] Verifying slot #{selected_slot_id} availability status...")
    slot_check_res = client.get(f"/api/slots/{selected_slot_id}", headers=user_headers)
    assert slot_check_res.status_code == 200
    slot_info = slot_check_res.get_json()["data"]
    assert slot_info["is_available"] == 0, f"Expected is_available == 0, got {slot_info['is_available']}"
    print(f"  ✓ Confirmed: Slot #{selected_slot_id} is_available is now 0 (unavailable).")

    # Step 6: Log in as another user and verify that the same slot cannot be booked
    print("\n[Step 6] Attempting double booking from second user (Sarah Connor)...")
    sarah_login = client.post("/api/auth/login", json={
        "email": "sarah@smartapp.com",
        "password": "User@123"
    })
    sarah_token = sarah_login.get_json()["data"]["token"]
    sarah_headers = {"Authorization": f"Bearer {sarah_token}"}

    double_book_res = client.post("/api/appointments", json={
        "slot_id": selected_slot_id,
        "reason": "Attempting to double book already taken slot",
        "notes": "Should be rejected"
    }, headers=sarah_headers)
    assert double_book_res.status_code == 409, f"Expected 409 Conflict, got {double_book_res.status_code}"
    print(f"  ✓ Double-booking successfully blocked with HTTP 409 Conflict: '{double_book_res.get_json()['message']}'")

    # Step 7: Cancel the appointment
    print(f"\n[Step 7] Cancelling appointment #{booking_id} ({booking_ref})...")
    cancel_res = client.post(f"/api/appointments/{booking_id}/cancel", json={
        "reason": "Rescheduled meeting to next week"
    }, headers=user_headers)
    assert cancel_res.status_code == 200, f"Expected 200, got {cancel_res.status_code}"
    cancel_data = cancel_res.get_json()["data"]
    assert cancel_data["status"] == "cancelled"
    print(f"  ✓ Appointment cancelled successfully. Status is now '{cancel_data['status']}'.")

    # Step 8: Verify slot availability is updated correctly
    print(f"\n[Step 8] Verifying slot #{selected_slot_id} is reopened and available again...")
    slot_reopen_res = client.get(f"/api/slots/{selected_slot_id}", headers=user_headers)
    slot_reopened_info = slot_reopen_res.get_json()["data"]
    assert slot_reopened_info["is_available"] == 1, f"Expected is_available == 1, got {slot_reopened_info['is_available']}"
    print(f"  ✓ Confirmed: Slot #{selected_slot_id} is_available is restored to 1 (available).")

    # Step 9: Log in as an administrator
    print("\n[Step 9] Logging in as system administrator...")
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@smartapp.com",
        "password": "Admin@123"
    })
    assert admin_login.status_code == 200
    admin_data = admin_login.get_json()["data"]
    admin_token = admin_data["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    assert admin_data["user"]["role"] == "admin"
    print(f"  ✓ Admin logged in: {admin_data['user']['name']} (Role: {admin_data['user']['role']})")

    # Step 10: Create a new slot and manage bookings
    print("\n[Step 10] Admin creating a new slot and managing bookings...")
    test_slot_date = "2026-12-31"
    test_slot_time = f"{10 + (int(time.time()) % 8)}:00"

    # Ensure idempotency by deleting any pre-existing test slot on this date & time
    with app.app_context():
        with get_db() as conn:
            conn.execute("DELETE FROM appointment_slots WHERE date = ? AND start_time = ?", (test_slot_date, test_slot_time))

    new_slot_res = client.post("/api/slots", json={
        "title": "Executive Strategic Assessment",
        "description": "One-on-one executive technical mentoring",
        "date": test_slot_date,
        "start_time": test_slot_time,
        "end_time": f"{int(test_slot_time.split(':')[0])}:45"
    }, headers=admin_headers)
    assert new_slot_res.status_code == 201, f"Expected 201, got {new_slot_res.status_code}: {new_slot_res.get_json()}"
    new_slot = new_slot_res.get_json()["data"]
    print(f"  ✓ Admin created new slot #{new_slot['id']} on {new_slot['date']} at {new_slot['start_time']}")

    # Admin fetching all bookings
    all_bookings_res = client.get("/api/admin/bookings", headers=admin_headers)
    assert all_bookings_res.status_code == 200
    all_bookings = all_bookings_res.get_json()["data"]
    print(f"  ✓ Admin retrieved {len(all_bookings)} total platform bookings.")

    # Admin dashboard statistics
    stats_res = client.get("/api/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.get_json()["data"]["metrics"]
    print(f"  ✓ Admin Stats Verified: Total Users: {stats['total_users']}, Total Bookings: {stats['total_appointments']}, Available Slots: {stats['available_slots']}")

    print("\n" + "=" * 70)
    print("ALL 10 WORKFLOW VERIFICATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_workflow_verification()
