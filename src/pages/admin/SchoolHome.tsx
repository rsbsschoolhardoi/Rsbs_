import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/db/api';
import { SchoolInfo, Leadership, SocialMediaLink } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Edit, Home as HomeIcon, Plus, Trash2, Camera, User, Users, GraduationCap,
  History, Share2, Facebook, Instagram, Youtube, Twitter, Globe, MessageCircle,
  ExternalLink, Eye, EyeOff, Monitor, LayoutTemplate, Megaphone,
  ImageIcon, School, ArrowRight, ChevronRight, Info, CheckCircle2, RefreshCw,
  UserPlus, Calendar, Pencil, Save, X, AlertCircle, BookOpen,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/db/supabase';
import { ImageCropper } from '@/components/ImageCropper';
import { cn } from '@/lib/utils';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const schoolInfoSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  content: z.string().min(5, 'Content is required'),
  is_visible: z.boolean(),
});

const leadershipSchema = z.object({
  type: z.enum(['principal', 'teacher']),
  name: z.string().min(2, 'Name is required'),
  designation: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
  years_of_service: z.string().optional().or(z.literal('')),
  image_url: z.string().optional().or(z.literal('')),
});

const socialMediaSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  url: z.string().url('Must be a valid URL'),
  is_visible: z.boolean(),
});

// ─── Section label map ────────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  introduction: 'Hero / Introduction',
  mission: 'Our Mission',
  highlights: 'School Highlights',
  contact: 'Contact Information',
  foundation_story: 'Foundation Story',
  growth_journey: 'Growth Journey',
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  introduction: <School className="w-4 h-4" />,
  mission: <BookOpen className="w-4 h-4" />,
  highlights: <CheckCircle2 className="w-4 h-4" />,
  contact: <MessageCircle className="w-4 h-4" />,
  foundation_story: <History className="w-4 h-4" />,
  growth_journey: <ArrowRight className="w-4 h-4" />,
};

