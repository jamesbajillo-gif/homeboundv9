import { LucideIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg pb-[env(safe-area-inset-bottom)]">
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

        {/* Settings button on far right */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="shrink-0 ml-2 h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
