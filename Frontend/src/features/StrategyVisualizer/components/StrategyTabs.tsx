// src/features/StrategyVisualizer/components/StrategyTabs.tsx
import React from 'react';
import Button from '../../../components/Button/Button';
import './StrategyTabs.scss';

// Type definitions
interface Tab {
  id: string;
  label: string;
}

interface StrategyTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const StrategyTabs: React.FC<StrategyTabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = '' 
}) => (
  <nav className={`sv-strategy-tabs ${className}`}>
    {tabs.map((tab: Tab) => (
      <Button
        key={tab.id}
        variant="primary"
        className={activeTab === tab.id ? 'active' : ''}
        onClick={() => onTabChange(tab.id)}
      >
        {tab.label}
      </Button>
    ))}
  </nav>
);

export default StrategyTabs;