import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext, API_URL } from '../App';

const WORK_CONFIG = {
  standardInTime: '10:00',
  standardOutTime: '17:30',
  punchInStart: '08:30',
  punchInEnd: '10:30',
  halfDayCutoff: '12:00',
  autoPunchOutHour: 18,
  sundayAsHoliday: true
};

function Attendance() {
  const { user } = useContext(AuthContext);
  const [attendance, setAttendance] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    status: 'PRESENT'
  });
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchAttendance();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(data);
      
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = data.find(att => {
        const attDate = new Date(att.date).toISOString().split('T')[0];
        return attDate === today;
      });
      setTodayAttendance(todayRecord);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'checkIn' && value) {
        const [hours] = value.split(':').map(Number);
        if (hours >= 10 && hours < 12) {
          newData.status = 'HALF_DAY';
        } else if (hours >= 12) {
          newData.status = 'ABSENT';
        } else {
          newData.status = 'PRESENT';
        }
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedDate = new Date(formData.date);
    if (WORK_CONFIG.sundayAsHoliday && selectedDate.getDay() === 0) {
      alert('Sunday is a holiday. Cannot mark attendance on Sunday.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/attendance`, { ...formData, forceManual: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance();
      alert('Attendance marked successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error marking attendance');
    }
    setLoading(false);
  };

  const punchIn = async () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const [hours, minutes] = currentTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    const punchInEnd = parseInt(WORK_CONFIG.punchInEnd.split(':')[0]) * 60 + 30;
    const halfDayCutoff = parseInt(WORK_CONFIG.halfDayCutoff.split(':')[0]) * 60;
    const currentDate = now.toISOString().split('T')[0];

    if (now.getDay() === 0) {
      alert('Sunday is a holiday. Cannot punch in on Sunday.');
      return;
    }

    if (currentMinutes < parseInt(WORK_CONFIG.punchInStart.split(':')[0]) * 60) {
      alert(`Punch in allowed from ${WORK_CONFIG.punchInStart} AM onwards.`);
      return;
    }

    let status = 'PRESENT';
    if (currentMinutes > punchInEnd && currentMinutes <= halfDayCutoff) {
      status = 'HALF_DAY';
      alert(`Punch in after ${WORK_CONFIG.punchInEnd} AM will be marked as HALF DAY`);
    } else if (currentMinutes > halfDayCutoff) {
      status = 'ABSENT';
      alert(`Punch in after ${WORK_CONFIG.halfDayCutoff} PM will be marked as ABSENT`);
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/attendance`, {
        date: currentDate,
        checkIn: currentTime,
        status: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance();
      alert(`Punched in at ${currentTime} - Status: ${status}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error punching in');
    }
    setLoading(false);
  };

  const punchOut = async () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDate = now.toISOString().split('T')[0];

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/attendance`, {
        date: currentDate,
        checkOut: currentTime,
        status: todayAttendance?.status || 'PRESENT'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance();
      alert(`Punched out at ${currentTime}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error punching out');
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-700';
      case 'HALF_DAY': return 'bg-yellow-100 text-yellow-700';
      case 'ABSENT': return 'bg-red-100 text-red-700';
      case 'LEAVE': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isAdmin = ['ADMIN', 'CO_ADMIN', 'HR_ADMIN'].includes(user?.role);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isSunday = (date) => {
    return new Date(date).getDay() === 0;
  };

  const markAllPresent = async () => {
    if (!confirm('This will mark all active employees as present for today. Continue?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/attendance/mark-all-present`, { date: new Date().toISOString().split('T')[0] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance();
      alert('All employees marked present!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error marking attendance');
    }
    setLoading(false);
  };

  const getClockHandRotation = (date, type) => {
    if (type === 'hour') {
      return (date.getHours() % 12) * 30 + date.getMinutes() * 0.5;
    } else if (type === 'minute') {
      return date.getMinutes() * 6;
    } else {
      return date.getSeconds() * 6;
    }
  };

  const today = new Date();
  const isTodaySunday = isSunday(today);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1E293B' }}>
        {isAdmin ? 'Attendance Management' : 'My Attendance'}
      </h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-800 mb-2">Working Hours Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
          <div><span className="font-medium">Punch In:</span> {WORK_CONFIG.punchInStart} AM - {WORK_CONFIG.punchInEnd} AM</div>
          <div><span className="font-medium">Half Day After:</span> {WORK_CONFIG.halfDayCutoff} PM</div>
          <div><span className="font-medium">Standard Out:</span> {WORK_CONFIG.standardOutTime} (5:30 PM)</div>
          <div><span className="font-medium">Sunday:</span> Holiday</div>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          <p>• Punch In 8:30 AM - 10:30 AM = <strong>FULL DAY</strong></p>
          <p>• Punch In 10:31 AM - 12:00 PM = <strong>HALF DAY</strong></p>
          <p>• Punch In After 12:00 PM = <strong>ABSENT</strong></p>
        </div>
      </div>

      {isTodaySunday && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Note:</strong> Today is Sunday. No attendance can be marked as it's a holiday.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4 text-center">Digital Clock</h2>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold" style={{ color: '#2563EB', fontSize: '2.5rem' }}>{formatTime(currentTime)}</p>
            <p className="text-gray-500 mt-2">{formatDate(currentTime)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4 text-center">Analog Clock</h2>
          <div className="flex justify-center">
            <div className="relative w-40 h-40 rounded-full border-4" style={{ borderColor: '#2563EB', backgroundColor: '#f9fafb' }}>
              <div 
                className="absolute bottom-1/2 left-1/2 w-1 h-12 bg-gray-800 origin-bottom rounded"
                style={{ transform: `translateX(-50%) rotate(${getClockHandRotation(currentTime, 'hour')}deg)` }}
              />
              <div 
                className="absolute bottom-1/2 left-1/2 w-0.5 h-16 bg-gray-600 origin-bottom rounded"
                style={{ transform: `translateX(-50%) rotate(${getClockHandRotation(currentTime, 'minute')}deg)` }}
              />
              <div 
                className="absolute bottom-1/2 left-1/2 w-0.5 h-18 bg-red-500 origin-bottom rounded"
                style={{ transform: `translateX(-50%) rotate(${getClockHandRotation(currentTime, 'second')}deg)` }}
              />
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-gray-800 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">Quick Clock In/Out</h2>
          
          {isTodaySunday ? (
            <div className="text-center text-red-500">
              <p>Sunday is a holiday</p>
            </div>
          ) : todayAttendance ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Check In:</span>
                  <span className="font-medium">{todayAttendance.checkIn || 'Not punched in'}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Check Out:</span>
                  <span className="font-medium">{todayAttendance.checkOut || 'Not punched out'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {!todayAttendance.checkIn ? (
                  <button
                    onClick={punchIn}
                    disabled={loading}
                    className="bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
                  >
                    Punch In
                  </button>
                ) : (
                  <button disabled className="bg-green-500 text-white py-3 rounded-lg opacity-50 cursor-not-allowed font-medium">
                    Punch In
                  </button>
                )}
                
                {todayAttendance.checkIn && !todayAttendance.checkOut ? (
                  <button
                    onClick={punchOut}
                    disabled={loading}
                    className="bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium"
                  >
                    Punch Out
                  </button>
                ) : (
                  <button disabled className="bg-red-500 text-white py-3 rounded-lg opacity-50 cursor-not-allowed font-medium">
                    Punch Out
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={punchIn}
              disabled={loading}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
            >
              Punch In Now
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">Today's Status</h2>
          {todayAttendance ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <span className={`px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(todayAttendance.status)}`}>
                  {todayAttendance.status === 'HALF_DAY' ? 'HALF DAY' : todayAttendance.status}
                </span>
              </div>
              <div className="text-center text-sm text-gray-500">
                <p>Check In: {todayAttendance.checkIn || 'N/A'}</p>
                <p>Check Out: {todayAttendance.checkOut || 'N/A'}</p>
              </div>
            </div>
          ) : isTodaySunday ? (
            <div className="text-center text-red-500">
              <p>Holiday</p>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p>No attendance marked today</p>
              <p className="text-sm mt-2">Punch in to mark your attendance</p>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Admin Actions</h2>
            <button
              onClick={markAllPresent}
              disabled={loading || isTodaySunday}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Mark All Present (Today)
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4">Manual Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                >
                  <option value="PRESENT">Present (Full Day)</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Check In Time</label>
                <input
                  type="time"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">8:30-10:30 = Full Day, 10:31-12:00 = Half Day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Check Out Time</label>
                <input
                  type="time"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">Week Summary</h2>
          {(() => {
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              last7Days.push(d);
            }
            
            return (
              <div className="space-y-2">
                {last7Days.map(date => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayRecord = attendance.find(att => {
                    const attDate = new Date(att.date).toISOString().split('T')[0];
                    return attDate === dateStr;
                  });
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const isSun = date.getDay() === 0;
                  
                  return (
                    <div key={dateStr} className="flex items-center justify-between p-2 rounded bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-8">{dayName}</span>
                        <span className="text-sm">{dayNum}</span>
                        {isSun && <span className="text-xs text-red-500">(H)</span>}
                      </div>
                      {isSun ? (
                        <span className="text-xs text-red-500">Holiday</span>
                      ) : dayRecord ? (
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(dayRecord.status)}`}>
                          {dayRecord.status === 'HALF_DAY' ? 'HALF' : dayRecord.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Attendance History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours Worked</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendance.map((att) => {
                let hoursWorked = '-';
                if (att.checkIn && att.checkOut) {
                  const [inH, inM] = att.checkIn.split(':').map(Number);
                  const [outH, outM] = att.checkOut.split(':').map(Number);
                  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = totalMinutes % 60;
                  hoursWorked = `${hours}h ${mins}m`;
                }
                
                return (
                  <tr key={att._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(att.date).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm font-medium">
                        {att.employeeId?.name || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">{att.checkIn || '-'}</td>
                    <td className="px-4 py-3 text-sm">{att.checkOut || '-'}</td>
                    <td className="px-4 py-3 text-sm">{hoursWorked}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(att.status)}`}>
                        {att.status === 'HALF_DAY' ? 'HALF DAY' : att.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {attendance.length === 0 && (
            <div className="text-center py-8 text-gray-500">No attendance records found</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Attendance;
