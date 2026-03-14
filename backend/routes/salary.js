const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, hrAndAbove } = require('../middleware/auth');

router.get('/:employeeId', protect, async (req, res) => {
  try {
    const { year, month } = req.query;
    const employee = await User.findById(req.params.employeeId).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      employeeId: req.params.employeeId,
      date: { $gte: startDate, $lte: endDate },
      status: 'PRESENT'
    });

    const daysPresent = attendance.length;
    const totalDaysInMonth = endDate.getDate();
    const dailySalary = employee.salary / totalDaysInMonth;
    const calculatedSalary = dailySalary * daysPresent;

    res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        salary: employee.salary
      },
      month: parseInt(month),
      year: parseInt(year),
      totalDaysInMonth,
      daysPresent,
      dailySalary,
      grossSalary: employee.salary,
      netSalary: Math.round(calculatedSalary * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:employeeId/payslip/:year/:month', protect, async (req, res) => {
  try {
    const { year, month } = req.params;
    const employee = await User.findById(req.params.employeeId).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      employeeId: req.params.employeeId,
      date: { $gte: startDate, $lte: endDate },
      status: 'PRESENT'
    });

    const daysPresent = attendance.length;
    const totalDaysInMonth = endDate.getDate();
    const dailySalary = employee.salary / totalDaysInMonth;
    const netSalary = Math.round(dailySalary * daysPresent * 100) / 100;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    res.json({
      employee: {
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        joinDate: employee.joinDate
      },
      payslipDate: new Date().toISOString().split('T')[0],
      monthName: monthNames[parseInt(month) - 1],
      year: parseInt(year),
      totalDaysInMonth,
      daysPresent,
      dailyRate: dailySalary,
      grossSalary: employee.salary,
      deductions: 0,
      netSalary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
