import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AuthContext, API_URL } from '../App';

function Salary() {
  const { user } = useContext(AuthContext);
  const [salaryData, setSalaryData] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSalary();
  }, [month, year]);

  const fetchSalary = async () => {
    try {
      const employeeId = user?._id;
      if (!employeeId) return;

      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/salary/${employeeId}?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSalaryData(data);
    } catch (err) {
      console.error(err);
      setSalaryData(null);
    }
  };

  const handleViewSalary = () => {
    fetchSalary();
  };

  const exportPDF = async () => {
    if (!salaryData) return;

    try {
      const token = localStorage.getItem('token');
      const { data: payslip } = await axios.get(
        `${API_URL}/salary/${salaryData.employee._id}/payslip/${year}/${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('PAYSLIP', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Month: ${payslip.monthName} ${payslip.year}`, 105, 30, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text('Employee Details', 14, 45);
      doc.setFontSize(10);
      doc.text(`Name: ${payslip.employee.name}`, 14, 55);
      doc.text(`Email: ${payslip.employee.email}`, 14, 62);
      doc.text(`Department: ${payslip.employee.department || 'N/A'}`, 14, 69);
      doc.text(`Position: ${payslip.employee.position || 'N/A'}`, 14, 76);
      doc.text(`Join Date: ${new Date(payslip.employee.joinDate).toLocaleDateString()}`, 14, 83);
      
      doc.setFontSize(14);
      doc.text('Salary Details', 14, 100);
      
      const tableData = [
        ['Total Days in Month', payslip.totalDaysInMonth.toString()],
        ['Days Present', payslip.daysPresent.toString()],
        ['Daily Rate', `$${payslip.dailyRate.toFixed(2)}`],
        ['Gross Salary', `$${payslip.grossSalary.toLocaleString()}`],
        ['Deductions', `$${payslip.deductions}`],
        ['Net Salary', `$${payslip.netSalary.toLocaleString()}`]
      ];
      
      doc.autoTable({
        startY: 108,
        head: [['Description', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });
      
      doc.setFontSize(10);
      doc.text(`Payslip Generated: ${payslip.payslipDate}`, 14, doc.lastAutoTable.finalY + 15);
      doc.text('HR Management System', 105, doc.lastAutoTable.finalY + 15, { align: 'center' });
      
      doc.save(`payslip_${payslip.employee.name.replace(/\s+/g, '_')}_${payslip.monthName}_${payslip.year}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-secondary mb-6">My Salary</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
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
            onClick={handleViewSalary}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View Salary
          </button>
        </div>
      </div>

      {salaryData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Employee Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{salaryData.employee.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{salaryData.employee.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Department</span>
                <span className="font-medium">{salaryData.employee.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Position</span>
                <span className="font-medium">{salaryData.employee.position || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Salary Structure</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Total Days in Month</span>
                <span className="font-medium">{salaryData.totalDaysInMonth}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Days Present</span>
                <span className="font-medium text-green-600">{salaryData.daysPresent}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Daily Rate</span>
                <span className="font-medium">${salaryData.dailySalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Gross Salary</span>
                <span className="font-medium">${salaryData.grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b bg-yellow-50 -mx-6 px-6">
                <span className="font-semibold">Net Salary</span>
                <span className="font-bold text-green-600 text-xl">${salaryData.netSalary.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              onClick={exportPDF}
              className="w-full bg-accent text-white py-3 rounded-lg hover:bg-green-600 font-medium"
            >
              Export Payslip as PDF
            </button>
          </div>
        </div>
      )}

      {!salaryData && (
        <div className="text-center py-12 text-gray-500">
          Select a month and click "View Salary" to see your salary details
        </div>
      )}
    </div>
  );
}

export default Salary;
