import { useVICI } from '@/contexts/VICIContext';
import { cn } from '@/lib/utils';

export const ListIdBadge = () => {
  const { leadData } = useVICI();
  
  // Don't show if no list_id or if it's a VICI placeholder
  if (!leadData.list_id || leadData.list_id.includes('--A--')) {
    return null;
  }
  
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-30",
        "px-2 py-1 rounded",
        "bg-muted/60 backdrop-blur-sm",
        "text-[10px] font-mono text-muted-foreground",
        "opacity-50 hover:opacity-100 transition-opacity",
        "pointer-events-none"
      )}
    >
      {leadData.list_id}
    </div>
  );
};
