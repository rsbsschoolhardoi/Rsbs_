import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap } from "lucide-react";
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, ChevronsUpDown, Edit, ExternalLink, Eye, MoreHorizontal, Plus, Search, Trash2, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { Parent, Student } from '@/types';

const parentSchema = z.object({
  prefix: z.string().optional().nullable(),
  full_name: z.string().min(2, 'Name is too short'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  occupation: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gender: z.string().min(1, 'Gender is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  initial_pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'Numeric only').optional().or(z.literal('')),
  is_active: z.boolean().default(false),
  student_links: z.array(z.object({
    id: z.string(),
    relationship: z.string()
  })).default([]),
  login_access_enabled: z.boolean().optional(),
});

type ParentFormValues = {
  prefix?: string | null;
  full_name: string;
  phone: string;
  email?: string;
  occupation?: string;
  address?: string;
  gender: string;
  password?: string;
  initial_pin?: string;
  is_active: boolean;
  student_links: { id: string, relationship: string }[];
  login_access_enabled?: boolean;
};

export default function Parents() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const navigate = useNavigate();
  const [viewingParent, setViewingParent] = useState<Parent | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [linkMode, setLinkMode] = useState<'select' | 'manual'>('select');
  const [manualInputValue, setManualInputValue] = useState('');
  const [isSecondaryLoginEnabled, setIsSecondaryLoginEnabled] = useState(false);


  const form = useForm<ParentFormValues>({
    resolver: zodResolver(parentSchema) as any,
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      occupation: '',
      address: '',
      gender: 'Male',
      password: '',
      is_active: false,
      student_links: [],
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: parentData }, { data: studentData }, isSecondaryLoginEnabled] = await Promise.all([
      api.getParents(),
      api.getStudents(),
      api.isGlobalModuleEnabled('secondary_login_id')
    ]);
    setParents(parentData || []);
    setAllStudents(studentData || []);
    setIsSecondaryLoginEnabled(isSecondaryLoginEnabled);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = async (parent: Parent | null = null) => {
    setEditingParent(parent);
    setLinkMode('select');
    setManualInputValue('');
    if (parent) {
      // Requirement 2: Fetch current login access state
      const { data: profile } = await api.getProfileByEntityId('parent', parent.id);
      
      form.reset({
        prefix: parent.prefix || '',
        full_name: parent.full_name,
        phone: parent.phone || '',
        email: parent.email || '',
        occupation: parent.occupation || '',
        address: parent.address || '',
        gender: parent.gender || 'Male',
        is_active: parent.is_active,
        password: '',
        student_links: parent.linked_students?.map(s => ({ id: s.id, relationship: s.relationship || 'Father' })) || [],
        login_access_enabled: profile?.login_access_enabled ?? true,
      });
    } else {
      form.reset({
        prefix: '',
        full_name: '',
        phone: '',
        email: '',
        occupation: '',
        address: '',
        gender: 'Male',
        password: '',
        is_active: false,
        student_links: [],
        login_access_enabled: true,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: any) => {
    try {
      const parentValues = values as ParentFormValues;
      let fullLoginId = editingParent ? editingParent.parent_id : '';

      const { password, student_links, ...parentData } = parentValues;
      const payload = {
        ...parentData,
        parent_id: fullLoginId || undefined,
        address: parentData.address || null,
        email: parentData.email as string,
        occupation: parentData.occupation || null,
      };

      let parentId: string | null = null;
      let finalLoginId = fullLoginId;

      if (editingParent) {
        parentId = editingParent.id;
        const { error } = await api.updateParent(editingParent.id, payload as any);
        if (error) throw error;

        // Requirement 2: Update login access in profile
        await api.updateProfileByEntityId('parent', parentId, { 
          login_access_enabled: values.login_access_enabled 
        });

        // 3. Update student links for existing parent
        const existingLinks = editingParent.linked_students || [];
        const existingStudentIds = existingLinks.map(s => s.id);
        const newStudentIds = student_links.map(s => s.id);

        // Remove old links
        for (const sId of existingStudentIds) {
          if (!newStudentIds.includes(sId)) {
            await api.unlinkParentFromStudent(editingParent.id, sId);
          }
        }
        // Add or Update links
        for (const s of student_links) {
          const existingLink = existingLinks.find(el => el.id === s.id);
          if (!existingLink) {
            await api.linkParentToStudent(editingParent.id, s.id, s.relationship);
          } else if (existingLink.relationship !== s.relationship) {
            // Re-link to update relationship
            await api.linkParentToStudent(editingParent.id, s.id, s.relationship);
          }
        }

        if (password && finalLoginId) {
          await supabase.functions.invoke('update-user-password', {
            body: { username: finalLoginId, password: password },
          });
        }
        toast.success('Parent profile updated successfully');
      } else {
        // Create Parent record first - api.createParent generates the final Login ID (Requirement 1 & 3)
        const { data: createdParent, error } = await api.createParent(payload as any) as any;
        if (error) throw error;
        
        // Use the trigger-generated parent_id
        const newParent = createdParent;
        parentId = newParent?.id;
        finalLoginId = newParent?.parent_id;

        if (!parentId || !finalLoginId) {
          throw new Error('Failed to retrieve the generated Parent Login ID.');
        }

        if (parentId) {
          for (const s of student_links) {
            await api.linkParentToStudent(parentId, s.id, s.relationship);
          }
        }

        // Create Auth account via Edge Function
        const authPayload: any = { 
          username: finalLoginId, 
          password: password || '123456' 
        };
        
        if (parentValues.initial_pin) {
          authPayload.initial_pin = parentValues.initial_pin;
        }

        const { error: authError } = await supabase.functions.invoke('create-user', {
          body: authPayload,
        });
        
        if (authError) {
          toast.warning('Parent record created, but Auth account failed.');
        } else {
          toast.success('Parent account created successfully');
        }
      }
      setIsDialogOpen(false);
      setActiveTab(parentValues.is_active ? "active" : "pending");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const executeDelete = async () => {
    if (!parentToDelete) return;
    
    const { error } = await api.deleteParent(parentToDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Parent deleted');
      fetchData();
    }
  };

  const handleDelete = (parent: Parent) => {
    setParentToDelete(parent);
    setIsDeleteDialogOpen(true);
  };

  const filteredParents = parents.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.parent_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const activeParents = filteredParents.filter(p => p.is_active);
  const pendingParents = filteredParents.filter(p => !p.is_active);
  const displayParents = activeTab === "active" ? activeParents : pendingParents;

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 px-4 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Parents Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage parent accounts and link them to students.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenDialog()} className="h-10 rounded-xl px-6 shadow-md hover:shadow-lg transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" /> Add Parent
          </Button>
        </div>
      </div>

      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Search parents by name or ID..." 
          className="pl-10 h-10 rounded-xl border-muted bg-background/50 focus-visible:ring-primary" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-12 w-full max-w-md grid grid-cols-2">
            <TabsTrigger 
              value="active" 
              className="rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
            >
              Active Parents ({activeParents.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="rounded-lg font-bold data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all duration-300"
            >
              Pending Parents ({pendingParents.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full bg-muted rounded-2xl" />)}
            </div>
          ) : displayParents.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
              <p className="text-muted-foreground">
                No {activeTab === "active" ? "active" : "pending"} parents found.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block border rounded-2xl bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Parent</TableHead>
                    <TableHead>Login ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Linked Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayParents.map((parent) => (
                    <TableRow key={parent.id} className="group transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {parent.full_name[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{parent.full_name}</span>
                            <span className="text-[10px] text-muted-foreground">{parent.occupation || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{parent.parent_id}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span>{parent.phone}</span>
                          <span className="text-muted-foreground">{parent.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {parent.linked_students?.map((s) => (
                            <Badge key={s.id} variant="secondary" className="text-[10px] h-5">
                              {s.name}
                            </Badge>
                          ))}
                          {(!parent.linked_students || parent.linked_students.length === 0) && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parent.is_active ? "default" : "secondary"}>
                          {parent.is_active ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
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
                              onClick={() => navigate(`/admin/parents/${parent.id}`)}
                            >
                              <ExternalLink className="w-4 h-4 text-primary" />
                              <span>View Linked Student</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2"
                              onClick={() => handleOpenDialog(parent)}
                            >
                              <Edit className="w-4 h-4 text-muted-foreground" />
                              <span>Edit Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 text-destructive"
                              onClick={() => handleDelete(parent)}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Parent</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors hover:bg-accent"
                              onClick={() => {
                                setViewingParent(parent);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingParent ? 'Edit Parent Profile' : 'Add New Parent'}</DialogTitle>
            <DialogDescription>
              Fill in the parent's information and set their login credentials.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
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
                  control={form.control as any}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Login ID</Label>
                  <div className="flex items-center">
                    <div className="bg-muted px-3 h-10 flex items-center rounded-xl border text-sm font-bold text-muted-foreground w-full select-none">
                      {editingParent ? editingParent.parent_id : 'RSBSP (Auto-generated)'}
                    </div>
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    {editingParent 
                      ? "Permanent Login ID (Immutable)" 
                      : "A unique ID will be automatically generated upon creation."}
                  </p>
                </div>
                <FormField
                  control={form.control as any}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingParent ? 'Update Password (Optional)' : 'Initial Password'}</FormLabel>
                      <FormControl><Input type="password" placeholder={editingParent ? 'Leave blank to keep current' : '••••••••'} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="initial_pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial PIN (Optional)</FormLabel>
                      <FormControl><Input type="password" maxLength={4} placeholder="4-digit PIN" {...field} onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ''))} /></FormControl>
                      <FormDescription className="text-[10px]">Parent must change this on next login.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
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
                          onCheckedChange={async (checked) => {
                            field.onChange(checked);
                            if (editingParent) {
                              try {
                                const { error } = await api.updateProfileByEntityId('parent', editingParent.id, { login_access_enabled: checked });
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
                  control={form.control as any}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Email Address</FormLabel>
                        {!isSecondaryLoginEnabled && (
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">
                            Secondary Login: Disabled
                          </Badge>
                        )}
                      </div>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
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
                  control={form.control as any}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="student_links"
                  render={({ field }) => {
                    const links = field.value || [];
                    
                    const handleAddStudent = (studentId: string) => {
                      if (!links.some((l: any) => l.id === studentId)) {
                        field.onChange([...links, { id: studentId, relationship: 'Father' }]);
                      }
                    };

                    const handleRemoveStudent = (studentId: string) => {
                      field.onChange(links.filter((l: any) => l.id !== studentId));
                    };

                    const handleUpdateRelationship = (studentId: string, relationship: string) => {
                      field.onChange(links.map((l: any) => l.id === studentId ? { ...l, relationship } : l));
                    };

                    return (
                      <FormItem className="col-span-full space-y-4">
                        <div>
                          <FormLabel className="text-sm font-bold">Link Student(s)</FormLabel>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Connect parent profile with student records</p>
                        </div>

                        <div className="space-y-4 p-5 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
                          {links.length === 0 && (
                            <div className="p-8 text-center border border-dashed border-muted rounded-2xl bg-white/50">
                               <GraduationCap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                               <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest italic">No students linked. Use search below...</p>
                            </div>
                          )}
                          
                          {links.map((link: any) => {
                            const student = allStudents.find(s => s.id === link.id);
                            return (
                              <div key={link.id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-muted shadow-sm group">
                                <Avatar className="h-9 w-9 border-2 border-primary/5">
                                  <AvatarImage src={student?.profile_picture_url || ''} />
                                  <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black uppercase">
                                    {student?.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{student?.name || 'Unknown Student'}</p>
                                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{student?.login_id || 'ID N/A'}</p>
                                </div>
                                <div className="w-24 shrink-0">
                                  <Select 
                                    value={link.relationship} 
                                    onValueChange={(val) => handleUpdateRelationship(link.id, val)}
                                  >
                                    <SelectTrigger className="h-8 rounded-lg text-[10px] font-bold px-2 bg-primary/5 border-none shadow-none">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-2xl border-primary/10">
                                      <SelectItem value="Father" className="text-[10px] font-bold">Father</SelectItem>
                                      <SelectItem value="Mother" className="text-[10px] font-bold">Mother</SelectItem>
                                      <SelectItem value="Guardian" className="text-[10px] font-bold">Guardian</SelectItem>
                                      <SelectItem value="Uncle" className="text-[10px] font-bold">Uncle</SelectItem>
                                      <SelectItem value="Aunt" className="text-[10px] font-bold">Aunt</SelectItem>
                                      <SelectItem value="Other" className="text-[10px] font-bold">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => handleRemoveStudent(link.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          })}

                          <div className="pt-2 border-t border-muted-foreground/5 mt-2">
                             <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between h-10 rounded-xl bg-white border-muted font-bold text-left hover:border-primary transition-all shadow-sm"
                                  >
                                    <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
                                      <Plus className="h-3 w-3 text-primary" />
                                      Add Student to Parent...
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl overflow-hidden shadow-2xl border-primary/10" align="start">
                                  <Command className="w-full">
                                    <CommandInput placeholder="Search name or ID..." className="h-10 border-none text-[11px]" />
                                    <CommandEmpty className="p-4 text-center text-xs text-muted-foreground italic">No student found.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                                      {allStudents
                                        .filter(s => !links.some((l: any) => l.id === s.id))
                                        .map((student) => (
                                          <CommandItem
                                            key={student.id}
                                            value={`${student.name} ${student.login_id} ${student.email}`}
                                            onSelect={() => handleAddStudent(student.id)}
                                            className="rounded-lg px-2.5 py-2 cursor-pointer transition-all hover:bg-primary/5"
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-primary" />
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="font-bold text-[12px] leading-tight">{student.name}</span>
                                                <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest leading-tight">{student.login_id}</span>
                                              </div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control as any}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control as any}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel>Account Status</FormLabel>
                        <p className="text-xs text-muted-foreground font-medium">Enable or disable this parent's system access.</p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">
                  {editingParent ? 'Save Changes' : 'Create Parent'}
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
                  <DialogTitle className="text-xl font-black text-foreground">Parent Profile</DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium">Complete record information (Read-Only)</p>
                </div>
              </div>
            </DialogHeader>
            
            {viewingParent && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/50 dark:bg-black/20 border border-white dark:border-white/5 shadow-sm backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black border-2 border-white dark:border-black shadow-md">
                    {viewingParent.full_name[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-foreground leading-tight">
                      {viewingParent.prefix && <span>{viewingParent.prefix} </span>}
                      {viewingParent.full_name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={viewingParent.is_active ? "default" : "secondary"} className="rounded-lg font-bold px-2.5 py-1 uppercase text-[10px] tracking-wider">
                        {viewingParent.is_active ? "Active" : "Pending"}
                      </Badge>
                      <Badge variant="outline" className="rounded-lg font-mono text-[10px] border-muted-foreground/20">{viewingParent.parent_id}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Parent ID', value: viewingParent.parent_id, mono: true },
                    { label: 'Gender', value: viewingParent.gender },
                    { label: 'Occupation', value: viewingParent.occupation || 'N/A' },
                    { label: 'Phone', value: viewingParent.phone },
                    { label: 'Email', value: viewingParent.email },
                    { label: 'Address', value: viewingParent.address || 'N/A', full: true },
                  ].map((item, i) => (
                    <div key={i} className={cn("p-4 rounded-2xl border border-muted-foreground/5 bg-white/40 dark:bg-black/10 backdrop-blur-sm", item.full && "col-span-full")}>
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-black block mb-1">{item.label}</Label>
                      <p className={cn("text-sm font-bold text-foreground", item.mono && "font-mono text-[11px]")}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {viewingParent.linked_students && viewingParent.linked_students.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-black px-1 block">Linked Students</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {viewingParent.linked_students.map((student) => (
                        <div key={student.id} className="p-4 rounded-2xl border border-muted-foreground/5 bg-white/40 dark:bg-black/10 backdrop-blur-sm flex items-center justify-between group transition-all hover:border-primary/20">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">
                              {student.prefix && <span>{student.prefix} </span>}
                              {student.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono tracking-tighter uppercase leading-none">{student.login_id}</span>
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary/20 bg-primary/5 text-primary rounded-md uppercase font-black tracking-[0.05em] scale-90 origin-left">
                                {(student as any).relationship || 'Son/Daughter'}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] px-2 h-7 rounded-lg">
                             {student.class}-{student.section}
                          </Badge>
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

      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeDelete}
        recordName={parentToDelete?.full_name || ""}
      />
    </div>
  );
}
