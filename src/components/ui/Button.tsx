import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
  secondary: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 disabled:text-gray-400',
  danger: 'bg-gray-950 text-white hover:bg-black disabled:bg-gray-400',
  ghost: 'text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
};

export function Button({ children, className = '', icon, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded px-4 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
