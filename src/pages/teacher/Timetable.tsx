import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { TimetableEntry, TimetableSession, Teacher } from '@/types';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';

export default function TeacherTimetable() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [activeSession, setActiveSession] = useState<TimetableSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.teacher_id) {
      loadTimetable();

      // Subscribe to changes
      const channel = supabase
        .channel(`teacher_timetable_${profile.teacher_id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'timetable_entries',
          filter: `teacher_id=eq.${profile.teacher_id}`
        }, () => {
          loadTimetable();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'timetable_sessions'
        }, () => {
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
      const { data: sessionData, error: sessionError } = await api.getActiveTimetableSession();
      if (sessionError) throw sessionError;
      
      if (!sessionData) {
        setError('No active timetable session found.');
        return;
      }
      
      setActiveSession(sessionData);

      // Fetch all entries for this session where the logged-in teacher is assigned
      const { data, error: entriesError } = await api.getTimetableEntries(
        sessionData.id, 
        undefined, 
        undefined, 
        profile!.teacher_id!
      );
      if (entriesError) throw entriesError;
      setEntries(data);

      if (!sessionData.is_published) {
        setError('The current timetable has not been published to students yet, but you can see your assignments.');
      }
    } catch (err: any) {
      setError('Failed to load timetable data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>
          <p className="text-muted-foreground">Your assigned teaching periods for the current session.</p>
        </div>
        {activeSession && (
          <Badge variant="outline" className="h-8 px-3 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {activeSession.name}
          </Badge>
        )}
      </div>

      {!activeSession && !isLoading ? (
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
        <div className="space-y-6">
          {activeSession && !activeSession.is_published && (
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <CardContent className="flex items-center gap-3 py-3 text-amber-800 dark:text-amber-400">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">The timetable is currently in <b>Draft</b> mode and is not visible to students.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Teaching Schedule</CardTitle>
                <CardDescription>
                  Displaying your assigned slots across all classes.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadTimetable} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent>
              <TimetableGrid 
                entries={entries} 
                role="teacher" 
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Quick View for Mobile */}
      <div className="md:hidden space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Clock className="w-4 h-4" /> Today's Assignments
        </h3>
        {/* Logic for current day could go here */}
      </div>
    </div>
  );
}
