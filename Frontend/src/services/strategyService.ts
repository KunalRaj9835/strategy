const API_BASE_URL = 'http://localhost:1220/api/v1';

// Define the type for a single leg if known. For now, using `any`.
export interface StrategyLeg {
  [key: string]: any;
}

// Define the shape of a strategy
export interface Strategy {
  id?: string;
  userId: string;
  name: string;
  status?: string;
  legs: StrategyLeg[];
  [key: string]: any;
}

// Define the API response format
interface SaveStrategyResponse {
  success: boolean;
  strategy: Strategy;
  message?: string;
}

interface FetchStrategiesResponse {
  success: boolean;
  strategies: Strategy[];
  message?: string;
}

// Save a new strategy
export const saveStrategy = async (strategyData: Strategy): Promise<Strategy> => {
  const response = await fetch(`${API_BASE_URL}/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(strategyData),
  });

  console.log(strategyData);

  if (!response.ok) {
    const errorData: Partial<SaveStrategyResponse> = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to save strategy');
  }

  const data: SaveStrategyResponse = await response.json();

  if (!data.strategy) {
    throw new Error('Invalid response from server: missing strategy');
  }

  return data.strategy;
};

// Fetch strategies by userId and/or status
export const fetchStrategies = async ({
  userId,
  status,
}: {
  userId?: string;
  status?: string;
}): Promise<Strategy[]> => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (status) params.append('status', status);

  try {
    const response = await fetch(`${API_BASE_URL}/strategies?${params.toString()}`);

    if (!response.ok) {
      const errorData: Partial<FetchStrategiesResponse> = await response
        .json()
        .catch(() => ({ message: `HTTP ${response.status} ${response.statusText}` }));
      console.error("fetchStrategies API Error:", errorData);
      throw new Error(errorData.message || 'Failed to fetch strategies');
    }

    const data: FetchStrategiesResponse = await response.json();

    if (Array.isArray(data.strategies)) {
      return data.strategies;
    } else {
      console.warn("strategyService: Unexpected response format:", data);
      return [];
    }
  } catch (error) {
    console.error("strategyService: Exception during fetchStrategies:", error);
    throw error;
  }
};
