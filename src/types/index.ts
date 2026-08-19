export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'student' | 'admin' | 'teacher' | 'parent';

export interface Profile {
  id: string;
  username: string;
  role: UserRole | string;
  student_id: string | null;
  teacher_id: string | null;
  parent_profile_id: string | null;
  is_master: boolean;
  prefix?: string | null;
  is_blue_tag?: boolean;
  profile_tag?: 'blue' | 'black' | 'grey' | null;
  permissions: string[];
  theme_preference: string;
  language_preference?: string;
  email: string;
  avatar_url?: string;
  email_verified?: boolean;
  require_email_verification?: boolean;
  email_otp_enabled?: boolean;
  otp_cooldown_until?: string | null;
  otp_verified_at?: string | null;
  created_at: string;
  pin?: string;
  pin_setup_required?: boolean;
  pin_attempt_count?: number;
  pin_lockout_until?: string | null;
  admin_custom_tag?: string;
  login_access_enabled: boolean;
  account_status?: 'active' | 'restricted';
  // Denormalized from the linked student/teacher/parent record for consistent identity display.
  student_name?: string | null;
  teacher_name?: string | null;
  parent_name?: string | null;
  verification_id?: string | null;
  login_id?: string | null;
}

export interface Teacher {
  id: string;
  prefix?: string | null;
  name: string;
  subject_role: string;
  contact: string;
  email: string;
  joining_date: string | null;
  description: string | null;
  profile_picture_url: string | null;
  login_id: string;
  verification_id: string;
  employee_id: string | null;
  profile_tag?: 'blue' | 'black' | 'grey' | null;
  created_at: string;
  updated_at: string;
  class_assignments?: ClassTeacherAssignment[];
}

export interface ClassTeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string;
  academic_session?: string;
  created_at: string;
  // Join fields
  class_name?: string;
  section_name?: string;
}

export interface Student {
  id: string;
  prefix?: string | null;
  name: string;
  class: string;
  section: string;
  class_id: string | null;
  section_id: string | null;
  student_type: string;
  gender: string;
  dob: string;
  contact: string;
  email: string;
  fee_details: FeeDetail[];
  fee_status: 'Paid' | 'Pending' | 'Overdue';
  rank: number;
  roll_number: string | null;
  promotion_date: string | null;
  session_info: string;
  profile_picture_url: string | null;
  login_id: string;
  verification_id: string;
  is_blue_tag?: boolean;
  profile_tag?: 'blue' | 'black' | 'grey' | null;
  is_blocked: boolean;
  block_reason: string | null;
  certificate_visible?: boolean;
  id_card_visible?: boolean;
  status?: 'active' | 'passout';
  passout_date?: string | null;
  created_at: string;
  linked_parents?: any[];
}

export interface StudentSession {
  id: string;
  student_id: string;
  profile_id: string;
  login_id: string;
  student_name: string;
  device_info: string | null;
  ip_address: string | null;
  login_time: string;
  last_activity: string;
  status: 'active' | 'forced_logout' | 'expired';
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  sections: Section[];
  created_at: string;
}

export interface Section {
  id: string;
  class_id: string;
  name: string;
  created_at: string;
}

export interface FeeDetail {
  id: string;
  amount: number;
  description: string;
  due_date: string;
  fee_category?: 'core' | 'extra' | 'other';
  reason?: string;
  payment_period?: string;
  status?: 'Paid' | 'Pending' | 'Overdue';
}

