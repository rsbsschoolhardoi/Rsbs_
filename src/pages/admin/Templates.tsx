import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { DocumentTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TemplateStudio } from '@/components/template-studio';
import { TemplateGallery } from '@/components/template-studio/TemplateGallery';
import { TemplatePreset } from '@/components/template-studio/templatePresets';
import type { StudioState } from '@/components/template-studio/types';

export default function Templates() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [presetState, setPresetState] = useState<StudioState | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await api.getDocumentTemplates();
    if (error) {
      toast.error('Failed to fetch templates');
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  // "New Template" → open gallery first
  const handleCreate = () => {
    setEditingTemplate(null);
    setPresetState(undefined);
    setIsGalleryOpen(true);
  };

  // Gallery → user selects a preset → open studio with preset data
  const handleGallerySelect = (preset: TemplatePreset) => {
    setPresetState(preset.build());
    setIsGalleryOpen(false);
    setIsStudioOpen(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setPresetState(undefined);
    setIsStudioOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await api.deleteDocumentTemplate(deleteId);
    if (error) {
      toast.error('Failed to delete template');
    } else {
      toast.success('Template deleted successfully');
      fetchTemplates();
    }
    setDeleteId(null);
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Template Gallery ── */
  if (isGalleryOpen) {
    return (
      <TemplateGallery
        onSelect={handleGallerySelect}
        onBack={() => setIsGalleryOpen(false)}
      />
    );
  }

  /* ── Template Studio (full-screen editor) ── */
  if (isStudioOpen) {
    return (
      <TemplateStudio
        template={editingTemplate}
        presetState={presetState}
        onBack={() => { setIsStudioOpen(false); setPresetState(undefined); }}
        onSaved={() => {
          fetchTemplates();
          setIsStudioOpen(false);
          setPresetState(undefined);
        }}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 px-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary uppercase tracking-tighter flex items-center gap-3">
            <Wand2 className="w-9 h-9" />
            Template Studio
          </h1>
          <p className="text-muted-foreground font-medium italic mt-1 ml-1">
            Design school certificates, ID cards, reports and more — visually.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="h-12 px-8 font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-2xl transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search templates by name or type…"
          className="h-14 pl-12 rounded-2xl border-none bg-muted/40 font-medium text-lg shadow-inner"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse border-2 border-dashed border-muted" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-2 border-dashed border-muted bg-transparent rounded-[3rem] py-20 text-center">
          <CardContent className="space-y-4">
            <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-semibold text-muted-foreground uppercase tracking-tight">No Templates Found</p>
              <p className="text-sm text-muted-foreground italic font-medium">
                Start by creating a new template in the studio.
              </p>
            </div>
            <Button variant="outline" onClick={handleCreate} className="mt-4 rounded-xl font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Open Template Studio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => {
            const elementCount =
              template.content_config.header.length +
              template.content_config.body.length +
              template.content_config.footer.length;
            return (
              <Card
                key={template.id}
                className="group border-none shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 bg-background"
              >
                {/* Colour bar */}
                <div className={`h-3 bg-gradient-to-r ${
                  template.type === 'Certificate'           ? 'from-amber-400 to-orange-500' :
                  template.type === 'ID Card'               ? 'from-blue-400 to-indigo-500'  :
                  template.type === 'Result'                ? 'from-emerald-400 to-teal-500'  :
                  template.type === 'Fee Receipt'           ? 'from-rose-400 to-pink-500'    :
                  'from-primary to-primary/60'
                }`} />

                <CardHeader className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <Badge
                        variant="outline"
                        className="mb-2 rounded-lg font-semibold text-xs bg-muted/50 text-muted-foreground border-none"
                      >
                        {template.type}
                      </Badge>
                      <CardTitle className="text-xl font-semibold text-primary leading-tight group-hover:text-primary/80 transition-colors truncate">
                        {template.name}
                      </CardTitle>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-2xl shrink-0 ml-2">
                      <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 py-2 flex-grow">
                  {/* Section badges */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Header', enabled: template.layout_config.header_enabled },
                      { label: 'Body',   enabled: template.layout_config.body_enabled   },
                      { label: 'Footer', enabled: template.layout_config.footer_enabled },
                    ].map(({ label, enabled }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-medium transition-all ${
                          enabled
                            ? 'bg-primary/8 text-primary border border-primary/20'
                            : 'bg-muted/30 text-muted-foreground/50 border border-muted'
                        }`}
                      >
                        {enabled
                          ? <CheckCircle2 className="w-2.5 h-2.5" />
                          : <X className="w-2.5 h-2.5" />}
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-muted/20 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Elements</span>
                    <span className="text-xs font-bold font-mono">{elementCount} Items</span>
                  </div>
                </CardContent>

                <CardFooter className="p-6 bg-muted/10 border-t border-muted/20 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(template)}
                    className="rounded-xl font-bold hover:bg-background h-10 gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Open Studio
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteId(template.id)}
                    className="rounded-xl font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all border-none h-10 shadow-sm shadow-destructive/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-semibold text-destructive uppercase tracking-tighter">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium italic">
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl font-semibold bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
