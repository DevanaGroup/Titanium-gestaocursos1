import React, { createContext, useContext, useState } from 'react';

interface HeaderActionsContextType {
  rightAction: React.ReactNode | null;
  setRightAction: (action: React.ReactNode | null) => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextType | undefined>(undefined);

export const useHeaderActions = () => {
  const context = useContext(HeaderActionsContext);
  if (!context) {
    throw new Error('useHeaderActions must be used within HeaderActionsProvider');
  }
  return context;
};

interface HeaderActionsProviderProps {
  children: React.ReactNode;
}

export const HeaderActionsProvider: React.FC<HeaderActionsProviderProps> = ({ children }) => {
  const [rightAction, setRightAction] = useState<React.ReactNode | null>(null);

  return (
    <HeaderActionsContext.Provider value={{ rightAction, setRightAction }}>
      {children}
    </HeaderActionsContext.Provider>
  );
};

