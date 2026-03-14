import express  from 'express';
import mysql    from 'mysql2/promise';
import cors     from 'cors';
import path     from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = 3000;

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // serves index2.html from same folder
app.get('/', (req, res) => {
  res.sendFile(new URL('./index2.html', import.meta.url).pathname);
});
// ── DATABASE CONNECTION ────────────────────────────────────────────────────
const db = await mysql.createConnection({
  host:     'yamabiko.proxy.rlwy.net',
  user:     'root',
  port:     16086,
  password: 'bQqtpwdNOgPYgcVbbsTMcNxkCrAzDOou',
  database: 'dmrc_payroll',
});
console.log('✅ Database connected successfully');


// ════════════════════════════════════════════════════════════════
//  EMPLOYEES  →  Employee_Info table
//  Columns: emp_id, full_name, dob, contact_no, dept_id, station_id
// ════════════════════════════════════════════════════════════════

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        emp_id      AS id,
        full_name   AS name,
        dob,
        contact_no,
        dept_id     AS deptId,
        station_id  AS stationId
      FROM Employee_Info
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/employees:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET single employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        emp_id      AS id,
        full_name   AS name,
        dob,
        contact_no,
        dept_id     AS deptId,
        station_id  AS stationId
      FROM Employee_Info
      WHERE emp_id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /api/employees/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADD new employee
