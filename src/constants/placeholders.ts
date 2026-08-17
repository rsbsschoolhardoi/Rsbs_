/**
 * DOCUMENT_PLACEHOLDERS — Single source of truth for every template variable.
 *
 * Design contract:
 *  1. Every entry here MUST have a corresponding mapping in placeholderResolver.ts.
 *  2. Every mapping in placeholderResolver.ts MUST trace back to a real DB field
 *     (Student, BrandingSettings, Certificate, or a computed system value).
 *  3. ComponentLibrary reads this file at runtime — adding an entry here
 *     automatically makes it available in Template Studio with zero extra coding.
 *  4. templatePresets.ts validates all preset placeholders against this set.
 *
 * Categories:
 *  - Student Data          → students table
 *  - School Branding       → branding_settings table
 *  - Authority & Validation→ branding_settings table (signatures, seal)
 *  - Admission Details     → derived from student record (login_id, created_at)
 *  - Certificate Data      → certificates table + system-computed
 *  - Academic Results      → system-computed / exam context (no exam_results table yet)
 *  - General System        → computed at generation time
 */

export type PlaceholderCategory =
  | 'Student Data'
  | 'School Branding'
  | 'Authority & Validation'
  | 'Admission Details'
  | 'Certificate Data'
  | 'Academic Results'
  | 'Fee Receipt Data'
  | 'General System';

export type PlaceholderDataType = 'String' | 'Date' | 'Image URL' | 'Number' | 'URL';

export interface PlaceholderMetadata {
  key: string;
  label: string;
  category: PlaceholderCategory;
  dataType: PlaceholderDataType;
  description: string;
  fallback: string;
  /** DB source field path, e.g. "students.name" — for documentation only */
  source?: string;
}

