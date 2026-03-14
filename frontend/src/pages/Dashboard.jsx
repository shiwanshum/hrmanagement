import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API_URL } from '../App';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalUsers: 0,
    employees: 0,
    departments: 0,
    attendance: 0,
    payroll: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        if (['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(user?.role)) {
          const [usersRes, attRes, payrollRes] = await Promise.all([
            axios.get(`${API_URL}/employees`, { headers }),
            axios.get(`${API_URL}/attendance`, { headers }),
            axios.get(`${API_URL}/payroll`, { headers })
          ]);
          
          const users = usersRes.data;
          const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
          
          setStats({
            totalUsers: users.length,
            employees: users.filter(u => u.role === 'EMPLOYEE').length,
            departments: departments.length,
            attendance: attRes.data.length,
            payroll: payrollRes.data.length
          });
        } else {
          const attRes = await axios.get(`${API_URL}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
          setStats({
            totalUsers: 0,
            employees: 0,
            departments: 0,
            attendance: attRes.data.length,
            payroll: 0
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, [user]);

  const isAdmin = ['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(user?.role);

  const adminCards = [
    { title: 'Total Users', count: stats.totalUsers, color: 'bg-blue-500', icon: '👥' },
    { title: 'Employees', count: stats.employees, color: 'bg-green-500', icon: '👷' },
    { title: 'Departments', count: stats.departments, color: 'bg-purple-500', icon: '🏢' },
    { title: 'Payroll Records', count: stats.payroll, color: 'bg-orange-500', icon: '💵' }
  ];

  const employeeCards = [
    { title: 'My Attendance', count: stats.attendance, color: 'bg-green-500', icon: '📋' },
    { title: 'Department', count: user?.department || 'N/A', color: 'bg-purple-500', icon: '🏢' },
    { title: 'Position', count: user?.position || 'N/A', color: 'bg-blue-500', icon: '💼' },
    { title: 'Join Date', count: user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A', color: 'bg-orange-500', icon: '📅' }
  ];

  const cards = isAdmin ? adminCards : employeeCards;

  const getRoleLabel = (role) => {
    const labels = {
      ADMIN: 'Administrator',
      CO_ADMIN: 'Co-Administrator', 
      HR_ADMIN: 'HR Administrator',
      EMPLOYEE: 'Employee'
    };
    return labels[role] || role;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Welcome back, {user?.name}!</h1>
        <p className="text-gray-500">{getRoleLabel(user?.role)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-secondary mt-1">{card.count}</p>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-secondary mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {isAdmin && (
              <Link
                to="/employees"
                className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <span className="font-medium text-primary">+ Add New User</span>
              </Link>
            )}
            <Link
              to="/attendance"
              className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
            >
              <span className="font-medium text-green-600">Mark Attendance</span>
            </Link>
            <Link
              to="/salary"
              className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
            >
              <span className="font-medium text-purple-600">View Salary & Payslip</span>
            </Link>
            {isAdmin && (
              <Link
                to="/payroll"
                className="block p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
              >
                <span className="font-medium text-orange-600">Manage Payroll</span>
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-secondary mb-4">Your Profile</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Role</span>
              <span className="font-medium">{getRoleLabel(user?.role)}</span>
            </div>
            {user?.department && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Department</span>
                <span className="font-medium">{user.department}</span>
              </div>
            )}
            {user?.position && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Position</span>
                <span className="font-medium">{user.position}</span>
              </div>
            )}
            <Link
              to="/profile"
              className="block mt-4 text-center bg-secondary text-white py-2 rounded-lg hover:bg-gray-700 transition"
            >
              View Full Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
