import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { Appointment } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge as UI_Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  CalendarCheck, 
  Calendar, 
  Clock, 
  Phone as PhoneIcon, 
  User, 
  ClipboardList, 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw 
} from 'lucide-react';

export default function AppointmentsModule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAppointments();
      setAppointments(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
      const { error } = await api.updateAppointmentStatus(id, status);
      if (error) throw error;
      toast.success(`Appointment status updated to ${status}`);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update appointment status');
    }
  };

  return (
    <Tabs defaultValue="list">
      <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
        <TabsTrigger value="list" className="rounded-lg font-bold px-6">Appointments</TabsTrigger>
        <TabsTrigger value="api" className="rounded-lg font-bold px-6">API Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Appointment Requests
            </CardTitle>
            <CardDescription>Manage and schedule meetings with parents and visitors.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No appointment requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <Card key={appointment.id} className="overflow-hidden">
                    <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-primary">{appointment.parent_name}</h3>
                          <UI_Badge variant={
                            appointment.status === 'completed' ? 'default' : 
                            appointment.status === 'approved' ? 'default' : 
                            appointment.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }>
                            {appointment.status.toUpperCase()}
                          </UI_Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Date: {new Date(appointment.preferred_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Time: {appointment.preferred_time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{appointment.contact_number}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>Student: {appointment.student_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 lg:col-span-2">
                            <ClipboardList className="w-4 h-4 text-muted-foreground" />
                            <span>Purpose: {appointment.purpose === 'other' ? appointment.custom_purpose : appointment.purpose}</span>
                          </div>
                        </div>
                        {appointment.notes && (
                          <div className="bg-muted/50 p-3 rounded-lg text-sm italic">
                            " {appointment.notes} "
                          </div>
                        )}
                      </div>
                      <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                        {appointment.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleAppointmentStatus(appointment.id, 'approved')} className="flex-1">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleAppointmentStatus(appointment.id, 'rejected')} className="flex-1">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        {appointment.status === 'approved' && (
                          <Button size="sm" variant="default" onClick={() => handleAppointmentStatus(appointment.id, 'completed')} className="flex-1">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Complete
                          </Button>
                        )}
                        {appointment.status !== 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => handleAppointmentStatus(appointment.id, 'pending')} className="flex-1">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="api" className="mt-6">
        <ModuleApiActivity moduleName="appointments" />
      </TabsContent>
    </Tabs>
  );
}
