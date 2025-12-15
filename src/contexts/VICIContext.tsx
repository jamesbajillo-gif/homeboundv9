import React, { createContext, useContext, useEffect, useState } from 'react';
import { VICILeadData, getVICILeadData } from '@/lib/vici-parser';

interface VICIContextType {
  leadData: VICILeadData;
  isVICIMode: boolean;
  refreshLeadData: () => void;
}

const VICIContext = createContext<VICIContextType | undefined>(undefined);

export function VICIProvider({ children }: { children: React.ReactNode }) {
  const [leadData, setLeadData] = useState<VICILeadData>({});
  const [isVICIMode, setIsVICIMode] = useState(false);

  const refreshLeadData = () => {
    const data = getVICILeadData();
    setLeadData(data);
    
    // Check if we have any lead data (indicates VICI mode)
    const hasLeadData = Object.keys(data).length > 0;
    setIsVICIMode(hasLeadData);
  };

  useEffect(() => {
    refreshLeadData();
    
    // Listen for URL changes (in case of navigation)
    const handleLocationChange = () => {
      refreshLeadData();
    };
    
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return (
    <VICIContext.Provider value={{ leadData, isVICIMode, refreshLeadData }}>
      {children}
    </VICIContext.Provider>
  );
}

export function useVICI() {
  const context = useContext(VICIContext);
  if (context === undefined) {
    throw new Error('useVICI must be used within a VICIProvider');
  }
  return context;
}
