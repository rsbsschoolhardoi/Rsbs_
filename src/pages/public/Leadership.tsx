import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Leadership } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Quote, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicLeadership() {
  const [leadership, setLeadership] = useState<Leadership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await api.getLeadership();
      setLeadership(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-64 w-full bg-muted" />
        <Skeleton className="h-40 w-full bg-muted" />
      </div>
    );
  }

  const principal = leadership.find(l => l.type === 'principal');
  const faculty = leadership.filter(l => l.type === 'teacher');

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <GraduationCap className="w-8 h-8" />
          School Leadership & Faculty
        </h1>
        <p className="text-muted-foreground mt-2">Meet the visionaries and dedicated faculty of RSBS School.</p>
      </div>

      {principal && (
        <Card className="border-none bg-background rounded-3xl shadow-lg border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row h-full">
              <div className="md:w-1/3 aspect-[3/4] md:aspect-auto overflow-hidden">
                <img 
                  src={principal.image_url || ''} 
                  alt={principal.name} 
                  className="w-full h-full object-cover transition-all duration-500"
                />
              </div>
              <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-bold text-primary">{principal.name}</h3>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{principal.designation}</p>
                </div>
                
                <div className="relative">
                  <Quote className="absolute -top-3 -left-4 w-8 h-8 text-primary/10 -z-10" />
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    "{principal.message}"
                  </p>
                </div>
                
                <div className="pt-4 border-t flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Office of the Principal</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          Veterans & Founding Faculty
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {faculty.map((teacher) => (
            <Card key={teacher.id} className="border-none shadow-md bg-muted/30 hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarImage src={teacher.image_url || ''} />
                  <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">{teacher.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{teacher.name}</h4>
                  <p className="text-xs font-semibold text-primary">{teacher.designation}</p>
                  {teacher.years_of_service && (
                    <Badge variant="secondary" className="mt-1 h-5 text-[10px] px-1.5 py-0 uppercase bg-primary/10 text-primary border-none">
                      {teacher.years_of_service} Exp.
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
