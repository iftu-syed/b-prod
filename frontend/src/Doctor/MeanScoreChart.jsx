import React from "react";
import { Scatter } from "react-chartjs-2";

import {
  Chart as ChartJS,
  ScatterController,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

const allSeverityData = [
  { Scale: "Global-Health Physical", Severity: "Excellent", Color: "#00ff00", Chart_Range_Min: 58, Chart_Range_Max: 68 },
  { Scale: "Global-Health Physical", Severity: "Very Good", Color: "#7fff00", Chart_Range_Min: 50, Chart_Range_Max: 58 },
  { Scale: "Global-Health Physical", Severity: "Good", Color: "#EDD94C", Chart_Range_Min: 42, Chart_Range_Max: 50 },
  { Scale: "Global-Health Physical", Severity: "Fair", Color: "#ff7f00", Chart_Range_Min: 35, Chart_Range_Max: 42 },
  { Scale: "Global-Health Physical", Severity: "Poor", Color: "#ff0000", Chart_Range_Min: 16, Chart_Range_Max: 35 },

  { Scale: "Global-Health Mental", Severity: "Excellent", Color: "#00ff00", Chart_Range_Min: 56, Chart_Range_Max: 68 },
  { Scale: "Global-Health Mental", Severity: "Very Good", Color: "#7fff00", Chart_Range_Min: 48, Chart_Range_Max: 56 },
  { Scale: "Global-Health Mental", Severity: "Good", Color: "#EDD94C", Chart_Range_Min: 40, Chart_Range_Max: 48 },
  { Scale: "Global-Health Mental", Severity: "Fair", Color: "#ff7f00", Chart_Range_Min: 29, Chart_Range_Max: 40 },
  { Scale: "Global-Health Mental", Severity: "Poor", Color: "#ff0000", Chart_Range_Min: 21, Chart_Range_Max: 29 },

  { Scale: "WEXNER", Severity: "Mild", Color: "#00ff00", Chart_Range_Min: 0, Chart_Range_Max: 5 },
  { Scale: "WEXNER", Severity: "Moderate", Color: "#EDD94C", Chart_Range_Min: 5, Chart_Range_Max: 9 },
  { Scale: "WEXNER", Severity: "Severe", Color: "#ff0000", Chart_Range_Min: 9, Chart_Range_Max: 20 },

  { Scale: "EPDS", Severity: "None - Minimal", Color: "#00ff00", Chart_Range_Min: 0, Chart_Range_Max: 10 },
  { Scale: "EPDS", Severity: "Mild", Color: "#7fff00", Chart_Range_Min: 10, Chart_Range_Max: 13 },
  { Scale: "EPDS", Severity: "Moderate", Color: "#ff7f00", Chart_Range_Min: 13, Chart_Range_Max: 15 },
  { Scale: "EPDS", Severity: "Severe", Color: "#ff0000", Chart_Range_Min: 15, Chart_Range_Max: 30 },

  { Scale: "ICIQ_UI SF", Severity: "Slight", Color: "#7fff00", Chart_Range_Min: 0, Chart_Range_Max: 5 },
  { Scale: "ICIQ_UI SF", Severity: "Moderate", Color: "#EDD94C", Chart_Range_Min: 5, Chart_Range_Max: 12 },
  { Scale: "ICIQ_UI SF", Severity: "Severe", Color: "#ff7f00", Chart_Range_Min: 12, Chart_Range_Max: 18 },
  { Scale: "ICIQ_UI SF", Severity: "Very Severe", Color: "#ff0000", Chart_Range_Min: 18, Chart_Range_Max: 21 },

  { Scale: "PAID", Severity: "Low Distress", Color: "#EDD94C", Chart_Range_Min: 0, Chart_Range_Max: 16 },
  { Scale: "PAID", Severity: "Moderate Distress", Color: "#ff7f00", Chart_Range_Min: 16, Chart_Range_Max: 39 },
  { Scale: "PAID", Severity: "High Distress", Color: "#ff0000", Chart_Range_Min: 39, Chart_Range_Max: 100 },

  { Scale: "PAID-5", Severity: "Low Distress", Color: "#EDD94C", Chart_Range_Min: 0, Chart_Range_Max: 8 },
  { Scale: "PAID-5", Severity: "Possible distress", Color: "#ff0000", Chart_Range_Min: 8, Chart_Range_Max: 25 },

  {
    Scale: "PROMIS Bank v1.1 - Pain Interference",
    Severity: "Within Normal Limits",
    Color: "#00ff00",
    Chart_Range_Min: 20,
    Chart_Range_Max: 50,
  },
  {
    Scale: "PROMIS Bank v1.1 - Pain Interference",
    Severity: "Mild",
    Color: "#7fff00",
    Chart_Range_Min: 50,
    Chart_Range_Max: 60,
  },
  {
    Scale: "PROMIS Bank v1.1 - Pain Interference",
    Severity: "Moderate",
    Color: "#ff7f00",
    Chart_Range_Min: 60,
    Chart_Range_Max: 70,
  },
  {
    Scale: "PROMIS Bank v1.1 - Pain Interference",
    Severity: "Severe",
    Color: "#ff0000",
    Chart_Range_Min: 70,
    Chart_Range_Max: 80,
  },

  {
    Scale: "PROMIS SF v1.0 - Fatigue-OA-Knee 8a",
    Severity: "Within Normal Limits",
    Color: "#00ff00",
    Chart_Range_Min: 20,
    Chart_Range_Max: 50,
  },
  {
    Scale: "PROMIS SF v1.0 - Fatigue-OA-Knee 8a",
    Severity: "Mild",
    Color: "#7fff00",
    Chart_Range_Min: 50,
    Chart_Range_Max: 60,
  },
  {
    Scale: "PROMIS SF v1.0 - Fatigue-OA-Knee 8a",
    Severity: "Moderate",
    Color: "#ff7f00",
    Chart_Range_Min: 60,
    Chart_Range_Max: 70,
  },
  {
    Scale: "PROMIS SF v1.0 - Fatigue-OA-Knee 8a",
    Severity: "Severe",
    Color: "#ff0000",
    Chart_Range_Min: 70,
    Chart_Range_Max: 80,
  },

  {
    Scale: "PROMIS SF v1.0 - Depression-OA-Knee 4a",
    Severity: "Within Normal Limits",
    Color: "#00ff00",
    Chart_Range_Min: 20,
    Chart_Range_Max: 50,
  },
  {
    Scale: "PROMIS SF v1.0 - Depression-OA-Knee 4a",
    Severity: "Mild",
    Color: "#7fff00",
    Chart_Range_Min: 50,
    Chart_Range_Max: 60,
  },
  {
    Scale: "PROMIS SF v1.0 - Depression-OA-Knee 4a",
    Severity: "Moderate",
    Color: "#ff7f00",
    Chart_Range_Min: 60,
    Chart_Range_Max: 70,
  },
  {
    Scale: "PROMIS SF v1.0 - Depression-OA-Knee 4a",
    Severity: "Severe",
    Color: "#ff0000",
    Chart_Range_Min: 70,
    Chart_Range_Max: 80,
  },

  { Scale: "Pain-Interference", Severity: "Severe", Color: "#ff0000", Chart_Range_Min: 70, Chart_Range_Max: 80 },
  { Scale: "Pain-Interference", Severity: "Moderate", Color: "#ff7f00", Chart_Range_Min: 60, Chart_Range_Max: 70 },
  { Scale: "Pain-Interference", Severity: "Mild", Color: "#7fff00", Chart_Range_Min: 50, Chart_Range_Max: 60 },
  { Scale: "Pain-Interference", Severity: "Within Normal Limits", Color: "#00ff00", Chart_Range_Min: 20, Chart_Range_Max: 50 },

  { Scale: "Physical-Function", Severity: "Severe", Color: "#ff0000", Chart_Range_Min: 20, Chart_Range_Max: 30 },
  { Scale: "Physical-Function", Severity: "Moderate", Color: "#ff7f00", Chart_Range_Min: 30, Chart_Range_Max: 40 },
  { Scale: "Physical-Function", Severity: "Mild", Color: "#7fff00", Chart_Range_Min: 40, Chart_Range_Max: 50 },
  { Scale: "Physical-Function", Severity: "Within Normal Limits", Color: "#00ff00", Chart_Range_Min: 50, Chart_Range_Max: 80 },

  {
    Scale: "EQ-5D",
    Severity: "Mild / No Problems",
    Color: "#00FF00",
    Chart_Range_Min: 0.7,
    Chart_Range_Max: 1.0,
  },
  {
    Scale: "EQ-5D",
    Severity: "Moderate Problems",
    Color: "#FFFF00",
    Chart_Range_Min: 0.4,
    Chart_Range_Max: 0.7,
  },
  {
    Scale: "EQ-5D",
    Severity: "Significant Problems",
    Color: "#FF7F00",
    Chart_Range_Min: 0.0,
    Chart_Range_Max: 0.4,
  },
  {
    Scale: "EQ-5D",
    Severity: "Very Severe Problems",
    Color: "#FF0000",
    Chart_Range_Min: -0.594,
    Chart_Range_Max: 0.0,
  },
];

/**
 * 2) getSeverityLevelsForScale(scaleName) → returns
 *    an array of { label, color, range: [min,max] } for that survey.
 *    We’ll use this to draw the vertical color‐bar on the right.
 */
function getSeverityLevelsForScale(scaleName) {
  return allSeverityData
    .filter((item) => item.Scale === scaleName)
    .map((item) => ({
      label: item.Severity,
      color: item.Color,
      range: [item.Chart_Range_Min, item.Chart_Range_Max],
    }));
}

/**
 * 3) VerticalSeverityLegendPlugin:
 *    Draws a stacked set of colored rectangles to the right of chartArea,
 *    each one corresponding to a “severity” row for this survey.
 */
const VerticalSeverityLegendPlugin = {
  id: "verticalSeverityLegend",
  beforeDraw: (chart, _args, options) => {
    const severity = options.levels || [];
    if (!severity.length) return;

    const ctx = chart.ctx;
    const { left, top, width, height } = chart.chartArea;
    const barWidth       = options.barWidth      || 12;
    const paddingRight   = options.paddingRight  || 20;
    const segmentHeight  = height / severity.length;
    const maxLabelWidth  = options.maxLabelWidth || 100;
    const lineHeight     = options.lineHeight    || 14;

    // wrapText: splits on spaces, draws each line no wider than maxLabelWidth
    function wrapText(text, x, y) {
      const words = text.split(" ");
      let line = "";
      let yy   = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const { width: testWidth } = ctx.measureText(testLine);

        if (testWidth > maxLabelWidth && n > 0) {
          ctx.fillText(line, x, yy);
          line = words[n] + " ";
          yy  += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, yy);
    }

    severity.forEach((sev, i) => {
      const yTop = top + i * segmentHeight;

      // 1) draw color bar
      ctx.fillStyle = sev.color;
      ctx.fillRect(
        left + width + paddingRight - barWidth,
        yTop,
        barWidth,
        segmentHeight
      );

      // 2) draw wrapped label
      ctx.fillStyle     = options.labelColor || "#333";
      ctx.font           = options.labelFont  || "12px sans-serif";
      ctx.textAlign      = "left";
      ctx.textBaseline   = "top";

      const textX = left + width + paddingRight + 4;
      const textY = yTop + 2; // small vertical padding before first line

      wrapText(sev.label, textX, textY);
    });
  },
};

/**
 * 4) Register Chart.js components + our plugin
 */
ChartJS.register(
  ScatterController,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  VerticalSeverityLegendPlugin
);

/**
 * 5) customTickValues:
 *    Per-survey list of EXACT tick positions you want to label.
 *    Chart.js will still draw gridlines at every multiple of 5, but only
 *    the array below will actually be shown on the y‐axis labels.
 */
const customTickValues = {
  "Global-Health Physical":             [0, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  "Global-Health Mental":               [0, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  "WEXNER":                             [0, 5, 9, 20],
  "EPDS":                               [0, 10, 13, 15, 30],
  "ICIQ_UI SF":                         [0, 5, 12, 18, 21],
  "PAID":                               [0, 16, 39, 100],
  "PAID-5":                             [0, 8, 25],
  "PROMIS Bank v1.1 - Pain Interference":   [20, 50, 60, 70, 80],
  "PROMIS SF v1.0 - Fatigue-OA-Knee 8a":    [20, 50, 60, 70, 80],
  "PROMIS SF v1.0 - Depression-OA-Knee 4a": [20, 50, 60, 70, 80],
  "Pain-Interference":                  [20, 50, 60, 70, 80],
  "Physical-Function":                  [20, 30, 40, 50, 80],
  "EQ-5D":                              [0.0, 0.4, 0.7, 1.0],
};

function getSeverityColor(scale, value) {
  // Find severity config for this value in this scale
  const config = allSeverityData.find(
    item =>
      item.Scale === scale &&
      value >= item.Chart_Range_Min &&
      value <= item.Chart_Range_Max
  );
  return config?.Color || "#7f7f7f"; // default grey if not found
}


export function MeanScoreChart({
  meanData = [],
  survey = "All",
  stageOrder = ["Baseline", "Followup - 1", "Followup - 2", "Followup - 3"],
  options = {},
}) {
  // ────────────────────────────────────────────────────────────────────────────
  // 7) Ensure each item has `survey` key
  const processed = meanData.map((item) => ({
    ...item,
    survey: item.survey || survey,
  }));

  // ────────────────────────────────────────────────────────────────────────────
  // 8) Build “usedStages” in the correct order
  //const uniqueStages = Array.from(new Set(processed.map((pt) => pt.stage)));
  const uniqueStages = Array.from(new Set(processed.map((pt) => pt.stage && pt.stage.trim())));

  const usedStages = uniqueStages
    .filter((s) => stageOrder.includes(s))
    .sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));

  // ────────────────────────────────────────────────────────────────────────────
  // 9) Group points by their survey name
  const grouped = {};
  processed.forEach((pt) => {
    const sv = pt.survey || "Unknown";
    if (!grouped[sv]) grouped[sv] = [];
if (pt.stage && usedStages.includes(pt.stage.trim())) {
  grouped[sv].push({
    x: usedStages.indexOf(pt.stage.trim()) + 1,
    y: pt.mean,
    stage: pt.stage.trim(),
  });
}

  });

  // ────────────────────────────────────────────────────────────────────────────
  // 10) One dataset per survey, each with a distinct color from a small palette
  const PALETTE = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // mustard
    "#17becf", // teal
  ];
  const surveys = Object.keys(grouped);
 const datasets = surveys.map((sv, i) => {
  const points = grouped[sv] || [];
  const useSeverityColors = survey !== "All"; // Only for one survey selected

  return {
    label: sv,
    data: points,
    backgroundColor: useSeverityColors
      ? points.map(pt => getSeverityColor(sv, pt.y))
      : PALETTE[i % PALETTE.length],
    borderColor: useSeverityColors
      ? points.map(pt => getSeverityColor(sv, pt.y))
      : PALETTE[i % PALETTE.length],
    borderWidth: 1,
    pointRadius: 6,
    showLine: true,
  };
});



  const data = { datasets };

  // ────────────────────────────────────────────────────────────────────────────
  // 11) Determine the JSON‐driven y‐axis domain (or fallback to [0,100])
  //     If `customTickValues[survey]` exists, we force min/max from it.
  //     Otherwise, if `survey === "All"`, domain = [0,100].
  //     Otherwise, if severity data exists, domain = [min of allChartRangeMin, max of allChartRangeMax].
  //     Else fallback to [0,100].
  
const levelsForSurvey = getSeverityLevelsForScale(survey);
const lowIsBadScales = ["Physical-Function", "Mobility","PAID", "PAID-5"];
const reverse = lowIsBadScales.includes(survey);
const sortedSeverity = reverse ? levelsForSurvey.slice().reverse() : levelsForSurvey.slice();

  let yMin, yMax, allowedTicks;

  if (Array.isArray(customTickValues[survey])) {
    // Force the domain from the user‐provided tick array
    allowedTicks = customTickValues[survey];
    yMin = Math.min(...allowedTicks);
    yMax = Math.max(...allowedTicks);
  } else {
    // No custom ticks defined:
    if (survey === "All") {
      yMin = 0;
      yMax = 100;
    } else if (levelsForSurvey.length) {
      const allMins = levelsForSurvey.map((lv) => lv.range[0]);
      const allMaxs = levelsForSurvey.map((lv) => lv.range[1]);
      yMin = Math.min(...allMins);
      yMax = Math.max(...allMaxs);
    } else {
      yMin = 0;
      yMax = 100;
    }
    allowedTicks = null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 12) Build default Chart.js options, injecting our y-axis overrides
  const defaultOptions = {
    maintainAspectRatio: false,
    responsive: true,

    layout: {
      // So the vertical color bar on the right has room
      padding: { right: 115 },
    },

    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pt = datasets[ctx.datasetIndex].data[ctx.dataIndex];
            return `Stage: ${pt.stage} → Mean: ${pt.y.toFixed(2)}`;
          },
        },
      },
      legend: {
        position: "top",
      },
      // Draw the vertical color‐bar on the right
      verticalSeverityLegend: {
        levels: sortedSeverity,
        barWidth: 6,
        paddingRight: 55,
        labelColor: "#333",
        labelFont: "12px 'Roboto', sans-serif",
        maxLabelWidth: 60,
      },
    },

    scales: {
      // X axis: category type, showing only the stages that actually appear
      x: {
        type: "linear",
           ticks: {
           min: 0,
          max: usedStages.length,
          stepSize: 1,
          callback: v =>
            v === 0
              ? "0"
              : usedStages[v - 1] || "",
        },
        title: {
          display: true,
          text: "Patient Journey Timeline →",
        },
      },

      // Y axis: either custom ticks from allowedTicks, or auto “nice” domain
      y: {
        min: yMin,
        max: yMax,
        beginAtZero: false,
        ticks: Array.isArray(allowedTicks)
          ? {
              values: allowedTicks,
              callback: (value) => (allowedTicks.includes(value) ? value : ""),
              autoSkip: false,
            }
          : {},
        grid: {
          display: true,
          color: "#e5e7eb",
          borderDash: [2, 3],
        },
        title: { display: true, text: "Mean Score" },
      },
    },
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 13) Merge in any incoming `options` prop (so you can override if needed)
  const finalOptions = {
    ...defaultOptions,
    ...options,
    scales: {
      x: { ...(defaultOptions.scales.x || {}), ...(options.scales?.x || {}) },
      y: { ...(defaultOptions.scales.y || {}), ...(options.scales?.y || {}) },
    },
    plugins: {
      ...(defaultOptions.plugins || {}),
      ...(options.plugins || {}),
    },
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 14) Render the Chart inside a styled “card”
  return (
    <div className=" rounded-lg  h-[27rem] w-full min-w-[580px] ">
      <Scatter data={data} options={finalOptions} />
    </div>
  );
}

