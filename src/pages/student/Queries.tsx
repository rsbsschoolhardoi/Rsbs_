import StudentQueriesModule from '@/components/StudentQueriesModule';
import { HelpCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function StudentQueriesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col space-y-6 pb-24 px-4 pt-4 max-w-none md:max-w-6xl mx-auto h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-3 tracking-tight">
            <HelpCircle className="w-8 h-8" />
            Help & Queries
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Ask questions and view official responses from the school.</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh}
          className="rounded-full h-10 w-10 border-primary/20 hover:bg-primary/5 transition-all"
        >
          <RefreshCw className="w-4 h-4 text-primary" />
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <StudentQueriesModule key={refreshKey} />
      </div>
    </div>
  );
}
