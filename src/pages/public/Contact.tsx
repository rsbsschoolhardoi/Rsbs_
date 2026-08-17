import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { SchoolInfo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Mail, Award, School, Calendar, UserPlus, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdmissionForm from '@/components/AdmissionForm';
import AppointmentForm from '@/components/AppointmentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { useNavigate } from 'react-router-dom';

export default function PublicContact() {
  const navigate = useNavigate();
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await api.getSchoolInfo();
      setSchoolInfo(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const getInfoByKey = (key: string) => schoolInfo.find(info => info.section_key === key);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full bg-muted rounded-3xl" />
        ))}
      </div>
    );
  }

  const contact = getInfoByKey('contact');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <Phone className="w-8 h-8" />
          Contact & Admissions
        </h1>
        <p className="text-muted-foreground mt-2">Get in touch with us for any inquiries, admissions, or appointments.</p>
      </div>

      {/* Contact Information */}
      {contact && (
        <Card className="shadow-lg border-none bg-background rounded-[2.5rem]">
          <CardHeader className="text-center pb-2 p-6">
            <CardTitle className="text-xl font-bold text-primary">{contact.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-6">
            <div className="space-y-6">
              {contact.content.split('\n').map((line, idx) => {
                const isAddress = line.toLowerCase().includes('address');
                const isPhone = line.toLowerCase().includes('phone');
                const isEmail = line.toLowerCase().includes('email');
                const Icon = isAddress ? MapPin : isPhone ? Phone : isEmail ? Mail : null;
                
                return (
                  <div key={idx} className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      {Icon && (
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="text-sm font-medium leading-relaxed text-foreground">{line}</span>
                        {isAddress && (
                          <div className="mt-4 rounded-2xl overflow-hidden border border-border shadow-md h-64">
                            <iframe 
                              width="100%" 
                              height="100%" 
                              frameBorder="0" 
                              style={{ border: 0 }} 
                              referrerPolicy="no-referrer-when-downgrade" 
                              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyB_LJOYJL-84SMuxNB7LtRGhxEQLjswvy0&q=${encodeURIComponent(line.replace('Address:', '').trim())}&language=en&region=cn`} 
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admission & Appointment Section - Action Buttons */}
      <Card className="shadow-lg border-none bg-background rounded-[2.5rem]">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-black text-primary">Join RSBS Community</CardTitle>
          <p className="text-sm text-muted-foreground font-medium">Choose an option below to get started with our school.</p>
        </CardHeader>
        <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Admission Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="p-6 rounded-3xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Admission</h3>
                  <p className="text-[10px] text-muted-foreground font-bold">New Student Intake</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 pb-0">
                <DialogTitle className="text-2xl font-black text-primary">Admission Enquiry</DialogTitle>
                <p className="text-sm text-muted-foreground font-medium">Please fill in the details below accurately.</p>
              </DialogHeader>
              <div className="p-8 pt-6 overflow-y-auto no-scrollbar max-h-[85vh]">
                <AdmissionForm onCancel={() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); navigate('/'); }} onSuccess={() => { setTimeout(() => navigate('/'), 2000); }} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Appointment Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="p-6 rounded-3xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer group flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Appointment</h3>
                  <p className="text-[10px] text-muted-foreground font-bold">Visit & Tour</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 pb-0">
                <DialogTitle className="text-2xl font-black text-blue-600">Book Appointment</DialogTitle>
                <p className="text-sm text-muted-foreground font-medium">Choose your preferred date and time for visit.</p>
              </DialogHeader>
              <div className="p-8 pt-6 overflow-y-auto no-scrollbar max-h-[85vh]">
                <AppointmentForm onCancel={() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); navigate('/'); }} onSuccess={() => { setTimeout(() => navigate('/'), 2000); }} />
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
