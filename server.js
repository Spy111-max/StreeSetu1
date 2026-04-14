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
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; img-src 'self' data: https://images.unsplash.com https://source.unsplash.com https://images.pexels.com; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'"
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
  await addColumnIfMissing('app_users', 'profile_picture_url', "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing('app_users', 'theme_preference', "TEXT NOT NULL DEFAULT 'light'");
  await addColumnIfMissing('app_users', 'instagram_handle', "TEXT NOT NULL DEFAULT ''");

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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entrepreneur_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      image_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entrepreneur_id) REFERENCES app_users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      status TEXT NOT NULL DEFAULT 'placed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (buyer_id) REFERENCES app_users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (product_id, buyer_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (buyer_id) REFERENCES app_users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES app_users(id),
      FOREIGN KEY (receiver_id) REFERENCES app_users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS communities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      description TEXT NOT NULL,
      members_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS finance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entrepreneur_id INTEGER NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
      record_date TEXT NOT NULL,
      revenue REAL NOT NULL DEFAULT 0,
      expenses REAL NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entrepreneur_id) REFERENCES app_users(id)
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

  const communityCount = await getQuery('SELECT COUNT(*) AS count FROM communities');
  if (communityCount.count === 0) {
    const communities = [
      ['She Means Business', 'Startup Growth', 'Discuss scaling, validation, and sales for women-led businesses.', 1240],
      ['Women in Craft', 'Handmade & Artisanal', 'Share product photos, packaging ideas, and craft business tips.', 860],
      ['Finance For Founders', 'Money & Funding', 'Talk bookkeeping, pricing, and funding strategies.', 990],
      ['Digital Dukan Circle', 'E-commerce', 'Social selling, marketplace growth, and conversion tips.', 1125],
      ['Wellness Women Collective', 'Wellbeing', 'A space for balance, mental health, and founder routines.', 740]
    ];

    for (const community of communities) {
      await runQuery(
        'INSERT INTO communities (title, topic, description, members_count) VALUES (?, ?, ?, ?)',
        community
      );
    }
  }

  const productCount = await getQuery('SELECT COUNT(*) AS count FROM products');
  if (productCount.count === 0) {
    const entrepreneurs = await allQuery(
      `SELECT id, full_name, business_name, business_category
       FROM app_users
       WHERE role = 'entrepreneur'
       ORDER BY id ASC
       LIMIT 8`
    );

    for (const entrepreneur of entrepreneurs) {
      const brandName = entrepreneur.business_name || `${entrepreneur.full_name}'s Store`;
      const category = entrepreneur.business_category || 'Lifestyle';
      await runQuery(
        `INSERT INTO products (entrepreneur_id, name, description, price, stock, image_url)
         VALUES (?, ?, ?, ?, ?, '')`,
        [
          entrepreneur.id,
          `${brandName} Signature Item`,
          `Popular ${category.toLowerCase()} product from ${brandName}.`,
          799,
          18
        ]
      );
    }
  }

  const financeCount = await getQuery('SELECT COUNT(*) AS count FROM finance_records');
  if (financeCount.count === 0) {
    const entrepreneurs = await allQuery(
      `SELECT id
       FROM app_users
       WHERE role = 'entrepreneur'
       ORDER BY id ASC
       LIMIT 6`
    );

    for (const entrepreneur of entrepreneurs) {
      await runQuery(
        `INSERT INTO finance_records (entrepreneur_id, period, record_date, revenue, expenses, orders_count, notes)
         VALUES (?, 'daily', date('now'), 0, 0, 0, 'Starting finance log')`,
        [entrepreneur.id]
      );
    }
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
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
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

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
      res.status(403).json({ message: 'Access denied for this role.' });
      return;
    }

    next();
  };
}

function safeNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

    await runQuery('BEGIN TRANSACTION');
    try {
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
          1,
          passwordHash
        ]
      );

      await runQuery(
        `INSERT INTO women_users (full_name, email, phone, city, role)
         VALUES (?, ?, ?, ?, ?)`,
        [fullName.trim(), normalizedEmail, trimmedPhone, city.trim(), cleanRole]
      );

      if (isEntrepreneur) {
        await runQuery(
          `INSERT INTO business_users (
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
      }

      await runQuery('COMMIT');
    } catch (insertError) {
      await runQuery('ROLLBACK');
      throw insertError;
    }

    const message = isEntrepreneur
      ? 'Signup successful. Your account and business have been saved. Please login.'
      : 'Signup successful. Your account has been saved. Please login.';

    res.status(201).json({ message, entrepreneurApprovalPending: false });
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

      const redirectTo = user.role === 'entrepreneur' ? '/enterprenur_user_dashboard.html' : '/normal_user_dashboard.html';
      res.status(200).json({ message: 'Login successful.', role: user.role, redirectTo });
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

app.get('/api/dashboard/me', requireAuth, async (req, res) => {
  try {
    const user = await getQuery(
      `SELECT id, full_name, email, phone, city, role, business_name, business_category, business_description,
              years_in_business, profile_picture_url, theme_preference
       FROM app_users
       WHERE id = ?`,
      [req.session.user.id]
    );

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load profile.' });
  }
});

app.get('/api/dashboard/buyer/home', requireRole('customer'), async (req, res) => {
  try {
    const products = await allQuery(
      `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
              u.full_name AS entrepreneur_name,
              u.business_name,
              u.business_category,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM products p
       JOIN app_users u ON u.id = p.entrepreneur_id
       LEFT JOIN reviews r ON r.product_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 12`
    );

    const reviews = await allQuery(
      `SELECT r.id, r.rating, r.comment, r.created_at, p.name AS product_name,
              reviewer.full_name AS buyer_name,
              entrepreneur.full_name AS entrepreneur_name
       FROM reviews r
       JOIN products p ON p.id = r.product_id
       JOIN app_users reviewer ON reviewer.id = r.buyer_id
       JOIN app_users entrepreneur ON entrepreneur.id = p.entrepreneur_id
       ORDER BY r.created_at DESC
       LIMIT 8`
    );

    res.status(200).json({ products, reviews });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load buyer home.' });
  }
});

app.post('/api/dashboard/buyer/orders', requireRole('customer'), async (req, res) => {
  try {
    const productId = Number.parseInt(req.body.productId, 10);
    const quantity = Number.parseInt(req.body.quantity || '1', 10);

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ message: 'Valid product and quantity are required.' });
      return;
    }

    const product = await getQuery('SELECT id, stock FROM products WHERE id = ?', [productId]);
    if (!product) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    await runQuery('BEGIN TRANSACTION');
    try {
      if (product.stock < quantity) {
        await runQuery('ROLLBACK');
        res.status(400).json({ message: 'Not enough stock available.' });
        return;
      }

      await runQuery(
        'INSERT INTO orders (product_id, buyer_id, quantity, status) VALUES (?, ?, ?, ?)',
        [productId, req.session.user.id, quantity, 'placed']
      );

      await runQuery('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
      await runQuery('COMMIT');
    } catch (error) {
      await runQuery('ROLLBACK');
      throw error;
    }

    res.status(201).json({ message: 'Order placed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to place order.' });
  }
});

app.post('/api/dashboard/buyer/reviews', requireRole('customer'), async (req, res) => {
  try {
    const productId = Number.parseInt(req.body.productId, 10);
    const rating = Number.parseInt(req.body.rating, 10);
    const comment = (req.body.comment || '').trim();

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      res.status(400).json({ message: 'Valid product, rating, and comment are required.' });
      return;
    }

    await runQuery(
      `INSERT INTO reviews (product_id, buyer_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(product_id, buyer_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = CURRENT_TIMESTAMP`,
      [productId, req.session.user.id, rating, comment]
    );

    res.status(201).json({ message: 'Review saved successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to save review.' });
  }
});

app.get('/api/dashboard/buyer/messages', requireRole('customer'), async (req, res) => {
  try {
    const entrepreneurs = await allQuery(
      `SELECT id, full_name, business_name, business_category
       FROM app_users
       WHERE role = 'entrepreneur'
       ORDER BY full_name ASC`
    );

    const messages = await allQuery(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.created_at,
              sender.full_name AS sender_name,
              receiver.full_name AS receiver_name,
              receiver.role AS receiver_role
       FROM messages m
       JOIN app_users sender ON sender.id = m.sender_id
       JOIN app_users receiver ON receiver.id = m.receiver_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC`,
      [req.session.user.id, req.session.user.id]
    );

    res.status(200).json({ entrepreneurs, messages });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load messages.' });
  }
});

