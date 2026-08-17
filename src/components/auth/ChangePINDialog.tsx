import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';

interface ChangePINDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePINDialog: React.FC<ChangePINDialogProps> = ({ open, onOpenChange }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile, updatePIN, verifyPIN } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin.length !== 4) {
      toast.error('Please enter your current 4-digit PIN');
      return;
    }

    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      toast.error('New PIN must be a 4-digit numeric code');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('New PIN and confirmation do not match');
      return;
    }

    setLoading(true);
    
    // First verify current PIN
    const verifyResult = await verifyPIN(currentPin);
    if (!verifyResult.success) {
      toast.error(verifyResult.message || 'Incorrect current PIN');
      setLoading(false);
      return;
    }

    // Then update to new PIN
    const { error } = await updatePIN(newPin);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to update PIN');
    } else {
      toast.success('PIN successfully updated');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2rem]">
        <DialogHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary border-2 border-primary/5">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">Change Security PIN</DialogTitle>
          <DialogDescription className="text-xs">
            To change your PIN, first verify your current one, then set a new 4-digit code.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Current PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Old 4-digit PIN"
                className="text-center text-xl tracking-[0.8em] h-12 font-bold border-2 focus-visible:ring-primary/20 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">New PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="New 4-digit PIN"
                className="text-center text-xl tracking-[0.8em] h-12 font-bold border-2 focus-visible:ring-primary/20 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Confirm New PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Confirm 4-digit PIN"
                className="text-center text-xl tracking-[0.8em] h-12 font-bold border-2 focus-visible:ring-primary/20 rounded-xl"
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 text-sm font-bold rounded-xl" disabled={loading || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Update PIN"}
          </Button>
        </form>
        <DialogFooter className="sm:justify-center flex-col items-center">
          <div className="flex items-center space-x-2 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span>Encrypted Verification System</span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
