export function Button({ children, variant = 'primary', size = 'md', className = '', disabled = false, onClick, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 select-none';

  const variants = {
    primary: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-glow-sm hover:shadow-glow-indigo active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-white/8 hover:bg-white/12 text-slate-200 border border-white/10 hover:border-indigo-500/40 active:scale-95 disabled:opacity-50',
    ghost: 'text-slate-400 hover:text-indigo-400 hover:bg-white/5 active:scale-95 disabled:opacity-50',
    danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 active:scale-95 disabled:opacity-50',
    gradient: 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-glow-sm active:scale-95 disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    icon: 'p-2.5',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
