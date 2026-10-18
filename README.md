# 🚀 MessConnect — Smart Mess Discovery & Subscription Platform

> **"Find. Subscribe. Eat. Simplify."**  
> A mobile-first Node.js + React.js startup prototype replicating a native Android application architecture with local offline-first storage, permissions management, in-app notifications, and complete workflows for **Customers**, **Mess Owners**, and **Admins**.

---

## 📱 Features & Android Architecture Equivalency

| Android Concept | MessConnect Prototype Implementation | Purpose |
| :--- | :--- | :--- |
| **Jetpack Compose UI** | React 19 + Tailwind CSS + Lucide Icons | Fluid, responsive mobile-first UI with Material 3 design tokens. |
| **Mobile Bezel / APK** | Interactive Smartphone Frame Simulator | Test like a real phone (Status bar, 5G, Battery, Notch) or expand to fullscreen. |
| **Room Database** | IndexedDB (`storage.js`) + Local JSON DB | Stores messes, menus, subscriptions, reviews, complaints, and trials offline. |
| **DataStore Preferences** | LocalStorage Key-Value Engine | Saves active role, notification channels, location, and dark mode preferences. |
| **Offline-First & Sync** | Service API with Fallback & Network Monitor | Works 100% offline. Shows "Offline Mode" banner; syncs when reconnected. |
| **Runtime Permissions** | Reusable `PermissionManager` Modal | Explains *why* before requesting Geolocation or Web Notifications. |
| **Location Services** | Dual Location Selector (GPS & Manual) | Method 1: Manual area/city/pincode. Method 2: Device GPS coordinates. |
| **Notification Channels** | Web Notifications API + In-App Center | 6 Channels: *General, Subscriptions, Payments, Meals, Offers, Trials*. |
| **Mock Payment Gateway** | Realistic Indian Checkout Modal | UPI (GPay/PhonePe/Paytm), Cards, NetBanking with zero storage of credentials. |
| **Food Demand Forecasting** | Section 21 Dynamic Calculation Engine | Active plans + trials - paused leaves + **5% safety buffer** for mess owners. |
| **Anti-Proxy Digital Meal Pass** | Dynamic QR + 4-Digit Rotating PIN | Prevents proxy dining and duplicate plates; real-time entrance status. |
| **Dining Entrance Scanner** | Camera Simulator + PIN Keypad + Audio | Web Audio entrance chime (`ding-ding`) & duplicate alert buzzer (`buzz-buzz`). |
| **Campus FlexiPass™ (Phase 3)** | Multi-Mess Unified Thali Pool | Dine across 6–10 partner kitchens with flexible meal credits. |
| **Roommate Mess Pods (Phase 3)** | Squad Pooling & Vacation Sync | Flatmate dining status, synchronized holiday pause, and buddy meal gifting. |
| **Demo Studio & Manual Storage**| Section 6 Developer Console | Add/Edit/Delete messes locally, reset seed data, export JSON backup. |

---

## 👥 Three Complete User Roles

### 🎓 1. Customer (`Rahul Sharma - MIT Campus, Pune`)
* **Discover**: Search by mess name, area, pincode, cuisine, and student campus.
* **Filter & Sort**: Pure Veg, Budget Friendly (≤₹2800), Top Rated (★ 4.5+), Has Free Trial.
* **Mess Details Screen**:
  * **Overview**: Description, timings (Breakfast, Lunch, Dinner), facilities, and map coordinates.
  * **Menu**: Live Today's menu + 7-day weekly schedule.
  * **Plans**: All Meals, Lunch + Dinner, Lunch Only, Dinner Only.
  * **Reviews**: Multi-criteria review breakdown (*Food Quality, Cleanliness, Quantity, Value for Money, Service*) with owner responses.
* **Trial Meal Booking**: Book trial breakfast, lunch, or dinner with duplicate trial abuse protection.
* **Subscriptions**: Subscribe, view days tracking (*Active, Paused, Remaining*).
* **Pause / Resume**: Select pause leave dates and reason; validity is automatically extended!
* **Favorites**: Save favorite messes locally with 1-tap heart toggle.

### 👨‍🍳 2. Mess Owner (`Suresh Patil - Annapurna Deluxe Mess`)
* **Overview KPI**: Active Subscribers (82), Today's Meals (201), Revenue (₹2.46L), Pending Trials.
* **Food Demand Forecast (Section 21)**:
  * Breakfast: 54
  * Lunch: 76
  * Dinner: 71
  * Estimated Total: 201 meals
  * Safety Buffer (+5%): +11 meals
  * Recommended Production: 212 meals
  * Disclaimer: *"This is an estimate, not a guarantee."*
* **Student Subscribers Roster**: Filter active vs paused students, view return dates and call numbers.
* **Trial Requests Manager**: Approve or decline student trial visits with instant notification.
* **Live Menu Editor**: Update breakfast, lunch, and dinner in real-time.
* **Broadcast Offers**: Send discount codes to all subscribed students.

### 🛡️ 3. Platform Admin (`Pooja Verma - Operations & Quality`)
* **Platform Metrics**: Total messes, active subscriptions, student users, monthly volume.
* **Mess Verification**: Approve, reject, or verify mess listings with instant status change.
* **Featured Listings**: Promote high-quality messes to the featured carousel.
* **Complaints Management**: Review student hygiene complaints, add resolution notes, and resolve.
* **Review Moderation**: Remove flagged or abusive reviews.