export function ScoreTrendChart({
  trendData = [],
  survey = "",
  stageOrder = ["Baseline", "Followup - 1", "Followup - 2", "Followup - 3"],
  options = {},
}) {
  // ────────────────────────────────────────────────────────────────────────────
 const processed = trendData.map((item) => ({
   ...item,
   // If item.survey is a non-empty string, keep it;
   // otherwise assign "(Unknown)"
  survey:
    typeof item.survey === "string" && item.survey.trim() !== ""
      ? item.survey
      : survey || "(Unknown)",
 }));

  // ────────────────────────────────────────────────────────────────────────────
  // 17) Build “usedStages” (only those present in data, in correct order)
  const uniqueStages = Array.from(new Set(processed.map((d) => d.stage)));
  const usedStages = uniqueStages
    .filter((s) => stageOrder.includes(s))
    .sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b));

  // ────────────────────────────────────────────────────────────────────────────
  // 18) Collect distinct survey names FROM the data itself
  const surveys = Array.from(new Set(processed.map((d) => d.survey))).filter(
    (s) => Boolean(s)
  );

  // ────────────────────────────────────────────────────────────────────────────
  // 19) Assign a color for each survey
  const PALETTE = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // mustard
    "#17becf", // teal
  ];
  const surveyColor = {};
  surveys.forEach((s, i) => {
    surveyColor[s] = PALETTE[i % PALETTE.length];
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 20) Build one dataset per survey (category X-axis)
const useSeverityColors = survey !== "All";

const datasets = surveys.map((s, i) => {
  const points = processed
    .filter((d) => d.survey === s && usedStages.includes(d.stage?.trim()))
    .map((d) => ({
       x: usedStages.indexOf(d.stage.trim()) + 1,
      y: d.score,
      mr_no: d.mr_no,
    }));

  return {
    label: s,
    data: points,
    backgroundColor: useSeverityColors
      ? points.map(pt => getSeverityColor(s, pt.y))
      : surveyColor[s],
    borderColor: useSeverityColors
      ? points.map(pt => getSeverityColor(s, pt.y))
      : surveyColor[s],
    pointBackgroundColor: useSeverityColors
      ? points.map(pt => getSeverityColor(s, pt.y))
      : surveyColor[s],
    pointBorderColor: "#ffffff",
    borderWidth: 1,
    pointRadius: 6,
    showLine: true,
  };
});


  const data = { datasets };

  // ────────────────────────────────────────────────────────────────────────────
  // 21) Compute JSON‐driven Y-axis domain for this survey
  
const levelsForSurvey = getSeverityLevelsForScale(survey);
const lowIsBadScales = ["Physical-Function", "Mobility","PAID", "PAID-5"];
const reverse = lowIsBadScales.includes(survey);
const sortedSeverity = reverse ? levelsForSurvey.slice().reverse() : levelsForSurvey.slice();

  let yMin, yMax;
  if (levelsForSurvey.length) {
    const allMins = levelsForSurvey.map((lv) => lv.range[0]);
    const allMaxs = levelsForSurvey.map((lv) => lv.range[1]);
    yMin = Math.min(...allMins);
    yMax = Math.max(...allMaxs);
  } else {
    yMin = 0;
    yMax = 100;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 22) Default Chart.js options for ScoreTrendChart
  const defaultOptions = {
    maintainAspectRatio: false,
    responsive: true,

    layout: {
      padding: { right: 115 },
    },

    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pt = datasets[ctx.datasetIndex].data[ctx.dataIndex];
            return `MR#: ${pt.mr_no || "N/A"} | ${pt.x} → ${pt.y}`;
          },
        },
      },
      legend: {
        position: "top",
      },
      verticalSeverityLegend: {
        levels: sortedSeverity,
        barWidth: 6,
        paddingRight: 55,
        labelColor: "#333",
        labelFont: "12px 'Roboto', sans-serif",
        maxLabelWidth: 60,
      },
    },

    scales: {
      x: {
        type: "linear",
        labels: usedStages,
        title: { display: true, text: "Patient Journey Timeline →" },
        ticks: {
    min: 0,
    max: usedStages.length,
    stepSize: 1,
    callback: v => v === 0 
      ? "0" 
      : usedStages[v - 1] || "",
  },
      },
      y: {
        min: yMin,
        max: yMax,
        beginAtZero: false,
        grid: {
          display: true,
          color: "#e5e7eb",
          borderDash: [2, 3],
        },
        title: { display: true, text: "Mean Score" },
      },
    },

    // Make sure onClick is outside of `scales`
    // onClick: (e, elements) => {
    //   if (elements.length > 0) {
    //     const { datasetIndex, index } = elements[0];
    //     const pt = datasets[datasetIndex].data[index];
    //     if (pt.mr_no) {
    //       window.location.href = `/patient/${pt.mr_no}`;
    //     }
    //   }
    // },
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 23) Merge in any incoming `options` prop
  const finalOptions = {
    // Spread in defaultOptions first
    ...defaultOptions,
    // Then allow parent `options` to override top-level keys
    ...options,
    // But merge `scales` and `plugins` explicitly
    scales: {
      x: { ...(defaultOptions.scales.x || {}), ...(options.scales?.x || {}) },
      y: { ...(defaultOptions.scales.y || {}), ...(options.scales?.y || {}) },
    },
    plugins: {
      ...(defaultOptions.plugins || {}),
      ...(options.plugins || {}),
    },
  };

  return (
    <div className=" rounded-lg  h-[27rem] w-full min-w-[580px]">
      <Scatter data={data} options={finalOptions} />
    </div>
  );
}
