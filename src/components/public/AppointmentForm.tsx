import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const appointmentSchema = z.object({
  student_name: z.string().optional(),
  parent_name: z.string().min(2, 'Name is required'),
  contact_number: z.string().min(10, 'Valid contact number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  purpose: z.string().min(1, 'Please select a purpose'),
  custom_purpose: z.string().optional(),
  preferred_date: z.string().min(1, 'Preferred date is required'),
  preferred_time: z.string().min(1, 'Preferred time is required'),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const PURPOSES = [
  { value: 'admission', label: 'Admission Inquiry' },
  { value: 'academic', label: 'Academic Discussion' },
  { value: 'fees', label: 'Fee Related' },
  { value: 'complaint', label: 'Feedback / Complaint' },
  { value: 'other', label: 'Other' },
];

export function AppointmentForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      student_name: '',
      parent_name: '',
      contact_number: '',
      email: '',
      purpose: '',
      custom_purpose: '',
      preferred_date: '',
      preferred_time: '',
      notes: '',
    },
  });

  const onSubmit = async (values: AppointmentFormValues) => {
    setIsSubmitting(true);
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
      toast.success('Appointment request sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-none shadow-none bg-primary/5">
        <CardContent className="pt-10 pb-12 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-primary">Request Received!</h3>
          <p className="text-muted-foreground max-w-sm">
            Thank you for reaching out. Our administration team will review your request and contact you shortly at the provided number.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4 rounded-full">
            Send Another Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="parent_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent / Guardian Name *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter your full name" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="student_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student Name (If enrolled)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter student's name" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter phone number" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter your email" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose of Appointment *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch('purpose') === 'other' && (
            <FormField
              control={form.control}
              name="custom_purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Please Specify Purpose *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter purpose" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="preferred_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Date *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="date" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Time *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="time" className="pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any specific details you'd like to share?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full rounded-full h-12 text-lg shadow-lg hover:shadow-xl transition-all" disabled={isSubmitting}>
          {isSubmitting ? 'Sending Request...' : 'Submit Request'}
        </Button>
      </form>
    </Form>
  );
}
