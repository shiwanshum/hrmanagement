import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App';

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'IT',
  'Design',
  'Customer Support',
  'Research & Development'
];

const SALARY_PERIODS = ['Monthly', 'Bi-Monthly', 'Weekly', 'Daily'];

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    empId: '',
    empCardId: '',
    biometricEnabled: false,
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '',
    position: '',
    salary: '',
    yearlySalaryPackage: '',
    salaryAvailablePeriod: 'Monthly',
    phone: '',
    address: '',
    sittingLocation: '',
    aadharNo: '',
    panNo: '',
    bankName: '',
    bankAccountNo: '',
    medicalInsuranceId: '',
    medicalInsuranceEnabled: false,
    joinDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/employees/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      let result;
      if (editingEmployee) {
        const { password, ...updateData } = formData;
        result = await axios.put(`${API_URL}/employees/${editingEmployee._id}`, formData, config);
      } else {
        result = await axios.post(`${API_URL}/employees`, formData, config);
      }
      
      if (!editingEmployee && result.data.tempPassword) {
        setShowTempPassword(result.data.tempPassword);
      }
      
      fetchEmployees();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      empId: employee.empId || '',
      empCardId: employee.empCardId || '',
      biometricEnabled: employee.biometricEnabled || false,
      name: employee.name || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'EMPLOYEE',
      department: employee.department || '',
      position: employee.position || '',
      salary: employee.salary || '',
      yearlySalaryPackage: employee.yearlySalaryPackage || '',
      salaryAvailablePeriod: employee.salaryAvailablePeriod || 'Monthly',
      phone: employee.phone || '',
      address: employee.address || '',
      sittingLocation: employee.sittingLocation || '',
      aadharNo: employee.aadharNo || '',
      panNo: employee.panNo || '',
      bankName: employee.bankName || '',
      bankAccountNo: employee.bankAccountNo || '',
      medicalInsuranceId: employee.medicalInsuranceId || '',
      medicalInsuranceEnabled: employee.medicalInsuranceEnabled || false,
      joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleViewDetails = (employee) => {
    setShowDetailsModal(employee);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/employees/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const resetPassword = async (id) => {
    const newPassword = prompt('Enter new temporary password (or leave empty for auto-generated):');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `${API_URL}/employees/${id}/reset-password`,
        { newTempPassword: newPassword || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Password reset! Temp password: ${data.tempPassword}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error resetting password');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData({
      empId: '',
      empCardId: '',
      biometricEnabled: false,
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      department: '',
      position: '',
      salary: '',
      yearlySalaryPackage: '',
      salaryAvailablePeriod: 'Monthly',
      phone: '',
      address: '',
      sittingLocation: '',
      aadharNo: '',
      panNo: '',
      bankName: '',
      bankAccountNo: '',
      medicalInsuranceId: '',
      medicalInsuranceEnabled: false,
      joinDate: new Date().toISOString().split('T')[0]
    });
  };

  const getRoleBadge = (role) => {
    const colors = {
      ADMIN: 'bg-red-100 text-red-700',
      CO_ADMIN: 'bg-orange-100 text-orange-700',
      HR_ADMIN: 'bg-purple-100 text-purple-700',
      EMPLOYEE: 'bg-blue-100 text-blue-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary">User Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add New User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp._id} className="hover:bg-gray-50">
                <td className="px-4 py-4 font-medium text-secondary">{emp.empId || '-'}</td>
                <td className="px-4 py-4 font-medium">{emp.name}</td>
                <td className="px-4 py-4 text-gray-500">{emp.email}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadge(emp.role)}`}>
                    {emp.role}
                  </span>
                </td>
                <td className="px-4 py-4 text-gray-500">{emp.department || '-'}</td>
                <td className="px-4 py-4 text-gray-500">{emp.position || '-'}</td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => toggleStatus(emp._id)}
                    className={`px-2 py-1 rounded-full text-xs ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <button onClick={() => handleViewDetails(emp)} className="text-blue-500 hover:underline mr-2">
                    View
                  </button>
                  <button onClick={() => handleEdit(emp)} className="text-primary hover:underline mr-2">
                    Edit
                  </button>
                  <button onClick={() => resetPassword(emp._id)} className="text-orange-500 hover:underline mr-2">
                    Reset
                  </button>
                  <button onClick={() => handleDelete(emp._id)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="text-center py-8 text-gray-500">No users found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingEmployee ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <input
                    type="text"
                    name="empId"
                    value={formData.empId}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Card ID</label>
                  <input
                    type="text"
                    name="empCardId"
                    value={formData.empCardId}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="CARD001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    required
                    disabled={editingEmployee}
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="Leave empty for auto-generated"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sitting Location</label>
                  <input
                    type="text"
                    name="sittingLocation"
                    value={formData.sittingLocation}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="Floor 1, Desk A1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yearly Package</label>
                  <input
                    type="number"
                    name="yearlySalaryPackage"
                    value={formData.yearlySalaryPackage}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                    placeholder="600000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary Period</label>
                  <select
                    name="salaryAvailablePeriod"
                    value={formData.salaryAvailablePeriod}
                    onChange={handleChange}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                  >
                    {SALARY_PERIODS.map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Date</label>
                  <input
                    type="date"
                    name="joinDate"
                    value={formData.joinDate}
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

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-3">Document Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                    <input
                      type="text"
                      name="aadharNo"
                      value={formData.aadharNo}
                      onChange={handleChange}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                      placeholder="1234 5678 9012"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                    <input
                      type="text"
                      name="panNo"
                      value={formData.panNo}
                      onChange={handleChange}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                      placeholder="ABCDE1234F"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-3">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                      placeholder="State Bank of India"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <input
                      type="text"
                      name="bankAccountNo"
                      value={formData.bankAccountNo}
                      onChange={handleChange}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                      placeholder="1234567890"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-3">Other Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="biometricEnabled"
                      checked={formData.biometricEnabled}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-gray-700">Biometric Enabled</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="medicalInsuranceEnabled"
                      checked={formData.medicalInsuranceEnabled}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-medium text-gray-700">Medical Insurance Enabled</label>
                  </div>
                </div>
                {formData.medicalInsuranceEnabled && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">Medical Insurance ID</label>
                    <input
                      type="text"
                      name="medicalInsuranceId"
                      value={formData.medicalInsuranceId}
                      onChange={handleChange}
                      className="mt-1 w-full px-3 py-2 border rounded-lg"
                      placeholder="MEDI123456"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingEmployee ? 'Update' : 'Add'} User
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTempPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-green-600">User Created Successfully!</h2>
            <p className="mb-2">Temporary password for the new user:</p>
            <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mb-4">
              <p className="text-2xl font-bold text-center text-yellow-800">{showTempPassword}</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">Share this password with the user. They will be prompted to change it on first login.</p>
            <button
              onClick={() => setShowTempPassword(null)}
              className="w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Employee Details</h2>
              <button onClick={() => setShowDetailsModal(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Employee ID</p>
                  <p className="font-medium">{showDetailsModal.empId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Card ID</p>
                  <p className="font-medium">{showDetailsModal.empCardId || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{showDetailsModal.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{showDetailsModal.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{showDetailsModal.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{showDetailsModal.department || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Position</p>
                  <p className="font-medium">{showDetailsModal.position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sitting Location</p>
                  <p className="font-medium">{showDetailsModal.sittingLocation || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Monthly Salary</p>
                  <p className="font-medium">₹{showDetailsModal.salary?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Yearly Package</p>
                  <p className="font-medium">₹{showDetailsModal.yearlySalaryPackage?.toLocaleString() || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Salary Period</p>
                  <p className="font-medium">{showDetailsModal.salaryAvailablePeriod || 'Monthly'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Join Date</p>
                  <p className="font-medium">{showDetailsModal.joinDate ? new Date(showDetailsModal.joinDate).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{showDetailsModal.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Biometric</p>
                  <p className="font-medium">{showDetailsModal.biometricEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>

              <div className="border-b pb-4">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{showDetailsModal.address || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Aadhar Number</p>
                  <p className="font-medium">{showDetailsModal.aadharNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="font-medium">{showDetailsModal.panNo || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-gray-500">Bank Name</p>
                  <p className="font-medium">{showDetailsModal.bankName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="font-medium">{showDetailsModal.bankAccountNo ? '****' + showDetailsModal.bankAccountNo.slice(-4) : 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Medical Insurance</p>
                  <p className="font-medium">{showDetailsModal.medicalInsuranceEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Insurance ID</p>
                  <p className="font-medium">{showDetailsModal.medicalInsuranceId || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