---

## 🛠️ Quick Start

### 1. Start Both Backend & Frontend Concurrently:
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000](http://localhost:5000)
* **Healthcheck:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 2. Standalone Server (Production):
```bash
npm start
```

---

## 📂 Project Structure

```text
MessConnect Prototype/
├── server/                          # Express.js REST API Backend
│   ├── db/
│   │   ├── seedData.js              # 10 realistic messes, menus, plans, users, reviews
│   │   └── database.js              # In-memory & JSON file persistent engine
│   ├── routes/
│   │   ├── auth.js                  # User authentication & role switching
│   │   ├── messes.js                # Search, filter, details, menus, favorites
│   │   ├── subscriptions.js         # Subscribe, pause, resume, cancel
│   │   ├── trials.js                # Book trial, owner approve/reject
│   │   ├── payments.js              # Mock payment session & receipts
│   │   ├── notifications.js         # Channels, unread count, preferences
│   │   ├── owner.js                 # Demand forecast, subscribers, offers
│   │   ├── admin.js                 # Mess verification, complaints, analytics
│   │   └── dev.js                   # JSON export/import, factory reset
│   └── server.js                    # Express app entry point
│
├── client/                          # React + Vite Mobile-First Prototype
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # MobileShell, ToastContainer
│   │   │   ├── permissions/         # PermissionRationaleModal, LocationSelectorModal
│   │   │   ├── payments/            # MockPaymentModal
│   │   │   ├── customer/            # MessCard, MessDetailsModal, TrialBookingModal, PauseSubscriptionModal
│   │   │   ├── owner/               # DemandForecastCard, SubscribersManager, TrialRequestsManager
│   │   │   ├── admin/               # AdminDashboard
│   │   │   └── dev/                 # DevConsoleModal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Current persona & 1-click role switcher
│   │   │   ├── AppContext.jsx       # Messes state, offline simulator, favorites
│   │   │   └── NotificationContext.jsx # Web notifications, local reminders
│   │   ├── services/
│   │   │   ├── api.js               # Resilient API service with offline fallback
│   │   │   ├── storage.js           # Room (IndexedDB) & DataStore (LocalStorage) replica
│   │   │   └── notifications.js     # Web Notifications & simulated meal reminders
│   │   ├── pages/
│   │   │   ├── CustomerView.jsx     # 5-tab Customer Experience
│   │   │   ├── OwnerView.jsx        # Mess Owner Dashboard & Forecast
│   │   │   └── AdminView.jsx        # SuperAdmin Operations
│   │   ├── index.css                # Tailwind CSS v4 & custom mobile scrollbars
│   │   └── App.jsx                  # Main Application Component
│   ├── vite.config.js
│   └── package.json
└── package.json                     # Root orchestrator (concurrent dev scripts)
```

---

## 🧪 Testing the Prototype

1. **Role Switching**:
   * Use the floating pill bar at the top of the mobile device to jump instantly between **Customer**, **Mess Owner**, and **Admin**.
2. **Offline-First Test**:
   * Click the **Offline Mode** toggle button on the top toolbar.
   * Notice the amber banner: *"Offline Mode • Showing locally cached messes (Room DB)"*.
   * Search, filter, and view menus continue working smoothly from IndexedDB cache!
3. **Simulate Local Reminders (Section 12)**:
   * Click **Dev Studio** on the toolbar -> Go to **Reminders** tab.
   * Click *"Simulate 8:00 AM Breakfast Alert"* or *"Simulate 3-Day Subscription Expiry Alert"*.
   * Watch the toast notification trigger and appear in the notifications inbox.
4. **Demand Forecasting (Section 21)**:
   * Switch to **Mess Owner** role.
   * View the forecast breakdown (*Breakfast, Lunch, Dinner*) with the **+5% safety buffer** and the required disclaimer: *"This is an estimate, not a guarantee."*
5. **Subscriptions & Pause Meals (Section 17)**:
   * As Customer, subscribe to a mess.
   * Go to **Passes** tab -> Click **Pause Meals**.
   * Pick dates -> confirm -> notice your remaining validity increases automatically!
6. **Anti-Proxy Digital Pass & Entrance Scanner (Feature 1)**:
   * As Customer on **Home** or **Passes** tab, tap **Show Pass**.
   * View the dynamic QR code, 4-digit code (`4821`), and anti-screenshot moving security hash.
   * Switch to **Mess Owner** role -> go to **Entrance Scanner 📲** tab.
   * Click **Rahul Sharma (4821)**: hear the pleasant green entrance chime (`ding-ding`) and see the plate authorized!
   * Click **Sneha Kulkarni (1984)**: hear the warning buzzer (`buzz-buzz`) blocking duplicate dining!
   * Click **Amit Deshmukh (5501)**: alerts that student is currently on vacation pause!
7. **Campus FlexiPass™ Multi-Mess (Phase 3)**:
   * As Customer, tap the **Campus FlexiPass** banner.
   * View the 30-meal pool across 6 partner messes; choose a mess to dine and generate a pass!
8. **Roommate Mess Pods & Group Pooling (Phase 3)**:
   * As Customer, tap **Flat 402 Pod**.
   * View squad members and live dining status.
   * Tap **Set Vacation** under Synchronized Group Pause: pauses meal passes for all flatmates at once!







http://localhost:5000/admin/