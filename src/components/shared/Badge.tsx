type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
};

interface Props {
  text: string;
  variant?: Variant;
  className?: string;
}

export default function Badge({ text, variant = 'default', className = '' }: Props) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {text}
    </span>
  );
}
