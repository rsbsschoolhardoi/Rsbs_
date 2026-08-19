import { useEffect, useState } from 'react';
import { api } from '@/db/api';

import { Profile, Module, ModuleSetting, StudentSession, Student, Teacher, Parent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ShieldCheck, UserPlus, Users, Key, Settings2, CheckCircle2, Power, PowerOff, CalendarCheck, GraduationCap, Calendar, Phone as PhoneIcon, User, Mail as MailIcon, MapPin, ClipboardList, CheckCircle, XCircle, RotateCcw, Clock, Monitor, Ban, Unlock, Trash2, Smartphone, Monitor as MonitorIcon, Activity, RefreshCw, FileText, CreditCard, AlertTriangle, Globe, UserCheck, ShieldAlert, ChevronRight, ChevronDown, Filter, Search, MoreVertical, Eye, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


import { Badge as UI_Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/db/supabase';


import { maskEmail } from '@/utils/masking';

const adminSchema = z.object({
  prefix: z.string().optional().nullable(),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores allowed'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'At least one module must be selected'),
  is_master: z.boolean(),
  is_blue_tag: z.boolean().optional(),
  admin_custom_tag: z.string().max(30, 'Tag must be under 30 characters').optional(),
  login_access_enabled: z.boolean(),
});

type AdminFormValues = z.infer<typeof adminSchema>;

export default function AdminManagement({ defaultTab = 'admins' }: { defaultTab?: string }) {
  const { profile: currentAdmin } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState(defaultTab);
  const [modules, setModules] = useState<Module[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [moduleSettings, setModuleSettings] = useState<ModuleSetting[]>([]);
  const [activeSessions, setActiveSessions] = useState<StudentSession[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<any[]>([]);

  // PIN Management Filtering State
  const [activeFolder, setActiveFolder] = useState<'student' | 'teacher' | 'parent' | 'admin'>('student');
  const [globalSearch, setGlobalSearch] = useState('');
  const [quickFilters, setQuickFilters] = useState({ userId: '', name: '', phone: '' });
  const [advFilters, setAdvFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState({ 
    global: '', 
    quick: { userId: '', name: '', phone: '' }, 
    adv: {} as Record<string, string> 
  });
  const [isAdvFiltersOpen, setIsAdvFiltersOpen] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<any[]>([]);
  const [oauthLogs, setOauthLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldowns(prev => {
        const next = { ...prev };
        let hasChanges = false;
        for (const id in next) {
          if (next[id] > 0) {
            next[id] -= 1;
            hasChanges = true;
          } else {
            delete next[id];
            hasChanges = true;
          }
        }
        return hasChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [selectedStudentForBlock, setSelectedStudentForBlock] = useState<Student | null>(null);

  const [blockReason, setBlockReason] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<Profile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewingAdmin, setViewingAdmin] = useState<Profile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAdmins = admins.filter(admin => 
    admin.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: { 
      username: '', 
      email: '',
      password: '', 
      permissions: ['dashboard', 'students', 'classes', 'fees', 'attendance', 'exams', 'notices', 'gallery', 'school_home', 'queries', 'parents', 'teachers', 'timetable', 'certificates', 'templates'],
      is_master: false,
      admin_custom_tag: '',
      login_access_enabled: true,
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const [adminsRes, modulesRes, settingsRes, sessionsRes, studentsRes, profilesRes, verificationRes, deploymentRes, oauthRes, teachersRes, parentsRes] = await Promise.all([
      api.getAdminProfiles(),
      api.getModules(),
      api.getModuleSettings(),
      currentAdmin?.is_master ? api.getActiveSessions() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getStudents() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getAllNonAdminProfiles() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getVerificationLogs() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getDeploymentAuditLogs() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getOauthAuditLogs() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getTeachers() : Promise.resolve({ data: [], error: null }),
      currentAdmin?.is_master ? api.getParents() : Promise.resolve({ data: [], error: null })
    ]);
    setAdmins(adminsRes.data || []);
    setModules(modulesRes.data || []);
    setModuleSettings(settingsRes.data || []);
    setActiveSessions(sessionsRes.data || []);
    setAllStudents(studentsRes.data || []);
    setAllProfiles(profilesRes.data || []);
    setVerificationLogs(verificationRes.data || []);
    setDeploymentLogs(deploymentRes.data || []);
    setOauthLogs(oauthRes.data || []);
    setAllTeachers(teachersRes.data || []);
    setAllParents(parentsRes.data || []);
    setLoading(false);
  };

  const fetchSessions = async () => {
    setRefreshingSessions(true);
    const { data } = await api.getActiveSessions();
    setActiveSessions(data || []);
    setRefreshingSessions(false);
  };
  const secondaryLoginSetting = moduleSettings.find(s => s.module_id === 'secondary_login_id' && !s.role && !s.user_id);
  const isSecondaryLoginEnabled = secondaryLoginSetting?.is_enabled && secondaryLoginSetting?.state !== 'deactivated';


  useEffect(() => {
    fetchData();

    // Subscribe to session changes if master admin
    if (currentAdmin?.is_master) {
      const channel = supabase
        .channel('student-sessions-monitoring')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_sessions' }, () => {
          fetchSessions();
        })
        .subscribe();
      
      return () => {
        channel.unsubscribe();
      };
    }
  }, [currentAdmin?.is_master]);

  const handleForceLogout = async (id: string) => {
    try {
      const { error } = await api.forceLogout(id);
      if (error) throw error;
      toast.success('Student forced to log out');
    } catch (error: any) {
      toast.error(error.message || 'Failed to logout session');
    }
  };

  const handleForceLogoutAll = async () => {
    if (!confirm('Are you sure you want to log out ALL students? This cannot be undone.')) return;
    try {
      const { error } = await api.forceLogoutAll();
      if (error) throw error;
      toast.success('All student sessions terminated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to logout sessions');
    }
  };

  const handleBlockStudent = async () => {
    if (!selectedStudentForBlock) return;
    try {
      const { error } = await api.blockStudent(selectedStudentForBlock.id, blockReason);
      if (error) throw error;
      toast.success(`${selectedStudentForBlock.name} has been blocked`);
      setIsBlockDialogOpen(false);
      setSelectedStudentForBlock(null);
      setBlockReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to block student');
    }
  };

  const handleUnblockStudent = async (studentId: string) => {
    try {
      const { error } = await api.unblockStudent(studentId);
      if (error) throw error;
      toast.success('Student has been unblocked');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unblock student');
    }
  };

  const handleResetPIN = async (profileId: string) => {
    const newTempPIN = Math.floor(1000 + Math.random() * 9000).toString();
    if (!confirm(`Are you sure you want to change this user's PIN? The new PIN will be: ${newTempPIN}.`)) return;
    
    try {
      const { error } = await api.adminResetPIN(profileId, newTempPIN);
      if (error) throw error;
      toast.success(`PIN changed successfully. PIN: ${newTempPIN}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to change PIN');
    }
  };

  const handleClearPIN = async (profileId: string) => {
    if (!confirm(`Are you sure you want to completely clear this user's PIN? They will be forced to create a new one on next login.`)) return;
    
    try {
      const { error } = await api.adminClearPIN(profileId);
      if (error) throw error;
      toast.success(`PIN cleared successfully.`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear PIN');
    }
  };

  const handleRemoveLock = async (profileId: string) => {
    try {
      const { error } = await api.adminRemoveLock(profileId);
      if (error) throw error;
      toast.success('User PIN lockout removed successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove lockout');
    }
  };

  const getFilteredProfiles = () => {
    let filtered = [...allProfiles];

    // Global Filter (Across all categories)
    if (appliedFilters.global) {
      const g = appliedFilters.global.toLowerCase();
      filtered = filtered.filter(p => 
        p.username?.toLowerCase().includes(g) || 
        p.email?.toLowerCase().includes(g)
      );
    }

    // Folder Filter (Data Isolation)
    filtered = filtered.filter(p => p.role === activeFolder);

    // Quick Filters (Persistent)
    if (appliedFilters.quick.userId) {
      filtered = filtered.filter(p => p.username?.toLowerCase().includes(appliedFilters.quick.userId.toLowerCase()));
    }
    // Note: Name and Phone are role-specific usually, but we can try to match them if possible
    // For Students, we can look up in allStudents etc.
    if (appliedFilters.quick.name || appliedFilters.quick.phone) {
      filtered = filtered.filter(p => {
        let match = true;
        if (p.role === 'student' && p.student_id) {
          const s = allStudents.find(st => st.id === p.student_id);
          if (appliedFilters.quick.name && !s?.name.toLowerCase().includes(appliedFilters.quick.name.toLowerCase())) match = false;
          if (appliedFilters.quick.phone && !s?.contact.toLowerCase().includes(appliedFilters.quick.phone.toLowerCase())) match = false;
        } else if (p.role === 'teacher' && p.teacher_id) {
          const t = allTeachers.find(th => th.id === p.teacher_id);
          if (appliedFilters.quick.name && !t?.name.toLowerCase().includes(appliedFilters.quick.name.toLowerCase())) match = false;
          if (appliedFilters.quick.phone && !t?.contact.toLowerCase().includes(appliedFilters.quick.phone.toLowerCase())) match = false;
        } else if (p.role === 'parent' && p.parent_profile_id) {
          const pr = allParents.find(par => par.id === p.parent_profile_id);
          if (appliedFilters.quick.name && !pr?.full_name.toLowerCase().includes(appliedFilters.quick.name.toLowerCase())) match = false;
          if (appliedFilters.quick.phone && !pr?.phone?.toLowerCase().includes(appliedFilters.quick.phone.toLowerCase())) match = false;
        } else if (p.role === 'admin') {
          // Admins might not have a separate record for name/phone in this simplified model
          if (appliedFilters.quick.name && !p.username?.toLowerCase().includes(appliedFilters.quick.name.toLowerCase())) match = false;
        }
        return match;
      });
    }

    // Advanced Filters (Dynamic)
    if (Object.keys(appliedFilters.adv).length > 0) {
      filtered = filtered.filter(p => {
        if (p.role === 'student' && p.student_id) {
          const s = allStudents.find(st => st.id === p.student_id);
          if (appliedFilters.adv.class && s?.class !== appliedFilters.adv.class) return false;
          if (appliedFilters.adv.section && s?.section !== appliedFilters.adv.section) return false;
        } else if (p.role === 'teacher' && p.teacher_id) {
          const t = allTeachers.find(th => th.id === p.teacher_id);
          if (appliedFilters.adv.subject && !t?.subject_role.toLowerCase().includes(appliedFilters.adv.subject.toLowerCase())) return false;
        } else if (p.role === 'parent' && p.parent_profile_id) {
          const pr = allParents.find(par => par.id === p.parent_profile_id);
          if (appliedFilters.adv.occupation && !pr?.occupation?.toLowerCase().includes(appliedFilters.adv.occupation.toLowerCase())) return false;
        }
        return true;
      });
    }

    return filtered;
  };

  const applyFilters = () => {
    setAppliedFilters({
      global: globalSearch,
      quick: { ...quickFilters },
      adv: { ...advFilters }
    });
  };

  const resetFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ userId: '', name: '', phone: '' });
    setAdvFilters({});
    setAppliedFilters({ global: '', quick: { userId: '', name: '', phone: '' }, adv: {} });
  };

  const handleModuleToggle = async (moduleId: string, isEnabled: boolean) => {
    try {
      const { data, error } = await api.upsertModuleSetting(moduleId, isEnabled);
      if (error) throw error;
      if (data) {
        setModuleSettings(prev => {
          const index = prev.findIndex(s => s.module_id === moduleId && !s.role && !s.user_id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = data;
            return next;
          }
          return [...prev, data];
        });
        window.dispatchEvent(new CustomEvent('module-settings-updated'));
      }
      toast.success('Module status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update module status');
    }
  };

  const [remediating, setRemediating] = useState(false);
  const handleRunRemediation = async () => {
    setRemediating(true);
    try {
      const { data, error } = await supabase.functions.invoke('remediate-student-logins', {
        body: {},
      });
      if (error) throw error;
      toast.success(`Remediation complete. ${data.orphansDeleted.length} orphans deleted, ${data.missingCreated.length} logins created.`);
      if (data.errors.length > 0) {
        console.warn('Remediation partial success:', data.errors);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to run remediation');
    } finally {
      setRemediating(false);
    }
  };

  useEffect(() => {
    if (editingAdmin) {
      form.reset({
        prefix: editingAdmin.prefix || '',
        username: editingAdmin.username,
        email: editingAdmin.email || '',
        password: '',
        permissions: editingAdmin.permissions || [],
        is_master: editingAdmin.is_master || false,
        is_blue_tag: editingAdmin.is_blue_tag || false,
      });
    } else {
      form.reset({
        prefix: '',
        username: '',
        email: '',
        password: '',
        permissions: ['dashboard', 'students', 'classes', 'fees', 'attendance', 'exams', 'notices', 'gallery', 'school_home', 'queries', 'parents', 'teachers', 'timetable', 'certificates', 'templates'],
        is_master: false,
        is_blue_tag: false
      });
    }
  }, [editingAdmin, form]);

  const handleToggleMaster = async (userId: string, currentStatus: boolean) => {
    if (userId === currentAdmin?.id) {
      toast.error('You cannot change your own master status.');
      return;
    }
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'demote' : 'promote'} this admin? Master Admins have permanent, immutable access.`)) return;
    
    try {
      const { error } = await api.toggleMasterStatus(userId, !currentStatus);
      if (error) throw error;
      toast.success(`Admin ${currentStatus ? 'demoted' : 'promoted'} successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update master status');
    }
  };

  const handleToggleAccountStatus = async (userId: string, currentStatus: 'active' | 'restricted') => {
    if (userId === currentAdmin?.id) {
      toast.error('You cannot change your own account status.');
      return;
    }
    
    try {
      setLoading(true);
      const newStatus = currentStatus === 'active' ? 'restricted' : 'active';
      const { error } = await api.toggleAccountStatus(userId, newStatus);
      if (error) throw error;
      toast.success(`Account status updated to ${newStatus}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    try {
      setLoading(true);
      const { error } = await api.deleteUser(adminToDelete.username!);
      if (error) throw error;
      toast.success('Admin account deleted successfully.');
      setIsDeleteDialogOpen(false);
      setAdminToDelete(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete admin.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: AdminFormValues) => {
    setLoading(true);
    try {
      const finalEmail = values.email.trim().toLowerCase();

      const { data: result, error: rpcError } = await supabase.functions.invoke('create-admin', {
        body: editingAdmin ? { ...values, id: editingAdmin.id, email: finalEmail } : { ...values, email: finalEmail }
      });

      if (rpcError) {
        const errorMsg = await rpcError?.context?.text();
        throw new Error(errorMsg || rpcError.message);
      }

      if (result?.success) {
        // Requirement: Trigger email verification immediately after creation
        if (!editingAdmin) {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(finalEmail, {
            redirectTo: window.location.origin + '/admin/verify'
          });
          
          if (resetError) {
            console.error('Failed to trigger initial verification email:', resetError);
            toast.error('Admin created but failed to send verification email: ' + resetError.message);
          } else {
            toast.success('Admin account created in restricted state. Email verification link sent.');
          }
        } else {
          toast.success('Admin account updated');
        }
        
        setIsDialogOpen(false);
        setEditingAdmin(null);
        form.reset();
        fetchData();
      } else {
        throw new Error('Failed to confirm administrative action.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (admin: any) => {
    if (resendCooldowns[admin.id] > 0) {
      toast.error(`Please wait ${resendCooldowns[admin.id]} seconds before resending.`);
      return;
    }

    try {
      setLoading(true);
      // Phase A: Use supabase.auth.resetPasswordForEmail as mandated by specification
      // This ensures a real email is sent via Supabase's built-in mailer
      const { error } = await supabase.auth.resetPasswordForEmail(admin.email, {
        redirectTo: window.location.origin + '/admin/verify'
      });
      
      if (error) throw error;
      
      // Set 60s cooldown as mandated by specification
      setResendCooldowns(prev => ({ ...prev, [admin.id]: 60 }));
      
      // Also call the backend to log the resend event
      await api.resendVerificationLink(admin.id);
      
      toast.success('Verification magic link sent to ' + admin.email);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification link');
    } finally {
      setLoading(false);
    }
  };

  const hasAdminManagement = currentAdmin?.permissions?.includes('admin_management');

  const activeTab = "admins";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-primary tracking-tight">
            <ShieldCheck className="w-8 h-8" />
            System Administration
          </h1>
          <p className="text-sm text-muted-foreground">Manage administrative access and global system modules.</p>
        </div>
      </div>

      <Tabs defaultValue={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl border w-full lg:w-fit overflow-x-auto justify-start">
          {hasAdminManagement && (
            <>
              <TabsTrigger value="admins" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Accounts</span>
                <span className="sm:hidden text-xs">Admins</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">System Health</span>
                <span className="sm:hidden text-xs">Health</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Active Sessions</span>
                <span className="sm:hidden text-xs">Sessions</span>
              </TabsTrigger>
              <TabsTrigger value="modules" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <Power className="w-4 h-4" />
                <span className="hidden sm:inline">Global Modules</span>
                <span className="sm:hidden text-xs">Modules</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Logs</span>
                <span className="sm:hidden text-xs">Logs</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">User Security</span>
                <span className="sm:hidden text-xs">Security</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 rounded-lg px-4 py-2">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden text-xs">Settings</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {hasAdminManagement && (
          <>
            <TabsContent value="admins" className="space-y-6">
              <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setEditingAdmin(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add New Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingAdmin ? 'Update Admin Access' : 'Create Admin Account'}</DialogTitle>
                      <DialogDescription>
                        {editingAdmin ? 'Modify permissions and access for this administrator.' : 'Assign a new administrator to manage the school system.'}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control as any}
                              name="email"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <div className="flex items-center justify-between">
                                    <FormLabel>Admin Email Address (Optional)</FormLabel>
                                    {!isSecondaryLoginEnabled && (
                                      <Badge variant="outline" className="text-xs font-bold font-medium text-muted-foreground bg-muted/20">
                                        Secondary Login: Disabled
                                      </Badge>
                                    )}
                                  </div>
                                  <FormControl>
                                    <div className="relative">
                                      <MailIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input placeholder="admin@rsbs.school" className="pl-10" {...field} disabled={loading} />
                                    </div>
                                  </FormControl>
                                  <FormDescription>Verification link will be sent to this email.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
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
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Admin Username</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input placeholder="Enter username" className="pl-10" {...field} disabled={!!editingAdmin || loading} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control as any}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{editingAdmin ? 'Update Password (Optional)' : 'Secure Password'}</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input type="password" placeholder="••••••••" className="pl-10" {...field} disabled={loading} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control as any}
                              name="admin_custom_tag"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Custom Role Tag
                                    {!currentAdmin?.is_master && (
                                      <Badge variant="outline" className="text-xs h-4">Master Only</Badge>
                                    )}
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="e.g. Principal, Attendance Manager" 
                                        className="pl-10" 
                                        {...field} 
                                        disabled={!currentAdmin?.is_master || loading} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-xs">Replaces "System Administrator" label.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control as any}
                              name="is_blue_tag"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-2xl border bg-muted/20 p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-bold">Custom Blue Tag</FormLabel>
                                    <FormDescription className="text-xs">Special highlighting.</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control as any}
                              name="login_access_enabled"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-2xl border bg-muted/20 p-4">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <FormLabel className="text-sm font-bold">Login Access</FormLabel>
                                      {!currentAdmin?.is_master && <Badge variant="outline" className="text-xs h-4">Master Only</Badge>}
                                    </div>
                                    <FormDescription className="text-xs">Block or allow login.</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch 
                                      checked={field.value} 
                                      onCheckedChange={field.onChange} 
                                      disabled={!currentAdmin?.is_master || (!!editingAdmin && editingAdmin.id === currentAdmin?.id)} 
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold">Module Permissions</Label>
                                  <FormField
                                control={form.control as any}
                                name="is_master"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value || false}
                                        disabled={!currentAdmin?.is_master || editingAdmin?.id === currentAdmin?.id}
                                        onCheckedChange={(checked) => {
                                          field.onChange(checked);
                                          if (checked) {
                                            form.setValue('permissions', modules.map(m => m.id));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-bold text-primary cursor-pointer">
                                      {field.value ? 'Promote to Master Admin' : 'Assign Master Status'}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-xl border border-muted">
                              {modules.map((module) => (
                                <FormField
                                  key={module.id}
                                  control={form.control as any}
                                  name="permissions"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={module.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(module.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, module.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value: string) => value !== module.id
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-medium cursor-pointer">
                                          {module.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            {form.formState.errors.permissions && (
                              <p className="text-sm font-medium text-destructive">
                                {form.formState.errors.permissions.message as string}
                              </p>
                            )}
                          </div>
                        </div>

                        <DialogFooter>
                          <Button 
                            type="submit" 
                            className="w-full h-11 rounded-xl" 
                            disabled={loading}
                          >
                            {loading ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            {editingAdmin ? 'Update Admin Account' : 'Create Admin Account'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold">Active Administrators</CardTitle>
                      <CardDescription>Current users with system-level control access.</CardDescription>
                    </div>
                    <div className="flex-1 max-w-sm">
                      <Input 
                        placeholder="Search admins by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="text-center py-8 text-muted-foreground">Loading system operators...</p>
                    ) : filteredAdmins.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No admin accounts found{searchQuery ? ' matching your search' : ''}.</p>
                    ) : (
                      <div className="divide-y">
                        {filteredAdmins.map((admin) => (
                          <div key={admin.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between group transition-colors hover:bg-muted/30 px-4 rounded-md gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                {admin.username?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-lg">{admin.username}</p>
                                  {admin.is_master && (
                                    <Badge className="bg-primary hover:bg-primary shadow-sm">
                                      <ShieldCheck className="w-3 h-3 mr-1" />
                                      Master
                                    </Badge>
                                  )}
                                  {admin.is_blue_tag && (
                                    <Badge className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Blue Badge
                                    </Badge>
                                  )}
                                  {admin.email_verified ? (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 shadow-sm">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-rose-500 hover:bg-rose-600 shadow-sm animate-pulse">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Unverified
                                    </Badge>
                                  )}
                                  {admin.admin_custom_tag && (
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground font-semibold text-xs h-5 px-2">
                                      <ShieldCheck className="w-3 h-3 mr-1 text-primary" />
                                      {admin.admin_custom_tag}
                                    </Badge>
                                  )}
                                  <Badge className={cn("shadow-sm", admin.account_status === 'active' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700")}>
                                    <Power className="w-3 h-3 mr-1" />
                                    {admin.account_status === 'active' ? 'Active' : 'Restricted'}
                                  </Badge>
                                </div>
                                <div className="flex flex-col gap-2 mt-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-widest w-24">Email Status:</span>
                                    <p className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {admin.email_verified || admin.email?.endsWith('@miaoda.com') ? admin.email : maskEmail(admin.email)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-widest w-24">Verification:</span>
                                    {admin.email_verified || admin.email?.endsWith('@miaoda.com') ? (
                                      <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/10 font-semibold text-xs h-5 px-2">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Verified
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-warning/10 text-warning border-amber-200 hover:bg-warning/10 font-semibold text-xs h-5 px-2">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Unverified
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 font-bold italic tracking-wider uppercase opacity-60">System Operator since {new Date(admin.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 md:max-w-md justify-start md:justify-end">
                              {admin.permissions?.slice(0, 3).map(p => (
                                <Badge key={p} variant="outline" className="text-xs py-0">{modules.find(m => m.id === p)?.label}</Badge>
                              ))}
                              {(admin.permissions?.length || 0) > 3 && (
                                <Badge variant="outline" className="text-xs py-0">+{admin.permissions.length - 3} more</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Manage option visible for Master Admin targeting any admin (including peers) */}
                              {currentAdmin?.is_master ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-24 border border-primary/20 hover:bg-primary/5 text-primary font-bold transition-all active:scale-95 flex items-center gap-1.5 rounded-lg">
                                      Manage
                                      <ChevronDown className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-lg border-muted">
                                    <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground px-2 py-1.5">Administrative Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="rounded-lg px-2 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                      onClick={() => { 
                                        setViewingAdmin(admin); 
                                        setIsViewDialogOpen(true); 
                                      }}
                                    >
                                      <Eye className="w-4 h-4 text-blue-500" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-lg px-2 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                      onClick={() => { 
                                        setEditingAdmin(admin); 
                                        form.reset({
                                          username: admin.username,
                                          email: admin.email || '',
                                          password: '',
                                          permissions: admin.permissions || [],
                                          is_master: admin.is_master || false,
                                          is_blue_tag: admin.is_blue_tag || false,
                                          admin_custom_tag: admin.admin_custom_tag || '',
                                          login_access_enabled: admin.login_access_enabled ?? true,
                                        });
                                        setIsDialogOpen(true); 
                                      }}
                                    >
                                      <Edit className="w-4 h-4 text-primary" />
                                      Edit Access
                                    </DropdownMenuItem>

                                    {!admin.email_verified && (
                                      <DropdownMenuItem className="rounded-lg px-2 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                        onClick={() => handleResendVerification(admin)}
                                        disabled={resendCooldowns[admin.id] > 0}
                                      >
                                        <RefreshCw className={cn("w-4 h-4 text-emerald-500", resendCooldowns[admin.id] > 0 && "animate-spin")} />
                                        {resendCooldowns[admin.id] > 0 ? `Resend Verification (${resendCooldowns[admin.id]}s)` : "Resend Verification"}
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuItem className="rounded-lg px-2 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                      onClick={() => handleToggleAccountStatus(admin.id, admin.account_status || 'restricted')}
                                      disabled={admin.id === currentAdmin.id}
                                    >
                                      {admin.account_status === 'active' ? (
                                        <>
                                          <PowerOff className="w-4 h-4 text-rose-500" />
                                          Restrict Account
                                        </>
                                      ) : (
                                        <>
                                          <Power className="w-4 h-4 text-emerald-500" />
                                          Activate Account
                                        </>
                                      )}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem className="rounded-lg px-2 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                                      onClick={() => handleToggleMaster(admin.id, admin.is_master || false)}
                                      disabled={admin.id === currentAdmin.id}
                                    >
                                      {admin.is_master ? (
                                        <>
                                          <PowerOff className="w-4 h-4 text-amber-500" />
                                          Revoke Master
                                        </>
                                      ) : (
                                        <>
                                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                                          Assign Master
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    
                                    {/* Requirement: Hide Delete function for Master Admin user records */}
                                    {!admin.is_master && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="rounded-lg px-2 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors text-destructive focus:bg-destructive/10 focus:text-destructive"
                                          onClick={() => { 
                                            setAdminToDelete(admin); 
                                            setIsDeleteDialogOpen(true); 
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete Account
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                // For non-master admins
                                <div className="flex items-center gap-2">
                                  {admin.is_master && (
                                    <Badge variant="secondary" className="bg-warning/10 text-warning border-amber-200 uppercase text-xs font-semibold tracking-widest px-2">Protected</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-none shadow-sm rounded-2xl p-6 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-semibold text-primary">{activeSessions.length}</h3>
                    <p className="text-sm font-bold text-muted-foreground font-medium">Active Students</p>
                  </div>
                </Card>
                
                <Card className="bg-amber-500/5 border-none shadow-sm rounded-2xl p-6 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Ban className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-semibold text-amber-500">{allStudents.filter(s => s.is_blocked).length}</h3>
                    <p className="text-sm font-bold text-muted-foreground font-medium">Blocked Accounts</p>
                  </div>
                </Card>

                <div className="flex items-center justify-end">
                  <Button variant="destructive" size="lg" className="rounded-2xl h-16 px-8 font-semibold text-lg shadow-xl shadow-destructive/20" onClick={handleForceLogoutAll}>
                    <PowerOff className="w-6 h-6 mr-3" />
                    Emergency Logout All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Sessions List */}
                <Card className="lg:col-span-2 border shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-3">
                        <MonitorIcon className="w-6 h-6" />
                        Live Sessions
                      </CardTitle>
                      <CardDescription>Real-time list of currently logged-in students.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={fetchSessions} disabled={refreshingSessions}>
                      <RefreshCw className={`w-4 h-4 ${refreshingSessions ? 'animate-spin' : ''}`} />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <ScrollArea className="h-[500px] pr-4">
                      {activeSessions.length === 0 ? (
                        <div className="text-center py-20 bg-muted/20 rounded-2xl">
                          <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="text-muted-foreground font-bold">No students currently logged in.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeSessions.map((session) => (
                            <div key={session.id} className="p-5 rounded-2xl bg-card border hover:shadow-lg transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-semibold text-primary">
                                  {session.student_name[0]}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-foreground">{session.student_name}</p>
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 uppercase font-semibold bg-primary/5 text-primary border-primary/20">
                                      {session.login_id}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1">
                                      <Smartphone className="w-3 h-3" />
                                      {session.device_info?.split('(')[0].substring(0, 20)}...
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      In: {new Date(session.login_time).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="text-right hidden md:block mr-2">
                                  <p className="text-xs uppercase font-semibold text-muted-foreground">Last Activity</p>
                                  <p className="text-xs font-bold text-primary">{new Date(session.last_activity).toLocaleTimeString()}</p>
                                </div>
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="rounded-xl font-bold bg-warning/10 text-warning hover:bg-amber-200 border-none flex-1 sm:flex-none"
                                  onClick={() => handleForceLogout(session.id)}
                                >
                                  <PowerOff className="w-3.5 h-3.5 mr-2" />
                                  Force Exit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Blocked Accounts Control */}
                <Card className="border shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-semibold text-warning flex items-center gap-3">
                      <Ban className="w-6 h-6" />
                      Access Control
                    </CardTitle>
                    <CardDescription>Manage temporary blocks and unblocks.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <Tabs defaultValue="blocked">
                      <TabsList className="w-full h-10 bg-muted/50 p-1 rounded-xl mb-4">
                        <TabsTrigger value="blocked" className="flex-1 rounded-lg font-bold">Blocked</TabsTrigger>
                        <TabsTrigger value="active" className="flex-1 rounded-lg font-bold">Active Students</TabsTrigger>
                      </TabsList>
                      
                      <ScrollArea className="h-[400px] pr-2">
                        <TabsContent value="blocked" className="mt-0">
                          {allStudents.filter(s => s.is_blocked).length === 0 ? (
                            <p className="text-center py-10 text-xs font-bold text-muted-foreground">No blocked accounts.</p>
                          ) : (
                            <div className="space-y-3">
                              {allStudents.filter(s => s.is_blocked).map((student) => (
                                <div key={student.id} className="p-4 rounded-2xl border bg-warning/10/50 dark:bg-amber-500/5 flex items-center justify-between">
                                  <div>
                                    <p className="font-bold text-sm">{student.name}</p>
                                    <p className="text-xs text-warning font-bold">{student.block_reason || 'No reason provided'}</p>
                                  </div>
                                  <Button size="icon" variant="ghost" className="rounded-full text-warning hover:bg-warning/10" onClick={() => handleUnblockStudent(student.id)}>
                                    <Unlock className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="active" className="mt-0">
                          <div className="space-y-2">
                            {allStudents.filter(s => !s.is_blocked).slice(0, 50).map((student) => (
                              <div key={student.id} className="p-3 rounded-2xl border flex items-center justify-between group hover:bg-muted/30 transition-colors">
                                <p className="text-sm font-medium">{student.name}</p>
                                <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground hover:text-warning opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                  setSelectedStudentForBlock(student);
                                  setIsBlockDialogOpen(true);
                                }}>
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </ScrollArea>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Block Student Dialog */}
              <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <DialogContent className="rounded-2xl p-8">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold text-warning flex items-center gap-3">
                      <Ban className="w-6 h-6" />
                      Block Student Access
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                      Student: <span className="text-foreground font-semibold">{selectedStudentForBlock?.name}</span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Block Reason (Optional)</Label>
                      <Textarea 
                        placeholder="Explain why this student is being blocked..." 
                        className="rounded-2xl border-none bg-muted/30 min-h-[120px] p-4"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" className="rounded-2xl h-12 px-6 font-bold" onClick={() => setIsBlockDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" className="rounded-2xl h-12 px-8 font-semibold shadow-lg shadow-destructive/20" onClick={handleBlockStudent}>
                      Apply Block Now
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="health" className="animate-in fade-in-50 duration-500">
              <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-card/50 backdrop-blur-sm">
                <CardHeader className="p-8 border-b bg-muted/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6" /> Stability & Safety Control Panel
                      </CardTitle>
                      <CardDescription>
                        Maintain system integrity and resolve core security inconsistencies.
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={handleRunRemediation} 
                      disabled={remediating}
                      className="rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-tight"
                    >
                      {remediating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Remediating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Run Consistency Sync
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-warning/10 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 dark:bg-amber-900/20 flex items-center justify-center text-warning dark:text-amber-400">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900 dark:text-amber-100">Orphaned Accounts</h4>
                          <p className="text-xs text-warning dark:text-amber-300 mt-1 leading-relaxed">
                            Logins linked to non-existent or inactive students. Running the sync will permanently remove these orphaned login accounts to maintain system security.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-info/10 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-info/10 dark:bg-blue-900/20 flex items-center justify-center text-info dark:text-blue-400">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-900 dark:text-blue-100">Missing Accounts</h4>
                          <p className="text-xs text-info dark:text-blue-300 mt-1 leading-relaxed">
                            Active students without any login credentials. Running the sync will automatically generate credentials using school-standard default patterns.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 p-4 rounded-2xl bg-muted/30 border border-dashed text-center">
                    <p className="text-xs text-muted-foreground italic">
                      Note: This process is automated and safe. It only targets role-specific "student" profiles. Administrator and Teacher accounts are not affected by this sync.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="modules" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Power className="w-5 h-5 text-primary" />
                    Global Module Visibility
                  </CardTitle>
                  <CardDescription>
                    Temporarily enable or disable major system modules. Disabled modules will be hidden from all users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Loading module configurations...</p>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary/70">Major System Modules</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modules.filter(m => !m.id.endsWith('_download')).map((module) => {
                            const setting = moduleSettings.find(s => s.module_id === module.id && !s.role && !s.user_id);
                            const isEnabled = setting?.is_enabled ?? false;
                            return (
                              <div 
                                key={module.id} 
                                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                                  isEnabled 
                                    ? 'bg-card border-border shadow-sm' 
                                    : 'bg-muted/50 border-muted opacity-80 grayscale-[0.5]'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {isEnabled ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <p className="font-bold">{module.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {isEnabled ? 'Currently visible to all authorized users' : 'Hidden from everyone'}
                                    </p>
                                  </div>
                                </div>
                                <Switch 
                                  checked={isEnabled} 
                                  onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary/70">Student Profile Download Controls</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modules.filter(m => m.id.endsWith('_download')).map((module) => {
                            const setting = moduleSettings.find(s => s.module_id === module.id && !s.role && !s.user_id);
                            const isEnabled = setting?.is_enabled ?? false;
                            return (
                              <div 
                                key={module.id} 
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                                  isEnabled 
                                    ? 'bg-primary/5 border-primary/20 shadow-md' 
                                    : 'bg-muted/50 border-muted opacity-80 grayscale-[0.5]'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl ${isEnabled ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground'}`}>
                                    {module.id === 'certificate_download' ? <FileText className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-lg uppercase tracking-tight">{module.label.replace(' Control', '')}</p>
                                    <p className="text-xs text-muted-foreground font-medium">
                                      {isEnabled ? 'Students CAN download this document' : 'Download button is HIDDEN from students'}
                                    </p>
                                  </div>
                                </div>
                                <Switch 
                                  checked={isEnabled} 
                                  onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                                  className="data-[state=checked]:bg-primary"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {hasAdminManagement && (
          <>
            <TabsContent value="logs" className="space-y-6 animate-in fade-in-50 duration-500">
              <Card className="border-none shadow-xl rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="p-8 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-semibold text-foreground">System Logs & Audit Trails</CardTitle>
                      <CardDescription>Comprehensive history of system-wide events and authentication attempts.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <Tabs defaultValue="verification" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
                      <TabsTrigger value="verification" className="rounded-lg font-bold px-6">Verification</TabsTrigger>
                      <TabsTrigger value="deployment" className="rounded-lg font-bold px-6">Deployment</TabsTrigger>
                      <TabsTrigger value="oauth" className="rounded-lg font-bold px-6">OAuth</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="verification">
                      <ScrollArea className="h-[500px] pr-4">
                        {verificationLogs.length === 0 ? (
                          <div className="text-center py-20 bg-muted/20 rounded-2xl">
                            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground font-bold">No verification logs found.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {verificationLogs.map((log) => (
                              <div key={log.id} className="p-4 rounded-2xl border bg-card flex items-center justify-between group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    log.event_type === 'link_sent' ? 'bg-blue-500/10 text-info' :
                                    log.event_type === 'verified' ? 'bg-green-500/10 text-success' : 'bg-amber-500/10 text-warning'
                                  }`}>
                                    <MailIcon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{log.email}</p>
                                    <p className="text-xs uppercase font-semibold tracking-widest text-muted-foreground mt-0.5">{(log.event_type || 'event').replace('_', ' ')}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-primary">{new Date(log.created_at).toLocaleDateString()}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="deployment">
                      <ScrollArea className="h-[500px] pr-4">
                        {deploymentLogs.length === 0 ? (
                          <div className="text-center py-20 bg-muted/20 rounded-2xl">
                            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground font-bold">No deployment audit logs found.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {deploymentLogs.map((log) => (
                              <div key={log.id} className="p-5 rounded-2xl border bg-card hover:border-primary/30 transition-all border-l-4 border-l-primary">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 font-semibold tracking-tight rounded-lg">
                                      {log.version_label}
                                    </Badge>
                                    <span className="text-xs uppercase font-semibold text-muted-foreground tracking-widest">
                                      {log.status}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground font-bold">
                                    {new Date(log.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed">{log.change_description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="oauth">
                      <ScrollArea className="h-[500px] pr-4">
                        {oauthLogs.length === 0 ? (
                          <div className="text-center py-20 bg-muted/20 rounded-2xl">
                            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground font-bold">No OAuth audit logs found.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {oauthLogs.map((log) => (
                              <div key={log.id} className="p-4 rounded-2xl border bg-card flex items-center justify-between hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                                    <Globe className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{log.email}</p>
                                    <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{log.details}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs font-semibold uppercase">
                                    {log.status}
                                  </Badge>
                                  <div className="text-right min-w-[70px]">
                                    <p className="text-xs font-semibold text-primary">{new Date(log.created_at).toLocaleDateString()}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 animate-in fade-in-50 duration-500">
              <Card className="rounded-2xl border shadow-xl bg-card/50 backdrop-blur-md overflow-hidden border-primary/5">
                <CardHeader className="p-8 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border-2 border-primary/5">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-semibold uppercase tracking-tight text-primary">PIN Management System</CardTitle>
                        <CardDescription className="text-sm font-bold font-medium text-muted-foreground font-semibold opacity-60">Categorized Data Handling & Intelligent Filtering</CardDescription>
                      </div>
                    </div>
                    
                    {/* Global Global Filtering (Rule 2) */}
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Global Search (All Categories)..." 
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                        className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-primary/20 font-bold text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row border-t min-h-[700px]">
                    {/* Folder-Based Structure (Rule 1) */}
                    <div className="w-full lg:w-64 bg-muted/20 border-r border-primary/5 p-4 space-y-2">
                      <p className="px-4 text-xs font-semibold text-muted-foreground/50 mb-4">Storage Folders</p>
                      {[
                        { id: 'student', label: 'Students', icon: GraduationCap },
                        { id: 'teacher', label: 'Teachers', icon: UserCheck },
                        { id: 'parent', label: 'Parents', icon: Users },
                        { id: 'admin', label: 'Admins', icon: ShieldAlert }
                      ].map((folder) => (
                        <Button
                          key={folder.id}
                          variant={activeFolder === folder.id ? 'default' : 'ghost'}
                          onClick={() => { setActiveFolder(folder.id as any); setAdvFilters({}); }}
                          className={cn(
                            "w-full justify-start h-12 rounded-xl font-bold font-medium text-[11px]",
                            activeFolder === folder.id ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5 text-muted-foreground"
                          )}
                        >
                          <folder.icon className="w-4 h-4 mr-3" />
                          {folder.label}
                          {activeFolder === folder.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </Button>
                      ))}
                    </div>

                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Persistent Quick Filters (Rule 3) */}
                      <div className="p-6 bg-muted/10 border-b border-primary/5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground ml-1">
                              {activeFolder === 'student' ? 'Student ID' : activeFolder === 'teacher' ? 'Teacher ID' : activeFolder === 'parent' ? 'Parent ID' : 'Admin ID'}
                            </label>
                            <Input 
                              placeholder="Enter ID..." 
                              value={quickFilters.userId}
                              onChange={(e) => setQuickFilters(prev => ({ ...prev, userId: e.target.value }))}
                              className="h-10 rounded-xl font-bold text-sm border-2" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground ml-1">Full Name</label>
                            <Input 
                              placeholder="Search Name..." 
                              value={quickFilters.name}
                              onChange={(e) => setQuickFilters(prev => ({ ...prev, name: e.target.value }))}
                              className="h-10 rounded-xl font-bold text-sm border-2" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground ml-1">Mobile Number</label>
                            <Input 
                              placeholder="01xxxxxxxxx" 
                              value={quickFilters.phone}
                              onChange={(e) => setQuickFilters(prev => ({ ...prev, phone: e.target.value }))}
                              className="h-10 rounded-xl font-bold text-sm border-2" 
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={applyFilters} className="h-10 flex-1 rounded-xl font-semibold text-xs shadow-md transition-all active:scale-95">
                              Apply Filters
                            </Button>
                            <Button variant="outline" onClick={resetFilters} className="h-10 w-10 p-0 rounded-xl border-2 transition-all active:rotate-180">
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Context-Sensitive Advanced Filters (Rule 3) */}
                        <div className="mt-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsAdvFiltersOpen(!isAdvFiltersOpen)}
                            className="text-xs font-semibold text-primary h-8 hover:bg-primary/5"
                          >
                            <Filter className="w-3.5 h-3.5 mr-2" />
                            Advanced Filter Settings
                            <ChevronDown className={cn("w-3.5 h-3.5 ml-2 transition-transform", isAdvFiltersOpen && "rotate-180")} />
                          </Button>
                          
                          {isAdvFiltersOpen && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-5 rounded-2xl bg-white/40 border-2 border-primary/5 animate-in slide-in-from-top-2 duration-300">
                              {/* Student Contextual Filters */}
                              {activeFolder === 'student' && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Class</label>
                                    <Input 
                                      placeholder="e.g. Ten" 
                                      value={advFilters.class || ''}
                                      onChange={(e) => setAdvFilters(prev => ({ ...prev, class: e.target.value }))}
                                      className="h-9 rounded-lg font-bold text-xs border-2" 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Section</label>
                                    <Input 
                                      placeholder="e.g. A" 
                                      value={advFilters.section || ''}
                                      onChange={(e) => setAdvFilters(prev => ({ ...prev, section: e.target.value }))}
                                      className="h-9 rounded-lg font-bold text-xs border-2" 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Grade Level</label>
                                    <Input 
                                      placeholder="e.g. Higher" 
                                      className="h-9 rounded-lg font-bold text-xs border-2 bg-muted/20" 
                                      disabled 
                                    />
                                  </div>
                                </>
                              )}
                              {/* Teacher Contextual Filters */}
                              {activeFolder === 'teacher' && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Subject</label>
                                    <Input 
                                      placeholder="e.g. Mathematics" 
                                      value={advFilters.subject || ''}
                                      onChange={(e) => setAdvFilters(prev => ({ ...prev, subject: e.target.value }))}
                                      className="h-9 rounded-lg font-bold text-xs border-2" 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Department</label>
                                    <Input 
                                      placeholder="e.g. Science" 
                                      className="h-9 rounded-lg font-bold text-xs border-2 bg-muted/20" 
                                      disabled 
                                    />
                                  </div>
                                </>
                              )}
                              {/* Parent Contextual Filters */}
                              {activeFolder === 'parent' && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Occupation</label>
                                    <Input 
                                      placeholder="e.g. Business" 
                                      value={advFilters.occupation || ''}
                                      onChange={(e) => setAdvFilters(prev => ({ ...prev, occupation: e.target.value }))}
                                      className="h-9 rounded-lg font-bold text-xs border-2" 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Linked Student ID</label>
                                    <Input 
                                      placeholder="e.g. RSBS001" 
                                      className="h-9 rounded-lg font-bold text-xs border-2 bg-muted/20" 
                                      disabled 
                                    />
                                  </div>
                                </>
                              )}
                              {/* Admin Contextual Filters */}
                              {activeFolder === 'admin' && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Role Type</label>
                                    <Input 
                                      placeholder="e.g. Master" 
                                      className="h-9 rounded-lg font-bold text-xs border-2 bg-muted/20" 
                                      disabled 
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Access Level</label>
                                    <Input 
                                      placeholder="e.g. Level 1" 
                                      className="h-9 rounded-lg font-bold text-xs border-2 bg-muted/20" 
                                      disabled 
                                    />
                                  </div>
                                </>
                              )}
                              <div className="md:col-span-full pt-2 flex justify-end">
                                <Button size="sm" onClick={applyFilters} className="text-xs font-semibold px-6 h-8 rounded-lg">
                                  Refine Search
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Folder Content / Results */}
                      <div className="p-6 flex-1 bg-white/50 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-semibold uppercase border-primary/20 text-primary px-2 h-5">
                              {activeFolder} FOLDER
                            </Badge>
                            <span className="text-xs text-muted-foreground font-bold">
                              {getFilteredProfiles().length} records found in this context
                            </span>
                          </div>
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                          <div className="space-y-3">
                            {getFilteredProfiles().map((p) => {
                              const isLocked = p.pin_lockout_until && new Date(p.pin_lockout_until) > new Date();
                              const isSet = !!p.pin;
                              
                              // Contextual Info for display
                              let subInfo = p.email || 'NO EMAIL';
                              let realName = p.username;
                              if (p.role === 'student') {
                                const s = allStudents.find(st => st.id === p.student_id);
                                if (s) {
                                  realName = s.name;
                                  subInfo = `${s.class} - ${s.section}`;
                                }
                              } else if (p.role === 'teacher') {
                                const t = allTeachers.find(th => th.id === p.teacher_id);
                                if (t) {
                                  realName = t.name;
                                  subInfo = t.subject_role;
                                }
                              } else if (p.role === 'parent') {
                                const pr = allParents.find(par => par.id === p.parent_profile_id);
                                if (pr) {
                                  realName = pr.full_name;
                                  subInfo = pr.phone || 'NO PHONE';
                                }
                              }

                              return (
                                <div key={p.id} className="p-4 rounded-2xl bg-white border border-primary/5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-semibold text-primary border-2 border-primary/5 group-hover:scale-105 transition-transform">
                                      {realName?.[0].toUpperCase()}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm tracking-tight text-foreground">{realName}</p>
                                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded uppercase text-muted-foreground">{p.username}</code>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <p className="text-xs text-muted-foreground font-semibold opacity-60 flex items-center gap-1.5">
                                          <User className="w-3 h-3" />
                                          {subInfo}
                                        </p>
                                        <Badge variant={isSet ? "outline" : "secondary"} className="text-xs uppercase font-semibold px-1.5 h-4 border-primary/20 text-primary">
                                          PIN: {isSet ? "SET" : "NOT SET"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-2">
                                    {isLocked && (
                                      <Badge variant="destructive" className="animate-pulse flex items-center gap-1 text-xs uppercase font-semibold px-3 py-1 rounded-lg">
                                        <Clock className="w-3 h-3" />
                                        Locked
                                      </Badge>
                                    )}
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleResetPIN(p.id)}
                                      className="h-9 rounded-xl font-semibold text-xs border-2 border-primary/10 hover:border-primary/30 transition-all hover:bg-primary/5 shadow-sm"
                                    >
                                      <Key className="w-3 h-3 mr-2 text-primary" />
                                      Change PIN
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleClearPIN(p.id)}
                                      className="h-9 rounded-xl font-semibold text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-3 h-3 mr-2" />
                                      Reset PIN
                                    </Button>
                                    {isLocked && (
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => handleRemoveLock(p.id)}
                                        className="h-9 rounded-xl font-semibold text-xs shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                                      >
                                        <Unlock className="w-3 h-3 mr-2" />
                                        Unblock
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {getFilteredProfiles().length === 0 && (
                              <div className="text-center py-20 bg-muted/5 rounded-2xl border-2 border-dashed border-primary/5">
                                <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-sm font-bold text-muted-foreground">No matching records found in this folder.</p>
                                <Button variant="link" onClick={resetFilters} className="text-xs font-semibold text-primary mt-2">Clear All Filters</Button>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 animate-in fade-in-50 duration-500">
              <Card className="border-none shadow-xl rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="p-8 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-semibold text-foreground">Configuration & Settings</CardTitle>
                      <CardDescription>Global system preferences and environment configurations.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="rounded-2xl border shadow-md p-6 bg-background hover:shadow-lg transition-all">
                       <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold uppercase tracking-tight text-lg text-primary">Security Protocols</h4>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                           <div className="space-y-0.5">
                             <p className="text-sm font-bold">Enforce MFA for Admins</p>
                             <p className="text-xs text-muted-foreground font-medium font-medium">Master login only</p>
                           </div>
                           <Switch disabled checked={true} />
                         </div>
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                           <div className="space-y-0.5">
                             <p className="text-sm font-bold">Auto-Session Timeout</p>
                             <p className="text-xs text-muted-foreground font-medium font-medium">30 Minutes Idle</p>
                           </div>
                           <Switch disabled checked={true} />
                         </div>
                      </div>
                    </Card>

                    <Card className="rounded-2xl border shadow-md p-6 bg-background hover:shadow-lg transition-all">
                       <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Activity className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold uppercase tracking-tight text-lg text-primary">Performance & Cache</h4>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                           <div className="space-y-0.5">
                             <p className="text-sm font-bold">Real-time Data Sync</p>
                             <p className="text-xs text-muted-foreground font-medium font-medium">Supabase Replication</p>
                           </div>
                           <Switch disabled checked={true} />
                         </div>
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                           <div className="space-y-0.5">
                             <p className="text-sm font-bold">Edge Function Acceleration</p>
                             <p className="text-xs text-muted-foreground font-medium font-medium">Global Deployments</p>
                           </div>
                           <Switch disabled checked={true} />
                         </div>
                      </div>
                    </Card>
                  </div>

                  <div className="mt-8 p-6 rounded-2xl border border-dashed text-center bg-muted/10">
                    <p className="text-sm font-bold text-muted-foreground">More settings are being migrated from legacy configurations.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

      </Tabs>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Administrator Details</DialogTitle>
            <DialogDescription>
              Detailed view of system operator credentials and permissions.
            </DialogDescription>
          </DialogHeader>
          {viewingAdmin && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20">
                  {viewingAdmin.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {viewingAdmin.prefix && <span>{viewingAdmin.prefix} </span>}
                    {viewingAdmin.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">{viewingAdmin.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">Role Type</span>
                  <div className="flex items-center gap-1.5">
                    {viewingAdmin.is_master ? (
                      <Badge className="bg-primary hover:bg-primary shadow-sm">Master Admin</Badge>
                    ) : (
                      <Badge variant="outline">Standard Admin</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">Login Access</span>
                  <div>
                    {viewingAdmin.login_access_enabled !== false ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">Enabled</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">Disabled</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">Assigned Modules</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingAdmin.permissions?.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs font-bold">
                      {modules.find(m => m.id === p)?.label || p}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground font-bold italic uppercase opacity-60">Created on {new Date(viewingAdmin.created_at).toLocaleString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full">Close View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteAdmin}
        title="Delete Administrator Account"
        recordName={adminToDelete?.username || ''}
      />
    </div>
  );
}
