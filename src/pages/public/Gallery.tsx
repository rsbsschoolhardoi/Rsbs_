import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { GalleryItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Image as ImageIcon, PowerOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { usePublicSettings } from '@/contexts/PublicSettingsContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Gallery() {
  const { isModuleEnabled } = usePublicSettings();
  const navigate = useNavigate();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isModuleEnabled('gallery')) {
      setLoading(false);
      return;
    }
    const fetchGallery = async () => {
      const { data } = await api.getGallery();
      setItems(data);
      setLoading(false);
    };
    fetchGallery();
  }, [isModuleEnabled]);

  if (!isModuleEnabled('gallery') && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-muted p-6 rounded-full mb-6">
          <PowerOff className="w-16 h-16 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Gallery Unavailable</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          The school gallery is temporarily disabled by the administration. Please check back later.
        </p>
        <Button onClick={() => navigate('/')} variant="outline" className="rounded-full px-8">
          Return Home
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-primary">School Gallery</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 p-2 rounded-lg">
          <ImageIcon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary">School Gallery</h1>
          <p className="text-muted-foreground">Capturing moments and memories at RSBS School.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">No photos uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-shadow border-none bg-card/50">
              <AspectRatio ratio={4 / 3}>
                <img
                  src={item.image_url}
                  alt={item.event_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </AspectRatio>
              <CardHeader className="p-4">
                <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {item.event_name}
                </CardTitle>
                <div className="flex items-center text-xs text-muted-foreground gap-1 mt-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.event_date).toLocaleDateString()}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
