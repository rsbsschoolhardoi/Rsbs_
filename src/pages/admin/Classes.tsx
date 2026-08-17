import { useEffect, useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import { api } from '@/db/api';
import { Class, Section } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Layers, Grid } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'class' | 'section'} | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');

  const fetchClasses = async () => {
    setLoading(true);
    const { data } = await api.getClasses();
    setClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async () => {
    if (!className) return;
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, className);
        toast.success('Class updated');
      } else {
        await api.createClass(className);
        toast.success('Class created');
      }
      setClassName('');
      setEditingClass(null);
      setIsClassDialogOpen(false);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteClass = (id: string) => {
    const cls = classes.find(c => c.id === id);
    if (!cls) return;
    setItemToDelete({ id: cls.id, name: cls.name, type: 'class' });
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'class') {
        await api.deleteClass(itemToDelete.id);
        toast.success('Class deleted');
      } else {
        await api.deleteSection(itemToDelete.id);
        toast.success('Section deleted');
      }
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateSection = async () => {
    if (!sectionName || !targetClassId) return;
    try {
      if (editingSection) {
        await api.updateSection(editingSection.id, sectionName);
        toast.success('Section updated');
      } else {
        await api.createSection(targetClassId, sectionName);
        toast.success('Section created');
      }
      setSectionName('');
      setEditingSection(null);
      setTargetClassId(null);
      setIsSectionDialogOpen(false);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteSection = (id: string) => {
    // Find the section and its name
    let secName = '';
    for (const cls of classes) {
      const foundSec = cls.sections?.find(s => s.id === id);
      if (foundSec) {
        secName = `Section ${foundSec.name} of ${cls.name}`;
        break;
      }
    }
    setItemToDelete({ id, name: secName || 'Section', type: 'section' });
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" />
            Class Structure Master
          </h1>
          <p className="text-muted-foreground">Define school classes and their respective sections.</p>
        </div>
        <Button onClick={() => { setEditingClass(null); setClassName(''); setIsClassDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Class
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No classes defined yet.</p>
          <p className="text-muted-foreground">Start by creating your first school class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card key={cls.id} className="overflow-hidden group hover:border-primary/50 transition-all">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Grid className="w-5 h-5 text-primary" />
                    {cls.name}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingClass(cls); setClassName(cls.name); setIsClassDialogOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClass(cls.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {cls.sections?.map(sec => (
                    <div key={sec.id} className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm group/sec">
                      <span>Section {sec.name}</span>
                      <button onClick={() => { setEditingSection(sec); setTargetClassId(cls.id); setSectionName(sec.name); setIsSectionDialogOpen(true); }} className="hover:text-primary"><Edit className="w-3 h-3"/></button>
                      <button onClick={() => handleDeleteSection(sec.id)} className="hover:text-destructive"><Plus className="w-3 h-3 rotate-45"/></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => { setTargetClassId(cls.id); setEditingSection(null); setSectionName(''); setIsSectionDialogOpen(true); }}>
                    <Plus className="w-3 h-3 mr-1" /> Add Section
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Class Dialog */}
      <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Create Class'}</DialogTitle>
            <DialogDescription>Define a new class level for the school.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. Class 10" 
              value={className} 
              onChange={e => setClassName(e.target.value)} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClassDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateClass}>{editingClass ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Section' : 'Add Section'}</DialogTitle>
            <DialogDescription>Assign a section identifier to this class.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. A" 
              value={sectionName} 
              onChange={e => setSectionName(e.target.value)} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSection}>{editingSection ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={executeDelete}
        recordName={itemToDelete?.name || ""}
      />
    </div>
  );
}
