require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

console.log('Loading routes...');
const authRoutes = require('./routes/auth');
console.log('authRoutes:', typeof authRoutes);
const employeeRoutes = require('./routes/employees');
console.log('employeeRoutes:', typeof employeeRoutes);
const attendanceRoutes = require('./routes/attendance');
console.log('attendanceRoutes:', typeof attendanceRoutes);
const salaryRoutes = require('./routes/salary');
console.log('salaryRoutes:', typeof salaryRoutes);
const payrollRoutes = require('./routes/payroll');
console.log('payrollRoutes:', typeof payrollRoutes);

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'HR Management System API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
