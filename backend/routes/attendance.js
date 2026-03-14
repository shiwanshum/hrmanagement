const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, hrAndAbove } = require('../middleware/auth');

const WORK_CONFIG = {
  standardInTime: '10:00',
  standardOutTime: '17:30',
  punchInStart: '08:30',
  punchInEnd: '10:30',
  halfDayCutoff: '12:00',
  autoPunchOutHour: 18,
  workingHoursPerDay: 7,
  sundayAsHoliday: true
};

router.get('/config', protect, (req, res) => {
  res.json(WORK_CONFIG);
});

router.get('/', protect, async (req, res) => {
  try {
    let attendance;
    if (['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(req.user.role)) {
      attendance = await Attendance.find().populate('employeeId', 'name email department position').sort({ date: -1 });
    } else {
      attendance = await Attendance.find({ employeeId: req.user.id }).populate('employeeId', 'name email department position').sort({ date: -1 });
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const isSunday = (date) => {
  const d = new Date(date);
  return d.getDay() === 0;
};

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const isWithinTimeWindow = (currentTime, startTime, endTime) => {
  const current = parseTime(currentTime);
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return current >= start && current <= end;
};

const getAttendanceStatus = (checkInTime) => {
  if (!checkInTime) return 'ABSENT';
  
  const punchIn = parseTime(checkInTime);
  const standardEnd = parseTime(WORK_CONFIG.punchInEnd);
  const halfDayCutoff = parseTime(WORK_CONFIG.halfDayCutoff);
  
  if (punchIn <= standardEnd) {
    return 'PRESENT';
  } else if (punchIn <= halfDayCutoff) {
    return 'HALF_DAY';
  } else {
    return 'ABSENT';
  }
};

router.post('/', protect, async (req, res) => {
  try {
    const { date, checkIn, checkOut, status, forceManual } = req.body;

    const requestedDate = new Date(date);
    
    if (WORK_CONFIG.sundayAsHoliday && isSunday(requestedDate)) {
      return res.status(400).json({ message: 'Sunday is a holiday. Cannot mark attendance on Sunday.' });
    }

    const dateStr = requestedDate.toISOString().split('T')[0];
    
    const existingAttendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: {
        $gte: new Date(dateStr + 'T00:00:00.000Z'),
        $lt: new Date(dateStr + 'T23:59:59.999Z')
      }
    });

    if (existingAttendance) {
      if (checkIn && !existingAttendance.checkIn) {
        existingAttendance.checkIn = checkIn;
        existingAttendance.status = getAttendanceStatus(checkIn);
      }
      if (checkOut) {
        existingAttendance.checkOut = checkOut;
      }
      if (status && forceManual) {
        existingAttendance.status = status;
      }
      const updated = await existingAttendance.save();
      return res.json(updated);
    }

    let attendanceStatus = status || 'PRESENT';
    
    if (checkIn) {
      attendanceStatus = getAttendanceStatus(checkIn);
    } else if (!forceManual && !status) {
      attendanceStatus = 'ABSENT';
    }

    const attendance = await Attendance.create({
      employeeId: req.user.id,
      date: new Date(dateStr + 'T00:00:00.000Z'),
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      status: attendanceStatus
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/auto-process', protect, hrAndAbove, async (req, res) => {
  try {
    const { targetDate } = req.body;
    const processDate = targetDate ? new Date(targetDate) : new Date();
    const dateStr = processDate.toISOString().split('T')[0];

    if (WORK_CONFIG.sundayAsHoliday && isSunday(processDate)) {
      return res.json({ message: 'Sunday is a holiday. Skipping auto-process.' });
    }

    const employees = await User.find({ role: 'EMPLOYEE', isActive: true });
    const results = [];

    for (const employee of employees) {
      const existingAttendance = await Attendance.findOne({
        employeeId: employee._id,
        date: {
          $gte: new Date(dateStr + 'T00:00:00.000Z'),
          $lt: new Date(dateStr + 'T23:59:59.999Z')
        }
      });

      if (!existingAttendance) {
        await Attendance.create({
          employeeId: employee._id,
          date: new Date(dateStr + 'T00:00:00.000Z'),
          checkIn: '',
          checkOut: '',
          status: 'ABSENT'
        });
        results.push({ employee: employee.name, status: 'Marked ABSENT (No punch in)' });
      } else if (existingAttendance.checkIn && !existingAttendance.checkOut) {
        existingAttendance.checkOut = WORK_CONFIG.standardOutTime;
        await existingAttendance.save();
        results.push({ employee: employee.name, status: 'Auto Punch Out at ' + WORK_CONFIG.standardOutTime });
      } else if (!existingAttendance.checkIn) {
        existingAttendance.status = 'ABSENT';
        await existingAttendance.save();
        results.push({ employee: employee.name, status: 'Marked ABSENT (Auto)' });
      }
    }

    res.json({ message: 'Auto-process completed', results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/mark-all-present', protect, hrAndAbove, async (req, res) => {
  try {
    const { date, status } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    if (WORK_CONFIG.sundayAsHoliday && isSunday(targetDate)) {
      return res.status(400).json({ message: 'Sunday is a holiday.' });
    }

    const employees = await User.find({ role: 'EMPLOYEE', isActive: true });
    const results = [];

    for (const employee of employees) {
      const existingAttendance = await Attendance.findOne({
        employeeId: employee._id,
        date: {
          $gte: new Date(dateStr + 'T00:00:00.000Z'),
          $lt: new Date(dateStr + 'T23:59:59.999Z')
        }
      });

      const attendanceStatus = status || 'PRESENT';

      if (!existingAttendance) {
        await Attendance.create({
          employeeId: employee._id,
          date: new Date(dateStr + 'T00:00:00.000Z'),
          checkIn: WORK_CONFIG.standardInTime,
          checkOut: WORK_CONFIG.standardOutTime,
          status: attendanceStatus
        });
        results.push({ employee: employee.name, status: 'Marked ' + attendanceStatus });
      } else if (!existingAttendance.checkIn) {
        existingAttendance.checkIn = WORK_CONFIG.standardInTime;
        existingAttendance.checkOut = WORK_CONFIG.standardOutTime;
        existingAttendance.status = attendanceStatus;
        await existingAttendance.save();
        results.push({ employee: employee.name, status: 'Updated to ' + attendanceStatus });
      }
    }

    res.json({ message: 'All employees processed', results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/employee/:id', protect, hrAndAbove, async (req, res) => {
  try {
    const attendance = await Attendance.find({ employeeId: req.params.id }).sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/month/:year/:month', protect, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    let attendance;
    if (['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(req.user.role)) {
      attendance = await Attendance.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('employeeId', 'name email department position salary');
    } else {
      attendance = await Attendance.find({
        employeeId: req.user.id,
        date: { $gte: startDate, $lte: endDate }
      }).populate('employeeId', 'name email department position salary');
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
