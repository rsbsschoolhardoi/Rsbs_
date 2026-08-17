import React, { Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, AuthContext } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { ThemeSync } from '@/components/common/ThemeSync';
import { PublicSettingsProvider } from '@/contexts/PublicSettingsContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Layouts
const PublicLayoutIsolated = lazyWithRetry(() => import('@/components/layouts/PublicLayoutIsolated'));
import AdminLayout from '@/components/layouts/AdminLayout';
import StudentLayout from '@/components/layouts/StudentLayout';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import ParentLayout from '@/components/layouts/ParentLayout';

// Pages
const AdminLogin = lazyWithRetry(() => import('@/pages/auth/AdminLogin'));
const AuthCallback = lazyWithRetry(() => import('@/pages/auth/AuthCallback'));
const VerificationRequest = lazyWithRetry(() => import('@/pages/auth/VerificationRequest'));
const Verify = lazyWithRetry(() => import('@/pages/auth/Verify'));
const AdminVerify = Verify; // Reuse the same component for /admin/verify
const Home = lazyWithRetry(() => import('@/pages/public/Home'));
const PublicNotices = lazyWithRetry(() => import('@/pages/public/Notices'));
const PublicLeadership = lazyWithRetry(() => import('@/pages/public/Leadership'));
const PublicAbout = lazyWithRetry(() => import('@/pages/public/About'));
const PublicContact = lazyWithRetry(() => import('@/pages/public/Contact'));
const Gallery = lazyWithRetry(() => import('@/pages/public/Gallery'));
const VerifyStudent = lazyWithRetry(() => import('@/pages/public/VerifyStudent'));
const ChatInterfacePage = lazyWithRetry(() => import('@/pages/public/ChatInterfacePage'));
const ApiConfigPage = lazyWithRetry(() => import('@/pages/public/ApiConfigPage'));

const StudentLogin = lazyWithRetry(() => import('@/pages/auth/StudentLogin'));
const AdminResetPassword = lazyWithRetry(() => import('@/pages/auth/AdminResetPassword'));
const StudentVerifyOTP = lazyWithRetry(() => import('@/pages/auth/StudentVerifyOTP'));
const StudentDashboard = lazyWithRetry(() => import('@/pages/student/Dashboard'));
const AdminDashboard = lazyWithRetry(() => import('@/pages/admin/Dashboard'));
const Classes = lazyWithRetry(() => import('@/pages/admin/Classes'));
const Students = lazyWithRetry(() => import('@/pages/admin/Students'));
const Alumni = lazyWithRetry(() => import('@/pages/admin/Alumni'));
const Fees = lazyWithRetry(() => import('@/pages/admin/Fees'));
const Attendance = lazyWithRetry(() => import('@/pages/admin/Attendance'));
const Exams = lazyWithRetry(() => import('@/pages/admin/Exams'));
const Notices = lazyWithRetry(() => import('@/pages/admin/Notices'));
const AdminGallery = lazyWithRetry(() => import('@/pages/admin/Gallery'));
const Templates = lazyWithRetry(() => import('@/pages/admin/Templates'));
const AdminManagement = lazyWithRetry(() => import('@/pages/admin/AdminManagement'));
const SchoolHome = lazyWithRetry(() => import('@/pages/admin/SchoolHome'));
const AdminQueries = lazyWithRetry(() => import('@/pages/admin/Queries'));
const AdminAdmissions = lazyWithRetry(() => import('@/pages/admin/AdminAdmissions'));
const AdminAppointments = lazyWithRetry(() => import('@/pages/admin/AdminAppointments'));
const AdminSearch = lazyWithRetry(() => import('@/pages/admin/AdminSearch'));
const CertificateGenerator = lazyWithRetry(() => import('@/pages/admin/CertificateGenerator'));
const BrandingSettings = lazyWithRetry(() => import('@/pages/admin/BrandingSettings'));
const Timetable = lazyWithRetry(() => import('@/pages/admin/Timetable'));
const AiManagement = lazyWithRetry(() => import('@/pages/admin/AiManagement'));
const SystemBackup = lazyWithRetry(() => import('@/pages/admin/SystemBackup'));
const ApiManagement = lazyWithRetry(() => import('@/pages/admin/api-management/ApiManagement'));
const LoginIntegration = lazyWithRetry(() => import('@/pages/admin/LoginIntegration'));
const StudentTimetable = lazyWithRetry(() => import('@/pages/student/Timetable'));
const TeacherTimetable = lazyWithRetry(() => import('@/pages/teacher/Timetable'));
const StudentAttendance = lazyWithRetry(() => import('@/pages/student/Attendance'));
const StudentFees = lazyWithRetry(() => import('@/pages/student/Fees'));
const StudentExams = lazyWithRetry(() => import('@/pages/student/Exams'));
const StudentNotices = lazyWithRetry(() => import('@/pages/student/Notices'));
const StudentGallery = lazyWithRetry(() => import('@/pages/student/Gallery'));
const StudentMore = lazyWithRetry(() => import('@/pages/student/More'));
const StudentQueries = lazyWithRetry(() => import('@/pages/student/Queries'));
const StudentStudyAI = lazyWithRetry(() => import('@/pages/student/StudyAI'));
const StudentQuizList = lazyWithRetry(() => import('@/pages/student/quiz/StudentQuizList'));
const QuizPlayer = lazyWithRetry(() => import('@/pages/student/quiz/QuizPlayer'));
const QuizResult = lazyWithRetry(() => import('@/pages/student/quiz/QuizResult'));
const StudentSettings = lazyWithRetry(() => import('@/pages/student/StudentSettings'));
const StudentNotifications = lazyWithRetry(() => import('@/pages/student/StudentNotifications'));
const StudentHelpSupport = lazyWithRetry(() => import('@/pages/student/StudentHelpSupport'));
const StudentPrivacyPolicy = lazyWithRetry(() => import('@/pages/student/StudentPrivacyPolicy'));
const StudentVerifyPIN = lazyWithRetry(() => import('@/pages/auth/StudentVerifyPIN'));
const AdminStudentPanelContent = lazyWithRetry(() => import('@/pages/admin/StudentPanelContent'));

