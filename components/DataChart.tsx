import React from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// Atur warna default untuk teks Chart.js (untuk dukungan mode gelap)
ChartJS.defaults.color = '#94a3b8'; // slate-400
ChartJS.defaults.borderColor = '#475569'; // slate-600

interface ChartProps {
  type: 'pie' | 'bar';
  chartData: any;
  title: string;
}

const DataChart: React.FC<ChartProps> = ({ type, chartData, title }) => {
  const isDarkMode = document.documentElement.classList.contains('dark');

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
            color: isDarkMode ? '#cbd5e1' : '#475569', // slate-300 / slate-600
        }
      },
      title: {
        display: true,
        text: title,
        color: isDarkMode ? '#f1f5f9' : '#1e293b', // slate-100 / slate-800
        font: {
          size: 16,
        },
      },
      tooltip: {
        titleFont: {
            size: 14,
        },
        bodyFont: {
            size: 12,
        },
        footerFont: {
            size: 10,
        },
        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
        titleColor: isDarkMode ? '#f1f5f9' : '#1e293b',
        bodyColor: isDarkMode ? '#f1f5f9' : '#1e293b',
      }
    },
    scales: type === 'bar' ? {
        x: {
            ticks: { color: isDarkMode ? '#cbd5e1' : '#475569' },
            grid: { color: isDarkMode ? '#475569' : '#e2e8f0' }
        },
        y: {
            ticks: { color: isDarkMode ? '#cbd5e1' : '#475569' },
            grid: { color: isDarkMode ? '#475569' : '#e2e8f0' }
        }
    } : undefined
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-lg my-4 shadow-md">
      <div className="relative h-64 md:h-80">
        {type === 'pie' && <Pie data={chartData} options={options} />}
        {type === 'bar' && <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
};

export default DataChart;
