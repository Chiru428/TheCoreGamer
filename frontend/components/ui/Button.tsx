import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'auth';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--brand-green)] text-black font-bold hover:bg-[var(--brand-green-hover)]',
  secondary: 'bg-bg-elevated text-text-primary border border-border hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]',
  outline: 'border border-border text-text-primary hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]',
  ghost: 'text-text-muted hover:text-[var(--brand-green)] hover:bg-bg-elevated',
  danger: 'bg-danger text-white hover:bg-red-600 shadow-lg shadow-danger/20',
  auth: 'bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium border border-blue-400/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2 text-sm gap-2',
  lg: 'px-7 py-3 text-base gap-2.5',
};

export default function Button({
  variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-[var(--brand-green)] focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="w-4 h-4" /> : icon}
      {children}
    </button>
  );
}
