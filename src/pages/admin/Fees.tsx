import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Student, BrandingSettings, MasterFee, ExtraFee } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'];

const PAYMENT_PERIOD_OPTIONS = [
  'Full Year',
  ...MONTHS,
  'April-June', 'July-September', 'October-December', 'January-March',
];

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

  // ── Core fee dialog ──────────────────────────────────────────────────────────
  const [coreDialogOpen, setCoreDialogOpen] = useState(false);
  const [coreStudent, setCoreStudent] = useState<Student | null>(null);
  const [masterFee, setMasterFee] = useState<MasterFee | null>(null);
  const [corePaidTotal, setCorePaidTotal] = useState(0);
  const [coreLoading, setCoreLoading] = useState(false);

  // ── Extra/Other fee dialog ───────────────────────────────────────────────────
  const [extraDialogOpen, setExtraDialogOpen] = useState(false);
  const [extraStudent, setExtraStudent] = useState<Student | null>(null);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);

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
    const [{ data: mf }, { data: paid }] = await Promise.all([
      api.getMasterFeeForClass(student.class, sess),
      api.getStudentCorePaidTotal(student.id, sess),
    ]);
    setMasterFee(mf);
    setCorePaidTotal(paid);
    const remaining = mf ? Math.max(0, mf.total_amount - paid) : 0;
    coreForm.reset({
      session_year: sess,
      payment_period: 'Full Year',
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

    try {
      // Record payment in ledger
      const { error: payErr } = await api.createFeePayment({
        student_id: coreStudent.id,
        session_year: values.session_year,
        payment_period: values.payment_period,
        amount: values.amount,
        payment_method: values.payment_method,
        payment_date: values.payment_date,
        transaction_id: values.transaction_id || undefined,
        notes: values.notes || undefined,
        collected_by: profile?.id,
      });
      if (payErr) throw payErr;

      // Also persist fee_details + status to student record (legacy compat)
      const { error: stuErr } = await api.updateStudent(coreStudent.id, {
        fee_status: values.fee_status,
        fee_details: values.fee_details,
      });
      if (stuErr) throw stuErr;

      // Auto-receipt if paid
      if (values.fee_status === 'Paid' && values.amount > 0) {
        try {
          const { data: rcptNum } = await api.generateReceiptNumber();
          if (rcptNum) {
            const hash = api.buildReceiptHash(coreStudent.id, [values.payment_period + values.payment_date]);
            await api.createFeeReceipt({
              student_id: coreStudent.id,
              receipt_number: rcptNum,
              fee_detail_ids: [],
              items: [{ description: `Core Fees (${values.payment_period})`, amount: values.amount }],
              total_amount: values.amount,
              payment_method: values.payment_method,
              transaction_id: values.transaction_id || undefined,
              payment_date: values.payment_date,
              notes: values.notes || 'Core fee payment',
              generated_by: profile?.id,
              receipt_hash: hash,
            });
            toast.success(`Payment recorded & receipt ${rcptNum} auto-generated`);
          }
        } catch {
          toast.success('Payment recorded — go to the Receipts tab to generate the PDF receipt.');
        }
      } else {
        toast.success('Core fee payment recorded');
      }

      setCoreDialogOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Submit: extra/other fee ───────────────────────────────────────────────
  const onExtraSubmit = async (values: ExtraValues) => {
    if (!extraStudent) return;
    try {
      const { error } = await api.createExtraFee({
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
      if (error) throw error;
      toast.success(`${values.fee_category === 'extra' ? 'Extra' : 'Other'} fee recorded for ${extraStudent.name}`);
      extraForm.reset({ ...extraForm.getValues(), description: '', reason: '', amount: 0 });
      const { data } = await api.getExtraFees(extraStudent.id, currentSession);
      setExtraFees(data ?? []);
    } catch (err: any) {
      toast.error(err.message);
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
    const cls = s === 'Paid' ? 'bg-green-100 text-green-700' :
      s === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
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
                      {masterFee ? `₹${masterFee.total_amount.toLocaleString('en-IN')}` : <span className="text-amber-600 text-xs">Not set</span>}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-0">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Paid So Far</p>
                    <p className="font-bold text-base text-green-700 mt-0.5">₹{corePaidTotal.toLocaleString('en-IN')}</p>
                  </CardContent>
                </Card>
                <Card className={`border-0 ${remaining !== null && remaining === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={`font-bold text-base mt-0.5 ${remaining === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                      {remaining !== null ? `₹${remaining.toLocaleString('en-IN')}` : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {remaining === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  <IndianRupee className="w-4 h-4 shrink-0" />
                  Full yearly fee paid — no outstanding balance for {currentSession}.
                </div>
              )}

              {!masterFee && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  No master fee set for class {coreStudent?.class} in {currentSession}. Go to the Master Fees tab to configure it.
                </div>
              )}

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
                            {PAYMENT_PERIOD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
                          <Badge variant="outline" className={`text-xs ${ef.fee_category === 'extra' ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
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
        />
      )}
    </div>
  );
}
