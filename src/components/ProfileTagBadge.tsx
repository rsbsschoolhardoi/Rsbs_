import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ProfileTag = 'blue' | 'black' | 'grey' | null | undefined;

interface ProfileTagBadgeProps {
  tag: ProfileTag;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const tagConfig = {
  blue: {
    label: 'Verified',
    className: 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600',
    icon: '✓',
  },
  black: {
    label: 'Official',
    className: 'bg-gray-900 text-white border-gray-950 hover:bg-gray-950 dark:bg-gray-800 dark:border-gray-900',
    icon: '★',
  },
  grey: {
    label: 'Standard',
    className: 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600',
    icon: '●',
  },
};

export function ProfileTagBadge({ tag, className, size = 'sm' }: ProfileTagBadgeProps) {
  if (!tag || !tagConfig[tag]) return null;

  const config = tagConfig[tag];
  
  const sizeClasses = {
    sm: 'text-[8px] h-4 px-1.5 py-0',
    md: 'text-[9px] h-5 px-2 py-0.5',
    lg: 'text-[10px] h-6 px-2.5 py-1',
  };

  return (
    <Badge
      className={cn(
        'font-black uppercase tracking-wider shrink-0 rounded-md',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      <span className="mr-0.5">{config.icon}</span>
      {config.label}
    </Badge>
  );
}

interface ProfileTagSelectorProps {
  value: ProfileTag;
  onChange: (tag: ProfileTag) => void;
  disabled?: boolean;
}

export function ProfileTagSelector({ value, onChange, disabled }: ProfileTagSelectorProps) {
  const tags: Array<{ value: ProfileTag; label: string; color: string }> = [
    { value: null, label: 'No Tag', color: 'bg-muted text-muted-foreground' },
    { value: 'blue', label: '✓ Blue (Verified)', color: 'bg-blue-500 text-white' },
    { value: 'black', label: '★ Black (Official)', color: 'bg-gray-900 text-white dark:bg-gray-800' },
    { value: 'grey', label: '● Grey (Standard)', color: 'bg-gray-500 text-white' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.value || 'none'}
          type="button"
          disabled={disabled}
          onClick={() => onChange(tag.value)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border-2',
            value === tag.value
              ? `${tag.color} border-primary shadow-md scale-105`
              : 'bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
