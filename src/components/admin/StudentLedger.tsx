import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Student, FeePayment, ExtraFee } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Receipt, TrendingUp, Wallet, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Auto-detect current fiscal session (Apr–Mar)
function getCurrentSession(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

interface StudentLedgerProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateReceipt: (student: Student) => void;
  masterFeeTotal?: number;
}

export default function StudentLedger({
  student, open, onOpenChange, onGenerateReceipt, masterFeeTotal,
}: StudentLedgerProps) {
  const currentSession = getCurrentSession();

  const [corePayments, setCorePayments] = useState<FeePayment[]>([]);
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [corePaidTotal, setCorePaidTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      api.getFeePayments(student.id, currentSession),
      api.getExtraFees(student.id, currentSession),
      api.getFeeReceipts(student.id),
      api.getStudentCorePaidTotal(student.id, currentSession),
    ]).then(([{ data: pays }, { data: extras }, { data: recs }, { data: paid }]) => {
      setCorePayments((pays ?? []) as FeePayment[]);
      setExtraFees(extras ?? []);
      setReceipts(recs ?? []);
      setCorePaidTotal(paid ?? 0);
      setLoading(false);
    });
  }, [open, student.id, currentSession]);

  const extraTotal = extraFees.reduce((s, ef) => s + ef.amount, 0);
  const outstanding = masterFeeTotal ? Math.max(0, masterFeeTotal - corePaidTotal) : null;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {student.name}
            <span className="text-sm font-normal text-muted-foreground">— Fee Ledger</span>
          </DialogTitle>
          <DialogDescription>
            {student.login_id} · Class {student.class}{student.section ? ` – ${student.section}` : ''} · {currentSession}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading ledger…
          </div>
        ) : (
          <div className="space-y-6 pb-2">

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Yearly Cap</p>
                <p className="font-bold text-base mt-0.5">
                  {masterFeeTotal ? `₹${masterFeeTotal.toLocaleString('en-IN')}` : <span className="text-amber-600 text-xs">Not set</span>}
                </p>
              </div>
              <div className="rounded-lg border bg-green-50 p-3">
                <p className="text-xs text-muted-foreground">Core Paid</p>
                <p className="font-bold text-base text-green-700 mt-0.5">₹{corePaidTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className={`rounded-lg border p-3 ${outstanding === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className={`font-bold text-base mt-0.5 ${outstanding === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  {outstanding !== null ? `₹${outstanding.toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
              <div className="rounded-lg border bg-orange-50 p-3">
                <p className="text-xs text-muted-foreground">Extra / Other</p>
                <p className="font-bold text-base text-orange-700 mt-0.5">₹{extraTotal.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* ── Core Fee Payments ── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" /> Core Fee Payments
                </h3>
                <Button size="sm" onClick={() => onGenerateReceipt(student)}>
                  <Receipt className="w-3.5 h-3.5 mr-1.5" /> Generate Receipt
                </Button>
              </div>
              {corePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No core fee payments for {currentSession} yet.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Period</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Date</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Method</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corePayments.map((p, i) => (
                        <tr key={p.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{p.payment_period}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(p.payment_date)}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.payment_method}</td>
                          <td className="px-3 py-2 font-bold text-primary text-right whitespace-nowrap">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/40 border-t">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-xs font-semibold">Total Core Paid</td>
                        <td className="px-3 py-2 font-bold text-primary text-right whitespace-nowrap">₹{corePaidTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            {/* ── Extra / Other Fees ── */}
            {extraFees.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <Wallet className="w-4 h-4 text-orange-500" /> Extra / Other Fees
                  <span className="text-xs font-normal text-muted-foreground">(isolated from core cap)</span>
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Category</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Description</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Reason</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Date</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraFees.map((ef, i) => (
                        <tr key={ef.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Badge variant="outline" className={`text-xs ${ef.fee_category === 'extra' ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
                              {ef.fee_category === 'extra' ? 'Extra' : 'Other'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{ef.description}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs max-w-[180px] truncate" title={ef.reason}>{ef.reason}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(ef.payment_date)}</td>
                          <td className="px-3 py-2 font-bold text-orange-600 text-right whitespace-nowrap">₹{Number(ef.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Receipt History ── */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Receipt className="w-4 h-4 text-primary" /> Receipt History
              </h3>
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No receipts generated yet for this student.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Receipt #</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Date</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">Method</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">Amount</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-primary whitespace-nowrap">{r.receipt_number}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(r.payment_date)}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.payment_method}</td>
                          <td className="px-3 py-2 font-bold text-primary text-right whitespace-nowrap">₹{Number(r.total_amount).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {r.pdf_url ? (
                              <Button variant="ghost" size="sm" className="h-7 text-xs"
                                onClick={() => window.open(r.pdf_url, '_blank')}>
                                <Download className="w-3 h-3 mr-1" /> PDF
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Compact student row card used in the Receipts tab list ──────────────────
interface StudentLedgerRowProps {
  student: Student;
  masterFeeTotal?: number;
  onOpen: (student: Student) => void;
}

export function StudentLedgerRow({ student, masterFeeTotal, onOpen }: StudentLedgerRowProps) {
  const statusCls = student.fee_status === 'Paid'
    ? 'bg-green-100 text-green-700'
    : student.fee_status === 'Pending'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

  return (
    <button
      onClick={() => onOpen(student)}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{student.name.charAt(0)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.login_id}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="hidden md:block text-xs text-muted-foreground">
          {student.class}{student.section ? ` – ${student.section}` : ''}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
          {student.fee_status}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}
