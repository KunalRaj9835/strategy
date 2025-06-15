// src/features/StrategyVisualizer/components/StrategyTabs.tsx

'use client'; // Required for components with onClick handlers

import React from 'react';
import styles from './StrategyTabs.module.scss'; // Import the new CSS Module

// Update import path to use the Next.js absolute alias
import Button from '@/components/Button/Button';

// --- Type Definitions (Unchanged) ---
interface Tab {
  id: string;
  label: string;
}

interface StrategyTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string; // Allows passing additional classes from the parent
}

// --- React Component (Fully Corrected) ---
const StrategyTabs: React.FC<StrategyTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  // Combine the local module class with any class passed from a parent component
  const navClassName = `${styles.svStrategyTabs} ${className}`.trim();

  return (
    <nav className={navClassName}>
      {tabs.map((tab: Tab) => {
        // Dynamically create the className string for each button
        const buttonClassName = [
          styles.tabButton,
          activeTab === tab.id ? styles.active : ''
        ].join(' ').trim();

        return (
          <Button
            key={tab.id}
            // Use the 'unstyled' variant if your Button component supports it,
            // or a 'secondary' variant, to let the SCSS module handle the styling.
            variant="unstyled" 
            className={buttonClassName}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        );
      })}
    </nav>
  );
};

export default StrategyTabs;
