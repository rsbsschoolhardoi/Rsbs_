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
import { User, Phone, MapPin, Calendar, CheckCircle2, School, GraduationCap, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const admissionSchema = z.object({
  student_name: z.string().min(2, 'Student Name is required'),
  date_of_birth: z.string().min(1, 'Date of Birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  applying_class: z.string().min(1, 'Please select a class'),
  previous_school: z.string().optional(),
  parent_name: z.string().min(2, 'Parent Name is required'),
  contact_number: z.string().min(10, 'Valid contact number is required'),
  address: z.string().min(5, 'Valid address is required'),
  notes: z.string().optional(),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

const CLASSES = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12'
];

export function AdmissionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      student_name: '',
      date_of_birth: '',
      gender: '',
      applying_class: '',
      previous_school: '',
      parent_name: '',
      contact_number: '',
      address: '',
      notes: '',
    },
  });

  const onSubmit = async (values: AdmissionFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await api.createAdmission({
        ...values,
        previous_school: values.previous_school || null,
        notes: values.notes || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Admission enquiry sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-none shadow-none bg-primary/5">
        <CardContent className="pt-10 pb-12 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-primary">Application Submitted!</h3>
          <p className="text-muted-foreground max-w-sm">
            Thank you for choosing RSBS School. Your admission enquiry has been received. Our team will review the details and contact you to guide you through the next steps.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4 rounded-full">
            Submit New Enquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4 border-b pb-6 border-primary/10">
          <div className="flex items-center gap-2 mb-4 text-primary font-bold">
            <User className="w-5 h-5" />
            Student Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="student_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="applying_class"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applying for Class *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLASSES.map((cls) => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="previous_school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previous School (If any)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter school name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 mb-4 text-primary font-bold">
            <Users className="w-5 h-5" />
            Guardian Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="parent_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent / Guardian Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residential Address *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Anything else we should know?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full rounded-full h-12 text-lg shadow-lg hover:shadow-xl transition-all" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting Application...' : 'Apply for Admission'}
        </Button>
      </form>
    </Form>
  );
}
