import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, ChevronDown, Edit, Eye, Loader2, MoreHorizontal, Plus, QrCode, Search, Trash2, Check, ChevronsUpDown, RefreshCw, FileArchive } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import BulkIDCardGenerator from '@/components/admin/BulkIDCardGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { BrandingSettings, Class, Student, Parent, DocumentTemplate } from '@/types';
import { generateTemplateIDCard } from '@/utils/templateIdCardGenerator';

const studentSchema = z.object({
  prefix: z.string().optional().nullable(),
  name: z.string().min(2, 'Name is too short'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  student_type: z.string().min(1, 'Type is required'),
  gender: z.string().min(1, 'Gender is required'),
  dob: z.string().min(1, 'DOB is required'),
  contact: z.string().min(1, 'Contact is required'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  parent_selection_type: z.enum(['existing', 'new']).default('new'),
  existing_parent_id: z.string().optional().or(z.literal('')),
  parent_name: z.string().optional().or(z.literal('')),
  parent_phone: z.string().optional().or(z.literal('')),
  parent_relationship: z.enum(['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Other'], {
    required_error: "Relationship is required",
  }),
  login_id_suffix: z.string().min(1, 'Login ID suffix is required').regex(/^\d+$/, 'Please enter digits only.'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  initial_pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'Numeric only').optional().or(z.literal('')),
  rank: z.coerce.number().min(0),
  roll_number: z.string().min(1, 'Roll Number is required'),
  session_info: z.string().min(1, 'Session is required'),
  promotion_date: z.string().optional().or(z.literal('')),
  profile_picture_url: z.string().optional().or(z.literal('')),
  is_blue_tag: z.boolean().optional(),
  profile_tag: z.enum(['blue', 'black', 'grey']).nullable().optional(),
  certificate_visible: z.boolean().optional(),
  id_card_visible: z.boolean().optional(),
  login_access_enabled: z.boolean().optional(),
}).refine((data) => {
  if (data.parent_selection_type === 'new') {
    return !!data.parent_name && !!data.parent_phone;
  }
  if (data.parent_selection_type === 'existing') {
    return !!data.existing_parent_id;
  }
  return true;
}, {
  message: "Parent information is required",
  path: ["parent_selection_type"]
});

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [frontTemplate, setFrontTemplate] = useState<DocumentTemplate | null>(null);
  const [backTemplate, setBackTemplate] = useState<DocumentTemplate | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [currentUpdateId, setCurrentUpdateId] = useState<string | null>(null);
  const [formFieldUpdater, setFormFieldUpdater] = useState<((url: string) => void) | null>(null);
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);


  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema) as any,
    defaultValues: {
      name: '',
      class_id: '',
      section_id: '',
      student_type: 'Regular',
      gender: 'Male',
      dob: '',
      contact: '',
      email: '',
      parent_name: '',
      parent_phone: '',
      login_id_suffix: '',
      password: '',
      rank: 0,
      roll_number: '',
      session_info: '2025-2026',
      promotion_date: '',
      profile_picture_url: '',
      certificate_visible: false,
      id_card_visible: false,
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [studentsRes, classesRes, brandingRes, parentsRes, isSecondaryLoginEnabled] = await Promise.all([
      api.getStudents(),
      api.getClasses(),
      api.getBrandingSettings(),
      api.getParents(),
      api.isGlobalModuleEnabled('secondary_login_id')
    ]);
    const brandingData = brandingRes.data;
    setStudents(studentsRes.data);
    setClasses(classesRes.data);
    setBranding(brandingData);
    setParents(parentsRes.data || []);
    setIsSecondaryLoginEnabled(isSecondaryLoginEnabled);

    if (brandingData?.id_card_front_template_id && brandingData?.id_card_back_template_id) {
      const [{ data: front }, { data: back }] = await Promise.all([
        api.getDocumentTemplateById(brandingData.id_card_front_template_id),
        api.getDocumentTemplateById(brandingData.id_card_back_template_id),
      ]);
      setFrontTemplate(front ?? null);
      setBackTemplate(back ?? null);
    } else {
      setFrontTemplate(null);
      setBackTemplate(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegenerateIDCard = async (student: Student) => {
    if (!branding) {
      toast.error('Branding settings not found. Please configure school branding first.');
      return;
    }
    if (!frontTemplate || !backTemplate) {
      toast.error('ID Card templates not configured. Please select front and back templates in Certificate Generator.');
      return;
    }
    setRegeneratingId(student.id);
    try {
      const blob = await generateTemplateIDCard({ student, branding, frontTemplate, backTemplate });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rollOrId = student.roll_number?.trim() || student.login_id;
      a.download = `${student.name.replace(/\s+/g, '_')}-${rollOrId}-ID-Card.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ID Card generated successfully');
    } catch (error) {
      console.error('ID Card generation failed:', error);
      toast.error('Failed to generate ID card');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleOpenDialog = async (student: Student | null = null) => {
    setEditingStudent(student);
    if (student) {
      // Requirement 2: Fetch current login access state
      const { data: profile } = await api.getProfileByEntityId('student', student.id);
      
      form.reset({
        ...student,
        prefix: student.prefix || '',
        class_id: student.class_id || '',
        section_id: student.section_id || '',
        password: '',
        login_id_suffix: student.login_id.replace('RSBS', ''),
        promotion_date: student.promotion_date || '',
        profile_picture_url: student.profile_picture_url || '',
        certificate_visible: student.certificate_visible || false,
        id_card_visible: student.id_card_visible || false,
        login_access_enabled: profile?.login_access_enabled ?? true,
        roll_number: student.roll_number || '',
        parent_selection_type: 'new',
        existing_parent_id: '',
        parent_name: '',
        parent_phone: '',
      } as any);
    } else {
      form.reset({
        prefix: '',
        name: '',
        class_id: '',
        section_id: '',
        student_type: 'Regular',
        gender: 'Male',
        dob: '',
        contact: '',
        email: '',
        parent_selection_type: 'new',
        existing_parent_id: '',
        parent_name: '',
        parent_phone: '',
        login_id_suffix: '',
        password: '',
        rank: 0,
        roll_number: '',
        session_info: '2025-2026',
        promotion_date: '',
        profile_picture_url: '',
        is_blue_tag: false,
        profile_tag: null,
        certificate_visible: true,
        id_card_visible: true,
        login_access_enabled: true,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof studentSchema>) => {
    try {
      const fullLoginId = `RSBS${values.login_id_suffix}`;

      // Check for uniqueness across the system via profiles table
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, student_id')
        .eq('username', fullLoginId)
        .maybeSingle();

      if (currentProfile && (!editingStudent || (currentProfile as any).student_id !== editingStudent.id)) {
        toast.error('This Login ID already exists.');
        return;
      }

      // Destructure password, login_id_suffix, and visibility fields out
      const { 
        password, 
        login_id_suffix, 
        certificate_visible, 
        id_card_visible, 
        parent_name, 
        parent_phone, 
        parent_selection_type,
        existing_parent_id,
        parent_relationship,
        ...studentData 
      } = values;

      // Find selected class and section names
      const selectedClass = classes.find(c => c.id === values.class_id);
      const selectedSection = selectedClass?.sections.find(s => s.id === values.section_id);

      const payload = {
        ...studentData,
        login_id: fullLoginId,
        class: selectedClass?.name || '',
        section: selectedSection?.name || '',
        promotion_date: values.promotion_date || null,
      };

      if (editingStudent) {
        // Update student record
        const { error } = await api.updateStudent(editingStudent.id, payload as any);
        if (error) throw error;

        // Requirement 2: Update login access in profile
        await api.updateProfileByEntityId('student', editingStudent.id, { 
          login_access_enabled: values.login_access_enabled 
        });

        // Also update Auth account if username or password provided
        const authPayload: any = { username: fullLoginId };
        if (password && password.length >= 6) {
          authPayload.password = password;
        }

        await supabase.functions.invoke('create-user', {
          body: authPayload,
        });

        toast.success('Student updated successfully');
      } else {
        // --- NEW STUDENT CREATION FLOW ---
        let parentId: string | null = null;
        let newlyCreatedParentId: string | null = null;

        // 1. Handle Parent Selection/Creation
        if (parent_selection_type === 'existing' && existing_parent_id) {
          parentId = existing_parent_id;
        } else if (parent_selection_type === 'new' && parent_name) {
          // Create a complete and valid parent record in 'Pending' state
          // Let api.createParent generate the final Parent Login ID (Requirement 1 & 3 & 5)
          const { data: newParent, error: parentError } = await api.createParent({
            full_name: parent_name,
            phone: parent_phone || null,
            email: `guardian-${Date.now()}@rsbs.school`, // Auto-generated email for internal account linkage
            is_active: false,
            gender: 'Male', // Default
            occupation: null,
            address: null,
          }) as any;

          if (parentError) {
            console.error("Parent creation failed during student submission:", parentError);
            throw new Error(`Parent creation failed: ${parentError.message}`);
          }

          if (newParent) {
            parentId = newParent.id;
            newlyCreatedParentId = newParent.id;
          }
        }

        // 2. Create Student record
        const { data: createdStudent, error: studentError } = await api.createStudent({
          ...payload,
          fee_details: [],
          fee_status: 'Pending',
          profile_picture_url: values.profile_picture_url || null,
          is_blocked: false,
          block_reason: null,
          certificate_visible: values.certificate_visible,
          id_card_visible: values.id_card_visible,
        });

        if (studentError) {
          // Failure routine: Cleanup the newly created parent if student creation fails
          if (newlyCreatedParentId) {
            await api.deleteParent(newlyCreatedParentId);
          }
          throw studentError;
        }

        // 3. Establish Secure Linking
        if (parentId && createdStudent) {
          const { error: linkError } = await api.linkParentToStudent(parentId, createdStudent.id, parent_relationship);
          if (linkError) {
            // Failure routine: Roll back everything
            await api.deleteStudent(createdStudent.id);
            if (newlyCreatedParentId) {
              await api.deleteParent(newlyCreatedParentId);
            }
            throw new Error(`Failed to link parent to student: ${linkError.message}`);
          }
        }

        // 4. Create Auth account via Edge Function
        const finalPassword = password && password.length >= 6 ? password : 'rsbs123456';
        const authPayload: any = { 
          username: fullLoginId, 
          password: finalPassword,
          is_admin: false,
        };

        // Pass initial PIN if provided
        if (values.initial_pin) {
          authPayload.initial_pin = values.initial_pin;
        }

        const { error: authError } = await supabase.functions.invoke('create-user', {
          body: authPayload,
        });

        if (authError) {
          toast.warning('Student record created, but Auth account failed. Login might not work yet.');
        } else {
          toast.success('Student and linked parent created successfully');
        }
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (student) {
      setStudentToDelete(student);
      setIsDeleteDialogOpen(true);
    }
  };

  const executeDelete = async () => {
    if (!studentToDelete) return;

    // Find the login_id of the student to delete
    const student = studentToDelete;
    if (student) {
      await api.deleteUser(student.login_id);
    }

    const { error } = await api.deleteStudent(student.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Student deleted');
      fetchData();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, studentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result as string);
      setCurrentUpdateId(studentId);
    });
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (blob: Blob) => {
    setCropImageSrc(null);
    setUploading(true);
    try {
      const fileName = `${currentUpdateId || Date.now()}-${Math.random()}.webp`;
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

      if (currentUpdateId) {
        await api.updateStudent(currentUpdateId, { profile_picture_url: `${publicUrl}?t=${Date.now()}` });
        toast.success('Profile picture updated');
        fetchData();
      } else if (formFieldUpdater) {
        formFieldUpdater(`${publicUrl}?t=${Date.now()}`);
        toast.success('Photo uploaded to form');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      setCurrentUpdateId(null);
      setFormFieldUpdater(null);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.login_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Students</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage student profiles and accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)} className="h-10 rounded-xl px-4 shadow-sm hover:shadow-md transition-all active:scale-95">
            <FileArchive className="w-4 h-4 mr-2" /> Bulk ID Cards
          </Button>
          <Button onClick={() => handleOpenDialog()} className="h-10 rounded-xl px-6 shadow-md hover:shadow-lg transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-fit shrink-0 mb-4">
          <TabsTrigger value="list" className="rounded-lg font-bold px-6">Student List</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 flex flex-col min-h-0">
          <div className="relative shrink-0 mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search students..." 
              className="pl-10 h-10 rounded-xl border-muted bg-background/50 focus-visible:ring-primary" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col gap-3 py-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full bg-muted rounded-2xl" />)}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                  <p className="text-muted-foreground">No students found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block border rounded-2xl bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Student</TableHead>
                      <TableHead>Class/Sec</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Login ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className="group transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="relative group/avatar shrink-0">
                              <Avatar className="h-10 w-10 border">
                                <AvatarImage key={student.profile_picture_url} src={student.profile_picture_url || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary">{student.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover/avatar:opacity-100 rounded-full cursor-pointer transition-opacity">
                                <Camera className="w-4 h-4" />
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  accept="image/*" 
                                  onChange={(e) => handleImageUpload(e, student.id)}
                                  disabled={uploading}
                                />
                              </div>
                            </div>
                            <div className="flex flex-col truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground truncate">{student.name}</span>
                                <ProfileTagBadge tag={student.profile_tag} size="sm" />
                              </div>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter leading-none">L: {student.login_id}</span>
                                <span className="text-[9px] text-primary/80 uppercase font-mono font-bold tracking-tighter leading-none">V: {student.verification_id}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline" className="text-[9px] h-4 px-1 w-fit border-primary/20 text-primary bg-primary/5">
                                  {student.student_type}
                                </Badge>
                                {student.linked_parents && student.linked_parents.length > 0 && (
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1 w-fit bg-blue-50 text-blue-700 hover:bg-blue-50 border-none">
                                    {student.linked_parents[0].full_name} ({student.linked_parents[0].parent_id})
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.class} - {student.section}</TableCell>
                        <TableCell className="font-mono text-xs">{student.roll_number || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{student.login_id}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] px-2 py-0 h-5",
                            student.fee_status === 'Paid' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none' : 
                            student.fee_status === 'Pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-none' : 
                            'bg-red-100 text-red-700 hover:bg-red-100 border-none'
                          )}>
                            {student.fee_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2 font-black flex items-center gap-1 bg-background hover:bg-muted transition-all border-muted-foreground/20">
                                Manage
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-xl border-muted-foreground/10 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
                              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Management Options</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-muted" />
                              <DropdownMenuItem
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                onClick={() => handleRegenerateIDCard(student)}
                                disabled={regeneratingId === student.id}
                              >
                                {regeneratingId === student.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-primary" />}
                                <span>Regenerate ID Card</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                onClick={() => handleOpenDialog(student)}
                              >
                                <Edit className="w-4 h-4 text-muted-foreground" />
                                <span>Edit Profile</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => handleDelete(student.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Student</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-muted" />
                              <DropdownMenuItem 
                                className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors hover:bg-accent"
                                onClick={() => {
                                  setViewingStudent(student);
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
  </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student Profile' : 'Add New Student'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Modify student information below.' : 'Create a new student record and login account.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                            {form.watch('name')?.[0] || 'S'}
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
                              reader.addEventListener('load', () => {
                                setCropImageSrc(reader.result as string);
                              });
                              reader.readAsDataURL(file);
                            }}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full flex items-center justify-center gap-2"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            {uploading ? 'Uploading...' : 'Upload/Change Photo'}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Max 1MB (auto-compressed if larger). Square images work best.
                          </p>
                        </div>
                        {field.value && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => field.onChange('')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
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
                      <FormControl><Input {...field} /></FormControl>
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
                        <FormLabel>Email Address (Required/Unique)</FormLabel>
                        {!isSecondaryLoginEnabled && (
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">
                            Secondary Login: Disabled
                          </Badge>
                        )}
                      </div>
                      <FormControl><Input type="email" placeholder="student@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!editingStudent && (
                  <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 col-span-full space-y-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Guardian Information</h3>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Link an existing parent or create a new profile</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="parent_selection_type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2 bg-white border border-muted px-4 py-2.5 rounded-2xl cursor-pointer hover:border-primary transition-colors">
                                <RadioGroupItem value="existing" id="existing" />
                                <Label htmlFor="existing" className="font-bold text-xs cursor-pointer">Select Existing Parent</Label>
                              </div>
                              <div className="flex items-center space-x-2 bg-white border border-muted px-4 py-2.5 rounded-2xl cursor-pointer hover:border-primary transition-colors">
                                <RadioGroupItem value="new" id="new" />
                                <Label htmlFor="new" className="font-bold text-xs cursor-pointer">Create New Parent</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('parent_selection_type') === 'existing' ? (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="existing_parent_id"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Search Existing Parent (Name or ID)</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between h-12 rounded-2xl bg-white border-muted font-bold text-left",
                                      !field.value && "text-muted-foreground font-normal"
                                    )}
                                  >
                                    {field.value
                                      ? parents.find((parent) => parent.id === field.value)?.full_name + " (" + parents.find((parent) => parent.id === field.value)?.parent_id + ")"
                                      : "Select parent..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl overflow-hidden shadow-2xl border-primary/10" align="start">
                                  <Command className="w-full">
                                    <CommandInput placeholder="Search name or parent ID..." className="h-12" />
                                    <CommandEmpty>No parent found.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-y-auto p-2">
                                      {parents.map((parent) => (
                                        <CommandItem
                                          value={`${parent.full_name} ${parent.parent_id}`}
                                          key={parent.id}
                                          onSelect={() => {
                                            form.setValue("existing_parent_id", parent.id);
                                            form.trigger("existing_parent_id");
                                          }}
                                          className="rounded-xl px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4 text-primary",
                                              parent.id === field.value ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span className="font-bold text-sm">{parent.full_name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{parent.parent_id}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch('existing_parent_id') && (
                          <div className="bg-white/50 border border-dashed rounded-2xl p-4 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected Parent Details</p>
                            {(() => {
                              const p = parents.find(parent => parent.id === form.watch('existing_parent_id'));
                              return p ? (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-bold">{p.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Name</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold">{p.phone || 'N/A'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Phone</p>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}

                        <FormField
                          control={form.control}
                          name="parent_relationship"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relationship</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 rounded-2xl bg-white border-muted font-bold">
                                    <SelectValue placeholder="Select relationship" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl shadow-2xl border-primary/10">
                                  <SelectItem value="Father" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Father</SelectItem>
                                  <SelectItem value="Mother" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Mother</SelectItem>
                                  <SelectItem value="Guardian" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Guardian</SelectItem>
                                  <SelectItem value="Uncle" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Uncle</SelectItem>
                                  <SelectItem value="Aunt" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Aunt</SelectItem>
                                  <SelectItem value="Other" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="parent_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Parent Name</FormLabel>
                              <FormControl><Input placeholder="Full Name" className="h-12 rounded-2xl bg-white border-muted font-bold" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="parent_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Parent Phone</FormLabel>
                              <FormControl><Input placeholder="+91 XXXXX XXXXX" className="h-12 rounded-2xl bg-white border-muted font-bold" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="parent_relationship"
                          render={({ field }) => (
                            <FormItem className="col-span-full">
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Relationship</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 rounded-2xl bg-white border-muted font-bold">
                                    <SelectValue placeholder="Select relationship" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl shadow-2xl border-primary/10">
                                  <SelectItem value="Father" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Father</SelectItem>
                                  <SelectItem value="Mother" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Mother</SelectItem>
                                  <SelectItem value="Guardian" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Guardian</SelectItem>
                                  <SelectItem value="Uncle" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Uncle</SelectItem>
                                  <SelectItem value="Aunt" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Aunt</SelectItem>
                                  <SelectItem value="Other" className="rounded-xl px-4 py-3 font-bold cursor-pointer hover:bg-primary/5 transition-colors">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}

                {editingStudent && (
                  <div className="space-y-2 col-span-full border-b pb-4 mb-2 bg-primary/5 p-4 rounded-2xl">
                    <Label className="text-primary font-bold">Verification Record ID</Label>
                    <div className="flex items-center gap-4">
                      <div className="bg-white border-2 border-primary/20 rounded-xl px-6 py-3 font-mono text-primary font-black tracking-widest text-xl shadow-sm">
                        {editingStudent.verification_id}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                          Official immutable record identifier. Use this for lookups, verification portal searches, and QR generation.
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
                  name="login_id_suffix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Login ID (RSBS + Digits)</FormLabel>
                      <div className="flex items-center">
                        <span className="bg-muted px-3 h-10 flex items-center rounded-l-xl border border-r-0 text-sm font-bold text-muted-foreground shrink-0 select-none">
                          RSBS
                        </span>
                        <FormControl>
                          <Input 
                            placeholder="Numeric suffix only" 
                            className="rounded-l-none rounded-r-xl focus-visible:ring-offset-0 font-mono" 
                            disabled={!!editingStudent}
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
                      <FormLabel>{editingStudent ? 'Update Password (Optional)' : 'Initial Password'}</FormLabel>
                      <FormControl><Input type="password" placeholder={editingStudent ? 'Leave blank to keep current' : '••••••••'} {...field} /></FormControl>
                      <FormMessage />
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
                      <FormDescription className="text-[10px]">Student must change this on next login.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('section_id', ''); // Reset section
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section_id"
                  render={({ field }) => {
                    const selectedClass = classes.find(c => c.id === form.watch('class_id'));
                    return (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={!form.watch('class_id')}>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedClass?.sections.map((sec) => (
                              <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="student_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Scholarship">Scholarship</SelectItem>
                          <SelectItem value="Transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Details</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roll_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g. 42" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Rank</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="session_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Session</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="promotion_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="profile_tag"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border p-4 shadow-sm">
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-bold">Profile Tag</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Assign a visual tag to this student's profile for identity clarity.
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
                <FormField
                  control={form.control}
                  name="login_access_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-primary/5 border-primary/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-primary font-bold">Login Access</FormLabel>
                        <p className="text-xs text-muted-foreground font-medium italic">Requirement 3: Block or allow system login.</p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={async (checked) => {
                            field.onChange(checked);
                            if (editingStudent) {
                              try {
                                const { error } = await api.updateProfileByEntityId('student', editingStudent.id, { login_access_enabled: checked });
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
                  name="certificate_visible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Certificate Visible to Student</FormLabel>
                        <p className="text-xs text-muted-foreground font-medium">If enabled, the student can download their certificate.</p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={async (checked) => {
                            field.onChange(checked);
                            // If editing, perform an instant decoupled update
                            if (editingStudent) {
                              try {
                                const { error } = await api.updateStudentVisibility(editingStudent.id, { certificate_visible: checked });
                                if (error) throw error;
                                toast.success(`Certificate visibility ${checked ? 'enabled' : 'disabled'}`);
                                fetchData();
                              } catch (err: any) {
                                toast.error('Failed to update visibility');
                                field.onChange(!checked); // Revert UI
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
                  name="id_card_visible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>ID Card Visible to Student</FormLabel>
                        <p className="text-xs text-muted-foreground font-medium">If enabled, the student can download their ID card.</p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={async (checked) => {
                            field.onChange(checked);
                            if (editingStudent) {
                              try {
                                const { error } = await api.updateStudentVisibility(editingStudent.id, { id_card_visible: checked });
                                if (error) throw error;
                                toast.success(`ID Card visibility ${checked ? 'enabled' : 'disabled'}`);
                                fetchData();
                              } catch (err: any) {
                                toast.error('Failed to update visibility');
                                field.onChange(!checked); // Revert UI
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
                  name="is_blue_tag"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Verified (Blue Tag - Legacy)</FormLabel>
                        <p className="text-xs text-muted-foreground">Legacy blue tag system (use Profile Tag above instead).</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {editingStudent && (
                  <div className="col-span-full border rounded-2xl p-6 bg-muted/20 flex flex-col items-center gap-4 text-center">
                    <div className="space-y-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-2">
                         <QrCode className="w-4 h-4" /> Student Verification Code
                       </h3>
                       <p className="text-xs text-muted-foreground font-medium italic">Scan to verify student status securely.</p>
                    </div>
                    <div className="bg-white p-4 rounded-[2rem] shadow-inner border-4 border-muted/30">
                       <QRCodeDataUrl 
                         text={`${window.location.origin}/verify?id=${editingStudent.verification_id}`} 
                         width={160}
                       />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">
                  {editingStudent ? 'Save Changes' : 'Create Student'}
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
                  <DialogTitle className="text-xl font-black text-foreground">Student Profile</DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium">Complete record information (Read-Only)</p>
                </div>
              </div>
            </DialogHeader>

            {viewingStudent && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/50 dark:bg-black/20 border border-white dark:border-white/5 shadow-sm backdrop-blur-sm">
                  <Avatar className="h-20 w-20 border-4 border-white dark:border-black shadow-lg">
                    <AvatarImage src={viewingStudent.profile_picture_url || ''} />
                    <AvatarFallback className="text-2xl font-black bg-primary text-primary-foreground">{viewingStudent.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-foreground leading-tight">
                      {viewingStudent.prefix && <span>{viewingStudent.prefix} </span>}
                      {viewingStudent.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className="bg-primary/10 text-primary border-none font-bold rounded-lg px-2.5 py-1 uppercase text-[10px] tracking-wider">{viewingStudent.student_type}</Badge>
                      <ProfileTagBadge tag={viewingStudent.profile_tag} />
                      <Badge variant="outline" className="rounded-lg font-mono text-[10px] border-muted-foreground/20">{viewingStudent.login_id}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Login ID', value: viewingStudent.login_id, mono: true },
                    { label: 'Verification ID', value: viewingStudent.verification_id, mono: true },
                    { label: 'Roll Number', value: viewingStudent.roll_number || 'N/A', mono: true },
                    { label: 'Class', value: viewingStudent.class },
                    { label: 'Section', value: viewingStudent.section },
                    { label: 'Gender', value: viewingStudent.gender },
                    { label: 'Date of Birth', value: viewingStudent.dob },
                    { label: 'Contact', value: viewingStudent.contact },
                    { label: 'Email', value: viewingStudent.email },
                    { label: 'Fee Status', value: viewingStudent.fee_status },
                    { label: 'Rank', value: viewingStudent.rank },
                    { label: 'Session', value: viewingStudent.session_info },
                    { label: 'Promotion', value: viewingStudent.promotion_date || 'N/A' },
                  ].map((item, i) => (
                    <div key={i} className="p-3.5 rounded-2xl border border-muted-foreground/5 bg-white/40 dark:bg-black/10 backdrop-blur-sm">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-black block mb-1">{item.label}</Label>
                      <p className={cn("text-sm font-bold text-foreground truncate", item.mono && "font-mono text-[11px]")}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {viewingStudent.linked_parents && viewingStudent.linked_parents.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-black px-1 block">Family Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {viewingStudent.linked_parents.map((parent) => (
                        <div key={parent.id} className="p-4 rounded-2xl border border-muted-foreground/5 bg-white/40 dark:bg-black/10 backdrop-blur-sm flex items-center justify-between group transition-all hover:border-primary/20">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{parent.full_name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono tracking-tighter uppercase leading-none">{parent.parent_id}</span>
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary/20 bg-primary/5 text-primary rounded-md uppercase font-black tracking-[0.05em] scale-90 origin-left">
                                {(parent as any).relationship || 'Guardian'}
                              </Badge>
                            </div>
                          </div>
                          <div className="h-8 px-3 rounded-lg bg-primary/5 text-primary text-[10px] font-bold flex items-center">
                            {parent.phone}
                          </div>
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
            setCurrentUpdateId(null);
            setFormFieldUpdater(null);
          }}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeDelete}
        recordName={studentToDelete?.name || ""}
      />

      {branding && (
        <BulkIDCardGenerator
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          students={students}
          classes={classes}
          branding={branding}
          frontTemplate={frontTemplate}
          backTemplate={backTemplate}
        />
      )}
    </div>
  );
}
