import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Student } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobilePageLoading } from '@/components/layouts/MobilePageLoading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CreditCard, CheckCircle2, Clock, AlertCircle,
  Receipt, Download, Printer, Search, FileText, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudentFees() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptSearch, setReceiptSearch] = useState('');

  const fetchStudent = useCallback(async () => {
    if (!profile?.student_id) return;
    setLoading(true);
    const { data } = await api.getStudentById(profile.student_id);
    setStudent(data || null);
    setLoading(false);
  }, [profile?.student_id]);

  const fetchReceipts = useCallback(async () => {
    if (!profile?.student_id) return;
    setReceiptsLoading(true);
    const { data } = await api.getFeeReceipts(profile.student_id);
    setReceipts(data || []);
    setReceiptsLoading(false);
  }, [profile?.student_id]);

  useEffect(() => {
    fetchStudent();
    fetchReceipts();
  }, [fetchStudent, fetchReceipts]);

  const handleDownload = (receipt: any) => {
    if (!receipt.pdf_url) { toast.info('PDF not available for this receipt.'); return; }
    const a = document.createElement('a');
    a.href = receipt.pdf_url;
    a.download = `Receipt-${receipt.receipt_number}-${student?.name.replace(/\s+/g, '_') ?? 'student'}.pdf`;
    a.click();
  };

  const handlePrint = (receipt: any) => {
    if (!receipt.pdf_url) { toast.info('PDF not available for this receipt.'); return; }
    window.open(receipt.pdf_url, '_blank')?.print();
  };

  const getStatusIcon = (status: string) => {
    if (status?.toLowerCase() === 'paid') return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status?.toLowerCase() === 'pending') return <Clock className="w-5 h-5 text-warning" />;
    return <AlertCircle className="w-5 h-5 text-destructive" />;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: 'bg-success/10 text-success',
      pending: 'bg-warning/10 text-warning',
      overdue: 'bg-destructive/10 text-destructive',
    };
    const cls = map[status?.toLowerCase()] ?? 'bg-muted text-muted-foreground';
    return (
      <Badge className={`${cls} border-0`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </Badge>
    );
  };

  const filteredReceipts = receipts.filter((r) => {
    const q = receiptSearch.toLowerCase();
    return (
      r.receipt_number?.toLowerCase().includes(q) ||
      r.payment_method?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <MobilePageLoading message="Loading fees…" />;
  }

  if (!student) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          Student data not found.
        </CardContent>
      </Card>
    );
  }

  const totalAmount = student.fee_details.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <CreditCard className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          My Fees
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          View your fee details, payment status, and download receipts.
        </p>
      </div>

      {/* Summary card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Fee Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground mb-1">Overall Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(student.fee_status)}
                {getStatusBadge(student.fee_status)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-2xl md:text-3xl font-bold text-primary">
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">
            <CreditCard className="w-4 h-4 mr-2" />Fee Breakdown
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <Receipt className="w-4 h-4 mr-2" />Receipts
            {receipts.length > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                {receipts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Breakdown ── */}
        <TabsContent value="breakdown" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {student.fee_details.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No fee details available.</p>
              ) : (
                <div className="space-y-3">
                  {student.fee_details.map((fee, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 md:p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium text-sm md:text-base truncate">{fee.description}</p>
                        {fee.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(fee.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className="text-lg md:text-xl font-bold text-primary shrink-0 ml-4">
                        ₹{fee.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
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
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No receipts yet</p>
                <p className="text-sm mt-1">
                  Receipts will appear here once your fee payments are confirmed by the school.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden grid gap-3">
                {filteredReceipts.map((r) => (
                  <Card key={r.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Receipt #</p>
                          <p className="font-mono text-sm font-semibold text-primary truncate">
                            {r.receipt_number}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-bold text-primary">
                            ₹{Number(r.total_amount).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p>{new Date(r.payment_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Method</p>
                          <p className="capitalize">{r.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Items</p>
                          <p>{Array.isArray(r.items) ? r.items.length : 0} item(s)</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="capitalize">{r.status || 'Paid'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(r)}
                          disabled={!r.pdf_url}
                          className="flex-1"
                        >
                          <Download className="w-3 h-3 mr-1.5" /> PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(r)}
                          disabled={!r.pdf_url}
                          className="shrink-0"
                          aria-label="Print receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block border rounded-lg bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Receipt #</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Method</TableHead>
                      <TableHead className="whitespace-nowrap">Items</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Download</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">
                          {r.receipt_number}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(r.payment_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{r.payment_method}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {Array.isArray(r.items) ? r.items.length : 0} item(s)
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-primary">
                          ₹{Number(r.total_amount).toLocaleString('en-IN')}
                        </TableCell>
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