app.post('/api/dashboard/buyer/messages', requireRole('customer'), async (req, res) => {
  try {
    const receiverId = Number.parseInt(req.body.receiverId, 10);
    const messageText = (req.body.messageText || '').trim();

    if (!Number.isInteger(receiverId) || receiverId <= 0 || !messageText) {
      res.status(400).json({ message: 'Choose an entrepreneur and write a message.' });
      return;
    }

    const receiver = await getQuery('SELECT id, role FROM app_users WHERE id = ?', [receiverId]);
    if (!receiver || receiver.role !== 'entrepreneur') {
      res.status(403).json({ message: 'You can only message women entrepreneurs.' });
      return;
    }

    await runQuery(
      'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
      [req.session.user.id, receiverId, messageText]
    );

    res.status(201).json({ message: 'Message sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to send message.' });
  }
});

app.get('/api/dashboard/communities', requireRole('customer', 'entrepreneur'), async (req, res) => {
  try {
    const communities = await allQuery(
      `SELECT id, title, topic, description, members_count
       FROM communities
       ORDER BY members_count DESC, created_at DESC`
    );
    res.status(200).json({ communities });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load communities.' });
  }
});

app.get('/api/dashboard/entrepreneur/home', requireRole('entrepreneur'), async (req, res) => {
  try {
    const products = await allQuery(
      `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
              owner.full_name AS entrepreneur_name,
              owner.business_name,
              owner.business_category,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM products p
       JOIN app_users owner ON owner.id = p.entrepreneur_id
       LEFT JOIN reviews r ON r.product_id = p.id
       WHERE p.entrepreneur_id != ?
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 18`,
      [req.session.user.id]
    );

    const myProducts = await allQuery(
      `SELECT id, name, description, price, stock, image_url, created_at
       FROM products
       WHERE entrepreneur_id = ?
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    res.status(200).json({ products, myProducts });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load business home.' });
  }
});

app.post('/api/dashboard/entrepreneur/products', requireRole('entrepreneur'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    const imageUrl = (req.body.imageUrl || '').trim();
    const price = safeNumber(req.body.price, NaN);
    const stock = Number.parseInt(req.body.stock || '0', 10);

    if (!name || !description || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      res.status(400).json({ message: 'Name, description, price, and stock are required.' });
      return;
    }

    await runQuery(
      `INSERT INTO products (entrepreneur_id, name, description, price, stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, name, description, price, stock, imageUrl]
    );

    res.status(201).json({ message: 'Product launched successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to launch product.' });
  }
});

app.get('/api/dashboard/buyer/settings', requireRole('customer'), async (req, res) => {
  try {
    const settings = await getQuery(
      `SELECT full_name, email, phone, city, profile_picture_url, theme_preference
       FROM app_users
       WHERE id = ?`,
      [req.session.user.id]
    );
    res.status(200).json({ settings });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load settings.' });
  }
});

app.post('/api/dashboard/buyer/settings', requireRole('customer'), async (req, res) => {
  try {
    const fullName = (req.body.fullName || '').trim();
    const phone = (req.body.phone || '').trim();
    const city = (req.body.city || '').trim();
    const profilePictureUrl = (req.body.profilePictureUrl || '').trim();
    const themePreference = req.body.themePreference === 'dark' ? 'dark' : 'light';

    if (!fullName || !phone || !city) {
      res.status(400).json({ message: 'Name, phone, and city are required.' });
      return;
    }

    if (!isValidPhone(phone)) {
      res.status(400).json({ message: 'Enter a valid phone number.' });
      return;
    }

    await runQuery(
      `UPDATE app_users
       SET full_name = ?, phone = ?, city = ?, profile_picture_url = ?, theme_preference = ?
       WHERE id = ?`,
      [fullName, phone, city, profilePictureUrl, themePreference, req.session.user.id]
    );

    req.session.user.fullName = fullName;
    res.status(200).json({ message: 'Settings saved successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to save settings.' });
  }
});

