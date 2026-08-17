import * as React from "react"
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  User,
  UserMinus,
  UserPlus,
  CalendarCheck,
  Search,
  Image as ImageIcon,
  CreditCard,
  Layers,
  Clock,
  Layout,
  Database,
  KeyRound,
  PanelsTopLeft,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { Link, useLocation } from "react-router-dom"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { LogoutConfirmation } from "@/components/LogoutConfirmation"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 as CheckCircle } from "lucide-react"

import { ROUTES } from "@/constants/routes"

export function AppSidebar({ role }: { role: 'admin' | 'student' | 'teacher' | 'parent' }) {
  const { profile, isModuleEnabled } = useAuth()
  const location = useLocation()
  const [logoutOpen, setLogoutOpen] = React.useState(false)

  const adminItems = [
    {
      title: "Dashboard",
      url: ROUTES.ADMIN.DASHBOARD,
      icon: LayoutDashboard,
      id: 'dashboard',
    },
    {
      title: "Homepage Manager",
      url: ROUTES.ADMIN.SCHOOL_HOME,
      icon: HomeIcon,
      id: 'school_home',
    },
    {
      title: "Search Ecosystem",
      url: ROUTES.ADMIN.SEARCH,
      icon: Search,
      id: 'dashboard',
    },
    {
      title: "System Administration",
      url: ROUTES.ADMIN.ADMIN_MANAGEMENT,
      icon: ShieldCheck,
      id: 'admin_management',
    },
    {
      title: "Login Integration",
      url: ROUTES.ADMIN.LOGIN_INTEGRATION,
      icon: KeyRound,
      id: 'admin_management',
    },
    {
      title: "Student Panel Content",
      url: ROUTES.ADMIN.STUDENT_PANEL_CONTENT,
      icon: PanelsTopLeft,
      id: 'admin_management',
    },
    {
      title: "API Settings",
      url: ROUTES.ADMIN.API_MANAGEMENT,
      icon: Settings,
      id: 'api_management',
    },
    {
      title: "Classes",
      url: ROUTES.ADMIN.CLASSES,
      icon: Layers,
      id: 'classes',
    },
    {
      title: "Students",
      url: ROUTES.ADMIN.STUDENTS,
      icon: Users,
      id: 'students',
    },
    {
      title: "Pass-Out Students",
      url: ROUTES.ADMIN.ALUMNI,
      icon: UserMinus,
      id: 'students',
    },
    {
      title: "Admissions",
      url: ROUTES.ADMIN.ADMISSIONS,
      icon: UserPlus,
      id: 'students',
    },
    {
      title: "Teachers",
      url: ROUTES.ADMIN.TEACHERS,
      icon: GraduationCap,
      id: 'teachers',
    },
    {
      title: "Parents",
      url: ROUTES.ADMIN.PARENTS,
      icon: User,
      id: 'parents',
    },
    {
      title: "Fees",
      url: ROUTES.ADMIN.FEES,
      icon: CreditCard,
      id: 'fees',
    },
    {
      title: "Attendance",
      url: ROUTES.ADMIN.ATTENDANCE,
      icon: CheckCircle2,
      id: 'attendance',
    },
    {
      title: "Timetable",
      url: ROUTES.ADMIN.TIMETABLE,
      icon: Clock,
      id: 'timetable',
    },
    {
      title: "Exams & Promotion",
      url: ROUTES.ADMIN.EXAMS,
      icon: Calendar,
      id: 'exams',
    },
    {
      title: "Quizzes",
      url: ROUTES.ADMIN.QUIZ,
      icon: BookOpen,
      id: 'quizzes',
    },
    {
      title: "Appointments",
      url: ROUTES.ADMIN.APPOINTMENTS,
      icon: CalendarCheck,
      id: 'queries',
    },
    {
      title: "Student Queries",
      url: ROUTES.ADMIN.QUERIES,
      icon: MessageSquare,
      id: 'queries',
    },
    {
      title: "Notices",
      url: ROUTES.ADMIN.NOTICES,
      icon: Megaphone,
      id: 'notices',
    },
    {
      title: "School Gallery",
      url: ROUTES.ADMIN.GALLERY,
      icon: ImageIcon,
      id: 'gallery',
    },
    {
      title: "Certificates",
      url: ROUTES.ADMIN.CERTIFICATES,
      icon: FileText,
      id: 'certificates',
    },
    {
      title: "Templates",
      url: ROUTES.ADMIN.TEMPLATES,
      icon: Layout,
      id: 'templates',
    },
    {
      title: "AI Management",
      url: ROUTES.ADMIN.AI_MANAGEMENT,
      icon: Sparkles,
      id: 'dashboard',
    },
    {
      title: "System Backup",
      url: ROUTES.ADMIN.BACKUP,
      icon: Database,
      id: 'system_backup',
    },
  ];

  const studentItems = [
    {
      title: "My Dashboard",
      url: ROUTES.STUDENT.DASHBOARD,
      icon: LayoutDashboard,
      id: 'dashboard',
    },
    {
      title: "Study AI",
      url: ROUTES.STUDENT.STUDY_AI,
      icon: Sparkles,
      id: 'study-ai',
    },
    {
      title: "Quizzes",
      url: ROUTES.STUDENT.QUIZ,
      icon: BookOpen,
      id: 'quizzes',
    },
    {
      title: "My Attendance",
      url: ROUTES.STUDENT.ATTENDANCE,
      icon: CheckCircle2,
      id: 'attendance',
    },
    {
      title: "My Timetable",
      url: ROUTES.STUDENT.TIMETABLE,
      icon: Clock,
      id: 'timetable',
    },
    {
      title: "My Fees",
      url: ROUTES.STUDENT.FEES,
      icon: CreditCard,
      id: 'fees',
    },
    {
      title: "Exams",
      url: ROUTES.STUDENT.EXAMS,
      icon: Calendar,
      id: 'exams',
    },
    {
      title: "Notices",
      url: ROUTES.STUDENT.NOTICES,
      icon: Megaphone,
      id: 'notices',
    },
    {
      title: "Gallery",
      url: ROUTES.STUDENT.GALLERY,
      icon: ImageIcon,
      id: 'gallery',
    },
  ]

  const teacherItems = [
    {
      title: "Dashboard",
      url: ROUTES.TEACHER.DASHBOARD,
      icon: LayoutDashboard,
      id: 'dashboard',
    },
    {
      title: "Attendance",
      url: ROUTES.TEACHER.ATTENDANCE,
      icon: CheckCircle2,
      id: 'attendance',
    },
    {
      title: "Timetable",
      url: ROUTES.TEACHER.TIMETABLE,
      icon: Clock,
      id: 'timetable',
    },
    {
      title: "Queries",
      url: ROUTES.TEACHER.QUERIES,
      icon: MessageSquare,
      id: 'queries',
    },
    {
      title: "Profile",
      url: ROUTES.TEACHER.PROFILE,
      icon: User,
      id: 'profile',
    },
  ]

  const parentItems = [
    {
      title: "My Dashboard",
      url: ROUTES.PARENT.DASHBOARD,
      icon: LayoutDashboard,
      id: 'dashboard',
    },
    {
      title: "Attendance",
      url: ROUTES.PARENT.ATTENDANCE,
      icon: CheckCircle2,
      id: 'attendance',
    },
    {
      title: "Fees",
      url: ROUTES.PARENT.FEES,
      icon: CreditCard,
      id: 'fees',
    },
    {
      title: "Settings & Profile",
      url: ROUTES.PARENT.PROFILE,
      icon: User,
      id: 'profile',
    },
  ];

  const filteredItems = React.useMemo(() => {
    if (role === 'student') {
      return studentItems.filter(item => {
        if (item.id === 'dashboard' || item.id === 'study-ai') return true;
        return isModuleEnabled(item.id);
      })
    }
    if (role === 'parent') {
      return parentItems.filter(item => {
        if (item.id === 'profile' || item.id === 'dashboard') return true;
        return isModuleEnabled(item.id);
      });
    }
    if (role === 'teacher') {
      return teacherItems;
    }
    if (!profile) return []
    
    return adminItems.filter(item => {
      // System Backup and API Management are strictly for Master Admins
      if (item.id === 'system_backup' || item.id === 'api_management') return profile.is_master;

      // Dashboard and Homepage Manager are always visible to all admins
      if (item.id === 'dashboard' || item.id === 'school_home') return true;

      // Master Admin Bypass (Requirement 5) - Can see everything, but respects personal toggles
      if (profile.is_master) {
        // System Administration is always visible to Master Admin
        if (item.id === 'admin_management') return true;
        // Other items respect their toggles
        return isModuleEnabled(item.id);
      }

      // System Administration is strictly for admins with admin_management permission
      if (item.id === 'admin_management') {
        return profile.permissions?.includes('admin_management');
      }
      
      // Global enable/disable check
      if (!isModuleEnabled(item.id)) return false

      // Other items based on permissions
      return profile.permissions?.includes(item.id)
    })
  }, [role, profile, adminItems, studentItems, isModuleEnabled])

  const items = filteredItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={role === 'admin' ? "/admin" : "/student"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <School className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-primary">RSBS School</span>
                  <span className="text-xs text-muted-foreground">
                    {role === 'admin' ? 'Admin Panel' : 
                     role === 'teacher' ? 'Teacher Portal' : 
                     role === 'parent' ? 'Parent Portal' : 'Student Portal'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={location.pathname === item.url || (item.url.length > 1 && location.pathname.startsWith(item.url))}
              >
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {profile && (
            <SidebarMenuItem className="px-2 py-2">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-muted/50 border border-muted-foreground/10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none transition-all duration-300">
                <Avatar className="h-8 w-8 rounded-lg border-2 border-primary/20 transition-transform hover:scale-105">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                    {profile.username?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-bold text-foreground truncate max-w-[140px]">
                    {profile.username}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {profile.role === 'admin' && !profile.email_verified ? (
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-black uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50 whitespace-nowrap">
                        <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                        Unverified
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest truncate">
                        {role === 'admin' ? (profile.admin_custom_tag || 'System Administrator') : role === 'teacher' ? 'Faculty Member' : role === 'parent' ? 'Parent Guardian' : 'Enrolled Student'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem className="flex items-center justify-between p-2 gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
            <SidebarMenuButton onClick={() => setLogoutOpen(true)} className="flex-1">
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <LogoutConfirmation 
        open={logoutOpen} 
        onOpenChange={setLogoutOpen} 
        redirectTo={
          role === 'admin' ? '/rsbs-admin-access' : 
          role === 'teacher' ? '/teacher-login' : 
          role === 'parent' ? '/parent/login' : '/student-login'
        } 
      />
    </Sidebar>
  )
}
