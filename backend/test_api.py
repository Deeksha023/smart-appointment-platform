import unittest
from app import create_app
from app.database import get_db

class TestSmartAppointmentPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")

    def test_02_auth_login(self):
        # Test User Login
        res = self.client.post("/api/auth/login", json={
            "email": "user@smartapp.com",
            "password": "User@123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("token", data["data"])
        self.assertEqual(data["data"]["user"]["role"], "user")

        # Test Admin Login
        res_admin = self.client.post("/api/auth/login", json={
            "email": "admin@smartapp.com",
            "password": "Admin@123"
        })
        self.assertEqual(res_admin.status_code, 200)
        data_admin = res_admin.get_json()
        self.assertTrue(data_admin["success"])
        self.assertEqual(data_admin["data"]["user"]["role"], "admin")

    def test_03_booking_and_double_booking_prevention(self):
        # 1. Login user
        login_res = self.client.post("/api/auth/login", json={
            "email": "user@smartapp.com",
            "password": "User@123"
        })
        user_token = login_res.get_json()["data"]["token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # 2. Login second user
        login_res2 = self.client.post("/api/auth/login", json={
            "email": "sarah@smartapp.com",
            "password": "User@123"
        })
        sarah_token = login_res2.get_json()["data"]["token"]
        sarah_headers = {"Authorization": f"Bearer {sarah_token}"}

        # 3. Get available slots
        slots_res = self.client.get("/api/slots?available_only=1")
        self.assertEqual(slots_res.status_code, 200)
        slots = slots_res.get_json()["data"]
        self.assertTrue(len(slots) > 0)
        target_slot = slots[-1]  # Pick a future slot
        target_slot_id = target_slot["id"]

        # 4. User 1 books the slot
        book_res = self.client.post("/api/appointments", json={
            "slot_id": target_slot_id,
            "reason": "Specialized architecture deep-dive",
            "notes": "Testing concurrency"
        }, headers=user_headers)
        self.assertEqual(book_res.status_code, 201)
        booking_data = book_res.get_json()["data"]
        appointment_id = booking_data["id"]
        booking_ref = booking_data["booking_reference"]
        self.assertTrue(booking_ref.startswith("SAP-"))

        # 5. Slot must now be unavailable
        slot_check = self.client.get(f"/api/slots/{target_slot_id}")
        self.assertEqual(slot_check.status_code, 200)
        self.assertEqual(slot_check.get_json()["data"]["is_available"], 0)

        # 6. Sarah tries to book the same slot -> MUST FAIL with 409 Conflict
        conflict_res = self.client.post("/api/appointments", json={
            "slot_id": target_slot_id,
            "reason": "Attempting concurrent booking",
            "notes": "Should be rejected"
        }, headers=sarah_headers)
        self.assertEqual(conflict_res.status_code, 409)
        self.assertFalse(conflict_res.get_json()["success"])

        # 7. Cancel the appointment by owner
        cancel_res = self.client.post(f"/api/appointments/{appointment_id}/cancel", json={
            "reason": "Rescheduled to another slot"
        }, headers=user_headers)
        self.assertEqual(cancel_res.status_code, 200)
        self.assertTrue(cancel_res.get_json()["success"])

        # 8. Slot should now be available again!
        slot_after_cancel = self.client.get(f"/api/slots/{target_slot_id}")
        self.assertEqual(slot_after_cancel.get_json()["data"]["is_available"], 1)

    def test_04_admin_operations(self):
        # Login admin
        admin_login = self.client.post("/api/auth/login", json={
            "email": "admin@smartapp.com",
            "password": "Admin@123"
        })
        admin_token = admin_login.get_json()["data"]["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Check admin stats
        stats_res = self.client.get("/api/admin/stats", headers=admin_headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.get_json()["data"]
        self.assertIn("metrics", stats)
        self.assertGreaterEqual(stats["metrics"]["total_users"], 2)

        # Create new slot for future date
        new_slot_res = self.client.post("/api/slots", json={
            "title": "Ad-hoc Review",
            "description": "Created by automated test",
            "date": "2026-12-30",
            "start_time": "17:00",
            "end_time": "17:45"
        }, headers=admin_headers)
        self.assertEqual(new_slot_res.status_code, 201)
        created_slot_id = new_slot_res.get_json()["data"]["id"]

        # Delete the unbooked slot -> MUST SUCCEED
        del_res = self.client.delete(f"/api/slots/{created_slot_id}", headers=admin_headers)
        self.assertEqual(del_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
