import { supabase } from './supabase';
import { Student, Attendance, Exam, Notice, GalleryItem, Profile, SchoolInfo, Leadership, StudentQuery, TeacherQuery, Module, ModuleSetting, Appointment, Admission, StudentSession, SocialMediaLink, Teacher, ClassTeacherAssignment, AttendanceConfig, BrandingSettings, Certificate, Subject, TimetableSession, TimetableEntry, Parent, DocumentTemplate, AiSettings, AiStudentConfig, AiClassConfig, AiUsage, AiChatSession, AiChatMessage, EarlyLeave, ApiKey, ApiEndpoint, ApiLog, ModuleApi, ApiConfig, Chatbot, MasterFee, ExtraFee, FeePayment, FeeReceipt, Quiz, Question, QuestionOption, QuizAssignment, QuizAttempt, AttemptAnswer, QuizAiInteraction, QuizPlayerData, QuizResultReview, QuizAnalytics, QuestionWiseAnalytics, StudentPanelSetting, StudentPanelNotification, StudentPanelHelpSupport, StudentPanelPrivacyPolicy } from '@/types';

// Columns that belong to the actual quizzes table. Joined/computed fields
// (e.g. subjects, subject_name, question_count) must never be sent back in
// INSERT/UPDATE because PostgREST will reject unknown columns.
const QUIZ_TABLE_COLUMNS = new Set([
  'id', 'school_id', 'title', 'description', 'subject_id', 'chapter', 'topic',
  'category', 'academic_session', 'difficulty', 'cover_url', 'icon', 'status',
  'answer_mode', 'timer_seconds', 'passing_percentage', 'max_attempts',
  'negative_marks', 'marks_per_question', 'random_questions', 'random_options',
  'allow_navigation', 'show_explanations', 'allow_retry', 'show_result_review',
  'study_ai_enabled', 'show_leaderboard', 'number_of_questions', 'start_at', 'end_at',
  'appearance', 'settings', 'created_by', 'created_at', 'updated_at',
]);

function sanitizeQuizPayload(quiz: Partial<Quiz>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(quiz)) {
    if (QUIZ_TABLE_COLUMNS.has(key)) {
      payload[key] = value;
    }
  }
  // Remove empty id/created_at placeholders so the database can use its defaults.
  if (payload.id === '') delete payload.id;
  if (payload.created_at === '') delete payload.created_at;
  return payload;
}

