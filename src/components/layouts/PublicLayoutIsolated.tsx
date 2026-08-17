import React, { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { School, ChevronLeft, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import { SocialMediaBar } from '@/components/common/SocialMediaBar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';

export default function PublicLayoutIsolated() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [portalOrigin, setPortalOrigin] = useState<string | null>(searchParams.get('from'));
  const isHome = location.pathname === ROUTES.PUBLIC.HOME;

  // Detect and clear the query param immediately to handle refresh logic
  useEffect(() => {
    const fromParam = searchParams.get('from');
    if (fromParam) {
      setPortalOrigin(fromParam);
      // Clean URL after capturing the state
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('from');
      const cleanUrl = location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
      window.history.replaceState({}, '', cleanUrl);
    } else {
      // Clear origin state when navigating away to any other page normally
      setPortalOrigin(null);
    }
  }, [location.pathname]);

  const getReturnPath = () => {
    switch(portalOrigin) {
      case 'student-login': return ROUTES.AUTH.STUDENT_LOGIN;
      case 'teacher-login': return ROUTES.AUTH.TEACHER_LOGIN;
      case 'parent-login': return ROUTES.AUTH.PARENT_LOGIN;
      default: return null;
    }
  };

  const returnPath = getReturnPath();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isHome && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="md:hidden">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Link to={ROUTES.PUBLIC.HOME} className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <School className="w-5 h-5 text-primary" />
              </div>
              <span className="hidden sm:inline">RSBS School</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to={ROUTES.PUBLIC.NOTICES} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">{t('nav.notices')}</Link>
            <Link to={ROUTES.PUBLIC.GALLERY} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">{t('nav.gallery')}</Link>
            <Link to={ROUTES.PUBLIC.LEADERSHIP} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">{t('class.teacher')}</Link>
            <Link to={ROUTES.PUBLIC.CONTACT} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            {returnPath && (
              <Button 
                variant="default" 
                size="sm" 
                className="hidden md:flex h-9 rounded-xl font-bold gap-2 animate-in fade-in slide-in-from-right-4"
                onClick={() => navigate(returnPath)}
              >
                Return to Login Page
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            <LanguageSwitcher />
            {/* NO LOGIN OR DASHBOARD BUTTONS HERE - ARCHITECTURAL ISOLATION */}
          </div>
        </div>
        {/* Mobile-only Return to Login Bar */}
        {returnPath && (
          <div className="md:hidden bg-primary/10 px-4 py-2 border-b flex items-center justify-between animate-in slide-in-from-top-full">
             <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Arrived from portal</span>
             <Button 
               variant="link" 
               size="sm" 
               className="h-auto p-0 font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-1"
               onClick={() => navigate(returnPath)}
             >
               Return to Login <ArrowRight className="w-3 h-3" />
             </Button>
          </div>
        )}
      </header>
      <main className="flex-1 overflow-hidden h-full">
        <Outlet />
      </main>
      <footer className="border-t py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <School className="w-5 h-5 text-primary" />
                </div>
                <span>RSBS School</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nurturing young minds through excellence in education, character building, and holistic development.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-foreground">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to={ROUTES.PUBLIC.ABOUT} className="hover:text-primary transition-colors">About Our School</Link></li>
                <li><Link to={ROUTES.PUBLIC.NOTICES} className="hover:text-primary transition-colors">Latest Notices</Link></li>
                <li><Link to={ROUTES.PUBLIC.GALLERY} className="hover:text-primary transition-colors">Event Gallery</Link></li>
                <li><Link to={ROUTES.PUBLIC.LEADERSHIP} className="hover:text-primary transition-colors">Our Leadership</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-foreground">Official Handles</h4>
              <SocialMediaBar className="justify-start" />

            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 RSBS School Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
