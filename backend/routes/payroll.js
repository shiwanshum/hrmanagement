const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, hrAndAbove, adminOnly } = require('../middleware/auth');

const ALLOWANCES = {
  HRA: 0.1,
  DA: 0.05,
  CONVEYANCE: 0.02,
  SPECIAL_ALLOWANCE: 0.03
};

const DEDUCTIONS = {
  PF: 0.12,
  ESIC: 0.0475,
  TDS: 0.1
};

router.get('/', protect, async (req, res) => {
  try {
    let payrolls;
    if (['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(req.user.role)) {
      payrolls = await Payroll.find()
        .populate('employeeId', 'name email department position')
        .sort({ year: -1, month: -1 });
    } else {
      payrolls = await Payroll.find({ employeeId: req.user.id })
        .populate('employeeId', 'name email department position')
        .sort({ year: -1, month: -1 });
    }
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calculate', protect, hrAndAbove, async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const totalDays = endDate.getDate();

    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
    const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
    const leaveDays = attendance.filter(a => a.status === 'LEAVE').length;

    const basicSalary = employee.salary;
    const hra = Math.round(basicSalary * ALLOWANCES.HRA);
    const da = Math.round(basicSalary * ALLOWANCES.DA);
    const conveyance = Math.round(basicSalary * ALLOWANCES.CONVEYANCE);
    const specialAllowance = Math.round(basicSalary * ALLOWANCES.SPECIAL_ALLOWANCE);
    const totalEarnings = basicSalary + hra + da + conveyance + specialAllowance;

    const dailyRate = basicSalary / totalDays;
    const actualBasicSalary = Math.round(dailyRate * presentDays);
    const actualHra = Math.round(actualBasicSalary * ALLOWANCES.HRA);
    const actualDa = Math.round(actualBasicSalary * ALLOWANCES.DA);
    const actualConveyance = Math.round(actualBasicSalary * ALLOWANCES.CONVEYANCE);
    const actualSpecialAllowance = Math.round(actualBasicSalary * ALLOWANCES.SPECIAL_ALLOWANCE);
    const actualTotalEarnings = actualBasicSalary + actualHra + actualDa + actualConveyance + actualSpecialAllowance;

    const pf = Math.round(actualBasicSalary * DEDUCTIONS.PF);
    const esic = Math.round(actualBasicSalary * DEDUCTIONS.ESIC);
    const tds = Math.round(actualBasicSalary * DEDUCTIONS.TDS);
    const totalDeductions = pf + esic + tds;

    const grossSalary = actualTotalEarnings;
    const netSalary = grossSalary - totalDeductions;

    const payrollData = {
      employeeId,
      month: parseInt(month),
      year: parseInt(year),
      basicSalary: actualBasicSalary,
      hra: actualHra,
      da: actualDa,
      conveyance: actualConveyance,
      specialAllowance: actualSpecialAllowance,
      otherEarnings: 0,
      totalEarnings: actualTotalEarnings,
      pf,
      esic,
      tds,
      otherDeductions: 0,
      totalDeductions,
      grossSalary,
      netSalary,
      workingDays: totalDays,
      presentDays,
      absentDays,
      leaveDays,
      overtimeHours: 0,
      overtimeAmount: 0,
      status: 'DRAFT'
    };

    const existingPayroll = await Payroll.findOne({ employeeId, month, year });
    let payroll;
    if (existingPayroll) {
      payroll = await Payroll.findByIdAndUpdate(existingPayroll._id, payrollData, { new: true });
    } else {
      payroll = await Payroll.create(payrollData);
    }

    await payroll.populate('employeeId', 'name email department position');

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/generate-all', protect, hrAndAbove, async (req, res) => {
  try {
    const { month, year } = req.body;

    const employees = await User.find({ role: 'EMPLOYEE', isActive: true });
    const payrolls = [];

    for (const employee of employees) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const totalDays = endDate.getDate();

      const attendance = await Attendance.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
      const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
      const leaveDays = attendance.filter(a => a.status === 'LEAVE').length;

      const basicSalary = employee.salary;
      const dailyRate = basicSalary / totalDays;
      const actualBasicSalary = Math.round(dailyRate * presentDays);
      const actualHra = Math.round(actualBasicSalary * ALLOWANCES.HRA);
      const actualDa = Math.round(actualBasicSalary * ALLOWANCES.DA);
      const actualConveyance = Math.round(actualBasicSalary * ALLOWANCES.CONVEYANCE);
      const actualSpecialAllowance = Math.round(actualBasicSalary * ALLOWANCES.SPECIAL_ALLOWANCE);
      const actualTotalEarnings = actualBasicSalary + actualHra + actualDa + actualConveyance + actualSpecialAllowance;

      const pf = Math.round(actualBasicSalary * DEDUCTIONS.PF);
      const esic = Math.round(actualBasicSalary * DEDUCTIONS.ESIC);
      const tds = Math.round(actualBasicSalary * DEDUCTIONS.TDS);
      const totalDeductions = pf + esic + tds;

      const payrollData = {
        employeeId: employee._id,
        month: parseInt(month),
        year: parseInt(year),
        basicSalary: actualBasicSalary,
        hra: actualHra,
        da: actualDa,
        conveyance: actualConveyance,
        specialAllowance: actualSpecialAllowance,
        otherEarnings: 0,
        totalEarnings: actualTotalEarnings,
        pf,
        esic,
        tds,
        otherDeductions: 0,
        totalDeductions,
        grossSalary: actualTotalEarnings,
        netSalary: actualTotalEarnings - totalDeductions,
        workingDays: totalDays,
        presentDays,
        absentDays,
        leaveDays,
        overtimeHours: 0,
        overtimeAmount: 0,
        status: 'DRAFT'
      };

      const existingPayroll = await Payroll.findOne({ employeeId: employee._id, month, year });
      if (existingPayroll) {
        const updated = await Payroll.findByIdAndUpdate(existingPayroll._id, payrollData, { new: true });
        payrolls.push(updated);
      } else {
        const created = await Payroll.create(payrollData);
        payrolls.push(created);
      }
    }

    await Payroll.populate(payrolls, { path: 'employeeId', select: 'name email department position' });

    res.json({ message: `Generated payroll for ${payrolls.length} employees`, payrolls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/status', protect, hrAndAbove, async (req, res) => {
  try {
    const { status, paymentDate } = req.body;
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }

    payroll.status = status;
    if (status === 'PAID') {
      payroll.paymentDate = paymentDate || new Date();
    }
    await payroll.save();
    await payroll.populate('employeeId', 'name email department position');

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate('employeeId', 'name email department position phone address');
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/employee/:employeeId', protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = { employeeId: req.params.employeeId };
    
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }

    const payrolls = await Payroll.find(query).sort({ year: -1, month: -1 });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
