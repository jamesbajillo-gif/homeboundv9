import { useState, useEffect } from 'react';
import { LucideIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useVICI } from '@/contexts/VICIContext';
import { getUserId, getLoggedInUser, clearLoggedInUser } from '@/lib/userHistory';
import { UserLoginDialog } from '@/components/UserLoginDialog';
import { toast } from 'sonner';

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
}

export function ScriptNavigation({ sections, activeSection, onNavigate }: ScriptNavigationProps) {
  const navigate = useNavigate();
  const { leadData } = useVICI();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getUserId(leadData));
  
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
        <div className="flex items-center gap-1 p-2 overflow-x-auto">
          {/* User ID on the left - always show, clickable if no user */}
          <div 
            className={cn(
              "shrink-0 mr-auto px-2",
              !currentUserId && "cursor-pointer hover:text-foreground transition-colors"
            )}
            onClick={handleUserClick}
            title={!currentUserId ? "Click to log in" : loggedInUser ? "Click to log out" : undefined}
          >
            <span className="text-xs text-muted-foreground font-medium">
              User: {currentUserId || 'Not logged in'}
            </span>
          </div>
        
        <div className="flex items-center gap-1 flex-1 justify-center">
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

        {/* Settings button on far right - only visible for user 000 */}
        {currentUserId === '000' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="shrink-0 ml-auto h-8 w-8"
            title="Settings (User 000 only)"
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
