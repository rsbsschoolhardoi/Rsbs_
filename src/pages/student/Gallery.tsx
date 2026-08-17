import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { GalleryItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Calendar } from 'lucide-react';
import { MobilePageLoading } from '@/components/layouts/MobilePageLoading';
import { AspectRatio } from '@/components/ui/aspect-ratio';

export default function StudentGallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      const { data } = await api.getGallery();
      setGallery(data);
      setLoading(false);
    };
    fetchGallery();
  }, []);

  if (loading) {
    return <MobilePageLoading message="Loading gallery…" />;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ImageIcon className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          School Gallery
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">Browse photos from school events and activities.</p>
      </div>

      {gallery.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No photos in the gallery yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-shadow">
              <AspectRatio ratio={4 / 3}>
                <img
                  src={item.image_url}
                  alt={item.event_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </AspectRatio>
              <CardContent className="p-3 md:p-4">
                <p className="font-medium text-sm md:text-base line-clamp-1">{item.event_name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.event_date).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
