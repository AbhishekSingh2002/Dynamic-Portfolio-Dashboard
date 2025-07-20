// src/components/PerformanceChart.tsx
'use client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';

// Register the components including Filler and TimeScale plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PerformanceChartProps {
  data?: HistoricalData[];
  symbol?: string;
  currentPrice?: number;
  className?: string;
}

export default function PerformanceChart({ data, symbol, currentPrice, className = '' }: PerformanceChartProps) {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m' | '6m' | '1y'>('1m');
  const [dataType, setDataType] = useState<'price' | 'volume'>('price');

  // Process the data for the chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const labels = data.map(item => item.date);
    const values = data.map(item => 
      dataType === 'price' ? item.close : item.volume
    );

    return {
      labels,
      datasets: [
        {
          label: dataType === 'price' ? 'Price (₹)' : 'Volume',
          data: values,
          borderColor: dataType === 'price' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
          backgroundColor: dataType === 'price' 
            ? 'rgba(59, 130, 246, 0.2)' 
            : 'rgba(16, 185, 129, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointBackgroundColor: 'white',
          pointBorderColor: dataType === 'price' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'white',
          pointHoverBorderColor: dataType === 'price' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
          pointHoverBorderWidth: 2,
          pointHitRadius: 10,
          pointStyle: 'circle',
          yAxisID: dataType === 'price' ? 'y' : 'y1',
        },
      ],
    };
  }, [data, dataType]);

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          {['1w', '1m', '3m', '6m', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          {['price', 'volume'].map((type) => (
            <button
              key={type}
              onClick={() => setDataType(type as 'price' | 'volume')}
              className={`px-3 py-1 text-sm rounded-md ${
                dataType === type
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index' as const,
              intersect: false,
            },
            scales: {
              x: {
                type: 'time' as const,
                time: {
                  unit: 'day' as const,
                  tooltipFormat: 'PP',
                  displayFormats: {
                    day: 'MMM d',
                    week: 'MMM d',
                    month: 'MMM yyyy',
                  },
                },
                grid: {
                  display: false,
                },
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  maxTicksLimit: 8,
                },
              },
              y: {
                type: 'linear' as const,
                display: dataType === 'price',
                position: 'left' as const,
                title: {
                  display: true,
                  text: 'Price (₹)',
                },
              },
              y1: {
                type: 'linear' as const,
                display: dataType === 'volume',
                position: 'right' as const,
                title: {
                  display: true,
                  text: 'Volume',
                },
                grid: {
                  drawOnChartArea: false,
                },
              },
            },
            plugins: {
              legend: {
                position: 'top' as const,
              },
              tooltip: {
                callbacks: {
                  label: (context: any) => {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(context.parsed.y);
                    }
                    return label;
                  },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}