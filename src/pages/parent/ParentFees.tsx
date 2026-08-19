import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, CreditCard, CheckCircle2, AlertCircle, Clock,
  Receipt, Download, Printer, Search, FileText,
} from 'lucide-react';
import { StudentSwitcher } from '@/components/parent/StudentSwitcher';
import { toast } from 'sonner';
import { formatPeriodMonths, periodTypeLabel } from '@/lib/feePeriods';

const ParentFees: React.FC = () => {
  const { profile } = useAuth();
  const { selectedStudent, loading: parentLoading } = useParent();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');

  const fetchReceipts = useCallback(async () => {
    if (!profile?.id) return;
    setReceiptsLoading(true);
    const { data } = await api.getVisibleFeeReceiptsForParent(profile.id);
    setReceipts(data || []);
    setReceiptsLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleDownload = (receipt: any) => {
    if (!receipt.pdf_url) { toast.info('PDF not available for this receipt.'); return; }
    const a = document.createElement('a');
    a.href = receipt.pdf_url;
    a.download = `Receipt-${receipt.receipt_number}.pdf`;
    a.click();
  };

  const handlePrint = (receipt: any) => {
    if (!receipt.pdf_url) { toast.info('PDF not available for this receipt.'); return; }
    window.open(receipt.pdf_url, '_blank')?.print();
  };

  const formatExpires = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusStyle = (status: string) => {
    if (!status) return { bg: 'bg-muted', icon: <Clock className="h-8 w-8" />, label: 'Unknown', color: 'text-muted-foreground', shadow: '' };
    const s = status.toLowerCase();
    if (s === 'paid') return {
      bg: 'bg-green-50 border-green-100 shadow-green-200/20',
      iconBg: 'bg-green-500 text-white shadow-green-500/30',
      icon: <CheckCircle2 className="h-10 w-10" />,
      label: 'Fully Paid',
      desc: 'All school fees are fully settled for the current session. Thank you for your cooperation!',
    };
    if (s === 'overdue') return {
      bg: 'bg-red-50 border-red-100 shadow-red-200/20',
      iconBg: 'bg-red-500 text-white shadow-red-500/30',
      icon: <AlertCircle className="h-10 w-10" />,
      label: 'Overdue',
      desc: 'There are overdue fees for this student. Please settle them immediately at the school accounts office.',
    };
    return {
      bg: 'bg-amber-50 border-amber-100 shadow-amber-200/20',
      iconBg: 'bg-amber-500 text-white shadow-amber-500/30',
      icon: <AlertCircle className="h-10 w-10" />,
      label: 'Pending Dues',
      desc: 'There are pending dues associated with this student. Please settle them at the school office to avoid late fees.',
    };
  };

  // Receipts for selected student only
  const studentReceipts = receipts.filter(
    (r) => selectedStudent ? r.student_id === selectedStudent.student_id : true
  );

  const filteredReceipts = studentReceipts.filter((r) => {
    const q = receiptSearch.toLowerCase();
    const periodText = formatPeriodMonths(r.period_months, r.period_type).toLowerCase();
    return (
      r.receipt_number?.toLowerCase().includes(q) ||
      r.payment_method?.toLowerCase().includes(q) ||
      r.students?.name?.toLowerCase().includes(q) ||
      r.period_value?.toLowerCase().includes(q) ||
      periodText.includes(q)
    );
  });

  const feeDetails: any[] = selectedStudent?.fee_details ?? [];
  const totalAmount = Array.isArray(feeDetails)
    ? feeDetails.reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0)
    : 0;

  if (parentLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
          Loading fee status...
        </p>
      </div>
    );
  }

  const statusStyle = getStatusStyle(selectedStudent?.fee_status || '');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <StudentSwitcher />

      <div className="space-y-1 text-center md:text-left">
        <h2 className="text-3xl font-black leading-tight">School Fees</h2>
        <p className="text-muted-foreground font-medium">
          Monitoring payment status for {selectedStudent?.student_name ?? '—'}.
        </p>
      </div>

      {/* Status Hero */}
      <div className={`p-8 md:p-10 rounded-[2.5rem] border-4 text-center space-y-5 shadow-2xl transition-all ${statusStyle.bg}`}>
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg ${statusStyle.iconBg}`}>
          {statusStyle.icon}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
            Current Billing Cycle
          </p>
          <h4 className="text-3xl md:text-4xl font-black leading-none">{statusStyle.label}</h4>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed text-sm">
            {statusStyle.desc}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <div className="px-6 py-3 bg-background/70 rounded-2xl border text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-black text-primary">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="px-6 py-3 bg-background/70 rounded-2xl border text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Receipts Issued</p>
            <p className="text-2xl font-black text-primary">{studentReceipts.length}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="breakdown">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="breakdown" className="flex-1 md:flex-none">
            <CreditCard className="w-4 h-4 mr-2" />Fee Breakdown
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex-1 md:flex-none">
            <Receipt className="w-4 h-4 mr-2" />Receipts
            {studentReceipts.length > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                {studentReceipts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Fee Breakdown ── */}
        <TabsContent value="breakdown" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!feeDetails || feeDetails.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">No fee details available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feeDetails.map((fee: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{fee.description}</p>
                        {fee.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(fee.due_date).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-black text-primary shrink-0 ml-4">
                        ₹{Number(fee.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t px-1">
                    <span className="text-sm font-semibold text-muted-foreground">Total</span>
                    <span className="text-xl font-black text-primary">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Receipts ── */}
        <TabsContent value="receipts" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by receipt number or payment method..."
              className="pl-10"
              value={receiptSearch}
              onChange={(e) => setReceiptSearch(e.target.value)}
            />
          </div>

          {receiptsLoading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading receipts...
              </CardContent>
            </Card>
          ) : filteredReceipts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
                <p className="font-semibold">No receipts found</p>
                <p className="text-sm mt-1">
                  Receipts will appear here once fee payments are confirmed by the school.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-xl bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Receipt #</TableHead>
                    <TableHead className="whitespace-nowrap">Student</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Method</TableHead>
                    <TableHead className="whitespace-nowrap">Period</TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Visible Until</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">
                        {r.receipt_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-medium text-sm">{r.students?.name ?? selectedStudent?.student_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{r.students?.login_id}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.payment_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{r.payment_method}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          <span>{r.period_value || '—'}</span>
                          {r.period_type && (
                            <span className="text-xs text-muted-foreground">({periodTypeLabel(r.period_type)})</span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatPeriodMonths(r.period_months, r.period_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-primary">
                        ₹{Number(r.total_amount).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatExpires(r.expires_at)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(r)}
                            disabled={!r.pdf_url}
                          >
                            <Download className="w-3 h-3 mr-1" /> PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(r)}
                            disabled={!r.pdf_url}
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParentFees;
