import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { api } from '@/db/api';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.view': 'View',
    'common.update': 'Update',
    'common.create': 'Create',
    'common.select': 'Select',
    'common.all': 'All',
    'common.none': 'None',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Students',
    'nav.teachers': 'Teachers',
    'nav.classes': 'Classes',
    'nav.attendance': 'Attendance',
    'nav.exams': 'Exams',
    'nav.notices': 'Notices',
    'nav.gallery': 'Gallery',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.profile': 'Profile',
    
    // Attendance
    'attendance.mark': 'Mark Attendance',
    'attendance.history': 'History Reports',
    'attendance.settings': 'Settings',
    'attendance.present': 'Present',
    'attendance.absent': 'Absent',
    'attendance.late': 'Late',
    'attendance.marked': 'Marked',
    'attendance.notMarked': 'Not Marked',
    'attendance.locked': 'Locked',
    'attendance.windowOpen': 'Attendance window open',
    'attendance.windowClosed': 'Attendance time window closed',
    'attendance.windowClosesAt': 'Window closes at',
    'attendance.markAll': 'Mark All Present',
    'attendance.saveAttendance': 'Save Attendance',
    'attendance.timeWindow': 'Time Window Control',
    'attendance.startTime': 'Start Time',
    'attendance.endTime': 'End Time',
    'attendance.restriction': 'Time Restriction',
    'attendance.restrictionEnabled': 'Enable or disable the daily attendance window',
    'attendance.updateWindow': 'Update Restriction Window',
    'attendance.adminOverride': 'Admin Override',
    'attendance.adminOverrideDesc': 'Full access enabled. Restriction window ignored.',
    'attendance.restrictionProtocol': 'Restriction Protocol',
    'attendance.restrictionDesc': 'When enabled, teachers will be restricted from marking or editing attendance outside the defined window. Admins bypass this restriction and can always modify attendance.',
    'attendance.noRestriction': 'Restriction Disabled: No time window enforced',
    
    // Teacher
    'teacher.dashboard': 'Teacher Dashboard',
    'teacher.profile': 'Teacher Profile',
    'teacher.myClasses': 'My Classes',
    'teacher.classStrength': 'Student Strength',
    'teacher.students': 'Students',
    'teacher.attendanceStatus': 'Attendance Status',
    'teacher.updateAttendance': 'Update Attendance',
    'teacher.viewAttendance': 'View Attendance',
    'teacher.noClasses': 'No classes assigned',
    
    // Student
    'student.name': 'Student Name',
    'student.class': 'Class',
    'student.section': 'Section',
    'student.rollNo': 'Roll No',
    'student.contact': 'Contact',
    'student.email': 'Email',
    'student.dob': 'Date of Birth',
    'student.gender': 'Gender',
    'student.address': 'Address',
    'student.noStudents': 'No students found',
    
    // Class
    'class.name': 'Class Name',
    'class.section': 'Section',
    'class.students': 'Students',
    'class.teacher': 'Teacher',
    'class.noClasses': 'No classes available',
    
    // Messages
    'msg.saveSuccess': 'Saved successfully',
    'msg.saveFailed': 'Failed to save',
    'msg.deleteSuccess': 'Deleted successfully',
    'msg.deleteFailed': 'Failed to delete',
    'msg.updateSuccess': 'Updated successfully',
    'msg.updateFailed': 'Failed to update',
    'msg.loadFailed': 'Failed to load data',
    'msg.noData': 'No data available',
    'msg.confirmDelete': 'Are you sure you want to delete?',
    'msg.attendanceSaved': 'Attendance saved successfully',
    'msg.attendanceFailed': 'Failed to save attendance',
    'msg.windowClosed': 'Attendance time window is closed',
    'msg.notAssigned': 'You are not assigned to this class',
    
    // Settings
    'settings.language': 'Language',
    'settings.selectLanguage': 'Select Language',
    'settings.english': 'English',
    'settings.hindi': 'हिंदी',
    'settings.theme': 'Theme',
    'settings.profile': 'Profile Settings',
    'settings.account': 'Account Settings',

    // Module Control
    'modules.control': 'Module Control Hub',
    'modules.global': 'Global Toggles',
    'modules.role': 'Role-Wise',
    'modules.individual': 'Individual',
    'modules.enabled': 'Enabled',
    'modules.disabled': 'Disabled',
    'modules.deactivated': 'Deactivated',
    'modules.stop': 'Stop',
    'modules.live': 'Live',
  },
  hi: {
    // Common
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.add': 'जोड़ें',
    'common.search': 'खोजें',
    'common.loading': 'लोड हो रहा है...',
    'common.success': 'सफलता',
    'common.error': 'त्रुटि',
    'common.confirm': 'पुष्टि करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.submit': 'जमा करें',
    'common.close': 'बंद करें',
    'common.view': 'देखें',
    'common.update': 'अपडेट करें',
    'common.create': 'बनाएं',
    'common.select': 'चुनें',
    'common.all': 'सभी',
    'common.none': 'कोई नहीं',
    'common.yes': 'हां',
    'common.no': 'नहीं',
    
    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.students': 'छात्र',
    'nav.teachers': 'शिक्षक',
    'nav.classes': 'कक्षाएं',
    'nav.attendance': 'उपस्थिति',
    'nav.exams': 'परीक्षाएं',
    'nav.notices': 'सूचनाएं',
    'nav.gallery': 'गैलरी',
    'nav.settings': 'सेटिंग्स',
    'nav.logout': 'लॉगआउट',
    'nav.profile': 'प्रोफ़ाइल',
    
    // Attendance
    'attendance.mark': 'उपस्थिति दर्ज करें',
    'attendance.history': 'इतिहास रिपोर्ट',
    'attendance.settings': 'सेटिंग्स',
    'attendance.present': 'उपस्थित',
    'attendance.absent': 'अनुपस्थित',
    'attendance.late': 'देर से',
    'attendance.marked': 'दर्ज किया गया',
    'attendance.notMarked': 'दर्ज नहीं किया गया',
    'attendance.locked': 'लॉक किया गया',
    'attendance.windowOpen': 'उपस्थिति विंडो खुली है',
    'attendance.windowClosed': 'उपस्थिति समय विंडो बंद है',
    'attendance.windowClosesAt': 'विंडो बंद होगी',
    'attendance.markAll': 'सभी को उपस्थित दर्ज करें',
    'attendance.saveAttendance': 'उपस्थिति सहेजें',
    'attendance.timeWindow': 'समय विंडो नियंत्रण',
    'attendance.startTime': 'प्रारंभ समय',
    'attendance.endTime': 'समाप्ति समय',
    'attendance.restriction': 'समय प्रतिबंध',
    'attendance.restrictionEnabled': 'दैनिक उपस्थिति विंडो सक्षम या अक्षम करें',
    'attendance.updateWindow': 'प्रतिबंध विंडो अपडेट करें',
    'attendance.adminOverride': 'व्यवस्थापक ओवरराइड',
    'attendance.adminOverrideDesc': 'पूर्ण पहुंच सक्षम। प्रतिबंध विंडो को नजरअंदाज किया गया।',
    'attendance.restrictionProtocol': 'प्रतिबंध प्रोटोकॉल',
    'attendance.restrictionDesc': 'सक्षम होने पर, शिक्षकों को निर्धारित विंडो के बाहर उपस्थिति दर्ज करने या संपादित करने से प्रतिबंधित किया जाएगा। व्यवस्थापक इस प्रतिबंध को बायपास करते हैं और हमेशा उपस्थिति को संशोधित कर सकते हैं।',
    'attendance.noRestriction': 'प्रतिबंध अक्षम: कोई समय विंडो लागू नहीं',
    
    // Teacher
    'teacher.dashboard': 'शिक्षक डैशबोर्ड',
    'teacher.profile': 'शिक्षक प्रोफ़ाइल',
    'teacher.myClasses': 'मेरी कक्षाएं',
    'teacher.classStrength': 'छात्र संख्या',
    'teacher.students': 'छात्र',
    'teacher.attendanceStatus': 'उपस्थिति स्थिति',
    'teacher.updateAttendance': 'उपस्थिति अपडेट करें',
    'teacher.viewAttendance': 'उपस्थिति देखें',
    'teacher.noClasses': 'कोई कक्षा नहीं सौंपी गई',
    
    // Student
    'student.name': 'छात्र का नाम',
    'student.class': 'कक्षा',
    'student.section': 'अनुभाग',
    'student.rollNo': 'रोल नंबर',
    'student.contact': 'संपर्क',
    'student.email': 'ईमेल',
    'student.dob': 'जन्म तिथि',
    'student.gender': 'लिंग',
    'student.address': 'पता',
    'student.noStudents': 'कोई छात्र नहीं मिला',
    
    // Class
    'class.name': 'कक्षा का नाम',
    'class.section': 'अनुभाग',
    'class.students': 'छात्र',
    'class.teacher': 'शिक्षक',
    'class.noClasses': 'कोई कक्षा उपलब्ध नहीं',
    
    // Messages
    'msg.saveSuccess': 'सफलतापूर्वक सहेजा गया',
    'msg.saveFailed': 'सहेजने में विफल',
    'msg.deleteSuccess': 'सफलतापूर्वक हटाया गया',
    'msg.deleteFailed': 'हटाने में विफल',
    'msg.updateSuccess': 'सफलतापूर्वक अपडेट किया गया',
    'msg.updateFailed': 'अपडेट करने में विफल',
    'msg.loadFailed': 'डेटा लोड करने में विफल',
    'msg.noData': 'कोई डेटा उपलब्ध नहीं',
    'msg.confirmDelete': 'क्या आप वाकई हटाना चाहते हैं?',
    'msg.attendanceSaved': 'उपस्थिति सफलतापूर्वक सहेजी गई',
    'msg.attendanceFailed': 'उपस्थिति सहेजने में विफल',
    'msg.windowClosed': 'उपस्थिति समय विंडो बंद है',
    'msg.notAssigned': 'आप इस कक्षा के लिए नियुक्त नहीं हैं',
    
    // Settings
    'settings.language': 'भाषा',
    'settings.selectLanguage': 'भाषा चुनें',
    'settings.english': 'English',
    'settings.hindi': 'हिंदी',
    'settings.theme': 'थीम',
    'settings.profile': 'प्रोफ़ाइल सेटिंग्स',
    'settings.account': 'खाता सेटिंग्स',

    // Module Control
    'modules.control': 'मॉड्यूल नियंत्रण केंद्र',
    'modules.global': 'ग्लोबल टॉगल',
    'modules.role': 'भूमिका-वार',
    'modules.individual': 'व्यक्तिगत',
    'modules.enabled': 'सक्षम',
    'modules.disabled': 'अक्षम',
    'modules.deactivated': 'निष्क्रिय',
    'modules.stop': 'रोकें',
    'modules.live': 'लाइव',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const profile = authContext?.profile;
  
  // Try to get from local storage or device language initially
  const getInitialLanguage = (): Language => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && (saved === 'en' || saved === 'hi')) return saved;
    
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'hi') return 'hi';
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage());

  useEffect(() => {
    if (profile?.language_preference) {
      setLanguageState(profile.language_preference as Language);
    }
  }, [profile]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    if (user?.id) {
      try {
        await api.updateProfile(user.id, { language_preference: lang });
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