export const DOCUMENT_PLACEHOLDERS: PlaceholderMetadata[] = [

  // ─── Student Data ─────────────────────────────────────────────────────────
  {
    key: '{{student_full_name}}',
    label: 'Student Full Name',
    category: 'Student Data',
    dataType: 'String',
    description: 'Complete legal name of the student.',
    fallback: '[Student Name Not Found]',
    source: 'students.name',
  },
  {
    key: '{{student_login_id}}',
    label: 'Student Login ID',
    category: 'Student Data',
    dataType: 'String',
    description: 'System-assigned login ID (e.g. RSBS0N3SE).',
    fallback: '[Login ID Not Found]',
    source: 'students.login_id',
  },
  {
    key: '{{student_verification_id}}',
    label: 'Student Verification ID',
    category: 'Student Data',
    dataType: 'String',
    description: 'Unique verification code for the student.',
    fallback: '[ID Not Found]',
    source: 'students.verification_id',
  },
  {
    key: '{{student_class}}',
    label: 'Student Class',
    category: 'Student Data',
    dataType: 'String',
    description: 'Current grade level (e.g. 10th).',
    fallback: '[Class Not Found]',
    source: 'students.class',
  },
  {
    key: '{{student_section}}',
    label: 'Student Section',
    category: 'Student Data',
    dataType: 'String',
    description: 'Assigned classroom section (e.g. A).',
    fallback: '[Section Not Found]',
    source: 'students.section',
  },
  {
    key: '{{student_gender}}',
    label: 'Student Gender',
    category: 'Student Data',
    dataType: 'String',
    description: 'Gender as recorded in the student record.',
    fallback: '',
    source: 'students.gender',
  },
  {
    key: '{{date_of_birth}}',
    label: 'Date of Birth',
    category: 'Student Data',
    dataType: 'Date',
    description: 'Student date of birth — formatted DD/MM/YYYY.',
    fallback: '[DOB Not Found]',
    source: 'students.dob',
  },
  {
    key: '{{academic_session}}',
    label: 'Academic Session',
    category: 'Student Data',
    dataType: 'String',
    description: 'Current academic year (e.g. 2024-2025).',
    fallback: '[Session Not Found]',
    source: 'students.session_info',
  },
  {
    key: '{{student_contact}}',
    label: 'Student Contact Number',
    category: 'Student Data',
    dataType: 'String',
    description: 'Primary contact phone number of the student.',
    fallback: '',
    source: 'students.contact',
  },
  {
    key: '{{student_email}}',
    label: 'Student Email',
    category: 'Student Data',
    dataType: 'String',
    description: 'Student email address.',
    fallback: '',
    source: 'students.email',
  },
  {
    key: '{{student_type}}',
    label: 'Student Type',
    category: 'Student Data',
    dataType: 'String',
    description: 'Student type/category (e.g. Regular, Scholarship).',
    fallback: '',
    source: 'students.student_type',
  },
  {
    key: '{{student_rank}}',
    label: 'Student Rank',
    category: 'Student Data',
    dataType: 'Number',
    description: 'Student rank in their class.',
    fallback: '',
    source: 'students.rank',
  },
  {
    key: '{{student_status}}',
    label: 'Student Status',
    category: 'Student Data',
    dataType: 'String',
    description: 'Current status: active or passout.',
    fallback: 'active',
    source: 'students.status',
  },
  {
    key: '{{student_roll_number}}',
    label: 'Roll Number',
    category: 'Student Data',
    dataType: 'String',
    description: 'Student rank used as roll number.',
    fallback: '',
    source: 'students.rank',
  },
  {
    key: '{{student_photo_url}}',
    label: 'Student Photo',
    category: 'Student Data',
    dataType: 'Image URL',
    description: 'Student profile photo URL (rendered as image).',
    fallback: '',
    source: 'students.profile_picture_url',
  },
  {
    key: '{{promotion_date}}',
    label: 'Promotion Date',
    category: 'Student Data',
    dataType: 'Date',
    description: 'Date the student was promoted to the current class.',
    fallback: '',
    source: 'students.promotion_date',
  },
  {
    key: '{{enrollment_date}}',
    label: 'Enrollment Date',
    category: 'Student Data',
    dataType: 'Date',
    description: 'Date the student record was created.',
    fallback: '',
    source: 'students.created_at',
  },

  // ─── School Branding ──────────────────────────────────────────────────────
  {
    key: '{{school_official_name}}',
    label: 'School Official Name',
    category: 'School Branding',
    dataType: 'String',
    description: 'Full official registered name of the school.',
    fallback: '[School Name Not Found]',
    source: 'branding_settings.school_name',
  },
  {
    key: '{{school_short_name}}',
    label: 'School Short Name',
    category: 'School Branding',
    dataType: 'String',
    description: 'Abbreviated school name or acronym.',
    fallback: '',
    source: 'branding_settings.school_short_name',
  },
  {
    key: '{{school_logo_url}}',
    label: 'School Logo',
    category: 'School Branding',
    dataType: 'Image URL',
    description: 'Official school logo URL (rendered as image).',
    fallback: '',
    source: 'branding_settings.school_logo_url',
  },
  {
    key: '{{school_complete_address}}',
    label: 'School Full Address',
    category: 'School Branding',
    dataType: 'String',
    description: 'Complete address: street, city, state, PIN.',
    fallback: '[Address Not Found]',
    source: 'branding_settings.school_address + city + state + pin_code',
  },
  {
    key: '{{school_address}}',
    label: 'School Street Address',
    category: 'School Branding',
    dataType: 'String',
    description: 'Street/locality address only.',
    fallback: '',
    source: 'branding_settings.school_address',
  },
  {
    key: '{{school_city}}',
    label: 'School City',
    category: 'School Branding',
    dataType: 'String',
    description: 'City where the school is located.',
    fallback: '',
    source: 'branding_settings.school_city',
  },
  {
    key: '{{school_state}}',
    label: 'School State',
    category: 'School Branding',
    dataType: 'String',
    description: 'State where the school is located.',
    fallback: '',
    source: 'branding_settings.school_state',
  },
  {
    key: '{{school_pin_code}}',
    label: 'School PIN Code',
    category: 'School Branding',
    dataType: 'String',
    description: 'Postal PIN code of the school.',
    fallback: '',
    source: 'branding_settings.school_pin_code',
  },
  {
    key: '{{school_contact_phone}}',
    label: 'School Phone',
    category: 'School Branding',
    dataType: 'String',
    description: 'Primary contact number of the school.',
    fallback: '',
    source: 'branding_settings.school_phone',
  },
  {
    key: '{{school_contact_email}}',
    label: 'School Email',
    category: 'School Branding',
    dataType: 'String',
    description: 'Primary official email of the school.',
    fallback: '',
    source: 'branding_settings.school_email',
  },
  {
    key: '{{school_website}}',
    label: 'School Website',
    category: 'School Branding',
    dataType: 'URL',
    description: 'Official school website URL.',
    fallback: '',
    source: 'branding_settings.school_website',
  },
  {
    key: '{{school_motto}}',
    label: 'School Motto',
    category: 'School Branding',
    dataType: 'String',
    description: 'Official school motto or tagline.',
    fallback: '',
    source: 'branding_settings.school_motto',
  },
  {
    key: '{{school_footer_text}}',
    label: 'School Footer Text',
    category: 'School Branding',
    dataType: 'String',
    description: 'Footer text shown at bottom of official documents.',
    fallback: '',
    source: 'branding_settings.school_footer_text',
  },
  {
    key: '{{school_registration_number}}',
    label: 'School Registration No.',
    category: 'School Branding',
    dataType: 'String',
    description: 'Govt registration number of the school.',
    fallback: '',
    source: 'branding_settings.school_registration_number',
  },
  {
    key: '{{affiliation_number}}',
    label: 'Affiliation Number',
    category: 'School Branding',
    dataType: 'String',
    description: 'Board affiliation number (e.g. CBSE affiliation).',
    fallback: '',
    source: 'branding_settings.affiliation_number',
  },
  {
    key: '{{affiliation_board}}',
    label: 'Affiliation Board',
    category: 'School Branding',
    dataType: 'String',
    description: 'Name of affiliation board (e.g. CBSE, ICSE, UP Board).',
    fallback: '',
    source: 'branding_settings.affiliation_board',
  },

  // ─── Authority & Validation ───────────────────────────────────────────────
  {
    key: '{{principal_full_name}}',
    label: 'Principal Full Name',
    category: 'Authority & Validation',
    dataType: 'String',
    description: 'Full name of the current school principal.',
    fallback: '[Principal Name Not Found]',
    source: 'branding_settings.principal_name',
  },
  {
    key: '{{principal_signature_image_url}}',
    label: 'Principal Signature',
    category: 'Authority & Validation',
    dataType: 'Image URL',
    description: 'Scanned principal signature (rendered as image).',
    fallback: '',
    source: 'branding_settings.principal_signature_url',
  },
  {
    key: '{{school_official_seal_image_url}}',
    label: 'School Official Seal',
    category: 'Authority & Validation',
    dataType: 'Image URL',
    description: 'Official school stamp/seal (rendered as image).',
    fallback: '',
    source: 'branding_settings.school_seal_url',
  },
  {
    key: '{{verification_url}}',
    label: 'Verification URL',
    category: 'Authority & Validation',
    dataType: 'URL',
    description: 'Live URL to verify this document online.',
    fallback: '',
    source: 'computed: origin + /verify?id= + students.verification_id',
  },

  // ─── Admission Details ────────────────────────────────────────────────────
  {
    key: '{{admission_reference_number}}',
    label: 'Admission Ref. Number',
    category: 'Admission Details',
    dataType: 'String',
    description: 'Student login ID used as admission reference.',
    fallback: '[Ref No. Not Found]',
    source: 'students.login_id',
  },
  {
    key: '{{admission_date}}',
    label: 'Admission Date',
    category: 'Admission Details',
    dataType: 'Date',
    description: 'Date student record was created (DD/MM/YYYY).',
    fallback: '',
    source: 'students.created_at',
  },

  // ─── Certificate Data ─────────────────────────────────────────────────────
  {
    key: '{{certificate_title}}',
    label: 'Certificate Title',
    category: 'Certificate Data',
    dataType: 'String',
    description: 'Title of this document (e.g. Certificate of Merit).',
    fallback: 'Certificate',
    source: 'computed: document type name',
  },
  {
    key: '{{certificate_issue_date}}',
    label: 'Certificate Issue Date',
    category: 'Certificate Data',
    dataType: 'Date',
    description: 'Date this document was generated (DD/MM/YYYY).',
    fallback: '[Issue Date Not Found]',
    source: 'computed: today',
  },

  // ─── Academic Results ─────────────────────────────────────────────────────
  {
    key: '{{marks_obtained}}',
    label: 'Marks Obtained',
    category: 'Academic Results',
    dataType: 'Number',
    description: 'Total marks secured by the student (if provided).',
    fallback: '',
    source: 'context: exam generation params',
  },
  {
    key: '{{marks_total}}',
    label: 'Total Marks',
    category: 'Academic Results',
    dataType: 'Number',
    description: 'Maximum possible marks (if provided).',
    fallback: '',
    source: 'context: exam generation params',
  },
  {
    key: '{{grade_awarded}}',
    label: 'Grade Awarded',
    category: 'Academic Results',
    dataType: 'String',
    description: 'Letter grade (e.g. A+, B) if provided.',
    fallback: '',
    source: 'context: exam generation params',
  },
  {
    key: '{{overall_result_status}}',
    label: 'Overall Result Status',
    category: 'Academic Results',
    dataType: 'String',
    description: 'Pass / Distinction / Promoted etc.',
    fallback: '',
    source: 'context: exam generation params',
  },

  // ─── Fee Receipt Data ─────────────────────────────────────────────────────
  {
    key: '{{receipt_number}}',
    label: 'Receipt Number',
    category: 'Fee Receipt Data',
    dataType: 'String',
    description: 'Unique receipt number assigned to this transaction.',
    fallback: '[Receipt No. Not Found]',
    source: 'FeeReceiptData.receipt_number',
  },
  {
    key: '{{tuition_fee}}',
    label: 'Tuition Fee',
    category: 'Fee Receipt Data',
    dataType: 'Number',
    description: 'Tuition fee amount in INR.',
    fallback: '0.00',
    source: 'FeeReceiptData.tuition_fee',
  },
  {
    key: '{{admission_fee}}',
    label: 'Admission Fee',
    category: 'Fee Receipt Data',
    dataType: 'Number',
    description: 'Admission fee amount in INR.',
    fallback: '0.00',
    source: 'FeeReceiptData.admission_fee',
  },
  {
    key: '{{examination_fee}}',
    label: 'Examination Fee',
    category: 'Fee Receipt Data',
    dataType: 'Number',
    description: 'Examination fee amount in INR.',
    fallback: '0.00',
    source: 'FeeReceiptData.examination_fee',
  },
  {
    key: '{{discount}}',
    label: 'Discount',
    category: 'Fee Receipt Data',
    dataType: 'Number',
    description: 'Discount applied to the receipt.',
    fallback: '0.00',
    source: 'FeeReceiptData.discount',
  },
  {
    key: '{{previous_due}}',
    label: 'Previous Due',
    category: 'Fee Receipt Data',
    dataType: 'Number',
    description: 'Outstanding dues from previous period.',
    fallback: '0.00',
    source: 'FeeReceiptData.previous_due',
  },
  {
    key: '{{grand_total}}',
    label: 'Grand Total',
    category: 'Fee Receipt Data',
    dataType: 'Number',
    description: 'Final payable / paid amount after discount and previous dues.',
    fallback: '0.00',
    source: 'FeeReceiptData.grand_total',
  },

  // ─── General System ───────────────────────────────────────────────────────
  {
    key: '{{document_generation_date}}',
    label: 'Generation Date',
    category: 'General System',
    dataType: 'Date',
    description: 'Date this document was auto-generated (DD/MM/YYYY).',
    fallback: '[Current Date]',
    source: 'computed: today',
  },
  {
    key: '{{current_date}}',
    label: 'Current Date',
    category: 'General System',
    dataType: 'Date',
    description: 'Today\'s date (DD/MM/YYYY) — alias for Generation Date.',
    fallback: '',
    source: 'computed: today',
  },
];

