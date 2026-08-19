import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Outlet, useLocation, Link } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { VerificationRequired } from "@/components/admin/VerificationRequired"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Bell, User, LogOut, Settings, ShieldCheck, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from "motion/react"
import { useMediaQuery } from "@/hooks/use-mobile"
import AdminMobileLayout from "./AdminMobileLayout"

import { ROUTES } from "@/constants/routes"

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // MANDATORY ENFORCEMENT: Block unverified admins from accessing panel
  const isDummyEmail = profile?.email?.endsWith('@miaoda.com');
  const isUnverifiedAdmin = profile?.role === 'admin' && !profile.email_verified && !isDummyEmail && !profile.is_master;
  
  if (isUnverifiedAdmin) {
    return <VerificationRequired />;
  }

  // ── MOBILE: render lightweight emergency layout ───────────────────────────
  if (isMobile) {
    return <AdminMobileLayout />;
  }

  // ── DESKTOP (≥768px): full enterprise sidebar layout ─────────────────────
  const userInitial = profile?.username ? profile.username[0].toUpperCase() : 'A';

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar role="admin" />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Persistent Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-primary-foreground/10 bg-gradient-to-r from-primary to-primary/95 text-primary-foreground backdrop-blur-md sticky top-0 z-40 px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 hover:bg-primary-foreground/10" />
            <Separator orientation="vertical" className="h-5 bg-primary-foreground/20" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={ROUTES.ADMIN.DASHBOARD} className="text-primary-foreground/70 hover:text-primary-foreground">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-primary-foreground/40" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-primary-foreground">
                    {location.pathname.split('/').pop()?.charAt(0).toUpperCase()}
                    {location.pathname.split('/').pop()?.slice(1) || 'Dashboard'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="rounded-lg text-primary-foreground hover:bg-primary-foreground/10 active:scale-95 transition-all">
              <Link to={ROUTES.ADMIN.SEARCH}>
                <Search className="w-[18px] h-[18px]" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => {}} className="rounded-lg relative text-primary-foreground hover:bg-primary-foreground/10 active:scale-95 transition-all">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-accent rounded-full border-2 border-primary" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2 rounded-lg text-primary-foreground hover:bg-primary-foreground/10 active:scale-95 transition-all border border-primary-foreground/30">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-accent/20 text-accent-foreground text-xs font-semibold">{userInitial}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">{profile?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 mt-2 shadow-dropdown">
                <DropdownMenuLabel className="p-3">
                  <p className="text-sm font-semibold truncate">{profile?.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground font-medium">Administrator</p>
                    {profile?.is_master && (
                      <Badge className="h-4 text-xs bg-accent/10 text-accent border-none font-medium">Master</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer text-sm">
                  <Link to={ROUTES.ADMIN.ADMIN_MANAGEMENT} className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Management</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg p-2.5 cursor-pointer text-sm">
                  <Link to={ROUTES.ADMIN.API_MANAGEMENT} className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">API Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-lg p-2.5 cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/5"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="font-medium">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area with Transitions */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-gradient-to-b from-muted/50 via-background to-background scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="mx-auto w-full max-w-7xl p-6 md:p-8 h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
