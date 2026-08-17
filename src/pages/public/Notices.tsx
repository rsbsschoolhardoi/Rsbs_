import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Notice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await api.getPublicNotices();
      setNotices(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <Megaphone className="w-8 h-8" />
          School Announcements
        </h1>
        <p className="text-muted-foreground mt-2">Stay updated with the latest school news and important notices.</p>
      </div>

      {notices.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-12 text-center text-muted-foreground">
            No active announcements at this time.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className={`transition-all hover:shadow-lg border-l-4 ${notice.is_blue_tag ? 'border-l-primary shadow-primary/5' : 'border-l-muted'}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 flex-wrap">
                  {notice.title}
                  {notice.is_blue_tag && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center text-xs text-muted-foreground gap-1 bg-muted/50 px-2 py-1 rounded">
                  <Calendar className="w-3 h-3" />
                  {new Date(notice.created_at).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