// ─── Helper utilities ─────────────────────────────────────────────────────────

export const getPlaceholderByKey = (key: string): PlaceholderMetadata | undefined =>
  DOCUMENT_PLACEHOLDERS.find(p => p.key === key);

/** Returns all placeholders grouped by category — used by ComponentLibrary */
export const getPlaceholdersByCategory = (): Record<PlaceholderCategory, PlaceholderMetadata[]> => {
  const categories: Record<PlaceholderCategory, PlaceholderMetadata[]> = {
    'Student Data': [],
    'School Branding': [],
    'Authority & Validation': [],
    'Admission Details': [],
    'Certificate Data': [],
    'Academic Results': [],
    'Fee Receipt Data': [],
    'General System': [],
  };
  DOCUMENT_PLACEHOLDERS.forEach(p => { categories[p.category].push(p); });
  return categories;
};

/** Set of valid placeholder keys — for fast validation in templatePresets.ts */
export const VALID_PLACEHOLDER_KEYS: Set<string> = new Set(
  DOCUMENT_PLACEHOLDERS.map(p => p.key),
);

/**
 * SYNC CONTRACT:
 *
 * When you add a new DB field:
 *  1. Add it to the relevant TypeScript interface in types/index.ts
 *  2. Add a PlaceholderMetadata entry to DOCUMENT_PLACEHOLDERS above
 *  3. Add the mapping in placeholderResolver.ts → buildPlaceholderMap()
 *
 * That's it — ComponentLibrary, templatePresets validator, and PDF generator
 * all pick up the new placeholder automatically from step 2.
 */
