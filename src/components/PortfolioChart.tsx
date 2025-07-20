// src/components/PortfolioChart.tsx
import { Chart } from 'chart.js';
'use client';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PortfolioStock } from '@/types/portfolio';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PortfolioChartProps {
  stocks: PortfolioStock[];
}

export default function PortfolioChart({ stocks }: PortfolioChartProps) {
  const sectorData = stocks.reduce((acc, stock) => {
    acc[stock.sector] = (acc[stock.sector] || 0) + stock.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const data = {
    labels: Object.keys(sectorData),
    datasets: [{
      data: Object.values(sectorData),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#8AC24A', '#F06292'
      ],
      borderWidth: 1,
    }]
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Portfolio Allocation</h3>
      <div className="h-64">
        <Doughnut 
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context: any) => {
                    const label = context.label || '';
                    const value = context.raw as number;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ₹${value.toLocaleString()} (${percentage}%)`;
                  }
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}