const AdminQuizList = lazyWithRetry(() => import('@/pages/admin/quiz/QuizList'));
const AdminQuizCreate = lazyWithRetry(() => import('@/pages/admin/quiz/QuizCreate'));
const AdminQuizEdit = lazyWithRetry(() => import('@/pages/admin/quiz/QuizEdit'));
const AdminQuizImport = lazyWithRetry(() => import('@/pages/admin/quiz/QuizImport'));
const AdminQuizAnalytics = lazyWithRetry(() => import('@/pages/admin/quiz/QuizAnalytics'));
const AdminQuizPreview = lazyWithRetry(() => import('@/pages/admin/quiz/QuizPreview'));
const TeacherLogin = lazyWithRetry(() => import('@/pages/auth/TeacherLogin'));
const TeacherDashboard = lazyWithRetry(() => import('@/pages/teacher/Dashboard'));
const MarkAttendance = lazyWithRetry(() => import('@/pages/teacher/MarkAttendance'));
const TeacherProfile = lazyWithRetry(() => import('@/pages/teacher/Profile'));
const TeacherAttendance = lazyWithRetry(() => import('@/pages/teacher/Attendance'));
const TeacherNotices = lazyWithRetry(() => import('@/pages/teacher/Notices'));
const TeacherQueries = lazyWithRetry(() => import('@/pages/teacher/Queries'));
const Teachers = lazyWithRetry(() => import('@/pages/admin/Teachers'));
const Parents = lazyWithRetry(() => import('@/pages/admin/Parents'));
const ParentDetail = lazyWithRetry(() => import('@/pages/admin/ParentDetail'));
const ParentLogin = lazyWithRetry(() => import('@/pages/parent/ParentLogin'));
const ParentDashboard = lazyWithRetry(() => import('@/pages/parent/ParentDashboard'));
const ParentFees = lazyWithRetry(() => import('@/pages/parent/ParentFees'));
const ParentAttendance = lazyWithRetry(() => import('@/pages/parent/ParentAttendance'));
const ParentProfile = lazyWithRetry(() => import('@/pages/parent/ParentProfile'));
const ParentMore = lazyWithRetry(() => import('@/pages/parent/ParentMore'));
const Forbidden = lazyWithRetry(() => import('@/pages/Forbidden'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));
import { useLocation } from 'react-router-dom';

const PATH_PERMISSIONS: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/': 'dashboard',
  '/admin/quizzes': 'quizzes',
  '/admin/classes': 'classes',
  '/admin/school-home': 'school_home',
  '/admin/students': 'students',
  '/admin/alumni': 'students',
  '/admin/fees': 'fees',
  '/admin/attendance': 'attendance',
  '/admin/timetable': 'timetable',
  '/admin/exams': 'exams',
  '/admin/notices': 'notices',
  '/admin/queries': 'queries',
  '/admin/gallery': 'gallery',
  '/admin/certificates': 'certificates',
  '/admin/templates': 'templates',
  '/admin/branding': 'certificates',
  '/admin/ai-management': 'dashboard',
  '/admin/backup': 'system_backup',
  '/admin/api-management': 'api_management',
  '/admin/admin-management': 'admin_management',
  '/admin/admissions': 'students',
  '/admin/appointments': 'queries',
  '/admin/search': 'dashboard',
  '/admin/login-integration': 'admin_management',
  '/admin/student-panel-content': 'admin_management',
  '/admin/teachers': 'teachers',
  '/admin/parents': 'parents',
  '/admin/parents/': 'parents',
  '/teacher/attendance': 'attendance',
  '/teacher/timetable': 'timetable',
  '/teacher/notices': 'notices',
  '/teacher/queries': 'queries',
};

const PermissionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = React.useContext(AuthContext);
  const profile = context?.profile;
  const isModuleEnabled = context?.isModuleEnabled;
  const location = useLocation();

  const path = location.pathname;
  const requiredPermission = path.startsWith('/admin/quizzes')
    ? 'quizzes'
    : PATH_PERMISSIONS[path];

  if (context === undefined) return <>{children}</>;

  // Master Admin Priority Bypass (Requirement 5)
  if (profile?.is_master) return <>{children}</>;

  if (requiredPermission && profile?.role === 'admin') {
    // Check global module status
    if (requiredPermission !== 'admin_management' && isModuleEnabled && !isModuleEnabled(requiredPermission)) {
      return <Navigate to="/404" replace />;
    }

    // Requirements update: Granular permission control for Master Admin accounts.
    // Permissions are toggled individually and persist as the source of truth.
    if (profile?.permissions?.includes(requiredPermission)) return <>{children}</>;
    
    // Special case for Admin Management which now holds Admissions and Appointments
    if (requiredPermission === 'admin_management') {
      if (profile?.permissions?.includes('students') || profile?.permissions?.includes('queries')) {
        return <>{children}</>;
      }
    }

    return <Navigate to="/403" replace />;
  }

  // Handle student module routes
  if (path.startsWith('/student/') && isModuleEnabled && profile?.role === 'student') {
    const studentModuleId = path.split('/')[2];
    const accountPages = ['more', 'settings', 'notifications', 'help-support', 'privacy-policy'];
    if (studentModuleId && studentModuleId !== '' && studentModuleId !== 'more' && studentModuleId !== 'study-ai' && studentModuleId !== 'quizzes' && !accountPages.includes(studentModuleId) && !isModuleEnabled(studentModuleId)) {
      return <Navigate to="/404" replace />;
    }
  }

  // Handle teacher module routes
  if (path.startsWith('/teacher/') && isModuleEnabled && profile?.role === 'teacher') {
    const teacherModuleId = path.split('/')[2];
    if (teacherModuleId && teacherModuleId !== '' && teacherModuleId !== 'profile' && !isModuleEnabled(teacherModuleId)) {
      return <Navigate to="/404" replace />;
    }
  }

  return <>{children}</>;
};

