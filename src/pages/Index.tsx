import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingCallHeader } from "@/components/FloatingCallHeader";
import { ScriptDisplay } from "@/components/ScriptDisplay";
import { VICILeadDisplay } from "@/components/VICILeadDisplay";
import { PasswordDialog } from "@/components/PasswordDialog";
import { ListIdBadge } from "@/components/ListIdBadge";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const Index = () => {
  const navigate = useNavigate();
  const qualificationSubmitRef = useRef<(() => void) | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useKeyboardShortcuts(() => setPasswordDialogOpen(true));

  return (
    <div className="min-h-screen bg-background overflow-hidden h-screen">
      <FloatingCallHeader />
      <div className="pt-12 md:pt-14 px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <VICILeadDisplay />
        </div>
      </div>
      <ScriptDisplay 
        onQualificationSubmitRef={(fn) => { qualificationSubmitRef.current = fn; }}
      />
      <ListIdBadge />
      <PasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onSuccess={(password) => {
          localStorage.setItem('tmdebt_settings_access_level', password);
          navigate('/settings');
        }}
      />
    </div>
  );
};

export default Index;
