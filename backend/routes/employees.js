const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, hrAndAbove, adminOnly, adminAndCoAdmin } = require('../middleware/auth');

const ROLES = {
  ADMIN: 'ADMIN',
  CO_ADMIN: 'CO_ADMIN',
  HR_ADMIN: 'HR_ADMIN',
  EMPLOYEE: 'EMPLOYEE'
};

router.get('/', protect, async (req, res) => {
  try {
    let users;
    if (['ADMIN', 'CO_ADMIN'].includes(req.user.role)) {
      users = await User.find().select('-password -tempPassword').sort({ createdAt: -1 });
    } else if (req.user.role === 'HR_ADMIN') {
      users = await User.find({ role: { $ne: 'ADMIN' } }).select('-password -tempPassword').sort({ createdAt: -1 });
    } else {
      users = await User.find({ role: 'EMPLOYEE' }).select('-password -tempPassword').sort({ createdAt: -1 });
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, hrAndAbove, async (req, res) => {
  try {
    const {
      name, email, password, role, department, position, salary, phone, address, joinDate, tempPassword,
      empId, empCardId, biometricEnabled, yearlySalaryPackage, salaryAvailablePeriod,
      sittingLocation, aadharNo, panNo, bankName, bankAccountNo, medicalInsuranceId, medicalInsuranceEnabled
    } = req.body;

    if (req.user.role !== 'ADMIN' && role === 'ADMIN') {
      return res.status(403).json({ message: 'Only Admin can create Admin users' });
    }

    if (req.user.role === 'HR_ADMIN' && ['ADMIN', 'CO_ADMIN'].includes(role)) {
      return res.status(403).json({ message: 'HR cannot create Admin or Co-Admin users' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let generatedTempPassword = tempPassword;
    if (!generatedTempPassword) {
      generatedTempPassword = Math.random().toString(36).slice(-6);
    }

    const user = await User.create({
      name,
      email,
      password,
      tempPassword: generatedTempPassword,
      isTempPassword: true,
      role: role || 'EMPLOYEE',
      department: department || '',
      position: position || '',
      salary: salary || 0,
      yearlySalaryPackage: yearlySalaryPackage || 0,
      salaryAvailablePeriod: salaryAvailablePeriod || 'Monthly',
      phone: phone || '',
      address: address || '',
      joinDate: joinDate || Date.now(),
      empId: empId || '',
      empCardId: empCardId || '',
      biometricEnabled: biometricEnabled || false,
      sittingLocation: sittingLocation || '',
      aadharNo: aadharNo || '',
      panNo: panNo || '',
      bankName: bankName || '',
      bankAccountNo: bankAccountNo || '',
      medicalInsuranceId: medicalInsuranceId || '',
      medicalInsuranceEnabled: medicalInsuranceEnabled || false
    });

    const userData = user.toObject();
    delete userData.password;
    delete userData.tempPassword;

    res.status(201).json({
      ...userData,
      tempPassword: generatedTempPassword
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/roles', protect, hrAndAbove, (req, res) => {
  const availableRoles = req.user.role === 'ADMIN' 
    ? Object.values(ROLES)
    : req.user.role === 'CO_ADMIN'
      ? [ROLES.CO_ADMIN, ROLES.HR_ADMIN, ROLES.EMPLOYEE]
      : [ROLES.HR_ADMIN, ROLES.EMPLOYEE];
  
  res.json(availableRoles);
});

router.get('/departments', protect, async (req, res) => {
  const departments = [
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
  res.json(departments);
});

router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -tempPassword');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const {
      name, department, position, salary, phone, address, isActive,
      empId, empCardId, biometricEnabled, yearlySalaryPackage, salaryAvailablePeriod,
      sittingLocation, aadharNo, panNo, bankName, bankAccountNo, medicalInsuranceId, medicalInsuranceEnabled
    } = req.body;
    
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'EMPLOYEE') {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      targetUser.name = name || targetUser.name;
      targetUser.phone = phone || targetUser.phone;
      targetUser.address = address || targetUser.address;
    } else if (req.user.role === 'HR_ADMIN') {
      if (targetUser.role === 'ADMIN' || targetUser.role === 'CO_ADMIN') {
        return res.status(403).json({ message: 'Not authorized to modify this user' });
      }
      targetUser.name = name || targetUser.name;
      targetUser.department = department || targetUser.department;
      targetUser.position = position || targetUser.position;
      targetUser.salary = salary ?? targetUser.salary;
      targetUser.phone = phone || targetUser.phone;
      targetUser.address = address || targetUser.address;
      targetUser.empId = empId ?? targetUser.empId;
      targetUser.empCardId = empCardId ?? targetUser.empCardId;
      targetUser.biometricEnabled = biometricEnabled ?? targetUser.biometricEnabled;
      targetUser.yearlySalaryPackage = yearlySalaryPackage ?? targetUser.yearlySalaryPackage;
      targetUser.salaryAvailablePeriod = salaryAvailablePeriod || targetUser.salaryAvailablePeriod;
      targetUser.sittingLocation = sittingLocation || targetUser.sittingLocation;
      targetUser.aadharNo = aadharNo || targetUser.aadharNo;
      targetUser.panNo = panNo || targetUser.panNo;
      targetUser.bankName = bankName || targetUser.bankName;
      targetUser.bankAccountNo = bankAccountNo || targetUser.bankAccountNo;
      targetUser.medicalInsuranceId = medicalInsuranceId || targetUser.medicalInsuranceId;
      targetUser.medicalInsuranceEnabled = medicalInsuranceEnabled ?? targetUser.medicalInsuranceEnabled;
    } else {
      targetUser.name = name || targetUser.name;
      targetUser.department = department || targetUser.department;
      targetUser.position = position || targetUser.position;
      targetUser.salary = salary ?? targetUser.salary;
      targetUser.phone = phone || targetUser.phone;
      targetUser.address = address || targetUser.address;
      targetUser.empId = empId ?? targetUser.empId;
      targetUser.empCardId = empCardId ?? targetUser.empCardId;
      targetUser.biometricEnabled = biometricEnabled ?? targetUser.biometricEnabled;
      targetUser.yearlySalaryPackage = yearlySalaryPackage ?? targetUser.yearlySalaryPackage;
      targetUser.salaryAvailablePeriod = salaryAvailablePeriod || targetUser.salaryAvailablePeriod;
      targetUser.sittingLocation = sittingLocation || targetUser.sittingLocation;
      targetUser.aadharNo = aadharNo || targetUser.aadharNo;
      targetUser.panNo = panNo || targetUser.panNo;
      targetUser.bankName = bankName || targetUser.bankName;
      targetUser.bankAccountNo = bankAccountNo || targetUser.bankAccountNo;
      targetUser.medicalInsuranceId = medicalInsuranceId || targetUser.medicalInsuranceId;
      targetUser.medicalInsuranceEnabled = medicalInsuranceEnabled ?? targetUser.medicalInsuranceEnabled;
      if (isActive !== undefined) {
        targetUser.isActive = isActive;
      }
    }

    const updatedUser = await targetUser.save();
    const userData = updatedUser.toObject();
    delete userData.password;
    delete userData.tempPassword;

    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/toggle-status', protect, adminAndCoAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot modify admin status' });
    }

    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/reset-password', protect, hrAndAbove, async (req, res) => {
  try {
    const { newTempPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const generatedPassword = newTempPassword || Math.random().toString(36).slice(-6);
    user.tempPassword = generatedPassword;
    user.isTempPassword = true;
    await user.save();

    res.json({ 
      message: 'Password reset to temporary password',
      tempPassword: generatedPassword 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