const RedirectToDefault: React.FC = () => {
  const context = React.useContext(AuthContext);
  const profile = context?.profile;

  if (!profile) return <Navigate to="/" replace />;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'student') return <Navigate to="/student" replace />;
  if (profile.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (profile.role === 'parent') return <Navigate to="/parent/dashboard" replace />;
  return <Navigate to="/" replace />;
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider
          attribute="class"
          storageKey="theme"
          defaultTheme={localStorage.getItem('theme') ?? 'light'}
          enableSystem={false}
        >
        <AuthProvider>
          <LanguageProvider>
            <PublicSettingsProvider>
            <BrandingProvider>
            <ThemeSync />
            <RouteGuard>
              <IntersectObserver />
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              }>
              <ErrorBoundary>
                <Routes>
                <Route path="/verify" element={<VerifyStudent />} />
                {/* Public Section - Isolated via UI */}
                <Route element={<PublicLayoutIsolated />}>
                  <Route index element={<Home />} />
                  <Route path="gallery" element={<Gallery />} />
                  <Route path="api-config" element={<ApiConfigPage />} />
                  <Route path="ai-chat" element={<ChatInterfacePage />} />
                  <Route path="notices" element={<PublicNotices />} />
                  <Route path="leadership" element={<PublicLeadership />} />
                  <Route path="about" element={<PublicAbout />} />

                  <Route path="contact" element={<PublicContact />} />
                </Route>


                {/* Auth Section */}
                <Route path="student-login" element={<StudentLogin />} />
                <Route path="teacher-login" element={<TeacherLogin />} />
                <Route path="parent/login" element={<ParentLogin />} />
                <Route path="rsbs-admin-access" element={<AdminLogin />} />
                <Route path="admin/verify-request" element={<VerificationRequest />} />
                <Route path="admin/verify" element={<AdminVerify />} />
                <Route path="admin/reset-password" element={<AdminResetPassword />} />
                <Route path="auth/verify" element={<Verify />} />
                <Route path="auth/callback" element={<AuthCallback />} />
                <Route path="verify-pin" element={<StudentVerifyPIN />} />
                <Route path="verify-otp" element={<StudentVerifyOTP />} />

                {/* Parent Portal */}
                <Route path="parent" element={<PermissionGuard><ParentLayout /></PermissionGuard>}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<ParentDashboard />} />
                  <Route path="attendance" element={<ParentAttendance />} />
                  <Route path="fees" element={<ParentFees />} />
                  <Route path="profile" element={<ParentProfile />} />
                  <Route path="more" element={<ParentMore />} />
                </Route>

                {/* Admin Panel */}
                <Route path="admin" element={<PermissionGuard><AdminLayout /></PermissionGuard>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="school-home" element={<SchoolHome />} />
                  <Route path="students" element={<Students />} />
                  <Route path="alumni" element={<Alumni />} />
                  <Route path="teachers" element={<Teachers />} />
                  <Route path="parents" element={<Parents />} />
                  <Route path="parents/:id" element={<ParentDetail />} />
                  <Route path="fees" element={<Fees />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="timetable" element={<Timetable />} />
                  <Route path="exams" element={<Exams />} />
                  <Route path="notices" element={<Notices />} />
                  <Route path="queries" element={<AdminQueries />} />
                  <Route path="gallery" element={<AdminGallery />} />
                  <Route path="templates" element={<Templates />} />
                  <Route path="certificates" element={<CertificateGenerator />} />
                  <Route path="branding" element={<BrandingSettings />} />
                  <Route path="ai-management" element={<AiManagement />} />
                  <Route path="backup" element={<SystemBackup />} />
                  <Route path="api-management" element={<ApiManagement />} />
                  <Route path="admin-management" element={<AdminManagement />} />
                  <Route path="admissions" element={<AdminAdmissions />} />
                  <Route path="appointments" element={<AdminAppointments />} />
                  <Route path="search" element={<AdminSearch />} />
                  <Route path="login-integration" element={<LoginIntegration />} />
                  <Route path="quizzes" element={<AdminQuizList />} />
                  <Route path="quizzes/create" element={<AdminQuizCreate />} />
                  <Route path="quizzes/:id" element={<AdminQuizEdit />} />
                  <Route path="quizzes/:id/import" element={<AdminQuizImport />} />
                  <Route path="quizzes/:id/analytics" element={<AdminQuizAnalytics />} />
                  <Route path="quizzes/:id/preview" element={<AdminQuizPreview />} />
                  <Route path="student-panel-content" element={<AdminStudentPanelContent />} />
                </Route>

                {/* Student Portal */}
                <Route path="student" element={<PermissionGuard><StudentLayout /></PermissionGuard>}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="attendance" element={<StudentAttendance />} />
                  <Route path="timetable" element={<StudentTimetable />} />
                  <Route path="study-ai" element={<StudentStudyAI />} />
                  <Route path="quizzes" element={<StudentQuizList />} />
                  <Route path="quizzes/:id/play" element={<QuizPlayer />} />
                  <Route path="quizzes/result/:id" element={<QuizResult />} />
                  <Route path="fees" element={<StudentFees />} />
                  <Route path="exams" element={<StudentExams />} />
                  <Route path="notices" element={<StudentNotices />} />
                  <Route path="gallery" element={<StudentGallery />} />
                  <Route path="queries" element={<StudentQueries />} />
                  <Route path="more" element={<StudentMore />} />
                  <Route path="settings" element={<StudentSettings />} />
                  <Route path="notifications" element={<StudentNotifications />} />
                  <Route path="help-support" element={<StudentHelpSupport />} />
                  <Route path="privacy-policy" element={<StudentPrivacyPolicy />} />
                  <Route path="verify-pin" element={<StudentVerifyPIN />} />
                </Route>

                {/* Teacher Portal */}
                <Route path="teacher" element={<PermissionGuard><TeacherLayout /></PermissionGuard>}>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="attendance" element={<TeacherAttendance />} />
                  <Route path="timetable" element={<TeacherTimetable />} />
                  <Route path="notices" element={<TeacherNotices />} />
                  <Route path="queries" element={<TeacherQueries />} />
                  <Route path="profile" element={<TeacherProfile />} />
                  <Route path="mark-attendance/:classId/:sectionId" element={<MarkAttendance />} />
                </Route>

                {/* Errors */}
                <Route path="403" element={<Forbidden />} />
                <Route path="404" element={<NotFound />} />
                <Route path="*" element={<RedirectToDefault />} />
              </Routes>
              </ErrorBoundary>
            </Suspense>
            <Toaster />
          </RouteGuard>
            </BrandingProvider>
          </PublicSettingsProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
