// Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Sidebar.css';     // ← exactly as before
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiUser,
  FiMail,
  FiCheckCircle,
  FiBarChart2,
  FiMenu
} from 'react-icons/fi';
import ResponseRateDonut from './ResponseRateDonut';
import 'chart.js/auto';

import TreatmentDiagnosisHeatmap from './TreatmentDiagnosisHeatmap';
import { MeanScoreChart, ScoreTrendChart } from './MeanScoreChart';

const baseNavItemClasses = "flex items-center text-sm hover:bg-gray-100 rounded";
const API_URL = process.env.REACT_APP_URL;

const stageOrder = [
  "Baseline",
  "Followup - 1",
  "Followup - 2",
  "Followup - 3"
];

const TREATMENT_LIST = [
  "Surgery",
  "Lifestyle Modifications",
  "Medication",
  "Physical Therapy"
];

function buildChartSubtitle(survey, treatment, diagnosis) {
  const parts = [];

  if (survey && survey !== "All") {
    parts.push(`“${survey}” survey`);
  } else {
    parts.push("All surveys");
  }

  if (treatment && treatment !== "all" && treatment !== "No Plan") {
    parts.push(`with treatment “${treatment}”`);
  }

  if (diagnosis && diagnosis !== "all" && diagnosis !== "None") {
    parts.push(`and diagnosis “${diagnosis}”`);
  }

  return parts.join(" ");
}

