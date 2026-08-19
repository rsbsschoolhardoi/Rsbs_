import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Student, BrandingSettings, MasterFee, ExtraFee, FeePayment, FeeReceipt, FeeReceiptData, DocumentTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Search, CreditCard, Plus, Trash2, Receipt, Loader2, BookOpen, IndianRupee, AlertTriangle, Wallet } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';
import { generateTemplateDocumentPDF } from '@/utils/templateDocumentGenerator';
import { paymentPeriodToMonths, getAvailablePeriodOptions, expandPeriodMonths } from '@/lib/feePeriods';
import ReceiptGenerator from '@/components/admin/ReceiptGenerator';
import MasterFeesPanel from '@/components/admin/MasterFeesPanel';
import StudentLedger, { StudentLedgerRow } from '@/components/admin/StudentLedger';
import ReceiptTemplateSelector from '@/components/admin/ReceiptTemplateSelector';

// Auto-detect current fiscal session (Apr-Mar)
function getCurrentSession(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Bank Draft', 'Online Transfer', 'Other'];

// ── Core fee schema ───────────────────────────────────────────────────────────
const coreSchema = z.object({
  session_year: z.string().min(1),
  payment_period: z.string().min(1, 'Select payment period'),
  amount: z.coerce.number().min(1, 'Amount must be > 0'),
  payment_method: z.string().min(1),
  payment_date: z.string().min(1),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  // legacy fee_details kept for compatibility
  fee_status: z.enum(['Paid', 'Pending', 'Overdue']),
  fee_details: z.array(z.object({
    id: z.string(),
    amount: z.coerce.number().min(0),
    description: z.string().min(1, 'Description required'),
    due_date: z.string().min(1, 'Due date required'),
  })),
});

// ── Extra / Other fee schema ──────────────────────────────────────────────────
const extraSchema = z.object({
  fee_category: z.enum(['extra', 'other']),
  description: z.string().min(1, 'Description required'),
  reason: z.string().min(1, 'Reason is required'),
  amount: z.coerce.number().min(1, 'Amount must be > 0'),
  payment_method: z.string().min(1),
  payment_date: z.string().min(1),
  session_year: z.string().min(1),
  transaction_id: z.string().optional(),
});

type CoreValues = z.infer<typeof coreSchema>;
type ExtraValues = z.infer<typeof extraSchema>;

export default function Fees() {
  const { profile } = useAuth();
  const currentSession = getCurrentSession();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [receiptTemplateId, setReceiptTemplateId] = useState<string | null>(null);

  // ── Student ledger (Receipts tab) ────────────────────────────────────────────
  const [ledgerStudent, setLedgerStudent] = useState<Student | null>(null);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);

  // ── Core fee dialog ──────────────────────────────────────────────────────────
  const [coreDialogOpen, setCoreDialogOpen] = useState(false);
  const [coreStudent, setCoreStudent] = useState<Student | null>(null);
  const [masterFee, setMasterFee] = useState<MasterFee | null>(null);
  const [corePaidTotal, setCorePaidTotal] = useState(0);
  const [coreLoading, setCoreLoading] = useState(false);
  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [corePeriodOptions, setCorePeriodOptions] = useState<{ label: string; period: string; period_type: 'monthly' | 'combined' | 'annual' }[]>([]);
  const [isCoreFullyPaid, setIsCoreFullyPaid] = useState(false);

  // ── Extra/Other fee dialog ───────────────────────────────────────────────────
  const [extraDialogOpen, setExtraDialogOpen] = useState(false);
  const [extraStudent, setExtraStudent] = useState<Student | null>(null);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);

  // ── Confirmation dialog ─────────────────────────────────────────────────────
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'core' | 'extra' | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // ── Last registration revocation state ──────────────────────────────────────
  const [revokeInfo, setRevokeInfo] = useState<{
    paymentId: string;
    receiptNumber?: string;
    expiresAt: string;
    studentName: string;
  } | null>(null);
  const [revokeTimeLeft, setRevokeTimeLeft] = useState(0);
  const [revoking, setRevoking] = useState(false);

  const coreForm = useForm<CoreValues>({
    resolver: zodResolver(coreSchema),
    defaultValues: {
      session_year: currentSession,
      payment_period: 'Full Year',
      amount: 0,
      payment_method: 'Cash',
      payment_date: getLocalDateString(),
      fee_status: 'Paid',
      fee_details: [],
    },
  });

  const extraForm = useForm<ExtraValues>({
    resolver: zodResolver(extraSchema),
    defaultValues: {
      fee_category: 'extra',
      description: '',
      reason: '',
      amount: 0,
      payment_method: 'Cash',
      payment_date: getLocalDateString(),
      session_year: currentSession,
    },
  });

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data } = await api.getStudents();
    setStudents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
    api.getBrandingSettings().then(({ data }) => {
      if (data) {
        setBranding(data);
        setReceiptTemplateId(data.fee_receipt_template_id ?? null);
      }
    });
  }, [fetchStudents]);

  // Load master fee + paid total when opening core dialog
  const openCoreDialog = async (student: Student) => {
    setCoreStudent(student);
    setCoreLoading(true);
    setCoreDialogOpen(true);
    const sess = currentSession;
    const [{ data: mf }, { data: paid }, { data: payments }] = await Promise.all([
      api.getMasterFeeForClass(student.class, sess),
      api.getStudentCorePaidTotal(student.id, sess),
      api.getFeePayments(student.id, sess, true),
    ]);
    setMasterFee(mf);
    setCorePaidTotal(paid);
    const expanded = expandPeriodMonths(
      (payments ?? []).filter((p) => !p.is_revoked).flatMap((p) => p.period_months ?? []),
      sess,
    );
    setPaidMonths(expanded);
    const { options, fullyPaid } = getAvailablePeriodOptions(sess, expanded);
    setCorePeriodOptions(options);
    setIsCoreFullyPaid(fullyPaid);
    const defaultPeriod = options.find((o) => o.period_type === 'annual')?.period ?? options[0]?.period ?? '';
    const remaining = mf ? Math.max(0, mf.total_amount - paid) : 0;
    coreForm.reset({
      session_year: sess,
      payment_period: defaultPeriod,
      amount: remaining,
      payment_method: 'Cash',
      payment_date: getLocalDateString(),
      fee_status: 'Paid',
      fee_details: student.fee_details ?? [],
    });
    setCoreLoading(false);
  };

  const openExtraDialog = async (student: Student) => {
    setExtraStudent(student);
    setExtraLoading(true);
    setExtraDialogOpen(true);
    extraForm.reset({
      fee_category: 'extra',
      description: '',
      reason: '',
      amount: 0,
      payment_method: 'Cash',
      payment_date: getLocalDateString(),
      session_year: currentSession,
    });
    const { data } = await api.getExtraFees(student.id, currentSession);
    setExtraFees(data ?? []);
    setExtraLoading(false);
  };

  // ── Submit: core fee payment ──────────────────────────────────────────────
  const onCoreSubmit = async (values: CoreValues) => {
    if (!coreStudent) return;

    // Max-limit validation
    if (masterFee) {
      const newTotal = corePaidTotal + values.amount;
      if (newTotal > masterFee.total_amount) {
        const remaining = masterFee.total_amount - corePaidTotal;
        toast.error(
          `Amount exceeds the yearly fee cap for ${coreStudent.class}. ` +
          `Remaining balance: ₹${remaining.toLocaleString('en-IN')} of ` +
          `₹${masterFee.total_amount.toLocaleString('en-IN')}.`
        );
        return;
      }
    }

    // Parse period and enforce duplicate prevention
    let parsed;
    try {
      parsed = paymentPeriodToMonths(values.payment_period, values.session_year);
    } catch {
      toast.error('Invalid payment period selected.');
      return;
    }
    const { data: available, error: availErr } = await api.checkCorePeriodAvailable(
      coreStudent.id,
      values.session_year,
      parsed.period_months
    );
    if (availErr || !available) {
      toast.error(
        `One or more selected periods are already registered as paid for ${coreStudent.name} in ${values.session_year}.`
      );
      return;
    }

    setConfirmMode('core');
    setConfirmDialogOpen(true);
  };

  const executeCoreRegistration = async (values: CoreValues) => {
    if (!coreStudent) return;
    const parsed = paymentPeriodToMonths(values.payment_period, values.session_year);
    setConfirmSubmitting(true);
    try {
      // Record payment in ledger (atomic duplicate-safe registration)
      const { data: payment, error: payErr } = await api.registerFeePayment({
        student_id: coreStudent.id,
        session_year: values.session_year,
        payment_period: values.payment_period,
        period_type: parsed.period_type,
        period_months: parsed.period_months,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_date: values.payment_date,
        transaction_id: values.transaction_id || undefined,
        notes: values.notes || undefined,
        collected_by: profile?.id,
      });
      if (payErr || !payment) throw payErr || new Error('Failed to register payment');

      // Also persist fee_details + status to student record (legacy compat)
      const { error: stuErr } = await api.updateStudent(coreStudent.id, {
        fee_status: values.fee_status,
        fee_details: values.fee_details,
      });
      if (stuErr) throw stuErr;

      let receiptNumber: string | undefined;
      if (values.fee_status === 'Paid' && values.amount > 0) {
        const { receiptNumber: rcptNum, receiptId } = await createReceiptRecord(
          coreStudent,
          [payment.id],
          [{ description: `Core Fees (${values.payment_period})`, amount: values.amount }],
          values.amount,
          values.payment_method,
          values.transaction_id || undefined,
          values.payment_date,
          values.notes || 'Core fee payment',
          parsed.period_type,
          values.payment_period,
          parsed.period_months,
        );
        receiptNumber = rcptNum;
        if (receiptId) {
          await api.updateFeePaymentReceiptId(payment.id, receiptId);
        }
      }

      setCoreDialogOpen(false);
      fetchStudents();
      setLedgerRefreshKey((k) => k + 1);
      startRevocationWindow(payment, coreStudent.name, receiptNumber);
      toast.success('Fee registered successfully. Receipt generated.');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setConfirmSubmitting(false);
      setConfirmDialogOpen(false);
      setConfirmMode(null);
    }
  };

  // ── Submit: extra/other fee ───────────────────────────────────────────────
  const onExtraSubmit = async (values: ExtraValues) => {
    if (!extraStudent) return;
    setConfirmMode('extra');
    setConfirmDialogOpen(true);
  };

  const executeExtraRegistration = async (values: ExtraValues) => {
    if (!extraStudent) return;
    setConfirmSubmitting(true);
    try {
      const { data: extraFee, error } = await api.createExtraFee({
        student_id: extraStudent.id,
        fee_category: values.fee_category,
        description: values.description,
        reason: values.reason,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_date: values.payment_date,
        session_year: values.session_year,
        transaction_id: values.transaction_id || undefined,
        collected_by: profile?.id,
      });
      if (error || !extraFee) throw error || new Error('Failed to register extra fee');

      const { receiptNumber } = await createReceiptRecord(
        extraStudent,
        [extraFee.id],
        [{ description: `[${values.fee_category === 'extra' ? 'Extra' : 'Other'}] ${values.description}`, amount: values.amount }],
        values.amount,
        values.payment_method,
        values.transaction_id || undefined,
        values.payment_date,
        `${values.fee_category === 'extra' ? 'Extra' : 'Other'} fee payment`,
        values.fee_category,
        values.description,
        [],
      );

      toast.success(`${values.fee_category === 'extra' ? 'Extra' : 'Other'} fee recorded for ${extraStudent.name}. Receipt ${receiptNumber} generated.`);
      extraForm.reset({ ...extraForm.getValues(), description: '', reason: '', amount: 0 });
      const { data } = await api.getExtraFees(extraStudent.id, currentSession);
      setExtraFees(data ?? []);
      setExtraDialogOpen(false);
      fetchStudents();
      setLedgerRefreshKey((k) => k + 1);
      startRevocationWindow({
        id: extraFee.id,
        student_id: extraFee.student_id,
        session_year: extraFee.session_year,
        payment_period: extraFee.description,
        amount: extraFee.amount,
        payment_method: extraFee.payment_method,
        payment_date: extraFee.payment_date,
        revocation_expires_at: extraFee.revocation_expires_at,
        is_revoked: false,
      } as FeePayment, extraStudent.name, receiptNumber);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfirmSubmitting(false);
      setConfirmDialogOpen(false);
      setConfirmMode(null);
    }
  };

  // ── Misc ─────────────────────────────────────────────────────────────────
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.login_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceiptStudents = students.filter(s =>
    s.name.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    s.login_id.toLowerCase().includes(receiptSearch.toLowerCase()) ||
    s.class.toLowerCase().includes(receiptSearch.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const cls = s === 'Paid' ? 'bg-success/10 text-success' :
      s === 'Pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive';
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>{s}</span>;
  };

  // Remaining cap for current edit
  const remaining = masterFee ? Math.max(0, masterFee.total_amount - corePaidTotal) : null;
  const watchedAmount = Number(coreForm.watch('amount')) || 0;
  const exceedsCap = masterFee !== null && (corePaidTotal + watchedAmount) > (masterFee?.total_amount ?? Infinity);

  // Legacy fee_details helpers
  const addFeeLine = () => {
    const current = coreForm.getValues('fee_details');
    coreForm.setValue('fee_details', [
      ...current,
      { id: Math.random().toString(36).slice(2, 9), amount: 0, description: '', due_date: getLocalDateString() },
    ]);
  };
  const removeFeeLine = (id: string) => {
    coreForm.setValue('fee_details', coreForm.getValues('fee_details').filter(f => f.id !== id));
  };

  // ── Automatic receipt PDF generation ───────────────────────────────────────
  async function createReceiptRecord(
    student: Student,
    feeDetailIds: string[],
    items: { description: string; amount: number }[],
    amount: number,
    paymentMethod: string,
    transactionId: string | undefined,
    paymentDate: string,
    notes: string,
    periodType: string,
    periodValue: string,
    periodMonths: string[]
  ): Promise<{ receiptNumber: string; receiptId: string | undefined }> {
    if (!receiptTemplateId) {
      throw new Error('No receipt template selected. Choose a Fee Receipt template in the Fees module.');
    }
    const { data: template } = await api.getDocumentTemplateById(receiptTemplateId);
    if (!template) {
      throw new Error('Selected receipt template not found.');
    }
    if (!branding) {
      throw new Error('School branding not loaded. Please refresh and try again.');
    }

    const { data: rcptNum } = await api.generateReceiptNumber();
    if (!rcptNum) throw new Error('Failed to generate receipt number');

    const feeData: FeeReceiptData = {
      receipt_number: rcptNum,
      tuition_fee: 0,
      admission_fee: 0,
      examination_fee: 0,
      discount: 0,
      previous_due: 0,
      grand_total: amount,
      period_type: periodType,
      period_value: periodValue,
      period_months: periodMonths,
    };

    const doc = await generateTemplateDocumentPDF({
      student,
      branding,
      template,
      feeData,
      filename: `Receipt_${rcptNum}.pdf`,
    });
    const pdfBlob = doc.output('blob');
    const pdfUrl = await api.uploadReceiptPdf(rcptNum, student.id, pdfBlob);
    if (!pdfUrl) throw new Error('Receipt PDF upload failed');

    const hash = api.buildReceiptHash(student.id, feeDetailIds.sort());
    const { data: receipt, error: recErr } = await api.createFeeReceipt({
      student_id: student.id,
      receipt_number: rcptNum,
      fee_detail_ids: feeDetailIds,
      items,
      total_amount: amount,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      payment_date: paymentDate,
      notes,
      generated_by: profile?.id,
      pdf_url: pdfUrl,
      receipt_hash: hash,
      period_type: periodType,
      period_value: periodValue,
      period_months: periodMonths,
    });
    if (recErr) throw recErr;
    if (receipt) {
      await api.createFeeReceiptVisibility(receipt.id);
    }
    return { receiptNumber: rcptNum, receiptId: receipt?.id };
  }

  // ── 2-minute revocation window ─────────────────────────────────────────────
  function startRevocationWindow(payment: FeePayment, studentName: string, receiptNumber?: string) {
    const expiresAt = payment.revocation_expires_at || new Date(Date.now() + 120_000).toISOString();
    setRevokeInfo({ paymentId: payment.id, receiptNumber, expiresAt, studentName });
  }

  useEffect(() => {
    if (!revokeInfo) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(revokeInfo.expiresAt).getTime() - Date.now()) / 1000));
      setRevokeTimeLeft(remaining);
      if (remaining === 0) setRevokeInfo(null);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [revokeInfo]);

  async function handleRevoke() {
    if (!revokeInfo) return;
    setRevoking(true);
    const { error } = await api.revokeFeeRegistration(revokeInfo.paymentId);
    setRevoking(false);
    if (error) {
      toast.error(error.message || 'Revocation failed');
      return;
    }
    setRevokeInfo(null);
    fetchStudents();
    setLedgerRefreshKey((k) => k + 1);
    toast.success('Registration revoked. The fee period is available again.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground">Manage student fees, payments, and receipts — session {currentSession}.</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">
            <CreditCard className="w-4 h-4 mr-2" />Students
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <Receipt className="w-4 h-4 mr-2" />Receipts
          </TabsTrigger>
          <TabsTrigger value="master">
            <BookOpen className="w-4 h-4 mr-2" />Master Fees
          </TabsTrigger>
        </TabsList>

        {/* ── Students Tab ─────────────────────────────────────── */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Search students…" className="pl-10" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="border rounded-lg bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap pl-4">Student</TableHead>
                  <TableHead className="whitespace-nowrap">Class</TableHead>
                  <TableHead className="whitespace-nowrap">Fee Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No records found.</TableCell></TableRow>
                ) : filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium whitespace-nowrap pl-4">
                      <div>
                        <p>{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.login_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{student.class}{student.section ? ` – ${student.section}` : ''}</TableCell>
                    <TableCell className="whitespace-nowrap">{statusBadge(student.fee_status)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCoreDialog(student)}>
                          <CreditCard className="w-4 h-4 mr-1" /> Core Fees
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openExtraDialog(student)}>
                          <Wallet className="w-4 h-4 mr-1" /> Extra / Other
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Receipts Tab — student-centric sub-ledger ──────────── */}
        <TabsContent value="receipts" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search students by name, ID or class…" className="pl-10"
                value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)} />
            </div>
            <ReceiptTemplateSelector
              branding={branding}
              compact
              onChange={id => { setReceiptTemplateId(id); setBranding(prev => prev ? { ...prev, fee_receipt_template_id: id } : prev); }}
            />
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </div>
              ) : filteredReceiptStudents.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Receipt className="w-9 h-9 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-sm">No students found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredReceiptStudents.map(s => (
                    <StudentLedgerRow
                      key={s.id}
                      student={s}
                      masterFeeTotal={masterFee?.total_amount}
                      onOpen={stu => setLedgerStudent(stu)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Click any student to view their complete fee ledger, payment history, and receipts.
          </p>
        </TabsContent>

        {/* ── Master Fees Tab ───────────────────────────────────── */}
        <TabsContent value="master" className="mt-4">
          <MasterFeesPanel currentSession={currentSession} />
        </TabsContent>
      </Tabs>

      {/* ── Core Fee Dialog ───────────────────────────────────────────────── */}
      <Dialog open={coreDialogOpen} onOpenChange={setCoreDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Core Fee Payment — {coreStudent?.name}
            </DialogTitle>
            <DialogDescription>
              Record a core (school/tuition) fee payment. Total cannot exceed the class yearly cap.
            </DialogDescription>
          </DialogHeader>

          {coreLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading fee data…
            </div>
          ) : (
            <>
              {/* Cap summary */}
              <div className="grid grid-cols-3 gap-3 py-2">
                <Card className="bg-muted/40 border-0">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Yearly Cap ({coreStudent?.class})</p>
                    <p className="font-bold text-base mt-0.5">
                      {masterFee ? `₹${masterFee.total_amount.toLocaleString('en-IN')}` : <span className="text-warning text-xs">Not set</span>}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-success/10 border-0">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Paid So Far</p>
                    <p className="font-bold text-base text-success mt-0.5">₹{corePaidTotal.toLocaleString('en-IN')}</p>
                  </CardContent>
                </Card>
                <Card className={`border-0 ${remaining !== null && remaining === 0 ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={`font-bold text-base mt-0.5 ${remaining === 0 ? 'text-success' : 'text-warning'}`}>
                      {remaining !== null ? `₹${remaining.toLocaleString('en-IN')}` : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {!masterFee && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-amber-200 text-warning text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  No master fee set for class {coreStudent?.class} in {currentSession}. Go to the Master Fees tab to configure it.
                </div>
              )}

              {isCoreFullyPaid && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-green-200 text-success text-sm">
                  <IndianRupee className="w-4 h-4 shrink-0" />
                  Full academic year fee already paid for {currentSession}.
                </div>
              )}

              {!isCoreFullyPaid && (
              <Form {...coreForm}>
                <form onSubmit={coreForm.handleSubmit(onCoreSubmit)} className="space-y-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={coreForm.control} name="session_year" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Academic Session</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-muted/40 cursor-default" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="payment_period" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Payment Period</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {corePeriodOptions.map((opt) => (
                              <SelectItem key={opt.period} value={opt.period}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Amount (₹)
                          {remaining !== null && <span className="text-muted-foreground ml-1 font-normal">max ₹{remaining.toLocaleString('en-IN')}</span>}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={remaining ?? undefined} {...field}
                            className={exceedsCap ? 'border-destructive focus-visible:ring-destructive' : ''} />
                        </FormControl>
                        {exceedsCap && (
                          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            Exceeds yearly cap by ₹{(corePaidTotal + watchedAmount - (masterFee?.total_amount ?? 0)).toLocaleString('en-IN')}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="payment_method" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="payment_date" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Payment Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="transaction_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">UTR / Transaction Ref (optional)</FormLabel>
                        <FormControl><Input placeholder="e.g. TXN12345" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="fee_status" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Fee Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={coreForm.control} name="notes" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-xs">Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. April–June instalment" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>

                  {/* Legacy fee breakdown items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Line Items (optional)</p>
                      <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={addFeeLine}>
                        <Plus className="w-3 h-3 mr-1" /> Add Item
                      </Button>
                    </div>
                    {coreForm.watch('fee_details').map((fee, idx) => (
                      <div key={fee.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/20 relative">
                        <FormField control={coreForm.control} name={`fee_details.${idx}.description`} render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl><Input placeholder="e.g. Tuition Fee Q1" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={coreForm.control} name={`fee_details.${idx}.amount`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Amount (₹)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={coreForm.control} name={`fee_details.${idx}.due_date`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Due Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-white hover:bg-destructive/80"
                          onClick={() => removeFeeLine(fee.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCoreDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={exceedsCap}>
                      <IndianRupee className="w-4 h-4 mr-1" /> Record Payment
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Extra / Other Fee Dialog ──────────────────────────────────────── */}
      <Dialog open={extraDialogOpen} onOpenChange={setExtraDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Extra / Other Fees — {extraStudent?.name}
            </DialogTitle>
            <DialogDescription>
              These are isolated from the core yearly fee and will not count toward the yearly cap.
            </DialogDescription>
          </DialogHeader>

          <Form {...extraForm}>
            <form onSubmit={extraForm.handleSubmit(onExtraSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={extraForm.control} name="fee_category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Fee Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="extra">Extra Fees (library fine, re-exam, etc.)</SelectItem>
                        <SelectItem value="other">Other / Custom Fees (coaching, activity, etc.)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={extraForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description / Fee Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Library Fine, Special Batch" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={extraForm.control} name="reason" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs">Reason <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Mandatory — explain why this fee is being charged (e.g. 'Back-paper fee for Mathematics exam June 2025')" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={extraForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Amount (₹)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={extraForm.control} name="payment_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={extraForm.control} name="payment_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Payment Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={extraForm.control} name="transaction_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">UTR / Transaction Ref (optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. TXN12345" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setExtraDialogOpen(false)}>Close</Button>
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-1" /> Record Fee
                </Button>
              </DialogFooter>
            </form>
          </Form>

          {/* History of extra fees for this student this session */}
          {extraLoading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
            </div>
          ) : extraFees.length > 0 ? (
            <div className="mt-2 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Extra / Other Fee History — {currentSession}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-xs">Category</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Description</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Reason</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Amount</TableHead>
                      <TableHead className="whitespace-nowrap text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extraFees.map(ef => (
                      <TableRow key={ef.id}>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`text-xs ${ef.fee_category === 'extra' ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-info'}`}>
                            {ef.fee_category === 'extra' ? 'Extra' : 'Other'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{ef.description}</TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={ef.reason}>{ef.reason}</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-primary text-sm">₹{Number(ef.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(ef.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Receipt Generator ── */}
      {receiptStudent && branding && (
        <ReceiptGenerator
          student={receiptStudent}
          branding={branding}
          receiptTemplateId={receiptTemplateId}
          open={!!receiptStudent}
          onOpenChange={o => { if (!o) setReceiptStudent(null); }}
          onReceiptCreated={() => { fetchStudents(); setReceiptStudent(null); }}
          masterFeeTotal={masterFee?.total_amount}
        />
      )}

      {/* ── Student Ledger Dialog (Receipts tab) ── */}
      {ledgerStudent && (
        <StudentLedger
          student={ledgerStudent}
          open={!!ledgerStudent}
          onOpenChange={o => { if (!o) setLedgerStudent(null); }}
          onGenerateReceipt={stu => { setLedgerStudent(null); setReceiptStudent(stu); }}
          masterFeeTotal={masterFee?.total_amount}
          refreshKey={ledgerRefreshKey}
        />
      )}

      {/* ── Confirmation Dialog ── */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Fee Registration</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <p>
                You are about to register this fee payment for{' '}
                <strong>
                  {confirmMode === 'core' ? coreStudent?.name : extraStudent?.name}
                </strong>
                {' '}for{' '}
                <strong>
                  {confirmMode === 'core'
                    ? coreForm.getValues().payment_period
                    : `${extraForm.getValues().fee_category === 'extra' ? 'Extra' : 'Other'} — ${extraForm.getValues().description}`}
                </strong>.
              </p>
              <p>
                Once confirmed, the payment will be recorded and a receipt will be generated automatically.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmDialogOpen(false); setConfirmMode(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmSubmitting}
              onClick={() => {
                if (confirmMode === 'core') {
                  executeCoreRegistration(coreForm.getValues());
                } else if (confirmMode === 'extra') {
                  executeExtraRegistration(extraForm.getValues());
                }
              }}
            >
              {confirmSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Confirm & Register
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Revocation Banner ── */}
      {revokeInfo && revokeTimeLeft > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] md:w-auto">
          <div className="rounded-lg border bg-card p-4 shadow-lg max-w-md">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm">
                <p className="font-medium text-success">Fee registered successfully.</p>
                <p className="text-muted-foreground">Receipt generated.</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Revoke available for {Math.floor(revokeTimeLeft / 60).toString().padStart(2, '0')}:
                  {(revokeTimeLeft % 60).toString().padStart(2, '0')}.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={revoking}
                onClick={handleRevoke}
                className="shrink-0"
              >
                {revoking && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Revoke
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