export interface MasterFee {
  id: string;
  class_name: string;
  session_year: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExtraFee {
  id: string;
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
  created_at: string;
  students?: { name: string; login_id: string; class: string; section: string };
  is_revoked?: boolean;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_expires_at?: string | null;
}

export interface FeePayment {
  id: string;
  student_id: string;
  session_year: string;
  payment_period: string;
  period_type?: 'monthly' | 'annual' | 'combined' | 'extra' | null;
  period_value?: string | null;
  period_months?: string[] | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  notes?: string;
  collected_by?: string;
  receipt_id?: string;
  fee_receipts?: { id: string; receipt_number: string; pdf_url?: string }[];
  created_at: string;
  is_revoked?: boolean;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_expires_at?: string | null;
}

/** Receipt line items passed into the template placeholder resolver at generation time. */
export interface FeeReceiptData {
  /** Receipt identifier (e.g. REC-2025-0001) */
  receipt_number: string;
  /** Tuition fee amount */
  tuition_fee: number;
  /** Admission fee amount */
  admission_fee: number;
  /** Examination fee amount */
  examination_fee: number;
  /** Discount applied */
  discount: number;
  /** Previous dues */
  previous_due: number;
  /** Final total */
  grand_total: number;
  /** Fee period type */
  period_type?: string;
  /** Fee period label */
  period_value?: string;
  /** Fee period month keys */
  period_months?: string[];
}

export interface FeeReceipt {
  id: string;
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
  created_at: string;
  updated_at: string;
  regenerated_count?: number;
  is_receipt_generated: boolean;
  generation_timestamp: string;
  period_type?: 'monthly' | 'annual' | 'combined' | 'extra' | null;
  period_value?: string | null;
  period_months?: string[] | null;
  expires_at?: string | null;
  is_extended?: boolean | null;
  role?: string;
  students?: { name: string; login_id: string; class: string; section: string; profile_picture_url?: string };
  is_revoked?: boolean;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_expires_at?: string | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  class_id?: string;
  section_id?: string;
  marked_by?: string;
  created_at?: string;
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  target_type: 'all' | 'class' | 'section' | 'student';
  target_id: string | null;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  is_blue_tag: boolean;
  target_audience: 'all' | 'teachers' | 'students' | 'classes';
  target_classes: string[] | null;
  expiry_date: string;
  target_type: 'all' | 'class' | 'section' | 'student';
  target_id: string | null;
  author_id?: string | null;
  author_role?: string | null;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  event_name: string;
  event_date: string;
}

export interface SchoolInfo {
  id: string;
  section_key: string;
  title: string;
  content: string;
  image_url: string | null;
  order_index: number;
  is_visible: boolean;
  updated_at: string;
}

export interface Leadership {
  id: string;
  type: 'principal' | 'teacher';
  name: string;
  designation: string | null;
  image_url: string | null;
  message: string | null;
  years_of_service: string | null;
  order_index: number;
  created_at: string;
}
export interface StudentQuery {
  id: string;
  student_id: string;
  student_name: string;
  content: string;
  is_public: boolean;
  status: 'pending' | 'replied';
  reply_content: string | null;
  replied_at: string | null;
  is_pinned: boolean;
  created_at: string;
  target_type: 'admin' | 'teacher';
  target_teacher_id: string | null;
}

export interface TeacherQuery {
  id: string;
  teacher_id: string;
  teacher_name: string;
  content: string;
  is_public: boolean;
  status: 'pending' | 'replied';
  reply_content: string | null;
  replied_at: string | null;
  is_pinned: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  label: string;
  created_at?: string;
}

export interface ModuleSetting {
  id: string;
  module_id: string;
  is_enabled: boolean;
  state: 'enabled' | 'disabled' | 'deactivated';
  role: string | null;
  user_id: string | null;
  updated_at: string;
}
export interface BrandingSettings {
  id: string;
  // Core identity
  school_name: string;
  school_short_name: string;
  school_logo_url: string | null;
  school_seal_url: string | null;
  // Contact & location
  school_address: string;
  school_city: string;
  school_state: string;
  school_pin_code: string;
  school_phone: string;
  school_email: string;
  school_website: string;
  // Academic
  default_academic_session: string;
  // Authority
  principal_name: string;
  principal_signature_url: string | null;
  // Identity extras
  school_motto: string;
  school_registration_number: string;
  affiliation_number: string;
  affiliation_board: string;
  // Theme
  theme_color: string;
  secondary_color: string;
  // Document footer
  school_footer_text: string;
  // ID Card template selections
  id_card_front_template_id: string | null;
  id_card_back_template_id:  string | null;
  // Fee Receipt default template
  fee_receipt_template_id: string | null;
  updated_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  file_url: string;
  generated_at: string;
  document_type: 'certificate' | 'id_card';
  reference_number: string;
}

export interface Appointment {
  id: string;
  student_name: string | null;
  parent_name: string;
  contact_number: string;
  email: string | null;
  purpose: string;
  custom_purpose: string | null;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'completed';
  created_at: string;
}

export interface Admission {
  id: string;
  student_name: string;
  date_of_birth: string;
  gender: string;
  applying_class: string;
  previous_school: string | null;
  parent_name: string;
  contact_number: string;
  address: string;
  notes: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface SocialMediaLink {
  id: string;
  platform: string;
  url: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface LinkedStudent extends Student {
  relationship: string;
}

export interface Parent {
  id: string;
  parent_id: string;
  prefix?: string | null;
  full_name: string;
  phone: string | null;
  email: string;
  occupation: string | null;
  address: string | null;
  gender: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  linked_students?: LinkedStudent[];
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  created_at: string;
}

export interface ModuleApi {
  id: string;
  api_name: string;
  module_name: string;
  purpose: string;
  description: string;
  api_key: string;
  is_active: boolean;
  rate_limit_minute: number;
  complexity?: 'simple' | 'medium' | 'complex';
  schema_json?: any;
  endpoint_path?: string;
  allowed_methods?: string[];
  created_at: string;
  created_by: string;
}


export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'Certificate' | 'ID Card' | 'Admission Certificate' | 'Result' | 'Fee Receipt';
  layout_config: {
    header_enabled: boolean;
    body_enabled: boolean;
    footer_enabled: boolean;
    page_size?: string;
    orientation?: 'portrait' | 'landscape';
    page_width?: number;
    page_height?: number;
  };
  content_config: {
    header: TemplateElement[];
    body: TemplateElement[];
    footer: TemplateElement[];
  };
  created_at: string;
  updated_at: string;
}

export interface TemplateElement {
  id: string;
  type: 'static' | 'dynamic';
  text?: string;
  placeholder?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: ApiHeader[];
  variables: ApiVariable[];
  bodies: ApiBody[];
  responseField: string;
  auth_type: 'bearer' | 'api_key' | 'none';
  apiKey?: string;
  created_at: string;
  last_applied: string | null;
  is_active: boolean;
  created_by?: string;
}

export interface ApiHeader {
  key: string;
  value: string;
}

export interface ApiVariable {
  id: string;
  key: string;
  value: string;
}

export interface ApiBody {
  id: string;
  name: string;
  content: Record<string, any>;
  type: 'text' | 'file';
  is_default: boolean;
}

export interface Chatbot {
  id: string;
  name: string;
  api_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface TimetableSession {
  id: string;
  name: string;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
}

export interface TimetableEntry {
  id: string;
  session_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  created_at: string;
  // Joined fields
  subject_name?: string;
  teacher_name?: string;
  class_name?: string;
  section_name?: string;
}

export interface AttendanceConfig {
  id: string;
  start_time: string;
  end_time: string;
  is_restriction_enabled: boolean;
  early_leave_start_time?: string;
  early_leave_end_time?: string;
  is_early_leave_restriction_enabled?: boolean;
  updated_at: string;
}

export interface EarlyLeave {
  id: string;
  student_id: string;
  date: string;
  exit_time: string;
  reason: string;
  created_by?: string;
  created_at?: string;
}

export interface AiSettings {
  id: string;
  global_daily_limit: number;
  daily_reset_time: string;
  is_system_enabled: boolean;
  limit_reached_message: string;
  warning_message: string;
  reset_info_message: string;
  individual_disabled_message: string;
  class_disabled_message: string;
  system_unavailable_message: string;
  max_messages_per_chat: number;
  access_grades_enabled: boolean;
  access_attendance_enabled: boolean;
  access_exams_enabled: boolean;
  access_fees_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiChatSession {
  id: string;
  student_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: any[];
  created_at: string;
}

export interface AiStudentConfig {
  id: string;
  student_id: string;
  is_enabled: boolean;
  daily_limit: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
  class_name?: string;
  section_name?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  is_active: boolean;
  rate_limit_minute: number;
  created_at: string;
  last_used_at?: string;
  created_by?: string;
}

export interface ApiEndpoint {
  id: string;
  module_name: string;
  path: string;
  methods: string[];
  exposed_fields: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiLog {
  id: string;
  key_id?: string;
  endpoint_id?: string;
  method: string;
  path: string;
  status_code: number;
  ip_address?: string;
  request_payload?: any;
  response_summary?: string;
  created_at: string;
}

export interface AiClassConfig {
  id: string;
  class_id: string;
  is_enabled: boolean;
  daily_limit: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  class_name?: string;
}

export interface AiUsage {
  id: string;
  student_id: string;
  usage_date: string;
  message_count: number;
  total_historical_usage: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  student_name?: string;
}



export type QuizStatus = 'draft' | 'preview' | 'published' | 'active' | 'scheduled' | 'completed' | 'archived';
export type QuizAnswerMode = 'instant' | 'confirm' | 'end';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizAssignmentTargetType = 'class' | 'section' | 'student';
export type QuizAttemptStatus = 'in_progress' | 'completed' | 'expired';

export interface Quiz {
  id: string;
  school_id: string | null;
  title: string;
  description: string | null;
  subject_id: string | null;
  chapter: string | null;
  topic: string | null;
  category: string | null;
  academic_session: string | null;
  difficulty: QuizDifficulty;
  cover_url: string | null;
  icon: string | null;
  status: QuizStatus;
  answer_mode: QuizAnswerMode;
  timer_seconds: number | null;
  passing_percentage: number;
  max_attempts: number;
  negative_marks: number;
  marks_per_question: number;
  random_questions: boolean;
  random_options: boolean;
  allow_navigation: boolean;
  show_explanations: boolean;
  allow_retry: boolean;
  show_result_review: boolean;
  study_ai_enabled: boolean;
  show_leaderboard: boolean;
  number_of_questions: number | null;
  start_at: string | null;
  end_at: string | null;
  appearance: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined / computed fields
  subject_name?: string;
  question_count?: number;
  my_attempts?: QuizAttempt[];
  assignments?: QuizAssignment[];
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  image_url: string | null;
  explanation: string | null;
  marks: number;
  difficulty: QuizDifficulty;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  question_id: string | null;
  metadata: Record<string, unknown>;
  order_index: number;
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
}

export interface QuizAssignment {
  id: string;
  quiz_id: string;
  target_type: QuizAssignmentTargetType;
  target_id: string;
  created_at: string;
  target_name?: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  profile_id: string;
  started_at: string;
  submitted_at: string | null;
  status: QuizAttemptStatus;
  score: number;
  total_marks: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_spent_seconds: number;
  current_question_index: number;
  attempt_number: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
  quiz?: Quiz;
  student?: Student;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean | null;
  marks_obtained: number | null;
  time_spent_seconds: number;
  answered_at: string | null;
  created_at: string;
  question?: Question;
  selected_option?: QuestionOption;
  correct_option?: QuestionOption;
}

export interface QuizAiInteraction {
  id: string;
  attempt_id: string;
  question_id: string;
  student_id: string;
  profile_id: string;
  messages: { role: 'user' | 'assistant'; content: string; created_at?: string }[];
  created_at: string;
  updated_at: string;
}

export interface PlayerQuestion {
  question_id: string;
  question_text: string;
  image_url: string | null;
  marks: number;
  difficulty: QuizDifficulty;
  order_index: number;
  explanation: string | null;
  correct_option_id: string | null;
  options: { option_id: string; option_text: string; order_index: number }[];
}

export interface QuizPlayerData {
  quiz_id: string;
  attempt_id: string;
  answer_mode: QuizAnswerMode;
  questions: PlayerQuestion[];
}

export interface QuizResultReview {
  quiz_id: string;
  attempt: QuizAttempt;
  show_explanations: boolean;
  questions: {
    question_id: string;
    question_text: string;
    image_url: string | null;
    explanation: string | null;
    marks: number;
    order_index: number;
    selected_option_id: string | null;
    is_correct: boolean | null;
    marks_obtained: number | null;
    time_spent_seconds: number;
    answered_at: string | null;
    correct_option_id: string | null;
    options: { id: string; option_text: string; order_index: number }[];
  }[];
}

export interface QuizAnalytics {
  quiz_id: string;
  assigned: number;
  started: number;
  completed: number;
  average_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  average_time_seconds: number | null;
  pass_percentage: number | null;
}

export interface QuestionWiseAnalytics {
  question_id: string;
  question_text: string;
  difficulty: QuizDifficulty;
  total_attempts: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number | null;
  option_stats: { option_text: string; selected_count: number }[];
}

export interface StudentPanelSetting {
  id: string;
  school_id: string;
  key: string;
  label: string;
  description: string | null;
  type: 'text' | 'toggle' | 'select' | 'textarea';
  options: string[];
  value: unknown;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StudentPanelNotification {
  id: string;
  school_id: string;
  key: string;
  label: string;
  description: string | null;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StudentPanelHelpSupport {
  id: string;
  school_id: string;
  title: string;
  content: string;
  category: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StudentPanelPrivacyPolicy {
  id: string;
  school_id: string;
  title: string;
  content: string;
  version: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
