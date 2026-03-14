import { useContext } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

function Layout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = ['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(user?.role);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/attendance', label: 'Attendance', icon: '📋' },
    { path: '/salary', label: 'My Salary', icon: '💰' },
    ...(isAdmin ? [
      { path: '/employees', label: 'Users', icon: '👥' },
      { path: '/payroll', label: 'Payroll', icon: '💵' }
    ] : []),
    { path: '/profile', label: 'Profile', icon: '👤' }
  ];

  const getRoleLabel = (role) => {
    const labels = {
      ADMIN: 'Administrator',
      CO_ADMIN: 'Co-Administrator',
      HR_ADMIN: 'HR Admin',
      EMPLOYEE: 'Employee'
    };
    return labels[role] || role;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-secondary text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">HR Management</h1>
          <p className="text-gray-400 text-sm">{getRoleLabel(user?.role)}</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-gray-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
