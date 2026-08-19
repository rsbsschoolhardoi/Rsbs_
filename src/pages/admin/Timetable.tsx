import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { TimetableSession, TimetableEntry, Subject, Class, Section, Teacher } from '@/types';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Copy, MoreHorizontal, Settings, Layers, Calendar, Clock, GraduationCap, BookOpen, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/db/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminTimetable() {
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [activeSession, setActiveSession] = useState<TimetableSession | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<TimetableEntry> | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [copyTargetClassId, setCopyTargetClassId] = useState('');
  const [copyTargetSectionId, setCopyTargetSectionId] = useState('');

  useEffect(() => {
    loadInitialData();

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel('timetable_sessions_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable_sessions' }, () => {
        api.getTimetableSessions().then(res => setSessions(res.data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedSessionId && selectedClassId && selectedSectionId) {
      loadEntries();

      // Subscribe to entries for the current view
      const entryChannel = supabase
        .channel(`timetable_entries_${selectedSessionId}_${selectedClassId}_${selectedSectionId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'timetable_entries',
          filter: `session_id=eq.${selectedSessionId}` 
        }, () => {
          loadEntries();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(entryChannel);
      };
    } else {
      setEntries([]);
    }
  }, [selectedSessionId, selectedClassId, selectedSectionId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [sessionsRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
        api.getTimetableSessions(),
        api.getClasses(),
        api.getSubjects(),
        api.getTeachers()
      ]);

      setSessions(sessionsRes.data);
      const active = sessionsRes.data.find(s => s.is_active);
      setActiveSession(active || null);
      if (active) setSelectedSessionId(active.id);
      
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      toast.error('Failed to load initial data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEntries = async () => {
    try {
      const { data, error } = await api.getTimetableEntries(selectedSessionId, selectedClassId, selectedSectionId);
      if (error) throw error;
      setEntries(data);
    } catch (error) {
      toast.error('Failed to load entries');
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName) return;
    try {
      const { data, error } = await api.createTimetableSession({ name: newSessionName, is_active: false, is_published: false });
      if (error) throw error;
      if (data) {
        toast.success('Session created');
        setSessions([data, ...sessions]);
        setIsSessionModalOpen(false);
        setNewSessionName('');
      }
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const handleUpdateSession = async (id: string, updates: Partial<TimetableSession>) => {
    try {
      const { error } = await api.updateTimetableSession(id, updates);
      if (error) throw error;
      toast.success('Session updated');
      loadInitialData();
    } catch (error) {
      toast.error('Failed to update session');
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !selectedSessionId || !selectedClassId || !selectedSectionId) return;

    try {
      const payload = {
        ...editingEntry,
        session_id: selectedSessionId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
      } as TimetableEntry;

      let error;
      if (payload.id) {
        ({ error } = await api.updateTimetableEntry(payload.id, payload));
      } else {
        ({ error } = await api.createTimetableEntry(payload));
      }

      if (error) throw error;
      toast.success('Entry saved');
      setIsEntryModalOpen(false);
      loadEntries();
    } catch (error: any) {
      if (error?.message?.includes('unique_violation') || error?.code === '23505') {
        toast.error('A period already exists for this slot');
      } else {
        toast.error('Failed to save entry');
      }
    }
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry?.id) return;
    try {
      const { error } = await api.deleteTimetableEntry(editingEntry.id);
      if (error) throw error;
      toast.success('Entry deleted');
      setIsEntryModalOpen(false);
      loadEntries();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleCopyTimetable = async () => {
    if (!selectedClassId || !selectedSectionId || !copyTargetClassId || !copyTargetSectionId || !selectedSessionId) return;
    try {
      const { error } = await api.bulkCopyTimetable(selectedClassId, selectedSectionId, copyTargetClassId, copyTargetSectionId, selectedSessionId);
      if (error) throw error;
      toast.success('Timetable copied successfully');
      setIsCopyModalOpen(false);
    } catch (error) {
      toast.error('Failed to copy timetable');
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSection = selectedClass?.sections?.find((s: any) => s.id === selectedSectionId);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable Management</h1>
          <p className="text-muted-foreground">Define and manage academic schedules for all classes.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => setIsSessionModalOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Sessions
          </Button>
          <Button size="sm" onClick={() => { setEditingEntry({}); setIsEntryModalOpen(true); }} disabled={!selectedSectionId}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsCopyModalOpen(true)} disabled={!selectedSectionId || entries.length === 0}>
            <Copy className="w-4 h-4 mr-2" />
            Copy to
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-4 h-4" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Academic Session</Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          {s.name}
                          {s.is_active && <Badge variant="default" className="text-xs h-4">Active</Badge>}
                          {!s.is_published && <Badge variant="outline" className="text-xs h-4">Draft</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setSelectedSectionId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassId && (
                <div className="space-y-2 animate-in slide-in-from-top duration-300">
                  <Label>Section</Label>
                  <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedClass?.sections?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              {selectedSessionId && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={sessions.find(s => s.id === selectedSessionId)?.is_published ? "default" : "outline"}>
                      {sessions.find(s => s.id === selectedSessionId)?.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      const session = sessions.find(s => s.id === selectedSessionId);
                      if (session) handleUpdateSession(session.id, { is_published: !session.is_published });
                    }}
                  >
                    {sessions.find(s => s.id === selectedSessionId)?.is_published ? "Unpublish" : "Publish Now"}
                  </Button>
                  {!sessions.find(s => s.id === selectedSessionId)?.is_active && (
                    <Button 
                      variant="ghost" 
                      className="w-full h-8 text-xs text-primary"
                      onClick={() => handleUpdateSession(selectedSessionId, { is_active: true })}
                    >
                      Set as Active Session
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Grid Area */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Schedule View</CardTitle>
                <CardDescription>
                  {selectedSection ? `${selectedClass.name} - ${selectedSection.name}` : 'Select a class and section to view timetable'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadEntries} disabled={!selectedSectionId}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent>
              {selectedSectionId ? (
                <TimetableGrid 
                  entries={entries} 
                  role="admin" 
                  onEntryClick={(entry) => { setEditingEntry(entry); setIsEntryModalOpen(true); }}
                  isLoading={isLoading}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Calendar className="w-12 h-12 mb-4 opacity-20" />
                  <p>Please select a Class and Section from the sidebar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Entry Modal */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry?.id ? 'Edit Period' : 'Add New Period'}</DialogTitle>
            <DialogDescription>
              Assign a subject and teacher to a time slot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={editingEntry?.day_of_week || ''} onValueChange={(val) => setEditingEntry({...editingEntry!, day_of_week: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period No.</Label>
                <Input type="number" min="1" max="10" value={editingEntry?.period_number || ''} onChange={(e) => setEditingEntry({...editingEntry!, period_number: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={editingEntry?.subject_id || ''} onValueChange={(val) => setEditingEntry({...editingEntry!, subject_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={editingEntry?.teacher_id || ''} onValueChange={(val) => setEditingEntry({...editingEntry!, teacher_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={editingEntry?.start_time || ''} onChange={(e) => setEditingEntry({...editingEntry!, start_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={editingEntry?.end_time || ''} onChange={(e) => setEditingEntry({...editingEntry!, end_time: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room Number (Optional)</Label>
              <Input placeholder="e.g. Lab 1, Room 102" value={editingEntry?.room_number || ''} onChange={(e) => setEditingEntry({...editingEntry!, room_number: e.target.value})} />
            </div>

            <DialogFooter className="gap-2">
              {editingEntry?.id && (
                <Button type="button" variant="destructive" onClick={handleDeleteEntry}>Delete</Button>
              )}
              <Button type="submit">Save Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sessions Modal */}
      <Dialog open={isSessionModalOpen} onOpenChange={setIsSessionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Academic Sessions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="New Session Name (e.g. 2024 Spring)" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} />
              <Button onClick={handleCreateSession}>Create</Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium">{s.name}</span>
                    <div className="flex gap-2 mt-1">
                      {s.is_active && <Badge variant="default" className="text-xs">Active</Badge>}
                      {s.is_published ? <Badge variant="secondary" className="text-xs">Published</Badge> : <Badge variant="outline" className="text-xs">Draft</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!s.is_active && (
                      <Button variant="ghost" size="sm" onClick={() => handleUpdateSession(s.id, { is_active: true })}>Set Active</Button>
                    )}
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => api.deleteTimetableSession(s.id).then(() => loadInitialData())}>
                      <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Modal */}
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Timetable</DialogTitle>
            <DialogDescription>
              Copy the current timetable for {selectedClass?.name} {selectedSection?.name} to another section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Class</Label>
              <Select value={copyTargetClassId} onValueChange={(val) => { setCopyTargetClassId(val); setCopyTargetSectionId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {copyTargetClassId && (
              <div className="space-y-2 animate-in slide-in-from-top duration-300">
                <Label>Target Section</Label>
                <Select value={copyTargetSectionId} onValueChange={setCopyTargetSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.find(c => c.id === copyTargetClassId)?.sections?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCopyTimetable} disabled={!copyTargetSectionId}>Copy Timetable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
