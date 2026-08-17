-- Table for Certificate Templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  document_type text NOT NULL, -- 'certificate' | 'id_card'
  page_size jsonb NOT NULL, -- { width: number, height: number }
  layout_config jsonb NOT NULL, -- Array of elements
  created_at timestamp with time zone DEFAULT now()
);

-- Seed Initial Academic Certificate Template
INSERT INTO certificate_templates (name, document_type, page_size, layout_config)
VALUES (
  'academic_certificate',
  'certificate',
  '{"width": 841.89, "height": 595.28}', -- A4 Landscape
  '[
    {"type": "rect", "x": 20, "y": 20, "width": 801.89, "height": 555.28, "border": 2, "borderColor": [0,0,0]},
    {"type": "rect", "x": 25, "y": 25, "width": 791.89, "height": 545.28, "border": 1, "borderColor": [0.1, 0.2, 0.4]},
    {"type": "branding_image", "key": "school_logo_url", "x": 370.94, "y": 475.28, "scale": 0.3, "align": "center"},
    {"type": "branding_text", "key": "school_name", "x": 0, "y": 445.28, "size": 28, "font": "HelveticaBold", "color": [0.1, 0.2, 0.4], "align": "center", "width": 841.89},
    {"type": "static_text", "text": "STUDENT ACHIEVEMENT CERTIFICATE", "x": 0, "y": 395.28, "size": 34, "font": "HelveticaBold", "color": [0.2, 0.3, 0.5], "align": "center", "width": 841.89},
    {"type": "student_image", "key": "profile_picture_url", "x": 370.94, "y": 275.28, "width": 100, "height": 100, "align": "center"},
    {"type": "static_text", "text": "This is to certify that", "x": 0, "y": 240.28, "size": 18, "font": "Helvetica", "align": "center", "width": 841.89},
    {"type": "student_text", "key": "name", "transform": "uppercase", "x": 0, "y": 200.28, "size": 30, "font": "HelveticaBold", "color": [0.1, 0.2, 0.4], "align": "center", "width": 841.89},
    {"type": "student_info_text", "template": "Student ID: {login_id} | Class: {class} | Section: {section}", "x": 0, "y": 170.28, "size": 16, "font": "Helvetica", "align": "center", "width": 841.89},
    {"type": "student_info_text", "template": "has successfully completed the {session_info} Academic Session.", "x": 0, "y": 140.28, "size": 18, "font": "Helvetica", "align": "center", "width": 841.89},
    {"type": "branding_image", "key": "school_seal_url", "x": 100, "y": 60, "scale": 0.15},
    {"type": "branding_image", "key": "principal_signature_url", "x": 591.89, "y": 80, "scale": 0.4},
    {"type": "line", "x1": 571.89, "y1": 75, "x2": 741.89, "y2": 75, "thickness": 1, "color": [0,0,0]},
    {"type": "branding_text", "key": "principal_name", "x": 571.89, "y": 60, "size": 14, "font": "HelveticaBold", "align": "center", "width": 170},
    {"type": "static_text", "text": "Principal Signature", "x": 571.89, "y": 45, "size": 10, "font": "Helvetica", "align": "center", "width": 170}
  ]'
) ON CONFLICT (name) DO UPDATE SET layout_config = EXCLUDED.layout_config;

-- Seed Initial ID Card Template
INSERT INTO certificate_templates (name, document_type, page_size, layout_config)
VALUES (
  'id_card',
  'id_card',
  '{"width": 242.6, "height": 153.1}', -- Standard ID Card size
  '[
    {"type": "rect", "x": 0, "y": 0, "width": 242.6, "height": 153.1, "color": [0.98, 0.98, 1]},
    {"type": "rect", "x": 0, "y": 113.1, "width": 242.6, "height": 40, "color": [0.1, 0.2, 0.4]},
    {"type": "branding_image", "key": "school_logo_url", "x": 10, "y": 118.1, "scale": 0.08},
    {"type": "branding_text", "key": "school_name", "transform": "uppercase", "x": 45, "y": 128.1, "size": 9, "font": "HelveticaBold", "color": [1, 1, 1]},
    {"type": "static_text", "text": "IDENTITY CARD", "x": 45, "y": 118.1, "size": 7, "font": "Helvetica", "color": [0.8, 0.8, 1]},
    {"type": "student_image", "key": "profile_picture_url", "x": 10, "y": 40, "width": 60, "height": 60, "border": 1, "borderColor": [0.1, 0.2, 0.4]},
    {"type": "student_text", "key": "name", "transform": "uppercase", "x": 80, "y": 95, "size": 10, "font": "HelveticaBold", "color": [0, 0, 0]},
    {"type": "student_info_text", "template": "ID: {login_id}", "x": 80, "y": 83, "size": 8, "font": "HelveticaBold", "color": [0.1, 0.2, 0.4]},
    {"type": "student_info_text", "template": "Class: {class}", "x": 80, "y": 68, "size": 7, "font": "HelveticaBold", "color": [0.4, 0.4, 0.4], "label": "Class:", "labelColor": [0.4, 0.4, 0.4]},
    {"type": "student_info_text", "template": "Session: {session_info}", "x": 80, "y": 58, "size": 7, "font": "HelveticaBold", "color": [0.4, 0.4, 0.4]},
    {"type": "rect", "x": 0, "y": 0, "width": 242.6, "height": 15, "color": [0.1, 0.2, 0.4]}
  ]'
) ON CONFLICT (name) DO UPDATE SET layout_config = EXCLUDED.layout_config;