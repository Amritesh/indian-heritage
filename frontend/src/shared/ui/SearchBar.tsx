type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
};

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search across centuries of heritage...',
  onSubmit,
}: SearchBarProps) {
  return (
    <div className="bg-surface-container-low p-2 rounded-xl flex items-center shadow-sm">
      <span className="material-symbols-outlined ml-4 text-outline">search</span>
      <input
        className="w-full bg-transparent border-none focus:ring-0 text-lg font-body px-4 py-3 placeholder:text-outline/60"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        type="search"
      />
      {onSubmit && (
        <button
          onClick={onSubmit}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all shrink-0"
        >
          Search
        </button>
      )}
    </div>
  );
}
