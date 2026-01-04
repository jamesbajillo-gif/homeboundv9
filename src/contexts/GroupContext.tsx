import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

type GroupType = "inbound" | "outbound";

interface GroupContextType {
  groupType: GroupType;
  loading: boolean;
  toggleGroup: () => void;
  hasBeenToggled: boolean;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groupType, setGroupType] = useState<GroupType>("outbound");
  const [hasBeenToggled, setHasBeenToggled] = useState(false);
  const [loading] = useState(false);

  // Toggle between inbound and outbound (manual override always allowed)
  const toggleGroup = () => {
    const newGroupType: GroupType = groupType === "inbound" ? "outbound" : "inbound";
    setGroupType(newGroupType);
    setHasBeenToggled(true);
  };

  return (
    <GroupContext.Provider value={{ groupType, loading, toggleGroup, hasBeenToggled }}>
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
