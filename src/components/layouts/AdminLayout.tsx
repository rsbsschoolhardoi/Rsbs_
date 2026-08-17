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
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={ROUTES.ADMIN.DASHBOARD}>Admin Panel</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {location.pathname.split('/').pop()?.charAt(0).toUpperCase()}
                    {location.pathname.split('/').pop()?.slice(1) || 'Dashboard'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-muted active:scale-95 transition-all">
              <Link to={ROUTES.ADMIN.SEARCH}>
                <Search className="w-5 h-5 text-muted-foreground" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => {}} className="rounded-full relative hover:bg-muted active:scale-95 transition-all">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-1 h-auto rounded-full hover:bg-muted active:scale-95 transition-all border border-muted">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">{userInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 mt-2 shadow-2xl">
                <DropdownMenuLabel className="p-3">
                  <p className="text-sm font-black truncate uppercase tracking-widest">{profile?.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-wider">ADMINISTRATOR</p>
                    {profile?.is_master && (
                      <Badge className="h-4 text-[8px] bg-primary/10 text-primary border-none font-black uppercase">Master</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer">
                  <Link to={ROUTES.ADMIN.ADMIN_MANAGEMENT} className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase">Management</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl p-3 cursor-pointer">
                  <Link to={ROUTES.ADMIN.API_MANAGEMENT} className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase">API Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-xl p-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="font-black text-xs uppercase tracking-widest">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area with Transitions */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-slate-50/50 dark:bg-background/50 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="mx-auto w-full max-w-7xl p-10 pt-10 h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
