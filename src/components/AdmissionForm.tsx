import { useEffect, useState } from 'react';
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
import { Loader2, CheckCircle2, Save, X } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const admissionSchema = z.object({
  student_name: z.string().min(2, 'Student name is too short'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  applying_class: z.string().min(1, 'Applying class is required'),
  previous_school: z.string().optional(),
  parent_name: z.string().min(2, 'Parent name is too short'),
  contact_number: z.string().min(10, 'Valid contact number is required'),
  address: z.string().min(5, 'Address is too short'),
  notes: z.string().optional(),
});

type AdmissionFormProps = {
  onCancel?: () => void;
  onSuccess?: () => void;
};

export default function AdmissionForm({ onCancel, onSuccess }: AdmissionFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof admissionSchema>>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      student_name: '',
      date_of_birth: '',
      gender: 'Male',
      applying_class: '',
      previous_school: '',
      parent_name: '',
      contact_number: '',
      address: '',
      notes: '',
    },
  });

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('admission_draft');
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
    localStorage.setItem('admission_draft', JSON.stringify(values));
    toast.success('Form saved as draft');
  };

  const onSubmit = async (values: z.infer<typeof admissionSchema>) => {
    setLoading(true);
    try {
      const { error } = await api.createAdmission({
        ...values,
        previous_school: values.previous_school || null,
        notes: values.notes || null,
      });
      if (error) throw error;
      setSubmitted(true);
      localStorage.removeItem('admission_draft');
      toast.success('Admission enquiry submitted successfully!');
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Thank You!</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">Your admission enquiry has been received. Our team will contact you shortly.</p>
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
            name="student_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Student Full Name</FormLabel>
                <FormControl><Input placeholder="John Doe" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date of Birth</FormLabel>
                <FormControl><Input type="date" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
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
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Applying Class</FormLabel>
                <FormControl><Input placeholder="e.g. Class 5" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="parent_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Parent/Guardian Name</FormLabel>
                <FormControl><Input placeholder="Jane Doe" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
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
            name="previous_school"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Previous School (If any)</FormLabel>
                <FormControl><Input placeholder="Name of the previous institution" className="h-12 rounded-2xl bg-muted/30 border-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Permanent Address</FormLabel>
                <FormControl><Textarea placeholder="Enter full address" className="min-h-[100px] rounded-2xl bg-muted/30 border-none p-4" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="col-span-full flex flex-col md:flex-row gap-4 pt-6">
            <Button type="submit" className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Submit Enquiry
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

