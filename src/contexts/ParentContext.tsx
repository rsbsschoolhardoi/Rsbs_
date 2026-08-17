import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/db/api';

interface ParentContextType {
  students: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
  loading: boolean;
  refreshStudents: () => Promise<void>;
}

const ParentContext = createContext<ParentContextType | undefined>(undefined);

export const ParentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStudents = useCallback(async () => {
    if (profile?.id) {
      setLoading(true);
      const { data } = await api.getParentLinkedStudents(profile.id);
      const studentList = data || [];
      setStudents(studentList);
      if (studentList.length > 0) {
        if (!selectedStudent || !studentList.find((s: any) => s.student_id === selectedStudent.student_id)) {
          setSelectedStudent(studentList[0]);
        }
      } else {
        setSelectedStudent(null);
      }
      setLoading(false);
    }
  }, [profile?.id, selectedStudent]);

  useEffect(() => {
    refreshStudents();
  }, [profile?.id]);

  return (
    <ParentContext.Provider value={useMemo(() => ({ students, selectedStudent, setSelectedStudent, loading, refreshStudents }), [students, selectedStudent, loading, refreshStudents])}>
      {children}
    </ParentContext.Provider>
  );
};

export const useParent = () => {
  const context = useContext(ParentContext);
  if (context === undefined) {
    throw new Error('useParent must be used within a ParentProvider');
  }
  return context;
};
