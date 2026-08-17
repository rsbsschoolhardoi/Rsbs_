import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Student, BrandingSettings } from '@/types';

/**
 * Converts a URL to a data URL (Base64)
 */
async function getBase64FromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return null;
  }
}

/**
 * Generates a professional, print-ready PDF for a standardized Student ID Card
 * Dimensions: 85.6mm x 54mm (CR80 Standard)
 */
export async function generateStudentIDCard(student: Student, branding: BrandingSettings) {
  // Create a new PDF document in landscape orientation with mm units
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54]
  });

  const width = 85.6;
  const height = 54;
  const margin = 3; // Standard safe margin
  
  // Professional Color Palette (Navy Theme)
  const primaryColor = [19, 68, 204]; // #1344cc
  const secondaryColor = [241, 245, 249]; // #f1f5f9
  const accentColor = [30, 41, 59]; // Slate 800 (Text)
  const mutedColor = [100, 116, 139]; // Slate 500 (Labels)

  // 1. Base Setup & Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  
  // 2. Header Section (Top Area)
  // Background stripe for header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, width, 14, 'F');

  // Left-Aligned: School Logo
  if (branding.school_logo_url) {
    const logoBase64 = await getBase64FromUrl(branding.school_logo_url);
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin + 1, 2, 10, 10);
    }
  }

  // Right-Aligned: School Name & Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const schoolName = branding.school_name.toUpperCase();
  doc.text(schoolName, width - margin - 1, 6, { align: 'right' });

  // Centered Below School Name: "STUDENT ID CARD"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  // Calculating center point for the label relative to the school name area
  const nameWidth = doc.getTextWidth(schoolName);
  const labelX = width - margin - 1 - (nameWidth / 2);
  doc.text('STUDENT ID CARD', width - margin - 1, 10, { align: 'right' });

  // 3. Body Section (Central Area)
  const bodyTop = 18;
  
  // Left Column (Fixed Width): Student Photograph
  const photoWidth = 25;
  const photoHeight = 30;
  const photoX = margin + 2;
  const photoY = bodyTop;
  
  doc.setDrawColor(226, 232, 240); // Subtle border
  doc.setLineWidth(0.1);
  doc.rect(photoX, photoY, photoWidth, photoHeight, 'S');
  
  if (student.profile_picture_url) {
    const photoBase64 = await getBase64FromUrl(student.profile_picture_url);
    if (photoBase64) {
      // Crop/Fit to portrait orientation
      doc.addImage(photoBase64, 'JPEG', photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1);
    }
  } else {
    doc.setFillColor(248, 250, 252);
    doc.rect(photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1, 'F');
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(8);
    doc.text('PHOTO', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
  }

  // Right Column (Fluid Width): Student Details
  const detailsX = photoX + photoWidth + 5;
  let currentY = bodyTop + 4;
  const spacing = 5;

  // Student Name (Prominent)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(student.name.toUpperCase(), detailsX, currentY);
  currentY += 6;

  // Other Fields
  doc.setFontSize(7);
  const fields = [
    { label: 'Verification ID', value: student.verification_id },
    { label: 'Class', value: student.class },
    { label: 'Section', value: student.section },
    { label: 'Session', value: student.session_info }
  ];

  fields.forEach(field => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(field.label.toUpperCase(), detailsX, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(field.value, detailsX + 22, currentY);
    
    currentY += spacing;
  });

  // 4. Footer Section (Bottom Area)
  const footerY = height - margin - 1;

  // Left-Aligned: QR Code
  const qrSize = 10;
  const verifyUrl = `${window.location.origin}/verify?id=${student.verification_id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', margin + 1, height - qrSize - margin, qrSize, qrSize);
  } catch (err) {
    console.error('QR code generation failed:', err);
  }

  // Right-Aligned: Principal Signature
  const sigWidth = 20;
  const sigHeight = 6;
  const sigX = width - margin - sigWidth - 1;
  const sigY = height - margin - 5;

  if (branding.principal_signature_url) {
    const sigBase64 = await getBase64FromUrl(branding.principal_signature_url);
    if (sigBase64) {
      doc.addImage(sigBase64, 'PNG', sigX, sigY - sigHeight, sigWidth, sigHeight);
    }
  } else {
    // Placeholder signature line
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.2);
    doc.line(sigX, sigY, sigX + sigWidth, sigY);
  }
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('Principal', sigX + sigWidth / 2, height - margin - 1.5, { align: 'center' });

  // 5. Finalize
  doc.save(`ID_Card_${student.verification_id}.pdf`);
}
