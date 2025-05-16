import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { cn } from '@/lib/utils';

// Register all Chart.js components
Chart.register(...registerables);

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string[] | string;
    borderWidth?: number;
  }[];
}

interface ChartComponentProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: ChartData;
  options?: any;
  className?: string;
  height?: number;
}

const ChartComponent: React.FC<ChartComponentProps> = ({
  type,
  data,
  options = {},
  className,
  height = 300
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    // Destroy previous chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        // Create new chart instance
        chartInstance.current = new Chart(ctx, {
          type,
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
              },
            },
            ...options
          }
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data, options]);

  return (
    <div className={cn("relative", className)} style={{ height: `${height}px` }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default ChartComponent;
