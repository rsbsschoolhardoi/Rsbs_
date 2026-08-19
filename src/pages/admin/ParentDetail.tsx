import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { Parent, Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Phone, Mail, Briefcase, MapPin, Plus, Trash2, ShieldCheck, GraduationCap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

export default function ParentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [parent, setParent] = useState<Parent | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationship, setRelationship] = useState('Father');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const [parentRes, studentsRes] = await Promise.all([
      api.getParentById(id),
      api.getStudents()
    ]);
    setParent(parentRes.data);
    setAllStudents(studentsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleLinkStudent = async () => {
    if (!id || !selectedStudentId) return;
    setLinking(true);
    try {
      const { error } = await api.linkParentToStudent(id, selectedStudentId, relationship);
      if (error) throw error;
      toast.success('Student linked successfully');
      fetchData();
      setSelectedStudentId('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkStudent = async (studentId: string) => {
    if (!id || !confirm('Unlink this student?')) return;
    try {
      const { error } = await api.unlinkParentFromStudent(id, studentId);
      if (error) throw error;
      toast.success('Student unlinked');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80 col-span-1 rounded-2xl" />
          <Skeleton className="h-80 col-span-2 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="p-6 text-center">
        <p>Parent not found.</p>
        <Button onClick={() => navigate('/admin/parents')}>Back to Parents</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 px-4 pt-4 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/parents')} className="rounded-full h-10 w-10">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary">{parent.full_name}</h1>
          <p className="text-sm text-muted-foreground">{parent.parent_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="rounded-2xl overflow-hidden border-muted shadow-lg bg-card col-span-1 h-fit">
          <CardHeader className="bg-primary/5 border-b pb-8 pt-10">
            <div className="flex flex-col items-center gap-4">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-4 border-background shadow-xl">
                {parent.full_name[0]}
              </div>
              <div className="text-center">
                <CardTitle className="text-xl">{parent.full_name}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1.5 mt-1 font-medium">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Parent Account
                </CardDescription>
              </div>
              <Badge variant={parent.is_active ? "default" : "secondary"}>
                {parent.is_active ? "Active" : "Disabled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-8">
            <div className="grid gap-5">
              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-muted-foreground font-bold">Contact</span>
                  <span className="font-semibold text-foreground truncate">{parent.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-muted-foreground font-bold">Email</span>
                  <span className="font-semibold text-foreground truncate">{parent.email || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-muted-foreground font-bold">Occupation</span>
                  <span className="font-semibold text-foreground truncate">{parent.occupation || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-muted-foreground font-bold">Address</span>
                  <p className="text-sm font-semibold text-foreground leading-snug">{parent.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Students */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card className="rounded-2xl border-muted shadow-md overflow-hidden bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b px-8 py-6">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-primary" />
                  Linked Students
                </CardTitle>
                <CardDescription>Associate this parent with their children in the school.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="rounded-xl px-4 h-10 shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Link Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Student</DialogTitle>
                    <DialogDescription>Search and select a student to link to this parent account.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Select Student</label>
                      <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Search student name..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {allStudents
                            .filter(s => !parent.linked_students?.some(ls => ls.id === s.id))
                            .map(student => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.login_id} - Class {student.class})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Relationship</label>
                      <Select onValueChange={setRelationship} value={relationship}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Father" className="font-bold">Father</SelectItem>
                          <SelectItem value="Mother" className="font-bold">Mother</SelectItem>
                          <SelectItem value="Guardian" className="font-bold">Guardian</SelectItem>
                          <SelectItem value="Uncle" className="font-bold">Uncle</SelectItem>
                          <SelectItem value="Aunt" className="font-bold">Aunt</SelectItem>
                          <SelectItem value="Other" className="font-bold">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => {}}>Cancel</Button>
                    <Button onClick={handleLinkStudent} disabled={!selectedStudentId || linking}>
                      {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Link'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {(!parent.linked_students || parent.linked_students.length === 0) ? (
                <div className="p-20 text-center bg-muted/5">
                  <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No students linked to this parent yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-muted/50">
                  {parent.linked_students.map((student) => (
                    <div key={student.id} className="group p-6 flex items-center justify-between hover:bg-muted/5 transition-all">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                          <AvatarImage src={student.profile_picture_url || ''} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {student.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground group-hover:text-primary transition-colors">{student.name}</span>
                            <Badge variant="outline" className="text-xs h-4 border-primary/20 bg-primary/5 text-primary">
                              {student.relationship}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            {student.login_id} • Class {student.class}-{student.section}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                          onClick={() => navigate(`/admin/students`)} // In a real app we'd go to student detail
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleUnlinkStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-muted shadow-md overflow-hidden bg-muted/5 border-dashed">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <ShieldCheck className="w-12 h-12 text-muted-foreground opacity-30" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-foreground">Security Note</h3>
                <p className="text-sm text-muted-foreground">
                  Parent account permissions are strictly managed. Changes to password or access status will take effect immediately. Linked students will see their parent associated in their own profile (if enabled).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
