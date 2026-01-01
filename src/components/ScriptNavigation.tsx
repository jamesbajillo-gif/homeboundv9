import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
}

interface ScriptNavigationProps {
  sections: Section[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export function ScriptNavigation({ sections, activeSection, onNavigate }: ScriptNavigationProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b shadow-sm">
      <div className="flex items-center justify-center gap-1 p-2 overflow-x-auto">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <Button
              key={section.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onNavigate(section.id)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 transition-all",
                isActive && "shadow-md"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline text-xs">{section.title}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
