import { useEffect, useState, useCallback } from 'react';
import { api } from '@/db/api';
import { MasterFee } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { BookOpen, Pencil, Check, X, Plus, IndianRupee } from 'lucide-react';

interface MasterFeesPanelProps {
  currentSession: string;
}

// Derive a fiscal-year session string from today, auto-advancing on April 1
function getCurrentSession(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based; April = 3
  return m >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const SESSIONS = (() => {
  const base = parseInt(getCurrentSession().split('-')[0]);
  return [base - 1, base, base + 1].map(y => `${y}-${y + 1}`);
})();

export default function MasterFeesPanel({ currentSession }: MasterFeesPanelProps) {
  const [session, setSession] = useState(currentSession);
  const [masterFees, setMasterFees] = useState<MasterFee[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<string | null>(null); // class_name being edited
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newClass, setNewClass] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: mf }, { data: cls }] = await Promise.all([
      api.getMasterFees(session),
      api.getClasses(),
    ]);
    setMasterFees(mf ?? []);
    setClasses((cls ?? []).map((c: any) => c.name).sort());
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdit = (fee: MasterFee) => {
    setEditingRow(fee.class_name);
    setEditAmount(String(fee.total_amount));
  };

  const handleSave = async (className: string) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    const { error } = await api.upsertMasterFee(className, session, amt);
    setSaving(false);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    toast.success(`Master fee for ${className} updated`);
    setEditingRow(null);
    fetchData();
  };

  const handleAddNew = async () => {
    if (!newClass) { toast.error('Select a class'); return; }
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid amount'); return; }
    // check duplicate
    if (masterFees.find(f => f.class_name === newClass)) {
      toast.error(`A master fee for ${newClass} already exists — click Edit to update it`);
      return;
    }
    setSaving(true);
    const { error } = await api.upsertMasterFee(newClass, session, amt);
    setSaving(false);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    toast.success(`Master fee for ${newClass} (${session}) set to ₹${amt.toLocaleString('en-IN')}`);
    setAddingNew(false);
    setNewClass('');
    setNewAmount('');
    fetchData();
  };

  // Classes that don't yet have a master fee for this session
  const unsetClasses = classes.filter(c => !masterFees.find(f => f.class_name === c));

  return (
    <div className="space-y-6">
      {/* Session selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Master Yearly Fees</h2>
          <p className="text-sm text-muted-foreground">
            Set the total annual fee cap per class. Core payments cannot exceed this limit.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-muted-foreground">Session:</span>
          <div className="flex gap-1">
            {SESSIONS.map(s => (
              <Button
                key={s}
                size="sm"
                variant={session === s ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => setSession(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Session</p>
            <p className="font-bold text-primary text-sm">{session}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Classes Configured</p>
            <p className="font-bold text-lg">{masterFees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Classes Pending</p>
            <p className="font-bold text-lg text-warning">{unsetClasses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Highest Fee</p>
            <p className="font-bold text-sm">
              {masterFees.length > 0
                ? `₹${Math.max(...masterFees.map(f => f.total_amount)).toLocaleString('en-IN')}`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Master fees table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Class-wise Annual Fee Schedule — {session}
          </CardTitle>
          <Button size="sm" onClick={() => setAddingNew(true)} disabled={unsetClasses.length === 0}>
            <Plus className="w-4 h-4 mr-1" /> Add Class
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap pl-4">Class</TableHead>
                  <TableHead className="whitespace-nowrap">Session</TableHead>
                  <TableHead className="whitespace-nowrap">Total Yearly Fee (₹)</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading master fees…
                    </TableCell>
                  </TableRow>
                ) : masterFees.length === 0 && !addingNew ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No master fees configured for {session}. Click "Add Class" to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {masterFees.map(fee => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-semibold whitespace-nowrap pl-4">{fee.class_name}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fee.session_year}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {editingRow === fee.class_name ? (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">₹</span>
                              <Input
                                type="number"
                                min={0}
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                className="h-8 w-32 text-sm"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSave(fee.class_name); if (e.key === 'Escape') setEditingRow(null); }}
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-primary">
                              ₹{Number(fee.total_amount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">
                            Configured
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap pr-4">
                          {editingRow === fee.class_name ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave(fee.class_name)} disabled={saving}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setEditingRow(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(fee)}>
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Add new row */}
                    {addingNew && (
                      <TableRow className="bg-primary/5 border-primary/20">
                        <TableCell className="pl-4">
                          <select
                            value={newClass}
                            onChange={e => setNewClass(e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm w-36"
                          >
                            <option value="">Select class…</option>
                            {unsetClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{session}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IndianRupee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <Input
                              type="number"
                              min={0}
                              placeholder="e.g. 45000"
                              value={newAmount}
                              onChange={e => setNewAmount(e.target.value)}
                              className="h-8 w-32 text-sm"
                              onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setAddingNew(false); }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs text-warning border-amber-300">New</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white" onClick={handleAddNew} disabled={saving}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setAddingNew(false)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Unconfigured classes warning */}
          {unsetClasses.length > 0 && !loading && (
            <div className="mx-4 mb-4 mt-2 p-3 rounded-lg bg-warning/10 border border-amber-200">
              <p className="text-xs font-medium text-warning mb-1">
                Classes not yet configured for {session}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unsetClasses.map(c => (
                  <Badge key={c} variant="outline" className="text-xs border-amber-300 text-warning cursor-pointer hover:bg-warning/10"
                    onClick={() => { setAddingNew(true); setNewClass(c); }}>
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
