# Requirements Document

## 1. Application Overview

- **Application Name:** RSBS School ERP - Student Portal Account Switcher UI Polish + Saved Account Authentication Flow Fix + Fee Registration & Receipt Lifecycle Enhancement + Premium Desktop Dashboard Analytics Upgrade
- **Description:** Enhancement to existing RSBS School ERP Student Portal and Admin Panel. Updates include: (1) Premium native mobile account switcher UI for Account Picker and Account Switcher, displaying individual rounded cards with student profile photo, full name as primary text, and Login ID as secondary text; (2) Fixed saved-account authentication flow ensuring trusted saved accounts restore directly to Student Dashboard without re-authentication, while preserving first-login flow (Login ID + Password → Verify PIN → Dashboard) and explicit Logout revocation; (3) Production-level Fee Management, Fee Registration, Ledger, and Receipt lifecycle fix ensuring receipt immutability, automatic fee period identification, paid period removal from registration UI, zero-duplicate registration, exact ledger coverage, permanent admin/school records, separate student and parent visibility with independent extend controls, and consistency across all modules; (4) Premium Desktop Dashboard Analytics Upgrade transforming existing Admin Panel Dashboard into modern, professional School Analytics & Monitoring Dashboard with live-stat cards, school-wide analytics charts, recent activity feed, important information section, and continue-where-you-left-off functionality, strictly for desktop view only while preserving existing mobile dashboard unchanged. All changes maintain existing authentication architecture, Supabase Auth, Edge Functions, session management, Master Fees structure, RSBS design language, sidebar, header, navigation, and other functionality. Application location: /workspace/app-aho9bv0iqbr5. Technology stack: React + Vite + TypeScript + shadcn/ui + Tailwind CSS + Supabase Auth + Edge Functions.

---

## 2. Users and Use Cases

### 2.1 Target Users

- **Students:** View premium native mobile account switcher UI with individual rounded cards showing profile photo, full name, and Login ID. Select saved trusted account and restore directly to Student Dashboard without re-authentication. Complete first-login flow with Login ID + Password → Verify PIN. Explicitly logout to revoke trusted session. View and download own fee receipts within student visibility period in Student Panel.
- **Parents:** View and download child's fee receipts within parent visibility period in Parent Panel if parent account is registered and linked.
- **Admins:** Register fee payments with automatic fee period identification, view paid periods removed from registration UI, prevent duplicate registration, view complete Student Fee Ledger with exact coverage, download original receipt PDF, manage separate student and parent visibility with independent extend controls, maintain permanent admin/school payment and receipt records. Access premium desktop dashboard with live school-wide analytics, monitoring widgets, recent activity feed, important information alerts, and quick resume links to recent work.

### 2.2 Core Use Cases

