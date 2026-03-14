import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API_URL } from '../App';

function EmployeeProfile() {
  const { id } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [employee, setEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const employeeId = id || currentUser?._id;
        if (!employeeId) return;
        
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_URL}/employees/${employeeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployee(data);
        setFormData({
          name: data.name,
          department: data.department,
          position: data.position,
          salary: data.salary,
          phone: data.phone,
          address: data.address
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployee();
  }, [id, currentUser]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const employeeId = id || currentUser?._id;
      await axios.put(`${API_URL}/employees/${employeeId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployee({ ...employee, ...formData });
      setIsEditing(false);
    } catch (err) {
      alert('Error updating profile');
    }
  };

  if (!employee) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  const canEdit = currentUser?.role === 'HR_ADMIN' || currentUser?._id === employee._id;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/" className="text-primary hover:underline">← Back to Dashboard</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {employee.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary">{employee.name}</h1>
                <p className="text-gray-500">{employee.email}</p>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">
                  {employee.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}
                </span>
              </div>
            </div>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border rounded-lg"
                rows="2"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg">Save</button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Employee Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{employee.department || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-medium">{employee.position || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Salary</p>
                <p className="font-medium">${employee.salary?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Join Date</p>
                <p className="font-medium">{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{employee.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{employee.address || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeProfile;
