// ResponseRateDonut.jsx
import React, { useEffect, useRef } from 'react';
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
// at the very top of the file
import 'chart.js/auto';


// Register the ArcElement (for doughnut/pie) and plugins
Chart.register(ArcElement, Tooltip, Legend);

export default function ResponseRateDonut({ value }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Convert 'value' (e.g. 83.33) to a number between 0 and 100
    const percent = Number(value) || 0;
    const remaining = Math.max(0, 100 - percent);

    // If there is already a chart instance, destroy it before creating a new one:
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [
          {
            // data: [completed, remaining]
            data: [percent, remaining],
            backgroundColor: [
              '#10B981', // green for “Completed”
              '#E5E7EB', // light gray for “Remaining”
            ],
            hoverBackgroundColor: [
              '#10B981',
              '#E5E7EB',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // hide the legend
          },
          tooltip: {
            enabled: false, // disable hover tooltips
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [value]);

  return (
    <div className="relative w-full h-60 flex flex-col items-center justify-center mt-5 pb-6">
      <h3 className="text-lg font-semibold mb-4">Survey Response Rate</h3>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-700">
          {`${Math.round(value)}%`}
        </span>
      </div>
    </div>
  );
}
