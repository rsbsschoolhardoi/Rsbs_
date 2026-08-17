import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogOut, 
  Image as ImageIcon, 
  School, 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  Bell, 
  User, 
  Moon, 
  Sun,
  ChevronRight,
  Globe,
  Clock,
  Megaphone
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { LogoutConfirmation } from '@/components/LogoutConfirmation';
import { ChangePINDialog } from '@/components/auth/ChangePINDialog';
import { useLanguage } from '@/contexts/LanguageContext';

export default function More() {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [pinDialogOpen, setPinDialogOpen] = React.useState(false);

  const menuGroups = [
    {
      title: "Academic & Schedule",
      items: [
        { label: "Class Timetable", icon: Clock, url: "/student/timetable" },
        { label: "Exam Dates", icon: Megaphone, url: "/student/exams" },
      ]
    },
    {
      title: "Content & Media",
      items: [
        { label: t('nav.gallery'), icon: ImageIcon, url: "/student/gallery" },
        { label: "School Info", icon: School, url: "/" },
      ]
    },
    {
      title: "Settings & Support",
      items: [
        { label: "Notification Settings", icon: Bell, url: ROUTES.STUDENT.NOTIFICATION_SETTINGS },
        { label: t('nav.settings'), icon: Settings, url: ROUTES.STUDENT.SETTINGS },
        { label: "Help & Support", icon: HelpCircle, url: ROUTES.STUDENT.HELP_SUPPORT },
        { label: "Privacy Policy", icon: ShieldCheck, url: ROUTES.STUDENT.PRIVACY_POLICY },
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-none md:max-w-4xl mx-auto px-4 pb-12">
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Account & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and app preferences.</p>
      </div>

      {/* User Mini Profile */}
      <Card className="border-none bg-primary/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {profile?.username?.[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-primary">{profile?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{group.title}</h2>
            <Card className="border-none shadow-sm divide-y">
              {group.items.map((item, i) => (
                <Link key={i} to={item.url} className="flex items-center justify-between p-4 active:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </Card>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Security</h2>
        <Card className="border-none shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Security PIN</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPinDialogOpen(true)} className="rounded-lg text-[10px] font-bold uppercase tracking-widest">
            Change PIN
          </Button>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">App Preference</h2>
        <div className="grid grid-cols-1 gap-3">
          <Card className="border-none shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Sun className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t('settings.theme')}</span>
            </div>
            <ThemeToggle />
          </Card>
          <Card className="border-none shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t('settings.language')}</span>
            </div>
            <LanguageSwitcher />
          </Card>
        </div>
      </div>

      <Button 
        variant="destructive" 
        className="w-full h-12 rounded-xl text-sm font-bold shadow-md shadow-destructive/10"
        onClick={() => setLogoutOpen(true)}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      <LogoutConfirmation 
        open={logoutOpen} 
        onOpenChange={setLogoutOpen} 
        redirectTo="/student-login" 
      />

      <ChangePINDialog 
        open={pinDialogOpen} 
        onOpenChange={setPinDialogOpen} 
      />
    </div>
  );
}
