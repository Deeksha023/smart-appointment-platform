# Smart Appointment Platform

> A full-stack, enterprise-grade appointment booking and scheduling web application built for the 10-day internship technical assessment.

---

## 1. Project Overview

The **Smart Appointment Platform** is an appointment booking and management platform designed with modern SaaS design aesthetics. It provides a complete workflow for both clients/patients and administrative staff:

- **Clients / Users:** Register accounts, securely log in, browse real-time available time slots, book consultation sessions, review booking histories, inspect receipt confirmation passes, and cancel appointments with automated slot release.
- **Administrators:** Access a dedicated admin control plane featuring real-time statistical metrics, booking trend distribution charts, full appointment slot creation (both single-slot and batch generation), slot editing, deletion safety guards, and master booking management with status transitions (Confirmed, Completed, Cancelled).

---

## 2. Key Features

### 👤 User Module
- **JWT-Based Authentication:** Registration, login, profile updates, and password changes with password hashing (`werkzeug.security`).
- **Real-Time Interactive Dashboard:** Summary metrics for total, upcoming, completed, and cancelled bookings; spotlight banner for the next upcoming visit; and recent activity logs.
- **Appointment Booking Flow:** Multi-step wizard with quick date selector chips (Today, Tomorrow, 7-day outlook) or custom date pickers, visual available time slot chips, validation for booking reasons, pre-booking confirmation modal, and immediate booking confirmation reference (e.g. `SAP-20261118-XXXX`).
- **My Appointments:** Filter bookings by tab status (All, Confirmed, Completed, Cancelled) or specific dates, with real-time text searching and cancellation modals.
- **Appointment Details & Receipt:** Printable confirmation pass featuring booking reference, attendee contact information, service duration, status tracking, and cancellation reasoning logs.

### 🛡️ Administrator Module
- **Executive Analytics Dashboard:** Real-time metrics counters for users, total bookings, active sessions, cancellations, completions, and available vs. booked slot inventory.
- **Interactive Visual Distribution:** Color-coded distribution charts displaying proportion of confirmed, completed, and cancelled appointments.
- **Slot Capacity Management:**
  - Create single slots with custom titles, descriptions, dates, and start/end times.
  - **Batch Slot Generator:** Automatically generate consecutive slots (e.g. 09:00 to 17:00 at 45-minute intervals with buffer times).
  - Edit existing slots and change availability toggles.
  - **Safe Deletion Enforcement:** Active confirmed slots are strictly guarded against accidental deletion.
- **Master Bookings Control Plane:** Search by attendee name, email, booking reference, or service title; filter by status and date; download records as CSV exports; and execute status transitions (Confirmed ➔ Completed ➔ Cancelled ➔ Re-activated).
- **User Directory:** View all registered users with their account roles and cumulative booking statistics.

### ⚡ Critical Booking & Concurrency Logic
1. **ACID Transaction Isolation:** Uses SQLite `BEGIN IMMEDIATE` transactions to prevent race conditions and guarantee that two users attempting to book the exact same slot concurrently receive a clean `HTTP 409 Conflict`.
2. **Atomic Availability Toggle:** Performs atomic database checks (`UPDATE appointment_slots SET is_available = 0 WHERE id = ? AND is_available = 1`). If `rowcount == 0`, the transaction safely rolls back.
3. **Past Date Prevention:** Validation on both client and server blocks creating or booking slots in the past.
4. **Smart Slot Re-opening:** When an upcoming appointment is cancelled by either the user or an administrator, the associated slot is automatically restored to `is_available = 1`.
5. **Ownership & Role Enforcement:** Only the appointment owner or an administrator can inspect, cancel, or modify a booking.

---

## 3. Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite 6, React Router DOM v6, Lucide React (SaaS Icons) |
| **Backend** | Python 3.13 / Flask 3.1, Flask-CORS, PyJWT, Werkzeug Security |
| **Database** | SQLite 3 with Foreign Key constraints & Indexing |
| **Styling** | Modern CSS3 Design System (Navy `#0f172a`, Royal Blue `#2563eb`, Slate `#f8fafc`) |
| **API Architecture** | RESTful JSON APIs with JWT Bearer Token Authorization |

---

## 4. Project Structure

