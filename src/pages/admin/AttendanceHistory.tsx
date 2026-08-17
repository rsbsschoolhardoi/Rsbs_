import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Class } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Download, Filter, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';

export default function AttendanceHistory() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [earlyLeavesData, setEarlyLeavesData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    studentId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await api.getClasses();
      setClasses(data || []);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchHistory();

    const channel1 = supabase
      .channel('attendance_history_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance'
      }, () => {
        fetchHistory();
      })
      .subscribe();

    const channel2 = supabase
      .channel('early_leaves_history_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'early_leaves'
      }, () => {
        fetchHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [filters]);


  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: attendance } = await api.getAttendanceHistory({
        classId: filters.classId || undefined,
        sectionId: filters.sectionId || undefined,
        studentId: filters.studentId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      // For early leaves, we only fetch for the specified date range
      // If no range is specified, we'll fetch all and filter client-side or we could add a method to api.ts
      // Let's add a more general getEarlyLeavesHistory to api.ts or use the existing getEarlyLeavesByDate in a loop
      // Better: add getEarlyLeavesHistory to api.ts
      
      const { data: earlyLeaves } = await api.getEarlyLeavesHistory({
        classId: filters.classId || undefined,
        sectionId: filters.sectionId || undefined,
        studentId: filters.studentId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      setAttendanceData(attendance || []);
      setEarlyLeavesData(earlyLeaves || []);
    } catch (error: any) {
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find(c => c.id === filters.classId);

  const calculateStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter(a => a.status === 'Present').length;
    const absent = attendanceData.filter(a => a.status === 'Absent').length;
    const late = attendanceData.filter(a => a.status === 'Late').length;
    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : '0';
    return { total, present, absent, late, percentage };
  };

  const stats = calculateStats();

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Attendance History</h1>
          <p className="text-xs md:text-sm text-muted-foreground">View and analyze attendance records with advanced filters.</p>
        </div>
        <Button type="button" variant="outline" className="rounded-xl h-10 px-6" disabled onClick={() => {}}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select onValueChange={(val) => setFilters({ ...filters, classId: val === 'all' ? '' : val, sectionId: '' })} value={filters.classId || 'all'}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(val) => setFilters({ ...filters, sectionId: val === 'all' ? '' : val })}
              value={filters.sectionId || 'all'}
              disabled={!filters.classId}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {selectedClass?.sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button onClick={fetchHistory} disabled={loading} className="rounded-xl flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ classId: '', sectionId: '', studentId: '', startDate: '', endDate: '' });
                  setAttendanceData([]);
                }}
                className="rounded-xl"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {attendanceData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Records</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Present</p>
              <p className="text-2xl font-black text-green-700 dark:text-green-300 mt-1">{stats.present}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Absent</p>
              <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">{stats.absent}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Percentage
              </p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{stats.percentage}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No attendance records found. Apply filters to view data.</p>
            </div>
          ) : (
            <div className="border rounded-2xl bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((record) => {
                    const earlyLeave = earlyLeavesData.find(el => el.student_id === record.student_id && el.date === record.date);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs">{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{record.students?.name || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{record.students?.class} - {record.students?.section}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              className={`text-[10px] px-2 py-0 h-5 w-fit ${
                                record.status === 'Present'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none'
                                  : record.status === 'Absent'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-none'
                              }`}
                            >
                              {record.status}
                            </Badge>
                            {earlyLeave && (
                              <Badge className="text-[10px] px-2 py-0 h-5 w-fit bg-amber-500 text-white hover:bg-amber-500 border-none">
                                Early Leave: {earlyLeave.exit_time.substring(0, 5)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {earlyLeave && (
                          <TableCell className="text-[10px] text-muted-foreground italic max-w-[200px] truncate">
                            {earlyLeave.reason}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
