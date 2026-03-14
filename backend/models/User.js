const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  empId: {
    type: String,
    default: ''
  },
  empCardId: {
    type: String,
    default: ''
  },
  biometricEnabled: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  tempPassword: {
    type: String,
    default: null
  },
  isTempPassword: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'CO_ADMIN', 'HR_ADMIN', 'EMPLOYEE'],
    default: 'EMPLOYEE'
  },
  department: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  salary: {
    type: Number,
    default: 0
  },
  yearlySalaryPackage: {
    type: Number,
    default: 0
  },
  salaryAvailablePeriod: {
    type: String,
    default: 'Monthly'
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  sittingLocation: {
    type: String,
    default: ''
  },
  aadharNo: {
    type: String,
    default: ''
  },
  panNo: {
    type: String,
    default: ''
  },
  bankName: {
    type: String,
    default: ''
  },
  bankAccountNo: {
    type: String,
    default: ''
  },
  medicalInsuranceId: {
    type: String,
    default: ''
  },
  medicalInsuranceEnabled: {
    type: Boolean,
    default: false
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (this.isTempPassword && this.tempPassword) {
    return enteredPassword === this.tempPassword;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

userSchema.virtual('maskedBankAccount').get(function() {
  if (this.bankAccountNo && this.bankAccountNo.length > 4) {
    return '****' + this.bankAccountNo.slice(-4);
  }
  return '';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
