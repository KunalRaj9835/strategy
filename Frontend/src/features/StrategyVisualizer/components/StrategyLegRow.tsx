// src/features/StrategyVisualizer/components/StrategyLegRow.tsx
import React, { useCallback, useMemo } from 'react';
import Checkbox from '../../../components/Checkbox/Checkbox';
import ToggleButtonGroup from '../../../components/ToggleButtonGroup/ToggleButtonGroup';
import Select from '../../../components/Select/Select';
import Input from '../../../components/Input/Input';
import Button from '../../../components/Button/Button';
import './StrategyLegRow.scss';

// Type definitions
interface SelectOption {
  label: string;
  value: string | number;
}

interface StrategyLeg {
  id: string | number;
  selected?: boolean;
  buySell: 'Buy' | 'Sell';
  legType: 'option' | 'future';
  expiry?: string;
  strike?: number;
  optionType?: string;
  lots: number;
  price: number | string;
  status?: 'active_position' | string;
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
  getTypesForOptionExpiryStrike?: (expiry: string, strike: number) => SelectOption[];
}

const StrategyLegRow: React.FC<StrategyLegRowProps> = ({
    leg,
    onLegChange,
    onRemoveLeg,
    onAnalyzeLeg,
    onDuplicateLeg,
    allOptionExpiries,
    allFutureExpiries,
    getStrikesForOptionExpiry,
    getTypesForOptionExpiryStrike
}) => {
    // Generate lot options
    const lotOptions = useMemo((): SelectOption[] => {
        const options: SelectOption[] = Array.from({ length: 10 }, (_, i) => ({ 
            label: String(i + 1), 
            value: i + 1 
        }));
        if (leg.lots > 10 && !options.find(opt => opt.value === leg.lots)) {
            options.push({ label: String(leg.lots), value: leg.lots });
            options.sort((a, b) => (a.value as number) - (b.value as number));
        }
        return options;
    }, [leg.lots]);

    // Handle numeric input changes
    const handleNumericInputChange = useCallback((id: string | number, field: string, stringValue: string): void => {
        const numericValue: number = parseFloat(stringValue);
        if (!isNaN(numericValue) || stringValue === '') {
            onLegChange(id, field, stringValue === '' ? '' : numericValue);
        }
    }, [onLegChange]);

    // This is the key for disabling UI elements based on the leg's status
    const isReadOnly: boolean = leg.status === 'active_position';

    // Memoized function to handle field changes consistently
    const handleFieldChange = useCallback((field: string, value: any): void => {
        onLegChange(leg.id, field, value);
    }, [leg.id, onLegChange]);

    // Get available strikes for the selected option expiry
    const strikeOptionsForSelectedOptionExpiry = useMemo((): SelectOption[] => {
        if (leg.legType === 'option' && leg.expiry && getStrikesForOptionExpiry) {
            return getStrikesForOptionExpiry(leg.expiry);
        }
        return [];
    }, [leg.legType, leg.expiry, getStrikesForOptionExpiry]);

    // Get available option types for the selected option expiry and strike
    const typeOptionsForSelectedOptionStrike = useMemo((): SelectOption[] => {
        if (leg.legType === 'option' && leg.expiry && leg.strike && getTypesForOptionExpiryStrike) {
            return getTypesForOptionExpiryStrike(leg.expiry, leg.strike);
        }
        return [];
    }, [leg.legType, leg.expiry, leg.strike, getTypesForOptionExpiryStrike]);

    return (
        <div className={`strategy-leg-row ${leg.selected ? 'is-selected' : ''} ${isReadOnly ? 'is-readonly-position' : ''}`}>
            {/* Checkbox is ALWAYS enabled for selection, regardless of isReadOnly */}
            <Checkbox
                checked={leg.selected || false}
                onChange={(val: boolean | React.ChangeEvent<HTMLInputElement>) => 
                    handleFieldChange('selected', typeof val === 'boolean' ? val : val.target.checked)
                }
                className="leg-checkbox"
            />
            <ToggleButtonGroup
                options={[{ label: 'Buy', value: 'Buy' }, { label: 'Sell', value: 'Sell' }]}
                selected={leg.buySell}
                onSelect={(val: string) => handleFieldChange('buySell', val)}
                className="leg-buy-sell"
                disabled={isReadOnly} // UI LOCK: Disable if it's an active position
            />

            {/* Conditional rendering for Expiry/Contract based on legType */}
            {leg.legType === 'option' && (
                <Select
                    options={allOptionExpiries || []}
                    value={leg.expiry}
                    onChange={(val: string) => handleFieldChange('expiry', val)}
                    className="leg-select leg-expiry"
                    placeholder="Expiry"
                    disabled={isReadOnly || !allOptionExpiries || allOptionExpiries.length === 0} // UI LOCK
                />
            )}
            {leg.legType === 'future' && (
                <Select
                    options={allFutureExpiries || []}
                    value={leg.expiry} // For futures, 'expiry' field stores the future contract's token/identifier
                    onChange={(val: string) => handleFieldChange('expiry', val)}
                    className="leg-select leg-future-contract"
                    placeholder="Contract"
                    disabled={isReadOnly || !allFutureExpiries || allFutureExpiries.length === 0} // UI LOCK
                />
            )}

            {/* Conditional rendering for Strike based on legType */}
            {leg.legType === 'option' && (
                <Select
                    options={strikeOptionsForSelectedOptionExpiry || []}
                    value={leg.strike}
                    onChange={(val: string) => handleFieldChange('strike', Number(val))}
                    className="leg-select leg-strike"
                    placeholder="Strike"
                    disabled={isReadOnly || !leg.expiry || !strikeOptionsForSelectedOptionExpiry || strikeOptionsForSelectedOptionExpiry.length === 0} // UI LOCK
                />
            )}
            {leg.legType === 'future' && (
                <Input
                    type="text"
                    value={leg.instrumentSymbol || 'Future Details'}
                    className="leg-future-details-display"
                    readOnly // Typically, future details other than contract selection aren't directly edited here
                    disabled={isReadOnly}
                    title={`Future: ${leg.instrumentSymbol || leg.token || 'N/A'}`}
                />
            )}

            {/* Conditional rendering for Option Type (CE/PE) */}
            {leg.legType === 'option' && (
                 <Select
                    options={typeOptionsForSelectedOptionStrike || []}
                    value={leg.optionType}
                    onChange={(val: string) => handleFieldChange('optionType', val)}
                    className="leg-select leg-type"
                    placeholder="Type"
                    disabled={isReadOnly || !leg.strike || !typeOptionsForSelectedOptionStrike || typeOptionsForSelectedOptionStrike.length === 0} // UI LOCK
                />
            )}
            {leg.legType === 'future' && (
                <span className="leg-type-placeholder">-</span> // Placeholder for "Type" column for futures
            )}

            <Select
                options={lotOptions}
                value={leg.lots}
                onChange={(val: string) => handleFieldChange('lots', parseInt(val) || 1)}
                className="leg-select leg-lots"
                disabled={isReadOnly} // UI LOCK
            />
            <Input
                type="number"
                value={leg.price} // This is entryPrice for active, LTP for new
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleNumericInputChange(leg.id, 'price', e.target.value)
                }
                className="leg-price-input"
                step="0.05"
                title={`Token: ${leg.token || 'N/A'} | Leg Type: ${leg.legType || 'N/A'} | Lot Size: ${leg.lotSize || 'N/A'}${isReadOnly ? ' | Entry Price (Fixed)' : ''}`}
                disabled={isReadOnly} // UI LOCK: Price of an active position is fixed
            />
            <div className="leg-actions">
                <Button 
                    variant="icon" 
                    onClick={() => onAnalyzeLeg(leg.id)} 
                    icon="📈" 
                    size="small" 
                    title="Analyze Leg" 
                />
                {/* Duplicate button is not disabled for active positions, it creates a NEW leg */}
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
                    disabled={isReadOnly} // UI LOCK: Disable remove for active positions
                />
            </div>
        </div>
    );
};

export default React.memo(StrategyLegRow);