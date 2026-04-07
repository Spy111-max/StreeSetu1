const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'database', 'streesetu.db');
const db = new sqlite3.Database(dbPath);
const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'streesetu-admin-dev-secret';
const rateBuckets = new Map();

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createRateLimiter({ max, windowMs }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = rateBuckets.get(key);

    if (!entry || now > entry.expiresAt) {
      rateBuckets.set(key, { count: 1, expiresAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
      return;
    }

    entry.count += 1;
    next();
  };
}

function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"
  );
  next();
}

async function addColumnIfMissing(tableName, columnName, columnDefinition) {
  const columns = await allQuery(`PRAGMA table_info(${tableName})`);
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

async function initDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      business_name TEXT,
      business_category TEXT,
      business_description TEXT,
      years_in_business INTEGER,
      is_email_verified INTEGER NOT NULL DEFAULT 0,
      email_verification_token_hash TEXT,
      email_verification_expires_at TEXT,
      is_approved INTEGER NOT NULL DEFAULT 1,
      password_reset_token_hash TEXT,
      password_reset_expires_at TEXT,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      lock_until TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing('app_users', 'business_name', 'TEXT');
  await addColumnIfMissing('app_users', 'business_category', 'TEXT');
  await addColumnIfMissing('app_users', 'business_description', 'TEXT');
  await addColumnIfMissing('app_users', 'years_in_business', 'INTEGER');
  await addColumnIfMissing('app_users', 'is_email_verified', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('app_users', 'email_verification_token_hash', 'TEXT');
  await addColumnIfMissing('app_users', 'email_verification_expires_at', 'TEXT');
  await addColumnIfMissing('app_users', 'is_approved', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfMissing('app_users', 'password_reset_token_hash', 'TEXT');
  await addColumnIfMissing('app_users', 'password_reset_expires_at', 'TEXT');
  await addColumnIfMissing('app_users', 'failed_login_attempts', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing('app_users', 'lock_until', 'TEXT');

  await runQuery("UPDATE app_users SET is_approved = 0 WHERE role = 'entrepreneur' AND is_approved IS NULL");
  await runQuery("UPDATE app_users SET is_approved = 1 WHERE role = 'customer' AND is_approved IS NULL");

  await runQuery(`
    CREATE TABLE IF NOT EXISTS women_users (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS business_users (
      id INTEGER PRIMARY KEY,
      business_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      years_in_business INTEGER NOT NULL CHECK (years_in_business >= 0),
      is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = await getQuery('SELECT COUNT(*) AS count FROM app_users');
  if (existing.count === 0) {
    const demoHash = await bcrypt.hash('Stree@123', 10);
    await runQuery(
      `INSERT INTO app_users (
        full_name, email, phone, city, role, business_name, business_category, business_description,
        years_in_business, is_email_verified, is_approved, password_hash
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Demo User', 'demo@streesetu.in', '+91-9000011111', 'Delhi', 'customer', null, null, null, null, 1, 1, demoHash]
    );
  }
}

app.disable('x-powered-by');
app.use(setSecurityHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'streesetu-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?[0-9\- ]{10,15}$/.test(phone);
}

function isStrongPassword(password) {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/.test(password);
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  next();
}

function requireAdmin(req, res, next) {
  const secret = req.header('x-admin-secret');
  if (!secret || secret !== ADMIN_SECRET) {
    res.status(403).json({ message: 'Admin access denied.' });
    return;
  }
  next();
}

async function findExistingAccount(normalizedEmail, trimmedPhone) {
  const existingAuthUser = await getQuery(
    'SELECT id, email, phone FROM app_users WHERE email = ? OR phone = ?',
    [normalizedEmail, trimmedPhone]
  );

  if (existingAuthUser) {
    return existingAuthUser;
  }

  const existingWomenUser = await getQuery(
    'SELECT id, email, phone FROM women_users WHERE email = ? OR phone = ?',
    [normalizedEmail, trimmedPhone]
  );

  if (existingWomenUser) {
    return existingWomenUser;
  }

  const existingBusinessUser = await getQuery(
    'SELECT id, email, phone FROM business_users WHERE email = ? OR phone = ?',
    [normalizedEmail, trimmedPhone]
  );

  return existingBusinessUser || null;
}

app.post('/api/signup', createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      city,
      role,
      password,
      confirmPassword,
      businessName,
      businessCategory,
      yearsInBusiness,
      businessDescription
    } = req.body;

    if (!fullName || !email || !phone || !city || !password || !confirmPassword) {
      res.status(400).json({ message: 'Please fill all required fields.' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'Enter a valid email address.' });
      return;
    }

    if (!isValidPhone(phone)) {
      res.status(400).json({ message: 'Enter a valid phone number.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters.' });
      return;
    }

    if (!isStrongPassword(password)) {
      res.status(400).json({ message: 'Use a stronger password with upper, lower, number, and symbol.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ message: 'Passwords do not match.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const existing = await findExistingAccount(normalizedEmail, trimmedPhone);

    if (existing) {
      res.status(409).json({ message: 'Account is already present. Please login.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanRole = role === 'entrepreneur' ? 'entrepreneur' : 'customer';
    const cleanBusinessName = (businessName || '').trim();
    const cleanBusinessCategory = (businessCategory || '').trim();
    const cleanBusinessDescription = (businessDescription || '').trim();
    const isEntrepreneur = cleanRole === 'entrepreneur';

    let cleanYearsInBusiness = null;
    if (yearsInBusiness !== undefined && yearsInBusiness !== null && yearsInBusiness !== '') {
      cleanYearsInBusiness = Number.parseInt(yearsInBusiness, 10);
    }

    if (isEntrepreneur) {
      if (!cleanBusinessName || !cleanBusinessCategory || !cleanBusinessDescription || cleanYearsInBusiness === null) {
        res.status(400).json({ message: 'Business details are required for entrepreneur signup.' });
        return;
      }

      if (!Number.isInteger(cleanYearsInBusiness) || cleanYearsInBusiness < 0) {
        res.status(400).json({ message: 'Years in business must be a valid non-negative number.' });
        return;
      }
    } else {
      const buyerHasBusinessDetails =
        cleanBusinessName || cleanBusinessCategory || cleanBusinessDescription || cleanYearsInBusiness !== null;
      if (buyerHasBusinessDetails) {
        res.status(400).json({ message: 'Business details are only allowed for women entrepreneur accounts.' });
        return;
      }
    }

    await runQuery(
      `INSERT INTO app_users (
        full_name, email, phone, city, role, business_name, business_category, business_description,
        years_in_business, is_email_verified, email_verification_token_hash, email_verification_expires_at,
        is_approved, password_hash
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName.trim(),
        normalizedEmail,
        trimmedPhone,
        city.trim(),
        cleanRole,
        isEntrepreneur ? cleanBusinessName : null,
        isEntrepreneur ? cleanBusinessCategory : null,
        isEntrepreneur ? cleanBusinessDescription : null,
        isEntrepreneur ? cleanYearsInBusiness : null,
        1,
        null,
        null,
        isEntrepreneur ? 0 : 1,
        passwordHash
      ]
    );

    if (isEntrepreneur) {
      await runQuery(
        `INSERT OR IGNORE INTO business_users (
          business_name, owner_name, email, phone, city, category, years_in_business, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cleanBusinessName,
          fullName.trim(),
          normalizedEmail,
          trimmedPhone,
          city.trim(),
          cleanBusinessCategory,
          cleanYearsInBusiness,
          0
        ]
      );
    } else {
      await runQuery(
        `INSERT OR IGNORE INTO women_users (full_name, email, phone, city, role)
         VALUES (?, ?, ?, ?, ?)`,
        [fullName.trim(), normalizedEmail, trimmedPhone, city.trim(), 'customer']
      );
    }

    const message = isEntrepreneur
      ? 'Signup successful. Your account has been saved and is pending entrepreneur approval.'
      : 'Signup successful. Your account has been saved. Please login.';

    res.status(201).json({ message, entrepreneurApprovalPending: isEntrepreneur });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed. Try again.' });
  }
});

app.post('/api/verify-email', createRateLimiter({ max: 15, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      res.status(400).json({ message: 'Email and verification token are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getQuery(
      'SELECT id, email_verification_token_hash, email_verification_expires_at FROM app_users WHERE email = ?',
      [normalizedEmail]
    );

    if (!user || !user.email_verification_token_hash || !user.email_verification_expires_at) {
      res.status(400).json({ message: 'Invalid or expired verification token.' });
      return;
    }

    const isTokenValid = hashToken(token) === user.email_verification_token_hash;
    const isNotExpired = new Date(user.email_verification_expires_at).getTime() > Date.now();

    if (!isTokenValid || !isNotExpired) {
      res.status(400).json({ message: 'Invalid or expired verification token.' });
      return;
    }

    await runQuery(
      `UPDATE app_users
       SET is_email_verified = 1,
           email_verification_token_hash = NULL,
           email_verification_expires_at = NULL
       WHERE id = ?`,
      [user.id]
    );

    res.status(200).json({ message: 'Email verified successfully. You can login now.' });
  } catch (error) {
    res.status(500).json({ message: 'Email verification failed. Try again.' });
  }
});

app.post('/api/forgot-password', createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getQuery('SELECT id FROM app_users WHERE email = ?', [normalizedEmail]);

    if (user) {
      const resetToken = createToken();
      const resetTokenHash = hashToken(resetToken);
      const resetExpiry = new Date(Date.now() + 1000 * 60 * 30).toISOString();

      await runQuery(
        `UPDATE app_users
         SET password_reset_token_hash = ?, password_reset_expires_at = ?
         WHERE id = ?`,
        [resetTokenHash, resetExpiry, user.id]
      );

      res.status(200).json({
        message: 'Reset token generated. Use it to reset your password.',
        resetToken
      });
      return;
    }

    res.status(200).json({ message: 'If that email exists, reset instructions were generated.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to process forgot password right now.' });
  }
});

app.post('/api/reset-password', createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body;

    if (!email || !token || !newPassword || !confirmPassword) {
      res.status(400).json({ message: 'Please provide all required fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: 'Passwords do not match.' });
      return;
    }

    if (!isStrongPassword(newPassword)) {
      res.status(400).json({ message: 'Use a stronger password with upper, lower, number, and symbol.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getQuery(
      `SELECT id, password_reset_token_hash, password_reset_expires_at
       FROM app_users WHERE email = ?`,
      [normalizedEmail]
    );

    if (!user || !user.password_reset_token_hash || !user.password_reset_expires_at) {
      res.status(400).json({ message: 'Invalid or expired reset token.' });
      return;
    }

    const tokenValid = hashToken(token) === user.password_reset_token_hash;
    const tokenNotExpired = new Date(user.password_reset_expires_at).getTime() > Date.now();
    if (!tokenValid || !tokenNotExpired) {
      res.status(400).json({ message: 'Invalid or expired reset token.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery(
      `UPDATE app_users
       SET password_hash = ?,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL,
           failed_login_attempts = 0,
           lock_until = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    res.status(200).json({ message: 'Password reset successful. Login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed. Try again.' });
  }
});

app.post('/api/login', createRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getQuery('SELECT * FROM app_users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    if (user.lock_until && new Date(user.lock_until).getTime() > Date.now()) {
      res.status(423).json({ message: 'Account temporarily locked. Please try again later.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const shouldLock = attempts >= 5;
      const lockUntil = shouldLock ? new Date(Date.now() + 1000 * 60 * 15).toISOString() : null;
      await runQuery(
        `UPDATE app_users
         SET failed_login_attempts = ?, lock_until = ?
         WHERE id = ?`,
        [attempts, lockUntil, user.id]
      );

      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    if (user.role === 'entrepreneur' && !user.is_approved) {
      res.status(403).json({ message: 'Your entrepreneur profile is pending approval.' });
      return;
    }

    await runQuery(
      'UPDATE app_users SET failed_login_attempts = 0, lock_until = NULL WHERE id = ?',
      [user.id]
    );

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        res.status(500).json({ message: 'Login failed. Try again.' });
        return;
      }

      req.session.user = {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      };

      res.status(200).json({ message: 'Login successful.' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed. Try again.' });
  }
});

app.get('/api/admin/pending-entrepreneurs', requireAdmin, async (req, res) => {
  try {
    const pending = await allQuery(
      `SELECT id, full_name, email, city, business_name, business_category, years_in_business, created_at
       FROM app_users
       WHERE role = 'entrepreneur' AND is_approved = 0
       ORDER BY created_at DESC`
    );
    res.status(200).json({ pending });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch pending entrepreneurs.' });
  }
});

app.post('/api/admin/approve-entrepreneur', requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await runQuery(
      `UPDATE app_users
       SET is_approved = 1
       WHERE email = ? AND role = 'entrepreneur'`,
      [normalizedEmail]
    );

    if (result.changes === 0) {
      res.status(404).json({ message: 'Entrepreneur account not found.' });
      return;
    }

    res.status(200).json({ message: 'Entrepreneur approved successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Approval failed. Try again.' });
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.status(200).json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: 'Logged out.' });
  });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`StreeSetu server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database init failed:', error.message);
    process.exit(1);
  });
