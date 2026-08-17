import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import type { BrandingSettings, DocumentTemplate } from '@/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptTemplateSelectorProps {
  branding: BrandingSettings | null;
  onChange?: (templateId: string) => void;
  compact?: boolean;
}

export default function ReceiptTemplateSelector({
  branding,
  onChange,
  compact = false,
}: ReceiptTemplateSelectorProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    branding?.fee_receipt_template_id ?? null,
  );

  useEffect(() => {
    setSelectedId(branding?.fee_receipt_template_id ?? null);
  }, [branding?.fee_receipt_template_id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getDocumentTemplates().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        toast.error('Failed to load receipt templates');
        setLoading(false);
        return;
      }
      const feeTemplates = (data ?? []).filter((t) => t.type === 'Fee Receipt');
      setTemplates(feeTemplates);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = async (templateId: string) => {
    setSelectedId(templateId);
    if (!branding?.id) {
      onChange?.(templateId);
      return;
    }
    const { error } = await api.updateBrandingSettings(branding.id, {
      fee_receipt_template_id: templateId,
    });
    if (error) {
      toast.error('Failed to save default receipt template');
      setSelectedId(branding.fee_receipt_template_id ?? null);
      return;
    }
    toast.success('Default receipt template updated');
    onChange?.(templateId);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Default Receipt Template</Label>
          <Select value={selectedId ?? ''} onValueChange={handleSelect} disabled={loading || templates.length === 0}>
            <SelectTrigger className="w-56 h-8 text-sm">
              <SelectValue placeholder={loading ? 'Loading…' : 'Select template'} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Receipt Template
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Fee Receipt templates found. Create one in Template Studio.
          </p>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Default template used for every fee receipt</Label>
            <Select value={selectedId ?? ''} onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a receipt template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