- **Student opens Account Picker:** See all saved accounts as individual premium rounded cards, each displaying profile photo, full name as primary text, Login ID as secondary text.
- **Student opens Account Switcher:** Long-press profile avatar, see bottom sheet with all saved accounts as individual premium rounded cards.
- **Student taps saved trusted account:** See selected/pressed state immediately, see short smooth loading/restoring animation, restore account, open Student Dashboard directly without password or PIN prompt.
- **Student performs first login:** Enter Login ID + Password, verify PIN, reach Student Dashboard, choose Save & Exit to preserve trusted session.
- **Student chooses Save & Exit:** Account saved on device with trusted session state preserved.
- **Student explicitly logs out:** Trusted session revoked for that account, next login requires full Login ID + Password → Verify PIN flow.
- **Student switches between multiple saved accounts:** Each account maintains independent session state, authentication state, profile photo, name, and Login ID.
- **App startup/refresh/reload:** Valid saved session restored automatically, show Restoring your session message only during genuine session restoration, open Student Dashboard if valid.
- **Admin registers fee payment:** Select student, academic session, fee type (Core/Extra/Other), payment method, amount. System automatically identifies exact fee period (monthly, annual, combined months, session-based). System computes already-paid periods and removes them from selectable options. If Full Year paid, show clear message and remove month selection. Combined-month options are continuous and non-overlapping; only next valid contiguous range offered. System checks if requested period already registered. If duplicate detected, block with clean message. If valid, create one permanent payment record, generate one permanent receipt with unique receipt number, deliver receipt to Student Panel and Parent Panel (if parent account exists) with separate visibility windows, set student visibility expiry and parent visibility expiry independently.
- **Admin views Student Fee Ledger:** See all registered payments for selected student with exact fee period (monthly, annual, combined months, session-based), payment date, method, amount, unique receipt number. Each payment has Download PDF button to download original receipt PDF.
- **Admin downloads original receipt PDF:** Select any payment record in Ledger, click Download PDF, system downloads original receipt PDF without regenerating or creating new payment.
- **Admin extends student visibility:** Select receipt, click Extend Student, enter number of days, system updates student visibility expiry date only, receipt becomes visible again in Student Panel.
- **Admin extends parent visibility:** Select receipt, click Extend Parent, enter number of days, system updates parent visibility expiry date only, receipt becomes visible again in Parent Panel.
- **Student views receipts in Student Panel:** See all receipts within student visibility period, download any visible receipt.
- **Parent views receipts in Parent Panel:** See all child's receipts within parent visibility period (if parent account registered and linked), download any visible receipt.
- **System auto-expires student visibility:** After student visibility period expires, receipt automatically disappears from Student Panel, but remains in Admin Ledger with full download access.
- **System auto-expires parent visibility:** After parent visibility period expires, receipt automatically disappears from Parent Panel, but remains in Admin Ledger with full download access.
- **Admin opens Desktop Dashboard:** See premium analytics dashboard with live-stat cards (Total Students, Today's Attendance, Fees Collected, Fees Pending, Admissions/Important Pending Items), school-wide analytics charts (Overall Student Attendance, Fee Collection, Admissions, Academic Performance, Student Strength/Enrollment) with period selector (Today, 7 Days, 1 Month, 3 Months, 1 Year, default Today), recent activity feed, important information section, and continue-where-you-left-off section.
- **Admin selects period in analytics chart:** Click period selector (Today, 7 Days, 1 Month, 3 Months, 1 Year), chart data updates dynamically to reflect selected period.
- **Admin views recent activity:** See clean list of recent actions (profile updated, student added, fee payment, attendance submitted, notice published, certificate generated, admission updated) with entity name and relative time.
- **Admin views important information:** See compact section with genuinely important items (pending fees, pending admissions, unsubmitted attendance, upcoming events, pending queries, system alerts).
- **Admin resumes recent work:** Click resume link in continue-where-you-left-off section, navigate directly to last activity context.
- **Admin opens Mobile Dashboard:** See existing mobile dashboard unchanged, no new analytics or monitoring widgets.

---

## 3. Page Structure and Core Features

### 3.1 Overall Page Hierarchy

```
RSBS School ERP
├── Student Portal (Enhanced)
│   ├── Account Picker (Enhanced UI)
│   ├── Account Switcher Bottom Sheet (Enhanced UI)
│   ├── First Login Flow (Unchanged)
│   │   ├── Login Screen (Login ID + Password)
│   │   ├── PIN Verification Screen
│   │   └── Student Dashboard
│   ├── Saved Account Restoration Flow (Enhanced)
│   │   ├── Account Picker/Switcher
│   │   ├── Loading/Restoring Animation
│   │   └── Student Dashboard (Direct)
│   ├── Session Restoration Flow (Enhanced)
│   │   ├── App Startup/Refresh/Reload
│   │   ├── Restoring Session Message
│   │   └── Student Dashboard (if valid)
│   ├── Logout Flow (Unchanged)
│   ├── Fee Receipts View (Enhanced)
│   │   ├── Receipt List (within student visibility period)
│   │   └── Download Receipt Action
│   └── Other Student Portal Pages (Unchanged)
├── Parent Portal (Enhanced)
│   ├── Child Fee Receipts View (Enhanced)
│   │   ├── Receipt List (within parent visibility period)
│   │   └── Download Receipt Action
│   └── Other Parent Portal Pages (Unchanged)
├── Admin Panel (Enhanced)
│   ├── Desktop Dashboard (Premium Analytics Upgrade)
│   │   ├── School Overview Live-Stat Cards
│   │   ├── Main Analytics Section
│   │   │   ├── Overall Student Attendance Chart
│   │   │   ├── Fee Collection Chart
│   │   │   ├── Admissions Chart
│   │   │   ├── Academic Performance Chart
│   │   │   └── Student Strength/Enrollment Chart
│   │   ├── Recent Activity Feed
│   │   ├── Important Information Section
│   │   └── Continue Where You Left Off Section
│   ├── Mobile Dashboard (Unchanged)
│   ├── Fee Registration (Enhanced)
│   │   ├── Student Selection
│   │   ├── Academic Session Selection
│   │   ├── Fee Type Selection (Core/Extra/Other)
│   │   ├── Fee Period Selection (with automatic identification and paid period removal)
│   │   ├── Payment Method & Amount Input
│   │   ├── Duplicate Prevention Check
│   │   └── Submit Payment
│   ├── Student Fee Ledger (Enhanced)
│   │   ├── Payment Records List
│   │   │   ├── Exact Fee Period Display
│   │   │   ├── Payment Date, Method, Amount
│   │   │   ├── Unique Receipt Number
│   │   │   └── Download PDF Action (per payment)
│   │   └── Receipt Visibility Management
│   │       ├── Extend Student Visibility
│   │       └── Extend Parent Visibility
│   ├── Receipt History (Enhanced)
│   │   ├── All Receipts List
│   │   ├── Student Visibility Status
│   │   ├── Parent Visibility Status
│   │   ├── Extend Student Control
│   │   └── Extend Parent Control
│   ├── Master Fees (Unchanged)
│   ├── Students Tab (Enhanced)
│   └── Other Admin Panel Pages (Unchanged)
└── Other Panels (Unchanged)
```

### 3.2 Account Picker (Enhanced UI)

#### 3.2.1 Premium Rounded Card Design

- **Individual Cards:** Each saved account displayed as individual premium rounded card.
- **Profile Photo:** Display student's actual profile photo from authenticated student record.
- **Primary Text:** Display student's full name as primary text (large, prominent font).
- **Secondary Text:** Display student's Login ID underneath full name in small, subtle secondary text.
- **Example Layout:**
  ```
  [Profile Photo]  Azad
                   RSBS7991
  ```
- **Prohibited Information:** Must NOT display Verification ID, Verification code, Password, Login ID: label, or any other unnecessary identifier.
- **Card Styling:** Premium rounded corners, subtle highlighted blue border for selected account, soft elevation/shadow, clean spacing between cards.
- **Touch Area:** Proper mobile touch area (minimum 48px height).
- **Animation:** Smooth pressed/selected animation on tap.
- **Design Language:** Elegant, professional, premium native mobile appearance.
- **Data Consistency:** Profile photo, name, and Login ID always belong to selected account from authenticated student record.

#### 3.2.2 Account Selection Interaction

- **Tap Behavior:** On tap, immediately show selected/pressed state.
- **Loading Animation:** Show short smooth circular loading/restoring animation if required.
- **Direct Navigation:** Restore account and open Student Dashboard directly without password or PIN prompt.
- **No Re-authentication:** Do not ask for password, PIN, confirm password, or any login credentials for trusted saved accounts.

### 3.3 Account Switcher Bottom Sheet (Enhanced UI)

#### 3.3.1 Premium Rounded Card Design

- **Individual Cards:** Each saved account displayed as individual premium rounded card.
- **Profile Photo:** Display student's actual profile photo from authenticated student record.
- **Primary Text:** Display student's full name as primary text.
- **Secondary Text:** Display student's Login ID underneath full name in small, subtle secondary text.
- **Example Layout:** Same as Account Picker.
- **Prohibited Information:** Same as Account Picker.
- **Card Styling:** Same premium design as Account Picker.
- **Touch Area:** Same as Account Picker.
- **Animation:** Same as Account Picker.
- **Design Language:** Same as Account Picker.
- **Data Consistency:** Same as Account Picker.

#### 3.3.2 Account Selection Interaction

- **Tap Behavior:** Same as Account Picker.
- **Loading Animation:** Same as Account Picker.
- **Direct Navigation:** Same as Account Picker.
- **No Re-authentication:** Same as Account Picker.

### 3.4 First Login Flow (Unchanged)

#### 3.4.1 Login Screen

- **Input Fields:** Login ID + Password.
- **Submit:** Proceed to PIN Verification Screen.

#### 3.4.2 PIN Verification Screen

- **Input Field:** Verify PIN.
- **Submit:** Proceed to Student Dashboard.

#### 3.4.3 Save & Exit

- **Action:** Securely preserve trusted saved-account/session state.
- **Result:** Account remains saved on device with trusted session.

### 3.5 Saved Account Restoration Flow (Enhanced)

#### 3.5.1 Account Selection

- **Trigger:** Student taps saved account in Account Picker or Account Switcher.
- **Immediate Feedback:** Show selected/pressed state immediately.

#### 3.5.2 Loading/Restoring Animation

- **Display:** Show short smooth circular loading/restoring animation.
- **Duration:** Brief, non-blocking.

#### 3.5.3 Direct Dashboard Navigation

- **Action:** Restore account session.
- **Navigation:** Open Student Dashboard directly.
- **No Re-authentication:** Skip password, PIN, confirm password, or any login credential prompts.
- **Removed Screen:** Completely skip current Confirm your password screen that appears after selecting trusted saved account.

### 3.6 Session Restoration Flow (Enhanced)

#### 3.6.1 Trigger Conditions

- **App Startup:** Actual app startup.
- **Refresh:** Browser refresh.
- **WebView Reload:** WebView reload.
- **Unexpected Navigation:** Unexpected navigation events.

#### 3.6.2 Session Validation

- **Check:** Validate saved session state.
- **Valid Session:** Restore account and open Student Dashboard.
- **Invalid Session:** Redirect to Login Screen.

#### 3.6.3 Restoring Session Message

- **Display Condition:** Show Restoring your session message only during genuine session restoration (app startup, refresh, reload).
- **Not Displayed:** Do not show during normal account selection from Account Picker or Account Switcher.

### 3.7 Logout Flow (Unchanged)

#### 3.7.1 Explicit Logout

- **Action:** Student explicitly logs out.
- **Result:** Revoke trusted session for that account.
- **Next Login:** Require full Login ID + Password → Verify PIN → Student Dashboard flow.

### 3.8 Multiple Accounts Management (Enhanced)

#### 3.8.1 Independent Session State

- **Per Account:** Each saved account maintains independent session state.
- **Authentication State:** Each account maintains independent authentication state.
- **Profile Data:** Each account maintains independent profile photo, student name, and Login ID.

#### 3.8.2 Account Switching

- **No Data Mixing:** Switching between saved accounts must never mix data.
- **No Invalidation:** Switching must never invalidate another account's session.

### 3.9 Implementation Approach (Enhanced)

#### 3.9.1 Routing and State Logic Fix

- **No CSS Hiding:** Do not simply hide auth screens with CSS.
- **Fix Underlying Logic:** Fix routing, session persistence, and authentication state logic.
- **Integration:** Integrate with existing Login, PIN, Save & Exit, Logout, account picker, and session architecture.
- **No Second System:** Do not create a second authentication system.

#### 3.9.2 Preservation of Existing Functionality

- **Working Features:** Preserve all existing working functionality.
- **Premium UI:** Preserve current premium mobile UI.
- **Supabase Auth:** Maintain existing Supabase Auth integration.
- **Edge Functions:** Maintain existing Edge Functions for trusted-device saved-account management.

### 3.10 Fee Registration (Enhanced)

#### 3.10.1 Student & Academic Session Selection

- **Student Selection:** Admin selects target student.
- **Academic Session Selection:** Admin selects academic session/year.

#### 3.10.2 Fee Type Selection

- **Fee Types:** Admin selects fee type: Core Fees, Extra Fees, or Other Fees.
- **Master Fees Preservation:** Existing Master Fees structure and concepts remain unchanged.

#### 3.10.3 Fee Period Selection with Automatic Identification and Paid Period Removal

- **Automatic Period Identification:** System automatically derives and displays exact fee period coverage:
  + Monthly (e.g., April 2026)
  + Annual (e.g., Academic Year 2026-2027)
  + Combined months (e.g., April-June 2026)
  + Session-based
- **Paid Period Computation:** System computes already-paid periods for selected student, academic session, and fee type.
- **UI-Level Prevention:** Paid periods are removed from selectable options in registration UI.
- **Full Year Paid Message:** If Full Year is paid, show clear message and remove month selection entirely.
- **Combined-Month Options:** Combined-month options must be continuous and non-overlapping. Only next valid contiguous range may be offered.
- **Example:** If April 2026 paid, April 2026 removed from selectable options. If April-May 2026 paid together, both April and May removed individually.
- **Selection Restriction:** Paid periods cannot be selected for new fee registration.

#### 3.10.4 Payment Method & Amount Input

- **Payment Method:** Admin selects payment method.
- **Amount:** Admin enters payment amount.

#### 3.10.5 Duplicate Prevention Check

- **Duplicate Check Key:** Student + fee type + academic session + actual fee period.
- **Backend Validation:** Before submission, system checks if requested period already registered.
- **Duplicate Detected:** If duplicate detected, block submission with clean message.
- **UI as Primary Layer:** UI-level paid period removal is primary prevention layer. Backend validation is safety net.

#### 3.10.6 Submit Payment

- **Validation:** System validates all inputs and checks for duplicates.
- **Payment Record Creation:** If valid, create one permanent payment record in database.
- **Receipt Generation:** Generate one permanent receipt with unique receipt number.
- **Receipt Immutability:** One successful payment produces one permanent receipt. Receipt regeneration is disabled.
- **Receipt Delivery:** Automatically deliver receipt to Student Panel with student visibility window. If student has registered parent account, deliver receipt to Parent Panel with separate parent visibility window.
- **Separate Visibility Windows:** Student visibility and parent visibility are independent. Each has separate expiry date.
- **Visibility Expiry:** Set student visibility expiry and parent visibility expiry independently based on configured duration.

### 3.11 Student Fee Ledger (Enhanced)

#### 3.11.1 Payment Records List

- **Display All Payments:** Show all registered payments for selected student.
- **Exact Fee Period:** Each payment clearly shows exact fee period:
  + Monthly (e.g., April 2026)
  + Annual (e.g., Academic Year 2026-2027)
  + Combined months (e.g., April-June 2026)
  + Session-based
- **Payment Date:** Display payment registration date.
- **Payment Method:** Display payment method used.
- **Amount:** Display payment amount.
- **Unique Receipt Number:** Display unique receipt number.
- **Download PDF Action:** Each payment record has Download PDF button.

#### 3.11.2 Download Original Receipt PDF

- **Action:** Admin clicks Download PDF for any payment record.
- **Behavior:** System downloads original receipt PDF without regenerating or creating new payment.
- **No Duplicate Creation:** Downloading receipt does NOT create new payment record or duplicate receipt number.

#### 3.11.3 Receipt Visibility Management

- **View Visibility Status:** Admin can view current student visibility status and parent visibility status for each receipt.
- **Extend Student Visibility:** Admin can select receipt, click Extend Student, enter number of days, system updates student visibility expiry date only.
- **Extend Parent Visibility:** Admin can select receipt, click Extend Parent, enter number of days, system updates parent visibility expiry date only.
- **Independent Controls:** Extending student visibility does not affect parent visibility, and vice versa.
- **Visibility Restoration:** Expired receipt becomes visible again in corresponding panel after Admin extends visibility.

### 3.12 Receipt History (Enhanced)

#### 3.12.1 All Receipts List

- **Display All Receipts:** Show all receipts for all students.
- **Student Visibility Status:** Display current student visibility status (visible or expired).
- **Parent Visibility Status:** Display current parent visibility status (visible or expired).

#### 3.12.2 Extend Controls

- **Extend Student Control:** Admin can extend student visibility for any receipt.
- **Extend Parent Control:** Admin can extend parent visibility for any receipt.
- **Independent Operation:** Each control operates independently.

### 3.13 Student Panel - Fee Receipts View (Enhanced)

#### 3.13.1 Receipt List

- **Display Visible Receipts:** Show all receipts within student visibility period.
- **Receipt Information:** Each receipt shows exact fee period, payment date, amount, receipt number.
- **Auto-Expiry:** After student visibility period expires, receipt automatically disappears from list.
- **Auto-Appear:** New receipts automatically appear when generated.

#### 3.13.2 Download Receipt Action

- **Action:** Student clicks Download button for any visible receipt.
- **Behavior:** System downloads receipt PDF.

### 3.14 Parent Panel - Child Fee Receipts View (Enhanced)

#### 3.14.1 Receipt List

- **Display Visible Receipts:** Show all child's receipts within parent visibility period.
- **Conditional Display:** Only available if parent account is registered and linked to student.
- **Receipt Information:** Each receipt shows exact fee period, payment date, amount, receipt number.
- **Auto-Expiry:** After parent visibility period expires, receipt automatically disappears from list.
- **Auto-Appear:** New receipts automatically appear when generated.

#### 3.14.2 Download Receipt Action

- **Action:** Parent clicks Download button for any visible receipt.
- **Behavior:** System downloads receipt PDF.

### 3.15 Desktop Dashboard - Premium Analytics Upgrade (New)

#### 3.15.1 School Overview Live-Stat Cards

- **Total Students:** Display current total number of enrolled students.
- **Today's Attendance:** Display today's overall attendance percentage.
- **Fees Collected:** Display total fees collected (current academic session or configurable period).
- **Fees Pending:** Display total fees pending (current academic session or configurable period).
- **Admissions / Important Pending Items:** Display count of pending admissions or other important pending items.
- **Card Design:** Compact, premium, minimal, elegant cards with clear label, large number, and subtle icon.
- **Data Source:** Real-time data from Supabase database.
- **Update Frequency:** Live or near-live updates.

#### 3.15.2 Main Analytics Section

- **Overall Student Attendance Chart:** Display school-wide attendance trend over selected period.
- **Fee Collection Chart:** Display fee collection trend over selected period.
- **Admissions Chart:** Display admissions trend over selected period.
- **Academic Performance Chart:** Display school-wide academic performance trend over selected period.
- **Student Strength / Enrollment Chart:** Display student enrollment trend over selected period.
- **Period Selector:** Each chart has period selector with options: Today, 7 Days, 1 Month, 3 Months, 1 Year. Default period is Today.
- **Dynamic Update:** Chart data updates dynamically when period is changed.
- **Chart Design:** Beautiful, professional, school-wide charts that are not overwhelming. Clean lines, restrained colors, readable labels, subtle grid.
- **Data Source:** Real data from Supabase database aggregated by selected period.
- **Chart Type:** Line charts, bar charts, or area charts as appropriate for data type.

#### 3.15.3 Recent Activity Feed

- **Activity List:** Display clean list of recent actions performed by administrators or system.
- **Activity Types:** Profile updated, student added, fee payment registered, attendance submitted, notice published, certificate generated, admission updated, etc.
- **Activity Details:** Each activity shows entity name (student name, fee type, notice title, etc.) and relative time (e.g., 2 hours ago, yesterday).
- **Feed Design:** Clean, minimal, readable list with subtle dividers, small icons, and concise text.
- **Data Source:** Real activity logs from Supabase database.
- **Update Frequency:** Real-time or near-real-time updates.

#### 3.15.4 Important Information Section

- **Pending Fees:** Display count and summary of pending fees requiring attention.
- **Pending Admissions:** Display count and summary of pending admissions requiring review.
- **Unsubmitted Attendance:** Display count and summary of unsubmitted attendance records.
- **Upcoming Events:** Display upcoming school events within next 7 days.
- **Pending Queries:** Display count of pending queries or support requests.
- **System Alerts:** Display important system alerts or notifications.
- **Section Design:** Compact section with genuinely important items only. Each item shows clear label, count or summary, and action link if applicable.
- **Data Source:** Real data from Supabase database filtered for important/pending items.
- **Priority:** Display only genuinely important items requiring administrator attention.

#### 3.15.5 Continue Where You Left Off Section

- **Recent Work Context:** Display subtle section based on actual recent administrator activity.
- **Resume Link:** Provide direct link to resume last activity context (e.g., editing student profile, reviewing admission, registering fee).
- **Section Design:** Subtle, minimal section with brief description of last activity and clear resume link.
- **Data Source:** Administrator's recent activity history from Supabase database.
- **Conditional Display:** Display only if recent activity context exists.

#### 3.15.6 Desktop-Only Constraint

- **Desktop View Only:** All new analytics, graphs, monitoring widgets, and additional information appear only on desktop dashboard.
- **Mobile Dashboard Unchanged:** Existing mobile/responsive dashboard remains exactly as it currently is. No new analytics or monitoring widgets on mobile.
- **Responsive Behavior:** Desktop dashboard uses existing RSBS responsive breakpoints. Below desktop breakpoint, show existing mobile dashboard unchanged.

#### 3.15.7 Design Principles

- **RSBS Design Language:** Continue using existing RSBS design language, sidebar, header, navigation, color palette, typography, spacing.
- **Premium Evolution:** Result should feel like natural premium evolution of current dashboard, not different product.
- **Visual Design:** Premium, professional, modern, minimal, elegant, spacious, readable.
- **Color Palette:** Restrained color palette with subtle borders, soft shadows, refined cards.
- **Avoid:** Excessive colors, gradients, bold text, oversized headings, decorative elements.
- **Information Density:** Balanced — not too empty, not too crowded. Prioritize most important school-level information.
- **Consistency:** Maintain consistency with existing Admin Panel pages in layout, spacing, typography, and interaction patterns.

### 3.16 Mobile Dashboard (Unchanged)

- All existing mobile dashboard functionality, layout, widgets, and design remain unchanged.
- No new analytics, graphs, monitoring widgets, or additional information on mobile dashboard.

### 3.17 Master Fees (Unchanged)

- All existing Master Fees structure, fee categories, fee types, and fee management remain unchanged.

### 3.18 Students Tab (Enhanced)

- Students tab integrates with enhanced Fee Registration and Student Fee Ledger.
- All existing student management functionality remains unchanged.

### 3.19 Existing Features (Unchanged)

- All existing Student Portal functionality not mentioned in enhancements remains unchanged.
- All existing Study AI module, Account & Settings, quiz management, Admin Panel, other panels remain unchanged.
- All existing authentication architecture, database, permissions, navigation remain unchanged.

---

## 4. Business Rules and Logic

### 4.1 Account Picker and Account Switcher UI Rules (Enhanced)

1. **Individual Card Display:** Each saved account displayed as individual premium rounded card.
2. **Profile Photo Source:** Profile photo fetched from authenticated student record in database.
3. **Full Name Display:** Student's full name displayed as primary text (large, prominent font).
4. **Login ID Display:** Student's Login ID displayed underneath full name in small, subtle secondary text.
5. **Example Layout:** [Profile Photo] Azad / RSBS7991 (two lines).
6. **Prohibited Information:** Must NOT display Verification ID, Verification code, Password, Login ID: label, or any other unnecessary identifier.
7. **Card Styling:** Premium rounded corners, subtle highlighted blue border for selected account, soft elevation/shadow, clean spacing.
8. **Touch Area:** Minimum 48px height for proper mobile touch area.
9. **Pressed Animation:** Smooth pressed/selected animation on tap.
10. **Design Consistency:** Same premium design applied to both Account Picker and Account Switcher.
11. **Data Consistency:** Profile photo, name, and Login ID always belong to selected account from authenticated student record.

### 4.2 Saved Account Authentication Flow Rules (Enhanced)

12. **First Login Flow:** Login ID + Password → Verify PIN → Student Dashboard.
13. **Save & Exit:** After successful first authentication and PIN verification, securely preserve trusted saved-account/session state when student chooses Save & Exit.
14. **Saved Account Persistence:** Account remains saved on device with trusted session state.
15. **Saved Account Selection:** Selecting saved account goes: Account Picker → tap saved account → short circular loading/restoring animation → Student Dashboard.
16. **No Re-authentication:** Do NOT ask for password, PIN, confirm password, or any login credentials when selecting trusted saved account.
17. **Skip Confirm Password Screen:** Current Confirm your password screen that appears after selecting trusted saved account must be completely skipped.
18. **Explicit Logout:** Explicit Logout must revoke trusted session for that account.
19. **Post-Logout Flow:** Next login after Logout requires full Login ID + Password → Verify PIN → Student Dashboard flow.
20. **Multiple Accounts:** Each saved account maintains independent session state, authentication state, profile photo, student name, and Login ID.
21. **No Data Mixing:** Switching between saved accounts must never mix data or invalidate another account.
22. **Session Restoration Trigger:** On actual app startup, refresh, WebView reload, or unexpected navigation, restore valid saved session.
23. **Restoring Session Message:** Show Restoring your session message only during genuine session restoration, not during normal account selection.
24. **Valid Session Restoration:** If valid, restore account and open Student Dashboard.
25. **Invalid Session Handling:** If invalid, redirect to Login Screen.
26. **No CSS Hiding:** Do not simply hide auth screens with CSS; fix underlying routing, session persistence, and authentication state logic.
27. **Integration Requirement:** Integrate with existing Login, PIN, Save & Exit, Logout, account picker, and session architecture.
28. **No Second System:** Do not create a second authentication system.

### 4.3 Account Selection Interaction Rules (Enhanced)

29. **Immediate Feedback:** On tap, immediately show selected/pressed state.
30. **Loading Animation Display:** Show short smooth circular loading/restoring animation if required.
31. **Direct Navigation:** Restore account and open Student Dashboard directly.
32. **No Intermediate Screens:** Do not show password, PIN, or confirm password screens for trusted saved accounts.

### 4.4 Receipt Immutability Rules (New)

33. **One Payment One Receipt:** One successful payment produces one permanent receipt.
34. **Unique Receipt Number:** Each receipt has unique receipt number generated at creation.
35. **No Regeneration:** Receipt regeneration is disabled. Original receipt PDF is permanent.
36. **No Duplicate Receipt Numbers:** System must never generate duplicate receipt numbers.
37. **No Duplicate Payment Records:** Downloading receipt must NOT create new payment record.
38. **Original PDF Download:** Admin can download original receipt PDF at any time without regenerating.

### 4.5 Automatic Fee Period Identification Rules (New)

39. **Exact Coverage Derivation:** System automatically derives exact fee period coverage from payment data.
40. **Period Types:** System identifies and displays:
  - Monthly (e.g., April 2026)
  - Annual (e.g., Academic Year 2026-2027)
  - Combined months (e.g., April-June 2026)
  - Session-based
41. **Consistent Display:** Exact period must appear consistently in Fee Ledger, Receipt History, Receipt PDF, Student Panel, and Parent Panel.
42. **Combined-Month Clarity:** For combined months, all included months must be clearly listed.

### 4.6 Paid Period Removal from Registration UI Rules (New)

43. **Paid Period Computation:** System computes already-paid periods for selected student, academic session, and fee type before displaying registration UI.
44. **UI-Level Removal:** Paid periods are removed from selectable options in registration UI.
45. **Primary Prevention Layer:** UI-level removal is primary prevention layer.
46. **Full Year Paid Handling:** If Full Year is paid, show clear message and remove month selection entirely.
47. **Combined-Month Restrictions:** Combined-month options must be continuous and non-overlapping.
48. **Next Valid Range:** Only next valid contiguous range may be offered for combined-month selection.
49. **Monthly Restriction:** If April 2026 paid, April 2026 removed from selectable options.
50. **Combined-Month Restriction:** If April-May 2026 paid together, both April and May removed individually from selectable options.
51. **Selection Prevention:** Paid periods cannot be selected for new fee registration.

### 4.7 Zero-Duplicate Registration Rules (New)

52. **Duplicate Check Key:** Student + fee type + academic session + actual fee period.
53. **Backend Validation:** Before creating payment record, system checks if requested period already registered.
54. **Duplicate Detection:** If duplicate detected, block submission with clean message.
55. **Safety Net:** Backend validation is safety net for UI-level prevention.
56. **Consistent Application:** Duplicate prevention applies to Core Fees, Extra Fees, and Other Fees.
57. **Period Matching:** System matches exact fee period, not just fee type or academic session.

### 4.8 Ledger Exact Coverage Rules (New)

58. **Complete Payment History:** Student Fee Ledger displays all registered payments for selected student.
59. **Exact Period Display:** Each payment shows exact fee period:
  - Monthly (e.g., April 2026)
  - Annual (e.g., Academic Year 2026-2027)
  - Combined months (e.g., April-June 2026)
  - Session-based
60. **Payment Details:** Each payment shows payment date, method, amount.
61. **Unique Receipt Number:** Each payment shows unique receipt number.
62. **Download Action:** Each payment has Download PDF button to download original receipt PDF.

### 4.9 Permanent Admin/School Record Rules (New)

63. **Never Deleted:** Admin/school payment and receipt records are never deleted.
64. **Visibility Independence:** Student/parent visibility expiry does NOT affect admin/school records.
65. **Permanent Access:** Admin can access and download any historical receipt at any time.
66. **Separate Concepts:** Payment records, receipts, ledger history, and student/parent visibility are separate concepts.
67. **No Alteration:** Expiring student/parent receipt must NEVER delete or alter underlying payment record or admin record.

### 4.10 Separate Student and Parent Visibility Rules (New)

68. **Independent Visibility:** Each receipt has independent student visibility window and parent visibility window.
69. **Separate Rows:** Student visibility and parent visibility are separate database rows with separate expiry dates.
70. **Independent Expiry:** Student visibility expiry and parent visibility expiry are independent.
71. **No Cross-Impact:** Extending student visibility does NOT extend parent visibility, and vice versa.
72. **Auto-Appear:** Receipts automatically appear in Student Panel and Parent Panel when generated.
73. **Panel-Specific Fetch:** Student Panel fetches only receipts with valid student visibility. Parent Panel fetches only receipts with valid parent visibility.
74. **Auto-Expiry:** After student visibility period expires, receipt disappears from Student Panel. After parent visibility period expires, receipt disappears from Parent Panel.
75. **Admin Retention:** Expired receipts remain in Admin Ledger with full download access.

### 4.11 Extend Controls Rules (New)

76. **Separate Controls:** Admin has separate Extend Student and Extend Parent controls per receipt.
77. **Configurable Duration:** Admin can enter number of days for visibility extension.
78. **Role-Specific Impact:** Extend Student affects only student visibility expiry. Extend Parent affects only parent visibility expiry.
79. **Visibility Restoration:** Expired receipt becomes visible again in corresponding panel after Admin extends visibility.
80. **Independent Operation:** Each extend control operates independently without affecting the other role's visibility.

### 4.12 Receipt Delivery Rules (New)

81. **Automatic Delivery:** When new receipt is generated, automatically deliver to Student Panel with student visibility window.
82. **Parent Delivery Condition:** If student has registered parent account, automatically deliver receipt to Parent Panel with separate parent visibility window.
83. **Separate Windows:** Student visibility and parent visibility are set independently at delivery.
84. **Delivery Timing:** Receipt delivery occurs immediately after payment registration.

### 4.13 Consistency Across Modules Rules (New)

85. **Module Coverage:** All rules apply consistently across Fee Registration, Students tab, Core Fees, Extra Fees, Other Fees, Master Fees, Student Fee Ledger, Receipt History, Receipt PDF generation, Student Panel, and Parent Panel.
86. **Master Fees Preservation:** Existing Master Fees structure and concepts remain unchanged.
87. **No Breaking Changes:** Enhancements must not break existing functionality in any module.

### 4.14 Desktop Dashboard Analytics Rules (New)

88. **Real Data Only:** All dashboard analytics, charts, and statistics must use real data from Supabase database. No fake or static data.
89. **Live-Stat Cards Data Source:** Total Students, Today's Attendance, Fees Collected, Fees Pending, Admissions/Important Pending Items fetched from Supabase in real-time or near-real-time.
90. **Chart Data Aggregation:** Chart data aggregated from Supabase database based on selected period (Today, 7 Days, 1 Month, 3 Months, 1 Year).
91. **Default Period:** Default period for all charts is Today.
92. **Dynamic Period Update:** When period selector is changed, chart data must update dynamically without page reload.
93. **Recent Activity Source:** Recent activity feed fetched from administrator activity logs in Supabase database.
94. **Important Information Source:** Important information items (pending fees, pending admissions, unsubmitted attendance, upcoming events, pending queries, system alerts) fetched from Supabase database with appropriate filters.
95. **Continue Where You Left Off Source:** Recent administrator activity context fetched from Supabase database.
96. **Desktop-Only Display:** All new analytics, graphs, monitoring widgets, and additional information display only on desktop view (above responsive breakpoint).
97. **Mobile Dashboard Unchanged:** Below responsive breakpoint, display existing mobile dashboard unchanged. No new analytics or monitoring widgets on mobile.
98. **RSBS Design Consistency:** Desktop dashboard must use existing RSBS design language, sidebar, header, navigation, color palette, typography, spacing, and interaction patterns.
99. **Premium Visual Design:** Desktop dashboard must use premium, professional, modern, minimal, elegant, spacious, readable visual design.
100. **Restrained Color Palette:** Use restrained color palette with subtle borders, soft shadows, refined cards. Avoid excessive colors, gradients, bold text, oversized headings, decorative elements.
101. **Balanced Information Density:** Information density must be balanced — not too empty, not too crowded. Prioritize most important school-level information.
102. **Natural Evolution:** Desktop dashboard must feel like natural premium evolution of current dashboard, not different product.

### 4.15 Existing Rules (Unchanged)

103. All existing authentication, session management, quiz management, Study AI backend, daily message limits, and other business rules remain unchanged.

---

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|---|---|
| Student profile photo not available | Display default avatar or initials based on student name. |
| Student full name not available | Display Login ID as primary text, show warning in logs. |
| Login ID not available | Display only full name, show warning in logs. |
| Profile data fetch fails | Display cached data if available, otherwise show placeholder with retry option. |
| Saved account session invalid | Redirect to Login Screen, require full Login ID + Password → Verify PIN flow. |
| Saved account session expired | Redirect to Login Screen, require full Login ID + Password → Verify PIN flow. |
| Session restoration fails | Redirect to Login Screen, show error message. |
| Multiple accounts have same name | Display Login ID prominently to differentiate. |
| Account Picker fails to load accounts | Display error message, provide retry option. |
| Account Switcher fails to load accounts | Display error message, provide retry option. |
| Profile photo fails to load | Display default avatar or initials. |
| Account selection animation lags | Reduce animation complexity, ensure smooth performance. |
| Loading/restoring animation stutters | Reduce animation complexity, prioritize session restoration. |
| Student taps account during loading | Ignore additional taps until current restoration completes. |
| Network error during session restoration | Display error message, provide retry option, redirect to Login Screen if retry fails. |
| Supabase Auth error during restoration | Display error message, redirect to Login Screen. |
| Edge Function error during restoration | Display error message, redirect to Login Screen. |
| Student switches accounts rapidly | Queue account switches, process one at a time. |
| Student logs out during account switch | Cancel account switch, complete logout, redirect to Login Screen. |
| App crashes during session restoration | On restart, attempt session restoration again. |
| Browser clears storage | All saved accounts lost, redirect to Login Screen. |
| Student manually clears browser data | All saved accounts lost, redirect to Login Screen. |
| Saved account data corrupted | Remove corrupted account, redirect to Login Screen. |
| Multiple devices with same saved account | Each device maintains independent session state. |
| Student changes password on another device | Saved session on current device becomes invalid, redirect to Login Screen on next use. |
| Student changes PIN on another device | Saved session on current device remains valid (PIN not required for saved account restoration). |
| Confirm your password screen still appears | Fix routing and authentication state logic to completely skip this screen. |
| Account Picker shows mismatched data | Refresh profile data from authenticated student record, ensure consistency. |
| Account Switcher shows mismatched data | Refresh profile data from authenticated student record, ensure consistency. |
| Touch area too small on mobile | Ensure minimum 48px height for all account cards. |
| Card styling inconsistent | Apply same premium design to all account cards in both Account Picker and Account Switcher. |
| Selected/pressed state not visible | Increase visual prominence of selected state. |
| Loading animation too long | Reduce animation duration, prioritize session restoration speed. |
| Student Dashboard fails to load after restoration | Display error message, provide retry option, redirect to Login Screen if retry fails. |
| Admin attempts to register duplicate fee period | System prevents submission, displays clean message indicating period already paid. |
| Admin attempts to register April when April already paid | System removes April from selectable options, prevents selection. |
| Admin attempts to register April when April-May already paid together | System removes April from selectable options, prevents selection. |
| Admin attempts to register May when April-May already paid together | System removes May from selectable options, prevents selection. |
| Admin attempts to register Annual Fee when Annual Fee already paid | System removes Annual Fee from selectable options, shows clear message. |
| Admin downloads original receipt PDF | System downloads original PDF without regenerating or creating new payment. |
| Admin downloads receipt multiple times | Each download retrieves original PDF, does NOT create duplicate payments or receipt numbers. |
| Payment record creation fails | Display error message, do not generate receipt, do not deliver to Student/Parent. |
| Receipt generation fails after payment created | Log error, notify Admin, allow manual receipt regeneration (if regeneration is re-enabled in future). |
| Receipt delivery to Student Panel fails | Log error, allow Admin to manually trigger delivery. |
| Receipt delivery to Parent Panel fails | Log error, allow Admin to manually trigger delivery. |
| Parent account not registered | Receipt delivered only to Student Panel with student visibility. |
| Parent account not linked to student | Receipt delivered only to Student Panel with student visibility. |
| Receipt number generation fails | Log error, retry generation with fallback mechanism, ensure uniqueness. |
| Receipt number collision | Use UUID or timestamp-based generation to ensure uniqueness, validate before saving. |
| Fee period identification fails | Log error, display error message, require Admin to manually specify period. |
| Paid period computation fails | Log error, display error message, prevent registration until computation succeeds. |
| UI fails to remove paid periods | Log error, backend validation blocks duplicate submission as safety net. |
| Combined-month options overlap | System validates and prevents overlapping options, displays error if detected. |
| Next valid contiguous range calculation fails | Log error, display error message, require Admin to manually select valid range. |
| Full Year paid but month selection still visible | Log error, force UI refresh, remove month selection. |
| Duplicate check query fails | Display error message, prevent payment registration until check succeeds. |
| Backend validation detects duplicate after UI check | Block submission, display clean message, log inconsistency for investigation. |
| Student visibility expiry date calculation fails | Use default duration, log error. |
| Parent visibility expiry date calculation fails | Use default duration, log error. |
| Student visibility auto-expiry job fails | Log error, retry expiry process, ensure eventual consistency. |
| Parent visibility auto-expiry job fails | Log error, retry expiry process, ensure eventual consistency. |
| Expired receipt still visible in Student Panel | Log error, force expiry, remove from view. |
| Expired receipt still visible in Parent Panel | Log error, force expiry, remove from view. |
| Admin extends student visibility for expired receipt | System updates student visibility expiry date, receipt becomes visible again in Student Panel. |
| Admin extends parent visibility for expired receipt | System updates parent visibility expiry date, receipt becomes visible again in Parent Panel. |
| Admin extends both student and parent visibility | System updates both expiry dates independently. |
| Admin attempts to delete payment record | System prevents deletion, display warning that payment records are permanent. |
| Admin attempts to edit payment record | System prevents editing, display warning that payment records are immutable. |
| Student/Parent attempts to download expired receipt | Receipt not visible in Student/Parent Panel, download action unavailable. |
| Student/Parent receipt list fails to load | Display error message, provide retry option. |
| Receipt PDF download fails | Display error message, provide retry option. |
| Receipt PDF generation fails | Log error, notify Admin, allow manual regeneration (if regeneration is re-enabled in future). |
| Fee period data inconsistent | Validate fee period data before payment registration, display error if invalid. |
| Academic session data missing | Display error message, require Admin to select valid academic session. |
| Student data missing or invalid | Display error message, require Admin to select valid student. |
| Payment method not selected | Display validation error, require Admin to select payment method. |
| Payment amount invalid or zero | Display validation error, require Admin to enter valid amount. |
| Ledger query fails | Display error message, provide retry option. |
| Receipt History query fails | Display error message, provide retry option. |
| Visibility management query fails | Display error message, provide retry option. |
| Concurrent payment registrations for same period | Use database transaction and unique constraint to prevent duplicates, display error to second Admin. |
| Student Panel fetches receipts with invalid visibility | System filters out invalid receipts, displays only valid ones. |
| Parent Panel fetches receipts with invalid visibility | System filters out invalid receipts, displays only valid ones. |
| Admin Ledger fails to display all payments | Display error message, provide retry option, ensure eventual consistency. |
| Master Fees structure altered by enhancement | Prevent any alteration, preserve existing Master Fees structure. |
| Existing module breaks due to enhancement | Rollback enhancement, fix integration, ensure no breaking changes. |
| Desktop dashboard data fetch fails | Display error message, provide retry option, show cached data if available. |
| Live-stat card data unavailable | Display placeholder or zero value, show warning icon, provide retry option. |
| Chart data aggregation fails | Display error message, provide retry option, show empty chart with message. |
| Period selector change fails | Display error message, revert to previous period, provide retry option. |
| Chart rendering fails | Display error message, provide retry option, log error for investigation. |
| Recent activity feed fetch fails | Display error message, provide retry option, show cached activities if available. |
| Important information fetch fails | Display error message, provide retry option, show cached items if available. |
| Continue where you left off context unavailable | Hide section entirely. |
| Resume link navigation fails | Display error message, provide retry option. |
| Desktop dashboard loads on mobile | Display existing mobile dashboard unchanged, hide desktop analytics. |
| Responsive breakpoint detection fails | Default to mobile dashboard to ensure functionality. |
| Desktop dashboard styling conflicts with existing RSBS design | Fix styling to match existing RSBS design language, ensure consistency. |
| Chart data too large to render | Implement pagination or data sampling, display warning message. |
| Real-time data update fails | Fall back to periodic refresh, display warning icon. |
| Supabase query timeout | Display error message, provide retry option, implement query optimization. |
| Database connection lost | Display error message, provide retry option, show cached data if available. |
| Admin opens desktop dashboard with insufficient permissions | Display permission error, hide restricted sections. |
| Chart animation lags on low-end devices | Reduce animation complexity, disable animations if performance poor. |
| Desktop dashboard loads slowly | Implement progressive loading, show skeleton screens, optimize queries. |
| Multiple admins view dashboard simultaneously | Each admin sees independent real-time data, no conflicts. |
| Dashboard data inconsistent across sections | Implement data consistency checks, refresh all sections if inconsistency detected. |
| Period selector shows invalid period | Validate period options, disable invalid periods, show error message. |
| Chart displays incorrect data | Validate data before rendering, log error, provide data refresh option. |
| Recent activity shows outdated activities | Implement real-time or near-real-time updates, show last update timestamp. |
| Important information shows resolved items | Implement automatic filtering, remove resolved items from display. |
| Continue where you left off shows invalid context | Validate context before display, hide section if context invalid. |

---

## 6. Acceptance Criteria

1. Account Picker displays all saved accounts as individual premium rounded cards.
2. Each account card in Account Picker displays student's actual profile photo from authenticated student record.
3. Each account card in Account Picker displays student's full name as primary text (large, prominent font).
4. Each account card in Account Picker displays student's Login ID underneath full name in small, subtle secondary text.
5. Account Picker cards use example layout: [Profile Photo] Azad / RSBS7991.
6. Account Picker cards do NOT display Verification ID, Verification code, Password, Login ID: label, or any other unnecessary identifier.
7. Account Picker cards use premium rounded corners, subtle highlighted blue border for selected account, soft elevation/shadow, clean spacing.
8. Account Picker cards have minimum 48px height for proper mobile touch area.
9. Account Picker cards show smooth pressed/selected animation on tap.
10. Account Switcher bottom sheet displays all saved accounts as individual premium rounded cards with same design as Account Picker.
11. Account Switcher cards display same profile photo, full name, and Login ID as Account Picker.
12. Account Switcher cards use same premium design, touch area, and animation as Account Picker.
13. Profile photo, full name, and Login ID are consistent across Account Picker and Account Switcher.
14. Profile photo, full name, and Login ID always belong to selected account from authenticated student record.
15. First login flow: Login ID + Password → Verify PIN → Student Dashboard.
16. After successful first authentication and PIN verification, Save & Exit securely preserves trusted saved-account/session state.
17. Saved account remains on device with trusted session state after Save & Exit.
18. Selecting saved trusted account goes: Account Picker → tap saved account → short circular loading/restoring animation → Student Dashboard.
19. Selecting saved trusted account does NOT ask for password, PIN, confirm password, or any login credentials.
20. Current Confirm your password screen that appears after selecting trusted saved account is completely skipped.
21. Explicit Logout revokes trusted session for that account.
22. Next login after Logout requires full Login ID + Password → Verify PIN → Student Dashboard flow.
23. Each saved account maintains independent session state.
24. Each saved account maintains independent authentication state.
25. Each saved account maintains independent profile photo, student name, and Login ID.
26. Switching between saved accounts never mixes data.
27. Switching between saved accounts never invalidates another account.
28. On app startup, refresh, WebView reload, or unexpected navigation, valid saved session is restored.
29. Restoring your session message shown only during genuine session restoration (app startup, refresh, reload).
30. Restoring your session message NOT shown during normal account selection from Account Picker or Account Switcher.
31. Valid saved session restoration opens Student Dashboard directly.
32. Invalid saved session redirects to Login Screen.
33. Routing and authentication state logic fixed to skip Confirm your password screen, not simply hidden with CSS.
34. Implementation integrates with existing Login, PIN, Save & Exit, Logout, account picker, and session architecture.
35. Implementation does not create a second authentication system.
36. All existing working functionality preserved.
37. Current premium mobile UI preserved.
38. Existing Supabase Auth integration maintained.
39. Existing Edge Functions for trusted-device saved-account management maintained.
40. One successful payment produces one permanent receipt with unique receipt number.
41. Receipt regeneration is disabled.
42. Admin can download original receipt PDF at any time without regenerating or creating new payment.
43. Downloading receipt does NOT create new payment record or duplicate receipt number.
44. System automatically derives exact fee period coverage: monthly, annual, combined months, session-based.
45. Exact fee period appears consistently in Fee Ledger, Receipt History, Receipt PDF, Student Panel, and Parent Panel.
46. System computes already-paid periods for selected student, academic session, and fee type before displaying registration UI.
47. Paid periods are removed from selectable options in registration UI.
48. If Full Year is paid, system shows clear message and removes month selection entirely.
49. Combined-month options are continuous and non-overlapping.
50. Only next valid contiguous range is offered for combined-month selection.
51. If April 2026 paid, April 2026 removed from selectable options.
52. If April-May 2026 paid together, both April and May removed individually from selectable options.
53. Paid periods cannot be selected for new fee registration.
54. Duplicate check is based on student + fee type + academic session + actual fee period.
55. Before creating payment record, system checks if requested period already registered.
56. If duplicate detected, system blocks submission with clean message.
57. Backend validation is safety net for UI-level prevention.
58. Duplicate prevention applies consistently to Core Fees, Extra Fees, and Other Fees.
59. Student Fee Ledger displays all registered payments for selected student.
60. Each payment in Ledger shows exact fee period (monthly, annual, combined months, session-based).
61. Each payment in Ledger shows payment date, method, amount.
62. Each payment in Ledger shows unique receipt number.
63. Each payment in Ledger has Download PDF button to download original receipt PDF.
64. Admin/school payment and receipt records are never deleted.
65. Student/parent visibility expiry does NOT affect admin/school records.
66. Admin can access and download any historical receipt at any time.
67. Expiring student/parent receipt does NOT delete or alter underlying payment record or admin record.
68. Each receipt has independent student visibility window and parent visibility window.
69. Student visibility and parent visibility are separate database rows with separate expiry dates.
70. Student visibility expiry and parent visibility expiry are independent.
71. Extending student visibility does NOT extend parent visibility, and vice versa.
72. Receipts automatically appear in Student Panel and Parent Panel when generated.
73. Student Panel fetches only receipts with valid student visibility.
74. Parent Panel fetches only receipts with valid parent visibility.
75. After student visibility period expires, receipt disappears from Student Panel.
76. After parent visibility period expires, receipt disappears from Parent Panel.
77. Expired receipts remain in Admin Ledger with full download access.
78. Admin has separate Extend Student and Extend Parent controls per receipt.
79. Admin can enter number of days for visibility extension.
80. Extend Student affects only student visibility expiry.
81. Extend Parent affects only parent visibility expiry.
82. Expired receipt becomes visible again in corresponding panel after Admin extends visibility.
83. Each extend control operates independently without affecting the other role's visibility.
84. When new receipt is generated, system automatically delivers to Student Panel with student visibility window.
85. If student has registered parent account, system automatically delivers receipt to Parent Panel with separate parent visibility window.
86. Student visibility and parent visibility are set independently at delivery.
87. All rules apply consistently across Fee Registration, Students tab, Core Fees, Extra Fees, Other Fees, Master Fees, Student Fee Ledger, Receipt History, Receipt PDF generation, Student Panel, and Parent Panel.
88. Existing Master Fees structure and concepts remain unchanged.
89. Enhancements do not break existing functionality in any module.
90. All existing Student Portal functionality not mentioned in enhancements remains unchanged.
91. Desktop dashboard displays School Overview live-stat cards: Total Students, Today's Attendance, Fees Collected, Fees Pending, Admissions/Important Pending Items.
92. Each live-stat card displays real-time data from Supabase database.
93. Desktop dashboard displays Main Analytics Section with five charts: Overall Student Attendance, Fee Collection, Admissions, Academic Performance, Student Strength/Enrollment.
94. Each chart has period selector with options: Today, 7 Days, 1 Month, 3 Months, 1 Year.
95. Default period for all charts is Today.
96. Chart data updates dynamically when period selector is changed.
97. All chart data is real data from Supabase database aggregated by selected period.
98. Desktop dashboard displays Recent Activity feed with clean list of recent actions.
99. Recent activity feed shows entity name and relative time for each activity.
100. Recent activity feed uses real activity logs from Supabase database.
101. Desktop dashboard displays Important Information section with genuinely important items: pending fees, pending admissions, unsubmitted attendance, upcoming events, pending queries, system alerts.
102. Important information section uses real data from Supabase database.
103. Desktop dashboard displays Continue Where You Left Off section with resume link to last activity context.
104. Continue where you left off section uses administrator's recent activity history from Supabase database.
105. All new analytics, graphs, monitoring widgets, and additional information appear only on desktop view.
106. Mobile dashboard remains exactly as it currently is, with no new analytics or monitoring widgets.
107. Below responsive breakpoint, existing mobile dashboard is displayed unchanged.
108. Desktop dashboard uses existing RSBS design language, sidebar, header, navigation, color palette, typography, spacing.
109. Desktop dashboard uses premium, professional, modern, minimal, elegant, spacious, readable visual design.
110. Desktop dashboard uses restrained color palette with subtle borders, soft shadows, refined cards.
111. Desktop dashboard avoids excessive colors, gradients, bold text, oversized headings, decorative elements.
112. Desktop dashboard information density is balanced — not too empty, not too crowded.
113. Desktop dashboard feels like natural premium evolution of current dashboard, not different product.
114. Desktop dashboard maintains consistency with existing Admin Panel pages in layout, spacing, typography, and interaction patterns.

---

## 7. Not Included in This Release

- Profile photo upload or editing functionality.
- Custom avatar or profile picture selection.
- Profile photo cropping or resizing.
- Full name editing from Account Picker or Account Switcher.
- Login ID editing or changing.
- Account identity customization options.
- Multiple profile photos per account.
- Account card theme customization.
- Account card layout customization.
- Account Picker search functionality.
- Account Picker filters.
- Account Picker sorting options.
- Account Picker bulk actions.
- Account Picker account grouping.
- Account Switcher search functionality.
- Account Switcher filters.
- Account Switcher sorting options.
- Account Switcher recent accounts section.
- Account Switcher frequently used accounts section.
- Biometric authentication (fingerprint, face recognition).
- Two-factor authentication (2FA).
- Single sign-on (SSO).
- OAuth integration.
- Social login (Google, Facebook, etc.).
- Password recovery from Account Picker.
- PIN reset from Account Picker.
- Account deletion from Account Picker.
- Account export or backup.
- Account import from file.
- Session timeout customization.
- Session activity monitoring.
- Session analytics.
- Device management (view/revoke devices).
- Login history.
- Security notifications.
- Account security settings.
- Privacy settings from Account Picker.
- Data encryption options.
- Offline mode for saved accounts.
- Account synchronization across devices.
- Cloud backup of saved accounts.
- Account migration tools.
- Account merging.
- Account linking.
- Guest mode.
- Demo account.
- Test account.
- Admin account management from Account Picker.
- Bulk account operations.
- Account provisioning.
- Account deprovisioning.
- Account lifecycle management.
- Compliance reporting.
- Audit logs.
- Role-based access control (RBAC) from Account Picker.
- Permission management from Account Picker.
- API access for account management.
- Webhooks for account events.
- Third-party integrations for account management.
- Custom authentication flows.
- Passwordless authentication.
- Magic link authentication.
- QR code authentication.
- NFC authentication.
- Smart card authentication.
- Certificate-based authentication.
- Kerberos authentication.
- LDAP integration.
- Active Directory integration.
- SAML integration.
- OpenID Connect integration.
- Account federation.
- Identity provider integration.
- Multi-tenancy support.
- White-label account management.
- Custom branding for Account Picker.
- Localization for Account Picker.
- Accessibility enhancements beyond responsive design.
- Dark mode for Account Picker.
- High contrast mode.
- Font size adjustment.
- Screen reader optimization.
- Keyboard navigation optimization.
- Voice control.
- Haptic feedback.
- Sound effects.
- Animation customization.
- Animation disable option.
- Performance monitoring for Account Picker.
- A/B testing for Account Picker.
- User feedback mechanism for Account Picker.
- Help or tutorial for Account Picker.
- Onboarding for Account Picker.
- Tips or hints for Account Picker.
- Notifications for account events.
- Push notifications for account events.
- Email notifications for account events.
- SMS notifications for account events.
- Fee payment processing or payment gateway integration.
- Online payment methods (credit card, debit card, digital wallets).
- Payment confirmation or payment status tracking.
- Refund processing or refund management.
- Partial payment support.
- Installment payment plans.
- Payment reminders or payment due notifications.
- Late fee calculation or penalty charges.
- Discount or scholarship application.
- Fee waiver management.
- Fee structure customization beyond Master Fees.
- Fee category management beyond Master Fees.
- Fee type management beyond Master Fees.
- Fee amount adjustment beyond Master Fees.
- Bulk fee registration.
- Bulk receipt generation.
- Receipt template customization.
- Receipt branding or logo customization.
- Receipt language localization.
- Receipt email delivery.
- Receipt SMS delivery.
- Receipt print functionality from Student/Parent Panel.
- Receipt sharing functionality.
- Receipt archiving beyond Admin Ledger.
- Receipt search functionality.
- Receipt filtering by date, amount, or period.
- Receipt sorting options.
- Receipt export to CSV or Excel.
- Receipt analytics or reporting.
- Payment analytics or reporting.
- Fee collection analytics.
- Outstanding fee tracking.
- Fee collection reminders.
- Fee collection follow-up.
- Parent notification for new receipt beyond auto-delivery.
- Student notification for new receipt beyond auto-delivery.
- Push notification for receipt delivery.
- Email notification for receipt delivery.
- SMS notification for receipt delivery.
- Receipt verification or authentication.
- Receipt QR code or barcode.
- Receipt digital signature.
- Receipt blockchain verification.
- Receipt audit trail beyond basic records.
- Receipt version control.
- Receipt amendment or correction.
- Receipt cancellation.
- Receipt void functionality.
- Receipt dispute resolution.
- Receipt approval workflow.
- Multi-level receipt approval.
- Receipt delegation.
- Receipt forwarding.
- Receipt commenting or annotation.
- Receipt attachment support.
- Receipt metadata management.
- Receipt tagging or categorization.
- Receipt custom fields.
- Receipt integration with accounting software.
- Receipt integration with ERP systems.
- Receipt API for third-party access.
- Receipt webhook for external systems.
- Receipt batch processing.
- Receipt scheduled generation.
- Receipt auto-generation rules.
- Receipt template versioning.
- Receipt compliance reporting.
- Receipt regulatory compliance.
- Receipt tax calculation.
- Receipt GST/VAT support.
- Receipt multi-currency support.
- Receipt exchange rate handling.
- Receipt rounding rules.
- Receipt number format customization.
- Receipt sequence management.
- Receipt duplicate detection beyond payment level.
- Receipt reconciliation.
- Receipt matching with bank statements.
- Receipt import from external sources.
- Receipt OCR or scanning.
- Receipt image upload.
- Receipt attachment management.
- Receipt storage optimization.
- Receipt compression.
- Receipt encryption at rest.
- Receipt access control beyond visibility rules.
- Receipt permission management.
- Receipt role-based access.
- Receipt data retention policy beyond Admin Ledger.
- Receipt data purging.
- Receipt GDPR compliance.
- Receipt data anonymization.
- Receipt data masking.
- Receipt data backup beyond database backup.
- Receipt disaster recovery.
- Receipt high availability.
- Receipt load balancing.
- Receipt caching.
- Receipt CDN delivery.
- Receipt performance optimization.
- Receipt scalability enhancements.
- Receipt monitoring or alerting.
- Receipt error tracking.
- Receipt logging beyond basic logs.
- Receipt debugging tools.
- Receipt testing framework.
- Receipt automated testing.
- Receipt load testing.
- Receipt security testing.
- Receipt penetration testing.
- Receipt vulnerability scanning.
- Receipt code review.
- Receipt documentation beyond PRD.
- Receipt user manual.
- Receipt training materials.
- Receipt video tutorials.
- Receipt FAQ.
- Receipt troubleshooting guide.
- Receipt support ticketing.
- Receipt helpdesk integration.
- Receipt chatbot support.
- Receipt live chat support.
- Receipt phone support.
- Receipt email support.
- Receipt regeneration functionality (disabled in this release).
- Desktop dashboard customization or personalization.
- Desktop dashboard widget rearrangement.
- Desktop dashboard custom widgets.
- Desktop dashboard export to PDF or image.
- Desktop dashboard sharing functionality.
- Desktop dashboard scheduled reports.
- Desktop dashboard email reports.
- Desktop dashboard SMS alerts.
- Desktop dashboard push notifications.
- Desktop dashboard real-time collaboration.
- Desktop dashboard commenting or annotation.
- Desktop dashboard version history.
- Desktop dashboard comparison mode.
- Desktop dashboard drill-down functionality.
- Desktop dashboard data filtering beyond period selector.
- Desktop dashboard data sorting.
- Desktop dashboard data export to CSV or Excel.
- Desktop dashboard chart type customization.
- Desktop dashboard color scheme customization.
- Desktop dashboard font customization.
- Desktop dashboard layout customization.
- Desktop dashboard dark mode.
- Desktop dashboard high contrast mode.
- Desktop dashboard accessibility enhancements beyond responsive design.
- Desktop dashboard keyboard navigation.
- Desktop dashboard screen reader optimization.
- Desktop dashboard voice control.
- Desktop dashboard mobile app version.
- Desktop dashboard tablet optimization.
- Desktop dashboard offline mode.
- Desktop dashboard data caching beyond basic caching.
- Desktop dashboard performance monitoring.
- Desktop dashboard A/B testing.
- Desktop dashboard user feedback mechanism.
- Desktop dashboard help or tutorial.
- Desktop dashboard onboarding.
- Desktop dashboard tips or hints.
- Desktop dashboard API access.
- Desktop dashboard webhooks.
- Desktop dashboard third-party integrations.
- Desktop dashboard custom data sources.
- Desktop dashboard data transformation.
- Desktop dashboard calculated metrics.
- Desktop dashboard predictive analytics.
- Desktop dashboard machine learning insights.
- Desktop dashboard AI-powered recommendations.
- Desktop dashboard anomaly detection.
- Desktop dashboard trend analysis.
- Desktop dashboard forecasting.
- Desktop dashboard benchmarking.
- Desktop dashboard goal tracking.
- Desktop dashboard KPI management.
- Desktop dashboard scorecard.
- Desktop dashboard balanced scorecard.
- Desktop dashboard OKR tracking.
- Desktop dashboard project management integration.
- Desktop dashboard task management integration.
- Desktop dashboard calendar integration.
- Desktop dashboard notification center.
- Desktop dashboard activity stream.
- Desktop dashboard social features.
- Desktop dashboard gamification.
- Desktop dashboard leaderboard.
- Desktop dashboard badges or achievements.
- Desktop dashboard user profiles.
- Desktop dashboard team collaboration.
- Desktop dashboard role-based dashboards.
- Desktop dashboard multi-tenant support.
- Desktop dashboard white-label support.
- Desktop dashboard custom branding.
- Desktop dashboard localization.
- Desktop dashboard multi-language support.
- Desktop dashboard currency conversion.
- Desktop dashboard timezone support.
- Desktop dashboard compliance reporting.
- Desktop dashboard audit logs.
- Desktop dashboard data governance.
- Desktop dashboard data lineage.
- Desktop dashboard data quality monitoring.
- Desktop dashboard data validation.
- Desktop dashboard data cleansing.
- Desktop dashboard data enrichment.
- Desktop dashboard data masking.
- Desktop dashboard data anonymization.
- Desktop dashboard GDPR compliance.
- Desktop dashboard HIPAA compliance.
- Desktop dashboard SOC 2 compliance.
- Desktop dashboard ISO 27001 compliance.
- Desktop dashboard security scanning.
- Desktop dashboard vulnerability assessment.
- Desktop dashboard penetration testing.
- Desktop dashboard disaster recovery.
- Desktop dashboard business continuity.
- Desktop dashboard high availability.
- Desktop dashboard load balancing.
- Desktop dashboard auto-scaling.
- Desktop dashboard performance optimization.
- Desktop dashboard query optimization.
- Desktop dashboard index optimization.
- Desktop dashboard database tuning.
- Desktop dashboard caching strategy.
- Desktop dashboard CDN integration.
- Desktop dashboard edge computing.
- Desktop dashboard serverless architecture.
- Desktop dashboard microservices architecture.
- Desktop dashboard containerization.
- Desktop dashboard orchestration.
- Desktop dashboard CI/CD pipeline.
- Desktop dashboard automated testing.
- Desktop dashboard load testing.
- Desktop dashboard stress testing.
- Desktop dashboard chaos engineering.
- Desktop dashboard monitoring and alerting.
- Desktop dashboard logging and tracing.
- Desktop dashboard error tracking.
- Desktop dashboard debugging tools.
- Desktop dashboard profiling tools.
- Desktop dashboard documentation.
- Desktop dashboard user manual.
- Desktop dashboard training materials.
- Desktop dashboard video tutorials.
- Desktop dashboard FAQ.
- Desktop dashboard troubleshooting guide.
- Desktop dashboard support ticketing.
- Desktop dashboard helpdesk integration.
- Desktop dashboard chatbot support.
- Desktop dashboard live chat support.
- Desktop dashboard phone support.
- Desktop dashboard email support.