```
smart-appointment-platform/
│
├── database/
│   └── schema.sql                 # SQL schema definitions & indices
│
├── backend/
│   ├── app/
│   │   ├── __init__.py            # Flask application factory, CORS, SPA static serving
│   │   ├── config.py              # Environment configuration & DB paths
│   │   ├── database.py            # SQLite connection helper & context managers
│   │   ├── middleware.py          # JWT authentication (@token_required, @admin_required)
│   │   ├── seed.py                # Database seeder (admin, users, slots, demo bookings)
│   │   └── routes/
│   │       ├── auth_routes.py     # Register, login, profile, password change
│   │       ├── slot_routes.py     # Slot CRUD, batch generation, availability filters
│   │       ├── appointment_routes.py # Booking, cancellation, user history, receipts
│   │       ├── admin_routes.py    # Admin stats, master bookings table, user directory
│   │       └── user_routes.py     # User dashboard metrics & next upcoming spotlight
│   ├── database/
│   │   ├── schema.sql             # Backend schema file
│   │   └── smart_appointments.db  # Generated SQLite database file
│   ├── requirements.txt           # Python backend dependencies
│   ├── run.py                     # Backend server entry point (Port 5000)
│   ├── test_api.py                # Automated unit tests
│   └── verify_workflow.py         # End-to-end 10-step workflow verification script
│
├── frontend/
│   ├── public/                    # Static assets & favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppLayout.jsx      # Core responsive layout wrapper
│   │   │   ├── Navbar.jsx         # Sticky header with breadcrumbs & user badge
│   │   │   ├── Sidebar.jsx        # Navy sidebar with role-aware navigation
│   │   │   └── ProtectedRoute.jsx # Route guards for auth & admin permissions
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Session state & localStorage persistence
│   │   │   └── ToastContext.jsx   # Global alert & toast notifications
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Sign-in page with 1-click demo login credentials
│   │   │   ├── Register.jsx       # User registration with role option
│   │   │   ├── UserDashboard.jsx  # Client dashboard metrics & quick book banner
│   │   │   ├── BookAppointment.jsx # Date selector, slot chips & booking modal
│   │   │   ├── MyAppointments.jsx # User booking history, filter tabs & cancellation
│   │   │   ├── AppointmentDetails.jsx # Detailed booking receipt with print view
│   │   │   ├── AdminDashboard.jsx # Executive stats, charts, & recent operations
│   │   │   ├── ManageSlots.jsx    # Slot CRUD, batch generator & deletion guards
│   │   │   ├── ManageBookings.jsx # Master booking table, status updater, CSV export
│   │   │   ├── AdminUsers.jsx     # User accounts directory with booking frequencies
│   │   │   └── Profile.jsx        # Profile management & password updates
│   │   ├── services/
│   │   │   └── api.js             # Unified REST client with JWT headers
│   │   ├── App.jsx                # Application routes configuration
│   │   ├── index.css              # Custom SaaS design system CSS
│   │   └── main.jsx               # React entry point
│   ├── package.json               # Frontend dependencies & scripts
│   └── vite.config.js             # Vite configuration with proxy to backend
│
├── .gitignore                     # Git ignore rules
└── README.md                      # Comprehensive project documentation
```

---

## 5. Database Architecture

### Entity Relationship Diagram

```
       +------------------+
       |      users       |
       +------------------+
       | id (PK)          |<---------+
       | name             |          |
       | email (UNIQUE)   |          |
       | password_hash    |          |
       | role             |          |
       | phone            |          |
       | created_at       |          |
       +------------------+          |
                 | 1                 |
                 |                   |
                 | creates           |
                 v 0..*              |
       +------------------+          |
       | appointment_slots|          |
       +------------------+          |
       | id (PK)          |<-----+   |
       | title            |      |   |
       | description      |      |   |
       | date             |      |   |
       | start_time       |      |   |
       | end_time         |      |   |
       | is_available     |      |   |
       | created_by (FK)  |      |   |
       +------------------+      |   |
                 | 1             |   |
                 |               |   |
                 | is booked in  |   |
                 v 0..1          |   |
       +------------------+      |   |
       |   appointments   |      |   |
       +------------------+      |   |
       | id (PK)          |      |   |
       | booking_reference|      |   |
       | user_id (FK) ----+------+---+
       | slot_id (FK) ----+------+
       | reason           |
       | notes            |
       | status           |
       | cancellation_rsn |
       | cancelled_by (FK)|
       | created_at       |
       +------------------+
```

### Table Definitions & Integrity Constraints

1. **`users` Table:**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `name`: TEXT NOT NULL
   - `email`: TEXT NOT NULL UNIQUE (NOCASE collation)
   - `password_hash`: TEXT NOT NULL (Securely hashed via Werkzeug)
   - `role`: TEXT NOT NULL CHECK(`role` IN ('user', 'admin')) DEFAULT 'user'
   - `phone`: TEXT
   - `created_at` / `updated_at`: Timestamps

