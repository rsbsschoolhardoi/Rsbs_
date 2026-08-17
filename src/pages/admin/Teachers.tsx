import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, ChevronDown, Edit, Eye, GraduationCap, Loader2, MoreHorizontal, Plus, Search, Trash2, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { ImageCropper } from '@/components/ImageCropper';
import { ProfileTagBadge, ProfileTagSelector } from '@/components/ProfileTagBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { Class, ClassTeacherAssignment, Section, Teacher } from '@/types';

const teacherSchema = z.object({
  prefix: z.string().optional().nullable(),
  name: z.string().min(2, 'Name is too short'),
  subject_role: z.string().min(2, 'Subject/Role is required'),
  contact: z.string().min(1, 'Contact is required'),
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  employee_id: z.string().min(1, 'Employee ID is required'),
  joining_date: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  profile_picture_url: z.string().optional().or(z.literal('')),
  login_id_suffix: z.string().min(1, 'Login ID suffix is required').regex(/^\d+$/, 'Please enter digits only.'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  initial_pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'Numeric only').optional().or(z.literal('')),
  profile_tag: z.enum(['blue', 'black', 'grey']).nullable().optional(),
  login_access_enabled: z.boolean().optional(),
});

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [formFieldUpdater, setFormFieldUpdater] = useState<((url: string) => void) | null>(null);
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);


  // Assignment states
  const [selectedAssignments, setSelectedAssignments] = useState<{class_id: string, section_id: string}[]>([]);
  const [tempClassId, setTempClassId] = useState('');
  const [tempSectionId, setTempSectionId] = useState('');

  const form = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      subject_role: '',
      contact: '',
      email: '',
      employee_id: '',
      joining_date: '',
      description: '',
      profile_picture_url: '',
      login_id_suffix: '',
      password: '',
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [teachersRes, classesRes, isSecondaryLoginEnabled] = await Promise.all([
      api.getTeachers(),
      api.getClasses(),
      api.isGlobalModuleEnabled('secondary_login_id')
    ]);
    setTeachers(teachersRes.data || []);
    setClasses(classesRes.data || []);
    setIsSecondaryLoginEnabled(isSecondaryLoginEnabled);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = async (teacher: Teacher | null = null) => {
    setEditingTeacher(teacher);
    if (teacher) {
      // Requirement 2: Fetch current login access state
      const { data: profile } = await api.getProfileByEntityId('teacher', teacher.id);
      
      form.reset({
        prefix: teacher.prefix || '',
        name: teacher.name,
        subject_role: teacher.subject_role,
        contact: teacher.contact,
        email: teacher.email || '',
        employee_id: teacher.employee_id || '',
        joining_date: teacher.joining_date || '',
        description: teacher.description || '',
        profile_picture_url: teacher.profile_picture_url || '',
        login_id_suffix: teacher.login_id.replace('RSBST', ''),
        password: '',
        login_access_enabled: profile?.login_access_enabled ?? true,
      });
      setSelectedAssignments(teacher.class_assignments?.map(a => ({ class_id: a.class_id, section_id: a.section_id })) || []);
    } else {
      form.reset({
        prefix: '',
        name: '',
        subject_role: '',
        contact: '',
        email: '',
        employee_id: '',
        joining_date: '',
        description: '',
        profile_picture_url: '',
        login_id_suffix: '',
        password: '',
        login_access_enabled: true,
      });
      setSelectedAssignments([]);
    }
    setTempClassId('');
    setTempSectionId('');
    setIsDialogOpen(true);
  };

  const addAssignment = () => {
    if (!tempClassId || !tempSectionId) return;
    if (selectedAssignments.some(a => a.class_id === tempClassId && a.section_id === tempSectionId)) {
      toast.error('This assignment already exists');
      return;
    }
    setSelectedAssignments([...selectedAssignments, { class_id: tempClassId, section_id: tempSectionId }]);
    setTempClassId('');
    setTempSectionId('');
  };

  const removeAssignment = (index: number) => {
    setSelectedAssignments(selectedAssignments.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof teacherSchema>) => {
    try {
      const fullLoginId = `RSBST${values.login_id_suffix}`;

      // Check for uniqueness across the system via profiles table
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, teacher_id')
        .eq('username', fullLoginId)
        .maybeSingle();

      if (currentProfile && (!editingTeacher || (currentProfile as any).teacher_id !== editingTeacher.id)) {
        toast.error('This Login ID already exists.');
        return;
      }

      const { password, login_id_suffix, ...teacherDataRaw } = values;
      // employee_id is kept in teacherDataRaw and saved to the teachers table

      const teacherData = {
        ...teacherDataRaw,
        login_id: fullLoginId,
        email: teacherDataRaw.email as string,
        joining_date: teacherDataRaw.joining_date || null,
        description: teacherDataRaw.description || null,
        profile_picture_url: teacherDataRaw.profile_picture_url || null,
      };
      let teacherId: string;

      if (editingTeacher) {
        teacherId = editingTeacher.id;
        const { error } = await api.updateTeacher(teacherId, teacherData);
        if (error) throw error;

        // Requirement 2: Update login access in profile
        await api.updateProfileByEntityId('teacher', teacherId, { 
          login_access_enabled: values.login_access_enabled 
        });

        // Update password if provided
        if (password) {
          const { error: authError } = await supabase.functions.invoke('update-user-password', {
            body: { username: fullLoginId, password },
          });
          if (authError) toast.warning('Profile updated, but password update failed.');
        }

        // Sync assignments
        // Simplified: delete all and re-add
        const { data: existing, error: getAssignError } = await api.getTeacherAssignments(teacherId);
        if (getAssignError) throw getAssignError;
        if (existing) {
          for (const a of existing) {
            const { error: deleteError } = await api.removeTeacherAssignment(a.id);
            if (deleteError) throw deleteError;
          }
        }
      } else {
        // Create teacher
        const { data: newTeacher, error } = await api.createTeacher(teacherData);
        if (error || !newTeacher) throw error || new Error('Failed to create teacher');
        teacherId = newTeacher.id;

        // Create Auth account
        const authPayload: any = { 
          username: fullLoginId, 
          password: password || 'teacher123', 
          is_admin: false 
        };
        
        if (values.initial_pin) {
          authPayload.initial_pin = values.initial_pin;
        }

        const { error: authError } = await supabase.functions.invoke('create-user', {
          body: authPayload,
        });
        if (authError) toast.warning('Teacher created, but account creation failed.');
      }

      // Add assignments
      for (const a of selectedAssignments) {
        const { error: assignError } = await api.assignTeacherToClass({
          teacher_id: teacherId,
          class_id: a.class_id,
          section_id: a.section_id
        });
        if (assignError) throw assignError;
      }

      toast.success(editingTeacher ? 'Teacher updated' : 'Teacher created');
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    if (teacher) {
      setTeacherToDelete(teacher);
      setIsDeleteDialogOpen(true);
    }
  };

  const executeDelete = async () => {
    if (!teacherToDelete) return;
    
    const { error } = await api.deleteTeacher(teacherToDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Teacher deleted');
      fetchData();
    }
  };

  const handleCroppedImage = async (blob: Blob) => {
    setCropImageSrc(null);
    setUploading(true);
    try {
      const fileName = `teacher-${Date.now()}.webp`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app_aho9bv0iqbr5_school_images')
        .upload(filePath, blob, {
          contentType: 'image/webp',
          cacheControl: '0',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app_aho9bv0iqbr5_school_images')
        .getPublicUrl(filePath);

      if (formFieldUpdater) {
        formFieldUpdater(`${publicUrl}?t=${Date.now()}`);
        toast.success('Photo uploaded');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      setFormFieldUpdater(null);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.subject_role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Teachers</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage teacher profiles and assignments.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-10 rounded-xl px-6 shadow-md hover:shadow-lg transition-all active:scale-95">
          <Plus className="w-4 h-4 mr-2" /> Add Teacher
        </Button>
      </div>

      <Tabs defaultValue="list" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-fit shrink-0 mb-4">
          <TabsTrigger value="list" className="rounded-lg font-bold px-6">Teacher List</TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg font-bold px-6">API Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 flex flex-col min-h-0">
          <div className="relative shrink-0 mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search teachers..." 
              className="pl-10 h-10 rounded-xl border-muted bg-background/50 focus-visible:ring-primary" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col gap-3 py-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full bg-muted rounded-2xl" />)}
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                  <p className="text-muted-foreground">No teachers found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block border rounded-2xl bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Teacher</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Subject/Role</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id} className="group transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage key={teacher.profile_picture_url} src={teacher.profile_picture_url || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary">{teacher.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{teacher.name}</span>
                                <ProfileTagBadge tag={teacher.profile_tag} size="sm" />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter">L: {teacher.login_id}</span>
                                <span className="text-[9px] text-primary/80 uppercase font-mono font-bold tracking-tighter">V: {teacher.verification_id}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{teacher.subject_role}</TableCell>
                        <TableCell className="font-mono text-xs">{teacher.employee_id || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teacher.class_assignments?.map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {a.class_name}-{a.section_name}
                              </Badge>
                            )) || <span className="text-xs text-muted-foreground italic">None</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{teacher.contact}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2 font-black flex items-center gap-1 border-muted-foreground/20">
                                Manage
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-xl">
                              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Management Options</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2"
                                onClick={() => handleOpenDialog(teacher)}
                              >
                                <Edit className="w-4 h-4 text-muted-foreground" />
                                <span>Edit Profile</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 text-destructive"
                                onClick={() => handleDelete(teacher.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Teacher</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors hover:bg-accent"
                                onClick={() => {
                                  setViewingTeacher(teacher);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 text-blue-500" />
                                <span>View Profile</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
        </TabsContent>
        <TabsContent value="api" className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <ModuleApiActivity moduleName="teachers" />
        </TabsContent>
      </Tabs>


      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? 'Edit Teacher Profile' : 'Add New Teacher'}</DialogTitle>
            <DialogDescription>
              {editingTeacher ? 'Modify teacher information below.' : 'Create a new teacher record and login account.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profile_picture_url"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Profile Picture</FormLabel>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border">
                          <AvatarImage src={field.value || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {form.watch('name')?.[0] || <User />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setFormFieldUpdater(() => (url: string) => field.onChange(url));
                              const reader = new FileReader();
                              reader.addEventListener('load', () => setCropImageSrc(reader.result as string));
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full flex items-center justify-center gap-2 rounded-xl"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            {uploading ? 'Uploading...' : 'Upload Photo'}
                          </Button>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefix (Optional)</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === 'none' ? null : val)} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-white border-muted font-bold text-xs focus:ring-primary/20 hover:border-primary transition-all shadow-sm">
                            <SelectValue placeholder="Select prefix" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl shadow-2xl border-primary/10">
                          <SelectItem value="none" className="font-bold">None</SelectItem>
                          <SelectItem value="Mr." className="font-bold">Mr.</SelectItem>
                          <SelectItem value="Ms." className="font-bold">Ms.</SelectItem>
                          <SelectItem value="Mrs." className="font-bold">Mrs.</SelectItem>
                          <SelectItem value="Dr." className="font-bold">Dr.</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject / Role</FormLabel>
                      <FormControl><Input placeholder="Math Teacher" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl><Input placeholder="+91..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Email (Optional)</FormLabel>
                        {!isSecondaryLoginEnabled && (
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">
                            Secondary Login: Disabled
                          </Badge>
                        )}
                      </div>
                      <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g. TCH-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editingTeacher && (
                  <div className="space-y-2 col-span-full border-b pb-4 mb-2 bg-primary/5 p-4 rounded-2xl">
                    <Label className="text-primary font-bold">Verification Record ID</Label>
                    <div className="flex items-center gap-4">
                      <div className="bg-white border-2 border-primary/20 rounded-xl px-6 py-3 font-mono text-primary font-black tracking-widest text-xl shadow-sm uppercase">
                        {editingTeacher.verification_id}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                          Official immutable record identifier. Parallel to Login ID for verification lookups.
                        </p>
                        <p className="text-[10px] text-destructive uppercase font-bold tracking-widest">
                          * Cannot be used for authentication
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="joining_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date (Optional)</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="login_id_suffix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teacher Login ID (RSBST + Digits)</FormLabel>
                      <div className="flex items-center">
                        <span className="bg-muted px-3 h-10 flex items-center rounded-l-xl border border-r-0 text-sm font-bold text-muted-foreground shrink-0 select-none">
                          RSBST
                        </span>
                        <FormControl>
                          <Input 
                            placeholder="Numeric suffix only" 
                            className="rounded-l-none rounded-r-xl focus-visible:ring-offset-0" 
                            disabled={!!editingTeacher}
                            {...field}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              field.onChange(val);
                            }}
                          />
                        </FormControl>
                      </div>
                      <FormDescription>Suffix must be unique numeric digits. Once saved, it cannot be changed.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingTeacher ? 'Update Password (Optional)' : 'Password'}</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="login_access_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm bg-primary/5 border-primary/20 col-span-full">
                      <div className="space-y-0.5">
                        <FormLabel className="text-primary font-bold">Login Access</FormLabel>
                        <p className="text-xs text-muted-foreground font-medium italic">Requirement 3: Block or allow system login.</p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={async (checked: boolean) => {
                            field.onChange(checked);
                            if (editingTeacher) {
                              try {
                                const { error } = await api.updateProfileByEntityId('teacher', editingTeacher.id, { login_access_enabled: checked });
                                if (error) throw error;
                                toast.success(`Login access ${checked ? 'enabled' : 'disabled'}`);
                              } catch (err: any) {
                                toast.error('Failed to update login access');
                                field.onChange(!checked);
                              }
                            }
                          }} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initial_pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial PIN (Optional)</FormLabel>
                      <FormControl><Input type="password" maxLength={4} placeholder="4-digit PIN" {...field} onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ''))} /></FormControl>
                      <FormDescription className="text-[10px]">Teacher must change this on next login.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Short Description (Optional)</FormLabel>
                      <FormControl><Input placeholder="Expert in advanced mathematics" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profile_tag"
                  render={({ field }) => (
                    <FormItem className="col-span-full rounded-lg border p-4 shadow-sm">
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-bold">Profile Tag</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Assign a visual tag to this teacher's profile for identity clarity.
                        </p>
                      </div>
                      <FormControl>
                        <ProfileTagSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Class Assignments
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs">Select Class</Label>
                    <Select value={tempClassId} onValueChange={(val) => {
                      setTempClassId(val);
                      setTempSectionId('');
                    }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Select Section</Label>
                    <div className="flex gap-2">
                      <Select value={tempSectionId} onValueChange={setTempSectionId} disabled={!tempClassId}>
                        <SelectTrigger className="rounded-xl flex-1">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.find(c => c.id === tempClassId)?.sections.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="icon" className="rounded-xl" onClick={addAssignment} disabled={!tempSectionId}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedAssignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No classes assigned yet.</p>
                  ) : (
                    selectedAssignments.map((a, i) => {
                      const className = classes.find(c => c.id === a.class_id)?.name;
                      const sectionName = classes.find(c => c.id === a.class_id)?.sections.find(s => s.id === a.section_id)?.name;
                      return (
                        <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 rounded-full flex items-center gap-2 text-[10px] font-bold">
                          {className}-{sectionName}
                          <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-destructive hover:text-white" onClick={() => removeAssignment(i)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              <DialogFooter className="pt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" className="rounded-xl px-8 shadow-lg shadow-primary/20">
                  {editingTeacher ? 'Save Changes' : 'Create Teacher'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-foreground">Teacher Profile</DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium">Complete record information (Read-Only)</p>
                </div>
              </div>
            </DialogHeader>
            
            {viewingTeacher && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/50 dark:bg-black/20 border border-white dark:border-white/5 shadow-sm backdrop-blur-sm">
                  <Avatar className="h-20 w-20 border-4 border-white dark:border-black shadow-lg">
                    <AvatarImage src={viewingTeacher.profile_picture_url || ''} />
                    <AvatarFallback className="text-2xl font-black bg-primary text-primary-foreground">{viewingTeacher.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-foreground leading-tight">
                      {viewingTeacher.prefix && <span>{viewingTeacher.prefix} </span>}
                      {viewingTeacher.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className="bg-primary/10 text-primary border-none font-bold rounded-lg px-2.5 py-1 uppercase text-[10px] tracking-wider">{viewingTeacher.subject_role}</Badge>
                      <ProfileTagBadge tag={viewingTeacher.profile_tag} />
                      <Badge variant="outline" className="rounded-lg font-mono text-[10px] border-muted-foreground/20">{viewingTeacher.login_id}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Login ID', value: viewingTeacher.login_id, mono: true },
                    { label: 'Verification ID', value: viewingTeacher.verification_id, mono: true },
                    { label: 'Employee ID', value: viewingTeacher.employee_id || 'N/A', mono: true },
                    { label: 'Role/Subject', value: viewingTeacher.subject_role },
                    { label: 'Contact', value: viewingTeacher.contact },
                    { label: 'Email', value: viewingTeacher.email },
                    { label: 'Joining Date', value: viewingTeacher.joining_date || 'N/A' },
                    { label: 'Description', value: viewingTeacher.description || 'N/A', full: true },
                  ].map((item, i) => (
                    <div key={i} className={cn("p-4 rounded-2xl border border-muted-foreground/5 bg-white/40 dark:bg-black/10 backdrop-blur-sm", item.full && "col-span-full")}>
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-black block mb-1">{item.label}</Label>
                      <p className={cn("text-sm font-bold text-foreground", item.mono && "font-mono text-[11px]")}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {viewingTeacher.class_assignments && viewingTeacher.class_assignments.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-black px-1 block">Class Assignments</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {viewingTeacher.class_assignments.map((assignment, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-muted-foreground/5 bg-white/40 dark:bg-black/10 backdrop-blur-sm flex flex-col gap-1 group transition-all hover:border-primary/20">
                          <span className="font-bold text-sm text-foreground">{assignment.class_name}</span>
                          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Section {assignment.section_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-8 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)} 
                className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6 border-muted-foreground/20 hover:bg-muted transition-all active:scale-95"
              >
                Close Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {cropImageSrc && (
        <ImageCropper
          image={cropImageSrc}
          onCropComplete={handleCroppedImage}
          onCancel={() => {
            setCropImageSrc(null);
            setFormFieldUpdater(null);
          }}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeDelete}
        recordName={teacherToDelete?.name || ""}
      />
    </div>
  );
}
