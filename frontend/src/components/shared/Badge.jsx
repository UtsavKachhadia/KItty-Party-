/**
 * Reusable status badge component.
 * @param {{ label: string, variant?: 'primary'|'success'|'error'|'tertiary'|'secondary' }} props
 */
export default function Badge({ label, variant = 'secondary' }) {
  const variants = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    error: 'text-error bg-error/10',
    tertiary: 'text-tertiary bg-tertiary/10',
    secondary: 'text-secondary bg-secondary/10',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
        variants[variant] || variants.secondary
      }`}
    >
      {label}
    </span>
  );
}
