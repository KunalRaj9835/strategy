// src/hooks/useOptionChainWebSocket.ts
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Configuration
const SOCKET_IO_SERVER_URL = 'http://localhost:1220'; // Adjust to your backend URL
const OPTION_CHAIN_EVENT_NAME = 'option_and_future_Chain'; // Event name from your backend

// Simplified ReadyState for Socket.IO
export const SocketIOReadyState = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    RECONNECTING: 4,
} as const;

type SocketIOReadyStateType = typeof SocketIOReadyState[keyof typeof SocketIOReadyState];

interface OptionData {
    token: string | number;
    [key: string]: any; // Add more specific fields if available
}

const useOptionChainWebSocket = () => {
    const [optionChainMap, setOptionChainMap] = useState<Map<string, OptionData>>(new Map());
    const [readyState, setReadyState] = useState<SocketIOReadyStateType>(SocketIOReadyState.CONNECTING);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        console.log('[Socket.IO Hook] Initializing connection to:', SOCKET_IO_SERVER_URL);
        setReadyState(SocketIOReadyState.CONNECTING);
        setOptionChainMap(new Map());

        socketRef.current = io(SOCKET_IO_SERVER_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            transports: ['websocket'],
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('[Socket.IO Hook] Connected to server. Socket ID:', socket.id);
            setReadyState(SocketIOReadyState.OPEN);
        });

        socket.on('disconnect', (reason: Socket.DisconnectReason) => {
            console.log('[Socket.IO Hook] Disconnected from server. Reason:', reason);
            setReadyState(SocketIOReadyState.CLOSED);
        });

        socket.on('connect_error', (error: Error) => {
            console.error('[Socket.IO Hook] Connection Error:', error.message);
        });

        socket.on('reconnect_attempt', (attemptNumber: number) => {
            console.log(`[Socket.IO Hook] Reconnect attempt #${attemptNumber}`);
            setReadyState(SocketIOReadyState.RECONNECTING);
        });

        socket.on('reconnect', (attemptNumber: number) => {
            console.log(`[Socket.IO Hook] Reconnected after ${attemptNumber} attempts. Socket ID:`, socket.id);
            setReadyState(SocketIOReadyState.OPEN);
        });

        socket.on('reconnect_failed', () => {
            console.error('[Socket.IO Hook] Failed to reconnect after multiple attempts.');
            setReadyState(SocketIOReadyState.CLOSED);
        });

        socket.on(OPTION_CHAIN_EVENT_NAME, (incomingDataArray: OptionData[]) => {
            if (Array.isArray(incomingDataArray) && incomingDataArray.length > 0) {
                setOptionChainMap(prevMap => {
                    const newMap = new Map(prevMap);
                    incomingDataArray.forEach(option => {
                        if (option && option.token !== undefined) {
                            newMap.set(String(option.token), option);
                        } else {
                            console.warn('[Socket.IO Hook] Received option without token in array:', option);
                        }
                    });
                    return newMap;
                });
            } else if (Array.isArray(incomingDataArray) && incomingDataArray.length === 0) {
                // Empty array received — optionally handle this
            } else {
                console.warn(`[Socket.IO Hook] Received '${OPTION_CHAIN_EVENT_NAME}' but data is not a non-empty array:`, incomingDataArray);
            }
        });

        return () => {
            if (socket) {
                console.log('[Socket.IO Hook] Disconnecting socket...');
                socket.off(OPTION_CHAIN_EVENT_NAME);
                socket.disconnect();
                setReadyState(SocketIOReadyState.CLOSED);
            }
        };
    }, []);

    return { optionChainMap, readyState };
};

export default useOptionChainWebSocket;
