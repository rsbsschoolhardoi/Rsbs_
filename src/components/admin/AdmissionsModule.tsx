import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { Admission } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge as UI_Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  ClipboardList, 
  Calendar, 
  User, 
  Users, 
  Phone as PhoneIcon, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  RotateCcw 
} from 'lucide-react';

export default function AdmissionsModule() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAdmissions();
      setAdmissions(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch admissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const handleAdmissionStatus = async (id: string, status: Admission['status']) => {
    try {
      const { error } = await api.updateAdmissionStatus(id, status);
      if (error) throw error;
      toast.success(`Admission status updated to ${status}`);
      fetchAdmissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update admission status');
    }
  };

  return (
    <Tabs defaultValue="list">
      <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
        <TabsTrigger value="list" className="rounded-lg font-bold px-6">Admissions</TabsTrigger>
        <TabsTrigger value="api" className="rounded-lg font-bold px-6">API Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Admission Enquiries
            </CardTitle>
            <CardDescription>Review and manage public admission applications.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading applications...</p>
            ) : admissions.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No admission enquiries received yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {admissions.map((admission) => (
                  <Card key={admission.id} className="overflow-hidden">
                    <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-primary">{admission.student_name}</h3>
                          <UI_Badge variant={admission.status === 'accepted' ? 'default' : admission.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {admission.status.toUpperCase()}
                          </UI_Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>DOB: {new Date(admission.date_of_birth).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>Applying Class: {admission.applying_class}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>Guardian: {admission.parent_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{admission.contact_number}</span>
                          </div>
                          <div className="flex items-center gap-2 lg:col-span-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{admission.address}</span>
                          </div>
                        </div>
                        {admission.notes && (
                          <div className="bg-muted/50 p-3 rounded-lg text-sm italic">
                            " {admission.notes} "
                          </div>
                        )}
                      </div>
                      <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                        {admission.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleAdmissionStatus(admission.id, 'accepted')} className="flex-1">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleAdmissionStatus(admission.id, 'rejected')} className="flex-1">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        {admission.status !== 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => handleAdmissionStatus(admission.id, 'pending')} className="flex-1">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Status
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
        <ModuleApiActivity moduleName="admissions" />
      </TabsContent>
    </Tabs>
  );
}
