import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Shell from './components/Shell.jsx';
import Billing from './pages/Billing.jsx';
import CreateShort from './pages/CreateShort.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyVideos from './pages/MyVideos.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create" element={<CreateShort />} />
          <Route path="/videos" element={<MyVideos />} />
          <Route path="/library" element={<Navigate to="/videos" replace />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}