app.get('/api/dashboard/entrepreneur/overview', requireRole('entrepreneur'), async (req, res) => {
  try {
    const products = await allQuery(
      `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
              COALESCE(COUNT(o.id), 0) AS order_count
       FROM products p
       LEFT JOIN orders o ON o.product_id = p.id
       WHERE p.entrepreneur_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.session.user.id]
    );

    const orders = await allQuery(
      `SELECT o.id, o.quantity, o.status, o.created_at, p.name AS product_name,
              buyer.full_name AS buyer_name, buyer.email AS buyer_email
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN app_users buyer ON buyer.id = o.buyer_id
       WHERE p.entrepreneur_id = ?
       ORDER BY o.created_at DESC`,
      [req.session.user.id]
    );

    res.status(200).json({ products, orders });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load entrepreneur overview.' });
  }
});

app.get('/api/dashboard/entrepreneur/messages', requireRole('entrepreneur'), async (req, res) => {
  try {
    const buyers = await allQuery(
      `SELECT DISTINCT sender.id, sender.full_name, sender.email
       FROM messages m
       JOIN app_users sender ON sender.id = m.sender_id
       JOIN app_users receiver ON receiver.id = m.receiver_id
       WHERE receiver.id = ? AND sender.role = 'customer'
       ORDER BY sender.full_name ASC`,
      [req.session.user.id]
    );

    const businesses = await allQuery(
      `SELECT DISTINCT sender.id, sender.full_name, sender.email, sender.business_name
       FROM messages m
       JOIN app_users sender ON sender.id = m.sender_id
       JOIN app_users receiver ON receiver.id = m.receiver_id
       WHERE receiver.id = ? AND sender.role = 'entrepreneur'
       ORDER BY sender.business_name ASC, sender.full_name ASC`,
      [req.session.user.id]
    );

    const messages = await allQuery(
      `SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.created_at,
              sender.full_name AS sender_name,
              receiver.full_name AS receiver_name,
              sender.role AS sender_role,
              receiver.role AS receiver_role
       FROM messages m
       JOIN app_users sender ON sender.id = m.sender_id
       JOIN app_users receiver ON receiver.id = m.receiver_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC`,
      [req.session.user.id, req.session.user.id]
    );

    res.status(200).json({ buyers, businesses, messages });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load messages.' });
  }
});

app.post('/api/dashboard/entrepreneur/messages', requireRole('entrepreneur'), async (req, res) => {
  try {
    const receiverId = Number.parseInt(req.body.receiverId, 10);
    const messageText = (req.body.messageText || '').trim();

    if (!Number.isInteger(receiverId) || receiverId <= 0 || !messageText) {
      res.status(400).json({ message: 'Choose a buyer and write a message.' });
      return;
    }

    const receiver = await getQuery('SELECT id, role FROM app_users WHERE id = ?', [receiverId]);
    if (!receiver || receiver.role !== 'customer') {
      res.status(403).json({ message: 'Entrepreneurs can only message women buyers.' });
      return;
    }

    await runQuery(
      'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
      [req.session.user.id, receiverId, messageText]
    );

    res.status(201).json({ message: 'Message sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to send message.' });
  }
});

app.get('/api/dashboard/entrepreneur/settings', requireRole('entrepreneur'), async (req, res) => {
  try {
    const settings = await getQuery(
      `SELECT full_name, email, phone, city, business_name, business_category, business_description,
              years_in_business, profile_picture_url, instagram_handle, theme_preference
       FROM app_users
       WHERE id = ?`,
      [req.session.user.id]
    );

    res.status(200).json({ settings });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load settings.' });
  }
});

app.post('/api/dashboard/entrepreneur/settings', requireRole('entrepreneur'), async (req, res) => {
  try {
    const fullName = (req.body.fullName || '').trim();
    const phone = (req.body.phone || '').trim();
    const city = (req.body.city || '').trim();
    const businessName = (req.body.businessName || '').trim();
    const businessCategory = (req.body.businessCategory || '').trim();
    const businessDescription = (req.body.businessDescription || '').trim();
    const profilePictureUrl = (req.body.profilePictureUrl || '').trim();
    const instagramHandle = (req.body.instagramHandle || '').trim();
    const themePreference = req.body.themePreference === 'dark' ? 'dark' : 'light';

    if (!fullName || !phone || !city || !businessName || !businessCategory || !businessDescription) {
      res.status(400).json({ message: 'Complete profile and business details are required.' });
      return;
    }

    if (!isValidPhone(phone)) {
      res.status(400).json({ message: 'Enter a valid phone number.' });
      return;
    }

    await runQuery(
      `UPDATE app_users
       SET full_name = ?, phone = ?, city = ?, business_name = ?, business_category = ?,
           business_description = ?, profile_picture_url = ?, instagram_handle = ?, theme_preference = ?
       WHERE id = ?`,
      [
        fullName,
        phone,
        city,
        businessName,
        businessCategory,
        businessDescription,
        profilePictureUrl,
        instagramHandle,
        themePreference,
        req.session.user.id
      ]
    );

    await runQuery(
      `UPDATE women_users
       SET full_name = ?, phone = ?, city = ?
       WHERE email = ?`,
      [fullName, phone, city, req.session.user.email]
    );

    await runQuery(
      `UPDATE business_users
       SET business_name = ?, owner_name = ?, phone = ?, city = ?, category = ?
       WHERE email = ?`,
      [businessName, fullName, phone, city, businessCategory, req.session.user.email]
    );

    req.session.user.fullName = fullName;
    res.status(200).json({ message: 'Settings saved successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to save settings.' });
  }
});

app.get('/api/dashboard/entrepreneur/analytics', requireRole('entrepreneur'), async (req, res) => {
  try {
    const totals = await getQuery(
      `SELECT
         COALESCE(SUM(p.price * o.quantity), 0) AS revenue,
         COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.quantity ELSE 0 END), 0) AS items_sold,
         COUNT(DISTINCT p.id) AS product_count,
         COUNT(DISTINCT o.id) AS order_count
       FROM products p
       LEFT JOIN orders o ON o.product_id = p.id
       WHERE p.entrepreneur_id = ?`,
      [req.session.user.id]
    );

    const records = await allQuery(
      `SELECT id, period, record_date, revenue, expenses, orders_count, notes, created_at
       FROM finance_records
       WHERE entrepreneur_id = ?
       ORDER BY record_date DESC, created_at DESC`,
      [req.session.user.id]
    );

    res.status(200).json({ totals, records });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load analytics.' });
  }
});

app.post('/api/dashboard/entrepreneur/analytics', requireRole('entrepreneur'), async (req, res) => {
  try {
    const period = req.body.period === 'weekly' || req.body.period === 'monthly' ? req.body.period : 'daily';
    const recordDate = (req.body.recordDate || '').trim() || new Date().toISOString().slice(0, 10);
    const revenue = safeNumber(req.body.revenue, 0);
    const expenses = safeNumber(req.body.expenses, 0);
    const ordersCount = Number.parseInt(req.body.ordersCount || '0', 10);
    const notes = (req.body.notes || '').trim();

    if (!Number.isInteger(ordersCount) || ordersCount < 0) {
      res.status(400).json({ message: 'Orders count must be a non-negative integer.' });
      return;
    }

    await runQuery(
      `INSERT INTO finance_records (entrepreneur_id, period, record_date, revenue, expenses, orders_count, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, period, recordDate, revenue, expenses, ordersCount, notes]
    );

    res.status(201).json({ message: 'Finance record saved.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to save finance record.' });
  }
});

