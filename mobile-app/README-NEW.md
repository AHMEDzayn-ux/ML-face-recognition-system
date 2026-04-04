# Smart Attendance System

Complete face recognition attendance management system with unified PWA architecture.

## 📁 Project Structure

```
smart-attendance-system/
├── mobile-app-backup/          # Original React Native app (archived)
├── pwa-dashboard/              # Next.js PWA (main app)
│   ├── Camera module
│   ├── Dashboard
│   ├── Student management
│   └── Analytics
├── backend-placeholder/        # Python FastAPI backend (to be added)
└── docs/                       # Documentation
    └── plan.md                 # Implementation plan
```

## 🚀 Getting Started

### PWA Dashboard (Main App)
```bash
cd pwa-dashboard
npm install
npm run dev
```

### Mobile App Backup
The original React Native app is preserved in `mobile-app-backup/` for reference.

## 🎯 Vision

Single Progressive Web App with:
- 📸 Camera for attendance marking (mobile/tablet)
- 📊 Full dashboard (laptop/tablet/mobile)
- 👥 Student management
- 📈 Analytics & reports
- 🔄 Real-time updates
- 📴 Offline support

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind + PWA
- **Backend:** FastAPI + face_recognition
- **Database:** Supabase (PostgreSQL + Storage)
- **Deployment:** Vercel (PWA) + Railway (Backend)

## 📋 Features

- ✅ Browser camera access (Android/Desktop)
- ✅ Responsive design (mobile-first)
- ✅ Installable on Android
- ✅ Offline support
- ✅ Real-time sync
- ✅ Role-based access
- ✅ Analytics & exports

---

Created: 2026-04-04
