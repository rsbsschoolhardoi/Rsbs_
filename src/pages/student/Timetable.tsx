import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { TimetableEntry, TimetableSession, Student } from '@/types';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';

export default function StudentTimetable() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [activeSession, setActiveSession] = useState<TimetableSession | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.student_id) {
      loadTimetable();

      // Realtime subscription for this student's timetable
      const channel = supabase
        .channel('timetable_student')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_entries' }, () => {
          loadTimetable();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_sessions' }, () => {
          loadTimetable();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  const loadTimetable = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: studentData, error: studentError } = await api.getStudentById(profile!.student_id!);
      if (studentError) throw studentError;
      setStudent(studentData);

      const { data: sessionData, error: sessionError } = await api.getActiveTimetableSession();
      if (sessionError) throw sessionError;
      
      if (!sessionData) {
        setError('No active timetable session found.');
        return;
      }
      
      setActiveSession(sessionData);

      if (sessionData.is_published && studentData?.class_id && studentData?.section_id) {
        const { data, error: entriesError } = await api.getTimetableEntries(
          sessionData.id, 
          studentData.class_id, 
          studentData.section_id
        );
        if (entriesError) throw entriesError;
        setEntries(data);
      } else if (!sessionData.is_published) {
        setError('The current timetable has not been published yet.');
      }
    } catch (err: any) {
      setError('Failed to load timetable data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>
          <p className="text-muted-foreground">Weekly class schedule for your enrolled class.</p>
        </div>
        {activeSession && (
          <Badge variant="outline" className="h-8 px-3 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {activeSession.name}
          </Badge>
        )}
      </div>

      {error ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">{error}</h3>
            <p className="text-muted-foreground mb-6">Contact administration for more information.</p>
            <Button onClick={loadTimetable} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Weekly Schedule</CardTitle>
              {student && (
                <CardDescription>
                  Class: {student.class} - {student.section}
                </CardDescription>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={loadTimetable} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent>
            <TimetableGrid 
              entries={entries} 
              role="student" 
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Daily Quick View for Mobile */}
      <div className="md:hidden space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Clock className="w-4 h-4" /> Today's Schedule
        </h3>
        {/* Logic for current day could go here */}
      </div>
    </div>
  );
}
