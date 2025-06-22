// src/components/TreatmentDiagnosisHeatmap.jsx
import React, { useEffect, useRef } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  Tooltip,
  Title,
} from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

// Register matrix controller + scales/plugins
Chart.register(
  MatrixController,
  MatrixElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Title
);

// Custom plugin to draw numbers inside each matrix cell
const drawValuesPlugin = {
  id: 'drawValues',
  afterDatasetsDraw(chart) {
    // console.log to confirm plugin runs
    console.log('afterDatasetsDraw fired');
    const ctx = chart.ctx;

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((element, index) => {
        const data = dataset.data[index];
        const value = data.v;

        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;

        ctx.fillText(value, centerX, centerY);
        ctx.restore();
      });
    });
  }
};

// Register the plugin with Chart.js
Chart.register(drawValuesPlugin);

export default function TreatmentDiagnosisHeatmap({ data, diagnoses, treatments }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    // Destroy old chart if it exists
    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    // Bail out if inputs are invalid
    if (
      !Array.isArray(data) || data.length === 0 ||
      !Array.isArray(diagnoses) || diagnoses.length === 0 ||
      !Array.isArray(treatments) || treatments.length === 0
    ) return;

    // 1) Keep only entries with count > 0
    const filtered = data.filter(d => d.count > 0);
    if (filtered.length === 0) return;

    // 2) Compute max for scaling
    const maxCount = Math.max(...filtered.map(d => d.count));

    // 3) Tailwind endpoints in RGB
    const lowRGB = [219, 234, 254];  // blue-100 (#DBEAFE)
    const highRGB = [30, 58, 138];   // blue-900 (#1E3A8A)

    // 4) Build the chart
    instanceRef.current = new Chart(ctx, {
      type: 'matrix',
      data: {
        datasets: [{
          label: 'Heatmap',
          data: filtered.map(d => ({
            x: diagnoses[d.diagnosisIndex],
            y: treatments[d.treatmentIndex],
            v: d.count
          })),
          backgroundColor: ctx => {
            const v = ctx.raw.v;
            const t = maxCount ? v / maxCount : 0;
            const r = Math.round(lowRGB[0] + t * (highRGB[0] - lowRGB[0]));
            const g = Math.round(lowRGB[1] + t * (highRGB[1] - lowRGB[1]));
            const b = Math.round(lowRGB[2] + t * (highRGB[2] - lowRGB[2]));
            return `rgb(${r},${g},${b})`;
          },
          borderWidth: 1,
          borderColor: 'white'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            labels: diagnoses,
            title: { display: true, text: 'Diagnosis' },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              align: 'center',
              padding: 10,
              font: { size: 10 },
              callback: function (value) {
                const label = this.getLabelForValue(value);
                const maxLineLength = 10;

                if (label.length <= maxLineLength) return label;

                const words = label.split(' ');
                const lines = [];
                let currentLine = '';

                words.forEach(word => {
                  if ((currentLine + word).length > maxLineLength) {
                    if (currentLine) lines.push(currentLine.trim());
                    currentLine = word + ' ';
                  } else {
                    currentLine += word + ' ';
                  }
                });

                if (currentLine) lines.push(currentLine.trim());

                return lines;
              }
            }
          },
          y: {
            type: 'category',
            labels: treatments,
            title: { display: true, text: 'Treatment Plan' }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: items => `Diagnosis: ${items[0].raw.x}`,
              label: item => `Treatment: ${item.raw.y} — Count: ${item.raw.v}`
            }
          },
          title: { display: true, text: 'Treatment vs. Diagnosis Heatmap' },
          legend: { display: false }
          // No need to add drawValues plugin here explicitly
        }
      }
    });
  }, [data, diagnoses, treatments]);

  return (
    <div className="relative w-full h-[300px] bg-white p-1 rounded shadow">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
