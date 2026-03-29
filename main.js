import express  from 'express';
import mysql    from 'mysql2/promise';
import cors     from 'cors';
import dotenv   from 'dotenv';
import path     from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = process.env.PORT || 3000;

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(new URL('./index2.html', import.meta.url).pathname);
});

// ── DATABASE CONNECTION ────────────────────────────────────────────────────
const db = await mysql.createConnection({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  port:     parseInt(process.env.DB_PORT),
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:      { rejectUnauthorized: false }
});
console.log('✅ Database connected successfully');


// ════════════════════════════════════════════════════════════════
//  EMPLOYEES  →  Employee_Info table
// ════════════════════════════════════════════════════════════════

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

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await db.execute(`DELETE FROM Payroll_Final   WHERE emp_id = ?`, [req.params.id]);
    await db.execute(`DELETE FROM attendance_logs WHERE emp_id = ?`, [req.params.id]);
    await db.execute(`DELETE FROM Employee_Info   WHERE emp_id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE /api/employees/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ════════════════════════════════════════════════════════════════
//  DEPARTMENTS  →  Departments table
// ════════════════════════════════════════════════════════════════

app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        dept_id        AS id,
        dept_name      AS name,
        base_salary    AS basePay,
        ot_rate_hourly AS otRate
      FROM Departments
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /api/departments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
// ════════════════════════════════════════════════════════════════

app.get('/api/stations', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        station_id           AS id,
        station_name         AS name,
        station_type         AS type,
        allowance_multiplier AS multiplier,
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
// ════════════════════════════════════════════════════════════════

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
// ════════════════════════════════════════════════════════════════

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
// ════════════════════════════════════════════════════════════════

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
//  DASHBOARD SUMMARY
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
});