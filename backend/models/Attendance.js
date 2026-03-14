const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: String,
    default: ''
  },
  checkOut: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LEAVE'],
    default: 'PRESENT'
  }
}, {
  timestamps: true
});

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
