import { Switch } from "@/components/ui/switch";
import { useGroup } from "@/contexts/GroupContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const GroupToggle = () => {
  const { groupType, toggleGroup } = useGroup();
  
  const isOutbound = groupType === "outbound";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={cn(
              "text-xs sm:text-sm font-semibold transition-colors",
              !isOutbound ? "text-primary" : "text-muted-foreground"
            )}>
              Inbound
            </span>
            <Switch 
              checked={isOutbound}
              onCheckedChange={toggleGroup}
            />
            <span className={cn(
              "text-xs sm:text-sm font-semibold transition-colors",
              isOutbound ? "text-primary" : "text-muted-foreground"
            )}>
              Outbound
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle between Inbound and Outbound scripts</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
