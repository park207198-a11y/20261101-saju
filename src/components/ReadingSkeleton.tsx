export default function ReadingSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="AI가 풀이하는 중">
      <div className="skeleton h-12 w-full" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-8 w-20 shrink-0" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
