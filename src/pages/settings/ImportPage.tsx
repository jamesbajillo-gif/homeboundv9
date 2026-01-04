import { ImportData } from '@/components/settings/ImportData';
import { SettingsCampaignSelector } from '@/components/settings/SettingsCampaignSelector';

const ImportPage = () => {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Campaign Selector - At the very top */}
      <SettingsCampaignSelector />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-4xl">
          <ImportData />
        </div>
      </div>
    </div>
  );
};

export default ImportPage;

