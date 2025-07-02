import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export default function RoleGate({ requiredRole, loginUrl }) {
  const [status, setStatus] = useState('checking');     // 'checking' | 'allowed' | 'denied'
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const apiUrl = requiredRole === 'hospital_admin' ? '/api-hospital/me' : '/api/me';

    fetch(apiUrl, { credentials: 'include', signal })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(user => {

        if (user.role === requiredRole) {
          window.__ROLE__      = user.role;
          window.__DOCTOR_ID__ = user.doctorIdHash;
          window.__ADMIN_ID__  = user.adminIdHash;
          setStatus('allowed');
        } else {
          setStatus('denied');
          window.location.replace(loginUrl);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setStatus('denied');
        window.location.replace(loginUrl);
      });

    return () => controller.abort();
  }, [requiredRole, loginUrl, location.pathname]);

  if (status === 'checking') return <div>Loading…</div>;
  if (status === 'denied')   return null;

  return <Outlet />;
}
