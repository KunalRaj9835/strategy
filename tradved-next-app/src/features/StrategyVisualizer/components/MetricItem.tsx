// src/features/StrategyVisualizer/components/MetricItem.tsx

'use client'; // Best practice for UI components that may be used in interactive sections.

import React, { ReactNode } from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './MetricItem.module.scss';

// --- Type Definitions (Fully Typed for Robustness) ---

// Props for the internal InfoIcon component.
interface InfoIconProps {
  title?: string;
}

// Props for the main MetricItem component.
interface MetricItemProps {
  label?: string; // Made optional to support cases where only a value is needed (e.g., Risk/Reward ratio).
  value: string | number | null | undefined;
  subValue?: string | number | null | undefined;
  valueClass?: string; // This will receive a pre-compiled class name from the parent (e.g., styles.profitValue).
  infoIconTitle?: string;
  children?: ReactNode; // To pass other elements like buttons next to the label.
}

// --- Internal InfoIcon Component ---
// A small, reusable icon component kept local to this file.
const InfoIcon: React.FC<InfoIconProps> = ({ title = 'More information' }) => (
  <span className={styles.infoIcon} title={title} role="img" aria-label="Information">
    ⓘ
  </span>
);

// --- Main Component (Fully Corrected with Best Practices) ---
const MetricItem: React.FC<MetricItemProps> = ({
  label,
  value,
  subValue,
  valueClass = '',
  infoIconTitle,
  children,
}) => (
  <div className={styles.metricItem}>
    {/* The label and its addons are only rendered if a label is provided. */}
    {label && (
      <h4 className={styles.metricLabel}>
        {label}
        {/* Children are wrapped in a span for distinct styling, if needed. */}
        {children && <span className={styles.metricLabelAddon}>{children}</span>}
        {/* The info icon is now controlled by the presence of `infoIconTitle`. */}
        {infoIconTitle && <InfoIcon title={infoIconTitle} />}
      </h4>
    )}
    <p className={`${styles.metricValue} ${valueClass}`}>
      {/* BEST PRACTICE CORRECTION: A single, clean check for a "not available" state. */}
      {value === null || value === undefined || value === '' ? 'N/A' : String(value)}
    </p>
    {/* The sub-value is only rendered if it exists. */}
    {subValue && <p className={styles.metricSubValue}>{subValue}</p>}
  </div>
);

// Using React.memo for performance optimization, as this component is likely to be
// rendered in lists or grids where props might not change on every parent re-render.
export default React.memo(MetricItem);
