/**
 * Placeholder Resolver
 *
 * Builds a flat map from every DOCUMENT_PLACEHOLDERS key → its actual value
 * resolved from Student + BrandingSettings live data.
 *
 * CONTRACT:
 *  - Every key in DOCUMENT_PLACEHOLDERS must have an entry in `raw` below.
 *  - Every entry in `raw` must map to a real field on Student or BrandingSettings,
 *    or a deterministic computed value (today's date, verification URL, etc.).
 *  - No mock/demo/sample values are ever used.
 *  - Falls back to the placeholder's registered `fallback` string when a value
 *    is missing, so templates never render raw "{{…}}" tokens.
 */
import type { Student, BrandingSettings, FeeReceiptData } from '@/types';
import { DOCUMENT_PLACEHOLDERS } from '@/constants/placeholders';

export type PlaceholderMap = Record<string, string>;

function fmt(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return date;
  }
}

function inr(n: number): string {
  if (n == null || Number.isNaN(n)) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Build a complete placeholder → value map for a given student + branding pair.
 * Every key in DOCUMENT_PLACEHOLDERS is guaranteed to be present in the result.
 *
 * @param feeData Optional fee-receipt line items. When provided, fee placeholders resolve
 *                to formatted INR values; otherwise they fall back to empty/zero.
 */
export function buildPlaceholderMap(
  student: Student,
  branding: BrandingSettings,
  feeData?: FeeReceiptData,
): PlaceholderMap {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // ── Raw mappings — each key maps to a real DB field or computed value ──────
  const raw: Record<string, string> = {

    // ── Student Data → students table ─────────────────────────────────────
    '{{student_full_name}}':          student.name            ?? '',
    '{{student_login_id}}':           student.login_id        ?? '',
    '{{student_verification_id}}':    student.verification_id ?? '',
    '{{student_class}}':              student.class           ?? '',
    '{{student_section}}':            student.section         ?? '',
    '{{student_gender}}':             student.gender          ?? '',
    '{{date_of_birth}}':              fmt(student.dob),
    '{{academic_session}}':           student.session_info    ?? branding.default_academic_session ?? '',
    '{{student_contact}}':            student.contact         ?? '',
    '{{student_email}}':              student.email           ?? '',
    '{{student_type}}':               student.student_type    ?? '',
    '{{student_rank}}':               student.rank != null ? String(student.rank) : '',
    '{{student_status}}':             student.status          ?? 'active',
    // Roll number: prefer explicit roll_number column; fall back to rank only as legacy behavior
    '{{student_roll_number}}':        student.roll_number ?? (student.rank != null ? String(student.rank) : ''),
    '{{student_photo_url}}':          student.profile_picture_url ?? '',
    '{{promotion_date}}':             fmt(student.promotion_date),
    '{{enrollment_date}}':            fmt(student.created_at),

    // ── School Branding → branding_settings table ─────────────────────────
    '{{school_official_name}}':       branding.school_name             ?? '',
    '{{school_short_name}}':          branding.school_short_name       ?? '',
    '{{school_logo_url}}':            branding.school_logo_url         ?? '',
    '{{school_complete_address}}':    [
                                        branding.school_address,
                                        branding.school_city,
                                        branding.school_state,
                                        branding.school_pin_code,
                                      ].filter(Boolean).join(', '),
    '{{school_address}}':             branding.school_address          ?? '',
    '{{school_city}}':                branding.school_city             ?? '',
    '{{school_state}}':               branding.school_state            ?? '',
    '{{school_pin_code}}':            branding.school_pin_code         ?? '',
    '{{school_contact_phone}}':       branding.school_phone            ?? '',
    '{{school_contact_email}}':       branding.school_email            ?? '',
    '{{school_website}}':             branding.school_website          ?? '',
    '{{school_motto}}':               branding.school_motto            ?? '',
    '{{school_footer_text}}':         branding.school_footer_text      ?? '',
    '{{school_registration_number}}': branding.school_registration_number ?? '',
    '{{affiliation_number}}':         branding.affiliation_number      ?? '',
    '{{affiliation_board}}':          branding.affiliation_board       ?? '',

    // Canonical aliases kept for template backward-compatibility
    '{{school_name}}':                branding.school_name             ?? '',
    '{{school_phone}}':               branding.school_phone            ?? '',
    '{{school_email}}':               branding.school_email            ?? '',

    // ── Authority & Validation → branding_settings table ─────────────────
    '{{principal_full_name}}':            branding.principal_name          ?? '',
    '{{principal_signature_image_url}}':  branding.principal_signature_url ?? '',
    '{{school_official_seal_image_url}}': branding.school_seal_url         ?? '',
    '{{verification_url}}':
      typeof window !== 'undefined'
        ? `${window.location.origin}/verify?id=${student.verification_id}`
        : `/verify?id=${student.verification_id}`,

    // Canonical aliases
    '{{principal_name}}':             branding.principal_name          ?? '',
    '{{principal_signature}}':        branding.principal_signature_url ?? '',
    '{{school_seal}}':                branding.school_seal_url         ?? '',

    // ── Admission Details → students table (login_id = admission ref) ─────
    // There is no separate admissions table linked to enrolled students.
    // The student login_id serves as the admission reference number.
    '{{admission_reference_number}}': student.login_id    ?? '',
    '{{admission_date}}':             fmt(student.created_at),

    // ── Certificate Data — computed at generation time ────────────────────
    '{{certificate_title}}':    'Student ID Card',
    '{{certificate_issue_date}}': today,

    // ── Academic Results — empty by default; populated by exam context ────
    // No exam_results table exists yet. Values remain empty unless an exam
    // generation workflow provides them via a separate context parameter.
    '{{marks_obtained}}':        '',
    '{{marks_total}}':           '',
    '{{grade_awarded}}':         '',
    '{{overall_result_status}}': '',

    // ── Fee Receipt Data — supplied at generation time ──────────────────────
    '{{receipt_number}}':   feeData?.receipt_number ?? '',
    '{{tuition_fee}}':      feeData ? inr(feeData.tuition_fee) : '',
    '{{admission_fee}}':    feeData ? inr(feeData.admission_fee) : '',
    '{{examination_fee}}':  feeData ? inr(feeData.examination_fee) : '',
    '{{discount}}':         feeData ? inr(feeData.discount) : '',
    '{{previous_due}}':     feeData ? inr(feeData.previous_due) : '',
    '{{grand_total}}':      feeData ? inr(feeData.grand_total) : '',

    // ── General System — computed ─────────────────────────────────────────
    '{{document_generation_date}}': today,
    '{{current_date}}':             today,
  };

  // ── Merge: for every registered placeholder, prefer raw value, else fallback
  const resolved: PlaceholderMap = {};
  for (const meta of DOCUMENT_PLACEHOLDERS) {
    const v = raw[meta.key];
    resolved[meta.key] = (v !== undefined && v !== '') ? v : (meta.fallback ?? '');
  }

  // ── Also include alias keys that exist in raw but not in DOCUMENT_PLACEHOLDERS
  for (const [key, value] of Object.entries(raw)) {
    if (!(key in resolved)) resolved[key] = value;
  }

  return resolved;
}

/**
 * Replace all {{…}} tokens in a text string using the provided map.
 * Unknown tokens are left as-is so debugging is easy.
 */
export function resolvePlaceholder(text: string, map: PlaceholderMap): string {
  return text.replace(/\{\{[^}]+\}\}/g, (token) => map[token] ?? '');
}
