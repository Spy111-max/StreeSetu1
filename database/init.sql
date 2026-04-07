-- StreeSetu initial database setup
-- Creates a business_users table and seeds 10 users.

DROP TABLE IF EXISTS business_users;

CREATE TABLE business_users (
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
);

INSERT INTO business_users (
  id,
  business_name,
  owner_name,
  email,
  phone,
  city,
  category,
  years_in_business,
  is_verified
) VALUES
  (1, 'Aarohi Crafts', 'Aarohi Sharma', 'aarohi@streesetu.in', '+91-9876543201', 'Jaipur', 'Handmade Decor', 4, 1),
  (2, 'Sattva Skincare', 'Megha Iyer', 'megha@streesetu.in', '+91-9876543202', 'Bengaluru', 'Skincare', 3, 1),
  (3, 'Nayra Fashion House', 'Nayra Khan', 'nayra@streesetu.in', '+91-9876543203', 'Mumbai', 'Fashion', 5, 1),
  (4, 'Millet Mornings', 'Kavita Rao', 'kavita@streesetu.in', '+91-9876543204', 'Pune', 'Healthy Food', 2, 0),
  (5, 'Thread & Bloom', 'Ritika Verma', 'ritika@streesetu.in', '+91-9876543205', 'Delhi', 'Textiles', 6, 1),
  (6, 'GlowHer Naturals', 'Sana Mirza', 'sana@streesetu.in', '+91-9876543206', 'Lucknow', 'Beauty', 2, 0),
  (7, 'ClayNest Studio', 'Priya Menon', 'priya@streesetu.in', '+91-9876543207', 'Chennai', 'Ceramics', 3, 1),
  (8, 'Urban Looms', 'Ananya Das', 'ananya@streesetu.in', '+91-9876543208', 'Kolkata', 'Apparel', 7, 1),
  (9, 'Spice Route Sisters', 'Bhavna Joshi', 'bhavna@streesetu.in', '+91-9876543209', 'Hyderabad', 'Food Products', 4, 0),
  (10, 'EcoWrap Collective', 'Diya Patel', 'diya@streesetu.in', '+91-9876543210', 'Ahmedabad', 'Sustainable Packaging', 1, 0);
