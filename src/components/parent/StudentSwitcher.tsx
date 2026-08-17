import React from 'react';
import { useParent } from '@/contexts/ParentContext';
import { cn } from '@/lib/utils';
import { User, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

export const StudentSwitcher: React.FC = () => {
  const { students, selectedStudent, setSelectedStudent } = useParent();

  // If there's 0 or 1 student, don't show the switcher
  if (students.length <= 1) return null;

  return (
    <div className="flex justify-center mb-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="rounded-full bg-white dark:bg-slate-900 border-primary/20 shadow-lg shadow-primary/5 flex items-center gap-2 px-6 h-12 hover:bg-slate-50 transition-all border-2"
          >
            <div className="p-1.5 bg-primary/10 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Switching Child</p>
              <p className="text-sm font-black text-slate-900 dark:text-white leading-none truncate max-w-[120px]">
                {selectedStudent?.student_name || 'Select Child'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56 rounded-3xl p-2 shadow-2xl border-primary/10">
          <div className="px-4 py-2 mb-2">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Select Child Profile</p>
          </div>
          {students.map((student) => (
            <DropdownMenuItem
              key={student.student_id}
              onClick={() => setSelectedStudent(student)}
              className={cn(
                "rounded-2xl h-12 flex items-center gap-3 px-4 mb-1 transition-all",
                selectedStudent?.student_id === student.student_id 
                  ? "bg-primary text-white font-bold" 
                  : "hover:bg-primary/5 cursor-pointer"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                selectedStudent?.student_id === student.student_id 
                  ? "bg-white/20" 
                  : "bg-primary/10 text-primary"
              )}>
                {student.student_name?.[0]}
              </div>
              <div className="flex-1 truncate text-sm">
                {student.student_name}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
