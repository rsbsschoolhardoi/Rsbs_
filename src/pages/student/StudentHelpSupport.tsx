import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, HelpCircle, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentPanelHelpSupport } from '@/types';

export default function StudentHelpSupport() {
  const [help, setHelp] = useState<StudentPanelHelpSupport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentPanelHelpSupport().then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load help content');
      } else {
        setHelp((data || []).filter((h) => h.is_active).sort((a, b) => a.sort_order - b.sort_order));
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-sm text-muted-foreground">Find answers and contact support.</p>
      </div>

      {help.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No support articles available.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
              <CardDescription>Common questions and answers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {help.map((h) => (
                  <AccordionItem key={h.id} value={h.id}>
                    <AccordionTrigger className="text-left">{h.title}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                      {h.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {(help.some((h) => h.contact_email) || help.some((h) => h.contact_phone)) && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>Reach out to your school for help.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {help.map((h) => (
                  <React.Fragment key={h.id}>
                    {h.contact_email && (
                      <a href={`mailto:${h.contact_email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                        <Mail className="w-4 h-4" /> {h.contact_email}
                      </a>
                    )}
                    {h.contact_phone && (
                      <a href={`tel:${h.contact_phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                        <Phone className="w-4 h-4" /> {h.contact_phone}
                      </a>
                    )}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
