import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Notice, SchoolInfo, Leadership, GalleryItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Megaphone, 
  Calendar, 
  School, 
  Phone, 
  Award, 
  ArrowRight, 
  Users, 
  GraduationCap, 
  Info,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  UserPlus,
  ClipboardList
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicSettings } from '@/contexts/PublicSettingsContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AdmissionForm from '@/components/AdmissionForm';
import AppointmentForm from '@/components/AppointmentForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SocialMediaBar } from '@/components/common/SocialMediaBar';

import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const { isModuleEnabled } = usePublicSettings();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [leadership, setLeadership] = useState<Leadership[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    const [noticeRes, leadRes, infoRes, galleryRes] = await Promise.all([
      api.getPublicNotices(),
      api.getLeadership(),
      api.getSchoolInfo(),
      api.getGallery(),
    ]);
    setNotices(noticeRes.data.slice(0, 3));
    setLeadership(leadRes.data);
    setSchoolInfo(infoRes.data);
    setGallery(galleryRes.data.slice(0, 4));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getInfoByKey = (key: string) => schoolInfo.find(info => info.section_key === key);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-40 w-full bg-muted rounded-[2.5rem]" />
        <Skeleton className="h-60 w-full bg-muted rounded-[2.5rem]" />
      </div>
    );
  }

  const introduction = getInfoByKey('introduction');
  const principal = leadership.find(l => l.type === 'principal');
  const faculty = leadership.filter(l => l.type === 'teacher').slice(0, 4);

  return (
    <div className="flex flex-col space-y-10 pb-32 px-4 pt-4 overflow-y-auto no-scrollbar scroll-smooth bg-background text-foreground">
      {/* Hero Card */}
      <Card className="border-none bg-primary text-primary-foreground overflow-hidden relative rounded-[2.5rem] shadow-xl shrink-0">
        <CardContent className="p-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <School className="w-6 h-6 text-primary-foreground" />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchData} 
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">{introduction?.title || 'RSBS School'}</h1>
              <p className="text-sm opacity-90 leading-relaxed max-w-[240px] text-primary-foreground/80">
                {introduction?.content?.substring(0, 100)}...
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-full px-6 font-bold shadow-sm">
                <Link to="/about">About Us</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 rounded-full px-6 font-bold shadow-sm">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-x-1/4 translate-y-1/4" />
        </CardContent>
      </Card>

      {/* Announcements Section */}
      {isModuleEnabled('notices') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground border-l-4 border-primary pl-3">Announcements</h2>
            <Link to="/notices" className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {notices.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No active notices.</p>
            ) : (
              notices.map((notice) => (
                <Card key={notice.id} className={`border-none shadow-sm rounded-2xl overflow-hidden ${notice.is_blue_tag ? 'bg-primary/5 border-l-4 border-l-primary' : 'bg-muted/30'}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-primary leading-tight">{notice.title}</h3>
                      <span className="text-[9px] text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded shrink-0">
                        {new Date(notice.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notice.content}
                    </p>
                    {notice.is_blue_tag && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-none text-[9px] h-4">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Verified Post
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      )}

      {/* Admissions & Appointment Section - Action Buttons */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground border-l-4 border-primary pl-3">Get Enrolled Today</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Admission Card */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="border shadow-md rounded-[2.5rem] bg-card overflow-hidden hover:shadow-lg transition-all cursor-pointer group active:scale-95">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-foreground">Apply for Admission</h3>
                    <p className="text-xs text-muted-foreground font-medium">New student registration for 2026 session.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black text-primary">Admission Enquiry</DialogTitle>
                  <p className="text-sm text-muted-foreground font-medium">Please fill in the details below accurately.</p>
                </div>
              </DialogHeader>
              <div className="p-8 pt-6 overflow-y-auto no-scrollbar max-h-[85vh]">
                <AdmissionForm onCancel={() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); }} onSuccess={() => { setTimeout(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); navigate('/'); }, 2000); }} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Appointment Card */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="border shadow-md rounded-[2.5rem] bg-card overflow-hidden hover:shadow-lg transition-all cursor-pointer group active:scale-95">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-foreground">Book Appointment</h3>
                    <p className="text-xs text-muted-foreground font-medium">Schedule a visit to our campus today.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black text-blue-600">Book an Appointment</DialogTitle>
                  <p className="text-sm text-muted-foreground font-medium">Choose your preferred date and time for visit.</p>
                </div>
              </DialogHeader>
              <div className="p-8 pt-6 overflow-y-auto no-scrollbar max-h-[85vh]">
                <AppointmentForm onCancel={() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); }} onSuccess={() => { setTimeout(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); navigate('/'); }, 2000); }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Our Faculty Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground border-l-4 border-primary pl-3">Our Faculty</h2>
          <Link to="/leadership" className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
            Full List <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {principal && (
            <Card className="border shadow-md rounded-[2.5rem] overflow-hidden group bg-card">
              <CardContent className="p-0 flex flex-row">
                <div className="w-1/3 aspect-[3/4] overflow-hidden bg-muted">
                  <img src={principal.image_url || ''} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" alt={principal.name} />
                </div>
                <div className="w-2/3 p-6 flex flex-col justify-center space-y-2">
                  <Badge className="w-fit h-5 text-[8px] bg-primary/10 text-primary border-none uppercase tracking-widest font-black">The Principal</Badge>
                  <h3 className="text-base font-black text-foreground">{principal.name}</h3>
                  <p className="text-[10px] italic text-muted-foreground line-clamp-4 leading-relaxed border-l-2 border-primary/20 pl-3">"{principal.message}"</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {faculty.map((teacher) => (
              <Card key={teacher.id} className="border-none shadow-sm bg-muted/30 rounded-[2rem] p-5 text-center hover:bg-muted/50 transition-colors">
                <Avatar className="w-14 h-14 mx-auto mb-3 border-4 border-background shadow-md">
                  <AvatarImage src={teacher.image_url || ''} />
                  <AvatarFallback className="bg-primary/5 text-primary text-sm font-black">{teacher.name[0]}</AvatarFallback>
                </Avatar>
                <h4 className="text-xs font-black truncate text-foreground">{teacher.name}</h4>
                <p className="text-[9px] text-primary font-bold truncate uppercase tracking-widest mt-1">{teacher.designation}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground border-l-4 border-primary pl-3">School Gallery</h2>
          <Link to="/gallery" className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gallery.length === 0 ? (
            <p className="col-span-2 text-center text-xs text-muted-foreground py-8">No photos yet.</p>
          ) : (
            gallery.map((item) => (
              <div key={item.id} className="aspect-square rounded-[2rem] overflow-hidden shadow-sm">
                <img src={item.image_url} alt={item.event_name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground border-l-4 border-primary pl-3">About RSBS</h2>
        </div>
        <Card className="border-none shadow-sm bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] p-8 space-y-5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 shadow-inner">
              <Info className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Our Legacy</h3>
              <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider mt-0.5">Established 2010</p>
            </div>
          </div>
          <p className="text-sm text-indigo-900/80 dark:text-indigo-100/70 leading-relaxed italic font-medium">
            "Dedicated to nurturing young minds with a blend of traditional values and modern innovation."
          </p>
          <Button asChild variant="secondary" className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 rounded-full h-10 px-6 font-bold text-[10px] uppercase tracking-widest shadow-md">
            <Link to="/about">Learn More <ArrowRight className="w-3 h-3 ml-2" /></Link>
          </Button>
        </Card>
      </section>

      {/* Footer Quick Card */}
      <Card className="border-none bg-muted/30 rounded-[2.5rem] p-10 text-center space-y-8 shrink-0">
        <div className="space-y-4">
          <div className="w-16 h-1 bg-primary/20 mx-auto rounded-full mb-4" />
          <h2 className="text-2xl font-black text-foreground tracking-tight">Need Assistance?</h2>
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">Our support team is ready to help with any school-related queries.</p>
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Follow Us</p>
            <SocialMediaBar className="justify-center" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild className="rounded-full h-14 bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Link to="/contact">Get in Touch</Link>
          </Button>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] pt-4">© 2026 RSBS SCHOOL SYSTEM</p>
        </div>
      </Card>
    </div>
  );
}