// ─── Live Preview Component ────────────────────────────────────────────────────
function HomepagePreview({
  schoolInfo,
  leadership,
  socialLinks,
}: {
  schoolInfo: SchoolInfo[];
  leadership: Leadership[];
  socialLinks: SocialMediaLink[];
}) {
  const introduction = schoolInfo.find(s => s.section_key === 'introduction');
  const principal = leadership.find(l => l.type === 'principal');
  const faculty = leadership.filter(l => l.type === 'teacher').slice(0, 2);
  const visibleSocial = socialLinks.filter(l => l.is_visible);

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="w-3 h-3 text-blue-500" />;
      case 'instagram': return <Instagram className="w-3 h-3 text-pink-500" />;
      case 'youtube': return <Youtube className="w-3 h-3 text-red-500" />;
      case 'twitter (x)':
      case 'twitter':
      case 'x': return <Twitter className="w-3 h-3" />;
      case 'whatsapp': return <MessageCircle className="w-3 h-3 text-green-500" />;
      case 'website': return <Globe className="w-3 h-3 text-blue-400" />;
      default: return <Share2 className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-background border rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      {/* Preview header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-xs font-mono text-muted-foreground flex-1 text-center truncate">rsbs-school.com</span>
        <Monitor className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Scrollable mock page */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* Hero card */}
        <div className="rounded-xl bg-primary text-primary-foreground p-4 relative overflow-hidden">
          <div className="relative z-10 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center mb-2">
              <School className="w-4 h-4 text-primary-foreground" />
            </div>
            <p className="font-semibold text-sm leading-tight line-clamp-2">
              {introduction?.title || 'RSBS School'}
            </p>
            <p className="opacity-80 text-xs line-clamp-2 leading-relaxed">
              {introduction?.content?.substring(0, 80) || 'Welcome description goes here...'}
            </p>
            <div className="flex gap-1.5 pt-1">
              <span className="bg-primary-foreground text-primary text-xs font-bold px-2 py-0.5 rounded-full">About Us</span>
              <span className="border border-primary-foreground/40 text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">Contact</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary-foreground/5 rounded-full" />
        </div>

        {/* Get Enrolled */}
        <div>
          <p className="text-xs font-semibold text-foreground border-l-2 border-primary pl-2 mb-1.5">Get Enrolled</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="border rounded-xl p-2 flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-3 h-3 text-primary" />
              </div>
              <span className="font-semibold text-xs leading-tight">Apply for Admission</span>
            </div>
            <div className="border rounded-xl p-2 flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <Calendar className="w-3 h-3 text-info" />
              </div>
              <span className="font-semibold text-xs leading-tight">Book Appointment</span>
            </div>
          </div>
        </div>

        {/* Faculty */}
        {(principal || faculty.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-foreground border-l-2 border-primary pl-2 mb-1.5">Our Faculty</p>
            {principal && (
              <div className="border rounded-xl overflow-hidden flex mb-1.5">
                <div className="w-1/3 aspect-[3/4] bg-muted overflow-hidden">
                  {principal.image_url
                    ? <img src={principal.image_url} className="w-full h-full object-cover" alt={principal.name} />
                    : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground/30" /></div>
                  }
                </div>
                <div className="flex-1 p-2 flex flex-col justify-center gap-0.5">
                  <span className="text-[7px] bg-primary/10 text-primary px-1 rounded font-semibold w-fit">PRINCIPAL</span>
                  <p className="font-semibold text-xs truncate">{principal.name}</p>
                  <p className="text-xs text-muted-foreground italic line-clamp-2">"{principal.message?.substring(0, 40)}..."</p>
                </div>
              </div>
            )}
            {faculty.length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {faculty.map(t => (
                  <div key={t.id} className="rounded-xl bg-muted/30 p-2 text-center">
                    <Avatar className="w-8 h-8 mx-auto mb-1 border-2 border-background">
                      <AvatarImage src={t.image_url || ''} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{t.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-semibold truncate">{t.name}</p>
                    <p className="text-[7px] text-primary truncate">{t.designation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social links */}
        {visibleSocial.length > 0 && (
          <div className="rounded-xl bg-muted/30 p-2 text-center space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Follow Us</p>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {visibleSocial.map(l => (
                <div key={l.id} className="w-6 h-6 rounded-full bg-background border flex items-center justify-center">
                  {getSocialIcon(l.platform)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Visibility Card ──────────────────────────────────────────────────
function SectionCard({
  info,
  onEdit,
  onToggle,
}: {
  info: SchoolInfo;
  onEdit: (info: SchoolInfo) => void;
  onToggle: (info: SchoolInfo) => void;
}) {
  return (
    <Card className={cn(
      'border-2 transition-all duration-200 hover:border-primary/30',
      !info.is_visible && 'opacity-60 bg-muted/20'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              info.is_visible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {SECTION_ICONS[info.section_key] ?? <LayoutTemplate className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm truncate">{info.title}</h3>
                <Badge
                  variant={info.is_visible ? 'default' : 'secondary'}
                  className="text-xs h-4 px-1.5 uppercase font-semibold shrink-0"
                >
                  {info.is_visible ? 'Live' : 'Hidden'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium font-medium">
                {SECTION_LABELS[info.section_key] ?? info.section_key}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{info.content}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={info.is_visible}
              onCheckedChange={() => onToggle(info)}
              className="scale-90"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(info)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SchoolHomeManagement() {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo[]>([]);
  const [leadership, setLeadership] = useState<Leadership[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  const principal = leadership.find(l => l.type === 'principal');
  const teachers = leadership.filter(l => l.type === 'teacher');
  const historyKeys = ['foundation_story', 'growth_journey'];
  const heroKeys = ['introduction'];

  // Dialog states
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isLeadershipDialogOpen, setIsLeadershipDialogOpen] = useState(false);
  const [isSocialDialogOpen, setIsSocialDialogOpen] = useState(false);

  // Editing states
  const [editingInfo, setEditingInfo] = useState<SchoolInfo | null>(null);
  const [editingLeadership, setEditingLeadership] = useState<Leadership | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialMediaLink | null>(null);

  // Image states
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [formFieldUpdater, setFormFieldUpdater] = useState<((url: string) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const infoForm = useForm<z.infer<typeof schoolInfoSchema>>({
    resolver: zodResolver(schoolInfoSchema),
    defaultValues: { title: '', content: '', is_visible: true },
  });

  const leadershipForm = useForm<z.infer<typeof leadershipSchema>>({
    resolver: zodResolver(leadershipSchema),
    defaultValues: { type: 'teacher', name: '', designation: '', message: '', years_of_service: '', image_url: '' },
  });

  const socialForm = useForm<z.infer<typeof socialMediaSchema>>({
    resolver: zodResolver(socialMediaSchema),
    defaultValues: { platform: 'Facebook', url: '', is_visible: true },
  });

  const fetchData = useCallback(async () => {
    const [infoRes, leadRes, socialRes] = await Promise.all([
      api.getAllSchoolInfo(),
      api.getLeadership(),
      api.getSocialMediaLinks(),
    ]);
    setSchoolInfo(infoRes.data || []);
    setLeadership(leadRes.data || []);
    setSocialLinks(socialRes.data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Section Info ──────────────────────────────────────────────────────────
  const handleEditInfo = (info: SchoolInfo) => {
    setEditingInfo(info);
    infoForm.reset({ title: info.title, content: info.content, is_visible: info.is_visible });
    setIsInfoDialogOpen(true);
  };

  const handleToggleVisibility = async (info: SchoolInfo) => {
    try {
      const { error } = await api.updateSchoolInfo(info.id, { is_visible: !info.is_visible });
      if (error) throw error;
      setSchoolInfo(prev => prev.map(s => s.id === info.id ? { ...s, is_visible: !s.is_visible } : s));
      toast.success(`"${info.title}" is now ${!info.is_visible ? 'visible' : 'hidden'}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const onInfoSubmit = async (values: z.infer<typeof schoolInfoSchema>) => {
    if (!editingInfo) return;
    try {
      const { error } = await api.updateSchoolInfo(editingInfo.id, values);
      if (error) throw error;
      toast.success('Section updated successfully');
      setIsInfoDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Social Media ──────────────────────────────────────────────────────────
  const handleOpenSocialDialog = (link?: SocialMediaLink) => {
    if (link) {
      setEditingSocial(link);
      socialForm.reset({ platform: link.platform, url: link.url, is_visible: link.is_visible });
    } else {
      setEditingSocial(null);
      socialForm.reset({ platform: 'Facebook', url: '', is_visible: true });
    }
    setIsSocialDialogOpen(true);
  };

  const onSocialSubmit = async (values: z.infer<typeof socialMediaSchema>) => {
    try {
      if (editingSocial) {
        await api.updateSocialMediaLink(editingSocial.id, values);
        toast.success('Social link updated');
      } else {
        await api.createSocialMediaLink(values);
        toast.success('Social link added');
      }
      setIsSocialDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteSocialLink = async (id: string) => {
    if (!confirm('Delete this social link?')) return;
    try {
      await api.deleteSocialMediaLink(id);
      toast.success('Link deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleSocialVisibility = async (id: string, current: boolean) => {
    try {
      await api.updateSocialMediaLink(id, { is_visible: !current });
      setSocialLinks(prev => prev.map(l => l.id === id ? { ...l, is_visible: !current } : l));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="h-5 w-5 text-info" />;
      case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'youtube': return <Youtube className="h-5 w-5 text-destructive" />;
      case 'twitter (x)':
      case 'twitter':
      case 'x': return <Twitter className="h-5 w-5" />;
      case 'whatsapp': return <MessageCircle className="h-5 w-5 text-success" />;
      case 'website': return <Globe className="h-5 w-5 text-blue-500" />;
      default: return <Share2 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // ── Leadership ────────────────────────────────────────────────────────────
  const handleOpenLeadershipDialog = (item: Leadership | null = null, type: 'principal' | 'teacher' = 'teacher') => {
    setEditingLeadership(item);
    if (item) {
      leadershipForm.reset({
        type: item.type,
        name: item.name,
        designation: item.designation || '',
        message: item.message || '',
        years_of_service: item.years_of_service || '',
        image_url: item.image_url || '',
      });
    } else {
      leadershipForm.reset({ type, name: '', designation: '', message: '', years_of_service: '', image_url: '' });
    }
    setIsLeadershipDialogOpen(true);
  };

  const onLeadershipSubmit = async (values: z.infer<typeof leadershipSchema>) => {
    try {
      if (editingLeadership) {
        await api.updateLeadership(editingLeadership.id, {
          type: values.type,
          name: values.name,
          designation: values.designation || null,
          message: values.message || null,
          years_of_service: values.years_of_service || null,
          image_url: values.image_url || null,
        });
        toast.success('Updated successfully');
      } else {
        if (values.type === 'principal' && leadership.some(l => l.type === 'principal')) {
          toast.error('Only one principal record can exist at a time.');
          return;
        }
        await api.createLeadership({
          type: values.type,
          name: values.name,
          designation: values.designation || null,
          message: values.message || null,
          years_of_service: values.years_of_service || null,
          image_url: values.image_url || null,
          order_index: values.type === 'principal' ? 0 : teachers.length + 1,
        });
        toast.success('Entry created');
      }
      setIsLeadershipDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteLeadership = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await api.deleteLeadership(id);
    toast.success('Entry deleted');
    fetchData();
  };

  const handleCroppedImage = async (blob: Blob) => {
    setCropImageSrc(null);
    setUploading(true);
    try {
      const fileName = `leadership-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('app_aho9bv0iqbr5_school_images')
        .upload(`leadership/${fileName}`, blob, { contentType: 'image/webp', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('app_aho9bv0iqbr5_school_images')
        .getPublicUrl(`leadership/${fileName}`);
      if (formFieldUpdater) {
        formFieldUpdater(publicUrl);
        toast.success('Photo uploaded');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      setFormFieldUpdater(null);
    }
  };

  // ── Derived groups ────────────────────────────────────────────────────────
  const heroSections = schoolInfo.filter(s => heroKeys.includes(s.section_key));
  const contentSections = schoolInfo.filter(s => !historyKeys.includes(s.section_key) && !heroKeys.includes(s.section_key));
  const historySections = schoolInfo.filter(s => historyKeys.includes(s.section_key));

  const visibleCount = schoolInfo.filter(s => s.is_visible).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 gap-0">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <HomeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Homepage Manager</h1>
            <p className="text-sm text-muted-foreground">
              Control every visible section on the public-facing school homepage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Live status pill */}
          <div className="flex items-center gap-1.5 bg-success/10 border border-green-200 text-success rounded-full px-3 py-1 text-xs font-semibold dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {visibleCount} sections live
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(v => !v)}
            className="gap-1.5 rounded-xl h-9"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 rounded-xl h-9">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main Content + Preview ────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-6 pt-5">
        {/* Left: Tabs */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Tabs defaultValue="sections" className="w-full">
            <TabsList className="flex flex-wrap h-auto p-1 bg-muted rounded-xl w-full md:w-fit mb-6">
              <TabsTrigger value="sections" className="flex items-center gap-2 rounded-lg font-bold">
                <LayoutTemplate className="w-4 h-4" /> Sections
              </TabsTrigger>
              <TabsTrigger value="hero" className="flex items-center gap-2 rounded-lg font-bold">
                <School className="w-4 h-4" /> Hero
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 rounded-lg font-bold">
                <History className="w-4 h-4" /> History
              </TabsTrigger>
              <TabsTrigger value="leadership" className="flex items-center gap-2 rounded-lg font-bold">
                <Users className="w-4 h-4" /> Leadership
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2 rounded-lg font-bold">
                <Share2 className="w-4 h-4" /> Social
              </TabsTrigger>
            </TabsList>

            {/* ── SECTIONS TAB ─────────────────────────────────────────── */}
            <TabsContent value="sections" className="space-y-6">
              <div className="flex items-start gap-3 bg-muted/50 border rounded-2xl p-4">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Toggle the <strong>Live</strong> switch to instantly show or hide a section on the homepage.
                  Click <strong>Edit</strong> to update the title and content. Changes reflect immediately on the public site.
                </p>
              </div>

              {/* Hero sections */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-2">
                  <School className="w-3.5 h-3.5" /> Hero Section
                </h3>
                {heroSections.map(info => (
                  <SectionCard key={info.id} info={info} onEdit={handleEditInfo} onToggle={handleToggleVisibility} />
                ))}
              </div>

              <Separator />

              {/* Content sections */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> Content Sections
                </h3>
                {contentSections.map(info => (
                  <SectionCard key={info.id} info={info} onEdit={handleEditInfo} onToggle={handleToggleVisibility} />
                ))}
              </div>

              <Separator />

              {/* History sections */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> History Sections
                </h3>
                {historySections.map(info => (
                  <SectionCard key={info.id} info={info} onEdit={handleEditInfo} onToggle={handleToggleVisibility} />
                ))}
              </div>
            </TabsContent>

            {/* ── HERO TAB ──────────────────────────────────────────────── */}
            <TabsContent value="hero" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <School className="w-5 h-5 text-primary" /> Hero / Introduction
                  </h2>
                  <p className="text-sm text-muted-foreground">The first thing visitors see — school name, tagline, and quick links.</p>
                </div>
              </div>
              {heroSections.map(info => (
                <Card key={info.id} className="border-2 hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">{info.title}</CardTitle>
                        <Badge variant={info.is_visible ? 'default' : 'secondary'} className="text-xs h-4 px-1.5 font-semibold uppercase">
                          {info.is_visible ? 'Live' : 'Hidden'}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-medium font-bold">
                        {SECTION_LABELS[info.section_key]}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={info.is_visible} onCheckedChange={() => handleToggleVisibility(info)} />
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleEditInfo(info)}>
                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">{info.content}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── HISTORY TAB ───────────────────────────────────────────── */}
            <TabsContent value="history" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" /> Legacy & History
                </h2>
                <p className="text-sm text-muted-foreground">Foundation story and growth journey displayed on the public leadership page.</p>
              </div>
              {historySections.map(info => (
                <Card key={info.id} className="border-2 hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{info.title}</CardTitle>
                        <Badge variant={info.is_visible ? 'default' : 'secondary'} className="text-xs h-4 px-1.5 font-semibold uppercase">
                          {info.is_visible ? 'Live' : 'Hidden'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={info.is_visible} onCheckedChange={() => handleToggleVisibility(info)} />
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleEditInfo(info)}>
                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{info.content}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* ── LEADERSHIP TAB ────────────────────────────────────────── */}
            <TabsContent value="leadership" className="space-y-8">
              {/* Principal */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Principal Profile
                  </h2>
                  {!principal && (
                    <Button size="sm" onClick={() => handleOpenLeadershipDialog(null, 'principal')}>
                      <Plus className="w-4 h-4 mr-2" /> Add Principal
                    </Button>
                  )}
                </div>
                {principal ? (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                          <AvatarImage src={principal.image_url || ''} />
                          <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-bold">P</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold">{principal.name}</h3>
                              <p className="text-primary font-medium text-sm">{principal.designation}</p>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleOpenLeadershipDialog(principal, 'principal')}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </Button>
                          </div>
                          <p className="text-muted-foreground italic text-sm line-clamp-3">"{principal.message}"</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed py-10 flex flex-col items-center justify-center text-muted-foreground rounded-2xl">
                    <User className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-sm">No principal profile defined yet.</p>
                  </Card>
                )}
              </section>

              {/* Founding Faculty */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Veteran & Founding Faculty
                  </h2>
                  <Button size="sm" onClick={() => handleOpenLeadershipDialog(null, 'teacher')}>
                    <Plus className="w-4 h-4 mr-2" /> Add Teacher
                  </Button>
                </div>
                {teachers.length === 0 ? (
                  <Card className="border-2 border-dashed py-10 flex flex-col items-center justify-center text-muted-foreground rounded-2xl">
                    <Users className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-sm">No teachers listed yet.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map(teacher => (
                      <Card key={teacher.id} className="group hover:border-primary/40 transition-all overflow-hidden">
                        <div className="h-1.5 bg-primary/10" />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 border shadow-sm">
                              <AvatarImage src={teacher.image_url || ''} />
                              <AvatarFallback className="bg-muted text-primary font-bold">{teacher.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold truncate text-sm">{teacher.name}</h4>
                              <p className="text-xs text-primary font-medium">{teacher.designation}</p>
                              {teacher.years_of_service && (
                                <p className="text-xs text-muted-foreground mt-0.5">{teacher.years_of_service}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">"{teacher.message}"</p>
                          <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenLeadershipDialog(teacher, 'teacher')}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLeadership(teacher.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>

            {/* ── SOCIAL TAB ────────────────────────────────────────────── */}
            <TabsContent value="social" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" /> Social Media Links
                  </h2>
                  <p className="text-sm text-muted-foreground">Manage official social handles shown in the homepage footer.</p>
                </div>
                <Button size="sm" onClick={() => handleOpenSocialDialog()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Add Link
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {socialLinks.map(link => (
                  <Card key={link.id} className={cn('border-2 transition-all', !link.is_visible && 'opacity-60 bg-muted/20')}>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-full bg-background border shrink-0">
                          {getSocialIcon(link.platform)}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm font-bold">{link.platform}</CardTitle>
                          <CardDescription className="text-xs truncate max-w-[120px]">{link.url}</CardDescription>
                        </div>
                      </div>
                      <Switch checked={link.is_visible} onCheckedChange={() => toggleSocialVisibility(link.id, link.is_visible)} />
                    </CardHeader>
                    <CardContent className="flex justify-end gap-2 pt-0">
                      <Button variant="outline" size="sm" onClick={() => handleOpenSocialDialog(link)} className="rounded-lg">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => deleteSocialLink(link.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" asChild className="rounded-lg">
                        <a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {socialLinks.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed rounded-2xl">
                    <Share2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No social media links added yet.</p>
                    <Button variant="link" onClick={() => handleOpenSocialDialog()} className="text-xs mt-1">Add your first link</Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <div className="hidden xl:flex flex-col w-72 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Live Preview</span>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold uppercase">Auto-updates</Badge>
            </div>
            <div className="flex-1 min-h-0 max-h-[680px]">
              <HomepagePreview
                schoolInfo={schoolInfo}
                leadership={leadership}
                socialLinks={socialLinks}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Image Cropper ────────────────────────────────────────────────── */}
      {cropImageSrc && (
      <ImageCropper
          image={cropImageSrc}
          onCropComplete={handleCroppedImage}
          onCancel={() => { setCropImageSrc(null); setFormFieldUpdater(null); }}
        />
      )}

      {/* ── Info Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit: {editingInfo ? (SECTION_LABELS[editingInfo.section_key] ?? editingInfo.section_key) : ''}
            </DialogTitle>
            <DialogDescription>Changes are reflected immediately on the public homepage.</DialogDescription>
          </DialogHeader>
          <Form {...infoForm}>
            <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-4">
              <FormField
                control={infoForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Title</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={infoForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl><Textarea className="h-48 rounded-xl resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={infoForm.control}
                name="is_visible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-bold">Visible on Homepage</FormLabel>
                      <FormDescription>Show this section to public visitors.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInfoDialogOpen(false)} className="rounded-xl gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button type="submit" className="rounded-xl gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Leadership Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isLeadershipDialogOpen} onOpenChange={setIsLeadershipDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingLeadership ? 'Edit' : 'Add'} {leadershipForm.watch('type') === 'principal' ? 'Principal' : 'Teacher'}</DialogTitle>
          </DialogHeader>
          <Form {...leadershipForm}>
            <form onSubmit={leadershipForm.handleSubmit(onLeadershipSubmit)} className="space-y-4">
              <FormField
                control={leadershipForm.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Photo</FormLabel>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-2">
                        <AvatarImage src={field.value || ''} />
                        <AvatarFallback><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setFormFieldUpdater(() => (url: string) => field.onChange(url));
                            const reader = new FileReader();
                            reader.addEventListener('load', () => setCropImageSrc(reader.result as string));
                            reader.readAsDataURL(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? 'Uploading...' : 'Upload Photo'}
                        </Button>
                        <p className="text-xs text-muted-foreground">1:1 aspect ratio recommended.</p>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadershipForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Full name" {...field} className="rounded-xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadershipForm.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{leadershipForm.watch('type') === 'principal' ? 'Designation' : 'Subject / Role'}</FormLabel>
                      <FormControl><Input placeholder="e.g. Principal / Math HOD" {...field} className="rounded-xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {leadershipForm.watch('type') === 'teacher' && (
                <FormField
                  control={leadershipForm.control}
                  name="years_of_service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Service (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. 15 Years" {...field} className="rounded-xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={leadershipForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{leadershipForm.watch('type') === 'principal' ? 'Principal Message' : 'Short Quote / Contribution'}</FormLabel>
                    <FormControl><Textarea className="h-28 rounded-xl resize-none" placeholder="Write message here..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsLeadershipDialogOpen(false)} className="rounded-xl gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button type="submit" className="rounded-xl gap-2">
                  <Save className="w-4 h-4" /> Save Entry
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Social Media Dialog ───────────────────────────────────────────── */}
      <Dialog open={isSocialDialogOpen} onOpenChange={setIsSocialDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSocial ? 'Edit Social Link' : 'Add Social Link'}</DialogTitle>
            <DialogDescription>Add a direct link to your official school social media page.</DialogDescription>
          </DialogHeader>
          <Form {...socialForm}>
            <form onSubmit={socialForm.handleSubmit(onSocialSubmit)} className="space-y-4">
              <FormField
                control={socialForm.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="YouTube">YouTube</SelectItem>
                          <SelectItem value="Twitter (X)">Twitter (X)</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={socialForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link URL</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} className="rounded-xl" /></FormControl>
                    <FormDescription>Must start with https://</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={socialForm.control}
                name="is_visible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Public Visibility</FormLabel>
                      <FormDescription>Hide to keep the link saved but not shown.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSocialDialogOpen(false)} className="rounded-xl gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button type="submit" className="rounded-xl gap-2">
                  <Save className="w-4 h-4" /> Save Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

