// src/app/page.tsx

// Note: The import path uses '@/' which is an alias for the 'src/' directory.
import StrategyVisualizer from '@/features/StrategyVisualizer/StrategyVisualizer';

export default function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">TradVed Strategy Visualizer</h1>
      <StrategyVisualizer />
    </>
  );
}
