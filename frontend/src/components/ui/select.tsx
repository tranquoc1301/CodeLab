import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectComponentProps {
  value?: string;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export function Select({ value, children, placeholder, className }: SelectComponentProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {value || placeholder || 'Select...'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1 rounded-md border bg-popover p-1 shadow-md',
            'animate-in fade-in zoom-in-95 duration-200'
          )}
          role="listbox"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface SelectItemComponentProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectItem({ children, disabled }: SelectItemComponentProps) {
  return (
    <button
      type="button"
      role="option"
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50'
      )}
    >
      <Check className="mr-2 h-4 w-4 opacity-0" />
      {children}
    </button>
  );
}