import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangeTempPassword from './pages/ChangeTempPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfile from './pages/EmployeeProfile';
import Attendance from './pages/Attendance';
import Salary from './pages/Salary';
import Payroll from './pages/Payroll';
import Layout from './components/Layout';

export const AuthContext = createContext();

export const API_URL = '/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
          <Route path="/reset-password/:token" element={!user ? <ResetPassword /> : <Navigate to="/" />} />
          <Route path="/change-temp-password" element={user?.isTempPassword ? <ChangeTempPassword /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            {['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(user?.role) && (
              <Route path="employees" element={<Employees />} />
            )}
            <Route path="profile/:id?" element={<EmployeeProfile />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="salary" element={<Salary />} />
            {['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(user?.role) && (
              <Route path="payroll" element={<Payroll />} />
            )}
          </Route>
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
