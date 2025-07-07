import React, { useEffect, useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import './Sidebar.css';

import {
  FaTachometerAlt,
  FaUsers,
  FaUserMd,
  FaPaperPlane,
  FaCheckCircle,
  FaPercentage,
  FaStar,
  FaUserInjured,
} from 'react-icons/fa';



const API_URL = process.env.REACT_APP_HOSPITAL_URL;

export default function Dashboard() {
  const { hospital_code, site_code } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // KPI state
  const [specialties, setSpecialties] = useState(0);
  const [doctors, setDoctors] = useState(0);
  const [staff, setStaff] = useState(0);
  const [patients, setPatients] = useState(0);
  const [surveysSent, setSurveysSent] = useState(0);
  const [surveysCompleted, setSurveysCompleted] = useState(0);
  const [responseRate, setResponseRate] = useState(0);

  // Demographics & engagement
  const [genderStats, setGenderStats] = useState([]);
  const [ageStats, setAgeStats] = useState([]);
  const [cityStats, setCityStats] = useState(null);
  const [topEngagement, setTopEngagement] = useState([]);
  const [bottomEngagement, setBottomEngagement] = useState([]);

  // Dynamic response-rate chart
  const [responseRateFilter, setResponseRateFilter] = useState('provider');
  const [responseRateChartData, setResponseRateChartData] = useState([]);

  const responseRateOptions = [
        { value: "provider",  label: "Provider" },
        { value: "specialty", label: "Specialty" },
        { value: "survey",    label: "Survey" },
        { value: "age",       label: "Age" },
      ];
const selectedLabel = responseRateOptions.find(opt => opt.value === responseRateFilter)?.label || '';
const baseNavItemClasses = "flex items-center text-sm hover:bg-gray-100 rounded";

const navigate = useNavigate();


  useEffect(() => {
  if (!hospital_code || !site_code) return;

  const params = { hospital_code, site_code };

  axios.get(`${API_URL}/specialties`, { params })
    .then(res => setSpecialties(res.data.count))
    .catch(err => console.error("Specialties error", err));

  axios.get(`${API_URL}/doctors`, { params })
    .then(res => setDoctors(res.data.count))
    .catch(err => console.error("Doctors error", err));

  axios.get(`${API_URL}/staff`, { params })
    .then(res => setStaff(res.data.count))
    .catch(err => console.error("Staff error", err));

  axios.get(`${API_URL}/patients`, { params })
    .then(res => setPatients(res.data.count))
    .catch(err => console.error("Patients error", err));

  axios.get(`${API_URL}/surveys-sent`, { params })
    .then(res => setSurveysSent(res.data.count))
    .catch(err => console.error("Surveys Sent error", err));

  axios.get(`${API_URL}/surveys-completed`, { params })
    .then(res => setSurveysCompleted(res.data.count))
    .catch(err => console.error("Surveys Completed error", err));

  axios.get(`${API_URL}/surveys/response-rate`, { params })
    .then(res => setResponseRate(res.data.responseRate))
    .catch(err => console.error("Response Rate error", err));

axios.get(`${API_URL}/doctor-engagement`, { params })
  .then(res => {
    const topSorted = [...(res.data.top5 || [])].sort((a, b) => b.percentile - a.percentile);
    const bottomSorted = [...(res.data.bottom5 || [])].sort((a, b) => a.percentile - b.percentile);
    setTopEngagement(topSorted);
    setBottomEngagement(bottomSorted);
  })
  .catch(err => console.error("Doctor Engagement error", err));

  axios.get(`${API_URL}/patient-gender-stats`, { params })
    .then(res => {
      const stats = Object.entries(res.data || {})
        .filter(([_, c]) => c > 0)
        .map(([g, c]) => ({ gender: g[0].toUpperCase() + g.slice(1), count: c }));
      setGenderStats(stats);
    })
    .catch(err => console.error("Gender Stats error", err));

axios.get(`${API_URL}/patient-age-stats`, { params })
  .then(res => {
    const stats = Object.entries(res.data || {})
      .filter(([_, c]) => c > 0)
      .map(([range, c]) => ({ range, count: c }));
    setAgeStats(stats);
    console.log("📊 Age Stats:", stats); // Add this line
  })
  .catch(err => console.error("Age Stats error", err));

  axios.get(`${API_URL}/patient-city-stats`, { params })
    .then(res => {
      setCityStats(Array.isArray(res.data) ? res.data : []);
    })
    .catch(err => console.error("City Stats error", err));

}, [hospital_code, site_code]);

  // EFFECT #2: Dynamic Response-Rate on filter change
  useEffect(() => {
    const endpoints = {
      specialty: 'surveys/response-rate-by-specialty',
      survey:    'surveys/response-rate-by-survey',
      age:       'surveys/response-rate-by-age',
      provider:  'surveys/response-rate-by-provider',
    };

    async function fetchChart() {
      try {
        const url = `${API_URL}/${endpoints[responseRateFilter]}`;
        const res = await axios.get(url, { params: { hospital_code, site_code } });
        console.log("📊 Chart response:", res.data);
        const data = (res.data || []).map(item => ({
          label: item.label,
          responseRate: item.responseRate,
        }));
        setResponseRateChartData(data);
      } catch (err) {
        console.error('Failed loading response-rate:', err);
        setResponseRateChartData([]);
      }
    }

    if (hospital_code && site_code) {
      fetchChart();
    }
  }, [responseRateFilter, hospital_code, site_code]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="top" data-title="Hello user!" data-intro="Expand pane for options">
          <div className="logo">
            <img src="/doctor/WeHealthifyLOGO.png" alt="WeHealthify" />
          </div>
          <i className="bx bx-menu" id="btn" onClick={() => setIsSidebarOpen(o => !o)}></i>
        </div>
        <div className="user">
          <p className="bold" id="adminRole">Admin</p>
          <p className="bold">{hospital_code}</p>
          <p className="bold">{site_code}</p>
        </div>
        <ul>
       <li>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate(-1); // Go back in browser history
          }}
          // Apply the same base classes directly
          className={`${baseNavItemClasses} text-gray-800`} // Add any specific color if needed
        >
          <i className="bx bx-home"></i> {/* Icon for Home */}
          <span className="nav-item" id="home_label">
            Home {/* Display text */}
          </span>
        </a>
        <span className="tooltip" id="home_tooltip">
          Go Back to Home {/* Tooltip text */}
        </span>
      </li>
        </ul>
      </div>

      {/* Main Content */}
      <div
        className="main-content"
        style={{
          position: 'relative',
          left: isSidebarOpen ? '250px' : '80px',
          transition: 'left 0.3s',
          paddingTop: '4rem',
        }}
      >
        <header className={`topbar ${isSidebarOpen ? 'shifted' : ''}`}>
          <h1 className="text-2xl font-bold">Hospital Admin Dashboard</h1>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-7 gap-3 pt-2">
          <KpiCard icon={FaStar}        iconColor="text-yellow-500" title="Specialties Added"     value={specialties} />
          <KpiCard icon={FaUserMd}      iconColor="text-green-500"  title="Doctors Active"        value={doctors} />
          <KpiCard icon={FaUsers}       iconColor="text-blue-500"   title="Staffs Added"           value={staff} />
          <KpiCard icon={FaUserInjured} iconColor="text-red-500"    title="Total Patients"        value={patients} />
          <KpiCard icon={FaPaperPlane}  iconColor="text-purple-500" title="Surveys Sent"          value={surveysSent} />
          <KpiCard icon={FaCheckCircle} iconColor="text-teal-500"   title="Surveys Completed"     value={surveysCompleted} />
          <KpiCard icon={FaPercentage}  iconColor="text-indigo-600" title="Response Rate" value={`${responseRate}%`} />

        </div>

        {/* Demographics & Response-Rate */}
        <div className="mt-2 flex flex-col md:flex-row gap-6">
        <section
  className="
    md:w-1/2 bg-white p-2 rounded-xl border border-gray-200
    shadow-sm hover:shadow-md transition-shadow duration-200 h-90
  "
>
  <h2 className="text-2xl font-semibold mb-4">Patients Demographics</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[320px]">
    <ChartWrapper><GenderChart genderData={genderStats} /></ChartWrapper>
    <ChartWrapper><AgeChart ageData={ageStats} /></ChartWrapper>
  </div>
</section>

<section
  className="
    md:w-1/2 bg-white p-2 rounded-xl pt-1 border border-gray-200
    shadow-sm hover:shadow-md transition-shadow duration-200 h-82
  "
>
  <div className="flex items-center mb-4">
    <h2 className="text-2xl font-semibold">Response Rate by {selectedLabel}</h2>
    <div className="ml-auto">
      <Select
        options={responseRateOptions}   // array of objects
        value={responseRateFilter}      // plain string e.g. "survey"
        onChange={setResponseRateFilter}
        className="w-38"
      />
    </div>
  </div>
  <div className="h-72">
    <ResponseRateChart data={responseRateChartData} xAxisLabel={selectedLabel} />
  </div>
</section>
 
        </div>

        {/* Engagement Charts */}
        <div className="mt-2 flex flex-col md:flex-row gap-6">
  <section
    className="
      md:w-1/2 bg-white p-6 rounded-xl border border-gray-200
      shadow-sm hover:shadow-md transition-shadow duration-200
      h-[240px] md:h-[290px]
    "
  >
    <DoctorEngagementChart
      title="Top 5 Doctor Engagement"
      data={topEngagement}
      barColor="rgba(75,192,192,0.7)"
    />
  </section>
  <section
    className="
      md:w-1/2 bg-white p-6 rounded-xl border border-gray-200
      shadow-sm hover:shadow-md transition-shadow duration-200
      h-[240px] md:h-[290px]
    "
  >
    <DoctorEngagementChart
      title="Bottom 5 Doctor Engagement"
      data={bottomEngagement}
      barColor="rgba(255,99,132,0.7)"
    />
  </section>
</div>
      </div>
    </div>
  );
}

