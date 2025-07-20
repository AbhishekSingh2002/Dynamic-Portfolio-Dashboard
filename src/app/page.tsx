// src/app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamically import the PortfolioTable with SSR disabled
const PortfolioTable = dynamic(
  () => import('@/components/PortfolioTable'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const handleUpdate = (stocks: any[]) => {
    setLastUpdated(new Date().toLocaleTimeString());
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio Dashboard</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        </div>
        
        <PortfolioTable onUpdate={handleUpdate} />
      </div>
    </main>
  );
}