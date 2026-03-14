const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hr_management_secret_key');
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

exports.adminAndCoAdmin = (req, res, next) => {
  if (req.user && ['ADMIN', 'CO_ADMIN'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin/Co-Admin only.' });
  }
};

exports.hrAndAbove = (req, res, next) => {
  if (req.user && ['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. HR and above only.' });
  }
};

exports.hrOnly = (req, res, next) => {
  if (req.user && req.user.role === 'HR_ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. HR only.' });
  }
};

exports.employeeOnly = (req, res, next) => {
  if (req.user && req.user.role === 'EMPLOYEE') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Employee only.' });
  }
};
