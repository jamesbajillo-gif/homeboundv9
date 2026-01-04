import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MySQLSettings } from "@/components/settings/MySQLSettings";
import { SettingsCampaignSelector } from "@/components/settings/SettingsCampaignSelector";

const MySQLPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Campaign Selector - At the very top */}
      <SettingsCampaignSelector />
      
      <div className="flex-none bg-background border-b p-4 sm:p-6 lg:px-8 lg:py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">MySQL Configuration</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <MySQLSettings />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default MySQLPage;

