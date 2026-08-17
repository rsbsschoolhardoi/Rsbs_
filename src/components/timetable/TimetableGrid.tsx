import React from 'react';
import { TimetableEntry } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TimetableGridProps {
  entries: TimetableEntry[];
  role: 'admin' | 'teacher' | 'student';
  onEntryClick?: (entry: TimetableEntry) => void;
  isLoading?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TimetableGrid: React.FC<TimetableGridProps> = ({ 
  entries, 
  role, 
  onEntryClick,
  isLoading 
}) => {
  // Group entries by day and period
  const grid: Record<string, Record<number, TimetableEntry>> = {};
  
  DAYS.forEach(day => {
    grid[day] = {};
    entries.filter(e => e.day_of_week === day).forEach(entry => {
      grid[day][entry.period_number] = entry;
    });
  });

  // Find max period number to determine rows
  const maxPeriod = entries.length > 0 
    ? Math.max(...entries.map(e => e.period_number), 6)
    : 6;

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 bg-muted rounded w-full" />
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-24 bg-muted rounded w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="min-w-[800px]">
        {/* Header - Days */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          <div className="p-4 font-bold text-center border-r">Period</div>
          {DAYS.map(day => (
            <div key={day} className="p-4 font-bold text-center border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Body - Periods */}
        {periods.map(period => (
          <div key={period} className="grid grid-cols-7 border-b last:border-b-0 group">
            <div className="p-4 flex items-center justify-center font-medium bg-muted/20 border-r">
              {period}
            </div>
            {DAYS.map(day => {
              const entry = grid[day][period];
              return (
                <div 
                  key={`${day}-${period}`} 
                  className={cn(
                    "p-2 border-r last:border-r-0 min-h-[100px] transition-colors",
                    onEntryClick && "hover:bg-accent/50 cursor-pointer"
                  )}
                  onClick={() => entry && onEntryClick?.(entry)}
                >
                  {entry ? (
                    <div className="h-full flex flex-col gap-1 text-sm animate-in fade-in zoom-in duration-300">
                      <div className="font-bold text-primary line-clamp-2">{entry.subject_name}</div>
                      {role !== 'teacher' && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">Teacher</span>
                          <span className="truncate">{entry.teacher_name}</span>
                        </div>
                      )}
                      {role !== 'student' && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">Class</span>
                          <span className="truncate">{entry.class_name} - {entry.section_name}</span>
                        </div>
                      )}
                      <div className="mt-auto pt-2 border-t border-dashed flex flex-wrap gap-2 text-[11px]">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                        </span>
                        {entry.room_number && (
                          <span className="bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                            Room {entry.room_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    role === 'admin' && (
                      <div 
                        className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onEntryClick?.({ day_of_week: day, period_number: period } as any)}
                      >
                        <span className="text-xs text-muted-foreground">+ Add Period</span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
