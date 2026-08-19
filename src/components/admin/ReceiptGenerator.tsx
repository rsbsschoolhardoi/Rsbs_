import { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Student, ExtraFee, FeePayment, BrandingSettings, DocumentTemplate, FeeReceiptData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Receipt, Printer, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';
import { generateTemplateDocumentPDF } from '@/utils/templateDocumentGenerator';

function getCurrentSession(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

interface ReceiptGeneratorProps {
  student: Student;
  branding: BrandingSettings;
  receiptTemplateId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceiptCreated?: () => void;
  masterFeeTotal?: number;
}

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Bank Draft', 'Online Transfer', 'Other'];

const inr = (n: number): string => `\u20B9${Math.max(0, n).toLocaleString('en-IN')}`;

export default function ReceiptGenerator({
  student,
  branding,
  receiptTemplateId,
  open,
  onOpenChange,
  onReceiptCreated,
  masterFeeTotal,
}: ReceiptGeneratorProps) {
  const { profile } = useAuth();
  const currentSession = getCurrentSession();

  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');

  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<{
    id: string;
    receipt_number: string;
    pdf_url?: string;
    period_type?: string;
    period_value?: string;
    period_months?: string[];
  } | null>(null);

  const [corePayments, setCorePayments] = useState<FeePayment[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [corePaidTotal, setCorePaidTotal] = useState(0);

  const [receiptTemplate, setReceiptTemplate] = useState<DocumentTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [feeReceipts, setFeeReceipts] = useState<any[]>([]);

  const receiptedIds = new Set<string>(
    feeReceipts.flatMap((r) => Array.isArray(r.fee_detail_ids) ? (r.fee_detail_ids as string[]) : [])
  );

  const availableCorePayments = corePayments.filter((p) => !receiptedIds.has(p.id) && !p.receipt_id && !(p.fee_receipts && p.fee_receipts.length > 0));
  const availableExtraFees = extraFees.filter((ef) => !receiptedIds.has(ef.id));

  const selectedPayments = availableCorePayments.filter((p) => selectedPaymentIds.includes(p.id));
  const selectedExtraItems = availableExtraFees.filter((ef) => selectedExtraIds.includes(ef.id));
  const coreTotal = selectedPayments.reduce((s, p) => s + p.amount, 0);
  const extraTotal = selectedExtraItems.reduce((s, ef) => s + ef.amount, 0);

  // Drop selections that have already been receipted
  useEffect(() => {
    setSelectedPaymentIds((prev) => prev.filter((id) => availableCorePayments.some((p) => p.id === id)));
    setSelectedExtraIds((prev) => prev.filter((id) => availableExtraFees.some((ef) => ef.id === id)));
  }, [availableCorePayments, availableExtraFees]);

  const selectedTotal = coreTotal + extraTotal;
  const allCoreTotal = masterFeeTotal ?? 0;
  const previousDue = Math.max(0, allCoreTotal - (corePaidTotal - coreTotal));
  const outstandingBalance = Math.max(0, previousDue - coreTotal);

  const togglePayment = (id: string) =>
    setSelectedPaymentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleExtra = (id: string) =>
    setSelectedExtraIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAllCore = () => setSelectedPaymentIds(availableCorePayments.map(p => p.id));

  useEffect(() => {
    if (!open) return;
    setLoadingData(true);
    setSelectedPaymentIds([]);
    setSelectedExtraIds([]);
    setPreviewUrl(null);
    setReceiptNumber(null);
    setExistingReceipt(null);
    setReceiptTemplate(null);
    Promise.all([
      api.getFeePayments(student.id, currentSession),
      api.getExtraFees(student.id, currentSession),
      api.getStudentCorePaidTotal(student.id, currentSession),
      api.getFeeReceipts(student.id),
    ]).then(([{ data: pays }, { data: extras }, { data: paid }, { data: receipts }]) => {
      setCorePayments((pays ?? []) as FeePayment[]);
      setExtraFees(extras ?? []);
      setCorePaidTotal(paid ?? 0);
      setFeeReceipts(receipts ?? []);
      setLoadingData(false);
    });
  }, [open, student.id, currentSession]);

  useEffect(() => {
    if (!open) return;
    setLoadingTemplate(true);
    let cancelled = false;

    async function loadTemplate() {
      if (receiptTemplateId) {
        const { data, error } = await api.getDocumentTemplateById(receiptTemplateId);
        if (!cancelled) {
          if (!error && data) {
            setReceiptTemplate(data);
            setLoadingTemplate(false);
            return;
          }
        }
      }
      const { data, error } = await api.getDocumentTemplates();
      if (cancelled) return;
      const feeTemplates = (data ?? []).filter((t: DocumentTemplate) => t.type === 'Fee Receipt');
      if (feeTemplates.length > 0) {
        setReceiptTemplate(feeTemplates[0]);
      }
      setLoadingTemplate(false);
    }

    loadTemplate();
    return () => { cancelled = true; };
  }, [open, receiptTemplateId]);

  const handleGenerate = async () => {
    if (selectedPaymentIds.length === 0 && selectedExtraIds.length === 0) {
      toast.error('Select at least one fee item to include.');
      return;
    }
    if (!receiptTemplate) {
      toast.error('No receipt template selected. Choose a Fee Receipt template in the Fees module.');
      return;
    }
    setGenerating(true);
    try {
      let rcptNum = receiptNumber;
      if (!rcptNum) {
        const { data, error: numErr } = await api.generateReceiptNumber();
        if (numErr || !data) throw new Error('Failed to generate receipt number');
        rcptNum = data;
        setReceiptNumber(rcptNum);
      }

      const periodMonths = selectedPayments.flatMap((p) => p.period_months ?? []);
      const periodType = selectedPayments.length > 1 ? 'combined' : (selectedPayments[0]?.period_type ?? 'combined');
      const periodValue = selectedPayments.map((p) => p.payment_period).join(', ');
      const feeData: FeeReceiptData = {
        receipt_number: rcptNum,
        tuition_fee: coreTotal,
        admission_fee: extraTotal,
        examination_fee: 0,
        discount: 0,
        previous_due: previousDue,
        grand_total: selectedTotal,
        period_type: selectedExtraItems.length > 0 && selectedPayments.length === 0 ? 'extra' : periodType,
        period_value: selectedExtraItems.length > 0 && selectedPayments.length === 0 ? 'Extra / Other Fees' : periodValue,
        period_months: selectedExtraItems.length > 0 && selectedPayments.length === 0 ? [] : periodMonths,
      };

      const doc = await generateTemplateDocumentPDF({
        student,
        branding,
        template: receiptTemplate,
        feeData,
        filename: `Receipt_${rcptNum}.pdf`,
      });
      const pdfBlob = doc.output('blob');
      setPreviewUrl(URL.createObjectURL(pdfBlob));
      const pdfUrl = await api.uploadReceiptPdf(rcptNum, student.id, pdfBlob);

      const allItems = [
        ...selectedPayments.map(p => ({ description: `Core Fee \u2014 ${p.payment_period}`, amount: p.amount })),
        ...selectedExtraItems.map(ef => ({
          description: `[${ef.fee_category === 'extra' ? 'Extra' : 'Other'}] ${ef.description}`,
          amount: ef.amount,
        })),
      ];

      // Final backend safety: none of the selected items may already have a receipt
      const alreadyReceipted = [...selectedPaymentIds, ...selectedExtraIds].filter((id) => receiptedIds.has(id));
      if (alreadyReceipted.length > 0) {
        toast.error('One or more selected fee items have already been receipted. Please refresh the dialog.');
        return;
      }

      const hash = api.buildReceiptHash(student.id, [...selectedPaymentIds, ...selectedExtraIds].sort());
      const { data: duplicate } = await api.findReceiptByHash(hash);
      if (duplicate) {
        setExistingReceipt(duplicate);
        toast.error('A receipt already exists for this exact fee period.');
        return;
      }

      const { data: receipt, error: recErr } = await api.createFeeReceipt({
        student_id: student.id,
        receipt_number: rcptNum,
        fee_detail_ids: selectedPaymentIds,
        items: allItems,
        total_amount: selectedTotal,
        payment_method: paymentMethod,
        transaction_id: transactionId || undefined,
        payment_date: paymentDate,
        notes: notes || undefined,
        generated_by: profile?.id,
        pdf_url: pdfUrl ?? undefined,
        receipt_hash: hash,
        period_type: selectedExtraItems.length > 0 && selectedPayments.length === 0 ? 'extra' : periodType,
        period_value: selectedExtraItems.length > 0 && selectedPayments.length === 0 ? 'Extra / Other Fees' : periodValue,
        period_months: selectedExtraItems.length > 0 && selectedPayments.length === 0 ? [] : periodMonths,
      });
      if (recErr) throw recErr;
      if (receipt) {
        await api.createFeeReceiptVisibility(receipt.id);
      }
      toast.success(`Receipt ${rcptNum} generated and saved!`);
      onReceiptCreated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate receipt');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl || !receiptNumber) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `Receipt-${receiptNumber}-${student.name.replace(/\s+/g, '_')}.pdf`;
    a.click();
  };

  const handlePrint = () => {
    if (previewUrl) window.open(previewUrl, '_blank')?.print();
  };

  const handleClose = () => {
    setSelectedPaymentIds([]);
    setSelectedExtraIds([]);
    setPaymentMethod('Cash');
    setTransactionId('');
    setPaymentDate(getLocalDateString());
    setNotes('');
    setPreviewUrl(null);
    setReceiptNumber(null);
    setExistingReceipt(null);
    setReceiptTemplate(null);
    onOpenChange(false);
  };

  const totalSelected = selectedPaymentIds.length + selectedExtraIds.length;
  const templateMissing = !loadingTemplate && !receiptTemplate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Generate Receipt \u2014 {student.name}
          </DialogTitle>
          <DialogDescription>
            Select the fee payments to include, confirm payment details, then generate the receipt using the configured template.
          </DialogDescription>
        </DialogHeader>

        {templateMissing && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-amber-200 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>No Fee Receipt template is selected. Pick one from the Receipts tab to continue.</span>
          </div>
        )}

        {existingReceipt && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-amber-200 text-warning">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Receipt already exists for this fee period</p>
                <p className="text-xs mt-0.5">
                  Receipt No: {existingReceipt.receipt_number}
                </p>
                <p className="text-xs">
                  Receipts are permanent records. Use the button below to download the original PDF.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              {existingReceipt.pdf_url && (
                <Button onClick={() => window.open(existingReceipt.pdf_url, '_blank')}>
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              )}
            </div>
          </div>
        )}

        {previewUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-green-200 text-success">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Receipt Generated!</p>
                <p className="text-xs">Receipt No: {receiptNumber}</p>
              </div>
            </div>
            <iframe src={previewUrl} className="w-full h-[440px] rounded-lg border" title="Receipt Preview" />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </div>
        ) : loadingData || loadingTemplate ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> {loadingTemplate ? 'Loading receipt template…' : 'Loading fee records…'}
          </div>
        ) : (
          <div className="space-y-5 py-2">

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Core Fee Payments \u2014 {currentSession}</Label>
                {availableCorePayments.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllCore}>
                    Select All
                  </Button>
                )}
              </div>
              {corePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No core fee payments recorded for {currentSession}.{' '}
                  Use the <strong>Core Fees</strong> button in the Students tab to record one.
                </p>
              ) : availableCorePayments.length === 0 ? (
                <div className="text-sm text-center py-4 border border-dashed rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">
                    No core fee is currently available for registration.
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    The full academic year fee for {currentSession} has already been paid.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {availableCorePayments.map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPaymentIds.includes(p.id) ? 'border-primary/60 bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                      onClick={() => togglePayment(p.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedPaymentIds.includes(p.id)} onCheckedChange={() => togglePayment(p.id)} />
                        <div>
                          <p className="text-sm font-medium">{p.payment_period}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {p.payment_method ? ` \u00B7 ${p.payment_method}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-primary text-sm shrink-0">{inr(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {availableExtraFees.length > 0 && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Extra / Other Fees
                  <span className="text-xs font-normal text-muted-foreground ml-1">(isolated from yearly cap)</span>
                </Label>
                <div className="space-y-1.5">
                  {availableExtraFees.map(ef => (
                    <div
                      key={ef.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedExtraIds.includes(ef.id) ? 'border-orange-400/60 bg-orange-50' : 'border-border hover:bg-muted/40'}`}
                      onClick={() => toggleExtra(ef.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox checked={selectedExtraIds.includes(ef.id)} onCheckedChange={() => toggleExtra(ef.id)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{ef.description}</p>
                            <Badge variant="outline" className={`text-xs shrink-0 ${ef.fee_category === 'extra' ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-info'}`}>
                              {ef.fee_category === 'extra' ? 'Extra' : 'Other'}
                            </Badge>
                          </div>
                          {ef.reason && <p className="text-xs text-muted-foreground truncate">Reason: {ef.reason}</p>}
                        </div>
                      </div>
                      <span className="font-bold text-orange-600 text-sm shrink-0 ml-2">{inr(Number(ef.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalSelected > 0 && (
              <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-muted/50 border">
                <span className="text-sm text-muted-foreground">{totalSelected} item(s) selected</span>
                <div className="text-right">
                  {coreTotal > 0 && <p className="text-xs text-muted-foreground">Core: {inr(coreTotal)}</p>}
                  {extraTotal > 0 && <p className="text-xs text-muted-foreground">Extra/Other: {inr(extraTotal)}</p>}
                  <p className="font-bold text-primary text-sm">Total: {inr(selectedTotal)}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(pm => <SelectItem key={pm} value={pm}>{pm}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Date</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">UTR / Transaction Reference (optional)</Label>
                <Input placeholder="e.g. TXN1234567890 or UPI reference" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea placeholder="Additional notes to print on the receipt…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}

        {!previewUrl && !loadingData && !loadingTemplate && !existingReceipt && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating || totalSelected === 0 || templateMissing}>
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Receipt className="w-4 h-4 mr-2" /> Generate Receipt</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
