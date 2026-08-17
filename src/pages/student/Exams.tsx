import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Exam, Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { MobilePageLoading } from '@/components/layouts/MobilePageLoading';

import { getLocalDateString } from '@/lib/utils';

export default function StudentExams() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      if (!profile?.student_id) return;
      setLoading(true);
      const { data: student } = await api.getStudentById(profile.student_id);
      if (student) {
        const { data } = await api.getStudentExams(student);
        setExams(data);
      }
      setLoading(false);
    };
    fetchExams();
  }, [profile?.student_id]);

  const todayStr = getLocalDateString();
  const upcomingExams = exams.filter(exam => exam.date >= todayStr);
  const pastExams = exams.filter(exam => exam.date < todayStr);

  if (loading) {
    return <MobilePageLoading message="Loading exams…" />;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Calendar className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          Exam Schedule
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">View upcoming and past exam dates.</p>
      </div>

      {/* Upcoming Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Upcoming Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingExams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming exams scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-sm md:text-base">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exam.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Exams */}
      {pastExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Past Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 md:p-4 rounded-lg border opacity-60"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm md:text-base">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exam.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
