import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Student, Notice, Admission, Appointment, FeePayment, Attendance, Exam, MasterFee } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import StatCard from './StatCard';
import AnalyticsChart from './AnalyticsChart';
import RecentActivity from './RecentActivity';
import NeedsAttention from './NeedsAttention';
import ContinueWhereLeftOff from './ContinueWhereLeftOff';
import { ActivityItem, AttentionItem, ResumeContext, AnalyticsPeriod } from './types';
import { getRangeForPeriod, toISODate, bucketDatesByLabel, bucketCreatedAtByLabel } from './dashboardHelpers';
import {
  Users,
  CalendarCheck,
  CreditCard,
  Wallet,
  UserPlus,
} from 'lucide-react';

export default function DesktopDashboard() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [masterFees, setMasterFees] = useState<MasterFee[]>([]);

  const [attendancePeriod, setAttendancePeriod] = useState<AnalyticsPeriod>('today');
  const [feePeriod, setFeePeriod] = useState<AnalyticsPeriod>('today');
  const [admissionsPeriod, setAdmissionsPeriod] = useState<AnalyticsPeriod>('today');
  const [examsPeriod, setExamsPeriod] = useState<AnalyticsPeriod>('today');
  const [enrollmentPeriod, setEnrollmentPeriod] = useState<AnalyticsPeriod>('today');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        studentsRes,
        noticesRes,
        admissionsRes,
        appointmentsRes,
        feeRes,
        attendanceRes,
        examsRes,
        certificatesRes,
        queriesRes,
        masterFeesRes,
      ] = await Promise.all([
        api.getStudents(),
        api.getNotices(),
        api.getAdmissions(),
        api.getAppointments(),
        api.getAllFeePayments({ excludeRevoked: true }),
        api.getAllAttendanceForRange(
          toISODate(getRangeForPeriod('1y').start),
          toISODate(getRangeForPeriod('1y').end)
        ),
        api.getExamsForRange(
          toISODate(getRangeForPeriod('1y').start),
          toISODate(getRangeForPeriod('1y').end)
        ),
        api.getCertificates(),
        api.getQueries(undefined, undefined, 'pending'),
        api.getMasterFees(),
      ]);

      setStudents(studentsRes.data || []);
      setNotices(noticesRes.data || []);
      setAdmissions(admissionsRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setFeePayments(feeRes.data || []);
      setAttendance(attendanceRes.data || []);
      setExams(examsRes.data || []);
      setCertificates(certificatesRes.data || []);
      setQueries(queriesRes.data || []);
      setMasterFees(masterFeesRes.data || []);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('admin_dashboard_desktop_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_queries' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active'), [students]);

  const todayStr = useMemo(() => toISODate(new Date()), []);
  const todayAttendance = useMemo(() => {
    const todayRecords = attendance.filter((a) => a.date === todayStr);
    if (todayRecords.length === 0) return null;
    const present = todayRecords.filter((a) => a.status === 'Present').length;
    return Math.round((present / todayRecords.length) * 100);
  }, [attendance, todayStr]);

  const feesCollected = useMemo(() => {
    const todayPayments = feePayments.filter((p) => p.payment_date === todayStr && !p.is_revoked);
    return todayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [feePayments, todayStr]);

  const feesPending = useMemo(() => {
    const totalCapacity = activeStudents.reduce((sum, s) => {
      const fee = masterFees.find((m) => m.class_name === s.class);
      return sum + (fee?.total_amount || 0);
    }, 0);
    const allTimeCollected = feePayments
      .filter((p) => !p.is_revoked)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return Math.max(0, totalCapacity - allTimeCollected);
  }, [activeStudents, masterFees, feePayments]);

  const pendingAdmissions = useMemo(() => admissions.filter((a) => a.status === 'pending'), [admissions]);
  const pendingAppointments = useMemo(() => appointments.filter((a) => a.status === 'pending'), [appointments]);

  const buildAttendanceData = useCallback(
    (period: AnalyticsPeriod) => {
      const { start, end } = getRangeForPeriod(period);
      const filtered = attendance.filter((a) => a.date >= toISODate(start) && a.date <= toISODate(end));
      return bucketDatesByLabel(
        filtered.map((a) => ({ date: a.date, status: a.status })),
        period,
        start,
        end,
        (bucket) => {
          if (bucket.length === 0) return 0;
          const present = bucket.filter((b) => b.status === 'Present').length;
          return Math.round((present / bucket.length) * 100);
        }
      );
    },
    [attendance]
  );

  const buildFeeData = useCallback(
    (period: AnalyticsPeriod) => {
      const { start, end } = getRangeForPeriod(period);
      const filtered = feePayments.filter((p) => !p.is_revoked && p.payment_date >= toISODate(start) && p.payment_date <= toISODate(end));
      return bucketDatesByLabel(
        filtered.map((p) => ({ date: p.payment_date, amount: Number(p.amount) || 0 })),
        period,
        start,
        end,
        (bucket) => bucket.reduce((sum, b) => sum + (b.amount || 0), 0)
      );
    },
    [feePayments]
  );

  const buildAdmissionsData = useCallback(
    (period: AnalyticsPeriod) => {
      const { start, end } = getRangeForPeriod(period);
      const filtered = admissions.filter((a) => a.created_at && a.created_at >= toISODate(start) && a.created_at <= toISODate(end));
      return bucketCreatedAtByLabel(filtered, period, start, end);
    },
    [admissions]
  );

  const buildExamsData = useCallback(
    (period: AnalyticsPeriod) => {
      const { start, end } = getRangeForPeriod(period);
      const filtered = exams.filter((e) => e.date >= toISODate(start) && e.date <= toISODate(end));
      return bucketDatesByLabel(filtered.map((e) => ({ date: e.date })), period, start, end, (b) => b.length);
    },
    [exams]
  );

  const buildEnrollmentData = useCallback(
    (period: AnalyticsPeriod) => {
      const { start, end } = getRangeForPeriod(period);
      const filtered = students.filter((s) => s.created_at && s.created_at >= toISODate(start) && s.created_at <= toISODate(end));
      return bucketCreatedAtByLabel(filtered, period, start, end);
    },
    [students]
  );

  const activityItems = useMemo<ActivityItem[]>(() => {
    const raw: ActivityItem[] = [
      ...students
        .filter((s) => s.created_at)
        .slice(0, 20)
        .map((s) => ({
          id: `student-${s.id}`,
          type: 'student' as const,
          message: `New student added: ${s.name}`,
          timestamp: s.created_at!,
        })),
      ...feePayments
        .filter((p) => p.payment_date)
        .slice(0, 20)
        .map((p) => ({
          id: `fee-${p.id}`,
          type: 'fee' as const,
          message: `Fee payment recorded: ${p.payment_period || 'Fee'} — ₹${Number(p.amount).toLocaleString('en-IN')}`,
          timestamp: p.payment_date,
        })),
      ...admissions
        .filter((a) => a.created_at)
        .slice(0, 20)
        .map((a) => ({
          id: `admission-${a.id}`,
          type: 'admission' as const,
          message: `Admission updated: ${a.student_name || 'Admission'}`,
          timestamp: a.created_at!,
        })),
      ...notices
        .filter((n) => n.created_at)
        .slice(0, 20)
        .map((n) => ({
          id: `notice-${n.id}`,
          type: 'notice' as const,
          message: `Notice published: ${n.title}`,
          timestamp: n.created_at!,
        })),
      ...certificates
        .filter((c) => c.created_at)
        .slice(0, 20)
        .map((c) => ({
          id: `certificate-${c.id}`,
          type: 'certificate' as const,
          message: `Certificate generated: ${c.student_name || c.type}`,
          timestamp: c.created_at!,
        })),
      ...attendance
        .filter((a) => a.created_at)
        .slice(0, 20)
        .map((a) => ({
          id: `attendance-${a.id}`,
          type: 'attendance' as const,
          message: `Attendance submitted for ${a.date}`,
          timestamp: a.created_at!,
        })),
      ...exams
        .filter((e) => e.date)
        .slice(0, 20)
        .map((e) => ({
          id: `exam-${e.id}`,
          type: 'exam' as const,
          message: `Exam scheduled: ${e.title}`,
          timestamp: e.date,
        })),
    ];

    return raw
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [students, feePayments, admissions, notices, certificates, attendance, exams]);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    if (pendingAppointments.length > 0) {
      items.push({
        id: 'pending-appointments',
        type: 'event',
        title: 'Upcoming appointments',
        subtitle: `${pendingAppointments.length} appointment(s) require confirmation.`,
        action: 'Review appointments',
        link: '/admin/appointments',
      });
    }
    if (pendingAdmissions.length > 0) {
      items.push({
        id: 'pending-admissions',
        type: 'admission',
        title: 'Pending admissions',
        subtitle: `${pendingAdmissions.length} admission request(s) awaiting review.`,
        action: 'Review admissions',
        link: '/admin/admissions',
      });
    }
    if (queries.length > 0) {
      items.push({
        id: 'pending-queries',
        type: 'query',
        title: 'Pending student queries',
        subtitle: `${queries.length} query(s) need a reply.`,
        action: 'Reply now',
        link: '/admin/queries',
      });
    }
    const unsubmittedAttendance = activeStudents.length > 0 && todayAttendance === null;
    if (unsubmittedAttendance) {
      items.push({
        id: 'unsubmitted-attendance',
        type: 'attendance',
        title: 'Attendance not submitted',
        subtitle: 'No attendance records found for today.',
        action: 'Mark attendance',
        link: '/admin/attendance',
      });
    }
    if (feesPending > 0) {
      items.push({
        id: 'pending-fees',
        type: 'fee',
        title: 'Fees pending',
        subtitle: `Approximately ₹${Math.round(feesPending).toLocaleString('en-IN')} remains uncollected.`,
        action: 'Go to Fees',
        link: '/admin/fees',
      });
    }
    return items.slice(0, 5);
  }, [pendingAppointments, pendingAdmissions, queries, activeStudents.length, todayAttendance, feesPending]);

  const resumeContext = useMemo<ResumeContext | null>(() => {
    const latest = activityItems[0];
    if (!latest) return null;
    switch (latest.type) {
      case 'fee':
        return { title: 'Fee Management', subtitle: 'You were reviewing fee payments.', link: '/admin/fees' };
      case 'student':
        return { title: 'Student Management', subtitle: 'You recently added a student.', link: '/admin/students' };
      case 'admission':
        return { title: 'Admissions', subtitle: 'You were reviewing admission requests.', link: '/admin/admissions' };
      case 'notice':
        return { title: 'Notices', subtitle: 'You recently published a notice.', link: '/admin/notices' };
      case 'certificate':
        return { title: 'Certificates', subtitle: 'You recently generated a certificate.', link: '/admin/templates' };
      case 'attendance':
        return { title: 'Attendance', subtitle: 'You recently submitted attendance.', link: '/admin/attendance' };
      default:
        return null;
    }
  }, [activityItems]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">School Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Live monitoring and overview of the school ecosystem.</p>
        </div>
        <div className="hidden md:block text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Continue where left off */}
      <ContinueWhereLeftOff context={resumeContext} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Students" value={activeStudents.length} icon={Users} />
        <StatCard
          title="Today's Attendance"
          value={todayAttendance !== null ? `${todayAttendance}%` : '—'}
          icon={CalendarCheck}
          trend={todayAttendance !== null ? 'of active students' : 'No records yet'}
        />
        <StatCard title="Fees Collected" value={`₹${feesCollected.toLocaleString('en-IN')}`} icon={Wallet} />
        <StatCard title="Fees Pending" value={`₹${Math.round(feesPending).toLocaleString('en-IN')}`} icon={CreditCard} />
        <StatCard title="Pending Admissions" value={pendingAdmissions.length} icon={UserPlus} />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnalyticsChart
          title="Overall Attendance"
          subtitle="School-wide attendance percentage"
          data={buildAttendanceData(attendancePeriod)}
          period={attendancePeriod}
          onChangePeriod={setAttendancePeriod}
          suffix="%"
          metric={todayAttendance !== null ? `${todayAttendance}%` : undefined}
        />
        <AnalyticsChart
          title="Fee Collection"
          subtitle="Fees collected over the period"
          data={buildFeeData(feePeriod)}
          period={feePeriod}
          onChangePeriod={setFeePeriod}
          metric={feesCollected > 0 ? `₹${feesCollected.toLocaleString('en-IN')}` : undefined}
        />
        <AnalyticsChart
          title="Admissions"
          subtitle="New admission requests"
          data={buildAdmissionsData(admissionsPeriod)}
          period={admissionsPeriod}
          onChangePeriod={setAdmissionsPeriod}
        />
        <AnalyticsChart
          title="Academic Performance"
          subtitle="Exams scheduled over the period"
          data={buildExamsData(examsPeriod)}
          period={examsPeriod}
          onChangePeriod={setExamsPeriod}
        />
        <AnalyticsChart
          title="Student Strength"
          subtitle="New enrollments over the period"
          data={buildEnrollmentData(enrollmentPeriod)}
          period={enrollmentPeriod}
          onChangePeriod={setEnrollmentPeriod}
        />
      </div>

      {/* Recent Activity + Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity items={activityItems} />
        </div>
        <div className="lg:col-span-1">
          <NeedsAttention items={attentionItems} />
        </div>
      </div>

    </div>
  );
}
