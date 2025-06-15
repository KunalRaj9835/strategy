// src/features/StrategyVisualizer/components/StrategyLegRow.tsx

"use client"; // This directive is ESSENTIAL for interactive components in Next.js

import React, { useCallback, useMemo } from "react";

// Import the SCSS module. 'styles' is the conventional name for the imported object.
import styles from "./StrategyLegRow.module.scss";

// Import shared UI components using the Next.js absolute path alias '@/'
import Checkbox from "@/components/Checkbox/Checkbox";
import ToggleButtonGroup from "@/components/ToggleButtonGroup/ToggleButtonGroup";
import Select from "@/components/Select/Select";
import Input from "@/components/Input/Input";
import Button from "@/components/Button/Button";

// --- Type Definitions (Unchanged) ---
interface SelectOption {
  label: string;
  value: string | number;
}

interface StrategyLeg {
  id: string | number;
  selected?: boolean;
  buySell: "Buy" | "Sell";
  legType: "option" | "future";
  expiry?: string;
  strike?: number;
  optionType?: string;
  lots: number;
  price: number | string;
  status?: "active_position" | string;
  instrumentSymbol?: string;
  token?: string | number;
  lotSize?: number;
}

interface StrategyLegRowProps {
  leg: StrategyLeg;
  onLegChange: (id: string | number, field: string, value: any) => void;
  onRemoveLeg: (id: string | number) => void;
  onAnalyzeLeg: (id: string | number) => void;
  onDuplicateLeg: (id: string | number) => void;
  allOptionExpiries?: SelectOption[];
  allFutureExpiries?: SelectOption[];
  getStrikesForOptionExpiry?: (expiry: string) => SelectOption[];
  getTypesForOptionExpiryStrike?: (
    expiry: string,
    strike: number
  ) => SelectOption[];
}

// --- React Component (Fully Corrected) ---
const StrategyLegRow: React.FC<StrategyLegRowProps> = ({
  leg,
  onLegChange,
  onRemoveLeg,
  onAnalyzeLeg,
  onDuplicateLeg,
  allOptionExpiries,
  allFutureExpiries,
  getStrikesForOptionExpiry,
  getTypesForOptionExpiryStrike,
}) => {
  const lotOptions = useMemo((): SelectOption[] => {
    /* ...logic from your file... */ return [];
  }, [leg.lots]);
  const handleNumericInputChange = useCallback(
    (id: string | number, field: string, stringValue: string): void => {
      /* ...logic... */
    },
    [onLegChange]
  );
  const isReadOnly: boolean = leg.status === "active_position";
  const handleFieldChange = useCallback(
    (field: string, value: any): void => {
      onLegChange(leg.id, field, value);
    },
    [leg.id, onLegChange]
  );
  const strikeOptionsForSelectedOptionExpiry = useMemo((): SelectOption[] => {
    if (leg.legType === "option" && leg.expiry && getStrikesForOptionExpiry) {
      return getStrikesForOptionExpiry(leg.expiry);
    }
    return [];
  }, [leg.legType, leg.expiry, getStrikesForOptionExpiry]);
  const typeOptionsForSelectedOptionStrike = useMemo((): SelectOption[] => {
    if (
      leg.legType === "option" &&
      leg.expiry &&
      leg.strike &&
      getTypesForOptionExpiryStrike
    ) {
      return getTypesForOptionExpiryStrike(leg.expiry, leg.strike);
    }
    return [];
  }, [leg.legType, leg.expiry, leg.strike, getTypesForOptionExpiryStrike]);

  // **KEY CHANGE**: Dynamically build the className string using the 'styles' object.
  const rowClassName = [
    styles.strategyLegRow,
    leg.selected ? styles.isSelected : "",
    isReadOnly ? styles.isReadonlyPosition : "",
  ]
    .join(" ")
    .trim();

  return (
    <div className={rowClassName}>
      <Checkbox
        checked={leg.selected || false}
        onChange={(val) =>
          handleFieldChange(
            "selected",
            typeof val === "boolean" ? val : val.target.checked
          )
        }
        className={styles.legCheckbox}
      />
      <ToggleButtonGroup
        options={[
          { label: "Buy", value: "Buy" },
          { label: "Sell", value: "Sell" },
        ]}
        selected={leg.buySell}
        onSelect={(val) => handleFieldChange("buySell", val)}
        className={styles.legBuySell}
        disabled={isReadOnly}
      />

      {leg.legType === "option" && (
        <Select
          options={allOptionExpiries || []}
          value={leg.expiry}
          onChange={(val) => handleFieldChange("expiry", val)}
          className={styles.legSelect}
          placeholder="Expiry"
          disabled={isReadOnly || !allOptionExpiries?.length}
        />
      )}
      {leg.legType === "future" && (
        <Select
          options={allFutureExpiries || []}
          value={leg.expiry}
          onChange={(val) => handleFieldChange("expiry", val)}
          className={styles.legSelect}
          placeholder="Contract"
          disabled={isReadOnly || !allFutureExpiries?.length}
        />
      )}

      {leg.legType === "option" && (
        <Select
          options={strikeOptionsForSelectedOptionExpiry}
          value={leg.strike}
          onChange={(val) => handleFieldChange("strike", Number(val))}
          className={styles.legSelect}
          placeholder="Strike"
          disabled={
            isReadOnly ||
            !leg.expiry ||
            !strikeOptionsForSelectedOptionExpiry.length
          }
        />
      )}
      {leg.legType === "future" && (
        <Input
          type="text"
          value={leg.instrumentSymbol || "Future Details"}
          readOnly
          disabled={isReadOnly}
          title={`Future: ${leg.instrumentSymbol || leg.token || "N/A"}`}
        />
      )}

      {leg.legType === "option" && (
        <Select
          options={typeOptionsForSelectedOptionStrike}
          value={leg.optionType}
          onChange={(val) => handleFieldChange("optionType", val)}
          className={styles.legSelect}
          placeholder="Type"
          disabled={
            isReadOnly ||
            !leg.strike ||
            !typeOptionsForSelectedOptionStrike.length
          }
        />
      )}
      {leg.legType === "future" && (
        <span className={styles.legTypePlaceholder}>-</span>
      )}

      <Select
        options={lotOptions}
        value={leg.lots}
        onChange={(val) => handleFieldChange("lots", parseInt(val, 10) || 1)}
        className={styles.legSelect}
        disabled={isReadOnly}
      />
      <Input
        type="number"
        value={leg.price}
        onChange={(e) =>
          handleNumericInputChange(leg.id, "price", e.target.value)
        }
        className={styles.legPriceInput}
        step="0.05"
        title={`Token: ${leg.token || "N/A"} | Leg Type: ${
          leg.legType || "N/A"
        } | Lot Size: ${leg.lotSize || "N/A"}${
          isReadOnly ? " | Entry Price (Fixed)" : ""
        }`}
        disabled={isReadOnly}
      />
      <div className={styles.legActions}>
        <Button
          variant="icon"
          onClick={() => onAnalyzeLeg(leg.id)}
          icon="📈"
          size="small"
          title="Analyze Leg"
        />
        <Button
          variant="icon"
          onClick={() => onDuplicateLeg(leg.id)}
          icon="📋"
          size="small"
          title="Duplicate Leg"
        />
        <Button
          variant="icon"
          onClick={() => onRemoveLeg(leg.id)}
          icon="🗑️"
          size="small"
          title="Remove Leg"
          disabled={isReadOnly}
        />
      </div>
    </div>
  );
};

export default React.memo(StrategyLegRow);
