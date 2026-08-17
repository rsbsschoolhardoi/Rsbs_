import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Users, GraduationCap, UserPlus, CalendarCheck, Megaphone, Loader2, ArrowRight } from 'lucide-react';
import { Student, Teacher, Admission, Appointment, Notice } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function AdminSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    students: Student[];
    teachers: Teacher[];
    admissions: Admission[];
    appointments: Appointment[];
  }>({
    students: [],
    teachers: [],
    admissions: [],
    appointments: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ students: [], teachers: [], admissions: [], appointments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [studentRes, teacherRes, admissionRes, appointmentRes] = await Promise.all([
          api.getStudents(),
          api.getTeachers(),
          api.getAdmissions(),
          api.getAppointments()
        ]);

        const q = query.toLowerCase();
        
        setResults({
          students: (studentRes.data || []).filter(s => s.name.toLowerCase().includes(q) || s.login_id.toLowerCase().includes(q)),
          teachers: (teacherRes.data || []).filter(t => t.name.toLowerCase().includes(q) || t.subject_role.toLowerCase().includes(q)),
          admissions: (admissionRes.data || []).filter(a => a.student_name.toLowerCase().includes(q) || a.parent_name.toLowerCase().includes(q)),
          appointments: (appointmentRes.data || []).filter(ap => ap.parent_name.toLowerCase().includes(q) || ap.student_name?.toLowerCase().includes(q))
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.students.length > 0 || results.teachers.length > 0 || results.admissions.length > 0 || results.appointments.length > 0;

  return (
    <div className="flex flex-col space-y-6 pb-24 px-4 pt-4 max-w-7xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input 
          placeholder="Search students, teachers, admissions..." 
          className="pl-12 h-14 rounded-2xl border-none shadow-lg bg-background text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary w-5 h-5" />}
      </div>

      {!query.trim() ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
          <Search className="w-16 h-16 mb-4" />
          <p className="font-bold uppercase tracking-widest text-sm">Type to search the ecosystem</p>
        </div>
      ) : !hasResults && !loading ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground font-bold italic">No results found for "{query}"</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Students */}
          {results.students.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                <Users className="w-3 h-3" /> Students ({results.students.length})
              </h3>
              <div className="grid gap-3">
                {results.students.map(student => (
                  <Link key={student.id} to={`/admin/students`} className="block">
                    <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {student.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black">{student.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{student.class} - {student.section}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Teachers */}
          {results.teachers.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                <GraduationCap className="w-3 h-3" /> Teachers ({results.teachers.length})
              </h3>
              <div className="grid gap-3">
                {results.teachers.map(teacher => (
                  <Link key={teacher.id} to={`/admin/teachers`} className="block">
                    <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                            {teacher.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black">{teacher.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{teacher.subject_role}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Admissions */}
          {results.admissions.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                <UserPlus className="w-3 h-3" /> Admissions ({results.admissions.length})
              </h3>
              <div className="grid gap-3">
                {results.admissions.map(admission => (
                  <Link key={admission.id} to={`/admin/admin-management`} className="block">
                    <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            {admission.student_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black">{admission.student_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Applying for Class {admission.applying_class}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-black uppercase">{admission.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Appointments */}
          {results.appointments.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                <CalendarCheck className="w-3 h-3" /> Appointments ({results.appointments.length})
              </h3>
              <div className="grid gap-3">
                {results.appointments.map(appointment => (
                  <Link key={appointment.id} to={`/admin/admin-management`} className="block">
                    <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-bold">
                            {appointment.parent_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black">{appointment.parent_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(appointment.preferred_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[8px] font-black uppercase">{appointment.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
