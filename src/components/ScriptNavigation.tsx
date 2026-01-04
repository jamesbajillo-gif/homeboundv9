import { useState, useEffect, useRef, useCallback } from 'react';
import { LucideIcon, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useVICI } from '@/contexts/VICIContext';
import { getUserId, getLoggedInUser, clearLoggedInUser } from '@/lib/userHistory';
import { UserLoginDialog } from '@/components/UserLoginDialog';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  visibilityKey?: string;
}

interface ScriptNavigationProps {
  sections: Section[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  defaultSections?: Array<{ id: string; title: string }>;
}

export function ScriptNavigation({ sections, activeSection, onNavigate, defaultSections = [] }: ScriptNavigationProps) {
  const navigate = useNavigate();
  const { leadData } = useVICI();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getUserId(leadData));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Update user ID when leadData changes or when user logs in/out
  useEffect(() => {
    setCurrentUserId(getUserId(leadData));
  }, [leadData]);
  
  // Listen for login/logout events
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentUserId(getUserId(leadData));
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('user-login-change', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-login-change', handleStorageChange);
    };
  }, [leadData]);
  
  const loggedInUser = getLoggedInUser();

  // Check scroll position and update navigation buttons
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Scroll to active tab smoothly
  const scrollToActiveTab = useCallback(() => {
    const container = scrollContainerRef.current;
    const activeTab = tabsRef.current.get(activeSection);
    
    if (!container || !activeTab) return;
    
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    
    // Calculate scroll position to center the active tab
    const scrollLeft = container.scrollLeft;
    const tabLeft = activeTab.offsetLeft;
    const tabWidth = activeTab.offsetWidth;
    const containerWidth = container.clientWidth;
    
    // Center the active tab in the viewport
    const targetScroll = tabLeft - (containerWidth / 2) + (tabWidth / 2);
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }, [activeSection]);

  // Scroll functions for navigation buttons
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of viewport
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of viewport
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  // Handle wheel events for horizontal scrolling
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Only scroll horizontally if user is scrolling horizontally
    // or if shift key is pressed (for vertical mouse wheel)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      container.scrollBy({
        left: e.deltaX || e.deltaY,
        behavior: 'smooth'
      });
    }
  }, []);

  // Scroll to active tab when it changes
  useEffect(() => {
    scrollToActiveTab();
  }, [activeSection, scrollToActiveTab]);

  // Check scroll position on mount and scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    
    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition, sections]);

  const handleUserClick = () => {
    if (!currentUserId) {
      // No user logged in, show login dialog
      setLoginDialogOpen(true);
    } else if (loggedInUser) {
      // User is manually logged in, allow logout
      const confirmLogout = window.confirm(`Log out from user ${loggedInUser}?`);
      if (confirmLogout) {
        clearLoggedInUser();
        setCurrentUserId(null);
        toast.success('Logged out');
        // Dispatch event to update other components
        window.dispatchEvent(new Event('user-login-change'));
      }
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-1 p-2 w-full">
          {/* User ID on the left - hidden on smaller screens */}
          <div 
            className={cn(
              "shrink-0 mr-auto px-2 hidden md:block",
              !currentUserId && "cursor-pointer hover:text-foreground transition-colors"
            )}
            onClick={handleUserClick}
            title={!currentUserId ? "Click to log in" : loggedInUser ? "Click to log out" : undefined}
          >
            <span className="text-xs text-muted-foreground font-medium">
              User: {currentUserId || 'Not logged in'}
            </span>
          </div>
        
          {/* Navigation tabs - scrollable container with smooth transitions */}
          <div className="flex items-center gap-1 flex-1 justify-center w-full min-w-0 relative">
            {/* Left scroll button */}
            {canScrollLeft && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-7 w-7 absolute left-0 z-10 bg-background/80 backdrop-blur-sm"
                onClick={scrollLeft}
                title="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Scrollable tabs container */}
            <div
              ref={scrollContainerRef}
              onWheel={handleWheel}
              className="flex items-center gap-1 flex-1 justify-center w-full min-w-0 overflow-x-auto scroll-smooth scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <TooltipProvider>
              {sections.map((section, index) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const activeIndex = sections.findIndex(s => s.id === activeSection);
            
            // Determine which tabs should show full text to ensure at least 3 tabs display text
            // Priority: Active tab + surrounding tabs to reach minimum of 3
            const getTabsToShowText = () => {
              const tabsToShow: number[] = [];
              
              if (sections.length <= 3) {
                // If 3 or fewer tabs total, show all
                return sections.map((_, i) => i);
              }
              
              // Always include active tab
              tabsToShow.push(activeIndex);
              
              // Add tabs around active to reach at least 3
              let beforeCount = 0;
              let afterCount = 0;
              
              // Try to balance: show 1 before and 1 after (total 3)
              if (activeIndex > 0) {
                tabsToShow.push(activeIndex - 1);
                beforeCount = 1;
              }
              if (activeIndex < sections.length - 1) {
                tabsToShow.push(activeIndex + 1);
                afterCount = 1;
              }
              
              // If we still don't have 3, add more tabs
              while (tabsToShow.length < 3 && tabsToShow.length < sections.length) {
                // Prefer adding after tabs first, then before
                if (activeIndex + afterCount + 1 < sections.length) {
                  tabsToShow.push(activeIndex + afterCount + 1);
                  afterCount++;
                } else if (activeIndex - beforeCount - 1 >= 0) {
                  tabsToShow.push(activeIndex - beforeCount - 1);
                  beforeCount++;
                } else {
                  break; // Can't add more
                }
              }
              
              return tabsToShow;
            };
            
            const tabsToShowText = getTabsToShowText();
            const shouldShowText = tabsToShowText.includes(index);
            
            // Parse color from section.color and map to Tailwind classes
            // Supports: "text-blue-500", "border-blue-500", "text-green-500", etc.
            const getColorClasses = (colorString: string) => {
              // Extract color name and shade (e.g., "blue-500" from "text-blue-500")
              const colorMatch = colorString.match(/(?:text-|border-|bg-)?([a-z]+)-(\d+)/);
              if (!colorMatch) {
                // Default to primary if no match
                return {
                  border: "border-primary",
                  bg: "bg-primary/10",
                  hover: "hover:bg-primary/20",
                  text: "text-primary"
                };
              }
              
              const [, colorName, shade] = colorMatch;
              
              // Map to valid Tailwind classes
              const colorMap: Record<string, Record<string, string>> = {
                'blue': {
                  border: 'border-blue-500',
                  bg: 'bg-blue-500/10',
                  hover: 'hover:bg-blue-500/20',
                  text: 'text-blue-500'
                },
                'green': {
                  border: 'border-green-500',
                  bg: 'bg-green-500/10',
                  hover: 'hover:bg-green-500/20',
                  text: 'text-green-500'
                },
                'amber': {
                  border: 'border-amber-500',
                  bg: 'bg-amber-500/10',
                  hover: 'hover:bg-amber-500/20',
                  text: 'text-amber-500'
                },
                'slate': {
                  border: 'border-slate-500',
                  bg: 'bg-slate-500/10',
                  hover: 'hover:bg-slate-500/20',
                  text: 'text-slate-500'
                },
                'purple': {
                  border: 'border-purple-500',
                  bg: 'bg-purple-500/10',
                  hover: 'hover:bg-purple-500/20',
                  text: 'text-purple-500'
                },
                'red': {
                  border: 'border-red-500',
                  bg: 'bg-red-500/10',
                  hover: 'hover:bg-red-500/20',
                  text: 'text-red-500'
                }
              };
              
              return colorMap[colorName] || colorMap['blue'];
            };
            
            const colorClasses = getColorClasses(section.color);
            
            const button = (
              <Button
                key={section.id}
                ref={(el) => {
                  if (el) {
                    tabsRef.current.set(section.id, el);
                  } else {
                    tabsRef.current.delete(section.id);
                  }
                }}
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(section.id)}
                className={cn(
                  "flex items-center gap-1.5 transition-all relative shrink-0",
                  // Padding based on whether showing text
                  shouldShowText ? "px-3" : "px-2",
                  // Active state styling with color
                  isActive && [
                    "shadow-md border-2",
                    colorClasses.border,
                    colorClasses.bg,
                    colorClasses.hover,
                    colorClasses.text,
                    "font-medium"
                  ],
                  // Inactive state
                  !isActive && "hover:bg-muted"
                )}
              >
                <Icon className={cn(
                  "shrink-0 transition-all",
                  isActive ? "h-5 w-5" : "h-4 w-4"
                )} />
                {/* Show text for active, prev, and next tabs */}
                {shouldShowText && (
                  <span className="text-xs whitespace-nowrap">
                    {section.title}
                  </span>
                )}
              </Button>
            );
            
            // Show tooltip for tabs that don't show text (icon-only)
            if (!shouldShowText) {
              return (
                <Tooltip key={section.id}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{section.title}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return button;
            })}
            </TooltipProvider>
            </div>
            
            {/* Right scroll button */}
            {canScrollRight && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-7 w-7 absolute right-0 z-10 bg-background/80 backdrop-blur-sm"
                onClick={scrollRight}
                title="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Settings button on far right - only visible for admin (000) */}
          {currentUserId === '000' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="shrink-0 h-8 w-8"
              title="Settings (Admin only)"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
    </div>
    
    {/* Login Dialog */}
    <UserLoginDialog
      open={loginDialogOpen}
      onOpenChange={setLoginDialogOpen}
      onSuccess={() => {
        // Update user ID state
        setCurrentUserId(getUserId(leadData));
        // Dispatch event to update other components
        window.dispatchEvent(new Event('user-login-change'));
      }}
    />
    </>
  );
}
