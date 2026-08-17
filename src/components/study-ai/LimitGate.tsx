import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';

interface LimitGateProps {
  access: { allowed: boolean; message?: string; type?: 'limit' | 'unavailable' | 'disabled' };
}

export function LimitGate({ access }: LimitGateProps) {
  const icon =
    access.type === 'limit' ? (
      <ShieldAlert className="w-8 h-8 text-amber-600" />
    ) : access.type === 'unavailable' ? (
      <AlertCircle className="w-8 h-8 text-destructive" />
    ) : (
      <Lock className="w-8 h-8 text-destructive" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex-1 flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">{icon}</div>
      <h2 className="font-heading text-lg font-semibold mb-2">
        {access.type === 'limit' ? 'Daily Limit Reached' : 'Access Restricted'}
      </h2>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap max-w-xs">
        {access.message || 'Study AI is not available for your account right now.'}
      </p>
    </motion.div>
  );
}
