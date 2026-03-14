# HR Management System - Specification Document

## 1. Project Overview

- **Project Name**: HR Management System
- **Type**: Full-stack Web Application (React + Node.js + MongoDB)
- **Core Functionality**: Comprehensive HR management system with employee management, attendance tracking, salary calculation, and payslip generation
- **Target Users**: HR Team Members and Employees

## 2. Technology Stack

### Frontend
- React 18 with Vite
- React Router v6 for navigation
- Axios for API calls
- Tailwind CSS for styling
- jsPDF for PDF generation

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- cors for cross-origin requests

### Database
- MongoDB in Docker container (docker-compose)

## 3. UI/UX Specification

### Color Palette
- Primary: #2563EB (Blue)
- Secondary: #1E293B (Dark Slate)
- Accent: #10B981 (Green)
- Background: #F8FAFC (Light Gray)
- White: #FFFFFF
- Error: #EF4444 (Red)
- Success: #22C55E (Green)

### Typography
- Font Family: Inter, system-ui, sans-serif
- Headings: Bold, 24px-32px
- Body: Regular, 14px-16px

### Layout
- Responsive sidebar navigation
- Header with user info and logout
- Main content area with cards
- Login page centered form

### Pages
1. **Login Page** - HR and Employee login
2. **Signup Page** - HR team registration (HR only)
3. **Dashboard** - Overview for HR and Employee
4. **Employee Management** - Add/Edit/List employees (HR only)
5. **Employee Profile** - View/Edit employee details
6. **Attendance** - Mark attendance with date/time
7. **Salary** - View salary structure and payslip
8. **Payslip PDF Export**

## 4. Functionality Specification

### 4.1 Authentication System
- HR can register and login
- Employees can login only (HR creates employee accounts)
- JWT-based authentication
- Role-based access (HR_ADMIN, EMPLOYEE)

### 4.2 Employee Management (HR Only)
- Add new employee with:
  - Name, Email, Phone, Address
  - Department (dropdown)
  - Position/Designation
  - Salary (monthly)
  - Date of joining
- View list of all employees
- Edit employee details
- Delete employee

### 4.3 Employee Profile
- View personal details
- View work information (department, position, join date)
- View salary structure

### 4.4 Attendance System
- Employees can mark attendance:
  - Date selection
  - Check-in time
  - Check-out time
- View attendance history
- HR can view all employees' attendance

### 4.5 Salary Calculation
- Calculate salary based on:
  - Monthly base salary
  - Days present / Total working days
  - Formula: (Monthly Salary / Total Days) * Days Present

### 4.6 Payslip Generation
- Generate monthly payslip with:
  - Employee details
  - Department & Position
  - Days present
  - Gross salary
  - Deductions (if any)
  - Net salary
- Export as PDF

## 5. Database Schema

### User Collection
```
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (HR_ADMIN | EMPLOYEE),
  department: String,
  position: String,
  salary: Number,
  phone: String,
  address: String,
  joinDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Collection
```
{
  _id: ObjectId,
  employeeId: ObjectId (ref: User),
  date: Date,
  checkIn: String,
  checkOut: String,
  status: String (PRESENT | ABSENT | LEAVE),
  createdAt: Date
}
```

## 6. API Endpoints

### Auth
- POST /api/auth/signup (HR only)
- POST /api/auth/login

### Employees
- GET /api/employees (HR only)
- POST /api/employees (HR only)
- GET /api/employees/:id
- PUT /api/employees/:id (HR only)
- DELETE /api/employees/:id (HR only)

### Attendance
- GET /api/attendance (own or all for HR)
- POST /api/attendance
- GET /api/attendance/employee/:id (HR only)

### Salary
- GET /api/salary/:employeeId
- GET /api/salary/:employeeId/payslip/:month

## 7. Docker Configuration

### docker-compose.yml
- MongoDB service on port 27017
- Volume for data persistence
- Environment variables for MongoDB

## 8. Acceptance Criteria

1. ✅ HR can register and login
2. ✅ Employees can login with credentials provided by HR
3. ✅ HR can add new employees with all details
4. ✅ HR can view/edit/delete employees
5. ✅ Employees can view their profile
6. ✅ Employees can mark attendance with date and time
7. ✅ Salary calculated based on days present
8. ✅ Payslip can be exported as PDF
9. ✅ MongoDB runs in Docker container
10. ✅ Application is responsive and user-friendly