export default function Dashboard() {
  const { hospital_code, site_code, speciality } = useParams();
  const navigate = useNavigate();

  // ───── Sidebar open/close state ─────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ───── Filters & state ─────
const myHash   = window.__DOCTOR_ID__ ?? null;         // plain constant
const [doctorId, setDoctorId] = useState(myHash || 'all');
  const [survey, setSurvey] = useState('All');
  const [availableSurveys, setAvailableSurveys] = useState(['All']);
  const [treatment, setTreatment] = useState('all');
  const [availableTreatments, setAvailableTreatments] = useState([]);
  const [diagnosis, setDiagnosis] = useState('all');
  const [availableDiagnoses, setAvailableDiagnoses] = useState([]);

  // ───── Data states ─────
  const [meanData, setMeanData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [registered, setRegistered] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [responseRate, setResponseRate] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [diagnosisLabels, setDiagnosisLabels] = useState([]);
  const [treatmentLabels, setTreatmentLabels] = useState([]);


  // Build filters payload
  const filters = {
    hospital_code: hospital_code === 'all' ? '' : hospital_code,
    site_code:     site_code     === 'all' ? '' : site_code,
    speciality:    speciality    === 'all' ? '' : speciality,
    hashedusername:     doctorId      === 'all' ? '' : doctorId,
    survey,
    treatment_plan: treatment === 'all' || treatment === 'No Plan' ? undefined : treatment,
    diagnosis:      diagnosis === 'all' || diagnosis === 'None'  ? undefined : diagnosis
  };

  // ───── Load surveys ─────
  useEffect(() => {
    async function loadSurveys() {
      try {
        const params = new URLSearchParams({ hospital_code, site_code, speciality });
        const res = await fetch(`${API_URL}/surveys?${params}`);
        const payload = await res.json();
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.types)
            ? payload.types
            : [];
        setAvailableSurveys(['All', ...list]);
        if (!list.includes(survey)) setSurvey('All');
      } catch {
        setAvailableSurveys(['All']);
        setSurvey('All');
      }
    }
    loadSurveys();
  }, [hospital_code, site_code, speciality]);



  // ───── Load treatments ─────
  useEffect(() => {
    async function loadTreatments() {
      try {
        const params = { hospital_code, site_code, speciality, hashedusername: doctorId };
        const { data: list } = await axios.get(`${API_URL}/treatments`, { params });
        setAvailableTreatments(list);
        if (!list.includes(treatment)) setTreatment(list.length ? 'all' : 'No Plan');
      } catch {
        setAvailableTreatments([]);
        setTreatment('No Plan');
      }
    }
    loadTreatments();
  }, [hospital_code, site_code, speciality, doctorId]);

  // ───── Load diagnoses ─────
  useEffect(() => {
    async function loadDiagnoses() {
      try {
        const params = { hospital_code, site_code, speciality, hashedusername: doctorId };
        const { data: list } = await axios.get(`${API_URL}/diagnoses`, { params });
        setAvailableDiagnoses(list);
        if (!list.includes(diagnosis)) setDiagnosis(list.length ? 'all' : 'None');
      } catch {
        setAvailableDiagnoses([]);
        setDiagnosis('None');
      }
    }
    loadDiagnoses();
  }, [hospital_code, site_code, speciality, doctorId]);

  // ───── Fetch charts whenever filters change ─────
  useEffect(() => {
    async function fetchCharts() {
      if (!survey) return;
      const params = { ...filters };
      try {
        const [meanRes, trendRes] = await Promise.all([
          axios.get(`${API_URL}/mean-scores`, { params }),
          axios.get(`${API_URL}/score-trend`,  { params })
        ]);

        const ms = Array.isArray(meanRes.data)
          ? (survey === 'All'
              ? meanRes.data.flatMap(g => g.results.map(r => ({ ...r, survey: g.survey })))
              : (meanRes.data.find(g => g.survey === survey)?.results || [])
            )
          : [];
        setMeanData(ms);
        setTrendData(Array.isArray(trendRes.data) ? trendRes.data : []);
      } catch {
        setMeanData([]);
        setTrendData([]);
      }
    }
    fetchCharts();
  }, [survey, doctorId, treatment, diagnosis, hospital_code, site_code, speciality]);

  // ───── Fetch metrics (registered, generated, completed, responseRate) ─────
  useEffect(() => {
    const endpoints = [
      ['registered-patients',  setRegistered],
      ['generated-surveys',    setGenerated],
      ['surveys-completed',    setCompleted],
      ['survey-response-rate', setResponseRate]
    ];
    endpoints.forEach(async ([path, setter]) => {
      try {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_URL}/${path}?${params}`);
        setter(await res.json());
      } catch {
        setter(null);
      }
    });
  }, [doctorId, survey, treatment, diagnosis, hospital_code, site_code, speciality]);

  // ───── Fetch heatmap data ─────
  useEffect(() => {
    async function loadHeatmap() {
      try {
        const params = new URLSearchParams(filters);
        const res = await fetch(`${API_URL}/heatmap-data?${params}`);
        const { diagnoses, treatments, matrix } = await res.json();
        setDiagnosisLabels(diagnoses);
        setTreatmentLabels(treatments);
        setHeatmapData(matrix);
      } catch {
        setHeatmapData([]);
      }
    }
    loadHeatmap();
  }, [doctorId, hospital_code, site_code, speciality]);

  // ───── Compute disabled options for selects ─────
  const disabledTreatments = availableTreatments.length
    ? TREATMENT_LIST.filter(t => !availableTreatments.includes(t))
    : ['all', ...TREATMENT_LIST];

  const disabledDiagnoses = availableDiagnoses.length ? [] : ['all'];

  const meanSubtitle  = buildChartSubtitle(survey, treatment, diagnosis);
  const trendSubtitle = buildChartSubtitle(survey, treatment, diagnosis);

  return (
    <div>
      {/** ─── SIDEBAR (fixed) ─── **/}
      <div className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="top">
          <div className="logo">
            {/** Replace this src with your actual logo path */}
            <img src="/WeHealthifyLOGO.png" alt="WeHealthify" style={{ height: '52px' }} />
          </div>
          {/** The toggle button that expands/collapses the sidebar */}
          {/* Hamburger icon: */}
          <FiMenu
            id="btn"
            size={24}
            className="text-white cursor-pointer"
            onClick={() => setIsSidebarOpen(prev => !prev)}
          />
        </div>

        <div className="user">
          <div>
            {/** If you want username, uncomment the next line and replace with actual data */}
            {/** <p className="bold">{doctor.username}</p> */}
            <p className="bold">{/* doctor.speciality */}Speciality</p>
            <p className="bold">{/* doctor.hospitalName */}Hospital Name</p>
            <p className="bold">{/* doctor.site_code */}Site Code</p>
          </div>
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
          <i class="bx bx-group"></i> {/* Icon for Home */}
          <span className="nav-item" id="home_label">
            List of Patients {/* Display text */}
          </span>
        </a>
        <span className="tooltip" id="home_tooltip">
          List of Patients {/* Tooltip text */}
        </span>
      </li>


        </ul>

      </div>

      {/** ─── MAIN CONTENT (now with gray background & spacing) ─── **/}
      <div
        className="main-content h-screen flex flex-col bg-gray-100"
        style={{
          position: 'relative',
          left: isSidebarOpen ? '250px' : '80px',
          width: isSidebarOpen ? 'calc(100% - 250px)' : 'calc(100% - 80px)',
          transition: 'all 0.5s ease'
        }}
      >
        {/** ─── HEADER (without its own hamburger) ─── **/}
        <header className="flex justify-between items-center bg-white p-4 shadow flex-none">
          <h1 className="text-2xl font-bold">Welcome, Doc</h1>

          <div>
            <select
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="all">All Doctors</option>

              {myHash && <option value={myHash}>Your Analytics</option>}
            </select>
          </div>
        </header>

        {/** ─── BODY (metrics + filters + charts) ─── **/}
        <main className="flex-1 flex flex-col p-2">
          {/* ── Metrics Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <MetricCard
              icon={<FiUser size={24} className="text-blue-500" />}
              title="Patients Registered"
              value={registered?.totalRegisteredPatients || 0}
              label="Total number of patients registered in the system"
            />

            <MetricCard
              icon={<FiMail size={24} className="text-green-500" />}
              title="Surveys Sent"
              value={generated?.totalGeneratedSurveys || 0}
              label="Number of surveys that have been sent out to patients"
            />

            <MetricCard
              icon={<FiCheckCircle size={24} className="text-purple-500" />}
              title="Surveys Completed"
              value={completed?.totalCompletedSurveys || 0}
              label="Number of surveys filled out and submitted by patients"
            />

            <MetricCard
              icon={<FiBarChart2 size={24} className="text-red-500" />}
              title="Response Rate"
              value={`${(responseRate?.responseRate ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0
              })}%`}
              label="Percentage of sent surveys that have been completed"
            />
          </div>

            <div className="flex flex-col md:flex-row gap-2 ">

              <div className="flex flex-col bg-white rounded-xl pt-6  p-2 h-full md:w-[70%] w-full">
              {/** Filters row **/}

              
              <div className="flex items-center  gap-4 mb-8">

                
              {/* Diagnosis card */}
              <div className=" rounded-xl shadow p-2 w-30">
                <Select
                  label="Diagnosis"
                  options={["All", ...availableDiagnoses, "None"]}
                  value={diagnosis}
                  onChange={setDiagnosis}
                  disabledOptions={disabledDiagnoses}
                  className="w-30 bg-gray-100 border-none rounded-xl"
                />
              </div>
              {/* Survey card */}
              <div className=" rounded-xl shadow  p-2 w-45">
                <Select
                  label="Survey"
                  options={availableSurveys}
                  value={survey}
                  onChange={setSurvey}
                  className="w-30 bg-gray-100 border-none rounded-xl"
                />
              </div>

              {/* Treatment Plan card */}
              <div className=" rounded-xl shadow p-2 w-45">
                <Select
                  label="Treatment Plan"
                  options={["All", ...TREATMENT_LIST, "No Plan"]}
                  value={treatment}
                  onChange={setTreatment}
                  disabledOptions={disabledTreatments}
                  className="w-30 bg-gray-100 border-none rounded-xl"
                />
              </div>

            </div>
            {/* Wrap both chart cards in a flex row */}
            <div className="flex gap-2 h-full">
              {/* First chart card: Mean Score */}
              <div className="flex flex-col  p-3 rounded-xl border shadow-md hover:shadow-lg w-1/2">
                <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 pb-1">
                  Mean Score
                </h2>
                <h3 className="text-sm text-gray-600 mb-4">{meanSubtitle}.</h3>
                <div className="flex-grow overflow-hidden">
                  <MeanScoreChart
                    meanData={meanData}
                    survey={survey}
                    stageOrder={stageOrder}
                  />
                </div>
              </div>

            {/* Second chart card: Score Trend */}
            <div className="flex flex-col  p-3 rounded-xl border shadow-md hover:shadow-lg w-1/2">
              <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 pb-1">
                Score Trend
              </h2>
              <h3 className="text-sm text-gray-600 mb-4">{trendSubtitle}.</h3>
              <div className="flex-grow overflow-hidden">
                <ScoreTrendChart trendData={trendData} survey={survey} />
              </div>
            </div>
          </div>
          </div>

              {/** ── Right Column: Survey Response Rate (Donut) stacked above Heatmap ── **/}
              <div className="flex flex-col gap-4 md:w-[30%] w-full">
                {/** Survey Response Rate card **/}
                <div className="bg-white p-3 rounded-xl shadow-md hover:shadow-lg flex justify-center items-center flex-grow">
                  <ResponseRateDonut value={responseRate?.responseRate ?? 0} />
                </div>

                {/** Treatment vs Diagnosis Heatmap card **/}
                <div className="bg-white p-3 rounded-xl shadow-md hover:shadow-lg flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold mb-2 border-b border-gray-200 pb-1">
                    Treatment vs Diagnosis Heatmap
                  </h3>
                  <div className="flex-grow overflow-auto">
                    <TreatmentDiagnosisHeatmap
                      data={heatmapData}
                      diagnoses={diagnosisLabels}
                      treatments={treatmentLabels}
                    />
                  </div>
                </div>
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}

/** ─── MetricCard Component (unchanged) ─── **/
function MetricCard({ icon, title, value, label }) {
  return (
    <div
      className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center space-x-4"
      title={label}
    >
      <div className="flex-shrink-0 bg-gray-100 p-2 rounded-full">{icon}</div>
      <div className="text-left">
        <h2 className="text-base font-medium text-gray-700">{title}</h2>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/** ─── Select Component (unchanged) ─── **/
function Select({
  label,
  options,
  value,
  onChange,
  disabledOptions = [],
  /** Accept any extra Tailwind classes—e.g. "w-32" or "w-48". */
  className = ""
}) {
  return (
    <label className="flex items-center space-x-2">
      <span className="text-sm font-medium">{label}:</span>
      <select
        className={`border p-2 rounded ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} disabled={disabledOptions.includes(opt)}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}