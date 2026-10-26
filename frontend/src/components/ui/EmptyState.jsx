export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center animate-fade-in">
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-3xl">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-500">{description}</p>
      )}
      {action}
    </div>
  );
}