2. **`appointment_slots` Table:**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `title`: TEXT NOT NULL DEFAULT 'General Consultation'
   - `description`: TEXT
   - `date`: TEXT NOT NULL (ISO `YYYY-MM-DD`)
   - `start_time`: TEXT NOT NULL (24h `HH:MM`)
   - `end_time`: TEXT NOT NULL (24h `HH:MM`)
   - `is_available`: INTEGER NOT NULL DEFAULT 1 CHECK(`is_available` IN (0, 1))
   - `created_by`: INTEGER REFERENCES `users(id)` ON DELETE SET NULL
   - `UNIQUE(date, start_time)`: Guarantees no duplicate overlapping slots at the database level.

3. **`appointments` Table:**
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `booking_reference`: TEXT NOT NULL UNIQUE (e.g. `SAP-20261118-XXXX`)
   - `user_id`: INTEGER NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
   - `slot_id`: INTEGER NOT NULL REFERENCES `appointment_slots(id)` ON DELETE RESTRICT
   - `reason`: TEXT NOT NULL
   - `notes`: TEXT
   - `status`: TEXT NOT NULL CHECK(`status` IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed'
   - `cancellation_reason`: TEXT
   - `cancelled_by`: INTEGER REFERENCES `users(id)`
   - `cancelled_at`: TEXT

---

## 6. REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account (`name`, `email`, `password`, `phone`, `role`) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and receive signed JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current session profile details |
| `PUT` | `/api/auth/profile` | Authenticated | Update full name and contact phone number |
| `PUT` | `/api/auth/change-password` | Authenticated | Verify current password and set new password |

### Slots (`/api/slots`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/slots` | Public | Fetch slots with filters (`date`, `available_only`, `include_past`) |
| `GET` | `/api/slots/<id>` | Public | Fetch detailed information for a single slot |
| `POST` | `/api/slots` | Admin | Create single slot or batch slots array |
| `PUT` | `/api/slots/<id>` | Admin | Update slot title, date, time window, or availability |
| `DELETE` | `/api/slots/<id>` | Admin | Delete slot (blocked if slot has active booking) |

### Appointments (`/api/appointments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/appointments` | Authenticated | Atomically book an available slot (`slot_id`, `reason`, `notes`) |
| `GET` | `/api/appointments/my` | Authenticated | Retrieve logged-in user's booking history |
| `GET` | `/api/appointments/<id>` | Authenticated | Retrieve full booking pass receipt (owner or admin only) |
| `POST` | `/api/appointments/<id>/cancel` | Authenticated | Cancel appointment and reopen future slot |

### User Analytics (`/api/user`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/user/stats` | Authenticated | Retrieve user metric counts, next upcoming visit, recent activity |

### Administrator Control (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin | Retrieve platform counts, status distribution, 7-day volume |
| `GET` | `/api/admin/bookings` | Admin | Master list of all bookings with search, date, & status filters |
| `PUT` | `/api/admin/bookings/<id>/status`| Admin | Transition booking status (`confirmed`, `completed`, `cancelled`) |
| `GET` | `/api/admin/users` | Admin | Directory of all users with booking statistics |

---

## 7. Installation and Execution Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node v24)
- npm 9+

### Option A: Standard Full-Stack Development Mode (Recommended)

#### 1. Start the Flask Backend Server
```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start backend server
python run.py
```
> The backend will start on **`http://localhost:5000`**, automatically initialize the SQLite database (`backend/database/smart_appointments.db`), and seed initial users and appointment slots.

#### 2. Start the Vite React Frontend
```bash
# In a new terminal window, navigate to frontend folder
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
> Open your browser at **`http://localhost:5173`**. Vite proxies all `/api/*` requests directly to `http://localhost:5000`.

---

### Option B: Unified Production Serving via Flask

The React application has already been compiled into `frontend/dist/`. Flask is configured to automatically serve the compiled frontend as a single-page application:

```bash
cd backend
python run.py
```
> Simply navigate to **`http://localhost:5000`** in your browser. The entire application runs out of the Flask server.

---

## 8. Test Credentials & Demo Accounts

For your assessment and live demonstration, the database includes pre-seeded demo accounts:

| Role | Email Address | Password | Name | Description |
|---|---|---|---|---|
| **Administrator** | `admin@smartapp.com` | `Admin@123` | System Administrator | Full access to Admin Dashboard, slot manager, bookings, and user directory. |
| **Standard User 1** | `user@smartapp.com` | `User@123` | Alex Morgan | Client account with pre-seeded upcoming and completed appointments. |
| **Standard User 2** | `sarah@smartapp.com` | `User@123` | Sarah Connor | Second user account for concurrency and double-booking testing. |

> **Tip:** On the Login page, click the quick-fill buttons (**"Admin"**, **"Alex (User)"**, or **"Sarah (User)"**) to populate credentials with a single click!

