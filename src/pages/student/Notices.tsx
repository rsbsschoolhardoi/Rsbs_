import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { Notice, Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar, CheckCircle2 } from 'lucide-react';
import { MobilePageLoading } from '@/components/layouts/MobilePageLoading';
import { supabase } from '@/db/supabase';

export default function StudentNotices() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      if (!profile?.student_id) return;
      setLoading(true);
      const { data: student } = await api.getStudentById(profile.student_id);
      if (student) {
        const { data } = await api.getStudentNotices(student);
        setNotices(data);
      }
      setLoading(false);
    };

    fetchNotices();

    const channel = supabase
      .channel('notices_student')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchNotices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.student_id]);

  if (loading) {
    return <MobilePageLoading message="Loading notices…" />;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Megaphone className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          School Notices
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">Stay updated with the latest announcements.</p>
      </div>

      {notices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No notices posted yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className={`transition-all hover:shadow-md ${notice.is_blue_tag ? 'border-primary/50' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2 flex-wrap">
                  {notice.title}
                  {notice.is_blue_tag && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(notice.created_at).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