// Simplified ChartWrapper:
function ChartWrapper({ title, children }) {
  return (
    <div className="border border-gray-300 rounded-lg bg-white shadow-sm">
      <h3 className="text-center mb-2">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value, iconColor = "text-indigo-600" }) {
    return (
      <div
        className="
          bg-white p-4 rounded-lg shadow 
          hover:shadow-lg hover:-translate-y-1 
          transition-shadow transition-transform duration-200 ease-in-out
          text-center border border-gray-200
        "
      >
        <Icon className={`mx-auto text-3xl ${iconColor}`} />
        <div className="mt-2 text-gray-700">{title}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </div>
    );
  }

function ResponseRateChart({ data, xAxisLabel }) {
  if (!data?.length) return <p>Loading chart…</p>;

  // How many bars to show at once
  const maxVisible = 5;
  const total = data.length;
  // Calculate the last index we want to show initially
  const endValue = Math.min(maxVisible - 1, total - 1);

  const maxLength = 15;  // Set the maximum character length for provider names

  const option = {
    dataZoom: [
      {
        type: 'slider',      // Show a slider bar
        show: true,
        xAxisIndex: 0,
        startValue: 0,       // Start at the first bar
        endValue,            // Show up to the 5th bar
        handleSize: '80%',   // Size of the draggable handle
        bottom: 10,          // Distance from the bottom of the chart
        minValue: 0,         // Prevent slider from starting before the first bar
        maxValue: endValue,  // Restrict to 5 items at most
        disabled: false,     // Allow the slider to be draggable
      },
      {
        type: 'inside',      // Allow scroll/pinch inside the plot
        xAxisIndex: 0,
        startValue: 0,
        endValue
      }
    ],
    grid: {
      left: 25,
      right: 20,
      top: 20,
      bottom: 40,
      containLabel: true
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.label),
      axisLabel: {
        interval: 0,    // Show every single label
        rotate: 0,      // Don't rotate labels
        formatter: value => {
          // Truncate the provider names if they exceed maxLength
          if (value.length > maxLength) {
            return value.slice(0, maxLength) + '...';  // Add ellipses for long names
          }
          return value;  // Return as is if within the character limit
        }
      },
      name: null,
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      max: 100,
      name: 'Percentage',
      nameLocation: 'middle',
      nameGap: 30,
    },
    series: [
      {
        name: 'Response Rate',
        type: 'bar',
        data: data.map(d => d.responseRate),
        itemStyle: { color: '#36A2EB' }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 330 }} />;
}



