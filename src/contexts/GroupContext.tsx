import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

type GroupType = "inbound" | "outbound";

interface GroupContextType {
  groupType: GroupType;
  loading: boolean;
  toggleGroup: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groupType, setGroupType] = useState<GroupType>("inbound");
  const [loading] = useState(false);

  // Toggle between inbound and outbound (manual override always allowed)
  const toggleGroup = () => {
    const newGroupType: GroupType = groupType === "inbound" ? "outbound" : "inbound";
    setGroupType(newGroupType);
  };

  return (
    <GroupContext.Provider value={{ groupType, loading, toggleGroup }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
