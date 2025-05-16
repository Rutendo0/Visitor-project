import { useState, useCallback } from 'react';

/**
 * A hook for managing tab state
 * @param initialTab Initial tab value
 * @param allowedTabs Array of allowed tab values
 * @returns [activeTab, setActiveTab]
 */
const useTabState = <T extends string>(initialTab: T, allowedTabs: T[]) => {
  // Make sure the initial tab is valid
  const validInitialTab = allowedTabs.includes(initialTab) ? initialTab : allowedTabs[0];
  
  const [activeTab, setActiveTabState] = useState<T>(validInitialTab);
  
  const setActiveTab = useCallback((tab: T) => {
    // Only set the tab if it's in the allowed tabs
    if (allowedTabs.includes(tab)) {
      setActiveTabState(tab);
    } else {
      console.warn(`Tab "${tab}" is not allowed. Allowed tabs: ${allowedTabs.join(', ')}`);
    }
  }, [allowedTabs]);
  
  return [activeTab, setActiveTab] as const;
};

export default useTabState;
