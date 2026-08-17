import AdmissionsModule from '@/components/admin/AdmissionsModule';
import { GraduationCap } from 'lucide-react';

export default function AdminAdmissions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admissions</h1>
          <p className="text-sm text-muted-foreground">Manage school admission enquiries and applications.</p>
        </div>
      </div>
      <AdmissionsModule />
    </div>
  );
}
