'use client';

import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm',
  ghost: 'bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