export const api = {
  // Timetable
  async getSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    return { data: (data || []) as Subject[], error };
  },

  async createSubject(subject: Omit<Subject, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('subjects')
      .insert(subject)
      .select()
      .maybeSingle();
    return { data: data as Subject | null, error };
  },

  async updateSubject(id: string, updates: Partial<Subject>) {
    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Subject | null, error };
  },

  async deleteSubject(id: string) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getTimetableSessions() {
    const { data, error } = await supabase
      .from('timetable_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data || []) as TimetableSession[], error };
  },

  async getActiveTimetableSession() {
    const { data, error } = await supabase
      .from('timetable_sessions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    return { data: data as TimetableSession | null, error };
  },

  async createTimetableSession(session: Omit<TimetableSession, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('timetable_sessions')
      .insert(session)
      .select()
      .maybeSingle();
    return { data: data as TimetableSession | null, error };
  },

  async updateTimetableSession(id: string, updates: Partial<TimetableSession>) {
    const { data, error } = await supabase
      .from('timetable_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as TimetableSession | null, error };
  },

  async deleteTimetableSession(id: string) {
    const { error } = await supabase
      .from('timetable_sessions')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getTimetableEntries(sessionId: string, classId?: string, sectionId?: string, teacherId?: string) {
    let query = supabase
      .from('timetable_entries')
      .select('*, subjects(name), teachers(name), classes(name), sections(name)')
      .eq('session_id', sessionId);
    
    if (classId) query = query.eq('class_id', classId);
    if (sectionId) query = query.eq('section_id', sectionId);
    if (teacherId) query = query.eq('teacher_id', teacherId);

    const { data, error } = await query;
    
    const transformed = (data || []).map((entry: any) => ({
      ...entry,
      subject_name: entry.subjects?.name,
      teacher_name: entry.teachers?.name,
      class_name: entry.classes?.name,
      section_name: entry.sections?.name
    }));

    return { data: transformed as TimetableEntry[], error };
  },

  async createTimetableEntry(entry: Omit<TimetableEntry, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('timetable_entries')
      .insert(entry)
      .select()
      .maybeSingle();
    return { data: data as TimetableEntry | null, error };
  },

  async updateTimetableEntry(id: string, updates: Partial<TimetableEntry>) {
    const { data, error } = await supabase
      .from('timetable_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as TimetableEntry | null, error };
  },

  async deleteTimetableEntry(id: string) {
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', id);
    return { error };
  },

  async bulkCopyTimetable(fromClassId: string, fromSectionId: string, toClassId: string, toSectionId: string, sessionId: string) {
    const { data: entries, error: fetchError } = await this.getTimetableEntries(sessionId, fromClassId, fromSectionId);
    if (fetchError) return { error: fetchError };

    const newEntries = entries.map(({ id, created_at, class_id, section_id, ...rest }) => ({
      ...rest,
      class_id: toClassId,
      section_id: toSectionId,
      session_id: sessionId
    }));

    const { data, error } = await supabase
      .from('timetable_entries')
      .upsert(newEntries, { onConflict: 'session_id,class_id,section_id,day_of_week,period_number' })
      .select();

    return { data, error };
  },

  async updateProfile(id: string, updates: Partial<Profile>) {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.trim().toLowerCase();
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async updateProfileByEntityId(entityType: 'student' | 'teacher' | 'parent', entityId: string, updates: Partial<Profile>) {
    const column = entityType === 'student' ? 'student_id' : entityType === 'teacher' ? 'teacher_id' : 'parent_profile_id';
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq(column, entityId)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async getProfileByEntityId(entityType: 'student' | 'teacher' | 'parent', entityId: string) {
    const column = entityType === 'student' ? 'student_id' : entityType === 'teacher' ? 'teacher_id' : 'parent_profile_id';
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq(column, entityId)
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async getProfileByUsername(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async getProfileByEmail(email: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async updateGlobalModuleSetting(moduleId: string, updates: { is_enabled?: boolean, state?: 'enabled' | 'disabled' | 'deactivated' }) {
    const { data, error } = await supabase
      .from('module_settings')
      .update(updates)
      .eq('module_id', moduleId)
      .is('role', null)
      .is('user_id', null)
      .select()
      .maybeSingle();
    return { data: data as ModuleSetting | null, error };
  },

  async getGlobalModuleSetting(moduleId: string) {
    const { data, error } = await supabase
      .from('module_settings')
      .select('*')
      .eq('module_id', moduleId)
      .is('role', null)
      .is('user_id', null)
      .maybeSingle();
    return { data: data as ModuleSetting | null, error };
  },

  async getAdminProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('username');
    return { data: (data || []) as Profile[], error };
  },

  async getAllNonAdminProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('username');
    return { data: (data || []) as Profile[], error };
  },

  // Teachers
  async getTeachers() {
    const { data, error } = await supabase
      .from('teachers')
      .select('*, class_teachers(*, classes(name), sections(name))')
      .order('name');
    
    // Transform to include helpful join data
    const transformed = (data || []).map((t: any) => ({
      ...t,
      class_assignments: t.class_teachers.map((ct: any) => ({
        ...ct,
        class_name: ct.classes?.name,
        section_name: ct.sections?.name
      }))
    }));

    return { data: transformed as Teacher[], error };
  },

  generateVerificationId() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'RSBS0';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  async createTeacher(teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at' | 'verification_id'>) {
    const normalizedTeacher = { 
      ...teacher, 
      email: teacher.email.trim().toLowerCase(),
      verification_id: this.generateVerificationId()
    };
    const { data, error } = await supabase
      .from('teachers')
      .insert(normalizedTeacher)
      .select()
      .maybeSingle();
    return { data: data as Teacher | null, error };
  },

  async updateTeacher(id: string, updates: Partial<Teacher>) {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.trim().toLowerCase();
    }
    const { data, error } = await supabase
      .from('teachers')
      .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Teacher | null, error };
  },

  async deleteTeacher(id: string) {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);
    return { error };
  },

  async assignTeacherToClass(assignment: Omit<ClassTeacherAssignment, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('class_teachers')
      .upsert(assignment, { onConflict: 'class_id,section_id' })
      .select()
      .maybeSingle();
    return { data, error };
  },

  async removeTeacherAssignment(id: string) {
    const { error } = await supabase
      .from('class_teachers')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Parents
  async getParents() {
    const { data, error } = await supabase
      .from('parents')
      .select(`
        *,
        parent_student_links(
          relationship,
          student:students(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    // Transform to include nested student data properly
    const formattedData = (data || []).map((parent: any) => ({
      ...parent,
      linked_students: parent.parent_student_links?.map((link: any) => ({
        ...link.student,
        relationship: link.relationship
      }))
    }));

    return { data: formattedData as Parent[], error };
  },

  async getParentById(id: string) {
    const { data, error } = await supabase
      .from('parents')
      .select(`
        *,
        parent_student_links(
          relationship,
          student:students(*)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (data) {
      (data as any).linked_students = (data as any).parent_student_links?.map((link: any) => ({
        ...link.student,
        relationship: link.relationship
      }));
    }

    return { data: data as Parent | null, error };
  },

  async createParent(parent: Omit<Parent, 'id' | 'created_at' | 'updated_at' | 'linked_students' | 'parent_id'> & { parent_id?: string }) {
    // 1. Pre-Insertion ID Generation (Requirement 1 & 3)
    let finalParentId = parent.parent_id;
    if (!finalParentId || finalParentId.startsWith('PENDING') || finalParentId.startsWith('TEMP')) {
      const { data: lastRecord, error: fetchError } = await supabase
        .from('parents')
        .select('parent_id')
        .ilike('parent_id', 'RSBSP%')
        .order('parent_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw new Error(`Failed to generate Parent Login ID: ${fetchError.message}`);

      let nextNumber = 1;
      if (lastRecord?.parent_id) {
        const match = lastRecord.parent_id.match(/RSBSP(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      if (nextNumber > 9999) {
        throw new Error('Parent Login ID sequence exhausted (maximum 9999 reached).');
      }

      finalParentId = `RSBSP${nextNumber.toString().padStart(4, '0')}`;
    }

    // 2. Pre-Save Validation (Requirement 4)
    if (!finalParentId) {
      throw new Error('Parent Login ID is required.');
    }

    if (!/^RSBSP\d{4}$/.test(finalParentId)) {
      throw new Error(`Invalid Parent Login ID format: ${finalParentId}. Must be RSBSP followed by 4 digits.`);
    }

    // Final Uniqueness Check (Requirement 3.Uniqueness Guarantee)
    const { data: existingId } = await supabase
      .from('parents')
      .select('id')
      .eq('parent_id', finalParentId)
      .maybeSingle();

    if (existingId) {
      throw new Error(`Parent Login ID ${finalParentId} already exists. Please try again.`);
    }

    const normalizedParent = { 
      ...parent,
      parent_id: finalParentId,
      email: parent.email.trim().toLowerCase() 
    };

    const { data, error } = await supabase
      .from('parents')
      .insert(normalizedParent)
      .select()
      .maybeSingle();

    return { data: data as Parent | null, error };
  },

  async updateParent(id: string, updates: Partial<Parent>) {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.trim().toLowerCase();
    }
    const { data, error } = await supabase
      .from('parents')
      .update({ ...normalizedUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Parent | null, error };
  },

  async deleteParent(id: string) {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', id);
    return { error };
  },

  async linkParentToStudent(parentId: string, studentId: string, relationship: string) {
    const { data, error } = await supabase
      .from('parent_student_links')
      .insert({ parent_id: parentId, student_id: studentId, relationship })
      .select()
      .maybeSingle();
    return { data, error };
  },

  async unlinkParentFromStudent(parentId: string, studentId: string) {
    await supabase
      .from('parent_student_links')
      .delete()
      .eq('parent_id', parentId)
      .eq('student_id', studentId);
    return { error: null as any };
  },

  async getTeacherAssignments(teacherId: string) {
    const { data, error } = await supabase
      .from('class_teachers')
      .select('*, classes(name), sections(name)')
      .eq('teacher_id', teacherId);
    
    const transformed = (data || []).map((ct: any) => ({
      ...ct,
      class_name: ct.classes?.name,
      section_name: ct.sections?.name
    }));

    return { data: transformed as ClassTeacherAssignment[], error };
  },

  async getClassTeacherAssignments() {
    const { data, error } = await supabase
      .from('class_teachers')
      .select('*, classes(name), sections(name)');
    
    const transformed = (data || []).map((ct: any) => ({
      ...ct,
      class_name: ct.classes?.name,
      section_name: ct.sections?.name
    }));

    return { data: transformed as ClassTeacherAssignment[], error };
  },

  async deleteUser(username: string) {
    // Resolve the auth UUID from the profiles table first so the edge function
    // never needs to call auth.admin.listUsers() (which causes "Database error loading user").
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (profileError) return { data: null, error: profileError };

    // If profile not found, treat as already deleted — no auth record to remove.
    if (!profileData?.id) {
      return { data: { message: 'User not found, nothing to delete' }, error: null };
    }

    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: profileData.id },
    });
    return { data, error };
  },

  // Students
  async getStudents() {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        parent_student_links(
          relationship,
          parent:parents(*)
        )
      `)
      .order('name');
    
    // Transform to include linked parents
    const formatted = (data || []).map((student: any) => ({
      ...student,
      linked_parents: student.parent_student_links?.map((link: any) => ({
        ...link.parent,
        relationship: link.relationship
      }))
    }));

    return { data: formatted as Student[], error };
  },

  async getStudentByLoginId(id: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(`login_id.eq."${id}",verification_id.eq."${id}"`)
      .maybeSingle();
    return { data: data as Student | null, error };
  },

  async getStudentById(id: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: data as Student | null, error };
  },

  async passOutStudents(studentIds: string[]) {
    const { data, error } = await supabase.functions.invoke('passout-students', {
      body: { studentIds }
    });
    return { data, error };
  },

  async createStudent(student: Omit<Student, 'id' | 'created_at' | 'verification_id'>) {
    const normalizedStudent = { 
      ...student, 
      email: student.email.trim().toLowerCase(),
      verification_id: this.generateVerificationId()
    };
    const { data, error } = await supabase
      .from('students')
      .insert(normalizedStudent)
      .select()
      .maybeSingle();
    return { data: data as Student | null, error };
  },

  async updateStudent(id: string, updates: Partial<Student>) {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.trim().toLowerCase();
    }
    const { data, error } = await supabase
      .from('students')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Student | null, error };
  },

  async updateStudentVisibility(id: string, updates: { certificate_visible?: boolean, id_card_visible?: boolean }) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data, error };
  },

  async deleteStudent(id: string) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    return { error };
  },

  async checkLoginIdExists(loginId: string, excludeProfileId?: string) {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', loginId);
    
    if (excludeProfileId) {
      query = query.neq('id', excludeProfileId);
    }
    
    const { data } = await query.maybeSingle();
    return !!data;
  },

  validateLoginIdFormat(loginId: string, type: 'student' | 'teacher' | 'admin'): boolean {
    if (type === 'student') {
      return /^RSBS\d+$/.test(loginId);
    } else if (type === 'teacher') {
      return /^RSBST\d+$/.test(loginId);
    }
    return true; // Admin doesn't have a fixed prefix
  },

  // Attendance
  async getAttendance(studentId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('attendance')
      .select('*, students(name)')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    return { data: (data || []) as (Attendance & { students: { name: string } })[], error };
  },

  async markAttendance(studentId: string, date: string, status: string, classId?: string, sectionId?: string, markedBy?: string) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert({ student_id: studentId, date, status, class_id: classId, section_id: sectionId, marked_by: markedBy })
      .select()
      .maybeSingle();
    return { data: data as Attendance | null, error };
  },

  async getAttendanceByClassAndDate(classId: string, sectionId: string, date: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, students(name)')
      .eq('class_id', classId)
      .eq('section_id', sectionId)
      .eq('date', date);
    return { data: (data || []) as (Attendance & { students: { name: string } })[], error };
  },

  async markBulkAttendance(attendanceEntries: Omit<Attendance, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendanceEntries, { onConflict: 'student_id,date' })
      .select();
    return { data: (data || []) as Attendance[], error };
  },

  async getAttendanceHistory(filters: { 
    classId?: string; 
    sectionId?: string; 
    studentId?: string; 
    startDate?: string; 
    endDate?: string; 
  }) {
    let query = supabase
      .from('attendance')
      .select('*, students(name, class, section)')
      .order('date', { ascending: false });

    if (filters.classId) query = query.eq('class_id', filters.classId);
    if (filters.sectionId) query = query.eq('section_id', filters.sectionId);
    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query;
    return { data: (data || []) as any[], error };
  },

  // Early Leaves
  async getEarlyLeavesByDate(date: string) {
    const { data, error } = await supabase
      .from('early_leaves')
      .select('*, students(name, class, section)')
      .eq('date', date);
    return { data: (data || []) as (EarlyLeave & { students: { name: string, class: string, section: string } })[], error };
  },

  async createEarlyLeave(entry: Omit<EarlyLeave, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('early_leaves')
      .insert(entry)
      .select()
      .maybeSingle();
    return { data: data as EarlyLeave | null, error };
  },

  async updateEarlyLeave(id: string, updates: Partial<EarlyLeave>) {
    const { data, error } = await supabase
      .from('early_leaves')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as EarlyLeave | null, error };
  },

  async deleteEarlyLeave(id: string) {
    const { error } = await supabase
      .from('early_leaves')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getEarlyLeavesHistory(filters: { 
    classId?: string; 
    sectionId?: string; 
    studentId?: string; 
    startDate?: string; 
    endDate?: string; 
  }) {
    let query = supabase
      .from('early_leaves')
      .select('*, students(name, class, section, class_id, section_id)')
      .order('date', { ascending: false });

    if (filters.classId) query = query.eq('students.class_id', filters.classId);
    if (filters.sectionId) query = query.eq('students.section_id', filters.sectionId);
    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query;
    return { data: (data || []) as any[], error };
  },



  // Exams
  async getExams() {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('date', { ascending: true });
    return { data: (data || []) as Exam[], error };
  },

  async createExam(exam: Omit<Exam, 'id'>) {
    const { data, error } = await supabase
      .from('exams')
      .insert(exam)
      .select()
      .maybeSingle();
    return { data: data as Exam | null, error };
  },

  async deleteExam(id: string) {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Notices
  async getNotices() {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data || []) as Notice[], error };
  },

  async getPublicNotices() {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('target_type', 'all')
      .order('created_at', { ascending: false });
    return { data: (data || []) as Notice[], error };
  },

  // Classes & Sections
  async getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*, sections(*)')
      .order('name');
    return { data: (data || []) as any[], error };
  },

  async createClass(name: string) {
    const { data, error } = await supabase
      .from('classes')
      .insert({ name })
      .select()
      .maybeSingle();
    return { data, error };
  },

  async updateClass(id: string, name: string) {
    const { data, error } = await supabase
      .from('classes')
      .update({ name })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data, error };
  },

  async deleteClass(id: string) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);
    return { error };
  },

  async createSection(class_id: string, name: string) {
    const { data, error } = await supabase
      .from('sections')
      .insert({ class_id, name })
      .select()
      .maybeSingle();
    return { data, error };
  },

  async updateSection(id: string, name: string) {
    const { data, error } = await supabase
      .from('sections')
      .update({ name })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data, error };
  },

  async deleteSection(id: string) {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);
    return { error };
  },

  async bulkPromote(studentIds: string[], class_id: string, section_id: string, className: string, sectionName: string) {
    const { error } = await supabase
      .from('students')
      .update({ class_id, section_id, class: className, section: sectionName })
      .in('id', studentIds);
    return { error };
  },

  async createNotice(notice: any) {
    const { data, error } = await supabase
      .from('notices')
      .insert(notice)
      .select()
      .maybeSingle();
    return { data: data as Notice | null, error };
  },

  async deleteNotice(id: string) {
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Gallery
  async getGallery() {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('event_date', { ascending: false });
    return { data: (data || []) as GalleryItem[], error };
  },

  async createGalleryItem(item: Omit<GalleryItem, 'id'>) {
    const { data, error } = await supabase
      .from('gallery')
      .insert(item)
      .select()
      .maybeSingle();
    return { data: data as GalleryItem | null, error };
  },

  async deleteGalleryItem(id: string) {
    const { error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id);
    return { error };
  },

  // School Info
  async getSchoolInfo() {
    const { data, error } = await supabase
      .from('school_info')
      .select('*')
      .eq('is_visible', true)
      .order('order_index', { ascending: true });
    return { data: (data || []) as SchoolInfo[], error };
  },

  async getAllSchoolInfo() {
    const { data, error } = await supabase
      .from('school_info')
      .select('*')
      .order('order_index', { ascending: true });
    return { data: (data || []) as SchoolInfo[], error };
  },

  async updateSchoolInfo(id: string, updates: Partial<SchoolInfo>) {
    const { data, error } = await supabase
      .from('school_info')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as SchoolInfo | null, error };
  },

  // Leadership & Legacy
  async getLeadership() {
    const { data, error } = await supabase
      .from('leadership')
      .select('*')
      .order('order_index', { ascending: true });
    return { data: (data || []) as Leadership[], error };
  },

  async createLeadership(item: Omit<Leadership, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('leadership')
      .insert(item)
      .select()
      .maybeSingle();
    return { data: data as Leadership | null, error };
  },

  async updateLeadership(id: string, updates: Partial<Leadership>) {
    const { data, error } = await supabase
      .from('leadership')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Leadership | null, error };
  },

  async deleteLeadership(id: string) {
    const { error } = await supabase
      .from('leadership')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Admin Management
  async createAdminAccount(username: string, password: string, is_admin: boolean = true) {
    const { data, error } = await supabase.functions.invoke('create-admin', {
      body: { username, password, is_admin }
    });
    return { data, error };
  },

  async resendVerificationLink(userId: string) {
    const { data, error } = await supabase.functions.invoke('resend-verification-link', {
      body: { userId }
    });
    return { data, error };
  },

  async resendVerificationByEmail(email: string) {
    const { data, error } = await supabase.functions.invoke('resend-verification-by-email', {
      body: { email }
    });
    return { data, error };
  },

  async verifyAdminToken(token: string) {
    const { data, error } = await supabase.functions.invoke('verify-admin-token', {
      body: { token }
    });
    return { data, error };
  },

  async updateAdminProfile(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  // Student Targeted Content
  async getStudentNotices(student: Student) {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .or(`target_type.eq.all,and(target_type.eq.class,target_id.eq.${student.class_id}),and(target_type.eq.section,target_id.eq.${student.section_id}),and(target_type.eq.student,target_id.eq.${student.id})`)
      .order('created_at', { ascending: false });
    return { data: (data || []) as Notice[], error };
  },

  // Branding Settings
  async getBrandingSettings() {
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    return { data: data as BrandingSettings | null, error };
  },

  async updateBrandingSettings(id: string, updates: Partial<BrandingSettings>) {
    const { data, error } = await supabase
      .from('branding_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as BrandingSettings | null, error };
  },

  // Certificates
  async getCertificates(type?: 'certificate' | 'id_card') {
    let query = supabase.from('certificates').select('*');
    if (type) query = query.eq('document_type', type);
    const { data, error } = await query;
    return { data: (data || []) as Certificate[], error };
  },

  async getCertificateByStudent(studentId: string, type: 'certificate' | 'id_card' = 'certificate') {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .eq('document_type', type)
      .maybeSingle();
    return { data: data as Certificate | null, error };
  },

  async generateCertificate(studentId: string, type: 'certificate' | 'id_card' = 'certificate') {
    const { data, error } = await supabase.functions.invoke('generate-certificate', {
      body: { studentId, type }
    });
    return { data, error };
  },


  async getStudentExams(student: Student) {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .or(`target_type.eq.all,and(target_type.eq.class,target_id.eq.${student.class_id}),and(target_type.eq.section,target_id.eq.${student.section_id}),and(target_type.eq.student,target_id.eq.${student.id})`)
      .order('date', { ascending: true });
    return { data: (data || []) as Exam[], error };
  },


  /**
   * Public student verification - ONLY use verification_id for security.
   * Search by login_id is strictly prohibited in this context to separate public identifiers from private login credentials.
   * We only select necessary public fields to avoid leaking private data.
   */
  async verifyStudent(id: string) {
    const { data, error } = await supabase
      .from('public_student_verification' as any)
      .select('name, verification_id, session_info, class, section, profile_picture_url, status, school_name, school_logo_url')
      .eq('verification_id', id)
      .maybeSingle();
    return { data, error };
  },

  // Student Queries
  async getQueries(studentId?: string, targetTeacherId?: string, status?: 'pending' | 'replied') {
    let query = supabase.from('student_queries').select('*').order('created_at', { ascending: false });
    if (studentId) {
      // For student: visible if public OR their own
      query = query.or(`is_public.eq.true,student_id.eq.${studentId}`);
    } else if (targetTeacherId) {
      // For teacher: visible if targeted to them
      query = query.eq('target_teacher_id', targetTeacherId);
    }
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    return { data: (data || []) as StudentQuery[], error };
  },

  async createQuery(studentId: string, studentName: string, content: string, is_public: boolean, target_type: 'admin' | 'teacher' = 'admin', target_teacher_id?: string) {
    const { data, error } = await supabase
      .from('student_queries')
      .insert({ student_id: studentId, student_name: studentName, content, is_public, target_type, target_teacher_id })
      .select()
      .maybeSingle();
    return { data: data as StudentQuery | null, error };
  },

  async replyToQuery(id: string, replyContent: string, is_public?: boolean) {
    const updates: any = {
      reply_content: replyContent,
      replied_at: new Date().toISOString(),
      status: 'replied',
    };
    if (is_public !== undefined) updates.is_public = is_public;
    
    const { data, error } = await supabase
      .from('student_queries')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as StudentQuery | null, error };
  },

  async togglePinQuery(id: string, isPinned: boolean) {
    const { data, error } = await supabase
      .from('student_queries')
      .update({ is_pinned: isPinned })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as StudentQuery | null, error };
  },

  async deleteQuery(id: string) {
    const { error } = await supabase
      .from('student_queries')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Teacher Queries
  async getTeacherQueries(teacherId?: string) {
    let query = supabase.from('teacher_queries').select('*').order('created_at', { ascending: false });
    if (teacherId) {
      query = query.or(`is_public.eq.true,teacher_id.eq.${teacherId}`);
    }
    const { data, error } = await query;
    return { data: (data || []) as TeacherQuery[], error };
  },

  async createTeacherQuery(teacherId: string, teacherName: string, content: string, is_public: boolean) {
    const { data, error } = await supabase
      .from('teacher_queries')
      .insert({ teacher_id: teacherId, teacher_name: teacherName, content, is_public })
      .select()
      .maybeSingle();
    return { data: data as TeacherQuery | null, error };
  },

  async replyToTeacherQuery(id: string, reply_content: string) {
    const { data, error } = await supabase
      .from('teacher_queries')
      .update({
        status: 'replied',
        reply_content,
        replied_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as TeacherQuery | null, error };
  },

  // Module Settings
  async getModules() {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('label');
    return { data: (data || []) as Module[], error };
  },

  async getModuleSettings() {
    const { data, error } = await supabase
      .from('module_settings')
      .select('*')
      .order('module_id');
    return { data: (data || []) as ModuleSetting[], error };
  },

  // AI Management
  async getAiSettings() {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    return { data: data as AiSettings | null, error };
  },

  async updateAiSettings(id: string, updates: Partial<AiSettings>) {
    const { data, error } = await supabase
      .from('ai_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as AiSettings | null, error };
  },

  async getAiStudentConfigs() {
    const { data, error } = await supabase
      .from('ai_student_configs')
      .select('*, students(name, class, section)')
      .order('updated_at', { ascending: false });
    
    const transformed = (data || []).map((c: any) => ({
      ...c,
      student_name: c.students?.name,
      class_name: c.students?.class,
      section_name: c.students?.section
    }));

    return { data: transformed as AiStudentConfig[], error };
  },

  async upsertAiStudentConfig(config: any) {
    const { data, error } = await supabase
      .from('ai_student_configs')
      .upsert(config, { onConflict: 'student_id' })
      .select()
      .maybeSingle();
    return { data, error };
  },

  async getAiClassConfigs() {
    const { data, error } = await supabase
      .from('ai_class_configs')
      .select('*, classes(name)')
      .order('updated_at', { ascending: false });
    
    const transformed = (data || []).map((c: any) => ({
      ...c,
      class_name: c.classes?.name
    }));

    return { data: transformed as AiClassConfig[], error };
  },

  async upsertAiClassConfig(config: any) {
    const { data, error } = await supabase
      .from('ai_class_configs')
      .upsert(config, { onConflict: 'class_id' })
      .select()
      .maybeSingle();
    return { data, error };
  },

  async getAiUsage(studentId?: string, date?: string) {
    let query = supabase
      .from('ai_usage')
      .select('*, students(name)');
    
    if (studentId) query = query.eq('student_id', studentId);
    if (date) query = query.eq('usage_date', date);

    const { data, error } = await query.order('usage_date', { ascending: false });
    
    const transformed = (data || []).map((u: any) => ({
      ...u,
      student_name: u.students?.name
    }));

    return { data: transformed as AiUsage[], error };
  },

  async incrementAiUsage(studentId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('increment_ai_usage', { 
      p_student_id: studentId,
      p_date: today
    });
    return { data, error };
  },

  async getAiConfigForStudent(studentId: string, classId: string) {
    const { data: globalSettings } = await this.getAiSettings();
    const { data: studentConfig } = await supabase
      .from('ai_student_configs')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();
    
    const { data: classConfig } = await supabase
      .from('ai_class_configs')
      .select('*')
      .eq('class_id', classId)
      .maybeSingle();

    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('student_id', studentId)
      .eq('usage_date', today)
      .maybeSingle();

    return {
      globalSettings,
      usage
    };
  },

  // AI Chat Sessions
  async getAiChatSessions(studentId: string) {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false });
    return { data: (data || []) as AiChatSession[], error };
  },

  async createAiChatSession(studentId: string, title: string = 'New Chat') {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({ student_id: studentId, title })
      .select()
      .maybeSingle();
    return { data: data as AiChatSession | null, error };
  },

  async updateAiChatSession(id: string, updates: Partial<AiChatSession>) {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as AiChatSession | null, error };
  },

  async deleteAiChatSession(id: string) {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getAiChatMessages(sessionId: string) {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return { data: (data || []) as AiChatMessage[], error };
  },

  async addAiChatMessage(message: Omit<AiChatMessage, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert(message)
      .select()
      .maybeSingle();

    // Trigger session updated_at refresh
    if (!error && message.session_id) {
      await this.updateAiChatSession(message.session_id, { updated_at: new Date().toISOString() });
    }

    return { data: data as AiChatMessage | null, error };
  },

  async updateAiChatMessage(id: string, updates: Partial<AiChatMessage>) {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as AiChatMessage | null, error };
  },

  async deleteAiChatMessage(id: string) {
    const { error } = await supabase
      .from('ai_chat_messages')
      .delete()
      .eq('id', id);
    return { error };
  },

  async isGlobalModuleEnabled(moduleId: string) {
    const { data, error } = await supabase
      .from('module_settings')
      .select('is_enabled')
      .eq('module_id', moduleId)
      .is('role', null)
      .is('user_id', null)
      .maybeSingle();
    
    if (error || !data) return false;
    return data.is_enabled;
  },

  async togglePinTeacherQuery(id: string, isPinned: boolean) {
    const { data, error } = await supabase
      .from('teacher_queries')
      .update({ is_pinned: isPinned })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as TeacherQuery | null, error };
  },

  async deleteTeacherQuery(id: string) {
    const { error } = await supabase
      .from('teacher_queries')
      .delete()
      .eq('id', id);
    return { error };
  },

  async updateModuleSetting(id: string, isEnabled: boolean, state: string = 'enabled', role?: string, userId?: string) {
    const { data, error } = await supabase
      .from('module_settings')
      .update({ is_enabled: isEnabled, state, role, user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as ModuleSetting | null, error };
  },

  async upsertModuleSetting(moduleId: string, isEnabled: boolean) {
    const { data: existing } = await supabase
      .from('module_settings')
      .select('id')
      .eq('module_id', moduleId)
      .is('role', null)
      .is('user_id', null)
      .maybeSingle();

    if (existing) {
      return this.updateModuleSetting(existing.id, isEnabled);
    } else {
      const { data, error } = await supabase
        .from('module_settings')
        .insert({
          module_id: moduleId,
          is_enabled: isEnabled,
          state: 'enabled'
        })
        .select()
        .maybeSingle();
      return { data: data as ModuleSetting | null, error };
    }
  },

  // Student Sessions
  async createStudentSession(session: Omit<StudentSession, 'id' | 'created_at' | 'login_time' | 'last_activity' | 'status'>) {
    const { data, error } = await supabase
      .from('student_sessions')
      .insert(session)
      .select()
      .maybeSingle();
    return { data: data as StudentSession | null, error };
  },

  async updateStudentSessionActivity(id: string) {
    const { error } = await supabase
      .from('student_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', id);
    return { error };
  },

  async getActiveSessions() {
    const { data, error } = await supabase
      .from('student_sessions')
      .select('*')
      .eq('status', 'active')
      .order('login_time', { ascending: false });
    return { data: (data || []) as StudentSession[], error };
  },

  // Document Templates
  async getDocumentTemplates() {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data as DocumentTemplate[] | null, error };
  },

  async getDocumentTemplateById(id: string) {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: data as DocumentTemplate | null, error };
  },

  async createDocumentTemplate(template: Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('document_templates')
      .insert(template)
      .select()
      .maybeSingle();
    return { data: data as DocumentTemplate | null, error };
  },

  async updateDocumentTemplate(id: string, template: Partial<Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('document_templates')
      .update({ ...template, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as DocumentTemplate | null, error };
  },

  /** Check if a template name already exists (excluding a known id for edit flows) */
  async checkDocumentTemplateName(name: string, excludeId?: string) {
    let query = supabase
      .from('document_templates')
      .select('id, name')
      .eq('name', name);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    return { exists: (data?.length ?? 0) > 0, data, error };
  },

  async deleteDocumentTemplate(id: string) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);
    return { error };
  },

  // API Configurations
  async getApiConfigs() {
    const { data, error } = await supabase
      .from('api_configs')
      .select('*')
      .order('created_at', { ascending: false });
    
    const transformed = (data || []).map((config: any) => ({
      ...config,
      responseField: config.response_field,
      apiKey: config.api_key
    }));

    return { data: transformed as ApiConfig[], error };
  },

  async createApiConfig(config: Omit<ApiConfig, 'id' | 'created_at' | 'last_applied' | 'is_active'>) {
    const { data, error } = await supabase
      .from('api_configs')
      .insert({
        name: config.name,
        endpoint: config.endpoint,
        method: config.method,
        headers: config.headers,
        variables: config.variables,
        bodies: config.bodies,
        response_field: config.responseField,
        auth_type: config.auth_type,
        api_key: config.apiKey,
        is_active: false
      })
      .select()
      .maybeSingle();
    
    const transformed = data ? {
      ...data,
      responseField: data.response_field,
      apiKey: data.api_key
    } : null;

    return { data: transformed as ApiConfig | null, error };
  },

  async updateApiConfig(id: string, updates: Partial<ApiConfig>) {
    const dbUpdates: any = { ...updates };
    if ('responseField' in updates) {
      dbUpdates.response_field = updates.responseField;
      delete dbUpdates.responseField;
    }
    if ('apiKey' in updates) {
      dbUpdates.api_key = updates.apiKey;
      delete dbUpdates.apiKey;
    }

    const { data, error } = await supabase
      .from('api_configs')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    const transformed = data ? {
      ...data,
      responseField: data.response_field,
      apiKey: data.api_key
    } : null;

    return { data: transformed as ApiConfig | null, error };
  },

  async deleteApiConfig(id: string) {
    const { error } = await supabase
      .from('api_configs')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Chatbots (Module Connections)
  async getChatbots() {
    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .order('id');
    return { data: (data || []) as Chatbot[], error };
  },

  async updateChatbotApiIds(chatbotId: string, apiIds: string[]) {
    const { data, error } = await supabase
      .from('chatbots')
      .update({
        api_ids: apiIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatbotId)
      .select()
      .maybeSingle();
    return { data: data as Chatbot | null, error };
  },


  async forceLogout(id: string) {
    const { error } = await supabase
      .from('student_sessions')
      .update({ status: 'forced_logout' })
      .eq('id', id);
    return { error };
  },

  async forceLogoutAll() {
    const { error } = await supabase
      .from('student_sessions')
      .update({ status: 'forced_logout' })
      .eq('status', 'active');
    return { error };
  },

  async blockStudent(id: string, reason?: string) {
    const { error } = await supabase
      .from('students')
      .update({ is_blocked: true, block_reason: reason || null })
      .eq('id', id);
    
    // Also logout all active sessions for this student
    if (!error) {
      await supabase
        .from('student_sessions')
        .update({ status: 'forced_logout' })
        .eq('student_id', id)
        .eq('status', 'active');
    }
    return { error };
  },

  async unblockStudent(id: string) {
    const { error } = await supabase
      .from('students')
      .update({ is_blocked: false, block_reason: null })
      .eq('id', id);
    return { error };
  },

  // Appointments
  async createAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'created_at'>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointment])
      .select()
      .maybeSingle();
    return { data: data as Appointment | null, error };
  },

  async getAppointments() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data || []) as Appointment[], error };
  },

  async updateAppointmentStatus(id: string, status: Appointment['status']) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Appointment | null, error };
  },

  // Admissions
  async createAdmission(admission: Omit<Admission, 'id' | 'status' | 'created_at'>) {
    const { data, error } = await supabase
      .from('admissions')
      .insert([admission])
      .select()
      .maybeSingle();
    return { data: data as Admission | null, error };
  },

  async getAdmissions() {
    const { data, error } = await supabase
      .from('admissions')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data || []) as Admission[], error };
  },

  async updateAdmissionStatus(id: string, status: Admission['status']) {
    const { data, error } = await supabase
      .from('admissions')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as Admission | null, error };
  },

  // Social Media Links
  async getSocialMediaLinks() {
    const { data, error } = await supabase
      .from('social_media_links')
      .select('*')
      .order('created_at', { ascending: true });
    return { data: (data || []) as SocialMediaLink[], error };
  },

  async createSocialMediaLink(link: Omit<SocialMediaLink, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('social_media_links')
      .insert([link])
      .select()
      .maybeSingle();
    return { data: data as SocialMediaLink | null, error };
  },

  async updateSocialMediaLink(id: string, link: Partial<SocialMediaLink>) {
    const { data, error } = await supabase
      .from('social_media_links')
      .update({ ...link, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as SocialMediaLink | null, error };
  },

  async deleteSocialMediaLink(id: string) {
    const { error } = await supabase
      .from('social_media_links')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Attendance Config
  async getAttendanceConfig() {
    const { data, error } = await supabase
      .from('attendance_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    return { data: data as AttendanceConfig | null, error };
  },

  async updateAttendanceConfig(id: string, updates: Partial<AttendanceConfig>) {
    const { data, error } = await supabase
      .from('attendance_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    return { data: data as AttendanceConfig | null, error };
  },

  // Parent Portal Specific
  async getParentLinkedStudents(profileId: string) {
    const { data, error } = await supabase.rpc('get_parent_linked_students', { p_profile_id: profileId });
    return { data, error };
  },

  async getStudentAttendanceForParent(studentId: string, parentProfileId: string) {
    const { data, error } = await supabase.rpc('get_student_attendance_for_parent', { 
      p_student_id: studentId, 
      p_parent_profile_id: parentProfileId 
    });
    return { data, error };
  },

  async getNoticesForParent(studentId: string, parentProfileId: string) {
    const { data, error } = await supabase.rpc('get_notices_for_parent', { 
      p_student_id: studentId, 
      p_parent_profile_id: parentProfileId 
    });
    return { data, error };
  },

  async getTimetableForParent(studentId: string, parentProfileId: string) {
    const { data, error } = await supabase.rpc('get_timetable_for_parent', { 
      p_student_id: studentId, 
      p_parent_profile_id: parentProfileId 
    });
    return { data, error };
  },

  async getNoticesByClass(_className: string) {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('date', { ascending: false });
    return { data, error };
  },

  async getTimetableByClass(className: string, sectionName: string) {
    const { data, error } = await supabase
      .from('timetable')
      .select('*')
      .eq('class', className)
      .eq('section', sectionName);
    return { data, error };
  },


  async getVerificationLogs() {
    return supabase
      .from('verification_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
  },

  async getDeploymentAuditLogs() {
    return supabase
      .from('deployment_audit_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
  },

  async getOauthAuditLogs() {
    return supabase
      .from('oauth_audit_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
  },

  // PIN Security
  async verifyPIN(userId: string, pin: string) {
    const { data, error } = await supabase.rpc('verify_user_pin', { p_user_id: userId, p_pin: pin });
    return { data: data as { success: boolean, message?: string, lockout_until?: string, remaining_attempts?: number }, error };
  },

  async updatePIN(userId: string, newPin: string) {
    const { data, error } = await supabase.rpc('update_user_pin', { p_user_id: userId, p_new_pin: newPin });
    return { data, error };
  },

  async adminResetPIN(userId: string, newPin: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        pin: newPin,
        pin_setup_required: true,
        pin_attempt_count: 0,
        pin_lockout_until: null
      })
      .eq('id', userId)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async adminClearPIN(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        pin: null,
        pin_setup_required: true,
        pin_attempt_count: 0,
        pin_lockout_until: null
      })
      .eq('id', userId)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async adminRemoveLock(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ pin_attempt_count: 0, pin_lockout_until: null })
      .eq('id', userId)
      .select()
      .maybeSingle();
    return { data: data as Profile | null, error };
  },

  async toggleMasterStatus(userId: string, status: boolean) {
    const { error } = await supabase.rpc('toggle_master_status', {
      p_user_id: userId,
      p_status: status
    });
    return { error };
  },

  async toggleAccountStatus(userId: string, status: 'active' | 'restricted') {
    const { error } = await supabase.rpc('toggle_account_status', {
      p_user_id: userId,
      p_status: status
    });
    return { error };
  },

  async getPublicTables() {
    const { data, error } = await supabase.rpc('get_public_tables');
    return { data: (data || []) as { table_name: string }[], error };
  },

  async getTableData(tableName: string) {
    const { data, error } = await supabase.from(tableName).select('*');
    return { data: (data || []) as any[], error };
  },

  // API Management
  async getApiKeys() {
    const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    return { data: (data || []) as ApiKey[], error };
  },

  async createApiKey(name: string, rateLimit: number = 60) {
    const { data, error } = await supabase.from('api_keys').insert({
      name,
      rate_limit_minute: rateLimit
    }).select().single();
    return { data: data as ApiKey | null, error };
  },

  async toggleApiKeyStatus(id: string, isActive: boolean) {
    const { error } = await supabase.from('api_keys').update({ is_active: isActive }).eq('id', id);
    return { error };
  },

  async deleteApiKey(id: string) {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    return { error };
  },

  async regenerateApiKey(id: string) {
    const newKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const { error } = await supabase.from('api_keys').update({ key_value: newKey }).eq('id', id);
    return { error };
  },

  async getApiEndpoints() {
    const { data, error } = await supabase.from('api_endpoints').select('*').order('path', { ascending: true });
    return { data: (data || []) as ApiEndpoint[], error };
  },

  async createApiEndpoint(endpoint: Partial<ApiEndpoint>) {
    const { data, error } = await supabase.from('api_endpoints').insert(endpoint).select().single();
    return { data: data as ApiEndpoint | null, error };
  },

  async updateApiEndpoint(id: string, endpoint: Partial<ApiEndpoint>) {
    const { data, error } = await supabase.from('api_endpoints').update({ ...endpoint, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    return { data: data as ApiEndpoint | null, error };
  },

  async toggleApiEndpointStatus(id: string, isActive: boolean) {
    const { error } = await supabase.from('api_endpoints').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
    return { error };
  },

  async deleteApiEndpoint(id: string) {
    const { error } = await supabase.from('api_endpoints').delete().eq('id', id);
    return { error };
  },

  async getApiLogs(limit: number = 100, moduleApiId?: string) {
    let query = supabase.from('api_logs').select('*, api_keys(name), api_endpoints(path), module_apis(api_name, module_name)');
    if (moduleApiId) {
      query = query.eq('module_api_id', moduleApiId);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    return { data: (data || []) as any[], error };
  },

  async getModuleApis(moduleName?: string) {
    let query = supabase.from('module_apis').select('*');
    if (moduleName) {
      query = query.eq('module_name', moduleName);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data: (data || []) as ModuleApi[], error };
  },

  async analyzeAndEnableModuleApi(moduleName: string) {
    // 1. Run Analysis Engine
    const { data: analysisData, error: analysisError } = await supabase.rpc('analyze_module_schema', { p_table_name: moduleName });
    if (analysisError) return { error: analysisError };

    const { complexity, schema_json, api_name } = analysisData;
    const apiKey = `sk_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    
    // Auto-generate standardized endpoint path: /api/[module_name]
    const endpointPath = `/api/${moduleName.toLowerCase()}`;

    // 2. Upsert Module API config
    const { data, error } = await supabase
      .from('module_apis')
      .upsert({
        module_name: moduleName,
        api_name: api_name,
        api_key: apiKey,
        complexity,
        schema_json,
        endpoint_path: endpointPath,
        is_active: true,
        allowed_methods: ['POST'], // Default method is POST
        rate_limit_minute: complexity === 'complex' ? 50 : 100,
        description: `Auto-generated inbound-only API for ${moduleName} module.`
      }, { onConflict: 'module_name' })
      .select()
      .single();

    return { data: data as ModuleApi | null, error };
  },

  async updateModuleApiMethods(id: string, methods: string[]) {
    const { data, error } = await supabase
      .from('module_apis')
      .update({ allowed_methods: methods })
      .eq('id', id)
      .select()
      .single();
    return { data: data as ModuleApi | null, error };
  },

  async migrateLegacyApis() {
    // Legacy mapping: Look for api_keys and api_endpoints and try to link them to modules
    const { data: legacyKeys } = await supabase.from('api_keys').select('*');
    const { data: legacyEndpoints } = await supabase.from('api_endpoints').select('*');
    const { data: existingModuleApis } = await supabase.from('module_apis').select('module_name');

    const existingModules = new Set(existingModuleApis?.map(a => a.module_name) || []);
    
    // For each legacy endpoint that matches a known module and is not yet in module_apis
    if (legacyEndpoints) {
      for (const endpoint of legacyEndpoints) {
        if (!existingModules.has(endpoint.module_name)) {
          // Find a matching key or create one
          const matchingKey = legacyKeys?.find(k => k.id === endpoint.id); // Placeholder logic
          await this.analyzeAndEnableModuleApi(endpoint.module_name);
          existingModules.add(endpoint.module_name);
        }
      }
    }
    return { success: true };
  },

  async updateModuleApi(id: string, apiData: Partial<ModuleApi>) {
    const { data, error } = await supabase.from('module_apis').update(apiData).eq('id', id).select().single();
    return { data: data as ModuleApi | null, error };
  },

  async deleteModuleApi(id: string) {
    const { error } = await supabase.from('module_apis').delete().eq('id', id);
    return { error };
  },

  async regenerateModuleApiKey(id: string) {
    const newKey = `sk_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    const { error } = await supabase.from('module_apis').update({ api_key: newKey }).eq('id', id);
    return { error };
  },

  async getTableColumns(tableName: string) {
    const { data, error } = await supabase.rpc('get_table_columns', { p_table_name: tableName });
    return { data: (data || []).map((c: any) => c.column_name) as string[], error };
  },

  // Email OTP
  async getEmailOtpSettings() {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'email_otp_settings')
      .maybeSingle();
    return { data: (data?.config_value || {}) as any, error };
  },

  async generateOTP(userId: string, otpHash: string) {
    const { data, error } = await supabase.rpc('generate_user_email_otp', { 
      p_user_id: userId, 
      p_otp_hash: otpHash 
    });
    return { data: data as { success: boolean, email?: string, message?: string, cooldown_remaining?: number }, error };
  },

  async verifyOTP(userId: string, otpInput: string) {
    const { data, error } = await supabase.rpc('verify_user_email_otp', { 
      p_user_id: userId, 
      p_otp_input: otpInput 
    });
    return { data: data as { success: boolean, message?: string, remaining_attempts?: number }, error };
  },

  // ── Master Fees ──────────────────────────────────────────────
  async getMasterFees(sessionYear?: string) {
    let query = supabase.from('master_fees').select('*').order('class_name');
    if (sessionYear) query = query.eq('session_year', sessionYear);
    const { data, error } = await query;
    return { data: (data || []) as MasterFee[], error };
  },

  async upsertMasterFee(classname: string, sessionYear: string, totalAmount: number) {
    const { data, error } = await supabase
      .from('master_fees')
      .upsert(
        { class_name: classname, session_year: sessionYear, total_amount: totalAmount, updated_at: new Date().toISOString() },
        { onConflict: 'class_name,session_year' }
      )
      .select()
      .maybeSingle();
    return { data: data as MasterFee | null, error };
  },

  async getMasterFeeForClass(classname: string, sessionYear: string) {
    const { data, error } = await supabase
      .from('master_fees')
      .select('*')
      .eq('class_name', classname)
      .eq('session_year', sessionYear)
      .maybeSingle();
    return { data: data as MasterFee | null, error };
  },

  // ── Fee Payments (core ledger) ────────────────────────────────
  async getStudentCorePaidTotal(studentId: string, sessionYear: string) {
    const { data, error } = await supabase
      .rpc('get_student_core_paid_total', { p_student_id: studentId, p_session_year: sessionYear });
    return { data: Number(data ?? 0), error };
  },

  async getFeePayments(studentId: string, sessionYear?: string, excludeRevoked = false) {
    let query = supabase
      .from('fee_payments')
      .select('*, fee_receipts(id, receipt_number, pdf_url)')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false });
    if (sessionYear) query = query.eq('session_year', sessionYear);
    if (excludeRevoked) query = query.eq('is_revoked', false);
    const { data, error } = await query;
    return { data: (data || []) as FeePayment[], error };
  },

  async getAllFeePayments(filters?: { startDate?: string; endDate?: string; sessionYear?: string; excludeRevoked?: boolean }) {
    let query = supabase
      .from('fee_payments')
      .select('id, student_id, amount, payment_date, session_year, is_revoked, period_type, payment_period')
      .order('payment_date', { ascending: false });
    if (filters?.startDate) query = query.gte('payment_date', filters.startDate);
    if (filters?.endDate) query = query.lte('payment_date', filters.endDate);
    if (filters?.sessionYear) query = query.eq('session_year', filters.sessionYear);
    if (filters?.excludeRevoked) query = query.eq('is_revoked', false);
    const { data, error } = await query;
    return { data: (data || []) as FeePayment[], error };
  },

  async getAllAttendanceForRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('id, student_id, date, status, created_at')
      .gte('date', startDate)
      .lte('date', endDate);
    return { data: (data || []) as Attendance[], error };
  },

  async getAllAdmissionsForRange(startDate?: string, endDate?: string) {
    let query = supabase.from('admissions').select('id, status, created_at').order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data, error } = await query;
    return { data: (data || []) as Admission[], error };
  },

  async getAllStudentsForRange(startDate?: string, endDate?: string) {
    let query = supabase.from('students').select('id, status, created_at').order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data, error } = await query;
    return { data: (data || []) as Student[], error };
  },

  async getExamsForRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    return { data: (data || []) as Exam[], error };
  },

  async checkCorePeriodAvailable(
    studentId: string,
    sessionYear: string,
    periodMonths: string[],
    feeType: string = 'core',
  ) {
    const { data, error } = await supabase.rpc('check_core_period_available', {
      p_student_id: studentId,
      p_session_year: sessionYear,
      p_period_months: periodMonths,
      p_fee_type: feeType,
    });
    return { data: data as boolean | null, error };
  },

  async registerFeePayment(payment: {
    student_id: string;
    session_year: string;
    payment_period: string;
    period_type: string;
    period_months: string[];
    amount: number;
    payment_method: string;
    payment_date: string;
    transaction_id?: string;
    notes?: string;
    collected_by?: string;
    fee_type?: string;
  }) {
    const { data, error } = await supabase.rpc('register_fee_payment', {
      p_student_id: payment.student_id,
      p_session_year: payment.session_year,
      p_period: payment.payment_period,
      p_period_type: payment.period_type,
      p_period_months: payment.period_months,
      p_amount: payment.amount,
      p_payment_method: payment.payment_method,
      p_payment_date: payment.payment_date,
      p_transaction_id: payment.transaction_id ?? null,
      p_notes: payment.notes ?? null,
      p_collected_by: payment.collected_by ?? null,
      p_fee_type: payment.fee_type ?? 'core',
    });
    if (error) return { data: null as FeePayment | null, error };
    return { data: data as FeePayment | null, error };
  },

  async updateFeePaymentReceiptId(paymentId: string, receiptId: string) {
    const { data, error } = await supabase
      .from('fee_payments')
      .update({ receipt_id: receiptId })
      .eq('id', paymentId)
      .select()
      .maybeSingle();
    return { data: data as FeePayment | null, error };
  },

  async createFeePayment(payment: {
    student_id: string;
    session_year: string;
    payment_period: string;
    period_type?: string;
    period_months?: string[];
    amount: number;
    payment_method: string;
    payment_date: string;
    transaction_id?: string;
    notes?: string;
    collected_by?: string;
    receipt_id?: string;
  }) {
    const { data, error } = await supabase
      .from('fee_payments')
      .insert({
        ...payment,
        period_type: payment.period_type ?? 'monthly',
        period_value: payment.payment_period,
      })
      .select()
      .maybeSingle();
    return { data: data as FeePayment | null, error };
  },

  // ── Extra / Other Fees ────────────────────────────────────────
  async getExtraFees(studentId?: string, sessionYear?: string, includeRevoked = false) {
    let query = supabase
      .from('extra_fees')
      .select('*, students(name, login_id, class, section)')
      .order('created_at', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    if (sessionYear) query = query.eq('session_year', sessionYear);
    if (!includeRevoked) query = query.eq('is_revoked', false);
    const { data, error } = await query;
    return { data: (data || []) as ExtraFee[], error };
  },

  async createExtraFee(fee: {
    student_id: string;
    fee_category: 'extra' | 'other';
    description: string;
    reason: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    session_year: string;
    transaction_id?: string;
    collected_by?: string;
  }) {
    const { data, error } = await supabase
      .from('extra_fees')
      .insert({ ...fee, revocation_expires_at: new Date(Date.now() + 120_000).toISOString() })
      .select('*, students(name, login_id, class, section)')
      .maybeSingle();
    return { data: data as ExtraFee | null, error };
  },

  // ── Fee Receipts ──────────────────────────────────────────────
  async getFeeReceipts(studentId?: string, includeRevoked = false) {
    let query = supabase
      .from('fee_receipts')
      .select('*, students(name, login_id, class, section, profile_picture_url)')
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);
    if (!includeRevoked) query = query.eq('is_revoked', false);
    const { data, error } = await query;
    return { data: (data || []) as FeeReceipt[], error };
  },

  async revokeFeeRegistration(paymentId: string) {
    const { data, error } = await supabase.rpc('revoke_fee_registration', {
      p_payment_id: paymentId,
      p_revoked_by: (await supabase.auth.getSession()).data.session?.user?.id,
    });
    return { data: data as boolean | null, error };
  },

  async revokeExtraFee(extraFeeId: string) {
    const { data, error } = await supabase.rpc('revoke_extra_fee', {
      p_extra_fee_id: extraFeeId,
      p_revoked_by: (await supabase.auth.getSession()).data.session?.user?.id,
    });
    return { data: data as boolean | null, error };
  },

  async getVisibleFeeReceiptsForStudent(studentId: string) {
    const { data, error } = await supabase.rpc('get_visible_receipts_for_student', {
      p_student_id: studentId,
    });
    return { data: (data || []) as FeeReceipt[], error };
  },

  async getVisibleFeeReceiptsForParent(parentProfileId: string) {
    const { data, error } = await supabase.rpc('get_visible_receipts_for_parent', {
      p_profile_id: parentProfileId,
    });
    return { data: (data || []) as FeeReceipt[], error };
  },

  async getFeeReceiptById(id: string) {
    const { data, error } = await supabase
      .from('fee_receipts')
      .select('*, students(name, login_id, class, section, profile_picture_url)')
      .eq('id', id)
      .maybeSingle();
    return { data: data as FeeReceipt, error };
  },

  async generateReceiptNumber() {
    const { data, error } = await supabase.rpc('generate_receipt_number');
    return { data: data as string, error };
  },

  // Build a deterministic hash from the student_id + sorted fee_detail_ids
  buildReceiptHash(studentId: string, feeDetailIds: string[]): string {
    const sorted = [...feeDetailIds].sort().join('|');
    const raw = `${studentId}::${sorted}`;
    // Simple djb2-style hash — no crypto dep needed
    let h = 5381;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) + h) ^ raw.charCodeAt(i);
    }
    return (h >>> 0).toString(16).padStart(8, '0') + '_' + btoa(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  },

  // Check if a receipt was already generated for this exact set of fee items
  async findReceiptByHash(hash: string) {
    const { data, error } = await supabase
      .from('fee_receipts')
      .select('id, receipt_number, pdf_url, created_at, regenerated_count, is_receipt_generated')
      .eq('receipt_hash', hash)
      .maybeSingle();
    return { data: data as any, error };
  },

  async createFeeReceipt(receipt: {
    student_id: string;
    receipt_number: string;
    fee_detail_ids: string[];
    items: { description: string; amount: number; due_date?: string }[];
    total_amount: number;
    payment_method: string;
    transaction_id?: string;
    payment_date: string;
    notes?: string;
    generated_by?: string;
    pdf_url?: string;
    receipt_hash?: string;
    period_type?: string;
    period_value?: string;
    period_months?: string[];
  }) {
    const { data, error } = await supabase
      .from('fee_receipts')
      .insert({
        ...receipt,
        is_receipt_generated: true,
        generation_timestamp: new Date().toISOString(),
      })
      .select('*, students(name, login_id, class, section)')
      .maybeSingle();
    return { data: data as FeeReceipt | null, error };
  },

  async createFeeReceiptVisibility(receiptId: string, visibilityDays = 30) {
    const { data, error } = await supabase.rpc('create_fee_receipt_visibility', {
      p_receipt_id: receiptId,
      p_visibility_days: visibilityDays,
    });
    return { data, error };
  },

  async extendReceiptVisibilityForRole(receiptId: string, role: 'student' | 'parent', visibilityDays = 30) {
    const { data, error } = await supabase.rpc('extend_receipt_visibility_for_role', {
      p_receipt_id: receiptId,
      p_role: role,
      p_visibility_days: visibilityDays,
    });
    return { data, error };
  },

  async getReceiptVisibilityStatus(receiptId: string) {
    const { data, error } = await supabase.rpc('get_receipt_visibility_status', {
      p_receipt_id: receiptId,
    });
    return { data: (data || []) as { role: string; expires_at: string; is_extended: boolean }[], error };
  },

  async updateFeeReceiptPdfUrl(id: string, pdf_url: string) {
    const { data, error } = await supabase
      .from('fee_receipts')
      .update({ pdf_url, updated_at: new Date().toISOString() })
      .eq('id', id)
      .maybeSingle();
    return { data, error };
  },

  // Upload PDF blob to Supabase Storage and return public URL
  async uploadReceiptPdf(receiptNumber: string, studentId: string, pdfBlob: Blob): Promise<string | null> {
    const path = `${studentId}/${receiptNumber}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('fee-receipts')
      .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
    if (upErr) {
      console.error('Receipt PDF upload failed:', upErr.message);
      return null;
    }
    const { data } = await supabase.storage.from('fee-receipts').createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  },

  async deleteFeeReceipt(id: string) {
    const { error } = await supabase.from('fee_receipts').delete().eq('id', id);
    return { error };
  },

  // Parent: read visible receipts for all linked students
  async getFeeReceiptsForParent(parentProfileId: string) {
    const { data, error } = await supabase.rpc('get_visible_receipts_for_parent', {
      p_profile_id: parentProfileId,
    });
    return { data: (data || []) as FeeReceipt[], error };
  },

  // ── Quiz Management ────────────────────────────────────────────────────────
  async getQuizzes(opts?: { subjectId?: string; status?: string; forStudent?: boolean }) {
    let query = supabase
      .from('quizzes')
      .select('*, subjects(name), quiz_attempts(is_preview, status, attempt_number, percentage, score)')
      .order('created_at', { ascending: false });

    if (opts?.subjectId) query = query.eq('subject_id', opts.subjectId);
    if (opts?.status) query = query.eq('status', opts.status);

    const { data, error } = await query;
    if (error) return { data: [] as Quiz[], error };
    const enriched = (data || []).map((q: any) => ({
      ...q,
      subject_name: q.subjects?.name || '',
      question_count: q.number_of_questions || 0,
      my_attempts: opts?.forStudent ? (q.quiz_attempts || []) : undefined,
    })) as Quiz[];
    return { data: enriched, error: null };
  },

  async getQuizById(id: string) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, subjects(name)')
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null as Quiz | null, error };
    const quiz = data ? { ...data, subject_name: (data as any).subjects?.name || '' } as Quiz : null;
    return { data: quiz, error: null };
  },

  async createQuiz(quiz: Partial<Quiz>) {
    const payload = sanitizeQuizPayload({ ...quiz, updated_at: new Date().toISOString() });
    const { data, error } = await supabase.from('quizzes').insert(payload).select().single();
    return { data: data as Quiz | null, error };
  },

  async updateQuiz(id: string, updates: Partial<Quiz>) {
    const payload = sanitizeQuizPayload({ ...updates, updated_at: new Date().toISOString() });
    const { data, error } = await supabase.from('quizzes').update(payload).eq('id', id).select().single();
    return { data: data as Quiz | null, error };
  },

  async deleteQuiz(id: string) {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    return { error };
  },

  async duplicateQuizQuestions(sourceQuizId: string, targetQuizId: string) {
    const { data: questions, error } = await this.getQuizQuestions(sourceQuizId);
    if (error) return { error };
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = (q.options || []).map((o) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index,
      }));
      const { options: _, id: _id, quiz_id: _qid, created_at: _ca, updated_at: _ua, ...rest } = q as any;
      const { error: saveError } = await this.saveQuestion({ ...rest, quiz_id: targetQuizId, order_index: i }, options);
      if (saveError) return { error: saveError };
    }
    return { error: null };
  },

  async getQuizQuestions(quizId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    if (error) return { data: [] as Question[], error };
    const normalized = (data || []).map((q: any) => ({
      ...q,
      options: q.question_options || [],
    })) as Question[];
    return { data: normalized, error: null };
  },

  async saveQuestion(question: Partial<Question>, options: Partial<QuestionOption>[]) {
    // Strip client-side placeholders and joined data before upserting the question.
    // Empty string for id or created_at/updated_at violates the DB uuid/timestamp types.
    const {
      id: qId,
      created_at: qCreatedAt,
      updated_at: qUpdatedAt,
      question_options: _qOptions,
      options: _qOptionsAlias,
      ...questionPayload
    } = question as any;
    const questionToUpsert = {
      ...questionPayload,
      updated_at: new Date().toISOString(),
    };
    if (qId) questionToUpsert.id = qId;
    if (qCreatedAt) questionToUpsert.created_at = qCreatedAt;
    if (qUpdatedAt) questionToUpsert.updated_at = qUpdatedAt;
    const { data: qData, error: qError } = await supabase
      .from('questions')
      .upsert(questionToUpsert)
      .select()
      .single();
    if (qError) return { data: null as Question | null, error: qError };
    const questionId = qData.id;
    if (options.length > 0) {
      const { error: oError } = await supabase
        .from('question_options')
        .delete()
        .eq('question_id', questionId);
      if (oError) return { data: qData as Question, error: oError };
      const { error: insertError } = await supabase
        .from('question_options')
        .insert(
          options.map((o, idx) => {
            // Strip empty client-side placeholders so the database can use its
            // own defaults (gen_random_uuid(), now(), etc.). Empty strings for
            // uuid/timestamp columns cause "invalid input syntax for type uuid".
            const { id: _id, created_at: _createdAt, question_id: _questionId, ...rest } = o;
            return {
              ...rest,
              question_id: questionId,
              order_index: idx,
            };
          })
        );
      if (insertError) return { data: qData as Question, error: insertError };
    }
    return { data: qData as Question, error: null };
  },

  async deleteQuestion(id: string) {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    return { error };
  },

  async saveQuizQuestions(quizId: string, questions: Partial<Question>[]) {
    const { data: existing, error: existingError } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', quizId);
    if (existingError) return { error: existingError };
    const submittedIds = new Set(questions.map((q) => q.id).filter(Boolean) as string[]);
    const toDelete = (existing || []).filter((e) => !submittedIds.has(e.id)).map((e) => e.id);
    if (toDelete.length > 0) {
      await supabase.from('questions').delete().in('id', toDelete);
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = (q.options || []).map((o) => ({ ...o, id: o.id || undefined }));
      // Build a clean question payload. The joined question_options array must be
      // removed because it is not a real column. The id is preserved if present;
      // saveQuestion will strip an empty id and let the database generate a uuid.
      const { question_options: _qOptions, options: _qOptionsAlias, ...rest } = q as any;
      await this.saveQuestion({ ...rest, quiz_id: quizId, order_index: i }, options);
    }

    await supabase
      .from('quizzes')
      .update({ number_of_questions: questions.length })
      .eq('id', quizId);

    return { error: null };
  },

  async getQuizAssignments(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_assignments')
      .select('*')
      .eq('quiz_id', quizId);
    return { data: (data || []) as QuizAssignment[], error };
  },

  async setQuizAssignments(quizId: string, assignments: Partial<QuizAssignment>[]) {
    await supabase.from('quiz_assignments').delete().eq('quiz_id', quizId);
    if (assignments.length === 0) return { error: null };
    const { error } = await supabase.from('quiz_assignments').insert(
      assignments.map(({ id: _id, created_at: _createdAt, quiz_id: _quizId, ...a }) => ({
        ...a,
        quiz_id: quizId,
      }))
    );
    return { error };
  },

  async startQuizAttempt(quizId: string) {
    const { data, error } = await supabase.rpc('start_quiz_attempt', { p_quiz_id: quizId });
    return { data: data as QuizAttempt | null, error };
  },

  async getQuizQuestionsForPlayer(quizId: string, attemptId: string) {
    const { data, error } = await supabase.rpc('get_quiz_questions_for_player', {
      p_quiz_id: quizId,
      p_attempt_id: attemptId,
    });
    return { data: data as QuizPlayerData | null, error };
  },

  async saveAnswer(
    attemptId: string,
    questionId: string,
    optionId: string,
    timeSpentSeconds = 0,
    currentQuestionIndex = 0
  ) {
    const { data, error } = await supabase.rpc('save_answer', {
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_option_id: optionId,
      p_time_spent_seconds: timeSpentSeconds,
      p_current_question_index: currentQuestionIndex,
    });
    if (error || !data) {
      return {
        data: null as { selected_option_id: string; is_correct: boolean | null; marks_obtained: number | null; correct_option_id: string | null } | null,
        error,
      };
    }
    const row = (Array.isArray(data) ? data[0] : data) as any;
    return {
      data: {
        selected_option_id: row.selected_option_id,
        is_correct: row.is_correct,
        marks_obtained: row.marks_obtained,
        correct_option_id: row.correct_option_id,
      },
      error: null,
    };
  },

  async saveQuizProgress(attemptId: string, currentQuestionIndex: number, timeSpentSeconds = 0) {
    const { error } = await supabase.rpc('save_quiz_progress', {
      p_attempt_id: attemptId,
      p_current_question_index: currentQuestionIndex,
      p_time_spent_seconds: timeSpentSeconds,
    });
    return { error };
  },

  async submitQuizAttempt(attemptId: string, timeSpentSeconds = 0) {
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_attempt_id: attemptId,
      p_time_spent_seconds: timeSpentSeconds,
    });
    return { data: data as QuizAttempt | null, error };
  },

  async getQuizResultReview(attemptId: string) {
    const { data, error } = await supabase.rpc('get_quiz_result_review', { p_attempt_id: attemptId });
    return { data: data as QuizResultReview | null, error };
  },

  async getQuizPreviewData(quizId: string) {
    const { data, error } = await supabase.rpc('get_quiz_preview_data', { p_quiz_id: quizId });
    return { data: data as { quiz: Quiz; questions: Question[] } | null, error };
  },

  async getQuizAnalytics(quizId: string) {
    const { data, error } = await supabase.rpc('get_quiz_analytics', { p_quiz_id: quizId });
    return { data: data as QuizAnalytics | null, error };
  },

  async getQuestionWiseAnalytics(quizId: string) {
    const { data, error } = await supabase.rpc('get_question_wise_analytics', { p_quiz_id: quizId });
    return { data: (data || []) as QuestionWiseAnalytics[], error };
  },

  async getQuizAttempts(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, students(name, class, section, roll_number)')
      .eq('quiz_id', quizId)
      .eq('is_preview', false)
      .order('submitted_at', { ascending: false });
    return { data: (data || []) as QuizAttempt[], error };
  },

  async getMyQuizAttempts(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('is_preview', false)
      .order('attempt_number', { ascending: false });
    return { data: (data || []) as QuizAttempt[], error };
  },

  async getAttemptAnswers(attemptId: string) {
    const { data, error } = await supabase
      .from('attempt_answers')
      .select('*')
      .eq('attempt_id', attemptId);
    return { data: (data || []) as AttemptAnswer[], error };
  },

  async getQuizAiInteraction(attemptId: string, questionId: string) {
    const { data, error } = await supabase
      .from('quiz_ai_interactions')
      .select('*')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .maybeSingle();
    return { data: data as QuizAiInteraction | null, error };
  },

  async saveQuizAiInteraction(attemptId: string, questionId: string, messages: QuizAiInteraction['messages']) {
    const { data, error } = await supabase
      .from('quiz_ai_interactions')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        messages,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data: data as QuizAiInteraction | null, error };
  },

  async uploadQuizImage(file: File, path?: string) {
    const fileName = path || `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });
    if (error) return { data: null, error };
    const { data: urlData } = supabase.storage.from('quiz-images').getPublicUrl(data.path);
    return { data: urlData.publicUrl, error: null };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Student Panel dynamic content (Admin-managed)
  // ─────────────────────────────────────────────────────────────────────────────
  async getStudentPanelSettings(schoolId?: string, activeOnly = true) {
    let query = supabase
      .from('student_panel_settings')
      .select('*')
      .order('sort_order', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data, error } = await query;
    return {
      data: data?.map((row: any) => ({
        ...row,
        options: Array.isArray(row.options) ? row.options : [],
        value: row.value ?? null,
      })) as StudentPanelSetting[] | null,
      error,
    };
  },

  async upsertStudentPanelSetting(item: Partial<StudentPanelSetting>) {
    const { id, ...rest } = item;
    const payload = {
      ...rest,
      options: Array.isArray(rest.options) ? rest.options : undefined,
    };
    if (id) {
      const { data, error } = await supabase
        .from('student_panel_settings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      return { data: data as StudentPanelSetting | null, error };
    }
    const { data, error } = await supabase
      .from('student_panel_settings')
      .insert(payload)
      .select()
      .single();
    return { data: data as StudentPanelSetting | null, error };
  },

  async deleteStudentPanelSetting(id: string) {
    const { error } = await supabase.from('student_panel_settings').delete().eq('id', id);
    return { error };
  },

  async getStudentPanelNotifications(schoolId?: string, activeOnly = true) {
    let query = supabase
      .from('student_panel_notifications')
      .select('*')
      .order('sort_order', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data, error } = await query;
    return {
      data: data as StudentPanelNotification[] | null,
      error,
    };
  },

  async upsertStudentPanelNotification(item: Partial<StudentPanelNotification>) {
    const { id, ...rest } = item;
    if (id) {
      const { data, error } = await supabase
        .from('student_panel_notifications')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      return { data: data as StudentPanelNotification | null, error };
    }
    const { data, error } = await supabase
      .from('student_panel_notifications')
      .insert(rest)
      .select()
      .single();
    return { data: data as StudentPanelNotification | null, error };
  },

  async deleteStudentPanelNotification(id: string) {
    const { error } = await supabase.from('student_panel_notifications').delete().eq('id', id);
    return { error };
  },

  async getStudentPanelHelpSupport(schoolId?: string, activeOnly = true) {
    let query = supabase
      .from('student_panel_help_support')
      .select('*')
      .order('sort_order', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data, error } = await query;
    return {
      data: data as StudentPanelHelpSupport[] | null,
      error,
    };
  },

  async upsertStudentPanelHelpSupport(item: Partial<StudentPanelHelpSupport>) {
    const { id, ...rest } = item;
    if (id) {
      const { data, error } = await supabase
        .from('student_panel_help_support')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      return { data: data as StudentPanelHelpSupport | null, error };
    }
    const { data, error } = await supabase
      .from('student_panel_help_support')
      .insert(rest)
      .select()
      .single();
    return { data: data as StudentPanelHelpSupport | null, error };
  },

  async deleteStudentPanelHelpSupport(id: string) {
    const { error } = await supabase.from('student_panel_help_support').delete().eq('id', id);
    return { error };
  },

  async getStudentPanelPrivacyPolicy(schoolId?: string, activeOnly = true) {
    let query = supabase
      .from('student_panel_privacy_policy')
      .select('*')
      .order('created_at', { ascending: false });
    if (activeOnly) query = query.eq('is_active', true);
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data, error } = await query;
    return {
      data: data as StudentPanelPrivacyPolicy[] | null,
      error,
    };
  },

  async upsertStudentPanelPrivacyPolicy(item: Partial<StudentPanelPrivacyPolicy>) {
    const { id, ...rest } = item;
    if (id) {
      const { data, error } = await supabase
        .from('student_panel_privacy_policy')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      return { data: data as StudentPanelPrivacyPolicy | null, error };
    }
    const { data, error } = await supabase
      .from('student_panel_privacy_policy')
      .insert(rest)
      .select()
      .single();
    return { data: data as StudentPanelPrivacyPolicy | null, error };
  },

  async deleteStudentPanelPrivacyPolicy(id: string) {
    const { error } = await supabase.from('student_panel_privacy_policy').delete().eq('id', id);
    return { error };
  },
};

