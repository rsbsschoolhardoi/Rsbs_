import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Student, Class } from '@/types';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Filter, UserCheck, CheckSquare, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

export default function Alumni() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Tab 1: Select Students State
  const [selectionClassFilter, setSelectionClassFilter] = useState('all');
  const [selectionSectionFilter, setSelectionSectionFilter] = useState('all');
  const [selectionSessionFilter, setSelectionSessionFilter] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Tab 2: Pass-Out Records State
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [recordsClassFilter, setRecordsClassFilter] = useState('all');
  const [recordsSessionFilter, setRecordsSessionFilter] = useState('all');
  const [viewingRecord, setViewingRecord] = useState<Student | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [studentsRes, classesRes] = await Promise.all([
      api.getStudents(),
      api.getClasses(),
    ]);
    setStudents(studentsRes.data || []);
    setClasses(classesRes.data || []);
    setLoading(false);
  };

  // Filter active students for Tab 1
  const activeStudents = students.filter(s => s.status === 'active');

  const filteredActiveStudents = activeStudents.filter(s => {
    const matchesClass = selectionClassFilter === 'all' || s.class_id === selectionClassFilter;
    const matchesSection = selectionSectionFilter === 'all' || s.section_id === selectionSectionFilter;
    const matchesSession = selectionSessionFilter === 'all' || s.session_info === selectionSessionFilter;
    return matchesClass && matchesSection && matchesSession;
  });

  // Pass-out records for Tab 2
  const passOutRecords = students.filter(s => s.status === 'passout');

  const filteredRecords = passOutRecords.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(recordsSearchTerm.toLowerCase());
    const matchesClass = recordsClassFilter === 'all' || r.class_id === recordsClassFilter;
    const matchesSession = recordsSessionFilter === 'all' || r.session_info === recordsSessionFilter;
    return matchesSearch && matchesClass && matchesSession;
  });

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredActiveStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredActiveStudents.map(s => s.id));
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleMarkAsPassOut = () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to mark as pass-out.');
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmPassOut = async () => {
    setShowConfirmDialog(false);
    setProcessing(true);

    try {
      const { error } = await api.passOutStudents(selectedStudents);
      
      if (error) {
        const errorMsg = await error?.context?.text?.();
        toast.error(errorMsg || 'Failed to mark students as pass-out. Please try again.');
        setProcessing(false);
        return;
      }

      // Success - refresh data
      await fetchData();
      toast.success(`${selectedStudents.length} student(s) have been successfully marked as Pass-Out.`);
      setSelectedStudents([]);
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  // Get unique sessions from students
  const uniqueSessions = Array.from(new Set(students.map(s => s.session_info))).sort();

  // Get sections for selected class
  const selectedClassSections = classes.find(c => c.id === selectionClassFilter)?.sections || [];

  return (
    <div className="flex flex-col h-full space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Pass-Out Students</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Manage student graduation records with a two-step process: selection and record management.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="select" className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="select" className="font-bold">
            <UserCheck className="w-4 h-4 mr-2" />
            Select Students
          </TabsTrigger>
          <TabsTrigger value="records" className="font-bold">
            <CheckSquare className="w-4 h-4 mr-2" />
            Pass-Out Records
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Select Students */}
        <TabsContent value="select" className="flex-1 flex flex-col space-y-4 mt-0">
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <h3 className="text-sm font-bold text-primary mb-3">Filter Active Students</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={selectionClassFilter} onValueChange={setSelectionClassFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-muted bg-background">
                    <SelectValue placeholder="Class (Required)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={selectionSectionFilter} onValueChange={setSelectionSectionFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-muted bg-background">
                    <SelectValue placeholder="Section (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Sections</SelectItem>
                    {selectedClassSections.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={selectionSessionFilter} onValueChange={setSelectionSessionFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-muted bg-background">
                    <SelectValue placeholder="Session (Required)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Sessions</SelectItem>
                    {uniqueSessions.map(session => (
                      <SelectItem key={session} value={session}>{session}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col border rounded-2xl bg-card shadow-sm">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-muted" />)}
              </div>
            ) : filteredActiveStudents.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold text-lg">No active students available.</p>
                <p className="text-sm mt-1">Adjust your filters or check back later.</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedStudents.length === filteredActiveStudents.length && filteredActiveStudents.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="rounded-md"
                    />
                    <span className="text-sm font-bold text-primary">Select All ({filteredActiveStudents.length})</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                    {selectedStudents.length} Selected
                  </Badge>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="font-bold">Student Name</TableHead>
                        <TableHead className="font-bold">Class</TableHead>
                        <TableHead className="font-bold">Section</TableHead>
                        <TableHead className="font-bold">Session</TableHead>
                        <TableHead className="font-bold">Contact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActiveStudents.map((student) => (
                        <TableRow key={student.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <Checkbox 
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => handleSelectStudent(student.id)}
                              className="rounded-md"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-primary/10">
                                <AvatarImage src={student.profile_picture_url || ''} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                  {student.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-primary">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{student.class}</TableCell>
                          <TableCell className="font-medium">{student.section}</TableCell>
                          <TableCell className="font-medium text-muted-foreground">{student.session_info}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{student.contact}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-4 border-t bg-muted/10 flex justify-end">
                  <Button 
                    onClick={handleMarkAsPassOut}
                    disabled={selectedStudents.length === 0 || processing}
                    className="h-11 px-8 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    {processing ? 'Processing...' : `Mark as Pass-Out (${selectedStudents.length})`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Pass-Out Records */}
        <TabsContent value="records" className="flex-1 flex flex-col space-y-4 mt-0">
          <div className="bg-warning/10/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-500/10">
            <h3 className="text-sm font-bold text-warning dark:text-amber-400 mb-3">Search & Filter Records</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search records..." 
                  className="pl-10 h-10 rounded-xl border-muted bg-background" 
                  value={recordsSearchTerm}
                  onChange={(e) => setRecordsSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={recordsClassFilter} onValueChange={setRecordsClassFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-muted bg-background">
                    <SelectValue placeholder="Filter by Class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={recordsSessionFilter} onValueChange={setRecordsSessionFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-muted bg-background">
                    <SelectValue placeholder="Filter by Session" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Sessions</SelectItem>
                    {uniqueSessions.map(session => (
                      <SelectItem key={session} value={session}>{session}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col border rounded-2xl bg-card shadow-sm">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-muted" />)}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold text-lg">No pass-out records yet</p>
                <p className="text-sm mt-1">Records will appear here once students are marked as pass-out.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold">Student Name</TableHead>
                      <TableHead className="font-bold">Class</TableHead>
                      <TableHead className="font-bold">Session</TableHead>
                      <TableHead className="font-bold text-center">Status</TableHead>
                      <TableHead className="font-bold">Pass-Out Date</TableHead>
                      <TableHead className="font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-primary/10">
                              <AvatarImage src={record.profile_picture_url || ''} />
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                {record.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-primary">{record.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{record.class}</TableCell>
                        <TableCell className="font-medium text-muted-foreground">{record.session_info}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-warning/10 text-warning border-amber-200 uppercase text-xs font-semibold">
                            Pass-Out
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.passout_date ? new Date(record.passout_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => setViewingRecord(record)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-warning/10 dark:bg-amber-950">
                <AlertTriangle className="w-6 h-6 text-warning dark:text-amber-400" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Confirm Pass-Out Action</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              Are you sure you want to mark the selected <span className="font-bold text-primary">{selectedStudents.length} student(s)</span> as Pass-Out? 
              This action will <span className="font-bold">revoke their system access</span> immediately and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPassOut}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Confirm Pass-Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Full Profile Dialog */}
      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md overflow-hidden p-0">
          <div className="bg-warning/10/50 dark:bg-amber-950/20 p-6 flex flex-col items-center gap-4 border-b border-amber-500/10">
            <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
              <AvatarImage src={viewingRecord?.profile_picture_url || ''} />
              <AvatarFallback className="bg-warning/10 text-warning text-2xl font-semibold">
                {viewingRecord?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-bold text-primary">{viewingRecord?.name}</h2>
              <Badge variant="outline" className="bg-warning/10 text-warning border-amber-200 uppercase text-xs font-semibold mt-1 px-3">
                Pass-Out
              </Badge>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {viewingRecord?.class && (
                <div className="space-y-1">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Class</p>
                  <p className="text-sm font-bold">{viewingRecord.class}</p>
                </div>
              )}
              {viewingRecord?.section && (
                <div className="space-y-1 text-right">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Section</p>
                  <p className="text-sm font-bold">{viewingRecord.section}</p>
                </div>
              )}
              {viewingRecord?.session_info && (
                <div className="space-y-1">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Session</p>
                  <p className="text-sm font-bold">{viewingRecord.session_info}</p>
                </div>
              )}
              {viewingRecord?.passout_date && (
                <div className="space-y-1 text-right">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Pass-Out Date</p>
                  <p className="text-sm font-bold text-warning">
                    {new Date(viewingRecord.passout_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {viewingRecord?.dob && (
                <div className="space-y-1">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Date of Birth</p>
                  <p className="text-sm font-bold">{viewingRecord.dob}</p>
                </div>
              )}
              {viewingRecord?.contact && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Contact</p>
                  <p className="text-sm font-bold">{viewingRecord.contact}</p>
                </div>
              )}
              {viewingRecord?.email && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">Email</p>
                  <p className="text-sm font-bold">{viewingRecord.email}</p>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-muted">
              <Button className="w-full rounded-xl font-bold" onClick={() => setViewingRecord(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