function GenderChart({ genderData }) {
  if (!genderData?.length) return <p>Loading…</p>;

  const option = {
    title: { text: 'Gender Distribution', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 10,
      left: 'center',
      itemGap: 20
    },
    series: [{
      name: 'Gender',
      type: 'pie',
      radius: ['26%', '47%'],       // donut
      center: ['49%', '49%'],       // nudge up a bit for legend
      avoidLabelOverlap: false,     // don’t auto-hide overlapping labels

      // **force every label outside**
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}: {d}%',     // e.g. “Male: 46%”
        bleedMargin: 5,
        overflow: 'break',    // enable wrapping on spaces
        width: 60,            // max width before wrap—tweak as needed
      },
      // **draw connector lines on all slices**
      labelLine: {
        show: true,
        length: 20,    // first segment length
        length2: 1,   // second segment length
        smooth: false
      },

      data: genderData.map(g => ({ name: g.gender, value: g.count })),

      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  return <ReactECharts option={option} style={{ height: 285 }} />;
}




function AgeChart({ ageData }) {
  if (!ageData?.length) return <p>Loading…</p>;

  const option = {
    title: { text: 'Patients by Age', left: 'center' },
            grid: {
      left: 25,        // enough pixels to fully show your longest name
      right: 20,
      top: 60,
      bottom: 50,
      containLabel: true
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ageData.map(a => a.range),
      name: 'Age Group',
      nameLocation: 'middle',
      nameGap: 30,
    },
    yAxis: { 
      type: 'value',
      name: 'Number of Patients',
      nameLocation: 'middle',
      nameGap: 30
     },
    series: [{
      data: ageData.map(a => a.count),
      type: 'bar',
      itemStyle: { color: '#9966FF' }
    }]
  };

  return <ReactECharts option={option} style={{ height: 330 }} />;
}





function DoctorEngagementChart({ title, data, barColor }) {
  if (!data?.length) return <p>Loading…</p>;

  const option = {
    title: { text: title, left: 'center' },
        grid: {
      left: 10,        // enough pixels to fully show your longest name
      right: 20,
      top: 60,
      bottom: 36,
      containLabel: true
    },
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'value',
      max: 100,
    name: 'Percentile',
      nameLocation: 'middle',
      nameGap: 30, },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name),
      inverse: true // This ensures the first item is shown at the top
    },
    series: [{
      type: 'bar',
      data: data.map(d => parseFloat(d.percentile)),
      itemStyle: { color: barColor || '#4BC0C0' },
      barWidth: '50%',
      label: {
        show: true,
        position: 'right',
        formatter: '{c}%' // show value with percentage
      }
    }]
  };

  return <ReactECharts option={option} style={{ height: 270 }} />;
}


function Select({
  label,
  options,
  value,
  onChange,
  disabledOptions = [],
  className = "",
}) {
  return (
    <label className="flex flex-col space-y-1 text-sm">
      {label && <span className="font-medium">{label}</span>}

      <select
        className={`bg-gray-100 border border-gray-300 text-gray-700 text-sm rounded-xl
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2 transition
                    ${className}`}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => {
          const isObj = typeof opt === "object";
          const val   = isObj ? opt.value : opt;
          const lbl   = isObj ? opt.label : opt.charAt(0).toUpperCase() + opt.slice(1);

          return (
            <option
              key={val}
              value={val}
              disabled={disabledOptions.includes(val)}
            >
              {lbl}
            </option>
          );
        })}
      </select>
    </label>
  );
}