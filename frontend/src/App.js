// src/App.js
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DocDashboard from './Doctor/Dashboard';
import HospitalDashboard from './Hospital/BupaDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/doctor/Dashboard/:hospital_code/:site_code/:speciality" element={<DocDashboard />} />
        <Route path="/hospitaladmin/Dashboard/:hospital_code/:site_code" element={<HospitalDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;


