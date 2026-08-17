import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleApiActivity from '@/components/admin/ModuleApiActivity';
import { api } from '@/db/api';
import { GalleryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, ImageIcon, Trash2, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const gallerySchema = z.object({
  event_name: z.string().min(2, 'Event name is required'),
  event_date: z.string().min(1, 'Event date is required'),
  image_url: z.string().url('Valid image URL is required'),
});

export default function GalleryManagement() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const form = useForm<z.infer<typeof gallerySchema>>({
    resolver: zodResolver(gallerySchema),
    defaultValues: { event_name: '', event_date: '', image_url: '' },
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await api.getGallery();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app_aho9bv0iqbr5_school_images')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '0',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app_aho9bv0iqbr5_school_images')
        .getPublicUrl(filePath);

      form.setValue('image_url', `${publicUrl}?t=${Date.now()}`);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof gallerySchema>) => {
    try {
      const { error } = await api.createGalleryItem(values);
      if (error) throw error;
      toast.success('Gallery item added');
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteItem = async (id: string) => {
    if (confirm('Delete this photo from gallery?')) {
      const { error } = await api.deleteGalleryItem(id);
      if (error) toast.error(error.message);
      else {
        toast.success('Photo removed');
        fetchData();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gallery Management</h1>
          <p className="text-muted-foreground">Manage school event photos for public display.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Photo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <p className="col-span-full text-center py-12 text-muted-foreground">Loading gallery...</p>
        ) : items.length === 0 ? (
          <Card className="col-span-full border-dashed py-12 text-center text-muted-foreground">
            No photos in the gallery yet.
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <AspectRatio ratio={4 / 3}>
                <img src={item.image_url} alt={item.event_name} className="w-full h-full object-cover" />
              </AspectRatio>
              <CardHeader className="p-4">
                <CardTitle className="text-base line-clamp-1">{item.event_name}</CardTitle>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(item.event_date).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0 flex justify-end">
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Gallery Item</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                name="image_url" 
                control={form.control} 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Image</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg bg-muted/30">
                        {form.watch('image_url') ? (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                            <img src={form.watch('image_url')} className="w-full h-full object-cover" />
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-2 right-2 h-8 w-8"
                              onClick={() => form.setValue('image_url', '')}
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer py-8 w-full">
                            {uploading ? <Loader2 className="w-10 h-10 animate-spin text-primary" /> : <Plus className="w-10 h-10 text-muted-foreground" />}
                            <span className="mt-2 text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload event photo'}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                        )}
                        <Input type="hidden" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <FormField
                control={form.control}
                name="event_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl><Input placeholder="Annual Sports Day" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!form.watch('image_url') || uploading}>Add to Gallery</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
