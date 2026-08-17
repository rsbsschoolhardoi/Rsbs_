# Task: Implement Early Leave System

## Plan
- [x] Database Schema & Migrations
  - [x] Create `early_leaves` table
  - [x] Add early leave config columns to `attendance_config`
  - [x] Apply RLS policies
- [x] TypeScript Type Definitions
  - [x] Add `EarlyLeave` interface to `src/types/index.ts`
  - [x] Update `AttendanceConfig` interface in `src/types/index.ts`
- [x] API Module Integration
  - [x] Add `getEarlyLeavesByDate` to `src/db/api.ts`
  - [x] Add `createEarlyLeave` to `src/db/api.ts`
  - [x] Add `updateEarlyLeave` to `src/db/api.ts`
  - [x] Add `deleteEarlyLeave` to `src/db/api.ts`
- [x] Admin Settings Panel
  - [x] Update `src/pages/admin/AttendanceSettings.tsx` with Early Leave time window config
- [x] Teacher Panel Implementation
  - [x] Update `src/pages/teacher/MarkAttendance.tsx` with Early Leave tab
  - [x] Implement modal and confirmation dialog for Early Leave
  - [x] Filter only "Present" students for Early Leave eligibility
  - [x] Implement time-based access control for teachers
- [x] Real-Time Sync & Status Display
  - [x] Update Admin attendance views to show Early Leave status
  - [x] Update Student attendance dashboard to show Early Leave status
  - [x] Update Parent attendance view to show Early Leave status
- [x] Validation & Testing
  - [x] Run `npm run lint` and fix issues
  - [x] Verify functionality across all roles

## Notes
- Teachers can only mark Early Leave during the allowed window and cannot edit/delete afterwards.
- Admins have full CRUD.
- Only "Present" students are eligible for Early Leave.
