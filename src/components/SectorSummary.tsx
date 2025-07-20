// src/components/SectorSummary.tsx
'use client';
import { PortfolioStock } from '@/types/portfolio';

interface SectorSummaryProps {
  stocks: PortfolioStock[];
}

export default function SectorSummary({ stocks }: SectorSummaryProps) {
  // Group stocks by sector
  const sectors = stocks.reduce((acc, stock) => {
    if (!acc[stock.sector]) {
      acc[stock.sector] = {
        totalInvested: 0,
        totalCurrent: 0,
        count: 0,
        stocks: []
      };
    }
    acc[stock.sector].totalInvested += stock.investment;
    acc[stock.sector].totalCurrent += stock.currentValue || 0;
    acc[stock.sector].count += 1;
    acc[stock.sector].stocks.push(stock);
    return acc;
  }, {} as Record<string, { totalInvested: number; totalCurrent: number; count: number; stocks: PortfolioStock[] }>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {Object.entries(sectors).map(([sector, data]) => {
        const gainLoss = data.totalCurrent - data.totalInvested;
        const gainLossPct = (gainLoss / data.totalInvested) * 100;
        
        return (
          <div key={sector} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-2">{sector}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Stocks:</div>
              <div className="text-right">{data.count}</div>
              
              <div>Invested:</div>
              <div className="text-right">₹{data.totalInvested.toFixed(2)}</div>
              
              <div>Current:</div>
              <div className="text-right">₹{data.totalCurrent.toFixed(2)}</div>
              
              <div>P&L:</div>
              <div className={`text-right ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{gainLoss.toFixed(2)} ({gainLossPct.toFixed(2)}%)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}