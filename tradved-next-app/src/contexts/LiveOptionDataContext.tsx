"use client";
import React, { createContext, useContext, useMemo, FC, ReactNode } from 'react';

// Assumed import from your hooks file. The enum and hook return type are defined below for clarity.
import useOptionChainWebSocket from '@/hooks/useOptionChainWebSocket';

// --- TYPE DEFINITIONS ---

// The ReadyState enum, aliased for clarity as in the original code.
export enum SocketIOReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// Base instrument structure common to both options and futures.
interface BaseInstrument {
  token: string;
  underlying: string;
  instrumenttype: 'FUTIDX' | 'FUTSTK' | 'OPTIDX' | 'OPTSTK';
  expiryDate?: string; // It's safer to type as string unless you parse it into a Date object.
  expiry?: string;
  ltp?: number; // Example of other potential numeric properties.
  legTypeDb?: 'future' | 'option'; // This field is added programmatically.
}

// Specific type for an Option instrument.
interface OptionInstrument extends BaseInstrument {
  instrumenttype: 'OPTIDX' | 'OPTSTK';
  strike: number;
  optionType: 'CE' | 'PE';
}

// Specific type for a Future instrument.
interface FutureInstrument extends BaseInstrument {
  instrumenttype: 'FUTIDX' | 'FUTSTK';
  lotSize: number;
}

// A union type representing any possible instrument from the WebSocket.
export type Instrument = OptionInstrument | FutureInstrument;

// Defines the shape of the data returned by the useOptionChainWebSocket hook.
interface UseOptionChainWebSocketReturn {
  optionChainMap: Map<string, Instrument>;
  readyState: SocketIOReadyState;
}

// Defines the structure for grouped instruments.
interface TradableInstruments {
  options: OptionInstrument[];
  futures: FutureInstrument[];
}

// Defines the complete shape of the context value.
interface LiveOptionDataContextType {
  liveOptionChainMap: Map<string, Instrument>;
  liveInstrumentChainArray: Instrument[];
  websocketReadyState: SocketIOReadyState;
  SocketIOReadyState: typeof SocketIOReadyState; // Provides access to the enum itself.
  availableUnderlyings: string[];
  getTradableInstrumentsByUnderlying: (underlyingSymbol: string) => TradableInstruments;
  getInstrumentByToken: (token: string) => Instrument | undefined;
  getOptionsByUnderlying: undefined; // Marked for deprecation.
  getOptionByToken: undefined; // Marked for deprecation.
}

// Defines the props for the provider component.
interface LiveOptionDataProviderProps {
  children: ReactNode;
}


// --- CONTEXT AND PROVIDER IMPLEMENTATION ---

const LiveOptionDataContext = createContext<LiveOptionDataContextType | null>(null);

export const LiveOptionDataProvider: FC<LiveOptionDataProviderProps> = ({ children }) => {
    // Cast optionChainMap to Map<string, Instrument> if you are sure OptionData matches Instrument
    const { optionChainMap, readyState } = useOptionChainWebSocket() as unknown as UseOptionChainWebSocketReturn;

    // Type guard to check if an instrument is a future.
    // This helps TypeScript narrow down the 'Instrument' union type.
    const isFutureInstrument = (instrument: Instrument): instrument is FutureInstrument => {
        return instrument.instrumenttype === "FUTIDX" || instrument.instrumenttype === "FUTSTK";
    };

    const availableUnderlyings = useMemo<string[]>(() => {
        const underlyings = new Set<string>();
        if (optionChainMap) {
            optionChainMap.forEach(instrument => underlyings.add(instrument.underlying));
        }
        return Array.from(underlyings).sort();
    }, [optionChainMap]);

    const getTradableInstrumentsByUnderlying = useMemo(() => (underlyingSymbol: string): TradableInstruments => {
        const instruments: TradableInstruments = { options: [], futures: [] };

        if (optionChainMap && underlyingSymbol) {
            optionChainMap.forEach(instrument => {
                if (instrument.underlying?.toUpperCase() === underlyingSymbol.toUpperCase()) {
                    if (isFutureInstrument(instrument)) {
                        instruments.futures.push({
                            ...instrument,
                            legTypeDb: 'future'
                        });
                    } else if ('strike' in instrument && 'optionType' in instrument) { // Type-safe check for Option
                        instruments.options.push({
                            ...instrument,
                            legTypeDb: 'option'
                        });
                    }
                }
            });
        }

        instruments.futures.sort((a, b) => {
            try {
                const dateA = new Date(a.expiryDate || a.expiry || 0);
                const dateB = new Date(b.expiryDate || b.expiry || 0);
                if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                    return dateA.getTime() - dateB.getTime();
                }
            } catch (e) { /* Fallback for bad dates */ }
            return (a.expiry || "").localeCompare(b.expiry || "");
        });

        return instruments;
    }, [optionChainMap]);

    const getInstrumentByToken = useMemo(() => (token: string): Instrument | undefined => {
        if (optionChainMap && token) {
            const instrument = optionChainMap.get(String(token));
            if (instrument) {
                // Ensure 'legTypeDb' is consistently defined for clarity.
                if (isFutureInstrument(instrument) && !instrument.legTypeDb) {
                    return { ...instrument, legTypeDb: 'future' };
                } else if ('strike' in instrument && !instrument.legTypeDb) {
                    return { ...instrument, legTypeDb: 'option' };
                }
                return instrument;
            }
        }
        return undefined;
    }, [optionChainMap]);

    const liveInstrumentChainArray = useMemo<Instrument[]>(() => {
        if (!optionChainMap) return [];
        return Array.from(optionChainMap.values()).map(instrument => {
            // Assign legTypeDb if it's not already present.
            if (isFutureInstrument(instrument) && !instrument.legTypeDb) {
                return { ...instrument, legTypeDb: 'future' };
            } else if ('strike' in instrument && !instrument.legTypeDb) {
                return { ...instrument, legTypeDb: 'option' };
            }
            return instrument;
        });
    }, [optionChainMap]);

    console.log("LiveOptionDataProvider: liveInstrumentChainArray length:", liveInstrumentChainArray.length);

    const value: LiveOptionDataContextType = {
        liveOptionChainMap: optionChainMap,
        liveInstrumentChainArray: liveInstrumentChainArray,
        websocketReadyState: readyState,
        SocketIOReadyState: SocketIOReadyState,
        availableUnderlyings: availableUnderlyings,
        getTradableInstrumentsByUnderlying: getTradableInstrumentsByUnderlying,
        getInstrumentByToken: getInstrumentByToken,
        getOptionsByUnderlying: undefined,
        getOptionByToken: undefined,
    };

    return (
        <LiveOptionDataContext.Provider value={value}>
            {children}
        </LiveOptionDataContext.Provider>
    );
};

// --- CONSUMER HOOK ---

export const useLiveOptionData = (): LiveOptionDataContextType => {
    const context = useContext(LiveOptionDataContext);
    if (!context) {
        throw new Error('useLiveOptionData must be used within a LiveOptionDataProvider');
    }
    return context;
};