app.post('/api/dashboard/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || '';
    const newPassword = req.body.newPassword || '';
    const confirmPassword = req.body.confirmPassword || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ message: 'Please provide all password fields.' });
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

    const user = await getQuery('SELECT id, password_hash FROM app_users WHERE id = ?', [req.session.user.id]);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(401).json({ message: 'Current password is incorrect.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery('UPDATE app_users SET password_hash = ? WHERE id = ?', [passwordHash, req.session.user.id]);
    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to change password.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: 'Logged out.' });
  });
});

app.get('/dashboard', requireAuth, (req, res) => {
  if (req.session.user.role === 'entrepreneur') {
    res.redirect('/enterprenur_user_dashboard.html');
    return;
  }

  res.redirect('/normal_user_dashboard.html');
});

app.get('/normal_user_dashboard', requireAuth, requireRole('customer'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'normal_user_dashboard.html'));
});

app.get('/enterprenur_user_dashboard', requireAuth, requireRole('entrepreneur'), (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'enterprenur_user_dashboard.html'));
});

app.get('/dashboard-buyer', requireAuth, requireRole('customer'), (req, res) => {
  res.redirect('/normal_user_dashboard.html');
});

app.get('/dashboard-entrepreneur', requireAuth, requireRole('entrepreneur'), (req, res) => {
  res.redirect('/enterprenur_user_dashboard.html');
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
