import AppointmentsModule from '@/components/admin/AppointmentsModule';
import { CalendarCheck } from 'lucide-react';

export default function AdminAppointments() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CalendarCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage school visit and meeting requests.</p>
        </div>
      </div>
      <AppointmentsModule />
    </div>
  );
}
