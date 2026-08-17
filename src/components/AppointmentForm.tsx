import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Save, X } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const appointmentSchema = z.object({
  student_name: z.string().optional(),
  parent_name: z.string().min(2, 'Parent name is too short'),
  contact_number: z.string().min(10, 'Valid contact number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  purpose: z.string().min(1, 'Purpose is required'),
  custom_purpose: z.string().optional(),
  preferred_date: z.string().min(1, 'Date is required'),
  preferred_time: z.string().min(1, 'Time is required'),
  notes: z.string().optional(),
});

type AppointmentFormProps = {
  onCancel?: () => void;
  onSuccess?: () => void;
};

export default function AppointmentForm({ onCancel, onSuccess }: AppointmentFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      student_name: '',
      parent_name: '',
      contact_number: '',
      email: '',
      purpose: 'Meeting with Principal',
      custom_purpose: '',
      preferred_date: '',
      preferred_time: '10:00 AM',
      notes: '',
    },
  });

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('appointment_draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        form.reset(parsedDraft);
        toast.info('Draft loaded successfully');
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
  }, []);

  // Save draft to localStorage
  const saveDraft = () => {
    const values = form.getValues();
    localStorage.setItem('appointment_draft', JSON.stringify(values));
    toast.success('Form saved as draft');
  };

  const onSubmit = async (values: z.infer<typeof appointmentSchema>) => {
    setLoading(true);
    try {
      const { error } = await api.createAppointment({
        ...values,
        student_name: values.student_name || null,
        email: values.email || null,
        custom_purpose: values.custom_purpose || null,
        notes: values.notes || null,
      });
      if (error) throw error;
      setSubmitted(true);
      localStorage.removeItem('appointment_draft');
      toast.success('Appointment request submitted successfully!');
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Request Sent!</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">Your appointment request has been submitted. We will confirm via SMS/Email shortly.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setSubmitted(false)} className="rounded-full px-6">Submit Another</Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} className="rounded-full px-6">Close</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto pr-2 no-scrollbar">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
          <FormField
            control={form.control}
            name="parent_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Name (Parent/Guardian)</FormLabel>
                <FormControl><Input placeholder="Jane Doe" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="student_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Student Name (If already enrolled)</FormLabel>
                <FormControl><Input placeholder="John Doe" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contact Number</FormLabel>
                <FormControl><Input placeholder="+91 XXXXX XXXXX" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email Address (Optional)</FormLabel>
                <FormControl><Input placeholder="jane@example.com" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Purpose of Visit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Meeting with Principal">Meeting with Principal</SelectItem>
                    <SelectItem value="Fee Inquiry">Fee Inquiry</SelectItem>
                    <SelectItem value="Academic Discussion">Academic Discussion</SelectItem>
                    <SelectItem value="Other">Other (Specify below)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="custom_purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Other Purpose (If applicable)</FormLabel>
                <FormControl><Input placeholder="Please specify" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Preferred Date</FormLabel>
                <FormControl><Input type="date" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Preferred Time</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none"><SelectValue placeholder="Select time" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                    <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                    <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                    <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                    <SelectItem value="01:00 PM">01:00 PM</SelectItem>
                    <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Additional Notes</FormLabel>
                <FormControl><Textarea placeholder="Any specific requirements or questions" className="min-h-[100px] rounded-2xl bg-muted/30 border-none p-4" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="col-span-full flex flex-col md:flex-row gap-4 pt-6">
            <Button type="submit" className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Book Appointment
            </Button>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={saveDraft} className="flex-1 md:flex-none h-14 rounded-2xl px-6 font-bold border-2">
                <Save className="w-5 h-5 mr-2" /> Draft
              </Button>
              {onCancel && (
                <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 md:flex-none h-14 rounded-2xl px-6 font-bold">
                  <X className="w-5 h-5 mr-2" /> Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

