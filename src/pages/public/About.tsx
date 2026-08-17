import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { SchoolInfo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, TrendingUp, Award, School } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicAbout() {
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
          <Skeleton key={i} className="h-40 w-full bg-muted" />
        ))}
      </div>
    );
  }

  const mission = getInfoByKey('mission');
  const highlights = getInfoByKey('highlights');
  const foundationStory = getInfoByKey('foundation_story');
  const growthJourney = getInfoByKey('growth_journey');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-12 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <School className="w-8 h-8" />
          About RSBS School
        </h1>
        <p className="text-muted-foreground mt-2">Discover our legacy, mission, and commitment to education.</p>
      </div>

      {mission && (
        <Card className="border-none shadow-xl bg-primary text-white overflow-hidden relative rounded-[2rem]">
          <CardHeader className="pt-12 text-center pb-4">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 uppercase tracking-widest">
              <Award className="w-8 h-8" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-12 px-8">
            <p className="text-center text-xl font-medium leading-relaxed opacity-90 italic">
              "{mission.content}"
            </p>
          </CardContent>
        </Card>
      )}

      {highlights && (
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-primary">{highlights.title}</h2>
            <div className="w-16 h-1 bg-primary/20 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlights.content.split('\n').map((line, idx) => (
              <div key={idx} className="flex items-start gap-4 bg-muted/20 p-4 rounded-2xl border transition-colors">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium leading-tight">{line.replace('✓', '').trim()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8">
        {foundationStory && foundationStory.is_visible && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <History className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{foundationStory.title}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-8 border-l-2 border-primary/20 italic text-sm">
              {foundationStory.content}
            </p>
          </div>
        )}

        {growthJourney && growthJourney.is_visible && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{growthJourney.title}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-8 border-l-2 border-primary/20 italic text-sm">
              {growthJourney.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
