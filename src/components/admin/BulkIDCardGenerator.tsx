import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { generateTemplateIDCard } from '@/utils/templateIdCardGenerator';
import type { Student, Class, BrandingSettings, DocumentTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileArchive, Loader2, School, Users, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { toast } from 'sonner';

type BulkScope =
  | 'entire_school'
  | 'single_class'
  | 'single_section'
  | 'class_section'
  | 'multiple_classes'
  | 'multiple_sections'
  | 'custom';

interface BulkIDCardGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  classes: Class[];
  branding: BrandingSettings;
  frontTemplate: DocumentTemplate | null;
  backTemplate: DocumentTemplate | null;
}

interface FlatSection {
  className: string;
  sectionName: string;
}

function safeName(name: string): string {
  return name.replace(/[^\w\s\-_]/g, '').replace(/\s+/g, ' ').trim();
}

function studentFileName(student: Student): string {
  const rollOrId = student.roll_number?.trim() || student.login_id;
  return `${safeName(student.name)}-${rollOrId}-ID-Card.pdf`;
}

export default function BulkIDCardGenerator({
  open,
  onOpenChange,
  students,
  classes,
  branding,
  frontTemplate,
  backTemplate,
}: BulkIDCardGeneratorProps) {
  const [scope, setScope] = useState<BulkScope>('entire_school');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);

  const allClassNames = useMemo(() => {
    const names = new Set<string>();
    classes.forEach(c => names.add(c.name));
    students.forEach(s => { if (s.class) names.add(s.class); });
    return Array.from(names).sort();
  }, [classes, students]);

  const allSections = useMemo<FlatSection[]>(() => {
    const list: FlatSection[] = [];
    classes.forEach(c => {
      c.sections.forEach(s => list.push({ className: c.name, sectionName: s.name }));
    });
    return list;
  }, [classes]);

  const allSectionNames = useMemo(() => {
    const names = new Set<string>();
    allSections.forEach(s => names.add(s.sectionName));
    students.forEach(s => { if (s.section) names.add(s.section); });
    return Array.from(names).sort();
  }, [allSections, students]);

  const targetStudents = useMemo(() => {
    if (scope === 'entire_school') return students;
    if (scope === 'single_class') return students.filter(s => s.class === selectedClass);
    if (scope === 'single_section') return students.filter(s => s.class === selectedClass && s.section === selectedSection);
    if (scope === 'class_section') return students.filter(s => s.class === selectedClass && s.section === selectedSection);
    if (scope === 'multiple_classes') return students.filter(s => selectedClasses.includes(s.class));
    if (scope === 'multiple_sections') return students.filter(s => s.section && selectedSections.includes(s.section));
    if (scope === 'custom') return students.filter(s => customIds.includes(s.id));
    return [];
  }, [scope, students, selectedClass, selectedSection, selectedClasses, selectedSections, customIds]);

  const filteredCustomStudents = useMemo(() => {
    if (scope !== 'custom') return [];
    const term = searchTerm.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.login_id.toLowerCase().includes(term) ||
      s.class?.toLowerCase().includes(term) ||
      s.section?.toLowerCase().includes(term)
    );
  }, [scope, students, searchTerm]);

  useEffect(() => {
    if (open) {
      setScope('entire_school');
      setSelectedClass('');
      setSelectedSection('');
      setSelectedClasses([]);
      setSelectedSections([]);
      setCustomIds([]);
      setSearchTerm('');
      setGenerating(false);
      setProgress(0);
      setTotalToGenerate(0);
    }
  }, [open]);

  const toggleClass = (name: string) => {
    setSelectedClasses(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleSection = (name: string) => {
    setSelectedSections(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleStudent = (id: string) => {
    setCustomIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const canGenerate = targetStudents.length > 0 && !generating;

  const handleGenerate = async () => {
    if (!frontTemplate || !backTemplate) {
      toast.error('ID Card templates not configured. Please select front and back templates in Certificate Generator.');
      return;
    }
    if (targetStudents.length === 0) {
      toast.error('No students selected for bulk generation.');
      return;
    }

    setGenerating(true);
    setTotalToGenerate(targetStudents.length);
    setProgress(0);
    const zip = new JSZip();
    const failed: string[] = [];

    try {
      for (let i = 0; i < targetStudents.length; i++) {
        const student = targetStudents[i];
        try {
          const blob = await generateTemplateIDCard({
            student,
            branding,
            frontTemplate,
            backTemplate,
          });
          const className = safeName(student.class || 'No Class');
          const sectionName = safeName(student.section || '');
          const fileName = studentFileName(student);
          const folderPath = sectionName
            ? `${className}/${sectionName}/${fileName}`
            : `${className}/${fileName}`;
          zip.file(folderPath, blob);
        } catch (e) {
          console.error('Failed to generate ID card for', student.name, e);
          failed.push(student.name);
        }
        setProgress(i + 1);
      }

      if (failed.length === targetStudents.length) {
        toast.error('Failed to generate all ID cards.');
        setGenerating(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `ID-Cards-${scope.replace(/_/g, '-')}-${timestamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      if (failed.length > 0) {
        toast.warning(`Generated ${targetStudents.length - failed.length} cards. Failed for ${failed.join(', ')}`);
      } else {
        toast.success(`Generated ${targetStudents.length} ID cards and packaged into ZIP.`);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate bulk ID cards');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-primary" />
            Bulk ID Card Generation
          </DialogTitle>
          <DialogDescription>
            Generate ID cards for multiple students and download them as a ZIP archive.
          </DialogDescription>
        </DialogHeader>

        {(!frontTemplate || !backTemplate) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-amber-200 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ID Card front/back templates are not selected. Configure them in the Certificate Generator page.</span>
          </div>
        )}

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Select scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as BulkScope)} className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="entire_school" id="scope-entire" />
                <Label htmlFor="scope-entire" className="text-sm font-normal cursor-pointer">Entire School</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single_class" id="scope-class" />
                <Label htmlFor="scope-class" className="text-sm font-normal cursor-pointer">Single Class</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single_section" id="scope-section" />
                <Label htmlFor="scope-section" className="text-sm font-normal cursor-pointer">Single Section</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="class_section" id="scope-class-section" />
                <Label htmlFor="scope-class-section" className="text-sm font-normal cursor-pointer">Class + Section</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="multiple_classes" id="scope-multi-class" />
                <Label htmlFor="scope-multi-class" className="text-sm font-normal cursor-pointer">Multiple Classes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="multiple_sections" id="scope-multi-section" />
                <Label htmlFor="scope-multi-section" className="text-sm font-normal cursor-pointer">Multiple Sections</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="scope-custom" />
                <Label htmlFor="scope-custom" className="text-sm font-normal cursor-pointer">Custom Student Selection</Label>
              </div>
            </RadioGroup>
          </div>

          {(scope === 'single_class' || scope === 'single_section' || scope === 'class_section') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <select
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Select class</option>
                  {allClassNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {(scope === 'single_section' || scope === 'class_section') && (
                <div className="space-y-1">
                  <Label className="text-xs">Section</Label>
                  <select
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                    disabled={!selectedClass}
                  >
                    <option value="">Select section</option>
                    {allSections
                      .filter(s => s.className === selectedClass)
                      .map(s => s.sectionName)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {scope === 'multiple_classes' && (
            <div className="space-y-2">
              <Label className="text-xs">Select classes</Label>
              <div className="flex flex-wrap gap-2">
                {allClassNames.map(c => (
                  <Badge
                    key={c}
                    variant={selectedClasses.includes(c) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleClass(c)}
                  >
                    <CheckCircle2 className={`w-3 h-3 mr-1 ${selectedClasses.includes(c) ? 'visible' : 'invisible'}`} />
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {scope === 'multiple_sections' && (
            <div className="space-y-2">
              <Label className="text-xs">Select sections</Label>
              <div className="flex flex-wrap gap-2">
                {allSectionNames.map(s => (
                  <Badge
                    key={s}
                    variant={selectedSections.includes(s) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleSection(s)}
                  >
                    <CheckCircle2 className={`w-3 h-3 mr-1 ${selectedSections.includes(s) ? 'visible' : 'invisible'}`} />
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {scope === 'custom' && (
            <div className="space-y-2 border rounded-lg p-3">
              <Label className="text-xs">Select students ({customIds.length} selected)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students…"
                  className="pl-8 h-8 text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 space-y-1">
                  {filteredCustomStudents.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleStudent(s.id)}
                    >
                      <Checkbox checked={customIds.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.login_id} · {s.class}{s.section ? ` – ${s.section}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{targetStudents.length}</span> student{targetStudents.length === 1 ? '' : 's'} will be processed
            </span>
          </div>

          {generating && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Generating cards…</span>
                <span>{progress} / {totalToGenerate}</span>
              </div>
              <Progress value={totalToGenerate ? (progress / totalToGenerate) * 100 : 0} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={!canGenerate}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><FileArchive className="w-4 h-4 mr-2" /> Generate ZIP</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
