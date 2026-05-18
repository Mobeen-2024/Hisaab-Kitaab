import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  focusColor?: 'indigo' | 'emerald' | 'blue';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, leftIcon, rightIcon, focusColor = 'indigo', ...props }, ref) => {
    const focusColors = {
      indigo: 'focus:ring-indigo-500/50 focus:border-indigo-500/30',
      emerald: 'focus:ring-emerald-500/50 focus:border-emerald-500/30',
      blue: 'focus:ring-blue-500/50 focus:border-blue-500/30',
    };

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error
              ? 'border-rose-500/50 focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/30'
              : `focus:ring-2 ${focusColors[focusColor]}`,
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
