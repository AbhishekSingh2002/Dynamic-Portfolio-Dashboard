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
  Filler
} from 'chart.js';

// Register the components including Filler plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // This enables the fill option
);

interface PerformanceChartProps {
  data: {
    date: string;
    value: number;
  }[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = {
    labels: data.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Portfolio Value',
        data: data.map(item => item.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgb(59, 130, 246)',
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'white',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointHoverBorderWidth: 2,
        pointHitRadius: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#6B7280', // gray-500
          font: {
            size: 12,
          },
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#111827', // gray-900
        bodyColor: '#4B5563', // gray-600
        borderColor: '#E5E7EB', // gray-200
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#6B7280', // gray-500
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(229, 231, 235, 0.5)', // gray-200 with opacity
          drawBorder: false
        },
        ticks: {
          color: '#6B7280', // gray-500
          font: {
            size: 11
          },
          callback: (value: any) => `₹${value.toLocaleString('en-IN')}`
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.4
      },
      point: {
        radius: 3,
        hoverRadius: 6,
        backgroundColor: 'white',
        borderWidth: 2
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  );
}