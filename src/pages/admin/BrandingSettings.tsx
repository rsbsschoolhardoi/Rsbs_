import { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { BrandingSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// Note: ImageUpload uses plain label/div — not shadcn Form primitives — to avoid the
// "useFormField must be inside <FormField>" error when rendered outside a FormField context.
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Settings, Save, Building2, UserCircle, Stamp, Loader2,
  CheckCircle2, Globe, Phone, Mail, MapPin, Palette,
  BookOpen, FileText, Hash, Eye, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useBranding } from '@/contexts/BrandingContext';

/* ── Zod schema ─────────────────────────────────────────────────────────────── */
const brandingSchema = z.object({
  school_name:               z.string().min(2, 'School name is required'),
  school_short_name:         z.string().optional(),
  school_logo_url:           z.string().optional(),
  school_seal_url:           z.string().optional(),
  principal_name:            z.string().min(2, 'Principal name is required'),
  principal_signature_url:   z.string().optional(),
  school_address:            z.string().optional(),
  school_city:               z.string().optional(),
  school_state:              z.string().optional(),
  school_pin_code:           z.string().optional(),
  school_phone:              z.string().optional(),
  school_email:              z.string().optional(),
  school_website:            z.string().optional(),
  default_academic_session:  z.string().optional(),
  school_motto:              z.string().optional(),
  school_registration_number:z.string().optional(),
  affiliation_number:        z.string().optional(),
  affiliation_board:         z.string().optional(),
  theme_color:               z.string().optional(),
  secondary_color:           z.string().optional(),
  school_footer_text:        z.string().optional(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

/* ── Image upload sub-component ─────────────────────────────────────────────── */
interface ImageUploadProps {
  label: string;
  hint?: string;
  fieldName: keyof BrandingFormValues;
  previewUrl: string;
  uploading: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, field: keyof BrandingFormValues) => void;
  previewClassName?: string;
  icon?: React.ReactNode;
}
function ImageUpload({ label, hint, fieldName, previewUrl, uploading, onChange, previewClassName = 'w-24 h-24', icon }: ImageUploadProps) {
  // Plain div/label — NOT shadcn Form primitives — so this component is safe to use
  // anywhere, including outside a <FormField> context.
  return (
    <div className="space-y-3">
      <label className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <div className="flex flex-col md:flex-row md:items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-dashed">
        <div className={`${previewClassName} rounded-2xl border overflow-hidden bg-background flex items-center justify-center p-2 shrink-0 shadow-inner`}>
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="max-w-full max-h-full object-contain" />
          ) : (
            icon ?? <Building2 className="w-8 h-8 text-muted-foreground opacity-20" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="relative">
            <Input
              type="file" accept="image/*"
              className="h-11 rounded-xl cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              onChange={(e) => onChange(e, fieldName)}
              disabled={!!uploading}
            />
            {uploading === fieldName && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function BrandingSettingsPage() {
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const { refresh: refreshBrandingCtx } = useBranding();

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      school_name: '', school_short_name: '',
      school_logo_url: '', school_seal_url: '',
      principal_name: '', principal_signature_url: '',
      school_address: '', school_city: '', school_state: '', school_pin_code: '',
      school_phone: '', school_email: '', school_website: '',
      default_academic_session: '', school_motto: '',
      school_registration_number: '', affiliation_number: '', affiliation_board: '',
      theme_color: '#3b82f6', secondary_color: '#6366f1',
      school_footer_text: '',
    },
  });

  const watched = form.watch();

  /* fetch */
  const fetchData = async () => {
    setLoading(true);
    const { data } = await api.getBrandingSettings();
    if (data) {
      setSettings(data);
      form.reset({
        school_name:                data.school_name               ?? '',
        school_short_name:          data.school_short_name         ?? '',
        school_logo_url:            data.school_logo_url           ?? '',
        school_seal_url:            data.school_seal_url           ?? '',
        principal_name:             data.principal_name            ?? '',
        principal_signature_url:    data.principal_signature_url   ?? '',
        school_address:             data.school_address            ?? '',
        school_city:                data.school_city               ?? '',
        school_state:               data.school_state              ?? '',
        school_pin_code:            data.school_pin_code           ?? '',
        school_phone:               data.school_phone              ?? '',
        school_email:               data.school_email              ?? '',
        school_website:             data.school_website            ?? '',
        default_academic_session:   data.default_academic_session  ?? '',
        school_motto:               data.school_motto              ?? '',
        school_registration_number: data.school_registration_number?? '',
        affiliation_number:         data.affiliation_number        ?? '',
        affiliation_board:          data.affiliation_board         ?? '',
        theme_color:                data.theme_color               ?? '#3b82f6',
        secondary_color:            data.secondary_color           ?? '#6366f1',
        school_footer_text:         data.school_footer_text        ?? '',
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  /* image upload */
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof BrandingFormValues,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field as string);
    try {
      let fileToUpload = file;

      if (field === 'school_logo_url') {
        const reader = new FileReader();
        const b64: string = await new Promise(res => { reader.onload = () => res(reader.result as string); reader.readAsDataURL(file); });
        const { data: pp, error: ppErr } = await supabase.functions.invoke('preprocess-logo', { body: { imageBase64: b64 } });
        if (ppErr) { const msg = await ppErr.context?.text() || ppErr.message; throw new Error(msg); }
        if (pp?.error) throw new Error(pp.error);
        if (pp?.success && pp?.processedImage) {
          const blob = await (await fetch(pp.processedImage)).blob();
          fileToUpload = new File([blob], `processed-logo-${Date.now()}.png`, { type: 'image/png' });
          toast.info(pp.message || 'Logo preprocessed');
        }
      }

      const ext  = fileToUpload.name.split('.').pop();
      const path = `branding/${field}-${Math.random()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('app_aho9bv0iqbr5_school_images').upload(path, fileToUpload);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('app_aho9bv0iqbr5_school_images').getPublicUrl(path);
      form.setValue(field, publicUrl);
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  /* submit */
  const onSubmit = async (values: BrandingFormValues) => {
    if (!settings) return;
    try {
      const { error } = await api.updateBrandingSettings(settings.id, values);
      if (error) throw error;
      toast.success('Branding settings saved successfully');
      await refreshBrandingCtx();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  /* incomplete branding check for preview */
  const missingFields: string[] = [];
  if (!watched.school_logo_url)         missingFields.push('Logo');
  if (!watched.school_seal_url)         missingFields.push('Seal');
  if (!watched.principal_signature_url) missingFields.push('Principal Signature');
  if (!watched.school_email)            missingFields.push('Email');
  if (!watched.school_phone)            missingFields.push('Phone');
  if (!watched.default_academic_session)missingFields.push('Academic Session');

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse">Loading branding settings…</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
          <Settings className="w-8 h-8" />
          School Branding Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Central identity hub — all templates and documents automatically inherit these values.
        </p>
      </div>

      {/* ── Live Branding Preview ─────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <div className="h-2" style={{ background: `linear-gradient(to right, ${watched.theme_color || '#3b82f6'}, ${watched.secondary_color || '#6366f1'})` }} />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Eye className="w-5 h-5 text-primary" />
            Branding Preview
          </CardTitle>
          <CardDescription>Live preview of your school identity as it will appear on documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border p-6 bg-muted/20 space-y-4">
            {/* Header row: logo + name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {watched.school_logo_url
                  ? <img src={watched.school_logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                  : <Building2 className="w-7 h-7 text-muted-foreground opacity-30" />}
              </div>
              <div className="min-w-0">
                <p className="font-black text-lg leading-tight truncate" style={{ color: watched.theme_color || '#3b82f6' }}>
                  {watched.school_name || 'School Name'}
                </p>
                {watched.school_short_name && (
                  <p className="text-xs text-muted-foreground font-medium">{watched.school_short_name}</p>
                )}
                {watched.school_motto && (
                  <p className="text-xs italic text-muted-foreground mt-0.5">"{watched.school_motto}"</p>
                )}
              </div>
              {/* Seal */}
              <div className="ml-auto w-14 h-14 rounded-full border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {watched.school_seal_url
                  ? <img src={watched.school_seal_url} alt="Seal" className="max-w-full max-h-full object-contain" />
                  : <Stamp className="w-6 h-6 text-muted-foreground opacity-30" />}
              </div>
            </div>

            <Separator />

            {/* Contact row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {[
                { icon: <Mail className="w-3 h-3" />,    val: watched.school_email,   label: 'Email'   },
                { icon: <Phone className="w-3 h-3" />,   val: watched.school_phone,   label: 'Phone'   },
                { icon: <Globe className="w-3 h-3" />,   val: watched.school_website, label: 'Website' },
                { icon: <MapPin className="w-3 h-3" />,  val: [watched.school_city, watched.school_state, watched.school_pin_code].filter(Boolean).join(', ') || watched.school_address, label: 'Location' },
                { icon: <BookOpen className="w-3 h-3" />,val: watched.default_academic_session, label: 'Session'  },
                { icon: <Hash className="w-3 h-3" />,    val: watched.affiliation_number, label: 'Affil.'   },
              ].map(({ icon, val, label }) => (
                <div key={label} className="flex items-start gap-1.5 text-muted-foreground">
                  <span className="mt-0.5 shrink-0">{icon}</span>
                  <span className="truncate">{val || <span className="opacity-40 italic">{label} not set</span>}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Principal sig */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Principal Signature</p>
                <div className="w-28 h-12 rounded-lg border bg-background flex items-center justify-center overflow-hidden shadow-inner">
                  {watched.principal_signature_url
                    ? <img src={watched.principal_signature_url} alt="Signature" className="max-w-full max-h-full object-contain" />
                    : <span className="text-xs text-muted-foreground/40 italic">Not uploaded</span>}
                </div>
                <p className="text-xs text-center mt-1 text-muted-foreground font-medium">{watched.principal_name || 'Principal Name'}</p>
              </div>

              {/* Theme swatches */}
              <div className="ml-auto text-right space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Theme</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-6 h-6 rounded-full border shadow-sm" style={{ background: watched.theme_color || '#3b82f6' }} />
                  <div className="w-6 h-6 rounded-full border shadow-sm" style={{ background: watched.secondary_color || '#6366f1' }} />
                </div>
              </div>
            </div>

            {/* Incomplete warning */}
            {missingFields.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">
                  Incomplete: <span className="font-bold">{missingFields.join(', ')}</span> — templates using these placeholders will show fallback values until filled.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Basic identity */}
          <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Building2 className="w-5 h-5 text-primary" />
                School Identity
              </CardTitle>
              <CardDescription>Core name and branding used across all documents and templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="school_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">School Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} placeholder="Full official school name" className="h-11 rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="school_short_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Short Name <Badge variant="outline" className="ml-1 text-[9px]">Optional</Badge></FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. RSBS" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="school_motto" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">School Motto <Badge variant="outline" className="ml-1 text-[9px]">Optional</Badge></FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Knowledge is Power" className="h-11 rounded-xl" /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="school_registration_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Registration Number <Badge variant="outline" className="ml-1 text-[9px]">Optional</Badge></FormLabel>
                    <FormControl><Input {...field} placeholder="Govt. registration no." className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="default_academic_session" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Default Academic Session</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 2024-2025" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="affiliation_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Affiliation Number</FormLabel>
                    <FormControl><Input {...field} placeholder="Board affiliation no." className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="affiliation_board" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Affiliation Board</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. CBSE, ICSE" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Address */}
          <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <MapPin className="w-5 h-5 text-primary" />
                Contact & Address
              </CardTitle>
              <CardDescription>Used in document headers, footers and verification pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="school_address" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Street Address</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Full street address" className="rounded-xl resize-none" rows={2} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="school_city" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">City</FormLabel>
                    <FormControl><Input {...field} placeholder="City" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="school_state" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">State</FormLabel>
                    <FormControl><Input {...field} placeholder="State" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="school_pin_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">PIN Code</FormLabel>
                    <FormControl><Input {...field} placeholder="000000" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="school_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold flex items-center gap-1"><Phone className="w-3.5 h-3.5" />Phone</FormLabel>
                    <FormControl><Input {...field} placeholder="+91 00000 00000" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="school_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold flex items-center gap-1"><Mail className="w-3.5 h-3.5" />Email</FormLabel>
                    <FormControl><Input {...field} placeholder="info@school.edu" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="school_website" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Website <Badge variant="outline" className="ml-1 text-[9px]">Optional</Badge></FormLabel>
                    <FormControl><Input {...field} placeholder="https://school.edu" className="h-11 rounded-xl" /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Visuals */}
          <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Building2 className="w-5 h-5 text-primary" />
                Logo & Seal
              </CardTitle>
              <CardDescription>Official images used on all document templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload
                label="School Logo"
                hint="Standard: 800×600 px PNG with transparent background. System auto-resizes to template standards."
                fieldName="school_logo_url"
                previewUrl={watched.school_logo_url || ''}
                uploading={uploading}
                onChange={handleFileUpload}
                icon={<Building2 className="w-8 h-8 text-muted-foreground opacity-20" />}
              />
              <ImageUpload
                label="School Seal (Optional)"
                hint="Circular PNG/SVG with transparent background."
                fieldName="school_seal_url"
                previewUrl={watched.school_seal_url || ''}
                uploading={uploading}
                onChange={handleFileUpload}
                icon={<Stamp className="w-8 h-8 text-muted-foreground opacity-20" />}
              />
            </CardContent>
          </Card>

          {/* Principal */}
          <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <UserCircle className="w-5 h-5 text-primary" />
                Principal & Authority
              </CardTitle>
              <CardDescription>Signature and name auto-populate all certificate authority sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="principal_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Principal Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="Full name of principal" className="h-11 rounded-xl" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <ImageUpload
                label="Principal Digital Signature"
                hint="Horizontal PNG with transparent background. Used on all certificates."
                fieldName="principal_signature_url"
                previewUrl={watched.principal_signature_url || ''}
                uploading={uploading}
                onChange={handleFileUpload}
                previewClassName="w-32 h-16"
                icon={<Save className="w-6 h-6 text-muted-foreground opacity-20" />}
              />
            </CardContent>
          </Card>

          {/* Theme & Document */}
          <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Palette className="w-5 h-5 text-primary" />
                Theme & Document Defaults
              </CardTitle>
              <CardDescription>Colors and footer text applied to generated documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="theme_color" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Primary Theme Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input type="color" value={field.value || '#3b82f6'} onChange={e => field.onChange(e.target.value)}
                          className="w-11 h-11 rounded-xl border cursor-pointer p-1" />
                        <Input {...field} placeholder="#3b82f6" className="h-11 rounded-xl font-mono text-sm" />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="secondary_color" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Secondary Theme Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <input type="color" value={field.value || '#6366f1'} onChange={e => field.onChange(e.target.value)}
                          className="w-11 h-11 rounded-xl border cursor-pointer p-1" />
                        <Input {...field} placeholder="#6366f1" className="h-11 rounded-xl font-mono text-sm" />
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="school_footer_text" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Default Document Footer Text
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="e.g. This document is computer generated and does not require a physical signature." className="rounded-xl resize-none" rows={2} />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Incomplete fields summary */}
          {missingFields.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Incomplete branding fields</p>
                <p className="text-xs mt-0.5">
                  The following fields are empty: <strong>{missingFields.join(', ')}</strong>. Templates using these placeholders will show fallback text until the values are provided.
                </p>
              </div>
            </div>
          )}

          {missingFields.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="font-bold text-sm">All branding fields are complete — templates will render with full school identity.</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
              <Save className="w-5 h-5 mr-2" />
              Save Branding Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
