# Requirements Document

## 1. Application Overview

- **Application Name:** RSBS School ERP - Student Portal Account Switcher UI Polish + Saved Account Authentication Flow Fix
- **Description:** Enhancement to existing RSBS School ERP Student Portal. Updates include: (1) Premium native mobile account switcher UI for Account Picker and Account Switcher, displaying individual rounded cards with student profile photo, full name as primary text, and Login ID as secondary text; (2) Fixed saved-account authentication flow ensuring trusted saved accounts restore directly to Student Dashboard without re-authentication, while preserving first-login flow (Login ID + Password → Verify PIN → Dashboard) and explicit Logout revocation. All changes maintain existing authentication architecture, Supabase Auth, Edge Functions, session management, and other Student Portal functionality. Application location: /workspace/app-aho9bv0iqbr5. Technology stack: React + Vite + TypeScript + shadcn/ui + Supabase Auth + Edge Functions.

---

## 2. Users and Use Cases

### 2.1 Target Users

- **Students:** View premium native mobile account switcher UI with individual rounded cards showing profile photo, full name, and Login ID. Select saved trusted account and restore directly to Student Dashboard without re-authentication. Complete first-login flow with Login ID + Password → Verify PIN. Explicitly logout to revoke trusted session.

### 2.2 Core Use Cases

- **Student opens Account Picker:** See all saved accounts as individual premium rounded cards, each displaying profile photo, full name as primary text, Login ID as secondary text.
- **Student opens Account Switcher:** Long-press profile avatar, see bottom sheet with all saved accounts as individual premium rounded cards.
- **Student taps saved trusted account:** See selected/pressed state immediately, see short smooth loading/restoring animation, restore account, open Student Dashboard directly without password or PIN prompt.
- **Student performs first login:** Enter Login ID + Password, verify PIN, reach Student Dashboard, choose Save & Exit to preserve trusted session.
- **Student chooses Save & Exit:** Account saved on device with trusted session state preserved.
- **Student explicitly logs out:** Trusted session revoked for that account, next login requires full Login ID + Password → Verify PIN flow.
- **Student switches between multiple saved accounts:** Each account maintains independent session state, authentication state, profile photo, name, and Login ID.
- **App startup/refresh/reload:** Valid saved session restored automatically, show Restoring your session message only during genuine session restoration, open Student Dashboard if valid.

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
│   └── Other Student Portal Pages (Unchanged)
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

### 3.10 Existing Features (Unchanged)

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

### 4.4 Existing Rules (Unchanged)

33. All existing authentication, session management, quiz management, Study AI backend, daily message limits, and other business rules remain unchanged.

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
40. All existing Student Portal functionality not mentioned in enhancements remains unchanged.

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