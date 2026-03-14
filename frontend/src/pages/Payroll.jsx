import { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { API_URL } from '../App';

function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [showGenerateAll, setShowGenerateAll] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchPayrolls();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const empList = data.filter(e => e.role === 'EMPLOYEE');
      setEmployees(empList);
      if (empList.length > 0) {
        setSelectedEmployee(empList[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayrolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/payroll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayrolls(data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculatePayroll = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/payroll/calculate`,
        { employeeId: selectedEmployee, month, year },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPayrolls();
      alert('Payroll calculated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error calculating payroll');
    }
    setLoading(false);
  };

  const generateAllPayrolls = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_URL}/payroll/generate-all`,
        { month, year },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPayrolls();
      setShowGenerateAll(false);
      alert(data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Error generating payrolls');
    }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/payroll/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPayrolls();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const exportPDF = (payroll) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('PAYSLIP', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    doc.text(`Month: ${monthNames[payroll.month - 1]} ${payroll.year}`, 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Employee Details', 14, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${payroll.employeeId?.name || 'N/A'}`, 14, 55);
    doc.text(`Email: ${payroll.employeeId?.email || 'N/A'}`, 14, 62);
    doc.text(`Department: ${payroll.employeeId?.department || 'N/A'}`, 14, 69);
    doc.text(`Position: ${payroll.employeeId?.position || 'N/A'}`, 14, 76);
    
    doc.setFontSize(14);
    doc.text('Earnings', 14, 95);
    
    const earningsData = [
      ['Basic Salary', `$${payroll.basicSalary?.toLocaleString() || 0}`],
      ['HRA', `$${payroll.hra?.toLocaleString() || 0}`],
      ['DA', `$${payroll.da?.toLocaleString() || 0}`],
      ['Conveyance', `$${payroll.conveyance?.toLocaleString() || 0}`],
      ['Special Allowance', `$${payroll.specialAllowance?.toLocaleString() || 0}`],
      ['Total Earnings', `$${payroll.totalEarnings?.toLocaleString() || 0}`]
    ];
    
    doc.autoTable({
      startY: 100,
      head: [['Description', 'Amount']],
      body: earningsData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    doc.text('Deductions', 14, doc.lastAutoTable.finalY + 15);
    
    const deductionsData = [
      ['PF', `$${payroll.pf?.toLocaleString() || 0}`],
      ['ESIC', `$${payroll.esic?.toLocaleString() || 0}`],
      ['TDS', `$${payroll.tds?.toLocaleString() || 0}`],
      ['Other Deductions', `$${payroll.otherDeductions?.toLocaleString() || 0}`],
      ['Total Deductions', `$${payroll.totalDeductions?.toLocaleString() || 0}`]
    ];
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Description', 'Amount']],
      body: deductionsData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] }
    });
    
    doc.setFontSize(14);
    doc.text(`Gross Salary: $${payroll.grossSalary?.toLocaleString() || 0}`, 14, doc.lastAutoTable.finalY + 15);
    doc.text(`Net Salary: $${payroll.netSalary?.toLocaleString() || 0}`, 14, doc.lastAutoTable.finalY + 25);
    
    doc.setFontSize(10);
    doc.text(`Status: ${payroll.status}`, 14, doc.lastAutoTable.finalY + 40);
    doc.text('HR Management System', 105, doc.lastAutoTable.finalY + 40, { align: 'center' });
    
    doc.save(`payslip_${payroll.employeeId?.name || 'employee'}_${monthNames[payroll.month - 1]}_${payroll.year}.pdf`);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-secondary mb-6">Payroll Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Calculate Payroll</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {monthNames.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={calculatePayroll}
            disabled={loading || !selectedEmployee}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
          <button
            onClick={() => setShowGenerateAll(true)}
            disabled={loading}
            className="bg-accent text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Generate All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Payroll Records</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Days</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payrolls.map((p) => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{p.employeeId?.name}</td>
                <td className="px-6 py-4">{monthNames[p.month - 1]} {p.year}</td>
                <td className="px-6 py-4">{p.workingDays}</td>
                <td className="px-6 py-4 text-green-600">{p.presentDays}</td>
                <td className="px-6 py-4">${p.grossSalary?.toLocaleString()}</td>
                <td className="px-6 py-4 text-red-600">-${p.totalDeductions?.toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-green-600">${p.netSalary?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    p.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    p.status === 'PROCESSED' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => exportPDF(p)} className="text-primary hover:underline mr-3">
                    PDF
                  </button>
                  {p.status === 'DRAFT' && (
                    <button onClick={() => updateStatus(p._id, 'PROCESSED')} className="text-blue-500 hover:underline mr-3">
                      Process
                    </button>
                  )}
                  {p.status === 'PROCESSED' && (
                    <button onClick={() => updateStatus(p._id, 'PAID')} className="text-green-500 hover:underline">
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payrolls.length === 0 && (
          <div className="text-center py-8 text-gray-500">No payroll records found</div>
        )}
      </div>

      {showGenerateAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Payroll for All Employees</h2>
            <p className="mb-4">This will calculate payroll for all active employees for {monthNames[month - 1]} {year}.</p>
            <div className="flex gap-3">
              <button
                onClick={generateAllPayrolls}
                className="flex-1 bg-accent text-white py-2 rounded-lg hover:bg-green-600"
              >
                Generate All
              </button>
              <button
                onClick={() => setShowGenerateAll(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payroll;
