import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceNew from './AttendanceNew';
import AttendanceHistory from './AttendanceHistory';
import AttendanceSettings from './AttendanceSettings';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { Calendar as CalendarIcon, History, Settings, Send } from 'lucide-react';

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('mark');

  return (
    <div className="h-full flex flex-col space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between shrink-0 mb-4 bg-muted/30 p-1 rounded-2xl w-fit">
          <TabsList className="grid grid-cols-4 h-10 rounded-xl bg-transparent gap-1">
            <TabsTrigger value="mark" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs font-medium px-6 transition-all">
              <CalendarIcon className="w-3.5 h-3.5 mr-2" />
              Mark Attendance
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs font-medium px-6 transition-all">
              <History className="w-3.5 h-3.5 mr-2" />
              History Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs font-medium px-6 transition-all">
              <Settings className="w-3.5 h-3.5 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs font-medium px-6 transition-all">
              <Send className="w-3.5 h-3.5 mr-2" />
              API Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="mark" className="h-full m-0 focus-visible:ring-0">
            <AttendanceNew />
          </TabsContent>
          <TabsContent value="history" className="h-full m-0 focus-visible:ring-0">
            <AttendanceHistory />
          </TabsContent>
          <TabsContent value="settings" className="h-full m-0 focus-visible:ring-0">
            <AttendanceSettings />
          </TabsContent>
          <TabsContent value="api" className="h-full m-0 focus-visible:ring-0 overflow-y-auto pr-1 custom-scrollbar">
            <ModuleApiActivity moduleName="attendance" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

