import { useState, useEffect, useMemo } from 'react';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Student, Class, Certificate, DocumentTemplate, BrandingSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, GraduationCap, Search, FileText, Download, CheckCircle, Clock, Loader2, Settings2, AlertCircle, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { generateTemplateIDCard } from '@/utils/templateIdCardGenerator';

export default function CertificateGeneratorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'certificate' | 'id_card'>('certificate');

  // ID Card template selection
  const [idCardTemplates, setIdCardTemplates] = useState<DocumentTemplate[]>([]);
  const [frontTemplateId, setFrontTemplateId] = useState<string>('');
  const [backTemplateId,  setBackTemplateId]  = useState<string>('');
  const [branding,        setBranding]        = useState<BrandingSettings | null>(null);
  const [savingTemplates, setSavingTemplates] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    const [studentsRes, classesRes, certsRes, templatesRes, brandingRes] = await Promise.all([
      api.getStudents(),
      api.getClasses(),
      api.getCertificates(),
      api.getDocumentTemplates(),
      api.getBrandingSettings(),
    ]);
    setStudents(studentsRes.data || []);
    setClasses(classesRes.data || []);
    setCertificates(certsRes.data || []);

    // Only keep ID Card type templates in the selector
    const idTemplates = (templatesRes.data || []).filter(t => t.type === 'ID Card');
    setIdCardTemplates(idTemplates);
    setBranding(brandingRes.data ?? null);

    // Restore previously saved template selections from branding settings
    if (brandingRes.data) {
      const b = brandingRes.data as BrandingSettings & {
        id_card_front_template_id?: string;
        id_card_back_template_id?: string;
      };
      if (b.id_card_front_template_id) setFrontTemplateId(b.id_card_front_template_id);
      if (b.id_card_back_template_id)  setBackTemplateId(b.id_card_back_template_id);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const sectionsForSelectedClass = useMemo(() => {
    if (classFilter === 'all') return [];
    const cls = classes.find(c => c.id === classFilter);
    return cls?.sections || [];
  }, [classFilter, classes]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           s.login_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass   = classFilter   === 'all' || s.class_id   === classFilter;
      const matchesSection = sectionFilter === 'all' || s.section_id === sectionFilter;
      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchTerm, classFilter, sectionFilter]);

  /** Save the front/back template selection back to branding_settings */
  const handleSaveTemplateSelection = async () => {
    if (!branding) return;
    setSavingTemplates(true);
    const { error } = await api.updateBrandingSettings(branding.id, {
      id_card_front_template_id: frontTemplateId || null,
      id_card_back_template_id:  backTemplateId  || null,
    } as any);
    if (error) {
      toast.error('Failed to save template selection');
    } else {
      toast.success('ID Card template selection saved');
    }
    setSavingTemplates(false);
  };

  /** Generate certificate or template-based ID card */
  const handleGenerateCertificate = async (studentId: string) => {
    // For ID cards: use the template-driven generator if both templates are selected
    if (activeTab === 'id_card') {
      if (!frontTemplateId || !backTemplateId) {
        toast.error('Please select both a Front Template and a Back Template before generating.');
        return;
      }
      if (!branding) {
        toast.error('Branding settings not loaded. Please refresh and try again.');
        return;
      }
      const frontTemplate = idCardTemplates.find(t => t.id === frontTemplateId);
      const backTemplate  = idCardTemplates.find(t => t.id === backTemplateId);
      if (!frontTemplate || !backTemplate) {
        toast.error('Selected template not found. Please re-select and try again.');
        return;
      }
      const student = students.find(s => s.id === studentId);
      if (!student) return;

    setGenerating(studentId);
    try {
      const pdfBlob = await generateTemplateIDCard({ student, branding, frontTemplate, backTemplate });

      // 1. Upload PDF to Supabase Storage (same bucket/path as the edge-function flow)
      const fileName = `certificates/id_card_${student.login_id}.pdf`;
      const bucketName = 'app_aho9bv0iqbr5_school_images';
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      // 3. Upsert the certificates record so it appears in the admin panel
      const referenceNumber = `ID-${student.login_id}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error: certError } = await (supabase
        .from('certificates') as any)
        .upsert({
          student_id: studentId,
          file_url: publicUrl,
          generated_at: new Date().toISOString(),
          document_type: 'id_card',
          reference_number: referenceNumber,
        }, { onConflict: 'student_id,document_type' });
      if (certError) throw certError;

      // 4. Trigger browser download from the uploaded URL
      const link = document.createElement('a');
      link.href = publicUrl;
      link.download = `ID_Card_${student.verification_id}.pdf`;
      link.click();

      toast.success('ID Card generated and saved successfully');

      // 5. Refresh the certificates list so the row appears immediately
      const certsRes = await api.getCertificates();
      setCertificates(certsRes.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate ID Card');
    } finally {
      setGenerating(null);
    }
      return;
    }

    // Certificate: use existing edge-function flow
    setGenerating(studentId);
    try {
      const { data, error } = await api.generateCertificate(studentId, activeTab);
      if (error) {
        const errorText = await (error as any)?.context?.text();
        throw new Error(errorText || error.message);
      }
      toast.success('Certificate generated successfully');
      const certsRes = await api.getCertificates();
      setCertificates(certsRes.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate certificate');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading student database...</div>;

  const idCardReady = !!frontTemplateId && !!backTemplateId;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <GraduationCap className="w-8 h-8" />
            Student Certificate Generator
          </h1>
          <p className="text-muted-foreground mt-1">Manual certificate generation with automatic profile data fetching.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/branding">
              <Settings2 className="w-4 h-4 mr-2" />
              Branding Settings
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="certificate" value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="grid w-full md:w-[400px] grid-cols-2 h-11 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="certificate" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="id_card" className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="w-4 h-4 mr-2" />
            ID Cards
          </TabsTrigger>
        </TabsList>

        {/* ── ID Card Template Selectors ──────────────────────────────── */}
        {activeTab === 'id_card' && (
          <Card className="mt-4 border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Layers className="w-4 h-4 text-primary" />
                ID Card Template Selection
              </CardTitle>
              <CardDescription>
                Select the Front and Back templates from your Template Studio library.
                These settings are saved automatically and apply to all future ID card generations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {idCardTemplates.length === 0 ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">No ID Card templates found</p>
                    <p className="text-xs mt-0.5">
                      Go to{' '}
                      <Link to="/admin/templates" className="underline font-semibold">Template Studio</Link>
                      {' '}and create at least two ID Card templates (one for the front, one for the back).
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front Template */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Front Template</label>
                      <Select value={frontTemplateId} onValueChange={setFrontTemplateId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="▼ Select Front Template" />
                        </SelectTrigger>
                        <SelectContent>
                          {idCardTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Back Template */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Back Template</label>
                      <Select value={backTemplateId} onValueChange={setBackTemplateId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="▼ Select Back Template" />
                        </SelectTrigger>
                        <SelectContent>
                          {idCardTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveTemplateSelection}
                      disabled={savingTemplates || !frontTemplateId || !backTemplateId}
                      className="font-bold rounded-xl"
                    >
                      {savingTemplates ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                      ) : (
                        'Save Template Selection'
                      )}
                    </Button>

                    {idCardReady ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ready — both templates selected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Select both templates to enable generation
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <Card className="bg-muted/30 border-none shadow-none mt-4">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or ID..."
                  className="pl-10 h-11"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Select value={classFilter} onValueChange={(val) => { setClassFilter(val); setSectionFilter('all'); }}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === 'all'}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sectionsForSelectedClass.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold">No students found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              filteredStudents.map(student => {
                const doc = certificates.find(c => c.student_id === student.id && c.document_type === activeTab);
                const isGenerating = generating === student.id;

                return (
                  <Card key={student.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="flex flex-col md:flex-row items-center p-4 md:p-6 gap-6">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted">
                          {student.profile_picture_url ? (
                            <img src={student.profile_picture_url} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-2xl font-black">
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 text-center md:text-left space-y-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <h3 className="text-xl font-bold text-primary">{student.name}</h3>
                          <Badge variant="outline" className="w-fit mx-auto md:mx-0 font-mono text-xs uppercase tracking-tighter">
                            {student.login_id}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                          Class: {student.class} | Section: {student.section}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5" />
                            Session: {student.session_info}
                          </span>
                          {doc && (
                            <>
                              <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded-md">
                                <FileText className="w-3.5 h-3.5" />
                                Ref: {doc.reference_number}
                              </span>
                              <span className="flex items-center gap-1.5 text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded-md">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Generated: {new Date(doc.generated_at).toLocaleDateString()}
                              </span>
                              <span className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md",
                                (activeTab === 'certificate' ? student.certificate_visible : student.id_card_visible)
                                  ? "text-green-600 bg-green-50"
                                  : "text-amber-600 bg-amber-50"
                              )}>
                                {(activeTab === 'certificate' ? student.certificate_visible : student.id_card_visible)
                                  ? "Visible to Student"
                                  : "Hidden from Student"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        {doc && (
                          <Button variant="outline" className="w-full sm:w-auto font-bold" onClick={() => window.open(doc.file_url, '_blank')}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                        <Button
                          onClick={() => handleGenerateCertificate(student.id)}
                          disabled={isGenerating || (activeTab === 'id_card' && !idCardReady)}
                          className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20 min-w-[160px]"
                          title={activeTab === 'id_card' && !idCardReady ? 'Select both templates first' : undefined}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              {activeTab === 'certificate'
                                ? <FileText className="w-4 h-4 mr-2" />
                                : <CreditCard className="w-4 h-4 mr-2" />}
                              {activeTab === 'id_card' ? 'Generate ID Card' : (doc ? 'Regenerate' : 'Generate')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