app.post('/api/employees', async (req, res) => {
  const { id, name, dob, contact_no, deptId, stationId } = req.body;
  try {
    await db.execute(`
      INSERT INTO Employee_Info (emp_id, full_name, dob, contact_no, dept_id, station_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, name, dob, contact_no || null, deptId, stationId]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /api/employees:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE employee
app.put('/api/employees/:id', async (req, res) => {
  const { name, dob, contact_no, deptId, stationId } = req.body;
  try {
    await db.execute(`
      UPDATE Employee_Info
      SET full_name=?, dob=?, contact_no=?, dept_id=?, station_id=?
      WHERE emp_id=?
    `, [name, dob, contact_no || null, deptId, stationId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /api/employees/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    // Delete related payroll records first (foreign key safety)
    await db.execute(`DELETE FROM Payroll_Final WHERE emp_id = ?`, [req.params.id]);
    await db.execute(`DELETE FROM attendance_logs WHERE emp_id = ?`, [req.params.id]);
    await db.execute(`DELETE FROM Employee_Info WHERE emp_id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE /api/employees/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  DEPARTMENTS  →  Departments table
//  Columns: dept_id, dept_name, base_salary, ot_rate_hourly
// ════════════════════════════════════════════════════════════════

// GET all departments
app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        dept_id       AS id,
        dept_name     AS name,
        base_salary   AS basePay,
        ot_rate_hourly AS otRate
      FROM Departments
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/departments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADD department
app.post('/api/departments', async (req, res) => {
  const { id, name, basePay, otRate } = req.body;
  try {
    await db.execute(`
      INSERT INTO Departments (dept_id, dept_name, base_salary, ot_rate_hourly)
      VALUES (?, ?, ?, ?)
    `, [id, name, basePay, otRate || 0]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /api/departments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE department
app.put('/api/departments/:id', async (req, res) => {
  const { name, basePay, otRate } = req.body;
  try {
    await db.execute(`
      UPDATE Departments
      SET dept_name=?, base_salary=?, ot_rate_hourly=?
      WHERE dept_id=?
    `, [name, basePay, otRate || 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /api/departments/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  STATIONS  →  Stations table
//  Columns: station_id, station_name, station_type, allowance_multiplier, line
// ════════════════════════════════════════════════════════════════

// GET all stations
app.get('/api/stations', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        station_id            AS id,
        station_name          AS name,
        station_type          AS type,
        allowance_multiplier  AS multiplier,
        line
      FROM Stations
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/stations:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  PAYROLL  →  Payroll_Final table
//  Columns: payroll_id, emp_id, month_year, gross_salary, net_salary, calculation_date
// ════════════════════════════════════════════════════════════════

// GET all payroll records (with employee name joined)
app.get('/api/payroll', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        p.payroll_id,
        p.emp_id,
        e.full_name,
        p.month_year,
        p.gross_salary,
        p.net_salary,
        p.calculation_date
      FROM Payroll_Final p
      LEFT JOIN Employee_Info e ON p.emp_id = e.emp_id
      ORDER BY p.calculation_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/payroll:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET payroll for a specific employee
app.get('/api/payroll/:empId', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT * FROM Payroll_Final
      WHERE emp_id = ?
      ORDER BY calculation_date DESC
    `, [req.params.empId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/payroll/:empId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADD payroll record
app.post('/api/payroll', async (req, res) => {
  const { payroll_id, emp_id, month_year, gross_salary, net_salary } = req.body;
  try {
    await db.execute(`
      INSERT INTO Payroll_Final (payroll_id, emp_id, month_year, gross_salary, net_salary)
      VALUES (?, ?, ?, ?, ?)
    `, [payroll_id, emp_id, month_year, gross_salary, net_salary]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /api/payroll:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  ATTENDANCE  →  attendance_logs table
//  Columns: log_id, emp_id, month_year, days_worked, ot_hours, leaves_taken
// ════════════════════════════════════════════════════════════════

// GET all attendance logs (with employee name)
app.get('/api/attendance', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        a.log_id,
        a.emp_id,
        e.full_name,
        a.month_year,
        a.days_worked,
        a.ot_hours,
        a.leaves_taken
      FROM attendance_logs a
      LEFT JOIN Employee_Info e ON a.emp_id = e.emp_id
      ORDER BY a.month_year DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/attendance:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET attendance for specific employee
app.get('/api/attendance/:empId', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT * FROM attendance_logs
      WHERE emp_id = ?
      ORDER BY month_year DESC
    `, [req.params.empId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/attendance/:empId:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADD attendance record
app.post('/api/attendance', async (req, res) => {
  const { log_id, emp_id, month_year, days_worked, ot_hours, leaves_taken } = req.body;
  try {
    await db.execute(`
      INSERT INTO attendance_logs (log_id, emp_id, month_year, days_worked, ot_hours, leaves_taken)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [log_id, emp_id, month_year, days_worked || 0, ot_hours || 0, leaves_taken || 0]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /api/attendance:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE attendance record
app.put('/api/attendance/:logId', async (req, res) => {
  const { days_worked, ot_hours, leaves_taken } = req.body;
  try {
    await db.execute(`
      UPDATE attendance_logs
      SET days_worked=?, ot_hours=?, leaves_taken=?
      WHERE log_id=?
    `, [days_worked, ot_hours, leaves_taken, req.params.logId]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ PUT /api/attendance/:logId:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  USERS  →  users table
//  Columns: email_id, password
// ════════════════════════════════════════════════════════════════

// LOGIN check
app.post('/api/login', async (req, res) => {
  const { email_id, password } = req.body;
  try {
    const [rows] = await db.execute(`
      SELECT * FROM users WHERE email_id = ? AND password = ?
    `, [email_id, password]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ success: true, email: rows[0].email_id });
  } catch (err) {
    console.error('❌ POST /api/login:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// REGISTER new user
app.post('/api/register', async (req, res) => {
  const { email_id, password } = req.body;
  try {
    await db.execute(`
      INSERT INTO users (email_id, password) VALUES (?, ?)
    `, [email_id, password]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ POST /api/register:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  DASHBOARD SUMMARY  →  combined stats in one call
// ════════════════════════════════════════════════════════════════

app.get('/api/summary', async (req, res) => {
  try {
    const [[{ totalEmployees }]] = await db.execute(`SELECT COUNT(*) AS totalEmployees FROM Employee_Info`);
    const [[{ totalDepts }]]     = await db.execute(`SELECT COUNT(*) AS totalDepts FROM Departments`);
    const [[{ totalStations }]]  = await db.execute(`SELECT COUNT(*) AS totalStations FROM Stations`);
    const [[{ totalPayroll }]]   = await db.execute(`SELECT IFNULL(SUM(net_salary),0) AS totalPayroll FROM Payroll_Final`);

    res.json({ totalEmployees, totalDepts, totalStations, totalPayroll });
  } catch (err) {
    console.error('❌ GET /api/summary:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ── START SERVER ───────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log(`🌐 Open dashboard at http://localhost:${port}/index2.html\n`);
  console.log('📡 Available API endpoints:');
  console.log('   GET    /api/employees');
  console.log('   POST   /api/employees');
  console.log('   PUT    /api/employees/:id');
  console.log('   DELETE /api/employees/:id');
  console.log('   GET    /api/departments');
  console.log('   GET    /api/stations');
  console.log('   GET    /api/payroll');
  console.log('   GET    /api/payroll/:empId');
  console.log('   POST   /api/payroll');
  console.log('   GET    /api/attendance');
  console.log('   GET    /api/attendance/:empId');
  console.log('   POST   /api/attendance');
  console.log('   PUT    /api/attendance/:logId');
  console.log('   POST   /api/login');
  console.log('   POST   /api/register');
  console.log('   GET    /api/summary');
});