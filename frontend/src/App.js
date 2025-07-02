// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DocDashboard      from './Doctor/Dashboard';
import HospitalDashboard from './Hospital/BupaDashboard';
import RoleGate          from './RoleGate';

function App() {
  return (
    <Router>
      <Routes>
        {/* Doctor dashboard – doctor session only */}
        <Route
          element={<RoleGate requiredRole="doctor" loginUrl="https://app.wehealthify.org/doctorlogin/" />}
        >
          <Route
            path="/doctor/Dashboard/:hospital_code/:site_code/:speciality/*"
            element={<DocDashboard />}
          />
        </Route>

        {/* Hospital admin dashboard – hospital_admin session only */}
        <Route
          element={
            <RoleGate
              requiredRole="hospital_admin"
              loginUrl="https://app.wehealthify.org/hospitaladmin/"
            />
          }
        >
          <Route
            path="/admin/Dashboard/:hospital_code/:site_code/*"
            element={<HospitalDashboard />}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;